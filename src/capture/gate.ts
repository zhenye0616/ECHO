import { createLogger } from '../logging/index.js';
import {
  isAllowedApi,
  isAllowedApp,
  isAllowedDomain,
  isAllowedPath,
} from './sources.js';

export interface CandidateEvent {
  source: string;
  timestamp: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export type RejectionReason =
  | 'unknown_app'
  | 'unknown_domain'
  | 'unknown_path'
  | 'unknown_api'
  | 'malformed_event';

export type GateResult =
  | { accepted: true; reason: 'allowlisted' }
  | { accepted: false; reason: RejectionReason };

const log = createLogger('capture.gate');

const SOURCE_KIND_TO_REJECTION: Record<
  'app' | 'domain' | 'fs' | 'api',
  Extract<RejectionReason, `unknown_${string}`>
> = {
  app: 'unknown_app',
  domain: 'unknown_domain',
  fs: 'unknown_path',
  api: 'unknown_api',
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function parseSource(
  source: string,
): { kind: 'app' | 'domain' | 'fs' | 'api'; id: string } | null {
  const sep = source.indexOf(':');
  if (sep <= 0 || sep === source.length - 1) return null;
  const kind = source.slice(0, sep);
  const id = source.slice(sep + 1);
  if (kind === 'app' || kind === 'domain' || kind === 'fs' || kind === 'api') {
    return { kind, id };
  }
  return null;
}

export function gate(event: unknown): GateResult {
  if (!isPlainObject(event)) {
    log.warn('rejected', { reason: 'malformed_event' });
    return { accepted: false, reason: 'malformed_event' };
  }

  const { source, timestamp, content, metadata } = event;

  if (!isNonEmptyString(source) || !isNonEmptyString(timestamp) || typeof content !== 'string') {
    log.warn('rejected', { reason: 'malformed_event', source: typeof source === 'string' ? source : undefined });
    return { accepted: false, reason: 'malformed_event' };
  }

  if (metadata !== undefined && !isPlainObject(metadata)) {
    log.warn('rejected', { reason: 'malformed_event', source });
    return { accepted: false, reason: 'malformed_event' };
  }

  const parsed = parseSource(source);
  if (parsed === null) {
    log.warn('rejected', { reason: 'malformed_event', source });
    return { accepted: false, reason: 'malformed_event' };
  }

  const allowed =
    parsed.kind === 'app'
      ? isAllowedApp(parsed.id)
      : parsed.kind === 'domain'
        ? isAllowedDomain(parsed.id)
        : parsed.kind === 'fs'
          ? isAllowedPath(parsed.id)
          : isAllowedApi(parsed.id);

  if (allowed) {
    log.info('accepted', { source, timestamp });
    return { accepted: true, reason: 'allowlisted' };
  }

  const reason = SOURCE_KIND_TO_REJECTION[parsed.kind];
  log.warn('rejected', { reason, source });
  return { accepted: false, reason };
}
