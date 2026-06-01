# n=1 Concierge Install — Coworker (Tuesday 2026-06-02)

**Type:** concierge install experiment (first non-founder install; n=0 → n=1).
**Decision doc:** `raw/internal/decisions/2026-06-01-office-hours-n1-concierge-install.md`.
**Discipline:** founder watches, does NOT help unless he's fully stuck. Log every break verbatim. Capture the unprompted reaction.

---

## The three binary facts this session must produce

1. **FORMATION** — does the substrate form on his machine (capture picks up *his* Claude Code + Codex)?
2. **RETRIEVAL ON HIS CORPUS** — does retrieval return signal on a corpus the founder didn't generate?
3. **REACTION** — unprompted "when can I pay?" (caveat: friendly availability sample — weak demand signal).

**Kill condition:** if the substrate won't form without founder hand-staging → next build item is "make it form unattended," NOT a polished alpha, NOT the actionability harness, NOT expansion.

---

## Pre-flight (do BEFORE you show up — front-runs the likely breaks)

- [ ] `node --version` on his machine → **must be ≥ 22.** ___________
- [ ] `which node` → is it Homebrew (`/opt/homebrew/...`), nvm, asdf, or system? ___________
      (nvm/asdf → expect daemon-runtime fragility; consider `brew install node@22` first.)
- [ ] macOS confirmed (launchd-only). ___________
- [ ] `claude` and `codex` CLIs installed **and logged in.** ___________
- [ ] **Work-share gut-check:** what % of his real work is Claude Code + Codex vs flop AI? ___________
      (flop AI-dominant → demo underwhelms for a COVERAGE reason, not retrieval; he may be the wrong n=1.)
- [ ] Repack the tarball fresh on your machine if you touched any `src/` since 2026-06-01:
      `cd ~/Desktop/Project_echo && npm pack` → AirDrop `echoctl-0.1.0.tgz` (the one file).

---

## The install (on HIS machine, you watching) — log what breaks at each step

```
npm install -g ./echoctl-0.1.0.tgz   # global CLI; needs Node ≥22
echoctl daemon install               # plist + start daemon + health wait  (BEFORE init — so init's probe hits a live daemon)
echoctl init                         # interactive; consent moment — see below
echoctl doctor                       # component health table
```

`echoctl init` prompts (this is where you do consent live):
1. `Welcome to ECHO setup…` → Enter.
2. **Detected agents** → `Confirm subset to wire` (default `codex,claude-code`). **← tell him this edits his `~/.claude/CLAUDE.md` + `~/.codex/config.toml` before he hits Enter.**
3. **Detected projects** → `Pick default project` → empty on fresh machine → Enter.
4. wire → probe → daemon ensure → `You're ready.`

| Step | Expected | What broke (verbatim) |
|---|---|---|
| `npm install -g` | `echoctl --version` → 0.1.0 | |
| `daemon install` | "Installed … on port 38478", daemon serves MCP | |
| `init` detect | finds claude-code + codex (`config=yes`) | |
| `init` wire | `codex: ok (append, add)` / `claude-code: ok (append, copied, copied)` | |
| `init` probe | **likely "claude-code: mcp-not-configured" or login wall** | |
| `doctor` | all rows healthy | |

### Known likely fix #1 — Claude Code MCP not registered
If `doctor` shows claude-code unhealthy / probe says `mcp-not-configured`:
```
claude mcp add echo http://127.0.0.1:38478/mcp
echoctl doctor
```
(Codex MCP is wired by `init`; Claude Code's server registration may need this manual step. Confirm whether `init` should do it — candidate follow-up item.)

### Known likely fix #2 — daemon runtime (if daemon won't stay up)
If his Node is nvm/asdf-managed and the daemon dies/won't start: that's the "own the runtime" issue. Workaround: `brew install node@22`, reinstall, `echoctl daemon restart`. → confirms **V1.5 item #1: vendor/own the daemon runtime.**

---

## Verify formation + retrieval (the real signal, ~3 min)

- [ ] `echoctl doctor` → every row healthy. ___________
- [ ] **Formation:** in his Claude Code or Codex, have it call ECHO `find_clusters` → does it return *his* pre-install history? (Tests boot-scan backfill on his real corpus.) ___________
- [ ] **Killer demo:** he does a small task in Claude Code → switches to Codex → asks Codex (via ECHO) to pick up what he just did in Claude Code. Cross-tool context, his machine, his corpus. ___________
- [ ] **Reaction (verbatim, unprompted):** ___________

---

## Post-session

- Fill the decision doc's "remaining real-machine unknowns" with what actually fired.
- If formation failed → file "make it form unattended" item.
- If Claude `mcp add` was needed → file "init registers Claude Code MCP server" follow-up.
- If daemon runtime flaked → file "vendor Node runtime for launchd" (V1.5 #1).
- Do NOT expand scope off this single install.
