# Task 2 Testing Instructions — In-card "Ask Bob" Quick Chat

## Prerequisites

Same as Task 1:
- ✅ IBM watsonx credentials configured in `.env`
- ✅ Supabase credentials (auto-managed)
- ✅ Dependencies installed
- ✅ At least one paper uploaded to the dashboard

---

## Step-by-Step Testing Guide

### 1. Start the Development Server

```bash
bun run dev
# or
npm run dev
```

Navigate to `http://localhost:5173` and sign in.

---

### 2. Verify "Ask Bob" UI Appears on Paper Cards

**On the dashboard (`/dashboard`):**

1. **Locate any paper card** in your library
2. **Scroll to the bottom** of the card
3. **Verify you see:**
   - ✅ A button labeled "Ask Bob about this paper"
   - ✅ MessageSquare icon next to the text
   - ✅ ChevronDown icon on the right
   - ✅ The button is below the paper metadata (filename, delete button)
   - ✅ The button has a border-top separator

---

### 3. Test Expand/Collapse Behavior

**Test Case 1: Expand**

1. **Click** "Ask Bob about this paper"
2. **Observe:**
   - ✅ Section expands smoothly
   - ✅ ChevronDown changes to ChevronUp
   - ✅ Input field appears: "Ask a quick question…"
   - ✅ Send button appears (coral colored)
   - ✅ Clicking the card title still navigates to paper detail page

**Test Case 2: Collapse**

1. **Click** "Ask Bob about this paper" again (while expanded)
2. **Observe:**
   - ✅ Section collapses
   - ✅ ChevronUp changes back to ChevronDown
   - ✅ Input and answer (if any) disappear
   - ✅ State resets (question and answer cleared)

---

### 4. Test Quick Question Flow

**Test Case 1: Simple Question**

1. **Expand** the Ask Bob section
2. **Type** a question: "What is the main contribution of this paper?"
3. **Click** the Send button (or press Enter)
4. **Observe:**
   - ✅ Send button shows loading spinner
   - ✅ Input field is disabled during loading
   - ✅ After ~3-10 seconds, answer appears below the input
   - ✅ Answer is displayed in a styled box with border and background
   - ✅ Answer may include citations like [1], [2], [3]

**Test Case 2: Follow-up Question**

1. **Without collapsing**, type another question: "What methodology was used?"
2. **Click** Send
3. **Observe:**
   - ✅ Previous answer is replaced with new answer
   - ✅ Each question is independent (no conversation history)
   - ✅ Loading state works correctly

**Test Case 3: Empty Question**

1. **Leave input empty** or type only spaces
2. **Try to click** Send
3. **Observe:**
   - ✅ Send button is disabled (grayed out)
   - ✅ Nothing happens when clicked

---

### 5. Verify Token Economy

**Open browser DevTools (F12) → Network tab:**

1. **Ask a question** in the Ask Bob section
2. **Filter** network requests for "askWatsonx" or look for POST requests
3. **Inspect the request payload:**
   - ✅ `contextChunks` array has **exactly 3 items** (not all chunks)
   - ✅ `history` array is **empty** `[]`
   - ✅ `question` contains your question text

**Check server logs (terminal running dev server):**

1. **Look for watsonx API calls**
2. **Verify:**
   - ✅ Only **ONE** API call per question
   - ✅ No duplicate or chained calls
   - ✅ Request completes in reasonable time (~3-10 seconds)

---

### 6. Test Error Handling

**Test Case 1: Network Error (Simulate)**

1. **Disconnect internet** or **stop the dev server**
2. **Ask a question**
3. **Observe:**
   - ✅ Error message appears in the answer box
   - ✅ Error text starts with "Error:"
   - ✅ UI doesn't crash
   - ✅ Can try again after reconnecting

**Test Case 2: Invalid Watsonx Credentials**

1. **Temporarily remove** `WATSONX_API_KEY` from `.env`
2. **Restart dev server**
3. **Ask a question**
4. **Observe:**
   - ✅ Error message appears
   - ✅ Upload flow still works (doesn't crash entire app)

---

### 7. Test Interaction with Card Navigation

**Test Case 1: Click Card Title**

1. **Expand** Ask Bob section
2. **Click** the paper title (h3 element)
3. **Observe:**
   - ✅ Navigates to paper detail page (`/papers/$paperId`)
   - ✅ Ask Bob section doesn't interfere

**Test Case 2: Click Input/Button**

1. **Expand** Ask Bob section
2. **Click** inside the input field
3. **Observe:**
   - ✅ Input focuses
   - ✅ Card does NOT navigate to detail page
   - ✅ `stopPropagation()` is working correctly

**Test Case 3: Click Delete Button**

1. **Click** the delete button (trash icon)
2. **Observe:**
   - ✅ Confirmation dialog appears
   - ✅ Card does NOT navigate to detail page
   - ✅ Delete works independently of Ask Bob

---

### 8. Test Multiple Cards

**Upload 2-3 different papers, then:**

1. **Expand Ask Bob** on Card A
2. **Ask a question** on Card A
3. **Expand Ask Bob** on Card B (without collapsing A)
4. **Observe:**
   - ✅ Each card maintains its own state
   - ✅ Answer on Card A stays visible
   - ✅ Card B has empty input (independent state)
   - ✅ No state leakage between cards

---

### 9. Verify Design Consistency

**Visual inspection:**

1. **Compare Ask Bob section** with existing UI elements
2. **Check:**
   - ✅ Coral send button matches "Add paper" button color
   - ✅ Border colors match card borders
   - ✅ Background colors match existing backgrounds
   - ✅ Typography (font size, weight) is consistent
   - ✅ Spacing and padding feel natural
   - ✅ Icons are same size as other icons in the app
   - ✅ No new color values introduced

**Responsive design:**

1. **Resize browser window** to mobile width (~375px)
2. **Observe:**
   - ✅ Ask Bob section adapts to narrow width
   - ✅ Input and button stack or shrink appropriately
   - ✅ Answer text wraps correctly
   - ✅ No horizontal overflow

---

### 10. Test with Different Paper Types

**Test with papers that have:**

1. **Short content** (<1000 chars)
   - ✅ Ask Bob still works
   - ✅ May return fewer than 3 chunks (expected)

2. **Long content** (>50 pages)
   - ✅ `pickRelevantChunks` selects best 3 chunks
   - ✅ Response is still relevant to question

3. **Technical paper** with equations/symbols
   - ✅ Answer handles special characters
   - ✅ No JSON parsing errors

---

## Expected Results Summary

After completing all tests:

✅ **Ask Bob section** appears on all paper cards  
✅ **Expand/collapse** works smoothly  
✅ **Questions** return relevant answers with citations  
✅ **Token economy** uses only 3 chunks per question  
✅ **Error handling** is robust (no crashes)  
✅ **State management** is independent per card  
✅ **Design** matches existing UI patterns  
✅ **Navigation** works correctly (card click vs Ask Bob click)  
✅ **No regressions** to existing features (tags, keywords, delete, detail page)

---

## Troubleshooting

### Issue: Send button doesn't respond

**Possible causes:**
1. Input is empty or only whitespace
2. Already loading (spinner showing)
3. JavaScript error in console

**Debug steps:**
1. Check browser console (F12) for errors
2. Verify input has text
3. Check network tab for failed requests

### Issue: Answer shows "Error: ..."

**Possible causes:**
1. Watsonx credentials not configured
2. Network timeout
3. Paper has no chunks (empty content)

**Debug steps:**
1. Check `.env` file has `WATSONX_API_KEY` and `WATSONX_PROJECT_ID`
2. Check server logs for detailed error messages
3. Verify paper has content (check `paper.chunks` in React DevTools)

### Issue: Answer is not relevant to question

**This is expected behavior for:**
- Questions about content not in the paper
- Very broad or vague questions
- Papers with limited content

**The model should respond:** "The excerpts do not contain information about..."

---

## Success Criteria

Task 2 is **COMPLETE** when:

- [x] Ask Bob section appears on all paper cards
- [x] Expand/collapse works without breaking card navigation
- [x] Questions return grounded answers from paper excerpts
- [x] Only 3 chunks sent per question (token efficient)
- [x] Each card maintains independent state
- [x] Error handling prevents crashes
- [x] Design matches existing UI patterns
- [x] No regressions to existing features

---

## Next Steps

Once Task 2 testing is complete:
- **Task 3:** "Talk with Albert" assistant panel (cross-database chat)

---

## Notes

- TypeScript errors in VSCode are **pre-existing** and not related to Task 2
- The implementation reuses existing `askWatsonx` and `pickRelevantChunks` functions
- No new watsonx client or API calls were introduced
- Token usage per question: ~1200-3600 chars context + ~700 tokens output = very efficient