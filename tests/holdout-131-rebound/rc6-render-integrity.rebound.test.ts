// REBOUND holdout — item 131 RC6 (render integrity, AC6).
// Same scenarios/assertion-semantics as tests/holdout-131/rc6-render-integrity.test.ts,
// but bound to the SHIPPED render unit (renderPostMeetingBriefMarkdown over the
// canonical PostMeetingBrief object) instead of the prototype-logic-copy.
// Per AC7 the markdown is one renderer over the canonical brief object, so
// constructing brief objects and asserting the render IS the faithful RC6 unit.

import { describe, expect, it } from 'vitest';
import {
  renderPostMeetingBriefMarkdown,
  type PostMeetingBrief,
} from '../../src/enrich/post-meeting-brief.js';

const NOTE_ID = 'note-rc6-fixture';

function brief(overrides: Partial<PostMeetingBrief> = {}): PostMeetingBrief {
  return {
    schema_version: 1,
    kind: 'post_meeting_brief',
    meeting: {
      title: 'Advisor sync',
      date: '2026-07-09T18:00:00Z',
      attendees: ['Zhen Ye', 'Alice Ortiz', 'Bob Chen'],
      source: { provider: 'granola', note_id: NOTE_ID, url: null },
    },
    decided: [],
    actions: [],
    context: [],
    carryover: [],
    provenance: { extraction_run: 'run-rc6', generated_at: '2026-07-09T20:00:00.000Z' },
    ...overrides,
  };
}

describe('holdout-131 RC6 [rebound] — render integrity (AC6)', () => {
  it('sanitizes note-derived text at render: code fences neutralized, @channel zero-width-broken', () => {
    const md = renderPostMeetingBriefMarkdown(
      brief({
        meeting: {
          title: 'Advisor sync cc @here',
          date: '2026-07-09T18:00:00Z',
          attendees: ['Zhen Ye'],
          source: { provider: 'granola', note_id: NOTE_ID, url: null },
        },
        decided: [
          {
            text:
              'Ship the `deploy.sh` change:\n```\nrm -rf build && make\n```\nthen notify @channel immediately',
          },
        ],
      }),
    );

    // AC6 T1/T2: no live fence or inline-code backtick from note content survives.
    expect(md).not.toContain('```');
    expect(md).not.toContain('`deploy.sh`');
    // AC6 T3: mass-mention tokens zero-width-broken — contiguous strings gone.
    expect(md).not.toContain('@channel');
    expect(md).not.toContain('@here');
  });

  it('renders the meeting date in the local timezone, not the UTC day-slice', () => {
    // 2026-07-10T01:30:00Z == 2026-07-09 18:30 PDT — crosses the UTC day boundary.
    const date = '2026-07-10T01:30:00Z';
    const md = renderPostMeetingBriefMarkdown(
      brief({
        meeting: {
          title: 'Advisor sync',
          date,
          attendees: ['Zhen Ye'],
          source: { provider: 'granola', note_id: NOTE_ID, url: null },
        },
        decided: [{ text: 'Adopt the pilot scope as discussed' }],
      }),
    );

    // The shipped renderer uses Intl local formatting (dateStyle:medium,
    // timeStyle:short) — compute the expected string the same way so the
    // assertion binds to the real format while preserving the semantic.
    const expectedLocal = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
    // Self-check: the local render must not be the wrong UTC ISO day.
    expect(expectedLocal).not.toContain('2026-07-10');

    expect(md).toContain(expectedLocal);
    // The UTC-slice day must never leak into the render.
    expect(md).not.toContain('2026-07-10');
  });

  it('renders each action line with its own per-signal owner, not the note owner', () => {
    const md = renderPostMeetingBriefMarkdown(
      brief({
        actions: [
          { text: 'Call Clara about the term sheet', owner: 'Alice Ortiz', due: null },
          { text: 'Draft the pilot onboarding checklist', owner: 'Bob Chen', due: null },
        ],
      }),
    );

    const actionLine1 = md.split('\n').find((l) => l.includes('Call Clara'));
    const actionLine2 = md.split('\n').find((l) => l.includes('onboarding checklist'));
    expect(actionLine1).toBeDefined();
    expect(actionLine2).toBeDefined();

    // AC6: each action line carries its own owner…
    expect(actionLine1).toContain('Alice Ortiz');
    expect(actionLine2).toContain('Bob Chen');
    // …and no note-owner is stamped onto actions belonging to others.
    expect(actionLine1).not.toContain('Zhen Ye');
    expect(actionLine2).not.toContain('Zhen Ye');
    // AC6: the section header no longer claims a global owner.
    expect(md).not.toContain('**Actions (Zhen Ye)');
    expect(md).not.toMatch(/## Actions \(/);
  });

  it('renders "unassigned" when a signal carries no owner metadata', () => {
    const md = renderPostMeetingBriefMarkdown(
      brief({
        actions: [{ text: 'Follow up on the API key scope question', owner: null, due: null }],
      }),
    );

    const actionLine = md.split('\n').find((l) => l.includes('API key scope'));
    expect(actionLine).toBeDefined();
    expect(actionLine).toContain('unassigned');
    expect(actionLine).not.toContain('Zhen Ye');
  });

  it('handles a missing/invalid date without crashing or rendering "Invalid Date"', () => {
    let md: string | undefined;
    // AC6 invalid-date guard: the render must not throw…
    expect(() => {
      md = renderPostMeetingBriefMarkdown(
        brief({
          meeting: {
            title: 'Advisor sync',
            date: '', // no parseable start time
            attendees: ['Zhen Ye'],
            source: { provider: 'granola', note_id: NOTE_ID, url: null },
          },
          decided: [{ text: 'Confirm the calendar-trigger follow-on scope' }],
        }),
      );
    }).not.toThrow();
    // …and must not leak "Invalid Date" into chat-bound output.
    expect(md).toBeDefined();
    expect(md).not.toContain('Invalid Date');
  });
});
