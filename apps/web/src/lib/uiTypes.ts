import type { StartedApprox } from "@cascade-detector/cascade-engine";

export interface MedListItem {
  id: string;
  name: string;
  startedApprox?: StartedApprox;
  status: "resolving" | "resolved" | "not_found";
  atcClasses: string[];
}

export const STARTED_APPROX_OPTIONS: Array<{ value: StartedApprox; label: string }> = [
  { value: "this_year", label: "This year" },
  { value: "1_3_years", label: "1–3 years ago" },
  { value: "longer", label: "Longer than 3 years ago" },
  { value: "not_sure", label: "Not sure" },
];
