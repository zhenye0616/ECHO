import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { parse } from 'smol-toml';
import { atomicWrite } from '../../echo-home/adapters/atomic-write.js';

export type RemoveCodexMcpEntryResult = {
  action: 'removed' | 'noop' | 'conflict';
  reason?: 'file-missing' | 'entry-missing' | 'parse-error' | 'symlink-target';
};

interface LineSlice {
  content: string;
  start: number;
  end: number;
}

function linesWithOffsets(text: string): LineSlice[] {
  const out: LineSlice[] = [];
  let pos = 0;
  while (pos < text.length) {
    const nl = text.indexOf('\n', pos);
    const end = nl === -1 ? text.length : nl + 1;
    out.push({ content: text.slice(pos, nl === -1 ? end : nl), start: pos, end });
    pos = end;
  }
  return out;
}

function isEchoHeader(line: string): boolean {
  return /^\uFEFF?\s*\[mcp_servers\.echo\]\s*(#.*)?$/.test(line);
}

function isAnyHeader(line: string): boolean {
  return /^\s*\[\[?[^\]]+\]\]?\s*(#.*)?$/.test(line);
}

function findEchoRange(text: string): { start: number; end: number } | null {
  const lines = linesWithOffsets(text);
  const startIdx = lines.findIndex((line) => isEchoHeader(line.content));
  if (startIdx === -1) return null;
  let end = text.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (isAnyHeader(lines[i]!.content)) {
      end = lines[i]!.start;
      break;
    }
  }
  return { start: lines[startIdx]!.start, end };
}

function collapseOuterBlank(before: string, after: string): string {
  let left = before;
  let right = after;
  if (/[^\S\r\n]*(\r?\n)[^\S\r\n]*(\r?\n)$/.test(left)) {
    left = left.replace(/[^\S\r\n]*(\r?\n)[^\S\r\n]*(\r?\n)$/, '$1');
  }
  if (/^[^\S\r\n]*(\r?\n)/.test(right)) {
    right = right.replace(/^[^\S\r\n]*(\r?\n)/, '');
  }
  return `${left}${right}`;
}

export function removeCodexMcpEntry(opts: { filePath: string }): RemoveCodexMcpEntryResult {
  const { filePath } = opts;
  if (!existsSync(filePath)) return { action: 'noop', reason: 'file-missing' };
  if (lstatSync(filePath).isSymbolicLink()) {
    return { action: 'conflict', reason: 'symlink-target' };
  }
  const original = readFileSync(filePath, 'utf8');
  try {
    parse(original);
  } catch {
    return { action: 'conflict', reason: 'parse-error' };
  }
  const range = findEchoRange(original);
  if (range === null) return { action: 'noop', reason: 'entry-missing' };
  const content = collapseOuterBlank(original.slice(0, range.start), original.slice(range.end));
  atomicWrite({ filePath, content, secretSensitive: true });
  return { action: 'removed' };
}
