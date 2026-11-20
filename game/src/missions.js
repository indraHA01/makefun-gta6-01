// SOLMAR missions: a 3-mission story arc plus taxi fares, street races
// and sunset collectibles. Each mission is a small state machine of
// waypoints the player drives or walks to, in order.
import { MISSIONS, TAXI_FARE, RACE_REWARD, SUNSET_COUNT, CAR_MODELS } from './config.js';
import { nearestRoadPoint } from './city.js';
import { addMessage, setDialogue } from './state.js';
import { spawnViper, spawnTaxiPassenger, nearestPed } from './pedestrians.js';
import { addWanted, clearPolice } from './police.js';
import { cashSound, missionSound } from './audio.js';

export function missionDef(state) {
  return MISSIONS[state.missionIndex] || null;
}

export function startMission(state) {
  const def = missionDef(state);
  if (!def || state.missionState === 'active') return false;
  state.missionState = 'active';
  state.mission = { id: def.id, step: 0, timer: 0, drops: 0, vipers: [] };
  missionSound();
  if (def.id === 'm1') {
    state.mission.waypoints = [
      { x: 320, y: 300, label: 'Pick up the package — Marina', radius: 46 },
      { x: 2080, y: 800, label: 'Deliver to the Docks', radius: 46 },
    ];
    setDialogue(state, 'Rosa Delgado', [
      'Mara. One last job, then you are out. Pick up the package at the Marina.',
      'No questions, no detours. The Docks, before the tide turns.',
    ]);
  } else if (def.id === 'm2') {
    state.mission.waypoints = [
      { x: 320, y: 1500, label: 'Reach the Palm Court safehouse', radius: 56 },
    ];
    addWanted(state, 3, 'The drop was watched — SMPD is on you');
    setDialogue(state, 'Rosa Delgado', [
      'They were watching the drop! Lose them and get to the safehouse.',
      'Do not stop. Do not let them box you in on the Strip.',
    ]);
  } else if (def.id === 'm3') {
    const drops = [
      { x: 1440, y: 780, label: 'Cash drop 1 — Casino Mile' },
      { x: 1760, y: 780, label: 'Cash drop 2 — Casino Mile' },
      { x: 1600, y: 1100, label: 'Cash drop 3 — Casino Mile' },
      { x: 2080, y: 300, label: 'Bring the money to Marco — Hills', final: true },
    ];
    state.mission.waypoints = drops.map((d) => ({ ...d, radius: 48 }));
    for (let i = 0; i < 3; i += 1) {
      const v = spawnViper(state, drops[i].x + 60, drops[i].y + 30);
      state.mission.vipers.push(v);
    }
    setDialogue(state, 'Marco Vane', [
      'The Vipers took the Strip while you were gone, Mara.',
      'Three cash drops on Casino Mile. Collect them all — and deal with whoever guards them.',
    ]);
  }
  addMessage(state, 'Mission started: ' + def.title, 'good');
  return true;
}

export function currentWaypoint(state) {
  if (!state.mission || !state.mission.waypoints) return null;
  return state.mission.waypoints[state.mission.step] || null;
}

export function updateMission(state, dt) {
  if (state.missionState !== 'active' || !state.mission) return;
  const wp = currentWaypoint(state);
  if (!wp) return;
  const d = Math.hypot(state.player.x - wp.x, state.player.y - wp.y);
  if (d < wp.radius) {
    state.mission.step += 1;
    cashSound();
    if (state.mission.id === 'm1' && state.mission.step === 1) {
      addMessage(state, 'Package secured. Now the Docks — no detours.', 'good');
    } else if (state.mission.id === 'm3' && state.mission.step <= 3) {
      state.mission.drops += 1;
      addMessage(state, 'Cash drop ' + state.mission.drops + ' of 3 collected.', 'good');
    }
    if (state.mission.step >= state.mission.waypoints.length) completeMission(state);
  }
  // M2 fails the safehouse run if the player is busted mid-chase (handled by screen).
  if (state.mission.id === 'm2') {
    state.mission.timer += dt;
  }
}

export function completeMission(state) {
  const def = missionDef(state);
  if (!def) return;
  state.money += def.pay;
  state.stats.missionsDone += 1;
  state.missionState = 'done';
  state.mission = null;
  state.respect += 20;
  missionSound();
  addMessage(state, 'Mission complete: ' + def.title + ' — +$' + def.pay, 'good');
  if (def.id === 'm2') clearPolice(state);
  if (def.id === 'm3') {
    state.screen = 'won';
    addMessage(state, 'Solmar is yours. The Strip pays tribute now.', 'good');
    return;
  }
  state.missionIndex += 1;
  state.missionState = 'idle';
  const next = missionDef(state);
  if (next) addMessage(state, 'Next mission: ' + next.title + ' — find ' + next.giver + ' and press F.', 'info');
}

// ---- Side activities ----

export function startTaxi(state) {
  if (state.taxi) return false;
  const p = state.player;
  const destX = 320 + state.rand() * 1920, destY = 320 + state.rand() * 1280;
  // The passenger waits on the kerb, never inside a building.
  const kerb = nearestRoadPoint(p.x + 40, p.y + 30);
  const fare = spawnTaxiPassenger(state, kerb.x + 44, kerb.y + 10, destX, destY);
  state.taxi = { fare, destX, destY, pickedUp: false, fareAmount: 0 };
  addMessage(state, 'Taxi fare: pick up the passenger waving at the kerb.', 'info');
  return true;
}

export function updateTaxi(state, dt) {
  if (!state.taxi) return;
  const t = state.taxi;
  const p = state.player;
  if (!t.pickedUp) {
    if (Math.hypot(p.x - t.fare.x, p.y - t.fare.y) < 60 && !p.onFoot) {
      t.pickedUp = true;
      addMessage(state, 'Passenger aboard. Drive to the marker — the meter is running.', 'good');
    }
    return;
  }
  const d = Math.hypot(p.x - t.destX, p.y - t.destY);
  if (d < 56) {
    const pay = Math.round(TAXI_FARE.base + 120 * TAXI_FARE.perMetre * 10);
    state.money += pay; state.stats.fares += 1;
    cashSound();
    addMessage(state, 'Fare complete — +$' + pay + ' (tip included).', 'good');
    const idx = state.peds.indexOf(t.fare);
    if (idx >= 0) state.peds.splice(idx, 1);
    state.taxi = null;
  }
}

export function startRace(state) {
  if (state.race) return false;
  const p = state.player;
  state.race = {
    checkpoints: [
      { x: 480, y: 160 }, { x: 1440, y: 160 }, { x: 2080, y: 800 },
      { x: 1440, y: 1440 }, { x: 480, y: 1440 }, { x: p.x, y: p.y },
    ],
    step: 0, timer: 0,
  };
  addMessage(state, 'Street race! Hit every checkpoint — fastest route wins.', 'info');
  return true;
}

export function updateRace(state, dt) {
  if (!state.race) return;
  const r = state.race;
  r.timer += dt;
  const cp = r.checkpoints[r.step];
  if (!cp) return;
  if (Math.hypot(state.player.x - cp.x, state.player.y - cp.y) < 60) {
    r.step += 1;
    cashSound();
    if (r.step >= r.checkpoints.length) {
      const bonus = Math.max(100, RACE_REWARD - Math.floor(r.timer) * 4);
      state.money += bonus; state.stats.racesWon += 1;
      addMessage(state, 'Race won in ' + r.timer.toFixed(1) + 's — +$' + bonus, 'good');
      state.race = null;
    }
  }
}

// Sunset collectibles: 8 golden suns hidden around the bay.
export function sunsetSpots(state) {
  const rand = (n) => ((n * 2654435761) >>> 0) / 4294967296;
  const spots = [];
  for (let i = 0; i < SUNSET_COUNT; i += 1) {
    spots.push({ x: 300 + rand(i + 3) * 1900, y: 300 + rand(i + 11) * 1300, found: i < state.sunsetsFound });
  }
  return spots;
}

export function checkSunsets(state) {
  for (const s of sunsetSpots(state)) {
    if (s.found) continue;
    if (Math.hypot(state.player.x - s.x, state.player.y - s.y) < 40) {
      state.sunsetsFound += 1;
      state.money += 150;
      addMessage(state, 'Sunset ' + state.sunsetsFound + '/' + SUNSET_COUNT + ' captured — +$150.', 'good');
      return;
    }
  }
}

// The dealership on Casino Mile: buy a better car with your wallet.
export function buyCar(state, modelId) {
  const model = CAR_MODELS.find((m) => m.id === modelId);
  if (!model) return false;
  if (state.ownedCars.includes(modelId)) { state.selectedCar = modelId; return true; }
  if (state.money < model.price) { addMessage(state, 'Not enough cash for the ' + model.name + '.', 'bad'); return false; }
  state.money -= model.price;
  state.ownedCars.push(modelId);
  state.selectedCar = modelId;
  addMessage(state, 'You bought the ' + model.name + ' — it is parked at the dealership.', 'good');
  return true;
}
