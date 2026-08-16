const TASKS_KEY = "beacon:tasks";
const PAIR_PREFIX = "beacon:pair:";
const SESSION_PREFIX = "beacon:session:";
const PAIR_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const LANES = new Set(["now", "soon", "later"]);

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return btoa(String.fromCharCode(...data))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function constantTimeEqual(a, b) {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(a || ""))),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(b || ""))),
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

function bearer(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function cookieValue(request, name) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

async function hasControlAuth(request, env) {
  return Boolean(env.BEACON_KEY) && constantTimeEqual(bearer(request), env.BEACON_KEY);
}

async function hasDisplaySession(request, env) {
  const token = cookieValue(request, "beacon_session");
  if (!token) return false;
  const hash = await sha256Hex(token);
  const session = await env.BEACON_STATE.get(`${SESSION_PREFIX}${hash}`, "json");
  if (!session || Number(session.expiresAt || 0) <= Date.now()) return false;
  return true;
}

async function canRead(request, env) {
  if (await hasControlAuth(request, env)) return true;
  return hasDisplaySession(request, env);
}

async function readTasks(env) {
  const tasks = await env.BEACON_STATE.get(TASKS_KEY, "json");
  return Array.isArray(tasks) ? tasks : [];
}

async function writeTasks(env, tasks) {
  await env.BEACON_STATE.put(TASKS_KEY, JSON.stringify(tasks));
}

function normalizeTaskInput(input) {
  const text = String(input?.text || "").trim().slice(0, 240);
  const lane = String(input?.lane || "soon").toLowerCase();
  if (!text) return { ok: false, error: "Task text is required." };
  if (!LANES.has(lane)) return { ok: false, error: "Lane must be now, soon, or later." };

  let dueAt = null;
  if (input?.dueAt) {
    const date = new Date(input.dueAt);
    if (Number.isNaN(date.getTime())) return { ok: false, error: "Due time is invalid." };
    dueAt = date.toISOString();
  }

  return { ok: true, value: { text, lane, dueAt } };
}

async function handleTasks(request, env, url) {
  if (request.method === "GET") {
    if (!(await canRead(request, env))) return json({ error: "Unauthorized." }, { status: 401 });
    const tasks = await readTasks(env);
    return json({ tasks });
  }

  if (!(await hasControlAuth(request, env))) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  if (request.method === "POST" && url.pathname === "/api/tasks") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, { status: 400 }); }
    const parsed = normalizeTaskInput(body);
    if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });

    const tasks = await readTasks(env);
    const now = new Date().toISOString();
    const task = {
      id: crypto.randomUUID(),
      ...parsed.value,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    tasks.unshift(task);
    await writeTasks(env, tasks);
    return json({ task }, { status: 201 });
  }

  const match = url.pathname.match(/^\/api\/tasks\/([0-9a-f-]{36})$/i);
  if (request.method === "PATCH" && match) {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, { status: 400 }); }
    const tasks = await readTasks(env);
    const index = tasks.findIndex((task) => task.id === match[1]);
    if (index < 0) return json({ error: "Task not found." }, { status: 404 });

    const current = tasks[index];
    const next = { ...current };
    if (body.lane !== undefined) {
      const lane = String(body.lane).toLowerCase();
      if (!LANES.has(lane)) return json({ error: "Invalid lane." }, { status: 400 });
      next.lane = lane;
    }
    if (body.done === true && !next.completedAt) next.completedAt = new Date().toISOString();
    if (body.done === false) next.completedAt = null;
    next.updatedAt = new Date().toISOString();
    tasks[index] = next;
    await writeTasks(env, tasks);
    return json({ task: next });
  }

  return json({ error: "Method not allowed." }, { status: 405 });
}

async function createPair(request, env, url) {
  if (!(await hasControlAuth(request, env))) return json({ error: "Unauthorized." }, { status: 401 });
  const token = randomToken(24);
  const hash = await sha256Hex(token);
  await env.BEACON_STATE.put(`${PAIR_PREFIX}${hash}`, JSON.stringify({ expiresAt: Date.now() + PAIR_TTL_MS }), {
    expirationTtl: Math.ceil(PAIR_TTL_MS / 1000),
  });
  const displayUrl = `${url.origin}/display?pair=${encodeURIComponent(token)}`;
  return json({ displayUrl, expiresInSeconds: PAIR_TTL_MS / 1000 });
}

async function exchangePair(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, { status: 400 }); }
  const pair = String(body?.pair || "");
  if (!pair) return json({ error: "Pair token is required." }, { status: 400 });

  const pairHash = await sha256Hex(pair);
  const key = `${PAIR_PREFIX}${pairHash}`;
  const record = await env.BEACON_STATE.get(key, "json");
  if (!record || Number(record.expiresAt || 0) <= Date.now()) {
    return json({ error: "Pair token is invalid or expired." }, { status: 401 });
  }
  await env.BEACON_STATE.delete(key);

  const session = randomToken(32);
  const sessionHash = await sha256Hex(session);
  await env.BEACON_STATE.put(
    `${SESSION_PREFIX}${sessionHash}`,
    JSON.stringify({ expiresAt: Date.now() + SESSION_TTL_MS }),
    { expirationTtl: Math.ceil(SESSION_TTL_MS / 1000) },
  );

  return json(
    { ok: true },
    {
      headers: {
        "set-cookie": `beacon_session=${encodeURIComponent(session)}; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; HttpOnly; Secure; SameSite=Lax`,
      },
    },
  );
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
      }
      if (url.pathname === "/display") {
        return env.ASSETS.fetch(new Request(new URL("/display.html", url), request));
      }
      if (url.pathname === "/api/tasks" || url.pathname.startsWith("/api/tasks/")) {
        return handleTasks(request, env, url);
      }
      if (url.pathname === "/api/pair" && request.method === "POST") {
        return createPair(request, env, url);
      }
      if (url.pathname === "/api/display-session" && request.method === "POST") {
        return exchangePair(request, env);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(JSON.stringify({ event: "beacon_error", message: error instanceof Error ? error.message : String(error) }));
      return json({ error: "Internal error." }, { status: 500 });
    }
  },
};
