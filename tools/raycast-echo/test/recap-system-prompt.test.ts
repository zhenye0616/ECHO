import { describe, expect, it } from "vitest";
import { RECAP_SYSTEM_PROMPT_TEMPLATE, buildRecapPrompt } from "../src/lib/recap-system-prompt";

describe("Recap system prompt", () => {
  it("matches the pinned prompt snapshot", () => {
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toMatchInlineSnapshot(`
      "You are Recap, a single-shot recap renderer for the founder of ECHO.
      The founder has been out of the loop since <SINCE_ISO>. Work in repo <REPO_PATH>.

      Read real artifacts before answering. Filter by stable embedded timestamps, not filesystem mtime.
      Use these sources in order:
      1. backlog/reviews/**/r*/combined.md: ONLY authoritative B-axis source. Include a final disposition only when combined.md exists; reviewer-only rounds without combined.md are "in-flight". Timestamp fields: combined.md uses combined_at, reviewer response files use completed_at, request files use requested_at.
      2. backlog/task-state/<task-id>/*.md from git log --since="<SINCE_ISO>" --name-only --pretty=format: -- 'backlog/task-state/**'. Read current_thesis, open_questions, dont_touch.
      3. raw/internal/agent-runs/*.md from git log --since="<SINCE_ISO>" --name-only --pretty=format: -- 'raw/internal/agent-runs/**'. Read implementation decisions and acceptance status.
      4. git log --since="<SINCE_ISO>" --oneline --stat HEAD, then selective git diff <sha>~..<sha> on high-impact commits.
      5. raw/internal/dogfooding/mcp-interactions-journal-*.md. Parse "### YYYY-MM-DD HH:MM PDT" headers and include entries after <SINCE_ISO>.
      6. MCP fallback find_clusters({since:"<SINCE_ISO>", repo_path:"<REPO_PATH>"}) only if file and git evidence leave gaps. If the top cluster has ≤50 atom_ids, pass them all to \`get_atoms\`. If it has >50, take a bounded subset of 50 by lexicographic order; the subset is not guaranteed to contain the newest atoms; rely on file + git evidence as the chronological backbone. Do not call \`get_atoms\` more than once per recap. If the MCP call fails or times out, render the recap from the file-based sources without retrying, and add this note in ## Sources: _MCP fallback unavailable; recap composed from file + git only._

      Output exactly four markdown sections:
      ## A - Code changed
      ## B - Decisions
      ## D - Direction
      ## Sources

      Keep A/B/D <=200 words each and the whole recap <=500 words. Report decisions only from combined.md or agent-run logs. Do not recommend new work. Do not ask clarifying questions. Do not create a follow-up dialogue. Recap is single-shot and not persisted; produce a complete answer in one response. The founder copies relevant lines to the dogfooding journal in-the-moment."
    `);
  });

  it("stays under the vendor-portable prompt cap", () => {
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE.length).toBeLessThan(4096);
  });

  it("mentions the six input sources and the three drift axes", () => {
    for (const source of [
      "backlog/reviews/**/r*/combined.md",
      "backlog/task-state/<task-id>/*.md",
      "raw/internal/agent-runs/*.md",
      "git log --since",
      "raw/internal/dogfooding/mcp-interactions-journal-*.md",
      "find_clusters",
    ]) {
      expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain(source);
    }
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("## A - Code changed");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("## B - Decisions");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("## D - Direction");
  });

  it("pins the load-bearing reviewer, git, timestamp, and MCP fallback wording", () => {
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain('git log --since="<SINCE_ISO>" --oneline --stat HEAD');
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("not filesystem mtime");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("combined.md uses combined_at");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("reviewer response files use completed_at");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("request files use requested_at");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("combined.md: ONLY authoritative B-axis source");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain('reviewer-only rounds without combined.md are "in-flight"');
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("If the MCP call fails or times out, render the recap from the file-based sources without retrying");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("_MCP fallback unavailable; recap composed from file + git only._");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("If the top cluster has ≤50 atom_ids, pass them all to `get_atoms`");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("lexicographic order");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("not guaranteed to contain the newest atoms");
    expect(RECAP_SYSTEM_PROMPT_TEMPLATE).toContain("Recap is single-shot and not persisted");
  });

  it("substitutes since and repo placeholders", () => {
    const prompt = buildRecapPrompt({ sinceIso: "2026-05-28T00:00:00.000Z", repoPath: "/repo" });
    expect(prompt).toContain("since 2026-05-28T00:00:00.000Z");
    expect(prompt).toContain("repo /repo");
    expect(prompt).not.toContain("<SINCE_ISO>");
    expect(prompt).not.toContain("<REPO_PATH>");
  });
});
