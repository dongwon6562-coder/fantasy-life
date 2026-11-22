// 기술 나무가 자라는 법 (도우미스레드3, 34단계). 시간만으로는 나오지 않는다.
//   열린 끝(선행 기술이 다 나온 것)만 진척이 쌓인다. 쌓이는 빠르기 = 연구할 사람 × 재료 × 수요 × 그 기술의 운(판마다 다름).
//   연구할 사람: 그 갈래를 미는 세력(history powers)과 이름난 학자·마법사. 재료: 마석(마나 흐름과 고갈), 쇠. 수요: 전쟁·흉년·돌림병·장사·마석 고갈·마물.
//   다른 나라도 따로 연구한다. 남이 먼저 만들면 소문과 물건이 건너와 우리 쪽 진척이 빨라진다.
//   상태는 g.techtree = { prog: { id: [쌓인 진척, 그 기술의 운] }, abroad: { id: [나라, 해] }, fprog: { id: 쌓인 진척 }, log: [] }
import { TECHS, TECH, ERA_KEYS } from './nodes.js';
import { J } from '../narrative/text.js';
import { makeRng } from '../rng.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const TT = (g) => (g.techtree ??= { prog: {}, abroad: {}, fprog: {}, when: {}, log: [] });
export const doneList = (g) => g.history?.inventions ?? [];
export const isDone = (g, id) => doneList(g).includes(id);
export const isOpen = (g, t) => !isDone(g, t.id) && t.needs.every((n) => isDone(g, n));
// 한 기술에 드는 품 (달마다 1쯤 쌓인다고 치면 몇 달 걸리나). 뒤로 갈수록, 큰 발명일수록 크다
export const costOf = (t) => Math.round((135 + t.at * 28) * (t.big ? 1.4 : 1));
// 시대 문턱: 시대를 바꾸는 큰 발명의 눈금
export const ERA_TECH = ERA_KEYS.map((id) => (id ? TECH[id].at : 0));
// 지금 세상의 기술 눈금: 나온 것 가운데 가장 앞선 것 + 연구 중인 것의 진척. 다음 시대의 큰 발명이 나오기 전엔 그 문턱을 넘지 못한다
export function techValue(g) {
  const done = doneList(g), T = TT(g);
  let top = 0;
  for (const id of done) if (TECH[id] && TECH[id].at > top) top = TECH[id].at;
  let part = top;
  for (const t of TECHS) {
    if (!isOpen(g, t) || t.at <= top) continue;
    const p = T.prog[t.id]?.[0] ?? 0;
    part = Math.max(part, top + (t.at - top) * clamp(p / costOf(t), 0, 1) * 0.9);
  }
  const era = ERA_KEYS.findIndex((id, i) => i > 0 && !done.includes(id));
  return era > 0 ? Math.min(part, ERA_TECH[era] - 0.01) : part;
}
// 세상보다 너무 앞선 것은 아직 아무도 떠올리지 못한다
export const reachable = (g, t, tech) => t.at <= (tech ?? techValue(g)) + 0.8;
export const openTechs = (g) => { const tech = techValue(g); return TECHS.filter((t) => isOpen(g, t) && reachable(g, t, tech)); };

// 다른 나라: 저마다 앞서가는 갈래가 다르다
export const FOREIGN = {
  valhart: { name: '발하르트 제국', fields: { war: 1.5, craft: 1.25, city: 1.0 } },
  serenia: { name: '마법도시 세레니아', fields: { magic: 1.5, heal: 1.15, letters: 1.0 } },
  free: { name: '자유도시들', fields: { sea: 1.5, letters: 1.2, city: 1.15, craft: 0.9 } },
  dwarf: { name: '드워프 산하', fields: { craft: 1.4, war: 1.0 } },
  elf: { name: '엘프의 숲', fields: { farm: 1.2, magic: 1.0, heal: 1.0 } },
};

function people(g, field) {
  const P = g.history?.powers ?? {}, v = (k) => P[k] ?? 45;
  const wise = (g.history?.notables ?? []).filter((n) => (n.kind === 'scholar' || n.kind === 'mage') && (n.fame ?? 0) >= 50).length;
  const w = Math.min(0.3, wise * 0.06);
  switch (field) {
    case 'farm': return 0.65 + v('nobles') / 250;
    case 'craft': return 0.5 + v('merchants') / 110;
    case 'magic': return 0.4 + v('mages') / 100 + w;
    case 'letters': return 0.5 + (v('church') * 0.3 + v('mages') * 0.3 + v('merchants') * 0.4) / 110 + w;
    case 'sea': return 0.5 + v('merchants') / 110;
    case 'war': return 0.4 + v('knights') / 85;
    case 'city': return 0.5 + (v('merchants') + v('nobles')) / 230;
    case 'heal': return 0.4 + (v('mages') * 0.6 + v('church') * 0.4) / 100 + w * 0.5;
    default: return 1;
  }
}
function need(g, t) {
  if (!t.demand?.length) return 1;
  const r = g.realm ?? {}, w = g.world ?? {}, P = g.history?.powers ?? {}, dep = g.later?.deplete ?? 0;
  let m = 0;
  for (const d of t.demand) {
    if (d === 'war' && (r.balhart?.war || r.north?.war || r.succession === 'civilwar')) m = Math.max(m, 1.6);
    else if (d === 'famine' && (w.famine || (r.bread ?? 1) >= 1.4)) m = Math.max(m, 1.7);
    else if (d === 'plague' && w.plague) m = Math.max(m, 1.7);
    else if (d === 'trade' && (P.merchants ?? 45) >= 55) m = Math.max(m, 1.3);
    else if (d === 'depletion' && dep >= 30) m = Math.max(m, 1 + dep / 60);
    else if (d === 'monsters' && (r.monsters ?? 0) >= 60) m = Math.max(m, 1.4);
  }
  return m || 0.85;
}
function stuff(g, t) {
  if (t.mat === 'stone') return clamp(1 + (g.mana?.tide ?? 0) / 250 - (g.later?.deplete ?? 0) / 200, 0.55, 1.35);
  if (t.mat === 'iron') return (g.realm?.balhart?.war || g.realm?.north?.war) ? 1.15 : 1;
  return 1;
}
// 세력이 반기거나 막으면 (later_era가 갈래마다 배율을 적어 둔다)
const favor = (g, t) => clamp((g.later?.mul?.[t.id] ?? 1) * (g.later?.fmul?.[t.field] ?? 1), 0.4, 1.6);
export const speedOf = (g, t) => people(g, t.field) * need(g, t) * stuff(g, t) * favor(g, t);
// 한 달 이 고장에서 기술 나무를 미는 힘이 가장 센 곳 (화면용: 지금 연구 중인 곳)

const techRng = (g) => makeRng({ s: ((g.rngState?.s ?? 977) ^ Math.imul((g.date.year * 12 + g.date.month) * 151 + 29, 2654435761)) | 0 });

function credit(g, t, rng) {
  const hist = g.history;
  if (!hist) return '세레니아의 공방';
  if (t.by === 'company') {
    const c = [...(hist.companies ?? [])].sort((a, b) => (b.kind === 'manastone') - (a.kind === 'manastone') || b.fortune - a.fortune)[0];
    if (c) { c.fortune = clamp(c.fortune + (t.big ? 12 : 5), 0, 100); return c.name; }
    return '하르펜의 큰 상단';
  }
  const n = (hist.notables ?? []).filter((x) => x.kind === t.by || (t.by === 'scholar' && x.kind === 'mage')).sort((a, b) => b.fame - a.fame)[0];
  if (n && rng.chance(0.7)) { n.fame = clamp(n.fame + (t.big ? 12 : 5), 0, 100); return `${n.kind === 'mage' ? '마법사' : '학자'} ${n.name} ${n.lastName}`; }
  return t.by === 'mage' ? '세레니아 마탑의 마법사들' : '왕립 서고의 학자들';
}
function place(g, id, text) {
  const pl = g.history.places ??= {};
  pl[id] = pl[id] ?? [];
  if (!pl[id].includes(text)) pl[id].push(text);
  if (pl[id].length > 8) pl[id].shift();
}
export function tlog(g, text) {
  const T = TT(g);
  T.log.push({ y: g.date.year, m: g.date.month, text });
  if (T.log.length > 30) T.log.splice(0, T.log.length - 30);
}
export const AFTER_TECH = []; // (g, t, who, say) 기술이 나왔을 때 다른 갈래가 붙는 곳

/** 한 달: history powers 틱에서 부른다 (예전 inventions() 자리) */
export function techGrow(g, worldRng, say, record) {
  if (!g.history || !g.realm) return;
  const T = TT(g), rng = techRng(g), r = g.realm;
  const tech = techValue(g);
  const mineId = g.research?.project?.kind === 'invent' && g.research.project.prog >= 0.2 ? g.research.project.id : null;
  let born = 0;
  for (const t of TECHS) {
    if (!isOpen(g, t) || !reachable(g, t, tech)) continue;
    const pr = (T.prog[t.id] ??= [0, Math.round(rng.float(0.55, 1.45) * 100) / 100]);
    const from = T.abroad[t.id] ? 2.2 : 1;
    const mine = t.id === mineId ? 0.25 : 1; // 플레이어가 한창 연구 중이면 남들도 더디다 (경쟁·도용은 research 사건)
    pr[0] = Math.round((pr[0] + speedOf(g, t) * pr[1] * from * mine * rng.float(0.6, 1.4)) * 100) / 100;
    // 다른 나라
    if (!T.abroad[t.id]) {
      const best = Object.entries(FOREIGN).map(([k, f]) => [k, f.fields[t.field] ?? 0]).sort((a, b) => b[1] - a[1])[0];
      if (best[1] > 1.15) {
        T.fprog[t.id] = Math.round(((T.fprog[t.id] ?? 0) + best[1] * 0.55 * rng.float(0.5, 1.5)) * 100) / 100;
        if (T.fprog[t.id] >= costOf(t) && pr[0] < costOf(t)) {
          T.abroad[t.id] = [best[0], g.date.year];
          delete T.fprog[t.id];
          say(`${J(FOREIGN[best[0]].name, '이/가')} ${J(t.name, '을/를')} 먼저 쓰기 시작했다는 소식이 건너왔다. 우리 공방과 학자들이 그것을 흉내 내려고 바빠졌다.`);
          tlog(g, `${FOREIGN[best[0]].name}에서 ${J(t.name, '이/가')} 먼저 나왔다.`);
        }
      }
    }
    if (pr[0] >= costOf(t) && born < 1) {
      born += 1;
      g.history.inventions.push(t.id);
      (T.when ??= {})[t.id] = g.date.year;
      delete T.prog[t.id]; delete T.fprog[t.id];
      const who = credit(g, t, rng);
      const came = T.abroad[t.id] ? ` ${FOREIGN[T.abroad[t.id][0]].name}에서 먼저 쓰던 것을 들여왔다고 한다.` : '';
      say(`${J(who, '이/가')} ${t.text}.${came}`, !!t.big);
      record(`발명: ${t.text.split('.')[0]} (${who})`);
      place(g, t.where, t.look);
      tlog(g, `${J(t.name, '이/가')} 나왔다 (${who}).`);
      for (const fn of AFTER_TECH) fn(g, t, who, say);
    }
  }
  r.tech = techValue(g);
}

// 처음 시작할 때: 기술마다 출발점이 조금씩 다르다 (같은 해에 몰려 나오지 않게)
export function seedTree(g, rng) {
  const T = TT(g);
  for (const t of TECHS) if (!t.needs.length) T.prog[t.id] = [Math.round(rng.float(0, 0.35) * costOf(t)), Math.round(rng.float(0.55, 1.45) * 100) / 100];
}
// 예전 저장: 기술 눈금보다 한참 뒤인 작은 기술은 이미 나온 것으로 친다 (연표 앞쪽에 조용히)
export function migrateTree(g) {
  if (g.techtree || !g.history) return;
  TT(g);
  const old = g.realm?.tech ?? 0, inv = g.history.inventions;
  const before = TECHS.filter((t) => !inv.includes(t.id) && t.at <= old - 0.3).map((t) => t.id);
  inv.unshift(...before);
}
