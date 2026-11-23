import '../src/content.js';
// 실내 풍경(src/art/sceneInterior.js) 점검: 어느 달에 실내 그림을 쓰는가(sceneFor), node에서 불러지는가. 1초 안.
//   node tools/interiortest.js
import { newGame } from '../src/game.js';
import { L } from '../src/adventure/core.js';
import { ACTIONS } from '../src/actions.js';
import { sceneFor, interiorImage, INTERIOR_KINDS } from '../src/art/sceneInterior.js';

let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const g = newGame({ name: '하넬', sex: 'm', familyId: 'farmer', mode: 'free', seed: 38 });
const ids = new Set(ACTIONS.map((a) => a.id));
const set = (...xs) => { g.lastResults = xs.map((id) => ({ name: id, text: '.', id })); return sceneFor(g); };
const want = { tavern: ['inn_work', 'inn_work', 'rest'], hall: ['court_attend', 'court_attend'], temple: ['pray', 'worship', 'pray'], workshop: ['graubel_forge', 'graubel_forge'], hearth: ['rest', 'kin_time', 'help_home'] };
for (const [kind, xs] of Object.entries(want)) {
  for (const id of xs) if (!ids.has(id)) fail('no such action', id);
  const r = set(...xs); if (r?.kind !== kind) fail('kind', kind, JSON.stringify(r));
}
if (set('travel', 'wander', 'pray') !== null) fail('mostly outside but indoor');
if (set('pray', 'pray', 'rest', 'rest')?.kind !== 'temple') fail('tie first');
L(g).travel = { to: 'harfen', left: 1 }; if (set('pray', 'pray') !== null) fail('travel indoor'); L(g).travel = null;
if (sceneFor(g, 'flood') !== null) fail('calamity indoor');
g.lastResults = [{ name: '쉬기', text: '.' }]; if (sceneFor(g) !== null) fail('old results without id');
L(g).home = 'street'; if (set('rest', 'rest') !== null) fail('street hearth'); L(g).home = 'inn';
L(g).job = { id: 'smith' }; if (set('work', 'work')?.kind !== 'workshop') fail('smith work');
if (interiorImage({ kind: 'hearth' }) !== '' || INTERIOR_KINDS.length !== 5) fail('node image');
// 결과 글에 행동 id가 붙는다
console.log(`interiortest: ${problems ? `${problems} problems` : 'ok'}`);
if (problems) process.exit(1);
