const els = {
  deviceInput: document.querySelector("#deviceInput"),
  deviceTitle: document.querySelector("#deviceTitle"),
  connectionStatus: document.querySelector("#connectionStatus"),
  currentLabel: document.querySelector("#currentLabel"),
  currentUrl: document.querySelector("#currentUrl"),
  labelInput: document.querySelector("#labelInput"),
  urlInput: document.querySelector("#urlInput"),
  keyInput: document.querySelector("#keyInput"),
  assignButton: document.querySelector("#assignButton"),
  clearButton: document.querySelector("#clearButton"),
  message: document.querySelector("#message"),
  historyCard: document.querySelector("#historyCard"),
  history: document.querySelector("#history"),
};

const HISTORY_KEY = "forge:recent-projects";
const DEVICE_KEY = "forge:last-device";
const DEVICE_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

function normalizeDevice() {
  return els.deviceInput.value.trim().toLowerCase();
}

function setMessage(text = "", kind = "") {
  els.message.textContent = text;
  els.message.className = `message ${kind}`.trim();
}

function setConnection(text, kind = "") {
  els.connectionStatus.textContent = text;
  els.connectionStatus.className = `status ${kind}`.trim();
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveRecent(project) {
  const next = [project, ...loadHistory().filter((item) => item.url !== project.url)].slice(0, 5);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  renderHistory();
}

function renderHistory() {
  const items = loadHistory();
  els.history.textContent = "";
  els.historyCard.hidden = items.length === 0;
  for (const item of items) {
    const button = document.createElement("button");
    const title = document.createElement("strong");
    const detail = document.createElement("small");
    title.textContent = item.label || "PROJECT";
    detail.textContent = item.url;
    button.append(title, detail);
    button.addEventListener("click", () => {
      els.labelInput.value = item.label || "";
      els.urlInput.value = item.url;
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
    els.history.append(button);
  }
}

async function refresh() {
  const device = normalizeDevice();
  els.deviceTitle.textContent = device ? device.toUpperCase() : "INVALID DEVICE";
  if (!DEVICE_RE.test(device)) {
    setConnection("INVALID", "bad");
    return;
  }
  localStorage.setItem(DEVICE_KEY, device);
  setConnection("CHECKING");
  try {
    const response = await fetch(`/api/device/${encodeURIComponent(device)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const state = await response.json();
    if (state.assignment) {
      els.currentLabel.textContent = state.assignment.label || "PROJECT";
      els.currentUrl.textContent = state.assignment.url;
    } else {
      els.currentLabel.textContent = "Unassigned";
      els.currentUrl.textContent = "No project URL assigned.";
    }
    setConnection("ONLINE", "good");
  } catch {
    setConnection("OFFLINE", "bad");
  }
}

async function writeAssignment(method, body) {
  const device = normalizeDevice();
  const key = els.keyInput.value;
  if (!DEVICE_RE.test(device)) throw new Error("Device ID must use lowercase letters, numbers, and hyphens.");
  if (!key) throw new Error("Enter the control key.");

  const response = await fetch(`/api/device/${encodeURIComponent(device)}`, {
    method,
    headers: {
      "authorization": `Bearer ${key}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

els.assignButton.addEventListener("click", async () => {
  setMessage();
  els.assignButton.disabled = true;
  try {
    const url = els.urlInput.value.trim();
    if (!url) throw new Error("Enter a project URL.");
    const label = els.labelInput.value.trim() || new URL(url).hostname;
    await writeAssignment("PUT", { label, url });
    saveRecent({ label, url: new URL(url).href });
    setMessage(`${label} sent to ${normalizeDevice().toUpperCase()}.`, "good");
    await refresh();
  } catch (error) {
    setMessage(error.message || String(error), "bad");
  } finally {
    els.assignButton.disabled = false;
  }
});

els.clearButton.addEventListener("click", async () => {
  setMessage();
  els.clearButton.disabled = true;
  try {
    await writeAssignment("DELETE");
    setMessage(`Assignment cleared for ${normalizeDevice().toUpperCase()}.`, "good");
    await refresh();
  } catch (error) {
    setMessage(error.message || String(error), "bad");
  } finally {
    els.clearButton.disabled = false;
  }
});

els.deviceInput.addEventListener("change", refresh);
els.deviceInput.value = localStorage.getItem(DEVICE_KEY) || "forge-01";
renderHistory();
refresh();
setInterval(refresh, 15000);
