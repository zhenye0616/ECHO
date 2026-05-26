import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parse } from 'smol-toml';

const WORKFLOW_FILENAME_RE = /^[a-z][a-z0-9-]*\.toml$/;
const ROLE_NAME_RE = /^[a-z][a-z0-9-]*$/;

export interface Workflow {
  readonly name: string;
  readonly description: string;
  readonly schemaVersion: 1;
  readonly steps: readonly WorkflowStep[];
  readonly sourcePath: string;
}

export interface WorkflowStep {
  readonly role: string;
  readonly prompt: string;
  readonly inputs: Readonly<Record<string, string>>;
}

export class WorkflowValidationError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly field?: string,
  ) {
    super(field === undefined ? `${filePath}: ${message}` : `${filePath}: ${field}: ${message}`);
    this.name = 'WorkflowValidationError';
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(filePath: string, field: string | undefined, message: string): never {
  throw new WorkflowValidationError(message, filePath, field);
}

function allowedKeys(
  record: UnknownRecord,
  allowed: readonly string[],
  filePath: string,
  prefix: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) fail(filePath, `${prefix}.${key}`, `unknown key ${key}`);
  }
}

function requiredString(
  record: UnknownRecord,
  key: string,
  filePath: string,
  field: string,
): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    fail(filePath, field, `missing or invalid required field ${key}`);
  }
  return value;
}

function parseToml(filePath: string): UnknownRecord {
  try {
    const parsed = parse(readFileSync(filePath, 'utf8'));
    if (!isRecord(parsed)) fail(filePath, undefined, 'TOML root must be a table');
    return parsed;
  } catch (err) {
    if (err instanceof WorkflowValidationError) throw err;
    fail(filePath, undefined, `TOML parse failed: ${(err as Error).message}`);
  }
}

function validateInputs(
  value: unknown,
  filePath: string,
  field: string,
): Readonly<Record<string, string>> {
  if (value === undefined) return Object.freeze({});
  if (!isRecord(value)) fail(filePath, field, 'inputs must be a string-string table');
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string')
      fail(filePath, `${field}.${key}`, 'input value must be a string');
    out[key] = entry;
  }
  return Object.freeze(out);
}

export function loadWorkflow(filePath: string): Workflow {
  const sourcePath = resolve(filePath);
  const filename = basename(sourcePath);
  if (!WORKFLOW_FILENAME_RE.test(filename)) {
    fail(sourcePath, 'filename', 'filename must match ^[a-z][a-z0-9-]*.toml$');
  }
  const expectedName = filename.slice(0, -'.toml'.length);
  const root = parseToml(sourcePath);
  allowedKeys(root, ['workflow', 'step'], sourcePath, '<root>');
  const workflowTable = root['workflow'];
  if (!isRecord(workflowTable)) fail(sourcePath, '[workflow]', 'missing required table [workflow]');
  allowedKeys(workflowTable, ['name', 'description', 'schema_version'], sourcePath, 'workflow');
  const name = requiredString(workflowTable, 'name', sourcePath, 'workflow.name');
  if (name !== expectedName) fail(sourcePath, 'workflow.name', 'must equal filename without .toml');
  const description = requiredString(
    workflowTable,
    'description',
    sourcePath,
    'workflow.description',
  );
  if (workflowTable['schema_version'] !== 1) {
    fail(
      sourcePath,
      'workflow.schema_version',
      `unsupported schema_version ${String(workflowTable['schema_version'])}`,
    );
  }

  const rawSteps = root['step'];
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    fail(sourcePath, 'step', 'workflow must contain at least one [[step]]');
  }
  const steps = rawSteps.map((entry, index): WorkflowStep => {
    if (!isRecord(entry)) fail(sourcePath, `step.${index}`, 'step must be a table');
    allowedKeys(entry, ['role', 'prompt', 'inputs'], sourcePath, `step.${index}`);
    const role = requiredString(entry, 'role', sourcePath, `step.${index}.role`);
    if (!ROLE_NAME_RE.test(role)) fail(sourcePath, `step.${index}.role`, 'role must be kebab-case');
    return Object.freeze({
      role,
      prompt: requiredString(entry, 'prompt', sourcePath, `step.${index}.prompt`),
      inputs: validateInputs(entry['inputs'], sourcePath, `step.${index}.inputs`),
    });
  });

  return Object.freeze({
    name,
    description,
    schemaVersion: 1,
    steps: Object.freeze(steps),
    sourcePath,
  });
}

export function listWorkflows(workflowsDir: string): Workflow[] {
  if (!existsSync(workflowsDir)) return [];
  return readdirSync(workflowsDir)
    .filter((entry) => WORKFLOW_FILENAME_RE.test(entry))
    .sort()
    .map((entry) => loadWorkflow(join(workflowsDir, entry)));
}
