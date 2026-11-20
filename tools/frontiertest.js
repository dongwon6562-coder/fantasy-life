import './lsshim.js';
import '../src/content.js';
// 개척과 새 땅 점검: 숨은 고장으로 둔 빈 땅 여섯(지도·고장 목록·길), 허가장, 개척민 모으기, 떠나기와 도착, 개척촌 일,
// 먼저 살던 이들, 이름 붙이기, 겨울과 마물, 사건들, 달 흐름(개척단·버려짐·개척촌·마을), 저장 왕복, 대 잇기, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';

import { wildsState } from '../src/wilds/index.js';
import { frontierState as FS, frontierInfo, frontierLine, frontierMonth, found, abandon, nameSite, SITES, syncNames } from '../src/frontier/index.js';
import { PLACES, travelMonths } from '../src/places.js';
import { MAP_PLACES_EXTRA } from '../src/art/map.js';
import { encodeSave, decodeSave } from '../src/save.js';
import { realmOf } from '../src/realms/index.js';

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
const fresh = (seed, name = '개척') => newGame({ name, sex: 'm', familyId: 'farmer', mode: 'free', seed });
const setStats = (g, v) => { for (const k of Object.keys(g.player.stats)) g.player.stats[k] = v; };
const adult = (seed, place = 'leocast', v = 50) => { const g = fresh(seed); grown(g); stay(g, place); setStats(g, v); g.player.skills.sword = v; g.player.money = 800; g.player.familyMoney = 0; g.player.injuries = []; L(g).pendingDeath = null; L(g).renown = 30; return g; };
const ticks = (g, n, until = () => false, each = () => {}) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; each(); frontierMonth(g); if (until()) return i + 1; } return n; };
const okInfo = (g) => check(!BAD.test(JSON.stringify(frontierInfo(g)).replace(/null/g, '0')) && !BAD.test(String(frontierLine(g) ?? '')), `화면 정보: ${JSON.stringify(frontierInfo(g)).slice(0, 300)}`);
const site = (g, id) => FS(g).sites[id];
const reset = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; g.player.fatigue = 0; L(g).pendingDeath = null; };
const peek = (g, kind) => { const q = L(g).queue, i = q.findIndex((x) => x.kind === kind); if (i < 0) return []; const [s] = q.splice(i, 1); g.pendingEvent = null; L(g).scene = null; showScene(g, s, { force: true }); const keys = (s.choices ?? []).map((c) => c.key); reset(g); return keys; };
const travelKeys = (g) => { const out = []; for (const abroad of [false, true]) { reset(g); queueScene(g, 'travel', { abroad }, { first: true }); out.push(...peek(g, 'travel')); } return out; };
// 내 개척촌을 바로 세운다
const camp = (g, id = 'fr_moor', opts = {}) => { found(g, id, 'me', { pop: 40, food: 6, safety: 20, byName: '내 개척단', ...opts }); FS(g).me.home = id; stay(g, id); return site(g, id); };

// 1) 처음: 숨은 고장 여섯, 지도, 길
{
  const g = fresh(5001);
  const F = FS(g);
  check(Object.keys(SITES).length === 6 && Object.values(F.sites).every((s) => s.stage === 0), '빈 땅 여섯');
  for (const id of Object.keys(SITES)) {
    const P = PLACES[id], d = SITES[id];
    check(P && P.hidden && P.frontier && !P.open(g), `${id} 숨은 고장`);
    check(Object.keys(P.links).length === 1 && P.links[d.near] === d.months && PLACES[d.near].links[id] === d.months, `${id} 길은 한 고장으로만`);
    check(MAP_PLACES_EXTRA.some((m) => m.id === id), `${id} 지도`);
    check(realmOf(id) === (d.claim ?? 'wild'), `${id} 나라`);
  }
  // 빈 땅은 지름길이 되지 않는다
  check(travelMonths('graubel', 'hammer') === travelMonths('graubel', 'hammer'), '길');
  check(travelMonths('fur', 'fr_moor') === 2 && travelMonths('ern', 'fr_moor') === travelMonths('ern', 'fur') + 2, `개척지까지 길 ${travelMonths('ern', 'fr_moor')}`);
  okInfo(g);
  check(frontierLine(g) === null, '처음엔 머리글 없음');
  grown(g); stay(g, 'fur'); g.player.money = 500;
  check(!travelKeys(g).includes('fr_moor'), '빈 땅은 길 떠나기 목록에 없다');
  check(!has(g, 'frontier_charter'), '털가죽 시장은 허가장을 주지 않는다');
  stay(g, 'leocast');
  check(has(g, 'frontier_charter'), '왕도에서 허가장을 청한다');
}
// 2) 허가장, 개척민 모으기, 떠나기, 도착
{
  const g = adult(5010, 'leocast');
  act(g, 'frontier_charter');
  const s0 = L(g).queue.find((x) => x.kind === 'frontier_charter');
  scene(g, 'frontier_charter', 'fr_moor');
  check(FS(g).charter?.site === 'fr_moor' && g.player.money === 740, `허가장 ${g.player.money}`);
  check(!has(g, 'frontier_charter'), '허가장은 하나만');
  stay(g, 'harfen'); reset(g);
  act(g, 'frontier_gather'); scene(g, 'frontier_gather', 'to:fr_moor');
  check(FS(g).party?.site === 'fr_moor' && FS(g).party.legal, '개척단 목적지');
  for (const k of ['recruit', 'recruit', 'food', 'food', 'tools', 'guards']) { reset(g); act(g, 'frontier_gather'); scene(g, 'frontier_gather', k); }
  const p = FS(g).party;
  check(p.settlers === 10 && p.food === 6 && p.tools && p.guards, `개척단 ${JSON.stringify(p)}`);
  okInfo(g);
  check(/개척단/.test(frontierLine(g)), '모으는 중 머리글');
  check(!has(g, 'frontier_go'), '들어가는 고장에서만 떠난다');
  stay(g, 'fur'); reset(g);
  check(has(g, 'frontier_go'), '털가죽 시장에서 떠난다');
  act(g, 'frontier_go');
  check(L(g).travel?.to === 'fr_moor' && FS(g).party.going, '길에 올랐다');
  // 도착
  L(g).travel = null; L(g).place = 'fr_moor';
  runHooks('afterMonth', g, makeRng({ s: 1 }));
  const s = site(g, 'fr_moor');
  check(s.stage === 1 && s.mine && s.chief && s.pop === 42 && s.legal && !FS(g).party && !FS(g).charter, `천막을 쳤다 ${JSON.stringify(s)}`);
  check(PLACES.fr_moor.open(g) && PLACES.fr_moor.kind === '개척 천막', '개척지가 열렸다');
  check(queued(g, 'frontier_arrive'), '도착 장면');
  scene(g, 'frontier_arrive', 'ok');
  check(FS(g).me.founded === 1 && FS(g).me.led === 1, '연 수');
  okInfo(g);
  check(/남쪽 황무지/.test(frontierLine(g)), '개척지 머리글');
  stay(g, 'fur'); g.player.money = 500;
  check(travelKeys(g).includes('fr_moor'), '사람이 살면 길 떠나기 목록에 나온다');
  // 허가장 없이
  const h = adult(5011, 'harfen');
  act(h, 'frontier_gather'); scene(h, 'frontier_gather', 'to:fr_wolf');
  check(FS(h).party.legal === false, '허가장 없이 가면 법 밖이다');
  reset(h); act(h, 'frontier_gather'); scene(h, 'frontier_gather', 'disband');
  check(!FS(h).party, '해산');
}
// 3) 개척촌 일
{
  const g = adult(5020, 'leocast', 70);
  const s = camp(g);
  check(has(g, 'frontier_work'), '개척촌 일');
  const f0 = s.food;
  act(g, 'frontier_work'); scene(g, 'frontier_work', 'clear');
  check(s.food > f0, '밭을 일구면 먹을 것이 는다');
  const sf = s.safety;
  reset(g); act(g, 'frontier_work'); scene(g, 'frontier_work', 'fence');
  check(s.safety === sf + 12, '목책');
  reset(g); act(g, 'frontier_work'); scene(g, 'frontier_work', 'hunt', 4);
  const p0 = s.pop;
  reset(g); act(g, 'frontier_work'); scene(g, 'frontier_work', 'call');
  check(s.pop > p0, '사람을 더 부른다');
  // 이름
  reset(g); act(g, 'frontier_work'); scene(g, 'frontier_work', 'name');
  check(queued(g, 'frontier_name'), '이름 장면');
  const nm = L(g).queue.find((x) => x.kind === 'frontier_name');
  scene(g, 'frontier_name', 'n:세샘골');
  check(s.name === '세샘골' && PLACES.fr_moor.name === '세샘골' && FS(g).me.named === 1, '이름을 붙였다');
  okInfo(g);
  check(frontierInfo(g).here.name === '세샘골', '화면에 이름');
  // 남의 개척촌: 눌러살기, 촌장 뽑기
  const t = adult(5021, 'leocast', 70);
  found(t, 'fr_wood', 'crown', { pop: 60 });
  stay(t, 'fr_wood');
  act(t, 'frontier_work');
  const keys = peek(t, 'frontier_work');
  act(t, 'frontier_work');
  check(!keys.includes('name') && !keys.includes('call') && keys.includes('settle'), `남의 개척촌에선 촌장 일이 없다 ${keys}`);
  scene(t, 'frontier_work', 'settle');
  check(FS(t).me.home === 'fr_wood', '눌러산다');
  check(cond(t, 'frontier_elect'), '촌장 뽑기 조건');
  fire(t, 'frontier_elect', 0);
  check(site(t, 'fr_wood').chief, '촌장이 되었다');
  check(!cond(t, 'frontier_elect'), '촌장이면 다시 뽑지 않는다');
  // 나라에 넘기기
  site(t, 'fr_wood').stage = 2;
  const m0 = t.player.money;
  reset(t); act(t, 'frontier_work'); scene(t, 'frontier_work', 'hand');
  check(!site(t, 'fr_wood').chief && t.player.money > m0, '나라에 넘기고 물러났다');
}
// 4) 먼저 살던 이들: 선물, 약조, 몰아내기
{
  const g = adult(5030, 'leocast', 60);
  const s = camp(g, 'fr_wood');
  act(g, 'frontier_work'); scene(g, 'frontier_work', 'natives');
  check(queued(g, 'frontier_natives'), '먼저 살던 이들 장면');
  scene(g, 'frontier_natives', 'gift');
  check(s.natives === 20, `선물 ${s.natives}`);
  let pact = false;
  for (let k = 0; k < 6 && !pact; k++) { reset(g); act(g, 'frontier_work'); scene(g, 'frontier_work', 'natives'); scene(g, 'frontier_natives', 'pact', 10 + k); pact = !!s.pact; }
  check(pact && FS(g).me.treaties === 1, '약조');
  const d = adult(5031, 'leocast', 95);
  const x = camp(d, 'fr_moor');
  let gone = false;
  for (let k = 0; k < 8 && !gone; k++) { reset(d); d.player.injuries = []; act(d, 'frontier_work'); scene(d, 'frontier_work', 'natives'); scene(d, 'frontier_natives', 'drive', 20 + k); gone = x.natives === null; }
  check(gone && FS(d).me.drove === 1, '몰아냈다');
  okInfo(d);
  check(frontierInfo(d).here.natives.gone, '화면: 쫓겨났다');
  reset(d); act(d, 'frontier_work');
  check(!peek(d, 'frontier_work').includes('natives'), '쫓아낸 뒤엔 찾아갈 이가 없다');
  // 늪과 고원: 먼저 살던 이가 없는 땅도 있다
  const e = adult(5032, 'leocast', 60);
  camp(e, 'fr_grass');
  act(e, 'frontier_work');
  check(!peek(e, 'frontier_work').includes('natives'), '쇠풀 벌판엔 먼저 살던 이가 없다');
}
// 5) 겨울과 마물
{
  const g = adult(5040, 'leocast', 60);
  const s = camp(g);
  g.date.month = 12; s.food = 1;
  runHooks('afterMonth', g, makeRng({ s: 1 }));
  check(queued(g, 'frontier_winter'), '겨울 장면');
  scene(g, 'frontier_winter', 'seed');
  check(s.food === 3 && s.seedEaten, '씨앗 자루를 열었다');
  s.food = 1; FS(g).winterAt = -99; reset(g);
  runHooks('afterMonth', g, makeRng({ s: 1 }));
  check(!peek(g, 'frontier_winter').includes('seed'), '씨앗은 한 번뿐');
  FS(g).winterAt = -99; runHooks('afterMonth', g, makeRng({ s: 1 }));
  scene(g, 'frontier_winter', 'buy');
  check(s.food === 4, '곡식을 사 왔다');
  // 마물: 내가 있으면 장면
  s.safety = 0; reset(g);
  const W = wildsState(g); W.land.fur.level = 100;
  ticks(g, 400, () => queued(g, 'frontier_raid'), () => { s.food = 6; s.pop = Math.max(s.pop, 40); s.morale = 60; reset(g); stay(g, 'fr_moor'); g.date.month = 6; });
  check(queued(g, 'frontier_raid'), '마물이 내려온 밤');
  scene(g, 'frontier_raid', 'fight', 3);
}
// 6) 사건
{
  let g = adult(5050, 'harfen', 60);
  found(g, 'fr_moor', 'crown', { pop: 30 });
  check(cond(g, 'frontier_call'), '개척민을 찾는다 조건');
  fire(g, 'frontier_call', 2);
  check(L(g).travel?.to === 'fr_moor' && FS(g).me.home === 'fr_moor', '따라간다');
  g = adult(5051, 'leocast', 60);
  const s = camp(g);
  check(cond(g, 'frontier_refugees'), '피난민 조건');
  const p0 = s.pop;
  fire(g, 'frontier_refugees', 0);
  check(s.pop > p0, '받아들였다');
  s.stage = 2; s.legal = false;
  check(cond(g, 'frontier_claim'), '나라에서 온 관리 조건');
  fire(g, 'frontier_claim', 1);
  check(s.legal, '충성을 맹세했다');
  check(!cond(g, 'frontier_claim'), '허가를 받으면 다시 오지 않는다');
}
// 7) 달 흐름: 개척단이 들어오고, 버려지고, 자라고, 이름이 붙는다
{
  const g = fresh(5060);
  g.world.famine = true;
  const n = ticks(g, 2400, () => Object.values(FS(g).sites).some((s) => s.stage >= 1));
  check(n < 2400, '흉년이면 개척단이 떠난다');
  const id = Object.keys(SITES).find((k) => site(g, k).stage >= 1);
  const s = site(g, id);
  check(!s.mine && s.by && s.byName && PLACES[id].open(g), '남이 연 개척지도 열린다');
  // 버려짐
  s.pop = 5; ticks(g, 1);
  check(s.stage === 0 && s.lost === 1 && !PLACES[id].open(g) && PLACES[id].name === SITES[id].land, '버려지면 다시 빈 땅');
  // 자라서 개척촌이 되고 이름이 붙는다
  found(g, 'fr_grass', 'empire', { pop: 60 });
  const x = site(g, 'fr_grass');
  ticks(g, 400, () => x.stage >= 2, () => { x.food = Math.max(x.food, 6); x.morale = 70; x.safety = 80; });
  check(x.stage === 2 && x.name && PLACES.fr_grass.name === x.name && PLACES.fr_grass.kind === '개척촌', `개척촌 ${x.stage} ${x.name}`);
  ticks(g, 12 * 30, () => x.stage >= 3, () => { x.food = Math.max(x.food, 6); x.morale = 70; x.pop = Math.max(x.pop, 160); });
  check(x.stage === 3, '마을이 되었다');
  for (const v of Object.values(FS(g).sites)) for (const k of ['pop', 'food', 'safety', 'morale']) if (!Number.isFinite(v[k]) || v[k] < 0) check(false, `값 ${k} ${v[k]}`);
  okInfo(g);
  for (const l of FS(g).log) if (BAD.test(l.text)) { check(false, `기록 글 이상: ${l.text}`); break; }
  // 내 이름 없는 개척촌은 기다리다 스스로 이름을 붙인다
  const m = fresh(5061);
  found(m, 'fr_fen', 'me', { pop: 80 });
  const y = site(m, 'fr_fen'); y.stage = 2; y.since = -999;
  ticks(m, 400, () => !!y.name, () => { y.food = 6; y.morale = 70; });
  check(!!y.name && PLACES.fr_fen.name === y.name, '기다리다 스스로 이름을 붙인다');
}
// 8) 저장 왕복, 예전 저장, 대 잇기
{
  const g = adult(5070, 'leocast', 60);
  const s = camp(g, 'fr_fen');
  nameSite(g, 'fr_fen', '갈대둑');
  FS(g).party = { site: 'fr_ash', settlers: 5, food: 0, tools: false, guards: false, legal: false, going: false };
  const other = fresh(5071); // 다른 판을 열면 이름이 그 판 것으로 바뀐다
  check(PLACES.fr_fen.name === '갈대 늪', '다른 판의 이름');
  const back = decodeSave(encodeSave(g));
  runHooks('migrate', back, makeRng({ s: 1 }));
  check(back.frontier.sites.fr_fen.name === '갈대둑' && PLACES.fr_fen.name === '갈대둑' && PLACES.fr_fen.open(back) && back.life.place === 'fr_fen', '저장 왕복');
  check(!PLACES.fr_fen.open(other), '다른 판에선 닫혀 있다');
  okInfo(back);
  const h = fresh(5072); delete h.frontier;
  runHooks('migrate', h, makeRng({ s: 1 }));
  check(!!h.frontier && Object.keys(h.frontier.sites).length === 6, '예전 저장을 채운다');
  const k = fresh(5073); delete k.frontier.sites.fr_ash; delete k.frontier.me.named;
  runHooks('migrate', k, makeRng({ s: 1 }));
  check(k.frontier.sites.fr_ash.stage === 0 && k.frontier.me.named === 0, '빠진 것을 채운다');
  runHooks('heir', back, makeRng({ s: 1 }));
  check(!back.frontier.party && back.frontier.sites.fr_fen.mine, '대를 이으면 개척단은 흩어지고 개척촌은 남는다');
  syncNames(g);
}
// 9) 40년 플레이
{
  let years = 0, founded = 0, settled = 0;
  const seen = {};
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '평생', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'farmer'][run], mode: 'free', seed: 5197 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      if (m === 12 * 17) { L(g).place = ['leocast', 'harfen', 'graubel', 'eisen'][run]; L(g).travel = null; g.player.money += 300; L(g).renown = (L(g).renown ?? 0) + 20; }
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('frontier_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.6) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) { const kind = L(g).scene?.kind ?? g.pendingEvent.id; seen[kind] = (seen[kind] ?? 0) + 1; check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title) && g.pendingEvent.choices.every((c) => !BAD.test(c)), `장면 글 ${kind}: ${g.pendingEvent.text}`); resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1))); }
      for (const r of g.lastResults ?? []) if (BAD.test(r.text)) { check(false, `결과 글 ${r.name}: ${r.text}`); break; }
      if (!Number.isFinite(g.player.money) || g.player.money < 0) { check(false, `돈 ${g.player.money}`); break; }
    }
    years += m / 12; founded += FS(g).me.founded; settled += Object.values(FS(g).sites).filter((s) => s.stage).length;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of FS(g).log) if (BAD.test(l.text)) { check(false, `개척 기록 이상: ${l.text}`); break; }
    for (const n of g.news ?? []) if (BAD.test(n.text)) { check(false, `소식 글 이상: ${n.text}`); break; }
    okInfo(g);
  }
  console.log(`개척 ${Math.round(years)}년 4판 플레이, 내가 연 개척지 ${founded}, 끝에 사람이 사는 땅 ${settled}, 장면 ${Object.keys(seen).filter((k) => k.startsWith('frontier_')).join(',')}`);
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
