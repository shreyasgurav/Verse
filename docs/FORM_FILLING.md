# Form Filling System

## Table of Contents
- [Overview](#overview)
- [How It Works](#how-it-works)
- [Memory Integration](#memory-integration)
- [Google Forms](#google-forms)
- [Universal Forms](#universal-forms)
- [Implementation Details](#implementation-details)
- [Troubleshooting](#troubleshooting)

## Overview

Verse can intelligently fill out forms using your saved memories. The system supports both Google Forms and universal form filling on any website.

### Features

- **Memory-Powered**: Uses saved memories to fill forms automatically
- **Multi-Strategy Matching**: Keyword, subcategory, and semantic matching
- **Context-Aware**: Understands field labels and questions
- **AI-Powered**: Uses LLM to generate appropriate answers
- **Universal Support**: Works on any website, not just Google Forms

## How It Works

### Form Filling Flow

```
1. User opens form on webpage
    ↓
2. Clicks "Fill this Form" button (in side panel or form UI)
    ↓
3. System detects form fields
    ↓
4. For each field:
   - Extract field label/question
   - Search memories for relevant information
   - Generate answer using AI + memories
   - Fill the field
    ↓
5. Form completed! ✅
```

### Memory Retrieval Process

```
Form Field: "Your name"
    ↓
1. Extract keyword: "name"
    ↓
2. Find memories with subcategory="name"
   Found: "User's name is Shreyas" (score: 0.95)
    ↓
3. Also search semantically for similar memories
    ↓
4. Inject memories into AI prompt:
   [Relevant information:]
   ℹ️ User's name is Shreyas
   
   Question: Your name
   Answer:
    ↓
5. AI responds: "Shreyas"
    ↓
6. Fill field with "Shreyas"
```

## Memory Integration

### How Memories Help

Memories are automatically retrieved and used to fill forms:

- **Personal Information**: Name, email, phone, address, etc.
- **Preferences**: Preferred options, choices, etc.
- **Professional Info**: Company, job title, experience, etc.
- **Context**: Project names, goals, interests, etc.

### Example Scenarios

**Scenario 1: Personal Information**
- Saved: "My name is John Smith"
- Form field: "Full Name" → Fills "John Smith"

**Scenario 2: Contact Details**
- Saved: "My email is john@example.com"
- Form field: "Email Address" → Fills "john@example.com"

**Scenario 3: Preferences**
- Saved: "I prefer Python for programming"
- Form field: "Preferred language?" → Fills "Python"

## Google Forms

### Features

- Detects Google Forms automatically
- Works with all question types (text, multiple choice, etc.)
- Shows "Fill this Form" button in side panel header
- Memory-powered answers

### Implementation

**File:** `chrome-extension/src/background/features/google-forms/index.ts`

**Process:**
1. Detect Google Forms page
2. Extract questions from form
3. For each question:
   - Retrieve relevant memories
   - Generate answer using AI
   - Submit answer to form
4. Complete form submission

### Usage

1. Open a Google Form
2. Click "Fill this Form" button in side panel
3. Watch as fields are automatically filled
4. Review and submit

## Universal Forms

### Features

- Works on ANY website
- Detects standard HTML form elements
- Understands context from labels and placeholders
- Handles all input types (text, select, radio, checkbox, etc.)

### Form Detection

The system uses multiple strategies:

1. **Standard HTML**: `<form>`, `<input>`, `<select>`, `<textarea>`
2. **ARIA Roles**: `[role="form"]`, `[role="textbox"]`, etc.
3. **Common Patterns**: `.form`, `.input-group`, `.field`, etc.
4. **Shadow DOM**: Traverses shadow roots
5. **React/Vue Components**: Detects via data attributes

### Context Extraction

For each field, the system extracts context from:

1. **Associated `<label>`** (most reliable)
2. **Parent label**
3. **Placeholder text**
4. **aria-label** attribute
5. **Nearby text** (sibling elements)
6. **Parent container text**

### Implementation

**File:** `chrome-extension/src/background/features/universal-forms/index.ts`

**Process:**
1. Detect all form fields on page
2. For each field:
   - Extract label/context
   - Retrieve relevant memories
   - Generate appropriate answer
   - Fill the field
3. Handle different input types appropriately

### Usage

1. Navigate to any form on any website
2. Click "Fill this Form" in side panel
3. Form fields are automatically detected and filled
4. Review and submit manually

## Implementation Details

### Memory Retrieval

**Service:** `chrome-extension/src/background/services/memoryRetrieval.ts`

**Features:**
- Multi-strategy search (keyword + subcategory + semantic)
- Subcategory matching for exact field types
- Semantic similarity search
- Score merging and ranking

### Keyword Extraction

The system maps form field labels to memory subcategories:

```typescript
{
  'name': ['name', 'full name', 'first name', 'last name'],
  'email': ['email', 'e-mail', 'mail'],
  'phone': ['phone', 'mobile', 'cell', 'telephone'],
  'location': ['address', 'location', 'city', 'street'],
  'company': ['company', 'organization', 'employer'],
  'school': ['school', 'college', 'university']
}
```

### AI Prompt Format

```
You are filling out a form field. Use the information from your memories above if relevant.

[Relevant information from your saved memories:]
ℹ️ User's name is Shreyas
ℹ️ User's email is shreyas@example.com

Question: Your name
Answer (be brief and direct):
```

### Files Structure

**Core Services:**
- `chrome-extension/src/background/services/memoryRetrieval.ts` - Memory search
- `chrome-extension/src/background/features/google-forms/index.ts` - Google Forms handler
- `chrome-extension/src/background/features/universal-forms/index.ts` - Universal forms handler

**UI Components:**
- `pages/side-panel/src/features/google-forms/FormFillButton.tsx` - Fill button

## Troubleshooting

### Issue: Form fields not filling

**Check:**
1. Are memories saved? (Check memory settings)
2. Do memories have subcategories? (Required for matching)
3. Is OpenAI API key configured? (Required for embeddings)
4. Check browser console for errors

**Solution:**
- Save relevant information as memories first
- Ensure API keys are configured
- Rebuild extension if needed

### Issue: Wrong answers in fields

**Check:**
1. Memory content accuracy
2. Field label extraction (check console logs)
3. Memory retrieval scores (should be >0.3)

**Solution:**
- Update memories with correct information
- Check console logs to see which memories were retrieved
- Manually verify memory content

### Issue: Form detection not working

**For Universal Forms:**
- Check if form uses standard HTML
- Try different form detection strategies
- Check browser console for errors

**Solution:**
- Ensure form uses standard HTML form elements
- Check for JavaScript errors
- Try on different websites to isolate issue

### Issue: Google Forms not detected

**Check:**
1. URL contains "forms.google.com"
2. Extension is loaded and active
3. Side panel shows "Fill this Form" button

**Solution:**
- Refresh the Google Form page
- Reload extension
- Check extension permissions

## Best Practices

### Memory Management

1. **Save Complete Information**: "My name is John Smith" not just "John"
2. **Use Clear Labels**: Saves as structured data with subcategories
3. **Update Regularly**: Keep memories current and accurate
4. **Use Specific Details**: "I work at Google as a Software Engineer" not just "Google"

### Form Filling Tips

1. **Review Before Submit**: Always review filled forms before submitting
2. **Save Common Info**: Pre-save information you use frequently
3. **Test First**: Try on a test form before real forms
4. **Use Clear Labels**: Forms with clear labels work better

## Future Improvements

### Planned Enhancements

1. **Form Templates**: Save form-filling templates for common forms
2. **Batch Filling**: Fill multiple forms at once
3. **Smart Validation**: Validate answers before filling
4. **Multi-Step Forms**: Handle wizard-style multi-step forms
5. **Form Learning**: Learn from user corrections

## Summary

Verse's form filling system:

- ✅ Uses saved memories for intelligent answers
- ✅ Works on Google Forms and universal forms
- ✅ Multi-strategy memory matching
- ✅ Context-aware field detection
- ✅ AI-powered answer generation

**Key Insight**: The system combines structured memory storage (with subcategories) with semantic search to provide accurate, context-aware form filling.

For more details on memory system, see [MEMORY.md](./MEMORY.md).

