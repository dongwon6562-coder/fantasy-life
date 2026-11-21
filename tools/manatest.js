import './lsshim.js';
import '../src/content.js';
// 마나의 흐름 점검 (1분 안): 처음 상태, 마나 출렁임(주기·짙은 해·옅은 해 소식), 마물·마석 시세·마도구 값이 함께 움직임(새 판에선 처음대로),
// 샘(마름·다시 솟음·차지 다툼), 마나 폭풍, 샘에 가기(마시기·몰래·샘지기), 중독, 샘 지키기·샘 앞 싸움, 사건, 대 잇기(짙은 해의 아이), 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { makePerson, byId } from '../src/npc.js';
import { becomeHeir } from '../src/heir.js';
import { manaState as MS, manaInfo, manaLine, manaMonth, seize, syncMana, WELLS, WELL_IDS } from '../src/mana/index.js';
import { ITEMS } from '../src/tower/state.js';
import { priceAt } from '../src/trade/core.js';
import { encodeSave, decodeSave } from '../src/save.js';

const T0 = Date.now();
SCENE_STRICT.on = true;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = e.text(g, ctx);
  check(!BAD.test(text) && typeof e.title === 'string', `${id} 본문: ${text}`);
  const shown = e.choices.map((c, i) => [c, i]).filter(([c]) => !c.show || c.show(g, ctx));
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(([c]) => c.label), choiceIdx: shown.map(([, i]) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  return { out, ctx };
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; g.pendingEvent = null; L(g).scene = null; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const queued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); return out; };
const scene = (g, kind, key, seed = 5) => {
  const q = L(g).queue, i = q.findIndex((x) => x.kind === kind);
  if (i < 0) { check(false, `장면 ${kind}이 대기열에 없다`); return ''; }
  const [s] = q.splice(i, 1);
  g.pendingEvent = null; L(g).scene = null;
  if (!showScene(g, s, { force: true })) { check(false, `장면 ${kind}을 띄우지 못했다`); return ''; }
  check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title), `${kind} 글: ${g.pendingEvent.title} / ${g.pendingEvent.text}`);
  const idx = key == null ? 0 : s.choices.findIndex((c) => c.key === key);
  check(idx >= 0, `${kind}에 선택지 ${key}가 없다 (${s.choices.map((c) => c.key)})`);
  const out = resolveEvent(g, makeRng({ s: seed }), Math.max(0, idx));
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  return out;
};
const fresh = (seed, name = '샘물') => newGame({ name, sex: 'f', familyId: 'farmer', mode: 'free', seed });
const adult = (seed, place = 'silverleaf', v = 50) => { const g = fresh(seed); grown(g); stay(g, place); for (const k of Object.keys(g.player.stats)) g.player.stats[k] = v; g.player.manaAwakened = true; g.player.manaPotential = 0.5; g.player.mana = 20; g.player.money = 500; g.player.familyMoney = 0; g.player.injuries = []; L(g).pendingDeath = null; L(g).queue = []; return g; };
const ticks = (g, n, until = () => false) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; manaMonth(g); if (until()) return i + 1; } return n; };
const okInfo = (g) => check(!BAD.test(JSON.stringify(manaInfo(g)).replace(/null/g, '0')) && !BAD.test(String(manaLine(g) ?? '')), `화면 정보: ${JSON.stringify(manaInfo(g)).slice(0, 300)}`);
const wl = (g, id) => MS(g).wells[id];
const die = (g) => { (L(g).ancestors ??= []).push({ name: g.player.name, lastName: g.player.lastName, born: g.date.year - 40, died: g.date.year }); };
const BASE = Object.fromEntries(Object.entries(ITEMS).map(([id, it]) => [id, { cost: it.cost, sell: it.sell }]));

// 1) 처음: 샘 일곱, 마나는 주기의 어디쯤
{
  const g = fresh(7001), S = MS(g);
  check(WELL_IDS.length === 7 && WELL_IDS.every((id) => wl(g, id).flow > 0 && !wl(g, id).dry), '샘 일곱');
  check(Number.isFinite(S.tide) && Math.abs(S.tide) <= 100 && S.period >= 12 * 28, '마나 주기');
  const tides = new Set([7002, 7003, 7004, 7005].map((s) => MS(fresh(s)).tide));
  check(tides.size >= 3, '판마다 처음 마나가 다르다');
  okInfo(g);
}
// 2) 마나가 출렁이고, 마물·마석·마도구 값이 따라 움직인다
{
  const g = fresh(7010), S = MS(g);
  let lo = 100, hi = -100;
  ticks(g, 12 * 50, () => { lo = Math.min(lo, S.tide); hi = Math.max(hi, S.tide); return false; });
  check(hi >= 30 && lo <= -30, `50년에 높낮이 (${lo}~${hi})`);
  check(Object.keys(S.years).length >= 45, '해마다 마나를 적는다');
  // 짙은 해
  const h = fresh(7011), H = MS(h);
  H.phase = Math.PI / 2 - 0.01; H.amp = 75; H.noise = 0; h.realm.monsters = 40; H.high = false;
  h.trade.mkt = {};
  const p0 = priceAt(h, 'serenia', 'manastone');
  ticks(h, 24);
  check(H.tide >= 45 && H.high, '짙은 해');
  check(h.realm.monsters > 40, `짙으면 마물이 는다 (${h.realm.monsters})`);
  check(priceAt(h, 'serenia', 'manastone') < p0, '짙으면 마석이 싸다');
  syncMana(h);
  check(ITEMS.charm.cost <= BASE.charm.cost && ITEMS.staff.cost < BASE.staff.cost, '짙으면 마도구 재료값이 내린다');
  check(H.log.some((c) => c.text.includes('짙어지는')), '짙은 해 소식');
  okInfo(h);
  // 옅은 해
  const k = fresh(7012), K = MS(k);
  K.phase = Math.PI * 1.5 - 0.01; K.amp = 75; K.noise = 0; K.low = false; k.realm.monsters = 40;
  ticks(k, 24);
  syncMana(k);
  check(K.tide <= -45 && K.low && k.realm.monsters < 40 && ITEMS.staff.cost > BASE.staff.cost, '옅은 해: 마물이 줄고 마도구 값이 오른다');
  // 새 판에서는 그 판의 마나대로
  const n = fresh(7013); MS(n).tide = 0; syncMana(n);
  check(Object.entries(BASE).every(([id, b]) => ITEMS[id].cost === b.cost && ITEMS[id].sell === b.sell), '마나가 고르면 처음 값');
  // 샘이 마르고 다시 솟는다
  wl(k, 'wl_verden').flow = 3; ticks(k, 1);
  check(wl(k, 'wl_verden').dry, '샘이 마른다');
  K.phase = Math.PI / 2; K.noise = 0; ticks(k, 60, () => !wl(k, 'wl_verden').dry);
  check(!wl(k, 'wl_verden').dry, '다시 솟는다');
  // 차지 다툼과 폭풍
  const s = fresh(7014); seize(s, 'wl_silver', 'rogue', () => {});
  check(wl(s, 'wl_silver').holder === 'rogue' && wl(s, 'wl_silver').seized === 1, '샘 주인이 바뀐다');
  const t = fresh(7015), TT = MS(t); TT.phase = Math.PI / 2; TT.amp = 80; TT.noise = 10;
  ticks(t, 12 * 30, () => !!TT.storm || WELL_IDS.some((id) => wl(t, id).storms > 0));
  check(WELL_IDS.some((id) => wl(t, id).storms > 0), '짙은 해에는 마나 폭풍');
  const sz = fresh(7016); MS(sz).phase = Math.PI / 2; MS(sz).amp = 80;
  ticks(sz, 12 * 40, () => WELL_IDS.some((id) => wl(sz, id).seized > 0));
  check(WELL_IDS.some((id) => wl(sz, id).seized > 0 || wl(sz, id).guard < 50), '플레이어 없이도 샘을 노린다');
  syncMana(fresh(7017));
}
// 3) 샘에 가기, 중독, 샘지기, 샘 앞 싸움, 폭풍
{
  const g = adult(7020, 'silverleaf');
  check(has(g, 'mana_well'), '샘에 간다');
  act(g, 'mana_well');
  scene(g, 'mana_well', 'join', 3);
  const S = MS(g);
  if (!S.me.warden) { S.me.warden = 'wl_silver'; }
  check(S.me.warden === 'wl_silver' && has(g, 'mana_ward'), '샘지기');
  for (let i = 0; i < 6; i++) act(g, 'mana_ward', i);
  check(wl(g, 'wl_silver').guard > 50, '지키면 샘이 단단해진다');
  const m0 = g.player.mana;
  act(g, 'mana_well'); scene(g, 'mana_well', 'drink');
  check(g.player.mana > m0 && g.player.mana - m0 < 2 && S.me.poison > 0 && S.me.draws === 1, `마시면 마력이 조금 (${(g.player.mana - m0).toFixed(2)})`);
  for (let i = 0; i < 8; i++) { act(g, 'mana_well'); scene(g, 'mana_well', 'drink', i); }
  check(S.me.poison >= 60 && g.player.mana - m0 < 15, `자꾸 마시면 중독 (${Math.round(S.me.poison)})`);
  check(/중독/.test(manaLine(g) ?? ''), '중독 머리글');
  runHooks('afterMonth', g, makeRng({ s: 1 }));
  okInfo(g);
  // 샘 앞 싸움
  for (const [i, key] of ['hold', 'talk', 'pay', 'yield'].entries()) {
    const h = adult(7030 + i, 'silverleaf'); MS(h).me.warden = 'wl_silver';
    queueScene(h, 'mana_siege', { id: 'wl_silver', by: 'tower' });
    scene(h, 'mana_siege', key, i);
    if (key === 'yield') check(wl(h, 'wl_silver').holder === 'tower' && !MS(h).me.warden, '비켜서면 샘을 내준다');
  }
  // 몰래 마시기 (값 못 내는 샘), 탑 샘
  const k = adult(7040, 'serenia'); k.player.money = 0; L(k).home = 'inn';
  act(k, 'mana_well'); scene(k, 'mana_well', 'sneak', 2);
  // 폭풍
  for (const [i, key] of ['hide', 'help', 'walk'].entries()) {
    const s = adult(7045 + i, 'gorge'); MS(s).storm = { well: 'wl_gorge', place: 'gorge', left: 2 };
    manaMonth(s);
    check(queued(s, 'mana_storm'), '그 자리에 있으면 폭풍 장면');
    scene(s, 'mana_storm', key, i);
  }
  // 샘지기가 오래 비우면
  const w = adult(7050, 'silverleaf'); MS(w).me.warden = 'wl_silver'; stay(w, 'leocast');
  for (let i = 0; i < 6; i++) runHooks('afterMonth', w, makeRng({ s: i }));
  check(!MS(w).me.warden, '여섯 달 비우면 샘지기 이름이 지워진다');
}
// 4) 사건: 목마름, 마나가 짙은 해의 아이
{
  for (const [i, ch] of [0, 1].entries()) {
    const g = adult(7060 + i, 'harfen'); const S = MS(g); S.me.draws = 6; S.me.lastDraw = -99; S.me.poison = 10;
    check(cond(g, 'mana_crave'), '목마름');
    fire(g, 'mana_crave', ch, i);
  }
  for (const ch of [0, 1, 2]) {
    const g = adult(7065 + ch, 'harfen'); MS(g).tide = 50;
    const rng = makeRng({ s: 4 }), kid = makePerson(rng, { ageMonths: 7 * 12, lastName: g.player.lastName });
    g.people.push(kid); me(g).childIds.push(kid.id); kid.known = true;
    check(cond(g, 'mana_child'), '짙은 해의 아이');
    const { ctx } = fire(g, 'mana_child', ch, ch);
    check(Number.isFinite(byId(g, ctx.kid).manaSpark), '아이에게 표시');
    MS(g).tide = 0;
    check(!cond(g, 'mana_child'), '마나가 고르면 오지 않는다');
  }
}
// 5) 대 잇기: 마나가 짙은 해에 태어난 아이는 그릇이 조금 크다, 고서클은 여전히 드물다
{
  let up = 0, n = 0, big = 0;
  for (let i = 0; i < 20; i++) {
    const g = adult(7100 + i, 'ern'); const S = MS(g);
    const rng = makeRng({ s: 11 + i }), kid = makePerson(rng, { ageMonths: 16 * 12, lastName: g.player.lastName });
    g.people.push(kid); me(g).childIds.push(kid.id); g.player.familyIds.push(kid.id); kid.known = true;
    S.years[g.date.year - 16] = 80; S.me.warden = 'wl_silver'; S.me.poison = 50;
    const ref = adult(7100 + i, 'ern'); const kr = makePerson(makeRng({ s: 11 + i }), { ageMonths: 16 * 12, lastName: ref.player.lastName });
    ref.people.push(kr); me(ref).childIds.push(kr.id); ref.player.familyIds.push(kr.id); kr.known = true; MS(ref).years = {};
    die(g); die(ref); becomeHeir(g, makeRng({ s: 99 + i }), kid); becomeHeir(ref, makeRng({ s: 99 + i }), kr);
    if (g.over || ref.over) continue;
    n++;
    if (g.player.manaPotential > ref.player.manaPotential || (g.player.manaPotential === 1 && ref.player.manaPotential === 1) || ref.player.manaPotential === 0) up++;
    if (g.player.manaPotential >= 0.8) big++;
    check(!MS(g).me.warden && MS(g).me.poison === 0, '대를 이으면 샘지기·중독은 넘어가지 않는다');
  }
  check(n >= 10 && up >= n * 0.9, `짙은 해의 아이는 그릇이 크다 (${up}/${n})`); console.log(`짙은 해의 아이 ${up}/${n}, 큰 그릇 ${big}`);
  check(big <= n * 0.3, `그래도 큰 그릇은 드물다 (${big}/${n})`);
  const s = adult(7130, 'ern'); const kid = makePerson(makeRng({ s: 3 }), { ageMonths: 16 * 12, lastName: s.player.lastName });
  s.people.push(kid); me(s).childIds.push(kid.id); s.player.familyIds.push(kid.id); kid.manaSpark = 0.4; MS(s).years = {};
  die(s); becomeHeir(s, makeRng({ s: 5 }), kid);
  check(s.over || s.player.manaPotential >= 0.4, '마탑이 본 아이는 그릇이 그만큼은 된다');
}
// 6) 저장 왕복, 예전 저장
{
  const g = adult(7200, 'silverleaf'); MS(g).me.warden = 'wl_silver'; MS(g).tide = 70; MS(g).storm = { well: 'wl_gorge', place: 'gorge', left: 1 }; seize(g, 'wl_verden', 'rogue');
  const back = decodeSave(encodeSave(g));
  runHooks('migrate', back, makeRng({ s: 1 }));
  check(back.mana.tide === 70 && back.mana.me.warden === 'wl_silver' && back.mana.wells.wl_verden.holder === 'rogue' && back.mana.storm?.place === 'gorge', '저장 왕복');
  check(ITEMS.staff.cost < BASE.staff.cost, '불러오면 그 판의 마도구 값');
  const h = fresh(7201); delete h.mana; runHooks('migrate', h, makeRng({ s: 1 }));
  check(!!h.mana && Object.keys(h.mana.wells).length === 7, '예전 저장을 채운다');
  const k = fresh(7202); delete k.mana.wells.wl_gorge; k.mana.wells.wl_x = {}; k.mana.wells.wl_silver.holder = '??'; k.mana.tide = NaN; k.mana.me.warden = 'wl_x';
  runHooks('migrate', k, makeRng({ s: 1 }));
  check(k.mana.wells.wl_gorge && !k.mana.wells.wl_x && k.mana.wells.wl_silver.holder === 'wardens' && Number.isFinite(k.mana.tide) && !k.mana.me.warden, '빠지고 이상한 것을 고친다');
  okInfo(k);
}
// 7) 짧은 플레이 (2판 × 12년)
{
  const seen = {};
  for (let run = 0; run < 2; run++) {
    const g = newGame({ name: '평생', sex: run ? 'm' : 'f', familyId: ['farmer', 'merchant'][run], mode: 'free', seed: 7297 + run });
    grown(g, 16); stay(g, ['silverleaf', 'serenia'][run]); g.player.manaAwakened = true; g.player.manaPotential = Math.max(0.3, g.player.manaPotential); g.player.money += 300;
    for (let m = 0; m < 12 * 12 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('mana_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.5) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) { const kind = L(g).scene?.kind ?? g.pendingEvent.id; seen[kind] = (seen[kind] ?? 0) + 1; check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title) && g.pendingEvent.choices.every((c) => !BAD.test(c)), `장면 글 ${kind}: ${g.pendingEvent.text}`); resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1))); }
      for (const r of g.lastResults ?? []) if (BAD.test(r.text)) { check(false, `결과 글 ${r.name}: ${r.text}`); break; }
      if (!Number.isFinite(g.player.money) || g.player.money < 0 || !Number.isFinite(g.player.mana)) { check(false, `돈/마력 ${g.player.money} ${g.player.mana}`); break; }
    }
    console.log(`판 ${run}: ${g.date.year}년 over=${!!g.over} 마시기 ${MS(g).me.draws}`);
    for (const l of MS(g).log) if (BAD.test(l.text)) { check(false, `마나 기록 이상: ${l.text}`); break; }
    for (const n of g.news ?? []) if (BAD.test(n.text)) { check(false, `소식 글 이상: ${n.text}`); break; }
    okInfo(g);
  }
  console.log(`장면 ${Object.keys(seen).filter((k) => k.startsWith('mana_')).join(',')}`);
}
syncMana(fresh(7999));
const sec = Math.round((Date.now() - T0) / 1000);
check(sec < 60, `1분 안 (${sec}초)`);
console.log(fail ? `FAIL ${fail}` : `OK (${sec}초)`);
if (fail) process.exit(1);
