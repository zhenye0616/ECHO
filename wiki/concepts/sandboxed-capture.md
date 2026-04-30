---
topic: Architecture
subtopic: Storage
aliases:
  - Sandboxed Capture
  - Capture Sandbox
---

# Sandboxed Capture

## Definition

ECHO observes only what is on the [[capture-allowlist]]. Sandboxing is enforced *as code*, not as policy: the [[capture-gate]] is a single chokepoint function through which every captured event must pass to be persisted. Events from non-allowlisted sources cannot reach storage — by construction, not by convention.

## Three Layers of Sandboxing

Operating systems offer three levels at which capture can be confined. ECHO uses each where it fits:

1. **Hardware-enforced (kernel sandboxes).** Strongest, but cuts off the surfaces ECHO needs (Accessibility, file system, cross-app observation). Not ECHO's primary mechanism.
2. **OS-enforced (entitlements, host_permissions).** Strong: the browser denies the extension's content scripts on un-listed domains; macOS denies File Access without explicit user consent. ECHO leans on these where the platform provides them — most notably the browser extension's `host_permissions` manifest.
3. **Application-enforced (the gate).** ECHO's primary mechanism for daemon-side capture. The Accessibility API gives the daemon access to *every* foregrounded window; the FS watcher could, in principle, see every file. The gate is what reduces that potential to "only what's on the allowlist."

The three combine into defense-in-depth: even if a future code change accidentally widens what the daemon could read, the gate refuses to write any event whose source isn't explicitly allowlisted.

## The Honest Framing

Not every layer offers the same strength of guarantee. Be precise:

- **Strongly guaranteed by the platform:**
  - Browser extension `host_permissions` — Chrome refuses to inject content scripts on un-listed domains
  - OAuth scopes for API connectors — the third party itself enforces what the token can read
- **Depends on our discipline (the gate is the enforcer):**
  - macOS Accessibility access — the OS grants the daemon system-wide read; the gate is what narrows it to allowlisted bundle IDs
  - File-system watching — the daemon can technically watch any path; the gate narrows it to allowlisted prefixes

Calling out the difference is a feature. Users (and reviewers) deserve to know which guarantees are structural and which are us-keeping-our-promise. The audit page surfaces the allowlist contents verbatim so the discipline-dependent guarantees are at least *visible*.

## Why a Single Chokepoint

Two reasons compound:

1. **Auditability.** "What does ECHO see?" has exactly one answer — read the allowlist file and the gate. No need to chase down per-surface filtering logic scattered across the codebase. The architectural commitment is concentrated, not diffused.
2. **Test surface.** The gate is a pure function (one observable side-effect: a structured log line). Testing every reject and accept path is trivial; no mocks, no fixtures for storage, no async setup. Coverage of the security boundary is high because the boundary is small.

## The Allowlist Is the Source of Truth

Sandboxing is what the gate *does*; the allowlist is what the gate *checks against*. They form a tight pair. The allowlist starts empty and grows by deliberate per-source commits; the gate stays the same as it grows. See [[capture-allowlist]] for the structure of that file and why it ships empty.

## Related

- [[capture-allowlist]] — the source of truth the gate checks
- [[capture-gate]] — the runtime enforcer
- [[storage]] — accepts only events that pass the gate
- [[audit-page]] — surfaces the allowlist for users
- [[layer-above-saas]] — why "ingest, don't replicate" requires this discipline
- [[felt-not-seen]] — quiet trust depends on visible enforcement
