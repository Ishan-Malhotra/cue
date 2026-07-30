import type { Film } from "@/lib/storage";

const IMG_BASE = "https://image.tmdb.org/t/p/w342";

export type TileAction = {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  kind?: "add" | "remove" | "like" | "skip";
};

function actionClass(kind?: TileAction["kind"]): string {
  switch (kind) {
    case "remove":
    case "skip":
      return "bg-red-600/90 text-white hover:bg-red-500";
    case "like":
      return "bg-green-600/90 text-white hover:bg-green-500";
    default:
      return "bg-fg/90 text-app hover:bg-fg";
  }
}

export default function FilmTile({
  film,
  action,
  actions,
}: {
  film: Film;
  /** Single action (legacy). Prefer `actions` when you need more than one. */
  action?: TileAction;
  actions?: TileAction[];
}) {
  const buttons = actions ?? (action ? [action] : []);

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

      {buttons.length > 0 && (
        <div className="absolute right-1 top-1 flex flex-col gap-1">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              aria-label={btn.label}
              title={btn.label}
              disabled={btn.disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.onClick();
              }}
              className={
                "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold shadow transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
                actionClass(btn.kind)
              }
            >
              {btn.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
