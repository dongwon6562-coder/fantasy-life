import './lsshim.js';
import '../src/content.js';
// 불로 뼈대 점검 (헤드, 27단계): 몸 나이가 멈춤, 늙어 죽지 않음, 잃으면 다시 늙음, 대 잇기에 넘어가지 않음, NPC 불로, 저장 왕복.
import { newGame, endMonth, me, slotsFor } from '../src/game.js';
import { makeRng } from '../src/rng.js';
import { bodyAgeOf, ageYears, makePerson } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { crimeState } from '../src/crime.js';
import { becomeHeir } from '../src/heir.js';
import { registerAgelessPath, makeAgeless, loseAgeless, isAgeless, agelessInfo, AG, makeNpcAgeless } from '../src/ageless/core.js';
import { encodeSave, decodeSave } from '../src/save.js';

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
registerAgelessPath('test_path', { name: '시험의 길', kind: 'free', blurb: '점검용' });

const g = newGame({ name: '멈춘해', sex: 'm', familyId: 'farmer', mode: 'free', seed: 2701 });
for (const p of g.people) p.ageMonths += 30 * 12; g.date.year += 30; (g.flags ??= {}).adult = true;
check(agelessInfo(g) === null, '처음엔 불로 정보 없음');
check(makeAgeless(g, 'test_path'), '불로가 됨');
const at = me(g).agelessAt;
check(at >= 29 && at <= 31, `멈춘 나이 ${at}`);
check(!makeAgeless(g, 'test_path'), '두 번 되지 않음');
me(g).ageMonths += 70 * 12; g.date.year += 70;
check(bodyAgeOf(me(g)) === at, `70년 뒤에도 몸 나이 ${bodyAgeOf(me(g))}`);
check(ageYears(me(g)) >= 100, '실제 나이는 흐름');
const info = agelessInfo(g);
check(info?.ageless && info.pathName === '시험의 길' && info.years >= 70, `화면 정보 ${JSON.stringify(info)}`);
// 몇 해를 돌려도 늙어 죽지 않는다 (칼·병은 다른 갈래 몫이라 노환만 본다)
let oldAge = 0;
for (let i = 0; i < 120 && !g.over; i++) {
  L(g).place = 'ern'; L(g).travel = null; crimeState(g).jailed = null; g.pendingEvent = null; L(g).scene = null; g.player.fatigue = 0;
  endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: 'rest' })));
  if (L(g).pendingDeath === '노환') oldAge++;
}
check(oldAge === 0, `불로인데 노환 ${oldAge}`);
// 저장 왕복
const g2 = decodeSave(encodeSave(g));
check(isAgeless(me(g2)) && AG(g2).path === 'test_path', '저장 왕복');
// 잃으면 다시 늙는다
check(loseAgeless(g2, '시험'), '잃음');
check(!isAgeless(me(g2)) && bodyAgeOf(me(g2)) > 90, `잃은 뒤 몸 나이 ${bodyAgeOf(me(g2))}`);
check(agelessInfo(g2)?.lost.length === 1 && !agelessInfo(g2).ageless, '잃은 기록');
// NPC 불로
const npc = g.people.find((p) => !p.isPlayer && p.alive);
makeNpcAgeless(npc, 40); npc.ageMonths = 300 * 12;
check(bodyAgeOf(npc) === 40, 'NPC 불로');
// 대 잇기: 넘어가지 않는다
const g3 = newGame({ name: '잇는이', sex: 'f', familyId: 'farmer', mode: 'free', seed: 2702 });
for (const p of g3.people) p.ageMonths += 30 * 12; g3.date.year += 30; (g3.flags ??= {}).adult = true;
makeAgeless(g3, 'test_path');
const kid = makePerson(makeRng({ s: 11 }), { ageMonths: 16 * 12, lastName: g3.player.lastName });
g3.people.push(kid); me(g3).childIds.push(kid.id); g3.player.familyIds.push(kid.id); kid.known = true;
(L(g3).ancestors ??= []).push({ name: g3.player.name, lastName: g3.player.lastName, born: g3.date.year - 46, died: g3.date.year });
becomeHeir(g3, makeRng({ s: 5 }), kid);
check(me(g3).id === kid.id, '대를 이음');
check(!isAgeless(me(g3)) && AG(g3).path === null, '대 잇기에 불로 넘어가지 않음');
console.log(fail ? `불로 뼈대 점검 실패 ${fail}` : '불로 뼈대 점검 통과');
process.exit(fail ? 1 : 0);
