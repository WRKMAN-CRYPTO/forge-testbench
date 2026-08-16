const POLL_MS = 10000;
const els = {
  status: document.querySelector('#displayStatus'),
  overlay: document.querySelector('#displayOverlay'),
  overlayTitle: document.querySelector('#overlayTitle'),
  overlayText: document.querySelector('#overlayText'),
  nowTasks: document.querySelector('#nowTasks'),
  soonTasks: document.querySelector('#soonTasks'),
  laterTasks: document.querySelector('#laterTasks'),
  nowCount: document.querySelector('#nowCount'),
  soonCount: document.querySelector('#soonCount'),
  laterCount: document.querySelector('#laterCount'),
};

function setStatus(text, good = false) {
  els.status.textContent = text;
  els.status.className = `status ${good ? 'good' : ''}`.trim();
}
function showOverlay(title, text) {
  els.overlay.hidden = false;
  els.overlayTitle.textContent = title;
  els.overlayText.textContent = text;
}
function hideOverlay() { els.overlay.hidden = true; }
function dueLabel(task) {
  if (!task.dueAt) return '';
  const date = new Date(task.dueAt);
  return date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function renderLane(target, countTarget, tasks) {
  target.replaceChildren();
  countTarget.textContent = String(tasks.length);
  for (const task of tasks) {
    const card = document.createElement('article');
    card.className = 'display-task';
    const text = document.createElement('p');
    text.textContent = task.text;
    card.append(text);
    if (task.dueAt) {
      const due = document.createElement('small');
      due.textContent = `DUE ${dueLabel(task)}`;
      card.append(due);
    }
    target.append(card);
  }
}

function render(tasks) {
  const active = tasks.filter((task) => !task.completedAt);
  renderLane(els.nowTasks, els.nowCount, active.filter((task) => task.lane === 'now'));
  renderLane(els.soonTasks, els.soonCount, active.filter((task) => task.lane === 'soon'));
  renderLane(els.laterTasks, els.laterCount, active.filter((task) => task.lane === 'later'));
}

async function exchangePair() {
  const params = new URLSearchParams(location.search);
  const pair = params.get('pair');
  if (!pair) return;
  showOverlay('Pairing screen…', 'Trading the one-time link for a display session.');
  const response = await fetch('/api/display-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pair }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Pairing failed.');
  }
  history.replaceState({}, '', '/display');
}

async function poll() {
  try {
    const response = await fetch('/api/tasks', { cache: 'no-store' });
    if (response.status === 401) {
      setStatus('UNPAIRED');
      showOverlay('This screen needs pairing.', 'Create a fresh pair link from your BEACON phone controller and send it here through FORGE.');
      return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    render(data.tasks || []);
    hideOverlay();
    setStatus('LIVE', true);
  } catch {
    setStatus('RETRYING');
  }
}

try {
  await exchangePair();
  await poll();
} catch (error) {
  setStatus('PAIR FAILED');
  showOverlay('Pairing failed.', error.message || 'Create a new pair link and try again.');
}
setInterval(poll, POLL_MS);
