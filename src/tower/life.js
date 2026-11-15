// 탑 안의 삶: 문을 두드리고, 탑을 고르고, 견습으로 하루를 보내고, 스승을 모시고, 서열을 오르고,
// 세레니아에서만 받는 5~6서클 공인, 마도구 만들기.
import { ACTIONS } from '../actions.js';
import { playerAge, gainSkill, gainStat, circleOf } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { magicState } from '../magic/spells.js';
import { NAMES } from '../realms/data.js';
import { TS, mi, clamp, TOWERS, RANKS, RANK_NEED, ITEMS, hasItem, tlog } from './state.js';

const here = (g) => L(g).place;
const atTower = (g) => here(g) === 'serenia' && !L(g).travel;
const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g);
const cert = (g) => magicState(g).certified ?? 0;
const banned = (g) => TS(g).hunted > mi(g) || TS(g).expelled;

function newMaster(g, rng, tower) {
  const n = NAMES.serenia;
  const sex = rng.chance(0.4) ? 'f' : 'm';
  return { name: `${rng.pick(sex === 'f' ? n.f : n.m)} ${rng.pick(n.last)}`, sex, circle: rng.chance(0.15) ? 5 : rng.chance(0.5) ? 4 : 3, bond: 10, alive: true, tower, born: g.date.year - rng.int(45, 70) };
}

// ---------- 문 두드리기 ----------
ACTIONS.push({
  id: 'tower_join', name: '마탑 문 두드리기', icon: 'magic',
  desc: '세레니아의 탑 가운데 하나에 견습 마도사로 들어가기를 청한다. 마력이 깨어 있고 술식을 조금은 다룰 줄 알아야 한다.',
  available: (g) => playerAge(g) >= 14 && free(g) && atTower(g) && !TS(g).member && g.player.manaAwakened && ((g.player.skills.magic ?? 0) >= 15 || cert(g) >= 1) && !banned(g),
  run(g) {
    const T = TS(g);
    if (T.member) return '이미 탑의 사람이다.';
    if ((T.rejectAt ?? -99) > mi(g)) return '탑의 문지기가 나를 알아보고 고개를 저었다. "지난번 시험에 떨어진 사람은 한 해가 지나야 다시 볼 수 있소."';
    if (sceneQueued(g, 'tower_pick')) return '어느 탑에 청할지 아직 정하지 못했다.';
    queueScene(g, 'tower_pick');
    return '호숫가 다리를 건너 탑들이 늘어선 광장에 섰다. 네 개의 탑이 저마다 다른 빛을 뿜고 있었다.';
  },
});
defineScene('tower_pick', {
  title: () => '네 개의 탑',
  text: () => `${Object.values(TOWERS).map((t) => `${t.name}: ${t.desc}`).join(' ')}`,
  choices: (g) => (TS(g).member || !atTower(g) ? [] : [
    ...Object.entries(TOWERS).map(([id, t]) => ({ label: `${t.name}에 청한다`, key: id })),
    { label: '오늘은 돌아간다', key: 'none' },
  ]),
  resolve(g, rng, s, key) {
    const T = TS(g);
    if (!TOWERS[key]) return '다리를 다시 건너 돌아왔다. 탑들의 빛이 등 뒤에서 오래 따라왔다.';
    const v = g.player.stats.int * 0.5 + (g.player.skills.magic ?? 0) * 0.6 + cert(g) * 6;
    if (!check(rng, v, 38)) {
      T.rejectAt = mi(g) + 12; stress(g, 8);
      return `${TOWERS[key].name}의 시험관이 내 손바닥에 마석을 올려놓고 술식을 그려 보라고 했다. 선이 세 번째에서 흔들렸다. "한 해 더 다듬고 오시오." 문이 닫혔다.`;
    }
    const m = newMaster(g, rng, key);
    T.member = { tower: key, rank: cert(g) >= 2 ? 1 : 0, merit: 0, joined: mi(g), master: m, dutyAt: -1, away: 0 };
    note(g, `세레니아 ${TOWERS[key].name}에 ${RANKS[T.member.rank]}로 들어갔다. 스승은 ${m.name}.`);
    chron(g, `${g.player.name}, 세레니아 ${TOWERS[key].name}에 들다.`, 70);
    tlog(g, `${TOWERS[key].name}에 들어갔다.`);
    return `시험관이 고개를 끄덕였다. 그날 저녁 회색 로브 한 벌과 좁은 방 하나를 받았다. 스승은 ${m.circle}서클 마도사 ${m.name}. ${m.sex === 'f' ? '그녀' : '그'}는 내 손을 한참 보더니 말했다. "손은 쓸 만하군. 머리는 두고 보자."`;
  },
});

// ---------- 탑에서 지내기 ----------
const DUTY = {
  red: ['훈련장에서 불씨 화살을 백 번 쏘았다. 과녁보다 내 손이 먼저 탔다.', '선배 마도사의 실전 훈련 상대가 되었다. 결계를 늦게 쳐서 눈썹을 잃었다.', '제국군에 보낼 전투 마도사 명단을 베꼈다. 내 이름은 아직 없다.'],
  blue: ['성당 시약소에서 열병 환자들의 이마에 정화수를 적셨다. 사제가 고맙다고 했다. 처음이었다.', '치유 술식의 핏줄 그림을 외웠다. 밤에 눈을 감아도 붉은 선이 보였다.', '독이 든 우물을 거르러 시골 마을에 다녀왔다.'],
  grey: ['서고 맨 아래층에서 오백 년 된 술식 사본을 옮겨 적었다. 잉크보다 먼지를 더 마셨다.', '스승이 봉인 술식의 한 줄을 설명하다 말을 끊었다. "여기까지만 알아도 된다."', '이론 문답에서 선배를 이겼다. 그 선배가 다음 날부터 인사를 받지 않았다.'],
  star: ['공방에서 마석에 술식을 새기다 하나를 깨뜨렸다. 값은 내 품삯에서 깎인다.', '상단 사람들이 주문한 마력 등잔 서른 개에 마력을 채웠다. 손끝이 저렸다.', '스승과 새 마도구의 설계도를 그렸다. 설계도에 내 이름은 없었다.'],
};
const STIPEND = [2, 6, 12, 20, 35];
ACTIONS.push({
  id: 'tower_duty', name: '탑에서 지내기', icon: 'magic',
  desc: '탑의 일을 하고, 스승에게 배우고, 서고에서 읽는다. 공적이 쌓이면 서열이 오른다. 서열마다 녹봉이 있다.',
  available: (g) => free(g) && atTower(g) && !!TS(g).member,
  run(g, rng) {
    const T = TS(g), M = T.member;
    if (!M) return '탑에 내 자리는 없다.';
    const m = M.master;
    tired(g, 10);
    // 한 달에 탑의 일은 한 번, 나머지 칸은 서고와 스승
    if (M.dutyAt === mi(g)) {
      gainSkill(g, 'magic', 0.5 + (m?.alive ? 0.25 : 0), 'int'); gainStat(g, 'int', 0.1);
      if (m?.alive) m.bond = clamp(m.bond + 1, -100, 100);
      return rng.pick(['서고에서 밤늦게까지 읽었다. 촛불이 다 탔다.', `${m?.alive ? m.name : '선배'}에게 막힌 술식을 물었다. 대답 대신 질문이 세 개 돌아왔다.`, '방에서 혼자 마력의 흐름을 되짚었다.']);
    }
    M.dutyAt = mi(g);
    const gainM = (0.9 + (m?.alive ? m.circle * 0.12 : 0)) * (TOWERS[M.tower].skill === 'theory' ? 1.15 : 1);
    gainSkill(g, 'magic', gainM, 'int');
    if (M.tower === 'blue') gainSkill(g, 'letters', 0.2, 'wil');
    const merit = rng.int(3, 6) + M.rank;
    M.merit += merit;
    const pay = STIPEND[M.rank];
    g.player.money += pay;
    if (m?.alive) m.bond = clamp(m.bond + 2, -100, 100);
    // 회색 탑은 봉인 연구에, 별의 탑은 마도구에 손을 보탠다
    if (M.tower === 'grey' && g.seal) g.seal.study = Math.min(100, (g.seal.study ?? 0) + 0.3);
    const lines = [rng.pick(DUTY[M.tower]), `녹봉 은화 ${pay}닢.`];
    const up = promote(g);
    if (up) lines.push(up);
    return lines.join(' ');
  },
});
export function promote(g) {
  const T = TS(g), M = T.member;
  if (!M || M.rank >= 4) return null;
  const need = RANK_NEED[M.rank + 1];
  if (M.merit < need.merit || cert(g) < need.cert) return null;
  M.rank += 1;
  L(g).renown = (L(g).renown ?? 0) + 3 + M.rank * 2;
  chron(g, `${g.player.name}, ${TOWERS[M.tower].name}의 ${RANKS[M.rank]}에 오르다.`, M.rank >= 3 ? 100 : 70);
  tlog(g, `${RANKS[M.rank]}에 올랐다.`);
  return M.rank === 4 ? `탑의 원로들이 모여 나를 ${TOWERS[M.tower].name}의 탑주로 세웠다. 오백 년 동안 이 자리에 앉은 사람은 마흔 명이 되지 않는다.` : `탑의 원로들이 내 이름을 불렀다. 오늘부터 ${RANKS[M.rank]}다. 로브의 띠 색이 바뀌었다.`;
}

// ---------- 세레니아의 서클 공인 (5~6서클) ----------
const CERT_FEE = { 5: 300, 6: 700 };
ACTIONS.push({
  id: 'tower_exam', name: '탑의 서클 공인', icon: 'scroll',
  desc: '5서클과 6서클은 세레니아 탑의 원로들만 공인한다. 탑의 정식 마도사여야 하고, 응시료가 크다. 7서클을 공인할 시험관은 없다.',
  available: (g) => free(g) && atTower(g) && (TS(g).member?.rank ?? 0) >= 1 && cert(g) >= 4 && cert(g) < 6 && circleOf(g) > cert(g) && g.player.money >= CERT_FEE[cert(g) + 1],
  run(g, rng) {
    const n = cert(g) + 1;
    if (!CERT_FEE[n] || circleOf(g) < n) return '원로들은 아직 나를 시험할 때가 아니라고 했다.';
    if (TS(g).examAt === mi(g)) return '시험은 이미 치렀다. 결과를 기다린다.';
    TS(g).examAt = mi(g);
    g.player.money -= CERT_FEE[n];
    tired(g, 30); stress(g, 15);
    const v = (g.player.skills.magic ?? 0) * 0.6 + g.player.stats.int * 0.3 + g.player.stats.wil * 0.3;
    if (!check(rng, v, 62 + (n - 5) * 12)) return `원로 일곱이 둘러선 원 안에서 ${n}서클 술식을 펼쳤다. 다섯 번째 고리에서 마력이 새었다. 원로 하나가 손을 들어 시험을 멈췄다. 응시료 은화 ${CERT_FEE[n]}닢은 돌아오지 않는다.`;
    magicState(g).certified = n; TS(g).circleCert = n;
    L(g).renown = (L(g).renown ?? 0) + n * 4;
    chron(g, `${g.player.name}, 세레니아에서 ${n}서클 공인을 받다.`, 100);
    tlog(g, `${n}서클 공인을 받았다.`);
    return `원로 일곱이 둘러선 원 안에서 ${n}서클 술식을 펼쳤다. 탑 꼭대기의 수정이 울렸다. 원로장이 내 이름을 공인 명부에 적었다. 대륙에 ${n}서클은 ${n === 5 ? '손에 꼽을 만큼' : '한 손으로 셀 만큼'}이다.`;
  },
});

// ---------- 마도구 만들기 ----------
const invented = (g, id) => (g.history?.inventions ?? []).includes(id);
export const craftable = (g) => Object.entries(ITEMS).filter(([, it]) => circleOf(g) >= it.circle && (it.needs ?? []).every((n) => invented(g, n))).map(([id]) => id);
const CRAFT_PLACES = ['serenia', 'harfen', 'eisen', 'barka'];
ACTIONS.push({
  id: 'tower_craft', name: '마도구 만들기', icon: 'scroll',
  desc: '마석에 술식을 새겨 마도구를 만든다. 세레니아의 탑 공방이나 큰 도시의 마석 공방에서. 서클이 높을수록 만들 수 있는 것이 는다.',
  available: (g) => free(g) && CRAFT_PLACES.includes(here(g)) && g.player.manaAwakened && circleOf(g) >= 1 && ((g.player.skills.magic ?? 0) >= 20 || !!TS(g).member) && (here(g) !== 'serenia' || !!TS(g).member),
  run(g, rng) {
    const T = TS(g);
    if (!T.craft) {
      if (!craftable(g).length) return '만들 수 있는 것이 떠오르지 않았다.';
      if (!sceneQueued(g, 'tower_craft_pick')) queueScene(g, 'tower_craft_pick');
      return '공방 탁자에 마석을 늘어놓고 무엇을 새길지 생각했다.';
    }
    const it = ITEMS[T.craft.id];
    const cost = Math.ceil(it.cost / it.work);
    if (g.player.money < cost) return `마석값 은화 ${cost}닢이 없어 손을 놓았다.`;
    g.player.money -= cost;
    tired(g, 12);
    gainSkill(g, 'magic', 0.4, 'int');
    if (rng.chance(0.08)) { T.craft.prog = Math.max(0, T.craft.prog - 0.2); return `${it.name}의 술식 한 줄이 어긋났다. 마석이 금 가는 소리를 냈다. 처음부터 다시 새겨야 할 곳이 생겼다.`; }
    T.craft.prog += (0.6 + (g.player.skills.magic ?? 0) / 100 + (T.member?.tower === 'star' ? 0.3 : 0)) * rng.float(0.7, 1.2) / it.work;
    if (T.craft.prog < 1) return `${it.name}에 술식을 새겼다. ${T.craft.prog < 0.5 ? '아직 마석이 술식을 다 먹지 못했다' : '마석 안에서 빛이 고르게 돌기 시작했다'}. (마석값 은화 ${cost}닢)`;
    const id = T.craft.id;
    T.craft = null; T.made += 1;
    if (T.member) T.member.merit += 4 + it.circle * 2;
    if (hasItem(g, id)) { g.player.money += it.sell; return `${J(it.name, '이/가')} 완성되었다. 이미 하나 있으니 팔았다. 은화 ${it.sell}닢.`; }
    T.items.push(id);
    if (id === 'staff') { const gear = L(g).gear; if ((gear.weapon ?? 0) < 9) { gear.weapon = 9; gear.weaponName = '마석 지팡이'; } }
    return `${J(it.name, '이/가')} 완성되었다. ${it.desc} 팔지 않고 곁에 두기로 했다.`;
  },
});
defineScene('tower_craft_pick', {
  title: () => '무엇을 새길까',
  text: (g) => `마석과 은실, 술식 도면이 탁자에 놓여 있다. 지금 솜씨로 만들 수 있는 것: ${craftable(g).map((id) => ITEMS[id].name).join(', ')}.`,
  choices: (g) => (TS(g).craft ? [] : [
    ...craftable(g).slice(0, 6).map((id) => ({ label: `${ITEMS[id].name} (${ITEMS[id].circle}서클, 마석값 ${ITEMS[id].cost}닢)`, key: id })),
    { label: '그만둔다', key: 'none' },
  ]),
  resolve(g, rng, s, key) {
    if (!ITEMS[key]) return '도면을 말아 넣었다.';
    TS(g).craft = { id: key, prog: 0 };
    return `${ITEMS[key].name}. ${ITEMS[key].desc} 첫 술식을 긋기 시작했다.`;
  },
});
