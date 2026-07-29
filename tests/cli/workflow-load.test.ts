import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  listWorkflows,
  loadWorkflow,
  WorkflowValidationError,
} from '../../src/cli/workflow/load.js';

let tmpRoot: string;

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function writeWorkflow(name: string, body: string): string {
  const path = join(tmpRoot, `${name}.toml`);
  writeFileSync(path, body);
  return path;
}

describe('workflow loader', () => {
  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-workflow-load-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('loads a schema_version 1 workflow and exposes steps', () => {
    const path = writeWorkflow(
      'review-pending',
      '[workflow]\nname = "review-pending"\ndescription = "Review"\nschema_version = 1\n\n[[step]]\nrole = "reviewer"\nprompt = "Review ${ref}"\ninputs = { ref = "HEAD" }\n',
    );

    const workflow = loadWorkflow(path);

    expect(workflow.schemaVersion).toBe(1);
    expect(workflow.steps[0]).toEqual({
      role: 'reviewer',
      prompt: 'Review ${ref}',
      inputs: { ref: 'HEAD' },
    });
    expect(listWorkflows(tmpRoot).map((w) => w.name)).toEqual(['review-pending']);
  });

  it('rejects unknown keys, version mismatch, empty steps, and filename/name mismatch', () => {
    expect(() =>
      loadWorkflow(
        writeWorkflow(
          'bad-key',
          '[workflow]\nname = "bad-key"\ndescription = "x"\nschema_version = 1\nextra = true\n[[step]]\nrole = "reviewer"\nprompt = "x"\n',
        ),
      ),
    ).toThrow(WorkflowValidationError);
    expect(() =>
      loadWorkflow(
        writeWorkflow(
          'bad-version',
          '[workflow]\nname = "bad-version"\ndescription = "x"\nschema_version = 2\n[[step]]\nrole = "reviewer"\nprompt = "x"\n',
        ),
      ),
    ).toThrow('schema_version');
    expect(() =>
      loadWorkflow(
        writeWorkflow(
          'empty',
          '[workflow]\nname = "empty"\ndescription = "x"\nschema_version = 1\n',
        ),
      ),
    ).toThrow('at least one');
    expect(() =>
      loadWorkflow(
        writeWorkflow(
          'file-name',
          '[workflow]\nname = "other"\ndescription = "x"\nschema_version = 1\n[[step]]\nrole = "reviewer"\nprompt = "x"\n',
        ),
      ),
    ).toThrow('filename');
  });

  it('loads the shipped change-review workflow asset and pins prompt invariants', () => {
    const workflow = loadWorkflow(join(repoRoot, 'assets/echo-workflows/change-review.toml'));

    expect(workflow.name).toBe('change-review');
    expect(workflow.schemaVersion).toBe(1);
    expect(workflow.steps).toHaveLength(1);
    expect(workflow.steps[0]!.role).toBe('reviewer');
    const prompt = workflow.steps[0]!.prompt;
    expect(prompt.length).toBeGreaterThan(0);

    const p1 = prompt.search(/\bgh pr view\b/);
    const p2 = prompt.indexOf('git diff @{upstream}..HEAD');
    const p3 = prompt.search(/\bgit diff HEAD\b(?!~)/);
    const p4 = prompt.indexOf('git diff HEAD~1..HEAD');
    expect(p1).toBeGreaterThanOrEqual(0);
    expect(p2).toBeGreaterThan(p1);
    expect(p3).toBeGreaterThan(p2);
    expect(p4).toBeGreaterThan(p3);

    expect(prompt).toContain('No findings — diff looks ready to ship.');
    expect(prompt).toContain('No diff source available — nothing to review.');
    expect(/priority unavailable[^.\n]*continue/i.test(prompt)).toBe(true);
    expect(prompt).not.toContain('mcp__echo__get_recent_work_context');
    expect(prompt).toContain('mcp__echo__search_memories');
    expect(prompt).toContain('mcp__echo__find_clusters');
    expect(prompt).toContain('Keep the review under 600 words');
    expect(workflow.steps[0]!.inputs).toEqual({});
    expect(Object.isFrozen(workflow.steps[0]!.inputs)).toBe(true);
  });
});
