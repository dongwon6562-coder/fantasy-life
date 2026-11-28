// 16단계: 맹세와 의형제.
// 말 한마디로 삶이 묶인다. 지키면 값을 치르고, 깨면 낙인이 남는다. 어떤 약속은 대를 넘어 자식과 손주에게 간다.
// - 의형제·의자매(oath_blood): 가까운 벗과 피를 섞는다. 서로 어려울 때 부른다(oath_blood_call). 저버리면 원수가 된다.
//   의형제가 먼저 가면 그 집 식구를 어떻게 할지 정한다(oath_blood_mourn). 의형제가 나를 감옥에서, 가난에서 건져 주기도 한다.
// - 주군과 가신(oath_liege, oath_man): 영주나 국왕에게 무릎을 꿇는다. 해마다 녹을 받고, 부르면 간다(oath_liege_call: 소집·호위·군자금·더러운 명령).
//   주군의 집안이 바뀌면 다시 맹세할지 정한다(oath_liege_gone). 이름이 났거나 영지가 있으면 나도 가신을 받는다(oath_man_turn: 녹이 끊기거나 내가 낙인찍히면 떠난다).
// - 사제의 서원(oath_vow): 청빈·독신·칼을 들지 않음·순례·침묵·금식. 시험(oath_vow_test)을 넘기면 신앙이 깊어지고, 어기면 낙인.
// - 두 집안의 약속(oath_pact): 서로 돕기, 자식끼리 혼인. 집안의 머리가 죽으면 자식이 약속을 잇는다. 때가 오면 지킬지 정한다(oath_pact_call, oath_pact_due).
//   대를 이으면 죽은 사람의 의형제는 '두 집안의 약속'으로 남는다.
// - 낙인(brand 0~100): 맹세를 깨면 오르고, 세월과 지킨 맹세로 조금씩 옅어진다. 높으면 아무도 나와 맹세하려 하지 않는다. 대를 이으면 일부가 자식에게 남는다.
// 잇는 곳: relations(호감·기억·addAffinity), feud(저버린 의형제·깨진 혼약은 원한), repute(의리 loyal·정직 honest), faith(서원과 신앙),
// crime(감옥), world(영주·국왕 이름), domain(영지가 있으면 가신), heir(대 잇기).
// 상태는 game.oath 하나. 화면 연결점: oathInfo(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat } from '../game.js';
import { byId, fullName, ageYears, living } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, tired, stress, spend, canSpend, check } from '../adventure/core.js';
import { injure } from '../events/core.js';
import { rel, remember, addAffinity } from '../relations.js';
import { isJailed, crimeState } from '../crime.js';
import { deed } from '../repute/index.js';
import { addGrudge } from '../feud/index.js';
import { faithState } from '../faith/index.js';
import { lordName, rulerName } from '../world.js';

const jo = (w, pair) => J(w, pair).slice(w.length);
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '어느 고장';
const ready = (g) => playerAge(g) >= 16 && !traveling(g) && !isJailed(g) && !g.over && !L(g).heirPending;
const alive = (p) => !!p && p.alive && !p.isPlayer;
const like = (p, n) => { p.affection = clamp((p.affection ?? 0) + n, -100, 100); };

export function brandWord(v) {
  if (v >= 70) return '맹세를 팔아먹은 사람';
  if (v >= 40) return '말을 어긴 사람';
  if (v >= 15) return '한 번 말을 어겼다';
  return '';
}
// 의형제의 호칭: 남자끼리 의형제, 여자끼리 의자매, 섞이면 의남매
const sworn = (g, p) => (g.player.sex === p.sex ? (p.sex === 'm' ? '의형제' : '의자매') : '의남매');

/* ---------- 상태 ---------- */
export function oathState(g) {
  g.oath ??= {};
  const v = g.oath;
  v.bonds ??= [];     // [{ id, kind: blood|liege|man, pid, name, since, gen, kept, strain, ritual, lord, lordKey, calledAt }]
  v.vow ??= null;     // { kind, since, until, kills, tests }
  v.vows ??= [];      // 지나간 서원 [{ kind, y, how }]
  v.pacts ??= [];     // [{ id, house, pid, kind, since, gen, from, done, calledAt }]
  v.brand ??= 0;
  v.honor ??= 0;      // 지킨 맹세가 쌓인 이름
  v.broken ??= [];    // [{ y, kind, name, why }]
  v.seq ??= 1;
  v.sceneAt ??= 0;
  v.log ??= [];
  return v;
}
const O = oathState;
function log(g, text) { const v = O(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
const bondsOf = (g, kind) => O(g).bonds.filter((b) => b.kind === kind && alive(byId(g, b.pid)));
const liegeBond = (g) => O(g).bonds.find((b) => b.kind === 'liege') ?? null;
const swornTo = (g, id) => O(g).bonds.find((b) => b.pid === id && b.kind === 'blood') ?? null;

// 맹세를 지켰다
function keep(g, b, n = 1) {
  const v = O(g);
  if (b) b.kept = (b.kept ?? 0) + 1;
  v.honor = clamp(v.honor + n, 0, 100);
  v.brand = Math.max(0, v.brand - n * 0.8);
  deed(g, 'loyal', 2 * n, null);
}
// 맹세를 깼다
function breakOath(g, b, why, { heat = 0, brand = 15 } = {}) {
  const v = O(g);
  v.brand = clamp(v.brand + brand, 0, 100);
  v.honor = Math.max(0, v.honor - brand / 2);
  const name = b?.name ?? why;
  v.broken.push({ y: g.date.year, kind: b?.kind ?? 'vow', name, why });
  if (v.broken.length > 20) v.broken.shift();
  if (b) v.bonds = v.bonds.filter((x) => x !== b);
  deed(g, 'loyal', -Math.round(brand / 2), b?.kind === 'liege' ? `주군을 저버렸다더라` : b?.kind === 'blood' ? '의형제를 저버렸다더라' : null);
  const p = b ? byId(g, b.pid) : null;
  if (alive(p)) { like(p, -35); remember(g, p, why, -2, { tag: 'oath_broken' }); if (heat) addGrudge(g, p, heat, why); }
  log(g, `맹세를 깼다: ${why}.`);
  note(g, `맹세를 깼다. ${why}.`);
}

/* ---------- 화면용 ---------- */
const KIND_WORD = { blood: '피로 맺은 사이', liege: '주군', man: '내게 맹세한 가신' };
export function oathInfo(g) {
  const v = O(g);
  return {
    brand: Math.round(v.brand), brandWord: brandWord(v.brand), honor: Math.round(v.honor),
    bonds: v.bonds.map((b) => {
      const p = byId(g, b.pid);
      return { kind: b.kind, kindWord: b.kind === 'blood' && p ? sworn(g, p) : KIND_WORD[b.kind], name: b.kind === 'liege' ? b.lord : b.name, alive: !!p?.alive || b.kind === 'liege', years: Math.floor((mi(g) - b.since) / 12), kept: b.kept ?? 0, strain: b.strain ?? 0 };
    }),
    vow: v.vow ? { kind: v.vow.kind, name: VOWS[v.vow.kind].name, years: Math.floor((mi(g) - v.vow.since) / 12), left: v.vow.until ? Math.max(0, Math.ceil((v.vow.until - mi(g)) / 12)) : null } : null,
    vows: v.vows.slice(-6).map((x) => ({ name: VOWS[x.kind]?.name ?? '서원', y: x.y, how: x.how })),
    pacts: v.pacts.filter((x) => !x.done).map((x) => ({ house: x.house, kind: x.kind, kindWord: PACTS[x.kind].name, from: x.from, gen: x.gen, inherited: x.gen < (L(g).gen ?? 1), who: byId(g, x.pid)?.alive ? fullName(byId(g, x.pid)) : null })),
    broken: v.broken.slice(-6).map((x) => ({ ...x })),
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 의형제·의자매 ---------- */
function bloodCandidates(g) {
  const m = me(g);
  const fam = new Set([...(g.player.familyIds ?? []), ...(m.childIds ?? []), m.spouseId, m.fatherId, m.motherId]);
  return living(g)
    .filter((p) => !p.isPlayer && p.known && ageYears(p) >= 16 && (p.affection ?? 0) >= 55 && !fam.has(p.id) && !swornTo(g, p.id) && p.bond !== 'lover' && p.bond !== 'enemy')
    .sort((a, b) => b.affection - a.affection).slice(0, 3);
}
ACTIONS.push({
  id: 'oath_blood', name: '의형제 맺기', icon: 'heart',
  desc: '목숨을 맡길 만한 벗과 피를 섞어 의형제(의자매)를 맺는다. 서로 어려울 때 부르면 간다. 저버리면 원수가 된다.',
  available: (g) => ready(g) && bondsOf(g, 'blood').length < 3 && !sceneQueued(g, 'oath_blood') && bloodCandidates(g).length > 0,
  run(g) {
    queueScene(g, 'oath_blood', { ids: bloodCandidates(g).map((p) => p.id) });
    return '술잔을 앞에 두고 오래 생각했다. 피를 섞을 만한 사람이 누구인가.';
  },
});
const RITUAL = [
  '손바닥을 칼로 긋고 맞잡았다. 피가 섞여 손목으로 흘렀다. "같은 날 태어나지는 않았으나, 같은 날 죽기를 바란다."',
  '사당 앞에 향을 피우고 나란히 절했다. 술잔에 피 한 방울씩을 떨어뜨려 나눠 마셨다.',
  '언덕 위 늙은 나무 아래서 무릎을 꿇었다. 하늘과 땅을 증인으로 불렀다. 바람이 세게 불었다.',
];
defineScene('oath_blood', {
  title: () => '피로 맺는 맹세',
  text: (g) => `피를 섞는 맹세는 무겁다. 의형제는 남보다 가깝고, 때로는 핏줄보다 질기다. 그 사람이 부르면 가야 하고, 저버리면 평생 등 뒤를 조심해야 한다.${O(g).brand >= 40 ? ' 내가 맹세를 어긴 적이 있다는 걸 다들 안다.' : ''}`,
  choices: (g, s) => {
    const ps = s.ids.map((id) => byId(g, id)).filter((p) => alive(p) && !swornTo(g, p.id));
    if (!ps.length) return [];
    return [...ps.map((p) => ({ label: `${J(p.name, '과/와')} 피를 섞자고 한다`, key: `p:${p.id}` })), { label: '아직 그만한 사이는 아니다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '술만 마시고 일어났다. 맹세는 가볍게 할 것이 아니다.';
    const p = byId(g, Number(key.slice(2)));
    if (!alive(p)) return '그 사람은 이미 곁에 없었다.';
    const v = O(g);
    if (!check(rng, (p.affection ?? 0) + g.player.stats.cha * 0.3 - v.brand * 0.6, 60)) {
      like(p, -3);
      return v.brand >= 40 ? `${J(p.name, '은/는')} 잔을 내려놓았다. "자네가 전에 한 맹세는 어찌 되었나." 대답할 말이 없었다.` : `${J(p.name, '은/는')} 한참 웃다가 고개를 저었다. "피까지 섞을 건 뭔가. 우린 지금도 충분하네." 서운했지만, 틀린 말은 아니었다.`;
    }
    const w = sworn(g, p);
    const b = { id: v.seq++, kind: 'blood', pid: p.id, name: fullName(p), since: mi(g), gen: L(g).gen ?? 1, kept: 0, strain: 0, calledAt: mi(g) };
    v.bonds.push(b);
    like(p, 20); rel(p);
    remember(g, p, `${w}를 맺었다`, 3, { tag: 'oath_blood' });
    note(g, `${J(p.name, '과/와')} ${w}를 맺었다.`);
    log(g, `${J(p.name, '과/와')} ${w}를 맺었다.`);
    chron(g, `${J(g.player.name, '과/와')} ${p.name}, ${w}를 맺다.`, 35);
    stress(g, -8);
    return `${rng.pick(RITUAL)} 이제 ${J(p.name, '은/는')} 내 ${w}다.`;
  },
});
const CALLS = {
  debt: { title: '빚쟁이에게 몰린 의형제', cost: 30, text: (n) => `${J(n, '이/가')} 밤늦게 찾아왔다. 노름빚인지 장사 빚인지, 빚쟁이들이 집을 차지하겠다고 한다. "은화 서른 닢만 있으면 넘길 수 있네."` },
  fight: { title: '칼부림', cost: 0, text: (n) => `${J(n, '이/가')} 보낸 아이가 숨을 헐떡이며 왔다. 장터에서 패거리와 시비가 붙어 오늘 밤 칼을 들고 만나기로 했단다. 혼자 가면 죽는다.` },
  wedding: { title: '혼삿날', cost: 15, text: (n) => `${n}의 자식이 혼인한다. 잔치 비용이 모자라 얼굴이 말이 아니다. 의형제라면 이럴 때 보태는 법이다.` },
  jail: { title: '옥에 갇힌 의형제', cost: 30, text: (n) => `${J(n, '이/가')} 경비대에 끌려갔다. 억울하다고 한다. 보석금을 내면 풀려나고, 아니면 몇 달을 썩어야 한다.` },
  sick: { title: '앓아누운 의형제', cost: 12, text: (n) => `${J(n, '이/가')} 열병으로 앓아누웠다. 약값이 없어 식구들이 발만 구른다.` },
};
defineScene('oath_blood_call', {
  title: (g, s) => CALLS[s.need].title,
  text: (g, s) => CALLS[s.need].text(byId(g, s.who).name),
  choices: (g, s) => {
    const p = byId(g, s.who);
    if (!alive(p) || !swornTo(g, p.id)) return [];
    const c = CALLS[s.need];
    const out = [];
    if (s.need === 'fight') out.push({ label: '칼을 들고 같이 간다', key: 'go' }, { label: '말려서 싸움을 막는다', key: 'talk' });
    else if (canSpend(g, c.cost)) out.push({ label: `은화 ${c.cost}닢을 내준다`, key: 'pay' });
    if (s.need !== 'fight' && canSpend(g, Math.ceil(c.cost / 2))) out.push({ label: `있는 대로 반이라도 보탠다 (은화 ${Math.ceil(c.cost / 2)}닢)`, key: 'half' });
    if (s.need === 'jail') out.push({ label: '밤에 옥문을 따고 빼낸다', key: 'break' });
    out.push({ label: '모른 척한다', key: 'refuse' });
    return out;
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.who), b = swornTo(g, s.who);
    if (!alive(p) || !b) return '찾아갔을 때는 일이 이미 끝나 있었다.';
    const c = CALLS[s.need];
    b.calledAt = mi(g);
    if (key === 'pay') {
      if (!spend(g, c.cost)) return '주머니를 뒤집었지만 모자랐다. 고개를 숙였다.';
      like(p, 12); keep(g, b, 2);
      return { debt: `은화를 쥐여 주었다. ${J(p.name, '은/는')} 말없이 내 어깨를 두 번 두드렸다. 그거면 됐다.`, wedding: '잔칫상이 그럴듯해졌다. 신랑 신부가 내게 절을 했다. 의형제의 자식은 내 자식이나 같다.', jail: `보석금을 냈다. 옥문을 나온 ${J(p.name, '이/가')} 햇빛에 눈을 찡그렸다. "빚을 졌네." "빚이라니."`, sick: `약을 사 들고 갔다. ${J(p.name, '은/는')} 사흘 뒤 일어나 앉았다. 첫마디가 "술 한잔하세"였다.` }[s.need];
    }
    if (key === 'half') {
      if (!spend(g, Math.ceil(c.cost / 2))) return '그 반도 없었다.';
      like(p, 5); keep(g, b, 1);
      return `있는 대로 털어 주었다. 모자란 건 ${J(p.name, '이/가')} 어떻게든 메웠다. 서운한 얼굴은 아니었다. 내 형편을 아니까.`;
    }
    if (key === 'go') {
      tired(g, 15);
      const ok = check(rng, g.player.stats.str * 0.4 + (g.player.skills.sword ?? 0) * 0.5 + 10, 45);
      like(p, 15); keep(g, b, 2); deed(g, 'brave', 3, null);
      if (ok) return `둘이 등을 맞대고 섰다. 상대는 다섯, 우리는 둘. 그런데 먼저 달아난 건 그쪽이었다. ${J(p.name, '이/가')} 피 묻은 이를 드러내고 웃었다.`;
      injure(g, '칼에 베인 어깨', 3);
      return `칼날이 어깨를 스쳤다. 피를 흘리면서도 물러서지 않았다. 패거리가 물러간 뒤 ${J(p.name, '이/가')} 내 상처를 싸매며 울었다. "자네가 올 줄 알았네."`;
    }
    if (key === 'talk') {
      if (check(rng, g.player.stats.cha * 0.6 + 15, 45)) { like(p, 8); keep(g, b, 1); return '양쪽 사이에 서서 말로 풀었다. 술값은 내가 냈다. 칼은 칼집에 머물렀다.'; }
      like(p, -5); b.strain = (b.strain ?? 0) + 1;
      return `말리려 했지만 ${J(p.name, '은/는')} 내 손을 뿌리쳤다. "겁이 나면 집에 있게." 그날 밤 ${p.name} 혼자 갔다.`;
    }
    if (key === 'break') {
      tired(g, 10);
      const ok = check(rng, (g.player.stats.agi ?? 20) * 0.5 + (g.player.skills.stealth ?? 0) * 0.5 + 10, 50);
      like(p, 20); keep(g, b, 2);
      if (ok) { p.place = rng.pick(['harfen', 'verden', 'barka']); return `자물쇠를 따는 데 반 시진이 걸렸다. ${J(p.name, '은/는')} 그 길로 고장을 떠났다. 떠나며 한 말은 하나였다. "이 목숨은 자네 것이네."`; }
      const c2 = crimeState(g);
      c2.bounty ??= {};
      c2.bounty[here(g)] = (c2.bounty[here(g)] ?? 0) + 20;
      return `옥문 앞에서 경비병과 마주쳤다. 둘이 같이 달아났다. ${J(p.name, '은/는')} 빠져나갔지만 내 얼굴을 본 사람이 있다. 현상금이 붙었다.`;
    }
    b.strain = (b.strain ?? 0) + 1;
    if (s.need === 'fight' || b.strain >= 2) {
      breakOath(g, b, `${p.name}${jo(p.name, '이/가')} 불렀을 때 가지 않았다`, { heat: 40, brand: 18 });
      return `가지 않았다. 다음 날 ${J(p.name, '이/가')} 문 앞에 와서 섰다. 말없이 손바닥의 흉터를 보여 주고는 돌아갔다. 그 흉터는 이제 원한의 표시다.`;
    }
    like(p, -15); stress(g, 6);
    return `모른 척했다. ${J(p.name, '은/는')} 다시 찾아오지 않았다. 한 번은 넘어가 줄지도 모른다. 두 번은 아닐 것이다.`;
  },
});
defineScene('oath_blood_mourn', {
  title: () => '먼저 간 의형제',
  text: (g, s) => {
    const p = byId(g, s.who);
    return `${p.name}의 부고가 왔다. ${p.deathCause ? `${J(p.deathCause, '으로/로')} 갔다고 한다.` : ''} 같은 날 죽자던 맹세는 지키지 못했다. 그 집에는 ${s.kids ? `자식 ${s.kids}명이` : '늙은 식구들이'} 남았다.`;
  },
  choices: (g, s) => [
    ...(canSpend(g, 30) ? [{ label: '남은 식구를 거두고 은화 30닢을 보낸다', key: 'family' }] : []),
    { label: '상여를 메고 무덤에 술을 따른다', key: 'grave' },
    { label: '그 집과의 약속으로 남긴다', key: 'pact' },
  ],
  resolve(g, rng, s, key) {
    const v = O(g);
    const p = byId(g, s.who);
    const kids = (p?.childIds ?? []).map((id) => byId(g, id)).filter(alive);
    const heirP = kids.sort((a, b) => b.ageMonths - a.ageMonths)[0];
    if (key === 'family') {
      if (!spend(g, 30)) return '보낼 은화가 모자랐다.';
      for (const k of kids) { like(k, 15); k.known = true; }
      v.honor = clamp(v.honor + 4, 0, 100); deed(g, 'loyal', 4, '죽은 의형제의 식구를 거두었다더라');
      if (heirP) v.pacts.push({ id: v.seq++, house: heirP.lastName, pid: heirP.id, kind: 'aid', since: mi(g), gen: L(g).gen ?? 1, from: p?.name ?? '의형제', done: false, calledAt: mi(g) });
      return `은화를 보내고, 아이들 하나하나의 머리를 쓰다듬었다. "이제 내가 너희 아비 몫까지 한다." 그 말은 맹세의 연장이었다.`;
    }
    if (key === 'pact' && heirP) {
      v.pacts.push({ id: v.seq++, house: heirP.lastName, pid: heirP.id, kind: 'aid', since: mi(g), gen: L(g).gen ?? 1, from: p?.name ?? '의형제', done: false, calledAt: mi(g) });
      like(heirP, 10);
      return `${J(heirP.name, '을/를')} 불러 말했다. "네 ${p?.sex === 'f' ? '어미' : '아비'}와 나는 피를 나눴다. 그 맹세는 이제 우리 두 집안의 약속이다." ${J(heirP.name, '이/가')} 고개를 숙였다.`;
    }
    tired(g, 6); stress(g, -4); keep(g, null, 1);
    return '상여를 멨다. 무덤에 술을 따르고, 손바닥의 흉터를 오래 보았다. 이 흉터는 내가 죽을 때까지 남을 것이다.';
  },
});

/* ---------- 주군과 가신 ---------- */
const lordKey = (g) => `lord:${g.realm?.lord?.house ?? ''}:${g.realm?.lord?.name ?? ''}`;
const crownKey = (g) => `crown:${rulerName(g)}`;
const canLiege = (g) => (g.player.skills.sword ?? 0) >= 25 || (L(g).renown ?? 0) >= 20 || ['knight', 'guard', 'soldier', 'clerk'].includes(L(g).job?.id);
ACTIONS.push({
  id: 'oath_liege', name: '주군에게 맹세하기', icon: 'crown',
  desc: '영주나 국왕 앞에 무릎을 꿇고 가신이 된다. 해마다 녹을 받는 대신 부르면 가야 한다. 칼을 쓸 줄 알거나 이름이 났어야 받아 준다.',
  available: (g) => ready(g) && playerAge(g) >= 16 && !liegeBond(g) && canLiege(g) && O(g).brand < 70 && !sceneQueued(g, 'oath_liege_offer'),
  run(g) {
    queueScene(g, 'oath_liege_offer', { renew: false });
    return '성으로 가는 길을 물었다. 문지기가 위아래로 훑어보았다.';
  },
});
defineScene('oath_liege_offer', {
  title: (g, s) => (s.renew ? '부모의 주군' : '무릎을 꿇다'),
  text: (g, s) => (s.renew
    ? `부모가 섬기던 주군의 사자가 왔다. "선대의 맹세를 이어 가겠는가." 이어 가면 녹과 함께 부름도 물려받는다.`
    : `${lordName(g)}의 성. 가신이 되겠다는 사람이 줄을 섰다. 맹세하면 해마다 녹을 받고, 주군이 부르면 칼을 들고 가야 한다. 맹세한 뒤에 부름을 저버리면 맹세를 깬 것이 된다.`),
  choices: (g) => {
    if (liegeBond(g)) return [];
    const out = [{ label: `${lordName(g)}에게 맹세한다`, key: 'lord' }];
    if (here(g) === 'leocast' || (L(g).renown ?? 0) >= 40) out.push({ label: `국왕 ${rulerName(g)}에게 맹세한다`, key: 'crown' });
    out.push({ label: '누구의 개도 되지 않는다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') { gainStat(g, 'wil', 0.3); return '돌아섰다. 녹은 없지만 부름도 없다. 내 칼은 내 것이다.'; }
    const v = O(g);
    if (v.brand >= 50 && !check(rng, 70 - v.brand, 40)) return '시종장이 장부를 뒤적이더니 고개를 저었다. "맹세를 어긴 사람은 받지 않소." 문이 닫혔다.';
    const crown = key === 'crown';
    const lord = crown ? `국왕 ${rulerName(g)}` : lordName(g);
    v.bonds.push({ id: v.seq++, kind: 'liege', pid: null, name: lord, lord, lordKey: crown ? crownKey(g) : lordKey(g), since: mi(g), gen: L(g).gen ?? 1, kept: 0, strain: 0, calledAt: mi(g) });
    L(g).renown = (L(g).renown ?? 0) + 2;
    deed(g, 'loyal', 3, null);
    log(g, `${lord}에게 맹세했다.`);
    note(g, `${lord}에게 충성을 맹세했다.`);
    return `${lord} 앞에 무릎을 꿇었다. 두 손을 모아 주군의 손 사이에 넣었다. "목숨이 다할 때까지." 칼등이 어깨를 두 번 두드렸다. 이제 나는 ${lord}의 사람이다.`;
  },
});
const LCALL = {
  war: { title: '소집령', text: (l) => `${l}의 소집령이 왔다. 국경이 시끄럽다. 무장을 갖추고 한 달 안에 성으로 오라.` },
  guard: { title: '호위', text: (l) => `${l}의 행차를 호위하라는 명이 왔다. 길에 도적이 많다는 소문이다.` },
  tax: { title: '군자금', text: (l) => `${l}의 집사가 왔다. 성벽을 고칠 돈이 모자라니 가신들은 은화 스무 닢씩을 내라고 한다.` },
  dirty: { title: '더러운 명령', text: (l) => `${l}의 밀명이다. 세금을 못 낸 마을의 우두머리를 끌어내고 곳간을 불태우라고 한다. 본보기라고.` },
};
defineScene('oath_liege_call', {
  title: (g, s) => LCALL[s.need].title,
  text: (g, s) => LCALL[s.need].text(liegeBond(g)?.lord ?? '주군'),
  choices: (g, s) => {
    if (!liegeBond(g)) return [];
    if (s.need === 'tax') return [...(canSpend(g, 20) ? [{ label: '은화 20닢을 바친다', key: 'pay' }] : []), { label: '형편이 어렵다고 사정한다', key: 'plead' }, { label: '내지 않는다', key: 'refuse' }];
    if (s.need === 'dirty') return [{ label: '명대로 한다', key: 'obey' }, { label: '다른 방법을 청한다', key: 'plead' }, { label: '거역한다', key: 'refuse' }];
    return [{ label: '간다', key: 'go' }, { label: '대신 사람을 사서 보낸다 (은화 25닢)', key: 'hire' }, { label: '가지 않는다', key: 'refuse' }].filter((c) => c.key !== 'hire' || canSpend(g, 25));
  },
  resolve(g, rng, s, key) {
    const b = liegeBond(g);
    if (!b) return '부름은 흐지부지되었다.';
    b.calledAt = mi(g);
    if (key === 'go') {
      tired(g, s.need === 'war' ? 25 : 12);
      keep(g, b, 2); L(g).renown = (L(g).renown ?? 0) + (s.need === 'war' ? 3 : 1);
      g.player.money += s.need === 'war' ? 15 : 6;
      if (s.need === 'war' && rng.chance(0.35)) { injure(g, '전장에서 얻은 상처', 4); return '국경에서 한 달을 보냈다. 화살이 허벅지를 뚫었다. 그래도 진영은 지켰다. 주군이 내 이름을 불러 은화를 내렸다.'; }
      return s.need === 'war' ? '국경에서 한 달을 보냈다. 큰 싸움은 없었다. 진흙과 추위와 기다림뿐이었다. 돌아오는 길에 주군이 은화를 내렸다.' : '행차를 따라 사흘을 걸었다. 숲길에서 수상한 그림자를 보았지만 덤비지는 않았다. 주군이 말 위에서 고개를 끄덕였다.';
    }
    if (key === 'hire') {
      if (!spend(g, 25)) return '사람을 살 돈이 모자랐다.';
      return '은화로 대신 갈 사람을 샀다. 맹세는 지킨 셈이다. 주군의 집사가 장부에 적으며 입꼬리를 비틀었다.';
    }
    if (key === 'pay') {
      if (!spend(g, 20)) return '바칠 돈이 모자랐다.';
      keep(g, b, 1);
      return '은화를 바쳤다. 성벽에 새 돌이 올라갈 것이다. 그 돌 하나쯤은 내 것이다.';
    }
    if (key === 'obey') {
      keep(g, b, 1); deed(g, 'kind', -10, '영주의 개가 되어 마을 곳간을 불태웠다더라'); stress(g, 12);
      return '명대로 했다. 곳간이 타는 동안 아이들이 울었다. 주군은 흡족해했다. 나는 그날 밤 잠을 이루지 못했다.';
    }
    if (key === 'plead') {
      if (check(rng, g.player.stats.cha * 0.5 + (b.kept ?? 0) * 6 + 20, 50)) {
        if (s.need === 'dirty') deed(g, 'kind', 3, null);
        return s.need === 'dirty' ? '무릎을 꿇고 청했다. 우두머리만 끌고 가면 된다고. 주군은 한참 나를 보다가 손을 저었다. "그렇게 해라." 곳간은 타지 않았다.' : '사정을 했다. 주군은 오래 섬긴 나를 봐서 이번만 넘어가 주었다.';
      }
      b.strain = (b.strain ?? 0) + 1;
      if (b.strain >= 3) { breakOath(g, b, `${b.lord}의 명을 거듭 거슬렀다`, { brand: 15 }); return '청은 받아들여지지 않았다. 몇 번째인지 셀 수 없었다. 주군은 내 이름을 가신 명부에서 지웠다.'; }
      return '청은 받아들여지지 않았다. 주군의 눈빛이 식었다.';
    }
    // 거역
    breakOath(g, b, s.need === 'dirty' ? `${b.lord}의 더러운 명을 거역했다` : `${b.lord}의 부름을 거역했다`, { brand: s.need === 'dirty' ? 8 : 20 });
    if (s.need === 'dirty') { deed(g, 'kind', 6, '영주의 명을 거역하고 마을을 지켰다더라'); gainStat(g, 'wil', 0.6); return '거역했다. 맹세는 깨졌다. 그 마을 사람들은 나를 은인이라 부르고, 성의 사람들은 배신자라 부른다. 둘 다 맞다.'; }
    return '가지 않았다. 맹세를 깬 가신의 이름은 성문에 붙는다. 이제 그 고장 사람들은 나를 곁눈질로 본다.';
  },
});
defineScene('oath_liege_gone', {
  title: () => '주군이 바뀌다',
  text: (g, s) => `${s.old}의 시대가 끝났다. 이제 ${s.now}의 세상이다. 옛 주군에게 한 맹세는 어떻게 하는가.`,
  choices: (g) => (liegeBond(g) ? [{ label: '새 주군에게 다시 맹세한다', key: 'renew' }, { label: '옛 주군의 집안을 따라 떠난다', key: 'follow' }, { label: '맹세에서 풀려난다', key: 'free' }] : []),
  resolve(g, rng, s, key) {
    const v = O(g), b = liegeBond(g);
    if (!b) return '';
    if (key === 'renew') {
      const crown = b.lordKey.startsWith('crown');
      b.lord = crown ? `국왕 ${rulerName(g)}` : lordName(g); b.name = b.lord; b.lordKey = crown ? crownKey(g) : lordKey(g); b.since = mi(g); b.kept = 0;
      deed(g, 'loyal', -1, null);
      return `${b.lord} 앞에 다시 무릎을 꿇었다. 같은 말, 다른 손. 어떤 이는 영리하다 하고, 어떤 이는 지조가 없다 한다.`;
    }
    v.bonds = v.bonds.filter((x) => x !== b);
    if (key === 'follow') { keep(g, b, 4); stress(g, 8); log(g, `${b.lord}의 집안을 끝까지 따랐다.`); return `옛 주군의 집안이 쫓겨나는 길에 함께 섰다. 녹은 끊겼다. 그래도 사람들은 오래 그 이야기를 했다. "끝까지 간 가신이 하나 있었지."`; }
    log(g, `${b.lord}에게 한 맹세에서 풀려났다.`);
    return '주군이 없으니 맹세도 없다. 칼을 닦아 벽에 걸었다. 이상하게 어깨가 가벼웠다.';
  },
});

// 내게 맹세하는 가신
const canLead = (g) => !!g.domain || (L(g).renown ?? 0) >= 35;
function manCandidates(g) {
  return living(g).filter((p) => !p.isPlayer && p.known && ageYears(p) >= 17 && ageYears(p) <= 45 && (p.affection ?? 0) >= 30 && !O(g).bonds.some((b) => b.pid === p.id) && !(g.player.familyIds ?? []).includes(p.id) && ['guard', 'soldier', 'hunter', 'laborer', 'farmer', 'smith', 'idle'].includes(p.job))
    .sort((a, b) => b.affection - a.affection).slice(0, 3);
}
ACTIONS.push({
  id: 'oath_man', name: '가신 받기', icon: 'shield',
  desc: '이름이 났거나 영지가 있으면 나를 따르겠다는 사람의 맹세를 받는다. 다달이 녹을 주어야 하고, 녹이 끊기거나 내가 맹세를 어기는 사람이 되면 떠난다.',
  available: (g) => ready(g) && playerAge(g) >= 20 && canLead(g) && bondsOf(g, 'man').length < 3 && O(g).brand < 60 && !sceneQueued(g, 'oath_man') && manCandidates(g).length > 0,
  run(g) {
    queueScene(g, 'oath_man', { ids: manCandidates(g).map((p) => p.id) });
    return '나를 따르겠다는 사람들이 문 앞에 섰다.';
  },
});
defineScene('oath_man', {
  title: () => '가신의 맹세',
  text: () => '맹세를 받는다는 건 그 사람의 목숨을 맡는다는 뜻이다. 다달이 은화 셋을 주어야 한다. 대신 내가 부르면 온다.',
  choices: (g, s) => {
    const ps = s.ids.map((id) => byId(g, id)).filter((p) => alive(p) && !O(g).bonds.some((b) => b.pid === p.id));
    return ps.length ? [...ps.map((p) => ({ label: `${p.name}의 맹세를 받는다`, key: `p:${p.id}` })), { label: '아직 사람을 거느릴 때가 아니다', key: 'no' }] : [];
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '돌려보냈다. 사람을 거느리는 건 돈보다 무거운 일이다.';
    const p = byId(g, Number(key.slice(2)));
    if (!alive(p)) return '그 사람은 이미 떠났다.';
    const v = O(g);
    v.bonds.push({ id: v.seq++, kind: 'man', pid: p.id, name: fullName(p), since: mi(g), gen: L(g).gen ?? 1, kept: 0, strain: 0, calledAt: mi(g) });
    like(p, 15);
    remember(g, p, '내게 충성을 맹세했다', 2, { tag: 'oath_man' });
    log(g, `${J(p.name, '이/가')} 내게 맹세했다.`);
    return `${J(p.name, '이/가')} 무릎을 꿇고 두 손을 내 손 사이에 넣었다. 그 손이 떨렸다. 내 손도 조금 떨렸다. "네 목숨을 헛되이 쓰지 않겠다." 그것이 나의 맹세였다.`;
  },
});
defineScene('oath_man_turn', {
  title: () => '떠나려는 가신',
  text: (g, s) => {
    const p = byId(g, s.who);
    return s.why === 'pay' ? `${J(p.name, '이/가')} 찾아왔다. 녹이 석 달째 밀렸다. "식구들을 먹여야 합니다. 맹세를 거두어 주십시오."` : `${J(p.name, '이/가')} 찾아왔다. 눈을 마주치지 않는다. "맹세를 어기는 분께 제 맹세를 지킬 까닭이 있습니까."`;
  },
  choices: (g, s) => {
    const p = byId(g, s.who);
    if (!alive(p) || !O(g).bonds.some((b) => b.pid === p.id && b.kind === 'man')) return [];
    return [...(canSpend(g, 12) ? [{ label: '밀린 녹을 치르고 붙잡는다 (은화 12닢)', key: 'pay' }] : []), { label: '맹세를 거두어 보내 준다', key: 'free' }, { label: '배신자라 꾸짖는다', key: 'scold' }];
  },
  resolve(g, rng, s, key) {
    const v = O(g), p = byId(g, s.who), b = v.bonds.find((x) => x.pid === s.who && x.kind === 'man');
    if (!alive(p) || !b) return '이미 떠나고 없었다.';
    if (key === 'pay') {
      if (!spend(g, 12)) return '치를 돈이 모자랐다.';
      b.strain = 0; like(p, 8);
      return `밀린 녹을 치렀다. ${J(p.name, '은/는')} 은화를 세지도 않고 품에 넣었다. "다시는 이런 말 하지 않겠습니다."`;
    }
    v.bonds = v.bonds.filter((x) => x !== b);
    if (key === 'free') { like(p, 5); log(g, `${p.name}의 맹세를 거두어 보냈다.`); return `맹세를 거두어 주었다. ${J(p.name, '은/는')} 문을 나서기 전에 한 번 더 고개를 숙였다. 좋게 헤어지는 것도 주군의 일이다.`; }
    like(p, -25); addGrudge(g, p, 25, '떠나는 나를 배신자라 욕했다');
    return `"배신자." ${J(p.name, '은/는')} 대꾸하지 않았다. 다만 나가는 걸음이 단단했다. 그 말은 오래 남을 것이다.`;
  },
});

/* ---------- 사제의 서원 ---------- */
const VOWS = {
  poverty: { name: '청빈의 서원', months: 60, line: '다섯 해 동안 은화 쉰 닢 넘게 지니지 않는다', keep: '가진 것이 적으니 잃을 것도 적었다.' },
  chastity: { name: '독신의 서원', months: null, line: '평생 짝을 두지 않는다', keep: '홀로 사는 날들이 기도가 되었다.' },
  sword: { name: '칼을 들지 않는 서원', months: null, line: '다시는 사람의 피를 보지 않는다', keep: '칼집이 녹슬었다. 그래도 문제는 없었다.' },
  pilgrim: { name: '순례의 서원', months: 36, line: '세 해 안에 성도 솔라리스에 간다', keep: '성도의 계단에 무릎을 꿇었다. 서원을 이루었다.' },
  silence: { name: '침묵의 서원', months: 12, line: '한 해 동안 입을 열지 않는다', keep: '한 해의 침묵이 끝났다. 첫마디를 고르는 데 하루가 걸렸다.' },
  fast: { name: '금식의 서원', months: 36, line: '세 해 동안 고기와 술을 끊는다', keep: '세 해가 지났다. 첫 고기 한 점이 생각만큼 맛있지 않았다.' },
};
ACTIONS.push({
  id: 'oath_vow', name: '서원 세우기', icon: 'pray',
  desc: '신 앞에서 서원을 세운다. 청빈, 독신, 칼을 들지 않음, 순례, 침묵, 금식. 지키면 믿음이 깊어지고, 어기면 낙인이 남는다.',
  available: (g) => ready(g) && playerAge(g) >= 15 && !O(g).vow && (faithState(g).devotion ?? 0) >= 20 && !sceneQueued(g, 'oath_vow'),
  run(g) {
    queueScene(g, 'oath_vow', {});
    return '예배당 맨 앞자리에 오래 앉아 있었다.';
  },
});
defineScene('oath_vow', {
  title: () => '서원',
  text: (g) => `사제가 말했다. "서원은 신과 하는 약속입니다. 사람과의 약속은 사람이 용서하지만, 이것은 다릅니다." 무엇을 바칠까.`,
  choices: (g) => {
    if (O(g).vow) return [];
    const out = [];
    for (const [k, V] of Object.entries(VOWS)) {
      if (k === 'chastity' && (me(g).spouseId != null || living(g).some((p) => p.bond === 'lover'))) continue;
      if (k === 'pilgrim' && here(g) === 'solaris') continue;
      out.push({ label: `${V.name}: ${V.line}`, key: k });
    }
    return [...out, { label: '아직 바칠 것이 없다', key: 'none' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '일어나 나왔다. 서원은 가볍게 세우는 것이 아니다.';
    const v = O(g), V = VOWS[key];
    v.vow = { kind: key, since: mi(g), until: V.months ? mi(g) + V.months : null, kills: L(g).stats?.kills ?? 0, tests: 0 };
    const f = faithState(g); f.devotion = clamp((f.devotion ?? 0) + 8, 0, 100);
    log(g, `${J(V.name, '을/를')} 세웠다.`);
    note(g, `${J(V.name, '을/를')} 세웠다.`);
    if (key === 'poverty' && g.player.money > 50) { const give = g.player.money - 50; g.player.money = 50; deed(g, 'generous', 4, '가진 것을 가난한 이들에게 나눠 주었다더라'); return `서원을 세우고, 은화 ${give}닢을 예배당 구휼함에 넣었다. 주머니가 가벼워지자 걸음도 가벼워졌다.`; }
    return `"${V.line}." 사제가 내 이마에 성유를 발랐다. 이제 이 말은 신의 장부에 적혔다.`;
  },
});
function endVow(g, how) {
  const v = O(g), V = VOWS[v.vow.kind];
  v.vows.push({ kind: v.vow.kind, y: g.date.year, how });
  if (v.vows.length > 10) v.vows.shift();
  const f = faithState(g);
  if (how === 'kept') {
    f.devotion = clamp((f.devotion ?? 0) + 12, 0, 100); gainStat(g, 'wil', 1); keep(g, null, 3); deed(g, 'honest', 4, `${J(V.name, '을/를')} 끝까지 지켰다더라`);
    log(g, `${J(V.name, '을/를')} 지켜 냈다.`);
    v.vow = null;
    return V.keep;
  }
  f.devotion = clamp((f.devotion ?? 0) - 15, 0, 100);
  v.vow = null;
  breakOath(g, null, `${J(V.name, '을/를')} 어겼다`, { brand: 12 });
  return '';
}
defineScene('oath_vow_test', {
  title: (g) => `${VOWS[O(g).vow?.kind]?.name ?? '서원'}의 시험`,
  text: (g, s) => ({
    poverty: `장사가 잘된 해다. 주머니에 은화가 ${g.player.money}닢. 서원대로라면 쉰 닢 넘는 것은 내놓아야 한다.`,
    fast: '이웃 잔치에 불려 갔다. 상 위에 통돼지 구이와 새로 거른 술이 올랐다. 다들 내 잔부터 채우려 한다.',
    silence: `${s.name ?? '이웃'}의 아이가 우물에 빠질 뻔했다. 소리를 지르면 사람들이 달려올 것이다. 그런데 나는 침묵의 서원 중이다.`,
    sword: '밤길에 강도가 칼을 들이댔다. 내 허리에도 칼이 있다. 뽑으면 이길 것이다. 서원을 지키면 가진 것을 다 내줘야 한다.',
  }[O(g).vow.kind]),
  choices: (g) => {
    const k = O(g).vow?.kind;
    if (!k) return [];
    if (k === 'poverty') return g.player.money > 50 ? [{ label: '넘치는 것을 가난한 이들에게 나눈다', key: 'keep' }, { label: '이번만은 지니고 있는다', key: 'break' }] : [];
    if (k === 'fast') return [{ label: '맹물만 마신다', key: 'keep' }, { label: '한 잔쯤이야', key: 'break' }];
    if (k === 'silence') return [{ label: '말없이 달려가 아이를 붙잡는다', key: 'keep' }, { label: '소리쳐 사람을 부른다', key: 'break' }];
    return [{ label: '가진 것을 내준다', key: 'keep' }, { label: '칼을 뽑는다', key: 'break' }];
  },
  resolve(g, rng, s, key) {
    const v = O(g);
    if (!v.vow) return '';
    const k = v.vow.kind;
    v.vow.tests += 1;
    if (key === 'keep') {
      v.honor = clamp(v.honor + 1, 0, 100);
      if (k === 'poverty') { const give = Math.max(0, g.player.money - 50); g.player.money -= give; deed(g, 'generous', 3, null); return `은화 ${give}닢을 구휼함에 넣었다. 사제가 놀란 얼굴로 나를 보았다.`; }
      if (k === 'fast') { stress(g, 5); return '맹물을 마셨다. 다들 이상하게 보았다. 집에 와서 배가 고팠다. 그래도 서원은 지켰다.'; }
      if (k === 'silence') { tired(g, 6); if (rng.chance(0.7)) return '말없이 달려가 아이의 옷자락을 붙잡았다. 아이 어미가 울면서 절을 했다. 나는 고개만 끄덕였다.'; stress(g, 10); return '달려갔지만 늦었다. 아이는 다른 사람이 건졌다. 다행이었다. 그날 밤 서원이 무엇인지 오래 생각했다.'; }
      g.player.money = Math.floor(g.player.money / 2);
      return '주머니를 통째로 내주었다. 강도는 어리둥절해하다가 달아났다. 서원은 지켰다. 빈 주머니로 집에 갔다.';
    }
    const text = { poverty: '은화를 그대로 두었다. 이번 한 번이라고 했다. 그 말을 한 순간, 서원은 끝났다.', fast: '한 잔을 받았다. 두 잔이 되었다. 아침에 깨어 보니 사제의 얼굴이 떠올랐다.', silence: '소리를 질렀다. 사람들이 달려와 아이를 건졌다. 아이는 살았고, 서원은 죽었다. 후회는 없다.', sword: '칼을 뽑았다. 강도는 달아났다. 칼날에 피가 묻었다. 서원은 거기서 끝났다.' }[k];
    if (k === 'silence') deed(g, 'kind', 3, null);
    endVow(g, 'broken');
    return text;
  },
});

/* ---------- 두 집안의 약속 ---------- */
const PACTS = {
  aid: { name: '서로 돕기로 한 약속', line: '어느 집이든 어려우면 다른 집이 돕는다' },
  marry: { name: '자식끼리 혼인시키기로 한 약속', line: '두 집 자식이 자라면 짝을 지어 준다' },
};
const kidsOf = (g, p) => (p?.childIds ?? []).map((id) => byId(g, id)).filter(alive);
function pactCandidates(g) {
  const m = me(g);
  const fam = new Set([...(g.player.familyIds ?? []), ...(m.childIds ?? []), m.spouseId]);
  const houses = new Set(O(g).pacts.filter((x) => !x.done).map((x) => x.house));
  return living(g).filter((p) => !p.isPlayer && p.known && ageYears(p) >= 25 && (p.affection ?? 0) >= 40 && !fam.has(p.id) && !houses.has(p.lastName) && p.lastName !== g.player.lastName && kidsOf(g, p).length > 0)
    .sort((a, b) => b.affection - a.affection).slice(0, 3);
}
ACTIONS.push({
  id: 'oath_pact', name: '두 집안의 약속', icon: 'scroll',
  desc: '가까운 집안과 대를 넘는 약속을 맺는다. 서로 돕기, 자식끼리 혼인. 약속은 집안의 머리가 죽어도 자식에게 간다.',
  available: (g) => ready(g) && playerAge(g) >= 25 && O(g).pacts.filter((x) => !x.done).length < 3 && !sceneQueued(g, 'oath_pact') && pactCandidates(g).length > 0,
  run(g) {
    queueScene(g, 'oath_pact', { ids: pactCandidates(g).map((p) => p.id) });
    return '술 한 병을 들고 이웃 어른을 찾아갔다.';
  },
});
defineScene('oath_pact', {
  title: () => '두 집안의 약속',
  text: () => '집안끼리의 약속은 사람끼리의 약속보다 오래 간다. 내가 죽어도, 저 사람이 죽어도, 자식들이 이어받는다. 지키면 두 집이 함께 서고, 깨면 대를 이어 원망을 듣는다.',
  choices: (g, s) => {
    const ps = s.ids.map((id) => byId(g, id)).filter((p) => alive(p) && !O(g).pacts.some((x) => !x.done && x.house === p.lastName));
    if (!ps.length) return [];
    const out = [];
    for (const p of ps.slice(0, 2)) {
      out.push({ label: `${p.lastName} 집안과 서로 돕기로 한다`, key: `aid:${p.id}` });
      if ((me(g).childIds ?? []).length || playerAge(g) <= 40) out.push({ label: `${p.lastName} 집안과 자식끼리 혼인을 약속한다`, key: `marry:${p.id}` });
    }
    return [...out, { label: '아직은 말로만 가깝게 지낸다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '술만 나눠 마시고 왔다. 약속은 없어도 정은 남았다.';
    const [kind, id] = key.split(':');
    const p = byId(g, Number(id));
    if (!alive(p)) return '그 어른은 이미 세상에 없었다.';
    const v = O(g);
    if (!check(rng, (p.affection ?? 0) + 20 - v.brand * 0.6, 50)) { like(p, -2); return `${J(p.name, '은/는')} 웃으며 잔만 비웠다. "집안 일은 집안 어른들과 의논해야지." 거절이었다.`; }
    v.pacts.push({ id: v.seq++, house: p.lastName, pid: p.id, kind, since: mi(g), gen: L(g).gen ?? 1, from: g.player.name, done: false, calledAt: mi(g) });
    like(p, 10);
    log(g, `${p.lastName} 집안과 ${PACTS[kind].name}을 맺었다.`);
    chron(g, `${g.player.lastName} 집안과 ${p.lastName} 집안, ${PACTS[kind].name}을 맺다.`, 30);
    return kind === 'marry' ? `${J(p.name, '과/와')} 손뼉을 마주쳤다. 두 집 아이들이 자라면 짝을 지어 주기로 했다. 아이들은 아직 아무것도 모른다.` : `${J(p.name, '과/와')} 잔을 맞댔다. "어느 집이든 어려우면 다른 집이 돕는다." 종이에 적어 두 집이 한 장씩 나눠 가졌다.`;
  },
});
const pactHouse = (g, x) => { const p = byId(g, x.pid); return alive(p) ? p : null; };
defineScene('oath_pact_call', {
  title: (g, s) => `${s.house} 집안의 부탁`,
  text: (g, s) => {
    const p = byId(g, s.who), x = O(g).pacts.find((y) => y.id === s.pact);
    const old = x && x.gen < (L(g).gen ?? 1) ? ` ${x.from} 대에 맺은 약속을 들고 왔다. 종이가 누렇게 바랬다.` : '';
    return `${p.lastName} 집안의 ${J(p.name, '이/가')} 찾아왔다.${old} ${{ fire: '집에 불이 나 겨울을 날 곳이 없다고 한다.', harvest: '흉년에 씨앗까지 먹어 버렸다고 한다.', feud: '다른 집안과 땅 다툼이 붙었다고, 머릿수를 보태 달라고 한다.' }[s.need]} 약속대로라면 도와야 한다.`;
  },
  choices: (g, s) => {
    const p = byId(g, s.who);
    if (!alive(p) || !O(g).pacts.some((y) => y.id === s.pact && !y.done)) return [];
    return [...(canSpend(g, 20) ? [{ label: '은화 20닢을 보낸다', key: 'pay' }] : []), { label: '식구들을 데리고 가서 손을 보탠다', key: 'labor' }, { label: '약속은 옛날 일이라고 한다', key: 'refuse' }];
  },
  resolve(g, rng, s, key) {
    const v = O(g), x = v.pacts.find((y) => y.id === s.pact), p = byId(g, s.who);
    if (!x || !alive(p)) return '';
    x.calledAt = mi(g);
    if (key === 'pay') { if (!spend(g, 20)) return '보낼 돈이 모자랐다.'; like(p, 12); keep(g, null, 2); x.owed = (x.owed ?? 0) + 1; return `은화를 보냈다. ${p.lastName} 집안 사람들이 우리 집 쪽으로 절을 했다고 한다. 언젠가 우리가 어려울 때 저 집이 올 것이다.`; }
    if (key === 'labor') { tired(g, 15); like(p, 10); keep(g, null, 2); x.owed = (x.owed ?? 0) + 1; return '식구들과 연장을 챙겨 갔다. 땀 흘린 만큼 두 집이 가까워졌다. 그 집 늙은이가 우리 아이들 이름을 다 외웠다.'; }
    x.done = true; x.brokenBy = g.player.name;
    breakOath(g, null, `${p.lastName} 집안과의 약속을 저버렸다`, { brand: 12 });
    addGrudge(g, p, 30, `${x.from} 대의 약속을 저버렸다`);
    return `"옛날 일입니다." ${J(p.name, '은/는')} 대꾸 없이 그 종이를 내 앞에서 찢었다. 두 집 사이에 금이 갔다. 그 금은 아이들에게도 갈 것이다.`;
  },
});
defineScene('oath_pact_due', {
  title: () => '혼약을 지킬 때',
  text: (g, s) => {
    const a = byId(g, s.mine), b = byId(g, s.theirs), x = O(g).pacts.find((y) => y.id === s.pact);
    const when = !x ? '선대에' : x.gen < (L(g).gen ?? 1) ? `${x.from} 대에` : '예전에';
    return `${when} ${x?.house ?? ''} 집안과 자식끼리 혼인시키자고 했다. 이제 때가 왔다. 우리 집 ${J(a.name, '과/와')} 그 집 ${b.name}. ${a.affection < 20 ? `${J(a.name, '은/는')} 얼굴도 잘 모르는 사람과 혼인하기 싫다고 한다.` : `${J(a.name, '은/는')} 싫지 않은 눈치다.`}`;
  },
  choices: (g, s) => {
    const a = byId(g, s.mine), b = byId(g, s.theirs);
    if (!alive(a) || !alive(b) || a.spouseId != null || b.spouseId != null) return [];
    return [{ label: '약속대로 혼인시킨다', key: 'wed' }, { label: '아이 뜻을 묻고 따른다', key: 'ask' }, { label: '약속을 깬다', key: 'break' }];
  },
  resolve(g, rng, s, key) {
    const v = O(g), x = v.pacts.find((y) => y.id === s.pact), a = byId(g, s.mine), b = byId(g, s.theirs);
    if (!x || !alive(a) || !alive(b)) return '혼사는 없던 일이 되었다.';
    const wed = () => { a.spouseId = b.id; b.spouseId = a.id; x.done = true; keep(g, null, 3); like(a, a.affection < 20 ? -8 : 4); const h = pactHouse(g, x); if (h) like(h, 15); log(g, `${J(a.name, '과/와')} ${J(b.name, '을/를')} 혼인시켜 ${x.house} 집안과의 약속을 지켰다.`); chron(g, `${a.name} ${a.lastName}, ${b.name} ${b.lastName}과 혼인하다. 두 집안의 오랜 약속이었다.`, 30); };
    if (key === 'wed') { wed(); return `혼례를 올렸다. 두 집 어른들이 나란히 앉아 웃었다. ${a.affection < 20 ? `${J(a.name, '은/는')} 웃지 않았다. 세월이 해결해 주기를 바랄 뿐이다.` : '아이들도 웃었다. 다행이었다.'}`; }
    if (key === 'ask') {
      if (rng.chance(a.affection < 20 ? 0.35 : 0.75)) { wed(); like(a, 8); return `${J(a.name, '은/는')} 한참 망설이다가 고개를 끄덕였다. "만나 보니 괜찮은 사람이에요." 약속도 지키고 아이 뜻도 지켰다.`; }
      x.done = true;
      breakOath(g, null, `${x.house} 집안과의 혼약을 아이 뜻에 따라 깼다`, { brand: 6 });
      const h = pactHouse(g, x); if (h) addGrudge(g, h, 20, '혼약을 깼다');
      like(a, 12);
      return `${J(a.name, '은/는')} 싫다고 했다. 아이의 뜻을 따랐다. ${x.house} 집안은 섭섭해했다. 그래도 아이는 나를 오래 고마워할 것이다.`;
    }
    x.done = true;
    breakOath(g, null, `${x.house} 집안과의 혼약을 깼다`, { brand: 14 });
    const h = pactHouse(g, x); if (h) addGrudge(g, h, 40, '혼약을 깼다');
    return `혼약을 깼다. ${x.house} 집안 어른이 우리 집 대문에 침을 뱉고 갔다. 이 일은 두 집안의 아이들까지 기억할 것이다.`;
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = O(g);
  const now = mi(g);
  v.brand = Math.max(0, v.brand - 0.05);
  // 1) 주군의 녹, 가신의 녹
  const lb = liegeBond(g);
  if (lb && g.date.month === 1) { const pay = lb.lordKey.startsWith('crown') ? 20 : 12; g.player.money += pay; g.news.unshift({ text: `${lb.lord}에게서 올해 녹으로 은화 ${pay}닢이 왔다.`, rel: 60 }); }
  for (const b of bondsOf(g, 'man')) {
    if (g.player.money >= 3) { g.player.money -= 3; b.strain = Math.max(0, (b.strain ?? 0) - 0.5); } else b.strain = (b.strain ?? 0) + 1;
  }
  // 2) 의형제가 먼저 가면, 맹세한 사람이 죽으면
  for (const b of [...v.bonds]) {
    if (b.kind === 'liege') continue;
    const p = byId(g, b.pid);
    if (p && !p.alive) {
      v.bonds = v.bonds.filter((x) => x !== b);
      if (b.kind === 'blood' && !sceneQueued(g, 'oath_blood_mourn')) queueScene(g, 'oath_blood_mourn', { who: p.id, kids: kidsOf(g, p).length });
      else log(g, `내게 맹세했던 ${J(p.name, '이/가')} 세상을 떠났다.`);
    }
  }
  // 3) 집안의 머리가 죽으면 약속은 자식에게 간다
  for (const x of v.pacts) {
    if (x.done) continue;
    const p = byId(g, x.pid);
    if (p && p.alive) continue;
    const next = kidsOf(g, p).filter((k) => ageYears(k) >= 16).sort((a, b) => b.ageMonths - a.ageMonths)[0];
    if (next) { x.pid = next.id; x.house = next.lastName; next.known = true; }
    else { x.done = true; log(g, `${x.house} 집안의 대가 끊겨 약속도 끝났다.`); }
  }
  // 4) 의형제가 나를 돕는다
  const blood = bondsOf(g, 'blood');
  if (blood.length) {
    const c = crimeState(g);
    if (c.jailed && c.jailed.months > 1 && rng.chance(0.15)) {
      const p = byId(g, rng.pick(blood).pid);
      c.jailed.months -= 1;
      g.news.unshift({ text: `${J(p.name, '이/가')} 옥리에게 술값을 찔러 주었다고 한다. 갇혀 있는 날이 줄었다.`, rel: 90 });
    } else if (g.player.money < 5 && playerAge(g) >= 16 && rng.chance(0.12)) {
      const p = byId(g, rng.pick(blood).pid);
      g.player.money += 10;
      g.news.unshift({ text: `${J(p.name, '이/가')} 말없이 은화 열 닢을 놓고 갔다. "${sworn(g, p)}끼리 셈은 무슨."`, rel: 90 });
    }
  }
  // 약속한 집안이 어려울 때 돕는다
  if (g.player.money < 5 && rng.chance(0.08)) {
    const x = v.pacts.find((y) => !y.done && y.kind === 'aid' && pactHouse(g, y) && (y.owed ?? 0) > 0);
    if (x) { x.owed -= 1; g.player.money += 15; g.news.unshift({ text: `${x.house} 집안에서 쌀과 은화 열다섯 닢을 보내왔다. 약속은 양쪽으로 가는 것이다.`, rel: 80 }); }
  }
  // 5) 서원
  const vw = v.vow;
  if (vw) {
    const kills = L(g).stats?.kills ?? 0;
    if (vw.kind === 'sword' && kills > vw.kills) { g.news.unshift({ text: '칼에 피를 묻혔다. 칼을 들지 않겠다는 서원은 거기서 끝났다.', rel: 90 }); endVow(g, 'broken'); }
    else if (vw.kind === 'chastity' && (me(g).spouseId != null || living(g).some((p) => p.bond === 'lover'))) { g.news.unshift({ text: '사랑하는 사람이 생겼다. 독신의 서원은 깨졌다. 사제가 슬픈 얼굴로 고개를 저었다.', rel: 90 }); endVow(g, 'broken'); }
    else if (vw.kind === 'pilgrim' && here(g) === 'solaris') g.news.unshift({ text: endVow(g, 'kept'), rel: 90 });
    else if (vw.until && now >= vw.until) {
      if (vw.kind === 'pilgrim') { g.news.unshift({ text: '세 해가 지나도록 성도에 가지 못했다. 순례의 서원은 이루지 못한 채 끝났다.', rel: 90 }); endVow(g, 'broken'); }
      else g.news.unshift({ text: endVow(g, 'kept'), rel: 90 });
    }
  }
  // 6) 주군이 바뀌었나
  if (lb && !sceneQueued(g, 'oath_liege_gone')) {
    const cur = lb.lordKey.startsWith('crown') ? crownKey(g) : lordKey(g);
    if (cur !== lb.lordKey && ready(g)) queueScene(g, 'oath_liege_gone', { old: lb.lord, now: lb.lordKey.startsWith('crown') ? `국왕 ${rulerName(g)}` : lordName(g) });
  }
  // 7) 부름과 시험
  if (!ready(g)) return;
  if (L(g).queue.some((x) => /^oath_/.test(x.kind)) || L(g).queue.length > 2 || now - v.sceneAt < 4) return;
  const fire = (kind, data) => { v.sceneAt = now; queueScene(g, kind, data); };
  const due = blood.filter((b) => now - (b.calledAt ?? 0) >= 14);
  if (due.length && rng.chance(0.07)) {
    const b = rng.pick(due);
    // 51단계: 혼인할 만큼 자란 자식이 없는 의형제에게 '자식 혼삿날'이 오던 일 (스물두 살 벗의 자식이 혼인)
    const bp = byId(g, b.pid);
    const grown = (bp?.childIds ?? []).some((id) => { const c = byId(g, id); return c?.alive && ageYears(c) >= 16; });
    return fire('oath_blood_call', { who: b.pid, need: rng.pick(['debt', 'fight', ...(grown ? ['wedding'] : []), 'jail', 'sick']) });
  }
  if (lb && now - (lb.calledAt ?? 0) >= 10 && rng.chance(0.08)) {
    const war = !!g.realm?.balhart?.war;
    return fire('oath_liege_call', { need: war && rng.chance(0.6) ? 'war' : rng.pick(['war', 'guard', 'tax', 'tax', 'dirty']) });
  }
  for (const b of bondsOf(g, 'man')) {
    if ((b.strain ?? 0) >= 3 || (v.brand >= 50 && rng.chance(0.05))) return fire('oath_man_turn', { who: b.pid, why: (b.strain ?? 0) >= 3 ? 'pay' : 'brand' });
  }
  if (vw && ['poverty', 'fast', 'silence', 'sword'].includes(vw.kind)) {
    const want = vw.kind === 'poverty' ? g.player.money > 50 && rng.chance(0.3) : rng.chance(0.05);
    if (want) return fire('oath_vow_test', { name: rng.pick(living(g).filter((p) => p.known && !p.isPlayer) ?? [])?.name ?? null });
  }
  // 두 집안의 약속: 혼약의 때, 돕기의 부름
  for (const x of v.pacts) {
    if (x.done) continue;
    const head = pactHouse(g, x);
    if (!head) continue;
    if (x.kind === 'marry') {
      const mine = (me(g).childIds ?? []).map((id) => byId(g, id)).filter((k) => alive(k) && k.spouseId == null && ageYears(k) >= 17 && ageYears(k) <= 32);
      const theirs = kidsOf(g, head).filter((k) => k.spouseId == null && ageYears(k) >= 17 && ageYears(k) <= 32);
      for (const a of mine) {
        const b = theirs.find((t) => t.sex !== a.sex);
        if (b && rng.chance(0.3)) return fire('oath_pact_due', { pact: x.id, mine: a.id, theirs: b.id });
      }
      if (now - x.since > 12 * 40) { x.done = true; log(g, `${x.house} 집안과의 혼약은 짝이 맞지 않아 흐지부지되었다.`); }
    } else if (now - (x.calledAt ?? 0) >= 24 && rng.chance(0.04)) {
      return fire('oath_pact_call', { pact: x.id, who: head.id, house: x.house, need: rng.pick(['fire', 'harvest', 'feud']) });
    }
  }
});

// 낙인과 지킨 이름이 사람들의 눈길을 바꾼다
addAffinity((g) => {
  const v = g.oath;
  if (!v) return 0;
  return (v.honor ?? 0) / 40 - (v.brand ?? 0) / 25;
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const v = O(g);
  const lifeR = L(g).ancestors?.[L(g).ancestors.length - 1];
  const by = lifeR?.name ?? old?.name ?? '선대';
  // 죽은 사람의 의형제는 두 집안의 약속으로 남는다
  for (const b of v.bonds) {
    if (b.kind !== 'blood') continue;
    const p = byId(g, b.pid);
    if (!alive(p) || p.id === g.player.id || (g.player.familyIds ?? []).includes(p.id)) continue;
    if (!v.pacts.some((x) => !x.done && x.house === p.lastName)) v.pacts.push({ id: v.seq++, house: p.lastName, pid: p.id, kind: 'aid', since: mi(g), gen: (L(g).gen ?? 2) - 1, from: by, done: false, calledAt: mi(g), owed: 1 });
    like(p, 10);
  }
  const lb = liegeBond(g);
  v.bonds = [];
  // 서원은 그 사람과 함께 끝난다
  if (v.vow) { v.vows.push({ kind: v.vow.kind, y: g.date.year, how: 'kept' }); v.vow = null; }
  // 약속 가운데 나 자신이 된 사람이나 식구와의 약속은 거둔다
  for (const x of v.pacts) if (!x.done && (x.pid === g.player.id || (g.player.familyIds ?? []).includes(x.pid))) x.done = true;
  v.brand = Math.round(v.brand * 0.4);
  v.honor = Math.round(v.honor * 0.5);
  v.sceneAt = 0;
  v.log.push({ y: g.date.year, m: g.date.month, text: v.brand >= 15 ? '부모가 어긴 맹세의 그림자가 내게도 드리운다.' : '부모의 맹세와 약속들이 이제 내 몫이다.' });
  if (lb && playerAge(g) >= 16) queueScene(g, 'oath_liege_offer', { renew: true });
});
HOOKS.newGame.push((g) => { O(g); });
HOOKS.migrate.push((g) => { O(g); });
