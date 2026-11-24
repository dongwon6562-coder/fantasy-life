// 대륙의 한 달: 통치자가 늙고 죽고 잇고, 관계가 흐르고, 동맹·교역·혼인·전쟁이 맺어지고 끝나고, 땅 주인이 바뀐다.
// 플레이어가 없어도 굴러간다. 큰일은 say(소식)와 record(연대기)로 알린다.
import { WORLD_TICKS, nudge } from '../world.js';
import { J } from '../narrative/text.js';
import { LANDS, NATURE, MARRYING, ELECT_TITLE, POPE_NAMES, ROMAN, START_RULERS, START_REL } from './data.js';
import {
  PS, clamp, mi, key, nations, short, full, relOf, shiftRel, pactOf, addPact, dropPact, alliesOf, overlordOf,
  ownWars, warOf, warsOf, foeIn, landOwner, landsOf, contested, neighbors, rulerOf, rulerAge, rulerLine, nameFor, pnews, syncRulerText,
} from './state.js';

// 지금까지 일어난 큰일의 수 (점검과 화면 요약용)
export const tally = (g, k) => { const t = (PS(g).tally ??= {}); t[k] = (t[k] ?? 0) + 1; };
const REALM_OK = (id) => nations().includes(id);
const borderPairs = () => { const out = []; for (const l of Object.values(LANDS)) if (!l.fixed) for (const r of l.rivals) if (REALM_OK(l.home) && REALM_OK(r)) out.push([l.home, r]); return out; };
const legendAlive = (g, id) => { const x = g.legends?.list?.find((l) => l.id === id); return x ? x.alive : true; };

// 나라의 지금 힘: 바탕 힘, 안정, 늘거나 준 땅, 동맹의 도움
export function strength(g, id, vs = null) {
  const P = PS(g);
  const base = NATURE[id]?.power ?? 40;
  const home = Object.values(LANDS).filter((l) => l.home === id).length;
  let s = base * (0.6 + (P.stab[id] ?? 60) / 150) + (landsOf(g, id).length - home) * 4;
  for (const a of alliesOf(g, id)) if (a !== vs && !warsOf(g, a).some((w) => foeIn(w, a) === id)) s += (NATURE[a]?.power ?? 40) * 0.15;
  if (id === 'march' && g.realm?.north?.war) s *= 0.6;
  if (id === 'valhart' && g.realm?.balhart?.war) s *= 0.75;
  return s;
}

function tell(g, say, record, text, big = false) {
  say(text, big);
  pnews(g, text);
  if (big) record(text.split('.')[0]);
}

// ---------- 통치자 ----------
function deathChance(g, id) {
  const r = rulerOf(g, id);
  if (!r || r.legend) return 0;
  const kind = NATURE[id].kind;
  let age = rulerAge(g, id);
  if (kind === 'ageless') return 0.0002;
  if (id === 'dwarf') age = age / 3.5;
  return 0.0004 * Math.exp(Math.max(0, age - 45) / 12);
}
// 44단계 crowns가 채운다: pick(g, rng, id, kind, old) → { name, last, sex } | null
export const SUCCESSION = { pick: null };
export function succeed(g, rng, say, record, id, why) {
  const P = PS(g);
  const old = rulerOf(g, id);
  const kind = NATURE[id].kind;
  const oldLine = rulerLine(g, id);
  let text;
  P.stab[id] = clamp((P.stab[id] ?? 60) - 6, 0, 100);
  let sex = rng.chance(id === 'elf' ? 0.7 : 0.15) ? 'f' : 'm';
  // 44단계 crowns: 그 나라 궁정에 후계 후보가 있으면 그중에서 고른다
  const pre = SUCCESSION.pick?.(g, rng, id, kind, old) ?? null;
  if (pre?.sex) sex = pre.sex;
  const pickN = () => { const n = nameFor(rng, id, sex); return pre ?? n; }; // 주사위는 같게 굴린다
  if (kind === 'dynasty') {
    const spouse = P.pacts.find((p) => p.kind === 'marriage' && (p.a === id || p.b === id));
    const crisis = !old.heir || ((P.stab[id] ?? 60) < 30 && rng.chance(0.5));
    if (!crisis) {
      const n = pickN();
      const same = sex === 'm' && (old.sex ?? 'm') === 'm' && rng.chance(0.3);
      const no = same ? (old.no || 1) + 1 : 0;
      P.rulers[id] = { title: titleFor(id, sex), sex, name: same ? `${old.name.replace(/ \d세$/, '')}${ROMAN[no] ?? ''}` : n.name, house: old.house, born: g.date.year - rng.int(18, 40), since: g.date.year, heir: rng.chance(0.75), legend: null, no };
      text = `${full(id)}의 ${J(oldLine, '이/가')} ${why}. ${old.house} 가문의 ${J(rulerLine(g, id), '이/가')} 뒤를 이었다.`;
    } else if (spouse && rng.chance(0.5)) {
      // 혼인으로 얽힌 가문이 왕관을 가져간다
      const other = spouse.a === id ? spouse.b : spouse.a;
      const house = other === 'leonia' ? '레오니아 왕가' : rulerOf(g, other)?.house ?? short(other);
      const n = pickN();
      P.rulers[id] = { title: titleFor(id, sex), sex, name: n.name, house, born: g.date.year - rng.int(20, 35), since: g.date.year, heir: rng.chance(0.6), legend: null, no: 0 };
      P.fallen.push({ realm: id, house: old.house, y: g.date.year }); tally(g, 'fall');
      shiftRel(g, id, other, 25);
      text = `${full(id)}의 ${J(oldLine, '이/가')} ${why}. 대 이을 사람이 없었다. 혼인으로 얽힌 ${house} 핏줄의 ${J(n.name, '이/가')} 왕관을 썼다. ${old.house} 가문의 대가 끊겼다.`;
    } else {
      const n = pickN();
      const house = n.last || `${n.name}의 집안`;
      P.rulers[id] = { title: titleFor(id, sex), sex, name: n.name, house, born: g.date.year - rng.int(28, 50), since: g.date.year, heir: rng.chance(0.7), legend: null, no: 0 };
      P.fallen.push({ realm: id, house: old.house, y: g.date.year }); tally(g, 'fall');
      P.stab[id] = clamp(P.stab[id] - 12, 0, 100);
      text = `${full(id)}의 ${J(oldLine, '이/가')} ${why}. 대 이을 사람을 두고 귀족들이 칼을 뽑았다. 피를 본 끝에 ${house} 가문의 ${J(n.name, '이/가')} 옥좌에 앉았다. ${old.house} 가문의 시대가 끝났다.`;
    }
  } else if (kind === 'elect') {
    let name;
    if (id === 'holy') { const base = rng.pick(POPE_NAMES); const used = P.rulers[id].popes ?? {}; used[base] = (used[base] ?? (base === '그레고르' ? 7 : rng.int(1, 4))) + 1; name = `${base}${ROMAN[Math.min(8, used[base])] ?? ''}`; P.rulers[id] = { title: '교황', name, house: null, born: g.date.year - rng.int(58, 74), since: g.date.year, heir: false, legend: null, no: 0, popes: used }; }
    else { const n = pickN(); name = `${n.name}${n.last ? ` ${n.last}` : ''}`; P.rulers[id] = { title: ELECT_TITLE[id], name, house: null, born: g.date.year - rng.int(id === 'beast' ? 26 : 45, id === 'beast' ? 40 : 70), since: g.date.year, heir: false, legend: null, no: 0 }; }
    const how = id === 'holy' ? '추기경들이 콘클라베에 들었고, 흰 연기가 올랐다' : id === 'beast' ? '부족들이 모여 결투로 새 대족장을 정했다' : id === 'serenia' ? '탑의 주인들이 모여 표를 던졌다' : '회의가 새 사람을 뽑았다';
    text = `${full(id)}의 ${J(oldLine, '이/가')} ${why}. ${how}. 새 ${J(ELECT_TITLE[id] ?? '통치자', '은/는')} ${name}.`;
  } else if (kind === 'council') {
    const n = pickN();
    P.rulers[id] = { title: old.title, sex, name: `${n.name}${n.last ? ` ${n.last}` : ''}`, house: null, born: g.date.year - rng.int(40, 60), since: g.date.year, heir: false, legend: null, no: 0 };
    text = `${full(id)}의 ${J(oldLine, '이/가')} ${why}. 새 ${J(old.title, '은/는')} ${P.rulers[id].name}.`;
  } else {
    const n = pickN();
    P.rulers[id] = { title: sex === 'f' ? '여왕' : '왕', sex, name: n.name, house: null, born: g.date.year - rng.int(200, 400), since: g.date.year, heir: true, legend: null, no: 0 };
    text = `${full(id)}의 ${J(oldLine, '이/가')} ${why}. 숲이 석 달 동안 울었다. 새 ${J(P.rulers[id].title, '은/는')} ${n.name}.`;
  }
  syncRulerText(g);
  P.changed = { realm: id, at: mi(g) };
  tell(g, say, record, text, kind !== 'council');
}
const femTitle = (t) => ({ 황제: '여제', 왕: '여왕' }[t] ?? t);
const titleFor = (id, sex) => (sex === 'f' ? femTitle(START_RULERS[id]?.title ?? '왕') : START_RULERS[id]?.title ?? '왕');

function rulers(g, rng, say, record) {
  const P = PS(g);
  for (const id of nations()) {
    if (id === 'leonia') continue;
    const r = rulerOf(g, id);
    if (!r) continue;
    if (r.legend) {
      if (!legendAlive(g, r.legend)) succeed(g, rng, say, record, id, '세상을 떠났다');
      continue;
    }
    if (rng.chance(deathChance(g, id))) { succeed(g, rng, say, record, id, rng.pick(['세상을 떠났다', '병상에서 일어나지 못했다', '잠든 채 숨을 거두었다'])); continue; }
    // 안정이 바닥이면 반란: 가문이 무너진다
    if (NATURE[id].kind === 'dynasty' && (P.stab[id] ?? 60) < 12 && rng.chance(0.03)) {
      r.heir = false; P.stab[id] = 5;
      succeed(g, rng, say, record, id, '반란군에 쫓겨 옥좌를 잃었다');
    }
    if (!r.heir && NATURE[id].kind === 'dynasty' && rng.chance(0.004)) r.heir = true;
  }
}

// ---------- 관계의 흐름 ----------
function drift(g, rng) {
  const P = PS(g);
  const ids = nations();
  // 빼앗긴 땅은 한 번만 훑어 둔다 (나라 쌍마다 모든 땅을 훑던 것: 25단계 헤드)
  const taken = [];
  for (const [lid, l] of Object.entries(LANDS)) { const o = landOwner(g, lid); if (o !== l.home) taken.push([o, l.home]); }
  for (const a of ids) for (const b of ids) {
    if (a >= b || key(a, b) === 'leonia|valhart') continue;
    const k = key(a, b);
    let target = (START_REL[`${a}|${b}`] ?? START_REL[`${b}|${a}`] ?? 0) * 0.6;
    const fa = NATURE[a].faith, fb = NATURE[b].faith;
    if (a === 'holy' || b === 'holy') target -= Math.abs(fa - fb) * 25;
    if (pactOf(g, a, b, 'alliance')) target += 35;
    if (pactOf(g, a, b, 'trade')) target += 15;
    if (pactOf(g, a, b, 'marriage')) target += 20;
    if (pactOf(g, a, b, 'truce')) target -= 10;
    if (warOf(g, a, b)) target -= 60;
    // 같은 적을 둔 나라끼리는 가까워진다
    for (const w of warsOf(g, a)) { const f = foeIn(w, a); if (f !== b && warsOf(g, b).some((x) => foeIn(x, b) === f)) target += 20; }
    if (neighbors(g, a, b)) target -= 12 * (NATURE[a].greed + NATURE[b].greed);
    // 빼앗긴 땅은 잊히지 않는다
    for (const [o, h] of taken) if ((o === a || o === b) && (h === a || h === b)) target -= 25;
    P.rel[k] = clamp((P.rel[k] ?? 0) + (target - (P.rel[k] ?? 0)) * 0.012 + rng.normal(0, 1.2), -100, 100);
  }
  // 국경의 작은 충돌: 이웃끼리 사이가 틀어진다
  if (rng.chance(0.05)) {
    const [a, b] = rng.pick(borderPairs());
    if (!warOf(g, a, b) && !pactOf(g, a, b, 'alliance')) {
      shiftRel(g, a, b, -rng.int(8, 18));
      pnews(g, rng.pick([
        `${J(short(a), '과/와')} ${short(b)}의 국경에서 순찰대끼리 칼부림이 났다. 양쪽 모두 상대가 먼저 뽑았다고 한다.`,
        `${short(b)} 상인 행렬이 ${short(a)} 땅에서 털렸다. ${short(b)} 궁정은 ${short(a)} 영주가 눈감아 줬다고 의심한다.`,
        `${J(short(a), '이/가')} 국경 다리에 새 관문을 세웠다. ${short(b)} 쪽에서는 그것을 모욕으로 받아들였다.`,
      ]));
    }
  }
  // 안정: 60쪽으로 돌아가되 전쟁은 깎는다
  for (const id of ids) {
    const war = warsOf(g, id).length;
    P.stab[id] = clamp((P.stab[id] ?? 60) + (62 - (P.stab[id] ?? 60)) * 0.02 - war * 0.25 + rng.normal(0, 0.4), 0, 100);
  }
  // 안에서 터지는 일 (17단계 헤드): 전쟁이 없어도 나라는 흔들린다. 한 나라에 스무 해쯤 한 번.
  // 이것이 없으면 안정이 늘 60 근처라 60년을 돌려도 왕조가 한 번도 끊기지 않았다.
  for (const id of ids) {
    if (id === 'leonia' || !rng.chance(0.0045)) continue;
    const hit = rng.int(16, 34);
    P.stab[id] = clamp((P.stab[id] ?? 60) - hit, 0, 100);
    tally(g, 'unrest');
    const s = short(id), kind = NATURE[id].kind;
    pnews(g, rng.pick([
      ...(kind === 'dynasty' ? [`${s}의 큰 귀족 둘이 옥좌 앞에서 서로를 역적이라 불렀다. 궁정이 두 패로 갈렸다.`, `${s}의 ${J(rulerOf(g, id)?.title ?? '왕', '이/가')} 세금을 두 배로 올렸다. 지방마다 영주들이 사자를 돌려보냈다.`] : []),
      ...(kind === 'elect' ? [`${s}의 다음 자리를 두고 표를 사고판 일이 드러났다. 거리에서 돌이 날았다.`] : []),
      ...(kind === 'council' ? [`${s}의 회의가 빚 문제로 쪼개졌다. 한쪽 상인들이 성문을 닫아걸었다.`] : []),
      `${s}에 흉년이 들어 곡창을 지키던 병사들이 굶주린 사람들에게 밀려났다.`,
      `${s}의 국경 수비대가 석 달째 봉급을 받지 못해 무기를 내려놓았다.`,
    ]));
  }
  if (g.realm?.north?.fallen) P.stab.march = Math.min(P.stab.march, 20);
}

// ---------- 외교: 한 달에 많아야 한 가지 ----------
function diplomacy(g, rng, say, record) {
  const P = PS(g);
  // 기한이 다 된 휴전은 끝난다
  for (const p of [...P.pacts]) if (p.until != null && mi(g) >= p.until) {
    dropPact(g, p.a, p.b, p.kind);
    if (p.kind === 'truce') pnews(g, `${J(short(p.a), '과/와')} ${short(p.b)} 사이의 휴전 기한이 끝났다.`);
  }
  // 사이가 틀어진 동맹은 깨진다
  for (const p of [...P.pacts]) if ((p.kind === 'alliance' || p.kind === 'trade') && relOf(g, p.a, p.b) < (p.kind === 'alliance' ? -5 : -25) && rng.chance(0.08)) {
    dropPact(g, p.a, p.b, p.kind);
    tell(g, say, record, p.kind === 'alliance' ? `${J(full(p.a), '과/와')} ${full(p.b)}의 동맹이 깨졌다. 사절들이 서로의 수도를 떠났다.` : `${J(short(p.a), '과/와')} ${short(p.b)}의 교역 조약이 깨졌다. 국경 시장의 수레가 멈췄다.`, p.kind === 'alliance');
  }
  if (g.realm?.north?.independent && pactOf(g, 'leonia', 'march', 'alliance')) dropPact(g, 'leonia', 'march', 'alliance');
  if (!rng.chance(0.12)) return;
  const ids = nations();
  let a = rng.pick(ids), b = rng.pick(ids.filter((x) => x !== a));
  // 절반은 맞닿은 이웃끼리: 대륙의 일은 대개 국경에서 시작된다
  if (rng.chance(0.5)) { const pr = rng.pick(borderPairs()); [a, b] = pr; }
  if (key(a, b) === 'leonia|valhart') return;
  const rel = relOf(g, a, b);
  const war = warOf(g, a, b);
  if (war) return;
  if (rel > 35 && !pactOf(g, a, b, 'alliance') && rng.chance(0.5)) {
    addPact(g, a, b, 'alliance'); tally(g, 'alliance');
    tell(g, say, record, `${J(full(a), '과/와')} ${J(full(b), '이/가')} 동맹을 맺었다. 한쪽이 칼을 맞으면 다른 쪽도 칼을 뽑기로 했다.`, true);
    if (a === 'valhart' || b === 'valhart') nudge(g, 'tension', 3);
    return;
  }
  if (rel > 15 && !pactOf(g, a, b, 'trade') && rng.chance(0.5)) {
    addPact(g, a, b, 'trade'); tally(g, 'trade');
    tell(g, say, record, `${J(short(a), '과/와')} ${J(short(b), '이/가')} 교역 조약을 맺었다. 국경의 관세가 내려가고 짐마차가 늘었다.`);
    return;
  }
  if (rel > 5 && MARRYING.includes(a) && MARRYING.includes(b) && !pactOf(g, a, b, 'marriage') && rng.chance(0.4)) {
    addPact(g, a, b, 'marriage'); tally(g, 'wed');
    P.wedding = { a, b, at: mi(g) };
    shiftRel(g, a, b, 10);
    const sa = royal(g, rng, a), sb = royal(g, rng, b);
    tell(g, say, record, `${J(sa, '과/와')} ${sb}의 혼인이 정해졌다. ${J(short(a), '과/와')} ${short(b)}의 핏줄이 하나로 묶인다.`, true);
    return;
  }
  // 전쟁: 사이가 아주 나쁘고, 다툴 땅이 있고, 둘 다 다른 전쟁 중이 아니고, 휴전 중이 아닐 때
  if (rel < -40 && neighbors(g, a, b) && !pactOf(g, a, b, 'truce') && !overlordOf(g, a) && !overlordOf(g, b)) {
    if (a === 'leonia' || b === 'leonia') return; // 레오니아의 전쟁은 world.js가 맡는다
    const [att, def] = NATURE[a].greed * strength(g, a) >= NATURE[b].greed * strength(g, b) ? [a, b] : [b, a];
    if (ownWars(g).some((w) => [w.a, w.b].includes(att) || [w.a, w.b].includes(def))) return;
    if (!contested(g, att, def).length || !rng.chance(0.35 + NATURE[att].greed * 0.4)) return;
    declareWar(g, rng, say, record, att, def);
  }
}
function royal(g, rng, id) {
  if (id === 'leonia') return rng.pick(['레오니아의 왕녀', '레오니아 왕가의 셋째 왕자', '레오니아 왕실의 공녀']);
  const r = rulerOf(g, id);
  return `${full(id)} ${r?.house ?? ''} 가문의 ${rng.pick(['맏딸', '둘째 아들', '조카딸', '막내 왕자'])}`.replace('  ', ' ');
}
export function declareWar(g, rng, say, record, att, def, cause = null) {
  const P = PS(g);
  dropPact(g, att, def, 'alliance'); dropPact(g, att, def, 'trade');
  P.wars.push({ a: att, b: def, since: mi(g), score: 0, weary: 0, taken: [] }); tally(g, 'war');
  shiftRel(g, att, def, -15);
  const why = cause ?? rng.pick(['국경의 다리 하나를 두고 시작된 다툼이었다', '사절 한 명이 목이 잘려 돌아왔다', '상인 행렬이 털린 것을 두고 서로를 탓했다', '오래된 땅문서 한 장이 꺼내졌다']);
  tell(g, say, record, `${J(full(att), '이/가')} ${full(def)}에 전쟁을 선포했다. ${why}.`, true);
  // 침략당한 나라는 손을 내민다: 침략자를 미워하는 나라가 동맹이 되어 준다
  const helper = nations().filter((x) => ![att, def, 'leonia'].includes(x) && relOf(g, x, att) < -15 && relOf(g, x, def) > -10 && !pactOf(g, x, def, 'alliance')).sort((x, y) => relOf(g, x, att) - relOf(g, y, att))[0];
  if (helper && rng.chance(0.55)) {
    addPact(g, helper, def, 'alliance'); tally(g, 'alliance');
    shiftRel(g, helper, def, 15);
    tell(g, say, record, `${J(full(helper), '이/가')} ${full(def)}의 손을 잡았다. ${short(att)}의 칼끝이 언젠가 자기에게도 올 것을 아는 것이다.`, true);
  }
  // 동맹이 끼어든다: 당장 전쟁을 하진 않지만 사이가 틀어진다
  for (const x of alliesOf(g, def)) if (x !== att) shiftRel(g, x, att, -15);
  for (const x of alliesOf(g, att)) if (x !== def) shiftRel(g, x, def, -10);
}

// ---------- 전쟁의 한 달 ----------
function wars(g, rng, say, record) {
  const P = PS(g);
  for (const w of [...P.wars]) {
    w.weary += 1;
    const sa = strength(g, w.a, w.b), sb = strength(g, w.b, w.a);
    // 지키는 쪽은 제 땅에서 싸운다
    const sb2 = sb * 1.12;
    w.score += (sa - sb2) / 22 + rng.normal(0, 2.4) + (w.push ?? 0);
    w.push = 0;
    // 땅이 넘어간다
    if (Math.abs(w.score) >= 15) {
      const win = w.score > 0 ? w.a : w.b, lose = foeIn(w, win);
      const cands = contested(g, win, lose).filter((l) => landOwner(g, l) === lose);
      if (cands.length) {
        cands.sort((x, y) => (LANDS[y].home === win) - (LANDS[x].home === win));
        const land = cands[0];
        P.owner[land] = win; tally(g, 'land');
        w.taken.push({ land, by: win });
        P.stab[lose] = clamp(P.stab[lose] - 8, 0, 100);
        P.stab[win] = clamp(P.stab[win] + 3, 0, 100);
        const back = LANDS[land].home === win;
        tell(g, say, record, back ? `${J(full(win), '이/가')} ${J(LANDS[land].name, '을/를')} 되찾았다. 성문에 옛 깃발이 다시 올랐다.` : `${J(LANDS[land].name, '이/가')} 함락되었다. 이제 ${full(win)}의 깃발이 걸렸다. ${short(lose)} 사람들이 짐을 싸서 성문을 빠져나갔다.`, true);
      } else P.stab[lose] = clamp(P.stab[lose] - 3, 0, 100);
      w.score *= 0.35;
    }
    // 끝: 지치거나, 한쪽이 무너지거나
    const lead = w.score > 0 ? w.a : w.b, lag = foeIn(w, lead);
    const end = (w.weary > 20 && rng.chance(0.025 + (w.weary - 20) * 0.004)) || (P.stab[lag] < 12 && rng.chance(0.15));
    if (end) peace(g, rng, say, record, w, lead, lag);
  }
}
export function peace(g, rng, say, record, w, lead, lag, by = null) {
  const P = PS(g);
  P.wars = P.wars.filter((x) => x !== w); tally(g, 'peace');
  const took = w.taken.filter((t) => t.by === lead && landOwner(g, t.land) === lead).map((t) => LANDS[t.land].name);
  addPact(g, w.a, w.b, 'truce', 120);
  P.rel[key(w.a, w.b)] = -15;
  // 무너진 쪽이 아주 약하면 신하의 예를 바친다
  const crushed = P.stab[lag] < 8 && strength(g, lead) > strength(g, lag) * 1.6 && !overlordOf(g, lag) && NATURE[lag].kind !== 'ageless' && rng.chance(0.35);
  if (crushed) addPact(g, lead, lag, 'vassal');
  const terms = crushed ? `${J(full(lag), '은/는')} ${full(lead)}에 신하의 예를 바치기로 했다.` : took.length ? `${took.join(', ')}은(는) ${full(lead)}의 땅으로 남는다.` : '어느 쪽도 땅을 얻지 못했다. 무덤만 늘었다.';
  tell(g, say, record, `${J(short(w.a), '과/와')} ${short(w.b)} 사이에 강화가 맺어졌다${by ? ` (${by})` : ''}. ${terms} 열 해 동안 칼을 거두기로 했다.`, true);
}

// ---------- 레오니아와 엮인 것: 동맹은 발하르트 전선을 민다, 대륙의 일이 긴장을 흔든다 ----------
function leoniaTies(g, rng) {
  const b = g.realm?.balhart;
  if (!b) return;
  if (b.war) {
    for (const x of alliesOf(g, 'leonia')) if (x !== 'valhart' && rng.chance(0.15)) nudge(g, 'front', 0.15);
    for (const x of alliesOf(g, 'valhart')) if (x !== 'leonia' && rng.chance(0.15)) nudge(g, 'front', -0.15);
  }
  // 발하르트가 다른 전쟁에 묶여 있으면 레오니아와의 긴장이 조금 내려간다
  if (ownWars(g).some((w) => w.a === 'valhart' || w.b === 'valhart') && rng.chance(0.2)) nudge(g, 'tension', -0.5);
}

WORLD_TICKS.push((g, rng, say, record) => {
  if (!g.politics) return;
  rulers(g, rng, say, record);
  drift(g, rng);
  diplomacy(g, rng, say, record);
  wars(g, rng, say, record);
  leoniaTies(g, rng);
});
