// 9단계 대륙 정세 화면: 지도 위 국경·전쟁 표시(지도 그림에 겹 하나를 얹는다)와 지도 아래 '대륙 정세' 카드.
// 지도 그림(src/art/map.js)은 건드리지 않는다. 지도가 다 그려진 뒤 그 SVG에 우리 겹(g.pol-layer)만 붙인다.
import { politicsMap, continentNews, fallenHouses, tieLine } from '../politics/index.js';
import { short } from '../politics/state.js';
import { P, nations as MAP_NATIONS } from '../art/mapdata.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
const NS = 'http://www.w3.org/2000/svg';
const colorOf = (id) => { const n = MAP_NATIONS.find((x) => x.id === id); return n ? `rgb(${n.c.join(',')})` : '#7a6a55'; };
const KIND = { alliance: '동맹', trade: '교역 조약', truce: '휴전', marriage: '혼인', vassal: '신종' };

/* ---------- 지도 위 겹 ---------- */
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
function drawLayer(svg, m) {
  svg.querySelector('g.pol-layer')?.remove();
  const layer = el('g', { class: 'pol-layer', 'aria-hidden': 'true' });
  const contested = new Set(m.wars.flatMap((w) => w.lands));
  for (const l of m.lands) {
    if (!l.changed && !contested.has(l.id)) continue;
    const p = P.find((x) => x.id === l.id);
    if (!p) continue;
    const g = el('g', { class: `pol-land${contested.has(l.id) ? ' war' : ''}${l.changed ? ' changed' : ''}` }, layer);
    g.style.transform = `translate(${p.x}px, ${p.y}px) scale(var(--ls, 1))`;
    if (l.changed) {
      // 주인이 바뀐 땅: 새 주인 색 고리와 깃발
      el('circle', { r: 13, fill: 'none', stroke: colorOf(l.owner), 'stroke-width': 3.2, opacity: 0.9 }, g);
      el('path', { d: 'M9 -9V-24', stroke: '#2b2018', 'stroke-width': 1.1 }, g);
      el('path', { d: 'M9.4 -24H20L17 -20.5L20 -17H9.4Z', fill: colorOf(l.owner), stroke: '#2b2018', 'stroke-width': 0.8 }, g);
    }
    if (contested.has(l.id)) {
      // 싸움이 벌어지는 땅: 붉은 점선 고리와 엇갈린 칼
      el('circle', { class: 'pol-ring', r: 17, fill: 'none', stroke: '#b3261e', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, g);
      const s = el('g', { transform: 'translate(-14 -16)', stroke: '#7d1712', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);
      el('path', { d: 'M-5 -5L5 5M5 -5L-5 5' }, s);
      el('path', { d: 'M-6.5 -2.5L-2.5 -6.5M2.5 -6.5L6.5 -2.5', 'stroke-width': 1.2 }, s);
    }
  }
  // 지형 그림 바로 위(장소 기호 아래)에 놓아 기호를 가리지 않게 한다
  const img = svg.querySelector('image');
  if (img && img.nextSibling) svg.insertBefore(layer, img.nextSibling); else svg.appendChild(layer);
}

/** 지도가 그려지면 겹을 얹는다. 떼어 낼 함수를 돌려준다. */
export function decorateMap(host, game, ui) {
  if (ui.polLayer === false) return () => {};
  const m = safe(() => politicsMap(game));
  if (!m) return () => {};
  let done = false;
  const tryDraw = () => {
    if (done) return true;
    const svg = host.querySelector('svg');
    if (!svg || host.querySelector('.map-loading') || !svg.querySelector('g')) return false;
    try { drawLayer(svg, m); } catch (e) { console.error(e); }
    done = true;
    return true;
  };
  if (tryDraw()) return () => {};
  const mo = new MutationObserver(() => { if (tryDraw()) mo.disconnect(); });
  mo.observe(host, { childList: true, subtree: true });
  return () => mo.disconnect();
}

/* ---------- 지도 아래 카드 ---------- */
export function renderPolitics(game, ui) {
  const m = safe(() => politicsMap(game));
  if (!m) return '';
  const name = (id) => m.realms.find((r) => r.id === id)?.name ?? safe(() => short(id), id);
  const changed = m.lands.filter((l) => l.changed);
  const wars = m.wars.map((w) => {
    const lead = w.lead ? `${esc(short(w.lead))} 쪽이 우세` : '팽팽하다';
    return `<li class="pl-war"><div class="top"><span class="sw" style="--c:${colorOf(w.a)}"></span><strong>${esc(w.aName)}</strong><span class="vs">대</span><span class="sw" style="--c:${colorOf(w.b)}"></span><strong>${esc(w.bName)}</strong></div>
      <span class="note">${w.months}달째 · ${lead}${w.lands.length ? ` · 싸우는 곳: ${esc(w.lands.map((id) => m.lands.find((l) => l.id === id)?.name ?? id).join(', '))}` : ''}</span></li>`;
  }).join('');
  const realmRow = (r) => {
    const tags = [];
    if (r.overlord) tags.push(`${esc(short(r.overlord))}의 신하국`);
    if (r.wars.length) tags.push(`<b class="warn">${esc(r.wars.map((x) => short(x)).join('·'))}와 전쟁</b>`);
    if (r.allies.length) tags.push(`동맹: ${esc(r.allies.map((x) => short(x)).join('·'))}`);
    return `<li><div class="top"><span class="sw" style="--c:${colorOf(r.id)}"></span><strong>${esc(r.name)}</strong>${r.ruler ? `<span class="note">${esc(r.ruler)}${r.age ? ` (${r.age}살)` : ''}</span>` : ''}</div>
      <div class="pl-bars"><span class="lb">군세</span><span class="wd-bar"><i style="width:${Math.min(100, r.power)}%"></i></span><span class="lb">안정</span><span class="wd-bar ${r.stab < 35 ? 'low' : ''}"><i style="width:${Math.min(100, r.stab)}%"></i></span></div>
      ${tags.length ? `<span class="note">${tags.join(' · ')}</span>` : ''}</li>`;
  };
  const leonia = m.realms.filter((r) => r.id !== 'leonia').map((r) => `<li><span>${esc(short(r.id))}</span><span class="note">${esc(safe(() => tieLine(game, 'leonia', r.id), ''))}</span></li>`).join('');
  const news = safe(() => continentNews(game, 6), []);
  const fallen = safe(() => fallenHouses(game), []);
  return `<section class="card pol-card">
    <h2>대륙 정세 <small>${m.wars.length ? `전쟁 ${m.wars.length}곳` : '큰 전쟁 없음'}</small></h2>
    <div class="pl-legend"><label class="pl-toggle"><input type="checkbox" id="pol-layer"${ui.polLayer === false ? '' : ' checked'}> 지도에 국경·전쟁 표시</label>
      <span class="note"><span class="lg-ring war"></span>싸우는 곳 <span class="lg-ring changed"></span>주인이 바뀐 땅 (깃발 색이 새 주인)</span></div>
    ${wars ? `<ul class="pl-list">${wars}</ul>` : '<p class="note">지금 대륙에는 나라끼리 맞붙은 전쟁이 없다.</p>'}
    ${changed.length ? `<p class="note">주인이 바뀐 땅: ${changed.map((l) => `${esc(l.name)} → ${esc(short(l.owner))}`).join(', ')}</p>` : ''}
    ${m.pacts.length ? `<p class="note">조약: ${m.pacts.map((p) => `${esc(short(p.a))}·${esc(short(p.b))} ${KIND[p.kind] ?? ''}`).join(', ')}</p>` : ''}
    ${news.length ? `<h3 class="sub">대륙 소식</h3><ul class="pl-news">${news.map((n) => `<li><time>${n.y}년 ${n.m}월</time><span>${esc(n.text)}</span></li>`).join('')}</ul>` : ''}
    <details class="pl-more"><summary>나라들 ${m.realms.length}곳과 레오니아와의 사이</summary>
      <ul class="pl-list pl-realms">${m.realms.map(realmRow).join('')}</ul>
      ${leonia ? `<h3 class="sub">레오니아와 이웃</h3><ul class="pl-ties">${leonia}</ul>` : ''}
      ${fallen.length ? `<p class="note">끊긴 왕조: ${fallen.map((f) => `${esc(name(f.realm))}의 ${esc(f.house ?? '')} (${f.y}년)`).join(', ')}</p>` : ''}
    </details>
  </section>`;
}

export function bindPolitics(ui, rerender) {
  const t = document.getElementById('pol-layer');
  if (t) t.onchange = () => { ui.polLayer = t.checked; rerender(); };
}
