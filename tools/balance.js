import '../src/content.js';
// 밸런스 점검: 여러 삶을 자동으로 살아 보고 숫자를 모은다. (npm test에는 넣지 않음, 직접 실행)
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me, circleOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { living } from '../src/npc.js';
import { encodeSave } from '../src/pack.js';

const N = +(process.argv[2] ?? 40);
const fams = ['farmer', 'fallen_knight', 'merchant'];
const out = { life: [], deathAge: [], causes: {}, money30: [], fam30: [], circleMax: {}, statMax: [], evPerYear: [], worstRepeat: [], pop: [], saveKB: [], msPerMonth: [], gens: [], errors: 0, eventsSeen: new Set() };
const evCountAll = {};
for (let run = 0; run < N; run++) {
  const g = newGame({ name: '점검', sex: run % 2 ? 'm' : 'f', familyId: fams[run % 3], mode: 'once', seed: 50000 + run * 7 });
  const evCount = {};
  let months = 0, evs = 0, maxCircle = 0;
  const t0 = Date.now();
  try {
    for (let m = 0; m < 12 * 200 && !g.over; m++) {
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
        evCount[id] = (evCount[id] ?? 0) + 1; evCountAll[id] = (evCountAll[id] ?? 0) + 1;
        out.eventsSeen.add(id); evs++;
        resolveEvent(g, rngOf(g), Math.floor(rngOf(g).next() * g.pendingEvent.choices.length));
      }
      maxCircle = Math.max(maxCircle, circleOf(g));
      if (playerAge(g) === 30 && me(g).ageMonths % 12 === 0) { out.money30.push(g.player.money); out.fam30.push(g.player.familyMoney); }
    }
  } catch (e) { out.errors++; console.log('ERROR run', run, e.stack.split('\n').slice(0, 4).join(' | ')); }
  out.msPerMonth.push((Date.now() - t0) / Math.max(1, months));
  out.life.push(months / 12);
  out.deathAge.push(playerAge(g));
  const cause = me(g).deathCause ?? (g.over ? '?' : '살아 있음');
  out.causes[cause] = (out.causes[cause] ?? 0) + 1;
  out.circleMax[maxCircle] = (out.circleMax[maxCircle] ?? 0) + 1;
  out.statMax.push(Math.max(...Object.values(g.player.stats)));
  out.evPerYear.push(evs / (months / 12));
  // 장면 틀(life_scene, 결투 한 합)은 빼고 본다: 내용이 매번 다르다
  const content = Object.entries(evCount).filter(([id]) => id !== 'life_scene' && !id.startsWith('duel_'));
  out.worstRepeat.push(Math.max(0, ...content.map(([, n]) => n)));
  const w = content.sort((a, b) => b[1] - a[1])[0]; if (w) (out.worstIds ??= {})[w[0]] = ((out.worstIds ??= {})[w[0]] ?? 0) + 1;
  out.pop.push(living(g).length);
  out.saveKB.push(encodeSave(g).length * 2 / 1024); // 실제 저장되는 압축 크기 (UTF-16)
  out.gens.push(g.player.generation ?? g.lineage?.length ?? 1);
}
const avg = (a) => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1);
const rng = (a) => `${Math.min(...a).toFixed(0)}~${Math.max(...a).toFixed(0)} (평균 ${avg(a)})`;
console.log('플레이한 햇수', rng(out.life));
console.log('죽은 나이', rng(out.deathAge), JSON.stringify(out.causes));
console.log('30살 내 돈', rng(out.money30), ' 집안 돈', rng(out.fam30));
console.log('최고 서클 분포', JSON.stringify(out.circleMax));
console.log('가장 높은 능력치', rng(out.statMax));
console.log('1년당 사건', rng(out.evPerYear), ' 한 삶에서 같은 사건 최다', rng(out.worstRepeat), JSON.stringify(out.worstIds ?? {}));
console.log('마을 인구(끝)', rng(out.pop), ' 저장 크기 KB', rng(out.saveKB), ' 한 달 ms', rng(out.msPerMonth));
console.log('본 사건 종류', out.eventsSeen.size, ' 오류', out.errors);
console.log('가장 자주 나온 사건', Object.entries(evCountAll).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}:${v}`).join(' '));
