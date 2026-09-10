/**
 * Engine-local types. Deliberately NOT imported from @cascade-detector/cascade-rules
 * so this package has zero package dependencies (runtime or type-only) and can be
 * tested/imported with no other workspace present. Any object shaped like these
 * (e.g. a ConfirmedDyad from cascade-rules) is structurally assignable here.
 */

export type StartedApprox = "this_year" | "1_3_years" | "longer" | "not_sure";

export interface RawMedEntry {
  name: string;
  startedApprox?: StartedApprox;
}

export interface DrugLookupEntry {
  rxcui: string;
  atcClasses: string[];
  matchedName: string;
}

/** Keyed by lowercase, trimmed drug name. */
export type DrugLookupTable = Record<string, DrugLookupEntry>;

export interface NormalizedMed {
  inputName: string;
  rxcui: string | null;
  atcClasses: string[];
  resolved: boolean;
  startedApprox?: StartedApprox;
}

export type EngineExclusionType =
  | "condition"
  | "prior_history"
  | "independent_indication";

export interface EngineDyadExclusion {
  type: EngineExclusionType;
  label: string;
  patientQuestion: string;
}

export interface EngineDyadDrug {
  atc: string[];
  label: string;
}

export interface EngineDyadAdverseEffect {
  icpc2?: string;
  label: string;
  patientFacingLabel: string;
}

export interface EngineDyadEvidence {
  source: string;
  citation: string;
  populationPrevalence?: number;
}

export type ConfidenceTier = "high" | "moderate";

export interface EngineRule {
  id: string;
  drugA: EngineDyadDrug;
  adverseEffect: EngineDyadAdverseEffect;
  drugB: EngineDyadDrug;
  exclusions: EngineDyadExclusion[];
  evidence: EngineDyadEvidence;
  confidenceTier: ConfidenceTier;
}

export interface CandidateMatch {
  rule: EngineRule;
  drugA: NormalizedMed;
  drugB: NormalizedMed;
  /** True only when both start-date buckets are known and clearly indicate A before B. */
  orderingConfirmedForward: boolean;
  /** True when ordering could not be established from the available start dates. */
  orderingUnknown: boolean;
  /** Effective tier after the ordering downgrade — never "high" when orderingUnknown. */
  confidenceTier: ConfidenceTier;
}

export type ExclusionAnswerValue = "yes" | "no" | "not_sure";

/** ruleId -> exclusion label -> the user's answer to that exclusion's patientQuestion. */
export type ExclusionAnswers = Record<string, Record<string, ExclusionAnswerValue> | undefined>;

export type ExclusionStatus = "clear" | "pending" | "excluded";

export interface ExcludableCandidate extends CandidateMatch {
  exclusionStatus: ExclusionStatus;
  pendingExclusions: EngineDyadExclusion[];
}

export interface PatientQuestion {
  ruleId: string;
  questionText: string;
  drugALabel: string;
  drugBLabel: string;
  citation: string;
  confidenceTier: ConfidenceTier;
  orderingUnknown: boolean;
}

export type EngineOutput =
  | { kind: "none"; message: string }
  | {
      kind: "needs_exclusion_answer";
      ruleId: string;
      exclusionLabel: string;
      exclusionQuestion: string;
    }
  | { kind: "question"; question: PatientQuestion };
