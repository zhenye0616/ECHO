import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WORKFLOWS = join(process.cwd(), '.github', 'workflows');
const FULL_SHA = /^[0-9a-f]{40}$/;

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort();
}

describe('GitHub workflow security', () => {
  it('pins every external action to an immutable full commit SHA', () => {
    const unpinned: string[] = [];

    for (const name of workflowFiles()) {
      const lines = readFileSync(join(WORKFLOWS, name), 'utf8').split('\n');
      lines.forEach((line, index) => {
        const match = line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/);
        if (!match || match[1].startsWith('./') || match[1].startsWith('docker://')) return;

        const separator = match[1].lastIndexOf('@');
        const ref = separator === -1 ? '' : match[1].slice(separator + 1);
        if (!FULL_SHA.test(ref)) unpinned.push(`${name}:${index + 1} ${match[1]}`);
      });
    }

    expect(unpinned).toEqual([]);
  });

  it('routes release publication through the protected production environment', () => {
    const release = readFileSync(join(WORKFLOWS, 'release.yml'), 'utf8');
    const publishStart = release.match(/^  publish:\s*$/m);

    expect(publishStart).not.toBeNull();
    if (!publishStart || publishStart.index === undefined)
      throw new Error('release publish job not found');
    const afterPublishHeader = release.slice(publishStart.index + publishStart[0].length);
    const nextJob = afterPublishHeader.search(/^  [A-Za-z0-9_-]+:\s*$/m);
    const publishJob = nextJob === -1 ? afterPublishHeader : afterPublishHeader.slice(0, nextJob);

    expect(publishJob).toMatch(/^    environment:\s*production\s*$/m);
    expect(publishJob).toMatch(/^    permissions:\s*\n      contents:\s*write\s*$/m);
  });
});
