# Contributing to PromptLab

Thank you for your interest in contributing to the PromptLab prompt library! We're excited to have you share your prompt engineering expertise with our community.

## How to Contribute a Prompt

### Option 1: Using the GitHub Issue Template (Recommended)

1. **Click the "New Issue" button** on the [Issues tab](https://github.com/promptlab-contributors/promptlab/issues)
2. **Select the "🚀 Contribute New Prompt" template**
3. **Fill in all the fields** with your prompt details
4. **Include your GitHub profile URL** so you're credited as the contributor
5. **Submit the issue** and our team will review it

👉 **The issue template will guide you through the entire process.**

---

### Option 2: Direct JSON Submission

If you prefer, you can submit a direct pull request with a new prompt JSON file:

1. **Fork the repository**
2. **Create a new file** in the `/prompts/` directory: `your-prompt-name.json`
3. **Use this template** as your starting point:

```json
{
  "id": [NEXT_AVAILABLE_ID],
  "title": "Your Prompt Title",
  "role": "Expert Role",
  "audience": "Target audience",
  "context": "When/where would this be used?",
  "task": "The main instruction",
  "variables": "[[VAR_1]], [[VAR_2]]",
  "reasoning": "How should the AI approach this?",
  "examples": "Reference examples or patterns",
  "constraints": "Any limitations or boundaries",
  "rules": "Numbered or bulleted rules",
  "criteria": "What success looks like",
  "mustInclude": "Required sections in output",
  "avoid": "What to avoid or exclude",
  "errorPolicy": "How to handle missing info",
  "tone": "Tone and voice style",
  "format": "Output format (Markdown, JSON, etc.)",
  "length": "Concise / Comprehensive / Brief",
  "tools": "Required tools or capabilities",
  "type": "Zero-Shot / Few-Shot / Chain-of-Thought / Persona / Tool-Using / Critique & Revise",
  "outputStructure": "Optional: Example output layout",
  "github_profile_url": "https://github.com/your-username"
}
```

4. **Update `/prompts/manifest.json`** to include your new file:

```json
[
  "code-reviewer.json",
  "your-prompt-name.json",
  ...
]
```

5. **Submit a pull request** with a clear description

---

## Prompt JSON Structure Reference

### Core Fields (Recommended)

| Field      | Type    | Required    | Example                            |
| ---------- | ------- | ----------- | ---------------------------------- |
| `id`       | Integer | Yes         | `1`                                |
| `title`    | String  | Yes         | `"Expert Code Reviewer"`           |
| `task`     | String  | Yes         | `"Review code changes for issues"` |
| `role`     | String  | Recommended | `"Principal Software Engineer"`    |
| `audience` | String  | Recommended | `"Junior and mid-level engineers"` |
| `type`     | String  | Recommended | `"Zero-Shot"`                      |
| `format`   | String  | Recommended | `"Markdown"`                       |

### Additional Fields

| Field                    | Type   | Purpose                                     |
| ------------------------ | ------ | ------------------------------------------- |
| `context`                | String | Background/situation for the prompt         |
| `variables`              | String | Input placeholders like `[[CODE_DIFF]]`     |
| `reasoning`              | String | How the AI should think through the task    |
| `examples`               | String | Reference examples or desired patterns      |
| `constraints`            | String | Limitations or boundaries                   |
| `rules`                  | String | Specific rules to follow                    |
| `criteria`               | String | Definition of success                       |
| `mustInclude`            | String | Required sections in output                 |
| `avoid`                  | String | What the AI should NOT do                   |
| `errorPolicy`            | String | How to handle unclear/missing info          |
| `tone`                   | String | Desired tone and voice                      |
| `length`                 | String | Expected output length                      |
| `tools`                  | String | Tools or capabilities needed                |
| `outputStructure`        | String | Example blueprint for output                |
| **`github_profile_url`** | String | **Your GitHub profile URL for attribution** |

### The `github_profile_url` Field

**This field is crucial for contributor attribution!**

- **Purpose:** Links the prompt to your GitHub profile so you're credited in the library
- **Format:** Your full GitHub profile URL (e.g., `https://github.com/your-username`)
- **Display:** Your GitHub username will appear as a clickable link on the prompt card in the library
- **Why it matters:** The community knows who created this excellent prompt and can reach out, follow, or collaborate with you

---

## Quality Standards

To ensure your prompt is approved, please verify:

✅ **Clarity:** The prompt title and task are clear and specific  
✅ **Completeness:** At least 5 key fields are filled in (title, role, task, type, format)  
✅ **Testing:** You've tested the prompt and it produces good results  
✅ **Uniqueness:** No similar prompt already exists in the library  
✅ **JSON Validity:** The JSON is properly formatted and valid  
✅ **Attribution:** Your `github_profile_url` is included  
✅ **Documentation:** The prompt is documented well enough for others to understand and use it

---

## Our Review Process

1. **Submission:** You submit via issue template or pull request
2. **Initial Review:** We check for JSON validity and completeness
3. **Quality Assessment:** We test the prompt and verify it produces quality results
4. **Attribution Verification:** We confirm your GitHub profile URL
5. **Approval & Merge:** Once approved, your prompt goes live in the library!
6. **Display:** Your GitHub profile link appears on your prompt in the library

---

## What Makes a Great Prompt?

- **Specific Task:** Clear objective, not vague or overly broad
- **Well-Defined Role:** The AI knows exactly what expertise to embody
- **Realistic Examples:** Reference patterns that are achievable and relatable
- **Clear Success Criteria:** The user knows what a good result looks like
- **Practical Constraints:** Boundaries that improve the output
- **Actionable Feedback:** If it outputs feedback, it's specific and implementable

---

## Examples of Great Prompts

- **Code Reviewer:** Structured feedback on code changes with severity levels
- **Technical Explainer:** Breaks down complex topics for specific skill levels
- **SQL Query Builder:** Step-by-step query construction with optimization tips
- **System Architecture Designer:** Comprehensive system design with trade-offs

---

## Questions?

- 📖 **See the issue template** for detailed guidance
- 💬 **Open a discussion** if you have questions
- 🐛 **Report issues** if something isn't working

---

## License

By contributing a prompt, you agree that your contribution will be part of the PromptLab library under the project's license. Your GitHub profile will be credited as the contributor.

Thank you for making PromptLab better! 🚀
