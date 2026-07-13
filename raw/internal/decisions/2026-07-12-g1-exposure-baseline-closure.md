# G1 exposure baseline closure

**Closed:** 2026-07-12 21:02 PDT
**Security evidence SHA:** `48ed4f87e288a5dc863220a2622e2668bd5b8f0a`
**Source PRs:** [#8](https://github.com/zhenye0616/ECHO/pull/8), [#9](https://github.com/zhenye0616/ECHO/pull/9)
**State:** G1 closed; G2 open; product maturity DEV

## Closure decision

G1 is closed because the exposure inventory, content handling policy, history decision, repository controls, scanner dispositions, and post-land verification now all have terminal evidence. This closes the security/exposure gate only. It does not lift the clarity halt, authorize product specs, advance product maturity, or prove client readiness.

## Landed evidence

- PR #8 landed the Phase 3 workflow, dependency, policy, content-remediation, and CodeQL disposition work at `cddc127cff02477d3d5b3bab51ae5203e26e58e5`.
- PR #9 replaced the two remaining command-spawn sinks with literal executable boundaries through pinned production dependency `cross-spawn@7.0.6`. Its independently reviewed exact tip was `58ca75dc49ae5563569594b33517f2fb72902d00`; the merge produced evidence SHA `48ed4f87e288a5dc863220a2622e2668bd5b8f0a`.
- Post-land [CodeQL run 29222882099](https://github.com/zhenye0616/ECHO/actions/runs/29222882099) passed Actions and JavaScript/TypeScript analysis at `48ed4f87`. Alerts `7` and `8` closed naturally as `fixed` at 2026-07-12 21:01 PDT. GitHub reports zero open CodeQL alerts.
- The 70 evidence-specific CodeQL dismissals remain intact: 58 false positive, 8 used in tests, and 4 won't fix with explicit reconsideration triggers. No dismissal was used for alerts `1-8`, `10`, or `80`; those closed through source changes.
- Post-land [secret-scan run 29222882305](https://github.com/zhenye0616/ECHO/actions/runs/29222882305) passed the pinned full-history Gitleaks scan at `48ed4f87`.

## Enforcement readback

- Native secret scanning and push protection are enabled. GitHub's non-provider patterns and validity checks remain unavailable on the current repository/account plan and are a recorded residual.
- Actions are restricted to GitHub-owned actions, every committed action reference is a full SHA, and repository `sha_pinning_required` is enabled.
- Main ruleset `18842228` is active and strict. It requires both CodeQL analyses, the CodeQL aggregate check, and full-history Gitleaks before merge. These security workflows run on every PR; package, quality, and onboarding workflows intentionally ignore docs-only changes and therefore cannot be unconditional required contexts. PR-only, merge-only, resolved-thread, deletion, and non-fast-forward protections remain active.
- Release-tag ruleset `18842230`, protected `production` environment review, private vulnerability reporting, and immutable releases remain enabled.
- Dependabot alert `15` for `glib` in the internal Fleet overlay is dismissed as `tolerable_risk`: that overlay is outside the Team client product and release artifact. The alert must be reopened and the dependency upgraded before overlay reactivation, packaging, or distribution.

## Preserved boundaries

- The history rewrite remains deliberately deferred to G4 under `2026-07-11-filter-repo-decision-template.md`; prior clones and immutable historical copies remain an explicit residual.
- Known Windows onboarding and Ubuntu/Windows installed-package validation failures are inherited product/package qualification work. They must be green before G5/CLIENT LIVE, but they are not evidence of an unresolved repository-exposure control.
- G2 remains open. The remaining 25 halt-register rows still require terminal states and the founder must separately sign a halt-lift artifact at a named main SHA.
