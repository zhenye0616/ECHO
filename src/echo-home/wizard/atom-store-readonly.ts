import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import {
  METADATA_MATCH_KEY_WHITELIST,
  type CaptureEvent,
  type CoordAtomIterationRecord,
  type EventId,
  type QueryFilter,
  type Storage,
} from '../../storage/interface.js';

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

function wizardScopeError(): Error {
  return new Error('read-only storage adapter — wizard scope');
}

class ReadOnlyAtomStore implements Storage {
  private readonly queryStmtCache = new Map<string, Database.Statement>();

  constructor(private readonly db: Database.Database) {}

  async append(): Promise<EventId> {
    throw wizardScopeError();
  }

  async query(filter?: QueryFilter): Promise<CaptureEvent[]> {
    if (filter?.source !== undefined && filter.source_prefix !== undefined) {
      throw new Error('QueryFilter.source and source_prefix are mutually exclusive');
    }
    if (filter?.before !== undefined && filter.order === 'asc') {
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
      clauses.push('(timestamp, id) < (@before_ts, @before_id)');
      params['before_ts'] = filter.before.timestamp;
      params['before_id'] = filter.before.id;
    }
    if (filter?.metadata_match !== undefined) {
      const matchKeys = Object.keys(filter.metadata_match).sort();
      for (const key of matchKeys) {
        if (!METADATA_MATCH_KEY_WHITELIST.has(key)) {
          throw new Error(
            `QueryFilter.metadata_match key "${key}" is not on the whitelist (${[
              ...METADATA_MATCH_KEY_WHITELIST,
            ].join(', ')})`,
          );
        }
      }
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
    const sql = `SELECT id, source, timestamp, content, metadata, embedding FROM events ${where} ORDER BY timestamp ${orderSql}, id ${orderSql} ${limitClause}`;
    let stmt = this.queryStmtCache.get(sql);
    if (stmt === undefined) {
      stmt = this.db.prepare(sql);
      this.queryStmtCache.set(sql, stmt);
    }
    return (stmt.all(params) as EventRow[]).map(rowToEvent);
  }

  async count(): Promise<number> {
    throw wizardScopeError();
  }

  async getByIds(): Promise<CaptureEvent[]> {
    throw wizardScopeError();
  }

  async iterateCoordAtomsByAppendOrder(): Promise<CoordAtomIterationRecord[]> {
    throw wizardScopeError();
  }

  async getCurrentCoordSequence(): Promise<number> {
    throw wizardScopeError();
  }

  close(): void {
    if (this.db.open) this.db.close();
  }
}

export type ReadOnlyWizardStorage = Storage & { close(): void };

export function openExistingAtomStoreReadOnly(dbPath: string): ReadOnlyWizardStorage | null {
  if (!existsSync(dbPath)) return null;
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  db.pragma('query_only = ON');
  return new ReadOnlyAtomStore(db);
}
