---
id: 2026-04-30-001-storage-architecture
title: Storage architecture (append-only ledger)
status: ready
priority: HIGH
estimate: 2d
created: 2026-04-30
spec_refs:
  - echo-wiki/entities/local-daemon.md
  - echo-wiki/sources/v1-spec.md
  - echo-wiki/concepts/drift-prevention.md
acceptance:
  - SQLite-based append-only event ledger
  - Schema supports source-attributed entries (source, timestamp, content_text, content_hash)
  - Embedding column (vector representation for semantic search) — store as bytes; embedding model choice deferred
  - Indexes on source, timestamp, content_hash
  - Insert / query / restart-durability test suite passes
  - Migration system for future schema changes
files_to_modify:
  - src/daemon/storage/schema.sql
  - src/daemon/storage/mod.rs (or equivalent in chosen language)
  - tests/storage/*
agent_notes: ""
review_notes: ""
---

# Storage Architecture (Append-Only Ledger)

## What

Build the local-first append-only event ledger that's the substrate for all of Layer 1 (passive ingestion). Every piece of context ECHO ingests gets appended here with source attribution.

## Why

The substrate is wedge-independent — it must work for any future cohort or integration choice. Get it right once; never rebuild. See [[local-daemon]] §"Why Local-First" and [[v1-spec]] §"Sequencing Weeks 1–3."

## Acceptance Criteria

- [ ] SQLite-based append-only ledger (no in-place updates; only inserts)
- [ ] Schema:
  - `id` (UUID, primary key)
  - `source` (string: cursor, claude_code, github, slack, browser_extension, etc.)
  - `source_id` (string: external identifier from source system)
  - `timestamp` (UTC, indexed)
  - `content_text` (string, full text)
  - `content_hash` (sha256, indexed for dedup)
  - `embedding` (bytes, nullable for now)
  - `metadata` (JSON, source-specific fields)
- [ ] Indexes on (source, timestamp), content_hash
- [ ] Insert API: idempotent on content_hash collision (no duplicates)
- [ ] Query API: by source + time range, by content_hash
- [ ] Restart durability: data survives process restart (no data loss)
- [ ] Test suite covers insert, dedup, query, restart, concurrent inserts

## Constraints

- Local-first only (no cloud sync in V1; per [[local-daemon]])
- Append-only (no in-place mutation; per [[/Users/zhenye/Desktop/AIE/claude-wiki/concepts/append-only-ledger.md|the AIE wiki pattern]])
- Embedding model choice is NOT this item's job — leave column nullable, let a separate item handle embedding generation

## Out of Scope (Don't Drift)

- ❌ Embedding generation (separate backlog item)
- ❌ Retrieval / search logic (separate backlog item — composition engine)
- ❌ Connector adapters (separate backlog items per source)
- ❌ Encryption (V2 — note this in decisions/)
- ❌ Sync to cloud (never, per [[local-daemon]])
- ❌ Multi-user support (V2+)

## Definition of Done

Acceptance criteria all green. Founder can run `cargo test --package storage` (or equivalent) and see all tests pass. Founder can manually insert a row, restart the daemon, query the row, and see it returned.
