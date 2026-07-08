// Client helper for /movie/[id]. Fetches film detail through our proxy — never
// TMDB directly.

export type MovieDetail = {
  id: number;
  title: string;
  year: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  genres: string[];
};

type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  overview?: string;
  backdrop_path: string | null;
  poster_path: string | null;
  genres?: { id: number; name: string }[];
};

export async function getMovieDetail(id: string | number): Promise<MovieDetail> {
  const res = await fetch(`/api/tmdb/movie/${encodeURIComponent(String(id))}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Failed to load film (${res.status})`);
  }
  const m = data as TmdbMovie;
  return {
    id: m.id,
    title: m.title || m.name || "Untitled",
    year: m.release_date ? m.release_date.slice(0, 4) : "",
    overview: m.overview ?? "",
    backdrop_path: m.backdrop_path,
    poster_path: m.poster_path,
    genres: (m.genres ?? []).map((g) => g.name),
  };
}
