// 17단계 '하인과 식솔' 화면(src/household). 읽기만 한다. '사람들' 화면 카드.
// 우리 집 하인(얼굴·맡은 일·충성·불만·몇 대째), 이름 없는 하인 수, 삯, 대를 이어 섬기는 집안,
// 내가 하인으로 사는 큰 집(지위·신임·의심), 우리 집안이 섬기던 집, 기록.
import { householdInfo, householdState } from '../household/index.js';
import { byId } from '../game.js';
import { PLACES } from '../places.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

export function renderHousehold(game) {
  const s = safe(() => householdInfo(game));
  if (!s) return '';
  const unnamedN = Object.values(s.unnamed).reduce((a, n) => a + n, 0);
  if (!s.staff.length && !unnamedN && !s.service && !s.serviceLine && !s.lines.length && !s.log.length) return '';
  const raw = safe(() => householdState(game).staff, []);
  const staff = s.staff.map((x, i) => ({ ...x, pid: raw[i]?.pid ?? null }));
  const li = (x) => {
    const p = x.pid ? byId(game, x.pid) : null;
    const face = p ? `<button class="kn-face" data-person="${x.pid}" aria-label="${esc(x.name)}의 기록">${portrait(game, p, { size: 40 })}</button>` : '';
    const bits = [x.roleName];
    if (!x.here) bits.push(x.placeName);
    bits.push(x.years ? `${x.years}년째` : '올해 들임');
    if (x.line?.gens > 1) bits.push(`${x.line.surname} 집안 ${x.line.gens}대째`);
    if (x.masters > 1) bits.push(`주인 ${x.masters}대를 섬김`);
    return `<li class="vl-nb hh-staff">${face}
      <span class="vl-nb-txt"><strong>${esc(x.name)}</strong><span class="note">${bits.map(esc).join(' · ')}</span>
      <span class="hh-bars"><span class="wd-row kn-row"><span>충성 · ${esc(x.loyaltyWord)}</span>${bar(x.loyalty, x.loyalty < 30 ? 'low' : 'kin')}</span>
      ${x.grievanceWord ? `<span class="note warn">불만: ${esc(x.grievanceWord)}</span>` : ''}</span></span></li>`;
  };
  const S = s.service;
  return `<section class="card household-card">
    <h2>하인과 식솔 <small>${staff.length || unnamedN ? `우리 집 사람 ${staff.length + unnamedN}명 · 달마다 삯 은화 ${s.wages}닢` : '남의 집 살이'}</small></h2>
    ${staff.length ? `<ul class="vl-nbs hh-list">${staff.map(li).join('')}</ul>` : ''}
    ${unnamedN ? `<p class="note">이름을 다 모르는 하인: ${Object.entries(s.unnamed).map(([pl, n]) => `${esc(PLACES[pl]?.name ?? pl)} ${n}명`).join(', ')}</p>` : ''}
    ${s.lines.length ? `<p class="note">대를 이어 섬기는 집안: ${s.lines.map((l) => `${esc(l.surname)} 집안 ${l.gens}대${l.serving ? '' : ' (지금은 없음)'}`).join(', ')}</p>` : ''}
    ${S ? `<h3 class="sub">내가 섬기는 집</h3>
      <div class="hh-serve"><div class="top"><strong>${esc(S.houseName)}</strong><span class="note">${esc(S.placeName)} · ${S.years ? `${S.years}년째` : '올해부터'}${S.line > 1 ? ` · 우리 집안 ${S.line}대째` : ''}</span></div>
        <span class="note">주인 ${esc(S.head ?? '')} · 내 자리: <b>${esc(S.rankName ?? '')}</b></span>
        <div class="wd-row kn-row"><span>신임 · ${esc(S.trustWord)}</span>${bar(S.trust, 'kin')}</div>
        ${S.suspicion >= 15 ? `<div class="wd-row kn-row"><span>의심${S.suspicionWord ? ` · ${esc(S.suspicionWord)}` : ''}</span>${bar(S.suspicion, 'low')}</div>` : ''}</div>` : ''}
    ${!S && s.serviceLine ? `<p class="note">우리 집안은 ${esc(s.serviceLine.name)}에서 ${s.serviceLine.gens}대를 섬겼다. 자식도 그 집에 들어갈 수 있다.</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>집안 사람들에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
