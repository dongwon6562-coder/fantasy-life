import './lsshim.js';
import '../src/content.js';
// 세상의 소리 점검 (1분 안): 먼 소식이 길의 멀기만큼 늦게 닿기, 틀린 소문과 바로잡힘, 전신탑, 나라 안 소식만 도는 것,
// 세상 변화 → 사실 모으기, 거리 풍경(형편·날씨·시대, 되풀이 피하기), 축제와 풍습, 음유시인, 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, rngOf, slotsFor } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { PLACES } from '../src/places.js';
import { encodeSave, decodeSave } from '../src/save.js';
import {
  rumorState as RS, rumorMonth, addFact, rumorInfo, streetLine, rumorLines, feastLine, feastAt, streetCandidates, rumorDist, RUMOR_KINDS, VIA,
} from '../src/rumor/index.js';

const T0 = Date.now();
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])|\(으\)|을\(를\)|이\(가\)|은\(는\)/;
const mk = (seed = 3) => newGame({ name: '소리', sex: seed % 2 ? 'm' : 'f', familyId: 'farmer', mode: 'free', seed });
const at = (g, pl) => { L(g).place = pl; L(g).travel = null; };
const step = (g) => { g.date.month += 1; if (g.date.month > 12) { g.date.month = 1; g.date.year += 1; } rumorMonth(g); return rumorLines(g); };
const mi = (g) => g.date.year * 12 + g.date.month;
// 사실 하나를 두고 이 고장에 처음 닿을 때까지 몇 달
function arrive(seed, pl, k = 'king_dead', d = { name: '오스발트 3세' }) {
  const g = mk(seed); at(g, pl); rumorMonth(g);
  RS(g).facts = []; RS(g).heard = [];
  addFact(g, k, d, mi(g));
  for (let i = 1; i <= 30; i++) { const h = step(g); if (h.length) return { n: i, h, g }; }
  return { n: 99, h: [], g };
}

/* 1. 길의 멀기 */
check(rumorDist('ern', 'harfen') === 1 && rumorDist('ern', 'leocast') === 3, `멀기 ${rumorDist('ern', 'leocast')}`);
check(rumorDist('leocast', 'saltrock') < 20 && rumorDist('leocast', 'saltrock') > rumorDist('leocast', 'ern'), '섬까지 뱃길');
for (const pl of Object.keys(PLACES)) check(rumorDist('leocast', pl) < 30, `닿지 않는 고장 ${pl}`);

/* 2. 늦게 닿기: 가까운 곳보다 먼 곳이 늦다. 그 자리에선 소문으로 듣지 않는다 */
{
  let near = 0, far = 0, here = 0;
  for (let s = 1; s <= 12; s++) {
    near += arrive(s, 'harfen', 'north_war', {}).n; far += arrive(s, 'ern', 'north_war', {}).n;
    const x = arrive(s, 'graubel', 'north_war', {}); here += x.n === 99 ? 1 : 0;
  }
  check(far > near, `먼 곳이 더 늦어야 함 (하르펜 ${near / 12}, 에른 ${far / 12})`);
  check(here === 12, `그 자리에선 소문이 아니라 직접 안다 (${here})`);
  console.log(`북부 전쟁 소식이 닿기까지: 하르펜 ${(near / 12).toFixed(1)}달, 에른 ${(far / 12).toFixed(1)}달`);
}

/* 3. 틀린 소문과 바로잡힘 (국왕 승하: 장터 소문이 먼저 틀리게, 전령이 나중에 바르게) */
{
  let wrong = 0, fixed = 0, right = 0, n = 0;
  for (let s = 1; s <= 40; s++) {
    const g = mk(s); at(g, s % 2 ? 'ern' : 'gruental'); rumorMonth(g);
    RS(g).facts = [];
    addFact(g, 'king_dead', { name: '오스발트 3세' }, mi(g));
    const all = [];
    for (let i = 0; i < 12; i++) all.push(...step(g));
    n++;
    for (const h of all) { check(!BAD.test(h.text), `글: ${h.text}`); if (h.wrong) wrong++; if (h.fix) fixed++; if (!h.wrong && !h.fix) right++; }
    check(all.length >= 1 && all.length <= 2, `한 사실은 한두 번 들린다 (${all.length})`);
    if (all.some((h) => h.wrong)) check(all.some((h) => h.fix), `틀린 국왕 소문은 전령이 바로잡는다: ${all.map((h) => h.text).join(' / ')}`);
  }
  check(wrong >= 5 && right >= 5, `틀린 소문과 바른 소식이 섞여야 함 (틀림 ${wrong}, 바름 ${right})`);
  console.log(`국왕 승하 40번: 틀린 소문 ${wrong}, 바로잡힘 ${fixed}, 처음부터 바름 ${right}`);
}

/* 4. 전신탑이 생기면 왕도 소식이 하루 만에 (다음 달) / 나라 안 소식은 나라 밖에서 안 돈다 */
{
  const x = arrive(5, 'harfen', 'crowned', { name: '에릭 1세' });
  const g = mk(5); at(g, 'harfen'); (g.history.inventions ??= []).push('signal'); rumorMonth(g); RS(g).facts = [];
  addFact(g, 'crowned', { name: '에릭 1세' }, mi(g));
  const h = step(g);
  check(h.length === 1 && /전신탑/.test(h[0].text), `전신탑 소식: ${h.map((y) => y.text)}`);
  check(x.n >= 1, '전신탑 없을 땐 전령·소문');
  const e = arrive(6, 'eisen', 'lord', { name: '디트리히', seat: 'harfen' });
  check(e.n === 99, `영주 바뀐 일은 제국에서 돌지 않는다 (${e.h.map((y) => y.text)})`);
}

/* 5. 세상 변화 → 사실 */
{
  const g = mk(8); at(g, 'ern'); rumorMonth(g);
  const before = RS(g).facts.length;
  g.realm.log.push({ y: g.date.year, m: g.date.month, text: '국왕 오스발트 3세 승하' });
  g.realm.log.push({ y: g.date.year, m: g.date.month, text: '발하르트 제국과 2번째 전쟁 시작' });
  g.world.plague = true;
  const P = g.politics; const n = Object.keys(P.rulers).find((k) => k !== 'leonia'); P.rulers[n] = { ...P.rulers[n], name: '새이름 1세' };
  (g.nature.active ??= []).push({ id: 9999, kind: 'flood', region: 'river', sev: 0.8, left: 2, start: { y: g.date.year, m: g.date.month } });
  step(g);
  const ks = RS(g).facts.slice(before).map((f) => f.k);
  for (const k of ['king_dead', 'war_on', 'plague', 'ruler', 'calamity']) check(ks.includes(k), `사실 모으기 ${k}: ${ks}`);
  check(RS(g).legends.some((x) => x.k === 'king_dead'), '큰일은 노래로 남는다');
  for (const [k, K] of Object.entries(RUMOR_KINDS)) {
    const d = { name: '아무개', who: '에릭', how: '말에서 떨어졌다.', n: 2, good: k.length % 2 === 0, lit: true, title: '황제', a: 'valhart', b: 'free', land: '크로센', region: 'river', kind: 'flood', pl: 'harfen', out: 'crushed', id: k === 'dragon' ? 'ash' : 'press', seat: 'harfen' };
    const r = makeRng({ s: 4 });
    const texts = [K.truth(d, g), ...(K.wrong ?? []).map((w) => w(d, g, r)), ...(K.song ? [K.song(d, g)] : [])];
    for (const t of texts) check(typeof t === 'string' && t.length > 8 && !BAD.test(t), `${k} 글: ${t}`);
    check(PLACES[K.at(d, g)], `${k} 고장 ${K.at(d, g)}`);
  }
}

/* 6. 거리 풍경: 모든 고장·모든 달, 형편이 묻어남, 되풀이 피하기 */
{
  const g = mk(11); rumorMonth(g);
  for (const pl of Object.keys(PLACES)) for (let m = 1; m <= 12; m++) {
    g.date.month = m; at(g, pl);
    const s = streetLine(g);
    check(typeof s === 'string' && s.length > 10 && !BAD.test(s), `${pl} ${m}월 거리: ${s}`);
    const f = feastAt(g, pl, m);
    if (f) check(!BAD.test(f.text) && f.name, `${pl} ${m}월 축제: ${f.text}`);
  }
  at(g, 'harfen'); g.date.month = 5;
  const keys = () => streetCandidates(g, 'harfen').map((c) => c.key);
  g.realm.balhart.war = true; check(keys().includes('levy'), '전쟁 중엔 징집');
  g.realm.balhart.war = false; g.world.famine = true; check(keys().includes('bread'), '흉년엔 빵집 줄');
  g.world.famine = false; g.world.plague = true; check(keys().includes('plague'), '돌림병');
  g.world.plague = false; g.realm.king.alive = false; RS(g).mourn = mi(g); check(keys().includes('mourn'), '국상');
  const f = feastAt(g, 'ern', 9); check(f && /국상/.test(f.text), `국상 중 수확제: ${f?.text}`);
  g.realm.king.alive = true;
  g.realm.era = 2; check(keys().some((k) => k.startsWith('era2')), '시대의 말투');
  g.realm.era = 0;
  // 서른여섯 달 동안 같은 줄이 몇 번 나오나
  const h = mk(12); at(h, 'ern'); rumorMonth(h);
  const seen = new Map();
  for (let i = 0; i < 36; i++) { step(h); const s = streetLine(h); seen.set(s, (seen.get(s) ?? 0) + 1); }
  const most = Math.max(...seen.values());
  check(seen.size >= 24 && most <= 3, `거리 풍경 되풀이 (서로 다른 줄 ${seen.size}, 가장 많이 ${most})`);
  console.log(`에른 서른여섯 달 거리 풍경: 서로 다른 줄 ${seen.size}개, 한 줄 최다 ${most}번`);
  // 축제가 있는 나라마다
  const realms = new Set();
  for (const pl of Object.keys(PLACES)) for (let m = 1; m <= 12; m++) if (feastAt(g, pl, m)) realms.add(PLACES[pl].realm ?? 'leonia');
  check(realms.size >= 9, `나라마다 축제 (${[...realms]})`);
}

/* 7. 음유시인 */
{
  const g = mk(13); at(g, 'harfen'); rumorMonth(g);
  RS(g).legends = [{ k: 'war_won', d: {}, y: g.date.year - 9 }, { k: 'hero', d: {}, y: g.date.year - 6 }];
  let songs = 0;
  for (let i = 0; i < 12 * 12; i++) for (const x of step(g)) if (x.via === '음유시인') { songs++; check(/노래/.test(x.text) && !BAD.test(x.text), `노래: ${x.text}`); }
  check(songs >= 1 && songs <= 4, `음유시인 노래 (${songs})`);
}

/* 8. 저장 왕복, 대 잇기 */
{
  const g = mk(14); at(g, 'ern'); rumorMonth(g); addFact(g, 'hero', {}, mi(g));
  const back = decodeSave(encodeSave(g)); runHooks('migrate', back, makeRng({ s: 1 }));
  check(RS(back).facts.length === RS(g).facts.length, '저장 왕복 사실');
  const info = rumorInfo(back);
  check(info.placeName && typeof info.street === 'string' && Array.isArray(info.heard) && Array.isArray(info.recent), '화면 한 장');
  delete back.rumor; runHooks('migrate', back, makeRng({ s: 1 }));
  check(Array.isArray(RS(back).facts), '옛 저장 채우기');
  check(VIA.market.wrong > VIA.trader.wrong && VIA.herald.wrong === 0, '길마다 틀릴 확률');
}

/* 9. 짧은 플레이 */
{
  let heard = 0, wrong = 0, fix = 0, songs = 0, months = 0;
  for (const seed of [30001, 30002]) {
    const g = mk(seed);
    for (let m = 0; m < 12 * 30 && !g.over; m++) {
      const rng = rngOf(g), acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: rng.pick(acts).id })));
      let guard = 0;
      while (g.pendingEvent && guard++ < 6) resolveEvent(g, rng, rng.int(0, g.pendingEvent.choices.length - 1));
      if (L(g).heirPending) break;
      months++;
      const s = streetLine(g);
      check(typeof s === 'string' && !BAD.test(s), `거리: ${s}`);
      const fl = feastLine(g); if (fl) check(!BAD.test(fl), `축제: ${fl}`);
      const hs = rumorLines(g);
      check(hs.length <= 3, `한 달에 소식이 너무 많음 ${hs.length}`);
      for (const h of hs) { heard++; if (h.wrong) wrong++; if (h.fix) fix++; if (h.via === '음유시인') songs++; check(!BAD.test(h.text), `소식: ${h.text}`); }
    }
  }
  check(heard >= 20, `짧은 플레이에서 들은 소식 ${heard}`);
  console.log(`짧은 플레이 ${months}달: 들은 소식 ${heard} (틀린 소문 ${wrong}, 바로잡힘 ${fix}, 노래 ${songs})`);
}

console.log(`${((Date.now() - T0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('OK');
