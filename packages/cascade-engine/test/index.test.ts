import { describe, expect, it } from "vitest";
import { runCascadeCheck } from "../src/index.js";
import { ccbDiureticRule, testLookupTable } from "./fixtures.js";

describe("runCascadeCheck (top-level API)", () => {
  it("returns a single object, never an array, on every code path", () => {
    const outputs = [
      runCascadeCheck([], testLookupTable, [ccbDiureticRule], {}),
      runCascadeCheck(
        [{ name: "amlodipine" }, { name: "furosemide" }],
        testLookupTable,
        [ccbDiureticRule],
        {},
      ),
      runCascadeCheck(
        [
          { name: "amlodipine", startedApprox: "longer" },
          { name: "furosemide", startedApprox: "this_year" },
        ],
        testLookupTable,
        [ccbDiureticRule],
        { "ccb-oedema-diuretic": { "Diagnosis of heart failure": "no" } },
      ),
    ];
    for (const output of outputs) {
      expect(Array.isArray(output)).toBe(false);
      expect(typeof output).toBe("object");
    }
  });

  it("returns 'none' when no medications are supplied", () => {
    const result = runCascadeCheck([], testLookupTable, [ccbDiureticRule], {});
    expect(result.kind).toBe("none");
  });

  it("returns 'needs_exclusion_answer' before ever emitting a cascade question", () => {
    const result = runCascadeCheck(
      [
        { name: "amlodipine", startedApprox: "longer" },
        { name: "furosemide", startedApprox: "this_year" },
      ],
      testLookupTable,
      [ccbDiureticRule],
      {},
    );
    expect(result.kind).toBe("needs_exclusion_answer");
    if (result.kind === "needs_exclusion_answer") {
      expect(result.exclusionQuestion).toBe("Have you been diagnosed with heart failure?");
    }
  });

  it("returns a single 'question' once exclusions are clear and ordering is forward", () => {
    const result = runCascadeCheck(
      [
        { name: "amlodipine", startedApprox: "longer" },
        { name: "furosemide", startedApprox: "this_year" },
      ],
      testLookupTable,
      [ccbDiureticRule],
      { "ccb-oedema-diuretic": { "Diagnosis of heart failure": "no" } },
    );
    expect(result.kind).toBe("question");
    if (result.kind === "question") {
      expect(result.question.questionText).toContain("Ask your doctor");
      expect(result.question.questionText).not.toMatch(/should stop|you have a cascade|discontinue/i);
      expect(result.question.citation).toBeTruthy();
    }
  });

  it("a reverse-ordered input (drug B started before drug A) produces zero flags", () => {
    const result = runCascadeCheck(
      [
        { name: "amlodipine", startedApprox: "this_year" },
        { name: "furosemide", startedApprox: "longer" },
      ],
      testLookupTable,
      [ccbDiureticRule],
      { "ccb-oedema-diuretic": { "Diagnosis of heart failure": "no" } },
    );
    expect(result.kind).toBe("none");
  });

  it("excludes the candidate when the exclusion condition applies, even with forward ordering", () => {
    const result = runCascadeCheck(
      [
        { name: "amlodipine", startedApprox: "longer" },
        { name: "furosemide", startedApprox: "this_year" },
      ],
      testLookupTable,
      [ccbDiureticRule],
      { "ccb-oedema-diuretic": { "Diagnosis of heart failure": "yes" } },
    );
    expect(result.kind).toBe("none");
  });
});
