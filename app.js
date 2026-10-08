/* =====================================================
   FAREWELL 2026 — Dance Practice App
   app.js — Full client-side application
   ===================================================== */

"use strict";

// =====================================================
// DATA MODEL
// =====================================================

const DEFAULT_DANCER_COLORS = [
  "#2563eb", // Blue
  "#16a34a", // Green
  "#d97706", // Amber
  "#dc2626", // Red
  "#7c3aed", // Violet
  "#db2777", // Pink
  "#0891b2", // Cyan
  "#ea580c", // Orange
];

let appState = {
  dancers: [],
  sections: [],
};

let pendingFormationSectionId = null;
let pendingRenameSectionId = null;
let formationDragState = {
  dancerId: null,
  fromSidebar: false,
  offsetX: 0,
  offsetY: 0,
};

// =====================================================
// PERSISTENCE
// =====================================================

const STORAGE_KEY = "farewell2026_choreography";

function saveToLocalStorage() {
  try {
    const toSave = {
      dancers: appState.dancers,
      sections: appState.sections.map((s) => {
        // Don't save blob URLs — just save flags
        const copy = { ...s };
        if (copy.videoBlobUrl) {
          copy.videoBlobUrl = null;
          copy.videoLocalName = copy.videoLocalName || null;
        }
        return copy;
      }),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.sections) {
      appState = parsed;
      return true;
    }
  } catch (e) {
    console.warn("Could not load from localStorage:", e);
  }
  return false;
}

// =====================================================
// DEFAULT INITIAL DATA
// =====================================================

function buildDefaultState() {
  const defaultDancers = [
    { id: uid(), name: "Aryan", color: "#2563eb" },
    { id: uid(), name: "Rahul", color: "#16a34a" },
    { id: uid(), name: "Ananya", color: "#d97706" },
    { id: uid(), name: "Rohan", color: "#dc2626" },
    { id: uid(), name: "Priya", color: "#7c3aed" },
  ];
  appState.dancers = defaultDancers;

  const d = defaultDancers;
  appState.sections = [
    {
      id: uid(),
      type: "dance",
      title: "Opening — Intro Walk",
      songName: "Song 01",
      videoBlobUrl: null,
      videoLocalName: null,
      counts: [
        { num: 1, label: "step" },
        { num: 2, label: "step" },
        { num: 3, label: "arms" },
        { num: 4, label: "arms" },
        { num: 5, label: "turn" },
        { num: 6, label: "turn" },
        { num: 7, label: "hold" },
        { num: 8, label: "hold" },
      ],
      countInstructions: [
        { range: "1–2", text: "Walk forward two steps" },
        { range: "3–4", text: "Raise arms overhead" },
        { range: "5–6", text: "Half turn to the right" },
        { range: "7–8", text: "Freeze, hold position" },
      ],
      formation: {
        dancers: [
          { dancerId: d[0].id, x: 30, y: 35 },
          { dancerId: d[1].id, x: 70, y: 35 },
          { dancerId: d[2].id, x: 20, y: 65 },
          { dancerId: d[3].id, x: 50, y: 70 },
          { dancerId: d[4].id, x: 80, y: 65 },
        ],
      },
      instructions: [
        { dancerId: d[0].id, text: "Lead the walk, step on count 1" },
        { dancerId: d[1].id, text: "Mirror Aryan on the right side" },
        { dancerId: d[2].id, text: "Step forward, join on count 3" },
        { dancerId: d[3].id, text: "Center anchor, stay grounded" },
        { dancerId: d[4].id, text: "Step forward, join on count 3" },
      ],
    },
    {
      id: uid(),
      type: "dance",
      title: "Chorus — Power Break",
      songName: "Song 01",
      videoBlobUrl: null,
      videoLocalName: null,
      counts: [
        { num: 1, label: "" },
        { num: 2, label: "" },
        { num: 3, label: "jump" },
        { num: 4, label: "" },
        { num: 5, label: "" },
        { num: 6, label: "slide" },
        { num: 7, label: "pose" },
        { num: 8, label: "" },
      ],
      countInstructions: [
        { range: "1–2", text: "Hold pose from intro" },
        { range: "3", text: "Big jump, land on beat" },
        { range: "4–5", text: "Arms wide open, face front" },
        { range: "6", text: "Slide left two feet" },
        { range: "7–8", text: "Final power pose, hold" },
      ],
      formation: {
        dancers: [
          { dancerId: d[0].id, x: 20, y: 50 },
          { dancerId: d[1].id, x: 40, y: 30 },
          { dancerId: d[2].id, x: 60, y: 30 },
          { dancerId: d[3].id, x: 80, y: 50 },
          { dancerId: d[4].id, x: 50, y: 70 },
        ],
      },
      instructions: [
        { dancerId: d[0].id, text: "Slide far left, anchor the line" },
        { dancerId: d[1].id, text: "Jump high on count 3" },
        { dancerId: d[2].id, text: "Jump high on count 3" },
        { dancerId: d[3].id, text: "Slide far right, anchor the line" },
        { dancerId: d[4].id, text: "Stay center, hold anchor pose" },
      ],
    },
    {
      id: uid(),
      type: "note",
      title: "Rehearsal Notes",
      noteText:
        "⚡ Practice the jump together — everyone lands on the same beat.\n📐 Keep the diagonal line tight in the chorus formation.\n🎵 Count internally, don't rely on audible counting during performance.",
    },
  ];
}

// =====================================================
// UTILITIES
// =====================================================

function uid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function getDancer(id) {
  return appState.dancers.find((d) => d.id === id);
}

function getSectionIndex(id) {
  return appState.sections.findIndex((s) => s.id === id);
}

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// =====================================================
// RENDER ENGINE
// =====================================================

function renderAll() {
  renderSectionIndex();
  renderSections();
  saveToLocalStorage();
}

function renderSectionIndex() {
  const container = document.getElementById("index-links");
  container.innerHTML = "";
  appState.sections.forEach((section, i) => {
    const btn = document.createElement("button");
    btn.className = "index-link";
    btn.textContent =
      section.songName
        ? `${String(i + 1).padStart(2, "0")}  ${section.title}`
        : `${String(i + 1).padStart(2, "0")}  ${section.title}`;
    btn.setAttribute("aria-label", `Jump to section: ${section.title}`);
    btn.addEventListener("click", () => {
      const el = document.getElementById(`section-${section.id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    container.appendChild(btn);
  });
}

function renderSections() {
  const container = document.getElementById("sections-container");
  container.innerHTML = "";
  appState.sections.forEach((section, index) => {
    const el = renderSection(section, index);
    container.appendChild(el);
  });
}

function renderSection(section, index) {
  const wrapper = document.createElement("section");
  wrapper.className =
    "practice-unit" + (section.type === "note" ? " note-unit" : "");
  wrapper.id = `section-${section.id}`;
  wrapper.setAttribute("aria-label", `Section: ${section.title}`);

  // Header
  const header = document.createElement("div");
  header.className = "unit-header";
  header.innerHTML = `
    <div class="unit-meta">
      <div class="unit-number">${section.type === "dance" ? "DANCE MOVE" : section.type === "formation" ? "FORMATION" : "NOTE"} &nbsp;·&nbsp; ${String(index + 1).padStart(2, "0")}</div>
      <div class="unit-title" contenteditable="true" spellcheck="false" aria-label="Section title">${escHtml(section.title)}</div>
      ${section.songName != null ? `<div class="unit-song" contenteditable="true" spellcheck="false" aria-label="Song name">${escHtml(section.songName)}</div>` : ""}
    </div>
    <div class="unit-controls">
      <button class="unit-menu-btn" aria-label="Section options" aria-haspopup="true" title="Section options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
      <div class="unit-dropdown" role="menu">
        <button data-action="move-up" role="menuitem"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> Move Up</button>
        <button data-action="move-down" role="menuitem"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> Move Down</button>
        <button data-action="rename" role="menuitem"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Rename</button>
        <button data-action="duplicate" role="menuitem"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Duplicate</button>
        <hr/>
        <button data-action="delete" class="danger" role="menuitem"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg> Delete</button>
      </div>
    </div>
  `;

  // Attach header events
  const titleEl = header.querySelector(".unit-title");
  titleEl.addEventListener("blur", () => {
    section.title = titleEl.innerText.trim() || "Untitled";
    renderSectionIndex();
    saveToLocalStorage();
  });
  titleEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); titleEl.blur(); }
  });

  const songEl = header.querySelector(".unit-song");
  if (songEl) {
    songEl.addEventListener("blur", () => {
      section.songName = songEl.innerText.trim();
      saveToLocalStorage();
    });
    songEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); songEl.blur(); }
    });
  }

  // Menu button
  const menuBtn = header.querySelector(".unit-menu-btn");
  const dropdown = header.querySelector(".unit-dropdown");
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains("open");
    closeAllDropdowns();
    if (!isOpen) dropdown.classList.add("open");
  });
  dropdown.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.remove("open");
      handleSectionAction(btn.dataset.action, section.id);
    });
  });

  wrapper.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.className = "unit-body";

  if (section.type === "dance") {
    renderDanceBody(body, section);
  } else if (section.type === "formation") {
    renderFormationOnlyBody(body, section);
  } else if (section.type === "note") {
    renderNoteBody(body, section);
  }

  wrapper.appendChild(body);
  return wrapper;
}

// =====================================================
// DANCE SECTION BODY
// =====================================================

function renderDanceBody(body, section) {
  // Two-column: video + formation
  const twoCol = document.createElement("div");
  twoCol.className = "unit-two-col";

  // Video block
  const videoDiv = document.createElement("div");
  videoDiv.className = "video-block";
  videoDiv.innerHTML = `<div class="unit-section-label">VIDEO</div>`;
  videoDiv.appendChild(buildVideoBlock(section));
  twoCol.appendChild(videoDiv);

  // Formation block
  const formDiv = document.createElement("div");
  formDiv.className = "formation-block";
  formDiv.innerHTML = `<div class="unit-section-label">FORMATION</div>`;
  formDiv.appendChild(buildFormationDisplay(section));
  twoCol.appendChild(formDiv);

  body.appendChild(twoCol);

  // Counts block
  const countsDiv = document.createElement("div");
  countsDiv.className = "counts-block";
  countsDiv.innerHTML = `<div class="unit-section-label">COUNTS</div>`;
  countsDiv.appendChild(buildCountsBlock(section));
  body.appendChild(countsDiv);

  // Instructions block
  const instrDiv = document.createElement("div");
  instrDiv.className = "instructions-block";
  instrDiv.innerHTML = `<div class="unit-section-label">INSTRUCTIONS</div>`;
  instrDiv.appendChild(buildInstructionsBlock(section));
  body.appendChild(instrDiv);
}

function renderFormationOnlyBody(body, section) {
  const formDiv = document.createElement("div");
  formDiv.className = "formation-block";
  formDiv.innerHTML = `<div class="unit-section-label">FORMATION</div>`;
  formDiv.appendChild(buildFormationDisplay(section));
  body.appendChild(formDiv);
}

function renderNoteBody(body, section) {
  const noteDiv = document.createElement("div");
  const textarea = document.createElement("textarea");
  textarea.className = "note-textarea";
  textarea.value = section.noteText || "";
  textarea.placeholder = "Write a rehearsal note, reminder, or tip…";
  textarea.setAttribute("aria-label", "Note content");
  textarea.rows = 4;
  textarea.addEventListener("input", () => {
    section.noteText = textarea.value;
    saveToLocalStorage();
  });
  noteDiv.appendChild(textarea);
  body.appendChild(noteDiv);
}

// =====================================================
// VIDEO BLOCK
// =====================================================

function buildVideoBlock(section) {
  const container = document.createElement("div");

  if (section.videoBlobUrl) {
    // Video player
    const playerWrap = document.createElement("div");
    playerWrap.className = "video-container";
    const video = document.createElement("video");
    video.src = section.videoBlobUrl;
    video.controls = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", `Dance video for ${section.title}`);
    playerWrap.appendChild(video);
    container.appendChild(playerWrap);

    // Actions
    const actions = document.createElement("div");
    actions.className = "video-actions";
    const nameSpan = document.createElement("span");
    nameSpan.className = "video-filename";
    nameSpan.textContent = section.videoLocalName || "video.mp4";
    actions.appendChild(nameSpan);

    const replaceLabel = document.createElement("label");
    replaceLabel.className = "btn btn-ghost btn-sm";
    replaceLabel.textContent = "Replace";
    const replaceInput = document.createElement("input");
    replaceInput.type = "file";
    replaceInput.accept = "video/*";
    replaceInput.style.display = "none";
    replaceInput.setAttribute("aria-label", "Replace video file");
    replaceInput.addEventListener("change", (e) => {
      handleVideoFile(e.target.files[0], section);
    });
    replaceLabel.appendChild(replaceInput);
    actions.appendChild(replaceLabel);

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-danger btn-sm";
    removeBtn.textContent = "Remove";
    removeBtn.setAttribute("aria-label", "Remove video");
    removeBtn.addEventListener("click", () => {
      URL.revokeObjectURL(section.videoBlobUrl);
      section.videoBlobUrl = null;
      section.videoLocalName = null;
      saveToLocalStorage();
      renderSections();
    });
    actions.appendChild(removeBtn);
    container.appendChild(actions);
  } else {
    // Placeholder / upload
    const placeholder = document.createElement("label");
    placeholder.className = "video-placeholder";
    placeholder.setAttribute("role", "button");
    placeholder.setAttribute("tabindex", "0");
    placeholder.setAttribute("aria-label", "Upload MP4 video");
    placeholder.innerHTML = `
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      <span class="video-placeholder-text">Upload MP4 Video</span>
      <span style="font-size:11px;color:inherit;opacity:0.7">Click or drag & drop</span>
    `;
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "video/*";
    fileInput.style.display = "none";
    fileInput.setAttribute("aria-label", "Video file input");
    fileInput.addEventListener("change", (e) => {
      handleVideoFile(e.target.files[0], section);
    });
    placeholder.appendChild(fileInput);
    placeholder.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") fileInput.click();
    });

    // Drag-and-drop
    placeholder.addEventListener("dragover", (e) => {
      e.preventDefault();
      placeholder.style.borderColor = "var(--accent)";
    });
    placeholder.addEventListener("dragleave", () => {
      placeholder.style.borderColor = "";
    });
    placeholder.addEventListener("drop", (e) => {
      e.preventDefault();
      placeholder.style.borderColor = "";
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        handleVideoFile(file, section);
      }
    });
    container.appendChild(placeholder);
  }

  return container;
}

function handleVideoFile(file, section) {
  if (!file) return;
  if (section.videoBlobUrl) URL.revokeObjectURL(section.videoBlobUrl);
  section.videoBlobUrl = URL.createObjectURL(file);
  section.videoLocalName = file.name;
  saveToLocalStorage();
  renderSections();
  // Scroll to the section
  setTimeout(() => {
    const el = document.getElementById(`section-${section.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

// =====================================================
// FORMATION DISPLAY
// =====================================================

function buildFormationDisplay(section) {
  const container = document.createElement("div");

  if (section.formation && section.formation.dancers && section.formation.dancers.length > 0) {
    const display = document.createElement("div");
    display.className = "formation-display";

    const topLabel = document.createElement("div");
    topLabel.className = "formation-top-label";
    topLabel.textContent = "BACK";
    display.appendChild(topLabel);

    const stageArea = document.createElement("div");
    stageArea.className = "formation-stage-area";

    section.formation.dancers.forEach((fp) => {
      const dancer = getDancer(fp.dancerId);
      if (!dancer) return;
      const token = document.createElement("div");
      token.className = "dancer-token";
      token.style.left = fp.x + "%";
      token.style.top = fp.y + "%";

      const dot = document.createElement("div");
      dot.className = "dancer-dot";
      dot.style.background = dancer.color;
      dot.textContent = initials(dancer.name);
      dot.setAttribute("aria-label", dancer.name);
      token.appendChild(dot);

      const nameLabel = document.createElement("div");
      nameLabel.className = "dancer-name-label";
      nameLabel.textContent = dancer.name;
      token.appendChild(nameLabel);

      stageArea.appendChild(token);
    });

    display.appendChild(stageArea);

    const bottomLabel = document.createElement("div");
    bottomLabel.className = "formation-bottom-label";
    bottomLabel.textContent = "AUDIENCE";
    display.appendChild(bottomLabel);

    const editBtn = document.createElement("button");
    editBtn.className = "formation-edit-btn";
    editBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Formation`;
    editBtn.setAttribute("aria-label", "Edit formation");
    editBtn.addEventListener("click", () => openFormationEditor(section.id));
    display.appendChild(editBtn);

    container.appendChild(display);
  } else {
    // Empty formation prompt
    const empty = document.createElement("button");
    empty.className = "formation-empty";
    empty.setAttribute("aria-label", "Create formation");
    empty.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="9" r="1.5"/><circle cx="16" cy="9" r="1.5"/><circle cx="12" cy="15" r="1.5"/></svg>
      Create Formation
    `;
    empty.addEventListener("click", () => openFormationEditor(section.id));
    container.appendChild(empty);
  }

  return container;
}

// =====================================================
// COUNTS BLOCK
// =====================================================

function buildCountsBlock(section) {
  const container = document.createElement("div");

  // 8-count row
  const countsRow = document.createElement("div");
  countsRow.className = "counts-row";
  (section.counts || []).forEach((c, ci) => {
    const cell = document.createElement("div");
    cell.className = "count-cell";

    const numEl = document.createElement("div");
    numEl.className = "count-num";
    numEl.textContent = c.num;
    cell.appendChild(numEl);

    const labelEl = document.createElement("div");
    labelEl.className = "count-label";
    labelEl.contentEditable = "true";
    labelEl.textContent = c.label || "";
    labelEl.setAttribute("aria-label", `Count ${c.num} label`);
    labelEl.addEventListener("blur", () => {
      section.counts[ci].label = labelEl.innerText.trim();
      saveToLocalStorage();
    });
    labelEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); labelEl.blur(); }
    });
    cell.appendChild(labelEl);
    countsRow.appendChild(cell);
  });
  container.appendChild(countsRow);

  // Count instructions
  const instrList = document.createElement("ul");
  instrList.className = "counts-instructions-list";
  instrList.setAttribute("aria-label", "Count instructions");

  (section.countInstructions || []).forEach((ci, idx) => {
    instrList.appendChild(buildCountInstructionItem(ci, idx, section));
  });
  container.appendChild(instrList);

  // Add instruction
  const addBtn = document.createElement("button");
  addBtn.className = "add-count-btn";
  addBtn.setAttribute("aria-label", "Add count instruction");
  addBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add count note`;
  addBtn.addEventListener("click", () => {
    section.countInstructions = section.countInstructions || [];
    section.countInstructions.push({ range: "—", text: "describe the move" });
    saveToLocalStorage();
    renderSections();
  });
  container.appendChild(addBtn);

  return container;
}

function buildCountInstructionItem(ci, idx, section) {
  const li = document.createElement("li");
  li.className = "count-instruction-item";

  const badge = document.createElement("span");
  badge.className = "count-range-badge";
  badge.contentEditable = "true";
  badge.textContent = ci.range;
  badge.setAttribute("aria-label", "Count range");
  badge.addEventListener("blur", () => {
    section.countInstructions[idx].range = badge.innerText.trim();
    saveToLocalStorage();
  });
  badge.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); badge.blur(); }
  });

  const arrow = document.createElement("span");
  arrow.className = "instruction-arrow";
  arrow.textContent = "→";
  arrow.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "count-instruction-text";
  text.contentEditable = "true";
  text.textContent = ci.text;
  text.setAttribute("aria-label", "Instruction");
  text.addEventListener("blur", () => {
    section.countInstructions[idx].text = text.innerText.trim();
    saveToLocalStorage();
  });
  text.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); text.blur(); }
  });

  const delBtn = document.createElement("button");
  delBtn.setAttribute("aria-label", "Remove count instruction");
  delBtn.style.cssText = "background:none;border:none;cursor:pointer;color:var(--text-tertiary);padding:2px 4px;border-radius:3px;display:flex;align-items:center;margin-left:auto;";
  delBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  delBtn.addEventListener("click", () => {
    section.countInstructions.splice(idx, 1);
    saveToLocalStorage();
    renderSections();
  });

  li.appendChild(badge);
  li.appendChild(arrow);
  li.appendChild(text);
  li.appendChild(delBtn);
  return li;
}

// =====================================================
// INSTRUCTIONS BLOCK
// =====================================================

function buildInstructionsBlock(section) {
  const container = document.createElement("div");
  const list = document.createElement("div");
  list.className = "instructions-list";

  (section.instructions || []).forEach((instr, idx) => {
    list.appendChild(buildInstructionItem(instr, idx, section));
  });

  container.appendChild(list);

  // Add instruction button
  const addBtn = document.createElement("button");
  addBtn.className = "add-instruction-btn";
  addBtn.setAttribute("aria-label", "Add instruction");
  addBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add instruction`;
  addBtn.addEventListener("click", () => {
    const firstDancer = appState.dancers[0];
    section.instructions = section.instructions || [];
    section.instructions.push({
      dancerId: firstDancer ? firstDancer.id : null,
      text: "describe the move",
    });
    saveToLocalStorage();
    renderSections();
  });
  container.appendChild(addBtn);

  return container;
}

function buildInstructionItem(instr, idx, section) {
  const item = document.createElement("div");
  item.className = "instruction-item";

  // Dancer badge (select)
  const badgeDiv = document.createElement("div");
  badgeDiv.className = "instruction-dancer-badge";

  const dot = document.createElement("div");
  dot.className = "instruction-dancer-dot";
  const dancer = getDancer(instr.dancerId);
  dot.style.background = dancer ? dancer.color : "#ccc";
  dot.setAttribute("aria-hidden", "true");
  badgeDiv.appendChild(dot);

  // Dancer name select
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Dancer for this instruction");
  select.style.cssText = "border:none;background:transparent;font-family:var(--font);font-size:12px;font-weight:600;color:var(--text-primary);cursor:pointer;padding:0;outline:none;max-width:90px;";
  appState.dancers.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    if (d.id === instr.dancerId) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener("change", () => {
    section.instructions[idx].dancerId = select.value;
    const nd = getDancer(select.value);
    dot.style.background = nd ? nd.color : "#ccc";
    saveToLocalStorage();
  });
  badgeDiv.appendChild(select);
  item.appendChild(badgeDiv);

  const arrow = document.createElement("span");
  arrow.className = "instruction-arrow";
  arrow.textContent = "→";
  arrow.setAttribute("aria-hidden", "true");
  item.appendChild(arrow);

  const textEl = document.createElement("span");
  textEl.className = "instruction-text";
  textEl.contentEditable = "true";
  textEl.textContent = instr.text;
  textEl.setAttribute("aria-label", "Instruction text");
  textEl.addEventListener("blur", () => {
    section.instructions[idx].text = textEl.innerText.trim();
    saveToLocalStorage();
  });
  textEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); textEl.blur(); }
  });
  item.appendChild(textEl);

  const delBtn = document.createElement("button");
  delBtn.setAttribute("aria-label", "Remove instruction");
  delBtn.style.cssText = "background:none;border:none;cursor:pointer;color:var(--text-tertiary);padding:4px;border-radius:3px;display:flex;align-items:center;margin-left:auto;flex-shrink:0;";
  delBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  delBtn.addEventListener("click", () => {
    section.instructions.splice(idx, 1);
    saveToLocalStorage();
    renderSections();
  });
  item.appendChild(delBtn);

  return item;
}

// =====================================================
// SECTION ACTIONS
// =====================================================

function handleSectionAction(action, sectionId) {
  const idx = getSectionIndex(sectionId);
  if (idx === -1) return;

  switch (action) {
    case "move-up":
      if (idx > 0) {
        [appState.sections[idx - 1], appState.sections[idx]] = [appState.sections[idx], appState.sections[idx - 1]];
        renderAll();
        setTimeout(() => {
          const el = document.getElementById(`section-${sectionId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 50);
      }
      break;
    case "move-down":
      if (idx < appState.sections.length - 1) {
        [appState.sections[idx], appState.sections[idx + 1]] = [appState.sections[idx + 1], appState.sections[idx]];
        renderAll();
        setTimeout(() => {
          const el = document.getElementById(`section-${sectionId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 50);
      }
      break;
    case "duplicate": {
      const original = appState.sections[idx];
      const copy = JSON.parse(JSON.stringify(original));
      copy.id = uid();
      copy.title = copy.title + " (Copy)";
      copy.videoBlobUrl = null; // can't duplicate blob URLs
      appState.sections.splice(idx + 1, 0, copy);
      renderAll();
      break;
    }
    case "rename":
      openRenameModal(sectionId);
      break;
    case "delete":
      if (confirm(`Delete section "${appState.sections[idx].title}"?`)) {
        if (appState.sections[idx].videoBlobUrl) {
          URL.revokeObjectURL(appState.sections[idx].videoBlobUrl);
        }
        appState.sections.splice(idx, 1);
        renderAll();
      }
      break;
  }
}

// =====================================================
// MODAL HELPERS
// =====================================================

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.removeAttribute("hidden");
  modal.setAttribute("aria-hidden", "false");
  const focusEl = modal.querySelector("input, button, textarea, select");
  if (focusEl) setTimeout(() => focusEl.focus(), 50);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.setAttribute("hidden", "");
  modal.setAttribute("aria-hidden", "true");
}

function closeAllDropdowns() {
  document.querySelectorAll(".unit-dropdown.open").forEach((d) => d.classList.remove("open"));
}

// =====================================================
// TEMPLATE PICKER
// =====================================================

function openTemplatePicker() {
  openModal("template-modal");
}

document.getElementById("template-modal").addEventListener("click", (e) => {
  const card = e.target.closest(".template-card");
  if (!card) return;
  const template = card.dataset.template;
  closeModal("template-modal");
  addSection(template);
});

function addSection(type) {
  let section;
  if (type === "dance") {
    section = {
      id: uid(),
      type: "dance",
      title: "New Dance Move",
      songName: "Song",
      videoBlobUrl: null,
      videoLocalName: null,
      counts: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ num: n, label: "" })),
      countInstructions: [{ range: "1–2", text: "describe the move" }],
      formation: { dancers: [] },
      instructions: [],
    };
  } else if (type === "formation") {
    section = {
      id: uid(),
      type: "formation",
      title: "New Formation",
      formation: { dancers: [] },
    };
  } else if (type === "note") {
    section = {
      id: uid(),
      type: "note",
      title: "Note",
      noteText: "",
    };
  }
  if (!section) return;
  appState.sections.push(section);
  renderAll();
  setTimeout(() => {
    const el = document.getElementById(`section-${section.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

// =====================================================
// RENAME MODAL
// =====================================================

function openRenameModal(sectionId) {
  const idx = getSectionIndex(sectionId);
  if (idx === -1) return;
  pendingRenameSectionId = sectionId;
  const input = document.getElementById("rename-input");
  input.value = appState.sections[idx].title;
  openModal("rename-modal");
  setTimeout(() => { input.select(); }, 60);
}

document.getElementById("rename-confirm-btn").addEventListener("click", () => {
  if (!pendingRenameSectionId) return;
  const idx = getSectionIndex(pendingRenameSectionId);
  if (idx !== -1) {
    const val = document.getElementById("rename-input").value.trim();
    if (val) {
      appState.sections[idx].title = val;
      renderAll();
    }
  }
  pendingRenameSectionId = null;
  closeModal("rename-modal");
});

document.getElementById("rename-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("rename-confirm-btn").click();
  if (e.key === "Escape") closeModal("rename-modal");
});

// =====================================================
// DANCERS MODAL
// =====================================================

function openDancersModal() {
  renderDancersList();
  openModal("dancers-modal");
}

function renderDancersList() {
  const list = document.getElementById("dancers-list");
  list.innerHTML = "";
  appState.dancers.forEach((dancer, idx) => {
    const row = document.createElement("div");
    row.className = "dancer-row";

    // Color picker
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = dancer.color;
    colorInput.setAttribute("aria-label", `Color for ${dancer.name}`);
    colorInput.style.cssText = "width:32px;height:32px;border-radius:50%;border:2px solid var(--border);cursor:pointer;padding:0;flex-shrink:0;";
    colorInput.addEventListener("input", () => {
      appState.dancers[idx].color = colorInput.value;
      saveToLocalStorage();
    });
    colorInput.addEventListener("change", () => {
      renderAll();
      renderDancersList();
    });
    row.appendChild(colorInput);

    // Name input
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "dancer-name-input";
    nameInput.value = dancer.name;
    nameInput.setAttribute("aria-label", "Dancer name");
    nameInput.addEventListener("change", () => {
      appState.dancers[idx].name = nameInput.value.trim() || dancer.name;
      saveToLocalStorage();
      renderAll();
    });
    row.appendChild(nameInput);

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.className = "dancer-delete-btn";
    delBtn.setAttribute("aria-label", `Delete ${dancer.name}`);
    delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
    delBtn.addEventListener("click", () => {
      if (confirm(`Remove dancer "${dancer.name}"?`)) {
        appState.dancers.splice(idx, 1);
        saveToLocalStorage();
        renderDancersList();
        renderAll();
      }
    });
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

document.getElementById("add-dancer-btn").addEventListener("click", () => {
  const colorIdx = appState.dancers.length % DEFAULT_DANCER_COLORS.length;
  appState.dancers.push({
    id: uid(),
    name: "Dancer " + (appState.dancers.length + 1),
    color: DEFAULT_DANCER_COLORS[colorIdx],
  });
  saveToLocalStorage();
  renderDancersList();
});

// =====================================================
// FORMATION EDITOR
// =====================================================

let editorFormation = { dancers: [] }; // working copy for editor

function openFormationEditor(sectionId) {
  pendingFormationSectionId = sectionId;
  const idx = getSectionIndex(sectionId);
  if (idx === -1) return;
  const section = appState.sections[idx];

  // Deep copy formation
  editorFormation = section.formation
    ? JSON.parse(JSON.stringify(section.formation))
    : { dancers: [] };

  renderFormationEditor();
  openModal("formation-modal");
}

function renderFormationEditor() {
  const stage = document.getElementById("formation-stage");
  const sidebarList = document.getElementById("formation-dancer-list");
  stage.innerHTML = "";
  sidebarList.innerHTML = "";

  const onStageIds = new Set(editorFormation.dancers.map((d) => d.dancerId));

  // Render tokens already on stage
  editorFormation.dancers.forEach((fp) => {
    const dancer = getDancer(fp.dancerId);
    if (!dancer) return;
    const token = createStageDancerToken(dancer, fp);
    stage.appendChild(token);
    makeDraggableOnStage(token, fp);
  });

  // Render sidebar list
  appState.dancers.forEach((dancer) => {
    const pill = document.createElement("div");
    pill.className = "formation-dancer-pill" + (onStageIds.has(dancer.id) ? " on-stage" : "");
    pill.draggable = !onStageIds.has(dancer.id);
    pill.dataset.dancerId = dancer.id;
    pill.setAttribute("aria-label", `Dancer ${dancer.name}`);

    const dot = document.createElement("div");
    dot.className = "dancer-dot";
    dot.style.background = dancer.color;
    dot.textContent = initials(dancer.name);
    pill.appendChild(dot);

    const name = document.createElement("span");
    name.textContent = dancer.name;
    pill.appendChild(name);

    if (!onStageIds.has(dancer.id)) {
      pill.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", dancer.id);
        e.dataTransfer.effectAllowed = "copy";
        formationDragState.dancerId = dancer.id;
        formationDragState.fromSidebar = true;
      });
    }

    sidebarList.appendChild(pill);
  });

  // Stage drop zone
  stage.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    stage.classList.add("drag-over");
  });
  stage.addEventListener("dragleave", () => stage.classList.remove("drag-over"));
  stage.addEventListener("drop", (e) => {
    e.preventDefault();
    stage.classList.remove("drag-over");
    const dancerId = e.dataTransfer.getData("text/plain");
    if (!dancerId) return;
    const rect = stage.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const existing = editorFormation.dancers.find((d) => d.dancerId === dancerId);
    if (existing) {
      existing.x = clamp(x, 5, 95);
      existing.y = clamp(y, 5, 95);
    } else {
      editorFormation.dancers.push({
        dancerId,
        x: clamp(x, 5, 95),
        y: clamp(y, 5, 95),
      });
    }
    renderFormationEditor();
  });
}

function createStageDancerToken(dancer, fp) {
  const token = document.createElement("div");
  token.className = "stage-dancer-token";
  token.style.left = fp.x + "%";
  token.style.top = fp.y + "%";
  token.dataset.dancerId = dancer.id;

  const dot = document.createElement("div");
  dot.className = "dancer-dot";
  dot.style.background = dancer.color;
  dot.textContent = initials(dancer.name);
  token.appendChild(dot);

  const nameLabel = document.createElement("div");
  nameLabel.className = "dancer-name-label";
  nameLabel.textContent = dancer.name;
  token.appendChild(nameLabel);

  // Double-click to remove from stage
  token.addEventListener("dblclick", () => {
    editorFormation.dancers = editorFormation.dancers.filter((d) => d.dancerId !== dancer.id);
    renderFormationEditor();
  });

  return token;
}

function makeDraggableOnStage(token, fp) {
  const stage = document.getElementById("formation-stage");
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  let stageRect;

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newLeft = clamp(startLeft + (dx / stageRect.width) * 100, 5, 95);
    const newTop = clamp(startTop + (dy / stageRect.height) * 100, 5, 95);
    token.style.left = newLeft + "%";
    token.style.top = newTop + "%";
    fp.x = newLeft;
    fp.y = newTop;
  }

  function onMouseUp() {
    if (isDragging) {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  }

  token.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    stageRect = stage.getBoundingClientRect();
    startLeft = fp.x;
    startTop = fp.y;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  // Touch support
  token.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    isDragging = true;
    startX = touch.clientX;
    startY = touch.clientY;
    stageRect = stage.getBoundingClientRect();
    startLeft = fp.x;
    startTop = fp.y;
  }, { passive: true });

  token.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const newLeft = clamp(startLeft + (dx / stageRect.width) * 100, 5, 95);
    const newTop = clamp(startTop + (dy / stageRect.height) * 100, 5, 95);
    token.style.left = newLeft + "%";
    token.style.top = newTop + "%";
    fp.x = newLeft;
    fp.y = newTop;
  }, { passive: false });

  token.addEventListener("touchend", () => { isDragging = false; });
}

document.getElementById("formation-save-btn").addEventListener("click", () => {
  if (!pendingFormationSectionId) return;
  const idx = getSectionIndex(pendingFormationSectionId);
  if (idx !== -1) {
    appState.sections[idx].formation = JSON.parse(JSON.stringify(editorFormation));
    renderAll();
  }
  pendingFormationSectionId = null;
  closeModal("formation-modal");
});

// =====================================================
// SAVE / LOAD PROJECT
// =====================================================

document.getElementById("save-btn").addEventListener("click", () => {
  const data = {
    version: 1,
    dancers: appState.dancers,
    sections: appState.sections.map((s) => {
      const copy = { ...s, videoBlobUrl: null };
      return copy;
    }),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "farewell2026-choreography.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("load-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (parsed.sections && parsed.dancers) {
        appState.dancers = parsed.dancers;
        appState.sections = parsed.sections.map((s) => ({ ...s, videoBlobUrl: null }));
        renderAll();
      }
    } catch (err) {
      alert("Could not load project file. Make sure it's a valid choreography JSON.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

// =====================================================
// FOCUS MODE
// =====================================================

document.getElementById("focus-mode-btn").addEventListener("click", () => {
  const isActive = document.body.classList.toggle("focus-mode");
  const btn = document.getElementById("focus-mode-btn");
  btn.classList.toggle("active", isActive);
  const span = btn.querySelector("span");
  span.textContent = isActive ? "Exit Focus" : "Focus";
});

// =====================================================
// GLOBAL EVENT LISTENERS
// =====================================================

// Add section button
document.getElementById("add-section-btn").addEventListener("click", openTemplatePicker);

// Dancers modal button
document.getElementById("dancers-btn").addEventListener("click", openDancersModal);

// Modal close buttons
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

// Click outside modal to close
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      const id = overlay.id;
      closeModal(id);
    }
  });
});

// Escape key to close modals and dropdowns
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAllDropdowns();
    document.querySelectorAll(".modal-overlay:not([hidden])").forEach((m) => {
      closeModal(m.id);
    });
  }
});

// Click outside dropdown to close
document.addEventListener("click", (e) => {
  if (!e.target.closest(".unit-controls")) {
    closeAllDropdowns();
  }
});

// Intersection observer for section index active state
function setupScrollSpy() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace("section-", "");
          document.querySelectorAll(".index-link").forEach((link, i) => {
            const section = appState.sections[i];
            link.classList.toggle("active", section && section.id === id);
          });
        }
      });
    },
    { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
  );
  document.querySelectorAll(".practice-unit").forEach((el) => observer.observe(el));
}

// =====================================================
// HELPER UTILS
// =====================================================

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// =====================================================
// INIT
// =====================================================

function init() {
  const loaded = loadFromLocalStorage();
  if (!loaded || appState.sections.length === 0) {
    buildDefaultState();
  }
  renderAll();
  setTimeout(setupScrollSpy, 200);
}

init();
