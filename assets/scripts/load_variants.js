// ─── Configuration ───────────────────────────────────────────────────────────
const SUBJECT_DATA_URLS = [
  "../assets/data/questions/math.json",
  "../assets/data/questions/history.json",
  "../assets/data/questions/english.json",
  "../assets/data/questions/ukrainian.json",
];
const TOPICS_URL = "../assets/data/subjects_topics.json";

// ─── Data Loading Logic (JSON-based) ────────────────────────────────────────
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

function getTopicName(topicsData, topicId) {
  for (const subject of topicsData) {
    const topic = subject.topics.find((t) => String(t.id) === String(topicId));
    if (topic) return topic.name;
  }
  return `Тема ${topicId}`;
}

function cloneTemplate(id) {
  return document.getElementById(id).content.cloneNode(true).firstElementChild;
}

// ─── Main Controller ─────────────────────────────────────────────────────────
async function loadVariants() {
  const params = new URLSearchParams(window.location.search);
  const topicId = params.get("topic_id");

  const titleEl = document.getElementById("topic-title");
  const loading = document.getElementById("loading");
  const errorMsg = document.getElementById("error-msg");
  const emptyMsg = document.getElementById("empty-msg");
  const container = document.getElementById("variants-container");

  if (!topicId) {
    titleEl.textContent = "Помилка: відсутній topic_id";
    loading.style.display = "none";
    errorMsg.style.display = "block";
    return;
  }

  try {
    // 1. Fetch JSON data instead of CSV
    const [allQuestions, topicsData] = await Promise.all([
      loadAllQuestions(),
      fetch(TOPICS_URL).then((r) => r.json()),
    ]);

    // 2. Filter tasks for this topic and map variants
    const topicTasks = allQuestions.filter(
      (q) => String(q.topic_id) === String(topicId),
    );

    const variantMap = new Map();
    topicTasks.forEach((task) => {
      const vid = task.variant_id;
      if (vid) {
        variantMap.set(vid, (variantMap.get(vid) ?? 0) + 1);
      }
    });

    // 3. UI Updates
    loading.style.display = "none";
    titleEl.textContent = getTopicName(topicsData, topicId);

    if (variantMap.size === 0) {
      emptyMsg.style.display = "block";
      return;
    }

    // 4. Sort variants (Numeric if possible, else alphabetical)
    const sortedVariants = [...variantMap.entries()].sort(([a], [b]) => {
      const na = parseInt(a),
        nb = parseInt(b);
      return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
    });

    // 5. Render cards
    sortedVariants.forEach(([variantId, count]) => {
      const card = cloneTemplate("variant-card-template");
      // Links to the template page with both IDs
      card.href = `packages_template_page.html?topic_id=${topicId}&variant_id=${variantId}`;

      card.querySelector(".variant-name").textContent = `Варіант ${variantId}`;
      card.querySelector(".variant-count").textContent = `${count} завдань`;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Load variants error:", err);
    loading.style.display = "none";
    titleEl.textContent = "Помилка завантаження";
    errorMsg.style.display = "block";

    // Simple retry logic
    const retryBtn = document.createElement("button");
    retryBtn.textContent = "Спробувати знову";
    retryBtn.onclick = () => location.reload();
    errorMsg.appendChild(retryBtn);
  }
}

document.addEventListener("DOMContentLoaded", loadVariants);
