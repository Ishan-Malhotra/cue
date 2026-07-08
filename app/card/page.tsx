"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SharePanel from "@/components/SharePanel";
import {
  createCard,
  deleteCard,
  getCards,
  type Card,
} from "@/lib/storage";

const THUMB_BASE = "https://image.tmdb.org/t/p/w92";

export default function CardListPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [shareCard, setShareCard] = useState<Card | null>(null);

  useEffect(() => {
    setCards(getCards());
    setLoaded(true);
  }, []);

  function handleNew() {
    const card = createCard();
    router.push(`/card/${card.id}`);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this card? This can't be undone.")) return;
    setCards(deleteCard(id));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-400 hover:text-white">
          ← Home
        </Link>
        <h1 className="text-lg font-semibold">My Cards</h1>
        <div className="w-12" />
      </header>

      <button
        type="button"
        onClick={handleNew}
        className="rounded-xl border border-dashed border-neutral-700 py-3 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
      >
        + New card
      </button>

      {loaded && cards.length === 0 && (
        <p className="pt-8 text-center text-sm text-neutral-500">
          No cards yet. Create one, then add films from your taste profile.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {cards.map((card) => (
          <li
            key={card.id}
            className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-neutral-100">
                  {card.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {card.films.length}{" "}
                  {card.films.length === 1 ? "film" : "films"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/card/${card.id}`}
                  className="rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:border-neutral-500"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => setShareCard(card)}
                  disabled={card.films.length === 0}
                  className="rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:border-neutral-500 disabled:opacity-40"
                >
                  Share
                </button>
                <button
                  type="button"
                  aria-label="Delete card"
                  onClick={() => handleDelete(card.id)}
                  className="rounded-lg border border-neutral-800 px-2 py-1 text-xs text-neutral-500 hover:border-red-600 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            </div>

            {card.films.length > 0 && (
              <div className="mt-3 flex gap-1.5 overflow-hidden">
                {card.films.slice(0, 5).map((f) =>
                  f.poster_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={f.id}
                      src={`${THUMB_BASE}${f.poster_path}`}
                      alt={f.title}
                      loading="lazy"
                      className="h-16 w-11 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div
                      key={f.id}
                      className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-neutral-800 p-1 text-center text-[8px] text-neutral-400"
                    >
                      {f.title}
                    </div>
                  ),
                )}
                {card.films.length > 5 && (
                  <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-neutral-800 text-xs text-neutral-400">
                    +{card.films.length - 5}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {shareCard && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setShareCard(null)}
        >
          <div
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <SharePanel card={shareCard} />
            <button
              type="button"
              onClick={() => setShareCard(null)}
              className="mt-2 w-full rounded-lg border border-neutral-700 py-2 text-sm text-neutral-300 hover:border-neutral-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
