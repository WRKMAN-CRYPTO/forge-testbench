(() => {
  'use strict';

  const STORAGE_KEY = 'wrkman-ide:v1';
  const SCHEMA_VERSION = 1;
  const FILE_META = {
    html: { name: 'index.html' },
    css: { name: 'styles.css' },
    js: { name: 'app.js' }
  };
  const MODES = new Set(['code', 'preview', 'console', 'tools']);
  const HISTORY_LIMIT = 80;

  const DECK_KEYS = {
    html: [
      { label: '<>', action: 'pair', open: '<', close: '>' },
      { label: '""', action: 'pair', open: '"', close: '"' },
      { label: '=', action: 'insert', value: '=' },
      { label: '/', action: 'insert', value: '/' },
      { label: '<!-- -->', action: 'pair', open: '<!-- ', close: ' -->', wide: true },
      { label: '&', action: 'insert', value: '&' }
    ],
    css: [
      { label: '{}', action: 'pair', open: '{', close: '}' },
      { label: ':', action: 'insert', value: ':' },
      { label: ';', action: 'insert', value: ';' },
      { label: '()', action: 'pair', open: '(', close: ')' },
      { label: '#', action: 'insert', value: '#' },
      { label: '.', action: 'insert', value: '.' },
      { label: '-', action: 'insert', value: '-' },
      { label: 'px', action: 'insert', value: 'px' }
    ],
    js: [
      { label: '()', action: 'pair', open: '(', close: ')' },
      { label: '{}', action: 'pair', open: '{', close: '}' },
      { label: '[]', action: 'pair', open: '[', close: ']' },
      { label: "''", action: 'pair', open: "'", close: "'" },
      { label: '""', action: 'pair', open: '"', close: '"' },
      { label: '``', action: 'pair', open: '`', close: '`' },
      { label: '=>', action: 'insert', value: '=>', wide: true },
      { label: ';', action: 'insert', value: ';' },
      { label: '=', action: 'insert', value: '=' },
      { label: '.', action: 'insert', value: '.' }
    ]
  };

  const COMMON_DECK_KEYS = [
    { label: 'TAB', action: 'indent', control: true, wide: true },
    { label: '⇤', action: 'outdent', control: true },
    { label: '←', action: 'left', control: true },
    { label: '→', action: 'right', control: true },
    { label: '↶', action: 'undo', control: true },
    { label: '↷', action: 'redo', control: true }
  ];

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

  const emptyHistory = () => ({ html: [], css: [], js: [] });

  const state = {
    durable: starter(),
    ui: {
      mode: 'code',
      editorFocused: false,
      saveStatus: 'READY',
      logs: [],
      errorCount: 0,
      previewDocument: '',
      previewRunId: 0,
      toast: '',
      toastToken: 0,
      undo: emptyHistory(),
      redo: emptyHistory(),
      selectionToken: 0,
      selectionRequest: null
    },
    queue: [],
    processing: false,
    saveTimer: null,
    toastTimer: null
  };

  let renderedPreviewRunId = -1;
  let renderedDeckFile = '';
  let appliedSelectionToken = -1;

  const els = {
    app: document.querySelector('#app'),
    editor: document.querySelector('#editor'),
    editorPane: document.querySelector('#editorPane'),
    codeDeck: document.querySelector('#codeDeck'),
    fileName: document.querySelector('#fileName'),
    lineCount: document.querySelector('#lineCount'),
    saveStatus: document.querySelector('#saveStatus'),
    runBtn: document.querySelector('#runBtn'),
    preview: document.querySelector('#preview'),
    previewPane: document.querySelector('#previewPane'),
    consolePane: document.querySelector('#consolePane'),
    toolsPane: document.querySelector('#toolsPane'),
    consoleOutput: document.querySelector('#consoleOutput'),
    codeBtn: document.querySelector('#codeBtn'),
    previewBtn: document.querySelector('#previewBtn'),
    consoleBtn: document.querySelector('#consoleBtn'),
    errorBadge: document.querySelector('#errorBadge'),
    clearConsole: document.querySelector('#clearConsole'),
    toolsBtn: document.querySelector('#toolsBtn'),
    resetProject: document.querySelector('#resetProject'),
    toast: document.querySelector('#toast'),
    fileTabs: [...document.querySelectorAll('[data-file]')]
  };

  function enqueue(type, payload = {}) {
    state.queue.push({ type, payload });
    if (state.queue.length > 250) {
      state.queue.splice(0, state.queue.length - 250);
      state.queue.push({ type: 'QUEUE_OVERLOAD', payload: {} });
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
      case 'EDIT':
        commitNativeEdit(event.payload.value);
        break;
      case 'DECK_ACTION':
        applyDeckAction(event.payload);
        break;
      case 'SELECT_FILE':
        if (FILE_META[event.payload.file]) {
          state.durable.activeFile = event.payload.file;
          state.ui.mode = 'code';
        }
        break;
      case 'SET_MODE':
        if (MODES.has(event.payload.mode)) state.ui.mode = event.payload.mode;
        break;
      case 'EDITOR_FOCUS':
        state.ui.editorFocused = true;
        state.ui.mode = 'code';
        break;
      case 'EDITOR_BLUR':
        state.ui.editorFocused = false;
        break;
      case 'CLEAR_CONSOLE':
        state.ui.logs = [];
        state.ui.errorCount = 0;
        break;
      case 'RESET':
        state.durable = starter();
        state.ui.logs = [];
        state.ui.errorCount = 0;
        state.ui.mode = 'code';
        state.ui.undo = emptyHistory();
        state.ui.redo = emptyHistory();
        persistCurrentState();
        prepareRun(false);
        setToast('Starter project restored');
        break;
      case 'RUN':
        prepareRun(true);
        setToast('Build executed');
        break;
      case 'SAVE':
        if (event.payload.revision === state.durable.revision) persistCurrentState();
        break;
      case 'PREVIEW_MESSAGE':
        handlePreviewMessage(event.payload.data);
        break;
      case 'TOAST_EXPIRE':
        if (event.payload.token === state.ui.toastToken) state.ui.toast = '';
        break;
      case 'QUEUE_OVERLOAD':
        appendLog('error', 'Input queue trimmed after overload.');
        break;
    }
  }

  function pushHistory(stack, value) {
    if (stack[stack.length - 1] === value) return;
    stack.push(value);
    if (stack.length > HISTORY_LIMIT) stack.shift();
  }

  function commitNativeEdit(next) {
    const key = state.durable.activeFile;
    const current = state.durable.files[key];
    if (current === next) return;
    pushHistory(state.ui.undo[key], current);
    state.ui.redo[key] = [];
    state.durable.files[key] = next;
    state.durable.revision += 1;
    scheduleSave();
  }

  function commitDeckEdit(next, start, end, recordHistory = true) {
    const key = state.durable.activeFile;
    const current = state.durable.files[key];
    if (current !== next) {
      if (recordHistory) pushHistory(state.ui.undo[key], current);
      if (recordHistory) state.ui.redo[key] = [];
      state.durable.files[key] = next;
      state.durable.revision += 1;
      scheduleSave();
    }
    requestSelection(start, end, true);
  }

  function requestSelection(start, end, focus) {
    state.ui.selectionToken += 1;
    state.ui.selectionRequest = { token: state.ui.selectionToken, start, end, focus };
  }

  function clampSelection(source, start, end) {
    const safeStart = Math.max(0, Math.min(source.length, Number.isInteger(start) ? start : source.length));
    const safeEnd = Math.max(safeStart, Math.min(source.length, Number.isInteger(end) ? end : safeStart));
    return [safeStart, safeEnd];
  }

  function applyDeckAction(payload) {
    const key = state.durable.activeFile;
    const source = state.durable.files[key];
    const [start, end] = clampSelection(source, payload.start, payload.end);
    const selected = source.slice(start, end);

    if (payload.action === 'insert') {
      const value = payload.value || '';
      const next = source.slice(0, start) + value + source.slice(end);
      const caret = start + value.length;
      commitDeckEdit(next, caret, caret);
      return;
    }

    if (payload.action === 'pair') {
      const open = payload.open || '';
      const close = payload.close || '';
      const next = source.slice(0, start) + open + selected + close + source.slice(end);
      const innerStart = start + open.length;
      const innerEnd = innerStart + selected.length;
      commitDeckEdit(next, innerStart, innerEnd);
      return;
    }

    if (payload.action === 'left' || payload.action === 'right') {
      let caret;
      if (start !== end) caret = payload.action === 'left' ? start : end;
      else caret = payload.action === 'left' ? Math.max(0, start - 1) : Math.min(source.length, end + 1);
      requestSelection(caret, caret, true);
      return;
    }

    if (payload.action === 'indent') {
      const lineStart = source.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const lineEndIndex = source.indexOf('\n', end);
      const lineEnd = lineEndIndex === -1 ? source.length : lineEndIndex;
      const block = source.slice(lineStart, lineEnd);
      const lines = block.split('\n');
      const replacement = lines.map(line => '  ' + line).join('\n');
      const next = source.slice(0, lineStart) + replacement + source.slice(lineEnd);
      const newStart = start + 2;
      const newEnd = end + (2 * lines.length);
      commitDeckEdit(next, newStart, newEnd);
      return;
    }

    if (payload.action === 'outdent') {
      const lineStart = source.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const lineEndIndex = source.indexOf('\n', end);
      const lineEnd = lineEndIndex === -1 ? source.length : lineEndIndex;
      const block = source.slice(lineStart, lineEnd);
      const lines = block.split('\n');
      let removedBeforeStart = 0;
      let removedTotal = 0;
      let offset = lineStart;
      const replacement = lines.map(line => {
        const match = line.match(/^ {1,2}/);
        const removed = match ? match[0].length : 0;
        if (offset <= start) removedBeforeStart += removed;
        removedTotal += removed;
        offset += line.length + 1;
        return line.slice(removed);
      }).join('\n');
      const next = source.slice(0, lineStart) + replacement + source.slice(lineEnd);
      commitDeckEdit(next, Math.max(lineStart, start - removedBeforeStart), Math.max(lineStart, end - removedTotal));
      return;
    }

    if (payload.action === 'undo') {
      const undo = state.ui.undo[key];
      if (!undo.length) return;
      const previous = undo.pop();
      pushHistory(state.ui.redo[key], source);
      state.durable.files[key] = previous;
      state.durable.revision += 1;
      scheduleSave();
      const caret = Math.min(start, previous.length);
      requestSelection(caret, caret, true);
      return;
    }

    if (payload.action === 'redo') {
      const redo = state.ui.redo[key];
      if (!redo.length) return;
      const next = redo.pop();
      pushHistory(state.ui.undo[key], source);
      state.durable.files[key] = next;
      state.durable.revision += 1;
      scheduleSave();
      const caret = Math.min(start, next.length);
      requestSelection(caret, caret, true);
    }
  }

  function scheduleSave() {
    state.ui.saveStatus = 'UNSAVED';
    clearTimeout(state.saveTimer);
    const revision = state.durable.revision;
    state.saveTimer = setTimeout(() => enqueue('SAVE', { revision }), 260);
  }

  function persistCurrentState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.durable));
      state.ui.saveStatus = 'SAVED';
    } catch (error) {
      state.ui.saveStatus = 'SAVE FAILED';
      appendLog('error', `Save failed: ${error.message}`);
    }
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

  function prepareRun(showPreview) {
    state.ui.logs = [{ level: 'info', message: `Run revision ${state.durable.revision}`, time: Date.now() }];
    state.ui.errorCount = 0;
    state.ui.previewDocument = buildPreviewDocument();
    state.ui.previewRunId += 1;
    if (showPreview) {
      state.ui.editorFocused = false;
      state.ui.mode = 'preview';
      els.editor.blur();
    }
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

  function setToast(message) {
    state.ui.toast = message;
    state.ui.toastToken += 1;
    const token = state.ui.toastToken;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => enqueue('TOAST_EXPIRE', { token }), 1300);
  }

  function setPaneState(element, active) {
    element.classList.toggle('active-pane', active);
    element.setAttribute('aria-hidden', String(!active));
  }

  function renderDeck(file) {
    if (renderedDeckFile === file) return;
    renderedDeckFile = file;
    const keys = [...DECK_KEYS[file], ...COMMON_DECK_KEYS];
    els.codeDeck.replaceChildren(...keys.map(key => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `deck-key${key.control ? ' control' : ''}${key.wide ? ' wide' : ''}`;
      button.textContent = key.label;
      button.dataset.action = key.action;
      if (key.value !== undefined) button.dataset.value = key.value;
      if (key.open !== undefined) button.dataset.open = key.open;
      if (key.close !== undefined) button.dataset.close = key.close;
      button.setAttribute('aria-label', `Code key ${key.label}`);
      return button;
    }));
    els.codeDeck.scrollLeft = 0;
  }

  function render() {
    const active = state.durable.activeFile;
    const source = state.durable.files[active];
    if (els.editor.value !== source && document.activeElement !== els.editor) els.editor.value = source;
    els.fileName.textContent = FILE_META[active].name;
    const lines = source.split('\n').length;
    els.lineCount.textContent = `${lines} ${lines === 1 ? 'LINE' : 'LINES'}`;
    els.saveStatus.textContent = state.ui.saveStatus;
    els.fileTabs.forEach(tab => tab.classList.toggle('active', state.ui.mode === 'code' && tab.dataset.file === active));
    els.toolsBtn.classList.toggle('active', state.ui.mode === 'tools');

    renderDeck(active);
    setPaneState(els.editorPane, state.ui.mode === 'code');
    setPaneState(els.previewPane, state.ui.mode === 'preview');
    setPaneState(els.consolePane, state.ui.mode === 'console');
    setPaneState(els.toolsPane, state.ui.mode === 'tools');

    els.codeBtn.classList.toggle('active', state.ui.mode === 'code');
    els.previewBtn.classList.toggle('active', state.ui.mode === 'preview');
    els.consoleBtn.classList.toggle('active', state.ui.mode === 'console');
    els.errorBadge.hidden = state.ui.errorCount === 0;
    els.errorBadge.textContent = String(state.ui.errorCount);
    els.app.classList.toggle('editor-focused', state.ui.editorFocused);

    els.consoleOutput.replaceChildren(...state.ui.logs.map(log => {
      const row = document.createElement('div');
      row.className = `log ${log.level}`;
      row.textContent = log.message;
      return row;
    }));
    els.consoleOutput.scrollTop = els.consoleOutput.scrollHeight;

    if (renderedPreviewRunId !== state.ui.previewRunId) {
      renderedPreviewRunId = state.ui.previewRunId;
      els.preview.srcdoc = state.ui.previewDocument;
    }

    const selection = state.ui.selectionRequest;
    if (selection && selection.token !== appliedSelectionToken) {
      appliedSelectionToken = selection.token;
      els.editor.value = source;
      if (selection.focus) els.editor.focus({ preventScroll: true });
      els.editor.setSelectionRange(selection.start, selection.end);
    }

    els.toast.textContent = state.ui.toast;
    els.toast.classList.toggle('show', Boolean(state.ui.toast));
  }

  function bindInputs() {
    els.editor.addEventListener('input', event => enqueue('EDIT', { value: event.target.value }));
    els.editor.addEventListener('focus', () => enqueue('EDITOR_FOCUS'));
    els.editor.addEventListener('blur', () => enqueue('EDITOR_BLUR'));
    els.editor.addEventListener('keydown', event => {
      if (event.key === 'Tab') {
        event.preventDefault();
        enqueue('DECK_ACTION', {
          action: event.shiftKey ? 'outdent' : 'indent',
          start: els.editor.selectionStart,
          end: els.editor.selectionEnd
        });
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') enqueue('RUN');
    });

    els.codeDeck.addEventListener('pointerdown', event => {
      const button = event.target.closest('.deck-key');
      if (!button) return;
      event.preventDefault();
      enqueue('DECK_ACTION', {
        action: button.dataset.action,
        value: button.dataset.value,
        open: button.dataset.open,
        close: button.dataset.close,
        start: els.editor.selectionStart,
        end: els.editor.selectionEnd
      });
    });

    els.fileTabs.forEach(tab => tab.addEventListener('click', () => enqueue('SELECT_FILE', { file: tab.dataset.file })));
    els.runBtn.addEventListener('click', () => enqueue('RUN'));
    els.codeBtn.addEventListener('click', () => enqueue('SET_MODE', { mode: 'code' }));
    els.previewBtn.addEventListener('click', () => enqueue('SET_MODE', { mode: 'preview' }));
    els.consoleBtn.addEventListener('click', () => enqueue('SET_MODE', { mode: 'console' }));
    els.clearConsole.addEventListener('click', () => enqueue('CLEAR_CONSOLE'));
    els.toolsBtn.addEventListener('click', () => enqueue('SET_MODE', { mode: 'tools' }));
    els.resetProject.addEventListener('click', () => {
      if (confirm('Reset all three files to the WRKMAN starter project?')) enqueue('RESET');
    });
    window.addEventListener('message', event => enqueue('PREVIEW_MESSAGE', { data: event.data }));
    document.querySelectorAll('.chrome, .bottombar').forEach(surface => {
      surface.addEventListener('contextmenu', event => event.preventDefault());
    });
  }

  loadPersisted();
  bindInputs();
  els.editor.value = state.durable.files[state.durable.activeFile];
  prepareRun(false);
  render();
})();
