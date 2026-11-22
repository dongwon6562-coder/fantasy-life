// 33단계 시작 화면 '태어날 집안' 고르기. 집안이 넷을 넘으면 신분으로 걸러 보고, 짧은 칸을 누르면 아래에 자세히 펼친다.
// 집안 칸에 쓰는 것: name, standing, money, desc, 그리고 있으면 home/place/start(시작 고장), hope(집안이 바라는 것), burden(짐), perks(덕).
import { placeName } from '../places.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const first = (t) => { const m = String(t ?? '').match(/^.*?[.!?](\s|$)/); return (m ? m[0] : String(t ?? '')).trim(); };
const where = (f) => { const id = f.home ?? f.place ?? f.start ?? null; if (!id) return ''; return typeof id === 'string' && /[가-힣]/.test(id) ? id : safe(() => placeName(id), '') || ''; };
const text = (v) => (Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : '');

/** fams: 이 종족의 집안들, s: 시작 화면 상태(family, famFilter) */
export function renderFamilyPick(fams, s) {
  if (fams.length <= 4) {
    return `<div class="choice-row">${fams.map((f) => `
      <button class="choice" data-family="${f.id}" aria-pressed="${s.family === f.id}">
        <span class="tag">${esc(f.standing)} · 집안 돈 은화 ${f.money}닢</span>
        <strong>${esc(f.name)}</strong>
        <span>${esc(f.desc)}</span>
      </button>`).join('')}</div>`;
  }
  const kinds = [...new Set(fams.map((f) => f.standing).filter(Boolean))];
  const filt = kinds.includes(s.famFilter) ? s.famFilter : 'all';
  const shown = fams.filter((f) => filt === 'all' || f.standing === filt);
  const sel = fams.find((f) => f.id === s.family);
  const seg = kinds.length > 1 ? `<div class="seg filters fam-filter" role="group" aria-label="신분으로 보기">
      <button data-famf="all" aria-pressed="${filt === 'all'}">모두 ${fams.length}</button>
      ${kinds.map((k) => `<button data-famf="${esc(k)}" aria-pressed="${filt === k}">${esc(k)}</button>`).join('')}
    </div>` : '';
  const card = (f) => `<button class="choice fam-mini" data-family="${f.id}" aria-pressed="${s.family === f.id}">
      <strong>${esc(f.name)}</strong>
      <span class="tag">${esc(f.standing)} · 은화 ${f.money}닢${where(f) ? ` · ${esc(where(f))}` : ''}</span>
      <span>${esc(first(f.desc))}</span>
    </button>`;
  const detail = sel ? `<div class="fam-detail" aria-live="polite">
      <div class="fd-top"><strong>${esc(sel.name)}</strong><span class="tag">${esc(sel.standing)} · 집안 돈 은화 ${sel.money}닢${where(sel) ? ` · ${esc(where(sel))}에서 태어난다` : ''}</span></div>
      <p>${esc(sel.desc)}</p>
      ${text(sel.hope) ? `<p class="note"><b>집안이 바라는 것</b> ${esc(text(sel.hope))}</p>` : ''}
      ${text(sel.perks) ? `<p class="note"><b>물려받는 것</b> ${esc(text(sel.perks))}</p>` : ''}
      ${text(sel.burden) ? `<p class="note"><b>짊어진 것</b> ${esc(text(sel.burden))}</p>` : ''}
    </div>` : '<p class="note fam-hint">집안을 누르면 여기에 자세히 나온다.</p>';
  return `${seg}<div class="fam-grid">${shown.map(card).join('')}</div>${detail}`;
}

/** 걸러 보기 단추. rerender: 시작 화면 다시 그리기 */
export function bindFamilyPick(s, rerender) {
  document.querySelectorAll('[data-famf]').forEach((b) => b.onclick = () => { s.famFilter = b.dataset.famf; rerender(); });
}
