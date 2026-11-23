// 수도원과 은둔 (39단계). 상태와 도우미.
// - 교단의 계급·파벌·이단 심문·순례·축일은 faith가 맡는다. 여기는 담 안의 날마다의 삶이다:
//   수도원에 들어가기(늦은 귀의, 어린 헌납), 서원과 수련, 수도원 일(필사실·약초밭·양조·종 치기·밭), 수도원장 자리,
//   수도원 땅과 영주의 다툼, 산속 은둔처와 찾아오는 사람들, 세속으로 돌아가기.
// 상태는 game.cloister 하나:
//   vow: null | { house, since, stage, role, roleAt, oblate, away }   stage: postulant(청원자) novice(수련자) monk(서원한 수도자) prior(부원장) abbot(원장)
//   houses: { id: { abbot, age, land, wealth, monks, rep, dispute: null|{ lord, since, stake } , closed } }  (플레이어 없이도 원장이 바뀌고 땅을 다툰다)
//   hermit: null | { place, since, visits, fame }
//   left: [{ house, y, how }]  copied  herbs  brewed  rung  evAt  log  past
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { playerAge } from '../game.js';
import { J } from '../narrative/text.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.over;
export const adult = (g) => playerAge(g) >= 15;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 89) ^ Math.imul(mi(g) * 173 + salt + 401, 2654435761)) | 0 });
export const Q = (name, pair) => `'${name}'${J(name, pair).slice(name.length)}`;

// 수도원 넷: 저마다 이름난 일과 가풍이 있다
export const HOUSES = {
  valley: { name: '골짜기 수도원', place: 'gruental', lord: '그륀탈 영주', known: 'herbs', sect: 'saint', desc: '성녀파의 작은 수도원. 문을 두드리는 병자를 신분을 묻지 않고 받는다. 약초밭이 이름났다.', bell: '골짜기 아래로 저녁 종이 굴러 내려간다.' },
  stone: { name: '흰 바위 수도원', place: 'graubel', lord: '그라우벨 성주', known: 'bells', sect: 'orthodox', desc: '천룡 산맥 기슭 바위에 붙어 선 엄한 수도원. 한밤의 종을 하루도 거르지 않는다.', bell: '눈 덮인 바위벽에 한밤의 종이 부딪혀 되울린다.' },
  abbey: { name: '솔라리스 대수도원', place: 'solaris', lord: '교황청 재무관', known: 'scriptorium', sect: 'orthodox', desc: '성도 성벽 안의 큰 수도원. 필사실의 책이 대륙에 퍼진다. 땅도 많고 손님도 많다.', bell: '대수도원의 큰 종이 성도의 지붕들 위로 퍼진다.' },
  river: { name: '베르덴 강가 수녀원', place: 'verden', lord: '베르덴 백작', known: 'brew', sect: 'saint', nuns: true, desc: '강가 둑 위의 수녀원. 수녀들이 빚는 보리 맥주가 백작의 식탁에도 오른다.', bell: '강물 소리 위로 수녀원의 종이 가늘게 울린다.' },
};
export const HOUSE_IDS = Object.keys(HOUSES);
export const houseAt = (pl) => HOUSE_IDS.find((id) => HOUSES[id].place === pl) ?? null;

// 수도원 일: 맡은 일마다 솜씨와 쌓이는 것이 다르다
export const ROLES = {
  scriptorium: { name: '필사실', skill: 'letters', stat: 'int', what: '책', desc: '양피지에 옛 책을 옮겨 적고 머리글자를 그린다.' },
  herbs: { name: '약초밭', skill: 'herbs', stat: 'sen', what: '약초 단', desc: '담 안 약초밭을 돌보고 병실에 약을 댄다.' },
  brew: { name: '양조실', skill: 'cooking', stat: 'sen', what: '맥주 통', desc: '보리를 띄우고 홉을 넣어 수도원 맥주를 빚는다.' },
  bells: { name: '종지기', skill: null, stat: 'wil', what: '종', desc: '밤낮 여덟 번 시간 기도의 종을 친다. 한 번도 늦어서는 안 된다.' },
  fields: { name: '밭과 곳간', skill: 'farming', stat: 'str', what: '곡식 섬', desc: '수도원 밭을 갈고 곳간을 지킨다. 흉년엔 문 앞에 빵을 나눈다.' },
};
export const ROLE_IDS = Object.keys(ROLES);
export const STAGES = { oblate: '헌납 아이', postulant: '청원자', novice: '수련자', monk: '서원한 수도자', prior: '부원장', abbot: '수도원장' };
export const STAGE_ORDER = ['oblate', 'postulant', 'novice', 'monk', 'prior', 'abbot'];
export const stageAt = (g) => C(g).vow?.stage ?? null;
export const stageN = (g) => STAGE_ORDER.indexOf(stageAt(g));
export const monkWord = (g) => (g.player.sex === 'f' ? { brother: '자매', abbot: '원장 수녀', monk: '수녀' } : { brother: '형제', abbot: '수도원장', monk: '수도사' });

// 은둔처를 둘 만한 곳: 산과 숲
export const HERMIT_PLACES = { graubel: '천룡 산맥 기슭의 바위굴', hammer: '쇠망치 골 위쪽 버려진 광부 움막', gorge: '구렁목 골짜기 끝의 돌집', gruental: '골짜기 위 샘가의 움막', silverleaf: '대삼림 가장자리 고목 아래', fr_wood: '물푸레 숲 깊은 곳의 오두막', fr_wolf: '늑대 고개 바위틈' };

const ABBOTS = ['베네딕트', '안셀름', '힐데가르트', '베른하르트', '스콜라스티카', '알쿠인', '게르트루드', '마테우스', '오틸리아', '콜룸반'];
const ABBESSES = ['힐데가르트', '스콜라스티카', '게르트루드', '오틸리아', '루트가르트', '마틸데'];
export const abbotName = (rng, nuns = false) => { const list = nuns ? ABBESSES : ABBOTS; return list[Math.floor(rng.next() * list.length)]; };
// 강가 수녀원은 여자만 받는다
export const houseFits = (g, id) => !!id && (!HOUSES[id].nuns || g.player.sex === 'f');

function freshHouses() {
  const h = {};
  HOUSE_IDS.forEach((id, i) => { h[id] = { abbot: HOUSES[id].nuns ? ABBESSES[0] : ABBOTS[(i * 3) % ABBOTS.length], age: 52 + i * 5, land: id === 'abbey' ? 70 : id === 'valley' ? 30 : 45, wealth: id === 'abbey' ? 60 : 30, monks: id === 'abbey' ? 60 : 18 + i * 4, rep: 50, dispute: null, closed: false }; });
  return h;
}
function fresh() {
  return { vow: null, houses: freshHouses(), hermit: null, left: [], copied: 0, herbs: 0, brewed: 0, rung: 0, evAt: 0, oblateAsked: false, log: [], past: [] };
}
export const C = (g) => (g.cloister ??= fresh());
export function logC(g, text) {
  const s = C(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export const vowed = (g) => !!C(g).vow;
export const inHouse = (g) => vowed(g) && HOUSES[C(g).vow.house].place === here(g) && !L(g).travel;
export const hermitHere = (g) => !!C(g).hermit && C(g).hermit.place === here(g) && !L(g).travel;
export const houseOf = (g) => (C(g).vow ? C(g).houses[C(g).vow.house] : null);

HOOKS.newGame.push((g) => { g.cloister = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.cloister) { g.cloister = d; return; }
  for (const k of Object.keys(d)) if (g.cloister[k] === undefined) g.cloister[k] = d[k];
  for (const id of HOUSE_IDS) g.cloister.houses[id] ??= d.houses[id];
  if (g.cloister.vow && !HOUSES[g.cloister.vow.house]) g.cloister.vow = null;
});
