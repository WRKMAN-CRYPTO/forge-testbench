(function () {
  "use strict";

  var STORAGE_KEY = "kit-check.state.v1";
  var RECOVERY_KEY = "kit-check.recovery.v1";
  var BACKUP_MARKER = "KIT_CHECK_BACKUP";
  var VERSION = 1;

  var state = loadState();
  var editingKitId = null;
  var toastTimer = null;

  var els = {
    warningBanner: document.getElementById("warningBanner"),
    emptyState: document.getElementById("emptyState"),
    workspace: document.getElementById("workspace"),
    firstKitBtn: document.getElementById("firstKitBtn"),
    newKitBtn: document.getElementById("newKitBtn"),
    editKitBtn: document.getElementById("editKitBtn"),
    kitSelect: document.getElementById("kitSelect"),
    progressDial: document.getElementById("progressDial"),
    progressCount: document.getElementById("progressCount"),
    readyStatus: document.getElementById("readyStatus"),
    statusDetail: document.getElementById("statusDetail"),
    lastReady: document.getElementById("lastReady"),
    checklist: document.getElementById("checklist"),
    resetBtn: document.getElementById("resetBtn"),
    finishBtn: document.getElementById("finishBtn"),
    kitDialog: document.getElementById("kitDialog"),
    kitDialogTitle: document.getElementById("kitDialogTitle"),
    kitNameInput: document.getElementById("kitNameInput"),
    itemsInput: document.getElementById("itemsInput"),
    saveKitBtn: document.getElementById("saveKitBtn"),
    dataBtn: document.getElementById("dataBtn"),
    dataDialog: document.getElementById("dataDialog"),
    closeDataBtn: document.getElementById("closeDataBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFile: document.getElementById("importFile"),
    deleteKitBtn: document.getElementById("deleteKitBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    recoveryBtn: document.getElementById("recoveryBtn"),
    toast: document.getElementById("toast")
  };

  wireEvents();
  render();
  registerServiceWorker();

  function freshState() {
    return { version: VERSION, kits: [], activeKitId: null, sessions: {} };
  }

  function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return prefix + "-" + window.crypto.randomUUID();
    }
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  function normalizeState(candidate) {
    if (!candidate || candidate.version !== VERSION || !Array.isArray(candidate.kits)) {
      throw new Error("Unsupported or malformed KIT CHECK state");
    }

    var kits = candidate.kits.map(function (kit) {
      if (!kit || typeof kit.id !== "string" || typeof kit.name !== "string" || !Array.isArray(kit.items)) {
        throw new Error("Malformed kit");
      }
      return {
        id: kit.id,
        name: kit.name.slice(0, 40),
        lastCompletedAt: Number.isFinite(kit.lastCompletedAt) ? kit.lastCompletedAt : null,
        items: kit.items.map(function (item) {
          if (!item || typeof item.id !== "string" || typeof item.label !== "string") {
            throw new Error("Malformed kit item");
          }
          return { id: item.id, label: item.label.slice(0, 120) };
        })
      };
    });

    var sessions = {};
    var rawSessions = candidate.sessions && typeof candidate.sessions === "object" ? candidate.sessions : {};
    kits.forEach(function (kit) {
      var raw = rawSessions[kit.id];
      var checked = {};
      if (raw && raw.checked && typeof raw.checked === "object") {
        kit.items.forEach(function (item) {
          if (raw.checked[item.id] === true) checked[item.id] = true;
        });
      }
      sessions[kit.id] = {
        startedAt: raw && Number.isFinite(raw.startedAt) ? raw.startedAt : Date.now(),
        checked: checked
      };
    });

    var active = kits.some(function (kit) { return kit.id === candidate.activeKitId; })
      ? candidate.activeKitId
      : (kits[0] ? kits[0].id : null);

    return { version: VERSION, kits: kits, activeKitId: active, sessions: sessions };
  }

  function loadState() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();

    try {
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      try { localStorage.setItem(RECOVERY_KEY, raw); } catch (_) {}
      var fallback = freshState();
      fallback.bootWarning = "Stored data could not be read. KIT CHECK preserved the raw copy instead of overwriting it.";
      return fallback;
    }
  }

  function persist() {
    var clean = {
      version: VERSION,
      kits: state.kits,
      activeKitId: state.activeKitId,
      sessions: state.sessions
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  }

  function activeKit() {
    return state.kits.find(function (kit) { return kit.id === state.activeKitId; }) || null;
  }

  function sessionFor(kit) {
    if (!state.sessions[kit.id]) {
      state.sessions[kit.id] = { startedAt: Date.now(), checked: {} };
    }
    return state.sessions[kit.id];
  }

  function wireEvents() {
    els.firstKitBtn.addEventListener("click", function () { openKitEditor(null); });
    els.newKitBtn.addEventListener("click", function () { openKitEditor(null); });
    els.editKitBtn.addEventListener("click", function () {
      if (activeKit()) openKitEditor(activeKit().id);
    });

    els.saveKitBtn.addEventListener("click", saveKitFromEditor);

    els.kitSelect.addEventListener("change", function () {
      state.activeKitId = els.kitSelect.value;
      persist();
      render();
    });

    els.resetBtn.addEventListener("click", function () {
      var kit = activeKit();
      if (!kit) return;
      var session = sessionFor(kit);
      var hasChecks = Object.keys(session.checked).some(function (id) { return session.checked[id]; });
      if (hasChecks && !window.confirm("Reset the current check for " + kit.name + "?")) return;
      state.sessions[kit.id] = { startedAt: Date.now(), checked: {} };
      persist();
      render();
      toast("Check reset.");
    });

    els.finishBtn.addEventListener("click", finishCurrentKit);

    els.dataBtn.addEventListener("click", function () {
      els.recoveryBtn.hidden = !localStorage.getItem(RECOVERY_KEY);
      els.deleteKitBtn.hidden = !activeKit();
      els.dataDialog.showModal();
    });
    els.closeDataBtn.addEventListener("click", function () { els.dataDialog.close(); });
    els.exportBtn.addEventListener("click", exportBackup);
    els.importBtn.addEventListener("click", function () {
      els.importFile.value = "";
      els.importFile.click();
    });
    els.importFile.addEventListener("change", importBackup);
    els.deleteKitBtn.addEventListener("click", deleteCurrentKit);
    els.clearAllBtn.addEventListener("click", clearAll);
    els.recoveryBtn.addEventListener("click", downloadRecovery);

    [els.kitDialog, els.dataDialog].forEach(function (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  function openKitEditor(kitId) {
    editingKitId = kitId;
    var kit = kitId ? state.kits.find(function (entry) { return entry.id === kitId; }) : null;
    els.kitDialogTitle.textContent = kit ? "EDIT KIT" : "NEW KIT";
    els.kitNameInput.value = kit ? kit.name : "";
    els.itemsInput.value = kit ? kit.items.map(function (item) { return item.label; }).join("\n") : "";
    els.kitDialog.showModal();
    window.setTimeout(function () { els.kitNameInput.focus(); }, 50);
  }

  function parsedLines() {
    var seen = {};
    return els.itemsInput.value
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) {
        if (!line) return false;
        var key = line.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .slice(0, 100);
  }

  function saveKitFromEditor() {
    var name = els.kitNameInput.value.trim();
    var labels = parsedLines();

    if (!name) {
      els.kitNameInput.focus();
      toast("Give the kit a name.");
      return;
    }
    if (!labels.length) {
      els.itemsInput.focus();
      toast("Add at least one item.");
      return;
    }

    if (editingKitId) {
      var kit = state.kits.find(function (entry) { return entry.id === editingKitId; });
      if (!kit) return;

      var oldByLabel = {};
      kit.items.forEach(function (item) { oldByLabel[item.label.toLowerCase()] = item; });
      var newItems = labels.map(function (label) {
        return oldByLabel[label.toLowerCase()] || { id: makeId("item"), label: label };
      });

      kit.name = name.slice(0, 40);
      kit.items = newItems;

      var oldSession = sessionFor(kit);
      var allowed = {};
      newItems.forEach(function (item) {
        if (oldSession.checked[item.id]) allowed[item.id] = true;
      });
      state.sessions[kit.id] = { startedAt: oldSession.startedAt, checked: allowed };
    } else {
      var newKit = {
        id: makeId("kit"),
        name: name.slice(0, 40),
        lastCompletedAt: null,
        items: labels.map(function (label) {
          return { id: makeId("item"), label: label.slice(0, 120) };
        })
      };
      state.kits.push(newKit);
      state.activeKitId = newKit.id;
      state.sessions[newKit.id] = { startedAt: Date.now(), checked: {} };
    }

    persist();
    els.kitDialog.close();
    render();
    toast(editingKitId ? "Kit updated." : "Kit created.");
    editingKitId = null;
  }

  function toggleItem(itemId) {
    var kit = activeKit();
    if (!kit) return;
    var session = sessionFor(kit);
    if (session.checked[itemId]) delete session.checked[itemId];
    else session.checked[itemId] = true;
    persist();
    render();
  }

  function finishCurrentKit() {
    var kit = activeKit();
    if (!kit) return;
    var session = sessionFor(kit);
    var allChecked = kit.items.length > 0 && kit.items.every(function (item) { return session.checked[item.id] === true; });
    if (!allChecked) return;

    kit.lastCompletedAt = Date.now();
    state.sessions[kit.id] = { startedAt: Date.now(), checked: {} };
    persist();
    render();
    toast("READY logged. Checklist reset.");
  }

  function deleteCurrentKit() {
    var kit = activeKit();
    if (!kit) return;
    if (!window.confirm("Delete " + kit.name + " and its checklist?")) return;

    state.kits = state.kits.filter(function (entry) { return entry.id !== kit.id; });
    delete state.sessions[kit.id];
    state.activeKitId = state.kits[0] ? state.kits[0].id : null;
    persist();
    els.dataDialog.close();
    render();
    toast("Kit deleted.");
  }

  function clearAll() {
    if (!state.kits.length) {
      toast("There are no kits to clear.");
      return;
    }
    if (!window.confirm("Clear every KIT CHECK kit on this device?")) return;
    if (!window.confirm("This removes all kit definitions and check progress. Continue?")) return;

    state = freshState();
    persist();
    els.dataDialog.close();
    render();
    toast("All kits cleared.");
  }

  function exportBackup() {
    var payload = {
      marker: BACKUP_MARKER,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      state: {
        version: VERSION,
        kits: state.kits,
        activeKitId: state.activeKitId,
        sessions: state.sessions
      }
    };
    downloadText("kit-check-backup-" + dateStamp() + ".json", JSON.stringify(payload, null, 2), "application/json");
    toast("Backup exported.");
  }

  function importBackup(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    file.text().then(function (text) {
      var parsed = JSON.parse(text);
      if (!parsed || parsed.marker !== BACKUP_MARKER || parsed.version !== VERSION) {
        throw new Error("Not a KIT CHECK v1 backup");
      }
      var next = normalizeState(parsed.state);
      if (!window.confirm("Replace current KIT CHECK data with this backup?")) return;
      state = next;
      persist();
      els.dataDialog.close();
      render();
      toast("Backup restored.");
    }).catch(function (error) {
      console.error(error);
      toast("Import failed. Use a KIT CHECK v1 backup.");
    });
  }

  function downloadRecovery() {
    var raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) {
      toast("No recovery copy is stored.");
      return;
    }
    downloadText("kit-check-recovery-" + dateStamp() + ".txt", raw, "text/plain");
    toast("Recovery copy downloaded.");
  }

  function downloadText(filename, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function dateStamp() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function render() {
    if (state.bootWarning) {
      els.warningBanner.textContent = state.bootWarning;
      els.warningBanner.hidden = false;
    } else {
      els.warningBanner.hidden = true;
    }

    var hasKits = state.kits.length > 0;
    els.emptyState.hidden = hasKits;
    els.workspace.hidden = !hasKits;

    if (!hasKits) return;

    if (!activeKit()) state.activeKitId = state.kits[0].id;
    var kit = activeKit();
    var session = sessionFor(kit);

    els.kitSelect.innerHTML = "";
    state.kits.forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.name;
      option.selected = entry.id === kit.id;
      els.kitSelect.appendChild(option);
    });

    var checkedCount = kit.items.reduce(function (count, item) {
      return count + (session.checked[item.id] ? 1 : 0);
    }, 0);
    var total = kit.items.length;
    var ready = total > 0 && checkedCount === total;
    var progress = total ? Math.round((checkedCount / total) * 360) : 0;

    els.progressDial.style.setProperty("--progress", progress + "deg");
    els.progressCount.textContent = checkedCount + "/" + total;
    els.readyStatus.textContent = ready ? "READY" : "NOT READY";
    els.readyStatus.classList.toggle("ready", ready);
    els.statusDetail.textContent = ready
      ? "Everything in this kit is accounted for."
      : (total - checkedCount) + " item" + ((total - checkedCount) === 1 ? "" : "s") + " still unchecked.";
    els.lastReady.textContent = kit.lastCompletedAt
      ? "Last ready: " + formatWhen(kit.lastCompletedAt)
      : "No completed check yet.";
    els.finishBtn.disabled = !ready;

    els.checklist.innerHTML = "";
    kit.items.forEach(function (item) {
      var checked = session.checked[item.id] === true;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "check-item" + (checked ? " checked" : "");
      button.setAttribute("aria-pressed", checked ? "true" : "false");

      var dot = document.createElement("span");
      dot.className = "check-dot";
      dot.textContent = "✓";

      var label = document.createElement("span");
      label.className = "check-label";
      label.textContent = item.label;

      button.appendChild(dot);
      button.appendChild(label);
      button.addEventListener("click", function () { toggleItem(item.id); });
      els.checklist.appendChild(button);
    });
  }

  function formatWhen(timestamp) {
    var d = new Date(timestamp);
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? "today " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
  }

  function toast(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = window.setTimeout(function () { els.toast.classList.remove("show"); }, 2200);
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js").catch(function (error) {
          console.warn("Service worker registration failed", error);
        });
      });
    }
  }
})();
