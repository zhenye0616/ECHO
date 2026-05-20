import { constants, createWriteStream, mkdirSync, renameSync, rmSync, symlinkSync, type WriteStream } from "node:fs";
import { access } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { ECHO_MCP_URL } from "./mcp";
import type { AgentInvocation } from "./agent-profiles";

export type AgentRunnerEvent =
  | { type: "stdout"; text: string }
  | { type: "footer"; markdown: string }
  | { type: "exit"; code: number | null; signal: NodeJS.Signals | null }
  | { type: "error"; error: Error };

export interface AgentRun {
  events: AsyncIterable<AgentRunnerEvent>;
  cancel: () => void;
  sessionLogPath: string | null;
}

export interface AgentRunnerOptions {
  idleTimeoutMs?: number;
  maxRuntimeMs?: number;
  sessionLogDir?: string;
}

const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RUNTIME_MS = 5 * 60_000;
const STDERR_TAIL_LIMIT = 4096;
export const SESSION_LOG_DIR = join(homedir(), ".config", "raycast", "extensions", "echo-context", "sessions");

// Raycast's Node runtime hands the extension an env with PATH=undefined,
// so bare-name binaries (e.g. "codex", "claude") fail `which` even when
// they exist on disk. resolvePathEnv() falls back to a PATH covering the
// directories GUI-launched processes commonly need to reach.
const FALLBACK_PATH_DIRS = [
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
];

export function resolvePathEnv(env: NodeJS.ProcessEnv = process.env): string {
  const existing = env.PATH;
  if (existing && existing.length > 0) return existing;
  const home = homedir();
  return [...FALLBACK_PATH_DIRS, `${home}/.local/bin`, `${home}/.cargo/bin`].join(":");
}

export type ProbeResult = { ok: true } | { ok: false; reason: string };

// Cold-start failure mode: Raycast's undici keeps an HTTP keep-alive pool
// per-origin; after the daemon idles for hours that pool socket can be
// half-dead. The first HEAD probe sends bytes into a closed socket and
// hangs until the abort timer fires (observed: AbortError at ~1000ms while
// the daemon was healthy and answered curl in <100ms). Plus, the JS event
// loop is congested at command launch ("Native search bar is N events
// ahead of JS"), which can delay the fetch resolver past a tight deadline.
//
// Fix: 3s budget, force a fresh connection (Connection: close) so a
// poisoned pooled socket can't sink the probe, and one retry on AbortError
// so a single cold-start hiccup doesn't show the user a daemon-down error.
const PROBE_TIMEOUT_MS = 3_000;
const PROBE_ATTEMPTS = 2;

async function probeOnce(timeoutMs: number): Promise<{ ok: true; elapsedMs: number } | { ok: false; reason: string; elapsedMs: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    await fetch(ECHO_MCP_URL, {
      method: "HEAD",
      signal: controller.signal,
      headers: { connection: "close" },
    });
    return { ok: true, elapsedMs: Date.now() - started };
  } catch (err) {
    const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
    const causeCode = e.cause?.code ?? "";
    const reason = `${e.name ?? "Error"}: ${e.message ?? "(no message)"}${causeCode ? ` [cause.code=${causeCode}]` : ""}`;
    return { ok: false, reason, elapsedMs: Date.now() - started };
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeEchoDaemon(): Promise<ProbeResult> {
  const reasons: string[] = [];
  for (let attempt = 1; attempt <= PROBE_ATTEMPTS; attempt += 1) {
    const result = await probeOnce(PROBE_TIMEOUT_MS);
    if (result.ok) return { ok: true };
    reasons.push(`attempt${attempt}: ${result.reason} (after ${result.elapsedMs}ms)`);
  }
  return { ok: false, reason: `${reasons.join("; ")} (url=${ECHO_MCP_URL})` };
}

export async function findExecutable(binary: string): Promise<boolean> {
  if (binary.includes("/")) {
    try {
      await access(binary, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  return new Promise((resolve) => {
    execFile(
      "which",
      [binary],
      { timeout: 1_000, env: { ...process.env, PATH: resolvePathEnv() } },
      (err, stdout) => {
        resolve(err === null && stdout.trim().length > 0);
      },
    );
  });
}

export function startAgent(invocation: AgentInvocation, options: AgentRunnerOptions = {}): AgentRun {
  const queue = new AsyncEventQueue<AgentRunnerEvent>();
  const stdoutStripper = new AnsiStripper();
  const stderrStripper = new AnsiStripper();
  const stderrTail = new BoundedTextBuffer(STDERR_TAIL_LIMIT);
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const maxRuntimeMs = options.maxRuntimeMs ?? DEFAULT_MAX_RUNTIME_MS;
  const sessionLog = createSessionLog(invocation, options.sessionLogDir ?? SESSION_LOG_DIR);

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;
  let exited = false;
  let cancelled = false;
  let exceededMaxRuntime = false;
  let stdinError: Error | null = null;

  const child = spawn(invocation.binary, invocation.args, {
    stdio: ["pipe", "pipe", "pipe"],
    detached: false,
    cwd: invocation.cwd,
    env: {
      ...process.env,
      PATH: resolvePathEnv(),
      NO_COLOR: "1",
      TERM: "dumb",
      ...(invocation.env ?? {}),
    },
  });

  function clearTimers() {
    if (idleTimer !== null) clearTimeout(idleTimer);
    if (maxTimer !== null) clearTimeout(maxTimer);
    idleTimer = null;
    maxTimer = null;
  }

  function armIdleTimer() {
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      queue.push({
        type: "footer",
        markdown: `**Agent appears stalled**\n\nAgent appears stalled (likely interactive auth prompt). Cancel and check terminal for \`${invocation.binary} login\`.`,
      });
      idleTimer = null;
    }, idleTimeoutMs);
  }

  armIdleTimer();
  maxTimer = setTimeout(() => {
    exceededMaxRuntime = true;
    queue.push({ type: "footer", markdown: "**Exceeded 5-minute ceiling.**" });
    if (child.pid !== undefined) void killProcessTree(child.pid);
  }, maxRuntimeMs);

  child.once("error", (err) => {
    clearTimers();
    void sessionLog?.close();
    queue.push({ type: "error", error: err });
    queue.push({ type: "footer", markdown: `**Agent failed to start**\n\n${stripTerminalControl(err.message)}` });
    queue.close();
  });

  child.stderr.on("data", (chunk: Buffer) => {
    sessionLog?.writeStderr(chunk);
    stderrTail.append(stderrStripper.write(chunk.toString("utf8")));
  });
  child.stderr.on("error", (err) => {
    stderrTail.append(stripTerminalControl(err.message));
  });

  child.stdin.on("error", (err: Error & { code?: string }) => {
    stdinError = err;
  });
  if (invocation.stdin.length > 0) {
    child.stdin.write(invocation.stdin, (err) => {
      if (err !== undefined && err !== null) stdinError = err;
      child.stdin.end();
    });
  } else {
    child.stdin.end();
  }

  const stdoutPump = (async () => {
    for await (const chunk of child.stdout) {
      const raw = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      sessionLog?.writeStdout(raw);
      const text = stdoutStripper.write(raw.toString("utf8"));
      if (text.length === 0) continue;
      // First stdout proves the agent is past any interactive auth prompt;
      // clear the idle timer permanently. Mid-run quiet stretches (model
      // thinking, slow MCP calls) are bounded by maxRuntimeMs, not this.
      if (idleTimer !== null) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      queue.push({ type: "stdout", text });
    }
  })().catch((err: unknown) => {
    queue.push({ type: "error", error: err as Error });
  });

  child.once("close", (code, signal) => {
    void (async () => {
      exited = true;
      clearTimers();
      await stdoutPump;
      const trailingOut = stdoutStripper.flush();
      if (trailingOut.length > 0) queue.push({ type: "stdout", text: trailingOut });
      stderrTail.append(stderrStripper.flush());
      await sessionLog?.close();

      if (stdinError !== null && !cancelled && !exceededMaxRuntime) {
        queue.push({
          type: "footer",
          markdown: `**Agent exited before reading stdin**\n\n${stripTerminalControl(stdinError.message)}`,
        });
      } else if (code !== 0 && !cancelled && !exceededMaxRuntime) {
        const tail = stderrTail.toString();
        queue.push({
          type: "footer",
          markdown: `**Agent exited with code ${code ?? "unknown"}**${tail.length > 0 ? `\n\n${tail}` : ""}`,
        });
      }

      queue.push({ type: "exit", code, signal });
      queue.close();
    })();
  });

  return {
    events: queue,
    sessionLogPath: sessionLog?.path ?? null,
    cancel: () => {
      if (exited || cancelled) return;
      cancelled = true;
      queue.push({ type: "footer", markdown: "**Cancelled.**" });
      void sessionLog?.close();
      if (child.pid !== undefined) void killProcessTree(child.pid);
    },
  };
}

interface SessionLog {
  path: string;
  writeStdout(chunk: Buffer): void;
  writeStderr(chunk: Buffer): void;
  close(): Promise<void>;
}

function createSessionLog(invocation: AgentInvocation, logDir: string): SessionLog | null {
  const openedAt = new Date().toISOString();
  const filename = `${openedAt.replace(/[:.]/g, "-")}.log`;
  const sessionPath = join(logDir, filename);

  let stream: WriteStream;
  try {
    mkdirSync(logDir, { recursive: true });
    stream = createWriteStream(sessionPath, { flags: "a" });
  } catch (err) {
    warnSessionLogFailure("open session log", err);
    return null;
  }

  const log = new WriteStreamSessionLog(sessionPath, stream);
  stream.on("error", (err) => log.disable(err));
  updateLatestSessionLog(logDir, sessionPath);
  log.writeRaw(`=== ECHO agent session ${openedAt} · ${invocation.binary} ${invocation.args.join(" ")} ===\n`);
  return log;
}

function updateLatestSessionLog(logDir: string, sessionPath: string): void {
  const latestPath = join(logDir, "latest.log");
  const latestTmpPath = join(logDir, `.latest.${process.pid}.${Date.now()}.tmp`);
  try {
    rmSync(latestTmpPath, { force: true });
    symlinkSync(sessionPath, latestTmpPath);
    renameSync(latestTmpPath, latestPath);
  } catch {
    try {
      rmSync(latestTmpPath, { force: true });
    } catch {
      // Best-effort cleanup only.
    }
  }
}

class WriteStreamSessionLog implements SessionLog {
  private disabled = false;
  private stderrAtLineStart = true;
  private closePromise: Promise<void> | null = null;

  constructor(readonly path: string, private readonly stream: WriteStream) {}

  writeStdout(chunk: Buffer): void {
    this.writeRaw(chunk);
  }

  writeStderr(chunk: Buffer): void {
    const text = chunk.toString("utf8");
    if (text.length === 0) return;
    let out = "";
    for (const ch of text) {
      if (this.stderrAtLineStart) {
        out += "[stderr] ";
        this.stderrAtLineStart = false;
      }
      out += ch;
      if (ch === "\n") this.stderrAtLineStart = true;
    }
    this.writeRaw(out);
  }

  writeRaw(chunk: string | Buffer): void {
    if (this.disabled || this.closePromise !== null) return;
    try {
      this.stream.write(chunk, (err) => {
        if (err !== null && err !== undefined) this.disable(err);
      });
    } catch (err) {
      this.disable(err);
    }
  }

  disable(err: unknown): void {
    if (!this.disabled) warnSessionLogFailure("write session log", err);
    this.disabled = true;
  }

  close(): Promise<void> {
    if (this.closePromise !== null) return this.closePromise;
    if (this.disabled) {
      this.closePromise = Promise.resolve();
      return this.closePromise;
    }
    this.closePromise = new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      this.stream.once("finish", finish);
      this.stream.once("close", finish);
      this.stream.once("error", finish);
      try {
        this.stream.end();
      } catch (err) {
        this.disable(err);
        finish();
      }
    });
    return this.closePromise;
  }
}

function warnSessionLogFailure(action: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`ECHO session log tee failed to ${action}: ${message}`);
}

export function stripTerminalControl(input: string): string {
  const stripper = new AnsiStripper();
  return stripper.write(input) + stripper.flush();
}

export async function killProcessTree(pid: number): Promise<void> {
  const descendants = await collectDescendants(pid);
  for (const childPid of descendants.reverse()) {
    try {
      process.kill(childPid, "SIGTERM");
    } catch {
      // Best effort cleanup.
    }
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  setTimeout(() => {
    for (const targetPid of [pid, ...descendants]) {
      try {
        process.kill(targetPid, "SIGKILL");
      } catch {
        // Process exited after SIGTERM.
      }
    }
  }, 1_000).unref?.();
}

async function collectDescendants(pid: number): Promise<number[]> {
  const children = await childPids(pid);
  const all: number[] = [];
  for (const childPid of children) {
    all.push(childPid, ...(await collectDescendants(childPid)));
  }
  return all;
}

async function childPids(pid: number): Promise<number[]> {
  return new Promise((resolve) => {
    execFile("pgrep", ["-P", String(pid)], { timeout: 1_000 }, (err, stdout) => {
      if (err !== null) {
        resolve([]);
        return;
      }
      resolve(
        stdout
          .split(/\s+/)
          .map((raw) => Number(raw))
          .filter((value) => Number.isInteger(value) && value > 0),
      );
    });
  });
}

class AsyncEventQueue<T> implements AsyncIterable<T> {
  private readonly values: T[] = [];
  private readonly waiters: ((result: IteratorResult<T>) => void)[] = [];
  private closed = false;

  push(value: T): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter !== undefined) {
      waiter({ value, done: false });
      return;
    }
    this.values.push(value);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ value: undefined, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return { next: () => this.next() };
  }

  private next(): Promise<IteratorResult<T>> {
    const value = this.values.shift();
    if (value !== undefined) {
      return Promise.resolve({ value, done: false });
    }
    if (this.closed) {
      return Promise.resolve({ value: undefined, done: true });
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }
}

class BoundedTextBuffer {
  private value = "";

  constructor(private readonly limit: number) {}

  append(text: string): void {
    if (text.length === 0) return;
    this.value += text;
    if (this.value.length > this.limit) {
      this.value = this.value.slice(this.value.length - this.limit);
    }
  }

  toString(): string {
    return this.value;
  }
}

class AnsiStripper {
  private state: "normal" | "esc" | "csi" | "osc" | "oscEsc" = "normal";

  write(input: string): string {
    let out = "";
    for (const ch of input) {
      const code = ch.charCodeAt(0);
      if (this.state === "normal") {
        if (ch === "\x1b") {
          this.state = "esc";
        } else if (ch === "\n" || ch === "\t" || code >= 0x20) {
          out += ch;
        }
      } else if (this.state === "esc") {
        if (ch === "[") {
          this.state = "csi";
        } else if (ch === "]") {
          this.state = "osc";
        } else {
          this.state = "normal";
        }
      } else if (this.state === "csi") {
        if (code >= 0x40 && code <= 0x7e) {
          this.state = "normal";
        }
      } else if (this.state === "osc") {
        if (ch === "\x07") {
          this.state = "normal";
        } else if (ch === "\x1b") {
          this.state = "oscEsc";
        }
      } else if (this.state === "oscEsc") {
        if (ch === "\\") {
          this.state = "normal";
        } else if (ch !== "\x1b") {
          this.state = "osc";
        }
      }
    }
    return out;
  }

  flush(): string {
    this.state = "normal";
    return "";
  }
}
