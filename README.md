# Cue — Taste Card

A free, no-login website where you build a personal movie taste profile by swiping through
films, then curate one or more **named, editable cards** (e.g. a general taste card, or a
friend-specific one) and share any of them instantly via QR code, link, or the native share
sheet (WhatsApp/Instagram/etc.). No account needed to view a shared card, no server-side
database, zero cost to build or use.

> **Phase A** (current): swipe deck → cards → share, all client-side (`localStorage`).
> Phase B (accounts, database, friend "blend") is future work and intentionally not started.

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** v3
- **react-tinder-card** for swipe gesture physics
- **lz-string** for compressing a card into the share URL's `?d=` payload
- **qrcode** for client-side QR generation (no external QR API)
- Sharing via `navigator.share()` first, falling back to link + QR + copy
- **Light/dark theming** via CSS-variable tokens + a `class`-based toggle, persisted in
  `localStorage` (default dark cinema, warm-paper light)
- TMDB accessed **only** through server-side proxy routes (`/api/tmdb/*`) — the API key never
  reaches the client, and proxying keeps the app working where TMDB's domains are ISP-blocked
- Deploys to **Vercel** free tier

## Progress

### ✅ Step 1 — Scaffold + TMDB proxy routes
- Next.js + Tailwind + TypeScript scaffold with a placeholder home page linking to the three
  main screens.
- Three server-side TMDB proxy routes, all reading `TMDB_API_KEY` from env (server-only):
  - `GET /api/tmdb/trending` — `?window=day|week` (default `week`)
  - `GET /api/tmdb/search` — requires `?query=`, optional `?page=`
  - `GET /api/tmdb/discover` — safelisted params (`with_genres`, `with_original_language`,
    `sort_by`, `page`)
- Shared `tmdbFetch` helper ([lib/tmdb.ts](lib/tmdb.ts)) supporting a TMDB v3 API key or v4 read
  token, with a short revalidate cache.

### ✅ Step 2 — `/explore` (filter chips + swipe deck + taste model)
- Genre (multi-select, OR) and language (single-select) filter chips.
- Swipeable film deck (`react-tinder-card`) pulling cards from `/api/tmdb/discover`, with
  desktop like / watchlist / skip buttons as a fallback.
- **Tap the top card** to open `/movie/[id]` (swipes still work; only a short stationary tap navigates).
- Header **search** icon → `/search?from=explore`.
- **Locked swipe gestures** wired to `localStorage`:
  - **Right** = like → append to `tasteProfile` + train `tasteModel`
  - **Left** = skip → soft-negative train on `tasteModel` (no `tasteProfile` write)
  - **Up** = add to `watchlist` + mild positive train
  - _(No fourth direction; card curation is a separate action on `/card/[id]`.)_
- **`tasteModel`** — signed genre/lang weights with decay-then-delta updates
  (`w = w * 0.98 + delta`). Genre bias after 5 swipes + ≥1 like; language bias
  later (10 swipes + clear margin). New batches are scored/reordered; only the
  not-yet-rendered deck tail reshuffles so staged cards stay stable.
- Manually selected chips still win per dimension; unselected dimensions fall
  back to the model. Legacy `swipePrefs` migrates once into `tasteModel`.

### ✅ Step 3 — Cards: list, editor, share & shared view
The card model is **multiple named, editable cards** (not a single card).
- **`/card`** — list of the user's cards (name, film count, poster preview) with Edit / Share /
  Delete actions and a **+ New card** button.
- **`/card/[id]`** — single-card editor:
  - Rename the card.
  - Add films **from your taste profile** (grid picker) or via **inline TMDB search** (through
    the `/api/tmdb/search` proxy) for a film you haven't swiped.
  - Remove films.
  - **Per-card cap of 25 films**, enforced with a clear on-screen message (never a silent
    failure).
  - **Share panel**: `navigator.share()` first (native sheet → WhatsApp/Instagram/etc.), with a
    visible link + QR code + copy button as fallback.
- **`/card/[id]?d=<compressed>`** — read-only shared view, decoded **entirely** from the URL
  payload; never calls TMDB. Includes a **"Save this as mine"** button that forks the card into
  the viewer's own collection.

### ✅ Step 4 — Home, `/movie/[id]`, `/search` & curated-backdrop `/dev` tool
- **`/`** — `cue` branding + `search`/`explore`/`share` buttons, plus a rotating set of curated
  movie backdrops (fresh random selection each load), each clickable through to `/movie/[id]`.
- **`/movie/[id]`** — full-bleed detail page: backdrop + poster, title, year/runtime/director,
  genres, scrollable cast, **Like / Skip / Watchlist**, then summary. Like/skip train
  `tasteModel` the same way as explore; watchlist stays a private staging list.
  Detail fetch uses `append_to_response=credits` via `/api/tmdb/movie/[id]`.
- **`/search`** — typeahead suggestions while typing; results are clickable posters →
  `/movie/[id]`, with ♥ / ✕ actions to train taste without leaving search. Reachable from
  home or explore (`?from=explore`).
- **`/dev`** — a developer curation tool: search a film, browse its actual backdrop frames, pick
  ones for the homepage, and Copy/Download the JSON to commit into `data/backdrops.json`
  (the committed source of truth for the homepage collage — no server DB).
- Proxy routes `GET /api/tmdb/movie/[id]` (detail + credits) and `/api/tmdb/movie/[id]/images`.

### ✅ Step 5 — Home redesign + site-wide light/dark theme
- **`/`** rebuilt as a **full-bleed masonry collage** of the curated backdrops (varied tiles,
  tight gaps, sized to fill the viewport and reflow on resize). Branding/buttons sit on a
  readable glass panel; click targets for the panel and the collage are kept separate.
- **Light/dark toggle** (lightbulb icon) integrated into the menu card, persisted in
  `localStorage` and applied globally before paint (no flash), synced across tabs.
- **Semantic color tokens** (`app`/`surface`/`fg`/`muted`/`line`, defined as CSS variables in
  [app/globals.css](app/globals.css) and mapped in `tailwind.config.ts`) drive **every screen**
  so the whole app is correct in both themes.

### ✅ Step 6 — Explore taste model + search/movie polish
- Local online `tasteModel` (left trains too), discover bias + client re-rank, soft-reset
  refreshes, resilient TMDB retries.
- Explore → search entry, movie-page like/skip, tap-card-to-detail, search typeahead.

### ⬜ Upcoming
- `/taste` — grid/browse view of `tasteProfile` (reference only; does not edit cards)
- Optional card **reorder** on `/card/[id]` (listed in the spec; not yet built)
- Real-phone test of swipe + QR scan flow after Vercel deploy

## Data model (`localStorage`, Phase A)

| Key            | Written by                          | Purpose                                                       |
| -------------- | ----------------------------------- | ------------------------------------------------------------- |
| `tasteProfile` | right swipe / search♥ / movie Like  | Full history of liked films                                   |
| `watchlist`    | up swipe / movie Watchlist          | Private "want to watch" list                                  |
| `cards`        | `/card`, `/card/[id]`               | Multiple named, editable cards (`{id,name,films[],…}`); each card's `films` capped at 25. Only a card is ever shared/QR'd, one at a time. |
| `tasteModel`   | left/right/up (+ search/movie)      | Signed genre/lang weights biasing + ranking `/explore`        |

See [lib/storage.ts](lib/storage.ts) for the exact shapes.

## Getting started

```bash
npm install

# TMDB credential — server-side only (v3 API key or v4 read token)
cp .env.example .env.local
# then edit .env.local and set TMDB_API_KEY=<your key>

npm run dev        # http://localhost:3000
```

Quick proxy check:

```bash
curl 'http://localhost:3000/api/tmdb/trending'
curl 'http://localhost:3000/api/tmdb/search?query=inception'
curl 'http://localhost:3000/api/tmdb/discover?with_genres=28&sort_by=popularity.desc'
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Project structure

```
app/
  layout.tsx               root layout + pre-paint theme script
  globals.css              Tailwind + theme tokens (light/dark CSS variables)
  page.tsx                 home: full-bleed backdrop collage + menu card + theme toggle
  explore/page.tsx         swipe deck + filter chips
  search/page.tsx          typeahead search → ♥/✕ + /movie/[id]
  movie/[id]/page.tsx      film detail (cast, like/skip/watchlist, summary)
  card/page.tsx            list of the user's cards
  card/[id]/page.tsx       card editor, or shared read-only view when ?d= is present
  dev/page.tsx             backdrop curation tool (exports data/backdrops.json)
  api/tmdb/{trending,search,discover}/route.ts       server-side TMDB proxies
  api/tmdb/movie/[id]/route.ts, .../images/route.ts  movie detail + backdrop frames
components/                FilterChips, SwipeDeck, MovieCard, FilmTile, CardEditor,
                           SharePanel, SharedCardView, ThemeToggle, ThemeSync
data/
  backdrops.json           committed curated homepage backdrops (source of truth)
lib/
  tmdb.ts                  server-only TMDB fetch helper
  storage.ts               localStorage layer (tasteProfile / watchlist / cards / tasteModel)
  genres.ts                static genre + language lists
  discover.ts              builds the discover query (chips + tasteModel bias)
  rank.ts                  scores discover candidates against tasteModel
  search.ts                client helper for inline TMDB search
  movie.ts                 client helper for /movie/[id] detail
  backdrops.ts             curated-backdrop read + /dev draft helpers
  share.ts                 encode/decode a card into the ?d= payload + build share URL
```
