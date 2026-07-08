"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getMovieDetail, type MovieDetail } from "@/lib/movie";
import {
  addToWatchlist,
  isInWatchlist,
  removeFromWatchlist,
} from "@/lib/storage";

const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

export default function MoviePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    getMovieDetail(id)
      .then((m) => {
        if (!active) return;
        setMovie(m);
        setSaved(isInWatchlist(m.id));
        setStatus("ready");
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load film.");
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Binary watchlist toggle — writes ONLY to watchlist (never tasteProfile or a
  // card). No reject/skip here; that belongs to the swipe deck.
  function toggleWatchlist() {
    if (!movie) return;
    if (saved) {
      removeFromWatchlist(movie.id);
      setSaved(false);
    } else {
      addToWatchlist(movie);
      setSaved(true);
    }
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500">Loading…</p>
      </main>
    );
  }

  if (status === "error" || !movie) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-400">{error || "Film not found."}</p>
        <Link
          href="/"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-500"
        >
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <div className="relative">
        {movie.backdrop_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${BACKDROP_BASE}${movie.backdrop_path}`}
            alt={movie.title}
            className="h-64 w-full object-cover sm:h-96"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        <Link
          href="/"
          className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white backdrop-blur hover:bg-black/70"
        >
          ← Home
        </Link>
      </div>

      <div className="mx-auto -mt-16 max-w-2xl px-6">
        <h1 className="text-3xl font-bold">
          {movie.title}
          {movie.year && (
            <span className="ml-2 text-xl font-normal text-neutral-400">
              {movie.year}
            </span>
          )}
        </h1>

        {movie.genres.length > 0 && (
          <p className="mt-2 text-sm uppercase tracking-wide text-neutral-500">
            {movie.genres.join(" · ")}
          </p>
        )}

        <button
          type="button"
          onClick={toggleWatchlist}
          aria-pressed={saved}
          className={
            "mt-5 rounded-full px-5 py-2 text-sm font-semibold transition-colors " +
            (saved
              ? "bg-sky-500 text-white hover:bg-sky-600"
              : "border border-neutral-600 text-neutral-200 hover:border-neutral-400")
          }
        >
          {saved ? "✓ On your watchlist" : "+ Add to watchlist"}
        </button>

        {movie.overview && (
          <p className="mt-6 leading-relaxed text-neutral-300">
            {movie.overview}
          </p>
        )}
      </div>
    </main>
  );
}
