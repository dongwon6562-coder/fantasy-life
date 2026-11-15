import './lsshim.js';
import '../src/content.js';
// 신앙과 교단 점검: 시작 신앙, 기도·예배·축일·순례·개종, 성직자의 길(파벌·대주교·성자), 이단 심문, 검은 새벽, 대 잇기, 옛 저장.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, showScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { faithState, faithInfo, npcFaith, faithLine, GODS } from '../src/faith/index.js';
import { crimeState } from '../src/crime.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const seen = { acts: {}, scenes: {}, outs: [] };
const samples = [];

// 1) 시작 신앙
{
  const want = { elf_exile: 'tree', dwarf_smith: 'ancestor', beast_hunter: 'ancestor', merchant: 'solar', fallen_knight: 'solar' };
  for (const [fam, god] of Object.entries(want)) {
    const g = newGame({ name: '믿음', sex: 'f', familyId: fam, mode: 'free', seed: 300 });
    ok(faithState(g).god === god, `start god ${fam} ${faithState(g).god}`);
    const info = faithInfo(g);
    for (const [k, v] of Object.entries(info)) ok(!bad(String(v)) || v === null, `faithInfo ${k}=${v}`);
  }
  let earth = 0;
  for (let s = 0; s < 40; s++) if (faithState(newGame({ name: 'a', sex: 'm', familyId: 'farmer', mode: 'free', seed: 900 + s })).god === 'earth') earth++;
  ok(earth > 3 && earth < 25, `farmer earth mothers ${earth}/40`);
}

// 2) 여러 삶: 신앙 행동을 자주 고르며 끝까지
const FAITH_ACTS = ['pray', 'worship', 'keep_feast', 'pilgrimage', 'faith_seek', 'holy_heal', 'dawn_rite', 'work', 'seek_job', 'faction_door'];
function play(g, months, prefer = FAITH_ACTS, pickScene, rate = 0.6) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id));
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget));
      if (g.player.fatigue > 80) a = acts.find((x) => x.id === 'rest') ?? a;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) { ok(!bad(r.text), `bad result ${r.name}: ${r.text}`); if (FAITH_ACTS.includes(Object.keys(seen.acts).find(() => false)) && samples.length < 0) samples.push(r.text); }
    for (let k = 0; k < 5 && g.pendingEvent; k++) {
      const pe = g.pendingEvent;
      const kind = L(g).scene?.kind ?? pe.id;
      seen.scenes[kind] = (seen.scenes[kind] ?? 0) + 1;
      ok(!bad(pe.title) && !bad(pe.text) && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.text}`);
      let idx = rngOf(g).int(0, pe.choices.length - 1);
      if (pickScene?.[kind] != null) idx = Math.min(pickScene[kind], pe.choices.length - 1);
      if (kind === 'heir') idx = 0;
      const out = resolveEvent(g, rngOf(g), idx);
      ok(!bad(typeof out === 'string' ? out : ''), `bad outcome ${kind}: ${out}`);
      if (/^(faith_|pilgrim_|dawn_)/.test(kind) && samples.length < 16 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 90)} → ${String(out).slice(0, 140)}`);
    }
  }
}
for (let run = 0; run < 16; run++) {
  const g = newGame({ name: '신자', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'elf_exile', 'dwarf_smith', 'beast_hunter', 'half_elf'][run % 7], mode: 'free', seed: 6100 + run });
  play(g, 12 * 50, FAITH_ACTS, { pilgrim_pick: 0, dawn_invite: run % 3 === 0 ? 0 : 1 });
  const f = faithState(g);
  ok(Number.isFinite(f.devotion) && f.devotion >= 0 && f.devotion <= 100, `devotion ${f.devotion}`);
  ok(Number.isFinite(f.suspicion) && Number.isFinite(f.holy), 'finite');
}

// 3) 성직자의 길: 교단에 들어가 오래 일하면 파벌·신성력·승급
let sects = 0, holy = 0, high = 0;
for (let run = 0; run < 20; run++) {
  const g = newGame({ name: '사제', sex: run % 2 ? 'm' : 'f', familyId: 'merchant', mode: 'free', seed: 7700 + run });
  play(g, 12 * 15, ['pray', 'worship', 'rest']);
  if (g.over) continue;
  const life = L(g);
  life.place = 'leocast'; life.travel = null; crimeState(g).jailed = null;
  life.fac.church = { member: true, rank: 1, merit: 60 };
  life.job = { id: 'cleric', place: 'leocast', months: 12, merit: 0 };
  g.player.skills.letters = Math.max(g.player.skills.letters, 50);
  faithState(g).devotion = 70;
  play(g, 12 * 40, ['work', 'pray', 'holy_heal', 'worship', 'keep_feast'], { faith_high: 0 });
  const f = faithState(g);
  if (f.sect) sects++;
  if (f.holy > 0) holy++;
  if (f.rank > 0) high++;
}
// 파벌 장면은 대기열이 빌 때만 떠서 판마다 흔들린다: 20판에 넷 이상이면 된다
ok(sects >= 4, `sects chosen ${sects}/20`);
ok(holy >= 2, `holy power awakened ${holy}/20`);

// 4) 이단 심문: 대지의 어머니를 깊이 믿으며 성도에 살면 심문관이 온다
let inq = 0;
const INQ_RUNS = 16; // 판이 적으면 다른 모듈의 무작위 흐름에 흔들린다
for (let run = 0; run < INQ_RUNS; run++) {
  const g = newGame({ name: '이단', sex: 'f', familyId: 'farmer', mode: 'free', seed: 8100 + run });
  play(g, 12 * 20, ['rest', 'work']);
  if (g.over) continue;
  const f = faithState(g);
  f.god = 'earth'; f.devotion = 70;
  L(g).place = 'solaris'; L(g).travel = null; crimeState(g).jailed = null; L(g).job = null;
  ok(faithLine(g, 'holy').includes('이단'), 'holy border line for heretic');
  const before = seen.scenes.faith_inquisition ?? 0;
  play(g, 12 * 6, ['rest', 'pray'], { faith_inquisition: 0, realm_inquisitor: 0, border: 0 }, 1);
  if ((seen.scenes.faith_inquisition ?? 0) > before) inq++;
  if (process.env.DBG) console.log('inq run', run, playerAge(g), L(g).place, faithState(g).god, faithState(g).suspicion, g.over);
}
ok(inq >= INQ_RUNS * 0.25, `inquisition came ${inq}/${INQ_RUNS}`);

// 5) 대 잇기, 옛 저장, 관계
{
  const g = newGame({ name: '조상', sex: 'm', familyId: 'dwarf_smith', mode: 'free', seed: 51 });
  faithState(g).devotion = 80;
  runHooks('heir', g, rngOf(g));
  ok(faithState(g).god === 'ancestor' && faithState(g).devotion === 40, `heir faith ${faithState(g).god} ${faithState(g).devotion}`);
  const old = JSON.parse(JSON.stringify(g));
  delete old.faith; old.flags.faith = 'devout';
  runHooks('migrate', old);
  ok(old.faith && old.faith.god === 'solar' && old.faith.devotion >= 50, 'old save devout → solar');
  const npc = g.people.find((p) => !p.isPlayer);
  ok(GODS[npcFaith(npc)], 'npc faith');
}

for (const k of ['pray', 'worship', 'keep_feast', 'pilgrimage', 'faith_seek']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['pilgrim_pick', 'pilgrim_end', 'faith_convert', 'faith_sect', 'faith_inquisition', 'dawn_invite']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => FAITH_ACTS.includes(k)))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => /^(faith_|pilgrim_|dawn_)/.test(k)))));
console.log(`파벌 ${sects}/10, 신성력 ${holy}/10, 대주교 이상 ${high}/10, 심문 ${inq}/8`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `faithtest: ${fail} 실패` : 'faithtest: 통과');
process.exit(fail ? 1 : 0);
