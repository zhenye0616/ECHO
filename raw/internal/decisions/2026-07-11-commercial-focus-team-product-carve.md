# Commercial focus — carve and sell the Team product

**Date:** 2026-07-11 · **Status:** founder-locked · **Decision type:** product focus and commercialization

> **Terminology supersession (2026-08-02):** Read this record's `FOUNDER LIVE` / `founder-live` stage references as `INTERNAL LIVE` / `internal-live` under `2026-07-11-team-product-graduation-pipeline.md`. The criteria are unchanged except that the lane runs on a team-controlled internal Mac; founder release authority is unchanged.

## Decision

ECHO contains three substantial bodies of work, but they are not three equal product bets:

1. **Machine context** — cross-tool capture, storage, and retrieval.
2. **Fleet coordination** — multi-agent skills, task state, review, and orchestration.
3. **Team decision product** — turn meetings and team activity into decisions, follow-through, and useful briefs.

The company is going all in on the **third body of work, which is now the sole commercial product**. Its first saleable wedge is the working meeting-to-brief experiment. The immediate objective is to carve that product out of the ECHO lab so it can be onboarded, installed, and used on a client's own machine, then sell it aggressively.

## What is considered proven

- The customer pain and demand behind the Team-product experiment are considered proven by the founder. Product selection is closed; the project does not need another go/no-go demand screen before productization work.
- The experiment produces useful output in the founder-operated regime. The core is strong enough to productize rather than continue treating it as one of several research directions.

This does **not** mean client delivery is proven. A client-machine install, non-founder operation, repeat use, pricing, and the sales process still need execution evidence. Those are commercialization and productization questions, not reasons to reopen whether ECHO should pursue the Team product.

## Product boundary

Phase 1 may use assisted onboarding. After onboarding, the client must be able to run the product on their machine without a checkout of the ECHO repo and without depending on the founder's machine or personal CLI session.

This supersedes the 2026-07-10 B2 decision **as the commercial deployment endpoint**. A founder-controlled Mac may remain a demo, staging, or development box, but it is not the delivered product. The client's machine is the loop-of-record for that client after onboarding.

The first client package contains only what the meeting-to-brief wedge needs:

- meeting input and account/workspace configuration;
- signal extraction and the brain binding;
- human-gated review where required;
- brief generation and delivery workflow;
- local state, health checks, upgrade/rollback, and support/data-handling instructions.

Machine-context capture and Fleet orchestration may be reused internally where they provide implementation leverage, but they are not part of the client offer unless the Team product demonstrably requires them. The client package must not boot unrelated ECHO lab systems by default.

## Commercial posture

- Sell the Team product aggressively; do not wait for the Machine or Fleet systems to find independent customer problems.
- The clarity halt blocks build specs and product-code changes, not customer outreach, offer design, or onboarding discovery. Selling and productization learning continue while the remaining build gates are closed.
- Pricing, buyer/payment mechanics, and the exact sales process remain open execution decisions. They do not gate the product-choice decision.
- Customer conversations may refine onboarding, packaging, and workflow details, but they do not reopen the chosen wedge without explicit founder reversal.

## Graduation path

The Team wedge advances through exactly four trust states: **DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE**. The founder-operated experiment has useful real-workflow evidence, but the current candidate is formally DEV because that evidence was not a versioned, pinned, isolated run of the finalized candidate. A clean candidate-package rerun on the founder's Mac is the next gate. It does not become CLIENT LIVE until a product-boundary release candidate passes the controlled qualification matrix, the exact build-once artifact is installed on the client machine, and client acceptance proves useful and repeat use. This maturity correction does not reopen the founder's conclusion that pain and demand are proven. Canonical contract: `2026-07-11-team-product-graduation-pipeline.md`.

## Success condition

- **Productization:** through assisted onboarding, the versioned package is installed on the client's machine; the client can then configure their accounts, run a real meeting through the product, receive a useful brief, and repeat the workflow without the founder's machine participating.
- **Commercial execution:** ECHO has a written offer and actively seeks paid client commitments. The exact price and sales motion can change without reopening the product decision.

## Treatment of the other ECHO work

Machine context and Fleet coordination remain valuable technical assets and the internal operating environment used to build ECHO. They are maintained where they support the Team product or current development workflow. They are not current commercial roadmap priorities, and shipped code alone must not be described as proof that either solves a validated customer problem.

## Effect on the clarity halt

This decision settles product direction and demand. It does not itself lift the 2026-07-10 clarity halt or create a build spec. The remaining halt work should focus on what is required to carve, onboard, deploy, operate, and sell the Team product safely. Any closure row whose only purpose was to decide whether this problem is worth pursuing is retired or reframed as a pricing/sales execution question.
