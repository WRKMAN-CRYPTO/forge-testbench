(() => {
  "use strict";

  const STORAGE_KEY = "battery-bay:v1";
  const MAX_HISTORY = 24;

  const defaults = {
    size: "AA",
    mode: "load",
    session: { ready: 0, low: 0, test: 0, recycle: 0 },
    history: []
  };

  let state = loadState();
  let lastAction = null;

  const $ = (id) => document.getElementById(id);
  const sizePicker = $("sizePicker");
  const modePicker = $("modePicker");
  const voltage = $("voltage");
  const routeBtn = $("routeBtn");
  const modeHelp = $("modeHelp");
  const inputError = $("inputError");
  const resultCard = $("resultCard");
  const resultKicker = $("resultKicker");
  const resultTitle = $("resultTitle");
  const resultCopy = $("resultCopy");
  const resultGlyph = $("resultGlyph");
  const undoBtn = $("undoBtn");
  const resetBtn = $("resetBtn");
  const historyList = $("historyList");
  const historyCount = $("historyCount");
  const infoDialog = $("infoDialog");

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(defaults));
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return cloneDefaults();
      return {
        size: ["AAA", "AA", "C", "D"].includes(parsed.size) ? parsed.size : defaults.size,
        mode: ["load", "ocv"].includes(parsed.mode) ? parsed.mode : defaults.mode,
        session: {
          ready: finiteCount(parsed.session?.ready),
          low: finiteCount(parsed.session?.low),
          test: finiteCount(parsed.session?.test),
          recycle: finiteCount(parsed.session?.recycle)
        },
        history: Array.isArray(parsed.history)
          ? parsed.history.filter(validHistoryItem).slice(0, MAX_HISTORY)
          : []
      };
    } catch {
      return cloneDefaults();
    }
  }

  function finiteCount(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function validHistoryItem(item) {
    return item &&
      ["AAA", "AA", "C", "D"].includes(item.size) &&
      ["load", "ocv"].includes(item.mode) &&
      ["ready", "low", "test", "recycle"].includes(item.route) &&
      Number.isFinite(Number(item.volts));
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function classify(volts, mode) {
    if (mode === "ocv") {
      if (volts >= 1.50) {
        return {
          route: "ready",
          title: "READY BAY",
          glyph: "→",
          copy: "Open-circuit reading is high enough for a quick-pass. Use a loaded test if the device is demanding."
        };
      }
      return {
        route: "test",
        title: "TEST BAY",
        glyph: "?",
        copy: "Open-circuit voltage is not decisive here. Give this cell a brief loaded test before assigning it."
      };
    }

    if (volts >= 1.35) {
      return {
        route: "ready",
        title: "READY BAY",
        glyph: "→",
        copy: "Strong loaded reading. Put it with the normal-duty cells."
      };
    }

    if (volts >= 1.10) {
      return {
        route: "low",
        title: "LOW-DRAIN BAY",
        glyph: "↘",
        copy: "Useful life remains, but save it for clocks, remotes, and other gentle loads."
      };
    }

    return {
      route: "recycle",
      title: "RECYCLE BAY",
      glyph: "↓",
      copy: "Loaded reading is below this bench's keep threshold. Retire the cell from service."
    };
  }

  function routeCell() {
    inputError.textContent = "";
    const volts = Number(voltage.value);

    if (!Number.isFinite(volts) || volts <= 0 || volts > 2) {
      inputError.textContent = "Enter a reading between 0.01 V and 2.00 V.";
      voltage.focus();
      return;
    }

    const result = classify(volts, state.mode);
    const entry = {
      id: Date.now(),
      size: state.size,
      mode: state.mode,
      volts: Number(volts.toFixed(2)),
      route: result.route,
      at: new Date().toISOString()
    };

    state.session[result.route] += 1;
    state.history.unshift(entry);
    state.history = state.history.slice(0, MAX_HISTORY);
    lastAction = entry;
    saveState();

    renderCounters();
    renderHistory();
    showResult(result, entry);
    voltage.value = "";
    voltage.focus({ preventScroll: true });
  }

  function showResult(result, entry) {
    resultCard.className = "result-card " + result.route;
    resultKicker.textContent = entry.size + " · " + (entry.mode === "load" ? "LOADED " : "OPEN ") + entry.volts.toFixed(2) + " V";
    resultTitle.textContent = result.title;
    resultCopy.textContent = result.copy;
    resultGlyph.textContent = result.glyph;
    resultCard.classList.remove("hidden");
  }

  function undoLast() {
    if (!lastAction) return;
    const index = state.history.findIndex((item) => item.id === lastAction.id);
    if (index === -1) return;

    const route = lastAction.route;
    state.history.splice(index, 1);
    state.session[route] = Math.max(0, state.session[route] - 1);
    lastAction = null;
    saveState();

    renderCounters();
    renderHistory();
    resultCard.className = "result-card hidden";
  }

  function resetSession() {
    const total = Object.values(state.session).reduce((a, b) => a + b, 0);
    if (!total) return;

    if (!confirm("Reset the four bay counters? Reading history will stay.")) return;
    state.session = { ready: 0, low: 0, test: 0, recycle: 0 };
    lastAction = null;
    saveState();
    renderCounters();
    resultCard.className = "result-card hidden";
  }

  function setSize(size) {
    if (!["AAA", "AA", "C", "D"].includes(size)) return;
    state.size = size;
    saveState();
    renderPickers();
  }

  function setMode(mode) {
    if (!["load", "ocv"].includes(mode)) return;
    state.mode = mode;
    saveState();
    renderPickers();
  }

  function renderPickers() {
    sizePicker.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.size === state.size);
    });

    modePicker.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === state.mode);
    });

    modeHelp.textContent = state.mode === "load"
      ? "Measure while the cell is briefly under a ~10Ω load, or use a tester that loads the cell."
      : "Quick screen only. A resting cell can rebound, so anything under 1.50 V goes to TEST rather than being guessed.";
  }

  function renderCounters() {
    $("readyCount").textContent = state.session.ready;
    $("lowCount").textContent = state.session.low;
    $("testCount").textContent = state.session.test;
    $("recycleCount").textContent = state.session.recycle;
  }

  function renderHistory() {
    historyCount.textContent = state.history.length;

    if (!state.history.length) {
      historyList.innerHTML = '<div class="history-empty">No readings yet. The bench is clean.</div>';
      return;
    }

    historyList.innerHTML = state.history.map((item) => {
      const route = {
        ready: "READY",
        low: "LOW-DRAIN",
        test: "TEST",
        recycle: "RECYCLE"
      }[item.route];
      const when = formatTime(item.at);
      return '<div class="log-row">' +
        '<div class="log-main"><strong>' + escapeHtml(item.size) + '</strong><span>' +
        item.volts.toFixed(2) + ' V · ' + (item.mode === "load" ? "loaded" : "open") +
        '</span></div>' +
        '<div class="log-route"><strong>' + route + '</strong><small>' + when + '</small></div>' +
        '</div>';
    }).join("");
  }

  function formatTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  sizePicker.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-size]");
    if (button) setSize(button.dataset.size);
  });

  modePicker.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (button) setMode(button.dataset.mode);
  });

  routeBtn.addEventListener("click", routeCell);
  voltage.addEventListener("keydown", (event) => {
    if (event.key === "Enter") routeCell();
  });
  voltage.addEventListener("input", () => { inputError.textContent = ""; });
  undoBtn.addEventListener("click", undoLast);
  resetBtn.addEventListener("click", resetSession);

  $("infoBtn").addEventListener("click", () => infoDialog.showModal());
  $("closeInfoBtn").addEventListener("click", () => infoDialog.close());
  infoDialog.addEventListener("click", (event) => {
    if (event.target === infoDialog) infoDialog.close();
  });

  renderPickers();
  renderCounters();
  renderHistory();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
