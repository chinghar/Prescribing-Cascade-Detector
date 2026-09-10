"use client";

import { useMemo, useState } from "react";
import {
  runCascadeCheck,
  type DrugLookupTable,
  type ExclusionAnswers,
  type ExclusionAnswerValue,
  type StartedApprox,
} from "@cascade-detector/cascade-engine";
import { confirmedRules } from "@cascade-detector/cascade-rules";
import { buildTimeDrugTable } from "../lib/drugTable";
import type { MedListItem } from "../lib/uiTypes";
import { MedicationEntryForm } from "./MedicationEntryForm";
import { ResultView } from "./ResultView";
import { PrivacyNote } from "./PrivacyNote";

/**
 * All state here is in-memory React state only. Nothing in this component
 * tree writes to localStorage, a cookie, or any server-side store — closing
 * or reloading the tab discards everything, by design.
 */
export function CascadeApp() {
  const [meds, setMeds] = useState<MedListItem[]>([]);
  const [view, setView] = useState<"entry" | "result">("entry");
  const [exclusionAnswers, setExclusionAnswers] = useState<ExclusionAnswers>({});

  function addMed(item: MedListItem) {
    setMeds((prev) => [...prev, item]);
  }

  function removeMed(id: string) {
    setMeds((prev) => prev.filter((m) => m.id !== id));
  }

  function moveMed(id: string, direction: "up" | "down") {
    setMeds((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      if (index === -1) return prev;
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      const a = next[index];
      const b = next[swapWith];
      if (!a || !b) return prev;
      next[index] = b;
      next[swapWith] = a;
      return next;
    });
  }

  function setStarted(id: string, value: StartedApprox) {
    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, startedApprox: value } : m)));
  }

  function answerExclusion(ruleId: string, exclusionLabel: string, value: ExclusionAnswerValue) {
    setExclusionAnswers((prev) => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], [exclusionLabel]: value },
    }));
  }

  const lookupTable: DrugLookupTable = useMemo(() => {
    const merged: DrugLookupTable = { ...buildTimeDrugTable };
    for (const med of meds) {
      const key = med.name.trim().toLowerCase();
      if (!merged[key] && med.status === "resolved") {
        merged[key] = { rxcui: "", atcClasses: med.atcClasses, matchedName: med.name };
      }
    }
    return merged;
  }, [meds]);

  const engineOutput = useMemo(
    () =>
      runCascadeCheck(
        meds.map((m) => ({ name: m.name, startedApprox: m.startedApprox })),
        lookupTable,
        confirmedRules,
        exclusionAnswers,
      ),
    [meds, lookupTable, exclusionAnswers],
  );

  return (
    <div className="flex flex-col gap-8">
      <PrivacyNote />
      {view === "entry" ? (
        <MedicationEntryForm
          meds={meds}
          onAdd={addMed}
          onRemove={removeMed}
          onMove={moveMed}
          onSetStarted={setStarted}
          onCheck={() => setView("result")}
        />
      ) : (
        <ResultView output={engineOutput} onAnswerExclusion={answerExclusion} onBack={() => setView("entry")} />
      )}
    </div>
  );
}
