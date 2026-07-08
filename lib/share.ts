// Encode/decode a single card into the ?d= URL payload using lz-string.
//
// Hard constraint: the shared view renders purely from this payload — it never
// re-fetches from TMDB. So everything needed to render (name + each film's
// title/year/poster_path) is embedded here. We use a compact tuple shape and
// short keys to keep the payload — and therefore the QR — as dense as possible.

import LZString from "lz-string";
import type { Card, Film } from "@/lib/storage";

export type SharedCard = { name: string; films: Film[] };

// Compact wire shape: { n: name, f: [[id, title, year, poster_path], ...] }
type FilmTuple = [number, string, string, string | null];
type Wire = { n: string; f: FilmTuple[] };

export function encodeCard(card: Pick<Card, "name" | "films">): string {
  const wire: Wire = {
    n: card.name,
    f: card.films.map((f) => [f.id, f.title, f.year, f.poster_path]),
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(wire));
}

export function decodeCard(param: string): SharedCard | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(param);
    if (!json) return null;
    const wire = JSON.parse(json) as Wire;
    if (!wire || !Array.isArray(wire.f)) return null;
    const films: Film[] = wire.f.map((t) => ({
      id: t[0],
      title: t[1],
      year: t[2],
      poster_path: t[3] ?? null,
    }));
    return { name: typeof wire.n === "string" ? wire.n : "Shared card", films };
  } catch {
    return null;
  }
}

// Full shareable URL for a card. The path id is cosmetic — the shared view
// decodes everything from ?d=, so the link works for anyone with no local data.
export function buildShareUrl(origin: string, card: Card): string {
  return `${origin}/card/${card.id}?d=${encodeCard(card)}`;
}
