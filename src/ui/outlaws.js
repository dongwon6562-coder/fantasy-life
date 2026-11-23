// 37단계 '산적' 화면(src/outlaws). 읽기만 한다.
// renderOutlaws: 지도 카드 (산채마다 두목·사람 수·통행세·현상금·쫓는 기세, 이 고장 무법 정도, 사라진 산채)
// renderOutlawsBlock: '나' 화면 덩이 (내가 든 산채와 자리, 길목에 나간 일·턴 것·나눠 준 것·붙잡혀 간 일, 기록)
import { outlawsInfo } from '../outlaws/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const chip = ([k, v, cls]) => `<span class="sm-chip${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`;
const art = (g, variant) => safe(() => vignetteImage({ plate: 'outlaw', variant, year: g.date.year, month: g.date.month }), '');
const ALT = { den: '산채의 모닥불', pass: '고갯길 길목', raid: '습격당하는 수레', ransom: '몸값을 기다리는 밤' };

export function renderOutlaws(game) {
  const s = safe(() => outlawsInfo(game));
  if (!s || (!s.bands.length && !s.past.length)) return '';
  const v = s.here ? 'pass' : s.bands.some((b) => b.heat >= 60) ? 'raid' : 'den';
  const src = art(game, v);
  return `<section class="card ol-map">
    <h2>산적과 의적 <small>${s.bands.length ? `산채 ${s.bands.length}곳` : '지금은 없다'}</small></h2>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    <div class="wd-row kn-row"><span>이 고장 길의 무법</span>${bar(s.lawless, s.lawless >= 50 ? 'low' : 'kin')}<span class="v">${s.lawless}</span></div>
    ${s.here ? `<p class="note"><b class="warn">${esc(s.here)}</b>의 산채가 이 고장 길목을 쥐고 있다.</p>` : ''}
    ${s.bands.length ? `<ul class="ag-clues">${s.bands.map((b) => `<li><b>${esc(b.name)}</b>${b.noble ? ' <span class="ct-tag ally">의적</span>' : ''}${b.mine ? ' <span class="ct-tag dark">내 산채</span>' : ''} · 두목 ${esc(b.chief)} · ${esc(b.lairName ?? b.place)} · ${esc(b.menWord)}${b.toll ? ` · 통행세 ${b.toll}닢` : ''}${b.deal ? ' · 마을과 뒷거래' : ''} · ${esc(b.heatWord)}${b.bounty ? ` · 현상금 은화 ${b.bounty}닢` : ''}</li>`).join('')}</ul>` : '<p class="note">지금은 이름난 산채가 없다.</p>'}
    ${s.past.length ? `<p class="note">사라진 산채: ${s.past.map((x) => `${esc(x.name)}(${x.from}~${x.to}년, ${esc(x.endWord)})`).join(', ')}</p>` : ''}
  </section>`;
}

export function renderOutlawsBlock(game) {
  const s = safe(() => outlawsInfo(game));
  if (!s) return '';
  const m = s.me ?? {};
  const chips = [];
  if (m.rides) chips.push(['길목에 나감', `${m.rides}번`]);
  if (m.robbed) chips.push(['길에서 털림', `${m.robbed}번`, 'down']);
  if (m.tolls) chips.push(['통행세', `${m.tolls}번`]);
  if (m.ransom) chips.push(['몸값', `${m.ransom}번`]);
  if (m.gave) chips.push(['나눠 준 것', `${m.gave}번`, 'up']);
  if (m.hunted) chips.push(['두목 사냥', `${m.hunted}번`, 'up']);
  if (m.informed) chips.push(['밀고', `${m.informed}번`]);
  if (!chips.length && !m.band && !m.captive && !s.log.length) return '';
  const v = m.captive ? 'ransom' : m.band ? 'den' : m.hunted ? 'pass' : 'raid';
  const src = art(game, v);
  return `<div class="block ol-block">
    <h3>산적</h3>
    ${src ? `<img class="blk-art" src="${src}" alt="${ALT[v]}">` : ''}
    ${m.band ? `<p><strong>${esc(m.band)}</strong>${m.role ? ` · ${m.role === 'chief' ? '두목' : '산채 사람'}` : ''}</p>` : ''}
    ${m.captive ? '<p class="note"><b class="warn">산적에게 붙잡혀 있다</b></p>' : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(chip).join('')}</div>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>길목에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
