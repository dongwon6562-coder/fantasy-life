// 학자들의 세상: 플레이어 없이도 책이 쓰이고, 베껴지고, 불타고, 금서가 되고, 틀린 곳이 짚인다. 대학자는 나고 죽는다.
// 주사위는 따로 굴린다(ownRng). 큰 세상 주사위를 건드리지 않는다. 한 해에 한 번(1월)만 크게 돈다.
import { WORLD_TICKS } from '../world.js';
import { J } from '../narrative/text.js';
import { CIVS } from '../explore/core.js';
import {
  SS, fill, clamp, mi, ownRng, slog, tally, LIBS, SCHOOLS, SCHOOL_IDS, HIST, BEASTS, GEO_MYTHS, BIAS, KIND,
  SC_NAMES, SC_LAST, Q, placeName, subjName, needOf, liveBooks,
} from './state.js';

export const FEED = { fact: null, mine: null };
const LIB_IDS = Object.keys(LIBS);
export const libFull = (pl) => { const nm = LIBS[pl]?.name ?? '서고', last = placeName(pl).split(' ').pop(); return nm.includes(last) ? nm : `${placeName(pl)} ${nm}`; };
export const foundText = (w) => `${w.text.split('적었다.')[0]}적은 것이 틀렸다고 한다.`;
const civName = (c) => CIVS[c]?.name ?? '옛사람들';
const GEO_PLACES = ['ern', 'harfen', 'verden', 'leocast', 'gruental', 'eisen', 'solaris', 'serenia', 'barka', 'graubel', 'silverleaf', 'hammer', 'klein', 'portel', 'saltmare', 'kalten', 'abel', 'luen'];

/* ---------- 책 한 권 ---------- */
// d: { kind, subj, by, pid, mine, school, skill(0~100 쓰는 솜씨), material(모은 자료), flatter, where, y }
export function makeBook(g, rng, d) {
  const S = SS(g), need = needOf(d.kind, d.subj);
  const short = Math.max(0, need - (d.material ?? 0));
  const wrong = [];
  const pool = mythsOf(d.kind, d.subj, rng);
  let n = short >= 3 ? 3 : short >= 2 ? 2 : short >= 1 ? 1 : 0;
  if (!n && rng.chance(0.12)) n = 1; // 다 갖춰도 하나쯤은 틀린다
  for (let i = 0; i < n && pool.length; i++) wrong.push({ text: pool.splice(rng.int(0, pool.length - 1), 1)[0], found: null });
  const f = KIND[d.kind]?.f, bias = d.school && BIAS[d.school]?.[f];
  if (bias && rng.chance(0.6)) wrong.push({ text: bias, found: null, bias: true });
  if (d.flatter) wrong.push({ text: '후원한 집안 조상의 패전을 이긴 싸움처럼 적었다.', found: null, flatter: true });
  const quality = Math.round(clamp((d.skill ?? 40) * 0.6 + Math.min(need, d.material ?? 0) / need * 35 + rng.int(-8, 8), 5, 99));
  const words = KIND[d.kind].words;
  const title = d.kind === 'tongue' ? `${civName(d.subj)}의 글 ${rng.pick(words)}` : `${subjName(d.kind, d.subj)} ${rng.pick(words)}`;
  const b = {
    id: S.seq++, title, kind: d.kind, subj: d.subj, by: d.by, pid: d.pid ?? null, mine: !!d.mine, school: d.school ?? null,
    y: d.y ?? g.date.year, quality, esteem: Math.round(quality * 0.7), copies: d.copies ?? rng.int(1, 3), where: d.where ?? 'leocast',
    wrong, banned: null, lost: false, readers: 0, refutes: d.refutes ?? null, flatter: !!d.flatter,
    realmAt: d.kind === 'geography' ? d.realmAt ?? null : null,
  };
  S.books.push(b);
  trim(g);
  return b;
}
function mythsOf(kind, subj, rng) {
  if (kind === 'history') return [...(HIST[subj]?.myths ?? [])];
  if (kind === 'nature') return [...(BEASTS[subj]?.myths ?? [])];
  if (kind === 'geography') { const p = placeName(subj), o = placeName(rng.pick(GEO_PLACES.filter((x) => x !== subj))); return GEO_MYTHS.map((f) => f(p, o)); }
  return ['한 낱말을 거꾸로 읽어 뜻이 반대가 되었다.', '이름 하나를 사람 이름이 아니라 땅 이름으로 옮겼다.', '숫자 셈법을 잘못 알아 해를 열 배로 옮겼다.'];
}
// 세상 책은 90권까지. 내 집안 책과 금서, 이름난 책은 남기고 잊힌 남의 책부터 지운다
function trim(g) {
  const S = SS(g);
  if (S.books.length <= 90) return;
  const drop = S.books.filter((b) => !b.mine && (b.lost || b.esteem < 25) && !S.read.includes(b.id)).sort((a, b) => a.esteem - b.esteem).slice(0, S.books.length - 90);
  if (drop.length) S.books = S.books.filter((b) => !drop.includes(b));
}

const scName = (rng) => `${rng.pick(SC_NAMES)} ${rng.pick(SC_LAST)}`;
const pickSubj = (rng, kind) => (kind === 'history' ? rng.pick(Object.keys(HIST)) : kind === 'nature' ? rng.pick(Object.keys(BEASTS)) : kind === 'geography' ? rng.pick(GEO_PLACES) : rng.pick(Object.keys(CIVS)));
const kindFor = (rng, school) => rng.pick({ record: ['history', 'history', 'geography'], field: ['geography', 'nature', 'nature'], scripture: ['history', 'history', 'nature'], tower: ['nature', 'nature', 'tongue'] }[school] ?? ['history', 'geography', 'nature']);
const homeLib = (school) => SCHOOLS[school]?.home ?? 'leocast';

/* ---------- 처음 세상: 이름난 학자 넷과 옛 책 몇 권 ---------- */
export function seed(g) {
  const S = fill(g);
  if (S.seeded) return;
  S.seeded = true;
  const rng = ownRng(g, 7);
  for (const school of SCHOOL_IDS) {
    const born = g.date.year - rng.int(45, 70);
    S.greats.push({ name: scName(rng), school, field: kindFor(rng, school), born, dies: born + rng.int(70, 88), alive: true });
  }
  // 앞선 시대의 책 (몇 권은 이미 틀린 곳이 짚였다)
  for (let i = 0; i < 12; i++) {
    const school = rng.pick(SCHOOL_IDS), kind = kindFor(rng, school), subj = pickSubj(rng, kind);
    const old = i < 4 ? S.greats[i] : null;
    const b = makeBook(g, rng, { kind, subj, by: old?.name ?? scName(rng), school, skill: rng.int(35, 85), material: rng.int(1, 5), where: rng.pick([homeLib(school), rng.pick(LIB_IDS)]), y: g.date.year - rng.int(5, 220), copies: rng.int(1, 6) });
    b.readers = rng.int(0, 40);
    if (b.wrong.length && rng.chance(0.35)) b.wrong[0].found = { by: scName(rng), y: b.y + rng.int(10, 60) };
  }
}

/* ---------- 한 해 ---------- */
function say1(g, say, text, big = false, fact = null) {
  slog(g, text);
  if (fact) FEED.fact?.(g, fact.k, fact.d);
  const S = SS(g);
  if (big || mi(g) - (S.newsAt ?? -99) >= 6) { say(text, big); S.newsAt = mi(g); }
}

export function scholarYear(g, say = () => {}) {
  const S = fill(g);
  if (!S.seeded) seed(g);
  const rng = ownRng(g, 31);
  greatsYear(g, rng, say);
  // 새 책: 이름난 학자는 몇 해에 한 권, 이름 없는 학자들도 가끔
  for (const gr of S.greats.filter((x) => x.alive && !x.pid)) {
    if (!rng.chance(0.12)) continue;
    const kind = gr.field ?? kindFor(rng, gr.school);
    let subj = pickSubj(rng, kind);
    for (let i = 0; i < 4 && S.books.some((b) => b.by === gr.name && b.subj === subj); i++) subj = pickSubj(rng, kind);
    const b = makeBook(g, rng, { kind, subj, by: gr.name, school: gr.school, skill: rng.int(60, 92), material: rng.int(2, 6), where: homeLib(gr.school) });
    say1(g, say, `${SCHOOLS[gr.school].name}의 ${J(gr.name, '이/가')} ${Q(b.title, '을/를')} 내놓았다. ${LIBS[b.where]?.name ?? '서고'}에 사본이 들어갔다.`, false, { k: 'sc_book', d: { name: gr.name, title: b.title, pl: b.where } });
  }
  if (rng.chance(0.55)) {
    const school = rng.pick(SCHOOL_IDS), kind = kindFor(rng, school);
    makeBook(g, rng, { kind, subj: pickSubj(rng, kind), by: scName(rng), school, skill: rng.int(25, 70), material: rng.int(0, 4), where: rng.pick(LIB_IDS) });
  }
  for (const b of liveBooks(g)) bookYear(g, rng, b, say);
  // 불: 서고마다 한 해에 드물게
  for (const pl of LIB_IDS) {
    if (!rng.chance(0.0015 * (LIBS[pl].size ?? 1))) continue;
    const burnt = liveBooks(g).filter((x) => x.where === pl);
    for (const x of burnt) { x.copies -= rng.int(1, 2); if (x.copies <= 0) { x.copies = 0; x.lost = true; if (x.mine) FEED.mine?.(g, x, null, null, 'lost'); } }
    tally(g, 'fire');
    say1(g, say, `${libFull(pl)}에 불이 났다. ${burnt.length ? `책 ${burnt.length}권이 그을리거나 탔다.` : '다행히 귀한 책은 건졌다.'}`, true, { k: 'sc_fire', d: { pl } });
  }
  // 학파의 기세: 대학자가 살아 있으면 오르고, 금서가 많으면 깎인다
  for (const s of SCHOOL_IDS) {
    const great = S.greats.some((x) => x.alive && x.school === s);
    const bans = liveBooks(g).filter((b) => b.school === s && b.banned).length;
    S.standing[s] = clamp(S.standing[s] + (great ? 1 : -1) - bans * 0.5 + rng.int(-2, 2), 10, 95);
  }
  pupilsYear(g, rng, say);
}

function bookYear(g, rng, b, say) {
  const S = SS(g), L0 = LIBS[b.where];
  // 읽는 사람과 사본
  b.readers += Math.max(0, Math.round(b.esteem / 20 + rng.int(-1, 2)));
  if (b.esteem >= 50 && !b.banned && rng.chance(b.esteem / 300)) b.copies = Math.min(40, b.copies + 1);
  if (rng.chance(0.04)) b.copies -= 1; // 닳고 좀먹는다
  // 평판은 솜씨와 짚인 틀린 곳 쪽으로 기운다
  const target = b.quality - b.wrong.filter((w) => w.found).length * 12 + (b.y < g.date.year - 80 ? 5 : 0);
  b.esteem = clamp(Math.round(b.esteem + Math.sign(target - b.esteem) * Math.min(3, Math.abs(target - b.esteem))), 0, 99);
  // 틀린 곳이 짚인다 (읽는 사람이 많을수록, 경쟁 학파가 셀수록)
  const open = b.wrong.filter((w) => !w.found);
  if (open.length && rng.chance(0.015 + Math.min(0.05, b.readers / 3000) + (b.school ? (S.standing[SCHOOLS[b.school].rival] - 50) / 2000 : 0))) {
    const w = rng.pick(open), who = scName(rng);
    w.found = { by: who, y: g.date.year };
    b.esteem = Math.max(0, b.esteem - 8);
    if (b.mine) FEED.mine?.(g, b, w, who);
    else if (b.esteem >= 40 || rng.chance(0.3)) say1(g, say, `${J(who, '이/가')} ${Q(b.title)}의 틀린 곳을 짚었다. ${foundText(w)}`);
  }
  // 금서: 성당 서고에 있는 회색 탑 박물지, 왕실 서고에 있는 왕가에 불편한 역사
  if (!b.banned && L0?.censor) {
    const risk = L0.censor === 'church' ? (b.school === 'tower' ? 0.05 : b.kind === 'tongue' ? 0.02 : 0) : (b.kind === 'history' && !b.flatter && (b.subj === 'leo' || b.subj === 'feud') ? 0.015 : 0);
    if (risk && rng.chance(risk)) {
      b.banned = L0.realm;
      tally(g, 'banned');
      if (b.mine) FEED.mine?.(g, b, null, null, 'banned');
      say1(g, say, `${L0.name}에서 ${Q(b.title, '을/를')} 금서로 묶었다. ${L0.censor === 'church' ? '성당' : '왕실'}이 그 책을 서가에서 내렸다.`, false, { k: 'sc_ban', d: { title: b.title, pl: b.where, name: b.by } });
    }
  } else if (b.banned && rng.chance(0.04)) {
    b.banned = null;
    say1(g, say, `${Q(b.title)}의 금서가 풀렸다. 몰래 돌던 사본들이 다시 서가로 돌아왔다.`);
  }
  if (b.copies <= 0 && !b.lost) { b.lost = true; b.copies = 0; if (b.mine) FEED.mine?.(g, b, null, null, 'lost'); }
}

function greatsYear(g, rng, say) {
  const S = SS(g);
  for (const gr of S.greats) {
    if (!gr.alive || gr.pid) continue;
    if (g.date.year >= gr.dies) {
      gr.alive = false;
      say1(g, say, `${SCHOOLS[gr.school].name}의 대학자 ${J(gr.name, '이/가')} 죽었다. 제자들이 스승의 책을 다시 베끼기 시작했다.`, false, { k: 'sc_great', d: { name: gr.name, school: gr.school, dead: true } });
    }
  }
  for (const s of SCHOOL_IDS) {
    if (S.greats.some((x) => x.alive && x.school === s)) continue;
    if (!rng.chance(0.12 + S.standing[s] / 600)) continue;
    const born = g.date.year - rng.int(40, 55);
    const gr = { name: scName(rng), school: s, field: kindFor(rng, s), born, dies: born + rng.int(68, 86), alive: true };
    S.greats.push(gr);
    say1(g, say, `${J(gr.name, '이/가')} ${SCHOOLS[s].name}의 새 대학자로 불리기 시작했다.`, false, { k: 'sc_great', d: { name: gr.name, school: s } });
  }
  if (S.greats.length > 24) S.greats = S.greats.filter((x) => x.alive || x.pid).concat(S.greats.filter((x) => !x.alive && !x.pid).slice(-12));
}

// 내 제자들의 앞날: 몇 해 지나면 갈 길이 정해지고, 스승의 책을 지키거나 고친다
function pupilsYear(g, rng, say) {
  const S = SS(g);
  for (const p of S.pupils) {
    if (p.fate || g.date.year - p.y < 4 || !rng.chance(0.25)) continue;
    p.fate = rng.chance(0.4) ? 'rise' : rng.chance(0.6) ? 'plain' : 'turn';
    const mine = S.books.filter((b) => b.mine && !b.lost);
    if (p.fate === 'rise' && mine.length) {
      const b = rng.pick(mine);
      b.copies += 2; b.esteem = Math.min(99, b.esteem + 4);
      say1(g, say, `제자였던 ${J(p.name, '이/가')} 학자가 되어 ${Q(b.title, '을/를')} 가르치기 시작했다. 스승의 책이 다시 읽힌다.`);
    } else if (p.fate === 'turn') {
      const b = mine.find((x) => x.wrong.some((w) => !w.found));
      if (b) {
        const w = b.wrong.find((x) => !x.found);
        w.found = { by: p.name, y: g.date.year, pupil: true };
        b.esteem = Math.max(0, b.esteem - 6);
        FEED.mine?.(g, b, w, p.name, 'pupil');
      }
    }
  }
}

WORLD_TICKS.push((g, rng, say) => { if (!g.scholar || g.date.month !== 1) return; scholarYear(g, say); });
export { scName, pickSubj, kindFor, GEO_PLACES };
