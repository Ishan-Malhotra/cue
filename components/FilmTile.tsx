import type { Film } from "@/lib/storage";

const IMG_BASE = "https://image.tmdb.org/t/p/w342";

export type TileAction = {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  kind?: "add" | "remove";
};

export default function FilmTile({
  film,
  action,
}: {
  film: Film;
  action?: TileAction;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-surface-2">
      <div className="aspect-[2/3] w-full">
        {film.poster_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${IMG_BASE}${film.poster_path}`}
            alt={film.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-muted">
            {film.title}
          </div>
        )}
      </div>

      <div className="p-1.5">
        <p className="truncate text-xs font-medium text-fg" title={film.title}>
          {film.title}
        </p>
        {film.year && <p className="text-[10px] text-muted">{film.year}</p>}
      </div>

      {action && (
        <button
          type="button"
          aria-label={action.label}
          title={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
          className={
            "absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold shadow transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
            (action.kind === "remove"
              ? "bg-red-600/90 text-white hover:bg-red-500"
              : "bg-fg/90 text-app hover:bg-fg")
          }
        >
          {action.icon}
        </button>
      )}
    </div>
  );
}
