/* ───────────────────────────────────────────
   PromptLab — Application Logic
   v0.1
   ─────────────────────────────────────────── */

// Global store for loaded prompt templates
let promptTemplates = [];
const CUSTOM_FORMAT_OPTION = "__custom__";
const HARPER_CDN_URL = "https://unpkg.com/harper.js@0.54.0/dist/harper.js";
const HARPER_MAX_SUGGESTIONS = 5;
let harperLinterPromise = null;
let harperRequestToken = 0;

// ── Initialization ──────────────────────────
$(document).ready(function () {
  loadPrompts();

  $("#promptForm").on("submit", function (e) {
    e.preventDefault();
    const btn = $("#generateBtn");
    const originalContent = btn.html();
    btn
      .html('<div class="spinner"></div> Processing...')
      .prop("disabled", true);

    setTimeout(() => {
      const formData = new FormData(this);
      const data = normalizePromptData(Object.fromEntries(formData));
      const prompt = buildPromptString(data);

      $("#outputPlaceholder").addClass("hidden");
      $("#resultContent").removeClass("hidden");
      $("#copyBtn").removeClass("hidden");
      $("#downloadBtn").removeClass("hidden");

      renderPromptWithLineNumbers(prompt);
      $("#promptSummary").text(buildPromptSummary(data));
      runHarperSuggestions(prompt);
      checkBlueprintFormatCompatibility(data);

      btn.html(originalContent).prop("disabled", false);
      showToast("Prompt engineered successfully.");
    }, 600);
  });

  // Toggle UI based on strategy selection
  $("#typeSelect").on("change", function () {
    if ($(this).val() === "Few-Shot") {
      $("#examplesContainer").addClass(
        "border-2 border-accent/20 p-4 rounded-lg bg-accent-bg/10",
      );
    } else {
      $("#examplesContainer").removeClass(
        "border-2 border-accent/20 p-4 rounded-lg bg-accent-bg/10",
      );
    }
  });

  $("#formatSelect").on("change", syncFormatUI);
  $("#customFormatInput").on("input", syncFormatUI);

  syncFormatUI();
  scheduleHarperWarmup();

  // Library search — reset to page 1 on each keystroke (debounced)
  let searchTimer;
  $("#librarySearch").on("keyup", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentPage = 1;
      renderLibrary();
    }, 250);
  });
});

// ── Load Prompts from /prompts/ folder ──────
function loadPrompts() {
  // Fetch the manifest of prompt JSON files
  $.getJSON("prompts/manifest.json")
    .done(function (files) {
      const requests = files.map((file) => $.getJSON("prompts/" + file));
      $.when.apply($, requests).done(function () {
        // Handle single vs. multiple results
        if (files.length === 1) {
          promptTemplates = [arguments[0]];
        } else {
          promptTemplates = Array.from(arguments).map((res) => res[0]);
        }
        renderLibrary();
      });
    })
    .fail(function () {
      console.warn(
        "Could not load prompts/manifest.json — library will be empty.",
      );
      renderLibrary();
    });
}

// ── Prompt Builder ──────────────────────────
function buildPromptString(data) {
  const sections = [];
  const outputRequirements = [];
  const strategyInstruction = getStrategyInstruction(data);

  if (hasValue(data.role)) {
    sections.push(`## ROLE\nYou are acting as ${data.role}.`);
  }

  if (hasValue(data.audience)) {
    sections.push(`## TARGET AUDIENCE\n${data.audience}`);
  }

  if (hasValue(data.context)) {
    sections.push(`## BACKGROUND CONTEXT\n${data.context}`);
  }

  sections.push(`## PRIMARY TASK\n${data.task}`);

  if (hasValue(strategyInstruction)) {
    sections.push(`## PROMPTING STRATEGY\n${strategyInstruction}`);
  }

  if (hasValue(data.variables)) {
    sections.push(
      `## INPUT VARIABLES\nUse these placeholders when relevant: ${data.variables}`,
    );
  }

  if (hasValue(data.reasoning)) {
    sections.push(`## APPROACH\n${data.reasoning}`);
  }

  if (hasValue(data.examples)) {
    sections.push(`## REFERENCE EXAMPLES\n${data.examples}`);
  }

  if (hasValue(data.mustInclude)) {
    sections.push(`## MUST INCLUDE\n${data.mustInclude}`);
  }

  if (hasValue(data.avoid)) {
    sections.push(`## AVOID\n${data.avoid}`);
  }

  if (hasValue(data.constraints)) {
    sections.push(`## CONSTRAINTS\n${data.constraints}`);
  }

  if (hasValue(data.rules)) {
    sections.push(`## RULES\n${data.rules}`);
  }

  if (hasValue(data.criteria)) {
    sections.push(`## SUCCESS CRITERIA\n${data.criteria}`);
  }

  if (hasValue(data.errorPolicy)) {
    sections.push(`## WHEN INFORMATION IS MISSING\n${data.errorPolicy}`);
  }

  if (hasValue(data.tone)) {
    outputRequirements.push(`- Tone and style: ${data.tone}`);
  }

  if (hasValue(data.format)) {
    outputRequirements.push(`- Format: ${data.format}`);
  }

  if (hasValue(data.length)) {
    outputRequirements.push(`- Length: ${data.length}`);
  }

  if (hasValue(data.tools)) {
    outputRequirements.push(`- Available tools: ${data.tools}`);
  }

  if (hasValue(data.memory)) {
    outputRequirements.push(`- Memory policy: ${data.memory}`);
  }

  if (outputRequirements.length > 0) {
    sections.push(`## OUTPUT REQUIREMENTS\n${outputRequirements.join("\n")}`);
  }

  if (hasValue(data.outputStructure)) {
    sections.push(`## OUTPUT BLUEPRINT\n${data.outputStructure}`);
  }

  return sections.join("\n\n");
}

function cleanValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\r\n/g, "\n").trim();
}

function hasValue(value) {
  return cleanValue(value).length > 0;
}

function resolveSelectedFormat(data) {
  if (cleanValue(data.format) === CUSTOM_FORMAT_OPTION) {
    return cleanValue(data.customFormat);
  }

  return cleanValue(data.format);
}

function normalizePromptData(data) {
  const normalized = {};

  Object.keys(data).forEach((key) => {
    normalized[key] = cleanValue(data[key]);
  });

  normalized.type = cleanValue(normalized.type);
  normalized.format = resolveSelectedFormat(normalized);

  return normalized;
}

function buildPromptSummary(data) {
  const parts = [];

  if (hasValue(data.type)) parts.push(`Strategy: ${data.type}`);
  if (hasValue(data.role)) parts.push(`Role: ${data.role}`);
  if (hasValue(data.format)) parts.push(`Format: ${data.format}`);

  return parts.join(" | ") || "Custom prompt";
}

function getStrategyInstruction(data) {
  switch (data.type) {
    case "Zero-Shot":
      return "Handle the request directly from the provided instructions without relying on reference examples unless they are explicitly included below.";
    case "Few-Shot":
      return hasValue(data.examples)
        ? "Use the reference examples below as the quality and structure baseline. Adapt them to the new input instead of copying them literally."
        : "When examples are provided, use them as the preferred pattern for structure, tone, and depth.";
    case "Chain-of-Thought":
      return "Work through the request carefully before answering, then present a clear final response. Keep intermediate reasoning focused and only expose it if the user explicitly asks for it.";
    case "Persona":
      return "Stay consistent with the requested role, judgment, and communication style throughout the response.";
    case "Tool-Using":
      return hasValue(data.tools)
        ? "Plan the work briefly, use the available tools when they improve accuracy, and ground the final answer in the tool results."
        : "Plan the work briefly and use tools when they improve accuracy or completeness.";
    case "Critique & Revise":
      return "Produce a strong first draft, check it against the success criteria and constraints, then refine it before returning the final answer.";
    default:
      return "";
  }
}

function syncFormatUI() {
  const selectedFormat = $("#formatSelect").val();
  const customContainer = $("#customFormatContainer");
  const customInput = $("#customFormatInput");
  const structureContainer = $("#dynamicStructureContainer");
  const structureLabel = $("#structureLabel");
  const structureInput = $("#outputStructure");

  const isCustomFormat = selectedFormat === CUSTOM_FORMAT_OPTION;
  const effectiveFormat = isCustomFormat
    ? cleanValue(customInput.val())
    : cleanValue(selectedFormat);
  const shouldShowStructure = hasValue(effectiveFormat);

  customContainer.toggleClass("hidden", !isCustomFormat);
  customInput.prop("required", isCustomFormat);

  structureContainer.toggleClass("hidden", !shouldShowStructure);
  structureInput.prop("disabled", !shouldShowStructure);
  structureLabel.text(
    shouldShowStructure
      ? `${effectiveFormat} blueprint`
      : "Output Blueprint / Schema",
  );
}

// ── Harper.js Suggestions ───────────────────
function scheduleHarperWarmup() {
  const warmup = () => {
    ensureHarperLinter().catch(() => {
      // Suggestion loading should stay silent and never block prompt generation.
    });
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(warmup, { timeout: 2000 });
  } else {
    window.setTimeout(warmup, 0);
  }
}

async function ensureHarperLinter() {
  if (!harperLinterPromise) {
    harperLinterPromise = import(HARPER_CDN_URL)
      .then(async (harper) => {
        const options = { binary: harper.binaryInlined };

        if (harper.Dialect && harper.Dialect.American !== undefined) {
          options.dialect = harper.Dialect.American;
        }

        const linter = new harper.WorkerLinter(options);
        await linter.setup();
        return linter;
      })
      .catch((error) => {
        harperLinterPromise = null;
        throw error;
      });
  }

  return harperLinterPromise;
}

function runHarperSuggestions(prompt) {
  const requestToken = ++harperRequestToken;

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
      status:
        "Harper.js suggestions are unavailable right now. Prompt generation still completed.",
    });
  }
}

function renderHarperSuggestions(prompt, lints) {
  const normalizedLints = Array.isArray(lints) ? lints : [];
  const formatSuggestions = window._formatSuggestions;

  if (normalizedLints.length === 0 && !formatSuggestions) {
    renderHarperSuggestionState({
      state: "clean",
      status: "Harper.js did not flag any obvious grammar or spelling issues.",
    });
    return;
  }

  let bodyHtml = "";
  let status = "";

  // Add Harper suggestions
  if (normalizedLints.length > 0) {
    const visibleLints = normalizedLints.slice(0, HARPER_MAX_SUGGESTIONS);
    const issueLabel = normalizedLints.length === 1 ? "issue" : "issues";
    status =
      normalizedLints.length > visibleLints.length
        ? `Harper.js flagged ${normalizedLints.length} possible ${issueLabel}. Showing the first ${visibleLints.length}.`
        : `Harper.js flagged ${normalizedLints.length} possible ${issueLabel}.`;

    bodyHtml += visibleLints
      .map((lint, index) => {
        const span =
          typeof lint.span === "function" ? lint.span() : { start: 0, end: 0 };
        const lineNumber = getLineNumberForIndex(prompt, span.start);
        const excerpt = getPromptExcerpt(prompt, span.start, span.end);
        const replacements = getHarperReplacements(lint);
        const chips =
          replacements.length > 0
            ? replacements
                .map(
                  (replacement) =>
                    `<span class="suggestion-chip">${escapeHtml(replacement)}</span>`,
                )
                .join("")
            : '<span class="suggestion-chip suggestion-chip-muted">Review manually</span>';
        const lineLabel = lineNumber ? `Line ${lineNumber}` : "Prompt";
        const message =
          typeof lint.message === "function"
            ? lint.message()
            : "Review this text for grammar or spelling.";

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

    // Add separator if both suggestion types exist
    if (formatSuggestions) {
      bodyHtml += `<div class="my-3 h-px bg-black/5"></div>`;
    }
  }

  // Add format suggestions
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
  const panel = $("#harperSuggestionsPanel");
  const statusEl = $("#harperSuggestionsStatus");
  const bodyEl = $("#harperSuggestionsBody");

  panel.removeClass("hidden").attr("data-state", state);
  statusEl.text(status);

  if (hasValue(bodyHtml)) {
    bodyEl.html(bodyHtml).removeClass("hidden");
  } else {
    bodyEl.empty().addClass("hidden");
  }
}

function resetHarperSuggestions() {
  harperRequestToken += 1;
  $("#harperSuggestionsPanel").addClass("hidden").attr("data-state", "idle");
  $("#harperSuggestionsStatus").text(
    "Harper.js suggestions will appear here after a prompt is generated.",
  );
  $("#harperSuggestionsBody").empty().addClass("hidden");
}

function getHarperReplacements(lint) {
  if (typeof lint.suggestions !== "function") {
    return [];
  }

  return Array.from(lint.suggestions())
    .slice(0, 3)
    .map((suggestion) => {
      if (typeof suggestion.get_replacement_text !== "function") {
        return "";
      }

      return cleanValue(suggestion.get_replacement_text());
    })
    .filter((replacement) => replacement.length > 0);
}

function getLineNumberForIndex(text, index) {
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }

  return text.slice(0, index).split("\n").length;
}

function getPromptExcerpt(text, start, end) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
    return "";
  }

  const excerpt = cleanValue(text.slice(start, end)).replace(/\s+/g, " ");

  if (!hasValue(excerpt)) {
    return "";
  }

  return excerpt.length > 90 ? `${excerpt.slice(0, 87)}...` : excerpt;
}

function escapeHtml(value) {
  return $("<div>").text(value).html();
}

// ── Blueprint Format Checking ───────────────
function checkBlueprintFormatCompatibility(data) {
  const selectedFormat = data.format;
  const blueprint = cleanValue(data.outputStructure);

  // If no blueprint or no format selected, skip checking
  if (!hasValue(blueprint) || !hasValue(selectedFormat)) {
    return;
  }

  const issues = validateBlueprintFormat(blueprint, selectedFormat);

  if (issues.length === 0) {
    return; // No issues, don't show anything
  } else {
    displayFormatSuggestions(blueprint, issues, selectedFormat);
  }
}

function displayFormatSuggestions(blueprint, issues, format) {
  const issueCount = issues.length;
  const issueLabel = issueCount === 1 ? "suggestion" : "suggestions";
  const status = `Blueprint format validation found ${issueCount} ${issueLabel} for ${format} format.`;

  const bodyHtml = issues
    .map((issue, index) => {
      const severityClass = `suggestion-item-${issue.severity}`;
      const severityIcon =
        issue.severity === "error"
          ? "🚫"
          : issue.severity === "warning"
            ? "⚠️"
            : "ℹ️";

      return `
            <article class="suggestion-item ${severityClass}">
                <div class="suggestion-item-header">
                    <div>
                        <p class="suggestion-message">${severityIcon} ${escapeHtml(issue.message)}</p>
                        <p class="suggestion-meta suggestion-suggestion">${escapeHtml(issue.suggestion)}</p>
                    </div>
                    <span class="suggestion-badge">#${index + 1}</span>
                </div>
            </article>
        `;
    })
    .join("");

  // Store format suggestions to be displayed with Harper suggestions
  window._formatSuggestions = { status, bodyHtml, issues };
}

function getMergedSuggestions() {
  // Called when rendering Harper suggestions to merge format suggestions
  return window._formatSuggestions || null;
}

function validateBlueprintFormat(blueprint, format) {
  const issues = [];
  const patterns = {
    JSON: {
      regex: /^\s*[{\[]/m,
      needed: "JSON structure with braces or brackets, starting with { or [",
      examples: '{"key": "value"}',
      isJSON: true,
    },
    Markdown: {
      regex: /^#{1,6}\s|^[-*]\s|^`{3}|\[.*\]\(.*\)/m,
      needed: "Markdown syntax like headings (#), lists, or code blocks",
      examples: "# Title\n- Item\n```code```",
    },
    "Markdown Document": {
      regex: /^#{1,6}\s|^[-*]\s|^`{3}|\[.*\]\(.*\)/m,
      needed: "Markdown document structure with sections",
      examples: "# Title\n## Section\n- Point",
    },
    "Markdown Tables and Lists": {
      regex: /^\|.*\|.*\||\s[-*]\s/m,
      needed: "Markdown tables (|) or lists (-/*).",
      examples: "| Column | Data |\n|--------|------\n- Item",
    },
    "Bullet Points": {
      regex: /^[-*•]\s/m,
      needed: "Bullet point format (-, *, or •)",
      examples: "- Item 1\n- Item 2",
    },
    "Numbered List": {
      regex: /^\d+\.\s/m,
      needed: "Numbered list format (1. 2. 3.)",
      examples: "1. First\n2. Second\n3. Third",
    },
    List: {
      regex: /^[-*•]|\d+\./m,
      needed: "List format (bullets or numbers)",
      examples: "- Item\n1. First",
    },
    "Categorized List": {
      regex: /^#{1,3}\s.*\n[-*•]|^#{1,3}\s.*\n\d+\./m,
      needed: "Categories with headings followed by list items",
      examples: "## Category\n- Item 1\n- Item 2",
    },
    Paragraphs: {
      regex: /^[^\n]{20,}(?:\n\n[^\n]{20,})?/m,
      needed: "Multiple paragraphs (continuous text)",
      examples: "Long text forming multiple sentences...",
    },
    "JSON Structure": {
      regex: /^\s*[{\[]/m,
      needed: "JSON with objects or arrays starting with { or [",
      examples: '{"data": []}',
      isJSON: true,
    },
    "Structured Document": {
      regex: /^#{1,4}\s|^---$|^> /m,
      needed: "Document structure with headings or sections",
      examples: "# Title\n---\nContent",
    },
    "Review Document": {
      regex: /^#{1,3}\s|^[-*]\s|^> /m,
      needed: "Document structure suitable for reviews",
      examples: "## Section\n- Finding\n> Note",
    },
    Timeline: {
      regex: /\d{4}[-/]\d{1,2}|\d{4}|[-→]|^\*\s|^-\s/m,
      needed: "Timeline format with dates or chronological markers",
      examples: "2024 - Event\n→ Next event",
    },
    Dialogue: {
      regex: /^#{1,2}\s.*:.*\n|^.*:\s+|^["'].*["']/m,
      needed: "Dialogue format with speakers or quotes",
      examples: 'Speaker: "Text"',
    },
    "Email Draft": {
      regex: /^Subject:|^To:|^From:|^Date:/m,
      needed: "Email headers (Subject, To, From, Date)",
      examples: "Subject: Title\nTo: email@example.com",
    },
    "Code Block": {
      regex: /^```|^    |^\t|[(){}\[\]<>]/m,
      needed: "Code syntax with indentation or brackets",
      examples: "```\ncode\n```",
    },
    "Bash Code Block": {
      regex: /bash|bin.*bash|&&|;|\$\(|for |if /m,
      needed: "Bash script syntax (bash keyword, &&, $)",
      examples: "bash\nscript\nruns",
    },
    "SQL Code Block": {
      regex: /SELECT|INSERT|UPDATE|DELETE|CREATE|DROP/im,
      needed: "SQL keywords (SELECT, INSERT, etc.)",
      examples: "SELECT * FROM table;",
    },
    "TypeScript Code Block": {
      regex: /^```typescript|function|interface|type|const.*:\s|=>/m,
      needed: "TypeScript syntax (function, interface, type)",
      examples: "```typescript\nfunction foo() {}\n```",
    },
    "CSS Code Block": {
      regex: /^```css|^\.[\w-]+|^#[\w-]+|\{[\s\S]*?:[\s\S]*?;\s*\}/m,
      needed: "CSS selectors and rules",
      examples: ".class { color: red; }",
    },
    "HTML/CSS": {
      regex: /<[a-z]|{[\s\S]*?:[\s\S]*?;}|class=|id=/m,
      needed: "HTML tags or CSS rules",
      examples: '<div class=""></div>',
    },
  };

  const pattern = patterns[format];

  if (pattern && !pattern.regex.test(blueprint)) {
    issues.push({
      type: "format_mismatch",
      message: `Blueprint doesn't seem to contain typical ${format.toLowerCase()} elements.`,
      suggestion: `Expected ${pattern.needed}.\n\nExample: ${pattern.examples}`,
      severity: "warning",
    });
  }

  // Special validation for different formats
  if (pattern && pattern.isJSON && pattern.regex.test(blueprint)) {
    const jsonIssues = validateJSONStructure(blueprint);
    issues.push(...jsonIssues);
  }

  if (
    (format === "CSS Code Block" ||
      format === "TypeScript Code Block" ||
      format === "HTML/CSS") &&
    pattern.regex.test(blueprint)
  ) {
    const codeIssues = validateCodeBlockSyntax(blueprint, format);
    issues.push(...codeIssues);
  }

  if (
    (format === "Markdown" ||
      format === "Markdown Document" ||
      format === "Markdown Tables and Lists") &&
    pattern.regex.test(blueprint)
  ) {
    const markdownIssues = validateMarkdownSyntax(blueprint);
    issues.push(...markdownIssues);
  }

  if (format === "Email Draft" && pattern.regex.test(blueprint)) {
    const emailIssues = validateEmailDraft(blueprint);
    issues.push(...emailIssues);
  }

  if (format === "HTML/CSS" && pattern.regex.test(blueprint)) {
    const htmlIssues = validateHTMLStructure(blueprint);
    issues.push(...htmlIssues);
  }

  // Check for common structural issues
  if (blueprint.trim().length < 10) {
    issues.push({
      type: "too_short",
      message: "Blueprint seems too short to be effectively used.",
      suggestion:
        "Consider adding more detail to your blueprint to guide the model better.",
      severity: "info",
    });
  }

  return issues;
}

// Validate JSON structure specifically
function validateJSONStructure(blueprint) {
  const issues = [];
  const trimmed = blueprint.trim();

  // Check for matching braces and brackets
  const openBraces = (trimmed.match(/{/g) || []).length;
  const closeBraces = (trimmed.match(/}/g) || []).length;
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/\]/g) || []).length;

  if (openBraces !== closeBraces) {
    issues.push({
      type: "unbalanced_braces",
      message: `Unbalanced braces detected: ${openBraces} opening, ${closeBraces} closing.`,
      suggestion: `Check that all { have matching }.\n\nExample:\n{\n  "key": "value"\n}`,
      severity: "error",
    });
  }

  if (openBrackets !== closeBrackets) {
    issues.push({
      type: "unbalanced_brackets",
      message: `Unbalanced brackets detected: ${openBrackets} opening, ${closeBrackets} closing.`,
      suggestion: `Check that all [ have matching ].\n\nExample:\n[\n  "item1",\n  "item2"\n]`,
      severity: "error",
    });
  }

  // Check for common JSON errors
  if (trimmed.includes("'") && !trimmed.includes('"')) {
    // Warning about single quotes instead of double quotes
    const singleQuoteCount = (trimmed.match(/'/g) || []).length;
    if (singleQuoteCount >= 2) {
      issues.push({
        type: "quote_style",
        message:
          "JSON uses single quotes ('), but JSON requires double quotes (\").",
        suggestion: `Replace all single quotes with double quotes.\n\nWrong: {'key': 'value'}\nCorrect: {"key": "value"}`,
        severity: "warning",
      });
    }
  }

  // Try to parse as JSON to catch other errors
  try {
    JSON.parse(trimmed);
  } catch (e) {
    if (issues.length === 0) {
      // Only add generic error if no specific errors found
      issues.push({
        type: "invalid_json",
        message: `JSON parsing error: ${e.message.split("\n")[0]}`,
        suggestion: `Ensure your JSON is valid. Common issues:\n- Missing commas between properties\n- Trailing commas\n- Unquoted keys\n- Unescaped special characters`,
        severity: "error",
      });
    }
  }

  return issues;
}

// Validate code block syntax (CSS, TypeScript, HTML)
function validateCodeBlockSyntax(blueprint, format) {
  const issues = [];

  // Check for unbalanced braces
  const openBraces = (blueprint.match(/{/g) || []).length;
  const closeBraces = (blueprint.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push({
      type: "unbalanced_braces",
      message: `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing.`,
      suggestion: "Ensure all { have matching }.",
      severity: "error",
    });
  }

  // Check for unbalanced parentheses
  const openParens = (blueprint.match(/\(/g) || []).length;
  const closeParens = (blueprint.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push({
      type: "unbalanced_parens",
      message: `Unbalanced parentheses: ${openParens} opening, ${closeParens} closing.`,
      suggestion: "Ensure all ( have matching ).",
      severity: "error",
    });
  }

  // Check for unbalanced brackets
  const openBrackets = (blueprint.match(/\[/g) || []).length;
  const closeBrackets = (blueprint.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    issues.push({
      type: "unbalanced_brackets",
      message: `Unbalanced brackets: ${openBrackets} opening, ${closeBrackets} closing.`,
      suggestion: "Ensure all [ have matching ].",
      severity: "error",
    });
  }

  // CSS specific checks
  if (format === "CSS Code Block") {
    // Check for unclosed CSS code block
    if (blueprint.includes("```css") && !blueprint.includes("```")) {
      const backticks = (blueprint.match(/```/g) || []).length;
      if (backticks < 2) {
        issues.push({
          type: "unclosed_code_block",
          message:
            "CSS code block appears to be unclosed (missing closing ```).",
          suggestion: "Close the code block with ```",
          severity: "warning",
        });
      }
    }
  }

  return issues;
}

// Validate Markdown syntax
function validateMarkdownSyntax(blueprint) {
  const issues = [];

  // Check for unmatched backticks in code blocks
  const backticks = (blueprint.match(/```/g) || []).length;
  if (backticks % 2 !== 0) {
    issues.push({
      type: "unclosed_code_block",
      message: "Unmatched code block backticks (```) detected.",
      suggestion:
        "Ensure code blocks are properly opened and closed with ```. Example:\n```\ncode here\n```",
      severity: "warning",
    });
  }

  // Check for broken markdown links
  const linkPattern = /\[([^\]]+)\]\(([^)]*)\)/g;
  const links = blueprint.match(/\[([^\]]*)\](?!\()/g);
  if (links && links.length > 0) {
    issues.push({
      type: "broken_link",
      message: "Broken markdown links detected (missing parentheses).",
      suggestion:
        "Use proper link syntax: [text](url)\n\nExample: [Click here](https://example.com)\n\nInstead of: [text]",
      severity: "info",
    });
  }

  // Check for unbalanced brackets in links/references
  const openBrackets = (blueprint.match(/\[/g) || []).length;
  const closeBrackets = (blueprint.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    issues.push({
      type: "unbalanced_brackets",
      message: `Unbalanced brackets: ${openBrackets} opening, ${closeBrackets} closing.`,
      suggestion: "Check markdown links and references for matching [ and ].",
      severity: "warning",
    });
  }

  return issues;
}

// Validate Email Draft format
function validateEmailDraft(blueprint) {
  const issues = [];
  const requiredHeaders = ["Subject", "To"];
  const foundHeaders = [];

  requiredHeaders.forEach((header) => {
    if (blueprint.includes(header + ":")) {
      foundHeaders.push(header);
    }
  });

  if (foundHeaders.length === 0) {
    issues.push({
      type: "missing_headers",
      message: "Email draft is missing required headers.",
      suggestion: `Email drafts should include at least:\n- Subject: ...\n- To: ...\n\nExample:\nSubject: Meeting Notes\nTo: team@example.com\nFrom: you@example.com\n\nEmail body text here...`,
      severity: "warning",
    });
  } else if (foundHeaders.length === 1) {
    issues.push({
      type: "incomplete_headers",
      message: `Email draft has only ${foundHeaders[0]} header. Missing: ${requiredHeaders.filter((h) => !foundHeaders.includes(h)).join(", ")}`,
      suggestion: "Add missing email headers (To:, Subject:, etc.)",
      severity: "info",
    });
  }

  return issues;
}

// Validate HTML structure
function validateHTMLStructure(blueprint) {
  const issues = [];

  // Extract HTML tags
  const openTags = blueprint.match(/<([a-z][a-z0-9]*)/gi) || [];
  const closeTags = blueprint.match(/<\/([a-z][a-z0-9]*)/gi) || [];

  // Count self-closing vs paired tags
  const selfClosingTags = ["br", "hr", "img", "input", "col", "meta", "link"];
  const pairedTags = {};

  // Count open tags
  openTags.forEach((tag) => {
    const tagName = tag.replace(/<\/?/g, "").toLowerCase().split(/\s/)[0];
    if (selfClosingTags.includes(tagName)) return;
    pairedTags[tagName] = (pairedTags[tagName] || 0) + 1;
  });

  // Count close tags
  closeTags.forEach((tag) => {
    const tagName = tag.replace(/<\/?/g, "").toLowerCase();
    pairedTags[tagName] = (pairedTags[tagName] || 0) - 1;
  });

  // Check for mismatches
  const mismatches = Object.entries(pairedTags).filter(
    ([, count]) => count !== 0,
  );
  if (mismatches.length > 0) {
    const details = mismatches
      .map(([tag, count]) =>
        count > 0
          ? `${tag} (${count} extra opening)`
          : `${tag} (${Math.abs(count)} extra closing)`,
      )
      .join(", ");

    issues.push({
      type: "unbalanced_tags",
      message: `Unbalanced HTML tags detected: ${details}`,
      suggestion:
        "Ensure all opening tags have matching closing tags.\n\nExample:\n<div>\n  <p>Content</p>\n</div>",
      severity: "error",
    });
  }

  // Check for unbalanced braces (in CSS)
  const openBraces = (blueprint.match(/{/g) || []).length;
  const closeBraces = (blueprint.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push({
      type: "unbalanced_css_braces",
      message: `Unbalanced CSS braces: ${openBraces} opening, ${closeBraces} closing.`,
      suggestion: "Check your CSS rules for matching { and }.",
      severity: "error",
    });
  }

  return issues;
}

// ── Render Helpers ──────────────────────────
function renderPromptWithLineNumbers(prompt) {
  $("#finalPromptText").data("raw-prompt", prompt);
  const lines = prompt.split("\n");
  let html = "";
  for (let i = 0; i < lines.length; i++) {
    const escaped = $("<div>").text(lines[i]).html();
    html += `<div class="prompt-row"><div class="line-num">${i + 1}</div><div class="line-text">${escaped}</div></div>`;
  }
  $("#finalPromptText").html(html);
}

function showToast(msg) {
  const id = "toast-" + Date.now();
  const toast = `<div id="${id}" class="toast"><i class="fas fa-check-circle text-green-400"></i> ${msg}</div>`;
  $("#toast-container").append(toast);
  setTimeout(() => {
    $(`#${id}`).fadeOut(300, function () {
      $(this).remove();
    });
  }, 3000);
}

// ── Page Navigation ─────────────────────────
function switchPage(page) {
  $(".nav-link").removeClass("active text-gray-900").addClass("text-white/70");
  $(`.nav-link:contains('${page.charAt(0).toUpperCase() + page.slice(1)}')`)
    .addClass("active text-gray-900")
    .removeClass("text-white/70");
  $(".page-content").removeClass("active").hide();
  $(`#${page}-page`).addClass("active").fadeIn();
}

// ── Modal Controls ──────────────────────────
function confirmClear() {
  $("#confirmModal").removeClass("hidden").addClass("flex");
}

function closeModal(id) {
  $(`#${id}`).addClass("hidden").removeClass("flex");
}

function executeClear() {
  const form = $("#promptForm")[0];
  if (form) form.reset();
  $("#promptForm textarea, #promptForm input").val("");
  $("#dynamicStructureContainer").addClass("hidden");
  $("#outputPlaceholder").removeClass("hidden");
  $("#resultContent").addClass("hidden");
  $("#copyBtn").addClass("hidden");
  $("#downloadBtn").addClass("hidden");
  $("#finalPromptText").html("").removeData("raw-prompt");
  resetHarperSuggestions();
  $("#formatSelect").trigger("change");
  $("#typeSelect").trigger("change");
  closeModal("confirmModal");
  showToast("Workspace reset complete.");
}

// ── Download & Copy ─────────────────────────
function downloadPrompt() {
  const promptText = $("#finalPromptText").data("raw-prompt") || "";
  const summaryText = $("#promptSummary").text();
  const fileName =
    (summaryText || "prompt-export").toLowerCase().replace(/[^\w-]/g, "-") +
    ".md";
  const blob = new Blob([promptText], { type: "text/markdown" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  showToast("Markdown file generated.");
}

function copyToClipboard() {
  const text = $("#finalPromptText").data("raw-prompt") || "";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Copied to clipboard."));
  } else {
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    showToast("Copied to clipboard.");
  }
}

// ── Library Pagination & Render ─────────────
const ITEMS_PER_PAGE = 30;
let currentPage = 1;

function getFilteredTemplates() {
  const query = ($("#librarySearch").val() || "").toLowerCase().trim();
  if (!query) return promptTemplates;
  return promptTemplates.filter(
    (t) =>
      t.title.toLowerCase().includes(query) ||
      t.task.toLowerCase().includes(query) ||
      t.role.toLowerCase().includes(query) ||
      t.type.toLowerCase().includes(query) ||
      t.format.toLowerCase().includes(query),
  );
}

function renderLibrary() {
  const grid = $("#libraryGrid");
  const paginationEl = $("#paginationControls");
  grid.empty();
  paginationEl.empty();

  const filtered = getFilteredTemplates();

  if (filtered.length === 0) {
    grid.html(`
            <div class="col-span-full text-center py-20 opacity-50">
                <i class="fas fa-folder-open text-4xl text-white/30 mb-4"></i>
                <p class="text-white/50 text-sm font-semibold">No prompt templates found.</p>
            </div>
        `);
    return;
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  pageItems.forEach((template) => {
    // Build author attribution HTML
    let authorHtml;
    if (template.github_profile_url) {
      const username = template.github_profile_url
        .replace(/\/+$/, "")
        .split("/")
        .pop();
      authorHtml = `<a href="${template.github_profile_url}" target="_blank" rel="noopener noreferrer"
                            class="flex items-center gap-1.5 text-[10px] font-semibold text-muted hover:text-accent transition-colors"
                            onclick="event.stopPropagation()">
                            <i class="fab fa-github text-xs"></i>${username}
                          </a>`;
    } else {
      authorHtml = `<span class="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                            <i class="fas fa-robot text-xs"></i>System
                          </span>`;
    }

    const card = `
            <div class="glass-panel p-6 card-template flex flex-col justify-between" onclick="viewTemplate(${template.id})">
                <div>
                    <div class="flex justify-between items-start mb-6">
                        <span class="text-[10px] font-bold uppercase px-3 py-1 rounded bg-black/5 text-muted tracking-widest">
                            ${template.format}
                        </span>
                        <div class="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center text-muted/30">
                            <i class="fas fa-ellipsis-h text-xs"></i>
                        </div>
                    </div>
                    <h3 class="font-bold text-sm mb-3 tracking-tight group-hover:text-accent transition-colors">${template.title}</h3>
                    <p class="text-[11px] text-muted line-clamp-2 leading-relaxed font-semibold">${template.task}</p>
                </div>
                <div class="mt-6 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-accent uppercase tracking-widest">${template.type}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-semibold text-muted uppercase tracking-tighter">${template.role}</span>
                            <div class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-black/5">
                        <span class="text-[9px] font-bold text-muted/60 uppercase tracking-widest">Author</span>
                        ${authorHtml}
                    </div>
                </div>
            </div>
        `;
    grid.append(card);
  });

  // Render pagination controls if more than 1 page
  if (totalPages > 1) {
    renderPagination(totalPages, paginationEl, filtered.length);
  }
}

function renderPagination(totalPages, container, totalItems) {
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  let html = `<span class="text-[11px] font-semibold text-zinc-500 mr-4">${startItem}–${endItem} of ${totalItems}</span>`;

  // Previous button
  html += `<button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}
        class="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all
        ${
          currentPage === 1
            ? "bg-zinc-100 text-zinc-300 cursor-not-allowed"
            : "bg-white/70 text-zinc-600 hover:bg-white hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-sm backdrop-blur-sm"
        }">
        <i class="fas fa-chevron-left text-[10px]"></i>
    </button>`;

  // Page numbers (show max 7 pages with ellipsis)
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  pages.forEach((p) => {
    if (p === "...") {
      html += `<span class="w-9 h-9 flex items-center justify-center text-zinc-400 text-xs font-bold">…</span>`;
    } else {
      const isActive = p === currentPage;
      html += `<button onclick="goToPage(${p})"
                class="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all
                ${
                  isActive
                    ? "bg-violet-700 text-white shadow-lg shadow-violet-500/30 border border-violet-600"
                    : "bg-white/70 text-zinc-600 hover:bg-white hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-sm backdrop-blur-sm"
                }">
                ${p}
            </button>`;
    }
  });

  // Next button
  html += `<button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}
        class="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all
        ${
          currentPage === totalPages
            ? "bg-zinc-100 text-zinc-300 cursor-not-allowed"
            : "bg-white/70 text-zinc-600 hover:bg-white hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-sm backdrop-blur-sm"
        }">
        <i class="fas fa-chevron-right text-[10px]"></i>
    </button>`;

  container.html(html);
}

function goToPage(page) {
  const filtered = getFilteredTemplates();
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderLibrary();
  // Scroll to top of library section
  document
    .getElementById("library-page")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

function viewTemplate(id) {
  const t = promptTemplates.find((x) => x.id === id);
  if (!t) return;

  $("#modalTitle").text(t.title);
  $("#modalFormatBadge").text(t.format);

  let html = `
        <div class="space-y-8">
            <div class="grid grid-cols-2 gap-6">
                <div class="p-4 rounded-2xl bg-black/[0.03] border border-black/5 shadow-sm">
                    <p class="text-[10px] uppercase font-bold text-muted mb-2 tracking-widest">Identity</p>
                    <p class="text-xs font-bold text-foreground uppercase">${t.role}</p>
                </div>
                <div class="p-4 rounded-2xl bg-black/[0.03] border border-black/5 shadow-sm">
                    <p class="text-[10px] uppercase font-bold text-muted mb-2 tracking-widest">Strategy</p>
                    <p class="text-xs font-bold text-foreground uppercase">${t.type}</p>
                </div>
            </div>
            <div>
                <p class="text-[10px] uppercase font-bold text-muted mb-3 tracking-widest">Task Definition</p>
                <p class="text-sm leading-relaxed font-semibold text-foreground/80">${t.task}</p>
            </div>
            ${
              t.outputStructure
                ? `
                <div>
                    <p class="text-[10px] uppercase font-bold text-muted mb-3 tracking-widest">Blueprint / Schema</p>
                    <div class="code-container">
                        <div class="p-5 font-mono text-[11px] leading-relaxed w-full">${t.outputStructure.replace(/\n/g, "<br>")}</div>
                    </div>
                </div>
            `
                : ""
            }
        </div>
    `;

  $("#modalContent").html(html);

  $("#modalUseBtn")
    .off("click")
    .on("click", function () {
      loadTemplateToForm(t);
      const btn = $(this);
      btn.html('<i class="fas fa-check"></i> Template Deployed');
      showToast("Template deployed to workspace.");
      setTimeout(() => btn.text("Deploy Template"), 2000);
    });

  $("#modalOverlay").removeClass("hidden").addClass("flex");
}

function loadTemplateToForm(t) {
  switchPage("generator");

  const typeMatch = $("#typeSelect option")
    .filter(function () {
      return $(this).val().toLowerCase().includes(t.type.toLowerCase());
    })
    .val();
  $("#typeSelect")
    .val(typeMatch || t.type)
    .trigger("change");

  $('[name="role"]').val(t.role || "");
  $('[name="audience"]').val(t.audience || "");
  $('[name="context"]').val(t.context || "");
  $('[name="task"]').val(t.task || "");
  $('[name="variables"]').val(t.variables || "");
  $('[name="reasoning"]').val(t.reasoning || "");
  $('[name="examples"]').val(t.examples || "");
  $('[name="constraints"]').val(t.constraints || "");
  $('[name="rules"]').val(t.rules || "");
  $('[name="mustInclude"]').val(t.mustInclude || "");
  $('[name="avoid"]').val(t.avoid || "");
  $('[name="criteria"]').val(t.criteria || "");
  $('[name="errorPolicy"]').val(t.errorPolicy || "");
  $('[name="tone"]').val(t.tone || "");
  $('[name="length"]').val(t.length || "");
  $('[name="tools"]').val(t.tools || "");
  $('[name="memory"]').val(t.memory || "");

  setFormatFields(t.format || "");
  $('[name="outputStructure"]').val(t.outputStructure || "");
  $("#promptForm").submit();
}

function setFormatFields(formatValue) {
  const format = cleanValue(formatValue);
  const formatSelect = $('[name="format"]');
  const customFormatInput = $('[name="customFormat"]');

  if (!hasValue(format)) {
    formatSelect.val("");
    customFormatInput.val("");
    syncFormatUI();
    return;
  }

  const matchingOption = formatSelect.find("option").filter(function () {
    return $(this).val() === format;
  });

  if (matchingOption.length > 0) {
    formatSelect.val(format);
    customFormatInput.val("");
  } else {
    formatSelect.val(CUSTOM_FORMAT_OPTION);
    customFormatInput.val(format);
  }

  syncFormatUI();
}
