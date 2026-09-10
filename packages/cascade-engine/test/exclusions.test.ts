import { describe, expect, it } from "vitest";
import { applyExclusions } from "../src/exclusions.js";
import { applyOrdering } from "../src/ordering.js";
import { match } from "../src/match.js";
import { normalize } from "../src/normalize.js";
import { ccbDiureticRule, testLookupTable } from "./fixtures.js";

function buildCandidates() {
  const meds = normalize(
    [
      { name: "amlodipine", startedApprox: "longer" },
      { name: "furosemide", startedApprox: "this_year" },
    ],
    testLookupTable,
  );
  return applyOrdering(match(meds, [ccbDiureticRule]));
}

describe("applyExclusions", () => {
  it("is pending when the exclusion question is unanswered", () => {
    const [candidate] = applyExclusions(buildCandidates(), {});
    expect(candidate?.exclusionStatus).toBe("pending");
    expect(candidate?.pendingExclusions).toHaveLength(1);
  });

  it("treats 'not_sure' as pending, not clear", () => {
    const answers = { "ccb-oedema-diuretic": { "Diagnosis of heart failure": "not_sure" as const } };
    const [candidate] = applyExclusions(buildCandidates(), answers);
    expect(candidate?.exclusionStatus).toBe("pending");
  });

  it("is excluded when the exclusion condition is answered yes", () => {
    const answers = { "ccb-oedema-diuretic": { "Diagnosis of heart failure": "yes" as const } };
    const [candidate] = applyExclusions(buildCandidates(), answers);
    expect(candidate?.exclusionStatus).toBe("excluded");
  });

  it("is clear when every exclusion is answered no", () => {
    const answers = { "ccb-oedema-diuretic": { "Diagnosis of heart failure": "no" as const } };
    const [candidate] = applyExclusions(buildCandidates(), answers);
    expect(candidate?.exclusionStatus).toBe("clear");
  });
});
