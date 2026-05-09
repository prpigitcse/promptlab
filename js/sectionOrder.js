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

/**
 * sectionOrder.js — Section ordering, reorder panel, collapse, and quick-nav.
 *
 * Exports:
 *   getSectionOrder()          → string[]  current persisted order
 *   initSectionUX(showToast)   → void      call once on DOMContentLoaded
 *   updateSectionCompletionDots()
 */

import { cleanValue } from "./promptGenerator.js";
import { showToast } from "./ui.js";

// ── Constants ────────────────────────────────────────────────────────────────

export const SECTION_ORDER_KEY = "promptLab_sectionOrder";
export const DEFAULT_SECTION_ORDER = ["identity", "task", "boundaries", "delivery"];

const SECTION_META = {
  identity:   { label: "Identity & Foundation",   icon: "fa-fingerprint" },
  task:       { label: "Task & Execution",         icon: "fa-brain" },
  boundaries: { label: "Boundaries & Policy",      icon: "fa-shield-alt" },
  delivery:   { label: "Delivery & Capabilities",  icon: "fa-layer-group" },
};

const SECTION_FIELDS = {
  identity:   ["type", "role", "audience", "context"],
  task:       ["task", "variables", "reasoning", "examples"],
  boundaries: ["constraints", "rules", "mustInclude", "avoid", "criteria", "errorPolicy"],
  delivery:   ["tone", "format", "length", "tools", "memory", "outputStructure"],
};

// ── Storage helpers ──────────────────────────────────────────────────────────

export function getSectionOrder() {
  try {
    const stored = localStorage.getItem(SECTION_ORDER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        Array.isArray(parsed) &&
        parsed.length === DEFAULT_SECTION_ORDER.length &&
        DEFAULT_SECTION_ORDER.every((id) => parsed.includes(id))
      ) {
        return parsed;
      }
    }
  } catch {
    // fall back
  }
  return [...DEFAULT_SECTION_ORDER];
}

function saveSectionOrder(order) {
  try {
    localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(order));
  } catch {
    // ignore
  }
}

function isSectionOrderDefault(order) {
  return order.every((id, i) => id === DEFAULT_SECTION_ORDER[i]);
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function updateResetOrderVisibility() {
  const btn = document.getElementById("resetSectionOrderBtn");
  if (!btn) return;
  btn.classList.toggle("hidden", isSectionOrderDefault(getSectionOrder()));
}

function restoreSectionOrder() {
  const container = document.getElementById("formSectionsContainer");
  if (!container) return;
  getSectionOrder().forEach((sectionId) => {
    const el = document.getElementById(`form-section-${sectionId}`);
    if (el) container.appendChild(el);
  });
  updateResetOrderVisibility();
}

function updateQuickNavOrder(order) {
  const nav = document.getElementById("sectionQuickNav");
  if (!nav) return;
  const pills = nav.querySelectorAll(".quick-nav-pill[data-target-section]");
  const pillMap = {};
  pills.forEach((p) => { pillMap[p.dataset.targetSection] = p; });
  const resetBtn = nav.querySelector("#resetSectionOrderBtn");
  order.forEach((id) => {
    if (pillMap[id]) nav.appendChild(pillMap[id]);
  });
  if (resetBtn) nav.appendChild(resetBtn);
}

function applyOrder(order) {
  saveSectionOrder(order);
  restoreSectionOrder();
  renderSectionOrderPanel();
  updateQuickNavOrder(order);
}

function resetSectionOrder() {
  applyOrder([...DEFAULT_SECTION_ORDER]);
  showToast("Section order restored.");
}

// ── Reorder Panel ─────────────────────────────────────────────────────────────

function renderSectionOrderPanel() {
  const list = document.getElementById("sectionOrderList");
  if (!list) return;

  const order = getSectionOrder();
  list.innerHTML = "";
  let dragSrcId = null;

  order.forEach((sectionId, idx) => {
    const meta = SECTION_META[sectionId];
    const chip = document.createElement("div");
    chip.className = "soc-chip";
    chip.draggable = true;
    chip.dataset.sectionId = sectionId;
    chip.innerHTML = `
      <span class="soc-grip"><i class="fas fa-grip-vertical"></i></span>
      <i class="fas ${meta.icon} soc-icon"></i>
      <span class="soc-label">${meta.label}</span>
      <div class="soc-arrows">
        <button type="button" class="soc-arrow" data-dir="up" data-id="${sectionId}" title="Move up" ${idx === 0 ? "disabled" : ""}>
          <i class="fas fa-chevron-up"></i>
        </button>
        <button type="button" class="soc-arrow" data-dir="down" data-id="${sectionId}" title="Move down" ${idx === order.length - 1 ? "disabled" : ""}>
          <i class="fas fa-chevron-down"></i>
        </button>
      </div>
    `;

    chip.addEventListener("dragstart", (e) => {
      dragSrcId = sectionId;
      chip.classList.add("soc-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", sectionId);
    });

    chip.addEventListener("dragend", () => {
      chip.classList.remove("soc-dragging");
      list.querySelectorAll(".soc-chip").forEach((c) =>
        c.classList.remove("soc-drop-above", "soc-drop-below")
      );
      dragSrcId = null;
    });

    chip.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!dragSrcId || dragSrcId === sectionId) return;
      e.dataTransfer.dropEffect = "move";
      list.querySelectorAll(".soc-chip").forEach((c) =>
        c.classList.remove("soc-drop-above", "soc-drop-below")
      );
      const rect = chip.getBoundingClientRect();
      chip.classList.add(
        e.clientY < rect.top + rect.height / 2 ? "soc-drop-above" : "soc-drop-below"
      );
    });

    chip.addEventListener("dragleave", (e) => {
      if (!chip.contains(e.relatedTarget)) {
        chip.classList.remove("soc-drop-above", "soc-drop-below");
      }
    });

    chip.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!dragSrcId || dragSrcId === sectionId) return;
      const currentOrder = getSectionOrder();
      const fromIdx = currentOrder.indexOf(dragSrcId);
      const toIdx = currentOrder.indexOf(sectionId);
      const insertBefore = chip.classList.contains("soc-drop-above");
      chip.classList.remove("soc-drop-above", "soc-drop-below");

      const newOrder = [...currentOrder];
      newOrder.splice(fromIdx, 1);
      const finalIdx = fromIdx < toIdx
        ? (insertBefore ? toIdx - 1 : toIdx)
        : (insertBefore ? toIdx : toIdx + 1);
      newOrder.splice(finalIdx, 0, dragSrcId);

      applyOrder(newOrder);
      showToast("Section order updated.");
    });

    list.appendChild(chip);
  });

  // Arrow button handler (delegated on the list)
  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".soc-arrow");
    if (!btn || btn.disabled) return;
    const id = btn.dataset.id;
    const dir = btn.dataset.dir;
    const currentOrder = getSectionOrder();
    const i = currentOrder.indexOf(id);
    if (i < 0) return;
    const newOrder = [...currentOrder];
    if (dir === "up" && i > 0) {
      [newOrder[i - 1], newOrder[i]] = [newOrder[i], newOrder[i - 1]];
    } else if (dir === "down" && i < newOrder.length - 1) {
      [newOrder[i], newOrder[i + 1]] = [newOrder[i + 1], newOrder[i]];
    } else return;
    applyOrder(newOrder);
    showToast("Section moved.");
  });

  updateResetOrderVisibility();
}

// ── Collapse / Expand ─────────────────────────────────────────────────────────

function initSectionCollapse() {
  const labels = document.querySelectorAll(".form-section .section-label");
  labels.forEach((label) => {
    label.addEventListener("click", () => {
      const bodyId = label.getAttribute("aria-controls");
      const body = document.getElementById(bodyId);
      if (!body) return;
      const isExpanded = label.getAttribute("aria-expanded") === "true";
      label.setAttribute("aria-expanded", String(!isExpanded));
      body.classList.toggle("is-collapsed", isExpanded);
    });
  });
}

// ── Completion Dots ───────────────────────────────────────────────────────────

export function updateSectionCompletionDots() {
  const form = document.getElementById("promptForm");
  if (!form) return;
  Object.entries(SECTION_FIELDS).forEach(([sectionId, fields]) => {
    const section = document.getElementById(`form-section-${sectionId}`);
    if (!section) return;
    const hasContent = fields.some((fieldName) => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      return input && cleanValue(input.value).length > 0;
    });
    const dot = section.querySelector(".section-complete-dot");
    if (dot) dot.classList.toggle("is-complete", hasContent);
  });
}

// ── Quick-Nav ─────────────────────────────────────────────────────────────────

function initQuickNav() {
  const nav = document.getElementById("sectionQuickNav");
  if (!nav) return;
  nav.addEventListener("click", (e) => {
    const pill = e.target.closest(".quick-nav-pill[data-target-section]");
    if (!pill) return;
    const sectionId = pill.dataset.targetSection;
    const target = document.getElementById(`form-section-${sectionId}`);
    if (!target) return;
    const label = target.querySelector(".section-label");
    const bodyId = label && label.getAttribute("aria-controls");
    const body = bodyId && document.getElementById(bodyId);
    if (label && body && label.getAttribute("aria-expanded") === "false") {
      label.setAttribute("aria-expanded", "true");
      body.classList.remove("is-collapsed");
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ── Public init ───────────────────────────────────────────────────────────────

/**
 * Call once on DOMContentLoaded to wire up all section UX.
 */
export function initSectionUX() {
  restoreSectionOrder();
  renderSectionOrderPanel();
  initSectionCollapse();
  initQuickNav();
  updateSectionCompletionDots();

  const resetBtn = document.getElementById("resetSectionOrderBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetSectionOrder);
  }
}
