import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  acquireGranolaCheckpointLock,
  releaseGranolaCheckpointLock,
  writeCheckpointJsonWithLock,
} from '../../src/capture/surfaces/granola-poller.js';
import {
  buildExtractionPrompt,
  computeGranolaSignalBrainTimeoutMs,
  GRANOLA_SIGNAL_INDEX_SOURCE,
  GRANOLA_SIGNAL_SOURCE,
  parseExtractorAnswer,
  runGranolaSignalWorkerOnce,
  type GranolaExtractedSignal,
  type GranolaSignalExtractionInput,
} from '../../src/enrich/granola-signals.js';
import {
  briefParitySet,
  compilePostMeetingBrief,
  renderPostMeetingBriefMarkdown,
  sanitizeBriefMarkdownText,
} from '../../src/enrich/post-meeting-brief.js';
import { MemoryStorage } from '../../src/storage/memory.js';

function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

async function appendRaw(
  store: MemoryStorage,
  opts: { noteId: string; updatedAt: string; summary: string; transcript: string },
): Promise<void> {
  await store.append({
    source: 'api:granola',
    timestamp: opts.updatedAt,
    content: opts.summary,
    metadata: {
      note_id: opts.noteId,
      title: 'Advisor sync',
      created_at: '2026-07-09T22:00:00.000Z',
      updated_at: opts.updatedAt,
      attendees: [{ name: 'Zhen' }, { name: 'Parth' }],
      web_url: `https://granola.ai/notes/${opts.noteId}`,
      granola_atom_type: 'summary',
      dedupe_key: `granola:${opts.noteId}:summary`,
    },
  });
  await store.append({
    source: 'api:granola',
    timestamp: opts.updatedAt,
    content: opts.transcript,
    metadata: {
      note_id: opts.noteId,
      title: 'Advisor sync',
      created_at: '2026-07-09T22:00:00.000Z',
      updated_at: opts.updatedAt,
      attendees: [{ name: 'Zhen' }, { name: 'Parth' }],
      web_url: `https://granola.ai/notes/${opts.noteId}`,
      granola_atom_type: 'transcript',
      dedupe_key: `granola:${opts.noteId}:transcript`,
    },
  });
}

function decision(text: string): GranolaExtractedSignal {
  return {
    signal_type: 'decision',
    text,
    canonical_subject: 'advisor sync',
    source_span: { kind: 'summary' },
    confidence: 0.9,
    decision_status: 'decided',
  };
}

describe('post-meeting brief compiler', () => {
  it('extracts and briefs only the superseding Granola atom content', async () => {
    const dir = tempDir('echo-brief-signals-');
    try {
      const store = new MemoryStorage();
      await appendRaw(store, {
        noteId: 'note-1',
        updatedAt: '2026-07-09T22:00:00.000Z',
        summary: 'old summary',
        transcript: 'old transcript',
      });
      await appendRaw(store, {
        noteId: 'note-1',
        updatedAt: '2026-07-09T22:10:00.000Z',
        summary: 'new summary with final decision',
        transcript: 'Zhen: new transcript with final decision',
      });
      const seen: GranolaSignalExtractionInput[] = [];

      const result = await runGranolaSignalWorkerOnce(
        store,
        async (input) => {
          seen.push(input);
          return [decision('Ship the final advisor brief.')];
        },
        {
          checkpointPath: join(dir, 'signals.json'),
          settleMs: 0,
          now: () => '2026-07-09T22:20:00.000Z',
        },
      );

      expect(result).toMatchObject({ status: 'ok', notes_extracted: 1 });
      expect(seen[0]?.summary_text).toContain('new summary');
      expect(seen[0]?.transcript_text).toContain('new transcript');
      const brief = await compilePostMeetingBrief(store, {
        noteId: 'note-1',
        generatedAt: '2026-07-09T22:21:00.000Z',
      });
      expect(brief.decided.map((item) => item.text)).toEqual(['Ship the final advisor brief.']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('uses only the current signal run when compiling a brief', async () => {
    const store = new MemoryStorage();
    await appendRaw(store, {
      noteId: 'note-2',
      updatedAt: '2026-07-09T22:00:00.000Z',
      summary: 'summary',
      transcript: 'transcript',
    });
    const oldSignal = await store.append({
      source: GRANOLA_SIGNAL_SOURCE,
      timestamp: '2026-07-09T22:01:00.000Z',
      content: 'Old contradicted decision.',
      metadata: { note_id: 'note-2', signal_type: 'decision' },
    });
    const currentSignal = await store.append({
      source: GRANOLA_SIGNAL_SOURCE,
      timestamp: '2026-07-09T22:02:00.000Z',
      content: 'Current decision only.',
      metadata: { note_id: 'note-2', signal_type: 'decision' },
    });
    await store.append({
      source: GRANOLA_SIGNAL_INDEX_SOURCE,
      timestamp: '2026-07-09T22:01:00.000Z',
      content: '{}',
      metadata: {
        manifest_type: 'granola_signal_run',
        note_id: 'note-2',
        extractor_version: 'granola-signals@1',
        extraction_run_id: 'run-old',
        completed_at: '2026-07-09T22:01:00.000Z',
        supersedes: null,
        signal_atom_ids: [oldSignal],
      },
    });
    await store.append({
      source: GRANOLA_SIGNAL_INDEX_SOURCE,
      timestamp: '2026-07-09T22:02:00.000Z',
      content: '{}',
      metadata: {
        manifest_type: 'granola_signal_run',
        note_id: 'note-2',
        extractor_version: 'granola-signals@1',
        extraction_run_id: 'run-current',
        completed_at: '2026-07-09T22:02:00.000Z',
        supersedes: 'run-old',
        signal_atom_ids: [currentSignal],
      },
    });

    const brief = await compilePostMeetingBrief(store, {
      noteId: 'note-2',
      generatedAt: '2026-07-09T22:03:00.000Z',
    });

    expect(brief.decided.map((item) => item.text)).toEqual(['Current decision only.']);
  });

  it('sanitizes markdown and renders action owners per action', () => {
    expect(sanitizeBriefMarkdownText('```js\n@channel `deploy`\n```\n@here')).toBe(
      '    @\u200Bchannel ’deploy’\n@\u200Bhere',
    );
    const markdown = renderPostMeetingBriefMarkdown({
      schema_version: 1,
      kind: 'post_meeting_brief',
      meeting: {
        title: '@all launch `plan`',
        date: 'not-a-date',
        attendees: ['@everyone'],
        source: { provider: 'granola', note_id: 'note-3', url: null },
      },
      decided: [],
      actions: [{ text: '```sh\nrun deploy\n```', owner: null, due: null }],
      context: [],
      carryover: [],
      provenance: { extraction_run: 'run', generated_at: '2026-07-09T22:00:00.000Z' },
    });
    expect(markdown).toContain('Meeting: @\u200Ball launch ’plan’ | Starts: invalid date');
    expect(markdown).toContain('- unassigned:     run deploy');
    expect(markdown).toContain('**REVIEW BEFORE SENDING**');
  });

  it('salvages fenced extractor JSON and scales timeout from the final prompt', () => {
    const parsed = parseExtractorAnswer(
      '```json\n{"signals":[{"signal_type":"decision","text":"Ship","canonical_subject":"ship","source_span":{"kind":"summary"},"confidence":0.8}]}\n```',
    );
    expect(parsed[0]?.text).toBe('Ship');
    expect(computeGranolaSignalBrainTimeoutMs(180_000, 1024)).toBe(180_000);
    expect(computeGranolaSignalBrainTimeoutMs(180_000, 125 * 1024)).toBe(304_000);
    expect(computeGranolaSignalBrainTimeoutMs(180_000, 999 * 1024)).toBe(600_000);

    const prompt = buildExtractionPrompt({
      note_id: 'note',
      meeting_title: 'Title',
      updated_at: '2026-07-09T22:00:00.000Z',
      summary_text: 'summary',
      summary_dedupe_key: 'summary-key',
      transcript_text: 'SENTINEL_TRANSCRIPT',
      transcript_dedupe_key: 'transcript-key',
      transcript_items: [
        {
          start_time: null,
          end_time: null,
          speaker: 'Avery',
          text: 'SENTINEL_TRANSCRIPT',
        },
      ],
    });
    expect(prompt.match(/SENTINEL_TRANSCRIPT/g)).toHaveLength(1);
  });

  it('keeps owner-fenced checkpoint commits from old holders after stale takeover', async () => {
    const dir = tempDir('echo-brief-lock-');
    try {
      const path = join(dir, 'checkpoint.json');
      const oldLock = await acquireGranolaCheckpointLock(path, {});
      const oldWrite = writeCheckpointJsonWithLock(oldLock, '{"owner":"old"}\n', {
        beforeCommit: async () => {
          const holderPath = join(`${path}.lock`, 'holder.json');
          const holder = JSON.parse(readFileSync(holderPath, 'utf8')) as Record<string, unknown>;
          holder['acquired_at'] = '2000-01-01T00:00:00.000Z';
          writeFileSync(holderPath, `${JSON.stringify(holder, null, 2)}\n`);
          const newLock = await acquireGranolaCheckpointLock(path, { staleMs: 0 });
          try {
            await writeCheckpointJsonWithLock(newLock, '{"owner":"new"}\n');
          } finally {
            releaseGranolaCheckpointLock(newLock);
          }
        },
      });
      await expect(oldWrite).rejects.toThrow();
      expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ owner: 'new' });
      releaseGranolaCheckpointLock(oldLock);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('normalizes prototype parity text by neutralizing render-only transforms', () => {
    expect(briefParitySet(['    Use @\u200Bchannel ’quote’', 'Use @channel `quote`']).size).toBe(1);
  });
});
