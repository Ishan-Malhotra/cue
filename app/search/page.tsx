"use client";

import { useState } from "react";
import Link from "next/link";
import FilmTile from "@/components/FilmTile";
import { searchMovies } from "@/lib/search";
import type { Film } from "@/lib/storage";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Film[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus("searching");
    setError("");
    try {
      setResults(await searchMovies(query));
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-fg">
          ← Home
        </Link>
        <h1 className="text-lg font-semibold">Search</h1>
        <div className="w-12" />
      </header>

      <form onSubmit={run} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="Search for a film…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-muted"
        />
        <button
          type="submit"
          disabled={status === "searching"}
          className="shrink-0 rounded-lg border border-line px-4 py-2 text-sm text-fg hover:border-muted disabled:opacity-40"
        >
          {status === "searching" ? "…" : "Go"}
        </button>
      </form>

      {status === "error" && <p className="text-sm text-red-500">{error}</p>}

      {status === "done" && results.length === 0 && (
        <p className="text-sm text-muted">No films found.</p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {results.map((film) => (
            <Link key={film.id} href={`/movie/${film.id}`}>
              <FilmTile film={film} />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
