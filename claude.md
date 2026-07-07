Project: Taste Card

One-sentence definition

A free, no-login-required (Phase A) website where you build a personal movie taste profile by swiping through films, curate a hand-picked subset into a shareable "taste card," and let anyone view your card instantly via a QR code or link — no account required to view a shared card, no server-side database in Phase A, zero cost to build or use.

Current phase

Phase A — swipe deck + card + share, localStorage only.
Phase B (accounts, database, "blend" feature with friends) is future work — do not build toward it yet, see Out of Scope below.


Screens (five total)


/ — landing page. Two entry points: "Explore" (→ /explore) and "My Taste Profile" (→ /taste) and "My Card" (→ /card).
/explore — genre + language filter chips at top, swipeable film deck below.
/taste — grid view of everything in tasteProfile (all liked films). Each film has an "add to card" toggle to promote it into myCard.
/card — the curated myCard grid, plus a share button that generates a compressed URL and a QR code from it.
/card?d=<compressed> — read-only view of someone else's shared card, decoded entirely from the URL param. Has a "save this as mine" (fork) button. This route must never call TMDB or any API — it renders purely from the decoded payload.



Data schema (localStorage only, Phase A)

jstasteProfile: [
  { id, title, year, poster_path, likedAt }
]
// Everything swiped right. Full history. Feeds swipePrefs. Not shown/shared as-is.

watchlist: [
  { id, title, year, poster_path }
]
// Swipe up. Private "want to watch" staging list. Not shared.

myCard: [
  { id, title, year, poster_path }
]
// Manually curated subset of tasteProfile, promoted via the toggle on /taste.
// This is the ONLY list that gets shared/QR'd. Cap at ~20-25 entries (QR density limit).

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
There is no swipe gesture for adding to myCard. Card curation is a deliberate, separate action that happens on /taste, never inside the swipe deck. Do not add a fourth swipe direction for this.



Hard constraints


All TMDB requests go through server-side proxy routes — /api/tmdb/search, /api/tmdb/trending, /api/tmdb/discover. Never call TMDB directly from client components. Reason: TMDB's domains are intermittently blocked by Indian ISPs (Jio especially); proxying through Vercel's servers makes the block invisible to end users. This is a reliability requirement, not a style preference — don't "simplify" it back to direct client calls.
The shared card view (/card?d=...) must be fully self-contained. All data needed to render it (title, year, poster_path) must be embedded in the compressed URL payload itself — never re-fetched from TMDB on load. This is what makes viewing a shared card free and fast regardless of TMDB availability.
No accounts, no server database, no login in Phase A. Everything lives in localStorage. Do not suggest or scaffold auth/database code in this phase.
Use lz-string to compress the myCard array into the ?d= URL param, and the qrcode npm package to render a QR from that URL client-side. No external QR API calls.
Cap myCard at ~20-25 films — keeps QR density scannable. Enforce this as a UI limit on the "add to card" toggle in /taste.



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
/taste: grid of tasteProfile + "add to card" toggle (with the 20-25 cap)
/card: grid + share button + QR generation
/card?d=: decode + render read-only + fork button
Deploy to Vercel, test the swipe deck and QR scan flow on a real phone before adding anything further