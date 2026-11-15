import './lsshim.js';
import '../src/content.js';
// 움직이는 대륙 점검: 처음 상태, 전쟁과 땅, 강화, 왕조 교체와 멸망, 큰 인물 통치자, 용병·사절·첩자·물자·혼례·새 통치자, 예전 저장, 60년 흐름.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { REALMS } from '../src/realms/data.js';
import { crimeState } from '../src/crime.js';
import { politicsState as PS, politicsMap, politicsLine, tieLine, continentNews, landOwner, relOf } from '../src/politics/index.js';
import { declareWar, peace, succeed } from '../src/politics/world.js';

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
  return out;
};
const grown = (g, y = 22) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const said = [];
const say = (t) => said.push(t), record = () => {};

// 1) 처음
{
  const g = newGame({ name: '처음', sex: 'm', familyId: 'farmer', mode: 'free', seed: 91 });
  const P = PS(g);
  check(P.rulers.valhart.name === '율리안' && REALMS.valhart.ruler.includes('율리안'), '처음 황제가 설정과 다르다');
  check(landOwner(g, 'krossen') === 'free' && landOwner(g, 'ort') === 'leonia', '처음 땅 주인이 맞지 않다');
  const m = politicsMap(g);
  check(m.lands.length >= 15 && m.realms.length >= 9 && m.wars.length === 0, `지도 상태 모양이 이상하다 ${m.lands.length}/${m.realms.length}/${m.wars.length}`);
  check(!/undefined|NaN/.test(JSON.stringify(m)) && !BAD.test(politicsLine(g)) && !BAD.test(tieLine(g, 'leonia', 'holy')), '지도 상태에 깨진 값');
  check(tieLine(g, 'leonia', 'holy').includes('동맹'), '레오니아와 성광국의 동맹이 안 보인다');

  // 2) 전쟁과 땅
  declareWar(g, makeRng({ s: 1 }), say, record, 'valhart', 'free');
  const w = P.wars[0];
  check(w && politicsMap(g).wars.some((x) => x.a === 'valhart' && x.b === 'free'), '전쟁이 지도 상태에 없다');
  w.score = 40;
  for (let i = 0; i < 3 && landOwner(g, 'krossen') === 'free'; i++) endMonth(g, [{ id: 'rest' }]);
  check(['krossen', 'libera', 'gard', 'ostmark', 'kars'].some((l) => landOwner(g, l) !== { krossen: 'free', libera: 'free', gard: 'free', ostmark: 'valhart', kars: 'valhart' }[l]), '전선이 크게 기울어도 땅 주인이 안 바뀐다');
  check(politicsMap(g).lands.some((l) => l.changed), '바뀐 땅이 지도 상태에 없다');
  // 3) 용병
  L(g).place = 'barka'; grown(g);
  g.player.skills.sword = 60; g.player.stats.str = 50;
  check(availableActions(g).some((a) => a.id === 'pol_merc'), '전쟁 중 바르카에서 용병 일이 안 보인다');
  const m0 = g.player.money;
  endMonth(g, [{ id: 'pol_merc' }, { id: 'pol_merc' }]);
  check(P.me.merc === 1 && g.player.money > m0 - 1, `용병 한 달이 맞지 않다 (${P.me.merc})`);
  check(g.lastResults.every((r) => !BAD.test(r.text)), '용병 결과 글이 깨졌다');
  // 4) 물자
  for (const x of g.pendingEvent ? [0, 1, 2, 3, 4, 5] : []) if (g.pendingEvent) resolveEvent(g, rngOf(g), 0);
  g.player.skills.trade = 40; g.player.money = 200; L(g).place = 'barka'; PS(g).wars[0] ??= w;
  if (PS(g).wars.length) { check(cond(g, 'pol_war_trade'), '전쟁 특수 사건이 안 뜬다'); fire(g, 'pol_war_trade', 1); }
  // 5) 사절: 자유도시 수도에서 발하르트와의 강화
  if (PS(g).wars.length) {
    PS(g).wars[0].weary = 10;
    g.player.stats.cha = 90; g.player.skills.letters = 90; L(g).renown = 80;
    check(cond(g, 'pol_envoy'), '사절 사건이 안 뜬다');
    fire(g, 'pol_envoy', 0, 3);
  }
  // 6) 첩자
  L(g).place = 'eisen';
  PS(g).me.mercFor = null;
  if (relOf(g, 'valhart', 'free') > -21) PS(g).rel['free|valhart'] = -60;
  check(cond(g, 'pol_spy_offer'), '첩자 제안이 안 뜬다');
  fire(g, 'pol_spy_offer', 0);
  check(!!PS(g).me.spyFor, '첩자 일을 맡았는데 남지 않는다');
  check(cond(g, 'pol_spy_job'), '첩자 일감이 안 뜬다');
  fire(g, 'pol_spy_job', 0);
  crimeState(g).jailed = null; // 붙잡혔어도 아래 점검을 위해 풀어 준다
  // 7) 강화
  if (PS(g).wars.length) { const w2 = PS(g).wars[0]; peace(g, makeRng({ s: 2 }), say, record, w2, 'valhart', 'free'); }
  check(!PS(g).wars.length && tieLine(g, 'valhart', 'free').includes('휴전'), '강화 뒤 휴전이 남지 않는다');
  // 8) 왕조 교체와 멸망
  const house0 = P.rulers.valhart.house;
  P.rulers.valhart.heir = false; P.stab.valhart = 10;
  succeed(g, makeRng({ s: 5 }), say, record, 'valhart', '세상을 떠났다');
  check(P.rulers.valhart.house !== house0 && P.fallen.some((f) => f.house === house0), '대 이을 사람이 없는데 가문이 그대로다');
  check(!REALMS.valhart.ruler.includes('율리안') && !BAD.test(REALMS.valhart.ruler), `나라 정보의 통치자가 안 바뀐다 (${REALMS.valhart.ruler})`);
  check(cond(g, 'pol_new_ruler') === (L(g).place === 'eisen'), '새 통치자 사건 조건이 맞지 않다');
  if (cond(g, 'pol_new_ruler')) fire(g, 'pol_new_ruler', 0);
  // 큰 인물 통치자: 마그누스가 죽으면 세레니아는 새 협회장을 뽑는다
  const mg = g.legends.list.find((x) => x.id === 'magnus'); mg.alive = false;
  endMonth(g, [{ id: 'rest' }]);
  check(P.rulers.serenia.name !== '마그누스' && !P.rulers.serenia.legend, '마그누스가 죽었는데 협회장이 그대로다');
  // 9) 혼례
  P.wedding = { a: 'valhart', b: 'dwarf', at: g.date.year * 12 + g.date.month };
  for (let i = 0; i < 6 && g.pendingEvent; i++) resolveEvent(g, rngOf(g), 0);
  L(g).place = 'eisen'; L(g).travel = null;
  check(cond(g, 'pol_wedding'), '혼례 사건이 안 뜬다');
  fire(g, 'pol_wedding', 1);
  for (const s of said) check(!BAD.test(s), `소식 글 이상: ${s}`);
  // 새 판을 열면 통치자 글이 처음으로 돌아간다
  newGame({ name: '다시', sex: 'f', familyId: 'farmer', mode: 'free', seed: 92 });
  check(REALMS.valhart.ruler.includes('율리안'), '새 판인데 지난 판의 황제가 남아 있다');
  // 10) 예전 저장
  const c = JSON.parse(JSON.stringify(g)); delete c.politics; setNextId(c.nextId);
  runHooks('migrate', c);
  check(c.politics?.rulers?.valhart && Object.keys(c.politics.rel).length >= 40, '예전 저장에 대륙 상태가 채워지지 않는다');
  // 불러오면 그 판의 통치자 글로 맞춘다
  runHooks('migrate', g);
  check(!REALMS.valhart.ruler.includes('율리안'), '불러온 판의 통치자 글이 맞지 않다');
}
// 11) 60년: 플레이어 없이도 대륙이 움직인다
{
  const tot = {};
  let years = 0;
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '대륙', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 920 + run });
    let m = 0;
    for (; m < 12 * 60 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: rng.pick(acts).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1)));
    }
    years += m / 12;
    for (const [k, v] of Object.entries(PS(g).tally ?? {})) tot[k] = (tot[k] ?? 0) + v;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const c of g.realm.log) if (BAD.test(c.text)) { check(false, `연대기 글 이상: ${c.text}`); break; }
    for (const n of continentNews(g, 40)) if (BAD.test(n.text)) { check(false, `대륙 소식 이상: ${n.text}`); break; }
    check(!/undefined|NaN/.test(JSON.stringify(politicsMap(g))), '60년 뒤 지도 상태가 깨졌다');
    if (run === 0) console.log('60년 뒤 대륙:', politicsMap(g).realms.map((r) => `${r.name} ${r.ruler ?? ''}`).join(' / '));
  }
  console.log(`대륙 ${Math.round(years)}년: ${JSON.stringify(tot)}`);
  check((tot.war ?? 0) >= 2 && (tot.land ?? 0) >= 1 && (tot.peace ?? 0) >= 1, '수십 년 동안 전쟁도 땅 바뀜도 없다');
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
