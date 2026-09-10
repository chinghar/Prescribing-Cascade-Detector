/**
 * Build-time drug-name -> ATC-class lookup generator.
 *
 * Calls the free, no-auth NLM RxNav REST API (rate-limited client-side to
 * stay well under its 20 req/sec limit) for a curated list of drug names
 * relevant to the three confirmed prescribing-cascade dyads, plus a handful
 * of common unrelated older-adult medications so the app's typeahead isn't
 * trivially small. The output is committed as static JSON so the deployed
 * app makes zero network calls on the common path.
 *
 * Re-run with: npm run generate:drug-table --workspace=apps/web
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "src", "data", "drug-table.json");

const RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST";
const REQUEST_DELAY_MS = 100; // ~10 req/sec, well under the 20 req/sec limit

const CURATED_DRUG_NAMES = [
  // Calcium channel blockers (ATC C08) — drug A in ccb-oedema-diuretic
  "amlodipine",
  "nifedipine",
  "felodipine",
  "diltiazem",
  "verapamil",
  "norvasc",
  // Diuretics (ATC C03) — drug B in ccb-oedema-diuretic, drug A in diuretic-incontinence-oab
  "furosemide",
  "hydrochlorothiazide",
  "chlorthalidone",
  "bumetanide",
  "torsemide",
  "lasix",
  // Overactive bladder agents (ATC G04BD) — drug B in diuretic-incontinence-oab
  "oxybutynin",
  "tolterodine",
  "solifenacin",
  "mirabegron",
  "ditropan",
  "vesicare",
  // Antipsychotics (ATC N05A) — drug A in antipsychotic-eps-antiparkinsonian
  "haloperidol",
  "risperidone",
  "olanzapine",
  "quetiapine",
  "aripiprazole",
  "haldol",
  // Antiparkinsonian agents (ATC N04) — drug B in antipsychotic-eps-antiparkinsonian
  "trihexyphenidyl",
  "benztropine",
  "biperiden",
  "cogentin",
  // Common unrelated older-adult medications, for a realistic typeahead
  "lisinopril",
  "metformin",
  "atorvastatin",
  "levothyroxine",
  "omeprazole",
  "aspirin",
  "metoprolol",
  "warfarin",
  "gabapentin",
  "sertraline",
];

interface DrugTableEntry {
  rxcui: string;
  atcClasses: string[];
  matchedName: string;
}

type DrugTable = Record<string, DrugTableEntry>;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRxcui(name: string): Promise<{ rxcui: string; matchedName: string } | null> {
  const res = await fetch(`${RXNAV_BASE}/rxcui.json?name=${encodeURIComponent(name)}`);
  if (res.ok) {
    const body = (await res.json()) as { idGroup?: { rxnormId?: string[]; name?: string } };
    const rxcui = body.idGroup?.rxnormId?.[0];
    if (rxcui) return { rxcui, matchedName: name };
  }
  // Fall back to RxNav's approximate-match endpoint for names not resolved exactly
  // (older/discontinued brand names, minor spelling variants).
  const approxRes = await fetch(
    `${RXNAV_BASE}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=1`,
  );
  if (!approxRes.ok) return null;
  const approxBody = (await approxRes.json()) as {
    approximateGroup?: { candidate?: Array<{ rxcui?: string }> };
  };
  const rxcui = approxBody.approximateGroup?.candidate?.[0]?.rxcui;
  if (!rxcui) return null;
  return { rxcui, matchedName: name };
}

/** Ingredient rxcuis related to a (possibly brand-name) rxcui, via the "tty=IN" relation. */
async function fetchIngredientRxcuis(rxcui: string): Promise<string[]> {
  const res = await fetch(`${RXNAV_BASE}/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=IN`);
  if (!res.ok) return [];
  const body = (await res.json()) as {
    relatedGroup?: { conceptGroup?: Array<{ conceptProperties?: Array<{ rxcui?: string }> }> };
  };
  const ingredientRxcuis = (body.relatedGroup?.conceptGroup ?? [])
    .flatMap((group) => group.conceptProperties ?? [])
    .map((prop) => prop.rxcui)
    .filter((id): id is string => typeof id === "string");
  return [...new Set(ingredientRxcuis)];
}

interface RxClassResponse {
  rxclassDrugInfoList?: {
    rxclassDrugInfo?: Array<{
      minConcept?: { rxcui?: string };
      rxclassMinConceptItem?: { classId?: string; classType?: string };
    }>;
  };
}

async function fetchAtcClasses(queryRxcui: string, matchRxcuis: string[] = [queryRxcui]): Promise<string[]> {
  const res = await fetch(
    `${RXNAV_BASE}/rxclass/class/byRxcui.json?rxcui=${encodeURIComponent(queryRxcui)}&relaSource=ATC`,
  );
  if (!res.ok) return [];
  const body = (await res.json()) as RxClassResponse;
  const entries = body.rxclassDrugInfoList?.rxclassDrugInfo ?? [];
  const classes = entries
    // Only keep classes attributed to the exact ingredient(s) we queried, not
    // combination products that also happen to contain it.
    .filter((entry) => entry.minConcept?.rxcui && matchRxcuis.includes(entry.minConcept.rxcui))
    .filter((entry) => entry.rxclassMinConceptItem?.classType === "ATC1-4")
    .map((entry) => entry.rxclassMinConceptItem?.classId)
    .filter((id): id is string => typeof id === "string");
  return [...new Set(classes)];
}

async function main(): Promise<void> {
  const table: DrugTable = {};
  const failures: string[] = [];

  for (const name of CURATED_DRUG_NAMES) {
    const resolved = await fetchRxcui(name);
    await sleep(REQUEST_DELAY_MS);
    if (!resolved) {
      failures.push(name);
      continue;
    }
    let atcClasses = await fetchAtcClasses(resolved.rxcui);
    await sleep(REQUEST_DELAY_MS);

    if (atcClasses.length === 0) {
      // Likely a brand name (BN) — classes are attached to its ingredient concept.
      const ingredientRxcuis = await fetchIngredientRxcuis(resolved.rxcui);
      await sleep(REQUEST_DELAY_MS);
      for (const ingredientRxcui of ingredientRxcuis) {
        const ingredientClasses = await fetchAtcClasses(ingredientRxcui, [ingredientRxcui]);
        await sleep(REQUEST_DELAY_MS);
        atcClasses = [...new Set([...atcClasses, ...ingredientClasses])];
      }
    }

    table[name.toLowerCase()] = {
      rxcui: resolved.rxcui,
      atcClasses,
      matchedName: name,
    };
    console.log(`${name} -> rxcui ${resolved.rxcui}, ATC [${atcClasses.join(", ")}]`);
  }

  writeFileSync(outPath, JSON.stringify(table, null, 2) + "\n");
  console.log(`\nWrote ${Object.keys(table).length} entries to ${outPath}`);
  if (failures.length > 0) {
    console.warn(`Failed to resolve: ${failures.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
