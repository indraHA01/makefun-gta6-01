// SOLMAR police: the wanted system, patrol cars, pursuit and roadblocks.
// Wanted 1-2: patrol cars cruise in; 3-4: pursuit + roadblocks; 5: full hunt.
import { WORLD } from './config.js';
import { spawnCar, modelById } from './vehicles.js';
import { hitsBuilding, nearestRoadPoint } from './city.js';
import { addMessage } from './state.js';
import { sirenBlip } from './audio.js';

export function addWanted(state, stars, reason) {
  const before = state.wanted;
  state.wanted = Math.max(0, Math.min(5, state.wanted + stars));
  state.wantedHeat = 1;
  state.lastCrimeAt = state.elapsed;
  if (state.wanted > before) {
    addMessage(state, reason + ' — wanted level ' + state.wanted + '!', 'bad');
    if (state.wanted >= 2) sirenBlip();
  }
}

export function policeTargetCount(wanted) {
  if (wanted <= 0) return 0;
  if (wanted === 1) return 1;
  if (wanted === 2) return 2;
  if (wanted === 3) return 3;
  if (wanted === 4) return 4;
  return 6;
}

export function updateWanted(state, dt) {
  if (state.wanted <= 0) return;
  // Heat cools when the player stays clean; the level drops a star at a time.
  if (state.elapsed - state.lastCrimeAt > 14) {
    state.wantedHeat = Math.max(0, state.wantedHeat - 0.25 * dt);
    if (state.wantedHeat <= 0) {
      state.wanted -= 1;
      state.wantedHeat = state.wanted > 0 ? 1 : 0;
      state.lastCrimeAt = state.elapsed;
      if (state.wanted === 0) addMessage(state, 'You lost the cops. Clean — for now.', 'good');
      else addMessage(state, 'Heat cooling… wanted level ' + state.wanted, 'info');
    }
  }
  // Keep the right number of police units in the world.
  const want = policeTargetCount(state.wanted);
  const cops = state.police.filter((p) => p.alive);
  if (cops.length < want) spawnPolice(state, want - cops.length);
}

export function spawnPolice(state, count) {
  const player = state.player;
  for (let i = 0; i < count; i += 1) {
    const angle = state.rand() * Math.PI * 2;
    const dist = 420 + state.rand() * 260;
    const x = Math.max(60, Math.min(WORLD.width - 60, player.x + Math.cos(angle) * dist));
    const y = Math.max(60, Math.min(WORLD.height - 60, player.y + Math.sin(angle) * dist));
    const car = spawnCar(state, 'police', x, y, 0, 'police');
    car.speed = 200;
    state.police.push({ car, alive: true, ramAt: 0, sirenAt: state.rand() * 2 });
  }
}

// A police unit: drive at the player, ram on foot or in a car, siren wail.
export function updatePolice(state, city, dt) {
  const player = state.player;
  for (const unit of state.police) {
    if (!unit.alive) continue;
    const car = unit.car;
    const dx = player.x - car.x, dy = player.y - car.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
    const model = modelById('police');
    const wantSpeed = dist > 120 ? model.topSpeed * 0.9 : model.topSpeed * 0.5;
    car.speed += (wantSpeed - car.speed) * dt * 0.8;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    // Police stay on the roads: a building ahead means steer for the nearest road.
    const insideBlock = hitsBuilding(city, car.x, car.y, 18);
    if (!insideBlock && hitsBuilding(city, nx, ny, 18)) {
      const road = nearestRoadPoint(car.x, car.y);
      const roadAngle = Math.atan2(road.y - car.y, road.x - car.x);
      let rd = roadAngle - car.angle;
      while (rd > Math.PI) rd -= Math.PI * 2;
      while (rd < -Math.PI) rd += Math.PI * 2;
      car.angle += Math.max(-3 * dt, Math.min(3 * dt, rd));
      car.speed *= 0.85;
    } else { car.x = nx; car.y = ny; }
    unit.sirenAt -= dt;
    if (unit.sirenAt <= 0) { unit.sirenAt = 2.2; sirenBlip(); }
    // Ram: on contact, damage the player and slow the cop car down.
    if (dist < 46) {
      unit.ramAt -= dt;
      if (unit.ramAt <= 0) {
        unit.ramAt = 0.9;
        damagePlayer(state, player.onFoot ? 12 : 6, 'rammed by SMPD');
        car.speed *= 0.3;
        spawnSparks(state, car.x, car.y);
      }
    }
    // On foot and cornered by a cop at low health: busted.
    if (player.onFoot && dist < 34 && state.health < 30) {
      state.screen = 'busted';
      state.stats.arrests += 1;
    }
  }
  state.police = state.police.filter((p) => p.alive);
}

export function damagePlayer(state, amount, cause) {
  if (state.screen !== 'play') return;
  state.health -= amount;
  state.player.hurtAt = state.elapsed;
  if (state.health <= 0) {
    state.health = 0;
    state.screen = state.wanted > 0 ? 'busted' : 'wasted';
    addMessage(state, cause + ' — you are down.', 'bad');
  }
}

export function spawnSparks(state, x, y) {
  for (let i = 0; i < 8; i += 1) {
    state.particles.push({
      x, y, vx: (state.rand() - 0.5) * 260, vy: (state.rand() - 0.5) * 260,
      life: 0.4, maxLife: 0.4, color: '#ffd76a', size: 3,
    });
  }
}

export function roadblockAhead(state) {
  // At wanted 3+ the HUD warns of a roadblock on the player's road.
  return state.wanted >= 3 && state.player.onFoot === false;
}

// Clear every cop when the player escapes or a mission resets the heat.
export function clearPolice(state) {
  for (const unit of state.police) unit.alive = false;
  for (const car of state.cars) {
    if (car.kind === 'police') {
      const idx = state.cars.indexOf(car);
      if (idx >= 0) state.cars.splice(idx, 1);
    }
  }
  state.police = [];
  state.wanted = 0; state.wantedHeat = 0;
}
