// Juego 1 · ¿Cuál es?  Se ve un logo y hay que elegir su nombre entre varios.
import { settings } from '../storage.js';
import { speak, sayBrand } from '../speech.js';
import { el, logoImg, sample, shuffle, activeBrands, roundQueue, progressBar, celebrate, tryAgain, nudge, roundEnd } from '../ui.js';

const ROUND = 10;

export function mount(view, { scope, setRepeat }) {
  function start() {
    const queue = roundQueue(ROUND);
    const won = [];
    const progress = progressBar(ROUND);
    let i = 0;

    function ask() {
      if (!scope.alive) return;
      if (i >= ROUND) return roundEnd(view, { brands: won, onAgain: start });
      const target = queue[i];
      const n = settings.get('options');
      const opts = shuffle([target, ...sample(activeBrands(), n - 1, [target])]);
      let solved = false;

      const buttons = opts.map((b) => {
        const listen = el('span.listen', {
          role: 'button', 'aria-label': `Escuchar ${b.name}`,
          onclick: (e) => { e.stopPropagation(); sayBrand(b); },
        }, '🔊');
        const btn = el('button.option', { type: 'button', onclick: () => choose(b, btn) }, b.name, listen);
        return btn;
      });

      async function choose(b, btn) {
        if (solved || btn.classList.contains('dim')) return;
        if (b === target) {
          solved = true;
          btn.classList.add('correct');
          buttons.forEach((x) => { if (x !== btn) x.classList.add('dim'); x.disabled = true; });
          won.push(target);
          progress.set(i + 1);
          await celebrate(target);
          await scope.wait(500);
          i++;
          ask();
        } else {
          btn.classList.add('dim');
          nudge(btn);
          await sayBrand(b);
          if (!solved && scope.alive) await tryAgain('Ese no es. Prueba otra vez');
        }
      }

      view.replaceChildren(
        progress.node,
        el('div.play', {}, el('div.layout.quiz-layout', { dataset: { n } },
          el('p.prompt', {}, '¿Qué marca es?'),
          el('div.stage-box', {}, el('div.stage.pop-in', {}, logoImg(target))),
          el('div.options', {}, buttons))),
      );
      progress.set(i);
      speak('¿Qué marca es?');
    }

    setRepeat(() => speak('¿Qué marca es?'));
    ask();
  }
  start();
}
