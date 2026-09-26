'use strict';
    const KEY = 'thread-pin:v1';
    const MAX_HISTORY = 30;
    const state = { current: null, history: [], ui: { editingId: null, photoData: '' } };

    const $ = (id) => document.getElementById(id);
    const els = {
      current: $('current'), status: $('status'), pinBtn: $('pinBtn'), composer: $('composer'),
      composerTitle: $('composerTitle'), doing: $('doing'), next: $('next'), photoInput: $('photoInput'),
      photoPreview: $('photoPreview'), cancelBtn: $('cancelBtn'), saveBtn: $('saveBtn'),
      historyToggle: $('historyToggle'), historyDrawer: $('historyDrawer'), historyList: $('historyList'),
      search: $('search'), exportBtn: $('exportBtn'), importInput: $('importInput'), toast: $('toast')
    };

    function uid() {
      return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    }

    function validRecord(x) {
      return x && typeof x.id === 'string' && typeof x.next === 'string' && typeof x.createdAt === 'number';
    }

    function load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        state.current = validRecord(parsed.current) ? parsed.current : null;
        state.history = Array.isArray(parsed.history) ? parsed.history.filter(validRecord).slice(0, MAX_HISTORY) : [];
      } catch (err) {
        console.warn('THREAD//PIN storage ignored:', err);
        setStatus('Saved data could not be read. New checkpoints are still available.');
      }
    }

    function persist() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ version: 1, current: state.current, history: state.history.slice(0, MAX_HISTORY) }));
        return true;
      } catch (err) {
        console.error(err);
        setStatus('Save failed. Export or remove old photo-heavy checkpoints, then try again.');
        toast('SAVE FAILED');
        return false;
      }
    }

    function setStatus(msg = '') { els.status.textContent = msg; }
    let toastTimer;
    function toast(msg) {
      clearTimeout(toastTimer);
      els.toast.textContent = msg;
      els.toast.classList.add('show');
      toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1500);
    }

    function esc(s='') {
      return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    }

    function fmtTime(ts) {
      try { return new Intl.DateTimeFormat(undefined, {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}).format(ts); }
      catch { return new Date(ts).toLocaleString(); }
    }

    function elapsed(ts) {
      const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      if (sec < 60) return 'just now';
      const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
      const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
      const d = Math.floor(hr / 24); if (d < 14) return `${d}d ago`;
      return fmtTime(ts);
    }

    function renderCurrent() {
      const r = state.current;
      if (!r) {
        els.current.className = 'current empty';
        els.current.innerHTML = `<div class="empty-mark">⌁</div><h2>No thread pinned.</h2><p>Before you stop, capture the exact next move. Come back later and skip the reconstruction tax.</p>`;
        els.pinBtn.textContent = '＋ PIN MY PLACE';
        return;
      }
      els.current.className = 'current';
      els.current.innerHTML = `${r.photo ? `<img class="photo" src="${r.photo}" alt="Checkpoint reference photo">` : ''}
        <div class="card-body">
          <div class="eyebrow">CURRENT THREAD</div>
          ${r.doing ? `<div class="doing">${esc(r.doing)}</div>` : ''}
          <div class="next-label">DO THIS NEXT</div>
          <div class="next">${esc(r.next)}</div>
          <div class="meta"><span>${fmtTime(r.createdAt)}</span><span id="elapsed">${elapsed(r.createdAt)}</span></div>
        </div>
        <div class="actions">
          <button class="btn secondary" type="button" data-action="edit-current">EDIT</button>
          <button class="btn primary" type="button" data-action="done-current">DONE ✓</button>
        </div>`;
      els.pinBtn.textContent = '＋ PIN A NEW PLACE';
    }

    function renderHistory() {
      const q = els.search.value.trim().toLowerCase();
      const items = state.history.filter(r => !q || `${r.doing} ${r.next}`.toLowerCase().includes(q));
      if (!items.length) {
        els.historyList.innerHTML = `<div class="fine">${q ? 'No matching checkpoints.' : 'No older checkpoints yet.'}</div>`;
        return;
      }
      els.historyList.innerHTML = items.map(r => `<article class="hist ${r.done ? 'done' : ''}">
        <div>
          <div class="hist-title">${esc(r.next)}</div>
          <div class="hist-sub">${r.doing ? esc(r.doing) + ' · ' : ''}${fmtTime(r.createdAt)}${r.done ? ' · completed' : ''}</div>
        </div>
        <div class="hist-actions">
          <button class="mini" type="button" data-restore="${esc(r.id)}" aria-label="Restore checkpoint">↺</button>
          <button class="mini" type="button" data-delete="${esc(r.id)}" aria-label="Delete checkpoint">×</button>
        </div>
      </article>`).join('');
    }

    function render() { renderCurrent(); renderHistory(); }

    function setComposer(open, record = null) {
      els.composer.classList.toggle('open', open);
      els.composer.setAttribute('aria-hidden', String(!open));
      if (!open) {
        state.ui.editingId = null;
        state.ui.photoData = '';
        els.doing.value = '';
        els.next.value = '';
        els.photoInput.value = '';
        els.photoPreview.removeAttribute('src');
        els.photoPreview.style.display = 'none';
        els.composerTitle.textContent = 'NEW CHECKPOINT';
        return;
      }
      if (record) {
        state.ui.editingId = record.id;
        state.ui.photoData = record.photo || '';
        els.doing.value = record.doing || '';
        els.next.value = record.next || '';
        els.composerTitle.textContent = 'EDIT CHECKPOINT';
        if (record.photo) { els.photoPreview.src = record.photo; els.photoPreview.style.display = 'block'; }
      } else {
        state.ui.editingId = null;
        state.ui.photoData = '';
        els.doing.value = '';
        els.next.value = '';
        els.composerTitle.textContent = 'NEW CHECKPOINT';
        els.photoPreview.style.display = 'none';
      }
      requestAnimationFrame(() => els.doing.focus({preventScroll:true}));
      els.composer.scrollIntoView({behavior:'smooth', block:'nearest'});
    }

    async function compressImage(file) {
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(file);
      });
      const img = await new Promise((resolve, reject) => {
        const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = dataUrl;
      });
      const max = 900;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d', {alpha:false}).drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', .72);
    }

    function archiveCurrent(done = false) {
      if (!state.current) return;
      state.history.unshift({...state.current, done});
      state.history = state.history.slice(0, MAX_HISTORY);
      state.current = null;
    }

    function saveCheckpoint() {
      const next = els.next.value.trim();
      if (!next) { toast('NEXT ACTION REQUIRED'); els.next.focus(); return; }
      const doing = els.doing.value.trim();
      if (state.ui.editingId && state.current?.id === state.ui.editingId) {
        state.current = {...state.current, doing, next, photo: state.ui.photoData || ''};
      } else {
        if (state.current) archiveCurrent(false);
        state.current = { id: uid(), doing, next, photo: state.ui.photoData || '', createdAt: Date.now(), done: false };
      }
      if (!persist()) return;
      setComposer(false);
      render();
      setStatus('');
      toast('THREAD PINNED');
    }

    function restore(id) {
      const idx = state.history.findIndex(r => r.id === id);
      if (idx < 0) return;
      const restored = state.history.splice(idx, 1)[0];
      if (state.current) archiveCurrent(false);
      state.current = {...restored, done:false};
      persist(); render(); toast('THREAD RESTORED');
    }

    function removeHistory(id) {
      const idx = state.history.findIndex(r => r.id === id);
      if (idx < 0) return;
      if (!confirm('Delete this old checkpoint?')) return;
      state.history.splice(idx, 1);
      persist(); renderHistory(); toast('DELETED');
    }

    function exportData() {
      const payload = { app:'THREAD//PIN', version:1, exportedAt:Date.now(), current:state.current, history:state.history };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `thread-pin-${new Date().toISOString().slice(0,10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast('BACKUP EXPORTED');
    }

    async function importData(file) {
      try {
        const parsed = JSON.parse(await file.text());
        const incoming = [];
        if (validRecord(parsed.current)) incoming.push(parsed.current);
        if (Array.isArray(parsed.history)) incoming.push(...parsed.history.filter(validRecord));
        const seen = new Set([state.current?.id, ...state.history.map(x => x.id)].filter(Boolean));
        const fresh = incoming.filter(x => !seen.has(x.id));
        state.history = [...fresh, ...state.history].sort((a,b) => b.createdAt - a.createdAt).slice(0, MAX_HISTORY);
        persist(); render(); toast(`${fresh.length} IMPORTED`);
      } catch (err) {
        console.error(err); toast('IMPORT FAILED');
      } finally { els.importInput.value = ''; }
    }

    els.pinBtn.addEventListener('click', () => setComposer(true));
    els.cancelBtn.addEventListener('click', () => setComposer(false));
    els.saveBtn.addEventListener('click', saveCheckpoint);
    els.historyToggle.addEventListener('click', () => {
      const open = !els.historyDrawer.classList.contains('open');
      els.historyDrawer.classList.toggle('open', open);
      els.historyDrawer.setAttribute('aria-hidden', String(!open));
      els.historyToggle.setAttribute('aria-expanded', String(open));
      if (open) renderHistory();
    });
    els.current.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'edit-current') setComposer(true, state.current);
      if (action === 'done-current') {
        archiveCurrent(true); persist(); render(); toast('THREAD CLOSED');
      }
    });
    els.historyList.addEventListener('click', (e) => {
      const restoreBtn = e.target.closest('[data-restore]');
      const deleteBtn = e.target.closest('[data-delete]');
      if (restoreBtn) restore(restoreBtn.dataset.restore);
      if (deleteBtn) removeHistory(deleteBtn.dataset.delete);
    });
    els.search.addEventListener('input', renderHistory);
    els.photoInput.addEventListener('change', async () => {
      const file = els.photoInput.files?.[0]; if (!file) return;
      try {
        toast('COMPRESSING PHOTO');
        state.ui.photoData = await compressImage(file);
        els.photoPreview.src = state.ui.photoData;
        els.photoPreview.style.display = 'block';
        toast('PHOTO READY');
      } catch { toast('PHOTO FAILED'); }
    });
    els.exportBtn.addEventListener('click', exportData);
    els.importInput.addEventListener('change', () => { const f = els.importInput.files?.[0]; if (f) importData(f); });

    document.addEventListener('visibilitychange', () => { if (!document.hidden) renderCurrent(); });
    setInterval(() => { const e = $('elapsed'); if (e && state.current) e.textContent = elapsed(state.current.createdAt); }, 60000);

    load(); render();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
