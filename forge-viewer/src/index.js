const DEVICE_ID_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
const MAX_LABEL_LENGTH = 80;
const MAX_URL_LENGTH = 2048;

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

async function handleApi(request, env, pathname) {
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
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body." }, { status: 400 });
    }

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

export { normalizeDeviceId, validateAssignment };
