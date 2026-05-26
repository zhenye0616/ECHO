import { mkdirSync, readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWrite, AtomicWriteError } from './atomic-write.js';

export type PopulateEchoSkillsResult =
  | { ok: true; copied: string[]; skipped: string[]; targetDir: string }
  | { ok: false; sourceDir: string; targetDir: string; error: string };

export interface SyncClaudeSkillsResult {
  copied: string[];
  skipped: string[];
  targetDir: string;
}

export interface SkillSyncOpts {
  sourceDir: string;
  targetDir: string;
}

function listMdFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .sort();
}

/**
 * First-hop: copies regular .md files from in-repo skills/ into ~/.echo/skills/.
 * Symlinks within sourceDir are NEVER followed.
 *
 * Returns a discriminated result; never throws on missing/unreadable sourceDir.
 */
export function populateEchoSkills(opts: SkillSyncOpts): PopulateEchoSkillsResult {
  const { sourceDir, targetDir } = opts;
  const copied: string[] = [];
  const skipped: string[] = [];

  let entries: string[];
  try {
    entries = listMdFiles(sourceDir);
  } catch (err) {
    return {
      ok: false,
      sourceDir,
      targetDir,
      error: `cannot read sourceDir: ${(err as Error).message}`,
    };
  }

  try {
    mkdirSync(targetDir, { recursive: true });
  } catch (err) {
    return {
      ok: false,
      sourceDir,
      targetDir,
      error: `cannot create targetDir: ${(err as Error).message}`,
    };
  }

  for (const name of entries) {
    const srcPath = join(sourceDir, name);
    try {
      const lst = lstatSync(srcPath);
      if (!lst.isFile()) {
        skipped.push(name);
        continue;
      }
    } catch {
      skipped.push(name);
      continue;
    }
    let content: string;
    try {
      content = readFileSync(srcPath, 'utf8');
    } catch {
      skipped.push(name);
      continue;
    }
    const tgtPath = join(targetDir, name);
    try {
      atomicWrite({ filePath: tgtPath, content });
      copied.push(name);
    } catch (err) {
      if (err instanceof AtomicWriteError && err.code === 'EEXIST') {
        // target is a symlink — skip per AC4 / AC7.2a
        skipped.push(name);
      } else {
        return {
          ok: false,
          sourceDir,
          targetDir,
          error: `failed to write ${name}: ${(err as Error).message}`,
        };
      }
    }
  }

  return { ok: true, copied, skipped, targetDir };
}

/**
 * Second-hop: copies regular .md files from ~/.echo/skills/ into the per-vendor
 * commands directory (e.g. ~/.claude/commands/).
 *
 * On hard failure (sourceDir unreadable, etc.), throws — syncAll's try/catch
 * surfaces it via the agent's errors[]. Symlink-target skips push into the
 * skipped[] array.
 */
export function syncClaudeSkills(opts: SkillSyncOpts): SyncClaudeSkillsResult {
  const { sourceDir, targetDir } = opts;
  const copied: string[] = [];
  const skipped: string[] = [];

  mkdirSync(targetDir, { recursive: true });
  const entries = listMdFiles(sourceDir);

  for (const name of entries) {
    const srcPath = join(sourceDir, name);
    try {
      const lst = lstatSync(srcPath);
      if (!lst.isFile()) {
        skipped.push(name);
        continue;
      }
    } catch {
      skipped.push(name);
      continue;
    }
    const content = readFileSync(srcPath, 'utf8');
    const tgtPath = join(targetDir, name);
    try {
      atomicWrite({ filePath: tgtPath, content });
      copied.push(name);
    } catch (err) {
      if (err instanceof AtomicWriteError && err.code === 'EEXIST') {
        skipped.push(name);
      } else {
        throw err;
      }
    }
  }

  return { copied, skipped, targetDir };
}
