// Juego 3 · Puzle.  El logo se corta en piezas; se arrastran (o se tocan y luego
// se toca el hueco) a su sitio. Solo encajan en el sitio correcto: nunca se "falla".
import { settings } from '../storage.js';
import { speak } from '../speech.js';
import { sfx } from '../sounds.js';
import { el, shuffle, roundQueue, progressBar, celebrate, nudge, roundEnd, onResize, bestGrid } from '../ui.js';
import { logoUrl } from '../brands.js';

const ROUND = 3;

export function mount(view, { scope, setRepeat }) {
  let cleanupResize = null;

  function start() {
    const queue = roundQueue(ROUND);
    const won = [];
    const progress = progressBar(ROUND);
    let i = 0;

    function play() {
      cleanupResize?.();
      if (!scope.alive) return;
      if (i >= ROUND) return roundEnd(view, { brands: won, onAgain: start, title: '¡Puzles terminados!' });

      const brand = queue[i];
      const n = settings.get('puzzle');
      const url = `url("${logoUrl(brand)}")`;
      let placed = 0;
      let selected = null;
      let wrongTaps = 0;

      const board = el('div.board', { style: { '--n': n } }, el('img.ghost', { src: logoUrl(brand), alt: '' }));
      const slots = [];
      for (let k = 0; k < n * n; k++) {
        const s = el('div.slot', { dataset: { k } });
        s.addEventListener('click', () => tapSlot(s));
        slots.push(s);
        board.append(s);
      }
      const tray = el('div.tray');
      const wrap = el('div.puzzle-wrap', {}, board, tray);

      const pieces = shuffle([...Array(n * n).keys()]).map((k) => {
        const row = Math.floor(k / n), col = k % n;
        const p = el('div.piece', {
          role: 'button', 'aria-label': `Pieza ${k + 1}`,
          dataset: { k },
          style: {
            backgroundImage: url,
            backgroundSize: `${n * 100}% ${n * 100}%`,
            backgroundPosition: `${n === 1 ? 0 : (col / (n - 1)) * 100}% ${n === 1 ? 0 : (row / (n - 1)) * 100}%`,
          },
        });
        enableDrag(p);
        tray.append(p);
        return p;
      });

      const area = el('div.fit-area', {}, wrap);
      view.replaceChildren(progress.node, el('div.play', {}, el('div.layout.stack', {}, el('p.prompt', {}, '¿Qué marca será?'), area)));
      progress.set(i);

      // Tablero y bandeja se reparten la pantalla: lado a lado en horizontal,
      // uno encima del otro en vertical. Todo cabe sin desplazarse.
      let slotSize = 100;
      const GAP = 18, PAD = 12, PGAP = 10;
      const layout = (w, h) => {
        const landscape = w > h * 1.1;
        const count = n * n;
        // Probamos varios tamaños de tablero y nos quedamos con el que deja las piezas más grandes
        // sin que el tablero sea demasiado pequeño.
        let best = null;
        for (let f = 0.45; f <= 0.8; f += 0.05) {
          const boardSize = Math.floor(landscape ? Math.min(h, w * f) : Math.min(w, h * f));
          const tw = landscape ? w - boardSize - GAP : w;
          const th = landscape ? h : h - boardSize - GAP;
          if (tw < 60 || th < 60) continue;
          // -6: borde de la bandeja (2+2) y un margen de seguridad.
          const g = bestGrid(count, tw - PAD * 2 - 6, th - PAD * 2 - 6, { gap: PGAP, max: boardSize / n });
          const score = Math.min(g.size * 1.6, boardSize / n) + boardSize / n * 0.6;
          if (!best || score > best.score) best = { score, boardSize, tw, th, g };
        }
        if (!best) return;
        slotSize = best.boardSize / n;
        wrap.classList.toggle('landscape', landscape);
        board.style.width = board.style.height = `${best.boardSize}px`;
        // Bandeja justa para sus piezas (+4 px del borde).
        if (!tray.classList.contains('finished')) {
          tray.style.width = `${best.g.cols * best.g.size + (best.g.cols - 1) * PGAP + PAD * 2 + 4}px`;
          tray.style.height = `${best.g.rows * best.g.size + (best.g.rows - 1) * PGAP + PAD * 2 + 4}px`;
        }
        wrap.style.setProperty('--piece', `${best.g.size}px`);
      };
      cleanupResize = scope.onDispose(onResize(area, layout));

      const say = () => speak('¿Qué marca será? Monta el puzle');
      setRepeat(say);
      say();

      // ---- colocar ----
      async function place(p, slot) {
        p.classList.remove('selected', 'dragging');
        p.removeAttribute('style');
        p.style.backgroundImage = url;
        p.style.backgroundSize = `${n * 100}% ${n * 100}%`;
        const k = Number(p.dataset.k), row = Math.floor(k / n), col = k % n;
        p.style.backgroundPosition = `${n === 1 ? 0 : (col / (n - 1)) * 100}% ${n === 1 ? 0 : (row / (n - 1)) * 100}%`;
        slot.append(p);
        slot.classList.remove('hint-target', 'target');
        p.dataset.done = '1';
        selected = null;
        wrongTaps = 0;
        sfx.pop();
        placed++;
        if (placed === n * n) finish();
      }

      async function finish() {
        board.classList.add('done');
        board.querySelector('.ghost')?.remove();
        won.push(brand);
        progress.set(i + 1);
        setRepeat(() => speak(brand.say));
        sfx.honk();
        await scope.wait(400);
        await celebrate(brand);
        if (!scope.alive) return;
        const next = el('button.btn.btn-primary.btn-next.pop-in', { type: 'button', onclick: () => { i++; play(); } },
          i + 1 < ROUND ? 'Siguiente ➜' : 'Terminar 🏁');
        tray.classList.add('finished');
        tray.style.width = tray.style.height = '';
        tray.replaceChildren(next);
        next.focus();
      }

      function wrong(p) {
        sfx.retry();
        nudge(p);
        wrongTaps++;
        if (wrongTaps >= 2) slots[Number(p.dataset.k)].classList.add('hint-target');
      }

      function tapSlot(slot) {
        if (!selected || slot.querySelector('.piece')) return;
        if (Number(slot.dataset.k) === Number(selected.dataset.k)) place(selected, slot);
        else wrong(selected);
      }

      // ---- arrastrar (ratón y dedo) ----
      function enableDrag(p) {
        let startX, startY, dx, dy, dragging = false, pointer = null, placeholder = null, over = null;

        p.addEventListener('pointerdown', (e) => {
          if (p.dataset.done) return;
          pointer = e.pointerId;
          startX = e.clientX; startY = e.clientY;
          try { p.setPointerCapture(pointer); } catch { /* algunos navegadores antiguos */ }
        });

        p.addEventListener('pointermove', (e) => {
          if (e.pointerId !== pointer) return;
          if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
            dragging = true;
            const r = p.getBoundingClientRect();
            // Centramos la pieza (ya a tamaño de hueco) bajo el dedo.
            dx = slotSize / 2; dy = slotSize / 2;
            placeholder = el('div.piece', { style: { visibility: 'hidden', width: r.width + 'px', height: r.height + 'px' } });
            p.after(placeholder);
            p.classList.add('dragging');
            p.classList.remove('selected');
            p.style.width = p.style.height = slotSize + 'px';
          }
          if (dragging) {
            p.style.left = e.clientX - dx + 'px';
            p.style.top = e.clientY - dy + 'px';
            const s = slotNear(e.clientX, e.clientY);
            if (s !== over) { over?.classList.remove('target'); over = s; over?.classList.add('target'); }
          }
        });

        const end = (e) => {
          if (e.pointerId !== pointer) return;
          pointer = null;
          over?.classList.remove('target');
          if (!dragging) { // fue un toque: seleccionar
            if (selected === p) { p.classList.remove('selected'); selected = null; return; }
            selected?.classList.remove('selected');
            selected = p;
            p.classList.add('selected');
            sfx.pop();
            return;
          }
          dragging = false;
          const s = slotNear(e.clientX, e.clientY);
          const ok = s && Number(s.dataset.k) === Number(p.dataset.k) && !s.querySelector('.piece');
          placeholder?.remove();
          if (ok) { place(p, s); return; }
          // Vuelve a la bandeja.
          p.classList.remove('dragging');
          p.style.left = p.style.top = p.style.width = p.style.height = '';
          if (s) wrong(p);
        };
        p.addEventListener('pointerup', end);
        p.addEventListener('pointercancel', end);
      }

      /** Hueco libre más cercano al punto (con margen generoso para dedos pequeños). */
      function slotNear(x, y) {
        let best = null, bestD = Infinity;
        for (const s of slots) {
          if (s.querySelector('.piece')) continue;
          const r = s.getBoundingClientRect();
          const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
          if (d < bestD) { bestD = d; best = s; }
        }
        return bestD < slotSize * 0.75 ? best : null;
      }

      return pieces;
    }
    play();
  }
  start();
  return () => cleanupResize?.();
}
