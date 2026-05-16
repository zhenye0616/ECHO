// 057b AC0 — `coord_invoke` MCP write tool.
//
// The strategist-side active-trigger surface. A caller invokes
// `coord_invoke(role, request_path, correlation_id)` which:
//   1. Strictly validates inputs (canonical uuid4, role shape + roster +
//      headless:true, request_path shape).
//   2. Resolves the reviewer-wrapper absolute path via the 5-step gate in
//      `src/coord/paths.ts` (shape → roster → join → containment →
//      exists+executable).
//   3. Appends a `coord:reviewer_invoked` atom SYNCHRONOUSLY (via the
//      internal-emitter helper) so the daemon's deadline tracker opens
//      the pre-spawn deadline BEFORE the child can possibly emit
//      `tick_start`. This is the r5 codex-ops F1 HIGH causality contract.
//   4. Spawns the wrapper as a fire-and-forget detached child with
//      `shell: false`, `stdio: 'ignore'`, `cwd: REPO_ROOT`, and three
//      env vars: ECHO_REVIEW_QUEUE_REPO_ROOT (per 050 worktree-isolation),
//      ECHO_COORD_REQUEST_PATH, ECHO_COORD_CORRELATION_ID.
//   5. Installs a `child.on('error', ...)` listener BEFORE `child.unref()`
//      so an async spawn failure (EMFILE, EAGAIN, bad shebang, wrapper
//      removed between stat and exec) does not crash the daemon
//      (r5 codex-ops F1 HIGH unhandled-error fatality).
//   6. Returns success to the caller.
//
// Inputs that fail any gate produce a structured MCP error and trigger NO
// spawn AND NO atom append — the rejection is observable upstream
// without polluting the ledger.

import { spawn } from 'node:child_process';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createLogger } from '../../logging/index.js';
import type { DeadlineTracker } from '../../coord/deadlines.js';
import { emitReviewerInvoked } from '../../coord/internal-emitter.js';
import { REPO_ROOT, CoordPathError, resolveReviewerWrapperPath } from '../../coord/paths.js';
import type { CoordRolesConfig } from '../../coord/roles.js';
import type { Storage } from '../../storage/interface.js';

const log = createLogger('coord.invoke');

const SCHEMA_VERSION = 1;

/** Canonical uuid4 regex (r3 codex F2 MED). Enforces version-4 nibble
 *  AND `[89ab]` variant byte AND lowercase. The prior `[a-f0-9-]{36}`
 *  was too loose. */
const UUID4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Request-path shape — strict allow-list. No traversal, no shell
 *  metacharacters, no absolute paths. Mirrors backlog/reviews/<slug>/r<N>/request.md. */
const REQUEST_PATH_RE = /^backlog\/reviews\/[a-z0-9-]+\/r[0-9]+\/request\.md$/;

export const COORD_INVOKE_DESCRIPTION =
  'INTERNAL: strategist-side active-trigger seam. Spawns the reviewer wrapper for `role` to review the request file at `request_path`, after synchronously appending `coord:reviewer_invoked` so the daemon-side deadline tracker opens the pre-spawn deadline BEFORE the child can emit `tick_start`. Inputs: `role` (canonical reviewer slug — lowercase, `[a-z][a-z0-9-]*`, must be present in coord-roles.json with headless:true); `request_path` (must match `backlog/reviews/<slug>/r<N>/request.md`); `correlation_id` (canonical uuid4 — version-4 nibble + variant byte enforced). The wrapper is spawned fire-and-forget (detached, stdio ignored, cwd=REPO_ROOT) with env vars ECHO_REVIEW_QUEUE_REPO_ROOT, ECHO_COORD_REQUEST_PATH, ECHO_COORD_CORRELATION_ID — the wrapper reads these to bind to the exact request rather than scan-picking. Async spawn failures (EMFILE, missing executable, bad shebang) are logged structured and DO NOT crash the daemon; the pre-spawn deadline still fires `coord:deadline_missed` naturally if the child never emits `tick_start`.';

export interface CoordInvokeResult {
  schema_version: 1;
  tool: 'coord_invoke';
  /** The id of the `coord:reviewer_invoked` atom appended by the daemon. */
  reviewer_invoked_id: string;
  /** The absolute path of the wrapper that was spawned. */
  wrapper_path: string;
}

const coordInvokeOutputSchema = {
  schema_version: z.literal(1),
  tool: z.literal('coord_invoke'),
  reviewer_invoked_id: z.string(),
  wrapper_path: z.string(),
};

export interface CoordInvokeDependencies {
  storage: Storage;
  coordRoles: CoordRolesConfig;
  /** 057a deadline tracker. Required — `coord_invoke` opens the
   *  pre-spawn deadline as part of its synchronous emission contract. */
  deadlines: DeadlineTracker;
}

export function registerCoordInvoke(server: McpServer, deps: CoordInvokeDependencies): void {
  server.registerTool(
    'coord_invoke',
    {
      description: COORD_INVOKE_DESCRIPTION,
      inputSchema: {
        role: z.string().min(1),
        request_path: z.string().min(1),
        correlation_id: z.string().min(1),
      },
      outputSchema: coordInvokeOutputSchema,
      annotations: { readOnlyHint: false },
    },
    async (input: { role: string; request_path: string; correlation_id: string }) => {
      try {
        // Step 1 — strict input validation. Failure produces a structured
        // MCP error; NO spawn, NO atom append.
        if (typeof input.correlation_id !== 'string' || !UUID4_RE.test(input.correlation_id)) {
          throw new Error(
            `coord_invoke: correlation_id must match canonical uuid4 (got '${String(input.correlation_id)}')`,
          );
        }
        if (typeof input.request_path !== 'string' || !REQUEST_PATH_RE.test(input.request_path)) {
          throw new Error(
            `coord_invoke: request_path must match 'backlog/reviews/<slug>/r<N>/request.md' (got '${String(input.request_path)}')`,
          );
        }

        // Step 2 — role validation + wrapper-path resolution (5-step gate
        // inside resolveReviewerWrapperPath: shape, roster, construction,
        // containment, exists+executable). Throws CoordPathError on any
        // gate failure — shape-invalid roles reject with NO FS access.
        let wrapperPath: string;
        try {
          wrapperPath = resolveReviewerWrapperPath(input.role, { coordRoles: deps.coordRoles });
        } catch (err) {
          if (err instanceof CoordPathError) {
            throw new Error(err.message);
          }
          throw err;
        }

        // Step 3 — synchronous reviewer_invoked emission BEFORE spawn.
        // The atom is durable, the tracker opens the pre-spawn deadline,
        // and the spawned child's eventual tick_start cannot precede the
        // reviewer_invoked atom in replay order (r5 codex-ops F1 HIGH).
        const reviewerInvokedId = await emitReviewerInvoked(deps.storage, deps.deadlines, {
          subject_role: input.role,
          correlation_id: input.correlation_id,
          request_path: input.request_path,
        });

        // Step 4 — fire-and-forget wrapper spawn. shell:false prevents
        // injection; stdio:'ignore' detaches pipes so the daemon never
        // blocks on an undrained child; cwd:REPO_ROOT keeps the wrapper
        // independent of daemon process.cwd(); env carries the pinned-
        // request handoff.
        const child = spawn(wrapperPath, [], {
          shell: false,
          detached: true,
          stdio: 'ignore',
          cwd: REPO_ROOT,
          env: {
            ...process.env,
            ECHO_REVIEW_QUEUE_REPO_ROOT: REPO_ROOT,
            ECHO_COORD_REQUEST_PATH: input.request_path,
            ECHO_COORD_CORRELATION_ID: input.correlation_id,
          },
        });

        // r5 codex-ops F1 HIGH — async 'error' events (EMFILE, EAGAIN,
        // wrapper removed between stat and exec, bad shebang) are
        // process-fatal on a ChildProcess without a listener. Install
        // BEFORE child.unref(). The handler logs structured and does
        // NOT re-throw; the pre-spawn `reviewer_invoked` atom stays
        // in the ledger so 057a's tracker fires `deadline_missed` —
        // the correct operator signal that the wrapper never ran.
        child.on('error', (err: Error) => {
          log.warn('coord_invoke_spawn_error', {
            role: input.role,
            request_path: input.request_path,
            correlation_id: input.correlation_id,
            wrapper_path: wrapperPath,
            error: err.message,
          });
        });

        // Detach from the event loop hold so coord_invoke returns
        // promptly and the daemon's event loop does not retain the
        // child handle. (r2 codex F2 MED + r2 codex-ops F5 MED.)
        child.unref();

        const result: CoordInvokeResult = {
          schema_version: SCHEMA_VERSION,
          tool: 'coord_invoke',
          reviewer_invoked_id: reviewerInvokedId,
          wrapper_path: wrapperPath,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text', text: (err as Error).message }],
        };
      }
    },
  );
}
