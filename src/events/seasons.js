// 계절과 축일: 봉인제(1월), 망자의 밤(2월 끝), 파종, 범람, 유랑 극단, 영주의 사냥, 세금 날, 첫눈.
import { gainStat, gainSkill } from '../game.js';
import { realm, lordName, eraOf } from '../world.js';
import {
  EVENTS, flag, setFlag, fam, father, mother, alive, age, findJob, peers, stat, skill, money, spend,
  spendFamily, stress, tire, like, injure, check, nm, byId, living, ageYears,
} from './core.js';

const deadFamily = (g) => g.player.familyIds.map((id) => byId(g, id)).filter((p) => p && !p.alive);

EVENTS.push(
  {
    id: 'seal_festival', cooldown: 11,
    cond: (g) => g.date.month === 1 && age(g) >= 4,
    chance: () => 0.5, weight: 50,
    title: '봉인제',
    text: (g) => `새해 첫날, 봉인제. 오백${g.date.year - 500 > 0 ? ' 하고도 ' + (g.date.year - 500) : ''}년 전 마신이 봉인된 날이다. 광장 한가운데 쌓은 장작더미에 불을 붙이고, 사람들이 북쪽을 향해 침묵한다. 아이들은 이 침묵이 끝나면 꿀술 한 모금을 얻어 마신다.`,
    choices: [
      { label: '침묵 속에 북쪽을 본다', run: (g) => { gainStat(g, 'wil', 0.5); return realm(g)?.noahLight ? '북쪽 하늘 끝에 아주 작은 빛이 걸려 있는 것 같았다. 착각이었을지도 모른다.' : '북쪽 하늘은 캄캄했다. 노인들이 감시탑의 불 이야기를 하며 혀를 찼다.'; } },
      { label: '꿀술을 몰래 한 모금 더 마신다', run: (g, rng) => { if (age(g) < 12 && rng.chance(0.5)) { stress(g, -10); return '두 모금째에 세상이 빙글 돌았다. 어른들이 웃으며 집으로 업어 갔다.'; } stress(g, -15); gainStat(g, 'cha', 0.3); return '꿀술은 달고 뜨거웠다. 불꽃 너머로 사람들의 얼굴이 붉게 빛났다.'; } },
      { label: '사제의 낭독을 듣는다', run: (g) => { gainSkill(g, 'letters', 0.8, 'int'); gainStat(g, 'int', 0.3); return '사제가 성녀 리아나의 말을 읽었다. "어둠은 사라지지 않는다. 다만 잠들 뿐이다." 사람들은 그 구절에서 늘 같은 곳을 바라본다.'; } },
    ],
  },
  {
    id: 'night_of_dead', cooldown: 11,
    cond: (g) => g.date.month === 2 && age(g) >= 5,
    chance: () => 0.45, weight: 55,
    title: '망자의 밤',
    text: (g) => `겨울의 마지막 밤. 죽은 이를 기리고, 마족이 가장 강해진다는 밤이다. 집집마다 문 앞에 소금을 뿌리고 창문에 등을 단다. 해가 지면 아무도 밖에 나가지 않는다.${deadFamily(g).length ? ` 올해는 ${deadFamily(g).map((p) => p.name).join(', ')}의 자리에도 빵 한 조각이 놓였다.` : ''}`,
    choices: [
      { label: '창가에서 등을 지킨다', run: (g) => { gainStat(g, 'wil', 0.5); stress(g, -5); return '자정 무렵 바람이 멎었다. 아무 일도 없었다. 아무 일도 없다는 게 이 밤의 축복이다.'; } },
      { label: '죽은 이에게 말을 건다', show: (g) => deadFamily(g).length > 0, run: (g) => { stress(g, -20); gainStat(g, 'wil', 0.6); return `등불 앞에 앉아 ${deadFamily(g)[0].name}에게 한 해 있었던 일을 이야기했다. 대답은 없었다. 그래도 가슴 한구석이 조금 풀렸다.`; } },
      { label: '몰래 묘지에 가 본다', show: (g) => age(g) >= 9, run: (g, rng) => { if (rng.chance(0.15)) { setFlag(g, 'saw_ghostlight'); stress(g, 25); gainStat(g, 'sen', 1.2); return '묘지 가장자리, 오래된 무덤 위에서 푸른 불빛이 일어났다. 불빛이 이쪽을 향해 고개를 드는 것 같았다. 정신없이 뛰어 돌아왔다. 아무에게도 말하지 않았다.'; } gainStat(g, 'wil', 1.0); stress(g, 8); return '묘지는 조용했다. 소금 냄새와 서리. 돌아오는 길에 개가 미친 듯이 짖었지만, 아무것도 없었다.'; } },
    ],
  },
  {
    id: 'spring_flood', cooldown: 30,
    cond: (g) => g.date.month === 4 && age(g) >= 6,
    chance: () => 0.12, weight: 55,
    title: '봄 범람',
    text: () => '산의 눈이 한꺼번에 녹았다. 강이 둑을 넘어 아랫마을 밭과 헛간을 삼키고 있다. 사람들이 모래 자루를 나르며 소리친다.',
    choices: [
      { label: '모래 자루를 나른다', run: (g) => { tire(g, 20); gainStat(g, 'str', 1.0); gainStat(g, 'wil', 0.5); for (const p of peers(g, 30).slice(0, 3)) like(p, 3); return '밤새 진흙을 뒤집어쓰고 자루를 날랐다. 아침에 물이 빠지기 시작했다. 함께 일한 어른들이 이름을 불러 주었다.'; } },
      { label: '아래 집 가축을 몰아 낸다', run: (g, rng) => { if (check(rng, stat(g, 'agi') + stat(g, 'sen'), 25)) { gainStat(g, 'agi', 0.8); const n = rng.pick(peers(g, 40)); like(n, 10); return `허리까지 차오른 물을 헤치고 ${nm(n, '이웃')}의 염소들을 언덕으로 몰았다. 한 마리도 잃지 않았다.`; } injure(g, '떠내려온 통나무에 찍힌 다리', 2); return '떠내려오는 통나무에 다리를 찍혔다. 염소 두 마리가 물살에 사라졌다.'; } },
      { label: '집 짐을 2층으로 옮긴다', run: (g) => { tire(g, 8); return '집은 언덕 위라 무사했다. 창밖으로 아랫마을 지붕들이 섬처럼 떠 있었다.'; } },
    ],
  },
  {
    id: 'sowing_day', cooldown: 11,
    cond: (g) => g.date.month === 3 && age(g) >= 8 && fam(g) !== 'fallen_knight',
    chance: () => 0.25, weight: 30,
    title: '파종',
    text: () => '봄 파종 날. 온 마을이 이 집 저 집 밭을 돌며 씨를 뿌린다. 사제가 밭머리에서 성광의 축복을 빌고, 아이들은 새를 쫓는다.',
    choices: [
      { label: '씨를 뿌린다', run: (g) => { gainSkill(g, 'farming', 1.5, 'sen'); tire(g, 8); return '손바닥으로 씨를 흩뿌렸다. 고르게 뿌리는 게 생각보다 어려웠다. 노인 하나가 손목을 잡고 보여 주었다.'; } },
      { label: '새를 쫓는다', run: (g) => { gainStat(g, 'agi', 0.6); return '하루 종일 고함을 지르며 뛰어다녔다. 목이 쉬었다.'; } },
    ],
  },
  {
    id: 'traveling_troupe', cooldown: 18,
    cond: (g) => (g.date.month === 6 || g.date.month === 7) && age(g) >= 5,
    chance: () => 0.15, weight: 45,
    title: '유랑 극단',
    text: () => '포장마차 셋으로 된 유랑 극단이 광장에 무대를 세웠다. 오늘 밤 공연은 "용사 아르스의 마지막 날". 입장료는 동화 다섯 닢.',
    choices: [
      { label: '연극을 본다', run: (g) => { gainStat(g, 'cha', 0.5); gainStat(g, 'int', 0.3); setFlag(g, 'saw_play'); return '마지막 장면, 용사 역의 배우가 마신의 탈을 쓴 배우를 끌어안고 함께 무대 아래로 떨어졌다. 아무도 박수를 치지 않았다. 잠시 뒤에야 박수가 쏟아졌다.'; } },
      { label: '무대 뒤를 기웃거린다', run: (g, rng) => { gainStat(g, 'sen', 0.6); if (rng.chance(0.4)) { setFlag(g, 'troupe_secret'); return '분장을 지우던 배우가 단원에게 낮게 말하는 걸 들었다. "다음 마을에서 편지를 넘긴다. 왕자 쪽 사람에게." 극단은 다음 날 새벽 떠났다.'; } return '배우들은 무대 밖에선 지쳐 보이는 평범한 사람들이었다. 하나가 사과 반쪽을 나눠 주었다.'; } },
      { label: '단원이 되고 싶다고 말한다', show: (g) => age(g) >= 12, run: (g) => { gainStat(g, 'cha', 0.8); return '단장은 웃으며 내 어깨를 두드렸다. "열다섯이 되면 다시 와라. 그때도 마음이 같으면." 그는 극단이 겨울마다 왕도에 머문다고 알려 주었다.'; } },
    ],
  },
  {
    id: 'lord_hunt', cooldown: 24,
    cond: (g) => g.date.month === 10 && age(g) >= 8 && !!realm(g),
    chance: () => 0.2, weight: 50,
    title: '영주의 사냥',
    text: (g) => `${lordName(g)}의 사냥 행렬이 마을을 지나간다. 사냥개 수십 마리, 매를 얹은 시종들, 화려한 마구. 몰이꾼이 모자라 마을에서 사람을 뽑는다. 하루 품삯은 은화 둘.`,
    choices: [
      { label: '몰이꾼으로 나선다', run: (g, rng) => { g.player.money += 2; tire(g, 15); gainStat(g, 'agi', 0.6); const t = realm(g).lord.temper; if (t === 'harsh' && rng.chance(0.3)) { injure(g, '사냥개에게 물린 종아리', 2); return '멧돼지를 놓친 영주가 화를 냈다. 몰이꾼 하나를 채찍으로 때렸고, 풀려난 사냥개가 내 종아리를 물었다.'; } if (rng.chance(0.25)) { setFlag(g, 'lord_noticed'); gainStat(g, 'cha', 0.5); return '멧돼지가 영주의 말 쪽으로 튀었을 때 막대를 휘둘러 방향을 틀었다. 영주가 나를 한 번 쳐다보았다. "이름이 뭐냐." 그것뿐이었지만, 영주가 평민의 이름을 묻는 일은 드물다.'; } return '하루 종일 숲을 뛰며 소리를 질렀다. 은화 둘을 받았다.'; } },
      { label: '길가에서 구경한다', run: (g) => { gainStat(g, 'sen', 0.4); return '영주의 얼굴은 생각보다 평범했다. 그런데 말 위의 그는 땅에 선 사람들을 한 번도 내려다보지 않았다.'; } },
    ],
  },
  {
    id: 'tax_day', cooldown: 11,
    cond: (g) => g.date.month === 11 && age(g) >= 10 && fam(g) !== 'farmer' && !!realm(g),
    chance: () => 0.25, weight: 40,
    title: '세금 날',
    text: (g) => `영주의 세리가 광장에 탁자를 폈다. 사람들이 줄을 선다. 올해 세금은 ${realm(g).tax >= 1.3 ? '터무니없이 올랐다' : realm(g).tax >= 1.1 ? '작년보다 올랐다' : '작년과 같다'}. 앞에 선 노파가 동전을 세다 울음을 터뜨렸다.`,
    choices: [
      { label: '노파에게 동전을 보탠다', show: (g) => money(g) >= 2, run: (g) => { spend(g, 2); gainStat(g, 'cha', 0.5); setFlag(g, 'kindness', (flag(g, 'kindness') ?? 0) + 1); return '노파가 손을 꼭 잡았다. 세리는 아무 표정 없이 동전을 받아 갔다.'; } },
      { label: '집안 세금을 낸다', run: (g) => { spendFamily(g, Math.round(4 * realm(g).tax)); return '장부에 집안 이름 옆으로 줄이 그어졌다. 일 년 치 숨통이 트였다.'; } },
      { label: '세리의 장부를 훔쳐본다', show: (g) => skill(g, 'letters') >= 15, run: (g) => { gainSkill(g, 'letters', 1.0, 'int'); setFlag(g, 'tax_fraud_known'); return '숫자가 이상했다. 걷는 돈과 장부에 적는 돈이 다르다. 세리의 주머니가 두둑한 이유가 있었다.'; } },
    ],
  },
  {
    id: 'first_snow', cooldown: 23,
    cond: (g) => g.date.month === 12 && age(g) >= 4 && age(g) <= 14,
    chance: () => 0.2, weight: 25,
    title: '첫눈',
    text: () => '아침에 일어나니 세상이 하얗다. 아이들이 하나둘 골목으로 뛰쳐나온다.',
    choices: [
      { label: '눈싸움에 끼어든다', run: (g, rng) => { const p = rng.pick(peers(g, 3)); like(p, 5); gainStat(g, 'agi', 0.4); stress(g, -10); return `${nm(p, '동네 아이')}의 눈덩이가 정통으로 얼굴에 맞았다. 그날 하루는 손이 얼 때까지 뛰었다.`; } },
      { label: '집 앞 눈을 치운다', run: (g) => { gainStat(g, 'str', 0.4); like(mother(g), 2); return '삽질을 하다 보니 몸에서 김이 났다.'; } },
    ],
  },
  {
    id: 'era_lamp_festival', cooldown: 11,
    cond: (g) => g.date.month === 9 && eraOf(g) >= 1 && age(g) >= 5,
    chance: () => 0.3, weight: 35,
    title: '등석 아래의 수확제',
    text: () => '올해 수확제엔 광장에 등석 열두 개가 걸렸다. 촌장이 하르펜에서 큰돈을 주고 사 온 것이다. 밤인데도 대낮 같다. 노인들은 별이 안 보인다고 투덜댄다.',
    choices: [
      { label: '등석을 가까이서 본다', run: (g) => { gainStat(g, 'int', 0.5); if (g.player.manaAwakened) gainSkill(g, 'magic', 0.8, 'int'); return '돌 속에서 빛이 천천히 맥박친다. 안에 갇힌 마력이 조금씩 닳아 간다고 한다. 언젠가 꺼질 빛이다.'; } },
      { label: '불빛 밖 어둠으로 나간다', run: (g) => { gainStat(g, 'sen', 0.5); return '광장을 벗어나자 별이 쏟아졌다. 등석 빛이 닿지 않는 곳에서, 노인 하나가 같은 하늘을 보고 있었다.'; } },
    ],
  },
);
