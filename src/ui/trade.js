// 14단계 '장사 길과 상단' 화면(src/trade). 읽기만 한다.
// 지도 화면 카드: 이 장터의 시세, 진 짐, 대상단, 상회, 맞수, 장부. 짐을 지고 길에 있을 때 '이번 달' 화면에 작은 카드.
import { tradeStatus, GOODS } from '../trade/index.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const pct = (x) => `${Math.round(x * 100)}%`;
const agoWord = (m) => (m <= 0 ? '이번 달' : m < 12 ? `${m}달 전` : `${Math.floor(m / 12)}년 전`);
const chip = (k, v, down = false) => `<span class="sm-chip${down ? ' down' : ''}"><span>${esc(k)}</span><b>${esc(String(v))}</b></span>`;

function cargoRows(s) {
  return `<ul class="ct-houses td-cargo">${s.cargo.map((c) => {
    const gain = c.sellHere != null ? c.sellHere - c.each : null;
    return `<li><div class="top"><strong>${esc(c.name)} ${c.qty}짐</strong><span class="note">짐당 ${c.each}닢에 샀다</span></div>
      ${c.sellHere != null ? `<span class="note${gain < 0 ? ' warn' : ' ok'}">여기서 팔면 짐당 ${c.sellHere}닢 (${gain >= 0 ? '+' : ''}${gain})</span>` : ''}
      ${c.best ? `<span class="note">장부에서 가장 비싸게 쳐준 곳: ${esc(c.best.placeName)} ${c.best.price}닢 (${agoWord(c.best.ago)})</span>` : ''}</li>`;
  }).join('')}</ul>`;
}

/** 이번 달 화면: 짐을 지고 길 위에 있을 때 */
export function renderTradeNow(game) {
  const s = safe(() => tradeStatus(game));
  if (!s?.road || !s.cargoQty) return '';
  const danger = s.road.danger ?? 0;
  return `<section class="card trade-now${danger >= 0.25 ? ' bad' : ''}">
    <h2>짐을 지고 가는 길 <small>${esc(s.road.toName)}으로</small></h2>
    <div class="sm-chips">${chip('짐', `${s.cargoQty}/${s.capacity}`)}${chip('도적이 노릴 걱정', pct(danger), danger >= 0.25)}${s.caravan.guards ? chip('호위', s.caravan.guards) : ''}${s.caravan.unpaid ? chip('밀린 삯', `${s.caravan.unpaid}달`, true) : ''}</div>
  </section>`;
}

/** 지도 화면 카드 */
export function renderTrade(game) {
  const s = safe(() => tradeStatus(game));
  if (!s) return '';
  const C = s.caravan;
  const hasCaravan = C.wagons || C.guards || C.porters;
  const any = s.cargo.length || hasCaravan || s.house || s.rival || s.trips || s.profit || s.seen.length > 1 || s.debts.length;
  if (!any) return '';
  const head = s.house ? `${esc(s.house.name)} · ${esc(s.house.rank)}` : s.profit ? `장사로 남긴 돈 ${s.profit}닢` : `${esc(s.placeName)}`;
  const priceList = s.prices.length ? `<details class="pl-more"${s.cargo.length ? '' : ' open'}><summary>${esc(s.placeName)} 장터 시세</summary>
      <ul class="td-prices">${s.prices.map((p) => `<li class="${p.word === '싸다' ? 'cheap' : p.word === '비싸다' ? 'dear' : ''}"><span>${esc(p.name)}</span><span class="note">사면 ${p.buy} · 팔면 ${p.sell}</span><b>${esc(p.word)}</b></li>`).join('')}</ul>
      ${s.toll?.rate ? `<p class="note">이 고장 성문 통행세: 짐값의 ${pct(s.toll.rate)}</p>` : ''}</details>` : '';
  const caravan = hasCaravan ? `<div class="sm-chips">${chip('마차', `${C.wagons}/${C.maxWagons}`)}${chip('호위', `${C.guards}/${C.maxGuards}`)}${chip('짐꾼', C.porters)}${chip('달마다 삯', `${C.upkeep}닢`, C.unpaid > 0)}</div>` : '';
  const H = s.house;
  const house = H ? `<div class="tw-mem">
      <div class="top"><strong>${esc(H.name)}</strong><span class="note">${esc(H.rank)}${H.income ? ` · 지점 벌이 달마다 ${H.income}닢` : ''}</span></div>
      ${H.fortune != null ? `<div class="wd-row kn-row"><span>형편 ${H.fortune}</span>${bar(H.fortune, H.fortune < 25 ? 'low' : 'kin')}</div>` : ''}
      <span class="note">지점 ${H.branches.length}곳${H.branches.length ? `: ${esc(H.branches.map((b) => b.name).join(', '))}` : ''}</span>
      ${H.nextRank ? `<span class="note">${esc(H.nextRank)}${H.canLevel ? '(으)로 키울 수 있다' : '(으)로 키우려면'}: 밑천 ${H.levelCost}닢, 장사로 남긴 돈 ${H.levelProfit}닢</span>` : ''}
    </div>` : s.canFound ? `<p class="note">장사로 ${s.foundProfit}닢을 넘게 남겼다. 밑천 ${s.foundCost}닢이 있으면 상회를 세울 수 있다.</p>` : '';
  const R = s.rival;
  const rival = R ? `<div class="tw-mem td-rival">
      <div class="top"><strong>맞수: ${esc(R.name)}</strong>${R.thugs ? '<span class="note warn">칼잡이를 부린다</span>' : ''}</div>
      <div class="wd-row kn-row"><span>맞섬 ${Math.round(R.heat)}</span>${bar(R.heat, 'low')}</div>
    </div>` : '';
  const sums = [];
  if (s.trips) sums.push(`장삿길 ${s.trips}번`);
  if (s.volume) sums.push(`사고판 짐 ${s.volume}`);
  if (s.profit) sums.push(`남긴 돈 ${s.profit}닢`);
  if (s.guild) sums.push('상인 길드 패');
  if (s.pact) sums.push(`${esc(s.pact.name)}와 휴전 ${s.pact.months}달 남음`);
  const ledger = s.seen.length ? `<details class="pl-more"><summary>장부: 다녀온 장터 ${s.seen.length}곳</summary><ul class="pl-news td-ledger">${s.seen.map((x) => {
      const top = Object.entries(x.prices ?? {}).filter(([k]) => GOODS[k]).sort((a, b) => b[1] / GOODS[b[0]].base - a[1] / GOODS[a[0]].base).slice(0, 3); // 제값보다 비싸게 쳐주는 순
      return `<li><time>${agoWord(x.ago)}</time><span><b>${esc(x.placeName)}</b>${top.length ? ` · 제값보다 잘 쳐주는 것: ${top.map(([k, v]) => `${esc(goodName(s, k))} ${v}`).join(', ')}` : ''}</span></li>`;
    }).join('')}</ul></details>` : '';
  return `<section class="card trade-card">
    <h2>장사 길 <small>${head}</small></h2>
    ${s.banned ? '<p class="note warn">이 장터에서는 길드에 쫓겨나 사고팔 수 없다.</p>' : ''}
    ${s.road ? `<p class="note">짐을 지고 ${esc(s.road.toName)}으로 가는 길이다. 도적이 노릴 걱정 ${pct(s.road.danger ?? 0)}.</p>` : ''}
    ${s.cargo.length ? `<h3 class="sub">진 짐 ${s.cargoQty}/${s.capacity}</h3>${cargoRows(s)}` : ''}
    ${caravan}
    ${priceList}
    ${house}${rival}
    ${s.debts.length ? `<p class="note">받을 외상: ${s.debts.map((d) => `${esc(d.who)} ${d.amt}닢${d.months ? ` (${d.months}달 뒤)` : ''}`).join(', ')}</p>` : ''}
    ${s.rumor ? `<p class="note">도는 소문: ${esc(s.rumor.placeName)}에서 ${esc(s.rumor.name)} 값이 오른다더라 (${agoWord(s.rumor.ago)})</p>` : ''}
    ${sums.length ? `<p class="note">${sums.join(' · ')}</p>` : ''}
    ${ledger}
    ${s.log.length ? `<details class="pl-more"><summary>장삿길의 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}

const goodName = (s, k) => GOODS[k]?.name ?? k;
