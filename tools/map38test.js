// 38단계 지도와 아이콘 점검 (도우미스레드3). 1분 안에.
// 아이콘: 모든 행동이 그림을 얻고 SVG 글이 깨지지 않는다. 고장 지도: 모든 고장이 그려지고 글이 새지 않는다. 지도 표: 소문·험한 곳이 모인다.
import './lsshim.js';
import '../src/content.js';
import { ACTIONS } from '../src/actions.js';
import { icon, iconName, ICON_NAMES, iconBase, actionIcon } from '../src/art/icons.js';
import { townMapSvg, townSpec } from '../src/art/mapTown.js';
import { marksOf, legendHtml } from '../src/art/mapMarks.js';
import { MAP_PLACES_EXTRA } from '../src/art/map.js';
import { P, roads } from '../src/art/mapdata.js';
import { PLACES } from '../src/places.js';
import { newGame } from '../src/game.js';
import { newBand } from '../src/outlaws/state.js';
import { occupy } from '../src/occupied/world.js';
import { makeRng } from '../src/rng.js';

const T0 = Date.now();
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const balanced = (s) => { const open = (s.match(/<(?!\/)[a-zA-Z][^>]*[^/]>/g) ?? []).length, close = (s.match(/<\/[a-zA-Z]+>/g) ?? []).length; return open === close; };

// 1. 아이콘
let scroll = 0;
for (const a of ACTIONS) {
  const n = iconName(a);
  check(ICON_NAMES.includes(n), `${a.id}: 없는 그림 ${n}`);
  if (n === 'scroll') scroll++;
}
check(scroll <= 8, `두루마리로 떨어지는 행동이 많다 (${scroll})`);
for (const n of ICON_NAMES) {
  const s = icon(n, 32);
  check(!BAD.test(s) && balanced(s) && s.startsWith('<svg') && s.includes('class="ico'), `아이콘 ${n}`);
  check(['play', 'home', 'book', 'body', 'sword', 'shield', 'meditate', 'magic', 'herb', 'cook', 'coin', 'labor', 'wander', 'visit', 'rest', 'farm', 'pray', 'hunt', 'travel', 'smith', 'dungeon', 'heart', 'scroll', 'crown', 'gear', 'ship'].includes(iconBase(n)), `${n}의 옛 갈래 ${iconBase(n)}`);
}
{ const a = icon('home'), b = icon('home'); const ia = a.match(/mask id="([^"]+)"/)?.[1], ib = b.match(/mask id="([^"]+)"/)?.[1]; check(ia && ib && ia !== ib, '마스크 id가 겹치지 않는다'); }
check(icon('없는이름').includes('data-ico="scroll"'), '모르는 이름은 두루마리');
check(actionIcon({ id: 'zzz_unknown' }).includes('<svg'), '모르는 행동도 그림');

// 2. 고장 지도: 지도의 모든 장소와 게임의 모든 고장
const g = newGame({ name: '하랄트', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3 });
g.life.houses = ['harfen']; newBand(g, 'harfen', makeRng({ s: 1 }), { men: 20 }); occupy(g, 'verden', makeRng({ s: 2 }), () => {});
const all = [...P, ...MAP_PLACES_EXTRA];
const ids = new Set(all.map((p) => p.id));
for (const id of Object.keys(PLACES)) check(ids.has(id), `게임 고장 ${id}이 지도에 없다`);
let n = 0;
for (const p of all) {
  const nb = new Set(); for (const r of roads) for (let i = 0; i < r.length; i++) if (r[i] === p.id) { if (r[i - 1]) nb.add(r[i - 1]); if (r[i + 1]) nb.add(r[i + 1]); }
  const s = townMapSvg(p, g, { neighbors: [...nb].map((x) => all.find((q) => q.id === x)).filter(Boolean), kind: '고장' });
  n++;
  check(s.startsWith('<svg') && !BAD.test(s) && balanced(s), `고장 지도 ${p.id}: ${s.match(BAD)?.[0]}`);
  check(s.length < 260000, `고장 지도 ${p.id}가 너무 크다 (${s.length})`);
  if (PLACES[p.id]) check(townSpec(p) && (townSpec(p).marks ?? []).length >= 1, `${p.id} 이름난 곳`);
}
{ const s = townMapSvg(all.find((p) => p.id === 'harfen'), g, { neighbors: [] }); check(s.includes('내 집') && s.includes('산채'), '하르펜: 내 집과 산채'); }
{ const s = townMapSvg(all.find((p) => p.id === 'verden'), g, { neighbors: [] }); check(s.includes('#1a1a1a'), '베르덴: 점령 깃발'); }
{ const a = townMapSvg(all.find((p) => p.id === 'ern'), g, {}), b = townMapSvg(all.find((p) => p.id === 'ern'), g, {}); check(a === b, '같은 고장은 늘 같은 그림'); }

// 3. 지도 표
g.rumor ??= {}; g.rumor.heard = [{ y: g.date.year, m: g.date.month, pl: 'leocast', text: '장터 소문: 왕도에 돌림병이 돈다.' }, { y: g.date.year - 5, m: 1, pl: 'eisen', text: '오래된 소문' }];
const M = marksOf(g);
check(M.leocast?.rumor?.[0] === '왕도에 돌림병이 돈다.', `소문 표 ${JSON.stringify(M.leocast)}`);
check(!M.eisen, '오래된 소문은 지도에서 빠진다');
check(M.harfen?.danger?.length >= 1 && M.verden?.danger?.length >= 1, `험한 곳 표 (산적·점령) ${JSON.stringify(M.harfen)}`);
const lg = legendHtml(); check(lg.includes('소문이 난 곳') && balanced(lg) && !BAD.test(lg), '범례');
console.log(`  고장 지도 ${n}곳, 아이콘 ${ICON_NAMES.length}가지, 두루마리 ${scroll}`);
console.log(`map38test ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
