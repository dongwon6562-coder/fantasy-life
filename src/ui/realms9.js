// 9단계 갈래 화면: 자식 기르기(src/kin)와 집과 재산(src/estate). 읽기만 한다.
import { kinInfo } from '../kin/index.js';
import { estateStatus } from '../estate/index.js';
import { byId } from '../game.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const coin = (n) => (Number.isFinite(n) ? `은화 ${Math.round(n)}닢` : '—');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n))}`;

/* ---------- 자식 기르기: '사람들' 화면 맨 위 카드 ---------- */
const bondWord = (b) => (b >= 80 ? '깊이 따른다' : b >= 60 ? '잘 따른다' : b >= 40 ? '그럭저럭' : b >= 20 ? '서먹하다' : '등을 돌렸다');
export function renderKin(game) {
  const k = safe(() => kinInfo(game));
  if (!k || (!k.kids.length && !k.dead.length)) return '';
  const order = { home: 0, grown: 1, left: 2, disowned: 3 };
  const kids = [...k.kids].sort((a, b) => (order[a.status] - order[b.status]) || b.age - a.age);
  const card = (c) => {
    const p = byId(game, c.id);
    const tags = [];
    if (c.id === k.heirReady) tags.push(['대를 이을 아이', 'heir']);
    if (c.adopted) tags.push(['거둔 아이', '']);
    if (c.temperName) tags.push([`${c.temperName} 기질`, '']);
    if (c.giftName) tags.push([c.giftName, 'gift']);
    const line2 = [c.statusName, c.job, c.married ? '혼인함' : '', c.kids ? `자식 ${c.kids}명` : ''].filter(Boolean).join(' · ');
    return `<li class="kn-kid ${c.status}">
      ${p ? `<button class="kn-face" data-person="${c.id}" aria-label="${esc(c.name)}의 기록">${portrait(game, p, { size: 52 })}</button>` : ''}
      <div class="kn-txt">
        <div class="top"><strong>${esc(c.name)}</strong><span class="note">${c.age}살 · ${esc(c.word ?? '')}</span></div>
        <span class="note">${esc(line2)}</span>
        ${c.pathName ? `<div class="wd-row kn-row"><span>${esc(c.pathName)}</span>${bar(c.learned, 'kin')}<span class="v">${c.learned}</span></div>` : c.status === 'home' && c.age >= 6 ? '<span class="note">아직 가르칠 길을 정하지 않았다</span>' : ''}
        <div class="wd-row kn-row"><span>정</span>${bar(c.bond, c.bond < 30 ? 'low' : 'kin')}<span class="v">${esc(bondWord(c.bond))}</span></div>
        ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
      </div></li>`;
  };
  const home = kids.filter((c) => c.status === 'home').length;
  return `<section class="card kin-card">
    <h2>자식들 <small>${k.kids.length}명${home ? ` · 집에서 자라는 아이 ${home}` : ''}</small></h2>
    <ul class="kn-list">${kids.map(card).join('')}</ul>
    <p class="note">${k.will ? `유언: ${esc(k.will.label)}${k.will.heirName ? ` (${esc(k.will.heirName)})` : ''}` : '아직 유언을 남기지 않았다. 내가 죽으면 맏이가 잇는다.'}${k.canAdopt ? ' · 고아원에서 아이를 거둘 수 있다' : ''}</p>
    ${k.dead.length ? `<p class="note kn-dead">먼저 간 아이: ${k.dead.map((d) => `${esc(d.name)}${d.cause ? ` (${esc(d.cause)})` : ''}`).join(', ')}</p>` : ''}
  </section>`;
}

/* ---------- 집과 재산: '나' 화면 한 덩이 ---------- */
export function renderEstateBlock(game) {
  const s = safe(() => estateStatus(game));
  if (!s) return '';
  const any = s.homes.length || s.rentals.length || s.loans.length || s.deposits.length || s.bankrupt || s.hounded;
  if (!any) return '';
  const L = s.ledger;
  const led = [['세 받은 돈', L.rent, 1], ['투자 오르내림', L.invest, 1], ['하인 삯', L.wages, -1], ['빚 이자', L.interest, -1], ['고친 값', L.upkeep, -1]]
    .filter(([, v]) => v).map(([k, v, sg]) => `<span class="sm-chip ${sg * v > 0 ? 'up' : 'down'}"><span>${k}</span><b>${signed(sg * v)}</b></span>`).join('');
  const homes = s.homes.map((h) => `<li><div class="top"><strong>${esc(h.name)}의 ${esc(h.levelName)}</strong><span class="note">${h.living ? '여기 산다' : h.rented ? `세놓음 · 달마다 ${coin(h.rent)}` : '비어 있다'}</span></div>
      <div class="wd-row"><span>상태</span>${bar(h.cond, h.cond < 40 ? 'low' : '')}<span class="v">${esc(h.condWord)}</span></div>
      <span class="note">값 ${coin(h.worth)}${h.servants ? ` · 하인 ${h.servants}명 (달마다 ${coin(h.servantWage)})` : ''}</span></li>`).join('');
  const rentals = s.rentals.filter((r) => r.kind !== 'house').map((r) => `<li><div class="top"><strong>${esc(r.name)}의 ${esc(r.kindName)}</strong><span class="note">${r.tenant ? `${esc(r.tenant)}에게 세놓음` : '빌릴 사람을 찾는 중'}</span></div>
      <span class="note">달마다 ${coin(r.rent)}${r.unpaid ? ` · <b class="warn">밀린 세 ${r.unpaid}달</b>` : ''}${r.worth ? ` · 값 ${coin(r.worth)}` : ''}</span></li>`).join('');
  const loans = s.loans.map((l) => `<li class="${l.missed ? 'bad' : ''}"><div class="top"><strong>${esc(l.lenderName)}</strong><span class="v">${coin(l.principal)}</span></div>
      <span class="note">달마다 이자 ${(l.rate * 100).toFixed(1)}푼 · ${l.monthsLeft > 0 ? `${l.monthsLeft}달 안에 갚아야 한다` : '<b class="warn">갚을 날이 지났다</b>'}${l.missed ? ` · <b class="warn">못 낸 달 ${l.missed}</b>` : ''}${l.extended ? ' · 한 번 미룸' : ''}</span></li>`).join('');
  const deps = s.deposits.map((d) => `<li><div class="top"><strong>${esc(d.name)}</strong><span class="v">${coin(d.amount)}</span></div>${d.fortune != null ? `<div class="wd-row"><span>상단 형편</span>${bar(d.fortune, d.fortune < 35 ? 'low' : '')}<span class="v">${Math.round(d.fortune)}</span></div>` : ''}</li>`).join('');
  return `<div class="block estate-block">
    <h3>집과 재산</h3>
    <div class="es-sum">
      <div><span class="lbl">가진 돈</span><b>${coin(s.money)}</b></div>
      <div><span class="lbl">빚</span><b class="${s.debt ? 'warn' : ''}">${coin(s.debt)}</b></div>
      <div><span class="lbl">모두 합쳐</span><b>${coin(s.netWorth)}</b></div>
    </div>
    ${s.hounded >= 20 ? `<p class="note warn">빚쟁이가 뒤를 쫓는다${s.hounded >= 60 ? '. 문 앞에 사람이 서 있는 날이 잦다' : ''}.</p>` : ''}
    ${s.bankrupt ? `<p class="note">파산한 적이 ${s.bankrupt}번 있다.</p>` : ''}
    ${led ? `<div class="sm-row"><span class="lbl">지난달 장부</span><div class="sm-chips">${led}<span class="sm-chip"><span>남은 것</span><b>${signed(L.net)}</b></span></div></div>` : ''}
    ${homes ? `<h4 class="ct-h">내 집</h4><ul class="ct-houses">${homes}</ul>` : ''}
    ${rentals ? `<h4 class="ct-h">세놓는 땅과 가게</h4><ul class="ct-houses">${rentals}</ul>` : ''}
    ${loans ? `<h4 class="ct-h">빚</h4><ul class="ct-houses es-loans">${loans}</ul>` : ''}
    ${deps ? `<h4 class="ct-h">상단에 맡긴 돈</h4><ul class="ct-houses">${deps}</ul>` : ''}
  </div>`;
}
