// 13단계: 하늘과 땅의 재앙과 계절. 고장마다 오는 가뭄·홍수·혹한·지진·메뚜기 떼·큰 폭풍, 그해 소출과 흉년,
// 철마다 다른 살림(파종·둑·가을걷이·겨울나기). 화면용: natureInfo(g), natureLine(g).
import { NS, REGIONS, REGION_IDS, KINDS, SEASON, SEASON_NAME, regionOf, winterOf, cropWord, activeAt } from './state.js';
import './world.js';
import './life.js';
import './events.js';
import { L } from '../adventure/core.js';
export { startDisaster } from './world.js';
export { winterCost } from './life.js';
export { REGIONS, KINDS, regionOf };
export const natureState = NS;

const SEV_WORD = (s) => (s >= 0.7 ? '크다' : s >= 0.45 ? '심하다' : '가볍다');
const SKY = {
  winter: ['눈이 내린다', '얼음장 같은 바람이 분다', '하늘이 낮게 내려앉았다'],
  spring: ['보리밭에 새싹이 올라온다', '진흙 길이 마르기 시작했다', '들판에 씨 뿌리는 사람들이 보인다'],
  summer: ['뙤약볕이 내리쬔다', '장마 구름이 몰려온다', '밤에도 땅이 식지 않는다'],
  autumn: ['들판이 누렇게 익었다', '낫 가는 소리가 난다', '첫서리가 내렸다'],
};

export function natureInfo(g) {
  const N = NS(g);
  const place = L(g).place;
  const season = SEASON(g.date.month);
  const here = activeAt(g, place);
  const sky = here.length ? KINDS[here[0].kind].desc : SKY[season][(g.date.year + g.date.month) % 3];
  return {
    season, seasonName: SEASON_NAME[season], sky,
    region: { id: regionOf(place), name: REGIONS[regionOf(place)].name, crop: Math.round(N.crop[regionOf(place)] * 100), cropWord: cropWord(N.crop[regionOf(place)]) },
    regions: REGION_IDS.map((id) => ({ id, name: REGIONS[id].name, farm: !!REGIONS[id].farm, crop: Math.round(N.crop[id] * 100), cropWord: cropWord(N.crop[id]) })),
    active: N.active.map((d) => ({ kind: d.kind, name: KINDS[d.kind].name, region: REGIONS[d.region].name, sev: d.sev, sevWord: SEV_WORD(d.sev), left: d.left, here: d.region === regionOf(place) })),
    past: N.past.slice(-10).reverse().map((d) => ({ name: KINDS[d.kind]?.name ?? d.kind, region: REGIONS[d.region]?.name ?? '', y: d.y, m: d.m, sevWord: SEV_WORD(d.sev) })),
    famine: !!g.world?.famine, lean: N.lean, bread: g.realm?.bread ?? 1,
    winterReady: N.ready === winterOf(g) || (g.date.month >= 9 && N.ready === g.date.year),
    dike: N.dike[place] === g.date.year,
    log: N.log.slice(-10).reverse(),
  };
}

// 한 줄 요약: 철, 이 고장에 든 재앙, 흉년
export function natureLine(g) {
  const N = NS(g);
  const place = L(g).place;
  const parts = [SEASON_NAME[SEASON(g.date.month)]];
  for (const d of activeAt(g, place)) parts.push(`${KINDS[d.kind].name} (${SEV_WORD(d.sev)})`);
  if (g.world?.famine) parts.push(N.lean >= 2 ? `${N.lean}해째 흉년` : '흉년');
  const m = g.date.month;
  if ((m === 12 || m <= 2) && N.ready !== winterOf(g) && ['own', 'street', 'rent'].includes(L(g).home)) parts.push('겨울 준비가 없다');
  return parts.join(' · ');
}

// 풍경 그림(sceneImage의 calamity)에 넘길 이름: 그 고장에 지금 든 가장 큰 재앙. 없으면 null.
// 혹한은 frost, 큰 폭풍은 바닷물이 골목까지 드는 그림이라 flood로 그린다.
const CALAMITY = { drought: 'drought', flood: 'flood', winter: 'frost', locust: 'locust', quake: 'quake', storm: 'flood' };
export function calamityAt(g, place = L(g).place) {
  const list = activeAt(g, place).slice().sort((a, b) => b.sev - a.sev);
  return list.length ? CALAMITY[list[0].kind] ?? null : null;
}
