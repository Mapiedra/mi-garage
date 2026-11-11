// Utilidades compartidas por todos los juegos.
import { BRANDS, logoUrl } from './brands.js';
import { settings, addStar } from './storage.js';
import { speak, sayBrand } from './speech.js';
import { sfx } from './sounds.js';

/** Crea un elemento: el('button.big', { onclick }, 'Hola', otroNodo) */
export function el(tag, props = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const node = document.createElement(name || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k in node && k !== 'list') node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function logoImg(brand, cls = 'logo') {
  return el(`img.${cls}`, { src: logoUrl(brand), alt: brand.name, draggable: false });
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(arr, n, exclude = []) {
  return shuffle(arr.filter((x) => !exclude.includes(x))).slice(0, n);
}

/** Marcas activas según los ajustes (mínimo 4 para que los juegos funcionen). */
export function activeBrands() {
  const chosen = settings.get('brands');
  if (!chosen) return BRANDS;
  const list = BRANDS.filter((b) => chosen.includes(b.slug));
  return list.length >= 4 ? list : BRANDS;
}

/**
 * Orden de las preguntas de una ronda: marcas distintas y sin repetir la última
 * de la ronda anterior.
 */
let lastAsked = null;
export function roundQueue(n, pool = activeBrands()) {
  let q = shuffle(pool);
  if (q[0] === lastAsked && q.length > 1) q.push(q.shift());
  while (q.length < n) q = q.concat(shuffle(pool));
  q = q.slice(0, n);
  lastAsked = q[q.length - 1];
  return q;
}

/**
 * Ámbito de un juego: temporizadores que se cancelan solos al salir de la pantalla,
 * y una bandera para saber si la pantalla sigue viva.
 */
export function createScope() {
  const timers = new Set();
  const disposers = new Set();
  let alive = true;
  return {
    get alive() { return alive; },
    wait(ms) {
      return new Promise((resolve) => {
        const t = setTimeout(() => { timers.delete(t); if (alive) resolve(); }, ms);
        timers.add(t);
      });
    },
    /** Registra algo que hay que limpiar al salir de la pantalla. Devuelve una función para limpiarlo antes. */
    onDispose(fn) {
      disposers.add(fn);
      return () => { if (disposers.delete(fn)) fn(); };
    },
    dispose() {
      alive = false;
      timers.forEach(clearTimeout);
      timers.clear();
      disposers.forEach((fn) => fn());
      disposers.clear();
    },
  };
}

/** Observa el tamaño de un elemento y llama a fn(ancho, alto) al cambiar (rotar la tablet, etc.). */
export function onResize(node, fn) {
  let last = '';
  const run = () => {
    const w = node.clientWidth, h = node.clientHeight;
    const key = `${w}x${h}`;
    if (!w || !h || key === last) return;
    last = key;
    fn(w, h);
  };
  // El observador avisa ya con el diseño calculado; además medimos al momento
  // para que la primera pintura salga ya ajustada.
  const ro = new ResizeObserver(run);
  ro.observe(node);
  run();
  return () => ro.disconnect();
}

/**
 * Calcula la mejor rejilla para meter `count` casillas cuadradas (o de proporción
 * alto/ancho = ratio) en un hueco de w×h sin desbordar. Devuelve { cols, rows, size }.
 */
export function bestGrid(count, w, h, { gap = 12, ratio = 1, max = Infinity } = {}) {
  let best = { cols: 1, rows: count, size: 0 };
  // De más columnas a menos: si dos rejillas dan el mismo tamaño, gana la más ancha.
  for (let cols = count; cols >= 1; cols--) {
    const rows = Math.ceil(count / cols);
    const size = Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows / ratio, max);
    if (size > best.size + 0.5) best = { cols, rows, size };
  }
  best.size = Math.max(0, Math.floor(best.size));
  return best;
}

/**
 * Hace que una rejilla de `count` elementos ocupe todo su contenedor sin scroll.
 * Si las casillas quedarían más pequeñas que `min`, se permite desplazamiento vertical.
 */
export function fitGrid(scope, grid, count, { container = grid.parentElement, gap = 12, ratio = 1, min = 0, max = Infinity, onFit } = {}) {
  const off = onResize(container, (w, h) => {
    const g = typeof gap === 'function' ? gap(w, h) : gap;
    let { cols, size } = bestGrid(count, w, h, { gap: g, ratio, max });
    const scroll = size < min;
    if (scroll) {
      cols = Math.max(1, Math.floor((w + g) / (min + g)));
      size = Math.min(max, Math.floor((w - g * (cols - 1)) / cols));
    }
    container.classList.toggle('scroll-y', scroll);
    grid.style.gap = `${g}px`;
    grid.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
    grid.style.gridAutoRows = `${Math.floor(size * ratio)}px`;
    grid.style.setProperty('--cell', `${size}px`);
    onFit?.({ cols, size, scroll, w, h });
  });
  return scope.onDispose(off);
}

/** Barra de progreso: un coche avanza hacia la bandera de meta. */
export function progressBar(total) {
  const car = el('span.progress-car', { 'aria-hidden': 'true' }, '🚗');
  const fill = el('div.progress-fill');
  const node = el('div.progress', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': 0 },
    el('div.progress-track', {}, fill, car),
    el('span.progress-flag', { 'aria-hidden': 'true' }, '🏁'));
  function set(done) {
    const pct = Math.min(100, (done / total) * 100);
    fill.style.width = pct + '%';
    car.style.left = `calc(${pct}% - ${pct / 100 * 2.2}rem)`;
    node.setAttribute('aria-valuenow', done);
  }
  set(0);
  return { node, set };
}

/** Acierto: sonido, estrella para la marca y frase de ánimo. */
const PRAISE = ['¡Muy bien!', '¡Genial!', '¡Bravo!', '¡Fenomenal!', '¡Lo has conseguido!', '¡Perfecto!'];
export async function celebrate(brand, { phrase = true } = {}) {
  sfx.success();
  addStar(brand.slug);
  const p = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  await (phrase ? sayBrand(brand, `${p} Es`) : sayBrand(brand));
}

export async function tryAgain(text = 'Casi. Prueba otra vez') {
  sfx.retry();
  await speak(text, { interrupt: false });
}

/** Animación suave de "no es esta". */
export function nudge(node) {
  node.classList.remove('nudge');
  void node.offsetWidth;
  node.classList.add('nudge');
}

/** Pantalla de fin de ronda, igual en todos los juegos. */
export function roundEnd(view, { brands = [], onAgain, title = '¡Ronda terminada!' }) {
  sfx.engine();
  const uniq = [...new Map(brands.map((b) => [b.slug, b])).values()];
  view.replaceChildren(el('section.round-end', {},
    el('div.trophy', { 'aria-hidden': 'true' }, '🏆'),
    el('h2', {}, title),
    el('p.muted', {}, `Has ganado ${brands.length} ${brands.length === 1 ? 'estrella' : 'estrellas'} ⭐`),
    el('div.mini-logos', {}, uniq.map((b) => el('button.mini-logo', { onclick: () => sayBrand(b), 'aria-label': b.name }, logoImg(b)))),
    el('div.end-actions', {},
      el('button.btn.btn-primary', { onclick: onAgain }, '🔁 Otra vez'),
      el('a.btn', { href: '#/' }, '🏠 Casa')),
  ));
  speak(`${title} Has ganado ${brands.length} estrellas`);
}
