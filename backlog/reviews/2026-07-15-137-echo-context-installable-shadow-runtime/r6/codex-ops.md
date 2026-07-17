---
item_id: "2026-07-15-137-echo-context-installable-shadow-runtime"
round: 6
reviewer: "codex-ops"
artifact_sha: "4f0f0ea45ecd5df09c57d0e340e47207e654e724"
completed_at: '2026-07-17T07:59:54Z'
verdict: "proceed_after_patches"
review_protocol: 2
review_mode: "full"
findings:
  - severity: "high"
    mechanism: "launchd discards the fallback diagnostic channels before bounded runtime logging is guaranteed"
    origin: "unknown"
    where: "AC1 startup ordering and AC4 direct-launch plist/logging contract"
    finding: "The plist sends stdout and stderr to /dev/null, but the spec never requires the internal sink to become usable before config, secret, writer-lock, native-module, and SQLite startup failures, nor defines evidence when opening that sink itself fails. Those failures can therefore create an unattended 10-second KeepAlive restart loop with no durable cause. Require bounded, credential-redacted, operator-visible evidence for every pre-listener fatal path, including logger initialization failure, and test those paths under launchd-equivalent output redirection."
  - severity: "medium"
    mechanism: "status and doctor can observe mixed lifecycle generations because they do not participate in lifecycle serialization"
    origin: "unknown"
    where: "AC4 lifecycle-lock contract and AC5 machine-readable status/doctor contract"
    finding: "Only mutating commands are required to take lifecycle.lock. A concurrent install, restart, disable, or uninstall can therefore let status or doctor combine a receipt and config from one generation with a PID, listener, plist, or secret from another while still emitting an authoritative verdict. Require a shared-lock or generation-sandwich protocol with bounded retry and a defined busy/timeout result, then add read-versus-mutation concurrency tests."
  - severity: "medium"
    mechanism: "persistent launchd disabled overrides are outside the transactional ownership and recovery model"
    origin: "unknown"
    where: "AC4 disable, reinstall, transaction, and uninstall semantics"
    finding: "launchctl disable persists state in the GUI domain beyond bootout and plist removal, while the intent and receipt enumerate only filesystem paths and uninstall only specifies bootout plus byte removal. A disable-uninstall-reinstall sequence can therefore leave an otherwise valid installation unable to launch, and recovery cannot distinguish pre-existing operator state from item-owned state. Model the launchd override as external transactional state: verify job identity, record its before-image, define enable/start/reinstall/uninstall restoration semantics, and test crash recovery plus disable-uninstall-reinstall."
---

