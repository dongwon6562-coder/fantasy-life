import './lsshim.js';
import '../src/content.js';
// 45단계 도우미2 점검: 함께 자란 세대. 같은 해 난 아이들이 생기고, 열다섯쯤 저마다 길을 고르고, 오르고 몰락하고 죽고,
// 소식이 줄로 오고, 동세대끼리 일이 생기고, 장면이 그 형편에서 뜨고 글이 깨지지 않는지, 대 잇기·옛 저장·저장 왕복을 본다.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, playerAge } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { openCase } from '../src/law/index.js';
import { RACE_NAMES } from '../src/races/data.js';
import { peersState, peersInfo, peersLines, peersLine } from '../src/peers/index.js';
import { PATHS, SET_OUT, CROSS } from '../src/peers/data.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  /.test(t);
const verbose = process.argv.includes('-v');
const scenes = {}; const kinds = {}; const samples = {};
const keep = (k, t) => { (samples[k] ??= []).length < 2 && !samples[k].includes(t) && samples[k].push(t); };

function resolveAll(g, pick) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    const kind = s?.kind ?? pe.id;
    const mine = kind.startsWith('pe_');
    if (mine) { scenes[kind] = (scenes[kind] ?? 0) + 1; ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.text} | ${pe.choices}`); }
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    if (mine && pick != null) idx = Math.min(pick, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); keep(kind + (s?.mode ? `:${s.mode}` : ''), `${pe.text.slice(0, 110)}… [${pe.choices[idx]}] → ${String(out).slice(0, 100)}`); }
    ok(g.player.money >= 0 && Number.isFinite(g.player.money), `money after ${kind}`);
  }
}
function checkMonth(g) {
  const ls = peersLines(g);
  ok(Array.isArray(ls) && ls.length <= 2, 'shape');
  for (const x of ls) { kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line ${x.kind}: ${x.text}`); keep(`line:${x.kind}`, x.text); }
  const l = peersLine(g); ok(l === null || typeof l === 'string', 'line');
}
function checkInfo(g) {
  const i = peersInfo(g);
  const js = JSON.stringify(i);
  ok(i && Array.isArray(i.cohort) && Array.isArray(i.news) && Array.isArray(i.past) && !/undefined|NaN/.test(js), `info ${js.slice(0, 200)}`);
  ok(!bad(i.line) && typeof i.year === 'number', `info line ${i.line}`);
  for (const c of i.cohort) ok(!bad(c.name) && !bad(c.word) && !bad(c.tieWord) && c.fame >= 0 && c.fame <= 100 && [null, 'friend', 'rival', 'foe'].includes(c.tie), `cohort ${JSON.stringify(c)}`);
  for (const n of i.news) ok(!bad(n.text), `news ${n.text}`);
}
const quiet = (g, ch = [{ id: 'rest' }], pick) => { endMonth(g, ch); resolveAll(g, pick); checkMonth(g); };
const fresh = (snap) => { const g = JSON.parse(snap); g.pendingEvent = null; L(g).queue = []; L(g).scene = null; return g; };

// 0. 글 틀
ok(Object.keys(PATHS).every((id) => PATHS[id].stages.length === 5 && PATHS[id].rise.length === 4 && PATHS[id].fall.length >= 2 && SET_OUT[id]), '길 틀');

// 1. 처음 달: 다섯이 생긴다
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4500 });
  quiet(g);
  const s = peersState(g);
  ok(s.built && s.list.length === 5 && s.home === L(g).place, `동세대 ${s.list.length} ${s.home}`);
  ok(s.list.every((c) => Math.abs(c.born - s.born) <= 24 && !c.path), '같은 해쯤, 아직 길 없음');
  ok(new Set(s.list.map((c) => c.name)).size === 5 && !s.list.some((c) => c.name === me(g).name), '이름 겹침');
  checkInfo(g);
}

// 2. 삶 셋: 쉬기만(빠름) 둘, 무작위 행동 하나
let deaths = 0, pairs = 0, rises = 0, falls = 0, paths = {}, news = 0;
for (const [seed, years, random] of [[4501, 72, false], [4502, 72, false], [4503, 50, true]]) {
  const g = newGame({ name: seed % 2 ? '요나스' : '클라라', sex: seed % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'capital_artisan'][seed % 3], mode: 'free', seed });
  const rng = rngOf(g);
  for (let m = 0; m < years * 12 && !g.over; m++) {
    let ch = [{ id: 'rest' }];
    if (random) { const acts = availableActions(g).filter((a) => !/travel|move/.test(a.id)); ch = []; for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id }); }
    quiet(g, ch);
    if (m % 60 === 0) checkInfo(g);
    if (playerAge(g) === 17 && g.date.month === 1) ok(peersState(g).list.every((c) => !c.alive || c.path), `열일곱이면 모두 길을 골랐다 ${seed}`);
  }
  const s = peersState(g);
  deaths += s.tally.deaths; pairs += s.tally.pair; rises += s.tally.rise; falls += s.tally.fall; news += s.tally.news;
  for (const c of s.list) if (c.path) paths[c.path] = (paths[c.path] ?? 0) + 1;
  checkInfo(g);
}
ok(deaths >= 3, `죽음 ${deaths}`);
ok(rises >= 10 && falls >= 2, `오름 ${rises} 몰락 ${falls}`);
ok(pairs >= 1, `동세대끼리 ${pairs}`);
ok(news >= 10, `소식 ${news}`);
ok(Object.keys(paths).length >= 4, `길 ${JSON.stringify(paths)}`);
ok((kinds.news ?? 0) >= 5 && (kinds.young ?? 0) >= 2, `줄 ${JSON.stringify(kinds)}`);
ok((scenes.pe_young ?? 0) + (scenes.pe_parting ?? 0) >= 1, `어린 시절 장면 ${JSON.stringify(scenes)}`);

// 3. 장면마다 모든 고르기
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4510 });
  for (let k = 0; k < 30 * 12; k++) quiet(g, [{ id: 'rest' }]);
  const s = peersState(g);
  g.player.money = 200;
  const at = L(g).place;
  const snap = JSON.stringify(g);
  const live = () => peersState(g).list.filter((c) => c.alive && c.path);
  const show = (kind, data, n) => {
    for (let i = 0; i < n; i++) {
      const h = fresh(snap);
      const c = peersState(h).list.find((x) => x.alive && x.path) ?? peersState(h).list[0];
      c.alive = true; c.path ??= 'merchant';
      const d = typeof data === 'function' ? data(h, c) : data;
      ok(showScene(h, { kind, at, t: 0, ...d }, { force: true }), `show ${kind}`);
      resolveAll(h, i);
    }
  };
  ok(live().length >= 1 || s.list.length === 5, 'live');
  for (let v = 0; v < 3; v++) show('pe_young', (h, c) => { const o = peersState(h).list.find((x) => x !== c); return { v, ai: c.id, a: c.name, bi: o.id, b: o.name }; }, 3);
  show('pe_parting', (h, c) => ({ ids: [c.id], lines: [SET_OUT[c.path]({ n: c.name, p: '왕도' })] }), 3);
  show('pe_gather', (h, c) => ({ age: 30, ids: [c.id], came: [c.name], dead: ['누군가'], gone: [], away: false, at: '에른' }), 3);
  show('pe_gather', (h, c) => ({ age: 40, ids: [c.id], came: [c.name], dead: [], gone: ['먼 사람'], away: true, at: '왕도' }), 2);
  for (const mode of Object.keys(CROSS)) show('pe_cross', (h, c) => ({ mode, v: 1, ci: c.id, name: c.name, stage: '가게 주인', place: at, f: '배가 가라앉아 밑천을 다 잃었다', years: 6 }), 3);
  show('pe_ask', (h, c) => ({ hide: false, ci: c.id, name: c.name, f: '배가 가라앉아 밑천을 다 잃었다', amt: 30 }), 3);
  show('pe_ask', (h, c) => ({ hide: true, ci: c.id, name: c.name }), 3);
  show('pe_repay', (h, c) => { c.owed = 20; c.tie = 'owes'; return { ci: c.id, name: c.name, stage: '가게 주인' }; }, 2);
  show('pe_rival', (h, c) => ({ ci: c.id, name: c.name, stage: '가게 주인' }), 3);
  show('pe_court', (h, c) => { const cs = openCase(h, { role: 'accused', charge: 'theft', guilty: false, evidence: 50 }); c.tie = 'warm'; return { ci: c.id, name: c.name, stage: '대관', place: at, cid: cs.id }; }, 2);
  show('pe_last', (h, c) => ({ n: 5, dead: ['가', '나', '다', '라'], left: c.name, li: c.id }), 3);
  show('pe_last', () => ({ n: 5, dead: ['가', '나', '다', '라', '마'], left: null, li: null }), 2);
  // 재판정에서 반가운 동세대는 증거를 깎는다
  const h = fresh(snap);
  const c = peersState(h).list[0]; c.alive = true; c.path = 'scholar'; c.tie = 'warm';
  const cs = openCase(h, { role: 'accused', charge: 'theft', guilty: false, evidence: 50 });
  showScene(h, { kind: 'pe_court', at, t: 0, ci: c.id, name: c.name, stage: '대관', place: at, cid: cs.id }, { force: true }); resolveAll(h, 0);
  ok(cs.evidence < 50, `증인 ${cs.evidence}`);
  // 몰락한 이에게 돈을 주면 나중에 갚으러 온다
  const h2 = fresh(snap);
  const c2 = peersState(h2).list[0]; c2.alive = true; c2.path = 'merchant'; c2.fallen = true; c2.stage = 2; c2.place = L(h2).place; c2.lastMet = -999; c2.tie = 'none';
  for (const o of peersState(h2).list) if (o !== c2) o.place = 'solaris';
  let gave = false, repaid = false;
  for (let k = 0; k < 400 && !repaid; k++) {
    endMonth(h2, [{ id: 'rest' }]);
    if (!gave) { c2.lastMet = Math.min(c2.lastMet, -999); }
    for (let j = 0; j < 8 && h2.pendingEvent; j++) {
      const kind = L(h2).scene?.kind ?? h2.pendingEvent.id;
      let idx = 0;
      if (kind === 'pe_cross' || kind === 'pe_ask') { idx = 1; if (L(h2).scene?.mode === 'down' || kind === 'pe_ask') gave = true; }
      if (kind === 'pe_repay') repaid = true;
      resolveEvent(h2, rngOf(h2), kind === 'heir' ? 0 : idx);
    }
    if (gave && c2.tie === 'owes' && k % 12 === 0) { c2.fallen = false; c2.stage = Math.max(c2.stage, 2); }
    if (!c2.alive) break;
  }
  ok(gave, '몰락한 동세대를 만남');
  ok(repaid || !c2.alive, '갚으러 옴');
}

// 4. 대 잇기: 선대의 동세대는 뒤로, 새 동세대가 생긴다
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4520 });
  for (let k = 0; k < 40 * 12; k++) quiet(g);
  const s = peersState(g);
  const old = s.list.map((c) => c.name);
  const gen0 = s.gen, past0 = s.past.length; // 마흔 해 사이에 저절로 대가 바뀐 판도 있다
  runHooks('heir', g, rngOf(g), { ...me(g) });
  ok(s.gen === gen0 + 1 && s.list.length === 5 && s.past.length === Math.min(8, past0 + 1) && s.list.every((c) => c.gen === s.gen), `새 동세대 ${s.gen} ${s.list.length}`);
  ok(s.elders.length <= 2 && (s.elders.at(-1)?.list ?? []).every((c) => old.includes(c.name) && c.alive), '선대의 동세대');
  for (let k = 0; k < 24; k++) quiet(g);
  checkInfo(g);
  // 옛 저장: 서른 넘은 머리에 동세대가 없으면 지난 해들을 몰아 굴린다
  delete g.peers; runHooks('migrate', g);
  quiet(g);
  const s2 = peersState(g);
  ok(s2.built && s2.list.length === 5, '옛 저장 동세대');
  ok(playerAge(g) < 16 || s2.list.every((c) => !c.alive || c.path), `옛 저장 길 ${playerAge(g)}`);
  const g2 = JSON.parse(JSON.stringify(g)); ok(JSON.stringify(peersInfo(g2)) === JSON.stringify(peersInfo(g)), '저장 왕복');
}

// 5. 다른 종족: 엘프 집안이면 엘프 이름
{
  const g = newGame({ name: '아일린', sex: 'f', familyId: 'elf_exile', mode: 'free', seed: 4530 });
  quiet(g);
  const s = peersState(g);
  if (s.race === 'elf') ok(s.list.filter((c) => c.pid == null).every((c) => [...RACE_NAMES.elf.m, ...RACE_NAMES.elf.f].includes(c.name)), `엘프 이름 ${s.list.map((c) => c.name)}`);
  checkInfo(g);
}

console.log(`장면: ${JSON.stringify(scenes)}  줄 ${JSON.stringify(kinds)}  길 ${JSON.stringify(paths)}  죽음 ${deaths} 오름 ${rises} 몰락 ${falls} 짝 ${pairs}`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('peerstest OK');
