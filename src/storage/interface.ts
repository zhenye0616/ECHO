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
}

export interface Storage {
  append(event: Omit<CaptureEvent, 'id'>): Promise<EventId>;
  query(filter?: QueryFilter): Promise<CaptureEvent[]>;
  count(): Promise<number>;
}
