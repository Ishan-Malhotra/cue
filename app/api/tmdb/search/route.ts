import { NextRequest, NextResponse } from "next/server";
import { TmdbError, tmdbFetch } from "@/lib/tmdb";

export const runtime = "nodejs";

// GET /api/tmdb/search?query=<text>&page=<n>
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const query = params.get("query")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "Missing required 'query' parameter." },
      { status: 400 },
    );
  }

  const page = params.get("page") ?? undefined;

  try {
    const data = await tmdbFetch(
      "/search/movie",
      { query, page, include_adult: false },
      { revalidate: 600 },
    );
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof TmdbError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status });
  }
}
