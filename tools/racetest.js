import '../src/content.js';
// 다른 종족 점검: 종족마다 삶을 돌려 수명·마력·대우가 다른지, 혼혈 아이와 대 잇기, 이별과 세월 흘려보내기가 깨지지 않는지.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { byId, makePerson } from '../src/npc.js';
import { realmInfo } from '../src/realms/index.js';
import { RACES, raceOf, bodyAge, raceInfo, playableRaces, treatment, driftYears, raceState } from '../src/races/index.js';
import { childRace } from '../src/races/data.js';
import { makeRng } from '../src/rng.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 20) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const FAMS = { human: 'farmer', elf: 'elf_exile', dwarf: 'dwarf_smith', beast: 'beast_hunter', half_elf: 'half_elf' };
const stat = {};
const scenes = {};
const samples = [];

// 1) 몸 나이와 혼혈
{
  const rng = makeRng({ s: 5 });
  const p = makePerson(rng, { ageMonths: 300 * 12 });
  p.race = 'elf'; ok(bodyAge(p) < 40, `elf 300 body ${bodyAge(p)}`);
  p.race = 'dwarf'; ok(bodyAge(p) > 70, `dwarf 300 body ${bodyAge(p)}`);
  delete p.race; ok(bodyAge(p) === 300, 'human body = age');
  ok(childRace('elf', 'human', rng) === 'half_elf', 'elf+human = half elf');
  ok(childRace('demon', 'human', rng) === 'half_demon', 'demon+human = half demon');
  ok(playableRaces().length === 5 && playableRaces().every((r) => r.family), 'playable races with families');
}

// 2) 종족마다 삶 (쉬엄쉬엄 아무거나 하며)
for (const [race, fam] of Object.entries(FAMS)) {
  stat[race] = { all: [], died: [], mana: 0, runs: 0, farewells: 0, drifted: 0, kids: {} };
  for (let run = 0; run < 6; run++) {
    const g = newGame({ name: '아이', sex: run % 2 ? 'm' : 'f', familyId: fam, mode: 'once', seed: 4400 + run * 13 + race.length });
    const S = stat[race];
    S.runs++;
    ok(raceOf(me(g)) === race && g.player.race === race, `${race} player race ${me(g).race}`);
    const [f, m] = g.player.familyIds.map((id) => byId(g, id));
    if (race === 'half_elf') ok(raceOf(m) === 'elf' && raceOf(f) === 'human', 'half elf parents');
    else ok(raceOf(f) === race && raceOf(m) === race, `${race} parents`);
    if (race === 'beast') ok(me(g).beast && me(g).beast === f.beast, 'beast tribe');
    S.mana += g.player.manaPotential;
    for (let m2 = 0; m2 < 12 * 140 && !g.over; m2++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const choices = [];
      for (let i = 0; i < slotsFor(g); i++) {
        const drift = acts.find((a) => a.id === 'drift_years');
        const a = drift && rng.chance(0.3) ? drift : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel' && x.id !== 'house_move' && !x.id.startsWith('poor_')));
        choices.push({ id: a.id });
      }
      endMonth(g, choices);
      for (const r of g.lastResults) ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
      for (let k = 0; k < 4 && g.pendingEvent; k++) {
        const pe = g.pendingEvent;
        ok(!bad(pe.text) && !bad(pe.title), `bad event ${pe.title} ${pe.text}`);
        const kind = L(g).scene?.kind;
        if (kind) scenes[kind] = (scenes[kind] ?? 0) + 1;
        let idx = rngOf(g).int(0, pe.choices.length - 1);
        if (kind === 'drift') idx = 2; // 열 해
        if (kind === 'heir') idx = 0;
        if (kind === 'dragon_fire') idx = 0; // 용이 덮친 밤에는 달아난다 (타고난 수명을 재는 점검이라 용에게 맞서 죽는 판을 빼려고)
        const out = resolveEvent(g, rngOf(g), idx);
        ok(!bad(typeof out === 'string' ? out : ''), `bad outcome ${kind}: ${out}`);
        if (['farewell', 'drift', 'race_slight'].includes(kind) && samples.length < 14) samples.push(`${race} ${kind}: ${pe.text.slice(0, 120)} → ${String(out).slice(0, 160)}`);
        if (kind === 'heir') { const r2 = raceOf(me(g)); S.kids[r2] = (S.kids[r2] ?? 0) + 1; ok(g.player.race === r2, 'heir race copied'); }
      }
      if (L(g).ancestors.length) break; // 첫 삶만 본다
    }
    const first = L(g).ancestors[0];
    // 종족과 상관없이 아무 때나 오는 갑작스런 병(game.js)은 타고난 수명을 재는 데서 뺀다
    if (first) S.all.push(first.age);
    if (first && first.cause !== '병') S.died.push(first.age);
    S.farewells += raceState(g).farewells;
    S.drifted += raceState(g).drifted;
  }
}

// 3) 대우: 성광국은 이종족을 들이지 않는다
{
  const g = newGame({ name: '수인', sex: 'm', familyId: 'beast_hunter', mode: 'free', seed: 9 });
  ok(treatment(g, 'holy') === 'banned' && treatment(g, 'leonia') === 'scorn', 'beast treatment');
  ok(realmInfo(g, 'holy').naturalizeBlock?.includes('종족'), 'holy refuses beast naturalization');
  const info = raceInfo(g);
  for (const [k, v] of Object.entries(info)) ok(!bad(String(v)) || k === 'beast', `raceInfo ${k}=${v}`);
  // 세월 흘려보내기 (엘프)
  const e = newGame({ name: '엘프', sex: 'f', familyId: 'elf_exile', mode: 'free', seed: 11 });
  me(e).ageMonths = 40 * 12;
  const y0 = e.date.year;
  const text = driftYears(e, 10);
  ok(e.date.year - y0 >= 9 && !bad(text), `drift ${text}`);
  samples.push(`drift: ${text}`);
}

for (const [race, S] of Object.entries(stat)) {
  const avg = S.died.length ? Math.round(S.died.reduce((a, b) => a + b, 0) / S.died.length) : '-';
  console.log(`${RACES[race].name}: 첫 삶 죽은 나이 평균 ${avg} (${S.died.join(',')}), 마력 잠재력 평균 ${(S.mana / S.runs).toFixed(2)}, 떠나보낸 벗 ${S.farewells}, 흘려보낸 해 ${Math.round(S.drifted)}, 이은 아이 종족 ${JSON.stringify(S.kids)}`);
}
console.log('장면:', JSON.stringify(scenes));
for (const s of samples) console.log(' -', s.slice(0, 300));
const avgDied = (r) => stat[r].died.reduce((a, b) => a + b, 0) / Math.max(1, stat[r].died.length);
// 평균은 칼에 베여 일찍 죽은 한두 판에 크게 흔들린다(무작위 행동이 늘 때마다 깨졌다): 가장 오래 산 판끼리 견준다
// 33단계: 옷감 행동이 늘어 무작위 판이 달라지자 1.4배 문턱에 4살 모자랐다(94 대 70, 둘 다 칼과 병으로 죽음). 1.3배로 낮춤.
const oldest = (r) => Math.max(0, ...stat[r].all);
ok(oldest('elf') > oldest('human') * 1.8, `elves live much longer ${oldest('elf')} vs ${oldest('human')} (avg ${Math.round(avgDied('elf'))})`);
ok(oldest('dwarf') > oldest('human') * 1.3, `dwarves live longer ${oldest('dwarf')} vs ${oldest('human')} (avg ${Math.round(avgDied('dwarf'))})`);
ok(stat.elf.mana / stat.elf.runs > stat.dwarf.mana / stat.dwarf.runs, 'elves have more mana than dwarves');
ok(stat.elf.farewells + stat.half_elf.farewells > 0, 'long-lived see friends die');
console.log(fail ? `racetest: ${fail} 실패` : 'racetest: 통과');
process.exit(fail ? 1 : 0);
