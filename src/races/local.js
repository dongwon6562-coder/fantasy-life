// 48단계: 엘프 숲·드워프 산·수인 초원·마대륙에서 그 자리에서 만들어지는 사람(이웃·옥사 동료·식구의 벗·중매 상대 등)이
// 하인리히·콘라트 같은 사람 이름으로 나오던 것. 그 고장 사람으로 만들 때 이 함수를 거치면
// 넷 중 셋은 그 고장 종족이 되고 이름도 그 종족 이름이 된다(나머지 하나는 그 땅에 사는 사람으로 남는다).
// 난수를 쓰지 않는다(사람 번호로 정해서 다른 흐름이 흔들리지 않게).
import { PLACES } from '../places.js';
import { RACE_NAMES, BEASTS } from './data.js';

const REALM_RACE = { elf: 'elf', dwarf: 'dwarf', beast: 'beast', demon: 'demon' };

export function localRaceAt(place) {
  return REALM_RACE[PLACES[place]?.realm] ?? null;
}

/** p를 place 고장 사람으로: 그 고장이 다른 종족 땅이면 종족과 이름을 맞춘다. 이미 종족이 있으면 그대로. */
export function localize(g, p, place, { always = false } = {}) {
  if (!p || p.race || p.isPlayer) return p;
  const race = localRaceAt(place);
  if (!race || (!always && p.id % 4 === 0)) return p;
  const n = RACE_NAMES[race];
  if (!n) return p;
  p.race = race;
  if (race === 'beast') p.beast = p.beast ?? Object.keys(BEASTS)[p.id % Object.keys(BEASTS).length];
  const pool = (p.sex === 'm' ? n.m : n.f) ?? n.m;
  const taken = new Set((g?.people ?? []).filter((x) => x.alive && (x.place ?? 'ern') === place).map((x) => x.name));
  for (let k = 0; k < pool.length; k++) { p.name = pool[(p.id * 7 + k * 3) % pool.length]; if (!taken.has(p.name)) break; }
  if (race === 'beast') p.lastName = n.last?.[p.beast] ?? p.lastName;
  else if (Array.isArray(n.last) && n.last.length) p.lastName = n.last[p.id % n.last.length];
  return p;
}
