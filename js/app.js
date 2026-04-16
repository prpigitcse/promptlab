/**
 * Copyright 2026 Pradosh Ranjan Pattanayak
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  buildPromptString,
  normalizePromptData,
  buildPromptSummary,
  CUSTOM_FORMAT_OPTION,
  hasValue,
  cleanValue,
} from "./promptGenerator.js";
import { checkBlueprintFormatCompatibility } from "./validators.js";
import {
  scheduleHarperWarmup,
  runHarperSuggestions,
  resetHarperSuggestions,
} from "./harperIntegration.js";
import {
  showToast,
  closeModal,
  renderPromptWithLineNumbers,
  switchPage,
  saveFormState,
  loadFormState,
} from "./ui.js";

let promptTemplates = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 30;

document.addEventListener("DOMContentLoaded", () => {
  loadPrompts();
  loadFormState();
  scheduleHarperWarmup();

  const form = document.getElementById("promptForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = document.getElementById("generateBtn");
      const originalContent = btn.innerHTML;
      btn.innerHTML = "<div class=\"spinner\"></div> Processing...";
      btn.disabled = true;

      saveFormState(); // update state

      setTimeout(() => {
        const formData = new FormData(form);
        const data = normalizePromptData(Object.fromEntries(formData));
        const prompt = buildPromptString(data);

        document.getElementById("outputPlaceholder").classList.add("hidden");
        document.getElementById("resultContent").classList.remove("hidden");
        document.getElementById("copyBtn").classList.remove("hidden");
        document.getElementById("downloadBtn").classList.remove("hidden");

        renderPromptWithLineNumbers(prompt);
        document.getElementById("promptSummary").textContent =
          buildPromptSummary(data);

        const formatChecks = checkBlueprintFormatCompatibility(data);
        runHarperSuggestions(prompt, formatChecks);

        btn.innerHTML = originalContent;
        btn.disabled = false;
        showToast("Prompt engineered successfully.");
      }, 600);
    });

    form.addEventListener("input", () => {
      saveFormState();
    });
  }

  const typeSelect = document.getElementById("typeSelect");
  if (typeSelect) {
    typeSelect.addEventListener("change", function () {
      const examplesContainer = document.getElementById("examplesContainer");
      if (this.value === "Few-Shot") {
        examplesContainer.classList.add(
          "border-2",
          "border-accent/20",
          "p-4",
          "rounded-lg",
          "bg-accent-bg/10",
        );
      } else {
        examplesContainer.classList.remove(
          "border-2",
          "border-accent/20",
          "p-4",
          "rounded-lg",
          "bg-accent-bg/10",
        );
      }
      saveFormState();
    });
  }

  const formatSelect = document.getElementById("formatSelect");
  if (formatSelect) formatSelect.addEventListener("change", syncFormatUI);
  const customFormatInput = document.getElementById("customFormatInput");
  if (customFormatInput)
    customFormatInput.addEventListener("input", syncFormatUI);

  const navGen = document.getElementById("navGenerator");
  const navLib = document.getElementById("navLibrary");
  if (navGen) navGen.addEventListener("click", () => switchPage("generator"));
  if (navLib) navLib.addEventListener("click", () => switchPage("library"));

  const confirmClearBtn = document.getElementById("confirmClearBtn");
  if (confirmClearBtn) confirmClearBtn.addEventListener("click", confirmClear);

  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) downloadBtn.addEventListener("click", downloadPrompt);

  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn) copyBtn.addEventListener("click", copyToClipboard);

  const cancelClearBtn = document.getElementById("cancelClearBtn");
  if (cancelClearBtn)
    cancelClearBtn.addEventListener("click", () => closeModal("confirmModal"));

  const clearAllBtn = document.getElementById("clearAllBtn");
  if (clearAllBtn) clearAllBtn.addEventListener("click", executeClear);

  const modalOverlay = document.getElementById("modalOverlay");
  if (modalOverlay)
    modalOverlay.addEventListener("click", () => closeModal("modalOverlay"));

  const modalContentWrapper = document.getElementById("modalContentWrapper");
  if (modalContentWrapper) {
    modalContentWrapper.addEventListener("click", (e) => e.stopPropagation());
  }

  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalCloseSecondaryBtn = document.getElementById(
    "modalCloseSecondaryBtn",
  );
  if (modalCloseBtn)
    modalCloseBtn.addEventListener("click", () => closeModal("modalOverlay"));
  if (modalCloseSecondaryBtn)
    modalCloseSecondaryBtn.addEventListener("click", () =>
      closeModal("modalOverlay"),
    );

  const paginationControls = document.getElementById("paginationControls");
  if (paginationControls) {
    paginationControls.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (btn) {
        goToPage(Number(btn.dataset.page));
      }
    });
  }

  const libraryGrid = document.getElementById("libraryGrid");
  if (libraryGrid) {
    libraryGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".card-template");
      if (card && card.dataset.templateId) {
        if (!e.target.closest(".author-link")) {
          viewTemplate(Number(card.dataset.templateId));
        }
      }
    });
  }

  let searchTimer;
  const librarySearch = document.getElementById("librarySearch");
  if (librarySearch) {
    librarySearch.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentPage = 1;
        renderLibrary();
      }, 250);
    });
  }

  syncFormatUI();
});

// Load Prompts using Fetch
async function loadPrompts() {
  try {
    const manifestRes = await fetch("prompts/manifest.json");
    if (!manifestRes.ok) throw new Error("Manifest not found");
    const files = await manifestRes.json();

    const requests = files.map((file) =>
      fetch("prompts/" + file).then((res) => res.json()),
    );
    const responses = await Promise.all(requests);

    promptTemplates = responses;
    renderLibrary();
  } catch (err) {
    console.warn(
      "Could not load prompts/manifest.json — library will be empty.",
      err,
    );
    renderLibrary();
  }
}

function syncFormatUI() {
  const formatSelect = document.getElementById("formatSelect");
  const customContainer = document.getElementById("customFormatContainer");
  const customInput = document.getElementById("customFormatInput");
  const structureContainer = document.getElementById(
    "dynamicStructureContainer",
  );
  const structureLabel = document.getElementById("structureLabel");
  const structureInput = document.getElementById("outputStructure");

  if (!formatSelect || !customContainer || !customInput || !structureContainer)
    return;

  const selectedFormat = formatSelect.value;
  const isCustomFormat = selectedFormat === CUSTOM_FORMAT_OPTION;
  const effectiveFormat = isCustomFormat
    ? cleanValue(customInput.value)
    : cleanValue(selectedFormat);
  const shouldShowStructure = hasValue(effectiveFormat);

  customContainer.classList.toggle("hidden", !isCustomFormat);
  customInput.required = isCustomFormat;

  structureContainer.classList.toggle("hidden", !shouldShowStructure);
  structureInput.disabled = !shouldShowStructure;
  structureLabel.textContent = shouldShowStructure
    ? `${effectiveFormat} blueprint`
    : "Output Blueprint / Schema";

  saveFormState();
}

function confirmClear() {
  const modal = document.getElementById("confirmModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
  }
}

function executeClear() {
  const form = document.getElementById("promptForm");
  if (form) form.reset();
  document.getElementById("dynamicStructureContainer").classList.add("hidden");
  document.getElementById("outputPlaceholder").classList.remove("hidden");
  document.getElementById("resultContent").classList.add("hidden");
  document.getElementById("copyBtn").classList.add("hidden");
  document.getElementById("downloadBtn").classList.add("hidden");

  const finalPrompt = document.getElementById("finalPromptText");
  if (finalPrompt) {
    finalPrompt.innerHTML = "";
    delete finalPrompt.dataset.rawPrompt;
  }

  resetHarperSuggestions();

  const formatSelect = document.getElementById("formatSelect");
  if (formatSelect) formatSelect.dispatchEvent(new Event("change"));
  const typeSelect = document.getElementById("typeSelect");
  if (typeSelect) typeSelect.dispatchEvent(new Event("change"));

  closeModal("confirmModal");
  localStorage.removeItem("promptLab_formState");
  showToast("Workspace reset complete.");
}

function downloadPrompt() {
  const finalPrompt = document.getElementById("finalPromptText");
  const promptText = (finalPrompt && finalPrompt.dataset.rawPrompt) || "";
  const summaryText = document.getElementById("promptSummary").textContent;
  const fileName =
    (summaryText || "prompt-export").toLowerCase().replace(/[^\w-]/g, "-") +
    ".md";

  const blob = new Blob([promptText], { type: "text/markdown" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
  showToast("Markdown file generated.");
}

function copyToClipboard() {
  const finalPrompt = document.getElementById("finalPromptText");
  const text = (finalPrompt && finalPrompt.dataset.rawPrompt) || "";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Copied to clipboard."));
  } else {
    // Fallback
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
function getFilteredTemplates() {
  const searchInput = document.getElementById("librarySearch");
  const query = (searchInput ? searchInput.value : "").toLowerCase().trim();
  if (!query) return promptTemplates;
  return promptTemplates.filter(
    (t) =>
      (t.title || "").toLowerCase().includes(query) ||
      (t.task || "").toLowerCase().includes(query) ||
      (t.role || "").toLowerCase().includes(query) ||
      (t.type || "").toLowerCase().includes(query) ||
      (t.format || "").toLowerCase().includes(query),
  );
}

function renderLibrary() {
  const grid = document.getElementById("libraryGrid");
  const paginationEl = document.getElementById("paginationControls");
  if (!grid || !paginationEl) return;

  grid.innerHTML = "";
  paginationEl.innerHTML = "";

  const filtered = getFilteredTemplates();

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-20 opacity-50">
          <i class="fas fa-folder-open text-4xl text-white/30 mb-4"></i>
          <p class="text-white/50 text-sm font-semibold">No prompt templates found.</p>
      </div>`;
    return;
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  pageItems.forEach((template) => {
    let authorHtml;
    if (template.github_profile_url) {
      const username = template.github_profile_url
        .replace(/\/+$/, "")
        .split("/")
        .pop();
      authorHtml = `<a href="${template.github_profile_url}" target="_blank" rel="noopener noreferrer"
                            class="author-link flex items-center gap-1.5 text-[10px] font-semibold text-muted hover:text-accent transition-colors">
                            <i class="fab fa-github text-xs"></i>${username}
                          </a>`;
    } else {
      authorHtml = `<span class="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                            <i class="fas fa-robot text-xs"></i>System
                          </span>`;
    }

    const card = document.createElement("div");
    card.className =
      "glass-panel p-6 card-template flex flex-col justify-between";
    card.dataset.templateId = template.id;
    card.innerHTML = `
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
    `;
    grid.appendChild(card);
  });

  if (totalPages > 1) {
    renderPagination(totalPages, paginationEl, filtered.length);
  }
}

function renderPagination(totalPages, container, totalItems) {
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  let html = `<span class="text-[11px] font-semibold text-zinc-500 mr-4">${startItem}–${endItem} of ${totalItems}</span>`;

  html += `<button data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}
        class="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all
        ${currentPage === 1 ? "bg-zinc-100 text-zinc-300 cursor-not-allowed" : "bg-white/70 text-zinc-600 hover:bg-white hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-sm backdrop-blur-sm"} "
        aria-label="Previous Page">
        <i class="fas fa-chevron-left text-[10px]"></i>
    </button>`;

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
      html +=
        "<span class=\"w-9 h-9 flex items-center justify-center text-zinc-400 text-xs font-bold\">…</span>";
    } else {
      const isActive = p === currentPage;
      html += `<button data-page="${p}"
                class="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all
                ${isActive ? "bg-violet-700 text-white shadow-lg shadow-violet-500/30 border border-violet-600" : "bg-white/70 text-zinc-600 hover:bg-white hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-sm backdrop-blur-sm"} "
                aria-label="Page ${p}">
                ${p}
            </button>`;
    }
  });

  html += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}
        class="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all
        ${currentPage === totalPages ? "bg-zinc-100 text-zinc-300 cursor-not-allowed" : "bg-white/70 text-zinc-600 hover:bg-white hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-sm backdrop-blur-sm"} "
        aria-label="Next Page">
        <i class="fas fa-chevron-right text-[10px]"></i>
    </button>`;

  container.innerHTML = html;
}

function goToPage(page) {
  const filtered = getFilteredTemplates();
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderLibrary();
  document
    .getElementById("library-page")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

function viewTemplate(id) {
  const t = promptTemplates.find((x) => x.id === id);
  if (!t) return;

  document.getElementById("modalTitle").textContent = t.title;
  document.getElementById("modalFormatBadge").textContent = t.format;

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

  document.getElementById("modalContent").innerHTML = html;

  const btn = document.getElementById("modalUseBtn");
  const clone = btn.cloneNode(true); // Remove old listeners
  btn.parentNode.replaceChild(clone, btn);

  clone.addEventListener("click", function () {
    loadTemplateToForm(t);
    this.innerHTML = "<i class=\"fas fa-check\"></i> Template Deployed";
    showToast("Template deployed to workspace.");
    setTimeout(() => (this.textContent = "Deploy Template"), 2000);
  });

  const modalOverlay = document.getElementById("modalOverlay");
  modalOverlay.classList.remove("hidden");
  modalOverlay.classList.add("flex");
  modalOverlay.setAttribute("role", "dialog");
  modalOverlay.setAttribute("aria-modal", "true");
}

function loadTemplateToForm(t) {
  switchPage("generator");

  const typeSelect = document.getElementById("typeSelect");
  if (typeSelect) {
    let match = "";
    Array.from(typeSelect.options).forEach((opt) => {
      if (opt.value.toLowerCase().includes((t.type || "").toLowerCase())) {
        match = opt.value;
      }
    });
    typeSelect.value = match || t.type || "";
    typeSelect.dispatchEvent(new Event("change"));
  }

  const fields = [
    "role",
    "audience",
    "context",
    "task",
    "variables",
    "reasoning",
    "examples",
    "constraints",
    "rules",
    "mustInclude",
    "avoid",
    "criteria",
    "errorPolicy",
    "tone",
    "length",
    "tools",
    "memory",
  ];
  fields.forEach((field) => {
    const input = document.querySelector(`[name="${field}"]`);
    if (input) input.value = t[field] || "";
  });

  setFormatFields(t.format || "");
  const outputStructure = document.querySelector("[name=\"outputStructure\"]");
  if (outputStructure) outputStructure.value = t.outputStructure || "";

  saveFormState();
  const form = document.getElementById("promptForm");
  if (form) form.dispatchEvent(new Event("submit"));
}

function setFormatFields(formatValue) {
  const format = cleanValue(formatValue);
  const formatSelect = document.querySelector("[name=\"format\"]");
  const customFormatInput = document.querySelector("[name=\"customFormat\"]");

  if (!hasValue(format)) {
    if (formatSelect) formatSelect.value = "";
    if (customFormatInput) customFormatInput.value = "";
    syncFormatUI();
    return;
  }

  let matched = false;
  if (formatSelect) {
    Array.from(formatSelect.options).forEach((opt) => {
      if (opt.value === format) matched = true;
    });

    if (matched) {
      formatSelect.value = format;
      if (customFormatInput) customFormatInput.value = "";
    } else {
      formatSelect.value = CUSTOM_FORMAT_OPTION;
      if (customFormatInput) customFormatInput.value = format;
    }
  }

  syncFormatUI();
}
