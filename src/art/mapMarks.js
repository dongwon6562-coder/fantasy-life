// 38단계 지도 표시: 소문 난 곳과 험한 곳, 그리고 범례. 지도 그림(map.js)이 부른다. 규칙은 건드리지 않고 읽기만 한다.
// - 소문: 내가 들은 소식(game.rumor.heard, 지난 두 해)이 난 곳에 먹색 쪽지 표. 들은 글은 설명 칸에.
// - 다른 갈래가 표를 더하려면 MAP_MARKS에 (game) => [{ place, kind: 'rumor'|'danger'|'note', text }] 함수를 넣는다.
export const MAP_MARKS = [];

const safe = (fn, d = null) => { try { return fn(); } catch { return d; } };
const RUMOR_YEARS = 2;

/** 장소마다 표 모으기: { 장소 id: { rumor: [글], danger: [글], note: [글] } } */
export function marksOf(g) {
  const out = {};
  const add = (pl, kind, text) => { if (!pl || !text) return; const m = (out[pl] ??= { rumor: [], danger: [], note: [] }); const k = m[kind] ? kind : 'note'; if (!m[k].includes(text) && m[k].length < 4) m[k].push(text); };
  const heard = safe(() => g.rumor?.heard ?? [], []);
  const now = (g?.date?.year ?? 0) * 12 + (g?.date?.month ?? 0);
  for (let i = heard.length - 1; i >= 0; i--) {
    const h = heard[i];
    if (!h?.pl || now - (h.y * 12 + h.m) > RUMOR_YEARS * 12) continue;
    add(h.pl, 'rumor', String(h.text).replace(/^[^:]{1,24}:\s*/, ''));
  }
  for (const fn of MAP_MARKS) for (const m of safe(() => fn(g) ?? [], [])) add(m.place, m.kind, m.text);
  return out;
}

const INK = '#2b2018', RED = '#8c2a1a', PAPER = '#f0e6cb';
/**
 * 표 그리기. el·layer·byId·pin은 map.js의 것. 돌려주는 값: { count, info(place) }
 */
export function drawMarks(el, layer, g, byId, pin) {
  const M = safe(() => marksOf(g), {});
  let count = 0;
  for (const [id, m] of Object.entries(M)) {
    const p = byId[id]; if (!p) continue;
    const hasR = m.rumor.length > 0, hasD = m.danger.length > 0;
    if (!hasR && !hasD) continue;
    count++;
    const g0 = el('g', { class: 'map-mark', 'pointer-events': 'none' }, layer); pin(g0, p.x, p.y, '--ls');
    if (hasR) {
      // 접힌 쪽지 (왼쪽 위)
      const t = el('g', { transform: 'translate(-15 -15)' }, g0);
      el('path', { d: 'M-5.4 -4.2h8.6l2.2 2.2v6.2h-10.8z', fill: PAPER, stroke: INK, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, t);
      el('path', { d: 'M3.2 -4.2v2.2h2.2', fill: 'none', stroke: INK, 'stroke-width': 0.6 }, t);
      el('path', { d: 'M-3.6 -1h5.4M-3.6 1h6.6M-3.6 3h4.2', stroke: INK, 'stroke-width': 0.55 }, t);
      if (m.rumor.length > 1) el('text', { x: 6.6, y: 6.8, 'font-size': 6, 'font-weight': 700, fill: INK, stroke: PAPER, 'stroke-width': 1.6, 'paint-order': 'stroke', 'font-family': 'serif' }, t).textContent = String(m.rumor.length);
    }
    if (hasD) {
      // 엇갈린 칼 (오른쪽 위)
      const t = el('g', { transform: 'translate(15 -15)' }, g0);
      el('circle', { cx: 0, cy: 0, r: 5.6, fill: PAPER, stroke: RED, 'stroke-width': 0.8 }, t);
      el('path', { d: 'M-3.2 -3.2l6.4 6.4M3.2 -3.2l-6.4 6.4M-3.6 1.6l2 2M3.6 1.6l-2 2', stroke: RED, 'stroke-width': 1.1, 'stroke-linecap': 'round' }, t);
    }
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const info = (place) => {
    const m = place?.id ? M[place.id] : null;
    if (!m) return '';
    const parts = [];
    if (m.rumor.length) parts.push(`<p class="note map-rumor"><b>들려온 소문</b><br>${m.rumor.slice(0, 3).map(esc).join('<br>')}</p>`);
    if (m.danger.length) parts.push(`<p class="note map-danger" style="color:${RED}"><b>험한 소식</b><br>${m.danger.slice(0, 3).map(esc).join('<br>')}</p>`);
    return parts.join('');
  };
  return { count, info };
}

/** 범례 (설명 칸에 넣는 HTML). 그림은 지도 위 기호와 같은 모양으로 작게 */
export function legendHtml() {
  const sv = (inner, w = 30) => `<svg width="${w}" height="22" viewBox="${-w / 2} -11 ${w} 22" aria-hidden="true">${inner}</svg>`;
  const rows = [
    [sv(`<circle r="7.2" fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/><path d="M-3.7 3.2V-1h1.3v1.1h1.2V-3.5h.8v-1h.8v1h.8V.1h1.2V-1h1.3V3.2Z" fill="${INK}"/>`), '수도'],
    [sv(`<circle r="5.2" fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/><path d="M-2.6 2.4V-.6h1.2v.9h.8V-2.4h1.2v2.7h.8v-.9h1.2V2.4Z" fill="${INK}"/>`), '도시'],
    [sv(`<circle r="3.3" fill="${PAPER}" stroke="${INK}" stroke-width="1.2"/><circle r="1.3" fill="${INK}"/>`), '마을'],
    [sv(`<path d="M-5 5V-2.6h2v1.6h2V-4.8h2v3.8h2v-1.6h2V5Z" fill="${PAPER}" stroke="${INK}" stroke-width="1.2"/>`), '요새'],
    [sv(`<path d="M-5 5.2V-.8a5 5 0 0 1 10 0V5.2Z" fill="#2c1822" stroke="#d9a84e" stroke-width="1.3"/><path d="M-2.2 5.2V.2a2.2 2.2 0 0 1 4.4 0V5.2Z" fill="#d9a84e"/>`), '미궁'],
    [sv(`<path d="M-6 5.2h12v-1.6h-1.4V-3.6l-1.3 1.2-1.3-1.4V3.6h-2V-.4l-1.2-1.1-1.4 1V3.6H-6Z" fill="#dccfb0" stroke="#4a3828" stroke-width="1.1"/>`), '폐허'],
    [sv(`<circle r="8" fill="none" stroke="${RED}" stroke-width="1.6"/><path d="M0-8V-10.5" stroke="#3a1a10" stroke-width="1.2"/><path d="M.5-11Q4-11.6 7-9.6Q4-8.8.5-7Z" fill="${RED}"/>`), '지금 있는 곳'],
    [sv(`<circle r="7" fill="${RED}" fill-opacity=".1" stroke="${RED}" stroke-width=".9"/>`), '가 본 곳 (겹고리는 한 해 넘게)'],
    [sv(`<path d="M-11 0H11" stroke="${RED}" stroke-width="1.8" stroke-dasharray="3.4 2.8"/>`), '내가 다닌 길'],
    [sv(`<path d="M-5.4-4.2h8.6l2.2 2.2v6.2h-10.8z" fill="${PAPER}" stroke="${INK}" stroke-width=".8"/><path d="M-3.6-1h5.4M-3.6 1h6.6M-3.6 3h4.2" stroke="${INK}" stroke-width=".55"/>`), '소문이 난 곳'],
    [sv(`<circle r="5.6" fill="${PAPER}" stroke="${RED}" stroke-width=".8"/><path d="M-3.2-3.2l6.4 6.4M3.2-3.2l-6.4 6.4" stroke="${RED}" stroke-width="1.1"/>`), '험한 곳 (산적·점령·마물)'],
    [sv(`<path d="M-12 0H12" stroke="#553a24" stroke-width="1.3" stroke-dasharray="4.2 2.2"/>`), '큰길'],
    [sv(`<path d="M-12 0H12" stroke="#5a4636" stroke-width="1" stroke-dasharray="1 3.4"/>`), '옛길·오솔길'],
    [sv(`<path d="M-12 0H12" stroke="#3f565e" stroke-width="1.2" stroke-dasharray=".6 4" stroke-linecap="round"/>`), '뱃길'],
    [sv(`<path d="M-12 0H12" stroke="#5a3424" stroke-width=".9" stroke-dasharray="2 1.6"/>`), '나라 경계'],
  ];
  return `<div class="map-legend"><p class="kind">범례</p>${rows.map(([s, t]) => `<div class="lg-row">${s}<span>${t}</span></div>`).join('')}</div>`;
}
