import { NextResponse } from "next/server";
import { TmdbError, tmdbFetch } from "@/lib/tmdb";

export const runtime = "nodejs";

// GET /api/tmdb/movie/[id] — full movie detail (title, overview, genres, backdrop).
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const data = await tmdbFetch(
      `/movie/${encodeURIComponent(params.id)}`,
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
