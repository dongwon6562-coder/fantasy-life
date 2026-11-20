// 23단계 '봉기와 반란' 화면(src/revolt). 읽기만 한다.
// renderRevoltNow: 이번 달 화면 한 줄 (내가 든 봉기, 숨어 사는 잔당, 내가 세운 새 질서, 이 고장 봉기, 들끓는 민심)
// renderRevolt: 지도 화면 카드 (이 고장 민심과 까닭, 들끓는 고장, 지금의 봉기들, 봉기 뒤의 새 질서, 지난 봉기, 기록)
// renderRevoltBlock: '나' 화면 덩이 (가담·우두머리·밀고·진압 기록, 숨어 사는 몸, 내가 세운 질서)
import { revoltInfo } from '../revolt/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const one = (label, text, bad) => `<section class="card revolt-now"><p class="note"><b${bad ? ' class="warn"' : ''}>${esc(label)}</b> ${esc(text)}</p></section>`;

export function renderRevoltNow(game) {
  const s = safe(() => revoltInfo(game));
  if (!s) return '';
  if (s.mine) return one('봉기', `${s.mine.placeName}의 봉기에서 나는 ${s.mine.role} · ${s.mine.phase} · ${s.mine.word}`, s.mine.phase === '들고일어남');
  if (s.hidden) return one('숨어 사는 잔당', `${s.hidden.placeName}에서 달아난 지 ${s.hidden.years}해 · ${s.hidden.word}`, s.hidden.heat >= 30);
  const H = s.here;
  const r = H && s.risings.find((x) => x.placeName === H.placeName);
  if (r) return one('봉기', `${r.placeName}: ${r.leader}의 무리가 ${r.phase} · ${r.word}`, r.phase === '들고일어남');
  if (H && H.anger >= 55) return one('민심', `${H.placeName} ${H.word}${H.cause ? ` · ${H.cause}` : ''}`, H.anger >= 75);
  return '';
}

export function renderRevolt(game) {
  const s = safe(() => revoltInfo(game));
  if (!s) return '';
  const H = s.here;
  if (!s.hot.length && !s.risings.length && !s.orders.length && !s.past.length && !(H && H.anger >= 35)) return '';
  const rising = (x) => `<li class="${x.role ? 'here' : x.phase === '들고일어남' ? 'bad' : ''}"><div class="top"><strong>${esc(x.placeName)}</strong><span class="note">${esc(x.phase)}${x.months ? ` · ${x.months}달째` : ''}</span></div>
    <span class="note">우두머리 ${esc(x.leader)} · ${esc(x.word)}${x.role ? ` · 나는 ${esc(x.role)}` : ''}</span></li>`;
  return `<section class="card revolt-card">
    <h2>민심과 봉기 <small>${s.risings.length ? `봉기 ${s.risings.length}곳` : '지금은 잠잠하다'}</small></h2>
    ${H ? `<div class="wd-row kn-row"><span>${esc(H.placeName)} · ${esc(H.word)}</span>${bar(H.anger, H.anger >= 55 ? 'low' : '')}</div>
      <p class="note">다스리는 이: ${esc(H.lord)}${H.cause ? ` · 사람들 말: "${esc(H.cause)}"` : ''}</p>` : ''}
    ${s.hot.filter((x) => !H || x.placeName !== H.placeName).length ? `<h4 class="ct-h">들끓는 고장</h4><ul class="wl-list rv-hot">${s.hot.filter((x) => !H || x.placeName !== H.placeName).map((x) => `<li><div class="wd-row kn-row"><span><strong>${esc(x.placeName)}</strong> · ${esc(x.word)}</span>${bar(x.anger, x.anger >= 55 ? 'low' : '')}</div></li>`).join('')}</ul>` : ''}
    ${s.risings.length ? `<ul class="ct-houses rv-list">${s.risings.map(rising).join('')}</ul>` : ''}
    ${s.orders.length ? `<h4 class="ct-h">봉기 뒤의 새 질서</h4><ul class="am-rows">${s.orders.map((o) => `<li><strong>${esc(o.placeName)}</strong> <span class="note">${o.y}년부터 ${esc(o.by)} · ${esc(o.word)}</span></li>`).join('')}</ul>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지난 봉기 ${s.past.length}번</summary><ul class="pl-news">${s.past.slice().reverse().map((x) => `<li><time>${x.y}년</time><span>${esc(x.placeName)} · ${esc(x.leader)} · ${esc(x.out)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function renderRevoltBlock(game) {
  const s = safe(() => revoltInfo(game));
  if (!s) return '';
  const T = s.tally;
  const chips = [];
  if (T.joined) chips.push(['봉기에 가담', `${T.joined}번`]);
  if (T.led) chips.push(['앞장섬', `${T.led}번`]);
  if (T.raids) chips.push(['곳간을 침', `${T.raids}번`]);
  if (T.won) chips.push(['이긴 봉기', `${T.won}번`, 'up']);
  if (T.crushed) chips.push(['꺾인 봉기', `${T.crushed}번`, 'down']);
  if (T.informed) chips.push(['밀고함', `${T.informed}번`, 'down']);
  if (T.suppressed) chips.push(['진압에 나섬', `${T.suppressed}번`]);
  if (!chips.length && !s.hidden && !s.order && !s.mine && !s.log.length) return '';
  return `<div class="block revolt-block">
    <h3>봉기와 반란</h3>
    ${s.mine ? `<p class="note">${esc(s.mine.placeName)}의 봉기 · 나는 <b>${esc(s.mine.role)}</b> · ${esc(s.mine.phase)} · ${esc(s.mine.word)}</p>` : ''}
    ${s.hidden ? `<p class="note"><b class="warn">숨어 사는 몸</b> · ${esc(s.hidden.placeName)}에서 달아난 지 ${s.hidden.years}해 · ${esc(s.hidden.word)}</p>` : ''}
    ${s.order ? `<div class="wd-row kn-row"><span>내가 세운 질서 · ${esc(s.order.placeName)} · ${esc(s.order.word)}</span>${bar(s.order.rot, s.order.rot >= 45 ? 'low' : 'kin')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>봉기에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
