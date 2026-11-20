// 목표 고르기, 사람 모으기, 정찰과 준비, 결행의 밤(당일 변수), 몫 나누기, 장물 처분, 몸 낮추기, 매달 셈.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check, isAdult } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { PLACES } from '../places.js';
import { crimeState, reportCrime, addNotoriety, notoriety, jail } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import {
  H, plan, atTarget, mi, clamp, here, placeName, free, stat, ownRng, isPlace, craft, sneak, travelMonths,
  KINDS, KIND_IDS, ROLES, newMate, newTarget, newPlan, roleHave, crewPow, hasHelp, readiness, endPlan, logHeist, hotWord,
} from './core.js';

const inGang = (g) => !!crimeState(g).gang;
export const canPlot = (g) => isAdult(g) && playerAge(g) >= 16 && free(g) && !g.army?.service && !g.poor?.bond && !g.troupe?.t;
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const mate = (g, id) => plan(g)?.crew.find((m) => m.id === id) ?? null;
const town = (pl) => isPlace(pl) && (PLACES[pl]?.house ?? 0) >= 280;

/* ---------- 목표 고르기 ---------- */
const canStart = (g) => canPlot(g) && !plan(g) && town(here(g)) && (craft(g) >= 15 || notoriety(g) >= 15 || inGang(g));
export function targetsFor(g) {
  const s = H(g), pl = here(g);
  if (s.offers && s.offers.at === mi(g) && s.offers.place === pl) return s.offers.list;
  const rng = ownRng(g, 7);
  const list = [];
  for (const kind of KIND_IDS) {
    const near = KINDS[kind].places.filter((p) => isPlace(p) && travelMonths(pl, p) <= 2).sort((a, b) => travelMonths(pl, a) - travelMonths(pl, b) || a.localeCompare(b));
    if (!near.length) continue;
    list.push(newTarget(g, rng, kind, near.includes(pl) && rng.chance(0.6) ? pl : rng.pick(near)));
  }
  s.offers = { at: mi(g), place: pl, list };
  return list;
}
ACTIONS.push({
  id: 'heist_plan',
  name: '큰 한탕을 꾸민다',
  icon: 'coin',
  desc: '장물아비에게 큰 먹잇감 이야기를 듣고 목표를 고른다. 상단 금고, 귀족 저택, 신전 보물고, 왕실 세금 수레. 몇 달을 들여 사람을 모으고 정찰한 뒤 하룻밤에 건다. (뒷골목 솜씨 15나 악명, 또는 조직 연줄이 있어야)',
  available: canStart,
  run(g) {
    if (!sceneQueued(g, 'heist_target')) queueScene(g, 'heist_target', {}, { first: true });
    return '장물아비의 가게 뒷방에 앉았다.';
  },
});
defineScene('heist_target', {
  need: (g) => canStart(g),
  title: () => '장물아비의 뒷방',
  text: () => '장물아비가 문을 걸어 잠그고 등잔 심지를 줄였다. "작은 건 이제 그만하지. 한 번에 팔자를 고칠 데가 몇 군데 있네. 대신 몇 달은 공을 들여야 해."',
  choices: (g) => [
    ...targetsFor(g).map((t, i) => ({ label: `${t.name}: ${t.owner}${t.place === here(g) ? '' : ` (${travelMonths(here(g), t.place)}달 길)`}`, key: `t:${i}` })),
    { label: '아직은 아니다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'no') return '장물아비가 어깨를 으쓱했다. "마음이 서면 다시 오게."';
    if (plan(g)) return '이미 꾸미는 일이 있다.';
    const t = targetsFor(g)[+key.slice(2)];
    if (!t) return '그 이야기는 이미 다른 패에게 넘어갔다.';
    const st = H(g);
    st.plan = newPlan(g, t);
    st.offers = null;
    logHeist(g, `${t.owner}의 ${J(KINDS[t.kind].name, '을/를')} 노리기로 했다.`);
    const go = t.place !== here(g);
    if (go) L(g).travel = { to: t.place, left: travelMonths(here(g), t.place), from: here(g) };
    return `${KINDS[t.kind].line} 주인은 ${t.owner}.${t.kind === 'tax' ? ' 수레는 넉 달 뒤 지나간다.' : ''}${go ? ` 짐을 꾸려 ${J(placeName(t.place), '으로/로')} 떠났다.` : ''} 장물아비가 덧붙였다. "혼자서는 못 하네. 사람부터 모으게."`;
  },
});

/* ---------- 사람 모으기 ---------- */
export function candidates(g) {
  const s = H(g), p = plan(g);
  if (s.cands && s.cands.at === mi(g) && s.cands.place === here(g)) return s.cands.list;
  const rng = ownRng(g, 11);
  const used = new Set(p.crew.map((m) => m.name));
  const book = s.crewBook.filter((b) => !b.grudge && !used.has(b.name));
  const list = [];
  // 예전에 몫을 제대로 받은 사람은 다시 온다
  if (book.length && rng.chance(0.5)) { const b = rng.pick(book); list.push({ ...newMate(g, rng, b.role, used), name: b.name, role: b.role, skill: b.skill, loyal: clamp(b.loyal + 15, 0, 100), old: true }); used.add(b.name); }
  const missing = ['lock', 'muscle', 'inside', 'lookout', 'driver', 'forger'].filter((r) => !roleHave(p, r));
  while (list.length < 3) { const m = newMate(g, rng, rng.pick(missing.length ? missing : ['muscle', 'lookout']), used); used.add(m.name); if (inGang(g)) m.fee = Math.round(m.fee * 0.7); list.push(m); }
  s.cands = { at: mi(g), place: here(g), list };
  return list;
}
const skillWord = (v) => (v >= 60 ? '솜씨 좋은' : v >= 45 ? '쓸 만한' : '어설픈');
ACTIONS.push({
  id: 'heist_crew',
  name: '한탕할 사람을 모은다',
  icon: 'mask',
  desc: '자물쇠장이, 힘쓰는 사람, 목표 안의 끄나풀, 망꾼, 마부, 위조꾼. 사람마다 선금을 받고, 욕심과 의리가 다르다.',
  available: (g) => atTarget(g) && free(g) && plan(g).crew.length < 5,
  run(g) {
    if (!sceneQueued(g, 'heist_crew')) queueScene(g, 'heist_crew', {}, { first: true });
    return '뒷골목 술집 구석 자리에 앉아 사람을 기다렸다.';
  },
});
defineScene('heist_crew', {
  need: (g) => atTarget(g) && free(g),
  title: () => '사람 모으기',
  text: (g) => {
    const p = plan(g);
    return `${p.name}. 지금 일행: ${p.crew.map((m) => `${ROLES[m.role].name} ${m.name}`).join(', ') || '아무도 없다'}. 술집 구석으로 사람들이 하나씩 와서 앉는다.`;
  },
  choices: (g) => {
    const p = plan(g);
    return [
      ...(p.crew.length < 5 ? candidates(g).filter((c) => !p.crew.some((m) => m.name === c.name)).map((c, i) => ({ label: `${skillWord(c.skill)} ${ROLES[c.role].name} ${c.name}${c.old ? ' (예전 일행)' : ''}: 선금 은화 ${c.fee}닢`, key: `c:${candidates(g).indexOf(c)}`, i })) : []),
      ...(p.crew.length ? [{ label: '가장 미덥지 않은 사람을 내보낸다', key: 'drop' }] : []),
      { label: '오늘은 그냥 돌아간다', key: 'no' },
    ].map(({ i, ...x }) => x);
  },
  resolve(g, rng, s, key) {
    const p = plan(g);
    if (!p) return '꾸미던 일은 이미 없다.';
    if (key === 'no') return '아무도 마음에 들지 않았다. 술값만 냈다.';
    if (key === 'drop') {
      const m = p.crew.slice().sort((a, b) => a.loyal - b.loyal || b.greed - a.greed)[0];
      if (!m) return '내보낼 사람이 없다.';
      p.crew.splice(p.crew.indexOf(m), 1);
      p.alarm = clamp(p.alarm + (m.loyal < 35 ? 8 : 3), 0, 100);
      return `${J(m.name, '을/를')} 불러 선금은 가지라고 했다. ${J(m.name, '은/는')} 웃으며 나갔다. 무엇을 알고 나갔는지는 모른다.`;
    }
    const c = candidates(g)[+key.slice(2)];
    if (!c || p.crew.some((m) => m.name === c.name)) return '그 사람은 이미 다른 데 붙었다.';
    if (p.crew.length >= 5) return '더는 자리가 없다.';
    if (pay(g, c.fee) < c.fee) return '선금이 모자랐다.';
    const { old, ...m } = c;
    p.crew.push(m);
    logHeist(g, `${ROLES[m.role].name} ${J(m.name, '을/를')} 들였다.`);
    return `${J(m.name, '이/가')} 선금 은화 ${c.fee}닢을 세어 품에 넣었다. "${ROLES[m.role].name} 일이라면 나한테 맡기쇼."${old ? ' 지난번 일 이야기로 잠깐 웃었다.' : ''}`;
  },
});

/* ---------- 정찰과 준비 ---------- */
export const PREPS = {
  plan: { label: '저택 도면을 산다', cost: 30 },
  tools: { label: '연장을 맞춘다', cost: 20 },
  bribe: { label: '경비 하나를 돈으로 산다', cost: 40 },
  escape: { label: '빠져나갈 길과 숨을 곳을 마련한다', cost: 15 },
  papers: { label: '가짜 통행증과 인장을 만든다', cost: 35 },
};
ACTIONS.push({
  id: 'heist_scout',
  name: '목표를 살핀다',
  icon: 'mask',
  desc: '경비 교대를 지켜보고, 하인과 술잔을 나누고, 도면과 연장과 도망길을 마련한다. 너무 자주 얼쩡대면 눈에 띈다.',
  available: (g) => atTarget(g) && free(g),
  run(g) {
    if (!sceneQueued(g, 'heist_scout')) queueScene(g, 'heist_scout', {}, { first: true });
    return `${plan(g).name} 근처를 어슬렁거렸다.`;
  },
});
defineScene('heist_scout', {
  need: (g) => atTarget(g) && free(g),
  title: (g) => plan(g).name,
  text: (g) => {
    const p = plan(g);
    return `${KINDS[p.kind].line} 아는 것은 ${p.intel >= 70 ? '손바닥 보듯 훤하다' : p.intel >= 40 ? '꽤 된다' : p.intel >= 15 ? '조금이다' : '거의 없다'}. ${p.alarm >= 40 ? '요즘 경비들이 낯선 얼굴을 유심히 본다.' : p.alarm >= 15 ? '경비 하나가 나를 두 번 쳐다봤다.' : '아직 아무도 나를 눈여겨보지 않는다.'}${p.day ? ` 수레가 지나가기까지 ${Math.max(0, p.day - mi(g))}달.` : ''}`;
  },
  choices: (g) => {
    const p = plan(g), m = g.player.money;
    return [
      { label: '밤새 경비 교대를 지켜본다', key: 'watch' },
      { label: '하인들과 술잔을 나눈다', key: 'servant' },
      ...Object.entries(PREPS).filter(([id, x]) => !p.prep[id] && (m >= x.cost || (id === 'papers' && roleHave(p, 'forger')) || (id === 'escape' && roleHave(p, 'driver')))).map(([id, x]) => ({ label: `${x.label} (${(id === 'papers' && roleHave(p, 'forger')) || (id === 'escape' && roleHave(p, 'driver')) ? '일행이 맡는다' : `은화 ${x.cost}닢`})`, key: `p:${id}` })),
      { label: '오늘은 물러난다', key: 'no' },
    ];
  },
  resolve(g, rng, s, key) {
    const p = plan(g);
    if (!p || !atTarget(g)) return '꾸미던 일은 이미 없다.';
    if (key === 'no') return '멀찍이서 한 번 보고 돌아섰다.';
    tired(g, 8);
    if (key === 'watch') {
      const ok = check(rng, sneak(g) + (roleHave(p, 'lookout') ? 12 : 0), p.guard - 5);
      { const c = crimeState(g); c.craft = Math.min(100, (c.craft ?? 0) + 0.4 * (1 - (c.craft ?? 0) / 120)); }
      if (ok) { p.intel = clamp(p.intel + rng.int(12, 20), 0, 100); return '지붕 위에 엎드려 밤을 새웠다. 종이 두 번 칠 때 교대가 있고, 그때 뒷문 쪽이 비는 것을 알았다.'; }
      p.alarm = clamp(p.alarm + 10, 0, 100); p.intel = clamp(p.intel + 4, 0, 100);
      return '기왓장 하나가 미끄러졌다. 아래에서 등불이 이쪽을 비췄다. 골목으로 뛰어내려 도망쳤다. 다음 날부터 경비가 하나 늘었다.';
    }
    if (key === 'servant') {
      if (check(rng, stat(g, 'cha') + (roleHave(p, 'inside') ? 15 : 0), 45)) { p.intel = clamp(p.intel + rng.int(10, 18), 0, 100); const pl = !p.prep.plan && rng.chance(0.3); if (pl) p.prep.plan = true; return `하인 하나가 술이 오르자 주인 흉을 보기 시작했다. 어느 방에 무엇이 있는지 저절로 흘러나왔다.${pl ? ' 냅킨에 방 배치까지 그려 주었다.' : ''}`; }
      p.alarm = clamp(p.alarm + 6, 0, 100);
      return '하인은 술만 얻어 마시고 입을 다물었다. 나가면서 내 얼굴을 한 번 더 보았다.';
    }
    const id = key.slice(2), x = PREPS[id];
    if (!x || p.prep[id]) return '이미 마련해 두었다.';
    const byCrew = (id === 'papers' && roleHave(p, 'forger')) || (id === 'escape' && roleHave(p, 'driver'));
    if (!byCrew && pay(g, x.cost) < x.cost) return '돈이 모자랐다.';
    p.prep[id] = true;
    if (id === 'bribe' && rng.chance(0.25)) p.alarm = clamp(p.alarm + 10, 0, 100);
    if (id === 'plan') p.intel = clamp(p.intel + 8, 0, 100);
    return {
      plan: '건축가 밑에서 일하던 늙은 제도공이 기름 먹인 종이 한 장을 내밀었다. 방과 복도와 벽장이 다 그려져 있다.',
      tools: '대장간 뒷문에서 쇠꼬챙이와 줄칼과 쇠지레를 받았다. 천으로 싸니 아무 소리도 나지 않는다.',
      bribe: '경비 하나가 은화 자루를 받고 고개를 돌렸다. "그날 밤 나는 뒷문에서 졸고 있을 거요." 믿어도 될지는 모르겠다.',
      escape: byCrew ? '마부가 고장 밖 헛간에 말 두 필과 마른 짚을 마련했다. 성문지기 하나도 얼굴을 익혀 두었다.' : '고장 밖 헛간을 빌리고 말 두 필을 샀다. 성문 밖 샛길을 두 번 걸어 보았다.',
      papers: byCrew ? '위조꾼이 밤새 촛불 아래서 인장을 깎았다. 진짜보다 더 진짜 같다.' : '서기 노릇을 하던 늙은이가 통행증 두 장과 상단 인장을 만들어 주었다.',
    }[id];
  },
});

/* ---------- 결행의 밤 ---------- */
export const APPROACHES = {
  quiet: { label: '밤에 조용히 들어간다' },
  loud: { label: '힘으로 밀고 들어간다' },
  inside: { label: '안사람이 문을 열어 주기로 한다', need: (p) => roleHave(p, 'inside') },
  disguise: { label: '가짜 통행증을 들고 정문으로 들어간다', need: (p) => p.prep.papers },
};
const dayOk = (g, p) => p.kind !== 'tax' || p.day === mi(g);
export const canGo = (g) => atTarget(g) && free(g) && plan(g).crew.length >= 1 && dayOk(g, plan(g));
ACTIONS.push({
  id: 'heist_go',
  name: '한탕을 결행한다',
  icon: 'coin',
  desc: '준비한 만큼 걸고 하룻밤에 끝낸다. 당일에는 늘 생각지 못한 일이 생긴다. 세금 수레는 정해진 달에만 지나간다.',
  available: canGo,
  run(g) {
    if (!sceneQueued(g, 'heist_day')) queueScene(g, 'heist_day', {}, { first: true });
    return '일행을 불러 모았다. 오늘 밤이다.';
  },
});
defineScene('heist_day', {
  need: (g) => canGo(g),
  title: (g) => `${plan(g).name}, 그날 밤`,
  text: (g) => {
    const p = plan(g), r = readiness(p);
    return `달이 구름에 가렸다. ${p.crew.map((m) => m.name).join(', ')}. 준비는 ${r >= 70 ? '빈틈이 없다' : r >= 45 ? '그럭저럭 됐다' : '솔직히 모자라다'}. 어떻게 들어갈까.`;
  },
  choices: (g) => Object.entries(APPROACHES).filter(([, a]) => !a.need || a.need(plan(g))).map(([id, a]) => ({ label: a.label, key: id })).concat([{ label: '오늘은 미룬다', key: 'wait' }]),
  resolve(g, rng, s, key) {
    const p = plan(g);
    if (!p || !canGo(g)) return '그날 밤은 오지 않았다.';
    if (key === 'wait') { p.crew.forEach((m) => { m.loyal = clamp(m.loyal - 4, 0, 100); }); return '일행을 돌려보냈다. 다들 말없이 흩어졌지만 얼굴에 짜증이 묻어 있었다.'; }
    if (!APPROACHES[key] || (APPROACHES[key].need && !APPROACHES[key].need(p))) return '그 길은 막혀 있었다.';
    const base = readiness(p) * 0.5 + crewPow(p) + ({ quiet: sneak(g) * 0.4, loud: playerPower(g) * 0.25 + (roleHave(p, 'muscle') ? 10 : 0), inside: 18 + stat(g, 'cha') * 0.1, disguise: 14 + stat(g, 'cha') * 0.2 }[key]);
    // 당일의 변수: 일행이 덜어 줄 수 있는 것과 없는 것
    const pool = ['shift', 'lock', 'witness', 'rival', 'panic', 'guard'];
    if (p.kind === 'tax') pool.push('guard', 'guard');
    if (key === 'disguise') pool.push('papers');
    const twist = rng.pick(pool);
    queueScene(g, 'heist_twist', { app: key, twist, base: Math.round(base) }, { first: true });
    tired(g, 10);
    return { quiet: '검은 옷을 입고 담을 넘었다.', loud: '쇠지레를 든 일행이 앞장섰다.', inside: '약속한 시각, 쪽문 빗장이 안에서 풀리는 소리가 났다.', disguise: '통행증을 내밀었다. 문지기가 등불을 들어 인장을 보았다.' }[key];
  },
});
const TWISTS = {
  shift: { text: '경비 교대가 바뀌었다. 비어 있어야 할 복도에 횃불이 셋.', help: 'inside', helpText: '안사람이 새 교대 순서를 귓속말로 알려 준다' },
  lock: { text: '금고 문에 처음 보는 자물쇠가 달려 있다. 새것이다.', help: 'lock', helpText: '자물쇠장이가 손을 비비며 다가간다' },
  witness: { text: '구석에서 어린 하녀가 눈을 동그랗게 뜨고 우리를 본다.', help: 'inside', helpText: '안사람이 하녀의 이름을 부르며 달랜다' },
  rival: { text: '지붕 위에 다른 그림자들이 있다. 같은 밤, 같은 목표를 노린 다른 패다.', help: 'lookout', helpText: '망꾼이 저쪽 패보다 먼저 길을 찾아 놓았다' },
  panic: { text: '일행 하나가 숨을 몰아쉬며 떨기 시작했다. 이대로면 소리를 지를 것이다.', help: null },
  guard: { text: '경비가 말보다 많다. 누군가 귀띔을 받았거나, 원래 이랬거나.', help: 'muscle', helpText: '힘쓰는 사람이 몽둥이를 고쳐 쥔다' },
  papers: { text: '문지기가 통행증을 들고 한참을 들여다본다. "이 인장, 지난달에 바뀌었는데."', help: 'forger', helpText: '위조꾼이 "새 인장도 있소" 하며 품에서 다른 종이를 꺼낸다' },
};
defineScene('heist_twist', {
  need: (g, s) => atTarget(g) && !!TWISTS[s.twist] && Number.isFinite(s.base) && plan(g).crew.length >= 1,
  title: () => '생각지 못한 일',
  text: (g, s) => TWISTS[s.twist].text,
  choices: (g, s) => {
    const p = plan(g), t = TWISTS[s.twist];
    const out = [];
    if (t.help && roleHave(p, t.help)) out.push({ label: `${ROLES[t.help].name}에게 맡긴다`, key: 'help' });
    out.push(...({
      shift: [{ label: '숨어서 교대가 끝나길 기다린다', key: 'wait' }, { label: '횃불 사이로 그냥 지나간다', key: 'push' }],
      lock: [{ label: '내 손으로 따 본다', key: 'pick' }, { label: '쇠지레로 부순다', key: 'force' }],
      witness: [{ label: '입을 막고 묶어 둔다', key: 'tie' }, { label: '은화를 쥐여 주고 조용히 하라 한다', key: 'coin' }, { label: '못 본 척 지나간다', key: 'let' }],
      rival: [{ label: '저쪽 패에게 함께하자고 한다', key: 'share' }, { label: '저쪽보다 먼저 손을 쓴다', key: 'race' }, { label: '경비대에 저쪽 패를 흘린다', key: 'tip' }],
      panic: [{ label: '어깨를 잡고 낮게 달랜다', key: 'calm' }, { label: '그 사람을 두고 나머지만 간다', key: 'leave' }, { label: '목덜미를 쳐서 재운다', key: 'knock' }],
      guard: [{ label: '덮쳐서 쓰러뜨린다', key: 'fight' }, { label: '돌아서 지붕으로 간다', key: 'around' }],
      papers: [{ label: '말로 밀어붙인다', key: 'bluff' }, { label: '문지기에게 은화를 쥐여 준다', key: 'coin' }],
    }[s.twist] ?? []));
    out.push({ label: '여기서 접고 빠져나간다', key: 'abort' });
    return out;
  },
  resolve(g, rng, s, key) {
    const p = plan(g);
    if (!p || !atTarget(g)) return '그날 밤의 일은 이미 끝났다.';
    if (key === 'abort') {
      p.alarm = clamp(p.alarm + 15, 0, 100); p.intel = clamp(p.intel - 10, 0, 100);
      p.crew.forEach((m) => { m.loyal = clamp(m.loyal - 6, 0, 100); });
      logHeist(g, `${p.name}: 그날 밤 접고 물러났다.`);
      return '손짓 하나로 일행을 물렸다. 들어온 길로 그대로 나왔다. 다음 날 목표의 경비가 두 배가 되었다. 다시 하려면 처음부터 살펴야 한다.';
    }
    let mod = 0, extra = '';
    const t = s.twist;
    if (key === 'help') { mod = 14; extra = `${TWISTS[t].helpText}.`; }
    else if (t === 'shift') { if (key === 'wait') { mod = check(rng, sneak(g), 45) ? 6 : -10; extra = mod > 0 ? '한 시진을 기다렸다. 횃불이 하나씩 멀어졌다.' : '기다리는 사이 개 한 마리가 냄새를 맡고 짖기 시작했다.'; } else { mod = -6; extra = '횃불 사이를 지나며 숨을 참았다.'; } }
    else if (t === 'lock') { if (key === 'pick') { const ok = check(rng, craft(g) + (p.prep.tools ? 15 : 0), 50); mod = ok ? 8 : -12; extra = ok ? '딸깍. 손끝에서 마지막 걸쇠가 넘어갔다.' : '꼬챙이가 부러졌다. 시간이 흘렀다.'; } else { mod = -4; p.alarm += 20; extra = '쇠지레가 문틀을 뜯어냈다. 쇳소리가 밤을 갈랐다.'; } }
    else if (t === 'witness') { if (key === 'tie') { mod = 4; deed(g, 'kind', -2, '한탕하던 도둑들이 어린 하녀를 묶어 두었다더라.'); extra = '하녀의 입에 천을 물리고 기둥에 묶었다. 아이의 눈이 끝까지 나를 따라왔다.'; } else if (key === 'coin') { const c = pay(g, 10); mod = c >= 10 && rng.chance(0.7) ? 4 : -8; extra = mod > 0 ? '은화를 쥐여 주자 하녀가 고개를 끄덕이고 방으로 들어갔다.' : '하녀는 은화를 받고 방으로 들어갔다. 그리고 창문으로 소리를 질렀다.'; } else { mod = -10; extra = '하녀는 아무 소리도 내지 않았다. 대신 뛰어갔다.'; } }
    else if (t === 'rival') { if (key === 'share') { mod = 6; s.cut = 0.7; extra = '저쪽 패 우두머리와 눈짓을 나눴다. 몫은 줄겠지만 손이 늘었다.'; } else if (key === 'race') { mod = check(rng, stat(g, 'agi') + sneak(g) * 0.3, 50) ? 6 : -12; extra = mod > 0 ? '저쪽이 창틀을 더듬는 사이 우리가 먼저 안에 있었다.' : '두 패가 한꺼번에 들이닥쳐 소란이 났다.'; } else { mod = 2; p.alarm += 10; extra = '골목의 아이를 시켜 경비대에 지붕 위 그림자를 일렀다. 저쪽 패가 붙들리는 사이 우리는 반대편으로 들어갔다.'; } }
    else if (t === 'panic') { const m = p.crew[0]; if (key === 'calm') { mod = check(rng, stat(g, 'cha'), 40) ? 4 : -10; extra = mod > 0 ? `${J(m.name, '이/가')} 내 눈을 보고 숨을 골랐다.` : `${J(m.name, '이/가')} 결국 비명을 질렀다.`; } else if (key === 'leave') { mod = -2; m.loyal = clamp(m.loyal - 30, 0, 100); extra = `${J(m.name, '을/를')} 담 밑에 두고 갔다. 그가 무슨 얼굴을 했는지 보지 않았다.`; } else { mod = 2; m.loyal = clamp(m.loyal - 15, 0, 100); extra = `${J(m.name, '이/가')} 소리 없이 쓰러졌다. 깨어나면 할 말이 많을 것이다.`; } }
    else if (t === 'guard') { if (key === 'fight') { const ok = check(rng, playerPower(g) * 0.5 + (roleHave(p, 'muscle') ? 15 : 0), 40 + (p.kind === 'tax' ? 15 : 0)); mod = ok ? 4 : -14; p.alarm += 10; extra = ok ? '경비들을 덮쳐 입을 막고 쓰러뜨렸다.' : '경비 하나가 호루라기를 불었다.'; if (!ok && rng.chance(0.4)) g.player.injuries.push({ name: '경비의 곤봉에 맞은 머리', months: 1 }); } else { mod = check(rng, stat(g, 'agi'), 45) ? 2 : -8; extra = mod > 0 ? '지붕을 타고 돌았다. 시간이 걸렸지만 들키지는 않았다.' : '기와가 무너졌다.'; } }
    else if (t === 'papers') { if (key === 'bluff') { mod = check(rng, stat(g, 'cha'), 50) ? 4 : -12; extra = mod > 0 ? '"그럼 지난달 인장 쓰는 사람을 다 잡아들이시오." 문지기가 문을 열었다.' : '문지기가 다른 경비를 불렀다.'; } else { const c = pay(g, 15); mod = c >= 15 ? 4 : -10; extra = mod > 0 ? '은화가 손에서 손으로 건너갔다.' : '쥐여 줄 은화가 모자랐다.'; } }
    return `${extra} ${finishNight(g, rng, p, s.base + mod, s.app, s.cut ?? 1)}`;
  },
});
// 결판: 목표를 손에 넣었나, 빠져나왔나
export function finishNight(g, rng, p, score, app, cut = 1) {
  const st = H(g);
  const ok = check(rng, score, p.guard + 5 + p.alarm * 0.2);
  const k = KINDS[p.kind];
  addNotoriety(g, 3);
  if (ok) {
    const share = clamp(0.6 + (score - p.guard) / 100, 0.4, 1);
    const value = Math.round(p.prize * share * cut);
    st.total += 1;
    st.loot = { value: (st.loot?.value ?? 0) + value, kind: p.kind, from: p.name, owner: p.owner, at: mi(g), hot: 100 };
    const clue = clamp(35 + p.alarm * 0.4 - (p.prep.escape ? 15 : 0) - (p.prep.papers ? 8 : 0) - (app === 'inside' ? -10 : 0), 5, 90);
    st.hunt = { by: k.hunter, pow: k.hunterPow, clue, until: mi(g) + 36, target: p.name, place: p.place, kind: p.kind };
    st.split = { value, crew: p.crew.map((m) => ({ ...m })), name: p.name };
    if (p.kind === 'temple') deed(g, 'honest', -3, '신전 보물고가 털렸다더라. 누구 짓인지 아직 모른다.');
    chron(g, `${p.place ? placeName(p.place) : ''}에서 ${p.owner}의 ${J(k.name, '이/가')} 털리다. 범인은 아직 잡히지 않았다.`, 60);
    endPlan(g, '해냈다', value);
    queueScene(g, 'heist_split', {}, { first: true });
    return `새벽이 오기 전에 자루를 메고 빠져나왔다. 헛간에 모여 풀어 보니 은화로 치면 ${value}닢 어치. 이제 이걸 어떻게 나누고, 어떻게 팔고, 누구에게서 숨기느냐가 남았다.`;
  }
  // 실패: 빠져나오나, 붙잡히나
  const away = check(rng, stat(g, 'agi') + (p.prep.escape ? 20 : 0) + (roleHave(p, 'driver') ? 12 : 0), 45 + p.alarm * 0.2);
  for (const m of p.crew) m.loyal = clamp(m.loyal - 10, 0, 100);
  if (away) {
    reportCrime(g, 'burglary', p.place);
    endPlan(g, '실패하고 빠져나왔다');
    stress(g, 10);
    return '호루라기가 사방에서 울렸다. 손에 쥔 것을 다 버리고 뛰었다. 헛간에서 숨을 고르며 세어 보니 일행은 줄어 있었다. 이 고장에서는 한동안 얼굴을 들 수 없다.';
  }
  reportCrime(g, 'burglary', p.place, { mult: 2 });
  st.caught += 1;
  endPlan(g, '붙잡혔다');
  jail(g, p.kind === 'tax' || p.kind === 'temple' ? 12 : 8);
  return '골목 끝에서 창끝이 나를 막았다. 무릎을 꿇었다. 손목에 차가운 쇠가 감겼다.';
}

/* ---------- 몫 나누기 ---------- */
export const SPLITS = {
  equal: { label: '머릿수대로 똑같이 나눈다', mine: 1 },
  role: { label: '꾸민 사람 몫으로 내가 곱절을 갖는다', mine: 2 },
  greedy: { label: '내가 절반을 갖고 나머지를 나눈다', mine: 0 },
  cross: { label: '자루를 들고 혼자 사라진다', mine: 0 },
};
defineScene('heist_split', {
  need: (g) => !!H(g).split && H(g).split.value > 0,
  title: () => '몫',
  text: (g) => {
    const sp = H(g).split;
    return `헛간 바닥에 자루를 쏟았다. 은화로 치면 ${sp.value}닢 어치. ${sp.crew.map((m) => m.name).join(', ')}의 눈이 내 손을 본다. 장물이라 바로 쓸 수 있는 돈은 아니다.`;
  },
  choices: (g) => (H(g).split.crew.length ? Object.entries(SPLITS) : [['alone', { label: '혼자 한 일이니 다 내 것이다' }]]).map(([id, x]) => ({ label: x.label, key: id })),
  resolve(g, rng, s, key) {
    const st = H(g), sp = st.split;
    if (!sp) return '몫은 이미 나눴다.';
    st.split = null;
    const n = sp.crew.length;
    let mine;
    if (key === 'cross' || key === 'alone' || !n) mine = sp.value;
    else if (key === 'greedy') mine = Math.round(sp.value / 2);
    else { const parts = n + SPLITS[key].mine; mine = Math.round(sp.value * SPLITS[key].mine / parts); }
    const each = n ? (sp.value - mine) / n : 0;
    // 장물 가운데 내 몫만 남긴다
    if (st.loot) st.loot.value = Math.max(0, st.loot.value - (sp.value - mine));
    const sour = [];
    for (const m of sp.crew) {
      const want = sp.value / (n + 1) * (0.6 + m.greed / 100);
      const happy = key !== 'cross' && each >= want;
      const after = clamp(m.loyal + (happy ? 10 : -25) + (key === 'cross' ? -60 : 0), 0, 100);
      st.crewBook = st.crewBook.filter((b) => b.name !== m.name);
      st.crewBook.unshift({ name: m.name, role: m.role, skill: m.skill, loyal: after, grudge: after < 25 });
      if (after < 25) sour.push(m.name);
    }
    if (st.crewBook.length > 10) st.crewBook.length = 10;
    if (key === 'cross') {
      st.betrayed += 1;
      deed(g, 'loyal', -10, '같이 일한 패거리를 버리고 장물을 혼자 챙겼다더라.');
      if (st.hunt) st.hunt.clue = clamp(st.hunt.clue + 20, 0, 100);
      st.grudge = { names: sour.slice(0, 3), at: mi(g) + rng.int(2, 6) };
      logHeist(g, '장물을 혼자 들고 사라졌다.');
      return `일행이 술에 취해 잠든 사이 자루를 메고 나왔다. 장물 ${mine}닢 어치가 다 내 것이다. ${sour.join(', ')}. 그 이름들이 나를 찾아다닐 것이다.`;
    }
    if (sour.length) st.grudge = { names: sour.slice(0, 2), at: mi(g) + rng.int(1, 4) };
    logHeist(g, `몫을 나눴다. 내 몫 ${mine}닢 어치.`);
    return `${key === 'equal' ? '똑같이 나눴다.' : key === 'role' ? '내가 곱절을 가졌다.' : key === 'greedy' ? '절반을 내 쪽으로 끌어당겼다.' : '다 내 것이다.'} 내 몫은 장물로 ${mine}닢 어치.${sour.length ? ` ${sour.join(', ')}의 얼굴이 굳었다.` : n ? ' 다들 제 몫을 챙겨 흩어졌다. 서로 모르는 사람이 되기로 했다.' : ''}`;
  },
});

/* ---------- 장물 처분과 몸 낮추기 ---------- */
ACTIONS.push({
  id: 'heist_fence',
  name: '장물을 처분한다',
  icon: 'coin',
  desc: '장물아비에게 훔친 것을 넘긴다. 아직 뜨거울 때 팔면 값을 후려치고, 쫓는 사람들이 냄새를 맡는다.',
  available: (g) => !!H(g).loot && H(g).loot.value > 0 && free(g) && isPlace(here(g)),
  run(g, rng) {
    const st = H(g), l = st.loot;
    const rate = (l.hot >= 60 ? 0.4 : l.hot >= 30 ? 0.6 : 0.8) + (inGang(g) ? 0.1 : 0) - (here(g) === st.hunt?.place ? 0.1 : 0);
    const got = Math.round(l.value * rate);
    g.player.money += got;
    if (st.hunt) st.hunt.clue = clamp(st.hunt.clue + (l.hot >= 60 ? 15 : l.hot >= 30 ? 6 : 1), 0, 100);
    st.loot = null;
    logHeist(g, `장물을 은화 ${got}닢에 넘겼다.`);
    return l.hot >= 60
      ? `장물아비가 물건을 보더니 혀를 찼다. "아직 김이 나는구먼." 은화 ${got}닢. 값의 반도 안 된다. 그가 누구에게 이 물건을 넘길지 모른다.`
      : `장물아비가 저울에 금붙이를 하나씩 올렸다. 은화 ${got}닢. 이제 그 물건들은 녹아서 다른 모양이 될 것이다.`;
  },
});
ACTIONS.push({
  id: 'heist_lay_low',
  name: '몸을 낮춘다',
  icon: 'home',
  desc: '쫓는 사람들이 있다. 한 달 동안 집 밖에 나가지 않고, 돈을 쓰지 않고, 아는 얼굴을 피한다.',
  available: (g) => !!H(g).hunt && free(g),
  run(g, rng) {
    const h = H(g).hunt;
    h.clue = clamp(h.clue - rng.int(10, 16), 0, 100);
    stress(g, 6);
    return rng.pick(['한 달 내내 창문 덧문을 닫고 지냈다. 발소리만 나도 숨을 죽였다.', '시골 친척 집 헛간에서 지냈다. 아무도 내 이름을 묻지 않았다.', '수염을 기르고 머리 색을 바꿨다. 거울 속 사람이 낯설었다.']) + ` 쫓는 사람들은 ${hotWord(h.clue)}.`;
  },
});

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const st = H(g), now = mi(g), rng = ownRng(g, 1), p = st.plan;
  if (st.loot) st.loot.hot = clamp(st.loot.hot - 8, 0, 100);
  // 꾸미는 일
  if (p) {
    p.idle += 1;
    for (const m of p.crew) m.loyal = clamp(m.loyal - (p.idle > 6 ? 2 : 0.5), 0, 100);
    p.alarm = clamp(p.alarm - 2, 0, 100);
    // 세금 수레는 기다려 주지 않는다
    if (p.kind === 'tax' && p.day != null && now > p.day) { p.day = now + rng.int(3, 5); p.intel = clamp(p.intel - 20, 0, 100); note(g, `세금 수레가 이미 지나갔다. 다음 수레는 ${p.day - now}달 뒤.`); }
    const gone = p.crew.filter((m) => m.loyal < 15);
    for (const m of gone) { p.crew.splice(p.crew.indexOf(m), 1); p.alarm = clamp(p.alarm + 6, 0, 100); note(g, `${J(m.name, '이/가')} 기다리다 지쳐 손을 뗐다.`); logHeist(g, `${J(m.name, '이/가')} 일행에서 빠졌다.`); }
    if (p.idle > 18 && !p.crew.length) { endPlan(g, '오래 묵다가 흐지부지되었다'); note(g, `${p.name} 이야기는 흐지부지되었다.`); }
  }
  // 뒤쫓는 사람들
  const h = st.hunt;
  if (h) {
    const far = isPlace(h.place) && isPlace(here(g)) && travelMonths(here(g), h.place) >= 3;
    h.clue = clamp(h.clue + rng.int(1, 6) + (st.loot && st.loot.hot >= 50 ? 3 : 0) - (far ? 5 : 0), 0, 100);
    if (now > h.until || h.clue <= 0) { st.hunt = null; logHeist(g, `${J(h.by, '이/가')} ${h.target} 일에서 손을 뗐다.`); note(g, `${h.target} 일로 쫓던 사람들이 손을 놓았다는 소문이 들렸다.`); }
    else if (free(g) && !sceneQueued(g, 'heist_event')) {
      if (h.clue >= 100) queueScene(g, 'heist_event', { ev: 'caught' });
      else if (h.clue >= 60 && now - st.eventAt >= 3 && rng.chance(0.5)) { st.eventAt = now; queueScene(g, 'heist_event', { ev: 'close' }); }
    }
  }
  // 몫에 앙심을 품은 일행
  if (st.grudge && now >= st.grudge.at && free(g) && !sceneQueued(g, 'heist_event')) {
    const name = st.grudge.names[0];
    st.grudge.names.shift();
    if (!st.grudge.names.length) st.grudge = null; else st.grudge.at = now + rng.int(3, 8);
    if (name) queueScene(g, 'heist_event', { ev: 'rat', who: name });
    return;
  }
  if (!p || !free(g) || !atTarget(g) || now - st.eventAt < 3 || sceneQueued(g, 'heist_event') || !rng.chance(0.3)) return;
  const pool = [];
  if (p.crew.length) pool.push('blab', 'greed');
  if (p.crew.length >= 2 && p.alarm >= 20) pool.push('informant');
  if (!pool.length) return;
  st.eventAt = now;
  const ev = rng.pick(pool);
  const m = ev === 'greed' ? p.crew.slice().sort((a, b) => b.greed - a.greed)[0] : rng.pick(p.crew);
  queueScene(g, 'heist_event', { ev, a: m?.id ?? null });
});

// 대를 이으면: 꾸미던 일은 흩어지고, 숨긴 장물은 자식이 찾는다. 쫓던 사람들은 죽은 사람을 쫓지 않는다.
HOOKS.heir.push((g) => {
  const st = H(g);
  if (st.plan) endPlan(g, '꾸미던 사람이 죽어 흩어졌다');
  st.hunt = null; st.split = null; st.grudge = null;
  if (st.loot) { st.loot.hot = 0; st.loot.inherited = true; logHeist(g, `선대가 숨겨 둔 장물 ${st.loot.value}닢 어치를 찾았다.`); }
});
export { mate };
