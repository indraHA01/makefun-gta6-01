// SOLMAR pedestrians: walkers on the sidewalks, taxi passengers and
// the rival Vipers who guard the M3 cash drops. All share one walker.
import { WORLD } from './config.js';
import { roadLines, hitsBuilding, clampToWorld } from './city.js';
import { mulberry32 } from './state.js';

const SHIRTS = ['#e8e8e8', '#f2a541', '#5ab8e8', '#e85ab8', '#8ae85a', '#c95a5a', '#9a8ae8'];

export function spawnPeds(state, count) {
  const rand = mulberry32(state.seed ^ 0x11ed);
  const { vertical, horizontal } = roadLines();
  for (let i = 0; i < count; i += 1) {
    const onVertical = rand() < 0.5;
    const road = onVertical
      ? vertical[Math.floor(rand() * vertical.length)]
      : horizontal[Math.floor(rand() * horizontal.length)];
    const along = 200 + rand() * 1500;
    state.peds.push({
      id: i + 1, kind: 'walker',
      x: onVertical ? road + 44 : along, y: onVertical ? along : road + 44,
      angle: rand() * Math.PI * 2, speed: 26 + rand() * 22,
      shirt: SHIRTS[Math.floor(rand() * SHIRTS.length)],
      panic: 0, targetX: 0, targetY: 0, walking: true,
      health: 30, phase: rand() * Math.PI * 2,
    });
  }
}

export function spawnViper(state, x, y) {
  const viper = {
    id: 1000 + state.peds.length, kind: 'viper',
    x, y, angle: 0, speed: 70, shirt: '#222222',
    panic: 0, targetX: x, targetY: y, walking: true,
    health: 60, phase: 0, shootAt: 0, guardX: x, guardY: y,
  };
  state.peds.push(viper);
  return viper;
}

export function spawnTaxiPassenger(state, x, y, destX, destY) {
  const p = {
    id: 2000 + state.peds.length, kind: 'fare',
    x, y, angle: 0, speed: 40, shirt: '#ffd76a',
    panic: 0, targetX: destX, targetY: destY, walking: true,
    health: 30, phase: 0, fareDest: { x: destX, y: destY },
  };
  state.peds.push(p);
  return p;
}

export function updatePeds(state, city, dt) {
  const player = state.player;
  for (const ped of state.peds) {
    if (ped.health <= 0) continue;
    // Panic: run away from the player when a crime happens nearby.
    if (ped.panic > 0) {
      ped.panic -= dt;
      const away = Math.atan2(ped.y - player.y, ped.x - player.x);
      ped.x += Math.cos(away) * 120 * dt;
      ped.y += Math.sin(away) * 120 * dt;
      ped.angle = away;
      continue;
    }
    if (ped.kind === 'viper') {
      // Vipers hold their post until the player comes close, then chase and shoot.
      const d = Math.hypot(player.x - ped.x, player.y - ped.y);
      if (d < 320) {
        ped.angle = Math.atan2(player.y - ped.y, player.x - ped.x);
        if (d > 90) { ped.x += Math.cos(ped.angle) * ped.speed * dt; ped.y += Math.sin(ped.angle) * ped.speed * dt; }
        ped.shootAt -= dt;
        if (ped.shootAt <= 0 && d < 300) {
          ped.shootAt = 1.4;
          state.bullets.push({ x: ped.x, y: ped.y, angle: ped.angle, speed: 520, from: 'viper', life: 1.2 });
        }
      }
      continue;
    }
    if (ped.kind === 'fare') continue; // fares wait on the kerb for a taxi
    // Walkers stroll along the sidewalk; at an intersection, pick a new heading.
    const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    if (hitsBuilding(city, nx, ny, 10) || nx < 40 || ny < 40 || nx > WORLD.width - 40 || ny > WORLD.height - 40) {
      ped.angle += (state.rand() < 0.5 ? 1 : -1) * (Math.PI / 2);
    } else { ped.x = nx; ped.y = ny; }
    if (state.rand() < 0.002) ped.angle += (state.rand() - 0.5) * 1.2;
  }
  state.peds = state.peds.filter((p) => p.health > 0 || p.kind === 'fare');
}

// A walker hit by a car or a punch: knock them down, raise the alarm.
export function hurtPed(state, ped, damage, fromX, fromY) {
  ped.health -= damage;
  ped.panic = 4;
  const away = Math.atan2(ped.y - fromY, ped.x - fromX);
  ped.x += Math.cos(away) * 14; ped.y += Math.sin(away) * 14;
  return ped.health <= 0;
}

export function scareNearbyPeds(state, x, y, radius) {
  for (const ped of state.peds) {
    if (ped.kind !== 'walker') continue;
    if (Math.hypot(ped.x - x, ped.y - y) < radius) ped.panic = 3;
  }
}

export function nearestPed(state, x, y, maxDist, kind) {
  let best = null, bestD = maxDist;
  for (const ped of state.peds) {
    if (kind && ped.kind !== kind) continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < bestD) { bestD = d; best = ped; }
  }
  return best;
}
