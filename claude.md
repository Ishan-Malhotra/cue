Project: Taste Card

One-sentence definition

A free, no-login-required (Phase A) website where you build a personal movie taste profile by swiping through films, then curate one or more named, editable "cards" (e.g. a general taste card, or a personalized one for a specific friend) and share any of them instantly via a QR code, link, or native share sheet (WhatsApp/Instagram/etc.) — no account required to view a shared card, no server-side database in Phase A, zero cost to build or use.

Current phase

Phase A — swipe deck + card + share, localStorage only.
Phase B (accounts, database, "blend" feature with friends) is future work — do not build toward it yet, see Out of Scope below.


Screens (six total)


/ — landing page. Entry points: "Explore" (→ /explore), "My Taste Profile" (→ /taste), "My Cards" (→ /card).
/explore — genre + language filter chips at top, swipeable film deck below.
/taste — grid view of everything in tasteProfile (all liked films). Read/reference source for building cards — does not write to any card itself.
/card — list of the user's cards (multiple, named, e.g. "My taste," "Horror picks for Amit"). Each entry shows name, film-count preview, edit + share actions, plus a "+ New card" button.
/card/[id] — editable view of a single card: rename it, add films (from tasteProfile primarily, or via inline TMDB search for a film not yet swiped), remove films, reorder. Share panel here: tries navigator.share() first (native share sheet — WhatsApp/Instagram/etc. if installed, mobile-first), falls back to a visible link + QR + copy button when Web Share isn't supported. Per-card cap ~20-25 films.
/card/[id]?d=<compressed> (or a dedicated shared-view route) — read-only view of someone else's shared card, decoded entirely from the URL param. Has a "save this as mine" (fork) button, which copies the card into the viewer's own cards collection. This route must never call TMDB or any API — it renders purely from the decoded payload.



Data schema (localStorage only, Phase A)

jstasteProfile: [
  { id, title, year, poster_path, likedAt }
]
// Everything swiped right. Full history. Feeds swipePrefs. Not shown/shared as-is.

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
  genres: { "28": 12, "35": 4 },  // TMDB genre id -> right-swipe count
  langs: { "en": 20, "hi": 8 }    // language code -> right-swipe count
}
// Simple weighted counter, NOT a recommendation model.
// Before each new /discover fetch in /explore, bias query params toward the
// top 1-2 weighted genres/langs once enough swipes exist (~10+).


Swipe gesture meanings (locked — do not reinterpret)


Right = liked → append to tasteProfile, increment swipePrefs
Left = skip → no storage write at all
Up = add to watchlist
There is no swipe gesture for adding to a card. Card curation is a deliberate, separate action that happens on /card/[id], never inside the swipe deck. Do not add a fourth swipe direction for this. /taste is a reference/browse screen for tasteProfile, not itself a card-editing surface.



Hard constraints


All TMDB requests go through server-side proxy routes — /api/tmdb/search, /api/tmdb/trending, /api/tmdb/discover. Never call TMDB directly from client components. Reason: TMDB's domains are intermittently blocked by Indian ISPs (Jio especially); proxying through Vercel's servers makes the block invisible to end users. This is a reliability requirement, not a style preference — don't "simplify" it back to direct client calls.
The shared card view must be fully self-contained. All data needed to render it (name, films: title/year/poster_path) must be embedded in the compressed URL payload itself — never re-fetched from TMDB on load. This is what makes viewing a shared card free and fast regardless of TMDB availability.
No accounts, no server database, no login in Phase A. Everything lives in localStorage. Do not suggest or scaffold auth/database code in this phase.
Use lz-string to compress a single card's {name, films} into the share URL's ?d= param, and the qrcode npm package to render a QR from that URL client-side. No external QR API calls.
Cap each card's films at ~20-25 — keeps QR density scannable. Enforce this as a UI limit on /card/[id] when adding films, with a clear message (not a silent failure) when the cap is hit.
Sharing uses navigator.share() first (covers WhatsApp/Instagram/etc. via the native share sheet on mobile), falling back to a visible link + QR + copy button when Web Share isn't supported (typically desktop). Don't build separate per-platform integrations.
/card/[id] may call /api/tmdb/search for the inline "add a film not in your taste profile" flow — same server-side proxy rule as everywhere else applies.



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
Any actual ML/recommendation model — swipePrefs weighting is a simple counter, not a model, and should stay that way in Phase A



Build order (for reference, don't build all at once)


Scaffold Next.js + Tailwind + the three TMDB proxy API routes
/explore: filter chips + swipe deck, wired to the three storage writes
swipePrefs weighting logic feeding future /discover calls
/taste: grid view of tasteProfile (browse/reference only)
/card: list of the user's cards, "+ New card" action
/card/[id]: edit a single card — rename, add films (from tasteProfile or inline TMDB search), remove, reorder, per-card cap enforcement
/card/[id] share panel: navigator.share() first, fallback to link + QR + copy
Shared read-only view (?d= payload): decode + render + fork-to-my-cards button
Deploy to Vercel, test the swipe deck and QR scan flow on a real phone before adding anything further