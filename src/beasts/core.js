// 짐승과 함께: 개·말·군마·매를 기르고, 마법사는 사역마를 부르고, 마수를 길들여 팔거나 곁에 둔다.
// - 짐승은 game.beasts.animals에 산다. 사람(NPC)이 아니다. { id, kind, name, born, bond, trained, alive, how, died }
// - 짐승은 늙는다. 종마다 수명이 있고, 늙으면 약해지고, 언젠가 죽는다. 기르는 데 달마다 먹이 값이 든다.
// - 말과 군마는 길을 빠르게 한다(길 위의 달 수가 준다). 개·군마·마수·사역마는 싸움에 힘을 보탠다(POWER_BONUS).
// - 사역마는 마법사의 영혼에 묶여 있다. 주인이 죽으면 함께 사라진다. 다른 짐승은 대를 이어 집안에 남는다.
import { HOOKS } from '../hooks.js';
import { SKILLS } from '../data.js';
import { POWER_BONUS } from '../adventure/combat.js';
import { L, note, chron, stress } from '../adventure/core.js';
import { circleOf } from '../game.js';
import { J } from '../narrative/text.js';

/* ---------- 새 기술: 짐승 다루기 ---------- */
if (!SKILLS.some((s) => s.id === 'animals')) SKILLS.push({ id: 'animals', name: '짐승 다루기' });
const fillSkill = (g) => { if (g.player?.skills && g.player.skills.animals == null) g.player.skills.animals = 0; };

/* ---------- 짐승의 종류 ---------- */
// life: 수명(해) [보통, 길게], pow: 싸움에 보태는 힘(다 자라고 길들었을 때), feed: 달마다 먹이 값(은화)
// ride: 탈것, hunt: 사냥을 돕는다, train: 다 길들이는 데 드는 품(100이면 다 길듦), price: 장터 값
export const KINDS = {
  dog: { name: '개', life: [10, 15], pow: 4, feed: 0.4, hunt: 6, train: 40, price: 8, desc: '사냥을 돕고, 집을 지키고, 길을 잃으면 냄새로 길을 찾는다.', names: ['바람', '검댕', '보리', '누렁', '늑대', '번개', '꼬리', '방울', '솔', '그림자'] },
  horse: { name: '말', life: [20, 28], pow: 2, feed: 0.8, ride: 1, train: 30, price: 40, desc: '타고 다니면 길이 빨라진다. 짐도 진다.', names: ['밤톨', '갈기', '구름', '새벽', '들판', '강', '별', '흰발'] },
  warhorse: { name: '군마', life: [18, 24], pow: 9, feed: 1.6, ride: 1, train: 60, price: 120, desc: '싸움터에 길든 큰 말. 기병이 되려면 있어야 한다. 비싸고, 많이 먹는다.', names: ['철갑', '폭풍', '검은 바람', '왕관', '천둥', '붉은 갈기'] },
  hawk: { name: '매', life: [12, 18], pow: 1, feed: 0.3, hunt: 8, train: 130, price: 30, desc: '귀족의 놀이이자 사냥꾼의 눈. 길들이는 데 오래 걸린다. 다 길들면 매사냥을 할 수 있다.', names: ['칼날', '하늘', '송곳', '은빛', '날개', '번득'] },
  familiar: { name: '사역마', life: [60, 90], pow: 3, feed: 0, train: 0, price: 0, familiar: true, desc: '마력으로 맺은 짐승. 주인의 눈과 귀가 되고, 마력을 다루는 것을 돕는다. 주인과 함께 사라진다.', names: ['노크스', '이르', '사벨', '모르', '키아', '엘름'] },
  direwolf: { name: '서리늑대', life: [14, 18], pow: 12, feed: 1.2, hunt: 8, train: 260, price: 160, beast: true, desc: '북쪽 숲의 큰 늑대. 길들면 누구보다 충직하다. 길들기 전에는 누구보다 위험하다.', names: ['서리', '잿빛', '눈발', '송곳니', '울음'] },
  shadowcat: { name: '그림자 표범', life: [16, 22], pow: 14, feed: 1.4, train: 300, price: 220, beast: true, desc: '마력에 물든 숲의 표범. 어둠 속에서 몸이 흐려진다. 귀족들이 진열장 대신 우리에 넣고 싶어 한다.', names: ['안개', '먹물', '그늘', '침묵'] },
  wyvern: { name: '와이번', life: [40, 60], pow: 22, feed: 3, ride: 2, train: 520, price: 600, beast: true, desc: '용의 먼 친척. 다 자라 길들면 사람을 태우고 난다. 왕국 안에서 기르면 사람들이 겁을 먹는다.', names: ['재날개', '붉은 꼬리', '하늘 이빨', '폭풍 비늘'] },
};
export const KIND_IDS = Object.keys(KINDS);
export const FAMILIAR_FORMS = [
  { id: 'raven', name: '까마귀', text: '검은 깃털 끝이 푸르게 빛난다. 먼 데서 본 것을 꿈으로 보여 준다.' },
  { id: 'cat', name: '검은 고양이', text: '눈동자 속에 작은 불꽃이 있다. 거짓말을 하는 사람 앞에서 꼬리를 세운다.' },
  { id: 'owl', name: '흰 올빼미', text: '밤에만 말을 한다. 글자를 읽을 줄 안다.' },
  { id: 'fox', name: '은여우', text: '그림자가 꼬리 셋으로 갈라진다. 위험을 먼저 냄새 맡는다.' },
];
export const MAX_ANIMALS = 4;

/* ---------- 상태 ---------- */
export function defaultBeasts() {
  return { animals: [], seq: 0, debt: 0, fightsSeen: 0, cool: 0, lost: [], log: [], sold: 0 };
}
export function B(g) {
  if (!g.beasts) g.beasts = defaultBeasts();
  return g.beasts;
}
HOOKS.newGame.push((g) => { g.beasts = defaultBeasts(); fillSkill(g); });
HOOKS.migrate.push((g) => {
  const b = Object.assign(defaultBeasts(), g.beasts ?? {});
  for (const k of ['animals', 'lost', 'log']) if (!Array.isArray(b[k])) b[k] = [];
  b.animals = b.animals.filter((a) => a && KINDS[a.kind]);
  g.beasts = b;
  fillSkill(g);
});
// 대 잇기: 사역마는 주인과 함께 사라진다. 다른 짐승은 집안에 남지만 정은 다시 쌓아야 한다.
HOOKS.heir.push((g) => {
  const b = B(g);
  for (const a of b.animals) {
    if (!a.alive) continue;
    if (KINDS[a.kind].familiar) { a.alive = false; a.how = '주인을 따라 사라졌다'; a.died = g.date.year; b.lost.push({ name: a.name, kind: a.kind, year: g.date.year, how: a.how }); continue; }
    a.bond = Math.round(a.bond * 0.5);
    if (KINDS[a.kind].beast && a.bond < 30 && a.trained >= 100) { a.alive = false; a.how = '주인이 죽자 숲으로 돌아갔다'; a.died = g.date.year; b.lost.push({ name: a.name, kind: a.kind, year: g.date.year, how: a.how }); }
  }
  b.animals = b.animals.filter((a) => a.alive);
  b.debt = 0;
  if (b.animals.length) note(g, `선대가 기르던 짐승들(${b.animals.map((a) => a.name).join(', ')})이 낯선 눈으로 나를 본다.`);
});

export const mi = (g) => g.date.year * 12 + g.date.month;
export const alive = (g) => B(g).animals.filter((a) => a.alive);
export const ageOf = (g, a) => (mi(g) - a.born) / 12;
export const hasKind = (g, kind) => alive(g).some((a) => a.kind === kind && (a.trained ?? 0) >= 100);
export const familiarOf = (g) => alive(g).find((a) => a.kind === 'familiar') ?? null;
export const mountOf = (g) => alive(g).filter((a) => KINDS[a.kind].ride && a.trained >= 100 && !old(g, a)).sort((x, y) => KINDS[y.kind].ride - KINDS[x.kind].ride)[0] ?? null;
export const old = (g, a) => ageOf(g, a) >= KINDS[a.kind].life[0] * 0.8;
export const young = (g, a) => ageOf(g, a) < (KINDS[a.kind].beast ? 2 : 1);
export const kindName = (a) => (a.kind === 'familiar' ? `사역마 ${a.form ?? ''}`.trim() : KINDS[a.kind]?.name ?? '짐승');
export const fullName = (a) => `${kindName(a)} ${a.name}`;
export const BOND_WORD = (v) => (v >= 80 ? '한몸 같다' : v >= 55 ? '잘 따른다' : v >= 30 ? '아직 서먹하다' : v >= 10 ? '눈치를 본다' : '언제 달아날지 모른다');
export const AGE_WORD = (g, a) => { const y = ageOf(g, a); const L0 = KINDS[a.kind].life[0]; return young(g, a) ? '어리다' : y >= L0 ? '아주 늙었다' : y >= L0 * 0.8 ? '늙었다' : y >= L0 * 0.4 ? '한창이다' : '젊다'; };

export function addAnimal(g, kind, { name, ageYears = 0, trained = 0, bond = 30, form = null } = {}) {
  const b = B(g);
  if (alive(g).length >= MAX_ANIMALS || !KINDS[kind]) return null;
  const used = new Set(alive(g).map((a) => a.name));
  const pool = KINDS[kind].names.filter((n) => !used.has(n));
  const a = { id: ++b.seq, kind, name: name ?? (pool[(b.seq * 7) % Math.max(1, pool.length)] ?? `${KINDS[kind].name}${b.seq}`), born: mi(g) - Math.round(ageYears * 12), bond, trained, alive: true, how: null, died: null, form, since: g.date.year };
  b.animals.push(a);
  return a;
}
export function bury(g, a, how, chronRel = 0) {
  const b = B(g);
  a.alive = false; a.how = how; a.died = g.date.year;
  b.lost.push({ name: a.name, kind: a.kind, year: g.date.year, how, years: Math.round(ageOf(g, a)) });
  b.animals = b.animals.filter((x) => x.alive);
  if (a.bond >= 60) stress(g, KINDS[a.kind].familiar ? 25 : 12);
  note(g, `${J(fullName(a), '이/가')} ${how}.`);
  if (chronRel) chron(g, `${g.player.name}의 ${fullName(a)}, ${how}.`, chronRel);
}
export function logBeast(g, text) { B(g).log.push({ y: g.date.year, text }); }

/* ---------- 싸움에 보태는 힘 ---------- */
export function beastPow(g, a) {
  const K = KINDS[a.kind];
  if (!K.pow || young(g, a)) return 0;
  const tr = K.familiar ? 1 : Math.min(1, (a.trained ?? 0) / 100);
  const fam = K.familiar ? circleOf(g) * 1.5 : 0;
  const ageMul = old(g, a) ? 0.6 : 1;
  return (K.pow * tr + fam) * ageMul * (0.7 + a.bond / 330);
}
// 가장 센 둘까지만 함께 싸운다
export function beastsPower(g) {
  return alive(g).map((a) => beastPow(g, a)).sort((x, y) => y - x).slice(0, 2).reduce((s, v) => s + v, 0);
}
POWER_BONUS.push((g) => (g.beasts ? beastsPower(g) : 0));
export const huntBonus = (g) => alive(g).reduce((s, a) => s + ((KINDS[a.kind].hunt ?? 0) * Math.min(1, (a.trained ?? 0) / 100) * (old(g, a) ? 0.5 : 1)), 0);

/* ---------- 탈것: 길이 빨라진다 ---------- */
// 길 위의 달을 줄이는 일은 places.js가 한 달을 빼기 전에 해야 하므로 맨 앞에 끼운다
HOOKS.afterActions.unshift((g) => {
  const t = L(g).travel;
  if (!t || t.sea || t.mounted || t.forced) return;
  const m = mountOf(g);
  t.mounted = true;
  if (!m || t.left < 2) return;
  const cut = KINDS[m.kind].ride >= 2 ? Math.ceil(t.left / 2) : Math.max(1, Math.floor(t.left / 3));
  t.left = Math.max(1, t.left - cut);
  m.bond = Math.min(100, m.bond + 2);
  g.news?.unshift({ text: `${J(fullName(m), '을/를')} 타고 가니 길이 ${cut}달 줄었다.`, rel: 100 });
});

/* ---------- 달마다: 먹이, 늙음, 싸움에서 다침 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const b = B(g);
  const list = alive(g);
  if (!list.length) { b.fightsSeen = L(g).stats.fights ?? 0; return; }
  // 먹이 값
  const feed = list.reduce((s, a) => s + (KINDS[a.kind].feed ?? 0) * (young(g, a) ? 0.6 : 1), 0);
  b.debt += feed;
  const pay = Math.floor(b.debt);
  if (pay > 0) {
    if (g.player.money >= pay) { g.player.money -= pay; b.debt -= pay; b.hungry = 0; }
    else {
      b.hungry = (b.hungry ?? 0) + 1;
      b.debt = Math.min(b.debt, 6);
      for (const a of list) a.bond = Math.max(0, a.bond - 6);
      if (b.hungry >= 3) {
        const a = rng.pick(list.filter((x) => !KINDS[x.kind].familiar));
        if (a) { bury(g, a, KINDS[a.kind].beast ? '굶주림을 못 견디고 사슬을 끊고 달아났다' : '먹이를 찾아 떠나 돌아오지 않았다'); b.hungry = 0; }
      }
    }
  }
  // 죽음 장면이 버려졌으면(다른 곳으로 떠났다든지) 다음에 다시 띄울 수 있게
  for (const a of alive(g)) if (a.dying && !L(g).queue.some((q) => q.kind === 'beast_death' && q.id === a.id) && L(g).scene?.id !== a.id) delete a.dying;
  // 정은 같이 지내면 조금씩 쌓인다
  for (const a of alive(g)) a.bond = Math.min(100, a.bond + (a.bond < 50 ? 0.6 : 0.2));
  // 늙음과 죽음
  for (const a of alive(g)) {
    const K = KINDS[a.kind];
    const y = ageOf(g, a);
    if (y < K.life[0] * 0.8) continue;
    const over = (y - K.life[0] * 0.8) / Math.max(1, K.life[1] - K.life[0] * 0.8);
    if (rng.chance(Math.min(0.5, 0.004 + over * over * 0.05)) || y >= K.life[1]) queueDeath(g, a, 'old');
  }
  // 싸움에서: 이번 달 싸움이 있었다면 함께 싸운 짐승이 다치거나 죽기도 한다
  const fights = (L(g).stats.fights ?? 0) - b.fightsSeen;
  b.fightsSeen = L(g).stats.fights ?? 0;
  if (fights > 0) {
    const fighters = alive(g).filter((a) => beastPow(g, a) > 2);
    for (let i = 0; i < Math.min(3, fights); i++) {
      const a = fighters.length ? rng.pick(fighters) : null;
      if (a && a.alive && rng.chance(KINDS[a.kind].familiar ? 0.01 : 0.025)) queueDeath(g, a, 'fight');
      else if (a) a.bond = Math.min(100, a.bond + 1);
    }
  }
});
// 죽음은 장면으로 (beasts/events.js가 정의한다)
export const DEATH_QUEUE = [];
export function queueDeath(g, a, why) { for (const f of DEATH_QUEUE) f(g, a, why); }
