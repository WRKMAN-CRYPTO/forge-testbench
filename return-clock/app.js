(() => {
  'use strict';

  const STORAGE_KEY = 'return-clock:data';
  const BACKUP_MARKER = 'RETURN_CLOCK_BACKUP';
  const SCHEMA = 1;

  const state = {
    records: [],
    filter: 'open',
    editingId: null
  };

  const $ = (id) => document.getElementById(id);

  function makeId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const parts = new Uint32Array(4);
      crypto.getRandomValues(parts);
      return `rc-${Array.from(parts, (n) => n.toString(36)).join('-')}`;
    }
    return `rc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const els = {
    riskTotal: $('riskTotal'), urgentCount: $('urgentCount'), heroSide: document.querySelector('.hero-side'),
    nextCard: $('nextCard'), nextItem: $('nextItem'), nextStore: $('nextStore'), nextDeadline: $('nextDeadline'),
    filters: $('filters'), listLabel: $('listLabel'), recordCount: $('recordCount'), returnList: $('returnList'), emptyState: $('emptyState'), emptyTitle: $('emptyTitle'), emptyCopy: $('emptyCopy'),
    addBtn: $('addBtn'), emptyAddBtn: $('emptyAddBtn'), settingsBtn: $('settingsBtn'),
    editorBackdrop: $('editorBackdrop'), editorSheet: $('editorSheet'), closeEditorBtn: $('closeEditorBtn'), editorTitle: $('editorTitle'),
    form: $('returnForm'), recordId: $('recordId'), itemInput: $('itemInput'), storeInput: $('storeInput'), amountInput: $('amountInput'),
    deadlineInput: $('deadlineInput'), noteInput: $('noteInput'), deleteBtn: $('deleteBtn'),
    settingsBackdrop: $('settingsBackdrop'), settingsSheet: $('settingsSheet'), closeSettingsBtn: $('closeSettingsBtn'),
    exportBtn: $('exportBtn'), importInput: $('importInput'), clearBtn: $('clearBtn'),
    cardTemplate: $('returnCardTemplate')
  };

  function safeRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const item = typeof raw.item === 'string' ? raw.item.trim().slice(0, 80) : '';
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(raw.deadline || '') ? raw.deadline : '';
    if (!item || !deadline) return null;
    const status = ['open', 'returned', 'kept'].includes(raw.status) ? raw.status : 'open';
    const amount = Number(raw.amount);
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : makeId(),
      item,
      store: typeof raw.store === 'string' ? raw.store.trim().slice(0, 60) : '',
      amount: Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0,
      deadline,
      note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 220) : '',
      status,
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
      updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : Date.now(),
      closedAt: status === 'open' ? null : (Number.isFinite(Number(raw.closedAt)) ? Number(raw.closedAt) : Date.now())
    };
  }

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || parsed.schema !== SCHEMA || !Array.isArray(parsed.records)) return;
      state.records = parsed.records.map(safeRecord).filter(Boolean);
    } catch (error) {
      console.warn('RETURN CLOCK storage could not be loaded.', error);
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: SCHEMA, records: state.records }));
  }

  function dayNumber(dateString) {
    const [y, m, d] = dateString.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  }

  function todayNumber() {
    const now = new Date();
    return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  }

  function daysLeft(deadline) {
    return dayNumber(deadline) - todayNumber();
  }

  function urgency(record) {
    const days = daysLeft(record.deadline);
    if (record.status !== 'open') return { kind: 'closed', text: record.status === 'returned' ? 'Returned' : 'Kept', days };
    if (days < 0) return { kind: 'expired', text: `${Math.abs(days)}d expired`, days };
    if (days === 0) return { kind: 'expired', text: 'Due today', days };
    if (days === 1) return { kind: 'urgent', text: 'Tomorrow', days };
    if (days <= 3) return { kind: 'urgent', text: `${days} days`, days };
    if (days <= 7) return { kind: 'urgent', text: `${days} days`, days };
    return { kind: 'safe', text: `${days} days`, days };
  }

  function money(value) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value || 0);
  }

  function friendlyDate(dateString) {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: y !== new Date().getFullYear() ? 'numeric' : undefined })
      .format(new Date(y, m - 1, d, 12));
  }

  function visibleRecords() {
    return state.records
      .filter((r) => state.filter === 'all' || r.status === state.filter)
      .sort((a, b) => {
        if (a.status === 'open' && b.status === 'open') return dayNumber(a.deadline) - dayNumber(b.deadline) || b.updatedAt - a.updatedAt;
        if (a.status === 'open') return -1;
        if (b.status === 'open') return 1;
        return (b.closedAt || b.updatedAt) - (a.closedAt || a.updatedAt);
      });
  }

  function renderSummary() {
    const open = state.records.filter((r) => r.status === 'open');
    const total = open.reduce((sum, r) => sum + r.amount, 0);
    const urgent = open.filter((r) => daysLeft(r.deadline) <= 3);
    els.riskTotal.textContent = money(total);
    els.urgentCount.textContent = urgent.length ? `${urgent.length} ${urgent.length === 1 ? 'deadline' : 'deadlines'} ≤ 3 days` : 'Nothing urgent';
    els.heroSide.classList.toggle('urgent', urgent.length > 0);

    const next = [...open].sort((a, b) => dayNumber(a.deadline) - dayNumber(b.deadline))[0];
    els.nextCard.hidden = !next;
    if (next) {
      els.nextItem.textContent = next.item;
      els.nextStore.textContent = next.store || 'Store not entered';
      els.nextDeadline.textContent = urgency(next).text;
      els.nextDeadline.className = `deadline-chip ${urgency(next).kind}`;
    }
  }

  function renderList() {
    const records = visibleRecords();
    const labels = { open: 'OPEN RETURNS', returned: 'RETURNED', kept: 'KEPT', all: 'ALL RECORDS' };
    els.listLabel.textContent = labels[state.filter];
    els.recordCount.textContent = `${records.length} ${records.length === 1 ? 'item' : 'items'}`;
    els.returnList.replaceChildren();
    els.emptyState.hidden = records.length > 0;
    const emptyText = {
      open: ['No return clocks running.', 'Add something while the return window is still generous, not when the receipt has become archaeology.'],
      returned: ['No completed returns yet.', 'Items you mark Returned will land here.'],
      kept: ['Nothing marked Keep.', 'Items you decide to keep will land here.'],
      all: ['No return records yet.', 'Start one clock and RETURN CLOCK will keep the deadline in view.']
    }[state.filter];
    els.emptyTitle.textContent = emptyText[0];
    els.emptyCopy.textContent = emptyText[1];

    records.forEach((record) => {
      const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
      const u = urgency(record);
      node.dataset.id = record.id;
      node.classList.toggle('expired', u.kind === 'expired');
      node.classList.toggle('urgent', u.kind === 'urgent');
      node.querySelector('.card-title').textContent = record.item;
      node.querySelector('.card-meta').textContent = record.store || 'Store not entered';
      const badge = node.querySelector('.urgency-badge');
      badge.textContent = u.text;
      badge.classList.add(u.kind);
      node.querySelector('.amount').textContent = money(record.amount);
      node.querySelector('.date').textContent = `Return by ${friendlyDate(record.deadline)}`;
      const note = node.querySelector('.note');
      note.hidden = !record.note;
      note.textContent = record.note;

      const openActions = node.querySelector('.open-actions');
      const closedActions = node.querySelector('.closed-actions');
      openActions.hidden = record.status !== 'open';
      closedActions.hidden = record.status === 'open';
      if (record.status !== 'open') {
        const when = record.closedAt ? new Date(record.closedAt).toLocaleDateString() : '';
        closedActions.querySelector('.closed-label').textContent = `${record.status === 'returned' ? 'Returned' : 'Kept'}${when ? ` · ${when}` : ''}`;
      }

      node.querySelectorAll('.edit-button').forEach((button) => button.addEventListener('click', () => openEditor(record.id)));
      node.querySelector('.returned-button').addEventListener('click', () => closeRecord(record.id, 'returned'));
      node.querySelector('.keep-button').addEventListener('click', () => closeRecord(record.id, 'kept'));
      els.returnList.append(node);
    });
  }

  function render() {
    document.querySelectorAll('.segment').forEach((button) => button.classList.toggle('active', button.dataset.filter === state.filter));
    renderSummary();
    renderList();
  }

  function setSheet(sheet, backdrop, open) {
    sheet.hidden = !open;
    backdrop.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function openEditor(id = null) {
    state.editingId = id;
    const record = id ? state.records.find((r) => r.id === id) : null;
    els.editorTitle.textContent = record ? 'Edit return' : 'Add return';
    els.recordId.value = record?.id || '';
    els.itemInput.value = record?.item || '';
    els.storeInput.value = record?.store || '';
    els.amountInput.value = record?.amount ? record.amount.toFixed(2) : '';
    els.deadlineInput.value = record?.deadline || '';
    els.noteInput.value = record?.note || '';
    els.deleteBtn.hidden = !record;
    setSheet(els.editorSheet, els.editorBackdrop, true);
    requestAnimationFrame(() => els.itemInput.focus({ preventScroll: true }));
  }

  function closeEditor() {
    state.editingId = null;
    setSheet(els.editorSheet, els.editorBackdrop, false);
  }

  function closeSettings() {
    setSheet(els.settingsSheet, els.settingsBackdrop, false);
  }

  function closeRecord(id, status) {
    const record = state.records.find((r) => r.id === id);
    if (!record || record.status !== 'open') return;
    record.status = status;
    record.closedAt = Date.now();
    record.updatedAt = Date.now();
    save();
    render();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const existing = state.editingId ? state.records.find((r) => r.id === state.editingId) : null;
    const draft = safeRecord({
      id: existing?.id || makeId(),
      item: els.itemInput.value,
      store: els.storeInput.value,
      amount: els.amountInput.value,
      deadline: els.deadlineInput.value,
      note: els.noteInput.value,
      status: existing?.status || 'open',
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      closedAt: existing?.closedAt || null
    });
    if (!draft) return;
    if (existing) Object.assign(existing, draft);
    else state.records.push(draft);
    save();
    closeEditor();
    render();
  }

  function deleteEditingRecord() {
    if (!state.editingId) return;
    const record = state.records.find((r) => r.id === state.editingId);
    if (!record) return;
    if (!confirm(`Delete “${record.item}”?`)) return;
    state.records = state.records.filter((r) => r.id !== state.editingId);
    save();
    closeEditor();
    render();
  }

  function exportBackup() {
    const backup = {
      marker: BACKUP_MARKER,
      schema: SCHEMA,
      exportedAt: new Date().toISOString(),
      records: state.records
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `return-clock-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.marker !== BACKUP_MARKER || parsed?.schema !== SCHEMA || !Array.isArray(parsed.records)) {
        alert('That file is not a RETURN CLOCK backup.');
        return;
      }
      const cleaned = parsed.records.map(safeRecord).filter(Boolean);
      if (cleaned.length !== parsed.records.length) {
        alert('Backup rejected because one or more records are invalid.');
        return;
      }
      if (!confirm(`Replace the ${state.records.length} records on this device with ${cleaned.length} records from the backup?`)) return;
      state.records = cleaned;
      save();
      closeSettings();
      render();
    } catch (error) {
      console.error(error);
      alert('Could not read that backup file.');
    } finally {
      els.importInput.value = '';
    }
  }

  function clearAll() {
    if (!state.records.length) return;
    if (!confirm(`Clear all ${state.records.length} RETURN CLOCK records from this device?`)) return;
    if (!confirm('This cannot be undone unless you exported a backup. Clear everything?')) return;
    state.records = [];
    save();
    closeSettings();
    render();
  }

  function bind() {
    els.addBtn.addEventListener('click', () => openEditor());
    els.emptyAddBtn.addEventListener('click', () => openEditor());
    els.closeEditorBtn.addEventListener('click', closeEditor);
    els.editorBackdrop.addEventListener('click', closeEditor);
    els.form.addEventListener('submit', handleSubmit);
    els.deleteBtn.addEventListener('click', deleteEditingRecord);

    els.settingsBtn.addEventListener('click', () => setSheet(els.settingsSheet, els.settingsBackdrop, true));
    els.closeSettingsBtn.addEventListener('click', closeSettings);
    els.settingsBackdrop.addEventListener('click', closeSettings);
    els.exportBtn.addEventListener('click', exportBackup);
    els.importInput.addEventListener('change', () => importBackup(els.importInput.files?.[0]));
    els.clearBtn.addEventListener('click', clearAll);

    els.filters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      state.filter = button.dataset.filter;
      render();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!els.editorSheet.hidden) closeEditor();
      else if (!els.settingsSheet.hidden) closeSettings();
    });
  }

  load();
  bind();
  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker registration failed.', error)));
  }
})();
