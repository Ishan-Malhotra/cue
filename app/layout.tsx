import type { Metadata } from "next";
import "./globals.css";
import ThemeSync from "@/components/ThemeSync";

export const metadata: Metadata = {
  title: "Taste Card",
  description:
    "Build a personal movie taste profile by swiping, curate a shareable taste card, and share it via QR or link.",
};

// Applied before paint to avoid a theme flash. Default = dark ("off").
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("theme") || "dark";
    document.documentElement.classList.toggle("dark", t !== "light");
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
