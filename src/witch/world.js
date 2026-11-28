// 마을 변두리의 마녀들: 플레이어 없이도 늙고, 딸이나 제자에게 집안 주술을 물려주고, 속임수가 들통나고,
// 흉년·재앙·역병이 들면 누구 탓을 찾는 마을에 쫓긴다. 마녀사냥은 나라마다 기세가 다르다(REALM_EYE).
import { HOOKS } from '../hooks.js';
import { WORLD_TICKS } from '../world.js';
import { J } from '../narrative/text.js';
import { activeAt } from '../nature/state.js';
import { outbreaksAt } from '../health/index.js';
import {
  WS, fill, liveWise, wiseAt, wiseName, wlog, clamp, mi, ownRng, placeName, realmAt, huntPower, witchPlaces, WISE_NAMES, LINES, isWitch, here,
} from './state.js';

export const FEED = { fact: null, me: null };

export function newWise(g, rng, place, { line = null, gen = 1, sex = null, age = null, kind = null } = {}) {
  const W = WS(g);
  const usedLines = liveWise(g).map((w) => w.line);
  const free = LINES.filter((l) => !usedLines.includes(l));
  sex ??= rng.chance(0.82) ? 'f' : 'm';
  const w = {
    id: `wi${W.seq++}`, name: rng.pick(WISE_NAMES[sex]), sex, age: age ?? rng.int(48, 70), place,
    kind: kind ?? (rng.chance(0.3) ? 'true' : rng.chance(0.7) ? 'half' : 'fraud'),
    trust: rng.int(45, 65), fame: rng.int(5, 25), line: line ?? rng.pick(free.length ? free : LINES), gen, born: g.date.year, gone: null, met: 0,
  };
  W.wise.push(w);
  if (W.wise.length > 40) { const i = W.wise.findIndex((x) => x.gone); if (i >= 0) W.wise.splice(i, 1); }
  return w;
}
export function seed(g) {
  const W = WS(g);
  if (W.wise.length) return;
  const rng = ownRng(g, 5);
  const spots = witchPlaces().sort(() => rng.next() - 0.5).slice(0, 9);
  if (!spots.includes('ern') && witchPlaces().includes('ern')) spots[0] = 'ern';
  for (const pl of spots) newWise(g, rng, pl, { gen: rng.int(1, 4) });
}

/* ---------- 흉한 일과 마녀사냥 ---------- */
// 고장의 기운: 흉년·재앙·역병이 들면 오르고, 달마다 조금씩 가라앉는다
function heatMonth(g) {
  const W = WS(g);
  const spots = new Set([...liveWise(g).map((w) => w.place), ...Object.keys(W.me.look)]);
  for (const pl of Object.keys(W.heat)) spots.add(pl);
  for (const pl of spots) {
    if (!huntPower(pl)) { delete W.heat[pl]; continue; }
    let add = 0;
    if (g.world?.famine) add += 4.5;
    const cal = activeAt(g, pl);
    if (cal.length) add += 3 + Math.min(4, cal.reduce((a, c) => a + (c.sev ?? 1) * 3, 0));
    const sick = outbreaksAt(g, pl).filter((o) => o.sev >= 0.4);
    if (sick.length) add += 5 + sick[0].sev * 8;
    const v = (W.heat[pl] ?? 0) * 0.9 + add;
    if (v < 0.5) delete W.heat[pl]; else W.heat[pl] = clamp(v, 0, 100);
  }
}
const HOW_TEXT = {
  saved: (w, pl) => `${placeName(pl)} 사람들이 마녀를 찾아내자고 몰려갔지만, ${J(wiseName(w), '이/가')} 받아 낸 아이들의 부모가 오두막 앞을 막아섰다.`,
  fled: (w, pl) => `${placeName(pl)}에서 마녀사냥이 일자 ${J(wiseName(w), '은/는')} 밤에 숲으로 달아났다.`,
  banished: (w, pl) => `${placeName(pl)} 사람들이 ${J(wiseName(w), '을/를')} 마을 밖으로 내쫓았다.`,
  fined: (w, pl) => `${placeName(pl)}의 법정이 ${J(wiseName(w), '을/를')} 사기꾼으로 다루어 벌금을 물렸다.`,
  ordeal_live: (w, pl) => `${placeName(pl)}에서 ${J(wiseName(w), '이/가')} 신명 재판을 받았다. 물에 던져졌다가 살아 나왔고, 사람들은 결백하다며 고개를 숙였다.`,
  ordeal_dead: (w, pl) => `${placeName(pl)}에서 ${J(wiseName(w), '이/가')} 신명 재판을 받다 숨졌다. 결백했는지는 아무도 모른다.`,
  burned: (w, pl) => `${placeName(pl)} 광장에 화형대가 섰다. ${J(wiseName(w), '이/가')} 마녀로 몰려 거기서 죽었다.`,
};
function pickHow(rng, w, pl) {
  if (w.trust >= 58 && rng.chance(clamp((w.trust - 50) / 35, 0, 0.8))) return 'saved';
  const r = realmAt(pl);
  const table = r === 'holy' ? [['burned', 45], ['ordeal', 35], ['fled', 20]]
    : r === 'leonia' || r === 'march' ? [['ordeal', 40], ['fled', 30], ['banished', 20], ['burned', 10]]
      : [['fined', 50], ['banished', 30], ['fled', 20]];
  let x = rng.next() * 100, how = table[0][0];
  for (const [k, p] of table) { if (x < p) { how = k; break; } x -= p; }
  if (how === 'ordeal') how = rng.chance(w.kind === 'true' ? 0.6 : 0.45) ? 'ordeal_live' : 'ordeal_dead';
  return how;
}
export function npcHunt(g, rng, w, say) {
  const W = WS(g), pl = w.place, how = pickHow(rng, w, pl);
  W.hunts.push({ y: g.date.year, m: g.date.month, place: pl, who: wiseName(w), me: false, how });
  if (W.hunts.length > 30) W.hunts.splice(0, W.hunts.length - 30);
  W.tally.hunts += 1;
  const text = HOW_TEXT[how](w, pl);
  wlog(g, text);
  if (pl === here(g) || how === 'burned') say?.(text, how === 'burned');
  FEED.fact?.(g, 'wi_hunt', { pl, name: wiseName(w), how });
  if (how === 'saved') { W.tally.saved += 1; w.trust = clamp(w.trust + 5, 0, 100); W.heat[pl] = (W.heat[pl] ?? 0) * 0.4; return how; }
  if (how === 'ordeal_live') { w.trust = clamp(w.trust + 15, 0, 100); w.fame += 10; return how; }
  if (how === 'fined') { w.trust = clamp(w.trust - 10, 0, 100); return how; }
  if (how === 'burned' || how === 'ordeal_dead') { w.gone = { y: g.date.year, how }; W.tally.died += 1; if (how === 'burned') W.tally.burned += 1; return how; }
  // 달아나거나 쫓겨난 마녀는 마녀 없는 다른 마을에 숨어든다. 갈 곳이 없으면 숲에서 사라진다
  const away = witchPlaces().filter((p) => p !== pl && !wiseAt(g, p) && huntPower(p) <= huntPower(pl));
  if (away.length && rng.chance(0.7)) { w.place = rng.pick(away); w.trust = 30; } else w.gone = { y: g.date.year, how };
  return how;
}
function huntMonth(g, rng, say) {
  const W = WS(g);
  for (const [pl, heat] of Object.entries(W.heat)) {
    if (heat < 40 || mi(g) - (W.huntAt[pl] ?? -99) < 24) continue;
    if (!rng.chance(clamp(heat * huntPower(pl) / 400, 0, 0.35))) continue;
    // 내가 이 고장에서 주술을 하는 사람으로 알려져 있으면 횃불이 내 문 앞으로 온다
    const meKnown = isWitch(g) && W.me.look[pl] != null && here(g) === pl && !g.over;
    const w = wiseAt(g, pl);
    if (meKnown && (!w || rng.chance(0.5) || W.me.look[pl] < w.trust)) { W.huntAt[pl] = mi(g); FEED.me?.(g, pl); continue; }
    if (!w) continue;
    W.huntAt[pl] = mi(g);
    npcHunt(g, rng, w, say);
  }
}

/* ---------- 한 해 ---------- */
function yearOf(g, rng, say) {
  const W = WS(g);
  for (const w of liveWise(g)) {
    w.age += 1;
    // 마을 눈길은 제자리로 돌아오려 한다. 진짜 효험이 있는 마녀는 고마움을 쌓고, 속임수는 언젠가 들통난다
    const aim = w.kind === 'true' ? 70 : w.kind === 'half' ? 55 : 45;
    w.trust = clamp(w.trust + (aim - w.trust) * 0.15, 0, 100);
    if (w.kind === 'true') w.fame += rng.int(1, 3);
    if (w.kind === 'fraud' && rng.chance(0.12)) {
      w.trust = clamp(w.trust - 20, 0, 100);
      wlog(g, `${placeName(w.place)}: ${wiseName(w)}의 사랑 묘약이 맹물에 꿀을 탄 것이었다는 게 들통났다.`);
    }
    if (w.age > 60 && rng.chance((w.age - 60) * 0.012)) {
      w.gone = { y: g.date.year, how: 'old' };
      W.tally.died += 1;
      // 대를 잇는 주술 집안: 딸이나 거둔 제자가 같은 오두막에서 같은 이름을 잇는다
      if (rng.chance(0.65)) {
        const heir = newWise(g, rng, w.place, { line: w.line, gen: w.gen + 1, age: rng.int(30, 46), kind: w.kind === 'fraud' ? (rng.chance(0.5) ? 'half' : 'fraud') : w.kind });
        heir.trust = clamp(w.trust - 5, 0, 100); heir.fame = Math.round(w.fame * 0.5);
        W.tally.born += 1;
        wlog(g, `${placeName(w.place)}: ${J(wiseName(w), '이/가')} 숨을 거두고 ${J(heir.name, '이/가')} ${w.line}의 ${heir.gen}대 주술사가 되었다.`);
      } else wlog(g, `${placeName(w.place)}: ${J(wiseName(w), '이/가')} 숨을 거두었다. 오두막은 비었다.`);
    }
  }
  // 마녀 없는 마을에도 언젠가 약초 할멈 하나는 나타난다
  if (liveWise(g).length < 10 && rng.chance(0.35)) {
    const empty = witchPlaces().filter((p) => !wiseAt(g, p) && (W.heat[p] ?? 0) < 20);
    if (empty.length) {
      const w = newWise(g, rng, rng.pick(empty));
      W.tally.born += 1;
      wlog(g, `${placeName(w.place)} 변두리 오두막에 ${J(w.name, '이라는/라는')} 약초 할멈이 들어와 살기 시작했다.`);
      if (rng.chance(0.3)) FEED.fact?.(g, 'wi_wise', { pl: w.place, name: wiseName(w) });
    }
  }
}

export function witchMonth(g, say) {
  if (!g.witch || !g.date) return;
  const rng = ownRng(g, 11);
  heatMonth(g);
  huntMonth(g, rng, say);
  if (g.date.month === 1) yearOf(g, rng, say);
}
WORLD_TICKS.push((g, rng, say) => { if (!g.witch) return; witchMonth(g, say); });
HOOKS.newGame.push((g) => { fill(g); seed(g); });
HOOKS.migrate.push((g) => { fill(g); seed(g); });
