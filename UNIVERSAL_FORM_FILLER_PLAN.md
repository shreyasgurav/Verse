# Universal Form Filler - Implementation Plan

## Current Limitation
The Google Forms filler uses **Google-specific selectors** (`.freebirdFormviewerViewNumberedItemContainer`, `.Qr7Oae`, etc.) that only work on Google Forms.

---

## Goal
Create a **universal form filler** that can fill ANY form on ANY website by:
1. Detecting standard HTML form elements
2. Understanding context from labels, placeholders, and surrounding text
3. Intelligently determining appropriate answers
4. Handling all input types (text, select, radio, checkbox, date, file, etc.)

---

## Technical Challenges & Solutions

### Challenge 1: Form Detection
**Problem:** Different websites structure forms differently (semantic HTML, custom components, React forms, etc.)

**Solution:**
```typescript
// Multi-strategy form detection
1. Standard HTML forms: <form>, <input>, <select>, <textarea>
2. ARIA roles: [role="form"], [role="textbox"], [role="combobox"]
3. Common patterns: .form, .input-group, .field, .form-control
4. React/Vue components: data-testid, aria-label patterns
5. Shadow DOM: Detect and traverse shadow roots
```

### Challenge 2: Label/Question Association
**Problem:** How to know what each input field is asking for?

**Solution - Multi-source Context Extraction:**
```typescript
function extractFieldContext(input: HTMLElement): string {
  const context: string[] = [];
  
  // 1. Associated <label> (most reliable)
  const labelId = input.getAttribute('aria-labelledby') || input.id;
  if (labelId) {
    const label = document.querySelector(`label[for="${labelId}"]`);
    if (label) context.push(label.textContent);
  }
  
  // 2. Parent label
  const parentLabel = input.closest('label');
  if (parentLabel) context.push(parentLabel.textContent);
  
  // 3. Placeholder text
  const placeholder = input.getAttribute('placeholder');
  if (placeholder) context.push(placeholder);
  
  // 4. aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) context.push(ariaLabel);
  
  // 5. Nearby text (previous siblings, parent text)
  const parent = input.parentElement;
  if (parent) {
    // Get text from parent but exclude input's own value
    const parentText = Array.from(parent.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (parentText) context.push(parentText);
  }
  
  // 6. Previous sibling elements (often contain labels)
  let prev = input.previousElementSibling;
  while (prev && context.length < 5) {
    if (prev.textContent?.trim()) {
      context.push(prev.textContent.trim());
      break;
    }
    prev = prev.previousElementSibling;
  }
  
  // 7. data-* attributes
  const dataLabel = input.getAttribute('data-label') || 
                    input.getAttribute('data-name') ||
                    input.getAttribute('data-field');
  if (dataLabel) context.push(dataLabel);
  
  // 8. name attribute (often descriptive)
  const name = input.getAttribute('name');
  if (name) {
    // Convert camelCase/snake_case to readable text
    const readable = name
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .trim();
    context.push(readable);
  }
  
  return context.filter(Boolean).join(' | ');
}
```

### Challenge 3: Input Type Detection
**Problem:** Need to handle all HTML input types correctly

**Solution:**
```typescript
interface UniversalFormField {
  element: HTMLElement;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'time' | 
        'select' | 'radio' | 'checkbox' | 'textarea' | 'file' | 'unknown';
  context: string;          // What is this field asking?
  options?: string[];       // For select/radio/checkbox
  required: boolean;
  currentValue?: string;
  constraints?: {           // Validation constraints
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

function detectFieldType(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'textarea') return 'textarea';
  if (tagName === 'select') return 'select';
  
  if (tagName === 'input') {
    const type = (element as HTMLInputElement).type.toLowerCase();
    return type; // text, email, tel, number, date, radio, checkbox, etc.
  }
  
  // Check ARIA roles for custom components
  const role = element.getAttribute('role');
  if (role === 'textbox') return 'text';
  if (role === 'combobox') return 'select';
  if (role === 'radio') return 'radio';
  if (role === 'checkbox') return 'checkbox';
  
  // Check for contenteditable (rich text editors)
  if (element.getAttribute('contenteditable') === 'true') return 'textarea';
  
  return 'unknown';
}
```

### Challenge 4: Smart Answer Generation
**Problem:** AI needs rich context to generate appropriate answers

**Solution - Enhanced Prompting:**
```typescript
function buildPromptForField(field: UniversalFormField): string {
  let prompt = `You are filling out a form field. Provide an appropriate answer.\n\n`;
  
  // Add field context
  prompt += `Field Context: ${field.context}\n`;
  
  // Add field type
  prompt += `Field Type: ${field.type}\n`;
  
  // Add constraints if any
  if (field.required) prompt += `Required: Yes\n`;
  if (field.constraints?.pattern) prompt += `Pattern: ${field.constraints.pattern}\n`;
  if (field.constraints?.minLength) prompt += `Min Length: ${field.constraints.minLength}\n`;
  if (field.constraints?.maxLength) prompt += `Max Length: ${field.constraints.maxLength}\n`;
  
  // Add options for choice fields
  if (field.options && field.options.length > 0) {
    prompt += `\nOptions:\n`;
    field.options.forEach((opt, idx) => {
      prompt += `${String.fromCharCode(97 + idx)}) ${opt}\n`;
    });
    prompt += `\nReturn ONLY the letter of your choice.\n`;
  } else {
    // Add type-specific instructions
    switch (field.type) {
      case 'email':
        prompt += `\nProvide a valid email address.\n`;
        break;
      case 'tel':
        prompt += `\nProvide a valid phone number.\n`;
        break;
      case 'number':
        prompt += `\nProvide a number${field.constraints?.min ? ` (min: ${field.constraints.min})` : ''}${field.constraints?.max ? ` (max: ${field.constraints.max})` : ''}.\n`;
        break;
      case 'date':
        prompt += `\nProvide a date in YYYY-MM-DD format.\n`;
        break;
      case 'url':
        prompt += `\nProvide a valid URL.\n`;
        break;
      default:
        prompt += `\nProvide a brief, appropriate answer.\n`;
    }
  }
  
  return prompt;
}
```

### Challenge 5: User Context/Profile
**Problem:** Forms often ask for personal information (name, email, address, etc.)

**Solution - User Profile System:**
```typescript
interface UserProfile {
  personal: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
  };
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  professional: {
    company?: string;
    jobTitle?: string;
    industry?: string;
    yearsOfExperience?: number;
  };
  education: {
    degree?: string;
    university?: string;
    graduationYear?: number;
  };
  preferences: {
    defaultAnswers?: Record<string, string>; // Custom field mappings
  };
}

// Smart field matching
function matchFieldToProfile(context: string, profile: UserProfile): string | null {
  const lower = context.toLowerCase();
  
  // Name fields
  if (/first.*name|given.*name/i.test(lower)) return profile.personal.firstName;
  if (/last.*name|family.*name|surname/i.test(lower)) return profile.personal.lastName;
  if (/full.*name|your.*name|name/i.test(lower)) return profile.personal.fullName;
  
  // Contact fields
  if (/email|e-mail/i.test(lower)) return profile.personal.email;
  if (/phone|mobile|telephone|contact.*number/i.test(lower)) return profile.personal.phone;
  
  // Address fields
  if (/street|address.*line.*1/i.test(lower)) return profile.address.street;
  if (/city/i.test(lower)) return profile.address.city;
  if (/state|province/i.test(lower)) return profile.address.state;
  if (/zip.*code|postal.*code/i.test(lower)) return profile.address.zipCode;
  if (/country/i.test(lower)) return profile.address.country;
  
  // Professional fields
  if (/company|employer|organization/i.test(lower)) return profile.professional.company;
  if (/job.*title|position|role/i.test(lower)) return profile.professional.jobTitle;
  
  // Education fields
  if (/university|college|school/i.test(lower)) return profile.education.university;
  if (/degree|qualification/i.test(lower)) return profile.education.degree;
  
  return null;
}
```

---

## Implementation Plan

### Phase 1: Universal Form Detection
**Goal:** Detect and scrape ANY form on ANY website

**Tasks:**
1. Create `UniversalFormScraper` class
2. Implement multi-strategy form detection
3. Extract field context from multiple sources
4. Detect all input types (text, select, radio, checkbox, date, etc.)
5. Build field metadata (required, constraints, validation)

**Files:**
```
pages/content/lib/features/universal-forms/
├── index.ts
├── scraper.ts              # Form detection & scraping
├── contextExtractor.ts     # Label/question extraction
└── types.ts
```

### Phase 2: Smart Answer Generation
**Goal:** Generate contextually appropriate answers

**Tasks:**
1. Build rich prompts with field context
2. Implement type-specific answer generation
3. Add validation checking (email format, phone format, etc.)
4. Handle multi-step forms and conditional fields

**Files:**
```
chrome-extension/src/background/features/universal-forms/
├── index.ts
├── answerGenerator.ts      # AI-powered answer generation
└── validators.ts           # Answer validation
```

### Phase 3: User Profile System
**Goal:** Use saved user data for personal information fields

**Tasks:**
1. Create user profile storage schema
2. Build profile management UI (in settings)
3. Implement smart field matching (name → profile.firstName)
4. Add profile override system (AI fills if profile doesn't have data)

**Files:**
```
packages/storage/lib/profile/
├── userProfile.ts          # Profile storage
└── types.ts

pages/options/src/components/
└── ProfileSettings.tsx     # Profile management UI
```

### Phase 4: Advanced Features
**Goal:** Handle complex scenarios

**Tasks:**
1. Multi-page form navigation
2. Conditional field handling (show/hide based on previous answers)
3. File upload handling (skip or use placeholder)
4. CAPTCHA detection (notify user)
5. Form submission confirmation
6. Undo/edit functionality

---

## Technical Architecture

### Universal Form Filler Flow

```
1. User clicks "Fill Form" button
   ↓
2. UniversalFormScraper scans page
   ↓ Finds all form fields
   ↓ Extracts context for each field
   ↓ Detects field types
   ↓
3. For each field:
   ↓ Check if user profile has data → Use it
   ↓ If not → Send to AI with rich context
   ↓ AI generates appropriate answer
   ↓ Validate answer (format, constraints)
   ↓ Fill the field
   ↓ Trigger validation events
   ↓
4. Handle multi-page forms
   ↓ Detect "Next" button
   ↓ Click and repeat
   ↓
5. Stop at submit button (don't auto-submit)
```

### Key Components

**1. Universal Scraper**
```typescript
class UniversalFormScraper {
  // Find all forms on page
  findForms(): HTMLFormElement[]
  
  // Find all fillable fields (including outside <form> tags)
  findAllFields(): UniversalFormField[]
  
  // Extract context for a field
  extractContext(element: HTMLElement): string
  
  // Detect field type
  detectType(element: HTMLElement): FieldType
  
  // Get options for select/radio/checkbox
  extractOptions(element: HTMLElement): string[]
}
```

**2. Smart Answer Generator**
```typescript
class SmartAnswerGenerator {
  // Check user profile first
  getFromProfile(context: string): string | null
  
  // Generate AI answer with rich context
  generateAnswer(field: UniversalFormField): Promise<string>
  
  // Validate answer format
  validateAnswer(answer: string, field: UniversalFormField): boolean
  
  // Apply answer to field
  applyAnswer(field: UniversalFormField, answer: string): Promise<boolean>
}
```

**3. User Profile Manager**
```typescript
class UserProfileManager {
  // Save user profile
  saveProfile(profile: UserProfile): Promise<void>
  
  // Get profile data
  getProfile(): Promise<UserProfile>
  
  // Match field to profile
  matchField(context: string): string | null
  
  // Update profile from filled forms (learning)
  learnFromForm(fields: FilledField[]): Promise<void>
}
```

---

## Example Scenarios

### Scenario 1: Job Application Form
```
Field: "First Name"
→ Check profile.personal.firstName → "John"
→ Fill immediately (no AI needed)

Field: "Why do you want to work here?"
→ Not in profile
→ Send to AI: "Job application question: Why do you want to work here?"
→ AI: "I am passionate about..."
→ Fill with AI answer
```

### Scenario 2: Survey Form
```
Field: "Rate your experience (1-5)"
→ Detect: radio buttons with options 1, 2, 3, 4, 5
→ Send to AI with context
→ AI: "4" (picks appropriate rating)
→ Click radio button #4
```

### Scenario 3: E-commerce Checkout
```
Field: "Shipping Address"
→ Check profile.address.street → "123 Main St"
→ Fill immediately

Field: "Credit Card Number"
→ Detect: sensitive field
→ Skip or notify user (don't auto-fill sensitive data)
```

---

## Security & Privacy Considerations

### 1. Sensitive Field Detection
```typescript
const SENSITIVE_PATTERNS = [
  /password/i,
  /credit.*card|card.*number|cvv|cvc/i,
  /social.*security|ssn/i,
  /bank.*account/i,
  /pin.*code/i,
];

function isSensitiveField(context: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(context));
}

// Skip sensitive fields or require user confirmation
```

### 2. User Consent
- Show preview of what will be filled
- Allow user to review before submission
- Option to skip specific fields
- Clear indication of AI-generated vs profile data

### 3. Data Storage
- Store user profile locally (chrome.storage.local)
- Encrypt sensitive data
- Allow user to clear profile data
- No data sent to external servers (except AI API)

---

## Implementation Phases

### Phase 1: Basic Universal Filler (Week 1)
- ✅ Detect standard HTML forms
- ✅ Extract context from labels/placeholders
- ✅ Handle text, email, tel, number inputs
- ✅ Handle select dropdowns
- ✅ Handle radio buttons and checkboxes
- ✅ Basic AI answer generation

### Phase 2: User Profile System (Week 2)
- ✅ Create profile storage schema
- ✅ Build profile management UI
- ✅ Implement smart field matching
- ✅ Profile-first filling (use profile before AI)

### Phase 3: Advanced Features (Week 3)
- ✅ Multi-page form navigation
- ✅ Conditional field handling
- ✅ Date/time pickers
- ✅ File upload detection (skip with notification)
- ✅ CAPTCHA detection
- ✅ Form validation handling

### Phase 4: Intelligence & Learning (Week 4)
- ✅ Learn from filled forms (update profile)
- ✅ Remember answers for similar fields
- ✅ Context-aware answer generation (use page content)
- ✅ Multi-language support
- ✅ Custom field mappings (user teaches system)

---

## Code Structure

```
pages/content/lib/features/
├── universal-forms/
│   ├── index.ts                    # Feature config
│   ├── scraper.ts                  # Form detection & scraping
│   ├── contextExtractor.ts         # Context extraction
│   ├── fieldDetector.ts            # Field type detection
│   ├── optionExtractor.ts          # Extract select/radio options
│   └── types.ts

chrome-extension/src/background/features/
├── universal-forms/
│   ├── index.ts                    # Message handlers
│   ├── answerGenerator.ts          # AI answer generation
│   ├── profileMatcher.ts           # Match fields to profile
│   └── validators.ts               # Answer validation

packages/storage/lib/profile/
├── userProfile.ts                  # Profile storage
├── profileMatcher.ts               # Field matching logic
└── types.ts

pages/options/src/components/
└── ProfileSettings.tsx             # Profile management UI
```

---

## Prompt Engineering for Universal Forms

### Context-Rich Prompt Template
```
You are filling out a form field. Generate an appropriate answer based on the context.

Field Context: {context}
Field Type: {type}
Required: {required}
Constraints: {constraints}

{if options exist}
Options:
a) Option 1
b) Option 2
c) Option 3

Return ONLY the letter of your choice.
{else}
Return a brief, appropriate answer that fits the field type and context.
{endif}

{if user profile available}
User Profile Data:
- Name: {profile.name}
- Email: {profile.email}
- Company: {profile.company}
... (relevant profile fields)

Use profile data when appropriate.
{endif}

Answer:
```

---

## Testing Strategy

### Test on Various Websites:
1. **Google Forms** ✅ (already working)
2. **Typeform** - Modern form builder
3. **JotForm** - Popular form platform
4. **SurveyMonkey** - Survey platform
5. **Job application sites** - LinkedIn, Indeed, company career pages
6. **E-commerce checkout** - Shopify, WooCommerce (skip payment fields)
7. **Contact forms** - WordPress contact forms
8. **Government forms** - DMV, tax forms (be careful!)
9. **University applications** - Common App, college forms
10. **Custom React/Vue forms** - Modern web apps

---

## Edge Cases to Handle

1. **Dynamic forms** - Fields appear based on previous answers
2. **Multi-step wizards** - Progress bars, step indicators
3. **Validation on blur** - Fields that validate immediately
4. **Autocomplete dropdowns** - Search-based selects
5. **Rich text editors** - TinyMCE, CKEditor, Quill
6. **Date pickers** - Custom calendar widgets
7. **File uploads** - Skip or notify user
8. **CAPTCHAs** - Detect and notify user
9. **Terms & conditions** - Auto-check with user consent
10. **Signature fields** - Skip or notify user

---

## Success Metrics

- ✅ Works on 90%+ of standard HTML forms
- ✅ Correctly identifies field context 95%+ of the time
- ✅ Generates appropriate answers 90%+ of the time
- ✅ Handles 20+ different input types
- ✅ Respects validation constraints
- ✅ Skips sensitive fields automatically
- ✅ User can review before submission

---

## Estimated Effort

- **Phase 1 (Basic):** 40-60 hours
- **Phase 2 (Profile):** 20-30 hours
- **Phase 3 (Advanced):** 30-40 hours
- **Phase 4 (Intelligence):** 20-30 hours

**Total:** 110-160 hours (3-4 weeks full-time)

---

## Next Steps

1. **Implement Phase 1** - Universal form detection and basic filling
2. **Test on 10+ websites** - Gather real-world data
3. **Iterate based on failures** - Improve detection and context extraction
4. **Add user profile system** - Make filling faster and more accurate
5. **Polish UX** - Preview, review, edit before submit
6. **Add advanced features** - Multi-page, conditional fields, etc.

This will make Verse the **most powerful form filler** on the market, capable of filling ANY form on ANY website intelligently.

