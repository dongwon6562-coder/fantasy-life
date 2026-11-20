// 22단계: 가문의 내력과 가풍.
// 집안은 사람보다 오래 산다. 대를 거치며 버릇이 굳고, 자랑과 수치가 쌓이고, 누군가는 그걸 지키고 누군가는 거스른다.
// - 가훈(motto)과 문장(crest): 가장이 정한다(lineage_motto, lineage_crest). 가훈을 따르면 집안 사람들이 기뻐하고, 어기면 수군거린다.
// - 대대로 내려오는 기술(craft)과 버릇(habits): 대를 이을 때 선대가 가장 잘하던 기술이 가업이 되고, 같은 기술을 이으면 깊어진다.
//   선대가 고장에서 받던 평(정직·자비·씀씀이·의리·용기)이 버릇으로 굳는다. 이은 사람은 처음부터 조금 그 버릇을 닮는다.
// - 집안의 자랑(pride)과 수치(shame): 대를 이을 때 선대의 삶에서 쌓인다(이름값, 악명, 관직, 노예였던 일, 들통난 비밀, 큰 죄).
// - 족보 꾸미기와 거짓 조상(lineage_forge): 족보쟁이에게 돈을 주고 이름난 조상을 지어 붙인다. 궁정 문턱과 이름값이 오르지만, 들통나면(lineage_exposed) 수치가 된다.
// - 가풍을 거스르는 자식(lineage_blacksheep): 가업이나 가훈을 버리겠다는 자식. 허락·말리기·의절(kin).
// - 본가와 분가(branches): 대를 이을 때 다른 고장에 나가 사는 형제자매가 분가가 된다. 자식에게 분가를 내줄 수도 있다(lineage_branch).
//   분가는 저 혼자 살림이 피거나 기울고, 도움을 청하거나 선물을 보내거나, 가장이 어리면 본가 자리를 넘본다(lineage_claim).
// - 집안 제사와 모임(lineage_rite, lineage_gathering): 해마다 조상을 모신다. 여러 해 거르면 수치가 된다. 가을 모임에서는 친척들이 빚, 혼담, 옛이야기를 꺼낸다.
// 매달 굴림은 따로 난수(ownRng)를 써서 다른 갈래의 난수를 밀지 않는다. 조사는 J()로.
// 잇는 곳: heir(대 잇기), kin(자식·의절), repute(평·deed), elder(회고록), secret(들통난 비밀), bondage(노예였던 일), court(관직·궁정 문턱), crime.
// 상태는 game.lineage 하나. 화면 연결점: lineageInfo(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat } from '../game.js';
import { SKILLS } from '../data.js';
import { byId, ageYears } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, spend, canSpend, check, traveling } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { remember } from '../relations.js';
import { isJailed } from '../crime.js';
import { deed, opinionAt } from '../repute/index.js';
import { kinState } from '../kin/index.js';
import { courtState } from '../court/index.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const alive = (p) => !!p && p.alive && !p.isPlayer;
const jo = (w, pair) => J(w, pair).slice(w.length);
const skillName = (id) => SKILLS.find((s) => s.id === id)?.name ?? '집안일';
const ready = (g) => playerAge(g) >= 18 && !traveling(g) && !isJailed(g) && !g.over && !L(g).heirPending && !g.bondage?.slave;
// 이 갈래만의 난수: 매달 굴림이 많아 다른 갈래 점검을 흔들지 않게 따로 굴린다
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 71) ^ Math.imul(mi(g) * 53 + salt + 37, 2654435761)) | 0 });

/* ---------- 가훈과 문장 ---------- */
export const MOTTOS = {
  honest: { text: '말은 한 번, 약속은 끝까지', axis: 'honest' },
  kind: { text: '굶는 이웃 옆에서 배부르지 마라', axis: 'kind' },
  generous: { text: '쥔 손보다 편 손이 오래간다', axis: 'generous' },
  loyal: { text: '등 돌린 자의 이름은 족보에 없다', axis: 'loyal' },
  brave: { text: '물러서는 발은 집안에 없다', axis: 'brave' },
  gain: { text: '남는 장사가 집안을 지킨다', axis: null },
};
const CREST_SIGNS = ['밀 이삭', '늑대 머리', '망치와 모루', '저울', '부러진 검', '여덟 갈래 별', '까마귀', '떡갈나무', '등불', '닻'];
const CREST_COLORS = ['붉은 바탕', '푸른 바탕', '검은 바탕', '흰 바탕', '초록 바탕', '금빛 바탕'];
// 버릇: 선대의 평이 굳은 것
export const HABITS = {
  honest: { good: '말이 곧다', bad: '말을 꾸민다', stat: 'wil' },
  kind: { good: '정이 많다', bad: '모질다', stat: 'cha' },
  generous: { good: '손이 크다', bad: '셈이 밝다', stat: 'cha' },
  loyal: { good: '한번 맺으면 끝까지 간다', bad: '줄을 잘 바꾼다', stat: 'wil' },
  brave: { good: '겁이 없다', bad: '몸을 사린다', stat: 'str' },
};
const FAKE_ANCESTORS = [
  { key: 'hero', who: '용사의 방패를 들던 종자', y: '용사력 원년' },
  { key: 'royal', who: '옛 레오니아 왕가의 방계', y: '건국 무렵' },
  { key: 'tower', who: '마탑 초대 탑주의 셋째 제자', y: '용사력 120년' },
  { key: 'saint', who: '성광교 첫 순례의 성자', y: '용사력 60년' },
];

/* ---------- 상태 ---------- */
export function lineageState(g) {
  g.lineage ??= {};
  const v = g.lineage;
  v.gens ??= 1;
  v.motto ??= null;     // { key, text, by, y, gen }
  v.crest ??= null;     // { sign, color, by, y }
  v.craft ??= null;     // { skill, depth, gens }
  v.habits ??= {};      // 결 → { good: bool, gens }
  v.pride ??= [];       // [{ text, y, by }]
  v.shame ??= [];       // [{ text, y, by }]
  v.fake ??= null;      // { key, who, y, at, exposed, risk }
  v.branches ??= [];    // [{ id, name, pid, place, y, standing, ties, by }]
  v.bseq ??= 1;
  v.riteY ??= null;     // 마지막으로 제사를 지낸 해
  v.rites ??= 0;
  v.blackSheep ??= 0;
  v.mottoSnap ??= null; // 지난달 가훈 결의 평
  v.mottoKept ??= 0; v.mottoBroken ??= 0;
  v.sceneAt ??= 0;
  v.gatherY ??= null;
  v.log ??= [];
  return v;
}
const V = lineageState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
const houseName = (g) => `${g.player.lastName ?? me(g).lastName ?? ''} 집안`.trim();
const addPride = (g, text, by = g.player.name) => { const v = V(g); if (v.pride.some((x) => x.text === text)) return; v.pride.push({ text, y: g.date.year, by }); if (v.pride.length > 12) v.pride.shift(); };
const addShame = (g, text, by = g.player.name) => { const v = V(g); if (v.shame.some((x) => x.text === text)) return; v.shame.push({ text, y: g.date.year, by }); if (v.shame.length > 12) v.shame.shift(); };
const standingWord = (s) => (s >= 70 ? '본가보다 살림이 크다' : s >= 45 ? '제 앞가림을 한다' : s >= 20 ? '살림이 빠듯하다' : '기울었다');
const homeKin = (g) => (g.player.familyIds ?? []).map((id) => byId(g, id)).filter((p) => alive(p) && !p.away && (p.place ?? 'ern') === here(g));
const missedRites = (g) => { const v = V(g); return v.riteY == null ? 0 : g.date.year - v.riteY; };

/* ---------- 화면용 ---------- */
export function lineageInfo(g) {
  const v = V(g);
  return {
    name: houseName(g), gens: v.gens, ancestors: (L(g).ancestors ?? []).length,
    motto: v.motto ? { text: v.motto.text, by: v.motto.by, y: v.motto.y, kept: v.mottoKept, broken: v.mottoBroken } : null,
    crest: v.crest ? { text: `${v.crest.color}에 ${v.crest.sign}`, by: v.crest.by } : null,
    craft: v.craft ? { skillName: skillName(v.craft.skill), depth: v.craft.depth, gens: v.craft.gens } : null,
    habits: Object.entries(v.habits).map(([axis, h]) => ({ axis, name: h.good ? HABITS[axis].good : HABITS[axis].bad, good: h.good, gens: h.gens })),
    pride: v.pride.map((x) => ({ ...x })), shame: v.shame.map((x) => ({ ...x })),
    fake: v.fake ? { who: v.fake.who, exposed: !!v.fake.exposed } : null,
    branches: v.branches.map((b) => { const p = byId(g, b.pid); return { name: b.name, placeName: placeName(b.place), head: p?.alive ? p.name : '빈자리', standing: Math.round(b.standing), word: standingWord(b.standing), ties: Math.round(b.ties) }; }),
    rites: { last: v.riteY, missed: missedRites(g), count: v.rites },
    blackSheep: v.blackSheep,
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 가훈 정하기 ---------- */
ACTIONS.push({
  id: 'lineage_motto', name: '가훈을 정한다', icon: 'scroll',
  desc: '집안이 대대로 지킬 말을 정해 대들보에 새긴다. 대가 바뀌면 새 가장이 고쳐 쓸 수 있다.',
  available: (g) => ready(g) && playerAge(g) >= 20 && (!V(g).motto || V(g).motto.gen < V(g).gens) && !sceneQueued(g, 'lineage_motto'),
  run(g) { queueScene(g, 'lineage_motto', {}); return '먹을 갈고 대들보 아래 앉았다.'; },
});
defineScene('lineage_motto', {
  title: () => '가훈',
  text: (g) => { const v = V(g); return v.motto ? `대들보에 선대가 새긴 글이 있다. "${v.motto.text}". ${v.motto.by}의 글씨다. 이제 이 집의 가장은 나다. 그대로 둘 것인가, 깎아 내고 새로 새길 것인가.` : `${houseName(g)}에는 아직 대대로 지킬 말이 없다. 아이들이 커서 "우리 집은 어떤 집이냐"고 물으면 대답할 말이 필요하다.`; },
  choices: (g) => {
    if (!ready(g)) return [];
    const v = V(g);
    const out = Object.entries(MOTTOS).filter(([k]) => k !== v.motto?.key).map(([k, m]) => ({ label: `"${m.text}"`, key: k }));
    if (v.motto) out.unshift({ label: '선대의 글을 그대로 둔다', key: 'keep' });
    return out.slice(0, 7);
  },
  resolve(g, rng, s, key) {
    const v = V(g);
    if (key === 'keep') { v.motto.gen = v.gens; for (const p of homeKin(g)) p.affection = clamp((p.affection ?? 0) + 3, -100, 100); return `대들보를 손으로 쓸었다. "${v.motto.text}". 그대로 두기로 했다. 지키는 것도 고르는 일이다.`; }
    const m = MOTTOS[key];
    if (!m) return '';
    const old = v.motto;
    v.motto = { key, text: m.text, by: g.player.name, y: g.date.year, gen: v.gens };
    v.mottoSnap = null;
    note(g, `가훈을 "${m.text}"로 ${old ? '고쳐 ' : ''}새겼다.`);
    chron(g, `${g.player.name}, ${houseName(g)}의 가훈을 "${m.text}"${old ? '로 고쳐 새기다' : '로 정하다'}.`, 60);
    log(g, `가훈: "${m.text}"`);
    if (old) { const elders = homeKin(g).filter((p) => ageYears(p) >= 50); for (const p of elders) p.affection = clamp((p.affection ?? 0) - 6, -100, 100); return `선대의 글을 대패로 깎아 냈다. 나뭇결 밑에서 더 오래된 글씨 자국이 비쳤다. 그 위에 새로 새겼다. "${m.text}".${elders.length ? ' 집안 어른들은 한동안 그 대들보 밑을 지나지 않았다.' : ''}`; }
    return `대들보에 "${m.text}"라고 새겼다. 아이들이 손가락으로 글자를 따라 그었다. 언젠가 이 글이 이 아이들을 붙잡아 줄 것이다. 아니면 옭아맬 것이다.`;
  },
});
ACTIONS.push({
  id: 'lineage_crest', name: '집안 문장을 만든다', icon: 'shield',
  desc: '대문과 그릇과 칼자루에 새길 집안의 표식을 정한다. 은화 열 닢.',
  available: (g) => ready(g) && playerAge(g) >= 20 && !V(g).crest && canSpend(g, 10) && !sceneQueued(g, 'lineage_crest'),
  run(g, rng) { queueScene(g, 'lineage_crest', { signs: [...CREST_SIGNS].sort(() => rng.next() - 0.5).slice(0, 4), color: rng.pick(CREST_COLORS) }); return '문장쟁이를 불렀다.'; },
});
defineScene('lineage_crest', {
  title: () => '문장',
  text: (g, s) => `문장쟁이가 판 위에 밑그림 넷을 늘어놓았다. ${s.signs.join(', ')}. "${J(s.color, '이/가')} 이 댁에 어울립니다. 그림은 댁의 내력을 말해야 하지요."`,
  choices: (g, s) => (ready(g) && !V(g).crest && canSpend(g, 10) ? [...s.signs.map((x, i) => ({ label: `${J(x, '을/를')} 고른다`, key: `sign:${i}` })), { label: '그만둔다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    if (key === 'no') return '밑그림을 돌려보냈다. 표식 없는 대문도 대문이다.';
    if (!spend(g, 10)) return '값이 모자랐다.';
    const sign = s.signs[Number(key.split(':')[1])] ?? s.signs[0];
    V(g).crest = { sign, color: s.color, by: g.player.name, y: g.date.year };
    chron(g, `${houseName(g)}, ${s.color}에 ${sign} 문장을 걸다.`, 50);
    log(g, `문장: ${s.color}에 ${sign}`);
    L(g).renown = (L(g).renown ?? 0) + 1;
    return `대문 위에 ${s.color}에 ${J(sign, '이/가')} 그려진 판을 걸었다. 지나가던 이웃이 한참 올려다보다 웃었다. 비웃음인지 부러움인지는 몇 대 뒤에 알게 될 것이다.`;
  },
});

/* ---------- 족보 꾸미기 ---------- */
ACTIONS.push({
  id: 'lineage_forge', name: '족보를 꾸민다', icon: 'book',
  desc: '족보쟁이에게 돈을 주고 이름난 조상을 지어 붙인다. 은화 마흔 닢. 궁정 문턱과 이름값이 오르지만, 들통나면 집안의 수치가 된다.',
  available: (g) => ready(g) && !V(g).fake && mi(g) - (V(g).forgeNo ?? -99) >= 24 && ['leocast', 'harfen', 'solaris', 'barka', 'portel', 'eisen'].includes(here(g)) && canSpend(g, 40) && !sceneQueued(g, 'lineage_forge'),
  run(g, rng) { queueScene(g, 'lineage_forge', { opts: [...FAKE_ANCESTORS].sort(() => rng.next() - 0.5).slice(0, 3).map((x) => x.key) }); return '골목 끝 족보쟁이의 집을 찾았다.'; },
});
defineScene('lineage_forge', {
  title: () => '족보쟁이',
  text: (g) => `족보쟁이는 누렇게 바랜 종이 뭉치를 펼쳤다. 먹은 새것인데 종이는 오백 년 묵은 것처럼 보인다. "${houseName(g)}이라. 뿌리가 얕군요. 깊게 해 드리지요. 어느 분을 할아버지로 모시겠습니까?"`,
  choices: (g, s) => (ready(g) && !V(g).fake && canSpend(g, 40) ? [...s.opts.map((k) => { const f = FAKE_ANCESTORS.find((x) => x.key === k); return { label: `${f.who}의 후손이 된다`, key: k }; }), { label: '그만둔다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    if (key === 'no') { V(g).forgeNo = mi(g); return '종이 뭉치를 덮고 나왔다. 얕은 뿌리라도 내 뿌리다.'; }
    const f = FAKE_ANCESTORS.find((x) => x.key === key);
    if (!f || !spend(g, 40)) return '값이 모자랐다.';
    const v = V(g);
    v.fake = { key, who: f.who, y: f.y, at: mi(g), exposed: false, risk: 5 };
    const c = courtState(g); c.standing = (c.standing ?? 0) + 5;
    L(g).renown = (L(g).renown ?? 0) + 4;
    deed(g, 'honest', -1, null);
    log(g, `족보에 ${f.who}${jo(f.who, '을/를')} 조상으로 올렸다.`);
    return `석 달 뒤 족보가 왔다. 맨 앞 장에 ${f.y}, ${f.who}. 그 아래로 처음 보는 이름들이 줄줄이 이어지다가 내 증조할아버지에게 닿는다. 장터에서 누가 "그 댁이 그런 집안이었다며"라고 했다. 아니라고 하지 않았다.`;
  },
});
defineScene('lineage_exposed', {
  title: () => '가짜 족보',
  text: (g) => `${V(g).fake?.who ?? '조상'}의 후손이라던 ${houseName(g)}의 족보가 가짜라는 말이 돌았다. 족보쟁이가 경비대에 잡혀 그동안 꾸며 준 집안들을 줄줄이 불었다고 한다.`,
  choices: (g) => (V(g).fake && !V(g).fake.exposed && ready(g) ? [{ label: '족보를 불태우고 털어놓는다', key: 'admit' }, { label: '끝까지 진짜라고 우긴다', key: 'deny' }, canSpend(g, 30) ? { label: '은화로 소문을 덮는다', key: 'pay' } : null].filter(Boolean) : []),
  resolve(g, rng, s, key) {
    const v = V(g), f = v.fake;
    if (!f || f.exposed) return '소문은 금방 다른 집 이야기로 넘어갔다.';
    if (key === 'pay') { if (!spend(g, 30)) return '덮을 돈이 없었다.'; f.risk = 0; return '은화가 몇 군데 흘러가자 소문이 잦아들었다. 족보는 그대로 장롱 속에 있다. 누군가 또 캐내기 전까지는.'; }
    if (key === 'deny' && check(rng, g.player.stats.cha * 0.5 + g.player.stats.int * 0.3, 50)) { f.risk = 10; return '"그 족보쟁이가 남의 족보를 베꼈을 뿐이오." 얼굴빛 하나 안 바꾸고 말했다. 반쯤은 믿었다. 나머지 반은 그 뒤로 내 족보 이야기를 할 때 웃었다.'; }
    f.exposed = true;
    const c = courtState(g); c.standing = Math.max(0, (c.standing ?? 0) - 8);
    L(g).renown = Math.max(0, (L(g).renown ?? 0) - 4);
    addShame(g, `족보에 ${f.who}${jo(f.who, '을/를')} 지어 붙였다가 들통났다`);
    deed(g, 'honest', key === 'admit' ? -2 : -5, '족보를 꾸몄다더라');
    chron(g, `${houseName(g)}의 족보가 꾸민 것으로 드러나다.`, 50);
    return key === 'admit' ? '족보를 마당에서 태웠다. 오백 년 묵은 척하던 종이가 금방 탔다. 아이들에게는 사실대로 말했다. 우리 집은 증조할아버지부터다. 그거면 됐다.' : '우길수록 웃음거리가 되었다. 혼담이 오가던 집 하나가 말없이 발을 뺐다.';
  },
});

/* ---------- 가풍을 거스르는 자식 ---------- */
const SHEEP = {
  craft: (g, p, s) => `${J(p.name, '이/가')} 저녁상 앞에서 숟가락을 내려놓았다. "${J(s.craft, '은/는')} 아버지 대에서 끝내세요. 저는 ${J(s.want, '이/가')} 되겠어요."`.replace('아버지', me(g).sex === 'f' ? '어머니' : '아버지'),
  motto: (g, p, s) => `${J(p.name, '이/가')} 대들보를 올려다보며 웃었다. "'${s.motto}'요? 그걸로 밥이 나와요? 세상은 그렇게 안 돌아가요."`,
};
const WANTS = ['떠돌이 악사', '용병', '마탑 견습생', '뱃사람', '모험가', '상단 서기'];
defineScene('lineage_blacksheep', {
  title: () => '검은 양',
  text: (g, s) => { const p = byId(g, s.pid); return p ? SHEEP[s.why](g, p, s) : '자식 하나가 집안의 길을 거스르겠다고 한다.'; },
  choices: (g, s) => { const p = byId(g, s.pid); if (!alive(p) || !(me(g).childIds ?? []).includes(p.id) || !ready(g)) return []; return [{ label: '제 길을 가라고 한다', key: 'allow' }, { label: '집안의 길을 지키라고 타이른다', key: 'talk' }, { label: '그럴 거면 이 집 사람이 아니라고 한다', key: 'disown' }]; },
  resolve(g, rng, s, key) {
    const v = V(g), p = byId(g, s.pid);
    if (!alive(p)) return '';
    const r = kinState(g).kids[p.id];
    v.blackSheep += 1;
    if (key === 'allow') {
      if (r) r.bond = clamp((r.bond ?? 50) + 12, 0, 100);
      p.affection = clamp((p.affection ?? 0) + 10, -100, 100);
      remember(g, p, '집안의 길을 버려도 된다고 했다', 2, { tag: 'lineage' });
      log(g, `${J(p.name, '이/가')} 집안의 길을 벗어났다. 막지 않았다.`);
      return `"가라. 대신 잘 가라." ${J(p.name, '은/는')} 한참 나를 보더니 고개를 숙였다. 그날 밤 대들보 밑에 오래 앉아 있었다. 선대는 이럴 때 뭐라고 했을까.`;
    }
    if (key === 'talk') {
      if (check(rng, g.player.stats.cha * 0.5 + (r?.bond ?? 50) * 0.4, 45)) { if (r) r.bond = clamp((r.bond ?? 50) + 3, 0, 100); v.mottoKept += 1; return `밤새 이야기했다. 선대 이야기, 그 선대의 선대 이야기. 새벽에 ${J(p.name, '이/가')} 말했다. "한 해만 더 해 볼게요." 그 한 해가 얼마나 갈지는 모른다.`; }
      if (r) { r.bond = clamp((r.bond ?? 50) - 10, 0, 100); r.rebelled = (r.rebelled ?? 0) + 1; }
      p.affection = clamp((p.affection ?? 0) - 10, -100, 100);
      return `타이를수록 ${p.name}의 입이 굳게 닫혔다. 마지막에 ${J(p.name, '이/가')} 말했다. "그 집안이라는 거, 결국 아버지 고집이잖아요." 대답하지 못했다.`.replace('아버지 고집', me(g).sex === 'f' ? '어머니 고집' : '아버지 고집');
    }
    // 의절
    if (r) { r.disowned = true; r.bond = Math.min(r.bond ?? 50, 10); r.parent = g.player.id; }
    const meP = me(g);
    meP.childIds = meP.childIds.filter((id) => id !== p.id);
    g.player.familyIds = g.player.familyIds.filter((id) => id !== p.id);
    if (kinState(g).will?.heirId === p.id) kinState(g).will = null;
    p.affection = Math.min(p.affection ?? 0, -20);
    stress(g, 12);
    chron(g, `${g.player.name}, 가풍을 거스른 ${J(p.name, '과/와')} 의절하다.`, 60);
    addShame(g, `가풍을 거스른 자식 ${J(p.name, '과/와')} 의절했다`);
    return `"이 집 문턱을 다시 넘지 마라." ${J(p.name, '은/는')} 짐을 싸서 나갔다. 족보의 그 이름 위에 먹줄을 그었다. 손이 떨려 줄이 비뚤어졌다.`;
  },
});

/* ---------- 본가와 분가 ---------- */
ACTIONS.push({
  id: 'lineage_branch', name: '분가를 내준다', icon: 'house',
  desc: '다 자라 따로 사는 자식에게 은화 서른 닢과 집안 이름을 나눠 주고 분가를 세운다.',
  available: (g) => ready(g) && canSpend(g, 30) && branchable(g).length > 0,
  run(g) {
    const p = branchable(g)[0];
    if (!p || !spend(g, 30)) return '분가를 내줄 형편이 안 되었다.';
    const b = makeBranch(g, p, 50);
    p.affection = clamp((p.affection ?? 0) + 15, -100, 100);
    remember(g, p, '분가를 내주었다', 2, { tag: 'lineage' });
    return `${J(p.name, '이/가')} 사는 ${placeName(b.place)} 집 대문에 ${houseName(g)}의 이름을 나누어 걸었다. ${b.name}. 이제 그 집에도 제사상이 차려질 것이다.`;
  },
});
function branchable(g) {
  const v = V(g);
  const taken = new Set(v.branches.map((b) => b.pid));
  return (me(g).childIds ?? []).map((id) => byId(g, id)).filter((p) => alive(p) && ageYears(p) >= 20 && !taken.has(p.id) && ((p.place ?? 'ern') !== here(g) || p.spouseId != null || kinState(g).kids[p.id]?.left));
}
function makeBranch(g, p, standing) {
  const v = V(g);
  const place = p.place ?? 'ern';
  const b = { id: v.bseq++, name: `${placeName(place).split(' ').pop()} ${g.player.lastName ?? p.lastName} 분가`, pid: p.id, place, y: g.date.year, standing, ties: 60, by: g.player.name };
  v.branches.push(b);
  if (v.branches.length > 6) v.branches.shift();
  chron(g, `${houseName(g)}, ${placeName(place)}에 분가를 내다. ${J(p.name, '이/가')} 그 집의 가장이 되다.`, 50);
  log(g, `${placeName(place)}에 분가가 섰다. ${J(p.name, '이/가')} 가장이다.`);
  return b;
}
const BRANCH_EV = {
  help: (g, b, p) => `${b.name}에서 ${J(p.name, '이/가')} 직접 왔다. 흉년에 빚까지 겹쳤다고 한다. "본가에서 은화 스무 닢만 돌려주시면 가을에 갚겠습니다."`,
  gift: (g, b, p) => `${b.name}에서 수레가 왔다. 올해 살림이 피었다며 ${J(p.name, '이/가')} 곡식 자루와 은화 꾸러미를 보냈다. 편지 끝에 "본가 덕입니다"라고 적혀 있다.`,
  quarrel: (g, b, p) => `${b.name}의 ${J(p.name, '이/가')} 제사 순서를 두고 언성을 높였다. "본가가 제 몫도 안 하면서 분가한테 이래라저래라 할 겁니까."`,
};
defineScene('lineage_branch_ev', {
  title: (g, s) => V(g).branches.find((b) => b.id === s.bid)?.name ?? '분가',
  text: (g, s) => { const b = V(g).branches.find((x) => x.id === s.bid); const p = b && byId(g, b.pid); return b && p ? BRANCH_EV[s.ev](g, b, p) : '분가에서 소식이 왔다.'; },
  choices: (g, s) => {
    const b = V(g).branches.find((x) => x.id === s.bid); const p = b && byId(g, b.pid);
    if (!b || !alive(p) || !ready(g)) return [];
    if (s.ev === 'help') return [canSpend(g, 20) ? { label: '은화 스무 닢을 내준다', key: 'give' } : null, { label: '본가도 형편이 어렵다고 한다', key: 'no' }].filter(Boolean);
    if (s.ev === 'gift') return [{ label: '고맙게 받는다', key: 'take' }, { label: '반은 돌려보낸다', key: 'half' }];
    return [{ label: '본가의 체면을 세운다', key: 'firm' }, { label: '한발 물러선다', key: 'yield' }];
  },
  resolve(g, rng, s, key) {
    const b = V(g).branches.find((x) => x.id === s.bid); const p = b && byId(g, b.pid);
    if (!b || !alive(p)) return '';
    if (key === 'give') { if (!spend(g, 20)) return '줄 돈이 없었다.'; b.standing = clamp(b.standing + 12, 0, 100); b.ties = clamp(b.ties + 15, 0, 100); if (rng.chance(0.6)) b.owed = 20; return `은화를 건넸다. ${J(p.name, '은/는')} 문밖까지 세 번 돌아보며 절을 했다.`; }
    if (key === 'no') { b.ties = clamp(b.ties - 15, 0, 100); return `${J(p.name, '은/는')} 고개를 끄덕이고 돌아갔다. 그해 가을 그 집 제사상에 본가 몫의 잔은 놓이지 않았다고 한다.`; }
    if (key === 'take') { const n = 10 + Math.round(b.standing / 10); g.player.money += n; b.ties = clamp(b.ties + 5, 0, 100); return `은화 ${n}닢과 곡식 세 자루. 아이들이 수레에 매달려 좋아했다. 분가가 피면 본가도 웃는다.`; }
    if (key === 'half') { const n = 5 + Math.round(b.standing / 20); g.player.money += n; b.ties = clamp(b.ties + 12, 0, 100); return `반은 돌려보내며 "그 집 아이들 신발이나 사 주라"고 적어 보냈다. 다음 해 그 집 아이들이 새 신을 신고 인사를 왔다.`; }
    if (key === 'firm') { b.ties = clamp(b.ties - 10, 0, 100); stress(g, 4); return '본가가 정한 순서는 바뀌지 않는다고 못 박았다. 제사는 순서대로 치렀다. 술잔이 돌 때 아무도 웃지 않았다.'; }
    b.ties = clamp(b.ties + 8, 0, 100); return '"그 집 말도 일리가 있다." 한발 물러섰다. 집안 어른 하나가 혀를 찼지만, 그날 제사상은 오랜만에 시끌벅적했다.';
  },
});
// 가장이 어리면 분가가 본가 자리를 넘본다
defineScene('lineage_claim', {
  title: () => '본가 자리',
  text: (g, s) => { const b = V(g).branches.find((x) => x.id === s.bid); const p = b && byId(g, b.pid); return `${b?.name ?? '분가'}의 ${J(p?.name ?? '가장', '이/가')} 집안 어른들을 모아 놓고 말했다. "본가의 가장이 아직 어립니다. 제사와 집안 살림은 당분간 우리가 맡는 게 도리겠지요." 어른들의 눈이 나에게 모였다.`; },
  choices: (g, s) => { const b = V(g).branches.find((x) => x.id === s.bid); return b && alive(byId(g, b.pid)) && playerAge(g) >= 12 && !g.over ? [{ label: '선대의 유언과 족보를 내민다', key: 'stand' }, { label: '어른이 될 때까지 맡긴다', key: 'yield' }] : []; },
  resolve(g, rng, s, key) {
    const v = V(g), b = v.branches.find((x) => x.id === s.bid);
    if (!b) return '';
    if (key === 'stand' && check(rng, g.player.stats.cha * 0.4 + g.player.stats.wil * 0.4 + (v.motto ? 10 : 0), 35)) { b.ties = clamp(b.ties - 15, 0, 100); stress(g, 6); return '어린 목소리로 또박또박 말했다. 선대의 유언, 족보의 순서, 대들보의 가훈. 어른들이 하나둘 고개를 끄덕였다. 분가의 가장은 말없이 일어나 나갔다.'; }
    if (key === 'stand') { b.standing = clamp(b.standing + 10, 0, 100); g.player.familyMoney = Math.max(0, Math.floor((g.player.familyMoney ?? 0) * 0.8)); stress(g, 10); return '어른들은 내 말을 끝까지 듣지 않았다. 집안 살림의 열쇠가 분가로 넘어갔다. 돌려받으려면 몇 해가 걸릴 것이다.'; }
    b.ties = clamp(b.ties + 10, 0, 100); b.standing = clamp(b.standing + 5, 0, 100); g.player.familyMoney = Math.max(0, Math.floor((g.player.familyMoney ?? 0) * 0.9));
    return '고개를 숙였다. "어른이 되면 돌려받겠습니다." 분가의 가장이 내 어깨를 두드렸다. 그 손이 무거웠다.';
  },
});

/* ---------- 제사와 모임 ---------- */
ACTIONS.push({
  id: 'lineage_rite', name: '집안 제사를 지낸다', icon: 'pray',
  desc: '조상들의 이름을 부르고 상을 차린다. 해마다 한 번. 은화 다섯 닢.',
  available: (g) => ready(g) && (L(g).ancestors ?? []).length > 0 && V(g).riteY !== g.date.year && canSpend(g, 5),
  run(g) {
    const v = V(g);
    if (!spend(g, 5)) return '상을 차릴 돈이 없었다.';
    const missed = missedRites(g);
    v.riteY = g.date.year; v.rites += 1;
    stress(g, -6);
    gainStat(g, 'wil', 0.2);
    for (const p of homeKin(g)) p.affection = clamp((p.affection ?? 0) + 3, -100, 100);
    for (const b of v.branches) b.ties = clamp(b.ties + 4, 0, 100);
    const names = (L(g).ancestors ?? []).slice(-3).map((a) => a.name).reverse();
    const memo = g.elder?.memoirs?.find((m) => m.done);
    return `${names.join(', ')}. 이름을 하나씩 불렀다.${missed >= 3 ? ' 몇 해 만이다. 상 위의 위패에 먼지가 앉아 있었다.' : ''}${memo ? ` 선대가 남긴 "${memo.title}"의 한 장을 소리 내어 읽었다.` : ''} 향이 다 탈 때까지 아무도 말하지 않았다. ${v.branches.length ? '분가 사람들도 와서 절을 했다.' : '아이들이 졸다가 깨다가 했다.'}`;
  },
});
const GATHER = {
  loan: { text: (n) => `가을 모임. 술이 몇 순배 돌자 먼 친척 ${J(n, '이/가')} 다가왔다. "조카, 은화 열다섯 닢만. 집안끼리 이자는 없지?"`, cost: 15 },
  match: { text: (n) => `가을 모임. 집안 어른 ${J(n, '이/가')} 내 손을 잡았다. "옆 고장 좋은 집안에 혼기 찬 아이가 있어. 우리 집안 아이들 중에 하나 맺어 주자."`, cost: 0 },
  story: { text: (n) => `가을 모임. 집안에서 나이가 가장 많은 ${J(n, '이/가')} 화롯가에서 옛이야기를 꺼냈다. "너희 증조할아버지가 젊을 때 말이다..."`, cost: 0 },
  feud: { text: (n) => `가을 모임. 사촌들끼리 선대 땅의 경계를 두고 목소리가 높아졌다. ${J(n, '이/가')} 나를 보았다. "가장이 정리해 주시오."`, cost: 0 },
};
defineScene('lineage_gathering', {
  title: () => '집안 모임',
  text: (g, s) => GATHER[s.ev].text(s.name),
  choices: (g, s) => {
    if (!ready(g)) return [];
    if (s.ev === 'loan') return [canSpend(g, 15) ? { label: '빌려준다', key: 'yes' } : null, { label: '웃으며 술잔만 채운다', key: 'no' }].filter(Boolean);
    if (s.ev === 'match') return [{ label: '혼담을 넣어 보라고 한다', key: 'yes' }, { label: '아이들 일은 아이들이 정한다고 한다', key: 'no' }];
    if (s.ev === 'story') return [{ label: '끝까지 듣는다', key: 'yes' }, { label: '이야기를 다른 데로 돌린다', key: 'no' }];
    return [{ label: '공평하게 나눈다', key: 'yes' }, { label: '맏집 편을 든다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const v = V(g);
    stress(g, -3);
    if (s.ev === 'loan') { if (key === 'yes') { if (!spend(g, 15)) return '빌려줄 돈이 없었다.'; deed(g, 'generous', 1, null); return `은화를 건넸다. ${J(s.name, '은/는')} 내 등을 두드리며 "역시 본가"라고 했다. 그 돈이 돌아올지는 모두가 안다.`; } return `술잔만 채웠다. ${J(s.name, '은/는')} 웃으며 다른 친척에게 갔다.`; }
    if (s.ev === 'match') { if (key === 'yes') { L(g).renown = (L(g).renown ?? 0) + 1; return `${J(s.name, '이/가')} 손뼉을 쳤다. 다음 모임에서는 두 집안이 한 상에 앉을지도 모른다.`; } return `"요즘 아이들은 제가 고르지." ${J(s.name, '은/는')} 혀를 찼지만 더 말하지 않았다.`; }
    if (s.ev === 'story') {
      if (key === 'no') return `이야기를 돌렸다. ${J(s.name, '은/는')} 서운한 얼굴로 화롯불만 들쑤셨다.`;
      if (v.fake && !v.fake.exposed && rng.chance(0.4)) { v.fake.risk = clamp(v.fake.risk + 20, 0, 100); return `"...그러니까 우리 집안이 무슨 ${v.fake.who}의 후손이냐, 그런 거 없다. 다 지어낸 거야." ${J(s.name, '이/가')} 껄껄 웃었다. 아이들이 나를 쳐다보았다.`; }
      const sh = v.shame[0], pr = v.pride[0];
      gainStat(g, 'int', 0.2);
      if (sh && rng.chance(0.5)) return `${J(s.name, '은/는')} 목소리를 낮췄다. "${sh.text}. ${sh.by} 때 일이다. 그래서 우리 집안 사람은..." 아이들이 숨을 죽였다. 수치도 내력이다.`;
      if (pr) return `"${pr.text}. ${pr.by} 때 일이다." ${s.name}의 눈이 반짝였다. 아이들이 그 이야기를 몇 번이고 다시 해 달라고 졸랐다.`;
      return `${J(s.name, '은/는')} 별것 아닌 이야기를 오래 했다. 밀밭, 우물, 홍수 난 해. 아이들은 졸았고 나는 끝까지 들었다. 내력은 그런 것들로 이루어진다.`;
    }
    if (key === 'yes') { deed(g, 'honest', 1, null); for (const b of v.branches) b.ties = clamp(b.ties + 3, 0, 100); return '선대의 장부를 펴 놓고 금을 그었다. 양쪽 다 조금씩 불만이었다. 공평하다는 뜻이다.'; }
    for (const b of v.branches) b.ties = clamp(b.ties - 6, 0, 100);
    return '맏집 편을 들었다. 순서가 그렇다. 다른 사촌은 그날 밤 술도 안 마시고 돌아갔다.';
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g);
  const r = ownRng(g, 11);
  const now = mi(g);
  // 1) 가훈을 따르나 어기나: 가훈의 결로 고장 평이 오르내리면
  if (v.motto && MOTTOS[v.motto.key]?.axis) {
    const ax = MOTTOS[v.motto.key].axis;
    const cur = opinionAt(g, here(g))[ax] ?? 0;
    if (v.mottoSnap && v.mottoSnap.place === here(g)) {
      const d = cur - v.mottoSnap.v;
      if (d >= 3) { v.mottoKept += 1; for (const p of homeKin(g)) if (ageYears(p) >= 40) p.affection = clamp((p.affection ?? 0) + 1, -100, 100); }
      else if (d <= -3) { v.mottoBroken += 1; stress(g, 3); for (const p of homeKin(g)) if (ageYears(p) >= 40) p.affection = clamp((p.affection ?? 0) - 2, -100, 100); if (v.mottoBroken % 4 === 1) note(g, `대들보의 "${v.motto.text}"${jo(v.motto.text, '이/가')} 오늘따라 눈에 밟혔다.`); }
    }
    v.mottoSnap = { place: here(g), v: cur };
  }
  // 2) 분가는 저 혼자 피거나 기운다
  for (const b of v.branches) {
    const p = byId(g, b.pid);
    if (!p || !p.alive) {
      const heir = (p?.childIds ?? []).map((id) => byId(g, id)).find((c) => alive(c) && ageYears(c) >= 16);
      if (heir) { b.pid = heir.id; log(g, `${b.name}의 가장이 ${heir.name}${jo(heir.name, '으로/로')} 바뀌었다.`); } else if (!b.ended) { b.ended = true; log(g, `${b.name}의 대가 끊겼다.`); }
      continue;
    }
    b.standing = clamp(b.standing + (r.next() - 0.48) * 2, 0, 100);
    b.ties = clamp(b.ties - 0.15, 0, 100);
    if (b.owed && r.chance(0.04)) { g.player.money += b.owed; g.news.unshift({ text: `${b.name}에서 빌려 간 은화 ${b.owed}닢을 갚아 왔다.`, rel: 80 }); b.owed = 0; }
  }
  v.branches = v.branches.filter((b) => !b.ended || g.date.year - b.y < 30);
  // 3) 가짜 족보는 언젠가 들통난다
  if (v.fake && !v.fake.exposed) v.fake.risk = clamp(v.fake.risk + 0.25, 0, 100);
  // 4) 제사를 오래 거르면 수치가 된다
  if (missedRites(g) >= 5 && (L(g).ancestors ?? []).length) addShame(g, '제사를 다섯 해 넘게 거른 적이 있다');
  // 5) 장면
  if (!ready(g) && !(playerAge(g) >= 12 && v.branches.length)) return;
  if (L(g).queue.some((x) => /^lineage_/.test(x.kind)) || L(g).queue.length > 2 || now - v.sceneAt < 4 || traveling(g) || isJailed(g)) return;
  const fire = (kind, data) => { v.sceneAt = now; queueScene(g, kind, data); };
  // 가장이 어리면
  if (playerAge(g) < 18) {
    const strong = v.branches.filter((b) => alive(byId(g, b.pid)) && b.standing >= 50 && b.ties < 70 && !b.claimed);
    if (strong.length && r.chance(0.05)) { const b = strong[0]; b.claimed = true; return fire('lineage_claim', { bid: b.id }); }
    return;
  }
  if (v.fake && !v.fake.exposed && r.chance(v.fake.risk / 2500)) return fire('lineage_exposed', {});
  // 가풍을 거스르는 자식
  const kids = (me(g).childIds ?? []).map((id) => byId(g, id)).filter((p) => alive(p) && ageYears(p) >= 14 && ageYears(p) <= 26 && !p._sheep);
  if (kids.length && (v.craft || v.motto) && r.chance(0.025)) {
    const p = r.pick(kids); p._sheep = true;
    const why = v.craft && r.chance(0.6) ? 'craft' : v.motto ? 'motto' : 'craft';
    return fire('lineage_blacksheep', { pid: p.id, why, craft: skillName(v.craft?.skill), want: r.pick(WANTS), motto: v.motto?.text ?? '' });
  }
  const live = v.branches.filter((b) => alive(byId(g, b.pid)));
  if (live.length && r.chance(0.04)) { const b = r.pick(live); return fire('lineage_branch_ev', { bid: b.id, ev: b.standing < 30 ? 'help' : b.standing > 65 ? r.pick(['gift', 'quarrel']) : r.pick(['help', 'gift', 'quarrel']) }); }
  // 가을 모임 (분가가 있거나 대를 이은 집안)
  if ((live.length || v.gens >= 2) && g.date.month >= 9 && g.date.month <= 10 && v.gatherY !== g.date.year && r.chance(0.5)) {
    v.gatherY = g.date.year;
    const ev = r.pick(['loan', 'match', 'story', 'story', 'feud']);
    const kin = [...(g.player.familyIds ?? []), ...live.map((b) => b.pid)].map((id) => byId(g, id)).filter((p) => alive(p) && ageYears(p) >= 18);
    // 옛이야기는 집안에서 가장 나이 많은 사람이, 혼담은 어른이 꺼낸다
    const pool = ev === 'story' ? kin.sort((a, b) => ageYears(b) - ageYears(a)).slice(0, 1) : ev === 'match' ? kin.filter((p) => ageYears(p) >= 40) : kin;
    const name = pool.length ? r.pick(pool).name : ev === 'story' ? '집안 노인' : '먼 친척';
    return fire('lineage_gathering', { ev, name });
  }
});

/* ---------- 대 잇기: 집안의 성격이 쌓인다 ---------- */
// 다른 모듈이 평판·죄·악명을 새 대에 맞게 덜어 내기 전에 선대의 모습을 읽어야 하므로 맨 앞에서 돈다.
HOOKS.heir.unshift((g, rng, old) => {
  const v = V(g);
  const by = old?.name ?? '선대';
  v.gens += 1;
  // 1) 가업: 선대가 가장 잘하던 기술
  const sk = old?.skills ?? {};
  const top = SKILLS.map((s) => s.id).sort((a, b) => (sk[b] ?? 0) - (sk[a] ?? 0))[0];
  if (top && (sk[top] ?? 0) >= 30) {
    if (v.craft?.skill === top) { v.craft.depth = Math.min(5, v.craft.depth + 1); v.craft.gens += 1; }
    else { if (v.craft) log(g, `${skillName(v.craft.skill)}의 가업이 ${by} 대에서 ${skillName(top)}${jo(skillName(top), '으로/로')} 바뀌었다.`); v.craft = { skill: top, depth: 1, gens: 1 }; }
  } else if (v.craft) { v.craft.depth = Math.max(0, v.craft.depth - 1); if (v.craft.depth === 0) { log(g, `${skillName(v.craft.skill)}의 가업이 ${by} 대에서 끊겼다.`); v.craft = null; } }
  if (v.craft) { const s = g.player.skills; s[v.craft.skill] = Math.min(60, (s[v.craft.skill] ?? 0) + 4 * v.craft.depth); }
  // 2) 버릇: 선대가 고장에서 받던 평
  const homePl = here(g);
  const op = opinionAt(g, homePl);
  for (const [ax, h] of Object.entries(HABITS)) {
    const val = op[ax] ?? 0;
    const cur = v.habits[ax];
    if (Math.abs(val) >= 15) {
      const good = val > 0;
      if (cur && cur.good === good) cur.gens += 1; else v.habits[ax] = { good, gens: 1 };
    } else if (cur) { cur.gens -= 1; if (cur.gens <= 0) delete v.habits[ax]; }
  }
  for (const [ax, h] of Object.entries(v.habits)) { if (h.good) g.player.stats[HABITS[ax].stat] = Math.min(100, (g.player.stats[HABITS[ax].stat] ?? 0) + Math.min(3, h.gens)); }
  // 3) 자랑과 수치
  if ((L(g).renown ?? 0) * 2 >= 40) addPride(g, `${by}의 이름이 여러 고장에 났다`, by);
  if ((courtState(g).office ?? -1) >= 1) addPride(g, `${by}${jo(by, '이/가')} 궁정에서 관직을 지냈다`, by);
  if ((old?.skills?.[top] ?? 0) >= 70) addPride(g, `${by}의 ${skillName(top)} 솜씨는 따를 사람이 없었다`, by);
  if ((L(g).notoriety ?? 0) * 2 >= 40) addShame(g, `${by}의 악명이 자자했다`, by);
  if ((g.crime?.record ?? []).some((x) => x.c === 'murder')) addShame(g, `${by}의 손에 피가 묻었다`, by);
  if ((g.secret?.exposed ?? 0) > (v.secretSeen ?? 0)) { addShame(g, `${by}의 묻어 둔 일이 드러났다`, by); }
  v.secretSeen = g.secret?.exposed ?? 0;
  if ((g.bondage?.enslaved ?? 0) > (v.slaveSeen ?? 0)) addShame(g, `${by}${jo(by, '이/가')} 노예로 팔린 적이 있다`, by);
  v.slaveSeen = g.bondage?.enslaved ?? 0;
  // 4) 분가: 다른 고장에 나가 사는 형제자매
  const taken = new Set(v.branches.map((b) => b.pid));
  const sibs = (g.player.familyIds ?? []).map((id) => byId(g, id)).filter((p) => alive(p) && !taken.has(p.id) && ageYears(p) >= 18 && p.id !== me(g).spouseId
    && (p.fatherId === me(g).fatherId || p.motherId === me(g).motherId) && p.fatherId != null && ((p.place ?? 'ern') !== here(g) || p.spouseId != null));
  for (const p of sibs.slice(0, 2)) makeBranch(g, p, 40 + Math.round(ownRng(g, 13).next() * 20));
  v.mottoSnap = null; v.sceneAt = 0;
  if (v.motto) log(g, `${by}${jo(by, '이/가')} 지키던 가훈 "${v.motto.text}"${jo(v.motto.text, '이/가')} 내게 넘어왔다.`);
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
