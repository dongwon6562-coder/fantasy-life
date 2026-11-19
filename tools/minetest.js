import './lsshim.js';
import '../src/content.js';
// 광산 점검: 처음 상태, 붕괴와 갇힌 광부, 파업(남의 광산·내 광산), 너무 깊이 파서 깨운 것, 광부 일, 광맥 찾기와 광업권,
// 내 광산 꾸리기와 달마다 몫, 몰래 판 굴이 들통남, 소유권 다툼, 과부, 막장의 소리, 드워프에게 배우기, 대 잇기, 예전 저장, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { takeJob, WORK } from '../src/jobs.js';
import { mineState as MS, mineInfo, mineLine, mineMonth, collapse, awaken } from '../src/mine/index.js';
import { wildsState } from '../src/wilds/index.js';

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
const fresh = (seed, name = '광부') => newGame({ name, sex: 'm', familyId: 'farmer', mode: 'free', seed });
const setStats = (g, v) => { for (const k of Object.keys(g.player.stats)) g.player.stats[k] = v; };
const digger = (seed, place = 'graubel', v = 50) => { const g = fresh(seed); grown(g); stay(g, place); setStats(g, v); g.player.skills.sword = v; g.player.money = 400; g.player.familyMoney = 0; g.player.injuries = []; L(g).pendingDeath = null; L(g).job = null; return g; };
const ticks = (g, n, until = () => false) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; mineMonth(g); if (until()) return i + 1; } return n; };
const okInfo = (g) => check(!BAD.test(JSON.stringify(mineInfo(g)).replace(/null/g, '0')) && !BAD.test(String(mineLine(g) ?? '')), `화면 정보: ${JSON.stringify(mineInfo(g)).slice(0, 300)}`);
const site = (g, id) => MS(g).sites[id];
const myId = (g) => Object.keys(MS(g).sites).find((id) => site(g, id).owner === 'me');
const findMine = (g, place, legal = true) => { // 광맥을 찾아 광산을 연다 (찾을 때까지)
  for (let k = 0; k < 60; k++) {
    L(g).queue = []; L(g).scene = null; g.pendingEvent = null; g.player.fatigue = 0;
    act(g, 'mine_prospect', 100 + k);
    if (queued(g, 'mine_claim')) { scene(g, 'mine_claim', legal ? 'buy' : 'secret'); return myId(g); }
  }
  return null;
};

// 1) 처음
{
  const g = fresh(3001);
  const S = MS(g);
  check(Object.keys(S.sites).length === 6 && Object.values(S.sites).every((s) => s.owner !== 'me'), '처음 광산 여섯');
  check(WORK.miner && WORK.miner.places.includes('graubel'), '광부 일자리');
  okInfo(g);
  check(mineLine(g) === null, '처음엔 머리글 없음');
  check(!has(g, 'mine_prospect'), '아이는 광맥을 못 찾는다');
  grown(g); stay(g, 'ern');
  check(!has(g, 'mine_prospect'), '평지 마을에는 광맥이 없다');
  stay(g, 'verden');
  check(has(g, 'mine_prospect'), '베르덴에서 광맥을 찾는다');
}
// 2) 광부 일: 품삯, 붕괴에 갇히면 장면, 파업이면 줄 앞
{
  const g = digger(3002, 'graubel', 60);
  takeJob(g, 'miner');
  const m0 = g.player.money;
  act(g, 'work');
  check(g.player.money > m0 && L(g).job.site === 'redhill' && MS(g).me.shifts === 1, '광부 품삯');
  collapse(g, 'redhill', makeRng({ s: 4 }), () => {});
  check(queued(g, 'mine_collapse') && site(g, 'redhill').collapses === 1, '무너진 갱도에 갇힌다');
  scene(g, 'mine_collapse', 'lead', 3);
  check(MS(g).me.saved > 0 || g.player.injuries.length > 0, '사람들을 이끌거나 다친다');
  site(g, 'redhill').closed = 0;
  site(g, 'redhill').strike = { since: 0, months: 0 };
  act(g, 'work');
  check(queued(g, 'mine_picket'), '파업이면 줄 앞에 선다');
  scene(g, 'mine_picket', 'join');
  check(MS(g).me.strikes === 1, '줄에 섰다');
  let talked = false;
  for (let k = 0; k < 10 && !talked; k++) { site(g, 'redhill').strike = { since: 0, months: 0 }; L(g).queue = []; L(g).scene = null; g.pendingEvent = null; act(g, 'work'); scene(g, 'mine_picket', 'talk', 20 + k); talked = !site(g, 'redhill').strike; }
  check(talked, '말로 파업을 푼다');
  okInfo(g);
}
// 3) 남의 광산 파업은 끝내 끝난다 (들어주거나 깨뜨리거나)
{
  const g = digger(3003, 'ern');
  const s = site(g, 'roten');
  s.unrest = 95;
  const n = ticks(g, 30, () => !!s.strike);
  check(!!s.strike && n < 30, '불만이 쌓이면 파업');
  ticks(g, 8, () => !s.strike);
  check(!s.strike, '파업이 끝났다');
  check(site(g, 'deepvein').strike === null, '드워프는 파업하지 않는다');
}
// 4) 너무 깊이 파면 깨운다: 막으러 내려간다, 드워프를 부른다
{
  const g = digger(3004, 'gorge', 70);
  const s = site(g, 'grayhole');
  s.stir = 99.9; s.depth = 8;
  ticks(g, 6, () => !!s.awoke);
  check(!!s.awoke, `깨어났다 (${s.stir})`);
  check(/막혔다/.test(mineLine(g) ?? ''), `머리글: ${mineLine(g)}`);
  check(has(g, 'mine_deep'), '깊은 갱도로 내려갈 수 있다');
  act(g, 'mine_deep');
  scene(g, 'mine_deep', 'dwarves');
  check(!s.awoke && MS(g).me.sealed === 1, '드워프 석공이 메웠다');
  // 직접 내려가기 (여러 판 가운데 한 번은 막는다)
  let sealed = 0;
  for (let k = 0; k < 8; k++) {
    const h = digger(3010 + k, 'gorge', 90);
    awaken(h, 'grayhole', makeRng({ s: k + 1 }), () => {});
    act(h, 'mine_deep'); scene(h, 'mine_deep', 'down', 30 + k);
    if (!site(h, 'grayhole').awoke) sealed++;
  }
  check(sealed > 0, '직접 내려가 막은 적이 없다');
  // 남의 광산은 주인들이 끝내 막는다
  const w = digger(3020, 'ern');
  awaken(w, 'deepvein', makeRng({ s: 2 }), () => {});
  ticks(w, 60, () => !site(w, 'deepvein').awoke);
  check(!site(w, 'deepvein').awoke, '드워프가 막았다');
}
// 5) 광맥 찾기와 광업권, 내 광산, 달마다 몫
{
  const g = digger(3030, 'verden', 80);
  const id = findMine(g, 'verden');
  check(!!id && site(g, id).legal && site(g, id).near === 'verden', '광업권을 사서 광산을 열었다');
  check(has(g, 'mine_manage'), '내 광산을 돌본다');
  act(g, 'mine_manage'); scene(g, 'mine_manage', 'hire');
  act(g, 'mine_manage'); scene(g, 'mine_manage', 'hire');
  check(site(g, id).miners === 8, '광부 여덟');
  act(g, 'mine_manage'); scene(g, 'mine_manage', 'timber');
  act(g, 'mine_manage'); scene(g, 'mine_manage', 'raise');
  check(site(g, id).wage === 4 && site(g, id).safety >= 70, '버팀목과 품삯');
  site(g, id).vein = 90;
  const m0 = g.player.money;
  ticks(g, 6);
  check(MS(g).me.income !== 0 && g.player.money !== m0, `달마다 몫 ${MS(g).me.income}`);
  check(/광산: 1곳/.test(mineLine(g) ?? '') || /파업|막혔다/.test(mineLine(g) ?? ''), `머리글: ${mineLine(g)}`);
  act(g, 'mine_manage'); scene(g, 'mine_manage', 'deeper');
  check(site(g, id).depth === 2, '더 깊이');
  okInfo(g);
  const before = g.player.money;
  act(g, 'mine_manage'); scene(g, 'mine_manage', 'sell');
  check(!site(g, id) && g.player.money > before && MS(g).me.sold === 1, '광산을 팔았다');
}
// 6) 내 광산의 파업, 막장의 소리
{
  const g = digger(3040, 'graubel', 80);
  const id = findMine(g, 'graubel');
  check(!!id, '광산을 열었다');
  const s = site(g, id);
  s.miners = 12; s.strike = { since: 0, months: 0 };
  check(cond(g, 'mine_strike_owner'), '내 광산 파업 사건');
  fire(g, 'mine_strike_owner', 0);
  check(!s.strike && s.wage === 4, '요구를 들어주었다');
  s.depth = 6; s.stir = 70;
  check(cond(g, 'mine_knocking'), '막장의 소리 사건');
  fire(g, 'mine_knocking', 0);
  check(s.depth === 5 && s.stir === 10, '그 층을 버렸다');
}
// 7) 몰래 판 굴은 들통나고, 소유권 다툼이 온다
{
  const g = digger(3050, 'gruental', 80);
  const id = findMine(g, 'gruental', false);
  check(!!id && !site(g, id).legal, '몰래 판 굴');
  site(g, id).found = true;
  check(cond(g, 'mine_found_out'), '들통');
  fire(g, 'mine_found_out', 0);
  check(site(g, id).legal && !/숨은/.test(site(g, id).name), '벌금을 치르고 광업권을 얻었다');
  site(g, id).since = -100; site(g, id).vein = 80;
  check(cond(g, 'mine_dispute'), '소유권 다툼');
  fire(g, 'mine_dispute', 3);
  check(!site(g, id), '넘겨주었다');
}
// 8) 과부, 드워프에게 배우기
{
  const g = digger(3060, 'graubel');
  site(g, 'redhill').collapses = 1; site(g, 'redhill').dead = 3;
  check(cond(g, 'mine_widow'), '과부 사건');
  fire(g, 'mine_widow', 0);
  const h = digger(3061, 'hammer');
  check(has(h, 'mine_dwarf'), '드워프에게 배운다');
  act(h, 'mine_dwarf');
  check(MS(h).me.lore > 0 && MS(h).dwarf > 0, '갱도 솜씨');
}
// 9) 대 잇기, 예전 저장
{
  const g = digger(3070, 'verden', 80);
  findMine(g, 'verden');
  MS(g).finds.push({ id: 99, place: 'verden', ore: 'iron', size: 50, at: 0 });
  runHooks('heir', g, makeRng({ s: 1 }));
  check(!!myId(g) && MS(g).finds.length === 0, '광산은 대를 잇고 찾아 둔 광맥은 잊힌다');
  const h = fresh(3071); delete h.mine;
  runHooks('migrate', h, makeRng({ s: 1 }));
  check(!!h.mine && Object.keys(h.mine.sites).length === 6, '예전 저장을 채운다');
  const k = fresh(3072); delete k.mine.sites.roten; delete k.mine.me.lore;
  runHooks('migrate', k, makeRng({ s: 1 }));
  check(!!k.mine.sites.roten && k.mine.me.lore === 0, '빠진 것을 채운다');
}
// 10) 60년: 붕괴와 죽음이 있고, 값이 제자리
{
  const g = digger(3080, 'ern');
  ticks(g, 12 * 60);
  const sites = Object.values(MS(g).sites);
  check(sites.some((s) => s.collapses > 0), '60년 동안 무너진 갱도가 없다');
  for (const s of sites) for (const k of ['vein', 'safety', 'unrest', 'stir']) if (!Number.isFinite(s[k]) || s[k] < 0 || s[k] > 100) check(false, `값 ${s.name} ${k} ${s[k]}`);
  for (const v of Object.values(MS(g).price)) check(v >= 0.5 && v <= 2.2, `시세 ${v}`);
  okInfo(g);
}
// 11) 40년 플레이 (광산 고장에서)
{
  let years = 0, shifts = 0, finds = 0;
  const seen = {};
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '평생', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 3197 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      if (m === 12 * 17) { L(g).place = ['graubel', 'verden', 'gorge', 'hammer'][run]; L(g).travel = null; }
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('mine_') || a.id === 'work' || a.id === 'seek_job');
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.5) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) { const kind = L(g).scene?.kind ?? g.pendingEvent.id; seen[kind] = (seen[kind] ?? 0) + 1; check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title) && g.pendingEvent.choices.every((c) => !BAD.test(c)), `장면 글 ${kind}: ${g.pendingEvent.text}`); resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1))); }
      for (const r of g.lastResults ?? []) if (BAD.test(r.text)) { check(false, `결과 글 ${r.name}: ${r.text}`); break; }
      if (!Number.isFinite(g.player.money) || g.player.money < 0) { check(false, `돈 ${g.player.money}`); break; }
    }
    years += m / 12; shifts += MS(g).me.shifts; finds += MS(g).me.finds;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of MS(g).log) if (BAD.test(l.text)) { check(false, `광산 기록 이상: ${l.text}`); break; }
    for (const n of g.news ?? []) if (BAD.test(n.text)) { check(false, `소식 글 이상: ${n.text}`); break; }
    okInfo(g);
  }
  console.log(`광산 ${Math.round(years)}년 4판 플레이, 광부 일 ${shifts}번, 찾은 광맥 ${finds}, 장면 ${Object.keys(seen).filter((k) => k.startsWith('mine_')).join(',')}`);
  check(finds > 0, '40년 동안 광맥을 한 번도 못 찾았다');
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
