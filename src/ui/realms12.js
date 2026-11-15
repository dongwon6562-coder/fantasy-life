// 12단계 갈래 화면: 원수와 복수(src/feud). 읽기만 한다.
import { feudInfo } from '../feud/index.js';
import { exploreStatus } from '../explore/index.js';
import { byId } from '../game.js';
import { PLACES } from '../places.js';
import { portrait } from '../art/portrait.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;

/* ---------- 원한: '사람들' 화면 카드 ---------- */
export function renderFeud(game) {
  const f = safe(() => feudInfo(game));
  if (!f) return '';
  if (!f.foes.length && !f.nemeses.length && !f.avenged && !f.forgiven) return '';
  const SHOW = 4;
  const row = (x) => {
    const p = byId(game, x.id);
    const tags = [];
    if (x.inherited) tags.push([`${x.gen + 1}대째 이어진 원한`, 'dark']);
    if (x.formerFriend) tags.push(['옛 친구', '']);
    if (x.strikes) tags.push([`나를 친 적 ${x.strikes}번`, 'dark']);
    const where = PLACES[x.place]?.name;
    return `<li class="kn-kid fd-foe${x.heat >= 65 ? ' hot' : ''}">
      ${p ? `<button class="kn-face" data-person="${x.id}" aria-label="${esc(x.name)}의 기록">${portrait(game, p, { size: 48 })}</button>` : ''}
      <div class="kn-txt">
        <div class="top"><strong>${esc(x.name)}</strong><span class="note">${x.age}살${where ? ` · ${esc(where)}` : ''}</span></div>
        <span class="note fd-heat"><b>원한 ${x.heat}</b> · ${esc(x.heatWord)}</span>
        <div class="fd-bar">${bar(x.heat, 'low')}</div>
        ${x.why.length ? `<span class="note fd-why">${x.why.slice(-2).map((w) => esc(w)).join(' · ')}</span>` : ''}
        ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
      </div></li>`;
  };
  const top = f.foes.slice(0, SHOW).map(row).join('');
  const rest = f.foes.slice(SHOW);
  const sum = [];
  if (f.avenged) sum.push(`갚은 원한 ${f.avenged}`);
  if (f.forgiven) sum.push(`풀어 준 원한 ${f.forgiven}`);
  return `<section class="card feud-card">
    <h2>원한 <small>${f.foes.length ? `나를 미워하는 사람 ${f.foes.length}명` : '지금은 원수가 없다'}</small></h2>
    ${top ? `<ul class="kn-list">${top}</ul>` : ''}
    ${rest.length ? `<details class="pl-more"><summary>그 밖의 원수 ${rest.length}명</summary><ul class="kn-list">${rest.map(row).join('')}</ul></details>` : ''}
    ${f.houses.length ? `<p class="note">원수 집안: ${f.houses.map((h) => `${esc(h.name)} 집안 (${h.count}명${h.gens > 1 ? `, ${h.gens}대째` : ''})`).join(', ')}</p>` : ''}
    ${f.nemeses.length ? `<p class="note">선대의 원수: ${f.nemeses.map((n) => `${esc(n.name)}${n.place && PLACES[n.place] ? ` (${esc(PLACES[n.place].name)})` : ''}`).join(', ')}</p>` : ''}
    ${sum.length ? `<p class="note">${sum.join(' · ')}</p>` : ''}
    ${f.log.length ? `<details class="pl-more"><summary>원한에 얽힌 일 ${f.log.length}가지</summary><ul class="pl-news">${f.log.slice().reverse().map((n) => `<li><time>${n.y}년 ${n.m}월</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

/* ---------- 지도에 없는 땅: '지도' 화면 카드와 원정 중 '이번 달' 카드 ---------- */
const pname = (p) => PLACES[p]?.name ?? p;
const PHASE = { out: '가는 길', back: '돌아오는 길' };
function expRows(x) {
  const out = x.phase !== 'back';
  const backAll = Math.max(1, Math.ceil(x.legs / 2));
  const pct = out ? (x.leg / Math.max(1, x.legs)) * 100 : (1 - Math.min(backAll, x.back) / backAll) * 100;
  return `<p class="note">${x.months}달째${x.comps.length ? ` · 함께 가는 이: ${esc(x.comps.join(', '))}` : ''}</p>
    <div class="wd-row"><span>${PHASE[x.phase] ?? '길'}</span>${bar(pct, 'kin')}<span class="v">${out ? `${x.leg}/${x.legs}마디` : `${x.back}달 남음`}</span></div>
    <div class="wd-row"><span>사기</span>${bar(x.morale, x.morale < 35 ? 'low' : '')}<span class="v">${x.morale}</span></div>
    <div class="sm-chips">
      <span class="sm-chip${x.food <= 1 ? ' down' : ''}"><span>식량</span><b>${x.food}달 치</b></span>
      <span class="sm-chip"><span>짐꾼</span><b>${x.porters}</b></span>
      <span class="sm-chip${x.lostChance >= 30 ? ' down' : ''}"><span>길 잃을 걱정</span><b>${x.lostChance}%</b></span>
    </div>
    ${x.lost ? '<p class="note warn">길을 잃었다. 왔던 길이 보이지 않는다.</p>' : ''}
    ${x.hungry ? '<p class="note warn">먹을 것이 모자라 다들 굶주린다.</p>' : ''}
    ${x.sites.length ? `<p class="note">찾은 곳: ${esc(x.sites.join(', '))}</p>` : ''}
    ${x.finds.length ? `<p class="note">챙긴 것: ${esc(x.finds.join(', '))}</p>` : ''}
    ${x.dead.length ? `<p class="note">길에서 잃은 사람: ${esc(x.dead.map((d) => (typeof d === 'string' ? d : d?.name ?? '')).filter(Boolean).join(', '))}</p>` : ''}`;
}

export function renderExploreNow(game) {
  const s = safe(() => exploreStatus(game));
  const x = s?.expedition;
  if (!x) return '';
  return `<section class="card explore-now${x.lost || x.hungry ? ' bad' : ''}"><h2>원정 중 <small>${esc(x.regionName)}</small></h2>${expRows(x)}</section>`;
}

const KIND_WORD = { relic: '유물', tablet: '기록', map: '지도', gem: '보석', bone: '뼈' };
export function renderExplore(game) {
  const s = safe(() => exploreStatus(game));
  if (!s) return '';
  const any = s.onExpedition || s.trips || s.canPlanHere.length || s.pack.length || s.cache.length || s.firsts.length || s.given.length;
  if (!any) return '';
  const findLi = (f, price) => `<li><div class="top"><strong>${esc(f.name)}</strong><span class="note">${esc(KIND_WORD[f.kind] ?? '')}${f.civ ? ` · ${esc(f.civ)}` : ''}</span></div>
      <span class="note">${esc(f.desc)}</span>
      ${f.keep ? `<span class="note ok">지니면: ${esc(f.keep)}</span>` : ''}${f.curse ? `<span class="note warn">${esc(f.curse)}</span>` : ''}
      <span class="note">${esc(f.regionName)}에서 ${f.year}년 · 값 은화 ${f.value}닢${price != null ? ` · 여기서 팔면 ${price}닢` : ''}</span></li>`;
  const region = (r) => {
    const known = r.sites.filter((x) => x.first);
    return `<li class="${r.heart ? 'heart' : ''}"><div class="top"><strong>${esc(r.name)}</strong><span class="note">${esc(r.civ)}의 흔적${r.sea ? ' · 뱃길' : ''}</span></div>
      <span class="note">${esc(r.desc)}</span>
      <div class="wd-row"><span>그린 지도</span>${bar(r.mapped, 'mana')}<span class="v">${r.mapped}%</span></div>
      <span class="note">${esc(r.from.map(pname).join('·'))}에서 떠난다 · 오가는 데 ${r.months}달${r.trips ? ` · 내가 간 것 ${r.trips}번` : ''}</span>
      <span class="note">알려진 곳 ${known.length}/${r.sites.length}${known.length ? `: ${known.map((x) => `${esc(x.first.name ?? x.name)}${x.first.me ? ' ★' : x.first.family ? ' ☆' : ''}`).join(', ')}` : ''}</span></li>`;
  };
  const tags = [];
  if (s.fameWord) tags.push([s.fameWord, 'heir']);
  for (const f of s.firsts) tags.push([`처음 밟은 곳: ${f.name}${f.oldName && f.oldName !== f.name ? ` (${f.oldName})` : ''} ${f.year}년${f.family ? ' · 선대' : ''}`, 'gift']);
  return `<section class="card explore-card">
    <h2>지도에 없는 땅 <small>${s.trips ? `원정 ${s.trips}번` : '아직 떠난 적 없음'}</small></h2>
    ${s.expedition ? `<div class="tw-mem"><div class="top"><strong>${esc(s.expedition.regionName)}</strong><span class="note">원정 중</span></div>${expRows(s.expedition)}</div>` : ''}
    ${s.canPlanHere.length && !s.onExpedition ? `<p class="note">여기서 원정대를 꾸려 떠날 수 있다: ${s.canPlanHere.map((c) => `${esc(c.name)} (넉넉히 은화 ${c.full}닢, 가볍게 ${c.light}닢)`).join(', ')}</p>` : ''}
    ${tags.length ? `<div class="ct-tags">${tags.map(([t, cls]) => `<span class="ct-tag ${cls}">${esc(t)}</span>`).join('')}</div>` : ''}
    ${s.pack.length ? `<h3 class="sub">짐에 든 것 ${s.pack.length}</h3><ul class="ct-houses">${s.pack.map((f) => findLi(f, f.price)).join('')}</ul>
      <p class="note">${s.market ? '여기 시장에서 팔 수 있다. ' : ''}${s.academy ? `${esc(s.academy)}에 바칠 수 있다. ` : ''}숨겨 둘 수도 있다.</p>` : ''}
    ${s.cache.length ? `<details class="pl-more"><summary>숨겨 둔 것 ${s.cache.length}</summary><ul class="ct-houses">${s.cache.map((f) => findLi(f, null)).join('')}</ul></details>` : ''}
    ${s.given.length ? `<p class="note">학계에 바친 것: ${s.given.map((g) => `${esc(g.name)} (${esc(g.to ?? '')}, ${g.year}년)`).join(', ')}</p>` : ''}
    <details class="pl-more"><summary>미지의 땅 ${s.regions.length}곳</summary><ul class="ct-houses ex-regions">${s.regions.map(region).join('')}</ul>
      <p class="note">★ 내가 처음 밟은 곳 · ☆ 선대가 처음 밟은 곳</p></details>
    ${s.rivals.length ? `<p class="note">다른 원정대: ${s.rivals.map((r) => `${esc(r.name)}${r.leader ? ` (${esc(r.leader)})` : ''} · ${esc(r.region)}${r.alive ? '' : ' · 돌아오지 못함'}`).join(', ')}</p>` : ''}
    ${s.fallen.length ? `<p class="note">원정에서 잃은 사람: ${s.fallen.map((f) => `${esc(f.name)} (${f.year}년)`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>원정의 기록 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
