// Client-side helper for /explore. Builds the /api/tmdb/discover query by
// merging filter chips with the local tasteModel, then fetches through our
// proxy (never TMDB directly).

import {
  getDominantLanguage,
  getStrongNegativeGenres,
  getTasteModel,
  getTopPositiveGenres,
  type TasteModel,
} from "@/lib/storage";
import { sortByTasteScore } from "@/lib/rank";

// Genre bias: enough history AND at least one like (never activate on skips only).
export const GENRE_BIAS_SWIPES = 5;
export const GENRE_BIAS_LIKES = 1;

// Language is blunter — activate later, and only with a clear margin.
export const LANG_BIAS_SWIPES = 10;

// If a constrained query returns fewer than this, retry without without_genres.
export const THIN_RESULT_THRESHOLD = 8;

const SORT_ROTATION = [
  "popularity.desc",
  "vote_average.desc",
  "primary_release_date.desc",
] as const;

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

export function isGenreBiasActive(model: TasteModel = getTasteModel()): boolean {
  return (
    model.swipeCount >= GENRE_BIAS_SWIPES && model.likeCount >= GENRE_BIAS_LIKES
  );
}

export function isLangBiasActive(model: TasteModel = getTasteModel()): boolean {
  return model.swipeCount >= LANG_BIAS_SWIPES;
}

export function buildDiscoverQuery(
  selected: Selection,
  model: TasteModel = getTasteModel(),
  options: { sortBy?: string; omitWithoutGenres?: boolean } = {},
): URLSearchParams {
  const sortBy =
    options.sortBy ??
    SORT_ROTATION[model.swipeCount % SORT_ROTATION.length];
  const params = new URLSearchParams({ sort_by: sortBy });

  // vote_average.desc without a floor returns 1-vote junk and flaky pages.
  if (sortBy === "vote_average.desc") {
    params.set("vote_count.gte", "100");
  }

  const genreBias = isGenreBiasActive(model);
  const langBias = isLangBiasActive(model);

  // Genres: chips (OR via "|") win; else top positive genres with "|".
  // Never join with comma — TMDB treats comma as AND and starves results.
  let withGenres = "";
  if (selected.genreIds.length > 0) {
    withGenres = selected.genreIds.join("|");
  } else if (genreBias) {
    withGenres = getTopPositiveGenres(model, 2).join("|");
  }
  if (withGenres) params.set("with_genres", withGenres);

  // Negatives only when we also have a positive genre anchor — otherwise
  // without_genres alone over-constrains and invites empty/flaky responses.
  if (
    genreBias &&
    withGenres &&
    !options.omitWithoutGenres &&
    selected.genreIds.length === 0
  ) {
    const negatives = getStrongNegativeGenres(model, -2, 2).filter(
      (id) => !withGenres.split("|").includes(id),
    );
    if (negatives.length > 0) {
      params.set("without_genres", negatives.join("|"));
    }
  }

  // Language: chip wins; else dominant lang under the stricter gate.
  if (selected.lang) {
    params.set("with_original_language", selected.lang);
  } else if (langBias) {
    const lang = getDominantLanguage(model);
    if (lang) params.set("with_original_language", lang);
  }

  return params;
}

function mapResults(results: TmdbDiscoverResult[]): DiscoverMovie[] {
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

async function fetchDiscoverPage(
  params: URLSearchParams,
): Promise<DiscoverMovie[]> {
  const url = `/api/tmdb/discover?${params.toString()}`;
  let lastError: Error | null = null;

  // One retry — TMDB via the proxy intermittently returns "fetch failed".
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data && data.error) || `Discover failed (${res.status})`,
        );
      }
      return mapResults(data?.results ?? []);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Discover failed");
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }

  throw lastError ?? new Error("Discover failed");
}

export async function fetchDiscover(
  selected: Selection,
  page: number,
  model: TasteModel = getTasteModel(),
): Promise<DiscoverMovie[]> {
  const base = buildDiscoverQuery(selected, model);
  base.set("page", String(page));

  let movies = await fetchDiscoverPage(base);

  // Thin-result fallback: drop without_genres before touching with_genres.
  if (movies.length < THIN_RESULT_THRESHOLD && base.has("without_genres")) {
    const retry = buildDiscoverQuery(selected, model, {
      sortBy: base.get("sort_by") ?? undefined,
      omitWithoutGenres: true,
    });
    retry.set("page", String(page));
    movies = await fetchDiscoverPage(retry);
  }

  return sortByTasteScore(movies, model);
}

/** Starting page for soft resets so we don't keep re-eating page 1. */
export function softResetStartPage(model: TasteModel, seenSize: number): number {
  const offset = Math.floor(seenSize / 20) + Math.floor(model.swipeCount / 8);
  return Math.min(1 + (offset % 15), 20);
}
