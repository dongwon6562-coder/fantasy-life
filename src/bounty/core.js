// 현상금 사냥꾼 (50단계 도우미4). 상태와 자료.
// - 쫓기는 쪽(crime.js의 현상금, 산적·해적·탈옥수)은 이미 있다. 여기서는 쫓는 쪽의 삶:
//   현상금 사냥꾼 조합에 이름 올리기, 게시판의 방, 고장을 건너며 흔적 쫓기, 산 채로 잡을지 죽일지, 엉뚱한 사람을 잡는 실수,
//   조합 등급(견습→쇠 패→은 패→검은 패), 내가 잡은 사람의 식구와 원한, 경쟁 사냥꾼.
// - 산적(outlaws)·해적(pirates)·옥살이(prison)·죄(crime)는 읽기만 한다. 방에 오르는 이름을 그쪽에서 빌려 온다.
// - 플레이어 없이도 조합의 방이 붙고, 숨은 자가 고장을 옮기고, 경쟁 사냥꾼이 방을 떼어 간다.
// 상태는 game.bounty 하나:
//   seq, posts [{ id, kind, name, pid(진짜 사람이면 id), crime, hall, loc, reward, pow, dead(죽여도 받는가), wrong(엉뚱한 사람이 숨은 자리에 있나),
//                 story, kin{name, rel}, at, until, by(null|'me'|경쟁자 id), end(null|caught|killed|gone|cold|wrong|freed|rival), moved, trail[{place, text}] }
//   rivals [{ id, name, nick, rank, caught, style, since, gone }]
//   me { member, rank, pts, joinedAt, hunt(post id), clue, known, caught, killed, wrong, freed, bribed, rivalAt, kinAt, boardAt, lastAt }
//   kin [{ name, rel, of, how, at, done }]   log [{ y, m, text }]
import { HOOKS } from '../hooks.js';
import { PLACES, travelMonths } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed, crimeState } from '../crime.js';
import { makeRng } from '../rng.js';
import { playerAge } from '../game.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place ?? 'ern';
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const pick = (rng, a) => a[Math.floor(rng.next() * a.length)];
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 71) ^ Math.imul(mi(g) * 199 + salt + 131, 2654435761)) | 0 });
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.over && !L(g).heirPending;
export const grown = (g) => playerAge(g) >= 18;

/* ---------- 조합 ---------- */
export const RANKS = ['견습 사냥꾼', '쇠 패', '은 패', '검은 패'];
// 다음 등급에 필요한 이름값(pts)
export const NEED = [6, 18, 40];
export const rankName = (g) => RANKS[B(g).me.rank] ?? RANKS[0];
// 조합 지부가 있는 고장과 그 집 이름
export const HALLS = {
  harfen: '하르펜 방앗간 뒤 조합 지부',
  leocast: '왕도 사자문 밖 사냥꾼 회관',
  eisen: '제도 철문 옆 추적꾼 조합',
  verden: '베르덴 다리 아래 조합 창구',
  barka: '바르카 부두 창고 이층 조합',
  portel: '포르텔 바닷문 옆 사냥꾼 회관',
  libera: '리베라 시청 뒤 현상금 창구',
  krossen: '크로센 상인문 조합 지부',
  graubel: '그라우벨 성채 아래 추적꾼 막사',
  klein: '클라인 세관 옆 조합 창구',
};
export const HALL_IDS = Object.keys(HALLS);
export const hallAt = (pl) => HALLS[pl] ?? null;
// 숨은 자가 몸을 숨길 만한 고장 (사람 사는 큰 고장들)
export const HIDE = ['ern', 'harfen', 'verden', 'leocast', 'gruental', 'eisen', 'solaris', 'barka', 'graubel', 'klein', 'portel', 'rosen', 'roten', 'stein', 'krossen', 'libera', 'abel', 'milles', 'kalten'].filter((k) => PLACES[k]);
// 그 고장에서 멀지 않은 숨을 곳들 (가까운 순)
export function hideNear(pl, max = 2) {
  const out = HIDE.filter((k) => k !== pl).map((k) => [k, travelMonths(pl, k)]).filter(([, m]) => m <= max).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  return out.length ? out : HIDE.filter((k) => k !== pl).slice(0, 4);
}

/* ---------- 방에 오르는 사람들 ---------- */
// pow: 잡기 어려운 정도, pay: 상금 바탕, dead: 죽여도 상금을 주는가, wrong: 숨은 자리에 엉뚱한 사람이 있을 가능성
export const KINDS = {
  escapee: { name: '탈옥수', pow: 22, pay: 24, dead: false, wrong: 0.15, crimes: ['감옥 담을 넘었다', '호송 마차에서 달아났다', '채석장 노역에서 사라졌다'] },
  outlaw: { name: '산적', pow: 34, pay: 36, dead: true, wrong: 0.1, crimes: ['길목에서 상단을 털었다', '역참을 불태웠다', '세금 수레를 덮쳤다'] },
  pirate: { name: '해적', pow: 36, pay: 40, dead: true, wrong: 0.1, crimes: ['상선을 털고 선원을 바다에 던졌다', '세관 배를 불태웠다', '사략 허가 없이 남의 배를 덮쳤다'] },
  debtor: { name: '빚을 떼먹은 자', pow: 12, pay: 16, dead: false, wrong: 0.12, crimes: ['상단 돈을 들고 달아났다', '은행가의 빚을 지고 야반도주했다', '조합 금고를 비우고 사라졌다'] },
  killer: { name: '살인자', pow: 30, pay: 44, dead: true, wrong: 0.2, crimes: ['주점에서 사람을 찔렀다', '주인을 해치고 금고를 털었다', '밤길에 행상을 해쳤다'] },
  witch: { name: '마녀로 고발된 자', pow: 14, pay: 26, dead: false, wrong: 0.4, crimes: ['우물에 저주를 걸었다는 고발을 받았다', '이웃 소를 말려 죽였다는 고발을 받았다', '흉년을 불렀다는 고발을 받았다'] },
};
export const KIND_IDS = Object.keys(KINDS);
export const NAMES_M = ['한스', '디터', '오토', '루카스', '프리츠', '게오르크', '울리히', '카스파', '베른트', '얀', '토마스', '헤르만', '쿠르트', '마티아스', '라인하르트', '지몬', '바르톨', '에발트', '콘라트', '페터'];
export const NAMES_F = ['마르타', '그레타', '안나', '리제', '도로테아', '엘제', '힐데', '카타리나', '로자', '베르타', '이르마', '프리다', '오틸리에', '게르다', '알마', '루이제'];
export const NICKS = ['외눈', '붉은 손', '여우', '쥐새끼', '절름발이', '갈고리', '흉터', '잿빛', '두 얼굴', '늙은', '검은 이', '곰보', '여윈', '칼자국', '말더듬이', '대머리', '빨간 머리', '외팔이', '까마귀', '굽은 등'];
// 놓아줄지 망설이게 하는 사정
export const STORY = {
  escapee: ['감옥에서 앓는 딸 소식을 듣고 담을 넘었다고 한다.', '훔친 것은 빵 두 덩이였다. 형기가 다섯 해였다.', '감방에서 맞아 죽기 싫었다고 한다.'],
  outlaw: ['흉년에 마을을 떠나 숲에 들었다. 처음 털었던 건 영주의 곡식 수레였다.', '빚 때문에 땅을 잃고 산에 올랐다.'],
  pirate: ['어릴 적 끌려가 배에서 자랐다. 바다 말고 아는 게 없다.', '해군에서 도망친 수병이었다.'],
  debtor: ['장사가 망했다. 식구를 먹이려고 남은 은화를 들고 떠났다.', '빚쟁이가 아이를 데려가겠다고 했다고 한다.'],
  killer: ['술자리 시비 끝에 칼이 먼저 나갔다고 한다. 죽은 쪽도 칼을 들고 있었다.', '딸을 건드린 자를 찔렀다고 한다.'],
  witch: ['약초를 달여 마을 아이들 열을 내리던 노파다. 흉년이 들자 이웃들이 돌변했다.', '산파였다. 아이 하나가 죽자 마녀라는 말이 돌았다.', '혼자 사는 과부였다. 땅을 노린 친척이 고발했다는 말도 있다.'],
};
export const KIN_REL = { m: ['아내', '아들', '동생', '늙은 어머니'], f: ['남편', '딸', '오라비', '늙은 아버지'] };

/* ---------- 경쟁 사냥꾼 ---------- */
export const RIVAL_POOL = [
  { name: '오스카', nick: '쇠사슬', style: 'brute' }, { name: '레나', nick: '매눈', style: 'sly' }, { name: '바르톨', nick: '늙은 개', style: 'patient' },
  { name: '이다', nick: '석궁', style: 'sly' }, { name: '구스타프', nick: '곰 가죽', style: 'brute' }, { name: '마티아스', nick: '말 없는', style: 'patient' },
];
export const STYLE = {
  brute: { name: '주먹부터 나가는', fast: 0.5 },
  sly: { name: '눈치 빠른', fast: 0.7 },
  patient: { name: '끈질긴', fast: 0.6 },
};
export const rivalName = (r) => `${r.nick} ${r.name}`;

/* ---------- 상태 ---------- */
const freshMe = () => ({ member: false, rank: 0, pts: 0, joinedAt: null, hunt: null, clue: 0, known: false, caught: 0, killed: 0, wrong: 0, freed: 0, bribed: 0, earned: 0, rivalAt: -99, kinAt: -99, boardAt: -99, lastAt: -99, quitAt: null });
export const fresh = () => ({ seq: 1, posts: [], rivals: [], me: freshMe(), kin: [], log: [], taken: [], made: 0, done: 0 });
export const B = (g) => (g.bounty ??= fresh());
export function blog(g, text) {
  const s = B(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export const isMember = (g) => !!B(g).me.member;
export const huntOf = (g) => { const s = B(g); return s.me.hunt != null ? s.posts.find((p) => p.id === s.me.hunt && !p.end) ?? null : null; };
export const openPosts = (g, hall) => B(g).posts.filter((p) => !p.end && !p.by && (!hall || p.hall === hall));
export const livePosts = (g) => B(g).posts.filter((p) => !p.end);
// 내 목에도 현상금이 걸려 있나 (조합은 그런 사람을 받지 않는다)
export const wanted = (g) => !!crimeState(g).jailed || Object.values(crimeState(g).bounty ?? {}).some((v) => (+v || 0) > 0);
export function trailPush(p, place, text) {
  p.trail ??= [];
  p.trail.push({ place, text });
  if (p.trail.length > 6) p.trail.shift();
}
export const reward = (p, alive = true) => Math.round(alive ? p.reward : p.reward * 0.6);

HOOKS.newGame.push((g) => { B(g); });
HOOKS.migrate.push((g) => {
  const s = B(g);
  s.me = { ...freshMe(), ...(s.me ?? {}) };
  s.posts ??= []; s.rivals ??= []; s.kin ??= []; s.log ??= []; s.taken ??= [];
});
// 대를 이으면 조합 패와 맡은 방은 남지 않는다. 원한은 선대의 일이라 거의 식고, 경쟁 사냥꾼과 방은 세상에 남는다.
HOOKS.heir.push((g) => {
  const s = B(g);
  const h = huntOf(g); if (h) h.by = null;
  s.me = freshMe();
  for (const k of s.kin) if (!k.done && k.how !== 'killed') k.done = true;
});
