// 개척과 새 땅. 상태는 g.frontier 하나.
//   변경 너머, 아무 나라도 사람을 들이지 못한 땅이 여섯 군데 있다. 땅은 지도와 고장 목록에 미리 '숨은 고장'으로 두고
//   (PLACES에 hidden), 사람이 들어가 개척촌이 서면 열린다(open). 그래서 저장에는 새 고장 id가 생기지 않는다. 이름만 g.frontier에 산다.
//
//   sites{ id: { stage(0 빈 땅 · 1 개척 천막 · 2 개척촌 · 3 마을 · 4 고을), pop, food(달치 식량), safety(울타리·경비 0~100), morale(0~100),
//               name(붙인 이름 | null), by(누가 일궜나: crown·guild·refugee·tenant·empire·me), byName, since, winters, lost(버려진 횟수),
//               natives(먼저 살던 이들과의 사이 -100~100), clash, raids, mine(내가 연 곳), chief(내가 촌장인가) } }
//   me{ charters, led, founded, named, winters, settlers, treaties, drove, joined, left }
//   charter(내 허가장 { site, at, legal } | null)   party(모으는 개척단 { site, settlers, food, tools, guards } | null)   seq, log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { J, hasBatchim } from '../narrative/text.js';
// '세샘골이라' / '덤불목이라' 처럼 이름 뒤에 '(이)라'를 붙인다
export const ira = (n, tail) => `${n}${hasBatchim(n) ? '이' : ''}${tail}`;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 먼저 살던 이들. 개척민에게 그 땅은 '빈 땅'이지만, 그들에게는 아니다.
export const NATIVES = {
  dwarf: { name: '잿돌 씨족', race: '드워프', word: '나라를 잃고 떠도는 드워프 씨족. 고개 아래 옛 갱도를 조상의 길이라 부른다.', want: '옛 갱도에 손대지 않기', gift: '쇠붙이' },
  beast: { name: '회색 갈기 부족', race: '늑대 수인', word: '철 따라 사냥터를 옮기는 늑대 수인 부족. 황무지의 샘 셋을 대대로 쓴다.', want: '봄 사냥철에 샘을 비워 주기', gift: '소금과 천' },
  elf: { name: '물푸레 숲지기', race: '엘프', word: '은잎 마을에서 떨어져 나와 숲 끝을 지키는 엘프들. 나무 한 그루마다 이름이 있다.', want: '산 나무를 베지 않기', gift: '씨앗과 꿀' },
  fen: { name: '늪사람', race: '사람', word: '옛 왕국이 무너질 때 늪으로 숨어든 사람들의 후손. 말투가 낯설고 세금이라는 말을 모른다.', want: '그들의 물길과 장대 집을 건드리지 않기', gift: '쇠 연장' },
};

// 변경 너머의 땅 여섯. near: 거기서 들어가는 고장(길은 그 고장 하나로만 이어진다), claim: 허가장을 내주는 나라(없으면 아무도 주인이 아니다)
//   monster: 마물이 들끓는 정도   soil: 땅심   native: 먼저 살던 이들   x,y: 대륙 지도 위치
export const SITES = {
  fr_wolf: { land: '늑대 고개', near: 'graubel', months: 2, claim: 'march', grant: 'graubel', monster: 45, soil: 0.7, native: 'dwarf', x: 880, y: 236, kind: '고갯마루', desc: '그라우벨에서 북서쪽, 천룡 산맥 끝자락의 넓은 고갯마루. 바람이 세고 땅은 돌투성이지만, 고개 아래로 옛 갱도 입구가 몇 개 보인다.' },
  fr_moor: { land: '남쪽 황무지', near: 'fur', months: 2, claim: 'leonia', grant: 'leocast', monster: 30, soil: 0.85, native: 'beast', x: 410, y: 655, kind: '황무지', desc: '털가죽 시장에서 동남쪽, 키 작은 덤불과 바위 언덕이 끝없이 이어지는 땅. 샘이 셋 있고, 그 둘레만 풀이 푸르다.' },
  fr_wood: { land: '물푸레 숲 끝', near: 'silverleaf', months: 2, claim: 'leonia', grant: 'leocast', monster: 25, soil: 1.1, native: 'elf', x: 380, y: 405, kind: '숲 가장자리', desc: '은잎 마을에서 남동쪽, 대삼림이 들판으로 풀려 나가는 언저리. 땅이 검고 기름지다. 나무를 베어야 밭이 된다.' },
  fr_fen: { land: '갈대 늪', near: 'klein', months: 2, claim: null, grant: null, monster: 35, soil: 0.9, native: 'fen', x: 395, y: 470, kind: '늪지', desc: '클라인 항에서 서쪽, 바닷물과 강물이 섞이는 넓은 갈대밭. 둑을 쌓으면 논이 되고, 안 쌓으면 늪이다. 어느 나라 지도에도 주인 이름이 없다.' },
  fr_ash: { land: '잿빛 고원', near: 'graubel', months: 3, claim: 'march', grant: 'graubel', monster: 65, soil: 0.6, native: null, x: 1140, y: 255, kind: '고원', desc: '그라우벨 성채 너머, 잊힌 땅으로 이어지는 높은 들. 마신 전쟁 때 무너진 성채의 돌이 아직 굴러다닌다. 변경백은 이 땅을 일구는 사람에게 십 년 세금을 면해 준다고 했다.' },
  fr_grass: { land: '쇠풀 벌판', near: 'eisen', months: 2, claim: 'valhart', grant: 'eisen', monster: 30, soil: 1.0, native: null, x: 995, y: 610, kind: '벌판', desc: '제도에서 남동쪽, 억센 쇠풀이 사람 키만큼 자라는 벌판. 제국은 퇴역병에게 이 땅을 둔전으로 나눠 주려 한다.' },
};
export const SITE_IDS = Object.keys(SITES);
export const isSite = (pl) => !!SITES[pl];

export const STAGES = ['빈 땅', '개척 천막', '개척촌', '마을', '고을'];
// 단계마다 사람 수 상한
export const CAP = [0, 80, 220, 600, 1500];
// 개척단을 꾸리는 쪽
export const FOUNDERS = {
  crown: { name: '왕실 개척단', short: '왕실' },
  guild: { name: '상단이 꾸린 개척단', short: '상단' },
  refugee: { name: '피난민 무리', short: '피난민' },
  tenant: { name: '땅 잃은 소작농들', short: '소작농' },
  empire: { name: '제국 둔전병', short: '둔전병' },
  me: { name: '내 개척단', short: '나' },
};
// 개척민들이 스스로 붙이는 이름 (땅마다 다르게 고른다)
export const NAMES = {
  fr_wolf: ['바람막이골', '잿돌 어귀', '고갯마을', '돌울타리'],
  fr_moor: ['세샘골', '덤불목', '새벽들', '바위언덕'],
  fr_wood: ['물푸레골', '검은흙마을', '숲끝마을', '그루터기'],
  fr_fen: ['갈대둑', '장대마을', '물막이골', '새논'],
  fr_ash: ['잿빛성채', '돌무덤목', '첫불', '망루마을'],
  fr_grass: ['쇠풀둔전', '퇴역병촌', '마른내', '벌판끝'],
};

export const stageName = (s) => STAGES[s?.stage ?? 0];
export const siteName = (id, s) => (s?.stage >= 1 && s.name ? s.name : SITES[id]?.land ?? '변경 너머');
export const moraleWord = (v) => (v >= 70 ? '다들 내일을 믿는다' : v >= 45 ? '버틸 만하다' : v >= 25 ? '떠날 궁리를 하는 집이 있다' : '다들 짐을 꾸린다');
export const foodWord = (v) => (v >= 8 ? '곡간이 넉넉하다' : v >= 4 ? '봄까지는 간다' : v >= 1.5 ? '아껴 먹어야 한다' : '곡간이 바닥났다');
export const safeWord = (v) => (v >= 70 ? '목책과 망루가 단단하다' : v >= 40 ? '울타리는 있다' : v >= 20 ? '울타리가 엉성하다' : '지킬 것이 없다');
export const nativeWord = (v) => (v >= 50 ? '이웃으로 지낸다' : v >= 15 ? '물건을 바꾸러 온다' : v > -15 ? '멀리서 지켜본다' : v > -50 ? '경계한다' : '원수로 여긴다');

export const FS = (g) => (g.frontier ??= fresh());
const freshSite = () => ({ stage: 0, pop: 0, food: 0, safety: 0, morale: 50, name: null, by: null, byName: null, since: 0, winters: 0, lost: 0, natives: 0, clash: 0, raids: 0, mine: false, chief: false });
const freshMe = () => ({ charters: 0, led: 0, founded: 0, named: 0, winters: 0, settlers: 0, treaties: 0, drove: 0, joined: 0, left: 0 });
export function fresh() {
  const sites = {};
  for (const id of SITE_IDS) sites[id] = freshSite();
  return { sites, me: freshMe(), charter: null, party: null, seq: 1, log: [] };
}
export function flog(g, text) {
  const F = FS(g);
  F.log.push({ y: g.date.year, m: g.date.month, text });
  if (F.log.length > 30) F.log.splice(0, F.log.length - 30);
}
export const lived = (g, id) => (g.frontier?.sites?.[id]?.stage ?? 0) >= 1;
export const settled = (g) => SITE_IDS.filter((id) => FS(g).sites[id].stage >= 1);
export const sitesFrom = (pl) => SITE_IDS.filter((id) => SITES[id].near === pl);

/* ---------- 지도와 고장 목록에 올리기 ---------- */
// 땅은 숨은 고장으로 미리 둔다. 사람이 살기 시작하면 열린다(길이 난다). 길은 들어가는 고장 하나로만 이어져 지름길이 되지 않는다.
// 이름은 판마다 다르니 지금 판을 보고 맞춘다(syncNames). 숨은 고장은 다른 갈래의 고장 목록(장터·여관·도는 병…)에 들어가지 않는다.
let current = null;
for (const [id, d] of Object.entries(SITES)) {
  PLACES[id] = {
    name: d.land, kind: d.kind, desc: d.desc,
    inn: 1, rent: 1, house: 60, wage: 0.85,
    links: { [d.near]: d.months },
    realm: d.claim ?? 'wild',
    hidden: true,
    frontier: true,
    open: (g) => lived(g ?? current, id),
  };
  if (PLACES[d.near]) PLACES[d.near].links[id] = d.months;
}
export function syncNames(g) {
  if (!g?.frontier) return;
  current = g;
  for (const id of SITE_IDS) {
    const s = g.frontier.sites[id];
    PLACES[id].name = siteName(id, s);
    PLACES[id].kind = s.stage >= 1 ? STAGES[s.stage] : SITES[id].kind;
  }
}

HOOKS.newGame.push((g) => { g.frontier = fresh(); syncNames(g); });
HOOKS.migrate.push((g) => {
  const F = FS(g), f = fresh();
  for (const k of Object.keys(f)) F[k] ??= f[k];
  for (const id of SITE_IDS) F.sites[id] = Object.assign(freshSite(), F.sites[id] ?? {});
  F.me = Object.assign(freshMe(), F.me ?? {});
  syncNames(g);
});
// 대를 이으면: 내가 연 개척촌과 촌장 자리는 집안의 것으로 남는다. 모으던 개척단은 흩어지고, 허가장은 이름이 바뀌어 다시 받아야 한다.
HOOKS.heir?.push((g) => {
  const F = FS(g);
  if (F.party) flog(g, `${J(SITES[F.party.site]?.land ?? '변경', '으로/로')} 가려던 개척단이 주인을 잃고 흩어졌다.`);
  F.party = null; F.charter = null;
});
