// 13단계 '짐승과 함께' 화면(src/beasts). 읽기만 한다. '사람들' 화면 카드.
import { beastsStatus, FAMILIAR_FORMS } from '../beasts/index.js';
import { beastPortrait } from '../art/beastPortrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
// 사역마는 모습이 이름('까마귀')으로 저장돼 있어 그림 id('raven')로 바꿔 넘긴다
const formId = (sub) => FAMILIAR_FORMS.find((f) => f.name === sub || f.id === sub)?.id ?? sub;
const ageText = (y) => (y < 1 ? `${Math.max(1, Math.round(y * 12))}달` : `${Math.floor(y)}살`);

export function renderBeasts(game) {
  const s = safe(() => beastsStatus(game));
  if (!s) return '';
  if (!s.animals.length && !s.lost.length && !s.log.length) return '';
  const row = (a) => {
    const tags = [];
    if (s.mount?.id === a.id) tags.push(['타고 다님', 'heir']);
    if (a.familiar) tags.push(['사역마', 'gift']);
    if (a.beast) tags.push(['마수', 'dark']);
    if (a.old) tags.push(['늙음', '']);
    if (a.pow > 0) tags.push([`싸움 힘 +${a.pow}`, '']);
    if (a.price != null && a.tamed && a.beast) tags.push([`팔면 은화 ${a.price}닢`, '']);
    const art = safe(() => beastPortrait({ ...a.portrait, sub: a.familiar ? formId(a.portrait.sub) : a.portrait.sub, id: a.id, name: a.name, old: a.old, wild: !a.tamed }, { size: 48 }), '');
    return `<li class="kn-kid bs-animal${a.beast && !a.tamed ? ' wild' : ''}">
      ${art ? `<span class="kn-face bs-face" aria-hidden="true">${art}</span>` : ''}
      <div class="kn-txt">
        <div class="top"><strong>${esc(a.name)}</strong><span class="note">${esc(a.kindName)} · ${ageText(a.age)} · ${esc(a.ageWord)}</span></div>
        <div class="wd-row kn-row"><span>정 ${a.bond} · ${esc(a.bondWord)}</span>${bar(a.bond, 'kin')}</div>
        ${a.tamed ? '' : `<div class="wd-row kn-row"><span>길들임 ${a.trained}/100</span>${bar(a.trained, a.beast ? 'low' : '')}</div>`}
        ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
      </div></li>`;
  };
  const chips = [];
  if (s.animals.length) chips.push(['먹이 값', `달마다 ${s.feedPerMonth}닢`, s.hungry]);
  if (s.power) chips.push(['싸움에 보탬', `+${s.power}`, false]);
  if (s.hunt) chips.push(['사냥에 보탬', `+${s.hunt}`, false]);
  if (s.cavalry) chips.push(['군대', '기병', false]);
  return `<section class="card beasts-card">
    <h2>함께 사는 짐승 <small>${s.animals.length ? `${s.animals.length}/${s.max}마리` : '지금은 없다'}</small></h2>
    ${s.animals.length ? `<ul class="kn-list">${s.animals.map(row).join('')}</ul>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${s.hungry ? '<p class="note warn">먹이를 대지 못한 달이 있다. 석 달을 굶기면 달아난다.</p>' : ''}
    ${s.mount ? `<p class="note">${esc(s.mount.name)}을(를) 타고 다녀 길 위의 달이 준다.</p>` : ''}
    ${s.shop.length && s.animals.length < s.max ? `<p class="note">이 고장 장터에서 파는 짐승: ${s.shop.map((x) => `${esc(x.name)}${x.cub ? ' 새끼' : ''} (은화 ${x.price}닢)`).join(', ')}</p>` : ''}
    ${s.lost.length ? `<details class="pl-more"><summary>떠나보낸 짐승 ${s.lost.length}마리</summary><ul class="pl-news">${s.lost.slice().reverse().map((x) => `<li><time>${x.year}년</time><span>${esc(x.name)}${x.how ? ` · ${esc(x.how)}` : ''}${x.years ? ` (${x.years}년을 함께)` : ''}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>짐승과 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
