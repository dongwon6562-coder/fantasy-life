// 짐승 사기·돌보기·매사냥·말 달리기·사역마 부르기·팔기, 짐승과 사는 날의 일들, 짐승의 죽음.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill, gainStat, circleOf, playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, traveling, isAdult, note, chron, stress, tired, check } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { reportCrime, isJailed } from '../crime.js';
import { J } from '../narrative/text.js';
import {
  B, KINDS, FAMILIAR_FORMS, MAX_ANIMALS, alive, ageOf, old, young, familiarOf, fullName, kindName, addAnimal, bury, logBeast, mi, DEATH_QUEUE, beastPow,
} from './core.js';

/* ---------- 어디서 무엇을 파나 ---------- */
export const SHOPS = {
  ern: ['dog'],
  harfen: ['dog', 'horse'],
  gruental: ['dog', 'horse'],
  verden: ['dog', 'horse', 'warhorse', 'hawk'],
  leocast: ['horse', 'warhorse', 'hawk'],
  graubel: ['horse', 'warhorse'],
  eisen: ['horse', 'warhorse'],
  barka: ['horse'],
  fur: ['dog', 'horse', 'hawk', 'direwolf'],
  silverleaf: ['hawk'],
  saltmare: ['shadowcat', 'wyvern'],
};
// 길든 마수를 비싸게 사 주는 곳 (귀족의 우리, 투기장, 밀매꾼)
export const BEAST_BUYERS = { leocast: 1.0, eisen: 1.1, portel: 1.15, saltmare: 1.25, barka: 1.0, serenia: 0.9 };
const here = (g) => L(g).place;
const free = (g) => !traveling(g) && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const ownAge = (g) => playerAge(g) >= 10;
// 마수 새끼나 알은 값이 싸다 (길들이는 품이 크다). 다 자란 짐승은 정해진 값
export const buyPrice = (kind) => (KINDS[kind].beast ? Math.round(KINDS[kind].price * 0.35) : KINDS[kind].price);
export function sellPrice(g, a, place = here(g)) {
  const K = KINDS[a.kind];
  if (K.familiar) return 0;
  const tr = Math.min(1, (a.trained ?? 0) / 100);
  const ageMul = young(g, a) ? 0.6 : old(g, a) ? 0.3 : 1;
  const mul = K.beast ? (BEAST_BUYERS[place] ?? 0.5) : SHOPS[place] ? 0.8 : 0.5;
  return Math.max(1, Math.round(K.price * (0.4 + tr * 0.6) * ageMul * mul));
}
const skill = (g) => g.player.skills.animals ?? 0;
const needsWork = (a) => !KINDS[a.kind].familiar && (a.trained ?? 0) < 100;

/* ---------- 사기 ---------- */
ACTIONS.push({
  id: 'beast_buy',
  name: '짐승을 들인다',
  icon: 'coin',
  desc: '장터에서 개나 말, 매를 산다. 큰 고장에서는 군마를, 밀매 시장에서는 마수 새끼를 판다. 먹이 값이 달마다 든다.',
  available: (g) => ownAge(g) && free(g) && !!SHOPS[here(g)] && alive(g).length < MAX_ANIMALS && !sceneQueued(g, 'beast_buy'),
  run(g) { queueScene(g, 'beast_buy'); return '짐승 장터의 울타리 사이를 걸었다. 똥 냄새와 흥정 소리가 뒤섞였다.'; },
});
defineScene('beast_buy', {
  need: (g) => free(g) && !!SHOPS[here(g)] && alive(g).length < MAX_ANIMALS,
  title: (g) => `${PLACES[here(g)]?.name ?? ''}의 짐승 장터`,
  text: (g) => SHOPS[here(g)].map((k) => `${KINDS[k].name}${KINDS[k].beast ? ' 새끼' : ''}: ${KINDS[k].desc}`).join(' '),
  choices: (g) => {
    const out = SHOPS[here(g)].filter((k) => isAdult(g) || k === 'dog').map((k) => {
      const p = buyPrice(k);
      return g.player.money + (L(g).home === 'family' ? g.player.familyMoney ?? 0 : 0) >= p ? { label: `${KINDS[k].name}${KINDS[k].beast ? ' 새끼' : ''} (은화 ${p}닢)`, key: `buy:${k}` } : null;
    }).filter(Boolean);
    out.push({ label: '구경만 한다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '눈이 마주친 강아지 한 마리가 오래 따라왔다. 그래도 돌아섰다.';
    const kind = key.split(':')[1];
    const K = KINDS[kind];
    if (!K) return '';
    const p = buyPrice(kind);
    let left = p;
    const pay = Math.min(g.player.money, left); g.player.money -= pay; left -= pay;
    if (left > 0) g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) - left);
    const beast = !!K.beast;
    const ageYears = beast ? 0.2 : kind === 'dog' ? rng.float(0.3, 2) : kind === 'hawk' ? rng.float(0.5, 1.5) : rng.float(3, 6);
    const trained = beast ? 0 : kind === 'hawk' ? 10 : kind === 'dog' ? rng.int(20, 60) : rng.int(50, 90);
    const a = addAnimal(g, kind, { ageYears, trained, bond: beast ? 5 : 25 });
    if (!a) return '';
    if (kind === 'wyvern' || kind === 'shadowcat') reportCrime(g, 'smuggling', here(g), { mult: 0.5 });
    logBeast(g, `${J(fullName(a), '을/를')} 들였다.`);
    note(g, `${J(fullName(a), '을/를')} 들였다.`);
    if (kind === 'wyvern') return `밀매꾼이 짚 더미 속에서 알 하나를 꺼냈다. 따뜻하다. 안에서 무언가 두드린다. 이름은 "${a.name}"${J(a.name, '으로/로').slice(a.name.length)} 정했다. 왕국의 법은 이것을 기르는 것을 좋아하지 않는다.`;
    if (beast) return `우리 속의 ${K.name} 새끼가 이빨을 드러냈다. 손등에 피가 났다. 그래도 데려왔다. 이름은 "${a.name}". 길들이려면 오래 걸릴 것이다.`;
    if (kind === 'hawk') return `가죽 장갑 위에 매가 내려앉았다. 눈가리개 밑으로 날카로운 부리가 보인다. "${a.name}". 아직은 나를 주인으로 여기지 않는다.`;
    return `${J(K.name, '을/를')} 데려왔다. 이름은 "${a.name}"${J(a.name, '으로/로').slice(a.name.length)} 지었다.`;
  },
});

/* ---------- 돌보고 길들이기 ---------- */
ACTIONS.push({
  id: 'beast_care',
  name: '짐승을 돌보고 길들인다',
  icon: 'hunt',
  desc: '먹이고, 빗질하고, 가르친다. 길들지 않은 짐승은 조금씩 길들고, 정이 쌓인다. 길들지 않은 마수는 물기도 한다.',
  available: (g) => ownAge(g) && alive(g).length > 0 && !isJailed(g),
  run(g, rng) {
    const list = alive(g);
    const target = list.find((a) => needsWork(a) && !young(g, a)) ?? list.find(needsWork) ?? list[0];
    const K = KINDS[target.kind];
    tired(g, 8);
    const sk = gainSkill(g, 'animals', 1.2, 'sen');
    for (const a of list) a.bond = Math.min(100, a.bond + (a === target ? 6 : 2));
    if (!needsWork(target)) { stress(g, -6); return `${J(fullName(target), '과/와')} 하루를 보냈다. 말이 없어도 통하는 것이 있다. (짐승 다루기 +${sk.toFixed(1)})`; }
    const step = (6 + skill(g) * 0.25 + g.player.stats.sen * 0.08) * (young(g, target) ? 0.6 : 1) * 100 / K.train;
    target.trained = Math.min(100, (target.trained ?? 0) + step);
    let line = K.beast ? `${J(fullName(target), '을/를')} 우리에서 꺼내 사슬을 쥐고 걸었다.` : `${J(fullName(target), '을/를')} 가르쳤다.`;
    if (K.beast && rng.chance(Math.max(0.05, 0.35 - target.trained / 300 - skill(g) / 300))) {
      g.player.injuries.push({ name: `${kindName(target)}에게 물린 팔`, months: 2 });
      stress(g, 6);
      line += ` ${J(target.name, '이/가')} 갑자기 돌아서서 팔을 물었다. 사슬을 놓지 않았다.`;
    }
    if (target.trained >= 100) {
      line += K.beast ? ` 오늘, ${J(target.name, '이/가')} 처음으로 내 손에 머리를 기댔다. 다 길들었다.` : ` 이제 ${J(target.name, '은/는')} 말 한마디에 움직인다. 다 길들었다.`;
      logBeast(g, `${J(fullName(target), '을/를')} 다 길들였다.`);
      if (K.beast) chron(g, `${g.player.name}, ${J(KINDS[target.kind].name, '을/를')} 길들이다.`, target.kind === 'wyvern' ? 60 : 25);
    } else line += ` (길든 정도 ${Math.round(target.trained)}/100)`;
    return `${line} (짐승 다루기 +${sk.toFixed(1)})`;
  },
});

/* ---------- 매사냥, 말 달리기 ---------- */
ACTIONS.push({
  id: 'beast_hawking',
  name: '매사냥을 나간다',
  icon: 'hunt',
  desc: '다 길든 매를 날려 꿩과 토끼를 잡는다. 귀족들의 놀이라, 잘하면 이름이 난다.',
  available: (g) => isAdult(g) && !traveling(g) && !isJailed(g) && alive(g).some((a) => a.kind === 'hawk' && a.trained >= 100 && !old(g, a)),
  run(g, rng) {
    const hawk = alive(g).find((a) => a.kind === 'hawk' && a.trained >= 100);
    tired(g, 8);
    const s = gainStat(g, 'sen', 0.5);
    gainSkill(g, 'animals', 0.6, 'sen');
    hawk.bond = Math.min(100, hawk.bond + 3);
    if (rng.chance(0.04 + (hawk.bond < 40 ? 0.08 : 0))) { queueScene(g, 'beast_event', { ev: 'hawk_flee', id: hawk.id }); return `${J(hawk.name, '이/가')} 높이 떠오르더니 돌아오지 않았다.`; }
    const catchN = rng.int(1, 3) + (g.player.stats.sen > 50 ? 1 : 0);
    const money = catchN * 2;
    g.player.money += money;
    const noble = ['leocast', 'verden', 'eisen', 'graubel'].includes(here(g));
    if (noble && rng.chance(0.3)) { L(g).renown += 1; return `${J(hawk.name, '이/가')} 꿩 ${catchN}마리를 잡아 왔다. 지나던 귀족 일행이 말을 멈추고 구경했다. 내 이름을 물었다. (은화 ${money}닢, 감각 +${s.toFixed(1)})`; }
    return `${J(hawk.name, '이/가')} 들판 위를 맴돌다 내리꽂혔다. 꿩 ${catchN}마리. 장터에 내다 팔았다. (은화 ${money}닢, 감각 +${s.toFixed(1)})`;
  },
});
ACTIONS.push({
  id: 'beast_ride',
  name: '말을 달린다',
  icon: 'travel',
  desc: '말이나 군마를 타고 들판을 달린다. 몸이 단련되고, 말이 길든다.',
  available: (g) => ownAge(g) && !traveling(g) && !isJailed(g) && alive(g).some((a) => KINDS[a.kind].ride && !young(g, a) && !old(g, a)),
  run(g, rng) {
    const m = alive(g).filter((a) => KINDS[a.kind].ride && !young(g, a) && !old(g, a)).sort((x, y) => (x.trained ?? 0) - (y.trained ?? 0))[0];
    const K = KINDS[m.kind];
    tired(g, 12);
    const a = gainStat(g, 'agi', 0.6), st = gainStat(g, 'str', 0.3);
    gainSkill(g, 'animals', 0.6, 'agi');
    m.bond = Math.min(100, m.bond + 4);
    if (m.trained < 100) m.trained = Math.min(100, m.trained + (8 + skill(g) * 0.2) * 100 / Math.max(30, K.train));
    if (m.trained < 60 && rng.chance(0.15)) { g.player.injuries.push({ name: '말에서 떨어진 어깨', months: 1 }); return `${J(m.name, '이/가')} 날뛰었다. 땅이 하늘로 솟았다. 어깨부터 떨어졌다. (민첩 +${a.toFixed(1)})`; }
    if (m.kind === 'wyvern') return `${J(m.name, '이/가')} 날개를 펴고 땅을 박찼다. 마을이 손바닥만 해졌다. 아래에서 사람들이 소리를 질렀다. (민첩 +${a.toFixed(1)}, 힘 +${st.toFixed(1)})`;
    return `${J(m.name, '을/를')} 타고 들판 끝까지 달렸다. 바람에 눈물이 났다. (민첩 +${a.toFixed(1)}, 힘 +${st.toFixed(1)})`;
  },
});

/* ---------- 사역마 ---------- */
export const canFamiliar = (g) => isAdult(g) && !!g.player.manaAwakened && circleOf(g) >= 1 && !familiarOf(g) && alive(g).length < MAX_ANIMALS;
ACTIONS.push({
  id: 'beast_familiar',
  name: '사역마를 부른다',
  icon: 'magic',
  desc: '마력으로 짐승 하나와 영혼을 잇는 의식. 촛불과 은가루에 은화 10닢이 든다. 실패하면 마력이 되튄다. 성광교는 이것을 마녀의 짓이라 부른다.',
  available: (g) => canFamiliar(g) && !traveling(g) && !isJailed(g) && g.player.money >= 10 && !sceneQueued(g, 'beast_familiar'),
  run(g) { queueScene(g, 'beast_familiar'); return '바닥에 마법진을 그리고 촛불 일곱 개를 세웠다.'; },
});
defineScene('beast_familiar', {
  need: (g) => canFamiliar(g) && g.player.money >= 10,
  title: () => '영혼을 잇는 의식',
  text: () => '마법진 가운데에 마력을 흘려 넣는다. 부름에 답하는 짐승은 내가 고르는 것이 아니다. 다만 어떤 마음으로 부르는지는 고를 수 있다.',
  choices: () => [{ label: '먼 곳을 보는 눈을 청한다', key: 'raven' }, { label: '거짓을 가려내는 귀를 청한다', key: 'cat' }, { label: '글을 읽는 벗을 청한다', key: 'owl' }, { label: '위험을 먼저 아는 코를 청한다', key: 'fox' }, { label: '그만둔다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') return '촛불을 껐다. 마법진은 지우지 않았다.';
    g.player.money -= 10;
    tired(g, 15);
    const val = g.player.stats.int * 0.5 + g.player.stats.wil * 0.4 + (g.player.skills.magic ?? 0) * 0.5 + circleOf(g) * 5;
    if (!check(rng, val, 55)) {
      stress(g, 12);
      g.player.mana = Math.max(0, (g.player.mana ?? 0) * 0.85);
      return '마법진이 한 번 울리더니 촛불이 한꺼번에 꺼졌다. 마력이 되튀어 코피가 흘렀다. 부름에 답한 것은 없었다.';
    }
    const form = FAMILIAR_FORMS.find((f) => f.id === key) ?? FAMILIAR_FORMS[0];
    const a = addAnimal(g, 'familiar', { trained: 100, bond: 60, form: form.name });
    if (!a) return '';
    a.formId = form.id;
    logBeast(g, `사역마 ${J(form.name, '을/를')} 불렀다.`);
    chron(g, `${g.player.name}, 사역마를 부르다.`, 15);
    return `촛불이 푸르게 변했다. 마법진 가운데에 ${J(form.name, '이/가')} 앉아 있었다. ${form.text} 그 눈을 보는 순간, 내 안의 무언가가 그것과 이어진 것을 알았다. 이름은 "${a.name}".`;
  },
});
// 사역마는 마력을 다루는 것을 돕는다. 여우는 위험을, 올빼미는 글을.
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const f = familiarOf(g);
  if (!f) return;
  const p = g.player;
  if (p.manaAwakened) p.mana += (p.manaPotential ?? 0) * 0.01;
  if (rng.chance(0.3)) gainSkill(g, 'magic', 0.2, 'int');
  if (f.formId === 'owl' && rng.chance(0.3)) gainSkill(g, 'letters', 0.2, 'int');
  if (f.formId === 'cat' && rng.chance(0.2)) gainStat(g, 'cha', 0.1);
  if (f.formId === 'raven' && rng.chance(0.2)) gainStat(g, 'sen', 0.1);
});

/* ---------- 팔기와 놓아주기 ---------- */
ACTIONS.push({
  id: 'beast_sell',
  name: '짐승을 팔거나 놓아준다',
  icon: 'coin',
  desc: '기르던 짐승을 판다. 다 길든 마수는 귀족과 투기장, 밀매꾼이 큰돈을 준다. 숲으로 놓아줄 수도 있다.',
  available: (g) => ownAge(g) && free(g) && alive(g).some((a) => !KINDS[a.kind].familiar) && !sceneQueued(g, 'beast_sell'),
  run(g) { queueScene(g, 'beast_sell'); return '짐승의 고삐를 쥐고 오래 서 있었다.'; },
});
defineScene('beast_sell', {
  need: (g) => free(g) && alive(g).some((a) => !KINDS[a.kind].familiar),
  title: () => '짐승과 헤어지기',
  text: (g) => `${BEAST_BUYERS[here(g)] ? '이 고장에는 마수를 사려는 귀족과 투기장 주인이 있다. ' : ''}${SHOPS[here(g)] ? '장터의 짐승 상인이 값을 부른다.' : '이 고장에는 짐승을 제값에 사 줄 사람이 없다.'}`,
  choices: (g) => {
    const out = [];
    for (const a of alive(g).filter((x) => !KINDS[x.kind].familiar).slice(0, 3)) {
      out.push({ label: `${J(fullName(a), '을/를')} 판다 (은화 ${sellPrice(g, a)}닢)`, key: `sell:${a.id}` });
      out.push({ label: `${J(fullName(a), '을/를')} 놓아준다`, key: `free:${a.id}` });
    }
    out.push({ label: '그만둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '고삐를 다시 쥐었다.';
    const [how, id] = key.split(':');
    const a = alive(g).find((x) => x.id === Number(id));
    if (!a) return '';
    const b = B(g);
    if (how === 'sell') {
      const p = sellPrice(g, a);
      g.player.money += p;
      b.sold += p;
      a.alive = false; a.how = '팔려 갔다'; a.died = g.date.year;
      b.lost.push({ name: a.name, kind: a.kind, year: g.date.year, how: a.how, years: Math.round(ageOf(g, a)) });
      b.animals = b.animals.filter((x) => x.alive);
      if (a.bond >= 60) stress(g, 8);
      logBeast(g, `${J(fullName(a), '을/를')} 은화 ${p}닢에 팔았다.`);
      if (KINDS[a.kind].beast && a.trained >= 100) {
        if (here(g) === 'saltmare' || here(g) === 'portel') return `${J(fullName(a), '은/는')} 밀매꾼의 배에 실려 갔다. 은화 ${p}닢. 어느 나라 투기장에서 그 이름을 다시 듣게 될지 모른다.`;
        return `${J(fullName(a), '은/는')} 귀족의 우리로 갔다. 은화 ${p}닢. 떠나는 수레에서 ${J(a.name, '이/가')} 한 번 울었다.`;
      }
      return `${J(fullName(a), '을/를')} 은화 ${p}닢에 넘겼다.${a.bond >= 60 ? ' 돌아서는 등 뒤에서 낑낑대는 소리가 들렸다.' : ''}`;
    }
    a.alive = false; a.how = '놓아주었다'; a.died = g.date.year;
    b.lost.push({ name: a.name, kind: a.kind, year: g.date.year, how: a.how, years: Math.round(ageOf(g, a)) });
    b.animals = b.animals.filter((x) => x.alive);
    stress(g, -4);
    return KINDS[a.kind].beast ? `사슬을 풀었다. ${J(a.name, '은/는')} 한참 나를 보다가 숲으로 들어갔다. 다시는 돌아보지 않았다.` : `${J(a.name, '을/를')} 놓아주었다. 길모퉁이에서 한 번 돌아보았다.`;
  },
});

/* ---------- 짐승과 사는 날의 일들 ---------- */
const WILD = { fur: 'direwolf', gruental: 'direwolf', estella: 'direwolf', silverleaf: 'shadowcat', hammer: 'wyvern', gorge: 'wyvern' };
export const BEAST_EVENTS = {
  dog_child: {
    when: (g) => alive(g).some((a) => a.kind === 'dog' && a.trained >= 60 && !young(g, a)),
    text: (g, a) => `이웃 아이가 숲에서 사흘째 돌아오지 않는다. 사람들이 횃불을 든다. ${J(a.name, '이/가')} 아이의 신발 냄새를 맡더니 귀를 세웠다.`,
    pick: (g) => alive(g).find((a) => a.kind === 'dog' && a.trained >= 60),
    choices: () => [{ label: `개를 앞세워 찾으러 간다`, key: 'go' }, { label: '사람들에게 맡긴다', key: 'stay' }],
    run(g, rng, a, key) {
      if (key === 'stay') return '집에 남았다. 이튿날 아이는 개울가에서 찾았다고 했다. 살아서였는지는 묻지 않았다.';
      tired(g, 10); a.bond = Math.min(100, a.bond + 6);
      if (rng.chance(0.75)) { L(g).renown += 2; return `${J(a.name, '이/가')} 밤새 숲을 누볐다. 새벽에 바위틈에서 웅크린 아이를 찾았다. 아이 어머니가 ${a.name}의 목을 끌어안고 울었다.`; }
      return `${J(a.name, '이/가')} 개울가에서 냄새를 놓쳤다. 아이는 다른 사람들이 찾았다. ${J(a.name, '은/는')} 한동안 시무룩했다.`;
    },
  },
  dog_bite: {
    when: (g) => alive(g).some((a) => (a.kind === 'dog' || a.kind === 'direwolf') && !young(g, a) && a.bond < 70),
    pick: (g) => alive(g).find((a) => (a.kind === 'dog' || a.kind === 'direwolf') && a.bond < 70),
    text: (g, a) => `${J(a.name, '이/가')} 이웃집 아이를 물었다. 다리에 이빨 자국이 났다. 아이 아버지가 몽둥이를 들고 문 앞에 섰다. "저 짐승을 내놓든지, 값을 치르든지."`,
    choices: (g) => [...(g.player.money >= 10 ? [{ label: '약값을 치른다 (은화 10닢)', key: 'pay' }] : []), { label: '아이가 먼저 돌을 던졌다고 맞선다', key: 'argue' }, { label: '짐승을 내준다', key: 'give' }],
    run(g, rng, a, key) {
      if (key === 'pay') { g.player.money -= 10; return '은화를 쥐여 주고 고개를 숙였다. 그날 밤 짐승을 단단히 묶어 두었다.'; }
      if (key === 'give') { bury(g, a, '이웃의 몽둥이에 끌려갔다'); stress(g, 10); return `${J(a.name, '을/를')} 내주었다. 끌려가며 나를 돌아보았다. 그 눈을 잊지 못할 것이다.`; }
      if (check(rng, g.player.stats.cha + L(g).renown / 5, 45)) return '아이가 먼저 돌을 던졌다는 것을 본 사람이 나섰다. 아이 아버지는 투덜거리며 돌아갔다.';
      L(g).notoriety += 2; stress(g, 5); return '말다툼 끝에 그는 돌아갔다. 다음 날부터 마을 사람들이 내 짐승을 피해 다녔다.';
    },
  },
  horse_lame: {
    when: (g) => alive(g).some((a) => KINDS[a.kind].ride && !young(g, a) && a.kind !== 'wyvern'),
    pick: (g) => alive(g).find((a) => KINDS[a.kind].ride && a.kind !== 'wyvern'),
    text: (g, a) => `${J(a.name, '이/가')} 앞다리를 절기 시작했다. 편자 밑에 돌이 박혀 곪았다.`,
    choices: (g) => [{ label: '약초로 직접 고친다', key: 'herb' }, ...(g.player.money >= 6 ? [{ label: '말 의원을 부른다 (은화 6닢)', key: 'vet' }] : []), { label: '편히 보내 준다', key: 'end' }],
    run(g, rng, a, key) {
      if (key === 'end') { bury(g, a, '다리를 다쳐 편히 보내 주었다'); return `${a.name}의 목을 쓸어 주고, 눈을 가렸다.`; }
      if (key === 'vet') { g.player.money -= 6; a.trained = Math.max(60, a.trained - 5); return '말 의원이 곪은 곳을 째고 고름을 뺐다. 한 달 뒤 다시 달렸다.'; }
      if (check(rng, (g.player.skills.herbs ?? 0) + (g.player.skills.animals ?? 0) + g.player.stats.sen / 2, 40)) { gainSkill(g, 'animals', 0.8, 'sen'); return '쑥과 소금으로 상처를 씻고 매일 붕대를 갈았다. 보름 뒤 절뚝임이 멎었다.'; }
      a.trained = Math.max(0, a.trained - 30); return '상처는 아물었지만 다리가 예전 같지 않다. 다시 길들여야 한다.';
    },
  },
  hawk_flee: {
    when: (g) => alive(g).some((a) => a.kind === 'hawk'),
    pick: (g, s) => alive(g).find((a) => a.id === s.id) ?? alive(g).find((a) => a.kind === 'hawk'),
    text: (g, a) => `${J(a.name, '이/가')} 높이 떠오르더니 숲 너머로 사라졌다. 발목의 방울 소리가 멀어졌다.`,
    choices: () => [{ label: '방울 소리를 따라 숲으로 간다', key: 'chase' }, { label: '미끼를 걸고 기다린다', key: 'wait' }, { label: '보내 준다', key: 'let' }],
    run(g, rng, a, key) {
      if (key === 'let') { bury(g, a, '하늘로 돌아갔다'); return '하늘을 오래 올려다보았다. 원래 저 하늘의 것이었다.'; }
      const val = g.player.stats.sen + (g.player.skills.animals ?? 0) + a.bond / 2 + (key === 'wait' ? 10 : 0);
      if (check(rng, val, 55)) { a.bond = Math.min(100, a.bond + 5); return key === 'wait' ? '해 질 녘, 장갑 위의 고깃점 위로 그림자가 내려왔다.' : '사흘을 헤맨 끝에 높은 가지 위에서 방울 소리를 찾았다. 휘파람을 불자 내려왔다.'; }
      bury(g, a, '날아가 돌아오지 않았다'); return '방울 소리는 다시 들리지 않았다.';
    },
  },
  stray: {
    when: (g) => alive(g).length < MAX_ANIMALS,
    pick: () => null,
    text: () => '비 오는 저녁, 문간에 떠돌이 강아지 한 마리가 웅크리고 있다. 갈비뼈가 다 드러났다.',
    choices: () => [{ label: '들인다', key: 'take' }, { label: '먹을 것만 주고 보낸다', key: 'feed' }, { label: '문을 닫는다', key: 'shut' }],
    run(g, rng, a, key) {
      if (key === 'take') { const d = addAnimal(g, 'dog', { ageYears: 0.4, trained: 10, bond: 40 }); if (!d) return ''; stress(g, -6); return `강아지를 들였다. 이름은 "${d.name}". 밤새 내 발치에서 떨었다.`; }
      if (key === 'feed') return '빵 한 조각을 주었다. 다음 날 아침 강아지는 없었다.';
      return '문을 닫았다. 밤새 낑낑대는 소리가 들렸다.';
    },
  },
  cub: {
    when: (g) => !!WILD[here(g)] && alive(g).length < MAX_ANIMALS && isAdult(g),
    pick: () => null,
    text: (g) => { const k = WILD[here(g)]; return k === 'wyvern' ? '절벽 아래 무너진 둥지에서 금이 간 알 하나를 찾았다. 어미는 보이지 않는다. 알 속에서 무언가 긁는다.' : `덫에 걸려 죽은 어미 곁에 ${KINDS[k].name} 새끼 한 마리가 웅크리고 있다. 이빨을 드러내고 으르렁댄다. 아직 눈도 제대로 못 뜬다.`; },
    choices: () => [{ label: '데려가 기른다', key: 'take' }, { label: '사냥꾼들에게 자리를 알려 준다 (은화 몇 닢)', key: 'tell' }, { label: '그대로 둔다', key: 'leave' }],
    run(g, rng, a, key) {
      const k = WILD[here(g)];
      if (key === 'take') { const c = addAnimal(g, k, { ageYears: 0.1, trained: 0, bond: 10 }); if (!c) return ''; logBeast(g, `${J(KINDS[k].name, '을/를')} 주워 왔다.`); return `${J(KINDS[k].name, '을/를')} 품에 넣어 데려왔다. 이름은 "${c.name}". 다 자라면 나를 어미로 알지, 먹잇감으로 알지 모른다.`; }
      if (key === 'tell') { const m = rng.int(4, 10); g.player.money += m; return `사냥꾼들이 은화 ${m}닢을 주었다. 다음 날 그들이 우리를 메고 숲으로 들어갔다.`; }
      return '발길을 돌렸다. 숲의 일은 숲에 맡긴다.';
    },
  },
  egg_offer: {
    when: (g) => ['saltmare', 'portel', 'barka'].includes(here(g)) && isAdult(g) && alive(g).length < MAX_ANIMALS && g.player.money >= 80,
    pick: () => null,
    text: () => '부둣가 골목에서 밀매꾼이 소매를 끌었다. "와이번 알, 진짜요. 천룡 산맥에서 바로 왔지. 은화 80닢. 왕국 경비대 눈에만 안 띄면 되오."',
    choices: () => [{ label: '산다 (은화 80닢)', key: 'buy' }, { label: '거절한다', key: 'no' }, { label: '경비대에 알린다', key: 'report' }],
    run(g, rng, a, key) {
      if (key === 'no') return '고개를 젓자 밀매꾼은 골목 안쪽으로 사라졌다.';
      if (key === 'report') { L(g).renown += 1; return '경비대가 그날 밤 창고를 덮쳤다. 알 다섯 개가 나왔다. 둘은 이미 깨어 있었다.'; }
      g.player.money -= 80;
      if (rng.chance(0.3)) return '알을 품에 안고 돌아왔다. 한 달 뒤 깨 보니 칠한 돌이었다. 밀매꾼은 다시 보이지 않았다.';
      const w = addAnimal(g, 'wyvern', { ageYears: 0, trained: 0, bond: 15 });
      if (!w) return '';
      reportCrime(g, 'smuggling', here(g), { mult: 0.5 });
      return `알을 품에 안고 돌아왔다. 열흘 뒤 껍데기가 갈라졌다. 젖은 날개를 편 것이 처음 본 나에게 소리를 질렀다. "${w.name}".`;
    },
  },
  beast_loose: {
    when: (g) => alive(g).some((a) => KINDS[a.kind].beast && a.trained < 70 && !young(g, a)),
    pick: (g) => alive(g).find((a) => KINDS[a.kind].beast && a.trained < 70),
    text: (g, a) => `${J(a.name, '이/가')} 우리를 부수고 나가 이웃의 양 세 마리를 물어 죽였다. 마을 사람들이 쇠스랑을 들고 모였다.`,
    choices: (g) => [...(g.player.money >= 15 ? [{ label: '양값을 물어 준다 (은화 15닢)', key: 'pay' }] : []), { label: '모른 척 숨긴다', key: 'hide' }, { label: '손수 끝낸다', key: 'end' }],
    run(g, rng, a, key) {
      if (key === 'pay') { g.player.money -= 15; a.trained = Math.max(0, a.trained - 10); return '양값을 치르고 우리를 쇠사슬로 다시 묶었다. 사람들은 돌아갔지만 눈빛은 그대로였다.'; }
      if (key === 'end') { bury(g, a, '사람을 해칠까 두려워 손수 끝냈다'); stress(g, 14); return '칼을 들었다. 마지막까지 나를 어미처럼 보았다.'; }
      L(g).notoriety += 3;
      if (rng.chance(0.4)) { bury(g, a, '마을 사람들의 쇠스랑에 쓰러졌다'); return `사흘 뒤, 사람들이 ${J(a.name, '을/를')} 찾아냈다. 숨긴 것이 더 나빴다.`; }
      return '사람들은 그것이 숲의 짐승 짓이라고 믿었다. 아직은.';
    },
  },
  familiar_vision: {
    when: (g) => !!familiarOf(g),
    pick: (g) => familiarOf(g),
    text: (g, a) => `밤에 ${J(a.name, '이/가')} 내 꿈속으로 들어왔다. ${a.formId === 'raven' ? '먼 산 너머 불타는 마을이 보였다.' : a.formId === 'fox' ? '길모퉁이 어둠 속에서 칼을 쥔 사람들이 기다리고 있었다.' : a.formId === 'owl' ? '오래된 책장의 글자가 하나씩 떠올라 날아다녔다.' : '웃고 있는 누군가의 얼굴 뒤에 다른 얼굴이 겹쳐 보였다.'}`,
    choices: () => [{ label: '꿈을 받아 적는다', key: 'write' }, { label: '꿈을 떨쳐 낸다', key: 'shake' }],
    run(g, rng, a, key) {
      if (key === 'shake') { stress(g, -3); return '눈을 떴다. 사역마가 서운한 듯 등을 돌렸다.'; }
      a.bond = Math.min(100, a.bond + 5);
      gainSkill(g, 'magic', 0.8, 'int');
      return '일어나자마자 본 것을 적었다. 사역마가 본 것과 내가 본 것의 경계가 조금씩 흐려진다.';
    },
  },
  familiar_witch: {
    when: (g) => !!familiarOf(g) && !['serenia'].includes(here(g)),
    pick: (g) => familiarOf(g),
    text: (g, a) => `장터에서 성광교 사제가 내 어깨의 ${J(a.form ?? '사역마', '을/를')} 가리켰다. "저것은 짐승이 아니다. 마녀의 영혼이 붙은 것이다!" 사람들이 물러섰다.`,
    choices: () => [{ label: '마탑의 허가로 맞선다', key: 'argue' }, { label: '사역마를 품에 숨기고 자리를 뜬다', key: 'hide' }, { label: '사제에게 은화를 쥐여 준다 (은화 5닢)', key: 'bribe' }],
    run(g, rng, a, key) {
      if (key === 'bribe' && g.player.money >= 5) { g.player.money -= 5; return '사제는 은화를 소매에 넣고 성호를 그었다. "회개하시오." 그게 다였다.'; }
      if (key === 'hide') { stress(g, 4); return '사역마를 품에 넣고 골목으로 빠졌다. 등 뒤에서 수군거림이 오래 따라왔다.'; }
      if (check(rng, g.player.stats.cha + circleOf(g) * 6 + (g.tower?.member ? 15 : 0), 50)) { L(g).renown += 1; return '서클 증명을 꺼내 보였다. 사제가 입을 다물었다. 사람들이 오히려 내 쪽으로 다가왔다.'; }
      L(g).notoriety += 2; stress(g, 6); return '말을 할수록 사람들이 멀어졌다. 그날 저녁 문에 누가 성광의 표식을 그려 놓았다.';
    },
  },
  litter: {
    when: (g) => alive(g).some((a) => a.kind === 'dog' && a.bond >= 50 && ageOf(g, a) >= 2 && ageOf(g, a) <= 8),
    pick: (g) => alive(g).find((a) => a.kind === 'dog' && a.bond >= 50),
    text: (g, a) => `${J(a.name, '이/가')} 헛간 구석에서 새끼를 다섯 마리 낳았다. 젖을 물리며 나를 올려다본다.`,
    choices: (g) => [...(alive(g).length < MAX_ANIMALS ? [{ label: '한 마리를 남겨 기른다', key: 'keep' }] : []), { label: '이웃들에게 나눠 준다', key: 'give' }, { label: '장터에 판다', key: 'sell' }],
    run(g, rng, a, key) {
      if (key === 'keep') { const p = addAnimal(g, 'dog', { ageYears: 0, trained: 5, bond: 50 }); if (!p) return ''; return `가장 작은 놈을 남겼다. 이름은 "${p.name}". 어미를 꼭 닮았다.`; }
      if (key === 'give') { L(g).renown += 1; return '이웃들이 한 마리씩 안고 갔다. 동네 아이들이 강아지 이름을 지어 달라고 몰려왔다.'; }
      const m = rng.int(6, 12); g.player.money += m; return `장터에서 은화 ${m}닢을 받았다. 어미는 며칠 동안 헛간 구석을 맴돌았다.`;
    },
  },
  old_friend: {
    when: (g) => alive(g).some((a) => old(g, a) && a.bond >= 50 && !KINDS[a.kind].familiar),
    pick: (g) => alive(g).find((a) => old(g, a) && a.bond >= 50 && !KINDS[a.kind].familiar),
    text: (g, a) => `${J(a.name, '이/가')} 늙었다. 하루 종일 문간 볕에서 잔다. 내가 부르면 꼬리만 겨우 흔든다.`,
    choices: () => [{ label: '곁에 앉아 하루를 보낸다', key: 'stay' }, { label: '젊은 짐승을 하나 더 들일 때다', key: 'next' }],
    run(g, rng, a, key) {
      if (key === 'stay') { a.bond = Math.min(100, a.bond + 6); stress(g, -8); return `볕이 질 때까지 ${a.name} 곁에 앉아 있었다. 털이 하얗게 셌다. 처음 데려온 날이 어제 같다.`; }
      return '늙은 짐승에게 젊은 것을 가르치게 하기로 했다. 다음에 장터에 가면 한 마리 들일 것이다.';
    },
  },
};
defineScene('beast_event', {
  need: (g, s) => !!BEAST_EVENTS[s.ev] && (BEAST_EVENTS[s.ev].pick(g, s) !== undefined),
  title: () => '짐승과 사는 날',
  text: (g, s) => BEAST_EVENTS[s.ev].text(g, BEAST_EVENTS[s.ev].pick(g, s), s),
  choices: (g, s) => BEAST_EVENTS[s.ev].choices(g, BEAST_EVENTS[s.ev].pick(g, s), s),
  resolve(g, rng, s, key) {
    const E = BEAST_EVENTS[s.ev];
    const a = E.pick(g, s);
    if (a === undefined) return '';
    return E.run(g, rng, a, key, s) || '';
  },
});
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const b = B(g);
  if (mi(g) < b.cool || !free(g) || sceneQueued(g, 'beast_event') || playerAge(g) < 8) return;
  const has = alive(g).length > 0;
  if (!rng.chance(has ? 0.07 : 0.012)) return;
  const pool = Object.keys(BEAST_EVENTS).filter((id) => id !== 'hawk_flee' && BEAST_EVENTS[id].when(g) && (has || ['stray', 'cub', 'egg_offer'].includes(id)));
  if (!pool.length) return;
  const ev = rng.pick(pool);
  b.cool = mi(g) + 5;
  queueScene(g, 'beast_event', { ev });
});

/* ---------- 죽음 ---------- */
DEATH_QUEUE.push((g, a, why) => {
  if (a.dying) return;
  a.dying = why;
  queueScene(g, 'beast_death', { id: a.id, why }, { first: true });
});
defineScene('beast_death', {
  need: (g, s) => alive(g).some((a) => a.id === s.id),
  title: (g, s) => { const a = alive(g).find((x) => x.id === s.id); return `${fullName(a)}의 마지막`; },
  text: (g, s) => {
    const a = alive(g).find((x) => x.id === s.id);
    const yrs = Math.round(ageOf(g, a));
    if (s.why === 'fight') return KINDS[a.kind].familiar ? `싸움에서 ${J(a.name, '이/가')} 나를 대신해 칼을 맞았다. 영혼의 끈이 가늘게 떨린다.` : `싸움에서 ${J(a.name, '이/가')} 크게 다쳤다. 숨이 얕다. 나를 보고 꼬리를 한 번 움직인다.`;
    return `${J(a.name, '이/가')} 일어나지 못한다. ${yrs}해를 함께 살았다. 오늘이 마지막이라는 것을, 우리 둘 다 안다.`;
  },
  choices: (g, s) => { const a = alive(g).find((x) => x.id === s.id); return [{ label: '곁을 지킨다', key: 'stay' }, ...(KINDS[a.kind].beast ? [{ label: '가죽과 이빨을 남긴다', key: 'pelt' }] : []), { label: '양지바른 곳에 묻어 준다', key: 'bury' }]; },
  resolve(g, rng, s, key) {
    const a = alive(g).find((x) => x.id === s.id);
    if (!a) return '';
    const K = KINDS[a.kind];
    const how = s.why === 'fight' ? '싸움에서 쓰러졌다' : '늙어 숨을 거두었다';
    const rel = a.bond >= 80 && ageOf(g, a) >= 8 ? 20 : 0;
    if (K.familiar) { bury(g, a, s.why === 'fight' ? '주인 대신 칼을 맞고 사라졌다' : '빛이 되어 흩어졌다', 20); g.player.mana = Math.max(0, (g.player.mana ?? 0) * 0.8); return '사역마의 몸이 빛 가루가 되어 흩어졌다. 내 안의 한 자리가 비었다. 마력이 한동안 말을 듣지 않았다.'; }
    if (key === 'pelt') { const m = Math.round(K.price * 0.15); g.player.money += m; bury(g, a, how, rel); return `가죽을 벗기고 이빨을 뽑았다. 은화 ${m}닢 값이다. 손이 떨렸다.`; }
    bury(g, a, how, rel);
    if (key === 'stay') { stress(g, -4); return `밤새 ${a.name}의 머리를 무릎에 두었다. 새벽에 숨이 멎었다. 마지막까지 내 손 냄새를 맡고 있었다.`; }
    return `언덕 위 볕 드는 자리에 묻었다. 돌 하나를 세우고 이름을 새겼다. "${a.name}".`;
  },
});
