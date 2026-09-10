import {
  applyExclusions,
  applyOrdering,
  match,
  normalize,
  type DrugLookupTable,
  type EngineRule,
} from "@cascade-detector/cascade-engine";
import { confirmedRules } from "@cascade-detector/cascade-rules";
import { generateCohort, type DyadPrevalenceAssumptions, type SyntheticPatient } from "./cohort.js";

/** Build-time-style lookup table covering only the drugs the validation harness exercises. */
export const validationLookupTable: DrugLookupTable = {
  amlodipine: { rxcui: "17767", atcClasses: ["C08CA01"], matchedName: "amlodipine" },
  furosemide: { rxcui: "4603", atcClasses: ["C03CA01"], matchedName: "furosemide" },
  oxybutynin: { rxcui: "7823", atcClasses: ["G04BD04"], matchedName: "oxybutynin" },
  haloperidol: { rxcui: "5093", atcClasses: ["N05AD01"], matchedName: "haloperidol" },
  trihexyphenidyl: { rxcui: "10836", atcClasses: ["N04AA01"], matchedName: "trihexyphenidyl" },
};

function ruleById(id: string): EngineRule {
  const rule = confirmedRules.find((r) => r.id === id);
  if (!rule) throw new Error(`No confirmed rule with id ${id} — has cascade-rules changed?`);
  return rule;
}

export const dyadAssumptions: DyadPrevalenceAssumptions[] = [
  {
    ruleId: "ccb-oedema-diuretic",
    exclusionLabels: ruleById("ccb-oedema-diuretic").exclusions.map((e) => e.label),
    drugAMedName: "amlodipine",
    drugBMedName: "furosemide",
    trueCascadeRate: 0.026,
    // Documented: 13 of 39 hospitalized CCB->diuretic candidates were reverse-ordered
    // (13 reverse : 26 forward-or-ambiguous).
    reverseToTrueRatio: 13 / 26,
    excludedToTrueRatio: 0.3,
    aOnlyRate: 0.05,
    bOnlyRate: 0.03,
    unclearOrderingRate: 0.1,
  },
  {
    ruleId: "diuretic-incontinence-oab",
    exclusionLabels: ruleById("diuretic-incontinence-oab").exclusions.map((e) => e.label),
    drugAMedName: "furosemide",
    drugBMedName: "oxybutynin",
    trueCascadeRate: 0.006,
    // Documented: 16 of 30 hospitalized diuretic->OAB candidates were reverse-ordered
    // (16 reverse : 14 forward-or-ambiguous).
    reverseToTrueRatio: 16 / 14,
    excludedToTrueRatio: 0.3,
    aOnlyRate: 0.15,
    bOnlyRate: 0.01,
    unclearOrderingRate: 0.1,
  },
  {
    ruleId: "antipsychotic-eps-antiparkinsonian",
    exclusionLabels: ruleById("antipsychotic-eps-antiparkinsonian").exclusions.map((e) => e.label),
    drugAMedName: "haloperidol",
    drugBMedName: "trihexyphenidyl",
    trueCascadeRate: 0.004,
    // ASSUMPTION: no reverse-ordering fraction is published for this dyad. Using the
    // average of the two documented ratios above (0.5, 1.143) as an explicit placeholder.
    reverseToTrueRatio: (13 / 26 + 16 / 14) / 2,
    excludedToTrueRatio: 0.3,
    aOnlyRate: 0.03,
    bOnlyRate: 0.005,
    unclearOrderingRate: 0.1,
  },
];

export interface StageCounts {
  flagged: number;
  truePositives: number;
  falsePositives: number;
}

export interface DyadBenchmarkResult {
  ruleId: string;
  cohortSize: number;
  trueCascadeCount: number;
  publishedPrevalence: number;
  baseline: StageCounts;
  orderingOnly: StageCounts;
  fullSuppression: StageCounts;
}

function evaluateStage(
  patients: SyntheticPatient[],
  rule: EngineRule,
  stage: "baseline" | "orderingOnly" | "fullSuppression",
): StageCounts {
  let flagged = 0;
  let truePositives = 0;
  let falsePositives = 0;

  for (const patient of patients) {
    const normalized = normalize(patient.meds, validationLookupTable);
    const rawCandidates = match(normalized, [rule]);

    let isFlagged: boolean;
    if (stage === "baseline") {
      isFlagged = rawCandidates.length > 0;
    } else if (stage === "orderingOnly") {
      isFlagged = applyOrdering(rawCandidates).length > 0;
    } else {
      const excludable = applyExclusions(applyOrdering(rawCandidates), patient.exclusionAnswers);
      isFlagged = excludable.some((c) => c.exclusionStatus === "clear");
    }

    if (isFlagged) {
      flagged++;
      if (patient.category === "true_cascade") truePositives++;
      else falsePositives++;
    }
  }

  return { flagged, truePositives, falsePositives };
}

export function benchmarkDyad(
  assumptions: DyadPrevalenceAssumptions,
  cohortSize: number,
  seed: number,
): DyadBenchmarkResult {
  const rule = ruleById(assumptions.ruleId);
  const patients = generateCohort(cohortSize, assumptions, seed);
  const trueCascadeCount = patients.filter((p) => p.category === "true_cascade").length;

  return {
    ruleId: assumptions.ruleId,
    cohortSize,
    trueCascadeCount,
    publishedPrevalence: assumptions.trueCascadeRate,
    baseline: evaluateStage(patients, rule, "baseline"),
    orderingOnly: evaluateStage(patients, rule, "orderingOnly"),
    fullSuppression: evaluateStage(patients, rule, "fullSuppression"),
  };
}

export function precision(stage: StageCounts): number {
  return stage.flagged === 0 ? 0 : stage.truePositives / stage.flagged;
}

export function recall(stage: StageCounts, trueCascadeCount: number): number {
  return trueCascadeCount === 0 ? 0 : stage.truePositives / trueCascadeCount;
}

export function detectedPrevalence(stage: StageCounts, cohortSize: number): number {
  return stage.flagged / cohortSize;
}
