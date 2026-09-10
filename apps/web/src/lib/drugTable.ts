import staticDrugTable from "../data/drug-table.json";
import type { DrugLookupEntry, DrugLookupTable } from "@cascade-detector/cascade-engine";

/** The build-time table — zero network calls needed for any drug in this set. */
export const buildTimeDrugTable: DrugLookupTable = staticDrugTable as DrugLookupTable;

export interface DrugSuggestion {
  name: string;
  entry: DrugLookupEntry;
}

/** Client-side typeahead against the static table only — no network call. */
export function searchStaticDrugNames(query: string, limit = 8): DrugSuggestion[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return [];
  const results: DrugSuggestion[] = [];
  for (const [name, entry] of Object.entries(buildTimeDrugTable)) {
    if (name.startsWith(trimmed)) {
      results.push({ name, entry });
      if (results.length >= limit) break;
    }
  }
  return results;
}
