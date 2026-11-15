import '../src/content.js';
// 긴 왕조 점검: 한 집안을 수백 년 이어 하며 25년마다 한 달 걸리는 시간·저장 크기·사람 수, 대마다 같은 사건 되풀이를 본다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { living } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { encodeSave } from '../src/pack.js';
import { heirsOf, becomeHeir, heirWord } from '../src/heir.js';

const YEARS = +(process.argv[2] ?? 150);
const seed = +(process.argv[3] ?? 73000);
const g = newGame({ name: '왕조', sex: 'm', familyId: 'merchant', mode: 'free', seed });
let t0 = Date.now(), months = 0, lastGen = 1, evCount = {};
const gens = [];
for (let m = 0; m < 12 * YEARS; m++) {
  if (g.over) { const h = heirsOf(g).filter((c) => c.ageMonths >= 12 * 14)[0] ?? heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; }
  const rng = rngOf(g);
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = rng.pick(acts);
    if (g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? a;
    const c = { id: a.id };
    if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive && !p.away)?.id;
    choices.push(c);
  }
  endMonth(g, choices);
  months++;
  let guard = 0;
  while (g.pendingEvent && guard++ < 6) {
    const id = g.pendingEvent.id;
    if (id !== 'life_scene' && !id.startsWith('duel_')) evCount[id] = (evCount[id] ?? 0) + 1;
    resolveEvent(g, rngOf(g), Math.floor(rngOf(g).next() * g.pendingEvent.choices.length));
  }
  const gen = L(g).gen ?? 1;
  if (gen !== lastGen) {
    const top = Object.entries(evCount).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(' ');
    gens.push(`${lastGen}대 → ${top}`);
    evCount = {}; lastGen = gen;
  }
  if (months % 300 === 0) {
    const kb = (encodeSave(g).length * 2 / 1024).toFixed(0);
    console.log(`${g.date.year}년 ${gen}대 나이${playerAge(g)} 한달 ${((Date.now() - t0) / 300).toFixed(0)}ms 저장 ${kb}KB 사람 ${g.people.length}(산 ${living(g).length}) 연대기 ${g.chronicle?.length ?? '-'} 소식 ${g.news?.length ?? '-'}`);
    t0 = Date.now();
  }
}
console.log(`끝: over=${g.over} 대=${lastGen}`);
for (const s of gens) console.log(s);
let problems = 0;
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);

// 자식 없이 죽으면 조카가 잇는다
{
  const h = newGame({ name: '삼촌', sex: 'm', familyId: 'farmer', mode: 'free', seed: seed + 5 });
  for (let m = 0; m < 12 * 30; m++) { endMonth(h, [{ id: 'rest' }]); while (h.pendingEvent) resolveEvent(h, rngOf(h), 0); if (h.over) break; }
  const P = me(h);
  for (const id of P.childIds) { const c = h.people.find((p) => p.id === id); if (c) c.alive = false; }
  const sib = h.people.find((p) => p.alive && !p.isPlayer && p.id !== P.id && (p.fatherId === P.fatherId && P.fatherId != null || p.motherId === P.motherId && P.motherId != null));
  if (!sib) { console.log('형제가 없어 조카 점검 건너뜀'); }
  else {
    const kid = h.people.find((p) => p.alive && p.id !== P.id && (p.fatherId === sib.id || p.motherId === sib.id));
    const heirs = heirsOf(h);
    console.log(`조카 점검: 형제 ${sib.name}, 형제 자식 ${kid ? kid.name : '없음'}, 이을 사람 ${heirs.map((c) => `${heirWord(h, c)} ${c.name}`).join(', ')}`);
    if (!heirs.length) { problems++; console.log('형제가 살아 있는데 이을 사람이 없음'); }
    if (kid && !heirs.some((c) => c.id === kid.id)) { problems++; console.log('조카가 이을 사람에 없음'); }
    L(h).pendingDeath = '겨울 열병';
    endMonth(h, [{ id: 'rest' }]);
    const pe = h.pendingEvent;
    if (!pe || L(h).scene?.kind !== 'heir') { problems++; console.log('대 잇기 장면이 안 나옴', h.over); }
    else {
      console.log('·', pe.text);
      console.log('·', pe.choices.map((c) => c.label ?? c).join(' / '));
      if (bad(pe.text) || pe.choices.some((c) => bad(c.label ?? c))) { problems++; console.log('대 잇기 글 깨짐'); }
      const text = resolveEvent(h, rngOf(h), 0);
      console.log('·', text);
      if (bad(text) || h.over) { problems++; console.log('조카 잇기 실패'); }
    }
    if (!me(h).isPlayer) { problems++; console.log('새 주인이 플레이어가 아님'); }
  }
}
if (lastGen < 2 && !process.argv[3]) { problems++; console.log('기본 씨앗에서 대가 한 번도 이어지지 않음'); }
console.log(problems ? `문제 ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
