// 23단계: 개척과 새 땅. 변경 너머 빈 땅 여섯, 개척 허가장, 개척민 모으기, 첫 겨울, 마물과 먼저 살던 이들,
// 개척촌이 마을이 되고 고을이 되는 세월(플레이어 없이도 새 마을이 생긴다), 이름 붙이기.
// 화면용: frontierInfo(g), frontierLine(g)
import {
  FS, SITES, SITE_IDS, NATIVES, FOUNDERS, STAGES, siteName, stageName, moraleWord, foodWord, safeWord, nativeWord, syncNames,
} from './state.js';
import './world.js';
import './life.js';
import { L } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { MAP_PLACES_EXTRA, MAP_INFO } from '../art/map.js';
import { J } from '../narrative/text.js';

export { SITES, NATIVES, STAGES, syncNames } from './state.js';
export { frontierMonth, found, abandon, nameSite } from './world.js';
export const frontierState = FS;

// 대륙 지도: 빈 땅도 지도에는 있다 (변경 너머의 땅으로). 사람이 살면 설명 칸에 형편이 붙는다.
for (const [id, d] of Object.entries(SITES)) {
  MAP_PLACES_EXTRA.push({
    id, n: d.land, x: d.x, y: d.y, t: 'site', area: '변경 너머',
    realm: d.claim ? `${{ leonia: '레오니아 왕국', march: '북부 변경백령', valhart: '발하르트 제국' }[d.claim]}이 땅을 제 것이라 한다` : '주인 없는 땅',
    d: d.desc, todo: '개척 허가장, 개척민 모으기, 개척촌 일구기',
  });
}
MAP_INFO.push((g, place) => {
  if (!SITES[place?.id] || !g?.frontier) return '';
  const s = FS(g).sites[place.id], d = SITES[place.id];
  if (s.stage === 0) return `<p class="note">아무도 살지 않는다.${s.lost ? ` 버려진 개척촌 자리가 ${s.lost}곳 있다.` : ''} ${PLACES[d.near]?.name ?? ''}에서 ${d.months}달 길.</p>`;
  return `<p class="note"><b>${siteName(place.id, s)}</b> · ${STAGES[s.stage]} · 사람 ${s.pop}명 · ${s.byName ?? ''}${s.mine ? ' (내가 일굼)' : ''}</p>`;
});

const view = (g, id) => {
  const s = FS(g).sites[id], d = SITES[id], N = d.native ? NATIVES[d.native] : null;
  return {
    id, land: d.land, name: siteName(id, s), named: !!s.name, stage: s.stage, stageName: stageName(s), pop: s.pop,
    near: PLACES[d.near]?.name ?? '', months: d.months, claim: d.claim ? { leonia: '레오니아', march: '변경백령', valhart: '제국' }[d.claim] : '',
    by: s.byName ?? '', mine: !!s.mine, chief: !!s.chief, winters: s.winters, lost: s.lost,
    food: s.stage ? foodWord(s.food) : '', safety: s.stage ? safeWord(s.safety) : '', morale: s.stage ? moraleWord(s.morale) : '',
    natives: N ? { name: N.name, race: N.race, word: N.word, want: N.want, mood: s.natives === null ? '쫓겨났다' : nativeWord(s.natives), gone: s.natives === null } : null,
    open: s.stage >= 1, here: L(g).place === id,
  };
};
// 화면용 한 장
//   { sites[여섯 땅 모두], here(지금 있는 개척지 | null), near[이 고장에서 들어가는 땅], mine[내가 일구거나 촌장인 곳],
//     charter{ land, legal } | null, party{ land, settlers, food, tools, guards } | null, me{...}, log[{y,m,text}] }
export function frontierInfo(g) {
  const F = FS(g), pl = L(g).place;
  return {
    sites: SITE_IDS.map((id) => view(g, id)),
    here: SITES[pl] ? view(g, pl) : null,
    near: SITE_IDS.filter((id) => SITES[id].near === pl).map((id) => view(g, id)),
    mine: SITE_IDS.filter((id) => F.sites[id].mine || F.sites[id].chief).map((id) => view(g, id)),
    charter: F.charter ? { land: SITES[F.charter.site]?.land ?? '', legal: F.charter.legal !== false } : null,
    party: F.party ? { land: SITES[F.party.site]?.land ?? '', settlers: F.party.settlers, food: F.party.food, tools: !!F.party.tools, guards: !!F.party.guards } : null,
    me: { ...F.me },
    log: F.log.slice(-10).reverse(),
  };
}
// 머리글 한 줄: 개척지에 있거나, 내 개척촌이 있거나, 개척단을 모으는 중일 때만
export function frontierLine(g) {
  const F = FS(g), pl = L(g).place;
  if (SITES[pl] && F.sites[pl].stage) { const s = F.sites[pl]; return `${siteName(pl, s)}: ${STAGES[s.stage]}, ${s.pop}명, ${foodWord(s.food)}`; }
  const mine = SITE_IDS.find((id) => F.sites[id].chief || F.sites[id].mine);
  if (mine) { const s = F.sites[mine]; return `내 개척지 ${J(siteName(mine, s), '은/는')} ${STAGES[s.stage]}, ${s.pop}명`; }
  if (F.party) return `개척단: ${SITES[F.party.site]?.land ?? ''}, ${F.party.settlers}집`;
  return null;
}
