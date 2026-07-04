/**
 * Shared subject normalizer — the single cross-source join key normalizer for
 * Granola signal atoms (`metadata.canonical_subject`) and team-decision atoms
 * (`metadata.canonical_subject` plus the backcompat `metadata.normalized_subject`).
 *
 * Behavior: lowercase, trim, then collapse internal whitespace runs to a single
 * space. This is byte-identical to the two former local implementations it
 * replaces — `normalizeSubject` in `src/enrich/granola-signals.ts` and
 * `normalizeDecisionSubject` in
 * `src/surfaces/ceo-slack-responder/decision-store.ts` — so the
 * `team-decision:<normalized>` dedupe_key stays stable across the unification.
 */
export function normalizeSubject(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}
