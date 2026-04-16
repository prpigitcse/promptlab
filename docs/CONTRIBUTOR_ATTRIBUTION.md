# PromptLab Contributor Attribution Feature

This document summarizes the new contributor attribution feature that enables prompt creators to be recognized in the PromptLab library.

## What's New

### 1. GitHub Profile URL Field

All prompts now support a **`github_profile_url`** field for contributor attribution.

**Field Details:**

- **Name:** `github_profile_url`
- **Type:** String
- **Format:** Full GitHub profile URL (e.g., `https://github.com/your-username`)
- **Required:** No (optional for backward compatibility)
- **Display:** Clickable link on the prompt card in the library

### 2. Display Functionality

**Location:** [js/app.js](js/app.js#L1130) - `renderLibrary()` function

The application automatically:

- ✅ Displays GitHub username as a clickable link pointing to the profile
- ✅ Shows a GitHub icon next to the username
- ✅ Falls back to "System" with a robot icon if no profile URL is provided
- ✅ Opens profile link in a new tab (with security attributes)

**Example Display:**

```
Author: [GitHub Icon] your-username  → links to https://github.com/your-username
```

### 3. GitHub Issue Template

**Location:** [`.github/ISSUE_TEMPLATE/prompt-contribution.md`](.github/ISSUE_TEMPLATE/prompt-contribution.md)

A comprehensive issue template that guides contributors to:

- Fill in all prompt fields matching the JSON structure
- Include their GitHub profile URL
- Validate their contribution before submission
- Reference the exact JSON structure that will be created

**Features:**

- Pre-filled sections matching the prompt JSON schema
- Validation checklist to ensure quality
- Example JSON block for reference
- Clear step-by-step guidance

### 4. Contributing Guide

**Location:** [`CONTRIBUTING.md`](CONTRIBUTING.md)

A detailed contribution guide that includes:

- **Two submission options:** Issue template or direct PR
- **JSON structure reference** with all fields explained
- **Quality standards** checklist
- **Review process** outline
- **Examples** of great prompts

**Key Highlights:**

- Explains the purpose and importance of `github_profile_url`
- Shows how to use the issue template
- Provides the complete JSON template for direct submissions
- Sets clear expectations for prompt quality

## Updated Files

### 1. Issue Template (New File)

**File:** `.github/ISSUE_TEMPLATE/prompt-contribution.md`

- Comprehensive form for prompt submissions
- Includes `github_profile_url` as a required field
- Pre-filled JSON template for validation

### 2. Contributing Guide (New File)

**File:** `CONTRIBUTING.md`

- Complete contribution workflow
- Field descriptions and reference table
- Quality standards and review process

### 3. Example Prompt (Updated)

**File:** `prompts/code-reviewer.json`

- Added `"github_profile_url": "https://github.com/promptlab-contributors"` field
- Serves as a reference for new contributors

### 4. Existing Display Code (Verified)

**File:** `js/app.js` - `renderLibrary()` function (lines 1130-1137)

- Already had support for `github_profile_url` field
- No changes needed (feature was already implemented in the display layer)

## Usage Instructions for Contributors

### Via Issue Template (Recommended)

1. Go to **Issues** → **New Issue**
2. Select **"🚀 Contribute New Prompt"**
3. Fill in all sections, including GitHub Profile URL
4. Submit the issue
5. Our team reviews and creates the prompt

### Via Direct Pull Request

1. Create a new JSON file in `/prompts/` directory
2. Include the `github_profile_url` field
3. Update `/prompts/manifest.json`
4. Submit a PR with clear description

## JSON Schema Updated

**Fields Added:**

```json
{
  ...existing fields...,
  "github_profile_url": "https://github.com/contributor-username"
}
```

**Example of Complete Prompt with Attribution:**

```json
{
  "id": 1,
  "title": "Expert Code Reviewer",
  "role": "Principal Software Engineer",
  "task": "Review code for issues",
  ...other fields...,
  "github_profile_url": "https://github.com/promptlab-contributors"
}
```

## How It Works End-to-End

```
Contributor submits issue/PR
         ↓
Issue template guides them to fill everything
         ↓
Includes github_profile_url for attribution
         ↓
Team reviews the prompt
         ↓
Prompt added to /prompts/ directory
         ↓
Application loads prompt (via manifest.json)
         ↓
renderLibrary() displays it with GitHub link
         ↓
Community sees: "Prompt Name by @username" → links to profile
```

## Backward Compatibility

- ✅ The field is **optional** for existing prompts
- ✅ Display gracefully falls back to "System" if field is missing
- ✅ No changes to existing validation or display logic
- ✅ Existing prompts continue to work without modification

## Testing

To verify the feature works:

1. **Open the library page** in `/index.html` → Library tab
2. **Look for prompts with `github_profile_url`**
3. **Verify the GitHub link appears** as a clickable username
4. **Click the link** to confirm it opens the correct GitHub profile

## Future Enhancements (Optional)

Potential future improvements:

- GitHub avatar display next to username
- Contribution count / stats for each contributor
- Filter prompts by contributor
- Contributor leaderboard
- GitHub authentication for automatic profile linking

## Questions?

Refer to:

- 📖 [CONTRIBUTING.md](CONTRIBUTING.md) - Detailed contribution guide
- 🎯 [Issue Template](.github/ISSUE_TEMPLATE/prompt-contribution.md) - Submission form
- 💬 Open an issue for questions
