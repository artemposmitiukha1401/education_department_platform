// ─── Data sources ────────────────────────────────────────────────────────────
// One JSON file per subject. Add/remove entries here as subjects change.
// Each file is an array of question objects (see questions_subject_1.json).
const SUBJECT_DATA_URLS = [
  "../assets/data/questions/math.json",
  "../assets/data/questions/history.json",
  "../assets/data/questions/english.json",
  "../assets/data/questions/ukrainian.json",
];

const TOPICS_URL = "../assets/data/subjects_topics.json";
const RESULTS_KEY = "quiz_results";

// ─── Session state ───────────────────────────────────────────────────────────
let totalAnswered = 0;
let correctAnswered = 0;
let totalTasks = 0;
let sessionMeta = {
  topicId: null,
  variantId: null,
  topicName: null,
  startTime: null,
};

// ─── Result persistence ──────────────────────────────────────────────────────
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

// ─── DOM helpers ─────────────────────────────────────────────────────────────
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

// ─── Data loading ─────────────────────────────────────────────────────────────
/**
 * Loads all subject JSON files in parallel and merges them into one flat array.
 * Files that fail to load are skipped with a console warning so a single
 * missing file doesn't break the whole quiz.
 *
 * Expected question object shape:
 * {
 *   id:         number,
 *   topic_id:   number | string,
 *   variant_id: number | string | null,
 *   type:       "multiple" | "manual" | "match",
 *   question:   string,
 *   image_url:  string,          // "" when none
 *   options:    string[],        // [] for manual; "left:right" pairs for match
 *   answer:     string
 * }
 */
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
    if (result.status === "fulfilled") {
      allQuestions.push(...result.value);
    } else {
      console.warn(`Could not load subject file #${i + 1}:`, result.reason);
    }
  });

  return allQuestions;
}

/**
 * Filters the merged question list by topic_id (required) and
 * optionally by variant_id.
 */
function filterQuestions(allQuestions, topicId, variantId) {
  let tasks = allQuestions.filter(
    (q) => String(q.topic_id) === String(topicId),
  );
  if (variantId) {
    tasks = tasks.filter((q) => String(q.variant_id) === String(variantId));
  }
  return tasks;
}

// ─── Progress & scoring ──────────────────────────────────────────────────────
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

// ─── Card renderers ──────────────────────────────────────────────────────────
function initCard(templateId, task, index) {
  const card = cloneTemplate(templateId);
  card.querySelector(".task-num").textContent = index + 1;
  card.querySelector(".question-text").textContent = task.question;

  if (task.image_url) {
    const img = card.querySelector(".question-image");
    img.src = "../assets/data/" + task.image_url;
    img.hidden = false;
  }

  return card;
}

/**
 * Multiple-choice card.
 * task.options — array of option strings, e.g. ["А) 15", "Б) -15", ...]
 * task.answer  — the correct option string, e.g. "Б"
 *
 * Matching is done by checking whether the option string starts with / equals
 * the answer, so both "Б" and "Б) -15" work as answer values.
 */
function renderMultiple(task, index) {
  const card = initCard("tpl-multiple", task, index);
  const grid = card.querySelector(".options-grid");
  const answer = String(task.answer).trim();

  task.options.forEach((opt) => {
    const optStr = String(opt).trim();
    const btn = cloneTemplate("tpl-option-btn");
    btn.textContent = optStr;
    btn.dataset.opt = optStr;

    btn.addEventListener("click", () => {
      const isCorrect =
        optStr === answer ||
        optStr.startsWith(answer + ")") ||
        optStr.startsWith(answer + " ");

      grid.querySelectorAll(".option-btn").forEach((b) => {
        b.disabled = true;
        const bVal = b.dataset.opt;
        if (
          bVal === answer ||
          bVal.startsWith(answer + ")") ||
          bVal.startsWith(answer + " ")
        ) {
          b.classList.add("correct");
        }
      });

      if (!isCorrect) btn.classList.add("wrong");
      resolveCard(card, isCorrect, task.answer);
    });

    grid.appendChild(btn);
  });

  return card;
}

/**
 * Manual (free-text) card.
 * task.answer — the expected string (case-insensitive comparison).
 */
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

/**
 * Matching card.
 * task.options — array of "left:right" pair strings, e.g. ["1:Б", "2:Д", "3:А"]
 * task.answer  — human-readable correct answer shown in feedback (string)
 */
function renderMatch(task, index) {
  const card = initCard("tpl-match", task, index);
  const rowsContainer = card.querySelector(".match-rows");

  // Парсим правильные ответы из строки типа "1-Д; 2-Г; 3-В"
  const answerMap = {};
  String(task.answer)
    .split(";")
    .map((part) => part.trim())
    .forEach((part) => {
      const [left, right] = part.split("-").map((s) => s.trim());
      if (left && right) answerMap[left] = right;
    });

  // Варианты справа берём из options:
  // ["А [проміжок А]", "Б [проміжок Б]", ...]
  const rightOptions = task.options.map((opt) => {
    const text = String(opt).trim();
    const match = text.match(/^([А-ЯІЇЄҐA-Z])\s+/u);
    return {
      key: match ? match[1] : text,
      label: text,
    };
  });

  // Левые элементы берём из answer, например 1,2,3
  const leftItems = Object.keys(answerMap).sort(
    (a, b) => Number(a) - Number(b),
  );

  leftItems.forEach((left) => {
    const row = cloneTemplate("tpl-match-row");
    row.querySelector(".match-left-label").textContent = left;

    const select = row.querySelector(".match-select");
    select.dataset.left = left;

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "?";
    select.appendChild(defaultOpt);

    rightOptions.forEach((opt) => {
      const optionEl = document.createElement("option");
      optionEl.value = opt.key; // например "А"
      optionEl.textContent = opt.label; // например "А [проміжок А]"
      select.appendChild(optionEl);
    });

    rowsContainer.appendChild(row);
  });

  const checkBtn = card.querySelector(".check-btn");
  checkBtn.addEventListener("click", () => {
    const selects = card.querySelectorAll(".match-select");
    let allCorrect = true;

    selects.forEach((sel) => {
      const expected = answerMap[sel.dataset.left];
      const isOk = sel.value === expected;

      if (!isOk) allCorrect = false;

      sel.classList.add(isOk ? "correct-select" : "wrong-select");
      sel.disabled = true;
    });

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

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function loadTasks() {
  const params = new URLSearchParams(window.location.search);
  const topicId = params.get("topic_id");
  const variantId = params.get("variant_id");

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
