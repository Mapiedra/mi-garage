// Voz en español con la Web Speech API.
import { settings } from './storage.js';

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];

function isSpanish(v) { return v.lang.replace('_', '-').toLowerCase().startsWith('es'); }

function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices().filter(isSpanish);
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

export function spanishVoices() {
  loadVoices();
  return voices;
}

function pickVoice() {
  const wanted = settings.get('voice');
  if (wanted) {
    const v = voices.find((x) => x.name === wanted);
    if (v) return v;
  }
  const byLang = (re) => voices.filter((v) => re.test(v.lang.replace('_', '-')));
  const es = byLang(/^es-ES$/i);
  // Preferimos voces "naturales"/de Google si existen; suenan mejor.
  return es.find((v) => /natural|google|online/i.test(v.name)) || es[0] || voices[0] || null;
}

/** Habla un texto. Devuelve una promesa que se resuelve al terminar (o tras un tiempo prudente). */
export function speak(text, { rate, interrupt = true } = {}) {
  return new Promise((resolve) => {
    if (!synth || !text) return resolve();
    if (interrupt) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = rate ?? settings.get('rate');
    u.pitch = 1.05;
    let done = false;
    const finish = () => { if (!done) { done = true; clearTimeout(t); resolve(); } };
    // Algunos navegadores no disparan "end": tope de seguridad.
    const t = setTimeout(finish, 1500 + text.length * 120);
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
  });
}

export function stopSpeaking() {
  synth?.cancel();
}

/** Pronuncia una marca usando su forma fonética. */
export function sayBrand(brand, prefix = '') {
  return speak(prefix ? `${prefix} ${brand.say}` : brand.say);
}

const LETTERS = {
  A: 'a', B: 'be', C: 'ce', D: 'de', E: 'e', F: 'efe', G: 'ge', H: 'hache', I: 'i', J: 'jota',
  K: 'ka', L: 'ele', M: 'eme', N: 'ene', Ñ: 'eñe', O: 'o', P: 'pe', Q: 'cu', R: 'erre', S: 'ese',
  T: 'te', U: 'u', V: 'uve', W: 'uve doble', X: 'equis', Y: 'i griega', Z: 'zeta',
};
export function sayLetter(letter) {
  return speak(LETTERS[letter] || letter, { rate: 0.9 });
}

/** Primer gesto del usuario: "despierta" la voz (necesario en iOS/Safari). */
export function unlockSpeech() {
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  synth.speak(u);
}

export const hasSpeech = !!synth;
