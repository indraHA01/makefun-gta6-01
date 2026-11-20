// SOLMAR city: the road grid, buildings, palms, beach and water.
// Generated once from the seed; every module reads the same layout.
import { WORLD, DISTRICTS } from './config.js';
import { mulberry32 } from './state.js';

export const ROAD_SPACING = 320;
export const ROAD_WIDTH = 56;

// Roads run on a 320px grid; intersections are the city's skeleton.
export function roadLines() {
  const vertical = [], horizontal = [];
  for (let x = 160; x < WORLD.width; x += ROAD_SPACING) vertical.push(x);
  for (let y = 160; y < WORLD.height; y += ROAD_SPACING) horizontal.push(y);
  return { vertical, horizontal };
}

export function onRoad(x, y) {
  const { vertical, horizontal } = roadLines();
  for (const rx of vertical) if (Math.abs(x - rx) < ROAD_WIDTH / 2 + 6) return true;
  for (const ry of horizontal) if (Math.abs(y - ry) < ROAD_WIDTH / 2 + 6) return true;
  return false;
}

export function nearestRoadPoint(x, y) {
  const { vertical, horizontal } = roadLines();
  let best = null, bestD = Infinity;
  for (const rx of vertical) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y }; }
  }
  for (const ry of horizontal) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry }; }
  }
  return best;
}

export function buildCity(seed) {
  const rand = mulberry32(seed ^ 0x5eed);
  const buildings = [];
  const palms = [];
  const windows = [];
  const blockColors = ['#5a6270', '#6b5a4a', '#4a5a6b', '#7a6a8a', '#5a6b4a', '#8a7a5a'];
  // One building per city block, inset from the roads, with a seeded height.
  for (let bx = 0; bx < 7; bx += 1) {
    for (let by = 0; by < 5; by += 1) {
      const x0 = 200 + bx * ROAD_SPACING, y0 = 200 + by * ROAD_SPACING;
      const w = 140 + rand() * 50, h = 120 + rand() * 50;
      const x = x0 + (220 - w) / 2, y = y0 + (220 - h) / 2;
      // The beach strip along the south edge stays open sand, no buildings.
      if (y0 > 1500 && bx >= 2 && bx <= 5) continue;
      const b = {
        x, y, w, h, hgt: 18 + rand() * 46,
        color: blockColors[Math.floor(rand() * blockColors.length)],
        neon: by === 0 && bx >= 4, // Neon Strip rooftops glow at dusk
        name: districtNameAt(x + w / 2, y + h / 2),
      };
      buildings.push(b);
      const cols = Math.max(2, Math.floor(w / 34));
      const rows = Math.max(2, Math.floor(h / 30));
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          windows.push({ x: x + 10 + c * 32, y: y + 10 + r * 28, lit: rand() < 0.45 });
        }
      }
    }
  }
  // Palms line the beach and the Marina promenade.
  for (let i = 0; i < 90; i += 1) {
    const beach = rand() < 0.6;
    palms.push({
      x: beach ? 640 + rand() * 1280 : 120 + rand() * 400,
      y: beach ? 1760 + rand() * 120 : 120 + rand() * 1400,
      lean: (rand() - 0.5) * 0.4, phase: rand() * Math.PI * 2,
    });
  }
  return { buildings, palms, windows, seed };
}

export function districtNameAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Solmar Bay';
}

// The beach is the strip of sand along the south edge, above the water.
export function isBeach(x, y) { return y > 1760 && y < 1920 && x > 560 && x < 2000; }
export function isWater(x, y) { return y >= 1880; }

// Axis-aligned building test used by movement, traffic and bullets.
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function clampToWorld(x, y, r) {
  return {
    x: Math.max(r, Math.min(WORLD.width - r, x)),
    y: Math.max(r, Math.min(WORLD.height - r, y)),
  };
}
