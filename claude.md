Project: Taste Card

One-sentence definition

A free, no-login-required (Phase A) website where you build a personal movie taste profile by swiping through films, then curate one or more named, editable "cards" (e.g. a general taste card, or a personalized one for a specific friend) and share any of them instantly via a QR code, link, or native share sheet (WhatsApp/Instagram/etc.) — no account required to view a shared card, no server-side database in Phase A, zero cost to build or use.

Current phase

Phase A — swipe deck + card + share, localStorage only.
Phase B (accounts, database, "blend" feature with friends) is future work — do not build toward it yet, see Out of Scope below.


Screens (eight total)


/ — landing/home page. Structure (visual design still in flux, do not lock in exact mockup styling): app name/branding, tagline, three primary entry actions — Search, Explore (→ /explore), Share / My Taste Profile (→ /card). Alongside/around these, a rotating display of movie backdrops pulled from TMDB (e.g. trending/popular), refreshed each time the page loads. Clicking a backdrop navigates to that film's /movie/[id] page.
/explore — genre + language filter chips at top, swipeable film deck below.
/movie/[id] — a dedicated page per film: backdrop/poster, title, overview, year, genres. Has a single "add to watchlist" toggle (binary on/off — not a three-way swipe/reject; this page is not the swipe deck). Reached by clicking a home page backdrop, or by selecting a result from Search.
Search — a search flow (can live on /, or its own /search route — Claude Code's call) hitting /api/tmdb/search; selecting a result navigates to /movie/[id].
/taste — grid view of everything in tasteProfile (all liked films). Read/reference source for building cards — does not write to any card itself.
/card — list of the user's cards (multiple, named, e.g. "My taste," "Horror picks for Amit"). Each entry shows name, film-count preview, edit + share actions, plus a "+ New card" button.
/card/[id] — editable view of a single card: rename it, add films (from tasteProfile primarily, or via inline TMDB search for a film not yet swiped), remove films, reorder. Share panel here: tries navigator.share() first (native share sheet — WhatsApp/Instagram/etc. if installed, mobile-first), falls back to a visible link + QR + copy button when Web Share isn't supported. Per-card cap ~20-25 films.
/card/[id]?d=<compressed> — implemented as the same card/[id]/page.tsx route: when a ?d= param is present, it renders as a read-only shared view decoded entirely from the URL param, instead of the normal editor. Has a "save this as mine" (fork) button, which copies the card into the viewer's own cards collection. This path must never call TMDB or any API — it renders purely from the decoded payload.


Note on visual design: the home page mockup discussed with the user (dark image stack on one side, black CTA buttons on the other, "cue" wordmark) is a rough structural sketch, not a locked design — font, colors, and layout are all still undecided. Build to the structure above; don't treat mockup-specific styling (exact fonts, exact button shapes) as a spec.


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
/movie/[id]'s "add to watchlist" is a simple binary toggle (on/off), distinct from the swipe deck's three-gesture model. It only ever writes to watchlist, never to tasteProfile or any card. Do not add a "reject"/skip action on this page — that concept belongs only in /explore.
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
Any actual ML/recommendation model — swipePrefs weighting is a simple counter, not a model, and should stay that way in Phase A



Progress


✅ Step 1 — Scaffold + TMDB proxy routes. Next.js + Tailwind + TypeScript. lib/tmdb.ts shared fetch helper (v3 key or v4 token, short revalidate cache). Three proxies: /api/tmdb/{trending,search,discover}. Verified via curl — real TMDB data, no client-side key leak.
✅ Step 2 — /explore. Filter chips (genre multi-select OR, language single-select) + swipe deck (react-tinder-card, desktop buttons as fallback). Gestures locked and verified in-browser via DevTools: right → tasteProfile + swipePrefs, left → no write, up → watchlist. Chips-win-per-dimension bias logic confirmed working against real swipe data.
✅ Step 3 — Cards (list, editor, share, shared view). /card lists all cards (name, film count, poster preview, edit/share/delete, "+ New card"). /card/[id] is the editor: rename, add from tasteProfile or inline TMDB search, remove, 25-film cap with a clear on-screen message (no silent failure). Share panel: navigator.share() first, fallback to link + QR + copy. Shared view (?d= on the same route) decodes and renders without ever touching TMDB, plus a "save this as mine" fork button.
⬜ /taste — grid/browse view of tasteProfile (reference only, not yet built)
⬜ Card reorder on /card/[id] (in spec, not yet built)
⬜ Home page redesign (/) — backdrop rotation from TMDB, Search / Explore / Share entry points, backdrops clickable to /movie/[id]
⬜ /movie/[id] — film detail page + binary watchlist toggle
⬜ Search wired to /movie/[id]
⬜ Deploy to Vercel; real-phone test of swipe deck + QR scan flow


Actual project structure (as built through Step 3)

app/
  page.tsx                 landing page (placeholder — home redesign still pending)
  explore/page.tsx         swipe deck + filter chips
  card/page.tsx             list of the user's cards
  card/[id]/page.tsx       card editor, OR shared read-only view when ?d= is present
  api/tmdb/{trending,search,discover}/route.ts   server-side TMDB proxies
components/                FilterChips, SwipeDeck, MovieCard, FilmTile,
                           CardEditor, SharePanel, SharedCardView
lib/
  tmdb.ts                  server-only TMDB fetch helper
  storage.ts               localStorage layer (tasteProfile / watchlist / cards / swipePrefs)
  genres.ts                static genre + language lists
  discover.ts              builds the discover query (chips + weighted bias)
  search.ts                client helper for inline TMDB search
  share.ts                 encode/decode a card into the ?d= payload + build share URL

New files expected for the upcoming home page / movie page / search work should follow this same convention (e.g. app/movie/[id]/page.tsx, lib/backdrops.ts or similar for the home page rotation logic) — check this structure before creating new top-level folders or duplicating existing helpers.


Build order (remaining — steps 1-8 done, see Progress above)


/taste: grid view of tasteProfile (browse/reference only)
Card reorder on /card/[id] (optional polish, not blocking)
Redesign / (home): backdrop rotation from TMDB, three entry actions (Search, Explore, Share/Taste Profile), backdrops clickable to /movie/[id]
Build /movie/[id]: film details + binary watchlist toggle
Wire Search to /movie/[id] (route/placement of search UI is Claude Code's call, confirm with user)
Deploy to Vercel, test the swipe deck, movie pages, and QR scan flow on a real phone before adding anything further