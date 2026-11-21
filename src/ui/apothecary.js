// 26단계 '약초꾼과 약방' 화면(src/apothecary). 읽기만 한다.
// renderApoNow: 이번 달 화면 접는 카드 (약방이나 말린 약초·약 보따리가 있을 때: 약방 이름과 선반, 말린 약초, 달일 수 있는 처방, 이 철에 나는 약초, 의원과의 다툼)
// renderApoBlock: '나' 화면 덩이 (약초 솜씨, 캔 것·달인 것·판 것·고친 사람, 이름난 처방, 닫은 약방, 기록)
import { apothecaryStatus } from '../apothecary/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const PRICE = { cheap: '싸게 받는다', fair: '제값을 받는다', dear: '비싸게 받는다' };

export function renderApoNow(game, ui = {}) {
  const s = safe(() => apothecaryStatus(game));
  if (!s) return '';
  const P = s.shop;
  if (!P && !s.herbCount && !s.satchelCount) return '';
  const can = s.book.filter((r) => r.canBrew);
  const sub = P ? (P.stock.length ? `선반에 ${P.stock.reduce((n, x) => n + x.count, 0)}첩` : '선반이 비었다') : s.satchelCount ? `약 ${s.satchelCount}첩` : `약초 ${s.herbCount}줌`;
  return `<details class="card workshop apo-card"${ui.apoOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">${P ? '내 약방' : '약초 보따리'}</span><strong>${esc(P ? P.name : `약초 솜씨 ${s.skill}`)}</strong></span>
      <span class="ws-demand ${P && !P.stock.length ? 'down' : 'up'}">${esc(sub)}</span>
    </summary>
    <div class="ws-body">
      ${P ? `<p class="note">${esc(P.placeName)}${P.here ? '' : ' · <b class="warn">약방을 떠나 있다</b>'}${P.gens > 1 ? ` · ${P.gens}대째` : ''} · 약값은 ${PRICE[P.price] ?? '제값을 받는다'}${P.cut ? ' · <b class="warn">약에 섞음질을 한다</b>' : ''} · 지난달 은화 ${P.last}닢</p>
      <div class="wd-row kn-row"><span>이름 · ${esc(P.fameWord)}</span>${bar(P.fame, P.fame < 20 ? 'low' : 'kin')}</div>
      ${P.stock.length ? `<div class="sm-chips">${P.stock.map((x) => chip([x.name, `${x.count}첩`])).join('')}</div>` : ''}` : ''}
      ${s.herbs.length ? `<p class="note">말린 약초: ${s.herbs.map((h) => `${esc(h.name)} ${h.count}`).join(', ')}</p>` : ''}
      ${s.satchel.length ? `<p class="note">약 보따리: ${s.satchel.map((h) => `${esc(h.name)} ${h.count}첩`).join(', ')}</p>` : ''}
      ${s.book.length ? `<p class="note">${can.length ? `지금 달일 수 있는 약: ${can.map((r) => `${r.poison ? '<b class="warn">' : ''}${esc(r.name)}${r.poison ? '</b>' : ''}`).join(', ')}` : '가진 약초로 달일 수 있는 처방이 없다'}</p>` : ''}
      ${s.here.length ? `<p class="note">이 고장에 지금 나는 약초: ${s.here.map((h) => esc(h.name)).join(', ')}</p>` : ''}
      ${s.doctor && s.doctor.grudge >= 15 ? `<p class="note">${esc(s.doctor.name)}${s.doctor.grudge >= 40 ? ' · <b class="warn">나를 돌팔이라고 떠들고 다닌다</b>' : ' · 내 약방을 못마땅해한다'}</p>` : ''}
    </div>
  </details>`;
}

export function renderApoBlock(game) {
  const s = safe(() => apothecaryStatus(game));
  if (!s) return '';
  const chips = [];
  if (s.gathered) chips.push(['캔 약초', `${s.gathered}줌`]);
  if (s.brewed) chips.push(['달인 약', `${s.brewed}첩`]);
  if (s.sold) chips.push(['판 약', `${s.sold}첩`]);
  if (s.cured) chips.push(['나은 사람', `${s.cured}명`, 'up']);
  if (s.harmed) chips.push(['탈 난 사람', `${s.harmed}명`, 'down']);
  if (!chips.length && s.skill < 5 && !s.past.length && !s.named.length && !s.book.length) return '';
  return `<div class="block apo-block">
    <h3>약초와 약방</h3>
    ${s.skill >= 1 ? `<div class="wd-row kn-row"><span>약초 솜씨 ${s.skill}</span>${bar(s.skill, 'kin')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.book.length ? `<p class="note">아는 처방: ${s.book.map((r) => esc(r.name)).join(', ')}</p>` : ''}
    ${s.named.length ? `<p class="note">이름난 처방: ${s.named.map((n) => `<strong>${esc(n.name)}</strong>`).join(', ')}</p>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지난 약방 ${s.past.length}곳</summary><ul class="pl-news">${s.past.map((x) => `<li><time>${x.year}년</time><span>${esc(x.name)} · ${esc(x.how)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>약에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
