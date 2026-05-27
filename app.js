var UNIVERSE_HTML = "\n<!DOCTYPE html>\n<html lang=\"zh-Hant\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>共創星空 - THE SAME SKY</title>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body class=\"universe-page\">\n  <div class=\"stars\" aria-hidden=\"true\"></div>\n\n  <div class=\"app\">\n    <main>\n      <section class=\"panel sky-panel\" aria-label=\"共創宇宙\">\n        <div class=\"sky-head\">\n          <div class=\"stat-row\">\n            <span class=\"label\">當前凝聚花火：</span>\n            <span id=\"star-count\" class=\"count\">7 發</span>\n          </div>\n        </div>\n\n        <div class=\"universe-shell\">\n          <canvas id=\"universe-canvas\"></canvas>\n\n          <div id=\"star-card\" class=\"star-card hidden\">\n            <div class=\"star-card-head\">\n              <div>\n                <h2><span id=\"card-title-prefix\">克拉星火</span> #<span id=\"card-id\">0017</span></h2>\n                <small>選曲：<span id=\"card-song\">shining diamond</span></small>\n                <p>「<span id=\"card-blessing\">慶祝一起的 11 週年！</span>」</p>\n              </div>\n              <button id=\"btn-card-close\" class=\"close\" type=\"button\" aria-label=\"關閉\">×</button>\n            </div>\n            <button id=\"btn-card-play\" class=\"btn primary\" type=\"button\">感受這發煙火</button>\n          </div>\n\n          <div id=\"firework-film\" class=\"firework-film\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"firework-film-title\">\n            <div class=\"firework-film-panel\">\n              <button id=\"btn-film-close\" class=\"close\" type=\"button\" aria-label=\"關閉\">×</button>\n              <div>\n                <h2 id=\"firework-film-title\" class=\"firework-film-title\">克拉星火</h2>\n                <p id=\"firework-film-caption\" class=\"firework-film-caption\">正在播放這位克拉留下的萬花筒影片。</p>\n              </div>\n              <div class=\"firework-film-stage\">\n                <canvas id=\"firework-film-canvas\" aria-label=\"克拉星火萬花筒影片\"></canvas>\n              </div>\n            </div>\n          </div>\n\n          <div class=\"help-chip\">拖曳可探索星空</div>\n          <div id=\"status-chip\" class=\"status-chip\">點擊任何一個發光點，讀取那位克拉留下的煙火。</div>\n        </div>\n\n        <div class=\"panel-actions\">\n          <button id=\"btn-find-mine\" class=\"btn subtle\" type=\"button\">尋找我的花火</button>\n          <button id=\"btn-add-demo\" class=\"btn primary\" type=\"button\">再點燃一束花火</button>\n        </div>\n      </section>\n    </main>\n  </div>\n\n  <div class=\"site-credit\" aria-label=\"作品署名\">\n    © 2026 SVT 11th Anniversary.<br>\n    Created by WithIN.YU with CARATs\n  </div>\n\n  <script src=\"app.js\" defer></script>\n</body>\n</html>\n\n    ";

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyC_zCuQkAvamflzvictP-oKJiysKtUi47A",
  authDomain: "svt11th-fireworks.firebaseapp.com",
  projectId: "svt11th-fireworks",
  storageBucket: "svt11th-fireworks.firebasestorage.app",
  messagingSenderId: "807847798837",
  appId: "1:807847798837:web:e72541585cdc6d04e7297c",
  measurementId: "G-85XJW30ESE",
  collection: "fireworks",
};

function isFirebaseConfigured() {
  return Boolean(
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.projectId &&
    !FIREBASE_CONFIG.apiKey.startsWith("YOUR_") &&
    !FIREBASE_CONFIG.projectId.startsWith("YOUR_")
  );
}

function firestoreCollectionUrl() {
  const projectId = encodeURIComponent(FIREBASE_CONFIG.projectId);
  const collection = encodeURIComponent(FIREBASE_CONFIG.collection);
  const apiKey = encodeURIComponent(FIREBASE_CONFIG.apiKey);
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?key=${apiKey}`;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value)
            .filter(([, item]) => item !== undefined)
            .map(([key, item]) => [key, toFirestoreValue(item)])
        ),
      },
    };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value) {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, fromFirestoreValue(item)])
    );
  }
  return null;
}

function fromFirestoreDocument(document) {
  const data = Object.fromEntries(
    Object.entries(document.fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)])
  );
  return { cloudId: document.name?.split("/").pop(), ...data };
}

function sanitizeCloudFirework(firework) {
  const { audio, _filmFragments, ...safeFirework } = firework;
  return safeFirework;
}

const FireworkData = {
  async save(firework) {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase config is not set.");
    }
    const response = await fetch(firestoreCollectionUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(sanitizeCloudFirework(firework)).map(([key, value]) => [key, toFirestoreValue(value)])
        ),
      }),
    });
    if (!response.ok) {
      throw new Error(`Firestore upload failed: ${response.status}`);
    }
    return fromFirestoreDocument(await response.json());
  },
  async list() {
    if (!isFirebaseConfigured()) return [];
    const response = await fetch(`${firestoreCollectionUrl()}&pageSize=100`);
    if (!response.ok) {
      throw new Error(`Firestore list failed: ${response.status}`);
    }
    const data = await response.json();
    return (data.documents || [])
      .map(fromFirestoreDocument)
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  },
};

(() => {
  if (document.getElementById("universe-canvas")) {

    const universeCanvas = document.getElementById("universe-canvas");
    const uCtx = universeCanvas.getContext("2d");
    const starCountSpan = document.getElementById("star-count");
    const starCard = document.getElementById("star-card");
    const btnCardClose = document.getElementById("btn-card-close");
    const btnCardPlay = document.getElementById("btn-card-play");
    const btnFindMine = document.getElementById("btn-find-mine");
    const btnAddDemo = document.getElementById("btn-add-demo");
    const filmModal = document.getElementById("firework-film");
    const filmCanvas = document.getElementById("firework-film-canvas");
    const filmCtx = filmCanvas.getContext("2d");
    const filmTitle = document.getElementById("firework-film-title");
    const filmCaption = document.getElementById("firework-film-caption");
    const btnFilmClose = document.getElementById("btn-film-close");
    const statusChip = document.getElementById("status-chip");

    let loadedStarfires = [
      { id: "1711", x: 200, y: 150, song: "shining diamond", blessing: "我們的青春，永遠與十七同頻！", color: "#f7b7cf" },
      { id: "1004", x: -150, y: 250, song: "돌고 돌아", blessing: "謝謝你們成為我們溫柔的後盾。", color: "#9bbcff" },
      { id: "0526", x: 50, y: -200, song: "VERY NICE", blessing: "SEVENTEEN 11週年快樂！", color: "#ffd3e2" },
      { id: "1314", x: -300, y: -100, song: "Headliner", blessing: "一起創造璀璨的風景！", color: "#baf3ff" },
      { id: "0615", x: 330, y: -260, song: "shining diamond", blessing: "願每一個舞台都被粉藍光海接住。", color: "#f7b7cf" },
      { id: "0223", x: -420, y: 210, song: "돌고 돌아", blessing: "繞了一圈，我們還是在同一片天空下。", color: "#9bbcff" },
      { id: "1117", x: 420, y: 80, song: "VERY NICE", blessing: "今天也用最大聲的笑容慶祝你們。", color: "#ffe566" }
    ];

    let universeScale = 1;
    let universeOffsetX = 0;
    let universeOffsetY = 0;
    let isDraggingUniverse = false;
    let lastDragX = 0;
    let lastDragY = 0;
    let hoverStar = null;
    let activeStar = null;
    let filmStar = null;
    let filmFrame = 0;
    let filmStartedAt = 0;
    let filmAudio = null;
    let filmSmoothedBeat = 0;
    const previewImageCache = new Map();

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

    function getPreviewImage(source) {
      if (!source) return null;
      if (previewImageCache.has(source)) return previewImageCache.get(source);
      const image = new Image();
      image.decoding = "async";
      image.src = source;
      previewImageCache.set(source, image);
      return image;
    }

    function pixelRatio() {
      return Math.min(window.devicePixelRatio || 1, 2);
    }

    function sizeCanvasToParent(canvas) {
      const rect = canvas.parentElement.getBoundingClientRect();
      const ratio = pixelRatio();
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { width: rect.width, height: rect.height };
    }

    function sizeFilmCanvas() {
      const rect = filmCanvas.parentElement.getBoundingClientRect();
      const ratio = pixelRatio();
      filmCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
      filmCanvas.height = Math.max(1, Math.floor(rect.height * ratio));
      filmCanvas.style.width = `${rect.width}px`;
      filmCanvas.style.height = `${rect.height}px`;
      filmCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { width: rect.width, height: rect.height };
    }

    function updateStarCount() {
      starCountSpan.textContent = `${loadedStarfires.length} 發`;
    }

    function bootData() {
      return window.__TEAM_SVT_BOOT__ || {};
    }

    function readSessionFireworks() {
      const archive = [];
      const bootFirework = bootData().latestFirework;
      if (bootFirework) archive.push(bootFirework);
      try {
        const latest = JSON.parse(sessionStorage.getItem("teamSvtLatestFirework") || "null");
        if (latest && !archive.some((item) => item.id === latest.id || item.number === latest.number)) {
          archive.push(latest);
        }
      } catch (error) {
        // Ignore temporary session data that cannot be parsed.
      }
      return archive.filter(Boolean);
    }

    function makeMyFireworkStar(saved, index) {
      const id = String(saved.number || saved.id || 1315 + index).replace(/^#/, "");
      const seed = saved.seed || hashText(`${id}-${saved.song || ""}-${saved.message || ""}`);
      const angle = (seed % 6283) / 1000;
      const distance = 76 + (seed % 290);
      return {
        id,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        color: saved.color || "#f7b7cf",
        name: `我的花火 #${id}`,
        song: saved.song || "SEVENTEEN",
        audio: saved.audio || bootData().audioBySongId?.[saved.songId] || "",
        bpm: saved.bpm || 96,
        bounce: saved.bounce || 1,
        fragments: Array.isArray(saved.fragments) ? saved.fragments : [],
        blessing: saved.message || "這是我留下的克拉花火。",
        previewImage: saved.previewImage || "",
        seed,
        isMine: true,
      };
    }

    function addFireworksToUniverse(fireworks, source = "cloud") {
      const stars = fireworks.map((firework, index) => makeMyFireworkStar(firework, index));
      stars.forEach((star) => {
        const starWithOwnership = { ...star, isMine: source === "session" };
        const existingIndex = loadedStarfires.findIndex((item) => item.id === star.id);
        if (existingIndex >= 0) loadedStarfires[existingIndex] = { ...loadedStarfires[existingIndex], ...starWithOwnership };
        else loadedStarfires.push(starWithOwnership);
      });
      updateStarCount();
      return stars;
    }

    function loadSessionFireworks() {
      const savedFireworks = readSessionFireworks();
      loadedStarfires = loadedStarfires.filter((star) => !star.isMine);
      const myFireworks = savedFireworks.map(makeMyFireworkStar);
      loadedStarfires.push(...myFireworks);
      updateStarCount();
      return myFireworks;
    }

    async function loadCloudFireworks() {
      statusChip.textContent = "正在讀取克拉宇宙星空...";
      try {
        const cloudFireworks = await FireworkData.list();
        addFireworksToUniverse(cloudFireworks, "cloud");
        statusChip.textContent = "點擊任何一個發光點，讀取那位克拉留下的煙火。";
      } catch (error) {
        statusChip.textContent = "暫時無法讀取雲端花火，先顯示本機暫存星火。";
      }
    }

    function centerUniverse() {
      sizeCanvasToParent(universeCanvas);
      const rect = universeCanvas.getBoundingClientRect();
      universeOffsetX = rect.width / 2;
      universeOffsetY = rect.height / 2;
      universeScale = 1;
      hideStarCard();
      statusChip.textContent = "點擊任何一個發光點，讀取那位克拉留下的煙火。";
    }

    function focusMyFirework() {
      const myFireworks = loadSessionFireworks();
      const myFirework = myFireworks[myFireworks.length - 1];
      if (!myFirework) {
        statusChip.textContent = "目前還沒有找到你的花火。先回到製作碎片，綻放後就能在這裡尋回。";
        return;
      }

      const rect = universeCanvas.getBoundingClientRect();
      universeScale = 1.18;
      universeOffsetX = rect.width / 2 - myFirework.x * universeScale;
      universeOffsetY = rect.height / 2 - myFirework.y * universeScale;
      statusChip.textContent = `已找到你的花火 #${myFirework.id}。這一束光會一直留在共創星空裡。`;
      showStarCard(myFirework, rect.width / 2, rect.height / 2);
    }

    function drawUniverse() {
      const rect = universeCanvas.getBoundingClientRect();
      const time = Date.now();

      uCtx.save();
      uCtx.setTransform(pixelRatio(), 0, 0, pixelRatio(), 0, 0);
      uCtx.fillStyle = "#030916";
      uCtx.fillRect(0, 0, rect.width, rect.height);

      for (let i = 0; i < 120; i += 1) {
        const x = (i * 97 + time * 0.004) % (rect.width + 80) - 40;
        const y = (i * 53 + time * 0.002) % (rect.height + 80) - 40;
        const alpha = 0.12 + ((i * 13) % 30) / 120;
        uCtx.fillStyle = i % 2 ? `rgba(247,183,207,${alpha})` : `rgba(155,188,255,${alpha})`;
        uCtx.beginPath();
        uCtx.arc(x, y, 1 + (i % 3) * 0.55, 0, Math.PI * 2);
        uCtx.fill();
      }

      uCtx.translate(universeOffsetX, universeOffsetY);
      uCtx.scale(universeScale, universeScale);

      const nebula = uCtx.createRadialGradient(0, 0, 10, 0, 0, 520);
      nebula.addColorStop(0, "rgba(155, 188, 255, 0.16)");
      nebula.addColorStop(0.55, "rgba(247, 183, 207, 0.08)");
      nebula.addColorStop(1, "rgba(0,0,0,0)");
      uCtx.fillStyle = nebula;
      uCtx.beginPath();
      uCtx.arc(0, 0, 520, 0, Math.PI * 2);
      uCtx.fill();

      uCtx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      uCtx.lineWidth = 1;
      uCtx.beginPath();
      for (let i = 0; i < loadedStarfires.length; i += 1) {
        for (let j = i + 1; j < loadedStarfires.length; j += 1) {
          const a = loadedStarfires[i];
          const b = loadedStarfires[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 230) {
            uCtx.moveTo(a.x, a.y);
            uCtx.lineTo(b.x, b.y);
          }
        }
      }
      uCtx.stroke();

      loadedStarfires.forEach((star) => {
        const isHovered = hoverStar && hoverStar.id === star.id;
        const isActive = activeStar && activeStar.id === star.id;
        const size = isActive ? 15 : isHovered ? 12 : 7;
        const pulse = 1.5 + Math.sin(time / 320 + star.x * 0.01) * 0.15;

        uCtx.save();
        uCtx.translate(star.x, star.y);
        uCtx.globalCompositeOperation = "screen";

        const starGrad = uCtx.createRadialGradient(0, 0, 1, 0, 0, size * 3.2);
        starGrad.addColorStop(0, "#ffffff");
        starGrad.addColorStop(0.26, star.color || "#f7b7cf");
        starGrad.addColorStop(0.72, "#9bbcff");
        starGrad.addColorStop(1, "rgba(0,0,0,0)");
        uCtx.fillStyle = starGrad;
        uCtx.beginPath();
        uCtx.arc(0, 0, size * 3.2, 0, Math.PI * 2);
        uCtx.fill();

        for (let ray = 0; ray < 14; ray += 1) {
          const angle = ray * Math.PI * 2 / 14 + time * 0.0004;
          const length = size * (2.1 + (ray % 3) * 0.36);
          const rayGrad = uCtx.createLinearGradient(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
          rayGrad.addColorStop(0, `${star.color || "#f7b7cf"}99`);
          rayGrad.addColorStop(1, "rgba(255,255,255,0)");
          uCtx.strokeStyle = rayGrad;
          uCtx.lineWidth = ray % 4 === 0 ? 2.4 : 1.1;
          uCtx.beginPath();
          uCtx.moveTo(Math.cos(angle) * size * 0.9, Math.sin(angle) * size * 0.9);
          uCtx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
          uCtx.stroke();
        }

        uCtx.strokeStyle = "rgba(155, 188, 255, 0.42)";
        uCtx.beginPath();
        uCtx.arc(0, 0, size * pulse, 0, Math.PI * 2);
        uCtx.stroke();
        uCtx.restore();
      });

      uCtx.restore();
      requestAnimationFrame(drawUniverse);
    }

    function getUniverseWorldPoint(event) {
      const rect = universeCanvas.getBoundingClientRect();
      const source = event.touches ? event.touches[0] : event;
      const x = source.clientX - rect.left;
      const y = source.clientY - rect.top;
      return {
        screenX: x,
        screenY: y,
        worldX: (x - universeOffsetX) / universeScale,
        worldY: (y - universeOffsetY) / universeScale
      };
    }

    function detectHoverStar(event) {
      const point = getUniverseWorldPoint(event);
      hoverStar = null;
      for (const star of loadedStarfires) {
        if (Math.hypot(star.x - point.worldX, star.y - point.worldY) < 20) {
          hoverStar = star;
          break;
        }
      }
    }

    function checkClickStar(event) {
      const point = getUniverseWorldPoint(event);
      let clickedStar = null;
      for (const star of loadedStarfires) {
        if (Math.hypot(star.x - point.worldX, star.y - point.worldY) < 20) {
          clickedStar = star;
          break;
        }
      }

      if (clickedStar) {
        showStarCard(clickedStar, point.screenX, point.screenY);
      } else {
        hideStarCard();
      }
    }

    function showStarCard(star, x, y) {
      activeStar = star;
      document.getElementById("card-title-prefix").textContent = star.isMine ? "我的花火" : "克拉星火";
      document.getElementById("card-id").textContent = star.id;
      document.getElementById("card-song").textContent = star.song;
      document.getElementById("card-blessing").textContent = star.blessing;

      btnCardPlay.onclick = () => {
        activeStar = star;
        showKaleidoscopeFilm(star);
      };

      const rect = universeCanvas.getBoundingClientRect();
      const maxX = rect.width - 312;
      const maxY = rect.height - 190;
      starCard.style.left = `${Math.max(12, Math.min(x, maxX))}px`;
      starCard.style.top = `${Math.max(12, Math.min(y, maxY))}px`;
      starCard.classList.remove("hidden");
      requestAnimationFrame(() => starCard.classList.add("show"));
    }

    function hideStarCard() {
      starCard.classList.remove("show");
      activeStar = null;
      setTimeout(() => starCard.classList.add("hidden"), 260);
    }

    function drawFilmSpark(ctx, random, x, y, base, time) {
      const spin = time * (0.45 + random() * 0.6) + random() * Math.PI * 2;
      const arms = 4 + Math.floor(random() * 4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.globalCompositeOperation = "screen";
      for (let arm = 0; arm < arms; arm += 1) {
        const angle = arm * Math.PI * 2 / arms;
        const length = base * (0.8 + random() * 1.2);
        const gradient = ctx.createLinearGradient(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
        gradient.addColorStop(0, "rgba(255,255,255,0.95)");
        gradient.addColorStop(0.38, `${filmStar.color || "#f7b7cf"}cc`);
        gradient.addColorStop(1, "rgba(155,188,255,0)");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.2 + random() * 2.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * base * 0.12, Math.sin(angle) * base * 0.12);
        ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCoverImage(ctx, image, x, y, width, height, scale = 1) {
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const boxRatio = width / height;
      let drawWidth = width * scale;
      let drawHeight = height * scale;
      if (imageRatio > boxRatio) {
        drawWidth = drawHeight * imageRatio;
      } else {
        drawHeight = drawWidth / imageRatio;
      }
      ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    }

    function drawFilmBurst(cx, cy, maxRadius, progress, seed) {
      const random = seededRandom(seed + 77);
      const alpha = Math.max(0, 1 - progress);
      filmCtx.save();
      filmCtx.globalCompositeOperation = "screen";
      for (let i = 0; i < 34; i += 1) {
        const angle = random() * Math.PI * 2;
        const length = maxRadius * (0.14 + progress * (0.58 + random() * 0.36));
        const start = maxRadius * progress * 0.04;
        const endX = cx + Math.cos(angle) * length;
        const endY = cy + Math.sin(angle) * length;
        const startX = cx + Math.cos(angle) * start;
        const startY = cy + Math.sin(angle) * start;
        const gradient = filmCtx.createLinearGradient(startX, startY, endX, endY);
        gradient.addColorStop(0, `rgba(255,255,255,${0.82 * alpha})`);
        gradient.addColorStop(0.42, `rgba(247,183,207,${0.5 * alpha})`);
        gradient.addColorStop(1, `rgba(155,188,255,0)`);
        filmCtx.strokeStyle = gradient;
        filmCtx.lineWidth = 0.9 + random() * 1.8;
        filmCtx.beginPath();
        filmCtx.moveTo(startX, startY);
        filmCtx.lineTo(endX, endY);
        filmCtx.stroke();
      }
      filmCtx.restore();
    }

    function getFilmBpm(star) {
      if (star.bpm) return star.bpm;
      if (star.song === "VERY NICE") return 122;
      if (star.song === "돌고 돌아") return 82;
      if (star.song === "shining diamond") return 108;
      if (star.song === "Headliner") return 88;
      return 96;
    }

    function getFilmMusicTime(time) {
      return filmAudio && Number.isFinite(filmAudio.currentTime) && filmAudio.currentTime > 0
        ? filmAudio.currentTime
        : time;
    }

    function stopFilmMusic() {
      if (!filmAudio) return;
      filmAudio.pause();
      filmAudio.src = "";
      filmAudio = null;
    }

    function playFilmMusic(star) {
      stopFilmMusic();
      if (!star.audio) return;
      filmAudio = new Audio(star.audio);
      filmAudio.loop = true;
      filmAudio.volume = 1;
      filmAudio.play().catch(() => {
        statusChip.textContent = "點一下畫面即可播放這發花火的音樂。";
      });
    }

    function getFilmFragments(star) {
      if (!Array.isArray(star.fragments) || !star.fragments.length) return [];
      if (star._filmFragments) return star._filmFragments;
      star._filmFragments = star.fragments.map((fragment, index) => ({
        ...fragment,
        image: getPreviewImage(fragment.src),
        angle: fragment.angle ?? index * 0.7,
        spin: fragment.spin ?? 0.4,
        orbit: fragment.orbit ?? 1,
        size: fragment.size ?? 0.9,
        phase: fragment.phase ?? index * 0.9,
        copies: fragment.copies ?? 10,
      }));
      return star._filmFragments;
    }

    function drawFilmFragmentKaleidoscope(fragments, width, height, cx, cy, radius, seed, visualTime, beatPulse, revealEase) {
      const fullTurn = Math.PI * 2;
      const segments = 18 + (seed % 4) * 2;
      const angle = fullTurn / segments;
      const density = Math.min(1.8, 1.05 + fragments.length * 0.1);
      filmCtx.save();
      filmCtx.beginPath();
      filmCtx.arc(cx, cy, Math.max(width, height) * (0.08 + revealEase * 0.98), 0, fullTurn);
      filmCtx.clip();
      filmCtx.translate(cx, cy);
      filmCtx.rotate(revealEase * (visualTime * 0.13 + beatPulse * 0.055));
      for (let seg = 0; seg < segments; seg += 1) {
        filmCtx.save();
        filmCtx.rotate(seg * angle);
        if (seg % 2 === 1) filmCtx.scale(1, -1);
        filmCtx.beginPath();
        filmCtx.moveTo(0, 0);
        filmCtx.arc(0, 0, radius * 1.22, -angle / 2, angle / 2);
        filmCtx.closePath();
        filmCtx.clip();
        fragments.forEach((fragment, index) => {
          if (!fragment.image || !fragment.image.complete || !fragment.image.naturalWidth) return;
          const copyCount = Math.max(4, Math.min(14, Math.round((fragment.copies || 10) * 0.78)));
          for (let copy = 0; copy < copyCount; copy += 1) {
            const seedA = ((copy * 37 + index * 19) % 100) / 100;
            const seedB = ((copy * 23 + index * 41) % 100) / 100;
            const stream = (visualTime * (0.11 + fragment.orbit * 0.045) + seedB + index * 0.137 + copy * 0.071) % 1;
            const eased = 1 - Math.pow(1 - stream, 1.72);
            const fade = Math.sin(stream * Math.PI);
            const spiral = Math.sin(stream * fullTurn + fragment.phase + copy * 0.4) * angle * (0.1 + density * 0.025);
            const sliceAngle = -angle / 2 + angle * (0.12 + seedA * 0.76) + spiral;
            const distance = radius * (0.05 + eased * (0.64 + density * 0.05) + beatPulse * 0.018);
            const x = Math.cos(sliceAngle) * distance;
            const y = Math.sin(sliceAngle) * distance;
            const size = Math.min(radius * 0.13, 138) * fragment.size * (0.48 + fade * 0.56 + density * 0.035 + beatPulse * 0.08);
            filmCtx.save();
            filmCtx.translate(x, y);
            filmCtx.rotate(fragment.angle + copy * 0.73 + stream * fullTurn * 0.16 + visualTime * fragment.spin * 0.18);
            filmCtx.globalAlpha = (0.2 + fade * 0.58) * (0.9 + beatPulse * 0.16);
            filmCtx.drawImage(fragment.image, -size / 2, -size / 2, size, size);
            filmCtx.restore();
          }
        });
        filmCtx.restore();
      }
      filmCtx.restore();
    }

    function drawKaleidoscopeFilm(timeMs) {
      if (!filmStar) return;
      const { width, height } = sizeFilmCanvas();
      const time = timeMs * 0.001;
      const musicTime = getFilmMusicTime(time);
      const bpm = getFilmBpm(filmStar);
      const beat = (musicTime * bpm) / 60;
      const targetBeatPulse = Math.min(1, Math.pow(Math.max(0, 0.5 + Math.cos(beat * Math.PI * 2) * 0.5), 3) * (filmStar.bounce || 1));
      filmSmoothedBeat += (targetBeatPulse - filmSmoothedBeat) * 0.14;
      const beatPulse = filmSmoothedBeat;
      const revealElapsed = Math.max(0, timeMs - filmStartedAt);
      const visualTime = revealElapsed * 0.001;
      const reveal = Math.min(1, revealElapsed / 980);
      const revealEase = 1 - Math.pow(1 - reveal, 3);
      const seed = filmStar.seed || hashText(`${filmStar.id}-${filmStar.song}-${filmStar.blessing}`);
      const random = seededRandom(seed);
      const previewImage = getPreviewImage(filmStar.previewImage);
      const filmFragments = getFilmFragments(filmStar);
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.max(width, height) * 0.72;
      const segments = 16 + (seed % 5) * 2;
      const angle = Math.PI * 2 / segments;

      const bg = filmCtx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#01030a");
      bg.addColorStop(0.54, "#071226");
      bg.addColorStop(1, "#101436");
      filmCtx.fillStyle = bg;
      filmCtx.fillRect(0, 0, width, height);

      if (filmFragments.length) {
        drawFilmFragmentKaleidoscope(filmFragments, width, height, cx, cy, radius, seed, visualTime, beatPulse, revealEase);
        if (reveal < 1) drawFilmBurst(cx, cy, Math.max(width, height), reveal, seed);
        filmFrame = requestAnimationFrame(drawKaleidoscopeFilm);
        return;
      }

      if (previewImage && previewImage.complete && previewImage.naturalWidth) {
        filmCtx.save();
        filmCtx.beginPath();
        filmCtx.arc(cx, cy, Math.max(width, height) * (0.08 + revealEase * 0.96), 0, Math.PI * 2);
        filmCtx.clip();
        filmCtx.globalAlpha = 0.72 + revealEase * 0.28;
        filmCtx.translate(cx, cy);
        filmCtx.rotate(revealEase * (visualTime * 0.11 + Math.sin(beat * Math.PI * 2) * 0.008));
        const scale = 1.34 + beatPulse * 0.035 - revealEase * 0.1;
        drawCoverImage(filmCtx, previewImage, -width / 2, -height / 2, width, height, scale);
        filmCtx.restore();
        if (reveal < 1) drawFilmBurst(cx, cy, Math.max(width, height), reveal, seed);
        filmFrame = requestAnimationFrame(drawKaleidoscopeFilm);
        return;
      }

      filmCtx.save();
      filmCtx.beginPath();
      filmCtx.arc(cx, cy, radius, 0, Math.PI * 2);
      filmCtx.clip();
      filmCtx.translate(cx, cy);
      filmCtx.rotate(time * 0.26 + beatPulse * 0.06);

      for (let seg = 0; seg < segments; seg += 1) {
        filmCtx.save();
        filmCtx.rotate(seg * angle);
        if (seg % 2 === 1) filmCtx.scale(1, -1);
        filmCtx.beginPath();
        filmCtx.moveTo(0, 0);
        filmCtx.arc(0, 0, radius * 1.12, -angle / 2, angle / 2);
        filmCtx.closePath();
        filmCtx.clip();

        if (previewImage && previewImage.complete && previewImage.naturalWidth) {
          const imageSize = radius * (1.22 + Math.sin(time * 0.7 + seg) * 0.06);
          filmCtx.save();
          filmCtx.globalAlpha = filmStar.isMine ? 0.76 : 0.32;
          filmCtx.rotate(-time * 0.18 + seg * 0.025);
          filmCtx.drawImage(previewImage, -imageSize / 2, -imageSize / 2, imageSize, imageSize);
          filmCtx.restore();
        }

        for (let i = 0; i < 8; i += 1) {
          const r = radius * (0.12 + random() * 0.82);
          const drift = Math.sin(time * (0.6 + random()) + random() * 8) * radius * 0.05;
          const theta = -angle * 0.44 + random() * angle * 0.88 + time * (random() - 0.5) * 0.18;
          const x = Math.cos(theta) * (r + drift);
          const y = Math.sin(theta) * (r + drift);
          drawFilmSpark(filmCtx, random, x, y, 6 + random() * 16, time);
        }

        filmCtx.restore();
      }

      filmCtx.restore();
      if (reveal < 1) drawFilmBurst(cx, cy, Math.max(width, height), reveal, seed);

      filmFrame = requestAnimationFrame(drawKaleidoscopeFilm);
    }

    function showKaleidoscopeFilm(star) {
      filmStar = star;
      filmTitle.textContent = star.isMine ? `我的花火 #${star.id}` : `克拉星火 #${star.id}`;
      filmCaption.textContent = `選曲：${star.song}。${star.blessing}`;
      filmModal.classList.add("show");
      statusChip.textContent = `正在播放 #${star.id} 的萬花筒影片。`;
      if (filmFrame) cancelAnimationFrame(filmFrame);
      filmStartedAt = performance.now();
      filmSmoothedBeat = 0;
      playFilmMusic(star);
      filmFrame = requestAnimationFrame(drawKaleidoscopeFilm);
    }

    function hideKaleidoscopeFilm() {
      filmModal.classList.remove("show");
      filmStar = null;
      if (filmFrame) cancelAnimationFrame(filmFrame);
      filmFrame = 0;
      stopFilmMusic();
    }

    function relightFirework() {
      const makerUrl = new URL(window.location.href);
      makerUrl.searchParams.set("maker", Date.now().toString());
      makerUrl.hash = "maker";
      window.location.href = makerUrl.toString();
    }

    universeCanvas.addEventListener("mousedown", (event) => {
      isDraggingUniverse = true;
      lastDragX = event.clientX;
      lastDragY = event.clientY;
      checkClickStar(event);
    });

    universeCanvas.addEventListener("mousemove", (event) => {
      if (isDraggingUniverse) {
        const dx = event.clientX - lastDragX;
        const dy = event.clientY - lastDragY;
        universeOffsetX += dx;
        universeOffsetY += dy;
        lastDragX = event.clientX;
        lastDragY = event.clientY;
      } else {
        detectHoverStar(event);
      }
    });

    window.addEventListener("mouseup", () => {
      isDraggingUniverse = false;
    });

    universeCanvas.addEventListener("touchstart", (event) => {
      event.preventDefault();
      isDraggingUniverse = true;
      lastDragX = event.touches[0].clientX;
      lastDragY = event.touches[0].clientY;
      checkClickStar(event);
    }, { passive: false });

    universeCanvas.addEventListener("touchmove", (event) => {
      event.preventDefault();
      if (!isDraggingUniverse) return;
      const dx = event.touches[0].clientX - lastDragX;
      const dy = event.touches[0].clientY - lastDragY;
      universeOffsetX += dx;
      universeOffsetY += dy;
      lastDragX = event.touches[0].clientX;
      lastDragY = event.touches[0].clientY;
    }, { passive: false });

    window.addEventListener("touchend", () => {
      isDraggingUniverse = false;
    });

    btnCardClose.addEventListener("click", hideStarCard);
    btnFilmClose.addEventListener("click", hideKaleidoscopeFilm);
    filmModal.addEventListener("click", (event) => {
      if (event.target === filmModal) hideKaleidoscopeFilm();
      else if (filmAudio && filmAudio.paused) filmAudio.play().catch(() => {});
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hideKaleidoscopeFilm();
    });
    btnFindMine.addEventListener("click", focusMyFirework);
    btnAddDemo.addEventListener("click", relightFirework);

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(centerUniverse, 120);
    });

    loadSessionFireworks();
    loadCloudFireworks();
    updateStarCount();
    centerUniverse();
    requestAnimationFrame(drawUniverse);
  
    return;
  }


      const canvas = document.querySelector("#kaleidoscope");
      const ctx = canvas.getContext("2d");
      const sharedCanvas = document.querySelector("#sharedSky");
      const sharedCtx = sharedCanvas.getContext("2d");
      const drawCanvas = document.querySelector("#drawCanvas");
      const drawCtx = drawCanvas.getContext("2d");
      const finalPreviewCanvas = document.querySelector("#finalPreviewCanvas");
      const finalPreviewCtx = finalPreviewCanvas.getContext("2d");
      const fragmentList = document.querySelector("#fragmentList");
      const presetGrid = document.querySelector("#presetGrid");
      const songGrid = document.querySelector("#songGrid");
      const songNote = document.querySelector("#songNote");
      const stageStatus = document.querySelector("#stageStatus");
      const skyModal = document.querySelector("#skyModal");
      const sharedStarCount = document.querySelector("#sharedStarCount");
      const musicPlayer = document.querySelector("#musicPlayer");
      const finalMessage = document.querySelector("#finalMessage");
      const brushColor = document.querySelector("#brushColor");
      const brushSize = document.querySelector("#brushSize");
      const controls = {
        segments: document.querySelector("#segments"),
        spread: document.querySelector("#spread"),
        spacing: document.querySelector("#spacing"),
      };
      const outputs = {
        segments: document.querySelector("#segmentsOut"),
        spread: document.querySelector("#spreadOut"),
        spacing: document.querySelector("#spacingOut"),
      };
      const TAU = Math.PI * 2;
      const MAX_RENDERED_FRAGMENTS = 8;
      const MAX_FRAGMENT_COPIES = 12;
      const FRAGMENT_PREVIEW_SIZE = 72;
      const patternCanvas = document.createElement("canvas");
      const patternCtx = patternCanvas.getContext("2d");
      const state = {
        rotation: 0,
        speed: 6,
        spread: 1.18,
        density: 1.2,
        saturation: 176,
        segments: 24,
        fragments: [],
        launched: false,
        startedAt: 0,
        lastRenderTime: 0,
        audioContext: null,
        analyser: null,
        audioElement: null,
        audioSource: null,
        audioData: null,
        audioLevel: 0.24,
        audioBeat: 0,
        lastAudioEnergy: 0.24,
        pointer: {
          drawing: false,
          lastX: 0,
          lastY: 0,
        },
        history: [],
        seed: 3,
        pendingName: "",
        reservedFireworkNumber: "",
        selectedSong: "shining-diamond",
        bands: { bass: 0.24, mid: 0.24, treble: 0.24, energy: 0.24, beat: 0 },
        shared: {
          offsetX: 0,
          offsetY: 0,
          dragging: false,
          lastX: 0,
          lastY: 0,
        },
      };
      const fragmentCards = new Map();
      const sharedFireworks = [
        { id: "1711", x: 200, y: 150, color: "#f7b7cf", name: "克拉星火 #1711", song: "shining diamond", message: "我們的青春，永遠與十七同頻！" },
        { id: "1004", x: -150, y: 250, color: "#9bbcff", name: "克拉星火 #1004", song: "돌고 돌아", message: "謝謝你們成為我們溫柔的後盾。" },
        { id: "0526", x: 50, y: -200, color: "#ffd3e2", name: "克拉星火 #0526", song: "VERY NICE", message: "SEVENTEEN 11週年快樂！" },
        { id: "1314", x: -300, y: -100, color: "#baf3ff", name: "克拉星火 #1314", song: "Headliner", message: "一起創造璀璨的風景！" },
        { id: "0615", x: 330, y: -260, color: "#f7b7cf", name: "克拉星火 #0615", song: "shining diamond", message: "願每一個舞台都被粉藍光海接住。" },
        { id: "0223", x: -420, y: 210, color: "#9bbcff", name: "克拉星火 #0223", song: "돌고 돌아", message: "繞了一圈，我們還是在同一片天空下。" },
        { id: "1117", x: 420, y: 80, color: "#ffe566", name: "克拉星火 #1117", song: "VERY NICE", message: "今天也用最大聲的笑容慶祝你們。" },
      ];
      const songProfiles = {
        "shining-diamond": {
          title: "shining diamond",
          bpm: 108,
          key: "C# minor",
          audio: "music/shining-diamond.mp3",
          hue: -8,
          bass: 0.62,
          mid: 0.52,
          treble: 0.78,
          sparkle: 0.9,
        },
        "very-nice": {
          title: "VERY NICE",
          bpm: 122,
          key: "F minor",
          bounce: 1.48,
          tempoPulse: 0.72,
          beatSharpness: 3.4,
          response: 0.36,
          audio: "music/very-nice.mp3",
          hue: 18,
          bass: 0.82,
          mid: 0.7,
          treble: 0.72,
          sparkle: 0.76,
        },
        "dolgodora": {
          title: "돌고 돌아",
          bpm: 82,
          key: "F# major",
          motion: 0.68,
          bounce: 0.56,
          audio: "music/dolgodora.mp3",
          hue: -34,
          bass: 0.48,
          mid: 0.72,
          treble: 0.56,
          sparkle: 0.62,
        },
        headliner: {
          title: "Headliner",
          bpm: 88,
          key: "C major",
          audio: "music/headliner.mp3",
          hue: 38,
          bass: 0.74,
          mid: 0.62,
          treble: 0.86,
          sparkle: 0.86,
        },
      };
      const presetFragments = [
        ["heart", "愛心"],
        ["star", "星星"],
        ["moon", "月亮"],
        ["sun", "太陽"],
        ["diamond", "鑽石"],
        ["lightning", "閃電"],
        ["clover", "幸運草"],
        ["boat", "紙船"],
        ["drop", "雨滴"],
        ["flower", "花"],
        ["petal", "花瓣"],
        ["feather", "羽毛"],
        ["butterfly", "蝴蝶"],
        ["smile", "笑臉"],
        ["draw", "繪製"],
      ];
      const palettes = {
        neon: ["#9bbcff", "#f7b7cf", "#ff8db7", "#a8a5ff", "#f8f3fb"],
        ocean: ["#253b78", "#9bbcff", "#c7d7ff", "#071226", "#f7b7cf"],
        blossom: ["#f7b7cf", "#ffd3e2", "#f8f3fb", "#9bbcff", "#101436"],
        crystal: ["#baf3ff", "#81d5ff", "#f3ecff", "#87f7c7", "#15181a"],
        default: ["#9bbcff", "#f7b7cf", "#c7d7ff", "#b9a7ff", "#f8f3fb"],
      };

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

      function pickPalette(text) {
        const lowered = text.toLowerCase();
        if (["霓虹", "neon"].some((word) => lowered.includes(word))) return palettes.neon;
        if (["海", "浪", "水", "藍"].some((word) => lowered.includes(word))) return palettes.ocean;
        if (["花", "粉", "玫瑰"].some((word) => lowered.includes(word))) return palettes.blossom;
        if (["玻璃", "寶石", "鑽石", "水晶"].some((word) => lowered.includes(word))) return palettes.crystal;
        return palettes.default;
      }

      function drawStar(targetCtx, x, y, outer, inner, points, rotation = -Math.PI / 2) {
        targetCtx.beginPath();
        for (let i = 0; i < points * 2; i += 1) {
          const radius = i % 2 === 0 ? outer : inner;
          const angle = rotation + (i * Math.PI) / points;
          const px = x + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius;
          if (i === 0) targetCtx.moveTo(px, py);
          else targetCtx.lineTo(px, py);
        }
        targetCtx.closePath();
      }

      function drawHeart(targetCtx, scale = 1) {
        targetCtx.beginPath();
        targetCtx.moveTo(0, 78 * scale);
        targetCtx.bezierCurveTo(-150 * scale, -32 * scale, -92 * scale, -170 * scale, 0, -82 * scale);
        targetCtx.bezierCurveTo(92 * scale, -170 * scale, 150 * scale, -32 * scale, 0, 78 * scale);
        targetCtx.closePath();
      }

      function drawPresetSymbol(targetCtx, type, size) {
        const palette = {
          heart: "#ff6d7a",
          star: "#f7b7cf",
          moon: "#baf3ff",
          sun: "#ffd3e2",
          diamond: "#9bbcff",
          lightning: "#ffe566",
          clover: "#66d6a7",
          boat: "#f8f5ec",
          drop: "#9bbcff",
          flower: "#f7b7cf",
          petal: "#d9a5ff",
          feather: "#baf3ff",
          butterfly: "#c7d7ff",
          smile: "#ffcc4d",
          draw: "#f8f5ec",
        };
        const color = palette[type] || palette.draw;
        targetCtx.clearRect(0, 0, size, size);
        targetCtx.save();
        targetCtx.translate(size / 2, size / 2);
        targetCtx.scale(size / 512, size / 512);
        targetCtx.fillStyle = color;
        targetCtx.strokeStyle = color;
        targetCtx.lineWidth = 8;
        targetCtx.lineCap = "round";
        targetCtx.lineJoin = "round";
        targetCtx.shadowColor = color;
        targetCtx.shadowBlur = 24;
        if (type === "heart") {
          drawHeart(targetCtx, 1.05);
          targetCtx.fill();
          targetCtx.stroke();
        } else if (type === "star") {
          drawStar(targetCtx, 0, 0, 168, 72, 5);
          targetCtx.fill();
          targetCtx.stroke();
        } else if (type === "moon") {
          targetCtx.beginPath();
          targetCtx.arc(0, 0, 162, 0, TAU);
          targetCtx.fill();
          targetCtx.globalCompositeOperation = "destination-out";
          targetCtx.beginPath();
          targetCtx.arc(62, -30, 154, 0, TAU);
          targetCtx.fill();
          targetCtx.globalCompositeOperation = "source-over";
          targetCtx.stroke();
        } else if (type === "sun") {
          for (let i = 0; i < 12; i += 1) {
            targetCtx.save();
            targetCtx.rotate((i * TAU) / 12);
            targetCtx.beginPath();
            targetCtx.moveTo(0, -128);
            targetCtx.lineTo(0, -194);
            targetCtx.stroke();
            targetCtx.restore();
          }
          targetCtx.beginPath();
          targetCtx.arc(0, 0, 96, 0, TAU);
          targetCtx.fill();
          targetCtx.stroke();
        } else if (type === "diamond") {
          targetCtx.beginPath();
          targetCtx.moveTo(0, -184);
          targetCtx.lineTo(150, -40);
          targetCtx.lineTo(0, 190);
          targetCtx.lineTo(-150, -40);
          targetCtx.closePath();
          targetCtx.fill();
          targetCtx.stroke();
        } else if (type === "lightning") {
          targetCtx.beginPath();
          targetCtx.moveTo(34, -196);
          targetCtx.lineTo(-88, 24);
          targetCtx.lineTo(10, 24);
          targetCtx.lineTo(-36, 196);
          targetCtx.lineTo(106, -34);
          targetCtx.lineTo(4, -34);
          targetCtx.closePath();
          targetCtx.fill();
          targetCtx.stroke();
        } else if (type === "clover") {
          for (let i = 0; i < 4; i += 1) {
            targetCtx.save();
            targetCtx.rotate((i * TAU) / 4 + Math.PI / 4);
            targetCtx.beginPath();
            targetCtx.ellipse(0, -78, 78, 108, 0, 0, TAU);
            targetCtx.fill();
            targetCtx.restore();
          }
          targetCtx.beginPath();
          targetCtx.moveTo(10, 84);
          targetCtx.quadraticCurveTo(92, 150, 44, 202);
          targetCtx.stroke();
        } else if (type === "boat") {
          targetCtx.beginPath();
          targetCtx.moveTo(-178, 40);
          targetCtx.lineTo(178, 40);
          targetCtx.lineTo(92, 142);
          targetCtx.lineTo(-94, 142);
          targetCtx.closePath();
          targetCtx.fill();
          targetCtx.stroke();
          targetCtx.beginPath();
          targetCtx.moveTo(-24, 34);
          targetCtx.lineTo(-24, -166);
          targetCtx.lineTo(116, 34);
          targetCtx.closePath();
          targetCtx.stroke();
        } else if (type === "drop") {
          targetCtx.beginPath();
          targetCtx.moveTo(0, -184);
          targetCtx.bezierCurveTo(132, -20, 134, 128, 0, 170);
          targetCtx.bezierCurveTo(-134, 128, -132, -20, 0, -184);
          targetCtx.closePath();
          targetCtx.fill();
          targetCtx.stroke();
        } else if (type === "flower") {
          for (let i = 0; i < 7; i += 1) {
            targetCtx.save();
            targetCtx.rotate((i * TAU) / 7);
            targetCtx.beginPath();
            targetCtx.ellipse(0, -96, 50, 98, 0, 0, TAU);
            targetCtx.fill();
            targetCtx.stroke();
            targetCtx.restore();
          }
          targetCtx.fillStyle = "#9bbcff";
          targetCtx.beginPath();
          targetCtx.arc(0, 0, 48, 0, TAU);
          targetCtx.fill();
        } else if (type === "petal") {
          targetCtx.rotate(-0.72);
          targetCtx.beginPath();
          targetCtx.ellipse(0, 0, 78, 188, 0, 0, TAU);
          targetCtx.fill();
          targetCtx.stroke();
        } else if (type === "feather") {
          targetCtx.beginPath();
          targetCtx.moveTo(-24, 176);
          targetCtx.quadraticCurveTo(122, 30, 54, -178);
          targetCtx.quadraticCurveTo(-120, -110, -24, 176);
          targetCtx.closePath();
          targetCtx.fill();
          targetCtx.stroke();
          targetCtx.beginPath();
          targetCtx.moveTo(-24, 176);
          targetCtx.quadraticCurveTo(44, 28, 54, -178);
          targetCtx.stroke();
        } else if (type === "butterfly") {
          targetCtx.fillStyle = "#f7b7cf";
          targetCtx.beginPath();
          targetCtx.ellipse(-82, -48, 78, 118, -0.46, 0, TAU);
          targetCtx.ellipse(82, -48, 78, 118, 0.46, 0, TAU);
          targetCtx.fill();
          targetCtx.stroke();
          targetCtx.fillStyle = "#9bbcff";
          targetCtx.beginPath();
          targetCtx.ellipse(-70, 74, 58, 86, 0.56, 0, TAU);
          targetCtx.ellipse(70, 74, 58, 86, -0.56, 0, TAU);
          targetCtx.fill();
          targetCtx.stroke();
          targetCtx.fillStyle = "#f8f3fb";
          targetCtx.beginPath();
          targetCtx.ellipse(0, 8, 24, 130, 0, 0, TAU);
          targetCtx.fill();
          targetCtx.stroke();
          targetCtx.beginPath();
          targetCtx.moveTo(-10, -118);
          targetCtx.quadraticCurveTo(-72, -174, -118, -150);
          targetCtx.moveTo(10, -118);
          targetCtx.quadraticCurveTo(72, -174, 118, -150);
          targetCtx.stroke();
        } else if (type === "smile") {
          targetCtx.beginPath();
          targetCtx.arc(0, 0, 150, 0, TAU);
          targetCtx.fill();
          targetCtx.stroke();
          targetCtx.fillStyle = "#071226";
          targetCtx.beginPath();
          targetCtx.arc(-54, -42, 18, 0, TAU);
          targetCtx.arc(54, -42, 18, 0, TAU);
          targetCtx.fill();
          targetCtx.beginPath();
          targetCtx.arc(0, 24, 72, 0.1 * Math.PI, 0.9 * Math.PI);
          targetCtx.strokeStyle = "#071226";
          targetCtx.stroke();
        } else if (type === "draw") {
          targetCtx.strokeStyle = "#f8f3fb";
          targetCtx.lineWidth = 28;
          targetCtx.lineCap = "round";
          targetCtx.shadowColor = "#9bbcff";
          targetCtx.shadowBlur = 28;
          targetCtx.beginPath();
          targetCtx.moveTo(-132, 0);
          targetCtx.lineTo(132, 0);
          targetCtx.moveTo(0, -132);
          targetCtx.lineTo(0, 132);
          targetCtx.stroke();
        } else {
          targetCtx.beginPath();
          targetCtx.moveTo(-124, 122);
          targetCtx.lineTo(40, -42);
          targetCtx.lineTo(116, 34);
          targetCtx.lineTo(-48, 198);
          targetCtx.closePath();
          targetCtx.fill();
          targetCtx.stroke();
          targetCtx.beginPath();
          targetCtx.moveTo(74, -74);
          targetCtx.lineTo(134, -134);
          targetCtx.stroke();
        }
        targetCtx.restore();
      }

      function makePresetImage(type) {
        const presetCanvas = document.createElement("canvas");
        presetCanvas.width = 512;
        presetCanvas.height = 512;
        drawPresetSymbol(presetCanvas.getContext("2d"), type, 512);
        return presetCanvas;
      }

      function resizeCanvas(target, context, cssWidth, cssHeight) {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        target.width = Math.max(1, Math.round(cssWidth * dpr));
        target.height = Math.max(1, Math.round(cssHeight * dpr));
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function syncOutputs() {
        outputs.segments.value = controls.segments.value;
        outputs.spread.value = `${controls.spread.value}%`;
        outputs.spacing.value = `${controls.spacing.value}%`;
      }

      function updateStateFromControls() {
        state.segments = Number(controls.segments.value);
        state.speed = 6;
        state.spread = Number(controls.spread.value) / 100;
        state.density = Number(controls.spacing.value) / 100;
        syncOutputs();
      }

      function setDrawingDefaults() {
        drawCtx.lineCap = "round";
        drawCtx.lineJoin = "round";
        drawCtx.strokeStyle = brushColor.value;
        drawCtx.lineWidth = Number(brushSize.value);
      }

      function clearDrawing() {
        const width = drawCanvas.clientWidth || 1;
        const height = drawCanvas.clientHeight || 1;
        drawCtx.clearRect(0, 0, width, height);
        state.history = [];
        state.pendingName = "";
      }

      function snapshotDrawing() {
        const width = drawCanvas.width;
        const height = drawCanvas.height;
        if (!width || !height) return;
        state.history.push(drawCtx.getImageData(0, 0, width, height));
        if (state.history.length > 24) state.history.shift();
      }

      function undoDrawing() {
        const previous = state.history.pop();
        if (!previous) {
          clearDrawing();
          return;
        }
        drawCtx.setTransform(1, 0, 0, 1, 0, 0);
        drawCtx.putImageData(previous, 0, 0);
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        setDrawingDefaults();
      }

      function getDrawPoint(event) {
        const rect = drawCanvas.getBoundingClientRect();
        return {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      }

      function startDrawing(event) {
        event.preventDefault();
        snapshotDrawing();
        const point = getDrawPoint(event);
        state.pointer.drawing = true;
        state.pointer.lastX = point.x;
        state.pointer.lastY = point.y;
        setDrawingDefaults();
        drawCtx.beginPath();
        drawCtx.moveTo(point.x, point.y);
        drawCanvas.setPointerCapture(event.pointerId);
      }

      function drawStroke(event) {
        if (!state.pointer.drawing) return;
        event.preventDefault();
        const point = getDrawPoint(event);
        drawCtx.lineTo(point.x, point.y);
        drawCtx.stroke();
        state.pointer.lastX = point.x;
        state.pointer.lastY = point.y;
      }

      function stopDrawing(event) {
        if (!state.pointer.drawing) return;
        state.pointer.drawing = false;
        drawCtx.closePath();
        if (drawCanvas.hasPointerCapture(event.pointerId)) drawCanvas.releasePointerCapture(event.pointerId);
      }

      function drawingHasPixels() {
        const pixels = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height).data;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] > 0) return true;
        }
        return false;
      }

      function makeFragmentImage() {
        const sourceWidth = drawCanvas.width;
        const sourceHeight = drawCanvas.height;
        const crop = document.createElement("canvas");
        crop.width = sourceWidth;
        crop.height = sourceHeight;
        crop.getContext("2d").putImageData(drawCtx.getImageData(0, 0, sourceWidth, sourceHeight), 0, 0);
        return crop;
      }

      function addFragmentImage(name, image) {
        const fragment = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          name,
          image,
          angle: Math.random() * TAU,
          spin: -0.9 + Math.random() * 1.8,
          orbit: 0.4 + Math.random() * 1.2,
          size: 0.58 + Math.random() * 0.62,
          phase: Math.random() * TAU,
          copies: 9 + Math.floor(Math.random() * 6),
        };
        state.fragments.push(fragment);
        if (!state.launched) state.launched = true;
        state.startedAt = performance.now();
        appendFragmentCard(fragment, state.fragments.length - 1);
        return fragment;
      }

      function addPresetFragment(type, name) {
        if (type === "draw") {
          const drawBox = document.querySelector("#drawBox");
          drawBox.classList.remove("is-hidden");
          requestAnimationFrame(() => {
            fitCanvases();
            drawBox.scrollIntoView({ behavior: "smooth", block: "start" });
          });
          stageStatus.textContent = "已切到自訂繪製。畫完後按「投入萬花筒」加入碎片收集箱。";
          return;
        }
        const fragment = addFragmentImage(name, makePresetImage(type));
        stageStatus.textContent = `${fragment.name} 已加入碎片收集箱，萬花筒已自動開始預覽。`;
      }

      function renderPresetGrid() {
        presetGrid.innerHTML = "";
        presetFragments.forEach(([type, name]) => {
          const button = document.createElement("button");
          button.className = "preset-button";
          button.type = "button";
          button.setAttribute("aria-label", type === "draw" ? "自行繪製碎片" : `加入${name}`);
          const preview = document.createElement("canvas");
          preview.width = 96;
          preview.height = 96;
          drawPresetSymbol(preview.getContext("2d"), type, 96);
          const label = document.createElement("span");
          label.textContent = name;
          button.append(preview, label);
          button.addEventListener("click", () => addPresetFragment(type, name));
          presetGrid.append(button);
        });
      }

      function selectSong(songId) {
        state.selectedSong = songId;
        renderSongGrid();
        songNote.textContent = "";
        loadSelectedSong();
        state.startedAt = performance.now();
        playSelectedSong();
        if (state.fragments.length) state.launched = true;
        stageStatus.textContent = "";
      }

      function renderSongGrid() {
        songGrid.innerHTML = "";
        Object.entries(songProfiles).forEach(([songId, song]) => {
          const button = document.createElement("button");
          button.className = "song-button";
          if (songId === state.selectedSong) button.classList.add("is-selected");
          button.type = "button";
          button.textContent = song.title;
          button.setAttribute("aria-label", `選擇歌曲 ${song.title}`);
          button.addEventListener("click", () => selectSong(songId));
          songGrid.append(button);
        });
      }

      function showSongPage() {
        document.body.classList.add("song-mode");
        window.scrollTo({ top: 0, behavior: "smooth" });
        loadSelectedSong();
        playSelectedSong();
        if (state.fragments.length) {
          state.launched = true;
          state.startedAt = performance.now();
          stageStatus.textContent = "";
        } else {
          stageStatus.textContent = "";
        }
      }

      function showMakerPage() {
        document.body.classList.remove("song-mode", "final-mode", "shared-mode");
        state.launched = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
        stageStatus.textContent = "預覽在這裡。點選下方已有碎片可加入收集箱，也可以選「繪製」自訂碎片。";
      }

      function makeAnotherFirework() {
        document.body.className = "";
        if (state.audioElement) state.audioElement.pause();
        state.fragments = [];
        state.launched = false;
        state.rotation = 0;
        state.shared.offsetX = 0;
        state.shared.offsetY = 0;
        state.shared.dragging = false;
        state.pendingName = "";
        state.reservedFireworkNumber = "";
        skyModal.classList.remove("is-open");
        clearDrawing();
        document.querySelector("#drawBox").classList.add("is-hidden");
        finalMessage.value = "約定好了，要像鑽石一樣長久閃耀，照亮彼此。";
        renderFragmentList();
        requestAnimationFrame(() => {
          fitCanvases();
          window.scrollTo({ top: 0, behavior: "smooth" });
          stageStatus.textContent = "再創一朵新的花火。先選擇碎片，或點「繪製」做出專屬元素。";
        });
      }

      function showFinalPage() {
        document.body.classList.remove("song-mode", "shared-mode");
        document.body.classList.add("final-mode");
        fitCanvases();
        window.scrollTo({ top: 0, behavior: "smooth" });
        requestAnimationFrame(() => drawFinalPreview());
        stageStatus.textContent = `花火正在綻放。這是你與 ${songProfiles[state.selectedSong].title} 一起留下的粉藍星空。`;
      }

      function bloomFireworks() {
        if (!state.fragments.length) {
          stageStatus.textContent = "還沒有可綻放的碎片。請先返回製作頁加入至少一個碎片。";
          return;
        }
        state.launched = true;
        state.startedAt = performance.now();
        playSelectedSong();
        showFinalPage();
      }

      function getFinalMessage() {
        return finalMessage.value.trim() || "約定好了，要像鑽石一樣長久閃耀，照亮彼此。";
      }

      function drawWrappedText(targetCtx, text, x, y, maxWidth, lineHeight) {
        const words = Array.from(text);
        let line = "";
        let currentY = y;
        words.forEach((word) => {
          const testLine = `${line}${word}`;
          if (targetCtx.measureText(testLine).width > maxWidth && line) {
            targetCtx.fillText(line, x, currentY);
            line = word;
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        });
        if (line) targetCtx.fillText(line, x, currentY);
        return currentY + lineHeight;
      }

      function drawFinalPreview(elapsed = performance.now() * 0.001) {
        const rect = finalPreviewCanvas.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return;
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        finalPreviewCanvas.width = Math.max(1, Math.round(width * dpr));
        finalPreviewCanvas.height = Math.max(1, Math.round(height * dpr));
        finalPreviewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        finalPreviewCtx.clearRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) * 0.49;
        const angle = TAU / state.segments;
        const bands = state.bands || getAudioBands(elapsed);
        const direction = state.speed < 0 ? -1 : 1;
        const songMotion = songProfiles[state.selectedSong]?.motion ?? 1;
        const motionScale = 0.28 + Math.min(1, Math.abs(state.speed) / 40) * 0.9;
        const motionElapsed = elapsed * motionScale * direction * songMotion;
        const visibleFragments = state.fragments.length > MAX_RENDERED_FRAGMENTS
          ? state.fragments.slice(0, MAX_RENDERED_FRAGMENTS)
          : state.fragments;

        finalPreviewCtx.save();
        finalPreviewCtx.beginPath();
        finalPreviewCtx.arc(cx, cy, radius, 0, TAU);
        finalPreviewCtx.clip();
        finalPreviewCtx.fillStyle = "#01030a";
        finalPreviewCtx.fillRect(0, 0, width, height);

        if (visibleFragments.length) {
          drawPatternSeed(width, height, radius * 1.25, angle, motionElapsed, bands, visibleFragments);
          finalPreviewCtx.save();
          finalPreviewCtx.translate(cx, cy);
          finalPreviewCtx.rotate(state.rotation + motionElapsed * 0.04);
          finalPreviewCtx.filter = `saturate(${state.saturation + bands.treble * 18}%) contrast(${116 + bands.bass * 22}%)`;
          for (let i = 0; i < state.segments; i += 1) {
            finalPreviewCtx.save();
            finalPreviewCtx.rotate(i * angle);
            if (i % 2 === 1) finalPreviewCtx.scale(1, -1);
            finalPreviewCtx.beginPath();
            finalPreviewCtx.moveTo(0, 0);
            finalPreviewCtx.arc(0, 0, radius * 1.25, -angle / 2, angle / 2);
            finalPreviewCtx.closePath();
            finalPreviewCtx.clip();
            finalPreviewCtx.drawImage(patternCanvas, -cx, -cy, width, height);
            finalPreviewCtx.restore();
          }
          finalPreviewCtx.restore();
          finalPreviewCtx.save();
          finalPreviewCtx.translate(cx, cy);
          finalPreviewCtx.globalCompositeOperation = "screen";
          for (let i = 0; i < state.segments; i += 2) {
            const seamAngle = i * angle + state.rotation + motionElapsed * 0.04;
            finalPreviewCtx.strokeStyle = `rgba(155,188,255,${0.05 + bands.energy * 0.08})`;
            finalPreviewCtx.lineWidth = 0.7;
            finalPreviewCtx.beginPath();
            finalPreviewCtx.moveTo(0, 0);
            finalPreviewCtx.lineTo(Math.cos(seamAngle) * radius, Math.sin(seamAngle) * radius);
            finalPreviewCtx.stroke();
          }
          finalPreviewCtx.restore();
        } else {
          finalPreviewCtx.save();
          finalPreviewCtx.translate(cx, cy);
          finalPreviewCtx.strokeStyle = "rgba(155,188,255,0.28)";
          finalPreviewCtx.lineWidth = 2;
          for (let i = 0; i < 4; i += 1) {
            finalPreviewCtx.beginPath();
            finalPreviewCtx.arc(0, 0, radius * (0.16 + i * 0.12), 0, TAU);
            finalPreviewCtx.stroke();
          }
          finalPreviewCtx.restore();
        }

        finalPreviewCtx.globalCompositeOperation = "source-over";
        const glow = finalPreviewCtx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius);
        glow.addColorStop(0, "rgba(247,183,207,0.08)");
        glow.addColorStop(0.62, "rgba(155,188,255,0.06)");
        glow.addColorStop(1, "rgba(0,0,0,0.64)");
        finalPreviewCtx.fillStyle = glow;
        finalPreviewCtx.fillRect(0, 0, width, height);
        finalPreviewCtx.restore();
        finalPreviewCtx.strokeStyle = "rgba(247,183,207,0.22)";
        finalPreviewCtx.lineWidth = 2;
        finalPreviewCtx.beginPath();
        finalPreviewCtx.arc(cx, cy, radius - 1, 0, TAU);
        finalPreviewCtx.stroke();
      }

      function savePostcard() {
        drawFinalPreview();
        const fireworkNumber = getReservedFireworkNumber();
        const card = document.createElement("canvas");
        card.width = 1080;
        card.height = 1600;
        const cardCtx = card.getContext("2d");
        const bg = cardCtx.createLinearGradient(0, 0, card.width, card.height);
        bg.addColorStop(0, "#020712");
        bg.addColorStop(0.5, "#071226");
        bg.addColorStop(1, "#101436");
        cardCtx.fillStyle = bg;
        cardCtx.fillRect(0, 0, card.width, card.height);
        for (let i = 0; i < 160; i += 1) {
          const x = Math.random() * card.width;
          const y = Math.random() * card.height;
          const alpha = 0.16 + Math.random() * 0.38;
          cardCtx.fillStyle = i % 2 ? `rgba(247,183,207,${alpha})` : `rgba(155,188,255,${alpha})`;
          cardCtx.beginPath();
          cardCtx.arc(x, y, 1 + Math.random() * 2.4, 0, TAU);
          cardCtx.fill();
        }
        const glow = cardCtx.createRadialGradient(card.width / 2, 570, 40, card.width / 2, 570, 510);
        glow.addColorStop(0, "rgba(247,183,207,0.38)");
        glow.addColorStop(0.46, "rgba(155,188,255,0.2)");
        glow.addColorStop(1, "rgba(155,188,255,0)");
        cardCtx.fillStyle = glow;
        cardCtx.fillRect(0, 0, card.width, card.height);
        const imageSize = 740;
        cardCtx.save();
        cardCtx.beginPath();
        cardCtx.arc(card.width / 2, 580, imageSize / 2, 0, TAU);
        cardCtx.clip();
        cardCtx.drawImage(finalPreviewCanvas, card.width / 2 - imageSize / 2, 580 - imageSize / 2, imageSize, imageSize);
        cardCtx.restore();
        cardCtx.strokeStyle = "rgba(247,183,207,0.56)";
        cardCtx.lineWidth = 4;
        cardCtx.beginPath();
        cardCtx.arc(card.width / 2, 580, imageSize / 2, 0, TAU);
        cardCtx.stroke();
        cardCtx.fillStyle = "#f8f3fb";
        cardCtx.textAlign = "center";
        cardCtx.font = "700 42px 'Noto Sans TC', sans-serif";
        cardCtx.fillText("SEVENTEEN 11th ANNIVERSARY", card.width / 2, 1080);
        cardCtx.font = "36px 'Noto Sans TC', sans-serif";
        drawWrappedText(cardCtx, getFinalMessage(), card.width / 2, 1160, 850, 58);
        cardCtx.fillStyle = "#b9c7e6";
        cardCtx.font = "30px 'Noto Sans TC', sans-serif";
        drawWrappedText(cardCtx, "── 旋律已烙印，花火不熄滅。", card.width / 2, 1328, 820, 50);
        cardCtx.fillStyle = "rgba(155,188,255,0.72)";
        cardCtx.font = "24px 'Noto Sans TC', sans-serif";
        cardCtx.fillText(songProfiles[state.selectedSong].title, card.width / 2, 1460);
        cardCtx.fillStyle = "rgba(248,243,251,0.72)";
        cardCtx.font = "28px 'Noto Sans TC', sans-serif";
        cardCtx.fillText(`花火編號 #${fireworkNumber}`, card.width / 2, 1514);
        const link = document.createElement("a");
        link.download = `team-svt-firework-${fireworkNumber}.png`;
        link.href = card.toDataURL("image/png");
        link.click();
      }

      function showSkyModal() {
        sendToUniverse();
      }

      function safeScriptJson(value) {
        return JSON.stringify(value).replace(/</g, "\\u003c");
      }

     function showUniverseUploadError(error) {
  console.error("Firestore upload failed:", error);

  const message = "花火暫時沒有成功送入宇宙，請再試一次。";
  const detail = error?.message || String(error || "");

  stageStatus.textContent = message;
  alert(detail ? `${message}\n\n錯誤：${detail}` : message);
}

      function openBundledUniverse(runtimeData = {}) {
  const bootScript = `<script>window.__TEAM_SVT_BOOT__=${safeScriptJson(runtimeData)};<` + `/script>`;

  const universeHtml = UNIVERSE_HTML
    .replace(/<script[^>]*src=["']?app\.js[^>]*><\/script>/gi, "")
    .replace("</head>", `${bootScript}\n</head>`);

  document.open();
  document.write(universeHtml);
  document.close();
}

      function readTemporaryFireworkArchive() {
        try {
          const archive = JSON.parse(sessionStorage.getItem("teamSvtFireworkArchive") || "[]");
          return Array.isArray(archive)
            ? archive.filter(Boolean).map(({ audio, ...item }) => item)
            : [];
        } catch (error) {
          return [];
        }
      }

      function nextFireworkNumber(archive) {
        const used = new Set(
          archive
            .map((item) => Number.parseInt(item.number || item.id, 10))
            .filter(Number.isFinite)
        );
        let candidate = 1315;
        while (used.has(candidate)) candidate += 1;
        return String(candidate).padStart(4, "0");
      }

      function getReservedFireworkNumber() {
        if (!state.reservedFireworkNumber) {
          state.reservedFireworkNumber = `${String(Date.now()).slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
        }
        return state.reservedFireworkNumber;
      }

      function fragmentImageDataUrl(image) {
        const size = 192;
        const thumb = document.createElement("canvas");
        thumb.width = size;
        thumb.height = size;
        const thumbCtx = thumb.getContext("2d");
        thumbCtx.clearRect(0, 0, size, size);
        thumbCtx.drawImage(image, 0, 0, size, size);
        return thumb.toDataURL("image/webp", 0.76);
      }

      function canvasImageDataUrl(sourceCanvas, width = 420) {
        const ratio = sourceCanvas.height / sourceCanvas.width || 1;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = Math.round(width * ratio);
        const canvasCtx = canvas.getContext("2d");
        canvasCtx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/webp", 0.76);
      }

      function serializeFragmentsForUniverse() {
        return state.fragments.slice(0, 12).map((fragment) => ({
          id: fragment.id,
          name: fragment.name,
          src: fragmentImageDataUrl(fragment.image),
          angle: fragment.angle,
          spin: fragment.spin,
          orbit: fragment.orbit,
          size: fragment.size,
          phase: fragment.phase,
          copies: fragment.copies,
        }));
      }

      async function sendToUniverse(event) {
        if (event) event.preventDefault();
        drawFinalPreview();
        const previewImage = finalPreviewCanvas.width && finalPreviewCanvas.height
          ? canvasImageDataUrl(finalPreviewCanvas)
          : "";
        const selectedSong = songProfiles[state.selectedSong];
        const archive = readTemporaryFireworkArchive();
        const number = getReservedFireworkNumber();
        const payload = {
          id: number,
          number,
          name: `我的花火 #${number}`,
          message: getFinalMessage(),
          song: selectedSong.title,
          songId: state.selectedSong,
          bpm: selectedSong.bpm,
          bounce: selectedSong.bounce || 1,
          fragments: serializeFragmentsForUniverse(),
          previewImage,
          seed: hashText(`${number}-${state.selectedSong}-${getFinalMessage()}-${state.fragments.length}`),
          createdAt: new Date().toISOString(),
        };
        const runtimeData = {
          latestFirework: payload,
          audioBySongId: {
            [state.selectedSong]: selectedSong.audio,
          },
        };
        archive.push(payload);
        const compactArchive = archive.slice(-8).map(({ audio, fragments, ...item }) => item);
        try {
          sessionStorage.setItem("teamSvtLatestFirework", JSON.stringify(payload));
          sessionStorage.setItem("teamSvtFireworkArchive", JSON.stringify(compactArchive));
        } catch (error) {
          // The in-memory boot data below still carries this firework into the universe page.
        }
        try {
          await FireworkData.save(payload);
        } catch (error) {
         showUniverseUploadError(error);
          return;
        }
        openBundledUniverse(runtimeData);
      }

      function addMyFireworkToSky() {
        const existing = sharedFireworks.find((firework) => firework.id === "mine");
        const message = getFinalMessage();
        if (existing) {
          existing.message = message;
          return existing;
        }
        const firework = {
          id: "mine",
          x: 0,
          y: 0,
          color: "#f7b7cf",
          name: "我的花火",
          song: songProfiles[state.selectedSong].title,
          message,
        };
        sharedFireworks.push(firework);
        updateSharedStarCount();
        return firework;
      }

      function updateSharedStarCount() {
        if (sharedStarCount) sharedStarCount.textContent = `${sharedFireworks.length} 發`;
      }

      function showSharedSky() {
        skyModal.classList.remove("is-open");
        document.body.classList.remove("song-mode", "final-mode");
        document.body.classList.add("shared-mode");
        state.launched = false;
        state.shared.offsetX = 0;
        state.shared.offsetY = 0;
        fitCanvases();
        updateSharedStarCount();
        window.scrollTo({ top: 0, behavior: "smooth" });
        stageStatus.textContent = "拖移星空探索不同克拉留下的花火。點擊發光點，即可讀取那一刻的祝福。";
      }

      function showFireworkMessage(firework) {
        document.querySelector("#skyModalTitle").textContent = firework.name;
        skyModal.querySelector("p").textContent = `選曲：${firework.song || songProfiles[state.selectedSong].title}。${firework.message}`;
        document.querySelector("#enterSharedSky").textContent = "繼續看星空";
        skyModal.classList.add("is-open");
      }

      function getSharedPoint(event) {
        const rect = sharedCanvas.getBoundingClientRect();
        return {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      }

      function startSharedDrag(event) {
        if (!document.body.classList.contains("shared-mode")) return;
        const point = getSharedPoint(event);
        state.shared.dragging = true;
        state.shared.lastX = point.x;
        state.shared.lastY = point.y;
        state.shared.dragDistance = 0;
        sharedCanvas.setPointerCapture(event.pointerId);
      }

      function moveSharedDrag(event) {
        if (!state.shared.dragging) return;
        const point = getSharedPoint(event);
        const dx = point.x - state.shared.lastX;
        const dy = point.y - state.shared.lastY;
        state.shared.offsetX += dx;
        state.shared.offsetY += dy;
        state.shared.lastX = point.x;
        state.shared.lastY = point.y;
        state.shared.dragDistance += Math.hypot(dx, dy);
      }

      function endSharedDrag(event) {
        if (!state.shared.dragging) return;
        const point = getSharedPoint(event);
        state.shared.dragging = false;
        if (sharedCanvas.hasPointerCapture(event.pointerId)) sharedCanvas.releasePointerCapture(event.pointerId);
        if (state.shared.dragDistance > 8) return;
        const centerX = sharedCanvas.clientWidth / 2 + state.shared.offsetX;
        const centerY = sharedCanvas.clientHeight / 2 + state.shared.offsetY;
        const hit = sharedFireworks.find((firework) => Math.hypot(point.x - (centerX + firework.x), point.y - (centerY + firework.y)) < 56);
        if (hit) showFireworkMessage(hit);
      }

      function collectFragment() {
        if (!drawingHasPixels()) {
          stageStatus.textContent = "這個碎片還是空的。先畫一點顏色，再投入萬花筒。";
          return;
        }
        const count = state.fragments.length + 1;
        const fragment = addFragmentImage(state.pendingName ? `${state.pendingName}` : `自訂碎片 ${count}`, makeFragmentImage());
        clearDrawing();
        stageStatus.textContent = `${fragment.name} 已投入萬花筒，預覽已自動開始。畫布已清空，可以繼續畫下一個碎片。`;
      }

      function deleteFragment(id) {
        state.fragments = state.fragments.filter((fragment) => fragment.id !== id);
        const card = fragmentCards.get(id);
        if (card) {
          card.remove();
          fragmentCards.delete(id);
        } else {
          renderFragmentList();
        }
        if (!state.fragments.length) state.launched = false;
        if (state.fragments.length) updateFragmentMetas();
        else renderFragmentList();
        stageStatus.textContent = state.fragments.length
          ? "已移除碎片，剩下的碎片仍會自動預覽。"
          : "碎片收集箱空了。先點選已有碎片或自行繪製。";
      }

      function createFragmentCard(fragment, index) {
        const card = document.createElement("div");
        card.className = "fragment-card";
        card.dataset.fragmentId = fragment.id;
        const preview = document.createElement("canvas");
        preview.width = FRAGMENT_PREVIEW_SIZE;
        preview.height = FRAGMENT_PREVIEW_SIZE;
        const previewCtx = preview.getContext("2d");
        previewCtx.fillStyle = "#070f24";
        previewCtx.fillRect(0, 0, preview.width, preview.height);
        previewCtx.drawImage(fragment.image, 0, 0, preview.width, preview.height);
        const text = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = fragment.name;
        const meta = document.createElement("span");
        meta.dataset.role = "fragment-index";
        meta.textContent = `第 ${index + 1} 個元素`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.setAttribute("aria-label", `刪除${fragment.name}`);
        remove.textContent = "×";
        remove.addEventListener("click", () => deleteFragment(fragment.id));
        text.append(name, meta);
        card.append(preview, text, remove);
        return card;
      }

      function updateFragmentMetas() {
        state.fragments.forEach((fragment, index) => {
          const meta = fragmentCards.get(fragment.id)?.querySelector("[data-role='fragment-index']");
          if (meta) meta.textContent = `第 ${index + 1} 個元素`;
        });
      }

      function showEmptyFragmentState() {
        fragmentList.innerHTML = "";
        fragmentCards.clear();
        const empty = document.createElement("p");
        empty.className = "fragment-empty";
        empty.textContent = "尚未收集碎片。點選已有碎片可直接加入，也可以自行繪製後投入。";
        fragmentList.append(empty);
      }

      function appendFragmentCard(fragment, index) {
        if (!state.fragments.length) {
          showEmptyFragmentState();
          return;
        }
        if (!fragmentCards.size) fragmentList.innerHTML = "";
        const card = createFragmentCard(fragment, index);
        fragmentCards.set(fragment.id, card);
        fragmentList.append(card);
      }

      function renderFragmentList() {
        if (!state.fragments.length) {
          showEmptyFragmentState();
          return;
        }
        fragmentList.innerHTML = "";
        fragmentCards.clear();
        state.fragments.forEach((fragment, index) => {
          appendFragmentCard(fragment, index);
        });
      }

      function ensureAudio() {
        if (state.audioContext) return true;
        const AudioEngine = window.AudioContext || window.webkitAudioContext;
        const audioElement = musicPlayer;
        audioElement.loop = true;
        audioElement.preload = "auto";
        audioElement.volume = 1;
        audioElement.muted = false;
        if (!AudioEngine) {
          state.audioElement = audioElement;
          return true;
        }
        const audioContext = new AudioEngine();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.58;
        state.audioContext = audioContext;
        state.audioElement = audioElement;
        try {
          const audioSource = audioContext.createMediaElementSource(audioElement);
          audioSource.connect(analyser);
          analyser.connect(audioContext.destination);
          state.analyser = analyser;
          state.audioSource = audioSource;
          state.audioData = new Uint8Array(analyser.frequencyBinCount);
        } catch {
          state.analyser = null;
          state.audioSource = null;
          state.audioData = null;
        }
        return true;
      }

      function loadSelectedSong() {
        if (!ensureAudio()) return false;
        const song = songProfiles[state.selectedSong];
        const songUrl = new URL(song.audio, window.location.href).href;
        if (state.audioElement.src !== songUrl) {
          state.audioElement.src = songUrl;
          state.audioElement.load();
        }
        return true;
      }

      function playSelectedSong() {
        if (!loadSelectedSong()) return;
        state.audioElement.muted = false;
        state.audioElement.volume = 1;
        if (state.audioContext && state.audioContext.state !== "running") {
          state.audioContext.resume().catch(() => {});
        }
        const playPromise = state.audioElement.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch((error) => {
            stageStatus.textContent = `瀏覽器暫時擋住播放：${error.name || "NotAllowedError"}。請按歌曲播放器的播放鍵；畫面會先用歌曲輪廓模擬頻譜。`;
          });
        }
      }

      function getAudioBands(time) {
        const song = songProfiles[state.selectedSong];
        const bounce = song.bounce ?? 1;
        const sharpenBeat = (value) => Math.pow(Math.max(0, value), song.beatSharpness ?? 2.8);
        const audioTime = state.audioElement && Number.isFinite(state.audioElement.currentTime) && state.audioElement.currentTime > 0
          ? state.audioElement.currentTime
          : time;
        const beat = (audioTime * song.bpm) / 60 + (song.beatOffset || 0);
        const pulseBase = sharpenBeat(0.5 + Math.cos(beat * TAU) * 0.5);
        const offbeatBase = sharpenBeat(0.5 + Math.cos((beat + 0.5) * TAU) * 0.5);
        const tempoBeat = Math.min(1, pulseBase * (song.tempoPulse ?? 0.24) * bounce);
        const smoothBands = (target, amount = 0.34) => {
          const previous = state.bands || { bass: 0.24, mid: 0.24, treble: 0.24, energy: 0.24, beat: 0 };
          const beatHold = 0.68 + Math.min(0.18, bounce * 0.08);
          const bands = {
            bass: previous.bass + (target.bass - previous.bass) * amount,
            mid: previous.mid + (target.mid - previous.mid) * amount,
            treble: previous.treble + (target.treble - previous.treble) * amount,
            energy: previous.energy + (target.energy - previous.energy) * amount,
            beat: Math.max((previous.beat || 0) * beatHold, Math.min(1, target.beat || 0)),
          };
          state.bands = bands;
          return bands;
        };
        if (state.analyser && state.audioData && state.audioElement && !state.audioElement.paused) {
          state.analyser.getByteFrequencyData(state.audioData);
          const average = (from, to) => {
            let total = 0;
            let count = 0;
            for (let i = from; i < to; i += 1) {
              total += state.audioData[i] || 0;
              count += 1;
            }
            return count ? total / count / 255 : 0;
          };
          const bassRaw = average(0, 12);
          const midRaw = average(12, 54);
          const trebleRaw = average(54, state.audioData.length);
          const rawEnergy = bassRaw * 0.52 + midRaw * 0.3 + trebleRaw * 0.18;
          if (rawEnergy > 0.012) {
            const transient = Math.max(0, rawEnergy - state.lastAudioEnergy * 0.9);
            state.lastAudioEnergy = state.lastAudioEnergy * 0.72 + rawEnergy * 0.28;
            const audioBeat = Math.min(1, (transient * 4.2 + bassRaw * 0.34) * bounce);
            const beat = Math.max(audioBeat, tempoBeat);
            const bass = Math.min(1, 0.1 + bassRaw * 2.05 + beat * 0.18 * bounce);
            const mid = Math.min(1, 0.1 + midRaw * 1.8 + beat * 0.1 * bounce);
            const treble = Math.min(1, 0.08 + trebleRaw * 2.2);
            const energy = Math.min(1, rawEnergy * 2.1 + beat * 0.24 * bounce);
            return smoothBands({ bass, mid, treble, energy, beat }, song.response ?? (0.22 + Math.min(0.12, bounce * 0.06)));
          }
        }
        const pulse = Math.min(1, pulseBase * bounce);
        const offbeat = Math.min(1, offbeatBase * bounce);
        const phrase = 0.5 + Math.sin(beat * TAU / 4) * 0.5;
        const shimmer = 0.5 + Math.sin(time * (5.4 + song.sparkle * 2.4)) * 0.5;
        const bass = Math.min(1, 0.12 + song.bass * (0.34 + pulse * 0.46 + phrase * 0.16));
        const mid = Math.min(1, 0.14 + song.mid * (0.38 + offbeat * 0.28 + Math.sin(time * 2.1) * 0.08));
        const treble = Math.min(1, 0.12 + song.treble * (0.32 + shimmer * 0.46 + pulse * 0.08));
        const energy = Math.min(1, bass * 0.5 + mid * 0.25 + treble * 0.25);
        return smoothBands({ bass, mid, treble, energy, beat: Math.max(pulse, offbeat * 0.5) }, 0.24);
      }

      function fitPatternCanvas(width, height) {
        const canvasWidth = Math.max(1, Math.round(width));
        const canvasHeight = Math.max(1, Math.round(height));
        if (patternCanvas.width !== canvasWidth || patternCanvas.height !== canvasHeight) {
          patternCanvas.width = canvasWidth;
          patternCanvas.height = canvasHeight;
        }
        patternCtx.setTransform(1, 0, 0, 1, 0, 0);
        patternCtx.clearRect(0, 0, patternCanvas.width, patternCanvas.height);
      }

      function drawPatternSeed(width, height, radius, angle, elapsed, bands, visibleFragments) {
        fitPatternCanvas(width, height);
        const cx = width / 2;
        const cy = height / 2;
        patternCtx.save();
        patternCtx.globalCompositeOperation = "screen";
        patternCtx.translate(cx, cy);

        const glintCount = 36;
        for (let glint = 0; glint < glintCount; glint += 1) {
          const glintAngle = glint * 2.399963 + elapsed * 0.04;
          const glintRadius = radius * (0.1 + ((glint * 37) % 100) / 128);
          const x = Math.cos(glintAngle) * glintRadius;
          const y = Math.sin(glintAngle) * glintRadius;
          const alpha = 0.08 + ((glint * 17) % 26) / 120;
          patternCtx.fillStyle = glint % 2 ? `rgba(247,183,207,${alpha})` : `rgba(155,188,255,${alpha})`;
          patternCtx.beginPath();
          patternCtx.arc(x, y, 1.4 + (glint % 3) * 0.7, 0, TAU);
          patternCtx.fill();
        }

        const beamCount = 9;
        for (let beam = 0; beam < beamCount; beam += 1) {
          const beamAngle = beam * 1.9416 + elapsed * (0.018 + bands.mid * 0.018 + bands.beat * 0.025);
          const band = beam % 2 === 0 ? bands.treble : bands.mid;
          const inner = radius * (0.04 + ((beam * 11) % 8) / 100);
          const outer = radius * (0.34 + ((beam * 19) % 48) / 100 + band * 0.14);
          const gradient = patternCtx.createLinearGradient(Math.cos(beamAngle) * inner, Math.sin(beamAngle) * inner, Math.cos(beamAngle) * outer, Math.sin(beamAngle) * outer);
          gradient.addColorStop(0, `rgba(247,183,207,${0.025 + band * 0.045})`);
          gradient.addColorStop(0.52, `rgba(155,188,255,${0.022 + band * 0.05})`);
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          patternCtx.strokeStyle = gradient;
          patternCtx.lineWidth = 0.55 + band * 1.15 + bands.beat * 1.2;
          patternCtx.beginPath();
          patternCtx.moveTo(Math.cos(beamAngle) * inner, Math.sin(beamAngle) * inner);
          patternCtx.lineTo(Math.cos(beamAngle) * outer, Math.sin(beamAngle) * outer);
          patternCtx.stroke();
        }

        patternCtx.save();
        patternCtx.beginPath();
        patternCtx.moveTo(0, 0);
        patternCtx.arc(0, 0, radius, -angle / 2, angle / 2);
        patternCtx.closePath();
        patternCtx.clip();

        const density = state.density || 1.2;
        const songMotion = songProfiles[state.selectedSong]?.motion ?? 1;
        const streamCount = Math.max(12, Math.round(10 + density * 9));
        for (let streamIndex = 0; streamIndex < streamCount; streamIndex += 1) {
          const seedA = ((streamIndex * 29) % 100) / 100;
          const seedB = ((streamIndex * 47) % 100) / 100;
          const stream = (elapsed * (0.18 + bands.mid * 0.08) * songMotion + seedB + streamIndex * 0.061) % 1;
          const eased = 1 - Math.pow(1 - stream, 1.8);
          const fade = Math.sin(stream * Math.PI);
          const streamAngle = -angle / 2 + angle * (0.08 + seedA * 0.84) + Math.sin(stream * TAU + seedB * TAU) * angle * 0.12;
          const inner = radius * state.spread * (0.05 + eased * 0.34);
          const outer = radius * state.spread * (0.18 + eased * (0.58 + density * 0.06));
          const gradient = patternCtx.createLinearGradient(Math.cos(streamAngle) * inner, Math.sin(streamAngle) * inner, Math.cos(streamAngle) * outer, Math.sin(streamAngle) * outer);
          gradient.addColorStop(0, "rgba(255,255,255,0)");
          gradient.addColorStop(0.38, `rgba(247,183,207,${fade * (0.014 + bands.treble * 0.018)})`);
          gradient.addColorStop(1, `rgba(155,188,255,${fade * (0.018 + bands.mid * 0.024)})`);
          patternCtx.strokeStyle = gradient;
          patternCtx.lineWidth = 0.35 + fade * (0.72 + bands.bass * 0.8);
          patternCtx.beginPath();
          patternCtx.moveTo(Math.cos(streamAngle) * inner, Math.sin(streamAngle) * inner);
          patternCtx.lineTo(Math.cos(streamAngle) * outer, Math.sin(streamAngle) * outer);
          patternCtx.stroke();
        }

        visibleFragments.forEach((fragment, index) => {
          const maxCopies = Math.min(MAX_FRAGMENT_COPIES + 3, 5 + Math.round(density * 6));
          const copyCount = Math.min(Math.round(fragment.copies * (0.58 + density * 0.48)) + 2, MAX_FRAGMENT_COPIES + 3);
          const drawnCopies = Math.max(4, Math.min(copyCount, maxCopies));
          for (let copy = 0; copy < drawnCopies; copy += 1) {
            const seedA = ((copy * 37 + index * 19) % 100) / 100;
            const seedB = ((copy * 23 + index * 41) % 100) / 100;
            const flowSpeed = (0.16 + fragment.orbit * 0.045 + bands.mid * 0.05) * songMotion;
            const stream = (elapsed * flowSpeed + seedB + index * 0.137 + copy * 0.071) % 1;
            const eased = 1 - Math.pow(1 - stream, 1.7);
            const fade = Math.sin(stream * Math.PI);
            const spiral = Math.sin(stream * TAU + fragment.phase + copy * 0.4) * angle * (0.1 + density * 0.03);
            const sliceAngle = -angle / 2 + angle * (0.12 + seedA * 0.76) + spiral;
            const distance = radius * state.spread * (0.06 + eased * (0.62 + density * 0.08) + bands.beat * 0.018);
            const x = Math.cos(sliceAngle) * distance;
            const y = Math.sin(sliceAngle) * distance;
            const size = Math.min(radius * 0.16, 118) * fragment.size * (0.42 + fade * 0.52 + ((copy + index) % 5) * 0.04 + density * 0.045 + bands.bass * 0.08 + bands.beat * 0.06);
            patternCtx.save();
            patternCtx.translate(x, y);
            patternCtx.rotate(fragment.angle + copy * 0.73 + stream * TAU * 0.16 + elapsed * fragment.spin * (0.18 + bands.mid * 0.08) * songMotion);
            patternCtx.globalAlpha = (0.22 + fade * 0.48) * (0.86 + bands.energy * 0.28 + bands.beat * 0.12);
            patternCtx.drawImage(fragment.image, -size / 2, -size / 2, size, size);
            patternCtx.restore();
          }
        });
        patternCtx.restore();
        patternCtx.restore();
      }

      function drawIdleCenter(cx, cy, radius) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = "rgba(155,188,255,0.28)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.arc(0, 0, radius * (0.13 + i * 0.1), 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawMirrorSeams(cx, cy, radius, angle, energy) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < state.segments; i += 1) {
          if (i % 2 !== 0) continue;
          const seamAngle = i * angle + state.rotation;
          const gradient = ctx.createLinearGradient(0, 0, Math.cos(seamAngle) * radius, Math.sin(seamAngle) * radius);
          gradient.addColorStop(0, "rgba(255,255,255,0.1)");
          gradient.addColorStop(0.38, `rgba(155,188,255,${0.05 + energy * 0.08})`);
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(seamAngle) * radius, Math.sin(seamAngle) * radius);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawSpectrumFireworks(cx, cy, radius, elapsed, bands) {
        if (!state.launched) return;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = "screen";
        const burstCount = Math.max(36, state.segments * 2);
        for (let i = 0; i < burstCount; i += 1) {
          const ratio = i / burstCount;
          const spokeAngle = ratio * TAU + state.rotation * 0.16 + Math.sin(elapsed * 0.42 + i) * 0.018;
          const band = i % 3 === 0 ? bands.bass : i % 3 === 1 ? bands.mid : bands.treble;
          const bloom = bands.energy * 0.18 + bands.beat * 0.08;
          const inner = radius * (0.08 + bands.bass * 0.05);
          const outer = radius * (0.22 + band * 0.34 + bloom + Math.sin(elapsed * 1.1 + i) * 0.024);
          const gradient = ctx.createLinearGradient(Math.cos(spokeAngle) * inner, Math.sin(spokeAngle) * inner, Math.cos(spokeAngle) * outer, Math.sin(spokeAngle) * outer);
          gradient.addColorStop(0, `rgba(247,183,207,${0.02 + band * 0.08})`);
          gradient.addColorStop(0.52, `rgba(155,188,255,${0.05 + band * 0.16})`);
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.8 + band * 2.8 + bands.beat * 0.8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(spokeAngle) * inner, Math.sin(spokeAngle) * inner);
          ctx.lineTo(Math.cos(spokeAngle) * outer, Math.sin(spokeAngle) * outer);
          ctx.stroke();
        }
        for (let ring = 0; ring < 5; ring += 1) {
          const band = ring % 2 === 0 ? bands.bass : bands.treble;
          const drift = (elapsed * (0.055 + bands.mid * 0.045) + ring / 5) % 1;
          ctx.strokeStyle = `rgba(${ring % 2 === 0 ? "247,183,207" : "155,188,255"},${(1 - drift) * (0.05 + band * 0.13)})`;
          ctx.lineWidth = 1 + band * 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, radius * (0.08 + drift * (0.72 + bands.energy * 0.14)), 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawCenterBloom(cx, cy, radius, elapsed, bands, visibleFragments) {
        if (!state.launched || !state.fragments.length) return;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = "screen";
        const waveCount = 4;
        for (let wave = 0; wave < waveCount; wave += 1) {
          const progress = (elapsed * (0.16 + bands.mid * 0.18) + wave / waveCount) % 1;
          const waveRadius = radius * (0.08 + progress * 0.82);
          const alpha = (1 - progress) * (0.1 + bands.treble * 0.24);
          const gradient = ctx.createRadialGradient(0, 0, waveRadius * 0.18, 0, 0, waveRadius);
          gradient.addColorStop(0, `rgba(247,183,207,${alpha * 0.18})`);
          gradient.addColorStop(0.54, `rgba(155,188,255,${alpha})`);
          gradient.addColorStop(1, "rgba(155,188,255,0)");
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2 + bands.bass * 8;
          ctx.beginPath();
          ctx.arc(0, 0, waveRadius, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawSharedFirework(firework, elapsed) {
        const x = sharedCanvas.clientWidth / 2 + state.shared.offsetX + firework.x;
        const y = sharedCanvas.clientHeight / 2 + state.shared.offsetY + firework.y;
        const pulse = 0.72 + Math.sin(elapsed * 2.4 + firework.x * 0.01) * 0.18;
        sharedCtx.save();
        sharedCtx.translate(x, y);
        sharedCtx.globalCompositeOperation = "screen";
        for (let ring = 0; ring < 3; ring += 1) {
          sharedCtx.strokeStyle = ring % 2 ? "rgba(155,188,255,0.34)" : `${firework.color}88`;
          sharedCtx.lineWidth = 1.4 + ring;
          sharedCtx.beginPath();
          sharedCtx.arc(0, 0, 20 + ring * 12 + pulse * 8, 0, TAU);
          sharedCtx.stroke();
        }
        for (let i = 0; i < 18; i += 1) {
          const angle = (i * TAU) / 18 + elapsed * 0.18;
          const length = 32 + pulse * 26 + (i % 3) * 8;
          const gradient = sharedCtx.createLinearGradient(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
          gradient.addColorStop(0, `${firework.color}aa`);
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          sharedCtx.strokeStyle = gradient;
          sharedCtx.lineWidth = i % 4 === 0 ? 3 : 1.4;
          sharedCtx.beginPath();
          sharedCtx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
          sharedCtx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
          sharedCtx.stroke();
        }
        sharedCtx.restore();
      }

      function renderSharedSky(elapsed) {
        if (!document.body.classList.contains("shared-mode")) return;
        const width = sharedCanvas.clientWidth || 1;
        const height = sharedCanvas.clientHeight || 1;
        sharedCtx.clearRect(0, 0, width, height);
        const bg = sharedCtx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, "#020712");
        bg.addColorStop(0.55, "#071226");
        bg.addColorStop(1, "#101436");
        sharedCtx.fillStyle = bg;
        sharedCtx.fillRect(0, 0, width, height);
        for (let i = 0; i < 120; i += 1) {
          const x = (i * 97 + state.shared.offsetX * 0.18) % (width + 80) - 40;
          const y = (i * 53 + state.shared.offsetY * 0.18) % (height + 80) - 40;
          const alpha = 0.16 + ((i * 13) % 30) / 100;
          sharedCtx.fillStyle = i % 2 ? `rgba(247,183,207,${alpha})` : `rgba(155,188,255,${alpha})`;
          sharedCtx.beginPath();
          sharedCtx.arc(x, y, 1 + (i % 3) * 0.6, 0, TAU);
          sharedCtx.fill();
        }
        const centerX = width / 2 + state.shared.offsetX;
        const centerY = height / 2 + state.shared.offsetY;
        const nebula = sharedCtx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 520);
        nebula.addColorStop(0, "rgba(155,188,255,0.16)");
        nebula.addColorStop(0.55, "rgba(247,183,207,0.08)");
        nebula.addColorStop(1, "rgba(0,0,0,0)");
        sharedCtx.fillStyle = nebula;
        sharedCtx.beginPath();
        sharedCtx.arc(centerX, centerY, 520, 0, TAU);
        sharedCtx.fill();
        sharedCtx.save();
        sharedCtx.translate(centerX, centerY);
        sharedCtx.strokeStyle = "rgba(255,255,255,0.05)";
        sharedCtx.lineWidth = 1;
        sharedCtx.beginPath();
        for (let i = 0; i < sharedFireworks.length; i += 1) {
          for (let j = i + 1; j < sharedFireworks.length; j += 1) {
            const a = sharedFireworks[i];
            const b = sharedFireworks[j];
            if (Math.hypot(a.x - b.x, a.y - b.y) < 230) {
              sharedCtx.moveTo(a.x, a.y);
              sharedCtx.lineTo(b.x, b.y);
            }
          }
        }
        sharedCtx.stroke();
        sharedCtx.restore();
        sharedFireworks.forEach((firework) => drawSharedFirework(firework, elapsed));
      }

      function render(timeStamp = 0) {
        const width = canvas.clientWidth || 1;
        const height = canvas.clientHeight || 1;
        const elapsed = timeStamp * 0.001;
        const visualizerMode = document.body.classList.contains("song-mode") || document.body.classList.contains("final-mode");
        const bands = visualizerMode
          ? getAudioBands(elapsed)
          : { bass: 0.18, mid: 0.18, treble: 0.18, energy: 0.18, beat: 0 };
        const energy = bands.energy;
        const beatPulse = bands.beat || 0;
        const direction = state.speed < 0 ? -1 : 1;
        const delta = state.lastRenderTime ? Math.min(0.05, Math.max(0.001, (timeStamp - state.lastRenderTime) * 0.001)) : 1 / 60;
        state.lastRenderTime = timeStamp;
        const songMotion = songProfiles[state.selectedSong]?.motion ?? 1;
        const motionScale = (Math.min(1, Math.abs(state.speed) / 40) * 0.78 + (visualizerMode ? energy * 0.2 : 0)) * songMotion;
        const motionElapsed = elapsed * motionScale * direction;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#030916";
        ctx.fillRect(0, 0, width, height);
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.hypot(width, height) * 0.72;
        const angle = TAU / state.segments;
        const renderedFragments = state.fragments.length > MAX_RENDERED_FRAGMENTS
          ? Array.from({ length: MAX_RENDERED_FRAGMENTS }, (_, index) => {
              const offset = Math.floor(elapsed * 0.7) % state.fragments.length;
              return state.fragments[(offset + index) % state.fragments.length];
            })
          : state.fragments;
        state.rotation += state.speed * delta * 0.035 * (visualizerMode ? (0.72 + energy * 0.82) * songMotion : 0.54);
        ctx.save();
        ctx.filter = `saturate(${state.saturation + (visualizerMode ? bands.treble * 24 : 0)}%) contrast(${116 + (visualizerMode ? bands.bass * 18 : 0)}%)`;
        if (state.launched && state.fragments.length) {
          drawPatternSeed(width, height, radius, angle, motionElapsed, bands, renderedFragments);
        }
        ctx.translate(cx, cy);
        ctx.rotate(state.rotation);
        for (let i = 0; i < state.segments; i += 1) {
          ctx.save();
          ctx.rotate(i * angle);
          if (i % 2 === 1) ctx.scale(1, -1);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius, -angle / 2, angle / 2);
          ctx.closePath();
          ctx.clip();
          if (state.launched && state.fragments.length) {
            ctx.drawImage(patternCanvas, -cx, -cy, width, height);
          } else {
            drawIdleCenter(0, 0, radius);
          }
          ctx.restore();
        }
        ctx.restore();
        if (visualizerMode && state.launched && state.fragments.length) {
          drawMirrorSeams(cx, cy, radius, angle, energy + beatPulse * 0.7);
          drawSpectrumFireworks(cx, cy, radius, motionElapsed, bands);
          drawCenterBloom(cx, cy, radius, motionElapsed, bands, renderedFragments);
        }
        if (!document.body.classList.contains("song-mode")) {
          const glow = ctx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius * 0.67);
          glow.addColorStop(0, `rgba(247,183,207,${0.08 + (visualizerMode ? energy * 0.04 : 0)})`);
          glow.addColorStop(0.62, `rgba(155,188,255,${0.06 + (visualizerMode ? energy * 0.05 : 0)})`);
          glow.addColorStop(1, "rgba(0,0,0,0.74)");
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, width, height);
        }
        if (document.body.classList.contains("final-mode")) drawFinalPreview(motionElapsed);
        renderSharedSky(elapsed);
        requestAnimationFrame(render);
      }

      function fitCanvases() {
        resizeCanvas(canvas, ctx, canvas.clientWidth, canvas.clientHeight);
        resizeCanvas(sharedCanvas, sharedCtx, sharedCanvas.clientWidth, sharedCanvas.clientHeight);
        resizeCanvas(drawCanvas, drawCtx, drawCanvas.clientWidth, drawCanvas.clientHeight);
        setDrawingDefaults();
      }

      Object.values(controls).forEach((control) => {
        control.addEventListener("input", updateStateFromControls);
        control.addEventListener("change", updateStateFromControls);
      });
      brushColor.addEventListener("input", setDrawingDefaults);
      brushSize.addEventListener("input", setDrawingDefaults);
      document.querySelector("#enterMaker").addEventListener("click", () => {
        document.body.classList.remove("intro-mode");
        fitCanvases();
        window.scrollTo({ top: 0, behavior: "smooth" });
        stageStatus.textContent = "預覽在這裡。點選下方已有碎片可加入收集箱，也可以選「繪製」自訂碎片。";
      });
      document.querySelector("#enterUniverse").addEventListener("click", () => {
        openBundledUniverse();
      });
      drawCanvas.addEventListener("pointerdown", startDrawing);
      drawCanvas.addEventListener("pointermove", drawStroke);
      drawCanvas.addEventListener("pointerup", stopDrawing);
      drawCanvas.addEventListener("pointercancel", stopDrawing);
      document.querySelector("#undoStroke").addEventListener("click", undoDrawing);
      document.querySelector("#clearDrawing").addEventListener("click", clearDrawing);
      document.querySelector("#collectFragment").addEventListener("click", collectFragment);
      document.querySelector("#chooseSong").addEventListener("click", showSongPage);
      document.querySelector("#backToMaker").addEventListener("click", showMakerPage);
      document.querySelector("#launchFromSong").addEventListener("click", bloomFireworks);
      document.querySelector("#savePostcard").addEventListener("click", savePostcard);
      document.querySelector("#sendToSky").addEventListener("click", sendToUniverse);
      document.querySelector("#addDemoFirework").addEventListener("click", makeAnotherFirework);
      document.querySelector("#enterSharedSky").addEventListener("click", () => {
        if (document.body.classList.contains("shared-mode")) {
          skyModal.classList.remove("is-open");
        } else {
          showSharedSky();
        }
      });
      document.querySelector("#backToFinal")?.addEventListener("click", makeAnotherFirework);
      skyModal.addEventListener("click", (event) => {
        if (event.target === skyModal) skyModal.classList.remove("is-open");
      });
      sharedCanvas.addEventListener("pointerdown", startSharedDrag);
      sharedCanvas.addEventListener("pointermove", moveSharedDrag);
      sharedCanvas.addEventListener("pointerup", endSharedDrag);
      sharedCanvas.addEventListener("pointercancel", endSharedDrag);
      canvas.addEventListener("pointermove", (event) => {
        if (event.buttons) state.rotation += event.movementX * 0.008;
      });
      window.addEventListener("resize", fitCanvases);
      const openMakerOnLoad = window.location.hash === "#maker" || new URLSearchParams(window.location.search).has("maker");
      if (openMakerOnLoad) {
        document.body.classList.remove("intro-mode", "song-mode", "final-mode", "shared-mode");
        state.launched = false;
      }
      updateStateFromControls();
      fitCanvases();
      renderPresetGrid();
      renderSongGrid();
      renderFragmentList();
      if (openMakerOnLoad) {
        stageStatus.textContent = "預覽在這裡。點選下方已有碎片可加入收集箱，也可以選「繪製」自訂碎片。";
        requestAnimationFrame(fitCanvases);
        try {
          history.replaceState(null, "", window.location.pathname);
        } catch (error) {
          window.location.hash = "";
        }
      }
      requestAnimationFrame(render);
    
})();
