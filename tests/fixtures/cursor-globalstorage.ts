import Database from 'better-sqlite3';

export interface FixtureBubble {
  composer_id: string;
  bubble_id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
}

export function createGlobalStorageFixture(dbPath: string, bubbles: ReadonlyArray<FixtureBubble>): void {
  const db = new Database(dbPath);
  try {
    db.exec('CREATE TABLE cursorDiskKV (key TEXT PRIMARY KEY, value TEXT)');
    const insert = db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)');
    for (const b of bubbles) {
      insert.run(
        `bubbleId:${b.composer_id}:${b.bubble_id}`,
        JSON.stringify({ role: b.role, text: b.text, createdAt: b.createdAt }),
      );
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
      JSON.stringify({ role: b.role, text: b.text, createdAt: b.createdAt }),
    );
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
