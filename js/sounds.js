// Efectos de sonido suaves, sintetizados con Web Audio (sin archivos).
import { settings } from './storage.js';

let ctx = null;
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() { ac(); }

function tone(freq, start, dur, { type = 'sine', vol = 0.18, slideTo } = {}) {
  const a = ac();
  if (!a || !settings.get('sounds')) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  /** Acierto: campanita de tres notas. */
  success() {
    tone(659, 0, 0.18);
    tone(784, 0.1, 0.18);
    tone(1047, 0.2, 0.35);
  },
  /** "Otra vez": dos notas suaves, nada estridente. */
  retry() {
    tone(392, 0, 0.16, { vol: 0.12 });
    tone(330, 0.14, 0.22, { vol: 0.12 });
  },
  /** Pieza colocada / carta girada. */
  pop() {
    tone(520, 0, 0.09, { vol: 0.12, slideTo: 760 });
  },
  /** Claxon "pi-pi". */
  honk() {
    tone(440, 0, 0.16, { type: 'square', vol: 0.07 });
    tone(554, 0, 0.16, { type: 'square', vol: 0.05 });
    tone(440, 0.24, 0.2, { type: 'square', vol: 0.07 });
    tone(554, 0.24, 0.2, { type: 'square', vol: 0.05 });
  },
  /** Motor "brum" al terminar una ronda. */
  engine() {
    tone(70, 0, 1.0, { type: 'sawtooth', vol: 0.08, slideTo: 160 });
    tone(105, 0.05, 0.95, { type: 'sawtooth', vol: 0.05, slideTo: 230 });
  },
};
