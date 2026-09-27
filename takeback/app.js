(() => {
  "use strict";

  const DB_NAME = "takeback-db";
  const DB_VERSION = 1;
  const STORE = "steps";
  const MAX_EDGE = 1600;
  const JPEG_QUALITY = 0.82;

  const $ = (id) => document.getElementById(id);
  const el = {
    captureView: $("captureView"),
    rebuildView: $("rebuildView"),
    stepPill: $("stepPill"),
    photoInput: $("photoInput"),
    cameraPad: $("cameraPad"),
    pendingPreview: $("pendingPreview"),
    noteInput: $("noteInput"),
    saveStep: $("saveStep"),
    status: $("status"),
    latestSection: $("latestSection"),
    latestTitle: $("latestTitle"),
    latestImage: $("latestImage"),
    latestNote: $("latestNote"),
    removeLast: $("removeLast"),
    startRebuild: $("startRebuild"),
    clearJournal: $("clearJournal"),
    exitRebuild: $("exitRebuild"),
    rebuildCard: $("rebuildCard"),
    rebuildProgress: $("rebuildProgress"),
    originalStep: $("originalStep"),
    rebuildPhotoWrap: $("rebuildPhotoWrap"),
    rebuildImage: $("rebuildImage"),
    rebuildNoPhoto: $("rebuildNoPhoto"),
    rebuildNote: $("rebuildNote"),
    completeCard: $("completeCard"),
    prevRebuild: $("prevRebuild"),
    nextRebuild: $("nextRebuild")
  };

  const state = {
    db: null,
    steps: [],
    pendingBlob: null,
    pendingUrl: null,
    renderedUrls: [],
    rebuildIndex: 0
  };

  function setStatus(message, isError) {
    el.status.textContent = message || "";
    el.status.classList.toggle("error", Boolean(isError));
  }

  function revokeRenderedUrls() {
    state.renderedUrls.forEach((url) => URL.revokeObjectURL(url));
    state.renderedUrls = [];
  }

  function blobUrl(blob) {
    const url = URL.createObjectURL(blob);
    state.renderedUrls.push(url);
    return url;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open local storage."));
    });
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Local storage request failed."));
    });
  }

  async function loadSteps() {
    const tx = state.db.transaction(STORE, "readonly");
    const result = await requestResult(tx.objectStore(STORE).getAll());
    state.steps = result.sort((a, b) => a.id - b.id);
    renderCapture();
  }

  async function addStep(record) {
    const tx = state.db.transaction(STORE, "readwrite");
    await requestResult(tx.objectStore(STORE).add(record));
    await loadSteps();
  }

  async function deleteStep(id) {
    const tx = state.db.transaction(STORE, "readwrite");
    await requestResult(tx.objectStore(STORE).delete(id));
    await loadSteps();
  }

  async function clearSteps() {
    const tx = state.db.transaction(STORE, "readwrite");
    await requestResult(tx.objectStore(STORE).clear());
    await loadSteps();
  }

  async function compressImage(file) {
    if (!file || !file.type.startsWith("image/")) return null;

    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (error) {
      return file;
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1200000) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const compressed = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });
    return compressed || file;
  }

  function resetPending() {
    if (state.pendingUrl) URL.revokeObjectURL(state.pendingUrl);
    state.pendingUrl = null;
    state.pendingBlob = null;
    el.pendingPreview.removeAttribute("src");
    el.cameraPad.classList.remove("has-photo");
    el.photoInput.value = "";
    el.noteInput.value = "";
  }

  function renderCapture() {
    revokeRenderedUrls();
    const count = state.steps.length;
    el.stepPill.textContent = count + (count === 1 ? " step" : " steps");
    el.startRebuild.disabled = count === 0;
    el.clearJournal.disabled = count === 0;

    if (!count) {
      el.latestSection.hidden = true;
      return;
    }

    const latest = state.steps[count - 1];
    el.latestSection.hidden = false;
    el.latestTitle.textContent = "Step " + count;
    el.latestNote.textContent = latest.note || "";

    if (latest.image instanceof Blob) {
      el.latestImage.src = blobUrl(latest.image);
      el.latestImage.classList.remove("no-image");
      el.latestImage.alt = "Photo from teardown step " + count;
    } else {
      el.latestImage.removeAttribute("src");
      el.latestImage.classList.add("no-image");
    }
  }

  function enterCapture() {
    revokeRenderedUrls();
    state.rebuildIndex = 0;
    el.rebuildView.hidden = true;
    el.captureView.hidden = false;
    renderCapture();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function enterRebuild() {
    if (!state.steps.length) return;
    revokeRenderedUrls();
    state.rebuildIndex = 0;
    el.captureView.hidden = true;
    el.rebuildView.hidden = false;
    renderRebuild();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderRebuild() {
    revokeRenderedUrls();
    const total = state.steps.length;
    const complete = state.rebuildIndex >= total;

    el.rebuildCard.hidden = complete;
    el.completeCard.hidden = !complete;
    el.prevRebuild.disabled = state.rebuildIndex === 0;

    if (complete) {
      el.nextRebuild.textContent = "BACK TO TEARDOWN";
      el.nextRebuild.disabled = false;
      return;
    }

    const sourceIndex = total - 1 - state.rebuildIndex;
    const step = state.steps[sourceIndex];
    el.rebuildProgress.textContent = (state.rebuildIndex + 1) + " of " + total;
    el.originalStep.textContent = "Original step " + (sourceIndex + 1);
    el.rebuildNote.textContent = step.note || "";

    const hasImage = step.image instanceof Blob;
    el.rebuildImage.hidden = !hasImage;
    el.rebuildNoPhoto.hidden = hasImage;
    if (hasImage) {
      el.rebuildImage.src = blobUrl(step.image);
      el.rebuildImage.alt = "Photo from original teardown step " + (sourceIndex + 1);
    } else {
      el.rebuildImage.removeAttribute("src");
    }

    el.nextRebuild.textContent = state.rebuildIndex === total - 1 ? "DONE · FINISH" : "DONE · NEXT";
  }

  async function handlePhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setStatus("Preparing photo…", false);
    el.saveStep.disabled = true;
    try {
      const blob = await compressImage(file);
      if (state.pendingUrl) URL.revokeObjectURL(state.pendingUrl);
      state.pendingBlob = blob;
      state.pendingUrl = URL.createObjectURL(blob);
      el.pendingPreview.src = state.pendingUrl;
      el.cameraPad.classList.add("has-photo");
      setStatus("Photo ready. Add a note if it helps.", false);
    } catch (error) {
      setStatus("Could not prepare that photo. Try another one.", true);
    } finally {
      el.saveStep.disabled = false;
    }
  }

  async function handleSave() {
    const note = el.noteInput.value.trim();
    if (!state.pendingBlob && !note) {
      setStatus("Add a photo or a note first.", true);
      return;
    }

    el.saveStep.disabled = true;
    setStatus("Saving step…", false);
    try {
      await addStep({
        createdAt: Date.now(),
        note,
        image: state.pendingBlob || null
      });
      resetPending();
      setStatus("Step " + state.steps.length + " saved.", false);
    } catch (error) {
      const quota = error && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
      setStatus(quota ? "Device storage is full. Remove a step or free some browser storage." : "Could not save this step. Your pending photo is still here.", true);
    } finally {
      el.saveStep.disabled = false;
    }
  }

  async function handleRemoveLast() {
    const latest = state.steps[state.steps.length - 1];
    if (!latest) return;
    if (!window.confirm("Remove the most recent teardown step?")) return;

    try {
      await deleteStep(latest.id);
      setStatus("Last step removed.", false);
    } catch (error) {
      setStatus("Could not remove that step.", true);
    }
  }

  async function handleClear() {
    if (!state.steps.length) return;
    const message = "Delete all " + state.steps.length + " saved steps? This cannot be undone.";
    if (!window.confirm(message)) return;

    try {
      await clearSteps();
      resetPending();
      setStatus("Journal cleared.", false);
    } catch (error) {
      setStatus("Could not clear the journal.", true);
    }
  }

  function bindEvents() {
    el.photoInput.addEventListener("change", handlePhoto);
    el.saveStep.addEventListener("click", handleSave);
    el.removeLast.addEventListener("click", handleRemoveLast);
    el.clearJournal.addEventListener("click", handleClear);
    el.startRebuild.addEventListener("click", enterRebuild);
    el.exitRebuild.addEventListener("click", enterCapture);

    el.prevRebuild.addEventListener("click", () => {
      if (state.rebuildIndex > 0) {
        state.rebuildIndex -= 1;
        renderRebuild();
      }
    });

    el.nextRebuild.addEventListener("click", () => {
      if (state.rebuildIndex >= state.steps.length) {
        enterCapture();
        return;
      }
      state.rebuildIndex += 1;
      renderRebuild();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("pagehide", () => {
      revokeRenderedUrls();
      if (state.pendingUrl) URL.revokeObjectURL(state.pendingUrl);
    });
  }

  async function init() {
    bindEvents();
    if (!("indexedDB" in window)) {
      setStatus("This browser does not provide the local storage TAKEBACK needs.", true);
      el.saveStep.disabled = true;
      return;
    }

    try {
      state.db = await openDatabase();
      await loadSteps();
    } catch (error) {
      setStatus("TAKEBACK could not open its local journal.", true);
      el.saveStep.disabled = true;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  init();
})();
