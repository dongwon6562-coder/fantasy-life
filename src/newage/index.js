// 34단계: 새 시대의 사람과 갈등. 상태는 g.newage 하나, 화면 연결점은 newageLines(g) / newageLine(g) / newageInfo(g).
// 기술은 한꺼번에 오지 않는다(동원 11/22). 발명(invented)이 하나씩 쌓일 때마다 작은 갈등부터 생기고, 큰 공장·신문·비밀 모임은 먼 훗날의 일이다.
// 앞쪽(작은 변화):
// - 일손이 남는 마을(마을 방아 erngrind·마석 쟁기 plow): 마을마다 새 연장이 하나씩 들어오고, 남는 일손(hands)이 쌓여 품삯이 내리고 젊은이가 떠난다.
// - 옛 방식을 지키려는 마을: 마을마다 버팀(holdout)이 있어 새 연장을 늦게 들이고, 들일 때마다 조금씩 무너진다.
// - 책과 글, 흔들리는 교단(마도 인쇄기 press): 글 아는 사람(lit)이 아주 천천히 늘고, 찍어 낸 경전·책력을 두고 사제와 다툰다.
// - 조합과 새 공방(화석·온석 화로·마석 방아·인쇄기·마석 화로): 새 공방이 서면 옛 조합과 몇 해를 다투다 닫히거나, 이기거나, 조합에 들어간다.
// - 신흥 부자와 기우는 옛 귀족(발명 셋 이상): 몇 해에 한 번 새 물건으로 돈을 번 집안이 서고, 옛 가문이 저택을 팔거나 돈과 혼인한다.
// - 늙은 부모와 새 시대 자식(발명 둘 이상): 젊은 내가 새 일을 하겠다 할 때(na_parent), 늙은 내 자식이 떠나려 할 때(na_child).
// 뒤쪽(먼 훗날, 여러 발명이 다 모여야):
// - 공장과 기계를 부수는 사람들(마석 화로 + 쇠수레): 도시마다 분노가 쌓이다 밤에 기계를 부순다. revolt의 분노에도 보탠다.
// - 신문과 여론(인쇄기 + 전신탑 + 쇠수레): 신문이 서고 닫히며 여론(opinion)을 민다. 플레이어 칼럼(na_write).
// - 사상가와 비밀 모임(신문 시대 + 쇠수레 길): 금지된 생각을 나누는 모임이 커지다 잡히거나 드러난다.
// 플레이어 장면은 그 형편일 때만 뜬다. 새 행동은 칼럼(na_write) 하나, 칼럼이 있을 때만. 게임 난수는 건드리지 않는다(ownRng).
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainSkill, gainStat } from '../game.js';
import { byId, ageYears } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, tired, check } from '../adventure/core.js';
import { rel } from '../relations.js';
import { isJailed, reportCrime, CRIMES } from '../crime.js';
import { makeRng } from '../rng.js';
import { deed } from '../repute/index.js';
import { pnews } from '../politics/state.js';
import * as T from './lines.js';
import { invented } from '../era/state.js';

CRIMES.sedition ??= { name: '반역 선동', heat: 30, sev: 6, noto: 4 };

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Jq = (w, pair) => `'${w}'${J(w, pair).slice(String(w).length)}`;
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 211) ^ Math.imul(mi(g) * 197 + salt + 47, 2654435761)) | 0 });
const here = (g) => L(g).place ?? 'ern';
const tech = (g) => g.realm?.tech ?? 0;
const inv = (g, id) => invented(g, id);
const nInv = (g) => (g.history?.inventions ?? []).length;
export const CITIES = ['leocast', 'harfen', 'verden', 'eisen', 'barka', 'portel', 'serenia', 'solaris'];
export const VILLAGES = ['ern', 'gruental', 'klein', 'saltrock'];
export const TOWNS = ['harfen', 'leocast', 'verden', 'eisen', 'gruental', 'barka'];
const LEAN_W = [['crown', 3], ['reform', 3], ['trade', 2], ['church', 2], ['radical', 1]];

/* ---------- 무엇이 열렸나 ---------- */
export function openOf(g) {
  const n = nInv(g);
  const papers = inv(g, 'press') && inv(g, 'signal') && inv(g, 'ironcart');
  return {
    // 앞쪽: 작은 변화
    hands: inv(g, 'erngrind') || inv(g, 'plow'),
    books: inv(g, 'press'),
    guild: Object.keys(T.SHOP).some((id) => inv(g, id)),
    rich: n >= 3,
    generation: n >= 2,
    // 뒤쪽: 먼 훗날
    breakers: inv(g, 'forge') && inv(g, 'ironcart'),
    press: papers,
    society: papers && inv(g, 'railroad'),
  };
}
const anyOpen = (o) => Object.values(o).some(Boolean);

/* ---------- 상태 ---------- */
export function newageState(g) {
  g.newage ??= {};
  const s = g.newage;
  s.rich ??= [];      // 신흥 부자 집안 [{ id, name, trade, place, y, wealth, gone }]
  s.old ??= [];       // 기운 옛 가문 [{ name, place, y, fate: sold|married|ruined, to }]
  s.anger ??= {};     // 도시 → 기계에 대한 분노 0~100
  s.breaks ??= [];    // 기계를 부순 밤 [{ y, place, end: hanged|spared|paid }]
  s.papers ??= [];    // [{ id, name, place, lean, y, closed }]
  s.opinion ??= 40;   // 여론: 고치자는 쪽 0~100
  s.societies ??= []; // [{ id, name, idea, place, y, heat, members, end: null|crushed|open }]
  s.holdout ??= {};   // 마을 → 옛 방식을 지키는 힘 0~100
  s.gave ??= [];      // 옛 방식을 내려놓은 마을 [{ place, y }]
  s.hands ??= {};     // 마을 → 남는 일손 0~100
  s.tools ??= {};     // 마을 → 들인 새 연장 id 목록
  s.left ??= 0;       // 일손이 남아 마을을 떠난 사람 (어림)
  s.lit ??= 0;        // 글 아는 사람의 몫 0~100 (인쇄기 뒤 아주 천천히)
  s.books ??= [];     // 책을 두고 교단과 부딪친 일 [{ y, place, kind }]
  s.shops ??= [];     // 새 공방과 조합의 다툼 [{ id, inv, place, y, heat, end: null|closed|won|joined }]
  s.me ??= {};
  s.me.column ??= null;  // { paper(id), lean, n, at }
  s.me.society ??= null; // society id
  s.me.done ??= {};      // 장면 열쇠 → 달
  s.month ??= [];
  s.used ??= [];
  s.log ??= [];
  s.seq ??= 1;
  s.sceneAt ??= -99;
  s.lineAt ??= -99;
  for (const v of VILLAGES) { s.holdout[v] ??= null; s.hands[v] ??= 0; s.tools[v] ??= []; }
  return s;
}
const S = newageState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.shift(); }
function line(g, kind, text) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind, text }); }
function pickFresh(g, rng, key, pool) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${key}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${key}${i}`); if (s.used.length > 24) s.used.shift();
  return pool[i];
}
const wpick = (rng, arr) => { const tot = arr.reduce((a, [, w]) => a + w, 0); let r = rng.float(0, tot); for (const [k, w] of arr) { r -= w; if (r <= 0) return k; } return arr[0][0]; };
const activeRich = (s) => s.rich.filter((x) => !x.gone);
const activePapers = (s) => s.papers.filter((x) => !x.closed);
const activeSoc = (s) => s.societies.filter((x) => !x.end);
const activeShops = (s) => s.shops.filter((x) => !x.end);
const lastRich = (s) => activeRich(s).slice(-1)[0] ?? null;
const lastOld = (s) => s.old.slice(-1)[0] ?? null;
const free = (g) => playerAge(g) >= 16 && !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.army?.campaign;
const ctxW = (g, rng, pl) => {
  const s = S(g);
  const r = lastRich(s); const o = lastOld(s);
  const soc = activeSoc(s).find((x) => x.place === pl) ?? activeSoc(s)[0];
  return { place: placeName(pl), rich: r?.name ?? `${rng.pick(T.RICH_SURNAMES)} 집안`, old: o?.name ?? rng.pick(T.OLD_HOUSES), mill: T.RICH_TRADES[r?.trade ?? 'mill'], idea: soc ? T.IDEAS[soc.idea].name : T.IDEAS.equal.name, tool: toolOf(g, pl) };
};

const toolOf = (g, pl) => { const t = (g.newage?.tools?.[pl] ?? []).slice(-1)[0] ?? (inv(g, 'plow') ? 'plow' : 'erngrind'); return T.VTOOL[t]; };
const nextTool = (g, v) => Object.keys(T.VTOOL).find((id) => inv(g, id) && !S(g).tools[v]?.includes(id)) ?? null;

/* ---------- 세상의 흐름 (플레이어 없이도) ---------- */
function richTick(g, rng) {
  const s = S(g);
  // 몇 해에 한 번. 그해 나와 있는 물건으로만 돈을 번다.
  if (g.date.month !== 4 || !rng.chance(0.1 + Math.min(0.15, (nInv(g) - 3) * 0.02))) return;
  const trades = [...(inv(g, 'manamill') ? ['mill'] : []), ...(inv(g, 'streetlamp') ? ['lamp'] : []), ...(inv(g, 'forge') ? ['forge'] : []), ...(inv(g, 'press') ? ['press'] : []), ...(inv(g, 'ironcart') ? ['cart'] : []), ...(inv(g, 'manamill') || inv(g, 'forge') ? ['stone'] : []), ...(inv(g, 'forge') && inv(g, 'ironcart') ? ['cloth'] : [])];
  if (!trades.length) return;
  const pl = rng.pick(CITIES.filter((c) => PLACES[c]));
  const used = new Set(s.rich.map((x) => x.name));
  const sn = rng.pick(T.RICH_SURNAMES.filter((n) => !used.has(`${n} 집안`))) ?? rng.pick(T.RICH_SURNAMES);
  const r = { id: s.seq++, name: `${sn} 집안`, trade: rng.pick(trades), place: pl, y: g.date.year, wealth: rng.int(40, 80), gone: false };
  s.rich.push(r);
  if (s.rich.length > 14) s.rich.shift();
  // 옛 가문 하나가 기운다
  if (rng.chance(0.4)) {
    const oldUsed = new Set(s.old.slice(-5).map((x) => x.name));
    const on = rng.pick(T.OLD_HOUSES.filter((n) => !oldUsed.has(n)));
    const fate = rng.pick(['sold', 'sold', 'married', 'ruined']);
    s.old.push({ name: on, place: pl, y: g.date.year, fate, to: r.name });
    if (s.old.length > 14) s.old.shift();
    if (fate === 'ruined') chron(g, `${on} 가문, 빚에 몰려 땅과 작위를 잃다.`, 50);
  }
  chron(g, `${placeName(pl)}에서 ${T.RICH_TRADES[r.trade]}로 돈을 번 ${J(r.name, '이/가')} 옛 귀족만큼 부유해지다.`, 50);
  // 오래된 부자는 기운다
  for (const x of activeRich(s)) if (g.date.year - x.y > 30 && rng.chance(0.15)) x.gone = true;
  if (rng.chance(0.5)) line(g, 'rich', pickFresh(g, rng, 'rich', T.RICH_LINE)(ctxW(g, rng, pl)));
}
function breakerTick(g, rng) {
  const s = S(g);
  const bread = g.realm?.bread ?? 1;
  const t = tech(g);
  for (const pl of CITIES) {
    const machines = (pl === 'harfen' || pl === 'leocast' || inv(g, 'railroad') || t >= 5) && inv(g, 'forge') && inv(g, 'ironcart');
    const a = s.anger[pl] ?? 0;
    const grow = machines ? 0.5 + (bread > 1.3 ? 0.6 : 0) + (g.world?.famine ? 0.5 : 0) : -0.4;
    s.anger[pl] = clamp(a + grow - 0.25 + rng.normal(0, 0.3), 0, 100);
    if (s.anger[pl] >= 60 && rng.chance(0.04)) {
      const end = rng.pick(['hanged', 'spared', 'paid']);
      s.breaks.push({ y: g.date.year, m: g.date.month, place: pl, end });
      if (s.breaks.length > 20) s.breaks.shift();
      s.anger[pl] = clamp(s.anger[pl] - 45, 0, 100);
      const v = g.revolt; if (v?.anger && v.anger[pl] != null) v.anger[pl] = clamp(v.anger[pl] + (end === 'hanged' ? 12 : 5), 0, 100);
      const c = { mill: rng.pick(['마석 화로 대장간', '쇠수레 공장', ...(inv(g, 'manamill') ? ['마석 방아'] : [])]) };
      const how = { hanged: '붙잡힌 일꾼 넷이 광장에서 목이 매달렸다', spared: '붙잡힌 사람들은 매질만 당하고 풀려났다', paid: '주인이 일자리를 몇 개 되돌리겠다고 약조했다' }[end];
      chron(g, `${placeName(pl)}에서 일자리를 잃은 사람들이 밤에 ${J(c.mill, '을/를')} 부수다. ${how}.`, 60);
      pnews(g, `${placeName(pl)}에서 밤사이 기계가 부서졌다. ${how}.`);
      if (here(g) === pl || rng.chance(0.4)) line(g, 'breaker', `${placeName(pl)}에서 밤사이 ${J(c.mill, '이/가')} 부서졌다고 한다. ${how}.`);
      if (end !== 'paid') s.opinion = clamp(s.opinion + (end === 'hanged' ? 4 : 2), 0, 100);
    }
  }
}
function breakerMutter(g, rng) {
  const s = S(g);
  const hot = CITIES.filter((c) => (s.anger[c] ?? 0) >= 30);
  if (hot.length && rng.chance(0.04)) { const pl = rng.pick(hot); line(g, 'breaker', pickFresh(g, rng, 'br', T.BREAKER_LINE.slice(0, 2))({ place: placeName(pl), mill: rng.pick(['마석 화로 대장간', '쇠수레 공장']) })); }
}
function pressTick(g, rng) {
  const s = S(g);
  const act = activePapers(s);
  if (g.date.month === 2 && act.length < 4 && rng.chance(act.length ? 0.35 : 0.8)) {
    const lean = wpick(rng, LEAN_W.map(([k, w]) => [k, w + (k === 'radical' && s.opinion > 60 ? 2 : 0)]));
    const used = new Set(s.papers.map((x) => x.name));
    const name = rng.pick(T.PAPER_NAMES.filter((n) => !used.has(n))) ?? `${rng.pick(T.PAPER_NAMES)} ${s.seq}`;
    const pl = rng.pick(['leocast', 'harfen', 'harfen', 'verden', 'barka', 'portel']);
    s.papers.push({ id: s.seq++, name, place: pl, lean, y: g.date.year, closed: null });
    if (s.papers.length > 14) s.papers.shift();
    chron(g, `${placeName(pl)}에서 ${T.LEAN[lean].name} 신문 ${Jq(name, '이/가')} 처음 찍혀 나오다.`, 45);
  }
  // 왕실 편이 아닌 신문은 가끔 닫힌다(검열, 빚)
  if (g.date.month === 9) for (const p of act) {
    const risk = { radical: 0.25, reform: 0.07, church: 0.03, trade: 0.05, crown: 0.02 }[p.lean] * (s.opinion > 65 && p.lean !== 'crown' ? 0.6 : 1);
    if (rng.chance(risk)) { p.closed = g.date.year; chron(g, `신문 ${Jq(p.name, '이/가')} 문을 닫다.`, 35); }
  }
  // 여론: 신문들이 민다
  let push = 0;
  for (const p of activePapers(s)) push += { crown: -0.25, church: -0.15, reform: 0.2, radical: 0.3, trade: 0.1 }[p.lean];
  s.opinion = clamp(s.opinion + push * 0.3 + (g.realm?.bread > 1.4 ? 0.15 : 0) - (s.opinion - 45) * 0.004 + rng.normal(0, 0.2), 0, 100);
  if (activePapers(s).length && rng.chance(0.14)) {
    const p = rng.pick(activePapers(s));
    line(g, 'paper', pickFresh(g, rng, `hd${p.lean}`, T.HEADLINE[p.lean])({ ...ctxW(g, rng, p.place), paper: `'${p.name}'` }));
  }
}
function societyTick(g, rng) {
  const s = S(g);
  if (g.date.month === 11 && activeSoc(s).length < 3 && rng.chance(0.3)) {
    const used = new Set(s.societies.map((x) => x.name));
    const name = rng.pick(T.SOCIETY_NAMES.filter((n) => !used.has(n))) ?? rng.pick(T.SOCIETY_NAMES);
    const idea = rng.pick(Object.keys(T.IDEAS));
    const pl = rng.pick(['leocast', 'harfen', 'serenia', 'barka', 'verden']);
    s.societies.push({ id: s.seq++, name, idea, place: pl, y: g.date.year, heat: rng.int(5, 20), members: rng.int(8, 30), end: null });
    if (s.societies.length > 10) s.societies.shift();
  }
  for (const x of activeSoc(s)) {
    x.members = Math.max(3, Math.round(x.members + rng.normal(s.opinion > 55 ? 0.6 : 0.1, 0.8)));
    x.heat = clamp(x.heat + 0.4 + x.members / 200 + rng.normal(0, 0.4), 0, 100);
    if (g.date.month !== 6) continue;
    if (s.opinion >= 70 && x.members >= 40 && rng.chance(0.3)) {
      x.end = 'open';
      chron(g, `비밀 모임 ${Jq(x.name, '이/가')} 문을 열고 공공연히 모이기 시작하다. 내건 말은 '${T.IDEAS[x.idea].name}'.`, 55);
      line(g, 'society', `${placeName(x.place)}의 비밀 모임 ${Jq(x.name, '이/가')} 이제 대낮에 광장에서 모인다고 한다. 경비대는 멀찍이서 보고만 있다.`);
    } else if (rng.chance(x.heat / 220)) {
      x.end = 'crushed';
      chron(g, `${placeName(x.place)}에서 비밀 모임 '${x.name}'의 사람들이 붙잡히다.`, 55);
      if (S(g).me.society === x.id) queueScene(g, 'na_raid', { sid: x.id }, { first: true });
      else line(g, 'society', `${placeName(x.place)}에서 밤사이 금서를 돌려 읽던 사람들이 끌려갔다고 한다. '${x.name}', 그 이름이 처음으로 사람들 입에 올랐다.`);
    }
  }
  if (activeSoc(s).length && rng.chance(0.05)) { const x = rng.pick(activeSoc(s)); line(g, 'society', pickFresh(g, rng, 'soc', T.SOCIETY_LINE)(ctxW(g, rng, x.place))); }
}
function handsTick(g, rng) {
  const s = S(g);
  for (const v of VILLAGES) {
    if (!PLACES[v]) continue;
    if (s.holdout[v] == null) s.holdout[v] = rng.int(45, 85);
    // 새 연장은 해마다 가을에 한 마을씩 조금씩. 버티는 마을일수록 늦다.
    const nt = nextTool(g, v);
    if (nt && g.date.month === 9 && rng.chance(0.18 * (1 - s.holdout[v] / 130))) {
      s.tools[v].push(nt);
      s.hands[v] = clamp(s.hands[v] + rng.int(15, 28), 0, 100);
      s.holdout[v] = clamp(s.holdout[v] - rng.int(8, 16), 0, 100);
      chron(g, `${placeName(v)}에 ${J(T.VTOOL[nt], '이/가')} 처음 들어오다.`, 35);
      if (here(g) === v || rng.chance(0.3)) line(g, 'hands', `${placeName(v)}에도 ${J(T.VTOOL[nt], '이/가')} 들어왔다. 구경꾼이 사흘 동안 끊이지 않았다.`);
      if (s.holdout[v] < 12 && !s.gave.some((x) => x.place === v)) {
        s.holdout[v] = 0; s.gave.push({ place: v, y: g.date.year });
        chron(g, `${placeName(v)}, 끝까지 버티던 옛 방식을 내려놓다.`, 40);
      }
    }
    // 남는 일손: 떠나는 사람이 생기며 천천히 줄고, 많으면 품삯·분노로 번진다.
    const h = s.hands[v];
    if (h > 0) {
      if (g.date.month === 10 && h >= 25 && rng.chance(0.5)) {
        const n = rng.int(2, 6); s.left += n; s.hands[v] = clamp(h - n * 2.5, 0, 100);
        if (here(g) === v || rng.chance(0.25)) line(g, 'hands', `${placeName(v)} 젊은이 ${n}명이 일거리를 찾아 하르펜으로 떠났다. 늙은이들은 장례 치르듯 배웅했다.`);
      } else s.hands[v] = clamp(h - 0.25, 0, 100);
      if (h >= 50) { const rv = g.revolt; if (rv?.anger && rv.anger[v] != null && rng.chance(0.1)) rv.anger[v] = clamp(rv.anger[v] + 1, 0, 100); }
    }
  }
  if (rng.chance(0.06)) {
    const busy = VILLAGES.filter((v) => (s.hands[v] ?? 0) >= 15);
    const hold = VILLAGES.filter((v) => (s.holdout[v] ?? 0) > 20 && nextTool(g, v));
    if (busy.length && (!hold.length || rng.chance(0.6))) { const v = rng.pick(busy); line(g, 'hands', pickFresh(g, rng, 'hd', T.HANDS_LINE)({ place: placeName(v), tool: toolOf(g, v) })); }
    else if (hold.length) { const v = rng.pick(hold); line(g, 'village', pickFresh(g, rng, 'vil', T.VILLAGE_LINE)({ place: placeName(v), tool: T.VTOOL[nextTool(g, v)] })); }
  }
}
function booksTick(g, rng) {
  const s = S(g);
  // 글 아는 사람은 아주 천천히 는다. 백 년에 서른 남짓. 학원·서당이 있으면 조금 더.
  s.lit = clamp(s.lit + 0.022 + (inv(g, 'signal') ? 0.006 : 0) + rng.normal(0, 0.005), 0, 100);
  if (g.date.month !== 3 || !rng.chance(0.18 + s.lit / 300)) return;
  const kind = rng.pick(['scripture', 'almanac', 'scribe', 'school', 'note']);
  const pl = rng.pick(TOWNS.filter((c) => PLACES[c]));
  s.books.push({ y: g.date.year, place: pl, kind });
  if (s.books.length > 16) s.books.shift();
  const chr = {
    scripture: `${placeName(pl)}에서 쉬운 말로 옮긴 경전이 찍혀 나오다. 성당은 사제 없이 읽지 말라고 이르다.`,
    almanac: `${placeName(pl)} 성당, 찍어 낸 책력을 금하다. 축일 날짜가 성당 것과 달랐다.`,
    scribe: `${placeName(pl)}의 필경사 조합, 인쇄소를 두고 관청에 하소연하다.`,
    school: `${placeName(pl)}에 성당이 아닌 사람이 연 글방이 서다.`,
    note: `${placeName(pl)} 성당 문에 경전을 두고 사제와 다른 풀이를 적은 쪽지가 붙다.`,
  }[kind];
  chron(g, chr, 35);
  if (here(g) === pl || rng.chance(0.35)) line(g, 'books', pickFresh(g, rng, 'bk', T.BOOK_LINE)({ place: placeName(pl) }));
}
function guildTick(g, rng) {
  const s = S(g);
  const ids = Object.keys(T.SHOP).filter((id) => inv(g, id));
  // 새 공방은 몇 해에 하나. 같은 물건이라도 고장마다 따로 싸운다.
  if (g.date.month === 5 && activeShops(s).length < 3 && rng.chance(0.18)) {
    const id = rng.pick(ids);
    const opts = TOWNS.filter((c) => PLACES[c] && !s.shops.some((x) => x.inv === id && x.place === c));
    if (opts.length) {
      const pl = rng.pick(opts);
      s.shops.push({ id: s.seq++, inv: id, place: pl, y: g.date.year, heat: rng.int(10, 30), end: null });
      if (s.shops.length > 14) s.shops.shift();
      const sh = T.SHOP[id];
      chron(g, `${placeName(pl)}에 ${J(sh.shop, '이/가')} 서다. ${sh.guild} 조합이 들고일어나다.`, 40);
    }
  }
  for (const x of activeShops(s)) {
    x.heat = clamp(x.heat + rng.normal(0.6, 0.8), 0, 100);
    if (g.date.month !== 11 || g.date.year - x.y < 2) continue;
    if (rng.chance(0.25 + (g.date.year - x.y) * 0.04)) {
      const sh = T.SHOP[x.inv];
      // 처음엔 조합이 이기기 쉽다. 같은 물건이 여러 고장에 퍼질수록 공방이 이긴다.
      const spread = s.shops.filter((y) => y.inv === x.inv && y.end !== 'closed').length;
      x.end = wpick(rng, [['closed', Math.max(1, 5 - spread)], ['won', 2 + spread], ['joined', 3]]);
      const how = { closed: `${sh.guild} 조합이 이겨 ${J(sh.shop, '이/가')} 문을 닫다`, won: `${J(sh.shop, '이/가')} 버텨 내고 ${sh.guild} 조합의 문턱이 낮아지다`, joined: `${sh.guild} 조합이 ${J(sh.shop, '을/를')} 조합원으로 받아들이다` }[x.end];
      const past = { closed: `${sh.guild} 조합이 이겨 ${J(sh.shop, '이/가')} 문을 닫았다`, won: `${J(sh.shop, '이/가')} 버텨 냈고 ${sh.guild} 조합은 견습 문턱을 낮췄다`, joined: `${sh.guild} 조합이 결국 ${J(sh.shop, '을/를')} 조합원으로 받아들였다` }[x.end];
      chron(g, `${placeName(x.place)}에서 ${how}.`, 40);
      if (here(g) === x.place || rng.chance(0.3)) line(g, 'guild', `${placeName(x.place)}에서 ${past}고 한다.`);
    }
  }
  if (activeShops(s).length && rng.chance(0.05)) { const x = rng.pick(activeShops(s)); line(g, 'guild', pickFresh(g, rng, 'gd', T.GUILD_LINE)({ place: placeName(x.place), ...T.SHOP[x.inv] })); }
}

/* ---------- 플레이어 장면 ---------- */
const noble = (g) => g.player.familyId === 'fallen_knight' || g.player.familyId === 'count_bastard' || !!g.player.title || !!g.domain;
const parentOf = (g) => [byId(g, me(g)?.fatherId), byId(g, me(g)?.motherId)].find((p) => p?.alive && ageYears(p) >= 40) ?? null;
const kidOf = (g) => (me(g)?.childIds ?? []).map((id) => byId(g, id)).find((p) => p?.alive && !p.away && ageYears(p) >= 16 && ageYears(p) <= 28) ?? null;
const NEW_THING = (g) => (inv(g, 'railroad') ? '쇠수레 길' : inv(g, 'ironcart') ? '쇠수레' : inv(g, 'forge') ? '마석 화로' : inv(g, 'plow') ? '마석 쟁기' : inv(g, 'press') ? '찍어 낸 책' : inv(g, 'manamill') || inv(g, 'erngrind') ? '마석 방아' : inv(g, 'warmstone') ? '온석 화로' : '화석');
const NEW_WORK = (g) => (inv(g, 'ironcart') ? '쇠수레 공장' : inv(g, 'forge') ? '마석 화로 대장간' : inv(g, 'press') ? '인쇄소' : inv(g, 'manamill') ? '마석 방앗간' : inv(g, 'warmstone') ? '온석 화로 공방' : '화석 공방');
const OLD_THING = (g) => ({ farmer: '밭', merchant: '장사', fallen_knight: '칼', sexton: '종', capital_artisan: '손', port_folk: '바다', march_guard: '성벽' }[g.player.familyId] ?? '땀');
const aff = (p, n) => { if (!p) return; rel(p); p.affection = clamp((p.affection ?? 0) + n, -100, 100); };

defineScene('na_rich_offer', {
  title: () => '옛 가문의 제안',
  text: (g, s) => `${s.old} 가문의 집사가 찾아왔다. 조상 대대로 내려온 저택과 작위 증서를 넘기겠다고. 아니면 그 집 ${s.sex === 'f' ? '딸' : '아들'}과의 혼약도 생각해 볼 수 있다고. 말끝마다 '우리 같은 집안'이라는 말을 붙였다. 돈 냄새를 맡고 온 것이다.`,
  choices: (g) => [...(g.player.money >= 400 ? [{ label: '은화 400닢에 저택을 산다', key: 'buy' }] : []), { label: '혼약을 받아들인다', key: 'wed' }, { label: '돌려보낸다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.rich = mi(g);
    if (key === 'buy' && g.player.money >= 400) { g.player.money -= 400; L(g).renown = (L(g).renown ?? 0) + 4; deed(g, 'generous', 2, `${s.old} 가문의 저택을 샀다`); st.old.push({ name: s.old, place: here(g), y: g.date.year, fate: 'sold', to: g.player.name }); log(g, `${s.old} 가문의 저택을 샀다.`); chron(g, `${g.player.name}, ${s.old} 가문의 옛 저택을 사들이다.`, 60); return `계약서에 도장을 찍는 동안 늙은 가장은 창밖만 보았다. 문장은 떼어 갔다. 정원 참나무는 남겼다. 이웃 귀족들은 나를 '저택 산 장사꾼'이라 부른다. 부르면서 잔치에는 온다.`; }
    if (key === 'wed') { st.me.done.richWed = g.date.year; L(g).renown = (L(g).renown ?? 0) + 2; log(g, `${s.old} 가문과 혼약 이야기가 오갔다.`); return '혼약 이야기가 오가기 시작했다. 그쪽 어머니는 우리 집 은그릇 개수부터 세어 보았다. 이름과 돈이 서로를 저울에 올리는 중이다.'; }
    return '집사가 정중하게 절하고 물러났다. 문밖에서 들리게 혀를 찼다.';
  },
});
defineScene('na_noble_debt', {
  title: () => '돈으로 산 이름',
  text: (g, s) => `${s.rich}의 대리인이 우리 집 빚 문서를 사들였다고 했다. 저택과 문장을 넘기면 빚을 지워 주겠다고. 아니면 그 집안 ${s.sex === 'f' ? '딸' : '아들'}과의 혼인으로 갚아도 된다고. 마석 방아 하나로 우리 가문 삼백 년보다 더 번 집안이다.`,
  choices: () => [{ label: '저택과 문장을 넘긴다', key: 'sell' }, { label: '혼인으로 집안을 잇는다', key: 'wed' }, { label: '버틴다. 빚은 내가 갚는다', key: 'hold' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.noble = mi(g);
    if (key === 'sell') { g.player.money += 250; L(g).renown = Math.max(0, (L(g).renown ?? 0) - 4); stress(g, 10); log(g, '집안 저택과 문장을 신흥 부자에게 넘겼다.'); chron(g, `${g.player.name}의 집안, 옛 저택과 문장을 ${s.rich}에 넘기다.`, 60); return '문장을 떼는 날 장인이 와서 망치질을 했다. 대문 위에 하얗게 남은 자국을 오래 보았다. 빚은 사라졌다. 이름도 반쯤 사라졌다.'; }
    if (key === 'wed') { st.me.done.nobleWed = g.date.year; stress(g, 6); g.player.familyMoney = (g.player.familyMoney ?? 0) + 60; log(g, `${J(s.rich, '과/와')} 혼인 이야기를 받아들였다.`); return '혼약서에 이름을 적었다. 그쪽 아버지는 내 집안 족보를 액자에 넣어 걸겠다고 했다. 돈은 이름을 사고, 이름은 돈에 팔렸다. 둘 다 그걸 안다.'; }
    stress(g, 14); g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) - 20); deed(g, 'brave', 2, '빚에 눌려도 집안 이름을 팔지 않았다'); return '대리인을 돌려보냈다. 그날 밤 장부를 펴 놓고 새벽까지 셈을 했다. 몇 번을 해도 답은 같았다. 그래도 문장은 대문 위에 있다.';
  },
});
defineScene('na_breakers', {
  title: () => '망치를 든 밤',
  text: (g, s) => `${placeName(s.pl)} 술집 뒷방. 일자리를 잃은 방앗간 일꾼, 대장장이, 짐꾼들이 모였다. 탁자 위에 쇠망치 여섯 자루. "오늘 밤 ${J(s.mill, '을/를')} 부순다. 저게 우리 밥줄을 끊었다." 누군가 내 쪽으로 망치 한 자루를 밀었다.`,
  choices: () => [{ label: '망치를 든다', key: 'join' }, { label: '주인에게 미리 알린다', key: 'warn' }, { label: '못 본 것으로 하고 나간다', key: 'leave' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.breakers = mi(g);
    if (key === 'join') {
      tired(g, 15); st.anger[s.pl] = clamp((st.anger[s.pl] ?? 0) - 40, 0, 100); st.breaks.push({ y: g.date.year, m: g.date.month, place: s.pl, end: 'me' }); deed(g, 'brave', 3, `밤에 ${J(s.mill, '을/를')} 부쉈다`, s.pl);
      if (!check(rng, g.player.stats.agi + g.player.stats.sen / 2, 40)) { reportCrime(g, 'sedition', s.pl); stress(g, 12); return `톱니바퀴가 부서지는 소리가 밤을 갈랐다. 도망치다 경비병 하나와 눈이 마주쳤다. 얼굴을 봤을 것이다.`; }
      stress(g, 6); return '쇠망치가 마석 축에 닿을 때 손이 울렸다. 아홉 번 만에 축이 갈라졌다. 새벽까지 아무 데도 불이 켜지지 않았다. 다음 날 장터 사람들은 내 손바닥의 물집을 보고도 모른 척했다.';
    }
    if (key === 'warn') { g.player.money += 30; deed(g, 'loyal', -3, '기계 부수는 사람들을 고자질했다', s.pl); st.anger[s.pl] = clamp((st.anger[s.pl] ?? 0) + 5, 0, 100); return '주인은 은화 서른 닢을 주며 고맙다고 했다. 그날 밤 경비병들이 뒷방을 덮쳤다. 다음 날 술집 주인이 내 잔에 술을 따르지 않았다.'; }
    return '뒷방 문을 닫고 나왔다. 그날 밤 멀리서 쇳소리가 났다. 나는 듣지 않은 것으로 했다.';
  },
});
defineScene('na_column', {
  title: () => '신문사의 제안',
  text: (g, s) => `'${s.name}'의 편집장이 찾아왔다. ${T.LEAN[s.lean].name} 신문이다(${T.LEAN[s.lean].word}). 내 이름과 글이면 한 달에 한 번 칼럼을 실어 주겠다고. 원고료는 적다. 대신 읽는 사람이 많다.`,
  choices: () => [{ label: '칼럼을 맡는다', key: 'take' }, { label: '사양한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.column = mi(g);
    if (key !== 'take') return '편집장은 명함만 남기고 갔다. 그 신문은 다음 주에 다른 사람의 칼럼을 실었다.';
    st.me.column = { paper: s.pid, lean: s.lean, n: 0, at: mi(g) - 2 };
    log(g, `'${s.name}'에 칼럼을 쓰기 시작했다.`);
    return '첫 원고를 세 번 찢었다. 네 번째는 새벽에 썼다. 인쇄소에서 갓 나온 신문에 내 이름이 박혀 있었다. 잉크 냄새가 났다.';
  },
});
ACTIONS.push({
  id: 'na_write', name: '신문에 칼럼을 쓴다', icon: 'book',
  desc: '맡은 신문에 이번 달 칼럼을 보낸다. 여론이 조금 움직이고 이름이 알려진다. 편에 따라 눈 밖에 날 수도 있다.',
  available: (g) => { const c = g.newage?.me?.column; if (!c || !free(g)) return false; const p = g.newage.papers.find((x) => x.id === c.paper); return !!p && !p.closed && mi(g) - c.at >= 1; },
  run(g, rng0) {
    const st = S(g); const c = st.me.column; const p = st.papers.find((x) => x.id === c?.paper);
    if (!c || !p || p.closed || mi(g) - c.at < 1) return '책상 앞에 앉았지만 보낼 데가 없었다.';
    const rng = ownRng(g, 61);
    c.at = mi(g); c.n += 1;
    tired(g, 10); stress(g, 3);
    gainSkill(g, 'letters', 1.2, 'int'); gainStat(g, 'cha', 0.2);
    st.opinion = clamp(st.opinion + { crown: -1.5, church: -1, reform: 1.2, radical: 2, trade: 0.6 }[c.lean], 0, 100);
    L(g).renown = (L(g).renown ?? 0) + (c.n % 4 === 0 ? 1 : 0);
    g.player.money += 3;
    if (c.lean === 'radical' && rng.chance(0.12)) { queueScene(g, 'na_censor', { pid: p.id }, { first: true }); }
    const topic = rng.pick(['빵값', '세금', '기계와 일자리', '마석 광산', '학원의 문턱', '도시의 셋방', '옛 법과 새 법']);
    return `'${p.name}'에 ${J(topic, '을/를')} 두고 칼럼을 보냈다. ${c.n === 1 ? '첫 칼럼이다.' : `${c.n}번째 칼럼이다.`} 원고료 은화 3닢.`;
  },
});
defineScene('na_censor', {
  title: () => '검열관',
  text: (g, s) => `왕실 검열관이 인쇄소에 들이닥쳤다. 지난 칼럼이 문제라고 한다. 편집장이 창백한 얼굴로 나를 본다. 글쓴이 이름을 대라고 한다.`,
  choices: () => [{ label: '내가 썼다고 나선다', key: 'own' }, { label: '편집장 뒤에 숨는다', key: 'hide' }, { label: '칼럼을 그만두겠다고 한다', key: 'quit' }],
  resolve(g, rng, s, key) {
    const st = S(g); const p = st.papers.find((x) => x.id === s.pid);
    if (key === 'own') { reportCrime(g, 'sedition'); deed(g, 'brave', 4, '검열관 앞에서 자기 글이라고 나섰다'); L(g).renown = (L(g).renown ?? 0) + 3; return '"내가 썼소." 검열관이 내 이름을 받아 적었다. 그날 이후 거리에서 모르는 사람이 내게 고개를 숙인다. 경비대도 내 얼굴을 안다.'; }
    if (key === 'hide') { if (p && rng.chance(0.5)) p.closed = g.date.year; st.me.column = null; deed(g, 'loyal', -3, '편집장에게 죄를 넘겼다'); return '편집장이 끌려갔다. 신문은 그 주에 나오지 않았다. 나는 다음 칼럼을 쓰지 않았다. 쓸 데가 없어졌으니까.'; }
    st.me.column = null; return '펜을 내려놓겠다고 했다. 검열관은 만족한 얼굴로 돌아갔다. 편집장은 고맙다는 말도, 원망하는 말도 하지 않았다.';
  },
});
defineScene('na_society', {
  title: () => '비밀 모임의 초대',
  text: (g, s) => `제본소 뒷방에서 쪽지가 왔다. '${s.name}'. 내건 말은 '${T.IDEAS[s.idea].name}', ${T.IDEAS[s.idea].word}. 모임은 그믐밤마다. 들킨 사람은 아직 돌아오지 않았다.`,
  choices: () => [{ label: '그믐밤에 간다', key: 'join' }, { label: '쪽지를 경비대에 넘긴다', key: 'report' }, { label: '쪽지를 태운다', key: 'burn' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.society = mi(g);
    const x = st.societies.find((y) => y.id === s.sid);
    if (key === 'join' && x && !x.end) { st.me.society = x.id; x.members += 1; x.heat = clamp(x.heat + 3, 0, 100); gainSkill(g, 'letters', 1, 'int'); log(g, `비밀 모임 '${x.name}'에 들었다.`); return '촛불 하나 아래 열두 사람. 다들 가명을 쓴다. 나도 가명을 받았다. 그날 밤 읽은 금서의 첫 문장을 아직 외운다.'; }
    if (key === 'report' && x && !x.end) { x.end = 'crushed'; g.player.money += 40; deed(g, 'loyal', -4, '비밀 모임을 고발했다'); chron(g, `${placeName(x.place)}에서 비밀 모임 '${x.name}'의 사람들이 고발로 붙잡히다.`, 55); return '경비대장이 은화 마흔 닢을 세어 주었다. 그믐밤에 붙잡혀 온 사람 중에 아는 얼굴이 하나 있었다. 그는 나를 보지 않았다.'; }
    return '쪽지를 촛불에 태웠다. 재가 된 종이에서 그 말 한 줄이 끝까지 남는 것 같았다.';
  },
});
defineScene('na_raid', {
  title: () => '그믐밤의 습격',
  text: (g, s) => { const x = S(g).societies.find((y) => y.id === s.sid); return `'${x?.name ?? '모임'}'의 그믐밤 모임에 경비대가 들이닥쳤다. 앞문이 부서지는 소리. 누군가 촛불을 껐다. 금서 꾸러미가 내 발치에 있다.`; },
  choices: () => [{ label: '금서를 불에 던지고 뒷창으로 뛴다', key: 'run' }, { label: '남아서 동지들을 빼낸다', key: 'stay' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.society = null;
    if (key === 'stay') { if (check(rng, g.player.stats.str + g.player.stats.agi, 70)) { deed(g, 'loyal', 5, '습격 때 동지들을 빼냈다'); return '뒷골목으로 셋을 끌어냈다. 넷째는 놓쳤다. 그 사람 이름을 아직 모른다. 가명만 안다.'; } reportCrime(g, 'sedition'); stress(g, 15); return '경비병의 곤봉이 어깨를 내리쳤다. 얼굴을 가린 천이 벗겨졌다. 빠져나오긴 했다. 내 얼굴은 남았다.'; }
    stress(g, 8); return '책이 타는 냄새를 등지고 지붕 위를 달렸다. 다음 날 모임은 없었다. 그다음 달에도.';
  },
});
defineScene('na_village', {
  title: () => '마을 회의',
  text: (g, s) => `${placeName(s.pl)} 사람들이 다 모인 회의. 하르펜 상인이 ${J(T.VTOOL[s.tool], '을/를')} 싸게 들여 주겠다고 했다. 늙은 촌장은 반대하고 젊은이들은 찬성한다. 품팔이로 사는 집들은 말이 없다. 다들 내 쪽을 본다.`,
  choices: () => [{ label: '옛 방식을 지키자고 한다', key: 'keep' }, { label: '새 연장을 들이자고 한다', key: 'new' }, { label: '마을이 정할 일이라고 물러선다', key: 'out' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.village = mi(g);
    if (key === 'keep') { st.holdout[s.pl] = clamp((st.holdout[s.pl] ?? 50) + 15, 0, 100); deed(g, 'loyal', 3, '마을의 옛 방식을 편들었다', s.pl); return '촌장이 내 손을 잡았다. 젊은이 몇은 회의가 끝나기도 전에 나갔다. 그해 가을에도 마을은 옛날처럼 일했다. 품팔이 일꾼들은 고맙다는 말 대신 술을 한 잔 샀다.'; }
    if (key === 'new') { st.holdout[s.pl] = clamp((st.holdout[s.pl] ?? 50) - 15, 0, 100); if (!st.tools[s.pl].includes(s.tool)) { st.tools[s.pl].push(s.tool); st.hands[s.pl] = clamp((st.hands[s.pl] ?? 0) + 20, 0, 100); chron(g, `${placeName(s.pl)}에 ${J(T.VTOOL[s.tool], '이/가')} 처음 들어오다.`, 35); } g.player.money += 10; return s.tool === 'plow' ? '새 쟁기가 들어왔다. 한 사람이 두 사람 몫의 밭을 간다. 그해 가을 품팔이 일꾼 셋이 일거리를 못 찾았다. 그중 하나가 내 집 앞을 지나갔다.' : '새 방아가 들어섰다. 빵값이 조금 내렸다. 옛 방앗간 주인은 그해 겨울 도시로 떠났다. 떠나며 내 집 앞을 지나갔다.'; }
    return '마을이 정할 일이라고 했다. 회의는 밤늦도록 이어졌고 결론은 나지 않았다. 다음 해에도 같은 회의가 열릴 것이다.';
  },
});
defineScene('na_parent', {
  title: () => '저녁상의 말다툼',
  text: (g, s) => T.PARENT_ASK({ par: s.name, newThing: NEW_THING(g), oldThing: OLD_THING(g) }),
  choices: () => [{ label: '그래도 도시로 가겠다고 한다', key: 'go' }, { label: '집안 일을 잇겠다고 한다', key: 'stay' }, { label: '둘 다 할 길을 찾아보겠다고 한다', key: 'both' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.parent = g.date.year;
    const p = byId(g, s.id);
    if (key === 'go') { aff(p, -12); stress(g, 6); log(g, '부모와 새 시대를 두고 다투었다.'); return '문이 세게 닫혔다. 다음 날 아침 문간에 도시락 하나가 놓여 있었다. 아무 말도 쓰여 있지 않았다.'; }
    if (key === 'stay') { aff(p, 10); stress(g, 4); return `${J(s.name, '이/가')} 아무 말 없이 내 그릇에 고기를 덜어 주었다. 밤에 혼자 도시 쪽 하늘을 보았다. 거기서는 지금도 누가 새 일을 배우고 있을 것이다.`; }
    if (check(rng, g.player.stats.cha + g.player.stats.int / 2, 45)) { aff(p, 6); return `한참을 설명했다. ${J(s.name, '은/는')} 끝까지 들었다. "그 새것이라는 거, 한 번 구경이나 가 보자." 그 말이 그렇게 반가울 줄 몰랐다.`; }
    aff(p, -4); return '설명할수록 말이 꼬였다. 결국 둘 다 입을 다물었다. 식은 국만 남았다.';
  },
});
defineScene('na_child', {
  title: () => '떠나겠다는 자식',
  text: (g, s) => T.CHILD_ASK({ kid: s.name, place: placeName(s.pl), newWork: NEW_WORK(g) }),
  choices: (g) => [...(g.player.money >= 50 ? [{ label: '노잣돈을 쥐여 보낸다 (은화 50닢)', key: 'bless' }] : [{ label: '말없이 보낸다', key: 'let' }]), { label: '못 간다고 막는다', key: 'forbid' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.child = g.date.year;
    const p = byId(g, s.id);
    if (key === 'bless' && g.player.money >= 50) { g.player.money -= 50; aff(p, 15); if (p) { p.place = s.pl; p.away = true; } log(g, `${J(s.name, '이/가')} 도시로 떠났다.`); return `${J(s.name, '은/는')} 은화 주머니를 받고 한참 서 있었다. 마을 어귀에서 한 번 돌아보았다. 나도 젊을 때 저렇게 한 번 돌아보았다.`; }
    if (key === 'let') { aff(p, 6); if (p) { p.place = s.pl; p.away = true; } return `말없이 문을 열어 주었다. ${J(s.name, '은/는')} 고개를 숙이고 나갔다.`; }
    aff(p, -18); if (p) { rel(p); p.rivalry = clamp((p.rivalry ?? 0) + 15, 0, 100); } stress(g, 6); return '못 간다고 했다. 그날부터 집 안에서 그 아이 목소리가 들리지 않는다. 밥은 먹고, 일도 한다. 말만 하지 않는다.';
  },
});

defineScene('na_hands', {
  title: () => '남는 손',
  text: (g, s) => (s.boss
    ? `${J(T.VTOOL[s.tool], '을/를')} 들이고 나니 올해는 일꾼 둘이 남는다. 둘 다 몇 해째 우리 밭에서 일한 사람이다. 장터 어귀에는 벌써 일거리 없는 사람들이 서 있다. 장부를 펴 보면 답은 하나다.`
    : `올해 추수 품팔이 자리가 없다. ${J(T.VTOOL[s.tool], '을/를')} 들인 집들은 사람을 덜 부른다. 장터 어귀에 같은 처지의 사람이 열둘. 하르펜에 가면 일이 있다는 말이 돈다.`),
  choices: (g, s) => (s.boss
    ? [{ label: '둘을 내보낸다', key: 'cut' }, { label: '그대로 둔다. 품삯은 내가 진다', key: 'keep' }, { label: '다른 집 일을 알아봐 준다', key: 'find' }]
    : [{ label: '하르펜으로 가서 일을 찾는다', key: 'go' }, { label: '새 연장 들인 집에 머리를 숙인다', key: 'bow' }, { label: '마을 회의에 따진다', key: 'speak' }]),
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.hands = mi(g);
    if (key === 'cut') { g.player.money += 25; deed(g, 'kind', -2, '오래 일한 일꾼들을 내보냈다', s.pl); st.hands[s.pl] = clamp((st.hands[s.pl] ?? 0) + 3, 0, 100); return '둘에게 마지막 품삯을 쥐여 주었다. 한 사람은 고개를 숙였고 한 사람은 내 얼굴을 끝까지 보았다. 장부는 가벼워졌다.'; }
    if (key === 'keep') { g.player.money = Math.max(0, g.player.money - 25); deed(g, 'kind', 3, '새 연장을 들이고도 일꾼을 내보내지 않았다', s.pl); return '둘을 그대로 두었다. 밭일은 반나절이면 끝난다. 남는 시간에 울타리를 고치고 도랑을 쳤다. 장부에는 빨간 줄이 하나 늘었다.'; }
    if (key === 'find') { if (check(rng, g.player.stats.cha + (g.player.skills.trade ?? 0) / 2, 45)) { deed(g, 'kind', 2, '일꾼들에게 다른 일자리를 구해 주었다', s.pl); return '이웃 마을 방앗간에 한 사람, 하르펜 짐꾼 조에 한 사람. 둘 다 고맙다고 했다. 둘 다 다시는 이 밭에 오지 않을 것이다.'; } return '이 집 저 집 물어보았지만 다들 사정이 같았다. 결국 둘은 장터 어귀로 갔다.'; }
    if (key === 'go') { g.player.money += 12; tired(g, 10); log(g, '일거리를 찾아 하르펜까지 다녀왔다.'); return '하르펜 성문 밖 인부 시장에서 석 주를 날품 팔았다. 돌아오니 마을이 조금 작아 보였다.'; }
    if (key === 'bow') { g.player.money += 6; stress(g, 6); return '새 연장 들인 집 주인이 반값 품삯에 써 주겠다고 했다. 고맙다고 했다. 집에 와서 한참 앉아 있었다.'; }
    deed(g, 'brave', 2, '마을 회의에서 품팔이들 편을 들었다', s.pl);
    if (check(rng, g.player.stats.cha + g.player.stats.wil / 2, 50)) { st.hands[s.pl] = clamp((st.hands[s.pl] ?? 0) - 10, 0, 100); return '회의에서 따졌다. 새 연장 들인 집들이 추수 때만이라도 품앗이 순번을 지키기로 했다. 다 해결된 건 아니다. 올겨울은 넘긴다.'; }
    stress(g, 5); return '회의에서 따졌다. 촌장은 "연장 사는 걸 막을 법은 없다"고 했다. 맞는 말이라 더 할 말이 없었다.';
  },
});
const BOOK = ['쉬운 말로 옮긴 경전', '찍어 낸 책력', '약초 도감', '옛 기사 이야기책'];
defineScene('na_book', {
  title: () => '종이에 박힌 말',
  text: (g, s) => `장터에서 ${J(s.book, '을/를')} 한 권 샀다. 은화 몇 닢이면 산다. 예전엔 성당에나 있던 물건이다. 저녁 미사 뒤 사제가 내 품의 책을 보고 말했다. "그 책은 성당에 맡겨 두게. 글은 읽을 줄 알아도 뜻은 사제가 풀어야 하네."`,
  choices: () => [{ label: '성당에 맡긴다', key: 'give' }, { label: '이웃들에게 소리 내어 읽어 준다', key: 'read' }, { label: '집에 숨겨 두고 혼자 읽는다', key: 'hide' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.book = mi(g);
    const f = g.faith;
    if (key === 'give') { if (f) f.devotion = clamp((f.devotion ?? 0) + 3, 0, 100); return '책을 내밀었다. 사제는 고개를 끄덕이고 받아 갔다. 그 책이 성당 어느 궤짝에 들어갔는지는 모른다.'; }
    if (key === 'read') {
      gainSkill(g, 'letters', 0.8, 'int'); st.lit = clamp(st.lit + 0.3, 0, 100); deed(g, 'kind', 2, '이웃들에게 책을 읽어 주었다'); L(g).renown = (L(g).renown ?? 0) + 1;
      if (f) { f.suspicion = clamp((f.suspicion ?? 0) + (s.book === BOOK[0] ? 8 : 3), 0, 100); }
      return s.book === BOOK[0] ? '저녁마다 우리 집 마당에 사람이 모였다. 사제가 읽어 주던 대목을 내가 읽으니 다들 다르게 들린다고 했다. 사흘째 되는 날 사제가 마당 밖을 지나갔다. 들어오지는 않았다.' : '저녁마다 우리 집 마당에 사람이 모였다. 글 모르는 노인이 그림 하나를 오래 들여다보았다. 다음 장터에서 같은 책이 다 팔렸다.';
    }
    gainSkill(g, 'letters', 1.2, 'int'); return '책을 이불 밑에 넣어 두고 밤마다 몇 장씩 읽었다. 모르는 낱말은 손톱으로 표시해 두었다. 다 읽는 데 겨울 한 철이 걸렸다.';
  },
});
defineScene('na_guild', {
  title: () => '조합과 새 공방',
  text: (g, s) => `${placeName(s.pl)}의 ${s.guild} 조합장이 찾아왔다. 새 ${J(s.shop, '이/가')} 조합 법을 어기고 값을 깎아 판다고, 조합 사람들은 그 물건을 쓰지도 팔지도 말자는 서약서에 이름을 적는 중이라고. 같은 날 오후 ${s.shop} 주인이 사람을 보내왔다. 일손이 모자라니 와서 일하라고, 품삯은 조합보다 후하다고.`,
  choices: () => [{ label: '조합 서약서에 이름을 적는다', key: 'guild' }, { label: '새 공방에 가서 일한다', key: 'shop' }, { label: '어느 쪽에도 끼지 않는다', key: 'out' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.me.done.guild = mi(g);
    const x = st.shops.find((y) => y.id === s.sid);
    if (key === 'guild') { if (x) x.heat = clamp(x.heat + 8, 0, 100); deed(g, 'loyal', 2, `${s.guild} 조합 편에 섰다`, s.pl); return `서약서에 이름을 적었다. 조합장이 내 어깨를 두드렸다. 그날 저녁 장터에서 ${s.shop} 물건을 든 이웃을 보고 눈을 돌렸다. 이웃도 눈을 돌렸다.`; }
    if (key === 'shop') { g.player.money += 20; gainSkill(g, s.inv === 'press' ? 'letters' : s.inv === 'manamill' ? 'farming' : 'smithing', 1, 'agi'); deed(g, 'loyal', -1, `조합을 두고 ${s.shop}에 일하러 갔다`, s.pl); return `${s.shop}에서 석 주를 일했다. 견습 칠 년 걸리던 일을 사흘 만에 배웠다. 대신 하나만 배웠다. 품삯은 정말 후했다. 조합 사람들은 이제 내게 인사하지 않는다.`; }
    return '양쪽 다 정중하게 돌려보냈다. 조합장은 "중간은 없네" 했고 공방 주인은 "곧 알게 될 걸세" 했다.';
  },
});

function playerTick(g, rng, o) {
  const s = S(g);
  if (!free(g) || mi(g) - s.sceneAt < 8) return false;
  const pl = here(g);
  const age = playerAge(g);
  const done = s.me.done;
  const q = (kind, data) => { queueScene(g, kind, data); s.sceneAt = mi(g); return true; };
  if (o.generation && age >= 16 && age <= 30 && !done.parent) { const p = parentOf(g); if (p && rng.chance(0.06)) return q('na_parent', { id: p.id, name: p.name }); }
  if (o.generation && age >= 45 && (!done.child || g.date.year - done.child >= 8)) { const k = kidOf(g); if (k && rng.chance(0.05)) return q('na_child', { id: k.id, name: k.name, pl: rng.pick(['harfen', 'leocast']) }); }
  if (o.rich && !noble(g) && g.player.money >= 600 && (!done.rich || mi(g) - done.rich >= 60) && rng.chance(0.05)) return q('na_rich_offer', { old: rng.pick(T.OLD_HOUSES), sex: me(g).sex === 'm' ? 'f' : 'm' });
  if (o.rich && noble(g) && g.player.money < 300 && (!done.noble || mi(g) - done.noble >= 72) && rng.chance(0.04)) { const r = lastRich(s); return q('na_noble_debt', { rich: r?.name ?? `${rng.pick(T.RICH_SURNAMES)} 집안`, sex: me(g).sex === 'm' ? 'f' : 'm' }); }
  if (o.breakers && (s.anger[pl] ?? 0) >= 45 && (!done.breakers || mi(g) - done.breakers >= 36) && rng.chance(0.15)) return q('na_breakers', { pl, mill: rng.pick(['마석 화로 대장간', '쇠수레 공장']) });
  if (o.press && !s.me.column && (!done.column || mi(g) - done.column >= 48) && ((g.player.skills.letters ?? 0) >= 25 || (L(g).renown ?? 0) >= 35)) {
    const p = activePapers(s).find((x) => x.place === pl);
    if (p && rng.chance(0.12)) return q('na_column', { pid: p.id, name: p.name, lean: p.lean });
  }
  if (o.society && !s.me.society && (!done.society || mi(g) - done.society >= 48) && ((g.player.skills.letters ?? 0) >= 20 || g.player.stats.int >= 35)) {
    const x = activeSoc(s).find((y) => y.place === pl);
    if (x && rng.chance(0.1)) return q('na_society', { sid: x.id, name: x.name, idea: x.idea });
  }
  if (o.hands && VILLAGES.includes(pl) && (s.holdout[pl] ?? 0) >= 20 && nextTool(g, pl) && (!done.village || mi(g) - done.village >= 48) && rng.chance(0.08)) return q('na_village', { pl, tool: nextTool(g, pl) });
  if (o.hands && VILLAGES.includes(pl) && (s.hands[pl] ?? 0) >= 20 && age >= 18 && (!done.hands || mi(g) - done.hands >= 60) && rng.chance(0.07)) {
    const boss = (g.player.skills.farming ?? 0) >= 25 && g.player.money >= 80 || !!g.farm?.fields;
    return q('na_hands', { pl, tool: toolOf(g, pl) === T.VTOOL.plow ? 'plow' : 'erngrind', boss });
  }
  if (o.books && ((g.player.skills.letters ?? 0) >= 12 || s.lit >= 15) && (!done.book || mi(g) - done.book >= 84) && rng.chance(0.03 + s.lit / 1500)) return q('na_book', { book: rng.pick(BOOK) });
  if (o.guild && age >= 16) {
    const x = activeShops(s).find((y) => y.place === pl);
    if (x && (!done.guild || mi(g) - done.guild >= 48) && rng.chance(0.1)) return q('na_guild', { sid: x.id, inv: x.inv, pl, ...T.SHOP[x.inv] });
  }
  return false;
}

function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over) return;
  const o = openOf(g);
  if (!anyOpen(o)) return;
  const rng = ownRng(g, 13);
  if (o.rich) richTick(g, rng);
  if (o.breakers) { breakerTick(g, rng); breakerMutter(g, rng); }
  if (o.press) pressTick(g, rng);
  if (o.society) societyTick(g, rng);
  if (o.hands) handsTick(g, rng);
  if (o.books) booksTick(g, rng);
  if (o.guild) guildTick(g, rng);
  playerTick(g, ownRng(g, 29), o);
  if (!s.month.length && o.press && CITIES.includes(here(g)) && mi(g) - s.lineAt >= 10 && rng.chance(0.1)) { s.lineAt = mi(g); line(g, 'street', pickFresh(g, rng, 'st', T.STREET_LINE)({ place: placeName(here(g)) })); }
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.newage = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g) => { const s = S(g); s.me.column = null; s.me.society = null; s.me.done = {}; });

/* ---------- 화면 연결점 ---------- */
export function newageLines(g) { return (g.newage?.month ?? []).slice(0, 2).map((x) => ({ ...x })); }
export function newageLine(g) { return newageLines(g)[0]?.text ?? null; }
const angerWord = (v) => (v >= 60 ? '망치를 들 날만 기다린다' : v >= 40 ? '술집마다 기계 욕이다' : v >= 20 ? '투덜거림이 들린다' : '조용하다');
const opinionWord = (v) => (v >= 70 ? '다들 바꾸자고 한다' : v >= 55 ? '고치자는 말이 힘을 얻는다' : v >= 40 ? '반반이다' : v >= 25 ? '옛 질서 편이 많다' : '바꾸자는 말은 입 밖에 못 낸다');
const handsWord = (v) => (v >= 50 ? '일거리 없는 사람이 넘친다' : v >= 25 ? '품삯이 내렸다' : v > 5 ? '일손이 조금 남는다' : '일손이 모자라지 않다');
const litWord = (v) => (v >= 40 ? '도시 사람 절반이 글을 읽는다' : v >= 20 ? '글 읽는 사람이 흔해졌다' : v >= 8 ? '글 읽는 사람이 조금씩 는다' : '글은 아직 사제와 서기의 것이다');
const holdWord = (v) => (v >= 70 ? '옛 방식을 굳게 지킨다' : v >= 40 ? '버티고 있다' : v > 0 ? '흔들린다' : '새 방식을 받아들였다');
export function newageInfo(g) {
  const s = S(g); const o = openOf(g);
  return {
    open: { ...o },
    rich: activeRich(s).slice(-5).map((x) => ({ name: x.name, trade: T.RICH_TRADES[x.trade], place: placeName(x.place), y: x.y })),
    old: s.old.slice(-5).map((x) => ({ name: x.name, place: placeName(x.place), y: x.y, fate: { sold: '저택을 팔았다', married: '돈과 혼인했다', ruined: '땅과 작위를 잃었다' }[x.fate], to: x.to })),
    anger: o.breakers ? CITIES.filter((c) => (s.anger[c] ?? 0) >= 20).map((c) => ({ place: placeName(c), v: Math.round(s.anger[c]), word: angerWord(s.anger[c]) })) : [],
    breaks: s.breaks.slice(-4).map((x) => ({ y: x.y, place: placeName(x.place) })),
    papers: activePapers(s).map((p) => ({ name: p.name, place: placeName(p.place), lean: T.LEAN[p.lean].name, y: p.y })),
    opinion: o.press ? { v: Math.round(s.opinion), word: opinionWord(s.opinion) } : null,
    societies: activeSoc(s).filter((x) => x.heat >= 30 || s.me.society === x.id).map((x) => ({ name: x.name, idea: T.IDEAS[x.idea].name, place: placeName(x.place), mine: s.me.society === x.id })),
    villages: o.hands ? VILLAGES.filter((v) => s.holdout[v] != null).map((v) => ({ place: placeName(v), v: Math.round(s.holdout[v]), word: holdWord(s.holdout[v]), hands: Math.round(s.hands[v] ?? 0), handsWord: handsWord(s.hands[v] ?? 0), tools: (s.tools[v] ?? []).map((t) => T.VTOOL[t]) })) : [],
    left: s.left,
    letters: o.books ? { v: Math.round(s.lit), word: litWord(s.lit) } : null,
    shops: s.shops.slice(-5).map((x) => ({ shop: T.SHOP[x.inv].shop, guild: T.SHOP[x.inv].guild, place: placeName(x.place), y: x.y, end: x.end ? { closed: '조합이 이겼다', won: '공방이 버텨 냈다', joined: '조합에 들었다' }[x.end] : '다투는 중' })),
    column: s.me.column ? { paper: s.papers.find((p) => p.id === s.me.column.paper)?.name ?? null, lean: T.LEAN[s.me.column.lean].name, n: s.me.column.n } : null,
    log: s.log.slice(-6).map((x) => ({ ...x })),
  };
}
