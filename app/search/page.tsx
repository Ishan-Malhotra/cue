"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import FilmTile from "@/components/FilmTile";
import { searchMovies, type SearchMovie } from "@/lib/search";
import {
  addToTasteProfile,
  applyTasteSignal,
  getTasteProfile,
} from "@/lib/storage";

type Verdict = "liked" | "skipped";

const SUGGEST_DEBOUNCE_MS = 280;
const SUGGEST_LIMIT = 6;
const POSTER_THUMB = "https://image.tmdb.org/t/p/w92";

function SearchPageInner() {
  const params = useSearchParams();
  const fromExplore = params.get("from") === "explore";
  const backHref = fromExplore ? "/explore" : "/";
  const backLabel = fromExplore ? "← Explore" : "← Home";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchMovie[]>([]);
  const [suggestions, setSuggestions] = useState<SearchMovie[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "done" | "error">(
    "idle",
  );
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [error, setError] = useState("");
  const [verdicts, setVerdicts] = useState<Record<number, Verdict>>(() => {
    const liked: Record<number, Verdict> = {};
    for (const m of getTasteProfile()) liked[m.id] = "liked";
    return liked;
  });

  const reqRef = useRef(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const likedCount = useMemo(
    () => Object.values(verdicts).filter((v) => v === "liked").length,
    [verdicts],
  );

  // Live recommendations while typing.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const reqId = ++reqRef.current;
    const timer = setTimeout(async () => {
      try {
        const hits = await searchMovies(q);
        if (reqId !== reqRef.current) return;
        setSuggestions(hits.slice(0, SUGGEST_LIMIT));
        setSuggestOpen(true);
      } catch {
        if (reqId !== reqRef.current) return;
        setSuggestions([]);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSuggestOpen(false);
    setStatus("searching");
    setError("");
    try {
      setResults(await searchMovies(query));
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setStatus("error");
    }
  }

  function like(movie: SearchMovie) {
    if (verdicts[movie.id] === "liked") return;
    addToTasteProfile(movie);
    applyTasteSignal(movie, "right");
    setVerdicts((prev) => ({ ...prev, [movie.id]: "liked" }));
  }

  function skip(movie: SearchMovie) {
    if (verdicts[movie.id]) return;
    applyTasteSignal(movie, "left");
    setVerdicts((prev) => ({ ...prev, [movie.id]: "skipped" }));
  }

  function tileActions(film: SearchMovie) {
    const verdict = verdicts[film.id];
    if (verdict === "liked") {
      return [
        {
          icon: "♥",
          label: "Liked",
          kind: "like" as const,
          disabled: true,
          onClick: () => {},
        },
      ];
    }
    if (verdict === "skipped") {
      return [
        {
          icon: "✕",
          label: "Skipped",
          kind: "skip" as const,
          disabled: true,
          onClick: () => {},
        },
      ];
    }
    return [
      {
        icon: "♥",
        label: "Like",
        kind: "like" as const,
        onClick: () => like(film),
      },
      {
        icon: "✕",
        label: "Skip",
        kind: "skip" as const,
        onClick: () => skip(film),
      },
    ];
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href={backHref} className="text-sm text-muted hover:text-fg">
          {backLabel}
        </Link>
        <h1 className="text-lg font-semibold">Search</h1>
        <div className="w-12" />
      </header>

      <form onSubmit={run} className="relative flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setSuggestOpen(true);
            }}
            onBlur={() => {
              // Delay so a click on a suggestion can register.
              blurTimer.current = setTimeout(() => setSuggestOpen(false), 150);
            }}
            autoFocus
            placeholder="Search for a film…"
            autoComplete="off"
            className="w-full rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-muted"
          />

          {suggestOpen && suggestions.length > 0 && (
            <ul
              className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-lg"
              onMouseDown={(e) => e.preventDefault()}
            >
              {suggestions.map((film) => (
                <li key={film.id}>
                  <Link
                    href={`/movie/${film.id}`}
                    className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-2"
                    onClick={() => setSuggestOpen(false)}
                  >
                    <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-surface-2">
                      {film.poster_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${POSTER_THUMB}${film.poster_path}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-fg">
                      {film.title}
                      {film.year ? (
                        <span className="text-muted"> ({film.year})</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={status === "searching"}
          className="shrink-0 rounded-lg border border-line px-4 py-2 text-sm text-fg hover:border-muted disabled:opacity-40"
        >
          {status === "searching" ? "…" : "Go"}
        </button>
      </form>

      <p className="text-xs text-muted">
        Tap a poster for details · ♥ taste · ✕ skip
        {likedCount > 0 ? ` · ${likedCount} liked` : ""}
      </p>

      {status === "error" && <p className="text-sm text-red-500">{error}</p>}

      {status === "done" && results.length === 0 && (
        <p className="text-sm text-muted">No films found.</p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {results.map((film) => (
            <Link key={film.id} href={`/movie/${film.id}`} className="block">
              <FilmTile film={film} actions={tileActions(film)} />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
          <p className="text-muted">Loading…</p>
        </main>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
