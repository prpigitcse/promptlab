# My Prompts IndexedDB Storage

PromptLab includes a **My Prompts** tab for prompts created in the current browser.

## What Gets Saved

- **Working draft:** The current generator form is mirrored into IndexedDB as a single `working-draft` record while the user edits.
- **Generated prompts:** Each successful Generate Prompt action creates a timestamped history record with the normalized prompt data, final prompt text, summary, and search text.
- **Local-only records:** These records stay in the user's browser profile unless the user copies, downloads, contributes, or otherwise shares them.

## Files

| File | Purpose |
| ---- | ------- |
| `index.html` | Adds the My Prompts tab and page shell |
| `js/promptStorage.js` | IndexedDB wrapper for prompt records |
| `js/app.js` | Autosaves drafts, saves generated prompts, renders My Prompts cards |
| `css/style.css` | My Prompts card/action styling |
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
  "id": "generated-1776940000000-a1b2c3",
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
  "searchText": "review this pr..."
}
```

## Behavior Notes

- Reset Workspace deletes only the `working-draft` record and leaves generated history intact.
- Deleting a card in My Prompts removes that individual IndexedDB record.
- Draft cards can be reopened in Generator; generated cards can be reopened, copied, or downloaded as Markdown.
- If IndexedDB is blocked or unavailable, the Generator continues to work and the My Prompts page shows storage as unavailable.
