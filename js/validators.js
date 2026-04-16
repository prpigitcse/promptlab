import { hasValue, cleanValue } from './promptGenerator.js';

export function checkBlueprintFormatCompatibility(data) {
  const selectedFormat = data.format;
  const blueprint = cleanValue(data.outputStructure);

  if (!hasValue(blueprint) || !hasValue(selectedFormat)) {
    return null;
  }

  const issues = validateBlueprintFormat(blueprint, selectedFormat);
  
  if (issues.length === 0) {
    return null;
  } else {
    return createFormatSuggestions(blueprint, issues, selectedFormat);
  }
}

function createFormatSuggestions(blueprint, issues, format) {
  const issueCount = issues.length;
  const issueLabel = issueCount === 1 ? "suggestion" : "suggestions";
  const status = `Blueprint format validation found ${issueCount} ${issueLabel} for ${format} format.`;

  const escapeHtml = (value) => {
    const p = document.createElement("p");
    p.textContent = value;
    return p.innerHTML;
  };

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

  return { status, bodyHtml, issues };
}

export function validateBlueprintFormat(blueprint, format) {
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

  if (blueprint.trim().length < 10) {
    issues.push({
      type: "too_short",
      message: "Blueprint seems too short to be effectively used.",
      suggestion: "Consider adding more detail to your blueprint to guide the model better.",
      severity: "info",
    });
  }

  return issues;
}

function validateJSONStructure(blueprint) {
  const issues = [];
  const trimmed = blueprint.trim();

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

  if (trimmed.includes("'") && !trimmed.includes('"')) {
    const singleQuoteCount = (trimmed.match(/'/g) || []).length;
    if (singleQuoteCount >= 2) {
      issues.push({
        type: "quote_style",
        message: "JSON uses single quotes ('), but JSON requires double quotes (\").",
        suggestion: `Replace all single quotes with double quotes.\n\nWrong: {'key': 'value'}\nCorrect: {"key": "value"}`,
        severity: "warning",
      });
    }
  }

  try {
    JSON.parse(trimmed);
  } catch (e) {
    if (issues.length === 0) {
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

function validateCodeBlockSyntax(blueprint, format) {
  const issues = [];

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

  if (format === "CSS Code Block") {
    if (blueprint.includes("```css") && !blueprint.includes("```")) {
      const backticks = (blueprint.match(/```/g) || []).length;
      if (backticks < 2) {
        issues.push({
          type: "unclosed_code_block",
          message: "CSS code block appears to be unclosed (missing closing ```).",
          suggestion: "Close the code block with ```",
          severity: "warning",
        });
      }
    }
  }

  return issues;
}

function validateMarkdownSyntax(blueprint) {
  const issues = [];

  const backticks = (blueprint.match(/```/g) || []).length;
  if (backticks % 2 !== 0) {
    issues.push({
      type: "unclosed_code_block",
      message: "Unmatched code block backticks (```) detected.",
      suggestion: "Ensure code blocks are properly opened and closed with ```. Example:\n```\ncode here\n```",
      severity: "warning",
    });
  }

  const links = blueprint.match(/\[([^\]]*)\](?!\()/g);
  if (links && links.length > 0) {
    issues.push({
      type: "broken_link",
      message: "Broken markdown links detected (missing parentheses).",
      suggestion: "Use proper link syntax: [text](url)\n\nExample: [Click here](https://example.com)\n\nInstead of: [text]",
      severity: "info",
    });
  }

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

function validateHTMLStructure(blueprint) {
  const issues = [];
  const openTags = blueprint.match(/<([a-z][a-z0-9]*)/gi) || [];
  const closeTags = blueprint.match(/<\/([a-z][a-z0-9]*)/gi) || [];
  const selfClosingTags = ["br", "hr", "img", "input", "col", "meta", "link"];
  const pairedTags = {};

  openTags.forEach((tag) => {
    const tagName = tag.replace(/<\/?/g, "").toLowerCase().split(/\s/)[0];
    if (selfClosingTags.includes(tagName)) return;
    pairedTags[tagName] = (pairedTags[tagName] || 0) + 1;
  });

  closeTags.forEach((tag) => {
    const tagName = tag.replace(/<\/?/g, "").toLowerCase();
    pairedTags[tagName] = (pairedTags[tagName] || 0) - 1;
  });

  const mismatches = Object.entries(pairedTags).filter(([, count]) => count !== 0);
  if (mismatches.length > 0) {
    const details = mismatches
      .map(([tag, count]) =>
        count > 0 ? `${tag} (${count} extra opening)` : `${tag} (${Math.abs(count)} extra closing)`,
      )
      .join(", ");

    issues.push({
      type: "unbalanced_tags",
      message: `Unbalanced HTML tags detected: ${details}`,
      suggestion: "Ensure all opening tags have matching closing tags.\n\nExample:\n<div>\n  <p>Content</p>\n</div>",
      severity: "error",
    });
  }

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
