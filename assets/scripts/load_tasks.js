const SUBJECT_DATA_URLS = [
  "../assets/data/questions/math.json",
  "../assets/data/questions/history.json",
  "../assets/data/questions/english.json",
  "../assets/data/questions/ukrainian.json",
];

const TOPICS_URL = "../assets/data/subjects_topics.json";
const RESULTS_KEY = "quiz_results";

let totalAnswered = 0;
let correctAnswered = 0;
let totalTasks = 0;
let sessionMeta = {
  topicId: null,
  variantId: null,
  topicName: null,
  startTime: null,
};

function createLightbox() {
  if (document.getElementById("img-lightbox")) return;

  const overlay = document.createElement("div");
  overlay.id = "img-lightbox";
  overlay.style.cssText = `
    display: none; position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.8); align-items: center; justify-content: center;
    cursor: zoom-out;
  `;

  const img = document.createElement("img");
  img.id = "img-lightbox-img";
  img.style.cssText = `
  width: 90vw; 
  height: 90vh;
  object-fit: contain;
    border-radius: 8px; cursor: default;
    box-shadow: 0 8px 40px rgba(0,0,0,0.6);
  `;

  const closeBtn = document.createElement("button");
  closeBtn.id = "img-lightbox-close";
  closeBtn.innerHTML = "&#x2715;";
  closeBtn.style.cssText = `
    position: fixed; top: 20px; right: 24px; z-index: 10000;
    background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.4);
    color: #fff; font-size: 22px; line-height: 1; width: 44px; height: 44px;
    border-radius: 3rem; cursor: pointer; display: flex;
    align-items: center; justify-content: center;
    transition: background 0.15s;
  `;
  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.background = "rgba(255,255,255,0.3)";
  });
  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.background = "rgba(255,255,255,0.15)";
  });

  overlay.appendChild(img);
  document.body.appendChild(overlay);
  document.body.appendChild(closeBtn);
  closeBtn.style.display = "none";

  function openLightbox(src) {
    img.src = src;
    overlay.style.display = "flex";
    closeBtn.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    overlay.style.display = "none";
    closeBtn.style.display = "none";
    document.body.style.overflow = "";
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeLightbox();
  });

  img.addEventListener("click", (e) => e.stopPropagation());

  closeBtn.addEventListener("click", closeLightbox);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  return openLightbox;
}
function createCustomSelect(options, leftKey) {
  const wrap = document.createElement("div");
  wrap.className = "custom-select-wrap";
  wrap.dataset.left = leftKey;
  wrap.dataset.value = "";

  const trigger = document.createElement("div");
  trigger.className = "custom-select-trigger";
  trigger.setAttribute("tabindex", "0");
  trigger.innerHTML = `
    <span class="trigger-text placeholder">?</span>
    <svg class="trigger-arrow" viewBox="0 0 16 16" fill="none"
         stroke="currentColor" stroke-width="2" aria-hidden="true">
      <polyline points="4 6 8 10 12 6"/>
    </svg>`;

  const dropdown = document.createElement("div");
  dropdown.className = "custom-select-dropdown";
  dropdown.setAttribute("role", "listbox");
  document.body.appendChild(dropdown);

  const placeholderOpt = document.createElement("div");
  placeholderOpt.className = "custom-option placeholder-opt";
  placeholderOpt.textContent = "Оберіть відповідь...";
  placeholderOpt.dataset.value = "";
  dropdown.appendChild(placeholderOpt);

  options.forEach((opt) => {
    const el = document.createElement("div");
    el.className = "custom-option";
    el.textContent = opt.label;
    el.dataset.value = opt.key;
    el.setAttribute("role", "option");
    dropdown.appendChild(el);
  });

  wrap.appendChild(trigger);

  function positionDropdown() {
    const rect = trigger.getBoundingClientRect();
    const dropdownHeight = Math.min(260, dropdown.scrollHeight || 260);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    dropdown.style.position = "fixed";
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      dropdown.style.top = `${rect.top - dropdownHeight - 4}px`;
      dropdown.style.bottom = "auto";
    } else {
      dropdown.style.top = `${rect.bottom + 4}px`;
      dropdown.style.bottom = "auto";
    }
  }

  function open() {
    closeAll();
    positionDropdown();
    trigger.classList.add("open");
    dropdown.classList.add("open");
    dropdown._owner = wrap;
  }

  function close() {
    trigger.classList.remove("open");
    dropdown.classList.remove("open");
  }

  function closeAll() {
    document.querySelectorAll(".custom-select-dropdown.open").forEach((d) => {
      d.classList.remove("open");
      if (d._owner) {
        d._owner
          .querySelector(".custom-select-trigger")
          ?.classList.remove("open");
      }
    });
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.contains("open") ? close() : open();
  });

  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
    if (e.key === "Escape") close();
  });

  window.addEventListener(
    "scroll",
    () => {
      if (dropdown.classList.contains("open")) positionDropdown();
    },
    true,
  );
  window.addEventListener("resize", () => {
    if (dropdown.classList.contains("open")) positionDropdown();
  });

  dropdown.addEventListener("mousedown", (e) => e.preventDefault());

  dropdown.addEventListener("click", (e) => {
    const opt = e.target.closest(".custom-option");
    if (!opt) return;

    const val = opt.dataset.value;
    wrap.dataset.value = val;

    dropdown
      .querySelectorAll(".custom-option")
      .forEach((o) => o.classList.remove("selected"));
    if (val) opt.classList.add("selected");

    const textEl = trigger.querySelector(".trigger-text");
    if (val) {
      const match = options.find((o) => o.key === val);
      textEl.textContent = match ? match.label : val;
      textEl.classList.remove("placeholder");
    } else {
      textEl.textContent = "?";
      textEl.classList.add("placeholder");
    }

    close();
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target) && !dropdown.contains(e.target)) {
      close();
    }
  });

  const observer = new MutationObserver(() => {
    if (!document.body.contains(wrap)) {
      dropdown.remove();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return wrap;
}

document.addEventListener("click", () => {
  document.querySelectorAll(".custom-select-dropdown.open").forEach((d) => {
    d.classList.remove("open");
    d.previousElementSibling.classList.remove("open");
  });
});

function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveResult(entry) {
  const results = loadResults();
  results.unshift(entry);
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch {
    if (results.length > 1) {
      results.pop();
      try {
        localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
      } catch {}
    }
  }
}

function buildResultEntry() {
  const durationSec = Math.round((Date.now() - sessionMeta.startTime) / 1000);
  return {
    id: Date.now(),
    topicId: sessionMeta.topicId,
    variantId: sessionMeta.variantId || null,
    topicName: sessionMeta.topicName,
    score: correctAnswered,
    total: totalTasks,
    percent: Math.round((correctAnswered / totalTasks) * 100),
    durationSec,
    timestamp: new Date().toISOString(),
  };
}

function cloneTemplate(id) {
  return document.getElementById(id).content.cloneNode(true).firstElementChild;
}

function getTopicName(topicsData, topicId) {
  for (const subject of topicsData) {
    const topic = subject.topics.find((t) => String(t.id) === String(topicId));
    if (topic) return topic.name;
  }
  return `Тема ${topicId}`;
}

function normalizeAnswerToken(str) {
  return String(str).replace(/[).]/g, "").trim().toLowerCase();
}

function isOptionMatched(optStr, answer) {
  const optNorm = normalizeAnswerToken(optStr);
  const ansNorm = normalizeAnswerToken(answer);
  return optNorm === ansNorm || optNorm.startsWith(ansNorm + " ");
}

async function loadAllQuestions() {
  const results = await Promise.allSettled(
    SUBJECT_DATA_URLS.map((url) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
        return r.json();
      }),
    ),
  );

  const allQuestions = [];

  results.forEach((result, i) => {
    if (result.status !== "fulfilled") {
      console.warn(`Could not load subject file #${i + 1}:`, result.reason);
      return;
    }

    const data = result.value;

    data.forEach((entry) => {
      if ("question" in entry) {
        allQuestions.push(entry);
        return;
      }

      if (Array.isArray(entry.questions)) {
        entry.questions.forEach((q) => {
          allQuestions.push({
            topic_id: entry.topic_id,
            variant_id: entry.variant_id,
            text: entry.text || "",
            ...q,
          });
        });
      }
    });
  });

  return allQuestions;
}

function filterQuestions(allQuestions, topicId, variantId) {
  let tasks = allQuestions.filter(
    (q) => String(q.topic_id) === String(topicId),
  );
  if (variantId) {
    tasks = tasks.filter((q) => String(q.variant_id) === String(variantId));
  }
  return tasks;
}

function updateProgress() {
  document.getElementById("task-counter").textContent =
    `${totalAnswered} / ${totalTasks}`;

  if (totalAnswered === totalTasks && totalTasks > 0) {
    const entry = buildResultEntry();
    saveResult(entry);

    const banner = document.getElementById("score-banner");
    document.getElementById("score-value").textContent =
      `${correctAnswered} / ${totalTasks}`;
    banner.style.display = "block";
    banner.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function markCard(card, isCorrect) {
  totalAnswered++;
  if (isCorrect) correctAnswered++;
  card.classList.add(isCorrect ? "answered-correct" : "answered-wrong");
  updateProgress();
}

function showFeedback(el, isCorrect, correctAnswer) {
  el.textContent = isCorrect
    ? "✓ Правильно!"
    : `✗ Неправильно! Правильна відповідь: ${correctAnswer}`;
  el.className = `feedback show ${isCorrect ? "correct-fb" : "wrong-fb"}`;
}

function resolveCard(card, isCorrect, correctAnswer) {
  showFeedback(card.querySelector(".feedback"), isCorrect, correctAnswer);
  markCard(card, isCorrect);
}
function initCard(templateId, task, index) {
  const card = cloneTemplate(templateId);
  card.querySelector(".task-num").textContent = index + 1;

  const questionEl = card.querySelector(".question-text");

  if (task.text) {
    const textBlock = document.createElement("div");
    textBlock.className = "task-shared-text";
    textBlock.innerHTML = String(task.text).replace(/\n/g, "<br>");
    questionEl.before(textBlock);
  }

  questionEl.innerHTML = task.question || "";

  if (task.image_url) {
    const img = card.querySelector(".question-image");
    img.src = "../assets/data/" + task.image_url;
    img.hidden = false;

    img.style.cursor = "zoom-in";
    img.title = "Натисніть для збільшення";
    img.addEventListener("click", () => {
      const openLightbox = createLightbox();
      if (openLightbox) openLightbox(img.src);
      else {
        const overlay = document.getElementById("img-lightbox");
        const lbImg = document.getElementById("img-lightbox-img");
        const closeBtn = document.getElementById("img-lightbox-close");
        lbImg.src = img.src;
        overlay.style.display = "flex";
        closeBtn.style.display = "flex";
        document.body.style.overflow = "hidden";
      }
    });
  }

  return card;
}

function renderMultiple(task, index) {
  const card = initCard("tpl-multiple", task, index);
  const grid = card.querySelector(".options-grid");

  let answers = [];

  if (Array.isArray(task.answer)) {
    answers = task.answer.map((a) => String(a).trim()).filter(Boolean);
  } else if (typeof task.answer === "string") {
    answers = task.answer
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
  }

  const selected = new Set();

  if (!task.options || task.options.length === 0) {
    const note = document.createElement("p");
    note.style.cssText =
      "font-size:0.9rem;color:var(--text-dim);font-style:italic;";
    note.textContent = "Відповідь: " + task.answer;
    card.querySelector(".options-grid").replaceWith(note);
    return card;
  }

  task.options.forEach((opt) => {
    const optStr = String(opt).trim();
    const btn = cloneTemplate("tpl-option-btn");
    btn.textContent = optStr;
    btn.dataset.opt = optStr;
    btn.type = "button";

    btn.addEventListener("click", () => {
      if (btn.disabled) return;

      if (selected.has(optStr)) {
        selected.delete(optStr);
        btn.classList.remove("selected-option");
      } else {
        selected.add(optStr);
        btn.classList.add("selected-option");
      }
    });

    grid.appendChild(btn);
  });

  const checkBtn = document.createElement("button");
  checkBtn.type = "button";
  checkBtn.className = "check-btn";
  checkBtn.textContent = "Перевірити";
  grid.after(checkBtn);

  checkBtn.addEventListener("click", () => {
    if (selected.size === 0) return;

    const buttons = [...grid.querySelectorAll(".option-btn")];

    const correctOptions = buttons
      .filter((b) => answers.some((ans) => isOptionMatched(b.dataset.opt, ans)))
      .map((b) => b.dataset.opt);

    const selectedOptions = [...selected];

    const isCorrect =
      selectedOptions.length === correctOptions.length &&
      selectedOptions.every((opt) => correctOptions.includes(opt));

    buttons.forEach((b) => {
      b.disabled = true;

      if (correctOptions.includes(b.dataset.opt)) {
        b.classList.add("correct");
      }

      if (
        selected.has(b.dataset.opt) &&
        !correctOptions.includes(b.dataset.opt)
      ) {
        b.classList.add("wrong");
      }
    });

    checkBtn.disabled = true;

    const answerText = Array.isArray(task.answer)
      ? task.answer.join(", ")
      : String(task.answer);

    resolveCard(card, isCorrect, answerText);
  });

  return card;
}

function renderManual(task, index) {
  const card = initCard("tpl-manual", task, index);
  const input = card.querySelector(".manual-input");
  const btn = card.querySelector(".check-btn");

  const check = () => {
    if (!input.value.trim()) return;
    const isCorrect =
      input.value.trim().toLowerCase() ===
      String(task.answer).trim().toLowerCase();
    input.disabled = true;
    btn.disabled = true;
    resolveCard(card, isCorrect, task.answer);
  };

  btn.addEventListener("click", check);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") check();
  });

  return card;
}
function renderMatch(task, index) {
  const card = initCard("tpl-match", task, index);
  const rowsContainer = card.querySelector(".match-rows");

  const answerMap = {};
  const rawAnswer = String(task.answer).trim();

  if (/^\d/.test(rawAnswer)) {
    rawAnswer.split(";").forEach((part) => {
      const [left, right] = part
        .trim()
        .split("-")
        .map((s) => s.trim());
      if (left && right) answerMap[left] = right;
    });
  } else {
    [...rawAnswer].forEach((letter, i) => {
      answerMap[String(i + 1)] = letter.trim();
    });
  }

  const rightOptions = task.options.map((opt) => {
    const text = String(opt).trim();
    const match = text.match(/^([А-ЯІЇЄҐA-Z0-9])(?:[\).\s]+)/u);
    return { key: match ? match[1] : text, label: text };
  });

  const leftItems = Object.keys(answerMap).sort(
    (a, b) => Number(a) - Number(b),
  );

  leftItems.forEach((left) => {
    const row = cloneTemplate("tpl-match-row");
    row.querySelector(".match-left-label").textContent = left;

    const oldSelect = row.querySelector(".match-select");
    const customSelect = createCustomSelect(rightOptions, left);

    if (oldSelect) {
      oldSelect.replaceWith(customSelect);
    } else {
      row.appendChild(customSelect);
    }

    rowsContainer.appendChild(row);
  });

  const checkBtn = card.querySelector(".check-btn");

  checkBtn.addEventListener("click", () => {
    const wraps = card.querySelectorAll(".custom-select-wrap");
    let allFilled = true;
    let allCorrect = true;

    wraps.forEach((wrap) => {
      const left = wrap.dataset.left;
      const val = wrap.dataset.value || "";
      const expected = answerMap[left];
      const trigger = wrap.querySelector(".custom-select-trigger");

      if (!val) {
        allFilled = false;
        return;
      }

      const ok = val === expected;
      if (!ok) allCorrect = false;

      trigger.classList.add(ok ? "correct-select" : "wrong-select");
      trigger.classList.add("disabled");
    });

    if (!allFilled) return;

    checkBtn.disabled = true;
    resolveCard(card, allCorrect, task.answer || "усі відповідності правильні");
  });

  return card;
}

const RENDERERS = {
  multiple: renderMultiple,
  manual: renderManual,
  match: renderMatch,
};

async function loadTasks() {
  const params = new URLSearchParams(window.location.search);
  const topicId = params.get("topic_id");
  const variantId = params.get("variant_id");
  createLightbox();

  const titleEl = document.getElementById("topic-title");
  const loading = document.getElementById("loading");
  const errorMsg = document.getElementById("error-msg");

  if (!topicId) {
    titleEl.textContent = "Помилка: відсутній topic_id у URL";
    loading.style.display = "none";
    errorMsg.style.display = "block";
    return;
  }

  try {
    const [allQuestions, topicsData] = await Promise.all([
      loadAllQuestions(),
      fetch(TOPICS_URL).then((r) => {
        if (!r.ok) throw new Error("Failed to load topics");
        return r.json();
      }),
    ]);

    const tasks = filterQuestions(allQuestions, topicId, variantId);
    loading.style.display = "none";

    const topicName = getTopicName(topicsData, topicId);
    titleEl.textContent = variantId
      ? `${topicName} — Варіант ${variantId}`
      : topicName;

    sessionMeta = {
      topicId,
      variantId: variantId || null,
      topicName: titleEl.textContent,
      startTime: Date.now(),
    };

    if (tasks.length === 0) {
      document.getElementById("empty-msg").style.display = "block";
      return;
    }

    totalTasks = tasks.length;
    document.getElementById("task-counter").style.display = "inline";
    updateProgress();

    const container = document.getElementById("tasks-container");
    tasks.forEach((task, i) => {
      const card = RENDERERS[task.type]?.(task, i);
      if (card) container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    loading.style.display = "none";
    titleEl.textContent = "Помилка завантаження завдань";
    errorMsg.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", loadTasks);
