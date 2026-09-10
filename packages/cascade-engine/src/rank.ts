import type { ExcludableCandidate } from "./types.js";

const TIER_WEIGHT = { high: 1, moderate: 0 } as const;
const EXCLUSION_WEIGHT = { clear: 1, pending: 0, excluded: -1 } as const;

/**
 * Drops definitively excluded candidates, then orders the rest by:
 * confidence tier, then ordering certainty, then exclusion completeness.
 * Returns a list (ranked, most-confident first) — the top-level API takes
 * only rank(...)[0], enforcing single-question output at the call site.
 */
export function rank(candidates: ExcludableCandidate[]): ExcludableCandidate[] {
  return candidates
    .filter((c) => c.exclusionStatus !== "excluded")
    .slice()
    .sort((a, b) => {
      const tierDiff = TIER_WEIGHT[b.confidenceTier] - TIER_WEIGHT[a.confidenceTier];
      if (tierDiff !== 0) return tierDiff;

      const orderingDiff = Number(b.orderingConfirmedForward) - Number(a.orderingConfirmedForward);
      if (orderingDiff !== 0) return orderingDiff;

      return EXCLUSION_WEIGHT[b.exclusionStatus] - EXCLUSION_WEIGHT[a.exclusionStatus];
    });
}
