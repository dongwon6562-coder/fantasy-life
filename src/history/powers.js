// 세력의 힘과 발명.
// 세력: 전쟁이면 기사단이, 마물이 들끓으면 길드가, 돌림병과 용사 소식에는 교단이, 마석 시대에는 협회와 상인이 커진다.
// 서로 부딪히기도 한다: 교단의 이단 심문, 기사단의 뒷골목 소탕, 길드와 상인 조합의 세금 다툼.
// 발명: 기술 값이 문턱을 넘을 때마다 무언가가 세상에 나오고, 장소의 모습이 바뀐다.
import { H, clamp, POWERS } from './state.js';
import { J } from '../narrative/text.js';
import { nudge } from '../world.js';
import { TECHS } from '../techtree/nodes.js';
import { techGrow } from '../techtree/grow.js';

export function powerTargets(g) {
  const r = g.realm, w = g.world ?? {}, hist = H(g);
  const war = r.balhart.war || r.north.war ? 1 : 0;
  const houses = hist.houses.filter((h) => !h.fallen);
  const avgHouse = houses.length ? houses.reduce((s, h) => s + h.power, 0) / houses.length : 50;
  const avgCo = hist.companies.length ? hist.companies.reduce((s, c) => s + c.fortune, 0) / hist.companies.length : 40;
  return {
    nobles: 35 + avgHouse * 0.35 + (r.ruler === 'rudolf' ? 12 : r.ruler === 'erik' ? -12 : 0),
    knights: 42 + war * 18 + (r.ruler === 'erik' ? 12 : 0) + (r.succession === 'civilwar' ? 8 : 0),
    church: 48 + (w.plague ? 14 : 0) + (r.heroBorn ? 10 : 0) + (r.ruler === 'rudolf' ? 8 : 0) - Math.min(r.era, 4) * 4 + (r.monsters > 60 ? 5 : 0),
    guild: 30 + Math.max(0, r.monsters - 25) * 0.7 + (r.north.war ? 8 : 0),
    mages: 36 + Math.min(r.era, 3) * 9 + Math.max(0, r.era - 3) * 2 + (r.noahLight ? 4 : 0),
    merchants: 28 + avgCo * 0.35 + Math.min(r.era, 4) * 6 - (r.bread > 1.5 ? 6 : 0),
  };
}

export function powerTick(g, rng, say, record, yearEnd) {
  const hist = H(g), P = hist.powers, r = g.realm;
  const T = powerTargets(g);
  for (const k of Object.keys(POWERS)) P[k] = clamp(P[k] + (T[k] - P[k]) * 0.025 + rng.normal(0, 0.5), 0, 100);
  // 마도사 협회가 크면 마법 갈래 기술이 빨리 자란다 (techtree people)
  inventions(g, rng, say, record);
  if (!yearEnd) return;

  // 가장 큰 세력이 바뀌었다
  const top = Object.keys(POWERS).sort((a, b) => P[b] - P[a])[0];
  if (hist.top && hist.top !== top) say(`왕국에서 가장 목소리가 큰 세력이 ${POWERS[hist.top]}에서 ${J(POWERS[top], '으로/로')} 바뀌었다는 말이 돈다.`);
  hist.top = top;

  // 부딪힘
  if (P.church > 62 && P.mages > 50 && rng.chance(0.2)) {
    P.mages -= 7; P.church += 3;
    say(rng.pick([
      '성광교가 왕도에 이단 심문소를 다시 열었다. 마도사 협회의 젊은 마법사 둘이 끌려갔다고 한다.',
      '성광교 주교가 "마석은 마신의 뼈"라는 설교를 했다. 마도구 공방 몇 곳에 돌이 날아들었다.',
    ]), P.church > 75);
    if (P.church > 75) record('성광교의 이단 심문, 마도사 협회와 충돌');
  }
  if (P.knights > 60 && r.blackGlove > 55 && rng.chance(0.25)) {
    nudge(g, 'blackGlove', -8);
    say('기사단이 왕도 빈민가를 쓸어 냈다. "검은 장갑"의 중간 두목 여럿이 교수대에 올랐다. 두목은 잡히지 않았다.', r.blackGlove < 40);
  }
  if (P.guild > 62 && P.nobles > 50 && rng.chance(0.15)) {
    P.nobles -= 4;
    say('모험가 길드가 영주들의 토벌 세금에 맞서 의뢰를 거부했다. 마물이 들끓자 영주들이 먼저 물러섰다.');
  }
  if (P.merchants > 62 && rng.chance(0.15)) {
    P.nobles -= 5; P.merchants += 3;
    say('하르펜 상인 조합이 영주에게서 장터 자치권을 사들였다. 장터 세금은 이제 상인들이 정한다.', true);
    record('하르펜 상인 조합, 장터 자치권을 얻음');
    place(g, 'harfen', '장터는 상인 조합이 다스린다. 영주의 세리 대신 조합의 저울잡이가 돌아다닌다.');
  }
  if (P.nobles < 30 && P.knights > 60 && rng.chance(0.1)) {
    say('귀족 몇이 기사단의 칼 앞에서 영지 세금 장부를 내놓았다. 귀족들의 시대가 저물고 있다는 말이 나온다.', true);
    record('귀족 세력의 쇠퇴');
  }
}

export function place(g, id, text) {
  const pl = H(g).places;
  pl[id] = pl[id] ?? [];
  if (!pl[id].includes(text)) pl[id].push(text);
  if (pl[id].length > 8) pl[id].shift();
}

// ---------- 발명 ----------
// 34단계부터 발명은 기술 나무(src/techtree/)가 자라게 한다. INVENTIONS는 나무의 마디 전부 (id·at·by·text·where·look는 예전 그대로)
export const INVENTIONS = TECHS;
function inventions(g, rng, say, record) { techGrow(g, rng, say, record); }
