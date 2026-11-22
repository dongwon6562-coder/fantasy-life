import './lsshim.js';
import '../src/content.js';
// 34단계 도우미2 점검: 새 시대의 사람과 갈등. 기술은 천천히, 발명이 하나씩 쌓일 때 작은 갈등부터 열리는지,
// 큰 공장·신문·비밀 모임은 여러 발명이 다 모여야 열리는지, 플레이어 없이도 흐름이 도는지, 장면·줄 글이 깨지지 않는지, 옛 저장을 본다.
import { newGame, endMonth, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { openOf, newageLines, newageLine, newageInfo, newageState, VILLAGES } from '../src/newage/index.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  /.test(t);
const verbose = process.argv.includes('-v');
const samples = {}; const scenes = {}; const kinds = {};
const keep = (k, t) => { (samples[k] ??= []).length < 2 && !samples[k].includes(t) && samples[k].push(t); };

function resolveAll(g, pickIdx) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const kind = L(g).scene?.kind ?? pe.id;
    const mine = kind.startsWith('na_');
    if (mine) { scenes[kind] = (scenes[kind] ?? 0) + 1; ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.text} | ${pe.choices}`); }
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    if (mine && pickIdx != null) idx = Math.min(pickIdx, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); keep(kind, `${pe.text.slice(0, 80)}… [${pe.choices[idx]}] → ${String(out).slice(0, 90)}`); }
    ok(g.player.money >= 0, `money < 0 after ${kind}`);
    ok(Object.values(g.player.skills).every(Number.isFinite) && Object.values(g.player.stats).every(Number.isFinite), `기술·능력 NaN after ${kind}`);
  }
}
const setInv = (g, ids) => { g.history.inventions = [...ids]; };
function months(g, n, onMonth) {
  for (let m = 0; m < n && !g.over; m++) {
    endMonth(g, [{ id: 'rest' }]);
    resolveAll(g);
    const ls = newageLines(g);
    ok(Array.isArray(ls) && ls.length <= 2, 'shape');
    for (const x of ls) { kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line ${x.kind}: ${x.text}`); keep(`line:${x.kind}`, x.text); }
    const l1 = newageLine(g); ok(l1 === null || typeof l1 === 'string', 'line');
    onMonth?.(g, m);
  }
}
const EARLY = ['firestone', 'streetlamp', 'warmstone', 'manamill', 'press', 'signal', 'erngrind', 'plow'];

// 1. 발명이 없으면 아무것도 열리지 않는다
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3401 });
  setInv(g, []);
  ok(!Object.values(openOf(g)).some(Boolean), '발명 없이 열림');
  months(g, 36, (gg) => setInv(gg, []));
  const s = newageState(g);
  ok(!s.rich.length && !s.shops.length && !s.books.length && s.lit === 0, '발명 없이 흐름이 돔');
}
// 2. 문턱: 하나씩 열린다, 신문·공장·비밀 모임은 먼 훗날
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3402 });
  const o = (ids) => { setInv(g, ids); return openOf(g); };
  let x = o(['firestone']); ok(x.guild && !x.books && !x.hands && !x.generation && !x.rich, '화석만');
  x = o(['firestone', 'press']); ok(x.books && x.generation && !x.rich && !x.press, '인쇄기만으로 신문 시대가 열림');
  x = o(['erngrind']); ok(x.hands && !x.guild, '마을 방아');
  x = o(EARLY); ok(x.hands && x.books && x.guild && x.rich && !x.press && !x.breakers && !x.society, `앞쪽 여덟 ${JSON.stringify(x)}`);
  x = o([...EARLY, 'forge', 'healstone', 'ironcart']); ok(x.press && x.breakers && !x.society, '쇠수레 뒤');
  x = o([...EARLY, 'forge', 'healstone', 'ironcart', 'railroad']); ok(x.society, '쇠수레 길 뒤');
}
// 3. 앞쪽 발명만 있는 60년: 작은 갈등은 돌고, 먼 훗날 것은 없다
let early;
{
  const g = newGame({ name: '클라라', sex: 'f', familyId: 'farmer', mode: 'free', seed: 3403 });
  months(g, 60 * 12, (gg) => setInv(gg, EARLY));
  const s = newageState(g); early = s;
  const adopted = VILLAGES.reduce((a, v) => a + s.tools[v].length, 0);
  ok(adopted >= 3, `새 연장 들인 마을 ${adopted}`);
  ok(VILLAGES.some((v) => s.tools[v].length < 2) || s.gave.length <= VILLAGES.length, '연장');
  ok(s.left > 0, '떠난 사람');
  ok(s.lit >= 8 && s.lit <= 35, `글 아는 사람 60년 ${s.lit.toFixed(1)}`);
  ok(s.books.length >= 4, `책 다툼 ${s.books.length}`);
  ok(s.shops.length >= 3 && s.shops.some((x) => x.end), `공방 다툼 ${s.shops.length}`);
  ok(s.rich.length >= 2 && s.rich.length <= 14, `신흥 부자 ${s.rich.length}`);
  ok(!s.papers.length && !s.societies.length && !s.breaks.length, '앞쪽인데 신문·모임·기계 부수기');
  const info = newageInfo(g);
  ok(info.letters && info.villages.length && info.shops.length && !info.opinion, 'info 앞쪽');
  ok(JSON.stringify(info).match(/undefined|NaN/) == null, 'info 깨짐');
}
// 4. 먼 훗날: 신문·여론·비밀 모임·기계 부수기
{
  const g = newGame({ name: '요나스', sex: 'm', familyId: 'merchant', mode: 'free', seed: 3404 });
  const LATE = [...EARLY, 'forge', 'healstone', 'ironcart', 'railroad'];
  months(g, 40 * 12, (gg) => setInv(gg, LATE));
  const s = newageState(g);
  ok(s.papers.length >= 2, `신문 ${s.papers.length}`);
  ok(s.societies.length >= 1, `비밀 모임 ${s.societies.length}`);
  ok(s.breaks.length >= 1, `기계 부수기 ${s.breaks.length}`);
  const info = newageInfo(g);
  ok(info.opinion && JSON.stringify(info).match(/undefined|NaN/) == null, 'info 뒤쪽');
}
// 5. 장면마다 고를 것을 다 골라 본다
{
  const g = newGame({ name: '요나스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3405 });
  setInv(g, [...EARLY, 'forge', 'ironcart', 'railroad']);
  months(g, 24, (gg) => setInv(gg, [...EARLY, 'forge', 'ironcart', 'railroad']));
  const s = newageState(g);
  g.player.money = 800;
  s.shops.push({ id: 900, inv: 'press', place: 'ern', y: g.date.year, heat: 20, end: null });
  s.papers.push({ id: 901, name: '정오의 종', place: 'ern', lean: 'radical', y: g.date.year, closed: null });
  s.societies.push({ id: 902, name: '새벽 모임', idea: 'kin', place: 'ern', y: g.date.year, heat: 20, members: 10, end: null });
  const DATA = {
    na_hands: [{ pl: 'ern', tool: 'plow', boss: true }, { pl: 'ern', tool: 'erngrind', boss: false }],
    na_village: [{ pl: 'ern', tool: 'plow' }],
    na_book: [{ book: '쉬운 말로 옮긴 경전' }, { book: '찍어 낸 책력' }],
    na_guild: [{ sid: 900, inv: 'press', pl: 'ern', shop: '인쇄소', guild: '필경사' }],
    na_rich_offer: [{ old: '폰 리히트', sex: 'f' }],
    na_noble_debt: [{ rich: '그라우만 집안', sex: 'm' }],
    na_breakers: [{ pl: 'ern', mill: '쇠수레 공장' }],
    na_column: [{ pid: 901, name: '정오의 종', lean: 'radical' }],
    na_censor: [{ pid: 901 }],
    na_society: [{ sid: 902, name: '새벽 모임', idea: 'kin' }],
    na_raid: [{ sid: 902 }],
    na_parent: [{ id: g.player.id, name: '어머니' }],
    na_child: [{ id: g.player.id, name: '막내', pl: 'harfen' }],
  };
  for (const [kind, list] of Object.entries(DATA)) for (const d of list) for (let i = 0; i < 3; i++) {
    ok(showScene(g, { kind, at: L(g).place, t: 0, ...d }, { force: true }) && g.pendingEvent, `장면이 안 뜸 ${kind}`);
    resolveAll(g, i);
    g.player.money = Math.max(g.player.money, 800);
  }
  for (const k of Object.keys(DATA)) ok(scenes[k] > 0, `장면 ${k}`);
}
// 6. 저절로 뜨는 장면: 마을에 사는 어른에게 일손·책·조합 장면이 온다
{
  const natural = {};
  for (let k = 0; k < 2; k++) {
    const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3410 + k });
    const before = { ...scenes };
    months(g, 18 * 12, (gg) => setInv(gg, []));
    const s = newageState(g);
    g.player.skills.letters = 30; g.player.skills.farming = 40; g.player.money = Math.max(g.player.money, 200);
    for (const v of VILLAGES) { s.hands[v] = 40; s.holdout[v] = 60; }
    months(g, 25 * 12, (gg) => { setInv(gg, EARLY); if (!s.shops.some((x) => x.place === 'ern' && !x.end)) s.shops.push({ id: s.seq++, inv: 'firestone', place: 'ern', y: gg.date.year, heat: 10, end: null }); });
    for (const kk of Object.keys(scenes)) natural[kk] = (natural[kk] ?? 0) + scenes[kk] - (before[kk] ?? 0);
  }
  for (const k of ['na_hands', 'na_book', 'na_guild']) ok(natural[k] > 0, `저절로 안 뜸 ${k} ${JSON.stringify(natural)}`);
  ok(!natural.na_column && !natural.na_society && !natural.na_breakers, '앞쪽인데 먼 훗날 장면');
}
// 7. 옛 저장, 대 잇기
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3420 });
  delete g.newage; runHooks('migrate', g);
  ok(g.newage && Array.isArray(g.newage.shops) && g.newage.lit === 0 && g.newage.tools.ern, '옛 저장');
  g.newage.me.column = { paper: 1, lean: 'reform', n: 2, at: 0 }; g.newage.me.done.book = 5;
  runHooks('heir', g, rngOf(g), g.player);
  ok(!g.newage.me.column && !g.newage.me.done.book, '대 이으면 내 몫 비움');
  ok(playerAge(g) >= 0, 'age');
}

console.log(`장면 ${JSON.stringify(scenes)}`);
console.log(`줄 ${JSON.stringify(kinds)}`);
if (early) console.log(`앞쪽 60년: 연장 ${JSON.stringify(early.tools)} 떠남 ${early.left} 글 ${early.lit.toFixed(1)} 책 ${early.books.length} 공방 ${early.shops.length}(${early.shops.map((x) => x.end ?? '-').join(',')}) 부자 ${early.rich.length}`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('newagetest OK');
