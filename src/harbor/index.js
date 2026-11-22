// 포구와 어부의 삶 (32단계): 포구에 매인 작은 고깃배, 철마다 드는 고기, 어장 다툼, 폭풍과 실종, 내 배와 선원,
// 말리고 절여 팔기, 밀수꾼·해적과 엮이기, 포구의 풍습과 과부들. 큰 배의 항해·교역·해적질은 sea가 맡는다.
// 화면: harborLine(g) 오늘의 장면 한 줄, harborInfo(g) 화면용 묶음.
import { HOOKS } from '../hooks.js';
import { chron } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import {
  H, boat, boatHere, atHarbor, here, mi, ownRng, sky, placeName, groundOf, clamp,
  HARBORS, FISH, FISH_IDS, fishNow, BOATS, freshCount, curedCount, logHarbor,
} from './core.js';
import { harborMonth, canFish } from './life.js';

export { H as harborState, canFish };

const hullWord = (h) => (h >= 80 ? '튼튼하다' : h >= 50 ? '군데군데 샌다' : h >= 20 ? '위태롭다' : '곧 가라앉을 것 같다');
const feudWord = (f) => (f >= 60 ? '칼부림 직전' : f >= 30 ? '서로 그물을 노린다' : f >= 10 ? '눈치를 본다' : '조용하다');

/** 화면용 묶음 */
export function harborInfo(g) {
  const h = H(g), b = h.boat, pl = here(g);
  return {
    atHarbor: atHarbor(g),
    harbor: HARBORS[pl] ? { id: pl, name: HARBORS[pl].name, ground: HARBORS[pl].ground, god: HARBORS[pl].god, rival: placeName(HARBORS[pl].rival) } : null,
    season: fishNow(g.date.month).map((f) => FISH[f].name),
    boat: b ? { name: `${b.name}호`, kind: BOATS[b.kind].name, place: placeName(b.place), hull: hullWord(b.hull), nets: b.nets, netsMax: BOATS[b.kind].nets, crew: b.crew.length, crewMax: BOATS[b.kind].crew, since: b.since } : null,
    fresh: freshCount(g), cured: curedCount(g),
    hauls: h.hauls, earned: h.earned, smuggled: h.smuggled, spoiled: h.spoiled,
    grounds: Object.entries(h.grounds).filter(([k]) => HARBORS[k]).map(([k, v]) => ({ name: HARBORS[k].ground, rival: placeName(v.rival), state: feudWord(v.feud) })),
    lost: h.lost.slice(-6).map((x) => ({ ...x, place: placeName(x.place) })),
    widows: h.widows.filter((w) => w.place === pl).length,
    log: h.log.slice(-8),
  };
}

const MOOR = [
  (n) => `${n}호가 선창에 묶여 물결 따라 삐걱거린다.`,
  (n) => `${J(`${n}호`, '이/가')} 썰물에 갯벌 위로 비스듬히 누워 있다.`,
  (n) => `선원들이 ${n}호 뱃전에 기대어 그물코를 고르고 있다.`,
];
const QUIET = [
  '부두 끝에서 과부들이 둘러앉아 그물을 깁는다. 바늘 소리만 들린다.',
  '덕장마다 생선이 줄지어 매달려 바람에 돈다. 고양이들이 그 아래를 맴돈다.',
  '선창 목수가 뒤집어 놓은 배 바닥에 송진을 먹이고 있다.',
  '해 질 녘 포구 언덕에서 누군가 먼바다를 오래 바라보고 서 있다.',
];
/** 오늘의 장면에 붙는 한 줄. 포구가 아니면 null. */
export function harborLine(g) {
  if (!g?.player || g.over || !atHarbor(g)) return null;
  const h = H(g), pl = here(g), sk = sky(g), t = mi(g);
  if (['storm', 'blizzard'].includes(sk.weather)) return '배들이 모두 선창에 묶였다. 아낙들이 등대 아래 모여 아직 안 돌아온 배를 기다린다.';
  const lost = h.lost.filter((x) => x.place === pl && g.date.year - x.y <= 1);
  if (lost.length && t % 3 === 0) return `포구 언덕 돌무더기에 ${lost[lost.length - 1].name}의 이름이 새로 새겨졌다.`;
  if (boatHere(g) && t % 2 === 0) return MOOR[t % MOOR.length](boat(g).name);
  const ids = fishNow(g.date.month);
  if (ids.length && t % 4 !== 3) return FISH[ids[t % ids.length]].line;
  return QUIET[t % QUIET.length];
}

/* ---------- 플레이어 없이도 굴러가는 포구 ---------- */
const DROWNED = ['토마스', '말로', '바스코', '한넬', '오스카', '페터', '얀', '루카스', '에밀', '닐스', '아르네', '모리츠'];
export function harborWorld(g, rng) {
  const h = H(g), m = g.date.month, sk = sky(g);
  // 어장 다툼은 해가 갈수록 조금씩 식는다
  for (const k of Object.keys(h.grounds)) h.grounds[k].feud = clamp(h.grounds[k].feud - 1, 0, 100);
  // 궂은 달이면 어느 포구의 배 하나가 돌아오지 않는다
  const risk = (['storm', 'blizzard'].includes(sk.weather) ? 0.35 : 0.03) + ([10, 11, 12, 1].includes(m) ? 0.03 : 0);
  if (rng.chance(risk)) {
    const pl = rng.pick(Object.keys(HARBORS));
    const nm = rng.pick(DROWNED);
    h.lost.push({ name: nm, y: g.date.year, place: pl, how: '고깃배' });
    h.widows.push({ name: `${nm}의 아내`, place: pl, y: g.date.year, helped: false, of: nm });
    if (atHarbor(g) && here(g) === pl) logHarbor(g, `${placeName(pl)}의 ${J(nm, '이/가')} 바다에서 돌아오지 못했다.`);
    if (rng.chance(0.25)) chron(g, `${placeName(pl)}의 고깃배 한 척이 돌아오지 않다.`, 15);
  }
  // 과부들은 다시 시집가거나 늙어 세상을 뜬다
  h.widows = h.widows.filter((w) => g.date.year - w.y < 12);
  if (h.widows.length > 16) h.widows.splice(0, h.widows.length - 16);
  if (h.lost.length > 40) h.lost.splice(0, h.lost.length - 40);
}

HOOKS.afterMonth.push((g) => {
  if (g.over) return;
  const rng = ownRng(g, 32);
  harborMonth(g, rng);
  harborWorld(g, rng);
});
