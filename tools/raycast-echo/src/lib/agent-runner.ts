import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { homedir } from "node:os";
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
}

export interface AgentRunnerOptions {
  idleTimeoutMs?: number;
  maxRuntimeMs?: number;
}

const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RUNTIME_MS = 5 * 60_000;
const STDERR_TAIL_LIMIT = 4096;

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

export async function probeEchoDaemon(timeoutMs = 1_000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(ECHO_MCP_URL, { method: "HEAD", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
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
    queue.push({ type: "error", error: err });
    queue.push({ type: "footer", markdown: `**Agent failed to start**\n\n${stripTerminalControl(err.message)}` });
    queue.close();
  });

  child.stderr.on("data", (chunk: Buffer) => {
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
      const text = stdoutStripper.write(Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk));
      if (text.length === 0) continue;
      armIdleTimer();
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
    cancel: () => {
      if (exited || cancelled) return;
      cancelled = true;
      queue.push({ type: "footer", markdown: "**Cancelled.**" });
      if (child.pid !== undefined) void killProcessTree(child.pid);
    },
  };
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
