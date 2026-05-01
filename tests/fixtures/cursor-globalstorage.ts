import Database from 'better-sqlite3';

export interface FixtureBubble {
  composer_id: string;
  bubble_id: string;
  type: 1 | 2; // 1=user, 2=assistant — Cursor's wire encoding
  text: string;
}

export interface FixtureOptions {
  composerCreatedAt?: number; // ms epoch; default 0
  composers?: Record<string, { createdAt?: number }>; // per-composer override
}

function composerCreatedAtFor(composer_id: string, options: FixtureOptions): number {
  return options.composers?.[composer_id]?.createdAt ?? options.composerCreatedAt ?? 0;
}

function buildHeaders(
  composer_id: string,
  bubbles: ReadonlyArray<FixtureBubble>,
): { bubbleId: string; type: number }[] {
  return bubbles
    .filter((b) => b.composer_id === composer_id)
    .map((b) => ({ bubbleId: b.bubble_id, type: b.type }));
}

function bubbleValue(b: FixtureBubble): string {
  return JSON.stringify({ _v: 3, type: b.type, text: b.text, bubbleId: b.bubble_id });
}

function composerValue(composer_id: string, createdAt: number, headers: { bubbleId: string; type: number }[]): string {
  return JSON.stringify({
    composerId: composer_id,
    createdAt,
    fullConversationHeadersOnly: headers,
  });
}

export function createGlobalStorageFixture(
  dbPath: string,
  bubbles: ReadonlyArray<FixtureBubble>,
  options: FixtureOptions = {},
): void {
  const db = new Database(dbPath);
  try {
    db.exec('CREATE TABLE cursorDiskKV (key TEXT PRIMARY KEY, value TEXT)');
    const insert = db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)');
    const composerIds = [...new Set(bubbles.map((b) => b.composer_id))];
    for (const cid of composerIds) {
      insert.run(
        `composerData:${cid}`,
        composerValue(cid, composerCreatedAtFor(cid, options), buildHeaders(cid, bubbles)),
      );
    }
    for (const b of bubbles) {
      insert.run(`bubbleId:${b.composer_id}:${b.bubble_id}`, bubbleValue(b));
    }
  } finally {
    db.close();
  }
}

export function appendBubble(dbPath: string, b: FixtureBubble): void {
  const db = new Database(dbPath);
  try {
    db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)').run(
      `bubbleId:${b.composer_id}:${b.bubble_id}`,
      bubbleValue(b),
    );
    const composerKey = `composerData:${b.composer_id}`;
    const existing = db
      .prepare('SELECT value FROM cursorDiskKV WHERE key = ?')
      .get(composerKey) as { value: string } | undefined;
    if (existing !== undefined) {
      const composer = JSON.parse(existing.value) as {
        composerId: string;
        createdAt: number;
        fullConversationHeadersOnly: { bubbleId: string; type: number }[];
      };
      composer.fullConversationHeadersOnly.push({ bubbleId: b.bubble_id, type: b.type });
      db.prepare('UPDATE cursorDiskKV SET value = ? WHERE key = ?').run(
        JSON.stringify(composer),
        composerKey,
      );
    } else {
      db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)').run(
        composerKey,
        composerValue(b.composer_id, 0, [{ bubbleId: b.bubble_id, type: b.type }]),
      );
    }
  } finally {
    db.close();
  }
}

export function appendRawCursorDiskKVRow(dbPath: string, key: string, value: string): void {
  const db = new Database(dbPath);
  try {
    db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)').run(key, value);
  } finally {
    db.close();
  }
}

export function createWorkspaceFixture(dbPath: string, composerIds: ReadonlyArray<string>): void {
  const db = new Database(dbPath);
  try {
    db.exec('CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)');
    db.prepare("INSERT INTO ItemTable (key, value) VALUES ('composer.composerData', ?)").run(
      JSON.stringify({
        allComposers: composerIds.map((id) => ({ composerId: id, mode: 'agent' })),
      }),
    );
  } finally {
    db.close();
  }
}

export function createSchemaUnrecognizedFixture(dbPath: string): void {
  const db = new Database(dbPath);
  try {
    db.exec('CREATE TABLE foo (k TEXT, v TEXT)');
    db.prepare('INSERT INTO foo (k, v) VALUES (?, ?)').run('hello', 'world');
  } finally {
    db.close();
  }
}
