import type { ExcludableCandidate, PatientQuestion } from "./types.js";

/**
 * Plain-language framing, non-negotiable: a question to ask a prescriber,
 * never a recommendation, never an instruction to stop or change a
 * medication, never a claim that a cascade is occurring.
 */
export function renderQuestion(top: ExcludableCandidate): PatientQuestion {
  const { rule } = top;
  const questionText = `Ask your doctor: could ${rule.drugB.label} be treating ${rule.adverseEffect.patientFacingLabel} caused by ${rule.drugA.label}, rather than a separate condition?`;

  return {
    ruleId: rule.id,
    questionText,
    drugALabel: rule.drugA.label,
    drugBLabel: rule.drugB.label,
    citation: rule.evidence.citation,
    confidenceTier: top.confidenceTier,
    orderingUnknown: top.orderingUnknown,
  };
}
