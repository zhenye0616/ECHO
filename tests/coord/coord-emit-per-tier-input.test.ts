// 057a AC1 — coord_emit per-tier discriminated input test (AC8 entry).
//
// Covers (per spec line 238):
//   - round-tier emit with correlation_id succeeds
//   - scheduler-tier emit with tick_run_id succeeds
//   - cross-tier rejected

import { describe, expect, it } from 'vitest';
import type { CoordRolesConfig } from '../../src/coord/roles.js';
import { validateCoordEmitInput } from '../../src/coord/validate.js';

const CFG: CoordRolesConfig = Object.freeze({
  roles: Object.freeze([
    Object.freeze({
      name: 'codex',
      headless: true,
      invoke_command: ['codex'] as const,
      events: Object.freeze({
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
  ] as const),
}) as CoordRolesConfig;

const TS = '2026-05-16T08:00:00.000Z';

describe('AC1 — coord_emit per-tier input', () => {
  it('round-tier event with correlation_id succeeds', () => {
    const out = validateCoordEmitInput(
      {
        event_type: 'tick_start',
        schema_version: 1,
        subject_role: 'codex',
        correlation_id: 'round-001',
        emitted_at: TS,
      },
      'codex',
      CFG,
    );
    expect(out.tier).toBe('round');
    if (out.tier === 'round') {
      expect(out.correlation_id).toBe('round-001');
    }
  });

  it('scheduler-tier event with tick_run_id succeeds', () => {
    const out = validateCoordEmitInput(
      {
        event_type: 'scheduler_health',
        schema_version: 1,
        subject_role: 'codex',
        tick_run_id: 'tick-001',
        emitted_at: TS,
      },
      'codex',
      CFG,
    );
    expect(out.tier).toBe('scheduler');
    if (out.tier === 'scheduler') {
      expect(out.tick_run_id).toBe('tick-001');
    }
  });

  it('cross-tier (round event + tick_run_id) rejected', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'tick_start',
          schema_version: 1,
          subject_role: 'codex',
          correlation_id: 'r',
          tick_run_id: 'should-not-be-here',
          emitted_at: TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/must not carry tick_run_id/);
  });

  it('cross-tier (scheduler event + correlation_id) rejected', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'scheduler_health',
          schema_version: 1,
          subject_role: 'codex',
          tick_run_id: 't',
          correlation_id: 'should-not-be-here',
          emitted_at: TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/must not carry correlation_id/);
  });

  it('round-tier missing correlation_id rejected', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'tick_start',
          schema_version: 1,
          subject_role: 'codex',
          emitted_at: TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/requires correlation_id/);
  });

  it('scheduler-tier missing tick_run_id rejected', () => {
    expect(() =>
      validateCoordEmitInput(
        {
          event_type: 'scheduler_health',
          schema_version: 1,
          subject_role: 'codex',
          emitted_at: TS,
        },
        'codex',
        CFG,
      ),
    ).toThrow(/requires tick_run_id/);
  });

  it('optional expected_by + payload pass through', () => {
    const out = validateCoordEmitInput(
      {
        event_type: 'tick_start',
        schema_version: 1,
        subject_role: 'codex',
        correlation_id: 'r',
        emitted_at: TS,
        expected_by: '2026-05-16T08:10:00.000Z',
        payload: { worktree: '/tmp/x', sandbox: 'danger-full-access' },
      },
      'codex',
      CFG,
    );
    if (out.tier === 'round') {
      expect(out.expected_by).toBe('2026-05-16T08:10:00.000Z');
      expect(out.payload).toEqual({ worktree: '/tmp/x', sandbox: 'danger-full-access' });
    }
  });
});
