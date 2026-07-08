"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import FilterChips from "@/components/FilterChips";
import SwipeDeck, { type SwipeDir } from "@/components/SwipeDeck";
import {
  fetchDiscover,
  type DiscoverMovie,
  type Selection,
} from "@/lib/discover";
import {
  addToTasteProfile,
  addToWatchlist,
  bumpSwipePrefs,
  getTasteProfile,
  getWatchlist,
} from "@/lib/storage";

const REFILL_AT = 5; // fetch more when fewer than this remain

type Status = "loading" | "ready" | "empty" | "error";

export default function ExplorePage() {
  const [selection, setSelection] = useState<Selection>({
    genreIds: [],
    lang: null,
  });
  const [deck, setDeck] = useState<DiscoverMovie[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  // Mutable bookkeeping that shouldn't trigger re-renders.
  const pageRef = useRef(1);
  const seenRef = useRef<Set<number>>(new Set());
  const tasteCountRef = useRef(0);
  const loadingRef = useRef(false);
  const exhaustedRef = useRef(false);
  const reqRef = useRef(0); // ignore responses from superseded filter changes
  const deckRef = useRef<DiscoverMovie[]>([]);

  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  const loadMore = useCallback(
    async (reset: boolean) => {
      if (loadingRef.current) return;
      if (!reset && exhaustedRef.current) return;
      loadingRef.current = true;
      const reqId = ++reqRef.current;

      if (reset) {
        pageRef.current = 1;
        exhaustedRef.current = false;
        // Never re-surface films the user already liked or watchlisted.
        seenRef.current = new Set([
          ...getTasteProfile().map((m) => m.id),
          ...getWatchlist().map((m) => m.id),
        ]);
        tasteCountRef.current = getTasteProfile().length;
        setStatus("loading");
        setError("");
      }

      try {
        const added: DiscoverMovie[] = [];
        let attempts = 0;
        // Skip past pages that are fully filtered out (already seen).
        while (added.length === 0 && attempts < 3 && !exhaustedRef.current) {
          const batch = await fetchDiscover(
            selection,
            tasteCountRef.current,
            pageRef.current,
          );
          if (reqId !== reqRef.current) return; // superseded
          pageRef.current += 1;
          attempts += 1;
          if (batch.length === 0) {
            exhaustedRef.current = true;
            break;
          }
          for (const m of batch) {
            if (!seenRef.current.has(m.id)) {
              seenRef.current.add(m.id);
              added.push(m);
            }
          }
        }

        if (reqId !== reqRef.current) return;
        const base = reset ? [] : deckRef.current;
        const next = [...base, ...added];
        deckRef.current = next;
        setDeck(next);
        setStatus(next.length > 0 ? "ready" : "empty");
      } catch (e) {
        if (reqId !== reqRef.current) return;
        setError(e instanceof Error ? e.message : "Failed to load films.");
        setStatus("error");
      } finally {
        loadingRef.current = false;
      }
    },
    [selection],
  );

  // (Re)load whenever the filter selection changes (also runs on mount).
  useEffect(() => {
    loadMore(true);
  }, [loadMore]);

  // Refill the queue as it drains.
  useEffect(() => {
    if (
      status === "ready" &&
      deck.length < REFILL_AT &&
      !exhaustedRef.current &&
      !loadingRef.current
    ) {
      loadMore(false);
    }
  }, [deck.length, status, loadMore]);

  const handleSwipe = useCallback((movie: DiscoverMovie, dir: SwipeDir) => {
    // Locked gesture meanings (CLAUDE.md) — do not reinterpret.
    if (dir === "right") {
      addToTasteProfile(movie);
      bumpSwipePrefs(movie.genre_ids, movie.original_language);
      tasteCountRef.current = getTasteProfile().length;
    } else if (dir === "up") {
      addToWatchlist(movie);
    }
    // left = skip: no storage write at all.
  }, []);

  const handleCardLeftScreen = useCallback((movie: DiscoverMovie) => {
    setDeck((prev) => prev.filter((m) => m.id !== movie.id));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-fg">
          ← Home
        </Link>
        <h1 className="text-lg font-semibold">Explore</h1>
        <div className="w-12" />
      </header>

      <FilterChips selection={selection} onChange={setSelection} />

      <div className="flex flex-1 items-center justify-center pt-2">
        {status === "loading" && (
          <p className="text-muted">Loading films…</p>
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => loadMore(true)}
              className="mt-3 rounded-full border border-line px-4 py-1 text-sm hover:border-muted"
            >
              Retry
            </button>
          </div>
        )}

        {status === "empty" && (
          <p className="max-w-xs text-center text-muted">
            No more films for this filter. Try different genres or languages.
          </p>
        )}

        {status === "ready" && (
          <SwipeDeck
            deck={deck}
            onSwipe={handleSwipe}
            onCardLeftScreen={handleCardLeftScreen}
          />
        )}
      </div>
    </main>
  );
}
