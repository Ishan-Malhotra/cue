import { NextRequest, NextResponse } from "next/server";
import { TmdbError, tmdbFetch } from "@/lib/tmdb";

export const runtime = "nodejs";

// Params we forward to TMDB /discover/movie. Everything else is ignored so the
// proxy can't be used to hit arbitrary TMDB params.
const ALLOWED_PARAMS = [
  "with_genres",
  "without_genres",
  "with_original_language",
  "sort_by",
  "page",
  "vote_count.gte",
  "primary_release_date.lte",
  "primary_release_date.gte",
] as const;

// GET /api/tmdb/discover?with_genres=28&with_original_language=en&sort_by=popularity.desc&page=1
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;

  const params: Record<string, string | boolean> = {
    include_adult: false,
    sort_by: "popularity.desc",
  };
  for (const key of ALLOWED_PARAMS) {
    const value = search.get(key);
    if (value) params[key] = value;
  }

  try {
    const data = await tmdbFetch("/discover/movie", params, {
      revalidate: 3600,
    });
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof TmdbError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status });
  }
}
