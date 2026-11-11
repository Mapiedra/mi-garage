// Juego 2 · Escucha y toca.  La voz dice una marca y hay que tocar su logo.
import { settings } from '../storage.js';
import { sayBrand } from '../speech.js';
import { el, logoImg, sample, shuffle, activeBrands, roundQueue, progressBar, celebrate, tryAgain, nudge, roundEnd, fitGrid } from '../ui.js';

const ROUND = 10;
export function mount(view, { scope, setRepeat }) {
  let layoutOff = null;
  function start() {
    const queue = roundQueue(ROUND);
    const won = [];
    const progress = progressBar(ROUND);
    let i = 0;

    function ask() {
      if (!scope.alive) return;
      if (i >= ROUND) return roundEnd(view, { brands: won, onAgain: start });
      const target = queue[i];
      const n = Math.max(2, settings.get('options'));
      const opts = shuffle([target, ...sample(activeBrands(), n - 1, [target])]);
      const say = () => sayBrand(target, 'Toca');
      let solved = false;

      const tiles = opts.map((b) => {
        const t = el('button.logo-option', { type: 'button', 'aria-label': b.name, onclick: () => choose(b, t) }, logoImg(b, 'l'));
        return t;
      });

      async function choose(b, t) {
        if (solved || t.classList.contains('dim')) return;
        if (b === target) {
          solved = true;
          t.classList.add('correct');
          tiles.forEach((x) => { if (x !== t) x.classList.add('dim'); x.disabled = true; });
          won.push(target);
          progress.set(i + 1);
          await celebrate(target);
          await scope.wait(500);
          i++;
          ask();
        } else {
          t.classList.add('dim');
          nudge(t);
          await sayBrand(b, 'Ese es');
          if (solved || !scope.alive) return;
          await tryAgain('Busca otro');
          if (scope.alive && !solved) say();
        }
      }

      const grid = el('div.logo-options.pop-in', {}, tiles);
      const area = el('div.fit-area', {}, grid);
      view.replaceChildren(
        progress.node,
        el('div.play', {}, el('div.layout.stack', {},
          el('div.listen-big', {}, el('button.btn.btn-primary', { type: 'button', onclick: say }, '🔊 Escuchar')),
          area)),
      );
      layoutOff?.();
      layoutOff = fitGrid(scope, grid, tiles.length, { gap: (w) => (w < 500 ? 12 : 22), max: 320 });
      progress.set(i);
      setRepeat(say);
      say();
    }
    ask();
  }
  start();
}
