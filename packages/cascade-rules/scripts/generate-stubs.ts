/**
 * Regenerates data/rules.json from data/confirmed-dyads.json plus a stub
 * entry for every additional dyad known (by count, per the project brief)
 * to exist in the two source consensus lists but not yet transcribed here.
 *
 * ThinkCascades: 9 dyads total, Delphi-validated (2 already confirmed below).
 * PIPC list: 65 dyads total, Delphi consensus (1 already confirmed below).
 *
 * This script does NOT invent any drug/effect/drug content for the stubs —
 * it only records that a numbered slot in a named source list is awaiting
 * verification against the source publication. Re-run with:
 *   npm run generate:stubs --workspace=packages/cascade-rules
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { ConfirmedDyad, RuleEntry, UnverifiedDyad } from "../src/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "src", "data");

const confirmed: ConfirmedDyad[] = JSON.parse(
  readFileSync(join(dataDir, "confirmed-dyads.json"), "utf-8"),
);

const THINKCASCADES_TOTAL = 9;
const PIPC_TOTAL = 65;

const confirmedCountBySource: Record<string, number> = {};
for (const dyad of confirmed) {
  confirmedCountBySource[dyad.evidence.source] =
    (confirmedCountBySource[dyad.evidence.source] ?? 0) + 1;
}

function buildStubs(
  source: "ThinkCascades" | "PIPC",
  total: number,
): UnverifiedDyad[] {
  const alreadyConfirmed = confirmedCountBySource[source] ?? 0;
  const stubCount = total - alreadyConfirmed;
  const stubs: UnverifiedDyad[] = [];
  for (let i = 1; i <= stubCount; i++) {
    const num = String(i).padStart(2, "0");
    stubs.push({
      status: "unverified",
      id: `${source.toLowerCase()}-stub-${num}`,
      sourceNeeded: `${source} Delphi-consensus prescribing-cascade list — dyad not yet transcribed from the source publication.`,
      note:
        "Placeholder only. Do not populate drugA/adverseEffect/drugB/ATC codes until the specific dyad has been read from the cited source.",
    });
  }
  return stubs;
}

const rules: RuleEntry[] = [
  ...confirmed,
  ...buildStubs("ThinkCascades", THINKCASCADES_TOTAL),
  ...buildStubs("PIPC", PIPC_TOTAL),
];

writeFileSync(
  join(dataDir, "rules.json"),
  JSON.stringify(rules, null, 2) + "\n",
);

console.log(
  `Wrote ${rules.length} entries (${confirmed.length} confirmed, ${
    rules.length - confirmed.length
  } unverified stubs) to data/rules.json`,
);
