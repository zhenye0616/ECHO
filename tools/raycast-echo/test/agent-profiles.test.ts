import { describe, expect, it } from "vitest";
import { resolveAgentInvocation, splitShellArgs } from "../src/lib/agent-profiles";

describe("agent profiles", () => {
  it("builds the codex profile shape", () => {
    const invocation = resolveAgentInvocation("codex", {}, "/Users/x/Project_echo", "prompt");
    expect(invocation.binary).toBe("codex");
    expect(invocation.args).toEqual(["exec", "--sandbox", "read-only", "-C", "/Users/x/Project_echo", "-"]);
    expect(invocation.stdin).toBe("prompt");
  });

  it("builds the claude profile shape", () => {
    const invocation = resolveAgentInvocation("claude", {}, "/repo", "prompt");
    expect(invocation.binary).toBe("claude");
    expect(invocation.args).toEqual(["-p"]);
    expect(invocation.stdin).toBe("prompt");
  });

  it("defaults absent agent kind to codex", () => {
    const invocation = resolveAgentInvocation(undefined, {}, "/repo", "prompt");
    expect(invocation.binary).toBe("codex");
  });

  it("keeps repo paths with spaces as one codex argv entry", () => {
    const invocation = resolveAgentInvocation("codex", {}, "/Users/x/Project echo", "prompt");
    expect(invocation.args.slice(3, 5)).toEqual(["-C", "/Users/x/Project echo"]);
  });

  it("substitutes custom {question} and places the prompt in argv", () => {
    const invocation = resolveAgentInvocation("custom", { customCommand: "echo --prompt {question}" }, "/repo", "<q>");
    expect(invocation).toEqual({ binary: "echo", args: ["--prompt", "<q>"], stdin: "" });
  });

  it("uses stdin for custom commands without a {question} template", () => {
    const invocation = resolveAgentInvocation("custom", { customCommand: "echo" }, "/repo", "raw prompt");
    expect(invocation).toEqual({ binary: "echo", args: [], stdin: "raw prompt" });
  });

  it("splits custom commands with shell-style quotes", () => {
    expect(splitShellArgs('echo --flag "foo bar" <q>')).toEqual(["echo", "--flag", "foo bar", "<q>"]);
  });

  it("substitutes repoPath in custom command templates", () => {
    const invocation = resolveAgentInvocation(
      "custom",
      { customCommand: 'runner --cwd "{repoPath}"' },
      "/Users/x/Project echo",
      "prompt",
    );
    expect(invocation.args).toEqual(["--cwd", "/Users/x/Project echo"]);
    expect(invocation.stdin).toBe("prompt");
  });

  it("pins literal {question} inside single quotes to the chosen substitution behavior", () => {
    const invocation = resolveAgentInvocation("custom", { customCommand: "echo 'literal {question}' {question}" }, "/repo", "Q");
    expect(invocation.args).toEqual(["literal Q", "Q"]);
    expect(invocation.stdin).toBe("");
  });
});
