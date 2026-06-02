import { mkdirSync, readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWrite, AtomicWriteError } from './atomic-write.js';
import type { InstallProfile } from '../paths.js';

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
  profile?: InstallProfile;
}

function audienceFor(content: string): InstallProfile {
  if (!content.startsWith('---\n')) return 'customer';
  const end = content.indexOf('\n---', 4);
  if (end === -1) return 'customer';
  const frontmatter = content.slice(4, end).split(/\r?\n/);
  for (const line of frontmatter) {
    const match = /^audience:\s*["']?(customer|dogfood)["']?\s*$/.exec(line.trim());
    if (match !== null) return match[1] as InstallProfile;
  }
  return 'customer';
}

function includedForProfile(content: string, profile: InstallProfile): boolean {
  return profile === 'dogfood' || audienceFor(content) === 'customer';
}

function listMdFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .sort();
}

/**
 * First-hop: copies regular .md files from packaged assets/echo-skills/ into ~/.echo/skills/.
 * Symlinks within sourceDir are NEVER followed.
 *
 * Returns a discriminated result; never throws on missing/unreadable sourceDir.
 */
export function populateEchoSkills(opts: SkillSyncOpts): PopulateEchoSkillsResult {
  const { sourceDir, targetDir } = opts;
  const profile = opts.profile ?? 'dogfood';
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
    if (!includedForProfile(content, profile)) {
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
