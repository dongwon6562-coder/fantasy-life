// 28단계: 사절과 볼모. 상태는 g.envoy 하나, 화면 연결점은 envoyInfo(g).
// - 말(tongues): 나라마다 궁정에서 쓰는 말이 다르다. 내 나라 말은 타고나고, 다른 말은 그 나라에 살거나 배워야 는다.
// - 사절 자리(post): 내 나라 도읍의 외교청에 들어가 서기 → 통역 → 사절 → 사절단장으로 오른다(envoy_join/envoy_mission/envoy_resign).
//   협상(envoy_talks)은 휴전·국경·통상·혼인 넷. 이끄는 자리면 밀어붙이기/양보/뒷돈/박차고 나오기, 따라가는 자리면 서류·통역·배신.
//   잘되면 politics의 강화·조약이 실제로 맺어지고, 국경 협상이 크게 틀어지면 전쟁이 난다(내 협상이 전쟁을 막거나 부른다).
//   외교 사고(envoy_incident): 모욕, 사절단 안의 첩자, 사절 살해.
// - 볼모(hostage): 몰락 기사 집안이나 궁정 가까운 집 아이는 열한두 살에 다른 나라 궁정으로 보내질 수 있다.
//   열여섯이 되면 돌아가거나 남는다. 돌아온 뒤에도 두 나라 사이에 낀 삶(between)이 남는다.
//   사절단장이 조약을 맺으면 상대가 내 자식을 볼모로 달라고 하기도 한다(pledged). 볼모였던 자식이 대를 이으면 그 삶에서 시작한다.
// - 플레이어 없이도: 해마다 두 번 나라 사이에 사절이 오가고, 가끔 사고가 난다(대륙 소식).
// politics(관계·조약·전쟁)·realms(국적)·court(궁정 체면)·spy(첩자 조직)는 읽고 미는 것만 한다. 행동은 뜻 있는 형편에서만 보인다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainSkill, gainStat } from '../game.js';
import { PLACES } from '../places.js';
import { byId, ageYears } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, spend, canSpend, check, traveling, tired } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { isJailed, reportCrime, CRIMES } from '../crime.js';
import { deed } from '../repute/index.js';
import { remember } from '../relations.js';
import { courtState } from '../court/index.js';
import { REALMS } from '../realms/data.js';
import { realmState, realmOf } from '../realms/index.js';
import { relOf, shiftRel, pactOf, addPact, warOf, nations, short, full, pnews } from '../politics/state.js';
import { peace, declareWar } from '../politics/world.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 131) ^ Math.imul(mi(g) * 101 + salt + 79, 2654435761)) | 0 });
const stat = (g, id) => g.player.stats?.[id] ?? 0;
const skill = (g, id) => g.player.skills?.[id] ?? 0;
const alive = (g) => !g.over && !!g.player && !L(g).heirPending;
const base = (g) => playerAge(g) >= 16 && alive(g);
const free = (g) => !traveling(g) && !isJailed(g) && !g.bondage?.slave && !g.army?.campaign && !g.army?.captive;
const ready = (g) => base(g) && free(g);
const jo = (w, pair) => J(w, pair).slice(String(w).length);
const say = (g) => (text, big = false) => { (g.worldNews ??= []).push(text); pnews(g, text); if (big) g.realm?.log?.push({ y: g.date.year, m: g.date.month, text: text.split('.')[0] }); };
const record = (g) => (text) => g.realm?.log?.push({ y: g.date.year, m: g.date.month, text });

/* ---------- 말 ---------- */
export const TONGUES = {
  common: '대륙 공용어', imperial: '제국어', elvish: '엘프 말', dwarvish: '드워프 말', tribal: '부족 말',
};
const TONGUE = { leonia: 'common', march: 'common', free: 'common', holy: 'common', serenia: 'common', valhart: 'imperial', elf: 'elvish', dwarf: 'dwarvish', beast: 'tribal' };
const tongueOf = (realm) => TONGUE[realm] ?? 'common';
const tongueWord = (v) => (v >= 80 ? '그 나라 사람처럼' : v >= 55 ? '궁정 말까지' : v >= 30 ? '장터 말은 통한다' : v >= 10 ? '인사말 몇 마디' : '모른다');
const citizen = (g) => realmState(g).citizen ?? 'leonia';
const nativeTongue = (g) => tongueOf(citizen(g));
export function tongueLvl(g, realm) {
  const t = tongueOf(realm);
  if (t === nativeTongue(g)) return 100;
  return V(g).tongues[t] ?? 0;
}
function learn(g, t, n) {
  if (t === nativeTongue(g)) return;
  const v = V(g);
  v.tongues[t] = clamp((v.tongues[t] ?? 0) + n, 0, 100);
}
const capitalOf = (realm) => (REALMS[realm]?.capital && PLACES[REALMS[realm].capital] ? REALMS[realm].capital : null);
const realms = () => nations().filter((id) => capitalOf(id));

/* ---------- 자리 ---------- */
export const ROLES = ['clerk', 'interpreter', 'envoy', 'head'];
const ROLE_NAME = { clerk: '외교청 서기', interpreter: '사절단 통역', envoy: '사절', head: '사절단장' };
const leads = (post) => post && (post.role === 'envoy' || post.role === 'head');
const KIND_NAME = { truce: '휴전', border: '국경', trade: '통상', marriage: '혼인' };

/* ---------- 상태 ---------- */
export function envoyState(g) {
  g.envoy ??= {};
  const v = g.envoy;
  v.tongues ??= {};
  v.post ??= null;          // { realm, role, since, missions, wins, fails, lastAt }
  v.joinAt ??= -99;
  v.tongueAt ??= -99;
  v.talks ??= { n: 0, wins: 0, peaces: 0, wars: 0, pacts: 0 };
  v.hostage ??= null;       // { from, to, at, home, since, until, ties, friend, warSeen }
  v.between ??= null;       // { host, ties, since }
  v.pledged ??= [];         // [{ id, name, to, since, until, warSeen }]
  v.past ??= [];            // 지난 대의 자리 [{ y, text }]
  v.world ??= { n: 0, incidents: 0, at: 0 };
  v.sceneAt ??= 0;
  v.log ??= [];
  return v;
}
const V = envoyState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }

function carry(g, place) {
  L(g).place = place; L(g).travel = null;
  const R = realmState(g);
  R.cur = realmOf(place); R.last = place;
  L(g).queue = L(g).queue.filter((x) => x.kind !== 'border');
}

// 협상 상대 고르기: 전쟁 중인 나라 → 사이가 가장 나쁜 나라 → 조약이 없는 나라
function pickTarget(g, rng, home) {
  const others = realms().filter((x) => x !== home);
  const war = others.filter((x) => { const w = warOf(g, home, x); return w && !w.world; });
  if (war.length) return rng.pick(war);
  const bad = others.filter((x) => relOf(g, home, x) <= -30 && !warOf(g, home, x));
  if (bad.length && rng.chance(0.6)) return bad.sort((a, b) => relOf(g, home, a) - relOf(g, home, b))[0];
  const calm = others.filter((x) => !warOf(g, home, x));
  return calm.length ? rng.pick(calm) : null;
}
function pickKind(g, rng, home, to) {
  const w = warOf(g, home, to);
  if (w && !w.world) return 'truce';
  const r = relOf(g, home, to);
  if (r <= -30) return 'border';
  if (r >= 30 && !pactOf(g, home, to, 'marriage') && rng.chance(0.5)) return 'marriage';
  if (!pactOf(g, home, to, 'trade')) return 'trade';
  return rng.pick(['border', 'trade']);
}

export function envoyInfo(g) {
  const v = V(g);
  const tongues = Object.entries(v.tongues).filter(([t, n]) => n >= 1 && TONGUES[t]).map(([t, n]) => ({ id: t, name: TONGUES[t], lvl: Math.round(n), word: tongueWord(n) }));
  if (!tongues.length && !v.post && !v.hostage && !v.between && !v.pledged.length && !v.talks.n) return null;
  const p = v.post;
  return {
    native: TONGUES[nativeTongue(g)],
    tongues,
    post: p ? { realm: full(p.realm), role: p.role, roleName: ROLE_NAME[p.role], years: Math.max(0, Math.floor((mi(g) - p.since) / 12)), missions: p.missions, wins: p.wins } : null,
    talks: { ...v.talks },
    hostage: v.hostage ? { from: full(v.hostage.from), to: full(v.hostage.to), years: Math.max(0, Math.floor((mi(g) - v.hostage.since) / 12)), ties: Math.round(v.hostage.ties), backIn: Math.max(0, Math.ceil((v.hostage.until - mi(g)) / 12)), friend: v.hostage.friend } : null,
    between: v.between ? { host: full(v.between.host), ties: Math.round(v.between.ties), word: v.between.ties >= 60 ? '반쯤은 그 나라 사람' : v.between.ties >= 30 ? '그 나라에 정이 남았다' : '먼 기억' } : null,
    pledged: v.pledged.map((k) => ({ name: k.name, realm: full(k.to), backIn: Math.max(0, Math.ceil((k.until - mi(g)) / 12)) })),
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}
export function envoyLine(g) {
  const v = V(g);
  if (v.hostage) return `${full(v.hostage.to)} 궁정의 볼모`;
  if (v.post) return `${full(v.post.realm)} ${ROLE_NAME[v.post.role]}`;
  if (v.between) return `${short(v.between.host)}에서 볼모로 자람`;
  return null;
}

/* ---------- 말 배우기 ---------- */
// 다른 말을 쓰는 나라에 살거나, 사절 자리에 있을 때만 보인다
function studyTongue(g) {
  const v = V(g);
  const local = tongueOf(realmOf(here(g)));
  if (local !== nativeTongue(g) && (v.tongues[local] ?? 0) < 80) return local;
  if (!v.post) return null;
  const want = Object.keys(TONGUES).filter((t) => t !== nativeTongue(g) && (v.tongues[t] ?? 0) < 60);
  return want.sort((a, b) => (v.tongues[b] ?? 0) - (v.tongues[a] ?? 0))[0] ?? null;
}
ACTIONS.push({
  id: 'envoy_tongue', name: '다른 나라 말을 익힌다', icon: 'book',
  desc: '말을 아는 사람에게 배우거나, 시장에서 귀를 연다. 궁정 말은 장터 말과 또 다르다.',
  available: (g) => playerAge(g) >= 12 && alive(g) && free(g) && !!studyTongue(g) && mi(g) - V(g).tongueAt >= 2,
  run(g, rng) {
    const t = studyTongue(g);
    const v = V(g);
    v.tongueAt = mi(g);
    tired(g, 5);
    const before = v.tongues[t] ?? 0;
    learn(g, t, 3 + stat(g, 'int') * 0.06 + skill(g, 'letters') * 0.04 + rng.next() * 2);
    gainSkill(g, 'letters', 0.3, 'int');
    const now = v.tongues[t];
    if (before < 30 && now >= 30) return `${TONGUES[t]}로 흥정을 끝까지 해냈다. 상인이 내 말씨를 고쳐 주지 않은 첫날이었다.`;
    if (before < 55 && now >= 55) return `${TONGUES[t]}로 쓴 공문을 사전 없이 읽었다. 거기 적힌 존댓말의 층이 일곱 개라는 것도 알았다.`;
    return rng.pick([
      `${TONGUES[t]}의 동사 끝을 외웠다. 같은 말이 높이는 말도 되고 꾸짖는 말도 된다.`,
      `${TONGUES[t]}를 쓰는 늙은 짐꾼에게 술을 사고 하룻저녁 떠들었다. 반은 알아들었다.`,
      `${TONGUES[t]}로 된 노래를 따라 불렀다. 뜻은 모르고 소리만 맞혔다. 그래도 귀가 열린다.`,
    ]);
  },
});

/* ---------- 외교청 ---------- */
const canJoin = (g) => {
  const v = V(g);
  const foreign = Object.entries(v.tongues).some(([t, n]) => t !== nativeTongue(g) && n >= 40);
  const standing = citizen(g) === 'leonia' ? courtState(g).standing : 0;
  return skill(g, 'letters') >= 25 || foreign || standing >= 20 || !!v.between;
};
ACTIONS.push({
  id: 'envoy_join', name: '외교청 문을 두드린다', icon: 'crown',
  desc: '도읍의 외교청은 늘 글 잘 쓰고 다른 나라 말 아는 사람이 모자라다. 사절단 말석부터 시작한다.',
  available: (g) => ready(g) && playerAge(g) >= 18 && !V(g).post && here(g) === capitalOf(citizen(g)) && mi(g) - V(g).joinAt >= 12 && canJoin(g),
  run(g, rng) {
    const v = V(g);
    v.joinAt = mi(g);
    const home = citizen(g);
    const foreign = Math.max(0, ...Object.entries(v.tongues).filter(([t]) => t !== nativeTongue(g)).map(([, n]) => n));
    const val = skill(g, 'letters') * 0.5 + stat(g, 'cha') * 0.3 + foreign * 0.4 + (v.between ? 15 : 0) + (citizen(g) === 'leonia' ? courtState(g).standing * 0.3 : 0);
    if (!check(rng, val, 40)) return `외교청 서기장은 내 글씨를 한참 보더니 고개를 저었다. "말 하나 더 배워 오시오. 여기서는 자기 나라 말만 하는 사람은 짐이오."`;
    const role = foreign >= 40 || v.between ? 'interpreter' : 'clerk';
    v.post = { realm: home, role, since: mi(g), missions: 0, wins: 0, fails: 0, lastAt: mi(g) - 2 };
    log(g, `${full(home)} 외교청에 ${ROLE_NAME[role]}${jo(ROLE_NAME[role], '으로/로')} 들어갔다.`);
    note(g, `${full(home)} 외교청에 ${ROLE_NAME[role]}${jo(ROLE_NAME[role], '으로/로')} 들어갔다.`);
    return role === 'interpreter'
      ? `서기장이 다른 나라 말로 몇 마디를 던졌다. 같은 말로 받았다. 그는 펜을 내려놓았다. "다음 사절단에 끼시오. 통역이 하나 모자랐소."`
      : '책상 하나와 잉크병 하나를 받았다. 첫 일은 이웃 나라 왕에게 보낼 생일 축하 편지를 백 번 고쳐 쓰는 것이었다. 한 글자가 전쟁이 될 수 있다고 서기장이 말했다.';
  },
});
ACTIONS.push({
  id: 'envoy_mission', name: '사절단에 끼어 떠난다', icon: 'road',
  desc: '외교청이 다른 나라에 보낼 사절단을 꾸린다. 자리에 따라 이끌기도 하고, 서류를 들고 따라가기도 한다.',
  available: (g) => ready(g) && !!V(g).post && here(g) === capitalOf(V(g).post.realm) && mi(g) - V(g).post.lastAt >= 3 && !sceneQueued(g, 'envoy_talks') && !!pickTarget(g, ownRng(g, 3), V(g).post.realm),
  run(g, rng) {
    const p = V(g).post;
    p.lastAt = mi(g);
    const to = pickTarget(g, rng, p.realm);
    const kind = pickKind(g, rng, p.realm, to);
    tired(g, 12);
    queueScene(g, 'envoy_talks', { to, talk: kind }, { first: true });
    if (rng.chance(0.25)) queueScene(g, 'envoy_incident', { to, ev: relOf(g, p.realm, to) < -20 && rng.chance(0.35) ? 'murder' : rng.pick(['insult', 'spy']) });
    return `${full(to)}${jo(full(to), '으로/로')} 가는 사절단이 꾸려졌다. ${KIND_NAME[kind]} 이야기를 가지고 간다. 짐수레 셋, 선물 상자 여섯, 그리고 서로 믿지 않는 사람들.`;
  },
});
ACTIONS.push({
  id: 'envoy_resign', name: '외교청을 떠난다', icon: 'door',
  desc: '사절 자리를 내려놓는다.',
  available: (g) => base(g) && !!V(g).post && !sceneQueued(g, 'envoy_talks'),
  run(g) {
    const v = V(g), p = v.post;
    v.past.push({ y: g.date.year, text: `${g.player.name}, ${full(p.realm)} ${ROLE_NAME[p.role]} (사절 ${p.missions}번, 이룬 일 ${p.wins}번)` });
    if (v.past.length > 8) v.past.shift();
    log(g, `${ROLE_NAME[p.role]} 자리를 내려놓았다.`);
    v.post = null;
    return '외교청 인장을 반납했다. 서랍에 남은 건 다른 나라 말로 쓴 초안 몇 장이었다. 버리지 못하고 챙겨 나왔다.';
  },
});

/* ---------- 협상 ---------- */
function talkPower(g, s) {
  const p = V(g).post;
  return stat(g, 'cha') * 0.4 + skill(g, 'letters') * 0.3 + tongueLvl(g, s.to) * 0.3 + (p.role === 'head' ? 10 : 0) + Math.min(10, p.wins * 2);
}
function talkDiff(g, s) {
  const home = V(g).post.realm, r = relOf(g, home, s.to);
  if (s.talk === 'truce') { const w = warOf(g, home, s.to); const edge = w ? (w.a === s.to ? w.score : -w.score) : 0; return 48 + edge * 1.2 - Math.min(15, (w?.weary ?? 0) / 2); }
  if (s.talk === 'border') return 55 - r / 4;
  if (s.talk === 'marriage') return 52 - r / 5;
  return 42 - r / 5;
}
const talkOk = (g, s) => ready(g) && !!V(g).post && !!REALMS[s.to] && s.to !== V(g).post.realm;

defineScene('envoy_talks', {
  title: (g, s) => `${full(s.to)} 궁정의 ${KIND_NAME[s.talk]} 협상`,
  text: (g, s) => {
    const p = V(g).post, home = p.realm;
    const lead = leads(p);
    const lang = tongueLvl(g, s.to);
    const ear = lang >= 55 ? '저쪽 대신들이 자기들끼리 하는 말이 다 들렸다.' : lang >= 30 ? '저쪽 말은 반쯤 알아들었다. 나머지 반이 늘 중요했다.' : '저쪽 말은 하나도 모른다. 통역의 입만 바라보았다.';
    const what = { truce: `두 나라는 아직 싸우는 중이다. 탁자 위에 놓인 지도에는 양쪽이 서로 다른 선을 그어 두었다.`, border: `${J(short(s.to), '과/와')} ${short(home)} 사이의 국경 마을 셋을 두고 서로 자기 땅이라 한다. 사이는 ${relOf(g, home, s.to) <= -55 ? '칼끝에 서 있다' : '날이 서 있다'}.`, trade: '통상 조약 초안에는 소금, 쇠, 포도주 관세가 줄줄이 적혀 있다. 숫자 하나에 상단 몇이 망하고 흥한다.', marriage: `${short(home)} 왕가와 ${short(s.to)} 왕가 사이에 혼담이 오간다. 신부와 신랑은 서로 얼굴도 모른다.` }[s.talk];
    return `${what} ${ear} ${lead ? '이번 사절단은 내가 이끈다.' : `사절단장은 ${p.role === 'clerk' ? '내 이름도 모르는' : '나만 믿는'} 늙은 귀족이다.`}`;
  },
  choices: (g, s) => {
    if (!talkOk(g, s)) return [];
    const p = V(g).post;
    if (leads(p)) return [
      { key: 'firm', label: '물러서지 않는다', hint: '잘되면 크게 얻고, 틀어지면 크게 잃는다' },
      { key: 'yield', label: '하나를 내주고 하나를 얻는다', hint: '맺기는 쉽다. 고향에서는 욕을 먹는다' },
      ...(canSpend(g, 40) ? [{ key: 'bribe', label: '저쪽 대신에게 주머니를 건넨다', hint: '은화 마흔 닢' }] : []),
      { key: 'walk', label: '자리를 박차고 나온다', hint: '협상은 깨진다' },
    ];
    return [
      { key: 'work', label: '밤새 초안을 고친다', hint: '단장의 힘이 된다' },
      ...(p.role === 'interpreter' ? [{ key: 'catch', label: '저쪽 통역의 말 비틀기를 잡아낸다', hint: '말을 알아야 한다' }] : []),
      { key: 'sell', label: '우리 쪽 속셈을 저쪽에 판다', hint: '은화가 생긴다. 들키면 반역이다' },
      { key: 'quiet', label: '시킨 일만 한다', hint: '' },
    ];
  },
  resolve(g, rng, s, k) {
    if (!talkOk(g, s)) return '협상은 열리지도 못했다.';
    const v = V(g), p = v.post, home = p.realm;
    p.missions += 1; v.talks.n += 1;
    gainSkill(g, 'letters', 0.6, 'cha'); gainStat(g, 'cha', 0.3);
    learn(g, tongueOf(s.to), 2);
    if (k === 'walk') { shiftRel(g, home, s.to, -8); p.fails += 1; stress(g, 4); return `탁자를 밀고 일어섰다. ${short(s.to)} 대신들의 얼굴이 굳었다. 돌아오는 길에 단원 하나가 "속은 시원하더이다"라고 했다. 외교청은 시원해하지 않았다.`; }
    if (k === 'sell') {
      g.player.money += 35;
      if (rng.chance(0.3 + (CRIMES.espionage ? 0 : -0.3))) { reportCrime(g, 'espionage', here(g), { mult: 0.5 }); v.post = null; log(g, '사절단의 속셈을 판 일이 드러나 외교청에서 쫓겨났다.'); stress(g, 15); return `${short(s.to)} 쪽 서기가 은화를 세다가 들켰다. 그 입에서 내 이름이 나왔다. 외교청 문은 그날로 닫혔고, 경비대가 집 앞을 오갔다.`; }
      shiftRel(g, home, s.to, -3);
      return `저녁에 ${short(s.to)} 쪽 서기와 술을 마셨다. 우리 단장이 어디까지 물러설 수 있는지 말해 주었다. 은화 서른다섯 닢. 이튿날 협상은 저쪽 뜻대로 흘렀다. 아무도 까닭을 몰랐다.`;
    }
    let power, diff = talkDiff(g, s);
    if (leads(p)) {
      power = talkPower(g, s);
      if (k === 'firm') diff += 8;
      if (k === 'yield') diff -= 12;
      if (k === 'bribe') { spend(g, 40); diff -= 15; }
    } else {
      power = 45 + (k === 'work' ? 6 + skill(g, 'letters') * 0.1 : 0) + (k === 'catch' ? tongueLvl(g, s.to) * 0.25 : 0);
      if (k === 'work') tired(g, 6);
    }
    const ok = check(rng, power, diff);
    const pay = 10 + ROLES.indexOf(p.role) * 10;
    if (ok) {
      p.wins += 1; v.talks.wins += 1; g.player.money += pay;
      L(g).renown = (L(g).renown ?? 0) + (leads(p) ? 4 : 1);
      const out = settle(g, rng, s, home, k);
      const up = promote(g);
      if (leads(p) && p.role === 'head' && ['truce', 'marriage'].includes(s.talk) && rng.chance(0.35) && kidsFor(g).length) queueScene(g, 'envoy_pledge', { to: s.to });
      if (k === 'yield') deed(g, 'brave', -2, `${short(s.to)}에 너무 많이 내주었다는 말이 돈다`);
      return out + (up ? ` ${up}` : '');
    }
    p.fails += 1;
    shiftRel(g, home, s.to, -5);
    stress(g, 6);
    // 국경 협상이 크게 틀어지면 전쟁이 난다 (레오니아-발하르트는 따로 굴러가므로 뺀다)
    const pair = [home, s.to].sort().join('|');
    if (s.talk === 'border' && relOf(g, home, s.to) <= -55 && pair !== 'leonia|valhart' && !warOf(g, home, s.to) && rng.chance(k === 'firm' ? 0.35 : 0.12)) {
      declareWar(g, rng, say(g), record(g), s.to, home, `${full(home)} 사절단이 국경 협상 자리를 깨고 나간 지 한 달 만이었다`);
      v.talks.wars += 1;
      chron(g, `${g.player.name}${jo(g.player.name, '이/가')} 이끈 국경 협상이 깨지고, ${J(short(s.to), '과/와')} ${short(home)} 사이에 전쟁이 났다.`);
      log(g, `${short(s.to)}${jo(short(s.to), '과/와')}의 국경 협상이 깨지고 전쟁이 났다.`);
      stress(g, 10);
      return `마지막 날, ${short(s.to)}의 재상이 지도를 반으로 찢었다. 아무도 그것을 말리지 않았다. 국경으로 돌아가는 길에 이미 군대가 마주 오고 있었다. 외교청에서는 아무도 내 눈을 보지 않았다.`;
    }
    return rng.pick([
      `사흘을 앉아 있었지만 한 줄도 합의하지 못했다. 마지막 만찬에서 ${short(s.to)} 대신이 건배를 하지 않았다. 그게 대답이었다.`,
      `초안은 서른 번 고쳐졌고, 서른 번 돌아왔다. 빈손으로 돌아오는 길에 단장은 한마디도 하지 않았다.`,
    ]);
  },
});
function settle(g, rng, s, home, k) {
  const v = V(g);
  const big = k === 'firm';
  if (s.talk === 'truce') {
    const w = warOf(g, home, s.to);
    if (w && !w.world) {
      const lead = w.score >= 0 ? w.a : w.b;
      peace(g, rng, say(g), record(g), w, lead, lead === w.a ? w.b : w.a, `${g.player.name}${jo(g.player.name, '이/가')} 오간 끝에`);
      v.talks.peaces += 1;
      chron(g, `${g.player.name}, ${J(short(home), '과/와')} ${short(s.to)} 사이의 강화를 이끌어 내다.`);
      log(g, `${short(s.to)}${jo(short(s.to), '과/와')}의 전쟁을 협상으로 끝냈다.`);
      return `밤마다 두 궁정의 문서를 고쳐 쓰고, 낮에는 장군들의 고함을 들었다. 마침내 양쪽이 같은 종이에 인장을 찍었다. 국경 마을에서 종이 울렸다는 소식이 먼저 와 있었다.`;
    }
    shiftRel(g, home, s.to, 6);
    return '도착해 보니 싸움은 이미 시들해져 있었다. 서로 체면을 세울 문장 하나를 찾아 주고 돌아왔다.';
  }
  if (s.talk === 'border') {
    shiftRel(g, home, s.to, big ? 14 : 9);
    addPact(g, home, s.to, 'truce', 60);
    log(g, `${short(s.to)}${jo(short(s.to), '과/와')}의 국경 다툼을 협상으로 묶었다.`);
    return big ? `국경 마을 셋 가운데 둘을 지켜 냈다. ${short(s.to)} 재상은 이를 갈았지만 인장을 찍었다. 다섯 해 동안 그 선 위에서 칼을 뽑지 않기로 했다.` : '마을 셋을 반씩 나누는 선을 그었다. 양쪽 다 불만이었다. 그래서 오래갈 선이었다.';
  }
  if (s.talk === 'trade') {
    const added = addPact(g, home, s.to, 'trade');
    shiftRel(g, home, s.to, big ? 8 : 5);
    if (added) { v.talks.pacts += 1; log(g, `${short(s.to)}${jo(short(s.to), '과/와')} 통상 조약을 맺었다.`); }
    return added ? `통상 조약에 인장이 찍혔다. 관세표의 숫자 하나하나에 내가 잠 못 이룬 밤이 들어 있다. 다음 장날부터 ${short(s.to)}의 짐수레가 국경을 넘을 것이다.` : '이미 있던 조약의 관세를 몇 줄 고쳤다. 상단 주인들이 고맙다며 술을 보냈다.';
  }
  const added = addPact(g, home, s.to, 'marriage');
  shiftRel(g, home, s.to, 10);
  if (added) { v.talks.pacts += 1; chron(g, `${g.player.name}${jo(g.player.name, '이/가')} 오간 끝에 ${J(short(home), '과/와')} ${short(s.to)} 왕가가 혼인으로 맺어지다.`); log(g, `${short(s.to)} 왕가와의 혼담을 맺었다.`); }
  return added ? '두 왕가의 혼인 문서가 완성됐다. 지참금 목록이 서른 장이었다. 신부는 내가 고른 초상화 한 장으로만 신랑을 안다. 그 생각은 하지 않기로 했다.' : '혼담은 이미 맺어져 있었다. 예물 목록만 다듬고 돌아왔다.';
}
function promote(g) {
  const p = V(g).post;
  const lang = Math.max(0, ...Object.entries(V(g).tongues).filter(([t]) => t !== nativeTongue(g)).map(([, n]) => n));
  if (p.role === 'clerk' && p.wins >= 2) { p.role = lang >= 30 ? 'interpreter' : 'envoy'; }
  else if (p.role === 'interpreter' && p.wins >= 4) p.role = 'envoy';
  else if (p.role === 'envoy' && p.wins >= 7 && stat(g, 'cha') >= 40) p.role = 'head';
  else return '';
  log(g, `${ROLE_NAME[p.role]}${jo(ROLE_NAME[p.role], '이/가')} 되었다.`);
  return `외교청은 나를 ${ROLE_NAME[p.role]}${jo(ROLE_NAME[p.role], '으로/로')} 올렸다.`;
}

/* ---------- 외교 사고 ---------- */
defineScene('envoy_incident', {
  title: (g, s) => ({ insult: '만찬의 한마디', spy: '사절단 안의 첩자', murder: '객관의 피' }[s.ev] ?? '사고'),
  text: (g, s) => ({
    insult: `${full(s.to)} 궁정 만찬에서 저쪽 대공이 술잔을 들고 우리 왕을 "이름만 남은 왕"이라 불렀다. 웃음이 터졌다. 우리 쪽 자리가 모두 나를 보았다.`,
    spy: `짐을 정리하다 단원 하나의 상자에서 ${short(s.to)} 성채 도면을 베낀 종이가 나왔다. 그는 외교청이 아니라 다른 누군가의 사람이었다. ${short(s.to)} 경비대가 객관을 뒤지기 시작했다.`,
    murder: `새벽에 우리 사절단 서기 하나가 객관 뒤뜰에서 목이 그인 채 발견됐다. ${short(s.to)} 쪽은 강도라 했다. 강도는 지갑을 두고 가지 않는다.`,
  }[s.ev]),
  choices: (g, s) => {
    if (!ready(g) || !V(g).post || !REALMS[s.to]) return [];
    if (s.ev === 'insult') return [
      { key: 'swallow', label: '웃으며 넘긴다', hint: '협상이 먼저다' },
      { key: 'retort', label: '같은 말로 되받는다', hint: '저쪽 말을 알면 더 아프게' },
    ];
    if (s.ev === 'spy') return [
      { key: 'hand', label: '그를 저쪽에 넘긴다', hint: '사절단은 산다' },
      { key: 'shield', label: '사절의 면책을 내세워 감싼다', hint: '사이가 틀어진다' },
      { key: 'send', label: '밤에 몰래 국경 밖으로 내보낸다', hint: '들키면 더 큰 일' },
    ];
    return [
      { key: 'probe', label: '직접 캐 본다', hint: '눈썰미' },
      { key: 'blame', label: '저쪽 궁정을 공개로 탓한다', hint: '사이가 크게 틀어진다' },
      { key: 'hush', label: '조용히 시신을 수습해 돌아간다', hint: '' },
    ];
  },
  resolve(g, rng, s, k) {
    const v = V(g);
    if (!ready(g) || !v.post) return '그 일은 묻혔다.';
    const home = v.post.realm;
    if (s.ev === 'insult') {
      if (k === 'swallow') { stress(g, 6); return '잔을 들어 같이 웃었다. 우리 쪽 젊은 기사 하나가 그날 밤 나를 겁쟁이라 불렀다. 협상은 이어졌다.'; }
      const sting = tongueLvl(g, s.to) >= 55;
      shiftRel(g, home, s.to, sting ? -3 : -7);
      L(g).renown = (L(g).renown ?? 0) + 3;
      const same = tongueOf(s.to) === tongueOf(home);
      return sting ? `${same ? '' : `${TONGUES[tongueOf(s.to)]}로, 그것도 `}저쪽 옛 시인의 구절로 되받았다. 대공의 얼굴이 붉어졌고, 저쪽 늙은 대신들이 웃음을 참았다. 이튿날 대공은 만찬에 나오지 않았다.` : '통역을 거쳐 되받았다. 통역이 말을 순하게 고친 모양이다. 대공은 고개만 끄덕였고, 우리 쪽만 속이 시원했다.';
    }
    if (s.ev === 'spy') {
      if (k === 'hand') { shiftRel(g, home, s.to, 3); stress(g, 8); return '그를 넘겼다. 끌려가면서 그가 나를 보았다. 누구의 사람이었는지는 끝내 말하지 않았다. 고향에 돌아가니 누군가 내 책상을 뒤진 흔적이 있었다.'; }
      if (k === 'shield') { shiftRel(g, home, s.to, -10); return '"사절단의 짐은 사절단의 땅이오." 경비대장은 물러갔다. 그날부터 객관 문 앞에 창병이 둘씩 섰다. 협상 탁자는 차가워졌다.'; }
      if (check(rng, stat(g, 'agi') * 0.4 + stat(g, 'sen') * 0.5, 45)) return '포도주 통 하나를 비우고 그를 넣었다. 국경 검문소는 통을 두드려 보지 않았다. 아무 일도 없었던 것이 되었다.';
      shiftRel(g, home, s.to, -14); stress(g, 10);
      return '통이 국경 검문소에서 열렸다. 저쪽은 사절단 전체를 첩자로 몰았다. 협상은 끝났고, 우리는 쫓기듯 돌아왔다.';
    }
    if (k === 'probe') {
      if (check(rng, stat(g, 'sen') * 0.6 + stat(g, 'int') * 0.4, 50)) { shiftRel(g, home, s.to, 4); L(g).renown = (L(g).renown ?? 0) + 3; return '객관 하인 하나의 신발에 피가 묻어 있었다. 캐 보니 전쟁을 바라는 저쪽 귀족 하나가 시킨 일이었다. 증거를 저쪽 왕 앞에 내놓았다. 그 귀족은 그 주에 영지로 쫓겨났고, 협상은 오히려 빨라졌다.'; }
      stress(g, 8); return '사흘을 캐물었지만 아무도 아무것도 보지 못했다고 했다. 모두가 같은 말을 하는 게 가장 수상했다.';
    }
    if (k === 'blame') {
      shiftRel(g, home, s.to, -16);
      deed(g, 'brave', 2, `${short(s.to)} 궁정 앞에서 사절 살해를 따졌다`);
      return `${short(s.to)} 왕 앞에서 피 묻은 외투를 펼쳤다. 궁정이 술렁였다. 협상은 끝났다. 국경 마을에서는 그 외투 이야기가 노래가 되었다고 한다.`;
    }
    stress(g, 10);
    return '시신을 소금에 재워 수레에 실었다. 돌아오는 길 내내 그 수레 옆을 걸었다. 그의 어머니에게 무슨 말을 할지 끝내 정하지 못했다.';
  },
});

/* ---------- 내 자식을 볼모로 ---------- */
const kidsFor = (g) => (me(g)?.childIds ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive && !p.isPlayer && ageYears(p) >= 6 && ageYears(p) <= 14 && !V(g).pledged.some((k) => k.id === p.id));
defineScene('envoy_pledge', {
  title: (g, s) => `${short(s.to)}의 마지막 조건`,
  text: (g, s) => `인장을 찍기 전날 밤, ${short(s.to)} 재상이 혼자 찾아왔다. "종이는 찢기 쉽소. 사절단장의 아이 하나가 우리 궁정에서 자란다면, 우리 왕께서 더 편히 주무실 것이오." 그는 내 아이들 나이까지 알고 있었다.`,
  choices: (g, s) => (ready(g) && V(g).post && REALMS[s.to] ? [
    ...kidsFor(g).slice(0, 3).map((p) => ({ key: `k${p.id}`, label: `${J(p.name, '을/를')} 보낸다`, hint: `${ageYears(p)}살. 열여섯이 될 때까지` })),
    { key: 'no', label: '자식은 보낼 수 없다고 한다', hint: '조약이 흔들린다' },
  ] : []),
  resolve(g, rng, s, k) {
    const v = V(g);
    if (!ready(g) || !v.post) return '재상은 다시 오지 않았다.';
    const kid = kidsFor(g).find((p) => `k${p.id}` === k);
    if (!kid) { shiftRel(g, v.post.realm, s.to, -8); return '"그럼 종이만 믿어 보지요." 재상은 웃었지만 눈은 웃지 않았다. 조약은 맺어졌다. 다만 얇았다.'; }
    const cap = capitalOf(s.to);
    v.pledged.push({ id: kid.id, name: kid.name, to: s.to, since: mi(g), until: mi(g) + (16 - ageYears(kid)) * 12, warSeen: false });
    kid.place = cap;
    kid.affection = clamp((kid.affection ?? 0) - 10, -100, 100);
    remember(g, kid, `나를 ${short(s.to)} 궁정에 볼모로 보냈다`, -2, { tag: 'envoy' });
    shiftRel(g, v.post.realm, s.to, 12);
    stress(g, 12);
    log(g, `${J(kid.name, '을/를')} ${short(s.to)} 궁정에 볼모로 보냈다.`);
    return `${J(kid.name, '은/는')} 울지 않았다. 마차에 오르기 전에 내 소매를 한 번 잡았다가 놓았다. 그 손이 생각보다 컸다. 조약은 두꺼워졌다. 나는 그 두께를 재고 싶지 않았다.`;
  },
});
defineScene('envoy_kid_war', {
  title: (g, s) => `${short(s.to)}에 있는 아이`,
  text: (g, s) => { const k = V(g).pledged.find((x) => x.id === s.id); return `${J(short(s.to), '과/와')} 우리나라 사이에 전쟁이 났다. ${k?.name ?? '아이'}${jo(k?.name ?? '아이', '은/는')} 아직 그 궁정에 있다. 볼모는 이럴 때 쓰라고 있는 것이다.`; },
  choices: (g, s) => (alive(g) && V(g).pledged.some((x) => x.id === s.id) ? [
    ...(canSpend(g, 80) ? [{ key: 'ransom', label: '몸값을 보내 데려온다', hint: '은화 여든 닢' }] : []),
    { key: 'plea', label: '그 궁정의 옛 벗들에게 편지를 쓴다', hint: '말솜씨' },
    { key: 'endure', label: '기다린다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    const v = V(g), entry = v.pledged.find((x) => x.id === s.id), kid = byId(g, s.id);
    if (!entry || !kid) return '소식이 끊겼다.';
    if (k === 'ransom' && canSpend(g, 80)) { spend(g, 80); bringHome(g, entry, kid); return `은화 여든 닢이 국경을 넘었고, ${J(kid.name, '이/가')} 돌아왔다. 말수가 줄었다. ${tongueOf(entry.to) === nativeTongue(g) ? `말끝에 ${short(entry.to)} 말씨가 묻어 있었다.` : `밤에 ${TONGUES[tongueOf(entry.to)]}로 잠꼬대를 했다.`}`; }
    if (k === 'plea' && check(rng, stat(g, 'cha') * 0.6 + skill(g, 'letters') * 0.4, 45)) return `옛 협상 상대였던 늙은 대신이 답장을 보냈다. "아이는 내 집에 있소. 전쟁은 어른들 일이오." 그 한 줄을 백 번 읽었다.`;
    stress(g, 14);
    if (kid.alive) remember(g, kid, '전쟁이 난 궁정에서 혼자 버텼다', -2, { tag: 'envoy' });
    return `소식이 오지 않았다. 석 달 뒤 온 편지에는 ${J(kid.name, '이/가')} 탑 방으로 옮겨졌다는 말뿐이었다. 창이 작다고 했다.`;
  },
});
function bringHome(g, entry, kid) {
  const v = V(g);
  v.pledged = v.pledged.filter((x) => x !== entry);
  if (kid && kid.alive) kid.place = me(g)?.place ?? here(g);
  log(g, `${entry.name}${jo(entry.name, '이/가')} ${short(entry.to)}에서 돌아왔다.`);
}

/* ---------- 볼모로 자라는 아이(플레이어) ---------- */
function hostCandidates(g) {
  const home = citizen(g);
  return realms().filter((x) => x !== home && !warOf(g, home, x) && (pactOf(g, home, x, 'truce') || pactOf(g, home, x, 'marriage') || relOf(g, home, x) <= -10));
}
const kidOk = (g) => alive(g) && !traveling(g) && !g.bondage?.slave;
function startHostage(g, to, untilAge = 16) {
  const v = V(g);
  const home = here(g);
  v.hostage = { from: citizen(g), to, at: capitalOf(to), home, since: mi(g), until: mi(g) + Math.max(1, untilAge - playerAge(g)) * 12, ties: 5, friend: null, warSeen: false };
  carry(g, capitalOf(to));
  log(g, `${full(to)} 궁정에 볼모로 보내졌다.`);
}
defineScene('envoy_hostage_sent', {
  title: () => '먼 궁정으로',
  text: (g, s) => `아버지가 문을 닫고 오래 말이 없었다. 그러다 말했다. "${full(s.to)} 궁정에서 너를 데려가겠다는구나. 두 나라가 서로 믿으려면 누군가 가야 한다고." 집안이 진 빚이 무엇인지, 그때는 몰랐다. 마차는 열흘 뒤에 온다고 했다.`,
  choices: (g, s) => (kidOk(g) && !V(g).hostage && capitalOf(s.to) && playerAge(g) < 14 ? [
    { key: 'proud', label: '집안을 위해 간다', hint: '의지' },
    { key: 'cry', label: '가기 싫다고 운다', hint: '그래도 간다' },
  ] : []),
  resolve(g, rng, s, k) {
    if (!kidOk(g) || V(g).hostage || !capitalOf(s.to)) return '마차는 오지 않았다.';
    startHostage(g, s.to);
    if (k === 'proud') { gainStat(g, 'wil', 1); return `마차 창으로 마을이 작아지는 것을 끝까지 보았다. 울지 않았다. ${full(s.to)} 궁정 문 앞에서 처음 본 사람이 내 이름을 틀리게 불렀다.`; }
    stress(g, 8);
    return `어머니 치맛자락을 놓지 않아 하인 둘이 떼어 냈다. 마차 안에서 내내 울었다. ${full(s.to)}에 닿았을 때는 울음도 말라 있었다. ${tongueOf(s.to) === nativeTongue(g) ? '말은 통했지만, 말씨 하나로 다들 내가 어디서 왔는지 알았다.' : '거기 사람들 말은 한 마디도 알아듣지 못했다.'}`;
  },
});
const LIFE_EV = ['tutor', 'prince', 'cruel', 'letter'];
defineScene('envoy_hostage_life', {
  title: (g, s) => ({ tutor: '궁정 선생', prince: '왕자의 놀이 상대', cruel: '복도의 아이들', letter: '집에서 온 편지' }[s.ev]),
  text: (g, s) => {
    const h = V(g).hostage, to = short(h?.to ?? 'leonia');
    return {
      tutor: `${to} 궁정이 볼모들에게 붙여 준 늙은 선생이 있다. 그는 내가 어느 나라 아이인지 개의치 않는 듯했다. "글은 국경을 모른다." 그가 책 한 권을 내밀었다.`,
      prince: `${to}의 어린 왕자가 나를 검술 놀이 상대로 골랐다. 볼모가 왕자를 이기면 안 된다는 건 누가 가르쳐 주지 않아도 안다.`,
      cruel: `복도에서 ${to} 귀족 집 아이들이 내 말씨를 흉내 냈다. 하나가 내 책을 빼앗아 창밖으로 던졌다.`,
      letter: `고향에서 편지가 왔다. 봉인이 한 번 뜯겼다 붙은 자국이 있다. 어머니 글씨는 짧고, 하고 싶은 말은 다 지운 것 같았다.`,
    }[s.ev];
  },
  choices: (g, s) => {
    if (!kidOk(g) || !V(g).hostage) return [];
    return {
      tutor: [{ key: 'learn', label: '그 책을 밤새 읽는다', hint: '글·그 나라 말' }, { key: 'refuse', label: '적국의 책은 읽지 않는다', hint: '' }],
      prince: [{ key: 'lose', label: '져 준다', hint: '왕자와 가까워진다' }, { key: 'win', label: '이긴다', hint: '검' }],
      cruel: [{ key: 'fight', label: '주먹으로 갚는다', hint: '힘' }, { key: 'bear', label: '참고 책을 주우러 간다', hint: '' }],
      letter: [{ key: 'write', label: '괜찮다고 답장을 쓴다', hint: '' }, { key: 'truth', label: '돌아가고 싶다고 쓴다', hint: '그 편지도 누군가 읽는다' }],
    }[s.ev];
  },
  resolve(g, rng, s, k) {
    const h = V(g).hostage;
    if (!kidOk(g) || !h) return '그 일은 흐지부지 끝났다.';
    const t = tongueOf(h.to);
    if (s.ev === 'tutor') { if (k === 'learn') { gainSkill(g, 'letters', 2, 'int'); learn(g, t, 6); h.ties += 6; return '책은 그 나라 옛 왕들의 이야기였다. 우리나라에서 악당인 사람이 거기서는 영웅이었다. 이야기는 어느 쪽에서 쓰느냐에 달렸다는 걸 그때 배웠다.'; } h.ties -= 2; gainStat(g, 'wil', 0.5); return '책을 돌려주었다. 선생은 화내지 않았다. "그럼 나중에." 책은 내 방 문 앞에 그대로 놓여 있었다.'; }
    if (s.ev === 'prince') {
      if (k === 'lose') { h.ties += 8; h.friend ??= `${short(h.to)} 왕자`; return '세 번 다 져 주었다. 네 번째에 왕자가 목검을 던졌다. "너 일부러 지지." 그날부터 그는 나를 진짜 상대로 대했다. 그리고 친구가 되었다.'; }
      gainSkill(g, 'sword', 2, 'agi'); stress(g, 6); h.ties -= 3;
      return '이겼다. 왕자는 넘어진 채 웃었지만, 그 뒤로 시종장이 내 방 열쇠를 바깥에서 잠그기 시작했다.';
    }
    if (s.ev === 'cruel') {
      if (k === 'fight') { gainStat(g, 'str', 0.6); h.ties -= 3; stress(g, 4); return '셋을 상대로 싸웠다. 코피가 났지만 하나는 울렸다. 이튿날 볼모가 귀족 아이를 때렸다고 궁정이 시끄러웠다. 고향에 항의 편지가 갔다.'; }
      gainStat(g, 'wil', 0.6); learn(g, t, 3); h.ties += 2;
      return '책을 주우러 정원으로 내려갔다. 정원사 할머니가 먼저 주워 털어 주었다. 그분에게서 그 나라 말을 제일 많이 배웠다.';
    }
    if (k === 'write') { h.ties += 2; return '"잘 먹고 잘 지냅니다." 반은 거짓말이었다. 그 편지를 읽을 다른 눈들을 생각하면, 그게 맞는 말이었다.'; }
    stress(g, 5); h.ties -= 4;
    return '돌아가고 싶다고 썼다. 답장은 오지 않았다. 대신 시종장이 와서, 볼모가 쓰는 편지는 짧을수록 좋다고 일러 주었다.';
  },
});
defineScene('envoy_hostage_war', {
  title: () => '볼모의 쓸모',
  text: (g) => { const h = V(g).hostage; return `${J(short(h?.from ?? 'leonia'), '과/와')} ${short(h?.to ?? 'leonia')} 사이에 전쟁이 났다. 아침 수업에 선생이 오지 않았다. 대신 창병 둘이 내 방 문 앞에 섰다. 복도 끝에서 누군가 "볼모는 이럴 때 쓰라고 있는 것"이라고 말했다.`; },
  choices: (g) => (kidOk(g) && V(g).hostage ? [
    { key: 'low', label: '숨죽이고 지낸다', hint: '' },
    { key: 'plead', label: '그 나라 말로 왕 앞에 나가 청한다', hint: '말과 말솜씨' },
    { key: 'flee', label: '밤에 담을 넘는다', hint: '날래야 한다' },
  ] : []),
  resolve(g, rng, s, k) {
    const v = V(g), h = v.hostage;
    if (!kidOk(g) || !h) return '전쟁은 멀리서 끝났다.';
    if (k === 'plead') {
      if (check(rng, stat(g, 'cha') * 0.5 + (v.tongues[tongueOf(h.to)] ?? 0) * 0.5, 45)) { h.ties += 8; return '어린 볼모가 자기 나라 말로 또박또박 청하자 왕이 웃었다. "이 아이는 우리 궁정에서 자랐다. 탑에 넣지 마라." 창병은 그날 밤 물러갔다.'; }
      stress(g, 10); return '말이 꼬였다. 대신들이 웃었다. 그날부터 탑 꼭대기 방에서 지냈다. 창이 작았다.';
    }
    if (k === 'flee') {
      if (check(rng, stat(g, 'agi') * 0.7 + stat(g, 'sen') * 0.3, 50)) { const home = h.home; v.hostage = null; v.between = { host: h.to, ties: clamp(h.ties - 10, 0, 100), since: mi(g) }; carry(g, home); log(g, '전쟁이 나자 볼모로 있던 궁정에서 달아났다.'); gainStat(g, 'agi', 1); return '빨래 수레 밑에 숨어 성문을 나왔다. 열이레를 걸어 국경을 넘었다. 고향 집 문을 두드렸을 때 어머니는 한참 동안 나를 알아보지 못했다.'; }
      stress(g, 14); h.ties -= 6; return '담 위에서 붙잡혔다. 매는 맞지 않았다. 대신 그날부터 밤마다 문에 쇠가 걸렸다.';
    }
    stress(g, 8); return '말을 아끼고, 눈을 내리깔고, 밥을 남기지 않았다. 볼모는 눈에 띄지 않을 때 가장 안전하다.';
  },
});
defineScene('envoy_hostage_return', {
  title: () => '열여섯',
  text: (g) => { const h = V(g).hostage; return `볼모의 기한이 끝났다. ${short(h?.from ?? 'leonia')}에서 데리러 온 마차가 궁정 마당에 서 있다. ${h?.friend ? `${J(h.friend, '이/가')} 창가에서 내려다본다. ` : ''}여기서 산 세월이 고향에서 산 세월보다 길어졌다. ${h && tongueOf(h.to) !== tongueOf(h.from) ? '꿈도 이제 이 나라 말로 꾼다.' : '말씨도 이제 이 나라 사람 같다.'}`; },
  choices: (g) => (kidOk(g) && V(g).hostage ? [
    { key: 'home', label: '고향으로 돌아간다', hint: '두 나라 사이에 낀 채로' },
    { key: 'stay', label: '이 나라에 남는다', hint: '국적이 바뀐다' },
  ] : []),
  resolve(g, rng, s, k) {
    const v = V(g), h = v.hostage;
    if (!kidOk(g) || !h) return '마차는 빈 채로 돌아갔다.';
    v.hostage = null;
    if (k === 'stay') {
      const R = realmState(g);
      R.citizen = h.to; if (!R.naturalized.includes(h.to)) R.naturalized.push(h.to);
      if (L(g).home === 'family') L(g).home = 'inn';
      v.between = { host: h.from, ties: 30, since: mi(g) };
      log(g, `볼모 기한이 끝났지만 ${short(h.to)}에 남아 그 나라 사람이 되었다.`);
      chron(g, `${g.player.name}, 볼모로 자란 ${short(h.to)}에 남다.`);
      return `마차를 빈 채로 돌려보냈다. 고향에 편지를 썼다. 한 줄 쓸 때마다 지웠다. 결국 남은 건 "여기가 제 집이 되었습니다" 한 줄이었다.`;
    }
    v.between = { host: h.to, ties: clamp(h.ties, 0, 100), since: mi(g) };
    carry(g, h.home);
    log(g, `볼모 기한을 마치고 ${short(h.from)}${jo(short(h.from), '으로/로')} 돌아왔다.`);
    return `고향 마을은 기억보다 작았다. 사람들은 내 말씨가 이상하다고 했다. ${short(h.to)} 말씨가 섞였다고. 어머니는 내 손을 잡고 한참 놓지 않았다. 나는 어디에서도 손님이었다.`;
  },
});
defineScene('envoy_between', {
  title: () => '두 나라 사이',
  text: (g) => { const b = V(g).between; return `${short(b?.host ?? 'leonia')}${jo(short(b?.host ?? 'leonia'), '과/와')}의 사이가 험해지자, 사람들이 내 쪽을 보는 눈이 달라졌다. "그 집 사람은 저쪽 궁정에서 컸다지." 장터에서도, 관청에서도.`; },
  choices: (g) => (ready(g) && V(g).between ? [
    { key: 'prove', label: '내 나라 사람임을 보인다', hint: '그 나라와의 정을 끊는다' },
    ...(V(g).between.ties >= 30 ? [{ key: 'bridge', label: '옛 벗들에게 편지를 보내 다리를 놓는다', hint: '두 나라 사이가 조금 풀린다. 의심도 산다' }] : []),
    { key: 'quiet', label: '아무 말도 하지 않는다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    const v = V(g), b = v.between;
    if (!ready(g) || !b) return '말들은 곧 잦아들었다.';
    if (k === 'prove') { b.ties = clamp(b.ties - 20, 0, 100); deed(g, 'brave', 2, `${short(b.host)}에서 자랐어도 제 나라 편에 섰다`); stress(g, 6); return `${short(b.host)}에서 받은 편지 다발을 장터에서 태웠다. 사람들이 고개를 끄덕였다. 밤에 집에 돌아와 남은 재를 오래 보았다.`; }
    if (k === 'bridge') {
      shiftRel(g, citizen(g), b.host, 6);
      if (rng.chance(0.3)) { reportCrime(g, 'espionage', here(g), { mult: 0.3 }); stress(g, 10); return `편지는 닿았고, 저쪽 궁정의 말투가 조금 누그러졌다. 그런데 그 편지 한 통이 국경 검문소에서 뜯겼다. 경비대가 집에 찾아왔다.`; }
      return '어릴 적 함께 자란 저쪽 귀족에게 편지를 썼다. 두 달 뒤 저쪽 국경 수비대가 한 걸음 물러났다는 소식이 들렸다. 그게 내 편지 때문인지는 아무도 모른다. 나는 안다.';
    }
    stress(g, 5); return '아무 말도 하지 않았다. 말을 하면 어느 쪽 말로 하느냐부터 따질 테니까.';
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (!g.player || g.over) return;
  const v = V(g);
  const r = ownRng(g, 1);
  const now = mi(g);
  worldTick(g, now);
  if (L(g).heirPending) return;
  // 사는 곳의 말은 저절로 는다
  const local = tongueOf(realmOf(here(g)));
  if (local !== nativeTongue(g)) learn(g, local, v.hostage ? 1.2 : playerAge(g) >= 6 ? 0.35 : 0);
  // 맡긴 자식들
  for (const entry of [...v.pledged]) {
    const kid = byId(g, entry.id);
    if (!kid || !kid.alive) { v.pledged = v.pledged.filter((x) => x !== entry); continue; }
    if (now >= entry.until) { bringHome(g, entry, kid); note(g, `${J(kid.name, '이/가')} ${short(entry.to)} 궁정에서 볼모 기한을 마치고 돌아왔다.`); continue; }
    if (!entry.warSeen && warOf(g, citizen(g), entry.to) && !sceneQueued(g, 'envoy_kid_war')) { entry.warSeen = true; queueScene(g, 'envoy_kid_war', { id: kid.id, to: entry.to }, { first: true }); }
  }
  // 볼모로 자라는 나
  const h = v.hostage;
  if (h) {
    h.ties = clamp(h.ties + 0.5, 0, 100);
    if (here(g) !== h.at && !traveling(g)) { v.hostage = null; v.between = { host: h.to, ties: h.ties, since: now }; log(g, `볼모의 기한을 채우지 않고 ${short(h.to)} 궁정을 떠났다.`); note(g, `볼모의 기한을 채우지 않고 ${short(h.to)} 궁정을 떠났다. 그 궁정은 그 일을 잊지 않을 것이다.`); shiftRel(g, h.from, h.to, -4); return; }
    if (!h.warSeen && warOf(g, h.from, h.to) && !sceneQueued(g, 'envoy_hostage_war')) { h.warSeen = true; queueScene(g, 'envoy_hostage_war', {}, { first: true }); return; }
    if (now >= h.until && !sceneQueued(g, 'envoy_hostage_return')) { queueScene(g, 'envoy_hostage_return', {}, { first: true }); h.until = now + 3; return; }
    if (now - v.sceneAt >= 7 && r.chance(0.16) && !sceneQueued(g, 'envoy_hostage_life')) { v.sceneAt = now; queueScene(g, 'envoy_hostage_life', { ev: r.pick(LIFE_EV) }); }
    return;
  }
  // 볼모로 보내지는 아이
  const age = playerAge(g);
  if (age >= 11 && age <= 12 && !v.between && kidOk(g) && !sceneQueued(g, 'envoy_hostage_sent') && L(g).home === 'family') {
    const fam = g.player.familyId;
    const p = fam === 'fallen_knight' ? 0.007 : citizen(g) === 'leonia' && courtState(g).standing >= 40 ? 0.005 : 0;
    if (p && r.chance(p)) { const c = hostCandidates(g); if (c.length) queueScene(g, 'envoy_hostage_sent', { to: r.pick(c) }, { first: true }); }
    return;
  }
  // 돌아온 뒤 두 나라 사이에 낀 삶
  const b = v.between;
  if (b && ready(g) && now - v.sceneAt >= 18 && (relOf(g, citizen(g), b.host) <= -40 || warOf(g, citizen(g), b.host)) && r.chance(0.08) && !sceneQueued(g, 'envoy_between')) {
    v.sceneAt = now; queueScene(g, 'envoy_between', {});
  }
  if (b) b.ties = clamp(b.ties - 0.1, 0, 100);
});

/* ---------- 플레이어 없이도 사절이 오간다 ---------- */
function worldTick(g, now) {
  if (!g.politics || ![4, 10].includes(g.date.month)) return;
  const v = V(g);
  if (v.world.at === now) return;
  v.world.at = now;
  const r = ownRng(g, 9);
  const list = realms();
  const a = r.pick(list), b = r.pick(list.filter((x) => x !== a));
  if (!a || !b || [a, b].sort().join('|') === 'leonia|valhart') return;
  const rel = relOf(g, a, b);
  if (warOf(g, a, b)) {
    if (r.chance(0.3)) { pnews(g, `${full(a)} 사절이 백기를 들고 ${short(b)} 진영에 들어갔다. 돌아올 때도 백기는 그대로였다.`); v.world.n += 1; }
    return;
  }
  if (rel <= -40 && r.chance(0.3)) {
    shiftRel(g, a, b, -8); v.world.incidents += 1;
    pnews(g, r.pick([`${short(b)} 궁정에서 ${full(a)} 사절이 모욕을 당하고 쫓겨났다.`, `${full(a)} 사절단의 서기가 ${short(b)}에서 첩자로 붙잡혔다.`, `${short(b)}에 간 ${full(a)} 사절이 돌아오지 않았다. 객관에서 시신이 나왔다는 소문이 돈다.`]));
    return;
  }
  shiftRel(g, a, b, 3); v.world.n += 1;
  if (rel >= 20 && !pactOf(g, a, b, 'trade') && r.chance(0.2)) { addPact(g, a, b, 'trade'); pnews(g, `${J(full(a), '과/와')} ${full(b)} 사절단이 통상 조약에 인장을 찍었다.`); return; }
  if (r.chance(0.35)) pnews(g, r.pick([`${full(a)} 사절단이 선물 수레를 끌고 ${short(b)} 도읍에 닿았다.`, `${J(short(a), '과/와')} ${short(b)} 사이에 볼모로 가 있던 귀족 자제들이 서로 돌아갔다.`, `${short(b)} 궁정에 ${full(a)}의 새 상주 사절이 들어갔다.`]));
}

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g) => {
  const v = V(g);
  if (v.post) { v.past.push({ y: g.date.year, text: `선대, ${full(v.post.realm)} ${ROLE_NAME[v.post.role]} (사절 ${v.post.missions}번)` }); if (v.past.length > 8) v.past.shift(); }
  v.post = null; v.hostage = null; v.between = null; v.tongues = {}; v.tongueAt = -99; v.joinAt = -99;
  const pid = g.player.id;
  const mine = v.pledged.find((x) => x.id === pid);
  if (mine) {
    v.pledged = v.pledged.filter((x) => x !== mine);
    if (playerAge(g) < 16 && capitalOf(mine.to)) {
      v.hostage = { from: citizen(g), to: mine.to, at: capitalOf(mine.to), home: L(g).home === 'family' ? (L(g).place ?? 'ern') : (capitalOf(citizen(g)) ?? 'leocast'), since: mine.since, until: mine.until, ties: 15, friend: null, warSeen: false };
      if (here(g) !== v.hostage.at) carry(g, v.hostage.at);
      log(g, `${full(mine.to)} 궁정에서 볼모로 지내던 중에 대를 이었다.`);
    } else v.between = { host: mine.to, ties: 35, since: mi(g) };
    v.tongues[tongueOf(mine.to)] = 50;
  }
  // 아직 맡겨 둔 다른 형제들은 이제 내 형제다. 자식 목록에서 빠지므로 기한이 되면 그대로 돌아온다.
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
