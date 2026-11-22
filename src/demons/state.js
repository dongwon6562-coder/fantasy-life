// 33단계 마족 (도우미스레드3). 상태는 g.demons 하나.
//   봉인 뒤 오백 년, 마대륙에는 세 마왕이 땅을 나눠 가졌다. 얼음 해협 하나를 사이에 두고 북부 변경과 맞닿아 있다.
//   마족은 짐승이 아니다. 말을 하고, 셈을 하고, 서열을 지키고, 거래하고, 배신한다. 사람과 닮아서 더 낯설다.
//   마신교 신도들이 마신을 섬긴다고 해서 마족이 그들을 섬기지는 않는다. 마왕들 사이에서도 마신이 돌아오기를 바라는 쪽과 아닌 쪽이 갈린다.
//
//   raid: 북부 국경을 넘는 습격의 기세 0~100 (가르베스의 굶주림·봉인의 힘·북부 전쟁·겨울 해협이 밀어 올린다)
//   truce: null | { until, by }   contact: null | { name, trust 0~100, met, deals, gone }   tradeAt
//   blood: { line(집안에 마족 피가 흐르나, 플레이어는 모를 수 있다), shown(이 몸에 드러났나), known 0~3(남이 아는 정도), hunted(쫓기는 달), at }
//   me{ trades, truces, raids, freed, trips, sawBone, coffin, reported, sheltered, extorted, betrayed }   log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { L } from '../adventure/core.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const here = (g) => (g.life ? L(g).place ?? 'ern' : 'ern');
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const demonRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 661) ^ Math.imul(mi(g) * 139 + salt + 41, 2654435761)) | 0 });

// 세 마왕 (지도와 같은 이름). stance: 마신이 돌아오는 일을 어떻게 보나
export const LORDS = {
  red: { name: '가르베스', land: '붉은 마왕령', title: '붉은 마왕', stance: '봉인이 깨지기를 기다린다. 마신이 돌아오면 그 발밑에서 가장 먼저 남쪽으로 내려올 자다.', rank: '십강 3위' },
  dusk: { name: '엘리노어', land: '황혼의 마왕령', title: '황혼의 여마왕', stance: '마신이 돌아오지 않기를 바란다. 왕좌가 셋이면 그중 하나는 그녀의 것이지만, 마신이 돌아오면 왕좌는 하나뿐이다.', rank: '십강 5위' },
  silent: { name: '이름 모를 마왕', land: '침묵의 마왕령', title: '침묵의 마왕', stance: '아무도 모른다. 들어간 사람이 돌아오지 않았다.', rank: '알 수 없음' },
};
// 마족의 서열 (위에서 아래로)
export const RANKS = ['마왕', '대공', '백인장', '이름 있는 마족', '이름 없는 것들'];
// 북부 변경에서 마족과 맞닿는 고장
export const NORTH = ['graubel', 'fr_wolf', 'fr_ash'];
// 말이 통하는 마족이 숨어드는 항구
export const PORTS = ['graubel', 'portel', 'barka'];
// 해협 너머 갈 수 있는 곳 (지도에 있는 이름)
export const DESTS = {
  post: { name: '황혼 교역소', land: 'dusk', months: 3, text: '엘리노어가 허락한 교역소. 검은 돌로 쌓은 부두에 사람 배 셋과 마족 배 하나가 나란히 묶여 있다. 마족 세관원이 짐을 셀 때 숫자를 사람 말로 센다. 사람보다 정확하다.' },
  bone: { name: '뼈 언덕', land: 'red', months: 3, text: '하급 마족들이 모여 사는 마을. 짐승 뼈로 엮은 울타리 안에서 아이 마족들이 돌을 던지며 논다. 늙은 마족이 문간에 앉아 무언가를 꿰맨다. 사람 마을과 너무 닮아서 오래 보고 있기 힘들다.' },
  chain: { name: '사슬 거리', land: 'red', months: 4, text: '포로로 잡힌 사람을 사고파는 거리. 쇠사슬 소리가 바람 소리보다 크다. 우리 안의 사람들은 북부 말을 쓴다. 칼텐, 늑대 고개, 그라우벨 바깥 마을 사람들이다.' },
  coffin: { name: '마신의 관', land: 'center', months: 5, text: '용사 일행이 마신을 봉인한 검은 분화구. 세 마왕 누구도 가까이 오지 않는다. 분화구 가장자리의 돌들이 모두 안쪽으로 기울어 있다. 바닥 쪽에서 붉은빛이 숨 쉬듯 밝아졌다 어두워진다.' },
  stone: { name: '침묵의 경계비', land: 'silent', months: 4, text: '여기서부터 침묵의 마왕령이라고 새긴 거대한 비석. 글자는 사람 말, 마족 말, 그리고 아무도 모르는 글로 세 번 쓰였다. 비석 너머 잿빛 평원에는 발자국이 없다. 바람도 소리를 내지 않는다.' },
};
export const DEST_IDS = Object.keys(DESTS);
export const CONTACT_NAMES = ['사로스', '이벨린', '모르칸', '세야'];

const freshMe = () => ({ trades: 0, truces: 0, raids: 0, freed: 0, trips: 0, sawBone: 0, coffin: 0, reported: 0, sheltered: 0, extorted: 0, betrayed: 0 });
const freshBlood = () => ({ line: 0, shown: false, known: 0, hunted: 0, at: 0 });
export const fresh = () => ({ raid: 25, raids: 0, truce: null, contact: null, tradeAt: -99, blood: freshBlood(), me: freshMe(), log: [], lastRaid: -99 });
export const DM = (g) => (g.demons ??= fresh());
export function dlog(g, text) {
  const D = DM(g);
  D.log.push({ y: g.date.year, m: g.date.month, text });
  if (D.log.length > 30) D.log.splice(0, D.log.length - 30);
}
export function fill(g) {
  const D = DM(g), f = fresh();
  for (const k of Object.keys(f)) D[k] ??= f[k];
  D.me = Object.assign(freshMe(), D.me ?? {});
  D.blood = Object.assign(freshBlood(), D.blood ?? {});
  if (!Number.isFinite(D.raid)) D.raid = 25;
}
// 집안 핏줄: 오래전 누군가 해협을 건너왔다. 드물게, 플레이어는 모른 채 태어난다
HOOKS.newGame.push((g) => {
  g.demons = fresh();
  if (makeRng({ s: ((g.rngState?.s ?? 5) ^ 0x5d3a) | 0 }).chance(0.03)) g.demons.blood.line = 1;
});
HOOKS.migrate.push((g) => fill(g));
