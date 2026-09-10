import { describe, expect, it } from "vitest";
import {
  benchmarkDyad,
  detectedPrevalence,
  dyadAssumptions,
  precision,
  recall,
} from "../src/benchmark.js";

const COHORT_SIZE = 50_000;
const SEED = 7;

/**
 * Relative tolerance for the synthetic-cohort convergence check. This is a
 * property of our synthetic assumptions (see benchmark.ts ASSUMPTION
 * comments), not a clinical validation bound — see README.
 */
const RELATIVE_TOLERANCE = 0.3;

describe("validation harness: prevalence convergence", () => {
  for (const assumptions of dyadAssumptions) {
    it(`${assumptions.ruleId}: full-suppression prevalence is within tolerance of published rate`, () => {
      const result = benchmarkDyad(assumptions, COHORT_SIZE, SEED);
      const detected = detectedPrevalence(result.fullSuppression, result.cohortSize);
      const lower = result.publishedPrevalence * (1 - RELATIVE_TOLERANCE);
      const upper = result.publishedPrevalence * (1 + RELATIVE_TOLERANCE);
      expect(detected).toBeGreaterThanOrEqual(lower);
      expect(detected).toBeLessThanOrEqual(upper);
    });

    it(`${assumptions.ruleId}: baseline (no suppression) visibly over-flags relative to full suppression`, () => {
      const result = benchmarkDyad(assumptions, COHORT_SIZE, SEED);
      const baselineRate = detectedPrevalence(result.baseline, result.cohortSize);
      const suppressedRate = detectedPrevalence(result.fullSuppression, result.cohortSize);
      expect(baselineRate).toBeGreaterThan(suppressedRate * 1.3);
    });

    it(`${assumptions.ruleId}: ordering-only stage sits strictly between baseline and full suppression`, () => {
      const result = benchmarkDyad(assumptions, COHORT_SIZE, SEED);
      const baselineRate = detectedPrevalence(result.baseline, result.cohortSize);
      const orderingRate = detectedPrevalence(result.orderingOnly, result.cohortSize);
      const suppressedRate = detectedPrevalence(result.fullSuppression, result.cohortSize);
      expect(orderingRate).toBeLessThan(baselineRate);
      expect(orderingRate).toBeGreaterThanOrEqual(suppressedRate);
    });

    it(`${assumptions.ruleId}: recall stays high (every forward-ordered, exclusion-clear cascade is caught)`, () => {
      const result = benchmarkDyad(assumptions, COHORT_SIZE, SEED);
      expect(recall(result.fullSuppression, result.trueCascadeCount)).toBeGreaterThanOrEqual(0.99);
    });

    it(`${assumptions.ruleId}: full-suppression precision is meaningfully better than raw match precision`, () => {
      const result = benchmarkDyad(assumptions, COHORT_SIZE, SEED);
      expect(precision(result.fullSuppression)).toBeGreaterThan(precision(result.baseline));
      expect(precision(result.fullSuppression)).toBeGreaterThanOrEqual(0.8);
    });
  }
});
