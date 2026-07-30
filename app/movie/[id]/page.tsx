"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  formatRuntime,
  getMovieDetail,
  type MovieDetail,
} from "@/lib/movie";
import {
  addToTasteProfile,
  addToWatchlist,
  applyTasteSignal,
  getTasteProfile,
  isInWatchlist,
  removeFromWatchlist,
} from "@/lib/storage";

const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
const CAST_BASE = "https://image.tmdb.org/t/p/w185";

type Verdict = "liked" | "skipped" | null;

export default function MoviePage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>(null);

  useEffect(() => {
    let active = true;
    getMovieDetail(id)
      .then((m) => {
        if (!active) return;
        setMovie(m);
        setSaved(isInWatchlist(m.id));
        setVerdict(
          getTasteProfile().some((t) => t.id === m.id) ? "liked" : null,
        );
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

  function toggleWatchlist() {
    if (!movie) return;
    if (saved) {
      removeFromWatchlist(movie.id);
      setSaved(false);
    } else {
      addToWatchlist(movie);
      applyTasteSignal(movie, "up");
      setSaved(true);
    }
  }

  function like() {
    if (!movie || verdict === "liked") return;
    addToTasteProfile(movie);
    applyTasteSignal(movie, "right");
    setVerdict("liked");
  }

  function skip() {
    if (!movie || verdict) return;
    applyTasteSignal(movie, "left");
    setVerdict("skipped");
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app">
        <p className="text-muted">Loading…</p>
      </main>
    );
  }

  if (status === "error" || !movie) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-500">{error || "Film not found."}</p>
        <Link
          href="/"
          className="rounded-lg border border-line px-4 py-2 text-sm hover:border-muted"
        >
          Back home
        </Link>
      </main>
    );
  }

  const runtime = formatRuntime(movie.runtime);
  const metaBits = [
    movie.year || null,
    runtime,
    movie.director ? `Dir. ${movie.director}` : null,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-app pb-20">
      {/* Full-bleed hero */}
      <section className="relative isolate min-h-[52vh] overflow-hidden sm:min-h-[58vh]">
        {movie.backdrop_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${BACKDROP_BASE}${movie.backdrop_path}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-app via-app/70 to-black/30" />

        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-4 top-4 z-10 rounded-full bg-black/45 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/65"
        >
          ← Back
        </button>

        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-3xl gap-5 px-5 pb-6 pt-24 sm:gap-7 sm:px-8">
          <div className="relative w-28 shrink-0 overflow-hidden rounded-md shadow-2xl ring-1 ring-white/10 sm:w-36">
            {movie.poster_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${POSTER_BASE}${movie.poster_path}`}
                alt={movie.title}
                className="aspect-[2/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center bg-surface-2 p-2 text-center text-xs text-muted">
                {movie.title}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-end pb-1">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white drop-shadow sm:text-4xl">
              {movie.title}
            </h1>
            {metaBits.length > 0 && (
              <p className="mt-2 text-sm text-white/75 sm:text-base">
                {metaBits.join(" · ")}
              </p>
            )}
            {movie.genres.length > 0 && (
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-white/60">
                {movie.genres.join("  ·  ")}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        {/* Cast */}
        {movie.cast.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Cast
            </h2>
            <ul className="-mx-5 mt-4 flex gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8">
              {movie.cast.map((person) => (
                <li
                  key={person.id}
                  className="w-20 shrink-0 text-center sm:w-24"
                >
                  <div className="mx-auto aspect-square w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
                    {person.profile_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${CAST_BASE}${person.profile_path}`}
                        alt={person.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg text-muted">
                        {person.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <p
                    className="mt-2 truncate text-xs font-medium text-fg"
                    title={person.name}
                  >
                    {person.name}
                  </p>
                  {person.character && (
                    <p
                      className="truncate text-[10px] text-muted"
                      title={person.character}
                    >
                      {person.character}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Actions */}
        <section className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={like}
            disabled={verdict === "liked"}
            aria-pressed={verdict === "liked"}
            className={
              "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 " +
              (verdict === "liked"
                ? "bg-green-600 text-white"
                : "border border-line text-fg hover:border-green-500 hover:text-green-500")
            }
          >
            {verdict === "liked" ? "♥ Liked" : "♥ Like"}
          </button>
          <button
            type="button"
            onClick={skip}
            disabled={!!verdict}
            aria-pressed={verdict === "skipped"}
            className={
              "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 " +
              (verdict === "skipped"
                ? "bg-red-600 text-white"
                : "border border-line text-fg hover:border-red-500 hover:text-red-500")
            }
          >
            {verdict === "skipped" ? "✕ Skipped" : "✕ Skip"}
          </button>
          <button
            type="button"
            onClick={toggleWatchlist}
            aria-pressed={saved}
            className={
              "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors " +
              (saved
                ? "bg-sky-500 text-white hover:bg-sky-600"
                : "border border-line text-fg hover:border-muted")
            }
          >
            {saved ? "✓ Watchlist" : "+ Watchlist"}
          </button>
        </section>

        {/* Summary */}
        {movie.overview && (
          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Summary
            </h2>
            <p className="mt-3 text-base leading-relaxed text-fg/85">
              {movie.overview}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
