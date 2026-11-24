// 마법으로 먹고살기 (42단계). 상태와 도우미.
// - 주문 자체(목록·연구·서클·공인)는 magic이, 마탑 서열은 tower가, 마나의 밀물과 썰물은 mana가 맡는다.
// - 여기(game.magejob)는 '주문으로 버는 일': 떠돌이 마법사의 일거리 게시판, 생활 마법 의뢰(불 붙이기·우물 정화·갱도 밝히기·서리 막기·
//   비 부르기·잃은 것 찾기·가축 병·마을 결계 고치기), 값 흥정과 실패 책임, 마법 가정교사, 마법 용병.
// - 주문은 읽기만 한다: knownSpells(g)의 use·circle·name·desc(그리고 있으면 school/elem)로 '이 일을 할 수 있는 주문'을 고른다.
//   magic 쪽에서 주문이 늘면 저절로 할 수 있는 일이 넓어진다.
// 상태는 game.magejob 하나:
//   fame: { 고장: 0~100 }  wards: { 고장: 0~100 }  (마을 결계: 플레이어 없이도 닳고, 떠돌이 마법사들이 고친다)
//   pupil: null | { name, kind, place, since, fee, prog }   merc: 0(맡은 호위 수)
//   rivals: [{ name, circle, place, fame }]  jobs fails earned refunds   boardAt pupilAt mercAt log past
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { playerAge, circleOf } from '../game.js';
import { knownSpells } from '../magic/spells.js';
import { J } from '../narrative/text.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.over;
export const adult = (g) => playerAge(g) >= 14;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 103) ^ Math.imul(mi(g) * 193 + salt + 421, 2654435761)) | 0 });
export const Q = (name, pair) => `'${name}'${J(name, pair).slice(name.length)}`;

// 게시판이 있는 곳(여관 문간·길드 벽): 마을은 일이 적고 값도 싸다
export const BOARD = { ern: 0.8, gruental: 0.8, klein: 0.85, harfen: 1, verden: 1, graubel: 1.05, hammer: 1.05, gorge: 1.1, fur: 0.9, silverleaf: 0.95, barka: 1.15, portel: 1.15, leocast: 1.25, eisen: 1.3, solaris: 1.15, serenia: 0.9, saltmare: 1 };
export const MINES = ['hammer', 'gorge', 'graubel'];
export const FARMS = ['ern', 'gruental', 'harfen', 'verden', 'klein', 'fur'];
export const CITIES = ['harfen', 'verden', 'leocast', 'eisen', 'solaris', 'barka', 'portel', 'serenia'];

// 주문의 성질을 글로 읽는다 (계열이 생기면 그것도 본다)
const txt = (sp) => `${sp.name ?? ''} ${sp.desc ?? ''} ${sp.school ?? ''} ${sp.elem ?? ''} ${sp.element ?? ''}`;
export const SPELL_TAGS = {
  fire: (sp) => /불|화염|열|fire/.test(txt(sp)),
  water: (sp) => /물|정화|얼음|비|water|ice/.test(txt(sp)),
  air: (sp) => /바람|구름|번개|air|wind/.test(txt(sp)),
  earth: (sp) => /흙|땅|돌|earth|stone/.test(txt(sp)),
  light: (sp) => /빛|등불|번개|light/.test(txt(sp)),
  sense: (sp) => sp.use === 'job' || /탐지|감지|기척|찾|sense/.test(txt(sp)),
  heal: (sp) => sp.use === 'heal',
  ward: (sp) => sp.use === 'ward' || /결계|막|ward/.test(txt(sp)),
  calm: (sp) => /가라앉|마음|정신|mind/.test(txt(sp)),
  combat: (sp) => sp.use === 'combat',
};
// 생활 마법 의뢰: tags 중 하나라도 맞는 주문이 있어야 한다. diff 어려움(서클 기준), pay 기본 값, where 나오는 곳, when 나오는 형편
export const TASKS = {
  kindle: { name: '젖은 장작에 불 붙이기', tags: ['fire'], diff: 1, pay: 2, who: '장마에 아궁이가 꺼진 집들', ok: '집집마다 아궁이에 불을 살렸다. 굴뚝마다 연기가 올랐다.', bad: '불씨가 젖은 장작 위에서 몇 번 튀다 꺼졌다. 아낙이 결국 이웃집에서 불씨를 얻어 왔다.' },
  well: { name: '썩은 우물 맑히기', tags: ['water'], diff: 1, pay: 3, who: '우물물에서 냄새가 난다는 골목', ok: '우물 바닥의 탁한 기운이 걷혔다. 두레박에 맑은 물이 올라왔다. 아이가 먼저 마셨다.', bad: '물은 잠깐 맑아졌다가 저녁에 다시 흐려졌다. 골목 사람들이 나를 곁눈질했다.' },
  minelight: { name: '갱도 밝히기', tags: ['light', 'fire'], diff: 1, pay: 4, where: MINES, who: '등잔 기름이 모자란 광부들', ok: '빛구슬을 갱도 천장에 줄줄이 띄웠다. 광부들이 그림자 없이 곡괭이를 휘둘렀다.', bad: '깊은 갱에서 빛이 자꾸 흔들려 꺼졌다. 광부 하나가 발을 헛디뎠다. 다치지는 않았다.' },
  frost: { name: '서리 막기', tags: ['fire', 'air', 'ward'], diff: 2, pay: 6, where: FARMS, months: [3, 4, 10], who: '꽃 핀 사과밭 주인', ok: '밤새 밭 둘레에 따뜻한 기운을 둘렀다. 아침에 이웃 밭은 하얗고 이 밭만 푸르렀다.', bad: '새벽녘 마력이 바닥났다. 해 뜰 무렵 꽃잎이 갈색으로 오그라들었다.' },
  rain: { name: '비 부르기', tags: ['water', 'air'], diff: 3, pay: 12, where: FARMS, drought: true, who: '가뭄에 타들어 가는 마을 촌장회', ok: '사흘을 언덕에 서 있었다. 넷째 날 저녁, 서쪽에서 구름이 몰려왔다. 비라기보다 이슬비였지만, 밭이 숨을 쉬었다.', bad: '사흘 동안 하늘은 끝내 파랬다. 촌장이 말없이 나를 보았다.' },
  find: { name: '잃은 것 찾기', tags: ['sense'], diff: 2, pay: 5, who: '혼수 반지를 잃은 신부 집', ok: '마력의 잔향을 따라 닭장 뒤 거름 더미까지 갔다. 반지가 거기 있었다. 범인은 까치였다.', bad: '잔향이 여러 갈래로 흩어졌다. 반지는 찾지 못했다. 신부가 울었다.' },
  cattle: { name: '가축 병 다스리기', tags: ['heal', 'calm'], diff: 2, pay: 5, where: FARMS, who: '소가 쓰러진 외양간', ok: '쓰러진 소 셋 가운데 둘이 일어섰다. 주인이 내 손을 잡고 흔들었다.', bad: '손을 얹었지만 소가 끝내 일어나지 못했다. 주인은 값을 다 줄 수 없다고 했다.' },
  ward: { name: '마을 결계 고치기', tags: ['ward'], diff: 2, pay: 12, ward: true, who: '마을 경계석의 결계가 약해졌다는 촌장', ok: '경계석마다 새 문양을 그리고 마력을 부었다. 밤에 숲에서 울던 소리가 멀어졌다.', bad: '문양 하나가 어긋났다. 결계에 구멍이 남은 걸 사흘 뒤에야 알았다.' },
};
export const TASK_IDS = Object.keys(TASKS);
// 이 일을 할 주문 가운데 가장 높은 서클
export function spellFor(g, tid) {
  const t = TASKS[tid];
  // 첫째 성질에 맞는 주문을 먼저, 같으면 서클이 높은 것
  const rank = (sp) => t.tags.findIndex((tag) => SPELL_TAGS[tag](sp));
  const ok = knownSpells(g).filter((sp) => rank(sp) >= 0);
  return ok.sort((a, b) => rank(a) - rank(b) || b.circle - a.circle)[0] ?? null;
}
export const combatSpells = (g) => knownSpells(g).filter((sp) => SPELL_TAGS.combat(sp));
export const canWork = (g) => knownSpells(g).length > 0;

const RIVALS0 = [
  { name: '떠돌이 마법사 옹겔', circle: 2, place: 'harfen', fame: 30 },
  { name: '불씨 할멈 베르타', circle: 1, place: 'ern', fame: 25 },
  { name: '협회 출신 레오폴트', circle: 3, place: 'leocast', fame: 45 },
];
function fresh() {
  const wards = {};
  for (const pl of Object.keys(BOARD)) wards[pl] = 60;
  return { fame: {}, wards, pupil: null, merc: 0, rivals: RIVALS0.map((r) => ({ ...r })), jobs: 0, fails: 0, earned: 0, refunds: 0, boardAt: -99, pupilAt: -99, mercAt: -99, log: [], past: [] };
}
export const M = (g) => (g.magejob ??= fresh());
export function logM(g, text) {
  const s = M(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export const fameAt = (g, pl = here(g)) => M(g).fame[pl] ?? 0;
export function addFame(g, n, pl = here(g)) { const s = M(g); s.fame[pl] = clamp((s.fame[pl] ?? 0) + n, 0, 100); }
export const fameWord = (v) => (v >= 60 ? '마법사 하면 내 이름이 먼저 나온다' : v >= 30 ? '일 잘하는 마법사로 알려졌다' : v >= 10 ? '이름을 아는 사람이 생겼다' : '');
// 성공 확률: 주문 서클과 내 서클이 일의 어려움보다 높을수록, 마법 솜씨가 높을수록. 마나가 썰물이면 덜 듣는다
export function successP(g, tid, sp) {
  const t = TASKS[tid];
  const c = Math.max(sp?.circle ?? 0, 0), me = circleOf(g);
  const tide = (g.mana?.tide ?? 0) / 100;
  return clamp(0.55 + (c - t.diff) * 0.15 + (me - t.diff) * 0.08 + (g.player.skills.magic ?? 0) / 300 + tide * 0.12, 0.08, 0.95);
}

HOOKS.newGame.push((g) => { g.magejob = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.magejob) { g.magejob = d; return; }
  for (const k of Object.keys(d)) if (g.magejob[k] === undefined) g.magejob[k] = d[k];
  for (const pl of Object.keys(d.wards)) g.magejob.wards[pl] ??= 60;
});
