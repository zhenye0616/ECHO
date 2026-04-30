import type { CaptureEvent, EventId, Storage } from '../storage/interface.js';
import { gate, type RejectionReason } from './gate.js';

export type PipelineResult =
  | { accepted: true; id: EventId }
  | { accepted: false; reason: RejectionReason };

export async function processCandidate(event: unknown, storage: Storage): Promise<PipelineResult> {
  const result = gate(event);
  if (!result.accepted) {
    return { accepted: false, reason: result.reason };
  }

  const validated = event as {
    source: string;
    timestamp: string;
    content: string;
    metadata?: Record<string, unknown>;
  };

  const toAppend: Omit<CaptureEvent, 'id'> = {
    source: validated.source,
    timestamp: validated.timestamp,
    content: validated.content,
  };
  if (validated.metadata !== undefined) {
    toAppend.metadata = validated.metadata;
  }

  const id = await storage.append(toAppend);
  return { accepted: true, id };
}
