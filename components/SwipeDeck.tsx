"use client";

import { useRef } from "react";
import TinderCard from "react-tinder-card";
import MovieCard from "./MovieCard";
import type { DiscoverMovie } from "@/lib/discover";

export type SwipeDir = "left" | "right" | "up" | "down";

// Minimal shape of the imperative API react-tinder-card exposes via ref.
type CardApi = {
  swipe: (dir?: SwipeDir) => Promise<void>;
  restoreCard: () => Promise<void>;
};

// How many cards to actually mount for the stacked look (top + a couple behind).
const RENDER_WINDOW = 3;

export default function SwipeDeck({
  deck,
  onSwipe,
  onCardLeftScreen,
}: {
  // deck[0] is the card currently on top.
  deck: DiscoverMovie[];
  onSwipe: (movie: DiscoverMovie, dir: SwipeDir) => void;
  onCardLeftScreen: (movie: DiscoverMovie) => void;
}) {
  const refs = useRef<Map<number, CardApi | null>>(new Map());

  const top = deck[0];

  async function triggerSwipe(dir: SwipeDir) {
    if (!top) return;
    const api = refs.current.get(top.id);
    if (api) await api.swipe(dir);
  }

  // Render only the front window; reverse so deck[0] paints on top (absolute
  // stacking = last DOM node wins).
  const rendered = deck.slice(0, RENDER_WINDOW).reverse();

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="relative aspect-[2/3] w-full max-w-xs">
        {rendered.map((movie) => (
          <TinderCard
            key={movie.id}
            ref={(el) => {
              refs.current.set(movie.id, el as unknown as CardApi | null);
            }}
            className="absolute inset-0"
            preventSwipe={["down"]}
            onSwipe={(dir) => onSwipe(movie, dir as SwipeDir)}
            onCardLeftScreen={() => {
              refs.current.delete(movie.id);
              onCardLeftScreen(movie);
            }}
          >
            <MovieCard movie={movie} />
          </TinderCard>
        ))}
      </div>

      {/* Button fallback for desktop / non-touch. Mirrors the swipe gestures. */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Skip"
          disabled={!top}
          onClick={() => triggerSwipe("left")}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-line text-2xl text-muted transition-colors hover:border-red-500 hover:text-red-500 disabled:opacity-40"
        >
          ✕
        </button>
        <button
          type="button"
          aria-label="Add to watchlist"
          disabled={!top}
          onClick={() => triggerSwipe("up")}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-xl text-muted transition-colors hover:border-sky-500 hover:text-sky-400 disabled:opacity-40"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Like"
          disabled={!top}
          onClick={() => triggerSwipe("right")}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-line text-2xl text-muted transition-colors hover:border-green-500 hover:text-green-400 disabled:opacity-40"
        >
          ♥
        </button>
      </div>

      <p className="text-xs text-muted">
        Swipe right to like · up for watchlist · left to skip
      </p>
    </div>
  );
}
