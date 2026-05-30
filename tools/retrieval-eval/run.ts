import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {
  collectFixtureRefs,
  type BaselineStatus,
  type FixtureEvent,
  type MetricName,
  type RetrievalCase,
  type ToolStep,
  type WarningOrigin,
  validateFixtureEvent,
  validateRetrievalCase,
} from '../../eval/retrieval/schema.js';
import { findClusters, type FindClustersResult } from '../../src/mcp/tools/find-clusters.js';
import { getAtoms, type GetAtomsResult } from '../../src/mcp/tools/get-atoms.js';
import { searchMemories, type SearchResult } from '../../src/mcp/tools/search-memories.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { CaptureEvent, EventId } from '../../src/storage/interface.js';

type ResultStatus =
  | 'pass'
  | 'expected_fail_matched'
  | 'expected_fail_mismatched'
  | 'unexpected_fail';

type ToolOutput = SearchResult | FindClustersResult | GetAtomsResult;

interface EvalWarning {
  code: string;
  origin: WarningOrigin;
  message: string;
  step_id?: string;
  ref?: string;
}

interface MetricResult {
  value: number | boolean;
  pass: boolean;
  gate: string;
}

interface StepRun {
  step_id: string;
  tool: string;
  bytes: number;
  output: ToolOutput;
  warnings: EvalWarning[];
}

export interface VariantRunResult {
  case_id: string;
  variant_id: string;
  query: string;
  baseline_status: BaselineStatus;
  result_status: ResultStatus;
  failed_metrics: MetricName[];
  metrics: Record<MetricName, MetricResult>;
  missing_primary_refs: string[];
  forbidden_noise_refs: string[];
  warning_gaps: string[];
  observed_warnings: EvalWarning[];
  top_evidence_refs: string[];
  retrieved_refs: string[];
  calls: number;
  total_bytes: number;
  steps: StepRun[];
}

export interface CaseRunResult {
  id: string;
  priority: string;
  status: 'pass' | 'fail';
  variants: VariantRunResult[];
}

export interface EvalSummary {
  schema_version: 1;
  corpus_mode: 'full-suite' | 'focused-full-corpus';
  focused_case: string | null;
  case_count: number;
  fixture_count: number;
  cases: CaseRunResult[];
  aggregate: {
    total_variants: number;
    failed_variants: number;
    expected_fail_matched: number;
    expected_fail_mismatched: number;
    unexpected_failures: number;
    exit_code: 0 | 1;
  };
}

interface RunOptions {
  caseId?: string;
  repoRoot?: string;
  homeDir?: string;
}

interface FixtureCorpus {
  storage: MemoryStorage;
  idToRef: Map<EventId, string>;
  refToId: Map<string, EventId>;
  refToEvent: Map<string, CaptureEvent>;
}

interface RunContext {
  caseDef: RetrievalCase;
  resolvedCase: RetrievalCase;
  variant: RetrievalCase['query_variants'][number];
  corpus: FixtureCorpus;
  stepOutputs: Map<string, ToolOutput>;
  stepRuns: StepRun[];
  evalWarnings: EvalWarning[];
}

const METRIC_NAMES: MetricName[] = [
  'primary_recall',
  'top_rank_success',
  'weighted_precision_at_5',
  'weighted_precision_overall',
  'signal_noise_ratio_at_10',
  'forbidden_noise',
  'source_coverage',
  'loss_legibility',
  'per_call_budget_bytes',
  'recipe_budget_bytes',
  'call_efficiency',
];

export async function runRetrievalEval(options: RunOptions = {}): Promise<EvalSummary> {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const homeDir = options.homeDir ?? homedir();
  const allCases = await loadCases(repoRoot);
  const fixtureEvents = await loadFixtureEvents(repoRoot, allCases);
  const fixtureRefs = collectFixtureRefs(fixtureEvents);

  const validationErrors: string[] = [];
  for (const c of allCases) {
    const validation = validateRetrievalCase(c, fixtureRefs);
    if (!validation.ok) {
      validationErrors.push(...validation.errors.map((e) => `${c.id}: ${e}`));
    }
  }
  if (validationErrors.length > 0) {
    throw new ValidationError(validationErrors);
  }

  const selectedCases =
    options.caseId === undefined ? allCases : allCases.filter((c) => c.id === options.caseId);
  if (selectedCases.length === 0) {
    throw new ValidationError([`unknown case '${options.caseId}'`]);
  }

  const corpus = await buildCorpus(fixtureEvents, repoRoot, homeDir);
  const caseResults: CaseRunResult[] = [];
  for (const caseDef of selectedCases) {
    const resolvedCase = rewriteCase(caseDef, repoRoot);
    const variants: VariantRunResult[] = [];
    for (const variant of resolvedCase.query_variants) {
      variants.push(await runVariant(caseDef, resolvedCase, variant, corpus));
    }
    caseResults.push({
      id: resolvedCase.id,
      priority: resolvedCase.priority,
      status: variants.every((v) => v.failed_metrics.length === 0) ? 'pass' : 'fail',
      variants,
    });
  }

  const allVariants = caseResults.flatMap((c) => c.variants);
  const failedVariants = allVariants.filter((v) => v.failed_metrics.length > 0);
  const expectedMatched = allVariants.filter((v) => v.result_status === 'expected_fail_matched');
  const expectedMismatched = allVariants.filter(
    (v) => v.result_status === 'expected_fail_mismatched',
  );
  const unexpectedFailures = allVariants.filter((v) => v.result_status === 'unexpected_fail');

  return {
    schema_version: 1,
    corpus_mode: options.caseId === undefined ? 'full-suite' : 'focused-full-corpus',
    focused_case: options.caseId ?? null,
    case_count: caseResults.length,
    fixture_count: fixtureEvents.length,
    cases: caseResults,
    aggregate: {
      total_variants: allVariants.length,
      failed_variants: failedVariants.length,
      expected_fail_matched: expectedMatched.length,
      expected_fail_mismatched: expectedMismatched.length,
      unexpected_failures: unexpectedFailures.length,
      exit_code: failedVariants.length > 0 ? 1 : 0,
    },
  };
}

export async function loadCases(repoRoot: string): Promise<RetrievalCase[]> {
  const dir = path.join(repoRoot, 'eval/retrieval/cases');
  const names = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  const cases: RetrievalCase[] = [];
  for (const name of names) {
    const raw = JSON.parse(await readFile(path.join(dir, name), 'utf8')) as unknown;
    const validation = validateRetrievalCase(raw);
    if (!validation.ok || validation.value === undefined) {
      throw new ValidationError(validation.errors.map((e) => `${name}: ${e}`));
    }
    cases.push(validation.value);
  }
  return cases;
}

export async function loadFixtureEvents(
  repoRoot: string,
  cases: readonly RetrievalCase[],
): Promise<FixtureEvent[]> {
  const fixtureFiles = new Set<string>();
  for (const c of cases) {
    for (const fixtureFile of c.fixture_files) fixtureFiles.add(fixtureFile);
  }

  const events: FixtureEvent[] = [];
  const seenRefs = new Set<string>();
  for (const rel of [...fixtureFiles].sort()) {
    const abs = path.join(repoRoot, rel);
    const lines = (await readFile(abs, 'utf8')).split(/\r?\n/);
    for (const [idx, line] of lines.entries()) {
      if (line.trim().length === 0) continue;
      const parsed = JSON.parse(line) as unknown;
      const validation = validateFixtureEvent(parsed);
      if (!validation.ok || validation.value === undefined) {
        throw new ValidationError(validation.errors.map((e) => `${rel}:${idx + 1}: ${e}`));
      }
      if (seenRefs.has(validation.value.fixture_ref)) {
        throw new ValidationError([`duplicate fixture_ref '${validation.value.fixture_ref}'`]);
      }
      seenRefs.add(validation.value.fixture_ref);
      events.push(validation.value);
    }
  }
  validateTimestampDeterminism(events);
  return events;
}

export function formatMarkdown(summary: EvalSummary): string {
  const lines: string[] = [];
  lines.push('# Retrieval Eval Summary');
  lines.push('');
  lines.push(`- Corpus mode: ${summary.corpus_mode}`);
  lines.push(`- Focused case: ${summary.focused_case ?? 'none'}`);
  lines.push(`- Cases scored: ${summary.case_count}`);
  lines.push(`- Fixtures loaded: ${summary.fixture_count}`);
  lines.push(`- Exit code: ${summary.aggregate.exit_code}`);
  lines.push('');

  const variants = summary.cases.flatMap((c) => c.variants);
  const failing = variants.filter((v) => v.failed_metrics.length > 0);
  if (failing.length > 0) {
    const first = failing[0]!;
    lines.push(`## Top failing metric`);
    lines.push('');
    lines.push(
      `- ${first.case_id}/${first.variant_id}: ${first.failed_metrics[0]} (${first.result_status})`,
    );
    lines.push(`- Missing primary: ${first.missing_primary_refs.join(', ') || 'none'}`);
    lines.push(`- Forbidden noise: ${first.forbidden_noise_refs.join(', ') || 'none'}`);
    lines.push(`- Warning gaps: ${first.warning_gaps.join(', ') || 'none'}`);
    lines.push(`- Budget/calls: ${first.total_bytes} bytes across ${first.calls} calls`);
    lines.push('');
  }

  for (const c of summary.cases) {
    lines.push(`## ${c.id}`);
    lines.push('');
    for (const v of c.variants) {
      lines.push(`### ${v.variant_id} (${v.baseline_status})`);
      lines.push('');
      lines.push(`- Status: ${v.result_status}`);
      lines.push(`- Query: ${v.query}`);
      lines.push(`- Failed metrics: ${v.failed_metrics.join(', ') || 'none'}`);
      lines.push(`- Top evidence refs: ${v.top_evidence_refs.slice(0, 10).join(', ') || 'none'}`);
      lines.push(`- Observed warnings: ${formatWarnings(v.observed_warnings)}`);
      lines.push(`- Tool recipe: ${v.steps.map((s) => `${s.step_id}:${s.tool}`).join(' -> ')}`);
      lines.push('');
    }
  }
  return `${lines.join('\n')}\n`;
}

async function runVariant(
  caseDef: RetrievalCase,
  resolvedCase: RetrievalCase,
  variant: RetrievalCase['query_variants'][number],
  corpus: FixtureCorpus,
): Promise<VariantRunResult> {
  const ctx: RunContext = {
    caseDef,
    resolvedCase,
    variant,
    corpus,
    stepOutputs: new Map(),
    stepRuns: [],
    evalWarnings: [],
  };

  for (const step of resolvedCase.tool_recipe) {
    const run = await executeStep(step, ctx);
    ctx.stepOutputs.set(step.step_id, run.output);
    ctx.stepRuns.push(run);
  }

  const primaryStep = resolvedCase.tool_recipe.find((s) => s.primary_discovery === true)!;
  const primaryOutput = ctx.stepOutputs.get(primaryStep.step_id)!;
  const primaryRefs = primaryEvidenceRefs(primaryOutput, corpus.idToRef);
  const hydratedRefs = hydratedEvidenceRefs(ctx.stepRuns, corpus.idToRef);
  const retrievedRefs = hydratedRefs.length > 0 ? hydratedRefs : primaryRefs;
  const uniqueRetrieved = unique(retrievedRefs);
  const observedWarnings = [...ctx.stepRuns.flatMap((s) => s.warnings), ...ctx.evalWarnings];

  addSourceGapWarnings(resolvedCase, uniqueRetrieved, corpus, observedWarnings);
  addForbiddenNoiseWarnings(resolvedCase, uniqueRetrieved, observedWarnings);

  const metrics = scoreMetrics(
    resolvedCase,
    primaryOutput,
    primaryRefs,
    uniqueRetrieved,
    ctx.stepRuns,
    observedWarnings,
  );
  const failedMetrics = METRIC_NAMES.filter((name) => !metrics[name].pass);
  const missingPrimary = resolvedCase.required_primary.filter(
    (ref) => !uniqueRetrieved.includes(ref),
  );
  const forbiddenNoise = uniqueRetrieved.filter((ref) =>
    resolvedCase.forbidden_noise.includes(ref),
  );
  const warningGaps = warningGapsFor(resolvedCase, observedWarnings);
  const resultStatus = classifyResult(
    variant,
    failedMetrics,
    missingPrimary,
    forbiddenNoise,
    warningGaps,
    observedWarnings,
  );

  return {
    case_id: resolvedCase.id,
    variant_id: variant.id,
    query: variant.query,
    baseline_status: variant.baseline_status,
    result_status: resultStatus,
    failed_metrics: failedMetrics,
    metrics,
    missing_primary_refs: missingPrimary,
    forbidden_noise_refs: forbiddenNoise,
    warning_gaps: warningGaps,
    observed_warnings: observedWarnings,
    top_evidence_refs: uniqueRetrieved.slice(0, 10),
    retrieved_refs: uniqueRetrieved,
    calls: ctx.stepRuns.length,
    total_bytes: ctx.stepRuns.reduce((sum, step) => sum + step.bytes, 0),
    steps: ctx.stepRuns,
  };
}

async function executeStep(step: ToolStep, ctx: RunContext): Promise<StepRun> {
  const params = resolveParams(step, ctx);
  let output: ToolOutput;
  if (step.tool === 'search_memories') {
    output = await searchMemories(
      ctx.corpus.storage,
      params as Parameters<typeof searchMemories>[1],
    );
  } else if (step.tool === 'find_clusters') {
    output = await findClusters(
      ctx.corpus.storage,
      params as Parameters<typeof findClusters>[1],
      new Date(ctx.resolvedCase.reference_now),
    );
  } else {
    const atomIds = Array.isArray(params.atom_ids) ? params.atom_ids.map(String) : [];
    if (atomIds.length > 50 && step.paginate === true) {
      output = await getAtomsPaginated(ctx.corpus.storage, params, atomIds);
    } else {
      output = await getAtoms(ctx.corpus.storage, {
        ...params,
        atom_ids: atomIds,
      } as Parameters<typeof getAtoms>[1]);
    }
  }
  const bytes = JSON.stringify(output).length;
  return {
    step_id: step.step_id,
    tool: step.tool,
    bytes,
    output,
    warnings: toolWarnings(step.step_id, output),
  };
}

function resolveParams(step: ToolStep, ctx: RunContext): Record<string, unknown> {
  const raw = resolveUnknown(step.params, ctx) as Record<string, unknown>;
  if (step.tool !== 'get_atoms') return raw;
  const atomIdsRaw = Array.isArray(raw.atom_ids) ? raw.atom_ids.map(String) : [];
  const atomIds =
    step.deterministic_order === 'newest_first'
      ? orderAtomIdsNewestFirst(atomIdsRaw, ctx.corpus)
      : atomIdsRaw;
  if (step.ids_limit !== undefined && atomIds.length > step.ids_limit) {
    ctx.evalWarnings.push({
      code: 'eval_truncated_hydration',
      origin: 'eval',
      message: `hydration step '${step.step_id}' clipped ${atomIds.length} ids to ${step.ids_limit}`,
      step_id: step.step_id,
    });
    raw.atom_ids = atomIds.slice(0, step.ids_limit);
  }
  return raw;
}

function orderAtomIdsNewestFirst(atomIds: readonly string[], corpus: FixtureCorpus): string[] {
  return [...atomIds].sort((a, b) => {
    const refA = corpus.idToRef.get(a);
    const refB = corpus.idToRef.get(b);
    const eventA = refA === undefined ? undefined : corpus.refToEvent.get(refA);
    const eventB = refB === undefined ? undefined : corpus.refToEvent.get(refB);
    const timeA = eventA === undefined ? -Infinity : Date.parse(eventA.timestamp);
    const timeB = eventB === undefined ? -Infinity : Date.parse(eventB.timestamp);
    if (timeA !== timeB) return timeB - timeA;
    return atomIds.indexOf(a) - atomIds.indexOf(b);
  });
}

function resolveUnknown(value: unknown, ctx: RunContext): unknown {
  if (typeof value === 'string') return resolveString(value, ctx);
  if (Array.isArray(value)) return value.map((entry) => resolveUnknown(entry, ctx));
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveUnknown(v, ctx);
    return out;
  }
  return value;
}

function resolveString(value: string, ctx: RunContext): unknown {
  if (!value.startsWith('$')) return value;
  if (value === '$query') return ctx.variant.query;
  if (value === '$case.repo_path') return ctx.resolvedCase.repo_path;
  if (value === '$case.time_window.since') return ctx.resolvedCase.time_window.since;
  if (value === '$case.time_window.until') return ctx.resolvedCase.time_window.until;
  if (value === '$case.reference_now') return ctx.resolvedCase.reference_now;
  if (value.startsWith('$labels.')) {
    const key = value.slice('$labels.'.length) as keyof RetrievalCase;
    const refs = Array.isArray(ctx.resolvedCase[key]) ? (ctx.resolvedCase[key] as string[]) : [];
    return refs
      .map((ref) => ctx.corpus.refToId.get(ref))
      .filter((id): id is string => id !== undefined);
  }
  const stepMatch = /^\$steps\.([A-Za-z0-9_-]+)\.(.+)$/.exec(value);
  if (stepMatch !== null) {
    const stepId = stepMatch[1]!;
    const selector = stepMatch[2]!;
    const output = ctx.stepOutputs.get(stepId);
    if (output === undefined) return [];
    if (selector === 'matches[*].id' && isSearchResult(output)) {
      return output.matches.map((m) => m.id);
    }
    if (selector === 'clusters[0].atom_ids' && isFindClustersResult(output)) {
      return output.clusters[0]?.atom_ids ?? [];
    }
    if (selector === 'atoms[*].id' && isGetAtomsResult(output)) {
      return output.atoms.map((atom) => atom.id);
    }
  }
  return value;
}

async function getAtomsPaginated(
  storage: MemoryStorage,
  params: Record<string, unknown>,
  atomIds: string[],
): Promise<GetAtomsResult> {
  const chunks: string[][] = [];
  for (let i = 0; i < atomIds.length; i += 50) chunks.push(atomIds.slice(i, i + 50));
  const atoms: GetAtomsResult['atoms'] = [];
  const droppedIds: string[] = [];
  const warnings: string[] = [];
  for (const chunk of chunks) {
    const result = await getAtoms(storage, { ...params, atom_ids: chunk } as Parameters<
      typeof getAtoms
    >[1]);
    atoms.push(...result.atoms);
    droppedIds.push(...result.atoms_dropped_ids);
    warnings.push(...result.warnings);
  }
  return {
    schema_version: 1,
    tool: 'get_atoms',
    atoms,
    atoms_dropped: droppedIds.length,
    atoms_dropped_ids: droppedIds,
    warnings,
  };
}

function scoreMetrics(
  caseDef: RetrievalCase,
  primaryOutput: ToolOutput,
  primaryRefs: string[],
  retrievedRefs: string[],
  steps: StepRun[],
  warnings: EvalWarning[],
): Record<MetricName, MetricResult> {
  const primaryRecall =
    caseDef.required_primary.length === 0
      ? 1
      : caseDef.required_primary.filter((ref) => retrievedRefs.includes(ref)).length /
        caseDef.required_primary.length;
  const firstClusterOrTopMatches = topRankSuccess(caseDef, primaryOutput, primaryRefs);
  const weightedAt5 = weightedPrecision(caseDef, retrievedRefs.slice(0, 5));
  const weightedOverall = weightedPrecision(caseDef, retrievedRefs);
  const snr = signalNoiseRatio(caseDef, retrievedRefs.slice(0, 10));
  const forbiddenTop10 = retrievedRefs
    .slice(0, 10)
    .some((ref) => caseDef.forbidden_noise.includes(ref));
  const forbiddenAnywhere = retrievedRefs.some((ref) => caseDef.forbidden_noise.includes(ref));
  const forbiddenPass = caseDef.priority === 'P0' ? !forbiddenAnywhere : !forbiddenTop10;
  const sourceCoverage = sourceCoverageScore(caseDef, retrievedRefs, warnings);
  const lossLegibility = warningGapsFor(caseDef, warnings).length === 0;
  const maxCallBytes = Math.max(0, ...steps.map((step) => step.bytes));
  const totalBytes = steps.reduce((sum, step) => sum + step.bytes, 0);
  const callCount = steps.length;

  return {
    primary_recall: {
      value: primaryRecall,
      pass: primaryRecall >= 1,
      gate: caseDef.priority === 'P0' ? 'P0 required-primary recall = 1.00' : 'case recall = 1.00',
    },
    top_rank_success: {
      value: firstClusterOrTopMatches,
      pass: firstClusterOrTopMatches,
      gate: 'primary evidence appears in first cluster or first 3 matches',
    },
    weighted_precision_at_5: {
      value: weightedAt5,
      pass: weightedAt5 >= 0.8,
      gate: '>= 0.80',
    },
    weighted_precision_overall: {
      value: weightedOverall,
      pass: weightedOverall >= 0.7,
      gate: '>= 0.70',
    },
    signal_noise_ratio_at_10: {
      value: snr,
      pass: snr >= 4,
      gate: '>= 4:1',
    },
    forbidden_noise: {
      value: forbiddenAnywhere,
      pass: forbiddenPass,
      gate: caseDef.priority === 'P0' ? '0 anywhere' : '0 in top 10',
    },
    source_coverage: {
      value: sourceCoverage,
      pass: sourceCoverage >= 1,
      gate: caseDef.priority === 'P0' ? '100%' : 'case required sources covered or warned',
    },
    loss_legibility: {
      value: lossLegibility,
      pass: lossLegibility,
      gate: 'all must_warn entries observed with allowed origin',
    },
    per_call_budget_bytes: {
      value: maxCallBytes,
      pass: maxCallBytes <= caseDef.budgets.per_call_bytes,
      gate: `<= ${caseDef.budgets.per_call_bytes}`,
    },
    recipe_budget_bytes: {
      value: totalBytes,
      pass: totalBytes <= caseDef.budgets.total_bytes,
      gate: `<= ${caseDef.budgets.total_bytes}`,
    },
    call_efficiency: {
      value: callCount,
      pass: callCount <= caseDef.budgets.max_calls,
      gate: `<= ${caseDef.budgets.max_calls}`,
    },
  };
}

function classifyResult(
  variant: RetrievalCase['query_variants'][number],
  failedMetrics: MetricName[],
  missingPrimary: string[],
  forbiddenNoise: string[],
  warningGaps: string[],
  observedWarnings: EvalWarning[],
): ResultStatus {
  if (failedMetrics.length === 0) {
    return variant.baseline_status === 'pass' ? 'pass' : 'expected_fail_mismatched';
  }
  if (variant.baseline_status === 'pass' || variant.expected_failure === undefined) {
    return 'unexpected_fail';
  }
  const expected = variant.expected_failure;
  const allowed =
    failedMetrics.every((m) => expected.allowed_failed_metrics.includes(m)) &&
    missingPrimary.every((ref) => expected.allowed_missing_refs.includes(ref)) &&
    forbiddenNoise.every((ref) => expected.allowed_forbidden_noise_refs.includes(ref)) &&
    warningGaps.every((code) => expected.allowed_warning_gaps.includes(code)) &&
    (expected.required_observed_warnings ?? []).every((code) =>
      observedWarnings.some((warning) => warning.code === code),
    );
  return allowed ? 'expected_fail_matched' : 'expected_fail_mismatched';
}

function topRankSuccess(
  caseDef: RetrievalCase,
  primaryOutput: ToolOutput,
  primaryRefs: string[],
): boolean {
  if (caseDef.required_primary.length === 0) return true;
  if (isFindClustersResult(primaryOutput)) {
    const firstClusterRefs = primaryRefs;
    return caseDef.required_primary.some((ref) => firstClusterRefs.includes(ref));
  }
  return caseDef.required_primary.some((ref) => primaryRefs.slice(0, 3).includes(ref));
}

function weightedPrecision(caseDef: RetrievalCase, refs: string[]): number {
  if (refs.length === 0) return 0;
  const total = refs.reduce((sum, ref) => sum + weightFor(caseDef, ref), 0);
  return total / refs.length;
}

function signalNoiseRatio(caseDef: RetrievalCase, refs: string[]): number {
  let positive = 0;
  let noise = 0;
  for (const ref of refs) {
    const weight = weightFor(caseDef, ref);
    if (weight > 0) positive += weight;
    else if (caseDef.noise.includes(ref) || caseDef.forbidden_noise.includes(ref)) noise += 1;
  }
  if (noise === 0) return positive > 0 ? 999 : 0;
  return positive / noise;
}

function weightFor(caseDef: RetrievalCase, ref: string): number {
  if (caseDef.required_primary.includes(ref)) return 1;
  if (caseDef.required_context.includes(ref)) return 0.5;
  if (caseDef.acceptable_context.includes(ref)) return 0.25;
  return 0;
}

function sourceCoverageScore(
  caseDef: RetrievalCase,
  retrievedRefs: string[],
  warnings: readonly EvalWarning[],
): number {
  if (caseDef.required_sources.length === 0) return 1;
  const lanes = new Set(
    retrievedRefs
      .map((ref) => caseDefToSource(ref, warnings))
      .filter((source): source is string => source !== undefined),
  );
  let covered = 0;
  for (const source of caseDef.required_sources) {
    if (
      lanes.has(source) ||
      warnings.some((w) => w.code === 'eval_source_gap' && w.ref === source)
    ) {
      covered += 1;
    }
  }
  return covered / caseDef.required_sources.length;
}

function caseDefToSource(ref: string, warnings: readonly EvalWarning[]): string | undefined {
  const sourceWarning = warnings.find((w) => w.ref === `source:${ref}`);
  return sourceWarning?.message;
}

function addSourceGapWarnings(
  caseDef: RetrievalCase,
  retrievedRefs: string[],
  corpus: FixtureCorpus,
  warnings: EvalWarning[],
): void {
  const retrievedSources = new Set<string>();
  for (const ref of retrievedRefs) {
    const event = corpus.refToEvent.get(ref);
    const source = event === undefined ? undefined : sourceLane(event.source);
    if (source !== undefined) retrievedSources.add(source);
    if (source !== undefined) {
      warnings.push({
        code: 'eval_source_observed',
        origin: 'eval',
        message: source,
        ref: `source:${ref}`,
      });
    }
  }
  for (const required of caseDef.required_sources) {
    if (!retrievedSources.has(required)) {
      warnings.push({
        code: 'eval_source_gap',
        origin: 'eval',
        message: `required source '${required}' was missing from retrieved evidence`,
        ref: required,
      });
    }
  }
}

function addForbiddenNoiseWarnings(
  caseDef: RetrievalCase,
  retrievedRefs: string[],
  warnings: EvalWarning[],
): void {
  for (const ref of retrievedRefs) {
    if (caseDef.forbidden_noise.includes(ref)) {
      warnings.push({
        code: 'eval_forbidden_noise',
        origin: 'eval',
        message: `forbidden noise '${ref}' was retrieved`,
        ref,
      });
    }
  }
}

function warningGapsFor(caseDef: RetrievalCase, warnings: readonly EvalWarning[]): string[] {
  const gaps: string[] = [];
  for (const expected of caseDef.must_warn) {
    const found = warnings.some(
      (warning) => warning.code === expected.code && expected.origins.includes(warning.origin),
    );
    if (!found) gaps.push(expected.code);
  }
  return gaps;
}

function primaryEvidenceRefs(output: ToolOutput, idToRef: Map<string, string>): string[] {
  if (isSearchResult(output)) return output.matches.map((m) => idToRef.get(m.id)).filter(isString);
  if (isFindClustersResult(output)) {
    return (output.clusters[0]?.atom_ids ?? []).map((id) => idToRef.get(id)).filter(isString);
  }
  return output.atoms.map((atom) => idToRef.get(atom.id)).filter(isString);
}

function hydratedEvidenceRefs(steps: readonly StepRun[], idToRef: Map<string, string>): string[] {
  const refs: string[] = [];
  for (const step of steps) {
    if (!isGetAtomsResult(step.output)) continue;
    for (const atom of step.output.atoms) {
      const ref = idToRef.get(atom.id);
      if (ref !== undefined) refs.push(ref);
    }
  }
  return refs;
}

function toolWarnings(stepId: string, output: ToolOutput): EvalWarning[] {
  const rawWarnings =
    isSearchResult(output) || isFindClustersResult(output) || isGetAtomsResult(output)
      ? output.warnings
      : [];
  return rawWarnings.map((warning) => ({
    code: toolWarningCode(warning),
    origin: 'tool',
    message: warning,
    step_id: stepId,
  }));
}

function toolWarningCode(warning: string): string {
  if (warning.includes('[AUTO_EXPAND]')) return 'tool_auto_expand';
  if (warning.includes('TZ') || warning.includes('timezone')) return 'tool_tz_naive';
  if (warning.includes('storage cap')) return 'tool_storage_cap';
  if (warning.includes('dropped') || warning.includes('ceiling')) return 'tool_budget_cap';
  return 'tool_warning';
}

async function buildCorpus(
  events: readonly FixtureEvent[],
  repoRoot: string,
  homeDir: string,
): Promise<FixtureCorpus> {
  const storage = new MemoryStorage();
  const idToRef = new Map<EventId, string>();
  const refToId = new Map<string, EventId>();
  const refToEvent = new Map<string, CaptureEvent>();
  for (const fixture of events) {
    const rewritten = rewriteFixtureEvent(fixture, repoRoot, homeDir);
    const id = await storage.append(rewritten);
    idToRef.set(id, fixture.fixture_ref);
    refToId.set(fixture.fixture_ref, id);
    refToEvent.set(fixture.fixture_ref, { ...rewritten, id });
  }
  return { storage, idToRef, refToId, refToEvent };
}

function rewriteFixtureEvent(
  event: FixtureEvent,
  repoRoot: string,
  homeDir: string,
): Omit<CaptureEvent, 'id'> {
  const rewritten: Omit<CaptureEvent, 'id'> = {
    source: rewriteTokenString(event.source, repoRoot, homeDir),
    timestamp: event.timestamp,
    content: rewriteTokenString(event.content, repoRoot, homeDir),
  };
  const metadata = rewriteUnknown(event.metadata, repoRoot, homeDir);
  if (isRecord(metadata)) {
    rewritten.metadata = { ...metadata, fixture_ref: event.fixture_ref };
  } else {
    rewritten.metadata = { fixture_ref: event.fixture_ref };
  }
  if (event.embedding !== undefined) rewritten.embedding = event.embedding;
  return rewritten;
}

function rewriteCase(c: RetrievalCase, repoRoot: string): RetrievalCase {
  return rewriteUnknown(c, repoRoot, homedir()) as RetrievalCase;
}

function rewriteUnknown(value: unknown, repoRoot: string, homeDir: string): unknown {
  if (typeof value === 'string') return rewriteTokenString(value, repoRoot, homeDir);
  if (Array.isArray(value)) return value.map((entry) => rewriteUnknown(entry, repoRoot, homeDir));
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = rewriteUnknown(v, repoRoot, homeDir);
    return out;
  }
  return value;
}

function rewriteTokenString(value: string, repoRoot: string, homeDir: string): string {
  return value.replaceAll('$EVAL_REPO', repoRoot).replaceAll('$EVAL_HOME', homeDir);
}

function validateTimestampDeterminism(events: readonly FixtureEvent[]): void {
  const seen = new Map<string, FixtureEvent>();
  for (const event of events) {
    const source = event.source;
    const key = `${source}\0${event.timestamp}`;
    const prior = seen.get(key);
    if (prior !== undefined) {
      throw new ValidationError([
        `duplicate timestamp for source '${source}' at ${event.timestamp}: ${prior.fixture_ref}, ${event.fixture_ref}`,
      ]);
    }
    seen.set(key, event);
  }
}

function sourceLane(source: string): string | undefined {
  if (source.startsWith('git:')) return 'git';
  if (source.includes('/.claude/projects/')) return 'claude_code';
  if (source.includes('/.codex/sessions/')) return 'codex';
  if (source.includes('/Library/Application Support/Cursor/')) return 'cursor';
  return undefined;
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function formatWarnings(warnings: readonly EvalWarning[]): string {
  if (warnings.length === 0) return 'none';
  return warnings.map((w) => `${w.origin}:${w.code}`).join(', ');
}

function isSearchResult(value: ToolOutput): value is SearchResult {
  return 'matches' in value;
}

function isFindClustersResult(value: ToolOutput): value is FindClustersResult {
  return 'clusters' in value;
}

function isGetAtomsResult(value: ToolOutput): value is GetAtomsResult {
  return 'atoms' in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: string | undefined): value is string {
  return value !== undefined;
}

export class ValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join('\n'));
    this.name = 'ValidationError';
  }
}

function parseArgs(argv: readonly string[]): { caseId?: string; format: 'json' | 'md' } {
  let caseId: string | undefined;
  let format: 'json' | 'md' = 'md';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--case') {
      caseId = argv[++i];
    } else if (arg === '--format') {
      const next = argv[++i];
      if (next !== 'json' && next !== 'md') {
        throw new ValidationError([`--format must be json or md, got '${String(next)}'`]);
      }
      format = next;
    } else if (arg === '--update-fixtures') {
      throw new ValidationError([
        '--update-fixtures is only available through tools/retrieval-eval/build-fixture.ts local provenance mode',
      ]);
    } else {
      throw new ValidationError([`unknown argument '${arg}'`]);
    }
  }
  return { caseId, format };
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    const summary = await runRetrievalEval({ caseId: args.caseId });
    process.stdout.write(
      args.format === 'json' ? `${JSON.stringify(summary, null, 2)}\n` : formatMarkdown(summary),
    );
    process.exitCode = summary.aggregate.exit_code;
  } catch (err) {
    if (err instanceof ValidationError) {
      process.stderr.write(`retrieval eval validation failed:\n${err.errors.join('\n')}\n`);
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
      arg.endsWith('tools/retrieval-eval/run.ts') || arg.endsWith('tools/retrieval-eval/run.js'),
  );

if (invokedAsScript) {
  await main();
}
