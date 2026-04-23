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

export function showToast(msg) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const id = "toast-" + Date.now();

  const toast = document.createElement("div");
  toast.id = id;
  toast.className = "toast";
  // Add role status for accessibility
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `<i class="fas fa-check-circle text-green-400"></i> ${escapeHtml(msg)}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse forwards";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

export function escapeHtml(value) {
  const p = document.createElement("p");
  p.textContent = value;
  return p.innerHTML;
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    modal.removeAttribute("aria-modal");
    modal.removeAttribute("role");
  }
}

export function renderPromptWithLineNumbers(prompt) {
  const container = document.getElementById("finalPromptText");
  if (!container) return;

  container.dataset.rawPrompt = prompt;
  const lines = prompt.split("\n");

  container.innerHTML = "";
  for (let i = 0; i < lines.length; i++) {
    const row = document.createElement("div");
    row.className = "prompt-row";

    const lineNum = document.createElement("div");
    lineNum.className = "line-num";
    lineNum.textContent = i + 1;

    const lineText = document.createElement("div");
    lineText.className = "line-text";
    lineText.textContent = lines[i]; // safe rendering since it uses textContent

    row.appendChild(lineNum);
    row.appendChild(lineText);
    container.appendChild(row);
  }
}

const ACTIVE_PAGE_STORAGE_KEY = "promptLab_activePage";
const DEFAULT_PAGE = "generator";
const VALID_PAGES = new Set(["generator", "library"]);

function normalizePage(page) {
  return VALID_PAGES.has(page) ? page : DEFAULT_PAGE;
}

function getStoredPage() {
  try {
    return normalizePage(localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_PAGE;
  }
}

export function restorePageState() {
  switchPage(getStoredPage());
}

export function switchPage(page) {
  const nextPage = normalizePage(page);
  const activePage = document.getElementById(`${nextPage}-page`);
  if (!activePage) return;

  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.classList.remove("active", "text-gray-900");
    link.classList.add("text-white/70");
    if (link.dataset.page === nextPage) {
      link.classList.add("active", "text-gray-900");
      link.classList.remove("text-white/70");
    }
  });

  const pages = document.querySelectorAll(".page-content");
  pages.forEach((p) => {
    p.classList.remove("active");
    p.style.display = "none";
  });

  activePage.classList.add("active");
  activePage.style.display = "block";
  activePage.style.animation = "fadeIn 0.3s ease-out forwards";

  try {
    localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, nextPage);
  } catch {
    // Ignore storage failures; navigation should still work.
  }
}

// Persist Form Values properly
export function saveFormState() {
  const form = document.getElementById("promptForm");
  if (!form) return;
  const formData = new FormData(form);
  const state = Object.fromEntries(formData);
  localStorage.setItem("promptLab_formState", JSON.stringify(state));
}

export function loadFormState() {
  const stateStr = localStorage.getItem("promptLab_formState");
  if (!stateStr) return;

  try {
    const form = document.getElementById("promptForm");
    if (!form) return;
    const parsedState = JSON.parse(stateStr);

    Object.entries(parsedState).forEach(([key, value]) => {
      const element = form.elements[key];
      if (element) {
        element.value = value;
      }
    });

    const formatSelect = document.getElementById("formatSelect");
    if (formatSelect) {
      formatSelect.dispatchEvent(new Event("change"));
    }
    const typeSelect = document.getElementById("typeSelect");
    if (typeSelect) {
      typeSelect.dispatchEvent(new Event("change"));
    }
  } catch (err) {
    console.error("Failed to parse form state", err);
  }
}
