// 27단계: 불로의 길 '핏줄의 세월' (대가 있는 길). 진척은 pathState(g, 'bloodyears').
// 피의 셈으로 자식의 세월을 받아 산다. 받은 자식은 그만큼(열 해) 일찍 늙는다. 한 번 받은 세월은 열 해쯤 간다.
// 그 뒤에 다시 받지 않으면 불로가 풀리고, 멈춰 있던 세월이 한꺼번에 몸에 온다(몸 나이가 진짜 나이로 돌아간다).
// - 셈을 아는 사람(bloodyears_offer): 마흔다섯이 넘고 다 자란 자식이 있는 사람에게 떠돌이 피 의원이 찾아온다. 노아의 조각을 들었으면 더 잦다.
// - 받기(bloodyears_rite, 처음 한 번은 행동으로), 다시 받기(bloodyears_due, 때가 되면 장면으로).
// 다 자란 자식(16살 이상)에게서만 받는다. 받은 자식은 까닭 모를 병처럼 늙고, 언젠가 눈치챈다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, ageYears } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, note, stress, spend, canSpend, traveling } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { isJailed } from '../crime.js';
import { remember } from '../relations.js';
import { deed } from '../repute/index.js';
import { registerAgelessPath, makeAgeless, loseAgeless, pathState, playerAgeless, AG } from './core.js';
import { noahHint } from './noah.js';

registerAgelessPath('bloodyears', { name: '핏줄의 세월', kind: 'price', owner: '도우미스레드2', blurb: '자식의 세월을 열 해씩 받아 산다. 받은 자식은 그만큼 일찍 늙는다.' });

const mi = (g) => g.date.year * 12 + g.date.month;
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 109) ^ Math.imul(mi(g) * 83 + salt + 67, 2654435761)) | 0 });
const base = (g) => playerAge(g) >= 16 && !g.over && !L(g).heirPending;
const ready = (g) => base(g) && !traveling(g) && !isJailed(g) && !g.bondage?.slave && !g.army?.campaign && !g.army?.captive;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const YEARS = 10;
const P = (g) => { const s = pathState(g, 'bloodyears'); s.known ??= false; s.due ??= null; s.taken ??= []; s.offerAt ??= -99; return s; };
export const bloodyearsState = P;
// 다 자란 살아 있는 자식
export const grownKids = (g) => (me(g)?.childIds ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive && !p.isPlayer && ageYears(p) >= 16);
const onPath = (g) => playerAgeless(g) && AG(g).path === 'bloodyears';

export function bloodyearsInfo(g) {
  const s = P(g);
  if (!s.known && !s.taken.length) return null;
  return { known: s.known, dueIn: onPath(g) && s.due != null ? Math.max(0, Math.ceil((s.due - mi(g)) / 12)) : null, taken: s.taken.map((x) => ({ ...x })) };
}

function take(g, kid) {
  const s = P(g);
  kid.ageMonths += YEARS * 12;
  kid.affection = clamp((kid.affection ?? 0) - 8, -100, 100);
  remember(g, kid, '한 해 사이에 열 해가 늙었다', -2, { tag: 'bloodyears' });
  s.taken.push({ name: kid.name, y: g.date.year, age: ageYears(kid) });
  if (s.taken.length > 12) s.taken.shift();
  s.due = mi(g) + YEARS * 12;
  deed(g, 'kind', -4, '그 집 자식들은 유난히 빨리 늙는다는 말이 돈다');
}
const kidChoices = (g) => grownKids(g).slice(0, 3).map((p) => ({ key: `k${p.id}`, label: `${p.name}에게서 받는다`, hint: `${ageYears(p)}살. 열 해가 그 몸으로 간다` }));
const kidOf = (g, k) => grownKids(g).find((p) => `k${p.id}` === k) ?? null;

/* ---------- 셈을 아는 사람 ---------- */
defineScene('bloodyears_offer', {
  title: () => '떠돌이 피 의원',
  text: () => '거머리 상자를 멘 늙은 의원이 하룻밤 묵어 갔다. 새벽에 그가 내 손목을 짚더니 말했다. "세월이 빠르시군요. 늦출 수 있습니다. 피는 피끼리 셈을 합니다. 자식분 피에는 아직 쓰지 않은 세월이 많지요." 그는 값을 말하지 않았다. 값이 무엇인지는 말하지 않아도 알았다.',
  choices: (g) => (ready(g) && !P(g).known && !playerAgeless(g) ? [
    { key: 'learn', label: '셈하는 법을 배운다', hint: '은화 서른 닢. 배운다고 꼭 써야 하는 건 아니다' },
    { key: 'no', label: '문밖으로 내보낸다', hint: '' },
  ] : []),
  resolve(g, rng, s, k) {
    const st = P(g);
    st.offerAt = mi(g);
    if (!ready(g) || st.known) return '의원은 새벽 안개 속으로 가 버렸다.';
    if (k === 'learn' && canSpend(g, 30)) {
      spend(g, 30); st.known = true;
      note(g, '피로 세월을 셈하는 법을 배웠다.');
      return '의원은 사흘 동안 머물며 그 셈을 가르쳤다. 어렵지 않았다. 그게 가장 무서웠다. 떠나면서 그가 말했다. "처음 한 번이 어렵지요. 두 번째부터는 다들 쉽게 합니다."';
    }
    return '"그러시지요." 의원은 거머리 상자를 고쳐 메고 나갔다. 문턱에서 한 번 돌아보았다. 다시 오겠다는 얼굴이었다.';
  },
});

/* ---------- 받기 ---------- */
ACTIONS.push({
  id: 'bloodyears_rite', name: '자식의 세월을 받는다', icon: 'heart',
  desc: '피의 셈으로 다 자란 자식 하나의 세월을 열 해 받는다. 나는 늙기를 멈추고, 그 아이는 그만큼 늙는다.',
  available: (g) => ready(g) && P(g).known && !playerAgeless(g) && playerAge(g) >= 35 && grownKids(g).length > 0 && !sceneQueued(g, 'bloodyears_rite'),
  run(g) {
    queueScene(g, 'bloodyears_rite', {}, { first: true });
    return '의원이 남긴 칼과 그릇을 꺼내 놓았다. 오래 들여다보았다.';
  },
});
defineScene('bloodyears_rite', {
  title: () => '피의 셈',
  text: () => '셈은 밤에 한다. 받는 사람의 피 한 숟가락, 주는 사람의 피 한 숟가락. 주는 사람이 무엇을 주는지 알 필요는 없다고 의원은 말했다. 알면 셈이 흐려진다고.',
  choices: (g) => (ready(g) && P(g).known && !playerAgeless(g) && grownKids(g).length ? [...kidChoices(g), { key: 'no', label: '그릇을 엎는다', hint: '하지 않는다' }] : []),
  resolve(g, rng, s, k) {
    const kid = kidOf(g, k);
    if (!ready(g) || playerAgeless(g)) return '그릇은 그대로 식었다.';
    if (!kid) { stress(g, -2); return '그릇을 엎었다. 피 냄새가 오래 남았다. 그날 밤은 오랜만에 깊이 잤다.'; }
    take(g, kid);
    makeAgeless(g, 'bloodyears', { note: `${g.player.name}, 피의 셈으로 자식의 세월을 받았다. 몸이 멈췄다.` });
    stress(g, 12);
    return `${J(kid.name, '은/는')} 감기 기운이 있다며 일찍 잠자리에 들었다. 셈은 금방 끝났다. 아침에 거울을 보니 아무것도 달라지지 않았다. 달라진 건 ${kid.name} 쪽이었다. 한 달 사이에 관자놀이가 하얗게 셌다. ${J(kid.name, '은/는')} 웃으며 고생을 많이 했나 보다고 했다.`;
  },
});
defineScene('bloodyears_due', {
  title: () => '열 해가 지났다',
  text: () => '아침에 손등을 보았다. 열 해 만에 처음으로 주름 하나가 새로 생겼다. 셈의 기한이 다 됐다. 다시 받지 않으면, 멈춰 있던 세월이 한꺼번에 돌아온다.',
  choices: (g) => (base(g) && onPath(g) ? [...kidChoices(g), { key: 'stop', label: '더는 받지 않는다', hint: '멈춰 있던 세월이 한꺼번에 몸에 온다' }] : []),
  resolve(g, rng, s, k) {
    if (!base(g) || !onPath(g)) return '그 주름은 다음 날 보이지 않았다.';
    const kid = kidOf(g, k);
    if (kid) {
      take(g, kid);
      stress(g, 10);
      const n = P(g).taken.filter((x) => x.name === kid.name).length;
      if (n >= 2) { kid.affection = clamp((kid.affection ?? 0) - 25, -100, 100); remember(g, kid, '내 세월을 가져갔다는 걸 안다', -4, { tag: 'bloodyears' }); }
      return n >= 2 ? `${J(kid.name, '은/는')} 이번에는 알았다. 셈이 끝난 뒤 그 아이가 문간에 서 있었다. 나보다 늙어 보이는 얼굴로. 아무 말도 하지 않고 돌아섰다.` : `${kid.name}의 머리가 또 셌다. 의원들은 까닭을 모른다고 했다. 나는 그 의원들에게 약값을 대 주었다.`;
    }
    loseAgeless(g, '핏줄의 세월을 더 받지 않았다');
    stress(g, 8);
    note(g, '핏줄의 세월을 더 받지 않았다. 멈춰 있던 세월이 돌아왔다.');
    return `한 달 사이에 머리가 하얗게 셌다. 계단을 오르면 숨이 찼다. 거울 속의 얼굴이 진짜 내 나이를 따라잡았다. 이상하게도 아이들 얼굴을 보기가 쉬워졌다.`;
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const s = P(g);
  const now = mi(g);
  if (onPath(g) && s.due != null && now >= s.due && base(g) && !sceneQueued(g, 'bloodyears_due')) {
    if (!grownKids(g).length) { loseAgeless(g, '세월을 받을 자식이 남지 않았다'); note(g, '세월을 받을 자식이 남지 않았다. 멈춰 있던 세월이 돌아왔다.'); s.due = null; return; }
    queueScene(g, 'bloodyears_due', {}, { first: true }); s.due = now + 2; return;
  }
  if (s.known || playerAgeless(g) || !ready(g) || playerAge(g) < 45 || !grownKids(g).length || now - s.offerAt < 120) return;
  if (ownRng(g, 5).chance(noahHint(g, 'blood') ? 0.015 : 0.003)) { s.offerAt = now; queueScene(g, 'bloodyears_offer', {}); }
});
