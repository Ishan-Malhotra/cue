"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import CardEditor from "@/components/CardEditor";
import SharedCardView from "@/components/SharedCardView";

function CardRoute() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const payload = searchParams.get("d");

  // A ?d= payload means this is a shared, read-only view — decode and render
  // purely from it (never touches TMDB), regardless of the path id.
  if (payload) return <SharedCardView payload={payload} />;

  return <CardEditor id={id} />;
}

export default function CardIdPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-neutral-500">Loading…</p>
        </main>
      }
    >
      <CardRoute />
    </Suspense>
  );
}
