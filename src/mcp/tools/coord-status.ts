// 057a AC6 — coord_status MCP read tool.
//
// Read-only operator surface. Returns:
//   - Open deadlines (per tier) — from DeadlineTracker.currentSnapshot()
//   - Recent missed deadlines (last N within max(role.max_deadline_sec)
//     horizon ≥24h, V1 bound 200)
//   - Per-role-per-event-type last miss — slot universe from
//     coord-roles.json `role.events.<event_type>.expects` ONLY (NOT from
//     src/coord/types.ts registry, per r5 codex F1 MED single-source-of-
//     truth); on-demand atom-log scan; durable across daemon restart
//   - Per-role last-tick (last_tick_start, last_tick_end,
//     last_tick_duration_sec, last_scheduler_health,
//     last_scheduler_health_done)
//   - Daemon uptime + last reconstruction timestamp
//
// V1 perf budget (AC8 line 247): with ~100k coord atoms in the ledger,
// one coord_status() call should complete in <300ms. The single-pass
// scan via iterateCoordAtomsByAppendOrder makes the cost O(coord-atom-
// count) per call.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DeadlineTracker, OpenRecord } from '../../coord/deadlines.js';
import type { CoordRolesConfig } from '../../coord/roles.js';
import type { Storage } from '../../storage/interface.js';

export interface CoordStatusOpenDeadline {
  tier: 'round' | 'scheduler';
  subject_role: string;
  event_type: string;
  /** correlation_id for round-tier; tick_run_id for scheduler-tier. */
  key: string;
  expected_by: string;
  age_sec: number;
}

export interface CoordStatusRecentMiss {
  subject_role: string;
  opened_event_type: string;
  expected_event_type: string;
  /** correlation_id for round-tier; tick_run_id for scheduler-tier. */
  key: string;
  missed_at: string;
}

export interface CoordStatusLastMissSlot {
  subject_role: string;
  /** The event_type that should have closed the deadline. */
  expected_event_type: string;
  last_missed_at: string;
  /** The event_type that opened the deadline. */
  opened_event_type: string;
  /** correlation_id for round-tier; tick_run_id for scheduler-tier. */
  key: string;
  age_sec: number;
}

export interface CoordStatusPerRoleLastTick {
  role: string;
  last_tick_start: string | null;
  last_tick_end: string | null;
  /** Duration of the most recent COMPLETE tick (last_tick_end -
   *  matching_tick_start). Null when no completed tick on record. */
  last_tick_duration_sec: number | null;
  last_scheduler_health: string | null;
  last_scheduler_health_done: string | null;
}

export interface CoordStatusResult {
  schema_version: 1;
  tool: 'coord_status';
  generated_at: string;
  open_deadlines: CoordStatusOpenDeadline[];
  /** Last `recent_missed_limit` (V1 = 200) missed deadlines within the
   *  horizon = max(role.max_deadline_sec) clamped to ≥24h. */
  recent_missed: CoordStatusRecentMiss[];
  /** Per-(role, expected_event_type) slot universe (from
   *  coord-roles.json), filtered to slots where the most recent miss
   *  has NOT been cleared by a successful close since. */
  last_miss_per_role_per_event_type: CoordStatusLastMissSlot[];
  per_role_last_tick: CoordStatusPerRoleLastTick[];
  daemon_uptime_sec: number;
  last_reconstruction_watermark: number;
}

const COORD_STATUS_DESCRIPTION =
  "Operator status for the coord substrate. Returns open deadlines (per tier), recent missed deadlines (last 200 within max(role.max_deadline_sec) horizon ≥24h), per-(role, expected_event_type) last-miss slots that haven't been cleared by a successful close, per-role last-tick aggregation, daemon uptime, and last full-replay watermark. Read-only — no mutate operations exposed via observability tools. Cost: one full scan over coord atoms (O(coord-atom-count)) per call; V1 perf budget <300ms at 100k atoms.";

const coordStatusOutputSchema = {
  schema_version: z.literal(1),
  tool: z.literal('coord_status'),
  generated_at: z.string(),
  open_deadlines: z.array(z.record(z.string(), z.unknown())),
  recent_missed: z.array(z.record(z.string(), z.unknown())),
  last_miss_per_role_per_event_type: z.array(z.record(z.string(), z.unknown())),
  per_role_last_tick: z.array(z.record(z.string(), z.unknown())),
  daemon_uptime_sec: z.number(),
  last_reconstruction_watermark: z.number(),
};

export interface CoordStatusDependencies {
  storage: Storage;
  coordRoles: CoordRolesConfig;
  deadlines: DeadlineTracker;
  /** Server-start timestamp; daemon_uptime_sec is `(now - serverStartedAt) / 1000`. */
  serverStartedAt: Date;
  /** Test-only clock override. */
  now?: () => Date;
}

const RECENT_MISSED_LIMIT = 200;
const HORIZON_FLOOR_SEC = 24 * 60 * 60;

interface SlotKey {
  subject_role: string;
  expected_event_type: string;
}

function buildSlotUniverse(config: CoordRolesConfig): SlotKey[] {
  const slots: SlotKey[] = [];
  for (const role of config.roles) {
    for (const [, ev] of Object.entries(role.events)) {
      if (ev.expects.length > 0) {
        slots.push({ subject_role: role.name, expected_event_type: ev.expects });
      }
    }
  }
  // Dedupe — same (role, expects) pair may appear under multiple event_types.
  const seen = new Set<string>();
  const out: SlotKey[] = [];
  for (const s of slots) {
    const k = `${s.subject_role}|${s.expected_event_type}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function maxHorizonSec(config: CoordRolesConfig): number {
  let max = 0;
  for (const role of config.roles) {
    for (const [, ev] of Object.entries(role.events)) {
      if (ev.max_deadline_sec > max) max = ev.max_deadline_sec;
    }
  }
  return Math.max(max, HORIZON_FLOOR_SEC);
}

export async function buildCoordStatus(
  deps: CoordStatusDependencies,
): Promise<CoordStatusResult> {
  const now = deps.now ?? (() => new Date());
  const nowDate = now();
  const nowMs = nowDate.getTime();
  const generatedAt = nowDate.toISOString();

  const snap = await deps.deadlines.currentSnapshot();

  const openDeadlines: CoordStatusOpenDeadline[] = [...snap.round, ...snap.scheduler].map(
    (r: OpenRecord) => ({
      tier: r.tier,
      subject_role: r.subject_role,
      event_type: r.event_type,
      key: r.key,
      expected_by: r.expected_by,
      age_sec: Math.max(0, Math.round((nowMs - new Date(r.expected_by).getTime()) / 1000)),
    }),
  );

  // Single full-scan pass through coord atoms in append order. Builds:
  //   - recent_missed list (within horizon, newest 200)
  //   - per-slot last_miss
  //   - per-slot last_close (highest-seq successful event matching the
  //     slot's expected_event_type for that subject_role; excludes
  //     deadline_missed itself)
  //   - per-role last-tick fields
  const horizonSec = maxHorizonSec(deps.coordRoles);
  const horizonMs = horizonSec * 1000;
  const horizonCutoff = nowMs - horizonMs;

  interface AtomSummary {
    sequence_id: number;
    timestamp: string;
    event_type: string;
    subject_role: string;
    coord: Record<string, unknown>;
  }

  const lastMiss = new Map<string, AtomSummary>();
  const lastClose = new Map<string, AtomSummary>();
  const perRoleLastTickStart = new Map<string, { ts: string; correlation_id: string }>();
  const perRoleLastTickEnd = new Map<string, { ts: string; correlation_id: string }>();
  const perRoleLastSchedHealth = new Map<string, string>();
  const perRoleLastSchedHealthDone = new Map<string, string>();
  // Track tick_start by correlation so we can compute completed-tick duration.
  const perRoleCompletedTicks = new Map<string, { startTs: string; endTs: string }>();

  const recentMissedAll: AtomSummary[] = [];

  const PAGE = 5000;
  let pageSeq = 1;
  while (true) {
    const page = await deps.storage.iterateCoordAtomsByAppendOrder({
      sinceSeq: pageSeq,
      limit: PAGE,
    });
    if (page.length === 0) break;
    for (const atom of page) {
      const md = atom.metadata as { coord?: Record<string, unknown> } | undefined;
      const coord = md?.coord;
      if (coord === undefined || coord === null || typeof coord !== 'object') continue;
      const event_type = (coord as { event_type?: unknown }).event_type;
      const subject_role = (coord as { subject_role?: unknown }).subject_role;
      if (typeof event_type !== 'string' || typeof subject_role !== 'string') continue;

      const summary: AtomSummary = {
        sequence_id: atom.sequence_id,
        timestamp: atom.timestamp,
        event_type,
        subject_role,
        coord: coord as Record<string, unknown>,
      };

      if (event_type === 'deadline_missed') {
        const expected_event_type = (coord as { expected_event_type?: unknown }).expected_event_type;
        if (typeof expected_event_type === 'string') {
          const slotKey = `${subject_role}|${expected_event_type}`;
          const existing = lastMiss.get(slotKey);
          if (existing === undefined || existing.sequence_id < summary.sequence_id) {
            lastMiss.set(slotKey, summary);
          }
        }
        // recent_missed list is bounded by horizon at insertion time;
        // we trim to top-200 by sequence_id (most recent) after the scan.
        const atomMs = new Date(atom.timestamp).getTime();
        if (atomMs >= horizonCutoff) {
          recentMissedAll.push(summary);
        }
      } else {
        // Successful events (non-daemon-emitted) are eligible to clear a slot.
        const slotKey = `${subject_role}|${event_type}`;
        const existing = lastClose.get(slotKey);
        if (existing === undefined || existing.sequence_id < summary.sequence_id) {
          lastClose.set(slotKey, summary);
        }
        // Per-role last-tick / scheduler-health bookkeeping.
        if (event_type === 'tick_start') {
          perRoleLastTickStart.set(subject_role, {
            ts: atom.timestamp,
            correlation_id: String((coord as { correlation_id?: unknown }).correlation_id ?? ''),
          });
        } else if (event_type === 'tick_end') {
          perRoleLastTickEnd.set(subject_role, {
            ts: atom.timestamp,
            correlation_id: String((coord as { correlation_id?: unknown }).correlation_id ?? ''),
          });
          // If a tick_start preceded it for the same correlation, capture a completed duration.
          const lastStart = perRoleLastTickStart.get(subject_role);
          if (lastStart !== undefined) {
            perRoleCompletedTicks.set(subject_role, {
              startTs: lastStart.ts,
              endTs: atom.timestamp,
            });
          }
        } else if (event_type === 'scheduler_health') {
          perRoleLastSchedHealth.set(subject_role, atom.timestamp);
        } else if (event_type === 'scheduler_health_done') {
          perRoleLastSchedHealthDone.set(subject_role, atom.timestamp);
        }
      }
    }
    const lastSeq = page[page.length - 1]!.sequence_id;
    pageSeq = lastSeq + 1;
    if (page.length < PAGE) break;
  }

  // Build last_miss_per_role_per_event_type: for each slot in the
  // universe, include only if last_miss exists AND (last_close is null
  // OR last_close.sequence_id < last_miss.sequence_id) — i.e. the miss
  // hasn't been cleared by a successful close since.
  const slotUniverse = buildSlotUniverse(deps.coordRoles);
  const lastMissSlots: CoordStatusLastMissSlot[] = [];
  for (const slot of slotUniverse) {
    const slotKey = `${slot.subject_role}|${slot.expected_event_type}`;
    const miss = lastMiss.get(slotKey);
    if (miss === undefined) continue;
    const close = lastClose.get(slotKey);
    if (close !== undefined && close.sequence_id >= miss.sequence_id) continue;
    const opened_event_type = String(
      (miss.coord as { opened_event_type?: unknown }).opened_event_type ?? '',
    );
    const correlation_id = (miss.coord as { correlation_id?: unknown }).correlation_id;
    const tick_run_id = (miss.coord as { tick_run_id?: unknown }).tick_run_id;
    const key = typeof correlation_id === 'string' ? correlation_id : typeof tick_run_id === 'string' ? tick_run_id : '';
    lastMissSlots.push({
      subject_role: slot.subject_role,
      expected_event_type: slot.expected_event_type,
      last_missed_at: miss.timestamp,
      opened_event_type,
      key,
      age_sec: Math.max(0, Math.round((nowMs - new Date(miss.timestamp).getTime()) / 1000)),
    });
  }

  // recent_missed: trim to top-200 by descending sequence_id.
  recentMissedAll.sort((a, b) => b.sequence_id - a.sequence_id);
  const recentMissed: CoordStatusRecentMiss[] = recentMissedAll.slice(0, RECENT_MISSED_LIMIT).map(
    (m) => {
      const correlation_id = (m.coord as { correlation_id?: unknown }).correlation_id;
      const tick_run_id = (m.coord as { tick_run_id?: unknown }).tick_run_id;
      return {
        subject_role: m.subject_role,
        opened_event_type: String((m.coord as { opened_event_type?: unknown }).opened_event_type ?? ''),
        expected_event_type: String(
          (m.coord as { expected_event_type?: unknown }).expected_event_type ?? '',
        ),
        key: typeof correlation_id === 'string' ? correlation_id : typeof tick_run_id === 'string' ? tick_run_id : '',
        missed_at: m.timestamp,
      };
    },
  );

  // per_role_last_tick: one row per configured role.
  const perRoleLastTick: CoordStatusPerRoleLastTick[] = deps.coordRoles.roles.map((role) => {
    const startEntry = perRoleLastTickStart.get(role.name);
    const endEntry = perRoleLastTickEnd.get(role.name);
    const completed = perRoleCompletedTicks.get(role.name);
    let duration_sec: number | null = null;
    if (completed !== undefined) {
      duration_sec = Math.max(
        0,
        Math.round(
          (new Date(completed.endTs).getTime() - new Date(completed.startTs).getTime()) / 1000,
        ),
      );
    }
    return {
      role: role.name,
      last_tick_start: startEntry?.ts ?? null,
      last_tick_end: endEntry?.ts ?? null,
      last_tick_duration_sec: duration_sec,
      last_scheduler_health: perRoleLastSchedHealth.get(role.name) ?? null,
      last_scheduler_health_done: perRoleLastSchedHealthDone.get(role.name) ?? null,
    };
  });

  const daemon_uptime_sec = Math.max(0, Math.round((nowMs - deps.serverStartedAt.getTime()) / 1000));

  return {
    schema_version: 1,
    tool: 'coord_status',
    generated_at: generatedAt,
    open_deadlines: openDeadlines,
    recent_missed: recentMissed,
    last_miss_per_role_per_event_type: lastMissSlots,
    per_role_last_tick: perRoleLastTick,
    daemon_uptime_sec,
    last_reconstruction_watermark: snap.last_replay_watermark,
  };
}

export function registerCoordStatus(server: McpServer, deps: CoordStatusDependencies): void {
  server.registerTool(
    'coord_status',
    {
      description: COORD_STATUS_DESCRIPTION,
      inputSchema: {},
      outputSchema: coordStatusOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const result = await buildCoordStatus(deps);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text', text: (err as Error).message }],
        };
      }
    },
  );
}
