"use client";

import { GENRES, LANGUAGES } from "@/lib/genres";
import type { Selection } from "@/lib/discover";

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors " +
        (active
          ? "border-fg bg-fg text-app"
          : "border-line bg-surface text-muted hover:border-muted")
      }
    >
      {label}
    </button>
  );
}

export default function FilterChips({
  selection,
  onChange,
}: {
  selection: Selection;
  onChange: (next: Selection) => void;
}) {
  function toggleGenre(id: number) {
    const has = selection.genreIds.includes(id);
    onChange({
      ...selection,
      genreIds: has
        ? selection.genreIds.filter((g) => g !== id)
        : [...selection.genreIds, id],
    });
  }

  function toggleLang(code: string) {
    onChange({
      ...selection,
      lang: selection.lang === code ? null : code,
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GENRES.map((g) => (
          <Chip
            key={g.id}
            label={g.name}
            active={selection.genreIds.includes(g.id)}
            onClick={() => toggleGenre(g.id)}
          />
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LANGUAGES.map((l) => (
          <Chip
            key={l.code}
            label={l.name}
            active={selection.lang === l.code}
            onClick={() => toggleLang(l.code)}
          />
        ))}
      </div>
    </div>
  );
}
