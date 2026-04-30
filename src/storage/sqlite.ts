import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import type { CaptureEvent, EventId, QueryFilter, Storage } from './interface.js';
import { migrate } from './migrate.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

interface EventRow {
  id: string;
  source: string;
  timestamp: string;
  content: string;
  metadata: string | null;
  embedding: Buffer | null;
}

function rowToEvent(row: EventRow): CaptureEvent {
  const event: CaptureEvent = {
    id: row.id,
    source: row.source,
    timestamp: row.timestamp,
    content: row.content,
  };
  if (row.metadata !== null) {
    event.metadata = JSON.parse(row.metadata) as Record<string, unknown>;
  }
  if (row.embedding !== null) {
    const buf = row.embedding;
    event.embedding = Array.from(
      new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / Float32Array.BYTES_PER_ELEMENT),
    );
  }
  return event;
}

export class SqliteStorage implements Storage {
  private readonly db: Database.Database;
  private readonly insertStmt: Database.Statement;
  private readonly countStmt: Database.Statement;
  private closed = false;

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    migrate(this.db, MIGRATIONS_DIR);

    this.insertStmt = this.db.prepare(
      `INSERT INTO events (id, source, timestamp, content, metadata, embedding)
       VALUES (@id, @source, @timestamp, @content, @metadata, @embedding)`,
    );
    this.countStmt = this.db.prepare(`SELECT COUNT(*) AS n FROM events`);
  }

  async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
    const id: EventId = randomUUID();
    const metadata = event.metadata !== undefined ? JSON.stringify(event.metadata) : null;
    const embedding =
      event.embedding !== undefined ? Buffer.from(new Float32Array(event.embedding).buffer) : null;
    this.insertStmt.run({
      id,
      source: event.source,
      timestamp: event.timestamp,
      content: event.content,
      metadata,
      embedding,
    });
    return id;
  }

  async query(filter?: QueryFilter): Promise<CaptureEvent[]> {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter?.source !== undefined) {
      clauses.push('source = @source');
      params['source'] = filter.source;
    }
    if (filter?.since !== undefined) {
      clauses.push('timestamp >= @since');
      params['since'] = filter.since;
    }
    if (filter?.until !== undefined) {
      clauses.push('timestamp < @until');
      params['until'] = filter.until;
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const limitClause = filter?.limit !== undefined ? 'LIMIT @limit' : '';
    if (filter?.limit !== undefined) params['limit'] = filter.limit;

    const sql = `SELECT id, source, timestamp, content, metadata, embedding FROM events ${where} ORDER BY timestamp ASC ${limitClause}`;
    const rows = this.db.prepare(sql).all(params) as EventRow[];
    return rows.map(rowToEvent);
  }

  async count(): Promise<number> {
    const row = this.countStmt.get() as { n: number };
    return row.n;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.db.close();
  }
}
