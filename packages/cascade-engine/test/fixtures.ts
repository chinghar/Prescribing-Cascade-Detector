import type { DrugLookupTable, EngineRule } from "../src/types.js";

export const ccbDiureticRule: EngineRule = {
  id: "ccb-oedema-diuretic",
  drugA: { atc: ["C08"], label: "Calcium channel blocker" },
  adverseEffect: {
    icpc2: "K07",
    label: "Peripheral oedema",
    patientFacingLabel: "swelling in the legs, ankles, or feet",
  },
  drugB: { atc: ["C03"], label: "Diuretic" },
  exclusions: [
    {
      type: "condition",
      label: "Diagnosis of heart failure",
      patientQuestion: "Have you been diagnosed with heart failure?",
    },
  ],
  evidence: {
    source: "ThinkCascades",
    citation: "Test fixture citation",
    populationPrevalence: 0.026,
  },
  confidenceTier: "high",
};

export const testLookupTable: DrugLookupTable = {
  amlodipine: { rxcui: "17767", atcClasses: ["C08CA01"], matchedName: "amlodipine" },
  furosemide: { rxcui: "4603", atcClasses: ["C03CA01"], matchedName: "furosemide" },
  lisinopril: { rxcui: "29046", atcClasses: ["C09AA03"], matchedName: "lisinopril" },
};
