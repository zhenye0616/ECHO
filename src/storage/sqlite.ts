import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import {
  METADATA_MATCH_KEY_WHITELIST,
  type CaptureEvent,
  type EventId,
  type QueryFilter,
  type Storage,
} from './interface.js';
import { canonicalizeTimestamps, migrate } from './migrate.js';
import { createLogger } from '../logging/index.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

const log = createLogger('storage.sqlite');

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
  private readonly queryStmtCache = new Map<string, Database.Statement>();

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    // NORMAL is safe under WAL and avoids per-append fsync — recommended by SQLite for app use.
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    migrate(this.db, MIGRATIONS_DIR);
    const { converted } = canonicalizeTimestamps(this.db);
    if (converted > 0) {
      log.info('canonicalized_timestamps', { converted });
    }

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
    if (filter?.source !== undefined && filter?.source_prefix !== undefined) {
      throw new Error('QueryFilter.source and source_prefix are mutually exclusive');
    }
    if (filter?.before !== undefined && filter?.order === 'asc') {
      throw new RangeError(
        'QueryFilter.before is defined for descending queries only; pass order: "desc" or omit it',
      );
    }
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter?.source !== undefined) {
      clauses.push('source = @source');
      params['source'] = filter.source;
    }
    if (filter?.source_prefix !== undefined) {
      clauses.push("source LIKE @source_prefix || '%' ESCAPE '\\'");
      params['source_prefix'] = filter.source_prefix.replace(/[\\%_]/g, '\\$&');
    }
    if (filter?.since !== undefined) {
      clauses.push('timestamp >= @since');
      params['since'] = filter.since;
    }
    if (filter?.until !== undefined) {
      clauses.push('timestamp < @until');
      params['until'] = filter.until;
    }
    if (filter?.before !== undefined) {
      // SQLite ≥3.0 supports row-value comparison; this is the canonical way
      // to express "rows strictly older than (ts, id)" in the composite-key
      // ordering and matches the JS predicate in MemoryStorage exactly.
      clauses.push('(timestamp, id) < (@before_ts, @before_id)');
      params['before_ts'] = filter.before.timestamp;
      params['before_id'] = filter.before.id;
    }
    if (filter?.metadata_match !== undefined) {
      // Whitelist enforcement lives at the storage seam (NOT only the MCP
      // tool) so even direct storage callers can't probe arbitrary JSON
      // paths. Empty `{}` is a no-op (no clause added). Each entry binds
      // its value through a named placeholder — no string interpolation
      // of either keys (which are whitelisted, then literal-baked into
      // the SQL text) or values.
      for (const key of Object.keys(filter.metadata_match)) {
        if (!METADATA_MATCH_KEY_WHITELIST.has(key)) {
          throw new Error(
            `QueryFilter.metadata_match key "${key}" is not on the whitelist (${[
              ...METADATA_MATCH_KEY_WHITELIST,
            ].join(', ')})`,
          );
        }
      }
      // Sorted key iteration: keeps the generated SQL text deterministic
      // across call shapes that pass the same key set in different
      // orders, so the prepared-statement cache below keys cleanly.
      // Note: the cache is keyed on the FULL `sql` text, so each distinct
      // metadata_match key combination produces its own cached prepared
      // statement. That is fine in practice — the whitelist is tiny (3
      // keys ⇒ at most 7 non-empty subsets) so the cache size is bounded.
      const matchKeys = Object.keys(filter.metadata_match).sort();
      matchKeys.forEach((key, i) => {
        const placeholder = `__metadata_match_${i}`;
        clauses.push(`json_extract(metadata, '$.${key}') = @${placeholder}`);
        params[placeholder] = filter.metadata_match![key];
      });
    }
    if (
      filter?.exclude_metadata_surface !== undefined &&
      filter.exclude_metadata_surface.length > 0
    ) {
      // SQL parameter binding doesn't support IN-list expansion directly with
      // better-sqlite3 named params, so the clause is built with positional
      // placeholders and the list is encoded into params under indexed names.
      const placeholders: string[] = [];
      filter.exclude_metadata_surface.forEach((surface, i) => {
        const key = `__exclude_surface_${i}`;
        placeholders.push(`@${key}`);
        params[key] = surface;
      });
      clauses.push(
        `COALESCE(json_extract(metadata, '$.surface'), '') NOT IN (${placeholders.join(', ')})`,
      );
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const limitClause = filter?.limit !== undefined ? 'LIMIT @limit' : '';
    if (filter?.limit !== undefined) params['limit'] = filter.limit;

    const order = filter?.order ?? 'desc';
    const orderSql = order === 'asc' ? 'ASC' : 'DESC';
    // `id` follows the same direction as `timestamp` so same-millisecond ties
    // resolve deterministically. Mixing directions (e.g. `timestamp DESC, id
    // ASC`) would reopen the same-ms tie-skip class of bug that the composite
    // cursor was designed to close. Asc and desc both get parallel keys.
    const sql = `SELECT id, source, timestamp, content, metadata, embedding FROM events ${where} ORDER BY timestamp ${orderSql}, id ${orderSql} ${limitClause}`;
    let stmt = this.queryStmtCache.get(sql);
    if (stmt === undefined) {
      stmt = this.db.prepare(sql);
      this.queryStmtCache.set(sql, stmt);
    }
    const rows = stmt.all(params) as EventRow[];
    return rows.map(rowToEvent);
  }

  async count(): Promise<number> {
    const row = this.countStmt.get() as { n: number };
    return row.n;
  }

  async getByIds(ids: readonly EventId[]): Promise<CaptureEvent[]> {
    if (ids.length === 0) return [];
    // Bind each id positionally — IN-list expansion isn't supported via
    // named params in better-sqlite3. `WHERE id IN (?...)` returns rows in
    // storage order, so we re-order by the input `ids[]` to satisfy the
    // interface's order-preserving contract. Missing ids are silently
    // dropped here; the get_atoms tool surfaces them in atoms_dropped_ids.
    const placeholders = ids.map(() => '?').join(',');
    const rows = this.db
      .prepare(
        `SELECT id, source, timestamp, content, metadata, embedding FROM events WHERE id IN (${placeholders})`,
      )
      .all(...ids) as EventRow[];
    const byId = new Map<EventId, CaptureEvent>();
    for (const row of rows) {
      byId.set(row.id, rowToEvent(row));
    }
    const out: CaptureEvent[] = [];
    for (const id of ids) {
      const ev = byId.get(id);
      if (ev !== undefined) out.push(ev);
    }
    return out;
  }

  close(): void {
    if (!this.db.open) return;
    this.db.close();
  }
}
