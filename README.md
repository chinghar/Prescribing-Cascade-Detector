# Prescribing Cascade Check

This tool checks an older adult's medication list against published expert-consensus
prescribing-cascade patterns and, if one clears a strict confidence bar, suggests **one**
question to bring to a doctor or pharmacist. It suppresses far more matches than it
surfaces, on the premise that an over-flagging tool is worse than no tool at all.

## What this is not

- **Not a medical device.** It has not been reviewed or cleared as one.
- **Not diagnostic.** It never claims a prescribing cascade is occurring.
- **Does not give medical advice**, and never instructs a user to stop or change a medication.
- **It emits questions only** — at most one per check, phrased as something to ask a
  prescriber, never a recommendation.

## What is validated / What is not

**Validated:**
- The matching → ordering → exclusion → ranking pipeline (`packages/cascade-engine`) is
  covered by unit tests, including the two documented failure modes: a reverse-ordered
  input (drug B started before drug A) produces zero flags, and an `orderingUnknown`
  match is never surfaced at high confidence.
- A synthetic-cohort benchmark (`packages/cascade-validate`) shows the full suppression
  pipeline converging toward the three published population-prevalence figures, and shows
  the deliberate over-flagging baseline (raw ATC match, no suppression) landing well above
  them — see the table below.
- The top-level output type is structurally a single object, never an array or list
  (enforced by a compile-time type assertion and covered by a runtime test).

**Not validated:**
- **Against real patient outcomes.** The synthetic cohort's "ground truth" is generated
  from labeled assumptions, not real patients — it validates that the suppression *logic*
  behaves as intended, not that flagged questions correspond to real-world cascades at
  the stated rates.
- **Reverse-ordering severity.** Published hospitalized-patient data found that roughly a
  third to half of naive drug-A→drug-B co-prescription matches were actually reverse-ordered
  (13/39 CCB→diuretic, 16/30 diuretic→OAB) and therefore not cascades at all. This is the
  reason ordering suppression exists, but the *true* population rate of reverse ordering
  outside that one hospitalized cohort is not independently confirmed here.
- **Exclusion logic depends entirely on self-reported conditions.** A user who
  misremembers or misreports a diagnosis will get a wrong exclusion decision; the engine
  has no way to verify an answer.
- **The synthetic cohort's non-prevalence assumptions** (how many patients coincidentally
  take both drugs for independent reasons, how often start dates are unclear) are labeled
  `ASSUMPTION` in `packages/cascade-validate/src/benchmark.ts` and are illustrative, not
  citation-backed.
- **65 of the 68 dyads in the two source consensus lists are stubs**, not yet transcribed
  from the source publications — see the checklist below.

### Validation harness output (illustrative — run `npm run validate` to regenerate)

Synthetic cohort of 200,000, three stages of suppression:

| Dyad | Published prevalence | Baseline (no suppression) | + Ordering | + Ordering + Exclusions |
|---|---|---|---|---|
| ccb-oedema-diuretic | 2.60% | 4.68% | 3.51% | 2.71% |
| diuretic-incontinence-oab | 0.60% | 1.45% | 0.82% | 0.65% |
| antipsychotic-eps-antiparkinsonian | 0.40% | 0.84% | 0.55% | 0.41% |

The baseline column is the deliberate over-flagging control (raw ATC-class match, no
ordering or exclusion logic). Each suppression stage moves detected prevalence closer to
the published figure; full suppression lands within roughly 5–10% relative of it, on this
synthetic cohort, under the labeled assumptions above.

## Architecture

```
/packages/cascade-rules      versioned JSON rule library + TypeScript types + citations
/packages/cascade-engine     pure functions: normalize -> match -> exclude -> rank -> render
/packages/cascade-validate   synthetic cohort generator + prevalence benchmark harness
/apps/web                    Next.js (App Router, TypeScript, Tailwind)
```

- `cascade-engine` has **zero runtime dependencies and zero I/O** — it is a pure
  function pipeline, importable and testable with no network and no DOM.
- `cascade-rules` is a versioned JSON data package, independently consumable.
- `apps/web` runs the engine **entirely in the browser** — a patient's medication list
  never leaves the client except one drug name at a time, sent to this app's own
  `/api/lookup` and `/api/spelling` route handlers (which call RxNav server-side, with
  caching), never the patient's full list, and never a third-party service directly from
  the browser.

## Running it

```bash
npm install
npm run build   # builds cascade-rules, cascade-engine, cascade-validate, then apps/web
npm test        # vitest: engine unit tests, validation-harness assertions, accessibility checks
npm run validate  # prints the prevalence-comparison table above
npm run dev     # apps/web dev server
```

## Deploying to Vercel

Import the repository into Vercel and set the project's **Root Directory to `apps/web`**
(Vercel's standard step for any npm-workspaces monorepo — it still runs `npm install` at
the repo root so workspace packages resolve correctly). No environment variables, no
`vercel.json`, no other configuration is required.

## Privacy

- Medication data lives in React state only, in the browser. It is never written to a
  database (there is none), never logged, and never persisted server-side.
- The two route handlers (`/api/lookup`, `/api/spelling`) each accept a single drug name
  per request — never a patient's medication list — and do not log or store the name;
  they only forward it to RxNav and cache RxNav's generic (non-patient-specific) response.
- A plain-language privacy statement is shown on the page itself.

## Accessibility

Base font size 18px, 48×48px minimum tap targets, ≥7:1 (WCAG AAA) body-text contrast
(color choices documented in `apps/web/tailwind.config.ts`), no drag-and-drop (explicit
up/down buttons for reordering), no gesture- or hover-only affordances, full keyboard
navigation with visible focus rings, semantic landmarks and labels throughout, single-column
layout with no horizontal scroll at 320px. `npm test` runs an automated axe-core check
against the entry and result views (color-contrast is disabled in that automated check
only because jsdom does no real layout/rendering — contrast itself is a fixed, documented
color-token choice, not something that varies at runtime).

## Known gaps in the generated drug lookup table

`apps/web/src/data/drug-table.json` is generated from live RxNav data by
`apps/web/scripts/generate-drug-table.ts` (re-run with
`npm run generate:drug-table --workspace=apps/web`). Three of the 38 curated names
resolved an RxCUI but not an ATC class from RxNav (`ditropan`, `cogentin`,
`levothyroxine`) — this is a real gap in what RxNav returned for those specific
identifiers, not a fabricated value; those entries are committed with an empty
`atcClasses` array rather than a guessed one.

## Citations

- **ThinkCascades**: Delphi-validated list of 9 prescribing-cascade dyads.
- **PIPC list**: international expert-panel Delphi-consensus list of 65 prescribing-cascade
  dyads.
- Full bibliographic detail (authors, journal, year, DOI) for these two source lists, and
  for the population-prevalence figures (CCB→diuretic 2.6%, diuretic→OAB 0.6%,
  antipsychotic→antiparkinsonian 0.4%) and the reverse-ordering study (13/39, 16/30), has
  **not been independently verified against the source publications** in this repository —
  see the per-dyad `evidence.citation` field in `packages/cascade-rules/src/data/confirmed-dyads.json`
  for exactly what is and isn't claimed. Anyone extending this rule library should replace
  those descriptive placeholders with verified full citations while reading the actual
  source paper for each dyad they add.
- List attribution for the three seeded dyads (which of the two lists each came from) is a
  best-effort inference from context, not independently confirmed — flagged inline in
  `confirmed-dyads.json`.

## Stub checklist: dyads awaiting verification

3 of the 74 entries in `packages/cascade-rules/src/data/rules.json` are confirmed
(citation-backed, with real ATC/ICPC-2 codes). The remaining 71 are placeholder stubs —
7 from ThinkCascades, 64 from PIPC — recorded only so the total known-list size is
tracked; **no drug, effect, or ATC-code content has been populated for any of them**, per
the grounding constraint. Regenerate this list with
`npm run generate:stubs --workspace=packages/cascade-rules` after editing
`confirmed-dyads.json`.

<details>
<summary>Full list of 71 unverified stub IDs</summary>

- `thinkcascades-stub-01` through `thinkcascades-stub-07` — ThinkCascades Delphi-consensus
  list, dyads not yet transcribed from the source publication.
- `pipc-stub-01` through `pipc-stub-64` — PIPC Delphi-consensus list, dyads not yet
  transcribed from the source publication.

Each stub in `rules.json` carries `status: "unverified"` and a `sourceNeeded` field
naming which list must be consulted, per entry.
</details>
