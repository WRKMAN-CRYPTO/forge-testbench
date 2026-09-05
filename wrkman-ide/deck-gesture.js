(() => {
  'use strict';

  const deck = document.querySelector('#codeDeck');
  if (!deck) return;

  const DRAG_THRESHOLD = 7;
  let gesture = null;
  let replaying = false;

  deck.addEventListener('pointerdown', event => {
    if (replaying) return;
    const button = event.target.closest('.deck-key');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    gesture = {
      pointerId: event.pointerId,
      button,
      startX: event.clientX,
      startScrollLeft: deck.scrollLeft,
      moved: false
    };

    try { deck.setPointerCapture(event.pointerId); } catch {}
  }, true);

  deck.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const dx = event.clientX - gesture.startX;
    if (Math.abs(dx) >= DRAG_THRESHOLD) gesture.moved = true;
    if (gesture.moved) deck.scrollLeft = gesture.startScrollLeft - dx;
  }, true);

  const finish = event => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const completed = gesture;
    gesture = null;
    try { deck.releasePointerCapture(event.pointerId); } catch {}

    if (completed.moved) return;

    replaying = true;
    completed.button.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      clientX: event.clientX,
      clientY: event.clientY
    }));
    replaying = false;
  };

  deck.addEventListener('pointerup', finish, true);
  deck.addEventListener('pointercancel', event => {
    if (gesture && event.pointerId === gesture.pointerId) gesture = null;
  }, true);
})();
