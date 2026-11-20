// SOLMAR combat: on-foot punches, drive-by pistol shots, bullets and
// the lock-pick minigame for stealing a car. All numbers live in config.
import { PLAYER } from './config.js';
import { hitsBuilding } from './city.js';
import { nearestPed, hurtPed, scareNearbyPeds } from './pedestrians.js';
import { addWanted, damagePlayer, spawnSparks } from './police.js';
import { punchSound, shotSound, lockpickClick } from './audio.js';
import { addMessage } from './state.js';

export function tryPunch(state) {
  const p = state.player;
  if (!p.onFoot || state.elapsed - p.punchAt < PLAYER.punchCooldown) return;
  p.punchAt = state.elapsed;
  punchSound();
  const reach = PLAYER.punchRange + 14;
  const tx = p.x + Math.cos(p.angle) * reach;
  const ty = p.y + Math.sin(p.angle) * reach;
  const ped = nearestPed(state, tx, ty, 40);
  if (ped) {
    const died = hurtPed(state, ped, PLAYER.punchDamage, p.x, p.y);
    scareNearbyPeds(state, p.x, p.y, 260);
    addWanted(state, died ? 2 : 1, died ? 'You took someone down' : 'Assault in broad daylight');
    spawnSparks(state, tx, ty);
  }
}

export function tryShoot(state, targetX, targetY) {
  const p = state.player;
  if (state.elapsed - (p.shootAt || -9) < 0.28) return;
  p.shootAt = state.elapsed;
  shotSound();
  const angle = Math.atan2(targetY - p.y, targetX - p.x);
  state.bullets.push({ x: p.x, y: p.y, angle, speed: 620, from: 'player', life: 1.1 });
  addWanted(state, 1, 'Shots fired');
}

export function updateBullets(state, city, dt) {
  for (const b of state.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    if (hitsBuilding(city, b.x, b.y, 2)) b.life = 0;
    if (b.from === 'player') {
      const ped = nearestPed(state, b.x, b.y, 18);
      if (ped) {
        const died = hurtPed(state, ped, 34, state.player.x, state.player.y);
        if (died) addWanted(state, 1, 'A Viper is down');
        b.life = 0;
      }
      for (const unit of state.police) {
        if (Math.hypot(unit.car.x - b.x, unit.car.y - b.y) < 24) {
          unit.alive = false; b.life = 0;
          addWanted(state, 2, 'You shot a police car');
          spawnSparks(state, b.x, b.y);
        }
      }
    } else if (b.from === 'viper') {
      if (Math.hypot(state.player.x - b.x, state.player.y - b.y) < 16) {
        damagePlayer(state, 9, 'Shot by a Viper');
        b.life = 0;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}

// Car theft: hold E near a parked car, then stop the needle in the green.
// Three missed stops and the alarm trips — the whole street hears it.
export function createLockpick() {
  return { active: true, pos: 0, dir: 1, speed: 1.6, zone: 0.42, zoneSize: 0.22, tries: 0 };
}

export function updateLockpick(state, lockpick, dt, tryStop) {
  lockpick.pos += lockpick.dir * lockpick.speed * dt;
  if (lockpick.pos > 1) { lockpick.pos = 1; lockpick.dir = -1; }
  if (lockpick.pos < 0) { lockpick.pos = 0; lockpick.dir = 1; }
  if (!tryStop) return null;
  const inZone = lockpick.pos >= lockpick.zone && lockpick.pos <= lockpick.zone + lockpick.zoneSize;
  if (inZone) { lockpickClick(true); return 'success'; }
  lockpick.tries += 1;
  lockpickClick(false);
  lockpick.zone = 0.2 + state.rand() * 0.6;
  lockpick.speed += 0.35;
  return lockpick.tries >= 3 ? 'fail' : 'retry';
}

export function updateParticles(state, dt) {
  for (const pt of state.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.92; pt.vy *= 0.92; pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
}
