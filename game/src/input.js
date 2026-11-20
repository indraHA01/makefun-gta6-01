// SOLMAR input: keyboard + mouse, with edge-triggered presses.
// The game polls held keys each frame and consumes pressed keys once.
export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, down: false, clicked: false };
  let anyKey = false;

  function onDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!held.has(e.code)) pressed.add(e.code);
    held.add(e.code); anyKey = true;
  }
  function onUp(e) { held.delete(e.code); }
  function onBlur() { held.clear(); }

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => { mouse.down = true; mouse.clicked = true; });
  window.addEventListener('mouseup', () => { mouse.down = false; });

  return {
    isDown(code) { return held.has(code); },
    isDownAny(codes) { return codes.some((c) => held.has(c)); },
    wasPressed(code) { return pressed.has(code); },
    consume(code) { const had = pressed.has(code); pressed.delete(code); return had; },
    endFrame() { pressed.clear(); mouse.clicked = false; },
    mouse() { return mouse; },
    get anyKey() { return anyKey; },
    resetAnyKey() { anyKey = false; },
    // Virtual keys let the screenshot stager and tests drive the game.
    press(code) { if (!held.has(code)) pressed.add(code); held.add(code); },
    release(code) { held.delete(code); },
  };
}
