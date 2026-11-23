// 37단계 '재혼과 의붓가족' 화면(src/stepfamily). 읽기만 한다.
// renderStepfamily: 사람들 화면 카드 (의붓부모·의붓자식·의붓형제마다 정, 함께한 해, 엄마·아빠라 부르는지, 족보에 올렸는지; 이 고장의 다른 재혼 집, 기록)
import { stepInfo } from '../stepfamily/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

export function renderStepfamily(game) {
  const s = safe(() => stepInfo(game));
  if (!s || (!s.blended && !s.log.length)) return '';
  const avg = s.people.length ? s.people.reduce((a, p) => a + p.warm, 0) / s.people.length : 0;
  const v = s.people.some((p) => p.gone) ? 'door' : avg < 20 ? 'quarrel' : avg >= 60 ? 'peace' : 'table';
  const art = safe(() => vignetteImage({ plate: 'stepfamily', variant: v, year: game.date.year, month: game.date.month }), '');
  const ALT = { door: '집을 나서는 의붓자식', quarrel: '식탁의 다툼', peace: '한자리에 모인 식구', table: '서먹한 저녁 식탁' };
  return `<section class="card sf-card">
    <h2>새로 맺은 식구</h2>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[v]}">` : ''}
    ${s.people.map((p) => `<div class="fr-one">
      <p><strong>${esc(p.name)}</strong> · ${esc(p.kind)} · ${p.age}살 · ${p.years ? `${p.years}년째` : '올해부터'}${p.called ? ' · 식구라 부른다' : ''}${p.gone ? ' · 집을 나갔다' : ''}</p>
      <div class="wd-row kn-row"><span>${esc(p.word)}</span>${bar(p.warm, p.warm < 20 ? 'low' : 'kin')}<span class="v">${p.warm}</span></div>
    </div>`).join('')}
    ${s.npc.length ? `<p class="note">이 고장의 다른 재혼 집: ${s.npc.map((x) => `${esc(J(x.a, '과/와'))} ${esc(x.b)}${x.kids ? `(아이 ${x.kids})` : ''}, ${esc(x.word)}`).join(' · ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>새 식구와 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
