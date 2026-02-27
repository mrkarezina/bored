// --- InputHandler IIFE ---
const InputHandler = (() => {
  let cbs = {};
  let touchStartY = 0;
  let touchStartX = 0;
  let duckingFromTouch = false;

  function init(canvas, callbacks) {
    cbs = callbacks;

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (cbs.onJump) cbs.onJump();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (cbs.onDuck) cbs.onDuck();
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (cbs.onJumpRelease) cbs.onJumpRelease();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        if (cbs.onDuckRelease) cbs.onDuckRelease();
      }
    });

    // Touch — tap to jump, swipe down to duck
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      duckingFromTouch = false;
      if (cbs.onJump) cbs.onJump();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 30 && !duckingFromTouch) {
        duckingFromTouch = true;
        if (cbs.onDuck) cbs.onDuck();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (duckingFromTouch) {
        duckingFromTouch = false;
        if (cbs.onDuckRelease) cbs.onDuckRelease();
      }
      if (cbs.onJumpRelease) cbs.onJumpRelease();
    }, { passive: false });

    // Mouse
    canvas.addEventListener('mousedown', () => { if (cbs.onJump) cbs.onJump(); });
    canvas.addEventListener('mouseup', () => { if (cbs.onJumpRelease) cbs.onJumpRelease(); });
  }

  return { init };
})();
