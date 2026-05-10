export type EventId = string;

export interface CaptureEvent {
  id: EventId;
  source: string;
  timestamp: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

export interface QueryFilter {
  source?: string;
  source_prefix?: string;
  since?: string;
  until?: string;
  limit?: number;
  // Default 'desc' (newest-first). Flipped from historical ASC because every
  // current caller's intent is "give me the recent N events" — ASC + LIMIT
  // silently dropped the newest. Pass 'asc' explicitly when downstream logic
  // needs oldest-first (e.g., turn-pair reconstruction).
  order?: 'asc' | 'desc';
  // Exclude rows whose metadata.surface is in this list. Used by the trace
  // tool to drop raw fs-watcher change events (`surface: 'fs'`) that the
  // normalizer throws away — they otherwise dominate storage's newest-N and
  // starve real conversation/git atoms out of the trace input.
  exclude_metadata_surface?: string[];
  // Composite-key cursor pagination boundary: returns rows strictly older than
  // (timestamp, id) under the storage `(timestamp DESC, id DESC)` ordering.
  // Defined for descending queries only — passing `before` together with
  // `order: 'asc'` MUST throw a synchronous validation error at the storage
  // seam rather than silently inverting. Adding asymmetric semantics here
  // would re-introduce the same kind of "minus 1ms" tie-skip bug the
  // composite cursor was designed to close.
  before?: { timestamp: string; id: string };
}

export interface Storage {
  append(event: Omit<CaptureEvent, 'id'>): Promise<EventId>;
  query(filter?: QueryFilter): Promise<CaptureEvent[]>;
  count(): Promise<number>;
  // Order-preserving fetch by id list. Returns events in the order of the
  // input `ids[]`; missing ids are silently filtered out (caller diffs the
  // input vs output id sets if it cares about misses). Required by the
  // V1.6 `get_atoms` MCP tool, which materialises atom bodies for ids the
  // caller already obtained from `find_clusters` / `search_memories`.
  getByIds(ids: readonly EventId[]): Promise<CaptureEvent[]>;
}
