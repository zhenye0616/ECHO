// brief-now.mjs — "meeting just ended" fast-path (session prototype).
// Ingest → extract (no settle wait) → compile the TOOL-AGNOSTIC post-meeting
// brief: canonical JSON + a markdown render any team-chat tool can carry.
//
// Usage: node brief-now.mjs [note_id]   (default: newest granola note)
import { readFileSync, writeFileSync } from 'node:fs';
import { SqliteStorage } from '/Users/zhenye/Desktop/Project_echo/dist/storage/sqlite.js';
import {
  HttpGranolaApiClient,
  pollGranolaOnce,
} from '/Users/zhenye/Desktop/Project_echo/dist/capture/surfaces/granola-poller.js';
import { startGranolaSignalWorker } from '/Users/zhenye/Desktop/Project_echo/dist/enrich/granola-signals.js';

const OUT_DIR = '/private/tmp/claude-501/-Users-zhenye-Desktop-Project-echo/e0d2cf72-98eb-484b-88d0-23e1cdd01545/scratchpad';
const storage = new SqliteStorage('/Users/zhenye/Library/Application Support/ECHO/echo.db');

// 1. Ingest anything new (one poll tick, same code the daemon runs).
const apiKey = JSON.parse(readFileSync('/Users/zhenye/.echo/state/granola.json', 'utf8')).api_key;
const poll = await pollGranolaOnce(storage, new HttpGranolaApiClient(apiKey, {}));
console.error(`[poll] ${JSON.stringify(poll)}`);

// 2. Extract signals now — no settle wait.
const worker = await startGranolaSignalWorker(storage, {
  runOnStart: false,
  settleMs: 0,
  env: { ...process.env, ECHO_GRANOLA_SIGNAL_BRAIN: process.env.ECHO_GRANOLA_SIGNAL_BRAIN ?? 'codex' },
});
const extraction = await worker.run();
console.error(`[extract] ${JSON.stringify({ status: extraction.status, notes: extraction.notes_extracted, atoms: extraction.signal_atoms_written })}`);
await worker.stop();

// 3. Target note: argv or newest summary atom.
const summaries = (await storage.query({ source: 'api:granola' }))
  .filter((e) => e.metadata?.granola_atom_type === 'summary')
  .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
const noteId = process.argv[2] ?? summaries[0]?.metadata?.note_id;
const note = summaries.find((e) => e.metadata?.note_id === noteId);
if (!note) { console.error(`note not found: ${noteId}`); process.exit(1); }
const md5 = note.metadata;

// 4. Signals for the note (current manifest run only comes free: extraction
//    writes one run per note; v0 prototype reads all and dedupes by dedupe_key).
const signals = (await storage.query({ source: 'derived:granola-signals' }))
  .filter((e) => e.metadata?.note_id === noteId);
const seen = new Set();
const rows = [];
for (const s of signals) {
  const k = s.metadata?.dedupe_key ?? s.id;
  if (seen.has(k)) continue;
  seen.add(k);
  rows.push({ type: s.metadata?.signal_type, text: s.content.trim(), subject: s.metadata?.canonical_subject ?? null });
}

// 5. Compile the canonical, tool-agnostic brief object.
const owner = md5.owner?.name ?? md5.owner?.email ?? 'unknown';
const brief = {
  schema_version: 1,
  kind: 'post_meeting_brief',
  generated_at: new Date().toISOString(),
  meeting: {
    title: md5.title,
    date: md5.created_at,
    attendees: (md5.attendees ?? []).map((a) => a.name ?? a.email),
    source: { provider: 'granola', note_id: noteId, url: md5.web_url ?? null },
  },
  decided: rows.filter((r) => r.type === 'decision').map((r, i) => ({ id: `D${i + 1}`, text: r.text, subject: r.subject })),
  actions: rows.filter((r) => r.type === 'action').map((r, i) => ({ id: `A${i + 1}`, text: r.text, owner, due: null })),
  context: rows.filter((r) => r.type === 'rationale').map((r) => r.text),
  carryover: [], // backflow slot: prior-meeting decision statuses (v0: empty)
  provenance: { extraction: 'granola-signals@1', triage: 'concierge' },
};

// 6. Render: markdown (valid in Mattermost, Slack, email, Linear comments).
const d = new Date(brief.meeting.date);
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

writeFileSync(`${OUT_DIR}/brief-${noteId}.json`, JSON.stringify(brief, null, 2));
writeFileSync(`${OUT_DIR}/brief-${noteId}.md`, md);
console.log(md);
console.error(`\n[files] brief-${noteId}.json / .md written`);
