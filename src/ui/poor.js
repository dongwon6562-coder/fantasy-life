// 18단계 '밑바닥에서 살기' 화면(src/poor). 읽기만 한다.
// renderPoorNow: 이번 달 화면 카드 (길바닥·빚 노역·굶주림일 때만)
// renderPoorBlock: '나' 화면 덩이 (밑바닥에서 지낸 날, 다시 일어섬, 빈민가 사람들, 베푼 것·부린 사람, 기록)
import { poorStatus } from '../poor/index.js';
import { HOME_NAMES } from '../places.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const BOSS = { paid: '거지 왕초에게 몫을 낸다', refused: '거지 왕초의 몫을 거절했다', joined: '거지 왕초 밑에 들어갔다' };

const folkList = (s) => (s.folk.length ? `<ul class="vl-nbs pr-folk">${s.folk.map((f) => `<li><span class="vl-nb-txt"><span class="wd-row kn-row"><strong>${esc(f.name)}</strong>${bar(f.bond, 'kin')}</span><span class="note">${esc(f.desc)}</span></span></li>`).join('')}</ul>` : '');

/** 이번 달 화면 카드 */
export function renderPoorNow(game) {
  const s = safe(() => poorStatus(game));
  if (!s) return '';
  const B = s.bond;
  if (!B && !s.street && !(s.broke && s.hunger > 0)) return '';
  return `<section class="card poor-now bad">
    <h2>${B ? '빚 노역' : s.street ? '길바닥' : '밑바닥'} <small>${esc(s.placeName)}${s.slum ? ' · 빈민가가 있다' : ''}</small></h2>
    ${B ? `<p class="note"><b>${esc(B.placeName)} ${esc(B.name)}</b>에서 ${esc(B.master ?? '주인')}에게 빚을 갚으며 일한다. ${B.months ? `${B.months}달째` : '이번 달부터'} · 남은 빚 은화 ${B.owed}닢${B.here ? '' : ' · <b class="warn">지금 그곳을 떠나 있다</b>'}</p>` : ''}
    <div class="wd-row kn-row"><span>${esc(s.hungerWord)}</span>${bar((s.hunger / 3) * 100, 'low')}</div>
    <p class="note">잠자리: ${esc(HOME_NAMES[s.sleep] ?? '어딘가')}${s.street && s.streetMonths ? ` · 길바닥 ${s.streetMonths}달째` : ''}${s.poorhouse ? ' · 이 고장에 구빈원이 있다' : ''}${s.boss ? ` · ${esc(BOSS[s.boss] ?? '')}` : ''}</p>
    ${folkList(s)}
    ${!B ? '<p class="note">할 일의 \'밑바닥\' 묶음에 구걸, 무료 급식, 날품팔이가 있다.</p>' : ''}
  </section>`;
}

/** '나' 화면 덩이 */
export function renderPoorBlock(game) {
  const s = safe(() => poorStatus(game));
  if (!s) return '';
  const chips = [];
  if (s.beggedTotal) chips.push(['구걸로 얻은 돈', `${s.beggedTotal}닢`, false]);
  if (s.labored) chips.push(['날품', `${s.labored}번`, false]);
  if (s.soup) chips.push(['무료 급식', `${s.soup}번`, false]);
  if (s.bonded) chips.push(['빚 노역', `${s.bonded}번`, true]);
  if (s.fled) chips.push(['노역장에서 달아남', `${s.fled}번`, true]);
  if (s.given) chips.push(['가난한 이에게 준 돈', `${s.given}닢`, false]);
  if (s.hired) chips.push(['밑바닥 사람을 씀', `${s.hired}번`, false]);
  if (s.squeezed) chips.push(['쥐어짬', `${s.squeezed}번`, true]);
  const any = chips.length || s.lowest || s.risen || s.charity.length || s.built.length || s.bondsmen.length || s.log.length || s.folk.length;
  if (!any) return '';
  const now = !!(s.bond || s.street || (s.broke && s.hunger > 0)); // 지금 밑바닥이면 사람들은 이번 달 카드에
  return `<div class="block poor-block">
    <h3>밑바닥 삶</h3>
    ${s.risen || s.lowest ? `<p class="note">${s.lowest ? `가장 밑바닥이던 때: ${s.lowest.year}년 ${esc(s.lowest.placeName)}` : ''}${s.risen ? `${s.lowest ? ' · ' : ''}<b>밑바닥에서 다시 일어섰다</b>` : ''}</p>` : ''}
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${s.built.length ? `<p class="note ok">내가 세운 구빈원: ${s.built.map((b) => `${esc(b.placeName)} (${b.year}년)`).join(', ')}</p>` : ''}
    ${s.charity.length ? `<p class="note">무료 급식에 보탠 곳: ${s.charity.map((c) => `${esc(c.placeName)} ${c.times}번`).join(', ')}</p>` : ''}
    ${s.bondsmen.length ? `<p class="note warn">빚으로 묶어 부리는 사람: ${s.bondsmen.map((b) => `${esc(b.name)} (${esc(b.placeName)}, ${b.months}달째, 남은 빚 ${b.owed}닢)`).join(', ')}</p>` : ''}
    ${!now && s.folk.length ? `<details class="pl-more"><summary>빈민가에서 알게 된 사람 ${s.folk.length}명</summary>${folkList(s)}</details>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>밑바닥에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
