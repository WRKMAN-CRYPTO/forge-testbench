const TASKS_KEY = "beacon:tasks";
const DISPLAY_KEY = "beacon:display-key";
const LANES = new Set(["now", "soon", "later"]);

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function randomToken(bytes = 32) {
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

function displayCredential(request) {
  return request.headers.get("x-beacon-display") || "";
}

async function hasControlAuth(request, env) {
  return Boolean(env.BEACON_KEY) && constantTimeEqual(bearer(request), env.BEACON_KEY);
}

async function hasDisplayAuth(request, env) {
  const token = displayCredential(request);
  if (!token) return false;
  const record = await env.BEACON_STATE.get(DISPLAY_KEY, "json");
  if (!record?.hash) return false;
  return constantTimeEqual(await sha256Hex(token), record.hash);
}

async function canRead(request, env) {
  if (await hasControlAuth(request, env)) return true;
  return hasDisplayAuth(request, env);
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
    return json({ tasks: await readTasks(env) });
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

    const next = { ...tasks[index] };
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

async function handleDisplayLink(request, env, url) {
  if (!(await hasControlAuth(request, env))) return json({ error: "Unauthorized." }, { status: 401 });

  if (request.method === "GET") {
    const record = await env.BEACON_STATE.get(DISPLAY_KEY, "json");
    return json({ configured: Boolean(record?.hash), createdAt: record?.createdAt || null });
  }

  if (request.method === "POST") {
    const token = randomToken(32);
    const record = {
      hash: await sha256Hex(token),
      createdAt: new Date().toISOString(),
    };
    await env.BEACON_STATE.put(DISPLAY_KEY, JSON.stringify(record));
    const displayUrl = `${url.origin}/display#key=${encodeURIComponent(token)}`;
    return json({ displayUrl, createdAt: record.createdAt }, { status: 201 });
  }

  if (request.method === "DELETE") {
    await env.BEACON_STATE.delete(DISPLAY_KEY);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET, POST, DELETE" } });
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
      if (url.pathname === "/api/display-link") {
        return handleDisplayLink(request, env, url);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(JSON.stringify({ event: "beacon_error", message: error instanceof Error ? error.message : String(error) }));
      return json({ error: "Internal error." }, { status: 500 });
    }
  },
};
