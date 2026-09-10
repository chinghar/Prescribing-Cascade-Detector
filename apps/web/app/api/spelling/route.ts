import { NextResponse } from "next/server";

/**
 * Spelling-suggestion proxy for the medication typeahead, using RxNav's
 * getSpellingSuggestions endpoint. Same privacy posture as /api/lookup:
 * one term per request, nothing logged or persisted here.
 */

const RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST";
const CACHE_SECONDS = 60 * 60 * 24;

interface SpellingResponse {
  suggestionGroup?: { suggestionList?: { suggestion?: string[] } };
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get("term")?.trim();
  if (!term || term.length > 100) {
    return NextResponse.json({ error: "A single search term is required." }, { status: 400 });
  }

  const res = await fetch(
    `${RXNAV_BASE}/spellingsuggestions.json?name=${encodeURIComponent(term)}`,
    { next: { revalidate: CACHE_SECONDS } },
  );
  if (!res.ok) {
    return NextResponse.json({ suggestions: [] });
  }
  const body = (await res.json()) as SpellingResponse;
  const suggestions = body.suggestionGroup?.suggestionList?.suggestion ?? [];
  return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
}
