// 24단계 '요리사의 길' 화면(src/cuisine). 읽기만 한다.
// renderCuisineNow: 이번 달 화면 접는 카드 (높은 집 부엌 자리나 내 요리가 있을 때: 자리와 신임, 다음 자리, 시식관, 맞수, 내 요리, 이 고장의 맛)
// renderCuisineBlock: '나' 화면 덩이 (요리 솜씨와 이름, 겨루기·연회 기록, 맛본 고장들, 이름난 요리, 지난 부엌, 세상의 이름난 요리, 기록)
import { cuisineStatus } from '../cuisine/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const dishRow = (d) => `<li><div class="wd-row kn-row"><span><strong>${esc(d.name)}</strong> · ${esc(d.word)}${d.gen > 1 ? ` · ${d.gen}대째` : ''}${d.served ? ` · 내놓은 ${d.served}번` : ''}</span>${bar(d.quality, d.famous ? 'kin' : '')}</div></li>`;

export function renderCuisineNow(game, ui = {}) {
  const s = safe(() => cuisineStatus(game));
  const P = s?.post;
  if (!s || (!P && !s.dishes.length)) return '';
  const sub = P ? `${P.placeName} ${P.title}` : `내 요리 ${s.dishes.length}가지`;
  return `<details class="card workshop cu-card"${ui.cuOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">부엌</span><strong>${esc(sub)}</strong></span>
      <span class="ws-demand ${P && P.favor < 25 ? 'down' : 'up'}">${esc(s.fameWord)}</span>
    </summary>
    <div class="ws-body">
      ${P ? `<p class="note">${esc(P.name)} · 모시는 이 ${esc(P.lord)}${P.months ? ` · ${P.months}달째` : ''}${P.here ? '' : ' · <b class="warn">부엌을 비웠다</b>'}</p>
      <div class="wd-row kn-row"><span>주인의 신임</span>${bar(P.favor, P.favor < 25 ? 'low' : 'kin')}</div>
      ${P.next ? `<p class="note">다음 자리 ${esc(P.next.title)} · 솜씨 ${P.next.skill} 넘어야${s.skill >= P.next.skill ? ' · 솜씨는 됐다' : ` (지금 ${s.skill})`}</p>` : ''}` : ''}
      ${s.taster ? `<p class="note">시식관 ${esc(s.taster.name)}${s.taster.loyal < 30 ? ' · <b class="warn">믿기 어렵다</b>' : ''}</p>` : ''}
      ${s.rival ? `<p class="note">맞수 ${esc(s.rival.name)}${s.rival.grudge >= 40 ? ' · <b class="warn">앙심이 깊다</b>' : ''}</p>` : ''}
      ${s.dishes.length ? `<h4 class="ct-h">내 요리 ${s.dishes.length}가지</h4><ul class="wl-list cu-dishes">${s.dishes.map(dishRow).join('')}</ul>` : ''}
      ${s.here ? `<p class="note">이 고장의 맛: ${esc(s.here.taste)} · ${esc(s.here.ing)}${s.here.known ? '' : ' · 아직 제대로 맛보지 못했다'}</p>` : ''}
    </div>
  </details>`;
}

export function renderCuisineBlock(game) {
  const s = safe(() => cuisineStatus(game));
  if (!s) return '';
  const chips = [];
  if (s.palateCount) chips.push(['맛본 고장', `${s.palateCount}곳`]);
  if (s.dishes.length) chips.push(['지은 요리', `${s.dishes.length}가지`]);
  if (s.served) chips.push(['내놓은 상', `${s.served}번`]);
  if (s.feasts) chips.push(['맡은 연회', `${s.feasts}번`, 'up']);
  if (s.won) chips.push(['이긴 겨루기', `${s.won}번`, 'up']);
  if (s.lost) chips.push(['진 겨루기', `${s.lost}번`, 'down']);
  const famed = s.dishes.filter((d) => d.famous);
  if (!chips.length && s.fame < 10 && !s.past.length && !s.log.length && !s.post) return '';
  return `<div class="block cuisine-block">
    <h3>요리사의 길</h3>
    <div class="wd-row kn-row"><span>이름 · ${esc(s.fameWord)}</span>${bar(s.fame, 'kin')}</div>
    ${s.chief ? '<p class="note">주방장을 지낸 몸이다</p>' : ''}
    ${famed.length ? `<div class="ct-tags">${famed.map((d) => `<span class="ct-tag gift">${esc(d.name)}${d.by && d.gen > 1 ? ` · ${esc(d.by)}에게서` : ''}</span>`).join('')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.palate.length ? `<details class="pl-more"><summary>맛본 고장 ${s.palate.length}곳</summary><ul class="am-rows">${s.palate.map((p) => `<li><strong>${esc(p.placeName)}</strong> <span class="note">${esc(p.ing)} · ${esc(p.taste)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지난 부엌 ${s.past.length}곳</summary><ul class="pl-news">${s.past.map((x) => `<li><time>${x.year}년</time><span>${esc(x.what)} · ${esc(x.how)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.world.length ? `<details class="pl-more"><summary>세상의 이름난 요리 ${s.world.length}가지</summary><ul class="pl-news">${s.world.map((w) => `<li><time>${w.year}년</time><span>${esc(w.dish)} · ${esc(w.chef)} · ${esc(w.placeName)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>부엌에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
