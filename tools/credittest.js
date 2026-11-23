import './lsshim.js';
import '../src/content.js';

// 달마다 기세와 바깥 마을, 대 잇기, 저장 왕복, 짧은 플레이.
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
import { creditInfo, creditLine, creditState, creditMonth, jubilee, failBank, bankAt } from '../src/credit/index.js';
import { newBank, stage, SEATS } from '../src/credit/state.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { MAP_INFO } from '../src/art/map.js';
import { E } from '../src/estate/core.js';
import { iconName } from '../src/art/icons.js';

// 39단계 빚과 돈놀이 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 71) => newGame({ name: '루돌프', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const tick = (g, n = 1, news = []) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; creditMonth(g, (t) => news.push(t)); } return news; };
const R = (s) => makeRng({ s });
const S = creditState;
const textOK = (arr, what) => { for (const t of arr) check(!BAD.test(t), `${what}: ${t}`); };
const month = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; runHooks('afterMonth', g, R(i + 3)); } };

// 1. 플레이어 없이 150년: 집안이 서고 무너진다. 왕이 바뀌면 빚을 떼고, 탕감령이 내린다
{
  let made = 0, ended = 0, crownFall = 0;
  for (let s = 0; s < 4; s++) {
    const g = mk(300 + s), news = [];
    for (let i = 0; i < 12 * 150; i++) {
      if (i % 240 === 0) g.realm.balhart.war = !g.realm.balhart.war;
      if (i === 700) g.realm.ruler = 'rudolf';
      if (i === 1400) g.realm.ruler = 'erik';
      if (i === 900) (g.history.inventions ??= []).push('type');
      tick(g, 1, news);
    }
    textOK(news, '세상 소식'); textOK(S(g).log.map((x) => x.text), '돈 기록');
    made += S(g).banks.length + S(g).past.length; ended += S(g).past.length; crownFall += S(g).crown.repudiated;
    if (s < 2) console.log(`  150년 판 ${s + 1}: 지금 ${S(g).banks.map((b) => `${b.house}(${b.seat} ${Math.round(b.fortune)})`).join(', ')} / 끝난 ${S(g).past.map((x) => `${x.house}:${x.end}`).join(',')} / 소식 ${news.length}`);
  }
  check(made >= 6, `집안이 선다 (${made})`);
  check(ended >= 3, `집안이 무너진다 (${ended})`);
  check(crownFall >= 1, `새 왕실이 빚을 떼먹는 일 (${crownFall})`);
}
// 2. 시대: 금속 활자 뒤엔 은행가, 마석 은행
{
  const g = mk(5);
  check(stage(g) === 0, '처음엔 환전상');
  (g.history.inventions ??= []).push('type'); check(stage(g) === 1, '금속 활자 뒤 은행가');
  g.history.inventions.push('signal', 'stonebank'); check(stage(g) === 3, '마석 은행');
}
// 3. 내 삶: 전당포
const adult = () => { const g = mk(77); grown(g, 22); stay(g, 'harfen'); g.player.money = 10; L(g).gear.weapon = 2; L(g).gear.weaponName = '할아버지의 칼'; return g; };
{
  const g = adult();
  check(has(g, 'credit_pawn'), '주머니가 비면 전당포가 보인다');
  check(iconName(ACTIONS.find((a) => a.id === 'credit_pawn')) === 'ring', '전당포 아이콘');
  act(g, 'credit_pawn'); const m0 = g.player.money;
  scene(g, 'credit_pawn', 'put:weapon');
  check(g.player.money > m0 && L(g).gear.weapon === 0 && S(g).me.pawns.length === 1, '칼을 맡긴다');
  const a = structuredClone(g); a.player.money = 200; act(a, 'credit_pawn'); scene(a, 'credit_pawn', `get:${S(a).me.pawns[0].id}`);
  check(L(a).gear.weapon === 2 && !S(a).me.pawns.length, '칼을 찾는다');
  const b = structuredClone(g); month(b, 7); check(!S(b).me.pawns.length && L(b).gear.weapon === 0, '기한이 지나면 전당포 것');
  const c = mk(78); grown(c, 22); stay(c, 'ern'); c.player.money = 5; check(!has(c, 'credit_pawn'), '마을엔 전당포가 없다');
  const d = adult(); d.player.money = 300; check(!has(d, 'credit_pawn'), '돈이 넉넉하면 전당포 안 보임');
}
// 4. 은행가 집안: 맡기기·빌리기·무너지면 맡긴 돈이 사라지고 빚 문서는 고리대금업자에게
{
  const g = adult(); g.player.money = 600; L(g).houses.push('harfen');
  const bk = newBank(g, 'harfen', R(3), { fortune: 50 });
  check(has(g, 'credit_bank'), '은행가 집안이 있는 도시에선 보인다');
  act(g, 'credit_bank'); scene(g, 'credit_bank', 'put:300'); check(S(g).me.deposits[0]?.amt === 300, '맡긴다');
  g.player.money = 20; act(g, 'credit_bank'); scene(g, 'credit_bank', 'borrow:100');
  check(E(g).loans.some((l) => l.lender === 'bank' && l.bank === bk.id), '은행가 금고에서 빌린다');
  month(g, 3); check(S(g).me.deposits[0].amt > 300, '맡긴 돈에 이자');
  const news = []; failBank(g, bk, 'crown', (t) => news.push(t)); textOK(news, '무너짐');
  check(!S(g).me.deposits.length && E(g).loans.some((l) => l.lender === 'shark' && l.sold), '무너지면 예금이 사라지고 빚 문서가 넘어간다');
  // 빚쟁이 장면: 은행가 금고 빚
  const h = adult(); h.player.money = 0; const b2 = newBank(h, 'harfen', R(4)); E(h).loans.push({ id: 99, lender: 'bank', bank: b2.id, principal: 120, due: 0, missed: 0 });
  runHooks('afterMonth', h, R(5)); check(queued(h, 'debt_collector'), '은행가 빚도 독촉이 온다'); scene(h, 'debt_collector', 'flee');
}
// 5. 돈놀이: 빌려주고 이자를 받고, 떼이고, 받아 내고, 탕감하고, 내 은행을 세운다
{
  const g = adult(); g.player.money = 1500;
  check(has(g, 'credit_lend'), '돈이 있으면 돈놀이가 보인다');
  act(g, 'credit_lend'); const sc = L(g).queue.find((s) => s.kind === 'credit_lend');
  const lendKey = (x) => { showScene(x, L(x).queue.splice(L(x).queue.findIndex((s) => s.kind === 'credit_lend'), 1)[0], { force: true }); return L(x).scene.choices.find((c) => c.key.startsWith('lend:'))?.key; };
  void sc; const k1 = lendKey(g); check(!!k1, '빌리러 온 사람');
  if (k1) { resolveEvent(g, R(1), L(g).scene.choices.findIndex((c) => c.key === k1)); }
  check(S(g).me.book.out.length === 1, '빌려준다');
  const m0 = g.player.money; month(g, 13);
  check(S(g).me.book.earned > 0 && g.player.money > m0, `이자와 원금이 돌아온다 (${S(g).me.book.earned})`);
  S(g).me.book.bad.push({ who: '하르펜의 대장장이', amt: 80, at: 0 });
  const a = structuredClone(g); act(a, 'credit_lend'); scene(a, 'credit_lend', 'squeeze'); check(!S(a).me.book.bad.length && S(a).me.book.squeezed > 0, '받아 낸다');
  const b = structuredClone(g); act(b, 'credit_lend'); scene(b, 'credit_lend', 'forgive'); check(S(b).me.book.forgiven === 80, '탕감한다');
  const c = structuredClone(g); act(c, 'credit_lend'); scene(c, 'credit_lend', 'rate'); check(S(c).me.book.harsh, '이자를 올린다');
  const d = structuredClone(g); (d.history.inventions ??= []).push('type'); S(d).me.book.lent = 700; d.player.money = 900;
  act(d, 'credit_lend'); scene(d, 'credit_lend', 'found'); const mb = S(d).banks.find((x) => x.mine);
  check(!!mb && S(d).me.bank === mb.id, '내 은행 간판');
  const m1 = d.player.money; month(d, 2); check(d.player.money > m1, '내 은행이 조금씩 남긴다');
  const line = creditLine(d); check(!!line && !BAD.test(line), `내 은행 한 줄: ${line}`);
  // 전쟁 때 왕실이 손 벌린다
  d.realm.balhart.war = true; d.player.money = 500; fire(d, 'cr_crown_ask', 0);
  check(S(d).me.crownLent === 300, '왕실에 빌려준다');
  d.realm.balhart.war = false; for (let i = 0; i < 60 && S(d).me.crownLent > 0; i++) tick(d);
  check(S(d).me.crownLent < 300, '평화가 오면 왕실이 갚는다');
  // 탕감령
  const j = adult(); E(j).loans.push({ id: 7, lender: 'shark', principal: 90, due: mi0(j) + 6, missed: 0 }); S(j).me.book.out.push({ id: 1, who: '누군가', amt: 50, at: 0, due: 99999 });
  const jn = []; jubilee(j, (t) => jn.push(t)); textOK(jn, '탕감령');
  check(!E(j).loans.length && !S(j).me.book.out.length, '탕감령은 작은 빚을 없앤다');
}
function mi0(g) { return g.date.year * 12 + g.date.month; }
// 6. 사건
{
  const g = adult(); const bk = newBank(g, 'harfen', R(3), { fortune: 20 }); S(g).me.deposits.push({ bank: bk.id, amt: 200 });
  check(cond(g, 'cr_bank_wobble'), '흔들리는 금고 사건 조건'); const m0 = g.player.money; fire(g, 'cr_bank_wobble', 0); check(g.player.money === m0 + 180, '줄 서서 찾는다');
  const h = adult(); S(h).me.book.out.push({ id: 1, who: '하르펜의 수레꾼', amt: 35, at: 0, due: 99999 }); h.world.famine = true;
  check(cond(h, 'cr_debtor_plea'), '빚진 사람 사건 조건'); fire(structuredClone(h), 'cr_debtor_plea', 0); fire(h, 'cr_debtor_plea', 1);
}
// 7. 화면·지도·저장
{
  const g = adult(); newBank(g, 'harfen', R(3)); S(g).me.deposits.push({ bank: S(g).banks[0].id, amt: 50 });
  const info = creditInfo(g); check(info.banks.length === 1 && info.me.deposited === 50 && !BAD0.test(JSON.stringify(info)), '화면 한 장');
  const html = MAP_INFO.map((fn) => fn(g, { id: 'harfen' }) || '').join(''); check(html.includes(S(g).banks[0].house), '지도 설명');
  const back = decodeSave(encodeSave(g)); check(back.credit.banks.length === 1 && back.credit.me.deposits.length === 1, '저장 왕복');
  const old = structuredClone(g); delete old.credit; runHooks('migrate', old); check(Array.isArray(old.credit.banks), '옛 저장');
  check(SEATS.every((p) => typeof p === 'string'), '자리');
  void bankAt;
}
// 8. 한 판 흐름 (돈놀이를 즐기는 플레이어, 60년)
{
  const h = mk(41); let lines = 0;
  for (let m = 0; m < 12 * 60; m++) {
    if (h.over) { const hh = heirsOf(h)[0]; if (!hh) break; becomeHeir(h, rngOf(h), hh); if (h.over) break; }
    const acts = availableActions(h), pick = acts.find((x) => /^credit_/.test(x.id)) ?? acts.find((x) => x.id === 'work') ?? acts[0];
    endMonth(h, Array.from({ length: slotsFor(h) }, (_, i) => ({ id: (i === 0 ? pick : acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let k = 0; while (h.pendingEvent && k++ < 6) resolveEvent(h, rngOf(h), 0);
    if (m % 6 === 0) { const line = creditLine(h); if (line) { lines++; check(!BAD.test(line), `creditLine ${line}`); } }
  }
  const bk = S(h).me.book;
  console.log(`  60년 판: 집안 ${S(h).banks.length}, 끝난 ${S(h).past.length}, 빌려준 누계 ${bk.lent}, 이자 ${Math.round(bk.earned)}, 떼임 ${bk.lost}, 내 돈 ${h.player.money}, 한 줄 ${lines}`);
}
console.log(`credittest ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
