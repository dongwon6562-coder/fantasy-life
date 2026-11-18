import './lsshim.js';
import '../src/content.js';
// 마물의 땅 점검: 처음 상태, 달마다 기세·둥지·떼, 버려진 마을과 돌아오는 사람들, 현상금, 부산물 시세, 시대의 새 마물,
// 사냥·둥지 치기·팔기·되찾기, 사건들(떼·피난민·다시 세우기·연금술사), 해마다 몫, 예전 저장, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { makePerson, byId } from '../src/npc.js';
import { crimeState } from '../src/crime.js';
import { wildsState as WS, wildsInfo, wildsLine, wildsMonth, kindsAt, partPrice, KINDS } from '../src/wilds/index.js';

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
  g.pendingEvent = { id, title: e.title, text, choices: e.choices.map((c) => c.label), choiceIdx: e.choices.map((c, i) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; for (const k of Object.keys(g.player.stats)) g.player.stats[k] = Math.max(g.player.stats[k], 35); g.date.year += y; (g.flags ??= {}).adult = true; };
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
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  return out;
};
const month = (g) => { for (const p of g.people) if (p.alive) p.ageMonths += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; runHooks('afterMonth', g, makeRng({ s: 2 })); };
const child = (g, ageY) => { const p = makePerson(makeRng({ s: ageY + 40 }), { sex: 'f', ageMonths: ageY * 12, lastName: '아이' }); p.place = L(g).place; p.alive = true; g.people.push(p); byId(g, g.player.id).childIds.push(p.id); p.motherId = g.player.id; return p; };
const fresh = (seed, name = '사냥꾼', fam = 'merchant') => newGame({ name, sex: 'm', familyId: fam, mode: 'free', seed });



const setStats = (g, v) => { for (const k of Object.keys(g.player.stats)) g.player.stats[k] = v; };
const hunter = (seed, place = 'ern', v = 90) => { const g = fresh(seed); grown(g); stay(g, place); setStats(g, v); g.player.skills.sword = v; g.player.money = 200; g.player.familyMoney = 0; g.player.injuries = []; return g; };
const ticks = (g, n, until = () => false) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; wildsMonth(g); if (until()) return i + 1; } return n; };
const okInfo = (g) => check(!BAD.test(JSON.stringify(wildsInfo(g)).replace(/null/g, '0')) && !BAD.test(wildsLine(g)), `화면 정보: ${JSON.stringify(wildsInfo(g)).slice(0, 300)}`);

// 1) 처음
{
  const g = fresh(1901);
  const S = WS(g);
  check(Object.keys(S.land).length === 20 && Object.values(S.hamlets).every((h) => h.state === 'lived'), '처음 땅과 마을');
  check(S.seen.includes('goblin') && !S.seen.includes('chimera'), '처음엔 옛 마물만');
  okInfo(g);
  check(!has(g, 'wilds_hunt'), '아이는 사냥을 못 한다');
}
// 2) 기세가 오르면 둥지가 생기고 자라며, 떼가 옮겨 간다
{
  const g = fresh(1902); grown(g); g.realm.monsters = 95;
  const S = WS(g);
  for (const s of Object.values(S.land)) s.level = 85;
  const n = ticks(g, 240, () => Object.values(S.land).some((s) => s.nest && s.nest.size >= 3) && S.herds.length > 0);
  check(Object.values(S.land).some((s) => s.nest), `둥지가 생긴다 (${n}달)`);
  check(S.herds.length > 0, '떼가 옮겨 간다');
  check(S.bounties.some((b) => b.nest), '둥지 현상금');
  check(S.bounties.some((b) => !b.nest), '사냥 현상금');
  okInfo(g);
}
// 3) 버려진 마을과 돌아오는 사람들
{
  const g = fresh(1903); grown(g); stay(g, 'harfen'); g.realm.monsters = 100;
  const S = WS(g); S.land.ern.level = 95;
  ticks(g, 120, () => S.hamlets.hazel.state === 'abandoned');
  check(S.hamlets.hazel.state === 'abandoned', `개암나무골이 버려진다 (${S.hamlets.hazel.pop})`);
  g.realm.monsters = 0; for (const s of Object.values(S.land)) { s.level = 5; s.nest = null; }
  ticks(g, 300, () => S.hamlets.hazel.state === 'lived');
  check(S.hamlets.hazel.state === 'lived', `사람들이 돌아와 다시 마을이 된다 (${S.hamlets.hazel.state})`);
  check(S.log.some((l) => /버려졌다/.test(l.text)) && S.log.some((l) => /돌아오기/.test(l.text)), '기록');
}
// 4) 부산물 시세: 들끓으면 싸고, 잠잠하면 비싸다. 세레니아가 비싸게 산다.
{
  const g = fresh(1904); const S = WS(g);
  for (const s of Object.values(S.land)) s.level = 90;
  ticks(g, 1);
  const cheap = partPrice(g, 'wyvern', 'serenia');
  for (const s of Object.values(S.land)) s.level = 5;
  ticks(g, 1);
  const dear = partPrice(g, 'wyvern', 'serenia');
  check(dear > cheap, `시세 ${cheap} → ${dear}`);
  check(partPrice(g, 'wyvern', 'serenia') > partPrice(g, 'wyvern', 'ern'), '세레니아가 에른보다 비싸다');
}
// 5) 시대가 바뀌면 새 마물
{
  const g = fresh(1905); g.realm.era = 3;
  const out = wildsMonth(g);
  check(['iron_eater', 'mana_hound', 'chimera'].every((k) => WS(g).seen.includes(k)), '새 마물이 나타난다');
  check(out.some((n) => /키메라|사자의 머리/.test(n.text) && n.big), '새 마물 소식');
  for (const s of Object.values(WS(g).land)) s.level = 95;
  check(kindsAt(g, 'estella').includes('chimera'), '폐허에 키메라');
}
// 6) 마물 사냥: 이기면 부산물과 현상금, 고장이 조용해진다. 지면 다친다.
{
  const g = hunter(1906); const S = WS(g); S.land.ern.level = 50;
  check(has(g, 'wilds_hunt'), '사냥 행동');
  for (const k of kindsAt(g, 'ern')) S.bounties.push({ id: 900 + k.length, place: 'ern', kind: k, reward: 7, until: 99999, nest: false });
  const m0 = g.player.money;
  const out = act(g, 'wilds_hunt', 11);
  check(Object.values(S.parts).some((n) => n > 0), `부산물: ${out}`);
  check(S.land.ern.level < 50 && g.player.money === m0 + 7 && S.rec.bounties === 1, `현상금과 줄어든 기세: ${out}`);
  const w = hunter(1907, 'ern', 5); WS(w).land.ern.level = 90;
  let hurt = 0; for (let i = 0; i < 8; i++) { w.player.injuries = []; act(w, 'wilds_hunt', 20 + i); if (w.player.injuries.length) hurt++; }
  check(hurt >= 2, `약하면 다치거나 물러난다 (${hurt}/8)`);
}
// 7) 둥지 치기
{
  const g = hunter(1908); const S = WS(g); S.land.ern.level = 70; S.land.ern.nest = { kind: 'direwolf', size: 4, at: 0 };
  S.bounties.push({ id: 950, place: 'ern', kind: 'direwolf', reward: 50, until: 99999, nest: true });
  check(has(g, 'wilds_nest'), '둥지 치기 행동');
  act(g, 'wilds_nest');
  const m0 = g.player.money;
  scene(g, 'wilds_nest', 'hire', 12);
  check(!S.land.ern.nest && S.rec.nests === 1 && g.player.money === m0 - 30 + 50, `둥지를 쳤다 ${g.player.money - m0}`);
  check(S.land.ern.level <= 45 && (S.parts.direwolf ?? 0) >= 3, '둥지의 부산물과 조용해진 고장');
  check(g.chronicle.some((c) => /둥지를 치다/.test(c.text)), '연대기');
  const w = hunter(1909, 'ern', 5); WS(w).land.ern.nest = { kind: 'troll', size: 9, at: 0 }; w.player.money = 0;
  queueScene(w, 'wilds_nest', { place: 'ern' });
  scene(w, 'wilds_nest', 'charge', 13);
  check(!!WS(w).land.ern.nest && w.player.injuries.length > 0, '약하면 둥지에서 다친다');
}
// 8) 부산물 팔기
{
  const g = hunter(1910, 'serenia'); const S = WS(g); S.parts = { wyvern: 2, goblin: 5 };
  const expect = 2 * partPrice(g, 'wyvern', 'serenia') + 5 * partPrice(g, 'goblin', 'serenia');
  const m0 = g.player.money;
  check(has(g, 'wilds_sell'), '팔기 행동');
  act(g, 'wilds_sell');
  check(g.player.money === m0 + expect && !Object.keys(S.parts).length, `팔았다 ${g.player.money - m0}/${expect}`);
  check(!has(g, 'wilds_sell'), '팔 것이 없으면 행동도 없다');
}
// 9) 버려진 마을 되찾기
{
  const g = hunter(1911); const S = WS(g); S.hamlets.hazel = { pop: 0, state: 'abandoned', since: 0, stake: false }; S.land.ern.level = 40;
  check(has(g, 'wilds_reclaim'), '되찾기 행동');
  act(g, 'wilds_reclaim', 14);
  check(S.hamlets.hazel.state === 'returning' && S.rec.reclaimed === 1, '되찾았다');
  S.land.ern.level = 80;
  check(!has(g, 'wilds_reclaim'), '들끓으면 되찾을 수 없다');
}
// 10) 사건들
{
  const g = hunter(1912); const S = WS(g); const now = g.date.year * 12 + g.date.month;
  S.herds.push({ kind: 'orc', from: 'harfen', to: 'ern', at: now });
  check(cond(g, 'wilds_herd'), '떼가 몰려온다');
  fire(g, 'wilds_herd', 0, 15);
  check(!cond(g, 'wilds_herd'), '한 번만');
  S.hamlets.hazel = { pop: 0, state: 'abandoned', since: now, stake: false };
  check(cond(g, 'wilds_refugees'), '빈 마을에서 온 사람들');
  fire(g, 'wilds_refugees', 0);
  S.hamlets.hazel = { pop: 20, state: 'returning', since: now, stake: false };
  check(cond(g, 'wilds_settle'), '다시 세우는 마을');
  g.player.money = 50; fire(g, 'wilds_settle', 0);
  check(S.hamlets.hazel.stake && g.player.money === 30, '은화를 보탰다');
  S.hamlets.hazel.state = 'lived';
  g.date.month = 12; month(g);
  check(g.player.money === 35, `해마다 몫 ${g.player.money}`);
  S.parts = { troll: 2 };
  check(cond(g, 'wilds_buyer'), '연금술사');
  fire(g, 'wilds_buyer', 0);
  check(!S.parts.troll && g.player.money > 35, '연금술사에게 팔았다');
}
// 11) 예전 저장
{
  const g = fresh(1913); delete g.wilds;
  runHooks('migrate', g, makeRng({ s: 1 }));
  check(!!g.wilds && Object.keys(g.wilds.land).length === 20 && g.wilds.rec.hunts === 0, '예전 저장을 채운다');
  const h = fresh(1914); delete h.wilds.land.gorge; delete h.wilds.hamlets.hazel;
  runHooks('migrate', h, makeRng({ s: 1 }));
  check(!!h.wilds.land.gorge && !!h.wilds.hamlets.hazel, '빠진 고장과 마을을 채운다');
}
// 12) 40년 플레이
{
  let years = 0, hunts = 0, nests = 0, abandoned = 0;
  const seen = {};
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '평생', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 1997 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('wilds_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.5) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) { const kind = L(g).scene?.kind ?? g.pendingEvent.id; seen[kind] = (seen[kind] ?? 0) + 1; check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title) && g.pendingEvent.choices.every((c) => !BAD.test(c)), `장면 글 ${kind}: ${g.pendingEvent.text}`); resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1))); }
      for (const r of g.lastResults ?? []) if (BAD.test(r.text)) { check(false, `결과 글 ${r.name}: ${r.text}`); break; }
      for (const s of Object.values(WS(g).land)) if (!Number.isFinite(s.level) || s.level < 0 || s.level > 100) { check(false, `기세 값 ${s.level}`); break; }
    }
    years += m / 12; hunts += WS(g).rec.hunts; nests += Object.values(WS(g).land).filter((s) => s.nest).length; abandoned += Object.values(WS(g).hamlets).filter((h) => h.state !== 'lived').length;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of WS(g).log) if (BAD.test(l.text)) { check(false, `마물 기록 이상: ${l.text}`); break; }
    for (const n of g.news ?? []) if (BAD.test(n.text)) { check(false, `소식 글 이상: ${n.text}`); break; }
    okInfo(g);
  }
  console.log(`마물의 땅 ${Math.round(years)}년 4판 플레이, 사냥 ${hunts}번, 끝에 둥지 ${nests}개, 빈 마을 ${abandoned}곳, 장면 ${Object.keys(seen).filter((k) => k.startsWith('wilds_')).join(',')}`);
  check(hunts > 0, '40년 동안 사냥을 한 번도 안 했다');
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
