// 27단계 불로, 대가 있는 길: 봉인의 숨. (도우미스레드3)
// 쐐기 틈으로 마신의 숨이 샌다. 그것을 들이마신 사람은 늙지 않는다. 대신 한 해 살 때마다 봉인이 깎이고(realm.seal),
// 들키면 쐐기를 지키는 교단·마탑·드워프·엘프가 쫓는다. 봉인이 새로 묶이면 숨이 끊기고, 밀린 세월이 한꺼번에 온다.
// 실마리: 봉인이 흔들리기 시작한 뒤(단계 2 이상) 쐐기 고장에서, 늙지 않는 경비병 이야기를 듣는다.
//   pathState(g,'sealbreath') = { heard, wedge, hunted(달), seen, drawn }
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { me } from '../game.js';
import { ageYears } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired } from '../adventure/core.js';
import { addNotoriety } from '../crime.js';
import { WEDGES, SS, stageOf, mi, slog } from '../seal/state.js';
import { registerAgelessPath, makeAgeless, loseAgeless, pathState, isAgeless, AG, agelessYears } from './core.js';
import { freeAge, clampN } from './seventh.js';

const BV = (g) => pathState(g, 'sealbreath');
const st = (g, k) => g.player.stats[k] ?? 0;
const here = (g) => L(g).place;
const mine = (g) => AG(g).path === 'sealbreath' && isAgeless(me(g));
// 숨이 새는 쐐기: 이 고장의 쐐기 (깨졌거나 도둑맞았으면 더 세게 샌다)
const wedgeHere = (g) => Object.keys(WEDGES).find((id) => WEDGES[id].place && WEDGES[id].place === here(g)) ?? null;
const shaken = (g) => !!g.realm && Number.isFinite(g.realm.seal) && stageOf(g.realm.seal) >= 2 && !g.seal?.ending;

registerAgelessPath('sealbreath', {
  name: '봉인의 숨', kind: 'price', owner: '도우미스레드3',
  blurb: '쐐기 틈으로 새는 마신의 숨을 마셨다. 늙지 않는다. 한 해 살 때마다 봉인이 깎인다.',
  onLose: (g) => { const v = BV(g); v.hunted = 0; },
});

/* ---------- 실마리: 늙지 않는 경비병 ---------- */
EVENTS.push({
  id: 'sealbreath_rumor', cooldown: 60, weight: 2,
  chance: () => 0.25,
  cond: (g) => freeAge(g) && shaken(g) && !!wedgeHere(g) && !BV(g).heard && !isAgeless(me(g)) && ageYears(me(g)) >= 25,
  prepare: (g) => ({ w: wedgeHere(g) }),
  title: '늙지 않는 경비병',
  text: (g, c) => `${WEDGES[c.w].keeper}의 늙은 문지기가 술에 취해 떠들었다. "${WEDGES[c.w].name} 밑을 지키던 놈이 하나 있었소. 서른 해를 지켰는데 얼굴이 처음 왔을 때 그대로였지. 밤마다 틈에 코를 대고 있었다고. 어느 날 이단심문관들이 끌고 갔소. 끌려가면서 웃더이다."`,
  choices: [
    { label: '술값을 내주고 일어선다', run: () => '취한 늙은이의 이야기다. 그래도 그 웃음이라는 말이 귀에 남았다.' },
    { label: '"그 틈이 어디요?"', run: (g, rng, c) => { const v = BV(g); v.heard = true; v.wedge = c.w; return `늙은이는 입을 다물었다가, 은화 한 닢에 다시 열었다. "${WEDGES[c.w].name}. 맨 아래 돌 사이. 냄새가 나오. 쇠 녹는 냄새." 그는 덧붙였다. "마시는 놈은 늙지 않지. 그 대신 봉인이 그만큼 얇아진다더군."`; } },
  ],
});

/* ---------- 숨을 마시러 간다 ---------- */
ACTIONS.push({
  id: 'sealbreath_seek', name: '쐐기 틈을 찾아간다', icon: 'magic',
  desc: '늙지 않는 경비병 이야기의 그 틈. 쐐기 맨 아래 돌 사이로 쇠 녹는 냄새가 샌다고 했다.',
  available: (g) => freeAge(g) && shaken(g) && BV(g).heard && wedgeHere(g) === BV(g).wedge && !isAgeless(me(g)) && !sceneQueued(g, 'sealbreath_draw'),
  run(g) { queueScene(g, 'sealbreath_draw', { w: wedgeHere(g) }, { first: true }); return '밤이 깊기를 기다려 쐐기를 지키는 문 근처를 서성였다.'; },
});
defineScene('sealbreath_draw', {
  title: (g, s) => WEDGES[s.w]?.name ?? '쐐기',
  text: (g, s) => `${WEDGES[s.w].keeper}의 파수가 두 번 지나갔다. 계단 맨 아래, 봉인 술식이 새겨진 돌 사이에서 쇠 녹는 냄새가 올라온다. 숨을 들이켜면 가슴 안쪽이 차가워질 것이다. 그 틈은 오백 년 전 누군가 목숨으로 막은 자리다.`,
  choices: (g, s) => (freeAge(g) && here(g) === WEDGES[s.w]?.place && shaken(g) && !isAgeless(me(g)) ? [{ label: '돌아선다', key: 'leave' }, { label: '틈에 얼굴을 댄다', key: 'draw' }] : []),
  resolve(g, rng, s, key) {
    const v = BV(g);
    if (key === 'leave') return '계단을 다시 올라왔다. 냄새가 옷에 배어 사흘 동안 빠지지 않았다.';
    if (isAgeless(me(g)) || !shaken(g)) return '틈은 막혀 있었다. 새 술식이 덧씌워져 있었다.';
    tired(g, 15);
    if (!check(rng, st(g, 'agi') + st(g, 'sen') / 2, 70)) {
      injure(g, '파수의 창에 찔린 옆구리', 2); addNotoriety(g, 6);
      v.hunted = mi(g) + 24;
      return '세 걸음 남기고 파수의 등불이 나를 비췄다. 창끝이 옆구리를 스쳤다. 겨우 달아났다. 얼굴을 본 사람이 있다.';
    }
    v.drawn = (v.drawn ?? 0) + 1;
    makeAgeless(g, 'sealbreath', { note: `${J(g.player.name, '이/가')} 쐐기 틈에서 마신의 숨을 마셨다. 몸이 ${ageYears(me(g))}살에서 멈췄다.` });
    if (g.realm) g.realm.seal = clampN(g.realm.seal - 1, 0, 100);
    if (g.seal?.me) g.seal.me.exploit += 1;
    slog(g, `${WEDGES[s.w].name}의 틈이 조금 더 벌어졌다. 누가 그 틈에 손을 댔다.`);
    stress(g, 12);
    note(g, '마신의 숨을 마셨다. 늙지 않는다. 봉인이 그만큼 얇아진다.');
    return '숨을 들이켰다. 차가운 것이 목을 타고 내려가 가슴 밑바닥에 고였다. 귀 안쪽에서 아주 큰 것이 숨을 쉬는 소리가 들렸다. 손등을 보았다. 주름이 그대로다. 내일도 그대로일 것이다. 그 소리도 그럴 것이다.';
  },
});

/* ---------- 대가: 한 해 살 때마다 봉인이 깎인다, 들키면 쫓긴다 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !mine(g)) return;
  const v = BV(g);
  // 봉인이 새로 묶이면 숨이 끊긴다
  if (g.seal?.ending === 'resealed') {
    loseAgeless(g, '봉인이 새로 묶여 숨이 끊김');
    note(g, '봉인이 새로 묶였다. 가슴 밑바닥의 차가운 것이 사라졌다. 밀린 세월이 한꺼번에 몸으로 왔다.');
    chron(g, `${J(g.player.name, '은/는')} 봉인이 새로 묶인 날 하룻밤 새 늙었다.`, 80);
    return;
  }
  if (g.realm && Number.isFinite(g.realm.seal) && !g.seal?.ending) g.realm.seal = clampN(g.realm.seal - 0.07, 0, 100);
  if (g.seal?.me && g.date.month === 12) g.seal.me.exploit += 0.5;
  if (!v.seen && agelessYears(g) >= 3 && !sceneQueued(g, 'sealbreath_hunt') && rng.chance(0.006 + (v.hunted > mi(g) ? 0.02 : 0))) { v.seen = true; queueScene(g, 'sealbreath_hunt', {}); }
});
defineScene('sealbreath_hunt', {
  title: () => '쐐기를 지키는 사람들',
  text: (g) => `회색 망토 둘과 마탑의 감찰관 하나가 집 앞에 섰다. "${J(g.player.name, '은/는')} 몇 해째 얼굴이 그대로라고 들었소. 봉인이 이렇게 얇아진 것과 상관이 있는지 묻고 싶소." 그들 뒤에 사슬을 든 병사들이 있다.`,
  choices: (g) => (mine(g) && !g.over ? [{ label: '숨을 내려놓겠다고 한다', key: 'yield' }, { label: '모른다고 잡아뗀다', key: 'deny' }, { label: '밤에 달아난다', key: 'flee' }] : []),
  resolve(g, rng, s, key) {
    const v = BV(g);
    if (!mine(g)) return '그들은 내 얼굴을 한참 보더니 돌아갔다. 이제 볼 것이 없었다.';
    if (key === 'yield') {
      loseAgeless(g, '봉인 지키는 이들에게 숨을 내려놓음');
      if (g.faith) g.faith.suspicion = clampN((g.faith.suspicion ?? 0) + 5, 0, 100);
      return '이단심문관이 가슴에 손을 얹고 기도문을 읽었다. 차가운 것이 목으로 올라와 빠져나갔다. 거울을 보지 않았다. 손등만 보아도 알 수 있었다.';
    }
    if (key === 'deny') {
      if (check(rng, st(g, 'cha') + st(g, 'wil') / 2, 80)) { v.seen = false; return '그들은 끝내 증거를 대지 못했다. 다만 감찰관이 돌아서며 말했다. "다음엔 증거를 들고 오겠소."'; }
      v.hunted = mi(g) + 48; addNotoriety(g, 15);
      if (g.faith) g.faith.suspicion = clampN((g.faith.suspicion ?? 0) + 15, 0, 100);
      injure(g, '심문 끝에 남은 상처', 2);
      return '그들은 나를 끌고 가 사흘을 물었다. 풀려났을 때 이름에 이단의 냄새가 붙어 있었다. 그들은 다시 올 것이다.';
    }
    v.hunted = mi(g) + 60; v.seen = false; addNotoriety(g, 10); stress(g, 15);
    L(g).renown = Math.max(0, (L(g).renown ?? 0) - 5);
    return '그날 밤 가진 것을 자루 하나에 넣고 뒷문으로 나왔다. 늙지 않는 몸으로 사는 법을 하나 배웠다. 오래 머물지 않는 것.';
  },
});

export function sealbreathInfo(g) {
  const v = BV(g);
  return { heard: !!v.heard, wedge: v.wedge ? WEDGES[v.wedge].name : null, hunted: v.hunted > mi(g) ? v.hunted - mi(g) : 0 };
}
export { SS };
