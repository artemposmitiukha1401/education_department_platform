const SUBJECTS = [
  {
    id: 1,
    name: "Математика",
    img: "math.jpg",
    topics: 4,
    glow: "#4a8fff",
    core: "#1a3a6b",
    href: "./pages/topics_list_template_page.html?id=1",
    cardColor: "#1253AA",
    accentColor: "#4a8fff",
    lightColor: "#d6e8ff",
    icon: "∑",
  },
  {
    id: 2,
    name: "Українська мова",
    img: "ukrainian.jpg",
    topics: 5,
    glow: "#9b5de5",
    core: "#2d1a4a",
    href: "./pages/topics_list_template_page.html?id=2",
    cardColor: "#5B2D8E",
    accentColor: "#9b5de5",
    lightColor: "#ead6ff",
    icon: "А",
  },
  {
    id: 3,
    name: "Історія",
    img: "history.jpg",
    topics: 6,
    glow: "#ff6b6b",
    core: "#4a1a1a",
    href: "./pages/topics_list_template_page.html?id=3",
    cardColor: "#B71C1C",
    accentColor: "#ff6b6b",
    lightColor: "#ffd6d6",
    icon: "⚑",
  },
  {
    id: 5,
    name: "Англійська мова",
    img: "english.jpg",
    topics: 4,
    glow: "#2ec4b6",
    core: "#1a3a3a",
    href: "./pages/topics_list_template_page.html?id=5",
    cardColor: "#00695C",
    accentColor: "#2ec4b6",
    lightColor: "#d6f5f2",
    icon: "En",
  },
];

const starsCanvas = document.getElementById("stars-canvas");
const stx = starsCanvas.getContext("2d");
let stars = [];

const DPR = window.devicePixelRatio || 1;

function initStars() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  starsCanvas.width = w * DPR;
  starsCanvas.height = h * DPR;
  starsCanvas.style.width = w + "px";
  starsCanvas.style.height = h + "px";
  stx.setTransform(DPR, 0, 0, DPR, 0, 0);
  stars = Array.from({ length: 180 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.2 + 0.2,
    a: Math.random(),
    speed: Math.random() * 0.003 + 0.001,
  }));
}

function drawStars(t) {
  stx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
  stars.forEach((s) => {
    s.a = 0.3 + 0.7 * Math.abs(Math.sin(t * s.speed + s.x));
    stx.beginPath();
    stx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    stx.fillStyle = `rgba(255,255,255,${s.a * 0.5})`;
    stx.fill();
  });
}

const canvas = document.getElementById("net");
const ctx = canvas.getContext("2d");

let W, H;
let nodes = [];
let dragging = null;
let mouse = { x: 0, y: 0 };
let hovered = null;

const RADIUS = 80;
const SPRING_LEN = 260;
const SPRING_K = 0.018;
const DAMPING = 0.88;
const REPEL = 18000;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function initNodes() {
  const cx = W / 2;
  const cy = H / 2;
  const angles = [Math.PI * 1.3, Math.PI * 0.3, Math.PI * 0.85, Math.PI * 1.75];
  const dist = 220;
  nodes = SUBJECTS.map((s, i) => ({
    ...s,
    x: cx + Math.cos(angles[i]) * dist,
    y: cy + Math.sin(angles[i]) * dist,
    vx: 0,
    vy: 0,
    pulse: Math.random() * Math.PI * 2,
    imgLoaded: null,
  }));

  nodes.forEach((n) => {
    const img = new Image();
    img.src = `./assets/images/subjects_bg/${n.img}`;
    img.onload = () => (n.imgLoaded = img);
  });
}

function physics() {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const nx = dx / dist;
      const ny = dy / dist;

      const springF = (dist - SPRING_LEN) * SPRING_K;
      a.vx += nx * springF;
      a.vy += ny * springF;
      b.vx -= nx * springF;
      b.vy -= ny * springF;

      const repF = REPEL / (dist * dist);
      a.vx -= nx * repF;
      a.vy -= ny * repF;
      b.vx += nx * repF;
      b.vy += ny * repF;
    }
  }

  nodes.forEach((n) => {
    if (n === dragging) return;
    n.vx += (W / 2 - n.x) * 0.0008;
    n.vy += (H / 2 - n.y) * 0.0008;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;

    const margin = RADIUS + 20;
    if (n.x < margin) {
      n.x = margin;
      n.vx *= -0.5;
    }
    if (n.x > W - margin) {
      n.x = W - margin;
      n.vx *= -0.5;
    }
    if (n.y < margin) {
      n.y = margin;
      n.vy *= -0.5;
    }
    if (n.y > H - margin) {
      n.y = H - margin;
      n.vy *= -0.5;
    }
  });
}

function drawConnections() {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha = Math.max(0, 1 - dist / 520);
      const isHighlighted = a === hovered || b === hovered;

      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(
        0,
        hexAlpha(a.accentColor, isHighlighted ? alpha * 0.65 : alpha * 0.22),
      );
      grad.addColorStop(
        1,
        hexAlpha(b.accentColor, isHighlighted ? alpha * 0.65 : alpha * 0.22),
      );

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = isHighlighted ? 2 : 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.18})`;
      ctx.fill();
    }
  }
}

function drawNode(n, t) {
  const isHov = n === hovered;
  const pulse = Math.sin(t * 0.001 + n.pulse) * 0.5 + 0.5;
  const r = RADIUS + (isHov ? 10 : 0) + pulse * 2;

  ctx.save();

  const glowR = r * 2.2;
  const glow = ctx.createRadialGradient(n.x, n.y, r * 0.3, n.x, n.y, glowR);
  glow.addColorStop(0, hexAlpha(n.accentColor, 0.2 + pulse * 0.08));
  glow.addColorStop(0.5, hexAlpha(n.cardColor, 0.07));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = n.cardColor;
  ctx.fill();

  if (n.imgLoaded) {
    ctx.globalAlpha = 0.1;
    ctx.drawImage(n.imgLoaded, n.x - r, n.y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.moveTo(n.x - r, n.y - r);
  ctx.lineTo(n.x - r + r * 0.85, n.y - r);
  ctx.lineTo(n.x - r, n.y - r + r * 0.85);
  ctx.closePath();
  ctx.fillStyle = hexAlpha(n.accentColor, 0.25);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(n.x + r, n.y + r);
  ctx.lineTo(n.x + r - r * 0.75, n.y + r);
  ctx.lineTo(n.x + r, n.y + r - r * 0.75);
  ctx.closePath();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fill();

  const vignette = ctx.createRadialGradient(n.x, n.y, r * 0.35, n.x, n.y, r);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = vignette;
  ctx.fill();

  ctx.restore();

  ctx.beginPath();
  ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = isHov
    ? n.accentColor
    : hexAlpha(n.accentColor, 0.45 + pulse * 0.2);
  ctx.lineWidth = isHov ? 3 : 1.5;
  ctx.stroke();

  if (isHov) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, r + 8 + pulse * 7, 0, Math.PI * 2);
    ctx.strokeStyle = hexAlpha(n.accentColor, 0.28 - pulse * 0.1);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(n.x, n.y, r + 20 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = hexAlpha(n.accentColor, 0.1);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const badgeX = n.x + r * 0.52;
  const badgeY = n.y - r * 0.54;
  const badgeR = r * 0.24;

  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = hexAlpha(n.accentColor, 0.22);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(n.accentColor, 0.55);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${badgeR * 0.9}px 'Didact Gothic', sans-serif`;
  ctx.fillStyle = n.lightColor;
  ctx.fillText(n.icon, badgeX, badgeY);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const words = n.name.split(" ");
  const fontSize = r * 0.215;
  ctx.font = `600 ${fontSize}px 'Didact Gothic', sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 6;

  if (words.length === 1) {
    ctx.fillText(n.name, n.x, n.y - 6);
  } else {
    const lineH = fontSize * 1.35;
    const totalH = words.length * lineH;
    words.forEach((word, wi) => {
      ctx.fillText(word, n.x, n.y - totalH / 2 + wi * lineH + lineH / 2 - 4);
    });
  }

  const pillY = n.y + r * 0.52;
  const pillText = `${n.topics} ${topicWord(n.topics)}`;
  const pillW = r * 0.72;
  const pillH = r * 0.27;

  ctx.shadowBlur = 0;
  roundRect(ctx, n.x - pillW / 2, pillY - pillH / 2, pillW, pillH, pillH / 2);
  ctx.fillStyle = hexAlpha(n.accentColor, isHov ? 0.55 : 0.28);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(n.accentColor, 0.65);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.font = `400 ${r * 0.13}px 'Didact Gothic', sans-serif`;
  ctx.fillStyle = isHov ? "rgba(255,255,255,0.97)" : n.lightColor;
  ctx.fillText(pillText, n.x, pillY);

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function topicWord(n) {
  if (n === 1) return "тема";
  if (n >= 2 && n <= 4) return "теми";
  return "тем";
}

function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function render(t) {
  requestAnimationFrame(render);
  ctx.clearRect(0, 0, W, H);
  drawStars(t);
  physics();
  drawConnections();
  nodes.forEach((n) => drawNode(n, t));
}

function getNodeAt(x, y) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const dx = x - n.x;
    const dy = y - n.y;
    if (dx * dx + dy * dy < (RADIUS + 12) ** 2) return n;
  }
  return null;
}

let mouseDownPos = { x: 0, y: 0 };

canvas.addEventListener("mousedown", (e) => {
  mouseDownPos = { x: e.clientX, y: e.clientY };
  const n = getNodeAt(e.clientX, e.clientY);
  if (n) {
    dragging = n;
    n.vx = 0;
    n.vy = 0;
    canvas.style.cursor = "grabbing";
  }
});

canvas.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  if (dragging) {
    dragging.x = e.clientX;
    dragging.y = e.clientY;
  }
  const h = getNodeAt(e.clientX, e.clientY);
  if (h !== hovered) {
    hovered = h;
    canvas.style.cursor = h ? "pointer" : "grab";
  }
});
canvas.addEventListener("mouseup", (e) => {
  if (dragging) {
    const n = dragging;
    dragging = null;
    canvas.style.cursor = hovered ? "pointer" : "grab";
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) window.location.href = n.href;
  }
});

let touchNode = null;
let touchStartPos = { x: 0, y: 0 };

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const t = e.touches[0];
    touchStartPos = { x: t.clientX, y: t.clientY };
    touchNode = getNodeAt(t.clientX, t.clientY);
    if (touchNode) {
      dragging = touchNode;
      touchNode.vx = 0;
      touchNode.vy = 0;
    }
  },
  { passive: false },
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    if (dragging) {
      dragging.x = e.touches[0].clientX;
      dragging.y = e.touches[0].clientY;
    }
  },
  { passive: false },
);

canvas.addEventListener("touchend", (e) => {
  if (touchNode) {
    const lastT = e.changedTouches[0];
    const dx = lastT.clientX - touchStartPos.x;
    const dy = lastT.clientY - touchStartPos.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12)
      window.location.href = touchNode.href;
  }
  dragging = null;
  touchNode = null;
});

window.addEventListener("resize", () => {
  resize();
  initNodes();
});

resize();
initStars();
initNodes();
requestAnimationFrame(render);
