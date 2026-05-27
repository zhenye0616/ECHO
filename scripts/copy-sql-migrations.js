#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(repoRoot, 'src', 'storage', 'migrations');
const targetDir = join(repoRoot, 'dist', 'storage', 'migrations');

if (!existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
  console.error(`copy-sql-migrations: source directory missing: ${sourceDir}`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

const files = readdirSync(sourceDir).filter((name) => name.endsWith('.sql')).sort();
for (const file of files) {
  const sourcePath = join(sourceDir, file);
  if (!statSync(sourcePath).isFile()) continue;
  copyFileSync(sourcePath, join(targetDir, file));
}

console.log(`copy-sql-migrations: copied ${files.length} file(s) to ${targetDir}`);
