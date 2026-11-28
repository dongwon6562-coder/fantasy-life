import './lsshim.js';
import '../src/content.js';

// 50단계 숲의 마녀와 민간 주술 점검 (도우미스레드3). 1분 안.
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
import { PS } from '../src/politics/state.js';
import { witchInfo, witchLine } from '../src/witch/index.js';
import { WS, CHARMS, CHARM_IDS, liveWise, wiseAt, witchPlace, isWitch } from '../src/witch/state.js';
import { witchMonth, npcHunt, newWise, FEED as WFEED } from '../src/witch/world.js';
import { faithState } from '../src/faith/index.js';
import { PLACES } from '../src/places.js';

const mk = (seed = 50, fam = 'farmer', sex = 'f') => newGame({ name: '마르타', sex, familyId: fam, mode: 'free', seed });
const witchAt = (g, place) => wiseAt(g, place) ?? newWise(g, makeRng({ s: 9 }), place, { kind: 'true' });
const adult = (seed = 50, place = 'ern') => { const g = mk(seed); grown(g, 22); stay(g, place); g.player.injuries = []; L(g).queue = []; g.player.money = 200; return g; };
const kid = (seed = 50, place = 'ern', y = 9) => { const g = mk(seed); grown(g, y); stay(g, place); L(g).queue = []; return g; };
const textOK = (arr, what) => { for (const t of arr) check(typeof t === 'string' && !BAD.test(t), `${what}: ${t}`); };
const monthHooks = (g, seed = 2) => { for (const f of HOOKS.afterMonth) f(g, makeRng({ s: seed })); };
const infoOK = (g, what) => {
  const I = witchInfo(g);
  check(!!I && Array.isArray(I.wise) && Array.isArray(I.me.known), `${what}: 정보 모양`);
  textOK([I.line ?? '', I.me.rank, I.me.loreWord, I.realm, I.tower, I.faith, I.kin, ...I.news.map((x) => x.text), ...I.me.log.map((x) => x.text), ...I.wise.map((w) => `${w.name}${w.placeName}${w.word}${w.lineage}`), ...I.hunts.map((h) => `${h.placeName}${h.name}${h.outcome}`), ...I.heat.map((h) => h.word)], `${what} 정보`);
  return I;
};

// 1. 처음 판: 마을 끝 노파들이 사람 나라의 마을에 산다
{
  const g = mk(50);
  const W = WS(g);
  check(liveWise(g).length >= 6, `처음 마녀 수 ${liveWise(g).length}`);
  check(liveWise(g).every((w) => witchPlace(w.place)), '마녀는 사람 나라 마을에만');
  check(!!wiseAt(g, 'ern'), '에른 마을에도 노파가 있다');
  infoOK(g, '처음');
}

// 2. 무플레이 백 년: 늙고, 대를 잇고, 흉한 해에는 쫓긴다
{
  let hunts = 0, heirs = 0, born = 0;
  for (const seed of [33, 45]) {
    const g = mk(seed); grown(g, 25);
    for (let m = 0; m < 12 * 100 && !g.over; m++) { g.pendingEvent = null; L(g).scene = null; L(g).queue.length = 0; endMonth(g, []); }
    const W = WS(g);
    hunts += W.tally.hunts; born += W.tally.born; heirs += W.log.filter((x) => /대 주술사가 되었다/.test(x.text)).length;
    check(liveWise(g).length >= 4 && liveWise(g).length <= 12, `백 년 뒤 마녀 수 ${liveWise(g).length}`);
    textOK(W.log.map((x) => x.text), '세상 기록');
    infoOK(g, `백 년(${seed})`);
  }
  check(hunts >= 3, `백 년 두 판에 마녀사냥 ${hunts}`);
  check(heirs >= 2 && born >= 10, `대 잇기 ${heirs}, 새 마녀 ${born}`);
}

// 3. 어린 날: 할머니의 부적, 마을 끝 오두막
{
  const g = kid(51, 'ern', 9); WS(g).me.gran = true;
  monthHooks(g);
  check(queued(g, 'wi_gran'), '할머니 집안 아이에게 부적 장면');
  scene(g, 'wi_gran', 'learn');
  check(WS(g).me.known.amulet === 1, '집안 부적을 배운다');
  const k = kid(52, 'ern', 8); const w = witchAt(k, 'ern');
  queueScene(k, 'wi_hut', { w: w.id, n: 0 });
  scene(k, 'wi_hut', 'help');
  check(w.met === 1 && WS(k).me.lore >= 2, '오두막 바구니');
  for (const n of [1, 2]) { queueScene(k, 'wi_hut', { w: w.id, n }); scene(k, 'wi_hut', n === 1 ? 'peek' : 'none'); }
  // 아이는 배우기·의뢰·사냥 행동이 없다
  check(!has(k, 'wi_learn') && !has(k, 'wi_client'), '여덟 살은 주술 행동이 없다');
}

// 4. 노파에게 배우기와 가르침
{
  const g = adult(53, 'ern'); const w = witchAt(g, 'ern');
  check(has(g, 'wi_learn'), '어른은 노파에게 배울 수 있다');
  act(g, 'wi_learn'); scene(g, 'wi_learn', 'silver');
  check(WS(g).me.teacher === w.id && WS(g).me.known.amulet, '제자가 된다');
  check(!has(g, 'wi_learn'), '같은 스승에게 또 청하지 않는다');
  WS(g).me.lore = 20;
  let learned = false;
  for (let s = 1; s < 12 && !learned; s++) { queueScene(g, 'wi_lesson', { w: w.id, charm: 'birth', secret: false }); scene(g, 'wi_lesson', 'learn', s); learned = !!WS(g).me.known.birth; }
  check(learned, '해산 돕기를 배운다');
  queueScene(g, 'wi_lesson', { w: w.id, charm: 'love', secret: false }); scene(g, 'wi_lesson', 'show');
  queueScene(g, 'wi_lesson', { w: w.id, charm: 'weather', secret: false }); scene(g, 'wi_lesson', 'none');
  w.kind = 'fraud'; queueScene(g, 'wi_lesson', { w: w.id, charm: null, secret: true }); scene(g, 'wi_lesson', 'trick');
  check(WS(g).me.secret && WS(g).me.slick > 0, '노파의 속내');
  // 가르침 고리: 넉 달 지나면 언젠가 온다
  let got = false;
  for (let i = 0; i < 40 && !got; i++) { g.date.year += 1; monthHooks(g, i); got = queued(g, 'wi_lesson'); }
  check(got, '스승이 가르침을 준다');
  for (const k of ['hen', 'labor', 'none']) { const h = adult(54, 'ern'); witchAt(h, 'ern'); act(h, 'wi_learn'); scene(h, 'wi_learn', k); }
}

// 5. 마을 사람들의 부탁: 진짜, 속임수, 거절, 저주
{
  const g = adult(55, 'ern'); const M = WS(g).me;
  M.lore = 40; M.known = { amulet: 2, find: 1, birth: 2, love: 1, weather: 1, uncurse: 1, hex: 1 };
  check(has(g, 'wi_client'), '주술을 아는 어른은 손님을 받는다');
  act(g, 'wi_client');
  check(queued(g, 'wi_client'), '손님 장면');
  check(!has(g, 'wi_client'), '손님은 두 달에 한 번');
  L(g).queue = [];
  const f0 = faithState(g).suspicion;
  for (const charm of CHARM_IDS) for (const key of CHARMS[charm].dark ? ['hex', 'trick', 'none'] : ['real', 'trick', 'none']) {
    for (const s of [1, 2, 3]) { queueScene(g, 'wi_client', { charm, who: s % 3 }); scene(g, 'wi_client', key, s * 7 + charm.length); }
  }
  check(M.clients > 10 && M.fraud > 0 && M.hexes > 0, `손님 ${M.clients}, 속임수 ${M.fraud}, 저주 ${M.hexes}`);
  check(faithState(g).suspicion > f0, '주술은 사제의 눈길을 끈다');
  check(M.look.ern != null && isWitch(g), '마을의 눈길이 생긴다');
  // 서쪽 제국에서 들킨 속임수는 법정으로 간다
  const v = adult(56, 'stein'); WS(v).me.known = { love: 1 }; WS(v).me.lore = 20; WS(v).me.fraud = 12;
  let court = false;
  for (let s = 1; s < 30 && !court; s++) { queueScene(v, 'wi_client', { charm: 'love', who: 0 }); scene(v, 'wi_client', 'trick', s); court = queued(v, 'law_trial'); }
  check(court, '제국에서는 속임수 장사로 고발당한다');
  infoOK(g, '의뢰 뒤');
}

// 6. 마탑의 비웃음, 교단의 경고
{
  for (const [by, keys] of [['tower', ['retort', 'show', 'none']], ['priest', ['church', 'retort', 'none']]]) for (const k of keys) {
    const g = adult(57, 'ern'); WS(g).me.lore = 40; WS(g).me.known = { birth: 2, amulet: 1 };
    queueScene(g, 'wi_scorn', { by }); scene(g, 'wi_scorn', k);
  }
  const g = adult(58, 'ern'); WS(g).me.lore = 30; WS(g).me.known = { amulet: 1, find: 1 }; WS(g).me.look.ern = 50;
  let got = false;
  for (let i = 0; i < 80 && !got; i++) { g.date.year += 1; monthHooks(g, i); got = queued(g, 'wi_scorn'); }
  check(got, '주술사는 언젠가 사제의 경고를 듣는다');
}

// 7. 흉년의 횃불: 내게 오는 마녀사냥
{
  for (const k of ['plead', 'flee', 'trial', 'bribe', 'none']) {
    const g = adult(59, 'ern'); WS(g).me.lore = 30; WS(g).me.known = { amulet: 1, birth: 1 }; WS(g).me.look.ern = 40; WS(g).me.hexes = 1;
    queueScene(g, 'wi_hunt', { pl: 'ern' }); scene(g, 'wi_hunt', k);
    check(WS(g).hunts.some((h) => h.me), `내 마녀사냥 기록 (${k})`);
    if (k === 'trial') check(queued(g, 'law_trial'), '재판을 받겠다고 하면 법정으로 간다');
  }
  // 흉년이 들면 세상이 횃불을 든다
  const g = adult(60, 'ern'); const M = WS(g).me; M.lore = 30; M.known = { amulet: 1, birth: 1 }; M.look.ern = 30;
  let fired = false;
  WFEED.me = ((orig) => (gg, pl) => { fired = true; orig(gg, pl); })(WFEED.me);
  for (let i = 0; i < 120 && !fired; i++) { WS(g).heat.ern = 90; g.world.famine = true; g.date.month = 2 + (i % 10); g.date.year += 1; witchMonth(g, () => {}); }
  check(fired && queued(g, 'wi_hunt'), '흉년의 마을은 아는 주술사를 찾아온다');
  // 아이는 횃불 장면을 받지 않는다
  const k = kid(61, 'ern', 12); WS(k).me.lore = 20; WS(k).me.known = { amulet: 1, find: 1 }; WS(k).me.look.ern = 10;
  WFEED.me(k, 'ern');
  check(!queued(k, 'wi_hunt'), '열두 살에게는 마녀사냥 장면이 없다');
  // NPC 마녀사냥 갈래
  const n = mk(62); const seen = new Set();
  for (let s = 1; s < 80; s++) { const w = newWise(n, makeRng({ s }), ['ern', 'abel', 'stein'][s % 3], { kind: ['true', 'half', 'fraud'][s % 3] }); w.trust = 30 + (s * 7) % 50; seen.add(npcHunt(n, makeRng({ s: s * 3 }), w, () => {})); }
  check(seen.size >= 6, `마녀사냥 갈래 ${[...seen]}`);
  textOK(WS(n).log.map((x) => x.text), 'NPC 마녀사냥 글');
}

// 8. 오늘의 장면 한 줄
{
  const g = adult(63, 'ern'); witchAt(g, 'ern');
  WS(g).heat.ern = 50;
  const a = witchLine(g), b = witchLine(g);
  check(typeof a === 'string' && !BAD.test(a) && a === b, `한 줄: ${a}`);
  g.date.month = g.date.month % 12 + 1;
  check(witchLine(g) !== a || witchLine(g) == null, '같은 말을 다음 달에 되풀이하지 않는다');
}

// 9. 저장 왕복과 대 잇기, 예전 판, 짧은 플레이
{
  const g = adult(64, 'ern'); const M = WS(g).me; M.lore = 60; M.known = { amulet: 3, birth: 2, hex: 2 }; M.fame = 40;
  const back = decodeSave(encodeSave(g));
  check(JSON.stringify(back.witch) === JSON.stringify(g.witch), '저장 왕복');
  for (const f of HOOKS.heir) f(g, makeRng({ s: 1 }), g.player);
  check(M.lineage?.gen === 2 && M.known.amulet === 1 && M.known.birth === 1 && !M.known.hex && M.lore === 12, `대 잇기: ${JSON.stringify(M.known)} ${M.lore}`);
  infoOK(g, '대 잇기 뒤');
  const o = mk(91); delete o.witch; runHooks('migrate', o);
  check(liveWise(o).length >= 6, '예전 판에도 마녀가 생긴다');
  const p = mk(92); grown(p, 18); stay(p, 'ern'); witchAt(p, 'ern'); p.player.money = 100;
  for (let m = 0; m < 12 * 8 && !p.over; m++) {
    const acts = availableActions(p), rng = rngOf(p), ch = [];
    for (let i = 0; i < slotsFor(p); i++) { const pool = acts.filter((a) => /^wi_|rest|work|herb/.test(a.id)); ch.push({ id: rng.pick(pool.length ? pool : acts).id }); }
    endMonth(p, ch);
    for (let k = 0; k < 6 && p.pendingEvent; k++) {
      const pe = p.pendingEvent;
      check(!BAD.test(pe.text) && !BAD.test(pe.title), `플레이 글: ${pe.title} / ${pe.text}`);
      const out = resolveEvent(p, rngOf(p), rngOf(p).int(0, pe.choices.length - 1));
      check(!BAD.test(String(out)), `플레이 결과: ${out}`);
    }
  }
  check(WS(p).me.teacher || WS(p).me.lore > 0, '짧은 플레이에서 주술을 배운다');
  infoOK(p, '플레이 뒤');
}

console.log(fail ? `witchtest: 실패 ${fail}` : `witchtest: 통과 (${Date.now() - T0}ms)`);
process.exit(fail ? 1 : 0);
