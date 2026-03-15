const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQlU54jBPSIHMy7NKA_DXZaATMT1vzUZ9nlGxGTF67Nld9R2DKo2UT89grSNejqZF88Wm01Nwy-j_/pub?output=csv";
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

// ─── LocalStorage helpers ────────────────────────────────────────────────────

function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveResult(entry) {
  const results = loadResults();
  results.unshift(entry); // newest first
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch (e) {
    // Storage quota exceeded – drop the oldest entry and retry once
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

function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const headers = splitCSVRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCSVRow(line);
    return headers.reduce((obj, h, i) => {
      obj[h.trim()] = (values[i] ?? "").trim();
      return obj;
    }, {});
  });
}

function splitCSVRow(row) {
  const result = [];
  let cur = "",
    inQuote = false;
  for (const c of row) {
    if (c === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (c === "," && !inQuote) {
      result.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  result.push(cur);
  return result;
}

// ─── Progress & scoring ──────────────────────────────────────────────────────

function updateProgress() {
  document.getElementById("task-counter").textContent =
    `${totalAnswered} / ${totalTasks}`;

  if (totalAnswered === totalTasks && totalTasks > 0) {
    // ── Save result to localStorage ──
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
    img.src = task.image_url;
    img.hidden = false;
  }
  return card;
}

function renderMultiple(task, index) {
  const card = initCard("tpl-multiple", task, index);
  const grid = card.querySelector(".options-grid");
  const options = task.options
    .split(";")
    .map((o) => o.trim())
    .filter(Boolean);
  const answer = task.answer.trim();

  options.forEach((opt) => {
    const btn = cloneTemplate("tpl-option-btn");
    btn.textContent = opt;
    btn.dataset.opt = opt;
    btn.addEventListener("click", () => {
      const isCorrect = opt === answer;
      grid.querySelectorAll(".option-btn").forEach((b) => {
        b.disabled = true;
        if (b.dataset.opt === answer) b.classList.add("correct");
      });
      if (!isCorrect) btn.classList.add("wrong");
      resolveCard(card, isCorrect, task.answer);
    });
    grid.appendChild(btn);
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
      input.value.trim().toLowerCase() === task.answer.trim().toLowerCase();
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
  const pairs = task.options
    .split(";")
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => o.split(":").map((s) => s.trim()));
  const rights = [...pairs.map((p) => p[1])].sort(() => Math.random() - 0.5);
  const rowsContainer = card.querySelector(".match-rows");

  pairs.forEach(([left]) => {
    const row = cloneTemplate("tpl-match-row");
    row.querySelector(".match-left-label").textContent = left;
    const select = row.querySelector(".match-select");
    select.dataset.left = left;
    rights.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = r;
      select.appendChild(opt);
    });
    rowsContainer.appendChild(row);
  });

  const checkBtn = card.querySelector(".check-btn");
  checkBtn.addEventListener("click", () => {
    const selects = card.querySelectorAll(".match-select");
    let allCorrect = true;
    selects.forEach((sel) => {
      const expected = pairs.find((p) => p[0] === sel.dataset.left)?.[1];
      const isOk = sel.value === expected;
      if (!isOk) allCorrect = false;
      sel.classList.add(isOk ? "correct-select" : "wrong-select");
      sel.disabled = true;
    });
    checkBtn.disabled = true;
    resolveCard(card, allCorrect, "усі відповідності правильні");
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
    const [csvRes, topicsRes] = await Promise.all([
      fetch(SHEET_URL),
      fetch(TOPICS_URL),
    ]);
    if (!csvRes.ok || !topicsRes.ok) throw new Error();

    const [csv, topicsData] = await Promise.all([
      csvRes.text(),
      topicsRes.json(),
    ]);

    let tasks = parseCSV(csv).filter((t) => t.topic_id === topicId);
    if (variantId) {
      tasks = tasks.filter((t) => t.variant_id === variantId);
    }

    loading.style.display = "none";

    const topicName = getTopicName(topicsData, topicId);
    titleEl.textContent = variantId
      ? `${topicName} — Варіант ${variantId}`
      : topicName;

    // ── Store session metadata for result saving ──
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
  } catch {
    loading.style.display = "none";
    titleEl.textContent = "Помилка завантаження завдань";
    errorMsg.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", loadTasks);
