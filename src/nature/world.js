// 하늘과 땅의 한 달: 봄에 그해 소출이 정해지고, 철마다 재앙이 고장을 찾아오고, 가을에 거둔다.
// 흉년이 들면 빵값이 뛰고 영지의 민심이 흔들리고, 두 해 이어지면 뒷골목과 왕실 다툼이 거세진다.
// 제 주사위를 따로 쓴다: 세상의 다른 흐름이 굴리는 주사위 순서를 흔들지 않도록.
import { WORLD_TICKS } from '../world.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { kill, ageYears } from '../npc.js';
import { L, chron } from '../adventure/core.js';
import { NS, mi, clamp, REGIONS, REGION_IDS, BREADBASKET, KINDS, regionOf, nlog, cropWord } from './state.js';
// 51단계: 내가 있는 고장이 어느 묶음인지 (묶음 밖의 먼 땅이면 null. regionOf는 모르는 곳을 남부 들판으로 친다)
const homeRegion = (g) => { const pl = g.life?.place; return pl ? Object.keys(REGIONS).find((r) => REGIONS[r].places.includes(pl)) ?? null : null; };

const MAX_PAST = 40;

// 재앙을 일으킨다 (점검과 사건에서도 쓴다)
export function startDisaster(g, kind, region, sev, rng, say = () => {}, record = () => {}) {
  const N = NS(g), K = KINDS[kind];
  if (!K || !REGIONS[region]) return null;
  // 그해 둑을 쌓은 고장이 있으면 물이 덜 넘친다
  if (kind === 'flood' && REGIONS[region].places.some((p) => N.dike[p] === g.date.year)) sev *= 0.6;
  sev = clamp(sev, 0.1, 1);
  const d = { id: N.seq++, kind, region, sev: Math.round(sev * 100) / 100, left: rng.int(K.last[0], K.last[1]), start: { y: g.date.year, m: g.date.month } };
  N.active.push(d);
  N.crop[region] = clamp(N.crop[region] * (1 - K.crop * sev), 0.2, 1.4);
  const R = REGIONS[region];
  const big = sev >= 0.7;
  // 51단계: 풀이는 그 재앙이 열 해 만에 처음 들 때만, 남의 고장 일이면 짧게
  const home = homeRegion(g), told = (N.told ??= {}), t = mi(g), fresh = told[kind] == null || t - told[kind] >= 120;
  if (fresh) told[kind] = t;
  say(fresh ? `${R.name}에 ${J(K.name, '이/가')} 들었다. ${K.desc}` : home === region ? `${R.name}에 또 ${J(K.name, '이/가')} 들었다. 이번엔 우리 고장이다.` : `${R.name}에 ${J(K.name, '이/가')} 들었다는 소식이 들려온다.`, big);
  if (big) { record(`${R.name}에 큰 ${K.name}`); chron(g, `${R.name}에 큰 ${J(K.name, '이/가')} 들다.`, BREADBASKET.includes(region) ? 80 : 50); }
  if (BREADBASKET.includes(region) && g.realm && K.crop >= 0.3) g.realm.bread = clamp((g.realm.bread ?? 1) + 0.12 * sev, 0.6, 3);
  nlog(g, `${R.name}에 ${K.name}${big ? ' (크다)' : ''}.`);
  hitHomes(g, d, rng);
  hitDomain(g, d, say);
  if (kind === 'winter' || kind === 'quake' || (kind === 'flood' && big)) takeTheOld(g, d, rng);
  return d;
}

// 내 집이 그 고장에 있으면 상한다
function hitHomes(g, d, rng) {
  const K = KINDS[d.kind];
  if (!K.home || !g.estate?.homes) return;
  for (const place of REGIONS[d.region].places) {
    const h = g.estate.homes[place];
    if (h && (L(g).houses ?? []).includes(place)) h.cond = clamp(h.cond - Math.round(K.home * d.sev * rng.float(0.6, 1.2)), 5, 100);
  }
}
// 영지가 그 고장에 있으면 민심과 사람이 줄고 금고가 빈다
function hitDomain(g, d, say) {
  const dm = g.domain;
  if (!dm || regionOf(dm.place) !== d.region) return;
  const K = KINDS[d.kind];
  dm.morale = clamp(dm.morale - Math.round(4 + 10 * d.sev * (K.crop + 0.3)), 0, 100);
  if (K.home || d.kind === 'winter') dm.pop = Math.max(40, Math.round(dm.pop * (1 - 0.03 * d.sev)));
  dm.treasury = Math.max(0, Math.round(dm.treasury - 10 * d.sev));
  say(`${dm.name}에도 ${J(K.name, '이/가')} 덮쳤다는 집사의 편지가 왔다. 영민들이 영주의 곳간을 바라본다.`);
}
// 혹한과 지진은 늙은이를 먼저 데려간다 (플레이어의 핏줄은 사건에서 따로 다룬다)
function takeTheOld(g, d, rng) {
  const fam = new Set(g.player?.familyIds ?? []);
  const old = g.people.filter((p) => p.alive && !p.isPlayer && !fam.has(p.id) && ageYears(p) >= 66 && REGIONS[d.region].places.includes(p.place ?? 'ern'));
  if (!old.length || !rng.chance(0.35 * d.sev + 0.1)) return;
  const p = rng.pick(old);
  kill(g, p, KINDS[d.kind].name);
}

// 가을걷이: 레오니아의 빵이 나는 땅이 얼마나 거뒀나
function harvest(g, rng, say, record) {
  const N = NS(g);
  const avg = BREADBASKET.reduce((a, r) => a + N.crop[r], 0) / BREADBASKET.length;
  const w = g.world;
  if (avg < 0.85) {
    N.lean += 1;
    if (w) { w.famine = true; w.famineMonths = Math.max(w.famineMonths ?? 0, avg < 0.65 ? 14 : 10); }
    say(avg < 0.65 ? '가을이 왔지만 거둘 것이 없다. 큰 흉년이다. 곡식 상인들이 곳간 문을 걸어 잠갔다.' : '올해 밀은 반쯤 여물다 말았다. 흉년이다. 겨울이 길 것이다.', true);
    record(N.lean >= 2 ? `${N.lean}해째 이어진 흉년` : '흉년');
    nlog(g, `흉년 (소출 평년의 ${Math.round(avg * 100)}%).`);
    if (N.lean >= 2 && g.realm) {
      // 굶주림이 이어지면 뒷골목이 커지고 왕실 다툼에 불이 붙는다
      g.realm.blackGlove = clamp(g.realm.blackGlove + 6, 0, 100);
      if (g.realm.succession === 'contest') g.realm.rudolf.support = clamp(g.realm.rudolf.support + (rng.chance(0.5) ? 5 : -5), 0, 100);
      chron(g, `레오니아에 ${N.lean}해째 흉년이 이어지다. 굶주린 사람들이 도시로 몰리다.`, 90);
    }
  } else {
    N.lean = 0;
    if (avg >= 1.08) {
      say('풍년이다. 곳간마다 밀이 넘친다. 장터의 빵값이 내려앉았다.');
      if (g.realm) g.realm.bread = clamp(g.realm.bread - 0.08, 0.6, 3);
      nlog(g, '풍년.');
    }
  }
  // 영지의 가을: 거둔 만큼 금고와 민심이 움직인다
  const dm = g.domain;
  if (dm && REGIONS[regionOf(dm.place)]?.farm) {
    const c = N.crop[regionOf(dm.place)];
    dm.treasury = Math.max(0, Math.round(dm.treasury + dm.pop * 0.06 * (c - 1)));
    dm.morale = clamp(dm.morale + Math.round((c - 1) * 18), 0, 100);
  }
}

WORLD_TICKS.push((g, worldRng, say, record) => {
  if (!g.nature) return;
  const N = g.nature;
  const rng = makeRng({ s: ((g.rngState?.s ?? 7) ^ Math.imul(mi(g) + 13, 2246822519)) | 0 });
  const m = g.date.month;
  // 봄: 올해의 하늘이 정해진다
  if (m === 3) {
    for (const r of REGION_IDS) N.crop[r] = clamp(1 + rng.normal(0, 0.08), 0.8, 1.2);
    for (const k of Object.keys(N.dike)) if (N.dike[k] < g.date.year) delete N.dike[k];
  }
  // 이미 벌어진 재앙
  for (const d of N.active) {
    d.left -= 1;
    if (d.kind === 'drought') N.crop[d.region] = clamp(N.crop[d.region] - 0.03 * d.sev, 0.2, 1.4);
  }
  for (const d of N.active.filter((x) => x.left <= 0)) {
    const K = KINDS[d.kind];
    const home = homeRegion(g);
    if (d.sev >= 0.5 && home !== d.region) say(`${REGIONS[d.region].name}의 ${J(K.name, '이/가')} 끝났다고 한다.`);
    else if (d.sev >= 0.5) say(`${REGIONS[d.region].name}의 ${J(K.name, '이/가')} 끝났다. ${{ drought: '마침내 비가 왔다. 사람들이 맨발로 빗속에 나와 섰다.', flood: '물이 빠졌다. 들판에 진흙과 죽은 가축이 남았다.', winter: '얼음이 풀렸다. 봄이 왔다는 것을 아직 아무도 믿지 않는다.', quake: '땅이 잠잠해졌다. 무너진 집터에서 사람들이 쓸 만한 것을 골라낸다.', locust: '메뚜기 떼가 북쪽으로 날아갔다. 남은 것은 줄기와 굶주림이다.', storm: '바람이 잦아들었다. 부서진 배들을 끌어올리는 데 한 달이 걸릴 것이다.' }[d.kind]}`);
    N.past.push({ kind: d.kind, region: d.region, sev: d.sev, y: d.start.y, m: d.start.m });
  }
  N.active = N.active.filter((x) => x.left > 0);
  if (N.past.length > MAX_PAST) N.past.splice(0, N.past.length - MAX_PAST);
  // 새 재앙
  for (const [kind, K] of Object.entries(KINDS)) {
    if (K.months && !K.months.includes(m)) continue;
    for (const [region, p0] of Object.entries(K.odds)) {
      if (N.active.some((d) => d.region === region && d.kind === kind)) continue;
      let p = p0;
      if (K.afterDrought && N.past.concat(N.active).some((d) => d.kind === 'drought' && d.region === region && (d.start?.y ?? d.y) === g.date.year)) p *= K.afterDrought;
      if (rng.chance(p)) startDisaster(g, kind, region, rng.float(0.3, 1), rng, say, record);
    }
  }
  // 가을걷이
  if (m === 10) harvest(g, rng, say, record);
});

export { cropWord };
