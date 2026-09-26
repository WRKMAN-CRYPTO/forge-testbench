(() => {
  "use strict";

  const DB_NAME = "retrace-db";
  const DB_VERSION = 1;
  const STORE = "jobs";

  const state = {
    db: null,
    currentJob: null,
    previewUrl: null,
    renderUrls: [],
    toastTimer: null,
    busy: false
  };

  const el = {
    homeBtn: document.getElementById("homeBtn"),
    homeView: document.getElementById("homeView"),
    recordView: document.getElementById("recordView"),
    rebuildView: document.getElementById("rebuildView"),
    newJobForm: document.getElementById("newJobForm"),
    jobName: document.getElementById("jobName"),
    jobsList: document.getElementById("jobsList"),
    emptyJobs: document.getElementById("emptyJobs"),
    jobCount: document.getElementById("jobCount"),
    recordTitle: document.getElementById("recordTitle"),
    recordMeta: document.getElementById("recordMeta"),
    reassembleBtn: document.getElementById("reassembleBtn"),
    photoInput: document.getElementById("photoInput"),
    previewWrap: document.getElementById("previewWrap"),
    photoPreview: document.getElementById("photoPreview"),
    clearPhotoBtn: document.getElementById("clearPhotoBtn"),
    stepNote: document.getElementById("stepNote"),
    saveStepBtn: document.getElementById("saveStepBtn"),
    stepCount: document.getElementById("stepCount"),
    stepsList: document.getElementById("stepsList"),
    emptySteps: document.getElementById("emptySteps"),
    rebuildTitle: document.getElementById("rebuildTitle"),
    rebuildProgress: document.getElementById("rebuildProgress"),
    rebuildCard: document.getElementById("rebuildCard"),
    rebuildBadge: document.getElementById("rebuildBadge"),
    rebuildImage: document.getElementById("rebuildImage"),
    rebuildNoImage: document.getElementById("rebuildNoImage"),
    rebuildNote: document.getElementById("rebuildNote"),
    rebuildTime: document.getElementById("rebuildTime"),
    undoRebuildBtn: document.getElementById("undoRebuildBtn"),
    doneRebuildBtn: document.getElementById("doneRebuildBtn"),
    completeCard: document.getElementById("completeCard"),
    restartRebuildBtn: document.getElementById("restartRebuildBtn"),
    toast: document.getElementById("toast"),
    fatal: document.getElementById("fatal")
  };

  function uid() {
    if (globalThis.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open local storage."));
      request.onblocked = () => reject(new Error("Local storage upgrade is blocked by another RETRACE tab."));
    });
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Local storage request failed."));
    });
  }

  function store(mode) {
    return state.db.transaction(STORE, mode).objectStore(STORE);
  }

  async function getJobs() {
    const jobs = await requestResult(store("readonly").getAll());
    return jobs.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function getJob(id) {
    return requestResult(store("readonly").get(id));
  }

  function putJob(job) {
    return requestResult(store("readwrite").put(job));
  }

  function deleteJob(id) {
    return requestResult(store("readwrite").delete(id));
  }

  function setView(name) {
    el.homeView.hidden = name !== "home";
    el.recordView.hidden = name !== "record";
    el.rebuildView.hidden = name !== "rebuild";
    el.homeBtn.hidden = name === "home";
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function clearRenderUrls() {
    state.renderUrls.forEach(url => URL.revokeObjectURL(url));
    state.renderUrls = [];
  }

  function objectUrl(blob) {
    const url = URL.createObjectURL(blob);
    state.renderUrls.push(url);
    return url;
  }

  function formatWhen(ts) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(ts));
  }

  function toast(message) {
    clearTimeout(state.toastTimer);
    el.toast.textContent = message;
    el.toast.classList.add("show");
    state.toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1800);
  }

  function fail(error) {
    console.error(error);
    el.fatal.textContent = "RETRACE could not use this browser's local storage. " + (error && error.message ? error.message : "");
    el.fatal.hidden = false;
  }

  function button(text, className, action, id) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.className = className;
    b.dataset.action = action;
    b.dataset.id = id;
    return b;
  }

  async function renderHome() {
    clearRenderUrls();
    setView("home");
    state.currentJob = null;
    const jobs = await getJobs();
    el.jobsList.textContent = "";
    el.emptyJobs.hidden = jobs.length > 0;
    el.jobCount.textContent = jobs.length ? jobs.length + (jobs.length === 1 ? " job" : " jobs") : "";

    jobs.forEach(job => {
      const card = document.createElement("article");
      card.className = "job-card";

      const top = document.createElement("div");
      top.className = "job-card-top";
      const copy = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = job.title;
      const meta = document.createElement("p");
      const count = job.steps ? job.steps.length : 0;
      meta.textContent = count + (count === 1 ? " step" : " steps") + " • Updated " + formatWhen(job.updatedAt);
      copy.append(title, meta);
      top.append(copy);

      const actions = document.createElement("div");
      actions.className = "job-actions";
      actions.append(
        button("Add steps", "secondary", "open", job.id),
        button("Reassemble", "primary", "rebuild", job.id),
        button("×", "delete-btn", "delete", job.id)
      );

      if (!count) actions.children[1].disabled = true;

      card.append(top, actions);
      el.jobsList.append(card);
    });
  }

  async function createJob(title) {
    const now = Date.now();
    const job = {
      id: uid(),
      title: title,
      createdAt: now,
      updatedAt: now,
      reassemblyDone: 0,
      steps: []
    };
    await putJob(job);
    el.jobName.value = "";
    await openJob(job.id);
  }

  async function openJob(id) {
    const job = await getJob(id);
    if (!job) {
      toast("That job is no longer here.");
      return renderHome();
    }
    state.currentJob = job;
    clearCaptureDraft();
    await renderRecord();
  }

  async function renderRecord() {
    clearRenderUrls();
    setView("record");
    const job = state.currentJob;
    if (!job) return renderHome();

    const steps = job.steps || [];
    el.recordTitle.textContent = job.title;
    el.recordMeta.textContent = "Started " + formatWhen(job.createdAt);
    el.stepCount.textContent = steps.length + (steps.length === 1 ? " step" : " steps");
    el.reassembleBtn.disabled = steps.length === 0;
    el.stepsList.textContent = "";
    el.emptySteps.hidden = steps.length > 0;

    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      const card = document.createElement("article");
      card.className = "step-card";

      const thumb = document.createElement("div");
      thumb.className = "step-thumb";
      if (step.photo) {
        const img = document.createElement("img");
        img.src = objectUrl(step.photo);
        img.alt = "";
        thumb.append(img);
      } else {
        thumb.textContent = "NO PHOTO";
      }

      const copy = document.createElement("div");
      copy.className = "step-copy";
      const number = document.createElement("strong");
      number.textContent = "STEP " + (i + 1);
      const note = document.createElement("p");
      note.textContent = step.note || "No note";
      if (!step.note) note.className = "muted-note";
      copy.append(number, note);

      const remove = button("×", "step-remove", "remove-step", step.id);
      remove.setAttribute("aria-label", "Remove step " + (i + 1));

      card.append(thumb, copy, remove);
      el.stepsList.append(card);
    }
  }

  function clearCaptureDraft() {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }
    el.photoInput.value = "";
    el.stepNote.value = "";
    el.photoPreview.removeAttribute("src");
    el.previewWrap.hidden = true;
    setSaveReady();
  }

  function setSaveReady() {
    const hasPhoto = !!(el.photoInput.files && el.photoInput.files[0]);
    const hasNote = !!el.stepNote.value.trim();
    el.saveStepBtn.disabled = state.busy || (!hasPhoto && !hasNote);
  }

  async function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image."));
      };
      img.src = url;
    });
  }

  async function compressPhoto(file) {
    if (!file) return null;
    if (!file.type || !file.type.startsWith("image/")) throw new Error("Please choose an image.");

    const img = await loadImage(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    return blob.size < file.size ? blob : file;
  }

  async function saveStep() {
    if (state.busy || !state.currentJob) return;

    const file = el.photoInput.files && el.photoInput.files[0] ? el.photoInput.files[0] : null;
    const note = el.stepNote.value.trim();
    if (!file && !note) return;

    state.busy = true;
    el.saveStepBtn.textContent = file ? "Saving photo…" : "Saving…";
    setSaveReady();

    try {
      const photo = file ? await compressPhoto(file) : null;
      const job = state.currentJob;
      const now = Date.now();
      job.steps.push({
        id: uid(),
        note: note,
        photo: photo,
        createdAt: now
      });
      job.updatedAt = now;
      job.reassemblyDone = 0;
      await putJob(job);
      clearCaptureDraft();
      await renderRecord();
      toast("Step " + job.steps.length + " saved.");
    } catch (error) {
      console.error(error);
      toast(error && error.message ? error.message : "Could not save that step.");
    } finally {
      state.busy = false;
      el.saveStepBtn.textContent = "Save next step";
      setSaveReady();
    }
  }

  async function removeStep(stepId) {
    const job = state.currentJob;
    if (!job) return;
    const index = job.steps.findIndex(step => step.id === stepId);
    if (index < 0) return;
    if (!confirm("Remove this saved step?")) return;

    job.steps.splice(index, 1);
    job.updatedAt = Date.now();
    job.reassemblyDone = 0;
    await putJob(job);
    await renderRecord();
    toast("Step removed.");
  }

  async function openRebuild(id) {
    const job = id ? await getJob(id) : state.currentJob;
    if (!job || !job.steps || !job.steps.length) {
      toast("Add at least one step first.");
      return;
    }
    state.currentJob = job;
    renderRebuild();
  }

  function renderRebuild() {
    clearRenderUrls();
    setView("rebuild");
    const job = state.currentJob;
    const total = job.steps.length;
    let done = Number.isFinite(job.reassemblyDone) ? job.reassemblyDone : 0;
    done = Math.max(0, Math.min(done, total));
    job.reassemblyDone = done;

    el.rebuildTitle.textContent = job.title;
    el.rebuildProgress.textContent = done >= total ? total + " of " + total + " complete" : "Working backward • " + done + " complete";
    el.undoRebuildBtn.disabled = done === 0;

    if (done >= total) {
      el.rebuildCard.hidden = true;
      el.completeCard.hidden = false;
      return;
    }

    el.rebuildCard.hidden = false;
    el.completeCard.hidden = true;

    const index = total - 1 - done;
    const step = job.steps[index];
    el.rebuildBadge.textContent = "UNDO STEP " + (index + 1) + " OF " + total;
    el.rebuildNote.textContent = step.note || "Reverse what you did in this step.";
    el.rebuildTime.textContent = "Captured " + formatWhen(step.createdAt);

    if (step.photo) {
      el.rebuildImage.src = objectUrl(step.photo);
      el.rebuildImage.hidden = false;
      el.rebuildImage.alt = "Photo from step " + (index + 1);
      el.rebuildNoImage.hidden = true;
    } else {
      el.rebuildImage.hidden = true;
      el.rebuildImage.removeAttribute("src");
      el.rebuildNoImage.hidden = false;
    }
  }

  async function advanceRebuild(delta) {
    const job = state.currentJob;
    if (!job) return;
    const total = job.steps.length;
    job.reassemblyDone = Math.max(0, Math.min(total, (job.reassemblyDone || 0) + delta));
    job.updatedAt = Date.now();
    await putJob(job);
    renderRebuild();
    if (job.reassemblyDone === total) toast("Trail complete.");
  }

  async function restartRebuild() {
    const job = state.currentJob;
    if (!job) return;
    job.reassemblyDone = 0;
    job.updatedAt = Date.now();
    await putJob(job);
    renderRebuild();
  }

  el.newJobForm.addEventListener("submit", async event => {
    event.preventDefault();
    const title = el.jobName.value.trim();
    if (!title) {
      el.jobName.focus();
      return;
    }
    try {
      await createJob(title);
    } catch (error) {
      fail(error);
    }
  });

  el.homeBtn.addEventListener("click", () => renderHome().catch(fail));
  el.reassembleBtn.addEventListener("click", () => openRebuild().catch(fail));
  el.saveStepBtn.addEventListener("click", saveStep);
  el.stepNote.addEventListener("input", setSaveReady);

  el.photoInput.addEventListener("change", () => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
    const file = el.photoInput.files && el.photoInput.files[0];
    if (file) {
      state.previewUrl = URL.createObjectURL(file);
      el.photoPreview.src = state.previewUrl;
      el.previewWrap.hidden = false;
    } else {
      el.previewWrap.hidden = true;
      el.photoPreview.removeAttribute("src");
    }
    setSaveReady();
  });

  el.clearPhotoBtn.addEventListener("click", () => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
    el.photoInput.value = "";
    el.photoPreview.removeAttribute("src");
    el.previewWrap.hidden = true;
    setSaveReady();
  });

  el.jobsList.addEventListener("click", async event => {
    const target = event.target.closest("button[data-action]");
    if (!target) return;
    const id = target.dataset.id;
    const action = target.dataset.action;
    try {
      if (action === "open") await openJob(id);
      if (action === "rebuild") await openRebuild(id);
      if (action === "delete") {
        const job = await getJob(id);
        if (!job) return renderHome();
        if (!confirm('Delete "' + job.title + '" and all of its saved steps?')) return;
        await deleteJob(id);
        await renderHome();
        toast("Job deleted.");
      }
    } catch (error) {
      fail(error);
    }
  });

  el.stepsList.addEventListener("click", event => {
    const target = event.target.closest("button[data-action='remove-step']");
    if (target) removeStep(target.dataset.id).catch(fail);
  });

  el.doneRebuildBtn.addEventListener("click", () => advanceRebuild(1).catch(fail));
  el.undoRebuildBtn.addEventListener("click", () => advanceRebuild(-1).catch(fail));
  el.restartRebuildBtn.addEventListener("click", () => restartRebuild().catch(fail));

  window.addEventListener("pagehide", () => {
    clearRenderUrls();
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  });

  async function boot() {
    if (!("indexedDB" in window)) throw new Error("IndexedDB is not available.");
    state.db = await openDatabase();
    await renderHome();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(error => console.warn("Service worker registration failed:", error));
    }
  }

  boot().catch(fail);
})();