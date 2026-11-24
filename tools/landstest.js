import './lsshim.js';
import '../src/content.js';

// 달마다 기세와 바깥 마을, 대 잇기, 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, circleOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { makePerson, byId, bodyAgeOf, ageYears } from '../src/npc.js';
import { playerPower } from '../src/adventure/combat.js';
import { encodeSave, decodeSave } from '../src/save.js';

const T0 = Date.now();
SCENE_STRICT.on = true;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])|\(으\)|을\(를\)|이\(가\)/;
const BAD0 = /undefined|NaN|\[object/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = typeof e.text === 'function' ? e.text(g, ctx) : e.text;
  check(!BAD.test(text), `${id} 본문: ${text}`);
  const shown = e.choices.map((c, i) => [c, i]).filter(([c]) => !c.show || c.show(g, ctx));
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(([c]) => c.label), choiceIdx: shown.map(([, i]) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  if (process.env.SHOW) console.log(`[${id}] ${text}\n  > ${out}`);
  return out;
};
const grown = (g, y) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; g.pendingEvent = null; L(g).scene = null; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const queued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); if (process.env.SHOW) console.log(`[${id}] > ${out}`); return out; };
const scene = (g, kind, key, seed = 5) => {
  let s;
  if (L(g).scene?.kind === kind && g.pendingEvent?.id === 'life_scene') s = L(g).scene;
  else {
    const q = L(g).queue, i = q.findIndex((x) => x.kind === kind);
    if (i < 0) { check(false, `장면 ${kind}이 대기열에 없다`); return ''; }
    [s] = q.splice(i, 1);
    g.pendingEvent = null; L(g).scene = null;
    if (!showScene(g, s, { force: true })) { check(false, `장면 ${kind}을 띄우지 못했다`); return ''; }
  }
  check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title), `${kind} 글: ${g.pendingEvent.title} / ${g.pendingEvent.text}`);
  const idx = key == null ? 0 : s.choices.findIndex((c) => c.key === key);
  check(idx >= 0, `${kind}에 선택지 ${key}가 없다 (${s.choices.map((c) => c.key)})`);
  const out = resolveEvent(g, makeRng({ s: seed }), Math.max(0, idx));
  if (process.env.SHOW) console.log(`[${kind}/${key}] ${g.pendingEvent?.text ?? ""}\n  > ${out}`);
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  return out;
};
import { LANDS, LAND_IDS, landsInfo, landsLine, landsState, landsYear, syncLands, gateOpen, sizeWord } from '../src/lands/index.js';
import { PLACES, travelMonths } from '../src/places.js';
import { P, roads } from '../src/art/mapdata.js';
import { MAP_PLACES_EXTRA } from '../src/art/map.js';
import { REALM_PEOPLE } from '../src/realms/data.js';
import { LOCAL, isMarket, priceAt } from '../src/trade/core.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { iconName } from '../src/art/icons.js';

// 44단계 고장 늘리기 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 71) => newGame({ name: '루돌프', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const S = landsState;
const textOK = (arr, what) => { for (const t of arr) check(typeof t === 'string' && t.length > 1 && !BAD.test(t), `${what}: ${t}`); };
const adult = (pl = 'milles', seed = 77) => { const g = mk(seed); grown(g, 22); stay(g, pl); g.player.money = 120; return g; };

// 1. 고장 표: 지도·길·시세·사람
{
  check(LAND_IDS.length >= 15, `새 고장 (${LAND_IDS.length})`);
  const byRealm = {}; for (const id of LAND_IDS) byRealm[LANDS[id].realm] = (byRealm[LANDS[id].realm] ?? 0) + 1;
  for (const r of ['leonia', 'valhart', 'holy', 'serenia', 'free', 'march', 'elf', 'beast']) check((byRealm[r] ?? 0) >= 2, `${r} 새 고장 둘 이상 (${byRealm[r] ?? 0})`);
  check((byRealm.dwarf ?? 0) >= 1, '드워프 산 아래 도시');
  const mapIds = new Set([...P, ...MAP_PLACES_EXTRA].map((p) => p.id));
  for (const id of LAND_IDS) {
    const d = LANDS[id], p = PLACES[id];
    check(!!p && p.realm === d.realm && p.land, `${id} 고장에 올랐다`);
    check(mapIds.has(id), `${id} 지도에 있다`);
    check(Object.keys(p.links).length >= 1 && Object.keys(p.links).every((to) => PLACES[to]?.links?.[id] === p.links[to]), `${id} 길이 양쪽으로 같다`);
    check(travelMonths('ern', id) < 15, `${id} 에른에서 닿는다 (${travelMonths('ern', id)})`);
    for (const to of Object.keys(p.links)) check(roads.some((r) => r.some((x, i) => x === id && (r[i - 1] === to || r[i + 1] === to))), `${id}-${to} 지도 길`);
    check(!!LOCAL[id] && Object.keys(LOCAL[id]).length >= 3, `${id} 시세`);
    check((REALM_PEOPLE[id] ?? []).length >= 4, `${id} 사람`);
    check(d.custom.choices.length >= 3 && d.work.text.length >= 3, `${id} 풍습과 일`);
    textOK([d.name, d.kind, d.desc, d.speech, d.custom.title, d.custom.text, d.work.name, d.work.desc, ...d.work.text, d.danger.text, ...d.custom.choices.flatMap((c) => [c[0], c[1]])], id);
  }
  // 풍습·말투가 고장마다 다르다
  check(new Set(LAND_IDS.map((id) => LANDS[id].speech)).size === LAND_IDS.length && new Set(LAND_IDS.map((id) => LANDS[id].work.name)).size === LAND_IDS.length, '말투와 일이 고장마다 다르다');
  check(iconName({ id: 'ld_work' }) !== 'scroll', '일 아이콘');
}
// 2. 장터: 새 고장 시세가 다르다
{
  const g = mk(5);
  check(LAND_IDS.filter((id) => isMarket(id)).length >= 14, '장터가 서는 새 고장');
  check(priceAt(g, 'roten', 'iron') < priceAt(g, 'leocast', 'iron') && priceAt(g, 'milles', 'grain') < priceAt(g, 'grondar', 'grain') || !isMarket('grondar'), '고장마다 싸고 비싼 것');
  check(priceAt(g, 'roten', 'iron') < priceAt(g, 'garum', 'iron'), '쇠는 광산 도시에서 싸고 초원에서 비싸다');
}
// 3. 무플레이로 커지고 작아지는 고장
{
  const g = mk(9), news = [];
  const p0 = { ...S(g).pop };
  const sizes = new Set();
  for (let y = 0; y < 80; y++) { g.date.year++; if (y === 30) { g.world ??= {}; g.world.famine = true; } if (y === 33) g.world.famine = false; landsYear(g, (t) => news.push(t)); for (const id of LAND_IDS) sizes.add(sizeWord(S(g).pop[id])); }
  const moved = LAND_IDS.filter((id) => Math.abs(S(g).pop[id] - p0[id]) >= 3).length;
  check(moved >= 6, `고장 크기가 움직인다 (${moved})`);
  check(sizes.size >= 3, `크기 말 (${[...sizes]})`);
  check(news.length >= 2 && news.length <= 60, `고장 소식 (${news.length})`);
  textOK(news, '고장 소식'); textOK(S(g).log.map((x) => x.text), '고장 기록');
  check(LAND_IDS.every((id) => S(g).pop[id] >= 3 && S(g).pop[id] <= 100), '크기 범위');
  // 크기에 따라 품삯과 집값이 따라 움직인다
  S(g).pop.milles = 95; syncLands(g); const big = { w: PLACES.milles.wage, h: PLACES.milles.house, k: PLACES.milles.kind };
  S(g).pop.milles = 8; syncLands(g); const small = { w: PLACES.milles.wage, h: PLACES.milles.house, k: PLACES.milles.kind };
  check(big.w > small.w && big.h > small.h && big.k !== small.k && /쇠락한/.test(small.k), `크기와 살림 (${big.k}/${small.k})`);
  // 기근이 곡창 마을을 줄인다
  const a = mk(11), b = mk(11); a.world.famine = true;
  for (let y = 0; y < 5; y++) { a.date.year++; b.date.year++; landsYear(a); landsYear(b); }
  check(S(a).pop.milles < S(b).pop.milles, `흉년이 곡창을 줄인다 (${S(a).pop.milles} < ${S(b).pop.milles})`);
}
// 4. 처음 들어선 날, 그 고장 일
{
  const g = adult('roten');
  runHooks('afterActions', g, makeRng({ s: 1 }), []);
  check(S(g).seen.includes('roten') && me(g).history.some((h) => /로텐부르크에서 처음/.test(h.text)), '처음 들어선 날 말투');
  check(has(g, 'ld_work'), '그 고장 일');
  const m0 = g.player.money, s0 = g.player.skills.smithing ?? 0;
  act(g, 'ld_work'); check(g.player.money > m0 && (g.player.skills.smithing ?? 0) > s0, '용광로 일: 품삯과 대장일');
  for (const id of LAND_IDS) { const h = adult(id, 80); act(h, 'ld_work', 4); }
  const e = adult('ern'); check(!has(e, 'ld_work'), '옛 고장엔 없다');
  const t = adult('kalten'); for (let i = 0; i < 12; i++) act(t, 'ld_work', i); check((t.life.renown ?? 0) >= 2 && S(t).log.length >= 1, '한 해를 나면 고장 사람들이 안다');
}
// 5. 풍습: 고장마다 다른 장면, 해마다 한 번
{
  for (const id of LAND_IDS) for (let k = 0; k < 3; k++) {
    const g = adult(id, 90 + k); S(g).seen.push(id); g.player.money = 50;
    queueScene(g, 'ld_custom', { id });
    scene(g, 'ld_custom', String(k), 7 + k);
  }
  const g = adult('libera'); S(g).seen.push('libera'); L(g).queue = [];
  let n = 0; for (let m = 0; m < 48; m++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; runHooks('afterMonth', g, makeRng({ s: m + 3 })); if (queued(g, 'ld_custom')) { n++; L(g).queue = L(g).queue.filter((s) => s.kind !== 'ld_custom'); } L(g).queue = []; }
  check(n >= 1 && n <= 4, `풍습은 해마다 많아야 한 번 (${n}/4년)`);
  const poor = adult('libera'); poor.player.money = 0; queueScene(poor, 'ld_custom', { id: 'libera' }); showScene(poor, L(poor).queue.shift(), { force: true });
  check(!L(poor).scene.choices.some((c) => /배를 빌려/.test(c.label)), '돈 없으면 배를 못 빌린다');
}
// 6. 고장의 위험
{
  for (const id of LAND_IDS) { const g = adult(id, 60); S(g).seen.push(id); check(cond(g, 'ld_danger'), `${id} 위험 조건`); fire(g, 'ld_danger', 0, 3); }
  const g = adult('kalten'); S(g).seen.push('kalten'); const lo = ev('ld_danger').chance(g); S(g).pop.kalten = 90; const hi = ev('ld_danger').chance(g);
  check(lo > hi, '작은 고장이 더 위험하다');
}
// 7. 숨은 도시와 통행 허가
{
  const g = adult('silverleaf');
  check(PLACES.iela.hidden && !gateOpen(g, 'iela') && !PLACES.iela.open(g), '사람에게 이엘라는 닫혀 있다');
  check(has(g, 'ld_pass'), '은잎 마을에서 허가를 청한다');
  g.life.renown = 60; g.player.money = 200;
  let k = 0; while (!S(g).pass.iela && k++ < 8) act(g, 'ld_pass', 10 + k);
  check(S(g).pass.iela && PLACES.iela.open(g) && !has(g, 'ld_pass'), '허가를 받으면 열린다');
  check(g.player.money < 200, '수수료');
  const p = adult('silverleaf'); p.player.money = 10; check(/모자란다/.test(act(p, 'ld_pass')), '돈이 모자라면');
  const elf = mk(13); grown(elf, 20); me(elf).race = 'elf'; stay(elf, 'silverleaf');
  check(gateOpen(elf, 'iela') && !has(elf, 'ld_pass'), '엘프에겐 처음부터 열려 있다');
  const dw = adult('hammer'); check(has(dw, 'ld_pass') && !gateOpen(dw, 'grondar'), '그론다르 철문');
  me(dw).race = 'dwarf'; check(gateOpen(dw, 'grondar'), '드워프에겐 열린다');
}
// 8. 그 고장에서 나고 자라는 사람
{
  const g = adult('garum');
  for (let i = 0; i < 2; i++) endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: 'rest' })));
  while (g.pendingEvent) resolveEvent(g, rngOf(g), 0);
  const ids = L(g).placeNpcs.garum ?? [];
  check(ids.length >= 4, `대족장의 언덕 사람들 (${ids.length})`);
  const first = byId(g, ids[0]); first.known = true; first.alive = false;
  const races = ids.map((x) => byId(g, x)?.race).filter(Boolean);
  check(races.includes('beast'), '수인 고장엔 수인이 산다');
  g.date.month = 12; L(g).queue = []; endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: 'rest' })));
  while (g.pendingEvent) resolveEvent(g, rngOf(g), 0);
  const nw = byId(g, L(g).placeNpcs.garum[0]);
  check(nw && nw.alive && nw.born === 'garum' && nw.id !== first.id, '그 고장에서 다음 사람이 자랐다');
  check(S(g).log.some((x) => /자리를/.test(x.text)), '고장 기록에 남는다');
}
// 9. 화면, 저장, 옛 저장, 대 잇기
{
  const g = adult('stein'); runHooks('afterActions', g, makeRng({ s: 1 }), []); S(g).pass.iela = true;
  const info = landsInfo(g);
  check(info.here?.name === '슈타인 군항' && info.lands.length === LAND_IDS.length && info.passes.length === 1, '고장 정보');
  textOK([info.here.speech, info.here.size, ...info.lands.flatMap((x) => [x.name, x.realm, x.kind, x.size])], '정보');
  textOK([landsLine(g)], '한 줄'); check(landsLine(adult('ern')) === '', '옛 고장엔 한 줄이 없다');
  S(g).pop.stein = 77;
  const back = decodeSave(encodeSave(g)); check(back.lands.pop.stein === 77 && back.lands.pass.iela, '저장 왕복');
  const old = structuredClone(g); delete old.lands; runHooks('migrate', old); check(old.lands.pop.stein === LANDS.stein.pop && old.lands.seen.length === 0, '옛 저장');
  runHooks('migrate', g); check(PLACES.stein.kind !== LANDS.stein.kind || sizeWord(77) === '', '불러오면 지금 판 크기로 맞춘다');
  runHooks('heir', g); check(!g.lands.pass.iela && g.lands.pop.stein === 77, '대를 이으면 허가는 사라지고 고장은 그대로');
}
// 10. 한 판 흐름 (새 고장을 돌며 30년)
{
  let work = 0, customs = 0, danger = 0, seen = 0;
  for (let s = 0; s < 2; s++) {
    const h = mk(151 + s); grown(h, 14);
    for (let m = 0; m < 12 * 30; m++) {
      if (h.over) { const hh = heirsOf(h)[0]; if (!hh) break; becomeHeir(h, rngOf(h), hh); if (h.over) break; }
      if (m % 18 === 0) stay(h, LAND_IDS[(m / 18 + s * 5) % LAND_IDS.length]);
      const acts = availableActions(h);
      const pick = (i) => (acts.find((x) => x.id === (i === 0 ? 'ld_work' : 'rest')) ?? acts.find((x) => x.id === 'rest') ?? acts[0]).id;
      const plan = Array.from({ length: slotsFor(h) }, (_, i) => ({ id: pick(i) }));
      work += plan.filter((x) => x.id === 'ld_work').length;
      endMonth(h, plan);
      let k = 0; while (h.pendingEvent && k++ < 6) { if (L(h).scene?.kind === 'ld_custom') customs++; if (h.pendingEvent.id === 'ld_danger') danger++; resolveEvent(h, rngOf(h), 0); }
    }
    seen += S(h).seen.length;
    textOK(S(h).log.map((x) => x.text), '30년 기록');
  }
  check(work > 100 && customs >= 4 && seen >= 20, `한 판 (일 ${work}, 풍습 ${customs}, 위험 ${danger}, 들른 고장 ${seen})`);
  console.log(`  30년×2: 일 ${work}, 풍습 ${customs}, 위험 ${danger}, 들른 고장 ${seen}`);
}
console.log(`landstest ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
