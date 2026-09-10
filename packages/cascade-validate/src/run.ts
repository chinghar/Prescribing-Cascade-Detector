import {
  benchmarkDyad,
  detectedPrevalence,
  dyadAssumptions,
  precision,
  recall,
} from "./benchmark.js";

const COHORT_SIZE = 200_000;
const SEED = 42;

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function row(cells: string[], widths: number[]): string {
  return cells.map((c, i) => c.padEnd(widths[i] ?? 10)).join(" | ");
}

console.log(
  "Synthetic-cohort validation harness — this measures whether the engine's suppression logic",
);
console.log(
  "converges toward published population prevalence. It does NOT validate against real patient",
);
console.log(
  "outcomes; see README 'What is validated / What is not'. Cohort assumptions are labeled ASSUMPTION",
);
console.log(`in packages/cascade-validate/src/benchmark.ts. Cohort size: ${COHORT_SIZE}, seed: ${SEED}.\n`);

const widths = [30, 12, 14, 16, 18, 12, 12];
console.log(
  row(
    ["Dyad", "Published", "Baseline", "+ Ordering", "+ Exclusions", "Precision", "Recall"],
    widths,
  ),
);
console.log("-".repeat(widths.reduce((a, b) => a + b + 3, 0)));

for (const assumptions of dyadAssumptions) {
  const result = benchmarkDyad(assumptions, COHORT_SIZE, SEED);
  console.log(
    row(
      [
        result.ruleId,
        pct(result.publishedPrevalence),
        pct(detectedPrevalence(result.baseline, result.cohortSize)),
        pct(detectedPrevalence(result.orderingOnly, result.cohortSize)),
        pct(detectedPrevalence(result.fullSuppression, result.cohortSize)),
        precision(result.fullSuppression).toFixed(3),
        recall(result.fullSuppression, result.trueCascadeCount).toFixed(3),
      ],
      widths,
    ),
  );
}

console.log(
  "\nBaseline = raw ATC match, no ordering or exclusion logic (deliberate over-flagging control).",
);
console.log(
  "+ Ordering = drops candidates with a demonstrated reverse start-date order.",
);
console.log(
  "+ Exclusions = full pipeline: ordering plus patient-reported exclusion conditions (ground truth here).",
);
