// 057a AC1 — server-derived `source` string for coord atoms.
//
// AC1 contract: the daemon DOES NOT trust caller-supplied `source` field;
// it derives `source = coord:<role>` from the validated EmitterIdentity.
// This file is the single chokepoint so the derivation lives in one
// auditable place.

import type { EmitterIdentity } from './identity.js';
import { COORD_SOURCE_PREFIX } from './types.js';

/** Produce the `source` string for a coord atom: `coord:<role>`. The role
 *  is taken from the server-derived emitter identity (NOT from any
 *  caller-supplied input). */
export function deriveCoordSource(identity: EmitterIdentity): string {
  return `${COORD_SOURCE_PREFIX}${identity.role}`;
}
