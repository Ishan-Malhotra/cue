// Client-side scoring of discover candidates against the local taste model.
// Used to order new batches (and the not-yet-rendered deck tail) — not a
// neural recommender, just a weighted sum over genre/lang affinities.

import type { TasteModel } from "@/lib/storage";

export type RankableMovie = {
  genre_ids: number[];
  original_language: string;
  vote_average?: number;
};

export function scoreMovie(movie: RankableMovie, model: TasteModel): number {
  let score = 0;
  for (const id of movie.genre_ids) {
    score += model.genres[String(id)] ?? 0;
  }
  if (movie.original_language) {
    score += model.langs[movie.original_language] ?? 0;
  }
  // Light popularity prior so ties don't feel random.
  score += (movie.vote_average ?? 0) * 0.05;
  return score;
}

export function sortByTasteScore<T extends RankableMovie>(
  movies: T[],
  model: TasteModel,
): T[] {
  return [...movies].sort(
    (a, b) => scoreMovie(b, model) - scoreMovie(a, model),
  );
}
