// Client helper for the inline "add a film not in your taste profile" flow on
// /card/[id]. Goes through our /api/tmdb/search proxy — never TMDB directly.

import type { Film } from "@/lib/storage";

type TmdbSearchResult = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  poster_path: string | null;
};

export async function searchMovies(query: string): Promise<Film[]> {
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
  }));
}
