// 아기 때부터 열넷까지: 자라면서 겪는 일들.
import { gainStat, gainSkill } from '../game.js';
import {
  EVENTS, flag, setFlag, father, mother, alive, age, ageM, siblings, findJob, peers, friends, bestFriend,
  stat, skill, money, spend, spendFamily, stress, tire, like, note, injure, check, nm, josa, living, byId, ageYears, isFamily,
} from './core.js';
import { makePerson, kill } from '../npc.js';
import { J } from '../narrative/text.js';
const homeSibs = (g) => siblings(g).filter((s) => ageYears(s) >= 4 && ageYears(s) <= 17 && (s.place ?? 'ern') === (g.life?.place ?? 'ern'));

const parent = (g) => (alive(mother(g)) ? mother(g) : alive(father(g)) ? father(g) : null);
const opposite = (g) => (g.player.sex === 'm' ? 'f' : 'm');

EVENTS.push(
  // ---------- 아기 (0~2살) ----------
  {
    id: 'infant_fever', once: true,
    cond: (g) => ageM(g) >= 4 && ageM(g) <= 30,
    chance: () => 0.06, weight: 70,
    title: '밤의 열',
    text: (g) => `아기가 불덩이처럼 뜨겁다. 울음소리도 점점 가늘어진다. ${nm(parent(g), '어른들')}의 얼굴이 하얗게 질렸다. 이 시대에 아이 셋 중 하나는 다섯 살을 넘기지 못한다.`,
    choices: [
      { label: '약초사를 부른다', run: (g) => { spendFamily(g, 4); const h = findJob(g, 'herbalist'); like(h, 5); gainStat(g, 'wil', 0.4); return `${J(nm(h, '약초사'), '이/가')} 버드나무 껍질을 달인 물을 떠먹였다. 새벽녘에 열이 내렸다. 집안 돈이 조금 줄었다.`; } },
      { label: '예배당에서 기도한다', run: (g) => { const p = findJob(g, 'priest'); like(p, 4); if (g.player.manaPotential > 0.4) setFlag(g, 'fever_mark'); gainStat(g, 'wil', 0.6); return `사제가 밤새 성광의 기도문을 외웠다. 사흘 만에 열이 내렸다. 그 뒤로 아이의 눈동자 색이 아주 조금 옅어졌다고, 어머니는 나중에 말했다.`; } },
      { label: '밤새 품에 안고 버틴다', run: (g) => { const p = parent(g); like(p, 6); gainStat(g, 'wil', 0.8); stress(g, 5); return `${J(nm(p, '어머니'), '이/가')} 젖은 천으로 몸을 닦으며 밤을 새웠다. 아이는 살아남았다. 그 밤을 기억하지는 못하지만, 몸은 기억하는 듯했다.`; } },
    ],
  },
  {
    id: 'sibling_born',
    cond: (g) => age(g) >= 2 && siblings(g).some((s) => s.ageMonths <= 2),
    weight: 85, cooldown: 12,
    prepare: (g) => ({ id: siblings(g).find((s) => s.ageMonths <= 2).id }),
    title: '동생',
    text: (g, c) => { const s = byId(g, c.id); return `집에 ${s.sex === 'm' ? '남동생' : '여동생'}이 생겼다. 이름은 ${s.name}. 쭈글쭈글하고 붉은 얼굴로 쉬지 않고 운다. 어른들의 관심이 전부 그쪽으로 갔다.`; },
    choices: [
      { label: '들여다보며 손가락을 내민다', run: (g, rng, c) => { const s = byId(g, c.id); like(s, 15); gainStat(g, 'cha', 0.4); return `작은 손이 손가락을 꽉 쥐었다. 생각보다 힘이 셌다. ${s.name}은(는) 그 뒤로 내 뒤만 졸졸 따라다니게 된다.`; } },
      { label: '샘이 나서 토라진다', run: (g, rng, c) => { const s = byId(g, c.id); like(s, 3); stress(g, 8); like(mother(g), -2); return '한동안 말을 하지 않았다. 아무도 눈치채지 못한 것 같아서 더 서러웠다.'; } },
    ],
  },
  {
    id: 'hero_lullaby', once: true,
    cond: (g) => age(g) >= 2 && age(g) <= 4 && alive(parent(g)),
    chance: () => 0.08, weight: 50,
    title: '용사의 자장가',
    text: (g) => `${J(nm(parent(g)), '이/가')} 잠들기 전에 낮은 목소리로 옛이야기를 들려준다. 오백 년 전, 레오니아 시골에서 태어난 소년 아르스가 마신을 봉인하고 돌아오지 않았다는 이야기다.`,
    choices: [
      { label: '"용사는 어디로 갔어요?"', run: (g) => { gainStat(g, 'int', 0.5); setFlag(g, 'asked_arth'); return '"아무도 몰라. 죽었다는 사람도 있고, 아직 봉인 안에서 마신을 붙잡고 있다는 사람도 있지." 그 대답이 이상하게 오래 마음에 남았다.'; } },
      { label: '"마신은 다시 와요?"', run: (g) => { gainStat(g, 'sen', 0.5); return `어른은 한참 대답하지 않았다. "...그래서 사람들이 매년 봉인제를 지내는 거란다." 창밖 북쪽 하늘이 유난히 어두웠다.`; } },
      { label: '듣다가 잠든다', run: (g) => { stress(g, -5); return '이야기의 끝은 듣지 못했다. 꿈속에서 누군가 검을 들고 얼음 위를 걷고 있었다.'; } },
    ],
  },
  {
    id: 'toddler_lost', once: true,
    cond: (g) => age(g) >= 2 && age(g) <= 4,
    chance: () => 0.04, weight: 60,
    title: '사라진 아이',
    text: () => '어른들이 잠깐 한눈판 사이 아이가 집에서 사라졌다. 마을 사람들이 이름을 부르며 흩어졌다. 해가 지기 시작한다.',
    choices: [
      { label: '(강가에서)', run: (g) => { gainStat(g, 'sen', 0.6); const h = findJob(g, 'hunter'); like(h, 6); return `강가 갈대숲에서 물새를 쫓고 있는 아이를 ${nm(h, '사냥꾼')}이 찾아냈다. 한 걸음만 더 갔으면 깊은 물이었다. 그날 밤 처음으로 아버지에게 엉덩이를 맞았다.`; } },
      { label: '(숲 가장자리에서)', run: (g) => { gainStat(g, 'wil', 0.6); setFlag(g, 'forest_child'); return '숲 가장자리 고목 아래에서 잠든 아이가 발견되었다. 주변 흙에 커다란 발자국이 찍혀 있었지만, 아이는 털끝 하나 다치지 않았다. 사냥꾼은 그 발자국을 보고 오래 말이 없었다.'; } },
    ],
  },

  // ---------- 어린 시절 (4~9살) ----------
  {
    id: 'mana_test', once: true,
    cond: (g) => age(g) >= 6 && living(g).some((p) => p.job === 'priest'),
    weight: 93,
    title: '수정구 앞에서',
    text: () => '여섯 살이 된 아이들은 예배당에서 마력 검사를 받는다. 제단 위의 흐린 수정구에 손을 얹으면, 마력이 있는 아이는 빛이 난다. 대부분은 아무 일도 일어나지 않는다.',
    choices: [
      {
        label: '손을 얹는다',
        run: (g) => {
          const p = g.player;
          setFlag(g, 'mana_tested');
          if (p.manaPotential > 0.55) { p.manaAwakened = true; p.mana = Math.max(p.mana, 4); setFlag(g, 'mana_known'); setFlag(g, 'mana_famous'); return '수정구가 눈부시게 타올랐다. 예배당이 조용해졌다. 사제가 떨리는 손으로 무언가를 적었다. 그날 저녁, 마을 사람 절반이 집 앞을 기웃거렸다. 이 일은 하르펜까지, 어쩌면 더 멀리 퍼질 것이다.'; }
          if (p.manaPotential > 0.18) { p.manaAwakened = true; p.mana = Math.max(p.mana, 2); setFlag(g, 'mana_known'); return '수정구 속에서 희미한 빛이 흔들렸다. 사제가 고개를 끄덕였다. "재능이 있구나. 크지는 않지만." 부모는 기뻐해야 할지 걱정해야 할지 모르는 얼굴이었다.'; }
          gainStat(g, 'wil', 0.3);
          return '수정구는 끝내 흐린 채였다. 사제는 늘 하던 말을 했다. "성광은 모두에게 다른 길을 주신단다." 조금 실망했지만, 대부분의 아이들이 그랬다.';
        },
      },
      {
        label: '빛이 나지 않게 마음을 누른다',
        show: (g) => g.player.manaAwakened,
        run: (g) => { setFlag(g, 'mana_tested'); setFlag(g, 'mana_hidden'); gainSkill(g, 'magic', 1.0, 'wil'); gainStat(g, 'wil', 1.0); return '몸속의 흐름을 숨죽여 붙잡았다. 수정구가 아주 잠깐 흔들렸지만 사제는 보지 못했다. 이 힘을 아는 건 나뿐이다.'; },
      },
    ],
  },
  {
    id: 'first_chores', once: true,
    cond: (g) => age(g) >= 7,
    chance: () => 0.3, weight: 40,
    title: '일곱 살의 일',
    text: (g) => `"이제 너도 일곱이다." ${nm(parent(g), '어른')}이(가) 물동이를 내밀었다. 평민 아이는 일곱 살부터 집안일을 거든다.`,
    choices: [
      { label: '물을 긷는다', run: (g) => { gainStat(g, 'str', 0.8); tire(g, 8); return '우물과 집 사이를 열 번 오갔다. 팔이 떨렸지만 물동이를 엎지 않았다.'; } },
      { label: '부엌을 돕는다', run: (g) => { gainSkill(g, 'cooking', 1.5, 'sen'); return '양파를 썰다 눈물을 쏟았다. 그래도 저녁 수프에는 내 손이 들어갔다.'; } },
      { label: '동생들을 본다', show: (g) => siblings(g).some((s) => ageYears(s) < age(g)), run: (g) => { for (const s of siblings(g)) like(s, 5); gainStat(g, 'cha', 0.6); return '하루 종일 동생들을 쫓아다녔다. 저녁 무렵엔 누가 누구를 돌본 건지 모르게 되었다.'; } },
    ],
  },
  {
    id: 'stray_dog', once: true,
    cond: (g) => age(g) >= 4 && age(g) <= 11,
    chance: () => 0.03, weight: 45,
    title: '떠돌이 개',
    text: () => '헛간 뒤에 마른 개 한 마리가 웅크리고 있다. 한쪽 귀가 찢어져 있고, 갈비뼈가 드러났다. 다가가자 이빨을 보였다가, 이내 꼬리를 낮게 흔든다.',
    choices: [
      { label: '먹을 것을 나눠 준다', run: (g) => { setFlag(g, 'dog', '잿빛'); gainStat(g, 'cha', 0.4); gainStat(g, 'sen', 0.4); return '빵 조각을 던져 주자 허겁지겁 삼켰다. 다음 날도, 그다음 날도 개는 그 자리에 있었다. 이름을 "잿빛"이라고 지었다. 녀석은 밤마다 집 문 앞에서 잔다.'; } },
      { label: '돌을 던져 쫓는다', run: (g) => { stress(g, 3); return '개는 절뚝이며 숲 쪽으로 사라졌다. 며칠 뒤 숲가에서 늑대 울음이 들렸다.'; } },
    ],
  },
  {
    id: 'broken_jar',
    cond: (g) => age(g) >= 5 && age(g) <= 11,
    chance: () => 0.025, weight: 35,
    title: '깨진 항아리',
    text: (g) => `뛰어다니다 부엌 선반의 항아리를 깼다. ${J(nm(parent(g), '어머니'), '이/가')} 시집올 때 가져온, 하나뿐인 채색 항아리였다. 아직 아무도 모른다.`,
    choices: [
      { label: '솔직히 말한다', run: (g) => { like(parent(g), 4); gainStat(g, 'wil', 0.6); setFlag(g, 'honest', (flag(g, 'honest') ?? 0) + 1); return '한참 혼났다. 그런데 잠자리에서 어머니가 말했다. "숨기지 않아서 고맙다." 그 말이 혼난 것보다 오래 남았다.'; } },
      { label: '고양이 탓으로 돌린다', run: (g) => { gainStat(g, 'cha', 0.4); setFlag(g, 'liar', (flag(g, 'liar') ?? 0) + 1); return '아무도 의심하지 않았다. 이웃집 고양이가 그날 빗자루로 쫓겨났다. 거짓말은 생각보다 쉬웠다.'; } },
      { label: '조각을 몰래 붙여 둔다', run: (g) => { gainStat(g, 'agi', 0.5); return '송진으로 조각을 붙여 제자리에 두었다. 들킨 건 석 달 뒤였다. 어머니는 금 간 항아리를 버리지 않았다.'; } },
    ],
  },
  {
    id: 'river_rescue', once: true,
    cond: (g) => age(g) >= 6 && age(g) <= 13 && peers(g, 4).length > 0,
    chance: () => 0.02, weight: 65,
    prepare: (g, rng) => ({ id: rng.pick(peers(g, 4)).id }),
    title: '물에 빠진 아이',
    text: (g, c) => `봄 물이 불어난 강에서 비명이 들렸다. ${nm(byId(g, c.id))}이(가) 물살에 휩쓸려 허우적거리고 있다. 근처에 어른은 없다.`,
    choices: [
      { label: '뛰어든다', run: (g, rng, c) => { const p = byId(g, c.id); if (check(rng, stat(g, 'str') + stat(g, 'agi'), 30)) { like(p, 30); gainStat(g, 'wil', 1.2); note(g, p, '강에 빠졌다가 목숨을 건졌다.'); setFlag(g, 'saved_' + p.id); return `차가운 물이 숨을 막았다. 그래도 ${p.name}의 옷깃을 놓지 않았다. 둘 다 기어 나와 강가에 쓰러졌다. ${p.name}의 부모가 와서 아무 말 없이 나를 끌어안았다.`; } injure(g, '물을 먹어 생긴 폐렴', 2); like(p, 20); return `함께 휩쓸렸다. 하류에서 어부가 둘을 건져 냈다. 한 달을 앓아누웠지만, ${p.name}도 나도 살았다.`; } },
      { label: '긴 나뭇가지를 내민다', run: (g, rng, c) => { const p = byId(g, c.id); if (check(rng, stat(g, 'int') + stat(g, 'sen'), 20)) { like(p, 22); gainStat(g, 'int', 0.8); return `둑의 버드나무 가지를 꺾어 내밀었다. ${p.name}이(가) 그것을 붙잡았다. 머리를 쓴 덕에 둘 다 무사했다.`; } return `가지가 짧았다. 소리를 지르며 하류로 달렸다. 다행히 방앗간 물레에 걸린 ${p.name}을(를) 어른들이 건져 냈다.`; } },
      { label: '어른을 부르러 뛴다', run: (g, rng, c) => { const p = byId(g, c.id); if (rng.chance(0.75)) { like(p, 6); return `어른들이 달려와 ${p.name}을(를) 건져 냈다. 늦지 않았다.`; } stress(g, 30); kill(g, p, '익사'); return `어른들을 데리고 돌아왔을 때 강은 조용했다. ${p.name}은(는) 사흘 뒤 하류에서 발견되었다. 그 장면은 오래도록 꿈에 나왔다.`; } },
    ],
  },
  {
    id: 'old_soldier', cond: (g) => age(g) >= 6 && age(g) <= 14,
    chance: () => 0.025, weight: 40,
    title: '늙은 병사의 이야기',
    text: () => '여관 구석에서 한쪽 다리가 없는 노인이 맥주를 마시고 있다. 오십 년 전 북부 전쟁에서 붉은 마왕의 군대와 싸웠다고 한다. 아이들이 모여들었다.',
    choices: [
      { label: '마족 이야기를 조른다', run: (g) => { gainStat(g, 'int', 0.5); gainStat(g, 'wil', 0.3); setFlag(g, 'heard_demons'); return '"마족은 사람 말을 한다. 웃으면서. 그래서 더 무서운 거다." 노인은 의족을 두드렸다. "그놈들은 우리가 왜 싸우는지 궁금해했어. 진심으로."'; } },
      { label: '전투 이야기를 조른다', run: (g) => { gainSkill(g, 'sword', 0.6, 'str'); return '노인은 지팡이로 바닥에 진형을 그렸다. 방패벽, 창, 그리고 그 위로 떨어지던 불덩이. "검은 마지막이다. 살아남는 게 먼저야."'; } },
      { label: '맥주 한 잔을 사 드린다', show: (g) => money(g) >= 1, run: (g) => { spend(g, 1); gainStat(g, 'cha', 0.5); setFlag(g, 'veteran_friend'); return '노인이 눈을 가늘게 떴다. "넌 쓸 만한 놈이 되겠구나." 그날 그는 다른 아이들에게는 하지 않은 이야기를 했다. 북부 변경은 중앙이 자기들을 버렸다고 생각한다는 것.'; } },
    ],
  },
  {
    id: 'priest_letters', once: true,
    cond: (g) => age(g) >= 6 && age(g) <= 11 && !!findJob(g, 'priest'),
    chance: () => 0.06, weight: 50,
    title: '글을 배울 테냐',
    text: (g) => `${findJob(g, 'priest').name} 사제가 불렀다. "마을에 글을 아는 사람이 촌장과 나뿐이다. 일주일에 두 번, 예배당에서 가르쳐 주마. 대신 청소를 해라."`,
    choices: [
      { label: '배우겠다고 한다', run: (g) => { gainSkill(g, 'letters', 4.0, 'int'); gainStat(g, 'int', 0.6); like(findJob(g, 'priest'), 8); setFlag(g, 'priest_pupil'); return '석판에 처음으로 이름을 썼다. 글자는 비뚤었지만, 세상에 남는 무언가를 만든 기분이었다.'; } },
      { label: '거절한다', run: (g) => { gainStat(g, 'agi', 0.3); return '청소는 싫었다. 사제는 어깨를 으쓱했다. "마음 바뀌면 오너라."'; } },
    ],
  },
  {
    id: 'apple_theft', cond: (g) => age(g) >= 6 && age(g) <= 13,
    chance: () => 0.025, weight: 35,
    title: '장터의 사과',
    text: () => '장날, 과일 장수가 손님과 말다툼하느라 등을 돌렸다. 바로 앞 바구니에 빨간 사과가 수북하다. 아무도 보고 있지 않다.',
    choices: [
      { label: '하나 슬쩍한다', run: (g, rng) => { if (check(rng, stat(g, 'agi') + stat(g, 'sen'), 15)) { gainStat(g, 'agi', 0.6); setFlag(g, 'petty_thief', (flag(g, 'petty_thief') ?? 0) + 1); return '사과는 달았다. 심장이 쿵쾅거렸다. 두 번째는 더 쉬울 것 같았다.'; } stress(g, 15); like(parent(g), -4); return '손목을 붙잡혔다. 과일 장수가 부모 앞까지 끌고 갔다. 동화 세 닢을 물어 주고, 온 마을이 알게 되었다.'; } },
      { label: '그냥 지나친다', run: (g) => { gainStat(g, 'wil', 0.3); return '침을 삼키고 지나쳤다.'; } },
      { label: '장수에게 바구니를 지키라고 알린다', run: (g) => { gainStat(g, 'cha', 0.4); return '과일 장수가 고맙다며 흠집 난 사과 하나를 쥐여 주었다. 훔친 것보다 덜 달았지만, 마음은 편했다.'; } },
    ],
  },
  {
    id: 'lost_in_forest', cond: (g) => age(g) >= 6 && age(g) <= 12,
    chance: () => 0.02, weight: 50,
    title: '숲에서 길을 잃다',
    text: () => '버섯을 따다 너무 깊이 들어왔다. 나무들이 다 똑같아 보이고, 해는 기울었다. 멀리서 무언가 나뭇가지를 꺾는 소리가 난다.',
    choices: [
      { label: '이끼를 보고 방향을 잡는다', run: (g, rng) => { if (check(rng, stat(g, 'sen') + stat(g, 'int'), 25)) { gainStat(g, 'sen', 1.0); return '이끼가 낀 쪽이 북쪽이다. 사냥꾼에게 들은 말을 떠올렸다. 어두워질 무렵 마을 불빛이 보였다.'; } tire(g, 20); stress(g, 15); return '반대쪽으로 걸었다. 밤새 나무 구멍에서 떨었다. 아침에 수색하던 어른들이 찾아냈다.'; } },
      { label: '나무 위로 올라가 밤을 샌다', run: (g) => { gainStat(g, 'wil', 0.8); tire(g, 15); return '밤새 나무 위에서 떨었다. 아래로 커다란 그림자 하나가 지나갔다. 숨도 쉬지 않았다. 새벽에 연기를 보고 마을을 찾았다.'; } },
      { label: '소리 나는 쪽으로 간다', run: (g, rng) => { if (rng.chance(0.5)) { const h = findJob(g, 'hunter'); like(h, 8); return `소리의 주인은 ${nm(h, '사냥꾼')}이었다. "여기서 뭐 하냐, 꼬마." 그는 말없이 마을까지 데려다주었다.`; } injure(g, '멧돼지에게 받힌 다리', 2); stress(g, 20); return '덤불에서 멧돼지가 튀어나왔다. 다리를 받히고 굴렀다. 기어서 숲을 빠져나왔다.'; } },
    ],
  },
  {
    // 48단계: 다른 고장에 사는 다 큰 형제와도 꿀빵을 두고 싸우던 것. 한집에 사는 열일곱 아래 형제만.
    id: 'sibling_quarrel', cond: (g) => age(g) >= 5 && age(g) <= 13 && homeSibs(g).length > 0,
    chance: () => 0.025, weight: 30,
    prepare: (g, rng) => ({ id: rng.pick(homeSibs(g)).id }),
    title: '형제 싸움',
    text: (g, c) => `${J(nm(byId(g, c.id)), '과/와')} 마지막 남은 꿀빵 한 조각을 두고 싸움이 붙었다. 서로 머리채를 잡기 직전이다.`,
    choices: [
      { label: '양보한다', run: (g, rng, c) => { like(byId(g, c.id), 8); gainStat(g, 'wil', 0.3); return '빵을 내밀었다. 상대는 머쓱한 얼굴로 반을 갈라 돌려주었다.'; } },
      { label: '끝까지 싸운다', run: (g, rng, c) => { like(byId(g, c.id), -6); gainStat(g, 'str', 0.4); return '둘 다 혼났고, 빵은 개가 먹었다.'; } },
    ],
  },
  {
    id: 'mage_window', cond: (g) => age(g) >= 5 && age(g) <= 14 && !!findJob(g, 'hedge_mage'),
    chance: () => 0.025, weight: 50, cooldown: 36,
    title: '마법사의 창문',
    text: (g) => `마을 변두리, 떠돌이 마법사 ${findJob(g, 'hedge_mage').name}의 오두막 창문에서 푸른빛이 새어 나온다. 아이들 사이에선 저 집에 들어가면 혀가 굳는다는 소문이 있다.`,
    choices: [
      { label: '문을 두드린다', run: (g) => { const m = findJob(g, 'hedge_mage'); like(m, 6); if (g.player.manaAwakened) { setFlag(g, 'mage_student'); gainSkill(g, 'magic', 2.0, 'int'); return `${m.name}은(는) 나를 한참 내려다보았다. "...흐름이 보이는구나. 들어와라." 그날 처음으로 마력을 손끝에 모으는 법을 배웠다. 대가는 장작 패기였다.`; } gainStat(g, 'int', 0.5); return `${m.name}이(가) 문을 반쯤 열었다. "마력도 없는 꼬마가 무슨 일이냐." 그래도 약초 말리는 법은 알려 주었다.`; } },
      { label: '창문 너머로 훔쳐본다', run: (g) => { gainStat(g, 'sen', 0.6); return '마법사가 허공에 손가락으로 원을 그렸다. 원이 하나, 둘. 두 번째 원에서 탁자 위 물이 얼었다. 그게 "서클"이라는 건 나중에 알았다.'; } },
    ],
  },
  {
    id: 'falling_star', once: true,
    cond: (g) => age(g) >= 7 && age(g) <= 14,
    chance: () => 0.02, weight: 35,
    title: '붉은 별똥별',
    text: () => '한밤중, 북쪽 하늘을 가르며 붉은 별똥별이 떨어졌다. 꼬리가 사라질 때까지 한참 걸렸다. 개들이 일제히 짖었다.',
    choices: [
      { label: '소원을 빈다', run: (g) => { stress(g, -10); return '무엇을 빌었는지는 아무에게도 말하지 않았다.'; } },
      { label: '떨어진 곳을 기억해 둔다', run: (g) => { gainStat(g, 'sen', 0.6); setFlag(g, 'star_site'); return '동북쪽 산등성이 너머. 사제는 "흉조"라 했고, 마법사는 아무 말도 하지 않았다. 언젠가 그곳에 가 보고 싶었다.'; } },
    ],
  },
  {
    id: 'adventurer_tale', cond: (g) => age(g) >= 7 && age(g) <= 14 && !!findJob(g, 'adventurer'),
    chance: () => 0.025, weight: 45, cooldown: 30,
    title: '모험가의 칼',
    text: (g) => `마을에 머무는 모험가 ${findJob(g, 'adventurer').name}이(가) 우물가에서 칼을 갈고 있다. 칼날에 검게 마른 무언가가 묻어 있다. "F급 의뢰라도 목숨은 하나야, 꼬마."`,
    choices: [
      { label: '미궁 이야기를 묻는다', run: (g) => { gainStat(g, 'int', 0.4); gainStat(g, 'wil', 0.4); setFlag(g, 'heard_dungeon'); return '"미궁은 살아 있어. 핵을 품고, 숨을 쉬고, 사람을 먹지. 하르펜 근처 것도 요즘 아래층이 깊어졌다더라." 모험가의 눈이 웃지 않았다.'; } },
      { label: '칼을 쥐어 보게 해 달라고 한다', run: (g, rng) => { const a = findJob(g, 'adventurer'); if (!a) return '모험가는 이미 마을을 떠난 뒤였다.'; like(a, 5); gainSkill(g, 'sword', 1.2, 'str'); return `생각보다 무거웠다. ${a.name}이(가) 자세를 고쳐 주었다. "환영류는 발이 먼저야. 칼은 그다음."`; } },
    ],
  },
  {
    id: 'refugee_orphan', once: true,
    cond: (g) => age(g) >= 6 && age(g) <= 12,
    chance: () => 0.015, weight: 40,
    title: '마차에서 내린 아이',
    text: () => '북쪽에서 온 행상 마차에서 내 또래 아이 하나가 내렸다. 부모는 마물에게 잃었다고 한다. 촌장이 어느 집에서 맡을지 사람들과 의논하고 있다. 아이는 아무와도 눈을 맞추지 않는다.',
    choices: [
      { label: '먼저 말을 건다', run: (g, rng) => { const o = makePerson(rng, { ageMonths: age(g) * 12 + rng.int(-12, 12), job: 'child' }); o.known = true; o.affection = 25; note(g, o, '마물에게 부모를 잃고 에른 마을로 왔다.'); g.people.push(o); gainStat(g, 'cha', 0.6); setFlag(g, 'orphan_friend', o.id); return `"이름이 뭐야?" 한참 뒤에야 대답이 왔다. "${o.name}." 그 아이는 방앗간 집에 맡겨졌고, 그날부터 우리는 자주 붙어 다녔다.`; } },
      { label: '멀리서 지켜본다', run: (g, rng) => { const o = makePerson(rng, { ageMonths: age(g) * 12 + rng.int(-12, 12), job: 'child' }); note(g, o, '마물에게 부모를 잃고 에른 마을로 왔다.'); g.people.push(o); gainStat(g, 'sen', 0.3); return '아이는 방앗간 집에 맡겨졌다. 가끔 혼자 북쪽 길을 바라보고 서 있는 게 보였다.'; } },
    ],
  },

  // ---------- 소년기 (10~14살) ----------
  {
    id: 'first_wage', once: true,
    cond: (g) => age(g) >= 10 && age(g) <= 14 && money(g) >= 3,
    weight: 40, chance: () => 0.3,
    title: '처음 번 돈',
    text: (g) => `손바닥 위에 은화 ${money(g)}닢. 처음으로 내 힘으로 번 돈이다. 묵직하다.`,
    choices: [
      { label: '집에 내놓는다', run: (g) => { const n = Math.min(money(g), 3); spend(g, n); g.player.familyMoney += n; like(father(g), 6); like(mother(g), 6); return '부모는 받지 않으려 했지만, 결국 받았다. 아버지가 처음으로 어른 대하듯 고개를 끄덕였다.'; } },
      { label: '모아 둔다', run: (g) => { gainStat(g, 'wil', 0.4); return '침대 밑 나무 상자에 넣었다. 언젠가 쓸 데가 있을 것이다.'; } },
      { label: '꿀과자를 산다', run: (g) => { spend(g, 1); stress(g, -15); return '하르펜에서 온 꿀과자는 혀가 녹을 만큼 달았다. 후회는 없었다.'; } },
    ],
  },
  {
    id: 'apprentice_offer', once: true,
    cond: (g) => age(g) >= 10 && age(g) <= 13 && ['smith', 'carpenter', 'baker', 'herbalist'].some((j) => findJob(g, j)),
    chance: () => 0.08, weight: 55,
    prepare: (g, rng) => { const p = rng.pick(['smith', 'carpenter', 'baker', 'herbalist'].map((j) => findJob(g, j)).filter(Boolean)); return { id: p.id, job: p.job }; },
    title: '도제 자리',
    text: (g, c) => { const p = byId(g, c.id); const what = { smith: '대장간', carpenter: '목공소', baker: '빵집', herbalist: '약초 오두막' }[c.job]; return `${p.name}이(가) 집에 찾아왔다. "${what}에 손이 하나 필요하오. 아이가 성실하면 기술을 가르치지." 평민 아이가 열 살 무렵 도제로 들어가는 건 흔한 일이다.`; },
    choices: [
      { label: '도제로 들어간다', run: (g, rng, c) => { const p = byId(g, c.id); like(p, 12); setFlag(g, 'apprentice_to', c.job); tire(g, 10); if (c.job === 'baker') gainSkill(g, 'cooking', 4, 'sen'); else if (c.job === 'herbalist') gainSkill(g, 'herbs', 4, 'int'); else gainStat(g, 'str', 1.2); gainStat(g, 'wil', 0.6); return `${p.name}의 일은 고됐다. 첫 달은 바닥만 쓸었다. 그래도 어깨너머로 보이는 것이 있었다.`; } },
      { label: '정중히 거절한다', run: (g, rng, c) => { like(byId(g, c.id), -2); return '"아직 다른 걸 해 보고 싶어서요." 부모는 아쉬워했지만 억지로 보내지는 않았다.'; } },
    ],
  },
  {
    id: 'rival_appears', once: true,
    cond: (g) => age(g) >= 9 && age(g) <= 14 && peers(g, 2).length > 0,
    chance: () => 0.04, weight: 45,
    prepare: (g, rng) => ({ id: rng.pick(peers(g, 2)).id }),
    title: '눈엣가시',
    text: (g, c) => `${nm(byId(g, c.id))}이(가) 사람들 앞에서 대놓고 비웃었다. "너 같은 게 뭘 하겠다고?" 무엇을 하든 저 녀석은 꼭 한 발 앞서 있다.`,
    choices: [
      { label: '"두고 봐라."', run: (g, rng, c) => { const p = byId(g, c.id); p.known = true; p.affection -= 10; setFlag(g, 'rival', p.id); gainStat(g, 'wil', 1.0); note(g, p, `${g.player.name}와(과) 앙숙이 되었다.`); return `그날부터 ${p.name}은(는) 넘어야 할 산이 되었다. 이상하게도 힘이 났다.`; } },
      { label: '무시한다', run: (g, rng, c) => { gainStat(g, 'wil', 0.4); return '대꾸하지 않았다. 상대는 김이 샌 얼굴이었다.'; } },
      { label: '주먹을 날린다', run: (g, rng, c) => { const p = byId(g, c.id); p.known = true; p.affection -= 15; setFlag(g, 'rival', p.id); if (check(rng, stat(g, 'str'), stat(g, 'str'))) { gainStat(g, 'str', 0.6); return '코피를 쏟은 건 그쪽이었다. 그날 이후 둘 사이엔 묘한 긴장이 흘렀다.'; } injure(g, '부어오른 턱', 1); return '맞받아친 주먹에 나뒹굴었다. 분해서 잠이 오지 않았다.'; } },
    ],
  },
  {
    id: 'first_crush', once: true,
    cond: (g) => age(g) >= 12 && age(g) <= 15 && peers(g, 2).some((p) => p.sex === opposite(g)),
    chance: () => 0.05, weight: 50,
    prepare: (g, rng) => ({ id: rng.pick(peers(g, 2).filter((p) => p.sex === opposite(g))).id }),
    title: '이상한 날',
    text: (g, c) => `우물가에서 물을 긷던 ${nm(byId(g, c.id))}이(가) 머리를 쓸어 넘겼다. 매일 보던 얼굴인데, 오늘은 이상하게 눈을 뗄 수가 없었다. 귀까지 뜨거워졌다.`,
    choices: [
      { label: '물동이를 들어 준다', run: (g, rng, c) => { const p = byId(g, c.id); like(p, 10); setFlag(g, 'first_love', p.id); gainStat(g, 'cha', 0.6); return `"...고마워." ${p.name}이(가) 웃었다. 집까지 가는 길이 너무 짧았다.`; } },
      { label: '못 본 척 지나친다', run: (g, rng, c) => { setFlag(g, 'first_love', c.id); stress(g, 5); return '심장이 터질 것 같아서 그냥 지나쳤다. 그날 밤 그 얼굴만 떠올랐다.'; } },
    ],
  },
  {
    id: 'hunting_lesson', cond: (g) => age(g) >= 9 && age(g) <= 14 && !!findJob(g, 'hunter'),
    chance: () => 0.03, weight: 40, cooldown: 30,
    title: '사냥꾼의 새벽',
    text: (g) => `${findJob(g, 'hunter').name}이(가) 새벽에 활을 메고 지나가다 멈췄다. "따라올 테냐? 대신 입은 닫고."`,
    choices: [
      { label: '따라간다', run: (g, rng) => { const h = findJob(g, 'hunter'); like(h, 6); gainStat(g, 'sen', 1.2); gainStat(g, 'agi', 0.5); tire(g, 10); if (rng.chance(0.15)) { injure(g, '가시덤불에 찢긴 팔', 1); return '덤불을 헤치다 팔이 찢겼다. 그래도 사슴 발자국 읽는 법을 배웠다. 사냥꾼은 쓸 만하다는 듯 콧김을 뿜었다.'; } return '숨죽이고 반나절을 기다렸다. 화살 한 대에 사슴이 쓰러졌다. 사냥꾼은 사슴 앞에서 짧게 무언가를 중얼거렸다. "숲에 진 빚이다."'; } },
      { label: '사양한다', run: () => '새벽은 너무 추웠다.' },
    ],
  },
  {
    id: 'old_book', once: true,
    cond: (g) => age(g) >= 8 && age(g) <= 14 && skill(g, 'letters') >= 8,
    chance: () => 0.04, weight: 40,
    title: '다락의 책',
    text: () => '다락 들보 사이에서 가죽 표지의 낡은 책을 찾았다. 절반은 읽을 수 있는 글자고, 절반은 본 적 없는 각진 문자다. 마지막 장에는 일곱 겹의 원이 그려져 있다.',
    choices: [
      { label: '밤마다 몰래 읽는다', run: (g) => { gainSkill(g, 'letters', 2.5, 'int'); if (g.player.manaAwakened) gainSkill(g, 'magic', 1.5, 'int'); setFlag(g, 'arcana_book'); return '읽을 수 있는 부분은 고대 아르카나 왕국의 몰락에 관한 기록이었다. 각진 문자는 끝내 읽지 못했다. 그런데 그 원을 오래 보고 있으면, 눈 뒤가 욱신거렸다.'; } },
      { label: '사제에게 가져간다', run: (g) => { const p = findJob(g, 'priest'); like(p, 5); gainStat(g, 'int', 0.5); return `${J(nm(p, '사제'), '은/는')} 책을 펼쳐 보더니 얼굴이 굳었다. "이건 내가 맡아 두마." 책은 다시 볼 수 없었다.`; } },
    ],
  },
  {
    id: 'wounded_traveler', cond: (g) => age(g) >= 9,
    chance: () => 0.015, weight: 50, cooldown: 60,
    prepare: (g, rng) => ({ kind: rng.pick(['knight', 'thief', 'mage']) }),
    title: '길가의 부상자',
    text: () => '마을 밖 길가 도랑에 사람이 쓰러져 있다. 망토는 피에 젖었고, 손에는 칼자루를 쥔 채다. 아직 숨이 붙어 있다.',
    choices: [
      { label: '집으로 데려가 돌본다', run: (g, rng, c) => { tire(g, 8); spendFamily(g, 3); if (c.kind === 'knight') { setFlag(g, 'knight_debt_owed'); gainStat(g, 'cha', 0.6); return '사흘 뒤 깨어난 남자는 레오니아 기사단의 전령이었다. 길에서 습격을 당했다고 했다. 떠나며 문장이 새겨진 단추 하나를 건넸다. "왕도에 오면 이걸 보여라."'; } if (c.kind === 'thief') { spendFamily(g, 6); stress(g, 10); return '남자는 이틀 만에 일어났다. 그리고 그날 밤, 집안 돈 일부와 함께 사라졌다. 아버지는 아무 말도 하지 않았다.'; } setFlag(g, 'mage_met'); gainStat(g, 'int', 0.6); if (g.player.manaAwakened) gainSkill(g, 'magic', 1.5, 'int'); return '여자는 마법사였다. 상처에 손을 얹자 살이 천천히 붙었다. "빚을 졌구나." 떠나기 전, 그녀는 마력을 고르게 흘리는 호흡법 하나를 가르쳐 주었다.'; } },
      { label: '어른들에게 알린다', run: (g) => { gainStat(g, 'wil', 0.2); return '경비대가 남자를 하르펜으로 실어 갔다. 무슨 일이었는지는 끝내 알 수 없었다.'; } },
      { label: '칼만 챙기고 떠난다', run: (g) => { g.player.money += 4; setFlag(g, 'looted_body'); stress(g, 8); return '칼을 고물상에 은화 넷에 팔았다. 다음 날 그 자리엔 아무도 없었다. 그 사람이 살았는지 죽었는지 모른다.'; } },
    ],
  },
  {
    id: 'dream_question', once: true,
    cond: (g) => age(g) >= 13 && age(g) <= 14 && alive(parent(g)),
    weight: 60, chance: () => 0.2,
    title: '무엇이 되고 싶으냐',
    text: (g) => `저녁 식탁에서 ${nm(parent(g))}이(가) 숟가락을 내려놓았다. "곧 성인이다. 무얼 하며 살 생각이냐?"`,
    choices: [
      { label: '"기사가 되고 싶어요."', run: (g) => { setFlag(g, 'dream', 'knight'); gainStat(g, 'wil', 0.4); return '"기사는 피를 보는 일이다." 그래도 반대하지는 않았다.'; } },
      { label: '"마법사가 될래요."', show: (g) => g.player.manaAwakened, run: (g) => { setFlag(g, 'dream', 'mage'); gainStat(g, 'int', 0.4); return '"세레니아까지 가려면 돈이 많이 든다." 걱정 섞인 대답이었지만, 눈은 자랑스러워 보였다.'; } },
      { label: '"모험가가 될래요."', run: (g) => { setFlag(g, 'dream', 'adventurer'); like(parent(g), -3); return '식탁이 조용해졌다. 모험가는 출세가 빠른 만큼 많이 죽는다. 다들 알고 있다.'; } },
      { label: '"집안 일을 이을게요."', run: (g) => { setFlag(g, 'dream', 'family'); like(father(g), 6); like(mother(g), 6); return '부모의 얼굴이 풀렸다. 그날 저녁은 유난히 조용하고 따뜻했다.'; } },
    ],
  },
);
