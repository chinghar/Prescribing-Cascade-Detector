import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import axe from "axe-core";
import { MedicationEntryForm } from "../src/components/MedicationEntryForm";
import { ResultView } from "../src/components/ResultView";
import type { MedListItem } from "../src/lib/uiTypes";
import type { EngineOutput } from "@cascade-detector/cascade-engine";

/**
 * axe-core's color-contrast check requires a real layout/rendering engine
 * and is unreliable (mostly "incomplete", not a pass) under jsdom, which
 * does no visual layout. Contrast is instead verified manually against the
 * Tailwind palette (see tailwind.config.ts comments) and by running axe in
 * a real browser devtools panel before shipping. Every other axe rule
 * (labels, roles, landmarks, focus order structure, form semantics) runs
 * for real here.
 */
const AXE_OPTIONS: Parameters<typeof axe.run>[1] = {
  rules: { "color-contrast": { enabled: false } },
};

// axe-core's Node build expects `window`/`document` to be reachable globals
// when given a jsdom element; wire them up for the duration of each check.
function withJsdomGlobals<T>(dom: JSDOM, fn: () => T): T {
  const g = globalThis as unknown as { window?: unknown; document?: unknown };
  const prevWindow = g.window;
  const prevDocument = g.document;
  g.window = dom.window;
  g.document = dom.window.document;
  try {
    return fn();
  } finally {
    g.window = prevWindow;
    g.document = prevDocument;
  }
}

async function checkAccessible(markup: string): Promise<void> {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root">${markup}</div></body></html>`, {
    url: "http://localhost/",
  });
  const results = await withJsdomGlobals(dom, () =>
    axe.run(dom.window.document.getElementById("root") as unknown as Element, AXE_OPTIONS),
  );
  if (results.violations.length > 0) {
    const details = results.violations
      .map((v) => `${v.id}: ${v.description} (${v.nodes.length} node(s))`)
      .join("\n");
    throw new Error(`Accessibility violations found:\n${details}`);
  }
  expect(results.violations).toHaveLength(0);
}

const sampleMeds: MedListItem[] = [
  { id: "med-1", name: "amlodipine", status: "resolved", atcClasses: ["C08CA"], startedApprox: "longer" },
  { id: "med-2", name: "furosemide", status: "resolved", atcClasses: ["C03CA"] },
];

describe("accessibility: entry view", () => {
  it("has no axe violations with an empty medication list", async () => {
    const markup = renderToStaticMarkup(
      React.createElement(MedicationEntryForm, {
        meds: [],
        onAdd: () => {},
        onRemove: () => {},
        onMove: () => {},
        onSetStarted: () => {},
        onCheck: () => {},
      }),
    );
    await checkAccessible(markup);
  });

  it("has no axe violations with medications already added", async () => {
    const markup = renderToStaticMarkup(
      React.createElement(MedicationEntryForm, {
        meds: sampleMeds,
        onAdd: () => {},
        onRemove: () => {},
        onMove: () => {},
        onSetStarted: () => {},
        onCheck: () => {},
      }),
    );
    await checkAccessible(markup);
  });
});

describe("accessibility: result view", () => {
  const outputs: Array<{ label: string; output: EngineOutput }> = [
    { label: "none", output: { kind: "none", message: "Nothing flagged for your current medication list." } },
    {
      label: "needs_exclusion_answer",
      output: {
        kind: "needs_exclusion_answer",
        ruleId: "ccb-oedema-diuretic",
        exclusionLabel: "Diagnosis of heart failure",
        exclusionQuestion: "Have you been diagnosed with heart failure?",
      },
    },
    {
      label: "question",
      output: {
        kind: "question",
        question: {
          ruleId: "ccb-oedema-diuretic",
          questionText:
            "Ask your doctor: could Diuretic be treating swelling in the legs, ankles, or feet caused by Calcium channel blocker, rather than a separate condition?",
          drugALabel: "Calcium channel blocker",
          drugBLabel: "Diuretic",
          citation: "Test citation",
          confidenceTier: "high",
          orderingUnknown: false,
        },
      },
    },
  ];

  for (const { label, output } of outputs) {
    it(`has no axe violations for the "${label}" result state`, async () => {
      const markup = renderToStaticMarkup(
        React.createElement(ResultView, { output, onAnswerExclusion: () => {}, onBack: () => {} }),
      );
      await checkAccessible(markup);
    });
  }
});
