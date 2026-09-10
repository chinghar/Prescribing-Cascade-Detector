import type { ExclusionAnswers, RawMedEntry, StartedApprox } from "@cascade-detector/cascade-engine";
import { createRng } from "./rng.js";

export type GroundTruthCategory =
  | "true_cascade"
  | "reverse_order"
  | "excluded_condition"
  | "a_only"
  | "b_only"
  | "none";

export interface SyntheticPatient {
  category: GroundTruthCategory;
  meds: RawMedEntry[];
  exclusionAnswers: ExclusionAnswers;
}

/**
 * All rates below are ASSUMPTIONS made for this synthetic cohort, labeled
 * as such. They are not, themselves, published figures except where noted.
 */
export interface DyadPrevalenceAssumptions {
  ruleId: string;
  /** All of the rule's exclusion labels — the synthetic generator answers every one. */
  exclusionLabels: string[];
  drugAMedName: string;
  drugBMedName: string;
  /** Published population prevalence of genuine cascades — the one real citation-backed number here. */
  trueCascadeRate: number;
  /**
   * ASSUMPTION: ratio of reverse-ordered co-prescriptions to true-cascade
   * co-prescriptions. Derived from the documented hospitalized-patient
   * reverse-ordering study where possible (13/39 -> ratio 0.5 for
   * CCB->diuretic; 16/30 -> ratio 1.143 for diuretic->OAB). No published
   * figure exists for the antipsychotic dyad; the average of the other two
   * ratios (0.82) is used there as an explicit placeholder, not a citation.
   */
  reverseToTrueRatio: number;
  /**
   * ASSUMPTION: no published rate exists for how often this co-prescription
   * pattern is explained by a genuine independent diagnosis (the exclusion
   * condition). Fixed at 30% of the true-cascade population, purely
   * illustrative, to demonstrate that the exclusion stage suppresses it.
   */
  excludedToTrueRatio: number;
  /** ASSUMPTION: fraction of the cohort on drug A alone, never prescribed drug B. */
  aOnlyRate: number;
  /** ASSUMPTION: fraction of the cohort on drug B alone, for an unrelated indication. */
  bOnlyRate: number;
  /**
   * ASSUMPTION: fraction of true-cascade / reverse-order patients whose
   * recalled start dates land in the same bucket (or "not_sure"), so
   * ordering cannot be established from self-report alone — modeling
   * imperfect patient recall, not a documented rate.
   */
  unclearOrderingRate: number;
}

function pick<T>(rng: () => number, options: readonly T[]): T {
  const value = options[Math.floor(rng() * options.length)];
  if (value === undefined) throw new Error("pick() called with an empty options array");
  return value;
}

export function generateCohort(
  n: number,
  assumptions: DyadPrevalenceAssumptions,
  seed: number,
): SyntheticPatient[] {
  const rng = createRng(seed);
  const pTrue = assumptions.trueCascadeRate;
  const pReverse = assumptions.trueCascadeRate * assumptions.reverseToTrueRatio;
  const pExcluded = assumptions.trueCascadeRate * assumptions.excludedToTrueRatio;
  const pAOnly = assumptions.aOnlyRate;
  const pBOnly = assumptions.bOnlyRate;

  const thresholds: Array<[GroundTruthCategory, number]> = [
    ["true_cascade", pTrue],
    ["reverse_order", pReverse],
    ["excluded_condition", pExcluded],
    ["a_only", pAOnly],
    ["b_only", pBOnly],
  ];
  const totalAssigned = thresholds.reduce((sum, [, p]) => sum + p, 0);
  if (totalAssigned > 1) {
    throw new Error(
      `Cohort assumption rates for ${assumptions.ruleId} sum to ${totalAssigned}, which exceeds 1`,
    );
  }

  const patients: SyntheticPatient[] = [];
  const forwardOrClearBuckets: [StartedApprox, StartedApprox] = ["longer", "this_year"];
  const reverseBuckets: [StartedApprox, StartedApprox] = ["this_year", "longer"];
  const unclearBucketOptions: StartedApprox[] = ["not_sure", "1_3_years"];

  for (let i = 0; i < n; i++) {
    const roll = rng();
    let cumulative = 0;
    let category: GroundTruthCategory = "none";
    for (const [cat, p] of thresholds) {
      cumulative += p;
      if (roll < cumulative) {
        category = cat;
        break;
      }
    }

    const meds: RawMedEntry[] = [];
    const exclusionAnswers: ExclusionAnswers = {};
    const isUnclear = rng() < assumptions.unclearOrderingRate;

    if (category === "true_cascade" || category === "excluded_condition") {
      const [aBucket, bBucket] = isUnclear
        ? [pick(rng, unclearBucketOptions), pick(rng, unclearBucketOptions)]
        : forwardOrClearBuckets;
      meds.push({ name: assumptions.drugAMedName, startedApprox: aBucket });
      meds.push({ name: assumptions.drugBMedName, startedApprox: bBucket });
      const answerValue = category === "excluded_condition" ? "yes" : "no";
      exclusionAnswers[assumptions.ruleId] = Object.fromEntries(
        assumptions.exclusionLabels.map((label) => [label, answerValue]),
      );
    } else if (category === "reverse_order") {
      const [aBucket, bBucket] = isUnclear
        ? [pick(rng, unclearBucketOptions), pick(rng, unclearBucketOptions)]
        : reverseBuckets;
      meds.push({ name: assumptions.drugAMedName, startedApprox: aBucket });
      meds.push({ name: assumptions.drugBMedName, startedApprox: bBucket });
      exclusionAnswers[assumptions.ruleId] = Object.fromEntries(
        assumptions.exclusionLabels.map((label) => [label, "no"]),
      );
    } else if (category === "a_only") {
      meds.push({ name: assumptions.drugAMedName, startedApprox: "longer" });
    } else if (category === "b_only") {
      meds.push({ name: assumptions.drugBMedName, startedApprox: "longer" });
    }

    patients.push({ category, meds, exclusionAnswers });
  }

  return patients;
}
