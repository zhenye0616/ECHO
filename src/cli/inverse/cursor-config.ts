import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { atomicWrite } from '../../echo-home/adapters/atomic-write.js';

export type RemoveCursorMcpEntryResult = {
  action: 'removed' | 'noop' | 'conflict';
  reason?: 'file-missing' | 'entry-missing' | 'parse-error' | 'symlink-target';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function removeCursorMcpEntry(opts: { filePath: string }): RemoveCursorMcpEntryResult {
  const { filePath } = opts;
  if (!existsSync(filePath)) return { action: 'noop', reason: 'file-missing' };
  if (lstatSync(filePath).isSymbolicLink()) {
    return { action: 'conflict', reason: 'symlink-target' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return { action: 'conflict', reason: 'parse-error' };
  }
  if (!isRecord(parsed)) return { action: 'conflict', reason: 'parse-error' };
  const mcpServers = parsed['mcpServers'];
  if (mcpServers === undefined || !isRecord(mcpServers) || mcpServers['echo'] === undefined) {
    return { action: 'noop', reason: 'entry-missing' };
  }
  const nextServers = { ...mcpServers };
  delete nextServers['echo'];
  parsed['mcpServers'] = nextServers;
  atomicWrite({ filePath, content: `${JSON.stringify(parsed, null, 2)}\n`, secretSensitive: true });
  return { action: 'removed' };
}
