/**
 * InputHandler — Keyboard and touch input
 * Embed verbatim. SPACE/UP = jump, DOWN = duck, touch support.
 */
const InputHandler = (() => {
  let callbacks = {};
  let touchStartY = 0;
  let jumpKeyDown = false;
  let duckKeyDown = false;

  function init(canvas, cbs) {
    callbacks = cbs;

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (!jumpKeyDown) {
          jumpKeyDown = true;
          if (callbacks.onJump) callbacks.onJump();
        }
      }
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (!duckKeyDown) {
          duckKeyDown = true;
          if (callbacks.onDuck) callbacks.onDuck();
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        jumpKeyDown = false;
        if (callbacks.onJumpRelease) callbacks.onJumpRelease();
      }
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        duckKeyDown = false;
        if (callbacks.onDuckRelease) callbacks.onDuckRelease();
      }
    });

    // Touch — top 2/3 tap = jump, bottom 1/3 tap = duck, swipe down = duck
    let touchAction = ''; // 'jump' | 'duck' | ''
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchStartY = e.touches[0].clientY;
      const rect = canvas.getBoundingClientRect();
      const relY = (e.touches[0].clientY - rect.top) / rect.height;
      touchAction = '';
      if (relY > 0.65) {
        // Bottom third — duck
        touchAction = 'duck';
        if (callbacks.onDuck) callbacks.onDuck();
      } else {
        // Top area — jump
        touchAction = 'jump';
        if (callbacks.onJump) callbacks.onJump();
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 30 && touchAction !== 'duck') {
        touchAction = 'duck';
        if (callbacks.onDuck) callbacks.onDuck();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (touchAction === 'jump') {
        if (callbacks.onJumpRelease) callbacks.onJumpRelease();
      } else if (touchAction === 'duck') {
        if (callbacks.onDuckRelease) callbacks.onDuckRelease();
      }
      touchAction = '';
    }, { passive: false });

    // Mouse click as fallback
    canvas.addEventListener('click', () => {
      if (callbacks.onAction) callbacks.onAction();
    });
  }

  return { init };
})();
