# Task 3 Testing Instructions — "Talk with Albert" Assistant Panel

## Prerequisites

Same as Tasks 1 & 2:
- ✅ IBM watsonx credentials configured in `.env`
- ✅ Supabase credentials (auto-managed)
- ✅ Dependencies installed
- ✅ At least 2-3 papers uploaded to the dashboard

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

### 2. Locate the "Talk with Albert!" Button

**On the dashboard (`/dashboard`):**

1. **Scroll down** to the "My research work database" section
2. **Locate the prominent button** on the right side of the section header
3. **Verify you see:**
   - ✅ Large coral-colored button (h-14, prominent)
   - ✅ UserRound icon on the left
   - ✅ Text: "Talk with Albert!"
   - ✅ Hover effect: button lifts up with shadow
   - ✅ Icon scales on hover

---

### 3. Test Panel Opening

**Test Case 1: Open Panel**

1. **Click** "Talk with Albert!" button
2. **Observe:**
   - ✅ Sheet/slide-over panel opens from the right side
   - ✅ Panel has coral accent header with UserRound icon
   - ✅ Title: "Talk with Albert"
   - ✅ Description: "Ask questions across your entire research database"
   - ✅ Panel width is appropriate (~max-w-2xl on desktop)
   - ✅ Overlay darkens the background
   - ✅ Close button (X) appears in top-right corner

**Test Case 2: Empty State**

1. **When panel first opens**, verify you see:
   - ✅ Sparkles icon in a coral circle
   - ✅ Heading: "How can I help?"
   - ✅ Description about capabilities
   - ✅ Three suggested questions as clickable buttons:
     - "What are the main methodologies used across my papers?"
     - "Summarize the key findings from my highest-rated papers"
     - "Help me draft an introduction for my research"
   - ✅ Input field at bottom: "Ask Albert anything about your research..."
   - ✅ Paper count displayed: "X papers in your database"

---

### 4. Test Suggested Questions

**Test Case 1: Click Suggested Question**

1. **Click** one of the suggested question buttons
2. **Observe:**
   - ✅ Question text appears in the input field
   - ✅ Cursor is in the input field (ready to edit or send)
   - ✅ Send button is enabled (coral colored)

**Test Case 2: Send Suggested Question**

1. **Click** a suggested question button
2. **Click** the Send button (or press Enter)
3. **Observe:**
   - ✅ User message appears on the right (coral background)
   - ✅ Loading indicator appears (Albert icon + "Thinking...")
   - ✅ After ~5-15 seconds, assistant response appears on the left
   - ✅ Response has border and card background
   - ✅ Response is relevant to the question and references your papers

---

### 5. Test Custom Questions

**Test Case 1: Cross-Database Question**

1. **Type** a question: "What are the common themes across all my papers?"
2. **Click** Send
3. **Observe:**
   - ✅ Question appears as user message (right side, coral)
   - ✅ Loading state shows
   - ✅ Response synthesizes information from multiple papers
   - ✅ Response may mention specific paper titles
   - ✅ Response is coherent and relevant

**Test Case 2: Specific Paper Question**

1. **Type** a question about a specific paper: "What methodology did [Paper Title] use?"
2. **Click** Send
3. **Observe:**
   - ✅ Response focuses on that specific paper
   - ✅ Response includes relevant details from the paper
   - ✅ If paper not found, response says so clearly

**Test Case 3: Research Synthesis Question**

1. **Type**: "Help me write a literature review introduction based on my papers"
2. **Click** Send
3. **Observe:**
   - ✅ Response provides structured text
   - ✅ Response references multiple papers
   - ✅ Response is formatted appropriately for a literature review

---

### 6. Test Conversation Flow

**Test Case 1: Multi-Turn Conversation**

1. **Ask** a question: "What are the main findings in my papers?"
2. **Wait** for response
3. **Ask** a follow-up: "Can you elaborate on the first finding?"
4. **Observe:**
   - ✅ Both messages appear in the conversation
   - ✅ Follow-up response considers previous context
   - ✅ Conversation history is maintained (last 4 messages)
   - ✅ Scroll area works if conversation gets long

**Test Case 2: Long Conversation**

1. **Ask** 5-6 questions in sequence
2. **Observe:**
   - ✅ All messages appear in chronological order
   - ✅ Scroll area allows scrolling through history
   - ✅ Latest message is visible
   - ✅ No performance issues

---

### 7. Test Context Matching

**Test Case 1: Keyword Matching**

1. **Upload papers** with specific keywords (e.g., "machine learning", "neural networks")
2. **Ask**: "What do my papers say about neural networks?"
3. **Observe:**
   - ✅ Response focuses on papers containing "neural networks"
   - ✅ Response cites specific papers by title
   - ✅ Response doesn't hallucinate information not in papers

**Test Case 2: Tag-Based Matching**

1. **Ensure papers have tags** (e.g., "methodology", "empirical")
2. **Ask**: "Show me papers about methodology"
3. **Observe:**
   - ✅ Response references papers with "methodology" tag
   - ✅ Response may mention methodologies from paper summaries

**Test Case 3: Research Record Matching**

1. **Ensure papers have research records** (summary, alignment, etc.)
2. **Ask**: "Which papers are most relevant to my research?"
3. **Observe:**
   - ✅ Response considers relevance scores
   - ✅ Response may reference research alignment text
   - ✅ Response prioritizes high-scoring papers

---

### 8. Test Token Economy

**Open browser DevTools (F12) → Network tab:**

1. **Ask a question**
2. **Filter** for "askWatsonx" requests
3. **Inspect the request payload:**
   - ✅ `contextChunks` array has **≤7 items** (researcher profile + db summary + 5 paper chunks)
   - ✅ `history` array has **≤4 messages** (last 2 turns)
   - ✅ Context is compact (not sending full papers)

**Check server logs:**

1. **Ask multiple questions**
2. **Verify:**
   - ✅ Only **ONE** watsonx call per question
   - ✅ No duplicate or chained calls
   - ✅ Response time is reasonable (~5-15 seconds)

---

### 9. Test Error Handling

**Test Case 1: Empty Input**

1. **Leave input field empty**
2. **Try to click** Send
3. **Observe:**
   - ✅ Send button is disabled (grayed out)
   - ✅ Nothing happens when clicked

**Test Case 2: Network Error**

1. **Disconnect internet** or **stop dev server**
2. **Ask a question**
3. **Observe:**
   - ✅ Error message appears in conversation
   - ✅ Error text starts with "Error:"
   - ✅ Panel doesn't crash
   - ✅ Can try again after reconnecting

**Test Case 3: No Papers in Database**

1. **Delete all papers** from dashboard
2. **Open Albert panel**
3. **Ask a question**
4. **Observe:**
   - ✅ Response acknowledges no papers available
   - ✅ Response suggests uploading papers
   - ✅ No crash or undefined errors

---

### 10. Test Panel Closing

**Test Case 1: Close via X Button**

1. **Open panel** and have a conversation
2. **Click** the X button in top-right
3. **Observe:**
   - ✅ Panel closes smoothly
   - ✅ Conversation history is cleared
   - ✅ Dashboard is still functional

**Test Case 2: Close via Overlay Click**

1. **Open panel**
2. **Click** on the darkened overlay (outside panel)
3. **Observe:**
   - ✅ Panel closes
   - ✅ Conversation is cleared

**Test Case 3: Reopen Panel**

1. **Close panel**
2. **Click** "Talk with Albert!" again
3. **Observe:**
   - ✅ Panel opens fresh (no old messages)
   - ✅ Empty state is shown again
   - ✅ Suggested questions are visible

---

### 11. Test Design Consistency

**Visual inspection:**

1. **Compare Albert panel** with existing UI elements
2. **Check:**
   - ✅ Coral accent color matches "Talk with Albert!" button
   - ✅ UserRound icon is consistent throughout
   - ✅ Border colors match card borders
   - ✅ Background colors match existing backgrounds
   - ✅ Typography (font size, weight) is consistent
   - ✅ Spacing and padding feel natural
   - ✅ Message bubbles have appropriate contrast

**Responsive design:**

1. **Resize browser window** to mobile width (~375px)
2. **Observe:**
   - ✅ Panel takes full width on mobile
   - ✅ Messages stack appropriately
   - ✅ Input and button remain accessible
   - ✅ Scroll works on small screens
   - ✅ No horizontal overflow

---

### 12. Test with Different Database States

**Test Case 1: Single Paper**

1. **Have only 1 paper** in database
2. **Ask**: "Summarize my research"
3. **Observe:**
   - ✅ Response focuses on that single paper
   - ✅ No errors about missing papers

**Test Case 2: Many Papers (10+)**

1. **Upload 10+ papers**
2. **Ask**: "What are the main themes?"
3. **Observe:**
   - ✅ Response synthesizes across multiple papers
   - ✅ Database summary shows "... and X more papers"
   - ✅ Response doesn't try to list all papers

**Test Case 3: Mixed Relevance Scores**

1. **Have papers with varied relevance scores** (20, 50, 90)
2. **Ask**: "Which papers should I focus on?"
3. **Observe:**
   - ✅ Response considers relevance scores
   - ✅ Response may recommend high-scoring papers

---

### 13. Compare with Per-Paper Chat

**Verify Albert is different from paper detail chat:**

1. **Open a paper detail page** (`/papers/$paperId`)
2. **Use the ChatBox** on that page
3. **Compare with Albert panel:**
   - ✅ Paper detail chat: focuses on ONE paper
   - ✅ Albert panel: searches ACROSS ALL papers
   - ✅ Albert panel: can synthesize and compare
   - ✅ Albert panel: can help with research writing

---

## Expected Results Summary

After completing all tests:

✅ **"Talk with Albert!" button** opens the assistant panel  
✅ **Panel UI** matches design system (coral accents, proper spacing)  
✅ **Suggested questions** work and populate input  
✅ **Cross-database search** finds relevant content from multiple papers  
✅ **Conversation flow** maintains context (last 4 messages)  
✅ **Token economy** uses ≤7 context chunks per question  
✅ **Error handling** is robust (no crashes)  
✅ **Panel closing** clears conversation state  
✅ **Responsive design** works on mobile and desktop  
✅ **No regressions** to existing features

---

## Troubleshooting

### Issue: Panel doesn't open

**Possible causes:**
1. JavaScript error in console
2. State management issue
3. Sheet component not rendering

**Debug steps:**
1. Check browser console (F12) for errors
2. Verify `albertOpen` state changes when button clicked
3. Check React DevTools for component tree

### Issue: Responses are not relevant

**Possible causes:**
1. Context matching not finding right papers
2. Question too vague
3. Papers don't contain relevant information

**Expected behavior:**
- If no relevant papers found, Albert should say so
- If question is vague, Albert should ask for clarification
- If papers don't match, Albert should acknowledge limitations

### Issue: Responses are too slow (>30 seconds)

**Possible causes:**
1. Too many context chunks being sent
2. Network latency
3. Watsonx API slow response

**Debug steps:**
1. Check Network tab for request size
2. Verify context chunks ≤7
3. Check server logs for timing

### Issue: Conversation history not working

**Possible causes:**
1. History not being passed to askWatsonx
2. History array too large
3. State not updating correctly

**Expected behavior:**
- Last 4 messages (2 turns) should be included
- Older messages should be dropped
- Each new question should see previous context

---

## Success Criteria

Task 3 is **COMPLETE** when:

- [x] "Talk with Albert!" button opens assistant panel
- [x] Panel has proper UI (header, empty state, suggested questions)
- [x] Cross-database context matching works
- [x] Questions return relevant answers from multiple papers
- [x] Conversation maintains context (last 4 messages)
- [x] Token economy is efficient (≤7 chunks per question)
- [x] Error handling prevents crashes
- [x] Panel closing clears state
- [x] Design matches existing UI patterns
- [x] No regressions to existing features

---

## Next Steps

Once all three tasks are tested:
- **Verify** all features work together
- **Check** for any integration issues
- **Test** complete user workflow: upload → analyze → ask Bob → talk with Albert
- **Review** token usage across all features
- **Prepare** for production deployment

---

## Notes

- TypeScript errors in VSCode are **pre-existing** and not related to Task 3
- The implementation reuses existing `askWatsonx` function with enhanced context
- Context matching uses simple keyword scoring (can be enhanced with embeddings later)
- Token usage per question: ~2000-4000 chars context + ~700 tokens output = very efficient
- The assistant is designed for research synthesis, not just Q&A