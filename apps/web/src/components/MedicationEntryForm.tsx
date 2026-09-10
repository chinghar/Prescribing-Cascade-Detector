"use client";

import { useId, useState } from "react";
import { searchStaticDrugNames } from "../lib/drugTable";
import { fetchSpellingSuggestions, resolveDrugNameLive } from "../lib/lookupClient";
import { buildTimeDrugTable } from "../lib/drugTable";
import { STARTED_APPROX_OPTIONS, type MedListItem } from "../lib/uiTypes";
import type { StartedApprox } from "@cascade-detector/cascade-engine";

interface MedicationEntryFormProps {
  meds: MedListItem[];
  onAdd: (item: MedListItem) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onSetStarted: (id: string, value: StartedApprox) => void;
  onCheck: () => void;
}

function makeId(): string {
  return `med-${Math.random().toString(36).slice(2, 10)}`;
}

export function MedicationEntryForm({
  meds,
  onAdd,
  onRemove,
  onMove,
  onSetStarted,
  onCheck,
}: MedicationEntryFormProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "looking_up" | "not_found">("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputId = useId();
  const listboxId = useId();

  const staticMatches = searchStaticDrugNames(query);

  async function addByName(name: string) {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;

    setStatus("idle");
    setSuggestions([]);
    setQuery("");

    const staticEntry = buildTimeDrugTable[trimmed.toLowerCase()];
    if (staticEntry) {
      onAdd({
        id: makeId(),
        name: trimmed,
        status: "resolved",
        atcClasses: staticEntry.atcClasses,
      });
      return;
    }

    setStatus("looking_up");
    const liveEntry = await resolveDrugNameLive(trimmed);
    if (liveEntry) {
      onAdd({ id: makeId(), name: trimmed, status: "resolved", atcClasses: liveEntry.atcClasses });
      setStatus("idle");
      return;
    }

    const spellingSuggestions = await fetchSpellingSuggestions(trimmed);
    if (spellingSuggestions.length > 0) {
      setSuggestions(spellingSuggestions);
      setStatus("not_found");
      return;
    }

    onAdd({ id: makeId(), name: trimmed, status: "not_found", atcClasses: [] });
    setStatus("idle");
  }

  return (
    <section aria-labelledby="entry-heading" className="flex flex-col gap-6">
      <h2 id="entry-heading" className="text-xl font-bold text-ink">
        1. Add your medications
      </h2>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void addByName(query);
        }}
      >
        <label htmlFor={inputId} className="text-lg font-medium text-ink">
          Medication name
        </label>
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          role="combobox"
          aria-expanded={staticMatches.length > 0}
          aria-controls={listboxId}
          autoComplete="off"
          className="w-full rounded-md border-2 border-border bg-surface px-4 py-3 text-lg text-ink"
          placeholder="e.g. amlodipine, or a brand name"
        />

        {staticMatches.length > 0 && (
          <ul id={listboxId} role="listbox" aria-label="Matching medications" className="flex flex-col gap-2">
            {staticMatches.map((match) => (
              <li key={match.name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => void addByName(match.name)}
                  className="w-full rounded-md border-2 border-border bg-surface-alt px-4 py-3 text-left text-lg text-ink hover:bg-white"
                >
                  {match.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-brand px-4 py-3 text-lg font-semibold text-white hover:bg-brand-dark"
        >
          Add medication
        </button>

        <div role="status" aria-live="polite" className="text-base text-ink-muted">
          {status === "looking_up" && "Looking that up..."}
          {status === "not_found" && suggestions.length > 0 && (
            <div>
              <p>We couldn&apos;t find that exact name. Did you mean:</p>
              <ul className="mt-2 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => void addByName(s)}
                      className="w-full rounded-md border-2 border-border bg-surface-alt px-4 py-3 text-left text-lg text-ink"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-ink">Your medications ({meds.length})</h3>
        {meds.length === 0 && (
          <p className="text-lg text-ink-muted">You haven&apos;t added any medications yet.</p>
        )}
        <ul className="flex flex-col gap-4">
          {meds.map((med, index) => (
            <li key={med.id} className="rounded-md border-2 border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-semibold text-ink">
                  {med.name}
                  {med.status === "not_found" && (
                    <span className="ml-2 text-base font-normal text-ink-muted">
                      (not recognized — you can still keep it)
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onMove(med.id, "up")}
                    disabled={index === 0}
                    aria-label={`Move ${med.name} up`}
                    className="rounded-md border-2 border-border px-3 py-2 text-base disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(med.id, "down")}
                    disabled={index === meds.length - 1}
                    aria-label={`Move ${med.name} down`}
                    className="rounded-md border-2 border-border px-3 py-2 text-base disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(med.id)}
                    aria-label={`Remove ${med.name}`}
                    className="rounded-md border-2 border-danger px-3 py-2 text-base text-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <fieldset className="mt-3">
                <legend className="text-base font-medium text-ink-muted">
                  When did you start taking this? (optional, but helps accuracy)
                </legend>
                <div className="mt-2 flex flex-col gap-2">
                  {STARTED_APPROX_OPTIONS.map((opt) => {
                    const radioId = `${med.id}-${opt.value}`;
                    return (
                      <label
                        key={opt.value}
                        htmlFor={radioId}
                        className="flex min-h-[48px] items-center gap-3 rounded-md border-2 border-border px-3 py-2 text-lg text-ink"
                      >
                        <input
                          id={radioId}
                          type="radio"
                          name={`started-${med.id}`}
                          checked={med.startedApprox === opt.value}
                          onChange={() => onSetStarted(med.id, opt.value)}
                          className="h-6 w-6"
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onCheck}
        disabled={meds.length === 0}
        className="w-full rounded-md bg-brand px-4 py-4 text-xl font-bold text-white disabled:opacity-40"
      >
        Check my medications
      </button>
    </section>
  );
}
