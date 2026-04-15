# Quick Reference: PromptLab Contributor Attribution

## 📋 What Was Implemented

✅ **GitHub Profile URL Support** - Added `github_profile_url` field to prompt JSON  
✅ **Issue Template** - Comprehensive form for prompt submissions  
✅ **Contributing Guide** - Step-by-step contribution workflow  
✅ **Display Functionality** - Auto-links contributor GitHub profiles (already in code)  
✅ **Example Update** - Updated code-reviewer.json with sample profile URL

---

## 🚀 How Submitting Contributors Use This

### Step 1: Go to Issues

Navigate to the [Issues](https://github.com/your-repo/issues) tab

### Step 2: Select Template

Click **"New Issue"** → Select **"🚀 Contribute New Prompt"**

### Step 3: Fill the Form

```
Title: [PROMPT] Your Prompt Title Here

Then fill in all sections:
- Prompt Overview
- Task Definition
- Execution Strategy
- Constraints & Guardrails
- Success Criteria
- Your Information
  - GitHub Username
  - GitHub Profile URL: https://github.com/your-username
```

### Step 4: Submit

Click **"Submit new issue"**

### Step 5: Your Prompt Goes Live

Once approved:

- ✨ Appears in the PromptLab Library
- 🔗 Linked to your GitHub profile
- 👥 You're credited as the contributor

---

## 📦 JSON Field Reference

### Add This to Your Prompt JSON:

```json
{
  "id": 123,
  "title": "Your Prompt Title",
  ...other fields...,
  "github_profile_url": "https://github.com/your-username"
}
```

### What It Does:

```
Library Display:
┌─────────────────────────┐
│ Your Prompt Title       │
│ [Prompt details...]     │
│                         │
│ Author: [GitHub] @user  │ ← Clickable link
└─────────────────────────┘
```

---

## 📂 Files Created/Updated

### New Files:

| File                                            | Purpose                     |
| ----------------------------------------------- | --------------------------- |
| `.github/ISSUE_TEMPLATE/prompt-contribution.md` | Guided submission form      |
| `CONTRIBUTING.md`                               | Complete contribution guide |
| `CONTRIBUTOR_ATTRIBUTION.md`                    | Technical documentation     |

### Updated Files:

| File                         | Change                                   |
| ---------------------------- | ---------------------------------------- |
| `prompts/code-reviewer.json` | Added example `github_profile_url` field |

### Existing (Verified):

| File         | Status                             |
| ------------ | ---------------------------------- |
| `js/app.js`  | ✓ Already displays GitHub profiles |
| `index.html` | ✓ Has library page for display     |

---

## 🎯 Contributor Flow

```
CONTRIBUTOR PERSPECTIVE:

1. Has great prompt? ✓
2. Opens PromptLab Issues
3. Clicks "New Issue" button
4. Fills out template with:
   - Prompt details
   - GitHub profile URL
5. Submits issue
6. Team reviews (48-72 hrs)
7. Prompt added to library
8. Profile link appears in library
9. Community sees your work! 🎉
```

---

## ✅ Validation Checklist

Before submitting, verify:

- [ ] Prompt title is clear
- [ ] Task description is specific
- [ ] At least 3-4 core fields filled
- [ ] Examples provided (if Few-Shot)
- [ ] Output format specified
- [ ] **GitHub profile URL included**
- [ ] No duplicates in library
- [ ] Prompt tested and works well
- [ ] JSON is valid

---

## 🔍 Display Verification

To verify your contribution displays correctly:

1. **Open the app** (index.html)
2. **Navigate to Library** tab
3. **Search for your prompt** by name
4. **Look for your GitHub username** link
5. **Click it** to verify it goes to your profile

---

## 💬 Examples

### How Prompts Display:

**Without github_profile_url:**

```
┌────────────────────────┐
│ Some Prompt Title      │
│ [Details...]           │
│                        │
│ Author: [Robot] System │
└────────────────────────┘
```

**With github_profile_url:**

```
┌────────────────────────┐
│ Your Prompt Title      │
│ [Details...]           │
│                        │
│ Author: [GitHub] @user │ ← Links to GitHub
└────────────────────────┘
```

---

## 🎓 For Maintainers

### To Approve a Contribution:

1. Review the issue form
2. Validate JSON format
3. Test the prompt quality
4. Verify `github_profile_url` is valid
5. Create JSON file in `/prompts/`
6. Update `/prompts/manifest.json`
7. Merge/close the issue
8. Announce in comments ✓

### Template Location:

`.github/ISSUE_TEMPLATE/prompt-contribution.md`

### Contributing Guide:

`CONTRIBUTING.md`

---

## 📚 Documentation

| Document                     | Audience         | Purpose               |
| ---------------------------- | ---------------- | --------------------- |
| `CONTRIBUTING.md`            | Contributors     | Workflow & guidelines |
| `.github/ISSUE_TEMPLATE/...` | Contributors     | Submission form       |
| `CONTRIBUTOR_ATTRIBUTION.md` | Maintainers/Devs | Technical details     |
| This file                    | Everyone         | Quick reference       |

---

## ❓ FAQ

**Q: Is `github_profile_url` required?**  
A: No, it's optional. Old prompts work without it. Falls back to "System" if missing.

**Q: Can I update my profile URL later?**  
A: Yes, submit a PR to update the JSON field anytime.

**Q: What if I don't have a GitHub account?**  
A: Create one (it's free!) at github.com. We credit contributors via GitHub profiles.

**Q: Can I link to non-GitHub profiles?**  
A: The field is designed for GitHub URLs, but you can indicate it's a placeholder using another format if needed.

**Q: How do I track my contribution?**  
A: Your GitHub username will be linked in the library card. You can bookmark the library page to see your prompts anytime.

---

**Ready to contribute? 🚀 [Go to Issues](https://github.com/your-repo/issues) and select the contribution template!**
