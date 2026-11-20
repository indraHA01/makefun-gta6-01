// SOLMAR — every tuning number, colour and name in one place.
// The world is a fixed 2560x1920 coastal city; the renderer scales a
// 1280x720 camera view to the window, so no rule depends on screen size.
export const WORLD = { width: 2560, height: 1920 };
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar.save.v1';

// Districts of Solmar Bay, west to east, north to south.
export const DISTRICTS = [
  { name: 'Marina', x: 0, y: 0, w: 640, h: 640, tint: '#2e6f8e' },
  { name: 'Old Town', x: 640, y: 0, w: 640, h: 640, tint: '#8e6f2e' },
  { name: 'Neon Strip', x: 1280, y: 0, w: 640, h: 640, tint: '#7a2e8e' },
  { name: 'Hills', x: 1920, y: 0, w: 640, h: 640, tint: '#2e8e4f' },
  { name: 'Market Row', x: 0, y: 640, w: 640, h: 640, tint: '#8e4f2e' },
  { name: 'Downtown', x: 640, y: 640, w: 640, h: 640, tint: '#3a4a6b' },
  { name: 'Casino Mile', x: 1280, y: 640, w: 640, h: 640, tint: '#8e2e5f' },
  { name: 'The Docks', x: 1920, y: 640, w: 640, h: 640, tint: '#4f5a6b' },
  { name: 'Palm Court', x: 0, y: 1280, w: 640, h: 640, tint: '#2e8e7a' },
  { name: 'South Beach', x: 640, y: 1280, w: 1280, h: 640, tint: '#c98a3a' },
  { name: 'Harbor East', x: 1920, y: 1280, w: 640, h: 640, tint: '#2e5f8e' },
];

export const PLAYER = {
  radius: 13, walkSpeed: 210, runSpeed: 330, health: 100,
  punchDamage: 12, punchRange: 34, punchCooldown: 0.35,
};

export const CAR_MODELS = [
  { id: 'pinto', name: 'Corto Pinto', price: 0, topSpeed: 340, accel: 260, grip: 3.4, color: '#c94f3d', seats: 2 },
  { id: 'sedan', name: 'Marbella Sedan', price: 800, topSpeed: 400, accel: 300, grip: 3.8, color: '#3d6fc9', seats: 4 },
  { id: 'taxi', name: 'Solmar Cab', price: 1200, topSpeed: 380, accel: 280, grip: 3.6, color: '#e8b73a', seats: 4 },
  { id: 'muscle', name: 'Bravado GT', price: 3500, topSpeed: 520, accel: 420, grip: 4.4, color: '#8e2e5f', seats: 2 },
  { id: 'sport', name: 'Veloce S', price: 9000, topSpeed: 640, accel: 540, grip: 5.2, color: '#e8e8e8', seats: 2 },
  { id: 'police', name: 'SMPD Interceptor', price: 0, topSpeed: 560, accel: 460, grip: 4.8, color: '#1c2a44', seats: 4 },
];

export const WANTED = {
  decayDelay: 14, decayRate: 0.25,
  starsFor: { steal: 1, hitPed: 1, hitCop: 2, shoot: 2, kill: 2, speed: 0 },
};

export const MISSIONS = [
  { id: 'm1', title: 'One Last Job', giver: 'Rosa Delgado', pay: 600,
    brief: 'Rosa needs a courier who asks no questions. Pick up the package at the Marina and deliver it to the Docks before the tide turns.' },
  { id: 'm2', title: 'The Getaway', giver: 'Rosa Delgado', pay: 1200,
    brief: 'The drop was watched. SMPD is on you — lose the tail and reach the Palm Court safehouse with the car in one piece.' },
  { id: 'm3', title: 'Turf Payoff', giver: 'Marco Vane', pay: 2500,
    brief: 'The Vipers want the Strip back. Collect the three cash drops on Casino Mile, deal with whoever guards them, and bring the money to Marco.' },
];

export const TAXI_FARE = { base: 60, perMetre: 0.12 };
export const RACE_REWARD = 400;
export const SUNSET_COUNT = 8;

export const PALETTE = {
  skyDay: ['#7ec8f2', '#bfe8ff'], skyDusk: ['#ff9a5c', '#7a3a8e'],
  skyNight: ['#0d1530', '#1c2a4a'], road: '#33363d', roadLine: '#e8d44f',
  sidewalk: '#8a8d94', grass: '#4f8e4f', sand: '#e8d29a', water: '#1f6f9e',
  building: '#6b7280', windowLit: '#ffd76a', windowDark: '#2a3242',
  player: '#ff5c5c', ped: '#e8e8e8', cop: '#2a4fd0', text: '#f2f4f8',
  muted: '#aab2c0', panel: 'rgba(12,16,26,0.82)', accent: '#ffcf3d',
  health: '#3ddc6a', wanted: '#ff3d3d', money: '#3ddc6a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_BOLD = '700 16px system-ui, sans-serif';

// One full day lasts 8 real minutes; the sun drives sky colour and neon.
export const DAY_LENGTH = 480;
export const START_TIME = 0.32; // late morning, sun high over the bay

// Keys, kept in one table so the help screen and the input module agree.
export const KEYS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  enterCar: 'KeyE', interact: 'KeyF', punch: 'Space',
  run: 'ShiftLeft', save: 'KeyQ', pause: 'Escape', mute: 'KeyM',
  horn: 'KeyH', camera: 'KeyC',
};
export function keyIs(list, code) { return list.includes(code); }
