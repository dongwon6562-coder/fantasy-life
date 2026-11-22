// 기술이 고장에서 고장으로 번지는 한 달. 플레이어 없이도 굴러간다.
import { WORLD_TICKS } from '../world.js';
import { PLACES } from '../places.js';
import { TECH } from '../techtree/nodes.js';
import { AFTER_TECH } from '../techtree/grow.js';
import { J } from '../narrative/text.js';
import { SP, PLACE_IDS, LEARNED, MARKETS, PORTS, CHANNEL, livable, addReach, placeName, mi, slog, spreadRng } from './state.js';

const inv = (g) => g.history?.inventions ?? [];
const has = (g, id) => inv(g).includes(id);
const playerAt = (g) => (g.life && !g.life.travel ? g.life.place : null);

// 나무에서 기술이 나오면 처음엔 그 고장에만
AFTER_TECH.push((g, t) => { SP(g); addReach(g, t.id, t.where); });

function spreadOne(g, t, rng, said) {
  const S = SP(g), r = S.reach[t.id];
  if (!r) return;
  const here = new Set(r.map((x) => PLACE_IDS[x[0]]));
  const c = CHANNEL[t.field] ?? CHANNEL.craft;
  const now = mi(g);
  const slow = (S.patent[t.id] ?? 0) > now ? 0.5 : 1;
  const kept = S.guard[t.id] ? 0.6 : 1;
  // 길이 좋아질수록 빨리 번진다
  const road = 1 + (has(g, 'paving') ? 0.1 : 0) + (has(g, 'railroad') ? 0.35 : 0) + (has(g, 'northrail') ? 0.1 : 0);
  const sea = 1 + (has(g, 'compass') ? 0.15 : 0) + (has(g, 'steamship') ? 0.5 : 0);
  const blocked = (pl) => { const b = S.block[pl]; return !!b && b[0] === t.id && b[1] > now; };
  const tryAdd = (pl, how) => {
    if (here.has(pl) || !livable(g, pl) || blocked(pl)) return;
    if (!addReach(g, t.id, pl)) return;
    here.add(pl);
    if (playerAt(g) === pl) said.push(`${J(t.name, '이/가')} 이 고장에도 들어왔다. ${how}`);
  };
  const k = slow * kept;
  // 장인과 도제: 이웃 고장으로 (길이 멀수록 더디다)
  for (const pl of [...here]) for (const [nb, d] of Object.entries(PLACES[pl]?.links ?? {})) if (!here.has(nb) && rng.chance(0.011 * c.hand * k * road / d)) tryAdd(nb, '이웃 고장에서 도제살이를 마친 젊은 장인이 돌아와 가게를 열었다.');
  // 책: 인쇄기가 나온 뒤, 글 읽는 곳으로
  if (has(g, 'press') && rng.chance(0.007 * c.book * k * (has(g, 'newspaper') ? 1.5 : 1))) tryAdd(rng.pick(LEARNED), '찍어 낸 책 한 권이 먼저 왔고, 그 책을 읽은 사람이 흉내를 냈다.');
  // 떠도는 기술자: 어디로든
  if (rng.chance(0.003 * c.wander * k)) tryAdd(rng.pick(PLACE_IDS), '떠돌이 기술자 하나가 한 철 머물며 가르쳐 주고 떠났다.');
  // 상단: 장터와 항구를 타고
  if ([...here].some((pl) => MARKETS.includes(pl)) && rng.chance(0.008 * c.trade * k * road)) { const to = rng.pick(MARKETS); tryAdd(to, PORTS.includes(to) ? '상단 배가 물건과 함께 그것을 다루는 사람을 실어 왔다.' : '상단 수레가 물건을 싣고 왔고, 쓰는 법은 상단 사람이 가르쳤다.'); }
  if (PORTS.some((pl) => here.has(pl)) && rng.chance(0.004 * c.trade * k * sea)) tryAdd(rng.pick(PORTS), '뱃사람들이 먼 항구에서 본 것을 그대로 따라 만들었다.');
}

export function spreadMonth(g, say) {
  if (!g.spread || !g.history) return;
  const S = SP(g), rng = spreadRng(g, 1), said = [];
  const total = PLACE_IDS.filter((pl) => livable(g, pl)).length;
  for (const id of inv(g)) {
    const t = TECH[id], r = S.reach[id];
    if (!t || !r || r.length >= total) continue;
    spreadOne(g, t, rng, said);
    if (r.length >= total && t.big) { say(`${J(t.name, '이/가')} 이제 나라 끝 고장까지 들어갔다. 처음 나온 지 ${g.date.year - r[0][1]}년 만이다.`); slog(g, `${J(t.name, '이/가')} 온 나라에 퍼졌다.`); }
  }
  for (const s of said.slice(0, 2)) say(s);
  // 끝난 특허장과 막기는 치운다
  const now = mi(g);
  for (const [id, until] of Object.entries(S.patent)) if (until <= now) { delete S.patent[id]; slog(g, `${TECH[id]?.name ?? '그 기술'}의 왕실 특허장이 끝났다.`); }
  for (const [pl, b] of Object.entries(S.block)) if (b[1] <= now) delete S.block[pl];
}

WORLD_TICKS.push((g, worldRng, say) => spreadMonth(g, say));
