// 큰 미궁 "깊은 구렁": 드워프가 너무 깊이 파다 열어 버린 미궁. 서른 층, 여섯 지층.
// - 미궁 도시 구렁목: 구렁 입구에 드워프와 모험가들이 세운 도시. 쇠망치 골에서 한 달.
// - 지층마다 마물과 위험이 다르고, 지층 끝(5·10·15·20·25층)에는 문지기가 있다. 문지기를 쓰러뜨리면
//   그 층의 돌문이 열려 다음부터 거기서 내려갈 수 있다.
// - 30층에는 미궁의 주인 "깊은 왕"이 있다. 싸우거나, 봉인하거나, 무릎을 꿇을 수 있다.
// - 플레이어가 없어도 다른 탐사대가 내려간다. 그들이 먼저 주인에게 닿을 수도 있다.
// 상태는 game.deep 하나.
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { MAP_PLACES_EXTRA } from '../art/map.js';
import { REALM_PEOPLE } from '../realms/data.js';
import { FOES } from '../adventure/combat.js';
import { note, chron } from '../adventure/core.js';
import { J } from '../narrative/text.js';

/* ---------- 미궁 도시 ---------- */
PLACES.gorge = {
  name: '구렁목', kind: '미궁 도시', realm: 'dwarf',
  desc: '깊은 구렁 입구를 막은 성벽에 기대어 생긴 도시. 드워프 수비대가 반쯤 막아 둔 돌문을 지키고, 그 앞에 마석 거래소와 탐사대 주점과 장의사가 늘어서 있다. 아래에서 올라오는 더운 바람에는 늘 쇠와 썩은 것의 냄새가 섞여 있다.',
  inn: 4, rent: 6, house: 600, wage: 1.3, loot: 1.4, crowd: 0.4,
  links: { hammer: 1 },
};
if (PLACES.hammer) PLACES.hammer.links.gorge = 1;
// 지도에는 '깊은 구렁'(미궁)이 이미 있다. 그 입구의 도시를 올린다.
MAP_PLACES_EXTRA.push({
  id: 'gorge', n: '구렁목', x: 882, y: 128, t: 'town', area: '천룡 산맥', realm: '드워프 산악 왕국',
  d: '깊은 구렁 입구에 생긴 미궁 도시예요. 마석 거래소와 탐사대 주점이 있고, 드워프 수비대가 구렁의 돌문을 지켜요. 쇠망치 골에서 한 달 걸려요.',
  todo: '미궁 내려가기, 유물 감정, 탐사대 모집, 깊은 왕',
});
REALM_PEOPLE.gorge = [
  { role: 'gatekeeper', job: 'guard', age: [60, 140], traits: ['reserved', 'diligent'], title: '돌문 수비대장', race: 'dwarf' },
  { role: 'appraiser', job: 'trade_master', age: [45, 70], traits: ['greedy', 'reserved'], title: '유물 감정사' },
  { role: 'delver', job: 'adventurer', age: [22, 40], traits: ['brave', 'gossip'], title: '탐사대원' },
  { role: 'undertaker', job: 'priest', age: [40, 65], traits: ['pious', 'kind'], title: '장의사' },
];

/* ---------- 지층 ---------- */
export const FLOORS = 30;
export const STRATA = [
  {
    name: '옛 갱도', from: 1,
    text: ['버팀목이 썩어 내려앉은 드워프의 옛 갱도.', '광부들이 버리고 간 곡괭이와 수레가 녹슬어 있다.', '벽에 드워프 문자로 "더 파지 말 것"이라고 새겨져 있다.', '갱도가 갈라진다. 한쪽에서 바람이 올라온다.'],
    foes: [['kobold', 3, 5], ['giant_rat', 5, 9], ['deep_crawler', 2, 3]],
    hazard: { name: '무너지는 천장', stat: 'sen', dc: 30, text: '머리 위에서 돌가루가 떨어졌다.', ok: '소리를 먼저 듣고 몸을 날렸다. 등 뒤로 천장이 내려앉았다.', bad: '피할 틈이 없었다. 돌 더미에 깔렸다가 겨우 기어 나왔다.' },
    guard: { text: '갱도 끝, 광부들이 마지막으로 판 굴. 거대한 무언가가 광부들의 뼈 위에 웅크리고 있다.', enc: { unit: 'deep_crawler', count: 3, leader: 'tunnel_maw' } },
    ore: [3, 6],
  },
  {
    name: '불의 회랑', from: 6,
    text: ['바닥의 갈라진 틈마다 붉은 빛이 새어 나온다. 숨을 쉴 때마다 목이 탄다.', '녹은 바위가 강처럼 흐르는 동굴. 그 위에 드워프가 놓은 쇠다리가 하나 걸려 있다.', '벽이 유리처럼 매끄럽다. 무언가가 이 굴을 녹여서 팠다.'],
    foes: [['ember_hound', 3, 5], ['magma_crawler', 2, 4], ['hobgoblin', 3, 5]],
    hazard: { name: '독한 연기', stat: 'wil', dc: 36, text: '노란 연기가 낮게 깔려 흘러왔다.', ok: '젖은 천으로 입을 막고 숨을 참은 채 연기 밑을 기어 지났다.', bad: '연기를 들이마셨다. 눈앞이 흐려지고 한참을 토했다.' },
    guard: { text: '회랑의 끝, 용암 호수 한가운데 섬. 불길이 사람의 모양을 하고 일어섰다.', enc: { unit: 'ember_hound', count: 4, leader: 'flame_warden' } },
    ore: [6, 11],
  },
  {
    name: '버섯 숲', from: 11,
    text: ['집채만 한 버섯이 숲을 이룬 동굴. 갓 아래로 푸른 포자가 눈처럼 내린다.', '빛나는 이끼 사이로 무언가 기어간 자국이 길게 나 있다.', '버섯 기둥에 사람의 얼굴이 박혀 있다. 아직 눈을 깜빡인다.'],
    foes: [['myconid', 4, 7], ['spore_stalker', 2, 3], ['ghoul', 2, 4]],
    hazard: { name: '환각 포자', stat: 'wil', dc: 42, text: '달콤한 냄새가 났다. 동굴 벽이 숨을 쉬기 시작했다.', ok: '혀를 깨물어 정신을 붙잡았다. 동료의 어깨를 잡고 앞만 보고 걸었다.', bad: '죽은 사람들이 말을 걸어왔다. 정신을 차렸을 때는 한나절이 지나 있었고, 손톱이 다 깨져 있었다.' },
    guard: { text: '숲의 심장. 동굴 전체를 덮은 균사가 한곳으로 모여 거대한 몸을 이루었다.', enc: { unit: 'myconid', count: 5, leader: 'mycelium_heart' } },
    ore: [9, 16],
  },
  {
    name: '가라앉은 도시', from: 16,
    text: ['드워프보다 오래된 누군가의 도시. 기둥 하나가 성탑만 하다.', '무너진 신전의 벽화. 사람도 드워프도 아닌 것들이 무언가에게 절하고 있다.', '돌로 된 길에 바퀴 자국이 깊게 패어 있다. 수천 년 동안 무엇이 이 길을 오갔을까.'],
    foes: [['stone_sentinel', 2, 3], ['deep_ghoul', 3, 5], ['cultist', 4, 6]],
    hazard: { name: '옛 함정', stat: 'sen', dc: 48, text: '바닥 돌 하나가 다른 돌보다 반 치 낮았다.', ok: '발을 거두었다. 돌 틈에서 녹슨 창날이 솟았다가 들어갔다.', bad: '늦었다. 벽에서 쏟아진 화살이 갑옷 틈을 파고들었다.' },
    guard: { text: '도시의 왕궁. 왕좌를 지키던 석상이 천 년 만에 고개를 들었다.', enc: { unit: 'stone_sentinel', count: 3, leader: 'colossus' } },
    ore: [14, 24],
  },
  {
    name: '뼈의 강', from: 21,
    text: ['검은 물이 소리 없이 흐르는 지하 강. 강바닥이 하얗다. 전부 뼈다.', '강가에 배 한 척이 매여 있다. 노 젓는 자리에 아무도 없는데 노가 움직인다.', '물 위로 등불 같은 것들이 떠내려온다. 가까이 보니 사람의 눈이다.'],
    foes: [['drowned', 4, 6], ['deep_ghoul', 4, 6], ['bone_ferryman', 1, 2]],
    hazard: { name: '망각의 물', stat: 'int', dc: 54, text: '강물이 발목을 적셨다. 내가 왜 여기 왔는지 잠깐 생각나지 않았다.', ok: '어머니의 얼굴과 내 이름을 소리 내어 되뇌며 강을 건넜다.', bad: '건너편에 닿았을 때, 지난 몇 해의 일이 듬성듬성 지워져 있었다.' },
    guard: { text: '강의 하구, 뼈로 쌓은 둑. 뱃사공들의 우두머리가 삯을 받으러 왔다.', enc: { unit: 'bone_ferryman', count: 3, leader: 'river_warden' } },
    ore: [20, 32],
  },
  {
    name: '심연', from: 26,
    text: ['바닥이 없다. 벽에 박힌 쇠말뚝을 따라 어둠 속으로 내려간다.', '빛이 먹힌다. 횃불이 손바닥 크기만큼만 밝다.', '아래에서 거대한 심장이 뛰는 소리가 들린다. 벽이 그 박자에 맞춰 떨린다.'],
    foes: [['abyss_spawn', 3, 5], ['void_maw', 1, 2], ['bone_ferryman', 2, 3]],
    hazard: { name: '아래에서 부르는 목소리', stat: 'wil', dc: 60, text: '누군가 내 이름을 불렀다. 아래에서. 다정한 목소리였다.', ok: '귀를 막고 노래를 불렀다. 목소리가 화를 내며 멀어졌다.', bad: '나도 모르게 말뚝에서 손을 놓을 뻔했다. 동료가 멱살을 잡아채지 않았다면 끝이었다.' },
    guard: { text: '심연의 바닥 바로 위, 마지막 돌문. 문을 지키는 것은 입만 있는 어둠이었다.', enc: { unit: 'abyss_spawn', count: 4, leader: 'void_herald' } },
    ore: [28, 44],
  },
];
export const stratumOf = (floor) => STRATA[Math.min(STRATA.length - 1, Math.floor((Math.max(1, floor) - 1) / 5))];
export const isGuardFloor = (floor) => floor % 5 === 0 && floor < FLOORS;

/* ---------- 마물 ---------- */
Object.assign(FOES, {
  deep_crawler: { name: '구렁 지네', pow: 14, bite: true },
  tunnel_maw: { name: '갱도를 삼킨 것', pow: 38, bite: true, leader: true },
  ember_hound: { name: '불씨 사냥개', pow: 24, bite: true },
  magma_crawler: { name: '용암 도마뱀', pow: 30, bite: true },
  flame_warden: { name: '불의 파수꾼', pow: 62, leader: true },
  myconid: { name: '균사인', pow: 26, weapon: '포자 덩굴' },
  spore_stalker: { name: '포자 사냥꾼', pow: 36, bite: true },
  mycelium_heart: { name: '균사의 심장', pow: 84, leader: true },
  stone_sentinel: { name: '돌 파수병', pow: 42, weapon: '돌 주먹' },
  deep_ghoul: { name: '깊은 구울', pow: 34, undead: true, bite: true },
  colossus: { name: '왕좌의 거상', pow: 110, leader: true, weapon: '돌 도끼' },
  bone_ferryman: { name: '뼈 뱃사공', pow: 48, undead: true, weapon: '노' },
  river_warden: { name: '강의 수문장', pow: 140, undead: true, leader: true, weapon: '갈고리 장대' },
  abyss_spawn: { name: '심연의 새끼', pow: 56, bite: true },
  void_maw: { name: '공허의 입', pow: 70, bite: true },
  void_herald: { name: '심연의 전령', pow: 170, leader: true },
  deep_king: { name: '깊은 왕', pow: 200, undead: true, leader: true, weapon: '첫 곡괭이' },
});
// drowned는 바다(src/sea/)에서 더한다. 바다가 없을 때를 위해 비슷한 것을 둔다.
FOES.drowned ??= { name: '익사자', pow: 18, undead: true, weapon: '녹슨 갈고리' };

/* ---------- 유물 ---------- */
// kind: gear(장비 칸), stat(능력치), charm(지니고 다니면 미궁에서 도움), sell(팔 것), key(봉인 열쇠)
// curse가 있으면 감정하기 전에는 모른다. 쓰면 대가가 따른다.
export const RELICS = {
  lamp: { name: '드워프 광부의 등불', st: 0, kind: 'charm', value: 30, desc: '꺼지지 않는 등불. 미궁의 위험을 먼저 비춘다.', charm: { hazard: 10 } },
  rune_pick: { name: '룬이 새겨진 곡괭이', st: 0, kind: 'sell', value: 45, desc: '첫 갱도를 판 광부의 곡괭이. 드워프 장인들이 값을 잘 쳐준다.' },
  heartstone: { name: '불씨를 품은 심장석', st: 1, kind: 'stat', value: 80, desc: '손에 쥐면 따뜻하다. 삼키면 몸속에 불이 붙는다고 한다.', stat: { wil: 3, str: 2 } },
  lava_axe: { name: '용암에 벼린 도끼날', st: 1, kind: 'gear', value: 90, desc: '용암 속에서 식지 않은 도끼날. 자루를 갈아 끼우면 무기가 된다.', gear: { slot: 'weapon', v: 13 } },
  spore_crown: { name: '포자 왕관', st: 2, kind: 'stat', value: 70, desc: '살아 있는 버섯으로 엮인 관. 쓰면 어둠 속이 보인다.', stat: { sen: 5 }, curse: { stress: 15, text: '왕관이 뿌리를 내렸다. 밤마다 죽은 자들의 꿈을 꾼다.' } },
  mycel_cloak: { name: '균사 비단 망토', st: 2, kind: 'gear', value: 85, desc: '칼날이 미끄러지는 질긴 망토.', gear: { slot: 'armor', v: 9 } },
  star_map: { name: '옛 문명의 별 지도', st: 3, kind: 'sell', value: 180, desc: '돌판에 새긴 별자리. 지금 하늘과 별의 자리가 다르다. 학자들이 미친 듯이 탐낸다.' },
  sentinel_eye: { name: '파수 석상의 눈', st: 3, kind: 'charm', value: 120, desc: '돌로 된 눈알. 쥐고 있으면 함정이 보인다.', charm: { hazard: 15 } },
  ferry_coin: { name: '뱃사공의 동전', st: 4, kind: 'charm', value: 60, desc: '망자의 삯. 한 번은 죽음을 비켜 가게 해 준다고 한다.', charm: { save: 1 } },
  lethe: { name: '망각의 물 한 병', st: 4, kind: 'sell', value: 150, desc: '마시면 괴로운 기억이 사라진다. 귀족들이 비싸게 산다.' },
  abyss_shard: { name: '심연의 파편', st: 5, kind: 'stat', value: 200, desc: '빛을 먹는 검은 돌. 마력이 미친 듯이 차오른다.', stat: { int: 4, wil: 4 }, curse: { stress: 20, noto: 5, text: '파편이 속삭인다. 아래로, 더 아래로.' } },
  void_blade: { name: '공허를 먹은 검', st: 5, kind: 'gear', value: 260, desc: '날이 보이지 않는 검. 베인 자리에 아무것도 남지 않는다.', gear: { slot: 'weapon', v: 22 }, curse: { stress: 12, text: '검이 굶주렸다. 칼집에 넣어 두면 손이 떨린다.' } },
  gron_ring: { name: '그론의 봉인 반지', st: 5, kind: 'key', value: 300, desc: '첫 드워프 왕의 반지. 안쪽에 봉인의 룬이 새겨져 있다. 깊은 왕을 다시 잠재울 수 있는 열쇠라고 한다.' },
};
export const RELIC_IDS = Object.keys(RELICS);
export const relicsOfStratum = (st) => RELIC_IDS.filter((id) => RELICS[id].st === st);

/* ---------- 다른 탐사대 ---------- */
const RIVALS0 = [
  { id: 'red', name: '붉은 방패단', leader: '브론 강철수염', race: '드워프', pow: 70 },
  { id: 'hawk', name: '은빛 매 탐사대', leader: '세라 보겔', race: '인간', pow: 62 },
  { id: 'lamp', name: '검은 등불', leader: '카스파르', race: '인간', pow: 66 },
];
const NEW_RIVALS = [
  { name: '쇠뿔 형제단', leader: '두린 쇠뿔', race: '드워프' },
  { name: '잿빛 늑대단', leader: '오토 그라우', race: '인간' },
  { name: '별빛 순례단', leader: '엘리나 슈테른', race: '하프엘프' },
  { name: '마지막 횃불', leader: '야코프', race: '인간' },
];

/* ---------- 상태 ---------- */
export function defaultDeep() {
  return {
    gate: 0,          // 내가 연 가장 깊은 돌문 (0, 5, 10, ... 25, 30=왕좌 앞)
    deepest: 0,       // 내가 닿은 가장 깊은 층
    runs: 0, ore: 0,  // 내려간 횟수, 판 마석 값
    relics: [],       // [{ id, known }]
    charms: [],       // 지니고 다니는 유물 id
    used: [],         // 몸에 쓴 유물 id (다시 못 씀)
    guide: false, ally: null,
    lord: 'alive',    // alive | slain | sealed | pact | taken(다른 탐사대가 쓰러뜨림)
    lordBy: null,
    rivals: RIVALS0.map((r) => ({ ...r, depth: 0, alive: true, best: 0 })),
    record: { who: null, depth: 0 },
    spawnAt: -99,
  };
}
export function D(g) {
  if (!g.deep) g.deep = defaultDeep();
  return g.deep;
}
HOOKS.newGame.push((g) => { g.deep = defaultDeep(); });
HOOKS.migrate.push((g) => {
  const d = Object.assign(defaultDeep(), g.deep ?? {});
  for (const k of ['relics', 'charms', 'used', 'rivals']) if (!Array.isArray(d[k])) d[k] = defaultDeep()[k];
  d.relics = d.relics.filter((r) => r && RELICS[r.id]);
  g.deep = d;
});
// 대가 바뀌면: 열어 둔 돌문은 그 사람의 몸이 기억하는 길이다. 유물은 물려받는다.
HOOKS.heir.push((g) => {
  const d = D(g);
  d.gate = 0; d.deepest = 0; d.guide = false; d.ally = null;
  d.used = [];
});

export const hasRelic = (g, id) => D(g).relics.some((r) => r.id === id);
export const charmBonus = (g, key) => D(g).charms.reduce((a, id) => a + (RELICS[id]?.charm?.[key] ?? 0), 0);
export const lordAlive = (g) => D(g).lord === 'alive' || D(g).lord === 'pact';

export const mi = (g) => g.date.year * 12 + g.date.month;

// 다른 탐사대: 달마다 조금씩 내려간다. 문지기 층에서 죽기도 한다. 주인에게 먼저 닿을 수도 있다.
HOOKS.afterMonth.push((g, rng) => {
  const d = D(g);
  for (const r of d.rivals) {
    if (!r.alive) continue;
    if (d.lord !== 'alive') { if (r.depth > 0 && rng.chance(0.2)) r.depth = Math.max(0, r.depth - 1); continue; }
    if (!rng.chance(0.18)) continue;
    const next = r.depth + 1;
    const st = Math.floor((next - 1) / 5);
    const danger = 0.04 + st * 0.035 + (isGuardFloor(next) ? 0.12 : 0);
    if (rng.chance(danger * (70 / r.pow))) {
      r.alive = false;
      note(g, `${J(r.name, '이/가')} 깊은 구렁 ${next}층에서 돌아오지 못했다는 소식이 구렁목에 퍼졌다.`);
      if (r.depth >= 15) chron(g, `탐사대 ${r.name}, 깊은 구렁 ${next}층에서 전멸하다.`, 30);
      continue;
    }
    r.depth = Math.min(FLOORS, next);
    r.best = Math.max(r.best, r.depth);
    r.pow += 0.4;
    if (r.depth > d.record.depth) d.record = { who: r.name, depth: r.depth };
    if (r.depth >= FLOORS && rng.chance(0.25 * (r.pow / 90))) {
      d.lord = 'taken'; d.lordBy = r.name;
      chron(g, `탐사대 ${r.name}의 ${r.leader}, 깊은 구렁의 바닥에서 깊은 왕을 쓰러뜨리다.`, 90);
      note(g, `${J(r.name, '이/가')} 깊은 구렁의 주인을 쓰러뜨렸다. 구렁목이 사흘 밤낮으로 들끓었다.`);
    } else if (r.depth >= FLOORS && rng.chance(0.5)) {
      r.alive = false; r.depth = 0;
      note(g, `${J(r.name, '이/가')} 깊은 왕 앞에서 전멸했다. 살아 돌아온 짐꾼 하나가 미쳐서 웃기만 한다.`);
      chron(g, `탐사대 ${r.name}, 깊은 왕 앞에서 전멸하다.`, 50);
    }
  }
  // 전멸한 탐사대 자리에는 새 탐사대가 생긴다
  const dead = d.rivals.findIndex((r) => !r.alive);
  if (dead >= 0 && rng.chance(0.06)) {
    const used = new Set(d.rivals.map((r) => r.name));
    const n = NEW_RIVALS.find((x) => !used.has(x.name));
    if (n) d.rivals[dead] = { id: `r${mi(g)}`, ...n, pow: rng.int(55, 72), depth: 0, alive: true, best: 0 };
  }
});
