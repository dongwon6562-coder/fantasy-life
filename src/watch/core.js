// 경비대와 치안 (49단계). 상태와 도우미.
// - 경비병 일자리('guard', jobs.js)는 그대로 쓰고, 이 갈래가 그 일을 경비대의 삶으로 넓힌다:
//   계급(경비병→조장→부대장→경비대장), 공(merit), 상관과 동료, 맡은 사건, 잡아넣은 사람과 그 원한, 뇌물과 눈감기.
// - 고장마다 치안(order 0~100)이 플레이어 없이도 오르내린다: 흉년·분노(revolt)·전쟁이 깎고, 경비대장의 방침이 바꾼다.
// - 범죄(crime)·법(law)은 읽기만 한다: 경비대원이 죄를 지어 기록에 남으면 쫓겨난다.
// 상태는 game.watch 하나:
//   rank 0~3, merit, since, unit(경비대 이름), place(복무하는 고장), boss { name, temper, since }, mates [{ name, trait, since, hurt }]
//   cases [{ id, kind, place, victim, suspects:[{name, role, why}], culprit(번호 또는 -1), clue, cleared:[], until, at }]
//   solved, wrong, cold, caught [{ name, crime, place, at, out, grudge, done }], bribes, refused, policy, order { 고장: 0~100 }
//   promoAt, evAt, firedAt, log
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { playerAge } from '../game.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.over;
export const adult = (g) => playerAge(g) >= 16;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 53) ^ Math.imul(mi(g) * 211 + salt + 97, 2654435761)) | 0 });
export const pick = (rng, a) => a[Math.floor(rng.next() * a.length)];

export const RANKS = ['경비병', '조장', '부대장', '경비대장'];
// 다음 계급에 오를 만한 공
export const NEED = [12, 32, 64];

// 고장마다 다른 경비대와 치안. base: 치안의 바탕, bribe: 뒷돈이 오가는 정도(0~1), harsh: 법이 매운 정도
// gate: 성문 이름, beat: 순찰 도는 곳들, trouble: 그 고장에 흔한 말썽
export const TOWNS = {
  ern: { unit: '마을 경비대', base: 70, bribe: 0.1, gate: '마을 어귀 나무 문', beat: ['방앗간 둑길', '장터 우물가', '예배당 뒷길'], trouble: ['brawl', 'thief', 'stray'] },
  harfen: { unit: '하르펜 경비대', base: 58, bribe: 0.35, gate: '하르펜 북문', beat: ['창고 거리', '대장간 골목', '여관 거리', '시장 광장'], trouble: ['thief', 'brawl', 'smuggle'] },
  verden: { unit: '백작령 위병', base: 62, bribe: 0.3, gate: '베르덴 다리 초소', beat: ['강변 부두', '백작 성 아래 거리', '포도주 창고'], trouble: ['brawl', 'thief', 'smuggle'] },
  leocast: { unit: '왕도 경비대', base: 55, bribe: 0.45, gate: '왕도 사자문', beat: ['귀족 거리', '빈민가 언저리', '대성당 앞 광장', '왕궁 담장 길'], trouble: ['thief', 'noble', 'brawl', 'smuggle'] },
  gruental: { unit: '그륀탈 순라꾼', base: 68, bribe: 0.15, gate: '둑방 다리', beat: ['둑방길', '물레방아 옆 길'], trouble: ['stray', 'brawl'] },
  eisen: { unit: '제도 헌병대', base: 66, bribe: 0.25, gate: '제도 철문', beat: ['공방 거리', '병영 앞 길', '황궁 바깥 광장', '제철소 담장'], trouble: ['brawl', 'thief', 'noble'], harsh: 1.3 },
  solaris: { unit: '성도 경비대', base: 72, bribe: 0.2, gate: '순례자의 문', beat: ['대성당 계단', '순례자 숙소 거리', '성물 장터'], trouble: ['thief', 'pilgrim', 'heresy'], harsh: 1.2 },
  serenia: { unit: '세레니아 시경', base: 64, bribe: 0.3, gate: '탑의 문', beat: ['마탑 아래 거리', '학원 골목', '마도구 장터'], trouble: ['thief', 'magic', 'brawl'] },
  barka: { unit: '바르카 시경', base: 48, bribe: 0.55, gate: '바르카 부두 관문', beat: ['부두 창고', '환전상 거리', '선원 주점 골목'], trouble: ['smuggle', 'brawl', 'thief'] },
  graubel: { unit: '성채 위병', base: 70, bribe: 0.2, gate: '그라우벨 성채 문', beat: ['성벽 위 통로', '병영 거리', '짐승 장터'], trouble: ['brawl', 'stray', 'smuggle'], harsh: 1.2 },
  klein: { unit: '클라인 항 순라꾼', base: 56, bribe: 0.4, gate: '항구 세관', beat: ['어시장', '부둣가 창고', '등대 길'], trouble: ['smuggle', 'brawl'] },
  portel: { unit: '포르텔 시경', base: 50, bribe: 0.5, gate: '포르텔 바닷문', beat: ['부두 거리', '상관 거리', '선원 주점 골목', '세관 창고'], trouble: ['smuggle', 'brawl', 'thief'] },
  saltmare: { unit: '살트마레 항구 감시대', base: 52, bribe: 0.45, gate: '살트마레 세관', beat: ['염전 둑', '부두', '소금 창고'], trouble: ['smuggle', 'brawl'] },
  rosen: { unit: '로젠탈 위병', base: 63, bribe: 0.3, gate: '장미문', beat: ['장미 시장', '성 아래 거리'], trouble: ['thief', 'brawl'] },
  roten: { unit: '로텐부르크 헌병', base: 64, bribe: 0.25, gate: '붉은 성문', beat: ['병영 거리', '장터'], trouble: ['brawl', 'thief'], harsh: 1.2 },
  stein: { unit: '군항 헌병', base: 68, bribe: 0.2, gate: '군항 초소', beat: ['조선소', '수병 막사 길', '부두'], trouble: ['brawl', 'smuggle'], harsh: 1.3 },
  krossen: { unit: '크로센 시경', base: 54, bribe: 0.45, gate: '크로센 상인문', beat: ['상단 거리', '여관 거리'], trouble: ['thief', 'smuggle', 'brawl'] },
  libera: { unit: '리베라 시민 순찰대', base: 52, bribe: 0.5, gate: '자유문', beat: ['시청 광장', '항구 거리', '상인 조합 앞'], trouble: ['thief', 'smuggle', 'brawl'] },
  abel: { unit: '아벨 순례길 감시대', base: 70, bribe: 0.15, gate: '순례길 초소', beat: ['순례자 여관 거리', '성지 언덕길'], trouble: ['pilgrim', 'thief'] },
  scholae: { unit: '깃펜거리 순라꾼', base: 66, bribe: 0.2, gate: '학원촌 어귀', beat: ['서점 골목', '학생 주점 거리'], trouble: ['brawl', 'thief'] },
};
export const WATCH_PLACES = Object.keys(TOWNS);
export const townOf = (pl) => TOWNS[pl] ?? null;
export const unitOf = (pl) => TOWNS[pl]?.unit ?? '경비대';

export const TEMPERS = {
  strict: { name: '깐깐한', say: '규정대로' },
  lazy: { name: '느긋한', say: '말썽만 없으면 된다' },
  crooked: { name: '뒷돈 챙기는', say: '눈치껏' },
  fair: { name: '공정한', say: '잡을 놈만 잡아라' },
};
export const TRAITS = ['입이 무거운', '술을 좋아하는', '겁이 많은', '주먹이 먼저 나가는', '셈이 빠른', '고향 이야기만 하는', '노름을 끊지 못한', '아이가 넷인'];
export const BOSS_NAMES = ['게르하르트', '오스발트', '루트비히', '브루노', '하겐', '마그다', '이름가르트', '베른하르트', '콘라트', '지크린데'];
export const MATE_NAMES = ['얀', '토비아스', '리나', '마르코', '페터', '로테', '디트마르', '울리케', '쿠르트', '한나', '파울', '엘케'];
export const THIEF_NAMES = ['쥐새끼 오토', '손이 빠른 리제', '외눈 클라우스', '꼬마 핀', '절름발이 게오르크', '검은 장갑 베른', '웃는 마틴', '빨간 머리 로자'];

export function fresh() {
  return {
    rank: 0, merit: 0, since: null, unit: null, place: null, boss: null, mates: [],
    cases: [], seq: 1, solved: 0, wrong: 0, cold: 0, caught: [], bribes: 0, refused: 0, skimmed: 0,
    policy: null, order: {}, promoAt: 0, evAt: 0, caseAt: 0, firedAt: 0, served: 0, rec0: 0, log: [],
  };
}
export const W = (g) => (g.watch ??= fresh());
export function logW(g, text) {
  const s = W(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export const isWatch = (g) => L(g).job?.id === 'guard';
export const onDuty = (g) => isWatch(g) && free(g) && L(g).job.place === here(g);
export const orderOf = (g, pl = here(g)) => W(g).order[pl] ?? townOf(pl)?.base ?? 60;
export const orderWord = (v) => (v >= 75 ? '밤길도 걱정 없다' : v >= 58 ? '대체로 조용하다' : v >= 42 ? '골목마다 말썽이 있다' : v >= 25 ? '해 지면 문을 걸어 잠근다' : '경비대도 손을 놓았다');
export const rankName = (g) => RANKS[clamp(W(g).rank, 0, 3)];
export const nextNeed = (g) => (W(g).rank < 3 ? NEED[W(g).rank] : null);
export const crooked = (g) => W(g).boss?.temper === 'crooked';

HOOKS.newGame.push((g) => { g.watch = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.watch) { g.watch = d; return; }
  for (const k of Object.keys(d)) if (g.watch[k] === undefined) g.watch[k] = d[k];
});
// 대를 이으면 경비대 계급과 사건은 남지 않는다. 고장의 치안만 남는다.
HOOKS.heir?.push((g) => { const o = W(g).order; g.watch = fresh(); g.watch.order = o; });
