import './lsshim.js';
import '../src/content.js';
// 제자와 문하 점검: 제자 들이기(자식·아는 사람·낯선 아이), 가르치기, 하산, 나를 넘는 제자, 배신, 문파 세우기, 옛 제자의 소식, 대 잇기(문파 잇기·맡기기·돌려받기), 옛 저장.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { mentorState, mentorInfo, myDisciples } from '../src/mentor/index.js';
import { feudState } from '../src/feud/index.js';
import { makePerson, kill } from '../src/npc.js';
import { crimeState } from '../src/crime.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const MENTOR_ACTS = ['mentor_take', 'mentor_teach', 'mentor_found', 'mentor_heritage', 'work', 'rest'];

function adult(seed, fam = 'farmer', age = 28, art = 'sword', lvl = 60) {
  const g = newGame({ name: '스승', sex: seed % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = 'ern'; L(g).home = 'inn';
  g.player.money = 200;
  g.player.skills[art] = lvl;
  return g;
}
function play(g, months, prefer = MENTOR_ACTS, pick = {}, rate = 0.5) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id) && !a.needsTarget);
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel'));
      if (g.player.fatigue > 80) a = acts.find((x) => x.id === 'rest') ?? a;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
    for (const n of g.news ?? []) ok(!bad(n.text), `bad news ${n.text}`);
    for (let k = 0; k < 6 && g.pendingEvent; k++) {
      const pe = g.pendingEvent;
      const kind = L(g).scene?.kind ?? pe.id;
      seen.scenes[kind] = (seen.scenes[kind] ?? 0) + 1;
      ok(!bad(pe.title) && !bad(pe.text) && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`);
      let idx = rngOf(g).int(0, pe.choices.length - 1);
      if (typeof pick[kind] === 'function') idx = pick[kind](pe);
      else if (pick[kind] != null) idx = Math.min(pick[kind], pe.choices.length - 1);
      if (kind === 'heir') idx = 0;
      const out = resolveEvent(g, rngOf(g), idx);
      ok(!bad(typeof out === 'string' ? out : ''), `bad outcome ${kind}: ${out}`);
      if (/^mentor_/.test(kind) && samples.length < 22 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 90)} → ${String(out).slice(0, 140)}`);
    }
    if (L(g).place !== 'ern' && !L(g).travel && !crimeState(g).jailed && rngOf(g).chance(0.25)) L(g).place = 'ern';
  }
}
const checkInfo = (g) => {
  const info = mentorInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `mentorInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  for (const d of info.disciples) ok(Number.isFinite(d.skill) && d.loyalty >= 0 && d.loyalty <= 100, `disciple ${JSON.stringify(d)}`);
  return info;
};

// 1) 솜씨가 모자라면 제자를 못 들이고, 차면 들인다
{
  const g = adult(1, 'farmer', 28, 'sword', 30);
  ok(!availableActions(g).some((a) => a.id === 'mentor_take'), 'no take when unskilled');
  g.player.skills.sword = 60;
  ok(availableActions(g).some((a) => a.id === 'mentor_take'), 'take when skilled');
  play(g, 4, ['mentor_take'], { mentor_pick: 0 }, 1);
  ok(myDisciples(g).length === 1, `took disciple ${myDisciples(g).length}`);
  const s0 = myDisciples(g)[0]?.[1].skill ?? 0;
  play(g, 6, ['mentor_teach'], {}, 1);
  const s1 = myDisciples(g)[0]?.[1].skill ?? 0;
  ok(s1 > s0 + 3, `teaching grows ${s0.toFixed(1)} → ${s1.toFixed(1)}`);
  const info = checkInfo(g);
  ok(info.canTeach && info.arts[0].id === 'sword' && info.disciples[0].skillWord, 'info');
}

// 2) 내 자식을 제자로
{
  const g = adult(2, 'farmer', 40, 'herbs', 65);
  const kid = makePerson(rngOf(g), { ageMonths: 13 * 12, fatherId: me(g).id });
  kid.known = true; g.people.push(kid); me(g).childIds.push(kid.id); g.player.familyIds.push(kid.id);
  play(g, 10, ['mentor_take'], { mentor_pick: 0 }, 1);
  const d = mentorState(g).disciples[kid.id];
  ok(d && d.kid, 'kid as disciple');
}

// 3) 돌보지 않으면 마음이 떠나고 배신한다 (파문하면 원수가 된다)
{
  let betrayed = 0, foes = 0;
  for (let t = 0; t < 6; t++) {
    const g = adult(30 + t, 'farmer', 30, 'sword', 70);
    play(g, 4, ['mentor_take'], { mentor_pick: 2 }, 1);
    const [p, d] = myDisciples(g)[0] ?? [];
    if (!p) continue;
    p.traits = ['ambitious', 'cruel']; d.skill = 50; d.loyalty = 20;
    play(g, 30, ['work', 'rest'], { mentor_betray: 1 }, 1);
    if (mentorState(g).betrayals) betrayed++;
    if (feudState(g).grudges[p.id]) foes++;
  }
  ok(betrayed >= 3, `betrayals ${betrayed}/6`);
  ok(foes >= 1, `betrayer foe ${foes}`);
}

// 4) 하산하고, 옛 제자의 소식이 온다, 문파를 세운다
{
  const g = adult(4, 'farmer', 30, 'smithing', 75);
  play(g, 4, ['mentor_take'], { mentor_pick: 2 }, 1);
  const [p, d] = myDisciples(g)[0];
  d.skill = 66; d.since -= 40; p.ageMonths = 20 * 12;
  for (let i = 0; i < 36 && !mentorState(g).grads.some((x) => x.id === p.id); i++) play(g, 1, ['mentor_teach', 'rest'], { mentor_graduate: 0 }, 1);
  ok(mentorState(g).grads.some((x) => x.id === p.id), 'graduated');
  g.player.money = 300;
  ok(availableActions(g).some((a) => a.id === 'mentor_found'), 'found available');
  play(g, 1, ['mentor_found'], { mentor_found: 0 }, 1);
  const sc = mentorState(g).school;
  ok(sc && /공방$/.test(sc.name) && sc.headId == null, `school ${sc?.name}`);
  mentorState(g).grads.forEach((x) => { x.at -= 40; });
  // 하산한 제자 소식은 달마다 3.5%라 몇 해가 걸릴 수 있다: 소식이 올 때까지(최대 20년) 본다
  for (let i = 0; i < 20 && !mentorState(g).grads.some((x) => x.fate && x.id === p.id) && !g.over; i++) play(g, 12, ['mentor_take', 'mentor_teach', 'rest'], { mentor_pick: 2, mentor_graduate: 0 }, 1);
  ok(mentorState(g).grads.some((x) => x.fate && x.id === p.id), `grad fate ${JSON.stringify(mentorState(g).grads[0])}`);
  checkInfo(g);
}

// 5) 대 잇기: 수제자에게 맡기고, 다음 대가 배우고, 돌려받는다
{
  const g = adult(5, 'farmer', 45, 'sword', 80);
  play(g, 4, ['mentor_take'], { mentor_pick: 2 }, 1);
  const [p, d] = myDisciples(g)[0];
  d.skill = 60; p.ageMonths = 25 * 12; d.loyalty = 90; p.traits = ['kind'];
  mentorState(g).school = { name: '시험류', art: 'sword', place: 'ern', founded: 500, founder: '스승', prestige: 30, members: 5, headId: null, heads: [{ name: '스승', y: 500 }], gens: 1, closed: false, peak: 25 };
  runHooks('heir', g, rngOf(g));
  ok(Object.keys(mentorState(g).disciples).length === 0, 'heir clears disciples');
  ok(L(g).queue.some((s) => s.kind === 'mentor_succession'), 'succession queued');
  play(g, 1, ['rest'], { mentor_succession: (pe) => pe.choices.findIndex((c) => /수제자/.test(c)) }, 1);
  const sc = mentorState(g).school;
  ok(sc.headId === p.id, `head is disciple ${sc.headId}`);
  g.player.skills.sword = 20;
  const before = g.player.skills.sword;
  play(g, 3, ['mentor_heritage'], {}, 1);
  ok(g.player.skills.sword > before + 1, `learn from elder ${before} → ${g.player.skills.sword.toFixed(1)}`);
  g.player.skills.sword = 75; p.affection = 80; me(g).ageMonths = 30 * 12;
  // 앞서 쌓인 장면들이 있어 돌려받기 장면은 몇 달 뒤에 올 수 있다
  // 한 번 거절당하면 원한이 쌓여 마음이 식는다. 판정이 운에 덜 흔들리게 달마다 마음을 되돌려 둔다
  for (let i = 0; i < 24 && sc.headId != null && !g.over; i++) { p.affection = 80; play(g, 1, ['mentor_heritage'], { mentor_reclaim: 0 }, 1); }
  ok(sc.headId == null && sc.gens === 2, `reclaimed ${sc.headId} gens ${sc.gens}`);
  checkInfo(g);
  const old = JSON.parse(JSON.stringify(g)); delete old.mentor;
  runHooks('migrate', old);
  ok(old.mentor && Array.isArray(old.mentor.grads), 'old save mentor');
}

// 5b) 하산·배신한 제자는 다시 후보가 되지 않고, 새 후보는 아는 사람과 이름이 겹치지 않는다
{
  let again = 0, dup = 0;
  for (let t = 0; t < 4; t++) {
    const g = adult(70 + t, 'farmer', 30, 'trade', 90);
    for (let r = 0; r < 8; r++) {
      play(g, 7, ['mentor_take', 'rest'], { mentor_pick: (pe) => Math.max(0, pe.choices.findIndex((c) => /^아는 얼굴/.test(c))) }, 1);
      for (const [p, d] of myDisciples(g)) { d.skill = 85; d.since -= 40; p.ageMonths = Math.max(p.ageMonths, 20 * 12); }
      play(g, 6, ['rest'], { mentor_graduate: 0, mentor_betray: 1 }, 1);
    }
    const m = mentorState(g);
    const ids = m.grads.map((x) => x.id);
    again += ids.length - new Set(ids).size;
    for (const [p] of myDisciples(g)) if (ids.includes(p.id)) again++;
    const names = [...m.grads.map((x) => x.name), ...myDisciples(g).map(([p]) => `${p.name} ${p.lastName}`)];
    dup += names.length - new Set(names).size;
  }
  ok(again === 0, `former disciple taken again ${again}`);
  ok(dup === 0, `same-name disciples ${dup}`);
}

// 6) 여러 삶: 솜씨 있는 어른으로 15년
let schools = 0, grads = 0, betrayals = 0, fates = 0, maxPrestige = 0;
const ARTS_T = ['sword', 'magic', 'letters', 'herbs', 'smithing', 'cooking', 'trade'];
for (let run = 0; run < 14; run++) {
  const art = ARTS_T[run % ARTS_T.length];
  const g = adult(1000 + run, ['farmer', 'merchant', 'fallen_knight'][run % 3], 26, art, 58 + (run % 4) * 6);
  if (art === 'magic') { g.player.manaAwakened = true; g.player.mana = 100; }
  const pick = { mentor_found: 0, mentor_betray: run % 3, mentor_graduate: run % 2, mentor_lesson: run % 3 };
  play(g, 12 * 15, MENTOR_ACTS, pick, 0.45);
  // 문파를 세우는 해는 난수에 따라 앞뒤로 갈린다. 아직이면 다섯 해를 더 본다.
  if (!mentorState(g).school) play(g, 12 * 5, MENTOR_ACTS, pick, 0.45);
  const m = mentorState(g);
  if (m.school) { schools++; maxPrestige = Math.max(maxPrestige, m.school.prestige); }
  grads += m.grads.filter((x) => x.good >= 0).length;
  fates += m.grads.filter((x) => x.fate).length;
  betrayals += m.betrayals;
  checkInfo(g);
}
ok(schools >= 3, `schools ${schools}/14`);
ok(grads >= 8, `grads ${grads}`);
ok(fates >= 4, `fates ${fates}`);

// 7) 평범한 삶 (아이로 시작해 끝까지)
for (let run = 0; run < 6; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 45, ['work', 'rest', 'mentor_take', 'mentor_teach'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['mentor_take', 'mentor_teach', 'mentor_found', 'mentor_heritage']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['mentor_pick', 'mentor_lesson', 'mentor_graduate', 'mentor_betray', 'mentor_found', 'mentor_succession', 'mentor_reclaim']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('mentor_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('mentor_')))));
console.log(`문파 ${schools}/14 (최고 이름 ${Math.round(maxPrestige)}), 하산 ${grads}, 소식 ${fates}, 배신 ${betrayals}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `mentortest: ${fail} 실패` : 'mentortest: 통과');
process.exit(fail ? 1 : 0);
