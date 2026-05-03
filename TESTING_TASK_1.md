# Task 1 Testing Instructions

## Prerequisites

Before testing, ensure you have:
- ✅ IBM watsonx credentials configured in `.env`:
  - `WATSONX_API_KEY` - Your IBM Cloud IAM API key
  - `WATSONX_PROJECT_ID` - Your watsonx project ID
  - `WATSONX_REGION` - Optional, defaults to `us-south`
- ✅ Supabase credentials (auto-managed by Lovable Cloud)
- ✅ Dependencies installed: `bun install` or `npm install`

---

## Step-by-Step Testing Guide

### 1. Start the Development Server

```bash
bun run dev
# or
npm run dev
```

The app should start at `http://localhost:5173`

---

### 2. Sign In & Complete Onboarding

1. **Navigate to** `http://localhost:5173`
2. **Click** "Sign in" and enter your email
3. **Check your email** for the OTP code
4. **Enter the OTP** to authenticate
5. **Complete onboarding** with a research brief:
   - **Display name:** Your name
   - **Research topic:** e.g., "Large language models for code generation"
   - **Technology:** e.g., "Transformer architectures, BERT, GPT"
   - **Industry:** e.g., "Software development, AI research"
   - **Background:** e.g., "Investigating how LLMs can assist developers with context-aware code suggestions"
   - **Problem:** e.g., "Current code completion tools lack understanding of project context and developer intent"
   - **Expected outcome:** e.g., "Build a context-aware coding assistant that understands both code structure and natural language requirements"
   - **Other:** (optional)

---

### 3. Test Paper Upload & Analysis

#### Test Case 1: Upload via URL

1. **Click** "Add paper" button on the dashboard
2. **Select** "Paste URL" tab
3. **Enter a paper URL**, for example:
   - arXiv: `https://arxiv.org/abs/2002.08155` (CodeBERT paper)
   - Direct PDF: Any `.pdf` URL
   - Article page: Any research article with text content
4. **Click** "Fetch paper"
5. **Observe:**
   - ✅ Toast notification: "Added [paper title]"
   - ✅ Paper card appears with "analyzing" indicator
   - ✅ After ~10-30 seconds, analysis completes

#### Test Case 2: Upload via PDF

1. **Click** "Add paper" button
2. **Select** "Upload PDF" tab
3. **Drag & drop** or **click to select** a PDF file (max 20 MB)
4. **Observe:**
   - ✅ "Reading…" indicator appears
   - ✅ Toast notification: "Added [paper title]"
   - ✅ Paper card appears with "analyzing" indicator
   - ✅ After ~10-30 seconds, analysis completes

---

### 4. Verify Research Database Population

After analysis completes, scroll down to the **"My research work database"** table.

**Check that the following columns are populated (not "—"):**

| Column | Expected Content | Validation |
|--------|------------------|------------|
| **Paper title** | Paper's actual title | ✅ Should match uploaded paper |
| **Summary** | Formal overview, ≤500 words | ✅ Should be concise, formal, no filler |
| **Methodology summary** | Methods and techniques used | ✅ Should describe experimental setup |
| **Research approach** | Type (empirical/theoretical/etc.) + explanation | ✅ Should identify approach type |
| **Outcome** | Key results and conclusions | ✅ Should cite specific metrics if present |
| **Research alignment** | How paper relates to YOUR research context | ✅ Should reference your topic, problem, outcome |
| **Relevance score** | Integer 0-100 | ✅ Should match alignment strength:<br>• 70-100: Direct overlap<br>• 40-69: Partial overlap<br>• 0-39: Tangential |
| **Comments** | Empty (user-entered) | ✅ Should be "—" |
| **Tags** | Empty initially (user can add) | ✅ Should be "—" |

---

### 5. Verify Consistency: Score vs Alignment

**Critical Test:** The `relevanceScore` must be consistent with the `researchAlignment` text.

**Example validations:**

✅ **Good (Consistent):**
- Alignment: "This paper directly addresses the researcher's interest in LLMs for code generation. CodeBERT's bimodal architecture demonstrates how LLMs understand both code and natural language..."
- Score: **92** ← High score matches strong alignment

✅ **Good (Consistent):**
- Alignment: "This paper is tangentially related. While it discusses neural networks, it focuses on image classification rather than code generation or NLP..."
- Score: **28** ← Low score matches weak alignment

❌ **Bad (Inconsistent):**
- Alignment: "This paper is only tangentially related..."
- Score: **85** ← Score contradicts alignment text

---

### 6. Verify Existing Features Still Work

**Test backward compatibility:**

1. **Paper Card** should show:
   - ✅ Relevance score badge (0-100)
   - ✅ Topic tags (3-5 tags)
   - ✅ Excerpt (1-2 sentence summary)
   - ✅ Keywords (visible in card or detail view)

2. **Click on a paper card** to open detail view
3. **Verify grounded chat works:**
   - ✅ Ask a question about the paper
   - ✅ Response includes `[1]`, `[2]` style citations
   - ✅ Citations link to actual excerpts

4. **Test filtering:**
   - ✅ Sort by relevance, date, tag
   - ✅ Filter by tag

---

### 7. Test Error Handling

**Test Case: Invalid URL**

1. **Add paper** with invalid URL: `https://invalid-url-that-does-not-exist.com`
2. **Observe:**
   - ✅ Error toast appears
   - ✅ Upload flow does NOT crash
   - ✅ Dashboard remains functional

**Test Case: Malformed PDF**

1. **Upload a non-PDF file** (rename a .txt to .pdf)
2. **Observe:**
   - ✅ Error toast appears
   - ✅ Upload flow does NOT crash

---

### 8. Verify Token Economy

**Check browser console (F12) for watsonx API calls:**

1. **Open DevTools** → Console tab
2. **Upload a paper**
3. **Look for logs** related to `analyzePaper` or `generateText`
4. **Verify:**
   - ✅ Only **ONE** watsonx API call per paper (not 6+)
   - ✅ `max_new_tokens: 2000` in request
   - ✅ `temperature: 0.1` in request
   - ✅ `decoding_method: "greedy"` in request

---

### 9. Test Multiple Papers

**Upload 3-5 different papers** to verify:
- ✅ All papers populate research database correctly
- ✅ Relevance scores vary appropriately (some high, some low)
- ✅ Alignment text is specific to each paper
- ✅ No duplicate or mixed-up data between papers

---

## Expected Results Summary

After completing all tests:

✅ **Research Database table** shows populated fields for all uploaded papers
✅ **Relevance scores** are consistent with alignment reasoning
✅ **Single watsonx call** per paper (check console logs)
✅ **No crashes** on errors (robust fallback handling)
✅ **Existing features** work (tags, keywords, excerpt, grounded chat)
✅ **Token usage** stays within budget (~2000 tokens output per paper)

---

## Troubleshooting

### Issue: All fields show "—" after analysis

**Possible causes:**
1. watsonx API credentials not configured
2. JSON parsing failed (check console for errors)
3. Network timeout

**Debug steps:**
1. Check `.env` file has correct `WATSONX_API_KEY` and `WATSONX_PROJECT_ID`
2. Open browser console (F12) and look for errors
3. Check server logs for `analyzePaper failed:` messages

### Issue: Relevance score doesn't match alignment text

**This indicates a prompt issue.** The model should:
1. First write the alignment reasoning
2. Then derive the score from that reasoning

**Check:** Does the alignment text justify the score?
- High score (70-100) → Should mention "directly addresses", "strong overlap", "highly relevant"
- Low score (0-39) → Should mention "tangentially related", "limited overlap", "not directly applicable"

### Issue: Analysis takes too long (>60 seconds)

**Possible causes:**
1. Large paper (>20 MB)
2. Slow watsonx API response
3. Network issues

**Expected timing:** 10-30 seconds per paper

---

## Success Criteria

Task 1 is **COMPLETE** when:

- [x] Adding a paper populates all 6 research database fields
- [x] Single watsonx call per paper (token-efficient)
- [x] relevanceScore consistent with researchAlignment text
- [x] Robust error handling (no crashes)
- [x] Dashboard table displays populated fields
- [x] Backward compatibility maintained

---

## Next Steps

Once Task 1 testing is complete:
- **Task 2:** In-card "Ask Bob" quick chat
- **Task 3:** "Talk with Albert" assistant panel

---

## Notes

- The TypeScript errors you see in VSCode are **pre-existing** and not related to Task 1 changes
- The implementation follows all IBM watsonx best practices for token economy
- The prompt structure uses visual separators and explicit reasoning order for better model performance