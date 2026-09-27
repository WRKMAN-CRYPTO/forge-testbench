(() => {
  'use strict';

  const STORAGE_KEY = 'hush-map:v1';
  const canvas = document.getElementById('room');
  const ctx = canvas.getContext('2d', { alpha: false });
  const tools = [...document.querySelectorAll('[data-mode]')];
  const modeLabel = document.getElementById('modeLabel');
  const impactLabel = document.getElementById('impactLabel');
  const hint = document.getElementById('hint');
  const findBtn = document.getElementById('findBtn');
  const applyBtn = document.getElementById('applyBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const clearBtn = document.getElementById('clearBtn');
  const aboutBtn = document.getElementById('aboutBtn');
  const closeAboutBtn = document.getElementById('closeAboutBtn');
  const aboutDialog = document.getElementById('aboutDialog');

  let dpr = 1;
  let viewW = 1;
  let viewH = 1;
  let state = loadState();
  let drag = null;
  let wallStart = null;
  let suggestion = null;
  let nextId = 1 + Math.max(0, ...state.points.map(p => Number(p.id) || 0));

  function blankState() {
    return { mode: 'move', points: [], walls: [], selectedId: null };
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || !Array.isArray(raw.points) || !Array.isArray(raw.walls)) return blankState();
      return {
        mode: ['move', 'quiet', 'noise', 'wall'].includes(raw.mode) ? raw.mode : 'move',
        points: raw.points.filter(p => p && ['quiet', 'noise'].includes(p.type) && finite01(p.x) && finite01(p.y)).slice(0, 20),
        walls: raw.walls.filter(w => w && finite01(w.x1) && finite01(w.y1) && finite01(w.x2) && finite01(w.y2)).slice(0, 20),
        selectedId: raw.selectedId ?? null
      };
    } catch {
      return blankState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  function finite01(v) {
    return Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function roomBounds() {
    const pad = Math.max(17, Math.min(viewW, viewH) * 0.045);
    return { x: pad, y: pad, w: viewW - pad * 2, h: viewH - pad * 2 };
  }

  function toPx(x, y) {
    const b = roomBounds();
    return { x: b.x + x * b.w, y: b.y + y * b.h };
  }

  function toNorm(px, py) {
    const b = roomBounds();
    return { x: clamp((px - b.x) / b.w, 0, 1), y: clamp((py - b.y) / b.h, 0, 1) };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = Math.max(1, r.width);
    viewH = Math.max(1, r.height);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function pointById(id) {
    return state.points.find(p => p.id === id) || null;
  }

  function selectedNoise() {
    const p = pointById(state.selectedId);
    return p && p.type === 'noise' ? p : null;
  }

  function setMode(mode) {
    state.mode = mode;
    wallStart = null;
    suggestion = null;
    applyBtn.classList.add('hidden');
    tools.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    modeLabel.textContent = mode.toUpperCase();
    hint.textContent = mode === 'quiet' ? 'Tap the room where quiet matters.' : mode === 'noise' ? 'Tap the room to place a noise source.' : mode === 'wall' ? 'Tap two points to draw a barrier.' : 'Drag points. Tap a noise source to select it.';
    saveState();
    draw();
  }

  function orientation(a, b, c) {
    return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  }

  function segmentCrossesWall(ax, ay, bx, by, wall) {
    const a = { x: ax, y: ay }, b = { x: bx, y: by };
    const c = { x: wall.x1, y: wall.y1 }, d = { x: wall.x2, y: wall.y2 };
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    return (o1 === 0 || o2 === 0 || o1 * o2 < 0) && (o3 === 0 || o4 === 0 || o3 * o4 < 0);
  }

  function pairImpact(source, target, sx = source.x, sy = source.y) {
    const dx = sx - target.x;
    const dy = sy - target.y;
    const d = Math.max(0.055, Math.hypot(dx, dy));
    let v = 1 / Math.pow(d + 0.075, 1.55);
    let crossings = 0;
    for (const wall of state.walls) if (segmentCrossesWall(sx, sy, target.x, target.y, wall)) crossings += 1;
    if (crossings) v *= Math.pow(0.42, Math.min(3, crossings));
    return v;
  }

  function totalImpactForSource(source, sx = source.x, sy = source.y) {
    const quiets = state.points.filter(p => p.type === 'quiet');
    if (!quiets.length) return 0;
    return quiets.reduce((sum, q) => sum + pairImpact(source, q, sx, sy), 0) / quiets.length;
  }

  function roomImpactAt(x, y) {
    const noises = state.points.filter(p => p.type === 'noise');
    if (!noises.length) return 0;
    return noises.reduce((sum, n) => {
      const fakeTarget = { x, y };
      return sum + pairImpact(n, fakeTarget);
    }, 0);
  }

  function normalizedImpact() {
    const quiets = state.points.filter(p => p.type === 'quiet');
    const noises = state.points.filter(p => p.type === 'noise');
    if (!quiets.length || !noises.length) return null;
    const total = noises.reduce((sum, n) => sum + totalImpactForSource(n), 0) / noises.length;
    return Math.round(clamp((Math.log1p(total) / 3.05) * 100, 0, 100));
  }

  function findBestSpot(source) {
    const quiets = state.points.filter(p => p.type === 'quiet');
    if (!source || !quiets.length) return null;
    let best = null;
    const steps = 24;
    for (let iy = 1; iy < steps; iy++) {
      for (let ix = 1; ix < steps; ix++) {
        const x = ix / steps;
        const y = iy / steps;
        let tooClose = false;
        for (const p of state.points) {
          if (p.id !== source.id && Math.hypot(p.x - x, p.y - y) < 0.055) { tooClose = true; break; }
        }
        if (tooClose) continue;
        const score = totalImpactForSource(source, x, y);
        if (!best || score < best.score) best = { x, y, score };
      }
    }
    return best;
  }

  function currentVsSuggestedText(source, best) {
    const current = totalImpactForSource(source);
    if (!best || current <= 0) return 'No quieter placement found.';
    const gain = Math.round(clamp((1 - best.score / current) * 100, 0, 99));
    return gain < 4 ? 'Current spot is already near the room’s best zone.' : `About ${gain}% lower relative impact in this model.`;
  }

  function drawGrid(b) {
    ctx.save();
    ctx.strokeStyle = '#1f2b26';
    ctx.lineWidth = 1;
    const cols = 10, rows = 12;
    for (let i = 1; i < cols; i++) {
      const x = b.x + (b.w * i / cols);
      ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke();
    }
    for (let i = 1; i < rows; i++) {
      const y = b.y + (b.h * i / rows);
      ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHeat(b) {
    if (!state.points.some(p => p.type === 'noise')) return;
    const cols = 30;
    const rows = Math.max(26, Math.round(cols * b.h / b.w));
    const cw = b.w / cols, ch = b.h / rows;
    let max = 0.001;
    const vals = new Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = (i + .5) / cols, y = (j + .5) / rows;
      const v = roomImpactAt(x, y);
      vals[j * cols + i] = v;
      if (v > max) max = v;
    }
    ctx.save();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const t = clamp(Math.log1p(vals[j * cols + i]) / Math.log1p(max), 0, 1);
      if (t < .06) continue;
      const hue = 115 - t * 100;
      ctx.fillStyle = `hsla(${hue},78%,54%,${0.08 + t * 0.29})`;
      ctx.fillRect(b.x + i * cw, b.y + j * ch, cw + 1, ch + 1);
    }
    ctx.restore();
  }

  function drawWalls() {
    ctx.save();
    ctx.lineCap = 'round';
    for (const wall of state.walls) {
      const a = toPx(wall.x1, wall.y1), b = toPx(wall.x2, wall.y2);
      ctx.strokeStyle = '#c9aa70';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = '#3c3323';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    if (wallStart) {
      const a = toPx(wallStart.x, wallStart.y);
      ctx.fillStyle = '#f1c56f';
      ctx.beginPath(); ctx.arc(a.x, a.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPoint(p) {
    const q = toPx(p.x, p.y);
    const selected = p.id === state.selectedId;
    ctx.save();
    if (selected) {
      ctx.strokeStyle = '#f8f2da';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(q.x, q.y, 18, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = p.type === 'noise' ? '#ff825e' : '#71c9ff';
    ctx.beginPath(); ctx.arc(q.x, q.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#08100c';
    ctx.font = '900 11px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.type === 'noise' ? 'N' : 'Q', q.x, q.y + .5);
    ctx.restore();
  }

  function drawSuggestion() {
    if (!suggestion) return;
    const q = toPx(suggestion.x, suggestion.y);
    ctx.save();
    ctx.strokeStyle = '#85d36c';
    ctx.fillStyle = '#85d36c22';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(q.x, q.y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '900 10px ui-sans-serif, system-ui';
    ctx.fillStyle = '#dff8d5';
    ctx.textAlign = 'center';
    ctx.fillText('BETTER', q.x, q.y - 29);
    ctx.restore();
  }

  function draw() {
    const b = roomBounds();
    ctx.fillStyle = '#0b100e';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#101713';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    drawHeat(b);
    drawGrid(b);
    ctx.strokeStyle = '#46554e';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    drawWalls();
    state.points.forEach(drawPoint);
    drawSuggestion();
    updateHud();
  }

  function updateHud() {
    const impact = normalizedImpact();
    impactLabel.textContent = impact == null ? '—' : impact <= 25 ? `${impact} / LOW` : impact <= 55 ? `${impact} / MED` : `${impact} / HIGH`;
    hint.classList.toggle('hide', state.points.length > 1 && state.mode === 'move');
    deleteBtn.classList.toggle('hidden', !pointById(state.selectedId));
  }

  function pointerPos(event) {
    const r = canvas.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }

  function hitPoint(px, py) {
    let best = null, bestD = 25;
    for (const p of state.points) {
      const q = toPx(p.x, p.y);
      const d = Math.hypot(px - q.x, py - q.y);
      if (d < bestD) { best = p; bestD = d; }
    }
    return best;
  }

  function insideRoom(px, py) {
    const b = roomBounds();
    return px >= b.x && py >= b.y && px <= b.x + b.w && py <= b.y + b.h;
  }

  function addPoint(type, norm) {
    if (state.points.length >= 20) return;
    const p = { id: nextId++, type, x: norm.x, y: norm.y };
    state.points.push(p);
    state.selectedId = type === 'noise' ? p.id : state.selectedId;
    suggestion = null;
    applyBtn.classList.add('hidden');
    saveState();
    draw();
  }

  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    const pos = pointerPos(event);
    if (!insideRoom(pos.x, pos.y)) return;
    const norm = toNorm(pos.x, pos.y);

    if (state.mode === 'quiet' || state.mode === 'noise') {
      addPoint(state.mode, norm);
      if (navigator.vibrate) navigator.vibrate(10);
      return;
    }

    if (state.mode === 'wall') {
      if (!wallStart) {
        wallStart = norm;
      } else {
        if (Math.hypot(norm.x - wallStart.x, norm.y - wallStart.y) > 0.035) {
          state.walls.push({ x1: wallStart.x, y1: wallStart.y, x2: norm.x, y2: norm.y });
          saveState();
        }
        wallStart = null;
      }
      suggestion = null;
      applyBtn.classList.add('hidden');
      draw();
      return;
    }

    const hit = hitPoint(pos.x, pos.y);
    if (hit) {
      state.selectedId = hit.id;
      drag = { id: hit.id, pointerId: event.pointerId };
      canvas.setPointerCapture(event.pointerId);
      suggestion = null;
      applyBtn.classList.add('hidden');
      saveState();
      draw();
    } else {
      state.selectedId = null;
      suggestion = null;
      applyBtn.classList.add('hidden');
      saveState();
      draw();
    }
  });

  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const pos = pointerPos(event);
    const norm = toNorm(pos.x, pos.y);
    const p = pointById(drag.id);
    if (p) { p.x = norm.x; p.y = norm.y; draw(); }
  });

  function endDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    saveState();
    draw();
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', event => event.preventDefault());

  tools.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

  findBtn.addEventListener('click', () => {
    const source = selectedNoise() || state.points.find(p => p.type === 'noise') || null;
    const quiets = state.points.filter(p => p.type === 'quiet');
    if (!source || !quiets.length) {
      hint.textContent = !quiets.length ? 'Add at least one QUIET target first.' : 'Add a NOISE source first.';
      hint.classList.remove('hide');
      return;
    }
    state.selectedId = source.id;
    suggestion = findBestSpot(source);
    if (!suggestion) return;
    hint.textContent = currentVsSuggestedText(source, suggestion);
    hint.classList.remove('hide');
    applyBtn.classList.remove('hidden');
    saveState();
    draw();
  });

  applyBtn.addEventListener('click', () => {
    const source = selectedNoise();
    if (!source || !suggestion) return;
    source.x = suggestion.x;
    source.y = suggestion.y;
    suggestion = null;
    applyBtn.classList.add('hidden');
    hint.textContent = 'Moved. Drag anything to fine-tune the room.';
    hint.classList.remove('hide');
    saveState();
    draw();
    if (navigator.vibrate) navigator.vibrate([12, 24, 12]);
  });

  deleteBtn.addEventListener('click', () => {
    const selected = pointById(state.selectedId);
    if (!selected) return;
    state.points = state.points.filter(p => p.id !== selected.id);
    state.selectedId = null;
    suggestion = null;
    applyBtn.classList.add('hidden');
    hint.textContent = selected.type === 'noise' ? 'Noise source removed.' : 'Quiet target removed.';
    hint.classList.remove('hide');
    saveState();
    draw();
  });

  clearBtn.addEventListener('click', () => {
    if (!state.points.length && !state.walls.length) return;
    if (!window.confirm('Clear all noise sources, quiet targets, and barriers?')) return;
    state = blankState();
    wallStart = null;
    suggestion = null;
    applyBtn.classList.add('hidden');
    setMode('move');
    saveState();
    draw();
  });

  aboutBtn.addEventListener('click', () => aboutDialog.showModal());
  closeAboutBtn.addEventListener('click', () => aboutDialog.close());
  aboutDialog.addEventListener('click', event => { if (event.target === aboutDialog) aboutDialog.close(); });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  window.addEventListener('resize', resize);
  setMode(state.mode);
  resize();

  window.HUSH_MAP_TEST = { segmentCrossesWall, pairImpact, totalImpactForSource, findBestSpot };
})();
