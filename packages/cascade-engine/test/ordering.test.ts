import { describe, expect, it } from "vitest";
import { applyOrdering } from "../src/ordering.js";
import { match } from "../src/match.js";
import { normalize } from "../src/normalize.js";
import { ccbDiureticRule, testLookupTable } from "./fixtures.js";

describe("applyOrdering", () => {
  it("confirms forward ordering when A clearly started before B", () => {
    const meds = normalize(
      [
        { name: "amlodipine", startedApprox: "longer" },
        { name: "furosemide", startedApprox: "this_year" },
      ],
      testLookupTable,
    );
    const [candidate] = applyOrdering(match(meds, [ccbDiureticRule]));
    expect(candidate?.orderingConfirmedForward).toBe(true);
    expect(candidate?.orderingUnknown).toBe(false);
    expect(candidate?.confidenceTier).toBe("high");
  });

  it("drops the candidate entirely when B demonstrably started before A (reverse ordering)", () => {
    const meds = normalize(
      [
        { name: "amlodipine", startedApprox: "this_year" },
        { name: "furosemide", startedApprox: "longer" },
      ],
      testLookupTable,
    );
    const result = applyOrdering(match(meds, [ccbDiureticRule]));
    expect(result).toHaveLength(0);
  });

  it("downgrades to moderate confidence (never drops) when ordering is entirely unknown", () => {
    const meds = normalize([{ name: "amlodipine" }, { name: "furosemide" }], testLookupTable);
    const [candidate] = applyOrdering(match(meds, [ccbDiureticRule]));
    expect(candidate).toBeDefined();
    expect(candidate?.orderingUnknown).toBe(true);
    expect(candidate?.confidenceTier).toBe("moderate");
  });

  it("treats same-bucket start dates as unknown rather than forward", () => {
    const meds = normalize(
      [
        { name: "amlodipine", startedApprox: "1_3_years" },
        { name: "furosemide", startedApprox: "1_3_years" },
      ],
      testLookupTable,
    );
    const [candidate] = applyOrdering(match(meds, [ccbDiureticRule]));
    expect(candidate?.orderingUnknown).toBe(true);
    expect(candidate?.confidenceTier).toBe("moderate");
  });

  it("never surfaces an orderingUnknown match at high confidence, across all buckets", () => {
    const buckets = ["this_year", "1_3_years", "longer", "not_sure", undefined] as const;
    for (const a of buckets) {
      for (const b of buckets) {
        const meds = normalize(
          [
            { name: "amlodipine", startedApprox: a },
            { name: "furosemide", startedApprox: b },
          ],
          testLookupTable,
        );
        for (const candidate of applyOrdering(match(meds, [ccbDiureticRule]))) {
          if (candidate.orderingUnknown) {
            expect(candidate.confidenceTier).toBe("moderate");
          }
        }
      }
    }
  });
});
