// 검술 유파와 등급. 입문 → 숙련 → 상급 → 검성 → 검왕 (검신은 살아 있는 사람이 없다).
// - 유파는 스승에게 들어가야 배운다. 에른에서는 기사 가문의 아버지(유수류)나 마을 모험가(환영류),
//   하르펜·베르덴·왕도에는 도장과 기사단이 있다.
// - 43단계: 나라와 종족마다 유파가 늘었다(여덟). 성광국의 성휘류, 드워프의 모루도끼술, 엘프의 잎새쌍검, 수인의 발톱손,
//   바다 사람들의 물결칼. 유파마다 초식 넷(forms)과 비전 하나(secret). 등급 이름은 무기가 달라도 같은 말을 쓴다(검성은 칼만 뜻하지 않는다).
// - 승급은 검술 실력이 차면 스승과의 대련(결투 모드)으로 인정받는다.
// - 검성부터는 검에 마력을 싣는다. 마력이 없으면 의지로 닿을 수도 있지만 훨씬 드물다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import { byId, living } from '../npc.js';
import { placePerson, PLACES } from '../places.js';
import { remember } from '../relations.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { queueDuel, registerDuelEnd } from './registry.js';

// 유파: sig는 유파가 잘 쓰는 수(피해 배율), style은 그 유파 사람과 겨룰 때의 성향, stat은 수련으로 느는 몸,
// races가 있으면 그 종족에게만 기꺼이 가르치고, 바깥사람은 outsider의 몸을 갖춰야 받아 준다.
// teach: 그 유파를 가르치는 사람이 있는 곳(아버지·길드장처럼 진짜 NPC가 가르치는 곳은 mastersHere에 따로 있다).
// forms: 초식 넷 { id, name, move, mul, need(검술), desc }. move가 wait이면 mul만큼 다음 칼이 날카로워진다.
// secret: 비전 { name, move, desc } — 검성 이상, 초식 넷을 다 익히고 스승의 시험을 넘어야. 기세를 탄 채 그 수로 이기면 한 번 터진다.
export const SCHOOLS = {
  yusu: {
    name: '유수류', from: '레오니아', desc: '상대의 힘을 흘려보내고 받아치는 검. 레오니아 기사단과 성기사의 검이다. 막기와 받아치기가 강하다.',
    labels: { guard: '흘려보내고 받아친다 (유수류 막기)' }, stat: 'wil', style: 'steady', sig: { guard: 1.35 }, seat: ['leocast'],
    taunt: '도망치는 걸 검술이라 부르는 그 유파?', motto: '"먼저 베지 마라. 흘리고, 받아라."',
    train: ['같은 받아치기를 백 번. 스승은 백한 번째에야 고개를 끄덕였다.', '스승의 목검이 내 힘을 흘려 내 등 뒤로 보냈다. 몇 번을 넘어져도 어떻게 된 건지 알 수 없었다.'],
    forms: [
      { id: 'yu1', name: '물결 받기', move: 'guard', mul: 1.12, need: 20, desc: '상대의 칼을 칼등으로 받아 옆으로 흘린다. 가장 먼저 배우는 형.' },
      { id: 'yu2', name: '여울 찌르기', move: 'quick', mul: 1.1, need: 35, desc: '흘려보낸 힘이 되돌아오는 자리로 짧게 찌른다.' },
      { id: 'yu3', name: '고인 물', move: 'wait', mul: 1.15, need: 50, desc: '움직이지 않고 상대의 숨을 읽는다. 다음 칼이 날카로워진다.' },
      { id: 'yu4', name: '되돌이 물', move: 'guard', mul: 1.15, need: 65, desc: '받은 힘을 몸을 돌려 그대로 돌려준다.' },
    ],
    secret: { id: 'yu_s', name: '큰 강', move: 'guard', desc: '막기로 이긴 그 순간, 상대가 실은 힘을 통째로 돌려준다.' },
  },
  ganggeom: {
    name: '강검류', from: '발하르트', desc: '선제 일격에 모든 힘을 싣는 검. 발하르트 제국군과 용병의 검이다. 강공이 무겁다.',
    labels: { heavy: '온몸을 실어 내려친다 (강검류 강공)' }, stat: 'str', style: 'bold', sig: { heavy: 1.3 }, seat: ['eisen', 'leocast'],
    taunt: '힘만 센 돼지들 칼춤?', motto: '"첫 칼에 모든 걸 실어라. 두 번째는 없다."',
    train: ['통나무를 내려치고 또 내려쳤다. 손바닥이 터졌다. "망설이면 죽는다."', '사범은 첫 일격에 모든 것을 실으라고 했다. 두 번째는 없다고.'],
    forms: [
      { id: 'gg1', name: '쇠망치', move: 'heavy', mul: 1.1, need: 20, desc: '어깨부터 발끝까지 한 줄로 세워 내려친다.' },
      { id: 'gg2', name: '돌격 베기', move: 'quick', mul: 1.1, need: 35, desc: '달려드는 걸음 그대로 짧게 벤다.' },
      { id: 'gg3', name: '산 가르기', move: 'heavy', mul: 1.15, need: 50, desc: '막는 칼째로 쪼갠다. 막는 쪽이 진다.' },
      { id: 'gg4', name: '철벽', move: 'guard', mul: 1.12, need: 65, desc: '받아치지 않고 버틴다. 다음 일격을 위해.' },
    ],
    secret: { id: 'gg_s', name: '단두', move: 'heavy', desc: '기세가 오른 채 내려치면, 그 한 칼로 끝을 낸다.' },
  },
  hwanyeong: {
    name: '환영류', from: '자유도시', desc: '속임수와 속도, 어떤 자세에서든 베는 실전 검. 자유도시 모험가와 암살자의 검이다. 허초가 날카롭고 버릇을 읽히지 않는다.',
    labels: { feint: '그림자처럼 속인다 (환영류 허초)' }, stat: 'agi', style: 'tricky', sig: { feint: 1.3 }, adapt: 0.6, seat: ['barka', 'leocast'],
    taunt: '뒤에서 찌르는 쥐새끼 검?', motto: '"정직한 검은 일찍 죽는다."',
    train: ['눈을 가리고 방울 소리만으로 피하는 수련을 했다. 멍이 열두 군데 생겼다.', '"칼은 보여 주는 게 아니다. 보여 주는 척하는 거지." 스승이 웃으며 내 허리띠를 베어 떨어뜨렸다.'],
    forms: [
      { id: 'hw1', name: '그림자 걸음', move: 'feint', mul: 1.1, need: 20, desc: '왼발이 가는 척 오른발이 간다.' },
      { id: 'hw2', name: '뒤꿈치 칼', move: 'quick', mul: 1.12, need: 35, desc: '물러서는 걸음 끝에서 칼이 나온다.' },
      { id: 'hw3', name: '거울 속임', move: 'feint', mul: 1.15, need: 50, desc: '상대의 버릇을 흉내 내 상대를 속인다.' },
      { id: 'hw4', name: '빈 칼집', move: 'wait', mul: 1.15, need: 65, desc: '칼을 거두는 척, 거리를 잰다.' },
    ],
    secret: { id: 'hw_s', name: '그믐', move: 'feint', desc: '달 없는 밤처럼, 칼이 어디서 오는지 아무도 보지 못한다.' },
  },
  seonghwi: {
    name: '성휘류', from: '성광 신성국', desc: '성기사들이 맹세와 함께 배우는 검. 버티며 기도하듯 숨을 고르고, 버틴 만큼 무겁게 친다. 간 보기가 강하고 숨을 고르면 상처가 조금 아문다.',
    labels: { wait: '맹세를 외며 숨을 고른다 (성휘류)' }, stat: 'wil', style: 'steady', sig: { heavy: 1.15 }, waitHeal: 6, seat: ['solaris'],
    races: ['human'], taunt: '기도문 외우다 목 베일 검?', motto: '"칼보다 맹세가 먼저다. 맹세를 버리면 칼도 버려라."',
    train: ['새벽 종이 울릴 때까지 칼을 든 채 무릎을 꿇고 있었다. 팔이 떨려도 내리지 않았다.', '교관은 기도문 한 줄에 한 번씩만 베라고 했다. 숨이 칼을 이끈다고.'],
    forms: [
      { id: 'sh1', name: '맹세의 자세', move: 'guard', mul: 1.1, need: 20, desc: '칼을 가슴 앞에 세우고 물러서지 않는다.' },
      { id: 'sh2', name: '기도하는 칼', move: 'wait', mul: 1.2, need: 35, desc: '숨을 고를수록 다음 칼이 무거워진다.' },
      { id: 'sh3', name: '빛의 일격', move: 'heavy', mul: 1.12, need: 50, desc: '정면에서 한 번, 숨을 다 실어 내려친다.' },
      { id: 'sh4', name: '순례자의 걸음', move: 'quick', mul: 1.1, need: 65, desc: '먼 길을 걷는 걸음처럼 끊이지 않게 찌른다.' },
    ],
    secret: { id: 'sh_s', name: '새벽 종', move: 'heavy', desc: '버티고 버틴 끝에, 종을 치듯 한 번에 내려친다.' },
  },
  moru: {
    name: '모루도끼술', from: '드워프 왕국', weapon: '도끼', desc: '드워프 대장간에서 나온 도끼술. 칼 대신 무거운 외날 도끼를 쓰고, 강공이 무엇보다 무겁다. 대신 몸이 무거워 속공은 덜하다.',
    labels: { heavy: '도끼를 머리 위로 들어 내리찍는다 (모루도끼술)' }, stat: 'str', style: 'bold', sig: { heavy: 1.4, quick: 0.9 }, seat: ['hammer'],
    races: ['dwarf'], outsider: { str: 50 }, taunt: '나무꾼 도끼질?', motto: '"쇠는 망치를 탓하지 않는다. 내리쳐라."',
    train: ['모루 옆에서 도끼를 쉰 번 내리찍었다. 사범은 쇳소리만 듣고도 어느 번이 틀렸는지 알았다.', '갱도 버팀목을 도끼 한 번에 쳐내는 연습을 했다. 손바닥에 굳은살이 겹으로 앉았다.'],
    forms: [
      { id: 'mr1', name: '장작 패기', move: 'heavy', mul: 1.1, need: 20, desc: '결을 따라 내리찍는다. 모든 도끼질의 첫걸음.' },
      { id: 'mr2', name: '자루 치기', move: 'quick', mul: 1.15, need: 35, desc: '도끼날 대신 자루 끝으로 명치를 찌른다.' },
      { id: 'mr3', name: '모루 받침', move: 'guard', mul: 1.12, need: 50, desc: '넓은 도끼날을 방패처럼 세운다.' },
      { id: 'mr4', name: '갱도 무너뜨리기', move: 'heavy', mul: 1.15, need: 65, desc: '한 번에 버팀목을 끊듯, 상대의 자세를 통째로 무너뜨린다.' },
    ],
    secret: { id: 'mr_s', name: '볼가르의 내리침', move: 'heavy', desc: '용사 일행의 드워프 전사가 남겼다는 내리찍기. 바위가 쪼개진다.' },
  },
  ipsae: {
    name: '잎새쌍검', from: '엘프 왕국', weapon: '쌍검', desc: '엘프 숲의 쌍검. 짧은 칼 두 자루로 바람에 날리는 잎처럼 끊임없이 찌른다. 속공이 날카롭고 버릇을 덜 읽힌다.',
    labels: { quick: '두 칼로 번갈아 찌른다 (잎새쌍검)' }, stat: 'agi', style: 'swift', sig: { quick: 1.35 }, adapt: 0.8, seat: ['silverleaf'],
    races: ['elf', 'half_elf'], outsider: { agi: 55, sen: 45 }, taunt: '나뭇잎 흉내 내는 칼춤?', motto: '"숲은 한 그루로 서지 않는다. 칼도 두 자루다."',
    train: ['떨어지는 잎을 두 칼로 번갈아 꿰었다. 해 질 녘까지 셋을 꿰었다.', '스승은 나무 사이를 달리며 칼을 휘둘렀다. 가지 하나 다치지 않았다. 나는 열두 번 걸렸다.'],
    forms: [
      { id: 'ip1', name: '두 잎', move: 'quick', mul: 1.1, need: 20, desc: '왼 칼이 막는 사이 오른 칼이 찌른다.' },
      { id: 'ip2', name: '바람 따라', move: 'feint', mul: 1.1, need: 35, desc: '한 칼은 보이고 한 칼은 숨긴다.' },
      { id: 'ip3', name: '가지 꺾기', move: 'guard', mul: 1.1, need: 50, desc: '두 칼을 엇걸어 상대의 칼을 붙잡는다.' },
      { id: 'ip4', name: '낙엽비', move: 'quick', mul: 1.15, need: 65, desc: '쏟아지는 잎처럼 수십 번을 찌른다.' },
    ],
    secret: { id: 'ip_s', name: '천 그루 숲', move: 'quick', desc: '칼이 두 자루가 아니라 숲처럼 보인다.' },
  },
  balto: {
    name: '발톱손', from: '수인 부족 연합', weapon: '맨손', desc: '수인 부족의 맨손 싸움. 칼 없이 붙잡고 넘기고 할퀸다. 속공과 강공이 고루 세고, 칼이 없어도 줄지 않는다.',
    labels: { heavy: '몸째로 부딪쳐 넘긴다 (발톱손)' }, stat: 'str', style: 'bold', sig: { quick: 1.15, heavy: 1.15 }, bare: true, seat: ['fur'],
    races: ['beast'], outsider: { str: 45, agi: 45 }, taunt: '짐승처럼 물어뜯는 싸움질?', motto: '"칼은 빼앗길 수 있다. 손은 못 빼앗는다."',
    train: ['모래밭에서 족장의 아들과 하루 종일 뒹굴었다. 일곱 번 넘어지고 한 번 넘겼다.', '나무 기둥을 맨손으로 치고 또 쳤다. 손마디가 갈라졌다가 굳었다.'],
    forms: [
      { id: 'bt1', name: '낮은 자세', move: 'wait', mul: 1.15, need: 20, desc: '몸을 땅에 붙이고 상대가 먼저 오기를 기다린다.' },
      { id: 'bt2', name: '어깨 받기', move: 'heavy', mul: 1.1, need: 35, desc: '어깨로 들이받아 상대를 넘어뜨린다.' },
      { id: 'bt3', name: '목덜미 잡기', move: 'guard', mul: 1.12, need: 50, desc: '들어오는 팔을 붙잡아 그대로 넘긴다.' },
      { id: 'bt4', name: '사냥꾼 발톱', move: 'quick', mul: 1.15, need: 65, desc: '틈이 보이는 순간 손끝으로 급소를 친다.' },
    ],
    secret: { id: 'bt_s', name: '무리의 울음', move: 'heavy', desc: '무리를 이끄는 짐승처럼, 한 번 덮치면 놓지 않는다.' },
  },
  mulgyeol: {
    name: '물결칼', from: '바다 사람들', weapon: '곡도', desc: '흔들리는 갑판에서 자란 곡도술. 발밑이 흔들려도 쓰러지지 않고, 속이며 짧게 벤다. 허초와 속공이 고루 날카롭다.',
    labels: { feint: '뱃전을 차고 돌아 벤다 (물결칼)' }, stat: 'agi', style: 'tricky', sig: { feint: 1.15, quick: 1.15 }, seat: ['saltmare', 'portel'],
    taunt: '배 멀미 하는 칼?', motto: '"바다는 가만히 서 있는 놈부터 삼킨다."',
    train: ['흔들리는 널빤지 위에서 곡도를 휘둘렀다. 물에 열한 번 빠졌다.', '선장 출신 사범은 밧줄 하나를 칼끝으로 끊게 했다. 배가 흔들릴 때마다.'],
    forms: [
      { id: 'mg1', name: '갑판 걸음', move: 'wait', mul: 1.15, need: 20, desc: '흔들림에 몸을 맡기고 균형을 잡는다.' },
      { id: 'mg2', name: '밧줄 끊기', move: 'quick', mul: 1.1, need: 35, desc: '손목만 써서 짧게 끊어 벤다.' },
      { id: 'mg3', name: '뱃전 넘기', move: 'feint', mul: 1.12, need: 50, desc: '넘어지는 척 몸을 돌려 벤다.' },
      { id: 'mg4', name: '물보라', move: 'heavy', mul: 1.12, need: 65, desc: '파도가 부서지듯 위에서 내려친다.' },
    ],
    secret: { id: 'mg_s', name: '큰 너울', move: 'feint', desc: '배를 뒤집는 큰 물결처럼, 속인 끝에 덮친다.' },
  },
};
export const SCHOOL_IDS = Object.keys(SCHOOLS);
// 새로 가르치는 사람이 있는 곳 (이름 있는 NPC 스승이 아니라 그곳 도장의 사범). 이름은 처음 찾을 때 지어 둔다.
export const TEACH = {
  ganggeom: [{ place: 'eisen', who: '제국 검술원 교관' }, { place: 'graubel', who: '성채 검술 교관' }],
  hwanyeong: [{ place: 'barka', who: '자유도시 검객' }, { place: 'portel', who: '부두 뒷골목 검객' }],
  seonghwi: [{ place: 'solaris', who: '성기사단 교관' }],
  moru: [{ place: 'hammer', who: '대장간 도끼 사범' }, { place: 'gorge', who: '구렁목 문지기 대장' }],
  ipsae: [{ place: 'silverleaf', who: '숲의 칼춤 스승' }],
  balto: [{ place: 'fur', who: '맨손 싸움꾼 족장' }],
  mulgyeol: [{ place: 'saltmare', who: '선장 출신 검객' }, { place: 'crow', who: '해적단 칼잡이' }, { place: 'portel', who: '부두 도장주' }],
};
const NAME_POOL = {
  yusu: ['에드릭', '마르타', '로엔', '세르반'], ganggeom: ['군터', '하이케', '오토', '브루노', '카트린'], hwanyeong: ['베아', '리코', '셀린', '도미'],
  seonghwi: ['아우렐', '테오도라', '그레고르', '일다'], moru: ['도린', '가르바', '토르크', '헤일라', '부른'], ipsae: ['엘리안', '시렌', '아윈', '라에스'],
  balto: ['카르', '루마', '오르흔', '타샤', '바곤'], mulgyeol: ['살바', '네리오', '코르', '마렌', '이스카'],
};
export const RANKS = ['입문', '숙련', '상급', '검성', '검왕', '검신'];
// 다음 등급에 도전하려면 필요한 검술
export const RANK_NEED = [0, 30, 55, 80, 95, 101];

export function swordState(g) {
  g.sword ??= { school: null, rank: -1, master: null, tests: 0 };
  const s = g.sword;
  s.forms ??= []; s.secret ??= false; s.aura ??= 0; s.auraP ??= 0; s.blade ??= 0; s.bladeP ??= 0;
  s.fought ??= []; s.formAt ??= -99; s.house ??= false;
  return s;
}
// 세상 쪽 검의 상태 (대를 이어도 남는다): 도장 사범들, 이름난 검객들, 내가 세운 유파
export function hallState(g) {
  g.swordhall ??= { masters: {}, famous: [], own: null, log: [], past: [] };
  return g.swordhall;
}
export const schoolOf = (g) => g.sword?.school ?? null;
export const rankOf = (g) => g.sword?.rank ?? -1;
export const schoolName = (g) => (g.sword?.house && g.swordhall?.own ? g.swordhall.own.name : SCHOOLS[schoolOf(g)]?.name ?? '');
export const rankName = (g) => (rankOf(g) >= 0 && SCHOOLS[schoolOf(g)] ? `${schoolName(g)} ${RANKS[rankOf(g)]}` : '유파 없음');
const here = (g) => g.life?.place ?? 'ern';
const raceOf = (g) => g.player?.race ?? 'human';

// 이 유파가 나를 받아 주는가
export function schoolFits(g, id) {
  const sc = SCHOOLS[id];
  if (!sc?.races || sc.races.includes(raceOf(g))) return true;
  if (!sc.outsider) return false;
  return Object.entries(sc.outsider).every(([k, v]) => (g.player.stats[k] ?? 0) >= v);
}
// 배운 초식이 그 수에 얹는 배율 (다른 유파 초식도 몸에 익었으면 쓴다)
export function formMul(g, move) {
  const fs = g.sword?.forms ?? [];
  let m = 1;
  for (const id of fs) { const f = formById(id); if (f && f.move === move) m *= f.mul; }
  return Math.min(1.6, m);
}
export function formById(id) {
  for (const sc of Object.values(SCHOOLS)) { const f = sc.forms.find((x) => x.id === id); if (f) return f; }
  return null;
}
// 그 수에 붙는 이름: 가장 나중에 배운 초식
export function formFor(g, move) {
  const fs = g.sword?.forms ?? [];
  for (let i = fs.length - 1; i >= 0; i--) { const f = formById(fs[i]); if (f && f.move === move) return f; }
  return null;
}
const hash = (str) => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h | 0; };
// 도장 사범 (이름 있는 NPC가 아닌 곳). 한 번 지으면 저장에 남고, 늙으면 세상 쪽(hall.js)에서 바뀐다.
export function hallMaster(g, school, place, who) {
  const H = hallState(g), key = `${school}:${place}`;
  if (!H.masters[key]) {
    const rng = makeRng({ s: hash(key) ^ (g.date?.year ?? 0) });
    H.masters[key] = { school, place, who, name: rng.pick(NAME_POOL[school]), skill: 58 + rng.int(0, 22), age: 38 + rng.int(0, 18) };
  }
  return H.masters[key];
}
export const poolName = (rng, school) => rng.pick(NAME_POOL[school] ?? NAME_POOL.yusu);

// 지금 있는 곳에서 배울 수 있는 유파와 스승
export function mastersHere(g) {
  const out = [];
  const pl = here(g);
  if (pl === 'ern') {
    const f = byId(g, g.player.familyIds[0]);
    if (f && f.alive && !f.away && f.job === 'old_knight') out.push({ school: 'yusu', id: f.id, name: f.name, skill: Math.max(45, f.skill), who: '아버지' });
    const a = living(g).find((p) => p.job === 'adventurer' && (p.place ?? 'ern') === 'ern' && p.known && p.affection >= 15);
    if (a) out.push({ school: 'hwanyeong', id: a.id, name: a.name, skill: Math.max(30, a.skill * 0.7), who: '모험가' });
  }
  if (pl === 'harfen') {
    const m = placePerson(g, 'harfen', 'sword_master');
    if (m) out.push({ school: 'ganggeom', id: m.id, name: m.name, skill: m.skill, who: '도장 사범' });
    const r = placePerson(g, 'harfen', 'guildmaster');
    if (r) out.push({ school: 'hwanyeong', id: r.id, name: r.name, skill: r.skill, who: '길드장' });
  }
  if (pl === 'verden') {
    const k = placePerson(g, 'verden', 'knight_captain');
    if (k) out.push({ school: 'yusu', id: k.id, name: k.name, skill: k.skill, who: '기사단장' });
  }
  if (pl === 'leocast') {
    const k = placePerson(g, 'leocast', 'knight_captain');
    if (k) out.push({ school: 'yusu', id: k.id, name: k.name, skill: k.skill, who: '근위 기사단장' });
    const m = placePerson(g, 'leocast', 'sword_master');
    if (m) out.push({ school: 'ganggeom', id: m.id, name: m.name, skill: m.skill, who: '왕도 도장주' });
    const b = placePerson(g, 'leocast', 'gang_boss');
    if (b) out.push({ school: 'hwanyeong', id: b.id, name: b.name, skill: b.skill, who: '뒷골목의 검객' });
  }
  // 43단계: 나라와 종족마다 늘어난 도장들
  for (const [school, list] of Object.entries(TEACH)) {
    for (const t of list) {
      if (t.place !== pl || !PLACES[pl]) continue;
      const m = hallMaster(g, school, pl, t.who);
      out.push({ school, id: null, name: m.name, skill: m.skill, who: t.who, hall: true });
    }
  }
  // 우리 집안이 세운 유파 (세운 사람이 가르치거나, 그 도장이 남아 있으면)
  const own = g.swordhall?.own;
  if (own && own.place === pl && own.pupils > 0 && !own.mine) out.push({ school: own.base, id: null, name: own.headName ?? own.name, skill: Math.min(85, 50 + own.fame / 3), who: `${own.name} 도장`, house: true, houseName: own.name });
  return out.filter((m) => schoolFits(g, m.school));
}
// 받아 주지 않는 유파 (종족이 달라서): 고르기 글에 한 줄 적는다
export function refusedHere(g) {
  const pl = here(g);
  return Object.entries(TEACH).filter(([id, list]) => list.some((t) => t.place === pl) && !schoolFits(g, id)).map(([id]) => id);
}
const joinable = (g) => mastersHere(g).filter((m) => m.school !== schoolOf(g) || (m.house && !g.sword?.house));
// 지금 있는 곳에서 내 유파를 가르쳐 줄 사람 (처음 스승이 아니어도 같은 유파면 된다)
export const myMaster = (g) => mastersHere(g).find((m) => m.school === schoolOf(g) && !!m.house === !!g.sword?.house) ?? mastersHere(g).find((m) => m.school === schoolOf(g)) ?? null;

// ---------- 행동 ----------
ACTIONS.push(
  {
    id: 'sword_school_join', name: '유파에 입문하기', icon: 'sword',
    desc: '스승을 찾아가 검의 유파에 든다. 나라와 종족마다 유파가 다르고, 이곳에서 가르치는 것 가운데 고른다. 다른 유파로 옮기면 등급은 처음부터다.',
    available: (g) => playerAge(g) >= 8 && !g.life?.travel && joinable(g).length > 0 && !g.swordJoinQueued
      && g.date.year * 12 + g.date.month - (g.swordJoinAt ?? -99) >= 6, // 한 번 정하면(입문이든 그만두든) 반년은 다시 찾지 않는다
    run(g) {
      g.swordJoinQueued = true;
      return '검을 가르칠 사람을 찾아 나섰다.';
    },
  },
  {
    id: 'sword_school_train', name: '도장 수련', icon: 'sword',
    desc: '유파의 스승 밑에서 형과 대련을 익힌다. 혼자 휘두르는 것보다 훨씬 빨리 는다.',
    available: (g) => rankOf(g) >= 0 && !g.life?.travel && !!myMaster(g),
    run(g, rng) {
      const m = myMaster(g);
      if (!m) return '스승을 찾아갔지만 자리에 없었다. 혼자 형을 몇 번 휘두르다 돌아왔다.';
      g.player.fatigue = Math.min(100, g.player.fatigue + 15);
      const bonus = 1.4 + Math.min(0.8, m.skill / 100);
      const sc = SCHOOLS[schoolOf(g)];
      const k = gainSkill(g, 'sword', bonus, sc.stat);
      const st = gainStat(g, sc.stat, 0.4);
      const p = byId(g, m.id); if (p) { p.known = true; p.affection += 1; }
      return `${m.who} ${m.name}에게 ${J(schoolName(g), '을/를')} 배웠다. ${rng.pick(sc.train)} (검술 +${k.toFixed(1)}${st > 0.04 ? `, 몸 +${st.toFixed(1)}` : ''})`;
    },
  },
  {
    id: 'sword_rank_test', name: '승급 대련 청하기', icon: 'shield',
    desc: '스승에게 다음 등급을 인정받기 위한 대련을 청한다. 목검이지만 봐주지 않는다.',
    available: (g) => {
      const r = rankOf(g);
      if (r < 0 || r >= 4 || g.duelQueued || g.life?.travel) return false;
      if (g.player.skills.sword < RANK_NEED[r + 1]) return false;
      if (r + 1 === 3 && !(g.player.manaAwakened && g.player.mana >= 40) && g.player.stats.wil < 75) return false;
      if (r + 1 === 4 && !(SCHOOLS[schoolOf(g)].seat ?? ['leocast']).includes(here(g))) return false; // 검왕은 그 유파의 본산에서
      return !!myMaster(g);
    },
    run(g, rng) {
      const m = myMaster(g);
      if (!m) return '대련을 청하려 했지만 스승이 자리에 없었다.';
      if (g.duelQueued) return '이번 달에는 이미 잡힌 대련이 있다. 승급 대련은 다음으로 미뤘다.';
      const r = rankOf(g) + 1;
      // 스승은 그 등급에 맞는 힘으로 시험한다. 제 솜씨를 다 쓰면 숙련 대련도 넘을 수 없었다 (28단계 헤드: 솜씨 90에도 숙련 대련을 열세 번 내리 짐)
      const foeSkill = r >= 4 ? 96 : Math.max(RANK_NEED[r] + 8, Math.min(m.skill, RANK_NEED[r] + 15));
      queueDuel(g, {
        kind: 'rank_test', title: `${RANKS[r]} 승급 대련`,
        intro: r >= 3
          ? `${m.who} ${J(m.name, '이/가')} 진검을 내밀었다. "${RANKS[r]}은 목검으로 인정하지 않는다. 검에 마력을 실어 봐라. 실을 수 있다면."`
          : `${m.who} ${J(m.name, '이/가')} 목검을 던져 주었다. "${RANKS[r]}이라. 내 앞에서 세 번 버텨 봐라."`,
        foe: { name: m.name, skill: foeSkill, style: SCHOOLS[schoolOf(g)].style, id: m.id, aura: r >= 3 },
        ctx: { rank: r, masterId: m.id },
      });
      return `${m.name}에게 ${RANKS[r]} 승급 대련을 청했다.`;
    },
  },
  {
    id: 'sword_spar', name: '대련하기', icon: 'sword',
    desc: '검을 쓰는 아는 사람에게 목검 대련을 청한다. 낌새를 읽고 수를 고르는 1대1 결투다.',
    // 15살 아래는 한 해에 한 번만 (48단계: 아이 대련이 한 해 세 번씩 떴다)
    available: (g) => playerAge(g) >= 10 && !g.duelQueued && !g.life?.travel && sparPartners(g).length > 0
      && !(playerAge(g) < 15 && (g.sword?.kidSparAt ?? -99) > g.date.year * 12 + g.date.month - 12),
    run(g, rng) {
      if (g.duelQueued) return '이번 달에는 이미 잡힌 대련이 있다. 혼자 목검을 휘두르며 몸을 풀었다.';
      if (playerAge(g) < 15) swordState(g).kidSparAt = g.date.year * 12 + g.date.month;
      const p = rng.pick(sparPartners(g));
      if (!p) return '대련할 사람을 찾았지만 아무도 시간이 없었다.';
      queueDuel(g, {
        kind: 'spar', title: '목검 대련',
        intro: `${J(p.name, '이/가')} 목검 두 자루를 들고 나왔다. "봐주지 않는다."`,
        foe: { name: p.name, skill: sparSkill(p), style: styleOf(p), id: p.id },
        ctx: { id: p.id },
      });
      return `${p.name}에게 대련을 청했다.`;
    },
  },
);

const SWORD_JOBS = ['guard', 'adventurer', 'old_knight', 'knight', 'knight_captain', 'sword_master', 'hunter', 'guildmaster', 'gang_boss'];
export function sparPartners(g) {
  return living(g).filter((p) => !p.isPlayer && p.known && p.affection >= 10 && SWORD_JOBS.includes(p.job)
    && (p.place ?? 'ern') === here(g) && p.ageMonths >= 15 * 12 && p.ageMonths < 60 * 12);
}
export function sparSkill(p) {
  const base = { hunter: 0.4, guard: 0.6, adventurer: 0.7, old_knight: 0.8, knight: 0.85, guildmaster: 0.9, gang_boss: 0.85, sword_master: 1, knight_captain: 1 }[p.job] ?? 0.4;
  return Math.round(8 + p.skill * base);
}
export function styleOf(p) {
  const t = p.traits ?? [];
  if (t.includes('brave') || t.includes('cruel')) return 'bold';
  if (t.includes('reserved') || t.includes('diligent')) return 'steady';
  if (t.includes('greedy') || t.includes('gossip') || t.includes('ambitious')) return 'tricky';
  return 'swift';
}

// ---------- 입문 고르기 (달 끝 사건) ----------
import { EVENTS } from '../events/core.js';
const scName = (m) => (m.house ? m.houseName : SCHOOLS[m.school].name);
EVENTS.push({
  id: 'sword_join', once: true, noFlag: true, weight: 98,
  cond: (g) => !!g.swordJoinQueued && joinable(g).length > 0,
  title: '스승 찾기',
  text: (g) => {
    const ms = joinable(g);
    if (!ms.length) return '이곳에는 검을 가르쳐 줄 사람이 보이지 않는다.';
    const no = refusedHere(g).map((id) => `${SCHOOLS[id].name}의 사범은 ${SCHOOLS[id].from} 사람이 아니면 잘 받지 않는다. 몸을 더 만들어 오라고 했다.`);
    return '검을 가르쳐 줄 만한 사람들을 떠올려 본다.\n\n' + ms.map((m) => `${scName(m)}: ${m.who} ${m.name}. ${m.house ? `우리 집안이 세운 유파다. 뿌리는 ${SCHOOLS[m.school].name}.` : SCHOOLS[m.school].desc}`).join('\n\n')
      + (no.length ? `\n\n${no.join(' ')}` : '') + (rankOf(g) >= 0 ? `\n\n지금은 ${rankName(g)}이다. 유파를 옮기면 등급은 처음부터다.` : '');
  },
  choices: [0, 1, 2, 3, 4, 5].map((i) => ({
    label: (g) => { const m = joinable(g)[i]; return m ? `${scName(m)} (${m.who} ${m.name})` : ''; },
    show: (g) => !!joinable(g)[i],
    run: (g) => {
      g.swordJoinQueued = false; g.swordJoinAt = g.date.year * 12 + g.date.month;
      const m = joinable(g)[i];
      if (!m) return '스승을 찾지 못했다.';
      const s = swordState(g);
      s.school = m.school; s.rank = 0; s.master = m.id; s.house = !!m.house; s.masterName = m.name;
      const p = byId(g, m.id);
      if (p) { p.known = true; p.affection += 5; remember(g, p, '검을 배우겠다며 찾아왔다', 1, { tag: 'pupil' }); }
      if (m.house) return `${m.who}의 마루에 섰다. 벽에 걸린 목검 가운데 하나는 집안 어른이 쓰던 것이다. 그날부터 ${J(schoolName(g), '을/를')} 잇는 사람이다.`;
      return `${m.who} ${m.name} 앞에 무릎을 꿇었다. 그날부터 ${SCHOOLS[m.school].name}의 문하생이다. ${SCHOOLS[m.school].motto}`;
    },
  })).concat([{ label: '그만둔다', run: (g) => { g.swordJoinQueued = false; g.swordJoinAt = g.date.year * 12 + g.date.month; return '아직은 때가 아니라고 생각했다.'; } }]),
});
// ---------- 결투가 끝났을 때 ----------
registerDuelEnd('rank_test', (g, rng, won, d) => {
  const s = swordState(g);
  const p = byId(g, d.ctx.masterId);
  s.tests += 1;
  if (!won) { if (p) remember(g, p, '승급 대련에서 내게 졌다', 0, { tag: 'rank_test' }); return `"아직이다." ${J(d.foe.name, "이/가")} 목검을 거두었다. "하지만 지난번보다는 낫군."`; }
  s.rank = d.ctx.rank;
  if (p) { p.affection += 6; remember(g, p, `${RANKS[s.rank]} 승급을 인정받았다`, 1, { tag: 'rank_test' }); }
  g.chronicle.push({ y: g.date.year, m: g.date.month, text: `${g.player.name}, ${rankName(g)}에 오르다.`, rel: 100 });
  if (g.life) g.life.renown = (g.life.renown ?? 0) + [0, 2, 5, 15, 40][s.rank];
  return {
    1: `"숙련이다. 이제 칼을 쥐었다고 말해도 되겠군."`,
    2: `"상급. 이 고장에서 너를 이길 사람은 손에 꼽는다." 스승이 처음으로 술을 따라 주었다.`,
    3: `검이 울었다. 처음으로 마력이 칼날을 타고 흘렀다. 스승이 한참 말이 없다가 고개를 숙였다. "검성이다. 내가 가르칠 것은 끝났다." 이 소식은 왕도까지 퍼질 것이다.`,
    4: `대련이 끝났을 때 도장은 숨소리 하나 없었다. 검왕. 대륙에 몇 없는 이름 옆에 내 이름이 적혔다.`,
  }[s.rank];
});
registerDuelEnd('spar', (g, rng, won, d) => {
  const p = byId(g, d.ctx.id);
  if (p) { p.affection += won ? 2 : 3; remember(g, p, won ? '목검 대련에서 나를 이겼다' : '목검 대련에서 내게 졌다', 0, { tag: 'spar' }); }
  return won ? `${J(d.foe.name, "이/가")} 웃으며 손을 내밀었다. "한 판 더 하자고 하면 거절할 거다."` : `${J(d.foe.name, "이/가")} 목검으로 내 어깨를 툭 쳤다. "발이 늦어. 생각은 맞았는데."`;
});

// ---------- 저장 ----------
HOOKS.newGame.push((g) => { swordState(g); });
HOOKS.migrate.push((g) => {
  const s = swordState(g);
  // 1단계 사건에서 아버지에게 유수류를 배운 경우
  if (s.school == null && g.flags?.school === 'yusu') { s.school = 'yusu'; s.rank = 0; }
});
HOOKS.heir?.push((g) => { g.sword = { school: null, rank: -1, master: null, tests: 0 }; swordState(g); g.duel = null; g.duelQueued = null; });
// 1단계·2단계 사건에서 유파가 정해지면 따라간다
HOOKS.endOfMonth.push((g) => {
  const s = swordState(g);
  if (s.school == null && g.flags?.school === 'yusu') { s.school = 'yusu'; s.rank = 0; s.master = g.player.familyIds[0]; }
  if (g.swordJoinQueued && !joinable(g).length) g.swordJoinQueued = false;
});

// ---------- 마검사 (43단계) ----------
// 칼에 실을 주문: 내가 아는 전투 주문 가운데 서클이 가장 높은 것 (칼에 입히는 주문이면 그것부터). magic 쪽 주문 목록은 읽기만 한다.
import { knownSpells } from '../magic/spells.js';
export function bladeSpell(g) {
  const cs = knownSpells(g).filter((sp) => sp && sp.use === 'combat');
  if (!cs.length) return null;
  return cs.sort((a, b) => (/검|칼날/.test(b.name) - /검|칼날/.test(a.name)) || b.circle - a.circle)[0];
}
export const BLADE_WORDS = ['', '마검 입문', '마검사', '마검의 명인'];
export const AURA_WORDS = ['아직 없다', '칼날이 운다', '검기', '검기를 날린다'];
