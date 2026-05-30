import type { CaptureEvent } from '../../src/storage/interface.js';

export const PRIORITIES = ['P0', 'P1', 'P2'] as const;
export const BASELINE_STATUSES = ['pass', 'expected_fail_current_behavior'] as const;
export const WARNING_ORIGINS = ['tool', 'eval'] as const;
export const TOOL_NAMES = ['search_memories', 'find_clusters', 'get_atoms'] as const;
export const STEP_KINDS = ['discovery', 'hydration', 'scoring_input'] as const;

export type Priority = (typeof PRIORITIES)[number];
export type BaselineStatus = (typeof BASELINE_STATUSES)[number];
export type WarningOrigin = (typeof WARNING_ORIGINS)[number];
export type ToolName = (typeof TOOL_NAMES)[number];
export type StepKind = (typeof STEP_KINDS)[number];

export type MetricName =
  | 'primary_recall'
  | 'top_rank_success'
  | 'weighted_precision_at_5'
  | 'weighted_precision_overall'
  | 'signal_noise_ratio_at_10'
  | 'forbidden_noise'
  | 'source_coverage'
  | 'loss_legibility'
  | 'per_call_budget_bytes'
  | 'recipe_budget_bytes'
  | 'call_efficiency';

export interface TimeWindow {
  since: string;
  until: string;
}

export interface QueryVariant {
  id: string;
  query: string;
  baseline_status: BaselineStatus;
  expected_failure?: ExpectedFailure;
}

export interface ExpectedFailure {
  reason: string;
  followup_candidate: string;
  allowed_failed_metrics: MetricName[];
  allowed_missing_refs: string[];
  allowed_forbidden_noise_refs: string[];
  allowed_warning_gaps: string[];
  required_observed_warnings?: string[];
}

export interface ToolStep {
  step_id: string;
  tool: ToolName;
  kind: StepKind;
  params: Record<string, unknown>;
  primary_discovery?: boolean;
  ids_limit?: number;
  paginate?: boolean;
  deterministic_order?: 'discovery_order' | 'newest_first';
}

export interface WarningExpectation {
  code: string;
  origins: WarningOrigin[];
}

export interface RetrievalBudgets {
  per_call_bytes: number;
  total_bytes: number;
  max_calls: number;
}

export interface ProvenanceRef {
  kind: 'journal' | 'raw_jsonl' | 'artifact' | 'decision' | 'note';
  ref: string;
  note?: string;
}

export interface RetrievalCase {
  id: string;
  priority: Priority;
  intent: string;
  repo_path: string;
  time_window: TimeWindow;
  reference_now: string;
  fixture_files: string[];
  query_variants: QueryVariant[];
  tool_recipe: ToolStep[];
  required_sources: string[];
  required_primary: string[];
  required_context: string[];
  acceptable_context: string[];
  noise: string[];
  forbidden_noise: string[];
  must_warn: WarningExpectation[];
  canonical_answer_facts: string[];
  budgets: RetrievalBudgets;
  provenance: ProvenanceRef[];
}

export interface FixtureEvent extends Omit<CaptureEvent, 'id'> {
  fixture_ref: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
}

const ISO_WITH_TZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/;
const PLACEHOLDER_RE =
  /^\$(query|case\.repo_path|case\.time_window\.(since|until)|case\.reference_now|steps\.[A-Za-z0-9_-]+\.(matches\[\*\]\.id|clusters\[0\]\.atom_ids|atoms\[\*\]\.id)|labels\.[A-Za-z0-9_]+)$/;
const LABEL_GROUPS = [
  'required_primary',
  'required_context',
  'acceptable_context',
  'noise',
  'forbidden_noise',
] as const;

export function validateRetrievalCase(
  input: unknown,
  fixtureRefs?: ReadonlySet<string>,
): ValidationResult<RetrievalCase> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ['case must be an object'] };
  }

  const c = input as Record<string, unknown>;
  requireString(c, 'id', errors);
  requireEnum(c, 'priority', PRIORITIES, errors);
  requireString(c, 'intent', errors);
  requireString(c, 'repo_path', errors);
  requireString(c, 'reference_now', errors);
  requireRecord(c, 'time_window', errors);
  requireArray(c, 'fixture_files', errors);
  requireArray(c, 'query_variants', errors);
  requireArray(c, 'tool_recipe', errors);
  requireArray(c, 'required_sources', errors);
  requireArray(c, 'must_warn', errors);
  requireArray(c, 'canonical_answer_facts', errors);
  requireArray(c, 'provenance', errors);
  requireRecord(c, 'budgets', errors);
  for (const group of LABEL_GROUPS) requireArray(c, group, errors);

  if (typeof c.reference_now === 'string' && !ISO_WITH_TZ_RE.test(c.reference_now)) {
    errors.push('reference_now must be an ISO-8601 timestamp with an explicit timezone');
  }
  if (isRecord(c.time_window)) {
    const tw = c.time_window;
    requireString(tw, 'since', errors, 'time_window.since');
    requireString(tw, 'until', errors, 'time_window.until');
    for (const key of ['since', 'until'] as const) {
      const value = tw[key];
      if (typeof value === 'string' && !ISO_WITH_TZ_RE.test(value)) {
        errors.push(`time_window.${key} must be an ISO-8601 timestamp with an explicit timezone`);
      }
    }
  }

  validateStringArray(c, 'fixture_files', errors);
  validateStringArray(c, 'required_sources', errors);
  validateStringArray(c, 'canonical_answer_facts', errors);
  for (const group of LABEL_GROUPS) validateStringArray(c, group, errors);

  validateBudgets(c.budgets, errors);
  validateQueryVariants(c.query_variants, errors);
  validateToolRecipe(c.tool_recipe, errors);
  validateWarnings(c.must_warn, errors);
  validateProvenance(c.provenance, errors);

  const allRefs = new Set<string>();
  for (const group of LABEL_GROUPS) {
    const refs = c[group];
    if (!Array.isArray(refs)) continue;
    for (const ref of refs) {
      if (typeof ref !== 'string') continue;
      if (allRefs.has(ref)) {
        errors.push(`fixture ref '${ref}' appears in more than one label group`);
      }
      allRefs.add(ref);
      if (fixtureRefs !== undefined && !fixtureRefs.has(ref)) {
        errors.push(`label '${group}' references missing fixture_ref '${ref}'`);
      }
    }
  }

  if (c.priority === 'P0' && Array.isArray(c.required_primary) && c.required_primary.length === 0) {
    errors.push('P0 cases must declare at least one required_primary ref');
  }

  return errors.length === 0
    ? { ok: true, value: c as unknown as RetrievalCase, errors }
    : { ok: false, errors };
}

export function validateFixtureEvent(input: unknown): ValidationResult<FixtureEvent> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ['fixture event must be an object'] };
  }
  requireString(input, 'fixture_ref', errors);
  requireString(input, 'source', errors);
  requireString(input, 'timestamp', errors);
  requireString(input, 'content', errors);
  if (typeof input.timestamp === 'string' && !ISO_WITH_TZ_RE.test(input.timestamp)) {
    errors.push('fixture event timestamp must be an ISO-8601 timestamp with an explicit timezone');
  }
  if ('metadata' in input && input.metadata !== undefined && !isRecord(input.metadata)) {
    errors.push('fixture event metadata must be an object when present');
  }
  return errors.length === 0
    ? { ok: true, value: input as unknown as FixtureEvent, errors }
    : { ok: false, errors };
}

export function collectLabelRefs(c: RetrievalCase): Set<string> {
  const refs = new Set<string>();
  for (const group of LABEL_GROUPS) {
    for (const ref of c[group]) refs.add(ref);
  }
  return refs;
}

export function collectFixtureRefs(events: readonly FixtureEvent[]): Set<string> {
  return new Set(events.map((event) => event.fixture_ref));
}

function validateQueryVariants(input: unknown, errors: string[]): void {
  if (!Array.isArray(input)) return;
  if (input.length < 2) errors.push('query_variants must include at least two variants');
  const seen = new Set<string>();
  for (const [idx, raw] of input.entries()) {
    const prefix = `query_variants[${idx}]`;
    if (!isRecord(raw)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    const id = raw.id;
    requireString(raw, 'id', errors, `${prefix}.id`);
    requireString(raw, 'query', errors, `${prefix}.query`);
    requireEnum(raw, 'baseline_status', BASELINE_STATUSES, errors, `${prefix}.baseline_status`);
    if (typeof id === 'string') {
      if (seen.has(id)) errors.push(`${prefix}.id duplicates '${id}'`);
      seen.add(id);
    }
    if (raw.baseline_status === 'expected_fail_current_behavior') {
      validateExpectedFailure(raw.expected_failure, errors, `${prefix}.expected_failure`);
    } else if (raw.expected_failure !== undefined) {
      errors.push(`${prefix}.expected_failure is only legal on expected_fail_current_behavior`);
    }
  }
}

function validateExpectedFailure(input: unknown, errors: string[], prefix: string): void {
  if (!isRecord(input)) {
    errors.push(`${prefix} must be present and must be an object`);
    return;
  }
  requireString(input, 'reason', errors, `${prefix}.reason`);
  requireString(input, 'followup_candidate', errors, `${prefix}.followup_candidate`);
  validateMetricArray(input, 'allowed_failed_metrics', errors, prefix);
  validateStringArray(input, 'allowed_missing_refs', errors, `${prefix}.allowed_missing_refs`);
  validateStringArray(
    input,
    'allowed_forbidden_noise_refs',
    errors,
    `${prefix}.allowed_forbidden_noise_refs`,
  );
  validateStringArray(input, 'allowed_warning_gaps', errors, `${prefix}.allowed_warning_gaps`);
  if (input.required_observed_warnings !== undefined) {
    validateStringArray(
      input,
      'required_observed_warnings',
      errors,
      `${prefix}.required_observed_warnings`,
    );
  }
}

function validateToolRecipe(input: unknown, errors: string[]): void {
  if (!Array.isArray(input)) return;
  const seen = new Set<string>();
  let primaryDiscoveryCount = 0;
  for (const [idx, raw] of input.entries()) {
    const prefix = `tool_recipe[${idx}]`;
    if (!isRecord(raw)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    requireString(raw, 'step_id', errors, `${prefix}.step_id`);
    requireEnum(raw, 'tool', TOOL_NAMES, errors, `${prefix}.tool`);
    requireEnum(raw, 'kind', STEP_KINDS, errors, `${prefix}.kind`);
    requireRecord(raw, 'params', errors, `${prefix}.params`);
    if (typeof raw.step_id === 'string') {
      if (seen.has(raw.step_id)) errors.push(`${prefix}.step_id duplicates '${raw.step_id}'`);
      seen.add(raw.step_id);
    }
    if (raw.primary_discovery === true) primaryDiscoveryCount += 1;
    if (isRecord(raw.params)) validatePlaceholders(raw.params, errors, `${prefix}.params`);

    if (raw.tool === 'get_atoms') {
      const atomIds = isRecord(raw.params) ? raw.params.atom_ids : undefined;
      const bindsCollection =
        typeof atomIds === 'string' &&
        (atomIds.includes('matches[*].id') ||
          atomIds.includes('clusters[0].atom_ids') ||
          atomIds.includes('atoms[*].id'));
      const idsLimit = raw.ids_limit;
      const paginate = raw.paginate === true;
      if (
        idsLimit !== undefined &&
        (typeof idsLimit !== 'number' ||
          !Number.isInteger(idsLimit) ||
          idsLimit < 1 ||
          idsLimit > 50)
      ) {
        errors.push(`${prefix}.ids_limit must be an integer from 1 to 50`);
      }
      if (bindsCollection && idsLimit === undefined && !paginate) {
        errors.push(
          `${prefix} binds a get_atoms collection and must declare ids_limit <= 50 or paginate: true`,
        );
      }
      if (bindsCollection && idsLimit !== undefined && raw.deterministic_order === undefined) {
        errors.push(`${prefix}.deterministic_order is required when ids_limit clips a collection`);
      }
    }
  }
  if (primaryDiscoveryCount !== 1) {
    errors.push('exactly one tool_recipe step must set primary_discovery: true');
  }
}

function validateWarnings(input: unknown, errors: string[]): void {
  if (!Array.isArray(input)) return;
  for (const [idx, raw] of input.entries()) {
    const prefix = `must_warn[${idx}]`;
    if (!isRecord(raw)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    requireString(raw, 'code', errors, `${prefix}.code`);
    if (!Array.isArray(raw.origins)) {
      errors.push(`${prefix}.origins must be an array`);
      continue;
    }
    for (const origin of raw.origins) {
      if (!WARNING_ORIGINS.includes(origin as WarningOrigin)) {
        errors.push(`${prefix}.origins contains unsupported origin '${String(origin)}'`);
      }
    }
  }
}

function validateProvenance(input: unknown, errors: string[]): void {
  if (!Array.isArray(input)) return;
  for (const [idx, raw] of input.entries()) {
    const prefix = `provenance[${idx}]`;
    if (!isRecord(raw)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    requireString(raw, 'kind', errors, `${prefix}.kind`);
    requireString(raw, 'ref', errors, `${prefix}.ref`);
  }
}

function validateBudgets(input: unknown, errors: string[]): void {
  if (!isRecord(input)) return;
  for (const key of ['per_call_bytes', 'total_bytes', 'max_calls'] as const) {
    const value = input[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      errors.push(`budgets.${key} must be a positive integer`);
    }
  }
}

function validateMetricArray(
  input: Record<string, unknown>,
  key: string,
  errors: string[],
  prefix: string,
): void {
  if (!Array.isArray(input[key])) {
    errors.push(`${prefix}.${key} must be an array`);
    return;
  }
  const metrics: MetricName[] = [
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
  for (const value of input[key]) {
    if (!metrics.includes(value as MetricName)) {
      errors.push(`${prefix}.${key} contains unsupported metric '${String(value)}'`);
    }
  }
}

function validatePlaceholders(
  input: Record<string, unknown>,
  errors: string[],
  prefix: string,
): void {
  for (const [key, value] of Object.entries(input)) {
    const path = `${prefix}.${key}`;
    if (typeof value === 'string' && value.startsWith('$') && !PLACEHOLDER_RE.test(value)) {
      errors.push(`${path} contains unsupported placeholder '${value}'`);
    } else if (Array.isArray(value)) {
      value.forEach((entry, idx) => {
        if (typeof entry === 'string' && entry.startsWith('$') && !PLACEHOLDER_RE.test(entry)) {
          errors.push(`${path}[${idx}] contains unsupported placeholder '${entry}'`);
        }
      });
    } else if (isRecord(value)) {
      validatePlaceholders(value, errors, path);
    }
  }
}

function validateStringArray(
  input: Record<string, unknown>,
  key: string,
  errors: string[],
  prefix = key,
): void {
  if (!Array.isArray(input[key])) {
    errors.push(`${prefix} must be an array`);
    return;
  }
  for (const [idx, value] of input[key].entries()) {
    if (typeof value !== 'string' || value.length === 0) {
      errors.push(`${prefix}[${idx}] must be a non-empty string`);
    }
  }
}

function requireString(
  input: Record<string, unknown>,
  key: string,
  errors: string[],
  label = key,
): void {
  if (typeof input[key] !== 'string' || input[key].length === 0) {
    errors.push(`${label} must be a non-empty string`);
  }
}

function requireArray(input: Record<string, unknown>, key: string, errors: string[]): void {
  if (!Array.isArray(input[key])) errors.push(`${key} must be an array`);
}

function requireRecord(
  input: Record<string, unknown>,
  key: string,
  errors: string[],
  label = key,
): void {
  if (!isRecord(input[key])) errors.push(`${label} must be an object`);
}

function requireEnum<T extends readonly string[]>(
  input: Record<string, unknown>,
  key: string,
  allowed: T,
  errors: string[],
  label = key,
): void {
  if (!allowed.includes(input[key] as T[number])) {
    errors.push(`${label} must be one of ${allowed.join(', ')}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
