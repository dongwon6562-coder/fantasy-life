// 바다와 항해: 항구, 뱃길, 바다 위의 상태.
// - 항구: 클라인 항(레오니아 서해안), 항구도시 포르텔(자유도시 연합), 살트마레(남해 해상 연맹의 수도),
//   까마귀 둥지(해적단의 요새 섬, 해적만 들어간다), 소금바위섬(서쪽 바다의 작은 섬, 새로 지도에 올린다).
// - 뱃길은 육로(PLACES.links)와 따로 SEA_ROUTES에 둔다. 섬은 배로만 간다.
// - 상태는 game.sea 하나: { ship, pirate, hunted, voyages, prices, cargo, monsters, wrecks }
import { HOOKS } from '../hooks.js';
import { JOBS, SKILLS } from '../data.js';
import { PLACES } from '../places.js';
import { MAP_PLACES_EXTRA } from '../art/map.js';
import { REALMS, REALM_IDS, FOREIGN } from '../realms/index.js';
import { NAMES, REALM_PEOPLE } from '../realms/data.js';
import { CRIMES } from '../crime.js';
import { FOES } from '../adventure/combat.js';
import { L } from '../adventure/core.js';

/* ---------- 새 기술: 뱃일 ---------- */
if (!SKILLS.some((s) => s.id === 'sailing')) SKILLS.push({ id: 'sailing', name: '뱃일' });

/* ---------- 남해 해상 연맹 (나라) ---------- */
// 지도(art/mapdata.js nations)의 id 'sea'와 같다. realms가 다른 나라처럼 다룰 수 있게 같은 모양으로 넣는다.
if (!REALMS.sea) {
  REALMS.sea = {
    name: '남해 해상 연맹', short: '해상 연맹', capital: 'saltmare',
    rule: '해적 섬장들의 회의',
    ruler: '섬장 회의',
    desc: '남해 군도의 해적 섬장들이 모여 만든 연맹. 왕도 법전도 없고, 돈과 칼과 배가 곧 법이다. 대륙의 나라들은 해적 소굴이라 부르지만, 그들의 배 없이는 남해를 건널 수 없다.',
    faith: { name: '바다의 늙은이', desc: '배마다 뱃머리에 작은 사당을 두고 바다의 늙은이에게 술을 붓는다. 성광교 사제는 섬에 오래 머물지 못한다.' },
    status: '배를 가진 자가 위, 배에 탄 자가 그다음. 출신도 종족도 묻지 않는다. 배신자만은 바다에 던진다.',
    speech: '섬 말씨',
    price: 1.15,
    law: {
      sum: '섬장의 말이 법이다. 육지의 현상금은 여기까지 오지 않는다. 대신 섬 안에서 섬 사람을 건드리면 목숨으로 갚는다.',
      watch: '섬장의 부하들', sentence: 0.5, fine: 0.6, bribe: 0.4, hangAt: 2, hangNoto: 101, lord: false,
    },
    naturalize: { months: 12, fee: 10, buy: 60, how: '한 해를 섬에서 살거나, 섬장에게 은화 60닢을 바치면 섬사람으로 쳐준다.' },
    extradites: [],
  };
  if (!REALM_IDS.includes('sea')) REALM_IDS.push('sea');
  if (!FOREIGN.includes('sea')) FOREIGN.push('sea');
}
NAMES.sea ??= {
  m: ['카를로', '바스코', '디에고', '말로', '토마스', '에스테반', '라파', '노아크', '킬리안', '오스만'],
  f: ['마렌', '이솔다', '카탈리나', '루시아', '네라', '소피아', '마리솔', '알바'],
  last: ['갈고리손', '소금이빨', '흑돛', '바다쥐', '세 손가락', '물개', '녹슨 닻', '외눈'],
};

/* ---------- 항구와 섬 ---------- */
Object.assign(PLACES, {
  klein: {
    name: '클라인 항', kind: '항구 마을',
    desc: '레오니아 서해안의 어항. 짠 바람에 그물이 마르고, 부둣가 주막마다 비린내와 뱃노래가 섞인다. 서쪽 바다에서 올라오는 해적과 마물 때문에 망루에는 밤낮으로 사람이 선다.',
    inn: 2, rent: 3, house: 220, wage: 1.05,
    links: { harfen: 1 }, port: true,
  },
  portel: {
    name: '항구도시 포르텔', kind: '항구 도시', realm: 'free',
    desc: '대륙 최대의 항구. 부두에 돛대가 숲처럼 서 있고, 열두 나라의 말이 뒤섞인다. 낮에는 상인 의회의 세관이, 밤에는 뒷골목의 암시장이 이 도시를 굴린다.',
    inn: 5, rent: 7, house: 950, wage: 1.4, loot: 2.2, crowd: 0.3,
    links: { barka: 2 }, port: true,
  },
  saltmare: {
    name: '살트마레', kind: '섬의 수도', realm: 'sea',
    desc: '남해 군도의 해적 섬장들이 다스리는 섬 도시. 빼앗은 배의 돛으로 지붕을 이고, 부둣가에서 훔친 물건과 노예와 정보가 한데 팔린다. 돈만 있으면 무엇이든 살 수 있다.',
    inn: 4, rent: 5, house: 500, wage: 1.25, loot: 1.6, crowd: 0.35,
    links: {}, port: true,
  },
  crow: {
    name: '까마귀 둥지', kind: '해적 요새 섬', realm: 'sea',
    desc: '가장 악명 높은 해적단, 까마귀단의 요새 섬. 절벽에 판 동굴 부두에 검은 돛배들이 숨어 있다. 해적이 아닌 자가 이 섬에 닿으면 돌아가지 못한다.',
    inn: 2, rent: 2, house: 0, wage: 1.0, loot: 1.2, crowd: 0.5,
    links: {}, port: true, hidden: true,
    open: (g) => !!g.sea?.pirate,
  },
  saltrock: {
    name: '소금바위섬', kind: '외딴 섬', realm: 'sea',
    desc: '서쪽 바다 한가운데 솟은 흰 바위섬. 등대 하나와 어부 마을 하나, 소금밭이 전부다. 섬 북쪽 해식 동굴에서는 밤마다 무언가 우는 소리가 들린다고, 어부들은 그쪽으로 그물을 치지 않는다.',
    inn: 2, rent: 2, house: 140, wage: 0.95, loot: 1.0, crowd: 0.6,
    links: {}, port: true,
  },
});
PLACES.harfen.links.klein = 1;
if (PLACES.barka) PLACES.barka.links.portel = 2;

// 새 섬은 지도에 없던 곳이라 올린다 (클라인·포르텔·살트마레·까마귀 둥지는 지도에 이미 있다)
MAP_PLACES_EXTRA.push({
  id: 'saltrock', n: '소금바위섬', x: 362, y: 902, t: 'town', area: '서쪽 바다', realm: '남해 해상 연맹',
  d: '서쪽 바다 한가운데의 흰 바위섬이에요. 등대와 어부 마을, 소금밭이 있어요. 북쪽 해식 동굴에 바다 마물이 산다는 말이 있어요. 배로만 갈 수 있어요.',
  todo: '고기잡이, 바다 마물 사냥, 밀수꾼의 동굴',
});

// 그곳에서 만나는 사람
Object.assign(REALM_PEOPLE, {
  klein: [
    { role: 'harbor_master', job: 'sea_captain', age: [45, 60], traits: ['reserved', 'diligent'], title: '항구장' },
    { role: 'old_sailor', job: 'sailor', age: [50, 66], traits: ['gossip', 'kind'], title: '늙은 뱃사람' },
    { role: 'fisher', job: 'fisher', age: [20, 40], traits: ['brave', 'diligent'] },
  ],
  portel: [
    { role: 'harbor_master', job: 'sea_captain', age: [40, 58], traits: ['greedy', 'ambitious'], title: '세관장' },
    { role: 'broker', job: 'trade_master', age: [35, 55], traits: ['greedy', 'gossip'], title: '선주 조합 중개인' },
    { role: 'old_sailor', job: 'sailor', age: [30, 50], traits: ['brave', 'cruel'], title: '뱃사람' },
  ],
  saltmare: [
    { role: 'island_lord', job: 'pirate_lord', age: [40, 60], traits: ['cruel', 'ambitious'], skill: [60, 80], title: '섬장' },
    { role: 'fence', job: 'trade_master', age: [30, 55], traits: ['greedy', 'reserved'], title: '장물아비' },
    { role: 'old_sailor', job: 'pirate', age: [25, 45], traits: ['brave', 'gossip'], title: '해적' },
  ],
  saltrock: [
    { role: 'keeper', job: 'fisher', age: [55, 70], traits: ['reserved', 'pious'], title: '등대지기' },
    { role: 'fisher', job: 'fisher', age: [18, 35], traits: ['brave', 'kind'] },
  ],
});
Object.assign(JOBS, {
  sailor: { name: '선원', skill: 'sailing', income: 4 },
  sea_captain: { name: '선장', skill: 'sailing', income: 14 },
  fisher: { name: '어부', skill: 'sailing', income: 3 },
  pirate: { name: '해적', skill: 'sword', income: 5 },
  pirate_lord: { name: '해적 섬장', skill: 'sword', income: 20 },
});

/* ---------- 뱃길 ---------- */
// [항구, 항구, 달 수]
export const SEA_ROUTES = [
  ['klein', 'saltrock', 2], ['klein', 'portel', 3], ['klein', 'saltmare', 3],
  ['saltrock', 'saltmare', 2], ['saltrock', 'portel', 3],
  ['portel', 'saltmare', 1], ['portel', 'crow', 2], ['saltmare', 'crow', 1],
];
export const PORTS = ['klein', 'portel', 'saltmare', 'crow', 'saltrock'];
export const isPort = (place) => !!PLACES[place]?.port;
export function seaRoutesFrom(g, from) {
  const out = [];
  for (const [a, b, m] of SEA_ROUTES) {
    const to = a === from ? b : b === from ? a : null;
    if (!to) continue;
    if (PLACES[to].hidden && !PLACES[to].open?.(g)) continue;
    out.push({ to, months: m });
  }
  return out.sort((x, y) => x.months - y.months);
}
export const seaFare = (months) => months * 5;
export const atSea = (g) => !!L(g).travel?.sea;

/* ---------- 바다의 적 (교전 규칙의 FOES에 더한다) ---------- */
Object.assign(FOES, {
  pirate: { name: '해적', pow: 15, human: true, weapon: '굽은 단검' },
  pirate_captain: { name: '해적 선장', pow: 40, human: true, leader: true, weapon: '굽은 칼' },
  ship_guard: { name: '상선 호위병', pow: 14, human: true, weapon: '쇠뇌' },
  marine: { name: '해군 수병', pow: 21, human: true, weapon: '작살창' },
  navy_captain: { name: '해군 함장', pow: 46, human: true, leader: true, weapon: '세검' },
  drowned: { name: '익사자', pow: 18, undead: true, weapon: '녹슨 갈고리' },
  giant_crab: { name: '갈고리 게', pow: 22, bite: true },
  sea_serpent: { name: '심해 뱀', pow: 58, bite: true, leader: true },
  coast_militia: { name: '해안 민병', pow: 10, human: true, weapon: '쇠스랑' },
  drowned_captain: { name: '물에 잠긴 선장', pow: 50, undead: true, leader: true, weapon: '썩은 닻' },
});

/* ---------- 죄: 해적질 ---------- */
CRIMES.piracy ??= { name: '해적질', heat: 30, sev: 8, noto: 6 };

/* ---------- 상태 ---------- */
export const GOODS = {
  salt: { name: '소금', base: 6 },
  grain: { name: '밀', base: 8 },
  wine: { name: '포도주', base: 14 },
  fur: { name: '모피', base: 18 },
  spice: { name: '향신료', base: 26 },
  manastone: { name: '마석', base: 34 },
};
// 항구마다 싸게 사는 물건(-)과 비싸게 팔리는 물건(+)
export const PORT_GOODS = {
  klein: { grain: -0.3, salt: 0.15, wine: -0.15, spice: 0.35, fur: 0.1, manastone: 0.2 },
  portel: { spice: -0.25, manastone: -0.15, grain: 0.25, fur: 0.3, wine: 0.15, salt: 0.1 },
  saltmare: { wine: 0.4, grain: 0.35, spice: -0.1, manastone: 0.1, fur: 0.2, salt: -0.1 },
  saltrock: { salt: -0.45, grain: 0.3, wine: 0.25, spice: 0.15, fur: -0.05, manastone: 0.25 },
  crow: { wine: 0.5, grain: 0.4, spice: -0.2, manastone: -0.2, fur: 0.25, salt: 0.1 },
};
export function defaultSea() {
  return { ship: null, pirate: null, hunted: 0, voyages: 0, cargo: null, monsters: 0, wrecks: 0, drift: {}, lair: false };
}
export function S(g) {
  if (!g.sea) g.sea = defaultSea();
  return g.sea;
}
HOOKS.newGame.push((g) => { g.sea = defaultSea(); if (g.player?.skills && g.player.skills.sailing == null) g.player.skills.sailing = 0; });
HOOKS.migrate.push((g) => {
  g.sea = Object.assign(defaultSea(), g.sea ?? {});
  if (g.player?.skills && g.player.skills.sailing == null) g.player.skills.sailing = 0;
});

// 물건값: 기본값 × 항구 보정 × 달마다 흔들리는 시세 × 물가
export function priceAt(g, port, good) {
  const G = GOODS[good];
  if (!G) return 0;
  const adj = PORT_GOODS[port]?.[good] ?? 0;
  const drift = S(g).drift[`${port}:${good}`] ?? 0;
  return Math.max(1, Math.round(G.base * (1 + adj + drift) * (g.realm?.bread ?? 1) ** 0.3));
}
HOOKS.afterMonth.push((g, rng) => {
  const s = S(g);
  // 시세는 천천히 흔들리고 제자리로 돌아온다
  for (const port of Object.keys(PORT_GOODS)) for (const good of Object.keys(GOODS)) {
    const k = `${port}:${good}`;
    s.drift[k] = Math.max(-0.3, Math.min(0.3, (s.drift[k] ?? 0) * 0.85 + rng.normal(0, 0.05)));
  }
  if (s.hunted > 0) s.hunted = Math.max(0, s.hunted - 0.5);
});

export const sailing = (g) => g.player.skills.sailing ?? 0;
