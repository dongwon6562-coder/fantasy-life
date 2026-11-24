// 피난과 이주의 한 달: 밀어내는 힘이 커진 고장에서 행렬이 떠나고, 길 위에 있다가, 받아 주는 고장에 거리를 이루거나 성문 밖에 난민촌을 친다.
// 난민촌은 겨울에 줄고, 일부는 안으로 들어가고, 일부는 더 떠나고, 고향이 잠잠해지면 돌아간다. 이주민 거리는 텃세로 부딪치다 세대가 지나며 섞인다.
import { WORLD_TICKS } from '../world.js';
import { J } from '../narrative/text.js';
import { travelMonths } from '../places.js';
import { activeAt } from '../nature/state.js';
import { regionOf } from '../nature/state.js';
import { MS, MG_PLACES, WHY, baseOf, realmOf, placeName, mlog, pastPush, quarterName, mgRng, clamp, mi } from './state.js';

const FRONT = ['gruental', 'verden', 'harfen'];
const winter = (g) => g.date.month === 12 || g.date.month <= 2;

/** 이 고장을 밀어내는 힘 { v(0~100), why } */
export function pushAt(g, pl) {
  const S = MS(g), parts = [];
  const add = (why, v) => { if (v > 0) parts.push([why, v]); };
  if (g.occ?.places?.[pl]) add('occupied', 34);
  if (g.realm?.balhart?.war && FRONT.includes(pl)) add('war', 14);
  if (g.realm?.north?.war && ['graubel', 'hammer', 'gorge'].includes(pl)) add('war', 12);
  const ruin = g.aftermath?.ruins?.[pl];
  if (ruin?.damage > 0) add('ruin', ruin.damage * 0.45);
  if (S.burn[pl] != null && mi(g) - S.burn[pl] <= 3) add('dragon', 55);
  const cal = g.nature ? activeAt(g, pl).reduce((a, d) => Math.max(a, d.sev ?? 0), 0) : 0;
  add('calamity', cal * 30);
  const reg = regionOf(pl);
  const plg = (g.health?.outbreaks ?? []).filter((o) => o.region === reg).reduce((a, o) => Math.max(a, (o.sev ?? 0) * (o.kind === 'plague' ? 1.4 : 0.6)), 0);
  add('plague', plg * 25);
  const lv = g.wilds?.land?.[pl]?.level ?? 0;
  add('monsters', Math.max(0, lv - 60) * 0.7);
  if (g.world?.famine) add('famine', baseOf(pl) <= 1200 ? 12 : 5);
  if (!parts.length) return { v: 0, why: null };
  parts.sort((a, b) => b[1] - a[1]);
  return { v: clamp(parts[0][1] + parts.slice(1).reduce((a, p) => a + p[1] * 0.4, 0), 0, 100), why: parts[0][0] };
}

// 성문을 열어 줄까: 사람이 넘치거나 흉년이거나 점령지면 닫는다. 누가 열자고 말하면(open) 한동안 연다
export function gateOpen(g, pl) {
  const S = MS(g);
  if (S.open[pl] != null && S.open[pl] >= mi(g)) return true;
  if (S.open[pl] != null && S.open[pl] < 0 && -S.open[pl] >= mi(g)) return false; // 닫자고 한 곳
  if (g.occ?.places?.[pl]) return false;
  if (g.realm?.balhart?.war && FRONT.includes(pl)) return false; // 전선 가까운 성은 첩자를 막는다며 닫는다
  const full = (S.pop[pl] ?? baseOf(pl)) / baseOf(pl);
  if (full > 1.2) return false;
  if (g.world?.famine && full > 1.05) return false;
  return true;
}

// 행렬이 갈 곳: 가깝고, 잠잠하고, 크고, 같은 나라면 더 좋다
export function pickRefuge(g, from, rng) {
  const S = MS(g), here = realmOf(from);
  const cands = MG_PLACES.filter((p) => p !== from && (S.push[p] ?? 0) < 15).map((p) => {
    const t = travelMonths(from, p);
    if (!(t >= 1 && t <= 3)) return null;
    return [p, Math.sqrt(baseOf(p)) / 10 + (realmOf(p) === here ? 6 : 0) - t * 3 + rng.float(0, 4)];
  }).filter(Boolean).sort((a, b) => b[1] - a[1]);
  return cands[0]?.[0] ?? null;
}

function settleInto(g, to, from, size) {
  const S = MS(g), list = (S.quarters[to] ??= []);
  const q = list.find((x) => x.from === from && x.mix < 60);
  if (q) q.size += size; else list.push({ from, size, since: mi(g), mix: 0, tension: 8 });
  S.pop[to] = (S.pop[to] ?? baseOf(to)) + size;
}

export function migrateMonth(g, say) {
  if (!g.migrate || !g.date) return;
  const S = MS(g), rng = mgRng(g, 3), now = mi(g);
  // 용이 불태운 고장 (용 기록에서 이번 달 것만 읽는다)
  for (const x of (g.dragon?.log ?? []).slice(-4)) if (x.y * 12 + x.m === now && /불태웠다/.test(x.text)) for (const p of MG_PLACES) if (x.text.includes(placeName(p))) S.burn[p] = now;
  // 떠나는 행렬
  for (const pl of MG_PLACES) {
    const { v, why } = pushAt(g, pl), was = S.push[pl] ?? 0;
    S.push[pl] = v;
    if (!why || v < 18 || now - (S.lastFlow[pl] ?? -99) < 6) continue;
    const shock = v - was >= 22;
    if (!(shock ? rng.chance(0.75) : rng.chance((v - 18) / 900))) continue;
    const to = pickRefuge(g, pl, rng);
    if (!to) continue;
    const pop = S.pop[pl] ?? baseOf(pl), size = Math.round(pop * clamp(v / 260 + rng.float(0, 0.05), 0.03, 0.35));
    if (size < 30) continue;
    S.pop[pl] = pop - size; S.lastFlow[pl] = now;
    const f = { id: S.seq++, from: pl, to, why, size, left: Math.max(1, travelMonths(pl, to)), at: now };
    S.flows.push(f);
    if (S.flows.length > 12) S.flows.shift();
    say(`${placeName(pl)} 사람 ${size}명이 ${WHY[why].flee} ${placeName(to)} 쪽으로 길을 떠났다. 수레에 이불과 솥을 싣고, 아이들은 염소를 끌고 간다.`, size >= 400);
    mlog(g, `${placeName(pl)}에서 ${J(WHY[why].name, '을/를')} 피해 ${size}명이 ${placeName(to)} 쪽으로 떠났다.`);
  }
  // 길 위의 행렬
  for (const f of [...S.flows]) {
    if (--f.left > 0) { if (winter(g)) f.size = Math.max(0, f.size - Math.round(f.size * 0.02)); continue; }
    S.flows = S.flows.filter((x) => x !== f);
    if (f.size < 10) continue;
    if (gateOpen(g, f.to) && f.size < baseOf(f.to) * 0.12) {
      settleInto(g, f.to, f.from, f.size);
      mlog(g, `${placeName(f.from)}에서 온 ${f.size}명이 ${placeName(f.to)}에 자리를 잡았다.`);
      if (f.size >= 300) say(`${placeName(f.to)} 성벽 아래 빈터에 ${placeName(f.from)} 사람들이 판잣집을 올리기 시작했다. 사람들은 그 골목을 벌써 '${placeName(f.from)} 거리'라 부른다.`);
    } else {
      const c = (S.camps[f.to] ??= { from: f.from, why: f.why, size: 0, since: now });
      c.size += f.size;
      say(`${placeName(f.to)} 성문이 피난민 앞에서 닫혔다. ${placeName(f.from)} 사람들은 성벽 밖 개울가에 천막을 쳤다. 밤마다 그쪽에서 모닥불이 수십 개씩 탄다.`, true);
      mlog(g, `${placeName(f.to)} 성문 밖에 난민촌이 섰다.`);
    }
  }
  // 난민촌
  for (const [pl, c] of Object.entries(S.camps)) {
    const pr = mgRng(g, 41 + pl.length * 7);
    if (winter(g)) { const lost = Math.round(c.size * pr.float(0.01, 0.04)); c.size -= lost; if (lost >= 20 && pr.chance(0.3)) say(`${placeName(pl)} 성 밖 난민촌에서 밤사이 얼어 죽은 사람이 ${lost}명이라고 한다. 성안 신전이 장작을 실어 보냈다.`); }
    const homeCalm = (S.push[c.from] ?? 0) < 12;
    if (gateOpen(g, pl) && pr.chance(0.25)) { const n = Math.round(c.size * 0.2); settleInto(g, pl, c.from, n); c.size -= n; }
    if (homeCalm && now - c.since >= 6 && pr.chance(0.35)) { const n = Math.round(c.size * 0.25); c.size -= n; S.pop[c.from] = (S.pop[c.from] ?? 0) + n; if (n >= 50) say(`${placeName(pl)} 성 밖 난민촌에서 ${n}명이 짐을 꾸려 ${J(placeName(c.from), '으로/로')} 돌아갔다. 남은 사람들이 길모퉁이까지 따라 나와 손을 흔들었다.`); }
    if (pr.chance(0.06)) c.size -= Math.round(c.size * 0.1); // 더 먼 데로 떠난다
    if (c.size < 25) {
      pastPush(g, { kind: 'camp', place: pl, from: c.from, why: c.why, fromY: Math.floor(c.since / 12), toY: g.date.year });
      delete S.camps[pl];
      mlog(g, `${placeName(pl)} 성 밖 난민촌이 비었다.`);
    }
  }
  // 이주민 거리: 텃세와 섞임
  for (const [pl, list] of Object.entries(S.quarters)) {
    const full = (S.pop[pl] ?? baseOf(pl)) / baseOf(pl);
    for (const q of [...list]) {
      const pr = mgRng(g, 59 + q.since % 97);
      q.mix = clamp(q.mix + 0.1 + (q.size < 200 ? 0.05 : 0), 0, 100);
      q.tension = clamp(q.tension + (g.world?.famine ? 0.6 : 0) + (full > 1.15 ? 0.4 : 0) - 0.25 - q.mix * 0.003 + pr.normal(0, 0.3), 0, 100);
      if (q.tension >= 55 && pr.chance(0.05)) {
        say(pr.pick([`${placeName(pl)} 장터에서 토박이 젊은이들과 ${placeName(q.from)} 사람들 사이에 주먹다짐이 났다. 좌판 셋이 엎어졌다.`, `${placeName(pl)}에서 ${quarterName(q)} 우물에 누가 죽은 개를 던져 넣었다. 영주관이 순찰을 늘렸다.`, `${placeName(pl)} 길드가 ${placeName(q.from)} 사람은 도제로 받지 않겠다고 못 박았다.`]));
        q.tension -= 20;
        mlog(g, `${placeName(pl)}의 ${quarterName(q)}에서 텃세 다툼이 났다.`);
      }
      // 고향이 잠잠하면 조금씩 돌아간다 (처음 십 년 안에)
      if ((S.push[q.from] ?? 0) < 10 && now - q.since < 120 && pr.chance(0.03)) { const n = Math.round(q.size * 0.1); q.size -= n; S.pop[pl] -= n; S.pop[q.from] = (S.pop[q.from] ?? 0) + n; }
      if (q.mix >= 100 || q.size < 15) {
        if (q.mix >= 100) say(`${placeName(pl)}의 ${J(quarterName(q), '은/는')} 이제 아무도 그렇게 부르지 않는다. 할아버지 대에 ${placeName(q.from)}에서 왔다는 이야기만 집집마다 남았다.`);
        pastPush(g, { kind: 'quarter', place: pl, from: q.from, fromY: Math.floor(q.since / 12), toY: g.date.year, end: q.mix >= 100 ? 'mixed' : 'left' });
        list.splice(list.indexOf(q), 1);
      }
    }
    if (!list.length) delete S.quarters[pl];
  }
  // 사람 수는 천천히 평소로 돌아온다 (아이가 나고, 사람이 죽고)
  for (const pl of MG_PLACES) { const b = baseOf(pl); S.pop[pl] = Math.max(Math.round(b * 0.2), (S.pop[pl] ?? b) + (b - (S.pop[pl] ?? b)) * 0.004); }
}

WORLD_TICKS.push((g, worldRng, say) => migrateMonth(g, say));
