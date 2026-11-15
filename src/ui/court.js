// 8단계 궁정 화면: '나' 화면의 궁정 덩이. src/court의 courtInfo만 읽는다.
import { courtInfo, OFFICES } from '../court/index.js';
import { L } from '../adventure/core.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const PRINCE = { rudolf: '루돌프 편', erik: '에릭 편' };

function houseTag(h) {
  const t = [];
  if (h.married) t.push(['혼인 동맹', 'ally']);
  else if (h.ally >= 30) t.push(['우리 편', 'ally']);
  if (h.foe >= 30) t.push([h.foe >= 60 ? '원수' : '앙금', 'foe']);
  if (h.spy) t.push(['첩자를 심음', 'spy']);
  return t.map(([w, c]) => `<span class="ct-tag ${c}">${w}</span>`).join('');
}

export function renderCourtBlock(game) {
  const c = safe(() => courtInfo(game));
  if (!c) return '';
  const here = safe(() => L(game).place) === 'leocast';
  const involved = !c.access || c.standing > 0 || c.office || c.disgraced || c.houses.some((h) => h.married || h.ally || h.foe);
  if (!involved && !here) return '';
  if (c.access && !involved) {
    // 왕도에 왔지만 아직 궁정 문이 닫혀 있다
    return `<div class="block court-block"><h3>궁정</h3><p class="note">왕궁 문은 아직 내게 열리지 않는다. 들어가려면: ${esc(c.access)}.</p></div>`;
  }
  const step = c.office ? OFFICES.indexOf(c.office) : -1;
  const ladder = `<ol class="ct-ladder" aria-label="궁정 관직">${OFFICES.map((o, i) => `<li class="${i < step ? 'past' : i === step ? 'now' : ''}">${esc(o)}</li>`).join('')}</ol>`;
  const rows = [];
  if (c.ruler) rows.push(['왕좌', c.ruler]);
  if (c.side) rows.push(['미는 쪽', c.side]);
  if (c.patron) rows.push(['뒤를 봐주는 집', c.patron]);
  if (c.secrets) rows.push(['쥐고 있는 비밀', `${c.secrets}가지`]);
  const houses = [...c.houses].sort((a, b) => (b.married - a.married) || (Math.max(b.ally, b.foe) - Math.max(a.ally, a.foe)) || b.power - a.power);
  const houseRow = (h) => `<li><div class="top"><strong>${esc(h.name)}</strong>${h.side ? `<span class="note">${PRINCE[h.side] ?? ''}</span>` : ''}</div>
      <div class="wd-row"><span>세력</span>${bar(h.power)}<span class="v">${h.power}</span></div>
      ${houseTag(h) ? `<div class="ct-tags">${houseTag(h)}</div>` : ''}</li>`;
  const top = houses.slice(0, 5), rest = houses.slice(5);
  return `<div class="block court-block">
    <h3>궁정 <small>${esc(c.office ? `궁정 ${c.office}` : c.standingWord)}</small></h3>
    ${c.disgraced ? `<p class="note warn">${esc(c.access ?? '실각했다')}</p>` : c.access ? `<p class="note">궁정에 들 자격: ${esc(c.access)}</p>` : ''}
    <div class="wd-row"><span>이름값</span>${bar(c.standing, 'court')}<span class="v">${c.standing}</span></div>
    <div class="wd-row"><span>총애</span>${bar(c.favor, 'court')}<span class="v">${c.favor}</span></div>
    ${c.heat >= 20 ? `<div class="wd-row"><span>들킬 위험</span>${bar(c.heat, 'low')}<span class="v">${c.heat}</span></div>` : ''}
    ${ladder}
    ${rows.length ? `<dl class="yt-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    ${houses.length ? `<h4 class="ct-h">궁정의 가문</h4><ul class="ct-houses">${top.map(houseRow).join('')}</ul>
      ${rest.length ? `<details class="ct-more"><summary>다른 가문 ${rest.length}곳</summary><ul class="ct-houses">${rest.map(houseRow).join('')}</ul></details>` : ''}` : ''}
  </div>`;
}
