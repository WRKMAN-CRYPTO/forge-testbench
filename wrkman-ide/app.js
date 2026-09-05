(() => {
  'use strict';

  const STORAGE_KEY = 'wrkman-ide:v1';
  const SCHEMA_VERSION = 1;
  const FILE_META = {
    html: { name: 'index.html' },
    css: { name: 'styles.css' },
    js: { name: 'app.js' }
  };

  const starter = () => ({
    version: SCHEMA_VERSION,
    revision: 1,
    activeFile: 'html',
    files: {
      html: `<main class="card">\n  <div class="badge">WRKMAN</div>\n  <h1>Clock In. Build Something.</h1>\n  <p>Edit the code, then hit RUN.</p>\n  <button id="hammer">Swing the hammer</button>\n  <p id="status"></p>\n</main>`,
      css: `* { box-sizing: border-box; }\nbody {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #111713;\n  color: #e8f0ea;\n  font-family: system-ui, sans-serif;\n}\n.card {\n  width: min(88vw, 420px);\n  padding: 28px;\n  border: 1px solid #536a59;\n  background: #18211b;\n}\n.badge { font-weight: 900; letter-spacing: .18em; }\nbutton { padding: 12px 16px; font-weight: 800; }`,
      js: `const button = document.querySelector('#hammer');\nconst status = document.querySelector('#status');\nlet swings = 0;\nbutton.addEventListener('click', () => {\n  swings += 1;\n  status.textContent = 'Hammer swings: ' + swings;\n});`
    }
  });

  const state = {
    durable: starter(),
    ui: {
      previewOpen: false,
      consoleOpen: false,
      toolsOpen: false,
      saveStatus: 'READY',
      logs: [],
      errorCount: 0
    },
    queue: [],
    processing: false,
    saveTimer: null,
    toastTimer: null
  };

  const els = {
    editor: document.querySelector('#editor'),
    fileName: document.querySelector('#fileName'),
    lineCount: document.querySelector('#lineCount'),
    saveStatus: document.querySelector('#saveStatus'),
    runBtn: document.querySelector('#runBtn'),
    preview: document.querySelector('#preview'),
    previewPane: document.querySelector('#previewPane'),
    consolePane: document.querySelector('#consolePane'),
    consoleOutput: document.querySelector('#consoleOutput'),
    previewBtn: document.querySelector('#previewBtn'),
    consoleBtn: document.querySelector('#consoleBtn'),
    errorBadge: document.querySelector('#errorBadge'),
    clearConsole: document.querySelector('#clearConsole'),
    toolsBtn: document.querySelector('#toolsBtn'),
    toolsSheet: document.querySelector('#toolsSheet'),
    closeTools: document.querySelector('#closeTools'),
    resetProject: document.querySelector('#resetProject'),
    scrim: document.querySelector('#scrim'),
    toast: document.querySelector('#toast'),
    fileTabs: [...document.querySelectorAll('[data-file]')],
    closeButtons: [...document.querySelectorAll('[data-close]')]
  };

  function enqueue(type, payload = {}) {
    state.queue.push({ type, payload });
    if (state.queue.length > 250) {
      state.queue.splice(0, state.queue.length - 250);
      appendLog('error', 'Input queue trimmed after overload.');
    }
    processQueue();
  }

  function processQueue() {
    if (state.processing) return;
    state.processing = true;
    try {
      while (state.queue.length) applyEvent(state.queue.shift());
    } finally {
      state.processing = false;
      render();
    }
  }

  function applyEvent(event) {
    switch (event.type) {
      case 'EDIT': {
        const key = state.durable.activeFile;
        if (state.durable.files[key] !== event.payload.value) {
          state.durable.files[key] = event.payload.value;
          state.durable.revision += 1;
          markDirty();
        }
        break;
      }
      case 'SELECT_FILE':
        if (FILE_META[event.payload.file]) state.durable.activeFile = event.payload.file;
        break;
      case 'TOGGLE_PREVIEW':
        state.ui.previewOpen = !state.ui.previewOpen;
        if (state.ui.previewOpen) state.ui.consoleOpen = false;
        break;
      case 'TOGGLE_CONSOLE':
        state.ui.consoleOpen = !state.ui.consoleOpen;
        if (state.ui.consoleOpen) state.ui.previewOpen = false;
        break;
      case 'CLOSE_PANEL':
        if (event.payload.panel === 'preview') state.ui.previewOpen = false;
        if (event.payload.panel === 'console') state.ui.consoleOpen = false;
        break;
      case 'OPEN_TOOLS':
        state.ui.toolsOpen = true;
        break;
      case 'CLOSE_TOOLS':
        state.ui.toolsOpen = false;
        break;
      case 'CLEAR_CONSOLE':
        state.ui.logs = [];
        state.ui.errorCount = 0;
        break;
      case 'RESET':
        state.durable = starter();
        state.ui.logs = [];
        state.ui.errorCount = 0;
        state.ui.toolsOpen = false;
        persistNow();
        runPreview();
        showToast('Starter project restored');
        break;
      case 'RUN':
        runPreview();
        break;
      case 'PREVIEW_MESSAGE':
        handlePreviewMessage(event.payload.data);
        break;
    }
  }

  function markDirty() {
    state.ui.saveStatus = 'UNSAVED';
    clearTimeout(state.saveTimer);
    const revision = state.durable.revision;
    state.saveTimer = setTimeout(() => persistRevision(revision), 260);
  }

  function persistRevision(revision) {
    if (revision !== state.durable.revision) return;
    persistNow();
  }

  function persistNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.durable));
      state.ui.saveStatus = 'SAVED';
    } catch (error) {
      state.ui.saveStatus = 'SAVE FAILED';
      appendLog('error', `Save failed: ${error.message}`);
    }
    render();
  }

  function loadPersisted() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!isValidProject(parsed)) throw new Error('Stored project schema is invalid.');
      state.durable = parsed;
      state.ui.saveStatus = 'RESTORED';
    } catch (error) {
      state.durable = starter();
      state.ui.saveStatus = 'RECOVERED';
      appendLog('error', `Saved project rejected: ${error.message}`);
    }
  }

  function isValidProject(value) {
    return Boolean(
      value &&
      value.version === SCHEMA_VERSION &&
      Number.isInteger(value.revision) &&
      FILE_META[value.activeFile] &&
      value.files &&
      typeof value.files.html === 'string' &&
      typeof value.files.css === 'string' &&
      typeof value.files.js === 'string'
    );
  }

  function buildPreviewDocument() {
    const { html, css, js } = state.durable.files;
    const safeJs = js.replace(/<\/script/gi, '<\\/script');
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}<script>
      (() => {
        const send = (level, parts) => parent.postMessage({source:'wrkman-preview', level, message:parts.map(part => {
          try { return typeof part === 'string' ? part : JSON.stringify(part); } catch { return String(part); }
        }).join(' ')}, '*');
        ['log','info','warn','error'].forEach(level => {
          const original = console[level];
          console[level] = (...parts) => { send(level === 'error' ? 'error' : 'info', parts); original.apply(console, parts); };
        });
        window.onerror = (message, source, line, column) => { send('error', [message + ' @ ' + line + ':' + column]); };
        window.onunhandledrejection = event => { send('error', ['Unhandled promise: ' + (event.reason?.message || event.reason)]); };
      })();
    <\/script><script>${safeJs}<\/script></body></html>`;
  }

  function runPreview() {
    state.ui.logs = [{ level: 'info', message: `Run revision ${state.durable.revision}`, time: Date.now() }];
    state.ui.errorCount = 0;
    els.preview.srcdoc = buildPreviewDocument();
    state.ui.previewOpen = true;
    state.ui.consoleOpen = false;
    showToast('Build executed');
  }

  function handlePreviewMessage(data) {
    if (!data || data.source !== 'wrkman-preview') return;
    appendLog(data.level === 'error' ? 'error' : 'info', data.message);
  }

  function appendLog(level, message) {
    state.ui.logs.push({ level, message: String(message), time: Date.now() });
    if (state.ui.logs.length > 120) state.ui.logs.splice(0, state.ui.logs.length - 120);
    if (level === 'error') state.ui.errorCount += 1;
  }

  function render() {
    const active = state.durable.activeFile;
    const source = state.durable.files[active];
    if (els.editor.value !== source && document.activeElement !== els.editor) els.editor.value = source;
    els.fileName.textContent = FILE_META[active].name;
    const lines = source.split('\n').length;
    els.lineCount.textContent = `${lines} ${lines === 1 ? 'LINE' : 'LINES'}`;
    els.saveStatus.textContent = state.ui.saveStatus;
    els.fileTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.file === active));
    els.previewPane.classList.toggle('collapsed', !state.ui.previewOpen);
    els.consolePane.classList.toggle('collapsed', !state.ui.consoleOpen);
    els.toolsSheet.classList.toggle('open', state.ui.toolsOpen);
    els.toolsSheet.setAttribute('aria-hidden', String(!state.ui.toolsOpen));
    els.scrim.hidden = !state.ui.toolsOpen;
    els.errorBadge.hidden = state.ui.errorCount === 0;
    els.errorBadge.textContent = String(state.ui.errorCount);
    els.consoleOutput.replaceChildren(...state.ui.logs.map(log => {
      const row = document.createElement('div');
      row.className = `log ${log.level}`;
      row.textContent = log.message;
      return row;
    }));
    els.consoleOutput.scrollTop = els.consoleOutput.scrollHeight;
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1300);
  }

  function bindInputs() {
    els.editor.addEventListener('input', event => enqueue('EDIT', { value: event.target.value }));
    els.editor.addEventListener('keydown', event => {
      if (event.key === 'Tab') {
        event.preventDefault();
        const start = els.editor.selectionStart;
        const end = els.editor.selectionEnd;
        const next = els.editor.value.slice(0, start) + '  ' + els.editor.value.slice(end);
        els.editor.value = next;
        els.editor.selectionStart = els.editor.selectionEnd = start + 2;
        enqueue('EDIT', { value: next });
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') enqueue('RUN');
    });
    els.fileTabs.forEach(tab => tab.addEventListener('click', () => enqueue('SELECT_FILE', { file: tab.dataset.file })));
    els.runBtn.addEventListener('click', () => enqueue('RUN'));
    els.previewBtn.addEventListener('click', () => enqueue('TOGGLE_PREVIEW'));
    els.consoleBtn.addEventListener('click', () => enqueue('TOGGLE_CONSOLE'));
    els.closeButtons.forEach(button => button.addEventListener('click', () => enqueue('CLOSE_PANEL', { panel: button.dataset.close })));
    els.clearConsole.addEventListener('click', () => enqueue('CLEAR_CONSOLE'));
    els.toolsBtn.addEventListener('click', () => enqueue('OPEN_TOOLS'));
    els.closeTools.addEventListener('click', () => enqueue('CLOSE_TOOLS'));
    els.scrim.addEventListener('click', () => enqueue('CLOSE_TOOLS'));
    els.resetProject.addEventListener('click', () => {
      if (confirm('Reset all three files to the WRKMAN starter project?')) enqueue('RESET');
    });
    window.addEventListener('message', event => enqueue('PREVIEW_MESSAGE', { data: event.data }));
    document.querySelectorAll('.chrome, .bottombar, .tools-sheet').forEach(surface => {
      surface.addEventListener('contextmenu', event => event.preventDefault());
    });
  }

  loadPersisted();
  bindInputs();
  els.editor.value = state.durable.files[state.durable.activeFile];
  render();
  runPreview();
  render();
})();
