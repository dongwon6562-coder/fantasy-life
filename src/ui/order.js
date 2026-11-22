// 31단계 '기사단' 화면(src/order). 읽기만 한다.
// renderOrderBlock: '나' 화면 덩이 (내 기사단·자리·서약과 어긴 계율·형제 기사, 물러난 뒤, 집안의 지난 기사 생활, 기록)
// renderOrders: 지도 화면 카드 (기사단 셋: 성채·단장·힘·살림, 이단 심문, 무너진 일). 내가 기사단과 닿은 적이 있거나 큰일이 났을 때만.
import { orderInfo } from '../order/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const yr = (y) => (y != null ? `${y}년` : '');

export function renderOrderBlock(game) {
  const s = safe(() => orderInfo(game));
  if (!s || (!s.me && !s.retired && !s.past.length)) return '';
  const M = s.me;
  const mine = M ? s.orders.find((o) => o.id === M.id) : null;
  // 이단으로 몰리면 무너진 날, 기사단에 있으면 성채, 물러났으면 행군의 기억
  const variant = mine && (mine.heresy >= 2 || mine.fallen) ? 'fall' : M ? (M.level <= 0 ? 'vow' : 'keep') : 'march';
  const art = safe(() => vignetteImage({ plate: 'order', variant, year: game.date.year, month: game.date.month }), '');
  const ALT = { fall: '무너진 기사단의 성채', vow: '서약식 제단 앞에 무릎 꿇은 종자', keep: '기사단 성채', march: '행군하는 기사들' };
  return `<div class="block od-block">
    <h3>기사단</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[variant]}">` : ''}
    ${M ? `<p><strong>${esc(M.name)} ${esc(M.rank)}</strong>${M.since ? ` · ${M.since}년에 들어감` : ''}</p>
      ${mine?.heresy ? `<p class="note"><b class="warn">${mine.heresy >= 2 ? '형제들이 이단으로 붙잡혀 간다' : '이단심문소가 기사단을 들여다본다'}</b></p>` : ''}
      <ul class="ag-clues od-vows">${M.vows.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>
      ${M.broken.length ? `<p class="note"><b class="warn">어긴 계율</b> ${M.broken.map(esc).join(', ')}${M.hidden ? ' · 숨기고 있다' : ''}</p>` : ''}
      ${M.brothers.length ? `<p class="note">형제 기사: ${M.brothers.map((b) => `${esc(b.name)}${b.mentor ? '(나를 이끈 기사)' : ''}`).join(', ')}</p>` : ''}` : ''}
    ${!M && s.retired ? `<p class="note">${esc(s.retired.name)}에서 ${yr(s.retired.y)}에 물러났다</p>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>집안의 기사 생활 ${s.past.length}가지</summary><ul class="ag-clues">${s.past.map((p) => `<li>${esc(p.name)} · ${esc(p.order)} ${esc(p.rank)} · ${p.from}~${p.to}년</li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>기사단에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}

export function renderOrders(game) {
  const s = safe(() => orderInfo(game));
  if (!s) return '';
  const stir = s.orders.some((o) => o.heresy || o.fallen);
  if (!s.me && !s.retired && !s.past.length && !stir) return '';
  return `<section class="card od-card">
    <h2>기사단 <small>${s.orders.length}곳</small></h2>
    <ul class="ag-clues">${s.orders.map((o) => `<li class="${s.me?.id === o.id ? 'mine' : ''}"><strong>${esc(o.name)}</strong> · ${esc(o.hall)}<br>
      <span class="note">${o.fallen ? `<b class="warn">${o.fallen.y}년에 무너졌다</b>${o.fallen.why ? ` · ${esc(o.fallen.why)}` : ''}` : `${o.master ? `단장 ${esc(o.master)} · ` : ''}힘 ${esc(o.strength)} · ${esc(o.wealth)}${o.heresy ? ` · <b class="warn">${o.heresy >= 2 ? '이단 재판 중' : '이단 소문'}</b>` : ''}`}</span></li>`).join('')}</ul>
  </section>`;
}
