import './lsshim.js';
import '../src/content.js';
// 사랑과 혼인 점검: 눈길·만남·짝사랑·나를 마음에 둔 사람, 정략혼과 혼례, 배우자의 바람·다툼, 바람과 들킴, 배신, 이혼·재혼, 사별 뒤, 대 잇기, 옛 저장.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { loveState, loveInfo, divorce } from '../src/love/index.js';
import { makePerson, byId, kill } from '../src/npc.js';
import { marry } from '../src/relations.js';
import { crimeState } from '../src/crime.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const LOVE_ACTS = ['love_date', 'love_spouse', 'love_grave', 'visit', 'work', 'rest'];

function adult(seed, fam = 'farmer', age = 19) {
  const g = newGame({ name: '사랑', sex: seed % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = 'ern'; L(g).home = 'family';
  g.player.money = 150;
  return g;
}
function spouseFor(g, opts = {}) {
  const meP = me(g);
  const p = makePerson(rngOf(g), { sex: meP.sex === 'm' ? 'f' : 'm', ageMonths: (Math.floor(meP.ageMonths / 12) - 1) * 12, job: 'farmer', ...opts });
  g.people.push(p); p.known = true; p.affection = 60; p.romance = 60;
  marry(g, p);
  return p;
}
function play(g, months, prefer = LOVE_ACTS, pick = {}, rate = 0.55) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id) && !a.needsTarget);
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel' && !/^trade_/.test(x.id))); // 장사 장면은 다달이 장면 줄을 채워 사랑 장면을 밀어낸다
      if (g.player.fatigue > 80) a = acts.find((x) => x.id === 'rest') ?? a;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
    for (let k = 0; k < 5 && g.pendingEvent; k++) {
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
      if (/^love_/.test(kind) && samples.length < 22 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 90)} → ${String(out).slice(0, 140)}`);
    }
    if (L(g).place !== 'ern' && !L(g).travel && !crimeState(g).jailed && rngOf(g).chance(0.25)) L(g).place = 'ern';
  }
}
const checkInfo = (g) => {
  const info = loveInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `loveInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};

// 1) 혼인하면 배우자 기록이 생기고, 바람이 있다
{
  const g = adult(1, 'farmer', 25);
  const sp = spouseFor(g);
  play(g, 1, ['rest']);
  const info = checkInfo(g);
  ok(info.spouse && info.spouse.id === sp.id && info.spouse.wishText, `spouse record ${JSON.stringify(info.spouse)}`);
  ok(loveState(g).marriages === 1, 'marriage counted');
}

// 2) 이혼과 재혼, 사별
{
  const g = adult(2, 'farmer', 30);
  const sp = spouseFor(g);
  play(g, 1, ['rest']);
  g.player.money = 100;
  const d = divorce(g);
  ok(d && me(g).spouseId == null && sp.bond === 'ex' && !g.player.familyIds.includes(sp.id), 'divorce');
  ok(g.player.money === 60, `divorce splits money ${g.player.money}`);
  play(g, 1, ['rest']);
  ok(loveState(g).spouse === null && loveInfo(g).exes.length === 1, 'ex recorded');
  const sp2 = spouseFor(g);
  play(g, 1, ['rest']);
  ok(loveState(g).marriages === 2, 'remarried');
  kill(g, sp2, '병');
  play(g, 1, ['rest']);
  ok(loveState(g).widowed?.id === sp2.id, 'widowed');
  ok(availableActions(g).some((a) => a.id === 'love_grave'), 'grave action');
  play(g, 3, ['love_grave'], {}, 1);
  checkInfo(g);
}

// 3) 여러 삶: 젊어서부터 15년
let married = 0, divorces = 0, affairs = 0, arranged = 0, wishesDone = 0;
// 배우자의 바람(love_betrayed)은 드물어 16판 안에 안 나올 수 있다: 나올 때까지 몇 판 더 (다른 갈래가 무작위 흐름을 바꿔도 버티게)
for (let run = 0; run < 16 || (run < 40 && !seen.scenes.love_betrayed); run++) {
  const g = adult(1000 + run, ['farmer', 'merchant', 'fallen_knight'][run % 3], 17);
  // 아는 또래 몇 명
  for (let i = 0; i < 3; i++) { const p = makePerson(rngOf(g), { sex: me(g).sex === 'm' ? 'f' : 'm', ageMonths: (17 + i) * 12 }); p.known = true; p.affection = 30 + i * 10; p.romance = 20 + i * 15; g.people.push(p); }
  play(g, 12 * 15, LOVE_ACTS, {
    love_arranged: run % 2 ? 0 : 1, love_wedding: run % 5 === 0 ? 1 : 0, love_temptation: run % 3 === 0 ? 0 : 1,
    love_caught: run % 4, love_betrayed: run % 4, love_wish: 0, love_admirer: run % 2 ? 0 : 2, love_glance: 0,
  });
  const v = loveState(g);
  if (v.marriages) married++;
  if (v.exes.some((x) => x.how === 'divorce')) divorces++;
  if (v.spouse?.cheated || seen.scenes.love_caught) affairs = seen.scenes.love_caught ?? 0;
  if (v.spouse?.arranged) arranged++;
  if (v.spouse?.wishDone) wishesDone++;
  if (v.spouse) ok(Number.isFinite(v.spouse.mood) && v.spouse.mood >= 0 && v.spouse.mood <= 100, `mood ${v.spouse.mood}`);
  checkInfo(g);
}
ok(married >= 3, `married ${married}/16`); // 씨앗마다 3~8: 한 달에 같은 만남 두 번 금지, 장면 이어 띄우기(헤드) 뒤 흔들림이 크다
ok(wishesDone >= 2, `wishes done ${wishesDone}`);

// 4) 오래 소홀한 혼인: 다툼, 떠나려는 배우자, 배신
for (let run = 0; run < 8; run++) {
  const g = adult(4000 + run, 'farmer', 28);
  spouseFor(g, { traits: ['ambitious', 'gossip'] });
  for (let i = 0; i < 6; i++) { const p = makePerson(rngOf(g), { sex: me(g).sex === 'm' ? 'f' : 'm', ageMonths: (24 + i * 2) * 12 }); p.known = true; p.affection = 40; g.people.push(p); }
  play(g, 1, ['rest']);
  loveState(g).spouse.mood = 30;
  // 배우자를 돌보지 않는다: 해마다 마음이 식은 채로 (다른 장면이 마음을 풀어 주어도 다시 식힌다)
  for (let y = 0; y < 6 && !g.over; y++) {
    if (loveState(g).spouse) loveState(g).spouse.mood = Math.min(loveState(g).spouse.mood, 22);
    play(g, 12, ['work', 'rest', 'love_date'], { love_temptation: 0, love_quarrel: run % 4, love_leave: run % 2 }, 1);
  }
  checkInfo(g);
}

// 5) 대 잇기, 옛 저장
{
  const g = adult(5000, 'farmer', 30);
  spouseFor(g);
  play(g, 1, ['rest']);
  runHooks('heir', g, rngOf(g));
  ok(loveState(g).spouse === null && loveState(g).marriages === 0, 'heir resets love');
  const old = JSON.parse(JSON.stringify(g)); delete old.love;
  runHooks('migrate', old);
  ok(old.love && Array.isArray(old.love.exes), 'old save love');
}

// 6) 평범한 삶 (아이로 시작해 끝까지)
for (let run = 0; run < 6; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 45, ['work', 'rest', 'love_date', 'love_spouse'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['love_date', 'love_spouse', 'love_grave']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['love_glance', 'love_admirer', 'love_arranged', 'love_wedding', 'love_wish', 'love_quarrel', 'love_temptation', 'love_caught', 'love_betrayed', 'love_leave']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('love_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('love_')))));
affairs = seen.scenes.love_caught ?? 0;
console.log(`혼인 ${married}/16, 이혼 ${divorces}, 들킨 바람 ${affairs}, 정략혼 ${arranged}, 들어준 바람 ${wishesDone}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `lovetest: ${fail} 실패` : 'lovetest: 통과');
process.exit(fail ? 1 : 0);
