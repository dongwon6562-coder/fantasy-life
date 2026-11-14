import '../src/content.js';
// 관계 점검: 한 사람을 꾸준히 찾아가 첫사랑 → 연인 → 혼인 → 아이까지 가는지, 옛 저장이 깨지지 않는지.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { living, byId, ageYears } from '../src/npc.js';
import { relationLabel, canRomance } from '../src/relations.js';
import { josa, splitResult } from '../src/narrative/text.js';
import { run as runHooks } from '../src/hooks.js';

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log('FAIL', msg); } };

// 조사
ok(josa('한스', '이/가') === '한스가', 'josa 가');
ok(josa('엘자', '을/를') === '엘자를', 'josa 를');
ok(josa('마틸데', '과/와') === '마틸데와', 'josa 와');
ok(josa('군터', '은/는') === '군터는', 'josa 는');
ok(josa('하인리히', '이/가') === '하인리히가', 'josa 리히');
ok(josa('레온', '이/가') === '레온이', 'josa 이');
ok(josa('하르펜', '으로/로') === '하르펜으로', 'josa 으로');
ok(josa('마을', '으로/로') === '마을로', 'josa ㄹ로');
const sp = splitResult('개울에서 놀았다. (민첩 +0.4, 힘 +0.2)');
ok(sp.scene === '개울에서 놀았다.' && sp.gains === '민첩 +0.4, 힘 +0.2', 'split');

const talkIds = new Set(EVENTS.filter((e) => e.id.startsWith('talk_') || e.id.startsWith('rel_')).map((e) => e.id));
let married = 0, kids = 0, lovers = 0, firstLoves = 0;
const seen = new Set();
const sample = [];

for (let run = 0; run < 24; run++) {
  const g = newGame({ name: '테스트', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'fallen_knight', 'merchant'][run % 3], mode: 'once', seed: 5000 + run });
  let target = null;
  for (let m = 0; m < 12 * 30 && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    // 짝이 될 만한 또래를 골라 꾸준히 만난다
    if ((!target || !target.alive || target.away || (target.spouseId && target.spouseId !== g.player.id)) && playerAge(g) >= 10) {
      target = living(g).filter((p) => !p.isPlayer && p.sex !== g.player.sex && Math.abs(ageYears(p) - playerAge(g)) <= 2 && !g.player.familyIds.includes(p.id) && !p.spouseId)[0] ?? null;
      if (target) target.known = true;
    }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      if (i < 2 && target && acts.some((a) => a.id === 'visit')) choices.push({ id: 'visit', target: target.id });
      else { const a = rng.pick(acts.filter((x) => !x.needsTarget)); choices.push({ id: a.id }); }
    }
    endMonth(g, choices);
    for (const r of g.lastResults) {
      ok(!/undefined|NaN|\[object/.test(r.text), `bad result ${r.name}: ${r.text}`);
      if (r.name === '아는 사람 찾아가기' && run === 1 && m % 23 === 0) sample.push(`${playerAge(g)}살 ${r.text}`);
    }
    if (g.pendingEvent) {
      const pe = g.pendingEvent;
      ok(!/undefined|NaN|\[object/.test(pe.text), `bad event text ${pe.id}: ${pe.text}`);
      if (talkIds.has(pe.id)) seen.add(pe.id);
      const out = resolveEvent(g, rngOf(g), 0);
      ok(typeof out === 'string' && !/undefined|NaN/.test(out), `bad outcome ${pe.id}: ${out}`);
      if (run <= 3 && (pe.id.startsWith('talk_') || pe.id.startsWith('rel_')) && pe.id !== 'talk_chat_young') sample.push(`${playerAge(g)}살 [${pe.title}] ${pe.text} → ${out}`);
    }
  }
  const meP = me(g);
  if (g.player.firstLoveId) firstLoves++;
  if (g.people.some((p) => p.bond === 'lover' || p.bond === 'spouse' || p.bond === 'ex')) lovers++;
  if (meP.spouseId || g.people.some((p) => p.bond === 'spouse')) married++;
  const myKids = g.people.filter((p) => p.fatherId === meP.id || p.motherId === meP.id);
  kids += myKids.length;
  for (const k of myKids) ok(g.player.familyIds.includes(k.id), 'child in family');
  for (const p of g.people) if (p.known && !p.isPlayer) ok(relationLabel(g, p).length > 0, 'label');
  ok(g.people.every((p) => (p.memories ?? []).length <= 10), 'memory cap');
  // 옛 저장(관계 필드 없음)을 불러와도 돌아가는지
  const old = JSON.parse(JSON.stringify(g));
  delete old.relations; delete old.player.firstLoveId;
  for (const p of old.people) { delete p.memories; delete p.romance; delete p.rivalry; delete p.bond; delete p.lastSeen; delete p._mourned; }
  runHooks('migrate', old);
  if (!old.over) for (let m = 0; m < 6; m++) { endMonth(old, [{ id: 'rest' }]); if (old.pendingEvent) resolveEvent(old, rngOf(old), 0); }
  if (run === 3) {
    console.log('--- 표본 ---');
    for (const s of sample) console.log('·', s);
    console.log('관계:', g.people.filter((p) => p.known && !p.isPlayer && p.alive).slice(0, 12).map((p) => `${p.name}=${relationLabel(g, p)}`).join(', '));
  }
}
console.log(`첫사랑 ${firstLoves}/24, 연애 ${lovers}/24, 혼인 ${married}/24, 내 아이 ${kids}명, 나온 대화: ${[...seen].join(',')}`);
ok(firstLoves >= 6, 'first love too rare');
ok(married >= 3, 'marriage too rare'); // 무작위 봇 기준 약 14% (72번에 10번)
ok(kids >= 4, 'children too rare');
ok(canRomance && true, 'export');
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
