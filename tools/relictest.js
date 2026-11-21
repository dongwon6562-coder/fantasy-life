import './lsshim.js';
import '../src/content.js';
// 성유물 점검 (1분 안): 처음 자리, 유물이 스스로 옮겨 다님(도굴꾼·수집가·교단·내전·검은 새벽·큰 인물), 봉인과의 끈, 소문 사건과 소문 쫓기(뜻 있는 형편에서만 보이는 행동),
// 찾기·사기·훔치기·알리기, 유물이 주인을 고르거나 거부함, 힘과 대가, 바치기·팔기, 돌려 달라는 자들, 성검을 노리는 자, 가짜, 대 잇기, 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { makePerson } from '../src/npc.js';
import { becomeHeir } from '../src/heir.js';
import { playerPower } from '../src/adventure/combat.js';
import { relicState as RS, relicInfo, relicLine, relicMonth, moveRelic, relicScore, take, RELICS, RELIC_IDS } from '../src/relic/index.js';
import { encodeSave, decodeSave } from '../src/save.js';

const T0 = Date.now();
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
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
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
const fresh = (seed, name = '유물') => newGame({ name, sex: 'm', familyId: 'farmer', mode: 'free', seed });
const adult = (seed, place = 'gorge', v = 50) => { const g = fresh(seed); grown(g); stay(g, place); for (const k of Object.keys(g.player.stats)) g.player.stats[k] = v; g.player.skills.sword = v; g.player.money = 3000; g.player.familyMoney = 0; g.player.injuries = []; L(g).pendingDeath = null; L(g).queue = []; return g; };
const ticks = (g, n, until = () => false) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; relicMonth(g); if (until()) return i + 1; } return n; };
const okInfo = (g) => check(!BAD.test(JSON.stringify(relicInfo(g)).replace(/null/g, '0')) && !BAD.test(String(relicLine(g) ?? '')), `화면 정보: ${JSON.stringify(relicInfo(g)).slice(0, 300)}`);
const rx = (g, id) => RS(g).r[id];
const die = (g) => { (L(g).ancestors ??= []).push({ name: g.player.name, lastName: g.player.lastName, born: g.date.year - 40, died: g.date.year }); };
const strong = (g) => { for (const k of Object.keys(g.player.stats)) g.player.stats[k] = 99; g.player.skills.sword = 99; };

// 1) 처음 자리
{
  const g = fresh(8001);
  check(RELIC_IDS.length === 5, '성유물 다섯');
  check(rx(g, 'rl_sword').holder === 'lost' && rx(g, 'rl_book').holder === 'church' && rx(g, 'rl_axe').holder === 'dwarf', '처음 자리');
  check(Object.keys(RS(g).me.known).length === 0 && relicLine(g) === null, '처음엔 아무것도 모른다');
  okInfo(g);
}
// 2) 스스로 옮겨 다닌다
{
  const g = fresh(8010);
  ticks(g, 12 * 300, () => rx(g, 'rl_sword').holder !== 'lost');
  check(rx(g, 'rl_sword').holder === 'robbers' && rx(g, 'rl_sword').place === 'gorge', '묻힌 것을 도굴꾼이 파낸다');
  ticks(g, 400, () => rx(g, 'rl_sword').holder !== 'robbers');
  check(!['robbers', 'me'].includes(rx(g, 'rl_sword').holder), `도굴꾼은 판다 (${rx(g, 'rl_sword').holder})`);
  const h = fresh(8011); h.realm.succession = 'civilwar';
  ticks(h, 12 * 60, () => rx(h, 'rl_shield').holder !== 'crown');
  check(rx(h, 'rl_shield').holder !== 'crown', '내전에 왕실 보물이 흩어진다');
  // 큰 인물이 죽으면 다시 묻힌다
  const k = fresh(8012), p = k.legends.list.find((x) => x.kind === 'dwarf');
  moveRelic(k, 'rl_axe', 'legend', { legend: p.id, place: p.at });
  p.alive = false; ticks(k, 1);
  check(rx(k, 'rl_axe').holder === 'lost' && rx(k, 'rl_axe').place, '주인이 죽으면 묻힌다');
  // 봉인: 검은 새벽이 쥐면 깎이고, 교단이 기도서를 쥐면 버틴다
  const s = fresh(8013); s.realm.seal = 80; moveRelic(s, 'rl_ring', 'cult', { place: null }); moveRelic(s, 'rl_book', 'cult', { place: null });
  ticks(s, 12, () => false);
  check(s.realm.seal < 80, '검은 새벽이 쥐면 봉인이 깎인다');
  const t = fresh(8014); t.realm.seal = 80; ticks(t, 12); check(t.realm.seal >= 80, '교단의 기도서');
  // 60년에 몇 번만
  const w = fresh(8015); ticks(w, 12 * 60);
  const moves = Object.values(RS(w).r).reduce((a, x) => a + x.moves, 0);
  check(moves <= 20, `드물게 옮긴다 (${moves})`);
  okInfo(w);
}
// 3) 소문, 소문 쫓기 (뜻 있는 형편에서만)
{
  const g = adult(8020, 'hammer');
  check(!has(g, 'relic_trail') && !has(g, 'relic_offer'), '평소엔 성유물 행동이 없다');
  check(cond(g, 'relic_rumor'), '이웃 고장(구렁목)의 묻힌 검 소문');
  fire(g, 'relic_rumor', 1);
  check(RS(g).me.known.rl_sword?.place === 'gorge', '소문을 들었다');
  check(!has(g, 'relic_trail'), '그 고장에 가야 쫓는다');
  stay(g, 'gorge');
  check(has(g, 'relic_trail'), '소문의 고장에서 쫓는다');
  act(g, 'relic_trail'); scene(g, 'relic_trail', 'leave');
  strong(g); let n = 0;
  while (rx(g, 'rl_sword').holder !== 'me' && n++ < 30) { L(g).queue = []; act(g, 'relic_trail', n); scene(g, 'relic_trail', 'crew', n); }
  check(rx(g, 'rl_sword').holder === 'me' && queued(g, 'relic_choose'), '찾아내면 손에 들고, 유물이 시험한다');
  check(!has(g, 'relic_trail'), '찾은 뒤엔 쫓을 것이 없다');
  const p0 = playerPower(g);
  scene(g, 'relic_choose', 'reach');
  check(rx(g, 'rl_sword').bond === 'chosen' && playerPower(g) >= p0 + RELICS.rl_sword.power - 1, '검이 나를 고르고 힘을 준다');
  check(/새벽빛/.test(relicLine(g) ?? ''), `머리글 ${relicLine(g)}`);
  okInfo(g);
  // 도굴꾼에게서: 사기, 훔치기, 알리기
  for (const [i, key] of ['buy', 'steal', 'report'].entries()) {
    const h = adult(8030 + i, 'graubel'); if (key === 'steal') strong(h);
    moveRelic(h, 'rl_ring', 'robbers', { place: 'graubel' }); RS(h).me.known = {}; moveRelic(h, 'rl_ring', 'robbers', { place: 'graubel', heard: true });
    check(has(h, 'relic_trail'), '도굴꾼 소문');
    act(h, 'relic_trail'); scene(h, 'relic_trail', key, 1);
    if (key === 'buy') check(rx(h, 'rl_ring').holder === 'me', '사들였다');
    if (key === 'report') check(rx(h, 'rl_ring').holder === 'church', '교단에 알렸다');
  }
  // 소문이 낡으면 행동도 없다
  const k = adult(8035, 'graubel'); moveRelic(k, 'rl_ring', 'robbers', { place: 'graubel', heard: true }); moveRelic(k, 'rl_ring', 'collector');
  check(!has(k, 'relic_trail'), '유물이 떠났으면 쫓을 수 없다');
}
// 4) 유물이 거부한다, 대가, 바치기·팔기
{
  const g = adult(8040, 'serenia', 20);
  take(g, 'rl_ring', 'given');
  scene(g, 'relic_choose', 'reach');
  check(rx(g, 'rl_ring').bond === 'refused' && g.player.injuries.length > 0, '약한 손은 거부한다');
  check(relicScore(g, 'rl_ring') < RELICS.rl_ring.need, '점수');
  check(has(g, 'relic_offer'), '받아 줄 곳에서 내놓는다');
  act(g, 'relic_offer'); scene(g, 'relic_offer', 'sell:rl_ring');
  check(rx(g, 'rl_ring').holder === 'tower' && RS(g).me.sold === 1, '마탑에 팔았다');
  const h = adult(8041, 'solaris'); strong(h); h.faith && (h.faith.god = 'solar', h.faith.devotion = 90);
  take(h, 'rl_book', 'given'); scene(h, 'relic_choose', 'reach');
  check(rx(h, 'rl_book').bond === 'chosen', '독실한 손은 기도서가 고른다');
  if (h.faith) { h.faith.god = 'earth'; const s0 = h.faith.suspicion ?? 0; runHooks('afterMonth', h, makeRng({ s: 1 })); check(h.faith.suspicion > s0, '믿음을 바꾸면 기도서가 무겁다'); h.faith.god = 'solar'; }
  h.realm.seal = 50;
  act(h, 'relic_offer'); scene(h, 'relic_offer', 'give:rl_book');
  check(rx(h, 'rl_book').holder === 'church' && h.realm.seal > 50 && RS(h).me.given === 1, '교단에 바치면 봉인이 조금 버틴다');
  const k = adult(8042, 'ern'); take(k, 'rl_axe', 'given'); scene(k, 'relic_choose', 'wrap');
  check(rx(k, 'rl_axe').bond === null && !has(k, 'relic_offer'), '싸 두면 시험도 없다, 받아 줄 곳이 아니면 못 내놓는다');
}
// 5) 사건: 돌려 달라는 자들, 성검을 노리는 자, 가짜
{
  for (const ch of [0, 1]) {
    const g = adult(8050 + ch, 'harfen'); if (!ch) strong(g);
    take(g, 'rl_axe', 'given'); L(g).queue = [];
    check(cond(g, 'relic_claim'), '돌려 달라는 자들');
    fire(g, 'relic_claim', ch, ch);
    if (ch === 1) check(rx(g, 'rl_axe').holder === 'dwarf', '값을 받고 돌려준다');
  }
  for (const ch of [0, 1]) {
    const g = adult(8055 + ch, 'harfen'); strong(g); take(g, 'rl_sword', 'given'); L(g).queue = []; rx(g, 'rl_sword').bond = 'chosen';
    check(cond(g, 'relic_challenge'), '성검을 노리는 자');
    fire(g, 'relic_challenge', ch, ch);
  }
  for (const ch of [0, 1, 2]) {
    const g = adult(8060 + ch, 'harfen');
    check(cond(g, 'relic_fake'), '장터의 가짜');
    fire(g, 'relic_fake', ch, ch);
    if (ch === 1) check(RS(g).me.fakes === 1, '가짜를 샀다');
  }
  const n = adult(8065, 'ern'); check(!cond(n, 'relic_claim') && !cond(n, 'relic_challenge'), '유물이 없으면 오지 않는다');
}
// 6) 대 잇기, 저장 왕복, 예전 저장
{
  const g = adult(8070, 'ern'); strong(g); take(g, 'rl_shield', 'given'); L(g).queue = []; rx(g, 'rl_shield').bond = 'chosen';
  const kid = makePerson(makeRng({ s: 3 }), { ageMonths: 20 * 12, lastName: g.player.lastName });
  g.people.push(kid); me(g).childIds.push(kid.id); g.player.familyIds.push(kid.id); kid.known = true;
  const back = decodeSave(encodeSave(g)); runHooks('migrate', back, makeRng({ s: 1 }));
  check(back.relic.r.rl_shield.holder === 'me' && back.relic.r.rl_shield.bond === 'chosen', '저장 왕복');
  die(g); becomeHeir(g, makeRng({ s: 4 }), kid);
  if (!g.over) check(rx(g, 'rl_shield').holder === 'me' && rx(g, 'rl_shield').bond === null && queued(g, 'relic_choose'), '대를 이으면 유물은 남고 다시 시험받는다');
  const h = fresh(8071); delete h.relic; runHooks('migrate', h, makeRng({ s: 1 }));
  check(!!h.relic && Object.keys(h.relic.r).length === 5, '예전 저장을 채운다');
  const k = fresh(8072); delete k.relic.r.rl_ring; k.relic.r.rl_x = {}; k.relic.r.rl_axe.holder = '??'; k.relic.r.rl_book.bond = 'chosen'; k.relic.me.known.rl_x = {};
  runHooks('migrate', k, makeRng({ s: 1 }));
  check(k.relic.r.rl_ring && !k.relic.r.rl_x && k.relic.r.rl_axe.holder === 'lost' && k.relic.r.rl_book.bond === null && !k.relic.me.known.rl_x, '빠지고 이상한 것을 고친다');
  okInfo(k);
}
// 7) 짧은 플레이 (2판 × 12년)
{
  const seen = {};
  for (let run = 0; run < 2; run++) {
    const g = newGame({ name: '평생', sex: run ? 'm' : 'f', familyId: ['farmer', 'merchant'][run], mode: 'free', seed: 8197 + run });
    grown(g, 16); stay(g, ['gorge', 'barka'][run]); g.player.money += 1500;
    if (run) moveRelic(g, 'rl_book', 'robbers', { place: 'barka', heard: true }); else moveRelic(g, 'rl_sword', 'lost', { place: 'gorge', heard: true });
    for (let m = 0; m < 12 * 12 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('relic_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.6) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) { const kind = L(g).scene?.kind ?? g.pendingEvent.id; seen[kind] = (seen[kind] ?? 0) + 1; check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title) && g.pendingEvent.choices.every((c) => !BAD.test(c)), `장면 글 ${kind}: ${g.pendingEvent.text}`); resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1))); }
      for (const r of g.lastResults ?? []) if (BAD.test(r.text)) { check(false, `결과 글 ${r.name}: ${r.text}`); break; }
      if (!Number.isFinite(g.player.money) || g.player.money < 0) { check(false, `돈 ${g.player.money}`); break; }
    }
    for (const l of RS(g).log) if (BAD.test(l.text)) { check(false, `유물 기록 이상: ${l.text}`); break; }
    for (const n of g.news ?? []) if (BAD.test(n.text)) { check(false, `소식 글 이상: ${n.text}`); break; }
    okInfo(g);
  }
  console.log(`장면 ${Object.keys(seen).filter((k) => k.startsWith('relic_')).join(',')}`);
}
const sec = Math.round((Date.now() - T0) / 1000);
check(sec < 60, `1분 안 (${sec}초)`);
console.log(fail ? `FAIL ${fail}` : `OK (${sec}초)`);
if (fail) process.exit(1);
