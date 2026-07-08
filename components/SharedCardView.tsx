"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FilmTile from "@/components/FilmTile";
import { decodeCard } from "@/lib/share";
import { saveSharedCardAsMine } from "@/lib/storage";

// Renders a shared card entirely from the ?d= payload. Never calls TMDB — this
// is what makes viewing a shared card fast and free regardless of TMDB uptime.
export default function SharedCardView({ payload }: { payload: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const shared = useMemo(() => decodeCard(payload), [payload]);

  if (!shared) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 py-6 text-center">
        <p className="text-muted">
          This shared card link looks broken or incomplete.
        </p>
        <Link
          href="/card"
          className="rounded-lg border border-line px-4 py-2 text-sm hover:border-muted"
        >
          Go to my cards
        </Link>
      </main>
    );
  }

  function handleSave() {
    if (!shared) return;
    saveSharedCardAsMine(shared);
    setSaved(true);
    router.push("/card");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <header className="text-center">
        <p className="text-xs uppercase tracking-wide text-muted">
          Shared taste card
        </p>
        <h1 className="mt-1 text-2xl font-bold">{shared.name}</h1>
        <p className="text-xs text-muted">
          {shared.films.length}{" "}
          {shared.films.length === 1 ? "film" : "films"}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {shared.films.map((film) => (
          <FilmTile key={film.id} film={film} />
        ))}
      </div>

      <div className="sticky bottom-4 mt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saved}
          className="w-full rounded-xl bg-fg py-3 text-sm font-semibold text-app shadow-lg transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {saved ? "Saved to your cards" : "Save this as mine"}
        </button>
        <Link
          href="/card"
          className="mt-2 block text-center text-xs text-muted hover:text-muted"
        >
          View my cards
        </Link>
      </div>
    </main>
  );
}
