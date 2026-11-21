// 13단계 '하늘과 땅' 화면(src/nature). 읽기만 한다.
// 이번 달: 내 고장에 재앙·흉년·겨울 걱정이 있을 때만 작은 카드. 지도: 고장마다 올해 소출과 지금 든 재앙, 지나간 재앙.
import { natureInfo, natureLine } from '../nature/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const cropCls = (c) => (c < 72 ? 'low' : c >= 112 ? 'kin' : '');
const SEV_CLS = { 크다: 'dark', 심하다: 'dark', 가볍다: '' };

/** '레오니아 정세' 줄 */
export function natureRow(game) {
  const line = safe(() => natureLine(game), '');
  return line ? ['하늘과 땅', line] : null;
}
export const NATURE_ALARM = /가뭄|홍수|혹한|지진|메뚜기|폭풍|흉년|겨울 준비가 없다/;

/** 이번 달 화면: 걱정할 일이 있을 때만 */
export function renderNatureNow(game, opt = {}) {
  const s = safe(() => natureInfo(game));
  if (!s) return '';
  const here = s.active.filter((d) => d.here);
  const m = game.date.month;
  const winterWorry = (m === 12 || m <= 2) && /겨울 준비가 없다/.test(safe(() => natureLine(game), ''));
  if (!here.length && !s.famine && !winterWorry) return '';
  return `<section class="card nature-now${here.some((d) => d.sevWord !== '가볍다') || s.famine ? ' bad' : ''}">
    <h2>하늘과 땅 <small>${esc(s.seasonName)} · ${esc(s.region.name)}</small></h2>
    ${opt.noSky ? "" : `<p class="nt-sky">${esc(s.sky)}</p>`}
    ${here.length ? `<div class="ct-tags">${here.map((d) => `<span class="ct-tag ${SEV_CLS[d.sevWord] ?? ''}">${esc(d.name)} · ${esc(d.sevWord)}${d.left > 0 ? ` · ${d.left}달 더` : ''}</span>`).join('')}</div>` : ''}
    ${s.famine ? `<p class="note warn">${s.lean >= 2 ? `${s.lean}해째 ` : ''}흉년이다. 빵값이 평년의 ${s.bread.toFixed(1)}배.</p>` : ''}
    ${winterWorry ? '<p class="note warn">겨울 준비가 없다. 할 일의 \'겨울나기 준비\'로 땔감과 먹을 것을 쟁일 수 있다.</p>' : ''}
  </section>`;
}

/** 지도 화면 카드 */
export function renderNature(game) {
  const s = safe(() => natureInfo(game));
  if (!s) return '';
  const farms = s.regions.filter((r) => r.farm);
  const others = s.regions.filter((r) => !r.farm);
  const act = (r) => s.active.filter((d) => d.region === r.name);
  const row = (r) => `<li class="${r.id === s.region.id ? 'here' : ''}">
      <div class="wd-row kn-row"><span>${esc(r.name)}${r.id === s.region.id ? ' · 여기' : ''} · ${esc(r.cropWord)}</span>${bar(Math.min(100, r.crop / 1.3), cropCls(r.crop))}</div>
      ${act(r).length ? `<span class="note warn">${act(r).map((d) => `${esc(d.name)} (${esc(d.sevWord)})`).join(', ')}</span>` : ''}</li>`;
  const chips = [
    ['빵값', `평년의 ${s.bread.toFixed(1)}배`, s.bread >= 1.3],
  ];
  const mo = game.date.month;
  if (mo >= 9 || mo <= 2) chips.push(['겨울 준비', s.winterReady ? '했다' : '아직', !s.winterReady && (mo === 12 || mo <= 2)]);
  if (s.dike) chips.push(['둑', '올해 쌓았다', false]);
  return `<section class="card nature-card">
    <h2>하늘과 땅 <small>${esc(s.seasonName)}${s.famine ? ` · ${s.lean >= 2 ? `${s.lean}해째 ` : ''}흉년` : ''}</small></h2>
    ${opt.noSky ? "" : `<p class="nt-sky">${esc(s.sky)}</p>`}
    <div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>
    <h3 class="sub">곡창의 올해 소출</h3>
    <ul class="nt-regions">${farms.map(row).join('')}</ul>
    ${others.length ? `<details class="pl-more"><summary>그 밖의 고장 ${others.length}곳</summary><ul class="nt-regions">${others.map(row).join('')}</ul></details>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지나간 재앙 ${s.past.length}번</summary><ul class="pl-news">${s.past.map((d) => `<li><time>${d.y}년${d.m ? ` ${d.m}월` : ''}</time><span>${esc(d.region)}에 ${esc(d.name)} (${esc(d.sevWord)})</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>하늘과 땅에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
    <p class="note">철마다 할 일이 다르다: 봄 파종(3~4월), 장마 앞 둑 쌓기(6~7월), 가을걷이(9~10월), 겨울나기 준비(9~11월).</p>
  </section>`;
}
