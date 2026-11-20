import './lsshim.js';
import '../src/content.js';
// 큰 공사 점검: 공사 아홉, 달 흐름(시작·멈춤·다시 시작·버려짐·완공), 완공되면 바뀌는 길·품삯·시세·고장 글(새 판에선 처음대로),
// 공사장 일·감독·석공 길드·빼돌리기·무너짐, 돈 대기와 공사 일으키기·머릿돌, 낙성식, 부역령, 감독 자리 비우기, 저장 왕복, 대 잇기, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { worksState as WS, worksInfo, worksLine, worksMonth, startWork, completeWork, syncWorks, WORKS, WORK_IDS } from '../src/works/index.js';
import { PLACES, travelMonths } from '../src/places.js';
import { LOCAL } from '../src/trade/core.js';
import { encodeSave, decodeSave } from '../src/save.js';

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
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; for (const k of Object.keys(g.player.stats)) g.player.stats[k] = Math.max(g.player.stats[k], 35); g.date.year += y; (g.flags ??= {}).adult = true; };
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
const fresh = (seed, name = '석공') => newGame({ name, sex: 'm', familyId: 'farmer', mode: 'free', seed });
const adult = (seed, place = 'harfen', v = 50) => { const g = fresh(seed); grown(g); stay(g, place); for (const k of Object.keys(g.player.stats)) g.player.stats[k] = v; g.player.skills.building = v; g.player.money = 5000; g.player.familyMoney = 0; g.player.injuries = []; L(g).pendingDeath = null; L(g).queue = []; return g; };
const ticks = (g, n, until = () => false) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; worksMonth(g); if (until()) return i + 1; } return n; };
const okInfo = (g) => check(!BAD.test(JSON.stringify(worksInfo(g)).replace(/null/g, '0')) && !BAD.test(String(worksLine(g) ?? '')), `화면 정보: ${JSON.stringify(worksInfo(g)).slice(0, 300)}`);
const w = (g, id) => WS(g).w[id];
const BASE = { lh: travelMonths('leocast', 'harfen'), vl: travelMonths('verden', 'leocast'), kl: travelMonths('klein', 'leocast'), vg: travelMonths('verden', 'graubel'), hg: travelMonths('hammer', 'graubel') };

// 1) 처음: 공사 아홉, 모두 아직
{
  const g = fresh(6001);
  check(WORK_IDS.length === 9 && WORK_IDS.every((id) => w(g, id).stage === 'idle' && PLACES[WORKS[id].place]), '공사 아홉');
  check(BASE.lh === 2 && BASE.vl === 2 && BASE.kl === 2 + 1 && BASE.vg === 3 && BASE.hg === 2, `처음 길 ${JSON.stringify(BASE)}`);
  check(!PLACES.klein.links.leocast, '운하 전엔 클라인-왕도 길이 없다');
  okInfo(g);
  check(worksLine(g) === null, '공사가 없으면 머리글 없음');
}
// 2) 완공되면 세상이 바뀐다, 새 판에선 처음대로
{
  const g = fresh(6002);
  const wage = PLACES.harfen.wage, salt = LOCAL.leocast.salt ?? 0, desc = PLACES.harfen.desc;
  for (const id of ['w_road', 'w_bridge', 'w_canal', 'w_pass', 'w_tunnel', 'w_wall']) { startWork(g, id, WORKS[id].patron, 100, makeRng({ s: 1 })); completeWork(g, id, () => {}); }
  check(travelMonths('leocast', 'harfen') === 1 && travelMonths('verden', 'leocast') === 1 && PLACES.klein.links.leocast === 2 && travelMonths('verden', 'graubel') === 2 && travelMonths('hammer', 'graubel') === 1, '길이 짧아졌다');
  check(PLACES.harfen.wage > wage && (LOCAL.leocast.salt ?? 0) < salt && PLACES.harfen.desc.includes(WORKS.w_wall.mark), '품삯·시세·고장 글');
  syncWorks(g); syncWorks(g);
  check(PLACES.harfen.desc.split(WORKS.w_wall.mark).length === 2 && Math.abs(PLACES.harfen.wage - wage - 0.08) < 0.001, `여러 번 맞춰도 한 번만 (${PLACES.harfen.wage})`);
  check(g.chronicle.some((c) => c.text.includes('하르펜 새 성벽')), '연대기에 남는다');
  okInfo(g);
  const save = encodeSave(g);
  const h = fresh(6003);
  check(travelMonths('leocast', 'harfen') === BASE.lh && !PLACES.klein.links.leocast && PLACES.harfen.wage === wage && PLACES.harfen.desc === desc && (LOCAL.leocast.salt ?? 0) === salt, '새 판에선 처음대로');
  const back = decodeSave(save);
  runHooks('migrate', back, makeRng({ s: 1 }));
  check(back.works.w.w_canal.stage === 'done' && PLACES.klein.links.leocast === 2 && travelMonths('leocast', 'harfen') === 1, '불러오면 다시 바뀐 세상');
  syncWorks(h);
  check(travelMonths('leocast', 'harfen') === BASE.lh, '다시 다른 판');
  // 성벽은 마물을 밀어내고, 대성당은 신자를 붙든다
  const k = adult(6004, 'leocast');
  startWork(k, 'w_cathedral', 'church', 100, makeRng({ s: 1 })); completeWork(k, 'w_cathedral', () => {});
  startWork(k, 'w_wall', 'lord', 100, makeRng({ s: 1 })); completeWork(k, 'w_wall', () => {});
  check(queued(k, 'works_open'), '그 자리에 있으면 낙성식');
  if (k.faith) k.faith.god = 'solar';
  const dev = k.faith?.devotion ?? 0, hunt = k.wilds?.land?.harfen?.hunted ?? 0;
  ticks(k, 3);
  check(!k.faith || k.faith.devotion > dev, '대성당이 신앙을 붙든다');
  check(!k.wilds?.land?.harfen || k.wilds.land.harfen.hunted > hunt, '성벽이 마물을 밀어낸다');
  k.player.money = 0; L(k).home = 'inn';
  scene(k, 'works_open', 'dead');
  syncWorks(fresh(6005));
}
// 3) 달 흐름: 멈춤, 다시 시작, 버려짐, 완공
{
  const g = fresh(6010);
  startWork(g, 'w_light', 'city', 0, makeRng({ s: 1 }));
  ticks(g, 1);
  check(w(g, 'w_light').stage === 'stalled' && w(g, 'w_light').stalls === 1, '돈이 없으면 멈춘다');
  w(g, 'w_light').funds = 1e6;
  ticks(g, 1);
  check(w(g, 'w_light').stage === 'building', '돈이 들어오면 다시');
  const n = ticks(g, 400, () => w(g, 'w_light').stage === 'done');
  check(w(g, 'w_light').stage === 'done' && n < 260, `완공 (${n}달)`);
  startWork(g, 'w_tunnel', 'dwarf', 0, makeRng({ s: 1 })); w(g, 'w_tunnel').progress = 100;
  ticks(g, 1);
  w(g, 'w_tunnel').stalledAt -= 400; w(g, 'w_tunnel').patron = 'me';
  ticks(g, 1);
  check(w(g, 'w_tunnel').stage === 'idle' && w(g, 'w_tunnel').ruins === 1 && w(g, 'w_tunnel').progress > 0 && w(g, 'w_tunnel').progress < 100, '오래 멈추면 버려진다');
  okInfo(g);
  // 저절로 시작한다
  const h = fresh(6011);
  ticks(h, 12 * 40, () => WORK_IDS.some((id) => w(h, id).stage !== 'idle'));
  check(WORK_IDS.some((id) => w(h, id).stage !== 'idle'), '플레이어 없이도 공사가 시작된다');
  // 전쟁이면 왕실 돈줄이 마른다
  const k = fresh(6012); k.realm.succession = 'civilwar';
  startWork(k, 'w_road', 'crown', 0, makeRng({ s: 1 })); w(k, 'w_road').stage = 'stalled'; w(k, 'w_road').stalledAt = 0;
  ticks(k, 120);
  check(w(k, 'w_road').stage !== 'done', '내전 중 왕실 공사는 잘 안 된다');
}
// 4) 공사장 일, 감독, 길드, 빼돌리기, 무너짐
{
  const g = adult(6020, 'harfen');
  check(!has(g, 'works_labor'), '공사가 없으면 일도 없다');
  startWork(g, 'w_wall', 'lord', 1e5, makeRng({ s: 1 }));
  check(has(g, 'works_labor'), '공사장에서 일한다');
  const p0 = w(g, 'w_wall').progress, m0 = g.player.money;
  for (let i = 0; i < 10; i++) act(g, 'works_labor', i);
  check(w(g, 'w_wall').progress > p0 && w(g, 'w_wall').myMonths === 10, '일하면 공사가 오른다');
  check(w(g, 'w_wall').labor !== 'wage' || g.player.money > m0, '품삯');
  check(queued(g, 'works_overseer'), '감독 제안');
  scene(g, 'works_overseer', 'yes');
  check(WS(g).me.overseer === 'w_wall' && w(g, 'w_wall').overseer && has(g, 'works_oversee') && !has(g, 'works_labor'), '감독이 되었다');
  check(/감독/.test(worksLine(g)), `감독 머리글 ${worksLine(g)}`);
  act(g, 'works_oversee', 1);
  w(g, 'w_wall').strike = 3;
  act(g, 'works_oversee', 2);
  check(queued(g, 'works_guild'), '석공 길드');
  scene(g, 'works_guild', 'widows');
  check(w(g, 'w_wall').strike === 0, '과부 몫을 내면 다시 일한다');
  w(g, 'w_wall').strike = 3; L(g).queue = []; act(g, 'works_oversee', 2); scene(g, 'works_guild', 'break');
  w(g, 'w_wall').strike = 0;
  let k = 0; while (!queued(g, 'works_skim') && k++ < 200) act(g, 'works_oversee', 100 + k);
  check(queued(g, 'works_skim'), '빼돌리라는 유혹');
  const m1 = g.player.money;
  scene(g, 'works_skim', 'some', 4);
  check(g.player.money > m1 && w(g, 'w_wall').skim > 0, '빼돌린 돈');
  L(g).queue = []; queueScene(g, 'works_skim', { id: 'w_wall' });
  if (WS(g).me.overseer) scene(g, 'works_skim', 'report');
  L(g).queue = []; queueScene(g, 'works_fall', { id: 'w_wall', dead: 4 });
  scene(g, 'works_fall', 'dig');
  queueScene(g, 'works_fall', { id: 'w_wall', dead: 4 });
  scene(g, 'works_fall', 'pay');
  if (WS(g).me.overseer) { queueScene(g, 'works_fall', { id: 'w_wall', dead: 4 }); scene(g, 'works_fall', 'quit'); check(!WS(g).me.overseer, '감독 자리를 내놓는다'); }
  // 자리를 비우면 감독을 잃는다
  WS(g).me.overseer = 'w_wall'; w(g, 'w_wall').overseer = true;
  stay(g, 'leocast');
  for (let i = 0; i < 3; i++) runHooks('afterMonth', g, makeRng({ s: i }));
  check(!WS(g).me.overseer && !w(g, 'w_wall').overseer, '석 달 비우면 감독 자리를 잃는다');
  okInfo(g);
}
// 5) 돈 대기, 공사 일으키기, 머릿돌, 멈춘 공사 살리기
{
  const g = adult(6030, 'portel');
  check(has(g, 'works_fund'), '돈을 댈 수 있다');
  act(g, 'works_fund');
  scene(g, 'works_fund', 'start:w_light');
  check(w(g, 'w_light').stage === 'building' && w(g, 'w_light').patron === 'me' && w(g, 'w_light').carved, '내가 공사를 일으키고 머릿돌에 이름');
  w(g, 'w_light').funds = 0; ticks(g, 1);
  check(w(g, 'w_light').stage === 'stalled', '내 돈이 마르면 멈춘다');
  act(g, 'works_fund');
  scene(g, 'works_fund', 'give:w_light:150');
  check(w(g, 'w_light').stage === 'building', '돈을 대면 다시');
  const h = adult(6031, 'leocast');
  startWork(h, 'w_cathedral', 'church', 0, makeRng({ s: 1 })); ticks(h, 1);
  act(h, 'works_fund'); scene(h, 'works_fund', 'give:w_cathedral:600');
  check(w(h, 'w_cathedral').myGold === 600 && !w(h, 'w_cathedral').carved, '조금 내면 이름은 안 새긴다');
  act(h, 'works_fund'); scene(h, 'works_fund', 'give:w_cathedral:2500');
  check(!!w(h, 'w_cathedral').carved && w(h, 'w_cathedral').stage === 'building', '많이 내면 머릿돌에 이름, 멈춘 공사가 다시');
  okInfo(h);
}
// 6) 부역령
{
  for (const [i, seed] of [[0, 1], [1, 2], [2, 3], [2, 999]]) {
    const g = adult(6040 + i, 'leocast');
    startWork(g, 'w_road', 'crown', 1e5, makeRng({ s: 1 }));
    check(w(g, 'w_road').labor === 'corvee', '왕실 큰길은 부역');
    check(cond(g, 'works_corvee'), '부역령');
    if (i === 2) g.player.money = 0;
    fire(g, 'works_corvee', i === 2 ? 1 : i, seed);
  }
  const g = adult(6045, 'leocast'); g.domain = { place: 'gruental' };
  startWork(g, 'w_road', 'crown', 1e5, makeRng({ s: 1 }));
  check(!cond(g, 'works_corvee'), '영주는 부역에 끌려가지 않는다');
}
// 7) 저장 왕복, 예전 저장, 대 잇기
{
  const g = adult(6050, 'harfen');
  startWork(g, 'w_wall', 'lord', 1e5, makeRng({ s: 1 })); WS(g).me.overseer = 'w_wall'; w(g, 'w_wall').overseer = true; w(g, 'w_wall').carved = '석공';
  const back = decodeSave(encodeSave(g));
  check(back.works.w.w_wall.stage === 'building' && back.works.me.overseer === 'w_wall' && back.works.w.w_wall.carved === '석공', '저장 왕복');
  const h = fresh(6051); delete h.works;
  runHooks('migrate', h, makeRng({ s: 1 }));
  check(!!h.works && Object.keys(h.works.w).length === 9, '예전 저장을 채운다');
  const k = fresh(6052); delete k.works.w.w_light; k.works.w.w_road.stage = '이상'; k.works.w.w_gone = {}; k.works.w.w_bridge.funds = NaN;
  runHooks('migrate', k, makeRng({ s: 1 }));
  check(k.works.w.w_light.stage === 'idle' && k.works.w.w_road.stage === 'idle' && !k.works.w.w_gone && k.works.w.w_bridge.funds === 0, '빠지고 이상한 것을 고친다');
  runHooks('heir', back, makeRng({ s: 1 }));
  check(!back.works.me.overseer && !back.works.w.w_wall.overseer && back.works.w.w_wall.carved === '석공', '대를 이으면 감독 자리는 넘어가지 않고 머릿돌은 남는다');
  syncWorks(fresh(6053));
}
// 8) 40년 플레이
{
  let years = 0, done = 0, mine = 0;
  const seen = {};
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '평생', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'farmer'][run], mode: 'free', seed: 6197 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      if (m === 12 * 17) { L(g).place = ['harfen', 'leocast', 'portel', 'verden'][run]; L(g).travel = null; g.player.money += 400; startWork(g, ['w_wall', 'w_road', 'w_light', 'w_bridge'][run], 'lord', 3000, rng); }
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('works_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.6) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) { const kind = L(g).scene?.kind ?? g.pendingEvent.id; seen[kind] = (seen[kind] ?? 0) + 1; check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title) && g.pendingEvent.choices.every((c) => !BAD.test(c)), `장면 글 ${kind}: ${g.pendingEvent.text}`); resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1))); }
      for (const r of g.lastResults ?? []) if (BAD.test(r.text)) { check(false, `결과 글 ${r.name}: ${r.text}`); break; }
      if (!Number.isFinite(g.player.money) || g.player.money < 0) { check(false, `돈 ${g.player.money}`); break; }
    }
    years += m / 12; done += WORK_IDS.filter((id) => w(g, id).stage === 'done').length; mine += WS(g).me.months;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of WS(g).log) if (BAD.test(l.text)) { check(false, `공사 기록 이상: ${l.text}`); break; }
    for (const n of g.news ?? []) if (BAD.test(n.text)) { check(false, `소식 글 이상: ${n.text}`); break; }
    okInfo(g);
  }
  console.log(`공사 ${Math.round(years)}년 4판 플레이, 끝에 완공 ${done}, 내가 일한 달 ${mine}, 장면 ${Object.keys(seen).filter((k) => k.startsWith('works_')).join(',')}`);
}
syncWorks(fresh(6999));
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
