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
    const since = filter?.since;
    const until = filter?.until;
    const limit = filter?.limit;
    const order = filter?.order ?? 'desc';

    // Filter first (full pass), then sort by timestamp in the requested order,
    // then truncate. Sorting before truncation preserves "keep the newest N"
    // semantics regardless of insertion order.
    const filtered: CaptureEvent[] = [];
    for (const event of this.events) {
      if (source !== undefined && event.source !== source) continue;
      if (sourcePrefix !== undefined && !event.source.startsWith(sourcePrefix)) continue;
      if (since !== undefined && event.timestamp < since) continue;
      if (until !== undefined && event.timestamp >= until) continue;
      filtered.push(event);
    }
    filtered.sort((a, b) => {
      if (a.timestamp < b.timestamp) return order === 'asc' ? -1 : 1;
      if (a.timestamp > b.timestamp) return order === 'asc' ? 1 : -1;
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
}
