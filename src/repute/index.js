// 10단계: 평판과 소문.
// 고장마다 나를 아는 정도(fame)와 평(정직·자비·씀씀이·의리·용기)이 따로 있다.
// 한 일은 그 자리에서 소문이 되어 이웃 고장으로 번진다. 입이 가벼운 사람과 장터·여관이 있는 곳에서 빨리 돈다.
// 나를 미워하는 사람은 거짓 소문을 퍼뜨리고, 나는 해명하거나 출처를 캐거나 맞소문을 낼 수 있다.
// 평판은 사람들의 대접(호감), 장터 값, 믿음이 필요한 일자리, 혼담에 닿는다. 대를 이으면 가문 평판 일부가 남는다.
// 기존 renown(이름값)·notoriety(악명)는 그대로 두고, 그 움직임을 읽어 고장의 평으로 옮긴다.
// 상태는 game.repute 하나. 화면 연결점: reputeInfo(g), opinionAt(g, place), fameAt(g, place), nickname(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { makePerson, byId, fullName, has, ageYears, living } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, up, gains, spend, check } from '../adventure/core.js';
import { PLACES, travelMonths } from '../places.js';
import { WORK } from '../jobs.js';
import { addAffinity, marry, remember } from '../relations.js';
import { isJailed, crimeState } from '../crime.js';
import { AXES, AXIS_IDS, NICKS, fameWord, DEEDS, CRIME_DEEDS, LIES, SLANDERS, MARKETS, TRUST_SKILLS, TRUST_NPC_JOBS } from './data.js';

export { AXES, fameWord };
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place;
const placeNm = (id) => PLACES[id]?.name ?? '먼 곳';
const open = (id) => PLACES[id] && !PLACES[id].hidden;

/* ---------- 상태 ---------- */
export function reputeState(g) {
  g.repute ??= {};
  const r = g.repute;
  r.base ??= {};       // 고장 → { 결: 값 } 사람들이 기억하는 평
  r.fame ??= {};       // 고장 → 아는 정도 0~100
  r.rumors ??= [];     // [{ id, axis, val, text, from, at, str: { 고장: 세기 }, lie, src, known, folded }]
  r.nick ??= null;     // { name, place, at }
  r.seq ??= 1;
  r.snap ??= null;     // 지난달 값 (이름값, 악명, 쓰러뜨린 적, 죄 기록 수)
  r.sceneAt ??= 0;
  r.feastAt ??= 0;
  r.boastAt ??= 0;
  return r;
}
const R = reputeState;
const baseAt = (g, pl) => (R(g).base[pl] ??= {});
export const fameAt = (g, pl = here(g)) => Math.round(R(g).fame[pl] ?? 0);
function addFame(g, pl, n) { if (!open(pl)) return; R(g).fame[pl] = clamp((R(g).fame[pl] ?? 0) + n, 0, 100); }

// 그 고장 사람들이 보는 나: 기억된 평 + 지금 도는 소문
export function opinionAt(g, pl = here(g)) {
  const out = {};
  const b = R(g).base[pl] ?? {};
  for (const a of AXIS_IDS) out[a] = b[a] ?? 0;
  for (const r of R(g).rumors) { const s = r.str[pl]; if (s) out[r.axis] += r.val * s / 100; }
  for (const a of AXIS_IDS) out[a] = Math.round(clamp(out[a], -100, 100));
  return out;
}
export function axisWord(axis, v) {
  const d = AXES[axis];
  if (Math.abs(v) < 12) return null;
  const lv = Math.abs(v) < 30 ? 0 : Math.abs(v) < 60 ? 1 : 2;
  return v > 0 ? d.good[lv] : d.bad[lv];
}
// 좋은 평과 나쁜 평의 합 (대접·혼담에 쓴다)
export function goodness(g, pl = here(g)) {
  const o = opinionAt(g, pl);
  return Math.round((o.honest + o.kind + o.generous + o.loyal + o.brave * 0.5) / 4.5);
}

/* ---------- 한 일이 소문이 된다 ---------- */
export function deed(g, axis, val, text, pl = here(g), { lie = false, src = null } = {}) {
  if (!AXES[axis] || !open(pl) || !Number.isFinite(val) || !val) return null;
  const r = R(g);
  const b = baseAt(g, pl);
  // 그 자리에서 본 사람들은 바로 기억한다
  if (!lie) b[axis] = clamp((b[axis] ?? 0) + val * 0.35, -100, 100);
  addFame(g, pl, Math.min(6, Math.abs(val) * 0.25));
  if (!text || Math.abs(val) < 3) return null;
  // 같은 고장에서 같은 쪽으로 최근에 돈 소문이 있으면 거기에 보탠다
  const now = mi(g);
  const same = r.rumors.find((x) => x.axis === axis && x.from === pl && !x.lie && !lie && Math.sign(x.val) === Math.sign(val) && now - x.at <= 4);
  if (same) { same.val = clamp(same.val + val * 0.5, -40, 40); same.str[pl] = 100; same.at = now; return same; }
  const rumor = { id: r.seq++, axis, val: clamp(val, -40, 40), text, from: pl, at: now, str: { [pl]: lie ? 70 : 100 }, lie, src, known: !lie };
  r.rumors.push(rumor);
  if (r.rumors.length > 30) { const old = r.rumors.shift(); fold(g, old); }
  return rumor;
}
// 다 잦아든 소문은 사람들 기억에 조금 남는다
function fold(g, rumor) {
  if (rumor.folded) return;
  rumor.folded = true;
  for (const [pl, s] of Object.entries(rumor.str)) {
    const b = baseAt(g, pl);
    b[rumor.axis] = clamp((b[rumor.axis] ?? 0) + rumor.val * (rumor.lie ? 0.12 : 0.3) * Math.max(0.3, s / 100), -100, 100);
  }
}

/* ---------- 이웃 고장 ---------- */
let NEAR = null;
function nearOf(pl) {
  if (!NEAR) {
    NEAR = {};
    const ids = Object.keys(PLACES).filter(open);
    for (const a of ids) NEAR[a] = ids.filter((b) => b !== a && travelMonths(a, b) <= 1);
  }
  return NEAR[pl] ?? [];
}
// 입이 가벼운 사람이 많을수록 빨리 돈다
function gossipBoost(g, pl) {
  let n = MARKETS[pl] ?? 0;
  const gossips = living(g).filter((p) => !p.isPlayer && has(p, 'gossip') && (p.place ?? 'ern') === pl).length;
  return n * 0.15 + Math.min(0.3, gossips * 0.05);
}

/* ---------- 상태 읽기 (화면용) ---------- */
export function nickname(g) { return R(g).nick?.name ?? null; }
export function reputeInfo(g) {
  const r = R(g);
  const pl = traveling(g) ? L(g).travel?.to ?? here(g) : here(g);
  const o = opinionAt(g, pl);
  const axes = AXIS_IDS.map((a) => ({ id: a, name: AXES[a].name, val: o[a], word: axisWord(a, o[a]) }));
  const places = Object.keys(r.fame).filter((p) => open(p) && r.fame[p] >= 5).sort((a, b) => r.fame[b] - r.fame[a]).map((p) => {
    const op = opinionAt(g, p);
    const top = AXIS_IDS.slice().sort((a, b) => Math.abs(op[b]) - Math.abs(op[a]))[0];
    return { id: p, name: placeNm(p), fame: fameAt(g, p), fameWord: fameWord(fameAt(g, p)), word: axisWord(top, op[top]), good: goodness(g, p) };
  });
  const rumors = r.rumors.filter((x) => (x.str[pl] ?? 0) >= 10 && (x.known || !x.lie)).sort((a, b) => (b.str[pl] ?? 0) - (a.str[pl] ?? 0)).slice(0, 6).map((x) => ({
    id: x.id, text: x.text, axis: x.axis, good: x.val > 0, strength: Math.round(x.str[pl] ?? 0), from: placeNm(x.from),
    lie: !!x.lie, source: x.lie && x.srcKnown ? byId(g, x.src)?.name ?? null : null,
    reach: Object.keys(x.str).length,
  }));
  return { place: pl, placeName: placeNm(pl), fame: fameAt(g, pl), fameWord: fameWord(fameAt(g, pl)), good: goodness(g, pl), axes, nick: r.nick?.name ?? null, nickPlace: r.nick ? placeNm(r.nick.place) : null, places, rumors };
}

/* ---------- 별명 ---------- */
function nickFor(g, pl) {
  if (fameAt(g, pl) < 30) return null;
  const o = opinionAt(g, pl);
  const top = AXIS_IDS.slice().sort((a, b) => Math.abs(o[b]) - Math.abs(o[a]))[0];
  if (Math.abs(o[top]) < 35) {
    const kills = L(g).stats?.kills ?? 0;
    return kills >= 40 && fameAt(g, pl) >= 45 ? '마물 사냥꾼' : null;
  }
  return NICKS[top][o[top] > 0 ? 0 : 1];
}

/* ---------- 매달: 한 일을 읽고, 소문이 번지고, 사람들이 대한다 ---------- */
let NAME_TO_ID = null;
HOOKS.afterActions.push((g, rng, results) => {
  if (!isAdult(g) || traveling(g)) return;
  NAME_TO_ID ??= Object.fromEntries(ACTIONS.map((a) => [a.name, a.id]));
  for (const res of results) {
    const id = NAME_TO_ID[res.name];
    const d = id && DEEDS[id];
    if (!d) continue;
    for (const [axis, val, text] of d) deed(g, axis, val * rng.float(0.7, 1.2), text);
  }
});

function snapshot(g) {
  const life = L(g);
  return { renown: life.renown ?? 0, noto: life.notoriety ?? 0, kills: life.stats?.kills ?? 0, crimes: crimeState(g).record.length, crimeTail: crimeState(g).record.at(-1)?.at ?? null, disgrace: g.court?.disgrace ?? 0 };
}
function readChanges(g, rng) {
  const r = R(g);
  const now = snapshot(g);
  const was = r.snap;
  r.snap = now;
  if (!was) return;
  const pl = here(g);
  if (now.renown > was.renown) { addFame(g, pl, (now.renown - was.renown) * 1.2); for (const n of nearOf(pl)) addFame(g, n, (now.renown - was.renown) * 0.3); }
  if (now.noto > was.noto) addFame(g, pl, (now.noto - was.noto) * 0.8);
  if (now.kills > was.kills) deed(g, 'brave', Math.min(8, (now.kills - was.kills) * 1.5), (now.kills - was.kills) >= 3 ? '혼자서 여럿을 베어 넘겼다더라' : null);
  // 새로 들킨 죄 (기록은 40개까지만 남으니 끝의 것들로 센다)
  const rec = crimeState(g).record;
  const fresh = now.crimes > was.crimes ? rec.slice(-(now.crimes - was.crimes)) : now.crimeTail !== was.crimeTail && now.crimeTail != null ? rec.slice(-1) : [];
  for (const c of fresh) for (const [axis, val, text] of CRIME_DEEDS[c.c] ?? []) deed(g, axis, val, text, c.place ?? pl);
  if (now.disgrace > was.disgrace && now.disgrace > mi(g)) { deed(g, 'honest', -10, '궁정에서 음모를 꾸미다 쫓겨났다더라', 'leocast'); deed(g, 'loyal', -5, null, 'leocast'); }
}

function spread(g, rng) {
  const r = R(g);
  const boosts = {};
  for (const x of r.rumors) {
    const cur = Object.entries(x.str);
    for (const [pl, s] of cur) {
      // 번지기
      const boost = (boosts[pl] ??= gossipBoost(g, pl));
      for (const n of nearOf(pl)) {
        if ((x.str[n] ?? 0) >= s * 0.6) continue;
        if (rng.chance(clamp(0.18 + boost + Math.abs(x.val) / 120, 0, 0.8))) { x.str[n] = Math.max(x.str[n] ?? 0, s * 0.6); addFame(g, n, Math.abs(x.val) * 0.12); }
      }
      // 잦아들기 (거짓은 더 빨리, 해명이 없으면 덜 빨리)
      x.str[pl] = s * (x.lie ? 0.93 : 0.955) - 0.4;
      if (x.str[pl] < 8) { const keep = x.str[pl]; delete x.str[pl]; const b = baseAt(g, pl); b[x.axis] = clamp((b[x.axis] ?? 0) + x.val * (x.lie ? 0.1 : 0.25) * 0.5, -100, 100); void keep; }
    }
  }
  r.rumors = r.rumors.filter((x) => Object.keys(x.str).length);
  // 이름은 천천히 잊힌다, 평은 아주 천천히 무뎌진다
  for (const pl of Object.keys(r.fame)) { r.fame[pl] = Math.max(0, r.fame[pl] - (pl === here(g) ? 0.05 : 0.15)); }
  for (const b of Object.values(r.base)) for (const a of AXIS_IDS) if (b[a]) b[a] *= 0.997;
}

HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const r = R(g);
  wrapJobs();
  readChanges(g, rng);
  spread(g, rng);
  if (!isAdult(g) || traveling(g) || isJailed(g)) return;
  const pl = here(g);
  const fame = fameAt(g, pl);
  // 부자인데 베풀지 않으면 인색하다는 말이 붙는다
  if (g.player.money > 400 && fame >= 20 && mi(g) - r.feastAt > 24 && rng.chance(0.05)) deed(g, 'generous', -4, '그렇게 벌면서 동전 한 닢 안 쓴다더라');
  // 별명
  const nick = nickFor(g, pl);
  if (nick && nick !== r.nick?.name) {
    r.nick = { name: nick, place: pl, at: mi(g) };
    g.news.unshift({ text: `${placeNm(pl)} 사람들이 나를 새 이름으로 부르기 시작했다: "${nick} ${g.player.name}".`, rel: 100 });
    note(g, `${placeNm(pl)}에서 별명이 붙었다: "${nick}".`);
  }
  // 대접: 평이 좋으면 덤을 주고, 나쁘면 바가지를 씌운다
  const gd = goodness(g, pl);
  if (fame >= 20 && Math.abs(gd) >= 20 && rng.chance(0.12)) {
    const n = rng.int(1, 3) + Math.floor(fame / 40);
    if (gd > 0) { g.player.money += n; g.news.unshift({ text: rng.pick(['여관 주인이 술값을 받지 않았다. "당신 같은 사람한테는 안 받소."', '장터 아낙이 덤을 얹어 주었다. 내 이름을 알고 있었다.', '대장장이가 칼을 갈아 주고 값을 깎아 주었다.']) + ` (은화 ${n}닢 아낌)`, rel: 100 }); }
    else { const lose = Math.min(g.player.money, n); g.player.money -= lose; g.news.unshift({ text: rng.pick(['장사꾼들이 값을 두 배로 불렀다. 내 얼굴을 알아본 것이다.', '여관 주인이 방이 없다고 하다가, 웃돈을 내자 방이 생겼다.', '빵집 주인이 거스름돈을 덜 주었다. 따지자 어깨를 으쓱했다.']) + (lose ? ` (은화 ${lose}닢 더 냄)` : ''), rel: 100 }); }
  }
  if (L(g).queue.length || mi(g) - r.sceneAt < 4) return;
  const fire = (kind, data) => { r.sceneAt = mi(g); queueScene(g, kind, data); };
  // 이곳에 거짓 소문이 돌고 있는데 내가 아직 모른다
  const lie = r.rumors.find((x) => x.lie && !x.known && (x.str[pl] ?? 0) >= 30);
  if (lie) { lie.known = true; return fire('repute_lie', { rid: lie.id }); }
  // 나를 미워하는 사람이 거짓 소문을 낸다
  if (fame >= 15) {
    const foes = living(g).filter((p) => !p.isPlayer && p.known && (p.affection <= -15 || p.bond === 'enemy'));
    const courtFoes = Object.values(g.court?.foes ?? {}).filter((v) => v >= 30).length;
    const ch = 0.006 + foes.length * 0.004 + courtFoes * 0.004 + fame / 4000;
    if (rng.chance(Math.min(0.05, ch))) {
      const [axis, val, text] = rng.pick(LIES);
      const src = foes.length ? rng.pick(foes) : null;
      deed(g, axis, val, text, pl, { lie: true, src: src?.id ?? null });
    }
  }
  // 혼담: 평이 좋고 이름이 알려졌으면 중매가 들어온다
  if (playerAge(g) >= 18 && playerAge(g) <= 40 && !me(g).spouseId && fame >= 20 && gd >= 15 && rng.chance(0.03 + gd / 1500)) return fire('repute_match', { seed: rng.int(1, 1e9), place: pl });
});

/* ---------- 거짓 소문 ---------- */
defineScene('repute_lie', {
  title: () => '도는 소문',
  text: (g, s) => {
    const x = R(g).rumors.find((y) => y.id === s.rid);
    return `장터에서 사람들이 나를 보고 수군거렸다. 귀를 기울여 보니, 내가 ${x.text.replace(/더라$/, '')}는 것이다. 그런 일은 없었다. ${(x.str[here(g)] ?? 0) >= 60 ? '벌써 모르는 사람이 없는 눈치다.' : '아직은 몇몇만 아는 것 같다.'}`;
  },
  choices: (g, s) => {
    const x = R(g).rumors.find((y) => y.id === s.rid);
    if (!x || !Object.keys(x.str).length) return [];
    const out = [{ label: '사람들 앞에서 해명한다', key: 'clear' }, { label: '누가 퍼뜨렸는지 캔다', key: 'hunt' }];
    if (x.srcKnown) out.push({ label: `${byId(g, x.src)?.name ?? '그자'}에 대한 맞소문을 낸다`, key: 'back' });
    out.push({ label: '무시한다', key: 'ignore' });
    return out;
  },
  resolve(g, rng, s, key) {
    const x = R(g).rumors.find((y) => y.id === s.rid);
    if (!x) return '소문은 이미 잦아들었다.';
    if (key === 'clear') return clearLie(g, rng, x);
    if (key === 'hunt') {
      tired(g, 6);
      if (x.src && check(rng, g.player.stats.sen * 0.5 + g.player.stats.int * 0.4 + fameAt(g) * 0.1, 40)) {
        const p = byId(g, x.src);
        x.srcKnown = true;
        for (const pl of Object.keys(x.str)) x.str[pl] *= 0.4;
        if (p) { p.affection = Math.min(p.affection, -25); remember(g, p, '나에 대한 헛소문을 퍼뜨렸다', -1, { tag: 'slander' }); }
        deed(g, 'honest', 3, null);
        return `술집 주인과 빨래터 아낙들을 거쳐 거슬러 올라가니 끝에 ${J(p ? fullName(p) : '누군가', '이/가')} 있었다. 사람들 앞에서 이름을 대자 소문은 힘을 잃었다. 이제 누가 거짓말쟁이인지 다들 안다.`;
      }
      return x.src ? '이 사람 저 사람에게 물었지만 다들 "어디서 들었더라" 하며 고개를 저었다. 소문은 시작이 없는 것처럼 굴었다.' : '아무리 거슬러 올라가도 처음 말한 사람이 나오지 않았다. 소문은 원래 그렇다.';
    }
    if (key === 'back') {
      const p = byId(g, x.src);
      if (!p) return '그자는 이미 이 고장에 없다.';
      p.wealth = Math.max(0, (p.wealth ?? 0) - 15);
      p.affection = Math.min(p.affection, -40);
      if (rng.chance(0.4)) { deed(g, 'honest', -6, '앙갚음으로 남의 헛소문을 퍼뜨렸다더라'); return `${p.name}에 대한 소문을 흘렸다. 그런데 내가 흘렸다는 것까지 함께 퍼졌다. 진흙탕 싸움이 되었다.`; }
      for (const pl of Object.keys(x.str)) x.str[pl] *= 0.6;
      return `${p.name}에 대한 소문을 흘렸다. 일주일 뒤 사람들은 내 이야기 대신 그 사람 이야기를 하고 있었다.`;
    }
    if (Math.abs(x.val) >= 12 && (x.str[here(g)] ?? 0) >= 50) { const b = baseAt(g, here(g)); b[x.axis] = clamp((b[x.axis] ?? 0) + x.val * 0.15, -100, 100); }
    stress(g, 4);
    return '대꾸할 가치도 없다고 생각했다. 사람들은 대꾸가 없는 것을 인정으로 들었다. 그래도 소문은 언젠가 잦아든다.';
  },
});
function clearLie(g, rng, x) {
  tired(g, 5);
  const pl = here(g);
  const v = g.player.stats.cha * 0.6 + Math.max(0, opinionAt(g, pl).honest) * 0.3 + fameAt(g, pl) * 0.1;
  if (check(rng, v, 30 + Math.abs(x.val))) {
    for (const p of Object.keys(x.str)) x.str[p] *= p === pl ? 0.2 : 0.6;
    deed(g, 'honest', 2, null);
    return '광장 우물가에서 사람들을 모아 놓고 하나하나 따졌다. 날짜와 장소를 대고, 증인을 불렀다. 사람들이 서로 얼굴을 보다가 하나둘 흩어졌다.';
  }
  x.str[pl] = Math.min(100, (x.str[pl] ?? 0) * 1.1);
  return '해명하려 했지만, 해명할수록 사람들은 "뭔가 있으니 저러겠지" 하는 얼굴이었다.';
}

/* ---------- 혼담 ---------- */
defineScene('repute_match', {
  title: () => '혼담',
  text: (g, s) => {
    const c = matchCand(g, s);
    return `${placeNm(s.place)}의 중매쟁이 노파가 찾아왔다. "당신 같은 사람이면 사위로, 며느리로 들이고 싶다는 집이 줄을 섰다오." 노파가 꺼낸 이름은 ${c.age}살 ${c.name}. ${c.line}`;
  },
  choices: (g, s) => (me(g).spouseId || here(g) !== s.place ? [] : [
    { label: '혼인하겠다고 한다', key: 'wed' },
    { label: '먼저 만나 보겠다고 한다', key: 'meet' },
    { label: '정중히 거절한다', key: 'no' },
  ]),
  resolve(g, rng, s, key) {
    if (key === 'no') return '정중히 거절했다. 노파는 혀를 차며 "아까운 자리인데" 하고 돌아갔다.';
    const c = matchCand(g, s);
    const p = makePerson(rng, { sex: c.sex, ageMonths: c.age * 12 + rng.int(0, 11), job: c.job, traits: c.traits });
    p.name = c.name;
    p.place = s.place === 'ern' ? undefined : s.place;
    p.known = true; p.affection = key === 'wed' ? 40 : 25;
    p.history.push({ y: g.date.year, m: g.date.month, text: `중매로 ${J(g.player.name, '과/와')} 맺어졌다.` });
    g.people.push(p);
    if (key === 'meet') { remember(g, p, '중매로 처음 만났다', 1, { tag: 'met' }); return `${J(c.name, '은/는')} 생각보다 말이 적었다. 헤어질 때 다음 장날에 또 보자고 한 쪽은 그쪽이었다.`; }
    const out = marry(g, p);
    chron(g, `${g.player.name}, 중매로 ${J(fullName(p), '과/와')} 혼인하다.`, 60);
    return `얼굴도 몇 번 못 보고 날을 잡았다. 이 고장에서는 흔한 일이다. ${out}`;
  },
});
function matchCand(g, s) {
  // 같은 씨앗이면 같은 사람이 나오게 (글과 결과가 어긋나지 않게)
  let x = s.seed >>> 0;
  const nx = () => { x = (x * 1103515245 + 12345) >>> 0; return x / 4294967296; };
  const sex = me(g).sex === 'm' ? 'f' : 'm';
  const names = sex === 'm' ? ['디터', '레온', '파울', '야콥', '엘리아스', '콘라트', '지몬'] : ['엘자', '마리', '클라라', '그레타', '루이제', '아그네스', '로자'];
  const jobs = [['farmer', '밀밭 열두 마지기를 가진 집 자식이라오.'], ['merchant', '하르펜까지 짐마차를 끄는 집이라오.'], ['smith', '대장간 하는 집의 맏이라오. 팔뚝이 내 허리만 하지.'], ['baker', '빵집 하는 집이라오. 굶을 일은 없지.'], ['herbalist', '약초를 다룬다오. 손끝이 야무지지.']];
  const age = Math.max(17, playerAge(g) + Math.floor(nx() * 9) - 5);
  const [job, line] = jobs[Math.floor(nx() * jobs.length)];
  const traits = [['kind', 'diligent'], ['reserved', 'generous'], ['ambitious', 'brave'], ['content', 'pious']][Math.floor(nx() * 4)];
  return { sex, name: names[Math.floor(nx() * names.length)], age, job, line, traits };
}

/* ---------- 행동 ---------- */
const placeOk = (g) => isAdult(g) && !traveling(g) && !isJailed(g) && open(here(g));
ACTIONS.push({
  id: 'repute_boast', name: '여관에서 내 이야기 하기', icon: 'visit',
  desc: '여관과 장터에서 술을 돌리며 내가 한 일을 이야기한다. 좋은 소문은 더 멀리, 이름은 더 널리. 떠벌리다 밉보일 수도 있다.',
  available: (g) => placeOk(g),
  run(g, rng) {
    const r = R(g);
    const pl = here(g);
    tired(g, 5);
    const paid = spend(g, 1);
    const best = r.rumors.filter((x) => !x.lie && x.val > 0 && x.str[pl]).sort((a, b) => b.val - a.val)[0];
    const v = g.player.stats.cha * 0.6 + (paid ? 10 : 0) - (mi(g) - r.boastAt < 3 ? 15 : 0);
    r.boastAt = mi(g);
    if (check(rng, v, 30)) {
      addFame(g, pl, 2.5);
      if (best) { best.str[pl] = Math.min(100, (best.str[pl] ?? 0) + 25); for (const n of nearOf(pl)) best.str[n] = Math.max(best.str[n] ?? 0, 20); }
      return `${paid ? '한 순배 술을 돌리고 ' : ''}이야기를 풀었다. ${best ? `내가 ${best.text.replace(/더라$/, '')}는 이야기에 사람들이 잔을 내려놓았다.` : '대단한 이야기는 아니었지만 사람들은 내 이름을 기억했다.'}${gains([up('이름', 2.5)])}`;
    }
    deed(g, 'honest', -2, rng.chance(0.5) ? '술만 들어가면 제 자랑을 늘어놓는다더라' : null);
    return [
      '이야기가 길어지자 사람들이 하품을 하며 하나둘 자리를 떴다. 등 뒤에서 "허풍쟁이"라는 말이 들린 것 같았다.',
      '한창 신이 났는데 구석에서 누가 "그 얘기 지난달에도 들었소" 했다. 웃음이 터졌다.',
      '사람들은 잔만 비우고 고개를 끄덕였다. 다음 날 아무도 내 이야기를 입에 올리지 않았다.',
      '이야기 도중 주인이 등잔을 끄기 시작했다. 남은 사람은 졸던 취객 하나뿐이었다.',
    ][(g.date.year * 12 + g.date.month) % 4];
  },
});
ACTIONS.push({
  id: 'repute_feast', name: '사람들에게 베풀기', icon: 'coin',
  desc: '잔치를 열거나 가난한 이웃에게 곡식과 은화를 나눈다. 돈이 들지만 후하다는 평과 이름이 남는다.',
  available: (g) => placeOk(g) && g.player.money >= 20,
  run(g, rng) {
    const r = R(g);
    const n = Math.max(10, Math.floor(g.player.money * 0.08));
    if (!spend(g, n)) return '나눌 돈이 모자랐다.';
    tired(g, 6); stress(g, -4);
    r.feastAt = mi(g);
    deed(g, 'generous', 8 + n / 20, rng.pick(['잔치를 열어 온 고장 사람을 먹였다더라', '흉년에 곡식 창고를 열었다더라', '예배당 구호소에 은화를 한 자루 내놓았다더라']));
    deed(g, 'kind', 3, null);
    addFame(g, here(g), 3);
    return `은화 ${n}닢을 풀었다. ${rng.pick(['광장에 긴 탁자를 놓고 빵과 고기와 술을 냈다. 아이들이 내 이름을 노래로 만들어 불렀다.', '구호소 앞에 줄이 길었다. 한 노인이 내 손을 잡고 오래 놓지 않았다.', '이웃들에게 밀 자루를 돌렸다. 고맙다는 말보다 놀란 얼굴이 더 많았다.'])}`;
  },
});
ACTIONS.push({
  id: 'repute_clear', name: '해명하고 다니기', icon: 'scroll',
  desc: '나를 두고 도는 나쁜 소문을 하나하나 바로잡는다. 거짓이면 잘 꺼지고, 사실이면 잘 안 꺼진다.',
  available: (g) => placeOk(g) && R(g).rumors.some((x) => x.val < 0 && (x.str[here(g)] ?? 0) >= 25 && (x.known || !x.lie)),
  run(g, rng) {
    const pl = here(g);
    const x = R(g).rumors.filter((y) => y.val < 0 && (y.str[pl] ?? 0) >= 25 && (y.known || !y.lie)).sort((a, b) => b.str[pl] - a.str[pl])[0];
    if (!x) return '해명할 소문이 없었다.';
    if (x.lie) return clearLie(g, rng, x);
    tired(g, 5);
    // 사실인 소문은 사과와 보상으로만 누그러진다
    if (check(rng, g.player.stats.cha * 0.5 + g.player.stats.wil * 0.3, 40 + Math.abs(x.val))) {
      x.str[pl] *= 0.5;
      return `변명하지 않았다. 내가 ${x.text.replace(/더라$/, '')}는 말이 사실이라고 인정하고 고개를 숙였다. 사람들은 놀랐고, 몇몇은 용서했다.`;
    }
    return `해명하려 했지만 ${x.text.replace(/더라$/, '')}는 말은 사실이었다. 사람들은 다 알고 있다는 얼굴로 듣기만 했다.`;
  },
});
ACTIONS.push({
  id: 'repute_slander', name: '헛소문 퍼뜨리기', icon: 'visit',
  desc: '미운 사람에 대한 헛소문을 흘린다. 그 사람은 손님과 일을 잃는다. 내가 흘린 것이 들통나면 내 평이 무너진다.',
  available: (g) => placeOk(g) && slanderTarget(g) != null,
  run(g, rng) {
    const p = slanderTarget(g);
    if (!p) return '소문을 낼 상대가 없었다.';
    tired(g, 4);
    const line = rng.pick(SLANDERS);
    p.wealth = Math.max(0, (p.wealth ?? 0) - rng.int(8, 20));
    p.history.push({ y: g.date.year, m: g.date.month, text: `"${line}"는 헛소문에 시달렸다.` });
    const sneak = (crimeState(g).craft ?? 0) * 0.4 + g.player.stats.cha * 0.4 + g.player.stats.int * 0.2;
    if (!check(rng, sneak, 35)) {
      p.affection = Math.min(p.affection, -40);
      remember(g, p, '나에 대한 헛소문을 퍼뜨렸다', -1, { tag: 'slander' });
      deed(g, 'honest', -10, `${fullName(p)}에 대한 헛소문을 지어냈다더라`);
      return `${p.name}에 대해 "${line}"는 말을 흘렸다. 사흘 만에 그 말이 어디서 나왔는지 온 고장이 알았다. ${J(p.name, '은/는')} 나를 보자 길에 침을 뱉었다.`;
    }
    if (p.job && ['baker', 'innkeeper', 'shopkeeper', 'merchant', 'cook'].includes(p.job) && rng.chance(0.25)) { p.job = 'laborer'; p.history.push({ y: g.date.year, m: g.date.month, text: '손님이 끊겨 가게를 닫았다.' }); }
    return `${p.name}에 대해 "${line}"는 말을 흘렸다. 한 달 뒤, ${p.name}의 가게 앞이 한산해졌다. 아무도 내가 시작한 줄 모른다.`;
  },
});
function slanderTarget(g) {
  const pl = here(g);
  const cands = g.people.filter((p) => p.alive && !p.isPlayer && p.known && !g.player.familyIds.includes(p.id) && p.id !== me(g).spouseId && (p.place ?? 'ern') === pl && (p.affection ?? 0) < 10);
  return cands.sort((a, b) => (a.affection ?? 0) - (b.affection ?? 0))[0] ?? null;
}

/* ---------- 사람들의 대접: 만날 때의 호감 ---------- */
addAffinity((g, p) => {
  const pl = p.place ?? 'ern';
  if (fameAt(g, pl) < 8) return 0;
  const o = opinionAt(g, pl);
  let s = 0;
  if (has(p, 'kind') || has(p, 'pious')) s += (o.kind + o.honest) / 50;
  if (has(p, 'greedy')) s += o.generous / 40;
  if (has(p, 'generous')) s += (o.generous + o.kind) / 60;
  if (has(p, 'brave') || has(p, 'ambitious')) s += o.brave / 40;
  if (has(p, 'cruel')) s += -o.kind / 60 + o.brave / 60;
  if (has(p, 'diligent')) s += o.honest / 40;
  s += (o.loyal + o.honest) / 100;
  return Math.round(clamp(s, -4, 4));
});

/* ---------- 일자리: 믿음이 필요한 일은 평판을 본다 ---------- */
let wrapped = new Set();
function wrapJobs() {
  for (const [id, d] of Object.entries(WORK)) {
    if (wrapped.has(id)) continue;
    wrapped.add(id);
    if (!(TRUST_SKILLS.includes(d.skill) || TRUST_NPC_JOBS.includes(d.npcJob))) continue;
    const orig = d.req;
    d.req = (g) => {
      const why = orig?.(g);
      if (why) return why;
      const pl = L(g).place;
      if (fameAt(g, pl) >= 10 && opinionAt(g, pl).honest <= -35) return '믿을 만한 사람이라는 평';
      return null;
    };
  }
}

/* ---------- 대 잇기: 가문의 평판이 일부 남는다 ---------- */
HOOKS.heir.push((g) => {
  const r = R(g);
  for (const pl of Object.keys(r.fame)) r.fame[pl] = Math.round(r.fame[pl] * 0.45);
  for (const b of Object.values(r.base)) for (const a of AXIS_IDS) if (b[a]) b[a] = Math.round(b[a] * 0.4);
  r.rumors = [];
  r.nick = null;
  r.snap = null;
  r.sceneAt = 0; r.feastAt = 0; r.boastAt = 0;
});
// 집안에 따라 고향에서의 첫 평이 다르다
const FAMILY_REPUTE = { fallen_knight: { loyal: 10, brave: 6 }, merchant: { generous: -4, honest: 3 }, farmer: { honest: 5, kind: 3 }, dwarf_smith: { honest: 6 }, beast_hunter: { brave: 6 } };
HOOKS.newGame.push((g) => {
  const r = R(g);
  const fam = FAMILY_REPUTE[g.player.familyId];
  const home = open(L(g).place) ? L(g).place : 'ern';
  if (fam) Object.assign(baseAt(g, home), fam);
  r.fame[home] = 6;
  r.snap = snapshot(g);
});
HOOKS.migrate.push((g) => { R(g).snap ??= snapshot(g); });
