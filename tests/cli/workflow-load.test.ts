import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  listWorkflows,
  loadWorkflow,
  WorkflowValidationError,
} from '../../src/cli/workflow/load.js';

let tmpRoot: string;

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
});
