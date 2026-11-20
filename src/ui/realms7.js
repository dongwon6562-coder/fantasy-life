// 7단계 갈래 화면: 신앙(src/faith), 세계의 큰 인물(src/legends), 바다(src/sea). 읽기만 한다.
import { J } from '../narrative/text.js';
import { faithInfo, FEASTS } from '../faith/index.js';
import { tenGreats, legendsOf, legendName, playerRank, playerScore, legend } from '../legends/index.js';
import { PLACES } from '../places.js';
import { ROSTER } from '../legends/state.js';
import { placeName as legendPlace } from '../legends/world.js';
import { seaStatus } from '../sea/index.js';
import { L } from '../adventure/core.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

/* ---------- 신앙: '나' 화면 한 덩이 ---------- */
export function renderFaithBlock(game) {
  const f = safe(() => faithInfo(game));
  if (!f) return '';
  const none = f.god === 'none';
  const rows = [];
  if (f.title || f.sect) rows.push(['자리', [f.title, f.sect].filter(Boolean).join(' · ')]);
  if (f.holy > 0) rows.push(['신성력', String(f.holy)]);
  if (f.shrine) rows.push(['여기', f.shrine]);
  if (f.pilgrim) rows.push(['순례 길', `${J(f.pilgrim, '으로/로')} 가는 중`]);
  if (f.pilgrimages.length) rows.push(['다녀온 순례', f.pilgrimages.join(', ')]);
  if (f.dawn) rows.push(['검은 새벽', `${f.dawn} (아무도 알아서는 안 된다)`]);
  return `<div class="block faith-block">
    <h3>신앙</h3>
    <div class="fa-head"><strong>${esc(none ? '믿는 신이 없다' : f.name)}</strong>${none ? '' : `<span class="note">${esc(f.deity)}</span>`}</div>
    ${none ? '' : `<div class="wd-row fa-dev"><span>믿음</span>${bar(f.devotion, 'faith')}<span class="v">${esc(f.devotionWord)}</span></div>`}
    ${f.feast ? `<p class="fa-feast">이번 달은 <b>${esc(f.feast)}</b>. ${esc(FEASTS.find((x) => x.name === f.feast)?.text ?? '')}</p>` : ''}
    ${rows.length ? `<dl class="yt-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    ${f.suspicionWord ? `<p class="note warn">이단 의심: ${esc(f.suspicionWord)}</p>` : ''}
  </div>`;
}

/* ---------- 큰 인물: 레오니아 연대기 '십강' 칸 ---------- */
// 게임 장소 이름을 먼저, 그다음 큰 인물 쪽 이름 ('far'는 먼 곳)
const whereName = (id) => (id && id !== 'far' && PLACES[id]?.name) || legendPlace(id);
const KIND = { mage: '마도사', sword: '검사', demon: '마족', dragon: '용', holy: '성기사', adventurer: '모험가', beast: '수인', dwarf: '드워프' };
export function renderLegends(game) {
  const ranks = safe(() => tenGreats(game), []);
  const known = safe(() => legendsOf(game), []);
  const pr = safe(() => playerRank(game));
  const score = safe(() => playerScore(game), 0);
  const here = L(game).place;
  const desc = (id) => ROSTER.find((r) => r.id === id)?.desc ?? '';
  const rankRows = ranks.map((r) => `<li class="${r.isPlayer ? 'me' : ''}${r.alive === false ? ' dead' : ''}">
      <span class="lg-n">${r.rank}</span>
      <div><strong>${r.isPlayer ? `${esc(r.name)} (나)` : `${esc(r.title)} ${esc(r.name)}`}</strong>
      <span class="note">${r.isPlayer ? '대륙이 내 이름을 안다' : `${r.place ? esc(whereName(legend(game, r.id)?.at) || r.place) : '있는 곳을 아는 이가 없다'}${r.role ? ` · 나의 ${esc(r.role)}` : ''}`}</span></div>
    </li>`).join('');
  const knownRows = known.map((x) => `<li class="lg-card${x.alive ? '' : ' dead'}${x.at === here && x.alive && !x.hidden ? ' here' : ''}">
      <div class="top"><strong>${esc(legendName(x))}</strong><span class="k">${esc(KIND[x.kind] ?? '')}</span></div>
      <span class="note">${x.alive ? `${x.age != null ? `${Math.floor(x.age)}살 · ` : ''}${x.hidden ? '어디 있는지 모른다' : esc(whereName(x.at))}${x.at === here && !x.hidden ? ' · 지금 이 고장에 있다' : ''}` : '세상을 떠났다'}${x.role ? ` · 나의 ${{ master: '스승', foe: '적', patron: '은인' }[x.role]}` : x.met ? ' · 만난 적 있다' : ''}</span>
      <p>${esc(desc(x.id))}</p>
    </li>`).join('');
  return `<div class="legends">
    <h3 class="sub">십강 <small>모험가 길드와 마도사 협회가 해마다 발표한다</small></h3>
    ${rankRows ? `<ol class="lg-rank">${rankRows}</ol>` : '<p class="note">아직 발표된 명단이 없다.</p>'}
    <p class="note">${pr ? `나는 십강 ${pr}위다.` : score >= 40 ? '내 이름이 십강 언저리에서 오르내린다는 말이 있다.' : '십강은 아직 먼 이야기다. 고서클 마법사나 검성쯤 되어야 이름이 오른다.'}</p>
    <h3 class="sub">내가 아는 큰 인물</h3>
    ${knownRows ? `<ul class="lg-known">${knownRows}</ul>` : '<p class="note">아직 큰 인물을 직접 본 적이 없다. 그들도 어딘가에서 자기 삶을 살고 있다.</p>'}
  </div>`;
}

/* ---------- 바다: 지도 아래 카드 ---------- */
export function renderSea(game) {
  const s = safe(() => seaStatus(game));
  if (!s) return '';
  const show = s.port || s.voyage || s.ship || s.cargo || s.pirate || s.voyages;
  if (!show) return '';
  const parts = [];
  if (s.voyage) parts.push(`<div class="sea-voy"><span class="lbl">바다 위</span><strong>${esc(J(s.voyage.toName, '으로/로'))} 가는 중</strong><span class="note">${s.voyage.left}달 남음 · ${s.voyage.own ? '내 배' : s.voyage.work ? '뱃일을 거들며' : '손님으로'}</span></div>`);
  if (s.port && s.routes.length) parts.push(`<h3 class="sub">${esc(s.port.name)}에서 떠나는 배</h3><ul class="sea-routes">${s.routes.map((r) => `<li><strong>${esc(r.name)}</strong><span class="note">${r.months}달 · 뱃삯 은화 ${r.fare}닢</span></li>`).join('')}</ul><p class="note">할 일의 '배 타기'로 부두에 나가 고른다. 뱃일을 거들면 공짜로 탈 수 있다.</p>`);
  if (s.ship) parts.push(`<div class="sea-ship"><span class="lbl">내 배</span><strong>${esc(s.ship.name)}</strong><span class="note">${esc(s.ship.kindName)} · 짐칸 ${s.ship.hold} · 선원 품삯 달마다 은화 ${s.ship.crewWage}닢${s.ship.unpaid ? ` · <b class="warn">밀린 품삯 ${s.ship.unpaid}달</b>` : ''}</span>
    <div class="wd-row"><span>선체</span>${bar(s.ship.hull, s.ship.hull < 40 ? 'low' : '')}<span class="v">${Math.round(s.ship.hull)}</span></div></div>`);
  if (s.cargo) parts.push(`<p class="sea-cargo">실은 짐: <b>${esc(s.cargo.name)} ${s.cargo.qty}</b> (산 값 은화 ${s.cargo.cost}닢${s.cargo.from ? `, ${esc(s.cargo.from)}에서` : ''})</p>`);
  if (s.port && s.prices.length) parts.push(`<details class="sea-prices"><summary>이 항구의 물건 값</summary><table><thead><tr><th>물건</th><th>살 때</th><th>팔 때</th></tr></thead><tbody>${s.prices.map((p) => `<tr class="${p.raw > p.base * 1.15 ? 'hi' : p.raw < p.base * 0.85 ? 'lo' : ''}"><td>${esc(p.name)}</td><td>${p.buy}</td><td>${p.sell}</td></tr>`).join('')}</tbody></table><p class="note">붉은 줄은 여기서 비싼 것, 초록 줄은 싼 것.</p></details>`);
  const facts = [];
  if (s.sailing) facts.push(`항해술 ${s.sailing}`);
  if (s.voyages) facts.push(`바닷길 ${s.voyages}번`);
  if (s.profit) facts.push(`장사 이문 은화 ${s.profit}닢`);
  if (s.monsters) facts.push(`바다 마물 ${s.monsters}`);
  if (s.pirateKills) facts.push(`잡은 해적 ${s.pirateKills}`);
  if (s.pirate) parts.push(`<p class="sea-pirate">해적: <b>${esc(s.pirate.rankName ?? '')}</b> · 약탈 ${s.pirate.raids}번${s.hunted >= 20 ? ` · <b class="warn">해군이 쫓는다 (${s.hunted})</b>` : ''}${s.traitor ? ' · 동료를 판 자' : ''}</p>`);
  return `<section class="card sea-card"><h2>바다 <small>${esc(facts.join(' · '))}</small></h2>${parts.join('')}</section>`;
}
