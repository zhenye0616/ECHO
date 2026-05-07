import { createHash } from 'node:crypto';
import type { CaptureEvent } from '../../storage/interface.js';
import { NormalizationError } from '../errors.js';
import type { ProvenanceRef } from '../types.js';

const TURN_PAIR_RE = /^USER: ([\s\S]*?)\n\nASSISTANT: ([\s\S]*)$/;

export function parseTurnPair(content: string): { user: string; assistant: string } {
  const m = TURN_PAIR_RE.exec(content);
  if (m === null) {
    throw new Error('content does not match USER: ... \\n\\nASSISTANT: ... envelope');
  }
  return { user: m[1] as string, assistant: m[2] as string };
}

export function tryParseTurnPair(content: string): { user: string; assistant: string } | null {
  const m = TURN_PAIR_RE.exec(content);
  if (m === null) return null;
  return { user: m[1] as string, assistant: m[2] as string };
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function buildProvenance(
  event: CaptureEvent,
  extractorVersion: string,
): ProvenanceRef {
  return {
    source_event_id: event.id,
    raw_payload_hash: sha256Hex(event.content),
    extractor_version: extractorVersion,
  };
}

export function fail(event: CaptureEvent, message: string): never {
  throw new NormalizationError(message, event);
}

export function getString(
  meta: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (meta === undefined) return undefined;
  const v = meta[key];
  return typeof v === 'string' ? v : undefined;
}

export function getNumber(
  meta: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  if (meta === undefined) return undefined;
  const v = meta[key];
  return typeof v === 'number' ? v : undefined;
}

export function getBoolean(
  meta: Record<string, unknown> | undefined,
  key: string,
): boolean | undefined {
  if (meta === undefined) return undefined;
  const v = meta[key];
  return typeof v === 'boolean' ? v : undefined;
}

export function getStringArray(
  meta: Record<string, unknown> | undefined,
  key: string,
): string[] | undefined {
  if (meta === undefined) return undefined;
  const v = meta[key];
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === 'string') out.push(item);
  }
  return out;
}

export function getRecord(
  meta: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | undefined {
  if (meta === undefined) return undefined;
  const v = meta[key];
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return undefined;
}

export function extractOpenLoopHints(input: string, output: string): string[] {
  const hints: string[] = [];
  const userTrim = input.trim();
  if (userTrim.length > 0 && userTrim.endsWith('?')) hints.push('ends_with_question');
  if (/\b(TODO|FIXME)\b/.test(`${input}\n${output}`)) hints.push('contains_todo');
  const assistantTrim = output.trim();
  if (assistantTrim.length > 0 && assistantTrim.endsWith('?')) {
    hints.push('unresolved_assistant_q');
  }
  if (/\b(follow up|will do later|come back to)\b/i.test(`${input}\n${output}`)) {
    hints.push('explicit_followup');
  }
  return hints;
}
