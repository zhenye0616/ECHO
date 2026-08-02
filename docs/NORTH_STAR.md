# NORTH_STAR

**Read this every morning before opening any code.** ~60 seconds.

*Rewritten 2026-07-11. Commercial-focus decision: `raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md`. The three-scope model remains useful, but only Team is the current product.*

---

## The Brand Promise (unchanged, the obsession)

> *We don't make AI smarter. We make every AI smarter about you.*

## What ECHO Is — three systems, one commercial focus

ECHO has accumulated three substantial systems:

1. **Machine context** — capture and retrieval across AI/code tools. Shipped and useful internally; no validated standalone customer problem.
2. **Fleet coordination** — multi-agent skills, review, task state, and coordination. Shipped and useful internally; no validated standalone customer problem.
3. **Team decision product** — turn meetings and team activity into decisions, follow-through, and useful briefs. **This is the company bet.**

The first saleable Team-product wedge is **meeting→brief**. Its pain and demand are considered proven. Machine and Fleet are implementation leverage, not competing roadmaps.

## Current Focus (set 2026-07-11)

Carve meeting→brief out of the full ECHO lab, make assisted onboarding work, install a versioned package on the client's Mac, remove founder-machine and personal-CLI dependencies, then sell the Team product aggressively. Pricing and buyer mechanics may be refined in parallel; they do not reopen the product choice.

**Graduation path:** `DEV -> INTERNAL LIVE -> QUALIFIED -> CLIENT LIVE`. The current candidate is formally DEV, with useful founder-regime evidence from its predecessor; it reaches INTERNAL LIVE only after a versioned, pinned, isolated candidate-package run. A build-once artifact must pass product qualification, then client acceptance must prove useful and repeat use before it becomes CLIENT LIVE. Canonical contract: `raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md`.

**Operating gate:** product direction is locked, but no build spec or product code begins until the founder commits the G2 clarity-halt lift at a named SHA. Pre-lift work closes productization questions and advances customer outreach, offer design, and onboarding discovery.

## Drift Check — Ask Before Any Decision Today

1. **Does this directly help carve, onboard, install, operate, or sell the Team product?** If not, stop.
2. **Will it run on the client's machine after onboarding without the repo or founder's machine?** If not, it is not the delivered product.
3. **Am I pulling Machine/Fleet features into the client package because they exist, rather than because meeting→brief needs them?** If yes, remove them.
4. **Am I letting ECHO act externally without a human confirm?** If yes, stop; human-gated action remains load-bearing.
5. **Am I building a destination or replacing what meeting/chat vendors already capture?** If yes, stop; compose from existing systems.
6. **Am I treating a green demo, merged code, or the generic npm package as CLIENT LIVE?** If yes, stop; qualification only permits client acceptance, and useful repeat client use earns CLIENT LIVE.

## Standing Tension (re-read weekly)

Machine context and Fleet coordination are valuable internal assets, but shipped code is not proof of a customer problem. Maintain them only where they support ECHO development or the Team product. Reopening either as a commercial roadmap requires a separate founder decision backed by customer evidence.

## Definition of Done for This Phase

Through assisted onboarding, the versioned product is installed on the client's machine. The client then configures their meeting source, runs a real meeting through it, receives a useful brief, and repeats the workflow without the founder's machine participating. The package boots only the product capabilities it needs and has a documented upgrade, rollback, data, and support path.
