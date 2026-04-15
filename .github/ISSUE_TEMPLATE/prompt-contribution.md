---
name: 🚀 Contribute New Prompt
about: Submit a new prompt template to the PromptLab library
title: "[PROMPT] Your Prompt Title Here"
labels: ["contribution", "prompt-submission"]
assignees: []
---

## Prompt Overview

**Title:** [Clear, descriptive name of your prompt]

**Description:** [One sentence summary of what this prompt does]

---

## Prompt Details

### Identity & Foundation

- **Role:** [The persona or expert role the AI should take]
- **Audience:** [Who should benefit from this prompt / who is it designed for?]
- **Type:** [Select one: Zero-Shot, Few-Shot, Chain-of-Thought, Persona, Tool-Using, Critique & Revise]

---

### Task Definition

- **Context:** [Background or situation where this prompt would be useful]
- **Task:** [The main objective or instruction]
- **Variables:** [Any input placeholders? Format: `[[VARIABLE_NAME]]`, separated by commas]

---

### Execution Strategy

- **Reasoning/Approach:** [How should the AI think through this?]
- **Examples/Patterns:** [Reference examples or desired patterns to follow]
- **Tools Required:** [Any specific tools/capabilities needed? e.g., "Web search, code execution"]

---

### Constraints & Guardrails

- **Constraints:** [Limitations or boundaries the AI must respect]
- **Rules:** [Specific rules or policies to enforce]
- **Must Include:** [Specific sections/points that MUST appear in output]
- **Avoid:** [What should the AI NOT do or include?]
- **Error Handling Policy:** [What to do when info is missing or conflicting?]

---

### Success Criteria

- **Success Criteria:** [What does a good result look like?]
- **Output Format:** [Select one or describe: Markdown, JSON, Code Block, Bullet Points, Paragraphs, etc.]
- **Output Length:** [Guidance on expected length: Concise, Comprehensive, Brief, Detailed, etc.]
- **Tone & Voice:** [Style/tone: Professional, Casual, Technical, Friendly, etc.]
- **Output Structure/Blueprint:** [Optional: example output format or template]

---

## JSON Structure

Below is the complete JSON that will be added to the prompt library (for reference/validation):

```json
{
  "id": [NEXT_AVAILABLE_ID],
  "title": "Your Prompt Title",
  "role": "Expert/Role Name",
  "audience": "Target audience description",
  "context": "Background context for this prompt",
  "task": "Main task or instruction",
  "variables": "[[VARIABLE_1]], [[VARIABLE_2]]",
  "reasoning": "How the AI should approach this",
  "examples": "Reference examples or patterns",
  "constraints": "Any limitations or boundaries",
  "rules": "Numbered or bulleted rules",
  "criteria": "What success looks like",
  "mustInclude": "Required sections or points",
  "avoid": "What to avoid or not include",
  "errorPolicy": "How to handle missing information",
  "tone": "Tone and voice style",
  "format": "Output format (Markdown, JSON, etc.)",
  "length": "Expected output length",
  "tools": "Tools or capabilities needed",
  "type": "Prompting strategy (Zero-Shot, Few-Shot, etc.)",
  "outputStructure": "Optional: Example output blueprint",
  "github_profile_url": "https://github.com/your-username"
}
```

---

## Your Information

- **GitHub Username:** [@your-username]()
- **GitHub Profile URL:** https://github.com/your-username
- **Your Email:** (optional)

---

## Validation Checklist

Please verify before submitting:

- [ ] Prompt title is clear and descriptive
- [ ] Task description is concise and actionable
- [ ] At least 3 of the core fields are completed (role, task, type, format)
- [ ] Examples or reference patterns are provided if using Few-Shot
- [ ] Tone and expected output format are specified
- [ ] GitHub profile URL is included for contributor attribution
- [ ] No duplicate/similar prompt exists in the library
- [ ] Prompt has been tested and produces good results
- [ ] JSON is valid and properly formatted

---

## Additional Notes

[Add any additional context, edge cases, or implementation tips that might help users of this prompt]

---

## Attribution

Your GitHub profile will be credited in the library as the contributor. Make sure your GitHub username and profile URL are correctly filled in above!

**Once approved, your prompt will appear in the PromptLab Library with your name linked to your GitHub profile.**
