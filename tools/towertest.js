import './lsshim.js';
import '../src/content.js';
// 마탑과 금지된 마법 점검: 처음 상태, 탑 들기, 탑 일과 승급, 5서클 공인, 마도구, 검은 탑과 금지 마법,
// 들켰을 때, 스승·표결·교단 사건, 세상의 날, 화면용, 예전 저장, 대 잇기, 40년 흐름.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { WORLD_TICKS } from '../src/world.js';
import { towerState as TS, towerInfo, towerLine, promote, craftable } from '../src/tower/index.js';

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const shown = e.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.show || c.show(g, ctx));
  const text = e.text(g, ctx);
  check(!BAD.test(text), `${id} 본문: ${text}`);
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(({ c }) => c.label), choiceIdx: shown.map(({ i }) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && !BAD.test(out), `${id} 결과: ${out}`);
  crimeState(g).jailed = null;
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place = 'serenia') => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
// 장면 고르기: 달을 넘기며 뜬 장면에서 word가 든 선택지를 고른다
const pickScene = (g, word, place = 'serenia') => {
  for (let m = 0; m < 4; m++) {
    for (let k = 0; k < 8 && g.pendingEvent; k++) {
      const pe = g.pendingEvent;
      const i = pe.id === 'life_scene' ? pe.choices.findIndex((c) => c.includes(word)) : -1;
      const out = resolveEvent(g, rngOf(g), i >= 0 ? i : 0);
      if (i >= 0) { check(!BAD.test(out ?? ''), `장면 결과: ${out}`); stay(g, place); return out ?? ''; }
    }
    stay(g, place);
    endMonth(g, [{ id: 'rest' }]);
  }
  return null;
};
const mage = (g, magic = 25, mana = 30) => { g.player.manaAwakened = true; g.player.mana = mana; g.player.skills.magic = magic; g.player.stats.int = 70; g.player.stats.wil = 60; };

// 1) 처음
{
  const g = newGame({ name: '처음', sex: 'm', familyId: 'farmer', mode: 'free', seed: 201 });
  const T = TS(g);
  check(!T.member && T.taint === 0 && T.black === 0 && T.friction === 30 && T.forbidden.necro === 0, '처음 탑 상태가 이상하다');
  check(!has(g, 'tower_join') && !has(g, 'forbidden_rite'), '아기가 탑 일을 한다');
  check(towerLine(g) === '' && towerInfo(g).member == null, '처음 화면 줄이 비어 있지 않다');
}
// 2) 탑에 들고, 일하고, 오르고, 공인받고, 마도구를 만든다
{
  const g = newGame({ name: '견습', sex: 'f', familyId: 'merchant', mode: 'free', seed: 202 });
  grown(g); mage(g, 40, 60); stay(g);
  check(has(g, 'tower_join'), '세레니아에서 탑 문을 두드릴 수 없다');
  stay(g, 'harfen');
  check(!has(g, 'tower_join'), '하르펜에서 탑 문을 두드린다');
  stay(g);
  let joined = false;
  for (let i = 0; i < 6 && !joined; i++) {
    TS(g).rejectAt = -99;
    endMonth(g, [{ id: 'tower_join' }]);
    pickScene(g, '푸른 탑');
    joined = !!TS(g).member;
  }
  check(joined, '여섯 번 청해도 탑에 못 든다');
  const T = TS(g), M = T.member;
  check(M?.tower === 'blue' && M.master?.alive && M.rank === 0, `탑에 든 상태가 이상하다 ${JSON.stringify(M)}`);
  check(has(g, 'tower_duty') && !has(g, 'tower_join'), '들어간 뒤 탑 일 행동이 이상하다');
  const master0 = { ...M.master }; // 마도구를 만드는 몇 달 사이 스승이 세상을 떠날 수도 있어, 스승 사건 점검 전에 되살린다
  const money0 = g.player.money, merit0 = M.merit;
  stay(g);
  endMonth(g, [{ id: 'tower_duty' }, { id: 'tower_duty' }, { id: 'tower_duty' }]);
  check(M.merit > merit0 && M.merit <= merit0 + 12, `탑 일 공적이 이상하다 (${merit0}→${M.merit})`);
  check(g.player.money >= money0 + 2 - 50, '녹봉이 없다');
  // 승급: 공적은 넘쳐도 공인 서클이 모자라면 못 오른다
  M.merit = 100; g.magic ??= {}; g.magic.certified = 1;
  check(promote(g) == null && M.rank === 0, '공인 1서클로 정식 마도사가 되었다');
  g.magic.certified = 3;
  promote(g); promote(g);
  check(M.rank === 2, `공적 100, 공인 3서클인데 서열이 ${M.rank}`);
  // 5서클 공인
  g.magic.certified = 4; g.player.mana = 300; g.player.skills.magic = 80; g.player.money = 1000; g.player.stats.int = 90; g.player.stats.wil = 90;
  stay(g);
  check(has(g, 'tower_exam'), '5서클 공인 시험이 안 보인다');
  let passed = false;
  for (let i = 0; i < 8 && !passed; i++) { stay(g); g.player.money = 1000; endMonth(g, [{ id: 'tower_exam' }, { id: 'tower_exam' }]); for (let k = 0; k < 8 && g.pendingEvent; k++) resolveEvent(g, rngOf(g), 0); passed = g.magic.certified === 5; }
  check(passed && T.circleCert === 5, '5서클 공인을 여덟 번 쳐도 못 받는다');
  g.player.mana = 2000; g.player.skills.magic = 100; g.magic.certified = 6; T.circleCert = 6; stay(g);
  check(!has(g, 'tower_exam'), '7서클 공인 시험이 있다');
  // 마도구
  g.magic.certified = 3; g.player.mana = 100; g.player.skills.magic = 50; g.player.money = 500;
  check(craftable(g).includes('charm') && craftable(g).includes('ring') && !craftable(g).includes('mirror'), `만들 수 있는 것이 이상하다 ${craftable(g)}`);
  stay(g);
  endMonth(g, [{ id: 'tower_craft' }]);
  check(pickScene(g, '보호 부적') != null && T.craft?.id === 'charm', '부적을 고를 수 없다');
  for (let i = 0; i < 8 && T.craft; i++) { stay(g); g.player.money = 500; endMonth(g, [{ id: 'tower_craft' }, { id: 'tower_craft' }]); for (let k = 0; k < 8 && g.pendingEvent; k++) resolveEvent(g, rngOf(g), 0); }
  check(T.items.includes('charm') && T.made >= 1, '부적을 끝내 못 만든다');
  const info = towerInfo(g);
  check(info.member.towerName === '푸른 탑' && info.items[0].name === '보호 부적' && info.member.next && !BAD.test(JSON.stringify(info.log)), '화면 정보가 이상하다');
  check(!BAD.test(towerLine(g)) && towerLine(g).includes('푸른 탑'), `한 줄이 이상하다: ${towerLine(g)}`);
  // 스승 사건
  if (!M.master) M.master = { ...master0, alive: true };
  M.master.bond = 40; stay(g);
  check(cond(g, 'tower_master_lesson'), '스승의 가르침이 안 뜬다');
  fire(g, 'tower_master_lesson', 0); fire(g, 'tower_master_lesson', 1);
  check(cond(g, 'tower_master_errand'), '스승의 심부름이 안 뜬다');
  fire(g, 'tower_master_errand', 0); fire(g, 'tower_master_errand', 1);
  check(cond(g, 'tower_vote'), '원로회 표결이 안 뜬다');
  for (const c of [0, 1, 2]) fire(g, 'tower_vote', c, 30 + c);
  M.master.born = g.date.year - 70; g.date.month = 2; delete g.flags[`tower_md_${M.joined}`];
  check(cond(g, 'tower_master_death'), '늙은 스승의 죽음이 안 뜬다');
  fire(g, 'tower_master_death', 0);
  check(!M.master && !cond(g, 'tower_master_lesson'), '죽은 스승이 또 가르친다');
  // 교단 사건
  T.friction = 70; stay(g, 'harfen');
  check(cond(g, 'tower_inquisitor') && cond(g, 'tower_burning') && cond(g, 'tower_clinic'), '교단 사건이 안 뜬다');
  for (const c of [0, 1, 2]) { stay(g, 'harfen'); fire(g, 'tower_inquisitor', c, 40 + c); }
  for (const c of [0, 1, 2]) { stay(g, 'harfen'); fire(g, 'tower_burning', c, 50 + c); }
  for (const c of [0, 1]) { stay(g, 'harfen'); fire(g, 'tower_clinic', c, 60 + c); }
  // 스승 고발 (새 스승을 붙여서)
  M.master = { name: '시험 스승', sex: 'm', circle: 4, bond: 10, alive: true, tower: 'blue', born: g.date.year - 50 };
  stay(g);
  fire(g, 'tower_master_errand', 2);
  check(!M.master, '스승을 고발했는데 그대로다');
}
// 3) 검은 탑, 금지 마법, 들킴
{
  const g = newGame({ name: '검은', sex: 'm', familyId: 'farmer', mode: 'free', seed: 203 });
  grown(g); mage(g, 50, 80); stay(g, 'harfen'); g.player.stress = 60;
  check(!has(g, 'forbidden_rite'), '검은 탑을 모르는데 금지 마법을 쓴다');
  check(cond(g, 'tower_black_invite'), '검은 봉투가 안 온다');
  fire(g, 'tower_black_invite', 0);
  const T = TS(g);
  check(T.black === 2 && has(g, 'forbidden_rite'), '검은 탑에 들었는데 금지 마법이 없다');
  for (const k of ['죽은 자의 술', '피의 술', '정신의 술']) {
    stay(g, 'harfen');
    endMonth(g, [{ id: 'forbidden_rite' }]);
    T.pendingExpose = false;
    check(pickScene(g, `${k}을 더 깊이`, 'harfen') != null, `${k}을 익힐 수 없다`);
  }
  check(T.forbidden.necro === 1 && T.forbidden.blood === 1 && T.forbidden.mind === 1 && T.taint > 10, `금지 마법을 익힌 흔적이 이상하다 ${JSON.stringify(T.forbidden)} ${T.taint}`);
  g.player.skills.magic = 90;
  for (let i = 0; i < 6; i++) {
    stay(g, 'harfen');
    endMonth(g, [{ id: 'forbidden_rite' }]);
    T.pendingExpose = false;
    pickScene(g, i < 3 ? '더 깊이' : '을 쓴다', 'harfen');
  }
  const taint = T.taint, seal0 = g.realm.seal;
  for (let i = 0; i < 6; i++) { stay(g, 'harfen'); endMonth(g, [{ id: 'forbidden_rite' }]); T.pendingExpose = false; pickScene(g, '피의 술을 쓴다', 'harfen'); g.player.injuries = []; }
  check(T.taint > taint, '금지 마법을 써도 얼룩이 늘지 않는다');
  check(g.realm.seal <= seal0 + 0.5, '금지 마법이 봉인을 깎지 않는다');
  check(towerInfo(g).forbidden.length === 3 && towerInfo(g).taintWord, '금지 마법이 화면에 안 보인다');
  // 들켰다: 네 갈래
  for (const c of [0, 1, 2, 3]) {
    const h = JSON.parse(JSON.stringify(g)); setNextId(h.nextId); runHooks('migrate', h);
    stay(h, 'harfen'); h.player.money = 200; TS(h).pendingExpose = true;
    if (c === 1) { h.player.skills.sword = 100; h.player.stats.str = 90; }
    check(cond(h, 'tower_exposed'), '들킨 사건이 안 뜬다');
    fire(h, 'tower_exposed', c, 70 + c);
    check(!TS(h).pendingExpose && TS(h).exposed >= 1, `들킨 뒤 기록이 없다 (${c})`);
    if (c === 0) check(TS(h).hunted > 0 && L(h).travel, '달아났는데 쫓기지 않는다');
    if (c === 2) check(TS(h).forbidden.blood === 0 && TS(h).black === -1, '털어놓았는데 금지 마법이 남았다');
    if (c === 0) { stay(h, 'serenia'); check(!availableActions(h).some((a) => a.id === 'tower_join'), '쫓기는 몸이 탑에 들려 한다'); }
  }
}
// 4) 세상의 날: 교단이 봉인 회의를 쥐면 날이 선다
{
  const g = newGame({ name: '날', sex: 'f', familyId: 'farmer', mode: 'free', seed: 204 });
  const T = TS(g); g.seal ??= {}; g.seal.council = 'church';
  const news = [], rng = makeRng({ s: 5 });
  for (let i = 0; i < 240; i++) for (const t of WORLD_TICKS) { g.seal.council = 'church'; t(g, rng, (x) => news.push(x), () => {}); }
  check(T.friction > 40, `교단이 회의를 쥐어도 날이 안 선다 (${T.friction})`);
  check(news.every((x) => !BAD.test(x)), '세상 소식 글이 이상하다');
}
// 5) 예전 저장과 대 잇기
{
  const g = newGame({ name: '저장', sex: 'm', familyId: 'farmer', mode: 'free', seed: 205 });
  const c = JSON.parse(JSON.stringify(g)); delete c.tower; setNextId(c.nextId);
  runHooks('migrate', c);
  check(c.tower?.forbidden?.mind === 0 && c.tower.friction === 30, '예전 저장에 탑 상태가 채워지지 않는다');
  const T = TS(g);
  T.member = { tower: 'red', rank: 2, merit: 50, joined: 0, master: null }; T.forbidden.blood = 2; T.taint = 50; T.items = ['charm'];
  runHooks('heir', g);
  check(!T.member && T.forbidden.blood === 0 && T.taint === 0 && T.items.includes('charm'), '대를 이었는데 탑 자리·금지 마법이 남거나 마도구가 사라졌다');
}
// 6) 40년: 아무 행동이나 해도 깨지지 않는다
{
  let members = 0, forb = 0, years = 0;
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '세월', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 980 + run });
    if (run >= 2) { grown(g, 18); mage(g, 35, 50); stay(g); if (run === 3) TS(g).black = 2; }
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('tower_') || a.id === 'forbidden_rite');
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.5) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1)));
    }
    years += m / 12;
    const T = TS(g);
    if (T.member || T.log.some((l) => l.text.includes('들어갔다'))) members++;
    if (Object.values(T.forbidden).some((v) => v > 0)) forb++;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of T.log) if (BAD.test(l.text)) { check(false, `탑 기록 이상: ${l.text}`); break; }
    check(Number.isFinite(T.friction) && Number.isFinite(T.taint) && T.taint >= 0 && T.taint <= 100, '탑 숫자가 깨졌다');
    check(!BAD.test(JSON.stringify(towerInfo(g)).replace(/null/g, '0')), '화면 정보에 이상한 값');
    check((g.magic?.certified ?? 0) <= 6, '7서클 공인이 나왔다');
  }
  console.log(`탑 ${Math.round(years)}년 4판: 탑에 든 판 ${members}, 금지 마법 남은 판 ${forb}`);
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
