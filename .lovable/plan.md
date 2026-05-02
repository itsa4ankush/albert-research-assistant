
# Albert — AI paper companion (hackathon MVP)

A 5-page app that lets a user sign in (mock), upload a research PDF, and chat with it using IBM watsonx.

## Stack & key decisions

- **Framework**: TanStack Start (this project's stack) — file-based routes in `src/routes/`, no react-router-dom, no separate Vite scaffold needed.
- **Persistence**: `localStorage` only (no backend DB this round). Each "user" and their papers/chats live in the browser.
- **Auth**: mock — a sign-in form that stores `{ name, email }` in `localStorage`. A small `useAuth` hook gates protected routes. Clearly labeled "Demo auth" in the UI.
- **AI**: IBM watsonx, called from a **server function** (`createServerFn`). The API key + project ID live in server-side secrets — never shipped to the browser.
- **PDF parsing**: `pdfjs-dist` in the browser. Extract text, chunk it, send relevant chunks to watsonx with the user's question.
- **Styling**: Tailwind v4 (already configured) + existing shadcn/ui components.

## Pages & routes

```text
src/routes/
  __root.tsx            existing shell + Navbar
  index.tsx             Landing (hero, "Try Albert" CTA)
  login.tsx             Mock sign-in (name + email)
  onboarding.tsx        3-step intro after first login (name confirm → interests → first upload prompt)
  dashboard.tsx         Grid of PaperCards + "Upload paper" button
  papers.$paperId.tsx   Paper detail: metadata, extracted text preview, ChatBox
```

Protected routes (`onboarding`, `dashboard`, `papers/$paperId`) use a `beforeLoad` guard that redirects to `/login` if no mock session exists.

## Components

- `Navbar` — logo, nav links, user menu (sign out).
- `PaperCard` — title, upload date, snippet, click → detail.
- `UploadPaperDialog` — drag-and-drop PDF, parses client-side, saves to localStorage.
- `ChatBox` — message list + input, calls the watsonx server function, streams tokens into the latest assistant message.
- `EmptyState` — shown on dashboard when no papers exist.

## Data shape (localStorage)

```text
albert.session       { name, email, createdAt }
albert.papers        Paper[]   // { id, title, filename, uploadedAt, fullText, chunks }
albert.chats         Record<paperId, Message[]>   // { role, content, ts }
```

`fullText` and `chunks` are stored client-side; server only sees the chunks sent with each question.

## watsonx integration

- Server function `askWatsonx({ question, contextChunks, history })` in `src/server/watsonx.functions.ts`.
- Calls `https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-05-29` (region configurable).
- Auth: exchanges `WATSONX_API_KEY` for an IAM bearer token (cached in-memory until expiry), then sends `{ model_id, project_id, input, parameters: { max_new_tokens, temperature } }`.
- Default model: `ibm/granite-3-8b-instruct` (configurable via one constant).
- Returns generated text + token usage. Errors surface as a typed `{ data: null, error: string }` shape so the chat UI can show a friendly message.
- A simple system prompt frames Albert as a research assistant grounded in the supplied chunks; chunks are scored by naive keyword overlap with the question (no vector DB this round).

## Secrets needed

- `WATSONX_API_KEY` — your IBM Cloud IAM API key (**rotate the one you pasted first**).
- `WATSONX_PROJECT_ID` — your watsonx project ID.
- `WATSONX_REGION` — optional, defaults to `us-south`.

I'll request these via the secret manager after you confirm the plan.

## Out of scope (call out for later rounds)

- Real auth (App ID / Supabase) — swap the `useAuth` hook; UI stays the same.
- Server-side persistence — replace the localStorage layer with server functions hitting IBM Cloud DB.
- Vector embeddings + retrieval — currently keyword chunking only.
- Multi-paper chat, citations with page numbers, PDF viewer pane.

## Build order

1. Secrets prompt + `src/server/watsonx.server.ts` (token cache) + `watsonx.functions.ts` (askWatsonx). Smoke-test with a hello-world prompt.
2. Mock auth: `useAuth` hook, `/login`, route guards.
3. Landing page + Navbar.
4. Dashboard + UploadPaperDialog + PDF parsing util (`pdfjs-dist`).
5. Paper detail page + ChatBox wired to `askWatsonx`.
6. Onboarding flow.
7. Polish: empty states, loading skeletons, error toasts.
