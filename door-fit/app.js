(() => {
  'use strict';

  const STORAGE_KEY = 'door-fit:v1';
  const STEP_DEG = 0.1;
  const fields = ['objL', 'objW', 'objH', 'doorW', 'doorH', 'reserve'];
  const els = Object.fromEntries(fields.map(id => [id, document.getElementById(id)]));
  const unitButtons = [...document.querySelectorAll('[data-unit]')];
  const unitMarks = [...document.querySelectorAll('.unit-mark')];
  const checkBtn = document.getElementById('checkBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const inputError = document.getElementById('inputError');
  const resultCard = document.getElementById('resultCard');
  const resultTitle = document.getElementById('resultTitle');
  const resultBadge = document.getElementById('resultBadge');
  const resultCopy = document.getElementById('resultCopy');
  const faceGrid = document.getElementById('faceGrid');
  const finePrint = document.getElementById('finePrint');
  const objectFace = document.getElementById('objectFace');
  const faceLabel = document.getElementById('faceLabel');
  const infoBtn = document.getElementById('infoBtn');
  const closeInfoBtn = document.getElementById('closeInfoBtn');
  const infoDialog = document.getElementById('infoDialog');

  let state = loadState();
  applyState();

  const faceDefs = [
    { label: 'L × W', a: 'L', b: 'W', depth: 'H' },
    { label: 'L × H', a: 'L', b: 'H', depth: 'W' },
    { label: 'W × H', a: 'W', b: 'H', depth: 'L' }
  ];

  function loadState() {
    const fallback = { unit: 'in', objL: '', objW: '', objH: '', doorW: '', doorH: '', reserve: '0.5' };
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || !['in', 'cm'].includes(parsed.unit)) return fallback;
      return { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function applyState() {
    for (const id of fields) els[id].value = state[id] ?? '';
    unitButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.unit === state.unit));
    unitMarks.forEach(mark => mark.textContent = state.unit);
  }

  function roundDisplay(n) {
    return Math.round(n * 100) / 100;
  }

  function setUnit(nextUnit) {
    if (nextUnit === state.unit) return;
    const factor = nextUnit === 'cm' ? 2.54 : 1 / 2.54;
    for (const id of fields) {
      const n = Number(els[id].value);
      state[id] = Number.isFinite(n) && n !== 0 ? String(roundDisplay(n * factor)) : els[id].value;
    }
    state.unit = nextUnit;
    applyState();
    saveState();
    resultCard.classList.add('hidden');
  }

  function readNumbers() {
    const values = {};
    for (const id of fields) {
      const n = Number(els[id].value);
      if (!Number.isFinite(n) || n < 0 || (id !== 'reserve' && n <= 0)) return null;
      values[id] = n;
    }
    return values;
  }

  function fitFace(a, b, usableW, usableH) {
    let best = null;
    for (let deg = 0; deg <= 90.0001; deg += STEP_DEG) {
      const rad = deg * Math.PI / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      const w = a * c + b * s;
      const h = a * s + b * c;
      if (w <= usableW + 1e-9 && h <= usableH + 1e-9) {
        const cw = usableW - w;
        const ch = usableH - h;
        const score = Math.min(cw / usableW, ch / usableH) - Math.abs(deg) * 1e-6;
        if (!best || score > best.score) best = { deg, w, h, cw, ch, score };
      }
    }
    return best;
  }

  function fmt(n) {
    const decimals = state.unit === 'in' ? 2 : 1;
    return `${Number(n.toFixed(decimals))} ${state.unit}`;
  }

  function checkFit() {
    inputError.textContent = '';
    const v = readNumbers();
    if (!v) {
      inputError.textContent = 'Enter positive object and doorway dimensions. Clearance reserve may be zero.';
      resultCard.classList.add('hidden');
      return;
    }

    const usableW = v.doorW - v.reserve;
    const usableH = v.doorH - v.reserve;
    if (usableW <= 0 || usableH <= 0) {
      inputError.textContent = 'The clearance reserve is larger than the usable opening.';
      resultCard.classList.add('hidden');
      return;
    }

    const dims = { L: v.objL, W: v.objW, H: v.objH };
    const results = faceDefs.map(def => ({
      ...def,
      aValue: dims[def.a],
      bValue: dims[def.b],
      fit: fitFace(dims[def.a], dims[def.b], usableW, usableH)
    }));

    const fits = results.filter(r => r.fit).sort((x, y) => y.fit.score - x.fit.score);
    renderResult(results, fits[0] || null, usableW, usableH);

    for (const id of fields) state[id] = els[id].value;
    saveState();
  }

  function renderResult(results, best, usableW, usableH) {
    resultCard.classList.remove('hidden', 'no-fit');
    faceGrid.innerHTML = '';

    for (const r of results) {
      const tile = document.createElement('div');
      tile.className = `face-tile ${r.fit ? 'fit' : 'no'}`;
      tile.innerHTML = `<strong>${r.label}</strong><span>${r.fit ? `${Number(r.fit.deg.toFixed(1))}° works` : 'no simple fit'}</span>`;
      faceGrid.appendChild(tile);
    }

    if (!best) {
      resultCard.classList.add('no-fit');
      resultTitle.textContent = 'NO SIMPLE FACE FIT';
      resultBadge.textContent = 'CHECK ROUTE';
      resultCopy.textContent = 'None of the three rectangular faces clear this opening with an in-plane rotation. Do not force it from this result alone; a true 3D tilt may still work.';
      finePrint.textContent = `Usable opening after reserve: ${fmt(usableW)} × ${fmt(usableH)}.`;
      faceLabel.textContent = 'NO FACE';
      objectFace.style.width = '72%';
      objectFace.style.height = '68%';
      objectFace.style.transform = 'translate(-50%,-50%) rotate(12deg)';
      return;
    }

    resultTitle.textContent = 'SIMPLE FIT FOUND';
    resultBadge.textContent = 'FIT';
    const angle = Number(best.fit.deg.toFixed(1));
    const angleText = angle < 0.2 ? 'Keep that face square to the opening.' : `Rotate that face about ${angle}° in the doorway plane.`;
    resultCopy.innerHTML = `Present the <strong>${best.label}</strong> face to the doorway, with <strong>${best.depth}</strong> pointing through the opening. ${angleText}`;
    finePrint.textContent = `Projected size at that angle: ${fmt(best.fit.w)} × ${fmt(best.fit.h)} inside a usable ${fmt(usableW)} × ${fmt(usableH)} opening.`;

    faceLabel.textContent = best.label;
    const scale = Math.min(1, 0.88 * usableW / Math.max(best.aValue, best.bValue), 0.88 * usableH / Math.max(best.aValue, best.bValue));
    const base = 150;
    const pxA = Math.max(34, best.aValue * scale / Math.max(usableW, usableH) * base * 1.65);
    const pxB = Math.max(34, best.bValue * scale / Math.max(usableW, usableH) * base * 1.65);
    objectFace.style.width = `${Math.min(86, pxA)}%`;
    objectFace.style.height = `${Math.min(78, pxB)}%`;
    objectFace.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
  }

  function loadSample() {
    const sample = state.unit === 'in'
      ? { objL: '60', objW: '18', objH: '32', doorW: '30', doorH: '80', reserve: '0.5' }
      : { objL: '152.4', objW: '45.7', objH: '81.3', doorW: '76.2', doorH: '203.2', reserve: '1.3' };
    Object.assign(state, sample);
    applyState();
    saveState();
    checkFit();
  }

  unitButtons.forEach(btn => btn.addEventListener('click', () => setUnit(btn.dataset.unit)));
  checkBtn.addEventListener('click', checkFit);
  sampleBtn.addEventListener('click', loadSample);
  fields.forEach(id => els[id].addEventListener('change', () => {
    state[id] = els[id].value;
    saveState();
  }));
  infoBtn.addEventListener('click', () => infoDialog.showModal());
  closeInfoBtn.addEventListener('click', () => infoDialog.close());
  infoDialog.addEventListener('click', event => {
    if (event.target === infoDialog) infoDialog.close();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  window.DOOR_FIT_TEST = { fitFace };
})();
