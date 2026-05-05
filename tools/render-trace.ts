// One-shot HTML trace renderer for the CC + Codex capture streams.
//
// Wires the real extractors against an in-memory storage that filters by
// timestamp window, lets the boot-scan replay everything in scope, then
// emits a single self-contained HTML file with both streams rendered
// side-by-side in two columns. Inspired by claude-trace's
// template+replacement approach but with our two-stream shape.
//
// Usage:
//   npm run render:trace                       (last 7 days, ~/Desktop)
//   npm run render:trace -- --days 1
//   npm run render:trace -- --days 30 --out /tmp/trace.html
//   npm run render:trace -- --full-content    (don't truncate large messages)

import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { startClaudeCodeExtractor } from '../src/capture/extractors/claude-code.js';
import { startCodexExtractor } from '../src/capture/extractors/codex.js';
import type {
  CaptureEvent,
  EventId,
  QueryFilter,
  Storage,
} from '../src/storage/interface.js';
import { MemoryStorage } from '../src/storage/memory.js';

// ─── CLI args ───────────────────────────────────────────────────────────────

interface Args {
  days: number;
  outPath: string;
  fullContent: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    days: 7,
    outPath: defaultOutPath(),
    fullContent: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--days') {
      const v = argv[++i];
      if (v !== undefined) args.days = Math.max(1, Number.parseInt(v, 10));
    } else if (a === '--out') {
      const v = argv[++i];
      if (v !== undefined) args.outPath = resolve(v);
    } else if (a === '--full-content') {
      args.fullContent = true;
    }
  }
  return args;
}

function defaultOutPath(): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  return resolve(homedir(), 'Desktop', `echo-trace-${stamp}.html`);
}

// ─── Filtering storage: drop events older than sinceMs before they hit RAM ──

class WindowedStorage implements Storage {
  private inner = new MemoryStorage();
  constructor(private readonly sinceMs: number) {}

  async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
    const ts = Date.parse(event.timestamp);
    if (Number.isFinite(ts) && ts < this.sinceMs) {
      // Synthesize a discard token; nothing else uses the returned id during boot scan.
      return '_skip';
    }
    return this.inner.append(event);
  }

  query(filter?: QueryFilter): Promise<CaptureEvent[]> {
    return this.inner.query(filter);
  }

  count(): Promise<number> {
    return this.inner.count();
  }
}

// ─── Wait for boot-scan chain to drain (count stable for idleMs) ────────────

async function waitForDrain(storage: Storage, idleMs = 1500): Promise<void> {
  let last = -1;
  let stableMs = 0;
  // Cap total wait at 60s to avoid hanging on a wedged extractor.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const n = await storage.count();
    if (n === last) {
      stableMs += 200;
      if (stableMs >= idleMs) return;
    } else {
      last = n;
      stableMs = 0;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

// ─── Content truncation for HTML embed ──────────────────────────────────────

const MAX_CHARS_PER_FIELD = 32_000;
function truncate(s: string, full: boolean): string {
  if (full || s.length <= MAX_CHARS_PER_FIELD) return s;
  return s.slice(0, MAX_CHARS_PER_FIELD) + `\n\n[…truncated; ${s.length - MAX_CHARS_PER_FIELD} chars dropped]`;
}

interface RenderRow {
  id: string;
  lane: 'cc' | 'codex';
  ts: string;
  sid: string;
  turn: number;
  repo: string | null;
  branch: string | null;
  model: string | null;
  sandbox: string | null;
  files: string[];
  hadTool: boolean;
  user: string;
  assistant: string;
  metadata: Record<string, unknown>;
  source: string;
}

function toRow(event: CaptureEvent, full: boolean): RenderRow | null {
  const md = (event.metadata ?? {}) as Record<string, unknown>;
  const lane: 'cc' | 'codex' = event.source.includes('/.codex/sessions/') ? 'codex' : 'cc';
  const sid = ((md['session_id'] as string) ?? '????????').slice(0, 8);
  const turn = Number(md['turn_index'] ?? 0);

  const m = event.content.match(/^USER: ([\s\S]*?)\n\nASSISTANT: ([\s\S]*)$/);
  const user = truncate(m?.[1] ?? '', full);
  const assistant = truncate(m?.[2] ?? '', full);

  const repo = (md['repo_root'] as string | undefined) ?? null;
  const filesRefRaw = md['files_referenced'];
  const files = Array.isArray(filesRefRaw) ? (filesRefRaw as unknown[]).filter((f): f is string => typeof f === 'string') : [];

  let branch: string | null = null;
  if (lane === 'codex') {
    const git = md['git'] as Record<string, unknown> | undefined;
    if (git !== undefined && typeof git['branch'] === 'string') branch = git['branch'] as string;
  }

  let model: string | null = null;
  let sandbox: string | null = null;
  if (lane === 'codex') {
    const codex = md['codex'] as Record<string, unknown> | undefined;
    if (codex !== undefined) {
      if (typeof codex['model'] === 'string') model = codex['model'] as string;
      if (typeof codex['sandbox_policy_type'] === 'string') sandbox = codex['sandbox_policy_type'] as string;
    }
  }

  return {
    id: event.id,
    lane,
    ts: event.timestamp,
    sid,
    turn,
    repo,
    branch,
    model,
    sandbox,
    files,
    hadTool: md['had_tool_use'] === true,
    user,
    assistant,
    metadata: md,
    source: event.source,
  };
}

// ─── HTML emission ──────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(rows: RenderRow[], opts: { days: number; generatedAt: string }): string {
  const ccCount = rows.filter((r) => r.lane === 'cc').length;
  const cxCount = rows.filter((r) => r.lane === 'codex').length;
  // Embed via base64 to dodge HTML/JSON escaping landmines, same trick claude-trace uses.
  const json = JSON.stringify(rows);
  const dataB64 = Buffer.from(json, 'utf-8').toString('base64');
  return TEMPLATE
    .replace('__ECHO_DATA__', dataB64)
    .replace('__ECHO_META__', escapeHtml(JSON.stringify({ ...opts, ccCount, cxCount })));
}

const TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ECHO trace — CC + Codex side-by-side</title>
<style>
  :root {
    --bg: #0d1117; --panel: #161b22; --panel2: #1c232b;
    --fg: #e6edf3; --dim: #8b949e; --dimmer: #6e7681;
    --cc: #4ec9d6; --codex: #c586c0; --tool: #d7ba7d; --branch: #6cc24a; --model: #ce9178;
    --border: #30363d; --accent: #58a6ff;
    --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body { background: var(--bg); color: var(--fg); font-family: var(--sans); font-size: 13px; }
  header { padding: 14px 18px 10px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--bg); z-index: 10; }
  header h1 { margin: 0 0 6px 0; font-size: 14px; font-weight: 600; letter-spacing: .2px; }
  header h1 .sub { color: var(--dim); font-weight: 400; margin-left: 8px; }
  .stats { color: var(--dim); font-size: 12px; margin-bottom: 10px; }
  .stats .cc { color: var(--cc); } .stats .codex { color: var(--codex); }
  .filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .filters input, .filters select { background: var(--panel); color: var(--fg); border: 1px solid var(--border); border-radius: 5px; padding: 5px 9px; font-size: 12px; font-family: var(--sans); }
  .filters input[type=text] { min-width: 280px; }
  .filters label { color: var(--dim); font-size: 12px; display: flex; align-items: center; gap: 5px; cursor: pointer; user-select: none; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 0; height: calc(100vh - 96px); }
  .col { overflow-y: auto; padding: 8px 12px; }
  .col.cc { border-right: 1px solid var(--border); }
  .col h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--dim); margin: 4px 0 8px 0; padding: 4px 0; position: sticky; top: 0; background: var(--bg); }
  .col.cc h2 { color: var(--cc); }
  .col.codex h2 { color: var(--codex); }
  .row { background: var(--panel); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 6px; overflow: hidden; }
  .row.expanded { background: var(--panel2); }
  .row-head { padding: 7px 10px; cursor: pointer; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-family: var(--mono); font-size: 12px; }
  .row-head:hover { background: rgba(88, 166, 255, .06); }
  .ts { color: var(--dim); }
  .sid { color: var(--dimmer); }
  .repo { color: var(--fg); font-weight: 500; }
  .branch { color: var(--branch); }
  .model { color: var(--model); }
  .sandbox { color: var(--model); opacity: .8; }
  .tool { color: var(--tool); }
  .files { color: var(--dim); font-size: 11px; }
  .row-body { padding: 10px 12px 12px; border-top: 1px dashed var(--border); display: none; }
  .row.expanded .row-body { display: block; }
  .turn-pair { display: flex; flex-direction: column; gap: 8px; }
  .msg { font-family: var(--mono); font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  .msg .role { display: inline-block; font-weight: 600; padding: 2px 7px; border-radius: 3px; margin-right: 6px; font-family: var(--sans); font-size: 10px; letter-spacing: .5px; text-transform: uppercase; }
  .msg.user .role { background: var(--accent); color: white; }
  .msg.asst .role { background: var(--dimmer); color: var(--fg); }
  .preview { color: var(--dim); font-size: 12px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  details.meta { margin-top: 8px; }
  details.meta summary { color: var(--dim); cursor: pointer; font-size: 11px; }
  details.meta pre { background: var(--bg); padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 11px; color: var(--dim); margin: 6px 0 0 0; }
  .empty { color: var(--dim); padding: 18px 4px; font-style: italic; }
  .badge { background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px; font-size: 11px; color: var(--dim); }
</style>
</head>
<body>
<header>
  <h1>ECHO trace <span class="sub" id="meta-sub"></span></h1>
  <div class="stats" id="stats"></div>
  <div class="filters">
    <input type="text" id="search" placeholder="search user / assistant / repo / file…">
    <select id="repoFilter"><option value="">all repos</option></select>
    <label><input type="checkbox" id="toolOnly"> only tool turns</label>
    <label><input type="checkbox" id="hideTool"> hide tool turns</label>
    <span class="badge" id="counts"></span>
  </div>
</header>

<div class="columns">
  <div class="col cc"><h2>Claude Code</h2><div id="list-cc"></div></div>
  <div class="col codex"><h2>Codex</h2><div id="list-codex"></div></div>
</div>

<script id="echo-meta" type="application/json">__ECHO_META__</script>
<script>
(function(){
  const META = JSON.parse(document.getElementById('echo-meta').textContent);
  const ROWS = JSON.parse(decodeURIComponent(escape(atob('__ECHO_DATA__'))));

  // header summary
  document.getElementById('meta-sub').textContent =
    'last ' + META.days + 'd · generated ' + META.generatedAt;
  document.getElementById('stats').innerHTML =
    '<span class="cc">CC: ' + META.ccCount + '</span> &nbsp;·&nbsp; ' +
    '<span class="codex">Codex: ' + META.cxCount + '</span>';

  // dedupe repo list for filter dropdown
  const repos = Array.from(new Set(ROWS.map(r => r.repo).filter(Boolean))).sort();
  const repoSel = document.getElementById('repoFilter');
  for (const r of repos) {
    const opt = document.createElement('option'); opt.value = r; opt.textContent = r;
    repoSel.appendChild(opt);
  }

  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
  function fmtTs(iso){ return iso.replace('T',' ').slice(0,19); }
  function shortRepo(p){ if(!p) return '—'; const parts=p.split('/').filter(Boolean); return parts.slice(-2).join('/'); }

  function rowHtml(r){
    const tools = r.hadTool ? '<span class="tool">🔧</span>' : '';
    const repoBranch = '<span class="repo">' + esc(shortRepo(r.repo)) + '</span>' +
      (r.branch ? '<span class="branch">@' + esc(r.branch) + '</span>' : '');
    const codexBits = (r.model || r.sandbox)
      ? ' <span class="model">' + esc([r.model, r.sandbox].filter(Boolean).join('/')) + '</span>'
      : '';
    const filesBits = r.files.length ? ' <span class="files">files=' + r.files.length + '</span>' : '';
    const preview = esc((r.user || '').replace(/\\s+/g,' ').slice(0,180));
    return (
      '<div class="row" data-id="' + esc(r.id) + '" data-lane="' + r.lane + '">' +
        '<div class="row-head">' +
          '<span class="ts">' + esc(fmtTs(r.ts)) + '</span>' +
          '<span class="sid">' + esc(r.sid) + '/#' + r.turn + '</span>' +
          tools +
          repoBranch + filesBits + codexBits +
          '<span class="preview">' + preview + '</span>' +
        '</div>' +
        '<div class="row-body">' +
          '<div class="turn-pair">' +
            '<div class="msg user"><span class="role">user</span>' + esc(r.user) + '</div>' +
            '<div class="msg asst"><span class="role">assistant</span>' + esc(r.assistant) + '</div>' +
          '</div>' +
          (r.files.length ? '<details class="meta"><summary>files_referenced (' + r.files.length + ')</summary><pre>' + esc(r.files.join('\\n')) + '</pre></details>' : '') +
          '<details class="meta"><summary>metadata</summary><pre>' + esc(JSON.stringify(r.metadata, null, 2)) + '</pre></details>' +
          '<details class="meta"><summary>source</summary><pre>' + esc(r.source) + '</pre></details>' +
        '</div>' +
      '</div>'
    );
  }

  function passes(r, q, repo, toolOnly, hideTool){
    if (toolOnly && !r.hadTool) return false;
    if (hideTool && r.hadTool) return false;
    if (repo && r.repo !== repo) return false;
    if (q) {
      const hay = (r.user + '\\n' + r.assistant + '\\n' + (r.repo||'') + '\\n' + r.files.join('\\n')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function render(){
    const q = (document.getElementById('search').value || '').trim().toLowerCase();
    const repo = document.getElementById('repoFilter').value;
    const toolOnly = document.getElementById('toolOnly').checked;
    const hideTool = document.getElementById('hideTool').checked;
    const cc = []; const cx = [];
    for (const r of ROWS) {
      if (!passes(r, q, repo, toolOnly, hideTool)) continue;
      if (r.lane === 'cc') cc.push(r); else cx.push(r);
    }
    cc.sort((a,b)=>b.ts.localeCompare(a.ts));
    cx.sort((a,b)=>b.ts.localeCompare(a.ts));
    document.getElementById('list-cc').innerHTML = cc.length ? cc.map(rowHtml).join('') : '<div class="empty">no matches</div>';
    document.getElementById('list-codex').innerHTML = cx.length ? cx.map(rowHtml).join('') : '<div class="empty">no matches</div>';
    document.getElementById('counts').textContent = 'showing ' + cc.length + ' / ' + cx.length;
  }

  document.body.addEventListener('click', (e) => {
    const head = e.target.closest('.row-head');
    if (!head) return;
    head.parentElement.classList.toggle('expanded');
  });

  ['search','repoFilter','toolOnly','hideTool'].forEach(id => {
    document.getElementById(id).addEventListener('input', render);
    document.getElementById(id).addEventListener('change', render);
  });

  render();
})();
</script>
</body>
</html>
`;

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sinceMs = Date.now() - args.days * 24 * 3600 * 1000;
  console.log(`ECHO render-trace`);
  console.log(`  window:  last ${args.days}d  (since ${new Date(sinceMs).toISOString()})`);
  console.log(`  output:  ${args.outPath}`);

  const storage = new WindowedStorage(sinceMs);
  console.log(`  starting extractors…`);
  const cc = await startClaudeCodeExtractor(storage);
  const cx = await startCodexExtractor(storage);

  console.log(`  draining boot scan (poll until count plateau)…`);
  await waitForDrain(storage);

  await cc.stop();
  await cx.stop();

  const events = await storage.query();
  console.log(`  collected ${events.length} events in window`);

  const rows: RenderRow[] = [];
  for (const e of events) {
    const r = toRow(e, args.fullContent);
    if (r !== null) rows.push(r);
  }

  const html = buildHtml(rows, {
    days: args.days,
    generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  });

  mkdirSync(dirname(args.outPath), { recursive: true });
  writeFileSync(args.outPath, html, 'utf-8');

  console.log(`\nwrote ${(html.length / 1024 / 1024).toFixed(1)} MB to ${args.outPath}`);
  console.log(`open with:  open '${args.outPath}'`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
