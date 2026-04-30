import { randomUUID } from 'node:crypto';
import type {
  CaptureEvent,
  EventId,
  QueryFilter,
  Storage,
} from './interface.js';

export class MemoryStorage implements Storage {
  private readonly events: CaptureEvent[] = [];

  async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
    const id: EventId = randomUUID();
    this.events.push({ ...event, id });
    return id;
  }

  async query(filter?: QueryFilter): Promise<CaptureEvent[]> {
    const source = filter?.source;
    const since = filter?.since;
    const until = filter?.until;
    const limit = filter?.limit;

    const matches: CaptureEvent[] = [];
    for (const event of this.events) {
      if (source !== undefined && event.source !== source) continue;
      if (since !== undefined && event.timestamp < since) continue;
      if (until !== undefined && event.timestamp >= until) continue;
      matches.push(event);
      if (limit !== undefined && matches.length >= limit) break;
    }
    return matches;
  }

  async count(): Promise<number> {
    return this.events.length;
  }
}
