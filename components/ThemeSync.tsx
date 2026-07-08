"use client";

import { useEffect } from "react";

// No UI. Keeps the theme class in sync across tabs: when another tab writes
// localStorage.theme, re-apply the `dark` class here. The layout's pre-paint
// inline script remains the source of truth on initial load.
export default function ThemeSync() {
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== "theme") return;
      document.documentElement.classList.toggle("dark", e.newValue !== "light");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
