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
}

export interface Storage {
  append(event: Omit<CaptureEvent, 'id'>): Promise<EventId>;
  query(filter?: QueryFilter): Promise<CaptureEvent[]>;
  count(): Promise<number>;
}
