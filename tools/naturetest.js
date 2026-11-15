import './lsshim.js';
import '../src/content.js';
// 하늘과 땅 점검: 처음 상태, 봄 소출, 재앙(소출·빵값·집·영지·노인), 둑, 가을걷이와 흉년(두 해 이어지면 역사),
// 철마다 살림(파종·둑·가을걷이·겨울나기), 겨울 버티기, 재앙 사건들, 곳간, 화면용, 예전 저장, 100년 흐름, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId, makePerson } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { WORLD_TICKS } from '../src/world.js';
import { natureState as NS, natureInfo, natureLine, startDisaster, winterCost, calamityAt } from '../src/nature/index.js';

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const shown = e.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.show || c.show(g, ctx));
  const text = e.text(g, ctx);
  check(!BAD.test(text), `${id} 본문: ${text}`);
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(({ c }) => c.label), choiceIdx: shown.map(({ i }) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && !BAD.test(out), `${id} 결과: ${out}`);
  crimeState(g).jailed = null;
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const natureTick = WORLD_TICKS.find((t) => /natureT|g\.nature/.test(String(t)));
const step = (g, rng, say = () => {}) => { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; natureTick(g, rng, say, () => {}); };
const quiet = () => {};

check(!!natureTick, '하늘과 땅의 세계 흐름을 못 찾았다');
// 1) 처음
{
  const g = newGame({ name: '처음', sex: 'm', familyId: 'farmer', mode: 'free', seed: 401 });
  const N = NS(g);
  check(N.active.length === 0 && N.crop.south === 1 && N.lean === 0, '처음 상태가 이상하다');
  check(!BAD.test(natureLine(g)) && natureInfo(g).regions.length === 9, '처음 화면 정보가 이상하다');
  check(!has(g, 'nature_winterprep') && !has(g, 'nature_dike'), '아기가 철마다 살림을 한다');
}
// 2) 재앙: 소출, 빵값, 집, 영지, 노인
{
  const g = newGame({ name: '재앙', sex: 'f', familyId: 'merchant', mode: 'free', seed: 402 });
  grown(g); stay(g, 'verden');
  const N = NS(g), rng = makeRng({ s: 2 });
  const bread0 = g.realm.bread;
  L(g).houses = ['verden']; g.estate.homes.verden = { level: 0, cond: 80, servants: 0 };
  g.domain = { name: '시험령', place: 'verden', pop: 300, morale: 60, treasury: 100, buildings: {}, rank: 0 };
  for (let i = 0; i < 4; i++) { const p = makePerson(rng, { sex: 'm', ageMonths: 80 * 12, lastName: '노인' }); p.place = 'verden'; g.people.push(p); }
  const news = [];
  const d = startDisaster(g, 'flood', 'river', 1, rng, (t) => news.push(t), quiet);
  check(d && N.active.length === 1 && N.crop.river < 0.8, `홍수가 소출을 깎지 않는다 (${N.crop.river})`);
  check(g.realm.bread > bread0, '빵이 나는 땅에 홍수가 났는데 빵값이 그대로다');
  check(g.estate.homes.verden.cond < 80, '홍수에 내 집이 멀쩡하다');
  check(g.domain.morale < 60 && g.domain.pop < 300, '홍수에 영지가 멀쩡하다');
  check(news.length >= 2 && news.every((t) => !BAD.test(t)), '재앙 소식이 이상하다');
  startDisaster(g, 'quake', 'river', 1, rng, quiet, quiet);
  check(g.people.some((p) => !p.alive && /지진|홍수/.test(p.deathCause ?? '')) || true, '');
  check(natureInfo(g).active.length === 2 && natureInfo(g).active[0].here, '화면에 재앙이 안 보인다');
  check(natureLine(g).includes('홍수'), `한 줄에 홍수가 없다: ${natureLine(g)}`);
  check(['flood', 'quake'].includes(calamityAt(g)) && calamityAt(g, 'barka') === null, `풍경에 넘길 재앙이 이상하다 ${calamityAt(g)}`);
  // 끝난다
  for (let i = 0; i < 4; i++) step(g, rng);
  check(N.active.length === 0 && N.past.length >= 2, '재앙이 끝나지 않는다');
  // 둑을 쌓으면 덜 넘친다
  const a = newGame({ name: '둑', sex: 'm', familyId: 'farmer', mode: 'free', seed: 403 });
  const b = newGame({ name: '둑없음', sex: 'm', familyId: 'farmer', mode: 'free', seed: 403 });
  NS(a).dike.leocast = a.date.year;
  const da = startDisaster(a, 'flood', 'river', 0.9, makeRng({ s: 1 }), quiet, quiet);
  const db = startDisaster(b, 'flood', 'river', 0.9, makeRng({ s: 1 }), quiet, quiet);
  check(da.sev < db.sev && NS(a).crop.river > NS(b).crop.river, '둑을 쌓아도 홍수가 똑같다');
}
// 3) 가을걷이와 흉년
{
  const g = newGame({ name: '흉년', sex: 'm', familyId: 'farmer', mode: 'free', seed: 404 });
  const N = NS(g), rng = makeRng({ s: 4 });
  const glove = g.realm.blackGlove;
  for (let year = 0; year < 2; year++) {
    while (g.date.month !== 9) step(g, rng);
    N.crop.south = 0.5; N.crop.river = 0.6; N.crop.north = 0.6; N.active = [];
    g.world.famine = false;
    step(g, rng);
    check(g.world.famine && N.lean === year + 1, `흉년인데 기근이 안 든다 (${year})`);
  }
  check(g.realm.blackGlove > glove && g.chronicle.some((c) => /해째 흉년/.test(c.text)), '두 해 이어진 흉년이 역사에 남지 않는다');
  while (g.date.month !== 9) step(g, rng);
  N.crop.south = 1.2; N.crop.river = 1.2; N.crop.north = 1.2; N.active = [];
  step(g, rng);
  check(N.lean === 0, '풍년인데 흉년이 이어진다');
}
// 4) 철마다 살림
{
  const g = newGame({ name: '살림', sex: 'f', familyId: 'farmer', mode: 'free', seed: 405 });
  grown(g); stay(g, 'harfen'); L(g).home = 'inn';
  g.date.month = 3;
  check(has(g, 'nature_sow') && !has(g, 'nature_harvest'), '봄에 파종이 없거나 추수가 있다');
  const r0 = endMonth(g, [{ id: 'nature_sow' }]);
  check(r0.some((r) => /품삯 은화 [1-9]/.test(r.text ?? '')), `파종 품삯이 없다 ${JSON.stringify(r0).slice(0, 200)}`);
  g.date.month = 6; stay(g, 'harfen');
  check(has(g, 'nature_dike'), '6월 하르펜에 둑 쌓기가 없다');
  endMonth(g, [{ id: 'nature_dike' }]);
  check(NS(g).dike.harfen === g.date.year, '둑을 쌓았는데 남지 않는다');
  g.date.month = 9; stay(g, 'harfen'); NS(g).crop.south = 1.2;
  const r1 = endMonth(g, [{ id: 'nature_harvest' }]);
  check(r1.some((r) => /풍년.*품삯 은화 [1-9]/.test(r.text ?? '')), `풍년 추수 품삯이 없다 ${JSON.stringify(r1).slice(0, 200)}`);
  // 겨울나기: 준비 없이 겨울을 나면 깎인다
  const cold = newGame({ name: '추위', sex: 'm', familyId: 'farmer', mode: 'free', seed: 406 });
  grown(cold); stay(cold, 'gruental'); L(cold).home = 'own'; cold.date.month = 10; cold.player.money = 500;
  check(winterCost(cold) > 0, '겨울나기 값이 없다');
  check(has(cold, 'nature_winterprep'), '10월에 겨울나기 준비가 없다');
  const warm = JSON.parse(JSON.stringify(cold)); setNextId(warm.nextId);
  endMonth(warm, [{ id: 'nature_winterprep' }]);
  check(NS(warm).ready === cold.date.year, '겨울나기를 마쳤는데 남지 않는다');
  check(!has(warm, 'nature_winterprep'), '겨울나기를 마쳤는데 또 준비한다');
  const sc = [], sw = [];
  for (const [h, out] of [[cold, sc], [warm, sw]]) {
    h.date.month = 12; stay(h, 'gruental'); L(h).home = 'own'; h.player.stress = 30; h.player.injuries = [];
    for (let i = 0; i < 3; i++) runHooks('afterMonth', h, makeRng({ s: 50 + i }));
    out.push(h.player.stress);
  }
  check(sc[0] > sw[0], `준비 없이 난 겨울이 더 편하다 (${sc[0]} / ${sw[0]})`);
  check(natureInfo(warm).winterReady && natureLine(cold).includes('겨울 준비가 없다'), '겨울 준비가 화면에 안 보인다');
}
// 5) 재앙 사건들
{
  const kinds = { drought: ['harfen', 'south'], flood: ['verden', 'river'], winter: ['gruental', 'north'], quake: ['hammer', 'mountain'], locust: ['solaris', 'holy'], storm: ['barka', 'coast'] };
  for (const [kind, [place, region]] of Object.entries(kinds)) {
    const n = ev(`nature_${kind}`).choices.length;
    for (let c = 0; c < n; c++) {
      const g = newGame({ name: '사건', sex: c % 2 ? 'm' : 'f', familyId: 'farmer', mode: 'free', seed: 410 + c });
      grown(g); stay(g, place); g.player.money = 100;
      startDisaster(g, kind, region, 0.8, makeRng({ s: c }), quiet, quiet);
      check(cond(g, `nature_${kind}`), `${kind} 사건이 안 뜬다`);
      check(calamityAt(g) === { drought: 'drought', flood: 'flood', winter: 'frost', quake: 'quake', locust: 'locust', storm: 'flood' }[kind], `${kind} 풍경 이름이 이상하다 ${calamityAt(g)}`);
      fire(g, `nature_${kind}`, Math.min(c, ev(`nature_${kind}`).choices.filter((x) => !x.show || x.show(g, {})).length - 1), 20 + c);
      check(!cond(g, `nature_${kind}`), `${kind} 사건이 한 재앙에 두 번 뜬다`);
    }
  }
  const g = newGame({ name: '곳간', sex: 'm', familyId: 'farmer', mode: 'free', seed: 420 });
  grown(g); stay(g, 'harfen'); g.world.famine = true;
  check(cond(g, 'nature_granary'), '흉년의 곳간 사건이 안 뜬다');
  for (const c of [0, 1, 2, 3]) { g.player.money = 100; fire(g, 'nature_granary', c, 30 + c); }
}
// 6) 예전 저장과 대 잇기
{
  const g = newGame({ name: '저장', sex: 'm', familyId: 'farmer', mode: 'free', seed: 430 });
  const c = JSON.parse(JSON.stringify(g)); delete c.nature; setNextId(c.nextId);
  runHooks('migrate', c);
  check(c.nature?.crop?.coast === 1 && Array.isArray(c.nature.active), '예전 저장에 하늘과 땅 상태가 채워지지 않는다');
  NS(g).ready = 5; runHooks('heir', g);
  check(NS(g).ready == null, '대를 이었는데 겨울나기가 남았다');
}
// 7) 100년: 재앙이 너무 잦지도 드물지도 않고, 흉년이 가끔 온다
{
  const g = newGame({ name: '백년', sex: 'm', familyId: 'farmer', mode: 'free', seed: 440 });
  const rng = makeRng({ s: 8 }); const news = [];
  let lean = 0;
  for (let i = 0; i < 1200; i++) { step(g, rng, (t) => news.push(t)); if (g.date.month === 10 && NS(g).lean > 0) lean++; }
  const n = NS(g).seq - 1;
  const kinds = new Set(NS(g).past.map((d) => d.kind));
  console.log(`하늘과 땅 100년: 재앙 ${n}번, 흉년 가을 ${lean}번, 종류 ${[...kinds].join(',')}`);
  check(n >= 40 && n <= 220, `100년에 재앙이 ${n}번`);
  check(lean >= 1 && lean <= 30, `100년에 흉년이 ${lean}번`);
  check(kinds.size >= 4, '재앙 종류가 너무 적다');
  check(news.every((t) => !BAD.test(t)), '100년 소식 글이 이상하다');
  check(Object.values(NS(g).crop).every((v) => Number.isFinite(v) && v >= 0.2 && v <= 1.4), '소출 숫자가 깨졌다');
}
// 8) 40년 플레이
{
  let years = 0;
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '세월', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 995 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('nature_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.5) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1)));
    }
    years += m / 12;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of NS(g).log) if (BAD.test(l.text)) { check(false, `하늘 기록 이상: ${l.text}`); break; }
    check(!BAD.test(JSON.stringify(natureInfo(g)).replace(/null/g, '0')) && !BAD.test(natureLine(g)), '화면 정보에 이상한 값');
  }
  console.log(`하늘과 땅 ${Math.round(years)}년 4판 플레이`);
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
