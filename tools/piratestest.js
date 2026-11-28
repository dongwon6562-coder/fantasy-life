import './lsshim.js';
import '../src/content.js';

// 49단계 해적과 바다의 무법자 점검 (도우미스레드3). 1분 안.
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
import { PS } from '../src/politics/state.js';
import { piratesInfo, piratesLine } from '../src/pirates/index.js';
import { PI, live, bandById, bandsIn, power, SEAS, SEA_IDS, seaOf, FIRST_BANDS } from '../src/pirates/state.js';
import { piratesMonth, fall, seed as piSeed } from '../src/pirates/world.js';
import { PLACES } from '../src/places.js';

const mk = (seed = 49, fam = 'port_folk') => newGame({ name: '마렌', sex: 'f', familyId: fam, mode: 'free', seed });
const adult = (seed = 49, place = 'portel') => { const g = mk(seed); grown(g, 22); stay(g, place); g.player.injuries = []; L(g).queue = []; g.player.skills.sword = 40; g.player.stats.str = 50; g.player.money = 200; return g; };
const kid = (seed = 49, place = 'portel', y = 9) => { const g = mk(seed); grown(g, y); stay(g, place); L(g).queue = []; return g; };
const textOK = (arr, what) => { for (const t of arr) check(typeof t === 'string' && !BAD.test(t), `${what}: ${t}`); };
const monthHooks = (g, seed = 2) => { for (const f of HOOKS.afterMonth) f(g, makeRng({ s: seed })); };
const atSeaTo = (g, to, from = 'klein') => { L(g).travel = { to, left: 2, from, sea: true, own: false, work: false }; };

// 1. 처음 바다: 해적단 넷, 고장과 바다가 맞는다
{
  const g = mk(1), P = PI(g);
  check(P.bands.length === FIRST_BANDS.length && P.bands.every((b) => SEAS[b.sea] && b.cap?.name && b.flag && !b.fell), '첫 해적단');
  for (const s of SEA_IDS) for (const p of SEAS[s].ports) check(PLACES[p] && seaOf(p) === s, `항구 ${p}`);
  check(bandById(g, 'crow').lairAt === 'crow', '까마귀단은 까마귀 둥지');
  const I = piratesInfo(g);
  check(I.crews.length === 4 && I.routes.length === 2 && I.life && Array.isArray(I.news), '화면 정보 모양');
  textOK([...I.crews.map((c) => `${c.name} ${c.captain} ${c.word} ${c.flag}`), ...I.routes.map((r) => r.word)], '정보 글');
}

// 2. 백 년 동안 플레이어 없이: 해적단이 흥하고 망하고, 함대·허가장·보물·은퇴한 해적이 생긴다
{
  const g = mk(2), P = PI(g);
  const say = () => {};
  const drift0 = JSON.stringify(g.sea.drift);
  for (let m = 0; m < 12 * 100; m++) { g.date.month += 1; if (g.date.month > 12) { g.date.month = 1; g.date.year += 1; } piratesMonth(g, say); }
  check(P.tally.fell >= 4 && P.tally.rose >= 3, `흥망 ${JSON.stringify(P.tally)}`);
  check(P.tally.fleets >= 5 && P.tally.hoards >= 1, `함대와 보물 ${JSON.stringify(P.tally)}`);
  check(live(g).length >= 2 && SEA_IDS.every((s) => bandsIn(g, s).length >= 1), '바다마다 해적단이 남아 있다');
  check(live(g).every((b) => b.ships <= 6 && b.men <= b.ships * 45 + 20 && power(b) < 400), `해적단이 끝없이 크지 않는다 ${live(g).map((b) => `${b.name}:${b.ships}/${b.men}`)}`);
  check(SEA_IDS.every((s) => P.danger[s] >= 0 && P.danger[s] <= 100), '위험 0~100');
  check(JSON.stringify(g.sea.drift) !== drift0, '털린 상선이 시세를 흔든다');
  check(bandById(g, 'crow') && !bandById(g, 'crow').fell, '까마귀단은 무너져도 다시 깃발을 올린다');
  check(P.retired.length >= 1 && P.retired.every((r) => PLACES[r.place]), '은퇴한 해적은 항구에 산다');
  textOK(P.log.map((l) => l.text), '바다 소식');
  check(new Set(P.bands.filter((b) => !b.fell).map((b) => b.name)).size === live(g).length, '살아 있는 해적단 이름이 겹치지 않는다');
}

// 3. 뱃길에서 잡히기: 열네 살 아래는 없음, 해적은 없음, 선택지마다
{
  const k = kid(3, 'klein', 10); atSeaTo(k, 'saltrock');
  PI(k).danger.west = 100;
  for (let i = 0; i < 40; i++) { PI(k).me.takenAt = -99; monthHooks(k, i); }
  check(!queued(k, 'pi_taken'), '열 살은 해적에게 잡히는 장면이 없다');
  for (const [key, chk] of [['pay', (g, m0) => g.player.money < m0], ['join', (g) => !!g.sea.pirate && g.sea.pirate.band], ['swim', () => true], ['wait', () => true], ['letter', () => true]]) {
    const g = adult(30 + key.length, 'klein'); atSeaTo(g, 'saltrock');
    if (key === 'letter') { g.player.money = 0; g.player.familyMoney = 0; }
    queueScene(g, 'pi_taken', { band: 'tooth', at: null });
    const m0 = g.player.money;
    scene(g, 'pi_taken', key);
    check(chk(g, m0), `잡혔을 때 ${key}`);
  }
  // 달마다 훅으로도 뜬다
  const g = adult(39, 'klein'); atSeaTo(g, 'saltrock'); PI(g).danger.west = 100;
  let seen = false;
  for (let i = 0; i < 300 && !seen; i++) { PI(g).me.takenAt = -99; monthHooks(g, i); seen = queued(g, 'pi_taken'); g.date.month += 1; if (g.date.month > 12) { g.date.month = 1; g.date.year += 1; } atSeaTo(g, 'saltrock'); }
  check(seen, '험한 바다에서는 잡히는 장면이 뜬다');
  g.sea.pirate = { rank: 0, raids: 0, share: 0, since: 500, band: 'tooth' }; L(g).queue = [];
  for (let i = 0; i < 100; i++) { PI(g).me.takenAt = -99; monthHooks(g, i); }
  check(!queued(g, 'pi_taken'), '해적은 해적에게 잡히지 않는다');
}

// 4. 해적의 삶: 배 타기, 몫 나누기, 재판, 반란, 은퇴, 해적단이 망하면
{
  const g = adult(4, 'klein');
  g.sea.pirate = { rank: 0, raids: 0, share: 0, since: g.date.year, band: 'tooth' };
  check(has(g, 'pi_raid') && !has(g, 'pirate_raid'), '서쪽 바다 해적단은 클라인 항에서 배를 탄다');
  stay(g, 'portel'); check(!has(g, 'pi_raid'), '다른 바다에서는 못 탄다'); stay(g, 'klein');
  for (let i = 0; i < 12; i++) { act(g, 'pi_raid'); scene(g, 'pi_raid', 'merchant', 10 + i); g.player.injuries = []; }
  check(g.sea.pirate.raids >= 3 && g.sea.pirate.rank >= 1, `약탈과 승진 ${JSON.stringify(g.sea.pirate)}`);
  for (const k of ['protest', 'skim', 'give', 'none']) { queueScene(g, 'pi_share', { band: 'tooth' }); scene(g, 'pi_share', k); }
  for (const ev of ['thief', 'coward', 'brawl']) for (const k of ['harsh', 'soft', 'none']) { queueScene(g, 'pi_trial', { band: 'tooth', ev }); scene(g, 'pi_trial', k); }
  // 반란: 이길 때까지
  const b = bandById(g, 'tooth');
  for (let i = 0; i < 20 && !b.cap.me; i++) { g.sea.pirate.rank = Math.max(1, g.sea.pirate.rank); PI(g).me.standing = 90; queueScene(g, 'pi_vote', { band: 'tooth' }); scene(g, 'pi_vote', 'mutiny', i); }
  check(b.cap.me && g.sea.pirate.rank >= 2 && !!g.sea.ship, '검은 쪽지로 선장이 된다');
  check(piratesInfo(g).life.captain === '나' && piratesInfo(g).crews.find((c) => c.id === 'tooth').mine, '화면: 내 해적단');
  // 은퇴
  PI(g).me.standing = 60; g.sea.pirate.raids = 12;
  check(has(g, 'pi_retire'), '은퇴할 수 있다');
  act(g, 'pi_retire');
  check(!g.sea.pirate && PI(g).me.retired && !b.cap.me, '칼을 내려놓았다');
  for (const ev of ['visit', 'dream', 'kid', 'pardon', 'back']) for (const k of ['a', 'b']) { queueScene(g, 'pi_past', { ev }); scene(g, 'pi_past', k, ev.length + k.length); }
  // 해적단이 망하면 나도 깃발 없는 사람
  const h = adult(41, 'portel'); h.sea.pirate = { rank: 1, raids: 5, share: 0, since: 500, band: 'widow' };
  fall(h, makeRng({ s: 1 }), bandById(h, 'widow'), 'hanged', null, 'free');
  check(!h.sea.pirate && queued(h, 'pi_fallen'), '내 해적단이 망했다');
  scene(h, 'pi_fallen', 'none');
}

// 5. 사략선 허가장: 전쟁 중일 때만, 적국 배는 죄가 아니고, 남의 배는 해적질
{
  const g = adult(5, 'klein'); g.sea.ship = { name: '바다제비', kind: 'raider', hull: 80, speed: 2, unpaid: 0 };
  PS(g).wars = []; if (g.realm?.balhart) g.realm.balhart.war = false;
  check(!has(g, 'pi_letter_seek'), '평화로울 때는 허가장이 없다');
  g.realm.balhart.war = true; g.realm.balhart.warMonths = 0;
  check(has(g, 'pi_letter_seek'), '전쟁 중이면 해군 사무소가 허가장을 낸다');
  act(g, 'pi_letter_seek'); scene(g, 'pi_letter', 'sign');
  check(PI(g).me.letter?.foe === 'valhart', `허가장 ${JSON.stringify(PI(g).me.letter)}`);
  const heat0 = JSON.stringify(crimeState(g).heat ?? {});
  for (let i = 0; i < 6; i++) { act(g, 'pi_privateer'); scene(g, 'pi_privateer', 'foe', i); g.player.injuries = []; }
  check(PI(g).me.letter.taken >= 1 && JSON.stringify(crimeState(g).heat ?? {}) === heat0, '적국 배는 죄로 남지 않는다');
  for (let i = 0; i < 8 && PI(g).me.letter; i++) { act(g, 'pi_privateer'); scene(g, 'pi_privateer', 'neutral', 20 + i); g.player.injuries = []; }
  check(JSON.stringify(crimeState(g).heat ?? {}) !== heat0, '남의 배는 해적질');
  // 화친하면 허가장이 끝난다
  const e = adult(51, 'klein'); e.sea.ship = { name: '갈매기', kind: 'raider', hull: 80, speed: 2, unpaid: 0 };
  e.realm.balhart.war = true; act(e, 'pi_letter_seek'); scene(e, 'pi_letter', 'sign');
  e.realm.balhart.war = false; PS(e).wars = [];
  monthHooks(e);
  check(queued(e, 'pi_letter_end'), '화친하면 허가장 끝 장면');
  scene(e, 'pi_letter_end', 'black');
  check(!PI(e).me.letter && !!e.sea.pirate, '허가장을 찢고 해적이 된다');
}

// 6. 사냥 함대: 함대가 있는 바다의 부두에서만, 선장을 잡으면 해적단이 망한다
{
  const g = adult(6, 'klein'), P = PI(g);
  g.player.skills.sword = 75; g.player.stats.str = 75; g.player.stats.agi = 70;
  check(!has(g, 'pi_hunt_join'), '함대가 없으면 못 탄다');
  P.fleets.push({ id: 999, realm: 'leonia', sea: 'west', target: 'anchor', left: 6, str: 100, wins: 0, at: 0 });
  check(has(g, 'pi_hunt_join'), '함대에 탄다');
  let fell = false;
  for (let i = 0; i < 25 && !fell; i++) { act(g, 'pi_hunt_join'); scene(g, 'pi_hunt', 'charge', i); g.player.injuries = []; fell = !!bandById(g, 'anchor').fell; if (!fell && !has(g, 'pi_hunt_join')) break; }
  check(fell && P.me.hunts >= 1, '해적 선장을 잡았다');
  queueScene(g, 'pi_hunt', { fleet: 999 }); L(g).queue = []; // 망한 해적단 함대 장면은 버려진다
  stay(g, 'saltrock'); P.fleets.push({ id: 998, realm: 'leonia', sea: 'west', target: 'tooth', left: 6, str: 100, wins: 0, at: 0 });
  check(!has(g, 'pi_hunt_join'), '함대 모집은 바다의 큰 항구에서만');
}

// 7. 보물 지도와 파기, 늙은 해적
{
  const g = adult(7, 'portel'), P = PI(g);
  fall(g, makeRng({ s: 3 }), bandById(g, 'widow'), 'fled', null);
  const h = P.hoards.find((x) => x.band === '검은 과부단');
  check(!!h && h.value >= 40, `망한 해적단의 보물 ${JSON.stringify(h)}`);
  check(has(g, 'pi_mapbuy'), '해도 노점');
  act(g, 'pi_mapbuy'); scene(g, 'pi_mapseller', 'buy', 2);
  check(P.me.maps.length === 1 && !has(g, 'pi_mapbuy'), '지도 조각을 샀고, 노점은 한 해에 한 번');
  // 진짜 지도 조각 둘을 모아 판다
  P.me.maps = [{ hoard: h.id, pieces: 3, fake: false, isle: h.isle, near: h.near }];
  stay(g, h.near);
  check(has(g, 'pi_dig'), '지도가 가리키는 항구에서 판다');
  const m0 = g.player.money;
  act(g, 'pi_dig'); scene(g, 'pi_dig', 'dig', 4);
  check(h.dug && g.player.money >= m0 + 40 && !P.me.maps.length, '보물을 찾았다');
  // 가짜 지도
  P.me.maps = [{ hoard: -1, pieces: 2, fake: true, isle: '이름 모를 섬', near: g.life.place }];
  const m1 = g.player.money; act(g, 'pi_dig'); scene(g, 'pi_dig', 'dig', 5);
  check(g.player.money === m1, '가짜 지도는 빈손');
  // 늙은 해적: 아이에게는 이야기만
  P.retired.push({ name: '시그리드', nick: '침묵', band: '검은 과부단', y: 500, place: 'portel', born: 450, met: 0 });
  const k = kid(71, 'portel', 9); PI(k).retired = P.retired.slice(); PI(k).hoards = P.hoards.slice();
  queueScene(k, 'pi_oldsalt', { name: '시그리드', nick: '침묵', band: '검은 과부단', cap: false });
  showScene(k, L(k).queue.pop(), { force: true });
  check(k.pendingEvent.choices.length === 2 && !k.pendingEvent.choices.some((c) => c.includes('보물')), '아이에게는 보물 흥정이 없다');
  resolveEvent(k, makeRng({ s: 1 }), 0);
  stay(g, 'portel'); P.hoards.push({ id: 777, band: '검은 과부단', cap: "'과부' 알바", isle: '해골 여울', near: 'saltmare', value: 90, y: 500, dug: null, cursed: false, sea: 'south' });
  for (let i = 0; i < 3; i++) { queueScene(g, 'pi_oldsalt', { name: '시그리드', nick: '침묵', band: '검은 과부단', cap: false }); scene(g, 'pi_oldsalt', i === 0 ? 'tale' : 'map', i); }
  check(P.me.maps.some((m) => m.hoard === 777) || P.me.maps.length >= 1, '늙은 해적에게서 지도 조각');
}

// 8. 오늘의 장면 한 줄: 바다 고장에서만, 같은 줄은 되풀이 안 함
{
  const g = adult(8, 'portel');
  PI(g).danger.south = 90;
  let n = 0;
  for (let m = 0; m < 24; m++) { if (piratesLine(g)) n++; g.date.month += 1; if (g.date.month > 12) { g.date.month = 1; g.date.year += 1; } }
  check(n >= 1 && n <= 6, `고장 한 줄 ${n}번 (두 해)`);
  stay(g, 'leocast'); check(piratesLine(g) === null, '바다 없는 곳은 null');
}

// 9. 저장 왕복과 대 잇기, 짧은 플레이
{
  const g = adult(9, 'klein'); g.sea.pirate = { rank: 1, raids: 4, share: 30, since: 500, band: 'tooth' };
  PI(g).me.maps.push({ hoard: -3, pieces: 2, fake: true, isle: '섬', near: 'klein' });
  const back = decodeSave(encodeSave(g));
  check(JSON.stringify(back.pirates) === JSON.stringify(g.pirates), '저장 왕복');
  for (const f of HOOKS.heir) f(g, makeRng({ s: 1 }), g.player);
  check(!PI(g).me.letter && PI(g).me.ancestor?.band === '소금이빨단' && PI(g).me.maps.length === 1, '대 잇기: 지도는 남고 선대가 해적이었다');
  // 예전 판(해적 상태 없음)
  const o = mk(91); delete o.pirates; runHooks('migrate', o);
  check(PI(o).bands.length === 4, '예전 판에 해적단이 생긴다');
  SCENE_STRICT.on = true;
  const p = mk(92); grown(p, 18); stay(p, 'portel');
  for (let m = 0; m < 12 * 6 && !p.over; m++) {
    const acts = availableActions(p), rng = rngOf(p), ch = [];
    for (let i = 0; i < slotsFor(p); i++) { const pool = acts.filter((a) => /^pi_|pirate|sea_|rest|work/.test(a.id)); ch.push({ id: rng.pick(pool.length ? pool : acts).id }); }
    endMonth(p, ch);
    for (let k = 0; k < 6 && p.pendingEvent; k++) {
      const pe = p.pendingEvent;
      check(!BAD.test(pe.text) && !BAD.test(pe.title), `플레이 글: ${pe.title} / ${pe.text}`);
      const out = resolveEvent(p, rngOf(p), rngOf(p).int(0, pe.choices.length - 1));
      check(!BAD.test(String(out)), `플레이 결과: ${out}`);
    }
  }
  const I = piratesInfo(p);
  textOK([I.line ?? '', ...I.news.map((x) => x.text), ...I.life.log.map((x) => x.text)], '플레이 뒤 정보');
}

console.log(fail ? `piratestest: 실패 ${fail}` : `piratestest: 통과 (${Date.now() - T0}ms)`);
process.exit(fail ? 1 : 0);
