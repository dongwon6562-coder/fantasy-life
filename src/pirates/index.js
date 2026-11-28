// 49단계 해적과 바다의 무법자. 화면 연결점: piratesInfo(g)(바다 정세·해적의 삶 한 장), piratesLine(g)(오늘의 장면 한 줄).
// 세상 흐름 world.js, 내 삶 life.js, 상태와 자료 state.js. 장면 앞머리 pi_. 까마귀단의 길(sea/pirates.js)과 계급을 함께 쓴다.
import { J } from '../narrative/text.js';
import { CRIMES } from '../crime.js';
import { addFact } from '../rumor/index.js';
import { KINDS as RUMOR } from '../rumor/facts.js';
import { seldom } from '../rumor/seldom.js';
import { PLACES } from '../places.js';
import { realmName } from '../realms/index.js';
import {
  PI, live, bandById, power, capName, mi, here, placeName, SEAS, SEA_IDS, seaOf, NAVY_NAME, CODES, ME_RANKS, myBandId, dangerWord, powerWord,
} from './state.js';
import { FEED } from './world.js';
import './life.js';

CRIMES.harboring ??= { name: '도망자 숨기기', heat: 12, sev: 2, noto: 1 };

/* ---------- 소문으로 ---------- */
const at = (d) => (PLACES[d.pl] ? d.pl : 'portel');
Object.assign(RUMOR, {
  pi_fall: {
    at, big: false,
    truth: (d) => (d.how === 'hanged' ? `${d.band ?? '해적단'}의 선장 ${J(d.cap ?? '아무개', '이/가')} 잡혀 목이 매달렸다고 한다.` : `${J(d.band ?? '해적단', '이/가')} 무너졌다고 한다.`),
    wrong: [(d) => `${d.band ?? '해적단'}의 선장은 교수대에서 밧줄을 끊고 바다로 뛰어들었다는 말이 돈다.`, (d) => `${J(d.band ?? '해적단', '이/가')} 해군에게 금고를 바치고 살아남았다는 말이 돈다.`],
  },
  pi_rise: {
    at, big: false,
    truth: (d) => `바다에 ${J(d.flag ?? '새 깃발', '을/를')} 단 ${J(d.band ?? '해적단', '이/가')} 나타났다고 한다.`,
    wrong: [(d) => `${d.band ?? '새 해적단'}의 선장은 몰락한 귀족 집안 사람이라는 말이 돈다.`, (d) => `${J(d.band ?? '새 해적단', '은/는')} 마족과 손잡았다는 말이 돈다.`],
  },
  pi_fleet: {
    at, big: false, official: true,
    truth: (d) => `${J(d.navy ?? '해군', '이/가')} ${J(d.band ?? '해적단', '을/를')} 잡으러 함대를 띄웠다고 한다.`,
    wrong: [(d) => `${d.navy ?? '해군'} 함장이 해적에게 뒷돈을 받고 일부러 엉뚱한 바다를 돈다는 말이 돈다.`],
  },
  pi_hoard: {
    at, big: false,
    truth: (d) => `누가 ${d.band ?? '해적'}의 보물을 파냈다고 한다.`,
    wrong: [(d) => `${d.band ?? '해적'}의 보물을 판 사람이 사흘 만에 미쳤다는 말이 돈다.`, () => '해골 섬에 아직 궤짝이 일곱 개 더 묻혀 있다는 말이 돈다.'],
  },
});
FEED.fact = (g, k, d) => addFact(g, k, d);

/* ---------- 화면용 ---------- */
const HOW = { hanged: '선장이 목이 매달렸다', fled: '흩어졌다', mutiny: '반란으로 갈라졌다', pardon: '사면을 받았다', sunk: '마지막 배를 잃었다' };
function crewRow(g, b) {
  return {
    id: b.id, name: b.name, captain: capName(b), flag: b.flag, sea: SEAS[b.sea]?.name ?? '', seaId: b.sea, lair: b.lair, ships: b.ships, men: b.men,
    since: b.born, power: power(b), word: b.fell ? `${b.fell.y}년에 ${HOW[b.fell.how] ?? '사라졌다'}` : powerWord(power(b)), code: CODES[b.code]?.name ?? '',
    letter: b.letter ? `${realmName(b.letter.realm)}의 사략선 (상대 ${realmName(b.letter.foe)})` : null,
    gone: !!b.fell, mine: b.id === myBandId(g),
  };
}
/** 화면 한 장: 바다 정세와 내 해적의 삶 */
export function piratesInfo(g) {
  if (!g?.pirates) return null;
  const P = PI(g), M = P.me, sea = g.sea ?? {}, pr = sea.pirate, b = bandById(g, myBandId(g));
  const routes = SEA_IDS.map((s) => ({ id: s, name: SEAS[s].name, danger: P.danger[s], word: dangerWord(P.danger[s]), ports: SEAS[s].ports.map(placeName), losses: Math.round(P.losses[s]) }));
  const hunt = P.fleets.filter((f) => f.left > 0).map((f) => ({ navy: NAVY_NAME[f.realm], sea: SEAS[f.sea].name, target: bandById(g, f.target)?.name ?? '', months: f.left, wins: f.wins }));
  const treasure = M.maps.map((m) => ({ isle: m.isle, pieces: m.pieces, near: placeName(m.near), word: m.pieces >= 3 ? '자리가 또렷하다' : m.pieces >= 2 ? '팔 만하다' : '조각이 모자라다' }));
  const life = {
    rank: pr ? ME_RANKS[pr.rank] ?? '' : M.retired ? '칼을 내려놓은 해적' : null,
    crew: pr ? b?.name ?? '까마귀단' : M.retired?.band ?? null,
    captain: pr && b ? (b.cap.me ? '나' : capName(b)) : null,
    code: pr && b ? CODES[b.code]?.text ?? '' : null,
    ship: sea.ship ? { name: sea.ship.name, hull: sea.ship.hull } : null,
    share: pr ? pr.share : 0, raids: pr ? pr.raids : 0,
    standing: pr ? M.standing : null,
    bounty: Math.round(sea.hunted ?? 0),
    letter: M.letter ? { realm: realmName(M.letter.realm), foe: realmName(M.letter.foe), taken: M.letter.taken, months: Math.max(0, M.letter.until - mi(g)) } : null,
    treasure, taken: M.taken, hunts: M.hunts,
    ancestor: M.ancestor ? `선대가 ${M.ancestor.band}의 해적이었다` : null,
    log: M.log.slice(-8).reverse(),
  };
  const s = seaOf(here(g));
  return {
    line: piratesLine(g),
    crews: [...live(g), ...P.bands.filter((x) => x.fell).slice(-4)].map((x) => crewRow(g, x)),
    routes, hunt, here: s ? SEAS[s].name : null,
    me: life, life,
    retired: P.retired.slice(-5).map((r) => ({ name: `'${r.nick}' ${r.name}`, band: r.band, place: placeName(r.place), cap: !!r.cap })),
    hoards: P.hoards.filter((h) => !h.dug).length,
    news: P.log.slice(-8).reverse(),
    tally: { ...P.tally },
  };
}
/** 오늘의 장면 한 줄 (바다 고장에서만, 같은 말은 몇 해에 한 번) */
export function piratesLine(g) {
  if (!g?.pirates || !g.date || !g.life || g.life.travel) return null;
  const pl = here(g), s = seaOf(pl);
  if (!s) return null;
  const P = PI(g);
  const f = P.fleets.find((x) => x.sea === s && x.left > 0);
  if (f && pl === SEAS[s].board && seldom(g, `pi:fleet:${f.id}`, 12)) return `부두에 ${NAVY_NAME[f.realm]}의 배들이 대포를 닦는다. 모집관이 "${bandById(g, f.target)?.name ?? '해적'} 사냥에 탈 사람"을 외친다.`;
  const fell = P.bands.find((b) => b.fell && b.fell.how === 'hanged' && b.fell.y === g.date.year && b.sea === s);
  if (fell && seldom(g, `pi:hang:${fell.id}`, 24)) return `부두 끝 교수대에 아직 밧줄이 걸려 있다. ${fell.name}의 선장이 거기 매달렸었다.`;
  if (P.danger[s] >= 55 && seldom(g, `pi:danger:${s}`, 18)) return `상인들이 호위선을 구하느라 부두를 뛰어다닌다. 요즘 ${SEAS[s].name}에 검은 돛이 너무 많다고 한다.`;
  const b = live(g).find((x) => x.lairAt === pl);
  if (b && seldom(g, `pi:lair:${b.id}`, 24)) return `${J(b.flag, '이/가')} 걸린 돛대가 항구를 굽어본다. 여기서는 ${b.name}의 선장 ${J(capName(b), '이/가')} 법이다.`;
  return null;
}
