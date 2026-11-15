// 봉인의 흔들림: 마신을 묶은 봉인이 수십 년에 걸쳐 흔들린다. 상태는 g.seal 하나, 봉인의 힘은 world.js의 g.realm.seal(0~100).
//   wedges{id: 'whole'|'stolen'|'broken'}  봉인을 떠받치는 쐐기들
//   spies: 숨어든 마족 첩자(0~12)  cult: 마신교·검은 새벽의 세(0~100)
//   stance{church, tower, crown, empire}: 교단·마탑·레오니아 왕실·발하르트가 지금 어떻게 대응하나
//   study: 마탑이 모은 조사(보강 술식의 힘)  stage: 지금 단계(0~6)  known: 플레이어가 아는 정도(0~3)
//   ending: null | 'broken'(봉인이 깨졌다) | 'resealed'(새로 묶였다)  endedAt  rite: 마지막 큰 의식을 치렀나
//   me{guard, exploit, pact, fragments, studied, wedgeSaved, wedgeSold}  플레이어가 걸어온 길
//   log[{y,m,text}] 봉인에 얽힌 큰일
import { HOOKS } from '../hooks.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 봉인을 떠받치는 쐐기: 어디에 있고, 누가 지키나 (place가 PLACES에 있는 곳만 플레이어가 직접 간다)
export const WEDGES = {
  leocast: { name: '왕도 대성당 지하의 성녀 유골함', place: 'leocast', keeper: '교단' },
  solaris: { name: '성도 대성당의 빛의 창', place: 'solaris', keeper: '이단심문소' },
  serenia: { name: '세레니아 마탑 지하의 봉인 술식판', place: 'serenia', keeper: '마도사 협회' },
  hammer: { name: '드워프 대장간 바닥의 쇠사슬 쐐기', place: 'hammer', keeper: '드워프 장인 길드' },
  silverleaf: { name: '세계수 뿌리에 묶인 매듭', place: 'silverleaf', keeper: '엘프 파수꾼' },
  noah: { name: '노아의 감시탑 꼭대기의 불', place: null, keeper: '노아' },
};
export const WEDGE_IDS = Object.keys(WEDGES);

// 단계: 봉인의 힘이 이 아래로 내려가면 다음 단계
export const STAGES = [
  { at: 101, name: '고요', desc: '봉인은 오백 년째 그대로다. 적어도 사람들은 그렇게 믿는다.' },
  { at: 88, name: '조짐', desc: '이상한 꿈을 꾸는 사람이 늘었다. 북쪽 하늘의 별빛이 가끔 흔들린다.' },
  { at: 74, name: '금', desc: '세레니아의 조사단이 마신의 관 둘레 봉인석에서 머리카락 같은 금을 보았다.' },
  { at: 60, name: '스며듦', desc: '마물이 늘고, 그림자가 없는 낯선 이들이 도시에 섞여 든다.' },
  { at: 45, name: '흔들림', desc: '마왕령의 군세가 움직인다. 교단과 마탑과 왕국이 서로를 탓한다.' },
  { at: 28, name: '벼랑', desc: '봉인석의 금이 손가락만큼 벌어졌다. 밤마다 땅 밑에서 숨소리 같은 울림이 올라온다.' },
  { at: 12, name: '마지막 고리', desc: '마신의 목소리가 꿈에 들린다는 사람이 셀 수 없다. 봉인은 실 한 가닥으로 버틴다.' },
];
export const stageOf = (seal) => { let s = 0; for (let i = 0; i < STAGES.length; i++) if (seal < STAGES[i].at) s = i; return s; };

export const SS = (g) => (g.seal ??= fresh());
export function fresh() {
  const wedges = {};
  for (const id of WEDGE_IDS) wedges[id] = 'whole';
  return {
    wedges, spies: 0, cult: 18, study: 0, stage: 0, known: 0, ending: null, endedAt: null, rite: false,
    stance: { church: 'deny', tower: 'observe', crown: 'deny', empire: 'exploit' },
    me: { guard: 0, exploit: 0, pact: false, fragments: 0, studied: 0, wedgeSaved: 0, wedgeSold: 0 },
    log: [], chronAt: 0,
  };
}
export const sealPower = (g) => g.realm?.seal ?? 100;
// 노아의 쐐기는 감시탑의 불(g.realm.noahLight)이 꺼져 있으면 비어 있는 셈이다
export const wedgeState = (g, id) => (id === 'noah' ? (g.realm?.noahLight ? 'whole' : 'dark') : SS(g).wedges[id] ?? 'whole');
export const brokenWedges = (g) => WEDGE_IDS.filter((id) => wedgeState(g, id) !== 'whole');
export function slog(g, text) {
  const S = SS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
// 플레이어가 아는 정도를 올린다 (내려가지 않는다)
export const learn = (g, n) => { const S = SS(g); S.known = Math.max(S.known, n); };

HOOKS.newGame.push((g) => { g.seal = fresh(); });
HOOKS.migrate.push((g) => {
  const S = SS(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  for (const k of Object.keys(f.wedges)) S.wedges[k] ??= 'whole';
  for (const k of Object.keys(f.stance)) S.stance[k] ??= f.stance[k];
  for (const k of Object.keys(f.me)) S.me[k] ??= f.me[k];
});
