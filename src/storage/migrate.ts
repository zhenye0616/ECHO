import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type Database from 'better-sqlite3';

const FILENAME_PATTERN = /^(\d{4})_[A-Za-z0-9_-]+\.sql$/;

export interface Migration {
  version: number;
  filename: string;
  sql: string;
}

export function loadMigrations(migrationsDir: string): Migration[] {
  const entries = readdirSync(migrationsDir);
  const migrations: Migration[] = [];
  for (const filename of entries) {
    const match = FILENAME_PATTERN.exec(filename);
    if (match === null) continue;
    const version = Number.parseInt(match[1]!, 10);
    const sql = readFileSync(join(migrationsDir, filename), 'utf8');
    migrations.push({ version, filename, sql });
  }
  migrations.sort((a, b) => a.version - b.version);

  for (let i = 0; i < migrations.length; i++) {
    const expected = i + 1;
    if (migrations[i]!.version !== expected) {
      throw new Error(
        `migration sequence error: expected version ${expected} but found ${migrations[i]!.version} (${migrations[i]!.filename})`,
      );
    }
  }
  return migrations;
}

export function migrate(db: Database.Database, migrationsDir: string): number {
  const migrations = loadMigrations(migrationsDir);
  const currentRow = db.pragma('user_version', { simple: true }) as number;
  let applied = currentRow;

  for (const m of migrations) {
    if (m.version <= applied) continue;
    const tx = db.transaction(() => {
      db.exec(m.sql);
      db.pragma(`user_version = ${m.version}`);
    });
    tx();
    applied = m.version;
  }
  return applied;
}
