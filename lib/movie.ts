// Client helper for /movie/[id]. Fetches film detail through our proxy — never
// TMDB directly.

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

export type MovieDetail = {
  id: number;
  title: string;
  year: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  genres: string[];
  genre_ids: number[];
  original_language: string;
  runtime: number | null;
  cast: CastMember[];
  director: string | null;
};

type TmdbCast = {
  id: number;
  name?: string;
  character?: string;
  profile_path: string | null;
  order?: number;
};

type TmdbCrew = {
  id: number;
  name?: string;
  job?: string;
};

type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  overview?: string;
  backdrop_path: string | null;
  poster_path: string | null;
  original_language?: string;
  runtime?: number | null;
  genres?: { id: number; name: string }[];
  credits?: {
    cast?: TmdbCast[];
    crew?: TmdbCrew[];
  };
};

const CAST_LIMIT = 12;

export async function getMovieDetail(id: string | number): Promise<MovieDetail> {
  const res = await fetch(`/api/tmdb/movie/${encodeURIComponent(String(id))}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Failed to load film (${res.status})`);
  }
  const m = data as TmdbMovie;
  const genreObjs = m.genres ?? [];
  const cast = [...(m.credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, CAST_LIMIT)
    .map((c) => ({
      id: c.id,
      name: c.name || "Unknown",
      character: c.character || "",
      profile_path: c.profile_path,
    }));
  const director =
    m.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;

  return {
    id: m.id,
    title: m.title || m.name || "Untitled",
    year: m.release_date ? m.release_date.slice(0, 4) : "",
    overview: m.overview ?? "",
    backdrop_path: m.backdrop_path,
    poster_path: m.poster_path,
    genres: genreObjs.map((g) => g.name),
    genre_ids: genreObjs.map((g) => g.id),
    original_language: m.original_language ?? "",
    runtime: m.runtime ?? null,
    cast,
    director,
  };
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
