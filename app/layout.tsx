import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taste Card",
  description:
    "Build a personal movie taste profile by swiping, curate a shareable taste card, and share it via QR or link.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
