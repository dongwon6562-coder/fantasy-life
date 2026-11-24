// 41단계 하늘의 별과 점성술사 (도우미스레드3). 상태는 g.stars 하나.
//   예언과 징조(omen)는 '하늘이 무엇을 뜻하나'를 맡는다. 여기는 '하늘을 보는 일과 학문': 천문대와 별 읽는 학자, 하늘 사건(혜성·일식·별똥비·새 별·행성 겹침·북쪽 빛),
//   교단·궁정·백성·학자가 같은 하늘을 저마다 다르게 읽는 일, 달력 고치기 다툼, 별점 장사와 사기, 항해에 쓰는 별, 시대 따라 망원경.
//   망원경은 techtree(history.inventions의 lens·spyglass)를 읽기만 한다. 앞당기지 않는다.
//   obs{ id: { head(학자 이름), since, fame(0~100), glass(망원경), found[] } }
//   sky[{ id, kind, at, until, told(예고한 천문대 id|null), heard }]  next{ eclipse: 달, comet: 달 }
//   cal{ drift(날), dispute: null|{ at, side{ reform, church }, by }, reforms, last }
//   me{ lore(0~100), known(별자리 수), role('none'|'student'|'astronomer'|'court'), obs(천문대 id), charts, sold, reads, cheats, caught, predicted, right, wrong, navs, sawn[] }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const stRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 613) ^ Math.imul(mi(g) * 151 + salt + 43, 2654435761)) | 0 });
const done = (g, id) => (g.history?.inventions ?? []).includes(id);
export const hasLens = (g) => done(g, 'lens');
export const hasGlass = (g) => done(g, 'spyglass');

// 천문대: 고장, 이름, 누가 세웠나(읽는 쪽), 처음 학자
export const OBS = {
  leocast: { name: '왕실 천문대', by: 'court', place: 'leocast', head: '궁정 천문관 아달베르트' },
  serenia: { name: '마탑 별 탑', by: 'scholars', place: 'serenia', head: '별 읽는 마법사 이졸데' },
  solaris: { name: '성당 종탑 관측소', by: 'church', place: 'solaris', head: '역법 사제 클레멘스' },
  portel: { name: '항해 학교 옥상', by: 'sea', place: 'portel', head: '늙은 항해사 오스빈' },
};
export const OBS_IDS = Object.keys(OBS).filter((k) => PLACES[OBS[k].place]);
export const HEADS = ['아달베르트', '이졸데', '클레멘스', '오스빈', '마르가레테', '루트비히', '베아트릭스', '콘라트', '힐데가르트', '요하네스', '게르트루트', '바르나바스'];
export const TITLE = { court: '궁정 천문관', scholars: '별 읽는 마법사', church: '역법 사제', sea: '항해사' };

// 하늘 사건: 얼마나 자주(달마다 확률), 얼마나 가나(달), 이름
export const SKY = {
  comet: { name: '꼬리별', p: 1 / 180, len: 3 },
  eclipse: { name: '일식', p: 0, len: 1 },           // 일식은 next.eclipse에 맞춰 온다 (예고할 수 있다)
  shower: { name: '큰 별똥비', p: 1 / 150, len: 1 },
  nova: { name: '새 별', p: 1 / 900, len: 10 },
  conj: { name: '행성 겹침', p: 1 / 240, len: 2 },
  aurora: { name: '북쪽 빛', p: 1 / 200, len: 1 },
};
export const CONSTELLATIONS = ['쟁기 별', '사냥꾼', '일곱 자매', '용사의 검', '왕관', '물병', '외눈 늑대', '배의 돛', '저울', '불새', '마신의 사슬', '노아의 등불'];
export const loreWord = (v) => (v >= 80 ? '하늘을 손바닥 보듯 읽는다' : v >= 55 ? '별의 길을 셈할 줄 안다' : v >= 30 ? '별자리와 행성을 가린다' : v >= 10 ? '별자리 몇을 안다' : '하늘이 그저 아름답다');
export const ROLE_NAME = { none: '', student: '천문대 견습생', astronomer: '별 읽는 학자', court: '궁정 점성술사' };

const freshMe = () => ({ lore: 0, known: 0, role: 'none', obs: null, charts: 0, sold: 0, reads: 0, cheats: 0, caught: 0, predicted: null, right: 0, wrong: 0, navs: 0, sawn: [], since: 0 });
export function fresh() {
  return {
    seq: 1,
    obs: Object.fromEntries(OBS_IDS.map((k) => [k, { head: OBS[k].head, since: 0, fame: 30, glass: false, found: [] }])),
    sky: [], past: [], next: { eclipse: null },
    cal: { drift: 4, dispute: null, reforms: 0, last: null },
    me: freshMe(), log: [],
  };
}
export const SS = (g) => (g.stars ??= fresh());
export const activeSky = (g) => (g?.stars?.sky ?? []).filter((s) => s.until >= mi(g));
export function slog(g, text) {
  const S = SS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
export const obsHere = (pl) => OBS_IDS.find((k) => OBS[k].place === pl) ?? null;

function fill(g) {
  const S = SS(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  for (const k of OBS_IDS) S.obs[k] ??= f.obs[k];
  S.cal = Object.assign(f.cal, S.cal ?? {});
  S.me = Object.assign(freshMe(), S.me ?? {});
}
HOOKS.newGame.push((g) => { g.stars = fresh(); });
HOOKS.migrate.push((g) => { fill(g); });
