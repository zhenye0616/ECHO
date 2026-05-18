import { homedir } from "node:os";
import { describe, expect, it } from "vitest";
import { derivedApp, formatAtomBundle } from "../src/lib/format";

const home = "/Users/alice";

describe("format", () => {
  it("derives fs-backed app names from the daemon source prefixes", () => {
    expect([
      derivedApp("fs:/Users/alice/Library/Application Support/Cursor/User/workspaceStorage/state.vscdb", home),
      derivedApp("fs:/Users/alice/.claude/projects/project/session.jsonl", home),
      derivedApp("fs:/Users/alice/.codex/sessions/2026/05/17/rollout.jsonl", home),
    ]).toEqual(["cursor", "claude_code", "codex"]);
  });

  it("derives git sources", () => {
    expect(derivedApp("git:/Users/alice/Desktop/Project_echo", home)).toBe("git");
  });

  it("falls back to unknown for unmatched sources", () => {
    expect(derivedApp("api:slack:channel", home)).toBe("unknown");
  });

  it("formats a single atom bundle with PDT timestamp and verbatim content", () => {
    expect(
      formatAtomBundle([
        {
          id: "a1",
          source: `fs:${homedir()}/.codex/sessions/2026/05/17/rollout.jsonl`,
          timestamp: "2026-05-17T22:40:00.000Z",
          content: "verbatim\ncontent",
        },
      ]),
    ).toBe("## codex · 2026-05-17 15:40 PDT\n\nverbatim\ncontent");
  });

  it("separates multi-atom bundles with the exact cluster separator", () => {
    expect(
      formatAtomBundle([
        {
          id: "a1",
          source: "git:/Users/alice/Desktop/Project_echo",
          timestamp: "2026-05-17T22:40:00.000Z",
          content: "commit body",
        },
        {
          id: "a2",
          source: "fs:/Users/alice/unknown.jsonl",
          timestamp: "2026-05-17T22:41:00.000Z",
          content: "second body",
        },
      ]),
    ).toContain("\n---\n## unknown · 2026-05-17 15:41 PDT\n\nsecond body");
  });
});
