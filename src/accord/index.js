// 45단계 나라 사이 흐름: 성향·봉쇄·국경 다툼·밀약과 배신·원한. 화면 연결점 accordInfo·accordLine.
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { addFact } from '../rumor/index.js';
import { KINDS } from '../rumor/facts.js';
import { realmOf, realmState } from '../realms/index.js';
import { LANDS } from '../politics/data.js';
import { PS, nations, relOf, allWars, rulerLine } from '../politics/state.js';
import { L } from '../adventure/core.js';
import { AS, fill, short, full, mi, STANCES, EXPORTS, CAPITAL, stanceOf, heatWord, grudge } from './state.js';
import { FEED, GOOD_WORD } from './world.js';
import './life.js';

/* ---------- 소문으로 ---------- */
const cap = (id) => CAPITAL[id] ?? 'leocast';
const land = (d) => LANDS[d.land]?.name ?? '국경';
Object.assign(KINDS, {
  ac_stance: {
    at: (d) => cap(d.n), big: false, official: true,
    truth: (d) => `${short(d.n)}의 새 통치자는 ${STANCES[d.st]?.name ?? '속을 알 수 없는'} 사람이라고 한다.`,
    wrong: [(d) => `${short(d.n)}의 새 통치자가 즉위하자마자 옛 신하 절반을 내쫓았다는 말이 돈다.`, (d) => `${short(d.n)}의 새 통치자는 사실 남의 집 아이였다는 말이 돈다.`],
  },
  ac_embargo: {
    at: (d) => cap(d.a), big: false, official: true,
    truth: (d) => `${J(short(d.a), '이/가')} ${short(d.b)}에 무역 봉쇄를 걸었다. ${(EXPORTS[d.b] ?? []).map((x) => GOOD_WORD[x]).join('·')} 값이 오른다.`,
    wrong: [(d) => `${J(short(d.a), '이/가')} ${short(d.b)} 상인을 보는 족족 옥에 가둔다는 말이 돈다.`, (d) => `${short(d.b)} 물건을 쓰다 들키면 손목을 자른다는 말이 ${short(d.a)}에서 돈다.`],
  },
  ac_dispute: {
    at: (d) => cap(d.b), big: false,
    truth: (d) => `${J(land(d), '을/를')} 두고 ${J(short(d.a), '과/와')} ${short(d.b)}의 다툼이 ${d.hot >= 2 ? '피를 보았다' : d.hot ? '험해졌다' : '시작되었다'}.`,
    wrong: [(d) => `${land(d)}에서 두 나라 병사 수백이 죽었다는 말이 돈다.`, (d) => `${land(d)} 다툼 뒤에 다른 나라 밀정이 있다는 말이 돈다.`],
  },
  ac_betray: {
    at: (d) => cap(d.b), big: true,
    truth: (d) => `${J(short(d.a), '이/가')} 동맹 ${J(short(d.b), '을/를')} 배신했다.`,
    wrong: [(d) => `${short(d.a)} 왕이 ${short(d.b)} 왕비와 몰래 편지를 주고받다 들켰다는 말이 돈다.`, (d) => `${J(short(d.b), '이/가')} 먼저 ${J(short(d.a), '을/를')} 팔아넘기려 했다는 말이 돈다.`],
  },
});
FEED.fact = (g, k, d) => addFact(g, k, d);

/* ---------- 화면용 ---------- */
const yearOf = (since, g) => (since == null ? g.date.year : since > 3000 ? Math.floor(since / 12) : since);
const PACT_KIND = { alliance: 'ally', marriage: 'marriage', trade: 'trade', truce: 'pact', vassal: 'pact' };
const PACT_WORD = { alliance: '동맹', marriage: '혼인 동맹', trade: '통상 조약', truce: '휴전', vassal: '신종' };

export function accordTies(g) {
  const S = AS(g), out = [], ids = nations();
  const tie = (a, b, kind, since, word, text) => out.push({ a, b, aName: short(a), bName: short(b), kind, word, since: yearOf(since, g), text });
  for (const w of allWars(g)) tie(w.a, w.b, 'war', w.since, '전쟁', `${J(short(w.a), '과/와')} ${J(short(w.b), '이/가')} 싸우는 중`);
  for (const p of PS(g).pacts) if (PACT_KIND[p.kind] && ids.includes(p.a) && ids.includes(p.b)) tie(p.a, p.b, PACT_KIND[p.kind], p.since, PACT_WORD[p.kind], p.kind === 'vassal' ? `${J(short(p.b), '이/가')} ${short(p.a)}에 신종` : null);
  for (const e of S.embargo) tie(e.by, e.on, 'embargo', e.since, '무역 봉쇄', `${J(short(e.by), '이/가')} ${short(e.on)} 물건을 막음`);
  for (const d of S.disputes) tie(d.a, d.b, 'border', d.since, heatWord(d.heat), `${J(land(d), '을/를')} 두고 다툼`);
  const seen = new Set(out.map((t) => [t.a, t.b].sort().join('|')));
  for (const a of ids) for (const b of ids) if (a < b && !seen.has(`${a}|${b}`) && relOf(g, a, b) <= -55) tie(a, b, 'cold', null, '원수지간', grudge(g, a, b) ? '옛 원한이 남았다' : null);
  return out;
}

const STANCE_SHORT = { hawk: '매파', dove: '화친파', merchant: '장사꾼', zealot: '신앙 우선', schemer: '속을 모름' };
function hereLines(g) {
  const S = AS(g), out = [];
  const r = g.life ? realmOf(L(g).place) : 'leonia', home = g.realms ? realmState(g).citizen : 'leonia';
  for (const id of [...new Set([r, home])]) {
    if (!S.stance[id]) continue;
    out.push(`${short(id)}의 통치자는 ${STANCES[stanceOf(g, id)].name} 사람이다.`);
    for (const e of S.embargo) {
      if (e.by === id) out.push(`${J(short(id), '이/가')} ${short(e.on)}에 봉쇄를 걸어 ${(EXPORTS[e.on] ?? []).map((x) => GOOD_WORD[x]).join('·')} 값이 비싸다.`);
      else if (e.on === id) out.push(`${short(e.by)} 장터가 ${short(id)} 물건을 막았다.`);
    }
    for (const d of S.disputes) if (d.a === id || d.b === id) out.push(`${J(land(d), '을/를')} 두고 ${J(short(d.a === id ? d.b : d.a), '과/와')} ${heatWord(d.heat)}.`);
  }
  return out.slice(0, 6);
}

export function accordLine(g) {
  if (!g.accord || !g.politics) return '';
  const S = AS(g), hot = S.disputes.slice().sort((a, b) => b.heat - a.heat)[0], wars = allWars(g).length;
  const bits = [];
  if (wars) bits.push(`전쟁 ${wars}곳`);
  if (S.embargo.length) bits.push(`봉쇄 ${S.embargo.length}`);
  if (hot) bits.push(`${land(hot)} ${heatWord(hot.heat)}`);
  return bits.length ? `대륙 정세: ${bits.join(', ')}` : '대륙 정세: 잠잠하다';
}

export function accordInfo(g) {
  if (!g.accord || !g.politics) return null;
  const S = AS(g), m = S.me, any = Object.values(m).some((v) => v > 0);
  return {
    year: g.date.year,
    line: accordLine(g),
    ties: accordTies(g),
    here: hereLines(g),
    stances: nations().map((id) => ({ id, name: short(id), stance: stanceOf(g, id), word: STANCE_SHORT[stanceOf(g, id)], ruler: id === 'leonia' ? null : rulerLine(g, id) || null })),
    me: any ? { ...m, text: [m.smuggled && `밀수 ${m.smuggled}번`, m.mediated && `담판 ${m.mediated}번`, m.exposed && `밀약 들춤 ${m.exposed}번`, m.forged && `꾸민 사건 ${m.forged}번`, m.patrols && `국경 순찰 ${m.patrols}밤`, m.levied && `남의 나라 징집 ${m.levied}번`].filter(Boolean).join(', ') } : null,
    news: S.log.slice(-8).reverse().map((x) => ({ ...x })),
    tally: { ...S.tally },
  };
}

HOOKS.migrate.push((g) => { if (g.accord) fill(g); });
export { AS as accordState, mi };
