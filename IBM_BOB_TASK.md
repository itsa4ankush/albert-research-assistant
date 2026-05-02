# IBM AI Agent "Bob" — Task Brief

> **For the IBM AI Agent (codename: Bob).**
> Before you start, read the project `README.md` end-to-end and explore the repository structure to understand the codebase, conventions, and what has already been built. This document only describes *your* tasks — the existing app context lives in the README.

---

## 1. Repository orientation (read first)

Please read and understand the following before writing any code:

- `README.md` — full project context, problem, scope, tech stack, environment variables, and the **"What has been built — process workflow"** section that walks through the 10-step user journey (sign-in → onboarding → dashboard → paper add → AI scoring → research database → tagging → grounded chat → context editing → sign-out).
- `src/lib/types.ts` — the `Paper` and `ResearchDatabaseRow` types you will populate.
- `src/routes/_authenticated/dashboard.tsx` — the Research Database table UI (the columns you need to fill).
- `src/components/UploadPaperDialog.tsx` — how a paper enters the system (URL or PDF).
- `src/server/watsonx.functions.ts` and `src/server/watsonx.server.ts` — the existing IBM watsonx server-function and IAM/token plumbing. **Reuse this. Do not introduce a second client.**
- `src/components/ChatBox.tsx` and `src/routes/_authenticated/papers.$paperId.tsx` — the existing per-paper chat surface.
- `src/components/PaperCard.tsx` — the paper card on the dashboard (target surface for Task 2).

### What has already been built (summary)

A research-alignment workspace called **Albert** where a signed-in researcher captures a research brief (topic, background, problem, expected outcome, etc.), then adds papers by URL or PDF upload. Each paper is parsed, chunked, scored for relevance against the brief via IBM watsonx (`ibm/granite-3-8b-instruct`), and added to a **Research Database** table with these columns: *Title, Summary, Methodology Summary, Research Approach, Outcome, Research Alignment, Relevance Score, Comments, Custom Tags*. Today the AI fills `relevance`, `tags`, `excerpt`, and `keywords`; the rest of the database columns are rendered as **empty placeholders** waiting for Bob. A grounded chat per paper exists on the paper detail page but **not yet on the card itself**.

---

## 2. Bob's tasks

### Task 1 — Auto-fill the Research Database via IBM watsonx

When a paper is added (URL or PDF), Bob must analyze the paper using IBM watsonx and populate the `researchRecord` columns on the `Paper` object:

| Column | Source | Constraint |
|---|---|---|
| `paperTitle` | from parsed paper | copy as-is |
| `summary` | watsonx | ≤ 500 words, formal, brief |
| `methodologySummary` | watsonx | ≤ 500 words |
| `researchApproach` | watsonx | ≤ 500 words |
| `outcome` | watsonx | ≤ 500 words |
| `researchAlignment` | watsonx (reasoning) | ≤ 500 words; must reference the user's research brief (topic, background, problem, expected outcome, other) |
| `relevanceScore` | watsonx | integer 0–100, **derived from and consistent with** the `researchAlignment` reasoning |
| `comments` | user-entered | leave empty for Bob |
| `customTags` | user-entered | leave empty for Bob |

Requirements:

- **One watsonx call per paper** that returns a single JSON object covering all six AI fields. Do **not** issue six separate calls.
- **Token economy:** keep prompts compact, truncate paper text sensibly (the existing `analyzePaper` already truncates to ~12k chars — follow the same pattern), use `decoding_method: "greedy"`, low `temperature`, and a tight `max_new_tokens` budget.
- **Style:** brief, precise, formal. No marketing language, no bullet padding, no repeating the question.
- **Reasoning then score:** the model must reason about alignment first, then emit `relevanceScore` consistent with that reasoning. Do not let the score and the alignment text disagree.
- **Robustness:** if JSON parsing fails, fall back to empty strings and a `null` score — never crash the upload flow. Log the failure server-side.
- **Where it runs:** extend `src/server/watsonx.functions.ts` (e.g. add a new `analyzePaperFull` server function, or extend `analyzePaper`) and call it from the upload pipeline alongside the existing relevance/tags/keywords analysis. Persist the result onto `paper.researchRecord` so the dashboard table renders it automatically.

### Task 2 — In-card "Ask Bob" quick chat

Add an IBM watsonx-backed quick-question affordance **inside the paper card on the dashboard** (`src/components/PaperCard.tsx`), not only on the paper detail page.

Requirements:

- A small input ("Ask a quick question about this paper…") and a send button on the card, expandable/collapsible so the card stays compact.
- On submit, call the existing `askWatsonx` server function (`src/server/watsonx.functions.ts`) with the question and a small set of relevant excerpts from `paper.chunks` selected via `pickRelevantChunks` (already implemented in `src/lib/pdf.ts`).
- Render the answer inline under the input. Keep it short — this is a quick-lookup surface, not a full conversation. For longer threads the user can still open the paper detail page where `ChatBox` lives.
- Reuse design tokens from `src/styles.css`. No new colour values in the component.
- Do not duplicate the `ChatBox` component — extract a minimal `QuickAskBox` if needed, or inline a small controlled form. Keep state local to the card.

---

## 3. Out of scope for Bob

- No schema migrations, no new database tables — `researchRecord` already lives on the `Paper` type and is persisted by the existing local store.
- No changes to auth, onboarding, or the research-context editor.
- No new AI provider — IBM watsonx (`ibm/granite-3-8b-instruct`) only, via the existing server functions.
- No streaming UI; a single response per call is fine.

---

## 4. Definition of done

- Adding a new paper (URL or PDF) results in a Research Database row where Summary, Methodology Summary, Research Approach, Outcome, Research Alignment, and Relevance Score are all populated by watsonx, and the score is consistent with the alignment text.
- The dashboard paper card exposes a working "Ask Bob" quick-question box that returns a grounded answer from the paper's own excerpts.
- No regressions to existing relevance scoring, tags, keywords, grounded chat on the detail page, or the upload flow.
- Token usage per paper analysis stays within a tight budget (single call, capped `max_new_tokens`).
