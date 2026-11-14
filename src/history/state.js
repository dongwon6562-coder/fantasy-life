// 세계의 역사: 귀족 가문, 상단, 이름난 사람들, 세력의 힘, 발명.
// 플레이어가 아무것도 하지 않아도 매달 조금씩 움직이고, 30년이 지나면 세계의 얼굴이 바뀌어 있다.
// 상태는 g.history 하나에 모두 들어 있다. 저장 크기를 지키려고 목록마다 길이 제한을 둔다.
import { MALE_NAMES, FEMALE_NAMES, LAST_NAMES } from '../data.js';

export const H = (g) => g.history ?? null;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const MAX = { houses: 8, companies: 7, notables: 14 };

// 가문의 성품
export const TEMPER = { fair: '공정함', greedy: '탐욕스러움', harsh: '가혹함', weak: '유약함', bold: '야심만만함' };
export const TEMPERS = Object.keys(TEMPER);
export const TEMPER_ADJ = { fair: '공정한', greedy: '탐욕스러운', harsh: '가혹한', weak: '유약한', bold: '야심만만한' };

// 처음부터 있는 가문. 그라이펜 백작가는 world.js의 영주(g.realm.lord)와 같은 집이다.
const START_HOUSES = [
  { id: 'greifen', name: '그라이펜', title: '백작', seat: 'harfen', side: null, power: 55 },
  { id: 'verden', name: '베르덴', title: '백작', seat: 'verden', side: 'erik', power: 58 },
  { id: 'montrel', name: '몬트렐', title: '공작', seat: 'leocast', side: 'rudolf', power: 78 },
  { id: 'stern', name: '슈테른', title: '후작', seat: 'leocast', side: 'erik', power: 62 },
  { id: 'lauen', name: '라우엔', title: '자작', seat: null, side: 'rudolf', power: 40 },
];
// 새로 일어서는 가문의 성
export const NEW_HOUSE_NAMES = ['펠젠', '아르노', '브라이텐', '오스터', '할든', '케셀', '빈터', '로텐', '바이스', '틸만'];

// 처음부터 있는 상단. 은저울 상단은 소속(factions.js)으로도 쓰이므로 망하지 않는다(기둥).
const START_COMPANIES = [
  { id: 'silverscale', name: '은저울 상단', kind: 'grain', fortune: 62, pillar: true, founded: -120 },
  { id: 'redsail', name: '붉은돛 상회', kind: 'shipping', fortune: 48, founded: -40 },
  { id: 'ironhammer', name: '철망치 상회', kind: 'arms', fortune: 44, founded: -65 },
  { id: 'lamplight', name: '등불 마석 교역소', kind: 'manastone', fortune: 36, founded: -12 },
];
export const COMPANY_KIND = { grain: '곡물', shipping: '뱃짐', arms: '무기', manastone: '마석', cloth: '옷감', caravan: '대상(隊商)' };
export const NEW_COMPANY_WORDS = ['푸른 저울', '두 마리 사자', '은빛 바늘', '검은 닻', '세 갈래 길', '황금 보리', '쇠사슬', '여명', '북풍', '하얀 돛'];

// 이름난 사람의 갈래
export const KIND = { adventurer: '모험가', knight: '기사', mage: '마법사', merchant: '상인', outlaw: '무법자', scholar: '학자' };
export const GUILD_RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

// 세력: 매달 세계의 형편을 따라 조금씩 움직인다
export const POWERS = { nobles: '귀족파', knights: '기사단', church: '성광교', guild: '모험가 길드', mages: '마도사 협회', merchants: '상인 조합' };

export function personName(rng, sex) {
  return { name: rng.pick(sex === 'f' ? FEMALE_NAMES : MALE_NAMES), lastName: rng.pick(LAST_NAMES) };
}

function startNotables(rng, year) {
  const mk = (kind, fame, age, place, extra = {}) => {
    const sex = kind === 'knight' ? 'm' : rng.chance(0.35) ? 'f' : 'm';
    return { ...personName(rng, sex), sex, kind, fame, age, place, since: year, ...extra };
  };
  return [
    mk('adventurer', 74, rng.int(30, 40), 'leocast', { epithet: '은빛 창' }),
    mk('adventurer', 52, rng.int(22, 30), 'harfen'),
    mk('knight', 66, rng.int(35, 45), 'verden'),
    mk('mage', 58, rng.int(40, 55), 'leocast'),
    mk('merchant', 55, rng.int(38, 50), 'harfen'),
    mk('outlaw', 50, rng.int(28, 40), 'leocast', { epithet: '외눈' }),
    mk('scholar', 45, rng.int(45, 60), 'leocast'),
  ];
}

export function makeHistory(rng, g) {
  const year = g.date?.year ?? 0;
  const lord = g.realm?.lord;
  const houses = START_HOUSES.map((h) => {
    const sex = 'm';
    const head = h.id === 'greifen' && lord ? { name: lord.name, age: lord.age } : { name: personName(rng, sex).name, age: rng.int(30, 62) };
    return { ...h, head: head.name, age: head.age, temper: h.id === 'greifen' && lord ? lord.temper : rng.pick(TEMPERS), gen: 1, wealth: rng.int(40, 70), since: year - rng.int(60, 300) };
  });
  return {
    houses,
    companies: START_COMPANIES.map((c) => ({ ...c, founded: year + c.founded, peak: c.fortune })),
    notables: startNotables(rng, year),
    powers: { nobles: 58, knights: 50, church: 55, guild: 42, mages: 40, merchants: 45 },
    inventions: [],      // 이미 나온 발명의 id
    places: {},          // 장소마다 바뀐 모습 { harfen: ['광장에 등석 가로등이 섰다', ...] }
    vacant: {},          // 비어 있는 자리 { 'harfen:guildmaster': 비기 시작한 달 }
    seenAway: [],        // 마을을 떠난 사람 중 이미 살펴본 id
    lastRuler: g.realm?.ruler ?? 'oswald',
    fallen: 0, founded: 0, // 지금까지 무너진 가문·상단, 새로 선 것의 수
  };
}
