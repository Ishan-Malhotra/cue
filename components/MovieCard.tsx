import type { DiscoverMovie } from "@/lib/discover";
import { genreName } from "@/lib/genres";

const IMG_BASE = "https://image.tmdb.org/t/p/w500";

export default function MovieCard({ movie }: { movie: DiscoverMovie }) {
  const genres = movie.genre_ids
    .map(genreName)
    .filter(Boolean)
    .slice(0, 3) as string[];

  return (
    <div className="relative h-full w-full select-none overflow-hidden rounded-2xl bg-neutral-800 shadow-2xl">
      {movie.poster_path ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${IMG_BASE}${movie.poster_path}`}
          alt={movie.title}
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-6 text-center text-neutral-400">
          {movie.title}
        </div>
      )}

      {/* gradient + info overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-bold leading-tight text-white">
            {movie.title}
          </h2>
          {movie.year && (
            <span className="text-sm text-neutral-300">{movie.year}</span>
          )}
        </div>
        {genres.length > 0 && (
          <p className="mt-1 text-xs uppercase tracking-wide text-neutral-400">
            {genres.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
