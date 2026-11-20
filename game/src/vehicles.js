// SOLMAR vehicles: arcade car physics, traffic AI, parked cars and theft.
// A car is { model, x, y, angle, speed, color, kind, driver, route }.
import { CAR_MODELS, WORLD } from './config.js';
import { roadLines, hitsBuilding, clampToWorld, nearestRoadPoint } from './city.js';
import { mulberry32 } from './state.js';

export function modelById(id) {
  return CAR_MODELS.find((m) => m.id === id) || CAR_MODELS[0];
}

export function spawnCar(state, modelId, x, y, angle, kind) {
  const model = modelById(modelId);
  const car = {
    id: state.cars.length + 1, model: model.id, name: model.name,
    x, y, angle: angle || 0, speed: 0, color: model.color,
    kind: kind || 'traffic', driver: kind === 'traffic',
    route: null, routeIdx: 0, stuckAt: 0, honkAt: 0,
    w: 44, h: 22, parked: kind === 'parked',
  };
  state.cars.push(car);
  return car;
}

export function spawnTraffic(state, city, count) {
  const rand = mulberry32(state.seed ^ 0x7aff1c);
  const { vertical, horizontal } = roadLines();
  const palette = ['#c94f3d', '#3d6fc9', '#e8b73a', '#4fae5a', '#8e8e8e', '#5a3d8e', '#d0d0d0'];
  for (let i = 0; i < count; i += 1) {
    const onVertical = rand() < 0.5;
    const x = onVertical ? vertical[Math.floor(rand() * vertical.length)] : 200 + rand() * (WORLD.width - 400);
    const y = onVertical ? 200 + rand() * (WORLD.height - 400) : horizontal[Math.floor(rand() * horizontal.length)];
    const car = spawnCar(state, 'sedan', x, y, onVertical ? Math.PI / 2 : 0, 'traffic');
    car.color = palette[Math.floor(rand() * palette.length)];
    car.speed = 90 + rand() * 70;
    car.route = onVertical ? 'v' : 'h';
    car.dir = rand() < 0.5 ? 1 : -1;
    car.angle = onVertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
  }
}

export function spawnParkedCars(state, count) {
  const rand = mulberry32(state.seed ^ 0x9a4ed);
  const { vertical, horizontal } = roadLines();
  const models = ['pinto', 'sedan', 'muscle', 'taxi'];
  for (let i = 0; i < count; i += 1) {
    const onVertical = rand() < 0.5;
    const road = onVertical
      ? vertical[Math.floor(rand() * vertical.length)]
      : horizontal[Math.floor(rand() * horizontal.length)];
    const along = 260 + rand() * 1400;
    // Parallel-parked on the road's edge, clear of the buildings behind.
    const x = onVertical ? road + 20 : along;
    const y = onVertical ? along : road + 20;
    const car = spawnCar(state, models[Math.floor(rand() * models.length)], x, y,
      onVertical ? Math.PI / 2 : 0, 'parked');
    car.speed = 0;
  }
}

// Arcade bicycle-ish steering: speed, then angle follows the wheel.
export function driveCar(car, input, dt) {
  const model = modelById(car.model);
  const throttle = input.up ? 1 : input.down ? -0.7 : 0;
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  car.speed += throttle * model.accel * dt;
  car.speed *= Math.pow(0.4, dt); // rolling drag
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  car.speed = Math.max(-model.topSpeed * 0.45, Math.min(model.topSpeed, car.speed));
  const turnRate = model.grip * (car.speed / model.topSpeed) * (car.speed < 0 ? -1 : 1);
  car.angle += steer * turnRate * dt * 1.4;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  return { nx, ny };
}

export function moveCarWithCollision(state, city, car, nx, ny) {
  // Slide along walls: try x then y separately, bounce softly on a hit.
  const r = 16;
  if (!hitsBuilding(city, nx, car.y, r)) car.x = nx;
  else car.speed *= -0.25;
  if (!hitsBuilding(city, car.x, ny, r)) car.y = ny;
  else car.speed *= -0.25;
  const clamped = clampToWorld(car.x, car.y, 26);
  car.x = clamped.x; car.y = clamped.y;
}

export function updateTraffic(state, city, dt) {
  const { vertical, horizontal } = roadLines();
  for (const car of state.cars) {
    if (car.kind !== 'traffic') continue;
    // Follow the road grid: at each intersection, maybe turn.
    const speed = car.speed;
    let nx = car.x + Math.cos(car.angle) * speed * dt;
    let ny = car.y + Math.sin(car.angle) * speed * dt;
    const nearIntersection = vertical.some((rx) => Math.abs(nx - rx) < 8)
      && horizontal.some((ry) => Math.abs(ny - ry) < 8);
    if (nearIntersection && state.rand() < 0.25) {
      car.angle += (state.rand() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
    // Avoid piling into the car ahead: slow when another car is close ahead.
    for (const other of state.cars) {
      if (other === car) continue;
      const dx = other.x - car.x, dy = other.y - car.y;
      const dist = Math.hypot(dx, dy);
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      if (dist < 70 && ahead > 0) { nx = car.x; ny = car.y; car.stuckAt += dt; break; }
    }
    if (hitsBuilding(city, nx, ny, 20)) {
      // Bounced off a block edge: turn around the grid instead of stopping.
      car.angle += Math.PI / 2;
    } else { car.x = nx; car.y = ny; }
    const clamped = clampToWorld(car.x, car.y, 26);
    car.x = clamped.x; car.y = clamped.y;
  }
}

export function nearestCar(state, x, y, maxDist) {
  let best = null, bestD = maxDist;
  for (const car of state.cars) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function removeCar(state, car) {
  const idx = state.cars.indexOf(car);
  if (idx >= 0) state.cars.splice(idx, 1);
}
