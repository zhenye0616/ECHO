import { describe, expect, it } from "vitest";
import { ASK_ECHO_SYSTEM_PROMPT, buildAskEchoPrompt, buildUnifiedAskPrompt } from "../src/lib/system-prompt";

describe("Ask ECHO system prompt", () => {
  it("matches the pinned prompt snapshot", () => {
    expect(ASK_ECHO_SYSTEM_PROMPT).toMatchInlineSnapshot(`
      "You are Ask ECHO, a single-shot Q&A surface for the founder's local ECHO context.

      Use the ECHO MCP tools already configured in this agent. Prefer this retrieval pattern:
      1. Start with find_clusters for recent cross-source discovery when the question is broad or time-based.
      2. Use search_memories for exact terms, file paths, SHAs, people, products, or quoted fragments.
      3. Use get_atoms to materialize bodies for atom IDs returned by find_clusters or search_memories.
      4. Use get_atom only when one specific atom needs verbatim recovery after get_atoms/search_memories showed truncation.

      Constraints:
      - Single-shot only: answer the submitted question in this run.
      - Do not ask clarifying questions.
      - Do not offer follow-up prompts, next-message chat affordances, or a continuing conversation.
      - Do not invent tool calls or sources. If retrieval is thin, say what you found and what is missing.
      - Keep the answer concise, source-grounded, and useful for immediate work."
    `);
  });

  it("names the four retrieval tools verbatim", () => {
    expect(ASK_ECHO_SYSTEM_PROMPT).toContain("find_clusters");
    expect(ASK_ECHO_SYSTEM_PROMPT).toContain("search_memories");
    expect(ASK_ECHO_SYSTEM_PROMPT).toContain("get_atoms");
    expect(ASK_ECHO_SYSTEM_PROMPT).toContain("get_atom");
  });

  it("enforces the single-shot no-clarifying-questions constraint", () => {
    expect(ASK_ECHO_SYSTEM_PROMPT).toContain("Single-shot only");
    expect(ASK_ECHO_SYSTEM_PROMPT).toContain("Do not ask clarifying questions");
    expect(ASK_ECHO_SYSTEM_PROMPT).toContain("Do not offer follow-up prompts");
  });

  it("appends the user question without mutating the pinned system body", () => {
    expect(buildAskEchoPrompt("  what changed?  ")).toBe(`${ASK_ECHO_SYSTEM_PROMPT}\n\nQuestion:\nwhat changed?\n`);
  });

  it("exports a stricter unified prompt with a hard answer cap", () => {
    const prompt = buildUnifiedAskPrompt("  what should ship next?  ");

    expect(typeof buildUnifiedAskPrompt).toBe("function");
    expect(prompt).toEqual(expect.any(String));
    expect(prompt).toContain("3 to 6 bullets");
    expect(prompt).toContain("what should ship next?");
  });
});
