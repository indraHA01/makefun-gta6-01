// SOLMAR sound: every sound is synthesized with WebAudio, no audio files.
// A tiny synth keeps the game fully offline and under the size cap.
let ctx = null;
let engineOsc = null, engineGain = null, musicTimer = null;
let muted = false;

export function ensureAudio() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  } catch (err) { ctx = null; }
  return ctx;
}

export function setMuted(m) { muted = m; if (engineGain) engineGain.gain.value = 0; }
export function isMuted() { return muted; }

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  gain.gain.setValueAtTime(vol || 0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}

export function blip() { tone(660, 0.09, 'square', 0.06); tone(990, 0.12, 'square', 0.05); }
export function cashSound() {
  tone(880, 0.08, 'triangle', 0.1); setTimeout(() => tone(1320, 0.14, 'triangle', 0.1), 70);
}
export function punchSound() { tone(160, 0.08, 'sawtooth', 0.14, 60); }
export function shotSound() { tone(900, 0.07, 'square', 0.16, 120); noiseBurst(0.06, 0.12); }
export function sirenBlip() { tone(720, 0.18, 'sine', 0.07, 980); }
export function lockpickClick(ok) { tone(ok ? 1200 : 220, 0.1, 'square', 0.08); }
export function missionSound() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.1), i * 110));
}
export function bustedSound() { tone(440, 0.5, 'sawtooth', 0.1, 110); }
export function hornSound() { tone(370, 0.22, 'square', 0.07); tone(466, 0.22, 'square', 0.05); }
export function pickupSound() { tone(1046, 0.1, 'sine', 0.09); setTimeout(() => tone(1568, 0.16, 'sine', 0.08), 80); }

function noiseBurst(dur, vol) {
  if (!ctx || muted) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.buffer = buf; src.connect(gain).connect(ctx.destination); src.start();
}

// Engine hum follows the driven car's speed; call every frame while driving.
export function engineHum(speed, topSpeed) {
  if (!ctx || muted) return;
  if (!engineOsc) {
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 420;
    engineOsc.connect(filter).connect(engineGain).connect(ctx.destination);
    engineOsc.start();
  }
  const ratio = Math.abs(speed) / Math.max(1, topSpeed);
  engineOsc.frequency.setValueAtTime(50 + ratio * 130, ctx.currentTime);
  engineGain.gain.setValueAtTime(0.02 + ratio * 0.045, ctx.currentTime);
}

export function stopEngineHum() {
  if (engineGain) engineGain.gain.value = 0;
}

// A slow, sunny bass-and-pad loop, scheduled bar by bar, original melody.
const BASS_LINE = [110, 0, 110, 130.8, 98, 0, 110, 146.8];
const PAD_CHORDS = [[220, 277, 330], [174, 220, 261], [196, 246, 293], [164, 220, 261]];
export function startMusic() {
  if (!ctx || musicTimer) return;
  let bar = 0;
  musicTimer = setInterval(() => {
    if (muted || !ctx) return;
    const chord = PAD_CHORDS[bar % PAD_CHORDS.length];
    chord.forEach((f) => tone(f, 1.9, 'sine', 0.025));
    const bass = BASS_LINE[bar % BASS_LINE.length];
    if (bass) tone(bass, 0.5, 'triangle', 0.05);
    bar += 1;
  }, 500);
}
