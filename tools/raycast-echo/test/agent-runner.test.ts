import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findExecutable,
  resolvePathEnv,
  SESSION_LOG_DIR,
  startAgent,
  stripTerminalControl,
  type AgentRunnerEvent,
} from "../src/lib/agent-runner";

async function collect(events: AsyncIterable<AgentRunnerEvent>): Promise<AgentRunnerEvent[]> {
  const out: AgentRunnerEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
}

describe("agent runner", () => {
  let sessionLogDir: string;

  beforeEach(() => {
    sessionLogDir = mkdtempSync(join(tmpdir(), "echo-agent-runner-"));
  });

  afterEach(() => {
    try {
      chmodSync(sessionLogDir, 0o700);
    } catch {
      // Directory may already be gone.
    }
    rmSync(sessionLogDir, { recursive: true, force: true });
  });

  it("strips bold ANSI escapes from stdout text", () => {
    expect(stripTerminalControl("\x1b[1mhello\x1b[0m")).toBe("hello");
  });

  it("cleans cursor movement sequences from stderr footers", async () => {
    const run = startAgent(
      {
        binary: process.execPath,
        args: ["-e", "process.stderr.write('\\x1b[2Aboom\\x1b[0m'); process.exit(2);"],
        stdin: "",
      },
      { idleTimeoutMs: 5_000, maxRuntimeMs: 5_000 },
    );

    const events = await collect(run.events);
    const footer = events.find((event) => event.type === "footer" && event.markdown.includes("Agent exited"));
    expect(footer).toBeDefined();
    expect(footer?.type === "footer" ? footer.markdown : "").toContain("boom");
    expect(footer?.type === "footer" ? footer.markdown : "").not.toContain("\x1b");
  });

  it("resolvePathEnv returns process.env.PATH when set", () => {
    expect(resolvePathEnv({ PATH: "/foo:/bar" })).toBe("/foo:/bar");
  });

  it("resolvePathEnv falls back to GUI-safe defaults when PATH is undefined", () => {
    const resolved = resolvePathEnv({});
    expect(resolved).toContain("/usr/local/bin");
    expect(resolved).toContain("/opt/homebrew/bin");
    expect(resolved).toContain("/usr/bin");
  });

  it("findExecutable resolves bare-name binaries when process.env.PATH is undefined", async () => {
    const previous = process.env.PATH;
    delete process.env.PATH;
    try {
      // /bin/sh is universally present; verifies the absolute-path branch.
      await expect(findExecutable("/bin/sh")).resolves.toBe(true);
      // 'sh' is in /bin or /usr/bin; verifies fallback PATH is wired into the `which` execFile env.
      await expect(findExecutable("sh")).resolves.toBe(true);
    } finally {
      if (previous !== undefined) process.env.PATH = previous;
    }
  });

  it("handles stdout chunks split mid-escape-sequence", async () => {
    const run = startAgent(
      {
        binary: process.execPath,
        args: [
          "-e",
          "process.stdout.write('\\x1b[1'); setTimeout(() => { process.stdout.write('mhello\\x1b[0m'); }, 5);",
        ],
        stdin: "",
      },
      { idleTimeoutMs: 5_000, maxRuntimeMs: 5_000 },
    );

    const events = await collect(run.events);
    const stdout = events
      .filter((event): event is Extract<AgentRunnerEvent, { type: "stdout" }> => event.type === "stdout")
      .map((event) => event.text)
      .join("");
    expect(stdout).toBe("hello");
  });

  it("tees subprocess stdout and stderr to a per-session log", async () => {
    const run = startAgent(
      {
        binary: process.execPath,
        args: ["-e", "process.stdout.write('hello stdout\\n'); process.stderr.write('hello stderr\\n');"],
        stdin: "",
      },
      { idleTimeoutMs: 5_000, maxRuntimeMs: 5_000, sessionLogDir },
    );

    expect(run.sessionLogPath).not.toBeNull();
    await collect(run.events);

    const logPath = onlySessionLogPath(sessionLogDir);
    expect(run.sessionLogPath).toBe(logPath);
    const text = readFileSync(logPath, "utf8");
    expect(text).toContain("=== ECHO agent session ");
    expect(text).toContain(`${process.execPath} -e`);
    expect(text).toContain("hello stdout\n");
    expect(text).toContain("[stderr] hello stderr\n");
    expect(SESSION_LOG_DIR).toContain(".config/raycast/extensions/echo-context/sessions");
  });

  it("returns distinct immutable session log paths for overlapping runs", async () => {
    const first = startAgent(
      {
        binary: process.execPath,
        args: ["-e", "setTimeout(() => { process.stdout.write('first\\n'); }, 35);"],
        stdin: "",
      },
      { idleTimeoutMs: 5_000, maxRuntimeMs: 5_000, sessionLogDir },
    );
    const second = startAgent(
      {
        binary: process.execPath,
        args: ["-e", "process.stdout.write('second\\n');"],
        stdin: "",
      },
      { idleTimeoutMs: 5_000, maxRuntimeMs: 5_000, sessionLogDir },
    );

    expect(first.sessionLogPath).not.toBeNull();
    expect(second.sessionLogPath).not.toBeNull();
    expect(first.sessionLogPath).not.toBe(second.sessionLogPath);
    first.cancel();

    await Promise.all([collect(first.events), collect(second.events)]);

    expect(first.sessionLogPath).not.toBe(second.sessionLogPath);
    expect(existsSync(first.sessionLogPath ?? "")).toBe(true);
    expect(existsSync(second.sessionLogPath ?? "")).toBe(true);
  });

  it("updates latest.log to point at the newest per-session log", async () => {
    const run = startAgent(
      {
        binary: process.execPath,
        args: ["-e", "process.stdout.write('latest target\\n');"],
        stdin: "",
      },
      { idleTimeoutMs: 5_000, maxRuntimeMs: 5_000, sessionLogDir },
    );

    await collect(run.events);

    const sessionPath = onlySessionLogPath(sessionLogDir);
    const latestPath = join(sessionLogDir, "latest.log");
    expect(existsSync(latestPath)).toBe(true);

    const stat = lstatSync(latestPath);
    if (stat.isSymbolicLink()) {
      expect(realpathSync(latestPath)).toBe(realpathSync(sessionPath));
    } else {
      expect(readFileSync(latestPath, "utf8").trim()).toBe(sessionPath);
    }
  });

  it("continues the run when the session log directory is unwritable", async () => {
    chmodSync(sessionLogDir, 0);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const run = startAgent(
        {
          binary: process.execPath,
          args: ["-e", "process.stdout.write('still runs\\n');"],
          stdin: "",
        },
        { idleTimeoutMs: 5_000, maxRuntimeMs: 5_000, sessionLogDir },
      );

      const events = await collect(run.events);
      const stdout = events
        .filter((event): event is Extract<AgentRunnerEvent, { type: "stdout" }> => event.type === "stdout")
        .map((event) => event.text)
        .join("");
      expect(stdout).toBe("still runs\n");
      expect(events.some((event) => event.type === "exit" && event.code === 0)).toBe(true);
    } finally {
      warn.mockRestore();
      chmodSync(sessionLogDir, 0o700);
    }
  });
});

function onlySessionLogPath(dir: string): string {
  const logs = readdirSync(dir).filter((name) => name.endsWith(".log") && name !== "latest.log");
  expect(logs).toHaveLength(1);
  return join(dir, logs[0]);
}
