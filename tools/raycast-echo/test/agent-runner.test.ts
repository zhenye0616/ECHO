import { describe, expect, it } from "vitest";
import {
  findExecutable,
  resolvePathEnv,
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
});
