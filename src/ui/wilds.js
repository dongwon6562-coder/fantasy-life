// 19단계 '마물의 땅' 화면(src/wilds). 읽기만 한다.
// renderWilds: 지도 화면 카드 (고장마다 마물 기세와 둥지, 옮겨 가는 떼, 작은 마을, 현상금, 부산물 시세)
// renderWildsNow: 이번 달 화면 한 줄 (지금 고장에 마물이 잦거나 둥지·현상금이 있을 때)
// renderWildsBlock: '나' 화면 덩이 (사냥 기록, 가진 부산물, 기록)
import { wildsInfo } from '../wilds/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const lvCls = (v) => (v >= 60 ? 'low' : v >= 40 ? '' : 'kin');
const SHOW = 8;

export function renderWildsNow(game) {
  const s = safe(() => wildsInfo(game));
  const h = s?.here;
  if (!h || (h.level < 40 && !h.nest && !h.bounties.length)) return '';
  const bits = [esc(h.word)];
  if (h.nest) bits.push(`<b class="warn">${esc(h.nest)}</b>`);
  if (h.bounties.length) bits.push(`현상금 ${h.bounties.map((b) => `${esc(b.kind)}${b.nest ? ' 둥지' : ''} 은화 ${b.reward}닢`).join(', ')}`);
  return `<section class="card wilds-now"><p class="note"><b>마물</b> ${esc(h.place)}: ${bits.join(' · ')}${h.kinds.length ? ` · 나오는 것: ${h.kinds.map(esc).join(', ')}` : ''}</p></section>`;
}

export function renderWilds(game) {
  const s = safe(() => wildsInfo(game));
  if (!s || !s.places.length) return '';
  const place = (p) => `<li><div class="wd-row kn-row"><span><strong>${esc(p.place)}</strong> · ${esc(p.word)}${p.nest ? ` · <b class="warn">${esc(p.nest)}</b>` : ''}</span>${bar(p.level, lvCls(p.level))}</div></li>`;
  const top = s.places.slice(0, SHOW), rest = s.places.slice(SHOW);
  const hamlets = s.hamlets.map((x) => `<li class="${x.state === '버려졌다' ? 'gone' : ''}"><div class="top"><strong>${esc(x.name)}</strong><span class="note">${esc(x.state)}</span></div><span class="note">${esc(x.near)} 근처 · ${x.pop ? `${x.pop}명` : '사람이 없다'}${x.stake ? ' · <b class="ok">내 몫이 있다</b>' : ''}</span></li>`);
  return `<section class="card wilds-card">
    <h2>마물의 땅 <small>${esc(s.here.place)}: ${esc(s.here.word)}</small></h2>
    <ul class="wl-list">${top.map(place).join('')}</ul>
    ${rest.length ? `<details class="pl-more"><summary>나머지 고장 ${rest.length}곳</summary><ul class="wl-list">${rest.map(place).join('')}</ul></details>` : ''}
    ${s.herds.length ? `<p class="note">옮겨 가는 떼: ${s.herds.map((h) => `${esc(h.herd)} (${esc(h.from)} → ${esc(h.to)})`).join(', ')}</p>` : ''}
    ${s.bounties.length ? `<h4 class="ct-h">사냥꾼 길드 현상금 ${s.bounties.length}건</h4><ul class="pl-news">${s.bounties.map((b) => `<li><time>은화 ${b.reward}닢</time><span>${esc(b.place)} · ${esc(b.kind)}${b.nest ? ' 둥지' : ''}${b.months ? ` · ${b.months}달 남음` : ' · 곧 내려감'}</span></li>`).join('')}</ul>` : ''}
    ${hamlets.length ? `<details class="pl-more"><summary>작은 마을 ${hamlets.length}곳${s.hamlets.some((x) => x.state === '버려졌다') ? ' · 버려진 곳 있음' : ''}</summary><ul class="ct-houses">${hamlets.join('')}</ul></details>` : ''}
    ${s.prices.length ? `<details class="pl-more"><summary>부산물 시세 (${esc(s.here.place)})</summary><ul class="pl-news">${s.prices.map((p) => `<li><time>은화 ${p.price}닢</time><span>${esc(p.part)} · ${esc(p.kind)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

export function renderWildsBlock(game) {
  const s = safe(() => wildsInfo(game));
  if (!s) return '';
  const R = s.rec ?? {};
  const chips = [];
  if (R.hunts) chips.push(['사냥', `${R.hunts}번`]);
  if (R.kills) chips.push(['잡은 마물', `${R.kills}번`]);
  if (R.nests) chips.push(['친 둥지', `${R.nests}곳`]);
  if (R.bounties) chips.push(['받은 현상금', `${R.bounties}번`]);
  if (R.sold) chips.push(['부산물로 번 돈', `은화 ${R.sold}닢`]);
  if (R.reclaimed) chips.push(['되찾은 마을', `${R.reclaimed}곳`]);
  if (R.lost) chips.push(['다쳐 물러남', `${R.lost}번`, true]);
  if (!chips.length && !s.parts.length && !s.log.length) return '';
  return `<div class="block wilds-block">
    <h3>마물 사냥</h3>
    ${chips.length ? `<div class="sm-chips">${chips.map(([k, v, down]) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></span>`).join('')}</div>` : ''}
    ${s.parts.length ? `<p class="note">가진 부산물: ${s.parts.map((p) => `${esc(p.name)} ${p.qty}개`).join(', ')} · 여기서 팔면 은화 ${s.partsValue}닢쯤</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>마물에 얽힌 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
