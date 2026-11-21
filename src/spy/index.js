// 25단계: 첩보와 밀정. 상태는 g.spy 하나, 화면 연결점은 spyInfo(g).
// - 조직(org): 왕실 밀정청, 대귀족 가문의 귀, 상단 정보망(저울추 모임), 성광교 감찰원. 저쪽에서 찾아오거나(spy_recruit) 내가 찾아간다(spy_seek).
// - 훈련(trained)과 가짜 신분(cover): 암호, 미행, 자물쇠, 거짓말. 가짜 신분이 두꺼울수록 의심(heat)이 덜 쌓인다.
// - 임무(spy_job): 편지 훔치기, 사람 빼내기, 소문 심기, 사람 지켜보기, 배신자 처리. 조심스럽게, 대담하게, 일부러 그르치기, 거절.
// - 이중간첩(dbl): 다른 나라 밀정이 손을 내민다. 양쪽에 팔면 품삯은 두 배, 의심도 빨리 쌓이고 언젠가 한쪽을 골라야 한다.
// - 정체가 드러남(spy_caught, spy_exposed): 붙잡히거나 누가 알아본다. 입을 다물지, 이름을 댈지, 달아날지.
// - 조직은 쉽게 놓아주지 않는다(spy_leave, hunt): 아는 게 많을수록(known) 떠나면 쫓는 손(spy_hunter)이 온다. 대를 넘겨서도.
// secret의 '밤의 얼굴(밀정)'은 가면 이름으로 혼자 하는 밤일, politics의 첩자 제안은 한 번 맡는 심부름이다.
// 이쪽은 조직에 몸을 담는 일이라 그 둘과 따로 굴러간다. 둘 중 하나를 하는 중이면 먼저 찾아오지 않는다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainStat, gainSkill } from '../game.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, spend, canSpend, check, traveling, tired } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { isJailed, jail, reportCrime, CRIMES } from '../crime.js';
import { deed } from '../repute/index.js';
import { courtState } from '../court/index.js';
import { politicsState } from '../politics/index.js';
import { REALMS } from '../realms/data.js';
import { realmState, realmOf } from '../realms/index.js';
import { liveHouses, houseName } from '../history/nobles.js';

CRIMES.espionage ??= { name: '첩자 노릇', heat: 40, sev: 10, noto: 6 };

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 97) ^ Math.imul(mi(g) * 67 + salt + 47, 2654435761)) | 0 });
const stat = (g, id) => g.player.stats?.[id] ?? 0;
const skill = (g, id) => g.player.skills?.[id] ?? 0;
const base = (g) => playerAge(g) >= 16 && !g.over && !L(g).heirPending;
const ready = (g) => base(g) && !traveling(g) && !isJailed(g) && !g.bondage?.slave && !g.army?.campaign && !g.army?.captive;
const short = (id) => REALMS[id]?.short ?? '먼 나라';
const citizen = (g) => realmState(g).citizen ?? 'leonia';
const jo = (w, pair) => J(w, pair).slice(String(w).length);

// 첩보가 오가는 큰 고장
const CITY = ['leocast', 'harfen', 'verden', 'eisen', 'solaris', 'serenia', 'barka', 'graubel'];
const inCity = (g) => CITY.includes(here(g));
const HUMAN = ['leonia', 'valhart', 'holy', 'serenia', 'free', 'march'];
const CHURCH = ['leonia', 'holy', 'valhart'];

export const ORGS = {
  crown: { kind: '왕실 밀정청', alias: '잿빛 방', desc: '왕의 이름으로 남의 편지를 뜯는다. 들어가기는 쉬워도 나오는 문은 없다고들 한다.' },
  house: { kind: '대귀족 가문의 귀', alias: '집사의 장부', desc: '한 가문이 제 몫을 지키려고 부리는 눈과 귀. 가문이 무너지면 같이 무너진다.' },
  guild: { kind: '상단 정보망', alias: '저울추 모임', desc: '상단들이 돈을 모아 부린다. 곡물 값과 전쟁 소문이 같은 장부에 적힌다.' },
  church: { kind: '성광교 감찰원', alias: '고해소 뒷문', desc: '고해성사로 들은 것을 모으는 곳. 신앙보다 장부가 먼저다.' },
  foreign: { kind: '이웃 나라 밀정', alias: '바다 건너 손님', desc: '남의 나라 왕실이 이 땅에 심어 둔 손.' },
};
const RANKS = ['끄나풀', '요원', '고참', '조장'];
const HANDLERS = ['회색 장갑', '늙은 제본공', '셋째 집사', '빨간 끈', '저녁 손님', '물레방앗간 주인', '외눈 서기', '양초 장수'];
const COVER_NAMES = ['요나스 브렌', '마르타 쿨', '에발트 지머', '리제 하르트', '오토 펠', '베아 슈탐', '한넬로 크로이츠', '디트 마이어'];
const COVER_TRADES = ['떠돌이 필경사', '포도주 중개인', '제본공', '약초 장수', '마구 수리공', '순례자 안내인', '양모 상인 대리인', '악사'];

export const MISSIONS = {
  letter: { name: '편지 훔치기', diff: 42, stat: 'agi', pay: 6 },
  extract: { name: '사람 빼내기', diff: 50, stat: 'sen', pay: 10 },
  rumor: { name: '소문 심기', diff: 38, stat: 'cha', pay: 5 },
  watch: { name: '사람 지켜보기', diff: 36, stat: 'sen', pay: 4 },
  burn: { name: '배신자 처리', diff: 48, stat: 'agi', pay: 14 },
};
const TRUST_WORD = (t) => (t >= 70 ? '깊이 믿는다' : t >= 40 ? '쓸 만하다고 본다' : t >= 15 ? '아직 지켜본다' : t >= 0 ? '의심한다' : '등을 돌리기 직전이다');
const HEAT_WORD = (h) => (h >= 70 ? '누가 뒤를 밟는다' : h >= 45 ? '눈길이 따갑다' : h >= 20 ? '조금 주목받는다' : '조용하다');
const KNOWN_WORD = (k) => (k >= 60 ? '너무 많이 안다' : k >= 25 ? '알 만큼 안다' : '아직 모르는 게 많다');
const HUNT_WORD = (h) => (h >= 60 ? '쫓는 손이 바짝 붙었다' : h >= 30 ? '아직 찾고 있다' : '거의 잊혔다');

/* ---------- 상태 ---------- */
export function spyState(g) {
  g.spy ??= {};
  const v = g.spy;
  v.org ??= null;    // { key, name, realm, house, y, rank, trust, trained, known, handler, missions }
  v.cover ??= null;  // { name, trade, y, depth }
  v.heat ??= 0;
  v.dbl ??= null;    // { realm, name, trust, y }
  v.hunt ??= null;   // { name, key, realm, house, y, level }
  v.offerAt ??= -99;
  v.taskAt ??= -99;
  v.sceneAt ??= 0;
  v.legacy ??= null; // 선대가 몸담았던 조직 이름
  v.tally ??= { missions: 0, failed: 0, caught: 0, exposed: 0, turned: 0, quit: 0, hunters: 0 };
  v.past ??= [];
  v.log ??= [];
  return v;
}
const V = spyState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
function past(g, text) { const v = V(g); v.past.push({ y: g.date.year, text }); if (v.past.length > 12) v.past.shift(); }
const heat = (g, n) => { const v = V(g); const k = n > 0 ? (v.cover ? 1 - v.cover.depth / 200 : 1) * (v.dbl ? 1.4 : 1) : 1; v.heat = clamp(v.heat + n * k, 0, 100); };
const trust = (g, n) => { const o = V(g).org; if (o) o.trust = clamp(o.trust + n, -30, 100); };
const busyElse = (g) => !!politicsState(g).me?.spyFor || g.secret?.mask?.kind === 'spy';
const rivalOf = (g, realm, r) => { const others = HUMAN.filter((x) => x !== realm && REALMS[x]); return others.length ? r.pick(others) : 'valhart'; };
const topHouse = (g) => liveHouses(g).slice().sort((a, b) => (b.power ?? 0) - (a.power ?? 0))[0] ?? null;

function makeOrg(g, key, r) {
  const realm = HUMAN.includes(citizen(g)) ? citizen(g) : 'leonia';
  const h = key === 'house' ? topHouse(g) : null;
  if (key === 'house' && !h) key = 'guild';
  const name = key === 'crown' ? `${short(realm)} 왕실 밀정청` : key === 'house' ? `${houseName(h)}의 귀` : key === 'church' ? '성광교 감찰원' : key === 'foreign' ? `${short(realm)}의 밀정` : '저울추 모임';
  return { key, name, realm, house: h?.id ?? null, y: g.date.year, rank: 0, trust: 30, trained: 0, known: 8, handler: r.pick(HANDLERS), missions: 0 };
}
function pickOrgKey(g, r) {
  const c = courtState(g);
  if ((c.office || (c.standing ?? 0) >= 25) && r.chance(0.6)) return r.chance(0.5) ? 'crown' : 'house';
  if (CHURCH.includes(realmOf(here(g))) && (realmOf(here(g)) === 'holy' || r.chance(0.25))) return 'church';
  if (skill(g, 'trade') >= 20 && r.chance(0.6)) return 'guild';
  return r.pick(['crown', 'crown', 'house', 'guild', 'church']);
}
function orgAlive(g, o) { return !o || o.key !== 'house' || liveHouses(g).some((h) => h.id === o.house); }

/* ---------- 화면용 ---------- */
export function spyInfo(g) {
  const v = V(g);
  const o = v.org;
  return {
    org: o ? { name: o.name, kind: ORGS[o.key]?.kind ?? '첩보 조직', alias: ORGS[o.key]?.alias ?? '', rank: RANKS[o.rank] ?? RANKS[0], trust: Math.round(o.trust), trustWord: TRUST_WORD(o.trust), trained: Math.round(o.trained), known: Math.round(o.known), knownWord: KNOWN_WORD(o.known), handler: o.handler, years: g.date.year - o.y, missions: o.missions } : null,
    cover: v.cover ? { name: v.cover.name, trade: v.cover.trade, depth: Math.round(v.cover.depth), years: g.date.year - v.cover.y } : null,
    heat: Math.round(v.heat),
    heatWord: HEAT_WORD(v.heat),
    dbl: v.dbl ? { name: v.dbl.name, trust: Math.round(v.dbl.trust), years: g.date.year - v.dbl.y } : null,
    hunt: v.hunt ? { name: v.hunt.name, level: Math.round(v.hunt.level), word: HUNT_WORD(v.hunt.level), years: g.date.year - v.hunt.y } : null,
    legacy: v.legacy,
    tally: { ...v.tally },
    past: v.past.slice(-6).map((x) => ({ ...x })),
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 포섭 ---------- */
function join(g, s, extra = 0) {
  const v = V(g);
  const r = ownRng(g, 3);
  v.org = makeOrg(g, s.org, r);
  v.org.trust += extra;
  v.hunt = null;
  v.offerAt = mi(g);
  note(g, `${v.org.name}에 몸을 담았다.`);
  log(g, `${v.org.name}의 사람이 되었다. 연락책은 '${v.org.handler}'.`);
  past(g, `${v.org.name}에 들어감`);
  return v.org;
}
defineScene('spy_recruit', {
  title: () => '낯선 제안',
  text: (g, s) => {
    const o = ORGS[s.org] ?? ORGS.crown;
    const lead = s.how === 'seek'
      ? '석 달 동안 같은 서점에 같은 책을 물으러 갔다. 넷째 달, 주인이 책 대신 접힌 종이를 내밀었다. 종이에 적힌 골목 끝 방에서 한 사람이 기다리고 있었다.'
      : s.how === 'legacy'
        ? `상갓집 손님 가운데 끝까지 남은 사람이 있었다. "선대께서 ${J(s.legacy ?? '저희', '과/와')} 오래 일하셨지요. 남은 장부가 있습니다. 그걸 이어 받으실 분을 찾고 있었습니다."`
        : '단골 주막에서 늘 구석 자리에 앉던 사람이 오늘은 내 맞은편에 앉았다. 내 이름도, 내가 지난달 누구와 무슨 말을 했는지도 알고 있었다.';
    return `${lead} 그쪽은 스스로를 '${o.alias}'라고만 불렀다. ${o.desc} "일은 어렵지 않습니다. 보고, 듣고, 적으면 됩니다. 가끔은 조금 더."`;
  },
  choices: (g, s) => {
    const v = V(g);
    if (!ready(g) || v.org) return [];
    const c = [
      { key: 0, label: '받아들인다', hint: '조직의 사람이 된다. 품삯과 보호가 오지만, 나오는 문은 좁다' },
      { key: 1, label: '거절한다', hint: '이 자리는 없던 일이 된다' },
    ];
    if (stat(g, 'cha') >= 25 || skill(g, 'trade') >= 15) c.push({ key: 2, label: '값을 올린다', hint: '말솜씨로 조건을 따낸다. 너무 밀면 손을 거둔다' });
    return c;
  },
  resolve(g, rng, s, i) {
    const v = V(g);
    if (!ready(g) || v.org) return '그 사람은 다시 오지 않았다.';
    if (i === 0) {
      const o = join(g, s);
      g.player.money += 6;
      return `손을 맞잡지는 않았다. 그쪽은 은화 여섯 닢이 든 주머니를 탁자에 두고 일어났다. "앞으로 당신을 찾는 사람은 '${o.handler}'라고 할 겁니다. 다른 이름으로 찾아오는 사람은 믿지 마십시오."`;
    }
    if (i === 2) {
      if (check(rng, stat(g, 'cha') * 0.6 + skill(g, 'trade') * 0.4, 30)) {
        const o = join(g, s, 10);
        g.player.money += 15;
        return `"욕심이 있군요. 그것도 쓸모입니다." 주머니가 하나 더 놓였다. 은화 열다섯 닢. 연락책 이름은 '${o.handler}'.`;
      }
      v.offerAt = mi(g);
      return '그쪽은 잠깐 웃더니 찻값을 탁자에 두고 일어났다. "다른 사람을 찾겠습니다." 다음 날부터 그 구석 자리에는 아무도 앉지 않았다.';
    }
    v.offerAt = mi(g);
    if (s.org === 'crown') heat(g, 5);
    return s.org === 'crown'
      ? '"알겠습니다." 그 말이 전부였다. 다만 그 사람이 나간 뒤 수첩에 무언가를 적는 것을 창 너머로 보았다. 거절했다는 것도 적어 두는 곳이다.'
      : '"알겠습니다. 마음이 바뀌면 이 주막 주인에게 날씨 이야기를 하십시오." 그쪽은 술값을 내고 나갔다.';
  },
});
ACTIONS.push({
  id: 'spy_seek', name: '첩보 조직을 찾아간다', icon: 'mask',
  desc: '큰 고장의 뒷골목에서 눈과 귀를 사고파는 사람들을 수소문한다. 머리가 좋아야 엉뚱한 사람에게 묻지 않는다.',
  available: (g) => ready(g) && !V(g).org && !V(g).hunt && inCity(g) && stat(g, 'int') >= 15 && mi(g) - V(g).offerAt >= 6 && !busyElse(g),
  run(g, rng) {
    const v = V(g);
    v.offerAt = mi(g);
    tired(g, 4);
    if (check(rng, stat(g, 'int') * 0.5 + stat(g, 'sen') * 0.3 + skill(g, 'letters') * 0.2, 35)) {
      queueScene(g, 'spy_recruit', { org: pickOrgKey(g, rng), how: 'seek' }, { first: true });
      return '서점, 대서소, 부두의 술집. 같은 질문을 다른 말로 여러 번 했다. 누군가 내 질문을 기억해 두었다는 느낌이 들었다.';
    }
    heat(g, 4);
    return rng.pick([
      '사흘 동안 수소문했지만 돌아온 것은 의심스러운 눈길뿐이었다. 한 술집 주인은 내 얼굴을 오래 보더니 경비대 초소 쪽으로 걸어갔다.',
      '그럴듯한 사람을 만났다고 생각했는데, 그는 은화 두 닢을 받고 아무것도 모르는 척했다. 그게 정말 모르는 것이었는지는 모르겠다.',
    ]);
  },
});

/* ---------- 훈련과 가짜 신분 ---------- */
const DRILLS = [
  { what: '암호', stat: 'int', text: '연락책이 두고 간 시편 한 권으로 숫자를 글자로 바꾸는 법을 익혔다. 같은 쪽의 같은 줄을 몇 번이나 셌다.' },
  { what: '미행', stat: 'sen', text: '장날 사람 틈에서 정해 준 사람의 등을 반나절 따라다녔다. 두 번 놓쳤고, 한 번은 그가 뒤를 돌아보았다.' },
  { what: '자물쇠', stat: 'agi', text: '낡은 궤짝 자물쇠 셋을 철사 두 가닥으로 여는 연습을 했다. 손끝이 까졌다.' },
  { what: '거짓말', stat: 'cha', text: '연락책이 하룻밤 내내 같은 질문을 순서를 바꿔 가며 물었다. 내 대답이 처음과 달라질 때마다 그는 탁자를 두드렸다.' },
  { what: '독과 해독', stat: 'int', text: '쓴 아몬드 냄새, 비소 빛깔, 술에 타면 사라지는 것들. 외우면서 손을 몇 번이나 씻었다.' },
];
ACTIONS.push({
  id: 'spy_train', name: '밀정의 기술을 익힌다', icon: 'scroll',
  desc: '연락책에게서 암호, 미행, 자물쇠, 거짓말을 배운다. 익힐수록 임무가 쉬워지고 맡기는 일도 커진다.',
  available: (g) => ready(g) && !!V(g).org && V(g).org.trained < 100,
  run(g, rng) {
    const o = V(g).org;
    const d = rng.pick(DRILLS);
    o.trained = clamp(o.trained + 6 + rng.int(0, 4) + stat(g, d.stat) / 25, 0, 100);
    gainStat(g, d.stat, 0.3);
    if (d.what === '암호') gainSkill(g, 'letters', 0.3, 'int');
    tired(g, 6);
    return `${d.text} (${d.what}${o.trained >= 60 ? ' · 이제 연락책이 덜 고친다' : ''})`;
  },
});
ACTIONS.push({
  id: 'spy_cover', name: '가짜 신분을 만든다', icon: 'mask',
  desc: '다른 이름과 다른 일로 살아가는 또 하나의 나를 짓는다. 서류와 옷값으로 은화 열 닢. 이미 있으면 그 신분을 다진다.',
  available: (g) => ready(g) && !!V(g).org && (V(g).cover ? V(g).cover.depth < 95 : canSpend(g, 10)),
  run(g, rng) {
    const v = V(g);
    if (!v.cover) {
      spend(g, 10);
      v.cover = { name: rng.pick(COVER_NAMES), trade: rng.pick(COVER_TRADES), y: g.date.year, depth: clamp(25 + skill(g, 'letters') / 3 + stat(g, 'cha') / 4, 0, 70) };
      log(g, `가짜 신분 '${v.cover.name}'(${v.cover.trade})을 지었다.`);
      return `대서소에서 세례 증서와 통행증을 받았다. 이름은 ${v.cover.name}, 하는 일은 ${v.cover.trade}. 그 사람의 고향 마을 이름과 어머니 이름까지 외웠다. 거울 앞에서 그 이름으로 인사하는 연습을 했다.`;
    }
    v.cover.depth = clamp(v.cover.depth + 5 + rng.int(0, 4), 0, 100);
    tired(g, 3);
    return rng.pick([
      `${v.cover.name}의 이름으로 장터에서 작은 거래를 했다. 상인 하나가 "지난번에도 봤지요" 하며 인사했다. 그 사람이 진짜로 있다는 증인이 하나 늘었다.`,
      `${v.cover.trade} 일을 하루 진짜로 해 보았다. 서툴렀다. 서툰 것도 그럴듯했다.`,
    ]);
  },
});

/* ---------- 임무 ---------- */
const TARGETS = {
  letter: ['백작 집사의 서랍', '외국 사절의 숙소', '세관장의 장부 상자', '주교 비서의 서류함'],
  extract: ['감옥에 갇힌 우리 쪽 끄나풀', '도망치고 싶어 하는 탑의 서기', '국경 너머로 가야 하는 늙은 필경사', '인질로 잡힌 상인의 딸'],
  rumor: ['곡물 창고가 비었다는 말', '재상이 외국 돈을 받는다는 말', '대상단이 곧 망한다는 말', '주교가 이단과 내통한다는 말'],
  watch: ['밤마다 성문 밖으로 나가는 서기', '외국 말을 쓰는 포도주 상인', '궁정 마구간지기', '새로 온 신부'],
  burn: ['돈을 받고 이름을 판 동료'],
};
function newJob(g, r) {
  const o = V(g).org;
  const keys = ['letter', 'extract', 'rumor', 'watch'];
  if (o.rank >= 2 && r.chance(0.2)) keys.push('burn', 'burn');
  const m = r.pick(keys);
  return { mission: m, target: r.pick(TARGETS[m]), foe: rivalOf(g, o.realm, r) };
}
function rankUp(g) {
  const o = V(g).org;
  const want = o.missions >= 12 && o.trust >= 70 ? 3 : o.missions >= 6 && o.trust >= 50 ? 2 : o.missions >= 2 && o.trust >= 35 ? 1 : 0;
  if (want > o.rank) { o.rank = want; o.known = clamp(o.known + 15, 0, 100); log(g, `${o.name}에서 ${RANKS[o.rank]}${jo(RANKS[o.rank], '이/가')} 되었다.`); return ` ${o.handler}${jo(o.handler, '이/가')} 처음으로 조직의 다른 얼굴들을 보여 주었다. 이제 내 자리는 '${RANKS[o.rank]}'이다.`; }
  return '';
}
function caught(g, s) {
  const v = V(g);
  v.tally.caught += 1;
  queueScene(g, 'spy_caught', { mission: s.mission }, { first: true });
}
defineScene('spy_job', {
  title: (g, s) => MISSIONS[s.mission]?.name ?? '임무',
  text: (g, s) => {
    const o = V(g).org;
    const h = o?.handler ?? '연락책';
    const t = s.target;
    if (s.mission === 'letter') return `${h}${jo(h, '이/가')} 약도를 내밀었다. "${t}. 열흘 안에 안에 든 것을 베껴 오시오. 베끼고 나면 원래대로 둬야 합니다. 없어진 줄 알면 소용없소."`;
    if (s.mission === 'extract') return `"${t}. ${short(s.foe)} 쪽 사람들이 먼저 닿기 전에 데려와야 하오." ${J(h, '은/는')} 마차 한 대와 다른 사람 이름의 통행증 두 장을 마련해 두었다.`;
    if (s.mission === 'rumor') return `"${t}. 주막 세 곳, 빨래터 하나, 대장간 하나. 내가 했다는 흔적 없이, 석 달 뒤 사람들이 저마다 자기가 처음 들었다고 믿게." ${J(h, '은/는')} 그렇게만 말했다.`;
    if (s.mission === 'watch') return `"${t}. 누구를 만나는지, 무엇을 들고 나가는지, 몇 시에 불을 끄는지. 한 달." 간단해 보이는 일이 제일 오래 걸린다.`;
    return `${J(h, '은/는')} 오래 말이 없었다. "${t}가 있소. 우리 쪽 사람 다섯의 이름이 이미 저쪽에 넘어갔소. 여섯째가 되기 전에 입을 닫게 해야 하오. 방법은 당신이 고르시오." 나는 그 동료의 얼굴을 안다.`;
  },
  choices: (g, s) => {
    const v = V(g);
    if (!ready(g) || !v.org || !MISSIONS[s.mission]) return [];
    if (s.mission === 'burn') return [
      { key: 0, label: '시킨 대로 한다', hint: '입을 영원히 닫게 한다. 조직은 기억하고, 나도 잊지 못한다' },
      { key: 1, label: '몰래 귀띔해 달아나게 한다', hint: '들키면 내가 다음 차례다' },
      { key: 2, label: '못 하겠다고 한다', hint: '믿음을 크게 잃는다' },
    ];
    const c = [
      { key: 0, label: '조심스럽게 한다', hint: '느리지만 흔적이 적다' },
      { key: 1, label: '대담하게 한다', hint: '품삯과 믿음이 크게 오르지만, 그르치면 크게 탄다' },
      { key: 2, label: '일부러 그르친다', hint: '해낸 척하며 망쳐 놓는다. 믿음이 줄어든다' },
      { key: 3, label: '거절한다', hint: '조직이 나를 다시 본다' },
    ];
    return c;
  },
  resolve(g, rng, s, i) {
    const v = V(g), o = v.org;
    if (!ready(g) || !o || !MISSIONS[s.mission]) return '연락책은 다시 오지 않았다. 일이 다른 손으로 넘어간 모양이다.';
    const m = MISSIONS[s.mission];
    const pow = o.trained * 0.5 + stat(g, m.stat) * 0.4 + (v.cover?.depth ?? 0) * 0.15 + o.rank * 3;
    const pay = (k) => { const n = Math.round((m.pay + o.rank * 3) * k + (v.dbl ? m.pay * 0.6 : 0)); g.player.money += n; return n; };
    if (s.mission === 'burn') {
      if (i === 0) {
        o.missions += 1; v.tally.missions += 1;
        trust(g, 15); o.known = clamp(o.known + 20, 0, 100);
        stress(g, 18);
        deed(g, 'kind', -6, '함께 일하던 사람의 입을 막았다는 말이 아주 작게 돈다');
        if (!check(rng, pow, m.diff)) { reportCrime(g, 'murder', here(g), { mult: 0.5 }); heat(g, 20); }
        const n = pay(1);
        log(g, '배신한 동료의 입을 막았다.');
        past(g, '동료를 처리함');
        return `그 일은 강가에서 끝났다. 그는 마지막에 나를 알아보았다. ${o.handler}${jo(o.handler, '은/는')} 은화 ${n}닢과 함께 "잘했소"라고만 했다. 그 뒤로 조직 사람들이 나를 대하는 눈이 달라졌다.${rankUp(g)}`;
      }
      if (i === 1) {
        if (check(rng, stat(g, 'cha') * 0.4 + stat(g, 'agi') * 0.3 + o.trained * 0.3, 45)) { trust(g, -5); stress(g, 6); return '빵 바구니 밑에 쪽지를 넣었다. "오늘 밤." 다음 날 그의 방은 비어 있었다. 나는 한발 늦었다고 보고했다. 연락책은 오래 내 얼굴을 보았다.'; }
        trust(g, -35); o.known = clamp(o.known + 10, 0, 100); stress(g, 15);
        if (o.trust < 0) return burnBridge(g, '귀띔한 쪽지가 조직 손에 들어갔다. 연락책은 쪽지를 내 앞에 펼쳐 놓고 아무 말도 하지 않았다. 그날 밤 내 방 자물쇠에 긁힌 자국이 생겼다.');
        return '쪽지가 조직 손에 들어갔다. 연락책은 쪽지를 내 앞에 펼쳐 놓았다. "이번 한 번이오." 그 말이 위로처럼 들리지 않았다.';
      }
      trust(g, -18); stress(g, 4);
      if (o.trust < 0) return burnBridge(g, '"그렇군요." 연락책은 장갑을 꼈다. "당신이 여섯째가 아니길 바라오." 그 뒤로 그는 오지 않았다. 대신 다른 사람들이 나를 보기 시작했다.');
      return '"그렇군요. 다른 손을 쓰겠소." 일주일 뒤 그 동료가 강에서 건져졌다는 말을 들었다. 내가 거절해서 달라진 것은 없었다.';
    }
    if (i === 3) {
      trust(g, -12);
      if (o.trust < 0) return burnBridge(g, `${o.handler}${jo(o.handler, '은/는')} 고개를 끄덕이고 나갔다. 다음 날 내 집 문틈에 빈 봉투가 끼워져 있었다. 조직이 쓰는 말로는 "끝"이라는 뜻이다.`);
      return `${o.handler}${jo(o.handler, '은/는')} 고개를 끄덕였다. "알겠소." 조직은 거절도 장부에 적는다.`;
    }
    if (i === 2) {
      trust(g, -8);
      if (v.dbl) v.dbl.trust = clamp(v.dbl.trust + 8, 0, 100);
      return rng.pick([
        '편지를 베끼면서 숫자 몇 개를 바꿨다. 연락책은 받아 들고 고맙다고 했다. 언젠가 그 숫자가 틀렸다는 걸 누가 알아챌 것이다.',
        '일부러 한 발 늦게 갔다. 그 사이 일은 흐지부지되었다. "운이 없었소." 연락책의 말투가 평소보다 반 박자 느렸다.',
      ]);
    }
    const bold = i === 1;
    const ok = check(rng, pow, m.diff + (bold ? 10 : 0));
    if (ok) {
      o.missions += 1; v.tally.missions += 1;
      trust(g, bold ? 10 : 6);
      o.known = clamp(o.known + 3, 0, 100);
      heat(g, bold ? 6 : 2);
      const n = pay(bold ? 1.8 : 1);
      if (s.mission === 'rumor') { const P = politicsState(g); if (P.stab?.[s.foe] != null) P.stab[s.foe] = clamp(P.stab[s.foe] - 1, 0, 100); }
      gainStat(g, m.stat, 0.2);
      const what = s.mission === 'letter' ? `${s.target}에서 꺼낸 편지를 밤새 베끼고 새벽 전에 제자리에 돌려놓았다.`
        : s.mission === 'extract' ? `${s.target}${jo(s.target, '을/를')} 짐수레 밑에 태워 국경 초소 둘을 지났다. 초소병은 통행증의 다른 이름을 소리 내어 읽었다.`
          : s.mission === 'rumor' ? `한 달 뒤 빨래터에서 ${s.target}${jo(s.target, '을/를')} 내게 들려주는 사람이 있었다. 처음 듣는 척했다.`
            : `${s.target}${jo(s.target, '은/는')} 화요일마다 같은 집 뒷문으로 들어갔다. 누구 집인지 적어 넘겼다.`;
      return `${what} 은화 ${n}닢.${bold ? ' 연락책이 드물게 웃었다.' : ''}${rankUp(g)}`;
    }
    v.tally.failed += 1;
    trust(g, -4);
    heat(g, bold ? 20 : 12);
    stress(g, 6);
    if (rng.chance(bold ? 0.35 : 0.2)) { caught(g, s); return '발소리가 났다. 등불이 내 쪽으로 돌았다. 도망칠 틈이 없었다.'; }
    return rng.pick([
      '서랍은 열었지만 그 안에 있어야 할 것이 없었다. 누군가 먼저 다녀갔거나, 처음부터 미끼였다.',
      '거의 다 됐다고 생각한 순간 일이 엎어졌다. 얼굴은 보이지 않았을 것이다. 아마도.',
    ]);
  },
});
ACTIONS.push({
  id: 'spy_task', name: '연락책에게 일을 받는다', icon: 'scroll',
  desc: '정해진 돌 밑에 표시를 남겨 연락책을 부른다. 편지 훔치기, 사람 빼내기, 소문 심기 같은 일이 온다.',
  available: (g) => ready(g) && !!V(g).org && V(g).org.trained >= 10 && mi(g) - V(g).taskAt >= 2 && !sceneQueued(g, 'spy_job'),
  run(g, rng) {
    const v = V(g);
    v.taskAt = mi(g);
    queueScene(g, 'spy_job', newJob(g, rng), { first: true });
    return `성당 뒤 셋째 기둥 밑돌에 분필로 짧은 줄을 그었다. 이틀 뒤 ${v.org.handler}${jo(v.org.handler, '이/가')} 빵집 줄 뒤에 섰다.`;
  },
});

/* ---------- 붙잡힘과 드러남 ---------- */
function burnBridge(g, text) {
  const v = V(g), o = v.org;
  if (!o) return text;
  v.hunt = { name: o.name, key: o.key, realm: o.realm, house: o.house, y: g.date.year, level: clamp(o.known + 20, 20, 100) };
  log(g, `${o.name}${jo(o.name, '이/가')} 나를 내쳤다. 아는 것이 많은 사람을 그냥 두지 않는 곳이다.`);
  past(g, `${o.name}에서 내쳐짐`);
  v.org = null; v.dbl = null;
  return text;
}
defineScene('spy_caught', {
  title: () => '붙잡히다',
  text: (g, s) => `${MISSIONS[s.mission]?.name ?? '일'} 도중에 붙잡혔다. 지하실 의자에 묶였다. 맞은편 사내가 소매를 걷으며 말했다. "누가 시켰는지만 말하면 오늘 밤 집에 갈 수 있소."`,
  choices: (g, s) => {
    const v = V(g);
    if (!base(g) || g.bondage?.slave) return [];
    const c = [
      { key: 0, label: '입을 다문다', hint: '버티면 감옥에 가지만 조직은 기억한다' },
      { key: 1, label: '조직 이름을 댄다', hint: '풀려나지만 조직이 나를 배신자로 본다' },
      { key: 2, label: '틈을 보아 달아난다', hint: '날래야 한다. 현상금이 붙는다' },
    ];
    if (g.player.money >= 30) c.push({ key: 3, label: '돈으로 산다', hint: '은화 서른 닢. 받을 사람이면 좋겠다' });
    if (!v.org) c.splice(1, 1);
    return c;
  },
  resolve(g, rng, s, i) {
    const v = V(g), o = v.org;
    if (!base(g)) return '그 지하실의 일은 기록에 남지 않았다.';
    const pick = i;
    v.cover && (v.cover.depth = clamp(v.cover.depth - 20, 0, 100));
    if (pick === 0) {
      if (check(rng, stat(g, 'wil') * 0.7 + (o?.trained ?? 0) * 0.3, 40)) {
        trust(g, 15); if (o) o.known = clamp(o.known + 5, 0, 100);
        jail(g, 6 + rng.int(0, 6));
        v.heat = clamp(v.heat - 25, 0, 100);
        log(g, '붙잡혔지만 끝까지 입을 다물었다.');
        return '사흘 밤 동안 같은 질문이 돌아왔다. 나는 같은 대답을 했다. 아무것도 모른다고. 그들은 결국 "부랑자 소란"이라는 죄목으로 나를 감옥에 넣었다. 감옥 첫날 밤, 빵 속에 접힌 종이가 들어 있었다. "기다리시오."';
      }
      if (o) { o.known = clamp(o.known + 10, 0, 100); trust(g, -20); }
      reportCrime(g, 'espionage', here(g), { mult: 0.6 });
      jail(g, 10 + rng.int(0, 8));
      stress(g, 15);
      return '나흘째 되는 밤 나는 이름 하나를 말했다. 진짜 이름인지 나도 모르겠다. 그들은 만족하지 않았다. 재판관 앞에서 첩자 노릇이라는 죄목이 읽혔다.';
    }
    if (pick === 1) {
      v.tally.exposed += 1;
      deed(g, 'loyal', -10, '붙잡혀서 제 편 이름을 불었다는 말이 돈다');
      v.heat = clamp(v.heat - 30, 0, 100);
      return burnBridge(g, `나는 ${J(o.name, '과/와')} ${o.handler}의 이름을 댔다. 그들은 정말로 나를 풀어 주었다. 새벽 거리에 혼자 서 있는데, 이제 어느 쪽에서도 나를 지켜 주지 않는다는 게 실감났다.`);
    }
    if (pick === 2) {
      if (check(rng, stat(g, 'agi') * 0.6 + stat(g, 'str') * 0.2 + (o?.trained ?? 0) * 0.2, 48)) {
        reportCrime(g, 'espionage', here(g));
        v.cover = null; heat(g, 15);
        log(g, '붙잡혔다가 달아났다. 가짜 신분은 버렸다.');
        return '묶인 끈이 의자 다리에 쓸려 풀렸다. 등불을 걷어차고 계단을 올랐다. 그 밤으로 가짜 신분은 끝났다. 다음 날 장터 기둥에 내 얼굴과 비슷한 그림이 붙었다.';
      }
      reportCrime(g, 'espionage', here(g), { mult: 1.3 });
      jail(g, 14 + rng.int(0, 10));
      stress(g, 20);
      return '세 걸음 만에 다시 붙잡혔다. 그 뒤로는 아무도 친절하게 묻지 않았다.';
    }
    spend(g, 30);
    if (rng.chance(0.65)) { heat(g, 5); return '사내는 은화를 세어 보더니 문을 열어 두고 담배를 피우러 나갔다. 나는 그 반대쪽으로 걸었다.'; }
    reportCrime(g, 'espionage', here(g), { mult: 0.8 });
    jail(g, 8 + rng.int(0, 6));
    return '사내는 은화를 받았다. 그리고 그 은화를 증거 상자에 넣었다. 매수 시도까지 죄목에 붙었다.';
  },
});
defineScene('spy_exposed', {
  title: () => '알아보는 눈',
  text: (g, s) => {
    const v = V(g);
    const nm = v.cover?.name;
    return s.who === 'old'
      ? `장터에서 누가 내 팔을 잡았다. 고향에서 같이 자란 얼굴이었다. "너 맞지? 그런데 왜 사람들이 너를 ${nm ?? '다른 이름'}${jo(nm ?? '다른 이름', '으로/로')} 부르지?" 등 뒤에서 누군가 그 말을 듣고 있었다.`
      : `숙소로 돌아오니 탁자 위 물건들이 손가락 하나만큼씩 옮겨져 있었다. 누군가 내 짐을 뒤졌다. 창밖 골목에는 사흘째 같은 사내가 서 있다.`;
  },
  choices: (g, s) => {
    const v = V(g);
    if (!ready(g) || (!v.org && !v.dbl)) return [];
    const c = [
      { key: 0, label: '짐을 싸서 다른 고장으로 간다', hint: '의심을 떨치지만 가짜 신분과 이 고장 살림을 버린다' },
      { key: 1, label: '태연하게 부인한다', hint: '말솜씨와 가짜 신분의 두께가 버팀목이다' },
      { key: 2, label: '연락책에게 빼내 달라고 한다', hint: '조직이 나를 거둔다. 대신 빚이 생긴다' },
    ];
    if (!v.org) c.pop();
    return c;
  },
  resolve(g, rng, s, i) {
    const v = V(g);
    if (!ready(g) || (!v.org && !v.dbl)) return '그 일은 흐지부지 지나갔다.';
    v.tally.exposed += 1;
    if (i === 0) {
      const to = CITY.filter((p) => p !== here(g) && PLACES[p] && realmOf(p) === realmOf(here(g)))[0] ?? CITY.find((p) => p !== here(g) && PLACES[p]) ?? 'leocast';
      L(g).place = to; L(g).travel = null; realmState(g).cur = realmOf(to); realmState(g).last = to;
      if (!['street', 'barracks'].includes(L(g).home)) L(g).home = 'inn';
      v.cover = null; v.heat = clamp(v.heat - 35, 0, 100); stress(g, 8);
      log(g, `정체가 드러날 뻔해 ${placeName(to)}${jo(placeName(to), '으로/로')} 옮겼다.`);
      return `그날 밤 짐을 꾸렸다. 가짜 신분의 서류는 난로에 넣었다. ${placeName(to)}에 닿았을 때 나는 아무도 아니었다. 그게 가장 안전했다.`;
    }
    if (i === 1) {
      if (check(rng, stat(g, 'cha') * 0.5 + (v.cover?.depth ?? 0) * 0.4 + (v.org?.trained ?? 0) * 0.2, 45)) { v.heat = clamp(v.heat - 20, 0, 100); if (v.cover) v.cover.depth = clamp(v.cover.depth + 5, 0, 100); return '웃으며 사람을 잘못 봤다고 했다. 고향 이야기를 되묻자 그쪽이 먼저 머뭇거렸다. 골목의 사내는 다음 날 보이지 않았다.'; }
      heat(g, 15); if (v.cover) v.cover.depth = clamp(v.cover.depth - 15, 0, 100); stress(g, 8);
      if (rng.chance(0.4)) { caught(g, { mission: 'watch' }); return '내 대답이 너무 매끄러웠다. 그게 탈이었다. 그날 밤 문이 두드려졌다.'; }
      return '부인했지만 상대 눈빛이 바뀌지 않았다. 이제 그쪽은 확신하고 있다. 아직 손을 쓰지 않았을 뿐이다.';
    }
    const o = v.org;
    trust(g, -6); o.known = clamp(o.known + 5, 0, 100);
    v.heat = clamp(v.heat - 45, 0, 100); v.cover = null;
    g.player.money = Math.max(0, g.player.money - 5);
    return `${o.handler}${jo(o.handler, '은/는')} 이틀 만에 마차를 보냈다. 나는 다른 옷과 다른 이름으로 성문을 나갔다. "이 빚은 장부에 적어 두겠소." 그가 말했다. 조직의 장부에서 지워지는 줄은 본 적이 없다.`;
  },
});

/* ---------- 이중간첩 ---------- */
defineScene('spy_turn', {
  title: () => '다른 쪽의 손',
  text: (g, s) => `${short(s.realm)} 억양이 섞인 사람이 내 앞에 앉았다. "${V(g).org?.name ?? '당신 조직'}에서 받는 것의 두 배를 드리지요. 하던 일은 그대로 하시오. 다만 보고서를 한 부 더 쓰는 겁니다." 그는 내 연락책의 이름까지 알고 있었다.`,
  choices: (g) => {
    const v = V(g);
    if (!ready(g) || !v.org || v.dbl) return [];
    return [
      { key: 0, label: '양쪽에 다 판다', hint: '품삯이 늘지만 의심이 빨리 쌓이고, 언젠가 한쪽을 골라야 한다' },
      { key: 1, label: '거절한다', hint: '그쪽은 내가 거절했다는 걸 기억한다' },
      { key: 2, label: '조직에 알린다', hint: '믿음이 오르고, 저쪽 사람은 덫에 걸린다' },
    ];
  },
  resolve(g, rng, s, i) {
    const v = V(g);
    if (!ready(g) || !v.org || v.dbl) return '그 사람은 다시 나타나지 않았다.';
    if (i === 0) {
      v.dbl = { realm: s.realm, name: `${short(s.realm)}의 밀정`, trust: 30, y: g.date.year };
      v.tally.turned += 1;
      g.player.money += 12;
      log(g, `${v.dbl.name}에게도 보고서를 쓰기 시작했다. 이중간첩이 되었다.`);
      past(g, '이중간첩이 됨');
      return '선금 은화 열두 닢. 그날 밤부터 보고서를 두 부씩 썼다. 같은 일을 두 가지로 쓰는 법을 배웠다. 어느 쪽이 진짜인지는 나만 안다. 그래야 한다.';
    }
    if (i === 1) { heat(g, 5); return '"아쉽군요." 그는 찻잔을 비우고 일어났다. 거절한 사람을 그쪽은 어떻게 다룰까. 그 생각이 오래 남았다.'; }
    trust(g, 12); heat(g, 6);
    return `${v.org.handler}에게 알렸다. 다음 만남 자리에 그 사람 대신 경비대가 갔다. 연락책은 고맙다고 했지만, 왜 저쪽이 하필 나를 골랐는지도 묻고 싶은 눈치였다.`;
  },
});
defineScene('spy_double', {
  title: () => '두 개의 장부',
  text: (g, s) => {
    const v = V(g);
    if (s.ev === 'test') return `${v.org?.handler ?? '연락책'}${jo(v.org?.handler ?? '연락책', '이/가')} 평소와 달리 봉인된 서류 한 장을 직접 건넸다. "읽어도 되오." 군대 이동 날짜가 적혀 있다. ${v.dbl?.name ?? '저쪽'}${jo(v.dbl?.name ?? '저쪽', '이/가')} 무척 좋아할 내용이다. 너무 좋아할 내용이다.`;
    return `${v.dbl?.name ?? '저쪽'}의 사람이 말했다. "이제 그만 고르시오. ${v.org?.name ?? '그쪽'}의 명단을 넘기면 평생 먹고살게 해 주겠소. 아니면 우리와의 일도 여기까지요." 같은 주에 ${v.org?.handler ?? '연락책'}도 내게 충성 맹세를 다시 하라고 했다.`;
  },
  choices: (g, s) => {
    const v = V(g);
    if (!ready(g) || !v.org || !v.dbl) return [];
    if (s.ev === 'test') return [
      { key: 0, label: '저쪽에 넘긴다', hint: '저쪽의 믿음이 오른다. 미끼라면 끝장이다' },
      { key: 1, label: '쥐고 있는다', hint: '저쪽이 나를 의심한다' },
    ];
    return [
      { key: 0, label: '원래 조직을 고른다', hint: '저쪽과 끊는다. 저쪽이 원한을 품을 수 있다' },
      { key: 1, label: '명단을 넘기고 저쪽으로 간다', hint: '원래 조직을 배신한다. 그들은 끝까지 쫓아온다' },
      { key: 2, label: '둘 다 속인다', hint: '조금 더 버틴다. 의심이 크게 쌓인다' },
    ];
  },
  resolve(g, rng, s, i) {
    const v = V(g), o = v.org, d = v.dbl;
    if (!ready(g) || !o || !d) return '그 일은 흐지부지 끝났다.';
    if (s.ev === 'test') {
      if (i === 0) {
        if (s.bait) {
          v.tally.exposed += 1;
          return burnBridge(g, `한 달 뒤 군대는 서류와 다른 길로 움직였다. ${o.handler}${jo(o.handler, '은/는')} 그 서류를 나 말고 아무에게도 보여 주지 않았다. 그날 저녁 내 방 문틈에 빈 봉투가 끼워져 있었다.`);
        }
        d.trust = clamp(d.trust + 15, 0, 100); g.player.money += 10;
        return `${J(d.name, '은/는')} 서류를 받고 은화 열 닢을 더 주었다. 미끼가 아니었다. 이번에는.`;
      }
      d.trust = clamp(d.trust - 12, 0, 100); trust(g, s.bait ? 10 : 0);
      if (d.trust <= 0) { v.dbl = null; heat(g, 10); log(g, `${d.name}${jo(d.name, '이/가')} 연락을 끊었다.`); return '서류를 넘기지 않았다. 저쪽은 그 뒤로 연락을 끊었다. 끊긴 연락이 꼭 끝을 뜻하지는 않는다.'; }
      return '서류를 서랍 깊이 넣어 두었다. 저쪽 사람이 왜 요즘은 쓸 만한 게 없느냐고 물었다.';
    }
    if (i === 0) {
      v.dbl = null; trust(g, 8); heat(g, -10);
      log(g, `${J(d.name, '과/와')}의 일을 끊었다.`);
      return `${J(d.name, '과/와')}의 연락 장소에 마지막으로 빈 종이를 두었다. ${o.handler} 앞에서 맹세를 다시 했다. 맹세하는 동안 그가 내 눈을 보지 않고 손을 보았다.`;
    }
    if (i === 1) {
      const oldName = o.name;
      v.hunt = { name: o.name, key: o.key, realm: o.realm, house: o.house, y: g.date.year, level: clamp(o.known + 40, 40, 100) };
      v.org = { key: 'foreign', name: d.name, realm: d.realm, house: null, y: g.date.year, rank: 1, trust: 40 + d.trust / 4, trained: o.trained, known: 20, handler: ownRng(g, 9).pick(HANDLERS), missions: 0 };
      v.dbl = null;
      g.player.money += 40;
      deed(g, 'loyal', -12, '제 편을 팔고 남의 나라로 넘어갔다는 말이 돈다');
      chron(g, `${g.player.name}, ${oldName}의 명단을 들고 ${short(d.realm)} 쪽으로 넘어가다.`, 60);
      log(g, `${oldName}의 명단을 넘기고 ${d.name}${jo(d.name, '이/가')} 되었다.`);
      past(g, `${oldName}을 배신함`);
      return `명단은 얇았다. 이름 스물셋. 그중 넷은 내가 얼굴을 안다. 은화 마흔 닢을 받았다. 그 주에 ${oldName}의 연락 장소 셋이 털렸다는 소문이 돌았다. 이제 그들은 누가 팔았는지 안다.`;
    }
    heat(g, 18); stress(g, 10);
    return '양쪽에 다 고개를 숙였다. 양쪽 다 믿는 척했다. 밤에 같은 꿈을 꾸기 시작했다. 두 사람이 같은 문을 동시에 두드리는 꿈.';
  },
});

/* ---------- 떠나기와 쫓는 손 ---------- */
ACTIONS.push({
  id: 'spy_quit', name: '조직을 떠나겠다고 말한다', icon: 'road',
  desc: '연락책에게 이제 그만두겠다고 한다. 아는 것이 많을수록 그들은 쉽게 놓아주지 않는다.',
  available: (g) => ready(g) && !!V(g).org && !sceneQueued(g, 'spy_leave'),
  run(g) {
    queueScene(g, 'spy_leave', {}, { first: true });
    return `돌 밑에 짧은 쪽지를 두었다. "만납시다." ${V(g).org.handler}${jo(V(g).org.handler, '은/는')} 늘 오던 날보다 하루 일찍 왔다.`;
  },
});
defineScene('spy_leave', {
  title: () => '나가는 문',
  text: (g) => {
    const o = V(g).org;
    if (!o) return '할 말이 남지 않았다.';
    return o.known < 25
      ? `${o.handler}${jo(o.handler, '은/는')} 의외로 순순했다. "당신이 아는 건 많지 않소. 다만 오늘 일은 잊으시오. 우리는 잊지 않을 테니."`
      : `${o.handler}${jo(o.handler, '은/는')} 찻잔을 돌리며 오래 말이 없었다. "당신은 이름 ${3 + Math.round(o.known / 6)}개와 연락 장소 몇 곳을 알고 있소. 나는 그 이름들의 목숨을 맡고 있고. 나가는 문은 있소. 다만 그 문 밖에서 우리가 당신을 계속 지켜봐야 할 뿐이오."`;
  },
  choices: (g) => {
    const v = V(g), o = v.org;
    if (!ready(g) || !o) return [];
    if (o.known < 25) return [{ key: 0, label: '고개를 숙이고 나온다', hint: '조직과의 일이 끝난다' }, { key: 1, label: '남기로 한다', hint: '없던 일로 한다' }];
    const c = [
      { key: 0, label: '남기로 한다', hint: '없던 일로 한다' },
      { key: 1, label: '그래도 떠난다', hint: '쫓는 손이 붙는다' },
    ];
    if (v.cover) c.push({ key: 2, label: '죽은 척하고 사라진다', hint: '가짜 신분째 죽음을 꾸민다. 그르치면 더 깊이 쫓긴다' });
    if (skill(g, 'letters') >= 25 && o.missions >= 3) c.push({ key: 3, label: '봉인한 문서로 흥정한다', hint: '내가 사라지면 조직의 비밀이 퍼지게 해 둔다' });
    return c;
  },
  resolve(g, rng, s, i) {
    const v = V(g), o = v.org;
    if (!ready(g) || !o) return '나가는 문 이야기는 흐지부지되었다.';
    const free = (text) => { v.tally.quit += 1; v.legacy = o.name; log(g, `${o.name}을 떠났다.`); past(g, `${o.name}을 떠남`); v.org = null; v.dbl = null; return text; };
    if (o.known < 25) {
      if (i === 0) return free('그는 장갑을 끼고 일어났다. 문 앞에서 돌아보더니 말했다. "운이 좋은 겁니다." 무슨 뜻인지는 묻지 않았다.');
      return '"그럼 다음 달에 봅시다." 아무 일도 없었던 듯 그는 다음 일을 설명하기 시작했다.';
    }
    if (i === 0) { stress(g, 6); trust(g, -3); return '"잘 생각했소." 그 말이 칭찬인지 경고인지 몰랐다. 조직은 떠나려 했던 사람도 장부에 적는다.'; }
    const pick = [null, 'go', 'die', 'paper'][i] ?? 'go';
    if (pick === 'die') {
      if (check(rng, (v.cover?.depth ?? 0) * 0.5 + o.trained * 0.3 + stat(g, 'int') * 0.3, 50)) {
        const nm = v.cover.name;
        v.cover = null; v.heat = 0;
        stress(g, 10);
        return free(`강가에 ${nm}의 외투와 신발을 남겼다. 사흘 뒤 하류에서 누군가의 시신이 올라왔다는 말이 돌았다. 그게 누구였는지는 나도 모른다. ${nm}${jo(nm, '은/는')} 그날 죽었고, 나는 원래 이름으로 돌아왔다.`);
      }
      v.cover = null;
      burnBridge(g, '');
      if (v.hunt) v.hunt.level = clamp(v.hunt.level + 20, 0, 100);
      v.tally.quit += 1;
      return '강가에 외투를 남겼지만, 한 달 뒤 내 원래 이름으로 쓴 편지가 조직 손에 들어갔다. 죽은 줄 알았던 사람이 살아 있으면, 조직은 그 사람을 두 번 죽이려 한다.';
    }
    if (pick === 'paper') {
      if (rng.chance(0.75)) {
        const r = free(`세 군데에 봉인한 문서를 맡겼다. 내가 한 해 동안 소식이 없으면 열어 보라는 말과 함께. ${o.handler}${jo(o.handler, '은/는')} 문서 이야기를 듣고 처음으로 웃었다. "배운 대로 했군요." 그는 내 이름을 장부에서 지우지는 않았다. 줄을 하나 그었을 뿐이다.`);
        v.hunt = { name: o.name, key: o.key, realm: o.realm, house: o.house, y: g.date.year, level: 8 };
        return r;
      }
      v.tally.quit += 1;
      burnBridge(g, '');
      return '세 군데에 맡긴 문서 가운데 두 개가 한 달 만에 사라졌다. 맡긴 사람들은 아무것도 모른다고 했다. 셋째 것도 오래가지 않을 것이다.';
    }
    v.tally.quit += 1;
    return burnBridge(g, `"그렇다면." 그는 일어나 장갑을 꼈다. "몸조심하시오. 진심이오." 그날 밤부터 나는 창가에 앉지 않게 되었다.`);
  },
});
defineScene('spy_hunter', {
  title: () => '쫓는 손',
  text: (g, s) => {
    const h = V(g).hunt;
    const nm = h?.name ?? '옛 조직';
    if (s.ev === 'shadow') return `장날마다 같은 얼굴이 보인다. 국밥집에서, 우물가에서, 성당 뒤에서. 말을 걸지도 다가오지도 않는다. ${nm}${jo(nm, '은/는')} 내가 그걸 알아채기를 바라는 것 같다.`;
    if (s.ev === 'offer') return `${nm}의 사람이 찾아왔다. "마지막으로 한 가지만 해 주시면 장부에서 당신 이름을 지우겠소. 정말로." 그가 내민 것은 한 사람의 이름과 그 사람이 머무는 여관이었다.`;
    return '밤길 모퉁이에서 발소리가 둘로 늘었다. 돌아보니 망토 속에서 칼날이 빛났다. 말은 없었다. 이런 일에 말은 필요 없다.';
  },
  choices: (g, s) => {
    const v = V(g);
    if (!ready(g) || !v.hunt) return [];
    if (s.ev === 'shadow') return [{ key: 0, label: '모른 척 산다', hint: '마음이 무겁다' }, { key: 1, label: '그 사람을 따라가 본다', hint: '날래면 누구 손인지 알 수 있다' }];
    if (s.ev === 'offer') return [{ key: 0, label: '마지막 일을 한다', hint: '해내면 쫓기는 일이 끝난다. 손에 피가 묻는다' }, { key: 1, label: '거절한다', hint: '쫓는 손이 그대로 남는다' }];
    return [
      { key: 0, label: '맞서 싸운다', hint: '힘과 칼솜씨가 버팀목이다. 지면 죽는다' },
      { key: 1, label: '달아나 다른 고장으로 간다', hint: '살림을 버리고 몸을 피한다' },
      { key: 2, label: '돌아가겠다고 한다', hint: '조직으로 돌아간다. 맨 밑바닥부터 다시' },
    ];
  },
  resolve(g, rng, s, i) {
    const v = V(g), h = v.hunt;
    if (!ready(g) || !h) return '그 밤은 조용히 지나갔다.';
    v.tally.hunters += 1;
    if (s.ev === 'shadow') {
      if (i === 0) { stress(g, 6); return '못 본 척했다. 그 사람도 못 본 척했다. 그렇게 한 계절이 지났다.'; }
      if (check(rng, stat(g, 'sen') * 0.5 + stat(g, 'agi') * 0.4, 45)) { h.level = clamp(h.level - 10, 0, 100); return `그 사람은 성문 밖 여관에서 ${h.name}의 표식이 찍힌 봉투를 받았다. 누구 손인지 알게 되자 오히려 잠이 왔다. 그들도 내가 안다는 걸 알았을 것이다.`; }
      h.level = clamp(h.level + 8, 0, 100); stress(g, 8); return '골목 셋을 따라갔다가 놓쳤다. 집에 돌아오니 베개 위에 내 머리카락 한 올이 놓여 있었다.';
    }
    if (s.ev === 'offer') {
      if (i === 1) { h.level = clamp(h.level + 5, 0, 100); return '"아쉽군요." 그 사람은 그 이름을 다시 접어 품에 넣었다. 그 일은 다른 누군가가 하게 될 것이다.'; }
      stress(g, 15);
      deed(g, 'kind', -5, '조용한 손을 쓴다는 말이 아주 작게 돈다');
      if (check(rng, stat(g, 'agi') * 0.5 + stat(g, 'int') * 0.3 + skill(g, 'sword') * 0.2, 45)) { v.hunt = null; log(g, `${h.name}의 마지막 일을 하고 풀려났다.`); past(g, `${h.name}에게서 풀려남`); return '그 여관의 이층 방은 다음 날 비어 있었다. 약속대로 쫓는 손은 그 뒤로 보이지 않았다. 내 꿈에는 가끔 보인다.'; }
      reportCrime(g, 'murder', here(g), { mult: 0.6 });
      h.level = clamp(h.level - 10, 0, 100);
      return '일은 엉망으로 끝났다. 그 사람은 살았고 경비대는 나를 찾는다. 조직은 그래도 절반은 해낸 셈 쳐 주었다.';
    }
    if (i === 0) {
      const ok = check(rng, stat(g, 'str') * 0.3 + stat(g, 'agi') * 0.3 + skill(g, 'sword') * 0.4, 45);
      if (ok) { h.level = clamp(h.level - 25, 0, 100); stress(g, 10); g.player.fatigue = Math.min(100, g.player.fatigue + 15); log(g, `${h.name}${jo(h.name, '이/가')} 보낸 칼잡이를 물리쳤다.`); return '칼날이 소매를 갈랐다. 그 손목을 붙잡아 돌벽에 내리쳤다. 상대는 칼을 떨어뜨리고 어둠 속으로 사라졌다. 다음 칼잡이가 오기까지는 시간이 좀 걸릴 것이다.'; }
      if (rng.chance(0.4)) { L(g).pendingDeath = `${h.name}${jo(h.name, '이/가')} 보낸 칼잡이에게 밤길에서 죽었다`; return '첫 칼은 피했다. 둘째 칼은 보지 못했다. 돌바닥이 차가웠다.'; }
      g.player.fatigue = Math.min(100, g.player.fatigue + 30); stress(g, 15);
      return '옆구리를 베였지만 살았다. 지나가던 야경꾼의 등불이 나를 살렸다. 상처가 아물 때까지 문을 두 번씩 잠갔다.';
    }
    if (i === 1) {
      const to = CITY.filter((p) => p !== here(g) && PLACES[p] && realmOf(p) !== h.realm)[0] ?? CITY.find((p) => p !== here(g) && PLACES[p]) ?? 'barka';
      L(g).place = to; L(g).travel = null; realmState(g).cur = realmOf(to); realmState(g).last = to;
      if (!['street', 'barracks'].includes(L(g).home)) L(g).home = 'inn';
      h.level = clamp(h.level - 15, 0, 100); stress(g, 8);
      log(g, `쫓는 손을 피해 ${placeName(to)}${jo(placeName(to), '으로/로')} 옮겼다.`);
      return `그 길로 짐도 챙기지 않고 성문을 나섰다. ${placeName(to)}에 닿아서야 숨을 돌렸다. 그쪽 장부에도 이 고장 이름이 적혀 있을지 모른다.`;
    }
    v.org = { key: h.key, name: h.name, realm: h.realm, house: h.house, y: g.date.year, rank: 0, trust: 5, trained: 30, known: 40, handler: rng.pick(HANDLERS), missions: 0 };
    v.hunt = null;
    stress(g, 10);
    log(g, `${h.name}${jo(h.name, '으로/로')} 돌아갔다.`);
    return '"그럼 따라오시오." 칼잡이는 칼을 거두었다. 그 밤 나는 다시 조직의 사람이 되었다. 맨 밑바닥부터. 이번에는 아무도 내게 선금을 주지 않았다.';
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g);
  const r = ownRng(g, 5);
  const now = mi(g);
  // 세월
  v.heat = clamp(v.heat - (v.cover ? 1.5 : 1), 0, 100);
  if (v.hunt) {
    v.hunt.level = clamp(v.hunt.level - 0.35, 0, 100);
    const gone = v.hunt.key === 'house' && v.hunt.house && !liveHouses(g).some((h) => h.id === v.hunt.house);
    if (v.hunt.level < 5 || gone) { log(g, gone ? `${v.hunt.name}의 가문이 무너졌다. 쫓던 손도 사라졌다.` : `${v.hunt.name}${jo(v.hunt.name, '이/가')} 더는 나를 찾지 않는 것 같다.`); v.hunt = null; }
  }
  const o = v.org;
  if (o && !orgAlive(g, o)) { log(g, `${o.name}의 주인 가문이 무너졌다. 조직도 흩어졌다.`); past(g, `${o.name}이 흩어짐`); v.legacy = o.name; v.org = null; v.dbl = null; }
  if (v.org && v.org.rank >= 1 && g.date.month % 3 === 0 && !g.bondage?.slave) g.player.money += v.org.rank;
  if (v.dbl) v.dbl.trust = clamp(v.dbl.trust - 0.3, 0, 100);
  if (!ready(g) || now - v.sceneAt < 3) return;
  const fire = (kind, data) => { queueScene(g, kind, data); v.sceneAt = now; };
  // 포섭
  if (!v.org && !v.hunt && now - v.offerAt >= 36 && !busyElse(g) && !sceneQueued(g, 'spy_recruit')) {
    const apt = stat(g, 'int') >= 22 || skill(g, 'letters') >= 20 || !!courtState(g).office || inCity(g);
    const p = (apt ? 0.012 : 0.003) + (v.legacy ? 0.01 : 0);
    if (r.chance(p)) { v.offerAt = now; return fire('spy_recruit', { org: pickOrgKey(g, r), how: v.legacy && r.chance(0.5) ? 'legacy' : 'approach', legacy: v.legacy }); }
  }
  const org = v.org;
  if (org) {
    if (v.heat >= 55 && r.chance((v.heat - 45) / 300) && !sceneQueued(g, 'spy_exposed')) return fire('spy_exposed', { who: v.cover && r.chance(0.5) ? 'old' : 'search' });
    if (v.dbl && r.chance(0.05)) return fire('spy_double', { ev: v.dbl.trust >= 50 && r.chance(0.5) ? 'choose' : 'test', bait: r.chance(0.3 + v.heat / 300) });
    if (!v.dbl && org.rank >= 1 && org.trust >= 25 && org.key !== 'foreign' && r.chance(0.02)) return fire('spy_turn', { realm: rivalOf(g, org.realm, r) });
    if (org.trained >= 10 && now - v.taskAt >= 4 && r.chance(0.08) && !sceneQueued(g, 'spy_job')) { v.taskAt = now; return fire('spy_job', newJob(g, r)); }
    if (org.trust < -10) { burnBridge(g, ''); return; }
  }
  if (v.hunt && r.chance(v.hunt.level / 500 + 0.01)) return fire('spy_hunter', { ev: v.hunt.level >= 50 && r.chance(0.45) ? 'knife' : r.chance(0.3) ? 'offer' : 'shadow' });
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const v = V(g);
  const by = old?.name ?? '선대';
  if (v.org) { log(g, `${by}${jo(by, '이/가')} 몸담았던 ${v.org.name}의 장부에 줄이 하나 그어졌다.`); v.legacy = v.org.name; v.org = null; }
  v.dbl = null; v.cover = null; v.heat = 0;
  if (v.hunt) {
    // 조직은 선대가 들고 간 비밀을 자식이 물려받았다고 믿는다
    if (v.hunt.level >= 50) { v.hunt.level = Math.round(v.hunt.level * 0.4); log(g, `${v.hunt.name}${jo(v.hunt.name, '은/는')} ${by}의 비밀이 자식에게 남았다고 믿는 모양이다.`); }
    else { v.legacy = v.hunt.name; v.hunt = null; }
  }
  v.offerAt = mi(g) - 24;
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
