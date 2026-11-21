// 30단계: 세상의 소리가 들리게. 먼 곳의 일이 전령·벽보·장터 소문·상인·순례자·뱃사람·음유시인을 타고 늦게, 조금씩 틀리게 닿는다.
// 고장마다 그달의 거리 풍경 한 줄, 철마다 축제와 풍습, 시대가 바뀌는 것이 일상에서 보이게. 새 행동은 없다.
// 화면용: streetLine(g) 거리 풍경 한 줄, rumorLines(g) 이번 달 들려온 소식 [{ text, via, wrong, fix }], feastLine(g), rumorInfo(g)
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { ERAS } from '../world.js';
import { RS, mi, here, dist, isTown, isPort, realmAt, rumorRng, placeName, fill } from './state.js';
import { KINDS, take, diff, originOf } from './facts.js';
import { streetPick, feastAt } from './street.js';

export { KINDS as RUMOR_KINDS } from './facts.js';
export { feastAt, streetCandidates, weatherOf } from './street.js';
export { dist as rumorDist } from './state.js';
export const rumorState = RS;

// 소식이 오는 길. speed: 길 한 칸(links 값 1)마다 걸리는 달, wrong: 틀리게 들릴 확률
export const VIA = {
  herald: { name: '전령', speed: 0.4, wrong: 0 },
  poster: { name: '벽보', speed: 0.4, wrong: 0 },
  sheet: { name: '소식지', speed: 0.3, wrong: 0 },
  signal: { name: '전신탑', speed: 0, wrong: 0 },
  market: { name: '장터 소문', speed: 0.5, wrong: 0.6 },
  trader: { name: '상인', speed: 0.6, wrong: 0.35 },
  pilgrim: { name: '순례자', speed: 0.8, wrong: 0.3 },
  sailor: { name: '뱃사람', speed: 0.5, wrong: 0.5 },
  bard: { name: '음유시인', speed: 0, wrong: 1 },
};
const invented = (g, id) => !!g.history?.inventions?.includes(id);
const LEONIA_SIGNAL = ['harfen', 'leocast'];

function label(g, via, f, pl) {
  const from = placeName(f.pl);
  switch (via) {
    case 'herald': return isTown(pl) ? '영주의 전령이 광장에서 읽은 포고' : '말 탄 전령이 마을 어귀에서 외친 말';
    case 'poster': return '성문에 붙은 벽보';
    case 'sheet': return '찍어 낸 소식지';
    case 'signal': return '전신탑으로 하루 만에 온 소식';
    case 'trader': return `${from} 쪽에서 온 상인 말로는`;
    case 'pilgrim': return '성도에서 돌아온 순례자들 말로는';
    case 'sailor': return '배에서 내린 뱃사람들 말로는';
    case 'bard': return '음유시인의 노래';
    default: return isTown(pl) ? rumorRng(g, f.id).pick(['장터에서 도는 말', '주점에서 들은 말', '우물가에서 도는 말']) : rumorRng(g, f.id).pick(['우물가에서 도는 말', '들일 하다 들은 말', '방앗간에서 도는 말']);
  }
}
const viaShort = (v) => VIA[v]?.name ?? '소문';

// 바른 소식이 오는 길과 때 (나라가 알리는 일은 레오니아 안에서만 전령·벽보로, 그 밖은 상인 말이 바른 소식 노릇을 한다)
function officialRoute(g, f, pl, d) {
  const K = KINDS[f.k];
  if (K.official && realmAt(pl) === 'leonia' && realmAt(f.pl) === 'leonia') {
    if (invented(g, 'signal') && LEONIA_SIGNAL.includes(pl)) return { via: 'signal', at: f.at + (d > 0 ? 1 : 0) };
    const via = isTown(pl) ? (invented(g, 'press') ? 'sheet' : 'poster') : 'herald';
    return { via, at: f.at + Math.ceil(d * VIA[via].speed) + 1 };
  }
  if (f.wrong >= 0 && f.fixRoll) return { via: 'trader', at: f.at + Math.ceil(d * 0.6) + 3 };
  return null;
}

/** 새 사실 하나를 세상에 둔다 (테스트·다른 갈래가 직접 넣을 때도 씀) */
export function addFact(g, k, d = {}, at = mi(g)) {
  if (!KINDS[k]) return null;
  const R = RS(g), rng = rumorRng(g, R.seq * 13 + 5);
  const f = { id: R.seq++, k, d, at, big: !!KINDS[k].big, h1: false, h2: false, wrong: -1, fixRoll: rng.chance(0.5) };
  f.pl = originOf(f, g);
  const realm = realmAt(f.pl);
  f.via = realm === 'holy' ? 'pilgrim' : isPort(f.pl) || realm === 'sea' || realm === 'free' ? 'sailor' : rng.chance(0.55) ? 'market' : 'trader';
  R.facts.push(f);
  if (k === 'king_dead') R.mourn = at;
  if (k === 'invention') (R.invAt ??= {})[d.id] = at;
  if (f.big && KINDS[k].song) { R.legends.push({ k, d, y: g.date.year }); if (R.legends.length > 24) R.legends.shift(); }
  if (R.facts.length > 60) R.facts.splice(0, R.facts.length - 60);
  return f;
}

// 이번 달 이 고장에 닿는 것들
function deliver(g, rng, pl) {
  const R = RS(g), now = mi(g), due = [];
  for (const f of R.facts) {
    if (f.h2) continue;
    if (KINDS[f.k].only && realmAt(pl) !== KINDS[f.k].only) continue;
    const d = dist(f.pl, pl);
    if (d === 0 && !f.h1) { f.h1 = true; f.h2 = true; f.off = true; continue; }
    const off = officialRoute(g, f, pl, d);
    if (!f.h1) {
      const rAt = f.at + Math.max(1, Math.ceil(d * VIA[f.via].speed));
      if (off && off.at <= rAt) { if (now >= off.at) due.push({ f, via: off.via, kind: 'true' }); }
      else if (now >= rAt) due.push({ f, via: f.via, kind: 'rumor' });
    } else if (off && now >= off.at) {
      if (f.wrong >= 0) due.push({ f, via: off.via, kind: 'fix' }); else f.h2 = true;
    } else if (!off && f.wrong < 0) f.h2 = true;
  }
  due.sort((a, b) => (b.f.big - a.f.big) || (a.kind === 'fix') - (b.kind === 'fix') || a.f.at - b.f.at);
  const out = [];
  for (const x of due.slice(0, 2)) {
    const { f } = x, K = KINDS[f.k];
    const via = x.via === 'sailor' && !isPort(pl) ? 'trader' : x.via;
    const lb = label(g, via, f, pl);
    let text, wrong = false, fix = false;
    if (x.kind === 'rumor') {
      f.h1 = true;
      if (K.wrong?.length && rng.chance(VIA[via].wrong)) { f.wrong = rng.int(0, K.wrong.length - 1); f.wvia = via; wrong = true; text = K.wrong[f.wrong](f.d, g, rng); }
      else { text = K.truth(f.d, g); if (!officialRoute(g, f, pl, dist(f.pl, pl))) f.h2 = true; }
    } else if (x.kind === 'true') { f.h1 = true; f.h2 = true; text = K.truth(f.d, g); }
    else {
      f.h2 = true; fix = true;
      const from = `${viaShort(f.wvia)}${f.wvia === 'market' ? '으로' : '에게서'}`;
      text = `${K.truth(f.d, g)} ${rng.pick([`앞서 ${from} 들은 말과는 달랐다.`, '처음 돌던 말은 한참 부풀려진 것이었다.', `${from} 들은 말은 반쯤만 맞았다.`, '먼저 돈 말을 옮긴 사람들이 머쓱해했다.'])}`;
    }
    const line = `${lb}: ${text}`;
    out.push({ text: line, via: viaShort(via), k: f.k, fid: f.id, wrong, fix, ago: now - f.at });
  }
  // 오래된 사실은 잊힌다 (큰일은 노래로 남는다)
  R.facts = R.facts.filter((f) => !(f.h2 && now - f.at > 6) && now - f.at <= 48);
  return out;
}

// 음유시인: 몇 해 지난 큰일을 부풀려 노래한다
function song(g, rng, pl) {
  const R = RS(g);
  if (!isTown(pl) && !PLACES[pl]?.inn) return null;
  if (mi(g) - (R.sungAt ?? 0) < 18 || !rng.chance(0.08)) return null;
  const old = R.legends.filter((x) => g.date.year - x.y >= 4 && x.k !== R.lastSong && (x.sung ?? 0) < 2);
  if (!old.length) return null;
  const x = rng.pick(old), K = KINDS[x.k];
  R.sungAt = mi(g); R.lastSong = x.k; x.sung = (x.sung ?? 0) + 1;
  const years = g.date.year - x.y;
  return { text: `${label(g, 'bard', { pl }, pl)}: ${K.song(x.d, g)} ${years}년 전 일이다.`, via: '음유시인', k: x.k, fid: null, wrong: true, fix: false, ago: years * 12 };
}

export function rumorMonth(g) {
  if (!g.date || g.over) return;
  const R = RS(g);
  const snap = take(g);
  if (!R.snap) { R.snap = snap; } else {
    for (const x of diff(g, R.snap, snap)) addFact(g, x.k, x.d, mi(g) - 1);
    R.snap = snap;
  }
  const pl = here(g), rng = rumorRng(g, 3);
  const heard = deliver(g, rng, pl);
  const s = song(g, rng, pl);
  if (s) heard.push(s);
  for (const h of heard) R.heard.push({ y: g.date.year, m: g.date.month, ...h });
  if (R.heard.length > 30) R.heard.splice(0, R.heard.length - 30);
  const st = streetPick(g, rumorRng(g, 11), pl, R.recent);
  R.recent.push(st.key);
  if (R.recent.length > 10) R.recent.shift();
  const fe = feastAt(g, pl);
  R.now = { mi: mi(g), pl, street: st.text, skey: st.key, feast: fe, heard };
}
HOOKS.afterMonth.push((g) => rumorMonth(g));
HOOKS.heir.push((g) => { fill(g); }); // 소문은 집안을 넘어 그대로 (세상 일이니까)

/* ---------- 화면용 ---------- */
const fresh = (g) => { const n = g.rumor?.now; return n && n.mi === mi(g) && n.pl === here(g) ? n : null; };
/** 이 고장 이달 거리 풍경 한 줄 */
export function streetLine(g) {
  if (!g?.date) return null;
  const n = fresh(g);
  if (n) return n.street;
  return streetPick(g, rumorRng(g, 11), here(g), g.rumor?.recent ?? []).text;
}
/** 이번 달 들려온 소식·소문 [{ text, via, wrong, fix }] (없으면 빈 배열) */
export function rumorLines(g) {
  const n = fresh(g);
  return n ? n.heard.map((h) => ({ text: h.text, via: h.via, wrong: !!h.wrong, fix: !!h.fix })) : [];
}
/** 이달 이 고장 축제 한 줄 (없으면 null) */
export function feastLine(g) {
  if (!g?.date) return null;
  const f = fresh(g)?.feast ?? feastAt(g, here(g));
  return f ? `${f.name}: ${f.text}` : null;
}
/** 화면 한 장: { place, placeName, street, feast{name,text}|null, heard[], recent[](최근 들은 것 10), era, waiting(아직 닿지 않은 먼 소식 수) } */
export function rumorInfo(g) {
  const R = RS(g), pl = here(g);
  return {
    place: pl, placeName: placeName(pl), street: streetLine(g), feast: fresh(g)?.feast ?? feastAt(g, pl),
    heard: rumorLines(g),
    recent: R.heard.slice(-10).reverse().map((h) => ({ y: h.y, m: h.m, text: h.text, via: h.via, wrong: !!h.wrong, fix: !!h.fix })),
    era: ERAS[g.realm?.era ?? 0]?.name ?? '',
    waiting: R.facts.filter((f) => !f.h1).length,
  };
}
