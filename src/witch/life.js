// 내 삶의 주술: 어린 날 마을 끝 오두막, 노파에게 제물을 바치고 배우기, 마을 사람들의 부탁(부적·잃은 것·해산·묘약·날씨·저주 풀기·저주 걸기),
// 진짜 효험과 속임수 사이, 마탑의 비웃음과 교단의 경고, 흉년의 횃불(마녀사냥), 할머니에게서 손녀로 잇는 주술.
// 장면 앞머리 wi_. 약방(apothecary)·저주(haunt)·정령(spirit)은 읽기만 한다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { isJailed } from '../crime.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, check } from '../adventure/core.js';
import { faithState } from '../faith/index.js';
import { openCase, askTrial } from '../law/index.js';
import { member as towerMember } from '../tower/state.js';
import { seldom } from '../rumor/seldom.js';
import {
  WS, CHARMS, CHARM_IDS, LEVEL_WORD, clamp, mi, age, here, placeName, realmAt, huntPower, witchPlace, wiseAt, wiseById, wiseName,
  knows, isWitch, mlog, wlog, lookAt, addLook, ownRng, KIND_WORD, REALM_EYE,
} from './state.js';
import { FEED } from './world.js';

const free = (g) => !traveling(g) && !isJailed(g) && !g.over && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.explore?.exp;
const money = (g) => g.player.money;
const stat = (g, k) => g.player.stats?.[k] ?? 0;
const herbs = (g) => g.player.skills?.herbs ?? 0;
const M = (g) => WS(g).me;
const sus = (g, n) => { if (!huntPower(here(g))) return; const f = faithState(g); f.suspicion = clamp(f.suspicion + n * (realmAt(here(g)) === 'holy' ? 1.5 : 1), 0, 100); };
const female = (g) => g.player.sex !== 'm';
const lvl = (g, id) => M(g).known[id] ?? 0;
const learn = (g, id) => {
  const k = M(g).known, before = k[id] ?? 0;
  k[id] = Math.min(3, before + 1);
  if (!before) mlog(g, `${J(CHARMS[id].name, '을/를')} 배웠다.`);
  else if (k[id] > before) mlog(g, `${CHARMS[id].name} 솜씨가 늘었다 (${LEVEL_WORD[k[id]]}).`);
  return k[id] > before;
};
const gainLore = (g, n) => { M(g).lore = clamp(M(g).lore + n, 0, 100); };

/* ---------- 1) 어린 날, 마을 끝 오두막 ---------- */
// 여섯 살부터 열세 살 사이, 마녀가 사는 고장에서 몇 해에 한 번. 아이에게는 무섭고 신기한 이웃일 뿐이다.
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.witch || !free(g)) return;
  const a = age(g), Mm = M(g);
  if (a < 6 || a > 13 || sceneQueued(g, 'wi_hut') || sceneQueued(g, 'wi_gran')) return;
  // 할머니가 주술을 하던 집안: 여덟 살 무렵 한 번
  if (Mm.gran && !Mm.known.amulet && (Mm.granN ?? 0) < 2 && a >= 8 && a <= 11 && mi(g) - Mm.hutAt >= 24) { Mm.hutAt = mi(g); Mm.granN = (Mm.granN ?? 0) + 1; queueScene(g, 'wi_gran', {}); return; }
  const w = wiseAt(g, here(g));
  if (!w || Mm.teacher || Mm.seenHut >= 3 || mi(g) - Mm.hutAt < 30) return;
  if (!ownRng(g, 21).chance(0.12)) return;
  Mm.hutAt = mi(g);
  queueScene(g, 'wi_hut', { w: w.id, n: Mm.seenHut });
});
const HUT_TEXT = [
  (w) => `마을 끝, 버드나무 뒤 오두막 굴뚝에서 이상한 냄새의 연기가 오른다. 아이들은 거기 사는 ${w.sex === 'f' ? '할멈' : '영감'}이 아이를 잡아먹는다고 수군댄다. 오늘은 ${J(w.name, '이/가')} 문간에 앉아 약초를 다듬다가 나를 보고 손짓했다. "얘, 이 바구니 좀 들어 주련?"`,
  (w) => `${J(w.name, '이/가')} 개울가에서 이끼 낀 돌을 뒤집고 있다. 나를 알아보더니 웃는다. 이가 몇 개 없다. "또 왔구나. 이 풀은 손으로 만지면 안 된다. 저 풀은 열이 날 때 달여 먹는 거고."`,
  (w) => `오두막 창 너머로 ${J(w.name, '이/가')} 솥을 젓는 게 보인다. 천장에는 마른 꽃과 뼈와 매듭 지은 실이 매달려 있다. 어른들은 거기 가지 말라고 하지만, 지난겨울 이웃집 아이 열을 내린 것도 그 ${w.sex === 'f' ? '할멈' : '영감'}의 약이었다.`,
];
defineScene('wi_hut', {
  need: (g, s) => !!wiseById(g, s.w) && !wiseById(g, s.w).gone && wiseById(g, s.w).place === here(g) && age(g) <= 13,
  title: () => '마을 끝 오두막',
  text: (g, s) => HUT_TEXT[Math.min(2, s.n ?? 0)](wiseById(g, s.w)),
  choices: () => [
    { label: '바구니를 들어 주고 이야기를 듣는다', key: 'help' },
    { label: '창 너머로 몰래 들여다본다', key: 'peek' },
    { label: '멀찍이 돌아서 집으로 간다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const w = wiseById(g, s.w), Mm = M(g);
    Mm.seenHut += 1;
    if (key === 'none') return '돌아서 뛰었다. 등 뒤에서 까마귀가 울었다.';
    w.met += 1;
    if (key === 'peek') { gainLore(g, 1); return `솥에서 김이 오르고, ${J(w.name, '이/가')} 뭔가를 중얼거린다. 노래 같기도 하고 기도 같기도 하다. 그러다 고개를 돌려 정확히 내 쪽을 보았다. 숨이 멎을 뻔했다.`; }
    gainLore(g, 2);
    if (g.player.skills) g.player.skills.herbs = (g.player.skills.herbs ?? 0) + 0.5;
    return `바구니를 들고 따라갔다. ${J(w.name, '은/는')} 풀 이름을 하나씩 가르쳐 주었다. 쑥, 서양톱풀, 까마귀 눈. "이름을 알면 반은 아는 거다. 나머지 반은 언제 따느냐지." 돌아올 때 꿀 바른 빵을 하나 얻었다.`;
  },
});
defineScene('wi_gran', {
  need: (g) => age(g) <= 12,
  title: () => '할머니의 부적',
  text: (g) => `${(M(g).granN ?? 1) >= 2 ? '할머니가 또 나를 화롯가로 불렀다. 지난번보다 손이 더 떨린다. ' : '할머니가 화롯가에서 붉은 실을 꼬다가 나를 불러 앉혔다. '}"우리 집안 ${female(g) ? '여자들' : '사람들'}은 대대로 이걸 했다. 사제들 앞에서는 입도 뻥끗하면 안 된다." 손바닥만 한 천 주머니에 쑥과 소금과 못 하나를 넣고, 입구를 세 번 감아 묶는다. "문설주에 걸면 나쁜 것이 못 들어온다. 믿는 만큼 든든해진다."`,
  choices: () => [
    { label: '할머니를 따라 실을 감아 본다', key: 'learn' },
    { label: '그런 걸 믿느냐고 묻는다', key: 'ask' },
    { label: '고개만 끄덕이고 놀러 나간다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'none') return '할머니가 웃으며 등을 두드렸다. "언젠가 생각날 거다."';
    if (key === 'ask') { gainLore(g, 2); return '할머니가 한참 실을 감다가 말했다. "반은 믿고 반은 안 믿는다. 그런데 문설주에 이게 걸린 집 사람들은 밤에 잠을 잘 잔다. 그거면 됐지."'; }
    learn(g, 'amulet'); gainLore(g, 5);
    note(g, '할머니에게서 집안의 부적 매듭을 배웠다.');
    return '서툰 손으로 실을 세 번 감았다. 할머니가 매듭을 고쳐 주며 말했다. "됐다. 이제 너도 우리 집 여자다." 그 말이 왜인지 조금 무서웠다.';
  },
});

/* ---------- 2) 노파에게 배우다 ---------- */
ACTIONS.push({
  id: 'wi_learn',
  name: '마을 끝 오두막에서 주술을 배운다',
  icon: 'herb',
  desc: '서클 마법이 아니라 약초와 매듭과 기억으로 하는 주술. 마력이 약해도 배울 수 있다. 대신 제물을 바쳐야 하고, 사제들 눈 밖에 난다.',
  available: (g) => age(g) >= 12 && free(g) && !!wiseAt(g, here(g)) && M(g).teacher !== wiseAt(g, here(g)).id && M(g).lore < 70 && mi(g) - M(g).studyAt >= 6 && !sceneQueued(g, 'wi_learn'),
  run(g) { M(g).studyAt = mi(g); queueScene(g, 'wi_learn', { w: wiseAt(g, here(g)).id }); return '마을 끝 오두막 문을 두드렸다.'; },
});
const LEARN_TEXT = {
  true: (w) => `${J(w.name, '이/가')} 문을 열고 한참 나를 보았다. 눈이 흐린데도 속까지 보는 것 같다. "배우겠다고? 이건 책으로 하는 게 아니다. 풀이 언제 피는지, 아이가 어떻게 돌아누워 있는지, 사람이 무엇을 두려워하는지 아는 거다. 먼저 제물을 바쳐라. 신께가 아니라 숲에."`,
  half: (w) => `${J(w.name, '이/가')} 솥을 저으며 고개도 안 돌린다. "주술을 배우고 싶다고? 반은 약초고 반은 사람 마음이다. 둘 다 배우려면 오래 걸려. 공짜로는 안 가르친다."`,
  fraud: (w) => `${J(w.name, '이/가')} 반지 낀 손으로 나를 안으로 끌어들였다. 방 안은 향 냄새로 자욱하다. "옳지, 너는 눈빛이 다르구나. 내 비법을 물려줄 만해. 다만 비법에는 값이 따르지."`,
};
defineScene('wi_learn', {
  need: (g, s) => !!wiseById(g, s.w) && !wiseById(g, s.w).gone && wiseById(g, s.w).place === here(g),
  title: () => '마을 끝 오두막',
  text: (g, s) => { const w = wiseById(g, s.w); return `${LEARN_TEXT[w.kind](w)}${w.met ? ` 어릴 때 바구니를 들어 주던 아이라는 걸 ${w.sex === 'f' ? '할멈' : '영감'}도 기억하는 눈치다.` : ''}`; },
  choices: (g) => [
    ...(money(g) >= 10 ? [{ label: '은화 10닢을 바친다', key: 'silver' }] : []),
    { label: '검은 암탉 한 마리와 첫 수확을 바친다', key: 'hen' },
    { label: '한 철 동안 약초 캐는 일손이 되겠다고 한다', key: 'labor' },
    { label: '마음을 바꿔 돌아선다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const w = wiseById(g, s.w), Mm = M(g);
    if (key === 'none') return `"겁이 나면 그게 맞다." ${J(w.name, '이/가')} 문을 닫았다.`;
    if (key === 'silver' && money(g) < 10) key = 'hen';
    if (key === 'silver') g.player.money -= 10;
    if (key === 'hen') g.player.money = Math.max(0, money(g) - 3);
    if (key === 'labor') { g.player.fatigue = (g.player.fatigue ?? 0) + 1; if (g.player.skills) g.player.skills.herbs = (g.player.skills.herbs ?? 0) + 1.5; }
    Mm.teacher = w.id; Mm.lessonAt = mi(g);
    gainLore(g, w.kind === 'fraud' ? 2 : 4);
    if (!Mm.known.amulet) learn(g, 'amulet');
    sus(g, 3);
    note(g, `${wiseName(w)}에게 주술을 배우기 시작했다.`);
    mlog(g, `${wiseName(w)}의 제자가 되었다.`);
    const tail = w.kind === 'fraud' ? ' 첫 가르침은 이상하게도 "손님 눈을 오래 보지 마라"였다.' : w.kind === 'true' ? ' 첫 가르침은 손을 씻는 법이었다. "해산이든 상처든, 더러운 손이 사람을 죽인다."' : ' 첫 가르침은 부적 매듭이었다. "이건 믿음이 반이다. 그 반이 사람을 살리기도 한다."';
    return `${J(w.name, '이/가')} 제물을 받아 문간에 놓고 무언가 중얼거렸다. 그날부터 나는 ${w.line}의 오두막을 드나드는 사람이 되었다.${tail}`;
  },
});
// 스승이 같은 고장에 있으면 몇 달에 한 번 가르침이 있다
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.witch || !free(g)) return;
  const Mm = M(g), w = Mm.teacher ? wiseById(g, Mm.teacher) : null;
  if (!w) return;
  if (w.gone) { Mm.teacher = null; mlog(g, `스승 ${J(wiseName(w), '이/가')} 떠났다.`); return; }
  if (w.place !== here(g) || mi(g) - Mm.lessonAt < 4 || sceneQueued(g, 'wi_lesson') || !ownRng(g, 23).chance(0.4)) return;
  const fit = (id) => !CHARMS[id].dark && CHARMS[id].lore <= Mm.lore + 8;
  const next = CHARM_IDS.find((id) => fit(id) && !lvl(g, id)) ?? CHARM_IDS.find((id) => fit(id) && lvl(g, id) < 2);
  const secret = w.kind !== 'true' && Mm.lore >= 22 && !Mm.secret;
  if (!next && !secret) return;
  Mm.lessonAt = mi(g);
  queueScene(g, 'wi_lesson', { w: w.id, charm: secret ? null : next, secret });
});
const LESSON = {
  amulet: '부적 매듭을 다시 묶는다. 이번에는 무엇을 막는 부적인지에 따라 넣는 것이 다르다. 번개에는 참나무 재, 도둑에는 개 이빨, 악몽에는 라벤더.',
  find: '체에 가위를 꽂고 물그릇 위에 매단다. "체가 도는 건 주술이 아니라 손이 떨려서다. 그런데 잃어버린 사람한테 어디 갔었느냐고 차근차근 물으면, 대개 물건이 나온다."',
  birth: '산모의 배를 짚어 아이가 어떻게 누웠는지 보는 법, 끓인 물로 손과 천을 씻는 법, 피가 멎지 않을 때 쓰는 풀. 사제들이 기도만 하는 동안 이걸 하는 게 우리다.',
  love: '장미 꽃잎과 꿀을 달인다. "사랑 묘약은 사랑을 만들지 못한다. 용기를 만들지. 마신 사람이 고백을 하고, 반은 성공한다. 그게 효험이야."',
  weather: '까마귀 깃털과 뼈 주사위, 그리고 진짜 비결: 개미가 둑을 쌓는지, 제비가 낮게 나는지, 무릎이 쑤시는지. 주사위는 손님 보라고 던진다.',
  uncurse: '소금 원을 그리고, 달걀을 흐르는 물에 깨뜨린다. "진짜 저주라면 이걸로는 안 된다. 그런데 저주받았다고 믿는 사람 대부분은, 이걸로 된다."',
};
defineScene('wi_lesson', {
  need: (g, s) => !!wiseById(g, s.w) && !wiseById(g, s.w).gone && M(g).teacher === s.w,
  title: (g, s) => (s.secret ? '노파의 속내' : `${CHARMS[s.charm].name} 배우기`),
  text: (g, s) => {
    const w = wiseById(g, s.w);
    if (s.secret) return `손님이 돌아가자 ${J(w.name, '이/가')} 은화를 세며 낄낄 웃었다. "봤냐? 맹물에 꿀 탄 걸 받아 가면서 고맙다고 절까지 한다. 반은 효험이고 반은 말솜씨야. 어느 쪽이 더 남는지는 너도 곧 알게 될 거다."`;
    return `${J(w.name, '이/가')} ${J(CHARMS[s.charm].stuff, '을/를')} 늘어놓았다. ${LESSON[s.charm]}`;
  },
  choices: (g, s) => (s.secret ? [
    { label: '말솜씨와 꾸미는 법을 배운다', key: 'trick' },
    { label: '효험 있는 것만 배우겠다고 한다', key: 'honest' },
    { label: '아무 말 없이 약초를 다듬는다', key: 'none' },
  ] : [
    { label: '정성껏 따라 하며 배운다', key: 'learn' },
    { label: '손님 앞에서 그럴듯하게 보이는 법을 묻는다', key: 'show' },
    { label: '오늘은 구경만 한다', key: 'none' },
  ]),
  resolve(g, rng, s, key) {
    const w = wiseById(g, s.w), Mm = M(g);
    if (s.secret) {
      Mm.secret = true;
      if (key === 'trick') { Mm.slick = (Mm.slick ?? 0) + 1; gainLore(g, 2); return '할멈이 손님 눈을 읽는 법, 목소리를 낮추는 법, 값을 부르는 법을 가르쳐 주었다. 이것도 주술이라면 주술이다.'; }
      if (key === 'honest') { gainLore(g, 1); return `${J(w.name, '이/가')} 코웃음을 쳤다. "배부른 소리." 그래도 그날 밤 해산 돕는 법은 하나도 빼놓지 않고 가르쳐 주었다.`; }
      return '할멈의 웃음소리를 들으며 풀을 다듬었다. 뭐가 맞는지는 아직 모르겠다.';
    }
    if (key === 'none') { gainLore(g, 1); return '솥 곁에서 구경만 했다. 냄새와 손놀림은 머리에 남았다.'; }
    if (key === 'show') { Mm.slick = (Mm.slick ?? 0) + 0.5; gainLore(g, 1); return `"향을 피우고, 손님 이름을 세 번 불러라. 그러고 나서 조용히 해." ${J(w.name, '이/가')} 일러 주었다. 효험은 몰라도 손님 얼굴이 달라지는 건 알겠다.`; }
    // 손에 붙기까지: 솜씨와 머리, 스승의 효험, 그리고 몇 번 실패했는지(실패할수록 다음엔 쉽다)
    Mm.tries ??= {};
    const tries = Mm.tries[s.charm] ?? 0;
    const ok = check(rng, Mm.lore * 0.6 + stat(g, 'int') * 0.3 + stat(g, 'sen') * 0.2 + (s.charm === 'birth' ? herbs(g) * 0.3 : 0) + (w.kind === 'true' ? 8 : 0) + tries * 8, 10 + CHARMS[s.charm].lore * 0.6);
    gainLore(g, ok ? rng.int(3, 6) : 2);
    Mm.tries[s.charm] = ok ? 0 : tries + 1;
    if (!ok) return `손이 따라 주지 않았다. ${J(w.name, '이/가')} 혀를 찼다. "다음 철에 다시 해 보자."`;
    learn(g, s.charm);
    return `${CHARMS[s.charm].name}의 요령이 손에 붙었다. ${LEVEL_WORD[lvl(g, s.charm)]}. ${J(w.name, '이/가')} 처음으로 고개를 끄덕였다.`;
  },
});

/* ---------- 3) 마을 사람들의 부탁 ---------- */
const askable = (g) => knows(g).filter((id) => !CHARMS[id].dark);
ACTIONS.push({
  id: 'wi_client',
  name: '주술을 청하러 온 사람을 받는다',
  icon: 'candle',
  desc: '밤에 문을 두드리는 사람이 있다. 부적, 잃은 것, 해산, 사랑, 날씨, 저주. 진짜 효험을 낼 수도, 그럴듯하게 꾸밀 수도 있다.',
  available: (g) => age(g) >= 15 && free(g) && !!REALM_EYE[realmAt(here(g))] && askable(g).length > 0 && (M(g).lore >= 10 || knows(g).length >= 2) && mi(g) - M(g).clientAt >= 3 && !sceneQueued(g, 'wi_client'),
  run(g) {
    const rng = ownRng(g, 31), Mm = M(g);
    Mm.clientAt = mi(g);
    let pool = askable(g);
    if (lvl(g, 'hex') && rng.chance(0.25)) pool = ['hex'];
    else if (Mm.lore >= 38 && !lvl(g, 'hex') && rng.chance(0.12)) pool = ['hex'];
    const charm = rng.pick(pool);
    queueScene(g, 'wi_client', { charm, who: rng.int(0, WHO.length - 1), v: rng.int(0, CHARMS[charm].ask.length - 1) });
    return '등잔을 켜고 문빗장을 풀어 두었다.';
  },
});
const WHO = ['방앗간 집 며느리', '대장간 막내', '과부 엘제', '나무꾼 한스', '술집 딸', '양치기 노인', '이웃 마을 농부', '떠돌이 행상', '마부의 아내', '빵집 주인', '늙은 어부', '젊은 수습 기사'];
const whoOf = (s) => WHO[(s.who ?? 0) % WHO.length];
const askOf = (s) => { const a = CHARMS[s.charm].ask; return a[(s.v ?? 0) % a.length]; };
defineScene('wi_client', {
  need: (g, s) => !!CHARMS[s.charm],
  title: (g, s) => (CHARMS[s.charm].dark ? '밤손님의 부탁' : `${J(CHARMS[s.charm].name, '을/를')} 청하는 사람`),
  text: (g, s) => {
    const c = CHARMS[s.charm], look = lookAt(g);
    const door = look >= 70 ? '문 앞에 고맙다며 두고 간 달걀 바구니가 또 있다.' : look < 30 ? '요즘 우물가에서 내 이름이 나오면 사람들이 입을 다문다고 한다.' : '';
    return `밤늦게 ${J(whoOf(s), '이/가')} 두건을 깊이 쓰고 왔다. 누가 볼까 봐 연신 뒤를 돌아본다. ${askOf(s)}.${s.charm === 'birth' ? ' 산파는 이웃 마을에 가고 없다.' : ''}${door ? ` ${door}` : ''}`;
  },
  choices: (g, s) => {
    const c = CHARMS[s.charm], known = lvl(g, s.charm) > 0;
    if (c.dark) return [
      ...(known ? [{ label: '밀랍 인형에 바늘을 꽂는다 (저주를 건다)', key: 'hex' }] : []),
      { label: '인형만 만들어 주고 은화를 받는다 (속임수)', key: 'trick' },
      { label: '저주는 하지 않는다며 돌려보낸다', key: 'none' },
    ];
    return [
      { label: `정성껏 ${c.do}`, key: 'real' },
      { label: '향을 피우고 그럴듯하게 꾸며 값을 더 받는다 (속임수)', key: 'trick' },
      { label: '오늘은 못 한다며 정중히 돌려보낸다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const c = CHARMS[s.charm], Mm = M(g), who = whoOf(s);
    if (key === 'none') return c.dark ? `${J(who, '은/는')} 이를 갈며 돌아갔다. "다른 데서 하면 그만이야." 그 말이 마음에 걸렸다.` : `${J(who, '이/가')} 실망한 얼굴로 돌아갔다.`;
    Mm.clients += 1;
    if (key === 'hex') {
      Mm.hexes += 1; g.player.money += c.fee; sus(g, 8);
      WS(g).heat[here(g)] = clamp((WS(g).heat[here(g)] ?? 0) + 6, 0, 100);
      mlog(g, `${placeName(here(g))}에서 저주를 걸었다.`);
      const hit = rng.chance(c.real + lvl(g, 'hex') * 0.1);
      return hit
        ? `바늘을 꽂는 손이 차가웠다. 은화 ${c.fee}닢. 한 달 뒤, 그 이웃의 소가 쓰러지고 집안에 열병이 돌았다는 말이 들렸다. 내 탓인지, 원래 그럴 일이었는지는 모른다. 모르는 게 더 무겁다.`
        : `바늘을 꽂았다. 은화 ${c.fee}닢. 그 이웃에게는 아무 일도 없었다. 그런데도 밤마다 그 집 앞을 지나기가 싫다.`;
    }
    if (key === 'trick') {
      const fee = Math.round(c.fee * 1.5);
      Mm.fraud += 1; g.player.money += fee; sus(g, 1);
      const caught = rng.chance(clamp(0.12 + Mm.fraud * 0.025 - (Mm.slick ?? 0) * 0.04, 0.04, 0.45));
      if (caught) {
        addLook(g, -12); Mm.fame = Math.max(0, Mm.fame - 4);
        mlog(g, `${placeName(here(g))}에서 속임수가 들통났다.`);
        const rlm = realmAt(here(g));
        if ((rlm === 'valhart' || rlm === 'free') && rng.chance(0.4)) {
          askTrial(g, openCase(g, { role: 'accused', charge: 'fraud', guilty: true, evidence: 55, place: here(g) }));
          return `은화 ${fee}닢을 받았다. 그런데 ${J(who, '이/가')} 다른 마을 약방에서 내 묘약을 보이고 맹물이라는 말을 들었다. 며칠 뒤 법정에서 사람이 왔다. 속임수 장사로 고발을 당했다.`;
        }
        return `은화 ${fee}닢을 받았다. 며칠 뒤 ${J(who, '이/가')} 우물가에서 내 속임수를 떠들고 다녔다. 사람들이 나를 보는 눈이 달라졌다.`;
      }
      addLook(g, 1);
      return `향을 피우고 이름을 세 번 불렀다. ${J(who, '이/가')} 눈물을 글썽이며 은화 ${fee}닢을 내밀었다. 효험이 있을지는 나도 모른다. 그는 모르는 게 낫다.`;
    }
    // 진짜로 한다
    const p = c.real * 0.55 + lvl(g, s.charm) * 0.12 + Mm.lore / 250 + (s.charm === 'birth' ? herbs(g) / 200 : 0) + (s.charm === 'weather' ? stat(g, 'sen') / 300 : 0);
    const ok = rng.chance(clamp(p, 0.15, 0.92));
    sus(g, 2);
    if (ok) {
      g.player.money += c.fee; addLook(g, s.charm === 'birth' ? 8 : 4); Mm.fame += s.charm === 'birth' ? 3 : 1; gainLore(g, 1);
      if (rng.chance(0.25)) learn(g, s.charm);
      const done = {
        amulet: rng.chance(0.5) ? `부적을 문설주에 걸어 주었다. 그 겨울 그 집에는 도둑도 열병도 들지 않았다. ${J(who, '이/가')} 은화 ${c.fee}닢과 소시지 한 줄을 들고 왔다.` : `붉은 실을 세 번 감아 매듭을 지어 주었다. ${J(who, '은/는')} 부적을 꼭 쥐고 한참 서 있다가 은화 ${c.fee}닢을 놓고 갔다. 다음 달, 그 집에 별일 없다는 말이 들려왔다.`,
        find: `차근차근 물었다. 어제 어디 갔었는지, 무엇을 했는지. 찾던 것은 생각지도 못한 곳에서 나왔다. ${J(who, '은/는')} 내가 신통하다고 믿는다. 은화 ${c.fee}닢.`,
        birth: '밤새 끓인 물과 깨끗한 천을 갈았다. 새벽에 아이가 울음을 터뜨렸다. 산모도 살았다. 아이 아버지가 내 손을 붙들고 울었다. 은화 몇 닢보다 그 손이 오래 남았다.',
        love: `꽃잎과 꿀을 달여 주었다. 보름 뒤, ${J(who, '이/가')} 마음에 둔 사람과 춤을 췄다는 소식이 들렸다. 묘약이 한 일인지 용기가 한 일인지는 모른다. 은화 ${c.fee}닢.`,
        weather: `주사위를 던지고, 제비가 낮게 나는 걸 보았다. "열흘 뒤에 뿌려라." 정말로 열흘 뒤 비가 왔다. 은화 ${c.fee}닢.`,
        uncurse: `소금 원을 그리고 달걀을 흐르는 물에 깨뜨렸다. 그날부터 ${who}네 아이가 밤에 울지 않는다. 은화 ${c.fee}닢.`,
      }[s.charm];
      return done;
    }
    addLook(g, s.charm === 'birth' ? -6 : -3);
    if (s.charm === 'birth') WS(g).heat[here(g)] = clamp((WS(g).heat[here(g)] ?? 0) + 5, 0, 100);
    return {
      amulet: `부적을 걸어 주었지만, 한 달 뒤 그 집 지붕에 벼락이 떨어졌다. ${J(who, '이/가')} 부적을 뜯어 내 문 앞에 던지고 갔다.`,
      find: '체가 돌지 않았다. 물어도 물어도 찾던 것은 나오지 않았다. 손님은 빈손으로 돌아갔다.',
      birth: '밤새 애를 썼다. 아이는 살았지만 산모가 오래 앓았다. 사람들은 고마워하지 않았다. "마녀를 불러서 그렇다"는 말이 돌았다.',
      love: `묘약을 주었지만, 상대는 그 주에 다른 사람과 약혼했다. ${J(who, '이/가')} 빈 병을 돌려주러 왔다.`,
      weather: '사흘 뒤 비가 온다고 했는데 보름 내내 땡볕이었다. 씨앗이 말라 죽었다는 원망이 들려왔다.',
      uncurse: `소금도 달걀도 소용없었다. ${who}네 집에는 여전히 흉한 일이 이어진다. 진짜 저주였을까.`,
    }[s.charm];
  },
});

/* ---------- 4) 마탑의 비웃음, 교단의 경고 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.witch || !free(g) || age(g) < 16 || !isWitch(g)) return;
  const Mm = M(g);
  if (mi(g) - Mm.scornAt < 48 || mi(g) - Mm.huntAt < 24 || sceneQueued(g, 'wi_scorn') || sceneQueued(g, 'wi_hunt') || !ownRng(g, 41).chance(0.08)) return;
  const r = realmAt(here(g));
  // 사제는 내가 주술을 해 온 고장에서만 경고한다
  const by = r === 'serenia' || towerMember(g) ? 'tower' : huntPower(here(g)) >= 1 && Mm.look[here(g)] != null ? 'priest' : null;
  if (!by) return;
  Mm.scornAt = mi(g);
  queueScene(g, 'wi_scorn', { by, n: (Mm.scornN = (Mm.scornN ?? 0) + 1) });
});
defineScene('wi_scorn', {
  need: () => true,
  title: (g, s) => (s.by === 'tower' ? '마도사의 코웃음' : '사제의 경고'),
  text: (g, s) => (s.by === 'tower'
    ? '장터에서 푸른 외투의 마도사가 내 약초 좌판을 내려다보았다. "매듭과 쑥이라. 마력 한 줌 없이 병을 고친다고? 그건 마법이 아니라 미신이오. 서클 하나 못 그리는 사람들이 하는 짓이지." 둘러선 사람들이 웃었다.'
    : (s.n ?? 1) % 2
      ? `예배당 앞에서 사제가 나를 불러 세웠다. "${placeName(here(g))}에 밤마다 문을 두드리는 발소리가 있다고 들었소. 빛의 여신 말고 다른 것에 기대는 자는 결국 불 속에서 끝나오. 이번 한 번은 경고요."`
      : `주일 설교가 끝나자 사제가 강단에서 나를 똑바로 보며 말했다. "우리 가운데 쑥과 매듭으로 신의 일을 흉내 내는 자가 있습니다." 사람들의 고개가 하나둘 내 쪽으로 돌아갔다.`),
  choices: (g, s) => (s.by === 'tower' ? [
    { label: '"당신 주문으로 해산을 도와 본 적 있소?" 하고 받아친다', key: 'retort' },
    ...(lvl(g, 'birth') || lvl(g, 'uncurse') ? [{ label: '그가 못 고친 아이의 열을 내려 보인다', key: 'show' }] : []),
    { label: '대꾸하지 않고 좌판을 정리한다', key: 'none' },
  ] : [
    { label: '다음 주부터 예배당에 꼬박꼬박 나간다', key: 'church' },
    { label: lvl(g, 'birth') ? '"마을 아이들을 받아 낸 건 기도가 아니라 내 손이오" 하고 말한다' : '"제 부적이 누구에게 해를 끼쳤소?" 하고 묻는다', key: 'retort' },
    { label: '고개를 숙이고 지나간다', key: 'none' },
  ]),
  resolve(g, rng, s, key) {
    const Mm = M(g);
    if (s.by === 'tower') {
      if (key === 'none') return '마도사의 웃음소리가 장터 끝까지 따라왔다. 그래도 저녁에는 또 손님이 왔다.';
      if (key === 'show') {
        if (check(rng, Mm.lore * 0.6 + herbs(g) * 0.4, 40)) { Mm.fame += 5; addLook(g, 6); return '버드나무 껍질을 달여 먹이고 이마에 젖은 천을 얹었다. 해 질 녘 아이의 열이 내렸다. 마도사는 아무 말 없이 떠났다. 사람들은 이 일을 오래 이야기했다.'; }
        Mm.fame = Math.max(0, Mm.fame - 2); return '밤새 달였지만 열은 내리지 않았다. 다음 날 마도사가 주문 한 줄로 아이를 재웠다. 나는 할 말이 없었다.';
      }
      if (check(rng, stat(g, 'cha') * 0.6 + Mm.fame * 0.3, 30)) { Mm.fame += 2; return '마도사가 말문이 막혔다. 둘러선 아낙들 사이에서 웃음이 터졌다. 이번에는 그를 보고 웃는 웃음이었다.'; }
      return '마도사는 어깨를 으쓱했다. "탑에는 해산 같은 걸로 시간을 버리는 사람이 없소." 말로는 이길 수 없는 상대였다.';
    }
    const f = faithState(g);
    if (key === 'church') { f.suspicion = Math.max(0, f.suspicion - 12); return '예배당 맨 뒷줄에 앉았다. 사제는 나를 보고 만족한 얼굴을 했다. 밤손님들은 여전히 왔다. 단지 이제는 뒷문으로 온다.'; }
    if (key === 'retort') { f.suspicion = clamp(f.suspicion + 8, 0, 100); addLook(g, 3); return '사제의 얼굴이 붉어졌다. 지나가던 아낙 하나가 고개를 끄덕였다. 사제의 장부에 내 이름이 한 줄 더 적혔을 것이다.'; }
    return '고개를 숙이고 지나갔다. 등 뒤에서 사제가 성호를 그었다.';
  },
});

/* ---------- 5) 흉년의 횃불: 내게 오는 마녀사냥 ---------- */
FEED.me = (g, pl) => {
  if (age(g) < 16 || sceneQueued(g, 'wi_hunt')) return;
  M(g).huntAt = mi(g);
  queueScene(g, 'wi_hunt', { pl }, { first: true });
};
defineScene('wi_hunt', {
  need: (g, s) => here(g) === s.pl && !g.over,
  title: () => '횃불',
  text: (g, s) => {
    const why = g.world?.famine ? '흉년이 길어지자' : '흉한 일이 이어지자';
    const look = lookAt(g, s.pl);
    return `${why} 누군가 내 이름을 입에 올렸다. 밤중에 횃불이 골목을 메웠다. 앞장선 건 ${realmAt(s.pl) === 'holy' ? '교단의 심문관' : '사제와 촌장'}이다. "마녀를 내놓아라!" ${look >= 60 ? '사람들 틈에 내가 받아 낸 아이의 아버지가 보인다. 그는 횃불을 들지 않았다.' : '밤마다 몰래 내 문을 두드리던 사람도 거기 섞여 있다.'}`;
  },
  choices: (g) => [
    { label: '문을 열고 나가 이웃들에게 호소한다', key: 'plead' },
    { label: '뒷문으로 빠져 숲에 숨는다', key: 'flee' },
    { label: '재판을 받겠다고 한다', key: 'trial' },
    ...(money(g) >= 30 && realmAt(here(g)) !== 'holy' ? [{ label: '사제에게 은화 30닢을 쥐여 준다', key: 'bribe' }] : []),
    { label: '문을 걸어 잠그고 밤을 버틴다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const W = WS(g), Mm = M(g), pl = s.pl, look = lookAt(g, pl);
    const rec = (how) => { W.hunts.push({ y: g.date.year, m: g.date.month, place: pl, who: g.player.name, me: true, how }); if (W.hunts.length > 30) W.hunts.shift(); W.tally.hunts += 1; FEED.fact?.(g, 'wi_hunt', { pl, name: g.player.name, how, me: true }); };
    W.heat[pl] = (W.heat[pl] ?? 0) * 0.3;
    stress(g, 8);
    if (key === 'plead') {
      if (rng.chance(clamp(look / 110, 0.1, 0.9))) {
        rec('saved'); W.tally.saved += 1; addLook(g, 6, pl);
        mlog(g, `${placeName(pl)}의 마녀사냥에서 이웃들이 나를 감쌌다.`);
        return '문을 열고 나갔다. 떨리는 목소리로 내가 한 일을 하나씩 말했다. 누구네 아이를 받았는지, 누구의 열을 내렸는지. 한 사람이 횃불을 내렸고, 또 한 사람이 내렸다. 사제는 혀를 차며 돌아갔다.';
      }
      rec('banished'); addLook(g, -20, pl);
      mlog(g, `${placeName(pl)}의 마녀사냥에서 쫓겨나다시피 했다.`);
      return '말을 다 하기도 전에 돌이 날아왔다. 이마에서 피가 흘렀다. 이웃들은 고개를 돌렸다. 다음 날부터 아무도 내게 말을 걸지 않았다. 이 고장에서 나는 이제 마녀다.';
    }
    if (key === 'flee') {
      rec('fled'); addLook(g, -10, pl); stress(g, 6);
      g.player.fatigue = (g.player.fatigue ?? 0) + 2;
      mlog(g, `${placeName(pl)}의 마녀사냥을 피해 숲에 숨었다.`);
      return '뒷문으로 빠져 숲으로 달렸다. 사흘 밤을 이끼 위에서 잤다. 돌아와 보니 오두막 창이 다 깨져 있고, 약초 다발은 불에 타 있었다. 횃불은 꺼졌지만, 사람들 눈빛은 그대로다.';
    }
    if (key === 'bribe' && money(g) < 30) key = 'none';
    if (key === 'bribe') {
      g.player.money -= 30; rec('saved');
      return '사제의 소매에 은화 주머니를 밀어 넣었다. 그가 사람들에게 손을 들었다. "증거가 없다. 다들 돌아가라." 오늘 밤은 살았다. 다음 흉년에도 은화가 있을지는 모른다.';
    }
    if (key === 'trial') {
      rec('trial');
      Mm.mark = '마녀 재판을 받았다';
      const guilty = Mm.hexes > 0 || Mm.fraud >= 4;
      askTrial(g, openCase(g, { role: 'accused', charge: 'heresy', guilty, evidence: 30 + Mm.hexes * 12 + Mm.fraud * 3 + (realmAt(pl) === 'holy' ? 15 : 0), place: pl }));
      chron(g, `${g.player.name}, ${placeName(pl)}에서 마녀로 고발되다.`, 40);
      return '"재판을 받겠소." 횃불이 멈췄다. 사제가 고개를 끄덕였다. 법정이 판단할 것이다. 아니면 신이.';
    }
    rec('fined'); addLook(g, -6, pl);
    return '빗장을 지르고 등을 문에 댔다. 돌이 창을 깨뜨리고, 누군가 문에 숯으로 십자를 그었다. 새벽이 되자 횃불이 하나둘 흩어졌다. 문의 숯 자국은 비가 와도 잘 지워지지 않았다.';
  },
});

/* ---------- 6) 대를 잇는 주술 ---------- */
// 할머니가 주술을 하던 집안(시골·묘지기·변경·빈민가 집안 일부)에서는 어린 날 집안 부적을 배운다
HOOKS.newGame.push((g) => {
  const W = WS(g);
  if (!['farmer', 'sexton', 'march_guard', 'slum_orphan'].includes(g.player?.familyId)) return;
  const h = (((g.rngState?.s ?? 0) ^ 0x5bd1e995) * 2654435761) >>> 0;
  if (h % 100 < 14) W.me.gran = true;
});
HOOKS.heir.push((g) => {
  const W = g.witch;
  if (!W?.me) return;
  const Mm = W.me, was = Mm.lore >= 25 || Object.values(Mm.known).some((v) => v >= 2);
  const lineage = was ? { gen: (Mm.lineage?.gen ?? 1) + 1, from: g.chronicle?.length ? '선대' : '부모' } : Mm.lineage;
  const keep = {};
  if (was) for (const [k, v] of Object.entries(Mm.known)) if (!CHARMS[k].dark && v >= 2) keep[k] = 1;
  Object.assign(Mm, {
    lore: was ? Math.round(Mm.lore * 0.2) : 0, known: keep, teacher: null, look: {}, fame: Math.round(Mm.fame * 0.3), fraud: 0, clients: 0, hexes: 0, mark: null,
    lineage, gran: was || Mm.gran, secret: false, slick: 0, seenHut: 0, log: was ? [{ y: g.date.year, m: g.date.month, text: '집안에 내려오는 주술 매듭과 약초 공책을 물려받았다.' }] : [],
  });
});

/* ---------- 7) 오늘의 장면 한 줄 (index.js가 씀) ---------- */
export function hutLine(g) {
  const pl = here(g), w = wiseAt(g, pl), W = WS(g);
  const burned = W.hunts.find((h) => h.place === pl && !h.me && h.how === 'burned' && g.date.year - h.y <= 1);
  if (burned && seldom(g, `wi:burn:${pl}`, 24)) return `광장 한쪽 바닥이 아직 검게 그을려 있다. 아이들은 거기를 밟지 않고 돌아간다. ${J(burned.who, '이/가')} 거기서 죽었다.`;
  const heat = W.heat[pl] ?? 0;
  if (heat >= 35 && seldom(g, `wi:heat:${pl}`, 18)) return '우물가 아낙들이 목소리를 낮춘다. 흉한 일이 이렇게 겹치는 건 누가 저주를 걸어서라고, 마을 끝 오두막에 불을 켜는 게 누구냐고.';
  if (w && age(g) >= 6 && seldom(g, `wi:hut:${w.id}`, 30)) return w.trust >= 65
    ? `마을 끝 오두막 문설주에 누가 두고 간 달걀 바구니가 놓여 있다. ${wiseName(w)}에게 신세 진 집이 많다.`
    : `마을 끝 오두막 굴뚝에서 쓴 냄새의 연기가 오른다. 아이들은 ${J(wiseName(w), '이/가')} 사는 쪽으로는 가지 않는다.`;
  if (isWitch(g) && lookAt(g, pl) >= 75 && seldom(g, `wi:me:${pl}`, 30)) return '지나가는 아낙이 고개를 숙여 인사한다. 지난봄 내가 받아 낸 아이를 업고 있다.';
  return null;
}
export { KIND_WORD };
