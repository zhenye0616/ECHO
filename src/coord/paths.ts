// 057b AC0 — canonical repo-root + reviewer-wrapper path resolver.
//
// This module sits at `src/coord/` so its `import.meta.url`-based
// resolution math (`../..`) lands at the repo root — same depth
// convention as `src/coord/roles.ts` (which already resolves
// `<repo>/tools/review-queue/coord-roles.json` correctly).
//
// Why a dedicated helper (r3 codex F1 + r3 codex-ops F1 convergent HIGH):
// the r2 patch erroneously suggested `new URL("../../tools/...",
// import.meta.url)` directly from `src/mcp/tools/coord-invoke.ts`, but
// that path resolves to `<repo>/src/tools/...` not `<repo>/tools/...`
// because the MCP tool module sits at a different depth than 057a's
// `src/coord/roles.ts`. Centralizing the math here keeps depth changes
// from silently breaking child spawning.
//
// Validation contract (r4 codex F1 HIGH): the 5-step gate
// (shape → roster → path-construction → containment → exists+executable)
// runs in resolveReviewerWrapperPath() in exact order. Shape-invalid
// roles never reach the roster check; roster-invalid roles never reach
// path construction. This means the "no FS access" property of the
// shape-invalid malicious-role test (r4/r5/r6) holds true ONLY for the
// shape-invalid subset, while the roster-invalid subset rejects AFTER
// loadCoordRoles() reads coord-roles.json but BEFORE any wrapper-path
// construction / stat / spawn / MCP side-effects.

import { fileURLToPath } from 'node:url';
import {
  join as pathJoin,
  resolve as pathResolve,
  sep as pathSep,
  basename,
  isAbsolute as pathIsAbsolute,
  normalize as pathNormalize,
  relative as pathRelative,
  dirname as pathDirname,
} from 'node:path';
import { realpathSync, statSync } from 'node:fs';
import { loadCoordRoles, type CoordRolesConfig } from './roles.js';
import { loadProjectConfig } from '../echo-home/paths.js';

/** Canonical reviewer-slug shape — lowercase, starts with letter, no
 *  slashes, no shell metacharacters, no path-traversal characters. The
 *  shape regex is the first gate in the 5-step containment chain. */
const ROLE_SHAPE_RE = /^[a-z][a-z0-9-]*$/;

function computeRepoRoot(): string {
  const envOverride = process.env['ECHO_REPO_ROOT'];
  if (envOverride !== undefined && envOverride.length > 0) {
    return pathResolve(envOverride);
  }
  // From `src/coord/paths.ts`: `..` = `src/`, `../..` = repo root.
  // Same depth convention as 057a's `src/coord/roles.ts`.
  return fileURLToPath(new URL('../..', import.meta.url));
}

/** Canonical repo-root path. Computed once at module load. Honors
 *  `ECHO_REPO_ROOT` env-var override (tests + bundled-daemon deployments
 *  where the source-tree path math doesn't hold). */
export const REPO_ROOT: string = computeRepoRoot();

export class CoordPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoordPathError';
  }
}

interface ResolveReviewerWrapperPathOptions {
  /** Inject a roles config for tests. Production callers omit. */
  coordRoles?: CoordRolesConfig;
}

interface ResolveCoordRequestPathOptions {
  /** Repo root containing `.echo/project.json` and the reviews root. */
  repoRoot?: string;
  /** Override the configured reviews root for tests or already-resolved callers. */
  reviewsRoot?: string;
}

function isWithin(parent: string, child: string): boolean {
  const rel = pathRelative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !pathIsAbsolute(rel));
}

/** Realpath the deepest EXISTING ancestor of an absolute path, then lexically
 *  re-append the not-yet-created tail. This lets realpath-based containment run
 *  even when the leaf — or several leaf components — do not exist on disk, while
 *  still following any symlink in the existing portion (so a symlinked ancestor
 *  that escapes its parent is still caught). Two on-disk realities require this
 *  (B1 / AC7): coord_invoke is the strategist active-trigger seam, legitimately
 *  called for a request.md that request.py has just written or is about to
 *  write; and in a PACKAGED install (item 076 boundary) the `backlog/` tree —
 *  hence the configured reviews_root — is not shipped at all. Pure realpath of
 *  either would throw ENOENT and break wrapper resolution. `abs` must be
 *  absolute; the walk terminates at the filesystem root. */
function canonicalizeExisting(abs: string, label: string, requestPath: string): string {
  let cur = abs;
  const tail: string[] = [];
  for (;;) {
    try {
      cur = realpathSync(cur);
      break;
    } catch {
      const parent = pathDirname(cur);
      if (parent === cur) {
        throw new CoordPathError(
          `coord_invoke: ${label} for '${requestPath}' has no existing ancestor on disk.`,
        );
      }
      tail.unshift(basename(cur));
      cur = parent;
    }
  }
  return tail.length > 0 ? pathResolve(cur, ...tail) : cur;
}

function decodeUriPath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new CoordPathError(
      `coord_invoke: request_path contains invalid URL encoding: '${value}'.`,
    );
  }
}

/** Validate and resolve a coord request path against the configured reviews root.
 *
 * The accepted logical shape is:
 *   <reviews_root>/<item-id>/r<N>/request.md
 *
 * Security is realpath-based, not regex-only: both the repo root and reviews
 * root are resolved, the reviews root must stay inside the repo, and the
 * resolved request path must stay inside the resolved reviews root. This
 * rejects absolute paths, `..` traversal, URL-encoded traversal, a symlinked
 * reviews root pointing outside the repo, and symlinked request ancestors.
 *
 * The request *file itself need not exist*: coord_invoke is the strategist
 * active-trigger seam and is legitimately called for a request.md that
 * request.py has just written or is about to write. Canonicalization
 * realpaths the deepest EXISTING ancestor and lexically appends the
 * not-yet-created tail, so a wholly-absent request path validates while a
 * symlinked existing ancestor that escapes the reviews root is still caught.
 */
export function resolveCoordRequestPath(
  requestPath: string,
  opts: ResolveCoordRequestPathOptions = {},
): string {
  if (typeof requestPath !== 'string' || requestPath.length === 0) {
    throw new CoordPathError('coord_invoke: request_path must be a non-empty relative path.');
  }
  if (requestPath.includes('\\') || pathIsAbsolute(requestPath)) {
    throw new CoordPathError(
      `coord_invoke: request_path must be relative and use forward slashes (got '${requestPath}').`,
    );
  }
  const decoded = decodeUriPath(requestPath);
  if (decoded !== requestPath) {
    throw new CoordPathError(
      `coord_invoke: request_path must not use URL encoding (got '${requestPath}').`,
    );
  }
  // Defense-in-depth charset guard (057b AC0): request paths address files in
  // the reviews tree, whose components are item-ids, r<N>, and request.md — all
  // drawn from [A-Za-z0-9._/-]. Reject shell metacharacters / whitespace
  // explicitly rather than relying on a realpath ENOENT to incidentally reject
  // them — post-B1 the request file legitimately may not exist on disk yet, so
  // the existence check can no longer stand in for input sanitization.
  if (!/^[A-Za-z0-9._/-]+$/.test(requestPath)) {
    throw new CoordPathError(
      `coord_invoke: request_path contains disallowed characters (got '${requestPath}').`,
    );
  }
  const normalizedRequest = pathNormalize(requestPath);
  if (
    normalizedRequest === '.' ||
    normalizedRequest === '..' ||
    normalizedRequest.startsWith('../') ||
    normalizedRequest.split(/[\\/]+/).includes('..')
  ) {
    throw new CoordPathError(
      `coord_invoke: request_path traversal is not allowed: '${requestPath}'.`,
    );
  }

  const repoRoot = pathResolve(opts.repoRoot ?? REPO_ROOT);
  const projectConfig =
    opts.reviewsRoot === undefined ? loadProjectConfig(repoRoot).config : undefined;
  const reviewsRootRel = opts.reviewsRoot ?? projectConfig!.reviews_root;
  if (
    reviewsRootRel.includes('\\') ||
    pathIsAbsolute(reviewsRootRel) ||
    pathNormalize(reviewsRootRel)
      .split(/[\\/]+/)
      .includes('..')
  ) {
    throw new CoordPathError(
      `coord_invoke: configured reviews_root must be a project-relative path (got '${reviewsRootRel}').`,
    );
  }

  let repoReal: string;
  try {
    repoReal = realpathSync(repoRoot);
  } catch (err) {
    throw new CoordPathError(
      `coord_invoke: repo root realpath validation failed for '${requestPath}': ${(err as Error).message}`,
    );
  }

  // Canonicalize reviews_root and the request path via the deepest-existing-
  // ancestor walk so realpath containment holds even when neither exists on
  // disk yet (B1 / AC7: active-trigger seam writes request.md just-in-time, and
  // the packaged-install boundary ships no backlog/ tree). Symlink-escape
  // detection is preserved: any symlink in the existing portion is followed out
  // and rejected by the isWithin checks below.
  const reviewsReal = canonicalizeExisting(
    pathResolve(repoRoot, reviewsRootRel),
    'configured reviews_root',
    requestPath,
  );
  if (!isWithin(repoReal, reviewsReal)) {
    throw new CoordPathError(
      `coord_invoke: configured reviews_root '${reviewsRootRel}' resolves outside repo '${repoReal}'.`,
    );
  }

  const requestReal = canonicalizeExisting(
    pathResolve(repoRoot, normalizedRequest),
    'request_path',
    requestPath,
  );
  if (!isWithin(reviewsReal, requestReal)) {
    throw new CoordPathError(
      `coord_invoke: request_path '${requestPath}' resolves outside reviews_root '${reviewsRootRel}'.`,
    );
  }

  const relToReviews = pathRelative(reviewsReal, requestReal).split(pathSep).join('/');
  if (!/^[^/]+\/r[0-9]+\/request\.md$/.test(relToReviews)) {
    throw new CoordPathError(
      `coord_invoke: request_path must match '<reviews_root>/<item>/r<N>/request.md' (got '${requestPath}').`,
    );
  }

  return requestReal;
}

/** Validate + resolve the absolute path to `tools/review-queue/run-<role>-reviewer.sh`.
 *
 *  Five-step gate (in exact order — r4 codex F1 HIGH):
 *    1. Shape check (canonical reviewer slug)
 *    2. Roster check (role present in coord-roles.json + headless:true)
 *    3. Path construction (path.join)
 *    4. Containment check (resolved path stays in-tree)
 *    5. Existence + executable bit
 *
 *  Throws `CoordPathError` on any failure; all errors carry enough
 *  context for the MCP tool boundary to surface a structured rejection.
 *  Shape-invalid roles reject BEFORE any FS access; roster-invalid roles
 *  reject AFTER loadCoordRoles() but BEFORE any path.join / stat / spawn.
 */
export function resolveReviewerWrapperPath(
  role: string,
  opts: ResolveReviewerWrapperPathOptions = {},
): string {
  // Step 1 — shape check (no FS access; no config read).
  if (typeof role !== 'string' || !ROLE_SHAPE_RE.test(role)) {
    throw new CoordPathError(
      `coord_invoke: role shape-invalid (got '${String(role)}'). Required: lowercase, starts with letter, [a-z0-9-] only.`,
    );
  }

  // Step 2 — roster check (loadCoordRoles() reads disk; no path math yet).
  const cfg = opts.coordRoles ?? loadCoordRoles();
  const entry = cfg.roles.find((r) => r.name === role);
  if (entry === undefined) {
    const known = cfg.roles.map((r) => r.name).join(', ');
    throw new CoordPathError(
      `coord_invoke: role '${role}' is not in coord-roles.json (known roles: ${known}).`,
    );
  }
  if (!entry.headless) {
    throw new CoordPathError(
      `coord_invoke: role '${role}' is not headless (headless:false in coord-roles.json) — cannot be actively spawned. IDE-mode reviewers have no wrapper.`,
    );
  }

  // Step 3 — path construction.
  const reviewerDir = pathJoin(REPO_ROOT, 'tools/review-queue');
  const candidate = pathJoin(reviewerDir, `run-${role}-reviewer.sh`);

  // Step 4 — containment check (defense-in-depth: even if shape + roster
  // both pass, the resolved path must stay in-tree under the reviewer-
  // wrapper directory AND its basename must match exactly).
  const resolved = pathResolve(candidate);
  const reviewerDirResolved = pathResolve(reviewerDir);
  if (!resolved.startsWith(reviewerDirResolved + pathSep)) {
    throw new CoordPathError(
      `coord_invoke: resolved path '${resolved}' is outside reviewer-wrapper directory '${reviewerDirResolved}'.`,
    );
  }
  if (basename(resolved) !== `run-${role}-reviewer.sh`) {
    throw new CoordPathError(
      `coord_invoke: resolved basename '${basename(resolved)}' does not match expected 'run-${role}-reviewer.sh'.`,
    );
  }

  // Step 5 — existence + executable bit.
  let st: import('node:fs').Stats;
  try {
    st = statSync(resolved);
  } catch (err) {
    throw new CoordPathError(
      `coord_invoke: reviewer wrapper not found at '${resolved}': ${(err as Error).message}`,
    );
  }
  if (!st.isFile()) {
    throw new CoordPathError(`coord_invoke: reviewer wrapper '${resolved}' is not a regular file.`);
  }
  // Owner-executable bit (POSIX mode 0o100). On filesystems without exec
  // bit semantics (e.g. mounted FAT) this check would false-fail; the V1
  // dev environment is macOS APFS where the bit is meaningful.
  if ((st.mode & 0o100) === 0) {
    throw new CoordPathError(
      `coord_invoke: reviewer wrapper '${resolved}' is not executable (mode ${st.mode.toString(8)}).`,
    );
  }

  return resolved;
}
