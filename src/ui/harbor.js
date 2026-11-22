// 32단계 '포구와 어부의 삶' 화면(src/harbor). 읽기만 한다.
// renderHarborNow: 이번 달 접는 카드 (내 배나 생선이 있을 때: 배 형편·그물·선원, 날생선·말린 생선, 철 고기, 어장 다툼)
// renderHarbor: 지도 화면 카드 (지금 있는 포구: 어장·모시는 신·맞수 포구, 철 고기, 돌아오지 않은 배, 과부)
// renderHarborBlock: '나' 화면 덩이 (뱃일로 잡고 번 것, 기록)
import { harborInfo } from '../harbor/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { placeName } from '../places.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderHarborNow(game, ui = {}) {
  const s = safe(() => harborInfo(game));
  if (!s || (!s.boat && !s.fresh && !s.cured)) return '';
  const B = s.boat;
  const sub = s.fresh ? `날생선 ${s.fresh}` : s.cured ? `말린 생선 ${s.cured}` : B ? B.hull : '';
  const warn = B && /위태|가라앉/.test(B.hull);
  return `<details class="card workshop hb-card"${ui.hbOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">${B ? '내 배' : '생선'}</span><strong>${esc(B ? B.name : s.harbor?.name ?? '포구')}</strong></span>
      <span class="ws-demand ${warn ? 'down' : 'up'}">${esc(sub)}</span>
    </summary>
    <div class="ws-body">
      ${B ? `<p class="note">${esc(B.kind)} · ${esc(B.place)}에 댐 · 배 바닥 ${warn ? `<b class="warn">${esc(B.hull)}</b>` : esc(B.hull)} · 그물 ${B.nets}/${B.netsMax} · 선원 ${B.crew}/${B.crewMax}</p>` : ''}
      ${s.fresh || s.cured ? `<p class="note">날생선 ${s.fresh} · 말린 생선 ${s.cured}${s.fresh ? ' · 날생선은 빨리 손질하지 않으면 상한다' : ''}</p>` : ''}
      ${s.season.length ? `<p class="note">이달 잡히는 고기: ${s.season.map(esc).join(', ')}</p>` : ''}
      ${s.grounds.length ? `<ul class="ag-clues">${s.grounds.map((x) => `<li>${esc(x.name)} · ${esc(x.rival)} 어부들과 ${/칼부림/.test(x.state) ? `<b class="warn">${esc(x.state)}</b>` : esc(x.state)}</li>`).join('')}</ul>` : ''}
    </div>
  </details>`;
}

export function renderHarbor(game) {
  const s = safe(() => harborInfo(game));
  const H = s?.harbor;
  if (!s || !H || (!s.atHarbor && !s.boat)) return '';
  const lost = s.lost.filter((x) => x.place === placeName(H.id)); // 이 포구에서 돌아오지 않은 배
  const variant = lost.some((x) => game.date.year - x.y <= 1) ? 'wait' : s.cured ? 'racks' : 'dawn';
  const art = safe(() => vignetteImage({ plate: 'harbor', variant, year: game.date.year, month: game.date.month }), '');
  const ALT = { wait: '돌아오지 않는 배를 기다리는 포구', racks: '생선 말리는 장대', dawn: '새벽에 나가는 고깃배' };
  return `<section class="card hb-map">
    <h2>${esc(H.name)} <small>${esc(H.ground)}</small></h2>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[variant]}">` : ''}
    <p class="note">모시는 신: ${esc(H.god)} · 맞수 포구: ${esc(H.rival)}</p>
    ${s.season.length ? `<p class="note">이달 잡히는 고기: ${s.season.map(esc).join(', ')}</p>` : '<p class="note">이달은 고기가 잘 잡히지 않는다.</p>'}
    ${lost.length ? `<p class="note">돌아오지 않은 배: ${lost.slice().reverse().map((x) => `${esc(x.name)}(${esc(x.place)}, ${x.y}년)`).join(', ')}</p>` : ''}
    ${s.widows ? `<p class="note">이 포구의 과부 ${s.widows}명</p>` : ''}
  </section>`;
}

export function renderHarborBlock(game) {
  const s = safe(() => harborInfo(game));
  if (!s || (!s.hauls && !s.boat && !s.log.length)) return '';
  const chips = [];
  if (s.hauls) chips.push(['고기잡이', `${s.hauls}번`]);
  if (s.earned) chips.push(['번 돈', `은화 ${s.earned}닢`, 'up']);
  if (s.smuggled) chips.push(['몰래 실은 짐', `${s.smuggled}번`]);
  if (s.spoiled) chips.push(['상한 생선', `${s.spoiled}`, 'down']);
  return `<div class="block hb-block">
    <h3>뱃일</h3>
    ${s.boat ? `<p><strong>${esc(s.boat.name)}</strong> · ${esc(s.boat.kind)}${s.boat.since ? ` · ${s.boat.since}년부터` : ''}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>바다에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
