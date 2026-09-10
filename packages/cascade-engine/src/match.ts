import type { CandidateMatch, EngineRule, NormalizedMed } from "./types.js";

/** An ATC class on a med matches a rule's ATC prefix if it starts with that prefix. */
function atcMatches(medAtcClasses: string[], rulePrefixes: string[]): boolean {
  return medAtcClasses.some((medAtc) =>
    rulePrefixes.some((prefix) => medAtc.toUpperCase().startsWith(prefix.toUpperCase())),
  );
}

/**
 * Set-intersection match: for every rule, find every (drugA-med, drugB-med)
 * pair present in the patient's med list whose ATC classes satisfy the rule.
 * No exclusion or ordering logic here — this stage is deliberately permissive;
 * suppression happens in applyOrdering / applyExclusions.
 */
export function match(meds: NormalizedMed[], rules: EngineRule[]): CandidateMatch[] {
  const candidates: CandidateMatch[] = [];
  for (const rule of rules) {
    const drugAMeds = meds.filter((med) => med.resolved && atcMatches(med.atcClasses, rule.drugA.atc));
    const drugBMeds = meds.filter((med) => med.resolved && atcMatches(med.atcClasses, rule.drugB.atc));
    for (const drugA of drugAMeds) {
      for (const drugB of drugBMeds) {
        if (drugA.inputName === drugB.inputName) continue;
        candidates.push({
          rule,
          drugA,
          drugB,
          orderingConfirmedForward: false,
          orderingUnknown: true,
          confidenceTier: rule.confidenceTier,
        });
      }
    }
  }
  return candidates;
}
