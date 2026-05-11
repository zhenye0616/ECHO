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
  // Restrict rows to those whose JSON metadata matches the given key→value
  // pairs using string equality; each entry implies an AND clause. Mirrors
  // `exclude_metadata_surface` (set-membership on a single key); this is
  // general key/value equality across N keys. Empty `{}` is a no-op
  // (treated as if omitted). Item 035's only consumer is `tail_session`'s
  // repo-scoping path, where `composer_id` restricts the cursor `.vscdb`
  // tail to a specific workspace's composer. To prevent caller-supplied
  // keys from probing arbitrary metadata fields, the storage layer
  // enforces a whitelist — see METADATA_MATCH_KEY_WHITELIST. Any key
  // outside the whitelist causes the query to throw at the storage seam
  // (defense in depth — independent of any MCP-tool-level validation).
  metadata_match?: Record<string, string>;
  // Composite-key cursor pagination boundary: returns rows strictly older than
  // (timestamp, id) under the storage `(timestamp DESC, id DESC)` ordering.
  // Defined for descending queries only — passing `before` together with
  // `order: 'asc'` MUST throw a synchronous validation error at the storage
  // seam rather than silently inverting. Adding asymmetric semantics here
  // would re-introduce the same kind of "minus 1ms" tie-skip bug the
  // composite cursor was designed to close.
  before?: { timestamp: string; id: string };
}

// Whitelist of metadata keys callers may reach via `QueryFilter.metadata_match`.
// Enforced inside both storage adapters (SQLite + Memory) so adding a future
// MCP tool that forwards `metadata_match` cannot accidentally probe arbitrary
// JSON paths. Adding a key here is a deliberate decision — current consumers
// are tail_session's repo-scoping (composer_id) + integration test helpers
// (workspace_id, session_id) + item 037's work-artifact (repo) scoping across
// all four retrieval tools (repo_root).
export const METADATA_MATCH_KEY_WHITELIST: ReadonlySet<string> = new Set([
  'workspace_id',
  'composer_id',
  'session_id',
  'repo_root',
]);

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
