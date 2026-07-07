import Link from "next/link";

const ENTRIES = [
  {
    href: "/explore",
    title: "Explore",
    blurb: "Swipe through films and build your taste profile.",
  },
  {
    href: "/taste",
    title: "My Taste Profile",
    blurb: "Everything you liked. Promote favorites onto your card.",
  },
  {
    href: "/card",
    title: "My Card",
    blurb: "Your curated taste card — share it via QR or link.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Taste Card</h1>
        <p className="text-neutral-400">
          Build a personal movie taste profile by swiping, curate a shareable
          card, and let anyone view it instantly.
        </p>
      </header>

      <nav className="grid gap-4">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="group rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 transition-colors hover:border-neutral-600 hover:bg-neutral-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{entry.title}</span>
              <span className="text-neutral-500 transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-400">{entry.blurb}</p>
          </Link>
        ))}
      </nav>

      <p className="text-xs text-neutral-600">
        Phase A · no login required · these screens land in later steps.
      </p>
    </main>
  );
}
