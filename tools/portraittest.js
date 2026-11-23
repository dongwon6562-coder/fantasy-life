import './lsshim.js';
import '../src/content.js';
// 38단계 도우미2 점검: 초상 대폭 손질. 실제 판의 모든 사람·종족·나이·표정·반신 초상이 깨지지 않는지,
// 새 표정(슬픔·노기·거만)이 형편에서 저절로 나오는지, 시대 장신구가 발명을 따르는지,
// 같은 쪽에 같은 사람이 둘(둥근·반신) 떠도 id가 겹치지 않는지, 작은 초상은 필터 없이 가벼운지 본다.
import { newGame, endMonth, me, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { portrait, moodOf, eraBits } from '../src/art/portrait.js';
import { gearOf } from '../src/art/portraitGear.js';
import { hashStr, rngFrom } from '../src/art/portraitKit.js';

const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const broken = (s) => /NaN|undefined|Infinity|\[object|null/.test(s);
const idsOf = (s) => [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);

// 1. 실제 판: 백 년 남짓 굴린 뒤 모든 사람을 세 크기와 반신으로
const g = newGame({ name: '한스', sex: 'm', familyId: 'merchant', mode: 'free', seed: 3811 });
for (let m = 0; m < 12 * 60 && !g.over; m++) {
  for (let k = 0; k < 6 && g.pendingEvent; k++) resolveEvent(g, rngOf(g), 0);
  if (!g.over) endMonth(g, [{ id: 'rest' }]);
}
let n = 0, smallBytes = 0, smallN = 0;
for (const p of g.people.slice(0, 900)) {
  for (const opt of [{ size: 40 }, { size: 84 }, { size: 112, bust: true }]) {
    const s = portrait(g, p, opt);
    n++;
    ok(!broken(s), `broken svg ${p.name} ${JSON.stringify(opt)}`);
    if (opt.size < 72) { smallBytes += s.length; smallN++; ok(!/filter="url/.test(s), `small portrait uses filter ${p.name}`); }
    if (opt.bust) ok(s.includes('viewBox="0 0 100 128"') && s.includes(`height="${Math.round(112 * 1.28)}"`), 'bust frame');
    const ids = idsOf(s);
    ok(new Set(ids).size === ids.length, `duplicate id inside one portrait ${p.name}`);
  }
}
const pl = me(g);
ok(!broken(portrait(g, pl, { size: 84, scars: g.player.scars ?? [] })), 'player portrait');
console.log(`portraits ${n}, small avg ${(smallBytes / smallN / 1024).toFixed(1)}KB`);
ok(smallBytes / smallN < 17 * 1024, `small portraits got heavy: ${(smallBytes / smallN / 1024).toFixed(1)}KB`);

// 2. 같은 사람을 둥근 틀과 반신으로 한 화면에: id가 겹치면 한쪽이 다른 쪽 틀을 빌려 쓴다
const one = g.people.find((p) => p.alive && p.ageMonths > 12 * 25) ?? g.people[0];
const a = idsOf(portrait(g, one, { size: 112 })), b = idsOf(portrait(g, one, { size: 112, bust: true }));
ok(!a.some((x) => b.includes(x)), 'round and bust portraits share ids');

// 3. 종족·나이·표정 두루
const RACES = [['human'], ['elf'], ['half_elf'], ['dwarf'], ['demon'], ['half_demon'], ['beast', 'wolf'], ['beast', 'cat'], ['beast', 'hawk'], ['beast', 'lion']];
const MOODS = ['', 'warm', 'cold', 'tired', 'stressed', 'sick', 'grief', 'fierce', 'proud'];
const JOBS = ['farmer', 'smith', 'scholar', 'lord', 'knight', 'priest', 'mercenary', 'weaver', 'merchant', 'court_mage', 'beggar', 'pirate_lord'];
const G2 = { people: [], history: { inventions: ['lens', 'clock', 'factory'] }, date: { year: 520, month: 3 } };
let k = 0;
for (const [race, beast] of RACES) for (const age of [1, 8, 15, 30, 55, 85]) {
  const p = { id: 5000 + k, name: '시험' + k, lastName: '성', sex: k % 2 ? 'm' : 'f', race, beast, ageMonths: age * 12 * (race === 'elf' ? 6 : 1), job: JOBS[k % JOBS.length], alive: true, wealth: [0, 40, 200, 3000][k % 4], history: [] };
  const s = portrait(G2, p, { size: 120, mood: MOODS[k % MOODS.length], bust: k % 3 === 0, scars: k % 5 === 0 ? ['왼뺨의 칼자국', '화상 자국', '눈가의 흉터'] : [] });
  ok(!broken(s), `race ${race} ${beast ?? ''} ${age} mood ${MOODS[k % MOODS.length]}`);
  k++;
}

// 4. 표정이 형편에서 저절로
const adult = { id: 1, name: '가', lastName: '나', sex: 'm', ageMonths: 12 * 40, job: 'farmer', alive: true, history: [] };
ok(moodOf(G2, { ...adult, affection: -60 }) === 'fierce', 'hated → fierce');
ok(moodOf(G2, { ...adult, affection: -30 }) === 'cold', 'disliked → cold');
ok(moodOf(G2, { ...adult, affection: 60 }) === 'warm', 'liked → warm');
ok(moodOf(G2, { ...adult, affection: 0 }, 'adult', 'lord') === 'proud', 'lord → proud');
ok(moodOf(G2, { ...adult, affection: 60 }, 'adult', 'lord') === 'warm', 'friendly lord still warm');
ok(moodOf(G2, { ...adult, affection: 0, history: [{ y: 520, m: 1, text: '배우자 미라을(를) 잃었다.' }] }) === 'grief', 'widowed this season → grief');
ok(moodOf(G2, { ...adult, affection: 0, history: [{ y: 515, m: 1, text: '배우자 미라을(를) 잃었다.' }] }) === '', 'old loss fades');
ok(moodOf(G2, { ...adult, affection: 0, history: [{ y: 520, m: 2, text: '노름판에서 돈을 잃었다.' }] }) === '', 'money loss is not grief');
const gp = { player: { id: 9, injuries: [], fatigue: 30, stress: 20 }, cloth: { wear: { kind: 'mourn' } }, date: G2.date };
ok(moodOf(gp, { ...adult, id: 9, isPlayer: true }) === 'grief', 'player in mourning → grief');
ok(moodOf(G2, { ...adult, ageMonths: 12 * 8, affection: -60 }) === 'cold', 'children are not fierce');

// 5. 시대 장신구는 발명을 따른다
ok(eraBits(null) === 0 && eraBits({ history: { inventions: ['lens'] } }) === 1 && eraBits(G2) === 7, 'eraBits');
const scholars = (era) => Array.from({ length: 200 }, (_, i) => gearOf({ o: { kind: 'robe' }, job: 'scholar', tier: 2, stage: 'middle', male: i % 2 === 0, age: 50, era, patch: 0, r: rngFrom(hashStr('t' + i)) }));
const withLens = scholars(1).filter((x) => x.glasses).length, noLens = scholars(0).filter((x) => x.glasses).length;
ok(noLens === 0 && withLens > 60 && withLens < 180, `glasses follow lens: ${noLens} / ${withLens}`);
const rich = (era) => Array.from({ length: 200 }, (_, i) => gearOf({ o: { kind: 'doublet' }, job: 'merchant', tier: 4, stage: 'adult', male: true, age: 40, era, r: rngFrom(hashStr('w' + i)) }));
ok(rich(0).every((x) => !x.watch && !x.cravat) && rich(6).filter((x) => x.watch).length > 60 && rich(6).filter((x) => x.cravat).length > 60, 'watch and cravat follow clock and factory');
ok(gearOf({ o: { kind: 'tunic' }, job: 'scholar', tier: 2, stage: 'child', male: true, age: 9, era: 7, r: rngFrom(1) }).glasses === undefined, 'no glasses on children');
ok(gearOf({ o: { kind: 'robe' }, job: 'scholar', tier: 2, stage: 'elder', male: true, age: 70, era: 1, patch: 1, r: rngFrom(hashStr('t0')) }).glasses === undefined, 'no glasses over an eye patch');

// 6. 같은 사람은 늘 같은 얼굴
ok(portrait(G2, adult, { size: 112 }) === portrait({ ...G2 }, { ...adult }, { size: 112 }), 'deterministic');

const sec = (Date.now() - t0) / 1000;
console.log(`${sec.toFixed(1)}s, fail ${fail}`);
ok(sec < (process.env.FL_PARALLEL ? 120 : 60), 'under a minute');
if (fail) { console.log('portraittest FAILED'); process.exit(1); }
console.log('portraittest ok');
