import './lsshim.js';
import '../src/content.js';
// 평판과 소문 점검: 고장별 평, 한 일이 소문이 되어 번지기, 별명, 거짓 소문과 해명, 혼담, 대접, 일자리 문턱, 대 잇기, 옛 저장.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { reputeState, reputeInfo, opinionAt, fameAt, deed, nickname, goodness } from '../src/repute/index.js';
import { WORK } from '../src/jobs.js';
import { crimeState, reportCrime } from '../src/crime.js';
import { makePerson } from '../src/npc.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const REP_ACTS = ['repute_boast', 'repute_feast', 'repute_clear', 'repute_slander', 'work', 'quest', 'rest'];

function adult(seed, fam = 'farmer') {
  const g = newGame({ name: '평판', sex: seed % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed });
  me(g).ageMonths = 22 * 12;
  L(g).place = 'ern'; L(g).home = 'inn';
  g.player.money = 300;
  return g;
}
function play(g, months, prefer = REP_ACTS, pick = {}, rate = 0.6) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id));
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel'));
      if (g.player.fatigue > 80) a = acts.find((x) => x.id === 'rest') ?? a;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
    for (const n of g.news ?? []) ok(!bad(n.text), `bad news ${n.text}`);
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
      if (/^repute_/.test(kind) && samples.length < 16 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 90)} → ${String(out).slice(0, 140)}`);
    }
    if (L(g).place !== 'ern' && !L(g).travel && !crimeState(g).jailed && rngOf(g).chance(0.2)) L(g).place = 'ern';
  }
}
const checkInfo = (g) => {
  const info = reputeInfo(g);
  for (const [k, v] of Object.entries(info)) if (!Array.isArray(v)) ok(!bad(String(v)) || v === null, `info ${k}=${v}`);
  for (const a of info.axes) ok(Number.isFinite(a.val) && a.val >= -100 && a.val <= 100, `axis ${a.id} ${a.val}`);
  for (const r of info.rumors) ok(!bad(r.text) && Number.isFinite(r.strength), `rumor ${r.text}`);
  return info;
};

// 1) 시작: 고향에서의 첫 평, 화면 정보
{
  const g = newGame({ name: '기사', sex: 'm', familyId: 'fallen_knight', mode: 'free', seed: 1 });
  ok(opinionAt(g, 'ern').loyal > 0, 'knight family loyal at home');
  checkInfo(g);
}

// 2) 한 일이 소문이 되어 이웃 고장으로 번진다
{
  const g = adult(10);
  deed(g, 'kind', 20, '불난 집에 뛰어들어 아이를 구했다더라');
  ok(opinionAt(g, 'ern').kind > 10, 'deed raises local kind');
  play(g, 8, ['rest'], {}, 1);
  const reach = reputeState(g).rumors.find((x) => x.text.startsWith('불난'));
  ok(reach && Object.keys(reach.str).length >= 2, `rumor spread ${reach ? Object.keys(reach.str).join(',') : 'gone'}`);
  ok(opinionAt(g, 'harfen').kind > 0, `harfen heard ${opinionAt(g, 'harfen').kind}`);
  checkInfo(g);
}

// 3) 들킨 죄는 정직 평을 깎고, 믿음이 필요한 일자리 문이 닫힌다
{
  const g = adult(20);
  L(g).place = 'harfen'; g.player.skills.letters = 60;
  for (let i = 0; i < 6; i++) reportCrime(g, 'fraud', 'harfen');
  play(g, 2, ['rest'], {}, 1);
  L(g).place = 'harfen';
  const o = opinionAt(g, 'harfen');
  ok(o.honest <= -35, `fraud honest ${o.honest}`);
  ok(fameAt(g, 'harfen') >= 10, `fraud fame ${fameAt(g, 'harfen')}`);
  const clerk = Object.values(WORK).find((d) => d.skill === 'letters' && d.places.includes('harfen'));
  ok(clerk && clerk.req?.(g) === '믿을 만한 사람이라는 평', `clerk refuses: ${clerk?.req?.(g)}`);
}

// 4) 여러 삶: 평판 행동을 고르며 15년
let nicks = 0, lies = 0, matches = 0, wed = 0, maxFame = 0;
for (let run = 0; run < 14; run++) {
  const g = adult(1000 + run, ['farmer', 'merchant', 'fallen_knight'][run % 3]);
  // 미워하는 사람 몇
  for (let i = 0; i < 2; i++) { const p = makePerson(rngOf(g), { ageMonths: 30 * 12, job: 'farmer' }); p.known = true; p.affection = -30; g.people.push(p); }
  play(g, 12 * 15, run % 2 ? REP_ACTS : REP_ACTS.filter((x) => x !== 'repute_slander'), { repute_lie: run % 4, repute_match: run % 3 === 0 ? 0 : 2 });
  const r = reputeState(g);
  if (r.nick) nicks++;
  if (me(g).spouseId) wed++;
  maxFame = Math.max(maxFame, ...Object.values(r.fame));
  for (const b of Object.values(r.base)) for (const v of Object.values(b)) ok(Number.isFinite(v), 'base finite');
  checkInfo(g);
}
lies = seen.scenes.repute_lie ?? 0; matches = seen.scenes.repute_match ?? 0;
ok(nicks >= 3, `nicknames ${nicks}/14`);
ok(lies >= 3, `lies ${lies}`);
ok(matches >= 2, `matches ${matches}`);
ok(maxFame >= 40, `fame grows ${maxFame}`);

// 5) 대 잇기: 평판 일부가 남는다, 옛 저장
{
  const g = adult(5000);
  deed(g, 'generous', 30, '은화를 뿌렸다더라');
  reputeState(g).fame.ern = 60;
  const before = opinionAt(g, 'ern').generous;
  runHooks('heir', g, rngOf(g));
  const after = opinionAt(g, 'ern').generous;
  ok(after > 0 && after < before, `heir keeps part ${before} → ${after}`);
  ok(reputeState(g).rumors.length === 0 && fameAt(g, 'ern') === 27, 'heir clears rumors, halves fame');
  const old = JSON.parse(JSON.stringify(g)); delete old.repute;
  runHooks('migrate', old);
  ok(old.repute && old.repute.rumors, 'old save repute');
}

// 6) 평범한 삶 (아이로 시작해 끝까지)
for (let run = 0; run < 6; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 40, ['work', 'rest', 'crime_pickpocket', 'repute_feast'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['repute_boast', 'repute_feast', 'repute_clear', 'repute_slander']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['repute_lie', 'repute_match']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('repute_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('repute_')))));
console.log(`별명 ${nicks}/14, 거짓 소문 ${lies}, 혼담 ${matches}, 혼인 ${wed}/14, 최고 이름 ${Math.round(maxFame)}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `reputetest: ${fail} 실패` : 'reputetest: 통과');
process.exit(fail ? 1 : 0);
