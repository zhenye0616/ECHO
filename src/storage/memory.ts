import { randomUUID } from 'node:crypto';
import type { CaptureEvent, EventId, QueryFilter, Storage } from './interface.js';

export class MemoryStorage implements Storage {
  private readonly events: CaptureEvent[] = [];

  async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
    const id: EventId = randomUUID();
    this.events.push({ ...event, id });
    return id;
  }

  async query(filter?: QueryFilter): Promise<CaptureEvent[]> {
    const source = filter?.source;
    const sourcePrefix = filter?.source_prefix;
    if (source !== undefined && sourcePrefix !== undefined) {
      throw new Error('QueryFilter.source and source_prefix are mutually exclusive');
    }
    if (filter?.before !== undefined && filter?.order === 'asc') {
      throw new RangeError(
        'QueryFilter.before is defined for descending queries only; pass order: "desc" or omit it',
      );
    }
    const since = filter?.since;
    const until = filter?.until;
    const limit = filter?.limit;
    const order = filter?.order ?? 'desc';
    const before = filter?.before;
    const excludeSurfaces =
      filter?.exclude_metadata_surface !== undefined && filter.exclude_metadata_surface.length > 0
        ? new Set(filter.exclude_metadata_surface)
        : undefined;

    // Filter first (full pass), then sort by (timestamp, id) in the requested
    // order, then truncate. Sorting before truncation preserves "keep the
    // newest N" semantics regardless of insertion order. Tie-break on `id`
    // matches the sqlite adapter's `ORDER BY timestamp DESC, id DESC` (and
    // ASC, ASC) — parallel directions, never mixed.
    const filtered: CaptureEvent[] = [];
    for (const event of this.events) {
      if (source !== undefined && event.source !== source) continue;
      if (sourcePrefix !== undefined && !event.source.startsWith(sourcePrefix)) continue;
      if (since !== undefined && event.timestamp < since) continue;
      if (until !== undefined && event.timestamp >= until) continue;
      if (before !== undefined) {
        // Row-value comparison equivalent to sqlite's `(timestamp, id) < (...)`.
        if (event.timestamp > before.timestamp) continue;
        if (event.timestamp === before.timestamp && event.id >= before.id) continue;
      }
      if (excludeSurfaces !== undefined) {
        const surface = (event.metadata as { surface?: unknown } | undefined)?.surface;
        if (typeof surface === 'string' && excludeSurfaces.has(surface)) continue;
      }
      filtered.push(event);
    }
    filtered.sort((a, b) => {
      if (a.timestamp < b.timestamp) return order === 'asc' ? -1 : 1;
      if (a.timestamp > b.timestamp) return order === 'asc' ? 1 : -1;
      if (a.id < b.id) return order === 'asc' ? -1 : 1;
      if (a.id > b.id) return order === 'asc' ? 1 : -1;
      return 0;
    });
    if (limit !== undefined && filtered.length > limit) {
      return filtered.slice(0, limit);
    }
    return filtered;
  }

  async count(): Promise<number> {
    return this.events.length;
  }

  async getByIds(ids: readonly EventId[]): Promise<CaptureEvent[]> {
    if (ids.length === 0) return [];
    // Re-order by input `ids[]` so the order-preserving contract holds
    // regardless of insertion order. Missing ids are silently dropped
    // here; get_atoms surfaces them in atoms_dropped_ids.
    const wanted = new Set(ids);
    const byId = new Map<EventId, CaptureEvent>();
    for (const e of this.events) {
      if (wanted.has(e.id)) byId.set(e.id, e);
    }
    const out: CaptureEvent[] = [];
    for (const id of ids) {
      const ev = byId.get(id);
      if (ev !== undefined) out.push(ev);
    }
    return out;
  }
}
