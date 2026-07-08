"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FilmTile from "@/components/FilmTile";
import SharePanel from "@/components/SharePanel";
import { searchMovies } from "@/lib/search";
import {
  addFilmToCard,
  CARD_FILM_CAP,
  getCard,
  getTasteProfile,
  removeFilmFromCard,
  renameCard,
  type Card,
  type Film,
} from "@/lib/storage";

type AddMode = "taste" | "search";

export default function CardEditor({ id }: { id: string }) {
  const [card, setCard] = useState<Card | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");

  const [mode, setMode] = useState<AddMode>("taste");
  const [taste, setTaste] = useState<Film[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Film[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const c = getCard(id);
    if (c) {
      setCard(c);
      setName(c.name);
    }
    setTaste(getTasteProfile());
    setLoaded(true);
  }, [id]);

  const inCard = useMemo(
    () => new Set((card?.films ?? []).map((f) => f.id)),
    [card],
  );
  const atCap = (card?.films.length ?? 0) >= CARD_FILM_CAP;

  function persistName() {
    if (!card) return;
    const updated = renameCard(card.id, name);
    if (updated) setCard(updated);
  }

  function tryAdd(film: Film) {
    if (!card) return;
    const result = addFilmToCard(card.id, film);
    if (result.ok) {
      setCard(result.card);
      setNotice("");
    } else if (result.reason === "cap") {
      setNotice(
        `Card is full (${CARD_FILM_CAP} films max). Remove one to add another.`,
      );
    }
  }

  function remove(filmId: number) {
    if (!card) return;
    const updated = removeFilmFromCard(card.id, filmId);
    if (updated) {
      setCard(updated);
      setNotice("");
    }
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      setResults(await searchMovies(query));
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  if (loaded && !card) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 py-6 text-center">
        <p className="text-neutral-400">Card not found.</p>
        <Link
          href="/card"
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:border-neutral-500"
        >
          Back to my cards
        </Link>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500">Loading…</p>
      </main>
    );
  }

  const addable = mode === "taste" ? taste : results;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/card" className="text-sm text-neutral-400 hover:text-white">
          ← My Cards
        </Link>
        <span className="text-xs text-neutral-500">
          {card.films.length}/{CARD_FILM_CAP}
        </span>
      </header>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={persistName}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="Card name"
        className="w-full rounded-lg border border-neutral-800 bg-transparent px-3 py-2 text-xl font-bold outline-none focus:border-neutral-600"
      />

      {/* Films currently on the card */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-300">
          On this card
        </h2>
        {card.films.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No films yet. Add some from below.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {card.films.map((film) => (
              <FilmTile
                key={film.id}
                film={film}
                action={{
                  icon: "✕",
                  label: "Remove from card",
                  kind: "remove",
                  onClick: () => remove(film.id),
                }}
              />
            ))}
          </div>
        )}
      </section>

      {notice && (
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-300">
          {notice}
        </p>
      )}

      {/* Add films */}
      <section className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("taste")}
            className={
              "rounded-full px-3 py-1 text-sm " +
              (mode === "taste"
                ? "bg-white text-neutral-900"
                : "border border-neutral-700 text-neutral-300")
            }
          >
            From your taste
          </button>
          <button
            type="button"
            onClick={() => setMode("search")}
            className={
              "rounded-full px-3 py-1 text-sm " +
              (mode === "search"
                ? "bg-white text-neutral-900"
                : "border border-neutral-700 text-neutral-300")
            }
          >
            Search
          </button>
        </div>

        {mode === "search" && (
          <form onSubmit={runSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a film…"
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="shrink-0 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-40"
            >
              {searching ? "…" : "Go"}
            </button>
          </form>
        )}

        {mode === "taste" && taste.length === 0 && (
          <p className="text-sm text-neutral-500">
            Your taste profile is empty. Swipe some films on{" "}
            <Link href="/explore" className="underline">
              Explore
            </Link>{" "}
            first, or use Search.
          </p>
        )}

        {searchError && <p className="text-sm text-red-400">{searchError}</p>}

        {addable.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {addable.map((film) => {
              const already = inCard.has(film.id);
              return (
                <FilmTile
                  key={film.id}
                  film={film}
                  action={{
                    icon: already ? "✓" : "+",
                    label: already ? "Already on card" : "Add to card",
                    kind: "add",
                    disabled: already || atCap,
                    onClick: () => tryAdd(film),
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      <SharePanel card={card} />
    </main>
  );
}
