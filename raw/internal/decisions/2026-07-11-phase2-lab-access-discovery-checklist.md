# Phase 2 lab access and onboarding discovery checklist

**Status:** questions only; no client answers recorded
**Rows served:** B1, C1-C3, T11, X2-X4
**Privacy:** record answers by role and capability. Do not commit client names, workspace names, meeting titles, participant names, credentials, URLs, or raw policy documents.

## Rollout and accountable people

- Who is the buyer, daily operator, technical admin, data-policy approver, and support contact?
- What date/window is available for access discovery, assisted installation, first meeting, repeat meeting, and acceptance review?
- Who may authorize OAuth/bot/app access and who can revoke it?
- Who owns pause/notify decisions when the product is unhealthy?
- Who can operate restart/recovery if the founder is unavailable?

## Meeting source and Granola

- Is the first-client source Granola, Zoom transcript export, or both?
- Will the client use its own Granola key/account, or is a shared workspace explicitly permitted for the first engagement?
- Which plan/quota applies, who pays, and what evidence shows the required workspace/folder is visible to the key?
- Are meeting notes private by default; what human move/share step is required before the product can see them?
- What is the observed publication-latency range after a meeting?
- What languages, approximate lengths, and internal/external participant mix should the first release support?
- Are ad-hoc meetings common, or can the product rely on calendar events? Treat an unanswered question as no calendar dependency.

## Zoom access

- Account/plan class and transcript/recording availability?
- Admin rights and OAuth/app-approval route?
- Export/API/webhook options actually enabled?
- Participant notice/recording-consent mechanism?
- Expected OAuth review or security-review lead time?

## Mattermost delivery

- Server/version class and hosting model?
- Admin ability to create bot/integration credentials?
- Allowed delivery mechanisms: bot API, incoming webhook, websocket, manual paste?
- Channel/thread permission model and retention/export rules?
- Network/proxy restrictions from the client Mac?
- What should happen when delivery fails after a brief is generated?

## Data, consent, and offboarding

- Which institutional policy or IRB determination governs transcripts and derived briefs?
- Who confirms participant notice/consent before processing?
- Required data locality, retention duration, deletion SLA, backup policy, and audit evidence?
- May any diagnostic leave the client Mac; if so, which fields and through what approved channel?
- Offboarding owner and proof: service stopped, credentials revoked, local data/backups deleted or returned, support access removed.
- Incident owner, notification window, and authority to disable the runtime?

## Acceptance and support

- What makes a brief useful enough to send or act on?
- How many real meetings constitute repeat use for the first engagement?
- Which failure classes require immediate rollback versus support intervention?
- Support hours, response target, and escalation channel?
- What evidence may be retained after acceptance without identifying participants?

## Closure rule

Each canonical register row may close only when the answer is either recorded in a sanitized decision artifact or explicitly deferred with an owner and objective trigger. An unanswered client question is not permission to invent an answer. If the counterpart is unavailable, defer only the affected adapter/release capability; do not reopen product demand or block unrelated product-boundary work.
