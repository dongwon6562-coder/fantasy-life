import '../src/content.js';
// 48단계 도우미4: 어른의 삶을 해 보며 고친 것들이 다시 생기지 않게 (1초 안)
import { newGame, endMonth, rngOf } from '../src/game.js';
import { ACTIONS } from '../src/actions.js';
import { startDuel, KID_ROUND, MAX_ROUND } from '../src/duel/duel.js';
import { openerIds, openerLines, opener } from '../src/narrative/openers.js';
import { art48, plate47 } from '../src/art/vignette.js';
import { LINES, ACT_KIND } from '../src/senses/data.js';
import * as UT from '../src/underworld/text.js';
import * as T from '../src/narrative/actions-text.js';

let bad = 0;
const fail = (...a) => { bad++; console.log('FAIL', ...a); };
const t0 = Date.now();

// 1) 그림: 도박판·주점·글쓰기가 음유시인·마법 공부 판을 빌려 쓰지 않는다. 늑대 부족 야영지의 일자리·잠자리에 마물 판이 뜨지 않는다
if (art48('contest_gamble') !== undefined) fail('art48 should not touch contest_gamble (BY_SCENE)');
for (const [k, want] of [['housing', null], ['seek_job', null], ['spring_flood', 'nature:flood'], ['trade_caravan', 'carrier:yard']]) if (art48(k) !== want) fail('art48', k, art48(k));
if (art48('city_story', '항구 술집') !== 'tavern:hall') fail('city_story 술집');
if (art48('city_story', '고해실') !== 'chapel') fail('city_story 고해실');
if (plate47('sc_write', '') !== 'scholar:write') fail('plate47 sc_write');

// 2) 감각 글: 공사장·들·약탕·미궁 일에 밭·손님·비 이야기가 끼지 않는다
for (const id of ['works_labor', 'jail_labor', 'house_build']) if (ACT_KIND[id] !== 'site') fail('site kind', id);
for (const id of ['apo_brew', 'brew_make']) if (ACT_KIND[id] !== 'still') fail('still kind', id);
if (ACT_KIND.delve !== 'depths') fail('delve kind');
for (const e of LINES) {
  if (!Array.isArray(e.k) || typeof e.t !== 'string') continue;
  if ((e.k.includes('site') || e.k.includes('wild')) && /밭|고랑|괭이/.test(e.t)) fail('farm line on site/wild', e.t);
  if (e.k.includes('still') && /손님|그릇을 닦/.test(e.t)) fail('guest line on still', e.t);
  if (e.k.includes('depths') && /비에|빗|눈발|볕|바닷바람/.test(e.t)) fail('weather line on depths', e.t);
}

// 3) 글 묶음 크기: 옥살이·탈옥·쉬기 글이 몇 줄뿐이라 되풀이되던 것
if (UT.JAIL_ENDURE.length < 10) fail('JAIL_ENDURE', UT.JAIL_ENDURE.length);
if (!Array.isArray(UT.ESCAPE_FAIL) || UT.ESCAPE_FAIL.length < 3) fail('ESCAPE_FAIL');
if (T.REST.filter((e) => typeof e === 'string' || (e.bands ?? ['adult']).includes('adult')).length < 10) fail('adult REST lines');

// 4) 길바닥 잠자리: 달마다 같은 줄이 뜨지 않고, 한 달 치 방값만 모이면 다시 방을 얻었다가 쫓겨나는 되풀이가 없다
{
  const g = newGame({ name: '점검', sex: 'f', familyId: 'farmer', mode: 'once', seed: 4811 });
  g.people.find((p) => p.isPlayer).ageMonths = 20 * 12;
  for (const id of g.player.familyIds) { const p = g.people.find((x) => x.id === id); if (p) p.alive = false; }
  g.life.home = 'street'; g.life.place = 'harfen'; g.player.money = 0;
  let lines = 0;
  for (let m = 0; m < 12; m++) { g.pendingEvent = null; const r = endMonth(g, [{ id: 'rest' }]); lines += r.filter((x) => x.name === '잠자리').length; if (g.over) break; }
  if (lines > 5) fail('street line every month', lines);
  g.player.money = 4; g.pendingEvent = null; endMonth(g, [{ id: 'rest' }]);
  if (g.life.home !== 'street') fail('re-rented with one month of money');
}

// 5) 탈옥: 붙잡힌 뒤 석 달은 다시 못 한다
{
  const esc = ACTIONS.find((a) => a.id === 'jail_escape');
  const g = newGame({ name: '점검', sex: 'm', familyId: 'farmer', mode: 'once', seed: 4812 });
  g.crime ??= {};
  const C = g.crime;
  C.jailed = { place: 'harfen', months: 6, total: 6, watchUntil: g.date.year * 12 + g.date.month + 2 };
  if (esc.available(g)) fail('escape available while watched');
  C.jailed.watchUntil = 0;
  if (!esc.available(g)) fail('escape not available after watch ends');
}

// 6) 아이 목검 대련: 다섯 합이면 끝나고, 15살 아래는 한 해에 한 번만 청할 수 있다
{
  const g = newGame({ name: '점검', sex: 'm', familyId: 'fallen_knight', mode: 'once', seed: 4813 });
  g.people.find((p) => p.isPlayer).ageMonths = 12 * 12;
  startDuel(g, rngOf(g), { kind: 'spar', title: '목검 대련', foe: { name: '상대', skill: 20 } });
  if (g.duel.maxRound !== KID_ROUND) fail('kid duel round cap', g.duel.maxRound);
  g.duel = null; g.pendingEvent = null;
  g.people.find((p) => p.isPlayer).ageMonths = 20 * 12;
  startDuel(g, rngOf(g), { kind: 'spar', title: '목검 대련', foe: { name: '상대', skill: 20 } });
  if (g.duel.maxRound !== MAX_ROUND) fail('adult duel round cap', g.duel.maxRound);
  g.duel = null; g.pendingEvent = null;
  g.people.find((p) => p.isPlayer).ageMonths = 12 * 12;
  const sp = ACTIONS.find((a) => a.id === 'sword_spar');
  g.sword ??= {}; g.sword.kidSparAt = g.date.year * 12 + g.date.month - 3;
  const P = g.people.find((p) => !p.isPlayer && p.alive);
  Object.assign(P, { known: true, affection: 50, job: 'guard', place: g.life?.place ?? 'ern', ageMonths: 30 * 12 });
  if (sp.available(g)) fail('kid spar again within a year');
  g.sword.kidSparAt = g.date.year * 12 + g.date.month - 13;
  if (!sp.available(g)) fail('kid spar not available after a year');
}

// 7) 둘째 판(30~60살): 장면을 여는 행동의 첫 줄이 한 줄뿐이라 수천 번 되풀이되던 것
for (const id of openerIds) {
  if (openerLines(id).length < 3) fail('opener lines', id);
  if (!ACTIONS.some((a) => a.id === id)) fail('opener for missing action', id);
}
{
  const g = newGame({ name: '점검', sex: 'f', familyId: 'farmer', mode: 'once', seed: 4814 });
  const seen = new Set();
  for (let i = 0; i < 12; i++) seen.add(opener(g, 'seek_job', rngOf(g)));
  if (seen.size < 3) fail('opener does not vary', seen.size);
}

// 8) 옥에 있는 동안은 길바닥 잠자리 줄이 뜨지 않고, 남은 형기가 두 달 안이면 탈옥을 고를 수 없다
{
  const g = newGame({ name: '점검', sex: 'm', familyId: 'farmer', mode: 'once', seed: 4815 });
  g.people.find((p) => p.isPlayer).ageMonths = 30 * 12;
  for (const id of g.player.familyIds) { const p = g.people.find((x) => x.id === id); if (p) p.alive = false; }
  g.life.home = 'street'; g.life.place = 'harfen'; g.player.money = 0;
  g.crime ??= {}; g.crime.jailed = { place: 'harfen', months: 8, total: 8 };
  let street = 0;
  for (let m = 0; m < 6 && g.crime.jailed; m++) { g.pendingEvent = null; const r = endMonth(g, [{ id: 'jail_endure' }]); street += r.filter((x) => x.name === '잠자리').length; }
  if (street) fail('street line while jailed', street);
  const esc = ACTIONS.find((a) => a.id === 'jail_escape');
  g.crime.jailed = { place: 'harfen', months: 1, total: 1 };
  if (esc.available(g)) fail('escape offered with one month left');
}

console.log(bad ? `adultfixtest: ${bad} problems` : `adultfixtest OK (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(bad ? 1 : 0);
