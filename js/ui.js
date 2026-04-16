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

export function switchPage(page) {
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach(link => {
    link.classList.remove("active", "text-gray-900");
    link.classList.add("text-white/70");
    if (link.dataset.page === page) {
      link.classList.add("active", "text-gray-900");
      link.classList.remove("text-white/70");
    }
  });

  const pages = document.querySelectorAll(".page-content");
  pages.forEach(p => {
    p.classList.remove("active");
    p.style.display = "none";
  });

  const activePage = document.getElementById(`${page}-page`);
  if (activePage) {
    activePage.classList.add("active");
    activePage.style.display = "block";
    activePage.style.animation = "fadeIn 0.3s ease-out forwards";
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
    const state = JSON.stringify(stateStr);
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
