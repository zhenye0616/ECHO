import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { DecisionCard, DecisionSignal } from './decision-card-types.js';

export const DEFAULT_STALE_TOUCH_THRESHOLD = 4;
export const DEFAULT_ACTIVE_ITEM_SCAN_LIMIT = 100;

const ACTIVE_BACKLOG_DIRS = ['ready', 'claimed', 'pending_review'] as const;

type ActiveBacklogDir = (typeof ACTIVE_BACKLOG_DIRS)[number];

interface Frontmatter {
  [key: string]: unknown;
}

export interface CombinedRound {
  round: number;
  path: string;
  frontmatter: Frontmatter;
}

export interface PlaybookDecisionProjection {
  decisions: DecisionCard[];
  source_breakdown: Record<string, number>;
  scanned_items: number;
  partial: boolean;
}

export interface ProjectPlaybookDecisionsOptions {
  staleTouchThreshold?: number;
  scanLimit?: number;
}

export function projectPlaybookDecisions(
  repoRoot: string,
  options: ProjectPlaybookDecisionsOptions = {},
): PlaybookDecisionProjection {
  const root = resolve(repoRoot);
  const scanLimit = options.scanLimit ?? DEFAULT_ACTIVE_ITEM_SCAN_LIMIT;
  const staleTouchThreshold = options.staleTouchThreshold ?? DEFAULT_STALE_TOUCH_THRESHOLD;
  const activeItems = listActiveItems(root);
  const scanned = activeItems.slice(0, scanLimit);
  const partial = activeItems.length > scanned.length;
  const decisions: DecisionCard[] = [];
  let reviewRounds = 0;

  for (const item of scanned) {
    const itemFm = parseFrontmatterFile(item.path);
    const itemId = stringField(itemFm, 'id') ?? basename(item.path, '.md');
    const rounds = readCombinedRounds(root, itemId);
    reviewRounds += rounds.length;
    const latest = rounds.at(-1);
    if (latest === undefined) continue;
    if (!isUnresolved(latest.frontmatter)) continue;

    const escalated = booleanField(latest.frontmatter, 'escalated_to_founder') ?? false;
    const blindRoundCount = consecutiveBlindRoundCount(rounds);
    const signals = buildSignals(blindRoundCount, staleTouchThreshold);
    if (!escalated && signals.length === 0) continue;

    decisions.push(
      buildDecisionCard({
        repoRoot: root,
        stage: item.stage,
        itemPath: item.path,
        itemId,
        itemTitle: stringField(itemFm, 'title') ?? itemId,
        latest,
        escalated,
        blindRoundCount,
        signals,
      }),
    );
  }

  return {
    decisions,
    source_breakdown: {
      active_items: scanned.length,
      review_rounds: reviewRounds,
      decisions: decisions.length,
    },
    scanned_items: scanned.length,
    partial,
  };
}

export function readCombinedRounds(repoRoot: string, itemId: string): CombinedRound[] {
  const reviewsDir = join(resolve(repoRoot), 'backlog', 'reviews', itemId);
  if (!existsSync(reviewsDir)) return [];
  return readdirSync(reviewsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^r\d+$/.test(entry.name))
    .map((entry) => {
      const round = Number(entry.name.slice(1));
      const path = join(reviewsDir, entry.name, 'combined.md');
      if (!existsSync(path)) return null;
      return { round, path, frontmatter: parseFrontmatterFile(path) };
    })
    .filter((round): round is CombinedRound => round !== null)
    .sort((a, b) => a.round - b.round);
}

export function consecutiveBlindRoundCount(rounds: readonly CombinedRound[]): number {
  let count = 0;
  for (let i = rounds.length - 1; i >= 0; i -= 1) {
    const escalated = booleanField(rounds[i]!.frontmatter, 'escalated_to_founder') ?? false;
    if (escalated) break;
    count += 1;
  }
  return count;
}

function listActiveItems(repoRoot: string): { stage: ActiveBacklogDir; path: string }[] {
  const out: { stage: ActiveBacklogDir; path: string }[] = [];
  for (const stage of ACTIVE_BACKLOG_DIRS) {
    const dir = join(repoRoot, 'backlog', stage);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      out.push({ stage, path: join(dir, entry.name) });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function buildSignals(blindRoundCount: number, threshold: number): DecisionSignal[] {
  if (blindRoundCount < threshold) return [];
  return [
    {
      kind: 'runaway_churn',
      detail: `churned ${blindRoundCount} rounds without pulling you in`,
    },
  ];
}

function buildDecisionCard(args: {
  repoRoot: string;
  stage: ActiveBacklogDir;
  itemPath: string;
  itemId: string;
  itemTitle: string;
  latest: CombinedRound;
  escalated: boolean;
  blindRoundCount: number;
  signals: DecisionSignal[];
}): DecisionCard {
  const verdict = stringField(args.latest.frontmatter, 'combined_verdict') ?? 'unknown';
  const roundLabel = `r${args.latest.round}`;
  const relativeItemPath = relativeToRepo(args.repoRoot, args.itemPath);
  const relativeRoundDir = relativeToRepo(args.repoRoot, resolve(args.latest.path, '..'));
  const whyParts = [roundLabel, verdict];
  if (args.escalated) {
    whyParts.push('escalated to founder');
  } else if (args.signals.length > 0) {
    whyParts.push(`${args.blindRoundCount} blind rounds`);
  }

  return {
    id: `${args.itemId}#${roundLabel}`,
    title: `${shortItemNumber(args.itemId)} - ${cleanTitle(args.itemTitle)}`,
    decision: args.escalated
      ? `Decide the founder-escalated review outcome for ${roundLabel}.`
      : `Decide whether to intervene in blind reviewer churn for ${roundLabel}.`,
    whyNow: whyParts.join(' - '),
    options: ['proceed_after_patches', 'pushback', 'more rounds'],
    default: verdict,
    blocking: [`${args.stage}/${args.itemId}`],
    agents: agentsFromCombined(args.latest.frontmatter),
    sources: [
      { label: 'Combined review', href: args.latest.path },
      { label: 'Review round', href: join(args.repoRoot, relativeRoundDir) },
      { label: 'Backlog item', href: join(args.repoRoot, relativeItemPath) },
    ],
    signals: args.signals,
  };
}

function isUnresolved(fm: Frontmatter): boolean {
  const next = fm['next_round'];
  return next === null || next === undefined || next === '';
}

function agentsFromCombined(fm: Frontmatter): string[] {
  return Object.entries(fm)
    .filter(([key, value]) => key.endsWith('_response') && typeof value === 'string' && value.length > 0)
    .map(([key]) => key.slice(0, -'_response'.length))
    .sort();
}

function parseFrontmatterFile(path: string): Frontmatter {
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (match === null) return {};
  const fm: Frontmatter = {};
  for (const rawLine of match[1]!.split(/\r?\n/)) {
    if (rawLine.trim().length === 0 || rawLine.startsWith(' ') || rawLine.startsWith('- ')) continue;
    const pair = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair === null) continue;
    fm[pair[1]!] = parseScalar(pair[2] ?? '');
  }
  return fm;
}

function parseScalar(rawValue: string): unknown {
  const withoutComment = stripInlineComment(rawValue).trim();
  if (withoutComment === '' || withoutComment === 'null' || withoutComment === 'None' || withoutComment === '~') {
    return null;
  }
  if (withoutComment === 'true') return true;
  if (withoutComment === 'false') return false;
  if (/^-?\d+$/.test(withoutComment)) return Number(withoutComment);
  if (
    (withoutComment.startsWith('"') && withoutComment.endsWith('"')) ||
    (withoutComment.startsWith("'") && withoutComment.endsWith("'"))
  ) {
    return withoutComment.slice(1, -1);
  }
  return withoutComment;
}

function stripInlineComment(value: string): string {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if ((ch === '"' || ch === "'") && (i === 0 || value[i - 1] !== '\\')) {
      quote = quote === ch ? null : quote === null ? ch : quote;
    }
    if (ch === '#' && quote === null && (i === 0 || /\s/.test(value[i - 1]!))) {
      return value.slice(0, i);
    }
  }
  return value;
}

function stringField(fm: Frontmatter, key: string): string | null {
  const value = fm[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function booleanField(fm: Frontmatter, key: string): boolean | null {
  const value = fm[key];
  return typeof value === 'boolean' ? value : null;
}

function shortItemNumber(itemId: string): string {
  return itemId.match(/^\d{4}-\d{2}-\d{2}-(\d{3})-/)?.[1] ?? itemId;
}

function cleanTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim();
}

function relativeToRepo(repoRoot: string, path: string): string {
  return resolve(path).startsWith(resolve(repoRoot)) ? resolve(path).slice(resolve(repoRoot).length + 1) : path;
}
