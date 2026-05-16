// 057a AC1 + AC5 — X-Echo-Role header → role identity mapping.
//
// V1 identity model (per spec AC5 + line 207):
//   - The MCP server's HTTP handler extracts the `X-Echo-Role: <role>`
//     header from the raw request before tool registration and passes
//     the resolved role to the per-request `coord_emit` registration.
//   - This file validates that header value against the roster loaded
//     from `coord-roles.json` and produces a typed role identity (or
//     throws with a clear MCP-error-shaped message).
//   - Native MCP clients (Cursor IDE-mode) do NOT set the header, so
//     `resolveEmitterIdentity(null)` throws — V1 emission is scoped to
//     wrapper paths (curl-style HTTP) per r1 codex F4 MED.
//   - The daemon NEVER trusts a caller-supplied `source` field on the
//     coord_emit input; identity is derived server-side from the
//     header, then `src/coord/source.ts` produces `source = coord:<role>`.

import type { CoordRolesConfig } from './roles.js';

export interface EmitterIdentity {
  readonly role: string;
}

export class CoordIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoordIdentityError';
  }
}

/** Resolve the X-Echo-Role HTTP header value into a typed emitter identity,
 *  or throw if the header is missing, empty, or names a role not in the
 *  loaded `coord-roles.json` roster.
 *
 *  Pass `null` for the header value when the request did not carry one
 *  (e.g. native MCP clients) — V1 rejects this rather than silently
 *  accepting "unknown" emitters.
 *
 *  No defense against on-machine spoofing: a malicious local process
 *  CAN set X-Echo-Role to any roster name. The DNS-rebinding loopback
 *  guard at `src/mcp/server.ts:131` is the perimeter; per-role spoof
 *  prevention beyond that is V2+ (covered in spec line 207's
 *  "deferred to V1.5+ along with the native-MCP identity path" note).
 */
export function resolveEmitterIdentity(
  xEchoRoleHeader: string | null,
  config: CoordRolesConfig,
): EmitterIdentity {
  if (xEchoRoleHeader === null) {
    throw new CoordIdentityError(
      'coord_emit: missing X-Echo-Role header — V1 emission is scoped to wrapper paths (curl-style HTTP). Native MCP clients cannot emit in V1.',
    );
  }
  const trimmed = xEchoRoleHeader.trim();
  if (trimmed.length === 0) {
    throw new CoordIdentityError(
      'coord_emit: empty X-Echo-Role header — value must name a role defined in coord-roles.json.',
    );
  }
  const role = trimmed;
  const known = config.roles.some((r) => r.name === role);
  if (!known) {
    const knownNames = config.roles.map((r) => r.name).join(', ');
    throw new CoordIdentityError(
      `coord_emit: X-Echo-Role '${role}' is not in coord-roles.json (known roles: ${knownNames}).`,
    );
  }
  return { role };
}

/** Validate that a caller-supplied `subject_role` field on a coord event
 *  names a role defined in coord-roles.json. Used by `validate.ts` to
 *  reject events with unknown subject_role, independent of the
 *  self-attestation vs invocation policy (which is enforced separately
 *  based on the registry entry for the event_type). */
export function isKnownRole(role: string, config: CoordRolesConfig): boolean {
  return config.roles.some((r) => r.name === role);
}
