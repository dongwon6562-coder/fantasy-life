import './lsshim.js';
import '../src/content.js';
// 글과 예술 점검: 처음 상태, 구상(갈래·결 고르기), 매달리기와 끝내기(팔기·바치기·내걸기), 후원자(녹봉·마음 식음),
// 금서(교단·왕실, 세 갈래 대응), 옛 책 읽기, 해마다 평판(찬양 글은 임금이 바뀌면 깎인다, 금서가 풀린다, 재평가),
// 세상의 작가들, 대 잇기, 사건들, 예전 저장, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { WORLD_TICKS } from '../src/world.js';
import { faithState } from '../src/faith/index.js';
import { artsState as AS, artsInfo, artsLine, worksOf, bannedBooks, banOdds, publish } from '../src/arts/index.js';

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = e.text(g, ctx);
  check(!BAD.test(text), `${id} 본문: ${text}`);
  g.pendingEvent = { id, title: e.title, text, choices: e.choices.map((c) => c.label), choiceIdx: e.choices.map((c, i) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  crimeState(g).jailed = null;
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; g.pendingEvent = null; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const queued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); return out; };
// 대기열의 장면 하나를 띄우고 고른다
const scene = (g, kind, key, seed = 5) => {
  const q = L(g).queue, i = q.findIndex((s) => s.kind === kind);
  let s;
  // 앞 장면을 고르면 이번 달 몫 안에서 다음 장면이 바로 뜬다
  if (L(g).scene?.kind === kind && g.pendingEvent?.id === 'life_scene') s = L(g).scene;
  else {
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
  crimeState(g).jailed = null;
  return out;
};
const artsTick = WORLD_TICKS.find((t) => /g\.arts/.test(String(t)));
const yearTick = (g, say = () => {}) => { g.date.year += 1; g.date.month = 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; artsTick(g, makeRng({ s: 1 }), say, () => {}); };
const writer = (g) => { g.player.skills.letters = 60; g.player.skills.music = 40; g.player.skills.fineart = 50; g.player.stats.int = 60; g.player.stats.cha = 50; g.player.stats.sen = 50; };
const finish = (g, kind, theme, key = 'sell') => {
  act(g, 'arts_begin');
  scene(g, 'arts_pick', kind); scene(g, 'arts_theme', theme);
  const d = AS(g).draft;
  check(d && d.kind === kind && d.theme === theme, `${kind}/${theme} 원고가 안 생겼다`);
  for (let i = 0; i < 40 && AS(g).draft && !queued(g, 'arts_done'); i++) { act(g, 'arts_work', i); g.player.fatigue = 0; }
  const n = AS(g).works.length;
  scene(g, 'arts_done', key);
  check(AS(g).works.length === n + 1 && !AS(g).draft, `${kind} 작품이 세상에 안 나왔다`);
  return AS(g).works[AS(g).works.length - 1];
};

check(!!artsTick, '글과 예술의 세계 흐름을 못 찾았다');
// 1) 처음
{
  const g = newGame({ name: '처음', sex: 'm', familyId: 'farmer', mode: 'free', seed: 501 });
  const A = AS(g);
  check(A.works.length === 0 && !A.draft && !A.patron && A.fame === 0, '처음 상태가 이상하다');
  check(g.player.skills.fineart === 0, '그림과 조각 기술이 없다');
  check(!has(g, 'arts_begin') && !has(g, 'arts_work'), '아기가 작품을 짓는다');
  check(artsLine(g) === '' && !BAD.test(JSON.stringify(artsInfo(g)).replace(/null/g, '0')), '처음 화면 정보가 이상하다');
}
// 2) 구상 → 매달리기 → 끝내기 (갈래마다)
{
  const g = newGame({ name: '작가', sex: 'f', familyId: 'merchant', mode: 'free', seed: 502 });
  grown(g); stay(g, 'leocast'); writer(g);
  check(has(g, 'arts_begin'), '어른 작가가 작품을 구상하지 못한다');
  const money0 = g.player.money;
  const w1 = finish(g, 'history', 'truth', 'sell');
  check(g.player.money > money0, '필사본을 팔았는데 돈이 안 늘었다');
  check(w1.q >= 30 && w1.mine && w1.copies >= 3, `역사서 됨됨이·사본이 이상하다 (${w1.q}, ${w1.copies})`);
  check(AS(g).fame > 0 && (L(g).renown ?? 0) > 0, '작품을 냈는데 이름이 안 났다');
  check(/%/.test(artsLine(g)) === false && /작품/.test(artsLine(g)), `한 줄 요약: ${artsLine(g)}`);
  const w2 = finish(g, 'painting', 'love', 'give');
  check(w2.copies === 1 && w2.esteem > 0, '그림이 이상하다');
  const w3 = finish(g, 'poems', 'satire', 'sell');
  check(w3.watch > 0, '풍자 시집인데 누가 들여다볼 날이 안 잡혔다');
  // 서툰 솜씨는 서툰 작품
  const h = newGame({ name: '서툰', sex: 'm', familyId: 'farmer', mode: 'free', seed: 503 });
  grown(h); stay(h, 'harfen'); h.player.skills.letters = 16; h.player.stats.int = 25;
  const w4 = finish(h, 'poems', 'love');
  check(w4.q < w1.q, `서툰 사람의 시집이 더 좋다 (${w4.q} vs ${w1.q})`);
  // 마법서는 마력이 있어야
  check(!AS(h).works.some((w) => w.kind === 'grimoire'), '');
  h.player.manaAwakened = false; h.player.skills.magic = 50;
  act(h, 'arts_begin'); const sc = L(h).queue.find((s) => s.kind === 'arts_pick'); L(h).queue = L(h).queue.filter((s) => s !== sc);
  h.pendingEvent = null; showScene(h, sc, { force: true });
  check(!sc.choices.some((c) => c.key === 'grimoire'), '마력 없는 사람이 마법서를 고를 수 있다');
  h.pendingEvent = null; L(h).scene = null;
}
// 3) 후원자: 찾기, 녹봉, 바치기, 오래 안 지으면 등을 돌린다
{
  const g = newGame({ name: '후원', sex: 'm', familyId: 'merchant', mode: 'free', seed: 504 });
  grown(g); stay(g, 'leocast'); writer(g);
  finish(g, 'poems', 'love');
  AS(g).fame = 40; g.player.stats.cha = 90;
  check(has(g, 'arts_seek_patron'), '이름난 작가가 후원자를 찾지 못한다');
  let ok = false;
  for (let s = 0; s < 8 && !ok; s++) { AS(g).seekAt = 0; act(g, 'arts_seek_patron', s); ok = queued(g, 'arts_patron'); }
  check(ok, '후원 제안이 오지 않는다');
  scene(g, 'arts_patron', 'p0');
  const P = AS(g).patron;
  check(!!P && P.stipend > 0, '후원자가 안 생겼다');
  const m0 = g.player.money;
  runHooks('afterMonth', g, makeRng({ s: 1 }));
  check(g.player.money === m0 + P.stipend, '녹봉이 안 나온다');
  const want = P.want, kind = want === 'faith' ? 'poems' : want === 'truth' ? 'history' : 'poems';
  const mood0 = P.mood;
  finish(g, kind, want, 'patron');
  check(AS(g).patron.mood > mood0, '바라던 작품을 바쳤는데 후원자 마음이 그대로다');
  // 오래 아무것도 안 지으면
  AS(g).patron.lastWork = -999; AS(g).patron.mood = 1;
  runHooks('afterMonth', g, makeRng({ s: 1 }));
  check(!AS(g).patron, '오래 소식 없는 작가를 후원자가 계속 붙든다');
}
// 4) 금서: 교단 / 왕실, 세 갈래
{
  for (const [key, by] of [['recant', 'church'], ['hide', 'church'], ['defy', 'crown'], ['defy', 'church']]) {
    const g = newGame({ name: '금서', sex: 'f', familyId: 'merchant', mode: 'free', seed: 510 + key.length + by.length });
    grown(g); stay(g, 'solaris'); writer(g);
    const w = finish(g, 'painting', 'heresy', 'give');
    check(w.watch > 0, '금기 그림인데 들여다볼 날이 없다');
    const o = banOdds(g, w);
    check(o.church > 0.2, `성광국에서 금기 그림의 금서 확률이 너무 낮다 (${o.church})`);
    const sus0 = faithState(g).suspicion;
    L(g).queue.push({ kind: 'arts_ban', id: w.id, by, at: 'solaris' });
    scene(g, 'arts_ban', key);
    check(!!w.banned && w.banned.by === by, `금서가 되지 않았다 (${key}/${by})`);
    if (key === 'recant') check(faithState(g).suspicion <= sus0 && w.copies <= 1, '스스로 불살랐는데 의심이 늘거나 사본이 남았다');
    if (key === 'defy' && by === 'church') check(faithState(g).suspicion > sus0, '교단에 맞섰는데 의심이 그대로다');
    if (key === 'defy' && by === 'crown') check(g.court.disgrace > 0, '왕실에 맞섰는데 궁정 출입 금지가 없다');
    check(bannedBooks(g).length === 1, '금서 목록이 이상하다');
  }
  // 들여다보는 날이 오면 금서 장면이 뜬다 (확률이 높을 때)
  let hits = 0;
  for (let s = 0; s < 20; s++) {
    const g = newGame({ name: '심문', sex: 'm', familyId: 'merchant', mode: 'free', seed: 600 + s });
    grown(g); stay(g, 'solaris'); writer(g);
    const w = publish(g, makeRng({ s }), { kind: 'grimoire', theme: 'heresy', title: '그늘진 술식', prog: 16, need: 16, q: 1100, n: 16, start: 0, place: 'solaris' });
    w.watch = 1; w.copies = 20;
    runHooks('afterMonth', g, makeRng({ s }));
    if (queued(g, 'arts_ban')) hits++;
  }
  check(hits >= 4 && hits <= 19, `성광국 금기 마법서의 금서 장면 횟수가 이상하다 (${hits}/20)`);
}
// 5) 옛 책 읽기
{
  const g = newGame({ name: '독서', sex: 'm', familyId: 'merchant', mode: 'free', seed: 520 });
  grown(g); stay(g, 'leocast'); writer(g);
  for (let y = 0; y < 15; y++) yearTick(g);
  const lib = AS(g).works.filter((w) => !w.mine && !w.banned && !w.lost && ['history', 'grimoire', 'travel', 'poems'].includes(w.kind) && w.copies > 0);
  if (!lib.length) AS(g).works.push({ id: 999, kind: 'history', theme: 'truth', title: '옛 연대기', author: '하인츠 묄러', mine: false, gen: 0, year: 480, place: 'leocast', q: 70, esteem: 60, copies: 3, banned: null, lost: false });
  check(has(g, 'arts_read'), '왕립 서고에서 책을 읽을 수 없다');
  const l0 = g.player.skills.letters;
  act(g, 'arts_read');
  check(g.player.skills.letters > l0 && AS(g).read.length === 1, '책을 읽었는데 배운 게 없다');
}
// 6) 해마다: 찬양 글은 임금이 바뀌면 깎이고, 왕실 금령은 임금이 바뀌면 풀리고, 세상의 작가들이 작품을 낸다
{
  const g = newGame({ name: '세월', sex: 'f', familyId: 'merchant', mode: 'free', seed: 530 });
  grown(g); stay(g, 'leocast'); writer(g);
  const praise = finish(g, 'history', 'praise');
  const truth = finish(g, 'history', 'truth');
  praise.q = truth.q = 60; praise.esteem = truth.esteem = 50;
  const sat = finish(g, 'song', 'satire'); sat.banned = { by: 'crown', y: g.date.year - 5 }; sat.q = 70;
  praise.ruler = truth.ruler = sat.ruler = '옛 임금';
  const news = [];
  for (let y = 0; y < 10; y++) yearTick(g, (t) => news.push(t));
  check(praise.esteem < truth.esteem, `임금이 바뀌었는데 찬양 역사서가 진실한 역사서보다 높다 (${praise.esteem} vs ${truth.esteem})`);
  check(!sat.banned, '임금이 바뀌었는데 왕실 금령이 10년 동안 안 풀린다');
  const npc = AS(g).works.filter((w) => !w.mine);
  check(npc.length >= 2, `10년 동안 세상의 작가들이 작품을 거의 안 냈다 (${npc.length})`);
  for (const t of news) if (BAD.test(t)) { check(false, `소식 글 이상: ${t}`); break; }
  // 잊힌 걸작의 재평가
  const old = { id: 900, kind: 'poems', theme: 'love', title: '먼 데 있는 이의 사계', author: '옛 시인', mine: false, gen: 0, year: g.date.year - 60, place: 'harfen', q: 90, esteem: 10, copies: 30, banned: null, lost: false };
  AS(g).works.push(old);
  for (let y = 0; y < 60 && old.esteem < 50; y++) yearTick(g);
  check(old.esteem >= 50, `잊힌 걸작이 60년 동안 다시 읽히지 않는다 (${old.esteem})`);
  // 너무 많이 쌓이지 않는다
  for (let y = 0; y < 150; y++) yearTick(g);
  check(AS(g).works.length <= 70, `작품이 끝없이 쌓인다 (${AS(g).works.length})`);
  check(AS(g).works.some((w) => w.mine), '내 작품이 지워졌다');
}
// 7) 대 잇기: 작품은 남고, 원고·후원자는 사라지고, 선대의 책을 읽을 수 있다
{
  const g = newGame({ name: '선대', sex: 'm', familyId: 'merchant', mode: 'free', seed: 540 });
  grown(g); stay(g, 'harfen'); writer(g); L(g).placeNpcs = { ern: [], harfen: [], leocast: [] };
  const w = finish(g, 'travel', 'truth', 'give');
  act(g, 'arts_begin'); scene(g, 'arts_pick', 'poems'); scene(g, 'arts_theme', 'love');
  AS(g).patron = { kind: 'company', id: 'c', name: '푸른 저울 상회', stipend: 4, want: 'love', mood: 50, since: 0, lastWork: 0 };
  runHooks('heir', g, makeRng({ s: 1 }), g.player);
  L(g).gen = 2;
  check(!AS(g).draft && !AS(g).patron && AS(g).works.includes(w) && AS(g).legacyAt > 0, '대를 이은 뒤 작가 상태가 이상하다');
  check(artsInfo(g).mine[0].ancestor === true, '선대 작품이 선대 것으로 안 보인다');
  stay(g, 'ern');
  check(has(g, 'arts_read'), '서고가 없어도 집안 책장의 선대 책은 읽을 수 있어야 한다');
  const out = act(g, 'arts_read');
  check(/선대/.test(out), `선대 책 읽기 글: ${out}`);
}
// 8) 사건들
{
  const g = newGame({ name: '사건', sex: 'f', familyId: 'merchant', mode: 'free', seed: 550 });
  grown(g); stay(g, 'leocast'); writer(g);
  const w = finish(g, 'painting', 'love', 'give');
  w.esteem = 60; AS(g).fame = 40; g.player.money = 100;
  for (const [id, n] of [['arts_critic', 3], ['arts_reader', 3], ['arts_forger', 3]]) {
    check(cond(g, id), `${id} 조건이 안 맞는다`);
    for (let i = 0; i < n; i++) { stay(g, 'leocast'); fire(g, id, i, 10 + i); }
  }
  AS(g).patron = { kind: 'house', id: 'h1', name: '아르노 가문', stipend: 5, want: 'praise', mood: 50, since: -100, lastWork: 0 };
  check(cond(g, 'arts_rival'), 'arts_rival 조건이 안 맞는다');
  for (let i = 0; i < 3; i++) { stay(g, 'leocast'); if (AS(g).patron) fire(g, 'arts_rival', i, 20 + i); }
  AS(g).works.push({ id: 777, kind: 'grimoire', theme: 'heresy', title: '잊힌 신들의 술식 강해', author: '검은 수도사', mine: false, gen: 0, year: 490, place: 'solaris', q: 70, esteem: 40, copies: 3, banned: { by: 'church', y: 495 }, lost: false });
  g.history.powers.church = 70;
  check(cond(g, 'arts_forbidden_find'), 'arts_forbidden_find 조건이 안 맞는다');
  for (let i = 0; i < 3; i++) { stay(g, 'leocast'); AS(g).read = []; fire(g, 'arts_forbidden_find', i, 30 + i); }
  check(cond(g, 'arts_burning'), 'arts_burning 조건이 안 맞는다');
  for (let i = 0; i < 3; i++) { stay(g, 'leocast'); fire(g, 'arts_burning', i, 40 + i); }
}
// 9) 예전 저장
{
  const g = newGame({ name: '예전', sex: 'm', familyId: 'farmer', mode: 'free', seed: 560 });
  delete g.arts; delete g.player.skills.fineart;
  runHooks('migrate', g);
  check(!!g.arts && Array.isArray(g.arts.works) && g.player.skills.fineart === 0, '예전 저장을 못 채운다');
}
// 10) 40년 플레이 (작품 짓기를 자주 고르는 사람)
{
  let years = 0, made = 0;
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '평생', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 1095 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('arts_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.5) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1)));
    }
    years += m / 12; made += AS(g).made;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of AS(g).log) if (BAD.test(l.text)) { check(false, `작가 기록 이상: ${l.text}`); break; }
    check(!BAD.test(JSON.stringify(artsInfo(g)).replace(/null/g, '0')) && !BAD.test(artsLine(g)), '화면 정보에 이상한 값');
    check(worksOf(g).every((w) => w.title && w.author), '이름 없는 작품이 있다');
  }
  check(made >= 4, `40년 4판 동안 작품을 거의 못 냈다 (${made})`);
  console.log(`글과 예술 ${Math.round(years)}년 4판 플레이, 작품 ${made}점`);
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
