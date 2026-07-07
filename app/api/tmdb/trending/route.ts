import { NextRequest, NextResponse } from "next/server";
import { TmdbError, tmdbFetch } from "@/lib/tmdb";

export const runtime = "nodejs";

// GET /api/tmdb/trending?window=day|week   (default: week)
export async function GET(req: NextRequest) {
  const windowParam = req.nextUrl.searchParams.get("window");
  const timeWindow = windowParam === "day" ? "day" : "week";

  try {
    const data = await tmdbFetch(
      `/trending/movie/${timeWindow}`,
      {},
      { revalidate: 3600 },
    );
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof TmdbError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status });
  }
}
