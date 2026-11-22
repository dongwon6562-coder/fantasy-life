// 35단계 '기술이 퍼지는 길' 화면(src/techspread). 읽기만 한다.
// renderSpreadChron: 연대기 > 레오니아 > 시대 칸 덩이 (나온 기술마다 몇 고장에 닿았나, 처음 나온 곳, 이 고장, 독점·비법)
// renderSpread: 지도 카드 (이 고장에 아직 안 들어온 것, 교단이 막은 것, 내가 밀어준 연구, 내가 한 일과 기록)
import { spreadInfo } from '../techspread/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderSpreadChron(game) {
  const s = safe(() => spreadInfo(game));
  if (!s || !s.techs.length) return '';
  const T = Math.max(1, s.total);
  const rows = s.techs.slice(0, 8);
  return `<div class="sp-chron">
    <h3 class="sub">기술이 퍼지는 길 <small>고장 ${T}곳</small></h3>
    ${rows.map((t) => `<div class="wd-row kn-row sp-row"><span>${esc(t.name)}${t.here ? '' : ' <em>여긴 아직</em>'}</span>${bar(t.places / T * 100, t.here ? 'kin' : 'low')}<span class="v">${t.places}곳</span></div>
      <p class="note sp-note">${esc(t.first)}에서 ${t.since}년${t.patent ? ` · 독점 ${t.patent}년 남음` : ''}${t.guard ? ' · 비법으로 감춘다' : ''}</p>`).join('')}
    ${s.techs.length > rows.length ? `<p class="note">그 밖에 ${s.techs.length - rows.length}가지는 이미 널리 퍼졌거나 오래전 일이다.</p>` : ''}
  </div>`;
}

export function renderSpread(game) {
  const s = safe(() => spreadInfo(game));
  if (!s || (!s.missing.length && !s.block && !s.backed.length && !s.log.length)) return '';
  const m = s.me ?? {};
  const chips = [];
  if (m.backed) chips.push(['연구 후원', `${m.backed}번`]);
  if (m.taught) chips.push(['가르쳐 퍼뜨림', `${m.taught}번`, 'up']);
  if (m.sold) chips.push(['먼 나라에 팖', `${m.sold}번`]);
  if (m.patents) chips.push(['독점 허가', `${m.patents}번`]);
  if (m.kept) chips.push(['비법 지킴', `${m.kept}번`]);
  if (m.stole) chips.push(['비법을 훔침', `${m.stole}번`, 'down']);
  if (m.caught) chips.push(['붙잡힘', `${m.caught}번`, 'down']);
  if (m.spilled) chips.push(['비법이 샘', `${m.spilled}번`, 'down']);
  if (m.blocked) chips.push(['막아 섬', `${m.blocked}번`]);
  const v = m.patents || m.kept ? 'patent' : m.backed || s.backed.length ? 'book' : s.missing.length ? 'wander' : 'hands';
  const art = safe(() => vignetteImage({ plate: 'spread', variant: v, year: game.date.year, month: game.date.month }), '');
  const ALT = { patent: '독점 허가장', book: '연구 기록을 펼친 책상', wander: '새 물건을 지고 오는 떠돌이 장인', hands: '손에서 손으로 배우는 기술' };
  return `<section class="card sp-map">
    <h2>새 기술이 닿는 길</h2>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[v]}">` : ''}
    ${s.missing.length ? `<p class="note">이 고장엔 아직: ${s.missing.map(esc).join(', ')}</p>` : '<p class="note">나온 기술은 이 고장에도 다 들어왔다.</p>'}
    ${s.block ? `<p class="note"><b class="warn">교단이 막았다</b> ${esc(s.block.name)} · ${s.block.left}년 더</p>` : ''}
    ${s.backed.length ? `<p class="note">내가 밀어준 연구: ${s.backed.map((b) => `${esc(b.name)}${b.done ? '(나왔다)' : ''}`).join(', ')}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>기술을 두고 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
