const TAU = Math.PI * 2;

const introScreen = document.querySelector("#intro-screen");
const btnEnter = document.querySelector("#btn-enter");
const mainInterface = document.querySelector("#main-interface");

const drawFlow = document.querySelector("#draw-flow-container");
const playFlow = document.querySelector("#play-flow-container");
const skyFlow = document.querySelector("#sky-flow-container");
const stepDraw = document.querySelector("#step-draw-badge");
const stepPlay = document.querySelector("#step-play-badge");
const stepSky = document.querySelector("#step-sky-badge");

const paintCanvas = document.querySelector("#paint-canvas");
const pCtx = paintCanvas.getContext("2d");
const kaleidoCanvas = document.querySelector("#kaleidoscope-canvas");
const kCtx = kaleidoCanvas.getContext("2d");
const universeCanvas = document.querySelector("#universe-canvas");
const uCtx = universeCanvas.getContext("2d");
const postcardCanvas = document.querySelector("#postcard-canvas");

const btnClearCanvas = document.querySelector("#btn-clear-canvas");
const brushSizeInput = document.querySelector("#brush-size");
const canvasHint = document.querySelector("#canvas-hint");
const btnAddElement = document.querySelector("#btn-add-element");
const colorPickers = [...document.querySelectorAll(".color-picker")];
const imageInput = document.querySelector("#image-input");
const promptInput = document.querySelector("#prompt-input");
const btnGeneratePrompt = document.querySelector("#btn-generate-prompt");

const elementsList = document.querySelector("#elements-list");
const emptyElementsHint = document.querySelector("#empty-elements-hint");
const elementsCountBadge = document.querySelector("#elements-count-badge");
const btnFinishDraw = document.querySelector("#btn-finish-draw");
const inlineElementsCount = document.querySelector("#inline-elements-count");
const btnFinishDrawInline = document.querySelector("#btn-finish-draw-inline");

const songSelect = document.querySelector("#song-select");
const songTempoBadge = document.querySelector("#song-tempo-badge");
const btnPlayMusic = document.querySelector("#btn-play-music");
const btnToggleSpin = document.querySelector("#btn-toggle-spin");
const visualizerBars = document.querySelector("#visualizer-bars");
const lyricOverlay = document.querySelector("#lyric-overlay");
const btnBackToDraw = document.querySelector("#btn-back-to-draw");
const btnSpark = document.querySelector("#btn-spark");

const sparkModal = document.querySelector("#spark-modal");
const btnSaveLocal = document.querySelector("#btn-save-local");
const btnUploadSky = document.querySelector("#btn-upload-sky");
const btnCloseModal = document.querySelector("#btn-close-modal");
const inputBlessing = document.querySelector("#input-blessing");
const toastSuccess = document.querySelector("#toast-success");

const starCount = document.querySelector("#star-count");
const starCard = document.querySelector("#star-card");
const btnCardClose = document.querySelector("#btn-card-close");
const btnCardPlay = document.querySelector("#btn-card-play");
const btnBackToEditorFromSky = document.querySelector("#btn-back-to-editor-from-sky");
const cardId = document.querySelector("#card-id");
const cardSong = document.querySelector("#card-song");
const cardBlessing = document.querySelector("#card-blessing");

const songProfiles = {
  shining: {
    title: "Shining Diamond",
    bpm: 128,
    spin: 0.018,
    burst: 0.68,
    segments: 14,
    label: "鑽石閃爍 - 對稱14瓣",
    colors: ["#fff2a8", "#92a8d1", "#f7cac9", "#f8fafc"],
  },
  nice: {
    title: "VERY NICE",
    bpm: 154,
    spin: 0.027,
    burst: 1,
    segments: 18,
    label: "狂歡煙火 - 對稱18瓣",
    colors: ["#f7cac9", "#ff7ab8", "#ffd66b", "#92a8d1"],
  },
  circle: {
    title: "돌고 돌아",
    bpm: 92,
    spin: 0.011,
    burst: 0.45,
    segments: 12,
    label: "溫柔迴旋 - 對稱12瓣",
    colors: ["#b7f7ff", "#d7c2ff", "#f7cac9", "#92a8d1"],
  },
  headliner: {
    title: "Headliner",
    bpm: 138,
    spin: 0.024,
    burst: 0.86,
    segments: 16,
    label: "舞台爆點 - 對稱16瓣",
    colors: ["#ffd66b", "#f7cac9", "#ff8d6b", "#92a8d1"],
  },
};

const palette = ["#f7cac9", "#92a8d1", "#ffffff", "#ffd66b", "#ff8dcb"];

const state = {
  view: "draw",
  drawing: false,
  lastPoint: null,
  brushColor: "#F7CAC9",
  collectedElements: [],
  material: null,
  selectedSong: "shining",
  spinning: true,
  playing: false,
  rotation: 0,
  textureRotation: 0,
  energy: 0.22,
  targetEnergy: 0.22,
  startTime: performance.now(),
  audioUrl: "",
  audioElement: null,
  audioContext: null,
  analyser: null,
  analyserData: null,
  mediaSource: null,
  universeOffsetX: 0,
  universeOffsetY: 0,
  draggingUniverse: false,
  lastUniversePoint: null,
  seed: 17,
};

let starfires = [
  { id: "1711", x: 180, y: 130, song: "Shining Diamond", blessing: "第一束光，永遠會回到舞台。" },
  { id: "1004", x: -160, y: 230, song: "돌고 돌아", blessing: "繞了一圈，我們還是一起發光。" },
  { id: "0526", x: 60, y: -210, song: "Headliner", blessing: "今晚的主角，是一起走到第 11 年的我們。" },
  { id: "1314", x: -290, y: -90, song: "VERY NICE", blessing: "把快樂喊到宇宙最亮的地方。" },
];

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function seededRandom(seed) {
  let value = seed || 1;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function fitCanvas(canvas, ctx, width, height, dprLimit = 2) {
  const dpr = Math.max(1, Math.min(dprLimit, window.devicePixelRatio || 1));
  const nextWidth = Math.max(1, Math.round(width * dpr));
  const nextHeight = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function switchView(view) {
  state.view = view;
  drawFlow.classList.toggle("hidden", view !== "draw");
  playFlow.classList.toggle("hidden", view !== "play");
  skyFlow.classList.toggle("hidden", view !== "sky");
  stepDraw.classList.toggle("active", view === "draw");
  stepPlay.classList.toggle("active", view === "play");
  stepSky.classList.toggle("active", view === "sky");
  if (view === "play") {
    buildMaterialFromElements();
    updateSongParams();
    resizeKaleidoCanvas();
  }
  if (view === "sky") initUniverse();
  if (view === "draw") requestAnimationFrame(resizePaintCanvas);
}

function resizePaintCanvas() {
  const rect = paintCanvas.parentElement.getBoundingClientRect();
  fitCanvas(paintCanvas, pCtx, rect.width, rect.height, 2);
  clearPaintCanvas();
}

function resizeKaleidoCanvas() {
  const rect = kaleidoCanvas.getBoundingClientRect();
  const size = Math.max(280, Math.min(rect.width || 420, rect.height || 420));
  fitCanvas(kaleidoCanvas, kCtx, size, size, 1.6);
}

function resizeUniverseCanvas() {
  const rect = universeCanvas.parentElement.getBoundingClientRect();
  fitCanvas(universeCanvas, uCtx, rect.width, rect.height, 1.6);
}

function clearPaintCanvas() {
  const width = paintCanvas.clientWidth || 360;
  const height = paintCanvas.clientHeight || 300;
  pCtx.clearRect(0, 0, width, height);
  pCtx.fillStyle = "#050512";
  pCtx.fillRect(0, 0, width, height);
  pCtx.strokeStyle = "rgba(146, 168, 209, 0.11)";
  pCtx.lineWidth = 1;
  const cx = width / 2;
  const cy = height / 2;
  for (let r = 44; r < Math.min(width, height) * 0.48; r += 42) {
    pCtx.beginPath();
    pCtx.arc(cx, cy, r, 0, TAU);
    pCtx.stroke();
  }
}

function pointerInCanvas(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function drawStroke(point) {
  if (!state.lastPoint) {
    state.lastPoint = point;
    return;
  }
  pCtx.save();
  pCtx.lineCap = "round";
  pCtx.lineJoin = "round";
  pCtx.lineWidth = Number(brushSizeInput.value);
  if (state.brushColor === "gradient") {
    const grad = pCtx.createLinearGradient(state.lastPoint.x, state.lastPoint.y, point.x, point.y);
    grad.addColorStop(0, "#F7CAC9");
    grad.addColorStop(1, "#92A8D1");
    pCtx.strokeStyle = grad;
    pCtx.shadowColor = "#92A8D1";
  } else {
    pCtx.strokeStyle = state.brushColor;
    pCtx.shadowColor = state.brushColor;
  }
  pCtx.shadowBlur = Number(brushSizeInput.value) * 1.15;
  pCtx.beginPath();
  pCtx.moveTo(state.lastPoint.x, state.lastPoint.y);
  pCtx.lineTo(point.x, point.y);
  pCtx.stroke();
  pCtx.restore();
  state.lastPoint = point;
}

function canvasToElement(sourceCanvas) {
  const element = document.createElement("canvas");
  element.width = 512;
  element.height = 512;
  const ctx = element.getContext("2d");
  ctx.fillStyle = "#050512";
  ctx.fillRect(0, 0, element.width, element.height);
  ctx.drawImage(sourceCanvas, 0, 0, element.width, element.height);
  return element;
}

function addElement(elementCanvas, label = "手繪碎片") {
  state.collectedElements.unshift({ canvas: elementCanvas, label });
  state.collectedElements = state.collectedElements.slice(0, 8);
  buildMaterialFromElements();
  updateElementsList();
}

function updateElementsList() {
  elementsList.innerHTML = "";
  if (state.collectedElements.length === 0) {
    elementsList.append(emptyElementsHint);
    btnFinishDraw.disabled = true;
    btnFinishDraw.className = "disabled-button";
    btnFinishDrawInline.disabled = true;
    btnFinishDrawInline.className = "disabled-button";
  } else {
    btnFinishDraw.disabled = false;
    btnFinishDraw.className = "gradient-button";
    btnFinishDrawInline.disabled = false;
    btnFinishDrawInline.className = "gradient-button";
    state.collectedElements.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "element-item";
      const img = document.createElement("img");
      img.src = item.canvas.toDataURL("image/png");
      img.alt = item.label;
      const info = document.createElement("div");
      info.innerHTML = `<strong>碎片 #${index + 1}</strong><small>${item.label}</small>`;
      const del = document.createElement("button");
      del.className = "delete-element";
      del.type = "button";
      del.textContent = "×";
      del.addEventListener("click", () => {
        state.collectedElements.splice(index, 1);
        buildMaterialFromElements();
        updateElementsList();
      });
      row.append(img, info, del);
      elementsList.append(row);
    });
  }
  elementsCountBadge.textContent = `${state.collectedElements.length} / 8 個碎片`;
  inlineElementsCount.textContent = `${state.collectedElements.length} / 8 個碎片`;
}

function buildMaterialFromElements() {
  const material = document.createElement("canvas");
  material.width = 900;
  material.height = 900;
  const ctx = material.getContext("2d");
  ctx.fillStyle = "#03030c";
  ctx.fillRect(0, 0, material.width, material.height);

  const bg = ctx.createRadialGradient(450, 450, 20, 450, 450, 520);
  bg.addColorStop(0, "rgba(247, 202, 201, 0.18)");
  bg.addColorStop(0.52, "rgba(146, 168, 209, 0.14)");
  bg.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 900);

  const items = state.collectedElements.length ? state.collectedElements : [{ canvas: generateTextCanvas("粉藍煙花、鑽石光") }];
  ctx.globalCompositeOperation = "screen";
  items.forEach((item, index) => {
    const rings = 7;
    for (let i = 0; i < rings; i += 1) {
      const angle = (i / rings) * TAU + index * 0.42;
      const orbit = 110 + index * 48 + (i % 2) * 38;
      const size = 150 - Math.min(index * 8, 46);
      ctx.save();
      ctx.translate(450 + Math.cos(angle) * orbit, 450 + Math.sin(angle) * orbit);
      ctx.rotate(angle + index * 0.7);
      ctx.globalAlpha = 0.72;
      ctx.drawImage(item.canvas, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  });
  ctx.globalCompositeOperation = "source-over";
  state.material = material;
}

function drawStar(ctx, x, y, outer, inner, points, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = rotation + (i * Math.PI) / points;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawFirework(ctx, x, y, radius, colors, rand) {
  const rays = 12 + Math.floor(rand() * 18);
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < rays; i += 1) {
    const angle = (i / rays) * TAU + rand() * 0.1;
    const length = radius * (0.35 + rand() * 0.85);
    ctx.strokeStyle = colors[Math.floor(rand() * colors.length)];
    ctx.lineWidth = 1.2 + rand() * 4;
    ctx.globalAlpha = 0.48 + rand() * 0.46;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * 0.12, Math.sin(angle) * radius * 0.12);
    ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    ctx.stroke();
  }
  ctx.restore();
}

function generateTextCanvas(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const rand = seededRandom(hashText(`${text}|${state.seed}`));
  const colors = text.includes("金")
    ? ["#ffd66b", "#f7cac9", "#ffffff", "#92a8d1"]
    : ["#f7cac9", "#92a8d1", "#ffffff", "#aee6ef"];
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.5, colors[1]);
  gradient.addColorStop(1, "#050512");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 38; i += 1) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 18 + rand() * 88;
    ctx.save();
    ctx.shadowBlur = 18 + rand() * 28;
    ctx.shadowColor = colors[i % colors.length];
    ctx.fillStyle = colors[i % colors.length];
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1 + rand() * 3;
    if (i % 3 === 0 || text.includes("煙花")) {
      drawFirework(ctx, x, y, r, colors, rand);
    } else if (i % 3 === 1 || text.includes("星")) {
      drawStar(ctx, x, y, r, r * 0.42, 5 + Math.floor(rand() * 3), rand() * TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.48, r, rand() * TAU, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

function readImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const element = document.createElement("canvas");
      element.width = 512;
      element.height = 512;
      const ctx = element.getContext("2d");
      const scale = Math.max(element.width / img.width, element.height / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      ctx.fillStyle = "#050512";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, (512 - width) / 2, (512 - height) / 2, width, height);
      addElement(element, "上傳圖片");
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function currentSong() {
  return songProfiles[state.selectedSong];
}

function updateSongParams() {
  state.selectedSong = songSelect.value;
  const song = currentSong();
  songTempoBadge.textContent = song.label;
  const selectedOption = songSelect.options[songSelect.selectedIndex];
  lyricOverlay.innerHTML = `<span>${selectedOption.dataset.lyrics}</span>`;
  lyricOverlay.classList.add("visible");
}

function presetEnergy(time) {
  const song = currentSong();
  const beat = (time / 1000 / 60) * song.bpm;
  const main = Math.pow(Math.max(0, Math.sin(beat * TAU)), 2.7);
  const offBeat = Math.pow(Math.max(0, Math.sin((beat * 2 + 0.35) * TAU)), 4);
  const swell = 0.5 + Math.sin(time * 0.00046) * 0.5;
  return 0.16 + main * 0.58 * song.burst + offBeat * 0.18 + swell * 0.08;
}

function analyserEnergy() {
  if (!state.analyser || !state.analyserData) return null;
  state.analyser.getByteFrequencyData(state.analyserData);
  let sum = 0;
  for (let i = 0; i < state.analyserData.length; i += 1) sum += state.analyserData[i];
  return Math.min(1, sum / state.analyserData.length / 150);
}

function makePattern(ctx) {
  if (!state.material) buildMaterialFromElements();
  const tile = 235 * (0.82 + state.energy * 0.75);
  const pattern = ctx.createPattern(state.material, "repeat");
  if (pattern && pattern.setTransform) {
    const shift = Math.sin(state.textureRotation * 1.8) * tile * 0.22;
    pattern.setTransform(
      new DOMMatrix()
        .translateSelf(-tile / 2 + shift, -tile / 2 - shift)
        .rotateSelf((state.textureRotation * 180) / Math.PI)
        .scaleSelf(tile / state.material.width, tile / state.material.height),
    );
  }
  return pattern;
}

function renderKaleidoscope(time) {
  if (state.view !== "play" && !sparkModal.classList.contains("hidden")) return;
  const width = kaleidoCanvas.clientWidth || 400;
  const height = kaleidoCanvas.clientHeight || 400;
  const song = currentSong();
  const live = state.playing ? analyserEnergy() : null;
  state.targetEnergy = state.playing ? live ?? presetEnergy(time - state.startTime) : 0.22;
  state.energy += (state.targetEnergy - state.energy) * 0.15;

  if (state.spinning) {
    const drive = state.playing ? 0.65 + state.energy * 1.9 : 0.38;
    state.rotation += song.spin * drive;
    state.textureRotation -= song.spin * 0.34 * drive;
  }

  kCtx.clearRect(0, 0, width, height);
  kCtx.fillStyle = "#03030c";
  kCtx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * (0.5 + state.energy * 0.12);
  const segments = song.segments + Math.round(state.energy * 6);
  const angle = TAU / segments;
  const pattern = makePattern(kCtx);

  kCtx.save();
  kCtx.translate(cx, cy);
  kCtx.rotate(state.rotation);
  kCtx.filter = `saturate(${130 + state.energy * 120}%) contrast(${112 + state.energy * 28}%)`;
  for (let i = 0; i < segments; i += 1) {
    kCtx.save();
    kCtx.rotate(i * angle);
    if (i % 2 === 1) kCtx.scale(1, -1);
    kCtx.beginPath();
    kCtx.moveTo(0, 0);
    kCtx.arc(0, 0, radius, -angle / 2, angle / 2);
    kCtx.closePath();
    kCtx.clip();
    kCtx.fillStyle = pattern;
    kCtx.fillRect(-radius, -radius, radius * 2, radius * 2);
    kCtx.restore();
  }
  kCtx.restore();

  kCtx.save();
  kCtx.globalCompositeOperation = "screen";
  const burstCount = 8 + Math.floor(state.energy * 16);
  for (let i = 0; i < burstCount; i += 1) {
    const phase = time * 0.00035 + i * 1.45;
    const distance = radius * (0.18 + ((Math.sin(phase) + 1) / 2) * 0.48);
    const x = cx + Math.cos(phase * 2.1) * distance;
    const y = cy + Math.sin(phase * 1.8) * distance;
    const glow = kCtx.createRadialGradient(x, y, 0, x, y, 28 + state.energy * 80);
    glow.addColorStop(0, `${song.colors[i % song.colors.length]}cc`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    kCtx.fillStyle = glow;
    kCtx.beginPath();
    kCtx.arc(x, y, 34 + state.energy * 78, 0, TAU);
    kCtx.fill();
  }
  kCtx.restore();

  const vignette = kCtx.createRadialGradient(cx, cy, radius * 0.18, cx, cy, radius * 0.95);
  vignette.addColorStop(0, "rgba(255,255,255,0.04)");
  vignette.addColorStop(0.72, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.68)");
  kCtx.fillStyle = vignette;
  kCtx.fillRect(0, 0, width, height);
}

function updateVisualizer(time) {
  const song = currentSong();
  const beat = (time / 1000 / 60) * song.bpm;
  [...visualizerBars.children].forEach((bar, index) => {
    const value = state.playing
      ? 14 + Math.abs(Math.sin(beat * TAU + index * 0.72)) * (36 + state.energy * 58)
      : 8 + Math.sin(time * 0.001 + index) * 4;
    bar.style.height = `${Math.max(6, Math.min(100, value))}%`;
  });
}

async function prepareAudioPlayback() {
  if (!state.audioUrl) return;
  if (!state.audioElement) {
    state.audioElement = new Audio(state.audioUrl);
    state.audioElement.loop = true;
    state.audioElement.crossOrigin = "anonymous";
  }
  if (!state.audioContext) {
    state.audioContext = new AudioContext();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 128;
    state.analyserData = new Uint8Array(state.analyser.frequencyBinCount);
    state.mediaSource = state.audioContext.createMediaElementSource(state.audioElement);
    state.mediaSource.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);
  }
  if (state.audioContext.state === "suspended") await state.audioContext.resume();
}

async function toggleMusic() {
  state.playing = !state.playing;
  if (state.playing) {
    state.startTime = performance.now();
    await prepareAudioPlayback();
    if (state.audioElement) await state.audioElement.play();
    btnPlayMusic.textContent = state.audioElement ? "暫停歌曲律動" : "暫停模擬律動";
  } else {
    state.audioElement?.pause();
    btnPlayMusic.textContent = "播放歌曲律動";
  }
}

function openSparkModal() {
  sparkModal.classList.remove("hidden");
  const ctx = postcardCanvas.getContext("2d");
  postcardCanvas.width = 320;
  postcardCanvas.height = 320;
  ctx.clearRect(0, 0, 320, 320);
  ctx.save();
  ctx.beginPath();
  ctx.arc(160, 160, 160, 0, TAU);
  ctx.clip();
  ctx.drawImage(kaleidoCanvas, 0, 0, 320, 320);
  ctx.restore();
}

function saveLocalPostcard() {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 720;
  exportCanvas.height = 960;
  const ctx = exportCanvas.getContext("2d");
  ctx.fillStyle = "#03030c";
  ctx.fillRect(0, 0, 720, 960);
  const glow = ctx.createRadialGradient(360, 340, 20, 360, 340, 350);
  glow.addColorStop(0, "rgba(247,202,201,0.28)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 720, 960);
  ctx.save();
  ctx.beginPath();
  ctx.arc(360, 360, 260, 0, TAU);
  ctx.clip();
  ctx.drawImage(kaleidoCanvas, 100, 100, 520, 520);
  ctx.restore();
  ctx.strokeStyle = "#92A8D1";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(360, 360, 264, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("TEAM SVT 11th Anniversary", 360, 700);
  ctx.fillStyle = "#F7CAC9";
  ctx.font = "20px sans-serif";
  ctx.fillText(`Song: ${currentSong().title}`, 360, 746);
  ctx.fillStyle = "#92A8D1";
  ctx.font = "18px sans-serif";
  ctx.fillText("旋律已烙印，花火不熄滅", 360, 790);
  const link = document.createElement("a");
  link.download = `TEAM_SVT_11th_Fireworks_${Date.now()}.png`;
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

function uploadToSky() {
  const blessing = inputBlessing.value.trim() || "慶祝一起的 11 週年，花火永不熄滅！";
  const angle = Math.random() * TAU;
  const distance = 100 + Math.random() * 250;
  starfires.push({
    id: Math.floor(Math.random() * 9000 + 1000).toString(),
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    song: currentSong().title,
    blessing,
    elementsData: state.collectedElements.map((item) => item.canvas.toDataURL("image/png")),
  });
  starCount.textContent = `${starfires.length + 1314} 發`;
  sparkModal.classList.add("hidden");
  toastSuccess.classList.add("visible");
  setTimeout(() => toastSuccess.classList.remove("visible"), 3600);
  setTimeout(() => switchView("sky"), 400);
}

function initUniverse() {
  resizeUniverseCanvas();
  state.universeOffsetX = universeCanvas.clientWidth / 2;
  state.universeOffsetY = universeCanvas.clientHeight / 2;
}

function drawUniverse(time) {
  if (state.view !== "sky") return;
  const width = universeCanvas.clientWidth || 400;
  const height = universeCanvas.clientHeight || 420;
  uCtx.fillStyle = "#020208";
  uCtx.fillRect(0, 0, width, height);
  uCtx.save();
  uCtx.translate(state.universeOffsetX, state.universeOffsetY);
  const nebula = uCtx.createRadialGradient(0, 0, 10, 0, 0, 420);
  nebula.addColorStop(0, "rgba(146,168,209,0.18)");
  nebula.addColorStop(0.55, "rgba(247,202,201,0.08)");
  nebula.addColorStop(1, "rgba(0,0,0,0)");
  uCtx.fillStyle = nebula;
  uCtx.beginPath();
  uCtx.arc(0, 0, 430, 0, TAU);
  uCtx.fill();
  starfires.forEach((star, index) => {
    for (let j = index + 1; j < starfires.length; j += 1) {
      const other = starfires[j];
      const dist = Math.hypot(star.x - other.x, star.y - other.y);
      if (dist < 190) {
        uCtx.strokeStyle = "rgba(255,255,255,0.035)";
        uCtx.beginPath();
        uCtx.moveTo(star.x, star.y);
        uCtx.lineTo(other.x, other.y);
        uCtx.stroke();
      }
    }
  });
  starfires.forEach((star, index) => {
    const pulse = 1 + Math.sin(time * 0.003 + index) * 0.18;
    const size = 9 * pulse;
    const grad = uCtx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size * 3);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(0.35, "#F7CAC9");
    grad.addColorStop(0.7, "#92A8D1");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    uCtx.fillStyle = grad;
    uCtx.beginPath();
    uCtx.arc(star.x, star.y, size * 3, 0, TAU);
    uCtx.fill();
  });
  uCtx.restore();
}

function starAtPoint(event) {
  const point = pointerInCanvas(event, universeCanvas);
  const worldX = point.x - state.universeOffsetX;
  const worldY = point.y - state.universeOffsetY;
  return starfires.find((star) => Math.hypot(star.x - worldX, star.y - worldY) < 28);
}

function showStarCard(star, event) {
  const point = pointerInCanvas(event, universeCanvas);
  cardId.textContent = star.id;
  cardSong.textContent = star.song;
  cardBlessing.textContent = star.blessing;
  starCard.style.left = `${Math.min(point.x, universeCanvas.clientWidth - 300)}px`;
  starCard.style.top = `${Math.min(point.y, universeCanvas.clientHeight - 190)}px`;
  starCard.classList.remove("hidden");
  btnCardPlay.onclick = () => {
    if (star.elementsData?.length) {
      state.collectedElements = [];
      let loaded = 0;
      star.elementsData.forEach((data) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 512;
          canvas.getContext("2d").drawImage(img, 0, 0, 512, 512);
          state.collectedElements.push({ canvas, label: "星空碎片" });
          loaded += 1;
          if (loaded === star.elementsData.length) {
            updateElementsList();
            switchView("play");
          }
        };
        img.src = data;
      });
    } else {
      switchView("play");
    }
  };
}

function animationLoop(time) {
  if (state.view === "play") {
    renderKaleidoscope(time);
    updateVisualizer(time);
  }
  if (state.view === "sky") drawUniverse(time);
  requestAnimationFrame(animationLoop);
}

btnEnter.addEventListener("click", () => {
  introScreen.classList.add("fading");
  setTimeout(() => {
    introScreen.classList.add("hidden");
    mainInterface.classList.remove("hidden");
    requestAnimationFrame(() => {
      mainInterface.classList.add("visible");
      resizePaintCanvas();
    });
  }, 800);
});

paintCanvas.addEventListener("pointerdown", (event) => {
  paintCanvas.setPointerCapture(event.pointerId);
  state.drawing = true;
  state.lastPoint = pointerInCanvas(event, paintCanvas);
  canvasHint.classList.add("fade");
});

paintCanvas.addEventListener("pointermove", (event) => {
  if (!state.drawing) return;
  drawStroke(pointerInCanvas(event, paintCanvas));
});

paintCanvas.addEventListener("pointerup", () => {
  state.drawing = false;
  state.lastPoint = null;
});

paintCanvas.addEventListener("pointercancel", () => {
  state.drawing = false;
  state.lastPoint = null;
});

colorPickers.forEach((picker) => {
  picker.addEventListener("click", () => {
    colorPickers.forEach((item) => item.classList.remove("active"));
    picker.classList.add("active");
    state.brushColor = picker.dataset.color;
  });
});

btnClearCanvas.addEventListener("click", () => {
  clearPaintCanvas();
  canvasHint.classList.remove("fade");
});

btnAddElement.addEventListener("click", () => {
  addElement(canvasToElement(paintCanvas), "手繪碎片");
  clearPaintCanvas();
  canvasHint.classList.remove("fade");
});

btnGeneratePrompt.addEventListener("click", () => {
  state.seed += 1;
  addElement(generateTextCanvas(promptInput.value || "粉藍煙花、鑽石光"), "文字生成");
});

imageInput.addEventListener("change", (event) => readImageFile(event.target.files[0]));
btnFinishDraw.addEventListener("click", () => switchView("play"));
btnFinishDrawInline.addEventListener("click", () => switchView("play"));
btnBackToDraw.addEventListener("click", () => switchView("draw"));
btnBackToEditorFromSky.addEventListener("click", () => switchView("draw"));
songSelect.addEventListener("change", updateSongParams);
btnPlayMusic.addEventListener("click", () => toggleMusic().catch(() => (state.playing = false)));
btnToggleSpin.addEventListener("click", () => {
  state.spinning = !state.spinning;
  btnToggleSpin.textContent = state.spinning ? "旋轉：開" : "旋轉：停";
});

btnSpark.addEventListener("click", openSparkModal);
btnCloseModal.addEventListener("click", () => sparkModal.classList.add("hidden"));
btnSaveLocal.addEventListener("click", saveLocalPostcard);
btnUploadSky.addEventListener("click", uploadToSky);
btnCardClose.addEventListener("click", () => starCard.classList.add("hidden"));

universeCanvas.addEventListener("pointerdown", (event) => {
  universeCanvas.setPointerCapture(event.pointerId);
  const star = starAtPoint(event);
  if (star) {
    showStarCard(star, event);
    return;
  }
  starCard.classList.add("hidden");
  state.draggingUniverse = true;
  state.lastUniversePoint = { x: event.clientX, y: event.clientY };
});

universeCanvas.addEventListener("pointermove", (event) => {
  if (!state.draggingUniverse || !state.lastUniversePoint) return;
  state.universeOffsetX += event.clientX - state.lastUniversePoint.x;
  state.universeOffsetY += event.clientY - state.lastUniversePoint.y;
  state.lastUniversePoint = { x: event.clientX, y: event.clientY };
});

universeCanvas.addEventListener("pointerup", () => {
  state.draggingUniverse = false;
  state.lastUniversePoint = null;
});

window.addEventListener("resize", () => {
  if (state.view === "draw") resizePaintCanvas();
  if (state.view === "play") resizeKaleidoCanvas();
  if (state.view === "sky") resizeUniverseCanvas();
});

for (let i = 0; i < 12; i += 1) {
  const bar = document.createElement("span");
  visualizerBars.append(bar);
}

updateSongParams();
addElement(generateTextCanvas("粉藍煙花、鑽石光、舞台亮片"), "初始煙花");
updateElementsList();
requestAnimationFrame(animationLoop);
