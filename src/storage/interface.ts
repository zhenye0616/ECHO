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
}

export interface Storage {
  append(event: Omit<CaptureEvent, 'id'>): Promise<EventId>;
  query(filter?: QueryFilter): Promise<CaptureEvent[]>;
  count(): Promise<number>;
}
