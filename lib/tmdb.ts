// Server-only TMDB helper. Never import this into a client component.
//
// All TMDB traffic must flow through the /api/tmdb/* proxy routes that use this
// helper — TMDB's domains are intermittently blocked by some Indian ISPs (Jio),
// so proxying through our own server makes the block invisible to end users.
// The API key lives only here, server-side, as the TMDB_API_KEY env var.

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export class TmdbError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

type TmdbFetchOptions = {
  // Next.js data-cache revalidation window, in seconds.
  revalidate?: number;
};

// A v4 read access token is a long JWT with two dots; a v3 key is a short hex
// string. We support both so it doesn't matter which the user pasted.
function looksLikeV4Token(key: string): boolean {
  return key.split(".").length === 3 && key.length > 100;
}

export async function tmdbFetch<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: TmdbFetchOptions = {},
): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new TmdbError(
      "TMDB_API_KEY is not set. Add it to .env.local (server-side only).",
      500,
    );
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(name, String(value));
    }
  }

  const headers: Record<string, string> = { accept: "application/json" };
  const useBearer = looksLikeV4Token(key);
  if (useBearer) {
    headers.Authorization = `Bearer ${key}`;
  } else {
    url.searchParams.set("api_key", key);
  }

  const res = await fetch(url, {
    headers,
    next: { revalidate: options.revalidate ?? 3600 },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (data && (data.status_message as string)) ||
      `TMDB request failed (${res.status})`;
    throw new TmdbError(message, res.status);
  }

  return data as T;
}
