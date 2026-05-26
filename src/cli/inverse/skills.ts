import { existsSync, lstatSync, readFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ECHO_HOME_PATHS } from '../../echo-home/paths.js';

export function removeEchoClaudeSkills(opts: {
  targetDir?: string;
  echoSkillsDir?: string;
  skillNames: readonly string[];
}): {
  removed: string[];
  skipped: {
    filename: string;
    reason: 'missing' | 'source-missing' | 'user-modified' | 'symlink';
  }[];
} {
  const targetDir = opts.targetDir ?? join(homedir(), '.claude/commands');
  const echoSkillsDir = opts.echoSkillsDir ?? ECHO_HOME_PATHS.skills;
  const removed: string[] = [];
  const skipped: {
    filename: string;
    reason: 'missing' | 'source-missing' | 'user-modified' | 'symlink';
  }[] = [];

  for (const skillName of opts.skillNames) {
    const filename = `${skillName}.md`;
    const targetPath = join(targetDir, filename);
    const sourcePath = join(echoSkillsDir, filename);
    if (!existsSync(targetPath)) {
      skipped.push({ filename, reason: 'missing' });
      continue;
    }
    if (lstatSync(targetPath).isSymbolicLink()) {
      skipped.push({ filename, reason: 'symlink' });
      continue;
    }
    if (!existsSync(sourcePath)) {
      skipped.push({ filename, reason: 'source-missing' });
      continue;
    }
    if (!readFileSync(targetPath).equals(readFileSync(sourcePath))) {
      skipped.push({ filename, reason: 'user-modified' });
      continue;
    }
    unlinkSync(targetPath);
    removed.push(filename);
  }
  return { removed, skipped };
}
