// 9단계: 자식 기르기.
// 부모가 되면 자식마다 기질과 재능이 있고, 일곱 살 무렵 가르칠 길(서당·내 일·검·마법·집안일)을 고른다.
// 사춘기에는 반항하고, 형제끼리 다투고, 다 크면 집을 떠난다. 아이를 거둘 수도, 의절할 수도 있다.
// 늙으면 유언을 남기고, 대를 이을 때 유언과 형제 사이에 따라 유산 다툼이 난다.
// 기른 만큼 자식은 자라 있다: 대를 이으면 배운 길과 재능이 새 삶의 능력이 된다.
// 상태는 game.kin 하나 (자식 id마다 기록). 화면 연결점: kinInfo(g), PATHS, TEMPERS, GIFTS
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { makePerson, byId, ageYears, has } from '../npc.js';
import { JOBS, ADULT_JOB_CHOICES } from '../data.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, tired, stress, up, gains, check } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { giftFromBlood } from '../heredity/core.js';
import { TEMPERS, GIFTS, PATHS, CRAFT_SKILLS, SKILL_JOB, SKILL_NAME, WILLS, LEAVE_PLACES } from './data.js';

export { TEMPERS, GIFTS, PATHS, WILLS };
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ORPHANAGES = ['ern', 'harfen', 'verden', 'leocast'];

/* ---------- 상태 ---------- */
export function kinState(g) {
  g.kin ??= {};
  const k = g.kin;
  k.kids ??= {};        // 자식 id → 기록
  k.will ??= null;      // { mode, heirId, at }
  k.sceneAt ??= 0;
  k.adopted ??= 0;      // 이 삶에서 거둔 아이 수
  k.timeAt ??= 0;
  return k;
}
const K = kinState;
const rec = (g, id) => K(g).kids[id] ?? null;
function newRec(rng, p, { adopted = false } = {}) {
  const age = ageYears(p);
  const tempers = Object.keys(TEMPERS);
  let temper = rng.pick(tempers);
  if (has(p, 'timid') || has(p, 'reserved')) temper = rng.chance(0.5) ? 'quiet' : temper;
  if (has(p, 'brave')) temper = rng.chance(0.5) ? 'bold' : temper;
  const giftKeys = Object.keys(GIFTS).filter((x) => x !== 'magic');
  // 핏줄이 있으면 그 핏줄에서 (src/heredity/, 27단계), 없으면 예전처럼
  const gift = giftFromBlood(p.blood, rng) ?? (rng.chance(0.12) ? 'magic' : rng.pick(giftKeys));
  return {
    temper, gift, giftKnown: age >= 8,
    path: age >= 13 ? 'free' : null, craft: null,
    bond: adopted ? 25 : 50,   // 부모와의 정 (0~100)
    learned: age >= 13 ? 10 : 0, // 길에서 배운 정도 (0~100)
    rebelled: 0, left: null, disowned: false, adopted, grudge: {}, jobSet: age >= 15, born: p.ageMonths,
  };
}
// 내 자식 (의절한 자식은 빠진다)
export function myKids(g) {
  return (me(g).childIds ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive && !p.isPlayer);
}
const disownedKids = (g) => Object.entries(K(g).kids).filter(([, r]) => r.disowned && r.parent === g.player.id).map(([id]) => byId(g, Number(id))).filter((p) => p && p.alive);
const homeKids = (g) => myKids(g).filter((p) => !rec(g, p.id)?.left);
const youngKids = (g) => homeKids(g).filter((p) => ageYears(p) < 18);
const kidWord = (p) => (p.sex === 'm' ? '아들' : '딸');
const parentReady = (g) => playerAge(g) >= 17 && !traveling(g) && !isJailed(g) && !g.over;

function register(g, rng) {
  const k = K(g);
  for (const p of myKids(g)) {
    if (k.kids[p.id]) { k.kids[p.id].parent ??= g.player.id; continue; }
    k.kids[p.id] = { ...newRec(rng, p, { adopted: !!p.adopted }), parent: g.player.id };
  }
}

/* ---------- 부모와 자식의 정, 배움 ---------- */
function addBond(g, p, n) { const r = rec(g, p.id); if (!r) return 0; r.bond = clamp(r.bond + n, 0, 100); return n; }
function pathSkill(g, r) {
  if (r.path === 'craft') return r.craft ?? 'farming';
  if (r.path === 'free') return r.gift === 'magic' ? 'magic' : ({ str: 'sword', agi: 'sword', int: 'letters', cha: 'trade', sen: 'herbs', wil: 'farming' })[r.gift] ?? 'farming';
  return PATHS[r.path]?.skill ?? null;
}
const giftFits = (r) => (GIFTS[r.gift]?.paths ?? []).includes(r.path) || (r.path === 'free');
function learn(g, p, base) {
  const r = rec(g, p.id);
  if (!r || !r.path) return 0;
  let n = base * (giftFits(r) ? 1.4 : 1) * (r.bond >= 70 ? 1.15 : r.bond < 25 ? 0.7 : 1);
  if (r.path === 'magic' && r.gift !== 'magic') n *= 0.45; // 마력이 없으면 책만 읽는다
  r.learned = clamp(r.learned + n, 0, 100);
  return n;
}
function topCraft(g) {
  const s = g.player.skills;
  return CRAFT_SKILLS.slice().sort((a, b) => (s[b] ?? 0) - (s[a] ?? 0))[0];
}

/* ---------- 상태 읽기 (화면용) ---------- */
export function kinInfo(g) {
  const k = K(g);
  const meP = me(g);
  const list = [...myKids(g), ...disownedKids(g)];
  const dead = (meP.childIds ?? []).map((id) => byId(g, id)).filter((p) => p && !p.alive);
  const kids = list.map((p) => {
    const r = rec(g, p.id) ?? {};
    const age = ageYears(p);
    const status = r.disowned ? 'disowned' : r.left ? 'left' : age >= 15 ? 'grown' : 'home';
    return {
      id: p.id, name: p.name, sex: p.sex, age, word: kidWord(p),
      temper: r.temper ?? null, temperName: TEMPERS[r.temper]?.name ?? null,
      gift: r.giftKnown ? r.gift : null, giftName: r.giftKnown ? GIFTS[r.gift]?.name ?? null : null,
      path: r.path ?? null, pathName: r.path ? (r.path === 'craft' ? `${SKILL_NAME[r.craft] ?? '집안 일'} 배우기` : PATHS[r.path].name) : null,
      bond: Math.round(r.bond ?? 50), learned: Math.round(r.learned ?? 0),
      status, statusName: { home: '집에서 자람', grown: '다 자람', left: `${LEAVE_PLACES[r.left] ?? '먼 곳'}에 나가 삶`, disowned: '의절함' }[status],
      place: r.left ?? null, adopted: !!r.adopted, job: p.job && p.job !== 'child' ? JOBS[p.job]?.name ?? null : null,
      married: !!p.spouseId, kids: (p.childIds ?? []).length,
      heir: k.will?.mode === 'chosen' ? k.will.heirId === p.id : false,
    };
  });
  const order = myKids(g).slice().sort((a, b) => b.ageMonths - a.ageMonths);
  const will = k.will ? { mode: k.will.mode, label: WILLS[k.will.mode], heirId: k.will.heirId ?? null, heirName: byId(g, k.will.heirId)?.name ?? null } : null;
  const heirReady = will?.mode === 'chosen' && byId(g, will.heirId)?.alive ? will.heirId : order[0]?.id ?? null;
  return { kids, dead: dead.map((p) => ({ id: p.id, name: p.name, cause: p.deathCause ?? null })), will, heirReady, canAdopt: !adoptBlock(g), adopted: k.adopted };
}

/* ---------- 행동: 자식 돌보기 ---------- */
const TIME_LINES = {
  baby: ['밤새 칭얼대는 아이를 안고 마당을 돌았다. 새벽닭이 울 무렵에야 잠들었다.', '처음으로 나를 보고 웃었다. 이유는 모르겠다. 하루 종일 그 얼굴이 떠올랐다.', '이가 나는지 손에 잡히는 건 다 물었다. 내 손가락도.'],
  child: ['손을 잡고 장에 갔다. 사 달라는 것은 많았고 주머니는 가벼웠다.', '냇가에서 돌을 던져 물수제비를 떴다. 아이가 세 번, 내가 다섯 번. 다음엔 져 주기로 했다.', '잠들기 전에 옛날이야기를 해 주었다. 용사가 마신을 봉인하는 대목에서 아이는 잠들었다.', '넘어져 무릎이 까진 아이에게 약초를 찧어 발라 주었다. 울지 않으려고 입술을 깨물고 있었다.'],
  teen: ['저녁을 먹으며 이야기를 했다. 대답은 짧았지만 자리를 뜨지는 않았다.', '함께 장작을 팼다. 말없이 도끼질만 했는데, 끝날 무렵 아이가 먼저 고맙다고 했다.', '아이가 좋아한다는 사람 이야기를 꺼냈다. 모르는 척 들어 주었다.'],
  grown: ['다 큰 자식과 술잔을 나눴다. 언제 이렇게 컸는지, 내 흰머리를 보고 자식이 먼저 말했다.', '자식의 집에 들렀다. 손님처럼 대접받는 것이 어색했다.', '자식이 일 이야기를 늘어놓았다. 반은 못 알아들었지만 끝까지 들었다.'],
};
ACTIONS.push({
  id: 'kin_time', name: '자식 돌보기', icon: 'heart',
  desc: '자식과 시간을 보낸다. 정이 깊어지고, 가르치는 길을 함께 익힌다. 내가 잘하는 것이면 직접 가르친다.',
  available: (g) => parentReady(g) && myKids(g).length > 0,
  run(g, rng) {
    const k = K(g);
    register(g, rng);
    const pool = myKids(g).filter((p) => !rec(g, p.id)?.left);
    if (!pool.length) return '자식들은 모두 먼 곳에 있다. 편지를 썼다가 부치지 못하고 서랍에 넣었다.';
    // 가장 손이 덜 간 아이부터
    const p = pool.slice().sort((a, b) => (rec(g, a.id).bond + (ageYears(a) < 15 ? 0 : 15)) - (rec(g, b.id).bond + (ageYears(b) < 15 ? 0 : 15)))[0];
    const r = rec(g, p.id);
    const age = ageYears(p);
    tired(g, 6); stress(g, -4);
    const b = addBond(g, p, rng.float(4, 8) + (r.adopted ? 1 : 0));
    let extra = '';
    let l = 0;
    if (age >= 4 && age < 18 && r.path) {
      const sk = pathSkill(g, r);
      const mine = g.player.skills[sk] ?? 0;
      l = learn(g, p, 1 + mine / 25);
      if (mine >= 30) extra = ` ${J(SKILL_NAME[sk] ?? '일', '을/를')} 직접 가르쳤다. 내가 배울 때 몰랐던 것을 아이가 물었다.`;
    }
    if (!r.giftKnown && age >= 4 && rng.chance(0.35)) { r.giftKnown = true; extra += ` ${GIFTS[r.gift].sign} ${J(p.name, '은/는')} ${J(GIFTS[r.gift].name, '을/를')} 타고났다.`; }
    k.timeAt = mi(g);
    const set = age < 4 ? TIME_LINES.baby : age < 12 ? TIME_LINES.child : age < 18 ? TIME_LINES.teen : TIME_LINES.grown;
    return `${kidWord(p)} ${p.name}(${age}살). ${rng.pick(set)}${extra}${gains([up('정', b), up('배움', l)])}`;
  },
});

/* ---------- 행동: 아이 거두기 ---------- */
function adoptBlock(g) {
  if (playerAge(g) < 20) return '아이를 거두기엔 아직 어리다.';
  if (K(g).adopted >= 3) return '더는 거둘 여력이 없다.';
  if (myKids(g).length >= 8) return '집에 아이가 넘친다.';
  if (!ORPHANAGES.includes(L(g).place)) return '이곳에는 아이를 맡은 예배당이 없다.';
  return null;
}
ACTIONS.push({
  id: 'kin_adopt', name: '아이 거두기', icon: 'home', place: ORPHANAGES,
  desc: '예배당에 맡겨진 아이를 데려와 내 자식으로 기른다. 피는 안 섞였어도 대를 이을 수 있다.',
  available: (g) => parentReady(g) && !adoptBlock(g) && !sceneQueued(g, 'kin_adopt'),
  run(g, rng) {
    const why = adoptBlock(g);
    if (why) return why;
    tired(g, 4);
    const cands = [];
    const stories = ['돌림병에 부모를 잃었다.', '예배당 문 앞 바구니에 놓여 있었다.', '아버지가 모험을 나갔다가 돌아오지 않았다.', '불탄 마을에서 혼자 살아 나왔다.', '빚쟁이에게 쫓기던 어미가 맡기고 사라졌다.', '광산 사고로 집안 어른이 모두 죽었다.'];
    for (let i = 0; i < 3; i++) {
      const sex = rng.chance(0.5) ? 'm' : 'f';
      cands.push({ sex, age: rng.int(1, 11), temper: rng.pick(Object.keys(TEMPERS)), story: rng.pick(stories), seed: rng.int(1, 1e9) });
    }
    queueScene(g, 'kin_adopt', { cands });
    return '예배당 뒤뜰에서 아이들이 빨래를 개고 있었다. 사제가 아이들의 이름을 하나씩 불러 주었다.';
  },
});
defineScene('kin_adopt', {
  title: () => '아이를 거두다',
  text: (g, s) => `예배당 사제가 아이 셋을 보여 주었다. ${s.cands.map((c) => `${c.age}살 ${c.sex === 'm' ? '사내아이' : '계집아이'}는 ${TEMPERS[c.temper].name} 아이로, ${c.story}`).join(' ')} 누구를 데려갈까.`,
  choices: (g, s) => (adoptBlock(g) ? [] : [
    ...s.cands.map((c, i) => ({ label: `${c.age}살 ${c.sex === 'm' ? '사내아이' : '계집아이'} (${TEMPERS[c.temper].name})`, key: String(i) })),
    { label: '오늘은 그냥 돌아간다', key: 'no' },
  ]),
  resolve(g, rng, s, key) {
    if (key === 'no') return '아이들의 눈을 뒤로하고 나왔다. 문을 닫는 손이 무거웠다.';
    const c = s.cands[Number(key)];
    if (!c) return '아이를 데려가지 못했다.';
    const meP = me(g);
    const sp = byId(g, meP.spouseId);
    const father = meP.sex === 'm' ? meP : sp?.sex === 'm' ? sp : null;
    const mother = meP.sex === 'f' ? meP : sp?.sex === 'f' ? sp : null;
    const p = makePerson(rng, { sex: c.sex, ageMonths: c.age * 12 + rng.int(0, 11), lastName: g.player.lastName, fatherId: father?.id ?? null, motherId: mother?.id ?? null });
    p.known = true; p.affection = 30; p.adopted = true;
    p.history.push({ y: g.date.year, m: g.date.month, text: `${c.story} ${g.player.name}의 집에 거두어졌다.` });
    g.people.push(p);
    meP.childIds.push(p.id);
    if (sp && sp.alive) sp.childIds.push(p.id);
    if (!g.player.familyIds.includes(p.id)) g.player.familyIds.push(p.id);
    const k = K(g);
    k.kids[p.id] = { ...newRec(rng, p, { adopted: true }), temper: c.temper, parent: g.player.id, adoptedAt: mi(g) };
    k.adopted += 1;
    note(g, `${J(p.name, '을/를')} ${kidWord(p)}로 거두었다.`);
    chron(g, `${g.player.name}, 예배당에서 ${J(p.name, '을/를')} 거두어 ${kidWord(p)}로 삼다.`, 60);
    stress(g, -8);
    return `${J(p.name, '은/는')} 보따리 하나를 안고 따라나섰다. 집에 와서도 한동안 문 가까이에서만 잤다. 언제든 다시 나가야 할 것처럼.`;
  },
});

/* ---------- 행동: 유언 남기기 ---------- */
ACTIONS.push({
  id: 'kin_will', name: '유언 남기기', icon: 'scroll',
  desc: '누가 집안을 잇고 재산을 어떻게 나눌지 정해 둔다. 정해 두지 않으면 자식들끼리 다툴 수 있다.',
  available: (g) => parentReady(g) && playerAge(g) >= 35 && myKids(g).length >= 2 && !sceneQueued(g, 'kin_will'),
  run(g) {
    tired(g, 3);
    queueScene(g, 'kin_will', {});
    return '사제를 증인으로 불러 양피지를 펼쳤다. 펜을 쥔 손이 생각보다 오래 멈춰 있었다.';
  },
});
defineScene('kin_will', {
  title: () => '유언',
  text: (g) => {
    const kids = myKids(g).sort((a, b) => b.ageMonths - a.ageMonths);
    const w = K(g).will;
    const cur = w ? ` 지금 유언은 "${WILLS[w.mode]}${w.heirId && w.mode !== 'equal' ? `: ${byId(g, w.heirId)?.name ?? ''}` : ''}"이다.` : '';
    return `자식은 ${kids.length}명. ${kids.map((p) => `${kidWord(p)} ${p.name}(${ageYears(p)}살)`).join(', ')}.${cur} 집과 재산, 집안의 이름을 누구에게 남길까.`;
  },
  choices: (g) => {
    const kids = myKids(g).sort((a, b) => b.ageMonths - a.ageMonths);
    if (kids.length < 2) return [];
    return [
      { label: `맏이 ${kids[0].name}에게 몰아준다`, key: 'eldest' },
      { label: '자식들에게 똑같이 나눈다', key: 'equal' },
      ...kids.slice(1, 4).map((p) => ({ label: `${p.name}에게 잇게 한다`, key: `chosen:${p.id}` })),
      { label: '아직 정하지 않는다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const k = K(g);
    const kids = myKids(g).sort((a, b) => b.ageMonths - a.ageMonths);
    if (key === 'none') { k.will = null; return '양피지를 다시 말아 두었다. 아직은 아니다.'; }
    if (key === 'eldest') {
      k.will = { mode: 'eldest', heirId: kids[0].id, at: mi(g) };
      for (const p of kids.slice(1)) { addBond(g, p, -4); const r = rec(g, p.id); if (r) r.grudge[kids[0].id] = (r.grudge[kids[0].id] ?? 0) + 10; }
      note(g, `유언을 남겼다: 맏이 ${kids[0].name}에게 집안을 맡긴다.`);
      return `${kids[0].name}에게 모든 것을 남긴다고 적었다. 옛 법이 그렇다. 동생들은 아무 말도 하지 않았다. 그게 더 마음에 걸렸다.`;
    }
    if (key === 'equal') {
      k.will = { mode: 'equal', heirId: kids[0].id, at: mi(g) };
      for (const p of kids) addBond(g, p, 2);
      note(g, '유언을 남겼다: 재산은 자식들에게 똑같이 나눈다.');
      return '모두에게 똑같이 나눈다고 적었다. 집안은 작아지겠지만, 자식들이 서로 칼을 들 일은 없을 것이다. 아마도.';
    }
    const id = Number(key.split(':')[1]);
    const p = byId(g, id);
    if (!p || !p.alive) return '그 자식은 이제 없다.';
    k.will = { mode: 'chosen', heirId: id, at: mi(g) };
    addBond(g, p, 8);
    for (const o of kids) if (o.id !== id) { addBond(g, o, -6); const r = rec(g, o.id); if (r) r.grudge[id] = (r.grudge[id] ?? 0) + 18; }
    note(g, `유언을 남겼다: ${J(p.name, '이/가')} 집안을 잇는다.`);
    return `맏이를 두고 ${J(p.name, '을/를')} 골랐다. 이유는 적지 않았다. ${kids[0].id !== id ? `${J(kids[0].name, '은/는')} 그날 저녁 밥상에 오지 않았다.` : ''}`.trim();
  },
});

/* ---------- 매달: 자라는 아이들 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const k = K(g);
  register(g, rng);
  const kids = myKids(g);
  if (!kids.length && !disownedKids(g).length) return;
  for (const p of kids) {
    const r = rec(g, p.id);
    const age = ageYears(p);
    // 아이는 길을 따라 조금씩 배운다. 서당과 마법은 돈이 든다.
    if (r.path && age >= 5 && age < 18 && !r.left) {
      const fee = PATHS[r.path].fee;
      let paid = true;
      if (fee) {
        if (g.player.familyMoney >= fee) g.player.familyMoney -= fee;
        else if (g.player.money >= fee) g.player.money -= fee;
        else paid = false;
      }
      if (paid) learn(g, p, 0.55);
    }
    if (!r.giftKnown && age >= 9) r.giftKnown = true;
    // 오래 떨어져 있으면 정이 식는다 (어린아이일수록)
    if (age < 16 && mi(g) - k.timeAt > 6) r.bond = clamp(r.bond - 0.25, 0, 100);
    // 열다섯: 배운 길에 맞는 일을 잡는다
    if (age >= 15 && !r.jobSet) {
      r.jobSet = true;
      const sk = pathSkill(g, r);
      let job = r.path === 'craft' ? SKILL_JOB[r.craft] : r.path && r.path !== 'free' ? rng.pick(PATHS[r.path].jobs) : sk ? SKILL_JOB[sk] : null;
      if (r.learned < 15 || !JOBS[job]) job = JOBS[p.job] && p.job !== 'child' ? p.job : rng.pick(ADULT_JOB_CHOICES);
      p.job = job;
      p.skill = clamp(Math.max(p.skill ?? 0, r.learned * 0.45 + rng.int(0, 6)), 0, 60);
      p.history.push({ y: g.date.year, m: g.date.month, text: `배운 것을 살려 ${JOBS[job]?.name ?? '일'} 일을 시작했다.` });
    }
  }
  // 어린 자식은 내가 집을 두고 사는 고장에서 같이 산다 (이사·피난 뒤에도 옛 고장에 남던 것)
  if (!traveling(g) && !isJailed(g) && ['own', 'rent', 'family'].includes(L(g).home)) {
    for (const p of homeKids(g)) if (ageYears(p) < 16 && !p.away && (p.place ?? 'ern') !== (L(g).place ?? 'ern')) p.place = L(g).place ?? 'ern';
  }
  // 집 떠난 자식은 떠난 고장에 산다 (48단계 도우미2: 떠났는데 집에 있는 사람처럼 다른 장면에 나오던 것)
  for (const p of kids) { const r = rec(g, p.id); if (r?.left && LEAVE_PLACES[r.left] && (p.place ?? 'ern') !== r.left) p.place = r.left; }
  // 집 떠난 자식이 돈을 부친다
  for (const p of kids) {
    const r = rec(g, p.id);
    if (r.left && r.bond >= 60 && rng.chance(0.03)) {
      const n = rng.int(3, 10);
      g.player.familyMoney += n;
      g.news.unshift({ text: `${LEAVE_PLACES[r.left] ?? '먼 곳'}에 있는 ${kidWord(p)} ${J(p.name, '이/가')} 편지와 은화 ${n}닢을 부쳐 왔다.`, rel: 100 });
    }
  }
  if (!parentReady(g) || L(g).queue.length || mi(g) - k.sceneAt < 4) return;
  const fire = (kind, data) => { k.sceneAt = mi(g); queueScene(g, kind, data); };
  // 가르칠 길을 정할 때
  const chooser = kids.find((p) => !rec(g, p.id).path && ageYears(p) >= 6 && ageYears(p) < 13 && !rec(g, p.id).left);
  if (chooser) return fire('kin_path', { id: chooser.id });
  // 사춘기 반항
  for (const p of kids) {
    const r = rec(g, p.id), age = ageYears(p);
    if (age < 13 || age > 17 || r.left || r.rebelled >= 2) continue;
    const ch = 0.05 * TEMPERS[r.temper].rebel * (r.bond < 40 ? 1.6 : r.bond > 75 ? 0.6 : 1);
    if (rng.chance(ch)) { r.rebelled += 1; return fire('kin_rebel', { id: p.id, kind2: rng.int(0, 3) }); }
  }
  // 형제 다툼
  // 같은 아이가 자식 목록에 두 번 들어간 옛 저장도 있다: 사람별로 한 번만
  const big = [...new Map(homeKids(g).filter((p) => ageYears(p) >= 10).map((p) => [p.id, p])).values()];
  if (big.length >= 2 && rng.chance(0.025 * Math.max(...big.map((p) => TEMPERS[rec(g, p.id).temper].quarrel)))) {
    const a = rng.pick(big);
    const b = rng.pick(big.filter((x) => x.id !== a.id));
    return fire('kin_quarrel', { a: a.id, b: b.id, why: rng.int(0, 3) });
  }
  // 다 큰 자식이 집을 떠나겠다고 한다
  for (const p of kids) {
    const r = rec(g, p.id), age = ageYears(p);
    if (age < 16 || age > 24 || r.left || p.spouseId) continue;
    const pull = 0.03 * TEMPERS[r.temper].leave * (r.path === 'sword' || r.path === 'school' || r.path === 'magic' ? 1.5 : 0.8);
    if (rng.chance(pull)) return fire('kin_leave', { id: p.id });
  }
  // 떠난 자식이 돌아온다 / 의절한 자식이 찾아온다
  const away = kids.filter((p) => rec(g, p.id).left);
  if (away.length && rng.chance(playerAge(g) >= 55 ? 0.03 : 0.006)) return fire('kin_return', { id: rng.pick(away).id, why: 'home' });
  const lost = disownedKids(g);
  if (lost.length && rng.chance(0.008)) return fire('kin_return', { id: rng.pick(lost).id, why: 'disowned' });
  // 늙었는데 유언이 없다
  if (playerAge(g) >= 55 && !k.will && kids.filter((p) => ageYears(p) >= 15).length >= 2 && rng.chance(0.02)) fire('kin_will', {});
});

/* ---------- 가르칠 길 ---------- */
// 거두어 온 아이의 기질은 이 집에 온 뒤의 모습으로 말한다
const ADOPT_LINE = {
  gentle: '시키지 않아도 그릇을 먼저 치웠다. 아직도 무엇을 해도 되는지 먼저 묻는다.',
  stubborn: '처음 온 날부터 제 자리를 정해 두고 아무에게도 내주지 않았다.',
  bold: '온 지 사흘 만에 지붕에 올라가 마을을 내려다보았다.',
  bright: '이 집 사람들의 버릇을 누구보다 빨리 익혔다.',
  dreamy: '밤이면 창가에 앉아 예전에 살던 쪽 하늘을 보았다.',
  quiet: '배가 고프다는 말을 아직도 먼저 하지 않는다.',
};
defineScene('kin_path', {
  title: (g, s) => `${byId(g, s.id)?.name ?? '아이'}에게 무엇을 가르칠까`,
  text: (g, s) => {
    const p = byId(g, s.id);
    const r = rec(g, s.id);
    const gift = r.giftKnown ? ` ${GIFTS[r.gift].sign} ${r.gift === 'magic' ? `${J(GIFTS[r.gift].name, '이/가')} 있다.` : `${J(GIFTS[r.gift].name, '을/를')} 타고난 듯하다.`}` : '';
    // 거두어 온 아이에게 갓난아기 때 이야기를 하지 않는다 (48단계 도우미2)
    const came = r.adopted && (r.born ?? 0) >= 24;
    const line = came ? `${r.adoptedAt != null ? `거두어 온 지 ${Math.max(1, Math.floor((mi(g) - r.adoptedAt) / 12))}해. ` : '거두어 온 아이다. '}${ADOPT_LINE[r.temper] ?? ''}` : TEMPERS[r.temper].line;
    return `${kidWord(p)} ${J(p.name, '이/가')} ${ageYears(p)}살이 되었다. ${TEMPERS[r.temper].name} 아이다. ${line}${gift} 이제 무엇을 가르칠지 정할 때다.`;
  },
  choices: (g, s) => {
    const p = byId(g, s.id);
    const r = rec(g, s.id);
    if (!p || !p.alive || !r || r.path || !myKids(g).includes(p)) return [];
    const craft = topCraft(g);
    const out = [
      { label: '서당에 보낸다 (한 달 은화 1닢)', key: 'school' },
      { label: `내 일을 가르친다 (${SKILL_NAME[craft]})`, key: 'craft' },
      { label: '검을 쥐여 준다', key: 'sword' },
    ];
    if ((r.giftKnown && r.gift === 'magic') || (g.player.skills.magic ?? 0) >= 20) out.push({ label: '마법을 가르친다 (한 달 은화 2닢)', key: 'magic' });
    out.push({ label: '집안일과 밭일을 거들게 한다', key: 'home' });
    out.push({ label: '하고 싶은 대로 두게 한다', key: 'free' });
    return out;
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const r = rec(g, s.id);
    if (!p || !r) return '아이는 이제 없다.';
    r.path = key;
    if (key === 'craft') r.craft = topCraft(g);
    let mood = '';
    if (giftFits(r) && r.giftKnown) { addBond(g, p, 5); mood = ` ${J(p.name, '은/는')} 그날 밤 잠을 못 이루었다. 좋아서.`; }
    else if (r.temper === 'stubborn' && key !== 'free') { addBond(g, p, -6); mood = ` ${J(p.name, '은/는')} 입을 내밀고 대답하지 않았다. 고집 센 아이다.`; }
    else if (key === 'free') { addBond(g, p, 3); mood = ` ${J(p.name, '은/는')} 들판으로 뛰어나갔다. 무엇이 될지는 아무도 모른다.`; }
    note(g, `${kidWord(p)} ${p.name}에게 ${key === 'craft' ? `${SKILL_NAME[r.craft]}을 가르치기` : PATHS[key].name}로 정했다.`);
    return `${PATHS[key].line}${mood}`;
  },
});

/* ---------- 사춘기 반항 ---------- */
const REBEL = [
  (p) => `${J(p.name, '이/가')} 사흘째 밤늦게 들어왔다. 어디 있었냐고 물으니 문을 쾅 닫았다.`,
  (p) => `${J(p.name, '이/가')} 배우던 것을 그만두겠다고 했다. "그건 아버지 어머니가 하고 싶었던 거잖아요."`,
  (p) => `집안 돈궤에서 은화가 비었다. ${J(p.name, '은/는')} 눈을 피하지 않았다. 그게 더 문제였다.`,
  (p) => `${J(p.name, '이/가')} 마을 패거리와 어울려 다닌다는 말이 들려왔다. 어제는 방앗간 창문이 깨졌다.`,
];
defineScene('kin_rebel', {
  title: (g, s) => `${byId(g, s.id)?.name ?? '아이'}의 반항`,
  text: (g, s) => { const p = byId(g, s.id); return `${REBEL[s.kind2 ?? 0](p)} ${ageYears(p)}살. ${TEMPERS[rec(g, s.id).temper].name} 아이다.`; },
  choices: (g, s) => {
    const p = byId(g, s.id);
    if (!p || !p.alive || !myKids(g).includes(p)) return [];
    return [
      { label: '엄하게 꾸짖는다', key: 'strict' },
      { label: '앉혀 놓고 이야기를 들어 준다', key: 'listen' },
      { label: '하고 싶은 것을 하게 둔다', key: 'free' },
      { label: '집에서 내쫓는다', key: 'out' },
    ];
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const r = rec(g, s.id);
    if (!p || !r) return '아이는 이제 없다.';
    if (key === 'strict') {
      if (r.temper === 'stubborn' || r.bond < 30) {
        addBond(g, p, -12);
        if (ageYears(p) >= 15 && rng.chance(0.35)) { r.left = PATHS[r.path ?? 'free'].leaveTo; note(g, `${J(p.name, '이/가')} 집을 나갔다.`); return `목소리를 높였다. ${p.name}도 높였다. 다음 날 아침, 아이 방은 비어 있었다. ${LEAVE_PLACES[r.left]}로 가는 짐마차를 탔다는 말을 나중에 들었다.`; }
        return '목소리를 높였다. 아이도 높였다. 그날 이후 집 안에서 말소리가 줄었다.';
      }
      addBond(g, p, -3); learn(g, p, 2);
      return '혼을 냈다. 아이는 고개를 숙였다. 다음 날부터 해 지기 전에 들어왔다. 눈은 여전히 나를 피했지만.';
    }
    if (key === 'listen') {
      if (check(rng, g.player.stats.cha * 0.6 + r.bond * 0.4, 40)) {
        addBond(g, p, 10); stress(g, -3);
        if ((s.kind2 ?? 0) === 1 && r.giftKnown && !giftFits(r)) { r.path = GIFTS[r.gift].paths[0]; r.learned = Math.max(0, r.learned * 0.6); return `밤이 깊도록 이야기를 들었다. 아이가 정말 하고 싶은 것은 따로 있었다. 길을 바꾸기로 했다. ${PATHS[r.path].name}. 늦었지만 늦지 않았다.`; }
        return '밤이 깊도록 이야기를 들었다. 다 듣고 나니 화낼 일이 생각보다 적었다. 아이는 처음으로 내 앞에서 울었다.';
      }
      addBond(g, p, 2);
      return '이야기를 들으려 했지만 아이는 입을 열지 않았다. 그래도 내가 기다렸다는 것은 알았을 것이다.';
    }
    if (key === 'free') {
      addBond(g, p, 5); r.path = 'free'; r.learned *= 0.7;
      return '하고 싶은 대로 하라고 했다. 아이는 놀란 얼굴로 나를 보다가, 고맙다는 말 없이 나갔다. 저녁에는 들어왔다.';
    }
    return disown(g, p, '집에서 내쫓았다. 문 앞에서 아이가 한 번 돌아보았다. 문을 닫았다.');
  },
});

/* ---------- 형제 다툼 ---------- */
const QUARREL = [
  (a, b) => `${J(a.name, '과/와')} ${J(b.name, '이/가')} 마당에서 멱살을 잡았다. 누가 먼저 집안을 잇느냐는 말 끝에.`,
  (a, b) => `${J(a.name, '이/가')} ${J(b.name, '이/가')} 늘 귀여움만 받는다고 소리를 질렀다. 밥상이 엎어졌다.`,
  (a, b) => `${J(b.name, '이/가')} 혼처로 점찍은 사람을 ${J(a.name, '이/가')} 먼저 만나고 있었다.`,
  (a, b) => `${J(a.name, '이/가')} 아끼던 물건을 ${J(b.name, '이/가')} 몰래 팔아 버렸다.`,
];
defineScene('kin_quarrel', {
  title: () => '형제 다툼',
  text: (g, s) => { const a = byId(g, s.a), b = byId(g, s.b); return `${QUARREL[s.why ?? 0](a, b)} 둘 다 나를 쳐다본다.`; },
  choices: (g, s) => {
    const a = byId(g, s.a), b = byId(g, s.b);
    const kids = myKids(g);
    if (!a || !b || !kids.includes(a) || !kids.includes(b)) return [];
    return [
      { label: `${a.name} 편을 든다`, key: 'a' },
      { label: `${b.name} 편을 든다`, key: 'b' },
      { label: '둘을 앉혀 놓고 화해시킨다', key: 'peace' },
      { label: '저희끼리 풀게 둔다', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    const a = byId(g, s.a), b = byId(g, s.b);
    const ra = rec(g, s.a), rb = rec(g, s.b);
    if (!a || !b || !ra || !rb) return '다툼은 흐지부지 끝났다.';
    if (key === 'a' || key === 'b') {
      const [w, l, rl] = key === 'a' ? [a, b, rb] : [b, a, ra];
      addBond(g, w, 6); addBond(g, l, -12);
      rl.grudge[w.id] = (rl.grudge[w.id] ?? 0) + 25;
      return `${J(w.name, '이/가')} 옳다고 했다. ${J(l.name, '은/는')} 아무 말 없이 방으로 들어갔다. 형제 사이에 금이 갔다. 이런 금은 오래간다.`;
    }
    if (key === 'peace') {
      if (check(rng, g.player.stats.cha * 0.5 + g.player.stats.wil * 0.3 + (ra.bond + rb.bond) * 0.15, 40)) {
        addBond(g, a, 3); addBond(g, b, 3);
        ra.grudge[b.id] = Math.max(0, (ra.grudge[b.id] ?? 0) - 15); rb.grudge[a.id] = Math.max(0, (rb.grudge[a.id] ?? 0) - 15);
        return '둘을 마주 앉혔다. 한참을 노려보던 둘이 결국 같이 웃음을 터뜨렸다. 어릴 적 이야기가 나왔기 때문이다.';
      }
      ra.grudge[b.id] = (ra.grudge[b.id] ?? 0) + 8; rb.grudge[a.id] = (rb.grudge[a.id] ?? 0) + 8;
      return '마주 앉혔지만 둘 다 끝까지 상대를 보지 않았다. 화해는 다음으로 미뤄졌다.';
    }
    ra.grudge[b.id] = (ra.grudge[b.id] ?? 0) + (rng.chance(0.5) ? 12 : 0);
    rb.grudge[a.id] = (rb.grudge[a.id] ?? 0) + (rng.chance(0.5) ? 12 : 0);
    return '끼어들지 않았다. 며칠 뒤 둘은 아무 일 없었던 것처럼 밥을 먹었다. 정말 아무 일 없었는지는 모르겠다.';
  },
});

/* ---------- 집 떠나는 자식 ---------- */
defineScene('kin_leave', {
  title: (g, s) => `${byId(g, s.id)?.name ?? '자식'}이 떠나겠다고 한다`,
  text: (g, s) => {
    const p = byId(g, s.id);
    const r = rec(g, s.id);
    const to = LEAVE_PLACES[PATHS[r.path ?? 'free'].leaveTo];
    const why = { school: '학당에 들어가 더 배우고 싶다고', sword: '모험가 길드에 이름을 올리겠다고', magic: '마탑 문을 두드려 보겠다고', craft: '더 큰 데서 솜씨를 시험해 보겠다고', home: '남의 땅 말고 제 땅을 일구고 싶다고', free: '여기서는 숨이 막힌다고' }[r.path ?? 'free'];
    return `${ageYears(p)}살 ${kidWord(p)} ${J(p.name, '이/가')} 짐을 꾸렸다. ${to}에 가겠다고 한다. ${why}.`;
  },
  choices: (g, s) => {
    const p = byId(g, s.id);
    if (!p || !p.alive || !myKids(g).includes(p) || rec(g, s.id).left) return [];
    const out = [];
    if (g.player.money + g.player.familyMoney >= 10) out.push({ label: '노잣돈을 쥐여 보낸다 (은화 10닢)', key: 'bless' });
    out.push({ label: '잘 가라고만 한다', key: 'go' }, { label: '붙잡는다', key: 'stay' }, { label: '나가면 다시는 돌아오지 말라고 한다', key: 'curse' });
    return out;
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const r = rec(g, s.id);
    if (!p || !r) return '자식은 이제 없다.';
    const to = PATHS[r.path ?? 'free'].leaveTo;
    if (key === 'stay') {
      if (check(rng, g.player.stats.cha * 0.4 + g.player.stats.wil * 0.3 + r.bond * 0.4, 45)) { addBond(g, p, -4); return '붙잡았다. 아이는 짐을 풀었다. 고맙다는 말은 없었다. 몇 해 뒤에야 그 말을 들었다.'; }
      key = 'go'; addBond(g, p, -10);
      r.left = to;
      note(g, `${kidWord(p)} ${J(p.name, '이/가')} ${LEAVE_PLACES[to]}로 떠났다.`);
      return `붙잡았지만 소용없었다. 새벽에 문이 열리는 소리가 났다. 나가 보지 않았다.`;
    }
    if (key === 'curse') return disown(g, p, `다시는 돌아오지 말라고 했다. ${J(p.name, '은/는')} 고개를 끄덕이고 떠났다. 정말로 돌아오지 않을 얼굴이었다.`);
    r.left = to;
    if (key === 'bless') {
      let paid = 10;
      const fromFam = Math.min(g.player.familyMoney, paid); g.player.familyMoney -= fromFam; paid -= fromFam;
      g.player.money = Math.max(0, g.player.money - paid);
      addBond(g, p, 12);
    } else addBond(g, p, 4);
    // 떠난 길에서 더 배운다
    learn(g, p, 6);
    p.skill = Math.min(100, (p.skill ?? 0) + 5);
    note(g, `${kidWord(p)} ${J(p.name, '이/가')} ${LEAVE_PLACES[to]}로 떠났다.`);
    return key === 'bless'
      ? `은화 열 닢을 손에 쥐여 주었다. ${J(p.name, '은/는')} 마을 어귀에서 세 번 돌아보았다. 세 번 다 손을 흔들었다.`
      : `잘 가라고 했다. ${J(p.name, '은/는')} 고개를 꾸벅 숙이고 떠났다. 집이 갑자기 넓어졌다.`;
  },
});

/* ---------- 돌아온 자식 ---------- */
defineScene('kin_return', {
  title: (g, s) => (s.why === 'disowned' ? '문 앞에 선 자식' : '돌아온 자식'),
  text: (g, s) => {
    const p = byId(g, s.id);
    const r = rec(g, s.id);
    if (s.why === 'disowned') return `의절한 ${kidWord(p)} ${J(p.name, '이/가')} 문 앞에 서 있었다. ${ageYears(p)}살. ${p.childIds?.length ? '등 뒤에 아이 하나가 숨어 있었다. 내 손주다.' : '많이 말랐다.'} 들어오겠다는 말도, 미안하다는 말도 없이 서 있기만 했다.`;
    return `${LEAVE_PLACES[r.left] ?? '먼 곳'}에 나가 있던 ${kidWord(p)} ${J(p.name, '이/가')} 돌아왔다. ${p.job && JOBS[p.job] ? `${JOBS[p.job].name}로 살고 있다고 했다.` : ''} 얼굴이 낯설 만큼 어른이 되어 있었다.`;
  },
  choices: (g, s) => {
    const p = byId(g, s.id);
    const r = rec(g, s.id);
    if (!p || !p.alive || !r) return [];
    if (s.why === 'disowned') return r.disowned ? [{ label: '들어오라고 한다', key: 'take' }, { label: '문을 닫는다', key: 'shut' }] : [];
    return r.left && myKids(g).includes(p) ? [{ label: '집에 머물라고 한다', key: 'stay' }, { label: '하룻밤 묵고 가게 한다', key: 'visit' }] : [];
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const r = rec(g, s.id);
    if (!p || !r) return '자식은 이제 없다.';
    if (key === 'take') {
      r.disowned = false; r.bond = Math.max(r.bond, 35);
      const meP = me(g);
      if (!meP.childIds.includes(p.id)) meP.childIds.push(p.id);
      if (!g.player.familyIds.includes(p.id)) g.player.familyIds.push(p.id);
      note(g, `의절했던 ${J(p.name, '을/를')} 다시 받아들였다.`);
      chron(g, `${g.player.name}, 의절했던 ${kidWord(p)} ${J(p.name, '과/와')} 화해하다.`, 60);
      stress(g, -12);
      return '들어오라고 했다. 밥상에 숟가락 하나를 더 놓았다. 아무도 지난 일을 꺼내지 않았다. 꺼낼 필요가 없었다.';
    }
    if (key === 'shut') { stress(g, 8); return '문을 닫았다. 발소리가 멀어질 때까지 문고리를 잡고 있었다.'; }
    if (key === 'stay') { r.left = null; p.place = L(g).place ?? 'ern'; addBond(g, p, 8); return `${J(p.name, '은/는')} 짐을 풀었다. 떠날 때보다 짐이 무거웠다. 그동안 산 것들이었다.`; }
    addBond(g, p, 5);
    return '하룻밤 묵고 떠났다. 떠나며 문간에 은화 몇 닢을 놓고 갔다. 돌려줄 틈도 주지 않았다.';
  },
});

/* ---------- 의절 ---------- */
function disown(g, p, text) {
  const r = rec(g, p.id);
  const meP = me(g);
  r.disowned = true; r.bond = Math.min(r.bond, 10); r.parent = g.player.id;
  meP.childIds = meP.childIds.filter((id) => id !== p.id);
  g.player.familyIds = g.player.familyIds.filter((id) => id !== p.id);
  if (K(g).will?.heirId === p.id) K(g).will = null;
  note(g, `${kidWord(p)} ${J(p.name, '과/와')} 의절했다.`);
  chron(g, `${g.player.name}, ${kidWord(p)} ${J(p.name, '과/와')} 의절하다.`, 60);
  p.affection = Math.min(p.affection ?? 0, -20);
  stress(g, 12);
  return text;
}

/* ---------- 대 잇기: 기른 만큼 자라 있다, 그리고 유산 다툼 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const k = K(g);
  const meP = me(g);
  const r = k.kids[meP.id];
  const age = ageYears(meP);
  const p = g.player;
  let raised = '';
  if (r) {
    // 배운 길이 기술이 된다
    const sk = pathSkill(g, r);
    if (sk && r.learned > 0) p.skills[sk] = clamp(Math.max(p.skills[sk] ?? 0, r.learned * (age >= 15 ? 0.5 : 0.35)), 0, 50);
    const st = PATHS[r.path]?.stat;
    if (st) p.stats[st] = clamp((p.stats[st] ?? 0) + r.learned * 0.08, 0, 100);
    // 타고난 재능
    const gst = GIFTS[r.gift]?.stat;
    if (gst && r.gift !== 'magic') p.talents[gst] = Math.min(1.8, (p.talents[gst] ?? 1) * 1.15);
    if (r.gift === 'magic') {
      p.manaPotential = Math.max(p.manaPotential ?? 0, 0.32);
      if (age >= 10 && !p.manaAwakened) { p.manaAwakened = true; p.mana = Math.max(p.mana ?? 0, p.manaPotential * Math.min(age, 15) * 1.5); }
    }
    // 부모와의 정이 마음의 짐이 된다
    p.stress = clamp(p.stress + (r.bond >= 70 ? 10 : r.bond < 25 ? -5 : 0), 0, 100);
    if (r.bond < 25) for (const id of p.familyIds) { const s = byId(g, id); if (s && s.id === old?.spouseId) s.affection = Math.min(s.affection, 30); }
    raised = r.path ? `${PATHS[r.path].name}` : '';
    meP.away = false;
  }
  // 유산 다툼
  const will = k.will;
  const sibs = (old ? byId(g, old.id)?.childIds ?? [] : []).map((id) => byId(g, id)).filter((s) => s && s.alive && !s.isPlayer && s.id !== meP.id && ageYears(s) >= 15);
  k.will = null; k.sceneAt = 0; k.adopted = 0; k.timeAt = mi(g);
  if (r && old) r.heirOf = old.id;
  if (!sibs.length || age < 15) return;
  if (will?.mode === 'equal') {
    // 똑같이 나눈다: 몫을 떼어 준다
    const share = Math.floor((p.money + p.familyMoney) * (sibs.length / (sibs.length + 1)) * 0.6);
    const fromFam = Math.min(p.familyMoney, share); p.familyMoney -= fromFam; p.money = Math.max(0, p.money - (share - fromFam));
    for (const s of sibs) s.affection = Math.max(s.affection ?? 0, 50);
    note(g, `유언대로 재산을 형제들과 나누었다 (은화 ${share}닢을 떼어 줌).`);
    return;
  }
  // 정해진 사람이 따로 있었는데 내가 이었다 / 맏이가 아닌데 이었다 / 원한이 깊다
  const named = will && will.heirId !== meP.id ? sibs.find((s) => s.id === will.heirId) : null;
  const eldest = sibs.slice().sort((a, b) => b.ageMonths - a.ageMonths)[0];
  const sore = sibs.map((s) => [s, (rec(g, s.id)?.grudge?.[meP.id] ?? 0) + (rec(g, s.id)?.temper === 'stubborn' ? 10 : 0)]).sort((a, b) => b[1] - a[1])[0];
  let claimant = null, why = null;
  if (named) { claimant = named; why = 'will'; }
  else if (!will && eldest && eldest.ageMonths > meP.ageMonths && rng.chance(0.55)) { claimant = eldest; why = 'eldest'; }
  else if (sore && sore[1] >= 20 && rng.chance(0.6)) { claimant = sore[0]; why = 'grudge'; }
  else if (!will && sibs.length >= 2 && rng.chance(0.25)) { claimant = rng.pick(sibs); why = 'nowill'; }
  if (claimant) queueScene(g, 'kin_dispute', { claimant: claimant.id, why, parent: old.name }, { first: true });
});

defineScene('kin_dispute', {
  title: () => '유산 다툼',
  text: (g, s) => {
    const c = byId(g, s.claimant);
    const line = {
      will: `유언장에는 분명 ${c.name}의 이름이 적혀 있었다. ${J(c.name, '은/는')} 양피지를 흔들며 내가 집안을 가로챘다고 마을에 떠들고 다닌다.`,
      eldest: `맏이 ${J(c.name, '이/가')} 옛 법을 들고 나왔다. 집안은 맏이가 잇는 법이라고.`,
      grudge: `${J(c.name, '이/가')} 장례가 끝나기도 전에 집안 돈궤 열쇠를 내놓으라고 했다. 오래 묵은 원한이 묻어 있었다.`,
      nowill: `${s.parent ?? '부모'}는 유언을 남기지 않았다. ${J(c.name, '이/가')} 제 몫을 내놓으라며 사람들을 데리고 왔다.`,
    }[s.why] ?? `${J(c.name, '이/가')} 유산을 두고 다툼을 걸어왔다.`;
    return line;
  },
  choices: (g, s) => {
    const c = byId(g, s.claimant);
    if (!c || !c.alive || g.over) return [];
    return [
      { label: '몫을 떼어 준다', key: 'share' },
      { label: '영주 법정에 가져간다', key: 'court' },
      { label: '버틴다, 집안의 주인은 나다', key: 'hold' },
      { label: '집안을 넘겨주고 내 길을 간다', key: 'yield' },
    ];
  },
  resolve(g, rng, s, key) {
    const c = byId(g, s.claimant);
    const p = g.player;
    if (!c) return '다툼은 흐지부지 끝났다.';
    const total = p.money + p.familyMoney;
    const take = (frac) => { const n = Math.floor(total * frac); const f = Math.min(p.familyMoney, n); p.familyMoney -= f; p.money = Math.max(0, p.money - (n - f)); return n; };
    if (key === 'share') {
      const n = take(0.4);
      c.affection = Math.max(c.affection ?? 0, 35);
      note(g, `유산 다툼 끝에 ${c.name}에게 은화 ${n}닢을 떼어 주었다.`);
      return `은화 ${n}닢을 떼어 주었다. ${J(c.name, '은/는')} 세어 보고 고개를 끄덕였다. 피를 나눈 사이가 은화 몇 닢으로 다시 이어졌다. 아니면 그런 척하는 것이거나.`;
    }
    if (key === 'court') {
      const fee = take(0.1);
      if (check(rng, p.skills.letters * 0.5 + p.stats.int * 0.4 + (s.why === 'will' ? -15 : 10), 35)) {
        c.affection = Math.min(c.affection ?? 0, -10);
        note(g, `유산 다툼을 법정에서 이겼다 (비용 은화 ${fee}닢).`);
        return `영주 법정은 내 손을 들어주었다. 비용으로 은화 ${fee}닢이 나갔다. ${J(c.name, '은/는')} 판결이 나자 침을 뱉고 법정을 나갔다.`;
      }
      const n = take(0.45);
      c.affection = Math.min(c.affection ?? 0, -25);
      note(g, `유산 다툼을 법정에서 졌다. ${c.name}에게 은화 ${n}닢이 넘어갔다.`);
      return `법정은 ${c.name}의 손을 들어주었다. 비용 ${fee}닢에, ${n}닢이 더 넘어갔다. 집안의 이름은 지켰지만 금고는 반이 비었다.`;
    }
    if (key === 'hold') {
      if (check(rng, p.stats.wil * 0.5 + p.stats.cha * 0.3 + (L(g).renown ?? 0) * 0.3, 40)) {
        c.affection = Math.min(c.affection ?? 0, -15);
        note(g, `유산을 두고 ${J(c.name, '과/와')} 맞섰다. 집안은 지켰다.`);
        return `물러서지 않았다. 마을 어른들이 내 편에 섰다. ${J(c.name, '은/는')} 짐을 싸서 떠났다. 다시 볼 일이 있을지 모르겠다.`;
      }
      c.affection = -60; c.bond = 'enemy';
      const n = take(0.2);
      note(g, `${J(c.name, '과/와')} 원수가 되었다.`);
      return `버텼다. 어느 밤 곡간에서 불이 났다. 은화 ${n}닢어치가 탔다. 범인은 찾지 못했지만, 누군지는 안다. 형제가 원수가 되었다.`;
    }
    // 넘겨준다
    const n = take(0.75);
    c.affection = Math.max(c.affection ?? 0, 60);
    note(g, `집안의 재산을 ${c.name}에게 넘기고 내 길을 가기로 했다.`);
    return `열쇠와 금고를 ${c.name}에게 넘겼다. 은화 ${n}닢이 함께 갔다. 이름만 남았다. 이상하게 어깨가 가벼웠다.`;
  },
});

/* ---------- 저장과 시작 ---------- */
HOOKS.newGame.push((g) => { K(g); });
HOOKS.migrate.push((g) => { K(g); });
