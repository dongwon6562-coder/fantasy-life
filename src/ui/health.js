// 15단계 '병과 의술' 화면(src/health). 읽기만 한다.
// renderHealthNow: 이번 달 화면 카드 (내가·식구가 앓거나, 이 고장에 병이 돌 때만)
// renderHealthBlock: '나' 화면 덩이 (낫지 않는 병, 집안 내력, 지나간 돌림병, 앓은 일)
import { healthInfo } from '../health/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const sickCls = (w) => (w === '사경을 헤맨다' || w === '깊이 앓는다' ? 'dark' : w === '거의 나았다' ? 'gift' : '');
const obCls = (w) => (w === '크게 돈다' ? 'dark' : '');

function sickList(s) {
  if (!s.sick.length) return '';
  const li = (x) => `<li><div class="wd-row kn-row"><span>${esc(x.who)} · ${esc(x.name)} · ${esc(x.sevWord)}</span>${bar(x.sev, x.sev >= 55 ? 'low' : 'kin')}</div>
      <span class="note">${x.months ? `${x.months}달째` : '이번 달부터'}${x.treat ? ` · ${esc(x.treat)}에게 맡김` : ' · 아직 아무에게도 맡기지 않음'}</span></li>`;
  const list = s.sick.slice().sort((a, b) => (b.me - a.me) || b.sev - a.sev);
  return `<ul class="ct-houses hl-sick">${list.map(li).join('')}</ul>`;
}

/** 이번 달 화면 카드 */
export function renderHealthNow(game) {
  const s = safe(() => healthInfo(game));
  if (!s || (!s.sick.length && !s.here.length)) return '';
  const bad = s.sick.some((x) => x.sev >= 55) || s.here.some((o) => o.sevWord === '크게 돈다');
  const untreated = s.sick.some((x) => !x.treat);
  return `<section class="card health-now${bad ? ' bad' : ''}">
    <h2>병과 의술${s.here.length ? ' <small>이 고장에 병이 돈다</small>' : ''}</h2>
    ${s.here.length ? `<div class="ct-tags">${s.here.map((o) => `<span class="ct-tag ${obCls(o.sevWord)}">${esc(o.name)} · ${esc(o.sevWord)}${o.left > 0 ? ` · ${o.left}달 더` : ''}</span>`).join('')}</div>` : ''}
    ${sickList(s)}
    ${untreated ? '<p class="note">할 일의 \'치료 구하기\'로 누구에게 맡길지 언제든 다시 정할 수 있다. 내가 앓을 땐 \'몸조리하기\'도 있다.</p>' : ''}
  </section>`;
}

/** '나' 화면 덩이 */
export function renderHealthBlock(game) {
  const s = safe(() => healthInfo(game));
  if (!s) return '';
  const any = s.chronic.length || s.lineage.length || s.past.length || s.cured || s.quacked || s.log.length || s.outbreaks.length;
  if (!any) return '';
  const chips = [];
  if (s.cured) chips.push(['고친 병', `${s.cured}`, false]);
  if (s.quacked) chips.push(['약장수에게 속음', `${s.quacked}번`, true]);
  return `<div class="block health-block">
    <h3>병과 의술</h3>
    ${s.chronic.length ? `<ul class="ct-houses hl-chronic">${s.chronic.map((c) => `<li><div class="top"><strong>${esc(c.name)}</strong><span class="note">${c.since ? `${c.since}년부터` : ''}${c.from ? `${c.since ? ' · ' : ''}${esc(c.from)} 뒤로` : ''}</span></div><span class="note">${esc(c.desc)}</span></li>`).join('')}</ul>` : ''}
    ${s.lineage.length ? `<div class="ct-tags">${s.lineage.map((l) => `<span class="ct-tag heir">집안 내력: ${esc(l.name)}${l.gens > 1 ? ` · ${l.gens}대째` : ''}</span>`).join('')}</div>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${s.outbreaks.length ? `<p class="note">지금 도는 병: ${s.outbreaks.map((o) => `${esc(o.region)} ${esc(o.name)} (${esc(o.sevWord)})`).join(', ')}</p>` : ''}
    ${s.past.length ? `<details class="pl-more"><summary>지나간 큰 돌림병 ${s.past.length}가지</summary><ul class="pl-news">${s.past.map((p) => `<li><time>${p.y}년</time><span>${esc(p.region)} ${esc(p.name)}</span></li>`).join('')}</ul></details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>앓고 고친 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
