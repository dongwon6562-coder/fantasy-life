import '../src/content.js';
// 결투 연출(46단계, src/duel/show.js) 점검: 성격·버릇·장소·대사·부위 상처·결정적 순간·다양한 끝·화면 모양(duelView·lastDuel).
//   node tools/duelshowtest.js [-v]
import { newGame, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { startDuel, duelView, MOVE_IDS } from '../src/duel/duel.js';
import { TRAITS, HABITS, VENUES, venueFor } from '../src/duel/show.js';

const verbose = process.argv.includes('-v');
const t0 = Date.now();
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)/.test(t);
const samples = [];

function duel(seed, { skill = 45, foe = 45, kind = 'spar', lethal = false, mode, pick = 'random', style = 'steady', sen = 50 } = {}) {
  const g = newGame({ name: '검사', sex: 'm', familyId: 'fallen_knight', mode: 'free', seed });
  g.player.skills.sword = skill; g.player.skills.magic = skill; g.player.stats.sen = sen;
  const rng = rngOf(g);
  startDuel(g, rng, { kind: mode ? kind : 'spar', venue: venueFor(kind), title: '시험', lethal, mode, foe: { name: '상대', skill: foe, style } });
  const seen = { crux: 0, cruxMe: 0, cruxFoe: 0, habit: false, say: 0, cheer: 0, wounds: 0 };
  let n = 0;
  while (g.pendingEvent?.id === 'duel_round' && n < 40) {
    const pe = g.pendingEvent, v = duelView(g);
    if (bad(pe.text) || bad(pe.title) || pe.choices.some(bad) || josa(pe.text)) fail('event text', pe.title, pe.text);
    if (pe.choices.length > 8) fail('choices', pe.choices.length);
    if (!v || JSON.stringify(v).match(/NaN|undefined/)) fail('view', JSON.stringify(v).slice(0, 200));
    if (v.moves.length !== pe.choices.length) fail('view moves');
    if (v.mom < -3 || v.mom > 3) fail('mom range', v.mom);
    if (v.crux) { seen.crux++; if (v.cruxSide === 'me') seen.cruxMe++; else seen.cruxFoe++; if (v.moves.length !== 2) fail('crux moves', v.moves); }
    if (v.foe.habit) seen.habit = true;
    if (v.foe.line) seen.say++;
    if (v.cheer) seen.cheer++;
    if (samples.length < 60 && n < 3 && seed < 103) samples.push(`[${pe.title}] ${pe.text.replace(/\n+/g, ' / ')}`);
    let idx = rng.int(0, pe.choices.length - 1);
    if (pick === 'wait') { const i = pe.choiceIdx.findIndex((x) => MOVE_IDS[x] === 'wait'); if (i >= 0 && n % 2 === 0) idx = i; }
    if (pick === 'noyield') { const ids = pe.choiceIdx.map((x) => MOVE_IDS[x]); idx = rng.int(0, ids.filter((x) => x !== 'yield').length - 1); }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out) || josa(out)) fail('round out', out);
    n++;
  }
  if (n >= 40) fail('never ended');
  const L = g.lastDuel;
  if (!L || JSON.stringify(L).match(/NaN|undefined/)) fail('lastDuel', JSON.stringify(L));
  return { g, L, seen, n };
}

// 1. 자료: 장소는 알맞게
{
  if (venueFor('arena') !== 'arena' || venueFor('law_combat') !== 'court' || venueFor('rival') !== 'dojo' || venueFor('xx_war') !== 'field' || venueFor('noble') !== 'road') fail('venues');
  for (const v of Object.values(VENUES)) if (!v.open.length || !v.cheer.length) fail('venue lines', v.name);
}

// 2. 여러 판: 끝이 다양하고, 결정적 순간이 오고, 버릇이 보이고, 대사와 관중이 있다
{
  const ends = {}, traits = new Set(), habits = new Set();
  let crux = 0, cruxMe = 0, cruxFoe = 0, habit = 0, say = 0, cheer = 0, rounds = 0, wounds = 0;
  for (let i = 0; i < 160; i++) {
    const kind = ['arena', 'rival', 'law_combat', 'noble', 'insult'][i % 5];
    const r = duel(100 + i, { kind, lethal: kind === 'noble', pick: i % 3 === 0 ? 'wait' : 'noyield', skill: 40 + (i % 4) * 8, foe: 50 - (i % 3) * 6, style: ['bold', 'steady', 'tricky', 'swift'][i % 4] });
    ends[r.L.endKind] = (ends[r.L.endKind] ?? 0) + 1;
    traits.add(r.g.lastDuel.trait); if (r.L.habit) habits.add(r.L.habit);
    crux += r.seen.crux ? 1 : 0; cruxMe += r.seen.cruxMe; cruxFoe += r.seen.cruxFoe; habit += r.seen.habit ? 1 : 0; say += r.seen.say; cheer += r.seen.cheer; rounds += r.n; wounds += r.L.wounds.length + r.L.foeWounds.length;
  }
  if (Object.keys(ends).length < 5) fail('end kinds', ends);
  if (traits.size < 4) fail('traits', [...traits]);
  if (crux < 20 || !cruxMe || !cruxFoe) fail('crux', crux, cruxMe, cruxFoe);
  if (habit < 20) fail('habit seen', habit);
  if (say < 40 || cheer < 40) fail('say/cheer', say, cheer);
  if (!wounds) fail('wounds');
  if (rounds / 160 > 9) fail('too long', rounds / 160);
  if (verbose) console.log({ ends, traits: [...traits], habits: [...habits], crux, cruxMe, cruxFoe, habit, say, cheer, avgRounds: (rounds / 160).toFixed(1), wounds });
}

// 3. 마법 겨루기에는 결정적 순간이 없다 (칼 이야기가 섞이지 않게)
{
  for (let i = 0; i < 30; i++) { const r = duel(400 + i, { mode: 'magic', kind: 'mage_rival' }); if (r.seen.crux) fail('magic crux'); }
}

// 4. 항복 (끝 요약에 남는다)
{
  const g = newGame({ name: '검사', sex: 'm', familyId: 'fallen_knight', mode: 'free', seed: 7 });
  startDuel(g, rngOf(g), { kind: 'spar', title: '시험', foe: { name: '상대', skill: 40 } });
  const i = g.pendingEvent.choiceIdx.findIndex((x) => MOVE_IDS[x] === 'yield');
  resolveEvent(g, rngOf(g), i);
  if (g.lastDuel?.end !== 'yield' || g.duel) fail('yield', g.lastDuel);
}

const ms = Date.now() - t0;
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `duelshowtest: ${problems} problems (${ms}ms)` : `duelshowtest ok (${ms}ms)`);
process.exit(problems ? 1 : 0);
