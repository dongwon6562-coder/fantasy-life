// 23단계 '목축과 유목' 화면(src/herd). 읽기만 한다.
// renderHerdNow: 이번 달 화면 접는 카드 (내 떼가 있을 때: 마릿수, 꼴과 겨울, 떼의 기운, 병, 기른 말, 이웃 목장, 무리)
// renderHerdLine: 떼 없이 유목민 무리에만 들었을 때 한 줄
// renderHerd: 지도 화면 카드 (가축 시세, 유목민 무리들이 이번 철 머무는 곳). 목동 일을 해 봤거나 떼·무리가 있을 때만.
// renderHerdBlock: '나' 화면 덩이 (목동 솜씨, 늘고 잃고 판 짐승, 이름난 말, 지난 떼, 기록)
import { herdStatus } from '../herd/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const SEASON = { winter: '겨울', spring: '봄', summer: '여름', autumn: '가을' };
const qWord = (q) => (q >= 70 ? '명마의 피' : q >= 45 ? '좋은 말' : '보통 말');
const steedRow = (h) => `<li><div class="wd-row kn-row"><span><strong>${esc(h.name)}</strong> · ${h.ageYears}살 · ${esc(qWord(h.quality))}${h.fame ? ` · 이긴 경주 ${h.fame}번` : ''}${h.kept ? ' · 내 말' : h.trained >= 100 ? ' · 다 길들었다' : ''}</span>${bar(h.kept ? 100 : h.trained, 'kin')}</div></li>`;
const bandLine = (b) => `${esc(b.name)}에 들었다 · ${esc(b.word)}${b.elder ? ' · 어른 자리' : ''} · 지금 ${esc(b.campName)}, 다음 철 ${esc(b.next)}`;

// 떼 없이 무리에만 들었을 때: 이번 달 한 줄 알림 모음에 들어간다
export function renderHerdLine(game) {
  const s = safe(() => herdStatus(game));
  return s && !s.flock && s.band ? `<section class="card herd-now"><p class="note"><b>유목</b> ${bandLine(s.band)}</p></section>` : '';
}

export function renderHerdNow(game, ui = {}) {
  const s = safe(() => herdStatus(game));
  const F = s?.flock;
  if (!F) return '';
  const counts = F.stock.filter((x) => x.count > 0).map((x) => `${x.name} ${x.count}`).join(', ') || '남은 짐승이 없다';
  const short = F.winterMonths != null && F.winterMonths < 3 && ['winter', 'autumn'].includes(s.season);
  const sub = F.sick ? `${F.sick.name} 돈다` : short ? '겨울 꼴이 모자라다' : counts;
  return `<details class="card workshop herd-card"${ui.herdOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">내 떼</span><strong>${esc(F.placeName)}</strong></span>
      <span class="ws-demand ${F.sick || short || F.health < 40 ? 'down' : 'up'}">${esc(sub)}</span>
    </summary>
    <div class="ws-body">
      <div class="sm-chips">${F.stock.map((x) => chip([x.name, `${x.count}`])).join('')}${chip(['값', `은화 ${F.value}닢`])}${F.hands ? chip(['일꾼', `${F.hands}명`]) : ''}</div>
      <p class="note">${F.here ? '떼 곁에 있다' : '<b class="warn">떼와 떨어져 있다</b>'} · 이 고장 풀밭 ${s.pasture >= 1 ? '넉넉하다' : s.pasture >= 0.6 ? '그럭저럭' : s.pasture > 0 ? '척박하다' : '없다'}${F.gens > 1 ? ` · ${F.gens}대째 이어 온 떼` : ''}</p>
      <div class="wd-row kn-row"><span>떼의 기운</span>${bar(F.health, F.health < 40 ? 'low' : 'kin')}</div>
      <p class="note">쌓아 둔 꼴 ${F.fodder}짐 · 겨울 한 달에 ${F.winterNeed}짐${F.winterMonths != null ? ` · ${short ? `<b class="warn">${F.winterMonths ? `${F.winterMonths}달 치` : '한 달도 못 버틴다'}</b>` : `${F.winterMonths}달 치`}` : ''}</p>
      ${F.sick ? `<p class="note"><b class="warn">${esc(F.sick.name)}</b> · ${F.sick.left}달쯤 더 간다</p>` : ''}
      ${s.steeds.length ? `<h4 class="ct-h">기르는 말 ${s.steeds.length}필</h4><ul class="wl-list hd-steeds">${s.steeds.map(steedRow).join('')}</ul>` : ''}
      ${s.neighbor ? `<p class="note">이웃 목장 ${esc(s.neighbor.name)}${s.neighbor.grudge >= 40 ? ' · <b class="warn">사이가 험하다</b>' : s.neighbor.grudge >= 15 ? ' · 사이가 껄끄럽다' : ''}</p>` : ''}
      ${s.band ? `<p class="note">${bandLine(s.band)}</p>` : ''}
    </div>
  </details>`;
}

export function renderHerd(game) {
  const s = safe(() => herdStatus(game));
  if (!s || !(s.flock || s.band || s.worked || s.skill >= 5)) return '';
  const band = (b) => `<li class="${s.band?.id === b.id ? 'here' : ''}"><div class="top"><strong>${esc(b.name)}</strong><span class="note">${esc(b.campName)}${b.here ? ' · 여기' : ''}</span></div>
    <span class="note">${esc(b.people)} · ${esc(b.stock)}${s.band?.id === b.id ? ' · 내가 든 무리' : ''}</span></li>`;
  return `<section class="card herd-map">
    <h2>목축과 유목 <small>${esc(SEASON[s.season] ?? '')}</small></h2>
    <div class="sm-chips">${s.prices.map((p) => chip([`${p.name} 한 마리`, `은화 ${p.price}닢`])).join('')}</div>
    <h4 class="ct-h">이번 철 유목민 무리</h4>
    <ul class="ct-houses hd-bands">${s.bands.map(band).join('')}</ul>
  </section>`;
}

export function renderHerdBlock(game) {
  const s = safe(() => herdStatus(game));
  if (!s) return '';
  const chips = [];
  if (s.worked) chips.push(['남의 떼를 몬 달', `${s.worked}`]);
  if (s.born) chips.push(['받아 낸 새끼', `${s.born}마리`, 'up']);
  if (s.sold) chips.push(['판 짐승', `${s.sold}마리`]);
  if (s.lost) chips.push(['잃은 짐승', `${s.lost}마리`, 'down']);
  const famed = s.steeds.filter((h) => h.fame > 0 || h.kept);
  if (!chips.length && s.skill < 5 && !s.past.length && !s.log.length && !famed.length) return '';
  return `<div class="block herd-block">
    <h3>목축과 유목</h3>
    ${s.skill >= 1 ? `<div class="wd-row kn-row"><span>짐승 다루는 솜씨 ${s.skill}</span>${bar(s.skill, 'kin')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${famed.length ? `<div class="ct-tags">${famed.map((h) => `<span class="ct-tag gift">${esc(h.name)}${h.fame ? ` · 경주 ${h.fame}승` : ''}</span>`).join('')}</div>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지난 떼 ${s.past.length}번</summary><ul class="pl-news">${s.past.map((x) => `<li><time>${x.year}년</time><span>${esc(x.how)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>짐승에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
