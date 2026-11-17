import '../src/content.js';
// 세상이 저 혼자 굴러가는지 본다 (17단계 헤드): 플레이어는 쉬기만 하고, 여러 판을 YEARS년 돌려
// 마을 사람(태어남·죽음·혼인·떠남·재산), 가문·상단의 흥망, 이름난 사람, 나라 사이 전쟁·통치자 교체·왕조 끊김을 10년 단위로 센다.
// npm test에는 넣지 않는다. 직접 실행: node tools/worldwatch.js [판 수] [햇수]
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { living } from '../src/npc.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { PS, nations } from '../src/politics/state.js';

const RUNS = +(process.argv[2] ?? 6), YEARS = +(process.argv[3] ?? 60);
const DEC = Math.ceil(YEARS / 10);
const z = () => Array(DEC).fill(0);
const T = { births: z(), deaths: z(), weds: z(), away: z(), pop: z(), adults: z(), single30: z(), rich: z(), poor: z(), wealthMed: z(),
  housesFell: z(), housesNew: z(), coFell: z(), coNew: z(), notables: z(),
  warsStart: z(), warsAt: z(), rulerChange: z(), dynFell: z(), ownerChange: z(), stabLow: z(), leoWar: z(), civil: z(), era: z(), plague: z(), famine: z() };
let lineEnds = 0;
for (let run = 0; run < RUNS; run++) {
  const g = newGame({ name: '구경', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 88000 + run * 13 });
  const seen = new Set(g.people.map((p) => p.id));
  const dead = new Set(g.people.filter((p) => !p.alive).map((p) => p.id));
  const wed = new Set(g.people.filter((p) => p.spouseId).map((p) => p.id));
  const away = new Set(g.people.filter((p) => p.away).map((p) => p.id));
  let rulers = JSON.stringify(Object.fromEntries(Object.entries(PS(g).rulers).map(([k, r]) => [k, r.name])));
  let warKeys = new Set(PS(g).wars.map((w) => `${w.a}|${w.b}|${w.since}`));
  let fallenN = PS(g).fallen.length, owner = JSON.stringify(PS(g).owner);
  const hs0 = () => ({ hf: g.history?.houses?.filter((h) => h.fallen).length ?? 0, hn: g.history?.houses?.length ?? 0, cf: (g.history?.fallen ?? 0) - (g.history?.houses?.filter((h) => h.fallen).length ?? 0), cn: g.history?.companies?.length ?? 0 });
  let hs = hs0();
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) { lineEnds++; break; } becomeHeir(g, rngOf(g), h); if (g.over) { lineEnds++; break; } }
    const d = Math.floor(m / 120);
    const acts = availableActions(g);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) choices.push({ id: (acts.find((x) => x.id === 'rest') ?? acts.find((x) => x.id === 'work') ?? acts[0]).id });
    endMonth(g, choices);
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), g.pendingEvent.choices.length - 1);
    // 마을 사람
    for (const p of g.people) {
      if (p.isPlayer) continue;
      if (!seen.has(p.id)) { seen.add(p.id); if (p.ageMonths < 12) T.births[d]++; }
      if (!p.alive && !dead.has(p.id)) { dead.add(p.id); T.deaths[d]++; }
      if (p.spouseId && !wed.has(p.id)) { wed.add(p.id); T.weds[d]++; }
      if (p.away && !away.has(p.id)) { away.add(p.id); T.away[d]++; }
    }
    // 나라
    const P = PS(g);
    for (const w of P.wars) { const k = `${w.a}|${w.b}|${w.since}`; if (!warKeys.has(k)) { warKeys.add(k); T.warsStart[d]++; } }
    const r2 = JSON.stringify(Object.fromEntries(Object.entries(P.rulers).map(([k, r]) => [k, r.name])));
    if (r2 !== rulers) { const a = JSON.parse(rulers), b = JSON.parse(r2); for (const k in b) if (a[k] !== b[k]) T.rulerChange[d]++; rulers = r2; }
    if (P.fallen.length > fallenN) { T.dynFell[d] += P.fallen.length - fallenN; fallenN = P.fallen.length; }
    const o2 = JSON.stringify(P.owner); if (o2 !== owner) { T.ownerChange[d]++; owner = o2; }
    const h2 = hs0();
    T.housesFell[d] += Math.max(0, h2.hf - hs.hf); T.housesNew[d] += Math.max(0, h2.hn - hs.hn); T.coFell[d] += Math.max(0, h2.cf - hs.cf); T.coNew[d] += Math.max(0, h2.cn - hs.cn + Math.max(0, h2.cf - hs.cf));
    hs = h2;
    if (g.realm.balhart.war) T.leoWar[d]++;
    if (g.realm.succession === 'civilwar') T.civil[d]++;
    if (g.world?.plague) T.plague[d]++;
    if (g.world?.famine) T.famine[d]++;
    if (m % 120 === 119 || m === 12 * YEARS - 1) {
      const lv = living(g).filter((p) => !p.isPlayer);
      const ad = lv.filter((p) => p.job !== 'child');
      T.pop[d] += lv.length; T.adults[d] += ad.length;
      T.single30[d] += ad.filter((p) => p.ageMonths >= 30 * 12 && p.ageMonths < 45 * 12 && !p.spouseId).length;
      const ws = ad.map((p) => p.wealth).sort((a, b) => a - b);
      T.wealthMed[d] += ws[Math.floor(ws.length / 2)] ?? 0;
      T.rich[d] += ws.filter((w) => w > 1500).length; T.poor[d] += ws.filter((w) => w < -100).length;
      T.notables[d] += g.history?.notables?.length ?? 0;
      T.warsAt[d] += P.wars.length;
      T.stabLow[d] += nations().filter((n) => (P.stab[n] ?? 60) < 30).length;
      T.era[d] += g.realm.era ?? 0;
    }
  }
}
const f = (a, per = RUNS) => a.map((x) => (x / per).toFixed(1).replace(/\.0$/, '')).join(' ');
console.log(`${RUNS}판 × ${YEARS}년, 10년 단위 한 판 평균 (대가 끊긴 판 ${lineEnds})`);
console.log('— 마을');
console.log('사는 사람(끝)   ', f(T.pop)); console.log('어른(끝)       ', f(T.adults));
console.log('태어남         ', f(T.births)); console.log('죽음           ', f(T.deaths)); console.log('혼인(사람)     ', f(T.weds)); console.log('떠남           ', f(T.away));
console.log('30~44 홀몸     ', f(T.single30)); console.log('재산 가운데값  ', f(T.wealthMed)); console.log('부자(>1500)    ', f(T.rich)); console.log('빚진(<-100)    ', f(T.poor));
console.log('— 가문과 상단'); console.log('가문 무너짐    ', f(T.housesFell)); console.log('가문 새로      ', f(T.housesNew)); console.log('상단 무너짐    ', f(T.coFell)); console.log('상단 새로      ', f(T.coNew)); console.log('이름난 사람(끝)', f(T.notables));
console.log('— 나라'); console.log('전쟁 시작      ', f(T.warsStart)); console.log('전쟁 중(끝)    ', f(T.warsAt)); console.log('통치자 바뀜    ', f(T.rulerChange)); console.log('왕조 끊김      ', f(T.dynFell)); console.log('땅 주인 바뀜(달)', f(T.ownerChange)); console.log('흔들리는 나라  ', f(T.stabLow));
console.log('레오니아 전쟁 달', f(T.leoWar)); console.log('내전 달        ', f(T.civil)); console.log('역병 달        ', f(T.plague)); console.log('기근 달        ', f(T.famine)); console.log('시대(끝)       ', f(T.era));
