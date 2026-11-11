// Arranque, navegación y pantallas de inicio y ajustes.
import { BRANDS, logoUrl } from './brands.js';
import { settings, totalStars, resetStars } from './storage.js';
import { speak, stopSpeaking, unlockSpeech, spanishVoices, hasSpeech, sayBrand } from './speech.js';
import { unlockAudio, sfx } from './sounds.js';
import { el, createScope } from './ui.js';
import * as quiz from './games/quiz.js';
import * as listen from './games/listen.js';
import * as puzzle from './games/puzzle.js';
import * as memory from './games/memory.js';
import * as spell from './games/spell.js';
import * as garage from './games/garage.js';

export const GAMES = [
  { id: 'quiz', title: '¿Cuál es?', say: '¿Cuál es?', icon: '🔤', color: 'blue', mod: quiz, hint: 'Mira el logo y elige el nombre' },
  { id: 'listen', title: 'Escucha y toca', say: 'Escucha y toca', icon: '👂', color: 'green', mod: listen, hint: 'Escucha la marca y toca su logo' },
  { id: 'puzzle', title: 'Puzle', say: 'Puzle', icon: '🧩', color: 'amber', mod: puzzle, hint: 'Monta el logo pieza a pieza' },
  { id: 'memory', title: 'Parejas', say: 'Parejas', icon: '🃏', color: 'purple', mod: memory, hint: 'Busca los logos iguales' },
  { id: 'spell', title: 'Escribe la marca', say: 'Escribe la marca', icon: '✏️', color: 'teal', mod: spell, hint: 'Ordena las letras' },
  { id: 'garage', title: 'Mi garaje', say: 'Mi garaje', icon: '🏠', color: 'red', mod: garage, hint: 'Todas tus marcas y estrellas' },
];

const view = document.getElementById('view');
const titleEl = document.getElementById('title');
const repeatBtn = document.getElementById('repeat');
const homeBtn = document.getElementById('home');
const gearBtn = document.getElementById('gear');

let current = null; // { scope, cleanup }
let repeatFn = null;

function setRepeat(fn) {
  repeatFn = fn;
  repeatBtn.hidden = !fn;
}
repeatBtn.addEventListener('click', () => repeatFn?.());

function applyCalm() {
  document.documentElement.classList.toggle('calm', !!settings.get('calm'));
}

function route() {
  current?.cleanup?.();
  current?.scope.dispose();
  stopSpeaking();
  setRepeat(null);
  window.scrollTo(0, 0);

  const id = location.hash.replace(/^#\/?/, '');
  const game = GAMES.find((g) => g.id === id);
  const scope = createScope();
  homeBtn.hidden = !id;

  if (game) {
    titleEl.textContent = game.title;
    document.title = `${game.title} · Mi Garaje`;
    view.className = `view game game-${game.id}`;
    const cleanup = game.mod.mount(view, { scope, setRepeat, game });
    current = { scope, cleanup };
  } else if (id === 'ajustes') {
    titleEl.textContent = 'Ajustes';
    document.title = 'Ajustes · Mi Garaje';
    view.className = 'view settings scroll-y';
    renderSettings(scope);
    current = { scope };
  } else {
    titleEl.textContent = 'Mi Garaje';
    document.title = 'Mi Garaje de Marcas';
    view.className = 'view home';
    renderHome();
    current = { scope };
  }
  view.focus({ preventScroll: true });
}

function renderHome() {
  const stars = totalStars();
  view.replaceChildren(
    el('div.home-head', {},
      el('p.home-stars', {}, stars ? `⭐ ${stars} ${stars === 1 ? 'estrella' : 'estrellas'}` : '¡Elige un juego!'),
      el('div.install-slot.home-install')),
    el('div.home-area', {},
      el('div.game-grid', {}, GAMES.map((g) =>
        el('a.game-card', {
          href: `#/${g.id}`,
          dataset: { color: g.color },
          onclick: () => { sfx.pop(); speak(g.say); },
        },
        el('span.game-icon', { 'aria-hidden': 'true' }, g.icon),
        el('span.game-title', {}, g.title),
        el('span.game-hint', {}, g.hint))))),
  );
  refreshInstall();
  setRepeat(() => speak('¡Elige un juego!'));
}

// ---------- Ajustes (para adultos) ----------

function segmented(label, key, values, fmt = String) {
  const group = el('div.segmented', { role: 'radiogroup', 'aria-label': label });
  const paint = () => group.querySelectorAll('button').forEach((b) =>
    b.setAttribute('aria-checked', String(Number(b.dataset.v) === settings.get(key))));
  values.forEach((v) => group.append(el('button', {
    type: 'button', role: 'radio', dataset: { v },
    onclick: () => { settings.set(key, v); paint(); },
  }, fmt(v))));
  paint();
  return el('div.setting', {}, el('span.setting-label', {}, label), group);
}

function toggle(label, key, onChange) {
  const input = el('input', { type: 'checkbox', checked: !!settings.get(key),
    onchange: (e) => { settings.set(key, e.target.checked); onChange?.(); } });
  return el('label.setting.toggle', {}, el('span.setting-label', {}, label), input);
}

function renderSettings(scope) {
  const voiceSelect = el('select', { onchange: (e) => settings.set('voice', e.target.value) });
  const fillVoices = () => {
    const vs = spanishVoices();
    voiceSelect.replaceChildren(el('option', { value: '' }, 'Automática (español)'),
      ...vs.map((v) => el('option', { value: v.name, selected: v.name === settings.get('voice') }, `${v.name} (${v.lang})`)));
  };
  fillVoices();
  if (hasSpeech) speechSynthesis.addEventListener('voiceschanged', fillVoices);

  const chosen = new Set(settings.get('brands') || BRANDS.map((b) => b.slug));
  const count = el('span.muted');
  const saveBrands = () => {
    settings.set('brands', chosen.size === BRANDS.length ? null : [...chosen]);
    count.textContent = `${chosen.size} de ${BRANDS.length} marcas`;
  };
  const brandGrid = el('div.brand-picker');
  const paintBrands = () => brandGrid.replaceChildren(...BRANDS.map((b) =>
    el('button.brand-pick', {
      type: 'button', 'aria-pressed': String(chosen.has(b.slug)), 'aria-label': b.name,
      onclick: (e) => {
        if (chosen.has(b.slug)) { if (chosen.size > 4) chosen.delete(b.slug); } else chosen.add(b.slug);
        e.currentTarget.setAttribute('aria-pressed', String(chosen.has(b.slug)));
        saveBrands();
      },
    }, el('img', { src: logoUrl(b), alt: '' }), el('span', {}, b.name))));
  paintBrands();
  saveBrands();

  view.replaceChildren(el('div.settings-wrap', {},
    el('h2', {}, 'Juegos'),
    segmented('Opciones para elegir', 'options', [2, 3, 4]),
    segmented('Piezas del puzle', 'puzzle', [2, 3, 4], (v) => `${v * v}`),
    segmented('Parejas', 'pairs', [3, 4, 6, 8]),
    el('h2', {}, 'Voz y sonido'),
    segmented('Velocidad de la voz', 'rate', [0.7, 0.85, 1], (v) => ({ 0.7: 'Lenta', 0.85: 'Normal', 1: 'Rápida' })[v]),
    el('div.setting', {}, el('span.setting-label', {}, 'Voz'), voiceSelect),
    el('button.btn', { type: 'button', onclick: () => sayBrand(BRANDS.find((b) => b.slug === 'volkswagen'), 'Hola, esto es') }, '🔊 Probar voz'),
    hasSpeech ? null : el('p.warn', {}, 'Este navegador no tiene voz. Prueba con Chrome, Edge o Safari.'),
    toggle('Efectos de sonido', 'sounds'),
    toggle('Animaciones mínimas', 'calm', applyCalm),
    el('h2', {}, 'Marcas que aparecen ', count),
    el('p.muted', {}, 'Toca para quitar o poner. Mínimo 4.'),
    el('div.row', {},
      el('button.btn', { type: 'button', onclick: () => { BRANDS.forEach((b) => chosen.add(b.slug)); saveBrands(); paintBrands(); } }, 'Todas'),
    ),
    brandGrid,
    el('h2', {}, 'App'),
    el('p.muted', {}, isStandalone() ? '✅ Funcionando como app instalada.' : 'Instálala para abrirla desde la pantalla de inicio, a pantalla completa y sin conexión.'),
    el('div.install-slot'),
    el('h2', {}, 'Progreso'),
    el('button.btn', { type: 'button', onclick: () => {
      if (confirm('¿Borrar todas las estrellas ganadas?')) { resetStars(); alert('Estrellas borradas.'); }
    } }, '🗑️ Borrar estrellas'),
    el('a.btn.btn-primary.done', { href: '#/' }, '✔ Listo'),
  ));
  refreshInstall();
  return scope;
}

// Engranaje: hay que mantenerlo pulsado 2 segundos (para que el niño no entre sin querer).
(function setupGear() {
  let timer = null;
  const start = (e) => {
    e.preventDefault();
    gearBtn.classList.add('holding');
    timer = setTimeout(() => { gearBtn.classList.remove('holding'); location.hash = '#/ajustes'; }, 2000);
  };
  const cancel = () => { clearTimeout(timer); gearBtn.classList.remove('holding'); };
  gearBtn.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => gearBtn.addEventListener(ev, cancel));
  gearBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  gearBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') location.hash = '#/ajustes'; });
})();

// Pantalla "¡Vamos!": el primer toque activa la voz y el sonido (obligatorio en móviles).
function startOverlay() {
  const overlay = document.getElementById('start');
  const go = document.getElementById('go');
  // ?captura: sin pantalla de inicio (solo para hacer capturas de la tienda/instalación).
  if (new URLSearchParams(location.search).has('captura')) { overlay.remove(); return; }
  go.addEventListener('click', () => {
    unlockAudio();
    unlockSpeech();
    sfx.honk();
    overlay.classList.add('hide');
    setTimeout(() => overlay.remove(), 400);
    const id = location.hash.replace(/^#\/?/, '');
    speak(id ? GAMES.find((g) => g.id === id)?.say || '' : '¡Hola! Bienvenido a tu garaje. Elige un juego.');
  }, { once: true });
  go.focus();
}

// ---------- Instalar como app ----------
let installPrompt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // mostramos nuestro propio botón
  installPrompt = e;
  refreshInstall();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  refreshInstall();
  speak('¡Ya tienes Mi Garaje en tu pantalla!');
});

function installHelp() {
  const steps = isIOS
    ? [el('li', {}, 'Abre esta página en ', el('b', {}, 'Safari'), '.'),
      el('li', {}, 'Toca el botón ', el('b', {}, 'Compartir'), ' (el cuadrado con la flecha ⬆️).'),
      el('li', {}, 'Elige ', el('b', {}, '«Añadir a pantalla de inicio»'), ' y luego ', el('b', {}, 'Añadir'), '.')]
    : [el('li', {}, 'Abre el menú del navegador (', el('b', {}, '⋮'), ' o ', el('b', {}, '…'), ').'),
      el('li', {}, 'Elige ', el('b', {}, '«Instalar aplicación»'), ' o ', el('b', {}, '«Añadir a pantalla de inicio»'), '.')];
  const modal = el('div.modal', { onclick: (e) => { if (e.target === modal) modal.remove(); } },
    el('div.modal-card.install-card.pop-in', {},
      el('img', { src: 'assets/icons/icon-192.png', alt: '', width: 96, height: 96 }),
      el('h2', {}, 'Instalar Mi Garaje'),
      el('ol.install-steps', {}, steps),
      el('button.btn.btn-primary', { type: 'button', onclick: () => modal.remove() }, '¡Entendido!')));
  document.body.append(modal);
}

function installButton() {
  if (isStandalone()) return null;
  return el('button.btn.install-btn', {
    type: 'button',
    onclick: async () => {
      if (installPrompt) {
        installPrompt.prompt();
        await installPrompt.userChoice.catch(() => null);
        installPrompt = null;
        refreshInstall();
      } else {
        installHelp();
      }
    },
  }, '📲 Instalar como app');
}

function refreshInstall() {
  document.querySelectorAll('.install-slot').forEach((slot) => slot.replaceChildren(...[installButton()].filter(Boolean)));
}

applyCalm();
window.addEventListener('hashchange', route);
route();
startOverlay();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
