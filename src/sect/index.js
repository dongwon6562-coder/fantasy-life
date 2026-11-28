// 49단계 도우미2: 새 교단과 종교 개혁. 상태는 g.sect 하나.
// 화면 연결점: sectInfo(g) { mine, sects, line, news, reform } / sectLines(g) / sectLine(g)
// - 세상에서 새 믿음이 생겨난다: 예언자·성자·교주·개혁가. 가르침(청빈·손 얹기·마지막 날·같은 빛·옛 어머니·제 말 경전·고요·열 배·갈라진 피).
//   교단은 고장마다 신도가 늘고 줄며 이웃 고장으로 번진다. 나라마다 숨어 모이게 두거나(hidden), 눈감거나(tolerated), 금하거나(banned), 받아들인다(accepted).
//   금지된 땅에서는 박해가 오고, 순교는 오히려 불을 붙인다. 헌금이 돌면 타락하고(purity), 교주가 죽으면 이어받거나 갈라진다.
// - 성광교 안의 개혁 운동: 문에 붙은 글 → 퍼지는 말 → 파문 → 갈라짐(한 나라가 교황청과 갈라섬) 또는 화형.
// - 나: 설교를 듣고 들어가기, 모임·기적(보는 사람마다 다르게)·단속·의심·식구와의 다툼·갈라짐에서 편 고르기.
//   직접 세우기(가르침과 이름 고르기) → 설교·헌금·성지·제자·나라와의 담판·재판. 대를 넘어 이어진다.
// - 신앙(src/faith)·수도원(src/cloister)·징조(src/omen)는 읽기만 한다. 이단 심문(faith_inquisition)과 겹치지 않게 교단 단속은 여기 장면으로 따로 간다.
// 세상 흐름과 장면 고르기는 게임 난수를 건드리지 않는다(ownRng). 세상 교단의 교주는 g.people에 넣지 않는다(이름만 지닌다).
import { J, hasBatchim } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, living } from '../npc.js';
import { MALE_NAMES, FEMALE_NAMES } from '../data.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, tired, check } from '../adventure/core.js';
import { isJailed, jail } from '../crime.js';
import { realmOf, realmName } from '../realms/index.js';
import { faithState } from '../faith/index.js';
import { deed } from '../repute/index.js';
import { seldom } from '../rumor/seldom.js';
import { makeRng } from '../rng.js';
import * as T from './data.js';

T.setJosa(J);
const { TEACH, TEACH_IDS, NAMES, ORIGIN, REALM_BENT, STAND_WORD } = T;
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 곳';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 911) ^ Math.imul(mi(g) * 197 + salt + 83, 2654435761)) | 0 });
const free = (g) => !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.bondage?.slave && !g.exile?.banish && !g.army?.captive && !L(g).heirPending;
const statOf = (g, id) => me(g)?.stats?.[id] ?? g.player.stats?.[id] ?? 10;
const realmOfPl = (pl) => realmOf(pl) ?? 'leonia';
const okPlace = (pl) => PLACES[pl] && !PLACES[pl].hidden && REALM_BENT[realmOfPl(pl)] != null;
const jj = (n, a, b) => n + (hasBatchim(n) ? a : b);

/* ---------- 상태 ---------- */
export function sectState(g) {
  g.sect ??= {};
  const s = g.sect;
  s.list ??= [];        // 교단들 (끝난 것도 몇 남긴다)
  s.nextId ??= 1;
  s.me ??= null;        // { sect, role: 'follower'|'prophet', since, zeal, heat, gave, brought, heirName, holy }
  s.reform ??= null;    // { stage, leader, place, grv, since, support, realm, seen: [] }
  s.reformDone ??= null;
  s.sceneAt ??= -99;
  s.seen ??= {};        // 장면 종류(또는 종류:교단)별 마지막 달
  s.met ??= {};         // 교단별 마지막으로 다가온 달
  s.month ??= [];
  s.news ??= [];
  s.log ??= [];
  s.past ??= [];        // 지난 삶들의 교단 일 [{ y, text }]
  s.former ??= [];      // 내가 몸담았거나 세웠던 교단 id (새 사람처럼 다가오지 않게)
  s.tally ??= { born: 0, banned: 0, accepted: 0, martyrs: 0, splits: 0, falls: 0, gone: 0, joined: 0, founded: 0, scenes: 0 };
  return s;
}
const S = sectState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.shift(); }
function line(g, kind, text) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind, text }); }
function news(g, text, realm) {
  const s = S(g);
  s.news.push({ y: g.date.year, m: g.date.month, text }); if (s.news.length > 16) s.news.shift();
  const near = realm && realm === realmOfPl(here(g));
  g.news.unshift({ text, rel: near ? 70 : 40 });
}
export const sectById = (g, id) => S(g).list.find((x) => x.id === id) ?? null;
export const liveSects = (g) => S(g).list.filter((x) => !x.end);
export const followers = (x) => Object.values(x.places ?? {}).reduce((a, b) => a + b, 0);
const inRealm = (x, r) => Object.entries(x.places).filter(([pl]) => realmOfPl(pl) === r).reduce((a, [, n]) => a + n, 0);
const standAt = (x, pl) => x?.stand?.[realmOfPl(pl)] ?? 'hidden';
// 그 나라가 이 교단을 얼마나 싫어하나: 나라 성향 + 가르침이 교단·왕권을 건드리는 정도 (개혁으로 교황청과 갈라선 나라는 하나 덜)
const hostility = (g, x, r) => (REALM_BENT[r] ?? 1) + Math.max(...x.teach.map((t) => Math.max(TEACH[t].church, TEACH[t].crown))) - (x.reformedRealm === r || (S(g).reformDone?.how === 'split' && S(g).reformDone.realm === r) ? 1 : 0);
const presentHere = (g, x, pl = here(g)) => (x.places[pl] ?? 0) >= 3;
const word = (x) => (x.mine ? '세운 이' : ORIGIN[x.origin]?.word ?? '설교자');
const mySect = (g) => (S(g).me ? sectById(g, S(g).me.sect) : null);
const isProphet = (g) => S(g).me?.role === 'prophet' && !!mySect(g) && !mySect(g).end;

/* ---------- 이름과 교주 ---------- */
function freshName(g, r, teach) {
  const used = new Set(S(g).list.map((x) => x.name));
  const pool = NAMES[teach].filter((n) => !used.has(n));
  if (pool.length) return r.pick(pool);
  const base = r.pick(NAMES[teach]);
  return `${placeName(r.pick(Object.keys(PLACES).filter(okPlace))).split(' ').pop()}의 ${base}`;
}
function prophetOf(r) {
  const sex = r.chance(0.6) ? 'm' : 'f';
  return { name: r.pick(sex === 'm' ? MALE_NAMES : FEMALE_NAMES), sex, age: r.int(28, 52) };
}

/* ---------- 새 교단 ---------- */
function makeSect(g, r, { teach, origin, place, prophet, mine = false, splitFrom = null, n = null }) {
  const s = S(g);
  const x = {
    id: s.nextId++, name: null, teach, origin, home: place, holy: null,
    places: { [place]: n ?? r.int(5, 12) },
    prophet: prophet ?? null, // { name, sex, age } (내가 세운 교단은 null: 내가 교주)
    zeal: r.int(55, 80), purity: origin === 'fraud' ? r.int(30, 50) : r.int(70, 95), purse: 0,
    stand: {}, gen: 1, splitFrom, born: g.date.year, end: null, mine, known: false, heirs: 0,
  };
  x.name = freshName(g, r, teach[0]);
  s.list.push(x);
  s.tally.born += 1;
  return x;
}
function birthYear(g, r) {
  const live = liveSects(g);
  if (live.length >= 6) return;
  if (!r.chance(live.length === 0 ? 0.35 : 0.12)) return;
  const pls = Object.keys(PLACES).filter((pl) => okPlace(pl) && realmOfPl(pl) !== 'sea');
  // 넷에 하나쯤은 내가 사는 나라에서 (먼 나라 소식만 들리지 않게)
  const myR = realmOfPl(here(g));
  const near = pls.filter((pl) => realmOfPl(pl) === myR);
  const place = near.length && r.chance(0.4) ? r.pick(near) : r.pick(pls);
  const origin = r.pick(['prophet', 'prophet', 'saint', 'fraud', 'reform']);
  const t1 = origin === 'reform' ? r.pick(['word', 'poverty', 'equal']) : origin === 'fraud' ? r.pick(['plenty', 'healing', 'end']) : origin === 'saint' ? r.pick(['healing', 'poverty', 'mercy', 'silence']) : r.pick(TEACH_IDS);
  const t2 = r.chance(0.4) ? r.pick(TEACH_IDS.filter((t) => t !== t1 && t !== 'plenty')) : null;
  const x = makeSect(g, r, { teach: t2 ? [t1, t2] : [t1], origin, place, prophet: prophetOf(r) });
  news(g, T.NEWS.born({ place: placeName(place), how: ORIGIN[origin].how(x.prophet.name, placeName(place)), sect: x.name }), realmOfPl(place));
  chron(g, `${placeName(place)}에서 ${x.prophet.name}의 ${J(x.name, '이/가')} 생겨나다.`, 40);
}

/* ---------- 한 해: 늘고 줄고 번진다 ---------- */
function growYear(g, r, x) {
  const pls = Object.keys(x.places);
  for (const pl of pls) {
    const st = standAt(x, pl);
    const mult = st === 'accepted' ? 1.4 : st === 'banned' ? 0.55 : st === 'hidden' ? 0.85 : 1;
    const draw = TEACH[x.teach[0]].draw;
    const kind = PLACES[pl]?.kind ?? 'village';
    const fit = (draw === 'town' && kind !== 'village') || (draw === 'farm' && kind === 'village') || draw === 'all' || draw === 'poor' || (draw === 'sick' && (g.world?.plague || g.health?.wave)) ? 1.2 : 0.9;
    let n = x.places[pl];
    const room = Math.max(0, 1 - n / 450); // 한 고장에서 끝없이 늘지는 않는다
    n += Math.round(n * ((x.zeal / 100) * 0.3 * mult * fit * room - 0.08)) + (r.chance(0.5) ? 1 : 0);
    if (x.mine && pl === here(g)) n += 0; // 내 설교는 행동에서 더한다
    x.places[pl] = clamp(n, 0, 600);
    if (x.places[pl] <= 0) delete x.places[pl];
  }
  // 번진다
  const big = Object.entries(x.places).filter(([, n]) => n >= 25);
  if (big.length && Object.keys(x.places).length < 9 && r.chance(0.3)) {
    const [from] = r.pick(big);
    const to = r.pick(Object.keys(PLACES[from]?.links ?? {}).filter((pl) => okPlace(pl) && !x.places[pl]).concat(['']));
    if (to) x.places[to] = r.int(3, 6);
  }
  // 내가 사는 나라에 크게 퍼졌으면 우리 고장에도 사람이 온다
  const myPl = here(g);
  if (!x.places[myPl] && okPlace(myPl) && inRealm(x, realmOfPl(myPl)) >= 30 && r.chance(0.15)) x.places[myPl] = r.int(3, 6);
  x.zeal = clamp(x.zeal + Math.round((45 - x.zeal) * 0.15) + (x.origin === 'saint' ? 1 : 0), 5, 100); // 뜨거움은 해마다 보통으로 돌아간다
  const total = followers(x);
  x.purse += Math.round(total * x.teach.reduce((a, t) => a + TEACH[t].purse, 0) / x.teach.length * 0.3);
  x.purity = clamp(x.purity - (x.teach.includes('plenty') ? 4 : 1) - (total >= 150 ? 2 : 0) - (Object.values(x.stand).includes('accepted') ? 2 : 0) - (x.origin === 'fraud' ? 2 : 0) + (x.teach.includes('poverty') ? 2 : 0), 0, 100);
}
function standYear(g, r, x) {
  const realms = [...new Set(Object.keys(x.places).map(realmOfPl))];
  for (const rl of realms) {
    const n = inRealm(x, rl);
    const h = hostility(g, x, rl);
    const cur = x.stand[rl] ?? 'hidden';
    let nx = cur;
    if (cur === 'hidden' && n >= 15) nx = h >= 5 ? (n >= 30 && r.chance(0.5) ? 'banned' : 'hidden') : 'tolerated';
    else if (cur === 'tolerated' && h >= 4 && n >= 40 && r.chance(0.5)) nx = 'banned';
    else if (cur === 'tolerated' && h <= 2 && n >= 150 && r.chance(0.35)) nx = 'accepted';
    else if (cur === 'banned' && n >= 220 && h <= 4 && r.chance(0.15)) nx = 'tolerated'; // 너무 커서 막을 수 없다
    if (x.mine && x.crownDeal?.[rl]) nx = x.crownDeal[rl];
    if (nx === cur) continue;
    x.stand[rl] = nx;
    if (nx === 'banned') { S(g).tally.banned += 1; news(g, T.NEWS.banned({ realm: realmName(rl), sect: x.name }), rl); log(g, `${realmName(rl)}에서 ${J(x.name, '을/를')} 금했다.`); }
    if (nx === 'accepted') { S(g).tally.accepted += 1; news(g, T.NEWS.accepted({ realm: realmName(rl), sect: x.name }), rl); log(g, `${realmName(rl)}에서 ${J(x.name, '을/를')} 받아들였다.`); }
  }
  // 박해: 금지된 땅에서는 줄고, 불이 붙는다
  for (const [pl, n] of Object.entries(x.places)) {
    if (standAt(x, pl) !== 'banned') continue;
    x.places[pl] = Math.max(0, Math.round(n * 0.88));
    x.zeal = clamp(x.zeal + 4, 0, 100);
    if (!x.places[pl]) delete x.places[pl];
  }
  // 순교 (세상 교단의 교주가 금지된 땅 집회소에 있을 때)
  if (x.prophet && standAt(x, x.home) === 'banned' && (x.places[x.home] ?? 0) >= 10 && g.date.year - (x.martyrAt ?? -99) >= 12 && r.chance(0.04)) {
    x.martyrAt = g.date.year;
    S(g).tally.martyrs += 1;
    news(g, T.NEWS.martyr({ place: placeName(x.home), sect: x.name, word: `${word(x)} ${x.prophet.name}` }), realmOfPl(x.home));
    chron(g, `${x.name}의 ${word(x)} ${J(x.prophet.name, '이/가')} ${placeName(x.home)}에서 처형되다.`, 50);
    x.zeal = clamp(x.zeal + 20, 0, 100);
    for (const pl of Object.keys(x.places)) x.places[pl] = Math.round(x.places[pl] * 1.15);
    passProphet(g, r, x, 'martyr');
  }
}
// 교주가 떠났다: 이어받거나 갈라진다
function passProphet(g, r, x, why) {
  const total = followers(x);
  const old = x.prophet?.name ?? '세운 이';
  if (why === 'death' && total >= 60 && liveSects(g).length < 6 && r.chance(0.3)) return splitSect(g, r, x, old);
  x.prophet = { ...prophetOf(r), age: r.int(30, 45) };
  x.gen += 1; x.heirs += 1;
  x.zeal = clamp(x.zeal - 10, 5, 100);
  if (why === 'fall') news(g, `${x.name}: 사라진 ${word(x)}의 자리를 ${J(x.prophet.name, '이/가')} 맡았다. 집회소 장부부터 새로 펼쳤다고 한다.`, realmOfPl(x.home));
  else if (why !== 'martyr') news(g, T.NEWS.heir({ sect: x.name, word: `${word(x)} ${old}`, heir: x.prophet.name }), realmOfPl(x.home));
}
function splitSect(g, r, x, old) {
  const s = S(g);
  const pls = Object.keys(x.places);
  const take = pls.filter((_, i) => i % 2 === 1);
  if (!take.length) take.push(pls[0]);
  const t2 = r.pick(TEACH_IDS.filter((t) => !x.teach.includes(t) && t !== 'plenty'));
  const child = makeSect(g, r, { teach: [x.teach[0], t2], origin: 'prophet', place: take[0], prophet: prophetOf(r), splitFrom: x.id, n: 1 });
  child.name = x.name.startsWith('참 ') ? `옛 길 ${x.name.slice(2)}` : `참 ${x.name}`;
  if (s.list.some((y) => y !== child && y.name === child.name)) child.name = freshName(g, r, t2);
  for (const pl of take) { child.places[pl] = Math.round((x.places[pl] ?? 0) * 0.7); if (pls.length > 1) delete x.places[pl]; else x.places[pl] = Math.round(x.places[pl] * 0.4); }
  child.stand = { ...x.stand };
  x.prophet = x.mine ? null : { ...prophetOf(r), age: r.int(30, 45) };
  x.gen += 1; x.heirs += 1;
  s.tally.splits += 1;
  news(g, T.NEWS.split({ sect: x.name, child: child.name }), realmOfPl(x.home));
  log(g, `${J(old, '이/가')} 떠난 뒤 ${J(x.name, '이/가')} 갈라졌다. 떨어져 나간 쪽은 ${child.name}.`);
  // 내가 들어간 교단이면 편을 고른다
  if (s.me?.sect === x.id && s.me.role === 'follower') queueScene(g, 'sx_split', { a: x.id, b: child.id, old }, { first: true });
  return child;
}
function lifeYear(g, r, x) {
  // 교주의 나이와 죽음 (세상 교단만)
  if (x.prophet) {
    x.prophet.age += 1;
    const a = x.prophet.age;
    if (r.chance(a >= 50 ? (a - 45) * 0.015 : 0.008)) passProphet(g, r, x, 'death');
  }
  // 타락: 헌금이 쌓이면
  if (!x.mine && x.purity < 20 && r.chance(0.25)) {
    S(g).tally.falls += 1;
    const big = followers(x) >= 300;
    news(g, big ? `${x.name}의 윗사람들이 헌금으로 땅과 저택을 샀다는 말이 돈다. 집회소마다 빈자리가 늘었다.` : T.NEWS.fall({ sect: x.name, word: word(x) }), realmOfPl(x.home));
    for (const pl of Object.keys(x.places)) x.places[pl] = Math.floor(x.places[pl] * (big ? 0.75 : 0.45));
    x.zeal = clamp(x.zeal - 30, 0, 100); x.purse = 0; x.purity = 70;
    if (x.prophet && !big) passProphet(g, r, x, 'fall');
  }
  for (const pl of Object.keys(x.places)) if (!x.places[pl]) delete x.places[pl];
  const fading = followers(x) < 30 && g.date.year - x.born >= 20 && !x.mine && r.chance(0.12); // 작은 모임은 세월에 흩어진다
  if ((followers(x) < 5 || fading) && !(x.mine && isProphetOf(g, x))) {
    x.end = { y: g.date.year, how: 'gone' };
    S(g).tally.gone += 1;
    if (x.known || g.date.year - x.born >= 5) news(g, T.NEWS.gone({ sect: x.name }), realmOfPl(x.home));
    if (S(g).me?.sect === x.id) { log(g, `${J(x.name, '이/가')} 흩어졌다. 모일 곳이 없어졌다.`); S(g).me = null; }
  }
}
const isProphetOf = (g, x) => S(g).me?.sect === x.id && S(g).me.role === 'prophet';

/* ---------- 성광교 개혁 운동 ---------- */
function reformYear(g, r) {
  const s = S(g);
  const y = g.date.year;
  if (!s.reform) {
    if (y < 515 || (s.reformDone && y - s.reformDone.y < 90) || !r.chance(0.045)) return;
    const place = r.pick(T.REFORM.cities.filter((pl) => PLACES[pl]));
    s.reform = { stage: 0, leader: r.pick(T.REFORM.names), place, grv: r.pick(T.REFORM.grievances), since: y, support: r.int(15, 35), realm: realmOfPl(place), seen: [] };
    news(g, T.NEWS.reform0({ place: placeName(place), grv: s.reform.grv }), s.reform.realm);
    chron(g, `${placeName(place)} 성당 문에 ${s.reform.leader}의 글이 붙다. 개혁 운동의 시작.`, 70);
    return;
  }
  const f = s.reform;
  f.support = clamp(f.support + r.int(-4, 10), 0, 100);
  const age = y - f.since;
  if (f.stage === 0 && age >= 1) { f.stage = 1; news(g, T.NEWS.reform1({ leader: f.leader }), f.realm); }
  else if (f.stage === 1 && age >= 3 && r.chance(0.5)) { f.stage = 2; news(g, T.NEWS.reform2({ leader: f.leader, realm: realmName(f.realm) }), f.realm); chron(g, `교황청이 개혁가 ${J(f.leader, '을/를')} 파문하다.`, 70); }
  else if (f.stage === 2 && age >= 5 && r.chance(0.45)) {
    if (f.support >= 50) {
      const rl = f.realm === 'holy' ? 'valhart' : f.realm;
      const x = makeSect(g, r, { teach: ['word', 'poverty'], origin: 'reform', place: f.place, prophet: { name: f.leader, sex: 'm', age: 50 }, n: 30 });
      x.name = '개혁 성광교';
      if (S(g).list.filter((z) => z.name === '개혁 성광교').length > 1) x.name = `${realmName(rl)} 개혁 교회`;
      for (const pl of Object.keys(PLACES).filter((p) => realmOfPl(p) === rl && okPlace(p))) x.places[pl] = (x.places[pl] ?? 0) + r.int(20, 45);
      x.stand[rl] = 'accepted'; x.reformedRealm = rl; x.zeal = 75; x.purity = 80;
      s.reformDone = { y, how: 'split', realm: rl, sect: x.id };
      news(g, T.NEWS.reformSplit({ realm: realmName(rl), sect: x.name }), rl);
      chron(g, `${J(realmName(rl), '이/가')} 교황청과 갈라서다. ${x.name}의 시작.`, 100);
    } else {
      s.reformDone = { y, how: 'crushed', realm: f.realm };
      news(g, T.NEWS.reformCrushed({ leader: f.leader }), f.realm);
      chron(g, `개혁가 ${J(f.leader, '이/가')} 성도 솔라리스에서 화형당하다.`, 70);
    }
    s.reform = null;
  }
}

/* ---------- 이웃이 교단에 나간다 ---------- */
function neighborsYear(g, r) {
  const pl = here(g);
  const xs = liveSects(g).filter((x) => presentHere(g, x, pl));
  if (!xs.length) return;
  const people = living(g).filter((p) => p.known && !p.isPlayer && !p.away && (p.place ?? 'ern') === pl && p.ageMonths >= 16 * 12 && !p.sect);
  for (const x of xs) {
    const share = clamp((x.places[pl] ?? 0) / 120, 0.02, 0.25);
    for (const p of people) {
      if (p.sect || !r.chance(share * 0.3)) continue;
      p.sect = x.id; p.sectAt = mi(g);
      line(g, 'town', `${J(p.name, '이/가')} ${x.name} 모임에 나간다는 말을 들었다. ${standAt(x, pl) === 'banned' ? '본 사람은 입을 다물었다.' : '장날에 흰 띠를 매고 다닌다.'}`);
      x.known = true;
    }
  }
}

/* ---------- 한 해 (3월) ---------- */
function yearTick(g) {
  const s = S(g);
  const r = ownRng(g, 31);
  birthYear(g, r);
  for (const x of liveSects(g)) { growYear(g, r, x); standYear(g, r, x); lifeYear(g, r, x); }
  reformYear(g, r);
  neighborsYear(g, r);
  // 끝난 교단은 여덟만 남긴다
  const ended = s.list.filter((x) => x.end);
  if (ended.length > 8) { const drop = new Set(ended.slice(0, ended.length - 8).map((x) => x.id)); s.list = s.list.filter((x) => !drop.has(x.id) || s.me?.sect === x.id); }
}

/* ---------- 장면: 다가오는 교단 ---------- */
const who = (g, x, pl) => {
  const mem = living(g).find((p) => p.sect === x.id && p.known && !p.isPlayer && (p.place ?? 'ern') === pl && !p.away);
  if (mem) return { name: mem.name, id: mem.id };
  if (x.prophet && x.home === pl) return { name: `${jj(x.prophet.name, '이라는', '라는')} ${word(x)}`, id: null, prophet: true };
  return { name: '낯선 사람 하나', id: null };
};
defineScene('sx_preach', {
  need: (g, s) => !!sectById(g, s.id) && !sectById(g, s.id).end,
  title: (g, s) => sectById(g, s.id)?.name ?? '새 믿음',
  text: (g, s) => {
    const x = sectById(g, s.id);
    const c = { who: s.whoName.endsWith('하나') ? `${s.whoName}가` : J(s.whoName, '이/가'), sect: x.name, claim: TEACH[x.teach[0]].claim };
    const base = T.PREACH[s.v % T.PREACH.length](c);
    const f = faithState(g);
    const mine = f.god === 'solar' && f.devotion >= 60 ? ' 성광교 신자로서 들어도 되는 말인지 모르겠다.' : f.god === 'none' ? ' 신이라면 어느 쪽이든 믿지 않는다. 그런데 이 사람 눈빛은 이상하게 오래 남는다.' : '';
    return base + mine;
  },
  choices: (g, s) => (sectById(g, s.id) && !sectById(g, s.id).end ? [
    { label: '끝까지 듣고 모임에 나가 본다', key: 'join' },
    { label: '은화 몇 닢을 건네고 돌아선다', key: 'give' },
    { label: '대꾸하지 않고 지나간다', key: 'pass' },
    ...(standAt(sectById(g, s.id), here(g)) !== 'accepted' ? [{ label: '성당에 알린다', key: 'report' }] : []),
  ] : []),
  resolve(g, rng, s, key) {
    const x = sectById(g, s.id);
    return meetResolve(g, rng, x, key, s);
  },
});
defineScene('sx_invite', {
  need: (g, s) => !!sectById(g, s.id) && !sectById(g, s.id).end,
  title: () => '낮은 목소리',
  text: (g, s) => { const x = sectById(g, s.id); const c = { who: s.whoName, sect: x.name }; return s.whoId == null ? T.INVITE_STRANGER(c) : T.INVITE[s.v % T.INVITE.length](c); },
  choices: (g, s) => (sectById(g, s.id) && !sectById(g, s.id).end ? [
    { label: '밤에 몰래 가 본다', key: 'join' },
    { label: '못 들은 걸로 하겠다고 한다', key: 'pass' },
    { label: '성당에 알린다', key: 'report' },
  ] : []),
  resolve(g, rng, s, key) { return meetResolve(g, rng, sectById(g, s.id), key, s); },
});
function meetResolve(g, rng, x, key, s) {
  const st = S(g);
  st.met[x.id] = mi(g);
  const p = s.whoId != null ? byId(g, s.whoId) : null;
  if (key === 'join') {
    join(g, x, 'follower');
    if (p) p.affection = clamp((p.affection ?? 0) + 10, -100, 100);
    return standAt(x, here(g)) === 'banned'
      ? `창을 가린 방에 열 명 남짓. 다들 나를 한 번씩 보고 고개를 끄덕였다. ${TEACH[x.teach[0]].claim} 그 말을 소리 내어 따라 하자 등에 땀이 흘렀다. 이제 나도 ${x.name} 사람이다.`
      : `모임은 생각보다 조용했다. 누구도 나에게 무엇을 내놓으라 하지 않았다. 돌아오는 길에 그 말이 자꾸 입안에서 맴돌았다. "${TEACH[x.teach[0]].claim}" 다음 모임 날을 손가락으로 세고 있었다.`;
  }
  if (key === 'give') { if (g.player.money >= 2) { g.player.money -= 2; x.purse += 2; } return '은화 두 닢을 건넸다. 설교자는 고맙다는 말 대신 내 이름을 물었다. 이름을 말해 주고 나서야 괜히 말했나 싶었다.'; }
  if (key === 'report') {
    deed(g, 'loyal', -2, null);
    for (const pl of [here(g)]) if (x.places[pl]) x.places[pl] = Math.max(0, x.places[pl] - 3);
    if (p) { p.affection = clamp((p.affection ?? 0) - 40, -100, 100); }
    log(g, `${x.name} 사람들을 성당에 알렸다.`);
    return p
      ? `사제는 이름을 받아 적고 은화 한 닢을 내밀었다. 받지 않았다. 사흘 뒤 ${J(p.name, '이/가')} 길에서 나를 보고 돌아섰다. 누가 일렀는지 아는 얼굴이었다.`
      : '사제는 고개를 끄덕이며 받아 적었다. 그 주에 우물가 설교는 끊겼다. 끊긴 자리가 한동안 눈에 밟혔다.';
  }
  return '고개를 숙이고 지나갔다. 등 뒤에서 말소리가 한참 이어졌다.';
}
function join(g, x, role) {
  const st = S(g);
  if (st.me && st.me.sect !== x.id) leaveSect(g, 'switch');
  st.me = { sect: x.id, role, since: mi(g), zeal: role === 'prophet' ? 80 : 45, heat: 0, gave: 0, brought: 0, heirName: null };
  x.places[here(g)] = (x.places[here(g)] ?? 0) + 1;
  x.known = true;
  me(g).sect = x.id;
  st.tally.joined += role === 'follower' ? 1 : 0;
  note(g, role === 'prophet' ? `${J(x.name, '을/를')} 세웠다.` : `${x.name}에 들어갔다.`);
  log(g, role === 'prophet' ? `${J(x.name, '을/를')} 세웠다.` : `${x.name}에 들어갔다.`);
}
function leaveSect(g, how) {
  const st = S(g);
  const x = mySect(g);
  if (!st.me) return;
  if (x && x.places[here(g)]) x.places[here(g)] = Math.max(0, x.places[here(g)] - 1);
  if (x && st.me.role === 'prophet' && !x.end) {
    // 세운 이가 떠나면 제자가 잇는다
    x.prophet = { name: st.me.heirName ?? prophetOf(ownRng(g, 5)).name, sex: 'm', age: 35 };
    x.mine = false; x.origin = 'prophet'; x.gen += 1;
  }
  if (me(g)) delete me(g).sect;
  if (x && !st.former.includes(x.id)) { st.former.push(x.id); if (st.former.length > 12) st.former.shift(); }
  st.past.push({ y: g.date.year, text: `${x?.name ?? '교단'}에서 나왔다(${how}).` });
  st.me = null;
}

/* ---------- 장면: 들어간 뒤 ---------- */
defineScene('sx_gather', {
  need: (g) => !!mySect(g) && !mySect(g).end,
  title: (g) => `${mySect(g)?.name ?? '모임'}의 밤`,
  text: (g, s) => T.GATHER[((S(g).me?.nights ?? 0) + (s.v % 2)) % T.GATHER.length] + (standAt(mySect(g), here(g)) === 'banned' ? ' 밖에서 개가 짖을 때마다 모두 숨을 죽였다.' : ''),
  choices: (g) => (mySect(g) ? [
    { label: '헌금을 바친다 (은화 5닢)', key: 'give', show: g.player.money >= 5 },
    { label: '아는 사람을 하나 데려오겠다고 한다', key: 'bring' },
    { label: '설교자에게 묻고 싶던 것을 묻는다', key: 'ask' },
    { label: '조용히 앉아 있다 온다', key: 'sit' },
  ].filter((c) => c.show !== false) : []),
  resolve(g, rng, s, key) {
    const st = S(g), x = mySect(g), m = st.me;
    const nt = m.nights = (m.nights ?? 0) + 1; // 같은 밤 글이 잇달아 나오지 않게 돌린다
    if (key === 'give') { g.player.money -= 5; x.purse += 5; m.gave += 5; m.zeal = clamp(m.zeal + 5, 0, 100); return '은화를 바구니에 넣었다. 누가 얼마를 넣는지 아무도 보지 않았다. 그게 이 모임에서 제일 좋은 점이었다.'; }
    if (key === 'bring') {
      const p = living(g).filter((q) => q.known && !q.isPlayer && !q.sect && !q.away && (q.place ?? 'ern') === here(g) && q.ageMonths >= 16 * 12 && (q.affection ?? 0) >= 20)[0];
      if (!p) return '데려올 사람을 꼽아 보았다. 마음 놓고 이 이야기를 꺼낼 사람이 없었다. 그게 조금 쓸쓸했다.';
      if (check(rng, statOf(g, 'cha') + (p.affection ?? 0) / 5, 18)) { p.sect = x.id; p.sectAt = mi(g); x.places[here(g)] = (x.places[here(g)] ?? 0) + 1; m.brought += 1; return `${J(p.name, '을/를')} 데려갔다. 처음엔 문간에 서 있더니 노래가 시작되자 안으로 들어와 앉았다. 돌아오는 길에 둘 다 말이 없었다. 나쁜 침묵은 아니었다.`; }
      p.affection = clamp((p.affection ?? 0) - 8, -100, 100);
      return `${J(p.name, '은/는')} 내 말을 끝까지 듣고 웃었다. "너까지 그러냐." 그 뒤로 나를 보는 눈이 조금 달라졌다.`;
    }
    if (key === 'ask') {
      m.zeal = clamp(m.zeal + (rng.chance(0.5) ? 6 : -6), 0, 100);
      return x.mine ? '내가 세운 모임에서 내가 물을 것은 없다. 대신 사람들이 내게 물었다. 대답하다 보니 내가 믿는 것이 무엇인지 조금 더 알게 되었다.'
        : rng.chance(0.5) ? '물었다. 설교자는 대답 대신 되물었다. 집에 와서 한참 그 물음을 붙들고 있었다. 답은 내 안에 있었던 것 같기도 하다.'
          : '물었다. 설교자의 대답은 길고 아름다웠다. 다 듣고 나니 처음 물은 것이 무엇이었는지 잊어버렸다.';
    }
    m.zeal = clamp(m.zeal + 2, 0, 100); stress(g, -6);
    return [
      '아무 말도 하지 않고 앉아 있었다. 그래도 되는 곳이 있다는 것이 이상하게 위로가 되었다.',
      '구석에 앉아 사람들 얼굴을 보았다. 해마다 몇은 늙고 몇은 새로 왔다. 노래는 그대로였다.',
      '빵을 나눠 받고 돌아왔다. 오는 길에 별이 많았다. 무엇을 믿는지보다 누구와 앉아 있었는지가 더 오래 남았다.',
    ][nt % 3];
  },
});
defineScene('sx_miracle', {
  need: (g) => !!mySect(g) && !mySect(g).end,
  title: () => '그날 밤 본 것',
  text: (g, s) => { const mr = T.MIRACLE[s.k]; return `${mySect(g)?.name ?? '모임'}의 집회. ${mr.what}`; },
  choices: () => [{ label: '무릎을 꿇는다', key: 'kneel' }, { label: '가까이 가서 자세히 본다', key: 'look' }, { label: '아무 말 없이 지켜본다', key: 'watch' }],
  resolve(g, rng, s, key) {
    const m = S(g).me, mr = T.MIRACLE[s.k];
    if (!m) return '그 밤의 일은 그 밤에 두었다.';
    if (key === 'kneel') { m.zeal = clamp(m.zeal + 15, 0, 100); stress(g, -10); return '무릎을 꿇었다. 옆 사람도, 그 옆 사람도. 바닥이 차가웠는데 차갑지 않았다. 그날 본 것을 평생 말하게 될 것이다.'; }
    if (key === 'look') { m.zeal = clamp(m.zeal - 5, 0, 100); return `${mr.look[(s.v ?? 0) % mr.look.length]} 집에 와서도 잠이 오지 않았다. 본 것을 믿어야 할지, 의심한 나를 믿어야 할지.`; }
    m.zeal = clamp(m.zeal + 4, 0, 100);
    return '지켜보기만 했다. 울던 사람들이 서로를 안았다. 무엇이 일어났든, 저 사람들이 안은 것만은 진짜였다.';
  },
});
defineScene('sx_raid', {
  need: (g) => !!mySect(g) && !mySect(g).end,
  title: () => '문 밖의 횃불',
  text: (g) => `${mySect(g)?.name ?? '모임'} 집회 한가운데 문이 부서졌다. 성당 경비대다. "${mySect(g)?.name ?? '이단'} 무리는 그 자리에 엎드려라!" 뒷문 쪽으로 사람들이 몰렸다.`,
  choices: () => [{ label: '뒷문으로 빠져나간다', key: 'flee' }, { label: '설교자 앞을 막아선다', key: 'stand' }, { label: '엎드려 이름들을 댄다', key: 'names' }],
  resolve(g, rng, s, key) {
    const st = S(g), m = st.me, x = mySect(g);
    if (!m || !x) return '횃불은 지나갔다.';
    if (x.places[here(g)]) x.places[here(g)] = Math.max(1, Math.round(x.places[here(g)] * 0.75));
    if (key === 'flee') {
      if (check(rng, statOf(g, 'agi') * 1.2, 16)) { m.heat = clamp(m.heat + 10, 0, 100); return '담을 넘었다. 무릎이 까졌다. 뒤에서 누가 붙잡히는 소리가 났다. 돌아보지 않았다. 그게 오래 남았다.'; }
      jail(g, 3); m.heat = clamp(m.heat + 20, 0, 100); log(g, '집회 단속에 붙잡혀 석 달 옥살이를 했다.');
      return '골목 끝에서 창대에 걸려 넘어졌다. 석 달 옥살이. 감방 벽에 누가 새겨 둔 표시가 우리 모임의 표시였다.';
    }
    if (key === 'stand') {
      jail(g, 6); m.zeal = clamp(m.zeal + 15, 0, 100); m.heat = clamp(m.heat + 30, 0, 100); x.zeal = clamp(x.zeal + 5, 0, 100);
      deed(g, 'brave', 3, `${x.name} 집회에서 경비대를 막아섰다더라`);
      log(g, '집회 단속에서 설교자를 막아서다 반년 옥살이를 했다.');
      return '설교자 앞에 섰다. 창대가 어깨를 내리쳤다. 그 사이 설교자는 뒷문으로 빠져나갔다. 반년 옥살이. 감옥으로 끌려가는 길에 누가 내 손에 빵을 쥐여 주었다.';
    }
    m.heat = 0; m.zeal = clamp(m.zeal - 40, 0, 100); m.betrayed = true;
    deed(g, 'loyal', -5, `${x.name} 사람들을 팔아넘겼다더라`);
    for (const p of living(g).filter((q) => q.sect === x.id && (q.place ?? 'ern') === here(g))) p.affection = clamp((p.affection ?? 0) - 35, -100, 100);
    log(g, '집회 단속에서 이름들을 댔다.');
    return '엎드려 아는 이름을 댔다. 경비대장은 고개를 끄덕이고 나를 일으켰다. 집으로 가는 길이 이렇게 길었던 적이 없다. 다음 날부터 몇몇 집 문이 내 앞에서 닫혔다.';
  },
});
defineScene('sx_doubt', {
  need: (g) => !!mySect(g) && !mySect(g).end,
  title: () => '바구니 속 은화',
  text: (g) => { const x = mySect(g); return `${x?.name ?? '모임'}의 헌금 바구니를 나르던 사람이 나를 붙잡았다. "은화가 어디로 가는지 알아?" ${x?.prophet ? `${x.prophet.name}의 새 외투가 비단이라는 말,` : '집회소 지붕을 새로 이었다는 말,'} 바구니가 갈수록 무거워진다는 말. 그는 대답을 기다리지 않고 가 버렸다.`; },
  choices: () => [{ label: '설교자에게 직접 묻는다', key: 'ask' }, { label: '못 들은 걸로 한다', key: 'ignore' }, { label: '조용히 발길을 끊는다', key: 'leave' }],
  resolve(g, rng, s, key) {
    const st = S(g), x = mySect(g);
    if (!st.me || !x) return '그 말은 그 말로 끝났다.';
    if (key === 'leave') { leaveSect(g, '의심'); return '다음 모임에 가지 않았다. 그다음에도. 아무도 찾아오지 않았다. 그게 대답 같기도 했다.'; }
    if (key === 'ignore') { st.me.zeal = clamp(st.me.zeal - 8, 0, 100); return '못 들은 걸로 했다. 그런데 다음 모임에서 바구니가 돌 때 손이 잠깐 멈췄다.'; }
    if (x.purity < 30 && rng.chance(0.6)) { x.purity = clamp(x.purity + 10, 0, 100); st.me.zeal = clamp(st.me.zeal - 15, 0, 100); return '물었다. 설교자의 얼굴이 한순간 굳었다가 풀렸다. "여신의 일에는 돈이 든다네." 맞는 말이었다. 그 한순간이 마음에 걸렸다.'; }
    st.me.zeal = clamp(st.me.zeal + 6, 0, 100);
    return '물었다. 설교자는 장부를 펼쳐 보였다. 빵값, 약값, 과부 셋의 집세. 다 맞는지 나는 모른다. 펼쳐 보였다는 것만은 안다.';
  },
});
defineScene('sx_split', {
  need: (g, s) => !!sectById(g, s.a) && !!sectById(g, s.b) && !sectById(g, s.b).end,
  title: (g, s) => `${J(sectById(g, s.a)?.name ?? '모임', '이/가')} 갈라졌다`,
  text: (g, s) => `${J(s.old, '이/가')} 떠난 뒤 모임이 둘로 갈렸다. 한쪽은 남은 집회소를 지키고, 한쪽은 ${jj(sectById(g, s.b)?.name ?? '새 모임', '이라는', '라는')} 이름으로 따로 모인다. 어제까지 한 상에서 빵을 나누던 사람들이 길에서 서로를 못 본 척한다. 다들 내가 어느 쪽에 서는지 본다.`,
  choices: (g, s) => (sectById(g, s.a) && sectById(g, s.b) ? [{ label: '남은 쪽에 선다', key: 'a' }, { label: `${J(sectById(g, s.b).name, '을/를')} 따른다`, key: 'b' }, { label: '어느 쪽에도 가지 않는다', key: 'none' }] : []),
  resolve(g, rng, s, key) {
    const st = S(g);
    if (key === 'none') { leaveSect(g, '갈라짐'); return '어느 쪽에도 가지 않았다. 양쪽 다 나를 배신자라고 불렀다. 한동안 장터 가는 길을 돌아서 갔다.'; }
    if (key === 'b') { const y = sectById(g, s.b); if (st.me) { st.me.sect = y.id; me(g).sect = y.id; } y.places[here(g)] = (y.places[here(g)] ?? 0) + 1; log(g, `갈라진 ${y.name} 쪽을 따랐다.`); return `${y.name} 쪽에 섰다. 새 모임은 작고 뜨거웠다. 옛 동무 몇은 그날 이후 나를 보지 않는다.`; }
    return '남은 쪽에 섰다. 집회소는 그대로인데 빈자리가 많았다. 남은 사람들끼리 더 가까이 붙어 앉았다.';
  },
});
defineScene('sx_kin', {
  need: (g, s) => !!sectById(g, s.id) && !sectById(g, s.id).end,
  title: () => '밥상머리',
  text: (g, s) => {
    const p = byId(g, s.pid), x = sectById(g, s.id);
    return s.mine
      ? `${s.rel} ${J(p?.name ?? '식구', '이/가')} ${x?.name ?? '그 모임'}에 나간다고 했다. 숟가락을 내려놓고 내 얼굴을 보았다. 허락을 구하는 얼굴이 아니었다.`
      : `${s.rel} ${J(p?.name ?? '식구', '이/가')} 숟가락을 내려놓았다. "당신이 나가는 그 모임 말이야. ${x?.name ?? '거기'}. 동네 사람들이 우리 집을 뭐라고 하는지 알아?"`;
  },
  choices: (g, s) => (byId(g, s.pid)?.alive ? (s.mine
    ? [{ label: '같이 가자고 한다', key: 'with' }, { label: '말리지 않는다', key: 'let' }, { label: '안 된다고 한다', key: 'forbid' }]
    : [{ label: '같이 가 보자고 한다', key: 'with' }, { label: '내 믿음은 내 것이라고 한다', key: 'mine' }, { label: '당분간 발을 끊겠다고 한다', key: 'stop' }]) : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid), st = S(g), x = sectById(g, s.id);
    if (!p || !x) return '그 이야기는 다시 나오지 않았다.';
    if (s.mine) {
      if (key === 'with') { p.affection = clamp((p.affection ?? 0) + 10, -100, 100); return `${J(p.name, '과/와')} 함께 갔다. 노래를 따라 부르는 옆얼굴이 낯설었다. 내가 모르는 사이에 많이 자랐거나, 많이 외로웠거나.`; }
      if (key === 'let') return '말리지 않았다. 그날 밤 그 아이가 나간 문을 오래 보았다.';
      p.affection = clamp((p.affection ?? 0) - 15, -100, 100); delete p.sect;
      return '안 된다고 했다. 대답은 없었다. 그 뒤로 그 이야기는 꺼내지 않는다. 꺼내지 않는다고 끝난 것은 아니다.';
    }
    if (key === 'with') {
      if (check(rng, statOf(g, 'cha') + (p.affection ?? 0) / 4, 20)) { p.sect = x.id; p.sectAt = mi(g); x.places[here(g)] = (x.places[here(g)] ?? 0) + 1; return `${J(p.name, '이/가')} 한 번만 가 보겠다고 했다. 한 번이 두 번이 되었다. 요즘은 나보다 먼저 일어나 채비를 한다.`; }
      p.affection = clamp((p.affection ?? 0) - 6, -100, 100); return `${J(p.name, '은/는')} 고개를 저었다. "나까지 끌어들이지 마." 그날 밤 등을 돌리고 잤다.`;
    }
    if (key === 'stop') { st.me.zeal = clamp(st.me.zeal - 20, 0, 100); p.affection = clamp((p.affection ?? 0) + 8, -100, 100); return '당분간 나가지 않겠다고 했다. 식구의 어깨가 조금 내려갔다. 내 어깨는 조금 무거워졌다.'; }
    p.affection = clamp((p.affection ?? 0) - 10, -100, 100); stress(g, 6);
    return '내 믿음은 내 것이라고 했다. 맞는 말이었다. 맞는 말이 밥상을 차갑게 만들었다.';
  },
});

/* ---------- 내가 세우는 교단 ---------- */
const foundOk = (g) => {
  const st = S(g), f = faithState(g);
  if (isProphet(g) || playerAge(g) < 22 || !free(g)) return false;
  if (mi(g) - (st.seen.found ?? -999) < (st.tally.founded ? 120 : 48)) return false;
  // 뜻 있는 형편에서만: 믿음이 아주 깊거나, 교단에 오래 몸담아 뜨겁거나, 말솜씨가 남다르고 믿음도 있을 때
  return (f.devotion >= 70 && playerAge(g) >= 25) || (st.me && mi(g) - st.me.since >= 36 && st.me.zeal >= 60) || (statOf(g, 'cha') >= 18 && f.devotion >= 40);
};
ACTIONS.push({
  id: 'sect_found', name: '새 믿음 세우기', icon: 'pray',
  desc: '내가 깨달은 것을 가르침으로 세워 사람을 모은다. 성광교의 땅에서는 위험하다.',
  available: (g) => foundOk(g) && !sceneQueued(g, 'sx_found'),
  run(g) {
    const r = ownRng(g, 41);
    S(g).seen.found = mi(g);
    const pool = TEACH_IDS.filter((t) => t !== 'plenty' || statOf(g, 'cha') >= 14);
    const pick = [];
    while (pick.length < 3) { const t = r.pick(pool); if (!pick.includes(t)) pick.push(t); }
    queueScene(g, 'sx_found', { opts: pick });
    tired(g, 5);
    return '밤새 등잔 앞에 앉아 있었다. 머릿속에서 오래 맴돌던 말이 문장이 되기 시작했다.';
  },
});
defineScene('sx_found', {
  title: () => '무엇을 가르칠까',
  text: (g) => `${faithState(g).god === 'solar' ? '성광교 경전을 수십 번 읽었다. 그 사이로 비어 있는 자리가 보였다.' : '여러 신의 이야기를 들었다. 다 조금씩 맞고 조금씩 모자랐다.'} 이제 내 말로 세울 차례다. 사람들이 따를 첫 가르침을 고른다.`,
  choices: (g, s) => [...s.opts.map((t) => ({ label: `${TEACH[t].name}: ${TEACH[t].claim}`, key: t })), { label: '아직은 아니다', key: 'none' }],
  resolve(g, rng, s, key) {
    if (key === 'none') return '등잔을 껐다. 말은 아직 덜 익었다.';
    const r = ownRng(g, 43);
    const names = NAMES[key].filter((n) => !S(g).list.some((x) => x.name === n));
    queueScene(g, 'sx_name', { teach: key, names: (names.length ? names : NAMES[key]).slice(0, 3) }, { first: true });
    void r;
    return `"${TEACH[key].claim}" 그 한 줄을 종이에 적었다. 적고 나니 되돌릴 수 없는 일 같았다.`;
  },
});
defineScene('sx_name', {
  title: () => '모임의 이름',
  text: () => '처음 모인 사람은 나까지 넷. 누가 물었다. "우리를 뭐라고 부르지?"',
  choices: (g, s) => s.names.map((n) => ({ label: n, key: n })),
  resolve(g, rng, s, key) {
    const r = ownRng(g, 47);
    const x = makeSect(g, r, { teach: [s.teach], origin: 'mine', place: here(g), prophet: null, mine: true, n: 3 });
    x.name = key; x.purity = 90; x.zeal = 75; x.founder = g.player.name;
    join(g, x, 'prophet');
    S(g).tally.founded += 1;
    chron(g, `${g.player.name}, ${placeName(here(g))}에서 ${J(x.name, '을/를')} 세우다.`, 80);
    return `${key}. 네 사람이 그 이름을 소리 내어 불렀다. 우스울 만큼 작은 시작이었다. 모든 것이 그렇게 시작한다고, 누가 말했던 것 같다.`;
  },
});
ACTIONS.push({
  id: 'sect_preach', name: '설교하기', icon: 'candle',
  desc: '내 교단의 가르침을 사람들 앞에서 전한다. 신도가 늘지만 눈에도 띈다.',
  available: (g) => isProphet(g) && free(g) && !sceneQueued(g, 'sx_sermon'),
  run(g) {
    const links = Object.keys(PLACES[here(g)]?.links ?? {}).filter(okPlace);
    queueScene(g, 'sx_sermon', { near: links[0] ?? null });
    tired(g, 8);
    return '목을 가다듬었다. 무엇을 말할지보다 어디서 말할지를 먼저 정해야 했다.';
  },
});
defineScene('sx_sermon', {
  need: (g) => isProphet(g),
  title: () => '어디서 말할까',
  text: (g) => { const x = mySect(g); const st = standAt(x, here(g)); return `${x.name}의 신도는 이제 ${followers(x)}명쯤. 이 고장에서 우리는 ${STAND_WORD[st]}. ${st === 'banned' ? '광장에서 입을 열면 그날로 이름이 성당 문에 붙는다.' : '광장에 서면 사람이 모인다. 사제도 모인다.'}`; },
  choices: (g, s) => [
    { label: '장터 한가운데서 큰 소리로', key: 'square' },
    ...(s.near ? [{ label: `${placeName(s.near)}에 가서`, key: 'near' }] : []),
    { label: '믿는 사람들 집을 돌며 조용히', key: 'homes' },
  ],
  resolve(g, rng, s, key) {
    const x = mySect(g), m = S(g).me;
    if (!x || !m) return '말할 자리가 없어졌다.';
    const cha = statOf(g, 'cha');
    const st = standAt(x, here(g));
    if (key === 'square') {
      const n = Math.max(1, Math.round(1 + cha / 4 + rng.int(0, 4)));
      x.places[here(g)] = (x.places[here(g)] ?? 0) + n;
      m.heat = clamp(m.heat + (st === 'banned' ? 25 : st === 'accepted' ? 0 : 8), 0, 100);
      x.zeal = clamp(x.zeal + 2, 0, 100);
      deed(g, 'brave', 1, null);
      return st === 'banned'
        ? `분수대에 올라 말했다. 첫마디에 사람들이 흩어졌고, 셋째 마디에 다시 모였다. 경비대가 오기 전에 내려왔다. 새 얼굴이 ${n}명.`
        : [`장터 한가운데서 말했다. 비웃는 사람, 지나가는 사람, 멈춰 서는 사람. 해가 질 무렵 멈춰 선 사람 ${n}명이 이름을 물었다.`,
          `빈 수레 위에 올라섰다. 누가 썩은 순무를 던졌다. 피하지 않았다. 순무를 던진 사람 옆에 서 있던 ${n}명이 끝까지 들었다.`,
          `장날 종이 울릴 때 말을 시작했다. 같은 말을 세 번 했다. 세 번째에 웃음소리가 그쳤다. 그날 이름을 적은 사람이 ${n}명.`,
          `이제 장터 사람들은 내가 어디 서는지 안다. 일부러 피해 가는 사람도, 일부러 찾아오는 사람도 있다. 오늘은 새 얼굴 ${n}명.`][(m.sermons = (m.sermons ?? 0) + 1) % 4];
    }
    if (key === 'near' && s.near) {
      tired(g, 10);
      const n = Math.max(1, Math.round(cha / 5 + rng.int(1, 4)));
      x.places[s.near] = (x.places[s.near] ?? 0) + n;
      m.heat = clamp(m.heat + 4, 0, 100);
      return `${placeName(s.near)}까지 걸어가 여관 마당에서 말했다. 낯선 사람의 말은 처음엔 아무도 듣지 않는다. 사흘째 되는 날 ${n}명이 남았다. 그들이 그 고장의 첫 신도다.`;
    }
    x.zeal = clamp(x.zeal + 6, 0, 100); m.zeal = clamp(m.zeal + 3, 0, 100);
    x.places[here(g)] = (x.places[here(g)] ?? 0) + (rng.chance(0.5) ? 1 : 0);
    return ['믿는 사람들 집을 돌았다. 부엌 식탁, 외양간, 병자의 머리맡. 늘어난 사람은 거의 없었지만 있던 사람들의 눈빛이 달라졌다.',
      '저녁마다 한 집씩 찾아갔다. 어느 집에선 아이가 내 무릎에서 잠들었고, 어느 집에선 늙은 신도가 오래 묵은 의심을 털어놓았다.',
      '병든 신도 머리맡에서 밤을 새웠다. 할 수 있는 것은 손을 잡는 것뿐이었다. 다음 모임에서 그 집 식구들이 맨 앞에 앉았다.'][(m.homes = (m.homes ?? 0) + 1) % 3];
  },
});
ACTIONS.push({
  id: 'sect_tithe', name: '헌금 걷기', icon: 'coin',
  desc: '신도들에게서 헌금을 걷는다. 모임 살림이 피지만, 돈이 돌면 사람이 변한다.',
  available: (g) => isProphet(g) && free(g) && followers(mySect(g)) >= 8 && mi(g) - (S(g).seen.tithe ?? -99) >= 6,
  run(g) {
    const x = mySect(g), st = S(g);
    st.seen.tithe = mi(g);
    const rate = x.teach.reduce((a, t) => a + TEACH[t].purse, 0) / x.teach.length;
    const n = Math.max(2, Math.round(followers(x) * rate * 0.25));
    g.player.money += n;
    x.purity = clamp(x.purity - (rate >= 2 ? 6 : 3), 0, 100);
    st.me.gave -= n;
    log(g, `헌금 은화 ${n}닢을 걷었다.`);
    return x.purity < 40
      ? `은화 ${n}닢. 바구니가 무거웠다. 누가 얼마를 냈는지 이제는 다 기억한다. 언제부터 그랬는지는 모르겠다.`
      : `은화 ${n}닢. 과부 둘의 집세와 집회소 지붕을 고치고도 남는다. 남는 것을 어디에 둘지가 처음으로 고민이 되었다.`;
  },
});
ACTIONS.push({
  id: 'sect_holy', name: '성지 정하기', icon: 'flag',
  desc: '이 고장을 내 교단의 성지로 정한다. 순례자가 찾아오고, 이 땅이 우리의 중심이 된다.',
  available: (g) => isProphet(g) && free(g) && !mySect(g).holy && (mySect(g).places[here(g)] ?? 0) >= 12,
  run(g) {
    const x = mySect(g);
    x.holy = here(g); x.zeal = clamp(x.zeal + 10, 0, 100);
    chron(g, `${g.player.name}, ${J(placeName(here(g)), '을/를')} ${x.name}의 성지로 정하다.`, 60);
    log(g, `${J(placeName(here(g)), '을/를')} 성지로 정했다.`);
    return `처음 모였던 헛간 앞에 돌 하나를 세웠다. 아무 글도 새기지 않았다. 다음 달부터 낯선 사람들이 그 돌을 만지러 왔다.`;
  },
});
ACTIONS.push({
  id: 'sect_meet', name: '교단 모임에 나가기', icon: 'pray',
  desc: '들어간 교단의 모임에 나간다.',
  available: (g) => S(g).me?.role === 'follower' && !!mySect(g) && !mySect(g).end && free(g) && presentHere(g, mySect(g)) && mi(g) - (S(g).seen.meet ?? -99) >= 2,
  run(g) {
    const st = S(g), x = mySect(g);
    st.seen.meet = mi(g);
    st.me.zeal = clamp(st.me.zeal + 3, 0, 100);
    if (standAt(x, here(g)) === 'banned') st.me.heat = clamp(st.me.heat + 4, 0, 100);
    stress(g, -4);
    const k = (st.tally.scenes + mi(g)) % T.GATHER.length;
    return T.GATHER[k];
  },
});
ACTIONS.push({
  id: 'sect_leave', name: '교단에서 나오기', icon: 'door',
  desc: '몸담은 교단을 떠난다. 세운 교단이면 제자에게 맡긴다.',
  available: (g) => !!S(g).me && free(g) && mi(g) - S(g).me.since >= 6,
  run(g) {
    const x = mySect(g), role = S(g).me.role;
    leaveSect(g, '스스로');
    return role === 'prophet'
      ? `${J(x?.name ?? '모임', '을/를')} 맡을 사람에게 등잔을 건넸다. 내가 세운 것이 내 손을 떠나는 것을 보았다. 생각보다 가벼웠다. 생각보다 허전했다.`
      : `${x?.name ?? '모임'}에 더는 나가지 않기로 했다. 매듭 지은 실을 서랍 깊이 넣었다. 버리지는 못했다.`;
  },
});

// 세운 이에게 오는 일들
defineScene('sx_warn', {
  need: (g) => isProphet(g),
  title: () => '사제의 방문',
  text: (g) => ((S(g).me?.warned ?? 0) === 0
    ? `성당 사제가 찾아왔다. 문간에 서서 들어오지 않았다. "${mySect(g)?.name ?? '자네 모임'} 이야기를 들었네. 이단심문소는 아직 모르네. 아직은." 사제는 내 손을 잠깐 잡았다가 놓았다.`
    : `그 사제가 또 왔다. 이번엔 혼자가 아니다. 뒤에 성당 경비대원 둘이 창을 세우고 섰다. "지난번에 한 말을 기억하겠지. ${mySect(g)?.name ?? '자네 모임'}의 이름이 주교님 책상에 올라갔네."`),
  choices: () => [{ label: '모임을 줄이겠다고 한다', key: 'calm' }, { label: '여신은 한 분이라고 맞선다', key: 'defy' }, { label: '성당에 헌금을 보낸다 (은화 20닢)', key: 'pay' }],
  resolve(g, rng, s, key) {
    const m = S(g).me, x = mySect(g);
    if (!m || !x) return '사제는 돌아갔다.';
    m.warned = (m.warned ?? 0) + 1;
    if (key === 'calm') { m.heat = clamp(m.heat - 20, 0, 100); x.zeal = clamp(x.zeal - 8, 0, 100); return '모임을 줄이겠다고 했다. 사제는 고개를 끄덕였다. 그날 밤 신도들에게 그 말을 전하자 몇이 고개를 돌렸다.'; }
    if (key === 'pay' && g.player.money >= 20) { g.player.money -= 20; m.heat = clamp(m.heat - 25, 0, 100); return '은화 스무 닢을 성당 구휼함에 넣었다. 사제는 받았다는 말도 하지 않았다. 그 주부터 성당 앞을 지나가도 아무도 나를 보지 않았다.'; }
    m.heat = clamp(m.heat + 15, 0, 100); x.zeal = clamp(x.zeal + 8, 0, 100);
    return '"여신은 한 분입니다. 성당은 여럿이어도." 사제는 한숨을 쉬었다. "그 말은 나만 들은 걸로 하지." 문을 닫으며 덧붙였다. "다음엔 내가 오지 않을 걸세."';
  },
});
defineScene('sx_patron', {
  need: (g) => isProphet(g),
  title: () => '비단 장갑',
  text: (g, s) => `${s.who} 사람을 보내왔다. 집회소를 새로 지어 주겠다고, 은화 ${s.amt}닢. 조건은 하나. 가르침에서 "${TEACH[mySect(g)?.teach[0] ?? 'poverty'].claim.split('.')[0]}"라는 대목을 조금 무르게 해 달라고.`,
  choices: (g, s) => [{ label: '받고 가르침을 고친다', key: 'take' }, { label: '돈만 받고 고치지 않는다', key: 'trick' }, { label: '돌려보낸다', key: 'refuse' }],
  resolve(g, rng, s, key) {
    const x = mySect(g), m = S(g).me;
    if (!x || !m) return '사람은 돌아갔다.';
    if (key === 'take') { g.player.money += s.amt; x.purity = clamp(x.purity - 20, 0, 100); x.zeal = clamp(x.zeal - 10, 0, 100); for (const pl of Object.keys(x.places)) x.places[pl] = Math.round(x.places[pl] * 1.1); log(g, `후원자의 돈을 받고 가르침을 고쳤다.`); return '새 집회소는 넓고 따뜻했다. 새로 온 사람도 많았다. 처음부터 있던 늙은 신도 하나가 문간에서 한참 서 있다가 돌아갔다.'; }
    if (key === 'trick') { g.player.money += s.amt; x.purity = clamp(x.purity - 10, 0, 100); deed(g, 'honest', -4, '후원자를 속였다더라'); m.heat = clamp(m.heat + 10, 0, 100); return '돈을 받았다. 가르침은 고치지 않았다. 석 달 뒤 후원자는 그 사실을 알았다. 그는 이제 성당에 헌금을 한다. 많이.'; }
    x.purity = clamp(x.purity + 6, 0, 100); x.zeal = clamp(x.zeal + 5, 0, 100);
    return '돌려보냈다. 그날 모임에서 그 이야기를 하자 아무도 말이 없었다. 누가 빵을 쪼개 내 앞에 놓았다.';
  },
});
defineScene('sx_disciple', {
  need: (g) => isProphet(g),
  title: () => '등잔을 이을 사람',
  text: (g, s) => `${J(s.name, '이/가')} 모임이 끝나고 남았다. ${s.age}살. 처음 왔을 때부터 맨 앞자리였다. "제가 언젠가 이 등잔을 들어도 되겠습니까." 내가 없어도 이 모임이 남으려면 누군가는 들어야 한다.`,
  choices: () => [{ label: '뒤를 맡기겠다고 한다', key: 'yes' }, { label: '아직 이르다고 한다', key: 'later' }, { label: '내 자식이 이을 것이라고 한다', key: 'kin' }],
  resolve(g, rng, s, key) {
    const m = S(g).me;
    if (!m) return '그 말은 그 밤에 남았다.';
    if (key === 'yes') { m.heirName = s.name; log(g, `${J(s.name, '을/를')} 뒤를 이을 사람으로 정했다.`); return `${s.name}의 손에 등잔을 쥐여 주었다. 불은 붙이지 않았다. "그때가 오면." 그는 고개를 숙였다.`; }
    if (key === 'kin') { m.heirName = 'kin'; return `${J(s.name, '은/는')} 고개를 끄덕였다. 실망한 얼굴은 아니었다. 그래도 그날 이후 맨 앞자리에 앉지 않는다.`; }
    return '아직 이르다고 했다. 그는 웃었다. "저도 그렇게 생각했습니다." 그 웃음이 마음에 들었다.';
  },
});
defineScene('sx_crown', {
  need: (g) => isProphet(g),
  title: (g, s) => `${realmName(s.realm)}의 사자`,
  text: (g, s) => `${realmName(s.realm)}에서 사람이 왔다. 신도가 ${s.n}명을 넘었으니 나라도 더는 모른 척할 수 없다고. 둘 중 하나다. ${s.hard >= 4 ? '흩어지거나, 금지되거나.' : '왕의 이름으로 축복을 내리고 세금을 내면 받아들인다. 아니면 금한다.'}`,
  choices: (g, s) => (s.hard >= 4
    ? [{ label: '숨어서라도 모이겠다고 한다', key: 'hide' }, { label: '가르침을 누그러뜨린다', key: 'soften' }]
    : [{ label: '왕을 축복하고 세금을 낸다', key: 'bless' }, { label: '여신 말고는 섬기지 않는다고 한다', key: 'refuse' }]),
  resolve(g, rng, s, key) {
    const x = mySect(g), m = S(g).me;
    if (!x || !m) return '사자는 돌아갔다.';
    x.crownDeal ??= {};
    if (key === 'bless') { x.crownDeal[s.realm] = 'accepted'; x.stand[s.realm] = 'accepted'; x.purity = clamp(x.purity - 8, 0, 100); m.heat = 0; log(g, `${realmName(s.realm)}에서 받아들여졌다.`); chron(g, `${J(realmName(s.realm), '이/가')} ${J(x.name, '을/를')} 받아들이다.`, 70); return '왕의 이름을 기도에 넣었다. 다음 달부터 낮에 모인다. 집회소 문에 나라의 인장이 붙었다. 신도 몇은 그 인장을 볼 때마다 고개를 돌린다.'; }
    if (key === 'soften') { x.teach = x.teach.length > 1 ? [x.teach[0]] : x.teach; x.crownDeal[s.realm] = 'tolerated'; x.stand[s.realm] = 'tolerated'; x.zeal = clamp(x.zeal - 15, 0, 100); return '가르침의 날을 무디게 했다. 나라는 눈감기로 했다. 뜨거운 신도 몇은 떠났다. 남은 사람들은 덜 두려워했다.'; }
    x.crownDeal[s.realm] = 'banned'; x.stand[s.realm] = 'banned'; x.zeal = clamp(x.zeal + 15, 0, 100); m.heat = clamp(m.heat + 30, 0, 100);
    log(g, `${realmName(s.realm)}에서 금지되었다.`);
    return '여신 말고는 아무도 섬기지 않는다고 했다. 사자는 말없이 돌아갔다. 한 달 뒤 성당 문에 우리 이름이 붙었다. 그날 밤 모임에는 평소의 두 배가 왔다.';
  },
});
defineScene('sx_trial', {
  need: (g) => isProphet(g),
  title: () => '이단 재판',
  text: (g) => `경비대가 집회소 문을 부수고 나를 끌어냈다. 재판정에는 사제 셋과 영주의 사람 하나. "${mySect(g)?.name ?? '네 무리'}의 가르침을 거두고 성광 앞에 엎드리면 목숨은 살려 준다." 뒤쪽 창살 너머로 신도들 얼굴이 보였다.`,
  choices: () => [{ label: '가르침을 거둔다', key: 'recant' }, { label: '끝까지 내 말을 지킨다', key: 'stand' }],
  resolve(g, rng, s, key) {
    const x = mySect(g), m = S(g).me;
    if (!x || !m) return '재판은 열리지 않았다.';
    if (key === 'recant') {
      m.heat = 0; m.zeal = clamp(m.zeal - 40, 0, 100);
      for (const pl of Object.keys(x.places)) x.places[pl] = Math.round(x.places[pl] * 0.5);
      x.zeal = clamp(x.zeal - 25, 0, 100);
      log(g, '재판정에서 가르침을 거두었다.'); note(g, '이단 재판에서 가르침을 거두었다.');
      return '가르침을 거둔다고 말했다. 목소리가 내 것 같지 않았다. 창살 너머 얼굴 몇이 사라졌다. 남은 얼굴들은 울고 있었다. 나를 위해 우는 것인지, 나 때문에 우는 것인지.';
    }
    jail(g, 18); m.heat = 30; x.zeal = clamp(x.zeal + 25, 0, 100);
    for (const pl of Object.keys(x.places)) x.places[pl] = Math.round(x.places[pl] * 1.1);
    deed(g, 'brave', 5, `재판정에서 끝까지 가르침을 지켰다더라`);
    chron(g, `${g.player.name}, 이단 재판에서 가르침을 지키고 옥에 갇히다.`, 70);
    return '내 말을 지켰다. 화형 대신 열여덟 달 옥살이가 떨어졌다. 영주가 신도들의 숫자를 셌다는 말을 나중에 들었다. 감옥 창 밑에서 밤마다 누가 노래를 불렀다.';
  },
});
defineScene('sx_legacy', {
  title: (g, s) => `${s.name}의 등잔`,
  text: (g, s) => `${J(s.prev, '이/가')} 세운 ${J(s.name, '이/가')} 남았다. 신도 ${s.n}명. 그들이 문 앞에 서 있다. 누가 이어 들 것인지 묻는 얼굴들이다.`,
  choices: () => [{ label: '내가 잇는다', key: 'lead' }, { label: '제자에게 맡긴다', key: 'give' }, { label: '흩어지게 둔다', key: 'end' }],
  resolve(g, rng, s, key) {
    const x = sectById(g, s.id), st = S(g);
    if (!x || x.end) return '모임은 이미 흩어졌다.';
    if (key === 'lead') { st.me = null; join(g, x, 'prophet'); x.mine = true; x.gen += 1; x.zeal = clamp(x.zeal - 5, 0, 100); return `등잔을 받았다. 무거웠다. ${J(s.prev, '이/가')} 어떻게 이걸 들고 다녔는지, 이제야 조금 안다.`; }
    if (key === 'give') { x.mine = false; x.origin = 'prophet'; x.prophet = { name: s.heir ?? prophetOf(ownRng(g, 9)).name, sex: 'm', age: 38 }; x.gen += 1; return `${J(x.prophet.name, '이/가')} 등잔을 받았다. 나는 뒷자리에 앉았다. 앞자리보다 잘 보였다.`; }
    x.end = { y: g.date.year, how: 'ended' }; st.tally.gone += 1;
    return '흩어지게 두었다. 마지막 모임에서 누가 처음 노래를 다시 불렀다. 끝까지 부른 사람은 몇 없었다.';
  },
});

/* ---------- 개혁 운동 장면 ---------- */
defineScene('sx_reform', {
  title: (g, s) => (s.stage === 0 ? '성당 문에 박힌 글' : '어느 편에 설까'),
  text: (g, s) => {
    const f = S(g).reform;
    if (!f) return '성당 앞은 조용했다.';
    return s.stage === 0
      ? `${placeName(f.place)} 성당 문에 긴 글이 박혀 있다. 성광교가 ${f.grv}고. 아래에 ${f.leader}의 이름. 사람들이 몰려서서 글을 읽을 줄 아는 사람에게 읽어 달라고 한다.`
      : `교황청이 ${J(f.leader, '을/를')} 파문했다. 예배당 사제는 그 이름을 말하는 자도 파문이라고 했다. 장터에서는 그 글을 베낀 종이가 빵보다 빨리 팔린다.`;
  },
  choices: (g, s) => (S(g).reform ? (s.stage === 0
    ? [{ label: '베껴서 돌린다', key: 'copy' }, { label: '떼어 내 사제에게 가져간다', key: 'tear' }, { label: '읽고 돌아선다', key: 'read' }]
    : [{ label: `${S(g).reform.leader} 편에 선다`, key: 'side' }, { label: '교황청 편에 선다', key: 'pope' }, { label: '입을 닫는다', key: 'quiet' }]) : []),
  resolve(g, rng, s, key) {
    const f = S(g).reform;
    if (!f) return '그 일은 이미 지나갔다.';
    f.seen.push(s.stage);
    if (key === 'copy' || key === 'side') { f.support = clamp(f.support + 6, 0, 100); deed(g, 'brave', 2, null); log(g, s.stage === 0 ? `${f.leader}의 글을 베껴 돌렸다.` : `개혁가 ${f.leader} 편에 섰다.`); return s.stage === 0 ? '밤새 베꼈다. 손가락에 먹물이 배어 사흘을 갔다. 그 종이가 어디까지 갔는지는 모른다. 장터에서 누가 내 글씨를 읽고 있었다.' : `${f.leader} 편에 섰다. 예배당에서 내 자리가 비었다. 대신 헛간에서 경전을 우리말로 읽는 모임에 내 자리가 생겼다.`; }
    if (key === 'tear' || key === 'pope') { f.support = clamp(f.support - 4, 0, 100); deed(g, 'loyal', 1, null); return s.stage === 0 ? '글을 떼어 사제에게 가져갔다. 사제는 고맙다며 그 자리에서 태웠다. 연기를 보던 사람들 눈이 나를 따라왔다.' : '교황청 편에 섰다. 미사는 그대로였고 사제도 그대로였다. 바뀐 것은 장터에서 나를 보는 몇몇의 눈이었다.'; }
    if (key === 'quiet') return `입을 닫았다. 예배당에서도, 장터에서도. ${J(f.leader, '이/가')} 옳은지 교황청이 옳은지는 해가 몇 번 바뀐 뒤에야 알게 될 것이다. 그때까지 살아 있으면.`;
    return '읽고 돌아섰다. 그 글의 한 줄이 오래 머리에 남았다. 어느 줄이었는지는 말하지 않기로 했다.';
  },
});

/* ---------- 한 달 ---------- */
function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over || !me(g)) return;
  const now = mi(g);
  if (g.date.month === 3) yearTick(g);
  const pl = here(g);
  const r = ownRng(g, 53);
  // 이 고장 교단 한 줄
  for (const x of liveSects(g)) {
    if (!presentHere(g, x, pl) || !seldom(g, `sect:${x.id}`, 30)) continue;
    line(g, 'presence', T.PRESENCE[standAt(x, pl)](x.name, x.teach[0]));
    x.known = true;
    break;
  }
  const age = playerAge(g);
  if (age < 16 || !free(g)) return;
  s.since ??= now;
  if (now - s.since < 12) return; // 처음 한 해는 지켜보기만
  // 내 설교 장면만 줄 서 있으면 막지 않는다 (설교를 자주 하는 교주에게도 교단 일이 오게)
  if (now - s.sceneAt < 4 || L(g).queue.filter((z) => z.kind !== 'sx_sermon').length >= 2 || L(g).queue.some((z) => /^sx_/.test(z.kind) && z.kind !== 'sx_sermon') || (L(g).scene && L(g).scene.kind !== 'sx_sermon') || g.pendingEvent) return;
  const q = (kind, data, gap = 0) => { if (gap && now - (s.seen[kind] ?? -999) < gap) return false; s.seen[kind] = now; s.sceneAt = now; s.tally.scenes += 1; queueScene(g, kind, data); return true; };
  const m = s.me;
  const x = mySect(g);
  // 개혁 운동: 성광의 땅 마을에서, 단계마다 한 번
  const f = s.reform;
  if (f && (f.stage === 0 || f.stage === 2) && !f.seen.includes(f.stage) && ['leonia', 'valhart', 'holy', 'march'].includes(realmOfPl(pl)) && r.chance(f.stage === 0 && pl === f.place ? 0.6 : 0.12)) return q('sx_reform', { stage: f.stage });
  if (m && x && !x.end) {
    if (m.role === 'prophet') {
      const total = followers(x), st = standAt(x, pl), rl = realmOfPl(pl);
      if (st === 'banned' && m.heat >= 50 && r.chance(0.12)) return q('sx_trial', {}, 24);
      if (total >= 10 && st !== 'accepted' && m.heat >= 15 && r.chance(0.1)) return q('sx_warn', {}, 36);
      if (inRealm(x, rl) >= 40 && !x.crownDeal?.[rl] && r.chance(0.1)) return q('sx_crown', { realm: rl, n: Math.floor(inRealm(x, rl) / 10) * 10, hard: hostility(g, x, rl) }, 48);
      if (total >= 15 && !m.heirName && r.chance(0.06)) {
        const p = living(g).find((y) => y.sect === x.id && !y.isPlayer && (y.place ?? 'ern') === pl && y.ageMonths >= 18 * 12 && !g.player.familyIds.includes(y.id));
        const nm = p?.name ?? prophetOf(r).name;
        return q('sx_disciple', { name: nm, age: p ? Math.floor(p.ageMonths / 12) : r.int(19, 30) }, 36);
      }
      if (total >= 25 && r.chance(0.05)) return q('sx_patron', { who: r.pick(['곡물 상인 조합장이', '하르펜의 포목상이', '늙은 기사 부인이', '소금 상단 사람이']), amt: r.pick([60, 80, 120]) }, 60);
      if (r.chance(0.03)) kinScene(g, r, x, q, true);
      return;
    }
    // 신도
    if (presentHere(g, x, pl)) {
      const st = standAt(x, pl);
      if (st === 'banned' && m.heat >= 25 && r.chance(0.07)) return q('sx_raid', {}, 30);
      if (x.zeal >= 40 && !s.seen[`miracle:${x.id}`] && r.chance(0.07)) { s.seen[`miracle:${x.id}`] = now; return q('sx_miracle', { k: (x.id + now) % T.MIRACLE.length, v: now }); }
      if (x.purity < 35 && !s.seen[`doubt:${x.id}`] && r.chance(0.1)) { s.seen[`doubt:${x.id}`] = now; return q('sx_doubt', {}); }
      if (r.chance(0.04) && kinScene(g, r, x, q, false)) return;
      if (r.chance(0.1)) return q('sx_gather', { v: now }, 10);
    }
    return;
  }
  // 아직 아무 데도 안 들어갔다: 이 고장 교단이 다가온다
  const near = liveSects(g).filter((y) => presentHere(g, y, pl) && !y.mine && !s.former.includes(y.id) && now - (s.met[y.id] ?? -999) >= 24);
  if (!near.length || !r.chance(0.07 + Math.min(0.06, near.reduce((a, y) => a + (y.places[pl] ?? 0), 0) / 1500))) return;
  const y = r.pick(near);
  s.met[y.id] = now;
  const w = who(g, y, pl);
  q(standAt(y, pl) === 'banned' ? 'sx_invite' : 'sx_preach', { id: y.id, whoName: w.name, whoId: w.id, v: now });
}
// 식구가 같은 교단에 들어가거나 말린다
function kinScene(g, r, x, q, prophet) {
  const meP = me(g), s = S(g);
  if (mi(g) - (s.seen.sx_kin ?? -999) < 60) return false;
  const sp = byId(g, meP.spouseId);
  const kids = (meP.childIds ?? []).map((id) => byId(g, id)).filter((p) => p?.alive && p.ageMonths >= 14 * 12 && (p.place ?? 'ern') === here(g) && !p.away);
  // 아이가 스스로 들어가는 쪽 (다른 교단이거나 내 교단)
  const other = liveSects(g).find((y) => y.id !== x.id && presentHere(g, y));
  const kid = kids.find((p) => !p.sect);
  if (kid && other && r.chance(0.5)) return q('sx_kin', { pid: kid.id, id: other.id, mine: true, rel: kid.sex === 'm' ? '아들' : '딸' });
  if (!prophet && sp && sp.alive && !sp.away && (sp.place ?? 'ern') === here(g) && sp.sect !== x.id) return q('sx_kin', { pid: sp.id, id: x.id, mine: false, rel: '배우자' });
  return false;
}

HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.sect = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g) => {
  const s = S(g);
  const prev = s.me, x = prev ? sectById(g, prev.sect) : null;
  s.past.push(...(prev ? [{ y: g.date.year, text: `${x?.name ?? '교단'}의 ${prev.role === 'prophet' ? '세운 이' : '신도'}로 살았다.` }] : []));
  if (s.past.length > 10) s.past.splice(0, s.past.length - 10);
  s.me = null; s.sceneAt = mi(g); s.since = mi(g) - 12;
  const np = me(g);
  // 새 주인이 이미 다니던 교단이 있으면 그대로
  if (np?.sect && sectById(g, np.sect) && !sectById(g, np.sect).end) s.me = { sect: np.sect, role: 'follower', since: mi(g), zeal: 40, heat: 0, gave: 0, brought: 0, heirName: null };
  if (prev?.role === 'prophet' && x && !x.end) {
    const prevName = x.founder ?? '선대';
    if (prev.heirName && prev.heirName !== 'kin') { x.mine = false; x.origin = 'prophet'; x.prophet = { name: prev.heirName, sex: 'm', age: 35 }; x.gen += 1; log(g, `${J(prev.heirName, '이/가')} ${x.name}의 등잔을 이었다.`); }
    else { x.prophet = null; queueScene(g, 'sx_legacy', { id: x.id, name: x.name, prev: g.people.find((p) => p.wasPlayer && !p.alive && p.name === prevName)?.name ?? prevName, n: followers(x), heir: null }, { first: true }); }
  }
});

/* ---------- 화면 연결점 ---------- */
export function sectLines(g) { return (g.sect?.month ?? []).slice(0, 2).map((y) => ({ ...y })); }
export function sectLine(g) { return sectLines(g)[0]?.text ?? null; }
export function sectInfo(g) {
  const s = S(g), x = mySect(g), m = s.me;
  const pl = here(g);
  const live = liveSects(g);
  const mine = x && m ? {
    name: x.name, founder: x.founder ?? (x.prophet ? x.prophet.name : null), role: m.role === 'prophet' ? '세운 이' : '신도',
    prophet: x.mine && m.role === 'prophet' ? g.player.name : x.prophet?.name ?? null,
    since: Math.floor((mi(g) - m.since) / 12), holy: x.holy ? placeName(x.holy) : null,
    teach: x.teach.map((t) => ({ name: TEACH[t].name, claim: TEACH[t].claim })),
    followers: followers(x), zeal: Math.round(x.zeal), myZeal: Math.round(m.zeal), purse: Math.round(x.purse), purity: Math.round(x.purity),
    persecuted: Object.entries(x.stand).filter(([, v]) => v === 'banned').map(([r]) => realmName(r)),
    realm: STAND_WORD[standAt(x, pl)], heat: Math.round(m.heat), heir: m.heirName === 'kin' ? '내 자식' : m.heirName,
    split: x.splitFrom ? sectById(g, x.splitFrom)?.name ?? '옛 모임' : null,
    places: Object.entries(x.places).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, n]) => ({ place: placeName(p), n, stand: STAND_WORD[standAt(x, p)] })),
    log: s.log.slice(-6).map((y) => ({ ...y })),
  } : null;
  const sects = [...live, ...s.list.filter((y) => y.end).slice(-3)].filter((y) => y.known || y.mine || y.id === m?.sect || followers(y) >= 30).map((y) => ({
    name: y.name, prophet: y.mine && isProphetOf(g, y) ? g.player.name : y.prophet?.name ?? null, word: word(y),
    place: placeName(y.holy ?? y.home), followers: followers(y),
    stand: STAND_WORD[standAt(y, pl)], teach: y.teach.map((t) => TEACH[t].name).join('·'), gone: !!y.end, here: presentHere(g, y, pl),
  }));
  const f = s.reform;
  return {
    line: live.length ? `세상에 새 믿음이 ${live.length}갈래. ${live.filter((y) => presentHere(g, y, pl)).length ? `${placeName(pl)}에도 모이는 사람들이 있다.` : `${placeName(pl)}에는 아직 없다.`}` : '아직 새 믿음이라 할 만한 것은 없다.',
    mine, sects,
    reform: f ? { leader: f.leader, place: placeName(f.place), stage: T.REFORM.stage[f.stage], grv: f.grv } : s.reformDone ? { done: s.reformDone.how === 'split' ? `${J(realmName(s.reformDone.realm), '이/가')} 교황청과 갈라섰다 (${s.reformDone.y}년)` : `개혁 운동이 꺾였다 (${s.reformDone.y}년)` } : null,
    news: s.news.slice(-5).reverse().map((y) => ({ ...y })),
    past: s.past.slice(-4),
    tally: { ...s.tally },
  };
}
export const sectView = sectInfo;
void jj;
