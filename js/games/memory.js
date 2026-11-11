// Juego 4 · Parejas.  Cartas boca abajo; al girarlas se oye la marca.
import { settings, addStar } from '../storage.js';
import { speak, sayBrand } from '../speech.js';
import { sfx } from '../sounds.js';
import { el, logoImg, shuffle, roundQueue, progressBar, nudge, roundEnd, fitGrid } from '../ui.js';

export function mount(view, { scope, setRepeat }) {
  let layoutOff = null;
  function start() {
    const pairs = settings.get('pairs');
    const brands = roundQueue(pairs);
    const deck = shuffle([...brands, ...brands]);
    const progress = progressBar(pairs);
    const won = [];
    let open = [];
    let busy = false;

    const grid = el('div.memory-grid');

    const cards = deck.map((b) => {
      const c = el('button.card-m', { type: 'button', 'aria-label': 'Carta' },
        el('div.card-inner', {},
          el('div.card-face.card-back', { 'aria-hidden': 'true' }, '🚗'),
          el('div.card-face.card-front', {}, logoImg(b))));
      c.addEventListener('click', () => flip(c, b));
      grid.append(c);
      return c;
    });

    async function flip(c, b) {
      if (busy || c.classList.contains('up') || c.classList.contains('matched')) return;
      c.classList.add('up');
      c.setAttribute('aria-label', b.name);
      sfx.pop();
      open.push({ c, b });
      sayBrand(b);
      if (open.length < 2) return;

      busy = true;
      const [x, y] = open;
      open = [];
      if (x.b === y.b) {
        await scope.wait(700);
        x.c.classList.add('matched'); y.c.classList.add('matched');
        x.c.classList.remove('up'); y.c.classList.remove('up');
        sfx.honk();
        addStar(x.b.slug);
        won.push(x.b);
        progress.set(won.length);
        await speak(`¡Pareja! ${x.b.say}`);
        busy = false;
        if (won.length === pairs) {
          await scope.wait(600);
          roundEnd(view, { brands: won, onAgain: start, title: '¡Todas las parejas!' });
        }
      } else {
        await scope.wait(1300);
        nudge(x.c); nudge(y.c);
        x.c.classList.remove('up'); y.c.classList.remove('up');
        x.c.setAttribute('aria-label', 'Carta'); y.c.setAttribute('aria-label', 'Carta');
        busy = false;
      }
    }

    const area = el('div.fit-area', {}, grid);
    view.replaceChildren(progress.node, el('div.play', {}, el('div.layout.stack', {}, el('p.prompt', {}, 'Busca las parejas'), area)));
    layoutOff?.();
    layoutOff = fitGrid(scope, grid, deck.length, { gap: (w, h) => (Math.min(w, h) < 420 ? 8 : 14), max: 300 });
    const say = () => speak('Busca los logos iguales');
    setRepeat(say);
    say();
    return cards;
  }
  start();
}
