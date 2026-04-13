/* ───────────────────────────────────────────
   PromptLab — Application Logic
   v0.1
   ─────────────────────────────────────────── */

// Global store for loaded prompt templates
let promptTemplates = [];

// ── Initialization ──────────────────────────
$(document).ready(function () {
    loadPrompts();

    $("#promptForm").on("submit", function (e) {
        e.preventDefault();
        const btn = $("#generateBtn");
        const originalContent = btn.html();
        btn.html('<div class="spinner"></div> Processing...').prop("disabled", true);

        setTimeout(() => {
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            const prompt = buildPromptString(data);

            $("#outputPlaceholder").addClass("hidden");
            $("#resultContent").removeClass("hidden");
            $("#copyBtn").removeClass("hidden");
            $("#downloadBtn").removeClass("hidden");

            renderPromptWithLineNumbers(prompt);
            $("#promptSummary").text(`${data.type} | ${data.role} | ${data.format}`);

            btn.html(originalContent).prop("disabled", false);
            showToast("Prompt engineered successfully.");
        }, 600);
    });

    // Toggle UI based on strategy selection
    $("#typeSelect").on("change", function () {
        if ($(this).val() === "Few-Shot") {
            $("#examplesContainer").addClass("border-2 border-accent/20 p-4 rounded-lg bg-accent-bg/10");
        } else {
            $("#examplesContainer").removeClass("border-2 border-accent/20 p-4 rounded-lg bg-accent-bg/10");
        }
    });

    $("#formatSelect").on("change", function () {
        const val = $(this).val();
        const container = $("#dynamicStructureContainer");
        const label = $("#structureLabel");
        const textarea = $("#outputStructure");

        if (["JSON", "Markdown", "Bullet Points", "Numbered List", "HTML/CSS"].includes(val)) {
            container.show();
            textarea.prop("required", true);
            label.text(val + " blueprint");
        } else {
            container.hide();
            textarea.prop("required", false);
        }
    });

    $("#formatSelect").trigger("change");

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
            console.warn("Could not load prompts/manifest.json — library will be empty.");
            renderLibrary();
        });
}

// ── Prompt Builder ──────────────────────────
function buildPromptString(data) {
    let prompt = `## IDENTITY\nAct as a ${data.role || "[Specify Identity]"}.\n\n`;

    if (data.audience) prompt += `## TARGET AUDIENCE\n${data.audience}\n\n`;
    if (data.context) prompt += `## FOUNDATIONAL CONTEXT\n${data.context}\n\n`;
    if (data.variables) prompt += `## INPUT VARIABLES\nThe following placeholders must be used: ${data.variables}\n\n`;

    prompt += `## CORE TASK\n${data.task || "[Define Task]"}\n\n`;

    if (data.reasoning) prompt += `## REASONING & LOGIC\n${data.reasoning}\n\n`;
    if (data.examples) prompt += `## REFERENCE EXAMPLES (FEW-SHOT DATA)\n${data.examples}\n\n`;
    if (data.constraints) prompt += `## HARD CONSTRAINTS\n${data.constraints}\n\n`;
    if (data.rules) prompt += `## OPERATIONAL RULES\n${data.rules}\n\n`;
    if (data.criteria) prompt += `## SUCCESS CRITERIA\n${data.criteria}\n\n`;
    if (data.errorPolicy) prompt += `## ERROR HANDLING POLICY\n${data.errorPolicy}\n\n`;

    prompt += `## OUTPUT SPECIFICATION\n- **Tone & Style:** ${data.tone || "Professional"}\n`;
    prompt += `- **Response Format:** ${data.format}\n`;
    prompt += `- **Response Length:** ${data.length || "Optimal length"}\n`;

    if (data.tools) prompt += `- **Tools Access:** ${data.tools}\n`;
    if (data.memory) prompt += `- **Memory Policy:** ${data.memory}\n`;

    if (data.outputStructure) prompt += `\n### STRUCTURE BLUEPRINT:\n\n${data.outputStructure}`;

    return prompt;
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
    $(`.nav-link:contains('${page.charAt(0).toUpperCase() + page.slice(1)}')`).addClass("active text-gray-900").removeClass("text-white/70");
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
    $("#dynamicStructureContainer").hide();
    $("#outputPlaceholder").removeClass("hidden");
    $("#resultContent").addClass("hidden");
    $("#copyBtn").addClass("hidden");
    $("#downloadBtn").addClass("hidden");
    $("#finalPromptText").html("").removeData("raw-prompt");
    $("#formatSelect").trigger("change");
    $("#typeSelect").trigger("change");
    closeModal("confirmModal");
    showToast("Workspace reset complete.");
}

// ── Download & Copy ─────────────────────────
function downloadPrompt() {
    const promptText = $("#finalPromptText").data("raw-prompt") || "";
    const summaryText = $("#promptSummary").text();
    const fileName = (summaryText || "prompt-export").toLowerCase().replace(/[^\w-]/g, "-") + ".md";
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
        navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard."));
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
    return promptTemplates.filter((t) =>
        t.title.toLowerCase().includes(query) ||
        t.task.toLowerCase().includes(query) ||
        t.role.toLowerCase().includes(query) ||
        t.type.toLowerCase().includes(query) ||
        t.format.toLowerCase().includes(query)
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
            const username = template.github_profile_url.replace(/\/+$/, '').split('/').pop();
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
    html += `<button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}
        class="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all
        ${currentPage === 1
            ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
            : 'bg-white/70 text-zinc-600 hover:bg-white hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-sm backdrop-blur-sm'}">
        <i class="fas fa-chevron-left text-[10px]"></i>
    </button>`;

    // Page numbers (show max 7 pages with ellipsis)
    const pages = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    pages.forEach((p) => {
        if (p === '...') {
            html += `<span class="w-9 h-9 flex items-center justify-center text-zinc-400 text-xs font-bold">…</span>`;
        } else {
            const isActive = p === currentPage;
            html += `<button onclick="goToPage(${p})"
                class="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all
                ${isActive
                    ? 'bg-violet-700 text-white shadow-lg shadow-violet-500/30 border border-violet-600'
                    : 'bg-white/70 text-zinc-600 hover:bg-white hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-sm backdrop-blur-sm'}">
                ${p}
            </button>`;
        }
    });

    // Next button
    html += `<button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}
        class="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all
        ${currentPage === totalPages
            ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
            : 'bg-white/70 text-zinc-600 hover:bg-white hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-sm backdrop-blur-sm'}">
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
    document.getElementById('library-page').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            ${t.outputStructure ? `
                <div>
                    <p class="text-[10px] uppercase font-bold text-muted mb-3 tracking-widest">Blueprint / Schema</p>
                    <div class="code-container">
                        <div class="p-5 font-mono text-[11px] leading-relaxed w-full">${t.outputStructure.replace(/\n/g, "<br>")}</div>
                    </div>
                </div>
            ` : ""}
        </div>
    `;

    $("#modalContent").html(html);

    $("#modalUseBtn").off("click").on("click", function () {
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

    const typeMatch = $("#typeSelect option").filter(function () {
        return $(this).val().toLowerCase().includes(t.type.toLowerCase());
    }).val();
    $("#typeSelect").val(typeMatch || t.type).trigger("change");

    $('[name="role"]').val(t.role || "");
    $('[name="audience"]').val(t.audience || "");
    $('[name="context"]').val(t.context || "");
    $('[name="task"]').val(t.task || "");
    $('[name="variables"]').val(t.variables || "");
    $('[name="reasoning"]').val(t.reasoning || "");
    $('[name="examples"]').val(t.examples || "");
    $('[name="constraints"]').val(t.constraints || "");
    $('[name="rules"]').val(t.rules || "");
    $('[name="criteria"]').val(t.criteria || "");
    $('[name="errorPolicy"]').val(t.errorPolicy || "");
    $('[name="tone"]').val(t.tone || "");
    $('[name="length"]').val(t.length || "");
    $('[name="tools"]').val(t.tools || "");
    $('[name="memory"]').val(t.memory || "");

    $('[name="format"]').val(t.format).trigger("change");
    $('[name="outputStructure"]').val(t.outputStructure || "");
    $("#promptForm").submit();
}
