Albert — Research Alignment Engine
> **📦 Submission Deliverable:** All Bob session logs and task screenshots are available in the `Submission Deliverable/bob_sessions/` folder.
> **⚠️ Performance Note:** AI responses may be delayed when processing large documents or during periods of high token usage. Please allow extra time for analysis of lengthy papers.
---
🎉 CSV Migration Complete!
Albert now runs 100% locally with CSV storage:
✅ Browser localStorage - No external database required
✅ CSV Export - Download your research data anytime
✅ Cross-tab Sync - Changes sync across browser tabs
✅ Delete Functionality - Remove papers with confirmation
✅ Simplified Stack - No IBM Cloud, Supabase, or PostgreSQL needed
Previous IBM Hackathon features (Tasks 1-3) remain available in git history.
---
Context
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
Problem
Literature review today suffers from three concrete problems:
Relevance is opaque. A paper's abstract rarely tells you whether it
fits your specific research question. Researchers waste hours reading
papers that turn out to be tangential.
Notes live everywhere. Summaries, methodology notes, tags, and
chapter assignments are scattered across PDFs, sticky notes, and
spreadsheets. There is no single structured record per paper.
AI answers cannot be trusted without grounding. Generic chat-with-PDF
tools hallucinate citations and conflate sources. Researchers need
answers tied back to specific passages they can verify.
Albert addresses all three: per-paper relevance scoring against a stated
brief, a structured research database row per paper, and grounded chat with
citations to the underlying chunks.
---
🚀 IBM Hackathon Features
✅ Task 1: Auto-fill Research Database
Single watsonx.ai API call populates 6 fields per paper:
Relevance Score (0-100)
Research Alignment (reasoning)
Key Findings
Methodology Summary
Limitations
Future Directions
Implementation: `src/server/watsonx.functions.ts` - `analyzePaper()`
Uses IBM Granite 3 8B Instruct model
Structured JSON response
Token-optimized prompts
Consistent scoring with reasoning
✅ Task 2: In-card "Ask Bob" Quick Chat
Fast Q&A directly on paper cards:
Collapsible interface on each paper card
Context-aware responses using 3 relevant chunks
Powered by IBM watsonx.ai
No page navigation needed
Implementation: `src/components/PaperCard.tsx`
Uses `pickRelevantChunks()` for context selection
Calls `askWatsonx()` server function
Local state per card
✅ Task 3: "Talk with Albert" Assistant
Cross-database research assistant:
Chat across ALL papers in your library
Context matching via keyword scoring
Conversation history maintained
Suggested questions for empty state
Implementation: `src/components/AlbertAssistant.tsx`
Sheet component from Radix UI
Uses 5 most relevant chunks across database
Stores chat history in database
Integrated in dashboard sidebar
---
🏗️ Current Architecture
Local-First Stack:
✅ Browser localStorage - All data stored locally
✅ CSV Export/Import - Portable research data
✅ No Backend Required - Pure client-side storage
✅ Cross-tab Sync - StorageEvent API for real-time updates
✅ Polling Fallback - 3-second intervals for same-tab updates
Storage Keys:
`albert.csv.researchers` - User profiles and research context
`albert.csv.papers` - Papers, chunks, and analysis data
Previous IBM Stack (Available in Git History):
The application previously integrated with IBM Cloud services. See git history for:
IBM watsonx.ai integration
IBM Cloud Object Storage
IBM Databases for PostgreSQL
IBM Code Engine deployment
---
Scope
In scope for the current version:
Passwordless email OTP authentication (Supabase + IBM ready)
One-time onboarding to capture the user's research brief
(topic, technology, industry, background, problem, expected outcome)
Paper ingestion via URL (server fetches HTML or PDF) or direct PDF upload
(parsed in-browser)
AI relevance scoring (0–100) with 6 auto-filled database fields ✅
A structured research database row per paper with fields for title,
summary, methodology summary, research approach, outcome, research
alignment, relevance score, user comments, and custom tags
Inline custom tagging on each row (e.g. "Review of literature",
"Hypothesis framework", "Results discussion")
In-card "Ask Bob" quick chat on every paper card ✅
"Talk with Albert" cross-database assistant ✅
Grounded chat with `[n]` citations to retrieved chunks
Library dashboard with filtering, sorting, and tag filters
Editable research context from the sidebar
CSV export functionality for research data ✅
Delete papers with confirmation dialog ✅
Out of scope for now:
Vector embeddings and semantic retrieval (currently keyword overlap)
Page-level citations with an inline PDF viewer
Shareable read-only library links
Streaming chat responses
Collaboration and shared workspaces
---
What has been built — process workflow
The current build covers the end-to-end flow from sign-in to a structured,
taggable research database with AI-powered features. Step by step:
Sign in (passwordless).
The user lands on the marketing page and signs in via email OTP
(Supabase Auth). No passwords, no Google OAuth required.
Onboarding — capture the research brief.
First-time users are routed to `/onboarding` and fill in a short brief:
display name, thesis or research topic, technology, industry,
background, problem being solved, expected outcome, and any other
comments. The brief is stored in the `profiles.research_context` JSONB
column. Returning users skip this step automatically.
Library dashboard.
After onboarding the user lands on `/dashboard`, which shows their
paper library as a card grid with skeleton loading states, an
empty-state CTA, and tag filters.
Add a paper — URL or PDF.
The "Add paper" dialog has two tabs:
Paste a URL — a server function fetches the page, detects PDF
vs HTML, and returns clean text.
Upload a PDF — parsed in-browser with `pdfjs-dist`, chunked,
and stored in browser localStorage.
Each new upload also creates a new entry in the CSV data store.
CSV data storage.
All paper data, chunks, and analysis results are stored in browser
localStorage using two keys:
`albert.csv.researchers` - User profiles
`albert.csv.papers` - Papers and chunks
Data persists across sessions and can be exported as CSV.
Research database row per paper.
Every uploaded paper gets a structured row stored in localStorage.
The dashboard renders this as a table beneath the library grid so
the user can see all papers' metadata at a glance.
Delete papers with confirmation.
Each paper row has a delete button that opens a confirmation dialog.
Deleting a paper removes it from localStorage and updates the UI
automatically across all open tabs.
CSV export functionality.
Users can export their entire research database as CSV files:
Researchers CSV (profiles and context)
Papers CSV (all paper data and analysis)
Downloads are triggered from the dashboard.
Inline custom tagging.
Users can add custom tags such as "Review of literature", "Hypothesis
framework", "Results discussion", "Methodology", "Background", or
"Idea" — useful for mapping each paper to a chapter or section of
the final write-up. Tags can be removed individually.
Paper detail and grounded chat.
Clicking a card opens `/papers/$paperId`, which shows the paper
metadata and a chat panel. `askWatsonx` retrieves the most relevant
chunks (keyword overlap) and answers questions with `[1]`, `[2]`
style citations pointing back to those chunks — no hallucinated
references.
Edit research context any time.
The sidebar exposes "Edit context", which routes to
`/research-context` so the user can update the brief; subsequent
analyses and chats use the new context.
Sign out.
Available from the sidebar; clears the session.
---
Tech stack
Framework: TanStack Start v1 (React 19, file-based routing, server functions)
Build tool: Vite 7
Language: TypeScript (strict mode)
Styling: Tailwind CSS v4 with semantic design tokens (oklch)
UI primitives: shadcn/ui on top of Radix UI
Storage: Browser localStorage with CSV export
Authentication: Simple email-based (no external auth service)
PDF parsing: pdfjs-dist in the browser
Deployment target: Any static hosting (Vercel, Netlify, GitHub Pages)
---
Project layout
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
  functions/
    watsonx.functions.ts        Server functions (moved from src/server/)
  components/
    AppSidebar.tsx              Navigation sidebar
    PaperCard.tsx               Paper card with delete button
    UploadPaperDialog.tsx       Paper upload interface
    AddCustomTagDialog.tsx      Tag management
    ui/                         shadcn/ui primitives
  lib/
    auth.ts                     Simple authentication
    store.ts                    State management with localStorage
    csv-store.ts                CSV data layer (CRUD operations)
    pdf.ts                      PDF parsing and chunking
    types.ts                    TypeScript types
    utils.ts                    Helper functions
  styles.css                    Tailwind v4 and design tokens

Documentation:
  CSV_MIGRATION_PLAN.md         CSV migration strategy
  README.md                     This file
  IBM_BOB_TASK.md               Original IBM Hackathon tasks (historical)
```
---
Environment variables
No environment variables required! All data is stored locally in the browser.
For development:
`NODE_ENV` — Environment (development/production)
`PORT` — Dev server port (default: 5173)
---
Running Locally
> **Note:** IBM Cloud was not available for deployment during development and we exhausted our watsonx.ai token quota. The application is therefore run and demonstrated **locally**. Follow the steps below to get it running on your machine.
Prerequisites
Node.js v18+ or Bun v1.0+
An IBM watsonx.ai account with a valid API key and Project ID
(Get one at dataplatform.cloud.ibm.com)
Step 1 — Clone the repository
```bash
git clone https://github.com/itsa4ankush/albert-research-assistant.git
cd albert-research-assistant
```
Step 2 — Install dependencies
```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```
Step 3 — Configure environment variables
```bash
cp .env.example .env
```
Open `.env` and fill in your IBM watsonx.ai credentials:
```env
WATSONX_API_KEY=your_ibm_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```
WATSONX_API_KEY — IBM Cloud API key (IAM → Manage → API keys)
WATSONX_PROJECT_ID — watsonx.ai project ID (found in your project settings)
WATSONX_URL — Regional endpoint (default: `us-south`; change if your project is in a different region)
Step 4 — Start the development server
```bash
# Using Bun
bun run dev

# Or using npm
npm run dev
```
The app will be available at http://localhost:5173
Step 5 — Open the app
Navigate to `http://localhost:5173`
Sign in with your email (passwordless OTP flow)
Complete onboarding — enter your research topic, background, and goals
Add papers via URL or PDF upload and let Albert analyze them
Optional — Build for production
```bash
bun run build    # Outputs to dist/
bun run preview  # Preview the production build locally
```
Troubleshooting
Error	Fix
`WATSONX_PROJECT_ID is not set`	Make sure `.env` exists and is populated (Step 3)
`WATSONX_API_KEY is not set`	Same as above — check your IBM API key
`IAM token exchange failed`	Your API key may be expired or incorrect
`watsonx generation failed (429)`	Token quota exhausted — wait or use a different project
Port 5173 already in use	Set `PORT=3000` in `.env` and restart
---
📚 Documentation
CSV_MIGRATION_PLAN.md - CSV migration strategy and implementation
IBM_BOB_TASK.md - Historical: Original IBM Hackathon tasks (completed in git history)
---
🎯 CSV Migration Benefits
Advantages:
✅ Zero Dependencies - No external services required
✅ Instant Setup - No configuration needed
✅ Privacy First - All data stays in your browser
✅ Portable - Export/import CSV files anytime
✅ Free Forever - No subscription or API costs
✅ Offline Ready - Works without internet (after initial load)
Data Management:
✅ Cross-tab Sync - Changes sync across browser tabs
✅ Persistent Storage - Data survives browser restarts
✅ CSV Export - Download your research database
✅ Delete Confirmation - Prevent accidental data loss
---
🚀 Deployment
> **Important:** Due to IBM Cloud availability issues and exhausted watsonx.ai token quota, this application was **not deployed to IBM Cloud**. It runs and is demonstrated locally (see [Running Locally](#running-locally) above).
If you wish to deploy to a static host in the future, build the app and push the `dist/` folder:
Vercel:
```bash
npm run build
vercel --prod
```
Netlify:
```bash
npm run build
netlify deploy --prod --dir=dist
```
GitHub Pages:
```bash
npm run build
# Push dist/ folder to gh-pages branch
```
Note: Watsonx.ai server functions require a Node.js-capable host (not a purely static CDN). Use Vercel or Netlify with SSR/serverless support.
---
License
MIT.
---
🎉 Ready to Use!
Albert is now a fully local, privacy-first research assistant. No setup, no configuration, no external dependencies.
Repository: https://github.com/itsa4ankush/albert-research-assistant
---
📜 Historical Note
This application was originally built for the IBM Hackathon with full IBM Cloud integration (watsonx.ai, Cloud Object Storage, PostgreSQL, Code Engine). Those features are preserved in git history. The current version has been simplified to use browser localStorage for a zero-dependency, privacy-first experience.
