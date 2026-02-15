import { runInBrowser } from "../../src/browser-runtime/browser.js";

const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D context unavailable");

const controls = {
  bodyCount: document.getElementById("bodyCount"),
  gravity: document.getElementById("gravity"),
  dt: document.getElementById("dt"),
  softening: document.getElementById("softening"),
  spawnRadius: document.getElementById("spawnRadius"),
  velocity: document.getElementById("velocity"),
  trail: document.getElementById("trail"),
  zoom: document.getElementById("zoom"),
  autoCamera: document.getElementById("autoCamera"),
};

const outputs = {
  bodyCount: document.getElementById("bodyCountOut"),
  gravity: document.getElementById("gravityOut"),
  dt: document.getElementById("dtOut"),
  softening: document.getElementById("softeningOut"),
  spawnRadius: document.getElementById("spawnRadiusOut"),
  velocity: document.getElementById("velocityOut"),
  trail: document.getElementById("trailOut"),
  zoom: document.getElementById("zoomOut"),
};

const statsEl = document.getElementById("stats");
const btnToggle = document.getElementById("toggle");
const btnReset = document.getElementById("reset");
const btnResetView = document.getElementById("resetView");
const btnViewSource = document.getElementById("viewSource");
const btnCloseSource = document.getElementById("closeSource");
const sourceDialog = document.getElementById("sourceDialog");
const sourceCode = document.getElementById("sourceCode");

const params = {
  bodyCount: Number(controls.bodyCount.value),
  gravity: Number(controls.gravity.value),
  dt: Number(controls.dt.value),
  softening: Number(controls.softening.value),
  spawnRadius: Number(controls.spawnRadius.value),
  velocity: Number(controls.velocity.value),
  trail: Number(controls.trail.value),
};

const centerX = canvas.width * 0.5;
const centerY = canvas.height * 0.5;
const state = {
  bodies: [],
  lastMerged: 0,
};

const camera = {
  x: centerX,
  y: centerY,
  zoom: Number(controls.zoom.value),
  minZoom: 0.2,
  maxZoom: 8,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  startCamX: centerX,
  startCamY: centerY,
};

let autoCamera = controls.autoCamera.checked;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function syncOutput(name) {
  if (name === "autoCamera") return;
  const v = Number(controls[name].value);
  if (name === "zoom") {
    camera.zoom = clamp(v, camera.minZoom, camera.maxZoom);
    outputs.zoom.value = `${camera.zoom.toFixed(2)}x`;
    return;
  }

  params[name] = v;
  outputs[name].value = name === "dt" || name === "trail"
    ? v.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
    : String(v);
}

for (const key of Object.keys(controls)) {
  if (key === "autoCamera") continue;
  controls[key].addEventListener("input", () => syncOutput(key));
  syncOutput(key);
}

controls.autoCamera.addEventListener("change", () => {
  autoCamera = controls.autoCamera.checked;
});

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function bodyRadius(mass) {
  return Math.max(1.7, Math.sqrt(mass) * 0.9);
}

function makeBody(cx, cy, spawnRadius, velocityRange) {
  const a = rand(0, Math.PI * 2);
  const r = Math.sqrt(Math.random()) * spawnRadius;
  const x = cx + Math.cos(a) * r;
  const y = cy + Math.sin(a) * r;
  return {
    x,
    y,
    vx: rand(-velocityRange, velocityRange),
    vy: rand(-velocityRange, velocityRange),
    mass: rand(1.5, 8.5),
    hue: rand(180, 360),
  };
}

function toScreenX(worldX) {
  return (worldX - camera.x) * camera.zoom + canvas.width * 0.5;
}

function toScreenY(worldY) {
  return (worldY - camera.y) * camera.zoom + canvas.height * 0.5;
}

function circle(x, y, r, color) {
  const sx = toScreenX(x);
  const sy = toScreenY(y);
  const sr = Math.max(0.9, r * camera.zoom);

  if (sx + sr < 0 || sy + sr < 0 || sx - sr > canvas.width || sy - sr > canvas.height) {
    return;
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
}

function setStats(fps, bodies, totalMass, merged) {
  statsEl.textContent =
`fps: ${fps.toFixed(1)}
bodies: ${bodies}
total mass: ${totalMass.toFixed(1)}
merged this frame: ${merged}
zoom: ${camera.zoom.toFixed(2)}x`;
}

function syncZoomSlider() {
  controls.zoom.value = String(camera.zoom);
  outputs.zoom.value = `${camera.zoom.toFixed(2)}x`;
}

function resetView() {
  camera.x = centerX;
  camera.y = centerY;
  camera.zoom = 1;
  syncZoomSlider();
}

btnResetView.addEventListener("click", () => resetView());

canvas.addEventListener("pointerdown", (ev) => {
  autoCamera = false;
  controls.autoCamera.checked = false;
  camera.dragging = true;
  camera.dragStartX = ev.clientX;
  camera.dragStartY = ev.clientY;
  camera.startCamX = camera.x;
  camera.startCamY = camera.y;
  canvas.setPointerCapture(ev.pointerId);
});

canvas.addEventListener("pointermove", (ev) => {
  if (!camera.dragging) return;
  const dxPx = ev.clientX - camera.dragStartX;
  const dyPx = ev.clientY - camera.dragStartY;
  camera.x = camera.startCamX - dxPx / camera.zoom;
  camera.y = camera.startCamY - dyPx / camera.zoom;
});

canvas.addEventListener("pointerup", (ev) => {
  if (!camera.dragging) return;
  camera.dragging = false;
  canvas.releasePointerCapture(ev.pointerId);
});

canvas.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  autoCamera = false;
  controls.autoCamera.checked = false;

  const scale = Math.exp(-ev.deltaY * 0.0012);
  const prevZoom = camera.zoom;
  const nextZoom = clamp(prevZoom * scale, camera.minZoom, camera.maxZoom);

  const rect = canvas.getBoundingClientRect();
  const px = ev.clientX - rect.left;
  const py = ev.clientY - rect.top;

  const worldX = camera.x + (px - canvas.width * 0.5) / prevZoom;
  const worldY = camera.y + (py - canvas.height * 0.5) / prevZoom;

  camera.zoom = nextZoom;
  camera.x = worldX - (px - canvas.width * 0.5) / nextZoom;
  camera.y = worldY - (py - canvas.height * 0.5) / nextZoom;

  syncZoomSlider();
}, { passive: false });

function updateAutoCamera() {
  if (!autoCamera || state.bodies.length === 0) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const b of state.bodies) {
    const r = bodyRadius(b.mass) * 1.8;
    minX = Math.min(minX, b.x - r);
    maxX = Math.max(maxX, b.x + r);
    minY = Math.min(minY, b.y - r);
    maxY = Math.max(maxY, b.y + r);
  }

  const targetX = (minX + maxX) * 0.5;
  const targetY = (minY + maxY) * 0.5;
  const spanX = Math.max(10, maxX - minX);
  const spanY = Math.max(10, maxY - minY);

  const zoomX = (canvas.width * 0.88) / spanX;
  const zoomY = (canvas.height * 0.88) / spanY;
  const targetZoom = clamp(Math.min(zoomX, zoomY), camera.minZoom, camera.maxZoom);

  const smooth = 0.08;
  camera.x += (targetX - camera.x) * smooth;
  camera.y += (targetY - camera.y) * smooth;
  camera.zoom += (targetZoom - camera.zoom) * smooth;
  syncZoomSlider();
}

const src = await fetch("./app.mrjs").then((r) => r.text());
sourceCode.textContent = src;

btnViewSource.addEventListener("click", () => {
  sourceDialog.showModal();
});
btnCloseSource.addEventListener("click", () => sourceDialog.close());

const [stepSim, resetSim, getStats] = runInBrowser(src, {
  scope: {
    Math,
    console,
    params,
    centerX,
    centerY,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    ctx,
    makeBody,
    bodyRadius,
    circle,
    setStats,
    str: String,
    state,
  },
});

if (typeof stepSim !== "function" || typeof resetSim !== "function" || typeof getStats !== "function") {
  throw new Error("Makrell app did not return expected API");
}

let running = true;
let frameCount = 0;
let fps = 0;
let fpsT0 = performance.now();

btnToggle.addEventListener("click", () => {
  running = !running;
  btnToggle.textContent = running ? "Pause" : "Resume";
});

btnReset.addEventListener("click", () => {
  resetSim();
});
controls.bodyCount.addEventListener("change", () => resetSim());
controls.spawnRadius.addEventListener("change", () => resetSim());
controls.velocity.addEventListener("change", () => resetSim());

resetSim();
resetView();

function tick(now) {
  if (running) {
    updateAutoCamera();
    stepSim();
    frameCount += 1;
    if (now - fpsT0 >= 500) {
      fps = (frameCount * 1000) / (now - fpsT0);
      frameCount = 0;
      fpsT0 = now;
    }
    const [count, totalMass, merged] = getStats();
    setStats(fps, count, totalMass, merged);
  }
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);


