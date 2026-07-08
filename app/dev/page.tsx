"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addToDraft,
  fetchMovieBackdrops,
  getDraft,
  removeFromDraft,
  type Backdrop,
  type MovieBackdrop,
} from "@/lib/backdrops";
import { searchMovies } from "@/lib/search";
import type { Film } from "@/lib/storage";

const FRAME_BASE = "https://image.tmdb.org/t/p/w300";
const PREVIEW_BASE = "https://image.tmdb.org/t/p/w300";

export default function DevPage() {
  const [query, setQuery] = useState("");
  const [films, setFilms] = useState<Film[]>([]);
  const [selected, setSelected] = useState<Film | null>(null);
  const [frames, setFrames] = useState<MovieBackdrop[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(false);
  const [draft, setDraft] = useState<Backdrop[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(getDraft());
  }, []);

  const chosen = new Set(draft.map((b) => b.backdrop_path));

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError("");
    try {
      setFilms(await searchMovies(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    }
  }

  async function selectFilm(film: Film) {
    setSelected(film);
    setFrames([]);
    setLoadingFrames(true);
    setError("");
    try {
      setFrames(await fetchMovieBackdrops(film.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load frames.");
    } finally {
      setLoadingFrames(false);
    }
  }

  function addFrame(frame: MovieBackdrop) {
    if (!selected) return;
    setDraft(
      addToDraft({
        movieId: selected.id,
        title: selected.title,
        year: selected.year,
        backdrop_path: frame.file_path,
      }),
    );
  }

  function removeFrame(path: string) {
    setDraft(removeFromDraft(path));
  }

  const json = JSON.stringify(draft, null, 2);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function downloadJson() {
    const blob = new Blob([json], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "backdrops.json";
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-400 hover:text-white">
          ← Home
        </Link>
        <h1 className="text-lg font-semibold">Backdrop curation (dev)</h1>
        <div className="w-12" />
      </header>

      <p className="text-xs text-neutral-500">
        Search a film, pick a frame to add it to the homepage rotation, then
        Copy/Download the JSON and paste it into{" "}
        <code className="text-neutral-400">data/backdrops.json</code> and commit.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Search */}
      <form onSubmit={runSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a film…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500"
        >
          Search
        </button>
      </form>

      {films.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {films.slice(0, 12).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => selectFilm(f)}
              className={
                "rounded-full border px-3 py-1 text-sm transition-colors " +
                (selected?.id === f.id
                  ? "border-white bg-white text-neutral-900"
                  : "border-neutral-700 text-neutral-300 hover:border-neutral-500")
              }
            >
              {f.title}
              {f.year && ` (${f.year})`}
            </button>
          ))}
        </div>
      )}

      {/* Frames for the selected film */}
      {selected && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-300">
            Frames for {selected.title}
          </h2>
          {loadingFrames ? (
            <p className="text-sm text-neutral-500">Loading frames…</p>
          ) : frames.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No backdrop frames available for this film.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {frames.map((frame) => {
                const picked = chosen.has(frame.file_path);
                return (
                  <button
                    key={frame.file_path}
                    type="button"
                    onClick={() => addFrame(frame)}
                    disabled={picked}
                    className={
                      "relative overflow-hidden rounded border-2 transition-colors " +
                      (picked
                        ? "border-green-500"
                        : "border-transparent hover:border-neutral-500")
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${FRAME_BASE}${frame.file_path}`}
                      alt="backdrop frame"
                      className="aspect-video w-full object-cover"
                    />
                    {picked && (
                      <span className="absolute right-1 top-1 rounded-full bg-green-500 px-1.5 text-xs font-bold text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Current draft */}
      <section className="space-y-3 border-t border-neutral-800 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-300">
            Homepage rotation ({draft.length})
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyJson}
              disabled={draft.length === 0}
              className="rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:border-neutral-500 disabled:opacity-40"
            >
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <button
              type="button"
              onClick={downloadJson}
              disabled={draft.length === 0}
              className="rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:border-neutral-500 disabled:opacity-40"
            >
              Download
            </button>
          </div>
        </div>

        {draft.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nothing curated yet. Pick frames above.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {draft.map((b) => (
              <div
                key={b.backdrop_path}
                className="relative overflow-hidden rounded"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${PREVIEW_BASE}${b.backdrop_path}`}
                  alt={b.title}
                  className="aspect-video w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  {b.title}
                </div>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => removeFrame(b.backdrop_path)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600/90 text-xs font-bold text-white hover:bg-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
