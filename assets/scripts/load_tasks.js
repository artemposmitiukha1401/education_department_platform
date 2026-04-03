// ─── Data sources ────────────────────────────────────────────────────────────
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
    if (result.status === "fulfilled") {
      allQuestions.push(...result.value);
    } else {
      console.warn(`Could not load subject file #${i + 1}:`, result.reason);
    }
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
  card.querySelector(".question-text").innerHTML = task.question || "";

  if (task.image_url) {
    const img = card.querySelector(".question-image");
    img.src = "../assets/data/" + task.image_url;
    img.hidden = false;
  }

  return card;
}

function renderMultiple(task, index) {
  const card = initCard("tpl-multiple", task, index);
  const grid = card.querySelector(".options-grid");

  let answers = [];

  if (Array.isArray(task.answer)) {
    answers = task.answer.map((a) => String(a).trim()).filter(Boolean);
  } else {
    answers = String(task.answer)
      .split(/[,;]/)
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

      if (btn.classList.contains("selected-option")) {
        btn.classList.remove("selected-option");
        selected.delete(optStr);
      } else {
        btn.classList.add("selected-option");
        selected.add(optStr);
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
  // AFTER
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
    return {
      key: match ? match[1] : text,
      label: text,
    };
  });

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
      optionEl.value = opt.key;
      optionEl.textContent = opt.label;
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
