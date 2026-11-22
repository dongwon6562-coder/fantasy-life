// 33단계 시작 화면 '태어날 집안' 고르기.
// 집안이 넷을 넘으면 태어나는 고장으로 묶어(에른 마을 / 다른 고장) 짧은 칸으로 보이고,
// 고른 집안은 그 묶음 바로 아래에 자세히 펼친다(집안이 바라는 것과 짐은 src/origins).
import { PLACES } from '../places.js';
import { originOf } from '../origins/index.js';
import { VILLAGE } from '../data.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const first = (t) => { const m = String(t ?? '').match(/^.*?[.!?](\s|$)/); return (m ? m[0] : String(t ?? '')).trim(); };
const where = (f) => (f.home ? PLACES[f.home]?.name ?? '' : '');

/** fams: 이 종족의 집안들, s: 시작 화면 상태(family) */
export function renderFamilyPick(fams, s) {
  if (fams.length <= 4) {
    return `<div class="choice-row">${fams.map((f) => `
      <button class="choice" data-family="${f.id}" aria-pressed="${s.family === f.id}">
        <span class="tag">${esc(f.standing)} · 집안 돈 은화 ${f.money}닢</span>
        <strong>${esc(f.name)}</strong>
        <span>${esc(f.desc)}</span>
      </button>`).join('')}</div>`;
  }
  const home = fams.filter((f) => !f.home), away = fams.filter((f) => f.home);
  const card = (f) => `<button class="choice fam-mini" data-family="${f.id}" aria-pressed="${s.family === f.id}">
      <strong>${esc(f.name)}</strong>
      <span class="tag">${esc(f.standing)} · 은화 ${f.money}닢${where(f) ? ` · ${esc(where(f))}` : ''}</span>
      <span>${esc(first(f.desc))}</span>
    </button>`;
  const detail = (f) => {
    const o = safe(() => originOf(f.id));
    return `<div class="fam-detail" aria-live="polite">
      <div class="fd-top"><strong>${esc(f.name)}</strong><span class="tag">${esc(f.standing)} · 집안 돈 은화 ${f.money}닢 · ${esc(where(f) || VILLAGE)}에서 태어난다</span></div>
      <p>${esc(f.desc)}</p>
      ${o?.want ? `<p class="note"><b>집안이 바라는 것</b> ${esc(o.want.name)}: ${esc(o.want.text)}</p>` : ''}
      ${o?.burden ? `<p class="note"><b>짊어진 것</b> ${esc(o.burden.name)}: ${esc(o.burden.text)}</p>` : ''}
    </div>`;
  };
  const group = (title, list) => {
    if (!list.length) return '';
    const sel = list.find((f) => f.id === s.family);
    // 고른 집안의 자세한 칸은 그 칸 바로 뒤에 (폰에서 멀리 내려가지 않게, 넓은 화면에서는 다음 줄 전체)
    return `<h3 class="fam-h">${esc(title)} <small>${list.length}</small></h3><div class="fam-grid">${list.map((f) => card(f) + (f === sel ? detail(f) : '')).join('')}</div>`;
  };
  return `${group(`${VILLAGE}에서`, home)}${group('다른 고장에서', away)}${s.family ? '' : '<p class="note fam-hint">집안을 누르면 그 자리에 자세히 나온다.</p>'}`;
}
