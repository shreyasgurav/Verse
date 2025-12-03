# Multi-Tab Testing Guide

## Quick Test (5 minutes)

### Test 1: Basic Tab Isolation
1. Open Tab 1, send: "open LinkedIn"
2. Open Tab 2, send: "open Instagram"
3. Open Tab 3, send: "hey"

**Expected**:
- ✅ Each tab shows only its own messages
- ✅ No cross-contamination
- ✅ All tasks complete successfully

**Console Check**:
```
🔒 Using forced tab ID: 281996733
✅ Reset UI states for tab: 281996733
🔍 Checking executor status for tab: 281996733
```

---

### Test 2: Fast Tab Switching During Execution
1. Open Tab 1, send: "open LinkedIn"
2. **Immediately** open Tab 2 (before Tab 1 finishes)
3. Check Tab 2 UI

**Expected**:
- ✅ Tab 2 is clean (empty)
- ✅ Input is enabled
- ✅ Send button visible (not stop)
- ✅ No thinking block from Tab 1

4. Switch back to Tab 1 (might still be executing)

**Expected**:
- ✅ Thinking block visible if still running
- ✅ Stop button visible if still running
- ✅ Input disabled if still running
- ✅ OR final message if completed

**Console Check**:
```
⚠️ Tab mismatch detected! Active: 281996734 Current: 281996733
Reinitializing for correct tab...
🔒 Using forced tab ID: 281996734
```

---

### Test 3: Background Task Completion
1. Open Tab 1, send: "open LinkedIn"
2. **Immediately** open Tab 2, send: "open Instagram"
3. **Immediately** open Tab 3, send: "hey"
4. Wait 10 seconds (all tasks should complete in background)
5. Switch to Tab 1

**Expected**:
- ✅ Final message visible immediately
- ✅ Thinking block visible (collapsed)
- ✅ Input enabled
- ✅ Send button visible

6. Switch to Tab 2

**Expected**:
- ✅ Final message visible immediately
- ✅ No delay or blank screen

**Console Check**:
```
✅ Reloaded 1 new messages from storage
📊 Executor status: running: false steps: 0
⏹️ Executor is not running, UI should be idle
```

---

### Test 4: Memory Cleanup
1. Open background console: Right-click extension → Inspect
2. Run 3 tasks in 3 different tabs
3. Wait 2 minutes

**Expected**:
```
🧹 Cleaned up idle browser context for tab 281996733 after 1 minute
🧹 Cleaned up idle browser context for tab 281996734 after 1 minute
🧹 Cleaned up idle browser context for tab 281996735 after 1 minute
```

4. Wait 4 more minutes (6 minutes total)

**Expected**:
```
🧹 Cleaned up idle executor for tab 281996733 after 5 minutes
🧹 Cleaned up idle executor for tab 281996734 after 5 minutes
🧹 Cleaned up idle executor for tab 281996735 after 5 minutes
```

---

## Stress Test (10 minutes)

### Test 5: Rapid Tab Creation
1. Open 5 tabs quickly (within 5 seconds)
2. In each tab, send a task:
   - Tab 1: "open LinkedIn"
   - Tab 2: "open Instagram"
   - Tab 3: "open GitHub"
   - Tab 4: "hey"
   - Tab 5: "hello"

3. Rapidly switch between all tabs while tasks are executing

**Expected**:
- ✅ Each tab shows correct content
- ✅ No cross-contamination
- ✅ UI state matches executor state
- ✅ No errors in console

**Console Check**:
```
[background] check_executor_status 281996733 running: true steps: 3
[background] check_executor_status 281996734 running: true steps: 2
[background] check_executor_status 281996735 running: false steps: 0
```

Each tab ID should be unique and correct!

---

## Edge Cases

### Test 6: Close Tab During Execution
1. Open Tab 1, send: "open LinkedIn"
2. Close Tab 1 immediately (while executing)
3. Check background console

**Expected**:
```
[background] No active ports found for task session (original tab: 281996733)
```

Task should complete in background, no errors.

---

### Test 7: Reopen Tab After Task Completion
1. Open Tab 1, send: "open LinkedIn"
2. Close Tab 1
3. Wait for task to complete (check background console)
4. Open new tab (Tab 2)
5. Check if Tab 2 is clean

**Expected**:
- ✅ Tab 2 is completely clean
- ✅ No messages from Tab 1
- ✅ Fresh state

---

### Test 8: Follow-Up Tasks
1. Open Tab 1, send: "hey"
2. Wait for completion
3. Send follow-up: "open LinkedIn"
4. Wait for completion
5. Send another follow-up: "go to my profile"

**Expected**:
- ✅ All messages in same session
- ✅ Follow-up mode works
- ✅ All thinking blocks visible

---

## Performance Test

### Test 9: Memory Usage
1. Open Chrome Task Manager: `Shift + Esc`
2. Find extension in list
3. Note initial memory: ~___MB
4. Run 5 tasks across 5 tabs
5. Note memory after tasks: ~___MB
6. Wait 2 minutes
7. Note memory: ~___MB (should decrease)
8. Wait 4 more minutes
9. Note memory: ~___MB (should decrease more)

**Expected Memory**:
- Initial: 50-100MB
- After 5 tasks: 200-300MB
- After 2 min: 150-200MB (contexts cleaned)
- After 6 min: 80-120MB (executors cleaned)

---

## Failure Scenarios

### What to Look For

**❌ FAIL Signs**:
- Tab 2 shows Tab 1's thinking block
- Input enabled during execution
- Stop button missing during execution
- Messages don't appear until second tab switch
- Console shows wrong tab IDs in executor status checks
- Memory never decreases
- Errors about "Cannot read property of undefined"

**✅ PASS Signs**:
- Each tab completely isolated
- UI state always matches executor state
- Messages appear immediately on tab switch
- Correct tab IDs in all console logs
- Memory decreases after timeouts
- No errors in console

---

## Console Log Patterns

### Good Patterns ✅
```
🔒 Using forced tab ID: 281996733
✅ Reset UI states for tab: 281996733
🔍 Checking executor status for tab: 281996733
📊 Executor status: running: true steps: 3
✅ Executor is running, updating UI state
✅ Reloaded 1 new messages from storage
🧹 Cleaned up idle browser context for tab 281996733
```

### Bad Patterns ❌
```
⚠️ Tab mismatch detected! Active: 281996734 Current: 281996733
[background] check_executor_status 281996733 running: true steps: 3
// ^ While you're on Tab 281996734! Wrong tab!

[background] No active ports found for task session
// ^ Repeatedly during execution

TypeError: Cannot read property 'isRunning' of undefined
// ^ Executor not found
```

---

## Reporting Issues

If you find issues, report:

1. **Which test failed**: Test number and step
2. **Console logs**: Last 50 lines from both:
   - Side panel console (F12 on side panel)
   - Background console (Inspect extension)
3. **Tab IDs**: Note which tabs were involved
4. **Timing**: When did it happen (immediately, after delay, etc.)
5. **Screenshot**: If UI looks wrong

---

## Success Criteria

All tests must pass with:
- ✅ No cross-tab contamination
- ✅ UI state always correct
- ✅ Messages appear immediately
- ✅ Memory cleanup works
- ✅ No console errors
- ✅ Correct tab IDs in all logs

If all tests pass, the multi-tab system is **PRODUCTION READY**! 🎯
