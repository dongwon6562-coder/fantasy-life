// 36단계 '길 위의 일(마부와 역참)' 화면(src/carrier). 읽기만 한다.
// renderCarrierNow: 이번 달 접는 카드 (맡은 짐과 가는 길, 실은 몫, 늦었나, 수레와 말, 내 역참). 짐이나 수레, 역참이 있을 때만.
// renderCarrierBlock: '나' 화면 덩이 (길 솜씨, 나른 일·번 돈·잃은 짐, 자주 다닌 길, 운송 상회들, 물려준 역참, 기록)
import { carrierInfo } from '../carrier/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { PLACES } from '../places.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderCarrierNow(game, ui = {}) {
  const s = safe(() => carrierInfo(game));
  if (!s || (!s.haul && !s.station && !s.cart)) return '';
  const h = s.haul, st = s.station;
  return `<details class="card workshop ca-card"${ui.caOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">${h ? `맡은 짐 · ${esc(h.kind)}` : st ? '내 역참' : '수레'}</span><strong>${esc(h ? `${h.from} → ${h.to}` : st ? st.name : s.cart)}</strong></span>
      <span class="ws-demand ${h?.late ? 'down' : 'up'}">${esc(h ? (h.late ? '늦었다' : `은화 ${h.pay}닢`) : st ? `이름값 ${st.rep}` : s.rank)}</span>
    </summary>
    <div class="ws-body">
      ${h ? `<p class="note">${esc(h.what)} · 실은 몫 ${h.load}%${h.late ? ' · <b class="warn">약속한 달을 넘겼다</b>' : ''}</p>` : ''}
      ${s.cart || s.horses.length ? `<p class="note">${s.cart ? esc(s.cart) : '수레 없음'}${s.horses.length ? ` · 말 ${s.horses.map(esc).join(', ')}` : ''}</p>` : ''}
      ${st ? `<p class="note">${esc(st.name)} · ${esc(st.place)} · ${st.since}년부터 · 역마 ${st.horses} · 일꾼 ${st.hands}${st.inn ? ' · 객방이 있다' : ''}</p>` : ''}
    </div>
  </details>`;
}

export function renderCarrierBlock(game) {
  const s = safe(() => carrierInfo(game));
  if (!s || (!s.knack && !s.done && !s.station && !s.past.length)) return '';
  const chips = [];
  if (s.done) chips.push(['나른 일', `${s.done}번`]);
  if (s.earned) chips.push(['번 돈', `은화 ${s.earned}닢`, 'up']);
  if (s.lost) chips.push(['잃은 짐', `${s.lost}번`, 'down']);
  const v = s.station ? 'yard' : game.date.month <= 2 || game.date.month === 12 ? 'snow' : 'cart';
  const art = safe(() => vignetteImage({ plate: 'carrier', variant: v, year: game.date.year, month: game.date.month }), '');
  const ALT = { yard: '역참 마당', snow: '눈길을 가는 수레', cart: '짐을 실은 수레' };
  const roads = s.routes.slice().sort((a, b) => b.n - a.n).slice(0, 4);
  const houses = s.houses.filter((x) => !x.gone);
  return `<div class="block ca-block">
    <h3>길 위의 일</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[v]}">` : ''}
    ${s.knack ? `<div class="wd-row kn-row"><span>길 솜씨 · ${esc(s.rank)}</span>${bar(s.knack, 'kin')}<span class="v">${s.knack}</span></div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${roads.length ? `<p class="note">자주 다닌 길: ${roads.map((r) => `${esc(r.road)} ${r.n}번`).join(', ')}</p>` : ''}
    ${houses.length ? `<ul class="ag-clues">${houses.map((x) => `<li><b>${esc(x.name)}</b> · ${esc(x.seat)} · 세력 ${x.power}${x.mine ? ' · 내가 일하는 곳' : ''}${x.routes.length ? ` · ${x.routes.slice(0, 3).map(esc).join(', ')}` : ''}</li>`).join('')}</ul>` : ''}
    ${s.fade >= 20 ? `<p class="note">쇠수레 길이 늘어 수레 일이 ${s.fade >= 60 ? '크게' : '조금씩'} 줄고 있다.</p>` : ''}
    ${s.past.length ? `<p class="note">지난 대: ${s.past.slice(-3).reverse().map((p) => `${esc(p.name)}${p.place ? ` · ${esc(PLACES[p.place]?.name ?? '')}` : ''} (${p.y}년${p.sold ? `, 은화 ${p.sold}닢에 넘김` : ''})`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>길 위에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
