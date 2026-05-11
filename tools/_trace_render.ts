// Shared rendering bits for tools/render-trace.ts (snapshot) and
// tools/serve-trace.ts (live HTTP+SSE). Both viewers ship a near-identical
// two-column HTML; centralising the row shape, the metadata extractor, and
// the inline frontend bundle here means future schema changes only land in
// one place.

import { SOURCE_MARKERS } from '../src/capture/extractors/_shared.js';
import type { CaptureEvent, Storage } from '../src/storage/interface.js';

export type RenderLane = 'cc' | 'codex' | 'cursor';

export interface RenderRow {
  id: string;
  lane: RenderLane;
  ts: string;
  sid: string;
  turn: number;
  repo: string | null;
  branch: string | null;
  model: string | null;
  sandbox: string | null;
  files: string[];
  hadTool: boolean;
  toolCalls: Array<Record<string, unknown>>;
  thinking: string | null;
  gitState: Record<string, unknown> | null;
  user: string;
  assistant: string;
  metadata: Record<string, unknown>;
  source: string;
}

const MAX_CHARS_PER_FIELD = 32_000;

function truncateField(s: string, full: boolean): string {
  if (full || s.length <= MAX_CHARS_PER_FIELD) return s;
  return (
    s.slice(0, MAX_CHARS_PER_FIELD) +
    `\n\n[…truncated; ${s.length - MAX_CHARS_PER_FIELD} chars dropped]`
  );
}

/** Poll storage.count() until it stops changing for `idleMs`, or 60s elapses. */
export async function waitForDrain(storage: Storage, idleMs = 1500): Promise<void> {
  let last = -1;
  let stableMs = 0;
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

export function eventsToRows(events: CaptureEvent[], full: boolean): RenderRow[] {
  const rows: RenderRow[] = [];
  for (const e of events) {
    const r = toRow(e, full);
    if (r !== null) rows.push(r);
  }
  return rows;
}

/** "YYYY-MM-DD HH:MM:SS" in the host machine's local time. */
export function formatGeneratedAt(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

export function toRow(event: CaptureEvent, full: boolean): RenderRow | null {
  const md = (event.metadata ?? {}) as Record<string, unknown>;
  const lane: RenderLane = event.source.includes(SOURCE_MARKERS.codex)
    ? 'codex'
    : event.source.includes(SOURCE_MARKERS.cursor)
      ? 'cursor'
      : 'cc';
  const sid = ((md['session_id'] as string) ?? '????????').slice(0, 8);
  const turn = Number(md['turn_index'] ?? 0);

  const m = event.content.match(/^USER: ([\s\S]*?)\n\nASSISTANT: ([\s\S]*)$/);
  const user = truncateField(m?.[1] ?? '', full);
  const assistant = truncateField(m?.[2] ?? '', full);

  const repo = (md['repo_root'] as string | undefined) ?? null;
  const filesRefRaw = md['files_referenced'];
  const files = Array.isArray(filesRefRaw)
    ? (filesRefRaw as unknown[]).filter((f): f is string => typeof f === 'string')
    : [];

  let branch: string | null = null;
  if (lane === 'codex') {
    const git = md['git'] as Record<string, unknown> | undefined;
    if (git !== undefined && typeof git['branch'] === 'string') branch = git['branch'] as string;
  } else if (typeof md['branch'] === 'string') {
    branch = md['branch'] as string;
  }

  let model: string | null = null;
  let sandbox: string | null = null;
  if (lane === 'codex') {
    const codex = md['codex'] as Record<string, unknown> | undefined;
    if (codex !== undefined) {
      if (typeof codex['model'] === 'string') model = codex['model'] as string;
      if (typeof codex['sandbox_policy_type'] === 'string')
        sandbox = codex['sandbox_policy_type'] as string;
    }
  }

  const toolCallsRaw = md['tool_calls'];
  const toolCalls: Array<Record<string, unknown>> = Array.isArray(toolCallsRaw)
    ? (toolCallsRaw as unknown[]).filter(
        (x): x is Record<string, unknown> => typeof x === 'object' && x !== null,
      )
    : [];
  const thinking = typeof md['thinking'] === 'string' ? (md['thinking'] as string) : null;
  const gitStateRaw = md['git_state'];
  const gitState =
    typeof gitStateRaw === 'object' && gitStateRaw !== null
      ? (gitStateRaw as Record<string, unknown>)
      : null;

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
    toolCalls,
    thinking,
    gitState,
    user,
    assistant,
    metadata: md,
    source: event.source,
  };
}

// ─── HTML template ──────────────────────────────────────────────────────────
//
// One template, two flavours. The `live` flag flips a small JS branch that
// connects an EventSource for incremental rows. Both renderers inject the
// same base64 envelope ({ meta, rows }) at __ECHO_DATA__.

export interface BuildHtmlOpts {
  days: number;
  generatedAt: string;
  /** True for serve-trace (subscribes to /events). False for the snapshot file. */
  live: boolean;
  /** Page <title>. */
  title?: string;
}

export function buildHtml(rows: RenderRow[], opts: BuildHtmlOpts): string {
  const meta = {
    days: opts.days,
    generatedAt: opts.generatedAt,
    live: opts.live,
  };
  const envelope = { meta, rows };
  const b64 = Buffer.from(JSON.stringify(envelope), 'utf-8').toString('base64');
  const title = opts.title ?? (opts.live ? 'ECHO trace — live' : 'ECHO trace');
  return TEMPLATE.replace('__ECHO_TITLE__', title).replace('__ECHO_DATA__', b64);
}

const TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>__ECHO_TITLE__</title>
<style>
  :root {
    --bg: #0d1117; --panel: #161b22; --panel2: #1c232b;
    --fg: #e6edf3; --dim: #8b949e; --dimmer: #6e7681;
    --cc: #4ec9d6; --codex: #c586c0; --cursor: #f0a868; --tool: #d7ba7d; --branch: #6cc24a; --model: #ce9178;
    --border: #30363d; --accent: #58a6ff; --pulse: #3fb950;
    --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body { background: var(--bg); color: var(--fg); font-family: var(--sans); font-size: 13px; }
  header { padding: 14px 18px 10px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--bg); z-index: 10; }
  header h1 { margin: 0 0 6px 0; font-size: 14px; font-weight: 600; letter-spacing: .2px; display: flex; align-items: center; gap: 10px; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dimmer); display: inline-block; }
  .live-dot.on { background: var(--pulse); box-shadow: 0 0 6px var(--pulse); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
  header h1 .sub { color: var(--dim); font-weight: 400; margin-left: 0; font-size: 12px; }
  .stats { color: var(--dim); font-size: 12px; margin-bottom: 10px; }
  .stats .cc { color: var(--cc); } .stats .codex { color: var(--codex); } .stats .cursor { color: var(--cursor); }
  .filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .filters input, .filters select { background: var(--panel); color: var(--fg); border: 1px solid var(--border); border-radius: 5px; padding: 5px 9px; font-size: 12px; font-family: var(--sans); }
  .filters input[type=text] { min-width: 280px; }
  .filters label { color: var(--dim); font-size: 12px; display: flex; align-items: center; gap: 5px; cursor: pointer; user-select: none; }
  .columns { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; height: calc(100vh - 110px); }
  .col { overflow-y: auto; padding: 8px 12px; }
  .col.cc, .col.codex { border-right: 1px solid var(--border); }
  .col h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--dim); margin: 4px 0 8px 0; padding: 4px 0; position: sticky; top: 0; background: var(--bg); }
  .col.cc h2 { color: var(--cc); }
  .col.codex h2 { color: var(--codex); }
  .col.cursor h2 { color: var(--cursor); }
  .session { border: 1px solid var(--border); border-radius: 6px; margin-bottom: 10px; background: rgba(255,255,255,.015); overflow: hidden; }
  .session-head { padding: 6px 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-family: var(--mono); font-size: 11px; cursor: pointer; background: rgba(88,166,255,.04); border-bottom: 1px solid var(--border); user-select: none; }
  .session-head:hover { background: rgba(88,166,255,.08); }
  .session-head .caret { color: var(--dim); width: 10px; display: inline-block; transition: transform .15s ease; }
  .session.collapsed .caret { transform: rotate(-90deg); }
  .session.collapsed .session-body { display: none; }
  .session-head .ssid { color: var(--accent); font-weight: 600; }
  .session-head .scount { color: var(--dim); }
  .session-head .sts { color: var(--dimmer); margin-left: auto; }
  .session-body { padding: 6px 8px 8px; }
  .row { background: var(--panel); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 6px; overflow: hidden; transition: background .25s ease; }
  .row.fresh { background: rgba(63, 185, 80, .12); border-color: var(--pulse); }
  .row.expanded { background: var(--panel2); }
  .row-head { padding: 7px 10px; cursor: pointer; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-family: var(--mono); font-size: 12px; }
  .row-head:hover { background: rgba(88, 166, 255, .06); }
  .ts { color: var(--dim); }
  .sid { color: var(--dimmer); }
  .repo { color: var(--fg); font-weight: 500; }
  .branch { color: var(--branch); }
  .model { color: var(--model); }
  .tool { color: var(--tool); }
  .files { color: var(--dim); font-size: 11px; }
  .gs { color: var(--branch); font-size: 11px; }
  .gs.stale { color: var(--dim); }
  .toolcount { color: var(--tool); font-size: 11px; }
  .row-body { padding: 10px 12px 12px; border-top: 1px dashed var(--border); display: none; }
  .tool-list { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
  .tool { font-family: var(--mono); font-size: 11px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; }
  .tool .tname { color: var(--tool); font-weight: 600; }
  .tool .terror { color: #f85149; font-weight: 600; }
  .tool details { margin-top: 4px; }
  .tool details > summary { color: var(--dim); font-size: 11px; cursor: pointer; }
  .tool pre { background: transparent; color: var(--fg); margin: 4px 0 0 0; white-space: pre-wrap; word-break: break-word; max-height: 240px; overflow-y: auto; font-size: 11px; }
  .thinking { margin-top: 8px; background: rgba(206, 145, 120, .06); border: 1px solid rgba(206, 145, 120, .2); border-radius: 4px; padding: 8px; font-family: var(--mono); font-size: 11px; color: #ce9178; white-space: pre-wrap; line-height: 1.5; max-height: 320px; overflow-y: auto; }
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
  <h1>
    <span class="live-dot" id="dot"></span>
    ECHO trace
    <span class="sub" id="meta-sub"></span>
  </h1>
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
  <div class="col cursor"><h2>Cursor</h2><div id="list-cursor"></div></div>
</div>

<script>
(function(){
  const ENVELOPE = JSON.parse(decodeURIComponent(escape(atob('__ECHO_DATA__'))));
  const META = ENVELOPE.meta;
  const ROWS = ENVELOPE.rows;
  const SEEN = new Set(ROWS.map(r => r.id));

  const live = META.live === true;
  document.getElementById('dot').classList.toggle('on', live);
  document.getElementById('meta-sub').textContent =
    'last ' + META.days + 'd · ' + (live ? 'live' : 'snapshot') + ' · ' + (live ? 'started ' : 'generated ') + META.generatedAt;

  function refreshStats(){
    const cc = ROWS.filter(r => r.lane==='cc').length;
    const cx = ROWS.filter(r => r.lane==='codex').length;
    const cu = ROWS.filter(r => r.lane==='cursor').length;
    document.getElementById('stats').innerHTML =
      '<span class="cc">CC: ' + cc + '</span> &nbsp;·&nbsp; ' +
      '<span class="codex">Codex: ' + cx + '</span> &nbsp;·&nbsp; ' +
      '<span class="cursor">Cursor: ' + cu + '</span>';
  }

  function refreshRepoOptions(){
    const repos = Array.from(new Set(ROWS.map(r => r.repo).filter(Boolean))).sort();
    const sel = document.getElementById('repoFilter');
    const cur = sel.value;
    sel.innerHTML = '<option value="">all repos</option>' + repos.map(r => '<option>' + esc(r) + '</option>').join('');
    if (repos.includes(cur)) sel.value = cur;
  }

  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
  function fmtTs(iso){
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.replace('T',' ').slice(0,19);
    const p = n => String(n).padStart(2,'0');
    return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate())
      + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function shortRepo(p){ if(!p) return '—'; const parts=p.split('/').filter(Boolean); return parts.slice(-2).join('/'); }

  function toolHtml(t){
    const errBadge = t.is_error ? ' <span class="terror">ERROR</span>' : '';
    const args = t.args ? '<details><summary>args' + (t.args_truncated ? ' (truncated)' : '') + '</summary><pre>' + esc(t.args) + '</pre></details>' : '';
    const out = t.output ? '<details open><summary>output' + (t.output_truncated ? ' (truncated)' : '') + '</summary><pre>' + esc(t.output) + '</pre></details>' : '';
    return '<div class="tool"><span class="tname">' + esc(t.name || '?') + '</span>' + errBadge + args + out + '</div>';
  }

  function gitStateHtml(gs){
    if (!gs) return '';
    const head = gs.head_sha ? esc(String(gs.head_sha).slice(0,7)) : '?';
    const branch = gs.branch ? '@' + esc(gs.branch) : '';
    const dirty = (typeof gs.dirty_count === 'number') ? ' dirty=' + gs.dirty_count : '';
    const cls = gs.fresh ? 'gs' : 'gs stale';
    return ' <span class="' + cls + '">' + head + branch + dirty + '</span>';
  }

  function rowHtml(r){
    const tools = r.hadTool ? '<span class="tool">🔧</span>' : '';
    const tc = (r.toolCalls && r.toolCalls.length) ? ' <span class="toolcount">' + r.toolCalls.length + ' calls</span>' : '';
    const repoBranch = '<span class="repo">' + esc(shortRepo(r.repo)) + '</span>' +
      (r.branch ? '<span class="branch">@' + esc(r.branch) + '</span>' : '');
    const codexBits = (r.model || r.sandbox)
      ? ' <span class="model">' + esc([r.model, r.sandbox].filter(Boolean).join('/')) + '</span>'
      : '';
    const filesBits = r.files.length ? ' <span class="files">files=' + r.files.length + '</span>' : '';
    const gsBits = gitStateHtml(r.gitState);
    const preview = esc((r.user || '').replace(/\\s+/g,' ').slice(0,180));
    const toolsBlock = (r.toolCalls && r.toolCalls.length)
      ? '<div class="tool-list">' + r.toolCalls.map(toolHtml).join('') + '</div>' : '';
    const thinkingBlock = r.thinking
      ? '<div class="thinking">' + esc(r.thinking) + '</div>' : '';
    return (
      '<div class="row" data-id="' + esc(r.id) + '" data-lane="' + r.lane + '">' +
        '<div class="row-head">' +
          '<span class="ts">' + esc(fmtTs(r.ts)) + '</span>' +
          '<span class="sid">' + esc(r.sid) + '/#' + r.turn + '</span>' +
          tools + tc +
          repoBranch + filesBits + codexBits + gsBits +
          '<span class="preview">' + preview + '</span>' +
        '</div>' +
        '<div class="row-body">' +
          '<div class="turn-pair">' +
            '<div class="msg user"><span class="role">user</span>' + esc(r.user) + '</div>' +
            '<div class="msg asst"><span class="role">assistant</span>' + esc(r.assistant) + '</div>' +
          '</div>' +
          thinkingBlock +
          toolsBlock +
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

  function groupBySession(rows){
    const bySid = new Map();
    for (const r of rows) {
      let g = bySid.get(r.sid);
      if (!g) { g = []; bySid.set(r.sid, g); }
      g.push(r);
    }
    const groups = [];
    for (const [sid, turns] of bySid) {
      turns.sort((a,b)=>b.ts.localeCompare(a.ts));
      const latest = turns[0];
      groups.push({ sid, turns, latestTs: latest.ts, repo: latest.repo, branch: latest.branch });
    }
    groups.sort((a,b)=>b.latestTs.localeCompare(a.latestTs));
    return groups;
  }

  function sessionHtml(g, collapsedSids){
    const repoBranch = '<span class="repo">' + esc(shortRepo(g.repo)) + '</span>' +
      (g.branch ? '<span class="branch">@' + esc(g.branch) + '</span>' : '');
    const turns = g.turns.length;
    const collapsed = collapsedSids.has(g.sid) ? ' collapsed' : '';
    return (
      '<div class="session' + collapsed + '" data-sid="' + esc(g.sid) + '">' +
        '<div class="session-head">' +
          '<span class="caret">▼</span>' +
          '<span class="ssid">' + esc(g.sid) + '</span>' +
          repoBranch +
          '<span class="scount">' + turns + ' turn' + (turns===1?'':'s') + '</span>' +
          '<span class="sts">' + esc(fmtTs(g.latestTs)) + '</span>' +
        '</div>' +
        '<div class="session-body">' +
          g.turns.map(rowHtml).join('') +
        '</div>' +
      '</div>'
    );
  }

  function render(){
    const q = (document.getElementById('search').value || '').trim().toLowerCase();
    const repo = document.getElementById('repoFilter').value;
    const toolOnly = document.getElementById('toolOnly').checked;
    const hideTool = document.getElementById('hideTool').checked;
    const cc = []; const cx = []; const cu = [];
    for (const r of ROWS) {
      if (!passes(r, q, repo, toolOnly, hideTool)) continue;
      if (r.lane === 'cc') cc.push(r);
      else if (r.lane === 'codex') cx.push(r);
      else if (r.lane === 'cursor') cu.push(r);
    }
    const ccGroups = groupBySession(cc);
    const cxGroups = groupBySession(cx);
    const cuGroups = groupBySession(cu);
    const collapsedSids = new Set(
      Array.from(document.querySelectorAll('.session.collapsed'))
        .map(s => s.getAttribute('data-sid'))
    );
    document.getElementById('list-cc').innerHTML = ccGroups.length ? ccGroups.map(g => sessionHtml(g, collapsedSids)).join('') : '<div class="empty">no matches</div>';
    document.getElementById('list-codex').innerHTML = cxGroups.length ? cxGroups.map(g => sessionHtml(g, collapsedSids)).join('') : '<div class="empty">no matches</div>';
    document.getElementById('list-cursor').innerHTML = cuGroups.length ? cuGroups.map(g => sessionHtml(g, collapsedSids)).join('') : '<div class="empty">no matches</div>';
    document.getElementById('counts').textContent =
      'showing ' + cc.length + ' / ' + cx.length + ' / ' + cu.length + ' turns · ' +
      ccGroups.length + ' / ' + cxGroups.length + ' / ' + cuGroups.length + ' sessions';
  }

  document.body.addEventListener('click', (e) => {
    const sHead = e.target.closest('.session-head');
    if (sHead) {
      sHead.parentElement.classList.toggle('collapsed');
      return;
    }
    const head = e.target.closest('.row-head');
    if (!head) return;
    head.parentElement.classList.toggle('expanded');
  });

  ['search','repoFilter','toolOnly','hideTool'].forEach(id => {
    document.getElementById(id).addEventListener('input', render);
    document.getElementById(id).addEventListener('change', render);
  });

  refreshStats();
  refreshRepoOptions();
  render();

  if (live) {
    // Coalesce burst arrivals — without this, an N-tool turn fans out into N
    // synchronous re-renders. 200ms gives smooth perceived liveness while
    // keeping a single repaint per burst.
    let pending = false;
    let lastRepoCount = -1;
    function scheduleRender(){
      if (pending) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        refreshStats();
        const repoCount = new Set(ROWS.map(r => r.repo).filter(Boolean)).size;
        if (repoCount !== lastRepoCount) {
          lastRepoCount = repoCount;
          refreshRepoOptions();
        }
        render();
      }, 200);
    }
    const es = new EventSource('/events');
    es.addEventListener('row', (ev) => {
      const r = JSON.parse(ev.data);
      if (SEEN.has(r.id)) return;
      SEEN.add(r.id);
      ROWS.push(r);
      scheduleRender();
      requestAnimationFrame(() => {
        const el = document.querySelector('.row[data-id="' + CSS.escape(r.id) + '"]');
        if (el) {
          el.classList.add('fresh');
          setTimeout(() => el.classList.remove('fresh'), 4000);
        }
      });
    });
    es.onerror = () => {
      document.getElementById('dot').classList.remove('on');
    };
  }
})();
</script>
</body>
</html>
`;
