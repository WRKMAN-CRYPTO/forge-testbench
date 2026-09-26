(() => {
  "use strict";

  const STORE_KEY = "loan-tag:v1";
  const BACKUP_PREFIX = "loan-tag:recovery:";
  const SCHEMA_VERSION = 1;

  const els = {
    form: document.querySelector("#loanForm"),
    item: document.querySelector("#itemInput"),
    person: document.querySelector("#personInput"),
    note: document.querySelector("#noteInput"),
    search: document.querySelector("#searchInput"),
    count: document.querySelector("#activeCount"),
    list: document.querySelector("#loanList"),
    empty: document.querySelector("#emptyState"),
    warning: document.querySelector("#warning"),
    template: document.querySelector("#loanTemplate"),
    toast: document.querySelector("#toast"),
    toastText: document.querySelector("#toastText"),
    undo: document.querySelector("#undoButton")
  };

  let state = { version: SCHEMA_VERSION, loans: [] };
  let writesLocked = false;
  let undoRecord = null;
  let undoTimer = null;
  let toastTimer = null;

  function newId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function isValidLoan(value) {
    return value &&
      typeof value.id === "string" &&
      typeof value.item === "string" &&
      typeof value.person === "string" &&
      typeof value.note === "string" &&
      Number.isFinite(value.createdAt);
  }

  function isValidState(value) {
    return value &&
      value.version === SCHEMA_VERSION &&
      Array.isArray(value.loans) &&
      value.loans.every(isValidLoan);
  }

  function setWarning(message) {
    if (!message) {
      els.warning.hidden = true;
      els.warning.textContent = "";
      return;
    }
    els.warning.textContent = message;
    els.warning.hidden = false;
  }

  function loadState() {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!isValidState(parsed)) throw new Error("Unexpected saved-data shape");
      state = parsed;
    } catch {
      const backupKey = BACKUP_PREFIX + new Date().toISOString();
      try {
        localStorage.setItem(backupKey, raw);
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
        setWarning("Saved data was unreadable. The original was copied to a recovery backup before Loan Tag started fresh.");
      } catch {
        writesLocked = true;
        setWarning("Saved data is unreadable and could not be backed up. Changes are locked so the original is not overwritten.");
      }
    }
  }

  function persist(candidate) {
    if (writesLocked) {
      showToast("Changes are locked to protect unreadable saved data.");
      return false;
    }
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(candidate));
      return true;
    } catch {
      showToast("Could not save. Nothing changed.");
      return false;
    }
  }

  function normalize(value) {
    return value.trim().replace(/\s+/g, " ");
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();

    if (sameDay) {
      return "OUT TODAY · " + new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit"
      }).format(date);
    }

    return "OUT " + new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() === now.getFullYear() ? undefined : "numeric"
    }).format(date).toUpperCase();
  }

  function render() {
    const query = normalize(els.search.value).toLowerCase();
    const sorted = [...state.loans].sort((a, b) => b.createdAt - a.createdAt);
    const visible = sorted.filter(loan => {
      if (!query) return true;
      return `${loan.item} ${loan.person} ${loan.note}`.toLowerCase().includes(query);
    });

    els.count.textContent = String(state.loans.length);
    els.list.replaceChildren();

    for (const loan of visible) {
      const node = els.template.content.firstElementChild.cloneNode(true);
      node.dataset.id = loan.id;
      node.querySelector(".loan-item").textContent = loan.item;
      node.querySelector(".loan-person").textContent = loan.person;

      const note = node.querySelector(".loan-note");
      note.textContent = loan.note;
      note.classList.toggle("has-note", Boolean(loan.note));

      node.querySelector(".loan-date").textContent = formatDate(loan.createdAt);
      node.querySelector(".returned").addEventListener("click", () => markReturned(loan.id));
      els.list.append(node);
    }

    const noLoans = state.loans.length === 0;
    els.empty.hidden = !noLoans;
    if (!noLoans && visible.length === 0) {
      els.list.innerHTML = '<div class="empty"><h3>No match.</h3><p>Try the item, person, or note.</p></div>';
    }
  }

  function showToast(message, withUndo = false) {
    clearTimeout(toastTimer);
    els.toastText.textContent = message;
    els.undo.hidden = !withUndo;
    els.toast.hidden = false;
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
      els.undo.hidden = true;
      undoRecord = null;
    }, withUndo ? 6500 : 3200);
  }

  function addLoan(event) {
    event.preventDefault();

    const item = normalize(els.item.value);
    const person = normalize(els.person.value);
    const note = normalize(els.note.value);

    if (!item || !person) return;

    const loan = {
      id: newId(),
      item,
      person,
      note,
      createdAt: Date.now()
    };

    const candidate = {
      version: SCHEMA_VERSION,
      loans: [...state.loans, loan]
    };

    if (!persist(candidate)) return;

    state = candidate;
    els.form.reset();
    els.item.focus();
    render();
    showToast(`${item} tagged with ${person}.`);
  }

  function markReturned(id) {
    const index = state.loans.findIndex(loan => loan.id === id);
    if (index < 0) return;

    const loan = state.loans[index];
    const candidate = {
      version: SCHEMA_VERSION,
      loans: state.loans.filter(entry => entry.id !== id)
    };

    if (!persist(candidate)) return;

    state = candidate;
    undoRecord = { loan, index };
    render();
    showToast(`${loan.item} is back.`, true);
  }

  function undoReturn() {
    if (!undoRecord) return;

    const loans = [...state.loans];
    const insertionIndex = Math.min(undoRecord.index, loans.length);
    loans.splice(insertionIndex, 0, undoRecord.loan);

    const candidate = { version: SCHEMA_VERSION, loans };
    if (!persist(candidate)) return;

    state = candidate;
    const item = undoRecord.loan.item;
    undoRecord = null;
    clearTimeout(toastTimer);
    els.toast.hidden = true;
    els.undo.hidden = true;
    render();
    showToast(`${item} put back on the out list.`);
  }

  els.form.addEventListener("submit", addLoan);
  els.search.addEventListener("input", render);
  els.undo.addEventListener("click", undoReturn);

  loadState();
  render();

  if ("serviceWorker" in navigator) {
    addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Offline install is optional. Core app remains functional.
      });
    });
  }
})();
