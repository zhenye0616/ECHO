import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Logger } from '../../logging/index.js';

export function dedupStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

// On daemon boot, chokidar's `ignoreInitial: true` suppresses the `add` events
// for already-existing JSONL files, and the offset-map backfill only seeds
// entries for files already in storage. Files that exist at boot AND never
// see a post-boot write — most acutely, write-then-closed subagent JSONLs —
// would otherwise be silently never processed. This walk schedules one
// `handle` call per existing `.jsonl` so the offset-map's prior bytes are
// honored and only newly-appended bytes get emitted as fresh CaptureEvents.
export async function bootScanJsonl(
  prefix: string,
  schedule: (work: () => Promise<void>) => void,
  handle: (path: string) => Promise<void>,
  log: Logger,
): Promise<void> {
  try {
    const entries = await readdir(prefix, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.jsonl')) continue;
      schedule(() => handle(join(entry.parentPath, entry.name)));
    }
  } catch (err) {
    log.warn('boot_scan_failed', { prefix, message: (err as Error).message });
  }
}
