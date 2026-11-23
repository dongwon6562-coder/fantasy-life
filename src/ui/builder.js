// 35단계 '목수와 석공' 화면(src/builder). 읽기만 한다.
// renderBuilderNow: 이번 달 접는 카드 (맡은 일과 남은 달, 작업장, 길드). 일이나 작업장이 있을 때만.
// renderBuilderBlock: '나' 화면 덩이 (솜씨와 지위, 내 표식, 지은 것들이 지금 어떤지, 번 돈, 기록)
import { builderInfo } from '../builder/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;

export function renderBuilderNow(game, ui = {}) {
  const s = safe(() => builderInfo(game));
  if (!s || (!s.job && !s.shop)) return '';
  const j = s.job;
  return `<details class="card workshop bd-card"${ui.bdOpen ? ' open' : ''}>
    <summary>
      <span class="ws-title"><span class="lbl">${esc(s.trade ?? '목수')}${j ? ' · 맡은 일' : ' · 작업장'}</span><strong>${esc(j ? `${j.client}의 ${j.what}` : s.shop.name)}</strong></span>
      <span class="ws-demand ${j && !j.here ? 'down' : 'up'}">${esc(j ? (j.left ? `${j.left}달 남음` : '마무리') : s.rank)}</span>
    </summary>
    <div class="ws-body">
      ${j ? `<p class="note">${esc(j.place)}${j.here ? '' : ' · <b class="warn">가 있어야 일이 는다</b>'} · 품삯 은화 ${j.pay}닢${j.need ? ` · 솜씨 ${j.need} 넘게 바란다` : ''}</p>` : ''}
      ${s.shop ? `<p class="note">${esc(s.shop.name)} · ${esc(s.shop.place)} · ${s.shop.since}년부터 · 이름값 ${s.shop.rep}${s.shop.apprentices.length ? ` · 도제 ${s.shop.apprentices.map(esc).join(', ')}` : ''}</p>` : ''}
      ${s.guild.banned ? '<p class="note"><b class="warn">길드에서 쫓겨나</b> 큰일을 맡기 어렵다.</p>' : s.guild.owed ? `<p class="note">길드 회비 은화 ${s.guild.owed}닢이 밀렸다.</p>` : ''}
    </div>
  </details>`;
}

export function renderBuilderBlock(game) {
  const s = safe(() => builderInfo(game));
  if (!s || (!s.skill && !s.done && !s.built.length)) return '';
  const chips = [];
  if (s.done) chips.push(['마친 일', `${s.done}번`]);
  if (s.earned) chips.push(['번 돈', `은화 ${s.earned}닢`, 'up']);
  if (s.places.length) chips.push(['일한 고장', `${s.places.length}곳`]);
  if (s.falls) chips.push(['무너진 것', `${s.falls}`, 'down']);
  const v = s.built.some((b) => b.gone && game.date.year - (parseInt(b.look, 10) || 0) <= 2) ? 'fallen' : s.trade === '석공' ? 'stone' : s.job ? 'scaffold' : 'roof';
  const art = safe(() => vignetteImage({ plate: 'build', variant: v, year: game.date.year, month: game.date.month }), '');
  const ALT = { fallen: '무너진 건물 자리', stone: '돌을 다듬는 석공', scaffold: '비계 위의 일꾼들', roof: '지붕을 올리는 날' };
  return `<div class="block bd-block">
    <h3>목수와 석공</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[v]}">` : ''}
    ${s.skill ? `<div class="wd-row kn-row"><span>${esc(s.trade ?? '집 짓는')} 솜씨 · ${esc(s.hand)}</span>${bar(s.skill, 'kin')}<span class="v">${s.skill}</span></div>` : ''}
    <p class="note">길드 지위: ${esc(s.rank)}${s.mark ? ` · 내 표식 ${esc(s.mark)}` : ''}${s.famMark && s.famMark !== s.mark ? ` · 집안 표식 ${esc(s.famMark)}` : ''}</p>
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.built.length ? `<ul class="ag-clues">${s.built.slice(0, 6).map((b) => `<li><b>${esc(b.name)}</b> · ${esc(b.kind)} · ${esc(b.place)} · ${b.y}년 · ${b.gone ? `<b class="warn">${esc(b.look)}</b>` : esc(b.look)}</li>`).join('')}</ul>` : ''}
    ${s.built.length > 6 ? `<p class="note">그 밖에 ${s.built.length - 6}채</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>먹줄과 정으로 지난 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
