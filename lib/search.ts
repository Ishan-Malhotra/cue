// Client helper for TMDB search via /api/tmdb/search — never call TMDB directly.

import type { Film } from "@/lib/storage";

type TmdbSearchResult = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  poster_path: string | null;
  genre_ids?: number[];
  original_language?: string;
};

export type SearchMovie = Film & {
  genre_ids: number[];
  original_language: string;
};

export async function searchMovies(query: string): Promise<SearchMovie[]> {
  const q = query.trim();
  if (!q) return [];

  const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Search failed (${res.status})`);
  }

  const results: TmdbSearchResult[] = data.results ?? [];
  return results.map((m) => ({
    id: m.id,
    title: m.title || m.name || "Untitled",
    year: m.release_date ? m.release_date.slice(0, 4) : "",
    poster_path: m.poster_path,
    genre_ids: m.genre_ids ?? [],
    original_language: m.original_language ?? "",
  }));
}
