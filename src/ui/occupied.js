// 36단계 '점령지' 화면(src/occupied). 읽기만 한다.
// renderOccupied: 지도 카드 (제국에 점령된 고장마다 다스리는 자·성질·몇 해·가혹함·저항·부역, 되찾았거나 넘어간 고장)
// renderOccupiedBlock: '나' 화면 덩이 (점령 아래에서 내가 한 일: 부역·저항·밀고·숨겨 줌·도망, 기록)
import { occInfo } from '../occupied/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'occupied', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { banner: '성문 위의 제국 깃발', levy: '징발당하는 곡식', night: '통금 뒤의 골목', free: '되찾은 고장의 아침' };

export function renderOccupied(game) {
  const s = safe(() => occInfo(game));
  if (!s || (!s.places.length && !s.past.length)) return '';
  const v = s.places.length ? (s.places.some((p) => p.resist >= 50) ? 'night' : s.places.some((p) => p.levies) ? 'levy' : 'banner') : 'free';
  const src = art(game, v);
  return `<section class="card oc-map">
    <h2>점령지 <small>${s.places.length ? `${s.places.length}곳` : '지금은 없다'}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${s.here ? `<p class="note"><b class="warn">지금 있는 ${esc(J(s.here, '은/는'))} 점령지다</b></p>` : ''}
    ${s.places.map((p) => `<div class="oc-one">
      <p><strong>${esc(p.name)}</strong> · ${p.ceded ? '제국 땅으로 넘어갔다' : p.years ? `점령 ${p.years}년째` : "올해 점령됐다"} · ${esc(p.lord)}, ${esc(p.temper)}${p.levies ? ` · 징발 ${p.levies}번` : ''}</p>
      <div class="wd-row kn-row"><span>가혹함</span>${bar(p.harsh, p.harsh >= 45 ? 'low' : 'kin')}<span class="v">${esc(p.harshWord)}</span></div>
      <div class="wd-row kn-row"><span>저항</span>${bar(p.resist, 'kin')}<span class="v">${esc(p.resistWord)}</span></div>
      ${p.collab >= 20 ? `<p class="note">부역하는 사람이 ${p.collab >= 50 ? '적지 않다' : '조금 있다'}</p>` : ''}
    </div>`).join('')}
    ${s.past.length ? `<p class="note">지난 점령: ${s.past.map((x) => `${esc(x.name)} ${x.from}~${x.to}년${x.how ? `(${esc(x.how)})` : ''}`).join(', ')}</p>` : ''}
  </section>`;
}

export function renderOccupiedBlock(game) {
  const s = safe(() => occInfo(game));
  if (!s) return '';
  const m = s.me ?? {};
  const chips = [];
  if (m.collab) chips.push(['부역', `${m.collab}번`, 'down']);
  if (m.resist) chips.push(['저항', `${m.resist}번`, 'up']);
  if (m.hid) chips.push(['숨겨 줌', `${m.hid}번`, 'up']);
  if (m.informed) chips.push(['밀고', `${m.informed}번`, 'down']);
  if (m.tried) chips.push(['부역 재판', `${m.tried}번`, 'down']);
  if (m.fled) chips.push(['피란', `${m.fled}번`]);
  if (!chips.length && !m.post && !m.bond && !s.log.length) return '';
  const v = m.resist || m.hid ? 'night' : m.collab || m.post ? 'banner' : s.past.length ? 'free' : 'banner';
  const src = art(game, v);
  return `<div class="block oc-block">
    <h3>점령 아래에서</h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${m.post ? `<p>제국 관청에서 일한다 · <strong>${esc(m.post)}</strong></p>` : ''}
    ${m.bond ? `<p class="note">제국 병사 ${esc(J(m.bond, '과/와'))} 정이 들었다</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>점령 아래에서 겪은 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
