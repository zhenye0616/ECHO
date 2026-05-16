// 057a AC1 + AC5 — identity-spoof rejection (AC8 entry).
//
// Covers (per spec line 235):
//   - caller-supplied source ignored
//   - X-Echo-Role spoof of unknown role rejected
//   - missing X-Echo-Role rejected
//   - self-attestation event with subject_role != emitter_role rejected
//   - invocation event with subject_role != emitter_role accepted when
//     subject_role is in coord-roles.json

import { describe, expect, it } from 'vitest';
import {
  CoordIdentityError,
  resolveEmitterIdentity,
} from '../../src/coord/identity.js';
import type { CoordRolesConfig } from '../../src/coord/roles.js';
import { deriveCoordSource } from '../../src/coord/source.js';
import { validateCoordEmitInput } from '../../src/coord/validate.js';

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

const TS = '2026-05-16T08:00:00.000Z';

describe('AC1 — identity-spoof rejection', () => {
  it('missing X-Echo-Role header is rejected', () => {
    expect(() => resolveEmitterIdentity(null, CFG)).toThrow(/missing X-Echo-Role header/);
  });

  it('empty X-Echo-Role header is rejected', () => {
    expect(() => resolveEmitterIdentity('', CFG)).toThrow(/missing X-Echo-Role header|empty X-Echo-Role/);
  });

  it('whitespace-only X-Echo-Role header is rejected', () => {
    expect(() => resolveEmitterIdentity('   ', CFG)).toThrow(/empty X-Echo-Role/);
  });

  it('X-Echo-Role naming a role not in roster is rejected', () => {
    expect(() => resolveEmitterIdentity('adversary', CFG)).toThrow(
      /'adversary' is not in coord-roles\.json/,
    );
  });

  it('CoordIdentityError carries name (instanceof distinguishable)', () => {
    try {
      resolveEmitterIdentity(null, CFG);
      throw new Error('should not reach');
    } catch (err) {
      expect((err as Error).name).toBe('CoordIdentityError');
      expect(err).toBeInstanceOf(CoordIdentityError);
    }
  });

  it('valid X-Echo-Role resolves to identity with role string', () => {
    const id = resolveEmitterIdentity('codex', CFG);
    expect(id.role).toBe('codex');
    // X-Echo-Role is trimmed before lookup, so leading/trailing whitespace is OK.
    expect(resolveEmitterIdentity('  codex  ', CFG).role).toBe('codex');
  });

  it('source string is server-derived from identity, never from input', () => {
    const id = resolveEmitterIdentity('codex', CFG);
    expect(deriveCoordSource(id)).toBe('coord:codex');
    // Even if caller passes a spoofed source in input, the validator drops it.
    const out = validateCoordEmitInput(
      {
        event_type: 'tick_start',
        schema_version: 1,
        subject_role: 'codex',
        correlation_id: 'r',
        emitted_at: TS,
        source: 'coord:VICTIM',
      },
      'codex',
      CFG,
    );
    expect((out as unknown as { source?: string }).source).toBeUndefined();
  });

  it('self-attestation: subject_role != emitter_role is rejected', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'tick_start',
          schema_version: 1,
          subject_role: 'codex-ops',
          correlation_id: 'r',
          emitted_at: TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/self-attestation event 'tick_start' requires subject_role == emitter_role/);
  });

  it('invocation: subject_role != emitter_role accepted when subject is in roster', () => {
    // Orchestrator (emitter=codex acting as orchestrator) invokes codex-ops
    // as the reviewer. AC1 r1 codex F1 HIGH: this MUST be accepted.
    const out = validateCoordEmitInput(
      {
        event_type: 'reviewer_invoked',
        schema_version: 1,
        subject_role: 'codex-ops',
        correlation_id: 'r',
        emitted_at: TS,
      },
      'codex',
      CFG,
    );
    expect(out.subject_role).toBe('codex-ops');
  });

  it('invocation: subject_role NOT in roster is still rejected', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'reviewer_invoked',
          schema_version: 1,
          subject_role: 'phantom',
          correlation_id: 'r',
          emitted_at: TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/subject_role 'phantom' is not in coord-roles\.json/);
  });
});
