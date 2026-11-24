// 죽은 이를 맡는 일: 장의사·묘지기 일자리, 염하기, 관 짜기, 신분마다 다른 장례, 밤의 묘지와 도굴꾼,
// 장의사 집, 집안 무덤 자리 사고팔기, 역병 수레, 묘지에 도는 소문.
import { ACTIONS } from '../actions.js';
import { gainStat, playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, gains, up } from '../adventure/core.js';
import { registerJob, WORK, doWork } from '../jobs.js';
import { deed } from '../repute/index.js';
import { outbreaksAt, fallSick } from '../health/index.js';
import { spotsAt } from '../haunt/state.js';
import { J } from '../narrative/text.js';
import {
  U, mi, clamp, here, placeName, free, adult, YARDS, yardOf, yardHere, SHOP_PLACES, SHOP_COST, plotPrice, RANKS, RANK_IDS, logU, skill, isUT, isGD, deathWork, shopHere, gainU, seasonOf,
} from './core.js';

export const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const earn = (g, n) => { n = Math.max(0, Math.round(n)); g.player.money += n; U(g).earned += n; return n; };
const plagueHere = (g) => outbreaksAt(g).filter((o) => o.sev >= 0.4);

/* ---------- 일자리 ---------- */
const UT_LINES = ['상가에 가서 몸을 씻기고 수의를 입혔다. 식구들이 문밖에서 기다렸다.', '관 치수를 재러 갔다. 키를 묻자 과부가 한참을 생각하다 대답했다.', '장례 행렬 맨 앞에서 검은 지팡이를 짚고 걸었다.', '밤새 촛불 곁에서 망자를 지켰다. 집안 사람들이 교대로 졸았다.'];
const GD_LINES = {
  봄: ['녹은 땅이 질어 무덤 구덩이에 물이 고였다. 하루 종일 퍼냈다.', '무덤 사이 풀을 베고 넘어진 비석을 일으켰다.'],
  여름: ['한낮을 피해 새벽에 구덩이를 팠다. 그래도 등에 소금이 앉았다.', '묘지 담에 무너진 돌을 다시 쌓았다.'],
  가을: ['낙엽을 쓸고 무덤마다 이름이 보이게 이끼를 긁었다.', '구덩이 둘을 팠다. 내일 상여가 두 번 온다.'],
  겨울: ['언 땅을 곡괭이로 깨며 구덩이 하나를 팠다. 하루가 다 갔다.', '땅이 얼어 시신을 헛간에 모셔 두었다. 봄에 묻기로 했다.'],
};
const rankOf = (g) => { const v = skill(g); return v < 15 ? 0 : v < 40 ? 1 : v < 70 ? 2 : 3; };
registerJob('undertaker', {
  name: '장의사', places: SHOP_PLACES, skill: null, stat: 'wil', stat2: 'sen', wage: [3, 4, 6, 9], npcJob: 'laborer', rankOf,
  lines: UT_LINES,
  work(g, rng) { U(g).bodies += 1; gainU(g, 1); return doWork(g, rng, WORK.undertaker, { wageMul: plagueHere(g).length ? 1.5 : 1 }); },
});
registerJob('gravedigger', {
  name: '묘지기', places: Object.keys(YARDS), skill: null, stat: 'str', stat2: 'wil', wage: [2, 3, 4, 6], npcJob: 'laborer', rankOf,
  lines: GD_LINES.가을,
  work(g, rng) { U(g).dug += 1; gainU(g, 0.8); return doWork(g, rng, WORK.gravedigger, { line: rng.pick(GD_LINES[seasonOf(g)]) }); },
});

/* ---------- 염하기 ---------- */
ACTIONS.push({
  id: 'ut_wash', name: '시신을 염한다', icon: 'candle',
  desc: '기다리는 망자를 씻기고 수의를 입힌다. 일이 밀린 달에만. 솜씨가 늘고 의지가 단단해진다.',
  available: (g) => free(g) && isUT(g) && (yardHere(g)?.wait ?? 0) >= 2 && g.player.fatigue < 85,
  run(g, rng) {
    const s = U(g), y = yardHere(g);
    y.wait -= 1; s.bodies += 1; tired(g, 10); stress(g, 3);
    const k = gainU(g, 1.5), w = gainStat(g, 'wil', 0.3);
    const got = earn(g, 2 + Math.floor(skill(g) / 25) + rng.int(0, 1));
    if (mi(g) - s.evAt >= 6 && rng.chance(0.3) && !sceneQueued(g, 'ut_body')) { s.evAt = mi(g); queueScene(g, 'ut_body'); }
    return `${rng.pick(['늙은 방앗간 주인의 몸을 씻겼다. 손톱 밑에 밀가루가 아직 남아 있었다.', '물에 빠져 죽은 젊은이였다. 어미가 머리를 빗겨 주고 싶다고 해서 빗을 건넸다.', '앓다 간 아이의 몸은 가벼웠다. 수의를 두 번 접어야 했다.', '전쟁에서 돌아오지 못한 아들 대신, 그 아버지를 염했다. 식구들이 둘 몫으로 울었다.'])} 은화 ${got}닢.${gains([up('장의 솜씨', k), up('의지', w)])}`;
  },
});
defineScene('ut_body', {
  title: () => '망자의 손',
  text: () => '수의를 입히다 보니 굳은 손가락에 금반지가 끼워져 있다. 식구들은 반지 이야기를 하지 않았다. 아무도 모르는 것 같다.',
  choices: () => [{ label: '식구들에게 돌려준다', key: 'return' }, { label: '교회 구휼함에 넣는다', key: 'church' }, { label: '내 주머니에 넣는다', key: 'keep' }],
  resolve(g, rng, s, key) {
    if (key === 'return') { deed(g, 'honest', 2, null); return '반지를 과부 손에 쥐여 주었다. 과부는 그 반지를 한참 보다가 남편 손에 다시 끼워 달라고 했다. 함께 묻혔다.'; }
    if (key === 'church') { deed(g, 'generous', 1, null); return '반지를 구휼함에 넣었다. 그 겨울 빵 서른 덩이가 되었다고 사제가 말했다.'; }
    deed(g, 'honest', -2, null); earn(g, 6);
    return '반지는 쉽게 빠지지 않았다. 비누를 썼다. 은화 여섯 닢이 되었다. 그 밤 꿈에 그 손이 보였다.';
  },
});

/* ---------- 관 짜기와 장의사 집 ---------- */
ACTIONS.push({
  id: 'ut_shop', name: '장의사 집을 연다', icon: 'housing',
  desc: `내 이름을 건 장의사 집을 낸다. 은화 ${SHOP_COST}. 관을 쌓아 두고 사람을 부리면, 내가 없는 달에도 일이 들어온다.`,
  available: (g) => free(g) && isUT(g) && skill(g) >= 25 && !U(g).shop && g.player.money >= SHOP_COST,
  run(g) {
    pay(g, SHOP_COST);
    U(g).shop = { place: here(g), since: mi(g), coffins: 2, hands: 0 };
    logU(g, `${placeName(here(g))}에 장의사 집을 냈다.`); note(g, `${placeName(here(g))}에 장의사 집을 냈다.`);
    return '골목 끝 낮은 집을 얻었다. 문 위에 검은 천을 걸고, 마당에 관 두 개를 세워 두었다. 지나가는 사람들이 걸음을 빨리했다. 그래도 사람은 누구나 한 번은 이 문을 두드린다.';
  },
});
ACTIONS.push({
  id: 'ut_coffin', name: '관을 짠다', icon: 'hammer',
  desc: '장의사 집 마당에서 관을 짠다. 판자 값 은화 셋. 관이 쌓여 있으면 장례가 들어올 때 값을 더 받는다.',
  available: (g) => free(g) && shopHere(g) && U(g).shop.coffins < 12 && g.player.money >= 3 && g.player.fatigue < 85,
  run(g, rng) {
    const s = U(g); pay(g, 3); tired(g, 12);
    s.shop.coffins += 2; s.coffins += 2;
    const k = gainU(g, 0.8), st = gainStat(g, 'str', 0.2);
    return `${rng.pick(['소나무 판자를 대패로 밀고 나무못을 박았다. 관 두 개가 마당에 섰다.', '아이 관 하나와 어른 관 하나. 아이 관이 더 오래 걸렸다.', '참나무 관을 하나 짜 두었다. 부잣집 장례가 들면 쓸 것이다.'])}${gains([up('장의 솜씨', k), up('힘', st)])}`;
  },
});

/* ---------- 장례를 맡는다 ---------- */
const RANK_PICK = (g, rng) => {
  const y = YARDS[here(g)] ?? {};
  const pool = ['pauper', 'farmer', 'farmer', 'craft', 'stranger', 'condemned', 'merchant'];
  if (y.big >= 2) pool.push('merchant', 'craft');
  if (y.nobles) pool.push('noble', 'merchant');
  if (plagueHere(g).length) pool.push('pauper', 'pauper');
  return pool[Math.floor(rng.next() * pool.length)];
};
ACTIONS.push({
  id: 'ut_funeral', name: '장례를 맡는다', icon: 'grave',
  desc: '상가를 맡아 장례를 처음부터 끝까지 치른다. 죽은 이의 신분마다 장례가 다르고, 받는 값도 다르다.',
  available: (g) => free(g) && ((isUT(g) && skill(g) >= 10) || shopHere(g)) && mi(g) - (U(g).funAt ?? -99) >= 2 && !sceneQueued(g, 'ut_funeral'),
  run(g, rng) { U(g).funAt = mi(g); const r = RANK_PICK(g, rng); queueScene(g, 'ut_funeral', { rank: r }, { first: true }); return `${RANKS[r].name}의 상가에서 사람이 왔다. 검은 천을 챙겨 나섰다.`; },
});
const FUN = {
  pauper: [['free', '내 돈으로 관을 짜 준다 (은화 셋)'], ['pit', '공동 구덩이에 묻되 기도는 빼놓지 않는다'], ['quick', '서둘러 묻고 다음 일로 간다']],
  farmer: [['proper', '정성껏 치른다'], ['discount', '값을 깎아 준다'], ['upsell', '비싼 참나무 관을 권한다']],
  craft: [['banner', '조합 깃발로 관을 덮고 행렬을 꾸민다'], ['proper', '조용히 치른다'], ['upsell', '조합 돈으로 돌 비석까지 권한다']],
  merchant: [['mourners', '곡꾼 열 명을 사서 큰 장례를 치른다'], ['honest', '곡꾼은 필요 없다고 말한다'], ['skim', '곡꾼 셋만 부르고 열 명 값을 받는다']],
  noble: [['perfect', '양피지 순서대로 한 치도 어김없이 치른다'], ['plain', '간소하게 하자고 권한다'], ['rush', '빨리 끝내고 값을 받는다']],
  stranger: [['letter', '편지를 읽혀 고향으로 부친다'], ['name', "비석에 '이름 모를 나그네'라 새긴다"], ['pocket', '품속의 은화를 챙긴다']],
  condemned: [['inside', '묘지 담 안 구석에 몰래 묻어 준다'], ['outside', '담 밖에 묻는다'], ['sell', '밤에 찾아온 의학원 사람에게 몸을 넘긴다']],
};
defineScene('ut_funeral', {
  need: (g, s) => !!RANKS[s.rank],
  title: (g, s) => `${RANKS[s.rank].name}의 장례`,
  text: (g, s) => `${RANKS[s.rank].desc}${s.rank === 'noble' && yardOf(here(g))?.crypt ? ` 자리는 ${yardOf(here(g)).crypt}.` : ''}`,
  choices: (g, s) => FUN[s.rank].filter(([k]) => k !== 'free' || g.player.money >= 3).map(([key, label]) => ({ label, key })),
  resolve(g, rng, s, key) {
    const r = RANKS[s.rank], st = U(g), y = yardHere(g), coffin = shopHere(g) && st.shop.coffins > 0;
    st.funerals += 1; gainU(g, 1.2);
    if (coffin && !['pauper', 'stranger', 'condemned'].includes(s.rank)) st.shop.coffins -= 1;
    const fee = (m = 1) => earn(g, r.fee * m * (coffin ? 1.3 : 1) * (0.8 + skill(g) / 200));
    switch (key) {
      case 'free': pay(g, 3); deed(g, 'kind', 3, null); return '판자 세 장으로 관을 짰다. 교구 사제가 와서 이름을 불러 주었다. 거적이 아니라 관에 누워 가는 빈민은 이 골목에서 처음이라 했다.';
      case 'pit': deed(g, 'kind', 1, null); return '공동 구덩이에 내려놓고 흙을 덮기 전에 이름을 세 번 불렀다. 이름을 아는 사람은 나밖에 없었다.';
      case 'quick': stress(g, 3); return '흙을 덮고 삽을 털었다. 다음 상가가 기다린다. 이름은 묻지 못했다.';
      case 'proper': { const n = fee(); deed(g, 'kind', 1, null); return `종이 울리고 상여가 나갔다. 식구들이 무덤가에서 흙 한 줌씩을 던졌다. 은화 ${n}닢을 받았다.`; }
      case 'discount': { const n = fee(0.5); deed(g, 'generous', 2, null); return `값을 반만 받았다. 과부가 다음 장에 달걀 한 바구니를 들고 왔다. 은화 ${n}닢.`; }
      case 'upsell': { const n = fee(1.8); deed(g, 'honest', -1, null); return `참나무 관이 오래간다고 했다. 식구들은 빚을 내어 그 관을 샀다. 은화 ${n}닢. 관이 오래간들 누가 보겠는가.`; }
      case 'banner': { const n = fee(1.2); return `조합원들이 깃발을 들고 상여 뒤를 따랐다. 망치 소리 대신 발소리가 골목을 채웠다. 은화 ${n}닢.`; }
      case 'mourners': { const n = fee(1.4); return `곡꾼 열 명이 머리를 풀고 길을 메웠다. 이웃들이 창문마다 얼굴을 내밀었다. 상주는 흡족해했다. 은화 ${n}닢.`; }
      case 'honest': { const n = fee(0.8); deed(g, 'honest', 2, null); return `"돈으로 산 울음은 하늘에 닿지 않소." 상주는 얼굴을 붉혔다가, 장례가 끝나고 내 손을 오래 잡았다. 은화 ${n}닢.`; }
      case 'skim': { const n = fee(1.6); deed(g, 'honest', -3, null); return `곡꾼 셋이 목청을 높였다. 상주는 세지 않았다. 은화 ${n}닢. 남은 일곱 몫은 내 주머니로 갔다.`; }
      case 'perfect': {
        y.rich += 3;
        if (rng.chance(0.4 + skill(g) / 120)) { const n = fee(1.3); L(g).renown = (L(g).renown ?? 0) + 1; chron(g, `${placeName(here(g))}의 장의사 ${J(g.player.name, '이/가')} 큰 가문의 장례를 흠 없이 치르다.`, 8); return `횃불 마흔 개가 같은 걸음으로 움직였다. 문장 덮개는 한 번도 기울지 않았다. 집사가 양피지에 마지막 줄을 긋고 고개를 숙였다. 은화 ${n}닢.`; }
        const n = fee(0.6); stress(g, 8); return `납골당 문 앞에서 횃불 하나가 꺼졌다. 집사의 얼굴이 굳었다. 값의 절반은 '흠'이라는 이름으로 깎였다. 은화 ${n}닢.`;
      }
      case 'plain': { y.rich += 1; const n = fee(0.7); deed(g, 'honest', 1, null); return `"검소함이 고인의 덕을 보여 줄 겁니다." 늙은 부인은 고개를 끄덕였고, 아들은 끝까지 나를 노려보았다. 은화 ${n}닢.`; }
      case 'rush': { y.rich += 2; const n = fee(0.9); deed(g, 'loyal', -1, null); return `순서 세 가지를 건너뛰었다. 아무도 몰랐다. 아마도. 은화 ${n}닢.`; }
      case 'letter': deed(g, 'kind', 2, null); earn(g, 2); return '서기에게 편지를 읽혔다. 바다 건너 마을의 어머니에게 보내는 편지였다. 내 글을 덧붙여 부쳤다. 답장이 올지는 모른다.';
      case 'name': earn(g, 2); return "비석에 '이름 모를 나그네, 여기 쉬다'라고 새겼다. 봄이 되자 누군가 그 앞에 들꽃을 두고 갔다.";
      case 'pocket': deed(g, 'honest', -2, null); earn(g, 7); return '품속에서 은화 일곱 닢이 나왔다. 편지는 읽지 않고 함께 묻었다.';
      case 'inside':
        deed(g, 'kind', 2, null);
        if (rng.chance(0.3)) { const f = pay(g, 6); deed(g, 'loyal', -1, null); return `밤에 담 안 구석에 묻었다. 사흘 뒤 사제가 알아차렸다. 벌금 은화 ${f}닢. 그래도 무덤은 파내지 않았다. 어미가 날마다 그 구석에 온다.`; }
        return '밤에 담 안 구석에 묻었다. 표지는 돌 하나. 어미가 날마다 그 구석에 와서 돌을 쓰다듬는다. 사제는 모른 척하는 것 같다.';
      case 'outside': earn(g, 2); return '담 밖, 쐐기풀 자라는 땅에 묻었다. 교수대에서 내린 몸들은 다 그곳에 있다. 어미는 담 너머로 손을 뻗었다.';
      case 'sell': deed(g, 'honest', -4, null); deed(g, 'kind', -3, null); earn(g, 15); y.rumor = clamp(y.rumor + 12, 0, 100); return '자정에 의학원 수레가 왔다. 은화 열다섯 닢. 아침에 어미에게는 묻었다고 했다. 빈 무덤에 흙만 덮었다. 그 뒤로 묘지에 흉한 말이 돌기 시작했다.';
      default: return '';
    }
  },
});

/* ---------- 밤의 묘지와 도굴꾼 ---------- */
ACTIONS.push({
  id: 'ut_watch', name: '밤 묘지를 지킨다', icon: 'lantern',
  desc: '등불을 들고 밤새 묘지를 돈다. 큰 장례 뒤에는 도굴꾼이 꼬인다.',
  available: (g) => free(g) && !!yardHere(g) && (isGD(g) || (deathWork(g) && yardHere(g).robbed > 0)) && mi(g) - yardHere(g).guardAt >= 1 && g.player.fatigue < 85,
  run(g, rng) {
    const y = yardHere(g); y.guardAt = mi(g); tired(g, 12);
    const w = gainStat(g, 'wil', 0.25); gainU(g, 0.5);
    if (rng.chance(clamp(0.2 + y.rich * 0.06 + y.robbed * 0.03, 0.2, 0.75)) && !sceneQueued(g, 'ut_robbers')) {
      queueScene(g, 'ut_robbers', { who: y.rich >= 3 ? 'gang' : rng.pick(['gang', 'student', 'widow']) }, { first: true });
      return '자정 넘어, 새로 덮은 무덤 쪽에서 삽 소리가 났다. 등불을 낮추었다.';
    }
    return `${rng.pick(['밤새 아무 일도 없었다. 부엉이 한 마리가 비석 위에서 나를 따라 고개를 돌렸다.', '안개가 무덤 사이로 낮게 깔렸다. 등불 빛이 세 걸음 앞에서 끊겼다. 새벽닭이 울 때까지 걸었다.', '담 밖에서 술 취한 젊은이들이 담력 시험을 하러 왔다가 내 등불을 보고 비명을 지르며 달아났다.'])}${gains([up('의지', w)])}`;
  },
});
const ROB = {
  gang: { title: '도굴꾼', text: '셋이다. 지난주 묻은 상인의 무덤을 파헤치고 있다. 하나가 나를 보고 삽을 들었다. 다른 하나가 은화 주머니를 흔든다. "반 나누지, 묘지기 양반."', choices: [['shout', '소리쳐 마을을 깨운다'], ['fight', '삽을 들고 덤빈다'], ['bribe', '주머니를 받고 등불을 끈다']] },
  student: { title: '의학원 학생', text: '창백한 젊은이 둘이 갓 묻은 무덤을 파고 있다. 들킨 줄 알자 무릎을 꿇었다. "사람 몸 속을 모르고는 사람을 못 고칩니다."', choices: [['report', '경비대에 넘긴다'], ['let', '흙을 도로 덮게 하고 보내 준다'], ['bribe', '은화를 받고 못 본 척한다']] },
  widow: { title: '무덤가의 여인', text: '여인 하나가 맨손으로 흙을 파고 있다. 남편과 함께 묻힌 혼인 반지를 찾는다고 한다. 빚쟁이들이 집을 가져간다고.', choices: [['help', '삽으로 대신 파 준다'], ['stop', '말리고 집으로 보낸다'], ['report', '경비대를 부른다']] },
};
defineScene('ut_robbers', {
  need: (g, s) => !!yardHere(g) && !!ROB[s.who],
  title: (g, s) => ROB[s.who].title,
  text: (g, s) => ROB[s.who].text,
  choices: (g, s) => ROB[s.who].choices.map(([key, label]) => ({ label, key })),
  resolve(g, rng, s, key) {
    const st = U(g), y = yardHere(g);
    switch (key) {
      case 'shout': y.rich = Math.max(0, y.rich - 2); deed(g, 'brave', 1, null); return '종탑 줄을 당겼다. 개들이 짖고 창마다 불이 켜졌다. 도굴꾼들은 삽을 버리고 담을 넘었다. 무덤은 반쯤 파인 채였다.';
      case 'fight':
        y.rich = 0; deed(g, 'brave', 2, null);
        if (rng.chance(0.35 + (g.player.stats.str ?? 20) / 200)) { st.caught += 1; earn(g, 5); chron(g, `${placeName(here(g))} 묘지기가 도굴꾼을 붙잡다.`, 4); return '삽자루가 먼저 닿았다. 하나가 쓰러지고 둘은 달아났다. 쓰러진 놈을 묶어 아침에 경비대에 넘겼다. 상인 집안이 은화 다섯 닢을 보냈다.'; }
        g.player.injuries.push({ name: '도굴꾼의 삽에 맞은 어깨', months: 2 });
        return '어깨에 삽날이 떨어졌다. 등불이 굴렀다. 정신이 들었을 땐 무덤이 비어 있었다.';
      case 'bribe': deed(g, 'honest', -3, null); deed(g, 'loyal', -2, null); earn(g, s.who === 'gang' ? 10 : 4); y.robbed += 1; y.rumor = clamp(y.rumor + 10, 0, 100); return '등불을 껐다. 새벽까지 삽 소리가 이어졌다. 아침에 흙을 고르게 다져 두었다. 주머니는 무거웠고, 그날 밤 잠은 가볍지 않았다.';
      case 'report': st.caught += 1; deed(g, 'honest', 1, null); return s.who === 'widow' ? '경비대가 여인을 끌고 갔다. 여인은 뒤돌아보지 않았다. 반지는 아직 땅속에 있다.' : '경비대가 와서 둘을 끌고 갔다. 의학원장이 이튿날 와서 벌금을 냈다. 그 뒤로 의학원은 교수대에서 내린 몸만 산다고 한다.';
      case 'let': deed(g, 'kind', 2, null); return '흙을 도로 덮게 했다. 그들이 끝까지 다 덮는 것을 지켜보았다. 하나가 떠나며 말했다. "언젠가 당신 병을 고쳐 드리겠소."';
      case 'help': deed(g, 'kind', 2, null); deed(g, 'honest', -1, null); return '삽으로 관 뚜껑까지 팠다. 여인이 반지를 빼내고 남편 손을 한 번 쥐었다. 다시 흙을 덮고 새벽 전에 다졌다. 아무도 모른다. 나와 여인과 죽은 남자만 안다.';
      case 'stop': stress(g, 3); return '여인의 손을 잡아 일으켰다. 손톱이 다 깨져 있었다. 집까지 바래다주었다. 빚쟁이들이 문 앞에 앉아 있었다.';
      default: return '';
    }
  },
});

/* ---------- 무덤 자리 ---------- */
ACTIONS.push({
  id: 'ut_plot', name: '집안 무덤 자리를 산다', icon: 'grave',
  desc: '이 고장 묘지에 집안 사람들이 누울 자리를 미리 사 둔다. 나이가 들었거나 식구를 묻어야 할 때.',
  available: (g) => free(g) && adult(g) && !!yardHere(g) && !U(g).plot && (playerAge(g) >= 40 || deathWork(g)) && g.player.money >= plotPrice(here(g)) && !sceneQueued(g, 'ut_plot'),
  run(g) { queueScene(g, 'ut_plot', {}, { first: true }); return `${yardOf(here(g)).name} 묘지기를 찾아갔다.`; },
});
defineScene('ut_plot', {
  need: (g) => !!yardHere(g) && !U(g).plot,
  title: () => '무덤 자리',
  text: (g) => { const y = yardHere(g); return `묘지기가 장부를 펼쳤다. "${y.full >= 80 ? '남은 자리가 얼마 없소. ' : ''}볕 드는 언덕 자리, 담 옆 자리가 있소.${yardOf(here(g)).crypt ? ` ${yardOf(here(g)).crypt}에 한 칸 비는 데도 있긴 한데, 값이 다르오.` : ''}"`; },
  choices: (g) => { const p = plotPrice(here(g)), m = g.player.money; return [
    ...(m >= Math.round(p * 1.5) ? [{ label: `볕 드는 언덕 자리 (은화 ${Math.round(p * 1.5)})`, key: 'hill' }] : []),
    { label: `담 옆 자리 (은화 ${p})`, key: 'wall' },
    ...(yardOf(here(g)).crypt && m >= p * 4 ? [{ label: `납골당 한 칸 (은화 ${p * 4})`, key: 'crypt' }] : []),
    { label: '다음에 정한다', key: 'no' },
  ]; },
  resolve(g, rng, s, key) {
    if (key === 'no') return '장부가 덮였다. 묘지기는 서두를 것 없다고 했다. 다들 언젠가는 온다고.';
    const p = plotPrice(here(g)), cost = { hill: Math.round(p * 1.5), wall: p, crypt: p * 4 }[key];
    pay(g, cost); U(g).plot = { place: here(g), since: mi(g), kind: key }; U(g).plotAt = mi(g);
    const yd = yardOf(here(g)).name;
    logU(g, `${yd}에 집안 무덤 자리를 샀다.`); note(g, `${yd}에 집안 무덤 자리를 샀다.`);
    return { hill: '언덕 위, 늙은 보리수 아래. 아침 해가 먼저 닿는 자리다. 말뚝 넷을 박고 집안 이름을 새긴 돌을 놓았다.', wall: '담 옆, 이끼 낀 돌담이 바람을 막아 준다. 말뚝 넷을 박았다. 이제 집안 사람들이 갈 곳이 정해졌다.', crypt: '납골당 계단을 내려가 빈 칸 하나를 받았다. 돌문에 집안 이름이 새겨질 것이다. 차고 조용했다.' }[key];
  },
});
ACTIONS.push({
  id: 'ut_plotsell', name: '무덤 자리를 판다', icon: 'coin',
  desc: '묘지 자리를 찾는 집안에 자리를 판다. 좋은 자리는 모자라고, 사려는 사람은 많다.',
  available: (g) => free(g) && (shopHere(g) || (isGD(g) && skill(g) >= 20)) && mi(g) - U(g).sellAt >= 4 && (yardHere(g)?.full ?? 100) < 95 && !sceneQueued(g, 'ut_plotsale'),
  run(g) { U(g).sellAt = mi(g); queueScene(g, 'ut_plotsale', {}, { first: true }); return '묘지 장부를 들고 언덕을 한 바퀴 돌았다.'; },
});
defineScene('ut_plotsale', {
  need: (g) => !!yardHere(g),
  title: () => '볕 드는 자리 하나',
  text: () => '언덕 위 볕 드는 자리가 하나 남았다. 남편을 잃은 늙은 과부가 먼저 와서 기다렸고, 뒤이어 온 상인은 값의 두 배를 부른다. 언덕 아래에는 백 년 전에 묻혀 찾는 이 없는 무덤 몇이 있다.',
  choices: () => [{ label: '먼저 온 과부에게 판다', key: 'widow' }, { label: '상인에게 판다', key: 'rich' }, { label: '잊힌 옛 무덤을 비워 둘 다에게 판다', key: 'old' }],
  resolve(g, rng, s, key) {
    const p = plotPrice(here(g)), y = yardHere(g);
    y.full = clamp(y.full + 1, 0, 100);
    if (key === 'widow') { const n = earn(g, p * 0.6); deed(g, 'kind', 1, null); deed(g, 'honest', 1, null); return `과부는 보리수 아래 자리를 샀다. 값을 다 치르지 못해 나머지는 봄에 갚겠다고 했다. 은화 ${n}닢. 상인은 문을 쾅 닫고 나갔다.`; }
    if (key === 'rich') { const n = earn(g, p * 1.5); deed(g, 'kind', -1, null); return `상인이 은화를 셌다. ${n}닢. 과부는 담 옆 자리를 보러 언덕을 내려갔다. 지팡이 소리가 느렸다.`; }
    const n = earn(g, p * 1.8); deed(g, 'honest', -3, null); y.rumor = clamp(y.rumor + 12, 0, 100); y.full = clamp(y.full - 2, 0, 100);
    return `밤에 옛 무덤 두 기를 비웠다. 남은 것은 납골 구덩이로 옮겼다. 둘 다에게 자리를 팔았다. 은화 ${n}닢. 비석 하나는 담 밑에 엎어 두었다. 이름이 반쯤 지워진 비석이었다.`;
  },
});

/* ---------- 역병 수레 ---------- */
ACTIONS.push({
  id: 'ut_plague', name: '역병 수레를 끈다', icon: 'cart',
  desc: '병이 크게 도는 고장에서 집집마다 시신을 거두어 묘지로 나른다. 품삯은 높지만 옮을 수 있다.',
  available: (g) => free(g) && adult(g) && !!yardHere(g) && plagueHere(g).length > 0 && g.player.fatigue < 85,
  run(g, rng) {
    const s = U(g), y = yardHere(g), o = plagueHere(g)[0];
    tired(g, 16); stress(g, 8); s.bodies += 3; y.wait = Math.max(0, y.wait - 3);
    deed(g, 'brave', 1, null); deed(g, 'kind', 1, null);
    const n = earn(g, 6 + rng.int(0, 4) + (deathWork(g) ? 2 : 0)), k = gainU(g, 1);
    const sick = rng.chance(deathWork(g) ? 0.08 : 0.15) && fallSick(g, o.kind, 'me', rng);
    return `${rng.pick(['종을 흔들며 골목을 돌았다. "죽은 이를 내놓으시오." 문이 열리고, 천에 싼 몸이 나왔다. 수레가 무거워졌다.', '식초 적신 천으로 입을 막고 수레를 끌었다. 한 집에서 셋이 나왔다. 아무도 울지 않았다. 울 사람이 남지 않았다.', '묘지 끝에 판 긴 구덩이로 수레를 몰았다. 사제가 구덩이 끝에서 한꺼번에 기도했다. 이름을 다 부를 수가 없었다.'])} 은화 ${n}닢.${sick ? ` 밤에 열이 올랐다. ${J(o.name, '이/가')} 나에게도 왔다.` : ''}${gains([up('장의 솜씨', k)])}`;
  },
});

/* ---------- 묘지에 도는 소문 ---------- */
defineScene('ut_rumor', {
  need: (g) => !!yardHere(g),
  title: () => '묘지의 불빛',
  text: (g) => `"밤마다 ${yardOf(here(g)).name}에 파란 불빛이 떠다닌다오." 장에서 들은 말이 벌써 세 번째다. 무덤 자리를 보러 오던 사람들이 발길을 끊었다.`,
  choices: (g) => [{ label: '등불 들고 직접 가 본다', key: 'look' }, ...(g.player.money >= 3 ? [{ label: '사제를 불러 성수를 뿌린다 (은화 셋)', key: 'priest' }] : []), { label: '헛소문이라 웃어넘긴다', key: 'ignore' }],
  resolve(g, rng, s, key) {
    const y = yardHere(g);
    if (key === 'ignore') { y.rumor = clamp(y.rumor - 5, 0, 100); return '헛소문이라 했다. 사람들은 고개를 끄덕였지만, 해 지면 묘지 길로 다니지 않았다.'; }
    if (key === 'priest') { pay(g, 3); y.rumor = clamp(y.rumor - 20, 0, 100); return '사제가 무덤 사이를 돌며 성수를 뿌렸다. 사람들이 멀찍이서 지켜보았다. 불빛 이야기가 조금 잦아들었다.'; }
    deed(g, 'brave', 1, null);
    if (spotsAt(g, here(g)).length) { y.rumor = clamp(y.rumor - 5, 0, 100); return '등불을 들고 갔다. 불빛은 있었다. 가까이 가자 등불 심지가 저절로 낮아졌다. 이건 삽과 등불로 할 일이 아니다. 영매나 퇴마사를 찾아야 한다.'; }
    y.rumor = clamp(y.rumor - 35, 0, 100);
    return rng.pick([
      '불빛을 따라가 보니 무덤가에서 늪 가스가 새어 나와 타고 있었다. 흙을 덮고 돌을 눌러 두었다. 이튿날 장에서 그 이야기를 했다. 사람들은 반만 믿었다.',
      '불빛은 등잔이었다. 아들을 잃은 여인이 밤마다 무덤에 와서 이야기를 하고 있었다. 사연을 마을에 전하자 아무도 더는 무서워하지 않았다.',
      '불빛은 도굴꾼의 등불이었다. 놈들은 내 등불을 보고 달아났다. 경비대가 그다음 주에 한 놈을 잡았다. 소문이 걷혔다.',
    ]);
  },
});

export { plagueHere };
