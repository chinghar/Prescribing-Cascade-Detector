"use client";

import type { EngineOutput, ExclusionAnswerValue } from "@cascade-detector/cascade-engine";

interface ResultViewProps {
  output: EngineOutput;
  onAnswerExclusion: (ruleId: string, exclusionLabel: string, value: ExclusionAnswerValue) => void;
  onBack: () => void;
}

export function ResultView({ output, onAnswerExclusion, onBack }: ResultViewProps) {
  return (
    <section aria-labelledby="result-heading" className="flex flex-col gap-6">
      <h2 id="result-heading" className="text-xl font-bold text-ink">
        2. Result
      </h2>

      {output.kind === "none" && (
        <div role="status" className="rounded-md border-2 border-border bg-surface-alt p-6">
          <p className="text-lg text-ink">{output.message}</p>
          <p className="mt-2 text-base text-ink-muted">
            This does not mean your medications are risk-free — only that this tool did not find a
            pattern it is designed to check for. If you have concerns about a medication, ask your
            doctor or pharmacist directly.
          </p>
        </div>
      )}

      {output.kind === "needs_exclusion_answer" && (
        <fieldset className="rounded-md border-2 border-border bg-surface p-6">
          <legend className="text-lg font-semibold text-ink">One question first</legend>
          <p className="mt-2 text-lg text-ink">{output.exclusionQuestion}</p>
          <div className="mt-4 flex flex-col gap-3">
            {(["yes", "no", "not_sure"] as ExclusionAnswerValue[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onAnswerExclusion(output.ruleId, output.exclusionLabel, value)}
                className="w-full rounded-md border-2 border-border bg-surface-alt px-4 py-3 text-left text-lg capitalize text-ink hover:bg-white"
              >
                {value === "not_sure" ? "Not sure" : value}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {output.kind === "question" && (
        <div className="rounded-md border-2 border-brand bg-surface p-6">
          <p className="text-xl font-semibold text-ink">{output.question.questionText}</p>
          <p className="mt-4 text-base text-ink-muted">
            This is a question to bring to your doctor or pharmacist — not a diagnosis, and not an
            instruction to stop or change any medication.
          </p>
          <p className="mt-3 text-sm text-ink-muted">Source: {output.question.citation}</p>
          {output.question.orderingUnknown && (
            <p className="mt-3 text-sm text-ink-muted">
              Note: we could not confirm which medication you started first, so this suggestion is
              lower-confidence.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-md border-2 border-border bg-surface px-4 py-4 text-xl font-semibold text-ink"
      >
        Back to medications
      </button>
    </section>
  );
}
