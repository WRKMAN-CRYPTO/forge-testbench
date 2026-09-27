(() => {
  'use strict';

  const STORAGE_KEY = 'park-pin:v1';
  const VERSION = 1;

  const el = {
    spotNote: document.querySelector('#spotNote'),
    saveBtn: document.querySelector('#saveBtn'),
    locateBtn: document.querySelector('#locateBtn'),
    clearBtn: document.querySelector('#clearBtn'),
    emptyState: document.querySelector('#emptyState'),
    pinState: document.querySelector('#pinState'),
    savedNote: document.querySelector('#savedNote'),
    savedWhen: document.querySelector('#savedWhen'),
    savedAccuracyRow: document.querySelector('#savedAccuracyRow'),
    savedAccuracy: document.querySelector('#savedAccuracy'),
    finder: document.querySelector('#finder'),
    distanceValue: document.querySelector('#distanceValue'),
    directionValue: document.querySelector('#directionValue'),
    currentAccuracy: document.querySelector('#currentAccuracy'),
    ageBadge: document.querySelector('#ageBadge'),
    gpsBadge: document.querySelector('#gpsBadge'),
    status: document.querySelector('#status')
  };

  let state = loadState();
  let busy = false;

  function blankState() {
    return { version: VERSION, pin: null };
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function validPin(pin) {
    if (!pin || typeof pin !== 'object') return false;
    if (!Number.isFinite(Date.parse(pin.savedAt))) return false;
    if (typeof pin.note !== 'string') return false;
    if (pin.coords === null) return true;
    if (!pin.coords || typeof pin.coords !== 'object') return false;
    const { lat, lon, accuracy } = pin.coords;
    const validAccuracy = accuracy === null || (isFiniteNumber(accuracy) && accuracy >= 0);
    return isFiniteNumber(lat) && lat >= -90 && lat <= 90 &&
      isFiniteNumber(lon) && lon >= -180 && lon <= 180 &&
      validAccuracy;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== VERSION) return blankState();
      if (parsed.pin !== null && !validPin(parsed.pin)) return blankState();
      return parsed;
    } catch {
      return blankState();
    }
  }

  function saveState(nextState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    state = nextState;
  }

  function setStatus(message, kind = '') {
    el.status.textContent = message;
    el.status.dataset.kind = kind;
  }

  function setBusy(next, label = '') {
    busy = next;
    el.saveBtn.disabled = next;
    if (el.locateBtn) el.locateBtn.disabled = next;
    el.saveBtn.textContent = next && label === 'save' ? 'GETTING LOCATION…' : 'SAVE THIS SPOT';
    el.locateBtn.textContent = next && label === 'locate' ? 'LOCATING…' : "WHERE'S MY CAR?";
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not available in this browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        position => resolve(position),
        error => {
          const message = error.code === 1
            ? 'Location permission was denied.'
            : error.code === 2
              ? 'Your location could not be determined.'
              : 'Location took too long to respond.';
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  function coordsFrom(position) {
    const rawAccuracy = position.coords.accuracy;
    return {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      accuracy: isFiniteNumber(rawAccuracy) && rawAccuracy >= 0 ? rawAccuracy : null
    };
  }

  function toRadians(deg) {
    return deg * Math.PI / 180;
  }

  function toDegrees(rad) {
    return rad * 180 / Math.PI;
  }

  function distanceMeters(a, b) {
    const earth = 6371000;
    const dLat = toRadians(b.lat - a.lat);
    const dLon = toRadians(b.lon - a.lon);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * earth * Math.asin(Math.sqrt(h));
  }

  function bearingDegrees(from, to) {
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);
    const dLon = toRadians(to.lon - from.lon);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  function cardinal(degrees) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(degrees / 45) % 8];
  }

  function formatDistance(meters) {
    const feet = meters * 3.28084;
    if (feet < 1000) return `${Math.round(feet)} ft`;
    const miles = feet / 5280;
    return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
  }

  function formatAccuracy(meters) {
    if (!isFiniteNumber(meters)) return 'unknown';
    const feet = meters * 3.28084;
    return `±${Math.max(1, Math.round(feet))} ft`;
  }

  function formatSavedTime(iso) {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short', hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric'
    }).format(date);
  }

  function ageText(iso) {
    const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function clearFinder() {
    el.finder.hidden = true;
    el.currentAccuracy.hidden = true;
    el.distanceValue.textContent = '—';
    el.directionValue.textContent = '—';
  }

  function render() {
    const pin = state.pin;
    el.gpsBadge.textContent = 'GPS on tap';
    if (!pin) {
      el.emptyState.hidden = false;
      el.pinState.hidden = true;
      el.ageBadge.textContent = 'None';
      clearFinder();
      return;
    }

    el.emptyState.hidden = true;
    el.pinState.hidden = false;
    el.ageBadge.textContent = ageText(pin.savedAt);
    el.savedWhen.textContent = formatSavedTime(pin.savedAt);
    el.savedNote.textContent = pin.note || 'No spot note saved.';
    el.savedNote.classList.toggle('muted', !pin.note);

    if (pin.coords) {
      el.savedAccuracyRow.hidden = false;
      el.savedAccuracy.textContent = formatAccuracy(pin.coords.accuracy);
      el.locateBtn.disabled = busy;
      el.locateBtn.textContent = busy ? 'LOCATING…' : "WHERE'S MY CAR?";
    } else {
      el.savedAccuracyRow.hidden = true;
      el.locateBtn.disabled = true;
      el.locateBtn.textContent = 'NOTE-ONLY PIN';
      clearFinder();
    }
  }

  async function savePin() {
    if (busy) return;
    const note = el.spotNote.value.trim();
    setStatus('');
    setBusy(true, 'save');

    try {
      let coords = null;
      let gpsError = null;

      try {
        coords = coordsFrom(await getPosition());
      } catch (error) {
        gpsError = error;
      }

      if (!coords && !note) {
        setStatus(`${gpsError?.message || 'Location is unavailable.'} Add a spot note if you want to save without GPS.`, 'error');
        return;
      }

      const nextState = {
        version: VERSION,
        pin: {
          savedAt: new Date().toISOString(),
          note,
          coords
        }
      };

      try {
        saveState(nextState);
      } catch {
        setStatus('This browser would not store the pin. Nothing was reported as saved.', 'error');
        return;
      }

      el.spotNote.value = '';
      clearFinder();
      if (coords) {
        setStatus('Car pinned. Location stays on this device.', 'ok');
      } else {
        setStatus(`${gpsError?.message || 'Location is unavailable.'} Saved your spot note instead.`, 'warn');
      }
    } finally {
      setBusy(false);
      render();
    }
  }

  async function locateCar() {
    if (busy || !state.pin?.coords) return;
    setStatus('');
    setBusy(true, 'locate');
    try {
      const position = await getPosition();
      const current = coordsFrom(position);
      const target = state.pin.coords;
      const meters = distanceMeters(current, target);
      const bearing = bearingDegrees(current, target);
      el.distanceValue.textContent = formatDistance(meters);
      el.directionValue.textContent = `${cardinal(bearing)} · ${Math.round(bearing)}°`;
      el.currentAccuracy.textContent = `Current GPS accuracy ${formatAccuracy(current.accuracy)}. Distance is straight-line, not a walking route.`;
      el.currentAccuracy.hidden = false;
      el.finder.hidden = false;
      setStatus('Fresh location fix acquired.', 'ok');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
      render();
      if (!el.finder.hidden) {
        el.locateBtn.textContent = 'REFRESH LOCATION';
      }
    }
  }

  function clearPin() {
    if (!state.pin || busy) return;
    if (!confirm('Clear the saved parking pin?')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      state = blankState();
    } catch {
      setStatus('The browser would not clear the saved pin.', 'error');
      return;
    }
    clearFinder();
    setStatus('Parking pin cleared.', 'ok');
    render();
  }

  el.saveBtn.addEventListener('click', savePin);
  el.locateBtn.addEventListener('click', locateCar);
  el.clearBtn.addEventListener('click', clearPin);

  setInterval(() => {
    if (state.pin) el.ageBadge.textContent = ageText(state.pin.savedAt);
  }, 30000);

  render();

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
