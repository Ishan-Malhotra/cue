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

// Asymmetric span pattern (class + cell area) cycled across the tile list.
const SPANS: { cls: string; cells: number }[] = [
  { cls: "col-span-2 row-span-2", cells: 4 },
  { cls: "col-span-1 row-span-1", cells: 1 },
  { cls: "col-span-1 row-span-2", cells: 2 },
  { cls: "col-span-2 row-span-1", cells: 2 },
  { cls: "col-span-1 row-span-1", cells: 1 },
  { cls: "col-span-2 row-span-2", cells: 4 },
  { cls: "col-span-1 row-span-1", cells: 1 },
  { cls: "col-span-1 row-span-1", cells: 1 },
  { cls: "col-span-2 row-span-1", cells: 2 },
  { cls: "col-span-1 row-span-2", cells: 2 },
  { cls: "col-span-1 row-span-1", cells: 1 },
  { cls: "col-span-2 row-span-2", cells: 4 },
  { cls: "col-span-1 row-span-1", cells: 1 },
  { cls: "col-span-2 row-span-1", cells: 2 },
];

type Tile = Backdrop & { span: string; key: string };

// Emit enough tiles (cycling + shuffling the curated set) to overflow the
// viewport, so the dense grid never leaves a trailing bottom-right gap.
function buildTiles(source: Backdrop[]): Tile[] {
  if (source.length === 0) return [];

  const w = window.innerWidth;
  const h = window.innerHeight;
  const cols = w >= 768 ? 6 : 4;
  const rowH = w >= 768 ? 150 : 110;
  const rowsNeeded = Math.ceil(h / rowH) + 2;
  const targetCells = cols * rowsNeeded;

  const shuffled = [...source];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const tiles: Tile[] = [];
  let cells = 0;
  let i = 0;
  while (cells < targetCells) {
    const b = shuffled[i % shuffled.length];
    const span = SPANS[i % SPANS.length];
    tiles.push({ ...b, span: span.cls, key: `${b.movieId}-${i}` });
    cells += span.cells;
    i++;
  }
  return tiles;
}

export default function HomePage() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const rebuild = () => setTiles(buildTiles(getCuratedBackdrops()));
    rebuild();
    setMounted(true);
    window.addEventListener("resize", rebuild);
    return () => window.removeEventListener("resize", rebuild);
  }, []);

  const empty = mounted && tiles.length === 0;

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Layer 1: full-bleed clickable collage */}
      <div className="absolute inset-0 grid h-full auto-rows-[110px] grid-cols-4 grid-flow-row-dense gap-[3px] md:auto-rows-[150px] md:grid-cols-6">
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

      {/* Layer 2: foreground — clicks fall through to the collage EXCEPT on the
          panel (pointer-events-auto). */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* subtle vignette for edge cohesion */}
        <div className="absolute inset-0 bg-gradient-to-r from-app/60 via-transparent to-transparent md:from-app/40" />

        {/* readable menu card with the toggle integrated in its header */}
        <div className="relative flex min-h-screen items-center">
          <div className="pointer-events-auto m-6 max-w-sm rounded-2xl bg-app/80 p-8 shadow-xl backdrop-blur-md md:m-12">
            <div className="flex items-start justify-between">
              <h1 className="text-6xl font-black tracking-tight text-fg">cue</h1>
              <ThemeToggle />
            </div>
            <p className="mt-1 text-sm text-muted">by ishan</p>
            <p className="mt-5 text-lg text-muted">network - with cinema.</p>

            <nav className="mt-8 flex flex-col gap-3">
              {ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="w-44 rounded-md bg-fg px-6 py-3 text-center text-lg font-semibold text-app transition-opacity hover:opacity-90"
                >
                  {a.label}
                </Link>
              ))}
            </nav>

            {empty && (
              <p className="mt-6 text-xs text-muted">
                No backdrops curated yet — add some on{" "}
                <Link href="/dev" className="underline">
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
