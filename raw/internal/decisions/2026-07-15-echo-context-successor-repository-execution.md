# Echo-context successor repository execution is a narrow founder-authorized lane

Date: 2026-07-15
Status: locked
Applies to: items 136, 137, 138, and the separate founder-execute live-cutover item 139

## Decision

The founder's 2026-07-15 direction makes echo-context readiness the next development focus. That work necessarily crosses Project_echo's default single-repository boundary, so these named items receive a narrow exception to the ordinary no-writes-outside-Project_echo rule.

The exception covers only:

- source work in the canonical /Users/zhenye/Desktop/echo-context repository through isolated feature worktrees;
- the exact Project_echo files listed by the active item;
- item 137's named capture-off shadow-install paths after independent code review and an exact-artifact founder execute checkpoint; and
- item 139's explicitly listed live cutover paths after items 136-138 are complete and a separate exact-artifact founder execute checkpoint.

It does not authorize source work in echo-brain or echo-loop, unlisted repositories or user paths, builder pushes to either main branch, public release, live external messages, or any mutation before the item's stated checkpoint. The sole direct-main exception is item 136's founder-operated empty-repository bootstrap: after exact baseline verification and explicit founder approval, the founder may push the already-reviewed extraction commit as the first and only initial `main` ref. No successor byte may enter that bootstrap push; all descendant work uses reviewed feature branches and the protocol below.

## Two-repository execution protocol

Project_echo remains the coordination root. Claim, task-state, run log, backlog transitions, and the Project_echo feature branch use the normal workflow. A source item also records target_repo, target_remote, target_branch, target_worktree, target_head_sha, and target_pr_url in builder-managed frontmatter. The independent merger/founder records target_landed_sha and project_landed_sha only after canonical remote-main readback.

For echo-context source changes:

1. Verify the canonical target main/ref and clean primary checkout against the item's pinned predecessor. For item 136 only, perform the founder-operated empty-repository baseline bootstrap above before creating any successor branch.
2. Create or reuse a separate sibling target worktree on target branch agent/<item-slug>. Never edit the target main checkout in place.
3. Implement only target paths named in files_to_modify. Project_echo changes stay in the Project_echo item worktree.
4. Commit and push both feature branches without merging either. The Project_echo migration/run record binds both full head SHAs and target tree.
5. An agent other than the builder reviews both exact heads, target tests/artifacts, and the cross-repository record. A review of only one repository is incomplete.
6. Founder approval is required before the target PR is merged or target main is pushed. Read back the canonical target landed SHA/tree and write target_landed_sha.
7. Revalidate the Project_echo record against that landing. Then use the normal independent Project_echo review and founder merge/push checkpoints.

No release or installed artifact may be built from a mutable worktree or an unmerged feature SHA. A build-once release consumes a fresh detached clone of the read-back canonical main SHA named by its item. Item 138 lands and rehearses source substrate only. Item 139 builds the final controller/residual artifacts from completed canonical SHAs and alone may execute the live authority cutover.

## External execute protocol

Live user paths remain forbidden during ordinary build/review. An item may cross that boundary only when all of the following are true:

- the item and this decision explicitly name the path and operation;
- all code that performs the mutation is independently reviewed and landed at the recorded canonical SHA;
- the exact source/version/artifact SHA-256 tuple is known and the founder approves that tuple for execute;
- a secret-free plan, backup/rollback contract, and preflight pass before the first mutation; and
- the operator records redacted evidence and stops on any mismatch.

Item 137's execute scope is only the isolated capture-off shadow. Item 139 owns credentials, populated-state migration, AI-client wiring, authority activation, rollback/recutover, and acceptance. Item 138 is code/rehearsal only and may not touch live paths.

## Failure and recovery

An interrupted target branch is left pushed and unmerged; it is never silently adopted, deleted, force-pushed, or merged. A target-main landing with an unfinished Project_echo record is reported immediately and the item remains incomplete until the record is independently reconciled. An interrupted external execute follows only the item's durable controller/rollback state; no builder improvises a repair.

The default no-external-write rule remains in force for every other backlog item.
