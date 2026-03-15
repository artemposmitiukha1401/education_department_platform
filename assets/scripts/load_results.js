const RESULTS_KEY = "quiz_results";

function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY)) || [];
  } catch {
    return [];
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(sec) {
  if (!sec || sec < 0) return null;
  const m = Math.floor(sec / 60),
    s = sec % 60;
  return m > 0 ? `${m} хв ${s} с` : `${s} с`;
}

function pct(r) {
  return r.percent ?? Math.round((r.score / r.total) * 100);
}

function ringColor(p) {
  if (p >= 80) return "rgba(95,210,150,0.85)";
  if (p >= 50) return "rgba(230,180,70,0.82)";
  return "rgba(210,80,80,0.78)";
}

function buildRing(p) {
  const r = 21,
    cx = 26,
    cy = 26;
  const circ = 2 * Math.PI * r;
  const offset = (circ * (1 - p / 100)).toFixed(2);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "score-ring");
  svg.setAttribute("viewBox", "0 0 52 52");

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bg.setAttribute("class", "ring-bg");
  bg.setAttribute("cx", cx);
  bg.setAttribute("cy", cy);
  bg.setAttribute("r", r);

  const arc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  arc.setAttribute("class", "ring-arc");
  arc.setAttribute("cx", cx);
  arc.setAttribute("cy", cy);
  arc.setAttribute("r", r);
  arc.setAttribute("stroke", ringColor(p));
  arc.setAttribute("stroke-dasharray", circ.toFixed(2));
  arc.setAttribute("stroke-dashoffset", offset);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", "ring-text");
  text.setAttribute("x", cx);
  text.setAttribute("y", cy);
  text.textContent = `${p}%`;

  svg.append(bg, arc, text);
  return svg;
}

function renderCard(entry, idx) {
  const p = pct(entry);
  const dur = formatDuration(entry.durationSec);

  const card = document
    .getElementById("tpl-result-card")
    .content.cloneNode(true).firstElementChild;
  card.style.animationDelay = `${idx * 0.045}s`;

  card.querySelector(".card-ring").appendChild(buildRing(p));
  card.querySelector(".card-topic").textContent =
    entry.topicName || `Тема ${entry.topicId}`;
  card.querySelector(".meta-date").textContent = formatDate(entry.timestamp);

  if (entry.variantId) {
    const variantEl = card.querySelector(".meta-variant");
    variantEl.textContent = `Варіант ${entry.variantId}`;
    variantEl.hidden = false;
  }

  if (dur) {
    const durEl = card.querySelector(".meta-duration");
    durEl.textContent = dur;
    durEl.hidden = false;
  }

  card.querySelector(".score-correct").textContent = entry.score;
  card.querySelector(".score-total").textContent = `/${entry.total}`;

  return card;
}

function init() {
  const results = loadResults();
  if (results.length === 0) {
    document.getElementById("empty-state").style.display = "block";
    return;
  }
  const list = document.getElementById("results-list");
  results.forEach((r, i) => list.appendChild(renderCard(r, i)));
}

init();
