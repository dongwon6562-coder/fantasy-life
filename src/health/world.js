// 고장마다 도는 병: 철에 따라 열병·기침병·이질이 오고, 나라에 역병이 들면 잿빛 역병이 번진다.
// 흉년이면 더 잘 돌고, 홍수 뒤에는 이질이, 혹한에는 기침병이 는다. 늙고 약한 사람부터 데려간다. 제 주사위를 따로 쓴다.
import { WORLD_TICKS } from '../world.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { kill, ageYears } from '../npc.js';
import { chron } from '../adventure/core.js';
import { REGIONS, regionOf } from '../nature/state.js';
import { HS, mi, clamp, KINDS, hlog } from './state.js';

// 이웃한 고장 묶음 (역병이 번지는 길)
const NEAR = { south: ['river', 'coast'], river: ['south', 'north', 'lake', 'east'], north: ['river', 'mountain'], east: ['river', 'holy'], holy: ['east'], lake: ['river', 'forest'], forest: ['lake', 'north'], mountain: ['north'], coast: ['south', 'river'] };
const CRISIS_TOWN = (g) => (g.crisis?.active?.id === 'plague' ? g.crisis.active.data?.town ?? null : null);

export function startOutbreak(g, kind, region, sev, rng, say = () => {}) {
  const H = HS(g), K = KINDS[kind];
  if (!K || !REGIONS[region] || H.outbreaks.some((o) => o.kind === kind && o.region === region)) return null;
  const o = { kind, region, sev: Math.round(clamp(sev, 0.1, 1) * 100) / 100, left: rng.int(K.last[0], K.last[1]), start: { y: g.date.year, m: g.date.month } };
  H.outbreaks.push(o);
  const big = o.sev >= 0.65 || kind === 'plague';
  say(`${REGIONS[region].name}에 ${J(K.name, '이/가')} 돈다. ${K.desc}`, big);
  if (big) chron(g, `${REGIONS[region].name}에 ${J(K.name, '이/가')} 크게 돌다.`, kind === 'plague' ? 85 : 50);
  hlog(g, `${REGIONS[region].name}에 ${K.name}${big ? ' (크다)' : ''}.`);
  return o;
}
export const outbreaksIn = (g, place) => HS(g).outbreaks.filter((o) => o.region === regionOf(place));

// 늙고 약한 사람을 먼저 데려간다 (플레이어의 핏줄은 앓는 사람으로 따로 다룬다)
function takeTheWeak(g, o, rng) {
  const fam = new Set([...(g.player?.familyIds ?? [])]);
  const meId = g.player?.id;
  const places = REGIONS[o.region].places;
  const ppl = g.people.filter((p) => p.alive && !p.isPlayer && !fam.has(p.id) && p.spouseId !== meId && p.fatherId !== meId && p.motherId !== meId && places.includes(p.place ?? 'ern'));
  for (const p of ppl) if (rng.chance(0.15 * o.sev)) p.health = Math.max(5, (p.health ?? 70) - rng.int(2, 8));
  const weak = ppl.filter((p) => ageYears(p) >= 62 || (p.health ?? 70) < 30 || ageYears(p) < 3);
  if (weak.length && rng.chance(KINDS[o.kind].deadly * o.sev * 0.6)) kill(g, rng.pick(weak), KINDS[o.kind].name);
}

WORLD_TICKS.push((g, worldRng, say) => {
  if (!g.health) return;
  const H = g.health;
  const rng = makeRng({ s: ((g.rngState?.s ?? 13) ^ Math.imul(mi(g) + 37, 2654435761)) | 0 });
  const m = g.date.month;
  // 돌던 병
  // 나라에 역병이 도는 동안 고장의 역병은 잦아들지 않는다
  for (const o of H.outbreaks) { o.left = o.kind === 'plague' && g.world?.plague ? Math.max(1, o.left - 1) : o.left - 1; takeTheWeak(g, o, rng); }
  for (const o of H.outbreaks.filter((x) => x.left <= 0)) {
    if (o.sev >= 0.5 || o.kind === 'plague') say(`${REGIONS[o.region].name}의 ${J(KINDS[o.kind].name, '이/가')} 잦아들었다. 문마다 걸었던 마른 풀 다발을 걷어 낸다.`);
    H.past.push({ kind: o.kind, region: o.region, sev: o.sev, y: o.start.y, m: o.start.m });
  }
  H.outbreaks = H.outbreaks.filter((o) => o.left > 0);
  if (H.past.length > 30) H.past.splice(0, H.past.length - 30);
  // 철 따라 오는 병
  const famine = !!g.world?.famine;
  const nat = g.nature?.active ?? [];
  for (const [kind, K] of Object.entries(KINDS)) {
    if (!K.months || !K.months.includes(m)) continue;
    for (const [region, p0] of Object.entries(K.odds)) {
      let p = p0 * (famine ? 1.6 : 1);
      if (kind === 'flux' && (nat.some((d) => d.kind === 'flood' && d.region === region) || (g.nature?.past ?? []).some((d) => d.kind === 'flood' && d.region === region && d.y === g.date.year))) p *= K.afterFlood;
      if (kind === 'lung' && nat.some((d) => d.kind === 'winter' && d.region === region)) p *= 2;
      if (rng.chance(p)) startOutbreak(g, kind, region, rng.float(0.25, 0.9), rng, say);
    }
  }
  // 역병: 나라에 돌림병이 들면 들어오고, 이웃 고장으로 번진다
  if (g.world?.plague) {
    const has = H.outbreaks.filter((o) => o.kind === 'plague');
    if (!has.length) {
      const town = CRISIS_TOWN(g) ?? rng.pick(['harfen', 'leocast', 'verden']);
      startOutbreak(g, 'plague', regionOf(town), rng.float(0.55, 0.95), rng, say);
    } else if (rng.chance(0.25)) {
      const from = rng.pick(has);
      const to = rng.pick(NEAR[from.region] ?? []);
      if (to) startOutbreak(g, 'plague', to, from.sev * rng.float(0.6, 0.95), rng, say);
    }
  }
});
