/**
 * InputHandler — Keyboard and touch input
 * Embed verbatim. SPACE/UP = jump, DOWN = duck, touch support.
 */
const InputHandler = (() => {
  let callbacks = {};
  let touchStartY = 0;

  function init(canvas, cbs) {
    callbacks = cbs;

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (callbacks.onJump) callbacks.onJump();
      }
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (callbacks.onDuck) callbacks.onDuck();
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (callbacks.onDuckRelease) callbacks.onDuckRelease();
      }
    });

    // Touch — tap to jump, swipe down to duck
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchStartY = e.touches[0].clientY;
      if (callbacks.onJump) callbacks.onJump();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 30) {
        if (callbacks.onDuck) callbacks.onDuck();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (callbacks.onDuckRelease) callbacks.onDuckRelease();
    }, { passive: false });

    // Mouse click as fallback
    canvas.addEventListener('click', () => {
      if (callbacks.onAction) callbacks.onAction();
    });
  }

  return { init };
})();
