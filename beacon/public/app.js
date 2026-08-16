const els = {
  keyInput: document.querySelector('#keyInput'),
  rememberKey: document.querySelector('#rememberKey'),
  unlockButton: document.querySelector('#unlockButton'),
  taskInput: document.querySelector('#taskInput'),
  dueInput: document.querySelector('#dueInput'),
  addButton: document.querySelector('#addButton'),
  refreshButton: document.querySelector('#refreshButton'),
  pairButton: document.querySelector('#pairButton'),
  pairResult: document.querySelector('#pairResult'),
  pairUrl: document.querySelector('#pairUrl'),
  copyPair: document.querySelector('#copyPair'),
  message: document.querySelector('#message'),
  taskList: document.querySelector('#taskList'),
  taskCount: document.querySelector('#taskCount'),
  status: document.querySelector('#status'),
  lanes: [...document.querySelectorAll('[data-lane]')],
};

const KEY_STORE = 'beacon:control-key';
let lane = 'soon';
let tasks = [];

function key() { return els.keyInput.value; }
function authHeaders(json = false) {
  return {
    authorization: `Bearer ${key()}`,
    ...(json ? { 'content-type': 'application/json' } : {}),
  };
}
function message(text = '', kind = '') {
  els.message.textContent = text;
  els.message.className = `message ${kind}`.trim();
}
function setStatus(text, good = false) {
  els.status.textContent = text;
  els.status.className = `status ${good ? 'good' : ''}`.trim();
}
function dueLabel(task) {
  if (!task.dueAt) return '';
  const d = new Date(task.dueAt);
  return `Due ${d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
}
function laneLabel(value) { return value.toUpperCase(); }

function render() {
  const active = tasks.filter((task) => !task.completedAt);
  els.taskCount.textContent = `${active.length} ${active.length === 1 ? 'task' : 'tasks'}`;
  els.taskList.replaceChildren();

  if (!active.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Nothing is calling for you right now.';
    els.taskList.append(empty);
    return;
  }

  const order = { now: 0, soon: 1, later: 2 };
  active.sort((a, b) => order[a.lane] - order[b.lane] || new Date(a.createdAt) - new Date(b.createdAt));
  for (const task of active) {
    const card = document.createElement('article');
    card.className = `task task-${task.lane}`;

    const copy = document.createElement('div');
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = laneLabel(task.lane);
    const text = document.createElement('p');
    text.textContent = task.text;
    copy.append(badge, text);
    if (task.dueAt) {
      const due = document.createElement('small');
      due.textContent = dueLabel(task);
      copy.append(due);
    }

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    for (const nextLane of ['now', 'soon', 'later']) {
      const button = document.createElement('button');
      button.className = nextLane === task.lane ? 'lane-mini active' : 'lane-mini';
      button.textContent = laneLabel(nextLane);
      button.addEventListener('click', () => patchTask(task.id, { lane: nextLane }));
      actions.append(button);
    }
    const done = document.createElement('button');
    done.className = 'done';
    done.textContent = 'DONE';
    done.addEventListener('click', () => patchTask(task.id, { done: true }));
    actions.append(done);

    card.append(copy, actions);
    els.taskList.append(card);
  }
}

async function api(path, init = {}) {
  const response = await fetch(path, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

async function refresh() {
  if (!key()) {
    setStatus('LOCKED');
    return;
  }
  try {
    const data = await api('/api/tasks', { headers: authHeaders() });
    tasks = data.tasks || [];
    render();
    setStatus('CONNECTED', true);
    if (els.rememberKey.checked) localStorage.setItem(KEY_STORE, key());
  } catch (error) {
    setStatus('LOCKED');
    message(error.message, 'bad');
  }
}

async function patchTask(id, body) {
  try {
    const data = await api(`/api/tasks/${id}`, {
      method: 'PATCH', headers: authHeaders(true), body: JSON.stringify(body),
    });
    tasks = tasks.map((task) => task.id === id ? data.task : task);
    render();
  } catch (error) { message(error.message, 'bad'); }
}

els.lanes.forEach((button) => button.addEventListener('click', () => {
  lane = button.dataset.lane;
  els.lanes.forEach((item) => item.classList.toggle('active', item === button));
}));

els.unlockButton.addEventListener('click', refresh);
els.refreshButton.addEventListener('click', refresh);
els.addButton.addEventListener('click', async () => {
  message();
  const text = els.taskInput.value.trim();
  if (!text) return message('Give BEACON something to hold onto.', 'bad');
  els.addButton.disabled = true;
  try {
    const dueAt = els.dueInput.value ? new Date(els.dueInput.value).toISOString() : null;
    const data = await api('/api/tasks', {
      method: 'POST', headers: authHeaders(true), body: JSON.stringify({ text, lane, dueAt }),
    });
    tasks.unshift(data.task);
    els.taskInput.value = '';
    els.dueInput.value = '';
    render();
    message('Caught.', 'good');
  } catch (error) { message(error.message, 'bad'); }
  finally { els.addButton.disabled = false; }
});

els.pairButton.addEventListener('click', async () => {
  message();
  els.pairButton.disabled = true;
  try {
    const data = await api('/api/pair', { method: 'POST', headers: authHeaders() });
    els.pairUrl.value = data.displayUrl;
    els.pairResult.hidden = false;
    message('Pair link ready. It works once and expires in 10 minutes.', 'good');
  } catch (error) { message(error.message, 'bad'); }
  finally { els.pairButton.disabled = false; }
});

els.copyPair.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(els.pairUrl.value);
    els.copyPair.textContent = 'COPIED';
    setTimeout(() => { els.copyPair.textContent = 'Copy'; }, 1200);
  } catch { els.pairUrl.select(); }
});

els.rememberKey.addEventListener('change', () => {
  if (!els.rememberKey.checked) localStorage.removeItem(KEY_STORE);
});

const stored = localStorage.getItem(KEY_STORE);
if (stored) {
  els.keyInput.value = stored;
  els.rememberKey.checked = true;
  refresh();
}
render();
