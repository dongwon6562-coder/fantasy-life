// 13단계 '제자와 문하' 화면(src/mentor). 읽기만 한다. '사람들' 화면 카드.
import { J } from '../narrative/text.js';
import { mentorInfo } from '../mentor/index.js';
import { byId } from '../game.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const yearsOf = (months) => (months >= 12 ? `${Math.floor(months / 12)}년째` : `${Math.max(1, months)}달째`);

export function renderMentor(game) {
  const s = safe(() => mentorInfo(game));
  if (!s) return '';
  if (!s.disciples.length && !s.grads.length && !s.school && !s.log.length && !s.shopApprentices.length) return '';
  const row = (d) => {
    const p = byId(game, d.id);
    const tags = [];
    if (d.kid) tags.push(['내 자식', 'heir']);
    if (d.gen > 0) tags.push([`${d.gen + 1}대째 제자`, '']);
    return `<li class="kn-kid mt-dis${d.loyalty < 25 ? ' cold' : ''}">
      ${p ? `<button class="kn-face" data-person="${d.id}" aria-label="${esc(d.name)}의 기록">${portrait(game, p, { size: 48 })}</button>` : ''}
      <div class="kn-txt">
        <div class="top"><strong>${esc(d.name)}</strong><span class="note">${d.age}살 · ${esc(d.artName)} · ${yearsOf(d.months)}</span></div>
        <div class="wd-row kn-row"><span>솜씨 ${d.skill} · ${esc(d.skillWord)}</span>${bar(d.skill)}</div>
        <div class="wd-row kn-row"><span>따르는 마음 ${d.loyalty}</span>${bar(d.loyalty, d.loyalty < 40 ? 'low' : 'kin')}</div>
        <span class="note">${esc(d.loyaltyWord)} · ${esc(d.talentWord)}</span>
        ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
      </div></li>`;
  };
  const sc = s.school;
  const school = sc ? `<div class="tw-mem mt-school${sc.closed ? ' closed' : ''}">
      <div class="top"><strong>${esc(sc.name)}</strong><span class="note">${esc(sc.artName)} ${esc(sc.house)} · ${esc(sc.placeName)}${sc.founded ? ` · ${sc.founded}년 세움` : ''}</span></div>
      ${sc.closed ? '<p class="note">문을 닫았다.</p>' : `<div class="wd-row kn-row"><span>이름 ${sc.prestige} · ${esc(sc.prestigeWord)}</span>${bar(sc.prestige, 'kin')}</div>
      <span class="note">문하생 ${sc.members}명 · 이끄는 이 ${esc(sc.head)}${sc.gens > 1 ? ` · ${sc.gens}대째` : ''}</span>`}
      ${sc.heads.length > 1 ? `<span class="note">대대로 이끈 이: ${sc.heads.map((h) => `${esc(h.name)}${h.y ? ` (${h.y}년)` : ''}`).join(' → ')}</span>` : ''}
    </div>` : '';
  const sum = [];
  if (s.taught) sum.push(`평생 가르친 제자 ${s.taught}명`);
  if (s.betrayals) sum.push(`등 돌린 제자 ${s.betrayals}명`);
  const head = s.disciples.length ? `제자 ${s.disciples.length}/${s.cap}명` : s.school ? esc(s.school.name) : '지금은 제자가 없다';
  return `<section class="card mentor-card">
    <h2>제자와 문하 <small>${head}</small></h2>
    ${school}
    ${s.disciples.length ? `<ul class="kn-list">${s.disciples.map(row).join('')}</ul>` : ''}
    ${!s.disciples.length && s.canTeach ? `<p class="note">${esc(J(s.arts.map((a) => a.name).join(', '), '을/를'))} 가르칠 만큼 솜씨가 익었다. 할 일의 '제자 들이기'로 제자를 받을 수 있다.</p>` : ''}
    ${s.shopApprentices.length ? `<p class="note">가게에서 일 배우는 아이: ${esc(s.shopApprentices.join(', '))}</p>` : ''}
    ${s.grads.length ? `<details class="pl-more"><summary>떠나보낸 제자 ${s.grads.length}명</summary><ul class="ct-houses mt-grads">${s.grads.slice().reverse().map((x) => `<li><div class="top"><strong>${esc(x.name)}</strong><span class="note">${esc(x.artName)} · ${x.y}년</span></div><span class="note">${esc(x.fate)}</span></li>`).join('')}</ul></details>` : ''}
    ${sum.length ? `<p class="note">${sum.join(' · ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>가르침에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
