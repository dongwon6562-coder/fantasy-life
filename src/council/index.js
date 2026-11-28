// 50단계 도우미2: 자유도시 의회와 길드 정치. 상태는 g.council 하나.
// 화면 연결점: councilInfo(g) { line, mine, cities, news } / councilLines(g) / councilLine(g)
// - 자유도시 넷(바르카·포르텔·크로센·리베라)마다 시 의회가 따로 선다. 자리는 스물넷, 파벌은 상인·장인·항구·옛 가문.
//   해마다 의안(성문세·성벽·용병·부두·빵값·통상 조약·외지 장인) 하나를 표결하고, 네 해마다 선거로 판도가 바뀐다.
//   집정관(도제)은 가장 큰 파벌이나 손잡은 파벌에서 나온다. 뇌물이 쌓이면 실각하고, 민심이 끓으면 회관이 에워싸인다.
// - 나: 조합에 들기(장사·손재주·뱃일 솜씨가 있을 때) → 조합 일 → 조합장 → 의원 선거(연설·은화·표 사기) → 표결(찬반·표 팔기)
//   → 집정관 도전. 뇌물 장부가 드러나면 실각·추방. 옛 가문의 혼인 동맹. 내가 집정관까지 오르면 내 집안이 그 도시의 옛 가문이 된다.
// - 연합 전체의 상인 평의회와 의장은 crowns(free)가, 왕궁은 court, 촌장은 village, 나라 사이는 accord가 맡는다. 여기서는 읽기만 한다.
// 세상 흐름과 장면 고르기는 게임 난수를 건드리지 않는다(ownRng). 의원·집정관은 이름만 지닌다(g.people에 넣지 않는다).
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, living } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, traveling, stress, tired, check, canSpend, spend } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { realmOf, realmName, realmState } from '../realms/index.js';
import { NAMES as REALM_NAMES } from '../realms/data.js';
import { marry } from '../relations.js';
import { deed } from '../repute/index.js';
import { seldom } from '../rumor/seldom.js';
import { makeRng } from '../rng.js';
import * as T from './data.js';

T.setJosa(J);
const { CITIES, CITY_IDS, SEATS, FACTIONS, FACTION_IDS, ISSUES, ISSUE_IDS, OLD_HOUSES, RANK_WORD, RANK_OLD } = T;
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 곳';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 911) ^ Math.imul(mi(g) * 211 + salt + 97, 2654435761)) | 0 });
const free = (g) => !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.bondage?.slave && !g.exile?.banish && !g.army?.captive && !L(g).heirPending;
const statOf = (g, id) => me(g)?.stats?.[id] ?? g.player.stats?.[id] ?? 10;
const skill = (g, id) => g.player.skills?.[id] ?? 0;
const isCity = (pl) => !!CITIES[pl] && !!PLACES[pl];
// 다른 나라 손에 넘어간 도시는 의회가 멈춘다 (occupied·accord가 PLACES.realm을 바꾼다)
const cityFree = (pl) => isCity(pl) && realmOf(pl) === 'free';
const citizen = (g) => { const R = realmState(g); return R.citizen === 'free' || (R.naturalized ?? []).some((n) => (n.realm ?? n) === 'free'); };
const VOTE_MONTH = { barka: 3, portel: 5, krossen: 7, libera: 9 };
const FOREIGN = ['leonia', 'valhart', 'serenia', 'holy', 'march', 'elf', 'dwarf'];

/* ---------- 상태 ---------- */
export function councilState(g) {
  g.council ??= {};
  const s = g.council;
  s.cities ??= {};
  for (const id of CITY_IDS) if (!s.cities[id]) s.cities[id] = newCity(g, id);
  s.me ??= null;       // { city, fac, rank 1~4, since, rankAt, standing, graft, votes{aye,nay,sold,skip}, ally, foe, log[] }
  s.banned ??= {};     // { 도시: 풀리는 달 }
  s.houses ??= {};     // { 도시: [내 집안 성] } 집정관까지 오른 집안
  s.sceneAt ??= -99;
  s.seen ??= {};
  s.month ??= [];
  s.news ??= [];
  s.past ??= [];
  s.tally ??= { votes: 0, passed: 0, elections: 0, heads: 0, falls: 0, riots: 0, joined: 0, scenes: 0 };
  return s;
}
const S = councilState;
function newCity(g, id) {
  const c = CITIES[id], r = ownRng(g, id.length * 31 + id.charCodeAt(0));
  const seats = { ...c.seats };
  const top = FACTION_IDS.reduce((a, f) => (seats[f] > seats[a] ? f : a), 'merchant');
  const y = g.date?.year ?? 500;
  return {
    seats, prosper: 50, safe: 50, anger: 20, purse: 50,
    head: { ...person(r, top, id), since: y - r.int(1, 6) },
    issue: pickIssue(r, null, id),
    last: null, laws: [],
    elect: y + (CITY_IDS.indexOf(id) % 4) + 1,
  };
}
function person(r, fac, city) {
  const N = REALM_NAMES.free;
  const sex = r.chance(0.25) ? 'f' : 'm';
  const last = fac === 'old' ? r.pick(OLD_HOUSES[city] ?? N.last) : r.pick(N.last);
  return { name: `${r.pick(sex === 'f' ? N.f : N.m)} ${last}`, sex, fac, age: r.int(42, 64), graft: r.int(0, 30) };
}
function pickIssue(r, cs, city) {
  const w = ISSUE_IDS.map((id) => {
    let v = 1;
    if (!cs) return [id, v];
    if (id === 'grain') v += cs.anger / 25;
    if (id === 'wall' || id === 'merc') v += (60 - cs.safe) / 20;
    if (id === 'dock' || id === 'deal') v += (60 - cs.prosper) / 20;
    if (id === 'tax') v += (50 - cs.purse) / 15;
    if (cs.last?.id === id) v *= 0.2;
    return [id, Math.max(0.1, v)];
  });
  let t = w.reduce((a, [, v]) => a + v, 0) * r.next();
  let id = w[0][0];
  for (const [k, v] of w) { t -= v; if (t <= 0) { id = k; break; } }
  return { id, realm: id === 'deal' ? r.pick(FOREIGN) : null };
}
const cityText = (id, cs) => ({ ...CITIES[id], realm: cs?.issue?.realm ? realmName(cs.issue.realm) : '먼 나라' });
function log(g, text) { const m = S(g).me; if (!m) return; m.log.push({ y: g.date.year, m: g.date.month, text }); if (m.log.length > 30) m.log.shift(); }
function line(g, text) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind: 'council', text }); }
function news(g, text, city) {
  const s = S(g);
  s.news.unshift({ y: g.date.year, m: g.date.month, text }); if (s.news.length > 16) s.news.pop();
  const near = here(g) === city ? 70 : realmOf(here(g)) === 'free' ? 50 : 0;
  if (near) g.news.unshift({ text, rel: near });
}
const myCity = (g) => S(g).me?.city ?? null;
const rankWord = (m) => (m ? (m.fac === 'old' ? RANK_OLD : RANK_WORD)[m.rank] : '');
const headWord = (id) => CITIES[id].head;
const total = (seats) => FACTION_IDS.reduce((a, f) => a + (seats[f] ?? 0), 0);
const biggest = (seats) => FACTION_IDS.reduce((a, f) => (seats[f] > seats[a] ? f : a), 'merchant');
export const councilCity = (g, id) => S(g).cities[id] ?? null;

/* ---------- 표결 ---------- */
// 파벌 자리 × 그 파벌의 생각. 내 표는 의원 한 자리 몫(내 파벌 자리에서 빼고 내 뜻대로).
function tally(g, id, cs, mine = null) {
  const is = ISSUES[cs.issue.id];
  let yes = 0, no = 0;
  for (const f of FACTION_IDS) {
    let n = cs.seats[f] ?? 0;
    if (mine && mine.fac === f) n -= 1;
    const st = is.stance[f] ?? 0;
    // 생각이 약한 파벌은 반쯤 갈린다
    const share = st >= 2 ? 0.9 : st === 1 ? 0.7 : st === 0 ? 0.5 : st === -1 ? 0.3 : 0.1;
    yes += n * share; no += n * (1 - share);
  }
  if (mine?.vote === 'aye') yes += 1; else if (mine?.vote === 'nay') no += 1;
  // 금고가 바닥이면 돈 드는 안은 밀린다
  if ((is.fx.purse ?? 0) < 0 && cs.purse < 20) no += 3;
  return { yes: Math.round(yes), no: Math.round(no) };
}
function applyFx(cs, fx) {
  cs.prosper = clamp(cs.prosper + (fx.prosper ?? 0), 0, 100);
  cs.safe = clamp(cs.safe + (fx.safe ?? 0), 0, 100);
  cs.anger = clamp(cs.anger + (fx.anger ?? 0), 0, 100);
  cs.purse = clamp(cs.purse + (fx.purse ?? 0), 0, 100);
}
function resolveVote(g, id, mine = null) {
  const s = S(g), cs = s.cities[id], r = ownRng(g, 7 + id.length);
  const is = ISSUES[cs.issue.id];
  let { yes, no } = tally(g, id, cs, mine);
  // 흔들리는 표 한둘
  const wob = r.int(-1, 1); yes += wob; no -= wob;
  // 같으면 집정관 쪽 생각대로 (집정관이 결정표를 쥔다)
  const hs = is.stance[cs.head.fac] ?? 0;
  const pass = yes > no || (yes === no && (hs > 0 || (hs === 0 && r.chance(0.5))));
  const c = cityText(id, cs);
  if (pass) applyFx(cs, is.fx);
  cs.last = { id: cs.issue.id, pass, y: g.date.year, yes, no, realm: cs.issue.realm };
  cs.laws.unshift({ y: g.date.year, text: `${is.name}${cs.issue.realm ? `(${realmName(cs.issue.realm)})` : ''}: ${pass ? '통과' : '부결'} ${yes}대${no}` }); if (cs.laws.length > 6) cs.laws.pop();
  s.tally.votes += 1; if (pass) s.tally.passed += 1;
  news(g, pass ? is.pass(c) : is.fail(c), id);
  cs.issue = pickIssue(r, cs, id);
  return { pass, yes, no };
}

/* ---------- 선거와 집정관 ---------- */
function election(g, id) {
  const s = S(g), cs = s.cities[id], r = ownRng(g, 13 + id.length);
  const m = s.me;
  const swing = {};
  swing.merchant = (cs.prosper - 50) / 12;
  swing.harbor = (cs.anger - 30) / 15 + (cs.last?.id === 'dock' && cs.last.pass ? 1 : 0);
  swing.craft = (cs.anger - 30) / 20 + (cs.last?.id === 'guild' && cs.last.pass ? -1 : 0);
  swing.old = (50 - cs.safe) / 20;
  if (m && m.city === id && m.rank >= 3) swing[m.fac] = (swing[m.fac] ?? 0) + (m.standing - 50) / 25;
  const seats = {};
  // 도시마다 먹고사는 길이 있어 판도는 제자리로 조금씩 끌려간다
  for (const f of FACTION_IDS) seats[f] = Math.max(1, Math.round((cs.seats[f] ?? 1) + swing[f] + ((CITIES[id].seats[f] ?? 6) - (cs.seats[f] ?? 6)) * 0.35 + r.int(-2, 2)));
  // 합을 스물넷으로
  let t = total(seats);
  while (t > SEATS) { const f = biggest(seats); seats[f] -= 1; t -= 1; }
  while (t < SEATS) { const f = r.pick(FACTION_IDS); seats[f] += 1; t += 1; }
  cs.seats = seats;
  cs.elect = g.date.year + 4;
  s.tally.elections += 1;
  const top = biggest(seats);
  news(g, T.NEWS.elect({ city: CITIES[id].name, top: FACTIONS[top].name, n: seats[top] }), id);
  // 집정관이 나와 다른 파벌인데 그 파벌이 크게 줄었으면 바뀐다
  const hf = cs.head.fac;
  if (cs.head.mine) {
    if ((seats[hf] ?? 0) < 6 && top !== hf) { loseHead(g, id, '선거에서 내 쪽 자리가 줄어'); newHead(g, id, top); }
  } else if ((seats[hf] ?? 0) < seats[top] - 3) newHead(g, id, top);
}
function newHead(g, id, fac, who = null) {
  const s = S(g), cs = s.cities[id], r = ownRng(g, 19 + id.length);
  cs.head = who ?? { ...person(r, fac, id), since: g.date.year };
  s.tally.heads += 1;
  news(g, T.NEWS.head({ city: CITIES[id].name, name: cs.head.name, word: headWord(id), faction: FACTIONS[cs.head.fac].name }), id);
}
function loseHead(g, id, why) {
  const m = S(g).me;
  if (m && m.city === id && m.rank === 4) { m.rank = 3; m.rankAt = mi(g); log(g, `${why} ${headWord(id)} 자리에서 내려왔다.`); }
}

/* ---------- 한 해 ---------- */
function yearTick(g) {
  const s = S(g);
  for (const id of CITY_IDS) {
    if (!cityFree(id)) continue;
    const cs = s.cities[id], r = ownRng(g, 29 + id.length * 3);
    // 살림은 가운데로 돌아온다
    cs.prosper += (50 - cs.prosper) * 0.15; cs.safe += (50 - cs.safe) * 0.12; cs.anger += (25 - cs.anger) * 0.2; cs.purse += (45 - cs.purse) * 0.1 + 3;
    if (g.world?.famine) cs.anger = clamp(cs.anger + 15, 0, 100);
    if (g.world?.plague) { cs.prosper = clamp(cs.prosper - 8, 0, 100); cs.anger = clamp(cs.anger + 6, 0, 100); }
    const h = cs.head;
    if (!h.mine) {
      h.age += 1; h.graft = clamp(h.graft + r.int(0, 8), 0, 100);
      if (h.age >= 66 && r.chance((h.age - 62) * 0.03)) { news(g, T.NEWS.dead({ city: CITIES[id].name, word: headWord(id), name: h.name }), id); newHead(g, id, biggest(cs.seats)); }
      else if (h.graft >= 60 && r.chance(0.22)) { s.tally.falls += 1; news(g, T.NEWS.fall({ city: CITIES[id].name, word: headWord(id), name: h.name, exile: r.chance(0.5) }), id); newHead(g, id, biggest(cs.seats)); }
    }
    // 민심이 끓으면 회관이 에워싸인다
    if (cs.anger >= 65 && r.chance(0.5)) {
      s.tally.riots += 1; cs.anger -= 18; cs.safe = clamp(cs.safe - 6, 0, 100);
      news(g, T.NEWS.riot({ city: CITIES[id].name, hall: CITIES[id].hall }), id);
      if (!cs.head.mine && r.chance(0.3)) newHead(g, id, r.pick(['harbor', 'craft']));
    }
    if (cs.last?.id === 'merc' && cs.last.pass && cs.purse < 25 && r.chance(0.35)) { cs.purse = clamp(cs.purse - 10, 0, 100); news(g, T.NEWS.merc({ city: CITIES[id].name }), id); }
    if (g.date.year >= cs.elect) election(g, id);
  }
}

/* ---------- 나 ---------- */
// 이 도시에서 들 수 있는 조합
const JOB_FAC = { merchant: 'merchant', shopkeeper: 'merchant', trade_master: 'merchant', fishwife: 'merchant', innkeeper: 'merchant', smith: 'craft', weaver: 'craft', baker: 'craft', carpenter: 'craft', mason: 'craft', tailor: 'craft', goldsmith: 'craft', alchemist: 'craft', cook: 'craft', miller: 'craft', apprentice: 'craft', sailor: 'harbor', sea_captain: 'harbor', fisher: 'harbor', laborer: 'harbor' };
function guildFor(g) {
  // 지금 하는 일이 먼저, 없으면 솜씨로
  const j = JOB_FAC[L(g).job?.id];
  if (j) return j;
  const craft = Math.max(skill(g, 'smithing'), skill(g, 'building'), skill(g, 'fineart'), skill(g, 'cooking'), skill(g, 'alchemy'));
  const opts = [['merchant', skill(g, 'trade')], ['craft', craft], ['harbor', skill(g, 'sailing')]].filter(([, v]) => v >= 10);
  opts.sort((a, b) => b[1] - a[1]);
  return opts[0]?.[0] ?? null;
}
const FEE = { merchant: 30, craft: 20, harbor: 12 };
function join(g, city, fac, standing = 10) {
  const s = S(g);
  s.me = { city, fac, rank: 1, since: mi(g), rankAt: mi(g), standing, graft: 0, votes: { aye: 0, nay: 0, sold: 0, skip: 0 }, ally: null, foe: null, log: [] };
  const house = (s.houses[city] ?? []).includes(g.player.lastName);
  if (house) s.me.standing += 20;
  s.tally.joined += 1;
  log(g, `${CITIES[city].name} ${FACTIONS[fac].guild ?? FACTIONS[fac].name}에 이름을 올렸다.`);
}
function leave(g, why) {
  const s = S(g), m = s.me;
  if (!m) return;
  if (m.rank === 4) { const cs = s.cities[m.city]; cs.head.mine = false; newHead(g, m.city, biggest(cs.seats)); }
  s.past.push({ y: g.date.year, text: `${CITIES[m.city].name} ${rankWord(m)} (${why})` }); if (s.past.length > 12) s.past.shift();
  s.me = null;
}
// 도시 밖으로 쫓겨난다
function banish(g, city, years) {
  const s = S(g);
  s.banned[city] = mi(g) + years * 12;
  const links = Object.keys(PLACES[city]?.links ?? {}).filter((p) => PLACES[p] && !PLACES[p].hidden);
  const to = links.find((p) => realmOf(p) !== 'free') ?? links[0];
  if (to && here(g) === city) { L(g).place = to; L(g).travel = null; const R = realmState(g); R.cur = realmOf(to); R.last = to; }
  return to;
}
function fall(g, why, exile) {
  const s = S(g), m = s.me;
  if (!m) return '';
  s.tally.falls += 1;
  const city = m.city, word = rankWord(m);
  deed(g, 'greedy', 2, null);
  if (m.rank === 4) { const cs = s.cities[city]; cs.head.mine = false; newHead(g, city, biggest(cs.seats)); }
  if (exile) {
    leave(g, why);
    const to = banish(g, city, 8);
    news(g, `${CITIES[city].name} 의회가 ${word} ${J(g.player.name, '을/를')} 도시 밖으로 쫓아냈다.`, city);
    return to ? ` 사흘 안에 성문을 나서라는 명이 내려왔다. 짐 몇 개를 싸서 ${placeName(to)}로 향했다. 여덟 해 동안 ${CITIES[city].name} 성문은 나에게 닫힌다.` : '';
  }
  m.rank = 1; m.rankAt = mi(g); m.standing = 10; m.graft = 0;
  log(g, `${why} 자리를 잃고 조합원으로 돌아갔다.`);
  return ' 의원 명부에서 내 이름이 지워졌다. 조합 회관에서는 아무도 내 옆에 앉지 않는다.';
}

/* ---------- 장면 ---------- */
defineScene('cn_invite', {
  need: (g) => !S(g).me && isCity(here(g)),
  title: () => '조합에 들라는 말',
  text: (g, s) => T.INVITE[s.fac]({ city: CITIES[s.city].name, fee: FEE[s.fac] }),
  choices: (g, s) => [
    ...(canSpend(g, FEE[s.fac]) ? [{ label: `회비를 내고 ${FACTIONS[s.fac].guild}에 든다`, key: 'join' }] : []),
    { label: '아직은 혼자 하겠다고 한다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    if (key !== 'join') { const n = S(g).seen.declined = (S(g).seen.declined ?? 0) + 1; return ['고개를 저었다. "생각이 바뀌면 회관으로 오게." 그 말은 문 닫는 소리 같지 않았다. 열어 두는 소리였다.', '또 고개를 저었다. 그쪽도 이제는 크게 서운해하지 않았다. 조합 없이 장사하는 사람이 어떻게 사는지 지켜보겠다는 얼굴이었다.', '이번에도 거절했다. 회관 서기는 명부를 덮으며 말했다. "회비는 해마다 오른다네."'][(n - 1) % 3]; }
    if (!spend(g, FEE[s.fac])) return '주머니를 뒤졌지만 회비가 모자랐다. 다음 철을 기약했다.';
    join(g, s.city, s.fac);
    return `조합 명부에 이름을 적었다. 회관 벽에 걸린 ${FACTIONS[s.fac].guild} 깃발 아래서 늙은 서기가 내 손에 구리 표식을 쥐여 주었다. "이제부터 네 일이 곧 조합 일이다. 조합 일도 네 일이고."`;
  },
});

defineScene('cn_guildvote', {
  need: (g) => S(g).me?.rank === 1,
  title: (g) => `${FACTIONS[S(g).me.fac].guild ?? '가문'} 회관의 밤`,
  text: (g, s) => `${CITIES[S(g).me.city].name} ${FACTIONS[S(g).me.fac].guild ?? '옛 가문'}의 우두머리를 새로 뽑는다. 늙은 조합장 ${J(s.old, '이/가')} 물러나며 내 이름을 입에 올렸다. 맞은편에는 ${J(s.rival, '이/가')} 앉아 있다. 그 집 수레가 회관 앞에 술통을 내려놓는 것을 다들 보았다.`,
  choices: (g) => [
    { label: '조합원들 앞에서 내가 할 일을 말한다', key: 'speech' },
    ...(canSpend(g, 30) ? [{ label: '조합원 몇 집에 은화를 돌린다 (은화 30닢)', key: 'coin' }] : []),
    { label: '이번엔 물러난다', key: 'back' },
  ],
  resolve(g, rng, s, key) {
    const m = S(g).me;
    if (key === 'back') { m.standing = clamp(m.standing - 5, 0, 100); return '자리에서 일어나 물러나겠다고 했다. 몇은 아쉬운 얼굴이었고, 몇은 안도하는 얼굴이었다. 누가 어느 쪽인지 오래 기억해 두었다.'; }
    let v = statOf(g, 'cha') + m.standing / 4;
    if (key === 'coin') { if (!spend(g, 30)) return '은화가 모자랐다.'; v += 12; m.graft = clamp(m.graft + 6, 0, 100); }
    m.seenRun = mi(g);
    if (check(rng, v, 30)) {
      m.rank = 2; m.rankAt = mi(g); m.standing = clamp(m.standing + 10, 0, 100); m.foe = s.rival;
      log(g, `${FACTIONS[m.fac].guild ?? '가문'}의 우두머리가 되었다.`);
      return `표를 세는 데 한 시간이 걸렸다. 내 이름이 ${s.n}번 불렸다. ${J(s.rival, '은/는')} 끝까지 자리를 지키다 마지막에 내 손을 잡았다. 손에 힘이 너무 들어가 있었다.`;
    }
    m.standing = clamp(m.standing - 8, 0, 100); m.foe = s.rival;
    return `${J(s.rival, '이/가')} 이겼다. 표 차는 셋. 술통 셋 값이다. 돌아오는 길에 회관 앞 술통 밑동을 발로 찼다. 꿈쩍도 하지 않았다.`;
  },
});

defineScene('cn_election', {
  need: (g) => S(g).me?.rank === 2,
  title: (g) => `${CITIES[S(g).me.city].name} 의회 선거`,
  text: (g, s) => T.ELECT_TXT[s.v % T.ELECT_TXT.length]({ city: CITIES[S(g).me.city].name, faction: FACTIONS[S(g).me.fac].name, rival: s.rival }) + (citizen(g) ? '' : ' 다만 시민권이 없는 사람은 의원이 될 수 없다고 서기가 귀띔했다.'),
  choices: (g) => (citizen(g) ? [
    { label: '광장 연단에 올라 말한다', key: 'speech' },
    ...(canSpend(g, 60) ? [{ label: '술과 은화로 표를 산다 (은화 60닢)', key: 'buy' }] : []),
    { label: '표 세는 사람을 매수해 둔다', key: 'fraud' },
    { label: '이름을 내린다', key: 'back' },
  ] : [{ label: '이번엔 이름을 내린다', key: 'back' }]),
  resolve(g, rng, s, key) {
    const m = S(g).me, cs = S(g).cities[m.city];
    if (key === 'back') return '명부에서 이름을 내렸다. 조합 사람들은 다음 선거를 이야기했다. 네 해는 길다.';
    let v = statOf(g, 'cha') + m.standing / 3 + (cs.seats[m.fac] - 6) * 2;
    let out = '';
    if (key === 'speech') { const ok = check(rng, statOf(g, 'cha'), 22); v += ok ? 10 : -6; out = (ok ? T.SPEECH_OK : T.SPEECH_BAD)[mi(g) % 2] + ' '; }
    if (key === 'buy') { if (!spend(g, 60)) return '은화가 모자랐다.'; v += 14; m.graft = clamp(m.graft + 10, 0, 100); out = '주막마다 술통이 열렸다. 내 이름이 적힌 주머니가 골목을 돌았다. '; }
    if (key === 'fraud') { v += 22; m.graft = clamp(m.graft + 25, 0, 100); m.fraud = mi(g); out = '표 세는 서기 둘에게 밤에 사람을 보냈다. 다음 날 아침 서기의 아내가 새 털목도리를 두르고 장에 나왔다. '; }
    m.foe = s.rival;
    if (check(rng, v, 34)) {
      m.rank = 3; m.rankAt = mi(g); m.standing = clamp(m.standing + 8, 0, 100);
      const lose = FACTION_IDS.filter((f) => f !== m.fac && cs.seats[f] > 1).sort((a, b) => cs.seats[b] - cs.seats[a])[0];
      if (lose) { cs.seats[lose] -= 1; cs.seats[m.fac] += 1; }
      log(g, `${CITIES[m.city].name} 의원이 되었다.`); deed(g, 'ambitious', 1, null);
      return `${out}표함을 연 날 저녁, 회관 서기가 내 이름을 의원 명부에 적었다. ${CITIES[m.city].hall}의 긴 의자 한 칸이 이제 내 자리다.`;
    }
    m.standing = clamp(m.standing - 6, 0, 100);
    return `${out}표를 세 보니 ${J(s.rival, '이/가')} 앞섰다. 회관 앞에서 그 집 사람들이 북을 쳤다. 다음 선거까지 네 해.`;
  },
});

defineScene('cn_vote', {
  need: (g) => (S(g).me?.rank ?? 0) >= 3,
  title: (g) => `${CITIES[S(g).me.city].hall}의 표결`,
  text: (g, s) => {
    const m = S(g).me, cs = S(g).cities[m.city], is = ISSUES[cs.issue.id];
    const st = is.stance[m.fac] ?? 0;
    const lean = st >= 1 ? '찬성하기로' : st <= -1 ? '반대하기로' : '저마다 알아서 하기로';
    return `${is.ask(cityText(m.city, cs))} ${FACTIONS[m.fac].name}은 ${lean} 했다.${s.bribe ? ` 표결 전날 밤, ${s.briber} 사람이 은화 ${s.bribe}닢이 든 주머니를 들고 찾아왔다. ${s.bside === 'aye' ? '찬성' : '반대'} 한 표면 된다고 했다.` : ''}${m.rank === 4 ? ` ${headWord(m.city)}의 말 한마디에 서너 표가 움직인다.` : ''}`;
  },
  choices: (g, s) => [
    { label: '찬성한다', key: 'aye' },
    { label: '반대한다', key: 'nay' },
    { label: '자리를 비운다', key: 'skip' },
    ...(s.bribe ? [{ label: `주머니를 받고 ${s.bside === 'aye' ? '찬성' : '반대'}한다`, key: 'sell' }] : []),
  ],
  resolve(g, rng, s, key) {
    const st = S(g), m = st.me, cs = st.cities[m.city], is = ISSUES[cs.issue.id];
    let vote = key === 'sell' ? s.bside : key === 'skip' ? null : key;
    if (key === 'sell') { g.player.money += s.bribe; m.graft = clamp(m.graft + 15, 0, 100); m.votes.sold += 1; }
    else if (key === 'skip') m.votes.skip += 1; else m.votes[key] += 1;
    const want = (is.stance[m.fac] ?? 0) >= 1 ? 'aye' : (is.stance[m.fac] ?? 0) <= -1 ? 'nay' : null;
    if (want && vote) m.standing = clamp(m.standing + (vote === want ? 5 : -8), 0, 100);
    // 집정관은 서너 표를 끌고 온다
    const mine = { fac: m.fac, vote };
    const res = resolveVote(g, m.city, mine);
    if (m.rank === 4 && vote && ((vote === 'aye') !== res.pass) && check(rng, statOf(g, 'cha') + m.standing / 3, 30)) {
      // 집정관이 밀어붙여 뒤집는다
      cs.last.pass = !cs.last.pass; if (cs.last.pass) applyFx(cs, is.fx);
      cs.laws[0].text = cs.laws[0].text.replace(/통과|부결/, cs.last.pass ? '통과' : '부결') + ' (집정관이 뒤집음)';
      log(g, `${is.name} 표결을 집정관의 힘으로 뒤집었다.`);
      return `표가 갈렸다. 나는 의장석에서 일어나 한 사람씩 이름을 불렀다. 세 사람이 손을 바꿔 들었다. ${is.name} 안은 내 뜻대로 ${cs.last.pass ? '통과되었다' : '부결되었다'}. 그 셋이 무엇을 바라는지는 다음 달에 알게 될 것이다.`;
    }
    log(g, `${is.name} 표결에서 ${vote === 'aye' ? '찬성' : vote === 'nay' ? '반대' : '자리를 비웠다'}${key === 'sell' ? '(주머니를 받고)' : ''}. ${res.pass ? '통과' : '부결'}.`);
    const tail = res.pass ? '통과되었다' : '부결되었다';
    const cnt = `찬성 ${res.yes}, 반대 ${res.no}. ${tail}`;
    const nv = m.votes.aye + m.votes.nay + m.votes.skip + m.votes.sold;
    if (key === 'sell') return `주머니는 생각보다 무거웠다. 손을 들 때 맞은편 의원과 눈이 마주쳤다. 그 사람도 무언가 무거운 것을 받았는지 눈을 피했다. ${cnt}.`;
    if (key === 'skip') return `그날 회관에 가지 않았다. 집에서 창밖을 보며 종소리를 셌다. ${cnt}. 내 한 표가 있었으면 달라졌을지는 모르겠다.`;
    const open = [`손을 들었다. ${CITIES[m.city].hall} 서기가 내 이름 옆에 금을 그었다.`, `서기가 이름을 부르자 일어나 대답했다. 내 목소리가 회관 천장에 한 번 울렸다.`, `긴 의자에 앉아 차례를 기다리다 손을 들었다. 몇 해째 같은 자리, 같은 손이다.`, `표결 전에 짧게 한마디 했다. 듣는 사람은 반쯤이었다. 그러고 손을 들었다.`][nv % 4];
    const cross = [' 회관을 나서는데 같은 파벌 의원들이 내 옆을 비켜 지나갔다.', ' 파벌 모임에 가니 내 잔만 비어 있었다.', ' 다음 날 조합 회관 문간에서 늙은 의원이 혀를 찼다. "한 번은 봐준다."', ' 같은 파벌 사람들이 나를 보는 눈이 하루 사이에 식었다.'][nv % 4];
    return `${open} ${cnt}.${want && vote !== want ? cross : ''}`;
  },
});

defineScene('cn_scandal', {
  need: (g) => (S(g).me?.rank ?? 0) >= 2,
  title: () => '게시판의 장부',
  text: (g, s) => T.SCANDAL[s.v % T.SCANDAL.length]({ hall: CITIES[S(g).me.city].hall, rival: S(g).me.foe ?? '맞수', me: g.player.name }),
  choices: (g) => [
    ...(canSpend(g, 80) ? [{ label: '은화로 입을 막는다 (은화 80닢)', key: 'pay' }] : []),
    { label: '의회 앞에서 정면으로 맞선다', key: 'face' },
    { label: '밤에 도시를 빠져나간다', key: 'flee' },
  ],
  resolve(g, rng, s, key) {
    const m = S(g).me;
    if (key === 'flee') { const city = m.city; leave(g, '달아남'); const to = banish(g, city, 5); return `그날 밤 짐도 다 못 싸고 성문을 나섰다.${to ? ` 새벽에 ${placeName(to)} 가는 길 위에 있었다.` : ''} 뒤에서 내 이름을 부르는 소리는 없었다. 그게 더 무서웠다.`; }
    if (key === 'pay') {
      if (!spend(g, 80)) return '은화가 모자랐다.' + fall(g, '뇌물 장부가 드러나', false);
      if (rng.chance(0.6)) { m.graft = clamp(m.graft - 20, 0, 100); return '장부를 붙인 사람이 누군지 알아내 은화를 보냈다. 이튿날 게시판은 비어 있었다. 다들 본 것을 못 본 척했다. 이 도시에서는 그것도 거래다.'; }
      m.graft = clamp(m.graft + 5, 0, 100);
      return '은화를 받은 자가 그 은화까지 장부에 적어 다시 붙였다.' + fall(g, '뇌물 장부가 드러나', rng.chance(0.4));
    }
    if (check(rng, statOf(g, 'cha') + m.standing / 3 - m.graft / 4, 26)) { m.graft = clamp(m.graft - 10, 0, 100); m.standing = clamp(m.standing - 6, 0, 100); return '회관 한가운데 섰다. 그 장부의 글씨가 누구 손인지, 그 사람이 지난 선거 때 누구 집 술을 마셨는지 하나씩 말했다. 사람들의 눈이 장부에서 그쪽으로 옮겨 갔다. 장부는 사흘 만에 잊혔다. 나는 잊지 않았다.'; }
    return '맞섰다. 말이 길어질수록 사람들 얼굴이 굳었다. 장부 속 날짜 하나하나가 내 말보다 단단했다.' + fall(g, '뇌물 장부가 드러나', m.graft >= 60);
  },
});

defineScene('cn_headvote', {
  need: (g) => S(g).me?.rank === 3,
  title: (g) => `${headWord(S(g).me.city)} 자리`,
  text: (g, s) => {
    const m = S(g).me, cs = S(g).cities[m.city];
    return `${CITIES[m.city].name} ${headWord(m.city)} ${cs.head.name}의 임기가 끝나 간다. ${FACTIONS[m.fac].name}은 ${cs.seats[m.fac]}석. 스물넷 가운데 열셋을 모아야 한다. 회관 복도에서 다른 파벌 의원들이 나를 보는 눈이 달라졌다.`;
  },
  choices: (g) => {
    const m = S(g).me, cs = S(g).cities[m.city];
    const other = FACTION_IDS.filter((f) => f !== m.fac).sort((a, b) => cs.seats[b] - cs.seats[a])[0];
    return [
      { label: `${FACTIONS[other].name}과 손잡는다 (그쪽 의안을 밀어 주기로)`, key: `pact:${other}` },
      ...(canSpend(g, 150) ? [{ label: '흔들리는 의원들에게 은화를 돌린다 (은화 150닢)', key: 'coin' }] : []),
      { label: '연설로 승부한다', key: 'speech' },
      { label: '이번엔 나서지 않는다', key: 'back' },
    ];
  },
  resolve(g, rng, s, key) {
    const st = S(g), m = st.me, cs = st.cities[m.city];
    if (key === 'back') return '나서지 않았다. 다른 사람이 그 자리에 앉는 것을 긴 의자 끝에서 지켜보았다. 의자는 여전히 딱딱했다.';
    let seats = cs.seats[m.fac], v = statOf(g, 'cha') + m.standing / 3;
    let out = '';
    if (key.startsWith('pact:')) { const f = key.slice(5); seats += Math.round(cs.seats[f] * 0.5); m.ally = FACTIONS[f].name; out = `${FACTIONS[f].name}의 늙은 의원과 밤새 마주 앉았다. 서로 무엇을 내주고 무엇을 받을지 종이에 적고, 다 적은 뒤 그 종이를 태웠다. `; }
    if (key === 'coin') { if (!spend(g, 150)) return '은화가 모자랐다.'; seats += 4; m.graft = clamp(m.graft + 20, 0, 100); out = '은화 주머니가 밤마다 회관 뒷문으로 나갔다. '; }
    if (key === 'speech') { seats += check(rng, statOf(g, 'cha'), 24) ? 3 : 0; out = '회관에서 도시가 어디로 가야 하는지 말했다. 몇은 고개를 끄덕였다. '; }
    const ok = seats >= 13 || (seats >= 10 && check(rng, v, 32));
    if (ok) {
      m.rank = 4; m.rankAt = mi(g); m.standing = clamp(m.standing + 10, 0, 100);
      newHead(g, m.city, m.fac, { name: `${g.player.name} ${g.player.lastName ?? ''}`.trim(), sex: me(g).sex, fac: m.fac, age: playerAge(g), graft: 0, since: g.date.year, mine: true });
      st.houses[m.city] ??= []; if (g.player.lastName && !st.houses[m.city].includes(g.player.lastName)) st.houses[m.city].push(g.player.lastName);
      log(g, `${CITIES[m.city].name} ${headWord(m.city)}이 되었다.`); deed(g, 'ambitious', 2, null);
      return `${out}표결 날, 서기가 이름을 부를 때마다 손이 올라갔다. 열셋째 손이 올라가자 회관이 술렁였다. ${CITIES[m.city].name}의 ${headWord(m.city)} 반지가 내 손가락에 끼워졌다. 생각보다 헐거웠다.`;
    }
    m.standing = clamp(m.standing - 6, 0, 100);
    return `${out}표가 모자랐다. ${seats}에서 멈췄다. 손잡자던 이들 중 몇이 마지막에 손을 내렸다. 누구였는지는 이미 안다.`;
  },
});

defineScene('cn_match', {
  need: (g, s) => !!S(g).me && !!byId(g, s.pid)?.alive && !me(g).spouseId,
  title: () => '옛 가문의 혼담',
  text: (g, s) => { const p = byId(g, s.pid); return `${s.house} 집안의 늙은 가장이 사람을 보내왔다. 그 집 ${p.sex === 'f' ? '딸' : '아들'} ${J(p.name, '과/와')} 나의 혼사를 이야기하자고 한다. 옛 가문과 사돈이 되면 회관의 문 몇 개가 저절로 열린다. 그 대신 그 집의 원수도 내 원수가 된다.`; },
  choices: () => [{ label: '혼담을 받아들인다', key: 'yes' }, { label: '정중히 거절한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const m = S(g).me, p = byId(g, s.pid);
    if (key !== 'yes') { m.standing = clamp(m.standing - 3, 0, 100); return '거절했다. 늙은 가장은 웃으며 잔을 비웠다. 그 웃음이 길어서 오히려 마음이 쓰였다.'; }
    p.lastName = s.house === p.lastName ? p.lastName : p.lastName;
    p.affection = clamp((p.affection ?? 0) + 25, -100, 100); p.known = true;
    const txt = marry(g, p);
    m.ally = `${s.house} 집안`; m.standing = clamp(m.standing + 12, 0, 100);
    log(g, `옛 가문 ${s.house} 집안과 혼인으로 손을 잡았다.`);
    return `${txt} 혼례에는 의원이 열둘 왔다. 그중 다섯은 그날 처음 나에게 고개를 숙였다.`;
  },
});

defineScene('cn_caught', {
  need: (g) => isCity(here(g)) && (S(g).banned[here(g)] ?? 0) > mi(g),
  title: () => '닫힌 성문',
  text: () => '성문 경비가 내 얼굴을 알아보았다. 쫓겨난 사람의 이름은 성문 안쪽 판에 적혀 있다. "의회 명이다. 돌아가든지, 벌금을 내고 오늘 하루만 머물든지."',
  choices: (g) => [...(canSpend(g, 20) ? [{ label: '벌금을 내고 하루만 머문다 (은화 20닢)', key: 'pay' }] : []), { label: '돌아선다', key: 'go' }],
  resolve(g, rng, s, key) {
    const city = here(g);
    if (key === 'pay' && spend(g, 20)) { const to = banish(g, city, Math.max(1, Math.ceil(((S(g).banned[city] ?? 0) - mi(g)) / 12))); return `은화를 내고 하루를 머물렀다. 해 질 녘 경비 둘이 따라붙어 성문 밖까지 데려다주었다.${to ? ` 그날 밤은 ${placeName(to)} 가는 길가에서 잤다.` : ''}`; }
    const to = banish(g, city, Math.max(1, Math.ceil(((S(g).banned[city] ?? 0) - mi(g)) / 12)));
    return `돌아섰다.${to ? ` ${placeName(to)} 쪽으로 걸었다.` : ''} 등 뒤로 성문 닫는 소리가 들렸다.`;
  },
});

/* ---------- 행동 ---------- */
const inMyCity = (g) => { const m = S(g).me; return !!m && here(g) === m.city && cityFree(m.city) && free(g); };
ACTIONS.push({
  id: 'council_join', name: '조합 회관 찾아가기', icon: 'scale',
  desc: '이 도시에서 내 솜씨로 들 수 있는 조합의 회관 문을 두드린다.',
  available: (g) => !S(g).me && free(g) && playerAge(g) >= 16 && cityFree(here(g)) && !((S(g).banned[here(g)] ?? 0) > mi(g)) && !!guildFor(g) && mi(g) - (S(g).seen.cn_invite ?? -99) >= 12,
  run(g) { const s = S(g); s.seen.cn_invite = mi(g); queueScene(g, 'cn_invite', { city: here(g), fac: guildFor(g) }, { first: true }); return `${CITIES[here(g)].name} ${FACTIONS[guildFor(g)].guild} 회관 문을 두드렸다.`; },
});
ACTIONS.push({
  id: 'council_work', name: '조합 일 보기', icon: 'scale',
  desc: '조합 회관에 나가 장부와 다툼을 맡는다. 조합 안에서 내 말에 무게가 붙는다.',
  available: (g) => inMyCity(g) && S(g).me.rank <= 3 && mi(g) - (S(g).seen.work ?? -99) >= 2,
  run(g) {
    const s = S(g), m = s.me, r = ownRng(g, 61);
    s.seen.work = mi(g);
    m.standing = clamp(m.standing + r.int(3, 7), 0, 100);
    const pay = 2 + m.rank * 2; g.player.money += pay;
    tired(g, 6);
    const W = {
      merchant: ['상단 둘이 짐값을 두고 다투는 것을 조합 저울 앞에서 갈라 주었다.', '조합 장부를 맞췄다. 한 상단의 셈이 석 달째 은화 몇 닢씩 비었다. 아직은 말하지 않았다.', '외지 상인에게 조합 허가장을 내주며 수수료를 받았다.'],
      craft: ['견습생 하나가 도제 계약을 어겼다는 송사를 맡았다. 스승도 견습생도 할 말이 많았다.', '조합 표식 없이 물건을 판 떠돌이 장인의 좌판을 걷었다. 그 사람 얼굴이 오래 남았다.', '새 직인 시험을 보았다. 셋 중 하나만 붙었다.'],
      harbor: ['품삯을 떼인 짐꾼들 편에 서서 선주를 찾아갔다. 반은 받아 냈다.', '부두 자리 다툼을 갈랐다. 양쪽 다 나를 원망했다. 잘 갈랐다는 뜻이다.', '물에 빠져 죽은 뱃사람의 과부에게 조합 돈을 전했다.'],
      old: ['가문 어른들의 제사 자리에 앉았다. 술잔이 돌 때마다 도시 일이 한 가지씩 정해졌다.', '옛 장부를 정리했다. 이 도시의 땅 절반이 다섯 집 이름으로 되어 있었다.', '가문 사람의 송사에 증인으로 섰다.'],
    }[m.fac];
    return `${W[mi(g) % W.length]} 은화 ${pay}닢.`;
  },
});
ACTIONS.push({
  id: 'council_run', name: '조합장에 나서기', icon: 'banner',
  desc: '조합의 우두머리 자리에 이름을 건다.',
  available: (g) => inMyCity(g) && S(g).me.rank === 1 && playerAge(g) >= 25 && mi(g) - S(g).me.rankAt >= 24 && S(g).me.standing >= 40 && mi(g) - (S(g).me.seenRun ?? -99) >= 24,
  run(g) {
    const m = S(g).me, r = ownRng(g, 67), N = REALM_NAMES.free;
    m.seenRun = mi(g);
    queueScene(g, 'cn_guildvote', { old: `${r.pick(N.m)} ${r.pick(N.last)}`, rival: `${r.pick(N.m)} ${r.pick(N.last)}`, n: r.int(14, 30) }, { first: true });
    return '조합 회관 게시판에 내 이름을 붙였다.';
  },
});
ACTIONS.push({
  id: 'council_stand', name: '의원 선거에 나서기', icon: 'banner',
  desc: '올해는 의회 선거가 있는 해다. 조합 몫의 의원 자리에 이름을 건다.',
  available: (g) => inMyCity(g) && S(g).me.rank === 2 && playerAge(g) >= 28 && S(g).cities[S(g).me.city].elect === g.date.year && mi(g) - (S(g).seen.stand ?? -99) >= 12,
  run(g) {
    const s = S(g), m = s.me, r = ownRng(g, 71), N = REALM_NAMES.free;
    s.seen.stand = mi(g);
    const foeFac = FACTION_IDS.filter((f) => f !== m.fac).sort((a, b) => s.cities[m.city].seats[b] - s.cities[m.city].seats[a])[0];
    queueScene(g, 'cn_election', { rival: `${r.pick(N.m)} ${foeFac === 'old' ? r.pick(OLD_HOUSES[m.city]) : r.pick(N.last)}`, v: mi(g) }, { first: true });
    return '의원 후보 명부에 이름을 올렸다.';
  },
});
ACTIONS.push({
  id: 'council_head', name: '집정관 자리에 도전', icon: 'crown',
  desc: '의회에서 표를 모아 도시의 수장 자리를 노린다.',
  available: (g) => inMyCity(g) && S(g).me.rank === 3 && playerAge(g) >= 35 && mi(g) - S(g).me.rankAt >= 24 && S(g).me.standing >= 55 && citizen(g) && mi(g) - (S(g).seen.head ?? -99) >= 36,
  run(g) { S(g).seen.head = mi(g); queueScene(g, 'cn_headvote', {}, { first: true }); return '회관 복도에서 의원들을 하나씩 붙잡기 시작했다.'; },
});
ACTIONS.push({
  id: 'council_leave', name: '조합에서 나오기', icon: 'door',
  desc: '조합과 의회 일에서 손을 뗀다.',
  available: (g) => !!S(g).me && free(g) && here(g) === S(g).me.city && mi(g) - S(g).me.since >= 12,
  run(g) { const m = S(g).me; const w = rankWord(m); leave(g, '스스로 물러남'); return `${w} 자리를 내려놓았다. 조합 표식을 서기에게 돌려주었다. 손이 가벼웠다.`; },
});

/* ---------- 한 달 ---------- */
function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over || !me(g)) return;
  const now = mi(g);
  if (g.date.month === 2) yearTick(g);
  const pl = here(g);
  const m = s.me;
  // 나라 밖에 오래 있으면 자리를 잃는다
  if (m && pl !== m.city && realmOf(pl) !== 'free' && !traveling(g)) { m.away = (m.away ?? 0) + 1; if (m.away >= 36) { log(g, '세 해 넘게 도시를 비워 조합 명부에서 이름이 지워졌다.'); leave(g, '오래 비움'); } }
  else if (m) m.away = 0;
  // 표결 달: 내가 의원이고 그 도시에 있으면 장면으로, 아니면 저절로
  for (const id of CITY_IDS) {
    if (g.date.month !== VOTE_MONTH[id] || !cityFree(id)) continue;
    const cs = s.cities[id];
    if (m && m.city === id && m.rank >= 3 && pl === id && free(g) && playerAge(g) >= 18) {
      const r = ownRng(g, 83);
      const offer = r.chance(0.35 + m.graft / 300);
      const bside = (ISSUES[cs.issue.id].stance[m.fac] ?? 0) >= 1 ? 'nay' : 'aye';
      const briber = r.pick(FACTION_IDS.filter((f) => f !== m.fac).map((f) => FACTIONS[f].name));
      s.sceneAt = now; s.tally.scenes += 1;
      queueScene(g, 'cn_vote', offer ? { bribe: r.pick([20, 30, 45]), bside, briber } : {}, { first: true });
      cs.voteHeld = now;
    } else resolveVote(g, id);
  }
  // 이 고장 한 줄
  if (cityFree(pl) && seldom(g, `council:${pl}`, 24)) {
    const cs = s.cities[pl];
    const f = FACTION_IDS[(now + pl.length) % FACTION_IDS.length];
    line(g, T.PRESENCE[now % T.PRESENCE.length]({ hall: CITIES[pl].hall, issue: ISSUES[cs.issue.id].name, faction: FACTIONS[f].name, headName: cs.head.name, headWord: headWord(pl) }));
  }
  if (!free(g) || playerAge(g) < 16) return;
  // 쫓겨난 도시에 들어왔다
  if (isCity(pl) && (s.banned[pl] ?? 0) > now && !L(g).queue.some((z) => z.kind === 'cn_caught')) { queueScene(g, 'cn_caught', {}, { first: true }); return; }
  if (now - s.sceneAt < 4 || L(g).queue.length >= 2 || L(g).queue.some((z) => /^cn_/.test(z.kind)) || g.pendingEvent) return;
  const r = ownRng(g, 89);
  const q = (kind, data, gap = 0) => { if (gap && now - (s.seen[kind] ?? -999) < gap) return false; s.seen[kind] = now; s.sceneAt = now; s.tally.scenes += 1; queueScene(g, kind, data); return true; };
  if (!m) {
    if (!cityFree(pl) || (s.banned[pl] ?? 0) > now) return;
    const fac = guildFor(g);
    const house = (s.houses[pl] ?? []).includes(g.player.lastName);
    if (fac && r.chance(house ? 0.12 : 0.06)) q('cn_invite', { city: pl, fac }, 36);
    return;
  }
  if (pl !== m.city || !cityFree(pl)) return;
  // 뇌물 장부
  if (m.rank >= 2 && m.graft >= 35 && r.chance(0.02 + m.graft / 1500 + (m.fraud && now - m.fraud < 24 ? 0.04 : 0))) { q('cn_scandal', { v: now }, 24); return; }
  // 옛 가문의 혼담
  if (m.rank >= 2 && !me(g).spouseId && playerAge(g) <= 45 && r.chance(0.03)) {
    const sex = me(g).sex === 'm' ? 'f' : 'm';
    const p = living(g).find((x) => !x.isPlayer && x.sex === sex && !x.spouseId && (x.place ?? 'ern') === pl && x.ageMonths >= 18 * 12 && x.ageMonths <= 40 * 12 && !g.player.familyIds.includes(x.id) && Math.abs(x.ageMonths / 12 - playerAge(g)) <= 12);
    if (p) q('cn_match', { pid: p.id, house: p.lastName && (OLD_HOUSES[pl] ?? []).includes(p.lastName) ? p.lastName : r.pick(OLD_HOUSES[pl]) }, 60);
  }
}

/* ---------- 화면 ---------- */
export function councilLines(g) { return (g.council?.month ?? []).slice(0, 1).map((x) => ({ ...x })); }
export function councilLine(g) { return councilLines(g)[0]?.text ?? null; }
export function councilInfo(g) {
  const s = S(g), m = s.me;
  const cities = CITY_IDS.filter((id) => PLACES[id]).map((id) => {
    const cs = s.cities[id], is = ISSUES[cs.issue.id], c = cityText(id, cs);
    const nextMonth = VOTE_MONTH[id] >= g.date.month ? VOTE_MONTH[id] : VOTE_MONTH[id] + 12;
    return {
      id, name: CITIES[id].name,
      head: `${cs.head.name} (${headWord(id)}${cs.head.mine ? ', 나' : ''})`,
      faction: FACTIONS[cs.head.fac].name,
      seats: FACTION_IDS.map((f) => ({ name: FACTIONS[f].name, n: cs.seats[f], mine: !!m && m.city === id && m.fac === f })),
      word: !cityFree(id) ? `지금은 ${realmName(realmOf(id))}의 손에 있다. 회관 문에 그쪽 깃발이 걸렸고 의회는 열리지 않는다.` : `${J(CITIES[id].lean, '으로/로')} 먹고사는 도시. 살림 ${word3(cs.prosper)}, 성벽 ${word3(cs.safe)}, 민심 ${word3(100 - cs.anger)}. 다음 선거 ${cs.elect}년.`,
      vote: { what: `${is.name}${cs.issue.realm ? ` (${realmName(cs.issue.realm)})` : ''}`, when: `${nextMonth > 12 ? '내년 ' : ''}${((nextMonth - 1) % 12) + 1}월`, stand: m && m.city === id ? standWord(is.stance[m.fac] ?? 0) : null, ask: is.ask(c) },
      last: cs.last ? { what: ISSUES[cs.last.id].name, result: `${cs.last.pass ? '통과' : '부결'} ${cs.last.yes}대${cs.last.no} (${cs.last.y}년)` } : null,
      laws: cs.laws.map((x) => x.text),
    };
  });
  const mine = m ? {
    city: CITIES[m.city].name, seat: rankWord(m), guild: FACTIONS[m.fac].guild ?? FACTIONS[m.fac].name, guildRank: m.rank >= 2 ? (m.fac === 'old' ? '가문의 대표' : '조합장') : rankWord(m),
    faction: FACTIONS[m.fac].name, rank: m.rank,
    votes: `찬성 ${m.votes.aye} · 반대 ${m.votes.nay} · 비움 ${m.votes.skip}${m.votes.sold ? ` · 판 표 ${m.votes.sold}` : ''}`,
    standing: Math.round(m.standing), standWord: m.standing >= 70 ? '조합이 믿고 따른다' : m.standing >= 40 ? '말에 무게가 있다' : '아직 가볍다',
    need: needText(g, m), nextSeat: RANK_WORD[m.rank + 1] ?? null,
    since: Math.floor((mi(g) - m.since) / 12), ally: m.ally, foe: m.foe,
    dirty: m.graft >= 60 ? '뇌물 소문이 돈다' : m.graft >= 30 ? '장부에 지저분한 줄이 있다' : null,
    log: m.log.map((x) => ({ ...x })),
  } : null;
  const banned = Object.entries(s.banned).filter(([, u]) => u > mi(g)).map(([id, u]) => `${CITIES[id].name} 성문이 닫혀 있다 (${Math.ceil((u - mi(g)) / 12)}해 남음)`);
  const line = councilLine(g) ?? (m ? `${CITIES[m.city].name} ${rankWord(m)}. ${needText(g, m)}` : null);
  return { line, mine, cities, news: s.news.map((x) => ({ ...x })), past: s.past.map((x) => ({ ...x })), banned, houses: Object.entries(s.houses).map(([id, h]) => `${CITIES[id].name}: ${h.join(', ')}`), tally: { ...s.tally } };
}
export const councilView = councilInfo;
const word3 = (v) => (v >= 65 ? '좋음' : v >= 40 ? '보통' : '나쁨');
const standWord = (st) => (st >= 1 ? '우리 파벌은 찬성' : st <= -1 ? '우리 파벌은 반대' : '우리 파벌은 갈림');
function needText(g, m) {
  const cs = S(g).cities[m.city];
  if (m.rank === 1) return playerAge(g) < 25 ? '스물다섯은 넘어야 조합장 자리를 넘볼 수 있다.' : mi(g) - m.rankAt < 24 ? '조합에서 두 해는 지나야 조합장에 나설 수 있다.' : m.standing < 40 ? '조합 일을 더 보아 말에 무게가 붙어야 한다.' : '조합장 자리에 나설 수 있다.';
  if (m.rank === 2) return playerAge(g) < 28 ? '의원은 스물여덟이 넘어야 될 수 있다.' : !citizen(g) ? '의원이 되려면 자유도시 시민권이 있어야 한다.' : cs.elect === g.date.year ? '올해 의회 선거가 있다.' : `다음 의회 선거는 ${cs.elect}년이다.`;
  if (m.rank === 3) return playerAge(g) < 35 ? '집정관은 서른다섯이 넘어야 노릴 수 있다.' : mi(g) - m.rankAt < 24 ? '의원으로 두 해는 지나야 집정관 자리를 노릴 수 있다.' : m.standing < 55 ? '파벌 안에서 더 믿음을 얻어야 한다.' : `${headWord(m.city)} 자리를 노릴 만하다.`;
  return `${headWord(m.city)}로 도시를 다스린다. 해마다 표결에서 내 뜻을 밀어붙일 수 있다.`;
}

/* ---------- 훅 ---------- */
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.council = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g) => {
  const s = S(g), m = s.me;
  if (m) { s.past.push({ y: g.date.year, text: `${CITIES[m.city].name} ${rankWord(m)}` }); if (s.past.length > 12) s.past.shift(); }
  if (m?.rank === 4) { const cs = s.cities[m.city]; cs.head.mine = false; newHead(g, m.city, biggest(cs.seats)); }
  s.me = null; s.sceneAt = mi(g);
});
