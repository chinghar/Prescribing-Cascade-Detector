import type { DrugLookupEntry } from "@cascade-detector/cascade-engine";

/**
 * Resolves one drug name against our own /api/lookup route handler (which in
 * turn calls RxNav, server-side, with caching). Called only for names not
 * already in the build-time static table, and only one name per call —
 * never the patient's full medication list.
 */
export async function resolveDrugNameLive(name: string): Promise<DrugLookupEntry | null> {
  const res = await fetch(`/api/lookup?name=${encodeURIComponent(name)}`);
  if (!res.ok) return null;
  const body = (await res.json()) as {
    resolved: boolean;
    rxcui?: string;
    atcClasses?: string[];
    matchedName?: string;
  };
  if (!body.resolved || !body.rxcui) return null;
  return { rxcui: body.rxcui, atcClasses: body.atcClasses ?? [], matchedName: body.matchedName ?? name };
}

export async function fetchSpellingSuggestions(term: string): Promise<string[]> {
  const res = await fetch(`/api/spelling?term=${encodeURIComponent(term)}`);
  if (!res.ok) return [];
  const body = (await res.json()) as { suggestions?: string[] };
  return body.suggestions ?? [];
}
