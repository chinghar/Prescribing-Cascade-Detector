export { normalize } from "./normalize.js";
export { match } from "./match.js";
export { applyOrdering } from "./ordering.js";
export { applyExclusions } from "./exclusions.js";
export { rank } from "./rank.js";
export { renderQuestion } from "./renderQuestion.js";
export type {
  RawMedEntry,
  NormalizedMed,
  DrugLookupEntry,
  DrugLookupTable,
  StartedApprox,
  EngineRule,
  EngineDyadDrug,
  EngineDyadAdverseEffect,
  EngineDyadExclusion,
  EngineDyadEvidence,
  EngineExclusionType,
  ConfidenceTier,
  CandidateMatch,
  ExcludableCandidate,
  ExclusionAnswers,
  ExclusionAnswerValue,
  ExclusionStatus,
  PatientQuestion,
  EngineOutput,
} from "./types.js";

import { normalize } from "./normalize.js";
import { match } from "./match.js";
import { applyOrdering } from "./ordering.js";
import { applyExclusions } from "./exclusions.js";
import { rank } from "./rank.js";
import { renderQuestion } from "./renderQuestion.js";
import type {
  DrugLookupTable,
  EngineOutput,
  EngineRule,
  ExclusionAnswers,
  RawMedEntry,
} from "./types.js";

/**
 * Compile-time guard: fails `tsc` if EngineOutput is ever widened to an
 * array type, so the single-question output contract cannot silently
 * regress into a list.
 */
type AssertNotArray<T> = T extends readonly unknown[]
  ? "EngineOutput must never be an array type"
  : true;
const _engineOutputIsNotAnArray: AssertNotArray<EngineOutput> = true;
void _engineOutputIsNotAnArray;

/**
 * Top-level pipeline: normalize -> match -> applyOrdering -> applyExclusions
 * -> rank -> render at most one question. Pure, synchronous, no I/O.
 *
 * Returns a single discriminated-union value, never an array:
 * - "none" if nothing clears the confidence bar (including: everything
 *   was excluded, or reverse-ordering dropped every candidate).
 * - "needs_exclusion_answer" if the top-ranked candidate still has an
 *   unanswered exclusion question — the exclusion must be asked before
 *   anything is flagged.
 * - "question" for the single highest-confidence cascade question.
 */
export function runCascadeCheck(
  meds: RawMedEntry[],
  lookupTable: DrugLookupTable,
  rules: EngineRule[],
  exclusionAnswers: ExclusionAnswers,
): EngineOutput {
  const normalized = normalize(meds, lookupTable);
  const matched = match(normalized, rules);
  const ordered = applyOrdering(matched);
  const excludable = applyExclusions(ordered, exclusionAnswers);
  const ranked = rank(excludable);

  const top = ranked[0];
  if (!top) {
    return { kind: "none", message: "Nothing flagged for your current medication list." };
  }

  if (top.exclusionStatus === "pending") {
    const nextExclusion = top.pendingExclusions[0];
    if (!nextExclusion) {
      return { kind: "none", message: "Nothing flagged for your current medication list." };
    }
    return {
      kind: "needs_exclusion_answer",
      ruleId: top.rule.id,
      exclusionLabel: nextExclusion.label,
      exclusionQuestion: nextExclusion.patientQuestion,
    };
  }

  return { kind: "question", question: renderQuestion(top) };
}
