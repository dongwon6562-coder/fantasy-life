// 주점과 여관 꾸리기: 상태와 도우미.
// - 장인의 식당(craft shop)과 따로, 누구든 돈이 있으면 주점(술·안주)이나 여관(방까지)을 산다. 일자리가 아니라 내 재산이다.
// - 잠자리 'inn'(places.js)은 남의 여관이다. 내 여관이 있는 고장에서 여관에 묵으면 방값이 들지 않는다.
// - 요리 솜씨(craft의 cooking)가 음식 맛을, 패거리(underworld)가 자릿세를, 경비대(crime)가 뒷방을 본다.
// 상태는 game.inn 하나: { inn: 지금 가게 | null, lost: 잃거나 판 가게, log, ... }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 59) ^ Math.imul(mi(g) * 53 + salt + 19, 2246822519)) | 0 });

// 가게를 낼 수 있는 고장: 집값이 있는 곳 (폐허·해적 섬 제외)
export const innOk = (pl) => !!PLACES[pl] && !PLACES[pl].hidden && (PLACES[pl].house ?? 0) > 0;
// 손님 크기: 마을 1, 소도시 2, 큰 도시 3
export const crowdOf = (pl) => { const h = PLACES[pl]?.house ?? 0; return h >= 750 ? 3 : h >= 280 ? 2 : 1; };
export const KINDS = {
  tavern: { name: '주점', desc: '술과 안주를 판다. 방은 없다.' },
  inn: { name: '여관', desc: '술과 음식에 방까지 낸다. 길손이 묵어 간다.' },
};
export const costOf = (pl, kind) => Math.round((PLACES[pl]?.house ?? 200) * (kind === 'inn' ? 1.4 : 0.8)) + (kind === 'inn' ? 100 : 60);
export const roomCost = (pl) => Math.round((PLACES[pl]?.house ?? 200) * 0.5) + 40;
export const MAX_ROOMS = 3;
// 값: 싸게 받으면 손님이 늘고 이름이 나지만 남는 게 적다. 비싸게 받으면 그 반대.
export const PRICES = {
  cheap: { name: '싸게', margin: 0.7, traffic: 1.3, fame: 1 },
  fair: { name: '제값', margin: 1, traffic: 1, fame: 0 },
  dear: { name: '비싸게', margin: 1.4, traffic: 0.7, fame: -1 },
};
export const ROLES = {
  cook: { name: '요리사', wage: 4, desc: '음식 맛이 오른다.' },
  maid: { name: '잡일꾼', wage: 2, desc: '가게가 깨끗해 손님이 는다.' },
  bouncer: { name: '문지기', wage: 3, desc: '싸움판을 빨리 정리한다.' },
  manager: { name: '지배인', wage: 6, desc: '내가 없어도 가게를 굴린다. 손이 검으면 빼돌린다.' },
};
export const ROLE_IDS = Object.keys(ROLES);
const WORKER_NAMES = ['뚱보 한스', '말 없는 그레타', '외눈 볼프', '빨간 머리 리나', '늙은 에곤', '쾌활한 미아', '곰 같은 브루노', '깐깐한 오틸리에', '젊은 토비아스', '과부 힐데가르트', '떠돌이 요나스', '쌍둥이 언니 안네'];
export const REGULARS = {
  merc: { name: '용병 대장 가르트', desc: '돈이 들어오면 다 쓰고, 없으면 외상을 단다.' },
  farmer: { name: '늙은 농부 엠브로스', desc: '저녁마다 같은 자리에서 같은 술을 마신다.' },
  merchant: { name: '떠돌이 상인 셀마', desc: '먼 고장 소식을 가장 먼저 가져온다.' },
  bard: { name: '음유시인 피트', desc: '노래값 대신 술을 마신다. 손님을 부른다.' },
  noble: { name: '몰락 귀족 아르놀트', desc: '옛 이름값으로 버티는 사람. 아는 사람이 많다.' },
};
export const REGULAR_IDS = Object.keys(REGULARS);
export const INN_NAMES = ['검은 황소', '졸린 용', '은방울', '세 개의 술통', '떠돌이의 쉼터', '붉은 등불', '외다리 까마귀', '황금 보리', '늙은 닻', '깨진 방패'];
// 밀수꾼이 드나드는 고장 (항구와 국경 장터)
export const SMUGGLE = ['barka', 'portel', 'klein', 'saltmare', 'harfen', 'graubel', 'fur', 'saltrock'];
// 나라마다 장사 세율
export const taxRate = (pl) => ({ free: 0.06, sea: 0.08, holy: 0.12, valhart: 0.12 }[PLACES[pl]?.realm] ?? 0.1);

function fresh() {
  return { inn: null, lost: [], opened: 0, sold: 0, log: [], eventAt: 0, rivalAt: 0, workerSeq: 1 };
}
export const I = (g) => (g.inn ??= fresh());
export const myInn = (g) => I(g).inn;
export const atInn = (g) => !!myInn(g) && here(g) === myInn(g).place && !L(g).travel;
export const innTitle = (inn) => `${inn.name} ${KINDS[inn.kind]?.name ?? '주점'}`;

export function newInn(g, place, kind, name, how = 'bought') {
  return {
    place, kind, name, rooms: kind === 'inn' ? 1 : 0, fame: 15, price: 'fair', clean: 50,
    workers: [], regulars: [], gens: 1, founded: g.date.year, by: g.player.name, how,
    backroom: { gamble: false, smuggle: false }, heat: 0, gang: null, rival: null,
    taxOwed: 0, dodged: 0, arrears: 0, cutAt: 0,
    last: { rev: 0, cost: 0, net: 0, guests: 0 }, total: 0, months: 0, worked: -1, workKind: null,
  };
}
export function hireWorker(g, rng, role) {
  const inn = myInn(g), used = new Set(inn.workers.map((w) => w.name));
  const name = rng.pick(WORKER_NAMES.filter((n) => !used.has(n))) ?? rng.pick(WORKER_NAMES);
  const w = { id: I(g).workerSeq++, name, role, skill: rng.int(20, 55), loyal: rng.int(35, 65), since: mi(g), honest: rng.chance(0.75) };
  inn.workers.push(w);
  return w;
}
export const workerOf = (g, role) => myInn(g)?.workers.find((w) => w.role === role) ?? null;
export const wagesOf = (inn) => inn.workers.reduce((a, w) => a + (ROLES[w.role]?.wage ?? 0), 0);
// 음식 맛 0~3: 요리사의 솜씨, 이 달 내가 부엌에 섰으면 내 요리 솜씨
export function foodOf(g) {
  const inn = myInn(g); if (!inn) return 0;
  const cook = workerOf(g, 'cook')?.skill ?? 0;
  const mine = inn.worked === mi(g) && inn.workKind === 'kitchen' ? (g.player.skills.cooking ?? 0) : 0;
  return clamp(Math.floor(Math.max(cook, mine, 10) / 22), 0, 3);
}
export const FOOD_WORD = ['멀건 수프', '그럭저럭 먹을 만한 음식', '맛있다는 소리를 듣는 음식', '먼 데서도 먹으러 오는 음식'];
export function fameWord(f) { return f >= 80 ? '온 나라에 이름난' : f >= 60 ? '고장에서 첫손꼽히는' : f >= 40 ? '단골이 붙은' : f >= 20 ? '그럭저럭 알려진' : '아무도 모르는'; }

export function logInn(g, text) {
  const s = I(g);
  s.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 24) s.log.length = 24;
}
// 가게를 잃는다 (팔거나, 타거나, 빼앗기거나)
export function loseInn(g, how, price = 0) {
  const s = I(g), inn = s.inn;
  if (!inn) return;
  s.lost.unshift({ place: inn.place, name: inn.name, kind: inn.kind, year: g.date.year, how, price, gens: inn.gens, founded: inn.founded });
  if (s.lost.length > 8) s.lost.length = 8;
  s.inn = null;
  logInn(g, `${innTitle(inn)}: ${how}.`);
}
export const innWorth = (inn) => inn ? Math.round(costOf(inn.place, 'tavern') * (inn.kind === 'inn' ? 1.6 : 1) * (0.6 + inn.fame / 200) + inn.rooms * roomCost(inn.place) * 0.6) : 0;

HOOKS.newGame.push((g) => { g.inn = fresh(); });
HOOKS.migrate.push((g) => {
  const s = Object.assign(fresh(), g.inn && typeof g.inn === 'object' ? g.inn : {});
  for (const k of ['lost', 'log']) if (!Array.isArray(s[k])) s[k] = [];
  s.lost = s.lost.filter((x) => x && typeof x === 'object');
  if (!Number.isFinite(s.workerSeq)) s.workerSeq = 1;
  const inn = s.inn;
  if (inn && (typeof inn !== 'object' || !innOk(inn.place) || !KINDS[inn.kind])) s.inn = null;
  if (s.inn) {
    const d = newInn(g, inn.place, inn.kind, typeof inn.name === 'string' ? inn.name : INN_NAMES[0]);
    const x = Object.assign(d, inn);
    if (typeof x.name !== 'string') x.name = INN_NAMES[0];
    if (!PRICES[x.price]) x.price = 'fair';
    if (!Array.isArray(x.workers)) x.workers = [];
    x.workers = x.workers.filter((w) => w && ROLES[w.role] && typeof w.name === 'string');
    for (const w of x.workers) for (const k of ['skill', 'loyal', 'since', 'id']) if (!Number.isFinite(w[k])) w[k] = k === 'id' ? s.workerSeq++ : 40;
    if (!Array.isArray(x.regulars)) x.regulars = [];
    x.regulars = x.regulars.filter((r) => r && REGULARS[r.id]);
    for (const r of x.regulars) { if (!Number.isFinite(r.mood)) r.mood = 50; if (!Number.isFinite(r.tab)) r.tab = 0; }
    if (!x.backroom || typeof x.backroom !== 'object') x.backroom = { gamble: false, smuggle: false };
    if (x.rival && (typeof x.rival !== 'object' || typeof x.rival.name !== 'string' || !Number.isFinite(x.rival.power))) x.rival = null;
    if (x.gang && (typeof x.gang !== 'object' || typeof x.gang.id !== 'string')) x.gang = null;
    for (const k of ['fame', 'clean', 'heat', 'taxOwed', 'dodged', 'arrears', 'rooms', 'gens', 'total', 'months']) if (!Number.isFinite(x[k])) x[k] = k === 'gens' ? 1 : k === 'fame' ? 15 : k === 'clean' ? 50 : 0;
    x.rooms = clamp(Math.round(x.rooms), 0, MAX_ROOMS); if (x.kind === 'tavern') x.rooms = 0; else x.rooms = Math.max(1, x.rooms);
    x.fame = clamp(x.fame, 0, 100); x.clean = clamp(x.clean, 0, 100); x.heat = clamp(x.heat, 0, 100);
    if (!x.last || typeof x.last !== 'object') x.last = { rev: 0, cost: 0, net: 0, guests: 0 };
    s.inn = x;
  }
  g.inn = s;
});
