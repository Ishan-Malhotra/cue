"use client";

import { useEffect, useState } from "react";

// Inline Tabler icons (MIT): ti-bulb (filled/glowing = light on) and
// ti-bulb-off (outline = dark off) — avoids a dependency for two icons.
function BulbOn() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12h1M12 3v1M20 12h1M5.6 5.6l.7 .7M18.4 5.6l-.7 .7" fill="none" />
      <path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" />
      <path d="M9.7 17l4.6 0" stroke="#78350f" />
    </svg>
  );
}

function BulbOff() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12h1M12 3v1M5.6 5.6l.7 .7M18.4 5.6l-.7 .7M20 12h1" />
      <path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" />
      <path d="M9.7 17l4.6 0" />
    </svg>
  );
}

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  // Sync initial state from the class the inline layout script already applied.
  useEffect(() => {
    setLight(!document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("dark", !next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={light}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Light mode" : "Dark mode"}
      className={
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors " +
        (light
          ? "text-amber-500 drop-shadow-[0_0_6px_rgba(217,119,6,0.6)] hover:bg-black/5"
          : "text-neutral-400 hover:bg-white/10 hover:text-neutral-200")
      }
    >
      {light ? <BulbOn /> : <BulbOff />}
    </button>
  );
}
