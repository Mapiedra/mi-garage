// Ajustes y progreso guardados en el navegador (localStorage).
const KEY = 'mi-garage:v1';

const DEFAULTS = {
  options: 3,        // nº de opciones en "¿Cuál es?" y "Escucha y toca"
  puzzle: 2,         // piezas por lado del puzle (2 = 4 piezas)
  pairs: 4,          // parejas en "Parejas"
  rate: 0.85,        // velocidad de la voz
  voice: '',         // nombre de la voz elegida ('' = automática)
  sounds: true,      // efectos de sonido
  calm: false,       // animaciones mínimas
  brands: null,      // null = todas; si no, lista de slugs activos
  stars: {},         // { slug: nº de estrellas }
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento: seguimos en memoria */ }
}

export const settings = {
  get(k) { return state[k]; },
  set(k, v) { state[k] = v; save(); },
  all() { return state; },
};

export function addStar(slug) {
  state.stars = { ...state.stars, [slug]: (state.stars[slug] || 0) + 1 };
  save();
}

export function totalStars() {
  return Object.values(state.stars).reduce((a, b) => a + b, 0);
}

export function resetStars() {
  state.stars = {};
  save();
}
