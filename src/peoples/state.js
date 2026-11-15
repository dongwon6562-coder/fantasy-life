// 다른 종족의 땅에서 살기. 상태는 g.peoples 하나.
//   standing{elf,dwarf,beast}: 그 종족이 나를 어떻게 보나 (0~100, 처음엔 내 종족과 대우에서 정해진다)
//   custom{elf,dwarf,beast}: 그 땅의 풍습을 얼마나 익혔나 (0~3: 말, 예법, 의식)
//   lived{elf,dwarf,beast}: 그 땅에서 산 달 수   rites{id: 마지막으로 치른 해}   named{elf,dwarf,beast}: 그 땅이 내게 준 이름
//   ties{'a|b'}: 종족끼리의 사이 (세상의 값, -100~100)   friends: 다른 종족과 맺은 깊은 우정 수
//   heritage{childId: 'mother'|'father'|'both'|'own'}: 섞인 혈통 자식이 어느 쪽에 마음을 두었나
import { HOOKS } from '../hooks.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 세 종족의 땅 (외지인이 닿을 수 있는 어귀 마을)
export const LANDS = {
  elf: {
    race: 'elf', place: 'silverleaf', name: '엘프의 숲', people: '엘프',
    custom: ['숲의 말', '숲의 예법', '세계수의 노래'],
    customText: [
      '엘프의 말은 같은 낱말도 길게 끌면 뜻이 바뀐다. 은잎 마을의 아이들이 내 발음을 듣고 웃었다. 엘프 아이들이 웃는 것을 처음 보았다.',
      '엘프는 처음 만난 사람의 이름을 묻지 않는다. 세 번째 만났을 때 묻는 것이 예의다. 나는 그동안 얼마나 무례했던가.',
      '정원지기 노인이 세계수에게 바치는 노래를 가르쳐 주었다. 다 부르는 데 하룻밤이 걸린다. 그 노래에는 죽은 엘프의 이름이 모두 들어 있다.',
    ],
  },
  dwarf: {
    race: 'dwarf', place: 'hammer', name: '드워프의 산', people: '드워프',
    custom: ['산의 말', '길드의 예법', '조상의 불'],
    customText: [
      '드워프 말에는 돌의 종류를 가리키는 낱말만 마흔 개가 넘는다. 화강암을 그냥 돌이라고 불렀다가 술잔을 빼앗겼다.',
      '드워프와 계약할 때는 손바닥에 침을 뱉고 악수한다. 길드 문서보다 그 악수가 더 무겁다. 문서는 불에 타도 악수는 남는다.',
      '대장간 화로마다 그 집 조상의 이름이 새겨져 있다. 불을 지키는 순서와 이름을 부르는 법을 배웠다. 불 앞에서는 거짓말을 하지 않는다.',
    ],
  },
  beast: {
    race: 'beast', place: 'fur', name: '수인의 초원', people: '수인',
    custom: ['부족의 말', '힘의 예법', '토템의 의식'],
    customText: [
      '수인의 말은 반쯤이 몸짓이다. 귀를 젖히면 노여움, 꼬리를 낮추면 사과다. 귀도 꼬리도 없는 나는 손을 써야 했다.',
      '다툼은 원 안에서 가린다. 원 밖에서 칼을 뽑는 자는 부족 모두의 적이 된다. 진 쪽이 먼저 고개를 숙이면 그걸로 끝이다. 뒤끝은 겁쟁이의 것이다.',
      '토템 기둥에 새긴 이름들을 하나씩 읽는 법을 배웠다. 이름 하나하나에 이야기가 있다. 늙은 무녀가 모두 외우고 있었다.',
    ],
  },
};
export const LAND_IDS = Object.keys(LANDS);
export const landAt = (place) => LAND_IDS.find((k) => LANDS[k].place === place) ?? null;

// 그 땅의 의식: 언제(달), 무엇을 익혀야 제대로 치르나(custom 단계)
export const RITES = {
  elf_dew: { land: 'elf', month: 4, need: 1, name: '이슬 받기', desc: '봄 첫 보름, 세계수 잎에 맺힌 이슬을 받아 그해 태어난 아이들의 이마에 바른다.' },
  elf_fall: { land: 'elf', month: 10, need: 3, name: '낙엽의 노래', desc: '가을, 그해 떠난 이들의 이름을 세계수에게 노래로 돌려준다.' },
  dwarf_fire: { land: 'dwarf', month: 12, need: 2, name: '조상의 불 지키기', desc: '한겨울 가장 긴 밤, 골짜기의 모든 화로를 꺼뜨리지 않고 밤을 새운다.' },
  dwarf_hammer: { land: 'dwarf', month: 6, need: 1, name: '첫 망치', desc: '여름, 그해 처음으로 혼자 쇠를 벼린 젊은이들이 길드장 앞에서 망치를 든다.' },
  beast_hunt: { land: 'beast', month: 7, need: 1, name: '큰 사냥', desc: '한여름 보름, 부족들이 함께 초원의 큰 짐승을 쫓는다. 첫 사냥감의 심장은 가장 어린 사냥꾼이 먹는다.' },
  beast_totem: { land: 'beast', month: 11, need: 3, name: '이름 새기는 밤', desc: '늦가을, 그해 죽은 전사들의 이름을 토템 기둥에 새긴다. 새길 이름이 없으면 이야기만 한다.' },
};

// 처음 standing: 내 종족이 그 종족이면 높고, 아니면 그 땅의 대우에 따라
const START = { welcome: 60, normal: 35, wary: 20, scorn: 8, banned: 0 };
export const startStanding = (treat) => START[treat] ?? 25;

// 종족끼리의 사이 (설정 문서 "종족"): 엘프와 드워프는 오래된 앙금, 수인과 인간은 노예의 기억
export const TIES0 = { 'dwarf|elf': -25, 'beast|human': -30, 'elf|human': -10, 'dwarf|human': 10, 'beast|elf': 15, 'beast|dwarf': 0 };
export const tieKey = (a, b) => [a, b].sort().join('|');
export const RACE_WORD = { human: '인간', elf: '엘프', dwarf: '드워프', beast: '수인', half_elf: '하프엘프' };

export const PS = (g) => (g.peoples ??= fresh());
export function fresh() {
  return {
    standing: { elf: null, dwarf: null, beast: null },
    custom: { elf: 0, dwarf: 0, beast: 0 },
    lived: { elf: 0, dwarf: 0, beast: 0 },
    rites: {}, named: { elf: null, dwarf: null, beast: null },
    ties: { ...TIES0 }, friends: 0, heritage: {}, customAt: -1, log: [],
  };
}
export function plog(g, text) {
  const P = PS(g);
  P.log.push({ y: g.date.year, m: g.date.month, text });
  if (P.log.length > 30) P.log.splice(0, P.log.length - 30);
}
export const standingWord = (v) => (v == null ? '아직 모른다' : v >= 80 ? '한 식구로 여긴다' : v >= 60 ? '믿는다' : v >= 40 ? '얼굴을 안다' : v >= 20 ? '손님으로 대한다' : '경계한다');
export const tieWord = (v) => (v >= 40 ? '가깝다' : v >= 10 ? '나쁘지 않다' : v > -20 ? '서먹하다' : v > -45 ? '서로 꺼린다' : '원수처럼 지낸다');

HOOKS.newGame.push((g) => { g.peoples = fresh(); });
HOOKS.migrate.push((g) => {
  const P = PS(g), f = fresh();
  for (const k of Object.keys(f)) P[k] ??= f[k];
  for (const sub of ['standing', 'custom', 'lived', 'named']) for (const k of LAND_IDS) if (!(k in P[sub])) P[sub][k] = f[sub][k];
  for (const k of Object.keys(TIES0)) P.ties[k] ??= TIES0[k];
});
// 대를 이으면: 풍습과 이름은 그 사람의 것이라 사라지고, 종족들이 이 집안을 보는 눈은 반쯤 남는다
HOOKS.heir?.push((g) => {
  const P = PS(g);
  for (const k of LAND_IDS) {
    if (P.standing[k] != null) P.standing[k] = Math.round(P.standing[k] * 0.5 + 12);
    P.custom[k] = 0; P.lived[k] = 0; P.named[k] = null;
  }
  P.heritage = {}; P.friends = 0;
});
