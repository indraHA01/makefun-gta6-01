// SOLMAR — main loop: input, simulation step, render. Everything else
// lives in its own module; this file only wires them together.
import { VIEW, STEP, DAY_LENGTH, KEYS, keyIs, CAR_MODELS } from './config.js';
import { freshState, addMessage, advanceDialogue, saveGame, loadSave, applySave, districtAt } from './state.js';
import { buildCity, hitsBuilding, clampToWorld } from './city.js';
import { createInput } from './input.js';
import { drawWorld } from './render.js';
import { drawHUD } from './hud.js';
import { spawnTraffic, spawnParkedCars, driveCar, moveCarWithCollision, nearestCar, removeCar, modelById, updateTraffic } from './vehicles.js';
import { spawnPeds, updatePeds, nearestPed } from './pedestrians.js';
import { updateWanted, updatePolice, addWanted, damagePlayer } from './police.js';
import { startMission, updateMission, updateTaxi, updateRace, checkSunsets, sunsetSpots, buyCar, missionDef, startTaxi, startRace } from './missions.js';
import { tryPunch, tryShoot, updateBullets, createLockpick, updateLockpick, updateParticles } from './combat.js';
import { ensureAudio, startMusic, engineHum, stopEngineHum, setMuted, blip, hornSound } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const SEED = Number(params.get('seed') || 20261120);

export const game = {
  state: freshState(SEED),
  city: null,
  input: createInput(canvas),
  cam: { x: 0, y: 0 },
  lockpickTarget: null,
  lastTime: 0,
  accumulator: 0,
};

export function resetWorld() {
  const s = game.state;
  s.cars = []; s.peds = []; s.police = []; s.bullets = []; s.particles = [];
  s.messages = []; s.dialogue = null; s.taxi = null; s.race = null;
  s.mission = null; s.missionState = 'idle'; s.lockpick = null;
  s.currentCar = null; s.sunsetSpots = sunsetSpots(s);
  game.city = buildCity(s.seed);
  spawnTraffic(s, game.city, 16);
  spawnParkedCars(s, 10);
  spawnPeds(s, 26);
  s.player.x = 700; s.player.y = 500; s.player.onFoot = true; s.player.carId = null;
  s.health = 100;
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  ctx.setTransform(canvas.width / VIEW.width, 0, 0, canvas.height / VIEW.height, 0, 0);
}

window.addEventListener('resize', resize);

function currentCar() {
  const s = game.state;
  if (s.player.onFoot || !s.player.carId) return null;
  return s.cars.find((c) => c.id === s.player.carId) || null;
}

function enterCar(car) {
  const s = game.state;
  s.player.onFoot = false;
  s.player.carId = car.id;
  s.currentCar = car;
  car.parked = false; car.kind = 'player';
  s.player.x = car.x; s.player.y = car.y;
  blip();
}

function exitCar() {
  const s = game.state;
  const car = currentCar();
  if (!car) return;
  s.player.onFoot = true;
  s.player.carId = null;
  s.currentCar = null;
  car.kind = 'parked';
  s.player.x = car.x + 40; s.player.y = car.y + 20;
  stopEngineHum();
}

// Steal flow: E near a parked car opens the lock-pick; Space stops the needle.
function trySteal(car) {
  const s = game.state;
  if (car.kind === 'police') { addMessage(s, 'That is an SMPD car. Stealing it is a very bad idea.', 'bad'); return; }
  if (s.ownedCars.includes(car.model) && car.parked) { enterCar(car); return; }
  s.lockpick = createLockpick();
  game.lockpickTarget = car;
  addMessage(s, 'Picking the lock… stop the needle in the green.', 'info');
}

function finishSteal(result) {
  const s = game.state;
  const car = game.lockpickTarget;
  if (result === 'success' && car) {
    s.lockpick = null;
    s.stats.carsStolen += 1;
    addWanted(s, 1, 'Car stolen');
    enterCar(car);
    addMessage(s, 'It is yours. Drive like you mean it.', 'good');
  } else if (result === 'fail') {
    s.lockpick = null;
    addWanted(s, 1, 'The alarm went off — someone called SMPD');
    addMessage(s, 'Lock-pick failed. The alarm is screaming.', 'bad');
  }
}

export function tick(dt) {
  const s = game.state;
  const input = game.input;
  if (s.screen === 'title') {
    if (input.consume('Enter')) {
      ensureAudio(); startMusic();
      s.screen = 'play';
      addMessage(s, 'Welcome to Solmar Bay. Find Rosa Delgado to start the story — or just drive.', 'info');
    } else if (input.consume('KeyC')) {
      const snap = loadSave();
      if (snap && applySave(s, snap)) { ensureAudio(); startMusic(); s.screen = 'play'; addMessage(s, 'Save loaded. Welcome back, Mara.', 'good'); }
      else addMessage(s, 'No save found yet.', 'info');
    }
    input.endFrame();
    return;
  }
  if (s.showShop && input.consume('Escape')) { s.showShop = false; input.endFrame(); return; }
  if (input.consume(KEYS.pause)) {
    s.screen = s.screen === 'paused' ? 'play' : 'paused';
  }
  if (s.screen === 'paused') { input.endFrame(); return; }
  if (s.screen === 'busted' || s.screen === 'wasted' || s.screen === 'won') {
    if (input.consume('Enter')) {
      const snap = loadSave();
      resetWorld();
      if (snap) applySave(s, snap);
      s.screen = 'play';
    }
    input.endFrame();
    return;
  }
  // Dialogue advances on Enter or click, and pauses the world.
  if (s.dialogue) {
    if (input.consume('Enter') || input.mouse().clicked) advanceDialogue(s);
    input.endFrame();
    return;
  }
  if (input.consume(KEYS.mute)) { s.muted = !s.muted; setMuted(s.muted); }
  if (input.consume('KeyH')) s.showHelp = !s.showHelp;
  if (s.showHelp) { input.endFrame(); return; }
  if (input.consume(KEYS.save)) saveGame(s);

  s.elapsed += dt;
  s.time = (s.time + dt / DAY_LENGTH) % 1;

  // Lock-pick minigame pauses driving but not the needle.
  if (s.lockpick) {
    const result = updateLockpick(s, s.lockpick, dt, input.consume(KEYS.punch));
    if (result === 'success' || result === 'fail') finishSteal(result);
    input.endFrame();
    return;
  }

  // Dealership: F near the lot on Casino Mile opens the shop.
  if (s.showShop) {
    const buyable = CAR_MODELS.filter((m) => m.price > 0);
    buyable.forEach((m, i) => {
      if (input.consume('Digit' + (i + 1))) buyCar(s, m.id);
    });
    if (input.consume('Escape')) s.showShop = false;
    input.endFrame();
    return;
  }

  const p = s.player;
  const car = currentCar();
  if (!p.onFoot && car) {
    // Driving.
    const drive = {
      up: input.isDownAny(KEYS.up), down: input.isDownAny(KEYS.down),
      left: input.isDownAny(KEYS.left), right: input.isDownAny(KEYS.right),
    };
    const { nx, ny } = driveCar(car, drive, dt);
    moveCarWithCollision(s, game.city, car, nx, ny);
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    engineHum(car.speed, modelById(car.model).topSpeed);
    if (input.consume(KEYS.enterCar)) exitCar();
    if (input.consume(KEYS.horn)) hornSound();
    // Hitting a pedestrian while driving is a crime, and it shows.
    for (const ped of s.peds) {
      if (ped.health > 0 && Math.abs(car.speed) > 120 && Math.hypot(ped.x - car.x, ped.y - car.y) < 26) {
        ped.health = 0;
        addWanted(s, 1, 'You hit a pedestrian');
        addMessage(s, 'You hit someone. SMPD was called.', 'bad');
      }
    }
    // Driving fast through a police car is a crime too.
    for (const unit of s.police) {
      if (unit.alive && Math.hypot(unit.car.x - car.x, unit.car.y - car.y) < 44 && Math.abs(car.speed) > 200) {
        unit.alive = false;
        addWanted(s, 2, 'You rammed a police car');
      }
    }
  } else {
    // On foot.
    stopEngineHum();
    const run = input.isDown(KEYS.run);
    const speed = run ? 330 : 210;
    let mx = 0, my = 0;
    if (input.isDownAny(KEYS.up)) my -= 1;
    if (input.isDownAny(KEYS.down)) my += 1;
    if (input.isDownAny(KEYS.left)) mx -= 1;
    if (input.isDownAny(KEYS.right)) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      p.angle = Math.atan2(my / len, mx / len);
      const nx = p.x + (mx / len) * speed * dt;
      const ny = p.y + (my / len) * speed * dt;
      if (!hitsBuilding(game.city, nx, p.y, 13)) p.x = nx;
      if (!hitsBuilding(game.city, p.x, ny, 13)) p.y = ny;
      const clamped = clampToWorld(p.x, p.y, 14);
      p.x = clamped.x; p.y = clamped.y;
    }
    if (input.consume(KEYS.punch)) tryPunch(s);
    if (input.mouse().clicked) {
      const rect = canvas.getBoundingClientRect();
      const wx = game.cam.x + (input.mouse().x / rect.width) * VIEW.width;
      const wy = game.cam.y + (input.mouse().y / rect.height) * VIEW.height;
      tryShoot(s, wx, wy);
    }
    if (input.consume(KEYS.enterCar)) {
      const near = nearestCar(s, p.x, p.y, 70);
      if (near) trySteal(near);
    }
    if (input.consume(KEYS.interact)) {
      // Mission giver, dealership, taxi and race triggers all live on F.
      const def = missionDef(s);
      if (def && s.missionState === 'idle') startMission(s);
      else if (Math.abs(p.x - 1600) < 120 && Math.abs(p.y - 700) < 120) s.showShop = true;
      else if (!s.taxi && !p.onFoot) { /* taxi needs a car */ }
      else if (!s.taxi) startTaxi(s);
    }
  }
  // Taxi and race start keys (T and R) for players who read the help.
  if (input.consume('KeyT') && !p.onFoot && !s.taxi) startTaxi(s);
  if (input.consume('KeyR') && !p.onFoot && !s.race) startRace(s);

  updateMission(s, dt);
  updateTaxi(s, dt);
  updateRace(s, dt);
  checkSunsets(s);
  updateWanted(s, dt);
  updatePolice(s, game.city, dt);
  updatePeds(s, game.city, dt);
  updateBullets(s, game.city, dt);
  updateParticles(s, dt);
  // Traffic keeps flowing around the player.
  updateTraffic(s, game.city, dt);
  input.endFrame();
}

function frame(now) {
  const dt = Math.min(0.05, (now - game.lastTime) / 1000 || STEP);
  game.lastTime = now;
  game.accumulator += dt;
  while (game.accumulator >= STEP) {
    game.accumulator -= STEP;
    if (game.state.screen === 'play' || game.state.screen === 'title' || game.state.screen === 'busted' || game.state.screen === 'wasted' || game.state.screen === 'won') {
      if (!shotName) tick(STEP);
    }
  }
  // Camera follows the player, clamped to the world.
  const s = game.state;
  game.cam.x = Math.max(0, Math.min(WORLD.width - VIEW.width, s.player.x - VIEW.width / 2));
  game.cam.y = Math.max(0, Math.min(WORLD.height - VIEW.height, s.player.y - VIEW.height / 2));
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawWorld(ctx, s, game.city, game.cam);
  drawHUD(ctx, s, game.city);
  requestAnimationFrame(frame);
}

import { WORLD } from './config.js';

// The screenshot stager drives the game through these two methods.
game.resetWorld = resetWorld;
game.tick = tick;

// Boot: build the world, stage a screenshot scene or show the title.
resetWorld();
resize();
if (shotName) {
  stageShot(shotName, game);
  game.cam.x = Math.max(0, Math.min(WORLD.width - VIEW.width, game.state.player.x - VIEW.width / 2));
  game.cam.y = Math.max(0, Math.min(WORLD.height - VIEW.height, game.state.player.y - VIEW.height / 2));
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawWorld(ctx, game.state, game.city, game.cam);
  drawHUD(ctx, game.state, game.city);
  document.title = 'SOLMAR — ' + shotName;
} else {
  requestAnimationFrame(frame);
}

// Exposed for the local play-test harness.
window.__solmar = game;
