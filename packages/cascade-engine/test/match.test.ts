import { describe, expect, it } from "vitest";
import { match } from "../src/match.js";
import { normalize } from "../src/normalize.js";
import { ccbDiureticRule, testLookupTable } from "./fixtures.js";

describe("match", () => {
  it("finds a candidate when both an A-drug and a B-drug are present", () => {
    const meds = normalize([{ name: "amlodipine" }, { name: "furosemide" }], testLookupTable);
    const candidates = match(meds, [ccbDiureticRule]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.rule.id).toBe("ccb-oedema-diuretic");
  });

  it("finds no candidate when only the A-drug is present", () => {
    const meds = normalize([{ name: "amlodipine" }], testLookupTable);
    expect(match(meds, [ccbDiureticRule])).toHaveLength(0);
  });

  it("ignores unresolved medications", () => {
    const meds = normalize([{ name: "unknown-drug" }, { name: "furosemide" }], testLookupTable);
    expect(match(meds, [ccbDiureticRule])).toHaveLength(0);
  });

  it("does not match a drug unrelated to any rule", () => {
    const meds = normalize([{ name: "lisinopril" }, { name: "furosemide" }], testLookupTable);
    expect(match(meds, [ccbDiureticRule])).toHaveLength(0);
  });
});
