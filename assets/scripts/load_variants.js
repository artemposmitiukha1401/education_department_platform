const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQlU54jBPSIHMy7NKA_DXZaATMT1vzUZ9nlGxGTF67Nld9R2DKo2UT89grSNejqZF88Wm01Nwy-j_/pub?output=csv";
const TOPICS_URL = "../assets/data/subjects_topics.json";

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

function getTopicName(topicsData, topicId) {
  for (const subject of topicsData) {
    const topic = subject.topics.find((t) => String(t.id) === String(topicId));
    if (topic) return topic.name;
  }
  return `Тема ${topicId}`;
}

async function fetchWithRetry(url, attempts = 3, delayMs = 800) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {}
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Failed to fetch: ${url}`);
}

function cloneTemplate(id) {
  return document.getElementById(id).content.cloneNode(true).firstElementChild;
}

async function loadVariants() {
  const params = new URLSearchParams(window.location.search);
  const topicId = params.get("topic_id");
  const titleEl = document.getElementById("topic-title");
  const loading = document.getElementById("loading");
  const errorMsg = document.getElementById("error-msg");
  const emptyMsg = document.getElementById("empty-msg");
  const container = document.getElementById("variants-container");

  if (!topicId) {
    titleEl.textContent = "Помилка: відсутній topic_id у URL";
    loading.style.display = "none";
    errorMsg.style.display = "block";
    return;
  }

  try {
    const [csvRes, topicsRes] = await Promise.all([
      fetchWithRetry(SHEET_URL),
      fetchWithRetry(TOPICS_URL),
    ]);
    const [csv, topicsData] = await Promise.all([
      csvRes.text(),
      topicsRes.json(),
    ]);

    const allTasks = parseCSV(csv).filter((t) => t.topic_id === topicId);
    const variantMap = new Map();
    for (const task of allTasks) {
      const vid = task.variant_id;
      if (!vid) continue;
      variantMap.set(vid, (variantMap.get(vid) ?? 0) + 1);
    }

    loading.style.display = "none";
    titleEl.textContent = getTopicName(topicsData, topicId);

    if (variantMap.size === 0) {
      emptyMsg.style.display = "block";
      return;
    }

    const sorted = [...variantMap.entries()].sort(([a], [b]) => {
      const na = parseInt(a),
        nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    sorted.forEach(([variantId, count]) => {
      const card = cloneTemplate("variant-card-template");
      card.href = `packages_template_page.html?topic_id=${topicId}&variant_id=${variantId}`;
      card.querySelector(".variant-name").textContent = `Варіант ${variantId}`;
      card.querySelector(".variant-count").textContent = `${count} завдань`;
      container.appendChild(card);
    });
  } catch (err) {
    loading.style.display = "none";
    titleEl.textContent = "Помилка завантаження";

    const retryBtn = document.createElement("button");
    retryBtn.textContent = "Спробувати знову";
    retryBtn.style.cssText = `
      display: block; margin: 1rem auto 0;
      padding: 0.3rem 1.2rem;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 3rem;
      background: transparent;
      color: rgba(255,255,255,0.7);
      font-family: 'Didact Gothic', sans-serif;
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
    `;
    retryBtn.addEventListener("click", () => location.reload());

    errorMsg.textContent = "Проблема із завантаженням даних.";
    errorMsg.appendChild(retryBtn);
    errorMsg.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", loadVariants);
