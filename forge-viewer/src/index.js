const DEVICE_ID_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
const MAX_LABEL_LENGTH = 80;
const MAX_CHANNEL_NAME_LENGTH = 40;
const MAX_URL_LENGTH = 2048;
const MAX_CHANNELS = 40;
const CHANNELS_KEY = "forge:channels";

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function normalizeDeviceId(value) {
  const id = String(value || "").trim().toLowerCase();
  return DEVICE_ID_RE.test(id) ? id : null;
}

function validateAssignment(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const rawUrl = String(input.url || "").trim();
  if (!rawUrl || rawUrl.length > MAX_URL_LENGTH) {
    return { ok: false, error: "URL is missing or too long." };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: "URL is invalid." };
  }

  const isLocalDev = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocalDev && parsed.protocol === "http:")) {
    return { ok: false, error: "Only HTTPS project URLs are allowed." };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "URLs containing embedded credentials are not allowed." };
  }

  const label = String(input.label || parsed.hostname).trim().slice(0, MAX_LABEL_LENGTH);
  return {
    ok: true,
    value: {
      url: parsed.href,
      label: label || parsed.hostname,
    },
  };
}

function validateChannel(input) {
  const name = String(input?.name || "").trim().slice(0, MAX_CHANNEL_NAME_LENGTH);
  if (!name) return { ok: false, error: "Channel name is required." };
  const assignment = validateAssignment({ url: input?.url, label: name });
  if (!assignment.ok) return assignment;
  return {
    ok: true,
    value: {
      name,
      url: assignment.value.url,
    },
  };
}

async function verifyControlKey(request, expected) {
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

function stateKey(deviceId) {
  return `device:${deviceId}`;
}

async function getDevice(env, deviceId) {
  const value = await env.FORGE_STATE.get(stateKey(deviceId), "json");
  return value || {
    device: deviceId,
    assignment: null,
    revision: 0,
    updatedAt: null,
  };
}

async function getChannels(env) {
  const value = await env.FORGE_STATE.get(CHANNELS_KEY, "json");
  return Array.isArray(value) ? value : [];
}

async function saveChannels(env, channels) {
  await env.FORGE_STATE.put(CHANNELS_KEY, JSON.stringify(channels));
}

async function handleChannels(request, env, pathname) {
  if (!(await verifyControlKey(request, env.CONTROL_KEY))) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  if (pathname === "/api/channels" && request.method === "GET") {
    return json({ channels: await getChannels(env) });
  }

  if (pathname === "/api/channels" && request.method === "POST") {
    let body;
    try { body = await request.json(); }
    catch { return json({ error: "Invalid JSON body." }, { status: 400 }); }

    const parsed = validateChannel(body);
    if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });

    const channels = await getChannels(env);
    if (channels.length >= MAX_CHANNELS) {
      return json({ error: `FORGE supports up to ${MAX_CHANNELS} saved channels.` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const channel = {
      id: crypto.randomUUID(),
      ...parsed.value,
      createdAt: now,
      updatedAt: now,
    };
    channels.push(channel);
    await saveChannels(env, channels);
    return json({ channel }, { status: 201 });
  }

  const match = pathname.match(/^\/api\/channels\/([0-9a-f-]{36})$/i);
  if (!match) return json({ error: "Not found." }, { status: 404 });

  const channels = await getChannels(env);
  const index = channels.findIndex((channel) => channel.id === match[1]);
  if (index < 0) return json({ error: "Channel not found." }, { status: 404 });

  if (request.method === "PUT") {
    let body;
    try { body = await request.json(); }
    catch { return json({ error: "Invalid JSON body." }, { status: 400 }); }

    const parsed = validateChannel(body);
    if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });
    channels[index] = {
      ...channels[index],
      ...parsed.value,
      updatedAt: new Date().toISOString(),
    };
    await saveChannels(env, channels);
    return json({ channel: channels[index] });
  }

  if (request.method === "DELETE") {
    const [removed] = channels.splice(index, 1);
    await saveChannels(env, channels);
    return json({ channel: removed });
  }

  return json({ error: "Method not allowed." }, { status: 405 });
}

async function handleDevice(request, env, pathname) {
  const match = pathname.match(/^\/api\/device\/([^/]+)$/);
  if (!match) return json({ error: "Not found." }, { status: 404 });

  const deviceId = normalizeDeviceId(decodeURIComponent(match[1]));
  if (!deviceId) return json({ error: "Invalid device id." }, { status: 400 });

  if (request.method === "GET") {
    return json(await getDevice(env, deviceId));
  }

  if (request.method === "PUT") {
    if (!(await verifyControlKey(request, env.CONTROL_KEY))) {
      return json({ error: "Unauthorized." }, { status: 401 });
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "Invalid JSON body." }, { status: 400 }); }

    const assignment = validateAssignment(body);
    if (!assignment.ok) return json({ error: assignment.error }, { status: 400 });

    const previous = await getDevice(env, deviceId);
    const next = {
      device: deviceId,
      assignment: assignment.value,
      revision: Number(previous.revision || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    await env.FORGE_STATE.put(stateKey(deviceId), JSON.stringify(next));
    return json(next, { status: 200 });
  }

  if (request.method === "DELETE") {
    if (!(await verifyControlKey(request, env.CONTROL_KEY))) {
      return json({ error: "Unauthorized." }, { status: 401 });
    }

    const previous = await getDevice(env, deviceId);
    const next = {
      device: deviceId,
      assignment: null,
      revision: Number(previous.revision || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await env.FORGE_STATE.put(stateKey(deviceId), JSON.stringify(next));
    return json(next);
  }

  return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET, PUT, DELETE" } });
}

async function handleApi(request, env, pathname) {
  if (pathname === "/api/channels" || pathname.startsWith("/api/channels/")) {
    return handleChannels(request, env, pathname);
  }
  if (pathname.startsWith("/api/device/")) {
    return handleDevice(request, env, pathname);
  }
  return json({ error: "Not found." }, { status: 404 });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        return Response.redirect(new URL("/control.html", url), 302);
      }

      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url.pathname);
      }

      if (url.pathname.startsWith("/view/")) {
        const deviceId = normalizeDeviceId(decodeURIComponent(url.pathname.slice("/view/".length)));
        if (!deviceId) return new Response("Invalid device id.", { status: 400 });
        const assetUrl = new URL("/viewer.html", url);
        return await env.ASSETS.fetch(new Request(assetUrl, request));
      }

      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.error(JSON.stringify({ event: "request_error", message: error instanceof Error ? error.message : String(error) }));
      return json({ error: "Internal error." }, { status: 500 });
    }
  },
};

export { normalizeDeviceId, validateAssignment, validateChannel };
