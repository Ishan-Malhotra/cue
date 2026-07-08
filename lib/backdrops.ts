// Homepage backdrop curation.
//
// Source of truth for what the homepage shows = the committed data/backdrops.json
// file (Phase A has no server DB). The /dev page is an authoring tool that keeps
// a working draft in localStorage and exports JSON to paste into that file.

import curated from "@/data/backdrops.json";

export type Backdrop = {
  movieId: number;
  title: string;
  year: string;
  backdrop_path: string;
};

// --- committed list (read by the homepage) ----------------------------------

export function getCuratedBackdrops(): Backdrop[] {
  return curated as Backdrop[];
}

// Fisher–Yates-ish random subset. Math.random is fine in app code (this only
// runs client-side on page load).
export function pickRandom<T>(list: T[], n: number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// --- /dev working draft (localStorage) ---------------------------------------

const DRAFT_KEY = "backdropDraft";

function readDraft(): Backdrop[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Backdrop[];
  } catch {
    return [];
  }
}

function writeDraft(list: Backdrop[]): Backdrop[] {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(list));
    } catch {
      /* non-fatal */
    }
  }
  return list;
}

// Seed the draft from the committed file the first time /dev is opened.
export function getDraft(): Backdrop[] {
  if (typeof window === "undefined") return getCuratedBackdrops();
  const existing = window.localStorage.getItem(DRAFT_KEY);
  if (existing === null) return writeDraft(getCuratedBackdrops());
  return readDraft();
}

export function addToDraft(entry: Backdrop): Backdrop[] {
  const list = readDraft();
  // One frame per (movie, backdrop) pair; allow multiple frames from one film.
  if (
    list.some(
      (b) => b.movieId === entry.movieId && b.backdrop_path === entry.backdrop_path,
    )
  ) {
    return list;
  }
  return writeDraft([...list, entry]);
}

export function removeFromDraft(backdropPath: string): Backdrop[] {
  return writeDraft(readDraft().filter((b) => b.backdrop_path !== backdropPath));
}

// --- images proxy (for the /dev picker) --------------------------------------

export type MovieBackdrop = { file_path: string; aspect_ratio: number };

export async function fetchMovieBackdrops(
  id: string | number,
): Promise<MovieBackdrop[]> {
  const res = await fetch(
    `/api/tmdb/movie/${encodeURIComponent(String(id))}/images`,
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Failed to load frames (${res.status})`);
  }
  const backdrops: MovieBackdrop[] = data.backdrops ?? [];
  return backdrops;
}
