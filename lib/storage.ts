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

// Legacy right-swipe counters. Kept for one-shot migration into tasteModel.
export type SwipePrefs = {
  genres: Record<string, number>; // TMDB genre id -> right-swipe count
  langs: Record<string, number>; // language code -> right-swipe count
};

// Online taste model for /explore: signed genre/lang weights trained on
// left/right/up. Decay-then-delta keeps the latest swipe fully applied.
export type TasteModel = {
  genres: Record<string, number>;
  langs: Record<string, number>;
  seen: number[]; // FIFO of liked/skipped/watchlisted ids (persist as array)
  swipeCount: number;
  likeCount: number; // right-swipes only — gates genre bias activation
};

export type SwipeSignal = "left" | "right" | "up";

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

export const TASTE_DECAY = 0.98;
export const SEEN_CAP = 500;

// Per-swipe deltas applied after decay (see applyTasteSignal).
const DELTAS: Record<SwipeSignal, { genre: number; lang: number }> = {
  right: { genre: 1.0, lang: 1.0 },
  left: { genre: -0.6, lang: -0.4 },
  up: { genre: 0.3, lang: 0.3 },
};

const KEYS = {
  taste: "tasteProfile",
  watchlist: "watchlist",
  prefs: "swipePrefs",
  model: "tasteModel",
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

// Accepts any movie carrying the four stored fields (DiscoverMovie, MovieDetail,
// Film all satisfy this) — the swipe deck and the /movie/[id] binary toggle both
// use it.
export function addToWatchlist(movie: {
  id: number;
  title: string;
  year: string;
  poster_path: string | null;
}): WatchlistEntry[] {
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

export function removeFromWatchlist(id: number): WatchlistEntry[] {
  const next = getWatchlist().filter((m) => m.id !== id);
  write(KEYS.watchlist, next);
  return next;
}

export function isInWatchlist(id: number): boolean {
  return getWatchlist().some((m) => m.id === id);
}

// --- tasteModel (online signed weights for /explore) ------------------------

function emptyTasteModel(): TasteModel {
  return {
    genres: {},
    langs: {},
    seen: [],
    swipeCount: 0,
    likeCount: 0,
  };
}

function topNKeys(counts: Record<string, number>, n: number): string[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

// One-shot, one-directional: old top-2 genres / top-1 lang seed at +2.0 each.
function migrateFromSwipePrefs(): TasteModel | null {
  const prefs = read<SwipePrefs | null>(KEYS.prefs, null);
  if (!prefs) return null;
  if (
    Object.keys(prefs.genres ?? {}).length === 0 &&
    Object.keys(prefs.langs ?? {}).length === 0
  ) {
    return null;
  }

  const model = emptyTasteModel();
  for (const id of topNKeys(prefs.genres ?? {}, 2)) {
    model.genres[id] = 2.0;
  }
  const [lang] = topNKeys(prefs.langs ?? {}, 1);
  if (lang) model.langs[lang] = 2.0;

  const taste = getTasteProfile();
  const watch = getWatchlist();
  model.likeCount = taste.length;
  model.swipeCount = taste.length;
  model.seen = trimSeen([
    ...taste.map((m) => m.id),
    ...watch.map((m) => m.id),
  ]);

  write(KEYS.model, model);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(KEYS.prefs);
    } catch {
      // ignore
    }
  }
  return model;
}

function trimSeen(ids: number[]): number[] {
  if (ids.length <= SEEN_CAP) return ids;
  return ids.slice(ids.length - SEEN_CAP);
}

function pushSeen(seen: number[], id: number): number[] {
  const next = seen.filter((x) => x !== id);
  next.push(id);
  return trimSeen(next);
}

// Decay existing weights, then apply delta — never discount the latest swipe.
function decayThenAdd(
  weights: Record<string, number>,
  keys: string[],
  delta: number,
): void {
  for (const key of Object.keys(weights)) {
    weights[key] = weights[key] * TASTE_DECAY;
  }
  const unique = [...new Set(keys.filter(Boolean))];
  for (const key of unique) {
    weights[key] = (weights[key] ?? 0) + delta;
  }
}

export function getTasteModel(): TasteModel {
  const existing = read<TasteModel | null>(KEYS.model, null);
  if (existing) {
    return {
      genres: existing.genres ?? {},
      langs: existing.langs ?? {},
      seen: existing.seen ?? [],
      swipeCount: existing.swipeCount ?? 0,
      likeCount: existing.likeCount ?? 0,
    };
  }
  const migrated = migrateFromSwipePrefs();
  return migrated ?? emptyTasteModel();
}

export function getSeenSet(model: TasteModel = getTasteModel()): Set<number> {
  return new Set(model.seen);
}

export function applyTasteSignal(
  movie: SwipedMovie,
  signal: SwipeSignal,
): TasteModel {
  const model = getTasteModel();
  const { genre, lang } = DELTAS[signal];

  decayThenAdd(
    model.genres,
    movie.genre_ids.map(String),
    genre,
  );
  if (movie.original_language) {
    decayThenAdd(model.langs, [movie.original_language], lang);
  } else {
    // Still decay langs even when this film has no language signal.
    for (const key of Object.keys(model.langs)) {
      model.langs[key] = model.langs[key] * TASTE_DECAY;
    }
  }

  model.swipeCount += 1;
  if (signal === "right") model.likeCount += 1;
  model.seen = pushSeen(model.seen, movie.id);

  write(KEYS.model, model);
  return model;
}

export function getTopPositiveGenres(
  model: TasteModel = getTasteModel(),
  n = 2,
): string[] {
  return Object.entries(model.genres)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function getStrongNegativeGenres(
  model: TasteModel = getTasteModel(),
  threshold = -2,
  n = 2,
): string[] {
  return Object.entries(model.genres)
    .filter(([, w]) => w <= threshold)
    .sort((a, b) => a[1] - b[1])
    .slice(0, n)
    .map(([k]) => k);
}

// Language bias needs a clear margin: top weight > 2× second place.
export function getDominantLanguage(
  model: TasteModel = getTasteModel(),
): string | undefined {
  const ranked = Object.entries(model.langs)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return undefined;
  const [top, second] = ranked;
  if (!second) return top[0];
  if (top[1] > second[1] * 2) return top[0];
  return undefined;
}

/** @deprecated Prefer getTasteModel / applyTasteSignal. Kept for any stragglers. */
export function getSwipePrefs(): SwipePrefs {
  return read<SwipePrefs>(KEYS.prefs, { genres: {}, langs: {} });
}

/** @deprecated Prefer applyTasteSignal("right"). */
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

/** @deprecated Prefer getTopPositiveGenres / getDominantLanguage. */
export function getTopPrefs(prefs: SwipePrefs = getSwipePrefs()): {
  genreIds: string[];
  lang?: string;
} {
  const genreIds = topNKeys(prefs.genres, 2);
  const [lang] = topNKeys(prefs.langs, 1);
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
