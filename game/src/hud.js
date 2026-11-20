// SOLMAR HUD: cash, health, wanted stars, clock, mission banner, the
// minimap, dialogue boxes, menus and the lock-pick bar. All canvas-drawn.
import { VIEW, WORLD, PALETTE, FONT, MISSIONS, CAR_MODELS } from './config.js';
import { missionDef, currentWaypoint } from './missions.js';
import { districtAt } from './state.js';

export function drawHUD(ctx, state, city) {
  drawTopBar(ctx, state);
  drawMinimap(ctx, state, city);
  drawMessages(ctx, state);
  drawObjective(ctx, state);
  if (state.dialogue) drawDialogue(ctx, state);
  if (state.lockpick) drawLockpick(ctx, state.lockpick);
  if (state.showHelp) drawHelp(ctx);
  if (state.showShop) drawShop(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx);
  if (state.screen === 'busted') drawEndScreen(ctx, 'BUSTED', 'SMPD caught up with you. The story continues — try again.');
  if (state.screen === 'wasted') drawEndScreen(ctx, 'WASTED', 'Mara is down. Solmar keeps moving without you — try again.');
  if (state.screen === 'won') drawEndScreen(ctx, 'SOLMAR IS YOURS', 'All three missions done. The Strip pays tribute. Free roam continues.');
}

function drawTopBar(ctx, state) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, VIEW.width, 44);
  ctx.fillStyle = PALETTE.money;
  ctx.font = 'bold 20px ' + FONT;
  ctx.fillText('$' + state.money.toLocaleString(), 16, 30);
  // Health bar.
  ctx.fillStyle = '#222';
  ctx.fillRect(180, 14, 140, 16);
  ctx.fillStyle = state.health > 30 ? PALETTE.health : '#ff3d3d';
  ctx.fillRect(180, 14, 140 * (state.health / 100), 16);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px ' + FONT;
  ctx.fillText('HP ' + Math.ceil(state.health), 185, 27);
  // Wanted stars.
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < state.wanted ? PALETTE.wanted : 'rgba(255,255,255,0.25)';
    ctx.font = '22px ' + FONT;
    ctx.fillText('★', 340 + i * 26, 31);
  }
  // Clock + district.
  const hours = Math.floor(state.time * 24);
  const mins = Math.floor((state.time * 24 - hours) * 60);
  ctx.fillStyle = PALETTE.text; ctx.font = 'bold 18px ' + FONT;
  const clock = String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
  ctx.fillText(clock, VIEW.width - 260, 30);
  ctx.font = '14px ' + FONT;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(districtAt(state.player.x, state.player.y), VIEW.width - 200, 30);
  // Speed when driving — bottom right, clear of the minimap.
  if (!state.player.onFoot && state.currentCar) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(VIEW.width - 190, VIEW.height - 58, 176, 44);
    ctx.fillStyle = PALETTE.muted; ctx.font = '13px ' + FONT;
    ctx.fillText(state.currentCar.name, VIEW.width - 178, VIEW.height - 40);
    ctx.fillStyle = PALETTE.text; ctx.font = 'bold 22px ' + FONT;
    const kmh = Math.round(Math.abs(state.currentCar.speed) * 0.36);
    ctx.fillText(kmh + ' km/h', VIEW.width - 178, VIEW.height - 18);
  }
}

export function drawMinimap(ctx, state, city) {
  const size = 190, x0 = VIEW.width - size - 14, y0 = 58;
  const scale = size / WORLD.width;
  ctx.fillStyle = 'rgba(10,14,24,0.85)';
  ctx.fillRect(x0 - 4, y0 - 4, size + 8, (size * WORLD.height) / WORLD.width + 8);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, size, (size * WORLD.height) / WORLD.width); ctx.clip();
  ctx.fillStyle = '#274b2e';
  ctx.fillRect(x0, y0, size, (size * WORLD.height) / WORLD.width);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(x0, y0 + size * 0.92, size, size * 0.08);
  ctx.fillStyle = '#1f6f9e';
  ctx.fillRect(x0, y0 + size * 0.97, size, size * 0.03);
  ctx.fillStyle = '#3a3f47';
  for (let rx = 160; rx < WORLD.width; rx += 320) ctx.fillRect(x0 + rx * scale - 1, y0, 2, size * 0.75);
  for (let ry = 160; ry < WORLD.height; ry += 320) ctx.fillRect(x0, y0 + ry * scale - 1, size, 2);
  // Blips: mission gold, police red/blue, taxi green, player white.
  const dot = (x, y, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x0 + x * scale, y0 + y * scale, r || 3, 0, Math.PI * 2); ctx.fill();
  };
  if (state.missionState === 'active') {
    const wp = currentWaypoint(state);
    if (wp) dot(wp.x, wp.y, '#ffcf3d', 5);
  }
  for (const unit of state.police) if (unit.alive) dot(unit.car.x, unit.car.y, '#4f7dff', 3);
  for (const car of state.cars) if (car.kind === 'parked') dot(car.x, car.y, '#8a8d94', 2);
  if (state.taxi) dot(state.taxi.destX, state.taxi.destY, '#3ddc6a', 4);
  dot(state.player.x, state.player.y, '#ffffff', 4);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x0 + state.player.x * scale, y0 + state.player.y * scale, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = PALETTE.muted; ctx.font = '11px ' + FONT;
  ctx.fillText('SOLMAR BAY', x0, y0 + (size * WORLD.height) / WORLD.width + 22);
}

function drawMessages(ctx, state) {
  ctx.font = '14px ' + FONT;
  let y = VIEW.height - 24 - (state.messages.length - 1) * 22;
  for (const m of state.messages) {
    if (state.elapsed - m.at > 9) continue;
    ctx.fillStyle = m.kind === 'bad' ? '#ff8a8a' : m.kind === 'good' ? '#8ae8a0' : '#e8ecf2';
    ctx.fillText(m.text, 16, y);
    y += 22;
  }
}

function drawObjective(ctx, state) {
  const def = missionDef(state);
  let line = null;
  if (state.missionState === 'active') {
    const wp = currentWaypoint(state);
    line = 'MISSION: ' + def.title + (wp ? ' — ' + wp.label : '');
  } else if (def) {
    line = 'NEXT: ' + def.title + ' — find ' + def.giver + ' (press F nearby)';
  } else {
    line = 'Free roam — taxi fares, races and sunsets pay. Press H for help.';
  }
  if (state.taxi) line = 'TAXI: ' + (state.taxi.pickedUp ? 'drive to the green marker' : 'pick up your passenger');
  if (state.race) line = 'RACE: checkpoint ' + (state.race.step + 1) + ' of ' + state.race.checkpoints.length;
  ctx.fillStyle = 'rgba(12,16,26,0.7)';
  const w = ctx.measureText(line).width + 24;
  ctx.fillRect(16, 54, w, 28);
  ctx.fillStyle = PALETTE.accent; ctx.font = 'bold 14px ' + FONT;
  ctx.fillText(line, 28, 73);
}

function drawDialogue(ctx, state) {
  const d = state.dialogue;
  const line = d.lines[d.index];
  ctx.fillStyle = 'rgba(12,16,26,0.9)';
  ctx.fillRect(180, VIEW.height - 150, VIEW.width - 360, 96);
  ctx.strokeStyle = PALETTE.accent; ctx.lineWidth = 2;
  ctx.strokeRect(180, VIEW.height - 150, VIEW.width - 360, 96);
  ctx.fillStyle = PALETTE.accent; ctx.font = 'bold 15px ' + FONT;
  ctx.fillText(d.speaker, 200, VIEW.height - 122);
  ctx.fillStyle = PALETTE.text; ctx.font = '15px ' + FONT;
  wrapText(ctx, line, 200, VIEW.height - 98, VIEW.width - 400, 20);
  ctx.fillStyle = PALETTE.muted; ctx.font = '12px ' + FONT;
  ctx.fillText('Enter / click to continue…', 200, VIEW.height - 66);
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW) { ctx.fillText(line, x, yy); line = ''; yy += lh; }
    line += w + ' ';
  }
  ctx.fillText(line, x, yy);
}

function drawLockpick(ctx, lockpick) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(VIEW.width / 2 - 260, 240, 520, 130);
  ctx.fillStyle = PALETTE.text; ctx.font = 'bold 18px ' + FONT;
  ctx.fillText('LOCK-PICK — press SPACE in the green zone', VIEW.width / 2 - 240, 275);
  const barX = VIEW.width / 2 - 220, barW = 440;
  ctx.fillStyle = '#222'; ctx.fillRect(barX, 300, barW, 26);
  ctx.fillStyle = '#3ddc6a';
  ctx.fillRect(barX + lockpick.zone * barW, 300, lockpick.zoneSize * barW, 26);
  ctx.fillStyle = '#ffcf3d';
  ctx.fillRect(barX + lockpick.pos * barW - 3, 296, 6, 34);
  ctx.fillStyle = PALETTE.muted; ctx.font = '13px ' + FONT;
  ctx.fillText('Tries left: ' + (3 - lockpick.tries) + ' — three misses trips the alarm', barX, 350);
}

function drawHelp(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const lines = [
    'SOLMAR — HOW TO PLAY',
    '',
    'WASD / arrows — walk or drive    Shift — run',
    'E — enter / steal a car (lock-pick)    F — interact / start mission',
    'Space — punch / stop the lock-pick needle    Mouse click — shoot',
    'Q — save    M — mute    H — this help    Esc — pause',
    '',
    'Steal cars, take taxi fares, win street races, find 8 sunsets.',
    'Crimes raise your wanted level — SMPD patrols, pursues and roadblocks.',
    'Complete all 3 missions to own the Strip. Your progress saves with Q.',
  ];
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(VIEW.width / 2 - 340, 130, 680, 380);
  ctx.font = '16px ' + FONT;
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? PALETTE.accent : PALETTE.text;
    ctx.font = i === 0 ? 'bold 20px ' + FONT : '16px ' + FONT;
    ctx.fillText(line, VIEW.width / 2 - 320, 170 + i * 30);
  });
}

function drawShop(ctx, state) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(VIEW.width / 2 - 320, 120, 640, 420);
  ctx.fillStyle = PALETTE.accent; ctx.font = 'bold 20px ' + FONT;
  ctx.fillText('SOLMAR MOTORS — press 1-5 to buy, Esc to leave', VIEW.width / 2 - 300, 155);
  ctx.font = '16px ' + FONT;
  CAR_MODELS.filter((m) => m.price > 0).forEach((m, i) => {
    const owned = state.ownedCars.includes(m.id);
    const y = 200 + i * 62;
    ctx.fillStyle = owned ? '#3ddc6a' : PALETTE.text;
    ctx.fillText((i + 1) + '. ' + m.name + ' — $' + m.price.toLocaleString() + (owned ? ' (OWNED)' : ''), VIEW.width / 2 - 300, y);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px ' + FONT;
    ctx.fillText('Top speed ' + Math.round(m.topSpeed * 0.36) + ' km/h', VIEW.width / 2 - 300, y + 20);
    ctx.font = '16px ' + FONT;
  });
  ctx.fillStyle = PALETTE.muted; ctx.font = '14px ' + FONT;
  ctx.fillText('Your cash: $' + state.money.toLocaleString(), VIEW.width / 2 - 300, 500);
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(8,12,28,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#ffcf3d';
  ctx.font = 'bold 84px ' + FONT;
  ctx.fillText('SOLMAR', VIEW.width / 2 - 190, 220);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px ' + FONT;
  ctx.fillText('A sun-soaked open-world crime story', VIEW.width / 2 - 230, 262);
  ctx.font = '17px ' + FONT;
  ctx.fillStyle = '#e8ecf2';
  const lines = [
    'Mara Voss came home to Solmar Bay for one last job.',
    'Steal cars, outrun SMPD, run fares and races — and take the Strip back.',
    '',
    'Press ENTER to start — C to continue your save — H for controls',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2 - 260, 320 + i * 30));
  ctx.fillStyle = PALETTE.muted; ctx.font = '13px ' + FONT;
  ctx.fillText('An original game. No Rockstar names, characters, maps or assets.', VIEW.width / 2 - 210, 680);
  ctx.fillText('Missions: ' + MISSIONS.length + ' story jobs · Taxi fares · Street races · 8 sunsets · 5 wanted stars', VIEW.width / 2 - 260, 620);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 44px ' + FONT;
  ctx.fillText('PAUSED', VIEW.width / 2 - 110, VIEW.height / 2);
  ctx.font = '16px ' + FONT;
  ctx.fillText('Esc to resume — Q to save — H for controls', VIEW.width / 2 - 160, VIEW.height / 2 + 40);
}

function drawEndScreen(ctx, title, sub) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#ff3d3d'; ctx.font = 'bold 64px ' + FONT;
  ctx.fillText(title, VIEW.width / 2 - ctx.measureText(title).width / 2, 300);
  ctx.fillStyle = '#fff'; ctx.font = '18px ' + FONT;
  ctx.fillText(sub, VIEW.width / 2 - ctx.measureText(sub).width / 2, 350);
  ctx.fillStyle = PALETTE.muted; ctx.font = '15px ' + FONT;
  ctx.fillText('Press ENTER to keep playing — your last save is kept', VIEW.width / 2 - 210, 400);
}
