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

// The minimal film shape stored on a card and embedded in a shared payload.
export type Film = {
  id: number;
  title: string;
  year: string;
  poster_path: string | null;
};

// A user can have multiple named, editable cards (CLAUDE.md updated model).
export type Card = {
  id: string;
  name: string;
  films: Film[];
  createdAt: number;
  updatedAt: number;
};

// Per-card film cap (QR density limit) — enforced per card, not globally.
export const CARD_FILM_CAP = 25;

const KEYS = {
  taste: "tasteProfile",
  watchlist: "watchlist",
  prefs: "swipePrefs",
  cards: "cards",
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

// --- cards (multiple named, editable cards) ---------------------------------

export type AddFilmResult =
  | { ok: true; card: Card }
  | { ok: false; reason: "cap" | "duplicate" | "not_found"; card?: Card };

function newCardId(): string {
  return `card_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function toFilm(movie: {
  id: number;
  title: string;
  year: string;
  poster_path: string | null;
}): Film {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    poster_path: movie.poster_path,
  };
}

export function getCards(): Card[] {
  return read<Card[]>(KEYS.cards, []);
}

export function getCard(id: string): Card | undefined {
  return getCards().find((c) => c.id === id);
}

function writeCards(cards: Card[]): Card[] {
  write(KEYS.cards, cards);
  return cards;
}

export function createCard(name = "Untitled card"): Card {
  const now = Date.now();
  const card: Card = {
    id: newCardId(),
    name: name.trim() || "Untitled card",
    films: [],
    createdAt: now,
    updatedAt: now,
  };
  writeCards([...getCards(), card]);
  return card;
}

export function deleteCard(id: string): Card[] {
  return writeCards(getCards().filter((c) => c.id !== id));
}

// Apply a patch to one card, bumping updatedAt. Returns the updated card (or
// undefined if the id doesn't exist).
function mutateCard(
  id: string,
  fn: (card: Card) => Card,
): Card | undefined {
  const cards = getCards();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  const updated = { ...fn(cards[idx]), updatedAt: Date.now() };
  cards[idx] = updated;
  writeCards(cards);
  return updated;
}

export function renameCard(id: string, name: string): Card | undefined {
  return mutateCard(id, (c) => ({ ...c, name: name.trim() || c.name }));
}

export function addFilmToCard(
  id: string,
  movie: { id: number; title: string; year: string; poster_path: string | null },
): AddFilmResult {
  const card = getCard(id);
  if (!card) return { ok: false, reason: "not_found" };
  if (card.films.some((f) => f.id === movie.id)) {
    return { ok: false, reason: "duplicate", card };
  }
  if (card.films.length >= CARD_FILM_CAP) {
    return { ok: false, reason: "cap", card };
  }
  const updated = mutateCard(id, (c) => ({
    ...c,
    films: [...c.films, toFilm(movie)],
  }));
  return { ok: true, card: updated as Card };
}

export function removeFilmFromCard(
  id: string,
  filmId: number,
): Card | undefined {
  return mutateCard(id, (c) => ({
    ...c,
    films: c.films.filter((f) => f.id !== filmId),
  }));
}

// Fork a decoded shared card into the viewer's own collection as a brand-new
// card (new id + timestamps). Films are trimmed to the cap defensively.
export function saveSharedCardAsMine(shared: {
  name: string;
  films: Film[];
}): Card {
  const now = Date.now();
  const card: Card = {
    id: newCardId(),
    name: shared.name?.trim() || "Shared card",
    films: shared.films.slice(0, CARD_FILM_CAP),
    createdAt: now,
    updatedAt: now,
  };
  writeCards([...getCards(), card]);
  return card;
}
