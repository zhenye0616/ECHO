---
id: 2026-04-30-001-repo-bootstrap
title: Repo bootstrap (TS/Node + Vitest + ESLint + Prettier)
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-04-30
spec_refs: []
blocked_by: []
acceptance:
  - "`npm install` succeeds from a clean clone"
  - "`npm run test` runs Vitest and shows ≥1 passing smoke test"
  - "`npm run lint` runs ESLint and exits 0"
  - "`npm run format:check` runs Prettier in check mode and exits 0"
  - "`npm run typecheck` runs `tsc --noEmit` and exits 0"
  - "TypeScript settings are strict (strict: true, noImplicitAny, noUnusedLocals, noUnusedParameters)"
  - ".gitignore excludes node_modules, dist, .DS_Store, *.log, coverage"
  - "src/ and tests/ directories exist with the smoke test demonstrating the test pipeline"
files_to_modify:
  - package.json
  - package-lock.json
  - tsconfig.json
  - vitest.config.ts
  - eslint.config.js
  - .prettierrc.json
  - .gitignore
  - src/index.ts
  - tests/smoke.test.ts

claimed_by: "MacBook-Pro.local-zhenye"
claimed_at: "2026-04-30T08:59:20Z"
branch: "agent/repo-bootstrap"
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Repo bootstrap (TS/Node + Vitest + ESLint + Prettier)

## What

Initialize the TypeScript Node.js project that the entire ECHO daemon will be built in. This item creates the build/test/lint/format toolchain and a minimal source + test layout. No business logic ships in this item — only the scaffolding that lets the next four foundation items (logger, allowlist, gate, storage interface) be built independently and in parallel.

Concretely:

- **TypeScript** in strict mode (`strict: true`, `noImplicitAny: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, target `ES2022`, module `NodeNext`, `moduleResolution: NodeNext`, `esModuleInterop: true`)
- **Vitest** as the test runner. Tests live in `tests/` mirroring the structure of `src/`. Test files end in `.test.ts`.
- **ESLint** with TypeScript support (modern flat config in `eslint.config.js`). Recommended TS rules + Prettier compatibility (no rules that fight Prettier).
- **Prettier** with sensible defaults (single quotes, semicolons on, 2-space indent, trailing commas where valid).
- **package.json scripts:** `test`, `lint`, `format`, `format:check`, `typecheck`. No `build` script needed yet (no compilation target).
- **src/index.ts** as a placeholder entry point (just `export {};` is fine — later items add real exports).
- **tests/smoke.test.ts** asserts something trivially true (e.g., `expect(1 + 1).toBe(2)`) to prove the pipeline runs end-to-end.

## Why

The substrate work for V1 weeks 1–3 cannot start until the project compiles, runs tests, and has linting/formatting in place. The four follow-up foundation items (002 logger, 003 allowlist, 005 storage interface in parallel; 004 gate after) all assume this scaffold exists.

The stack choice is **TS/Node primary, Swift shim deferred to a later item.** Rationale (founder decision after considering Rust, Go, Swift-everything, pure-TS-no-shim alternatives): velocity bet for a 10-week wedge-validation V1; founder fluency from the shipped Chrome extension; first-party MCP SDK; type-sharing potential with the extension. Costs being accepted: long-lived daemon discipline (memory leak vigilance), distribution requires bundling Node, Swift shim added when the Accessibility/hotkey work begins.

Strict TS settings catch a class of bugs cheaply and are dramatically cheaper to set on day one than to retrofit. Same logic for ESLint + Prettier.

## Acceptance Criteria

- [ ] `npm install` from a clean clone produces a working `node_modules/`
- [ ] `npm run test` invokes Vitest and reports ≥1 passing test
- [ ] `npm run lint` invokes ESLint and exits 0 (no errors, no warnings — set `--max-warnings 0`)
- [ ] `npm run format:check` invokes Prettier in check mode and exits 0
- [ ] `npm run format` invokes Prettier in write mode (separate script — used for fixing)
- [ ] `npm run typecheck` invokes `tsc --noEmit` and exits 0
- [ ] tsconfig has `strict: true`, `noImplicitAny: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- [ ] `.gitignore` excludes `node_modules/`, `dist/`, `.DS_Store`, `*.log`, `coverage/`
- [ ] `src/index.ts` exists (content can be just `export {};`)
- [ ] `tests/smoke.test.ts` exists and contains the single passing test that proves the pipeline works
- [ ] No README.md, no LICENSE, no CHANGELOG (per CLAUDE.md guidelines — cosmetic, defer)

## Out of Scope (Don't Drift)

- **CI / GitHub Actions / any cloud automation** — solo dev for now; local tests are the bar
- **Husky / lint-staged / pre-commit hooks** — defer; manual discipline is fine for V1
- **Docker, packaging, distribution scripts** — V1.5+
- **README, LICENSE, CHANGELOG** — cosmetic; the wiki is the canonical narrative
- **Any actual business logic** — no logger, no capture, no storage; those are separate items
- **Babel / Webpack / Rollup / esbuild as a bundler** — Vitest handles test transformations; we don't need a separate bundler yet
- **Bun, Deno, tsx, ts-node, or alternative runtimes** — Node + tsc is the path
- **Defining shared types like CaptureEvent or Source** — those belong to the items that own them (003 owns Source, 005 owns CaptureEvent)
- **A `dist/` build, declaration files, or any publish-shaped artifact** — we're a daemon, not a library
- **Adding any dependencies beyond: typescript, vitest, eslint, @typescript-eslint/*, prettier, eslint-config-prettier** — anything else needs an explicit spec change

## After Completion (Strategist Notes)

Once this item lands in `backlog/complete/`, the strategist's next task is to:

1. Create `echo-wiki/sources/stack-decision.md` documenting:
   - Decision: TS/Node + Swift shim (Swift shim deferred)
   - Alternatives considered (Rust, Go, Swift-everything, pure-TS)
   - Rationale: velocity bet, founder fluency, first-party MCP SDK
   - Costs accepted: long-lived daemon discipline, Node bundling for distribution
2. Update `echo-wiki/index.md` and `echo-wiki/.manifest.json` to register the new sources page
3. Once items 002, 003, 005 also complete, move them out of `ready/` into `complete/`-flow and unblock 004
