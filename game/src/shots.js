// SOLMAR screenshot staging: each ?shot= scene plays the real rules
// forward from a fresh world for a fixed number of steps, so the frame
// is what real play looks like and the same seed always gives the same
// frame. No scene is composited or edited — the renderer draws it.
import { STEP } from './config.js';
import { startMission, startTaxi, startRace } from './missions.js';
import { advanceDialogue } from './state.js';
import { addWanted, spawnPolice } from './police.js';
import { spawnCar } from './vehicles.js';

const SAMPLE = STEP;

// Drive the player's car toward a point for `seconds`, simple autopilot.
function driveToward(game, tx, ty, seconds) {
  const steps = Math.floor(seconds / SAMPLE);
  let lastX = 0, lastY = 0;
  for (let i = 0; i < steps; i += 1) {
    const p = game.state.player;
    const car = game.state.currentCar;
    if (!car) break;
    if (i === 0) { lastX = car.x; lastY = car.y; }
    const dx = tx - p.x, dy = ty - p.y;
    const want = Math.atan2(dy, dx);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > 0.15) game.input.press('KeyD');
    else if (diff < -0.15) game.input.press('KeyA');
    game.input.press('KeyW');
    game.tick(SAMPLE);
    game.input.release('KeyD'); game.input.release('KeyA'); game.input.release('KeyW');
    // Unstick: if the car barely moved, reverse out for a moment.
    if (i > 0 && i % 45 === 0) {
      const moved = Math.hypot(car.x - lastX, car.y - lastY);
      if (moved < 12) {
        for (let r = 0; r < 30; r += 1) {
          game.input.press('KeyS'); game.input.press(diff > 0 ? 'KeyA' : 'KeyD');
          game.tick(SAMPLE);
          game.input.release('KeyS'); game.input.release('KeyA'); game.input.release('KeyD');
        }
      }
      lastX = car.x; lastY = car.y;
    }
  }
}

function walkToward(game, tx, ty, seconds) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const p = game.state.player;
    const dx = tx - p.x, dy = ty - p.y;
    if (Math.hypot(dx, dy) < 20) break;
    const want = Math.atan2(dy, dx);
    p.angle = want;
    const key = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'KeyD' : 'KeyA') : (dy > 0 ? 'KeyS' : 'KeyW');
    game.input.press(key);
    game.tick(SAMPLE);
    game.input.release(key);
  }
}

// Push every police unit out to `dist` px so the shot catches the chase
// approaching, not a pile-up already on top of the player.
function pushPoliceBack(game, dist) {
  const p = game.state.player;
  for (const unit of game.state.police) {
    const dx = unit.car.x - p.x, dy = unit.car.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    unit.car.x = p.x + (dx / len) * dist;
    unit.car.y = p.y + (dy / len) * dist;
  }
}

// Put the player in a car on the road, engine running, ready to drive.
function putPlayerInCar(game, x, y, angle, modelId) {
  const car = spawnCar(game.state, modelId || 'muscle', x, y, angle, 'parked');
  car.parked = false;
  game.state.player.onFoot = false;
  game.state.player.carId = car.id;
  game.state.player.x = x; game.state.player.y = y;
  game.state.currentCar = car;
  return car;
}

export function stageShot(name, game) {
  const state = game.state;
  game.resetWorld();
  state.screen = 'play';
  state.showHelp = false; state.showShop = false;
  if (name === 'cover') {
    // The chase: muscle car on the Strip, wanted 3, police behind, mission live.
    state.time = 0.72; // dusk — neon on, sun low over the bay
    putPlayerInCar(game, 800, 480, 0, 'muscle');
    startMission(state);
    while (state.dialogue) advanceDialogue(state);
    addWanted(state, 3, 'The drop was watched');
    spawnPolice(state, 2);
    pushPoliceBack(game, 700);
    driveToward(game, 1500, 480, 2.5);
    state.player.x = game.state.currentCar.x; state.player.y = game.state.currentCar.y;
    return { label: 'cover — dusk chase, wanted 3, mission live' };
  }
  if (name === 'onfoot') {
    // On foot in Downtown among pedestrians and traffic, midday sun.
    state.time = 0.35;
    state.player.x = 800; state.player.y = 480; state.player.onFoot = true;
    walkToward(game, 960, 480, 5);
    startTaxi(state);
    return { label: 'onfoot — walking Downtown, taxi fare waiting' };
  }
  if (name === 'mission') {
    // M2 getaway: wanted 3, police in pursuit, safehouse marker ahead.
    state.time = 0.5;
    state.missionIndex = 1;
    putPlayerInCar(game, 480, 800, 0, 'sport');
    startMission(state);
    while (state.dialogue) advanceDialogue(state);
    pushPoliceBack(game, 650);
    driveToward(game, 900, 800, 1.5);
    return { label: 'mission — M2 getaway with police pursuit' };
  }
  // dusk: the Neon Strip at dusk, taxi fare and a street race queued.
  state.time = 0.74;
  putPlayerInCar(game, 1440, 480, Math.PI / 2, 'taxi');
  startRace(state);
  driveToward(game, 1440, 800, 2);
  return { label: 'dusk — Neon Strip taxi, race checkpoints ahead' };
}
