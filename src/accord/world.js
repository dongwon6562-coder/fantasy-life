// 나라 사이의 한 달: 새 군주의 성향, 무역 봉쇄, 국경 다툼, 밀약과 배신, 원한. 플레이어 없이도 굴러간다.
// 주사위는 따로 굴린다(ownRng). 큰 세상 주사위를 건드리지 않아 다른 갈래의 흐름이 덜 밀린다.
import { WORLD_TICKS, nudge } from '../world.js';
import { J } from '../narrative/text.js';
import { makeRng } from '../rng.js';
import { PLACES } from '../places.js';
import { LOCAL } from '../trade/core.js';
import { LANDS } from '../politics/data.js';
import { nations, relOf, shiftRel, pactOf, addPact, dropPact, alliesOf, allWars, warOf, warsOf, ownWars, foeIn, edgeOf, landOwner, pnews, rulerLine, overlordOf } from '../politics/state.js';
import { declareWar } from '../politics/world.js';
import {
  AS, clamp, mi, short, full, STANCES, leanOf, EXPORTS, ARBITERS, CAPITAL, rulerKey, alog, tally, stanceOf, pair,
  embargoOf, embargoed, disputeOf, grudge, heatWord,
} from './state.js';

// 달마다 조금씩 쌓이는 관계 변화. 레오니아-발하르트 사이는 world.js 긴장(tension)이 맡으니 건드리지 않는다
// (relOf/shiftRel이 그 쌍을 tension으로 바꿔 달마다 밀면 발하르트 전쟁이 너무 잦아진다)
const drift = (g, a, b, n) => { if ((a === 'leonia' && b === 'valhart') || (a === 'valhart' && b === 'leonia')) return; shiftRel(g, a, b, n); };
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 613) ^ Math.imul(mi(g) * 131 + salt + 17, 2654435761)) | 0 });
// 다른 갈래(소문)가 받아 갈 소식: index.js가 채운다
export const FEED = { fact: null };

function tell(g, say, text, big = false, fact = null) {
  const S = AS(g);
  pnews(g, text);
  alog(g, text);
  if (fact) FEED.fact?.(g, fact.k, fact.d);
  // 대륙 소식은 석 달에 하나만 (큰일은 예외)
  if (big || mi(g) - S.newsAt >= 3) { say(text, big); S.newsAt = mi(g); }
}

/* ---------- 새 군주, 새 성향 ---------- */
function rulers(g, rng, say) {
  const S = AS(g);
  for (const id of nations()) {
    const k = rulerKey(g, id);
    if (S.ruler[id] === k) continue;
    const first = !S.ruler[id];
    S.ruler[id] = k;
    if (first) continue;
    const old = S.stance[id], st = rng.pick(leanOf(id));
    S.stance[id] = st;
    tally(g, 'stance');
    const who = id === 'leonia' ? '레오니아의 새 왕' : rulerLine(g, id) || `${short(id)}의 새 통치자`;
    let text = `${J(who, '은/는')} ${STANCES[st].name} 사람이다. ${STANCES[st].line}`;
    if (st !== old && (st === 'dove' || st === 'merchant')) {
      const lifted = S.embargo.filter((e) => e.by === id && rng.chance(0.6));
      for (const e of lifted) S.embargo = S.embargo.filter((x) => x !== e);
      if (lifted.length) text += ` ${lifted.map((e) => short(e.on)).join('·')}에 걸었던 봉쇄를 풀었다.`;
    }
    if (st === 'hawk') for (const d of S.disputes) if (d.a === id || d.b === id) d.heat = clamp(d.heat + 15, 0, 100);
    // 새 군주는 옛 동맹을 버리기도 한다 (사이가 미지근했던 곳)
    const weak = alliesOf(g, id).filter((x) => relOf(g, id, x) < 20 && x !== overlordOf(g, id));
    if (weak.length && rng.chance(st === 'schemer' || st === 'hawk' ? 0.45 : 0.15)) {
      const x = rng.pick(weak);
      dropPact(g, id, x, 'alliance'); shiftRel(g, id, x, -20); tally(g, 'repudiate');
      S.grudges.push({ a: x, b: id, y: g.date.year, why: `새 군주가 동맹 문서를 찢었다` });
      text += ` 즉위하자마자 ${short(x)}과의 동맹 문서를 돌려보냈다. ${short(x)} 궁정은 그것을 잊지 않을 것이다.`.replace(`${short(x)}과의`, `${J(short(x), '과/와')}의`);
    }
    tell(g, say, text, false, { k: 'ac_stance', d: { n: id, st } });
  }
}

/* ---------- 무역 봉쇄 ---------- */
const marketsOf = (realm) => Object.keys(LOCAL).filter((pl) => PLACES[pl] && !PLACES[pl].hidden && (PLACES[pl].realm ?? 'leonia') === realm);
function push(g, place, good, n) {
  const t = g.trade; if (!t?.mkt) return;
  const m = (t.mkt[`${place}:${good}`] ??= { drift: 0, sat: 0 });
  m.drift = clamp(m.drift + n, -0.3, 0.3);
}
function embargoes(g, rng, say) {
  const S = AS(g), ids = nations();
  // 걸기: 사이가 아주 나쁜데 싸우지는 않는 나라, 동맹의 적, 믿음이 다른 나라
  if (rng.chance(0.05)) {
    const by = rng.pick(ids), st = STANCES[stanceOf(g, by)];
    const cands = ids.filter((on) => on !== by && !embargoOf(g, by, on) && !warOf(g, by, on) && !overlordOf(g, on) && overlordOf(g, by) !== on);
    const score = (on) => {
      let s = -relOf(g, by, on) - 30;
      if (alliesOf(g, by).some((x) => warsOf(g, x).some((w) => foeIn(w, x) === on))) { s += 30; }
      if (stanceOf(g, by) === 'zealot' && by === 'holy' && on !== 'leonia' && on !== 'march') s += 25;
      s += grudge(g, by, on) * 10;
      return s;
    };
    const on = cands.sort((x, y) => score(y) - score(x))[0];
    if (on && score(on) > 0 && rng.chance(Math.min(0.9, (score(on) / 40) * st.embargo))) {
      const why = alliesOf(g, by).some((x) => warsOf(g, x).some((w) => foeIn(w, x) === on)) ? '동맹을 친 나라와는 거래하지 않겠다며' : stanceOf(g, by) === 'zealot' ? '이단의 물건이 성도를 더럽힌다며' : grudge(g, by, on) ? '옛 원한을 들어' : '국경에서 쌓인 일들을 들어';
      S.embargo.push({ by, on, since: mi(g), why });
      dropPact(g, by, on, 'trade'); tally(g, 'embargo');
      tell(g, say, `${J(full(by), '이/가')} ${why} ${full(on)}에 무역 봉쇄를 걸었다. ${short(on)}의 ${EXPORTS[on].map((x) => GOOD_WORD[x]).join('·')} 값이 ${short(by)} 장터에서 뛸 것이다.`, false, { k: 'ac_embargo', d: { a: by, b: on } });
    }
  }
  // 풀기
  for (const e of [...S.embargo]) {
    const st = STANCES[stanceOf(g, e.by)], rel = relOf(g, e.by, e.on), age = mi(g) - e.since;
    const p = warOf(g, e.by, e.on) ? 1 : clamp(0.006 + (rel + 20) / 1200 + (age > 60 ? 0.01 : 0), 0, 0.2) / Math.max(0.4, st.embargo);
    if (rng.chance(p)) {
      S.embargo = S.embargo.filter((x) => x !== e);
      if (!warOf(g, e.by, e.on)) { shiftRel(g, e.by, e.on, 6); tell(g, say, `${J(full(e.by), '이/가')} ${full(e.on)}에 걸었던 봉쇄를 풀었다. ${age >= 24 ? `${Math.round(age / 12)}년 만이다. ` : ''}국경 관문에 짐마차가 다시 줄을 섰다.`); }
    }
  }
  // 봉쇄가 걸려 있는 동안: 사이가 조금씩 더 틀어지고, 물건 값이 뛰고 남는다
  for (const e of S.embargo) {
    drift(g, e.by, e.on, -0.12);
    for (const pl of marketsOf(e.by)) for (const good of EXPORTS[e.on] ?? []) push(g, pl, good, 0.05);
    for (const pl of marketsOf(e.on)) for (const good of EXPORTS[e.on] ?? []) push(g, pl, good, -0.03);
  }
}
export const GOOD_WORD = { grain: '밀', salt: '소금', wine: '포도주', wool: '모직', iron: '쇠', fur: '모피', spice: '향신료', elfherb: '엘프 약초', manastone: '마석', silk: '비단', dwarfsteel: '드워프 강철' };

/* ---------- 국경 다툼 ---------- */
const borderLands = () => Object.entries(LANDS).filter(([, l]) => !l.fixed);
function disputes(g, rng, say) {
  const S = AS(g), ids = nations();
  // 일어나기: 다툴 땅 하나를 두고 (같은 쌍엔 하나만)
  if (S.disputes.length < 4 && rng.chance(0.03)) {
    const [land, l] = rng.pick(borderLands());
    const owner = landOwner(g, land), rival = rng.pick([l.home, ...l.rivals].filter((x) => x !== owner && ids.includes(x)));
    if (rival && ids.includes(owner) && !warOf(g, owner, rival) && !disputeOf(g, owner, rival) && !pactOf(g, owner, rival, 'alliance') && !overlordOf(g, owner) && !overlordOf(g, rival)) {
      const heat = 18 + rng.int(0, 12);
      S.disputes.push({ a: rival, b: owner, land, heat, peak: heat, since: mi(g) });
      tally(g, 'dispute');
      tell(g, say, rng.pick([
        `${LANDS[land].name} 근처에서 ${short(rival)} 순찰대와 ${short(owner)} 수비대가 맞부딪쳤다. ${J(short(rival), '은/는')} 그 땅이 원래 제 것이라고 한다.`,
        `${J(short(rival), '이/가')} ${LANDS[land].name} 둘레에 새 경계비를 박았다. ${short(owner)} 쪽은 하룻밤 사이에 그 돌을 뽑아 버렸다.`,
        `${LANDS[land].name}의 세금을 두 나라 세리가 한 해에 두 번 걷어 갔다. 고장 사람들이 성문 앞에 주저앉았다.`,
      ]), false, { k: 'ac_dispute', d: { a: rival, b: owner, land } });
    }
  }
  for (const d of [...S.disputes]) {
    const sa = STANCES[stanceOf(g, d.a)], sb = STANCES[stanceOf(g, d.b)], rel = relOf(g, d.a, d.b);
    if (warOf(g, d.a, d.b) || landOwner(g, d.land) === d.a && LANDS[d.land].home === d.a) { S.disputes = S.disputes.filter((x) => x !== d); continue; }
    const was = d.heat;
    let v = -0.7 + ((sa.heat + sb.heat) / 2 - 1) * 2.2 + (rel < -40 ? 1.1 : rel > 15 ? -1.4 : 0) + grudge(g, d.a, d.b) * 0.5 + (embargoed(g, d.a, d.b) ? 0.8 : 0);
    d.heat = clamp(d.heat + v + rng.normal(0, 3.2) + (d.push ?? 0), 0, 100);
    d.push = 0;
    d.peak = Math.max(d.peak, d.heat);
    for (const t of [35, 60, 85]) if (was < t && d.heat >= t) tell(g, say, t >= 85 ? `${LANDS[d.land].name}를 두고 ${J(short(d.a), '과/와')} ${short(d.b)}의 군대가 강을 사이에 두고 마주 섰다. 누가 먼저 화살을 쏘느냐만 남았다는 말이 돈다.`.replace(`${LANDS[d.land].name}를`, J(LANDS[d.land].name, '을/를')) : t >= 60 ? `${J(short(d.a), '이/가')} ${LANDS[d.land].name} 쪽 국경에 병사를 모은다. ${short(d.b)}도 성벽에 사람을 더 올렸다.` : `${LANDS[d.land].name}를 두고 ${J(short(d.a), '과/와')} ${short(d.b)}의 사절이 서로 언성을 높였다.`.replace(`${LANDS[d.land].name}를`, J(LANDS[d.land].name, '을/를')), t >= 85, t >= 60 ? { k: 'ac_dispute', d: { a: d.a, b: d.b, land: d.land, hot: 1 } } : null);
    // 중재: 남의 나라가 끼어들어 판을 가른다
    if (d.heat >= 45 && rng.chance(0.025)) {
      const arb = ARBITERS.find((x) => x !== d.a && x !== d.b && relOf(g, x, d.a) > -20 && relOf(g, x, d.b) > -20);
      if (arb) {
        S.disputes = S.disputes.filter((x) => x !== d); tally(g, 'arbitrated');
        shiftRel(g, d.a, d.b, 8); shiftRel(g, arb, d.a, 3); shiftRel(g, arb, d.b, 3);
        tell(g, say, `${J(full(arb), '이/가')} ${LANDS[d.land].name} 다툼을 중재했다. 경계비를 새로 박고, ${J(short(d.a), '과/와')} ${J(short(d.b), '이/가')} 손을 맞잡았다. 속으로는 둘 다 불만이라고 한다.`);
        continue;
      }
    }
    if (d.heat <= 3) { S.disputes = S.disputes.filter((x) => x !== d); tally(g, 'cooled'); alog(g, `${LANDS[d.land].name}를 두고 벌이던 ${J(short(d.a), '과/와')} ${short(d.b)}의 다툼이 잦아들었다.`.replace(`${LANDS[d.land].name}를`, J(LANDS[d.land].name, '을/를'))); continue; }
    // 끝까지 가면: 전쟁이거나 칼부림
    if (d.heat >= 96) {
      const busy = ownWars(g).some((w) => [w.a, w.b].includes(d.a) || [w.a, w.b].includes(d.b));
      const lw = d.a === 'leonia' || d.b === 'leonia';
      if (!busy && !lw && rel < -20 && !pactOf(g, d.a, d.b, 'truce') && rng.chance(0.5)) {
        S.disputes = S.disputes.filter((x) => x !== d); tally(g, 'war');
        declareWar(g, rng, (t, b) => say(t, b), () => {}, d.a, d.b, `${J(LANDS[d.land].name, '을/를')} 두고 몇 해째 다투던 국경에서 끝내 칼이 뽑혔다`);
        alog(g, `${LANDS[d.land].name} 다툼이 전쟁이 되었다.`);
        continue;
      }
      shiftRel(g, d.a, d.b, -10); d.heat = 70; tally(g, 'clash');
      if (lw && (d.a === 'valhart' || d.b === 'valhart')) nudge(g, 'tension', 6);
      tell(g, say, `${LANDS[d.land].name} 근처에서 ${J(short(d.a), '과/와')} ${short(d.b)}의 병사들이 맞붙었다. 수십 명이 죽었다. 두 궁정 모두 전쟁은 아니라고 말한다. 아직은.`, true, { k: 'ac_dispute', d: { a: d.a, b: d.b, land: d.land, hot: 2 } });
    }
  }
}

/* ---------- 밀약과 배신 ---------- */
function secrets(g, rng, say) {
  const S = AS(g), ids = nations();
  if (S.secrets.length < 3 && rng.chance(0.05)) {
    const a = rng.pick(ids), st = STANCES[stanceOf(g, a)];
    for (const against of alliesOf(g, a)) {
      const b = ids.find((x) => ![a, against].includes(x) && relOf(g, x, against) < -25 && relOf(g, a, x) > -25 && !pactOf(g, a, x, 'alliance') && !S.secrets.some((s) => s.a === a && s.b === x));
      if (b && rng.chance(0.25 * st.secret)) { S.secrets.push({ a, b, against, since: mi(g), known: false }); tally(g, 'secret'); break; }
    }
  }
  for (const s of [...S.secrets]) {
    drift(g, s.a, s.b, 0.35);
    const reveal = rng.chance(0.012 + (s.push ?? 0)); s.push = 0;
    if (reveal || !pactOf(g, s.a, s.against, 'alliance')) {
      S.secrets = S.secrets.filter((x) => x !== s);
      if (!pactOf(g, s.a, s.against, 'alliance')) continue;
      betray(g, say, s.a, s.against, `${J(full(s.a), '이/가')} 동맹 ${full(s.against)} 몰래 ${full(s.b)}와 밀약을 맺어 온 것이 드러났다. 밀약 문서의 사본이 ${short(s.against)} 궁정 탁자 위에 놓였다.`.replace(`${full(s.b)}와`, J(full(s.b), '과/와')), s.b);
      continue;
    }
    if (mi(g) - s.since > 120) S.secrets = S.secrets.filter((x) => x !== s);
  }
  // 싸움에서 밀리는 동맹을 버린다
  for (const w of allWars(g)) {
    for (const side of [w.a, w.b]) {
      if (edgeOf(w, side) > -8) continue;
      for (const x of alliesOf(g, side)) {
        if (x === foeIn(w, side) || !['schemer', 'merchant'].includes(stanceOf(g, x)) || !rng.chance(0.004)) continue;
        betray(g, say, x, side, `${J(full(x), '이/가')} 전쟁에서 밀리는 동맹 ${J(full(side), '을/를')} 버렸다. 원군을 거두고 ${short(foeIn(w, side))}에 따로 사절을 보냈다.`, foeIn(w, side));
      }
    }
  }
  // 원한은 몇십 년 동안 관계를 끌어내린다
  for (const r of S.grudges) if (g.date.year - r.y < 60) drift(g, r.a, r.b, -0.06);
  S.grudges = S.grudges.filter((r) => g.date.year - r.y < 60);
}
export function betray(g, say, traitor, victim, text, gainer = null) {
  const S = AS(g);
  dropPact(g, traitor, victim, 'alliance');
  shiftRel(g, traitor, victim, -45);
  if (gainer) shiftRel(g, traitor, gainer, 15);
  S.grudges.push({ a: victim, b: traitor, y: g.date.year, why: '배신' });
  tally(g, 'betray');
  tell(g, say, text, true, { k: 'ac_betray', d: { a: traitor, b: victim } });
}

/* ---------- 전쟁이 물건 값에 ---------- */
function warPrices(g) {
  for (const w of allWars(g)) for (const r of [w.a, w.b]) for (const pl of marketsOf(r)) { push(g, pl, 'iron', 0.035); push(g, pl, 'grain', 0.02); }
}

export function accordMonth(g, say = () => {}) {
  if (!g.accord || !g.politics || !g.date) return;
  const rng = ownRng(g, 5);
  rulers(g, rng, say);
  embargoes(g, rng, say);
  disputes(g, rng, say);
  secrets(g, rng, say);
  warPrices(g);
}
WORLD_TICKS.push((g, rng, say) => accordMonth(g, say));
