# My Prompts IndexedDB Storage

PromptLab includes a **My Prompts** tab for prompts created in the current browser.

## What Gets Saved

- **Working draft:** The current generator form is mirrored into a single active working record while the user edits.
- **Generated prompts:** Each successful Generate Prompt action promotes the active working prompt to `generated` instead of creating a duplicate card.
- **Versions:** Each prompt record keeps timestamped versions for working and generated states. Users can deploy any past version to make it the current active state.
- **Local-only records:** These records stay in the user's browser profile unless the user copies, downloads, contributes, or otherwise shares them.

## Files

| File | Purpose |
| ---- | ------- |
| `index.html` | Adds the My Prompts tab and page shell |
| `js/promptStorage.js` | IndexedDB wrapper for prompt records |
| `js/app.js` | Autosaves drafts, saves generated prompts, renders My Prompts cards, version history and deploy |
| `css/style.css` | My Prompts card/action/deploy-button styling |
| `privacy.html` | Documents local IndexedDB browser storage |

## IndexedDB Shape

Database: `PromptLabUserPrompts`

Object store: `prompts`

Indexes:

- `kind`
- `updatedAt`

Record example:

```json
{
  "id": "prompt-1776940000000-a1b2c3",
  "kind": "generated",
  "title": "Review this PR for regressions...",
  "summary": "Strategy: Zero-Shot | Role: Principal Engineer",
  "prompt": "## ROLE\nYou are acting as...",
  "data": {
    "type": "Zero-Shot",
    "role": "Principal Engineer",
    "task": "Review this PR for regressions"
  },
  "createdAt": "2026-04-23T10:00:00.000Z",
  "updatedAt": "2026-04-23T10:00:00.000Z",
  "versions": [
    {
      "id": "version-1776940000000-z9y8x7",
      "kind": "generated",
      "timestamp": "2026-04-23T10:00:00.000Z",
      "summary": "Strategy: Zero-Shot | Role: Principal Engineer",
      "prompt": "## ROLE\nYou are acting as...",
      "data": {
        "type": "Zero-Shot",
        "role": "Principal Engineer",
        "task": "Review this PR for regressions"
      }
    }
  ],
  "searchText": "review this pr..."
}
```

## Version History

Each prompt card has a version history (clock icon) that shows all versions in reverse chronological order. Each entry displays:

- **Change type** — "Generated prompt" or "Draft saved"
- **Timestamp** — when the version was created

A **Deploy** button on each version lets the user restore that version as the current active prompt. Deploying a version:

1. Copies the version's data, prompt, and summary into the record's top-level fields.
2. Creates a new version entry with the current timestamp to maintain an accurate timeline.
3. Loads the version's form data into the Generator.
4. Shows the generated prompt preview if the version had a generated prompt.

## Behavior Notes

- Deploying a public library template opens it as the active working prompt only. It does not generate or create a generated history card.
- Generate Prompt changes the active prompt status to `generated` and appends a timestamped generated version.
- Reopening a generated prompt from My Prompts changes that same record back to `draft`/working and appends or updates a working version.
- **Reset Workspace preserves generated prompts.** If the active prompt was originally generated and then reopened as a draft, resetting the workspace reverts it to its last generated state instead of deleting it. Only pure working drafts (with no generated versions in history) are deleted on reset.
- Deleting a card in My Prompts removes that individual IndexedDB record.
- Draft cards can be reopened in Generator; generated cards can be reopened as working prompts, copied, downloaded as Markdown, or inspected through the version history icon.
- Users can deploy any past version from the version history to make it the current active version.
- If IndexedDB is blocked or unavailable, the Generator continues to work and the My Prompts page shows storage as unavailable.
