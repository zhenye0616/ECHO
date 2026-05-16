// 057a AC2 — TS daemon loader for tools/review-queue/coord-roles.json.
//
// Single load point, called once from startMcpServer() at boot, BEFORE any
// tool registration. The returned frozen `CoordRolesConfig` is the daemon-side
// source of truth for per-role-per-event-type SLA (default + max deadlines,
// expected close event) and the slot universe consumed by future AC1/AC3/AC6
// surfaces (coord_emit / deadlines / coord_status).
//
// Why TypeScript (not just Python): per 057a r1 codex F4 MED, bad-config must
// cause daemon-startup failure (not a per-request error every 10 minutes).
// The Python sibling at tools/review-queue/_coord_roles.py is CI/static-check
// only — same rules, different code path; it's not loaded by the daemon.
//
// Why ajv + import.meta.url: per 057a r2 codex F2 MED + r2 codex-ops F5 MED
// — the repo had no JS JSON-Schema validator, and the loader must resolve
// the config path independently of `process.cwd()` so a daemon launched from
// a launchd plist (cwd=/) still finds coord-roles.json.

import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
// ajv@8 + ajv-formats@3 ship CJS `main`s; under `module: NodeNext` +
// `esModuleInterop: true`, TypeScript types the default import as the
// module-namespace object rather than the callable/class. ajv's NAMED
// export `Ajv` lands the class cleanly; ajv-formats has no named export
// for the plugin, so we runtime-unwrap the namespace default.
import { Ajv, type AnySchema, type ValidateFunction } from 'ajv';
import addFormatsImport from 'ajv-formats';

type AddFormatsFn = (ajv: InstanceType<typeof Ajv>) => InstanceType<typeof Ajv>;

const addFormats: AddFormatsFn =
  typeof addFormatsImport === 'function'
    ? (addFormatsImport as unknown as AddFormatsFn)
    : (((addFormatsImport as unknown as { default: AddFormatsFn }).default ??
        (addFormatsImport as unknown as AddFormatsFn)) as AddFormatsFn);

export interface CoordEventConfig {
  readonly default_deadline_sec: number;
  readonly max_deadline_sec: number;
  readonly expects: string;
}

export interface CoordRoleConfig {
  readonly name: string;
  readonly headless: boolean;
  readonly invoke_command?: readonly string[];
  readonly events: Readonly<Record<string, CoordEventConfig>>;
}

export interface CoordRolesConfig {
  readonly roles: readonly CoordRoleConfig[];
}

// Module-relative paths — survive process.cwd() changes (e.g. launchd-set
// cwd=/). The `..` segments climb out of `src/coord/` to the repo root.
const DEFAULT_CONFIG_URL = new URL('../../tools/review-queue/coord-roles.json', import.meta.url);
const SCHEMA_URL = new URL(
  '../../tools/review-queue/schemas/coord-roles.schema.json',
  import.meta.url,
);

let cachedValidate: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  const cached = cachedValidate;
  if (cached !== null) return cached;
  // `strict: false` silences ajv's complaints about `$id`/`$schema` URLs that
  // it would otherwise warn on; our schema is hand-curated and stable.
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemaText = readFileSync(SCHEMA_URL, 'utf-8');
  const schema = JSON.parse(schemaText) as AnySchema;
  const compiled = ajv.compile(schema);
  cachedValidate = compiled;
  return compiled;
}

/** Reset the validator cache. Test-only — production callers MUST NOT use this. */
export function _resetValidatorCacheForTests(): void {
  cachedValidate = null;
}

function resolveConfigPath(configPath: string | URL | undefined): URL {
  if (configPath !== undefined) {
    return typeof configPath === 'string' ? new URL(`file://${configPath}`) : configPath;
  }
  const envPath = process.env['ECHO_COORD_ROLES_PATH'];
  if (envPath !== undefined && envPath.length > 0) {
    return new URL(`file://${envPath}`);
  }
  return DEFAULT_CONFIG_URL;
}

function freezeConfig(config: CoordRolesConfig): CoordRolesConfig {
  for (const role of config.roles) {
    for (const ev of Object.values(role.events)) {
      Object.freeze(ev);
    }
    Object.freeze(role.events);
    Object.freeze(role);
  }
  Object.freeze(config.roles);
  Object.freeze(config);
  return config;
}

/** Load + validate `tools/review-queue/coord-roles.json`.
 *
 * Resolution order: explicit `configPath` arg → `ECHO_COORD_ROLES_PATH` env →
 * module-relative `DEFAULT_CONFIG_URL`. The module-relative default is
 * cwd-independent (r2 codex-ops F5 MED).
 *
 * Throws on:
 *   - file not readable / invalid JSON
 *   - JSON Schema validation failure (shape, missing fields,
 *     `headless: true` without `invoke_command`, etc.)
 *   - cross-field constraint `max_deadline_sec > default_deadline_sec`
 *     (NOT expressible in draft-07 `if/then`; per role per event)
 *
 * The caller (`startMcpServer`) does NOT catch the throw — propagating it
 * causes the daemon to exit non-zero with a clear stderr diagnostic, so
 * misconfigurations surface as startup failures rather than per-request
 * errors every 10 minutes (r1 codex F4 MED).
 */
export function loadCoordRoles(configPath?: string | URL): CoordRolesConfig {
  const resolved = resolveConfigPath(configPath);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(resolved, 'utf-8'));
  } catch (err) {
    throw new Error(
      `loadCoordRoles: cannot read or parse ${resolved.href}: ${(err as Error).message}`,
    );
  }

  const validate = getValidator();
  if (!validate(raw)) {
    const errs = (validate.errors ?? [])
      .map((e) => `${e.instancePath || '<root>'} ${e.message ?? '(unknown error)'}`)
      .join('; ');
    throw new Error(`loadCoordRoles: schema validation failed: ${errs}`);
  }

  // After schema validation, the shape is known to match CoordRolesConfig.
  const config = raw as CoordRolesConfig;

  // Cross-field constraint enforcement (per role per event). Per spec,
  // `max_deadline_sec` must be STRICTLY greater than `default_deadline_sec`
  // so the caller-supplied `expected_by` clamp is non-degenerate.
  for (const role of config.roles) {
    for (const [eventType, ev] of Object.entries(role.events)) {
      if (ev.max_deadline_sec <= ev.default_deadline_sec) {
        throw new Error(
          `loadCoordRoles: role '${role.name}' event '${eventType}': max_deadline_sec (${ev.max_deadline_sec}) must be > default_deadline_sec (${ev.default_deadline_sec})`,
        );
      }
    }
  }

  // Slug uniqueness — defense-in-depth (the schema doesn't enforce
  // uniqueness across array items).
  const seen = new Set<string>();
  for (const role of config.roles) {
    if (seen.has(role.name)) {
      throw new Error(`loadCoordRoles: duplicate role name '${role.name}'`);
    }
    seen.add(role.name);
  }

  return freezeConfig(config);
}
