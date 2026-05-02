import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPaper } from "@/lib/store";
import type { Paper } from "@/lib/types";
import { ChatBox } from "@/components/ChatBox";

export const Route = createFileRoute("/_authenticated/papers/$paperId")({
  head: () => ({
    meta: [
      { title: "Paper — Albert" },
      { name: "description", content: "Chat with this paper." },
    ],
  }),
  component: PaperPage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-4xl">Paper not found</h1>
      <Link to="/dashboard" className="mt-6 inline-block underline decoration-coral">
        Back to library
      </Link>
    </main>
  ),
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-4xl">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">{error.message}</p>
    </main>
  ),
});

function PaperPage() {
  const { paperId } = Route.useParams();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPaper(getPaper(paperId) ?? null);
    setReady(true);
  }, [paperId]);

  if (!ready) return null;

  if (!paper) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Paper not found</h1>
        <p className="mt-3 text-muted-foreground">
          It may have been deleted, or this link is from a different browser.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-block underline decoration-coral"
        >
          Back to library
        </Link>
      </main>
    );
  }

  const suggestions = [
    "Summarize this paper in 5 bullet points.",
    "What is the main contribution?",
    "What are the key assumptions of the method?",
    "What experiments were run, and what did they show?",
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to="/dashboard"
        className="text-sm text-muted-foreground underline decoration-coral underline-offset-4 hover:text-foreground"
      >
        ← Library
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
            {paper.pageCount} pages · {new Date(paper.uploadedAt).toLocaleDateString()}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight text-balance">
            {paper.title}
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {paper.filename}
          </p>

          <div className="mt-8 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 leading-relaxed text-foreground/90 shadow-soft">
            <p className="whitespace-pre-wrap text-sm">
              {paper.fullText.slice(0, 6000)}
              {paper.fullText.length > 6000 && "…"}
            </p>
          </div>
        </section>

        <section className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 h-[75vh]">
            <ChatBox paper={paper} suggestions={suggestions} />
          </div>
        </section>
      </div>
    </main>
  );
}
