const els = {
  deviceInput: document.querySelector("#deviceInput"),
  deviceTitle: document.querySelector("#deviceTitle"),
  connectionStatus: document.querySelector("#connectionStatus"),
  currentLabel: document.querySelector("#currentLabel"),
  currentUrl: document.querySelector("#currentUrl"),
  keyInput: document.querySelector("#keyInput"),
  loadChannelsButton: document.querySelector("#loadChannelsButton"),
  authMessage: document.querySelector("#authMessage"),
  channels: document.querySelector("#channels"),
  channelCount: document.querySelector("#channelCount"),
  channelNameInput: document.querySelector("#channelNameInput"),
  channelUrlInput: document.querySelector("#channelUrlInput"),
  channelIdInput: document.querySelector("#channelIdInput"),
  saveChannelButton: document.querySelector("#saveChannelButton"),
  cancelChannelButton: document.querySelector("#cancelChannelButton"),
  channelMessage: document.querySelector("#channelMessage"),
  labelInput: document.querySelector("#labelInput"),
  urlInput: document.querySelector("#urlInput"),
  assignButton: document.querySelector("#assignButton"),
  clearButton: document.querySelector("#clearButton"),
  message: document.querySelector("#message"),
};

const DEVICE_KEY = "forge:last-device";
const DEVICE_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
let channels = [];

function normalizeDevice() {
  return els.deviceInput.value.trim().toLowerCase();
}

function setMessage(el, text = "", kind = "") {
  el.textContent = text;
  el.className = `message ${kind}`.trim();
}

function setConnection(text, kind = "") {
  els.connectionStatus.textContent = text;
  els.connectionStatus.className = `status ${kind}`.trim();
}

function authHeaders(json = false) {
  return {
    authorization: `Bearer ${els.keyInput.value}`,
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

async function api(path, init = {}) {
  const response = await fetch(path, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
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
    const state = await api(`/api/device/${encodeURIComponent(device)}?t=${Date.now()}`);
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
  if (!DEVICE_RE.test(device)) throw new Error("Device ID must use lowercase letters, numbers, and hyphens.");
  if (!els.keyInput.value) throw new Error("Enter the control key.");
  return api(`/api/device/${encodeURIComponent(device)}`, {
    method,
    headers: authHeaders(Boolean(body)),
    body: body ? JSON.stringify(body) : undefined,
  });
}

function resetChannelEditor() {
  els.channelIdInput.value = "";
  els.channelNameInput.value = "";
  els.channelUrlInput.value = "";
  els.saveChannelButton.textContent = "SAVE CHANNEL";
  els.cancelChannelButton.hidden = true;
}

function editChannel(channel) {
  els.channelIdInput.value = channel.id;
  els.channelNameInput.value = channel.name;
  els.channelUrlInput.value = channel.url;
  els.saveChannelButton.textContent = "UPDATE CHANNEL";
  els.cancelChannelButton.hidden = false;
  els.channelNameInput.focus();
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

async function sendChannel(channel, button) {
  setMessage(els.message);
  button.disabled = true;
  try {
    await writeAssignment("PUT", { label: channel.name, url: channel.url });
    setMessage(els.message, `${channel.name} sent to ${normalizeDevice().toUpperCase()}.`, "good");
    await refresh();
  } catch (error) {
    setMessage(els.message, error.message || String(error), "bad");
  } finally {
    button.disabled = false;
  }
}

async function deleteChannel(channel) {
  if (!confirm(`Delete channel ${channel.name}?`)) return;
  try {
    await api(`/api/channels/${channel.id}`, { method: "DELETE", headers: authHeaders() });
    channels = channels.filter((item) => item.id !== channel.id);
    renderChannels();
    if (els.channelIdInput.value === channel.id) resetChannelEditor();
    setMessage(els.channelMessage, `${channel.name} deleted.`, "good");
  } catch (error) {
    setMessage(els.channelMessage, error.message || String(error), "bad");
  }
}

function renderChannels() {
  els.channels.replaceChildren();
  els.channelCount.textContent = String(channels.length);

  if (!channels.length) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = els.keyInput.value ? "No channels saved yet." : "Enter the control key to load channels.";
    els.channels.append(empty);
    return;
  }

  for (const channel of channels) {
    const row = document.createElement("div");
    row.className = "channel-row";

    const send = document.createElement("button");
    send.className = "channel-send";
    const name = document.createElement("strong");
    const url = document.createElement("small");
    name.textContent = channel.name;
    url.textContent = channel.url;
    send.append(name, url);
    send.addEventListener("click", () => sendChannel(channel, send));

    const tools = document.createElement("div");
    tools.className = "channel-tools";
    const edit = document.createElement("button");
    edit.textContent = "EDIT";
    edit.addEventListener("click", () => editChannel(channel));
    const del = document.createElement("button");
    del.textContent = "DELETE";
    del.className = "channel-delete";
    del.addEventListener("click", () => deleteChannel(channel));
    tools.append(edit, del);

    row.append(send, tools);
    els.channels.append(row);
  }
}

async function loadChannels() {
  setMessage(els.authMessage);
  if (!els.keyInput.value) return setMessage(els.authMessage, "Enter the control key.", "bad");
  els.loadChannelsButton.disabled = true;
  try {
    const data = await api("/api/channels", { headers: authHeaders() });
    channels = data.channels || [];
    renderChannels();
    setMessage(els.authMessage, "Channels loaded.", "good");
  } catch (error) {
    channels = [];
    renderChannels();
    setMessage(els.authMessage, error.message || String(error), "bad");
  } finally {
    els.loadChannelsButton.disabled = false;
  }
}

els.loadChannelsButton.addEventListener("click", loadChannels);
els.keyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadChannels();
});

els.saveChannelButton.addEventListener("click", async () => {
  setMessage(els.channelMessage);
  if (!els.keyInput.value) return setMessage(els.channelMessage, "Enter the control key first.", "bad");
  const name = els.channelNameInput.value.trim();
  const url = els.channelUrlInput.value.trim();
  const id = els.channelIdInput.value;
  if (!name || !url) return setMessage(els.channelMessage, "Channel name and URL are required.", "bad");

  els.saveChannelButton.disabled = true;
  try {
    const data = await api(id ? `/api/channels/${id}` : "/api/channels", {
      method: id ? "PUT" : "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ name, url }),
    });
    if (id) channels = channels.map((item) => item.id === id ? data.channel : item);
    else channels.push(data.channel);
    renderChannels();
    resetChannelEditor();
    setMessage(els.channelMessage, `${data.channel.name} saved.`, "good");
  } catch (error) {
    setMessage(els.channelMessage, error.message || String(error), "bad");
  } finally {
    els.saveChannelButton.disabled = false;
  }
});

els.cancelChannelButton.addEventListener("click", () => {
  resetChannelEditor();
  setMessage(els.channelMessage);
});

els.assignButton.addEventListener("click", async () => {
  setMessage(els.message);
  els.assignButton.disabled = true;
  try {
    const url = els.urlInput.value.trim();
    if (!url) throw new Error("Enter a project URL.");
    const label = els.labelInput.value.trim() || new URL(url).hostname;
    await writeAssignment("PUT", { label, url });
    setMessage(els.message, `${label} sent to ${normalizeDevice().toUpperCase()}.`, "good");
    await refresh();
  } catch (error) {
    setMessage(els.message, error.message || String(error), "bad");
  } finally {
    els.assignButton.disabled = false;
  }
});

els.clearButton.addEventListener("click", async () => {
  setMessage(els.message);
  els.clearButton.disabled = true;
  try {
    await writeAssignment("DELETE");
    setMessage(els.message, `Assignment cleared for ${normalizeDevice().toUpperCase()}.`, "good");
    await refresh();
  } catch (error) {
    setMessage(els.message, error.message || String(error), "bad");
  } finally {
    els.clearButton.disabled = false;
  }
});

els.deviceInput.addEventListener("change", refresh);
els.deviceInput.value = localStorage.getItem(DEVICE_KEY) || "forge-01";
renderChannels();
refresh();
setInterval(refresh, 15000);
