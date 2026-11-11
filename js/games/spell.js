// Juego 5 · Escribe la marca.  Se tocan las letras en orden para formar el nombre.
import { speak, sayBrand, sayLetter } from '../speech.js';
import { sfx } from '../sounds.js';
import { el, logoImg, shuffle, activeBrands, roundQueue, progressBar, celebrate, nudge, roundEnd, fitGrid } from '../ui.js';

const ROUND = 5;
const MAX_LETTERS = 8;

// "Citroën" → "CITROEN", "Škoda" → "SKODA" (la Ñ se conserva).
const plain = (s) => s.toUpperCase().replace(/Ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ');

export function mount(view, { scope, setRepeat }) {
  let layoutOff = null;
  function start() {
    let pool = activeBrands().filter((b) => /^[A-Za-zÀ-ž ]+$/.test(b.name) && plain(b.name).replace(/ /g, '').length <= MAX_LETTERS);
    if (pool.length < 3) pool = activeBrands().filter((b) => plain(b.name).replace(/[^A-ZÑ]/g, '').length <= MAX_LETTERS);
    if (!pool.length) pool = activeBrands();
    const queue = roundQueue(ROUND, pool);
    const won = [];
    const progress = progressBar(ROUND);
    let i = 0;

    function play() {
      if (!scope.alive) return;
      if (i >= ROUND) return roundEnd(view, { brands: won, onAgain: start, title: '¡Muy bien escrito!' });

      const brand = queue[i];
      const word = [...plain(brand.name)].filter((ch) => /[A-ZÑ ]/.test(ch));
      const letters = word.map((ch, idx) => ({ ch, idx })).filter((x) => x.ch !== ' ');
      let pos = 0; // índice dentro de "letters"
      let misses = 0;

      const cells = word.map((ch) => el(ch === ' ' ? 'div.cell.space' : 'div.cell', {}, ''));
      const tiles = shuffle(letters).map((l) => {
        const t = el('button.letter', { type: 'button', onclick: () => tap(l, t) }, l.ch);
        return t;
      });

      function markNext() {
        cells.forEach((c) => c.classList.remove('next'));
        if (pos < letters.length) cells[letters[pos].idx].classList.add('next');
      }

      async function tap(l, t) {
        if (t.classList.contains('used') || pos >= letters.length) return;
        const want = letters[pos];
        sayLetter(l.ch);
        if (l.ch === want.ch) {
          t.classList.add('used');
          tiles.forEach((x) => x.classList.remove('hint'));
          const cell = cells[want.idx];
          cell.textContent = want.ch;
          cell.classList.add('filled', 'pop-in');
          sfx.pop();
          pos++;
          misses = 0;
          markNext();
          if (pos === letters.length) {
            won.push(brand);
            progress.set(i + 1);
            await scope.wait(500);
            await celebrate(brand);
            await scope.wait(500);
            i++;
            play();
          }
        } else {
          sfx.retry();
          nudge(t);
          misses++;
          if (misses >= 2) {
            // Ayuda: brilla una letra correcta.
            const help = tiles.find((x) => !x.classList.contains('used') && x.textContent === want.ch);
            help?.classList.add('hint');
          }
        }
      }

      const wordEl = el('div.word', { 'aria-label': brand.name }, cells);
      const lettersEl = el('div.letters', {}, tiles);
      view.replaceChildren(
        progress.node,
        el('div.play', {}, el('div.layout.spell-layout', {},
          el('div.spell-logo.stage-box', {}, el('div.stage.pop-in', {}, logoImg(brand))),
          el('div.spell-right', {}, wordEl, el('div.fit-area', {}, lettersEl)))),
      );
      layoutOff?.();
      layoutOff = fitGrid(scope, lettersEl, tiles.length, {
        gap: 12, max: 130,
        onFit: ({ size, w }) => {
          // Las casillas de la palabra, un poco más pequeñas que las letras y siempre en una fila.
          const cw = Math.floor(Math.min(size * 0.9, 76, (w - 8 * (word.length - 1)) / word.length));
          wordEl.style.setProperty('--cw', `${cw}px`);
        },
      });
      progress.set(i);
      markNext();
      const say = () => sayBrand(brand, 'Escribe');
      setRepeat(say);
      say();
    }
    play();
  }
  start();
}
