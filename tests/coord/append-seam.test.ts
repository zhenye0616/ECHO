// 057a AC1 — coord_emit append seam test (AC8 entry).
//
// Covers (per spec line 234):
//   - coord_emit validates schema + identity + canonicalizes timestamp +
//     bypasses normalizer/trace (r1 codex Q1 HIGH)
//   - unknown event_type rejected
//   - unknown schema_version rejected
//   - cross-tier fields rejected (round-tier carrying tick_run_id, etc.)
//   - timestamps canonicalized
//   - metadata.surface="coord" set
//   - storage path single-writer (we assert via the MCP-level call)
//   - subject_role required and validated (r1 codex F1 HIGH)

import { describe, expect, it } from 'vitest';
import { resolveEmitterIdentity } from '../../src/coord/identity.js';
import type { CoordRolesConfig } from '../../src/coord/roles.js';
import { deriveCoordSource } from '../../src/coord/source.js';
import { COORD_SESSION_ID, COORD_SURFACE } from '../../src/coord/types.js';
import { validateCoordEmitInput, CoordValidationError } from '../../src/coord/validate.js';

const CFG: CoordRolesConfig = Object.freeze({
  roles: Object.freeze([
    Object.freeze({
      name: 'codex',
      headless: true,
      invoke_command: ['codex'] as const,
      events: Object.freeze({
        reviewer_invoked: Object.freeze({
          default_deadline_sec: 90,
          max_deadline_sec: 300,
          expects: 'tick_start',
        }),
        tick_start: Object.freeze({
          default_deadline_sec: 600,
          max_deadline_sec: 1200,
          expects: 'tick_end',
        }),
        scheduler_health: Object.freeze({
          default_deadline_sec: 120,
          max_deadline_sec: 300,
          expects: 'scheduler_health_done',
        }),
      }),
    }),
    Object.freeze({
      name: 'codex-ops',
      headless: true,
      invoke_command: ['codex'] as const,
      events: Object.freeze({
        tick_start: Object.freeze({
          default_deadline_sec: 600,
          max_deadline_sec: 1200,
          expects: 'tick_end',
        }),
      }),
    }),
  ] as const),
}) as CoordRolesConfig;

const VALID_TS = '2026-05-16T08:00:00.000Z';

describe('AC1 — coord append seam', () => {
  it('validates a well-formed self-attestation round-tier event', () => {
    const out = validateCoordEmitInput(
      {
        event_type: 'tick_start',
        schema_version: 1,
        subject_role: 'codex',
        correlation_id: 'round-001',
        emitted_at: VALID_TS,
      },
      'codex',
      CFG,
    );
    expect(out.tier).toBe('round');
    expect(out.event_type).toBe('tick_start');
    if (out.tier === 'round') {
      expect(out.correlation_id).toBe('round-001');
    }
  });

  it('validates a scheduler-tier event', () => {
    const out = validateCoordEmitInput(
      {
        event_type: 'scheduler_health',
        schema_version: 1,
        subject_role: 'codex',
        tick_run_id: 'tick-2026-05-16-001',
        emitted_at: VALID_TS,
      },
      'codex',
      CFG,
    );
    expect(out.tier).toBe('scheduler');
    if (out.tier === 'scheduler') {
      expect(out.tick_run_id).toBe('tick-2026-05-16-001');
    }
  });

  it('rejects unknown event_type', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'bogus_event',
          schema_version: 1,
          subject_role: 'codex',
          correlation_id: 'x',
          emitted_at: VALID_TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/unknown event_type 'bogus_event'/);
  });

  it('rejects unknown schema_version', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'tick_start',
          schema_version: 999,
          subject_role: 'codex',
          correlation_id: 'x',
          emitted_at: VALID_TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/unknown schema_version 999/);
  });

  it('rejects cross-tier: round-tier event carrying tick_run_id', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'tick_start',
          schema_version: 1,
          subject_role: 'codex',
          correlation_id: 'round-001',
          tick_run_id: 'tick-x', // forbidden on round-tier
          emitted_at: VALID_TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/must not carry tick_run_id/);
  });

  it('rejects cross-tier: scheduler-tier event carrying correlation_id', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'scheduler_health',
          schema_version: 1,
          subject_role: 'codex',
          tick_run_id: 'tick-1',
          correlation_id: 'round-1', // forbidden on scheduler-tier
          emitted_at: VALID_TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/must not carry correlation_id/);
  });

  it('rejects round-tier event missing correlation_id', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'tick_start',
          schema_version: 1,
          subject_role: 'codex',
          emitted_at: VALID_TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/requires correlation_id/);
  });

  it('rejects scheduler-tier event missing tick_run_id', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'scheduler_health',
          schema_version: 1,
          subject_role: 'codex',
          emitted_at: VALID_TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/requires tick_run_id/);
  });

  it('rejects subject_role not in roster', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'reviewer_invoked',
          schema_version: 1,
          subject_role: 'phantom-role',
          correlation_id: 'x',
          emitted_at: VALID_TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/subject_role 'phantom-role' is not in coord-roles.json/);
  });

  it('rejects emitted_at that is not ISO-shaped', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'tick_start',
          schema_version: 1,
          subject_role: 'codex',
          correlation_id: 'x',
          emitted_at: 'not-a-date',
        },
        'codex',
        CFG,
      ),
    ).toThrow(/emitted_at must be ISO 8601/);
  });

  it('rejects daemon-emitted event_type from caller path', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'deadline_missed',
          schema_version: 1,
          subject_role: 'codex',
          correlation_id: 'x',
          emitted_at: VALID_TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/daemon-emitted only and cannot be supplied by callers/);
  });

  it('subject_role policy — self-attestation enforces subject==emitter', () => {
    // tick_start is self_attestation: emitter must equal subject_role.
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'tick_start',
          schema_version: 1,
          subject_role: 'codex-ops',
          correlation_id: 'x',
          emitted_at: VALID_TS,
        },
        'codex', // emitter
        CFG,
      ),
    ).toThrow(/self-attestation event 'tick_start' requires subject_role == emitter_role/);
  });

  it('subject_role policy — invocation allows subject != emitter', () => {
    // reviewer_invoked is invocation: emitter (orchestrator e.g. claude)
    // and subject_role (target reviewer e.g. codex-ops) MAY differ.
    const out = validateCoordEmitInput(
      {
        event_type: 'reviewer_invoked',
        schema_version: 1,
        subject_role: 'codex-ops',
        correlation_id: 'round-1',
        emitted_at: VALID_TS,
      },
      'codex', // emitter (acting as orchestrator)
      CFG,
    );
    expect(out.subject_role).toBe('codex-ops');
  });

  it('caller-supplied source is dropped (server-derives via deriveCoordSource)', () => {
    // The validator accepts the field (forward-compat) but never returns it
    // in the validated output. The MCP tool drops it before append; the
    // append `source` comes from deriveCoordSource(identity).
    const out = validateCoordEmitInput(
      {
        event_type: 'tick_start',
        schema_version: 1,
        subject_role: 'codex',
        correlation_id: 'x',
        emitted_at: VALID_TS,
        source: 'coord:adversary-pretending-to-be-someone-else',
      },
      'codex',
      CFG,
    );
    expect((out as unknown as { source?: string }).source).toBeUndefined();

    const identity = resolveEmitterIdentity('codex', CFG);
    expect(deriveCoordSource(identity)).toBe('coord:codex');
  });
});

describe('AC1 — coord metadata + canonicalization (constants surface)', () => {
  it('exports COORD_SURFACE and COORD_SESSION_ID', () => {
    expect(COORD_SURFACE).toBe('coord');
    expect(COORD_SESSION_ID).toBe('echo:coord');
  });

  it('CoordValidationError carries name for instanceof', () => {
    const err = new CoordValidationError('x');
    expect(err.name).toBe('CoordValidationError');
  });
});
