// 25단계 '내 농장' 화면(src/farm). 읽기만 한다.
// renderFarmNow: 이번 달 화면 접는 카드 (내 농가가 있을 때: 일손과 소, 물길, 올해 소출, 밭마다 작물·땅심·익을 때·소작, 곳간, 이웃, 장 시세)
// renderFarmBlock: '나' 화면 덩이 (농사 솜씨, 일한 달·거둔 것·판 것, 지난 농가, 기록)
import { farmStatus } from '../farm/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

const fieldRow = (x, i) => {
  const what = x.tenant ? `소작인 ${esc(x.tenant)}에게 내줌` : x.crop ? `<strong>${esc(x.crop)}</strong> · ${x.monthsLeft ? `${x.monthsLeft}달 뒤 거둔다` : '<b class="ok">거둘 때다</b>'}` : `빈 밭${x.last ? ` (지난번 ${esc(x.last)})` : ''}`;
  return `<li><div class="wd-row kn-row"><span>${i + 1}뙈기 · ${what}${x.leased ? ' · 빌린 밭' : ''} · ${esc(x.soilWord)}</span>${bar(x.soil, x.soil < 40 ? 'low' : 'kin')}</div></li>`;
};

export function renderFarmNow(game, ui = {}) {
  const s = safe(() => farmStatus(game));
  const F = s?.farm;
  if (!F) return '';
  const grow = F.fields.filter((x) => x.crop).length;
  const ripe = F.fields.filter((x) => x.crop && !x.monthsLeft).length;
  const sub = ripe ? `${ripe}뙈기 거둘 때` : grow ? `${grow}뙈기에 곡식이 섰다` : '밭이 비었다';
  const yr = F.year >= 1.15 ? '풍년' : F.year <= 0.8 ? '흉년' : '';
  return `<details class="card workshop farm-card"${ui.farmOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">내 농가</span><strong>${esc(F.name)}</strong></span>
      <span class="ws-demand ${ripe || grow ? 'up' : 'down'}">${esc(sub)}</span>
    </summary>
    <div class="ws-body">
      <p class="note">${esc(F.placeName)}${F.here ? '' : ' · <b class="warn">집을 떠나 있다</b>'}${F.gens > 1 ? ` · ${F.gens}대째` : ''} · 씨앗: ${esc(F.seed)}${yr ? ` · 올해 이 고장은 <b${yr === '흉년' ? ' class="warn"' : ''}>${yr}</b>` : ''}</p>
      <div class="sm-chips">${chip(['밭', `${F.fields.length}뙈기`])}${chip(['품꾼', `${F.hands}명`])}${chip(['소', `${F.oxen}마리`])}${chip(['손이 닿는 밭', `${F.capacity}뙈기`, F.capacity < F.fields.filter((x) => !x.tenant).length ? 'down' : ''])}</div>
      <div class="wd-row kn-row"><span>물길 · ${esc(F.waterWord)}</span>${bar(F.water, F.water < 20 ? 'low' : 'kin')}</div>
      ${F.fields.length ? `<ul class="wl-list fm-fields">${F.fields.map(fieldRow).join('')}</ul>` : ''}
      <p class="note">곳간: ${F.barn.length ? F.barn.map((b) => `${esc(b.name)} ${b.sacks}자루 (은화 ${b.value}닢쯤)`).join(', ') : '비었다'}</p>
      ${s.neighbor ? `<p class="note">이웃 ${esc(s.neighbor.name)}${s.neighbor.grudge >= 40 ? ' · <b class="warn">밭둑 다툼이 험하다</b>' : s.neighbor.grudge >= 15 ? ' · 사이가 껄끄럽다' : ''}</p>` : ''}
      <details class="pl-more"><summary>장 시세</summary><div class="sm-chips">${s.prices.map((p) => chip([`${p.name} 한 자루`, `은화 ${p.price}닢`])).join('')}</div></details>
    </div>
  </details>`;
}

export function renderFarmBlock(game) {
  const s = safe(() => farmStatus(game));
  if (!s) return '';
  const chips = [];
  if (s.worked) chips.push(['밭일한 달', `${s.worked}`]);
  if (s.reaped) chips.push(['거둔 곡식', `${s.reaped}자루`, 'up']);
  if (s.sold) chips.push(['판 곡식', `${s.sold}자루`]);
  if (!chips.length && s.skill < 5 && !s.past.length && !s.farm) return '';
  return `<div class="block farm-block">
    <h3>내 농장</h3>
    ${s.skill >= 1 ? `<div class="wd-row kn-row"><span>농사 솜씨 ${s.skill}</span>${bar(s.skill, 'kin')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지난 농가 ${s.past.length}곳</summary><ul class="pl-news">${s.past.map((x) => `<li><time>${x.year}년</time><span>${esc(x.name)} · ${esc(x.how)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>농사에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
