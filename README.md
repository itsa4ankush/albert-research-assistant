# Albert — Research Alignment Engine

## Context

Researchers, PhD candidates, students, and product managers routinely face an
overwhelming volume of academic literature. Reading every paper end-to-end to
decide whether it is relevant to a specific research objective is slow,
repetitive, and error-prone. Most existing tools either summarize papers in
isolation or provide generic chat over PDFs — neither approach connects a
paper back to the user's own research brief.

Albert is a research alignment engine that closes this gap. A user defines
their research context once (topic, background, problem, expected outcome),
then drops in papers as PDFs or URLs. Albert scores each paper against that
brief, surfaces the reasoning behind the score, extracts structured metadata,
and lets the user ask grounded questions whose answers cite the actual
excerpts they came from.

## Problem

Literature review today suffers from three concrete problems:

1. **Relevance is opaque.** A paper's abstract rarely tells you whether it
   fits *your* specific research question. Researchers waste hours reading
   papers that turn out to be tangential.
2. **Notes live everywhere.** Summaries, methodology notes, tags, and
   chapter assignments are scattered across PDFs, sticky notes, and
   spreadsheets. There is no single structured record per paper.
3. **AI answers cannot be trusted without grounding.** Generic chat-with-PDF
   tools hallucinate citations and conflate sources. Researchers need
   answers tied back to specific passages they can verify.

Albert addresses all three: per-paper relevance scoring against a stated
brief, a structured research database row per paper, and grounded chat with
citations to the underlying chunks.

## Scope

In scope for the current version:

- Passwordless email OTP authentication.
- One-time onboarding to capture the user's research brief
  (topic, technology, industry, background, problem, expected outcome).
- Paper ingestion via URL (server fetches HTML or PDF) or direct PDF upload
  (parsed in-browser).
- AI relevance scoring (0–100) with tags and a plain-language excerpt,
  scored against the user's brief.
- A structured research database row per paper with fields for title,
  summary, methodology summary, research approach, outcome, research
  alignment, relevance score, user comments, and custom tags.
- Inline custom tagging on each row (e.g. "Review of literature",
  "Hypothesis framework", "Results discussion").
- Grounded chat with `[n]` citations to retrieved chunks.
- Library dashboard with filtering, sorting, and tag filters.
- Editable research context from the sidebar.

Out of scope for now:

- Vector embeddings and semantic retrieval (currently keyword overlap).
- Cross-paper or multi-paper chat.
- Server-side persistence of papers (currently localStorage).
- Page-level citations with an inline PDF viewer.
- Shareable read-only library links.
- Streaming chat responses.
- Collaboration and shared workspaces.

## What has been built — process workflow

The current build covers the end-to-end flow from sign-in to a structured,
taggable research database. Step by step:

1. **Sign in (passwordless).**
   The user lands on the marketing page and signs in via email OTP
   (Supabase Auth). No passwords, no Google OAuth required.

2. **Onboarding — capture the research brief.**
   First-time users are routed to `/onboarding` and fill in a short brief:
   display name, thesis or research topic, technology, industry,
   background, problem being solved, expected outcome, and any other
   comments. The brief is stored in the `profiles.research_context` JSONB
   column. Returning users skip this step automatically.

3. **Library dashboard.**
   After onboarding the user lands on `/dashboard`, which shows their
   paper library as a card grid with skeleton loading states, an
   empty-state CTA, and tag filters.

4. **Add a paper — URL or PDF.**
   The "Add paper" dialog has two tabs:
   - **Paste a URL** — a server function fetches the page, detects PDF
     vs HTML, and returns clean text.
   - **Upload a PDF** — parsed in-browser with `pdfjs-dist`, chunked,
     and never sent unprocessed.
   Each new upload also creates a blank row in the local research
   database (see step 6).

5. **AI relevance scoring.**
   Once text is extracted, `analyzePaper` calls IBM watsonx
   (`ibm/granite-3-8b-instruct`) with the paper text and the user's
   research brief. It returns a relevance score (0–100), topical tags,
   and a plain-language excerpt, which are attached to the paper and
   shown on its card.

6. **Research database row per paper.**
   Every uploaded paper gets a structured row with fields for: title,
   summary, methodology summary, research approach, outcome, research
   alignment, relevance score, user comments, and custom tags. The
   dashboard renders this as a table beneath the library grid so the
   user can see all papers' metadata at a glance. Columns are
   pre-created and ready for AI extraction or manual edits.

7. **Inline custom tagging.**
   The last column of each row is an inline tag editor. The user can
   add custom tags such as "Review of literature", "Hypothesis
   framework", "Results discussion", "Methodology", "Background", or
   "Idea" — useful for mapping each paper to a chapter or section of
   the final write-up. Tags can be removed individually.

8. **Paper detail and grounded chat.**
   Clicking a card opens `/papers/$paperId`, which shows the paper
   metadata and a chat panel. `askWatsonx` retrieves the most relevant
   chunks (keyword overlap) and answers questions with `[1]`, `[2]`
   style citations pointing back to those chunks — no hallucinated
   references.

9. **Edit research context any time.**
   The sidebar exposes "Edit context", which routes to
   `/research-context` so the user can update the brief; subsequent
   analyses and chats use the new context.

10. **Sign out.**
    Available from the sidebar; clears the Supabase session.

## Tech stack

- **Framework:** TanStack Start v1 (React 19, file-based routing,
  server functions)
- **Build tool:** Vite 7
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 with semantic design tokens (oklch)
- **UI primitives:** shadcn/ui on top of Radix UI
- **Backend:** Lovable Cloud (managed Supabase — Postgres, Auth, Row Level
  Security)
- **Authentication:** Supabase Auth, email OTP (passwordless)
- **AI model:** IBM watsonx, `ibm/granite-3-8b-instruct` via the watsonx
  Text Generation API
- **PDF parsing:** pdfjs-dist in the browser, plus server-side fetch for
  URL-based ingestion
- **Local persistence:** localStorage paper store
- **Deployment target:** Cloudflare Workers (edge SSR)

## Project layout

```
src/
  routes/                       File-based routes (TanStack Start)
    __root.tsx                  SSR shell and providers
    index.tsx                   Landing page
    login.tsx                   Email OTP sign-in
    _authenticated.tsx          Sidebar layout and auth guard
    _authenticated/
      onboarding.tsx            Research brief capture
      dashboard.tsx             Library and research database
      papers.$paperId.tsx       Paper detail and chat
      research-context.tsx      Edit research brief
  server/
    watsonx.server.ts           IAM token cache and raw watsonx call
    watsonx.functions.ts        askWatsonx, analyzePaper, fetchPaperFromUrl
  components/                   AppSidebar, PaperCard, UploadPaperDialog,
                                ChatBox, and shadcn/ui primitives
  lib/                          auth, store, pdf, types, utils
  integrations/supabase/        Auto-generated client and types
  styles.css                    Tailwind v4 and design tokens

supabase/migrations/            Profiles table and research_context column
```

## Environment variables

Server-only secrets (never prefixed with `VITE_`):

- `WATSONX_API_KEY` — IBM Cloud IAM API key
- `WATSONX_PROJECT_ID` — watsonx project ID
- `WATSONX_REGION` — optional, defaults to `us-south`

Client-safe variables (auto-managed by Lovable Cloud):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Getting started

```
bun install
bun run dev          # http://localhost:5173
bun run build        # production build (Cloudflare Worker target)
bun run preview      # preview the built app
```

## License

MIT.
