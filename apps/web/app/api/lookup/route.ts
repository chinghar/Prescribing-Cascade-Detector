import { NextResponse } from "next/server";

/**
 * Resolves a single drug name against RxNav, server-side, with Next's fetch
 * cache. Called only when a name isn't found in the build-time static table.
 *
 * Privacy: this endpoint is called with ONE drug name at a time, never a
 * patient's full medication list, and nothing about the request (the name
 * included) is written to any log or store here. The upstream RxNav cache
 * is keyed by the generic drug name only — it is public reference data
 * (name -> ATC class), not tied to any individual patient.
 */

const RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST";
const CACHE_SECONDS = 60 * 60 * 24; // RxNav's drug/class data changes rarely

interface RxcuiResponse {
  idGroup?: { rxnormId?: string[] };
}

interface RxClassResponse {
  rxclassDrugInfoList?: {
    rxclassDrugInfo?: Array<{
      minConcept?: { rxcui?: string };
      rxclassMinConceptItem?: { classId?: string; classType?: string };
    }>;
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  if (!name || name.length > 100) {
    return NextResponse.json({ error: "A single drug name is required." }, { status: 400 });
  }

  const rxcuiRes = await fetch(`${RXNAV_BASE}/rxcui.json?name=${encodeURIComponent(name)}`, {
    next: { revalidate: CACHE_SECONDS },
  });
  if (!rxcuiRes.ok) {
    return NextResponse.json({ error: "RxNav lookup failed." }, { status: 502 });
  }
  const rxcuiBody = (await rxcuiRes.json()) as RxcuiResponse;
  const rxcui = rxcuiBody.idGroup?.rxnormId?.[0];
  if (!rxcui) {
    return NextResponse.json({ resolved: false });
  }

  const classRes = await fetch(
    `${RXNAV_BASE}/rxclass/class/byRxcui.json?rxcui=${encodeURIComponent(rxcui)}&relaSource=ATC`,
    { next: { revalidate: CACHE_SECONDS } },
  );
  let atcClasses: string[] = [];
  if (classRes.ok) {
    const classBody = (await classRes.json()) as RxClassResponse;
    const entries = classBody.rxclassDrugInfoList?.rxclassDrugInfo ?? [];
    atcClasses = [
      ...new Set(
        entries
          .filter((entry) => entry.minConcept?.rxcui === rxcui)
          .filter((entry) => entry.rxclassMinConceptItem?.classType === "ATC1-4")
          .map((entry) => entry.rxclassMinConceptItem?.classId)
          .filter((id): id is string => typeof id === "string"),
      ),
    ];
  }

  return NextResponse.json({ resolved: true, rxcui, atcClasses, matchedName: name });
}
