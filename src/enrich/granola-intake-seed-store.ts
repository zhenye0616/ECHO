import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Durable state machine for at-least-once Slack seeding of Granola-sourced
 * intake candidates.
 *
 *   pending  → recorded before any Slack call; retried on the next worker run
 *   posting  → a post attempt is in flight
 *   posted   → Slack acked with a `ts`; terminal, never re-posted
 *   failed   → retries exhausted; terminal + operator-visible
 *
 * Any record not in `posted`/`failed` is retryable, so a crash or transient
 * Slack failure can never convert at-least-once seeding into zero-times
 * seeding. Seeding to Slack is at-least-once by contract; exactly-once is the
 * responder's job (candidate-key dedupe on the draft), not this store's.
 */
export type GranolaIntakeSeedStatus = 'pending' | 'posting' | 'posted' | 'failed';

export interface GranolaIntakeSeedRecord {
  candidate_key: string;
  note_id: string;
  channel_id: string;
  status: GranolaIntakeSeedStatus;
  retry_count: number;
  slack_ts?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimSeedInput {
  candidateKey: string;
  noteId: string;
  channelId: string;
}

export interface GranolaIntakeSeedStore {
  get(candidateKey: string): Promise<GranolaIntakeSeedRecord | null>;
  list(): Promise<GranolaIntakeSeedRecord[]>;
  /**
   * Single-flight create/claim. Creates a `pending` record if none exists for
   * the candidate key; if one already exists it is returned unchanged. Two
   * concurrent claims for the same key converge to exactly one durable record
   * (`created` is true for at most one of them).
   */
  claim(input: ClaimSeedInput): Promise<{ record: GranolaIntakeSeedRecord; created: boolean }>;
  markPosting(candidateKey: string): Promise<GranolaIntakeSeedRecord>;
  markPosted(candidateKey: string, slackTs: string): Promise<GranolaIntakeSeedRecord>;
  /**
   * Record a failed post attempt. Increments retry_count; once it reaches
   * maxRetries the record becomes terminal `failed`, otherwise it returns to
   * `pending` for a later retry.
   */
  markFailure(
    candidateKey: string,
    error: string,
    maxRetries: number,
  ): Promise<GranolaIntakeSeedRecord>;
}

interface GranolaIntakeSeedFile {
  schema_version: 1;
  seeds: Record<string, GranolaIntakeSeedRecord>;
}

export class FileGranolaIntakeSeedStore implements GranolaIntakeSeedStore {
  private fileLock: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async get(candidateKey: string): Promise<GranolaIntakeSeedRecord | null> {
    const file = await this.readFile();
    return file.seeds[candidateKey] ?? null;
  }

  async list(): Promise<GranolaIntakeSeedRecord[]> {
    const file = await this.readFile();
    return Object.values(file.seeds);
  }

  async claim(input: ClaimSeedInput): Promise<{
    record: GranolaIntakeSeedRecord;
    created: boolean;
  }> {
    const candidateKey = requiredString(input.candidateKey, 'candidate_key');
    return this.withFileLock(async () => {
      const file = await this.readFile();
      const existing = file.seeds[candidateKey];
      if (existing !== undefined) return { record: existing, created: false };
      const now = this.now();
      const record: GranolaIntakeSeedRecord = {
        candidate_key: candidateKey,
        note_id: requiredString(input.noteId, 'note_id'),
        channel_id: requiredString(input.channelId, 'channel_id'),
        status: 'pending',
        retry_count: 0,
        created_at: now,
        updated_at: now,
      };
      file.seeds[candidateKey] = record;
      await this.writeFile(file);
      return { record, created: true };
    });
  }

  async markPosting(candidateKey: string): Promise<GranolaIntakeSeedRecord> {
    return this.mutate(candidateKey, (record) => ({
      ...record,
      status: 'posting',
      updated_at: this.now(),
    }));
  }

  async markPosted(candidateKey: string, slackTs: string): Promise<GranolaIntakeSeedRecord> {
    const ts = requiredString(slackTs, 'slack_ts');
    return this.mutate(candidateKey, (record) => ({
      ...record,
      status: 'posted',
      slack_ts: ts,
      updated_at: this.now(),
    }));
  }

  async markFailure(
    candidateKey: string,
    error: string,
    maxRetries: number,
  ): Promise<GranolaIntakeSeedRecord> {
    return this.mutate(candidateKey, (record) => {
      const retryCount = record.retry_count + 1;
      const terminal = retryCount >= maxRetries;
      return {
        ...record,
        status: terminal ? 'failed' : 'pending',
        retry_count: retryCount,
        last_error: error.slice(0, 500),
        updated_at: this.now(),
      };
    });
  }

  private async mutate(
    candidateKey: string,
    transform: (record: GranolaIntakeSeedRecord) => GranolaIntakeSeedRecord,
  ): Promise<GranolaIntakeSeedRecord> {
    return this.withFileLock(async () => {
      const file = await this.readFile();
      const record = file.seeds[candidateKey];
      if (record === undefined) throw new Error(`intake seed not found: ${candidateKey}`);
      const next = transform(record);
      file.seeds[candidateKey] = next;
      await this.writeFile(file);
      return next;
    });
  }

  private async withFileLock<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.fileLock;
    let release: () => void = () => undefined;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = previous
      .catch(() => undefined)
      .then(() => next)
      .then(() => undefined);
    this.fileLock = current;
    await previous.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
      if (this.fileLock === current) this.fileLock = Promise.resolve();
    }
  }

  private async readFile(): Promise<GranolaIntakeSeedFile> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (err) {
      if (isErrnoException(err) && err.code === 'ENOENT') {
        return { schema_version: 1, seeds: {} };
      }
      throw err;
    }
    const parsed = JSON.parse(raw) as GranolaIntakeSeedFile;
    if (parsed.schema_version !== 1 || typeof parsed.seeds !== 'object' || parsed.seeds === null) {
      throw new Error(`${this.filePath}: invalid intake seed store`);
    }
    return parsed;
  }

  private async writeFile(file: GranolaIntakeSeedFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    await rename(tmp, this.filePath);
  }
}

function requiredString(value: string | undefined, field: string): string {
  if (value === undefined || value.trim() === '') throw new Error(`${field} is required`);
  return value.trim();
}

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
