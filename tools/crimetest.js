import '../src/content.js';
// 악당의 길 점검: 범죄를 일삼는 삶을 여러 번 돌려 본다. 체포·감옥·조직·암살이 실제로 일어나는지, 글이 깨지지 않는지.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { living, byId, ageYears } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { ensurePlacePeople } from '../src/places.js';
import { crimeState, notorietyWord, reputationShift } from '../src/crime.js';
import { gangTitle } from '../src/underworld/gangs.js';
import { run as runHooks } from '../src/hooks.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 20) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const tally = { crimes: 0, arrests: 0, jailed: 0, escapes: 0, gangs: 0, bosses: 0, murders: 0, hanged: 0, hunters: 0, ranks: 0 };
const seen = new Set();
const samples = [];

const CRIME_ACTS = ['crime_pickpocket', 'crime_burglary', 'crime_fraud', 'crime_snoop', 'crime_blackmail', 'crime_assassinate', 'gang_seek', 'gang_job'];
for (let run = 0; run < 30; run++) {
  const g = newGame({ name: '악당', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'fallen_knight', 'merchant'][run % 3], mode: 'once', seed: 9000 + run });
  let wasJailed = false;
  for (let m = 0; m < 12 * 32 && !g.over; m++) {
    const rng = rngOf(g);
    // 열여섯에 하르펜, 스물둘에 왕도로 옮긴다
    const age = playerAge(g);
    const want = age >= 22 && run % 2 ? 'leocast' : age >= 16 ? 'harfen' : 'ern';
    if (L(g).place !== want && !crimeState(g).jailed && !L(g).travel) { L(g).place = want; ensurePlacePeople(g, rng, want); if (L(g).home === 'family') L(g).home = 'inn'; }
    const acts = availableActions(g);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const crimes = acts.filter((a) => CRIME_ACTS.includes(a.id) && (a.id !== 'crime_assassinate' || rng.chance(0.08)));
      const calm = acts.filter((x) => !['gang_inform', 'gang_leave'].includes(x.id) || run % 5 === 4);
      const a = crimes.length && rng.chance(0.7) ? rng.pick(crimes) : rng.pick(calm);
      const c = { id: a.id };
      if (a.needsTarget) {
        const sec = crimeState(g).secrets.map((s) => byId(g, s.id)).find((p) => p?.alive && (p.place ?? 'ern') === L(g).place);
        const locals = living(g).filter((p) => !p.isPlayer && (p.place ?? 'ern') === L(g).place && !g.player.familyIds.includes(p.id));
        c.target = (a.id === 'crime_blackmail' && sec ? sec : rng.pick(locals.length ? locals : g.people.filter((p) => p.known && !p.isPlayer && p.alive)))?.id;
        if (c.target) byId(g, c.target).known = true;
      }
      choices.push(c);
    }
    endMonth(g, choices);
    for (const r of g.lastResults) {
      ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
      if (/소매치기|빈집|사기|협박|암살|조직|탈옥|뒷조사/.test(r.name)) tally.crimes++;
      if (run === 0 && samples.length < 16 && m % 7 === 0 && /소매치기|빈집|사기|협박|암살|조직|뒷조사/.test(r.name)) samples.push(`${age}살 ${r.name}: ${r.text}`);
    }
    for (let k = 0; k < 3 && g.pendingEvent; k++) {
      const pe = g.pendingEvent;
      ok(!bad(pe.text) && !bad(pe.title), `bad event ${pe.id}: ${pe.title} ${pe.text}`);
      const kind = L(g).scene?.kind;
      if (kind) seen.add(kind);
      if (kind === 'arrest') tally.arrests++;
      if (kind === 'bounty_hunters') tally.hunters++;
      let idx = 0;
      if (kind === 'arrest') idx = rng.int(0, pe.choices.length - 1);
      if (kind === 'gang_takeover') idx = 0;
      const out = resolveEvent(g, rngOf(g), idx);
      ok(!bad(out), `bad outcome ${pe.id}/${kind}: ${out}`);
      if (run < 3 && kind && ['arrest', 'witness_blackmail', 'gang_offer', 'gang_contract', 'gang_takeover', 'bounty_hunters', 'thugs', 'gang_rescue'].includes(kind) && samples.length < 40) samples.push(`${age}살 [${pe.title}] ${pe.text} → ${out}`);
    }
    const c = crimeState(g);
    if (c.jailed && !wasJailed) tally.jailed++;
    wasJailed = !!c.jailed;
  }
  const c = crimeState(g);
  if (c.gang || Object.keys(c.hostile).length) tally.gangs++;
  if (c.gang?.rank >= 2) tally.ranks++;
  if (c.gang?.rank === 4) tally.bosses++;
  tally.murders += c.murders;
  if (me(g).deathCause === '교수형') tally.hanged++;
  ok(Number.isFinite(L(g).notoriety) && L(g).notoriety >= 0 && L(g).notoriety <= 120, 'notoriety range ' + L(g).notoriety);
  for (const p of g.people.slice(0, 30)) ok(Number.isFinite(reputationShift(g, p)), 'rep shift');
  if (run === 0) console.log('악명:', notorietyWord(g), Math.round(L(g).notoriety), '소속:', gangTitle(g), '기록:', c.record.length);
  // 옛 저장(범죄 필드 없음)
  const old = JSON.parse(JSON.stringify(g));
  delete old.crime;
  runHooks('migrate', old);
  ok(old.crime && Array.isArray(old.crime.record), 'migrate crime');
  JSON.parse(JSON.stringify(g));
}
console.log('--- 표본 ---');
for (const s of samples) console.log('·', s);
console.log('집계', JSON.stringify(tally), '장면:', [...seen].join(','));
ok(tally.arrests >= 5, 'arrests too rare');
ok(tally.jailed >= 5, 'jail too rare');
ok(tally.gangs >= 5, 'gangs too rare');
ok(tally.murders >= 3, 'murders too rare');
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
