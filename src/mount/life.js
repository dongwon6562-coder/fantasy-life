// 하늘 짐승과 얽히는 일: 둥지에서 알을 훔치거나 비싸게 사고, 재 속에 묻어 품고, 깬 새끼를 날고기로 기르고,
// 사나워지는 해를 버티고, 등에 올라 나는 법을 익히고(떨어지면 죽기도 한다), 하늘길·전령·싸움터에 쓰고,
// 잿빛 날개대에 들고, 늙은 짐승을 마지막으로 태운다. 새 행동은 뜻 있는 형편에서만 보인다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainSkill, gainStat } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress } from '../adventure/core.js';
import { isJailed, addNotoriety } from '../crime.js';
import { POWER_BONUS, playerPower } from '../adventure/combat.js';
import { PLACES } from '../places.js';
import { KINDS, B, alive, ageOf, old, addAnimal, bury, logBeast, MAX_ANIMALS } from '../beasts/core.js';
import { OS, addMerit, myOrderId } from '../order/core.js';
import {
  MS, SKY, SKY_INFO, NESTS, NEST_IDS, BAND, isSky, nestAt, clamp, mi, here, placeName, mlog, mountRng,
} from './state.js';

export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.bondage?.slave && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const st = (g, k) => g.player.stats[k] ?? 0;
const skill = (g) => g.player.skills.animals ?? 0;
const TOWNS = ['소도시', '왕도', '제도', '성도', '마법도시', '자유도시', '성채도시', '항구 도시', '백작령 성읍', '섬의 수도', '미궁 도시'];
const isTown = (pl) => TOWNS.includes(PLACES[pl]?.kind);

/* ---------- 하늘 짐승 기록 ---------- */
export function skyOf(g, a) {
  const M = MS(g);
  return (M.sky[a.id] ??= { kind: a.kind, flight: 0, falls: 0, sorties: 0, wounds: 0, hatchedBy: null, lastFlight: 0, carried: 0 });
}
export const skyBeasts = (g) => (g.beasts ? alive(g).filter(isSky) : []);
export const grown = (g, a) => ageOf(g, a) >= SKY_INFO[a.kind].adult;
export const ready = (g, a) => isSky(a) && (a.trained ?? 0) >= 100 && grown(g, a) && !old(g, a) && skyOf(g, a).flight >= 100;
/** 지금 타고 날 수 있는 하늘 짐승 (없으면 null) */
export const rideable = (g) => skyBeasts(g).find((a) => ready(g, a)) ?? null;
const nmK = (a) => `${KINDS[a.kind].name} ${a.name}`;

/* ---------- 둥지를 안다 ---------- */
const unknownNestHere = (g) => nestAt(here(g)).find((id) => !MS(g).nests[id].known) ?? null;
EVENTS.push({
  id: 'mount_nest_seen', cooldown: 24, weight: 3, chance: () => 0.3,
  cond: (g) => free(g) && !!unknownNestHere(g),
  prepare: (g) => ({ id: unknownNestHere(g) }),
  title: '벼랑 위의 그림자',
  text: (g, c) => { const n = NESTS[c.id]; return `${placeName(n.from)} 위 하늘을 큰 그림자가 가로질렀다. 마을 사람들이 고개를 숙이고 걸음을 서둘렀다. ${n.kind === 'griffin' ? '양치기 하나가 말했다. "그리폰이오. 봄마다 망아지를 하나씩 채 가지."' : '늙은 광부가 침을 뱉었다. "와이번이 또 알을 깠구먼. 봄이면 양이 줄어."'}`; },
  choices: [
    { label: '못 본 척한다', run: () => '짐승의 일은 짐승의 일이다. 고개를 숙이고 지나갔다.' },
    { label: '둥지가 어디인지 묻는다', run: (g, rng, c) => { const s = MS(g).nests[c.id]; s.known = true; mlog(g, `${NESTS[c.id].name}: 자리를 알았다.`); return `${NESTS[c.id].kind === 'griffin' ? '양치기' : '늙은 광부'}가 손가락으로 가리켰다. ${NESTS[c.id].text} "알을 노리는 거라면 그만두시오. 작년 봄에 올라간 사람은 아직 저 비탈에 있소."`; } },
  ],
});

/* ---------- 둥지에 오른다 ---------- */
const spring = (g) => g.date.month >= 3 && g.date.month <= 7;
const nestHere = (g) => nestAt(here(g)).find((id) => { const s = MS(g).nests[id]; return s.known && s.eggs > 0; }) ?? null;
ACTIONS.push({
  id: 'mount_nest', name: '둥지의 알을 노린다', icon: 'hunt',
  desc: '봄, 하늘 짐승의 둥지에 밧줄을 걸고 올라 알을 훔친다. 어미가 돌아오면 살아 내려오기 어렵다.',
  available: (g) => free(g) && spring(g) && !!nestHere(g) && MS(g).eggs.length < 2 && !sceneQueued(g, 'mount_nest'),
  run(g) { const id = nestHere(g); queueScene(g, 'mount_nest', { id }, { first: true }); MS(g).me.nests += 1; return `밧줄 두 타래와 쇠말뚝, 날고기 한 덩이를 챙겨 ${NESTS[id].name} 쪽으로 나섰다.`; },
});
defineScene('mount_nest', {
  title: (g, s) => NESTS[s.id].name,
  text: (g, s) => `${NESTS[s.id].text} 둥지에 알이 ${MS(g).nests[s.id].eggs}개 보인다. ${NESTS[s.id].kind === 'griffin' ? '어미는 둥지 위 바위에 앉아 깃을 고른다.' : '어미는 동굴 안쪽에서 숨을 쉰다. 숨 쉴 때마다 유황 냄새가 짙어진다.'}`,
  choices: (g, s) => {
    if (!free(g) || !nestAt(here(g)).includes(s.id) || MS(g).nests[s.id].eggs <= 0) return [];
    return [
      { label: '어미가 사냥 나가기를 기다린다', key: 'wait' },
      { label: '날고기를 던져 꾀어내고 바로 오른다', key: 'climb' },
      { label: '내려간다', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    const M = MS(g), n = NESTS[s.id], x = M.nests[s.id], info = SKY_INFO[n.kind];
    if (key === 'leave') return '벼랑 아래에서 한참 올려다보다 돌아섰다. 비탈의 뼈 무더기를 다시 보고 싶지 않았다.';
    tired(g, 30);
    const v = key === 'wait' ? st(g, 'sen') * 0.6 + st(g, 'wil') * 0.4 + skill(g) * 0.3 : st(g, 'agi') * 0.6 + st(g, 'str') * 0.4 + skill(g) * 0.2;
    const dc = (key === 'wait' ? 60 : 55) + (n.kind === 'griffin' ? 8 : 0);
    if (check(rng, v, dc)) {
      x.eggs -= 1; x.robbed += 1; x.anger = 6;
      takeEgg(g, n.kind, n.from, 'nest');
      mlog(g, `${n.name}: 알을 훔쳤다.`);
      chron(g, `${J(g.player.name, '이/가')} ${placeName(n.from)}의 하늘 짐승 둥지에서 알을 훔쳐 내려왔다는 말이 돈다.`, 60);
      return `${key === 'wait' ? '이틀을 바위틈에 엎드려 기다렸다. 사흘째 새벽, 어미가 날개를 펴고 골짜기 쪽으로 미끄러져 내려갔다.' : '날고기를 비탈 아래로 던졌다. 어미가 내리꽂히는 사이 밧줄을 타고 올랐다.'} ${info.eggLook}. ${J(info.egg, '을/를')} 가죽 자루에 넣고 등에 묶었다. 내려오는 내내 등 뒤 하늘이 조용했다. 그게 더 무서웠다.`;
    }
    // 어미가 돌아왔다
    stress(g, 12);
    const pow = playerPower(g) + rng.int(-15, 15);
    if (pow >= info.mother) {
      injure(g, `${KINDS[n.kind].name} 발톱에 찢긴 등`, 3);
      x.anger = 8;
      return `밧줄 중간에서 어미의 그림자가 나를 덮었다. 한 손으로 매달린 채 칼을 휘둘렀다. 칼끝이 발톱에 걸렸다. 어미가 비명을 지르며 물러났다. 빈손으로, 등이 찢긴 채 내려왔다.`;
    }
    if (rng.chance(key === 'climb' ? 0.08 : 0.04)) {
      g.player.injuries.push({ name: `치명상 (${KINDS[n.kind].name}에게 벼랑에서 떨어짐)`, months: 2, mortal: true });
      return `어미가 바위벽째 나를 쳤다. 밧줄이 끊어졌다. 비탈의 뼈 무더기가 빠르게 다가왔다.`;
    }
    injure(g, rng.pick(['벼랑에서 떨어져 부러진 다리', '발톱에 꿰뚫린 어깨', '바위에 깨진 갈비뼈']), 4);
    return `손이 둥지 가장자리에 닿기 직전, 바람 소리가 바뀌었다. 어미가 돌아왔다. 밧줄을 놓았다. 그 덕에 살았다. 비탈을 굴러 뼈 무더기 옆에서 멈췄다.`;
  },
});

function takeEgg(g, kind, from, how) {
  const M = MS(g);
  const e = { id: ++M.seq, kind, from, got: mi(g), prog: 0, warm: 100, by: 0, how };
  M.eggs.push(e); M.me.eggsGot += 1;
  note(g, `${J(SKY_INFO[kind].egg, '을/를')} 얻었다.`);
  return e;
}

/* ---------- 알을 산다 ---------- */
EVENTS.push({
  id: 'mount_egg_seller', cooldown: 60, weight: 2, chance: () => 0.25,
  cond: (g) => free(g) && ['portel', 'barka', 'saltmare', 'eisen'].includes(here(g)) && MS(g).eggs.length < 2 && g.player.money >= 300,
  title: '천에 싼 무거운 것',
  text: () => `창고 뒤에서 남쪽 말씨의 상인이 천을 들췄다. ${SKY_INFO.griffin.eggLook}. "그리폰 알이오. 늑대 고개에서 셋이 올라가 하나가 내려왔소. 은화 ${SKY_INFO.griffin.eggPrice}닢. 깨면 말 열 필 값을 하지."`,
  choices: [
    { label: '산다', show: (g) => g.player.money >= SKY_INFO.griffin.eggPrice, run: (g, rng) => { g.player.money -= SKY_INFO.griffin.eggPrice; if (rng.chance(0.35)) { MS(g).me.cheated = (MS(g).me.cheated ?? 0) + 1; return '알을 품에 안고 돌아왔다. 석 달을 재 속에 묻어 품었다. 넉 달째 깨 보니 속이 곯아 있었다. 상인은 그 창고에 다시 오지 않았다.'; } takeEgg(g, 'griffin', 'fr_wolf', 'bought'); return '은화 자루를 넘겼다. 알은 생각보다 따뜻했다. 품에 안으니 안에서 무언가 한 번 긁었다.'; } },
    { label: '흥정한다', run: (g, rng) => { if (check(rng, st(g, 'cha') + st(g, 'int') / 2, 85) && g.player.money >= 480) { g.player.money -= 480; takeEgg(g, 'griffin', 'fr_wolf', 'bought'); return '은화 480닢까지 깎았다. 상인은 욕을 하며 알을 넘겼다.'; } return '상인이 천을 다시 덮었다. "구경값은 안 받겠소."'; } },
    { label: '돌아선다', run: () => '그 값이면 집 한 채다. 돌아섰다. 등 뒤에서 상인이 웃었다.' },
  ],
});
EVENTS.push({
  id: 'mount_band_egg', cooldown: 36, weight: 3, chance: () => 0.35,
  cond: (g) => free(g) && here(g) === BAND.seat && MS(g).eggs.length < 2 && ((MS(g).me.member?.rank ?? -1) >= 1 || (L(g).renown ?? 0) >= 60) && g.player.money >= SKY_INFO.wyvern.eggPrice,
  title: '둥지 탑의 알',
  text: (g) => `${J(MS(g).band.captain, '이/가')} 둥지 탑 아래로 나를 불렀다. 짚 위에 알 하나가 놓여 있다. "늙은 놈이 마지막으로 낳은 거다. 날개대 사람에게만 넘긴다. 값은 받는다. 고기 값이 모자라서."`,
  choices: [
    { label: `와이번 알을 산다 (은화 ${SKY_INFO.wyvern.eggPrice}닢)`, show: (g) => g.player.money >= SKY_INFO.wyvern.eggPrice, run: (g) => { g.player.money -= SKY_INFO.wyvern.eggPrice; takeEgg(g, 'wyvern', BAND.seat, 'band'); return '알을 받았다. 날개장이 말했다. "재 속에 묻고, 하루도 거르지 말고 품어. 식으면 끝이다."'; } },
    { label: '사양한다', run: () => '아직은 짐승 하나를 더 먹일 형편이 아니다. 날개장은 어깨를 으쓱했다.' },
  ],
});

/* ---------- 알을 품는다 ---------- */
ACTIONS.push({
  id: 'mount_brood', name: '알을 품는다', icon: 'fire',
  desc: '하늘 짐승의 알을 화덕 곁 재 속에 묻고 밤낮으로 불을 지킨다. 숯값이 들고, 한 달이라도 거르면 알이 식는다.',
  available: (g) => isAdult(g) && !L(g).travel && !isJailed(g) && MS(g).eggs.length > 0 && MS(g).brood !== mi(g),
  run(g) {
    const M = MS(g);
    M.brood = mi(g);
    if (g.player.money >= 2) g.player.money -= 2;
    tired(g, 12);
    for (const e of M.eggs) { e.prog += 1; e.warm = 100; e.by += 1; }
    const e = M.eggs[0], left = SKY_INFO[e.kind].hatch - e.prog;
    return left <= 0 ? '재 속의 알이 저 혼자 흔들린다. 껍데기에 금이 갔다.' : `밤마다 숯을 갈고 재를 덮었다. ${left <= 1 ? '껍데기 안에서 긁는 소리가 이제 쉬지 않는다.' : '손바닥을 대면 안에서 무언가 천천히 움직인다.'}`;
  },
});
defineScene('mount_hatch', {
  title: () => '깨어난 것',
  text: (g, s) => {
    const k = s.beast;
    return k === 'griffin'
      ? '껍데기가 갈라지며 젖은 깃털 덩어리가 굴러 나왔다. 귀엽지 않다. 부리부터 컸다. 처음 한 일은 껍데기를 먹는 것이었고, 두 번째는 내 손가락을 무는 것이었다. 피 냄새를 맡자 눈을 떴다.'
      : '가죽 같은 껍데기를 찢고 나온 것은 젖은 날개를 질질 끌며 화덕 쪽으로 기어갔다. 꼬리 끝 가시가 벌써 단단하다. 고양이가 다가가자 소리 없이 물었다. 고양이는 다시 나오지 않았다.';
  },
  choices: (g, s) => [
    ...(alive(g).length < MAX_ANIMALS ? [{ label: '날고기를 먹이며 기른다', key: 'keep' }] : []),
    { label: s.beast === 'griffin' ? '날개대에 넘긴다' : '밀매꾼에게 판다', key: 'sell' },
  ],
  resolve(g, rng, s, key) {
    const M = MS(g), K = KINDS[s.beast];
    if (key === 'sell') {
      const coin = s.beast === 'griffin' ? rng.int(320, 420) : rng.int(160, 240);
      g.player.money += coin;
      if (s.beast === 'wyvern') addNotoriety(g, 3);
      mlog(g, `${K.name} 새끼를 넘겼다.`);
      return `${s.beast === 'griffin' ? '날개대 사람이 가죽 자루를 들고 왔다.' : '밀매꾼이 우리를 실은 수레를 끌고 왔다.'} 은화 ${coin}닢. 새끼는 자루 안에서 끝까지 울었다. 그 소리가 며칠 귀에 남았다.`;
    }
    const a = addAnimal(g, s.beast, { ageYears: 0, trained: 0, bond: s.by >= SKY_INFO[s.beast].hatch ? 40 : 20 });
    if (!a) return '우리에 자리가 없었다. 새끼는 이틀 밤을 울다 숨을 멈췄다.';
    const r = skyOf(g, a); r.hatchedBy = g.player.name;
    M.me.hatched += 1;
    logBeast(g, `${J(nmK(a), '을/를')} 알에서 깨웠다.`);
    note(g, `${J(nmK(a), '이/가')} 알에서 깼다.`);
    chron(g, `${g.player.name}의 집에서 ${J(K.name, '이/가')} 알을 깨고 나왔다. 이웃들이 문을 걸어 잠갔다.`, 55);
    return `이름은 "${a.name}". 하루에 날고기 한 근을 먹는다. 해가 갈수록 더 먹을 것이다. 다 자라면 ${SKY_INFO[s.beast].meat} 한 마리를 하루에 먹는다고 날개대 사람들이 말했다.`;
  },
});

/* ---------- 등에 올라 나는 법 ---------- */
const learner = (g) => skyBeasts(g).find((a) => (a.trained ?? 0) >= 80 && ageOf(g, a) >= SKY_INFO[a.kind].adult - 1 && !old(g, a) && skyOf(g, a).flight < 100) ?? null;
ACTIONS.push({
  id: 'mount_fly', name: '하늘 짐승 등에 오른다', icon: 'travel',
  desc: '다 자라 가는 하늘 짐승 등에 안장을 얹고 오른다. 처음 몇 번은 반드시 떨어진다. 높이 떨어지면 살아남지 못한다.',
  available: (g) => free(g) && !!learner(g),
  run(g, rng) {
    const M = MS(g), a = learner(g), r = skyOf(g, a), K = KINDS[a.kind];
    tired(g, 25); M.me.flights += 1;
    const sk = gainSkill(g, 'animals', 0.8, 'agi');
    const v = st(g, 'agi') * 0.5 + skill(g) * 0.5 + a.bond / 3 + (grown(g, a) ? 0 : -10);
    if (check(rng, v, 50 + (100 - r.flight) / 5)) {
      r.flight = clamp(r.flight + rng.int(12, 20), 0, 100);
      a.bond = Math.min(100, a.bond + 3);
      gainStat(g, 'agi', 0.4);
      if (r.flight >= 100) {
        mlog(g, `${nmK(a)}: 하늘을 날았다.`);
        chron(g, `${J(g.player.name, '이/가')} ${J(K.name, '을/를')} 타고 하늘을 날았다. 레오니아에 그런 사람은 손에 꼽는다.`, 80);
        note(g, `${J(nmK(a), '을/를')} 타고 처음으로 하늘을 날았다.`);
        return `${J(a.name, '이/가')} 벼랑 끝에서 몸을 던졌다. 떨어지다가, 날개가 바람을 잡았다. 땅이 접힌 지도처럼 펼쳐졌다. 들판 사이로 길이 실처럼 보였다. 내려와서 한참 손이 떨렸다. (짐승 다루기 +${sk.toFixed(1)})`;
      }
      return `${J(a.name, '이/가')} 낮게 날아 들판을 한 바퀴 돌았다. 고삐를 쥔 손이 하얘졌다. 이번엔 떨어지지 않았다. (날기 ${Math.round(r.flight)}/100, 짐승 다루기 +${sk.toFixed(1)})`;
    }
    r.falls += 1; M.me.falls += 1;
    a.bond = Math.max(0, a.bond - 2);
    stress(g, 8);
    if (r.flight < 40 && rng.chance(0.035)) {
      g.player.injuries.push({ name: `치명상 (${K.name} 등에서 떨어짐)`, months: 2, mortal: true });
      return `${J(a.name, '이/가')} 공중에서 몸을 뒤집었다. 안장 끈이 끊어졌다. 떨어지는 동안 날개 소리가 멀어졌다.`;
    }
    injure(g, rng.pick(['떨어져 부러진 팔', '안장에 쓸려 터진 허벅지', '떨어지며 삔 목', '날개에 맞아 금 간 갈비뼈']), 2);
    return `${J(a.name, '이/가')} 땅을 박차자마자 몸을 비틀었다. 사람 키 세 길에서 떨어졌다. ${J(a.name, '은/는')} 내려앉아 나를 내려다보았다. 걱정하는 얼굴이 아니었다.`;
  },
});

/* ---------- 하늘길: 땅 위의 길은 한 달 ---------- */
HOOKS.afterActions.unshift((g) => {
  const t = L(g).travel;
  if (!t || t.sea || t.mounted || t.forced || !g.mount) return;
  const a = rideable(g);
  if (!a) return;
  t.mounted = true;
  const r = skyOf(g, a);
  r.carried += 1; r.lastFlight = mi(g); a.bond = Math.min(100, a.bond + 2);
  if (t.left < 2) return;
  const cut = t.left - 1;
  t.left = 1;
  g.news?.unshift({ text: `${J(nmK(a), '을/를')} 타고 하늘로 가니 길이 ${cut}달 줄었다.`, rel: 100 });
});
// 싸움에서: 하늘에서 덮친다 (beasts가 이미 짐승 힘을 보탠다. 여기서는 타고 나는 사람만 더)
POWER_BONUS.push((g) => (g.mount && rideable(g) ? 6 : 0));

/* ---------- 전령 일 ---------- */
ACTIONS.push({
  id: 'mount_courier', name: '하늘로 급한 편지를 나른다', icon: 'scroll',
  desc: '상단과 관청의 급한 편지를 하늘 짐승에 싣고 나른다. 보름 길을 하루에 간다. 값은 비싸게 받는다. 궂은 날에는 위험하다.',
  available: (g) => free(g) && isTown(here(g)) && !!rideable(g),
  run(g, rng) {
    const M = MS(g), a = rideable(g), r = skyOf(g, a);
    tired(g, 20); M.me.couriers += 1; r.lastFlight = mi(g);
    const winter = [12, 1, 2].includes(g.date.month);
    if (rng.chance(winter ? 0.15 : 0.05)) {
      r.wounds += 1; a.bond = Math.max(0, a.bond - 3);
      injure(g, '눈보라 속에서 얼어 터진 손', 2);
      g.player.money += 10;
      return `산 위에서 눈보라를 만났다. ${J(a.name, '이/가')} 바람에 밀려 바위에 날개를 긁혔다. 편지는 젖었다. 품삯은 반만 받았다. (은화 10닢)`;
    }
    const coin = rng.int(28, 48);
    g.player.money += coin; L(g).renown = (L(g).renown ?? 0) + 1;
    return rng.pick([
      `상단 행수의 봉인 편지를 싣고 날았다. 해 지기 전에 닿았다. 받는 사람이 날짜를 두 번 확인했다. (은화 ${coin}닢)`,
      `관청의 급보를 날랐다. 성문 위로 내려앉자 보초가 창을 떨어뜨렸다. (은화 ${coin}닢)`,
      `혼례 날짜를 물리자는 편지였다. 보낸 쪽은 다급했고 받는 쪽은 굳은 얼굴이었다. 하늘 짐승이 나르는 소식은 대개 그렇다. (은화 ${coin}닢)`,
    ]);
  },
});

/* ---------- 잿빛 날개대 ---------- */
const member = (g) => MS(g).me.member;
ACTIONS.push({
  id: 'mount_join', name: '잿빛 날개대에 든다', icon: 'shield',
  desc: '그라우벨 셋째 성벽 둥지 탑의 하늘 기수들 틈에 든다. 하늘 짐승을 타고 날 수 있는 사람만 받는다.',
  available: (g) => free(g) && here(g) === BAND.seat && !member(g) && !!rideable(g),
  run(g) {
    const M = MS(g), a = rideable(g);
    M.me.member = { since: mi(g), rank: 0, sorties: 0 };
    M.band.riders += 1; M.band.beasts += 1;
    if (myOrderId(g) === 'march') addMerit(g, 10);
    mlog(g, '잿빛 날개대에 들었다.');
    note(g, '잿빛 날개대에 들었다.');
    return `${J(M.band.captain, '이/가')} ${J(a.name, '을/를')} 한 바퀴 돌며 날개 관절을 눌러 보았다. "짐승은 됐고." 그리고 나를 보았다. "사람은 두고 보지." 둥지 탑 맨 아래 칸이 내 자리다.${myOrderId(g) === 'march' ? ' 잿빛 성벽 형제들이 성벽 위에서 지켜보았다.' : ''}`;
  },
});
const SORTIE = [
  { id: 'scout', text: (g) => `국경 너머 발하르트 쪽 길을 높이 날며 보았다. 짐마차 줄과 군막 수를 세어 성채에 알렸다.`, dc: 0 },
  { id: 'nest', text: () => '늑대 고개 너머 마물 떼의 굴을 찾아 위에서 기름 단지를 떨어뜨렸다.', dc: 70 },
  { id: 'search', text: () => '눈 덮인 고개에서 길을 잃은 짐꾼들을 찾아 위에서 횃불로 길을 알렸다.', dc: 0 },
  { id: 'drake', text: () => '떠돌이 와이번 한 마리가 국경 마을 양 떼를 덮쳤다. 날개대 셋이 함께 쫓아 공중에서 맞붙었다.', dc: 95 },
];
ACTIONS.push({
  id: 'mount_sortie', name: '날개대 출격에 나선다', icon: 'sword',
  desc: '날개장의 명을 받아 하늘로 나간다. 정찰, 마물 굴 태우기, 길 잃은 사람 찾기, 떠돌이 와이번 쫓기.',
  available: (g) => free(g) && here(g) === BAND.seat && !!member(g) && !!rideable(g),
  run(g, rng) {
    const M = MS(g), me = member(g), a = rideable(g), r = skyOf(g, a), s = rng.pick(SORTIE);
    tired(g, 28); me.sorties += 1; M.me.sorties += 1; r.sorties += 1; r.lastFlight = mi(g);
    let text = s.text(g);
    if (s.dc) {
      const pow = playerPower(g) + rng.int(-20, 20);
      if (pow < s.dc) {
        r.wounds += 1; a.bond = Math.max(0, a.bond - 4);
        injure(g, rng.pick(['공중에서 발톱에 긁힌 옆구리', '떨어지는 바위에 맞은 어깨']), 3);
        text += ` 쉽지 않았다. ${J(a.name, '이/가')} 날개에 상처를 입고 돌아왔다. 나도 성하지 않다.`;
        if (r.wounds >= 4 && rng.chance(0.3)) { bury(g, a, '출격에서 입은 상처가 덧나 숨을 거두었다', 70); text += ` 그 상처가 끝내 덧났다. ${J(a.name, '은/는')} 둥지 탑에서 숨을 거두었다.`; }
        return text;
      }
      text += ' 해냈다.';
    }
    const promoted = me.rank < 2 && me.sorties >= BAND.need[me.rank + 1];
    if (promoted) { me.rank += 1; note(g, `잿빛 날개대 ${J(BAND.ranks[me.rank], '이/가')} 되었다.`); text += ` 날개장이 내 이름을 ${BAND.ranks[me.rank]} 줄에 올렸다.`; }
    if (myOrderId(g) === 'march') addMerit(g, s.dc ? 8 : 4);
    L(g).renown = (L(g).renown ?? 0) + (s.dc ? 2 : 1);
    return text;
  },
});
ACTIONS.push({
  id: 'mount_leave', name: '날개대를 떠난다', icon: 'door',
  desc: '잿빛 날개대 둥지 탑을 떠난다.',
  available: (g) => isAdult(g) && !!member(g) && here(g) === BAND.seat && !L(g).travel,
  run(g) { const M = MS(g); M.me.member = null; M.me.served += 1; M.band.riders = Math.max(1, M.band.riders - 1); mlog(g, '잿빛 날개대를 떠났다.'); return '둥지 탑 내 칸의 짚을 걷어 냈다. 날개장은 손을 들어 보였을 뿐 아무 말도 하지 않았다.'; },
});

/* ---------- 사나워지는 해, 이웃의 두려움 ---------- */
const juvenile = (g) => skyBeasts(g).find((a) => ageOf(g, a) >= 1.5 && !grown(g, a) && (a.trained ?? 0) < 100) ?? null;
EVENTS.push({
  id: 'mount_juvenile', cooldown: 10, weight: 5, chance: () => 0.4,
  cond: (g) => isAdult(g) && !L(g).travel && !!juvenile(g),
  prepare: (g) => ({ id: juvenile(g).id }),
  title: '사나워지는 해',
  text: (g, c) => { const a = alive(g).find((x) => x.id === c.id); return `${J(a.name, '이/가')} 요즘 먹이를 주는 손을 노린다. 오늘은 사슬을 끊고 지붕에 올라가 이웃집 닭장을 내려다보고 있다. 눈이 내 쪽을 보지 않는다.`; },
  choices: [
    { label: '맨손으로 다가가 사슬을 잡는다', run: (g, rng, c) => { const a = alive(g).find((x) => x.id === c.id); if (!a) return '지붕은 비어 있었다.'; if (check(rng, st(g, 'wil') * 0.6 + skill(g) * 0.5 + a.bond / 2, 60)) { a.bond = Math.min(100, a.bond + 6); a.trained = Math.min(100, (a.trained ?? 0) + 5); return `눈을 피하지 않고 다가갔다. ${J(a.name, '이/가')} 날개를 반쯤 펴고 울었다. 사슬을 잡았다. 한참 뒤에 머리를 숙였다.`; } injure(g, `${KINDS[a.kind].name}에게 물어뜯긴 손`, 3); stress(g, 8); return `손을 뻗는 순간 ${a.kind === 'griffin' ? '부리가' : '이빨이'} 먼저 왔다. 손가락 하나가 예전처럼 굽지 않는다.`; } },
    { label: '사흘 굶긴다', run: (g, rng, c) => { const a = alive(g).find((x) => x.id === c.id); if (!a) return '지붕은 비어 있었다.'; a.bond = Math.max(0, a.bond - 8); a.trained = Math.min(100, (a.trained ?? 0) + 3); return `사흘을 굶겼다. ${J(a.name, '은/는')} 나흘째 아침 스스로 우리로 돌아왔다. 고기를 받아먹으며 나를 오래 보았다. 잊지 않을 얼굴이었다.`; } },
    { label: '이웃 닭값부터 물어 준다', run: (g) => { if (g.player.money >= 8) g.player.money -= 8; return '닭값을 치르고 고개를 숙였다. 이웃은 돈을 받으면서도 지붕 위를 흘끔거렸다.'; } },
  ],
});
const feared = (g) => skyBeasts(g).find((a) => ageOf(g, a) >= 1) ?? null;
EVENTS.push({
  id: 'mount_fear', cooldown: 36, weight: 3, chance: () => 0.3,
  cond: (g) => isAdult(g) && !L(g).travel && !!feared(g) && !nestAt(here(g)).length && here(g) !== BAND.seat && MS(g).me.permit < g.date.year,
  prepare: (g) => ({ id: feared(g).id }),
  title: '대관의 서기',
  text: (g, c) => { const a = alive(g).find((x) => x.id === c.id); return `대관의 서기가 병사 둘을 데리고 왔다. 이웃들이 뒤에 섰다. "${J(KINDS[a.kind].name, '을/를')} 고장 안에 두려면 허가가 있어야 하오. 아이가 셋이나 경기를 했고, 소가 젖을 안 내오. 올해 허가 값은 은화 40닢이오."`; },
  choices: [
    { label: '허가 값을 낸다 (은화 40닢)', show: (g) => g.player.money >= 40, run: (g) => { g.player.money -= 40; MS(g).me.permit = g.date.year; return '은화를 세어 주었다. 서기는 붉은 밀랍을 찍은 종이를 내밀었다. 이웃들은 종이를 보고도 물러서지 않았다.'; } },
    { label: '고장 밖 숲에 우리를 옮긴다', run: (g, rng, c) => { const a = alive(g).find((x) => x.id === c.id); if (a) a.bond = Math.max(0, a.bond - 5); MS(g).me.permit = g.date.year; tired(g, 10); return '고장 밖 숲가에 새 우리를 지었다. 날마다 고기를 지고 오간다. 짐승은 혼자 남는 밤마다 울었다.'; } },
    { label: '버틴다', run: (g, rng, c) => { addNotoriety(g, 4); stress(g, 6); const a = alive(g).find((x) => x.id === c.id); if (a && rng.chance(0.15)) { bury(g, a, '누군가 던진 독 고기를 먹고 숨을 거두었다', 40); return '서기는 돌아갔다. 보름 뒤 아침, 우리 앞에 고깃덩이 하나가 떨어져 있었다. 너무 늦게 보았다.'; } return '서기는 장부에 내 이름을 적고 돌아갔다. 그날부터 이웃들이 우리 집 앞을 돌아서 다닌다.'; } },
  ],
});

/* ---------- 늙은 짐승의 마지막 비행 ---------- */
const elder = (g) => skyBeasts(g).find((a) => old(g, a) && skyOf(g, a).flight >= 100 && !skyOf(g, a).lastDone) ?? null;
EVENTS.push({
  id: 'mount_last_flight', cooldown: 24, weight: 5, chance: () => 0.4,
  cond: (g) => isAdult(g) && !L(g).travel && !!elder(g),
  prepare: (g) => ({ id: elder(g).id }),
  title: '마지막으로 나는 날',
  text: (g, c) => { const a = alive(g).find((x) => x.id === c.id); return `${J(a.name, '이/가')} 요즘 날개를 다 펴지 못한다. 깃이 성기고 눈이 흐리다. 그런데 오늘 아침, 안장 걸이 앞에 와서 엎드렸다.`; },
  choices: [
    { label: '안장을 얹고 오른다', run: (g, rng, c) => { const a = alive(g).find((x) => x.id === c.id); if (!a) return '안장 걸이 앞은 비어 있었다.'; const r = skyOf(g, a); r.lastDone = true; stress(g, -10); if (rng.chance(0.35)) { bury(g, a, '마지막으로 하늘을 한 바퀴 돌고 내려앉아 다시 일어나지 않았다', 60); return `${J(a.name, '이/가')} 처음 날던 그 벼랑까지 날았다. 오래 원을 그렸다. 내려앉고 나서 고개를 내 무릎에 얹었다. 다시 들지 않았다.`; } a.bond = 100; return `천천히, 낮게 날았다. 고장 지붕들이 아래로 지나갔다. ${J(a.name, '이/가')} 숨을 고르며 내려앉았다. 이제 더는 나를 태우지 않을 것이다. 둘 다 알았다.`; } },
    { label: '쓰다듬고 우리로 돌려보낸다', run: (g, rng, c) => { const a = alive(g).find((x) => x.id === c.id); if (a) skyOf(g, a).lastDone = true; stress(g, 4); return '목을 쓸어 주고 우리로 데려갔다. 그날 밤 짐승은 오래 하늘을 올려다보았다.'; } },
  ],
});

/* ---------- 선대의 짐승이 새 주인을 시험한다 ---------- */
EVENTS.push({
  id: 'mount_heir_test', cooldown: 6, weight: 8, chance: () => 0.7,
  cond: (g) => isAdult(g) && !L(g).travel && (MS(g).heirTest ?? []).some((id) => alive(g).some((a) => a.id === id)),
  prepare: (g) => ({ id: MS(g).heirTest.find((id) => alive(g).some((a) => a.id === id)) }),
  title: '선대의 짐승',
  text: (g, c) => { const a = alive(g).find((x) => x.id === c.id); return `${J(a.name, '은/는')} 선대가 죽은 뒤로 우리 앞에 놓인 고기를 먹지 않는다. 내가 다가가면 날개를 펴고 몸을 크게 만든다. 날개대 사람들 말로는, 하늘 짐승은 새 주인을 한 번 시험한다고 한다.`; },
  choices: [
    { label: '눈을 피하지 않고 다가간다', run: (g, rng, c) => { const M = MS(g), a = alive(g).find((x) => x.id === c.id); M.heirTest = (M.heirTest ?? []).filter((x) => x !== c.id); if (!a) return '우리는 비어 있었다.'; if (check(rng, st(g, 'wil') * 0.6 + skill(g) * 0.6 + a.bond / 2, 60)) { a.bond = Math.min(100, a.bond + 20); return `한 걸음씩 다가갔다. ${J(a.name, '이/가')} ${a.kind === 'griffin' ? '부리를' : '주둥이를'} 내 얼굴 한 뼘 앞까지 들이밀었다. 숨이 뜨거웠다. 움직이지 않았다. 그것이 고개를 내렸다.`; } injure(g, '선대의 짐승에게 내동댕이쳐진 몸', 3); bury(g, a, '새 주인을 받아들이지 않고 산으로 날아갔다'); return '세 걸음째에 날개가 나를 쳤다. 일어나 보니 우리는 비어 있었다. 북쪽 하늘에 점 하나가 멀어졌다.'; } },
    { label: '한 달을 곁에서 지낸다', run: (g, rng, c) => { const a = alive(g).find((x) => x.id === c.id); if (a) a.bond = Math.min(100, a.bond + 8); tired(g, 15); return '우리 곁에 짚을 깔고 한 달을 잤다. 짐승은 아직 나를 주인으로 보지 않는다. 그래도 이제 고기는 먹는다.'; } },
    { label: '놓아준다', run: (g, rng, c) => { const M = MS(g), a = alive(g).find((x) => x.id === c.id); M.heirTest = (M.heirTest ?? []).filter((x) => x !== c.id); if (a) bury(g, a, '선대를 따라가듯 산으로 놓아 보냈다'); return '사슬을 풀었다. 짐승은 우리 문 앞에서 한 번 돌아보고 날아올랐다. 선대가 묻힌 쪽으로 한 바퀴 돌았다.'; } },
  ],
});

/* ---------- 달마다: 알, 싸움터, 무덤, 둥지와 날개대 ---------- */
export function mountMonth(g) {
  if (!g.mount || g.over || !g.date) return;
  const M = MS(g), now = mi(g);
  // 알: 품지 않은 달에는 식는다
  for (const e of [...M.eggs]) {
    if (M.brood !== now) e.warm -= 40;
    if (e.warm <= 0) { M.eggs = M.eggs.filter((x) => x !== e); mlog(g, `${SKY_INFO[e.kind].egg}: 식어 죽었다.`); g.news?.unshift({ text: `재 속의 ${J(SKY_INFO[e.kind].egg, '이/가')} 차갑게 식었다. 흔들어도 안에서 아무 소리가 나지 않는다.`, rel: 100 }); continue; }
    if (e.prog >= SKY_INFO[e.kind].hatch && !sceneQueued(g, 'mount_hatch')) { M.eggs = M.eggs.filter((x) => x !== e); queueScene(g, 'mount_hatch', { beast: e.kind, by: e.by }, { first: true }); }
  }
  // 하늘 짐승 기록: 새로 들인 것(밀매 알, 무너진 둥지)도 챙기고, 늙으면 날개가 무뎌진다
  for (const a of skyBeasts(g)) { const r = skyOf(g, a); if (old(g, a) && r.flight > 60 && g.date.month === 1) r.flight -= 5; }
  // 죽거나 떠난 하늘 짐승은 무덤 장부로
  const lost = g.beasts?.lost ?? [];
  if (M.seen > lost.length) M.seen = lost.length;
  for (const x of lost.slice(M.seen)) if (SKY.includes(x.kind)) M.graves.push({ name: x.name, kind: x.kind, y: x.year, years: x.years ?? 0, how: x.how });
  M.seen = lost.length;
  if (M.graves.length > 12) M.graves.splice(0, M.graves.length - 12);
  for (const id of Object.keys(M.sky)) if (!alive(g).some((a) => a.id === +id)) delete M.sky[id];
  // 날개대 사람이 아니게 되는 때: 탈 짐승이 없으면 둥지 탑에서 내려온다
  if (M.me.member && !skyBeasts(g).length) { M.me.member = null; M.me.served += 1; mlog(g, '탈 짐승을 잃고 날개대에서 내려왔다.'); g.news?.unshift({ text: '잿빛 날개대 둥지 탑의 내 칸에 다른 사람의 짚이 깔렸다. 짐승을 잃은 기수는 내려와야 한다.', rel: 100 }); }
  if (M.me.member && g.date.month % 3 === 0) g.player.money += BAND.wage[M.me.member.rank];
  // 싸움터: 원정 중에 탈 짐승이 있으면 하늘에서 적진을 본다
  const c = g.army?.campaign, a = rideable(g);
  if (c && a) {
    c.morale = Math.min(100, (c.morale ?? 60) + 2);
    if (!c.skySeen) { c.skySeen = true; g.news?.unshift({ text: `${J(nmK(a), '을/를')} 타고 적진 위를 날았다. 대장이 내 말을 듣고 진을 옮겼다.`, rel: 100 }); }
    if (mountRng(g, 7).chance(0.04)) { const r = skyOf(g, a); r.wounds += 1; a.bond = Math.max(0, a.bond - 3); g.news?.unshift({ text: `적의 쇠뇌 화살이 ${a.name}의 날개를 꿰뚫었다. 아직 날 수는 있다.`, rel: 100 }); }
  }
  worldMonth(g);
}
function worldMonth(g) {
  const M = MS(g), rng = mountRng(g, 3), tide = g.mana?.tide ?? 0;
  NEST_IDS.forEach((id, i) => {
    const x = M.nests[id], n = NESTS[id], r = mountRng(g, 40 + i);
    if (g.date.month === 3) x.eggs = n.per + (tide >= 45 ? 1 : 0) - (tide <= -45 ? 1 : 0);
    else if (g.date.month === 8) x.eggs = 0; // 철이 지나면 알은 깨거나 버려진다
    if (g.date.month >= 3 && g.date.month <= 7 && x.eggs > 0 && r.chance(0.05)) x.eggs -= 1; // 알 도둑들
    if (x.anger > 0) {
      x.anger -= 1;
      if (here(g) === n.from && r.chance(0.3)) g.news?.unshift({ text: `알을 잃은 ${KINDS[n.kind].name} 어미가 ${placeName(n.from)} 위를 맴돌다 ${n.kind === 'griffin' ? '짐말 한 필을' : '양 떼를'} 채 갔다. 사람들이 나를 본다.`, rel: 100 });
    }
  });
  if (g.date.month === 1) {
    const b = M.band, war = !!g.realm?.balhart?.war || !!g.realm?.north?.war;
    const d = rng.int(-1, 1) - (war && rng.chance(0.5) ? 1 : 0) + (tide >= 45 && rng.chance(0.3) ? 1 : 0);
    b.riders = clamp(b.riders + d, 3, 14); b.beasts = clamp(b.riders + rng.int(-1, 0), 2, 14);
    if (d < 0) b.lost += -d;
    if (rng.chance(0.06)) { b.captainN += 1; b.captain = BAND.captains[b.captainN % BAND.captains.length]; mlog(g, `잿빛 날개대 날개장이 ${J(b.captain, '으로/로')} 바뀌었다.`); }
  }
}
HOOKS.afterMonth.push((g) => { mountMonth(g); });

// 대를 이으면: 알과 짐승은 집에 남는다. 날개대 자리와 등에 오르는 법은 사람 몫이라, 짐승이 새 사람을 다시 시험한다
HOOKS.heir.push((g) => {
  if (!g.mount) return;
  const M = MS(g);
  if (M.me.member) { M.me.member = null; M.me.served += 1; }
  M.heirTest = [];
  for (const a of skyBeasts(g)) { const r = skyOf(g, a); r.flight = Math.min(r.flight, 50); r.lastDone = false; M.heirTest.push(a.id); }
  M.brood = null;
});
export { takeEgg };
