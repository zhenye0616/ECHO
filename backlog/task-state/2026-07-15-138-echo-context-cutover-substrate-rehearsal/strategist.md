## current_thesis

Land and rehearse all code needed for a reversible context cutover without touching founder-machine state. Item 139 alone builds from the landed SHAs and executes live.

## locked_decisions

- Item 138 is code/rehearsal only; authority remains Project_echo and every real user path/process/port is guarded out.
- One canonical transaction record is the authority commit point; configs/projection records reference it.
- Residual exposes exactly seven non-context tools, owns coord.sqlite, and never opens a context DB.
- Product consumers use only item 137's sealed generic service-operation manifest; uncovered calls block.
- Every canonical coord write atomically creates an outbox row; stable-ID context mirrors keep wait/search behavior without becoming authority.
- Full/rollback mode checks authority before PID, directory, DB, worker, or socket mutation; all supported global start paths are fenced.
- Client key echo remains context; echo-project-residual is new. Every endpoint caller and installed adapter template is classified and reversible.
- The known preexisting ~/.echo-context scaffold is whole-root quarantined only after exact recheck; it is never merged/deleted.
- Rehearsal proves populated migration, coord reconstruction, G1 cutover, new writes, rollback, rollback-era writes, and fresh G2 recutover.
- Target code lands first, then Project_echo; live artifacts build only from read-back canonical landed SHAs in item 139.

## open_questions

- Reviewers must validate both repository heads, mutation guard, full-start fence, consumer/caller closure, coord mirror, and G1-to-G2 crash matrix.
- Any production-adapter gap found after landing becomes a new proposal; item 139 may not hotfix or rebuild.

## dont_touch

- Do not read/write live state, configs, skills, packages, credentials, LaunchAgents, listeners, ports, or services.
- Do not activate/freeze authority, patch item 137, change context semantics, install brain/loop, edit wiki, or advance product maturity.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md
- reviews: backlog/reviews/2026-07-15-138-echo-context-cutover-substrate-rehearsal/
