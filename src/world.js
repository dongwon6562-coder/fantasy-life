// 세계 흐름: 레오니아 왕국의 정세, 발하르트와의 전쟁, 북부 전선, 마물, 물가, 기술 시대.
// 플레이어가 무엇을 하든 매달 굴러간다. 정해진 역사는 없고, 판마다 다른 결말이 난다.
// 상태는 game.realm 하나에 모두 들어 있다. 사건(events/)이 이 값을 읽고, 가끔 바꾼다.
import { J } from './narrative/text.js';
import { HOOKS } from './hooks.js';
import { TECH, ERA_KEYS } from './techtree/nodes.js';

export const ERAS = [
  { id: 0, name: '마석 시대', desc: '마석은 귀족과 마법사의 물건이다. 마을의 밤은 아직 등잔불로 밝힌다.' },
  { id: 1, name: '마도구 보급 시대', desc: '화석·등석·온석 같은 마도구가 도시를 넘어 시골까지 퍼진다.' },
  { id: 2, name: '마도 공학 시대', desc: '공방에서 마도구를 찍어 내고, 마석으로 돌아가는 방아와 수레가 나타난다.' },
  { id: 3, name: '마도 증기 시대', desc: '마석로가 쇳덩이를 움직인다. 길과 전쟁의 모양이 바뀐다.' },
  // 34단계 뒤 시대 (도우미스레드3): 기계가 늘어도 칼을 찬 사람과 서클 마법사는 남는다. 고서클은 여전히 드물다.
  { id: 4, name: '마력 공장 시대', desc: '마력 굴대가 한 지붕 밑에서 수십 개씩 돈다. 사람들이 공장 거리로 몰리고 도시가 성벽 밖으로 넘친다. 그래도 길드 게시판의 의뢰는 줄지 않는다.' },
  { id: 5, name: '수정구 시대', desc: '먼 곳의 목소리가 그날로 닿는다. 마탑이 수정구를 쥐고 세상의 귀가 된다. 마석이 모자라다는 말이 처음으로 진지하게 나온다.' },
  { id: 6, name: '하늘길 시대', desc: '은빛 비행선이 하늘을 지난다. 부자는 하늘로 다니고, 마석은 금보다 귀하다. 일곱 서클에 닿은 사람은 여전히 손에 꼽는다.' },
];

const LORD_NAMES = ['디트리히', '아달베르트', '고트프리트', '루트비히', '에버하르트', '지크프리트', '오토카르', '베르톨트'];
const LORD_TEMPERS = ['fair', 'greedy', 'harsh', 'weak'];
export const LORD_TEMPER_NAME = { fair: '공정함', greedy: '탐욕스러움', harsh: '가혹함', weak: '유약함' };

// 기술 값이 이 문턱을 넘으면 다음 시대. 한 사람의 일생에 한두 번, 몇 대를 거쳐야 마도 증기 시대에 닿는다.
// 34단계: 시대를 바꾸는 큰 발명(techtree ERA_KEYS)의 눈금. 그 발명이 나와야 다음 시대가 된다.
export const ERA_AT = ERA_KEYS.map((id) => (id ? TECH[id].at : 0));

export const monthIndex = (g) => g.date.year * 12 + (g.date.month - 1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function newLord(rng, house = '그라이펜', generation = 1) {
  return {
    name: rng.pick(LORD_NAMES), house, title: '백작',
    age: rng.int(30, 55), temper: rng.pick(LORD_TEMPERS), generation,
  };
}

export function makeRealm(rng) {
  return {
    // 왕실
    king: { name: '오스발트 3세', age: 62, health: rng.int(45, 60), alive: true },
    ruler: 'oswald', // oswald | rudolf | erik | regency
    succession: 'contest', // contest(다툼) | civilwar(내전) | settled(정리됨)
    rudolf: { alive: true, age: 34, support: rng.int(45, 58) }, // 제1왕자, 귀족파
    erik: { alive: true, age: 22, support: 0 },                  // 제2왕자, 기사파 (support는 100-rudolf로 계산)
    civilWarMonths: 0,
    blackGlove: 50, // 범죄 조직 "검은 장갑"의 힘
    // 영주 (하르펜과 에른 일대)
    lord: newLord(rng),
    // 발하르트 제국
    balhart: { tension: rng.int(40, 55), war: false, warMonths: 0, front: 0, wars: 0, fortsLost: 0 },
    // 북부 변경백령과 붉은 마왕 가르베스
    north: { garbes: rng.int(25, 40), war: false, warMonths: 0, fallen: false, independent: false },
    // 마물과 봉인
    monsters: rng.int(25, 35), // 0~100
    noahLight: false, // 감시탑의 불: 지난겨울 꺼졌다
    seal: 100, // 봉인의 힘 (보이지 않는 값, 천천히 줄어든다)
    // 성광국의 용사 의식
    heroRite: 0,
    // 물가와 세금
    bread: 1.0, // 빵값 지수 (1 = 평년)
    tax: 1.0,
    // 기술
    tech: rng.float(0.05, 0.25), era: 0,
    // 지난 큰일 기록
    log: [],
  };
}

export const realm = (g) => g.realm;
export const atWar = (g) => !!(g.realm?.balhart.war || g.realm?.north.war || g.realm?.succession === 'civilwar');
export const eraOf = (g) => g.realm?.era ?? 0;
export const priceIndex = (g) => g.realm?.bread ?? 1;
export const rulerName = (g) => {
  const r = g.realm;
  if (!r) return '국왕';
  return r.ruler === 'oswald' ? r.king.name : r.ruler === 'rudolf' ? '루돌프 2세' : r.ruler === 'erik' ? '에릭 1세' : '섭정 회의';
};
export const lordName = (g) => {
  const l = g.realm?.lord;
  return l ? `${l.house} ${l.title} ${l.name}` : '영주';
};

// 사건에서 정세를 살짝 움직일 때 쓰는 손잡이
export function nudge(g, key, amount) {
  const r = g.realm;
  if (!r) return;
  if (key === 'tension') r.balhart.tension = clamp(r.balhart.tension + amount, 0, 100);
  else if (key === 'rudolf') r.rudolf.support = clamp(r.rudolf.support + amount, 0, 100);
  else if (key === 'monsters') r.monsters = clamp(r.monsters + amount, 0, 100);
  else if (key === 'garbes') r.north.garbes = clamp(r.north.garbes + amount, 0, 100);
  else if (key === 'tech') r.tech += amount;
  else if (key === 'blackGlove') r.blackGlove = clamp(r.blackGlove + amount, 0, 100);
  else if (key === 'heroRite') r.heroRite = clamp(r.heroRite + amount, 0, 100);
  // 발하르트 전선: +면 레오니아 우세, -면 밀림. 전쟁 중일 때만 움직이고, ±8에서 승패가 갈린다.
  else if (key === 'front') { if (r.balhart.war) r.balhart.front = clamp(r.balhart.front + amount, -10, 10); }
}

// 다른 모듈(src/history/)이 세계의 한 달에 끼어드는 자리. fn(g, rng, say, record)
export const WORLD_TICKS = [];
// 세계 연대기(큰일 기록)는 이 길이까지만 남긴다. 저장 크기를 지키려고.
export const LOG_MAX = 400;

// 한 달 진행. news: 이번 달 소식 후보 [{ text, big, rel }]
function tick(g, rng) {
  const r = g.realm;
  const news = [];
  const say = (text, big = false, rel = null) => news.push({ text, big, rel });
  const record = (text) => r.log.push({ y: g.date.year, m: g.date.month, text });
  const newYear = g.date.month === 12; // 날짜가 넘어가기 직전이 12월이면 곧 새해

  // ---------- 왕실 ----------
  if (r.ruler === 'oswald' && r.king.alive) {
    // 왕은 병이 아니라 독에 천천히 무너지고 있다
    r.king.health -= rng.float(0.1, 0.75);
    if (r.king.health < 25 && rng.chance(0.04)) say(`왕도에서 온 소식: ${r.king.name}께서 또 쓰러지셨다고 한다. 궁정 의사들이 밤을 새웠다는 말이 돈다.`);
    if (r.king.health <= 0 || (r.king.health < 15 && rng.chance(0.06))) {
      r.king.alive = false;
      r.king.diedAt = g.date.year * 12 + g.date.month;
      r.ruler = 'regency';
      const gap = r.rudolf.support - 50;
      say(`조종이 울렸다. 국왕 ${r.king.name}께서 승하하셨다. 사람들이 일손을 놓고 왕도 쪽을 향해 고개를 숙였다.`, true);
      record(`국왕 ${r.king.name} 승하`);
      if (!r.erik.alive || (r.rudolf.alive && gap > 10)) crown(g, rng, 'rudolf', say, record);
      else if (!r.rudolf.alive || gap < -10) crown(g, rng, 'erik', say, record);
      else {
        r.succession = 'civilwar';
        r.civilWarMonths = 0;
        say('두 왕자가 모두 왕위를 주장했다. 루돌프 왕자는 왕도를, 에릭 왕자는 기사단을 쥐었다. 왕국이 둘로 갈라진다.', true);
        record('왕위 계승 내전 발발');
      }
    }
  }
  if (r.succession === 'contest') {
    r.rudolf.support = clamp(r.rudolf.support + rng.normal(0, 1.2) + (r.blackGlove - 50) * 0.01, 5, 95);
    if (rng.chance(0.03)) {
      say(rng.pick([
        `루돌프 왕자가 남부 귀족들을 왕도로 불러 연회를 열었다고 한다. 연회 비용이 세금으로 돌아올 거라고 사람들이 수군댄다.`,
        `에릭 왕자가 기사단을 이끌고 국경 요새를 순시했다. 병사들이 왕자의 이름을 연호했다는 이야기가 돈다.`,
        `성광교 주교가 루돌프 왕자의 손을 들어 주는 설교를 했다는 소문이 있다.`,
        `에릭 왕자가 탐관오리 하나를 공개 재판에 세웠다. 평민들은 환호했고, 귀족들은 입을 다물었다.`,
        `왕도 빈민가에서 "검은 장갑"이 세를 불리고 있다. 경비대는 손을 놓았다고 한다.`,
      ]));
    }
    // 왕자의 죽음 (암살, 사고) — 아주 드물게
    if (r.rudolf.alive && rng.chance(0.0008)) { r.rudolf.alive = false; say('충격적인 소식: 루돌프 왕자가 사냥터에서 낙마해 숨졌다. 사고였는지는 아무도 모른다.', true); record('루돌프 왕자 사망'); }
    if (r.erik.alive && rng.chance(0.0008)) { r.erik.alive = false; say('충격적인 소식: 에릭 왕자가 숙소에서 독살된 채 발견되었다. 기사단이 분노하고 있다.', true); record('에릭 왕자 독살'); }
  }
  if (r.succession === 'civilwar') {
    r.civilWarMonths += 1;
    r.rudolf.support = clamp(r.rudolf.support + rng.normal(0, 3), 0, 100);
    if (rng.chance(0.25)) {
      say(rng.pick([
        '내전 소식: 강 건너 영지에서 두 왕자의 군대가 맞붙었다. 수백이 죽었다고 한다.',
        '내전 소식: 왕도 성문이 사흘 동안 닫혔다. 성 밖 빈민가가 불탔다는 말이 있다.',
        `내전 소식: ${J(lordName(g), '이/가')} 병사를 모으고 있다. 어느 편에 설지는 아직 밝히지 않았다.`,
        '내전 소식: 패잔병들이 무리를 지어 남쪽 길에서 마을을 털고 있다고 한다.',
        '내전 소식: 기사단 일부가 에릭 왕자 쪽으로 넘어갔다.',
        '내전 소식: 성광교가 루돌프 왕자의 대관식을 집전하겠다고 선언했다.',
      ]));
    }
    if (r.civilWarMonths >= 10 && (r.rudolf.support > 72 || r.rudolf.support < 28 || r.civilWarMonths > 40 || rng.chance(0.03))) {
      crown(g, rng, r.rudolf.support >= 50 ? 'rudolf' : 'erik', say, record);
    }
  }
  if (r.succession === 'settled' && r.ruler !== 'oswald') {
    // 새 왕의 다스림: 루돌프는 검은 장갑에 빚이 있고, 에릭은 발하르트와 통한다
    if (r.ruler === 'rudolf') { r.blackGlove = clamp(r.blackGlove + 0.15, 0, 100); }
    else { r.blackGlove = clamp(r.blackGlove - 0.2, 0, 100); }
  }

  // ---------- 영주 ----------
  if (newYear) {
    r.lord.age += 1;
    if (rng.chance(r.lord.age > 60 ? 0.12 : 0.02)) {
      const old = lordName(g);
      r.lord = newLord(rng, r.lord.house, r.lord.generation + 1);
      r.lord.age = rng.int(20, 35);
      say(`${J(old, '이/가')} 세상을 떠났다. 아들 ${J(r.lord.name, '이/가')} 작위를 이었다. 새 영주는 ${{ fair: '공정한', greedy: '탐욕스러운', harsh: '가혹한', weak: '유약한' }[r.lord.temper] ?? '알 수 없는'} 사람이라는 평이다.`, true);
      record(`영주 교체: ${lordName(g)}`);
    }
  }
  const lordTax = { fair: 1.0, greedy: 1.25, harsh: 1.15, weak: 1.05 }[r.lord.temper];
  const crownTax = r.ruler === 'rudolf' ? 1.15 : r.ruler === 'erik' ? 0.95 : 1.0;
  const warTax = (r.balhart.war ? 0.25 : 0) + (r.succession === 'civilwar' ? 0.3 : 0) + (r.north.war ? 0.1 : 0);
  r.tax = Math.round((lordTax * crownTax + warTax) * 100) / 100;

  // ---------- 발하르트 ----------
  const b = r.balhart;
  if (!b.war) {
    let drift = rng.normal(0.06, 1.3);
    if (r.succession === 'civilwar') drift += 1.5; // 틈을 노린다
    if (r.ruler === 'erik') drift -= 0.6;           // 몰래 통하는 사이
    if (r.ruler === 'rudolf') drift += 0.3;
    b.tension = clamp(b.tension + drift, 0, 100);
    if (b.tension > 70 && rng.chance(0.04)) say(rng.pick([
      '국경 소식: 발하르트 제국군이 국경 요새 앞에서 훈련을 벌이고 있다.',
      '국경 소식: 발하르트 기병이 국경 마을 하나를 불태우고 돌아갔다. 제국은 산적의 짓이라고 한다.',
      '하르펜에 제국 첩자가 잡혔다는 소문이 돈다.',
    ]));
    if (b.tension > 85 && rng.chance(0.04)) {
      b.war = true; b.warMonths = 0; b.front = 0; b.wars += 1;
      say('전쟁이다. 발하르트 제국군이 국경을 넘었다. 영주가 전시 징세와 징집령을 내렸다.', true);
      record(`발하르트 제국과 ${b.wars}번째 전쟁 시작`);
    }
  } else {
    b.warMonths += 1;
    const winter = g.date.month <= 2 || g.date.month === 12;
    if (!winter) b.front += rng.normal(r.succession === 'civilwar' ? -0.6 : -0.15, 1.6);
    if (rng.chance(0.3)) say(rng.pick(b.front < -3 ? [
      '전선 소식: 레오니아군이 밀리고 있다. 국경 요새 하나가 포위되었다.',
      '전선 소식: 발하르트의 마법사 군단이 성벽을 무너뜨렸다고 한다.',
      '전선 소식: 피란민들이 짐수레를 끌고 남쪽으로 내려오고 있다.',
    ] : b.front > 3 ? [
      '전선 소식: 레오니아 기사단이 제국군 선봉을 무너뜨렸다! 술집마다 건배 소리가 났다.',
      '전선 소식: 유수류 기사들이 강검류 돌격을 막아 냈다고 한다.',
    ] : [
      '전선 소식: 국경에서 밀고 밀리는 싸움이 계속된다. 전사자 명단이 길어진다.',
      '전선 소식: 징집된 청년들이 하르펜을 거쳐 북동쪽으로 행군했다.',
      '전선 소식: 군량을 대느라 곡물상들이 밀을 사들이고 있다.',
    ]));
    if (winter && rng.chance(0.1)) say('겨울이라 전선이 얼어붙었다. 양쪽 다 봄을 기다리고 있다.');
    // 끝나는 조건
    if (b.front <= -8) {
      b.war = false; b.fortsLost += 1; b.tension = 40;
      say('굴욕적인 강화. 레오니아는 국경 요새 하나와 배상금을 내주었다. 세금이 오를 것이다.', true);
      record('발하르트와의 전쟁 패배, 국경 요새 상실');
      r.rudolf.support = clamp(r.rudolf.support + (r.ruler === 'oswald' ? -6 : 0), 0, 100);
    } else if (b.front >= 8) {
      b.war = false; b.tension = 25;
      if (b.fortsLost > 0) b.fortsLost -= 1;
      say('승전보! 제국군이 국경 너머로 물러났다. 왕도에서 개선 행진이 열렸다고 한다.', true);
      record('발하르트와의 전쟁 승리');
    } else if (b.warMonths > 14 && rng.chance(0.06)) {
      b.war = false; b.tension = 38;
      say('양쪽 다 지쳤다. 세레니아의 중재로 휴전이 맺어졌다. 아무것도 바뀌지 않았고, 많은 사람이 죽었다.', true);
      record('발하르트와 휴전');
    }
  }

  // ---------- 북부 전선 ----------
  const n = r.north;
  if (!n.fallen) {
    n.garbes = clamp(n.garbes + rng.normal(0.08, 0.8), 0, 100);
    if (!n.war && n.garbes > 75 && rng.chance(0.03)) {
      n.war = true; n.warMonths = 0;
      say('북부에서 봉화가 올랐다. 붉은 마왕 가르베스의 군대가 해협을 건넜다. 북부 변경백이 중앙 왕국들에 원군을 청했다.', true);
      record('제2차 북부 전쟁 발발');
    }
    if (n.war) {
      n.warMonths += 1;
      if (rng.chance(0.25)) say(rng.pick([
        '북부 소식: 성채도시 그라우벨의 바깥 성벽이 불탔다고 한다.',
        '북부 소식: 마족 장군 하나가 변경 기사단과 맞붙어 쓰러졌다. 대신 기사단의 절반이 돌아오지 못했다.',
        '북부 소식: 모험가 길드가 C급 이상 모험가를 강제 소집했다.',
        '북부 소식: 북쪽에서 온 피란민이 마물의 이빨 자국이 난 방패를 팔고 있었다.',
      ]));
      if (n.warMonths > 8 && rng.chance(0.05)) {
        n.war = false; n.garbes = 30;
        if (rng.chance(0.15)) {
          n.fallen = true; r.monsters = clamp(r.monsters + 20, 0, 100);
          say('최악의 소식: 성채도시 그라우벨이 함락되었다. 북부 변경이 무너졌고, 마물과 마족이 중앙 대륙으로 흘러들기 시작했다.', true);
          record('그라우벨 함락, 북부 변경 붕괴');
        } else {
          say('북부 변경이 이번에도 버텨 냈다. 가르베스의 군대가 바다 건너로 물러갔다. 변경백은 중앙이 끝내 오지 않았다고 이를 갈았다.', true);
          record('제2차 북부 전쟁 종결, 변경 수성');
          if (rng.chance(0.4)) { n.independent = true; say('북부 변경백령이 중앙 왕국들과의 맹약을 끊고 독립을 선언했다.', true); record('북부 변경백령 독립 선언'); }
        }
      }
    }
  }

  // ---------- 마물과 봉인 ----------
  r.seal = Math.max(0, r.seal - rng.float(0, 0.06));
  r.monsters = clamp(r.monsters + rng.normal((100 - r.seal) * 0.004, 0.7) + (atWar(g) ? 0.1 : 0) - (r.monsters > 70 ? 0.3 : 0), 0, 100);
  if (r.monsters > 55 && rng.chance(0.06)) say(rng.pick([
    '하르펜 근처 미궁에서 마물이 넘쳐 나왔다. 길드가 토벌대를 모으고 있다.',
    '남쪽 가도에서 오우거가 상단을 덮쳤다. 호위 모험가 셋이 죽었다.',
    '숲속 마을 하나가 고블린 무리에게 털렸다. 살아남은 사람들이 하르펜으로 몰려들었다.',
    '밤마다 들개가 아닌 무언가가 울부짖는다. 사냥꾼들이 숲 깊이 들어가지 않는다.',
  ]));
  if (rng.chance(0.0025)) {
    r.noahLight = !r.noahLight;
    say(r.noahLight
      ? '북쪽에서 온 소문: 꺼졌던 노아의 감시탑에 다시 불이 켜졌다고 한다. 누가 켰는지는 아무도 모른다.'
      : '북쪽에서 온 소문: 감시탑의 불이 또 꺼졌다. 세레니아의 마법사들이 탑으로 향했다고 한다.', true);
    record(r.noahLight ? '노아의 감시탑에 다시 불이 켜짐' : '노아의 감시탑 불이 다시 꺼짐');
  }

  // ---------- 성광국의 용사 의식 ----------
  r.heroRite = clamp(r.heroRite + rng.float(0, 0.25), 0, 100);
  if (r.heroRite >= 100 && !r.heroBorn) {
    r.heroBorn = true;
    say('성도 솔라리스에서 "새 용사"가 선포되었다. 금빛 갑옷을 입은 소년이 대성당 발코니에 섰다고 한다. 그 아이가 어디서 왔는지 아는 사람은 없다.', true);
    record('성광국, 새 용사 선포');
  }

  // ---------- 물가 ----------
  const target = 1
    + (g.world?.famine ? 0.8 : 0)
    + (g.world?.plague ? 0.2 : 0)
    + (b.war ? 0.35 : 0)
    + (r.succession === 'civilwar' ? 0.45 : 0)
    + (n.war ? 0.1 : 0)
    + (n.fallen ? 0.15 : 0)
    + Math.max(0, r.monsters - 50) * 0.006
    - Math.min(r.era, 4) * 0.05; // 34단계: 시대가 일곱이 되어도 빵값이 0.8 밑으로 꺼지지 않게
  const before = r.bread;
  r.bread = clamp(r.bread + (target - r.bread) * 0.2 + rng.normal(0, 0.02), 0.6, 3);
  r.bread = Math.round(r.bread * 100) / 100;
  // 48단계: 문턱 언저리에서 오르내릴 때마다 '뛰었다'·'가라앉았다'가 번갈아 뜨지 않게, 한 번 뛰면 가라앉을 때까지 한 번만 말한다
  if (r.bread >= 1.3 && before < 1.3 && !r.breadHigh) { r.breadHigh = true; say(`빵값이 뛰었다. 평년의 ${Math.round(r.bread * 10) / 10}배다. 빵집 앞에서 언성이 높아진다.`); }
  if (r.bread >= 1.8 && before < 1.8 && r.breadHigh !== 'mad') { r.breadHigh = 'mad'; say('밀값이 미쳤다. 가난한 집들은 귀리죽으로 버틴다. 굶어 죽는 사람이 나올 거라는 말이 돈다.', true); }
  if (r.bread < 1.15 && before >= 1.15 && r.breadHigh) { r.breadHigh = false; say('물가가 겨우 가라앉았다. 장터에 다시 웃음소리가 들린다.'); }

  // ---------- 기술 ----------
  // 34단계: 기술 값은 기술 나무(src/techtree/)가 정한다. 선행 기술·연구할 사람·재료·수요가 갖춰져야 자란다 (history powers 틱에서 techGrow).
  // 예전 판과 같은 무작위 순서를 지키려고 한 번 뽑기만 한다.
  rng.float(0.002, 0.009);
  if (rng.chance(0.012)) say(rng.pick(r.era === 0 ? [
    '세레니아의 공방에서 값싼 화석(火石)을 만드는 법을 찾았다고 한다. 불씨 없이 불을 붙이는 돌이다.',
    '하르펜 시장에 등석(燈石) 노점이 생겼다. 비싸지만 밤새 꺼지지 않는다.',
    '왕도의 귀족들 사이에서 물을 데우는 온석이 유행이라고 한다.',
  ] : r.era === 1 ? [
    '하르펜에 마석으로 돌아가는 방아가 들어섰다. 방앗간 주인들이 걱정스러운 얼굴이다.',
    '자유도시에서 마석 시세가 두 배로 뛰었다. 마도구 공방들이 마석을 사들이고 있다.',
    '드워프 장인들이 마석을 박은 쟁기를 팔기 시작했다.',
  ] : [
    '발하르트가 마석로로 움직이는 쇠수레를 만들었다는 소문이다. 말 없이 달린다고 한다.',
    '왕도와 하르펜 사이에 마도 전신(傳信)탑을 세운다고 한다.',
    '대장간마다 마석 화로를 들이지 못하면 망한다는 말이 돈다.',
  ]));
  const nextEra = ERA_AT.filter((t) => r.tech >= t).length - 1;
  if (nextEra > r.era) {
    r.era = nextEra;
    const e = ERAS[r.era];
    say(`시대가 바뀌고 있다. ${e.desc} 사람들은 이제 지금을 '${e.name}'라고 부른다.`, true);
    record(`${e.name}의 시작`);
  }

  for (const fn of WORLD_TICKS) fn(g, rng, say, record);
  if (r.log.length > LOG_MAX) r.log.splice(0, r.log.length - LOG_MAX);
  return news;
}

function crown(g, rng, who, say, record) {
  const r = g.realm;
  r.ruler = who;
  r.succession = 'settled';
  r.crownedAt = g.date.year * 12 + g.date.month;
  const loser = who === 'rudolf' ? r.erik : r.rudolf;
  if (loser.alive && rng.chance(0.5)) loser.alive = false;
  const name = rulerName(g);
  const fate = who === 'rudolf'
    ? (r.erik.alive ? '에릭 왕자는 북쪽으로 도망쳤다.' : '에릭 왕자는 반역죄로 처형되었다.')
    : (r.rudolf.alive ? '루돌프 왕자는 성광국으로 망명했다.' : '루돌프 왕자는 유폐된 탑에서 숨졌다.');
  say(`새 왕이 섰다. ${name}의 대관식이 열렸다. ${fate} ${who === 'rudolf' ? '귀족들은 웃고, 평민들은 세금을 걱정한다.' : '평민들은 환호하고, 썩은 귀족들은 숨을 죽인다.'}`, true);
  record(`${name} 즉위`);
}

// 지금 정세를 한눈에 보여 주는 글 (화면에서 쓸 수 있게)
export function worldSummary(g) {
  const r = g.realm;
  if (!r) return [];
  const lines = [];
  lines.push(`국왕: ${rulerName(g)}${r.ruler === 'oswald' ? (r.king.health < 25 ? ' (위독)' : ' (병중)') : ''}`);
  if (r.succession === 'contest') lines.push(`후계 다툼: 루돌프 왕자 ${Math.round(r.rudolf.support)} : 에릭 왕자 ${Math.round(100 - r.rudolf.support)}`);
  if (r.succession === 'civilwar') lines.push(`내전 ${r.civilWarMonths}개월째`);
  lines.push(`영주: ${lordName(g)} (${LORD_TEMPER_NAME[r.lord.temper]})`);
  lines.push(`발하르트: ${r.balhart.war ? `전쟁 중 (${r.balhart.front < -3 ? '밀리는 중' : r.balhart.front > 3 ? '우세' : '팽팽함'})` : r.balhart.tension > 70 ? '일촉즉발' : r.balhart.tension > 50 ? '냉랭함' : '잠잠함'}`);
  lines.push(`북부: ${r.north.fallen ? '변경 붕괴' : r.north.war ? '마왕군과 전쟁 중' : r.north.garbes > 60 ? '마왕군 집결' : '경계 중'}`);
  lines.push(`마물: ${r.monsters > 70 ? '창궐' : r.monsters > 50 ? '잦음' : r.monsters > 30 ? '늘어나는 중' : '드묾'}`);
  lines.push(`빵값: 평년의 ${r.bread.toFixed(1)}배 · 세금 ${r.tax.toFixed(2)}배`);
  lines.push(`시대: ${ERAS[r.era].name}`);
  return lines;
}

// ---------- 훅 등록 ----------
HOOKS.newGame.push((g, rng) => { g.realm = makeRealm(rng); });
HOOKS.migrate.push((g) => {
  if (!g.realm) {
    // 예전 저장: 시드에서 만든 난수로 세계를 채운다 (게임 난수 흐름은 건드리지 않음)
    let s = (g.rngState?.s ?? 1) ^ 0x5bd1e995;
    const next = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const mini = {
      next, float: (a = 0, b = 1) => a + (b - a) * next(), int: (a, b) => Math.floor(a + (b - a + 1) * next()),
      chance: (p) => next() < p, pick: (arr) => arr[Math.floor(next() * arr.length)],
    };
    g.realm = makeRealm(mini);
  }
});
HOOKS.afterNpc.push((g, rng) => {
  if (!g.realm) return;
  const news = tick(g, rng);
  g.worldNews = g.worldNews ?? [];
  // 큰 소식은 모두, 작은 소식은 한 달에 하나만
  const big = news.filter((x) => x.big);
  // 작은 소식은 아는 사람 이야기를 먼저
  const small = news.filter((x) => !x.big).sort((a, b) => (b.rel ?? 0) - (a.rel ?? 0));
  for (const x of big) {
    g.worldNews.push(x.text);
    g.chronicle.push({ y: g.date.year, m: g.date.month, text: x.text, rel: x.rel ?? 70 });
  }
  if (small.length) {
    g.worldNews.push(small[0].text);
    if ((small[0].rel ?? 0) >= 40) g.chronicle.push({ y: g.date.year, m: g.date.month, text: small[0].text, rel: small[0].rel });
  }
});
// 물가와 세금이 집안 살림을 누른다
HOOKS.afterMonth.push((g) => {
  const r = g.realm;
  if (!r) return;
  const mouths = g.player.familyIds.filter((id) => g.people.find((x) => x.id === id)?.alive).length;
  const cost = Math.max(0, Math.round((r.bread - 1) * mouths * 1.2 + (r.tax - 1) * 4));
  if (cost > 0) g.player.familyMoney = Math.max(0, g.player.familyMoney - cost);
});
