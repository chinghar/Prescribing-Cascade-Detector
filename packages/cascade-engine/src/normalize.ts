import type { DrugLookupTable, NormalizedMed, RawMedEntry } from "./types.js";

function normalizeKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Pure lookup against a caller-supplied table (built at build time, or
 * enriched at runtime by a caller that has already talked to RxNav).
 * This function makes no network calls — anything not found in the table
 * comes back with resolved: false and an empty atcClasses list.
 */
export function normalize(
  input: RawMedEntry[],
  lookupTable: DrugLookupTable,
): NormalizedMed[] {
  return input.map((entry): NormalizedMed => {
    const key = normalizeKey(entry.name);
    const found = lookupTable[key];
    const base = { inputName: entry.name, ...(entry.startedApprox !== undefined ? { startedApprox: entry.startedApprox } : {}) };
    if (!found) {
      return { ...base, rxcui: null, atcClasses: [], resolved: false };
    }
    return { ...base, rxcui: found.rxcui, atcClasses: found.atcClasses, resolved: true };
  });
}
