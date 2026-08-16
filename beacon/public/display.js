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

function displayKey() {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  return new URLSearchParams(hash).get('key') || '';
}
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

async function poll() {
  const key = displayKey();
  if (!key) {
    setStatus('UNPAIRED');
    showOverlay('This screen needs a display link.', 'Create a permanent display link from your BEACON phone controller and save it as a FORGE channel.');
    return;
  }

  try {
    const response = await fetch('/api/tasks', {
      cache: 'no-store',
      headers: { 'x-beacon-display': key },
    });
    if (response.status === 401) {
      setStatus('LINK INVALID');
      showOverlay('Display link no longer valid.', 'Create or regenerate the permanent BEACON display link, then update the saved FORGE channel once.');
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

await poll();
setInterval(poll, POLL_MS);
