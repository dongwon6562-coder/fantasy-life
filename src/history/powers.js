// 세력의 힘과 발명.
// 세력: 전쟁이면 기사단이, 마물이 들끓으면 길드가, 돌림병과 용사 소식에는 교단이, 마석 시대에는 협회와 상인이 커진다.
// 서로 부딪히기도 한다: 교단의 이단 심문, 기사단의 뒷골목 소탕, 길드와 상인 조합의 세금 다툼.
// 발명: 기술 값이 문턱을 넘을 때마다 무언가가 세상에 나오고, 장소의 모습이 바뀐다.
import { H, clamp, POWERS } from './state.js';
import { J } from '../narrative/text.js';
import { nudge } from '../world.js';

export function powerTargets(g) {
  const r = g.realm, w = g.world ?? {}, hist = H(g);
  const war = r.balhart.war || r.north.war ? 1 : 0;
  const houses = hist.houses.filter((h) => !h.fallen);
  const avgHouse = houses.length ? houses.reduce((s, h) => s + h.power, 0) / houses.length : 50;
  const avgCo = hist.companies.length ? hist.companies.reduce((s, c) => s + c.fortune, 0) / hist.companies.length : 40;
  return {
    nobles: 35 + avgHouse * 0.35 + (r.ruler === 'rudolf' ? 12 : r.ruler === 'erik' ? -12 : 0),
    knights: 42 + war * 18 + (r.ruler === 'erik' ? 12 : 0) + (r.succession === 'civilwar' ? 8 : 0),
    church: 48 + (w.plague ? 14 : 0) + (r.heroBorn ? 10 : 0) + (r.ruler === 'rudolf' ? 8 : 0) - r.era * 4 + (r.monsters > 60 ? 5 : 0),
    guild: 30 + Math.max(0, r.monsters - 25) * 0.7 + (r.north.war ? 8 : 0),
    mages: 36 + r.era * 9 + (r.noahLight ? 4 : 0),
    merchants: 28 + avgCo * 0.35 + r.era * 6 - (r.bread > 1.5 ? 6 : 0),
  };
}

export function powerTick(g, rng, say, record, yearEnd) {
  const hist = H(g), P = hist.powers, r = g.realm;
  const T = powerTargets(g);
  for (const k of Object.keys(POWERS)) P[k] = clamp(P[k] + (T[k] - P[k]) * 0.025 + rng.normal(0, 0.5), 0, 100);
  // 마도사 협회가 크면 기술이 조금 빨리 자란다 (기본 속도의 15%까지)
  r.tech += Math.max(0, P.mages - 40) * 0.000015;
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
export const INVENTIONS = [
  { id: 'firestone', at: 0.35, by: 'mage', text: '불씨 없이 불을 붙이는 값싼 화석(火石)을 만드는 법을 찾아냈다', where: 'ern', look: '부엌마다 부싯돌 대신 화석이 놓였다.' },
  { id: 'streetlamp', at: 0.55, by: 'company', text: '하르펜 광장에 등석(燈石) 가로등을 세웠다', where: 'harfen', look: '밤에도 광장에 등석 가로등이 켜져 있다. 밤장사가 생겼다.' },
  { id: 'warmstone', at: 0.8, by: 'company', text: '시골에서도 살 수 있는 값싼 온석 화로를 팔기 시작했다', where: 'ern', look: '집집마다 온석 화로가 하나씩 있다. 겨울 장작 걱정이 줄었다.' },
  { id: 'manamill', at: 1.05, by: 'company', text: '마석으로 돌아가는 방아를 하르펜에 세웠다', where: 'harfen', look: '성문 밖에서 마석 방아가 밤낮으로 돈다. 방앗간 주인 둘이 문을 닫았다.' },
  { id: 'press', at: 1.3, by: 'scholar', text: '마도 인쇄기를 만들었다. 책값이 열 분의 일로 떨어졌다', where: 'leocast', look: '왕도 서점마다 찍어 낸 책이 쌓여 있다. 글을 읽는 평민이 늘었다.' },
  { id: 'signal', at: 1.6, by: 'mage', text: '왕도와 하르펜 사이에 마도 전신탑을 세웠다. 소식이 하루 만에 닿는다', where: 'harfen', look: '언덕 위 전신탑 꼭대기에서 푸른 빛이 깜빡인다. 왕도 소식이 하루 만에 온다.' },
  { id: 'erngrind', at: 1.9, by: 'company', text: '에른 같은 작은 마을에도 마석 방아를 들였다', where: 'ern', look: '물레방아 옆에 마석 방아가 들어섰다. 아낙들이 맷돌을 돌리지 않는다.' },
  { id: 'plow', at: 2.3, by: 'company', text: '마석을 박은 쟁기를 싸게 팔기 시작했다', where: 'ern', look: '마석 쟁기 덕에 한 사람이 두 사람 몫의 밭을 간다. 일손이 남는 집이 생겼다.' },
  { id: 'forge', at: 2.8, by: 'company', text: '마석 화로를 들인 대장간을 열었다. 쇠가 전보다 단단해졌다', where: 'harfen', look: '대장간 거리에 마석 화로의 푸른 불꽃이 늘어서 있다.' },
  { id: 'healstone', at: 3.3, by: 'mage', text: '상처를 덜 곪게 하는 정화석 붕대를 만들었다', where: 'leocast', look: '구빈원마다 정화석 붕대가 있다. 상처로 죽는 사람이 줄었다.' },
  { id: 'ironcart', at: 4.0, by: 'scholar', text: '말 없이 달리는 마석로 쇠수레를 만들었다', where: 'leocast', look: '왕도 대로에 말 없는 쇠수레가 다닌다. 마부들이 일거리를 잃고 있다.' },
  { id: 'railroad', at: 4.6, by: 'company', text: '왕도와 하르펜을 잇는 쇠수레 길을 놓기 시작했다', where: 'harfen', look: '성 밖으로 쇠수레 길이 놓이고 있다. 왕도까지 사흘이면 간다는 말이 돈다.' },
];

function inventions(g, rng, say, record) {
  const hist = H(g), r = g.realm;
  const next = INVENTIONS.find((v) => !hist.inventions.includes(v.id));
  // 플레이어가 한창 연구 중인 발명은 남들도 더디다 (경쟁·도용은 research 사건이 맡는다)
  const mine = g.research?.project?.kind === 'invent' && g.research.project.id === next?.id && g.research.project.prog >= 0.2;
  if (!next || r.tech < next.at || !rng.chance(mine ? 0.06 : 0.25)) return;
  hist.inventions.push(next.id);
  let who = '세레니아의 공방';
  if (next.by === 'company') {
    const c = [...hist.companies].sort((a, b) => (b.kind === 'manastone') - (a.kind === 'manastone') || b.fortune - a.fortune)[0];
    if (c) { who = c.name; c.fortune = clamp(c.fortune + 12, 0, 100); }
  } else {
    const n = hist.notables.filter((x) => x.kind === next.by || (next.by === 'scholar' && x.kind === 'mage')).sort((a, b) => b.fame - a.fame)[0];
    if (n && rng.chance(0.7)) { who = `${n.kind === 'mage' ? '마법사' : '학자'} ${n.name} ${n.lastName}`; n.fame = clamp(n.fame + 12, 0, 100); }
  }
  say(`${J(who, '이/가')} ${next.text}.`, true);
  record(`발명: ${next.text.split('.')[0]} (${who})`);
  place(g, next.where, next.look);
}
