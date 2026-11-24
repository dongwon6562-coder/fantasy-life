// 33단계 '태어난 집안' 화면(src/origins). 읽기만 한다.
// renderOriginBlock: '나' 화면 덩이 (집안이 바라는 것과 짊어진 것이 어떻게 되어 가는지, 어릴 적 곁의 사람들, 기록)
// 42단계: 다른 종족 집안(src/kindred kindredInfo)도 같은 덩이로, 반마족은 뿔이 드러날 위험 막대
import { originInfo } from '../origins/index.js';
import { kindredInfo } from '../kindred/index.js';
import { TREAT_WORD } from '../races/index.js';
import { vignetteImage } from '../art/vignette.js';
import { esc } from './util.js';

const safe = (fn, d = null) => { try { return fn() ?? d; } catch (e) { console.error(e); return d; } };
// 집안마다 어린 시절 그림 (vignettePlates12 origin·demon)
const ART = { count_bastard: ['origin', 'manor'], tower_blood: ['origin', 'tower'], sexton: ['origin', 'church'], capital_artisan: ['origin', 'workshop'], slum_orphan: ['origin', 'slum'], port_folk: ['origin', 'port'], march_guard: ['demon', 'fort'], merchant_bastard: ['baseborn', 'door'] };
const KD_ART = { elf_elder: ['kindred', 'grove'], elf_minstrel: ['kindred', 'minstrel'], elf_freed: ['kindred', 'freed'], dwarf_heir: ['kindred', 'hall'], dwarf_trader: ['kindred', 'trader'], dwarf_outcast: ['kindred', 'exile'], beast_wolf: ['kindred', 'wolf'], beast_tiger: ['kindred', 'tiger'], beast_hawk: ['kindred', 'hawk'], half_elf_border: ['kindred', 'border'], half_elf_noble: ['origin', 'manor'], hd_hidden: ['kindred', 'hidden'], hd_frontier: ['demon', 'land'] };
const bar = (v, cls = '') => `<span class="wd-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const ALT = { grove: '숲 깊은 곳 장로들의 자리', minstrel: '연회장 구석의 엘프 악사', freed: '사슬을 벗은 손목', hall: '땅 밑 씨족의 큰 방', trader: '지상 장터의 드워프 좌판', exile: '씨족을 떠난 길', wolf: '늑대 부족의 밤 모닥불', tiger: '호랑이 부족의 땅', hawk: '벼랑 위 매 부족', border: '숲 경계 마을', hidden: '두건 아래 감춘 뿔', land: '마족 땅이 보이는 변경',  manor: '귀족 저택의 뒤뜰', tower: '마탑 아래 골목', church: '성당 종탑', workshop: '장인 공방', slum: '빈민가 골목', port: '항구 도시 부두', fort: '얼음 해협을 지키는 요새', door: '거상의 저택 문간에 선 아이' };

function hornRows(h) {
  if (!h) return '';
  const rw = h.realm && TREAT_WORD[h.realm] ? `이 나라는 반마족을 ${TREAT_WORD[h.realm]}` : '';
  const tone = ['scorn', 'banned'].includes(h.realm) ? 'down' : h.realm === 'wary' ? 'warn' : '';
  const realmP = rw ? `<p class="note"><b class="${tone}">${esc(rw)}</b></p>` : '';
  if (h.revealed) return `<p class="note"><b class="warn">뿔을 감추지 않는다</b></p>${realmP}`;
  return `<div class="wd-row kn-row"><span>뿔이 드러날 위험${h.near ? ` · 들킬 뻔한 일 ${h.near}번` : ''}</span>${bar(h.risk ?? 0, (h.risk ?? 0) >= 60 ? 'low' : 'kin')}</div>${realmP}`;
}

export function renderOriginBlock(game) {
  const o = safe(() => originInfo(game));
  const k = o ? null : safe(() => kindredInfo(game));
  const s = o ?? k;
  if (!s) return '';
  const h = k?.horn;
  if (s.past && !h) return '';
  if (s.past) return `<div class="block og-block"><h3>태어난 집안</h3>${hornRows(h)}</div>`;
  const a = (o ? ART : KD_ART)[s.id];
  const art = a ? safe(() => vignetteImage({ plate: a[0], variant: a[1], year: game.date.year, month: game.date.month }), '') : '';
  const ties = s.ties.filter((t) => t.name);
  return `<div class="block og-block">
    <h3>태어난 집안</h3>
    ${art ? `<img class="blk-art" src="${art}" alt="${ALT[a[1]]}">` : ''}
    <p><strong>${esc(s.name)}</strong>${s.raceName ? ` · ${esc(s.raceName)}` : ''} · ${esc(s.standing)} · ${esc(s.place)}</p>
    <ul class="ag-clues">
      <li><b>바라는 것</b> ${esc(s.want.name)} · ${esc(s.want.state)}</li>
      <li><b>짊어진 것</b> ${esc(s.burden.name)} · ${esc(s.burden.state)}</li>
    </ul>
    ${hornRows(h)}
    ${ties.length ? `<p class="note">어릴 적 곁의 사람: ${ties.map((t) => `${esc(t.word)} ${esc(t.name)}${t.race && k && t.race !== s.raceName ? `(${esc(t.race)})` : ''}${t.alive ? '' : '(세상을 떴다)'}`).join(', ')}</p>` : ''}
    ${s.log.length ? `<details class="pl-more"><summary>집안에서 있었던 일 ${s.log.length}가지</summary><ul class="pl-news">${s.log.slice().reverse().map((n) => `<li><time>${n.y}년${n.m ? ` ${n.m}월` : ''}</time><span>${esc(n.text)}</span></li>`).join('')}</ul></details>` : ''}
  </div>`;
}
