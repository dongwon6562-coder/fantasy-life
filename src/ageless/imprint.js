// 27단계 불로, 금지 마법 길: 마지막 새김. (도우미스레드3)
// 정신의 술(tower forbidden.mind)을 깊이 안 사람은 제 자식에게 저를 새길 수 있다. 내가 죽고 그 아이가 대를 이으면,
// 눈을 뜨는 것은 그 아이가 아니라 나다. 내 솜씨와 마력과 기억이 그대로 이어진다. 그 아이는 사라진다.
// 몸은 늙는다. 다음 대에도 이어지려면 또 새겨야 한다. 식구들은 무언가 달라졌다는 것을 안다.
//   g.imprint = { target(새긴 아이 id | null), saved{ forbidden, taint }, chain[{ name, y }], made }  (대를 넘어 남는다)
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check } from '../events/core.js';
import { J } from '../narrative/text.js';
import { me } from '../game.js';
import { ageYears, byId, fullName } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress } from '../adventure/core.js';
import { TS } from '../tower/state.js';
import { isJailed } from '../crime.js';
import { registerAgelessPath, isAgeless } from './core.js';
import { freeAge, clampN } from './seventh.js';

export const IM = (g) => { const s = (g.imprint ??= {}); s.target ??= null; s.saved ??= null; s.chain ??= []; s.made ??= 0; return s; };
const st = (g, k) => g.player.stats[k] ?? 0;
const mind = (g) => g.tower?.forbidden?.mind ?? 0;

registerAgelessPath('imprint', {
  name: '마지막 새김', kind: 'forbidden', owner: '도우미스레드3',
  blurb: '제 자식에게 저를 새겼다. 대를 이어도 눈을 뜨는 것은 나다. 그 아이는 사라진다.',
});

const kids = (g) => (me(g)?.childIds ?? []).map((id) => byId(g, id)).filter((k) => k?.alive && !k.isPlayer && ageYears(k) >= 4);
const able = (g) => freeAge(g) && !!g.player.manaAwakened && mind(g) >= 2 && !isAgeless(me(g)) && ageYears(me(g)) >= 40 && kids(g).length > 0;

ACTIONS.push({
  id: 'imprint_rite', name: '아이에게 나를 새긴다', icon: 'magic',
  desc: '정신의 술 가장 깊은 곳. 자식 하나에게 나를 새겨 둔다. 내가 죽고 그 아이가 대를 이으면, 눈을 뜨는 것은 나다.',
  available: (g) => able(g) && !sceneQueued(g, 'imprint_rite'),
  run(g) { queueScene(g, 'imprint_rite', {}, { first: true }); return '아이들이 잠든 방 앞에서 오래 서 있었다.'; },
});
defineScene('imprint_rite', {
  title: () => '마지막 새김',
  text: (g) => `${IM(g).target ? '이미 한 아이에게 새겨 두었다. 다른 아이로 바꾸면 먼저 새긴 것은 흐려진다. ' : ''}잠든 아이의 이마에 손을 얹으면, 아이의 꿈 밑에 내가 한 겹씩 쌓인다. 아이는 아무것도 모른 채 자란다. 내가 죽는 날, 그 겹이 아이를 덮는다.`,
  choices: (g) => {
    if (!able(g)) return [];
    const T = IM(g).target;
    return [{ label: '손을 거둔다', key: 'leave' }, ...kids(g).filter((k) => k.id !== T).slice(0, 3).map((k) => ({ label: `${k.name}에게 (${ageYears(k)}살)`, key: `kid:${k.id}` }))];
  },
  resolve(g, rng, s, key) {
    if (key === 'leave') return '손을 거두었다. 아이가 잠결에 내 손가락을 쥐었다가 놓았다.';
    const k = byId(g, Number(key.split(':')[1]));
    if (!k?.alive || !able(g) || !(me(g)?.childIds ?? []).includes(k.id)) return '아이는 이미 내 손 닿는 곳에 없다.';
    const T = TS(g), S = IM(g);
    T.taint = clampN((T.taint ?? 0) + 20, 0, 100);
    if (g.faith) g.faith.suspicion = clampN((g.faith.suspicion ?? 0) + 6, 0, 100);
    if (g.realm && Number.isFinite(g.realm.seal) && !g.seal?.ending) g.realm.seal = clampN(g.realm.seal - 0.3, 0, 100);
    if (!check(rng, (g.player.skills.magic ?? 0) + mind(g) * 10 + st(g, 'wil') / 3, 110)) {
      stress(g, 18);
      if (rng.chance(0.25)) T.pendingExpose = true;
      k.affection = Math.max(0, (k.affection ?? 50) - 25);
      return `${J(k.name, '이/가')} 비명을 지르며 깼다. 겹이 쌓이지 않고 튕겨 나왔다. 아이는 그 뒤로 내 방 앞을 지나지 않는다. 무엇을 보았는지 말하지 않는다.`;
    }
    const old = S.target ? byId(g, S.target) : null;
    if (old) delete old.imprinted;
    S.target = k.id; S.made += 1; k.imprinted = true;
    S.saved = { forbidden: { ...(T.forbidden ?? {}) }, taint: T.taint };
    note(g, `${k.name}에게 나를 새겼다.`);
    return `밤마다 ${k.name}의 이마에 손을 얹었다. 이레째 되던 날, 아이가 잠꼬대로 내 어린 시절 개 이름을 불렀다. 아이는 그 개를 본 적이 없다. ${old ? `${J(old.name, '은/는')} 그날부터 다시 제 꿈을 꾼다.` : ''}`.trim();
  },
});

// 새긴 아이 쪽 금지 마법 기록은 달마다 맞춘다 (대 잇기 때 탑이 비우기 전에)
HOOKS.afterMonth.push((g) => {
  const S = g.imprint;
  if (!S?.target || g.over) return;
  const k = byId(g, S.target);
  if (!k?.alive) { S.target = null; S.saved = null; return; }
  const T = TS(g);
  S.saved = { forbidden: { ...(T.forbidden ?? {}) }, taint: T.taint };
});

/* ---------- 대 잇기: 새긴 아이가 이으면, 눈을 뜨는 것은 나 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const S = g.imprint;
  if (!S?.target) return;
  const hit = S.target === g.player.id;
  const child = byId(g, S.target);
  if (child) delete child.imprinted;
  if (!hit || !old) { S.target = null; S.saved = null; return; }
  const p = g.player, saved = S.saved;
  for (const k of Object.keys(p.stats)) p.stats[k] = Math.max(p.stats[k], (old.stats?.[k] ?? 0) * 0.9);
  for (const k of Object.keys(p.skills)) p.skills[k] = Math.max(p.skills[k], (old.skills?.[k] ?? 0) * 0.92);
  p.talents = { ...(old.talents ?? p.talents) };
  p.manaPotential = Math.max(p.manaPotential ?? 0, old.manaPotential ?? 0);
  p.manaAwakened = !!(p.manaAwakened || old.manaAwakened);
  p.mana = Math.max(p.mana ?? 0, (old.mana ?? 0) * 0.85);
  if (saved && g.tower) { g.tower.forbidden = { ...g.tower.forbidden, ...saved.forbidden }; g.tower.taint = clampN((saved.taint ?? 0) + 10, 0, 100); }
  S.chain.push({ name: fullName(child ?? { name: p.name, lastName: p.lastName }), was: `${old.name} ${old.lastName}`, y: g.date.year });
  S.target = null; S.saved = null;
  note(g, `${p.name}의 눈을 뜬 것은 ${J(old.name, '이었/였')}다.`);
  chron(g, `${J(p.name, '은/는')} ${old.sex === 'f' ? '어머니' : '아버지'}의 장례 뒤로 사람이 달라졌다고들 한다.`, 60);
  if (!sceneQueued(g, 'imprint_wake')) queueScene(g, 'imprint_wake', { was: old.name });
});
defineScene('imprint_wake', {
  title: () => '눈을 뜬 사람',
  text: (g, s) => `장례가 끝난 밤, 눈을 떴다. 손이 작다. ${g.player.name}의 손이다. 그런데 기억은 ${s.was}의 것이다. ${J(g.player.name, '이었/였')}던 아이가 무엇을 좋아했는지, 어떤 목소리로 웃었는지가 아주 멀리서, 남의 이야기처럼 떠오른다. 그 아이는 이제 없다.`,
  choices: (g) => (!g.over ? [{ label: '아이인 척 산다', key: 'mask' }, { label: '거울을 덮는다', key: 'cover' }] : []),
  resolve(g, rng, s, key) {
    stress(g, key === 'mask' ? 10 : 15);
    return key === 'mask' ? '아침상에서 그 아이의 말버릇을 흉내 냈다. 남은 식구 하나가 숟가락을 내려놓고 나를 오래 보았다. 아무 말도 하지 않았다.' : '방의 거울을 천으로 덮었다. 거울 속의 얼굴이 아니라, 그 뒤에 있어야 할 사람이 보일 것 같아서.';
  },
});
// 남은 식구가 알아챈다
const famWho = (g) => (g.player.familyIds ?? []).map((id) => byId(g, id)).find((q) => q?.alive && !q.isPlayer && ageYears(q) >= 12) ?? null;
EVENTS.push({
  id: 'imprint_kin', cooldown: 36, weight: 5,
  chance: () => 0.3,
  cond: (g) => !g.over && !L(g).travel && !isJailed(g) && IM(g).chain.length > 0 && IM(g).chain.at(-1).y >= g.date.year - 6 && !!famWho(g) && !g.flags?.imprint_kin,
  prepare: (g) => ({ id: famWho(g).id }),
  title: '"너 누구니"',
  text: (g, c) => { const q = byId(g, c.id); return `${J(q?.name ?? '식구', '이/가')} 부엌 문간에서 나를 불러 세웠다. "너, 그 사람처럼 웃는다. 그 사람처럼 숟가락을 쥐고, 그 사람처럼 문을 닫아. ${J(g.player.name, '은/는')} 그렇게 안 했어." 목소리가 떨린다. "너 누구니."`; },
  choices: [
    { label: '"저예요."', run: (g, rng, c) => { (g.flags ??= {}).imprint_kin = true; const q = byId(g, c.id); if (q) q.affection = Math.max(0, (q.affection ?? 50) - 20); stress(g, 8); return '그 사람은 대답하지 않았다. 다음 달 짐을 싸서 친정으로 갔다. 떠나며 문지방에 소금을 뿌렸다.'; } },
    { label: '아무 말도 하지 않는다', run: (g, rng, c) => { (g.flags ??= {}).imprint_kin = true; if (rng.chance(0.3)) TS(g).pendingExpose = true; stress(g, 6); return '오래 마주 보았다. 그 사람이 먼저 눈을 돌렸다. 그날 밤 그 사람이 사제를 찾아갔다는 말을 들었다.'; } },
  ],
});

export function imprintInfo(g) {
  const S = IM(g);
  return { target: S.target ? byId(g, S.target)?.name ?? null : null, chain: S.chain.map((x) => ({ ...x })), made: S.made };
}
