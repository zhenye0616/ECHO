// Holdout confirmation tests — RC6: render trusts extracted text and machine time.
// Blind-holdout suite for item 131 (backlog/proposed/2026-07-10-131-post-meeting-brief-generator-v0.md).
// Each test asserts the CORRECT behavior per AC6, so it FAILS against today's prototype
// logic (confirming the finding) and passes once the fix lands.
//
// The render under test lives only in raw/internal/prototypes/brief-now-prototype.mjs
// (steps 4–6); there is no importable unit. Per the holdout rules, the specific decision
// logic is reimplemented below as a faithful PROTOTYPE-LOGIC-COPY and tested directly.

import { describe, expect, it } from 'vitest';

type SignalFixture = {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
};

type NoteMetaFixture = {
  title?: unknown;
  created_at?: unknown;
  owner?: { name?: string; email?: string };
  attendees?: Array<{ name?: string; email?: string }>;
  web_url?: string | null;
};

// ---------------------------------------------------------------------------
// PROTOTYPE-LOGIC-COPY: faithful inline copy of brief-now-prototype.mjs steps
// 4–6 (signal-row dedupe → brief compile → markdown render). Only mechanical
// changes: fixture inputs instead of storage.query(), and generated_at is an
// injected now() instead of new Date() (determinism; not part of any finding).
// Do NOT "fix" this copy — item 131's builder fixes the real module, and these
// tests are then repointed at the shipped render unit.
// ---------------------------------------------------------------------------
function compileAndRenderBrief(
  md5: NoteMetaFixture,
  signals: SignalFixture[],
  noteId: string,
  generatedAtIso: string,
): { brief: Record<string, unknown>; md: string } {
  // step 4: dedupe by dedupe_key across all provided signal rows
  const seen = new Set<unknown>();
  const rows: Array<{ type?: unknown; text: string; subject: unknown }> = [];
  for (const s of signals) {
    const k = s.metadata?.dedupe_key ?? s.id;
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push({
      type: s.metadata?.signal_type,
      text: s.content.trim(),
      subject: s.metadata?.canonical_subject ?? null,
    });
  }

  // step 5: compile canonical brief object (prototype lines 55–71)
  const owner = md5.owner?.name ?? md5.owner?.email ?? 'unknown';
  const brief = {
    schema_version: 1,
    kind: 'post_meeting_brief',
    generated_at: generatedAtIso,
    meeting: {
      title: md5.title,
      date: md5.created_at,
      attendees: (md5.attendees ?? []).map((a) => a.name ?? a.email),
      source: { provider: 'granola', note_id: noteId, url: md5.web_url ?? null },
    },
    decided: rows
      .filter((r) => r.type === 'decision')
      .map((r, i) => ({ id: `D${i + 1}`, text: r.text, subject: r.subject })),
    actions: rows
      .filter((r) => r.type === 'action')
      .map((r, i) => ({ id: `A${i + 1}`, text: r.text, owner, due: null })),
    context: rows.filter((r) => r.type === 'rationale').map((r) => r.text),
    carryover: [],
    provenance: { extraction: 'granola-signals@1', triage: 'concierge' },
  };

  // step 6: markdown render (prototype lines 74–85)
  const d = new Date(brief.meeting.date as string);
  const md = [
    `**Recap — ${brief.meeting.title}** (${d.toISOString().slice(0, 10)})`,
    '',
    '**Decided:**',
    ...brief.decided.map((x) => `- ${x.text}`),
    '',
    `**Actions (${owner}):**`,
    ...brief.actions.map((x, i) => `${i + 1}. ${x.text}`),
    '',
    `_source: ${brief.meeting.source.url ?? brief.meeting.source.note_id}_`,
  ].join('\n');

  return { brief, md };
}

const NOTE_ID = 'note-rc6-fixture';
const GENERATED_AT = '2026-07-09T20:00:00.000Z'; // injected now()

const baseMeta: NoteMetaFixture = {
  title: 'Advisor sync',
  created_at: '2026-07-09T18:00:00Z',
  owner: { name: 'Zhen Ye', email: 'zhen@example.com' },
  attendees: [{ name: 'Zhen Ye' }, { name: 'Alice Ortiz' }, { name: 'Bob Chen' }],
  web_url: null,
};

describe('holdout-131 RC6 — render integrity (131 AC6)', () => {
  // CONFIRMS: Markdown/@channel injection — signal text and title interpolated raw
  // into chat-bound markdown (stress-test §Content) → 131 AC6
  it('sanitizes note-derived text at render: code fences neutralized, @channel zero-width-broken', () => {
    const meta = { ...baseMeta, title: 'Advisor sync cc @here' };
    const signals: SignalFixture[] = [
      {
        id: 's1',
        content:
          'Ship the `deploy.sh` change:\n```\nrm -rf build && make\n```\nthen notify @channel immediately',
        metadata: { signal_type: 'decision', dedupe_key: 'k1', note_id: NOTE_ID },
      },
    ];

    const { md } = compileAndRenderBrief(meta, signals, NOTE_ID, GENERATED_AT);

    // AC6: backticks/code fences neutralized — no live fence or inline-code
    // backtick from note content may survive into the chat-bound markdown.
    expect(md).not.toContain('```');
    expect(md).not.toContain('`deploy.sh`');
    // AC6: mass-mention tokens zero-width-broken — the contiguous strings
    // "@channel" / "@here" must not appear anywhere in the render.
    expect(md).not.toContain('@channel');
    expect(md).not.toContain('@here');
  });

  // CONFIRMS: UTC-day date render — any meeting after 5pm PDT gets tomorrow's date
  // (stress-test §Delivery) → 131 AC6
  it('renders the meeting date in the local timezone, not the UTC day-slice', () => {
    // 2026-07-10T01:30:00Z is 2026-07-09 18:30 PDT — an evening meeting that
    // crosses the UTC day boundary. ISO slice says 2026-07-10; local says 2026-07-09.
    const meta = { ...baseMeta, created_at: '2026-07-10T01:30:00Z' };
    const signals: SignalFixture[] = [
      {
        id: 's1',
        content: 'Adopt the pilot scope as discussed',
        metadata: { signal_type: 'decision', dedupe_key: 'k1', note_id: NOTE_ID },
      },
    ];

    const { md } = compileAndRenderBrief(meta, signals, NOTE_ID, GENERATED_AT);

    // Expected value computed with an EXPLICIT timeZone (founder machine local
    // zone, America/Los_Angeles) — never the test process env — so the
    // assertion is deterministic. en-CA gives YYYY-MM-DD.
    const expectedLocalDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date('2026-07-10T01:30:00Z'));
    expect(expectedLocalDate).toBe('2026-07-09'); // fixture self-check

    expect(md).toContain(expectedLocalDate);
    expect(md).not.toContain('2026-07-10'); // the wrong UTC-slice day must be gone
  });

  // CONFIRMS: Every action owner-stamped with the note owner — per-signal
  // metadata.owner dropped (stress-test top-5 #4) → 131 AC6
  it('renders each action line with its own per-signal owner, not the note owner', () => {
    const signals: SignalFixture[] = [
      {
        id: 's1',
        content: 'Call Clara about the term sheet',
        metadata: { signal_type: 'action', dedupe_key: 'k1', note_id: NOTE_ID, owner: 'Alice Ortiz' },
      },
      {
        id: 's2',
        content: 'Draft the pilot onboarding checklist',
        metadata: { signal_type: 'action', dedupe_key: 'k2', note_id: NOTE_ID, owner: 'Bob Chen' },
      },
    ];

    const { md } = compileAndRenderBrief(baseMeta, signals, NOTE_ID, GENERATED_AT);

    const actionLine1 = md.split('\n').find((l) => l.includes('Call Clara'));
    const actionLine2 = md.split('\n').find((l) => l.includes('onboarding checklist'));
    expect(actionLine1).toBeDefined();
    expect(actionLine2).toBeDefined();

    // AC6: each action line carries its own owner…
    expect(actionLine1).toContain('Alice Ortiz');
    expect(actionLine2).toContain('Bob Chen');
    // …and the note owner is not stamped onto actions that belong to others.
    expect(actionLine1).not.toContain('Zhen Ye');
    expect(actionLine2).not.toContain('Zhen Ye');
    // AC6: the section header no longer claims a global owner.
    expect(md).not.toContain('**Actions (Zhen Ye)');
  });

  // CONFIRMS: per-signal owner ABSENT must render "unassigned", not the note owner
  // (stress-test top-5 #4 guard clause) → 131 AC6
  it('renders "unassigned" when a signal carries no owner metadata', () => {
    const signals: SignalFixture[] = [
      {
        id: 's1',
        content: 'Follow up on the API key scope question',
        metadata: { signal_type: 'action', dedupe_key: 'k1', note_id: NOTE_ID },
      },
    ];

    const { md } = compileAndRenderBrief(baseMeta, signals, NOTE_ID, GENERATED_AT);

    const actionLine = md.split('\n').find((l) => l.includes('API key scope'));
    expect(actionLine).toBeDefined();
    expect(actionLine).toContain('unassigned');
    expect(actionLine).not.toContain('Zhen Ye');
  });

  // CONFIRMS: adjacent RangeError crash on missing created_at / Invalid-Date render
  // (stress-test §Targeting + §Delivery invalid-date guard) → 131 AC6
  it('handles a missing/invalid created_at without crashing or rendering "Invalid Date"', () => {
    const meta = { ...baseMeta, created_at: undefined };
    const signals: SignalFixture[] = [
      {
        id: 's1',
        content: 'Confirm the calendar-trigger follow-on scope',
        metadata: { signal_type: 'decision', dedupe_key: 'k1', note_id: NOTE_ID },
      },
    ];

    let md: string | undefined;
    // AC6: invalid-date guard — the render must not throw…
    expect(() => {
      ({ md } = compileAndRenderBrief(meta, signals, NOTE_ID, GENERATED_AT));
    }).not.toThrow();
    // …and must not leak "Invalid Date" into the chat-bound output.
    expect(md).toBeDefined();
    expect(md).not.toContain('Invalid Date');
  });
});
