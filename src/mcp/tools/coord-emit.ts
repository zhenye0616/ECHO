// 057a AC1 — coord_emit MCP write tool.
//
// The narrow append seam for the coord substrate. Validates the input via
// `src/coord/validate.ts`, server-derives the source string via
// `src/coord/source.ts`, canonicalizes the timestamp via the existing
// `canonicalizeTimestamp` helper, and writes through the existing
// single-writer storage path. Coord atoms bypass the normalizer +
// trace-edge generation; they carry `metadata.surface = "coord"` so the
// search-memories default exclusion (also AC1) can filter them out.
//
// Identity model (AC5): the emitter role is server-derived from the
// X-Echo-Role HTTP header by `src/coord/identity.ts` BEFORE this
// registration runs; the resolved identity is passed as a closure
// argument so the tool handler doesn't see (and can't trust) any
// caller-supplied source field.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveEmitterIdentity, type EmitterIdentity } from '../../coord/identity.js';
import type { CoordRolesConfig } from '../../coord/roles.js';
import { deriveCoordSource } from '../../coord/source.js';
import { COORD_SESSION_ID, COORD_SURFACE } from '../../coord/types.js';
import { validateCoordEmitInput } from '../../coord/validate.js';
import { canonicalizeTimestamp } from '../../capture/pipeline.js';
import type { Storage } from '../../storage/interface.js';

const SCHEMA_VERSION = 1;

export const COORD_EMIT_DESCRIPTION =
  'INTERNAL: coord-substrate append seam. Reviewers and the orchestrator emit coord events (`tick_start`, `tick_end`, `reviewer_invoked`, `scheduler_health`, etc.) via this tool to populate the daemon-side deadline tracker. Identity is server-derived from the `X-Echo-Role` HTTP header (V1: scoped to wrapper paths — native MCP clients without header access cannot emit). Caller-supplied `source` is ignored; the daemon derives `source = coord:<role>` from the validated identity. Coord atoms bypass normalization, embedding, and clustering — they default-exclude from `search_memories` and `find_clusters`. Use `wait_for_new_turns(source_prefix="coord:")` (AC4) to subscribe live, or `search_memories(source_prefix="coord:")` for forensic retrieval.';

export interface CoordEmitResult {
  schema_version: 1;
  tool: 'coord_emit';
  /** The atom id appended to the durable ledger. */
  id: string;
  /** Server-derived source string (`coord:<role>`). Returned so the caller
   *  can verify the daemon's identity decision without trusting their own
   *  input. */
  source: string;
}

const coordEmitOutputSchema = {
  schema_version: z.literal(1),
  tool: z.literal('coord_emit'),
  id: z.string(),
  source: z.string(),
};

export interface CoordEmitDependencies {
  storage: Storage;
  coordRoles: CoordRolesConfig;
  /** The X-Echo-Role header value resolved by the server before
   *  registering this tool. `null` means no header was present — the
   *  tool will reject every call with a CoordIdentityError so native
   *  MCP clients can't emit (r1 codex F4 MED). */
  xEchoRoleHeader: string | null;
}

export function registerCoordEmit(
  server: McpServer,
  deps: CoordEmitDependencies,
): void {
  // Identity is resolved once per HTTP request (this whole registration
  // path runs per-request inside handlePost). If resolution throws,
  // every coord_emit call within this request rejects with the same
  // identity error; ALL OTHER tools registered in the same request
  // remain functional.
  let identity: EmitterIdentity | null = null;
  let identityError: Error | null = null;
  try {
    identity = resolveEmitterIdentity(deps.xEchoRoleHeader, deps.coordRoles);
  } catch (err) {
    identityError = err as Error;
  }

  server.registerTool(
    'coord_emit',
    {
      description: COORD_EMIT_DESCRIPTION,
      inputSchema: {
        event_type: z.string().min(1),
        schema_version: z.number().int(),
        subject_role: z.string().min(1),
        // Tier-discriminated. Schema accepts both as optional; the
        // validator enforces "exactly one of correlation_id |
        // tick_run_id" based on the event_type's tier classification.
        correlation_id: z.string().min(1).optional(),
        tick_run_id: z.string().min(1).optional(),
        emitted_at: z.string().min(1),
        expected_by: z.string().min(1).optional(),
        payload: z.record(z.string(), z.unknown()).optional(),
        // Accepted (silently ignored) for forward-compat — older callers
        // that supplied `source` are not rejected; the value is dropped.
        source: z.string().optional(),
      },
      outputSchema: coordEmitOutputSchema,
      annotations: { readOnlyHint: false },
    },
    async (input) => {
      if (identityError !== null) {
        return {
          isError: true,
          content: [{ type: 'text', text: identityError.message }],
        };
      }
      if (identity === null) {
        // Defensive — identity must be non-null when identityError is null.
        return {
          isError: true,
          content: [{ type: 'text', text: 'coord_emit: emitter identity unresolved' }],
        };
      }
      try {
        const validated = validateCoordEmitInput(input, identity.role, deps.coordRoles);
        const source = deriveCoordSource(identity);
        const timestamp = canonicalizeTimestamp(validated.emitted_at);
        // Build the durable atom. metadata.surface + metadata.session_id
        // are set unconditionally so the non-pollution helpers can filter
        // on either signal without reading the source string.
        const metadata: Record<string, unknown> = {
          surface: COORD_SURFACE,
          session_id: COORD_SESSION_ID,
          coord: {
            event_type: validated.event_type,
            schema_version: validated.schema_version,
            tier: validated.tier,
            subject_role: validated.subject_role,
            ...(validated.tier === 'round'
              ? { correlation_id: validated.correlation_id }
              : { tick_run_id: validated.tick_run_id }),
            ...(validated.expected_by !== undefined ? { expected_by: validated.expected_by } : {}),
            ...(validated.payload !== undefined ? { payload: validated.payload } : {}),
          },
        };
        const id = await deps.storage.append({
          source,
          timestamp,
          content: JSON.stringify({
            event_type: validated.event_type,
            tier: validated.tier,
            subject_role: validated.subject_role,
          }),
          metadata,
        });
        const result: CoordEmitResult = {
          schema_version: SCHEMA_VERSION,
          tool: 'coord_emit',
          id,
          source,
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
