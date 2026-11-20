// 23단계: 봉기와 반란. 상태는 g.revolt 하나, 화면 연결점은 revoltInfo(g).
// - 고장마다 영민의 분노(anger)가 쌓인다: 흉년과 재앙(nature), 전쟁 세금(politics 전쟁), 나라가 흔들림(politics 안정), 영주의 새 세금.
// - 분노가 끓으면 봉기가 인다 (플레이어가 없어도). 모의(brewing) → 들고일어남(up) → 꺾임(crushed) / 이김(won) / 타협(deal).
// - 플레이어: 가담하기·이끌기(revolt_call, revolt_stir), 창고 털기(revolt_raid), 영주 편에서 진압하기(revolt_suppress), 일러바치기.
// - 반란군 안의 다툼(revolt_quarrel), 배신(revolt_betray), 영주의 협상(revolt_parley).
// - 실패하면: 처형(revolt_gallows), 숨어 사는 잔당(hidden, revolt_hunted). 이기면: 새 질서(orders)와 그것이 다시 썩는 일(revolt_rot).
// - 내 영지(domain)는 domain/rule.js가 봉기를 맡으므로 여기서는 건드리지 않는다. 전투는 war의 rebels를 쓰지 않고 장면으로 판가름한다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat } from '../game.js';
import { byId, ageYears, makePerson } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, spend, canSpend, check, traveling } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { remember } from '../relations.js';
import { isJailed, jail, reportCrime, CRIMES, crimeState } from '../crime.js';
import { deed } from '../repute/index.js';
import { calamityAt } from '../nature/index.js';
import { politicsState, warsOf } from '../politics/index.js';
import { realmOf } from '../realms/index.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const alive = (p) => !!p && p.alive && !p.isPlayer;
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 83) ^ Math.imul(mi(g) * 59 + salt + 41, 2654435761)) | 0 });
const free = (g) => !traveling(g) && !isJailed(g) && !g.over && !L(g).heirPending && !g.bondage?.slave && !g.army?.campaign && !g.army?.captive;
const ready = (g) => playerAge(g) >= 16 && free(g);
const stat = (g, id) => g.player.stats?.[id] ?? 0;
const skill = (g, id) => g.player.skills?.[id] ?? 0;
const SOLDIER_JOBS = ['knight', 'guard', 'soldier', 'imperial_soldier', 'wall_guard'];
const isSoldier = (g) => SOLDIER_JOBS.includes(L(g).job?.id);

// 봉기가 일 수 있는 고장과 그 고장의 윗사람
export const LORDS = {
  ern: { lord: '남부 대관', force: 40, folk: '농민' },
  gruental: { lord: '그륀탈 영주관 집사', force: 35, folk: '농민' },
  harfen: { lord: '하르펜 대관', force: 55, folk: '장인과 날품팔이' },
  verden: { lord: '베르덴 백작', force: 65, folk: '농민' },
  klein: { lord: '클라인 항 세관장', force: 45, folk: '어부와 짐꾼' },
  leocast: { lord: '왕실 세리청', force: 80, folk: '빈민가 사람들' },
  eisen: { lord: '제국 총독부', force: 85, folk: '광부와 날품팔이' },
  graubel: { lord: '변경 백작', force: 75, folk: '성 밖 농민' },
  solaris: { lord: '교황청 재무관', force: 70, folk: '순례길 장사치' },
  barka: { lord: '바르카 의회', force: 55, folk: '부두 일꾼' },
  portel: { lord: '포르텔 상인 의회', force: 55, folk: '부두 일꾼' },
};
const PLACES_R = Object.keys(LORDS);
const lordOf = (pl) => LORDS[pl]?.lord ?? '영주';
const folkOf = (pl) => LORDS[pl]?.folk ?? '영민';
const CAUSES = {
  famine: '흉년에도 세금은 그대로다',
  war: '전쟁 세금이 해마다 붙는다',
  tax: '영주가 새 세금을 매겼다',
  unrest: '나라가 흔들리니 윗사람들이 제 몫부터 챙긴다',
  rot: '새 질서가 옛 영주를 닮아 간다',
  grudge: '꺾인 봉기의 목들이 아직 잊히지 않았다',
};
const angerWord = (a) => (a >= 75 ? '끓어 넘친다' : a >= 55 ? '들끓는다' : a >= 35 ? '수군거린다' : a >= 15 ? '불평이 섞인다' : '잠잠하다');
const strengthWord = (s) => (s >= 75 ? '고을을 쥐었다' : s >= 55 ? '기세가 높다' : s >= 35 ? '버티고 있다' : '흩어지고 있다');
const rotWord = (r) => (r >= 70 ? '옛 영주와 다를 게 없다' : r >= 45 ? '썩는 냄새가 난다' : r >= 20 ? '조금씩 굳어 간다' : '아직 새롭다');
const heatWord = (h) => (h >= 60 ? '현상금이 붙어 있다' : h >= 30 ? '아직 찾는 사람이 있다' : h > 0 ? '거의 잊혔다' : '잊혔다');

// 이 모듈의 죄 (crime.js 목록에 얹는다)
CRIMES.sedition ??= { name: '반역 선동', heat: 30, sev: 6, noto: 4 };
CRIMES.rebellion ??= { name: '반란 가담', heat: 60, sev: 18, noto: 10 };

/* ---------- 상태 ---------- */
export function revoltState(g) {
  g.revolt ??= {};
  const v = g.revolt;
  v.anger ??= {};      // 고장: 0~100
  v.cause ??= {};      // 고장: CAUSES 열쇠
  v.risings ??= [];    // [{ id, place, leader(pid), start, phase, months, str, me(role|null), quarrel, parley, betray }]
  v.seq ??= 1;
  v.orders ??= [];     // 이긴 봉기 뒤의 새 질서 [{ place, by, pid, mine, y, rot, ended }]
  v.past ??= [];       // [{ y, place, out, leader }]
  v.hidden ??= null;   // 숨어 사는 잔당 { from, y, heat, name }
  v.tally ??= { joined: 0, led: 0, crushed: 0, won: 0, informed: 0, suppressed: 0, raids: 0 };
  v.sceneAt ??= 0;
  v.blood ??= null;    // 선대가 반역자로 죽었다 { by, place, y, seen }
  v.log ??= [];
  for (const pl of PLACES_R) v.anger[pl] ??= 10;
  return v;
}
const V = revoltState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
const risingAt = (g, pl) => V(g).risings.find((r) => r.place === pl && (r.phase === 'brewing' || r.phase === 'up')) ?? null;
const myRising = (g) => V(g).risings.find((r) => r.me && (r.phase === 'brewing' || r.phase === 'up')) ?? null;
const orderAt = (g, pl) => V(g).orders.find((o) => o.place === pl && !o.ended) ?? null;
const myDomainPlace = (g) => g.domain?.place ?? null;
const leaderName = (g, r) => (r.leader === 'me' ? g.player.name : byId(g, r.leader)?.name ?? '이름 모를 우두머리');
const news = (g, text, rel = 80) => { g.news.unshift({ text, rel }); };

/* ---------- 화면용 ---------- */
export function revoltInfo(g) {
  const v = V(g);
  const pl = here(g);
  const r = myRising(g);
  const o = v.orders.find((x) => x.mine && !x.ended);
  return {
    here: LORDS[pl] ? { placeName: placeName(pl), anger: Math.round(v.anger[pl] ?? 0), word: angerWord(v.anger[pl] ?? 0), cause: v.cause[pl] ? CAUSES[v.cause[pl]] : null, lord: lordOf(pl) } : null,
    hot: PLACES_R.filter((p) => (v.anger[p] ?? 0) >= 35).sort((a, b) => v.anger[b] - v.anger[a]).slice(0, 5).map((p) => ({ placeName: placeName(p), anger: Math.round(v.anger[p]), word: angerWord(v.anger[p]) })),
    risings: v.risings.filter((x) => x.phase === 'brewing' || x.phase === 'up').map((x) => ({ placeName: placeName(x.place), phase: x.phase === 'brewing' ? '모의 중' : '들고일어남', months: x.months, leader: leaderName(g, x), strength: Math.round(x.str), word: strengthWord(x.str), role: x.me ? ROLE_NAME[x.me] : null })),
    mine: r ? { placeName: placeName(r.place), role: ROLE_NAME[r.me], phase: r.phase === 'brewing' ? '모의 중' : '들고일어남', strength: Math.round(r.str), word: strengthWord(r.str) } : null,
    hidden: v.hidden ? { placeName: placeName(v.hidden.from), years: g.date.year - v.hidden.y, heat: Math.round(v.hidden.heat), word: heatWord(v.hidden.heat) } : null,
    order: o ? { placeName: placeName(o.place), y: o.y, rot: Math.round(o.rot), word: rotWord(o.rot) } : null,
    orders: v.orders.filter((x) => !x.ended).map((x) => ({ placeName: placeName(x.place), by: x.mine ? g.player.name : byId(g, x.pid)?.name ?? '옛 우두머리들', y: x.y, word: rotWord(x.rot) })),
    tally: { ...v.tally },
    past: v.past.slice(-6).map((x) => ({ y: x.y, placeName: placeName(x.place), out: OUT_NAME[x.out] ?? x.out, leader: x.leader })),
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}
const ROLE_NAME = { member: '가담자', leader: '우두머리', loyal: '영주 편' };
const OUT_NAME = { crushed: '꺾였다', won: '이겼다', deal: '타협했다', faded: '흩어졌다' };

/* ---------- 봉기 만들기 ---------- */
function pickLeader(g, rng, pl) {
  const fam = new Set(g.player.familyIds ?? []);
  const cands = g.people.filter((p) => alive(p) && (p.place ?? 'ern') === pl && ageYears(p) >= 22 && ageYears(p) <= 60 && !fam.has(p.id) && !p.away);
  if (cands.length) return rng.pick(cands);
  const p = makePerson(rng, { ageMonths: rng.int(25, 50) * 12, job: 'farmer' });
  p.place = pl; p.childIds ??= []; p.affection = 0;
  g.people.push(p);
  return p;
}
function startRising(g, rng, pl, { leader = null, mine = null } = {}) {
  const v = V(g);
  const lead = leader === 'me' ? 'me' : (leader ?? pickLeader(g, rng, pl)).id;
  const r = { id: v.seq++, place: pl, leader: lead, start: mi(g), phase: 'brewing', months: 0, str: clamp((v.anger[pl] ?? 50) * 0.55 + rng.int(0, 15), 15, 90), me: mine, quarrel: false, parley: false, betray: false, cause: v.cause[pl] ?? 'tax' };
  v.risings.push(r);
  if (v.risings.length > 12) v.risings.splice(0, v.risings.length - 12);
  return r;
}
function endRising(g, rng, r, out) {
  const v = V(g);
  r.phase = out;
  const pl = r.place;
  const lead = leaderName(g, r);
  v.past.push({ y: g.date.year, place: pl, out, leader: lead });
  if (v.past.length > 20) v.past.shift();
  const realm = realmOf(pl);
  const P = politicsState(g);
  if (out === 'crushed') {
    v.anger[pl] = 8; v.cause[pl] = 'grudge';
    if (P.stab?.[realm] != null) P.stab[realm] = clamp(P.stab[realm] + 2, 0, 100);
    const lp = r.leader !== 'me' ? byId(g, r.leader) : null;
    if (lp?.alive && rng.chance(0.7)) { lp.alive = false; lp.deathCause = '봉기를 이끌다 처형되었다'; }
    news(g, `${placeName(pl)}의 봉기가 꺾였다. ${lordOf(pl)}의 군사가 우두머리 ${J(lead, '을/를')} 비롯해 여럿을 성문에 매달았다.`, 90);
    chron(g, `${placeName(pl)}에서 일어난 ${folkOf(pl)}의 봉기가 ${lordOf(pl)}에게 꺾이다.`, 70);
  } else if (out === 'won') {
    v.anger[pl] = 5; v.cause[pl] = null;
    if (P.stab?.[realm] != null) P.stab[realm] = clamp(P.stab[realm] - 6, 0, 100);
    v.orders = v.orders.filter((o) => o.place !== pl);
    v.orders.push({ place: pl, by: lead, pid: r.leader === 'me' ? null : r.leader, mine: r.leader === 'me', y: g.date.year, rot: 0, ended: false });
    news(g, `${placeName(pl)}의 ${J(folkOf(pl), '이/가')} ${J(lordOf(pl), '을/를')} 몰아냈다. ${J(lead, '이/가')} 고을 회의를 세웠다고 한다.`, 95);
    chron(g, `${placeName(pl)}의 봉기가 이기다. ${J(lordOf(pl), '이/가')} 쫓겨나고 ${lead}의 고을 회의가 서다.`, 90);
  } else if (out === 'deal') {
    v.anger[pl] = 15; v.cause[pl] = null;
    news(g, `${placeName(pl)}의 봉기가 ${J(lordOf(pl), '과/와')}의 협상으로 끝났다. 세금이 내렸다고 하지만 믿는 사람은 반쯤이다.`, 70);
    chron(g, `${placeName(pl)}의 봉기가 협상으로 끝나다.`, 50);
  } else {
    v.anger[pl] = clamp((v.anger[pl] ?? 30) - 20, 0, 100);
  }
}

/* ---------- 장면: 봉기에 들 것인가 ---------- */
defineScene('revolt_call', {
  title: () => '밤의 모임',
  text: (g, s) => { const r = V(g).risings.find((x) => x.id === s.rid); const pl = r?.place ?? here(g); return `헛간 뒤에 사람들이 모였다. 횃불은 없다. ${leaderName(g, r ?? { leader: null })}${J(leaderName(g, r ?? { leader: null }), '이/가').slice(-1)} 낮은 목소리로 말했다. "${CAUSES[r?.cause] ?? CAUSES.tax}. 더는 못 참소. 보름 뒤 ${lordOf(pl)}의 곳간을 연다." 모두의 눈이 나에게 왔다. 여기 있었다는 것만으로도 이미 목이 걸린 일이다.`; },
  choices: (g, s) => {
    const r = V(g).risings.find((x) => x.id === s.rid);
    if (!r || r.phase !== 'brewing' || r.me || !ready(g) || here(g) !== r.place) return [];
    return [
      { label: '함께하겠다고 한다', key: 'join' },
      (stat(g, 'cha') >= 35 || (L(g).renown ?? 0) >= 15) ? { label: '내가 앞장서겠다고 한다', key: 'lead' } : null,
      { label: '조용히 빠진다', key: 'out' },
      { label: `${lordOf(r.place)}에게 일러바친다`, key: 'inform' },
    ].filter(Boolean);
  },
  resolve(g, rng, s, key) {
    const v = V(g), r = v.risings.find((x) => x.id === s.rid);
    if (!r || r.phase !== 'brewing') return '모임은 이미 흩어졌다.';
    if (key === 'join') { r.me = 'member'; r.str = clamp(r.str + 5, 0, 100); v.tally.joined += 1; log(g, `${placeName(r.place)}의 봉기에 가담했다.`); note(g, `${placeName(r.place)}의 봉기에 가담했다.`); return '손을 들었다. 옆 사람이 내 손을 꽉 쥐었다. 굳은살 박인 손이었다. 돌아오는 길에 별이 유난히 밝았다.'; }
    if (key === 'lead') {
      const old = r.leader !== 'me' ? byId(g, r.leader) : null;
      if (old && !check(rng, stat(g, 'cha') * 0.6 + (L(g).renown ?? 0) * 0.5, 40)) { r.me = 'member'; v.tally.joined += 1; return `"우두머리는 ${old.name}요." 몇이 고개를 저었다. 앞장서지는 못했지만 빠지지도 않았다. 가담자로 이름을 올렸다.`; }
      r.me = 'leader'; if (old) { r.second = old.id; remember(g, old, '봉기의 우두머리 자리를 넘겨받았다', 1, { tag: 'revolt' }); }
      r.leader = 'me'; r.str = clamp(r.str + 8, 0, 100); v.tally.led += 1; v.tally.joined += 1;
      log(g, `${placeName(r.place)}의 봉기를 이끌게 되었다.`); note(g, `${placeName(r.place)}의 봉기를 이끌게 되었다.`);
      return '"그럼 당신이 하시오." 모두가 나를 보았다. 그 눈빛들이 무거웠다. 이 사람들의 목숨이 이제 내 말 한마디에 걸렸다.';
    }
    if (key === 'inform') {
      r.str = clamp(r.str - 25, 0, 100); r.betrayedBy = 'me'; v.tally.informed += 1;
      const n = 20 + Math.round(r.str / 3);
      g.player.money += n;
      deed(g, 'loyal', -5, `${placeName(r.place)}의 봉기를 영주에게 일러바쳤다더라`, r.place);
      L(g).renown = (L(g).renown ?? 0) + 1;
      const lp = r.leader !== 'me' ? byId(g, r.leader) : null;
      if (lp) lp.affection = Math.min(lp.affection ?? 0, -40);
      log(g, `${placeName(r.place)}의 봉기를 ${lordOf(r.place)}에게 일렀다.`);
      return `${lordOf(r.place)}의 집사가 은화 ${n}닢을 세어 주었다. "이름은 지켜 주겠소." 사흘 뒤 헛간에 모였던 얼굴 몇이 끌려갔다. 마을 우물가에서 사람들이 내 쪽을 보다가 고개를 돌렸다.`;
    }
    return '모자를 눌러쓰고 나왔다. 아무것도 듣지 못한 것으로 하기로 했다. 그래도 밤마다 그 목소리들이 떠올랐다.';
  },
});

/* ---------- 행동: 선동 ---------- */
ACTIONS.push({
  id: 'revolt_stir', name: '사람들을 부추긴다', icon: 'fist',
  desc: '장터와 주막에서 영주의 세금과 곳간 이야기를 꺼낸다. 분노가 쌓이면 봉기를 이끌 수도 있다. 들키면 반역 선동이다.',
  available: (g) => ready(g) && !!LORDS[here(g)] && here(g) !== myDomainPlace(g) && (V(g).anger[here(g)] ?? 0) >= 30 && !risingAt(g, here(g)) && !orderAt(g, here(g))?.mine && !V(g).hidden,
  run(g, rng) {
    const v = V(g), pl = here(g);
    const k = 4 + Math.round(stat(g, 'cha') / 12);
    v.anger[pl] = clamp(v.anger[pl] + k, 0, 100);
    gainStat(g, 'cha', 0.2);
    if (rng.chance(0.12 + (100 - stat(g, 'agi')) / 800)) { reportCrime(g, 'sedition', pl); return `주막에서 ${lordOf(pl)}의 곳간 이야기를 했다. 고개를 끄덕이는 사람이 많았다. 구석에서 술잔만 비우던 사내 하나가 먼저 일어나 나갔다. 다음 날 경비대가 내 이름을 묻고 다녔다.`; }
    if (v.anger[pl] >= 65 && check(rng, stat(g, 'cha') * 0.6 + (L(g).renown ?? 0) * 0.4, 35)) {
      const r = startRising(g, rng, pl, { leader: 'me', mine: 'leader' });
      v.tally.led += 1; v.tally.joined += 1;
      log(g, `${placeName(pl)}에서 봉기를 모의했다. 내가 우두머리다.`); note(g, `${placeName(pl)}에서 봉기를 모의했다.`);
      chron(g, `${g.player.name}, ${placeName(pl)}의 ${J(folkOf(pl), '을/를')} 모아 봉기를 꾀하다.`, 60);
      return `"언제요?" 누군가 물었다. 대답하는 순간 돌이킬 수 없다는 걸 알았다. "보름 뒤." 그날 밤 헛간에 ${r.str >= 50 ? '마흔' : '스무'} 명 남짓이 모였다.`;
    }
    return rng.pick([
      `장터에서 소금값 이야기를 꺼냈다. 이야기는 금세 ${lordOf(pl)}의 새 마차 이야기로 넘어갔다. 사람들의 목소리가 조금씩 커졌다.`,
      '빨래터에서, 방앗간에서, 주막에서. 같은 말을 조금씩 다르게 했다. 사람들이 서로의 눈을 보기 시작했다.',
      `"작년에 굶어 죽은 집이 몇이오?" 아무도 대답하지 않았다. 대신 다들 ${lordOf(pl)}의 성 쪽을 보았다.`,
    ]);
  },
});

/* ---------- 행동: 곳간 털기 (봉기 중) ---------- */
ACTIONS.push({
  id: 'revolt_raid', name: '곳간과 세리를 친다', icon: 'torch',
  desc: '봉기한 사람들과 함께 영주의 곳간을 열고 세리를 쫓아낸다. 기세가 오르지만 다칠 수도 있다.',
  available: (g) => ready(g) && myRising(g)?.phase === 'up' && myRising(g).place === here(g),
  run(g, rng) {
    const v = V(g), r = myRising(g);
    v.tally.raids += 1;
    const ok = check(rng, stat(g, 'str') * 0.3 + stat(g, 'agi') * 0.2 + skill(g, 'sword') * 0.3 + (r.me === 'leader' ? stat(g, 'int') * 0.2 : 0) + r.str * 0.3, 45);
    stress(g, 4);
    if (ok) {
      r.str = clamp(r.str + 8, 0, 100);
      const n = 6 + Math.round(r.str / 10);
      g.player.money += n;
      gainStat(g, 'str', 0.2);
      return rng.pick([
        `곳간 문을 도끼로 부쉈다. 밀 자루가 쏟아졌다. 아이 업은 여자들이 앞치마에 곡식을 담아 갔다. 내 몫으로 은화 ${n}닢이 돌아왔다.`,
        `세리가 장부를 끌어안고 달아났다. 장부는 광장에서 탔다. 누군가 내 손에 은화 ${n}닢을 쥐여 주었다. "당신 몫이오."`,
      ]);
    }
    r.str = clamp(r.str - 5, 0, 100);
    g.player.fatigue = clamp((g.player.fatigue ?? 0) + 20, 0, 100); stress(g, 4);
    return `곳간 앞에 창병들이 기다리고 있었다. 셋이 쓰러졌다. 나도 어깨를 베였다. 사람들은 흩어졌다가 밤이 되어서야 다시 모였다.`;
  },
});

/* ---------- 행동: 영주 편에서 진압하기 ---------- */
ACTIONS.push({
  id: 'revolt_suppress', name: '봉기를 진압하러 나선다', icon: 'sword',
  desc: '영주의 군사와 함께 봉기를 누르러 간다. 녹봉과 공을 얻지만, 상대는 낫을 든 이웃이다.',
  available: (g) => ready(g) && !myRising(g) && !!risingAt(g, here(g)) && risingAt(g, here(g)).phase === 'up' && (isSoldier(g) || skill(g, 'sword') >= 25 || (g.court?.office ?? -1) >= 0),
  run(g, rng) {
    const v = V(g), r = risingAt(g, here(g));
    if (!r) return '봉기는 이미 끝나 있었다.';
    v.tally.suppressed += 1;
    r.loyal = (r.loyal ?? 0) + 1;
    const ok = check(rng, skill(g, 'sword') * 0.5 + stat(g, 'str') * 0.3 + (isSoldier(g) ? 10 : 0), 35);
    stress(g, 6);
    deed(g, 'kind', -2, null, r.place);
    if (!ok) { g.player.fatigue = clamp((g.player.fatigue ?? 0) + 25, 0, 100); stress(g, 4); r.str = clamp(r.str - 3, 0, 100); return '돌팔매가 투구를 때렸다. 정신을 차리니 들것 위였다. 그날 진압대는 마을 어귀에서 물러났다.'; }
    r.str = clamp(r.str - 12, 0, 100);
    const n = 10 + Math.round(skill(g, 'sword') / 10);
    g.player.money += n;
    L(g).renown = (L(g).renown ?? 0) + 1;
    // 아는 얼굴과 마주친다
    const known = g.people.filter((p) => alive(p) && (p.place ?? 'ern') === r.place && p.known && ageYears(p) >= 18 && ageYears(p) <= 60 && !(g.player.familyIds ?? []).includes(p.id));
    if (known.length && rng.chance(0.4)) { const p = rng.pick(known); p.affection = clamp((p.affection ?? 0) - 25, -100, 100); remember(g, p, '봉기를 누르러 온 군사들 사이에 있었다', -2, { tag: 'revolt' }); return `쇠스랑을 든 사람들 사이에 ${J(p.name, '이/가')} 있었다. 눈이 마주쳤다. ${J(p.name, '은/는')} 쇠스랑을 내리고 달아났다. 쫓지 않았다. 녹봉으로 은화 ${n}닢을 받았다.`; }
    return rng.pick([
      `방패를 맞대고 골목을 밀었다. 낫과 몽둥이는 창 앞에서 오래 버티지 못했다. 녹봉 은화 ${n}닢. 손을 씻어도 냄새가 남았다.`,
      `봉기한 무리가 다리 건너로 물러났다. 우리 쪽 대장이 웃으며 내 어깨를 쳤다. 은화 ${n}닢. 다리 밑으로 짚신 한 짝이 떠내려갔다.`,
    ]);
  },
});

/* ---------- 반란군 안의 일 ---------- */
defineScene('revolt_quarrel', {
  title: () => '갈라지는 목소리',
  text: (g, s) => { const r = V(g).risings.find((x) => x.id === s.rid); const p = byId(g, s.pid); return `${p?.name ?? '한 사람'}${J(p?.name ?? '한 사람', '이/가').slice(-1)} 탁자를 쳤다. "${lordOf(r?.place)}의 성까지 쳐들어가야 하오. 여기서 멈추면 다 매달려 죽소." 다른 쪽에서 늙은 대장장이가 고개를 저었다. "곳간을 열었으면 됐소. 이제 세금만 내려 달라고 하고 끝냅시다." ${r?.me === 'leader' ? '모두 우두머리인 나를 보았다.' : '두 패가 서로를 노려보았다. 나는 어느 쪽에 설 것인가.'}`; },
  choices: (g, s) => { const r = V(g).risings.find((x) => x.id === s.rid); if (!r || r.phase !== 'up' || !r.me || !ready(g)) return []; return [{ label: '성까지 쳐들어가자는 편에 선다', key: 'hard' }, { label: '요구만 내걸고 끝내자는 편에 선다', key: 'soft' }, { label: '양쪽을 달래 하나로 묶는다', key: 'unite' }]; },
  resolve(g, rng, s, key) {
    const r = V(g).risings.find((x) => x.id === s.rid);
    if (!r || r.phase !== 'up') return '다툼은 저절로 끝났다. 봉기도 같이 끝나 있었다.';
    r.quarrel = true;
    if (key === 'hard') { r.str = clamp(r.str + (r.str >= 50 ? 8 : -6), 0, 100); r.hard = true; return r.str >= 50 ? '"성으로!" 함성이 헛간 지붕을 흔들었다. 늙은 대장장이는 말없이 망치를 챙겨 따라왔다.' : '"성으로!" 외쳤지만 따라나선 사람은 반이었다. 나머지는 밤사이 집으로 돌아갔다.'; }
    if (key === 'soft') { r.soft = true; r.str = clamp(r.str - 4, 0, 100); return '요구를 적은 종이 한 장. 세금을 작년대로, 곳간의 밀은 굶는 집에 먼저. 젊은 축 몇은 침을 뱉고 떠났다.'; }
    if (check(rng, stat(g, 'cha') * 0.6 + (r.me === 'leader' ? 15 : 0), 45)) { r.str = clamp(r.str + 6, 0, 100); return '밤새 양쪽을 오갔다. 새벽에 둘이 같은 술잔을 들었다. 오래가지는 않겠지만, 오늘은 하나다.'; }
    r.str = clamp(r.str - 8, 0, 100);
    return '달래려다 양쪽에서 욕을 먹었다. 그날 밤 젊은 축이 따로 횃불을 들고 나갔다가 반이 돌아오지 못했다.';
  },
});
defineScene('revolt_betray', {
  title: () => '어둠 속의 제안',
  text: (g, s) => { const r = V(g).risings.find((x) => x.id === s.rid); if (s.who === 'me') return `${lordOf(r?.place)}의 집사가 보낸 사람이 골목에서 나를 붙잡았다. "우두머리 ${leaderName(g, r ?? {})}${J(leaderName(g, r ?? {}), '이/가').slice(-1)} 숨은 곳만 알려 주시오. 당신 이름은 명부에서 지우고, 은화 쉰 닢을 드리지."`; const p = byId(g, s.pid); return `${p?.name ?? '부관'}${J(p?.name ?? '부관', '이/가').slice(-1)} ${lordOf(r?.place)}의 사람과 밤마다 만난다는 말이 들어왔다. 내 목값이 얼마로 매겨졌는지 그가 알고 있다는 말도.`; },
  choices: (g, s) => {
    const r = V(g).risings.find((x) => x.id === s.rid);
    if (!r || r.phase !== 'up' || !r.me || !ready(g)) return [];
    if (s.who === 'me') return [{ label: '우두머리를 판다', key: 'sell' }, { label: '거절하고 동지들에게 알린다', key: 'refuse' }];
    if (!alive(byId(g, s.pid))) return [];
    return [{ label: '사람들 앞에서 캐묻는다', key: 'confront' }, { label: '모르는 척하고 거짓 계획을 흘린다', key: 'trick' }, { label: '용서하고 곁에 둔다', key: 'forgive' }];
  },
  resolve(g, rng, s, key) {
    const v = V(g), r = v.risings.find((x) => x.id === s.rid);
    if (!r || r.phase !== 'up') return '제안은 의미를 잃었다.';
    r.betray = true;
    if (key === 'sell') {
      g.player.money += 50; r.str = clamp(r.str - 30, 0, 100); r.me = null; v.tally.informed += 1;
      deed(g, 'loyal', -8, '동지를 팔았다더라', r.place);
      const lp = byId(g, r.leader); if (lp) { lp.affection = -60; if (rng.chance(0.6)) { lp.alive = false; lp.deathCause = '동지의 밀고로 붙잡혀 처형되었다'; } }
      log(g, `${placeName(r.place)} 봉기의 우두머리를 팔았다.`);
      return '은화 쉰 닢. 무게가 생각보다 가벼웠다. 그날 밤 방앗간이 포위되었다. 나는 창문을 닫았다.';
    }
    if (key === 'refuse') { r.str = clamp(r.str + 5, 0, 100); deed(g, 'loyal', 3, null, r.place); return '심부름꾼을 돌려보내고 바로 방앗간으로 갔다. 그날 밤 우두머리는 숨은 곳을 옮겼다. "당신 같은 사람이 있어서 다행이오."'; }
    const p = byId(g, s.pid);
    if (key === 'confront') {
      if (check(rng, stat(g, 'int') * 0.4 + stat(g, 'cha') * 0.4, 40)) { if (p) { p.affection = -50; p.place = 'leocast'; } r.str = clamp(r.str + 4, 0, 100); return `${J(p?.name ?? '부관', '은/는')} 처음엔 잡아뗐다. 품에서 집사의 인장이 찍힌 쪽지가 나오자 말이 없어졌다. 사람들이 그를 마을 밖으로 내쫓았다.`; }
      r.str = clamp(r.str - 10, 0, 100); return `증거가 없었다. ${J(p?.name ?? '부관', '은/는')} 오히려 나를 의심꾼이라 몰았다. 사람들이 두 패로 갈렸다.`;
    }
    if (key === 'trick') { r.str = clamp(r.str + 10, 0, 100); return '빈 곳간을 친다는 계획을 흘렸다. 그 밤 영주의 창병들이 빈 곳간을 지키는 동안, 우리는 세리청을 불태웠다.'; }
    if (rng.chance(0.5)) { if (p) remember(g, p, '배신을 알고도 용서해 주었다', 3, { tag: 'revolt' }); return `${J(p?.name ?? '부관', '을/를')} 불러 술을 따랐다. "아이들이 굶었겠지." 그는 울었다. 그 뒤로 누구보다 앞에서 싸웠다.`; }
    r.str = clamp(r.str - 15, 0, 100); return '용서는 통하지 않았다. 열흘 뒤 숨은 곳 하나가 털렸다. 그 자리에 있던 넷이 끌려갔다.';
  },
});
defineScene('revolt_parley', {
  title: () => '흰 깃발',
  text: (g, s) => { const r = V(g).risings.find((x) => x.id === s.rid); return `${lordOf(r?.place)}의 사자가 흰 깃발을 들고 왔다. "무기를 내려놓으면 올해 세금을 반으로 줄이고, 우두머리들의 죄는 묻지 않겠다." 사자는 웃고 있었다. ${r?.me === 'leader' ? '대답은 우두머리인 내가 해야 한다.' : '우두머리가 사람들의 뜻을 물었다.'}`; },
  choices: (g, s) => { const r = V(g).risings.find((x) => x.id === s.rid); if (!r || r.phase !== 'up' || !r.me || !ready(g)) return []; return [{ label: '받아들인다', key: 'accept' }, { label: '더 내놓으라고 버틴다', key: 'press' }, { label: '사자를 돌려보내고 싸운다', key: 'refuse' }]; },
  resolve(g, rng, s, key) {
    const v = V(g), r = v.risings.find((x) => x.id === s.rid);
    if (!r || r.phase !== 'up') return '사자는 대답을 듣지 못하고 돌아갔다.';
    r.parley = true;
    if (key === 'accept') {
      endRising(g, rng, r, 'deal');
      if (rng.chance(0.35)) { const meWas = r.me; r.me = null; if (meWas === 'leader') { V(g).hidden = { from: r.place, y: g.date.year, heat: 50, name: g.player.name }; reportCrime(g, 'rebellion', r.place); log(g, '협상 뒤 약속이 깨졌다. 숨어 살게 되었다.'); return '무기를 내려놓았다. 석 달은 조용했다. 넉 달째 되던 밤, 우두머리들의 집 문이 하나씩 두드려졌다. 나는 뒷문으로 빠져나왔다. 약속은 종이 위에만 있었다.'; } return '무기를 내려놓았다. 석 달 뒤 우두머리들이 한 명씩 사라졌다. 약속은 종이 위에만 있었다. 나는 이름 없는 가담자라 살아남았다.'; }
      r.me = null; deed(g, 'kind', 2, null, r.place);
      return '무기를 내려놓았다. 세금이 정말로 반이 되었다. 마을 사람들은 첫 수확을 거두고 오래 웃었다. 영주가 이 일을 잊을지는 모른다.';
    }
    if (key === 'press') {
      if (check(rng, stat(g, 'cha') * 0.4 + stat(g, 'int') * 0.3 + r.str * 0.4, 50)) { endRising(g, rng, r, 'deal'); r.me = null; g.player.money += 10; return '"세금을 작년의 반, 곳간의 밀은 그대로 우리 것, 그리고 세리 한 놈의 목." 사자가 이를 갈며 돌아갔다가, 사흘 뒤 도장 찍힌 종이를 들고 왔다.'; }
      r.str = clamp(r.str - 8, 0, 100); return '사자는 웃음을 거두고 돌아갔다. 다음 날 아침 영주의 군사가 강 건너에 진을 쳤다.';
    }
    r.str = clamp(r.str + 5, 0, 100);
    return '흰 깃발을 사자의 말 엉덩이에 꽂아 돌려보냈다. 함성이 일었다. 이제 물러설 데가 없다.';
  },
});

/* ---------- 끝: 꺾이거나 이기거나 ---------- */
defineScene('revolt_crushed', {
  title: () => '꺾인 날',
  text: (g, s) => `${lordOf(s.place)}의 기병이 마을로 들어왔다. 함께 싸우던 사람들이 밭고랑으로 흩어진다. ${s.role === 'leader' ? '우두머리의 얼굴은 모두가 안다. 내 얼굴이다.' : '내 이름이 명부에 있는지는 모른다.'}`,
  choices: (g, s) => (g.over || L(g).heirPending ? [] : [{ label: '숲으로 달아나 숨는다', key: 'flee' }, { label: '무기를 버리고 나선다', key: 'yield' }, { label: '끝까지 싸운다', key: 'stand' }]),
  resolve(g, rng, s, key) {
    const v = V(g);
    v.tally.crushed += 1;
    reportCrime(g, 'rebellion', s.place, { mult: s.role === 'leader' ? 1.5 : 1 });
    if (key === 'flee') {
      if (check(rng, stat(g, 'agi') * 0.6 + stat(g, 'sen') * 0.3, s.role === 'leader' ? 45 : 30)) {
        v.hidden = { from: s.place, y: g.date.year, heat: s.role === 'leader' ? 80 : 45, name: g.player.name };
        const to = Object.keys(PLACES[s.place]?.links ?? {}).filter((p) => p !== s.place)[0];
        if (to) { L(g).place = to; L(g).home = L(g).home === 'own' ? 'inn' : L(g).home; }
        log(g, `${placeName(s.place)}에서 달아나 숨어 살게 되었다.`); note(g, `봉기가 꺾이고 ${placeName(s.place)}에서 달아났다.`);
        return `밭고랑을 기고, 개울을 건너고, 사흘을 숲에서 잤다. ${to ? `${placeName(to)}에 닿았을 때 나는 이름을 버렸다.` : '살아남았다.'} 뒤에서 들리던 개 짖는 소리가 아직 꿈에 나온다.`;
      }
      key = 'caught';
    }
    if (key === 'stand') {
      if (check(rng, skill(g, 'sword') * 0.5 + stat(g, 'str') * 0.4, 55)) { v.hidden = { from: s.place, y: g.date.year, heat: 90, name: g.player.name }; L(g).renown = (L(g).renown ?? 0) + 3; log(g, '포위를 뚫고 살아 나왔다.'); return '창 두 자루를 부러뜨리고 포위를 뚫었다. 등 뒤에서 누군가 내 이름을 외쳤다. 노래가 될 것이다. 나는 그 노래를 숨어서 듣게 될 것이다.'; }
      if (rng.chance(0.5)) { L(g).pendingDeath = '봉기가 꺾이던 날 끝까지 싸우다 죽었다'; v.blood = { by: g.player.name, place: s.place, y: g.date.year, how: 'fell', seen: false }; return '창이 옆구리로 들어왔다. 밀밭이 기울었다. 하늘이 높았다. 끝까지 물러서지 않았다.'; }
      key = 'caught';
    }
    // 붙잡히거나 나선다
    if (s.role === 'leader' && key !== 'yield' || (s.role === 'leader' && rng.chance(0.6))) {
      queueScene(g, 'revolt_gallows', { place: s.place }, { first: true });
      return '밧줄이 손목을 파고들었다. 수레에 실려 성으로 갔다. 길가에 선 사람들은 고개를 숙였다. 몇은 몰래 손을 흔들었다.';
    }
    jail(g, s.role === 'leader' ? 24 : 8 + rng.int(0, 6));
    return key === 'yield' ? '낫을 땅에 내려놓고 두 손을 들었다. 개머리판이 등을 내리쳤다. 목숨은 붙었다.' : '붙잡혔다. 매를 맞고 감옥에 던져졌다. 우두머리들의 목이 매달리던 날, 창살 너머로 그 소리를 들었다.';
  },
});
defineScene('revolt_gallows', {
  title: () => '교수대',
  text: (g, s) => `${placeName(s.place)} 광장에 교수대가 섰다. ${lordOf(s.place)}의 서기가 내 죄를 읽는다. 반역, 곳간 약탈, 세리 습격. 광장을 메운 얼굴들 가운데 아는 얼굴이 많다.`,
  choices: (g) => (g.over || L(g).heirPending ? [] : [{ label: '마지막 말을 남긴다', key: 'words' }, { label: '목숨을 빈다', key: 'beg' }, { label: '밧줄이 풀린 틈을 노린다', key: 'escape' }]),
  resolve(g, rng, s, key) {
    const v = V(g);
    if (key === 'escape' && check(rng, stat(g, 'agi') * 0.6 + stat(g, 'sen') * 0.2, 60)) { v.hidden = { from: s.place, y: g.date.year, heat: 100, name: g.player.name }; L(g).renown = (L(g).renown ?? 0) + 5; const to = Object.keys(PLACES[s.place]?.links ?? {})[0]; if (to) L(g).place = to; log(g, '교수대에서 달아났다.'); chron(g, `${g.player.name}, ${placeName(s.place)}의 교수대에서 달아나다.`, 80); return '누군가 군중 속에서 돌을 던졌다. 사형집행인이 고개를 돌린 순간 몸을 던졌다. 사람들이 길을 열었다가 닫았다. 내 뒤로.'; }
    if (key === 'beg' && rng.chance(0.3)) { jail(g, 36); deed(g, 'brave', -4, '교수대 앞에서 목숨을 빌었다더라', s.place); return `${J(lordOf(s.place), '이/가')} 손을 들었다. "삼 년. 그리고 이 자의 비굴함을 모두 기억하라." 군중 속에서 누군가 침을 뱉었다.`; }
    L(g).pendingDeath = '봉기를 이끌다 교수대에서 처형되었다';
    v.blood = { by: g.player.name, place: s.place, y: g.date.year, how: 'hanged', seen: false };
    chron(g, `${g.player.name}, ${placeName(s.place)}에서 봉기를 이끈 죄로 처형되다.`, 90);
    if (key === 'words') { deed(g, 'brave', 6, '교수대 위에서도 고개를 숙이지 않았다더라', s.place); return `"곳간의 밀은 우리가 심은 것이다." 그 말이 끝나기 전에 발판이 빠졌다. 그해 가을 ${placeName(s.place)}의 아이들은 그 말을 노래로 불렀다.`; }
    return '빌었다. 아무도 듣지 않았다. 발판이 빠졌다.';
  },
});
defineScene('revolt_won', {
  title: () => '성문이 열리다',
  text: (g, s) => `${J(lordOf(s.place), '이/가')} 밤사이 마차를 타고 달아났다. 성문이 열렸다. ${s.role === 'leader' ? '사람들이 나를 영주관 대청으로 떠밀었다. 빈 의자가 하나 있다.' : '광장에 모인 사람들이 서로를 끌어안았다. 이제 누가 이 고을을 다스릴 것인가.'}`,
  choices: (g, s) => (!ready(g) ? [] : s.role === 'leader' ? [{ label: '고을 회의를 세우고 의자는 비워 둔다', key: 'council' }, { label: '의자에 앉는다', key: 'seat' }, { label: '일이 끝났으니 물러난다', key: 'step' }] : [{ label: '고을 회의에 들어간다', key: 'join' }, { label: '내 밭으로 돌아간다', key: 'home' }]),
  resolve(g, rng, s, key) {
    const v = V(g);
    const o = v.orders.find((x) => x.place === s.place && !x.ended);
    v.tally.won += 1;
    L(g).renown = (L(g).renown ?? 0) + (s.role === 'leader' ? 6 : 2);
    if (!o) return '기쁨은 오래가지 않았다. 다음 날부터 다들 제 살길을 찾았다.';
    if (key === 'council') { o.mine = true; o.rot = 0; deed(g, 'generous', 4, null, s.place); return '의자를 대청 구석으로 치웠다. 그 자리에 긴 탁자를 놓았다. 대장장이, 어부, 과부, 방앗간 주인. 첫 회의는 밤새 이어졌고 아무것도 정하지 못했다. 그래도 좋았다.'; }
    if (key === 'seat') { o.mine = true; o.rot = 25; g.player.money += 40; deed(g, 'generous', -2, null, s.place); return '의자에 앉았다. 생각보다 푹신했다. 영주의 금고에서 은화 마흔 닢을 꺼내 내 몫으로 챙겼다. 아무도 말리지 않았다. 아직은.'; }
    if (key === 'step') { o.mine = false; o.pid = o.pid ?? null; deed(g, 'honest', 4, '봉기를 이기고도 자리를 탐하지 않았다더라', s.place); L(g).renown += 2; return '"내 일은 문을 여는 것까지요." 칼을 대청 벽에 걸어 두고 나왔다. 몇 년 뒤 사람들은 그 칼 이야기를 나보다 더 크게 했다.'; }
    if (key === 'join') { o.member = true; return '고을 회의의 끝자리에 앉았다. 말 한마디가 영주의 명령만큼 무겁다는 것을 처음 알았다.'; }
    return '밭으로 돌아갔다. 세금이 줄었다. 그거면 됐다.';
  },
});

/* ---------- 새 질서가 썩는 일 ---------- */
const ROT_EV = {
  skim: (g, o) => `회의의 옛 동지 하나가 곳간 열쇠를 집에 가져가 쓰기 시작했다. 그 집 마당에 새 수레가 들어왔다. 사람들이 ${o.mine ? '내 눈치를' : '회의 쪽을'} 본다.`,
  tax: (g, o) => `${o.mine ? '회의 금고가 비었다.' : '고을 회의가 세금을 다시 올렸다.'} 성벽을 고치고 군사를 먹이려면 돈이 든다. 옛 영주가 하던 말과 똑같다.`,
  purge: (g, o) => `옛 영주의 집사였던 사람들을 모두 내쫓자는 말이 나왔다. 그 사람들의 아이들까지. ${o.mine ? '회의가 내 대답을 기다린다.' : ''}`.trim(),
};
defineScene('revolt_rot', {
  title: (g, s) => `${placeName(s.place)} 고을 회의`,
  text: (g, s) => { const o = orderAt(g, s.place); return o ? ROT_EV[s.ev](g, o) : '회의는 이미 흩어졌다.'; },
  choices: (g, s) => { const o = orderAt(g, s.place); if (!o || !ready(g) || here(g) !== s.place) return []; return [{ label: '뿌리째 바로잡는다', key: 'reform' }, { label: '눈감아 준다', key: 'ignore' }, { label: s.ev === 'purge' ? '모두 내쫓는다' : '본보기로 한 사람을 내친다', key: 'purge' }]; },
  resolve(g, rng, s, key) {
    const o = orderAt(g, s.place);
    if (!o) return '';
    if (key === 'reform') {
      const cost = o.mine ? 20 : 0;
      if (cost && !spend(g, cost)) { o.rot = clamp(o.rot + 5, 0, 100); return '바로잡으려 했지만 내 주머니에도 회의 금고에도 돈이 없었다.'; }
      if (check(rng, stat(g, 'cha') * 0.4 + stat(g, 'wil') * 0.4, 40)) { o.rot = clamp(o.rot - 20, 0, 100); deed(g, 'honest', 3, null, s.place); return '장부를 광장에 펴 놓고 한 줄씩 읽었다. 열쇠를 가져간 동지는 고개를 들지 못했다. 사람들이 오랜만에 회의를 믿었다.'; }
      o.rot = clamp(o.rot - 5, 0, 100); stress(g, 6); return '바로잡으려 할수록 옛 동지들이 등을 돌렸다. "우리가 누구 덕에 여기 앉았는데." 조금은 고쳤다. 조금만.';
    }
    if (key === 'ignore') { o.rot = clamp(o.rot + 12, 0, 100); if (o.mine) g.player.money += 8; return '못 본 척했다. 그달 내 몫으로 은화 몇 닢이 더 들어왔다. 받지 않을 수도 있었다.'; }
    o.rot = clamp(o.rot - 8, 0, 100);
    deed(g, 'kind', -3, s.ev === 'purge' ? '옛 집사들을 아이까지 내쫓았다더라' : null, s.place);
    L(g).notoriety = (L(g).notoriety ?? 0) + 1;
    return s.ev === 'purge' ? '옛 집사들의 집에 붉은 칠이 칠해졌다. 짐수레들이 성문을 나섰다. 수레 위의 아이 하나가 끝까지 나를 보았다.' : '한 사람을 광장에서 내쫓았다. 다들 조용해졌다. 무서워서 조용한 것과 믿어서 조용한 것은 다르다.';
  },
});

/* ---------- 숨어 사는 잔당 ---------- */
const HUNT_EV = {
  hunter: '주막에 낯선 사내가 들어와 내 쪽을 오래 보았다. 허리에 포승줄이 감겨 있다. 현상금 사냥꾼이다.',
  neighbor: '옆집 사람이 요즘 자꾸 내 이름을 묻는다. 진짜 이름을. 경비대 초소 앞에서 그를 봤다는 말도 들었다.',
  comrade: '옛 동지 하나가 밤에 찾아왔다. 얼굴에 화상 자국이 있다. "다시 일어날 때가 됐소. 사람들이 당신 이름을 기억하오."',
};
defineScene('revolt_hunted', {
  title: () => '숨은 이름',
  text: (g, s) => HUNT_EV[s.ev],
  choices: (g, s) => {
    if (!V(g).hidden || !ready(g)) return [];
    if (s.ev === 'hunter') return [{ label: '뒷문으로 빠져나가 고장을 옮긴다', key: 'move' }, { label: '먼저 덮친다', key: 'fight' }, canSpend(g, 25) ? { label: '은화로 입을 막는다', key: 'pay' } : null].filter(Boolean);
    if (s.ev === 'neighbor') return [{ label: '이웃에게 털어놓고 부탁한다', key: 'trust' }, { label: '짐을 싸서 떠난다', key: 'move' }];
    return [{ label: '다시 일어선다', key: 'rise' }, { label: '이제는 조용히 살겠다고 한다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const v = V(g), h = v.hidden;
    if (!h) return '';
    if (key === 'move') { const opts = PLACES_R.filter((p) => p !== here(g) && p !== h.from && realmOf(p) === realmOf(here(g))); const to = opts.length ? rng.pick(opts) : null; if (to) { L(g).place = to; L(g).home = ['own', 'family'].includes(L(g).home) ? 'inn' : L(g).home; } h.heat = clamp(h.heat - 10, 0, 100); stress(g, 5); return to ? `밤길을 걸어 ${placeName(to)}까지 갔다. 또 새 이름, 또 새 얼굴. 짐은 갈수록 가벼워진다.` : '떠나려 했지만 갈 곳이 없었다. 며칠 문을 걸어 잠그고 지냈다.'; }
    if (key === 'pay') { if (!spend(g, 25)) return '돈이 모자랐다.'; h.heat = clamp(h.heat - 15, 0, 100); return '은화를 탁자 위로 밀었다. 사내는 세어 보고 웃었다. "닮은 사람을 잘못 봤나 보군." 다음에 또 올 것이다.'; }
    if (key === 'fight') { if (check(rng, skill(g, 'sword') * 0.5 + stat(g, 'str') * 0.3, 45)) { h.heat = clamp(h.heat + 5, 0, 100); reportCrime(g, 'assault'); return '골목에서 먼저 덮쳤다. 사내는 포승줄을 버리고 달아났다. 내가 여기 있다는 건 이제 그가 안다.'; } jail(g, 6); h.heat = clamp(h.heat - 20, 0, 100); return '포승줄이 내 손목에 감겼다. 다행히 옛 일은 증거가 모자랐다. 다른 죄로 반년을 살았다.'; }
    if (key === 'trust') { if (rng.chance(0.6)) { h.heat = clamp(h.heat - 20, 0, 100); return '이웃은 오래 듣다가 말했다. "우리 형도 그때 거기 있었소." 그 뒤로 그 집 사람들이 내 앞을 막아 섰다.'; } h.heat = clamp(h.heat + 25, 0, 100); return '이웃은 고개를 끄덕였다. 사흘 뒤 경비대가 왔다. 겨우 담을 넘었다.'; }
    if (key === 'rise') {
      if ((v.anger[h.from] ?? 0) < 25) v.anger[h.from] = 40;
      v.anger[h.from] = clamp(v.anger[h.from] + 20, 0, 100);
      return `"아직은 아니오. 하지만 곧." 옛 동지가 웃으며 돌아갔다. ${placeName(h.from)}에서 다시 수군거리는 소리가 들려온다고 한다.`;
    }
    h.heat = clamp(h.heat - 5, 0, 100);
    return '"그날 죽은 사람들 몫까지 살아야지." 동지는 오래 나를 보다가 말없이 떠났다.';
  },
});

/* ---------- 선대가 반역자였다 ---------- */
defineScene('revolt_legacy', {
  title: () => '반역자의 자식',
  text: (g) => { const b = V(g).blood; return `${placeName(b?.place)} 장터에서 늙은이 하나가 나를 붙잡았다. "${b?.by ?? '그 사람'}의 핏줄이지? ${b?.how === 'hanged' ? '교수대 위에서도 고개를 안 숙이던' : '끝까지 물러서지 않던'} 사람." 옆에 있던 경비병이 나를 흘끔 보았다.`; },
  choices: (g) => (V(g).blood && ready(g) ? [{ label: '자랑스럽게 그렇다고 한다', key: 'proud' }, { label: '모르는 사람이라고 한다', key: 'deny' }] : []),
  resolve(g, rng, s, key) {
    const v = V(g), b = v.blood;
    if (!b) return '';
    b.seen = true;
    if (key === 'proud') { v.anger[b.place] = clamp((v.anger[b.place] ?? 0) + 10, 0, 100); L(g).renown = (L(g).renown ?? 0) + 2; const c = crimeState(g); c.heat[b.place] = clamp((c.heat[b.place] ?? 0) + 15, 0, 100); return `"그렇소." 늙은이가 내 손을 잡고 울었다. 경비병은 수첩에 무언가를 적었다. ${placeName(b.place)} 사람들은 나를 그 사람의 이름으로 불렀다.`; }
    return '"모르는 사람이오." 늙은이의 손이 풀렸다. 돌아서는데 등 뒤에서 혀 차는 소리가 들렸다.';
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const v = V(g);
  const r = ownRng(g, 7);
  const now = mi(g);
  const P = politicsState(g);
  // 1) 고장마다 분노가 쌓이고 식는다
  for (const pl of PLACES_R) {
    if (pl === myDomainPlace(g)) continue;
    let a = v.anger[pl] ?? 10;
    const realm = realmOf(pl);
    let cause = v.cause[pl];
    let calam = null;
    try { calam = calamityAt(g, pl); } catch { calam = null; }
    if (calam) { a += 3; cause = 'famine'; }
    if (warsOf(g, realm).length) { a += 0.9; if (!calam) cause = cause ?? 'war'; }
    if ((P.stab?.[realm] ?? 60) < 35) { a += 0.7; cause = cause ?? 'unrest'; }
    const o = orderAt(g, pl);
    if (o) { o.rot = clamp(o.rot + (o.mine ? 0.25 : 0.55), 0, 100); if (o.rot >= 50) { a += (o.rot - 45) / 40; cause = 'rot'; } }
    if (r.chance(0.009)) { a += 18 + r.int(0, 12); cause = 'tax'; if (pl === here(g)) news(g, `${J(lordOf(pl), '이/가')} 새 세금을 매겼다. ${placeName(pl)} 장터의 말소리가 낮아졌다.`, 60); }
    a -= a > 25 ? 0.6 : 0.2;
    v.anger[pl] = clamp(a, 0, 100);
    v.cause[pl] = v.anger[pl] < 15 ? null : cause;
    // 새 질서가 오래되면 저절로 무너지거나 굳는다
    if (o && (g.date.year - o.y >= 30 || (o.rot >= 85 && r.chance(0.02)))) { o.ended = true; log(g, `${placeName(pl)}의 고을 회의가 끝났다.`); news(g, `${placeName(pl)}의 고을 회의가 무너지고 다시 ${lordOf(pl)}의 사람이 들어앉았다.`, 60); }
    // 끓어 넘치면 봉기가 인다
    if (!risingAt(g, pl) && v.anger[pl] >= 60 && r.chance(0.06)) {
      const nr = startRising(g, r, pl);
      if (pl === here(g)) news(g, `${placeName(pl)}의 밤길에 사람들이 모인다는 소문이 돈다.`, 70);
      nr.called = false;
    }
  }
  // 2) 봉기가 저절로 흘러간다
  for (const x of v.risings) {
    if (x.phase !== 'brewing' && x.phase !== 'up') continue;
    x.months += 1;
    const force = LORDS[x.place]?.force ?? 50;
    if (x.phase === 'brewing') {
      if (x.months >= 2 || (x.me === 'leader' && x.months >= 1)) {
        if (x.str < 18) { endRising(g, r, x, 'faded'); continue; }
        x.phase = 'up'; x.months = 0;
        news(g, `${placeName(x.place)}의 ${J(folkOf(x.place), '이/가')} 들고일어났다. ${lordOf(x.place)}의 곳간이 불탔다고 한다.`, 85);
        chron(g, `${placeName(x.place)}에서 ${J(folkOf(x.place), '이/가')} ${lordOf(x.place)}에게 맞서 들고일어나다.`, 60);
        const realm = realmOf(x.place);
        if (P.stab?.[realm] != null) P.stab[realm] = clamp(P.stab[realm] - 3, 0, 100);
      }
      continue;
    }
    // 들고일어난 뒤: 영주의 군사와 겨룬다
    x.str = clamp(x.str + (r.next() - 0.5) * 8 - force / 60 + (v.anger[x.place] ?? 0) / 60 - (x.loyal ?? 0) * 0.5, 0, 100);
    const done = x.months >= 2 && (x.str <= 15 || x.str >= 85 || x.months >= 7);
    if (!done) continue;
    const win = x.str >= 85 || (x.months >= 7 && r.chance(clamp((x.str - force * 0.6) / 60, 0.05, 0.6)));
    const out = win ? 'won' : (r.chance(x.soft ? 0.4 : 0.15) ? 'deal' : 'crushed');
    const role = x.me;
    const pl = x.place;
    endRising(g, r, x, out);
    if (role && role !== 'loyal' && !g.over) {
      if (out === 'crushed') queueScene(g, 'revolt_crushed', { place: pl, role }, { first: true });
      else if (out === 'won') queueScene(g, 'revolt_won', { place: pl, role }, { first: true });
      else { L(g).renown = (L(g).renown ?? 0) + 1; note(g, `${placeName(pl)}의 봉기가 협상으로 끝났다.`); }
      x.me = null;
    }
  }
  v.risings = v.risings.filter((x) => x.phase === 'brewing' || x.phase === 'up' || now - x.start < 120);
  // 3) 숨어 사는 잔당은 천천히 잊힌다
  if (v.hidden) {
    v.hidden.heat = clamp(v.hidden.heat - (here(g) === v.hidden.from ? 0.2 : 0.9), 0, 100);
    if (v.hidden.heat <= 0) { log(g, '나를 찾는 사람이 더는 없다.'); note(g, '숨어 살던 날들이 끝났다. 아무도 나를 찾지 않는다.'); v.hidden = null; }
  }
  // 4) 장면
  if (!ready(g)) return;
  if (L(g).queue.some((x) => /^revolt_/.test(x.kind)) || L(g).queue.length > 2 || now - v.sceneAt < 3) return;
  const fire = (kind, data) => { v.sceneAt = now; queueScene(g, kind, data); };
  const pl = here(g);
  const br = risingAt(g, pl);
  if (br && br.phase === 'brewing' && !br.me && !br.called && br.leader !== 'me') { br.called = true; if (r.chance(0.7)) return fire('revolt_call', { rid: br.id }); }
  const mine = myRising(g);
  if (mine && mine.phase === 'up' && mine.place === pl) {
    if (!mine.quarrel && mine.months >= 1 && r.chance(0.3)) { const pool = g.people.filter((p) => alive(p) && (p.place ?? 'ern') === pl && ageYears(p) >= 18 && ageYears(p) <= 45); const p = pool.length ? r.pick(pool) : null; return fire('revolt_quarrel', { rid: mine.id, pid: p?.id ?? null }); }
    if (!mine.betray && r.chance(0.2)) { if (mine.me === 'member') return fire('revolt_betray', { rid: mine.id, who: 'me' }); const p = byId(g, mine.second); if (alive(p)) return fire('revolt_betray', { rid: mine.id, who: 'second', pid: p.id }); mine.betray = true; }
    if (!mine.parley && mine.months >= 2 && r.chance(0.25)) return fire('revolt_parley', { rid: mine.id });
  }
  if (v.hidden && r.chance(0.035 + v.hidden.heat / 2500)) return fire('revolt_hunted', { ev: v.hidden.heat >= 40 ? r.pick(['hunter', 'hunter', 'neighbor', 'comrade']) : r.pick(['neighbor', 'comrade']) });
  const o = orderAt(g, pl);
  if (o && (o.mine || o.member) && o.rot >= 15 && r.chance(0.06)) return fire('revolt_rot', { place: pl, ev: r.pick(['skim', 'tax', 'purge']) });
  if (v.blood && !v.blood.seen && v.blood.by !== g.player.name && pl === v.blood.place && r.chance(0.1)) return fire('revolt_legacy', {});
});

/* ---------- 새 질서의 녹봉: 회의를 맡은 동안 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const o = V(g).orders.find((x) => x.mine && !x.ended);
  if (o && here(g) === o.place && g.date.month % 3 === 0) g.player.money += 3 + Math.round(o.rot / 10);
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const v = V(g);
  const by = old?.name ?? '선대';
  for (const x of v.risings) if (x.me) { if (x.leader === 'me') { x.leader = null; } x.me = null; }
  for (const o of v.orders) if (o.mine) { o.mine = false; o.by = by; log(g, `${by}${J(by, '이/가').slice(-1)} 세운 ${placeName(o.place)}의 고을 회의는 이제 다른 사람들 손에 있다.`); }
  if (v.hidden) { log(g, `${by}${J(by, '은/는').slice(-1)} 끝내 숨은 이름으로 죽었다.`); v.hidden = null; }
  if (v.blood && v.blood.by === by) log(g, `${by}${J(by, '은/는').slice(-1)} 반역자로 죽었다. ${placeName(v.blood.place)} 사람들은 그 이름을 기억한다.`);
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
