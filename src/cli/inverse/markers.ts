import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { atomicWrite } from '../../echo-home/adapters/atomic-write.js';
import { BEGIN_MARKER, END_MARKER } from '../../echo-home/adapters/markers.js';

export interface StripMarkersOpts {
  filePath: string;
}

export type StripMarkersResult =
  | { action: 'stripped'; filePath: string; bytesBefore: number; bytesAfter: number }
  | { action: 'noop'; filePath: string; reason: 'file-missing' | 'no-markers' }
  | { action: 'conflict'; filePath: string; reason: 'malformed-markers' | 'symlink-target' };

function count(text: string, needle: string): number {
  let n = 0;
  let pos = 0;
  while ((pos = text.indexOf(needle, pos)) !== -1) {
    n++;
    pos += needle.length;
  }
  return n;
}

function lineStart(text: string, idx: number): number {
  const prev = text.lastIndexOf('\n', idx);
  return prev === -1 ? 0 : prev + 1;
}

function lineEnd(text: string, idx: number): number {
  const next = text.indexOf('\n', idx);
  return next === -1 ? text.length : next + 1;
}

function collapseBlankJoin(before: string, after: string): string {
  let left = before;
  let right = after;
  if (/\n[ \t]*\n$/.test(left) && /^[ \t]*\n/.test(right)) {
    left = left.replace(/\n[ \t]*\n$/, '\n');
    right = right.replace(/^[ \t]*\n/, '');
  }
  return `${left}${right}`;
}

export function stripEchoMarkers(opts: StripMarkersOpts): StripMarkersResult {
  const { filePath } = opts;
  if (!existsSync(filePath)) return { action: 'noop', filePath, reason: 'file-missing' };
  if (lstatSync(filePath).isSymbolicLink()) {
    return { action: 'conflict', filePath, reason: 'symlink-target' };
  }
  const original = readFileSync(filePath, 'utf8');
  const beginCount = count(original, BEGIN_MARKER);
  const endCount = count(original, END_MARKER);
  if (beginCount === 0 && endCount === 0) return { action: 'noop', filePath, reason: 'no-markers' };
  const beginIdx = original.indexOf(BEGIN_MARKER);
  const endIdx = original.indexOf(END_MARKER);
  if (beginCount !== 1 || endCount !== 1 || beginIdx > endIdx) {
    return { action: 'conflict', filePath, reason: 'malformed-markers' };
  }
  const start = lineStart(original, beginIdx);
  const end = lineEnd(original, endIdx);
  const content = collapseBlankJoin(original.slice(0, start), original.slice(end));
  atomicWrite({ filePath, content, secretSensitive: false });
  return {
    action: 'stripped',
    filePath,
    bytesBefore: Buffer.byteLength(original),
    bytesAfter: Buffer.byteLength(content),
  };
}
