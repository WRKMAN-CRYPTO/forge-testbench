const FALLBACK_POLL_MS = 30000;
const RECONNECT_MS = 2000;
const CACHE_PREFIX = "forge:last-assignment:";
const DEVICE_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

const stage = document.querySelector("#stage");
const overlay = document.querySelector("#overlay");
const deviceEl = document.querySelector("#device");
const noteEl = document.querySelector("#note");
const dotEl = document.querySelector("#dot");

const rawDevice = decodeURIComponent(location.pathname.replace(/^\/view\//, "")).trim().toLowerCase();
const device = DEVICE_RE.test(rawDevice) ? rawDevice : "";
const cacheKey = CACHE_PREFIX + device;
let activeUrl = "";
let activeRevision = -1;
let hasLoadedFrame = false;
let socket = null;
let reconnectTimer = null;

function status(text, kind = "") {
  noteEl.textContent = text;
  dotEl.className = `viewer-dot ${kind}`.trim();
}

function showOverlay(show) {
  overlay.classList.toggle("hidden", !show);
}

function readCached() {
  try { return JSON.parse(localStorage.getItem(cacheKey) || "null"); }
  catch { return null; }
}

function writeCached(state) {
  try { localStorage.setItem(cacheKey, JSON.stringify(state)); } catch {}
}

function applyAssignment(state, source = "remote") {
  if (!state?.assignment?.url) {
    if (!activeUrl) {
      showOverlay(true);
      status("Waiting for assignment…");
    }
    return;
  }

  const nextUrl = state.assignment.url;
  const nextRevision = Number(state.revision || 0);
  if (nextUrl === activeUrl && nextRevision === activeRevision) return;

  activeUrl = nextUrl;
  activeRevision = nextRevision;
  hasLoadedFrame = false;
  showOverlay(true);
  status(source === "cache" ? "Restoring last assignment…" : `Loading ${state.assignment.label || "project"}…`);
  stage.src = nextUrl;
  writeCached(state);
}

stage.addEventListener("load", () => {
  if (!activeUrl) return;
  hasLoadedFrame = true;
  showOverlay(false);
  status(socket?.readyState === WebSocket.OPEN ? "Live switchboard connected." : "Project loaded.", "good");
});

async function poll() {
  if (!device) {
    showOverlay(true);
    status("Invalid screen address.", "bad");
    return;
  }

  try {
    const response = await fetch(`/api/device/${encodeURIComponent(device)}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const state = await response.json();
    if (state.assignment) {
      applyAssignment(state, "poll");
      if (hasLoadedFrame) showOverlay(false);
    } else if (!activeUrl) {
      showOverlay(true);
      status("Waiting for assignment…");
    }
  } catch {
    if (!activeUrl) {
      const cached = readCached();
      if (cached?.assignment?.url) {
        applyAssignment(cached, "cache");
      } else {
        showOverlay(true);
        status("Control service unavailable. Retrying…", "bad");
      }
    }
  }
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connectLive, RECONNECT_MS);
}

function connectLive() {
  if (!device) return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}/api/device/${encodeURIComponent(device)}/stream`);

  socket.addEventListener("open", () => {
    if (hasLoadedFrame) status("Live switchboard connected.", "good");
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message?.type === "state" && message.state) {
        applyAssignment(message.state, "live");
      }
    } catch {}
  });

  socket.addEventListener("close", () => {
    socket = null;
    if (hasLoadedFrame) status("Reconnecting live switchboard…");
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    try { socket.close(); } catch {}
  });
}

deviceEl.textContent = device ? device.toUpperCase() : "INVALID SCREEN";
const cached = readCached();
if (cached?.assignment?.url) applyAssignment(cached, "cache");
poll();
connectLive();
setInterval(poll, FALLBACK_POLL_MS);
