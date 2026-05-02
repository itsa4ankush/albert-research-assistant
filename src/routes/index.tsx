import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Microscope, Briefcase, FlaskConical } from "lucide-react";
import type { UserRole } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Albert — chat with your research papers" },
      {
        name: "description",
        content:
          "Upload a paper, ask anything. Albert is an AI research companion powered by IBM watsonx.",
      },
    ],
  }),
  component: Landing,
});

const ROLE_CARDS: Array<{
  role: UserRole;
  title: string;
  sub: string;
  Icon: typeof GraduationCap;
}> = [
  {
    role: "student",
    title: "Student",
    sub: "Bachelor's or Master's",
    Icon: GraduationCap,
  },
  {
    role: "phd",
    title: "PhD candidate",
    sub: "Deep dives, lit reviews",
    Icon: Microscope,
  },
  {
    role: "pm",
    title: "Product manager",
    sub: "Translate research to product",
    Icon: Briefcase,
  },
  {
    role: "researcher",
    title: "Researcher",
    sub: "Industry or academia",
    Icon: FlaskConical,
  },
];

function Landing() {
  return (
    <main className="relative overflow-hidden">
      {/* role selector — first thing on the page */}
      <section id="roles" className="mx-auto max-w-6xl px-6 pt-12 pb-4 sm:pt-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
              Sign up or Log in · choose your role
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              Who's reading?
            </h2>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Tap one to jump straight to sign up.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_CARDS.map(({ role, title, sub, Icon }) => (
            <Link
              key={role}
              to="/login"
              search={{ role }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-foreground shadow-soft transition hover:-translate-y-0.5 hover:border-coral/60 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-coral/15 text-coral transition group-hover:bg-coral/25">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
              <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-coral">
                Sign up or Log in
                <span
                  aria-hidden
                  className="transition group-hover:translate-x-0.5"
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-16 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" />
              Powered by IBM watsonx
            </p>
            <h1 className="font-display text-5xl font-semibold leading-[0.95] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Semantic alignment of research literature to{" "}
              <em className="text-coral not-italic">user-defined objectives</em>{" "}
              and grounded question answering.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Research alignment engine that offers relevance reasoning, score
              and intelligent research assistance for your smart review of
              literature.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-semibold text-accent-foreground shadow-soft transition hover:translate-y-[-1px] hover:bg-coral/90"
              >
                Open Albert
                <span aria-hidden>→</span>
              </Link>
              <a
                href="#roles"
                className="text-sm font-medium text-foreground/70 underline decoration-coral decoration-2 underline-offset-4 hover:text-foreground"
              >
                Pick your role
              </a>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-warm opacity-60 blur-2xl" />
              <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
                <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Attention is all you need.pdf</span>
                  <span>p. 3 / 11</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl bg-paper-deep px-4 py-3 font-mono text-xs leading-relaxed text-muted-foreground">
                    "...self-attention layers are faster than recurrent layers
                    when the sequence length n is smaller than the
                    representation dimensionality d..."
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-coral px-4 py-2.5 text-accent-foreground">
                      Why does this matter for translation tasks?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-paper-deep px-4 py-2.5 text-foreground">
                      <span className="font-display font-semibold text-coral">
                        Albert.
                      </span>{" "}
                      Most sentence pairs in MT have{" "}
                      <span className="font-mono">n &lt; d</span>, so
                      self-attention beats RNNs on both speed and dependency
                      length [3].
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* how */}
      <section className="border-t border-border bg-paper-deep/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Three steps. No setup.
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              {
                n: "01",
                title: "Sign in",
                body: "Pick your role and a name. That's it.",
              },
              {
                n: "02",
                title: "Upload a paper",
                body: "PDF goes in, text gets extracted right in your browser.",
              },
              {
                n: "03",
                title: "Ask anything",
                body: "Albert pulls the most relevant excerpts and answers with citations.",
              },
            ].map((s) => (
              <div key={s.n}>
                <div className="font-mono text-xs text-coral">{s.n}</div>
                <h3 className="mt-2 font-display text-2xl font-semibold">
                  {s.title}
                </h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Albert · a hackathon project</p>
          <p className="font-mono text-xs uppercase tracking-[0.18em]">
            ibm watsonx · granite-3
          </p>
        </div>
      </footer>
    </main>
  );
}
