(() => {
  'use strict';

  const STORAGE_KEY = 'panel-trace.v1';
  const state = {
    circuits: loadCircuits(),
    query: '',
    filter: 'all',
    editingId: null
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    search: $('searchInput'),
    clearSearch: $('clearSearchBtn'),
    list: $('circuitList'),
    empty: $('emptyState'),
    summary: $('summaryText'),
    heroNumber: $('heroNumber'),
    menu: $('menuBtn'),
    toolsSheet: $('toolsSheet'),
    closeTools: $('closeToolsBtn'),
    add: $('addBtn'),
    emptyAdd: $('emptyAddBtn'),
    editorSheet: $('editorSheet'),
    closeEditor: $('closeEditorBtn'),
    form: $('circuitForm'),
    editorEyebrow: $('editorEyebrow'),
    editorTitle: $('editorTitle'),
    number: $('numberInput'),
    amps: $('ampsInput'),
    label: $('labelInput'),
    controls: $('controlsInput'),
    tags: $('tagsInput'),
    notes: $('notesInput'),
    verified: $('verifiedInput'),
    deleteBtn: $('deleteBtn'),
    exportBtn: $('exportBtn'),
    importInput: $('importInput'),
    resetBtn: $('resetBtn'),
    toast: $('toast')
  };

  function loadCircuits() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.circuits)) return [];
      return parsed.circuits.filter(isCircuit).map(normalizeCircuit);
    } catch {
      return [];
    }
  }

  function isCircuit(c) {
    return c && typeof c.id === 'string' && typeof c.number === 'string' && typeof c.label === 'string';
  }

  function normalizeCircuit(c) {
    return {
      id: c.id,
      number: String(c.number || '').trim(),
      amps: String(c.amps || '').trim(),
      label: String(c.label || '').trim(),
      controls: String(c.controls || '').trim(),
      tags: String(c.tags || '').trim(),
      notes: String(c.notes || '').trim(),
      verified: Boolean(c.verified),
      updatedAt: Number(c.updatedAt) || Date.now()
    };
  }

  function saveCircuits() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, circuits: state.circuits}));
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function sortKey(value) {
    const match = String(value).match(/\d+/);
    return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
  }

  function visibleCircuits() {
    const q = state.query.trim().toLowerCase();
    return [...state.circuits]
      .filter((c) => {
        if (state.filter === 'unknown' && (c.controls || c.tags)) return false;
        if (state.filter === 'needs-test' && c.verified) return false;
        if (!q) return true;
        return [c.number, c.amps, c.label, c.controls, c.tags, c.notes].join(' ').toLowerCase().includes(q);
      })
      .sort((a,b) => sortKey(a.number) - sortKey(b.number) || a.number.localeCompare(b.number));
  }

  function render() {
    const visible = visibleCircuits();
    const total = state.circuits.length;
    const verified = state.circuits.filter((c) => c.verified).length;
    els.clearSearch.hidden = !state.query;
    const hasSearchContext = Boolean(state.query) || state.filter !== 'all';
    els.empty.hidden = total !== 0 || hasSearchContext;
    els.list.hidden = visible.length === 0 && total === 0 && !hasSearchContext;
    els.summary.textContent = total ? `${total} mapped • ${verified} verified` : 'No circuits mapped yet.';

    const firstNum = state.circuits.length ? [...state.circuits].sort((a,b)=>sortKey(a.number)-sortKey(b.number))[0].number : '17';
    els.heroNumber.textContent = firstNum || '17';

    if (!visible.length) {
      els.list.innerHTML = total ? '<div class="empty-state"><strong>No matches.</strong><p>Try another word or change the filter.</p></div>' : '';
      return;
    }

    els.list.innerHTML = visible.map((c) => {
      const unknown = !c.controls.trim() && !c.tags.trim();
      const chips = [];
      chips.push(c.verified ? '<span class="badge good">VERIFIED</span>' : '<span class="badge warn">NEEDS TEST</span>');
      if (c.tags.trim()) {
        c.tags.split(',').map(t=>t.trim()).filter(Boolean).slice(0,4).forEach((tag)=>chips.push(`<span class="badge">${escapeHTML(tag)}</span>`));
      }
      if (unknown) chips.push('<span class="badge">UNKNOWN LOAD</span>');
      return `<article class="circuit-card ${c.verified ? 'verified' : ''}">
        <div class="card-top">
          <div class="breaker-no">${escapeHTML(c.number || '?')}</div>
          <div class="card-copy">
            <h3>${escapeHTML(c.label || 'Unlabeled breaker')}</h3>
            <p>${escapeHTML(c.controls || 'Controls not mapped yet.')}</p>
          </div>
          <div class="amps">${c.amps ? `${escapeHTML(c.amps)}A` : ''}</div>
        </div>
        <div class="status-row">${chips.join('')}</div>
        ${c.notes ? `<div class="card-notes">${escapeHTML(c.notes)}</div>` : ''}
        <button class="card-hit" type="button" data-edit-id="${escapeHTML(c.id)}" aria-label="Edit breaker ${escapeHTML(c.number)}"></button>
      </article>`;
    }).join('');
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 1800);
  }

  function openSheet(sheet) {
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeSheet(sheet) {
    sheet.hidden = true;
    if (els.toolsSheet.hidden && els.editorSheet.hidden) document.body.style.overflow = '';
  }

  function openEditor(id = null) {
    state.editingId = id;
    const c = id ? state.circuits.find((item) => item.id === id) : null;
    els.editorEyebrow.textContent = c ? 'EDIT CIRCUIT' : 'NEW CIRCUIT';
    els.editorTitle.textContent = c ? `Breaker ${c.number}` : 'Map a breaker';
    els.number.value = c?.number || '';
    els.amps.value = c?.amps || '';
    els.label.value = c?.label || '';
    els.controls.value = c?.controls || '';
    els.tags.value = c?.tags || '';
    els.notes.value = c?.notes || '';
    els.verified.checked = Boolean(c?.verified);
    els.deleteBtn.hidden = !c;
    openSheet(els.editorSheet);
    setTimeout(() => els.number.focus({preventScroll:true}), 60);
  }

  function closeEditor() {
    state.editingId = null;
    els.form.reset();
    closeSheet(els.editorSheet);
  }

  function newId() {
    return (crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }

  function onSave(event) {
    event.preventDefault();
    const data = normalizeCircuit({
      id: state.editingId || newId(),
      number: els.number.value,
      amps: els.amps.value,
      label: els.label.value,
      controls: els.controls.value,
      tags: els.tags.value,
      notes: els.notes.value,
      verified: els.verified.checked,
      updatedAt: Date.now()
    });
    if (!data.number || !data.label) {
      showToast('Breaker number and label are required.');
      return;
    }
    const duplicate = state.circuits.find((c) => c.number.toLowerCase() === data.number.toLowerCase() && c.id !== data.id);
    if (duplicate && !confirm(`Breaker ${data.number} is already mapped. Save another entry with the same number?`)) return;
    const index = state.circuits.findIndex((c) => c.id === data.id);
    if (index >= 0) state.circuits[index] = data;
    else state.circuits.push(data);
    saveCircuits();
    closeEditor();
    render();
    showToast(index >= 0 ? 'Circuit updated.' : 'Circuit mapped.');
  }

  function deleteCurrent() {
    const c = state.circuits.find((item) => item.id === state.editingId);
    if (!c) return;
    if (!confirm(`Delete breaker ${c.number}: ${c.label}?`)) return;
    state.circuits = state.circuits.filter((item) => item.id !== c.id);
    saveCircuits();
    closeEditor();
    render();
    showToast('Circuit deleted.');
  }

  function exportBackup() {
    const payload = JSON.stringify({app:'PANEL TRACE', version:1, exportedAt:new Date().toISOString(), circuits:state.circuits}, null, 2);
    const blob = new Blob([payload], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `panel-trace-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Backup exported.');
  }

  async function importBackup(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.app !== 'PANEL TRACE' || parsed.version !== 1 || !Array.isArray(parsed.circuits)) throw new Error('bad-format');
      const imported = parsed.circuits.filter(isCircuit).map(normalizeCircuit);
      if (!imported.length && parsed.circuits.length) throw new Error('no-valid');
      const message = state.circuits.length ? `Replace ${state.circuits.length} saved circuit${state.circuits.length === 1 ? '' : 's'} with ${imported.length} imported?` : `Import ${imported.length} circuit${imported.length === 1 ? '' : 's'}?`;
      if (!confirm(message)) return;
      state.circuits = imported;
      saveCircuits();
      closeSheet(els.toolsSheet);
      render();
      showToast('Backup imported.');
    } catch {
      showToast('That is not a valid PANEL TRACE backup.');
    } finally {
      els.importInput.value = '';
    }
  }

  function resetAll() {
    if (!state.circuits.length) return showToast('Panel is already empty.');
    if (!confirm(`Clear all ${state.circuits.length} mapped circuits? Export a backup first if you want a recovery copy.`)) return;
    if (!confirm('Final check: permanently clear this panel from this device?')) return;
    state.circuits = [];
    saveCircuits();
    closeSheet(els.toolsSheet);
    render();
    showToast('Panel cleared.');
  }

  els.search.addEventListener('input', () => { state.query = els.search.value; render(); });
  els.clearSearch.addEventListener('click', () => { els.search.value=''; state.query=''; render(); els.search.focus(); });
  document.querySelector('.filter-row').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-filter]');
    if (!btn) return;
    document.querySelectorAll('.filter').forEach((el)=>el.classList.toggle('active', el === btn));
    state.filter = btn.dataset.filter;
    render();
  });
  els.list.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-edit-id]');
    if (btn) openEditor(btn.dataset.editId);
  });
  els.menu.addEventListener('click', () => openSheet(els.toolsSheet));
  els.closeTools.addEventListener('click', () => closeSheet(els.toolsSheet));
  els.add.addEventListener('click', () => openEditor());
  els.emptyAdd.addEventListener('click', () => openEditor());
  els.closeEditor.addEventListener('click', closeEditor);
  els.form.addEventListener('submit', onSave);
  els.deleteBtn.addEventListener('click', deleteCurrent);
  els.exportBtn.addEventListener('click', exportBackup);
  els.importInput.addEventListener('change', () => { const file = els.importInput.files?.[0]; if (file) importBackup(file); });
  els.resetBtn.addEventListener('click', resetAll);
  [els.toolsSheet, els.editorSheet].forEach((sheet) => sheet.addEventListener('click', (event) => { if (event.target === sheet) closeSheet(sheet); }));

  render();

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();