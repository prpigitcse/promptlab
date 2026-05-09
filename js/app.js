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
import {
  getSectionOrder,
  initSectionUX,
  updateSectionCompletionDots,
} from "./sectionOrder.js";
import { checkBlueprintFormatCompatibility } from "./validators.js";
import {
  scheduleHarperWarmup,
  runHarperSuggestions,
  resetHarperSuggestions,
} from "./harperIntegration.js";
import {
  showToast,
  closeModal,
  escapeHtml,
  renderPromptWithLineNumbers,
  switchPage,
  restorePageState,
  saveFormState,
  loadFormState,
} from "./ui.js";
import {
  PROMPT_RECORD_KIND,
  deletePromptRecord,
  getPromptRecords,
  savePromptRecord,
} from "./promptStorage.js";

let promptTemplates = [];
let userPromptRecords = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 30;
const ACTIVE_PROMPT_STORAGE_KEY = "promptLab_activePromptId";
let workingPromptSaveTimer;
let activePromptId = getStoredActivePromptId();
let suppressWorkingPromptSave = true;

document.addEventListener("DOMContentLoaded", () => {
  loadPrompts();
  loadFormState();
  restorePageState();
  scheduleHarperWarmup();

  const form = document.getElementById("promptForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      clearTimeout(workingPromptSaveTimer);
      const btn = document.getElementById("generateBtn");
      const originalContent = btn.innerHTML;
      btn.innerHTML = "<div class=\"spinner\"></div> Processing...";
      btn.disabled = true;

      saveFormState(); // update state

      setTimeout(async () => {
        const rawData = Object.fromEntries(new FormData(form));
        const data = normalizePromptData(rawData);
        const prompt = buildPromptString(data, getSectionOrder());
        const summary = buildPromptSummary(data);

        showPromptResult(data, prompt, summary);
        await saveGeneratedPrompt(rawData, data, prompt, summary);

        btn.innerHTML = originalContent;
        btn.disabled = false;
        showToast("Prompt engineered and saved.");
      }, 600);
    });

    form.addEventListener("input", () => {
      saveFormState();
      queueWorkingPromptSave();
      updateSectionCompletionDots();
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
      queueWorkingPromptSave();
    });
  }

  const formatSelect = document.getElementById("formatSelect");
  if (formatSelect) formatSelect.addEventListener("change", syncFormatUI);
  const customFormatInput = document.getElementById("customFormatInput");
  if (customFormatInput)
    customFormatInput.addEventListener("input", syncFormatUI);

  const navGen = document.getElementById("navGenerator");
  const navLib = document.getElementById("navLibrary");
  const navMyPrompts = document.getElementById("navMyPrompts");
  if (navGen) navGen.addEventListener("click", () => switchPage("generator"));
  if (navLib) navLib.addEventListener("click", () => switchPage("library"));
  if (navMyPrompts) {
    navMyPrompts.addEventListener("click", () => {
      switchPage("my-prompts");
      renderMyPrompts();
    });
  }

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

  let myPromptsSearchTimer;
  const myPromptsSearch = document.getElementById("myPromptsSearch");
  if (myPromptsSearch) {
    myPromptsSearch.addEventListener("input", () => {
      clearTimeout(myPromptsSearchTimer);
      myPromptsSearchTimer = setTimeout(renderMyPrompts, 200);
    });
  }

  const myPromptsGrid = document.getElementById("myPromptsGrid");
  if (myPromptsGrid) {
    myPromptsGrid.addEventListener("click", handleMyPromptAction);
  }

  syncFormatUI();
  suppressWorkingPromptSave = false;
  renderMyPrompts();

  // Section UX features (delegated to sectionOrder.js)
  initSectionUX();
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
  if (!suppressWorkingPromptSave) {
    queueWorkingPromptSave();
  }
}

function showPromptResult(data, prompt, summary) {
  document.getElementById("outputPlaceholder").classList.add("hidden");
  document.getElementById("resultContent").classList.remove("hidden");
  document.getElementById("copyBtn").classList.remove("hidden");
  document.getElementById("downloadBtn").classList.remove("hidden");

  renderPromptWithLineNumbers(prompt);
  document.getElementById("promptSummary").textContent =
    summary || buildPromptSummary(data);

  const formatChecks = checkBlueprintFormatCompatibility(data);
  runHarperSuggestions(prompt, formatChecks);
}

function resetPromptPreview() {
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
}

function getCurrentFormState() {
  const form = document.getElementById("promptForm");
  if (!form) return {};
  return Object.fromEntries(new FormData(form));
}

function getStoredActivePromptId() {
  try {
    return localStorage.getItem(ACTIVE_PROMPT_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function setActivePromptId(id) {
  activePromptId = id;
  try {
    localStorage.setItem(ACTIVE_PROMPT_STORAGE_KEY, id);
  } catch {
    // Ignore storage failures; IndexedDB remains the source of saved prompts.
  }
}

function clearActivePromptId() {
  activePromptId = "";
  try {
    localStorage.removeItem(ACTIVE_PROMPT_STORAGE_KEY);
  } catch {
    // Ignore storage failures; the form still resets.
  }
}

function createPromptId() {
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createVersionId() {
  return `version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hasPromptInput(data) {
  return Object.values(data).some((value) => hasValue(value));
}

function getPromptTitle(data, fallback) {
  const candidates = [data.task, data.role, data.context, fallback];
  const title = candidates.map((value) => cleanValue(value)).find(hasValue);
  return truncateText(title || "Untitled prompt", 84);
}

function truncateText(value, maxLength) {
  const text = cleanValue(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function getRecordSearchText(record) {
  const dataValues = Object.values(record.data || {});
  const versionValues = getRecordVersions(record).flatMap((version) => [
    version.kind,
    version.summary,
    version.prompt,
    version.timestamp,
    ...Object.values(version.data || {}),
  ]);
  return [
    record.title,
    record.summary,
    record.kind,
    record.prompt,
    ...dataValues,
    ...versionValues,
  ]
    .map((value) => cleanValue(value).toLowerCase())
    .join(" ");
}

function buildPromptRecord(record) {
  return {
    ...record,
    searchText: getRecordSearchText(record),
  };
}

function getRecordVersions(record) {
  if (Array.isArray(record.versions) && record.versions.length > 0) {
    return record.versions;
  }

  if (!record || !record.updatedAt) return [];

  return [
    {
      id: createVersionId(),
      kind: record.kind || PROMPT_RECORD_KIND.DRAFT,
      timestamp: record.updatedAt,
      summary: record.summary || "Custom prompt",
      prompt: record.prompt || "",
      data: record.data || {},
    },
  ];
}

function createVersion({ kind, timestamp, summary, prompt, data }) {
  return {
    id: createVersionId(),
    kind,
    timestamp,
    summary: summary || "Custom prompt",
    prompt: prompt || "",
    data: data || {},
  };
}

function upsertPromptVersion(record, version, { replaceLatestDraft = false }) {
  const versions = getRecordVersions(record);
  const latestVersion = versions[versions.length - 1];

  if (
    replaceLatestDraft &&
    latestVersion &&
    latestVersion.kind === PROMPT_RECORD_KIND.DRAFT
  ) {
    versions[versions.length - 1] = {
      ...latestVersion,
      ...version,
      id: latestVersion.id,
    };
    return versions;
  }

  return [...versions, version];
}

function getActiveRecord(records) {
  return records.find((record) => record.id === activePromptId) || null;
}

function getFirstWorkingDraft(records) {
  return records.find((record) => record.kind === PROMPT_RECORD_KIND.DRAFT);
}

function createEmptyRecord(now) {
  return {
    id: createPromptId(),
    createdAt: now,
    versions: [],
  };
}

async function deleteOtherWorkingDrafts(records, keptRecordId) {
  const staleDrafts = records.filter(
    (record) =>
      record.kind === PROMPT_RECORD_KIND.DRAFT && record.id !== keptRecordId,
  );

  await Promise.all(staleDrafts.map((record) => deletePromptRecord(record.id)));
}

function queueWorkingPromptSave(options = {}) {
  clearTimeout(workingPromptSaveTimer);
  workingPromptSaveTimer = setTimeout(() => saveWorkingPrompt(options), 300);
}

async function saveWorkingPrompt({ replaceGenerated = true } = {}) {
  try {
    const rawData = getCurrentFormState();
    const records = await getPromptRecords();
    const activeRecord = getActiveRecord(records);

    if (!hasPromptInput(rawData)) {
      if (activeRecord && activeRecord.kind === PROMPT_RECORD_KIND.DRAFT) {
        const hasGenVersion = getRecordVersions(activeRecord).some(
          (v) => v.kind === PROMPT_RECORD_KIND.GENERATED,
        );
        if (!hasGenVersion) {
          await deletePromptRecord(activeRecord.id);
        }
      }
      clearActivePromptId();
      await renderMyPrompts();
      return;
    }

    const now = new Date().toISOString();
    const normalizedData = normalizePromptData(rawData);
    let record = activeRecord;

    if (
      !record ||
      (record.kind === PROMPT_RECORD_KIND.GENERATED && !replaceGenerated)
    ) {
      record = getFirstWorkingDraft(records) || createEmptyRecord(now);
    }

    setActivePromptId(record.id);

    const version = createVersion({
      kind: PROMPT_RECORD_KIND.DRAFT,
      timestamp: now,
      summary: buildPromptSummary(normalizedData),
      prompt: "",
      data: rawData,
    });

    const updatedRecord = buildPromptRecord({
      ...record,
      kind: PROMPT_RECORD_KIND.DRAFT,
      title: getPromptTitle(normalizedData, "Working prompt"),
      summary: buildPromptSummary(normalizedData),
      prompt: "",
      data: rawData,
      createdAt: record.createdAt || now,
      updatedAt: now,
      versions: upsertPromptVersion(record, version, {
        replaceLatestDraft: true,
      }),
    });

    await savePromptRecord(updatedRecord);
    await deleteOtherWorkingDrafts(records, updatedRecord.id);
    await renderMyPrompts();
  } catch {
    const grid = document.getElementById("myPromptsGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-20 opacity-70">
          <i class="fas fa-database text-4xl text-white/40 mb-4 rounded-xl"></i>
          <p class="text-white/70 text-sm font-semibold">Browser storage is unavailable.</p>
        </div>`;
    }
  }
}

async function saveGeneratedPrompt(rawData, normalizedData, prompt, summary) {
  try {
    const now = new Date().toISOString();
    const records = await getPromptRecords();
    const record =
      getActiveRecord(records) ||
      getFirstWorkingDraft(records) ||
      createEmptyRecord(now);

    setActivePromptId(record.id);

    const version = createVersion({
      kind: PROMPT_RECORD_KIND.GENERATED,
      timestamp: now,
      summary,
      prompt,
      data: rawData,
    });

    const updatedRecord = buildPromptRecord({
      ...record,
      kind: PROMPT_RECORD_KIND.GENERATED,
      title: getPromptTitle(normalizedData, summary),
      summary,
      prompt,
      data: rawData,
      createdAt: record.createdAt || now,
      updatedAt: now,
      versions: upsertPromptVersion(record, version, {
        replaceLatestDraft: false,
      }),
    });

    await savePromptRecord(updatedRecord);
    await deleteOtherWorkingDrafts(records, updatedRecord.id);
    await renderMyPrompts();
  } catch {
    showToast("Prompt generated, but browser storage is unavailable.");
  }
}

function getMyPromptsQuery() {
  const searchInput = document.getElementById("myPromptsSearch");
  return cleanValue(searchInput ? searchInput.value : "").toLowerCase();
}

function getFilteredUserPromptRecords() {
  const query = getMyPromptsQuery();
  if (!query) return userPromptRecords;
  return userPromptRecords.filter((record) =>
    cleanValue(record.searchText).toLowerCase().includes(query),
  );
}

function updateMyPromptStats(records) {
  const draftCount = records.filter(
    (record) => record.kind === PROMPT_RECORD_KIND.DRAFT,
  ).length;
  const generatedCount = records.filter(
    (record) => record.kind === PROMPT_RECORD_KIND.GENERATED,
  ).length;

  const draftEl = document.getElementById("myPromptsDraftCount");
  const generatedEl = document.getElementById("myPromptsGeneratedCount");

  if (draftEl) draftEl.textContent = draftCount;
  if (generatedEl) generatedEl.textContent = generatedCount;
}

async function renderMyPrompts() {
  const grid = document.getElementById("myPromptsGrid");
  if (!grid) return;

  try {
    userPromptRecords = await getPromptRecords();
  } catch {
    updateMyPromptStats([]);
    grid.innerHTML = `
      <div class="col-span-full text-center py-20 opacity-70">
        <i class="fas fa-database text-4xl text-white/40 mb-4 rounded-xl"></i>
        <p class="text-white/70 text-sm font-semibold">Browser storage is unavailable.</p>
      </div>`;
    return;
  }

  const filtered = getFilteredUserPromptRecords();
  updateMyPromptStats(filtered);
  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-20 opacity-60">
        <i class="fas fa-folder-open text-4xl text-white/40 mb-4"></i>
        <p class="text-white/70 text-sm font-semibold">No saved prompts found.</p>
      </div>`;
    return;
  }

  filtered.forEach((record) => {
    grid.appendChild(createUserPromptCard(record));
  });
}

function createUserPromptCard(record) {
  const card = document.createElement("article");
  const isDraft = record.kind === PROMPT_RECORD_KIND.DRAFT;
  const kindLabel = isDraft ? "Working" : "Generated";
  const iconClass = isDraft ? "fa-pen-nib" : "fa-bolt";
  const canExport = hasValue(record.prompt);
  const versions = getRecordVersions(record);
  const versionLabel = `V${versions.length || 1}`;

  card.className = "glass-panel p-6 user-prompt-card flex flex-col";
  card.innerHTML = `
    <div class="flex items-start justify-between gap-4 mb-5">
      <span class="text-[10px] font-bold uppercase px-3 py-1 rounded bg-black/5 text-muted tracking-widest">
        <i class="fas ${iconClass} mr-2"></i>${kindLabel}
      </span>
      <span class="text-[10px] font-semibold text-muted uppercase text-right">
        ${escapeHtml(formatRecordTime(record.updatedAt))}
      </span>
    </div>
    <div class="flex-grow">
      <h3 class="font-bold text-sm mb-3 tracking-tight">
        ${escapeHtml(record.title || "Untitled prompt")}
      </h3>
      <p class="text-[11px] text-muted line-clamp-2 leading-relaxed font-semibold">
        ${escapeHtml(record.summary || "Custom prompt")}
      </p>
    </div>
    <div class="mt-6 pt-4 border-t border-black/5 flex items-center justify-between gap-4">
      <span class="text-[10px] font-bold text-accent uppercase tracking-widest whitespace-nowrap">
        Local ${versionLabel}
      </span>
      <div class="prompt-card-actions">
        <button
          type="button"
          class="prompt-action-button"
          data-action="history"
          data-record-id="${escapeHtml(record.id)}"
          title="View Versions"
          aria-label="View Versions"
        >
          <i class="fas fa-clock-rotate-left text-xs"></i>
        </button>
        <button
          type="button"
          class="prompt-action-button"
          data-action="load"
          data-record-id="${escapeHtml(record.id)}"
          title="Open in Generator"
          aria-label="Open in Generator"
        >
          <i class="fas fa-arrow-up-right-from-square text-xs"></i>
        </button>
        <button
          type="button"
          class="prompt-action-button"
          data-action="copy"
          data-record-id="${escapeHtml(record.id)}"
          title="Copy Prompt"
          aria-label="Copy Prompt"
          ${canExport ? "" : "disabled"}
        >
          <i class="fas fa-copy text-xs"></i>
        </button>
        <button
          type="button"
          class="prompt-action-button"
          data-action="download"
          data-record-id="${escapeHtml(record.id)}"
          title="Download Markdown"
          aria-label="Download Markdown"
          ${canExport ? "" : "disabled"}
        >
          <i class="fas fa-download text-xs"></i>
        </button>
        <button
          type="button"
          class="prompt-action-button prompt-action-danger"
          data-action="delete"
          data-record-id="${escapeHtml(record.id)}"
          title="Delete"
          aria-label="Delete"
        >
          <i class="fas fa-trash-alt text-xs"></i>
        </button>
      </div>
    </div>
  `;

  return card;
}

function formatRecordTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function findUserPromptRecord(recordId) {
  return userPromptRecords.find((record) => record.id === recordId);
}

function handleMyPromptAction(e) {
  const button = e.target.closest("button[data-action][data-record-id]");
  if (!button) return;

  const record = findUserPromptRecord(button.dataset.recordId);
  if (!record) return;

  switch (button.dataset.action) {
  case "history":
    openPromptVersionsModal(record);
    break;
  case "load":
    loadUserPromptToForm(record);
    break;
  case "copy":
    copyTextToClipboard(record.prompt, "Saved prompt copied.");
    break;
  case "download":
    downloadPromptText(record.prompt, record.summary || record.title);
    break;
  case "delete":
    deleteUserPrompt(record);
    break;
  default:
    break;
  }
}

function openPromptVersionsModal(record) {
  const versions = getRecordVersions(record).slice().reverse();
  const modalTitle = document.getElementById("modalTitle");
  const modalFormatBadge = document.getElementById("modalFormatBadge");
  const modalContent = document.getElementById("modalContent");
  const modalUseBtn = document.getElementById("modalUseBtn");
  const modalOverlay = document.getElementById("modalOverlay");

  if (!modalTitle || !modalFormatBadge || !modalContent || !modalOverlay) {
    return;
  }

  modalTitle.textContent = record.title || "Saved prompt";
  modalFormatBadge.textContent = `${versions.length || 1} Versions`;
  if (modalUseBtn) modalUseBtn.classList.add("hidden");

  const versionHtml = versions
    .map((version) => renderVersionCard(version))
    .join("");

  modalContent.innerHTML = `
    <div class="version-list" data-record-id="${escapeHtml(record.id)}">
      ${versionHtml}
    </div>
  `;

  const versionList = modalContent.querySelector(".version-list");
  if (versionList) {
    versionList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-version-id]");
      if (!btn) return;
      const recordId = versionList.dataset.recordId;
      const versionId = btn.dataset.versionId;
      if (recordId && versionId) {
        deployVersion(recordId, versionId);
      }
    });
  }

  modalOverlay.classList.remove("hidden");
  modalOverlay.classList.add("flex");
  modalOverlay.setAttribute("role", "dialog");
  modalOverlay.setAttribute("aria-modal", "true");
}

function renderVersionCard(version) {
  const changeLabel =
    version.kind === PROMPT_RECORD_KIND.GENERATED
      ? "Generated prompt"
      : "Draft saved";

  return `
    <article class="version-card">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs font-bold text-foreground/90">
            ${escapeHtml(changeLabel)}
          </p>
          <p class="text-[11px] font-semibold text-muted mt-1">
            ${escapeHtml(formatRecordTime(version.timestamp))}
          </p>
        </div>
        <button
          type="button"
          class="deploy-version-btn"
          data-version-id="${escapeHtml(version.id)}"
          title="Deploy this version"
          aria-label="Deploy this version"
        >
          <i class="fas fa-rocket text-xs mr-1"></i> Deploy
        </button>
      </div>
    </article>
  `;
}

async function deployVersion(recordId, versionId) {
  try {
    const records = await getPromptRecords();
    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    const versions = getRecordVersions(record);
    const version = versions.find((v) => v.id === versionId);
    if (!version) return;

    const now = new Date().toISOString();
    const deployedVersion = createVersion({
      kind: version.kind,
      timestamp: now,
      summary: version.summary,
      prompt: version.prompt,
      data: version.data,
    });

    const normalizedData = normalizePromptData(version.data || {});
    const updatedRecord = buildPromptRecord({
      ...record,
      kind: version.kind,
      title: getPromptTitle(normalizedData, version.summary),
      summary: version.summary,
      prompt: version.prompt || "",
      data: version.data || {},
      updatedAt: now,
      versions: [...versions, deployedVersion],
    });

    await savePromptRecord(updatedRecord);
    setActivePromptId(record.id);

    // Suppress the auto-save that populatePromptForm triggers via form events,
    // so the deployed snapshot is not immediately overwritten by a new draft.
    clearTimeout(workingPromptSaveTimer);
    const prevSuppression = suppressWorkingPromptSave;
    suppressWorkingPromptSave = true;
    populatePromptForm(version.data || {});
    suppressWorkingPromptSave = prevSuppression;

    if (version.prompt) {
      showPromptResult(
        normalizedData,
        version.prompt,
        version.summary,
      );
    } else {
      resetPromptPreview();
    }

    closeModal("modalOverlay");
    await renderMyPrompts();
    showToast("Version deployed.");
  } catch {
    showToast("Could not deploy version.");
  }
}

async function loadUserPromptToForm(record) {
  setActivePromptId(record.id);
  populatePromptForm(record.data || {});

  if (record.kind === PROMPT_RECORD_KIND.GENERATED) {
    await saveWorkingPrompt({ replaceGenerated: true });
  }

  resetPromptPreview();
  showToast("Prompt opened in Generator.");
}

async function deleteUserPrompt(record) {
  try {
    await deletePromptRecord(record.id);
    await renderMyPrompts();
    showToast("Prompt deleted.");
  } catch {
    showToast("Could not delete prompt.");
  }
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
  resetPromptPreview();

  const previousSuppression = suppressWorkingPromptSave;
  suppressWorkingPromptSave = true;
  const formatSelect = document.getElementById("formatSelect");
  if (formatSelect) formatSelect.dispatchEvent(new Event("change"));
  const typeSelect = document.getElementById("typeSelect");
  if (typeSelect) typeSelect.dispatchEvent(new Event("change"));
  suppressWorkingPromptSave = previousSuppression;

  closeModal("confirmModal");
  localStorage.removeItem("promptLab_formState");
  const recordIdToClear = activePromptId;
  clearActivePromptId();
  if (!recordIdToClear) {
    renderMyPrompts();
    showToast("Workspace reset complete.");
    return;
  }

  getPromptRecords()
    .then((records) => {
      const record = records.find((item) => item.id === recordIdToClear);
      if (!record || record.kind !== PROMPT_RECORD_KIND.DRAFT) return null;

      const hasGenVersion = getRecordVersions(record).some(
        (v) => v.kind === PROMPT_RECORD_KIND.GENERATED,
      );

      // Pure working draft with no generated history — safe to delete
      if (!hasGenVersion) {
        return deletePromptRecord(record.id);
      }

      // Reopened generated prompt — revert to its last generated state
      const lastGenVersion = [...getRecordVersions(record)]
        .reverse()
        .find((v) => v.kind === PROMPT_RECORD_KIND.GENERATED);
      if (lastGenVersion) {
        const restoredNormData = normalizePromptData(lastGenVersion.data || {});
        const restored = buildPromptRecord({
          ...record,
          kind: PROMPT_RECORD_KIND.GENERATED,
          title: getPromptTitle(restoredNormData, lastGenVersion.summary),
          summary: lastGenVersion.summary,
          prompt: lastGenVersion.prompt,
          data: lastGenVersion.data,
        });
        return savePromptRecord(restored);
      }
      return null;
    })
    .then(renderMyPrompts)
    .catch(() => {
      const grid = document.getElementById("myPromptsGrid");
      if (grid) {
        grid.innerHTML = `
          <div class="col-span-full text-center py-20 opacity-70">
            <i class="fas fa-database text-4xl text-white/40 mb-4 rounded-xl"></i>
            <p class="text-white/70 text-sm font-semibold">Browser storage is unavailable.</p>
          </div>`;
      }
    });
  showToast("Workspace reset complete.");
}

function downloadPrompt() {
  const finalPrompt = document.getElementById("finalPromptText");
  const promptText = (finalPrompt && finalPrompt.dataset.rawPrompt) || "";
  const summaryText = document.getElementById("promptSummary").textContent;
  downloadPromptText(promptText, summaryText);
}

function downloadPromptText(promptText, summaryText) {
  const fileName = buildPromptFileName(summaryText);
  const blob = new Blob([promptText], { type: "text/markdown" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
  showToast("Markdown file generated.");
}

function buildPromptFileName(summaryText) {
  return (
    (summaryText || "prompt-export").toLowerCase().replace(/[^\w-]/g, "-") +
    ".md"
  );
}

function copyToClipboard() {
  const finalPrompt = document.getElementById("finalPromptText");
  const text = (finalPrompt && finalPrompt.dataset.rawPrompt) || "";
  copyTextToClipboard(text, "Copied to clipboard.");
}

function copyTextToClipboard(text, successMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(successMessage));
  } else {
    // Fallback
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    showToast(successMessage);
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
  btn.classList.remove("hidden");
  btn.innerHTML = "Deploy Template";
  const clone = btn.cloneNode(true); // Remove old listeners
  btn.parentNode.replaceChild(clone, btn);

  clone.addEventListener("click", async function () {
    await loadTemplateToForm(t);
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

async function loadTemplateToForm(t) {
  populatePromptForm(t);
  await saveWorkingPrompt({ replaceGenerated: false });
  resetPromptPreview();
}

function populatePromptForm(data) {
  switchPage("generator");
  const previousSuppression = suppressWorkingPromptSave;
  suppressWorkingPromptSave = true;

  const typeSelect = document.getElementById("typeSelect");
  if (typeSelect) {
    let match = "";
    Array.from(typeSelect.options).forEach((opt) => {
      if (opt.value.toLowerCase().includes((data.type || "").toLowerCase())) {
        match = opt.value;
      }
    });
    typeSelect.value = match || data.type || "";
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
    if (input) input.value = data[field] || "";
  });

  const formatValue =
    data.format === CUSTOM_FORMAT_OPTION ? data.customFormat : data.format;
  setFormatFields(formatValue || "");
  const outputStructure = document.querySelector("[name=\"outputStructure\"]");
  if (outputStructure) outputStructure.value = data.outputStructure || "";

  suppressWorkingPromptSave = previousSuppression;
  saveFormState();
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
