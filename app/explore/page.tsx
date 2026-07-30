"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import FilterChips from "@/components/FilterChips";
import SwipeDeck, {
  RENDER_WINDOW,
  type SwipeDir,
} from "@/components/SwipeDeck";
import {
  fetchDiscover,
  isGenreBiasActive,
  softResetStartPage,
  type DiscoverMovie,
  type Selection,
} from "@/lib/discover";
import { sortByTasteScore } from "@/lib/rank";
import {
  addToTasteProfile,
  addToWatchlist,
  applyTasteSignal,
  getSeenSet,
  getTasteModel,
  getTasteProfile,
  getWatchlist,
  type TasteModel,
} from "@/lib/storage";

const REFILL_AT = 5; // fetch more when fewer than this remain
const SOFT_RESET_EVERY = 8; // refresh candidate pool as the model shifts

type Status = "loading" | "ready" | "empty" | "error";

function seedSeen(model: TasteModel): Set<number> {
  const seen = getSeenSet(model);
  for (const m of getTasteProfile()) seen.add(m.id);
  for (const m of getWatchlist()) seen.add(m.id);
  return seen;
}

function reSortTail(
  deck: DiscoverMovie[],
  model: TasteModel,
): DiscoverMovie[] {
  if (deck.length <= RENDER_WINDOW) return deck;
  const head = deck.slice(0, RENDER_WINDOW);
  const tail = sortByTasteScore(deck.slice(RENDER_WINDOW), model);
  return [...head, ...tail];
}

export default function ExplorePage() {
  const [selection, setSelection] = useState<Selection>({
    genreIds: [],
    lang: null,
  });
  const [deck, setDeck] = useState<DiscoverMovie[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [personalizing, setPersonalizing] = useState(false);

  // Mutable bookkeeping that shouldn't trigger re-renders.
  const pageRef = useRef(1);
  const seenRef = useRef<Set<number>>(new Set());
  const modelRef = useRef<TasteModel>(getTasteModel());
  const loadingRef = useRef(false);
  const exhaustedRef = useRef(false);
  const reqRef = useRef(0); // ignore responses from superseded filter changes
  const deckRef = useRef<DiscoverMovie[]>([]);
  const swipesSinceResetRef = useRef(0);
  const softResetQueuedRef = useRef(false);

  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  const loadMore = useCallback(
    async (mode: "reset" | "append" | "soft") => {
      if (loadingRef.current) {
        if (mode === "soft") softResetQueuedRef.current = true;
        return;
      }
      if (mode === "append" && exhaustedRef.current) return;
      loadingRef.current = true;
      softResetQueuedRef.current = false;
      const reqId = ++reqRef.current;

      if (mode === "reset" || mode === "soft") {
        modelRef.current = getTasteModel();
        exhaustedRef.current = false;
        if (mode === "reset") {
          pageRef.current = 1;
          seenRef.current = seedSeen(modelRef.current);
          setStatus("loading");
          setError("");
        } else {
          // Soft: start past already-burned early pages of this query shape.
          pageRef.current = softResetStartPage(
            modelRef.current,
            seenRef.current.size,
          );
        }
        setPersonalizing(isGenreBiasActive(modelRef.current));
        swipesSinceResetRef.current = 0;
      }

      try {
        const added: DiscoverMovie[] = [];
        let attempts = 0;
        // Skip past pages that are fully filtered out (already seen).
        while (added.length === 0 && attempts < 4 && !exhaustedRef.current) {
          const batch = await fetchDiscover(
            selection,
            pageRef.current,
            modelRef.current,
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

        let next: DiscoverMovie[];
        if (mode === "reset") {
          next = added;
        } else if (mode === "soft") {
          // Keep staged head. If the refresh found nothing new, keep the
          // existing tail instead of truncating the deck to 3 cards.
          const head = deckRef.current.slice(0, RENDER_WINDOW);
          const headIds = new Set(head.map((m) => m.id));
          const fresh = added.filter((m) => !headIds.has(m.id));
          if (fresh.length === 0) {
            next = deckRef.current;
          } else {
            next = [...head, ...fresh];
          }
        } else {
          next = [...deckRef.current, ...added];
        }

        deckRef.current = next;
        setDeck(next);
        setStatus(next.length > 0 ? "ready" : "empty");
      } catch (e) {
        if (reqId !== reqRef.current) return;
        // Soft/append failures shouldn't nuke a still-usable deck.
        if (
          (mode === "soft" || mode === "append") &&
          deckRef.current.length > 0
        ) {
          setStatus("ready");
        } else {
          setError(e instanceof Error ? e.message : "Failed to load films.");
          setStatus("error");
        }
      } finally {
        loadingRef.current = false;
        if (softResetQueuedRef.current) {
          softResetQueuedRef.current = false;
          void loadMore("soft");
        }
      }
    },
    [selection],
  );

  // (Re)load whenever the filter selection changes (also runs on mount).
  useEffect(() => {
    void loadMore("reset");
  }, [loadMore]);

  // Refill the queue as it drains.
  useEffect(() => {
    if (
      status === "ready" &&
      deck.length < REFILL_AT &&
      !exhaustedRef.current &&
      !loadingRef.current
    ) {
      void loadMore("append");
    }
  }, [deck.length, status, loadMore]);

  const handleSwipe = useCallback(
    (movie: DiscoverMovie, dir: SwipeDir) => {
      if (dir === "down") return;

      const signal =
        dir === "right" ? "right" : dir === "up" ? "up" : "left";

      // Locked gesture meanings — right still writes tasteProfile; up still
      // writes watchlist. Left now trains the model (soft negative) without
      // entering tasteProfile.
      if (signal === "right") {
        addToTasteProfile(movie);
      } else if (signal === "up") {
        addToWatchlist(movie);
      }

      const model = applyTasteSignal(movie, signal);
      modelRef.current = model;
      seenRef.current.add(movie.id);
      setPersonalizing(isGenreBiasActive(model));

      // Re-sort only the not-yet-rendered tail — leave staged cards alone.
      // Do not remove `movie` here; onCardLeftScreen unmounts it after the
      // swipe animation so the card doesn't vanish mid-flight.
      setDeck((prev) => {
        const next = reSortTail(prev, model);
        deckRef.current = next;
        return next;
      });

      swipesSinceResetRef.current += 1;
      if (swipesSinceResetRef.current >= SOFT_RESET_EVERY) {
        void loadMore("soft");
      }
    },
    [loadMore],
  );

  const handleCardLeftScreen = useCallback((movie: DiscoverMovie) => {
    setDeck((prev) => {
      const next = prev.filter((m) => m.id !== movie.id);
      deckRef.current = next;
      return next;
    });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-fg">
          ← Home
        </Link>
        <h1 className="text-lg font-semibold">Explore</h1>
        <Link
          href="/search?from=explore"
          aria-label="Search films"
          title="Search films"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </Link>
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
              onClick={() => void loadMore("reset")}
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
          <div className="flex w-full flex-col items-center gap-3">
            <SwipeDeck
              deck={deck}
              onSwipe={handleSwipe}
              onCardLeftScreen={handleCardLeftScreen}
            />
            {personalizing && (
              <p className="text-xs text-muted">
                Personalizing from your swipes
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
