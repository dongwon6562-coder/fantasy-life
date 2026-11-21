// 26단계: 숨은 왕가의 피. 상태는 g.claim 하나, 화면 연결점은 claimInfo(g).
// - 핏줄(blood): 끊긴 왕가(politics의 fallen, 또는 아주 옛 왕가)의 피가 내 집안에 흐른다. 처음엔 나도 모른다(known=false).
//   유품 상자, 임종하는 어른, 족보를 캐는 학자, 옛 가신이 그것을 드러낸다(claim_reveal).
// - 증거(proof)와 소문(exposure): 증거를 모을수록 주장은 단단해지고, 아는 사람이 늘수록 그 피를 쓰려는 사람이 꼬인다.
//   귀족의 혼담·꼭두각시 제안, 지금 왕가의 밀정, 망명 궁정, 교단(claim_suitor). 지금 왕가가 칼을 보내기도 한다(claim_threat).
// - 갈림길: 숨기기(claim_hide), 왕위를 주장하기(claim_declare → claim_rally → claim_crown/claim_pact), 팔기(suitor에서), 가짜 왕손 되기(claim_forge).
//   나와 같은 피를 내세우는 다른 사람(claim_pretender)도 나타난다.
// - 대 잇기: 핏줄과 증거는 자식에게 그대로, 주장도 대를 넘어 이어진다. 소문은 반쯤 묽어진다.
// lineage의 족보 꾸미기(궁정 체면)·court 음모·exile 망명 궁정·spy 조직 상태는 건드리지 않고 그 위에 얹는다.
// 행동은 그 행동이 뜻 있는 형편에서만 보인다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill } from '../game.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, spend, canSpend, check, traveling, tired } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { isJailed, reportCrime, CRIMES } from '../crime.js';
import { deed } from '../repute/index.js';
import { courtState } from '../court/index.js';
import { politicsState } from '../politics/index.js';
import { REALMS } from '../realms/data.js';
import { rulerName as leoniaRuler } from '../world.js';

CRIMES.pretender ??= { name: '왕위 참칭', heat: 45, sev: 12, noto: 8 };

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 101) ^ Math.imul(mi(g) * 71 + salt + 53, 2654435761)) | 0 });
const stat = (g, id) => g.player.stats?.[id] ?? 0;
const skill = (g, id) => g.player.skills?.[id] ?? 0;
const base = (g) => playerAge(g) >= 16 && !g.over && !L(g).heirPending;
const ready = (g) => base(g) && !traveling(g) && !isJailed(g) && !g.bondage?.slave && !g.army?.campaign && !g.army?.captive;
const short = (id) => REALMS[id]?.short ?? '먼 나라';
const jo = (w, pair) => J(w, pair).slice(String(w).length);
const CITY = ['leocast', 'harfen', 'verden', 'eisen', 'solaris', 'serenia', 'barka', 'graubel'];

// 아주 옛날에 끊긴 왕가 (politics에 끊긴 왕조가 아직 없을 때)
const ANCIENT = [
  { realm: 'leonia', house: '아르덴', ago: 190, how: '레오니아 왕가가 서기 전 이 땅을 다스리다 역병과 내전 끝에 끊겼다' },
  { realm: 'valhart', house: '로텐하임', ago: 140, how: '제국이 서기 전 북쪽 공국들을 거느렸으나 마지막 공작이 독살되며 끊겼다' },
  { realm: 'march', house: '하겐', ago: 95, how: '변경백령의 첫 주인이었으나 그라우벨 가문에 밀려 대가 끊겼다' },
];
const ORIGIN = {
  chest: '할머니가 남긴 상자 밑바닥',
  deathbed: '임종하는 어른의 마지막 말',
  scholar: '족보를 캐던 학자의 편지',
  retainer: '옛 왕가를 섬기던 집안의 늙은 가신',
  spouse: '배우자 집안의 오래된 서류',
};
const PROOF_WORD = (p) => (p >= 80 ? '누구도 쉽게 반박 못 한다' : p >= 50 ? '따져 볼 만하다' : p >= 25 ? '정황뿐이다' : '옛이야기 수준이다');
const EXPOSE_WORD = (e) => (e >= 70 ? '대륙의 궁정들이 안다' : e >= 40 ? '귀족들 사이에 돈다' : e >= 15 ? '몇 사람이 안다' : '집안 비밀이다');
const BACK_WORD = (b) => (b >= 75 ? '깃발 아래 사람이 모였다' : b >= 45 ? '편드는 귀족이 늘었다' : b >= 20 ? '몇몇이 귀를 기울인다' : '비웃음을 산다');
const STATUS = { secret: '숨겨 둔 피', claimed: '왕위를 주장함', hidden: '묻어 버린 피', sold: '팔아넘긴 피', pact: '왕위를 내려놓고 대공이 됨', crowned: '왕관을 되찾음' };

/* ---------- 상태 ---------- */
export function claimState(g) {
  g.claim ??= {};
  const v = g.claim;
  v.blood ??= null;     // { realm, house, y, gen, known, origin, proof, exposure, status, fake, backing, buyer }
  v.pretender ??= null; // { name, y, strength }
  v.sceneAt ??= 0;
  v.searchAt ??= -99;
  v.rallyAt ??= -99;
  v.tally ??= { searched: 0, suitors: 0, threats: 0, pretenders: 0, rallies: 0, sold: 0, hid: 0 };
  v.past ??= [];
  v.log ??= [];
  return v;
}
const V = claimState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
function past(g, text) { const v = V(g); v.past.push({ y: g.date.year, text }); if (v.past.length > 12) v.past.shift(); }
const B = (g) => V(g).blood;
const knownBlood = (g) => !!B(g)?.known;
const houseOf = (b) => `${b.house} 왕가`;
const rulerOf = (g, realm) => politicsState(g).rulers?.[realm] ?? null;
const rulerName = (g, realm) => (realm === 'leonia' ? leoniaRuler(g) : rulerOf(g, realm)?.name) ?? `${short(realm)}의 군주`;
const stabOf = (g, realm) => politicsState(g).stab?.[realm] ?? 60;
const expose = (g, n) => { const b = B(g); if (b) b.exposure = clamp(b.exposure + n, 0, 100); };
const prove = (g, n) => { const b = B(g); if (b) b.proof = clamp(b.proof + n, 0, b.fake ? 75 : 100); };

// 끊긴 왕가 하나 고르기: 최근 politics에서 끊긴 왕조가 있으면 그쪽을, 아니면 옛 왕가
function pickDynasty(g, r) {
  const fallen = (politicsState(g).fallen ?? []).filter((f) => f.house && REALMS[f.realm] && g.date.year - f.y >= 1);
  if (fallen.length && r.chance(0.6)) { const f = r.pick(fallen); return { realm: f.realm, house: f.house, y: f.y }; }
  const a = r.pick(ANCIENT);
  return { realm: a.realm, house: a.house, y: g.date.year - a.ago };
}
function grant(g, r, { known = false, origin = null, fake = false } = {}) {
  const d = pickDynasty(g, r);
  V(g).blood = { ...d, gen: Math.max(1, Math.round((g.date.year - d.y) / 25)), known, origin, proof: fake ? 15 : 15 + r.int(0, 20), exposure: 0, status: 'secret', fake, backing: 0, buyer: null };
  return V(g).blood;
}

/* ---------- 화면용 ---------- */
export function claimInfo(g) {
  const v = V(g), b = v.blood;
  const shown = b && b.known;
  return {
    blood: shown ? {
      house: houseOf(b), realm: REALMS[b.realm]?.name ?? '먼 나라', fellYear: b.y, gen: b.gen,
      origin: ORIGIN[b.origin] ?? '집안에 내려온 말', proof: Math.round(b.proof), proofWord: PROOF_WORD(b.proof),
      exposure: Math.round(b.exposure), exposeWord: EXPOSE_WORD(b.exposure), status: STATUS[b.status] ?? '숨겨 둔 피',
      backing: Math.round(b.backing), backWord: BACK_WORD(b.backing), fake: !!b.fake, ruler: rulerName(g, b.realm),
      buyer: b.buyer ?? null,
    } : null,
    pretender: shown && v.pretender ? { name: v.pretender.name, strength: Math.round(v.pretender.strength) } : null,
    tally: { ...v.tally },
    past: v.past.slice(-6).map((x) => ({ ...x })),
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 드러남 ---------- */
defineScene('claim_reveal', {
  title: () => '오래된 피',
  text: (g, s) => {
    const b = B(g);
    if (!b) return '';
    const h = houseOf(b);
    if (s.how === 'chest') return `광 구석에서 할머니가 남긴 상자를 열었다. 밑판이 이중으로 되어 있었다. 그 안에 녹슨 인장 반지와 빛바랜 세례 증서 한 장. 증서에는 ${h}의 문장과 함께 우리 집안 사람의 이름이 적혀 있었다. ${h}${jo(h, '은/는')} ${b.y}년에 대가 끊겼다고 배웠다.`;
    if (s.how === 'deathbed') return `숨이 가빠진 어른이 내 손목을 잡아당겼다. "너는 알아야 한다. 우리 집안은 ${h}의 막내 핏줄이다. 그때 살아남은 아이가 이름을 바꾸고 숨었지. 그 반지는 우물 옆 돌 밑에 있다." 말은 거기서 끊겼다.`;
    if (s.how === 'scholar') return `낯선 학자의 편지가 왔다. "끊긴 ${h}의 족보를 삼십 년째 따라가고 있습니다. 마지막 가지가 당신 집안으로 이어집니다. 증거를 맞춰 보고 싶습니다. 다른 누구에게도 이 편지를 보이지 마십시오."`;
    if (s.how === 'spouse') return `배우자 집안의 오래된 혼서 묶음에서 낯선 문장을 찾았다. ${h}의 문장이다. 그 집안이 왜 늘 혼처를 까다롭게 골랐는지, 이제야 알 것 같다. 그 피는 이제 내 자식들에게도 흐른다.`;
    return `늙은 사내가 문간에 무릎을 꿇었다. "제 증조부께서 ${h}의 마지막 왕자를 업고 도망치셨습니다. 그 아이의 후손을 찾는 데 사 대가 걸렸습니다." 그가 내민 것은 ${h}의 문장이 새겨진 칼자루였다.`;
  },
  choices: (g) => {
    const b = B(g);
    if (!base(g) || !b || b.known) return [];
    return [
      { key: 'keep', label: '조용히 간직한다', hint: '아무에게도 말하지 않는다' },
      { key: 'probe', label: '더 알아본다', hint: '증거가 늘지만 아는 사람도 는다' },
      { key: 'burn', label: '태워 버린다', hint: '이 피와 엮이지 않겠다' },
    ];
  },
  resolve(g, rng, s, k) {
    const b = B(g);
    if (!base(g) || !b || b.known) return '그 이야기는 다시 나오지 않았다.';
    b.known = true; b.origin = s.how;
    log(g, `우리 집안에 ${houseOf(b)}의 피가 흐른다는 것을 알았다.`);
    past(g, `${houseOf(b)}의 피를 알게 됨`);
    note(g, `집안에 ${houseOf(b)}의 피가 흐른다는 것을 알았다.`);
    if (k === 'probe') { prove(g, 12); expose(g, 8); gainSkill(g, 'letters', 0.3, 'int'); return '교구 서고와 옛 세금 장부를 뒤졌다. 이름 몇 개가 맞아떨어졌다. 맞아떨어질수록 손이 떨렸다. 서고지기가 내가 무엇을 찾는지 물었다.'; }
    if (k === 'burn') { b.status = 'hidden'; b.proof = clamp(b.proof - 15, 0, 100); V(g).tally.hid += 1; stress(g, -2); return '아궁이에 넣었다. 종이는 금방 탔다. 인장 반지만은 차마 녹이지 못해 우물에 던졌다. 우리 집안은 오늘도 그냥 우리 집안이다.'; }
    stress(g, 3);
    return '반지를 헝겊에 싸서 침상 밑에 넣었다. 밤에 몇 번이고 꺼내 보았다. 이 피가 축복인지 저주인지 아직은 모르겠다.';
  },
});

/* ---------- 행동 (뜻 있는 형편에서만) ---------- */
ACTIONS.push({
  id: 'claim_search', name: '왕가의 증거를 찾는다', icon: 'scroll',
  desc: '교구 서고, 옛 가신 집안, 무너진 성의 무덤에서 핏줄의 증거를 맞춘다. 캐고 다닐수록 소문도 난다. 은화 세 닢.',
  available: (g) => ready(g) && knownBlood(g) && ['secret', 'claimed'].includes(B(g).status) && B(g).proof < (B(g).fake ? 75 : 95) && mi(g) - V(g).searchAt >= 3 && canSpend(g, 3),
  run(g, rng) {
    const v = V(g), b = B(g);
    v.searchAt = mi(g); v.tally.searched += 1;
    spend(g, 3); tired(g, 5);
    const k = 5 + skill(g, 'letters') / 10 + stat(g, 'int') / 15;
    const got = Math.round(k * (0.6 + rng.next() * 0.8));
    prove(g, got); expose(g, 3 + rng.int(0, 4));
    gainSkill(g, 'letters', 0.3, 'int');
    const h = houseOf(b);
    if (b.fake) return rng.pick([
      `대서소 뒷방에서 옛 잉크를 흉내 낸 증서를 한 장 더 받았다. 종이를 연기에 그을려 세월을 입혔다. 볼수록 진짜 같았다.`,
      `${h}의 옛 영지 마을에서 늙은이들에게 술을 샀다. 내가 원하는 이야기를 그들이 먼저 해 주었다. 사람은 듣고 싶은 이야기를 기억한다.`,
    ]);
    return rng.pick([
      `${h}${jo(h, '이/가')} 무너지던 해의 교구 세례 장부를 찾았다. 한 아이의 이름 옆에 누군가 나중에 덧쓴 이름이 있었다. 우리 집안의 첫 이름이었다.`,
      `무너진 성 아래 묘지에서 우리 집 인장 반지와 같은 문장을 새긴 묘석을 찾았다. 이끼를 긁어내는 동안 누가 지켜보는 것 같았다.`,
      `옛 가신 집안의 노파가 장롱 깊은 곳에서 편지 묶음을 꺼냈다. "언젠가 누가 찾으러 올 거라고 어머니가 그러셨지요."`,
    ]);
  },
});
ACTIONS.push({
  id: 'claim_hide', name: '핏줄의 흔적을 지운다', icon: 'house',
  desc: '소문이 너무 퍼졌다. 서류를 숨기고, 아는 사람의 입을 다물게 하고, 평범한 집안처럼 산다. 은화 다섯 닢.',
  available: (g) => ready(g) && knownBlood(g) && B(g).status === 'secret' && B(g).exposure >= 25 && canSpend(g, 5),
  run(g, rng) {
    const b = B(g);
    spend(g, 5);
    b.exposure = clamp(b.exposure - (12 + stat(g, 'cha') / 8 + rng.int(0, 6)), 0, 100);
    V(g).tally.hid += 1;
    return rng.pick([
      '서고지기에게 술을 사며 그 장부는 쥐가 갉아 먹었다고 말하게 했다. 그는 웃으며 받았다. 언제까지 웃어 줄지는 모른다.',
      '반지를 마당 감나무 밑에 묻었다. 사람들 앞에서는 우리 집안이 원래 소작농이었다고 일부러 크게 말했다.',
    ]);
  },
});
ACTIONS.push({
  id: 'claim_declare', name: '왕위를 주장한다', icon: 'crown',
  desc: '증거를 들고 끊긴 왕가의 적통임을 세상에 알린다. 지금 왕가는 이것을 반역으로 본다. 되돌릴 수 없다.',
  available: (g) => ready(g) && playerAge(g) >= 18 && knownBlood(g) && B(g).status === 'secret' && B(g).proof >= 50,
  run(g, rng) {
    const b = B(g);
    b.status = 'claimed'; b.backing = clamp(10 + b.proof / 5 + (courtState(g).standing ?? 0) / 5, 0, 100); b.exposure = 100;
    const h = houseOf(b);
    reportCrime(g, 'pretender', CITY.includes(REALMS[b.realm]?.capital) ? REALMS[b.realm].capital : here(g));
    deed(g, 'brave', 6, `${h}의 적통이라며 나섰다`);
    L(g).renown = (L(g).renown ?? 0) + 10;
    chron(g, `${g.player.name}, 스스로 ${h}의 적통이라 밝히고 ${short(b.realm)}의 왕위를 주장하다.`, 90);
    note(g, `${h}의 적통임을 밝히고 왕위를 주장했다.`);
    log(g, `${h}의 이름으로 ${short(b.realm)}의 왕위를 주장했다.`);
    past(g, '왕위를 주장함');
    return `광장의 돌계단에 올라 인장 반지를 끼운 손을 들었다. 서류를 읽는 동안 사람들은 웃다가, 수군거리다가, 조용해졌다. 그날 밤 ${rulerName(g, b.realm)}의 궁정에 내 이름이 올라갔다. 이제 숨을 곳은 없다.`;
  },
});
ACTIONS.push({
  id: 'claim_rally', name: '왕위 주장에 사람을 모은다', icon: 'crown',
  desc: '불만 많은 귀족, 옛 가신 집안, 떠도는 기사들을 찾아다닌다. 은화가 들고, 지금 왕가의 눈도 따갑다.',
  available: (g) => ready(g) && knownBlood(g) && B(g).status === 'claimed' && mi(g) - V(g).rallyAt >= 2 && canSpend(g, 8),
  run(g, rng) {
    const v = V(g), b = B(g);
    v.rallyAt = mi(g); v.tally.rallies += 1;
    spend(g, 8); tired(g, 6);
    const k = 3 + stat(g, 'cha') / 10 + b.proof / 25 + (100 - stabOf(g, b.realm)) / 20 - (v.pretender ? 2 : 0);
    b.backing = clamp(b.backing + k * (0.5 + rng.next()), 0, 100);
    return rng.pick([
      `늙은 기사 셋이 무릎을 꿇었다. 둘은 진심 같았고, 하나는 값을 재는 눈이었다. 셋 다 필요하다.`,
      `${short(b.realm)} 남쪽의 백작이 연회를 열어 주었다. 술잔을 들며 "적통께"라고 말한 사람이 열둘. 다음 날 아침 그 열둘 가운데 넷이 편지를 보내 몸이 아프다고 했다.`,
      `시장 상인들이 내 문장을 새긴 동전을 몰래 돌린다는 말을 들었다. 웃어야 할지 두려워해야 할지 모르겠다.`,
    ]);
  },
});
ACTIONS.push({
  id: 'claim_forge', name: '끊긴 왕가의 후손 행세를 꾸민다', icon: 'mask',
  desc: '끊긴 왕가의 마지막 가지가 나라고 꾸민다. 그럴듯한 서류와 이야기를 짓는 데 은화 마흔 닢. 들키면 사기꾼이고, 안 들키면 왕손이다.',
  available: (g) => ready(g) && !B(g) && CITY.includes(here(g)) && skill(g, 'letters') >= 30 && stat(g, 'cha') >= 30 && (politicsState(g).fallen ?? []).length > 0 && canSpend(g, 40),
  run(g, rng) {
    spend(g, 40);
    const b = grant(g, rng, { known: true, origin: 'forged', fake: true });
    b.proof = 20 + Math.round(skill(g, 'letters') / 4);
    log(g, `${houseOf(b)}의 후손 행세를 꾸몄다.`);
    past(g, `${houseOf(b)}의 가짜 후손이 됨`);
    return `대서소의 늙은 위조꾼이 ${houseOf(b)}의 옛 문장 도안을 찾아 주었다. 할머니의 할머니 이름을 새로 지었다. 거울 앞에서 그 이야기를 백 번 되풀이했다. 백한 번째에는 나도 반쯤 믿었다.`;
  },
});

/* ---------- 꼬이는 사람들 ---------- */
defineScene('claim_suitor', {
  title: (g, s) => (s.who === 'spy' ? '정중한 손님' : s.who === 'church' ? '교단의 관심' : s.who === 'exile' ? '바다 건너 편지' : '귀족의 제안'),
  text: (g, s) => {
    const b = B(g);
    if (!b) return '';
    const h = houseOf(b);
    if (s.who === 'noble') return `${s.lord}${jo(s.lord, '이/가')} 사람을 보내 왔다. "${h}의 피라면 우리 가문과 손을 잡을 만하지요. 혼인이든, 후견이든. 서류는 저희가 지켜 드리겠습니다." 지켜 준다는 말이 가둬 둔다는 말처럼 들렸다. 혹은 값을 매기자고 한다. 은화 ${s.price}닢.`;
    if (s.who === 'spy') return `${rulerName(g, b.realm)}의 궁정에서 왔다는 사내가 말했다. "폐하께서는 옛 왕가에 대한 존경을 잊지 않으십니다. 서류를 저희에게 맡기시고 조용히 사시면, 해마다 연금이 나갑니다." 그 뒤의 말은 하지 않았다. 하지 않아도 들렸다.`;
    if (s.who === 'church') return `주교의 비서가 찾아왔다. "왕관은 교단의 축복 없이 머리에 앉지 않습니다. 교단이 당신의 피를 인정해 드릴 수도 있습니다. 물론 교단이 청하는 일들을 들어주신다면요."`;
    return `망명 궁정의 인장이 찍힌 편지가 왔다. "${h}의 이름은 지금 왕가를 흔드는 깃발이 될 수 있습니다. 우리와 함께하십시오. 배와 칼은 우리가 대겠습니다."`;
  },
  choices: (g, s) => {
    const b = B(g);
    if (!ready(g) || !b || !b.known || !['secret', 'claimed'].includes(b.status)) return [];
    if (s.who === 'noble') return [
      { key: 'ally', label: '손을 잡는다', hint: '후원이 생기지만 그 가문의 끈에 묶인다' },
      { key: 'sell', label: '서류를 판다', hint: `은화 ${s.price}닢. 그 피는 이제 그 가문의 패가 된다` },
      { key: 'no', label: '거절한다', hint: '혼자 간다' },
    ];
    if (s.who === 'spy') return [
      { key: 'yield', label: '서류를 넘기고 연금을 받는다', hint: '위험이 사라지는 대신 주장을 내려놓는다' },
      { key: 'no', label: '모른다고 잡아뗀다', hint: '그들은 다시 온다' },
    ];
    return [
      { key: 'ally', label: '받아들인다', hint: '편이 늘지만 빚도 는다' },
      { key: 'no', label: '거절한다', hint: '그쪽은 다른 깃발을 찾는다' },
    ];
  },
  resolve(g, rng, s, k) {
    const v = V(g), b = B(g);
    if (!ready(g) || !b || !['secret', 'claimed'].includes(b.status)) return '그 이야기는 흐지부지되었다.';
    v.tally.suitors += 1;
    const h = houseOf(b);
    if (k === 'sell') {
      g.player.money += s.price;
      b.status = 'sold'; b.buyer = s.lord; b.proof = clamp(b.proof - 40, 0, 100); v.tally.sold += 1;
      log(g, `${h}의 서류를 ${s.lord}에 팔았다.`); past(g, '왕가의 서류를 팖');
      return `은화 ${s.price}닢이 든 궤짝이 왔다. 인장 반지와 서류는 그 가문의 금고로 들어갔다. 반년 뒤, 그 가문이 ${h}의 "잃어버린 왕자"를 찾았다는 소문이 돌았다. 그 왕자는 내 얼굴을 닮지 않았다.`;
    }
    if (k === 'yield') {
      b.status = 'hidden'; b.exposure = clamp(b.exposure - 40, 0, 100); b.proof = clamp(b.proof - 30, 0, 100);
      g.player.money += 25;
      log(g, `${rulerName(g, b.realm)}의 궁정에 서류를 넘기고 연금을 받기로 했다.`); past(g, '왕가의 서류를 넘김');
      return '서류를 넘겼다. 사내는 인장 반지는 두고 가도 된다고 했다. 반지만으로는 아무것도 증명하지 못한다는 뜻이다. 첫해 연금 은화 스물다섯 닢이 왔다. 그 뒤로 우리 집 앞을 지나는 낯선 사람이 줄었다.';
    }
    if (k === 'ally') {
      prove(g, s.who === 'church' ? 15 : 6); expose(g, 12);
      if (b.status === 'claimed') b.backing = clamp(b.backing + (s.who === 'exile' ? 15 : 10), 0, 100);
      const c = courtState(g); c.standing = clamp((c.standing ?? 0) + 5, 0, 100);
      return s.who === 'noble' ? `${s.lord}의 연회에 초대받았다. 상석이었다. 모두가 나를 "전하"라고 불렀다. 그 가문 사람들만은 그 말을 할 때 조금 웃었다.`
        : s.who === 'church' ? '주교가 교구 장부에 내 핏줄을 인정하는 한 줄을 적었다. 그 대가로 해마다 교단에 바칠 것들의 목록이 함께 왔다.'
          : '편지에 답장을 보냈다. 한 달 뒤 바다 건너에서 칼 쉰 자루와 은화 상자가 왔다. 상자 밑에는 차용증이 깔려 있었다.';
    }
    if (s.who === 'spy') expose(g, 5);
    return s.who === 'spy' ? '"그렇군요." 사내는 모자를 고쳐 썼다. "폐하께서 실망하실 겁니다." 그는 나가면서 문틀의 높이를 손으로 재는 시늉을 했다.' : '정중하게 돌려보냈다. 거절당한 쪽이 이 일을 누구에게 이야기할지가 걱정이다.';
  },
});
defineScene('claim_threat', {
  title: () => '밤의 손님',
  text: (g) => {
    const b = B(g);
    return `잠결에 개가 짖다 그쳤다. 창문 걸쇠가 소리 없이 들렸다. ${rulerName(g, b?.realm ?? 'leonia')}의 궁정은 끊긴 왕가의 피를 두 번 끊는 데 망설이지 않는다.`;
  },
  choices: (g) => {
    const b = B(g);
    if (!ready(g) || !b || !['secret', 'claimed'].includes(b.status)) return [];
    return [
      { key: 'fight', label: '칼을 뽑는다', hint: '힘과 칼솜씨. 지면 죽는다' },
      { key: 'flee', label: '뒷문으로 달아난다', hint: '살지만 소문이 더 난다' },
      { key: 'beg', label: '주장을 버리겠다고 빈다', hint: '서류를 넘기고 산다' },
    ];
  },
  resolve(g, rng, s, k) {
    const v = V(g), b = B(g);
    if (!ready(g) || !b) return '그 밤은 조용히 지나갔다.';
    v.tally.threats += 1;
    if (k === 'beg') {
      b.status = 'hidden'; b.proof = clamp(b.proof - 40, 0, 100); b.exposure = clamp(b.exposure - 30, 0, 100); b.backing = 0; stress(g, 15);
      log(g, '자객 앞에서 주장을 버렸다.'); past(g, '주장을 버림');
      return '칼끝이 목에 닿은 채로 서류가 있는 곳을 말했다. 그들은 서류를 태우고, 반지를 가져갔다. 나는 살았다. 살았다는 것 말고는 아무것도 남지 않은 밤이었다.';
    }
    if (k === 'flee') { expose(g, 10); stress(g, 10); g.player.fatigue = Math.min(100, g.player.fatigue + 20); return '맨발로 뒷담을 넘었다. 이웃집 헛간에서 새벽을 기다렸다. 아침에 돌아가 보니 침상에 칼자국이 셋. 마을 사람들이 무슨 일이냐고 물었다. 대답할 수 없었다.'; }
    if (check(rng, stat(g, 'str') * 0.3 + stat(g, 'agi') * 0.3 + skill(g, 'sword') * 0.4, 45)) {
      stress(g, 10); g.player.fatigue = Math.min(100, g.player.fatigue + 15);
      if (b.status === 'claimed') b.backing = clamp(b.backing + 8, 0, 100);
      log(g, '자객을 물리쳤다.');
      return '첫 칼을 막고 등잔을 걷어찼다. 어둠 속에서 누군가 신음하며 창으로 굴러 나갔다. 아침에 마당에서 궁정 경비대 신발 한 짝을 주웠다.';
    }
    if (rng.chance(0.35)) { L(g).pendingDeath = `${houseOf(b)}의 피를 끊으러 온 자객에게 죽었다`; return '칼이 먼저 닿았다. 마지막으로 든 생각은 반지를 어디에 숨겼더라, 하는 것이었다.'; }
    g.player.fatigue = Math.min(100, g.player.fatigue + 35); stress(g, 18);
    return '팔과 어깨를 베였지만 살았다. 비명에 이웃들이 횃불을 들고 몰려왔다. 자객은 달아났다. 한동안 칼을 쥐면 손이 떨렸다.';
  },
});
defineScene('claim_pretender', {
  title: () => '또 하나의 왕손',
  text: (g, s) => {
    const b = B(g);
    return `${short(b?.realm ?? 'leonia')}에 ${s.name}${jo(s.name, '이/가')} 나타났다. 자기가 ${houseOf(b ?? { house: '옛' })}의 마지막 적통이라고 한다. 서류도 있고, 반지도 있고, 뒤를 봐주는 귀족도 있다. 내가 아는 족보에 그 이름은 없다.`;
  },
  choices: (g) => {
    const b = B(g);
    if (!ready(g) || !b || !b.known || !['secret', 'claimed'].includes(b.status)) return [];
    const c = [
      { key: 'expose', label: '가짜임을 밝힌다', hint: '내 증거로 그의 증거를 무너뜨린다. 대신 내 피도 드러난다' },
      { key: 'back', label: '그의 편에 선다', hint: '내 주장을 내려놓고 그 깃발 아래 들어간다' },
      { key: 'wait', label: '지켜본다', hint: '그가 먼저 칼을 맞기를' },
    ];
    return c;
  },
  resolve(g, rng, s, k) {
    const v = V(g), b = B(g);
    if (!ready(g) || !b) return '그 사람 이야기는 금방 잦아들었다.';
    v.tally.pretenders += 1;
    const p = v.pretender;
    if (k === 'expose') {
      expose(g, 25);
      if (check(rng, b.proof * 0.6 + stat(g, 'int') * 0.3 + skill(g, 'letters') * 0.2, 40 + (p?.strength ?? 30) / 3)) {
        v.pretender = null; prove(g, 8);
        if (b.status === 'claimed') b.backing = clamp(b.backing + 12, 0, 100);
        log(g, `가짜 왕손 ${s.name}의 거짓을 밝혔다.`);
        return `그의 세례 증서에 적힌 교구는 그 해에 불타 없던 곳이었다. 그 한 줄로 충분했다. ${s.name}의 후원자들이 하룻밤 사이에 등을 돌렸다. 사람들은 이제 진짜를 찾는다. 그 눈길이 나를 향한다.`;
      }
      if (p) p.strength = clamp(p.strength + 10, 0, 100);
      return `내가 내민 증거는 그의 후원자들 손에서 위조라는 말을 들었다. 사람들은 먼저 나선 쪽을 믿는다. ${s.name}${jo(s.name, '은/는')} 오히려 나를 가짜라고 불렀다.`;
    }
    if (k === 'back') {
      v.pretender = null; b.status = 'hidden'; b.backing = 0;
      const c = courtState(g); c.standing = clamp((c.standing ?? 0) + 6, 0, 100);
      g.player.money += 15;
      log(g, `${s.name}의 편에 섰다.`); past(g, '다른 왕손의 편에 섬');
      return `${s.name}${jo(s.name, '은/는')} 나를 "숙부"라고 불렀다. 진짜 숙부가 아니라는 걸 우리 둘 다 안다. 은화 열다섯 닢과 그의 작은 궁정의 자리가 생겼다.`;
    }
    return `${s.name}의 소식에 귀만 기울였다. 사람들이 왕손 이야기를 할 때마다 입을 다물었다.`;
  },
});
defineScene('claim_crown', {
  title: () => '왕관의 날',
  text: (g) => {
    const b = B(g);
    if (!b) return '';
    return `${short(b.realm)}의 귀족 절반이 내 깃발 아래 모였다. ${rulerName(g, b.realm)}의 궁정은 흔들리고 있다. 오늘 왕도로 진군하면 왕관이 손에 닿을지도 모른다. 아니면 모든 것을 잃는다. 그 전날 밤, 지금 왕가의 사절이 몰래 찾아와 대공 칭호와 영지를 줄 테니 깃발을 내리라고 했다.`;
  },
  choices: (g) => {
    const b = B(g);
    if (!ready(g) || !b || b.status !== 'claimed') return [];
    return [
      { key: 'march', label: '왕도로 진군한다', hint: '왕관이냐, 교수대냐' },
      { key: 'pact', label: '대공 칭호를 받는다', hint: '왕위를 내려놓고 큰 집안이 된다' },
      { key: 'wait', label: '한 해 더 기다린다', hint: '편이 흩어질 수 있다' },
    ];
  },
  resolve(g, rng, s, k) {
    const b = B(g);
    if (!ready(g) || !b || b.status !== 'claimed') return '그날은 오지 않았다.';
    const h = houseOf(b);
    if (k === 'pact') {
      b.status = 'pact'; b.backing = 0;
      g.player.money += 120;
      const c = courtState(g); c.standing = clamp((c.standing ?? 0) + 25, 0, 100); c.disgrace = 0;
      L(g).renown = (L(g).renown ?? 0) + 15;
      chron(g, `${g.player.name}, ${h}의 이름으로 왕위를 내려놓고 ${rulerName(g, b.realm)}에게서 대공 칭호를 받다.`, 80);
      log(g, '왕위를 내려놓고 대공 칭호를 받았다.'); past(g, '대공이 됨');
      return `왕 앞에 무릎을 꿇었다. 왕은 내 어깨에 칼을 얹고 대공이라 불렀다. 연금 궤짝이 왔다. 나를 따르던 늙은 기사 하나가 그날 밤 말없이 떠났다. 그는 왕관을 보러 왔던 사람이다.`;
    }
    if (k === 'wait') { b.backing = clamp(b.backing - 20, 0, 100); return '한 해를 더 기다리기로 했다. 겨울 동안 편지 답장이 하나둘 늦어졌다.'; }
    const P = politicsState(g);
    const odds = clamp(0.15 + (b.backing - 70) / 100 + (40 - stabOf(g, b.realm)) / 100 + (b.fake ? -0.1 : 0), 0.05, 0.65);
    if (rng.chance(odds) && !P.rulers?.[b.realm]) {
      // 레오니아 왕실은 world.js가 맡는다: 왕관 대신 왕이 나를 적통으로 받아들인다
      b.status = 'pact'; b.backing = 0;
      g.player.money += 200;
      const c = courtState(g); c.standing = clamp((c.standing ?? 0) + 40, 0, 100); c.disgrace = 0;
      L(g).renown = (L(g).renown ?? 0) + 30;
      chron(g, `${g.player.name}, 왕도 성문 앞에서 ${rulerName(g, b.realm)}에게 ${h}의 적통으로 인정받고 왕가의 대공이 되다.`, 95);
      log(g, `${short(b.realm)} 왕실이 나를 ${h}의 적통으로 받아들였다.`); past(g, '왕가의 적통으로 인정받음');
      return `성문 앞에서 왕의 사절이 말에서 내렸다. 피를 보지 않는 길이 제안되었다. 왕은 나를 ${h}의 적통으로 인정하고 왕가의 대공으로 삼았다. 옥좌는 아니었다. 그러나 다음 왕을 고르는 자리에 내 이름이 오른다.`;
    }
    if (rng.chance(odds) && P.rulers?.[b.realm]) {
      const old = rulerName(g, b.realm);
      const r = P.rulers[b.realm];
      P.fallen ??= [];
      if (r.house) P.fallen.push({ realm: b.realm, house: r.house, y: g.date.year });
      P.rulers[b.realm] = { ...r, name: g.player.name, sex: g.player.sex ?? r.sex, house: b.house, since: g.date.year, born: g.date.year - playerAge(g), heir: true, legend: null, no: 0 };
      P.stab[b.realm] = clamp((P.stab[b.realm] ?? 50) - 10, 0, 100);
      b.status = 'crowned'; b.backing = 100;
      g.player.money += 200;
      L(g).renown = (L(g).renown ?? 0) + 40;
      chron(g, `${g.player.name}, ${old}을 몰아내고 ${short(b.realm)}의 옥좌에 앉다. 끊겼던 ${h}의 이름이 돌아오다.`, 100);
      log(g, `${short(b.realm)}의 왕관을 썼다.`); past(g, `${short(b.realm)}의 왕관을 씀`);
      return `성문은 안에서 열렸다. ${old}${jo(old, '은/는')} 밤새 달아났다. 대관식 날 아침, 할머니의 상자에서 나온 녹슨 반지를 끼고 옥좌에 앉았다. 왕관은 생각보다 무거웠다. 그 무게는 이제 내 자식들 몫이기도 하다.`;
    }
    b.status = 'hidden'; b.backing = 0; b.exposure = 100;
    reportCrime(g, 'pretender', here(g), { mult: 2 });
    if (rng.chance(0.4)) { L(g).pendingDeath = `${short(b.realm)}의 왕위를 노리고 진군하다 왕도 성벽 아래에서 죽었다`; return '성벽 위에서 화살비가 쏟아졌다. 약속했던 귀족들의 깃발이 언덕 너머에서 끝내 나타나지 않았다.'; }
    stress(g, 25);
    log(g, '진군이 무너졌다. 쫓기는 몸이 되었다.'); past(g, '진군이 무너짐');
    return `약속했던 귀족 셋이 마지막 날 등을 돌렸다. 군대는 반나절 만에 흩어졌다. 나는 짐수레 밑에 숨어 빠져나왔다. 내 이름은 이제 ${short(b.realm)}의 모든 성문에 반역자로 붙어 있다.`;
  },
});

/* ---------- 한 달 ---------- */
const LORDS = ['베르덴 백작가', '그라이펜 후작가', '하르펜 영주 집안', '남부의 늙은 공작', '아이젠의 대상인 가문'];
const PRETENDER_NAMES = ['요한 아르덴', '마티아스라는 젊은이', '레오폴트라는 수도사', '엘리자라는 여인', '카스파르라는 떠돌이 기사'];
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g), b = v.blood;
  if (!b) return;
  const r = ownRng(g, 5);
  const now = mi(g);
  if (b.status === 'secret' || b.status === 'hidden') b.exposure = clamp(b.exposure - 0.3, 0, 100);
  if (b.status === 'claimed') b.backing = clamp(b.backing - 0.4, 0, 100);
  if (v.pretender) { v.pretender.strength = clamp(v.pretender.strength - 0.3, 0, 100); if (v.pretender.strength <= 0) { log(g, `가짜 왕손 ${v.pretender.name}의 이야기가 잦아들었다.`); v.pretender = null; } }
  if (b.status === 'crowned') { if (g.date.month === 1 && !g.bondage?.slave) g.player.money += 30; return; }
  if (b.status === 'pact') { if (g.date.month === 1 && !g.bondage?.slave) g.player.money += 10; return; }
  if (!ready(g) || now - v.sceneAt < 4) return;
  const fire = (kind, data) => { queueScene(g, kind, data); v.sceneAt = now; };
  // 드러남: 아직 모르는 피
  if (!b.known) {
    if (r.chance(0.006)) return fire('claim_reveal', { how: b.origin ?? r.pick(['chest', 'deathbed', 'scholar', 'retainer']) });
    return;
  }
  if (!['secret', 'claimed'].includes(b.status)) return;
  if (b.status === 'claimed' && b.backing >= 70 && r.chance(0.08) && !sceneQueued(g, 'claim_crown')) return fire('claim_crown', {});
  const heat = b.exposure * (b.proof / 100) * (b.status === 'claimed' ? 1.6 : 1);
  if (heat >= 25 && r.chance(heat / 1500) && !sceneQueued(g, 'claim_threat')) return fire('claim_threat', {});
  if (b.exposure >= 20 && r.chance(0.02 + b.exposure / 2500) && !sceneQueued(g, 'claim_suitor')) {
    const who = r.pick(b.status === 'claimed' ? ['noble', 'exile', 'church', 'spy'] : ['noble', 'noble', 'spy', 'church', 'exile']);
    return fire('claim_suitor', { who, lord: r.pick(LORDS), price: 40 + Math.round(b.proof) });
  }
  if (!v.pretender && b.exposure >= 30 && r.chance(0.01)) {
    const name = r.pick(PRETENDER_NAMES);
    v.pretender = { name, y: g.date.year, strength: 30 + r.int(0, 30) };
    if (b.status === 'claimed') b.backing = clamp(b.backing - 10, 0, 100);
    return fire('claim_pretender', { name });
  }
});

/* ---------- 대 잇기 ---------- */
// 핏줄과 증거는 자식에게 그대로 간다. 주장도 대를 넘어 이어진다.
HOOKS.heir.push((g, rng, old) => {
  const v = V(g), b = v.blood;
  const r = ownRng(g, 13);
  const by = old?.name ?? '선대';
  if (!b) {
    // 배우자 집안에서 들어온 피가 드러나는 일 (드물다)
    if (r.chance(0.01)) { grant(g, r, { known: false, origin: 'spouse' }); }
    return;
  }
  b.gen += 1;
  b.exposure = Math.round(b.exposure * 0.5);
  if (b.status === 'sold') b.status = 'secret'; // 판 것은 선대의 서류였다. 피는 남는다.
  if (b.status === 'hidden' && r.chance(0.5)) b.status = 'secret';
  if (b.status === 'claimed') { b.backing = Math.round(b.backing * 0.6); log(g, `${by}의 왕위 주장을 물려받았다. 깃발 아래 남은 사람들이 새 주인의 얼굴을 살핀다.`); }
  else if (b.status === 'crowned') { log(g, `${by}${jo(by, '이/가')} 되찾은 왕가의 이름을 물려받았다.`); }
  else if (b.known) log(g, `${by}${jo(by, '이/가')} 숨겨 온 ${houseOf(b)}의 피를 물려받았다.`);
  else if (r.chance(0.12)) { b.known = false; queueScene(g, 'claim_reveal', { how: 'deathbed' }); }
});
HOOKS.newGame.push((g) => {
  const v = V(g);
  const r = ownRng(g, 1);
  if (r.chance(0.05)) grant(g, r, { known: false });
});
HOOKS.migrate.push((g) => { V(g); });
