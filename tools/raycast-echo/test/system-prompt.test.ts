import { describe, expect, it } from "vitest";
import { UNIFIED_ASK_SYSTEM_PROMPT, buildUnifiedAskPrompt } from "../src/lib/system-prompt";

describe("Unified Ask ECHO system prompt", () => {
  it("matches the pinned prompt snapshot", () => {
    expect(UNIFIED_ASK_SYSTEM_PROMPT).toMatchInlineSnapshot(`
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
      - Do not invent tool calls or sources.
      - Answer with 3 to 6 bullets MAX. No prose paragraphs. No intro sentences. No closing sentences.
      - Each bullet is one sentence, ≤ 25 words.
      - Lead each bullet with the substantive claim, not a transition word.
      - The answer is a packet you are handing off to another AI tool (Cursor / Claude.ai / ChatGPT). It is not the destination.
      - Do not end with "let me know if you want…" or any follow-up question.
      - If retrieval is thin, say what you found and what is missing — still as bullets."
    `);
  });

  it("names the four retrieval tools verbatim", () => {
    expect(UNIFIED_ASK_SYSTEM_PROMPT).toContain("find_clusters");
    expect(UNIFIED_ASK_SYSTEM_PROMPT).toContain("search_memories");
    expect(UNIFIED_ASK_SYSTEM_PROMPT).toContain("get_atoms");
    expect(UNIFIED_ASK_SYSTEM_PROMPT).toContain("get_atom");
  });

  it("enforces single-shot + handoff constraints", () => {
    expect(UNIFIED_ASK_SYSTEM_PROMPT).toContain("Single-shot only");
    expect(UNIFIED_ASK_SYSTEM_PROMPT).toContain("Do not ask clarifying questions");
    expect(UNIFIED_ASK_SYSTEM_PROMPT).toContain("Do not offer follow-up prompts");
    expect(UNIFIED_ASK_SYSTEM_PROMPT).toContain("It is not the destination");
  });

  it("caps the answer at 3 to 6 bullets", () => {
    expect(UNIFIED_ASK_SYSTEM_PROMPT).toContain("3 to 6 bullets MAX");
  });

  it("appends the user question without mutating the pinned system body", () => {
    expect(buildUnifiedAskPrompt("  what should ship next?  ")).toBe(
      `${UNIFIED_ASK_SYSTEM_PROMPT}\n\nQuestion:\nwhat should ship next?\n`,
    );
  });
});
