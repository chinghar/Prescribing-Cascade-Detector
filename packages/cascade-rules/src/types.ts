/**
 * Schema for the prescribing-cascade rule library.
 *
 * GROUNDING CONSTRAINT: every `ConfirmedDyad` in `data/rules.json` must trace
 * to a published expert-consensus source (ThinkCascades or PIPC). Nothing in
 * this package should be populated from pharmacological reasoning alone.
 */

export type EvidenceSource = "ThinkCascades" | "PIPC";

export type ExclusionType =
  | "condition"
  | "prior_history"
  | "independent_indication";

export interface DyadExclusion {
  type: ExclusionType;
  label: string;
  /** How we ask the user about this exclusion, in plain language. */
  patientQuestion: string;
}

export interface DyadEvidence {
  source: EvidenceSource;
  /**
   * Descriptive citation. Where full bibliographic detail (authors, journal,
   * year, DOI) has not been independently verified against the source
   * publication, this field says so explicitly rather than inventing it —
   * see README "What is validated / What is not".
   */
  citation: string;
  /** Only populated where a population prevalence figure has been published. */
  populationPrevalence?: number;
}

export interface DyadDrug {
  atc: string[];
  label: string;
}

export interface DyadAdverseEffect {
  icpc2?: string;
  label: string;
  /** Plain-language phrasing used in the rendered patient question. */
  patientFacingLabel: string;
}

export interface ConfirmedDyad {
  status: "confirmed";
  id: string;
  drugA: DyadDrug;
  adverseEffect: DyadAdverseEffect;
  drugB: DyadDrug;
  exclusions: DyadExclusion[];
  evidence: DyadEvidence;
  confidenceTier: "high" | "moderate";
}

export interface UnverifiedDyad {
  status: "unverified";
  id: string;
  /** Which source list / paper must be consulted before this can be filled in. */
  sourceNeeded: string;
  note?: string;
}

export type RuleEntry = ConfirmedDyad | UnverifiedDyad;

export function isConfirmedDyad(entry: RuleEntry): entry is ConfirmedDyad {
  return entry.status === "confirmed";
}

export function isUnverifiedDyad(entry: RuleEntry): entry is UnverifiedDyad {
  return entry.status === "unverified";
}
