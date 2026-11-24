// 폰 손맛: 누르는 순간 반응(.pressing), 화면 가장자리에서 밀어 옆 탭으로 넘기기.
// '움직임 줄이기'면 손가락을 따라 화면이 움직이지 않는다(넘기기는 된다). 한 번만 건다.
import { reducedMotion } from './settings.js';

const PRESS = 'button, summary, a[href], .act, [role="button"], label.chip, .seg button';
const EDGE = 28;        // 가장자리 폭(px): 여기서 시작한 밀기만 탭 넘기기
const GO = 72;          // 이만큼 밀면 넘어간다
const FLICK = 0.45;     // 또는 이 빠르기(px/ms) 넘게 휙 밀면

let installed = false;

/**
 * @param {{ canSwipe: () => boolean, neighbor: (dir: 1|-1) => ({ id: string, name: string, icon: string } | null), go: (dir: 1|-1) => void }} o
 */
export function installTouch(o) {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  // 누름: iOS는 :active가 늦거나 안 보여서 직접 표시한다. 손가락이 움직이면(스크롤) 바로 뗀다.
  let pressed = null, px = 0, py = 0;
  const release = () => { if (pressed) { pressed.classList.remove('pressing'); pressed = null; } };
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = e.target.closest?.(PRESS);
    if (!el || el.disabled) return;
    release();
    pressed = el; px = e.clientX; py = e.clientY;
    el.classList.add('pressing');
  }, { passive: true });
  document.addEventListener('pointermove', (e) => { if (pressed && Math.hypot(e.clientX - px, e.clientY - py) > 10) release(); }, { passive: true });
  for (const t of ['pointerup', 'pointercancel', 'dragstart']) document.addEventListener(t, () => setTimeout(release, 70), { passive: true });
  window.addEventListener('scroll', release, { passive: true });
  window.addEventListener('blur', release);

  // 가장자리 밀기
  let s = null; // { x, y, t, side, on, dir, hint }
  const main = () => document.querySelector('.layout > .main');
  const reset = (animate) => {
    const m = main();
    if (m) {
      if (animate && !reducedMotion()) { m.classList.add('swipe-back'); setTimeout(() => m.classList.remove('swipe-back'), 220); }
      m.style.transform = ''; m.style.opacity = '';
    }
    s?.hint?.remove();
    document.documentElement.classList.remove('swiping');
    s = null;
  };
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { if (s) reset(true); return; }
    const t = e.touches[0], w = window.innerWidth;
    const side = t.clientX <= EDGE ? -1 : t.clientX >= w - EDGE ? 1 : 0;
    if (!side || !o.canSwipe()) return;
    if (e.target.closest?.('input, textarea, .mapbox, .target-row, .filters, .wd-tabs, .act-jump, .pb-tools, .book-ov, .ways-ov, [data-noswipe]')) return;
    s = { x: t.clientX, y: t.clientY, t: performance.now(), side, on: false, dir: side };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!s) return;
    const t = e.touches[0], dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (!s.on) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { s = null; return; } // 세로 스크롤
      if (Math.abs(dx) < 12) return;
      if (Math.sign(dx) !== -s.side) { s = null; return; } // 가장자리 안쪽으로 미는 것만
      const nb = o.neighbor(s.dir);
      if (!nb) { s = null; return; }
      s.on = true;
      s.hint = document.createElement('div');
      s.hint.className = `swipe-hint ${s.side > 0 ? 'r' : 'l'}`;
      s.hint.setAttribute('aria-hidden', 'true');
      s.hint.innerHTML = `${nb.icon}<span>${nb.name}</span>`;
      document.body.appendChild(s.hint);
      document.documentElement.classList.add('swiping');
    }
    if (e.cancelable) e.preventDefault();
    const far = Math.min(1, Math.abs(dx) / GO);
    s.hint.style.setProperty('--k', far.toFixed(3));
    s.hint.classList.toggle('ready', Math.abs(dx) >= GO);
    if (!reducedMotion()) {
      const m = main();
      if (m) { m.style.transform = `translateX(${(dx * 0.32).toFixed(1)}px)`; m.style.opacity = String(1 - far * 0.25); }
    }
  }, { passive: false });
  const end = (e) => {
    if (!s) return;
    if (!s.on) { s = null; return; }
    const t = e.changedTouches?.[0];
    const dx = t ? t.clientX - s.x : 0, dt = Math.max(1, performance.now() - s.t);
    const go = Math.abs(dx) >= GO || (Math.abs(dx) > 30 && Math.abs(dx) / dt > FLICK);
    const dir = s.dir;
    if (go) { s.hint?.remove(); document.documentElement.classList.remove('swiping'); s = null; o.go(dir); }
    else reset(true);
  };
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', () => s && reset(true), { passive: true });
}
