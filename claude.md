Project: Taste Card

One-sentence definition

A free, no-login-required (Phase A) website where you build a personal movie taste profile by swiping through films, then curate one or more named, editable "cards" (e.g. a general taste card, or a personalized one for a specific friend) and share any of them instantly via a QR code, link, or native share sheet (WhatsApp/Instagram/etc.) — no account required to view a shared card, no server-side database in Phase A, zero cost to build or use.

Current phase

Phase A — swipe deck + card + share, localStorage only.
Phase B (accounts, database, "blend" feature with friends) is future work — do not build toward it yet, see Out of Scope below.


Screens (eight total)


/ — landing/home page. Structure (visual design still in flux, do not lock in exact mockup styling): app name/branding, tagline, three primary entry actions — Search, Explore (→ /explore), Share / My Taste Profile (→ /card). Alongside/around these, a rotating display of curated movie backdrops (data/backdrops.json), refreshed each time the page loads. Clicking a backdrop navigates to that film's /movie/[id] page.
/explore — genre + language filter chips at top, swipeable film deck below. Tap the top card → /movie/[id]. Magnifying-glass header link → /search?from=explore. Left/right/up train tasteModel (see schema).
/movie/[id] — full-bleed film page: backdrop + poster, title, year/runtime/director, genres, cast row, Like / Skip / Watchlist actions, then summary. Like → tasteProfile + tasteModel; Skip → tasteModel only; Watchlist → watchlist (+ mild up signal). Reached from home backdrops, explore tap, or search.
/search — typeahead suggestions while typing; result posters link to /movie/[id]; ♥ / ✕ on tiles train taste the same as explore. Can be opened from home or explore.
/taste — grid view of everything in tasteProfile (all liked films). Read/reference source for building cards — does not write to any card itself.
/card — list of the user's cards (multiple, named, e.g. "My taste," "Horror picks for Amit"). Each entry shows name, film-count preview, edit + share actions, plus a "+ New card" button.
/card/[id] — editable view of a single card: rename it, add films (from tasteProfile primarily, or via inline TMDB search for a film not yet swiped), remove films, reorder. Share panel here: tries navigator.share() first (native share sheet — WhatsApp/Instagram/etc. if installed, mobile-first), falls back to a visible link + QR + copy button when Web Share isn't supported. Per-card cap ~20-25 films.
/card/[id]?d=<compressed> — implemented as the same card/[id]/page.tsx route: when a ?d= param is present, it renders as a read-only shared view decoded entirely from the URL param, instead of the normal editor. Has a "save this as mine" (fork) button, which copies the card into the viewer's own cards collection. This path must never call TMDB or any API — it renders purely from the decoded payload.


Note on visual design: the home page mockup discussed with the user (dark image stack on one side, black CTA buttons on the other, "cue" wordmark) is a rough structural sketch, not a locked design — font, colors, and layout are all still undecided. Build to the structure above; don't treat mockup-specific styling (exact fonts, exact button shapes) as a spec.


Data schema (localStorage only, Phase A)

tasteProfile: [
  { id, title, year, poster_path, likedAt }
]
// Everything liked (right swipe / search♥ / movie Like). Full history. Feeds
// tasteModel. Not shown/shared as-is.

watchlist: [
  { id, title, year, poster_path }
]
// Swipe up. Private "want to watch" staging list. Not shared.

cards: [
  {
    id,            // unique string, e.g. "card_" + random/timestamp
    name,          // user-editable, e.g. "My taste", "Horror picks for Amit"
    films: [ { id, title, year, poster_path } ],   // capped ~20-25 per card
    createdAt,
    updatedAt
  }
]
// A user can have multiple named, editable cards. Each is built on /card/[id]
// primarily from tasteProfile, but films can also be added via inline TMDB
// search (for a friend-specific pick not yet swiped). This is the ONLY
// data that gets shared/QR'd, one card at a time. Cap each card's `films`
// at ~20-25 entries (QR density limit) — enforced per card, not globally.

swipePrefs: {
  genres: { "28": 12, "35": 4 },  // legacy — migrated once into tasteModel
  langs: { "en": 20, "hi": 8 }
}
// DEPRECATED for explore bias. One-shot migrate: top-2 genres + top-1 lang
// each seed at +2.0 into tasteModel, then the key is removed.

tasteModel: {
  genres: { "28": 4.2, "35": -1.1 }, // signed weights (like +, skip -)
  langs: { "en": 3.0, "hi": 0.4 },
  seen: [123, 456],                  // FIFO, capped at 500
  swipeCount: 12,
  likeCount: 5                       // right-swipes only
}
// Online taste model for /explore (localStorage only — still no accounts/DB).
// Update rule (order matters): weights[k] = weights[k] * 0.98 + delta
//   right: genre +1.0, lang +1.0
//   left:  genre -0.6, lang -0.4   (trains model; does NOT write tasteProfile)
//   up:    genre +0.3, lang +0.3   (also writes watchlist)
// With decay 0.98, weights asymptote to ~50× the per-swipe delta (always-liked
// genre ≈ +50, always-skipped ≈ -30). They look unbounded early; they are not.
// Genre bias activates at swipeCount >= 5 AND likeCount >= 1.
// Language bias activates at swipeCount >= 10 AND top lang > 2× second place.
// Discover uses with_genres joined by "|" (OR). Thin pages (< ~8 results)
// retry once without without_genres before touching with_genres.


Swipe gesture meanings (locked — do not reinterpret)


Right = liked → append to tasteProfile, applyTasteSignal("right")
Left = skip → applyTasteSignal("left") only (soft negative; no tasteProfile write)
Up = add to watchlist + applyTasteSignal("up")
There is no swipe gesture for adding to a card. Card curation is a deliberate, separate action that happens on /card/[id], never inside the swipe deck. Do not add a fourth swipe direction for this. /taste is a reference/browse screen for tasteProfile, not itself a card-editing surface.



Hard constraints


All TMDB requests go through server-side proxy routes — /api/tmdb/search, /api/tmdb/trending, /api/tmdb/discover. Never call TMDB directly from client components. Reason: TMDB's domains are intermittently blocked by Indian ISPs (Jio especially); proxying through Vercel's servers makes the block invisible to end users. This is a reliability requirement, not a style preference — don't "simplify" it back to direct client calls.
The shared card view must be fully self-contained. All data needed to render it (name, films: title/year/poster_path) must be embedded in the compressed URL payload itself — never re-fetched from TMDB on load. This is what makes viewing a shared card free and fast regardless of TMDB availability.
No accounts, no server database, no login in Phase A. Everything lives in localStorage. Do not suggest or scaffold auth/database code in this phase.
Use lz-string to compress a single card's {name, films} into the share URL's ?d= param, and the qrcode npm package to render a QR from that URL client-side. No external QR API calls.
Cap each card's films at ~20-25 — keeps QR density scannable. Enforce this as a UI limit on /card/[id] when adding films, with a clear message (not a silent failure) when the cap is hit.
Sharing uses navigator.share() first (covers WhatsApp/Instagram/etc. via the native share sheet on mobile), falling back to a visible link + QR + copy button when Web Share isn't supported (typically desktop). Don't build separate per-platform integrations.
/card/[id] may call /api/tmdb/search for the inline "add a film not in your taste profile" flow — same server-side proxy rule as everywhere else applies.
/movie/[id]'s page has like (→ tasteProfile + tasteModel), skip (→ tasteModel soft-negative), and a binary watchlist toggle. Like/skip train the same explore model as the swipe deck; watchlist remains a private staging list.
Home page backdrops: fetch a rotating set from a TMDB endpoint suited to "iconic/popular" (e.g. /trending/movie/week or /movie/popular, via the existing /api/tmdb/trending proxy or a similar one), each backdrop links to /movie/[id] using that film's TMDB id. Refresh selection on each page load — no need to persist which backdrops were shown.



Tech stack


Next.js (App Router), Tailwind CSS
react-tinder-card (or equivalent) for swipe deck gesture physics — don't hand-roll drag physics
lz-string for URL payload compression
qrcode for client-side QR generation
Hosting: Vercel free tier (API routes needed for the TMDB proxy, so not a pure static export)
TMDB API key stored server-side only, as TMDB_API_KEY env var — never exposed to the client



Out of scope for Phase A (do not build, do not suggest)


Login / Google sign-in / any auth
Server-side database (Supabase or otherwise)
The "blend" feature (combining two people's profiles/watchlists)
Mood tags, folders, or playlists on saved films
Cross-device sync
Native Android app (PWA installability manifest can wait too — not needed for MVP)
Any actual neural/embedding recommendation model — tasteModel is a local
online weighted scorer (decay-then-delta), not ML, and should stay that way
until a deliberate Phase B redesign.



Progress


✅ Step 1 — Scaffold + TMDB proxy routes. Next.js + Tailwind + TypeScript. lib/tmdb.ts shared fetch helper (v3 key or v4 token, short revalidate cache). Three proxies: /api/tmdb/{trending,search,discover}. Verified via curl — real TMDB data, no client-side key leak.
✅ Step 2 — /explore. Filter chips + swipe deck. Gestures: right → tasteProfile + tasteModel, left → tasteModel soft-negative, up → watchlist + mild tasteModel. Online tasteModel biases discover + ranks batches; tap top card → /movie/[id]; search icon → /search?from=explore.
✅ Step 3 — Cards (list, editor, share, shared view). /card lists all cards. /card/[id] editor + share panel + shared ?d= view with fork.
✅ Step 4 — Home collage, /movie/[id] (cast + like/skip/watchlist + summary), /search (typeahead + ♥/✕ + clickable results), /dev backdrop curation.
✅ Step 5 — Full-bleed home redesign + site-wide light/dark theme tokens.
⬜ /taste — grid/browse view of tasteProfile (reference only, not yet built)
⬜ Card reorder on /card/[id] (in spec, not yet built)
⬜ Real-phone test of swipe deck + QR scan flow on Vercel deploy


Actual project structure

app/
  page.tsx                 home: full-bleed backdrop collage + menu card + theme toggle
  explore/page.tsx         swipe deck + filter chips + tasteModel wiring
  search/page.tsx          typeahead search → ♥/✕ + /movie/[id]
  movie/[id]/page.tsx      film detail (cast, like/skip/watchlist, summary)
  card/page.tsx            list of the user's cards
  card/[id]/page.tsx       card editor, OR shared read-only view when ?d= is present
  dev/page.tsx             backdrop curation tool
  api/tmdb/{trending,search,discover}/route.ts   server-side TMDB proxies
  api/tmdb/movie/[id]/route.ts, .../images/route.ts
components/                FilterChips, SwipeDeck, MovieCard, FilmTile,
                           CardEditor, SharePanel, SharedCardView, ThemeToggle, ThemeSync
data/
  backdrops.json           curated homepage backdrops
lib/
  tmdb.ts                  server-only TMDB fetch helper
  storage.ts               localStorage layer (tasteProfile / watchlist / cards / tasteModel)
  genres.ts                static genre + language lists
  discover.ts              builds the discover query (chips + tasteModel bias)
  rank.ts                  scores discover candidates against tasteModel
  search.ts                client helper for TMDB search
  movie.ts                 client helper for /movie/[id] detail + credits
  backdrops.ts             curated-backdrop read + /dev draft helpers
  share.ts                 encode/decode a card into the ?d= payload + build share URL


Build order (remaining)


/taste: grid view of tasteProfile (browse/reference only)
Card reorder on /card/[id] (optional polish, not blocking)
Real-phone test of swipe deck, movie pages, and QR scan flow on the Vercel deploy before adding anything further