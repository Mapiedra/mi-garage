// 6 · Mi garaje.  Todas las marcas para explorar libremente, con las estrellas ganadas.
import { BRANDS } from '../brands.js';
import { settings, totalStars } from '../storage.js';
import { speak, sayBrand } from '../speech.js';
import { sfx } from '../sounds.js';
import { el, logoImg, fitGrid } from '../ui.js';

export function mount(view, { scope, setRepeat }) {
  const stars = settings.get('stars');
  const total = totalStars();
  // Primero las que más estrellas tienen; luego el resto en orden alfabético.
  const list = [...BRANDS].sort((a, b) => (stars[b.slug] || 0) - (stars[a.slug] || 0) || a.name.localeCompare(b.name, 'es'));
  let modal = null;

  function open(b) {
    sfx.pop();
    sayBrand(b);
    const n = stars[b.slug] || 0;
    close();
    modal = el('div.modal', { onclick: (e) => { if (e.target === modal) close(); } },
      el('div.modal-card.pop-in', {},
        logoImg(b),
        el('h2', {}, b.name),
        el('div.stars', {}, n ? '⭐'.repeat(Math.min(n, 10)) + (n > 10 ? ` ×${n}` : '') : 'Aún sin estrellas'),
        el('div.end-actions', {},
          el('button.btn.btn-primary', { type: 'button', onclick: () => { sfx.honk(); sayBrand(b); } }, '🔊 Otra vez'),
          el('button.btn', { type: 'button', onclick: close }, '✖ Cerrar'))));
    document.body.append(modal);
  }
  function close() { modal?.remove(); modal = null; }

  const grid = el('div.garage-grid', {}, list.map((b) => {
      const n = stars[b.slug] || 0;
      return el(`button.garage-item${n ? '' : '.new'}`, { type: 'button', 'aria-label': b.name, onclick: () => open(b) },
        logoImg(b),
        el('span.name', {}, b.name),
        n ? el('span.badge', {}, `⭐${n}`) : null);
    }));
  view.replaceChildren(
    el('p.garage-head', {}, total ? `Tienes ⭐ ${total} ${total === 1 ? 'estrella' : 'estrellas'}` : 'Toca un logo para escucharlo'),
    el('div.fit-area.garage-area', {}, grid),
  );
  // Todas las marcas a la vista; si no caben con un tamaño cómodo, se desplaza en vertical.
  fitGrid(scope, grid, list.length, { gap: (w) => (w < 500 ? 8 : 12), min: 92, max: 200 });
  setRepeat(() => speak('Este es tu garaje. Toca un logo para escucharlo'));
  speak('Este es tu garaje');
  return close;
}
