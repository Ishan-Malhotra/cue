"use client";

import { useRef } from "react";
import type { DiscoverMovie } from "@/lib/discover";
import { genreName } from "@/lib/genres";

const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const TAP_MOVE_PX = 10;
const TAP_MAX_MS = 400;

export default function MovieCard({
  movie,
  onOpen,
}: {
  movie: DiscoverMovie;
  /** Fires on a real tap (not a swipe). Only pass for the top card. */
  onOpen?: () => void;
}) {
  const genres = movie.genre_ids
    .map(genreName)
    .filter(Boolean)
    .slice(0, 3) as string[];

  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (!onOpen) return;
    tapRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!onOpen || !tapRef.current) return;
    const { x, y, t } = tapRef.current;
    tapRef.current = null;
    const dx = Math.abs(e.clientX - x);
    const dy = Math.abs(e.clientY - y);
    if (dx > TAP_MOVE_PX || dy > TAP_MOVE_PX) return;
    if (Date.now() - t > TAP_MAX_MS) return;
    onOpen();
  }

  function onPointerCancel() {
    tapRef.current = null;
  }

  return (
    <div
      className={
        "relative h-full w-full select-none overflow-hidden rounded-2xl bg-surface-2 shadow-2xl " +
        (onOpen ? "cursor-pointer" : "")
      }
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      role={onOpen ? "link" : undefined}
      aria-label={onOpen ? `Open ${movie.title}` : undefined}
    >
      {movie.poster_path ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${IMG_BASE}${movie.poster_path}`}
          alt={movie.title}
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-6 text-center text-muted">
          {movie.title}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-bold leading-tight text-white">
            {movie.title}
          </h2>
          {movie.year && (
            <span className="text-sm text-neutral-300">{movie.year}</span>
          )}
        </div>
        {genres.length > 0 && (
          <p className="mt-1 text-xs uppercase tracking-wide text-neutral-400">
            {genres.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
