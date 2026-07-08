"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { getCuratedBackdrops, type Backdrop } from "@/lib/backdrops";

const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";

const ACTIONS = [
  { href: "/search", label: "search" },
  { href: "/explore", label: "explore" },
  { href: "/card", label: "share" },
];

// Asymmetric span pattern for the masonry — varied tile sizes, applied in order
// to the shuffled tile list.
const SPANS = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-2 row-span-1",
];

type Tile = Backdrop & { span: string; key: string };

function buildTiles(source: Backdrop[]): Tile[] {
  if (source.length === 0) return [];
  // Cycle the curated set up to the number of spans, then shuffle order so
  // repeats are spaced apart.
  const cycled: Backdrop[] = [];
  for (let i = 0; i < SPANS.length; i++) cycled.push(source[i % source.length]);
  for (let i = cycled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cycled[i], cycled[j]] = [cycled[j], cycled[i]];
  }
  return cycled.map((b, i) => ({
    ...b,
    span: SPANS[i],
    key: `${b.movieId}-${b.backdrop_path}-${i}`,
  }));
}

export default function HomePage() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [mounted, setMounted] = useState(false);

  // Build (and reshuffle) the collage on each load, client-side.
  useEffect(() => {
    setTiles(buildTiles(getCuratedBackdrops()));
    setMounted(true);
  }, []);

  const empty = mounted && tiles.length === 0;

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Layer 1: full-bleed clickable collage */}
      <div className="absolute inset-0 grid auto-rows-[110px] grid-cols-4 grid-flow-row-dense gap-[3px] md:auto-rows-[150px] md:grid-cols-6">
        {tiles.map((t) => (
          <Link
            key={t.key}
            href={`/movie/${t.movieId}`}
            title={t.title}
            className={`group relative overflow-hidden ${t.span}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${BACKDROP_BASE}${t.backdrop_path}`}
              alt={t.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] group-hover:brightness-110"
            />
          </Link>
        ))}
      </div>

      {/* Layer 2: foreground — pointer-events-none so clicks fall through to the
          collage, EXCEPT on the panel and toggle (pointer-events-auto). */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* subtle vignette for edge cohesion */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#f4efe6]/60 via-transparent to-transparent dark:from-neutral-950/70 md:from-[#f4efe6]/40 md:dark:from-neutral-950/50" />

        {/* theme toggle, unobtrusive top-right */}
        <div className="pointer-events-auto absolute right-4 top-4">
          <ThemeToggle />
        </div>

        {/* readable panel + content */}
        <div className="relative flex min-h-screen items-center">
          <div className="pointer-events-auto m-6 max-w-sm rounded-2xl bg-[#f4efe6]/80 p-8 shadow-xl backdrop-blur-md dark:bg-neutral-950/75 md:m-12">
            <h1 className="text-6xl font-black tracking-tight text-neutral-900 dark:text-white">
              cue
            </h1>
            <p className="mt-1 text-sm text-neutral-500">by ishan</p>
            <p className="mt-5 text-lg text-neutral-700 dark:text-neutral-300">
              network - with cinema.
            </p>

            <nav className="mt-8 flex flex-col gap-3">
              {ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="w-44 bg-neutral-900 px-6 py-3 text-center text-lg font-semibold text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
                >
                  {a.label}
                </Link>
              ))}
            </nav>

            {empty && (
              <p className="mt-6 text-xs text-neutral-500">
                No backdrops curated yet — add some on{" "}
                <Link href="/dev" className="pointer-events-auto underline">
                  /dev
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
