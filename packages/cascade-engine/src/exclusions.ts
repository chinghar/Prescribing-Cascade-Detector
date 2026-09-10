import type {
  CandidateMatch,
  EngineDyadExclusion,
  ExcludableCandidate,
  ExclusionAnswers,
} from "./types.js";

/**
 * A candidate with any unanswered exclusion is "pending", not "confirmed" —
 * per spec, the exclusion question must be asked before a candidate is ever
 * flagged. "not_sure" counts as unanswered (conservative: we never treat
 * uncertainty as clearance). A "yes" answer to any exclusion means an
 * independent explanation exists, so the candidate is suppressed entirely.
 */
export function applyExclusions(
  candidates: CandidateMatch[],
  answers: ExclusionAnswers,
): ExcludableCandidate[] {
  return candidates.map((candidate) => {
    const ruleAnswers = answers[candidate.rule.id] ?? {};
    const pendingExclusions: EngineDyadExclusion[] = [];
    let excluded = false;

    for (const exclusion of candidate.rule.exclusions) {
      const answer = ruleAnswers[exclusion.label];
      if (answer === "yes") {
        excluded = true;
        break;
      }
      if (answer === undefined || answer === "not_sure") {
        pendingExclusions.push(exclusion);
      }
    }

    if (excluded) {
      return { ...candidate, exclusionStatus: "excluded", pendingExclusions: [] };
    }
    if (pendingExclusions.length > 0) {
      return { ...candidate, exclusionStatus: "pending", pendingExclusions };
    }
    return { ...candidate, exclusionStatus: "clear", pendingExclusions: [] };
  });
}
