// 44단계: 나라마다 다른 왕가와 궁정. 레오니아 궁정(8단계 court) 말고 일곱 나라
// (발하르트 황가·성광국 추기경단·세레니아 탑의 주인들·자유도시 평의회·엘프 장로회·드워프 씨족 회의·수인 부족장 회의).
//   - 나라마다 다스리는 틀과 궁정이 갈리는 두 갈래(lean), 다음 자리를 노리는 후보 셋(cands).
//   - 플레이어 없이도: 후보의 힘이 오르내리고 궁정 소식이 나며, 통치자가 죽으면(politics) 가장 힘 있는 후보가 잇는다
//     (politics/world.js SUCCESSION.pick). 나라가 흔들리고 힘센 후보가 있으면 정변이 일어난다.
//   - 플레이어: 그 나라 궁정에 나가 이름을 알리고 벼슬 세 칸을 오른다. 녹봉, 궁정 일(나라마다 다른 고민),
//     후보 편들기, 정변에 끼기. 편든 후보가 지면 쫓겨날 수 있다(궁정 출입 금지, 심하면 나라 밖으로).
// 상태는 g.crowns 하나. 화면 연결점은 crownsLines(g) / crownsLine(g) / crownsInfo(g) / crownInfo(g, realm).
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat, gainSkill, circleOf } from '../game.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, up, gains, spend, check } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { WORLD_TICKS } from '../world.js';
import { REALMS } from '../realms/data.js';
import { realmState, realmOf } from '../realms/index.js';
import { raceOf, raceName } from '../races/index.js';
import { isJailed } from '../crime.js';
import { PS, rulerOf, rulerLine, nameFor, pnews, syncRulerText } from '../politics/state.js';
import { NATURE } from '../politics/data.js';
import { succeed, SUCCESSION } from '../politics/world.js';
import { CROWNS, CROWN_IDS, INTRIGUE, COUP, CROWNED } from './data.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 557) ^ Math.imul(mi(g) * 227 + salt + 71, 2654435761)) | 0 });
const realmName = (id) => REALMS[id]?.short ?? id;
const seatOf = (id) => REALMS[id]?.capital ?? null;
const here = (g) => L(g).place ?? 'ern';
const live = () => CROWN_IDS.filter((id) => REALMS[id]);

/* ---------- 상태 ---------- */
function freshMe() {
  return { realm: null, office: 0, favor: 0, since: null, away: 0, backed: {}, stand: {}, banished: {}, served: {}, sceneAt: -99, dutyAt: {}, sideAt: {}, coupAsked: {}, pending: [], log: [] };
}
export function crownsState(g) {
  g.crowns ??= {};
  const s = g.crowns;
  s.realms ??= {};
  s.news ??= [];
  s.nextId ??= 1;
  s.me ??= freshMe();
  const f = freshMe();
  for (const k of Object.keys(f)) s.me[k] ??= f[k];
  s.month ??= [];
  s.lineAt ??= -99;
  s.tally ??= { crowned: 0, picked: 0, coups: 0 }; // 세상 흐름 셈 (점검용)
  for (const id of live()) {
    s.realms[id] ??= { cands: [], lean: 50, newsAt: -99, coupAt: -99, coupBy: null, pending: null, lastRuler: null };
  }
  return s;
}
const S = crownsState;
const RZ = (g, id) => S(g).realms[id];
function log(g, text) { const m = S(g).me; m.log.push({ y: g.date.year, m: g.date.month, text }); if (m.log.length > 20) m.log.shift(); }
function cnews(g, realm, text) {
  const s = S(g);
  s.news.push({ y: g.date.year, m: g.date.month, realm, text, at: mi(g) });
  if (s.news.length > 30) s.news.shift();
}

/* ---------- 후보 ---------- */
const HEIR_ROLE = (id) => (CROWNS[id].heir ? CROWNS[id].roles[0] : null);
function makeCand(g, rng, id, role) {
  const c = CROWNS[id];
  const s = S(g);
  const sex = id === 'holy' ? 'm' : rng.chance(id === 'elf' ? 0.6 : 0.3) ? 'f' : 'm';
  const ruler = rulerOf(g, id);
  const taken = new Set([ruler?.name, ...(s.realms[id]?.cands ?? []).map((x) => x.name.split(' ')[0])]);
  let n = nameFor(rng, id, sex);
  for (let k = 0; k < 10 && (taken.has(n.name) || String(ruler?.name ?? '').startsWith(n.name)); k++) n = nameFor(rng, id, sex);
  const heir = role === HEIR_ROLE(id);
  const kind = NATURE[id]?.kind;
  const house = heir ? ruler?.house ?? null : kind === 'dynasty' ? n.last || null : null;
  const full = kind === 'dynasty' || kind === 'ageless' ? n.name : `${n.name}${n.last ? ` ${n.last}` : ''}`;
  const [a0, a1] = c.age;
  const age = heir ? Math.max(a0, Math.min(a1, (g.date.year - (ruler?.born ?? g.date.year - 50)) - rng.int(18, 30))) : rng.int(a0, a1);
  return { id: s.nextId++, name: full, role, side: rng.int(0, 1), sup: heir ? rng.int(45, 65) : rng.int(15, 50), born: g.date.year - age, sex, house };
}
function refill(g, rng, id) {
  const R = RZ(g, id);
  const c = CROWNS[id];
  const heirRole = HEIR_ROLE(id);
  // 정해진 후계자가 있는 나라는 그 자리를 먼저 채운다 (통치자에게 후계가 있을 때만)
  if (heirRole && rulerOf(g, id)?.heir && !R.cands.some((x) => x.role === heirRole)) R.cands.unshift(makeCand(g, rng, id, heirRole));
  let k = 0;
  while (R.cands.length < 3 && k++ < 8) {
    const roles = c.roles.filter((r) => r !== heirRole || !R.cands.some((x) => x.role === r));
    R.cands.push(makeCand(g, rng, id, rng.pick(roles.length ? roles : c.roles)));
  }
}
const candAge = (g, x) => g.date.year - x.born;
const top = (R) => [...R.cands].sort((a, b) => b.sup - a.sup)[0] ?? null;

/* ---------- politics가 새 통치자를 고를 때 ---------- */
SUCCESSION.pick = (g, rng, id, kind, old) => {
  if (!CROWNS[id] || !g?.crowns) return null;
  const R = RZ(g, id);
  if (!R?.cands.length) return null;
  let w = R.coupBy ? R.cands.find((x) => x.id === R.coupBy) : null;
  if (!w && HEIR_ROLE(id) && old?.heir) w = R.cands.find((x) => x.role === HEIR_ROLE(id));
  // 대가 끊긴 왕가(heir 없음)는 옛 가문 사람이 잇지 못한다
  if (!w && kind === 'dynasty' && !old?.heir) w = [...R.cands].filter((x) => x.role !== HEIR_ROLE(id) && (!x.house || x.house !== old?.house)).sort((a, b) => b.sup - a.sup)[0] ?? null;
  w ??= top(R);
  if (!w) return null;
  R.pending = w.id;
  // 후계자 자리는 옛 가문이 그대로 잇는다(politics가 house를 둔다). 새 가문 이름은 다른 후보에게서만
  const last = w.role === HEIR_ROLE(id) || w.house === old?.house ? '' : w.house ?? '';
  return { name: w.name, last, sex: w.sex };
};

// 통치자가 바뀐 뒤: 이긴 후보를 궁정에서 빼고, 진 쪽을 적고, 플레이어가 편든 쪽을 따진다
function crowned(g, rng, id, say) {
  const R = RZ(g, id);
  const P = PS(g);
  const r = rulerOf(g, id);
  const w = R.cands.find((x) => x.id === R.pending);
  const lostC = R.cands.filter((x) => x !== w).sort((a, b) => b.sup - a.sup)[0] ?? null;
  S(g).tally.crowned += 1;
  if (w && r) {
    S(g).tally.picked += 1;
    r.born = w.born; r.sex = w.sex;
    R.lean = clamp(R.lean + (w.side === 0 ? 12 : -12), 5, 95);
    const text = CROWNED[id]({ won: w.name, lost: lostC?.name ?? null, title: r.name }).trim();
    cnews(g, id, text);
    if (id !== 'holy') syncRulerText(g);
  }
  // 플레이어가 편든 후보
  const m = S(g).me;
  const backed = m.backed[id];
  if (backed != null) {
    if (w && backed === w.id) m.pending.push({ kind: 'rise', realm: id, who: w.name });
    else if (R.cands.some((x) => x.id === backed)) m.pending.push({ kind: 'fall', realm: id, who: w?.name ?? rulerLine(g, id) });
    delete m.backed[id];
  }
  R.cands = R.cands.filter((x) => x !== w);
  for (const x of R.cands) x.sup = clamp(Math.round(x.sup * 0.6), 5, 95); // 새 통치자 아래 다들 숨을 고른다
  R.pending = null; R.coupBy = null; R.lastRuler = rulerLine(g, id);
  refill(g, rng, id);
  void P; void say;
}

/* ---------- 세상 흐름 (플레이어 없이도) ---------- */
const COUP_WHY = { valhart: '정변으로 옥좌에서 물러났다', holy: '추기경단에 밀려 물러났다', serenia: '원탁에서 밀려났다', free: '불신임 표에 물러났다', elf: '장로회의 노래에 물러났다', dwarf: '씨족 회의의 망치를 잃었다', beast: '도전에 져서 물러났다' };
function worldTick(g, _rng, say, record) {
  const rng = ownRng(g, 13); // 세상 주사위를 건드리지 않는다
  if (!g.politics) return;
  const s = S(g);
  const P = PS(g);
  for (const id of live()) {
    const R = RZ(g, id);
    const c = CROWNS[id];
    const r = rulerOf(g, id);
    if (!r) continue;
    // 통치자가 바뀌었는가 (politics의 죽음·대 끊김·정변)
    const line = rulerLine(g, id);
    if (R.lastRuler == null) R.lastRuler = line;
    else if (R.lastRuler !== line) crowned(g, rng, id, say);
    refill(g, rng, id);
    // 후보가 늙고 죽고, 힘이 오르내린다
    const [, a1] = c.age;
    R.cands = R.cands.filter((x) => {
      const old = candAge(g, x) > a1 + (id === 'elf' ? 100 : id === 'dwarf' ? 30 : 6);
      if (rng.chance(old ? 0.05 : 0.0012)) { cnews(g, id, `${realmName(id)} 궁정의 ${x.role} ${J(x.name, '이/가')} 세상을 떠났다. 그 사람을 따르던 이들이 다른 문을 두드리기 시작했다.`); return false; }
      return true;
    });
    for (const x of R.cands) {
      const pull = (x.side === 0 ? R.lean - 50 : 50 - R.lean) / 100;
      x.sup = clamp(x.sup + rng.normal(0, 1.2) + pull * 0.6, 5, 95);
    }
    R.lean = clamp(R.lean + rng.normal(0, 0.8) + (50 - R.lean) * 0.01, 5, 95);
    refill(g, rng, id);
    // 궁정 소식
    if (mi(g) - R.newsAt >= 6 && R.cands.length >= 2 && rng.chance(0.045)) {
      const ev = rng.pick(INTRIGUE);
      const a = rng.pick(R.cands);
      const bb = rng.pick(R.cands.filter((x) => x !== a));
      const ctx = { realm: realmName(id), body: c.body, a: a.name, b: bb.name, side: c.sides[a.side], ruler: line };
      const text = ev.text(ctx);
      if (ev.fx.a) a.sup = clamp(a.sup + ev.fx.a, 5, 95);
      if (ev.fx.b) bb.sup = clamp(bb.sup + ev.fx.b, 5, 95);
      if (ev.fx.side) R.lean = clamp(R.lean + (a.side === 0 ? ev.fx.side : -ev.fx.side), 5, 95);
      if (ev.fx.stab) P.stab[id] = clamp((P.stab[id] ?? 60) + ev.fx.stab, 0, 100);
      R.newsAt = mi(g);
      cnews(g, id, text);
    }
    // 정변: 나라가 흔들리고 힘센 후보가 있으면
    const t = top(R);
    const stab = P.stab[id] ?? 60;
    if (t && !r.legend && t.sup >= 72 && stab < 40 && mi(g) - R.coupAt >= 120 && rng.chance(id === 'elf' ? 0.003 : 0.015)) {
      R.coupAt = mi(g); R.coupBy = t.id; s.tally.coups += 1;
      const old = line;
      succeed(g, rng, say, record, id, COUP_WHY[id]);
      const text = COUP[id]({ who: t.name, ruler: old });
      cnews(g, id, text);
      pnews(g, text);
      if (RZ(g, id).lastRuler !== rulerLine(g, id)) crowned(g, rng, id, say);
    }
  }
  void s;
}
WORLD_TICKS.push(worldTick);

/* ---------- 벼슬 ---------- */
const officeOf = (id, lv) => CROWNS[id]?.offices[lv - 1] ?? null;
const banishedLeft = (g, id) => Math.max(0, (S(g).me.banished[id] ?? 0) - mi(g));
function skillLv(g, o) {
  if (o.stat) return g.player.stats[o.stat] ?? 0;
  const c = g.player.skills;
  return Math.max(c[o.skill] ?? 0, 0);
}
// 벼슬에 모자란 것 (글) | null
export function officeNeed(g, id, lv) {
  const c = CROWNS[id]; const o = officeOf(id, lv);
  if (!c || !o) return '더 오를 자리가 없다';
  const race = raceOf(me(g));
  const races = lv >= 3 && c.topRaces ? c.topRaces : c.races;
  if (!races.includes(race)) return `${raceName(race)}에게는 주지 않는 자리다`;
  if (banishedLeft(g, id)) return `궁정 출입이 막혔다 (${Math.ceil(banishedLeft(g, id) / 12)}해)`;
  const alt = c.alt ? (g.player.skills[c.alt] ?? 0) : 0;
  if (skillLv(g, o) < o.lv && alt < o.lv) return o.stat ? '몸과 마음이 아직 모자라다' : `${{ letters: '글과 학문', magic: '마법', trade: '장사', smithing: '대장일' }[o.skill] ?? '솜씨'} ${o.lv} 넘게`;
  if (o.circle && circleOf(g) < o.circle) return `${o.circle}서클 넘게`;
  if (o.faith && g.flags?.faith !== 'devout' && (realmState(g).piety ?? 0) < 12) return '깊은 믿음';
  if (o.renown && (L(g).renown ?? 0) < o.renown) return `이름값 ${o.renown} 넘게`;
  if (o.money && (g.player.money + (g.player.familyMoney ?? 0)) < o.money) return `은화 ${o.money}닢 넘는 재산`;
  if (o.age && playerAge(g) < o.age) return `${o.age}살 넘게`;
  if (o.citizen && realmState(g).citizen !== id) return `${realmName(id)} 사람이어야 한다`;
  return null;
}
const seatRealm = (place) => live().find((id) => seatOf(id) === place) ?? null;
function takeOffice(g, id, lv) {
  const m = S(g).me;
  if (m.realm && m.realm !== id) log(g, `${realmName(m.realm)}의 ${officeOf(m.realm, m.office)?.name}에서 물러났다`);
  const same = m.realm === id;
  m.realm = id; m.office = lv; m.since = mi(g); m.away = 0; m.favor = same ? Math.max(m.favor - 10, 20) : 20;
  m.served[id] = Math.max(m.served[id] ?? 0, lv);
  const name = officeOf(id, lv).name;
  log(g, `${realmName(id)}의 ${J(name, '이/가')} 되었다`);
  note(g, `${realmName(id)}의 ${J(name, '이/가')} 되었다.`);
  chron(g, `${g.player.name}, ${realmName(id)}의 ${J(name, '이/가')} 되다.`, lv >= 3 ? 12 : lv >= 2 ? 6 : 3);
}
function loseOffice(g, why) {
  const m = S(g).me;
  if (!m.realm) return;
  log(g, `${realmName(m.realm)}의 ${officeOf(m.realm, m.office)?.name}에서 물러났다 (${why})`);
  note(g, `${realmName(m.realm)}의 벼슬에서 물러났다. ${why}.`);
  m.realm = null; m.office = 0; m.favor = 0; m.away = 0;
}
function banishFrom(g, id, months, realmToo) {
  const m = S(g).me;
  m.banished[id] = mi(g) + months;
  if (m.realm === id) loseOffice(g, '궁정에서 쫓겨났다');
  if (!realmToo) return;
  const R = realmState(g);
  R.banned[id] = Math.max(R.banned[id] ?? 0, mi(g) + months);
  moveOut(g, id);
}
// 나라 밖 가장 가까운 고장으로
function moveOut(g, id) {
  const R = realmState(g);
  if (traveling(g) || realmOf(here(g)) !== id) return;
  const seen = new Set([here(g)]); let q = [here(g)];
  for (let d = 0; d < 8 && q.length; d++) {
    const nx = [];
    for (const p of q) for (const n of Object.keys(PLACES[p]?.links ?? {})) {
      if (seen.has(n) || !PLACES[n] || PLACES[n].hidden) continue;
      seen.add(n);
      if (realmOf(n) !== id && REALMS[realmOf(n)]) { L(g).place = n; L(g).home = 'inn'; R.cur = realmOf(n); R.last = n; return; }
      nx.push(n);
    }
    q = nx;
  }
}

/* ---------- 행동: 그 나라 궁정에 나가기 ---------- */
const ATTEND = ['문지기가 이름을 두 번 물었다. 두 번째에는 조금 공손했다.', '복도 끝에서 높은 사람들이 지나갔다. 누가 누구 뒤에 걷는지를 눈여겨보았다.', '궁정 서기 하나와 점심을 먹었다. 그는 아무 말도 안 하는 척하며 많은 것을 말해 주었다.', '대기실에서 하루를 기다렸다. 기다리는 것도 궁정에서는 일이다.', '연회 끝자리에 앉았다. 내 이름을 부르는 사람이 하나 늘었다.'];
ACTIONS.push({
  id: 'crowns_court', name: '그 나라 궁정에 나가기', icon: 'crown',
  place: CROWN_IDS.map(seatOf).filter(Boolean),
  desc: '이 나라 궁정에 얼굴을 알리고 벼슬을 노린다. 벼슬이 있으면 그 나라의 일을 본다. 나라마다 다스리는 틀이 다르다.',
  available: (g) => {
    if (!isAdult(g) || traveling(g) || isJailed(g)) return false;
    const id = seatRealm(here(g));
    if (!id || banishedLeft(g, id)) return false;
    const m = S(g).me;
    if (m.realm === id) return true;
    return CROWNS[id].races.includes(raceOf(me(g)));
  },
  run(g, rng) {
    const id = seatRealm(here(g));
    if (!id) return '궁정 문이 닫혀 있었다.';
    const c = CROWNS[id];
    const m = S(g).me;
    tired(g, 8);
    if (m.realm === id) {
      const gain = rng.float(1, 3) + g.player.stats.cha / 50;
      m.favor = clamp(m.favor + gain, 0, 100);
      const sk = officeOf(id, m.office).skill ? gainSkill(g, officeOf(id, m.office).skill, 0.4) : gainStat(g, officeOf(id, m.office).stat ?? 'wil', 0.3);
      const next = m.office + 1;
      if (next <= 3 && m.favor >= 30 + m.office * 15 && !officeNeed(g, id, next) && !sceneQueued(g, 'cr_offer') && rng.chance(0.4)) queueScene(g, 'cr_offer', { realm: id, level: next });
      else if (mi(g) - (m.dutyAt[id] ?? -99) >= 18 && !sceneQueued(g, 'cr_duty') && rng.chance(0.35)) { m.dutyAt[id] = mi(g); queueScene(g, 'cr_duty', { realm: id }); }
      else if (m.backed[id] == null && mi(g) - (m.sideAt[id] ?? -99) >= 24 && RZ(g, id).cands.length >= 2 && !sceneQueued(g, 'cr_side') && rng.chance(0.3)) {
        m.sideAt[id] = mi(g);
        const [a, b] = [...RZ(g, id).cands].sort((x, y) => y.sup - x.sup);
        queueScene(g, 'cr_side', { realm: id, a: a.id, b: b.id });
      }
      return `${J(officeOf(id, m.office).name, '으로/로')}서 ${c.seatWord}의 일을 보았다. ${rng.pick(c.lines)()}${gains([up('윗사람의 눈', gain), up(officeOf(id, m.office).skill ? '솜씨' : '능력', sk)])}`;
    }
    let gain = rng.float(1.5, 3) + g.player.stats.cha / 40;
    let extra = '';
    if (g.envoy?.post?.role === 'envoy' || g.envoy?.post?.role === 'head') { gain += 1; extra = ' 사절이라는 이름이 문을 하나 더 열어 주었다.'; }
    if (!spend(g, 2)) { gain -= 1; extra += ' 차림이 초라해 문지기가 오래 붙잡았다.'; }
    m.stand[id] = (m.stand[id] ?? 0) + Math.max(0.5, gain);
    const need = officeNeed(g, id, 1);
    if (m.stand[id] >= 8 && !need && !sceneQueued(g, 'cr_offer') && rng.chance(0.4)) queueScene(g, 'cr_offer', { realm: id, level: 1 });
    const hint = need && m.stand[id] >= 8 && rng.chance(0.4) ? ` 궁정 서기가 넌지시 일러 주었다. 여기서 자리를 얻기에 아직 모자란 것: ${need}.` : '';
    return `${c.seatWord}에 나갔다. ${rng.pick(ATTEND)}${extra}${hint}${gains([up('궁정 이름값', gain)])}`;
  },
});

/* ---------- 장면 ---------- */
const candBy = (g, realm, cid) => RZ(g, realm)?.cands.find((x) => x.id === cid) ?? null;
defineScene('cr_offer', {
  title: (g, s) => `${realmName(s.realm)}의 벼슬`,
  text: (g, s) => {
    const o = officeOf(s.realm, s.level);
    const r = rulerLine(g, s.realm);
    return s.level === 1
      ? `${CROWNS[s.realm].seatWord}에서 사람이 왔다. ${realmName(s.realm)}의 ${J(o.name, '을/를')} 맡아 달라고 한다. 녹봉은 달마다 은화 ${o.pay}닢. ${CROWNS[s.realm].how}`
      : `${J(r, '이/가')} 나를 불렀다. ${realmName(s.realm)}의 ${J(o.name, '을/를')} 맡으라는 뜻이다. 녹봉은 달마다 은화 ${o.pay}닢. 자리가 높을수록 지켜보는 눈도 많다.`;
  },
  choices: (g, s) => [{ label: `${officeOf(s.realm, s.level).name} 자리를 받는다`, key: 'yes' }, { label: '아직은 사양한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const m = S(g).me;
    if (key === 'no') { m.stand[s.realm] = Math.max(0, (m.stand[s.realm] ?? 0) - 4); return '정중히 사양했다. 상대가 고개를 끄덕였다. 궁정에서 사양은 "다음에 더 크게"라는 뜻으로도 읽힌다. 다만 다음이 늘 오는 건 아니다.'; }
    const prev = m.realm && m.realm !== s.realm ? `${realmName(m.realm)}의 벼슬은 내려놓았다. ` : '';
    takeOffice(g, s.realm, s.level);
    return `${prev}${s.level === 1 ? '이름이 궁정 장부에 올랐다. 첫날 받은 것은 낡은 책상 하나와 산더미 같은 서류였다.' : s.level === 2 ? '자리가 바뀌자 인사하는 사람이 바뀌었다. 어제까지 나를 지나치던 이들이 먼저 고개를 숙였다.' : '가장 높은 자리 가까이 왔다. 이제 누구 편인지 묻는 사람이 없다. 다들 이미 안다고 생각한다.'}`;
  },
});
defineScene('cr_duty', {
  title: (g, s) => CROWNS[s.realm].duty.title,
  text: (g, s) => CROWNS[s.realm].duty.text(),
  choices: (g, s) => CROWNS[s.realm].duty.choices.map((c, i) => ({ label: c.label, key: `c${i}` })),
  resolve(g, rng, s, key) {
    const d = CROWNS[s.realm].duty;
    const c = d.choices[+String(key).slice(1)] ?? d.choices[0];
    const m = S(g).me; const fx = c.fx ?? {};
    if (fx.favor) m.favor = clamp(m.favor + fx.favor, 0, 100);
    if (fx.side != null) RZ(g, s.realm).lean = clamp(RZ(g, s.realm).lean + (fx.side === 0 ? 4 : -4), 5, 95);
    if (fx.money) g.player.money = Math.max(0, g.player.money + fx.money);
    if (fx.stress) stress(g, fx.stress);
    if (fx.renown) L(g).renown = (L(g).renown ?? 0) + fx.renown;
    for (const [k, v] of Object.entries(fx.stat ?? {})) gainStat(g, k, v);
    for (const [k, v] of Object.entries(fx.skill ?? {})) gainSkill(g, k, v);
    if (fx.injury) g.player.injuries.push({ name: fx.injury, months: 2 });
    if (fx.flag) (g.flags ??= {})[fx.flag] = true;
    log(g, `${d.title}: ${c.label}`);
    return c.out();
  },
});
defineScene('cr_side', {
  title: (g, s) => `${realmName(s.realm)}의 다음 자리`,
  text: (g, s) => {
    const a = candBy(g, s.realm, s.a), b = candBy(g, s.realm, s.b); const c = CROWNS[s.realm];
    const who = (x, d) => (x ? `${x.role} ${x.name}` : d);
    const sd = (x, d) => `${c.sides[x?.side ?? d]}(${c.sideText[x?.side ?? d]})`;
    const split = a && b && a.side === b.side
      ? `${J(c.seatWord, '이/가')} 둘로 갈린다. ${J(who(a, '한쪽'), '과/와')} ${who(b, '다른 쪽')}, 둘 다 ${sd(a, 0)} 쪽이지만 서로를 믿지 않는다.`
      : `${J(c.seatWord, '이/가')} 둘로 갈린다. ${J(who(a, '한쪽'), '은/는')} ${sd(a, 0)}, ${J(who(b, '다른 쪽'), '은/는')} ${sd(b, 1)} 쪽이다.`;
    return `${split} 두 사람 다 나에게 사람을 보냈다. 지금의 ${J(rulerLine(g, s.realm), '이/가')} 영원하지 않다는 건 다들 안다.`;
  },
  choices: (g, s) => [
    { label: `${candBy(g, s.realm, s.a)?.name ?? '앞선 쪽'} 편에 선다`, key: 'a' },
    { label: `${candBy(g, s.realm, s.b)?.name ?? '뒤진 쪽'} 편에 선다`, key: 'b' },
    { label: '어느 편도 들지 않는다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const m = S(g).me;
    if (key === 'none') { m.favor = clamp(m.favor - 2, 0, 100); return '양쪽 사람에게 같은 포도주를 대접하고 같은 말을 했다. "지금의 주인을 섬길 뿐이오." 둘 다 웃었다. 둘 다 믿지 않았다.'; }
    const x = candBy(g, s.realm, key === 'a' ? s.a : s.b);
    if (!x) return '그 사람은 이미 궁정에 없었다.';
    m.backed[s.realm] = x.id; x.sup = clamp(x.sup + 4 + (m.office ?? 0) * 2, 5, 95);
    log(g, `${realmName(s.realm)}에서 ${x.name} 편에 섰다`);
    return `${x.name}의 사람과 잔을 부딪쳤다. 그날부터 내 책상 위 서류가 조금 달라졌다. 어떤 문은 열리고 어떤 문은 닫혔다. ${J(x.name, '이/가')} 이기면 나도 이긴다. 지면, 그때 생각하기로 했다.`;
  },
});
defineScene('cr_rise', {
  title: (g, s) => `${realmName(s.realm)}의 새 주인`,
  text: (g, s) => `내가 편든 ${J(s.who, '이/가')} ${realmName(s.realm)}의 가장 높은 자리에 올랐다. 축하연에서 ${J(s.who, '이/가')} 사람들 사이로 나를 찾아 잔을 들어 보였다.`,
  choices: () => [{ label: '잔을 들어 답한다', key: 'cheer' }, { label: '조용히 고개만 숙인다', key: 'bow' }],
  resolve(g, rng, s, key) {
    const m = S(g).me;
    m.favor = clamp(m.favor + (key === 'cheer' ? 22 : 16), 0, 100);
    L(g).renown = (L(g).renown ?? 0) + 2;
    log(g, `편든 ${J(s.who, '이/가')} 이겼다`);
    if (m.realm === s.realm && m.office < 3 && !officeNeed(g, s.realm, m.office + 1)) queueScene(g, 'cr_offer', { realm: s.realm, level: m.office + 1 });
    return key === 'cheer' ? '잔이 부딪쳤다. 그 소리를 궁정 사람 모두가 들었다. 내일부터 내 이름 앞에 붙는 말이 달라질 것이다.' : '고개를 숙였다. 새 주인이 웃었다. 큰 소리를 내지 않는 사람을 오래 곁에 두는 법이다.';
  },
});
defineScene('cr_fall', {
  title: (g, s) => `${realmName(s.realm)}에서 진 쪽`,
  text: (g, s) => `내가 편든 사람은 졌다. ${J(s.who, '이/가')} 자리에 올랐다. 새 주인의 사람들이 궁정 장부를 넘기며 이름 몇 개에 줄을 긋는다. 그 장부에 내 이름도 있다.`,
  choices: () => [
    { label: '새 주인 앞에 나가 무릎을 꿇는다', key: 'kneel' },
    { label: '벼슬을 내려놓고 조용히 물러난다', key: 'quit' },
    { label: '짐을 싸 이 나라를 떠난다', key: 'flee' },
  ],
  resolve(g, rng, s, key) {
    const m = S(g).me;
    if (key === 'kneel') {
      if (check(rng, g.player.stats.cha + g.player.stats.wil / 2 + m.favor / 3, 55)) {
        if (m.realm === s.realm && m.office > 1) { m.office -= 1; m.favor = 15; log(g, `${s.who}에게 무릎 꿇어 한 칸 내려앉았다`); return `무릎을 꿇었다. ${J(s.who, '이/가')} 오래 나를 내려다보다 손을 들었다. 일어나라는 뜻이었다. 자리는 한 칸 내려갔다. 목은 그대로다.`; }
        m.favor = 10; return `무릎을 꿇었다. ${J(s.who, '이/가')} "충성은 바꿀 수도 있는 거지" 하고 지나갔다. 용서인지 경고인지 모르지만 장부에서 줄은 그어지지 않았다.`;
      }
      banishFrom(g, s.realm, 48, true); stress(g, 15); chron(g, `${g.player.name}, ${realmName(s.realm)}에서 쫓겨나다.`, 6);
      return `무릎을 꿇었다. 새 주인은 나를 보지도 않았다. 다음 날 경비대가 와서 나라 밖까지 "배웅"했다. 네 해 동안 ${realmName(s.realm)} 땅을 밟지 말라는 문서 한 장을 쥐여 주었다.`;
    }
    if (key === 'quit') { banishFrom(g, s.realm, 36, false); stress(g, 6); return '벼슬 인장을 책상 위에 두고 나왔다. 궁정 문지기가 내 얼굴을 외워 두는 게 보였다. 몇 해는 저 문을 넘지 못할 것이다. 그래도 이 나라 거리는 걸을 수 있다.'; }
    if (m.realm === s.realm) loseOffice(g, '편든 쪽이 졌다');
    m.banished[s.realm] = mi(g) + 24;
    moveOut(g, s.realm);
    log(g, `${realmName(s.realm)}를 스스로 떠났다`);
    return `밤에 떠났다. ${PLACES[here(g)]?.name ?? '국경 너머'}에 닿아서야 뒤를 돌아보았다. 쫓겨난 게 아니라 떠난 것이다. 그 차이를 아는 사람은 나뿐일지 몰라도.`;
  },
});
defineScene('cr_coup', {
  title: (g, s) => `${realmName(s.realm)}의 밤`,
  text: (g, s) => `${J(s.who, '이/가')} 보낸 사람이 밤늦게 찾아왔다. 나라가 흔들리는 지금이 때라고 한다. ${J(rulerLine(g, s.realm), '을/를')} 끌어내리는 날 내 이름도 그 명단에 있기를 바란다고. 명단에 없는 이름이 어떻게 되는지는 말하지 않았다.`,
  choices: () => [
    { label: '명단에 이름을 올린다', key: 'join' },
    { label: '지금의 주인에게 알린다', key: 'warn' },
    { label: '듣지 못한 것으로 한다', key: 'out' },
  ],
  resolve(g, rng, s, key) {
    const m = S(g).me; const R = RZ(g, s.realm); const x = R.cands.find((c) => c.id === s.cid);
    m.coupAsked[s.realm] = mi(g);
    if (key === 'join') { if (x) { x.sup = clamp(x.sup + 10, 5, 95); m.backed[s.realm] = x.id; } stress(g, 10); log(g, `${s.who}의 정변 명단에 이름을 올렸다`); return '이름을 적었다. 잉크가 마르기도 전에 그 사람은 사라졌다. 이제 날을 기다리는 일만 남았다. 그 날이 오지 않으면, 이 종이는 내 목에 걸린다.'; }
    if (key === 'warn') {
      if (x) x.sup = clamp(x.sup - 30, 5, 95);
      m.favor = clamp(m.favor + 15, 0, 100); PS(g).stab[s.realm] = clamp((PS(g).stab[s.realm] ?? 60) + 6, 0, 100);
      if (m.backed[s.realm] === s.cid) delete m.backed[s.realm];
      log(g, `${s.who}의 정변을 알렸다`); chron(g, `${g.player.name}, ${realmName(s.realm)}의 정변을 미리 알리다.`, 5);
      return `아침 일찍 알현을 청했다. 그날 오후 ${s.who}의 사람들이 궁정에서 하나둘 사라졌다. 나를 보는 눈이 둘로 갈렸다. 고마워하는 눈과 기억하는 눈.`;
    }
    stress(g, 4); return '문을 닫고 촛불을 껐다. 아무것도 듣지 못한 사람은 아무 편도 아니다. 궁정에서 그런 사람은 오래 살거나, 아무도 모르게 사라진다.';
  },
});

/* ---------- 매달 (플레이어) ---------- */
function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over || !g.player) return;
  const m = s.me;
  const rng = ownRng(g, 5);
  const place = here(g);
  const realm = realmOf(place);
  // 녹봉과 자리 비움
  if (m.realm) {
    const o = officeOf(m.realm, m.office);
    if (realm === m.realm || traveling(g)) { m.away = 0; if (!isJailed(g)) g.player.money += o.pay; }
    else m.away += 1;
    m.favor = clamp(m.favor - 0.4, 0, 100);
    if (m.away > 8) loseOffice(g, '자리를 너무 오래 비웠다');
    else if (isJailed(g) && m.office) { loseOffice(g, '감옥에 갇혔다'); }
  }
  // 편든 쪽의 결말
  while (m.pending.length) {
    const p = m.pending.shift();
    if (p.kind === 'rise') queueScene(g, 'cr_rise', { realm: p.realm, who: p.who });
    else if (m.realm === p.realm || realm === p.realm) queueScene(g, 'cr_fall', { realm: p.realm, who: p.who });
    else log(g, `${realmName(p.realm)}에서 편든 쪽이 졌다`);
  }
  // 정변 제안: 벼슬이 있는 나라가 흔들리고 힘센 후보가 있으면
  if (m.realm && isAdult(g) && !traveling(g) && !sceneQueued(g, 'cr_coup') && mi(g) - (m.coupAsked[m.realm] ?? -999) >= 60) {
    const R = RZ(g, m.realm); const t = top(R);
    if (t && !rulerOf(g, m.realm)?.legend && t.sup >= 60 && (PS(g).stab[m.realm] ?? 60) < 35 && rng.chance(0.08)) queueScene(g, 'cr_coup', { realm: m.realm, who: t.name, cid: t.id });
  }
  // 그 나라에 있으면 궁정 소식이 들린다
  const heard = s.heard ?? mi(g) - 1; s.heard = mi(g);
  const fresh = s.news.filter((n) => n.at >= heard && (n.realm === realm || n.realm === m.realm));
  if (fresh.length && (realm in s.realms || m.realm)) { s.lineAt = mi(g); s.month.push({ kind: 'court', realm: fresh[0].realm, text: fresh[0].text }); return; }
  if (m.realm && realm === m.realm && mi(g) - s.lineAt >= 6 && rng.chance(0.15)) {
    s.lineAt = mi(g);
    const ls = CROWNS[m.realm].lines; s.li = ((s.li ?? rng.int(0, ls.length - 1)) + 1) % ls.length;
    s.month.push({ kind: 'office', realm: m.realm, text: ls[s.li]() });
  }
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => {
  g.crowns = null;
  const s = S(g);
  const rng = ownRng(g, 1);
  for (const id of live()) { refill(g, rng, id); RZ(g, id).lastRuler = rulerLine(g, id); }
  void s;
});
HOOKS.migrate.push((g) => {
  const s = S(g);
  if (!g.politics) return;
  const rng = ownRng(g, 1);
  for (const id of live()) { refill(g, rng, id); RZ(g, id).lastRuler ??= rulerLine(g, id); }
  void s;
});
// 대를 이으면 벼슬은 몸에 붙지 않는다. 쫓겨난 기록과 편든 기록도 새 사람에겐 없다.
HOOKS.heir.push((g) => {
  const s = S(g);
  const m = s.me;
  if (m.realm) log(g, `선대가 ${realmName(m.realm)}의 ${officeOf(m.realm, m.office)?.name}였다`);
  const past = { y: g.date.year, served: { ...m.served } };
  s.me = freshMe(); s.me.pastServed = past;
});

/* ---------- 화면 연결점 ---------- */
const stabWord = (v) => (v >= 70 ? '단단하다' : v >= 50 ? '버틴다' : v >= 30 ? '흔들린다' : '무너질 듯하다');
const supWord = (v) => (v >= 70 ? '다음 주인으로 꼽힌다' : v >= 50 ? '힘이 붙었다' : v >= 30 ? '따르는 이가 있다' : '아직 작다');
export function crownInfo(g, id) {
  const c = CROWNS[id];
  if (!c || !REALMS[id]) return null;
  const s = S(g); const R = RZ(g, id); const m = s.me;
  const stab = Math.round(PS(g).stab?.[id] ?? 60);
  return {
    id, name: REALMS[id].name, short: realmName(id), frame: c.frame, body: c.body, how: c.how, seat: PLACES[seatOf(id)]?.name ?? '',
    ruler: rulerLine(g, id), stab, stabWord: stabWord(stab),
    sides: c.sides.map((name, i) => ({ name, text: c.sideText[i], lean: Math.round(i === 0 ? R.lean : 100 - R.lean) })),
    cands: R.cands.map((x) => ({ name: x.name, role: x.role, side: c.sides[x.side], support: Math.round(x.sup), word: supWord(x.sup), age: candAge(g, x), backed: m.backed[id] === x.id })),
    news: s.news.filter((n) => n.realm === id).slice(-4).reverse().map((n) => ({ y: n.y, m: n.m, text: n.text })),
    offices: c.offices.map((o) => o.name),
    office: m.realm === id ? officeOf(id, m.office).name : null,
    favor: m.realm === id ? Math.round(m.favor) : null,
    banished: banishedLeft(g, id) ? Math.ceil(banishedLeft(g, id) / 12) : 0,
    need: g.player && m.realm !== id ? officeNeed(g, id, 1) : g.player && m.office < 3 ? officeNeed(g, id, m.office + 1) : null,
  };
}
export function crownsInfo(g) {
  const s = S(g); const m = s.me;
  return {
    realms: live().map((id) => crownInfo(g, id)),
    me: m.realm ? { realm: m.realm, realmName: realmName(m.realm), office: officeOf(m.realm, m.office).name, level: m.office, favor: Math.round(m.favor), pay: officeOf(m.realm, m.office).pay } : null,
    news: s.news.slice(-6).reverse().map((n) => ({ y: n.y, m: n.m, realm: realmName(n.realm), text: n.text })),
    log: m.log.slice(-6).map((x) => ({ ...x })),
  };
}
export function crownsLines(g) { return (g.crowns?.month ?? []).slice(0, 1).map((x) => ({ ...x })); }
export function crownsLine(g) { return crownsLines(g)[0]?.text ?? null; }
