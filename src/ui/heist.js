// 22단계 '큰 한탕' 화면(src/heist). 읽기만 한다.
// renderHeistNow: 이번 달 화면. 꾸미는 일이 있으면 접는 카드 (목표, 정보·경비·경계·준비, 마련한 것, 일행, 그날),
//   없고 장물이나 추적자만 있으면 한 줄 (한 줄 알림 모음에 들어감).
// renderHeistBlock: '나' 화면 덩이 (솜씨, 해낸 일, 함께한 사람들, 기록)
import { heistStatus } from '../heist/index.js';
import { J } from '../narrative/text.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

const lootLine = (L) => `장물 은화 ${L.value}닢 어치${L.from ? ` (${esc(L.from)})` : ''}${L.hot >= 40 ? ' · <b class="warn">아직 뜨겁다</b>' : ''}${L.inherited ? ' · 선대가 숨겨 둔 것' : ''}`;
const huntLine = (h) => `${esc(J(h.by, '이/가'))} ${esc(h.word)}${h.placeName ? ` (${esc(h.placeName)})` : ''}${h.monthsLeft ? ` · ${h.monthsLeft}달 더 쫓는다` : ''}`;

export function renderHeistNow(game, ui = {}) {
  const s = safe(() => heistStatus(game));
  if (!s) return '';
  const P = s.plan;
  if (!P) {
    const bits = [];
    if (s.loot) bits.push(lootLine(s.loot));
    if (s.hunt) bits.push(huntLine(s.hunt));
    if (!bits.length) return '';
    return `<section class="card heist-now"><p class="note"><b${s.hunt && s.hunt.clue >= 40 ? ' class="warn"' : ''}>한탕 뒤</b> ${bits.join(' · ')}</p></section>`;
  }
  const crew = (m) => `<li><div class="wd-row kn-row"><span><strong>${esc(m.name)}</strong> · ${esc(m.role)} · 솜씨 ${m.skill}${m.greed >= 60 ? ' · <b class="warn">욕심이 크다</b>' : ''}</span>${bar(m.loyal, m.loyal < 30 ? 'low' : 'kin')}</div></li>`;
  const day = P.monthsToDay != null ? (P.monthsToDay > 0 ? `그날까지 ${P.monthsToDay}달` : '<b class="warn">그날이다</b>') : '';
  return `<details class="card workshop heist-card"${ui.heistOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">꾸미는 일</span><strong>${esc(P.name)}</strong></span>
      <span class="ws-demand ${P.ready >= 60 ? 'up' : 'down'}">준비 ${P.ready} · 일행 ${P.crew.length}명${day ? ` · ${day.replace(/<[^>]+>/g, '')}` : ''}</span>
    </summary>
    <div class="ws-body">
      <p class="note">${esc(P.kindName)} · ${esc(P.owner)} · ${esc(P.placeName)}${P.here ? ' · 여기' : ''} · 노리는 것 은화 ${P.prize}닢쯤${P.months ? ` · ${P.months}달째 준비` : ''}</p>
      <div class="wd-row kn-row"><span>알아낸 것</span>${bar(P.intel, 'kin')}</div>
      <div class="wd-row kn-row"><span>경비</span>${bar(P.guard, 'low')}</div>
      <div class="wd-row kn-row"><span>눈치챈 정도</span>${bar(P.alarm, P.alarm >= 40 ? 'low' : '')}</div>
      <div class="wd-row kn-row"><span>준비</span>${bar(P.ready, P.ready >= 60 ? 'kin' : '')}</div>
      <div class="sm-chips">${P.prep.map((x) => chip([x.name, x.done ? '마련함' : '아직', x.done ? 'up' : ''])).join('')}</div>
      ${P.crew.length ? `<h4 class="ct-h">일행 ${P.crew.length}명</h4><ul class="wl-list hs-crew">${P.crew.map(crew).join('')}</ul>` : ''}
      ${P.missing.length ? `<p class="note">아직 없는 사람: ${P.missing.map(esc).join(', ')}</p>` : ''}
      ${day ? `<p class="note">${day}</p>` : ''}
      ${s.loot ? `<p class="note">${lootLine(s.loot)}</p>` : ''}
      ${s.hunt ? `<p class="note">${huntLine(s.hunt)}</p>` : ''}
    </div>
  </details>`;
}

export function renderHeistBlock(game) {
  const s = safe(() => heistStatus(game));
  if (!s) return '';
  const any = s.done.length || s.total || s.betrayed || s.caught || s.crewBook.length || s.log.length || s.plan;
  if (!any) return '';
  const chips = [];
  if (s.done.length) chips.push(['해낸 한탕', `${s.done.filter((x) => x.take > 0).length}번`]);
  if (s.total) chips.push(['손에 쥔 돈', `은화 ${s.total}닢`, 'up']);
  if (s.betrayed) chips.push(['배신당함', `${s.betrayed}번`, 'down']);
  if (s.caught) chips.push(['붙잡힘', `${s.caught}번`, 'down']);
  return `<div class="block heist-block">
    <h3>큰 한탕</h3>
    ${s.craft > 0 ? `<div class="wd-row kn-row"><span>꾸미는 솜씨 ${s.craft}</span>${bar(s.craft, 'kin')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.done.length ? `<details class="pl-more"><summary>지난 일 ${s.done.length}번</summary><ul class="pl-news">${s.done.map((x) => `<li><time>${x.year}년</time><span>${esc(x.name)}${x.kindName && !x.name.includes(x.kindName) ? ` · ${esc(x.kindName)}` : ''} · ${esc(x.how)}${x.take ? ` · 은화 ${x.take}닢` : ''}</span></li>`).join('')}</ul></details>` : ''}
    ${s.crewBook.length ? `<details class="pl-more"><summary>함께한 사람 ${s.crewBook.length}명</summary><ul class="am-rows">${s.crewBook.map((b) => `<li><strong>${esc(b.name)}</strong> <span class="note">${esc(b.role)} · 의리 ${b.loyal}${b.grudge ? ' · <b class="warn">앙심을 품었다</b>' : ''}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>한탕에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
