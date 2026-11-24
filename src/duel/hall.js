// 검의 세상 (43단계): 도장 사범들이 늙고 바뀌고, 이름난 검객들이 옮겨 다니며 서로 겨루고, 늙어 죽으면 제자가 이름을 잇는다.
// 내가 세운 유파는 대를 넘어 남는다(세운 사람이 없으면 문하생이 줄고, 끝내 문을 닫을 수도 있다). 플레이어 없이도 굴러간다.
// 상태는 game.swordhall (schools.js hallState):
//   masters: { 'school:place': { name, skill, age, who } }
//   famous: [{ id, name, epi, school, place, skill, age, alive, blade, lastAt, beaten, lost }]
//   own: null | { name, base, place, since, pupils, fame, mine, headName, away, closed }
//   log, past
import { HOOKS } from '../hooks.js';
import { makeRng } from '../rng.js';
import { PLACES } from '../places.js';
import { L, chron } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { SCHOOLS, SCHOOL_IDS, TEACH, hallState, poolName } from './schools.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 109) ^ Math.imul(mi(g) * 197 + salt + 433, 2654435761)) | 0 });
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const logH = (g, text) => { const H = hallState(g); H.log.push({ y: g.date.year, m: g.date.month, text }); if (H.log.length > 30) H.log.splice(0, H.log.length - 30); };

// 이름난 검객이 머무는 곳: 그 유파의 본산과 도장들
export const famousPlaces = (school) => [...new Set([...(SCHOOLS[school].seat ?? []), ...(TEACH[school] ?? []).map((t) => t.place), ...(school === 'yusu' ? ['verden', 'leocast'] : [])])].filter((p) => PLACES[p]);
const EPI = {
  yusu: ['흐르는 칼', '고요한 물', '받아치는'], ganggeom: ['바위 쪼개는', '한 칼의', '철갑'], hwanyeong: ['그림자', '얼굴 없는', '밤길의'],
  seonghwi: ['새벽 종', '맹세의', '빛 든 칼'], moru: ['모루 깨는', '쇠망치', '바위 도끼'], ipsae: ['잎새 바람', '두 칼의', '숲의'],
  balto: ['맨손의', '할퀴는', '들소 꺾는'], mulgyeol: ['너울 타는', '갑판의', '소금 칼'],
};
export const famousName = (f) => `'${f.epi}' ${f.name}`;
function makeFamous(rng, school, { young = false } = {}) {
  const pls = famousPlaces(school);
  return {
    id: `f${Math.floor(rng.next() * 1e9).toString(36)}`, name: poolName(rng, school), epi: rng.pick(EPI[school]), school,
    place: rng.pick(pls), skill: young ? 66 + rng.int(0, 10) : 70 + rng.int(0, 20), age: young ? 28 + rng.int(0, 10) : 34 + rng.int(0, 26),
    alive: true, blade: false, lastAt: -99, beaten: 0, lost: 0,
  };
}
// 처음 세상: 유파마다 한 사람, 그리고 아주 드물게 마검사 하나
export function seedFamous(g, rng) {
  const H = hallState(g);
  if (H.famous.length) return;
  for (const id of SCHOOL_IDS) H.famous.push(makeFamous(rng, id));
  const b = rng.pick(H.famous.filter((f) => f.school !== 'balto'));
  b.blade = true;
}

function famousYear(g, rng) {
  const H = hallState(g);
  for (const f of H.famous.filter((x) => x.alive)) {
    f.age += 1;
    f.skill = Math.max(50, Math.min(95, f.skill + (f.age < 45 ? 0.6 : f.age > 58 ? -1.2 : 0)));
    if (rng.chance(0.25)) f.place = rng.pick(famousPlaces(f.school));
    const die = f.age > 60 ? (f.age - 60) * 0.035 : 0.004;
    if (rng.chance(die)) {
      f.alive = false;
      const heir = makeFamous(rng, f.school, { young: true });
      heir.place = f.place; heir.blade = f.blade && rng.chance(0.3);
      H.famous.push(heir);
      chron(g, `${SCHOOLS[f.school].name}의 이름난 검객 ${J(famousName(f), '이/가')} 세상을 떠났다. 제자 ${J(heir.name, '이/가')} 칼을 이어받았다.`, 6);
      logH(g, `${J(famousName(f), '이/가')} 죽고 ${J(heir.name, '이/가')} 이름을 이었다.`);
    }
  }
  // 이름난 검객끼리 겨룬다 (구경꾼들이 이야기를 퍼뜨린다)
  const live = H.famous.filter((x) => x.alive);
  if (live.length >= 2 && rng.chance(0.35)) {
    const a = rng.pick(live), b = rng.pick(live.filter((x) => x !== a));
    const aw = rng.chance(Math.max(0.15, Math.min(0.85, 0.5 + (a.skill - b.skill) / 30)));
    const [w, l] = aw ? [a, b] : [b, a];
    w.skill = Math.min(95, w.skill + 1); l.skill = Math.max(50, l.skill - 1);
    chron(g, `${placeName(w.place)}에서 ${SCHOOLS[w.school].name}의 ${J(famousName(w), '이/가')} ${SCHOOLS[l.school].name}의 ${J(famousName(l), '을/를')} 꺾었다는 이야기가 돈다.`, 4);
  }
  // 오래 묵은 이름은 정리 (죽은 사람은 여섯만 남긴다)
  const dead = H.famous.filter((x) => !x.alive);
  if (dead.length > 6) H.famous = H.famous.filter((x) => x.alive || dead.slice(-6).includes(x));
  // 도장 사범도 늙는다
  for (const [key, m] of Object.entries(H.masters)) {
    m.age += 1;
    if (m.age > 66 && rng.chance(0.3)) {
      const old = m.name;
      m.name = poolName(rng, m.school); if (m.name === old) m.name = poolName(rng, m.school);
      m.age = 36 + rng.int(0, 10); m.skill = 56 + rng.int(0, 20);
      logH(g, `${placeName(key.split(':')[1])}의 ${SCHOOLS[m.school].name} 사범 ${J(old, '이/가')} 물러나고 ${J(m.name, '이/가')} 도장을 맡았다.`);
    }
  }
}

// 내가 세운 유파의 달
function ownMonth(g, rng) {
  const o = hallState(g).own;
  if (!o || o.closed) return;
  const there = o.mine && L(g).place === o.place && !L(g).travel;
  if (o.mine) {
    o.away = there ? 0 : (o.away ?? 0) + 1;
    if (there && rng.chance(0.15 + o.fame / 200)) o.pupils += 1;
    if (o.away > 6 && rng.chance(0.3)) o.pupils = Math.max(0, o.pupils - 1);
  } else {
    // 세운 사람이 없으면: 이름값이 천천히 빠지고, 이름이 남아 있으면 사범이 문하생을 받는다
    o.fame = Math.max(0, o.fame - 0.15);
    if (rng.chance(0.06 + o.fame / 400)) o.pupils += 1;
    if (rng.chance(0.08)) o.pupils = Math.max(0, o.pupils - 1);
  }
  o.pupils = Math.min(40, o.pupils);
  if (o.pupils <= 0 && !o.mine && mi(g) - o.since > 24) {
    o.closed = true;
    chron(g, `${placeName(o.place)}의 ${J(o.name, '이/가')} 마지막 문하생을 보내고 도장 문을 닫았다.`, 20);
  }
}

HOOKS.newGame.push((g) => { hallState(g); seedFamous(g, ownRng(g, 43)); });
HOOKS.migrate.push((g) => { hallState(g); seedFamous(g, ownRng(g, 43)); });
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const rng = ownRng(g, 43);
  seedFamous(g, rng);
  if (g.date.month === 1) famousYear(g, rng);
  ownMonth(g, rng);
});
// 대를 이으면: 이름난 검객과 우리 집안 유파는 남는다. 도장은 맏제자가 맡는다.
HOOKS.heir.unshift((g, rng) => { // 검 상태가 비워지기 전에
  const H = hallState(g), o = H.own;
  const s = g.sword;
  if (s && s.rank >= 2) H.past.push({ y: g.date.year, rank: s.rank, school: s.school });
  if (o && o.mine) {
    o.mine = false;
    o.headName = poolName(rng ?? ownRng(g, 44), o.base);
    chron(g, `${J(o.name, '은/는')} 맏제자 ${J(o.headName, '이/가')} 이어 맡았다.`, 20);
  }
});
