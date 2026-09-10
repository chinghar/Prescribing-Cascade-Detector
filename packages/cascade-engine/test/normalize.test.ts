import { describe, expect, it } from "vitest";
import { normalize } from "../src/normalize.js";
import { testLookupTable } from "./fixtures.js";

describe("normalize", () => {
  it("resolves a known drug name against the lookup table", () => {
    const [result] = normalize([{ name: "Amlodipine" }], testLookupTable);
    expect(result).toMatchObject({
      inputName: "Amlodipine",
      rxcui: "17767",
      atcClasses: ["C08CA01"],
      resolved: true,
    });
  });

  it("is case- and whitespace-insensitive on lookup", () => {
    const [result] = normalize([{ name: "  FUROSEMIDE  " }], testLookupTable);
    expect(result?.resolved).toBe(true);
    expect(result?.rxcui).toBe("4603");
  });

  it("marks unknown drugs as unresolved without making any network call", () => {
    const [result] = normalize([{ name: "not-a-real-drug" }], testLookupTable);
    expect(result).toMatchObject({ resolved: false, rxcui: null, atcClasses: [] });
  });

  it("carries the startedApprox field through unchanged", () => {
    const [result] = normalize([{ name: "amlodipine", startedApprox: "longer" }], testLookupTable);
    expect(result?.startedApprox).toBe("longer");
  });
});
