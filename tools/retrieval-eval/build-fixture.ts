import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  collectFixtureRefs,
  collectLabelRefs,
  validateRetrievalCase,
} from '../../eval/retrieval/schema.js';
import { loadCases, loadFixtureEvents, ValidationError } from './run.js';

interface Args {
  caseId?: string;
  journalPaths: string[];
  rawJsonlPaths: string[];
  artifactPaths: string[];
  updateFixtures: boolean;
}

export async function validateCommittedFixtures(
  repoRoot = process.cwd(),
  caseId?: string,
): Promise<{
  cases: number;
  fixtures: number;
}> {
  const allCases = await loadCases(repoRoot);
  const cases = caseId === undefined ? allCases : allCases.filter((c) => c.id === caseId);
  if (cases.length === 0) throw new ValidationError([`unknown case '${caseId}'`]);
  const fixtures = await loadFixtureEvents(repoRoot, allCases);
  const fixtureRefs = collectFixtureRefs(fixtures);
  const errors: string[] = [];
  for (const c of cases) {
    const result = validateRetrievalCase(c, fixtureRefs);
    if (!result.ok) errors.push(...result.errors.map((e) => `${c.id}: ${e}`));
    for (const ref of collectLabelRefs(c)) {
      if (!fixtureRefs.has(ref)) errors.push(`${c.id}: fixture ref '${ref}' does not exist`);
    }
  }
  if (errors.length > 0) throw new ValidationError(errors);
  return { cases: cases.length, fixtures: fixtures.length };
}

export async function inspectLocalProvenance(
  args: Args,
  repoRoot = process.cwd(),
): Promise<string> {
  const explicitPaths = [...args.journalPaths, ...args.rawJsonlPaths, ...args.artifactPaths];
  if (explicitPaths.length === 0) {
    throw new ValidationError([
      'local provenance mode requires explicit --journal, --raw-jsonl, or --artifact paths; it never scans home directories',
    ]);
  }
  const lines: string[] = [];
  lines.push('Local provenance inspection');
  lines.push('Redaction reminder: do not commit private raw JSONL or full transcript bodies.');
  for (const p of explicitPaths) {
    const abs = path.isAbsolute(p) ? p : path.join(repoRoot, p);
    await access(abs);
    const sample = await readFile(abs, 'utf8');
    lines.push(`- ${abs}: ${sample.length} chars readable`);
  }
  if (args.updateFixtures) {
    lines.push(
      'Fixture update was requested; this V0 helper validates inputs only and leaves writing to an explicit manual patch.',
    );
  }
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    journalPaths: [],
    rawJsonlPaths: [],
    artifactPaths: [],
    updateFixtures: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--case') {
      args.caseId = requiredValue(argv, ++i, arg);
    } else if (arg === '--journal') {
      args.journalPaths.push(requiredValue(argv, ++i, arg));
    } else if (arg === '--raw-jsonl') {
      args.rawJsonlPaths.push(requiredValue(argv, ++i, arg));
    } else if (arg === '--artifact') {
      args.artifactPaths.push(requiredValue(argv, ++i, arg));
    } else if (arg === '--update-fixtures') {
      args.updateFixtures = true;
    } else {
      throw new ValidationError([`unknown argument '${arg}'`]);
    }
  }
  return args;
}

function requiredValue(argv: readonly string[], idx: number, flag: string): string {
  const value = argv[idx];
  if (value === undefined || value.startsWith('--')) {
    throw new ValidationError([`${flag} requires a value`]);
  }
  return value;
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.journalPaths.length + args.rawJsonlPaths.length + args.artifactPaths.length > 0) {
      process.stdout.write(await inspectLocalProvenance(args));
      return;
    }
    const result = await validateCommittedFixtures(process.cwd(), args.caseId);
    process.stdout.write(
      `Committed retrieval fixtures valid: ${result.cases} case(s), ${result.fixtures} fixture event(s)\n`,
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      process.stderr.write(`fixture validation failed:\n${err.errors.join('\n')}\n`);
      process.exitCode = 2;
      return;
    }
    throw err;
  }
}

const invokedAsScript =
  process.env.VITEST === undefined &&
  process.argv.some(
    (arg) =>
      arg.endsWith('tools/retrieval-eval/build-fixture.ts') ||
      arg.endsWith('tools/retrieval-eval/build-fixture.js'),
  );

if (invokedAsScript) {
  await main();
}
