# Testing Guide

## Table of Contents
- [Overview](#overview)
- [Memory System Testing](#memory-system-testing)
- [Form Filling Testing](#form-filling-testing)
- [Multi-Tab Testing](#multi-tab-testing)
- [Authentication Testing](#authentication-testing)
- [General Testing](#general-testing)

## Overview

This guide covers testing procedures for Verse extension features. Use these tests to verify functionality after changes or before releases.

## Memory System Testing

### Test 1: Basic Memory Extraction

```bash
# 1. Build the extension
pnpm build

# 2. Load extension in Chrome
# 3. Open side panel
# 4. Send message: "My name is Shreyas"
# 5. Check console for:
Memory added: personal_info - User's name is Shreyas

# 6. Open Memory settings
# 7. Verify memory appears with subcategory "name"
```

### Test 2: Duplicate Prevention

```bash
# 1. Send: "My name is Shreyas"
# 2. Send again: "My name is Shreyas Gurav"
# 3. Check console:
Memory updated: personal_info - User's name is Shreyas Gurav

# 4. Verify only ONE memory exists (not duplicate)
```

### Test 3: Multiple Memory Types

```bash
# Send: "My name is Shreyas, email shreyas@example.com, phone 555-1234"
# Check console shows 3 memories:
# - personal_info/name
# - personal_info/email
# - personal_info/phone
```

### Test 4: Memory Retrieval

```bash
# 1. Save memories first (Test 1-3)
# 2. Send query that should retrieve memories
# 3. Check console for retrieval logs
# 4. Verify memories appear in context
```

## Form Filling Testing

### Test 1: Google Forms - Basic

```bash
# 1. Create a simple Google Form with:
#    - Name field
#    - Email field
#    - Phone field

# 2. Save memories:
#    - "My name is Shreyas"
#    - "My email is shreyas@example.com"
#    - "My phone is 555-1234"

# 3. Open the Google Form
# 4. Click "Fill this Form" button in side panel
# 5. Verify all fields fill correctly
```

### Test 2: Google Forms - Multiple Choice

```bash
# 1. Create form with multiple choice question
# 2. Save preference: "I prefer Python for programming"
# 3. Fill form
# 4. Verify correct option selected
```

### Test 3: Universal Forms - Standard HTML

```bash
# 1. Navigate to any website with a contact form
# 2. Save relevant memories
# 3. Click "Fill this Form"
# 4. Verify fields detect and fill
```

### Test 4: Form Field Matching

```bash
# 1. Save: "My name is Shreyas"
# 2. Open form with field: "Your name"
# 3. Fill form
# 4. Check console for:
#    - Keyword extraction: "name"
#    - Subcategory match: found memory with subcategory="name"
#    - High similarity score (0.95)
```

## Multi-Tab Testing

### Test 1: Tab Isolation

```bash
# 1. Open Tab 1 with website A
# 2. Send message in Tab 1
# 3. Open Tab 2 with website B
# 4. Verify Tab 2 shows empty/new session
# 5. Verify Tab 1 session is preserved
```

### Test 2: Tab Switching

```bash
# 1. Open multiple tabs
# 2. Start conversation in Tab 1
# 3. Switch to Tab 2
# 4. Start new conversation in Tab 2
# 5. Switch back to Tab 1
# 6. Verify correct conversation restored
```

### Test 3: Side Panel Persistence

```bash
# 1. Open side panel on Tab 1
# 2. Start typing a message
# 3. Switch to Tab 2
# 4. Verify side panel updates for Tab 2
# 5. Switch back to Tab 1
# 6. Verify input text restored (if supported)
```

### Test 4: Concurrent Tasks

```bash
# 1. Start task in Tab 1
# 2. Switch to Tab 2
# 3. Start different task in Tab 2
# 4. Verify both tasks run independently
# 5. Verify no interference between tabs
```

## Authentication Testing

### Test 1: Sign-In Flow

```bash
# 1. Clear auth state (sign out if signed in)
# 2. Open side panel
# 3. Click "Sign in with Google"
# 4. Verify auth website opens
# 5. Complete Google sign-in
# 6. Verify redirect back
# 7. Verify extension receives auth data
# 8. Verify authenticated state in extension
```

### Test 2: Sign-Out Flow

```bash
# 1. Sign in first (Test 1)
# 2. Click logout button
# 3. Verify sign-out from Firebase
# 4. Verify extension clears auth state
# 5. Verify side panel shows sign-in button again
```

### Test 3: Auth State Persistence

```bash
# 1. Sign in
# 2. Close browser
# 3. Reopen browser
# 4. Open side panel
# 5. Verify still authenticated
```

### Test 4: Extension Communication

```bash
# 1. Check extension ID in console
# 2. Verify auth website receives extension ID
# 3. Verify messages sent correctly
# 4. Check for any errors in console
```

## General Testing

### Test 1: Extension Load

```bash
# 1. Build extension: pnpm build
# 2. Load in Chrome (chrome://extensions)
# 3. Verify no errors in extension console
# 4. Verify side panel opens
# 5. Verify settings page opens
```

### Test 2: API Key Configuration

```bash
# 1. Open settings page
# 2. Add API key for provider (e.g., OpenAI)
# 3. Select model for planner
# 4. Select model for navigator
# 5. Verify configuration saved
# 6. Verify side panel shows chat interface
```

### Test 3: Basic Chat

```bash
# 1. Configure API keys (Test 2)
# 2. Open side panel
# 3. Send simple message: "Hello"
# 4. Verify response received
# 5. Verify message appears in chat
```

### Test 4: Task Execution

```bash
# 1. Send task: "Navigate to google.com"
# 2. Verify task starts
# 3. Verify progress shown
# 4. Verify task completes
# 5. Verify browser navigates
```

### Test 5: Error Handling

```bash
# 1. Send invalid/unsupported command
# 2. Verify error message shown
# 3. Verify extension doesn't crash
# 4. Verify can continue using
```

## Debugging Tips

### Console Logging

Check browser console for detailed logs:

- **Memory**: `[MemoryRetrieval]`, `Memory extraction`
- **Form Filling**: `[google-forms]`, `[universal-forms]`
- **Auth**: `[Auth]`
- **Tab Management**: `Tab ID:`, `Side Panel Initialization`

### Common Issues

**Memory not saving:**
- Check console for extraction logs
- Verify pattern matching
- Check storage permissions

**Form not filling:**
- Check memory retrieval logs
- Verify embeddings generated
- Check API key configured

**Auth not working:**
- Check extension ID
- Verify manifest `externally_connectable`
- Check Firebase console for errors

**Tab issues:**
- Check tab ID in logs
- Verify side panel initialization
- Check for race conditions

### Storage Inspection

```javascript
// Check memories
chrome.storage.local.get(['verse_memories'], (res) => {
  console.log('Memories:', res.verse_memories);
});

// Check auth state
chrome.storage.local.get(['userId', 'isAuthenticated'], (res) => {
  console.log('Auth:', res);
});

// Check chat history
chrome.storage.local.get(null, (res) => {
  console.log('All storage:', res);
});
```

## Test Checklist

Before releasing:

- [ ] Memory extraction works
- [ ] Memory retrieval works
- [ ] Form filling works (Google Forms)
- [ ] Form filling works (Universal Forms)
- [ ] Multi-tab isolation works
- [ ] Authentication flow works
- [ ] Sign-out works
- [ ] API key configuration works
- [ ] Basic chat works
- [ ] Task execution works
- [ ] Error handling works
- [ ] No console errors
- [ ] No memory leaks
- [ ] Performance acceptable

## Summary

Testing Verse involves:

1. **Memory System**: Extraction, retrieval, matching
2. **Form Filling**: Google Forms and universal forms
3. **Multi-Tab**: Isolation and state management
4. **Authentication**: Sign-in, sign-out, persistence
5. **General**: Load, configuration, chat, tasks

Use console logging and storage inspection for debugging. Follow the test checklist before releases.

