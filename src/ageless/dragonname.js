// 27단계: 불로의 길 '용의 참이름' (대가 없는 길). 진척은 pathState(g, 'dragonname').
// 고대어 조각을 다섯 모아 잠든 용왕의 참이름을 끝까지 부르면, 용이 피 한 방울을 준다. 그 피를 마시면 몸이 멈춘다.
// - 길을 알게 되는 일(heard): 노아의 조각(noahHint dragon), 눈먼 용왕의 꿈, 용과 말을 섞어 본 적이 있음(dragon me.talks).
// - 조각 모으기: dragonname_study (세레니아·쇠망치 골·성도 서고, 글 30↑) / 용의 땅 어귀에서 옛 비석(dragonname_tablet).
// - 부르기: 용의 땅 어귀(gorge·hammer)에서 잠들었거나 뒤척이는 용왕에게 dragonname_call. 틀리면 용이 깬다.
// 대가는 없다. 다만 닿기가 어렵고, 한 번 틀리면 그 용왕 앞에서는 다시 부를 수 없다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, stress, check, traveling, tired } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { isJailed } from '../crime.js';
import { registerAgelessPath, makeAgeless, pathState, playerAgeless } from './core.js';
import { DS, DRAGONS, SLEEPERS, GATES } from '../dragon/state.js';
import { noahHint } from './noah.js';

registerAgelessPath('dragonname', { name: '용의 참이름', kind: 'free', owner: '도우미스레드2', blurb: '잠든 용왕의 참이름을 끝까지 불러 받은 피 한 방울.' });

const mi = (g) => g.date.year * 12 + g.date.month;
const here = (g) => L(g).place ?? 'ern';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 107) ^ Math.imul(mi(g) * 79 + salt + 61, 2654435761)) | 0 });
const stat = (g, id) => g.player.stats?.[id] ?? 0;
const skill = (g, id) => g.player.skills?.[id] ?? 0;
const base = (g) => playerAge(g) >= 16 && !g.over && !L(g).heirPending;
const ready = (g) => base(g) && !traveling(g) && !isJailed(g) && !g.bondage?.slave && !g.army?.campaign && !g.army?.captive;
const P = (g) => { const s = pathState(g, 'dragonname'); s.frags ??= 0; s.heard ??= false; s.studyAt ??= -99; s.failed ??= []; s.sceneAt ??= 0; return s; };
export const NEED = 5;
const ARCHIVES = ['serenia', 'hammer', 'solaris'];

export const dragonnameState = P;
const callable = (g) => SLEEPERS.filter((id) => { const d = DS(g).dragons?.[id]; return d && ['sleep', 'stir'].includes(d.state) && !P(g).failed.includes(id) && (d.known ?? 0) >= 1; });
const heardNow = (g) => noahHint(g, 'dragon') || (DS(g).me?.talks ?? 0) > 0 || !!g.flags?.dragon_dream;

export function dragonnameInfo(g) {
  const s = P(g);
  if (!s.heard) return null;
  return { frags: s.frags, need: NEED, word: s.frags >= NEED ? '참이름을 다 맞췄다' : s.frags >= 3 ? '이름의 절반이 넘게 보인다' : s.frags >= 1 ? '첫 음절 몇 개' : '아무것도 모른다', failed: s.failed.map((id) => DRAGONS[id]?.name ?? '용왕') };
}

/* ---------- 조각 ---------- */
ACTIONS.push({
  id: 'dragonname_study', name: '고대어 조각을 맞춘다', icon: 'scroll',
  desc: '용의 말로 쓰인 옛 기록을 읽는다. 용왕의 참이름은 한 곳에 다 적혀 있지 않다.',
  available: (g) => ready(g) && !playerAgeless(g) && P(g).heard && P(g).frags < NEED && ARCHIVES.includes(here(g)) && skill(g, 'letters') >= 30 && mi(g) - P(g).studyAt >= 3,
  run(g, rng) {
    const s = P(g);
    s.studyAt = mi(g);
    tired(g, 8); gainSkill(g, 'letters', 0.5, 'int');
    if (check(rng, skill(g, 'letters') * 0.5 + stat(g, 'int') * 0.5 - s.frags * 4, 42)) {
      s.frags += 1;
      return s.frags >= NEED
        ? '마지막 조각이 맞았다. 다섯 장의 베낌을 나란히 놓자 한 줄의 소리가 되었다. 소리 내어 읽지는 않았다. 그 이름은 부를 자리에서만 불러야 한다.'
        : rng.pick([
          `드워프 비문의 탁본 귀퉁이에 용의 글자 세 개가 있었다. 사람의 목으로 내기 어려운 소리다. 조각이 ${s.frags}개가 되었다.`,
          `마탑 금서 목록에 없는 두루마리에서 한 음절을 찾았다. 그 음절은 '불'과 '잠'을 함께 뜻한다. 조각이 ${s.frags}개.`,
        ]);
    }
    return rng.pick([
      '하루 종일 같은 글자를 노려보았다. 글자가 나를 노려보는 것 같았다.',
      '읽은 줄 알았던 조각이 다른 용왕의 것이었다. 이름이 섞이면 부르는 순간 끝이다.',
    ]);
  },
});
defineScene('dragonname_tablet', {
  title: () => '얼음 밑 비석',
  text: () => '고갯길 옆 얼음이 녹은 자리에 반쯤 드러난 비석이 있다. 사람의 글이 아니다. 긁힌 자국 같은 글자가 둥글게 감겨 있다. 가운데에 무언가를 부르는 듯한 같은 모양이 세 번 되풀이된다.',
  choices: (g) => (ready(g) && P(g).heard && P(g).frags < NEED ? [
    { key: 'copy', label: '해 질 때까지 베낀다', hint: '손이 얼어도' },
    { key: 'no', label: '지나친다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    const st = P(g);
    if (!ready(g) || st.frags >= NEED) return '눈이 비석을 다시 덮었다.';
    if (k === 'no') return '지나쳤다. 내려오는 길 내내 그 모양이 눈앞에 어른거렸다.';
    tired(g, 10);
    if (check(rng, skill(g, 'letters') * 0.4 + stat(g, 'sen') * 0.6, 35)) { st.frags += 1; return `손가락이 굳을 때까지 베꼈다. 내려와서 펼쳐 보니 한 군데도 틀리지 않았다. 조각이 ${st.frags}개가 되었다.`; }
    return '베끼던 중에 눈보라가 몰아쳤다. 종이는 바람에 날아갔다. 기억에 남은 건 모양 하나뿐이다.';
  },
});

/* ---------- 부르기 ---------- */
ACTIONS.push({
  id: 'dragonname_call', name: '잠든 용왕의 참이름을 부른다', icon: 'torch',
  desc: '용의 땅 어귀에서 잠든 용왕을 찾아가 그 이름을 끝까지 부른다. 틀리면 용이 깬다.',
  available: (g) => ready(g) && !playerAgeless(g) && P(g).frags >= NEED && GATES.includes(here(g)) && callable(g).length > 0 && !sceneQueued(g, 'dragonname_call'),
  run(g, rng) {
    const id = rng.pick(callable(g));
    queueScene(g, 'dragonname_call', { dragon: id }, { first: true });
    return `${DRAGONS[id].lair}까지 이레를 올랐다. 굴 어귀에서 뜨거운 숨이 규칙적으로 흘러나온다.`;
  },
});
defineScene('dragonname_call', {
  title: (g, s) => `${DRAGONS[s.dragon]?.name ?? '용왕'}의 굴`,
  text: (g, s) => `${J(DRAGONS[s.dragon]?.name ?? '용왕', '이/가')} 비늘 더미처럼 엎드려 잠들어 있다. 숨 한 번에 굴 안의 공기가 통째로 바뀐다. 다섯 장의 베낌을 마지막으로 떠올렸다. 사람의 목으로 끝까지 부를 수 있을지는 불러 봐야 안다.`,
  choices: (g, s) => {
    const d = DS(g).dragons?.[s.dragon];
    if (!ready(g) || playerAgeless(g) || P(g).frags < NEED || !d || !['sleep', 'stir'].includes(d.state)) return [];
    return [
      { key: 'call', label: '이름을 끝까지 부른다', hint: '머리와 의지가 버팀목이다' },
      { key: 'back', label: '조용히 물러난다', hint: '다음에' },
    ];
  },
  resolve(g, rng, s, k) {
    const st = P(g), d = DS(g).dragons?.[s.dragon];
    if (!ready(g) || !d || playerAgeless(g)) return '굴은 비어 있었다.';
    if (k === 'back') return '한 걸음씩 뒷걸음질로 나왔다. 굴 밖의 바람이 이렇게 차가운 줄 몰랐다.';
    const name = DRAGONS[s.dragon].name;
    if (check(rng, stat(g, 'int') * 0.4 + stat(g, 'wil') * 0.5 + skill(g, 'letters') * 0.2, 50)) {
      makeAgeless(g, 'dragonname', { note: `${g.player.name}, ${name}의 참이름을 불러 피 한 방울을 받았다. 몸이 멈췄다.` });
      note(g, `${name}에게서 피 한 방울을 받았다.`);
      gainStat(g, 'wil', 1);
      return `마지막 음절에서 목이 찢어지는 것 같았다. 숨소리가 멎었다. 눈꺼풀 하나가 천천히 올라갔다. 용왕은 아무 말도 하지 않았다. 앞발의 비늘 틈에서 피 한 방울이 맺혀 돌바닥에 떨어졌다. 그것을 혀에 대었다. 뜨겁지 않았다. 아무 맛도 나지 않았다. 굴을 나올 때, 무언가가 내 안에서 멈춘 것을 알았다.`;
    }
    st.failed.push(s.dragon);
    d.sleep = Math.max(0, (d.sleep ?? 50) - 25);
    if (d.state === 'sleep') d.state = 'stir';
    stress(g, 15);
    if (rng.chance(0.25)) { L(g).pendingDeath = `${name}의 굴에서 참이름을 잘못 불렀다`; return '세 번째 음절이 어긋났다. 숨소리가 바뀌었다. 그것이 마지막으로 들은 소리였다.'; }
    g.player.fatigue = Math.min(100, g.player.fatigue + 30);
    return `세 번째 음절이 어긋났다. 굴 안의 공기가 한꺼번에 뜨거워졌다. 정신없이 굴러 나왔다. 등 뒤에서 ${J(name, '이/가')} 뒤척이는 소리가 산을 울렸다. 그 이름은 이제 내 입으로는 다시 부를 수 없다.`;
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const s = P(g);
  if (!s.heard && base(g) && heardNow(g)) s.heard = true;
  if (!ready(g) || !s.heard || s.frags >= NEED || playerAgeless(g) || mi(g) - s.sceneAt < 6) return;
  if (!GATES.includes(here(g))) return;
  if (ownRng(g, 5).chance(0.04)) { s.sceneAt = mi(g); queueScene(g, 'dragonname_tablet', {}); }
});
