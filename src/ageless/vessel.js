// 27단계 불로, 금지 마법 길: 그릇 옮기기. (도우미스레드3)
// 죽은 자의 술(tower forbidden.necro)을 깊이 안 사람은 남의 몸을 그릇 삼아 옮겨 갈 수 있다. 그 몸의 주인은 밀려나 사라진다.
// 젊은 몸에 들어가면 그 나이에서 몸이 멈추지만, 그릇은 남의 것이라 서서히 삭는다(rot). 다 삭으면 새 그릇을 찾거나, 밀린 세월을 받는다.
// 그 몸의 식구가 찾아오고, 그 몸의 기억이 밤마다 스민다. 검은 탑 밖의 일이 들키면 협회 집행관과 이단심문소가 함께 쫓는다.
//   pathState(g,'vessel') = { bodies[{ id, name, y }], rot(0~1), kinMet[] }
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { me, gainSkill } from '../game.js';
import { ageYears, byId, fullName } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress } from '../adventure/core.js';
import { addNotoriety } from '../crime.js';
import { TS, mi } from '../tower/state.js';
import { registerAgelessPath, makeAgeless, loseAgeless, pathState, isAgeless, AG } from './core.js';
import { freeAge, clampN } from './seventh.js';

const VV = (g) => { const v = pathState(g, 'vessel'); v.bodies ??= []; v.rot ??= 0; v.kinMet ??= []; return v; };
const st = (g, k) => g.player.stats[k] ?? 0;
const mine = (g) => AG(g).path === 'vessel' && isAgeless(me(g));
const necro = (g) => g.tower?.forbidden?.necro ?? 0;

registerAgelessPath('vessel', {
  name: '그릇 옮기기', kind: 'forbidden', owner: '도우미스레드3',
  blurb: '남의 젊은 몸으로 옮겨 와 산다. 그 몸의 주인은 사라졌다. 그릇은 서서히 삭는다.',
});

// 옮겨 갈 만한 몸: 내 식구가 아닌 젊은 사람
function candidates(g) {
  const p = me(g), fam = new Set([...(g.player.familyIds ?? []), ...(p?.childIds ?? []), p?.spouseId].filter((x) => x != null));
  return g.people.filter((q) => q.alive && !q.away && !q.isPlayer && !fam.has(q.id) && q.agelessAt == null && ageYears(q) >= 17 && ageYears(q) <= 32).slice(0, 40);
}
// 처음이면 늙어 갈 때(마흔 넘어), 이미 그릇에 있으면 그릇이 삭을 때만
const wants = (g) => (mine(g) ? VV(g).rot >= 0.8 : !isAgeless(me(g)) && ageYears(me(g)) >= 40);
const able = (g) => freeAge(g) && !!g.player.manaAwakened && necro(g) >= 2 && wants(g) && candidates(g).length > 0;

ACTIONS.push({
  id: 'vessel_rite', name: '그릇을 고른다', icon: 'magic',
  desc: '죽은 자의 술 가장 깊은 곳. 젊은 몸 하나를 골라 그 안으로 옮겨 간다. 그 몸의 주인은 밀려난다.',
  available: (g) => able(g) && !sceneQueued(g, 'vessel_rite'),
  run(g, rng) {
    const pool = candidates(g), picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice(rng.int(0, pool.length - 1), 1)[0].id);
    queueScene(g, 'vessel_rite', { ids: picks }, { first: true });
    return '검은 탑에서 받은 뼈 바늘과 밀랍을 꺼냈다. 거리에서 젊은 얼굴들을 오래 보았다.';
  },
});
defineScene('vessel_rite', {
  title: () => '그릇 옮기기',
  text: (g) => `${mine(g) ? '지금 이 몸이 삭고 있다. 손끝이 먼저 식고, 거울 속 얼굴이 가끔 낯설다.' : '거울 속 얼굴이 늙었다.'} 밀랍으로 원을 그리고 뼈 바늘을 놓았다. 남은 것은 누구로 할지다. 그 사람에게도 식구가 있고, 내일 할 일이 있다.`,
  choices: (g, s) => {
    if (!able(g)) return [];
    const out = s.ids.map((id) => byId(g, id)).filter((q) => q?.alive && !q.isPlayer).map((q) => ({ label: `${fullName(q)} (${ageYears(q)}살)`, key: `take:${q.id}` }));
    return out.length ? [{ label: '바늘을 거둔다', key: 'leave' }, ...out] : [];
  },
  resolve(g, rng, s, key) {
    if (key === 'leave') return '바늘을 거두고 밀랍 원을 긁어 지웠다. 손이 떨렸다. 늙음 때문인지 다른 것 때문인지 모르겠다.';
    const q = byId(g, Number(key.split(':')[1]));
    if (!q?.alive || !able(g)) return '그 사람은 이미 떠났다. 원이 식었다.';
    const T = TS(g);
    T.taint = clampN((T.taint ?? 0) + 25, 0, 100);
    if (g.faith) g.faith.suspicion = clampN((g.faith.suspicion ?? 0) + 8, 0, 100);
    if (g.realm && Number.isFinite(g.realm.seal) && !g.seal?.ending) g.realm.seal = clampN(g.realm.seal - 0.5, 0, 100);
    if (!check(rng, (g.player.skills.magic ?? 0) + necro(g) * 10 + st(g, 'wil') / 3, 105)) {
      stress(g, 20); T.taint = clampN(T.taint + 10, 0, 100);
      if (rng.chance(0.3)) T.pendingExpose = true;
      return `원 안에서 ${J(q.name, '이/가')} 눈을 떴다. 밀려나지 않았다. 그 사람의 비명과 내 비명이 한 목에서 나왔다. 정신을 차렸을 때 나는 내 몸에 있었고, ${J(q.name, '은/는')} 영문도 모른 채 달아난 뒤였다.`;
    }
    moveInto(g, q);
    return `원이 닫혔다. 눈을 떴을 때 손이 젊었다. ${q.name}의 손이다. 입 안에서 낯선 이가 하나 흔들린다. 어딘가에서 ${q.name}의 식구가 저녁을 차리고 있을 것이다. 이제 그 저녁에 아무도 오지 않는다.`;
  },
});
function moveInto(g, q) {
  const v = VV(g), p = me(g), at = ageYears(q);
  // 몸의 주인은 밀려나 사라진다 (몸은 내가 쓴다)
  q.alive = false; q.deathCause = '행방불명';
  q.history.push({ y: g.date.year, m: g.date.month, text: '어느 날 밤 집을 나간 뒤 돌아오지 않았다.' });
  const sp = byId(g, q.spouseId); if (sp) { sp.history.push({ y: g.date.year, m: g.date.month, text: `배우자 ${J(q.name, '이/가')} 돌아오지 않았다.` }); sp.spouseId = null; }
  v.bodies.push({ id: q.id, name: fullName(q), y: g.date.year, kin: [q.spouseId, q.fatherId, q.motherId, ...(q.childIds ?? [])].filter((x) => x != null) });
  v.rot = 0; v.kinMet = [];
  if (mine(g)) { p.agelessAt = Math.max(16, at); AG(g).at = p.agelessAt; }
  else makeAgeless(g, 'vessel', { at, note: `${J(g.player.name, '이/가')} ${q.name}의 몸으로 옮겨 갔다. ${J(q.name, '은/는')} 행방불명으로 남았다.` });
  // 그 몸이 하던 일의 손버릇이 조금 남는다
  g.player.stats.str = Math.max(st(g, 'str'), Math.min(70, st(g, 'str') * 0.6 + 25));
  g.player.stats.agi = Math.max(st(g, 'agi'), Math.min(70, st(g, 'agi') * 0.6 + 25));
  g.player.injuries = [];
  note(g, `${q.name}의 몸으로 옮겨 갔다.`);
  chron(g, `${fullName(q)}, 어느 밤 집을 나가 돌아오지 않다.`, 60);
}

/* ---------- 그릇이 삭는다, 그 몸의 기억이 스민다 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !mine(g)) return;
  const v = VV(g);
  v.rot = clampN(v.rot + 1 / (12 * 28) * (1 + (TS(g).taint ?? 0) / 200), 0, 1);
  if (v.rot >= 1 && !sceneQueued(g, 'vessel_rot') && !sceneQueued(g, 'vessel_rite')) queueScene(g, 'vessel_rot', {});
  if (rng.chance(0.004) && !TS(g).pendingExpose) TS(g).pendingExpose = true; // 오래 쓰면 들킨다
});
defineScene('vessel_rot', {
  title: () => '삭는 그릇',
  text: (g) => { const b = VV(g).bodies.at(-1); return `${b?.name ?? '이 몸'}의 손가락이 아침마다 굳는다. 잇몸에서 피가 나고, 거울 속 눈동자가 가끔 내 말을 듣지 않는다. 그릇이 다 삭았다. 새 그릇으로 옮기지 않으면, 이 몸은 쌓인 세월을 한꺼번에 받는다.`; },
  choices: (g) => (mine(g) && VV(g).rot >= 1 ? [{ label: '조금만 더 버틴다', key: 'wait' }, { label: '그릇을 내려놓는다', key: 'let' }] : []),
  resolve(g, rng, s, key) {
    const v = VV(g);
    if (!mine(g)) return '이미 끝난 일이다.';
    if (key === 'wait') { v.rot = 0.9; stress(g, 10); injure(g, '굳어 가는 손가락', 1); return '굳은 손가락을 하나씩 펴며 버텼다. 오래가지 않는다. 새 그릇을 찾든지, 놓든지.'; }
    loseAgeless(g, '그릇이 삭아 내려놓음');
    chron(g, `${J(g.player.name, '은/는')} 하룻밤 새 백발이 되었다.`, 80);
    return '바늘을 꺼내지 않았다. 그날 밤 몸이 무거워졌다. 아침에 일어나지 못했다. 거울을 보지 않아도 알았다. 빌린 세월을 돌려준 것이다.';
  },
});
EVENTS.push({
  id: 'vessel_memory', cooldown: 18, weight: 4,
  chance: () => 0.3,
  cond: (g) => mine(g) && !g.over,
  title: '남의 꿈',
  text: (g) => { const b = VV(g).bodies.at(-1); return `꿈에 모르는 집 부엌이 나왔다. 아니, 안다. ${b?.name ?? '이 몸'}의 어머니가 쓰던 부엌이다. 깨어 보니 손이 혼자 그 집 문고리를 돌리는 시늉을 하고 있었다.`; },
  choices: [
    { label: '꿈을 밀어낸다', run: (g) => { stress(g, 4); return '찬물에 얼굴을 묻었다. 낮에는 괜찮다. 밤이 문제다.'; } },
    { label: '꿈을 따라가 본다', run: (g) => { stress(g, 8); gainSkill(g, 'farming', 1.5); VV(g).rot = clampN(VV(g).rot + 0.03, 0, 1); return '그 사람이 손에 익혔던 일을 내 손이 기억하고 있었다. 대신 깨어날 때마다 내 이름이 한 박자 늦게 떠오른다.'; } },
  ],
});
// 그 몸의 식구가 얼굴을 알아본다
const kinNear = (g) => { const v = VV(g), b = v.bodies.at(-1); if (!b) return null; return (b.kin ?? []).map((id) => byId(g, id)).find((k) => k?.alive && !k.isPlayer && !v.kinMet.includes(k.id)) ?? null; };
EVENTS.push({
  id: 'vessel_kin', cooldown: 12, weight: 6,
  chance: () => 0.35,
  cond: (g) => freeAge(g) && mine(g) && !!kinNear(g),
  prepare: (g) => ({ id: kinNear(g).id }),
  title: '알아보는 얼굴',
  text: (g, c) => { const k = byId(g, c.id), b = VV(g).bodies.at(-1); return `장터에서 ${J(k?.name ?? '누군가', '이/가')} 내 소매를 붙들었다. "${b?.name?.split(' ')[0] ?? '너'}! 어디 있었어. 다들 죽은 줄 알았어." 그 얼굴이 울고 있다. 이 몸의 심장이 그 얼굴을 알아보고 먼저 뛰었다.`; },
  choices: [
    { label: '모르는 사람이라고 뿌리친다', run: (g, rng, c) => { VV(g).kinMet.push(c.id); stress(g, 6); if (rng.chance(0.3)) TS(g).pendingExpose = true; return '소매를 뿌리치고 걸었다. 등 뒤에서 그 사람이 내 이름이 아닌 이름을 오래 불렀다. 그 이야기가 동네에 돌 것이다.'; } },
    { label: '그 사람인 척 따라간다', run: (g, rng, c) => { const k = byId(g, c.id); VV(g).kinMet.push(c.id); if (k) { k.known = true; k.affection = Math.max(k.affection ?? 0, 60); } stress(g, 12); return `그 집 저녁상에 앉았다. ${J(k?.name ?? '그 사람', '은/는')} 내 그릇에 반찬을 덜어 주며 "말투가 좀 변했다"고 했다. 웃어넘겼다. 그날 밤 이 몸이 혼자 울었다.`; } },
  ],
});
// 집행관: 탑의 tower_exposed가 들킴을 맡는다. 여기서는 쫓기는 동안 그릇이 빨리 삭는 것만
HOOKS.afterMonth.push((g) => { if (mine(g) && TS(g).hunted > mi(g)) VV(g).rot = clampN(VV(g).rot + 0.002, 0, 1); });

export function vesselInfo(g) {
  const v = VV(g);
  return { bodies: v.bodies.map((b) => ({ name: b.name, y: b.y })), rot: Math.round(v.rot * 100), active: mine(g) };
}
export { addNotoriety };
