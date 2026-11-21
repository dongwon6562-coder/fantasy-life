// 27단계 시작 화면의 '타고난 것' (src/heredity의 birthOptions). 집안 고르기 다음에 놓인다.
// 평범하게 / 큰 재능 하나. 성격(두 가지까지)과 머리·눈 빛깔은 원하면 접힌 칸을 열어 고른다.
// 고른 것은 ui.setup에 둔다: birthMode, gift, traits[], hair, eyes. birthValue()가 newGame의 birth 값을 만든다.
import { birthOptions } from '../heredity/index.js';
import { icon } from '../art/icons.js';
import { esc } from './util.js';
import { vignetteImage } from '../art/vignette.js';

const ICON = { hammer: 'smith', herb: 'herb' };
const opts = (race) => { try { return birthOptions(race); } catch (e) { console.error(e); return null; } };

export function renderBirthPick(s, race) {
  const o = opts(race);
  if (!o) return '';
  const mode = s.birthMode ?? 'plain';
  const traits = s.traits ?? [];
  const picked = traits.length + (s.hair != null ? 1 : 0) + (s.eyes != null ? 1 : 0);
  const trName = (id) => o.traits.find((t) => t.id === id)?.name ?? '';
  let art = '';
  try { art = vignetteImage({ plate: 'gift', year: 500, month: 3 }); } catch (e) { console.error(e); }
  return `<section class="birth-pick">
    <h2>타고난 것</h2>
    ${art ? `<img class="bt-art" src="${art}" alt="창으로 드는 빛 아래 요람에 누운 아이">` : ''}
    <div class="seg birth-mode" role="group" aria-label="타고난 것">
      ${o.modes.map((m) => `<button data-bmode="${m.id}" aria-pressed="${mode === m.id}">${esc(m.name)}</button>`).join('')}
    </div>
    <p class="note">${esc(o.modes.find((m) => m.id === mode)?.line ?? '')}</p>
    ${mode === 'gift' ? `<div class="choice-row bt-gifts">
      ${o.gifts.map((x) => `<button class="choice bt-gift" data-gift="${x.id}" aria-pressed="${s.gift === x.id}">
        <span class="bt-ic">${icon(ICON[x.icon] ?? x.icon, 22)}</span><strong>${esc(x.name)}</strong><span>${esc(x.line)}</span>
      </button>`).join('')}
    </div>` : ''}
    <details class="bt-more"${s.birthMore || picked ? ' open' : ''}>
      <summary>성격과 생김새도 고르기${picked ? ` <small>(${picked}가지 고름)</small>` : ' <small>(고르지 않으면 하늘이 정한다)</small>'}</summary>
      <h3>성격 <small>${o.maxTraits}가지까지${traits.length ? ` · ${traits.map(trName).map(esc).join(', ')}` : ''}</small></h3>
      <div class="bt-chips">
        ${o.traits.map((t) => { const on = traits.includes(t.id); const off = !on && (traits.includes(t.opp) || traits.length >= o.maxTraits); return `<button class="bt-chip" data-btrait="${t.id}" aria-pressed="${on}"${off ? ' disabled' : ''}>${esc(t.name)}</button>`; }).join('')}
      </div>
      <h3>머리 빛깔</h3>
      <div class="bt-chips">
        <button class="bt-chip" data-bhair="" aria-pressed="${s.hair == null}">하늘이 정한다</button>
        ${o.looks.hair.map((n, i) => `<button class="bt-chip" data-bhair="${i}" aria-pressed="${s.hair === i}">${esc(n)}</button>`).join('')}
      </div>
      <h3>눈 빛깔</h3>
      <div class="bt-chips">
        <button class="bt-chip" data-beyes="" aria-pressed="${s.eyes == null}">하늘이 정한다</button>
        ${o.looks.eyes.map((n, i) => `<button class="bt-chip" data-beyes="${i}" aria-pressed="${s.eyes === i}">${esc(n)}</button>`).join('')}
      </div>
    </details>
  </section>`;
}

export function bindBirth(s, rerender) {
  document.querySelectorAll('[data-bmode]').forEach((b) => b.onclick = () => { s.birthMode = b.dataset.bmode; rerender(); });
  document.querySelectorAll('[data-gift]').forEach((b) => b.onclick = () => { s.gift = b.dataset.gift; rerender(); });
  document.querySelectorAll('[data-btrait]').forEach((b) => b.onclick = () => {
    const id = b.dataset.btrait, t = s.traits ?? [];
    s.traits = t.includes(id) ? t.filter((x) => x !== id) : [...t, id];
    s.birthMore = true; rerender();
  });
  document.querySelectorAll('[data-bhair]').forEach((b) => b.onclick = () => { s.hair = b.dataset.bhair === '' ? null : +b.dataset.bhair; s.birthMore = true; rerender(); });
  document.querySelectorAll('[data-beyes]').forEach((b) => b.onclick = () => { s.eyes = b.dataset.beyes === '' ? null : +b.dataset.beyes; s.birthMore = true; rerender(); });
  const more = document.querySelector('details.bt-more');
  if (more) more.ontoggle = () => { s.birthMore = more.open; };
}

// 종족이 바뀌면 빛깔 번호가 맞지 않으니 비운다
export function resetLooks(s) { s.hair = null; s.eyes = null; }

// 큰 재능을 골랐는데 재능을 안 골랐으면 아직 태어날 수 없다
export const birthReady = (s) => (s.birthMode ?? 'plain') !== 'gift' || !!s.gift;

export function birthValue(s) {
  const gift = (s.birthMode ?? 'plain') === 'gift' ? s.gift ?? null : null;
  const traits = s.traits ?? [];
  const looks = {};
  if (s.hair != null) looks.hair = s.hair;
  if (s.eyes != null) looks.eyes = s.eyes;
  if (!gift && !traits.length && !Object.keys(looks).length) return undefined;
  return { gift, traits, looks: Object.keys(looks).length ? looks : undefined };
}
