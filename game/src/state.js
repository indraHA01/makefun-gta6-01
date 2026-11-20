// SOLMAR state: one plain object the whole game reads and writes.
// Nothing here touches the DOM; save/load go through localStorage only.
import { PLAYER, SAVE_KEY, START_TIME, DISTRICTS } from './config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function freshState(seed) {
  const rand = mulberry32(seed);
  return {
    seed, time: START_TIME, elapsed: 0, paused: false, muted: false,
    screen: 'title', // title | play | busted | wasted | won | paused
    money: 250, health: PLAYER.health, wanted: 0, wantedHeat: 0,
    lastCrimeAt: -999, respect: 0, sunsetsFound: 0,
    missionIndex: 0, missionState: 'idle', // idle | active | done
    mission: null, taxi: null, race: null,
    player: {
      x: 700, y: 500, angle: 0, speed: 0, onFoot: true,
      carId: null, punchAt: -9, hurtAt: -9, shooting: false,
    },
    cars: [], peds: [], police: [], bullets: [], particles: [],
    pickups: [], markers: [], messages: [], dialogue: null,
    stats: { carsStolen: 0, fares: 0, racesWon: 0, missionsDone: 0, arrests: 0 },
    ownedCars: ['pinto'], selectedCar: 'pinto',
    flags: { metRosa: false, metMarco: false },
    rand,
  };
}

export function addMessage(state, text, kind) {
  state.messages.push({ text, kind: kind || 'info', at: state.elapsed });
  if (state.messages.length > 5) state.messages.shift();
}

export function setDialogue(state, speaker, lines) {
  state.dialogue = { speaker, lines, index: 0 };
}

export function advanceDialogue(state) {
  if (!state.dialogue) return false;
  state.dialogue.index += 1;
  if (state.dialogue.index >= state.dialogue.lines.length) {
    state.dialogue = null; return false;
  }
  return true;
}

export function districtAt(x, y) {
  // District lookup lives here so HUD, missions and audio agree on it.
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Solmar Bay';
}

export function saveGame(state) {
  try {
    const snap = {
      money: state.money, health: state.health, wanted: state.wanted,
      missionIndex: state.missionIndex, missionState: state.missionState,
      sunsetsFound: state.sunsetsFound, respect: state.respect,
      ownedCars: state.ownedCars, selectedCar: state.selectedCar,
      stats: state.stats, time: state.time,
      player: { x: state.player.x, y: state.player.y, onFoot: state.player.onFoot },
      flags: state.flags, savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
    addMessage(state, 'Progress saved.', 'good');
    return true;
  } catch (err) { return false; }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) { return null; }
}

export function applySave(state, snap) {
  if (!snap) return false;
  state.money = snap.money; state.health = snap.health;
  state.wanted = snap.wanted || 0;
  state.missionIndex = snap.missionIndex || 0;
  state.missionState = snap.missionState || 'idle';
  state.sunsetsFound = snap.sunsetsFound || 0;
  state.respect = snap.respect || 0;
  state.ownedCars = snap.ownedCars || ['pinto'];
  state.selectedCar = snap.selectedCar || 'pinto';
  state.stats = snap.stats || state.stats;
  state.time = snap.time ?? START_TIME;
  state.flags = snap.flags || state.flags;
  if (snap.player) {
    state.player.x = snap.player.x; state.player.y = snap.player.y;
    state.player.onFoot = snap.player.onFoot !== false;
  }
  return true;
}
