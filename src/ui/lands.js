// 44단계 '넓어진 세상' 화면(src/lands landsInfo). 읽기만 한다.
// renderLandsMap: 지도 화면 카드 (지금 고장의 말투·풍습·일거리·위험, 나라마다 새 고장 목록: 가 봤나·들어갈 수 있나·통행증)
import { landsInfo } from '../lands/index.js';
import { esc } from './util.js';
import { J } from '../narrative/text.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };

export function renderLandsMap(game) {
  const s = safe(() => landsInfo(game));
  if (!s || !s.lands.length) return '';
  const h = s.here;
  const byRealm = new Map();
  for (const l of s.lands) { if (!byRealm.has(l.realm)) byRealm.set(l.realm, []); byRealm.get(l.realm).push(l); }
  const seen = s.lands.filter((l) => l.seen).length;
  return `<section class="card ld-map">
    <h2>나라마다의 고장 <small>가 본 곳 ${seen}/${s.lands.length}</small></h2>
    ${h ? `<div class="ld-here">
      <p><strong>${esc(h.name)}</strong> · ${esc(h.size)} · 사람 ${h.pop}명</p>
      <ul class="ag-clues">
        <li><b>말투</b> ${esc(h.speech)}</li>
        <li><b>풍습</b> ${esc(h.custom)}</li>
        <li><b>일거리</b> ${esc(h.work)}</li>
        <li><b>위험</b> ${esc(h.danger)}</li>
      </ul>
    </div>` : ''}
    ${[...byRealm].map(([realm, list]) => `<details class="ld-realm">
      <summary><span>${esc(realm)}</span><b>${list.filter((l) => l.seen).length}/${list.length}</b></summary>
      <ul class="ld-list">${list.map((l) => `<li class="${l.seen ? 'seen' : ''}${l.open ? '' : ' shut'}"><b>${esc(l.name)}</b><span>${esc(l.kind)}${l.size !== '보통' && !String(l.kind).includes(l.size) ? ` · ${esc(l.size)}` : ''}${l.born ? ` · 이곳 태생 ${l.born}명` : ''}</span>${l.open ? (l.seen ? '<em>가 봤다</em>' : '') : `<em>${l.gate ? `${esc(J(l.gate, '이/가'))} 있어야` : '아직 못 간다'}</em>`}</li>`).join('')}</ul>
    </details>`).join('')}
    ${s.passes.length ? `<p class="note">지닌 통행증: ${s.passes.map(esc).join(', ')}</p>` : ''}
  </section>`;
}
