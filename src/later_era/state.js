// 34단계 뒤 시대의 세계 (도우미스레드3). 상태는 g.later 하나.
//   stance: 마탑·교단·상단·왕실이 새 기술 전체를 어떻게 보나 (-100 막는다 ~ 100 앞장선다)
//   deplete: 마석 고갈 걱정 0~100 (마석을 먹는 발명이 늘수록 오르고, 정련·축마·깊은 갱·짙은 마나가 누른다)
//   mul: { 기술 id: 배율 } 세력이 밀거나 막아서 기술 나무가 빨라지거나 더뎌지는 몫 (techtree grow가 읽는다)
//   last: { 세력: 마지막으로 보인 태도 글 }, me{ hoard, hoardAt, hid, reported, flew, gunDuel, healer }, log[]
import { HOOKS } from '../hooks.js';
import { makeRng } from '../rng.js';
import { PLACES } from '../places.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const laterRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 433) ^ Math.imul(mi(g) * 167 + salt + 59, 2246822519)) | 0 });

export const SIDES = {
  tower: { name: '마탑', power: 'mages' },
  faith: { name: '성광교', power: 'church' },
  trade: { name: '상단', power: 'merchants' },
  crown: { name: '왕실', power: 'nobles' },
};
export const SIDE_IDS = Object.keys(SIDES);
export const stanceWord = (v) => (v >= 50 ? '앞장선다' : v >= 15 ? '반긴다' : v > -15 ? '지켜본다' : v > -50 ? '꺼린다' : '막아선다');
export const depleteWord = (d) => (d >= 70 ? '마석이 바닥난다는 말에 온 나라가 떤다' : d >= 45 ? '마석이 모자라 값이 치솟는다' : d >= 25 ? '마석이 언젠가 바닥날 거라는 걱정이 돈다' : '마석 걱정은 아직 먼 이야기다');

// 기술이 나왔을 때 세력마다의 태도 [stance 변화, 글]. 없으면 지나간다
export const REACT = {
  press: { faith: [-6, '성광교가 사제의 허락 없이 찍은 경전을 불태우라고 했다.'], trade: [6, '상단들이 값을 적은 전단을 찍어 돌린다.'] },
  signal: { crown: [8, '왕실이 전신탑마다 왕의 병사를 세웠다. 소식은 왕의 것이 먼저다.'] },
  healstone: { faith: [-4, '성광교 사제들이 정화석 붕대를 쓰는 의원을 못마땅해한다. 치유는 신의 일이라고 한다.'] },
  railroad: { crown: [10, '왕실이 쇠수레 길에 왕의 이름을 붙이고 세금을 매겼다.'], trade: [12, '상단들이 쇠수레 길 옆 땅을 다투어 사들인다.'], faith: [-5, '성광교가 안식일에도 쇠수레를 돌리는 일을 꾸짖었다.'] },
  newspaper: { crown: [-8, '왕실 검열관이 신문 교정쇄를 먼저 읽는다. 첫 신문 셋 가운데 하나가 문을 닫았다.'], faith: [-6, '성당 강론에서 "날마다 찍어 내는 거짓"을 경계하라는 말이 나왔다.'], trade: [8, '상단들이 신문에 광고를 사기 시작했다.'] },
  waterworks: { crown: [8, '왕이 수도 꼭지 앞에서 첫 물을 받아 마셨다.'], faith: [4, '성광교가 수도를 축복하고 성수 꼭지를 따로 달았다.'] },
  factory: { trade: [14, '상단들이 마력 공장에 돈을 쏟는다. 공장 하나가 마을 열 개를 먹여 살린다고 한다.'], faith: [-8, '성광교가 공장 아이 일꾼을 두고 상단을 꾸짖었다.'], tower: [-6, '마탑이 마력 공장의 마석 낭비를 두고 경고했다.'] },
  diagnose: { faith: [-10, '성광교가 수정 진단판을 "신의 손을 흉내 내는 점괘"라 불렀다.'], tower: [8, '마탑이 진단판 술식을 탑 밖에 팔지 않겠다고 했다.'] },
  medicine: { faith: [-14, '성광교가 마도 의원에게 몸을 맡기는 신도를 고해성사에서 꾸짖으라 했다. 그래도 의원 앞 줄은 길다.'], crown: [6, '왕실이 마도 의원 몇을 궁정 의원으로 들였다.'] },
  steamship: { trade: [10, '붉은돛 같은 큰 뱃짐 상단들이 증기선을 다투어 산다. 작은 돛배 상단들은 무너진다.'] },
  deepmine: { tower: [-4, '마탑이 깊은 갱의 마석은 탁하다고 깎아내렸다.'], crown: [6, '왕실이 깊은 갱에 광업세를 두 배로 매겼다.'] },
  crystal: { tower: [16, '마탑이 통신 수정구를 탑 문장 없이는 쓰지 못하게 했다. 세상의 귀가 탑에 달렸다.'], crown: [-6, '왕실이 마탑의 수정구 독점을 못마땅해한다. 왕의 말도 탑을 거쳐야 간다.'], trade: [-4, '상단들이 수정구 사용료에 불만이다.'] },
  refinery: { tower: [8, '마탑이 정련법을 내세워 마석 값을 정하려 든다.'], trade: [6, '부스러기 마석을 모으는 상단이 새로 섰다.'] },
  gun: { crown: [14, '왕실이 마도 총포를 왕의 근위대에만 허락했다. 한 자루 값이 기사 갑옷 한 벌이다.'], faith: [-8, '성광교가 총포를 "비겁한 쇠"라 불렀다. 검을 든 성기사들이 고개를 끄덕였다.'], tower: [-6, '마탑이 마석을 터뜨리는 일을 낭비라 했다.'] },
  stonebank: { trade: [12, '상단들이 마석 어음으로 셈을 한다. 은화보다 가볍고, 무너지면 더 크게 무너진다.'], crown: [-6, '왕실이 마석 은행이 왕의 은화를 대신하는 일을 경계한다.'] },
  airship: { crown: [10, '왕실이 비행선에 왕기를 달았다. 첫 비행선 이름은 왕녀의 이름을 땄다.'], faith: [-6, '성광교 늙은 사제들이 하늘은 신의 자리라고 중얼거린다.'], tower: [6, '부양석 술식은 탑 밖으로 나가지 않는다.'] },
  manacell: { tower: [10, '마탑이 축마소를 열었다. 마력을 붓는 하급 마법사들의 일거리가 생겼다.'], trade: [8, '상단들이 빈 마석을 모으는 수레를 돌린다.'] },
  northrail: { crown: [10, '북부 쇠수레 길 개통식에 왕이 직접 그라우벨까지 탔다.'] },
  skyline: { trade: [10, '정기 비행선 표 한 장이 농부의 한 해 벌이다. 상단 사람들은 하늘로 출근한다.'] },
};
// 마석을 먹는 발명 (고갈 걱정을 올림) / 누르는 발명
export const HUNGRY = { manamill: 3, forge: 4, boiler: 4, ironcart: 3, railroad: 7, pump: 3, factory: 12, steamship: 8, crystal: 4, gun: 5, airship: 10, northrail: 5, skyline: 10 };
export const RELIEF = { purify: 3, deepmine: 10, refinery: 14, manacell: 22 };

const freshMe = () => ({ hoard: 0, hoardAt: 0, hid: 0, reported: 0, flew: 0, gunDuel: 0, healer: 0 });
export const fresh = () => ({ stance: { tower: 10, faith: -5, trade: 15, crown: 5 }, deplete: 0, mul: {}, last: {}, worry: 0, me: freshMe(), log: [] });
export const LE = (g) => (g.later ??= fresh());
export function llog(g, text) {
  const S = LE(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
function fill(g) {
  const S = LE(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  S.stance = Object.assign(f.stance, S.stance ?? {});
  S.me = Object.assign(freshMe(), S.me ?? {});
}
HOOKS.newGame.push((g) => { g.later = fresh(); });
HOOKS.migrate.push((g) => fill(g));
