import { WorkerLinter, Dialect } from 'harper.js';
import { binaryInlined } from 'harper.js/binaryInlined';
import { cleanValue, hasValue } from './promptGenerator.js';

const HARPER_MAX_SUGGESTIONS = 5;
let harperLinterParam = null;
let harperRequestToken = 0;
let uiFormatSuggestions = null;

export function scheduleHarperWarmup() {
  const warmup = () => {
    ensureHarperLinter().catch(() => {
      // Background loading failure is acceptable
    });
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(warmup, { timeout: 2000 });
  } else {
    window.setTimeout(warmup, 0);
  }
}

async function ensureHarperLinter() {
  if (!harperLinterParam) {
    const options = { binary: binaryInlined };
    if (Dialect && Dialect.American !== undefined) {
      options.dialect = Dialect.American;
    }
    const linter = new WorkerLinter(options);
    await linter.setup();
    harperLinterParam = linter;
  }
  return harperLinterParam;
}

export function runHarperSuggestions(prompt, formatSuggestionsPayload) {
  harperRequestToken++;
  const requestToken = harperRequestToken;
  uiFormatSuggestions = formatSuggestionsPayload || null;

  renderHarperSuggestionState({
    state: "loading",
    status: "Harper.js is checking grammar and spelling in the background.",
  });

  lintPromptWithHarper(prompt, requestToken);
}

async function lintPromptWithHarper(prompt, requestToken) {
  try {
    const linter = await ensureHarperLinter();
    const lints = await linter.lint(prompt, { language: "markdown" });

    if (requestToken !== harperRequestToken) {
      return;
    }
    renderHarperSuggestions(prompt, lints);
  } catch (error) {
    if (requestToken !== harperRequestToken) {
      return;
    }
    console.warn("Harper.js suggestions are unavailable.", error);
    renderHarperSuggestionState({
      state: "error",
      status: "Harper.js suggestions are unavailable right now. Prompt generation still completed.",
    });
  }
}

function renderHarperSuggestions(prompt, lints) {
  const normalizedLints = Array.isArray(lints) ? lints : [];
  const formatSuggestions = uiFormatSuggestions;

  if (normalizedLints.length === 0 && !formatSuggestions) {
    renderHarperSuggestionState({
      state: "clean",
      status: "Harper.js did not flag any obvious grammar or spelling issues.",
    });
    return;
  }

  let bodyHtml = "";
  let status = "";

  if (normalizedLints.length > 0) {
    const visibleLints = normalizedLints.slice(0, HARPER_MAX_SUGGESTIONS);
    const issueLabel = normalizedLints.length === 1 ? "issue" : "issues";
    status =
      normalizedLints.length > visibleLints.length
        ? `Harper.js flagged ${normalizedLints.length} possible ${issueLabel}. Showing the first ${visibleLints.length}.`
        : `Harper.js flagged ${normalizedLints.length} possible ${issueLabel}.`;

    bodyHtml += visibleLints
      .map((lint, index) => {
        const span = typeof lint.span === "function" ? lint.span() : { start: 0, end: 0 };
        const lineNumber = getLineNumberForIndex(prompt, span.start);
        const excerpt = getPromptExcerpt(prompt, span.start, span.end);
        const replacements = getHarperReplacements(lint);
        const chips =
          replacements.length > 0
            ? replacements
                .map((replacement) => `<span class="suggestion-chip">${escapeHtml(replacement)}</span>`)
                .join("")
            : '<span class="suggestion-chip suggestion-chip-muted">Review manually</span>';
        const lineLabel = lineNumber ? `Line ${lineNumber}` : "Prompt";
        const message = typeof lint.message === "function" ? lint.message() : "Review this text for grammar or spelling.";

        return `
                <article class="suggestion-item">
                    <div class="suggestion-item-header">
                        <div>
                            <p class="suggestion-message">${escapeHtml(message)}</p>
                            <p class="suggestion-meta">${escapeHtml(lineLabel)}${excerpt ? ` • ${escapeHtml(excerpt)}` : ""}</p>
                        </div>
                        <span class="suggestion-badge">#${index + 1}</span>
                    </div>
                    <div class="suggestion-chip-row">${chips}</div>
                </article>
            `;
      })
      .join("");

    if (formatSuggestions) {
      bodyHtml += `<div class="my-3 h-px bg-black/5"></div>`;
    }
  }

  if (formatSuggestions) {
    if (normalizedLints.length === 0) {
      status = formatSuggestions.status;
    } else {
      status += ` Additionally, ${formatSuggestions.status.toLowerCase()}`;
    }
    bodyHtml += formatSuggestions.bodyHtml;
  }

  renderHarperSuggestionState({
    state: "issues",
    status,
    bodyHtml,
  });
}

function renderHarperSuggestionState({ state, status, bodyHtml = "" }) {
  const panel = document.getElementById("harperSuggestionsPanel");
  const statusEl = document.getElementById("harperSuggestionsStatus");
  const bodyEl = document.getElementById("harperSuggestionsBody");

  if (!panel || !statusEl || !bodyEl) return;

  panel.classList.remove("hidden");
  panel.setAttribute("data-state", state);
  statusEl.textContent = status;

  if (hasValue(bodyHtml)) {
    bodyEl.innerHTML = bodyHtml;
    bodyEl.classList.remove("hidden");
  } else {
    bodyEl.innerHTML = "";
    bodyEl.classList.add("hidden");
  }
}

export function resetHarperSuggestions() {
  harperRequestToken++;
  const panel = document.getElementById("harperSuggestionsPanel");
  const statusEl = document.getElementById("harperSuggestionsStatus");
  const bodyEl = document.getElementById("harperSuggestionsBody");

  if (panel) {
    panel.classList.add("hidden");
    panel.setAttribute("data-state", "idle");
  }
  if (statusEl) {
    statusEl.textContent = "Harper.js suggestions will appear here after a prompt is generated.";
  }
  if (bodyEl) {
    bodyEl.innerHTML = "";
    bodyEl.classList.add("hidden");
  }
}

function getHarperReplacements(lint) {
  if (typeof lint.suggestions !== "function") return [];
  return Array.from(lint.suggestions())
    .slice(0, 3)
    .map((suggestion) => {
      if (typeof suggestion.get_replacement_text !== "function") return "";
      return cleanValue(suggestion.get_replacement_text());
    })
    .filter((replacement) => replacement.length > 0);
}

function getLineNumberForIndex(text, index) {
  if (!Number.isInteger(index) || index < 0) return null;
  return text.slice(0, index).split("\n").length;
}

function getPromptExcerpt(text, start, end) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) return "";
  const excerpt = cleanValue(text.slice(start, end)).replace(/\s+/g, " ");
  if (!hasValue(excerpt)) return "";
  return excerpt.length > 90 ? `${excerpt.slice(0, 87)}...` : excerpt;
}

function escapeHtml(value) {
  const p = document.createElement("p");
  p.textContent = value;
  return p.innerHTML;
}
