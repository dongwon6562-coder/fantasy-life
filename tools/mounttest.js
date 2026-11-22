import './lsshim.js';
import '../src/content.js';
// 하늘의 짐승 기수 점검 (1분 안): 둥지 알기·둥지 오르기, 알 사기, 알 품기와 식음, 깨어남, 사나워지는 해, 등에 오르기(떨어짐),
// 하늘길, 전령, 잿빛 날개대(기사단 공적), 원정, 이웃의 두려움, 마지막 비행, 무덤, 대 잇기와 시험, 세상 쪽 둥지·날개대, 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, circleOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { makePerson, byId, bodyAgeOf, ageYears } from '../src/npc.js';
import { becomeHeir } from '../src/heir.js';
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
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); return out; };
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
import { mountState as MS, mountInfo, mountLine, mountMonth, skyOf, rideable, SKY_INFO, NESTS } from '../src/mount/index.js';
import { B, KINDS, addAnimal, alive } from '../src/beasts/core.js';
import { OS } from '../src/order/core.js';

const adult = (seed, age = 30, place = 'graubel') => {
  const g = newGame({ name: '멈춤', sex: 'm', familyId: 'farmer', mode: 'free', seed });
  grown(g, age); stay(g, place);
  for (const k of Object.keys(g.player.stats)) g.player.stats[k] = 50;
  g.player.money = 3000; g.player.injuries = []; L(g).pendingDeath = null; L(g).queue = [];
  return g;
};
const tick = (g) => { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; };
const sky = (g, kind = 'wyvern', age = 8, flight = 100) => { const a = addAnimal(g, kind, { ageYears: age, trained: 100, bond: 70 }); skyOf(g, a).flight = flight; return a; };

/* 1. 둥지를 알고 오른다 */
{
  const g = adult(3201, 28, 'gorge'); g.date.month = 4;
  check(KINDS.griffin?.ride === 2, '그리폰이 짐승 표에 있음');
  check(!has(g, 'mount_nest'), '둥지를 모르면 오르지 않음');
  check(cond(g, 'mount_nest_seen'), '둥지 고장에서 그림자');
  stay(g, 'ern'); check(!cond(g, 'mount_nest_seen'), '아무 데서나 안 뜸'); stay(g, 'gorge');
  fire(g, 'mount_nest_seen', 1);
  check(MS(g).nests.wy_gorge.known && has(g, 'mount_nest'), '알면 둥지에 오름');
  g.date.month = 10; check(!has(g, 'mount_nest'), '봄이 아니면 알이 없음'); g.date.month = 4;
  let got = 0, hurt = 0;
  for (let i = 0; i < 10 && MS(g).eggs.length < 2 && MS(g).nests.wy_gorge.eggs > 0; i++) {
    g.player.stats.sen = 95; g.player.stats.wil = 95; g.player.injuries = []; g.player.fatigue = 0;
    act(g, 'mount_nest'); scene(g, 'mount_nest', i % 2 ? 'climb' : 'wait', 30 + i);
    got = MS(g).eggs.length; hurt += g.player.injuries.length ? 1 : 0;
  }
  check(got >= 1, `둥지에서 알을 얻음 ${got}`);
  check(MS(g).nests.wy_gorge.anger > 0, '알을 잃은 어미가 성냄');
  // 어미에게 지면 다침
  const g2 = adult(3202, 28, 'hammer'); g2.date.month = 4; MS(g2).nests.gr_hammer.known = true;
  for (const k of Object.keys(g2.player.stats)) g2.player.stats[k] = 5;
  act(g2, 'mount_nest'); scene(g2, 'mount_nest', 'climb', 3);
  check(g2.player.injuries.length >= 1 && MS(g2).eggs.length === 0, '약하면 다치고 빈손');
}

/* 2. 알 사기, 품기, 식음, 깨어남 */
{
  const g = adult(3211, 30, 'portel');
  check(cond(g, 'mount_egg_seller'), '항구에서 알 장수');
  let bought = 0;
  for (let s = 1; s <= 6 && !MS(g).eggs.length; s++) { g.player.money = 3000; fire(g, 'mount_egg_seller', 0, s); bought++; }
  check(MS(g).eggs.length === 1 && MS(g).eggs[0].kind === 'griffin', '그리폰 알을 삼');
  fire(g, 'mount_egg_seller', 2);
  check(has(g, 'mount_brood'), '알이 있으면 품기');
  act(g, 'mount_brood'); check(!has(g, 'mount_brood'), '한 달에 한 번');
  mountMonth(g); tick(g);
  check(MS(g).eggs[0].warm === 100 && MS(g).eggs[0].prog === 1, '품은 달엔 따뜻함');
  // 식음
  const g2 = adult(3212, 30, 'ern'); MS(g2).eggs.push({ id: 9, kind: 'wyvern', from: 'gorge', got: 0, prog: 1, warm: 100, by: 1 });
  for (let i = 0; i < 3; i++) { mountMonth(g2); tick(g2); }
  check(MS(g2).eggs.length === 0, '세 달 안 품으면 식어 죽음');
  // 깨어남
  for (let i = 0; i < 8 && MS(g).eggs.length; i++) { act(g, 'mount_brood', 10 + i); mountMonth(g); tick(g); }
  check(queued(g, 'mount_hatch'), '다 품으면 깨어남 장면');
  scene(g, 'mount_hatch', 'keep');
  const a = alive(g).find((x) => x.kind === 'griffin');
  check(a && skyOf(g, a).hatchedBy === '멈춤' && a.bond >= 40, '내가 품어 깨운 새끼는 정이 깊음');
  check(MS(g).me.hatched === 1, '깬 수');
  check(typeof mountLine(g) === 'string' && /날고기/.test(mountLine(g)), `새끼 한 줄 ${mountLine(g)}`);
  // 파는 쪽
  const g3 = adult(3213, 30, 'ern'); queueScene(g3, 'mount_hatch', { beast: 'wyvern', by: 4 }, { first: true });
  const m0 = g3.player.money; scene(g3, 'mount_hatch', 'sell');
  check(g3.player.money > m0 && !alive(g3).length, '새끼를 팖');
  // 날개대 알
  const g4 = adult(3214, 30, 'graubel'); MS(g4).me.member = { since: 0, rank: 1, sorties: 6 };
  check(cond(g4, 'mount_band_egg'), '날개대 알'); fire(g4, 'mount_band_egg', 0); check(MS(g4).eggs[0]?.kind === 'wyvern', '와이번 알을 삼');
}

/* 3. 사나워지는 해, 등에 오르기 */
{
  const g = adult(3221, 30, 'ern');
  const a = addAnimal(g, 'wyvern', { ageYears: 2, trained: 40, bond: 30 });
  check(cond(g, 'mount_juvenile'), '사나워지는 해');
  fire(g, 'mount_juvenile', 0, 2); fire(g, 'mount_juvenile', 1); fire(g, 'mount_juvenile', 2);
  check(!has(g, 'mount_fly'), '어리고 덜 길들면 못 오름');
  a.born -= 12 * 2; a.trained = 100;
  check(has(g, 'mount_fly'), '다 자라 길들면 등에 오름');
  let falls = 0;
  g.player.stats.agi = 80; g.player.skills.animals = 60;
  for (let i = 0; i < 40 && skyOf(g, a).flight < 100; i++) { act(g, 'mount_fly', 50 + i); g.player.injuries = g.player.injuries.filter((x) => !x.mortal); falls = skyOf(g, a).falls; g.player.fatigue = 0; }
  check(skyOf(g, a).flight >= 100 && rideable(g) === a, `하늘을 낢 ${skyOf(g, a).flight}`);
  check(!has(g, 'mount_fly'), '다 익히면 더 없음');
  check(falls >= 0, '떨어짐 셈');
  // 하늘길
  stay(g, 'ern'); L(g).travel = { to: 'graubel', left: 4, path: [] };
  HOOKS.afterActions[0](g);
  check(L(g).travel.left === 1, `하늘길은 한 달 ${L(g).travel.left}`);
  L(g).travel = { to: 'saltmare', left: 3, sea: true }; HOOKS.afterActions[0](g); check(L(g).travel.left === 3, '뱃길은 그대로');
  stay(g, 'ern');
  // 싸움 힘
  const p1 = playerPower(g); skyOf(g, a).flight = 50; const p0 = playerPower(g); skyOf(g, a).flight = 100;
  check(p1 > p0, '타고 나는 사람은 더 셈');
}

/* 4. 전령, 날개대, 기사단, 원정 */
{
  const g = adult(3231, 30, 'ern'); const a = sky(g, 'griffin', 9);
  check(!has(g, 'mount_courier'), '마을에선 전령 일 없음');
  stay(g, 'harfen'); check(has(g, 'mount_courier'), '고을에선 전령 일');
  const m0 = g.player.money; act(g, 'mount_courier'); check(g.player.money > m0, '전령 품삯');
  stay(g, 'graubel');
  check(has(g, 'mount_join') && !has(g, 'mount_sortie'), '날개대 들기');
  OS(g).me = { id: 'march', joined: 0, brothers: [] }; L(g).fac = { ...(L(g).fac ?? {}), march: { member: true, merit: 0, rank: 0 } };
  act(g, 'mount_join'); check(!!MS(g).me.member && L(g).fac.march.merit >= 10, '날개대에 들고 기사단 공적');
  check(has(g, 'mount_sortie') && !has(g, 'mount_join'), '출격');
  g.player.stats.str = 99; g.player.skills.sword = 90;
  for (let i = 0; i < 20 && MS(g).me.member && alive(g).includes(a); i++) { act(g, 'mount_sortie', 70 + i); g.player.injuries = []; g.player.fatigue = 0; }
  check(MS(g).me.member?.rank >= 1, `출격으로 계급 ${MS(g).me.member?.rank}`);
  check(L(g).fac.march.merit > 10, '출격 공적이 기사단으로');
  check(/날개대/.test(JSON.stringify(mountInfo(g).band)) || mountInfo(g).band.member, '정보에 날개대');
  act(g, 'mount_leave'); check(!MS(g).me.member, '떠남');
  // 원정
  g.army = { campaign: { name: '시험 원정', morale: 50, month: 0, months: 3 } };
  mountMonth(g); check(g.army.campaign.morale === 52 && g.army.campaign.skySeen, '원정에서 하늘 정찰');
  g.army = null;
  // 짐승을 잃으면 날개대에서 내려옴
  MS(g).me.member = { since: 0, rank: 0, sorties: 0 }; a.alive = false; B(g).animals = B(g).animals.filter((x) => x.alive); B(g).lost.push({ name: a.name, kind: 'griffin', year: g.date.year, how: '시험' });
  mountMonth(g); check(!MS(g).me.member && MS(g).graves.length === 1, '짐승을 잃으면 내려오고 무덤 장부');
}

/* 5. 이웃의 두려움, 마지막 비행, 대 잇기 */
{
  const g = adult(3241, 30, 'harfen'); const a = sky(g, 'wyvern', 6);
  check(cond(g, 'mount_fear'), '고을 사람들이 두려워함');
  fire(g, 'mount_fear', 0); check(MS(g).me.permit === g.date.year && !cond(g, 'mount_fear'), '허가를 내면 그해는 조용');
  MS(g).me.permit = 0; fire(g, 'mount_fear', 1); MS(g).me.permit = 0; fire(g, 'mount_fear', 2, 4);
  if (!alive(g).includes(a)) { B(g).animals.push(a); a.alive = true; }
  a.born -= 12 * 40;
  check(cond(g, 'mount_last_flight'), '늙은 짐승의 마지막 비행');
  fire(g, 'mount_last_flight', 0, 5);
  check(!cond(g, 'mount_last_flight'), '마지막 비행은 한 번');
  // 대 잇기
  const g2 = adult(3242, 40, 'ern'); const b = sky(g2, 'griffin', 10); MS(g2).me.member = { since: 0, rank: 2, sorties: 20 };
  MS(g2).eggs.push({ id: 7, kind: 'wyvern', from: 'gorge', got: 0, prog: 2, warm: 100, by: 2 });
  const kid = makePerson(makeRng({ s: 11 }), { ageMonths: 18 * 12, lastName: g2.player.lastName });
  g2.people.push(kid); me(g2).childIds.push(kid.id); g2.player.familyIds.push(kid.id); kid.known = true;
  (L(g2).ancestors ??= []).push({ name: g2.player.name, lastName: g2.player.lastName, born: g2.date.year - 40, died: g2.date.year });
  becomeHeir(g2, makeRng({ s: 5 }), kid);
  check(me(g2).id === kid.id, '대를 이음');
  check(!MS(g2).me.member && MS(g2).eggs.length === 1, '날개대 자리는 사람 몫, 알은 남음');
  const still = alive(g2).find((x) => x.id === b.id);
  if (still) {
    check(skyOf(g2, still).flight <= 50, '새 사람은 다시 오르는 법을 익혀야 함');
    stay(g2, 'ern'); grown(g2, 0);
    check(cond(g2, 'mount_heir_test'), '선대의 짐승이 시험');
    fire(g2, 'mount_heir_test', 1); fire(g2, 'mount_heir_test', 0, 9);
    check(!cond(g2, 'mount_heir_test'), '시험은 한 번');
  }
}

/* 6. 세상 쪽: 둥지와 날개대, 저장 왕복, 정보 */
{
  const g = adult(3251, 30, 'ern');
  const seen = new Set();
  for (let i = 0; i < 12 * 20; i++) { tick(g); mountMonth(g); if (g.date.month === 4) seen.add(MS(g).nests.gr_hammer.eggs); }
  check(MS(g).nests.wy_gorge.eggs === 0 || g.date.month < 8, '철 지나면 알 없음');
  check([...seen].some((x) => x > 0), '봄마다 알');
  check(MS(g).band.riders >= 3 && MS(g).band.riders <= 14, `날개대 수 ${MS(g).band.riders}`);
  const info = mountInfo(g);
  check(JSON.stringify(info).match(BAD0) === null, '정보에 빈 글 없음');
  check(mountLine(g) === null, '아무것도 없으면 한 줄 없음');
  stay(g, 'graubel'); check(/둥지 탑/.test(mountLine(g)), '날개대 고장 한 줄');
  const a = sky(g, 'wyvern', 7);
  const back = decodeSave(encodeSave(g)); runHooks('migrate', back, makeRng({ s: 1 }));
  check(back.beasts.animals.some((x) => x.kind === 'wyvern') && skyOf(back, back.beasts.animals.find((x) => x.kind === 'wyvern')).flight === 100, '저장 왕복');
  const gg = adult(3252, 30, 'ern'); addAnimal(gg, 'griffin', { ageYears: 3 });
  const b2 = decodeSave(encodeSave(gg)); delete b2.mount; runHooks('migrate', b2, makeRng({ s: 1 }));
  check(b2.mount?.nests?.gr_hammer && b2.beasts.animals.some((x) => x.kind === 'griffin'), '옛 저장에 채움, 그리폰 남음');
}

/* 7. 짧은 플레이 */
{
  let shown = 0;
  for (const seed of [32801, 32802]) {
    const g = newGame({ name: '바람', sex: seed % 2 ? 'm' : 'f', familyId: seed % 2 ? 'merchant' : 'farmer', mode: 'free', seed });
    for (let m = 0; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g), acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: rng.pick(acts).id })));
      let guard = 0;
      while (g.pendingEvent && guard++ < 6) {
        const pe = g.pendingEvent;
        if (/^mount/.test(L(g).scene?.kind ?? pe.id ?? '')) { shown++; check(!BAD.test(pe.text ?? '') && !pe.choices.some((c) => BAD.test(c)), `글 ${pe.title}: ${pe.text}`); }
        check(!BAD0.test(pe.text ?? ''), `글 ${pe.title}: ${pe.text}`);
        resolveEvent(g, rng, rng.int(0, pe.choices.length - 1));
      }
      const ln = mountLine(g); check(ln === null || !BAD.test(ln), `한 줄 ${ln}`);
      if (L(g).heirPending) break;
    }
  }
  console.log(`짧은 플레이에서 뜬 하늘 짐승 장면 ${shown}개`);
}

const sec = Math.round((Date.now() - T0) / 1000);
check(sec < (process.env.FL_PARALLEL ? 120 : 60), `1분 넘음 ${sec}초`);
console.log(fail ? `하늘 짐승 점검 실패 ${fail}` : `OK (${sec}초)`);
process.exit(fail ? 1 : 0);
