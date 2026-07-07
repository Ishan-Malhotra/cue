// Client-side helper for /explore. Builds the /api/tmdb/discover query by
// merging the user's manually-selected filter chips with the swipePrefs
// weighted bias, then fetches through our proxy (never TMDB directly).

import { getTopPrefs, getSwipePrefs } from "@/lib/storage";

// swipePrefs bias only kicks in once the user has enough history.
export const BIAS_THRESHOLD = 10;

export type Selection = {
  genreIds: number[]; // selected genre chips (multi-select, OR)
  lang: string | null; // selected language chip (single)
};

export type DiscoverMovie = {
  id: number;
  title: string;
  year: string;
  poster_path: string | null;
  genre_ids: number[];
  original_language: string;
  overview: string;
  vote_average: number;
};

type TmdbDiscoverResult = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  poster_path: string | null;
  genre_ids?: number[];
  original_language?: string;
  overview?: string;
  vote_average?: number;
};

// Per-dimension precedence: an explicitly selected chip wins for that
// dimension; any dimension left unselected falls back to the weighted bias
// once tasteCount >= BIAS_THRESHOLD. Below threshold and unselected => omit
// (plain popularity discover).
export function buildDiscoverQuery(
  selected: Selection,
  tasteCount: number,
): URLSearchParams {
  const params = new URLSearchParams({ sort_by: "popularity.desc" });
  const biasReady = tasteCount >= BIAS_THRESHOLD;
  const top = biasReady ? getTopPrefs(getSwipePrefs()) : null;

  // Genres: chips (OR via "|") win; else top weighted genres.
  if (selected.genreIds.length > 0) {
    params.set("with_genres", selected.genreIds.join("|"));
  } else if (top && top.genreIds.length > 0) {
    params.set("with_genres", top.genreIds.join("|"));
  }

  // Language: chip wins; else top weighted language.
  if (selected.lang) {
    params.set("with_original_language", selected.lang);
  } else if (top && top.lang) {
    params.set("with_original_language", top.lang);
  }

  return params;
}

export async function fetchDiscover(
  selected: Selection,
  tasteCount: number,
  page: number,
): Promise<DiscoverMovie[]> {
  const params = buildDiscoverQuery(selected, tasteCount);
  params.set("page", String(page));

  const res = await fetch(`/api/tmdb/discover?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Discover failed (${res.status})`);
  }

  const results: TmdbDiscoverResult[] = data.results ?? [];
  return results.map((m) => ({
    id: m.id,
    title: m.title || m.name || "Untitled",
    year: m.release_date ? m.release_date.slice(0, 4) : "",
    poster_path: m.poster_path,
    genre_ids: m.genre_ids ?? [],
    original_language: m.original_language ?? "",
    overview: m.overview ?? "",
    vote_average: m.vote_average ?? 0,
  }));
}
