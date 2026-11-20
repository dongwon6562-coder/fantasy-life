// 세상을 바꾸는 큰 공사. 상태는 g.works 하나.
//   성벽, 큰길, 운하, 대성당, 고개길, 땅굴길, 수로, 등대, 돌다리. 공사 아홉은 미리 정해 둔다(저장에 새 id가 생기지 않는다).
//   누가 돈을 대느냐(왕실·영주·교단·변경백·드워프 장로회·제국·자유도시 의회·나)에 따라, 전쟁과 흉년에 돈줄이 마르고 공사가 멈춘다.
//   다 지으면 길이 짧아지고(PLACES.links), 품삯이 오르고(wage), 장터 시세가 바뀌고(trade LOCAL), 성벽은 마물을 막고, 대성당은 신자를 붙든다.
//   바뀐 세상은 syncWorks(g)가 그 판에 맞춰 다시 그린다(새 판·불러오기·완공·매달). 처음 모습은 BASE에 한 번 떠 둔다.
//
//   w{ id: { stage('idle' 아직 · 'building' 짓는 중 · 'stalled' 멈춤 · 'done' 완공), progress(달 일), funds(은화), patron, labor('corvee' 부역 | 'wage' 품삯),
//            since, stalledAt, doneAt, deaths, falls(무너짐), stalls, ruins(버려진 횟수), strike(남은 파업 달), carved(돌에 새긴 이름 | null),
//            myGold, myMonths, overseer(내가 감독인가), skim(빼돌린 돈), offered } }
//   me{ gold, months, overseer(id | null), awayM, drafted, dodged, carved, opened, skimmed }   log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { LOCAL } from '../trade/core.js';
import { J } from '../narrative/text.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 누가 돈을 대나
export const PATRONS = {
  crown: { name: '레오니아 왕실', who: '왕실 재무관' },
  lord: { name: '그 고장 영주', who: '영주의 집사' },
  church: { name: '성광교 교단', who: '대주교청 회계 사제' },
  march: { name: '북부 변경백', who: '변경백의 성채 관리' },
  dwarf: { name: '쇠망치 골 장로회', who: '장로회 서기' },
  empire: { name: '발하르트 황실', who: '제국 공부(工部) 관리' },
  city: { name: '자유도시 의회', who: '의회 회계' },
  guild: { name: '상단 연합', who: '상단 연합 회계' },
  me: { name: '나', who: '나' },
};

// 공사 아홉. need: 일꾼이 다 붙었을 때 걸리는 달 수. cost: 은화. era: 이 시대부터 엄두를 낸다.
//   fx: link[[a,b,달]] 길이 짧아지거나 새로 남 · wage{고장: 더함} · local{고장:{물건: 더함}} · guard 고장(마물이 덜 넘어온다) · faith{place, god}
export const WORKS = {
  w_wall: {
    name: '하르펜 새 성벽', kind: '성벽', place: 'harfen', patron: 'lord', cost: 5200, need: 300, era: 0,
    desc: '낡은 흙담을 헐고 돌로 두 길 높이 성벽과 탑 여섯을 두른다. 남쪽 언덕 회색 굴의 고블린 떼가 넘어오지 못하게.',
    fx: { guard: 'harfen', wage: { harfen: 0.05 } },
    mark: '돌로 쌓은 새 성벽과 탑 여섯이 도시를 두르고 있다.',
    doneText: '하르펜 새 성벽이 다 섰다. 남쪽 탑에 첫 불이 올랐다. 회색 굴 쪽 언덕을 내려다보는 파수꾼이 생겼다.',
  },
  w_road: {
    name: '왕도 큰길', kind: '큰길', place: 'leocast', patron: 'crown', cost: 4200, need: 240, era: 0,
    desc: '왕도에서 하르펜까지 진흙길을 돌로 깔고 개울마다 다리를 놓는다. 비가 와도 수레가 빠지지 않는 길.',
    fx: { link: [['leocast', 'harfen', 1]], wage: { leocast: 0.03, harfen: 0.03 } },
    mark: '하르펜으로 가는 돌 포장 큰길이 성문에서 곧게 뻗어 있다.',
    doneText: '왕도 큰길이 놓였다. 왕도에서 하르펜까지 한 달이면 닿는다. 길가에 여관과 마구간이 하나둘 들어선다.',
  },
  w_bridge: {
    name: '베르덴 큰 돌다리', kind: '다리', place: 'verden', patron: 'lord', cost: 3800, need: 240, era: 0,
    desc: '베르덴 아래 큰 강에 돌다리를 놓는다. 나룻배를 기다리다 한 철을 보내던 길이 곧장 왕도로 이어진다.',
    fx: { link: [['verden', 'leocast', 1]], wage: { verden: 0.04 } },
    mark: '강 위로 아치 일곱 개짜리 돌다리가 놓여 있다.',
    doneText: '베르덴 큰 돌다리가 놓였다. 나루터 뱃사공들은 일감을 잃었고, 베르덴 장터에는 왕도 상인이 몰려든다.',
  },
  w_canal: {
    name: '클라인 운하', kind: '운하', place: 'klein', patron: 'guild', cost: 11000, need: 420, era: 1,
    desc: '클라인 항에서 왕도까지 강을 잇고 갑문을 놓아 배가 다니게 한다. 소금과 생선과 곡식이 물길로 오르내린다.',
    fx: { link: [['klein', 'leocast', 2]], wage: { klein: 0.1 }, local: { leocast: { grain: -0.1, salt: -0.12 }, klein: { grain: 0.05, wool: -0.05 } } },
    mark: '왕도로 오르는 운하 갑문 앞에 짐배가 줄지어 서 있다.',
    doneText: '클라인 운하가 열렸다. 첫 짐배가 소금을 싣고 왕도로 올라갔다. 왕도의 소금값과 밀값이 내려갔다.',
  },
  w_cathedral: {
    name: '왕도 새 대성당', kind: '대성당', place: 'leocast', patron: 'church', cost: 14000, need: 540, era: 0,
    desc: '성광교가 왕도에 새 대성당을 올린다. 첨탑은 성보다 높게. 석공 세 대가 매달려야 끝난다고들 한다.',
    fx: { faith: { place: 'leocast', god: 'solar' }, wage: { leocast: 0.04 } },
    mark: '성보다 높은 새 대성당의 첨탑이 도시 어디서나 보인다.',
    doneText: '왕도 새 대성당이 축성되었다. 첫 미사에 사람이 성당 밖 광장까지 넘쳤다. 첨탑의 종이 하루 일곱 번 운다.',
  },
  w_pass: {
    name: '그라우벨 고개길', kind: '고개길', place: 'graubel', patron: 'march', cost: 5000, need: 300, era: 0,
    desc: '베르덴에서 그라우벨로 넘어가는 고개의 바위를 깎아 수레가 넘을 수 있는 길을 낸다. 산사태와 마물 때문에 일꾼이 많이 죽는 공사.',
    fx: { link: [['verden', 'graubel', 2]], guard: 'graubel' },
    mark: '고개를 깎아 낸 넓은 수레길이 베르덴 쪽으로 이어진다.',
    doneText: '그라우벨 고개길이 뚫렸다. 베르덴에서 두 달이면 성채에 닿는다. 길목마다 초소가 섰다.',
  },
  w_tunnel: {
    name: '쇠망치 땅굴길', kind: '땅굴길', place: 'hammer', patron: 'dwarf', cost: 4800, need: 360, era: 0,
    desc: '쇠망치 골 드워프들이 산 밑을 뚫어 그라우벨까지 곧장 가는 땅굴길을 낸다. 위로 넘던 길을 아래로 간다.',
    fx: { link: [['hammer', 'graubel', 1]], local: { hammer: { grain: -0.1, wine: -0.08 } } },
    mark: '산 밑을 뚫은 땅굴길 입구에 등불이 줄지어 걸려 있다.',
    doneText: '쇠망치 땅굴길이 뚫렸다. 드워프와 인간 일꾼이 산 한가운데서 만났다고 한다. 쇠망치 골에 곡식이 싸게 들어온다.',
  },
  w_aqueduct: {
    name: '제도 큰 수로', kind: '수로', place: 'eisen', patron: 'empire', cost: 8000, need: 360, era: 0,
    desc: '산에서 제도 아이젠베르크까지 아치 수로를 놓아 맑은 물을 끌어온다. 우물을 두고 다투던 골목이 조용해질 것이다.',
    fx: { wage: { eisen: 0.08 }, local: { eisen: { grain: -0.05 } } },
    mark: '산에서 내려오는 아치 수로가 도시 위를 가로지른다.',
    doneText: '제도 큰 수로가 물을 흘려보냈다. 광장 분수에서 처음 물이 솟자 사람들이 환호했다.',
  },
  w_light: {
    name: '포르텔 등대', kind: '등대', place: 'portel', patron: 'city', cost: 2600, need: 180, era: 0,
    desc: '포르텔 항구 어귀 암초 위에 돌 등대를 세운다. 밤마다 부서지던 배들이 줄 것이다.',
    fx: { wage: { portel: 0.06 }, local: { portel: { spice: -0.05, silk: -0.05 } } },
    mark: '항구 어귀 암초 위에 돌 등대가 밤새 불을 밝힌다.',
    doneText: '포르텔 등대에 불이 올랐다. 밤에도 배가 항구에 든다. 남쪽 바다 상인들이 더 자주 들른다.',
  },
};
export const WORK_IDS = Object.keys(WORKS);
export const STAGE_NAMES = { idle: '아직', building: '짓는 중', stalled: '멈춤', done: '완공' };
export const workName = (id) => WORKS[id]?.name ?? '큰 공사';
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const pct = (w, id) => Math.min(100, Math.round((w.progress / WORKS[id].need) * 100));
export const rate = (id, w) => (WORKS[id].cost / WORKS[id].need) * (w?.labor === 'corvee' ? 0.6 : 1);
export const progressWord = (p) => (p >= 95 ? '마무리만 남았다' : p >= 70 ? '거의 다 올라갔다' : p >= 40 ? '반쯤 올라갔다' : p >= 15 ? '뼈대가 서기 시작했다' : '터를 닦는 중이다');
export const fundsWord = (w, id) => { const m = w.funds / rate(id, w); return m >= 36 ? '돈이 넉넉하다' : m >= 12 ? '돈이 한동안 버틴다' : m >= 3 ? '돈이 바닥을 보인다' : '돈이 없다'; };

const freshW = () => ({ stage: 'idle', progress: 0, funds: 0, patron: null, labor: 'wage', since: 0, stalledAt: 0, doneAt: 0, deaths: 0, falls: 0, stalls: 0, ruins: 0, strike: 0, carved: null, myGold: 0, myMonths: 0, overseer: false, skim: 0, offered: false });
const freshMe = () => ({ gold: 0, months: 0, overseer: null, awayM: 0, drafted: 0, dodged: 0, carved: 0, opened: 0, skimmed: 0 });
const fresh = () => ({ w: Object.fromEntries(WORK_IDS.map((id) => [id, freshW()])), me: freshMe(), log: [] });
export function WS(g) {
  if (!g.works) g.works = fresh();
  return g.works;
}
export function wlog(g, text) {
  const S = WS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 40) S.log.splice(0, S.log.length - 40);
}

/* ---------- 바뀐 세상 다시 그리기 ---------- */
let BASE = null;
const touched = () => {
  const pls = new Set(), loc = new Set();
  for (const d of Object.values(WORKS)) {
    for (const [a, b] of d.fx.link ?? []) { pls.add(a); pls.add(b); }
    for (const pl of Object.keys(d.fx.wage ?? {})) pls.add(pl);
    for (const pl of Object.keys(d.fx.local ?? {})) loc.add(pl);
    pls.add(d.place);
  }
  return { pls: [...pls], loc: [...loc] };
};
function snap() {
  const t = touched();
  BASE = { places: {}, local: {} };
  for (const pl of t.pls) if (PLACES[pl]) BASE.places[pl] = { links: { ...PLACES[pl].links }, wage: PLACES[pl].wage, desc: PLACES[pl].desc };
  for (const pl of t.loc) if (LOCAL[pl]) BASE.local[pl] = { ...LOCAL[pl] };
}
export const doneWorks = (g) => (g?.works ? WORK_IDS.filter((id) => g.works.w[id]?.stage === 'done') : []);
export function syncWorks(g) {
  if (!BASE) snap();
  for (const [pl, b] of Object.entries(BASE.places)) {
    const P = PLACES[pl];
    for (const k of Object.keys(P.links)) if (!(k in b.links)) delete P.links[k];
    Object.assign(P.links, b.links);
    P.wage = b.wage; P.desc = b.desc;
  }
  for (const [pl, b] of Object.entries(BASE.local)) {
    for (const k of Object.keys(LOCAL[pl])) if (!(k in b)) delete LOCAL[pl][k];
    Object.assign(LOCAL[pl], b);
  }
  for (const id of doneWorks(g)) {
    const d = WORKS[id], fx = d.fx;
    for (const [a, b, m] of fx.link ?? []) {
      if (!PLACES[a] || !PLACES[b]) continue;
      PLACES[a].links[b] = Math.min(PLACES[a].links[b] ?? 99, m);
      PLACES[b].links[a] = Math.min(PLACES[b].links[a] ?? 99, m);
    }
    for (const [pl, v] of Object.entries(fx.wage ?? {})) if (PLACES[pl]) PLACES[pl].wage = Math.round((PLACES[pl].wage + v) * 100) / 100;
    for (const [pl, o] of Object.entries(fx.local ?? {})) if (LOCAL[pl]) for (const [k, v] of Object.entries(o)) LOCAL[pl][k] = Math.round(((LOCAL[pl][k] ?? 0) + v) * 100) / 100;
    if (PLACES[d.place] && !PLACES[d.place].desc.includes(d.mark)) PLACES[d.place].desc = `${PLACES[d.place].desc} ${d.mark}`;
  }
}

function fill(g) {
  const S = WS(g);
  S.w ??= {}; S.me = Object.assign(freshMe(), S.me ?? {}); S.log ??= [];
  for (const id of WORK_IDS) S.w[id] = Object.assign(freshW(), S.w[id] ?? {});
  for (const [id, w] of Object.entries(S.w)) {
    if (!WORKS[id]) { delete S.w[id]; continue; }
    if (!STAGE_NAMES[w.stage]) w.stage = 'idle';
    for (const k of ['progress', 'funds', 'deaths', 'falls', 'stalls', 'ruins', 'strike', 'myGold', 'myMonths', 'skim']) if (!Number.isFinite(w[k])) w[k] = 0;
  }
  if (S.me.overseer && !WORKS[S.me.overseer]) S.me.overseer = null;
}
HOOKS.newGame.push((g) => { g.works = fresh(); syncWorks(g); });
HOOKS.migrate.push((g) => { fill(g); syncWorks(g); });
// 대가 바뀌면 감독 자리는 넘어가지 않는다. 돌에 새긴 이름과 낸 돈은 남는다(집안의 이름이니까).
HOOKS.heir.push((g) => {
  if (!g.works) return;
  const S = WS(g);
  if (S.me.overseer) { S.w[S.me.overseer].overseer = false; S.me.overseer = null; }
  S.me.awayM = 0;
});
export { J };
