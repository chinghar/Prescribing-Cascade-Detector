import rawRules from "./data/rules.json" with { type: "json" };
import type { ConfirmedDyad, RuleEntry, UnverifiedDyad } from "./types.js";

export type {
  ConfirmedDyad,
  UnverifiedDyad,
  RuleEntry,
  DyadDrug,
  DyadEvidence,
  DyadExclusion,
  DyadAdverseEffect,
  EvidenceSource,
  ExclusionType,
} from "./types.js";
export { isConfirmedDyad, isUnverifiedDyad } from "./types.js";

function assertValidEntry(entry: unknown, index: number): asserts entry is RuleEntry {
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`rules.json[${index}] is not an object`);
  }
  const record = entry as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.length === 0) {
    throw new Error(`rules.json[${index}] is missing a valid "id"`);
  }
  if (record.status === "unverified") {
    if (typeof record.sourceNeeded !== "string" || record.sourceNeeded.length === 0) {
      throw new Error(`rules.json[${index}] (${record.id}) is unverified but has no "sourceNeeded"`);
    }
    return;
  }
  if (record.status !== "confirmed") {
    throw new Error(`rules.json[${index}] (${record.id}) has invalid "status": ${String(record.status)}`);
  }
  const evidence = record.evidence as Record<string, unknown> | undefined;
  if (!evidence || (evidence.source !== "ThinkCascades" && evidence.source !== "PIPC")) {
    throw new Error(`rules.json[${index}] (${record.id}) has no valid evidence.source — confirmed dyads must cite ThinkCascades or PIPC`);
  }
  if (typeof evidence.citation !== "string" || evidence.citation.length === 0) {
    throw new Error(`rules.json[${index}] (${record.id}) has no citation`);
  }
}

const validatedRules: RuleEntry[] = (rawRules as unknown[]).map((entry, index) => {
  assertValidEntry(entry, index);
  return entry;
});

/** Every dyad in the library: confirmed dyads with full data, plus unverified stubs. */
export const rules: RuleEntry[] = validatedRules;

/** Confirmed dyads only — the set the matching engine actually runs against. */
export const confirmedRules: ConfirmedDyad[] = validatedRules.filter(
  (entry): entry is ConfirmedDyad => entry.status === "confirmed",
);

/** Stub dyads awaiting verification against a source publication. */
export const unverifiedRules: UnverifiedDyad[] = validatedRules.filter(
  (entry): entry is UnverifiedDyad => entry.status === "unverified",
);
