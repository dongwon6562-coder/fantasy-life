// 8단계: 궁정과 음모.
// 왕도 레오카스트의 궁정에 드나들며 이름값(standing)과 총애(favor)를 쌓고, 관직에 올라 출세한다.
// 귀족 가문(src/history의 가문)과 혼인 동맹을 맺거나 원수가 되고, 첩자·소문·협박·독살로 판을 흔든다.
// 왕위 계승 다툼(world.js의 루돌프·에릭)에서 편을 고르면, 이긴 쪽은 출세하고 진 쪽은 실각한다.
// 상태는 game.court 하나. 화면 연결점: courtInfo(g), courtHouses(g), OFFICES
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat, gainSkill } from '../game.js';
import { makePerson, byId, fullName, has, kill } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, up, gains, spend, check } from '../adventure/core.js';
import { queueFight } from '../adventure/fight.js';
import { registerJob, takeJob, jobRank } from '../jobs.js';
import { leaveJob, PLACES, travelMonths } from '../places.js';
import { marry, remember } from '../relations.js';
import { isJailed, jail, addNotoriety, notoriety, craftOf, reportCrime } from '../crime.js';
import { nudge, rulerName } from '../world.js';
import { H } from '../history/state.js';
import { liveHouses, houseName } from '../history/nobles.js';
import { D, domainTitle } from '../domain/state.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place;
const fac = (g, id) => L(g).fac?.[id];
const COURT = 'leocast';
const atCourt = (g) => here(g) === COURT && !traveling(g) && !isJailed(g);

// 궁정 관직: 시종 → 서기관 → 궁내관 → 재상
export const OFFICES = ['시종', '서기관', '궁내관', '재상'];
const OFFICE_NEED = [{ standing: 15 }, { standing: 35, letters: 30 }, { standing: 55, favor: 45 }, { standing: 80, favor: 70 }];

/* ---------- 상태 ---------- */
export function courtState(g) {
  g.court ??= {};
  const c = g.court;
  for (const k of ['standing', 'favor']) if (!Number.isFinite(c[k])) c[k] = 0;
  c.office ??= -1;          // 지금 관직 단계 (-1: 없음)
  c.side ??= null;          // 왕위 다툼에서 미는 왕자 (rudolf | erik)
  c.patron ??= null;        // 뒤를 봐주는 가문 id
  c.allies ??= {};          // 가문 id → 우호 (혼인 동맹이면 큰 값)
  c.foes ??= {};            // 가문 id → 원한
  c.secrets ??= [];         // [{ house, what, power, at }]
  c.spies ??= {};           // 가문 id → 심어 둔 달
  c.courtiers ??= {};       // 가문 id → 그 집안 사람(NPC) id
  c.marriages ??= [];       // [{ house, who, at }] 혼인으로 맺은 동맹
  c.disgrace ??= 0;         // 이 달까지 궁정 출입 금지
  c.heat ??= 0;             // 음모가 들킬 위험 (0~100)
  c.sceneAt ??= 0;
  c.lastRuler ??= g.realm?.ruler ?? null;
  return c;
}
const C = courtState;
export const disgraced = (g) => C(g).disgrace > mi(g);
const houses = (g) => liveHouses(g).filter((h) => h.seat === COURT || h.title === '공작' || h.title === '후작' || h.power >= 50);
export const courtHouses = (g) => houses(g).map((h) => ({ id: h.id, name: houseName(h), head: h.head, power: Math.round(h.power), side: h.side, ally: C(g).allies[h.id] ?? 0, foe: C(g).foes[h.id] ?? 0, spy: !!C(g).spies[h.id], married: C(g).marriages.some((m) => m.house === h.id) }));
const houseById = (g, id) => (H(g)?.houses ?? []).find((h) => h.id === id && !h.fallen) ?? null;
const PRINCE = { rudolf: '루돌프 왕자', erik: '에릭 왕자' };
const sideOpen = (g) => ['contest', 'civilwar'].includes(g.realm?.succession) && g.realm?.ruler !== 'rudolf' && g.realm?.ruler !== 'erik';

// 궁정에 드나들 자격
export function courtAccess(g) {
  if (!isAdult(g)) return '어른이 되어야 한다';
  if (disgraced(g)) return `실각했다 (${Math.ceil((C(g).disgrace - mi(g)) / 12)}년 동안 출입 금지)`;
  const c = C(g);
  if (c.office >= 0 || c.standing >= 10) return null;
  if (D(g)) return null;                                     // 작위가 있다
  if ((fac(g, 'knights')?.rank ?? 0) >= 2 || (fac(g, 'church')?.rank ?? 0) >= 2) return null;
  if ((L(g).renown ?? 0) >= 40) return null;
  if (c.marriages.length) return null;
  return '작위, 이름값 40, 정기사·사제 이상, 아니면 귀족과의 혼인';
}
export function courtTitle(g) {
  const c = C(g);
  if (c.office >= 0) return `궁정 ${OFFICES[c.office]}`;
  return null;
}
export function courtInfo(g) {
  const c = C(g);
  return {
    access: courtAccess(g), standing: Math.round(c.standing), favor: Math.round(c.favor),
    standingWord: standingWord(c.standing), office: c.office >= 0 ? OFFICES[c.office] : null,
    side: c.side ? PRINCE[c.side] : null, patron: c.patron ? houseName(houseById(g, c.patron) ?? { name: '?', title: '' }) : null,
    secrets: c.secrets.length, heat: Math.round(c.heat), disgraced: disgraced(g),
    houses: courtHouses(g), ruler: rulerName(g),
  };
}
const standingWord = (v) => (v >= 80 ? '궁정의 기둥' : v >= 55 ? '이름이 오르내린다' : v >= 30 ? '얼굴이 알려졌다' : v >= 10 ? '말석에 선다' : '아무도 모른다');
const addStanding = (g, n) => { const c = C(g); c.standing = clamp(c.standing + n, 0, 100); };
const addFavor = (g, n) => { const c = C(g); c.favor = clamp(c.favor + n, 0, 100); };
const addFoe = (g, id, n) => { if (!id) return; const c = C(g); c.foes[id] = clamp((c.foes[id] ?? 0) + n, 0, 100); };
const addAlly = (g, id, n) => { if (!id) return; const c = C(g); c.allies[id] = clamp((c.allies[id] ?? 0) + n, 0, 100); };

/* ---------- 가문 사람 (그 집안의 얼굴) ---------- */
const ROLE = ['맏아들', '둘째 딸', '막내아들', '조카딸', '맏딸', '둘째 아들'];
export function courtier(g, rng, id, { sex } = {}) {
  const c = C(g);
  const h = houseById(g, id);
  if (!h) return null;
  let p = c.courtiers[id] != null ? byId(g, c.courtiers[id]) : null;
  if (p?.alive && (!sex || p.sex === sex)) return p;
  if (!rng) return p?.alive ? p : null;
  const s = sex ?? (rng.chance(0.5) ? 'm' : 'f');
  const age = clamp(playerAge(g) + rng.int(-6, 4), 17, 45);
  p = makePerson(rng, { sex: s, ageMonths: age * 12 + rng.int(0, 11), lastName: h.name, job: 'merchant', traits: [rng.pick(['ambitious', 'reserved', 'kind', 'greedy', 'brave', 'pious', 'cruel', 'gossip'])] });
  p.job = 'merchant';
  p.place = COURT; p.role = 'courtier'; p.house = id;
  const role = ROLE.filter((r) => (s === 'f' ? /딸/.test(r) : /아들/.test(r)));
  p.title = `${h.name} 가문의 ${rng.pick(role)}`;
  p.wealth = 200 + rng.int(0, 300);
  g.people.push(p);
  (L(g).placeNpcs[COURT] ??= []).push(p.id);
  c.courtiers[id] = p.id;
  return p;
}
const who = (p) => (p ? `${p.title ? `${p.title} ` : ''}${p.name}` : '그 사람');

/* ---------- 새 게임, 옛 저장, 대 잇기 ---------- */
HOOKS.newGame.push((g) => { C(g); });
HOOKS.migrate.push((g) => { C(g); });
HOOKS.heir.push((g) => {
  const c = C(g);
  // 아이는 부모의 이름값 일부와 혼인 동맹을 잇는다. 관직과 음모의 흔적은 남지 않는다.
  c.standing = Math.round(c.standing * 0.4); c.favor = Math.round(c.favor * 0.3);
  c.office = -1; c.heat = 0; c.secrets = []; c.spies = {}; c.disgrace = 0;
  for (const k of Object.keys(c.foes)) c.foes[k] = Math.round(c.foes[k] / 2);
});

/* ---------- 궁정 관리 일 ---------- */
registerJob('courtier', {
  name: '궁정 관리', places: [COURT], skill: 'letters', stat: 'cha', stat2: 'int', wage: [3, 6, 11, 20], npcJob: 'merchant',
  ranks: OFFICES,
  rankOf: (g) => clamp(C(g).office, 0, 3),
  req: (g) => (C(g).office >= 0 ? null : '궁정의 부름이 있어야 한다 (궁정에 나가 이름값을 쌓는다)'),
  title: (g) => `궁정 ${OFFICES[clamp(C(g).office, 0, 3)]}`,
  lines: ['청원서 더미를 정리했다. 절반은 세금을 깎아 달라는 것이고, 나머지 절반은 이웃 영주를 벌해 달라는 것이었다.', '알현실 문 앞에 서서 들어갈 사람과 기다릴 사람을 갈랐다. 기다리게 한 사람들이 나를 기억할 것이다.', '연회 자리 배치를 짰다. 공작가와 후작가를 나란히 앉히면 칼부림이 난다.', '외국 사절의 편지를 옮겨 적었다. 행간에 적힌 것이 더 중요했다.'],
  work(g, rng) {
    const c = C(g);
    addStanding(g, rng.float(0.8, 1.6));
    addFavor(g, rng.float(0.2, 0.8));
    // 관직 단계에 맞춘 일
    const lines = [
      ['궁정 복도를 하루 종일 뛰어다녔다. 시종에게는 이름이 없다. 대신 귀가 있다.', '귀부인의 개를 산책시켰다. 개가 나보다 궁정 서열이 높다.'],
      ['청원서 더미를 정리했다. 절반은 세금을 깎아 달라는 것이고, 나머지 절반은 이웃 영주를 벌해 달라는 것이었다.', '외국 사절의 편지를 옮겨 적었다. 행간에 적힌 것이 더 중요했다.'],
      ['연회 자리 배치를 짰다. 공작가와 후작가를 나란히 앉히면 칼부림이 난다.', '왕실 금고의 장부를 맞췄다. 숫자가 맞지 않는 곳마다 누군가의 이름이 있다.'],
      ['어전 회의에서 마지막으로 말했다. 마지막 말이 결정이 된다.', '대귀족 셋이 동시에 면담을 청했다. 누구를 먼저 만날지가 곧 정치다.'],
    ][clamp(c.office, 0, 3)];
    const k = gainSkill(g, 'letters', 0.8, 'int');
    const ch = gainStat(g, 'cha', 0.4);
    tired(g, 12);
    const wage = [3, 6, 11, 20][clamp(c.office, 0, 3)] + rng.int(0, 2);
    g.player.money += wage;
    L(g).job.months += 0.25;
    return `${rng.pick(lines)} 녹봉 은화 ${wage}닢.${gains([up('글과 학문', k), up('매력', ch)])}`;
  },
});

/* ---------- 궁정에 나가기 ---------- */
const COURT_LINES = [
  '알현실 뒤편에 서서 하루를 보냈다. 누가 누구에게 먼저 인사하는지 보는 것만으로도 왕국의 지도가 그려졌다.',
  '연회에서 공작부인이 내 이름을 불렀다. 틀린 이름이었다. 고쳐 드리지 않았다.',
  '정원에서 두 후작이 낮은 목소리로 말다툼을 했다. 나를 보자 웃으며 날씨 이야기를 시작했다.',
  '시종장이 내게 다음 사냥 대회의 자리를 하나 주었다. 대가는 나중에 말하겠다고 했다.',
  '왕궁 예배당의 미사에 나갔다. 기도하는 사람보다 누가 왔는지 세는 사람이 더 많았다.',
  '어전 회의가 끝나고 문이 열렸다. 나온 사람들의 얼굴만 보고도 누가 이겼는지 알 수 있었다.',
];
ACTIONS.push({
  id: 'court_attend', name: '궁정에 나가기', icon: 'crown', place: [COURT],
  desc: '왕궁에 들어가 얼굴을 알리고 줄을 선다. 이름값이 쌓이면 관직이 들어오고, 원수도 생긴다.',
  available: (g) => isAdult(g) && atCourt(g) && !courtAccess(g),
  run(g, rng) {
    const c = C(g);
    if (!atCourt(g) || courtAccess(g)) return '궁정 문지기가 창을 엇갈려 막았다.';
    tired(g, 8);
    const ch = gainStat(g, 'cha', 0.5);
    let gain = rng.float(1.5, 3) + g.player.stats.cha / 40 + (c.patron ? 0.8 : 0);
    if (D(g)) gain += 1;
    if (c.standing > 60) gain *= 0.6;
    addStanding(g, gain);
    // 차림새: 궁정은 돈을 먹는다
    let cost = '';
    if (!spend(g, 2)) { addStanding(g, -1); cost = ' 낡은 옷소매를 보고 시종 하나가 코웃음을 쳤다.'; }
    // 가문 사람 하나를 알게 된다
    const hs = houses(g);
    let met = '';
    if (hs.length && rng.chance(0.45)) {
      const h = rng.pick(hs);
      const p = courtier(g, rng, h.id);
      if (p && !p.known) { p.known = true; p.affection = Math.max(p.affection, 8); met = ` ${J(who(p), '과/와')} 몇 마디를 나누었다.`; }
      else if (p) { p.affection = Math.min(100, p.affection + 2); }
    }
    // 이름값이 문턱을 넘으면 관직 제안
    const next = c.office + 1;
    if (next <= 3 && !sceneQueued(g, 'court_offer') && meetsOffice(g, next) && rng.chance(0.35)) queueScene(g, 'court_offer', { level: next });
    else if (!c.patron && c.standing >= 12 && !sceneQueued(g, 'court_patron') && rng.chance(0.2)) queueScene(g, 'court_patron', {});
    return `${rng.pick(COURT_LINES)}${met}${cost}${gains([up('매력', ch), up('궁정 이름값', gain)])}`;
  },
});
const meetsOffice = (g, lv) => {
  const n = OFFICE_NEED[lv];
  if (!n) return false;
  const c = C(g);
  return c.standing >= n.standing && (!n.favor || c.favor >= n.favor) && (!n.letters || g.player.skills.letters >= n.letters);
};
defineScene('court_offer', {
  title: (g, s) => `궁정 ${OFFICES[s.level] ?? '관직'}`,
  text: (g, s) => [
    '시종장이 나를 불렀다. 시종 자리가 하나 비었다고 했다. 녹봉은 쥐꼬리지만, 왕궁 안을 돌아다닐 수 있다.',
    '서기관 자리가 났다. 왕궁의 모든 문서가 서기관의 손을 거친다. 문서를 읽는 사람이 비밀을 안다.',
    '궁내관으로 천거되었다. 왕실의 살림과 의전을 맡는다. 대귀족들도 궁내관에게는 고개를 숙인다. 앞에서는.',
    `${rulerName(g)}께서 친히 나를 불러 재상의 인장을 내미셨다. 왕국의 일은 이제 내 책상을 거쳐 간다. 실패하면 목도 함께 간다.`,
  ][s.level] ?? '관직 제안이 왔다.',
  choices: (g, s) => {
    const c = C(g);
    if (!atCourt(g) || s.level !== c.office + 1 || disgraced(g)) return [];
    return [{ label: '받아들인다', key: 'yes' }, { label: '지금은 사양한다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'no') { addFavor(g, -3); return '정중하게 사양했다. 궁정은 사양을 오래 기억한다.'; }
    c.office = s.level;
    if (L(g).job?.id !== 'courtier') takeJob(g, 'courtier');
    addFavor(g, 5);
    note(g, `궁정 ${J(OFFICES[s.level], '이/가')} 되었다.`);
    chron(g, `${g.player.name}, 궁정 ${OFFICES[s.level]}에 오르다.`, s.level >= 2 ? 100 : 40);
    L(g).renown = (L(g).renown ?? 0) + s.level * 2;
    // 높은 자리는 시기를 부른다
    if (s.level >= 2) for (const h of houses(g)) if (h.id !== c.patron && !c.allies[h.id] && rng.chance(0.35)) addFoe(g, h.id, 15);
    return ['시종의 푸른 제복을 받았다. 소매가 조금 길었다.', '서기관의 깃펜과 인장을 받았다. 첫날 읽은 문서 하나로 공작 하나를 무너뜨릴 수 있다는 것을 알았다.', '궁내관의 열쇠 꾸러미를 받았다. 왕궁에서 내가 열 수 없는 문은 이제 몇 개 남지 않았다.', '재상의 인장을 받았다. 무거웠다. 이 무게 때문에 죽은 사람이 몇인지 세어 보지 않기로 했다.'][s.level];
  },
});

/* ---------- 뒤를 봐줄 가문, 미는 왕자 ---------- */
defineScene('court_patron', {
  title: () => '줄을 서다',
  text: (g) => {
    const lines = houses(g).slice(0, 4).map((h) => `${houseName(h)}(${h.head}, ${h.side ? `${PRINCE[h.side]} 편` : '어느 편도 아님'})`);
    return `궁정에서 혼자 서 있는 사람은 바람에 쓰러진다. 누군가의 그늘에 들어가야 한다. ${lines.join(', ')}.${sideOpen(g) ? ' 그리고 왕위를 두고 두 왕자가 사람을 모으고 있다.' : ''}`;
  },
  choices: (g) => {
    if (!atCourt(g) || courtAccess(g)) return [];
    const out = houses(g).slice(0, 4).map((h) => ({ label: `${houseName(h)}의 사람이 된다`, key: `h:${h.id}` }));
    if (sideOpen(g)) for (const k of ['rudolf', 'erik']) if (C(g).side !== k && (k === 'rudolf' ? g.realm.rudolf.alive : g.realm.erik.alive)) out.push({ label: `${PRINCE[k]}에게 충성을 맹세한다`, key: `p:${k}` });
    out.push({ label: '아무에게도 매이지 않는다', key: 'none' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'none') return '모두에게 웃고 아무에게도 약속하지 않았다. 그런 사람은 오래 살아남지만 높이 오르지는 못한다.';
    if (key.startsWith('p:')) return pickSide(g, key.slice(2));
    const h = houseById(g, key.slice(2));
    if (!h) return '그 가문은 이미 무너졌다.';
    c.patron = h.id; addAlly(g, h.id, 25); addStanding(g, 4);
    for (const o of houses(g)) if (o.id !== h.id && o.side && h.side && o.side !== h.side) addFoe(g, o.id, 8);
    if (h.side && sideOpen(g) && !c.side) c.side = h.side;
    note(g, `${houseName(h)}의 사람이 되었다.`);
    return `${h.head} ${h.title}이 내 손을 잡고 흔들었다. "${h.name}의 사람은 ${h.name}가 지킨다." 그 말은 반대로도 읽힌다. ${h.name}가 무너지면 나도 함께 무너진다.`;
  },
});
function pickSide(g, k) {
  const c = C(g);
  c.side = k;
  const n = Math.round(1 + c.standing / 20 + (D(g) ? 2 : 0));
  nudge(g, 'rudolf', k === 'rudolf' ? n : -n);
  note(g, `${PRINCE[k]}에게 충성을 맹세했다.`);
  chron(g, `${g.player.name}, 왕위 다툼에서 ${PRINCE[k]} 편에 서다.`, 60);
  return k === 'rudolf'
    ? '루돌프 왕자의 손등에 입을 맞췄다. 왕자는 나를 보지도 않고 고개를 끄덕였다. 그의 뒤에는 대귀족들과, 검은 장갑의 돈이 있다는 소문이 있다.'
    : '에릭 왕자는 내 손을 맞잡았다. 젊고, 곧았다. 그런 사람이 궁정에서 얼마나 버틸지는 모르겠다. 기사단이 그의 뒤에 있다.';
}
ACTIONS.push({
  id: 'court_side', name: '줄 대기', icon: 'crown', place: [COURT],
  desc: '뒤를 봐줄 가문을 고르거나, 왕위를 다투는 왕자 중 한 명에게 충성을 맹세한다.',
  available: (g) => atCourt(g) && !courtAccess(g) && (!C(g).patron || (sideOpen(g) && !C(g).side)) && !sceneQueued(g, 'court_patron'),
  run(g) { queueScene(g, 'court_patron', {}); return '누구의 그늘에 설지 따져 보았다.'; },
});

/* ---------- 혼인 동맹 ---------- */
ACTIONS.push({
  id: 'court_match', name: '혼인 동맹', icon: 'heart', place: [COURT],
  desc: '귀족 가문과 혼인으로 손을 잡는다. 나 자신이, 아니면 내 아이가. 지참금과 이름값이 든다.',
  available: (g) => atCourt(g) && !courtAccess(g) && C(g).standing >= 20 && (!me(g).spouseId || matchableKids(g).length > 0) && !sceneQueued(g, 'court_marriage'),
  run(g) { queueScene(g, 'court_marriage', {}); return '혼처를 알아보는 중매인을 불렀다.'; },
});
const matchableKids = (g) => me(g).childIds.map((id) => byId(g, id)).filter((k) => k?.alive && !k.spouseId && Math.floor(k.ageMonths / 12) >= 15);
const dowry = (g, h) => Math.round(60 + h.power * 2 - C(g).standing);
defineScene('court_marriage', {
  title: () => '혼인 동맹',
  text: (g) => `중매인이 명부를 펼쳤다. "${C(g).standing >= 50 ? '이 정도 이름이면 공작가도 문을 엽니다.' : '높은 집안은 아직 어렵습니다. 그래도 길은 있지요.'}" 사랑은 명부에 적혀 있지 않다. 지참금과 동맹과 원수가 적혀 있다.`,
  choices: (g) => {
    if (!atCourt(g) || courtAccess(g)) return [];
    const c = C(g);
    const out = [];
    const hs = houses(g).filter((h) => !c.marriages.some((m) => m.house === h.id) && h.power <= 30 + c.standing * 1.1).slice(0, 3);
    for (const h of hs) {
      if (!me(g).spouseId && playerAge(g) <= 50) out.push({ label: `내가 ${houseName(h)}와 혼인한다 (지참금 은화 ${dowry(g, h)}닢)`, key: `me:${h.id}` });
      const kid = matchableKids(g)[0];
      if (kid) out.push({ label: `${J(kid.name, '을/를')} ${houseName(h)}에 보낸다 (지참금 은화 ${Math.round(dowry(g, h) / 2)}닢)`, key: `kid:${h.id}` });
    }
    if (!out.length) return [];
    out.push({ label: '아직은 아니다', key: 'no' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'no') return '명부를 덮었다. 중매인은 다음 계절에 다시 오겠다고 했다.';
    const [kind, id] = key.split(':');
    const h = houseById(g, id);
    if (!h) return '그 가문은 그사이 무너졌다.';
    const kid = kind === 'kid' ? matchableKids(g)[0] : null;
    if (kind === 'me' && me(g).spouseId) return '나는 이미 혼인했다.';
    if (kind === 'kid' && !kid) return '보낼 아이가 없다.';
    const cost = kind === 'me' ? dowry(g, h) : Math.round(dowry(g, h) / 2);
    if (!spend(g, cost)) return `지참금 은화 ${cost}닢을 마련하지 못했다. 중매인이 명부를 덮었다. 궁정에 소문이 도는 데는 사흘이면 충분하다.`;
    const want = kind === 'me' ? (g.player.sex === 'm' ? 'f' : 'm') : (kid.sex === 'm' ? 'f' : 'm');
    // 그 집안의 짝: 이미 알던 사람이 맞으면 그 사람, 아니면 새로
    let p = courtier(g, rng, h.id, { sex: want });
    if (!p || p.sex !== want || p.spouseId) { delete c.courtiers[h.id]; p = courtier(g, rng, h.id, { sex: want }); }
    if (!p) return '혼담이 깨졌다.';
    c.marriages.push({ house: h.id, who: kind === 'me' ? g.player.id : kid.id, at: mi(g) });
    addAlly(g, h.id, 60); addStanding(g, 8);
    delete c.foes[h.id];
    if (!c.patron) c.patron = h.id;
    h.power = Math.min(100, h.power + 2);
    chron(g, `${kind === 'me' ? g.player.name : kid.name}, ${houseName(h)}의 ${J(p.name, '과/와')} 혼인하다.`, 70);
    if (kind === 'me') {
      p.known = true; p.affection = Math.max(p.affection, 25);
      marry(g, p);
      return `${J(who(p), '과/와')} 왕궁 예배당에서 혼인했다. 하객석의 절반은 ${h.name}가의 사람이었고 나머지 절반은 그들을 지켜보러 온 사람이었다. 신혼 첫날 밤, ${J(p.name, '은/는')} 창밖을 보며 말했다. "우리 집안을 실망시키지 마세요." 이것도 혼인이다.`;
    }
    kid.spouseId = p.id; p.spouseId = kid.id; p.bond = 'spouse';
    p.known = true;
    remember(g, kid, `${h.name}가로 혼인을 보냈다`, kid.affection > 40 ? 0 : -1, { tag: 'arranged' });
    return `${J(kid.name, '은/는')} ${J(who(p), '과/와')} 혼인했다. 떠나는 날 ${J(kid.name, '은/는')} 뒤를 돌아보지 않았다. ${h.name}가의 깃발이 내 집 문에도 걸렸다.`;
  },
});

/* ---------- 음모: 첩자, 소문, 협박, 독살 ---------- */
const PLOTS = {
  spy: { name: '첩자 심기', cost: 25, desc: '그 집안의 하인을 매수해 귀를 심는다. 비밀이 들어온다.' },
  rumor: { name: '소문 퍼뜨리기', cost: 8, desc: '연회와 빨래터에 그 집안의 추문을 흘린다. 세가 꺾인다.' },
  blackmail: { name: '협박', cost: 0, desc: '쥐고 있는 비밀로 그 집안에서 돈이나 자리를 뜯어낸다.' },
  poison: { name: '독살', cost: 40, desc: '그 집안의 가장을 독으로 없앤다. 들키면 목이 달아난다.' },
};
ACTIONS.push({
  id: 'court_plot', name: '음모', icon: 'scroll', place: [COURT],
  desc: '귀족 가문을 상대로 첩자를 심고, 소문을 퍼뜨리고, 협박하고, 독을 쓴다. 들킬수록 위험이 쌓인다.',
  available: (g) => atCourt(g) && !courtAccess(g) && C(g).standing >= 10 && houses(g).length > 0 && !sceneQueued(g, 'court_plot'),
  run(g) { queueScene(g, 'court_plot', { step: 'pick' }); return '밤늦게 촛불을 켜고 궁정 명부를 펼쳤다.'; },
});
defineScene('court_plot', {
  title: (g, s) => (s.step === 'pick' ? '누구를 노릴까' : PLOTS[s.plot]?.name ?? '음모'),
  text: (g, s) => {
    const c = C(g);
    if (s.step === 'pick') return `${houses(g).slice(0, 5).map((h) => `${houseName(h)}: 가장 ${h.head}, 세력 ${Math.round(h.power)}${c.foes[h.id] >= 30 ? ', 나를 미워한다' : ''}${c.spies[h.id] ? ', 내 첩자가 있다' : ''}`).join('. ')}.${c.heat >= 40 ? ' 요즘 누군가 내 뒤를 캐고 있다는 느낌이 든다.' : ''}`;
    const h = houseById(g, s.house);
    return `${h ? houseName(h) : '그 가문'}. ${PLOTS[s.plot]?.desc ?? ''}`;
  },
  choices: (g, s) => {
    const c = C(g);
    if (!atCourt(g) || courtAccess(g)) return [];
    if (s.step === 'pick') {
      const out = houses(g).filter((h) => !c.marriages.some((m) => m.house === h.id)).slice(0, 5).map((h) => ({ label: `${houseName(h)}를 노린다`, key: `h:${h.id}` }));
      if (!out.length) return [];
      out.push({ label: '촛불을 끈다', key: 'no' });
      return out;
    }
    if (!houseById(g, s.house)) return [];
    const out = [];
    for (const [k, v] of Object.entries(PLOTS)) {
      if (k === 'blackmail' && !c.secrets.some((x) => x.house === s.house)) continue;
      out.push({ label: `${v.name}${v.cost ? ` (은화 ${v.cost}닢)` : ''}`, key: k });
    }
    out.push({ label: '그만둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '촛불을 껐다. 오늘 밤은 아니다.';
    if (s.step === 'pick') { queueScene(g, 'court_plot', { step: 'how', house: key.slice(2) }, { first: true }); return '그 이름 위에 손가락을 올려놓았다.'; }
    return runPlot(g, rng, s.house, key);
  },
});
function plotPower(g) {
  const p = g.player;
  return p.stats.int * 0.35 + p.stats.cha * 0.3 + p.stats.sen * 0.2 + (craftOf(g) ?? 0) * 0.3 + C(g).standing * 0.15;
}
function runPlot(g, rng, id, kind) {
  const c = C(g);
  const h = houseById(g, id);
  if (!h) return '그 가문은 이미 무너졌다.';
  const P = PLOTS[kind];
  if (!P) return '';
  if (P.cost && !spend(g, P.cost)) return `은화 ${P.cost}닢이 없다. 음모에도 돈이 든다.`;
  tired(g, 6);
  const guard = 30 + h.power * 0.3 + (c.spies[id] ? -8 : 0);
  if (kind === 'spy') {
    if (check(rng, plotPower(g), guard)) {
      c.spies[id] = mi(g);
      const what = rng.pick(['가장이 왕실 금고에서 빼돌린 돈의 장부', '맏아들이 검은 장갑에 진 빚', '안주인과 근위대장의 밀회', '발하르트 사절과 주고받은 편지', '죽은 선대 가장의 사인에 관한 하녀의 증언', '영지에서 몰래 걷는 세금']);
      c.secrets.push({ house: id, what, power: rng.int(1, 3), at: mi(g) });
      if (c.secrets.length > 12) c.secrets.shift();
      return `${h.name}가의 마부를 은화로 샀다. 석 달 뒤 그가 쪽지를 가져왔다. ${what}. 이 종이 한 장이 칼보다 무겁다.`;
    }
    c.heat = clamp(c.heat + 15, 0, 100); addFoe(g, id, 20);
    return `매수하려던 하인이 그날 밤 주인에게 모든 것을 털어놓았다. ${h.head} ${h.title}은 이제 내 이름을 안다.`;
  }
  if (kind === 'rumor') {
    if (check(rng, plotPower(g) + 5, guard - 10)) {
      h.power = Math.max(5, h.power - rng.int(3, 7)); addStanding(g, 1);
      chron(g, `왕도에 ${houseName(h)}에 관한 추문이 돌다.`, 30);
      return `${rng.pick(['가장이 밤마다 사창가에 드나든다는', '그 집 맏아들이 사실은 마부의 아들이라는', '영지 사람들이 굶는 동안 그 집 연회에는 백조 고기가 오른다는', '가장이 검은 새벽의 집회에서 목격되었다는'])} 소문이 열흘 만에 왕도를 한 바퀴 돌았다. ${h.name}가의 사람들이 연회에 나오지 않았다.`;
    }
    c.heat = clamp(c.heat + 8, 0, 100); addFoe(g, id, 12);
    return '소문은 퍼졌지만, 누가 퍼뜨렸는지도 함께 퍼졌다.';
  }
  if (kind === 'blackmail') {
    const sec = c.secrets.find((x) => x.house === id);
    if (!sec) return '쥐고 있는 비밀이 없다.';
    c.secrets = c.secrets.filter((x) => x !== sec);
    addFoe(g, id, 25);
    if (h.temper === 'bold' && rng.chance(0.4)) {
      queueAssassin(g, rng, h);
      return `${h.head} ${h.title}에게 쪽지를 보냈다. "${sec.what}". 답장은 오지 않았다. 대신 사흘 뒤부터 집 앞에 낯선 사내들이 서성이기 시작했다.`;
    }
    const money = 30 * sec.power + Math.round(h.wealth ?? 40);
    g.player.money += money;
    addStanding(g, sec.power * 2);
    addNotoriety(g, 2);
    return `${h.head} ${h.title}에게 쪽지를 보냈다. "${sec.what}". 이튿날 하인이 묵직한 주머니를 가져왔다. 은화 ${money}닢. 그리고 다음 어전 회의에서 ${h.name}가는 내 편을 들었다. 이를 갈면서.`;
  }
  // 독살
  if (check(rng, plotPower(g) + (c.spies[id] ? 12 : 0), guard + 15)) {
    const old = h.head;
    h.power = Math.max(5, h.power - rng.int(8, 15));
    h.head = rng.pick(['테오도르', '레오폴트', '아달베르트', '프리드리히', '오토', '루트비히', '마르가레테', '아델하이트']);
    h.age = rng.int(18, 40); h.gen = (h.gen ?? 1) + 1;
    c.heat = clamp(c.heat + rng.int(10, 25), 0, 100);
    addNotoriety(g, 5);
    chron(g, `${houseName(h)}의 가장 ${old}, 연회 뒤 갑자기 숨지다. 독이라는 말이 돈다.`, 100);
    note(g, `${houseName(h)}의 가장 ${J(old, '을/를')} 독살했다.`);
    return `${old}의 술잔에 하녀가 무언가를 떨어뜨렸다. 연회가 끝날 무렵 그는 가슴을 움켜쥐고 쓰러졌다. 궁정 의사는 심장이라고 했다. 아무도 믿지 않았다. 새 가장 ${J(h.head, '은/는')} 장례식에서 하객 한 사람 한 사람의 얼굴을 오래 보았다.`;
  }
  c.heat = clamp(c.heat + 35, 0, 100); addFoe(g, id, 50);
  if (c.heat >= 70 || rng.chance(0.4)) { queueScene(g, 'court_fall', { why: 'poison', house: id }, { first: true }); return `독을 탄 하녀가 붙잡혔다. 고문대 위에서 그녀가 누구의 이름을 댔을지는 뻔하다.`; }
  return `${J(h.head, '은/는')} 그 잔을 마시지 않았다. 대신 개에게 먹였다. 개가 죽었다. ${h.name}가는 이제 누군가 자기들을 노린다는 것을 안다.`;
}
function queueAssassin(g, rng, h) {
  queueFight(g, rng, { title: '밤의 손님', intro: `${h.name}가가 보낸 자객들이 창문을 넘어 들어왔다.`, enc: { unit: 'thug', count: rng.int(2, 3), leader: rng.chance(0.5) ? 'bounty_hunter' : null }, reward: { money: 8 }, avoidLabel: '뒷문으로 달아난다', avoidText: '맨발로 뒷골목을 달렸다. 뒤에서 내 집 문이 부서지는 소리가 났다.' });
}

/* ---------- 매달: 궁정의 흐름 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const c = C(g);
  const r = g.realm;
  // 궁정을 떠나 있으면 이름은 잊힌다
  if (here(g) !== COURT && c.standing > 0) c.standing = Math.max(0, c.standing - (c.office >= 0 ? 0.6 : 0.3));
  c.heat = Math.max(0, c.heat - 1.2);
  // 관직은 궁정에 있어야 지킨다
  if (c.office >= 0 && L(g).job?.id !== 'courtier') { c.office = -1; note(g, '궁정 관직에서 물러났다.'); }
  // 원한은 천천히 식는다
  for (const k of Object.keys(c.foes)) { c.foes[k] = Math.max(0, c.foes[k] - 0.3); if (!c.foes[k] || !houseById(g, k)) delete c.foes[k]; }
  if (c.patron && !houseById(g, c.patron)) { note(g, '뒤를 봐주던 가문이 무너졌다.'); c.patron = null; addStanding(g, -10); }
  // 왕이 바뀌었다
  if (r && r.ruler !== c.lastRuler) {
    const prev = c.lastRuler;
    c.lastRuler = r.ruler;
    if (c.side && ['rudolf', 'erik'].includes(r.ruler) && prev !== r.ruler && !sceneQueued(g, 'court_turn')) queueScene(g, 'court_turn', { won: c.side === r.ruler, ruler: r.ruler }, { first: true });
  }
  if (!isAdult(g) || traveling(g) || isJailed(g) || L(g).queue.length || mi(g) - c.sceneAt < 5) return;
  // 원수 가문의 반격
  const foe = Object.entries(c.foes).filter(([, v]) => v >= 40).sort((a, b) => b[1] - a[1])[0];
  if (foe && rng.chance(foe[1] / 400)) { c.sceneAt = mi(g); queueScene(g, 'court_strike', { house: foe[0] }); return; }
  // 음모가 쌓여 들통난다
  if (c.heat >= 55 && rng.chance((c.heat - 40) / 200)) { c.sceneAt = mi(g); queueScene(g, 'court_fall', { why: 'heat' }); return; }
  // 궁정의 작은 일 (관직이 있거나 이름이 있을 때)
  if (atCourt(g) && !courtAccess(g) && c.standing >= 15 && rng.chance(0.12)) { c.sceneAt = mi(g); queueScene(g, 'court_affair', { affair: rng.int(0, AFFAIRS.length - 1), house: rng.pick(houses(g))?.id ?? null }); }
});

/* ---------- 원수 가문의 반격 ---------- */
defineScene('court_strike', {
  title: (g, s) => `${houseById(g, s.house)?.name ?? '원수'}가의 반격`,
  text: (g, s) => {
    const h = houseById(g, s.house);
    return h ? `${houseName(h)}가 움직였다. ${C(g).office >= 0 ? `어전 회의에서 ${J(h.head, '이/가')} 내 장부에 구멍이 있다고 고발했다.` : `${J(h.head, '이/가')} 연회에서 내 출신을 들먹이며 비웃었다. 웃음소리가 오래 이어졌다.`}` : '원수가 움직였다.';
  },
  choices: (g, s) => {
    if (!houseById(g, s.house) || !atCourt(g)) return [];
    const out = [{ label: '정면으로 반박한다', key: 'argue' }];
    if (C(g).secrets.some((x) => x.house === s.house)) out.push({ label: '쥐고 있는 비밀을 슬쩍 내비친다', key: 'secret' });
    if (C(g).patron && C(g).patron !== s.house) out.push({ label: '뒤를 봐주는 가문에 도움을 청한다', key: 'patron' });
    out.push({ label: '고개를 숙이고 사과한다', key: 'bow' });
    out.push({ label: '결투를 청한다', key: 'duel' });
    return out;
  },
  resolve(g, rng, s, key) {
    const c = C(g);
    const h = houseById(g, s.house);
    if (!h) return '그 가문은 이미 무너졌다.';
    if (key === 'secret') { const i = c.secrets.findIndex((x) => x.house === s.house); if (i >= 0) c.secrets.splice(i, 1); c.foes[s.house] = Math.max(0, (c.foes[s.house] ?? 0) - 30); addStanding(g, 3); return `${h.head}에게만 들리게 한 단어를 말했다. 그의 얼굴이 하얘졌다. 고발은 다음 날 조용히 거두어졌다.`; }
    if (key === 'patron') { addAlly(g, c.patron, -10); c.foes[s.house] = Math.max(0, (c.foes[s.house] ?? 0) - 20); return `${houseById(g, c.patron)?.name ?? '후원'}가가 나서서 일을 덮었다. 빚을 하나 졌다. 궁정에서 빚은 꼭 받아 간다.`; }
    if (key === 'bow') { addStanding(g, -6); c.foes[s.house] = Math.max(0, (c.foes[s.house] ?? 0) - 25); stress(g, 10); return '무릎을 꿇었다. 웃음소리가 들렸다. 그래도 목은 붙어 있다.'; }
    if (key === 'duel') {
      queueFight(g, rng, { title: '궁정 결투', intro: `${h.name}가의 대리 검사가 나섰다. 궁정 정원에 사람들이 둘러섰다.`, enc: { unit: 'noble_cadet', count: 1, leader: null }, reward: { renown: 3 }, avoidLabel: '결투를 거둔다', avoidText: '칼을 거두었다. 겁쟁이라는 말이 등 뒤에 붙었다.' });
      c.foes[s.house] = Math.max(0, (c.foes[s.house] ?? 0) - 15);
      return '장갑을 던졌다. 궁정에서는 여전히 칼로 끝나는 일도 있다.';
    }
    // 반박
    if (check(rng, g.player.stats.cha * 0.5 + g.player.stats.int * 0.4 + c.standing * 0.2, 35 + h.power * 0.2)) { addStanding(g, 4); h.power = Math.max(5, h.power - 2); return '하나하나 반박했다. 회의실이 조용해졌다. 마지막에 웃은 사람은 나였다.'; }
    addStanding(g, -8); addFavor(g, -6);
    if (c.office >= 0 && rng.chance(0.3)) return fall(g, rng, '고발', s.house);
    return '말이 꼬였다. 회의가 끝난 뒤 사람들이 나를 피해 걸었다.';
  },
});

/* ---------- 실각 ---------- */
defineScene('court_fall', {
  title: () => '실각',
  text: (g, s) => (s.why === 'poison'
    ? `근위대가 새벽에 문을 두드렸다. ${houseById(g, s.house)?.name ?? '어느'}가의 가장을 독살하려 한 죄. 증인은 하녀 한 명, 증거는 그녀가 숨긴 독병 하나.`
    : '어전 회의에 들어가자 모두의 눈길이 나를 피했다. 탁자 위에 내 이름이 적힌 서류 묶음이 놓여 있었다. 그동안 한 일들이 날짜순으로 적혀 있었다.'),
  choices: (g) => (isJailed(g) ? [] : [
    { label: '왕 앞에 엎드려 자비를 구한다', key: 'mercy' },
    { label: '모든 것을 부인한다', key: 'deny' },
    { label: '다른 귀족에게 죄를 떠넘긴다', key: 'blame' },
    { label: '왕도를 떠나 달아난다', key: 'flee' },
  ]),
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'flee') {
      fall(g, rng, s.why, s.house, { quiet: true });
      const life = L(g);
      const to = 'harfen';
      life.travel = { to, left: Math.max(1, travelMonths(life.place, to)), from: life.place };
      addNotoriety(g, 5);
      return '그날 밤 말 한 필에 짐을 싣고 성문을 빠져나갔다. 등 뒤로 왕궁의 불빛이 멀어졌다. 궁정에서 내 이름은 이제 반역자다.';
    }
    if (key === 'blame') {
      const h = rng.pick(houses(g).filter((x) => x.id !== c.patron && x.id !== s.house));
      if (h && check(rng, plotPower(g), 50)) { h.power = Math.max(5, h.power - 10); addFoe(g, h.id, 60); c.heat = Math.max(0, c.heat - 40); chron(g, `${houseName(h)}가 음모의 배후로 몰려 궁정에서 쫓겨나다.`, 70); return `서류 묶음 속 날짜 몇 개를 ${houseName(h)}의 행적과 맞추어 보였다. 회의실의 눈길이 그쪽으로 옮겨 갔다. ${J(h.head, '은/는')} 끌려 나가며 나를 노려보았다.`; }
    }
    if (key === 'deny' && check(rng, g.player.stats.wil * 0.5 + g.player.stats.cha * 0.4, s.why === 'poison' ? 60 : 45)) { c.heat = Math.max(0, c.heat - 25); addStanding(g, -10); return '하나도 인정하지 않았다. 증거는 정황뿐이었다. 왕은 오래 나를 보다가 손을 저었다. 무죄. 하지만 궁정은 무죄를 믿지 않는다.'; }
    if (key === 'mercy') addFavor(g, 5);
    return fall(g, rng, s.why, s.house);
  },
});
function fall(g, rng, why, houseId, { quiet = false } = {}) {
  const c = C(g);
  const years = why === 'poison' ? 10 : why === 'lost' ? 6 : 4;
  c.disgrace = mi(g) + years * 12;
  c.office = -1; c.standing = Math.round(c.standing * 0.3); c.favor = 0; c.heat = 0; c.side = why === 'lost' ? null : c.side;
  if (L(g).job?.id === 'courtier') leaveJob(g, '궁정에서 쫓겨나며 관직을 잃었다.');
  note(g, '궁정에서 실각했다.');
  chron(g, `${g.player.name}, 궁정에서 실각하다.`, 80);
  if (quiet) return '';
  // 독살 미수는 목숨까지
  if (why === 'poison' && rng.chance(0.25) && c.favor < 30) {
    L(g).pendingDeath = '참수';
    return '판결은 짧았다. 귀족 살해 미수, 참수. 마지막 날 아침, 감옥 창으로 왕궁의 첨탑이 보였다. 저기까지 올라갔었다.';
  }
  const fine = Math.min(g.player.money, why === 'poison' ? 200 : 80);
  g.player.money -= fine;
  if (why === 'poison') { jail(g, 18); return `목숨은 건졌다. 재산 가운데 은화 ${fine}닢을 몰수당하고 감옥에 갇혔다. ${years}년 동안 궁정 근처에는 얼씬도 하지 말라는 판결이었다.`; }
  return `관직과 인장을 내놓았다. 은화 ${fine}닢의 벌금. ${years}년 동안 궁정 출입 금지. 어제까지 내 손에 입 맞추던 사람들이 오늘은 내 이름을 모른다고 한다.`;
}

/* ---------- 왕이 바뀐 뒤: 이긴 편, 진 편 ---------- */
defineScene('court_turn', {
  title: (g, s) => (s.won ? '이긴 편' : '진 편'),
  text: (g, s) => (s.won
    ? `${rulerName(g)}의 대관식. 나는 앞줄에 서 있었다. 새 왕이 나를 보고 고개를 끄덕였다. 왕위 다툼 동안 곁에 있었던 사람을 왕은 잊지 않는다. 적어도 첫 한 해는.`
    : `${rulerName(g)}의 대관식. 나는 초대받지 못했다. 반대편에 섰던 귀족들의 이름이 하나씩 궁정 명부에서 지워지고 있다는 소식이 들렸다.`),
  choices: (g, s) => (s.won
    ? [{ label: '보상을 청한다 (관직)', key: 'office' }, { label: '보상을 청한다 (은화)', key: 'gold' }, { label: '아무것도 청하지 않는다', key: 'none' }]
    : [{ label: '새 왕에게 충성을 맹세하러 간다', key: 'kneel' }, { label: '조용히 왕도를 떠난다', key: 'leave' }, { label: '진 왕자의 편에 남는다', key: 'stay' }]),
  resolve(g, rng, s, key) {
    const c = C(g);
    if (s.won) {
      addFavor(g, 30); addStanding(g, 15);
      if (key === 'office') {
        const lv = Math.min(3, c.office + 1);
        if (lv >= 0 && L(g).job?.id !== 'courtier' && here(g) === COURT) { c.office = Math.max(0, lv); takeJob(g, 'courtier'); }
        else if (L(g).job?.id === 'courtier') c.office = lv;
        else { addStanding(g, 5); return '관직을 청했지만 나는 왕도에 없었다. 왕은 기억해 두겠다고 했다.'; }
        return `새 왕이 직접 궁정 ${OFFICES[c.office]}의 인장을 건넸다.`;
      }
      if (key === 'gold') { const n = 150 + c.standing * 2; g.player.money += n; return `왕실 금고에서 은화 ${n}닢이 내려왔다. 진 편의 몰수 재산에서 나온 돈이라고 했다.`; }
      addFavor(g, 10);
      return '아무것도 청하지 않았다. 왕이 처음으로 나를 오래 보았다. "드문 사람이군." 그 말이 어떤 보상보다 값질지 모른다.';
    }
    if (key === 'kneel') {
      if (check(rng, g.player.stats.cha * 0.6 + c.standing * 0.3, 45)) { c.side = null; addStanding(g, -10); return '새 왕 앞에 무릎을 꿇었다. 왕은 한참 동안 대답하지 않았다. 그리고 손을 내밀었다. 입을 맞췄다. 목숨과 이름 반쪽을 건졌다.'; }
      return fall(g, rng, 'lost');
    }
    if (key === 'leave') { fall(g, rng, 'lost', null, { quiet: true }); c.side = null; return '짐을 꾸려 왕도를 떠났다. 쫓겨나기 전에 떠나는 것이 진 편이 할 수 있는 유일한 선택이다.'; }
    addNotoriety(g, 3); c.heat = clamp(c.heat + 30, 0, 100);
    return '진 왕자의 문장을 내리지 않았다. 충성인지 고집인지 나도 모르겠다. 새 왕의 밀정들이 내 이름을 적어 갔다.';
  },
});

/* ---------- 궁정의 작은 일 ---------- */
const AFFAIRS = [
  { title: '사냥 대회', text: (h) => `왕실 사냥 대회. ${h ? `${houseName(h)}의 ${J(h.head, '이/가')}` : '대귀족 하나가'} 사슴을 쏘려다 말에서 떨어질 뻔했다. 내가 가장 가까이 있었다.`, choices: [['고삐를 잡아 준다', 'help'], ['못 본 척한다', 'none'], ['웃음을 참지 못한다', 'laugh']] },
  { title: '외국 사절', text: () => '발하르트 사절이 연회에서 레오니아 왕실을 비꼬는 건배를 했다. 아무도 나서지 않았다. 다들 서로의 얼굴만 보았다.', choices: [['재치 있게 받아친다', 'wit'], ['칼자루에 손을 얹는다', 'steel'], ['가만히 있는다', 'none']] },
  { title: '흘린 편지', text: (h) => `복도에 봉인된 편지 한 통이 떨어져 있었다. ${h ? `${h.name}가의 문장` : '낯선 문장'}이 찍혀 있다.`, choices: [['몰래 읽는다', 'read'], ['주인에게 돌려준다', 'return'], ['그 자리에 두고 간다', 'none']] },
  { title: '왕의 병', text: (h, g) => (g.realm?.king?.alive && g.realm.ruler === 'oswald' ? `${g.realm.king.name}께서 또 쓰러지셨다. 궁정 의사는 나이 탓이라고 한다. 시녀들은 수프 그릇을 나르는 손이 매번 다르다고 수군거린다.` : '새 왕의 시식관이 갑자기 바뀌었다. 전임자는 어디로 갔는지 아무도 말하지 않는다.'), choices: [['수프 그릇의 행방을 캔다', 'probe'], ['입을 다문다', 'none']] },
];
defineScene('court_affair', {
  title: (g, s) => AFFAIRS[s.affair]?.title ?? '궁정',
  text: (g, s) => AFFAIRS[s.affair]?.text(houseById(g, s.house), g) ?? '궁정에서 일이 생겼다.',
  choices: (g, s) => (!atCourt(g) || !AFFAIRS[s.affair] ? [] : AFFAIRS[s.affair].choices.map(([label, key]) => ({ label, key }))),
  resolve(g, rng, s, key) {
    const c = C(g);
    const h = houseById(g, s.house);
    if (key === 'none') return '아무것도 하지 않았다. 궁정에서는 그것도 선택이다.';
    if (key === 'help') { addAlly(g, h?.id, 15); addStanding(g, 3); return `고삐를 낚아챘다. ${J(h ? h.head : '그', '은/는')} 숨을 몰아쉬며 내 이름을 물었다.`; }
    if (key === 'laugh') { addFoe(g, h?.id, 20); addStanding(g, 1); return '웃음이 터졌다. 몇 사람이 따라 웃었다. 넘어질 뻔한 사람은 웃지 않았다.'; }
    if (key === 'wit') { if (check(rng, g.player.stats.cha * 0.6 + g.player.stats.int * 0.3, 35)) { addFavor(g, 8); addStanding(g, 5); return '건배를 되받아 사절의 황제를 꼬집었다. 연회장이 웃음으로 무너졌다. 다음 날 왕이 내 이름을 물었다고 한다.'; } addStanding(g, -3); return '받아쳤지만 말이 엉켰다. 사절이 정중하게 웃었다. 그게 더 아팠다.'; }
    if (key === 'steel') { addFavor(g, 3); nudge(g, 'tension', 2); return '칼자루에 손을 얹자 사절의 웃음이 멎었다. 왕은 기뻐했고, 외교관들은 머리를 싸맸다.'; }
    if (key === 'read') {
      if (h) { c.secrets.push({ house: h.id, what: rng.pick(['다른 가문과의 밀약', '왕자 하나에게 보낸 충성 서약', '빚 독촉장']), power: 1, at: mi(g) }); if (c.secrets.length > 12) c.secrets.shift(); }
      if (rng.chance(0.2)) { addFoe(g, h?.id, 25); return '읽고 다시 봉하려는데 누군가 모퉁이를 돌아왔다. 눈이 마주쳤다.'; }
      return '촛불에 봉랍을 데워 열었다가 다시 붙였다. 아무도 모를 것이다. 나만 안다.';
    }
    if (key === 'return') { addAlly(g, h?.id, 10); addStanding(g, 2); return '편지를 돌려주자 상대가 봉인을 오래 살폈다. 뜯긴 흔적이 없자 처음으로 웃었다.'; }
    if (key === 'probe') {
      if (check(rng, plotPower(g), 55)) { c.secrets.push({ house: 'crown', what: '왕의 수프에 독을 타는 손', power: 3, at: mi(g) }); nudge(g, 'rudolf', -3); chron(g, '왕궁 주방의 시녀 하나가 사라지다.', 30); return '수프 그릇이 주방을 나와 침실에 닿기까지 다섯 손을 거쳤다. 그중 하나가 매번 같은 사람의 하인이었다. 그 이름을 나는 아무에게도 말하지 않았다. 아직은.'; }
      c.heat = clamp(c.heat + 20, 0, 100);
      return '주방을 기웃거리다 시종장에게 들켰다. "궁금한 게 많으시군." 그 말에 등골이 서늘해졌다.';
    }
    return '';
  },
});
