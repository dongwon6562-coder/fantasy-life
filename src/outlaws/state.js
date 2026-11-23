// 37단계 무법 지대와 산적 무리 (도우미스레드3). 상태는 g.outlaws 하나.
//   도시 뒷골목 조직(crime·underworld)이 아니라 들판과 길 위: 숲과 고개의 산채, 두목과 무리, 길목 털기와 통행세, 의적, 토벌대와 현상금, 몸값.
//   bands: [{ id, lair(산채 고장 열쇠), name, chief, chiefSince, men, noble(의적), fame(이름 0~100), heat(영주의 눈 0~100), loot, toll, deal(마을과 거래), since, purgeAt, gone }]
//   past: [{ name, chief, lair, from, to, end }]  seenRv: 이미 센 꺾인 봉기 열쇠
//   me{ band(id|null), role('man'|'chief'|null), joined, rides, robbed, tolls, ransom, hunted, informed, gave, left, captive(null|{band, ransom, at}), huntAt, awayAt }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const outRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 389) ^ Math.imul(mi(g) * 211 + salt + 97, 2246822519)) | 0 });

// 산채가 설 수 있는 곳: 그 고장 가까운 숲과 고개, 그리고 무리가 노리는 길
export const LAIRS = {
  ern: { name: '검은솔 숲', road: ['ern', 'fur'], lord: '남부 대관', force: 40 },
  gruental: { name: '늑대 골짜기 옛 망루', road: ['gruental', 'verden'], lord: '그륀탈 영주관', force: 35 },
  verden: { name: '회색바위 고개', road: ['verden', 'graubel'], lord: '베르덴 백작', force: 65 },
  harfen: { name: '버드나무 여울 갈대숲', road: ['harfen', 'leocast'], lord: '하르펜 대관', force: 55 },
  klein: { name: '소금 늪 둑', road: ['klein', 'fr_fen'], lord: '클라인 항 세관장', force: 45 },
  leocast: { name: '왕의 숲 깊은 골', road: ['leocast', 'silverleaf'], lord: '왕실 순찰대', force: 80 },
  fur: { name: '남쪽 바위 언덕', road: ['fur', 'solaris'], lord: '부족 장로회', force: 45 },
  graubel: { name: '늑대 고개 아랫굴', road: ['graubel', 'fr_wolf'], lord: '변경 백작', force: 75 },
};
export const LAIR_IDS = Object.keys(LAIRS);
export const NICKS = ['외눈', '곰', '갈고리', '흉터', '붉은수염', '여우', '절름발이', '검은 두건', '늙은', '도끼'];
export const CHIEF_NAMES = ['하인츠', '바르톨', '루드거', '게오르크', '카스파', '이름가르트', '마그다', '오토', '빌헬름', '로자'];
export const BAND_WORDS = ['패', '무리', '일당'];
export const MAX_BANDS = 4;

export const menWord = (n) => (n >= 50 ? '작은 군대만 하다' : n >= 25 ? '수십 명이다' : n >= 12 ? '스무 명 남짓이다' : '열 명이 안 된다');
export const heatWord = (h) => (h >= 60 ? '토벌대가 꾸려진다는 말이 돈다' : h >= 40 ? '두목 목에 현상금이 붙었다' : h >= 20 ? '영주가 눈여겨본다' : '아직 아무도 쫓지 않는다');
export const bounty = (b) => Math.round(10 + b.men * 0.8 + b.fame * 0.4);
export const lairName = (b) => LAIRS[b.lair]?.name ?? '숲속 산채';
export const bandName = (b) => b.name;

const freshMe = () => ({ band: null, role: null, joined: 0, rides: 0, robbed: 0, tolls: 0, ransom: 0, hunted: 0, informed: 0, gave: 0, left: 0, captive: null, huntAt: -99, awayAt: 0 });
export const fresh = () => ({ seq: 1, bands: [], past: [], seenRv: [], war: false, me: freshMe(), log: [] });
export const OS = (g) => (g.outlaws ??= fresh());
export const liveBands = (g) => (g?.outlaws?.bands ?? []).filter((b) => !b.gone);
export const bandAt = (g, pl) => liveBands(g).find((b) => b.lair === pl) ?? null;
export const bandById = (g, id) => liveBands(g).find((b) => b.id === id) ?? null;
export const myBand = (g) => (g?.outlaws?.me?.band ? bandById(g, g.outlaws.me.band) : null);
// 이 길(두 고장 사이)을 노리는 무리
export function bandOnRoad(g, a, b) {
  return liveBands(g).find((x) => { const r = LAIRS[x.lair]?.road ?? []; return (r.includes(a) && r.includes(b)) || x.lair === a || x.lair === b; }) ?? null;
}
export function olog(g, text) {
  const S = OS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
// 그 고장이 얼마나 무법한가 (흉년·전쟁·분노·점령·마물): 무리가 서고 커지는 힘
export function lawless(g, pl) {
  let v = 8;
  if (g.world?.famine) v += 25;
  if (g.realm?.balhart?.war) v += 15;
  if ((g.realm?.monsters ?? 0) > 55) v += 8;
  v += (g.revolt?.anger?.[pl] ?? 10) * 0.3;
  if (g.occ?.places?.[pl]) v += 15;
  if (g.outlaws?.war === 'after') v += 10;
  return clamp(v, 0, 100);
}
export function newBand(g, lair, rng, { men, noble, chief } = {}) {
  const S = OS(g);
  const nick = rng.pick(NICKS), nm = chief ?? `${nick} ${rng.pick(CHIEF_NAMES)}`;
  const b = {
    id: S.seq++, lair, chief: nm, chiefSince: mi(g), name: `${nm} ${rng.pick(BAND_WORDS)}`,
    men: men ?? rng.int(5, 10), noble: noble ?? false, fame: 5, heat: 5, loot: 0, toll: false, deal: false, since: mi(g), purgeAt: null, gone: false,
  };
  S.bands.push(b);
  return b;
}
export function endBand(g, b, end) {
  const S = OS(g);
  b.gone = true;
  S.past.push({ name: b.name, chief: b.chief, lair: b.lair, from: Math.floor(b.since / 12), to: g.date.year, end, noble: b.noble });
  if (S.past.length > 12) S.past.shift();
  S.bands = S.bands.filter((x) => !x.gone);
  if (S.me.band === b.id) { S.me.band = null; S.me.role = null; }
}
export const endWord = (e) => ({ crushed: '토벌되었다', scattered: '흩어졌다', pardoned: '사면받고 군에 들어갔다', hunted: '두목이 현상금 사냥꾼 손에 죽고 흩어졌다', betrayed: '배신으로 무너졌다' }[e] ?? '사라졌다');
export const chiefLine = (b) => (b.name.startsWith(b.chief) ? b.name : `${J(b.chief, '이/가')} 이끄는 ${b.name}`);

function fill(g) {
  const S = OS(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  S.me = Object.assign(freshMe(), S.me ?? {});
}
HOOKS.newGame.push((g) => { g.outlaws = fresh(); });
HOOKS.migrate.push((g) => { fill(g); });
