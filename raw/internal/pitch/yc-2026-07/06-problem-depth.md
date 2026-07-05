# Problem depth — what we understand that others don't

The application's "what do you understand about this that others don't" answer draws from here. Everything below is earned from shipped code + instrumented usage, not theory.

## The mechanism of the problem

1. **Context fragments by design, not accident.** Every AI vendor's memory is a moat: Cursor's context stays in Cursor, Claude's in Claude, Copilot's in GitHub. The fragmentation is the business model — which is exactly why no vendor can solve it and an independent, user-owned layer must exist. (Positioning directive: lead with cross-vendor fragmentation + vendor moats.)
2. **The unit of lost context is the behavioral sequence, not the document.** What's missing Monday morning isn't a file — it's the temporal trace: what you tried, why you abandoned it, what you decided. Tools that index artifacts (search, RAG over notes) miss it structurally. ECHO captures action sequences at the source and reasons over time.
3. **The deepest version is *self*-fragmentation.** The multi-hat founder loses context across their own roles — the 2pm PM hat can't access the 10am eng hat's reasoning. AI tools amplify this: each hat's AI is now confidently ignorant of the other hats.

## The three hard-won architecture insights

1. **The brain lives in the consumer.** ECHO's substrate is deliberately deterministic (no LLM inside): capture → append-only atoms → read-time normalization → retrieval over MCP. Intelligence comes from whichever agent queries it. Proven by failure: the 6/19 live test (Slack bot dumping raw atoms) showed that a context layer with no brain dumps chatter, and a brain with no curated layer confabulates. Fix: decision-atoms (sparse, high-signal, human-confirmed) + a headless agent as the brain. Nobody gets this right first try; we have the failure analysis and the fix in production.
2. **Identity is the hard problem, not storage.** The same repo/file/conversation appears under different identifiers in every tool; without canonical join keys, retrieval collapses into "recent blobs." We reduced ~358 logged failure incidents to **six broken boundary contracts** (`backlog/_followups.md`), with canonical artifact identity as root #1 — and shipped the fix wave (items 095/096) with an A/B baseline deliberately preserved to measure it.
3. **The privacy gate and the alignment product are the same feature.** Raw context never leaves the machine; only human-confirmed, decision-grade context flows up. One primitive (propose-confirm) answers both "is my data safe?" and "how does my team stay aligned?" — and it recurses: the same gate at every org boundary is the growth thesis.

## The instrumented evidence (what "we understand the problem" looks like in data)

- **Every retrieval call is journaled in the moment** with per-call source attribution and verdict. June 2026: 68✅/27🟡/6❌ — we can name the failure modes (source-volume bias, silent source omission, literal-substring vs relevance) because the discipline forces per-source visibility on every call.
- **The dev process is the fleet-scope proof:** 111 items shipped by Claude Code + Codex + Cursor coordinating through ECHO's own coord substrate and review-queue protocol — cross-vendor agents as peers, on a protocol we host precisely because no model vendor can.
- **Cold-reader test 5/5** on the personal wedge; the killer-demo standard is "no hand-staging."

## The convergence thesis (why now)

The industry is converging on continual learning + local personal models; MCP (97M monthly SDK downloads, Linux Foundation governance, OpenAI + Google adopted) standardized the serve-back rail. When the personal model trained on you arrives, the question is who owns the trace it trains on. ECHO's answer: you do, on your machine — captured now, before that future arrives. Category consolidation has started (Limitless→Meta); independence is the differentiator with a deadline.
