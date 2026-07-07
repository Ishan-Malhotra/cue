// localStorage layer for Phase A. Everything lives client-side — no accounts,
// no server DB. Schema matches CLAUDE.md exactly. All reads/writes are guarded
// against SSR (typeof window) so these helpers are import-safe anywhere.

export type TasteEntry = {
  id: number;
  title: string;
  year: string;
  poster_path: string | null;
  likedAt: number;
};

export type WatchlistEntry = {
  id: number;
  title: string;
  year: string;
  poster_path: string | null;
};

export type SwipePrefs = {
  genres: Record<string, number>; // TMDB genre id -> right-swipe count
  langs: Record<string, number>; // language code -> right-swipe count
};

// A movie as we need it to record a swipe — the fields we read off a TMDB
// discover result.
export type SwipedMovie = {
  id: number;
  title: string;
  year: string;
  poster_path: string | null;
  genre_ids: number[];
  original_language: string;
};

const KEYS = {
  taste: "tasteProfile",
  watchlist: "watchlist",
  prefs: "swipePrefs",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota/serialization failures are non-fatal for Phase A.
  }
}

// --- tasteProfile (right swipe) ---------------------------------------------

export function getTasteProfile(): TasteEntry[] {
  return read<TasteEntry[]>(KEYS.taste, []);
}

export function addToTasteProfile(movie: SwipedMovie): TasteEntry[] {
  const list = getTasteProfile();
  if (list.some((m) => m.id === movie.id)) return list;
  const entry: TasteEntry = {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    poster_path: movie.poster_path,
    likedAt: Date.now(),
  };
  const next = [...list, entry];
  write(KEYS.taste, next);
  return next;
}

// --- watchlist (up swipe) ---------------------------------------------------

export function getWatchlist(): WatchlistEntry[] {
  return read<WatchlistEntry[]>(KEYS.watchlist, []);
}

export function addToWatchlist(movie: SwipedMovie): WatchlistEntry[] {
  const list = getWatchlist();
  if (list.some((m) => m.id === movie.id)) return list;
  const entry: WatchlistEntry = {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    poster_path: movie.poster_path,
  };
  const next = [...list, entry];
  write(KEYS.watchlist, next);
  return next;
}

// --- swipePrefs (weighted counters, bumped on right swipe) ------------------

export function getSwipePrefs(): SwipePrefs {
  return read<SwipePrefs>(KEYS.prefs, { genres: {}, langs: {} });
}

export function bumpSwipePrefs(genreIds: number[], lang: string): SwipePrefs {
  const prefs = getSwipePrefs();
  for (const id of genreIds) {
    const key = String(id);
    prefs.genres[key] = (prefs.genres[key] ?? 0) + 1;
  }
  if (lang) {
    prefs.langs[lang] = (prefs.langs[lang] ?? 0) + 1;
  }
  write(KEYS.prefs, prefs);
  return prefs;
}

// Top-weighted picks used to bias future /discover calls. Simple counter sort,
// NOT a recommendation model (per CLAUDE.md constraint).
export function getTopPrefs(prefs: SwipePrefs = getSwipePrefs()): {
  genreIds: string[];
  lang?: string;
} {
  const topN = (counts: Record<string, number>, n: number): string[] =>
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);

  const genreIds = topN(prefs.genres, 2);
  const [lang] = topN(prefs.langs, 1);
  return { genreIds, lang };
}
