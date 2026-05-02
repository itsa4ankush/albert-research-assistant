# Albert — Research Alignment Engine

> Semantic alignment of research literature to user-defined objectives, with grounded question answering powered by **IBM watsonx**.

Albert is a research alignment engine that helps students, PhD candidates, product managers, and researchers cut through literature noise. Drop in a paper (PDF or URL), and Albert scores it against your stated research objectives, surfaces relevance reasoning, and lets you ask grounded questions whose answers cite the actual excerpts they came from.

---

## ✨ Features

- **🔐 Passwordless authentication** — email OTP sign-in via Lovable Cloud (Supabase Auth). No passwords to manage.
- **🧭 Onboarding research brief** — capture topic, background, problem, expected outcome, and other notes once. Albert uses this context for every downstream task.
- **📥 Paper ingestion** — two paths:
  - **Paste a URL** — server fetches HTML or PDF, extracts clean text.
  - **Upload a PDF** — parsed in-browser with `pdfjs-dist`, never leaves your session unprocessed.
- **🎯 Relevance scoring (0–100)** — IBM watsonx (Granite) scores each paper against your research brief and assigns topical tags + a plain-language excerpt.
- **💬 Grounded chat** — ask anything about a paper. Albert retrieves the most relevant chunks (keyword overlap) and answers with `[1]`, `[2]` style citations to those chunks. No hallucinated references.
- **🗂 Library dashboard** — sortable/filterable card grid, skeleton loading states, empty-state CTA, tag filters.
- **🧱 Persistent research context** — edit your brief any time from the sidebar; returning users skip onboarding automatically.
- **📱 Responsive sidebar shell** — collapsible nav (Library, Chat, Edit context, Sign out) with the user's role and topic always visible.

---

## 🧰 Tech stack

| Layer | Choice |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, server functions) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 + shadcn/ui + semantic design tokens (oklch) |
| Backend | **Lovable Cloud** (managed Supabase: Postgres, Auth, RLS) |
| AI | **IBM watsonx** — `ibm/granite-3-8b-instruct` via the watsonx Text Generation API |
| PDF parsing | `pdfjs-dist` (browser) + server-side PDF/HTML fetch |
| Deployment target | Cloudflare Workers (edge SSR) |
| Language | TypeScript (strict) |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React 19 + TanStack Router)                           │
│  • PDF parsing (pdfjs-dist) • localStorage paper cache          │
│  • Sidebar shell + protected /_authenticated routes             │
└────────────┬───────────────────────────────────┬────────────────┘
             │ createServerFn RPC                │ supabase-js
             ▼                                   ▼
┌──────────────────────────────┐   ┌───────────────────────────────┐
│  Server functions (Worker)   │   │  Lovable Cloud (Supabase)     │
│  • askWatsonx                │   │  • Auth (email OTP)           │
│  • analyzePaper              │   │  • profiles table             │
│  • fetchPaperFromUrl         │   │    └ research_context (jsonb) │
│  • IAM token cache           │   │  • RLS policies               │
└────────────┬─────────────────┘   └───────────────────────────────┘
             │ Bearer (IAM)
             ▼
┌──────────────────────────────┐
│  IBM watsonx                 │
│  granite-3-8b-instruct       │
└──────────────────────────────┘
```

### Project layout

```
src/
├── routes/
│   ├── __root.tsx                       # SSR shell + providers
│   ├── index.tsx                        # Landing (role picker + hero)
│   ├── login.tsx                        # Email OTP sign-in
│   ├── _authenticated.tsx               # Sidebar layout + auth guard
│   └── _authenticated/
│       ├── onboarding.tsx               # 4-step research brief
│       ├── dashboard.tsx                # Paper library
│       ├── papers.$paperId.tsx          # Paper detail + ChatBox
│       └── research-context.tsx         # Edit research brief
├── server/
│   ├── watsonx.server.ts                # IAM token cache + raw watsonx call
│   └── watsonx.functions.ts             # askWatsonx, analyzePaper, fetchPaperFromUrl
├── components/
│   ├── AppSidebar.tsx                   # Collapsible left nav
│   ├── Navbar.tsx                       # Public-route navbar
│   ├── PaperCard.tsx                    # Library card (relevance badge, tags)
│   ├── UploadPaperDialog.tsx            # URL / PDF upload tabs
│   ├── ChatBox.tsx                      # Grounded chat UI
│   └── ui/*                             # shadcn/ui primitives
├── lib/
│   ├── auth.ts                          # Auth helpers + ResearchContext type
│   ├── store.ts                         # localStorage paper store
│   ├── pdf.ts                           # pdfjs-dist text extraction + chunking
│   └── types.ts                         # Paper, Session, UserRole
├── integrations/supabase/               # Auto-generated client + types
└── styles.css                           # Tailwind v4 + design tokens (oklch)

supabase/migrations/                     # profiles table + research_context column
```

---

## 🚀 Getting started

### Prerequisites

- [Bun](https://bun.sh) (or Node 20+)
- An **IBM Cloud** account with a [watsonx.ai](https://www.ibm.com/products/watsonx-ai) project
  - `WATSONX_API_KEY` — IAM API key
  - `WATSONX_PROJECT_ID` — your watsonx project ID
- (Lovable users) Lovable Cloud is enabled automatically — no Supabase setup needed.
- (Self-hosting) A Supabase project (URL + anon key + service role)

### 1. Clone & install

```bash
git clone <your-repo-url>
cd albert
bun install
```

### 2. Environment variables

Lovable Cloud auto-populates `.env` with Supabase credentials. For self-hosted setups create `.env`:

```bash
# Supabase / Lovable Cloud (auto-managed in Lovable)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>

# IBM watsonx — server-side only, NEVER prefix with VITE_
WATSONX_API_KEY=<your-ibm-cloud-iam-api-key>
WATSONX_PROJECT_ID=<your-watsonx-project-id>
WATSONX_REGION=us-south            # optional, defaults to us-south
```

> 🔒 `WATSONX_*` secrets are read inside server functions (`process.env`) and never shipped to the browser.

### 3. Apply database migrations

Migrations live in `supabase/migrations/`. They create the `profiles` table (with `research_context jsonb`) and RLS policies. In Lovable Cloud they apply automatically; for self-hosted run:

```bash
supabase db push
```

### 4. Run

```bash
bun run dev          # http://localhost:5173
bun run build        # production build (Cloudflare Worker target)
bun run preview      # preview the built app
```

---

## 🔐 Authentication & data model

- **Sign-in:** email OTP via `supabase.auth.signInWithOtp`. No passwords, no Google OAuth required.
- **Session guard:** the `_authenticated` layout route checks the Supabase session in `beforeLoad` and redirects unauthenticated users to `/login`.
- **Roles:** stored client-side as part of the session (student / phd / pm / researcher). For privileged roles in production, follow the [user-roles pattern](https://docs.lovable.dev) — a separate `user_roles` table with a `has_role()` security-definer function. **Never store roles on the profiles table.**
- **Profiles table:**

  ```sql
  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text,
    role text,
    research_context jsonb default '{}'::jsonb,
    onboarded boolean default false,
    created_at timestamptz default now()
  );
  alter table public.profiles enable row level security;

  create policy "users read own profile"  on public.profiles for select using (auth.uid() = id);
  create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
  create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);
  ```

---

## 🧠 IBM watsonx integration

All AI calls go through TanStack `createServerFn` handlers in `src/server/watsonx.functions.ts`:

| Function | Purpose |
|---|---|
| `askWatsonx({ question, contextChunks, history })` | Grounded Q&A. Builds a system prompt that pins Albert to the supplied chunks and asks for `[n]` citations. |
| `analyzePaper({ title, text, researchContext })` | Returns `{ relevance: 0–100, tags: string[], excerpt: string }` JSON, scored against the user's research brief. |
| `fetchPaperFromUrl({ url })` | Server-side fetch. Detects PDF vs HTML, returns either base64 PDF or stripped text. |

Auth flow: `WATSONX_API_KEY` is exchanged for an IAM bearer token (cached in-memory until expiry), then sent to `https://{region}.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-05-29` with `model_id: ibm/granite-3-8b-instruct`.

Swap models by changing one constant in `watsonx.server.ts`.

---

## 🎨 Design system

- **Tokens** in `src/styles.css` (oklch). Never write raw color classes (`text-white`, `bg-blue-500`) in components — always use semantic tokens (`bg-primary`, `text-coral`, `bg-paper-deep`, etc.).
- **Typography** pairs a display serif (headings) with a clean sans (body).
- **shadcn/ui** primitives are customized via variants, not by overriding colors inline.

---

## 🛣 Roadmap

- [ ] Vector embeddings + semantic retrieval (currently keyword overlap chunking)
- [ ] Multi-paper / cross-paper chat
- [ ] Page-level citations with PDF viewer pane
- [ ] Server-side paper persistence (currently `localStorage`)
- [ ] Shareable read-only library links
- [ ] Streaming chat responses

---

## 🤝 Contributing

PRs welcome. Please:

1. Run `bun run lint` and `bun run format` before committing.
2. Keep server-only code in `src/server/*.server.ts` — never import these from client components.
3. Use search-replace for narrow edits; full rewrites for new files only.
4. Don't edit `src/integrations/supabase/{client,types}.ts` or `src/routeTree.gen.ts` — they're auto-generated.

---

## 📜 License

MIT. See `LICENSE`.

---

## 🙏 Acknowledgements

- **IBM watsonx** — Granite-3 model family for grounded reasoning.
- **Lovable Cloud** — managed Postgres + Auth.
- **TanStack** — Start, Router, Query.
- **shadcn/ui** + **Radix UI** — accessible component primitives.
- **pdfjs-dist** — Mozilla's PDF parser.

Built as a hackathon project. Albert is named after the patron saint of slow, careful reading.
