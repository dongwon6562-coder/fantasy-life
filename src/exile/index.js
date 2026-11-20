// 24단계: 유배와 망명. 상태는 g.exile 하나, 화면 연결점은 exileInfo(g).
// - 유배(banish): 궁정에서 실각하거나(court disgrace) 큰 죄로 오래 갇히게 되면(crime jailed) 유배형이 내려질 수 있다.
//   유배지(소금바위섬 염전 막사, 북쪽 장성 아래 수자리)에서 산다: 청원서 쓰기, 그곳 사람들과 일하기, 몰래 돌아오기.
//   해마다 사면 가능성(pardon)이 쌓이고, 왕이 바뀌면 대사면. 몰래 돌아오면(sneak) 고향에서 알아보는 사람이 생긴다.
// - 망명(asylum): 고향에서 쫓기는 몸이면 다른 나라로 달아난다(exile_flee). 받아 준 나라에 빚(debt)을 지고, 그 나라가 대가를 청한다.
// - 망명 궁정(court): 쫓겨난 왕자나 무너진 왕가가 남의 나라에 차린 작은 궁정. 들어가 귀환을 꾀한다(exile_plot → exile_return).
// - realms의 국외 추방(R.banned)·망명 서류(R.asylum)는 그대로 두고 그 위에 얹는다. 국경 장면은 끌려가는 길에 끼지 않게 지운다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat, gainSkill } from '../game.js';
import { byId, ageYears, makePerson } from '../npc.js';
import { PLACES, leaveJob } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, spend, canSpend, check, traveling } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { remember } from '../relations.js';
import { isJailed, crimeState, reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { courtState } from '../court/index.js';
import { politicsState } from '../politics/index.js';
import { REALMS } from '../realms/data.js';
import { realmState, realmOf } from '../realms/index.js';
import { rulerName } from '../world.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const alive = (p) => !!p && p.alive && !p.isPlayer;
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 89) ^ Math.imul(mi(g) * 61 + salt + 43, 2654435761)) | 0 });
const stat = (g, id) => g.player.stats?.[id] ?? 0;
const skill = (g, id) => g.player.skills?.[id] ?? 0;
const base = (g) => playerAge(g) >= 16 && !g.over && !L(g).heirPending;
const ready = (g) => base(g) && !traveling(g) && !isJailed(g) && !g.bondage?.slave && !g.army?.campaign && !g.army?.captive;
const short = (id) => REALMS[id]?.short ?? '먼 나라';
const citizen = (g) => realmState(g).citizen ?? 'leonia';

// 유배지
export const SITES = {
  saltrock: { name: '소금바위섬 염전 막사', how: '섬', folk: '염전 일꾼과 늙은 어부들', work: '염전에서 소금을 긁었다', place: 'saltrock' },
  graubel: { name: '북쪽 장성 아래 수자리', how: '변방', folk: '수자리 병사와 장성 아래 농가', work: '장성 돌을 날랐다', place: 'graubel' },
};
const SENDS = ['leonia', 'valhart', 'holy', 'free']; // 유배형이 있는 나라
const siteFor = (g, why) => (why === 'court' || citizen(g) === 'valhart' ? 'graubel' : 'saltrock');
// 망명을 받아 줄 만한 나라
const HOSTS = ['valhart', 'holy', 'serenia', 'free', 'march'];
const DEBT_WORD = (d) => (d >= 70 ? '갚을 길이 막막하다' : d >= 40 ? '무겁게 지고 있다' : d >= 15 ? '조금 남았다' : '거의 갚았다');
const PARDON_WORD = (p) => (p >= 70 ? '사면 소식이 곧 올 것 같다' : p >= 40 ? '궁정에서 이름이 오르내린다' : p >= 15 ? '편지가 몇 통 닿았다' : '아무도 기억하지 않는다');
const PLOT_WORD = (p) => (p >= 75 ? '배를 띄울 날을 센다' : p >= 45 ? '사람과 돈이 모인다' : p >= 20 ? '말만 무성하다' : '꿈같은 이야기다');

/* ---------- 상태 ---------- */
export function exileState(g) {
  g.exile ??= {};
  const v = g.exile;
  v.banish ??= null;   // { site, from, why, y, until, pardon, ties, sneak, seenAt }
  v.asylum ??= null;   // { realm, from, y, debt, asked }
  v.court ??= null;    // { id, name, prince, host, origin, y, plot, rank }
  v.seenDisgrace ??= 0;
  v.seenJail ??= null;
  v.ruler ??= {};      // 나라: 마지막으로 본 통치자 이름 (바뀌면 대사면)
  v.tally ??= { banished: 0, pardoned: 0, escaped: 0, fled: 0, served: 0, plots: 0 };
  v.past ??= [];       // [{ y, text }]
  v.sceneAt ??= 0;
  v.log ??= [];
  return v;
}
const V = exileState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
function past(g, text) { const v = V(g); v.past.push({ y: g.date.year, text }); if (v.past.length > 12) v.past.shift(); }
function carry(g, place) {
  L(g).place = place; L(g).travel = null;
  const R = realmState(g);
  R.cur = realmOf(place); R.last = place;
  L(g).queue = L(g).queue.filter((x) => x.kind !== 'border');
  if (!['street', 'barracks'].includes(L(g).home)) L(g).home = 'inn';
}
const rulerOfRealm = (g, realm) => (realm === 'leonia' ? rulerName(g) : politicsState(g).rulers?.[realm]?.name ?? null);
const homeCapital = (g) => REALMS[citizen(g)]?.capital ?? 'leocast';

// 고향에서 쫓기는 몸인가
export function hunted(g) {
  const c = crimeState(g);
  const home = citizen(g);
  const bounty = Object.entries(c.bounty ?? {}).filter(([p]) => realmOf(p) === home).reduce((a, [, n]) => a + n, 0);
  return bounty >= 25 || courtState(g).disgrace > mi(g) || !!V(g).banish?.sneak || !!g.revolt?.hidden || (realmState(g).banned?.[home] ?? 0) > mi(g);
}

/* ---------- 망명 궁정 ---------- */
// 쫓겨난 왕자(world.js의 왕위 다툼)와 무너진 왕가(politics fallen)가 남의 나라에 차린 궁정
export function exileCourts(g) {
  const out = [];
  const r = g.realm;
  if (r?.succession === 'settled' && r.ruler === 'erik' && r.rudolf?.alive) out.push({ id: 'rudolf', name: '루돌프 왕자의 망명 궁정', prince: '루돌프 왕자', host: 'solaris', origin: 'leonia' });
  if (r?.succession === 'settled' && r.ruler === 'rudolf' && r.erik?.alive) out.push({ id: 'erik', name: '에릭 왕자의 망명 궁정', prince: '에릭 왕자', host: 'graubel', origin: 'leonia' });
  for (const f of (politicsState(g).fallen ?? []).slice(-4)) {
    if (!f.house || !REALMS[f.realm] || g.date.year - f.y > 60) continue;
    const host = ['barka', 'solaris', 'eisen', 'serenia'].find((p) => realmOf(p) !== f.realm) ?? 'barka';
    out.push({ id: `fallen:${f.realm}:${f.house}`, name: `옛 ${f.house} 왕가의 망명 궁정`, prince: `${f.house} 왕가의 마지막 핏줄`, host, origin: f.realm });
  }
  return out;
}

/* ---------- 화면용 ---------- */
export function exileInfo(g) {
  const v = V(g);
  const b = v.banish, a = v.asylum, c = v.court;
  return {
    banish: b ? { site: SITES[b.site]?.name ?? placeName(b.site), from: placeName(b.from), why: b.why === 'court' ? '정쟁' : '죄', years: g.date.year - b.y, left: Math.max(0, Math.ceil((b.until - mi(g)) / 12)), pardon: Math.round(b.pardon), word: PARDON_WORD(b.pardon), ties: Math.round(b.ties), sneak: !!b.sneak } : null,
    asylum: a ? { realm: REALMS[a.realm]?.name ?? '먼 나라', from: short(a.from), years: g.date.year - a.y, debt: Math.round(a.debt), word: DEBT_WORD(a.debt) } : null,
    court: c ? { name: c.name, prince: c.prince, host: placeName(c.host), plot: Math.round(c.plot), word: PLOT_WORD(c.plot), rank: c.rank } : null,
    courts: exileCourts(g).map((x) => ({ name: x.name, prince: x.prince, host: placeName(x.host) })),
    hunted: hunted(g),
    tally: { ...v.tally },
    past: v.past.slice(-6).map((x) => ({ ...x })),
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 유배형 ---------- */
function sendAway(g, why, years) {
  const v = V(g);
  const site = siteFor(g, why);
  const from = here(g);
  crimeState(g).jailed = null;
  if (L(g).job) leaveJob(g, `${SITES[site].name}에 유배되며 일을 잃었다.`);
  carry(g, SITES[site].place);
  v.banish = { site, from, why, y: g.date.year, until: mi(g) + years * 12, pardon: 5, ties: 0, sneak: false };
  v.tally.banished += 1;
  stress(g, 15);
  for (const id of g.player.familyIds ?? []) { const f = byId(g, id); if (alive(f)) { f.affection = clamp((f.affection ?? 0) - 3, -100, 100); remember(g, f, `${SITES[site].how}으로 유배되었다`, -1, { tag: 'exile' }); } }
  note(g, `${SITES[site].name}에 ${years}년 유배되었다.`);
  chron(g, `${g.player.name}, ${why === 'court' ? '정쟁에 밀려' : '죄를 지어'} ${SITES[site].name}에 유배되다.`, 80);
  log(g, `${SITES[site].name}에 유배되었다. ${years}년.`);
  past(g, `${SITES[site].name}에 유배`);
  return site;
}
defineScene('exile_decree', {
  title: () => '유배형',
  text: (g, s) => s.why === 'court'
    ? `실각한 지 사흘째, 왕의 인장이 찍힌 문서가 왔다. "${J(placeName(homeCapital(g)), '을/를')} 떠나 ${SITES[siteFor(g, 'court')].name}에서 ${s.years}년을 지내라." 궁정의 정적들이 이 문장을 몇 번이나 고쳐 썼을지 알 만했다.`
    : `옥리가 쇠창살 너머로 말했다. "재판관께서 길을 하나 더 주셨다. 남은 형기 대신 ${SITES[siteFor(g, 'crime')].name}에서 ${s.years}년. 감옥보다 하늘은 넓지만, 돌아오는 배는 없다."`,
  choices: (g, s) => {
    if (!base(g)) return [];
    if (g.bondage?.slave) return [];
    if (s.why === 'court') return [{ label: '유배지로 떠난다', key: 'go' }, { label: '국경을 넘어 다른 나라로 달아난다', key: 'flee' }, { label: '왕께 마지막 탄원서를 올린다', key: 'plead' }];
    if (!isJailed(g) || g.bondage?.slave) return [];
    return [{ label: '감옥 대신 유배를 택한다', key: 'go' }, { label: '감옥에 남는다', key: 'stay' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'stay') return '창살 사이로 하늘을 보았다. 좁아도 고향 하늘이다.';
    if (key === 'plead') {
      if (check(rng, stat(g, 'cha') * 0.4 + skill(g, 'letters') * 0.4, 50)) { stress(g, 4); return '밤새 쓴 탄원서가 왕의 책상까지 올라갔다. 사흘 뒤 답이 왔다. "궁정에 나오지 마라. 그러나 왕국을 떠날 것까지는 없다." 목숨과 집은 건졌다.'; }
      sendAway(g, 'court', s.years + 1);
      return '탄원서는 정적의 손을 거쳐 왕께 닿았다. 사이사이에 다른 문장이 끼워져 있었다고 한다. 유배 기간이 한 해 늘었다. 배가 기다리고 있었다.';
    }
    if (key === 'flee') { queueScene(g, 'exile_choose', { opts: hostOptions(g) }, { first: true }); return '짐을 반만 싸서 밤길을 나섰다. 어느 나라 국경을 넘을지는 길에서 정하기로 했다.'; }
    const site = sendAway(g, s.why, s.years);
    return site === 'saltrock'
      ? '쇠사슬을 찬 채 클라인 항에서 배에 올랐다. 이틀 뒤 회색 바위섬이 보였다. 소금 냄새가 바람보다 먼저 왔다. 막사 문 위에 글씨가 새겨져 있었다. "여기서는 모두가 손님이다. 떠나는 손님은 드물다."'
      : '호송병 둘과 북쪽으로 열흘을 걸었다. 장성 그림자가 길게 드리운 수자리에 닿자 대장이 내 이름을 장부에 적었다. "여기 온 사람은 죄명이 아니라 돌 몇 개를 날랐는지로 부른다."';
  },
});

/* ---------- 유배지의 삶 ---------- */
const atSite = (g) => { const b = V(g).banish; return !!b && !b.sneak && here(g) === SITES[b.site]?.place; };
ACTIONS.push({
  id: 'exile_petition', name: '사면 청원서를 쓴다', icon: 'scroll',
  desc: '고향의 벗과 궁정 사람들에게 편지를 보낸다. 글솜씨와 옛 인연이 사면을 앞당긴다. 은화 두 닢.',
  available: (g) => ready(g) && atSite(g) && canSpend(g, 2),
  run(g, rng) {
    const b = V(g).banish;
    spend(g, 2);
    const k = 3 + skill(g, 'letters') / 12 + stat(g, 'cha') / 20 + (courtState(g).favor ?? 0) / 25;
    b.pardon = clamp(b.pardon + k * (0.6 + rng.next() * 0.8), 0, 100);
    gainSkill(g, 'letters', 0.4, 'int');
    return rng.pick([
      '등잔 아래서 편지 석 장을 썼다. 한 장은 옛 벗에게, 한 장은 궁정 서기에게, 한 장은 아무에게도 보내지 못하고 태웠다.',
      `배편에 편지를 실어 보냈다. 답장이 오려면 석 달은 걸린다. ${b.pardon >= 40 ? '지난번 답장에는 "곧"이라는 말이 있었다.' : '지난번 편지에는 아직 답이 없다.'}`,
      '글자 하나하나를 고르고 또 골랐다. 억울하다는 말은 빼고, 뉘우친다는 말도 빼고. 남은 것은 왕을 향한 짧은 인사뿐이었다.',
    ]);
  },
});
ACTIONS.push({
  id: 'exile_settle', name: '유배지 사람들 틈에서 일한다', icon: 'hammer',
  desc: '그곳 사람들과 함께 일하고 먹는다. 품삯은 적지만 정이 든다.',
  available: (g) => ready(g) && atSite(g),
  run(g, rng) {
    const b = V(g).banish, s = SITES[b.site];
    b.ties = clamp(b.ties + 6 + rng.int(0, 4), 0, 100);
    const n = 2 + rng.int(0, 3);
    g.player.money += n;
    gainStat(g, 'str', 0.2);
    return `${s.work}. ${s.folk} 틈에 섞여 하루를 보냈다. 품삯 은화 ${n}닢. ${b.ties >= 50 ? '이제는 내 그릇을 따로 챙겨 두는 집이 있다.' : '저녁에 나눠 준 생선국이 짰다.'}`;
  },
});
ACTIONS.push({
  id: 'exile_escape', name: '몰래 고향으로 돌아간다', icon: 'boat',
  desc: '어부의 배나 장사꾼 수레에 숨어 유배지를 빠져나간다. 들키면 유배가 길어지고, 돌아가서도 숨어 살아야 한다.',
  available: (g) => ready(g) && atSite(g),
  run(g, rng) {
    const v = V(g), b = v.banish;
    const ok = check(rng, stat(g, 'agi') * 0.4 + stat(g, 'sen') * 0.3 + b.ties * 0.3, 45);
    if (!ok) { b.until += 24; b.pardon = clamp(b.pardon - 15, 0, 100); stress(g, 8); return '그물 더미 밑에 숨었지만 감시병의 창끝이 그물을 들추었다. 유배 기간이 두 해 늘었다. 막사로 끌려오는 길에 염전 사람들이 고개를 돌렸다.'; }
    b.sneak = true; v.tally.escaped += 1;
    carry(g, b.from);
    note(g, '유배지를 몰래 빠져나와 고향으로 돌아왔다.');
    log(g, '유배지를 빠져나왔다. 고향에서는 숨어 살아야 한다.');
    return b.ties >= 40 ? '늙은 어부가 말없이 배를 내주었다. "갚지 마라. 돌아오지도 말고." 사흘 밤을 노 저어 뭍에 닿았다. 고향 길은 낯설 만큼 그대로였다.' : '장사꾼 수레의 소금 자루 사이에 웅크려 엿새를 갔다. 고향 어귀에서 내렸다. 아무도 나를 알아보지 못했다. 아직은.';
  },
});
const SITE_EV = {
  storm: (g, s) => `${s.how === '섬' ? '사흘째 폭풍이 섬을 때린다. 배가 끊겨 막사의 곡식이 바닥났다.' : '장성 너머에서 눈보라가 몰려왔다. 땔감이 바닥나 수자리 사람들이 서로의 숨으로 버틴다.'}`,
  elder: (g, s) => `먼저 유배 온 늙은 선비가 있다. 왕도에서 재상까지 지냈다는 소문이다. 그가 나를 불러 앉혔다. "글을 아는가? 여기서는 글이 유일한 재산이네."`,
  love: (g, s, p) => `${s.folk} 가운데 ${J(p?.name ?? '한 사람', '이/가')} 요즘 자꾸 내 막사 앞을 지나간다. 오늘은 말린 생선 한 두름을 문 앞에 두고 갔다.`,
  assassin: (g, s) => '밤에 막사 문이 소리 없이 열렸다. 칼끝이 달빛에 번뜩였다. 왕도의 누군가는 내가 여기서 늙어 죽는 것조차 기다리지 못하는 모양이다.',
  letter: (g, s) => `고향에서 편지가 왔다. 봉투가 두 번 뜯겼다 붙은 흔적이 있다. "${g.player.familyIds?.length ? '집안은 무사하다. 다만 이웃들이 우리 집 앞을 돌아서 다닌다.' : '네 이름은 이제 아무도 입에 올리지 않는다.'}"`,
};
defineScene('exile_life', {
  title: (g) => SITES[V(g).banish?.site]?.name ?? '유배지',
  text: (g, s) => { const b = V(g).banish; const site = SITES[b?.site] ?? SITES.saltrock; return SITE_EV[s.ev](g, site, byId(g, s.pid)); },
  choices: (g, s) => {
    if (!atSite(g) || !base(g) || isJailed(g)) return [];
    if (s.ev === 'storm') return [{ label: '내 몫을 굶는 집에 나눈다', key: 'share' }, { label: '내 몫을 지킨다', key: 'keep' }];
    if (s.ev === 'elder') return [{ label: '제자로 받아 달라고 한다', key: 'learn' }, { label: '정쟁에 진 사람과 엮이지 않는다', key: 'no' }];
    if (s.ev === 'love') return alive(byId(g, s.pid)) ? [{ label: '마음을 받아들인다', key: 'yes' }, { label: '언젠가 떠날 몸이라고 말한다', key: 'no' }] : [];
    if (s.ev === 'assassin') return [{ label: '맞서 싸운다', key: 'fight' }, { label: '소리쳐 이웃을 깨운다', key: 'shout' }];
    return [{ label: '답장을 쓴다', key: 'write' }, { label: '편지를 접어 품에 넣는다', key: 'keep' }];
  },
  resolve(g, rng, s, key) {
    const b = V(g).banish;
    if (!b) return '';
    if (s.ev === 'storm') { if (key === 'share') { b.ties = clamp(b.ties + 15, 0, 100); stress(g, 4); deed(g, 'kind', 3, null); return '내 몫의 보리를 아이 있는 집에 갖다주었다. 사흘을 물로 버텼다. 폭풍이 지나간 아침, 그 집 아이가 조개 한 바구니를 들고 왔다.'; } b.ties = clamp(b.ties - 8, 0, 100); return '내 몫을 품에 안고 버텼다. 살아남았다. 폭풍이 지나간 뒤 이웃들은 나에게 아무것도 묻지 않았다.'; }
    if (s.ev === 'elder') { if (key === 'learn') { gainSkill(g, 'letters', 2, 'int'); gainStat(g, 'int', 0.6); b.pardon = clamp(b.pardon + 5, 0, 100); return '늙은 선비는 바닷가 모래에 글자를 썼다. 법전, 역사, 왕들의 이름. 파도가 지우면 또 썼다. "언젠가 자네가 돌아가면, 내 이름도 같이 가져가게."'; } return '고개를 저었다. 노인은 웃었다. "현명하군. 나도 그렇게 살았어야 했네."'; }
    if (s.ev === 'love') {
      const p = byId(g, s.pid);
      if (key === 'yes' && p) { p.affection = clamp((p.affection ?? 0) + 25, -100, 100); p.known = true; remember(g, p, '유배지에서 마음을 받아 주었다', 3, { tag: 'exile' }); b.ties = clamp(b.ties + 10, 0, 100); return `${J(p.name, '과/와')} 바닷가를 걸었다. 말은 많지 않았다. 유배지에도 봄은 왔다.`; }
      if (p) p.affection = clamp((p.affection ?? 0) - 5, -100, 100);
      return '"나는 언젠가 떠날 사람이오." 그 말을 하고 나서야 정말 떠나고 싶은지 모르겠다는 걸 알았다.';
    }
    if (s.ev === 'assassin') {
      if (key === 'fight' && check(rng, skill(g, 'sword') * 0.5 + stat(g, 'str') * 0.3 + stat(g, 'agi') * 0.2, 45)) { b.pardon = clamp(b.pardon + 8, 0, 100); return '어둠 속에서 손목을 붙잡아 비틀었다. 칼이 떨어졌다. 자객은 창문으로 달아났다. 이튿날 그 일을 적어 왕도로 보냈다. 누가 보냈는지는 적지 않았다. 다들 알 테니까.'; }
      if (key === 'shout' && b.ties >= 30) { b.ties = clamp(b.ties + 5, 0, 100); return '고함에 이웃 막사들의 문이 일제히 열렸다. 횃불과 작살을 든 사람들이 몰려오자 자객은 바다 쪽으로 달아났다. 그날부터 밤마다 누군가 내 막사 앞에서 그물을 손질했다.'; }
      g.player.fatigue = clamp((g.player.fatigue ?? 0) + 30, 0, 100); stress(g, 12);
      return '칼이 팔을 스쳤다. 피가 흘렀지만 살았다. 자객은 어둠 속으로 사라졌다. 그날 이후 문에 빗장을 두 개 걸었다.';
    }
    if (key === 'write') { gainSkill(g, 'letters', 0.5, 'int'); for (const id of g.player.familyIds ?? []) { const f = byId(g, id); if (alive(f)) f.affection = clamp((f.affection ?? 0) + 3, -100, 100); } return '답장에 소금바람과 갈매기 이야기를 썼다. 슬픈 이야기는 쓰지 않았다. 읽는 사람이 울 테니까.'; }
    return '편지를 접어 품에 넣었다. 밤마다 꺼내 읽었다. 종이가 닳아 글자가 흐려질 때까지.';
  },
});
defineScene('exile_pardon', {
  title: () => '사면',
  text: (g, s) => s.amnesty ? `왕도에서 배가 왔다. ${J(s.king ?? '새 왕', '이/가')} 즉위하며 대사면을 내렸다고 한다. 유배자 명부의 이름들이 지워졌다. 내 이름도 거기 있었다.` : '왕의 인장이 찍힌 사면장이 왔다. 몇 년 동안 쓴 편지들이 어딘가에 닿았던 모양이다. 이제 돌아가도 된다.',
  choices: (g) => (V(g).banish && base(g) ? [{ label: '고향으로 돌아간다', key: 'home' }, V(g).banish.ties >= 40 ? { label: '여기 남는다', key: 'stay' } : null].filter(Boolean) : []),
  resolve(g, rng, s, key) {
    const v = V(g), b = v.banish;
    if (!b) return '';
    v.banish = null; v.tally.pardoned += 1;
    log(g, s.amnesty ? '대사면으로 풀려났다.' : '사면되었다.');
    past(g, s.amnesty ? '대사면으로 풀려남' : '사면됨');
    if (key === 'stay') { note(g, '사면을 받고도 유배지에 남았다.'); return '사면장을 접어 상자에 넣었다. 돌아갈 곳보다 여기 사람들이 더 가까워졌다. 늙은 어부가 웃으며 그물 한쪽을 내밀었다.'; }
    if (!isJailed(g)) carry(g, b.from);
    note(g, '사면을 받고 고향으로 돌아왔다.');
    return `${b.ties >= 40 ? '떠나는 날 바닷가에 사람들이 줄지어 섰다. 누군가 소금 한 줌을 손에 쥐여 주었다. ' : ''}${placeName(b.from)}에 닿았다. 골목은 그대로인데 사람들 얼굴이 낯설다. 몇은 반가워했고, 몇은 못 본 척했다.`;
  },
});
// 몰래 돌아온 몸: 알아보는 사람
defineScene('exile_spotted', {
  title: () => '알아보는 눈',
  text: (g, s) => { const p = byId(g, s.pid); return `장터에서 ${J(p?.name ?? '옛 이웃', '이/가')} 걸음을 멈추고 나를 보았다. "자네... 유배 갔다던..." 주변 사람들이 고개를 돌린다.`; },
  choices: (g) => (V(g).banish?.sneak && ready(g) ? [{ label: '사람을 잘못 봤다고 한다', key: 'deny' }, canSpend(g, 15) ? { label: '은화를 쥐여 주고 입을 막는다', key: 'pay' } : null, { label: '유배지로 돌아간다', key: 'back' }].filter(Boolean) : []),
  resolve(g, rng, s, key) {
    const v = V(g), b = v.banish;
    if (!b) return '';
    if (key === 'back') { b.sneak = false; carry(g, SITES[b.site].place); b.until += 12; return '그날 밤 다시 배에 올랐다. 막사 문을 열자 늙은 어부가 "어디 다녀왔나" 하고만 물었다. 유배 기간이 한 해 늘었다.'; }
    if (key === 'pay') { spend(g, 15); return '은화를 손에 쥐여 주었다. 그는 아무것도 못 본 사람처럼 돌아섰다. 다음 달에도 그 골목을 지나야 한다.'; }
    if (check(rng, stat(g, 'cha') * 0.5 + stat(g, 'wil') * 0.3, 45)) return '"닮은 사람이 많지요." 웃으며 지나쳤다. 등 뒤에서 그가 고개를 갸웃하는 소리가 들리는 것 같았다.';
    reportCrime(g, 'jailbreak');
    b.sneak = false; b.until += 36;
    carry(g, SITES[b.site].place);
    return '사흘 뒤 경비대가 문을 두드렸다. 쇠사슬을 차고 다시 배에 올랐다. 이번에는 세 해가 더 붙었다.';
  },
});

/* ---------- 망명 ---------- */
function hostOptions(g) {
  const home = citizen(g);
  return HOSTS.filter((r) => r !== home && REALMS[r] && (realmState(g).banned?.[r] ?? 0) <= mi(g)).slice(0, 4);
}
const HOST_LINE = {
  valhart: '제국은 레오니아에서 쫓겨난 사람을 반긴다. 대신 아는 것을 다 말해야 한다.',
  holy: '대성당은 회개하는 죄인을 내치지 않는다. 대신 무릎을 꿇어야 한다.',
  serenia: '마법도시는 누구에게도 사람을 넘겨주지 않는다. 대신 쓸모를 보여야 한다.',
  free: '자유도시는 돈만 내면 묻지 않는다.',
  march: '장성은 칼만 들면 받아 준다.',
};
ACTIONS.push({
  id: 'exile_flee', name: '다른 나라로 망명한다', icon: 'road',
  desc: '고향에서 쫓기는 몸이다. 국경을 넘어 남의 나라에 몸을 맡긴다. 받아 준 나라에는 빚을 지게 된다.',
  available: (g) => ready(g) && hunted(g) && !V(g).asylum && realmOf(here(g)) === citizen(g) && !(V(g).banish && !V(g).banish.sneak) && hostOptions(g).length > 0 && !sceneQueued(g, 'exile_choose'),
  run(g) { queueScene(g, 'exile_choose', { opts: hostOptions(g) }); return '짐을 꾸렸다. 무엇을 두고 갈지 고르는 데 하룻밤이 걸렸다.'; },
});
defineScene('exile_choose', {
  title: () => '어느 나라로',
  text: (g, s) => `국경 쪽으로 가는 길이 여럿이다. ${s.opts.map((r) => `${short(r)}: ${HOST_LINE[r] ?? ''}`).join(' ')}`,
  choices: (g, s) => (base(g) && !isJailed(g) && !V(g).asylum ? [...s.opts.map((r) => ({ label: `${short(r)}${J(short(r), '으로/로').slice(short(r).length)} 간다`, key: r })), { label: '고향에 남는다', key: 'stay' }] : []),
  resolve(g, rng, s, key) {
    if (key === 'stay') return '국경 앞에서 발길을 돌렸다. 쫓기더라도 내 땅에서 쫓기겠다.';
    const v = V(g);
    const realm = key;
    const to = REALMS[realm]?.capital;
    if (!to || !PLACES[to]) return '그쪽 길은 막혀 있었다.';
    const from = citizen(g);
    if (v.banish) { v.banish = null; }
    if (L(g).job) leaveJob(g, '나라를 떠나며 일을 잃었다.');
    carry(g, to);
    const R = realmState(g); R.asylum = realm;
    v.asylum = { realm, from, y: g.date.year, debt: 25 + rng.int(0, 15), asked: 0 };
    v.tally.fled += 1;
    stress(g, 12);
    note(g, `${REALMS[realm].name}에 망명했다.`);
    chron(g, `${g.player.name}, ${J(REALMS[from]?.name ?? '고향', '을/를')} 떠나 ${REALMS[realm].name}에 망명하다.`, 80);
    log(g, `${REALMS[realm].name}에 망명했다.`);
    past(g, `${short(realm)}에 망명`);
    return `${placeName(to)}의 관청에서 낯선 서기가 내 이름을 적었다. 한참 철자를 물었다. 이제 이 나라 사람들은 나를 "${short(from)}에서 온 사람"이라고 부를 것이다. 그 이름이 언제 벗겨질지는 모른다.`;
  },
});
const ASK = {
  spy: (g, a) => `${short(a.realm)}의 관리가 나를 불렀다. "${short(a.from)}의 성채와 길을 그려 줄 수 있겠소? 받아 준 값이라 생각하시오."`,
  army: (g, a) => `${J(short(a.realm), '이/가')} 군사를 모은다. 망명자 명부에 있는 사람들은 먼저 불려 간다. 관리가 내 이름을 짚었다.`,
  speak: (g, a) => `광장에서 ${short(a.from)}의 왕을 꾸짖는 연설을 해 달라는 청이 왔다. 고향 사람의 입으로 들어야 효과가 있다고 한다.`,
  hand: (g, a) => `${short(a.from)}의 사신이 와서 망명자 몇을 돌려보내라고 요구했다. 관리가 넌지시 말했다. "당신 대신 다른 망명자의 이름을 대 주면, 당신은 명부에서 빼 드리지."`,
};
defineScene('exile_host', {
  title: (g) => `${short(V(g).asylum?.realm)}에 진 빚`,
  text: (g, s) => { const a = V(g).asylum; return a ? ASK[s.ask](g, a) : ''; },
  choices: (g) => (V(g).asylum && ready(g) ? [{ label: '청을 들어준다', key: 'yes' }, { label: '거절한다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    const v = V(g), a = v.asylum;
    if (!a) return '';
    a.asked += 1;
    if (key === 'yes') {
      a.debt = clamp(a.debt - 18, 0, 100);
      if (s.ask === 'spy' || s.ask === 'speak') { deed(g, 'loyal', -3, `${J(short(a.from), '을/를')} 팔았다더라`); const c = crimeState(g); c.bounty[homeCapital(g)] = (c.bounty[homeCapital(g)] ?? 0) + 10; }
      if (s.ask === 'hand') deed(g, 'loyal', -6, '다른 망명자를 팔았다더라');
      if (s.ask === 'army') { gainSkill(g, 'sword', 1, 'str'); g.player.fatigue = clamp((g.player.fatigue ?? 0) + 30, 0, 100); }
      return {
        spy: '밤새 기억을 더듬어 지도를 그렸다. 고향 성채의 우물 자리까지. 관리는 흡족해했다. 고향의 현상금이 오를 것이다.',
        army: '반년을 남의 나라 군복을 입고 보냈다. 싸움터에서 같은 처지의 망명자들을 만났다. 다들 고향 이야기는 하지 않았다.',
        speak: '광장에서 고향의 왕을 꾸짖었다. 박수가 나왔다. 고향에서는 내 이름이 반역자 명부에 올랐다는 소식이 왔다.',
        hand: '이름 하나를 댔다. 그 사람은 사슬에 묶여 국경으로 끌려갔다. 나는 명부에서 빠졌다. 거울을 오래 보지 않게 되었다.',
      }[s.ask];
    }
    a.debt = clamp(a.debt + 12, 0, 100);
    if (a.debt >= 80 && rng.chance(0.5)) {
      const R = realmState(g); if (R.asylum === a.realm) R.asylum = null;
      v.asylum = null;
      R.banned[a.realm] = mi(g) + 36;
      const back = REALMS[a.from]?.capital ?? 'ern';
      carry(g, back);
      log(g, `${short(a.realm)}에서 망명이 거두어졌다.`);
      return `"받아 준 은혜를 모르는군." 관리가 서류에 붉은 줄을 그었다. 이틀 뒤 국경까지 끌려가 ${short(a.from)} 쪽으로 등을 떠밀렸다. 쫓겨 온 곳으로 다시 쫓겨 갔다.`;
    }
    return '고개를 저었다. 관리는 아무 말 없이 서류를 덮었다. 그 뒤로 관청 문턱이 조금 높아졌다.';
  },
});

/* ---------- 망명 궁정과 귀환 ---------- */
ACTIONS.push({
  id: 'exile_court', name: '망명 궁정에 들어간다', icon: 'crown',
  desc: '쫓겨난 왕족이 남의 나라에 차린 작은 궁정에 몸을 맡긴다. 귀환을 함께 꿈꾼다.',
  available: (g) => ready(g) && !V(g).court && exileCourts(g).some((c) => c.host === here(g)) && playerAge(g) >= 18,
  run(g, rng) {
    const v = V(g);
    const c = exileCourts(g).find((x) => x.host === here(g));
    v.court = { ...c, y: g.date.year, plot: 10 + rng.int(0, 10), rank: '식객' };
    log(g, `${c.name}에 들어갔다.`); past(g, `${c.name}에 들어감`);
    note(g, `${c.name}에 몸을 맡겼다.`);
    return `낡은 저택의 대청에 ${J(c.prince, '이/가')} 앉아 있었다. 옥좌 대신 등받이가 높은 의자. 왕관 대신 빛바랜 금실 모자. 그래도 사람들은 무릎을 꿇었다. 나도 꿇었다.`;
  },
});
ACTIONS.push({
  id: 'exile_plot', name: '귀환을 꾀한다', icon: 'fist',
  desc: '망명 궁정을 위해 돈과 사람을 모으고 고향에 줄을 댄다.',
  available: (g) => ready(g) && !!V(g).court && here(g) === V(g).court.host,
  run(g, rng) {
    const c = V(g).court;
    const k = 4 + stat(g, 'cha') / 15 + stat(g, 'int') / 20 + rng.int(0, 4);
    c.plot = clamp(c.plot + k, 0, 100);
    V(g).tally.plots += 1;
    if (c.plot >= 40 && c.rank === '식객') { c.rank = '심복'; note(g, `${c.prince}의 심복이 되었다.`); }
    return rng.pick([
      `고향에서 온 상인에게 편지 꾸러미를 맡겼다. 받는 사람의 이름은 적지 않았다. ${c.prince}의 인장만 찍었다.`,
      '망명자들의 술자리를 돌며 은화를 걷었다. 다들 가난했지만 다들 냈다. 고향에 돌아갈 표값이라고 생각하는 모양이었다.',
      `옛 지도를 펴 놓고 상륙할 해안을 짚었다. ${J(c.prince, '이/가')} 오래 그 자리를 손가락으로 쓸었다.`,
    ]);
  },
});
const PLOT_EV = {
  doubt: (g, c) => `${c.prince}의 늙은 시종장이 나를 불렀다. "전하는 이제 돌아갈 생각이 없으시오. 이 집의 술과 사냥이 좋으신 거지." 그가 내 눈을 보았다.`,
  traitor: (g, c) => '망명 궁정의 회계를 맡은 자가 고향의 사신과 몰래 만난다는 말이 들어왔다. 그 사람이 들고 다니는 장부에 우리 이름이 다 적혀 있다.',
  host: (g, c) => `${placeName(c.host)}의 관리가 찾아왔다. "망명 궁정이 너무 시끄럽소. 우리 왕께서는 이웃 나라와 전쟁을 원하지 않으시오."`,
};
defineScene('exile_plot_ev', {
  title: (g) => V(g).court?.name ?? '망명 궁정',
  text: (g, s) => { const c = V(g).court; return c ? PLOT_EV[s.ev](g, c) : ''; },
  choices: (g, s) => {
    if (!V(g).court || !ready(g)) return [];
    if (s.ev === 'doubt') return [{ label: '전하를 다시 일으켜 세운다', key: 'rouse' }, { label: '이 궁정을 떠난다', key: 'leave' }];
    if (s.ev === 'traitor') return [{ label: '장부를 빼앗는다', key: 'seize' }, { label: '거짓 이름을 흘린다', key: 'trick' }];
    return [{ label: '조용히 하겠다고 약속한다', key: 'quiet' }, { label: '은화로 관리를 달랜다', key: 'pay' }];
  },
  resolve(g, rng, s, key) {
    const v = V(g), c = v.court;
    if (!c) return '';
    if (key === 'leave') { v.court = null; log(g, `${c.name}을 떠났다.`); return `${c.prince}에게 마지막으로 절했다. 그는 술잔에서 눈을 들지 않았다. 대문을 나서자 이상하게 홀가분했다.`; }
    if (key === 'rouse') { if (check(rng, stat(g, 'cha') * 0.6 + stat(g, 'wil') * 0.3, 45)) { c.plot = clamp(c.plot + 12, 0, 100); return `밤새 ${c.prince}와 이야기했다. 그의 아버지 이야기, 고향의 봄 이야기. 새벽에 그가 술병을 창밖으로 던졌다.`; } c.plot = clamp(c.plot - 10, 0, 100); return `"자네는 내가 죽기를 바라는가?" ${J(c.prince, '이/가')} 소리쳤다. 그 뒤로 나를 부르지 않았다.`; }
    if (key === 'seize') { if (check(rng, stat(g, 'agi') * 0.4 + stat(g, 'str') * 0.3 + skill(g, 'sword') * 0.3, 45)) { c.plot = clamp(c.plot + 8, 0, 100); return '골목에서 덮쳐 장부를 빼앗았다. 회계는 그날 밤 국경 쪽으로 사라졌다. 장부는 난롯불에 넣었다.'; } c.plot = clamp(c.plot - 20, 0, 100); return '장부를 빼앗지 못했다. 한 달 뒤 고향에서 우리 쪽 사람 셋이 붙잡혔다는 소식이 왔다.'; }
    if (key === 'trick') { c.plot = clamp(c.plot + 5, 0, 100); return '엉뚱한 날짜와 엉뚱한 해안을 흘렸다. 고향의 군사들이 엉뚱한 바닷가를 지키며 한 철을 보냈다고 한다.'; }
    if (key === 'pay') { if (!spend(g, 20)) { c.plot = clamp(c.plot - 8, 0, 100); return '줄 돈이 없었다. 관리는 망명 궁정의 대문에 감시병을 세웠다.'; } return '은화 스무 닢이 관리의 소매로 들어갔다. 감시병은 대문 앞에서 졸기 시작했다.'; }
    c.plot = clamp(c.plot - 6, 0, 100);
    return '조용히 하겠다고 했다. 망명 궁정의 술자리에서 목소리가 낮아졌다. 꿈도 조금 작아졌다.';
  },
});
defineScene('exile_return', {
  title: () => '귀환의 배',
  text: (g) => { const c = V(g).court; return `${J(c?.prince ?? '전하', '이/가')} 마침내 일어섰다. 배 세 척, 망명자 이백, 고향에서 기다린다는 귀족들의 편지 꾸러미. 내일 새벽 돛을 올린다. 나는 어디에 설 것인가.`; },
  choices: (g) => (V(g).court && ready(g) ? [{ label: '맨 앞 배에 오른다', key: 'go' }, { label: '남아서 소식을 기다린다', key: 'wait' }] : []),
  resolve(g, rng, s, key) {
    const v = V(g), c = v.court;
    if (!c) return '';
    v.court = null;
    const win = rng.chance(clamp(c.plot / 160, 0.15, 0.55));
    const home = c.origin;
    past(g, `${c.name}의 귀환 ${win ? '성공' : '실패'}`);
    chron(g, `${c.name}이 귀환을 꾀하다. ${win ? '고향의 한 고을을 되찾다.' : '바다에서 꺾이다.'}`, 80);
    g.news.unshift({ text: `${c.prince}의 귀환 원정이 ${win ? '고향 해안에 닿아 옛 영지 하나를 되찾았다고 한다' : '해안에서 꺾였다고 한다'}.`, rel: 90 });
    if (key === 'wait') { if (win) { L(g).renown = (L(g).renown ?? 0) + 1; return '부두에서 배들을 배웅했다. 한 달 뒤 소식이 왔다. 해안의 한 고을이 전하의 깃발을 올렸다고. 나는 그 깃발 아래 없었다.'; } return '부두에서 배들을 배웅했다. 돌아온 배는 한 척뿐이었다. 갑판에 누운 사람들 가운데 아는 얼굴이 많았다.'; }
    if (win) {
      L(g).renown = (L(g).renown ?? 0) + 6;
      const cs = courtState(g); cs.disgrace = 0; cs.standing = clamp((cs.standing ?? 0) + 15, 0, 100);
      const crime = crimeState(g); for (const p of Object.keys(crime.bounty ?? {})) if (realmOf(p) === home) delete crime.bounty[p];
      if (v.asylum?.from === home) { const R = realmState(g); if (R.asylum === v.asylum.realm) R.asylum = null; v.asylum = null; }
      if (v.banish) v.banish = null;
      const to = REALMS[home]?.capital ?? 'ern';
      carry(g, PLACES[to] ? to : 'ern');
      log(g, '귀환 원정이 성공했다. 고향으로 돌아왔다.');
      return `새벽 안개 속에서 고향 해안이 보였다. 해안 고을의 성문이 안에서 열렸다. ${J(c.prince, '이/가')} 말에서 내려 흙을 한 줌 쥐었다. 나는 그 옆에 서 있었다. 내게 걸렸던 죄명은 그날로 지워졌다.`;
    }
    if (rng.chance(0.4)) { L(g).pendingDeath = '귀환 원정에서 고향 해안을 밟지 못하고 죽었다'; return '고향 해안이 보이는 곳에서 화살비가 쏟아졌다. 갑판이 기울었다. 마지막으로 본 것은 고향 언덕의 실루엣이었다.'; }
    stress(g, 15);
    return '해안에 닿기도 전에 매복에 걸렸다. 배를 돌려 겨우 빠져나왔다. 망명 궁정은 그해 겨울 흩어졌다.';
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g);
  const r = ownRng(g, 5);
  const now = mi(g);
  const home = citizen(g);
  // 1) 왕이 바뀌면 대사면
  let amnesty = null;
  for (const realm of SENDS) {
    const name = rulerOfRealm(g, realm);
    if (!name) continue;
    if (v.ruler[realm] && v.ruler[realm] !== name && realm === home) amnesty = name;
    v.ruler[realm] = name;
  }
  // 2) 유배
  const b = v.banish;
  if (b && !g.bondage?.slave) {
    const away = !b.sneak && !traveling(g) && !isJailed(g) && here(g) !== SITES[b.site]?.place;
    if (away) { b.sneak = true; v.tally.escaped += 1; log(g, '허락 없이 유배지를 떠났다.'); }
    if (!b.sneak && here(g) === SITES[b.site]?.place) { b.pardon = clamp(b.pardon + 0.35 + (courtState(g).favor ?? 0) / 300, 0, 100); v.tally.served += 1; }
    const due = now >= b.until && !b.sneak;
    if (base(g) && !sceneQueued(g, 'exile_pardon') && (amnesty && !b.sneak || due || (!b.sneak && b.pardon >= 60 && r.chance((b.pardon - 50) / 400)))) {
      queueScene(g, 'exile_pardon', { amnesty: !!amnesty && !due, king: amnesty }, { first: true });
    } else if (amnesty && b.sneak) { b.sneak = false; b.until = now; log(g, '대사면으로 숨어 살 일이 끝났다.'); }
  }
  if (amnesty && v.asylum) log(g, `고향에 새 왕 ${J(amnesty, '이/가')} 섰다. 돌아갈 길이 열렸을지 모른다.`);
  // 3) 망명의 빚은 세월에 조금씩 묽어진다
  if (v.asylum) {
    v.asylum.debt = clamp(v.asylum.debt - 0.2, 0, 100);
    if (realmOf(here(g)) === home && !traveling(g)) { const R = realmState(g); if (R.asylum === v.asylum.realm) R.asylum = null; log(g, `${short(v.asylum.realm)}의 망명 생활을 끝내고 고향 땅을 밟았다.`); v.asylum = null; }
  }
  // 망명 궁정이 사라졌으면 (왕자가 죽었거나)
  if (v.court && !exileCourts(g).some((c) => c.id === v.court.id)) { log(g, `${v.court.name}이 흩어졌다.`); v.court = null; }
  // 4) 유배형이 내려진다: 실각, 큰 죄
  const cs = courtState(g);
  if (cs.disgrace > now && v.seenDisgrace !== cs.disgrace && !g.bondage?.slave) {
    v.seenDisgrace = cs.disgrace;
    if (!v.banish && !v.asylum && SENDS.includes(home) && r.chance(0.45)) { queueScene(g, 'exile_decree', { why: 'court', years: clamp(Math.round((cs.disgrace - now) / 12), 3, 10) }, { first: true }); v.sceneAt = now; return; }
  }
  const jl = crimeState(g).jailed;
  if (jl && !g.bondage?.slave && jl.months >= 12 && v.seenJail !== jl.total + ':' + jl.place && !v.banish && SENDS.includes(realmOf(jl.place))) {
    v.seenJail = jl.total + ':' + jl.place;
    if (r.chance(0.6)) { queueScene(g, 'exile_decree', { why: 'crime', years: clamp(Math.round(jl.months / 12 * 1.5), 2, 12) }, { first: true }); v.sceneAt = now; return; }
  }
  // 5) 장면
  if (!ready(g)) return;
  if (L(g).queue.some((x) => /^exile_/.test(x.kind)) || L(g).queue.length > 2 || now - v.sceneAt < 4) return;
  const fire = (kind, data) => { v.sceneAt = now; queueScene(g, kind, data); };
  if (b && b.sneak && realmOf(here(g)) === home && r.chance(0.08)) {
    const pool = g.people.filter((p) => alive(p) && p.known && (p.place ?? 'ern') === here(g) && ageYears(p) >= 16);
    const p = pool.length ? r.pick(pool) : null;
    return fire('exile_spotted', { pid: p?.id ?? null });
  }
  if (atSite(g) && r.chance(0.12)) {
    const evs = ['storm', 'elder', 'letter', 'letter', 'storm'];
    if (b.why === 'court' && b.pardon >= 20) evs.push('assassin');
    let pid = null;
    if (!me(g).spouseId) {
      let pool = g.people.filter((p) => alive(p) && (p.place ?? 'ern') === here(g) && Math.abs(ageYears(p) - playerAge(g)) <= 10 && p.sex !== me(g).sex && !p.spouseId);
      if (!pool.length && r.chance(0.5)) { const p = makePerson(r, { ageMonths: Math.max(18, playerAge(g) + r.int(-5, 5)) * 12, sex: me(g).sex === 'm' ? 'f' : 'm', job: 'farmer' }); p.place = here(g); p.childIds ??= []; p.affection = 10; g.people.push(p); pool = [p]; }
      if (pool.length) { pid = r.pick(pool).id; evs.push('love'); }
    }
    const ev = r.pick(evs);
    return fire('exile_life', { ev, pid: ev === 'love' ? pid : null });
  }
  if (v.asylum && realmOf(here(g)) === v.asylum.realm && v.asylum.debt >= 15 && r.chance(0.05)) return fire('exile_host', { ask: r.pick(['spy', 'army', 'speak', 'hand']) });
  if (v.court && here(g) === v.court.host) {
    if (v.court.plot >= 80 && r.chance(0.3)) return fire('exile_return', {});
    if (r.chance(0.07)) return fire('exile_plot_ev', { ev: r.pick(['doubt', 'traitor', 'host']) });
  }
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const v = V(g);
  const by = old?.name ?? '선대';
  if (v.banish) { log(g, `${by}${J(by, '은/는').slice(-1)} ${SITES[v.banish.site]?.name ?? '유배지'}에서 돌아오지 못했다.`); past(g, `${by}, 유배지에서 죽음`); v.banish = null; }
  if (v.asylum) { log(g, `${by}${J(by, '은/는').slice(-1)} ${short(v.asylum.realm)}에서 망명자로 죽었다. 남은 식구들은 그 나라 사람으로 산다.`); v.asylum = null; }
  if (v.court) { log(g, `${by}${J(by, '이/가').slice(-1)} 섬기던 ${v.court.name}과의 인연도 끝났다.`); v.court = null; }
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
