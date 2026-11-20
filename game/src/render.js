// SOLMAR renderer: draws the world from the camera, in layers — sky and
// light first, then ground, roads, buildings, cars, people, effects.
// One canvas, no images: every visual is drawn code, so it runs offline.
import { VIEW, WORLD, PALETTE, DAY_LENGTH, DISTRICTS } from './config.js';
import { roadLines, ROAD_WIDTH, isBeach, isWater } from './city.js';
import { districtAt } from './state.js';

export function skyColors(time) {
  // time 0..1 across the day: dawn, noon, dusk, night.
  if (time < 0.25) return lerpPalette(PALETTE.skyNight, PALETTE.skyDay, time / 0.25);
  if (time < 0.62) return PALETTE.skyDay;
  if (time < 0.78) return lerpPalette(PALETTE.skyDay, PALETTE.skyDusk, (time - 0.62) / 0.16);
  if (time < 0.88) return lerpPalette(PALETTE.skyDusk, PALETTE.skyNight, (time - 0.78) / 0.1);
  return PALETTE.skyNight;
}

function lerpPalette(a, b, t) {
  return [mixColor(a[0], b[0], t), mixColor(a[1], b[1], t)];
}
function mixColor(c1, c2, t) {
  const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const A = p(c1), B = p(c2);
  const m = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return '#' + m.map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function isNight(time) { return time < 0.22 || time > 0.85; }
export function isDusk(time) { return time >= 0.62 && time < 0.88; }

export function drawWorld(ctx, state, city, cam) {
  const sky = skyColors(state.time);
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, sky[0]); grad.addColorStop(1, sky[1]);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawSun(ctx, state.time);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  drawGround(ctx, state, city);
  drawRoads(ctx);
  drawBuildings(ctx, state, city);
  drawPalms(ctx, city);
  drawPickups(ctx, state);
  drawCars(ctx, state);
  drawPeds(ctx, state);
  drawPlayer(ctx, state);
  drawBullets(ctx, state);
  drawParticles(ctx, state);
  drawMissionMarkers(ctx, state);
  ctx.restore();
  if (isNight(state.time)) {
    ctx.fillStyle = 'rgba(8,12,28,0.28)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  if (isDusk(state.time)) {
    ctx.fillStyle = 'rgba(255,120,60,0.06)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

function drawSun(ctx, time) {
  // The sun arcs across the sky; at dusk it hangs low and orange over the bay.
  const angle = Math.PI * (0.08 + time * 0.84);
  const sx = VIEW.width * (0.12 + time * 0.76);
  const sy = VIEW.height * 0.42 - Math.sin(angle) * VIEW.height * 0.3;
  ctx.fillStyle = isDusk(time) ? '#ff8c3d' : '#ffe98a';
  ctx.beginPath(); ctx.arc(sx, sy, isDusk(time) ? 34 : 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,233,138,0.25)';
  ctx.beginPath(); ctx.arc(sx, sy, 52, 0, Math.PI * 2); ctx.fill();
}

function drawGround(ctx, state, city) {
  ctx.fillStyle = '#5a8e4f';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  // Beach sand and water along the south edge.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(560, 1760, 1440, 120);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, 1880, WORLD.width, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = 0; x < WORLD.width; x += 90) {
    ctx.fillRect(x + ((state.elapsed * 12) % 90), 1882, 46, 3);
  }
  // District tint blocks, faint, so the minimap and the world agree.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.tint + '22';
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }
}

function drawRoads(ctx) {
  const { vertical, horizontal } = roadLines();
  ctx.fillStyle = PALETTE.road;
  for (const x of vertical) ctx.fillRect(x - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD.height);
  for (const y of horizontal) ctx.fillRect(0, y - ROAD_WIDTH / 2, WORLD.width, ROAD_WIDTH);
  ctx.fillStyle = PALETTE.roadLine;
  for (const x of vertical) {
    for (let y = 0; y < WORLD.height; y += 64) ctx.fillRect(x - 2, y, 4, 30);
  }
  for (const y of horizontal) {
    for (let x = 0; x < WORLD.width; x += 64) ctx.fillRect(x, y - 2, 30, 4);
  }
  ctx.fillStyle = PALETTE.sidewalk;
  for (const x of vertical) {
    ctx.fillRect(x - ROAD_WIDTH / 2 - 10, 0, 10, WORLD.height);
    ctx.fillRect(x + ROAD_WIDTH / 2, 0, 10, WORLD.height);
  }
  for (const y of horizontal) {
    ctx.fillRect(0, y - ROAD_WIDTH / 2 - 10, WORLD.width, 10);
    ctx.fillRect(0, y + ROAD_WIDTH / 2, WORLD.width, 10);
  }
}

function drawBuildings(ctx, state, city) {
  const night = isNight(state.time);
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(b.x, b.y, b.w, 6);
    if (b.neon) {
      ctx.fillStyle = isDusk(state.time) || night ? '#ff3da6' : '#c22a7a';
      ctx.fillRect(b.x, b.y - 4, b.w, 5);
    }
  }
  for (const w of city.windows) {
    ctx.fillStyle = (night || isDusk(state.time)) && w.lit ? PALETTE.windowLit : PALETTE.windowDark;
    ctx.fillRect(w.x, w.y, 14, 12);
  }
}

function drawPalms(ctx, city) {
  for (const p of city.palms) {
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.lean * 20, p.y - 26); ctx.stroke();
    ctx.fillStyle = '#2e8e4f';
    for (let i = 0; i < 5; i += 1) {
      const a = p.phase + (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.ellipse(p.x + p.lean * 20 + Math.cos(a) * 12, p.y - 28 + Math.sin(a) * 8, 14, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPickups(ctx, state) {
  // Sunset collectibles shimmer gold; the mission package glows too.
  for (const s of state.sunsetSpots || []) {
    if (s.found) continue;
    const pulse = 0.6 + 0.4 * Math.sin(state.elapsed * 4 + s.x);
    ctx.fillStyle = 'rgba(255,200,60,' + pulse + ')';
    ctx.beginPath(); ctx.arc(s.x, s.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff2b0';
    ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCars(ctx, state) {
  for (const car of state.cars) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-20, -9, 46, 24);
    ctx.fillStyle = car.color;
    ctx.fillRect(-22, -11, 44, 22);
    ctx.fillStyle = '#1c2430';
    ctx.fillRect(-6, -9, 14, 18);
    ctx.fillStyle = '#bfe8ff';
    ctx.fillRect(14, -8, 5, 16);
    if (car.kind === 'police') {
      ctx.fillStyle = '#f2f4f8'; ctx.fillRect(-22, -11, 10, 22);
      const flash = Math.floor(state.elapsed * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3d3d' : '#3d6fff';
      ctx.fillRect(-2, -13, 8, 5);
      ctx.fillStyle = flash ? '#3d6fff' : '#ff3d3d';
      ctx.fillRect(8, -13, 8, 5);
    }
    if (car.kind === 'taxi' || car.model === 'taxi') {
      ctx.fillStyle = '#222'; ctx.fillRect(-4, -13, 12, 5);
      ctx.fillStyle = '#ffcf3d'; ctx.font = 'bold 7px sans-serif';
      ctx.fillText('TAXI', -3, -6);
    }
    ctx.restore();
  }
}

function drawPeds(ctx, state) {
  for (const ped of state.peds) {
    if (ped.health <= 0) continue;
    const bob = Math.sin(state.elapsed * 8 + ped.phase) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(ped.x, ped.y + 10, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.arc(ped.x, ped.y + bob, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath(); ctx.arc(ped.x, ped.y - 10 + bob, 6, 0, Math.PI * 2); ctx.fill();
    if (ped.kind === 'viper') {
      ctx.fillStyle = '#ff3d3d';
      ctx.fillRect(ped.x - 8, ped.y - 22 + bob, 16, 4);
    }
    if (ped.kind === 'fare') {
      ctx.fillStyle = '#ffcf3d';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('$', ped.x - 4, ped.y - 20 + bob);
    }
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  if (!p.onFoot) return;
  const hurt = state.elapsed - p.hurtAt < 0.25;
  const bob = Math.sin(state.elapsed * 10) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 11, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hurt ? '#ffffff' : PALETTE.player;
  ctx.beginPath(); ctx.arc(p.x, p.y + bob, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2118';
  ctx.beginPath(); ctx.arc(p.x, p.y - 12 + bob, 7, 0, Math.PI * 2); ctx.fill();
  // Facing tick so the player reads at a glance.
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle) * 12, p.y + Math.sin(p.angle) * 12);
  ctx.lineTo(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20);
  ctx.stroke();
}

function drawBullets(ctx, state) {
  ctx.fillStyle = '#ffe98a';
  for (const b of state.bullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawParticles(ctx, state) {
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawMissionMarkers(ctx, state) {
  const mark = (x, y, color, label) => {
    const pulse = 1 + 0.15 * Math.sin(state.elapsed * 5);
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x - 8, y - 52); ctx.lineTo(x + 8, y - 52); ctx.closePath(); ctx.fill();
    if (label) {
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 4;
      ctx.strokeText(label, x - ctx.measureText(label).width / 2, y - 60);
      ctx.fillText(label, x - ctx.measureText(label).width / 2, y - 60);
    }
  };
  if (state.missionState === 'active' && state.mission && state.mission.waypoints) {
    const wp = state.mission.waypoints[state.mission.step];
    if (wp) mark(wp.x, wp.y, '#ffcf3d', wp.label);
  }
  if (state.taxi && state.taxi.pickedUp) mark(state.taxi.destX, state.taxi.destY, '#3ddc6a', 'Drop-off');
  if (state.taxi && !state.taxi.pickedUp) mark(state.taxi.fare.x, state.taxi.fare.y, '#3ddc6a', 'Fare');
  if (state.race) {
    const cp = state.race.checkpoints[state.race.step];
    if (cp) mark(cp.x, cp.y, '#ff8c3d', 'Checkpoint ' + (state.race.step + 1));
  }
}
