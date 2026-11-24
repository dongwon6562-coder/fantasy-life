// 44단계 고장 늘리기 (도우미스레드3). 나라마다 둘~셋씩, 지도에 이미 있던 자리를 진짜 고장(PLACES)으로 연다.
//   - 고장마다 다른 살림: 시세(trade LOCAL), 통행세, 일거리(ld_work), 풍습(ld_custom), 말투, 위험(ld_danger)
//   - 길과 이동 달: links. 지도 길(mapdata roads)에 없던 길만 덧붙인다
//   - 사람: 그 고장에서 나고 자란 사람들(realms REALM_PEOPLE), 죽으면 그 고장 집안에서 다음 사람이 자란다
//   - 숨은 도시 둘(이엘라·그론다르): 그 종족이거나 통행 허가(ld_pass)가 있어야 열린다
//   - 무플레이로도 고장이 커지고 작아진다(해마다 pop, 품삯·집값·크기 말이 따라 움직임)
// 상태는 g.lands 하나. 화면 연결점은 landsLine(g) / landsInfo(g).
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { WORLD_TICKS } from '../world.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { realmName } from '../realms/index.js';
import { REALM_PEOPLE } from '../realms/data.js';
import { LOCAL, TOLLS, CARAVAN_TOWNS } from '../trade/core.js';
import { activeAt, REGIONS } from '../nature/state.js';
import { MAP_PLACES_EXTRA } from '../art/map.js';
import { roads } from '../art/mapdata.js';
import { byId, makePerson } from '../npc.js';
import { me } from '../game.js';
import { raceOf } from '../races/index.js';
import { makeRng } from '../rng.js';
import { LANDS, LAND_IDS, SIZE_WORDS, GROW } from './data.js';
import './life.js';

export { LANDS, LAND_IDS };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mi = (g) => g.date.year * 12 + g.date.month;
export const isLand = (id) => !!LANDS[id];

/* ---------- 고장으로 올리기 ---------- */
let current = null; // open(g)가 g 없이 불릴 때를 위해
export const raceOk = (g, id) => { const gt = LANDS[id]?.gate; if (!gt) return true; return !!g?.player && gt.races.includes(raceOf(me(g))); };
export const gateOpen = (g, id) => !LANDS[id]?.gate || raceOk(g, id) || !!g?.lands?.pass?.[id];
const BASE = {};
for (const [id, d] of Object.entries(LANDS)) {
  if (PLACES[id]) continue;
  BASE[id] = { inn: d.inn, rent: d.rent, house: d.house, wage: d.wage, kind: d.kind };
  PLACES[id] = {
    name: d.name, kind: d.kind, desc: d.desc,
    inn: d.inn, rent: d.rent, house: d.house, wage: d.wage, loot: d.loot, crowd: d.crowd,
    links: {}, realm: d.realm, land: true,
    ...(d.gate ? { hidden: true, open: (g) => gateOpen(g ?? current, id) } : {}),
  };
  REALM_PEOPLE[id] ??= d.people;
  LOCAL[id] ??= d.local;
  if (d.toll) TOLLS[id] ??= d.toll;
  if (d.caravan && !CARAVAN_TOWNS.includes(id)) CARAVAN_TOWNS.push(id);
  if (d.map) MAP_PLACES_EXTRA.push({ id, n: d.name, ...d.map });
}
// 땅의 생김새 묶음 (재앙·흉년이 어디에 오나)
const REGION = { milles: 'south', rosen: 'river', roten: 'east', stein: 'east', krossen: 'east', abel: 'holy', riana: 'holy', luen: 'lake', scholae: 'lake', libera: 'coast', kalten: 'north', wolfwood: 'north', iela: 'forest', silver: 'forest', border: 'forest', garum: 'forest', wolf: 'forest', grondar: 'mountain' };
for (const [id, r] of Object.entries(REGION)) if (REGIONS[r] && !REGIONS[r].places.includes(id)) REGIONS[r].places.push(id);
const onRoads = (a, b) => roads.some((r) => r.some((x, i) => (x === a && (r[i - 1] === b || r[i + 1] === b))));
for (const [id, d] of Object.entries(LANDS)) {
  for (const [to, m] of Object.entries(d.links)) {
    if (!PLACES[id] || !PLACES[to]) continue;
    PLACES[id].links[to] ??= m; PLACES[to].links[id] ??= m;
    if (!onRoads(id, to)) roads.push([id, to]);
  }
}

/* ---------- 상태 ---------- */
const fresh = () => ({ pop: Object.fromEntries(LAND_IDS.map((k) => [k, LANDS[k].pop])), pass: {}, seen: [], customAt: {}, worked: {}, log: [], newsAt: -99 });
export function landsState(g) {
  g.lands ??= fresh();
  const S = g.lands, f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  for (const k of LAND_IDS) S.pop[k] ??= LANDS[k].pop;
  return S;
}
export const LS = landsState;
export const llog = (g, text) => { const S = LS(g); S.log.push({ y: g.date.year, m: g.date.month, text }); if (S.log.length > 24) S.log.splice(0, S.log.length - 24); };
export const sizeWord = (pop) => SIZE_WORDS.find(([t]) => pop < t)?.[1] ?? '';
const sizeIdx = (pop) => SIZE_WORDS.findIndex(([t]) => pop < t);

// 지금 판의 크기에 맞춰 품삯·집값·크기 말을 맞춘다 (PLACES는 판끼리 같이 쓰니 판을 불러올 때마다)
export function syncLands(g) {
  if (!g) return;
  current = g;
  const S = LS(g);
  for (const id of LAND_IDS) {
    const b = BASE[id], p = PLACES[id];
    if (!b || !p) continue;
    const pop = S.pop[id], k = 0.85 + pop / 330; // 0.85 ~ 1.15
    p.wage = Math.round(b.wage * (0.94 + pop / 830) * 100) / 100;
    p.rent = Math.max(1, Math.round(b.rent * k));
    p.inn = Math.max(1, Math.round(b.inn * k));
    p.house = Math.round(b.house * k / 10) * 10;
    const w = sizeWord(pop);
    p.kind = w ? `${w} ${b.kind}` : b.kind;
  }
}

/* ---------- 무플레이로 커지고 작아지는 고장 (해마다 한 번) ---------- */
function shake(g, id) {
  const d = LANDS[id], gr = GROW[d.grow] ?? {}, r = g.realm ?? {}, w = g.world ?? {};
  const realm = d.realm;
  const war = (realm === 'valhart' || realm === 'leonia') && !!r.balhart?.war || realm === 'march' && !!r.north?.war;
  const civil = realm === 'leonia' && r.succession === 'civilwar';
  const kinds = activeAt(g, id).map((x) => x.kind);
  let v = (gr.calm ?? 0) + (gr.era ?? 0) * Math.min(4, r.era ?? 0) * 0.5;
  if (w.famine || kinds.some((k) => ['drought', 'locust', 'flood'].includes(k))) v += gr.famine ?? -1;
  if (war) v += gr.war ?? 0;
  if (civil) v += gr.civil ?? -1;
  if (realm === 'march' && (g.demons?.raidAt ?? -99) > mi(g) - 12) v += gr.raid ?? -1;
  if (kinds.includes('plague')) v += gr.plague ?? -2;
  if (kinds.includes('quake')) v += gr.quake ?? -1;
  if ((r.monsters ?? 0) > 55) v += gr.monsters ?? -0.5;
  if ((g.mana?.tide ?? 0) > 0.3) v += gr.mana ?? 0;
  if (g.occupied?.places?.[id]) v -= 3;
  // 너무 크면 조금씩 빠지고 너무 작으면 사람이 흘러든다 (고장마다 제 크기로 돌아가려는 힘)
  v += (d.pop - (LS(g).pop[id] ?? d.pop)) * 0.06;
  return v;
}
export function landsYear(g, say = () => {}) {
  if (!g.lands || !g.date) return;
  const S = LS(g), rng = makeRng({ s: ((g.rngState?.s ?? 991) ^ Math.imul(g.date.year * 31 + 7, 2654435761)) | 0 });
  let told = false;
  for (const id of LAND_IDS) {
    const was = S.pop[id], i0 = sizeIdx(was);
    S.pop[id] = clamp(Math.round((was + shake(g, id) + rng.normal(0, 1.6)) * 10) / 10, 3, 100);
    const i1 = sizeIdx(S.pop[id]);
    if (i1 !== i0) {
      const nm = LANDS[id].name, up = i1 > i0;
      const line = up ? `${nm}에 사람이 늘었다. ${sizeWord(S.pop[id]) || '제법 큰'} 고장이 되었다는 말이 돈다.` : `${nm}에서 사람이 빠져나간다. 빈집이 늘었다고 한다.`;
      llog(g, line);
      if (!told && mi(g) - S.newsAt >= 18) { say(line); S.newsAt = mi(g); told = true; }
    }
  }
  syncLands(g);
}
WORLD_TICKS.push((g, rng, say) => { if (g.date?.month === 1) landsYear(g, say); });

/* ---------- 그 고장에서 나고 자라는 사람 ---------- */
// 그 고장 사람이 죽거나 떠나면, 해가 바뀔 때 같은 고장 집안에서 다음 사람이 자란다 (내가 그 고장 사람들을 만난 뒤에만)
HOOKS.afterMonth.push((g, rng) => {
  if (!g.lands || g.date.month !== 1 || !g.life) return;
  const life = L(g);
  for (const id of LAND_IDS) {
    const ids = life.placeNpcs?.[id];
    if (!ids?.length) continue;
    const people = REALM_PEOPLE[id] ?? [];
    for (let i = 0; i < ids.length; i++) {
      const p = byId(g, ids[i]);
      if (p && p.alive && p.place === id) continue;
      const r = people.find((x) => x.role === p?.role) ?? people[i % people.length];
      if (!r) continue;
      const kin = ids.map((x) => byId(g, x)).find((q) => q?.alive && q.place === id && q.lastName) ?? p;
      const young = Math.max(r.age[0], 16), n = makePerson(rng, { sex: r.sex, ageMonths: rng.int(young, young + 8) * 12 + rng.int(0, 11), job: r.job, traits: r.traits });
      if (kin?.lastName) n.lastName = kin.lastName;
      if (p?.race) n.race = p.race; else if (r.race) n.race = r.race;
      if (r.beast) n.beast = r.beast;
      n.skill = r.skill ? rng.int(r.skill[0], r.skill[1]) : rng.int(30, 60);
      Object.assign(n, { place: id, role: p?.role ?? r.role, realm: LANDS[id].realm, born: id, wealth: rng.int(20, 120) });
      if (r.title) n.title = r.title;
      g.people.push(n);
      ids[i] = n.id;
      if (p?.known) llog(g, `${LANDS[id].name}: ${p.name}의 자리를 ${kin?.lastName ? '같은 집안의 ' : ''}${J(n.name, '이/가')} 이었다.`);
    }
  }
});

HOOKS.newGame.push((g) => { g.lands = fresh(); syncLands(g); });
HOOKS.migrate.push((g) => { landsState(g); syncLands(g); });

/* ---------- 화면 ---------- */
export function landsLine(g) {
  const id = L(g)?.place, d = LANDS[id];
  if (!d || L(g).travel) return '';
  const w = sizeWord(LS(g).pop[id]);
  return `${d.name}. ${w ? `지금은 ${w} 고장이다. ` : ''}이곳 말투: ${d.speech}`;
}
export function landsInfo(g) {
  const S = LS(g), here = L(g)?.place;
  return {
    here: LANDS[here] ? { id: here, name: LANDS[here].name, speech: LANDS[here].speech, custom: LANDS[here].custom.title, work: LANDS[here].work.name, danger: LANDS[here].danger.text, size: sizeWord(S.pop[here]) || '보통', pop: Math.round(S.pop[here]) } : null,
    lands: LAND_IDS.map((id) => ({ id, name: LANDS[id].name, realm: realmName(LANDS[id].realm), kind: PLACES[id]?.kind ?? LANDS[id].kind, size: sizeWord(S.pop[id]) || '보통', pop: Math.round(S.pop[id]), seen: S.seen.includes(id), open: gateOpen(g, id), gate: LANDS[id].gate ? LANDS[id].gate.name : null, born: (g.people ?? []).filter((p) => p.born === id && p.alive).length })),
    passes: Object.keys(S.pass).filter((k) => S.pass[k]).map((k) => LANDS[k].gate.name),
    log: S.log.slice(-8).reverse(),
  };
}
