// 33단계 '태어난 집안' 화면(src/origins). 읽기만 한다.
// renderOriginBlock: '나' 화면 덩이 (집안이 바라는 것과 짊어진 것이 어떻게 되어 가는지, 어릴 적 곁의 사람들, 기록)
import { originInfo } from '../origins/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
// 집안마다 어린 시절 그림 (vignettePlates12 origin·demon)
const ART = { count_bastard: ['origin', 'manor'], tower_blood: ['origin', 'tower'], sexton: ['origin', 'church'], capital_artisan: ['origin', 'workshop'], slum_orphan: ['origin', 'slum'], port_folk: ['origin', 'port'], march_guard: ['demon', 'fort'], merchant_bastard: ['baseborn', 'door'] };
const ALT = { manor: '귀족 저택의 뒤뜰', tower: '마탑 아래 골목', church: '성당 종탑', workshop: '장인 공방', slum: '빈민가 골목', port: '항구 도시 부두', fort: '얼음 해협을 지키는 요새', door: '거상의 저택 문간에 선 아이' };

export function renderOriginBlock(game) {
  const s = safe(() => originInfo(game));
  if (!s || s.past) return '';
  const a = ART[s.id];
  const art = a ? safe(() => vignetteImage({ plate: a[0], variant: a[1], year: game.date.year, month: game.date.month }), '') : '';
  const ties = s.ties.filter((t) => t.name);
  return `<div class="block og-block">
    <h3>태어난 집안</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[a[1]]}">` : ''}
    <p><strong>${esc(s.name)}</strong> · ${esc(s.standing)} · ${esc(s.place)}</p>
    <ul class="ag-clues">
      <li><b>바라는 것</b> ${esc(s.want.name)} · ${esc(s.want.state)}</li>
      <li><b>짊어진 것</b> ${esc(s.burden.name)} · ${esc(s.burden.state)}</li>
    </ul>
    ${ties.length ? `<p class="note">어릴 적 곁의 사람: ${ties.map((t) => `${esc(t.word)} ${esc(t.name)}${t.alive ? '' : '(세상을 떴다)'}`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>집안에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
