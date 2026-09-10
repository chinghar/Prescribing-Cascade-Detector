import type { CandidateMatch, StartedApprox } from "./types.js";

/**
 * Ordinal rank of "how long ago this medication started" — higher means
 * started further in the past. Used only to compare two meds relative to
 * each other, never as an absolute date.
 */
const BUCKET_RANK: Record<StartedApprox, number> = {
  not_sure: 0,
  this_year: 1,
  "1_3_years": 2,
  longer: 3,
};

/**
 * The critical suppression stage. A prescribing cascade requires drug A to
 * have been started before drug B. Per the documented reverse-ordering
 * failure mode (13/39 CCB->diuretic and 16/30 diuretic->OAB candidates in a
 * hospitalized-patient study had drug B first), any candidate where ordering
 * is knowably reversed must be dropped outright, not merely downgraded.
 *
 * - Both buckets known and distinct, drugA started earlier: confirmed forward.
 * - Both buckets known and distinct, drugB started earlier: reverse order — drop.
 * - Buckets equal (including both "not_sure", or missing): ordering unknown —
 *   downgrade confidence, never drop. Same-bucket-but-known is treated as
 *   unknown rather than forward, because a single-year-granularity bucket
 *   cannot establish which of two drugs in the same bucket came first.
 */
export function applyOrdering(candidates: CandidateMatch[]): CandidateMatch[] {
  const result: CandidateMatch[] = [];
  for (const candidate of candidates) {
    const rankA = BUCKET_RANK[candidate.drugA.startedApprox ?? "not_sure"];
    const rankB = BUCKET_RANK[candidate.drugB.startedApprox ?? "not_sure"];

    if (rankA > rankB && rankB > 0) {
      result.push({
        ...candidate,
        orderingConfirmedForward: true,
        orderingUnknown: false,
        confidenceTier: candidate.rule.confidenceTier,
      });
      continue;
    }

    if (rankB > rankA && rankA > 0) {
      // Drug B demonstrably started first — not a cascade. Drop entirely.
      continue;
    }

    result.push({
      ...candidate,
      orderingConfirmedForward: false,
      orderingUnknown: true,
      confidenceTier: "moderate",
    });
  }
  return result;
}
