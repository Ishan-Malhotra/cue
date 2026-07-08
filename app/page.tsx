"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCuratedBackdrops, pickRandom, type Backdrop } from "@/lib/backdrops";

const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";

const ACTIONS = [
  { href: "/search", label: "search" },
  { href: "/explore", label: "explore" },
  { href: "/card", label: "share" },
];

export default function HomePage() {
  const [backdrops, setBackdrops] = useState<Backdrop[]>([]);

  // Fresh random selection on each page load (client-side so it varies per visit).
  useEffect(() => {
    setBackdrops(pickRandom(getCuratedBackdrops(), 2));
  }, []);

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2">
      {/* Left: branding + actions */}
      <div className="flex flex-col gap-10">
        <div>
          <h1 className="text-6xl font-black tracking-tight">cue</h1>
          <p className="mt-1 text-sm text-neutral-500">by ishan</p>
          <p className="mt-6 text-lg text-neutral-300">network - with cinema.</p>
        </div>

        <nav className="flex flex-col gap-4">
          {ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="w-48 bg-neutral-900 px-6 py-3 text-center text-lg font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              {a.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right: curated backdrop stack */}
      <div className="flex flex-col gap-4">
        {backdrops.length === 0 ? (
          <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-neutral-800 text-sm text-neutral-600">
            No backdrops curated yet — add some on{" "}
            <Link href="/dev" className="ml-1 underline">
              /dev
            </Link>
          </div>
        ) : (
          backdrops.map((b) => (
            <Link
              key={`${b.movieId}-${b.backdrop_path}`}
              href={`/movie/${b.movieId}`}
              className="group relative block overflow-hidden rounded-sm"
              title={b.title}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BACKDROP_BASE}${b.backdrop_path}`}
                alt={b.title}
                className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
