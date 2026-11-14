// 세계 흐름과 맞물린 사건: 전쟁, 내전, 국상과 대관식, 물가, 영주, 마물, 기술, 교단, 뒷세계.
// world.js의 game.realm을 읽고, 몇몇 선택은 정세를 조금 움직인다.
import { gainStat, gainSkill, circleOf } from '../game.js';
import { realm, lordName, rulerName, eraOf, nudge, priceIndex } from '../world.js';
import {
  EVENTS, flag, setFlag, fam, father, mother, alive, age, findJob, peers, stat, skill, money, spend,
  spendFamily, stress, tire, like, note, injure, check, nm, byId, living, ageYears, isFamily, siblings,
} from './core.js';
import { makePerson, kill } from '../npc.js';

const R = (g) => realm(g) ?? {};
const war = (g) => !!R(g).balhart?.war;
const civil = (g) => R(g).succession === 'civilwar';

EVENTS.push(
  // ---------- 전쟁 ----------
  {
    id: 'war_refugees', cooldown: 18,
    cond: (g) => age(g) >= 6 && (war(g) || civil(g) || R(g).north?.fallen),
    chance: () => 0.12, weight: 60,
    title: '피란민',
    text: (g) => `짐수레를 끄는 가족이 문 앞에 섰다. ${civil(g) ? '내전에 마을이 불탔다고' : war(g) ? '제국군이 국경 마을을 쓸어버렸다고' : '북쪽에서 마물 떼가 내려왔다고'} 한다. 아이 둘은 맨발이다. 하룻밤만 헛간에서 재워 달란다.`,
    choices: [
      { label: '재워 주고 먹인다', run: (g) => { spendFamily(g, 4); gainStat(g, 'cha', 0.5); setFlag(g, 'kindness', (flag(g, 'kindness') ?? 0) + 1); return '수프를 나눠 먹었다. 그들은 새벽에 남쪽으로 떠났다. 아이 하나가 나무로 깎은 작은 말을 문간에 두고 갔다.'; } },
      { label: '빵만 쥐여 보낸다', run: (g) => { spendFamily(g, 1); return '빵 두 덩이를 건넸다. 그들은 고개를 숙이고 다음 집으로 갔다.'; } },
      { label: '문을 닫는다', run: (g) => { stress(g, 6); return '우리 먹을 것도 빠듯하다. 문 너머로 아이 우는 소리가 한참 들렸다.'; } },
    ],
  },
  {
    id: 'war_deserter', once: true,
    cond: (g) => age(g) >= 9 && (war(g) || civil(g)),
    chance: () => 0.05, weight: 60,
    title: '숲속의 탈영병',
    text: () => '땔감을 하러 간 숲에서 군복 차림의 청년을 마주쳤다. 열여섯이나 되었을까. 칼을 겨누며 떨고 있다. "제발... 아무한테도 말하지 마." 탈영병은 잡히면 목이 매달린다.',
    choices: [
      { label: '먹을 것을 가져다준다', run: (g, rng) => { setFlag(g, 'hid_deserter'); gainStat(g, 'wil', 0.6); if (rng.chance(0.2)) { stress(g, 20); return '사흘째 되던 날, 경비대가 숲을 뒤져 그를 끌고 갔다. 그는 끝까지 나를 보지 않았다. 나를 지키려고.'; } return '사흘 동안 몰래 빵을 날랐다. 나흘째 그는 사라지고, 나무에 칼로 새긴 이름 하나만 남았다. "고마워. 루카."'; } },
      { label: '경비대에 알린다', run: (g) => { g.player.money += 3; stress(g, 15); const gd = findJob(g, 'guard'); like(gd, 6); return '포상금 은화 셋을 받았다. 다음 달, 하르펜 광장에 교수대가 섰다는 소식이 들렸다.'; } },
      { label: '못 본 척 돌아선다', run: (g) => '아무 말 없이 등을 돌렸다. 그가 어떻게 되었는지는 모른다.' },
    ],
  },
  {
    id: 'war_levy_horse', cooldown: 36,
    cond: (g) => age(g) >= 8 && (war(g) || civil(g)),
    chance: () => 0.06, weight: 50,
    title: '징발',
    text: (g) => `${lordName(g)}의 병사들이 집집마다 돌며 군량과 수레를 징발한다. 영수증이라며 종이 한 장을 주지만, 그걸로 돈을 받았다는 사람은 없다.`,
    choices: [
      { label: '내준다', run: (g) => { spendFamily(g, 8); return '광이 비었다. 종이 한 장이 남았다.'; } },
      { label: '병사에게 뇌물을 쥐여 준다', show: (g) => money(g) >= 3, run: (g, rng) => { spend(g, 3); if (rng.chance(0.7)) { spendFamily(g, 2); return '병사가 동전을 세더니 다음 집으로 갔다. 전쟁 중에도, 아니 전쟁 중이라 더, 은화는 통한다.'; } spendFamily(g, 8); stress(g, 10); return '병사는 돈을 받고도 광을 털어 갔다.'; } },
    ],
  },
  {
    id: 'civil_banner', once: true,
    cond: (g) => age(g) >= 12 && civil(g),
    chance: () => 0.15, weight: 70,
    title: '어느 쪽 깃발인가',
    text: (g) => `기병 한 무리가 마을에 들이닥쳤다. ${R(g).rudolf.support >= 50 ? '루돌프 왕자의 붉은 사자' : '에릭 왕자의 은빛 매'} 깃발이다. 대장이 광장에서 외친다. "누가 정통 왕을 따르는지, 오늘 보겠다." 젊은 사내들을 줄 세운다.`,
    choices: [
      { label: '앞으로 나서 충성을 맹세한다', run: (g) => { const side = R(g).rudolf.support >= 50 ? 'rudolf' : 'erik'; setFlag(g, 'civil_side', side); nudge(g, 'rudolf', side === 'rudolf' ? 0.5 : -0.5); gainStat(g, 'cha', 0.5); return `대장이 이름을 적었다. "때가 되면 부르마." ${side === 'rudolf' ? '루돌프' : '에릭'} 왕자의 편에 이름이 올랐다. 반대편이 이기면 이 이름이 목줄이 될 것이다.`; } },
      { label: '줄 뒤로 숨는다', run: (g, rng) => { if (check(rng, stat(g, 'agi') + stat(g, 'sen'), 25)) return '헛간 뒤로 빠져나갔다. 아무도 찾지 않았다.'; injure(g, '창대에 맞은 등', 1); return '병사에게 덜미를 잡혀 창대로 맞았다. "겁쟁이는 어느 쪽에도 필요 없다."'; } },
      { label: '"우리는 농사꾼일 뿐이오."', run: (g, rng) => { if (check(rng, stat(g, 'cha') + stat(g, 'wil'), 35)) { gainStat(g, 'cha', 0.8); return '대장이 한참 노려보다 웃었다. "솔직하군." 그들은 말 먹이만 챙겨 떠났다.'; } spendFamily(g, 6); stress(g, 12); return '대장의 눈이 차가워졌다. "그럼 농사꾼답게 세금을 내라." 광이 털렸다.'; } },
    ],
  },
  {
    id: 'civil_looters', cooldown: 24,
    cond: (g) => age(g) >= 10 && civil(g),
    chance: () => 0.07, weight: 65,
    title: '패잔병',
    text: () => '밤중에 마을 개들이 일제히 짖었다. 패잔병 대여섯이 횃불을 들고 들어온다. 어느 편이었는지도 알 수 없는, 굶주린 얼굴들이다. 첫 번째 집의 문이 부서지는 소리가 났다.',
    choices: [
      { label: '경비대와 함께 맞선다', run: (g, rng) => { const power = skill(g, 'sword') + stat(g, 'str') / 2 + stat(g, 'wil') / 3; if (check(rng, power, 45)) { gainSkill(g, 'sword', 2.5, 'str'); gainStat(g, 'wil', 1.2); setFlag(g, 'defended_village'); return '쇠스랑과 몽둥이를 든 마을 사람들이 그들을 몰아냈다. 패잔병 하나가 쓰러졌고, 나머지는 달아났다. 처음으로 사람이 피 흘리며 쓰러지는 걸 가까이서 보았다.'; } injure(g, '칼에 베인 팔', 4); stress(g, 25); return '칼날이 팔을 갈랐다. 그래도 마을 사람들이 끝내 그들을 쫓아냈다. 대장간 집 아저씨는 돌아오지 못했다.'; } },
      { label: '가족을 데리고 지하실에 숨는다', run: (g) => { spendFamily(g, 10); stress(g, 15); return '숨죽인 채 위층 발소리를 들었다. 아침에 올라와 보니 집 안이 엉망이었다. 그래도 모두 살았다.'; } },
      { label: '먹을 것을 내놓고 달랜다', run: (g) => { spendFamily(g, 6); gainStat(g, 'cha', 0.5); return '빵과 치즈를 내밀었다. 패잔병 하나가 울었다. 그들은 먹고, 해 뜨기 전에 떠났다.'; } },
    ],
  },
  {
    id: 'king_mourning', once: true,
    cond: (g) => age(g) >= 5 && R(g).king && !R(g).king.alive,
    weight: 75,
    title: '국상',
    text: (g) => `예배당 종이 사흘째 울린다. ${R(g).king.name}의 국상 기간이다. 혼례와 축제가 금지되고, 사람들은 팔에 검은 천을 맸다. 여관에선 다음 왕이 누가 될지를 두고 목소리를 낮춰 내기를 건다.`,
    choices: [
      { label: '사제와 함께 추도 미사에 간다', run: (g) => { const p = findJob(g, 'priest'); like(p, 3); gainStat(g, 'wil', 0.3); return '사제는 왕의 치세를 짧게 기렸다. 그리고 덧붙였다. "왕은 죽어도 왕국은 남는다." 목소리가 떨렸다.'; } },
      { label: '여관에서 소문을 듣는다', run: (g) => { gainStat(g, 'sen', 0.5); setFlag(g, 'heard_poison_rumor'); return '술 취한 행상이 속삭였다. "병이 아니래. 독이래. 몇 년에 걸친." 여관 주인이 그의 입을 막았다.'; } },
    ],
  },
  {
    id: 'coronation', once: true,
    cond: (g) => age(g) >= 5 && R(g).succession === 'settled' && R(g).ruler !== 'oswald',
    weight: 70,
    title: '새 왕의 사면령',
    text: (g) => `왕도에서 전령이 와 광장에 포고문을 붙였다. "${rulerName(g)} 폐하의 즉위를 경축하여, 가벼운 죄인을 사면하고 올해 인두세를 반으로 줄인다." 사람들이 포고문 앞에 모였다.`,
    choices: [
      { label: '포고문을 소리 내어 읽어 준다', show: (g) => skill(g, 'letters') >= 15, run: (g) => { gainStat(g, 'cha', 0.8); g.player.familyMoney += 4; for (const p of peers(g, 40).slice(0, 4)) like(p, 3); return '글을 모르는 사람들이 내 목소리에 귀를 기울였다. 다 읽자 누군가 박수를 쳤다. 글을 안다는 게 이런 거구나.'; } },
      { label: '축배를 든다', run: (g) => { g.player.familyMoney += 4; stress(g, -10); return R(g).ruler === 'erik' ? '"젊은 왕 만세!" 평민들은 진심으로 기뻐했다. 오래 갈지는 모르겠지만.' : '"왕 만세." 사람들의 건배 소리는 어딘가 힘이 없었다.'; } },
    ],
  },

  // ---------- 물가와 살림 ----------
  {
    id: 'bread_riot', cooldown: 24,
    cond: (g) => age(g) >= 10 && priceIndex(g) >= 1.6,
    chance: () => 0.12, weight: 60,
    title: '빵 폭동',
    text: (g) => `빵값이 평년의 ${priceIndex(g).toFixed(1)}배가 되자 하르펜에서 폭동이 났다는 소문이 왔다. 오늘은 에른 마을 방앗간 앞에 사람들이 몽둥이를 들고 모였다. 방앗간 주인이 밀을 쌓아 두고 값을 올린다는 것이다.`,
    choices: [
      { label: '사람들과 함께 방앗간 문을 연다', run: (g, rng) => { g.player.familyMoney += 6; const m = findJob(g, 'miller'); if (m) { m.affection -= 20; m.wealth -= 30; note(g, m, '빵 폭동 때 마을 사람들에게 방앗간을 털렸다.'); } setFlag(g, 'rioter'); if (rng.chance(0.25)) { injure(g, '경비대 곤봉에 맞은 머리', 2); return '밀자루를 나눠 가졌다. 그러다 하르펜에서 온 경비대가 들이닥쳤다. 머리를 맞고 쓰러졌지만, 밀 한 자루는 끝까지 안고 있었다.'; } return '문이 부서지고 밀자루가 쏟아졌다. 사람들이 나눠 들고 흩어졌다. 방앗간 주인은 창가에서 우리 얼굴을 하나하나 보고 있었다.'; } },
      { label: '방앗간 주인을 감싼다', run: (g) => { const m = findJob(g, 'miller'); like(m, 15); stress(g, 10); gainStat(g, 'wil', 0.8); return '"밀값은 하르펜 곡물상이 올린 거요!" 몇몇이 멈칫했다. 폭동은 고함만 남기고 흩어졌다. 방앗간 주인이 나중에 밀가루 한 포대를 집에 보냈다.'; } },
      { label: '멀리서 지켜본다', run: (g) => { gainStat(g, 'sen', 0.4); return '배고픔은 사람을 바꾼다. 평소 인사하던 이웃들이 짐승처럼 보였다.'; } },
    ],
  },
  {
    id: 'grain_speculation', once: true,
    cond: (g) => age(g) >= 13 && priceIndex(g) >= 1.35 && (money(g) >= 5 || g.player.familyMoney >= 40),
    chance: () => 0.08, weight: 45,
    title: '밀을 사 둘까',
    text: (g) => `하르펜 곡물상이 은밀히 말한다. "빵값은 더 오릅니다. 지금 밀을 사 두면 겨울에 두 배는 받을 거요." 이웃들이 굶는 사이에.`,
    choices: [
      { label: '집안 돈으로 밀을 사 둔다', run: (g, rng) => { const stake = Math.min(30, g.player.familyMoney); spendFamily(g, stake); if (rng.chance(priceIndex(g) >= 1.6 ? 0.75 : 0.55)) { g.player.familyMoney += Math.round(stake * 1.9); gainSkill(g, 'trade', 2.0, 'int'); setFlag(g, 'profiteer'); return '겨울에 밀값은 정말로 두 배가 되었다. 집안 금고가 불었다. 대신 마을 사람들의 눈빛이 달라졌다.'; } g.player.familyMoney += Math.round(stake * 0.6); return '봄에 남쪽 밀이 들어오며 값이 꺾였다. 창고의 밀은 반값에 넘겼다.'; } },
      { label: '거절한다', run: (g) => { gainStat(g, 'wil', 0.3); return '곡물상은 어깨를 으쓱했다. "다른 사람이 하겠지요."'; } },
    ],
  },
  {
    id: 'famine_neighbor', cooldown: 18,
    cond: (g) => age(g) >= 8 && (g.world.famine || priceIndex(g) >= 1.5),
    chance: () => 0.1, weight: 55,
    prepare: (g, rng) => { const n = living(g).filter((p) => !p.isPlayer && !isFamily(g, p) && p.childIds.length > 0 && p.wealth < 20); return { id: n.length ? rng.pick(n).id : null }; },
    title: '빈 솥',
    text: (g, c) => `${nm(byId(g, c.id), '이웃')}의 집에서 사흘째 연기가 오르지 않는다. 아이들이 문간에 앉아 풀뿌리를 씹고 있다.`,
    choices: [
      { label: '우리 집 귀리를 나눈다', run: (g, rng, c) => { spendFamily(g, 5); const n = byId(g, c.id); like(n, 20); setFlag(g, 'kindness', (flag(g, 'kindness') ?? 0) + 1); if (n) note(g, n, `흉년에 ${g.player.name}네 집에서 귀리를 얻어먹었다.`); return '귀리 한 자루를 들고 갔다. 그 집 어머니는 고맙다는 말 대신 오래 울었다. 이 일은 잊히지 않을 것이다.'; } },
      { label: '사제에게 구휼을 부탁한다', run: (g) => { const p = findJob(g, 'priest'); like(p, 4); return '사제가 예배당 곳간을 열었다. 넉넉하진 않았지만, 그 집 아이들은 겨울을 넘겼다.'; } },
      { label: '모른 척한다', run: () => '우리 솥도 가볍다. 그 집 앞을 지날 때마다 걸음을 빨리했다.' },
    ],
  },

  // ---------- 영주 ----------
  {
    id: 'lord_procession', cooldown: 30,
    cond: (g) => age(g) >= 6 && !!R(g).lord,
    chance: () => 0.025, weight: 45,
    title: '영주의 행차',
    text: (g) => `${lordName(g)}의 마차가 마을을 지난다. 사람들이 길가에 무릎을 꿇었다. 마차가 갑자기 멈췄다. 길에 뛰어든 아이 하나 때문이다.`,
    choices: [
      { label: '아이를 끌어당긴다', run: (g, rng) => { const t = R(g).lord.temper; if (t === 'harsh' || t === 'greedy') { injure(g, '마부의 채찍 자국', 1); return '아이를 끌어안고 길가로 굴렀다. 마부의 채찍이 등을 갈겼다. 마차 창은 끝내 열리지 않았다.'; } setFlag(g, 'lord_noticed'); gainStat(g, 'cha', 0.6); return '아이를 끌어안고 길가로 굴렀다. 마차 창이 열리고 영주가 내다보았다. 은화 한 닢이 흙바닥에 떨어졌다. "용감하구나."'; } },
      { label: '고개를 숙인 채 가만히 있는다', run: (g, rng) => { if (R(g).lord.temper === 'harsh') { stress(g, 15); return '마부가 아이를 채찍으로 쫓았다. 아이 어머니가 흙바닥에 이마를 찧으며 빌었다. 마차는 다시 출발했다.'; } return '아이 어머니가 달려와 아이를 낚아챘다. 마차는 아무 일 없다는 듯 다시 움직였다.'; } },
    ],
  },
  {
    id: 'lord_public_flogging', cooldown: 36,
    cond: (g) => age(g) >= 9 && R(g).lord?.temper === 'harsh',
    chance: () => 0.04, weight: 45,
    prepare: (g, rng) => { const n = living(g).filter((p) => !p.isPlayer && !isFamily(g, p) && ageYears(p) >= 18); return { id: n.length ? rng.pick(n).id : null }; },
    title: '광장의 태형',
    text: (g, c) => `영주의 기사가 ${nm(byId(g, c.id), '마을 사람 하나')}을(를) 광장 기둥에 묶었다. 영주의 숲에서 토끼를 잡았다는 죄다. 태형 스무 대. 마을 사람들은 모두 나와 보라는 명령이다.`,
    choices: [
      { label: '끝까지 지켜본다', run: (g, rng, c) => { gainStat(g, 'wil', 0.8); stress(g, 15); const n = byId(g, c.id); if (n) note(g, n, '영주의 숲에서 사냥한 죄로 광장에서 태형을 맞았다.'); return '열 대째에 비명이 멎었다. 스무 대가 끝나자 기사는 아무 일 없다는 듯 떠났다. 그날 저녁 마을은 아무도 말하지 않았다.'; } },
      { label: '"이미 정신을 잃었습니다!"', run: (g, rng, c) => { const n = byId(g, c.id); like(n, 20); if (check(rng, stat(g, 'cha') + stat(g, 'wil'), 40)) { gainStat(g, 'wil', 1.0); setFlag(g, 'defied_lord'); return '기사가 고개를 돌렸다. 한참 나를 노려보더니 손을 들었다. "나머지는 다음에." 그 눈빛을 기억할 것이다.'; } injure(g, '태형 다섯 대', 2); setFlag(g, 'defied_lord'); return '"그럼 네가 나머지를 맞아라." 다섯 대를 대신 맞았다. 등이 불타는 것 같았다. 마을 사람들이 나를 업어 갔다.'; } },
    ],
  },

  // ---------- 마물 ----------
  {
    id: 'monster_raid', cooldown: 24,
    cond: (g) => age(g) >= 11 && (R(g).monsters ?? 0) >= 50,
    chance: (g) => 0.02 + (R(g).monsters - 50) * 0.002, weight: 75,
    prepare: (g, rng) => ({ kind: rng.pick(['고블린 무리', '오크 척후대', '굶주린 늑대 떼', '거대한 독거미']) }),
    title: '마물의 밤',
    text: (g, c) => `경종이 울렸다. ${c.kind}이(가) 울타리를 넘어 들어오고 있다. 경비병 하나로는 어림없다. 어른들이 무기가 될 만한 것을 집어 든다.`,
    choices: [
      { label: '무기를 들고 앞으로 나간다', run: (g, rng, c) => { const power = skill(g, 'sword') + stat(g, 'str') / 2 + (circleOf(g) * 12); if (check(rng, power, 50)) { gainSkill(g, 'sword', 3.0, 'str'); gainStat(g, 'wil', 1.5); setFlag(g, 'monster_slayer', (flag(g, 'monster_slayer') ?? 0) + 1); return `${c.kind}의 우두머리가 내 앞에서 쓰러졌다. 손이 떨려 무기를 놓치지 못했다. 다음 날 아침, 사람들이 나를 보는 눈이 달라져 있었다.`; } injure(g, `${c.kind.replace(/ .*/, '')}에게 물린 어깨`, 4); stress(g, 25); const v = rng.pick(living(g).filter((p) => !p.isPlayer && !isFamily(g, p) && ageYears(p) >= 18)); if (v && rng.chance(0.5)) { kill(g, v, '마물 습격'); return `어깨를 물려 쓰러졌다. 새벽이 되어서야 마물들이 물러갔다. ${v.name}은(는) 아침을 보지 못했다.`; } return '어깨를 물려 쓰러졌다. 새벽이 되어서야 마물들이 물러갔다.'; } },
      { label: '아이들과 노인을 예배당으로 피신시킨다', run: (g) => { gainStat(g, 'cha', 0.8); gainStat(g, 'wil', 0.5); for (const p of peers(g, 60).slice(0, 4)) like(p, 4); return '울부짖는 아이들을 이끌고 예배당 문을 걸어 잠갔다. 밤새 문 두드리는 소리를 들었다. 아침에 문을 열었을 때, 안의 사람은 모두 살아 있었다.'; } },
      { label: '집 문을 걸어 잠근다', run: (g) => { stress(g, 15); spendFamily(g, 4); return '밤새 비명이 들렸다. 아침에 헛간의 양 세 마리가 사라져 있었다.'; } },
    ],
  },
  {
    id: 'guild_bounty', cooldown: 18,
    cond: (g) => age(g) >= 14 && (R(g).monsters ?? 0) >= 40,
    chance: () => 0.05, weight: 45,
    title: '현상금 공고',
    text: (g) => `하르펜 모험가 길드가 마을 게시판에 공고를 붙였다. "남쪽 숲 고블린 소굴 토벌. 귀 하나당 은화 둘. F급 이상, 또는 지원자." 마물이 늘면서 길드 손이 모자란다는 뜻이다.`,
    choices: [
      { label: '지원한다', run: (g, rng) => { const power = skill(g, 'sword') + stat(g, 'agi') / 2 + circleOf(g) * 12; if (check(rng, power, 40)) { const n = rng.int(2, 5); g.player.money += n * 2; gainSkill(g, 'sword', 2.0, 'agi'); setFlag(g, 'guild_known'); return `모험가 셋과 함께 숲에 들어갔다. 고블린 귀 ${n}개를 잘랐다. 은화 ${n * 2}닢. 길드 직원이 장부에 이름을 적었다. "정식 등록 생각 있으면 하르펜으로 와."`; } injure(g, '고블린의 녹슨 창에 찔린 허벅지', 4); stress(g, 20); return '소굴은 생각보다 깊었다. 허벅지에 녹슨 창이 박혔다. 동료 모험가가 나를 끌고 나왔다. "다음엔 준비하고 와."'; } },
      { label: '공고를 읽고 지나친다', run: (g) => { gainStat(g, 'sen', 0.2); nudge(g, 'monsters', 0.3); return '사흘 뒤 공고 위에 "기한 연장"이라는 글자가 덧붙었다.'; } },
    ],
  },
  {
    id: 'dungeon_overflow_rumor', cooldown: 30,
    cond: (g) => age(g) >= 8 && (R(g).monsters ?? 0) >= 60,
    chance: () => 0.06, weight: 45,
    title: '넘치는 미궁',
    text: () => '하르펜 근처 미궁에서 마물이 쏟아져 나와 마을 하나가 비었다고 한다. 미궁핵이 깨어났다는 사람도 있고, 봉인이 약해진 탓이라는 사람도 있다. 길드가 B급 파티를 불렀다.',
    choices: [
      { label: '피란 준비를 하자고 한다', run: (g) => { spendFamily(g, 3); gainStat(g, 'int', 0.4); return '짐을 꾸려 두었다. 쓸 일은 없었다. 이번에는.'; } },
      { label: '미궁에 대해 캐묻는다', run: (g) => { gainStat(g, 'int', 0.5); setFlag(g, 'heard_dungeon'); return '길드에서 돌아온 모험가가 말했다. "미궁핵을 부수면 미궁이 죽어. 문제는 핵까지 가는 거지. 거기까지 간 놈은 대개 돌아오지 못하거든."'; } },
    ],
  },

  // ---------- 기술 ----------
  {
    id: 'era1_firestone', once: true,
    cond: (g) => age(g) >= 5 && eraOf(g) >= 1,
    weight: 72,
    title: '불씨 없는 불',
    text: (g) => `행상이 가져온 손톱만 한 붉은 돌 하나. 화석(火石)이다. 장작 위에 놓고 두드리면 불이 붙는다. 값은 은화 셋. ${fam(g) === 'merchant' ? '아버지의 눈이 빛났다.' : '사람들이 둘러서서 수군거렸다.'}`,
    choices: [
      { label: '집에 하나 들이자고 한다', run: (g) => { spendFamily(g, 3); setFlag(g, 'has_firestone'); return '부엌 아궁이에 불씨를 지킬 일이 사라졌다. 어머니가 처음으로 늦잠을 잤다.'; } },
      { label: '돌이 어떻게 불을 내는지 묻는다', run: (g) => { gainStat(g, 'int', 0.6); if (g.player.manaAwakened) gainSkill(g, 'magic', 1.2, 'int'); return '"안에 마석 가루와 불의 술식이 들었다더군." 행상도 정확히는 몰랐다. 손에 쥐자 아주 미약한 열기가 맥박쳤다.'; } },
      { label: '"마법사들 장난감이지."', run: () => '노인들도 그렇게 말했다. 그런데 일 년 뒤엔 그 노인들 집에도 하나씩 있었다.' },
    ],
  },
  {
    id: 'era2_mill', once: true,
    cond: (g) => age(g) >= 8 && eraOf(g) >= 2 && !!findJob(g, 'miller'),
    weight: 72,
    title: '마석 방아',
    text: (g) => `하르펜 상단이 마을 어귀에 마석으로 돌아가는 방아를 세웠다. 물레방아의 세 배를 빻고, 값은 절반이다. ${findJob(g, 'miller').name}의 방앗간 앞이 텅 비었다.`,
    choices: [
      { label: '새 방아로 간다', run: (g) => { g.player.familyMoney += 4; const m = findJob(g, 'miller'); m.affection -= 5; return '밀가루는 곱고 쌌다. 옛 방앗간 앞을 지날 때마다 주인이 멍하니 물레를 보고 있었다.'; } },
      { label: '옛 방앗간을 계속 쓴다', run: (g) => { spendFamily(g, 2); like(findJob(g, 'miller'), 12); return '"고맙네." 방앗간 주인이 손을 꼭 잡았다. 하지만 그 손님이 우리 집만으로는 부족하다는 걸 둘 다 알았다.'; } },
      { label: '방아의 구조를 뜯어본다', show: (g) => stat(g, 'int') >= 25, run: (g) => { gainStat(g, 'int', 1.0); setFlag(g, 'tinkerer'); return '관리인 몰래 덮개를 열었다. 마석이 박힌 축, 술식이 새겨진 톱니. 이걸 만든 사람은 마법사가 아니라 장인이었다. 세상이 바뀌고 있다.'; } },
    ],
  },
  {
    id: 'era3_iron_wagon', once: true,
    cond: (g) => age(g) >= 8 && eraOf(g) >= 3,
    weight: 72,
    title: '말 없는 수레',
    text: () => '굉음과 함께 쇳덩이 수레가 가도를 달려왔다. 말이 끌지 않는다. 배 속의 마석로가 붉게 타고, 굴뚝에서 하얀 김이 뿜어져 나온다. 아이들은 환호했고, 말들은 미쳐 날뛰었다.',
    choices: [
      { label: '뒤를 쫓아 달린다', run: (g) => { gainStat(g, 'agi', 0.6); stress(g, -10); return '숨이 턱에 찰 때까지 달렸지만 따라잡을 수 없었다. 저것이 세상을 얼마나 바꿀지, 그때는 몰랐다.'; } },
      { label: '"저건 전쟁에 쓰일 거다."', run: (g) => { gainStat(g, 'int', 0.6); return '옆에 있던 늙은 퇴역병이 고개를 끄덕였다. "기사의 시대는 끝났구나."'; } },
    ],
  },

  // ---------- 교단, 뒷세계, 먼 나라 ----------
  {
    id: 'inquisitor_visit', cooldown: 60,
    cond: (g) => age(g) >= 10 && !!findJob(g, 'hedge_mage'),
    chance: () => 0.015, weight: 60,
    title: '이단심문관',
    text: (g) => `흰 망토에 금빛 태양 문장. 성광교 이단심문관 둘이 마을에 왔다. 떠돌이 마법사 ${findJob(g, 'hedge_mage').name}에 대해 묻고 다닌다. "금기의 술식을 쓴다는 고발이 있었다."`,
    choices: [
      { label: '"그분은 약초만 다룹니다."', run: (g, rng) => { const m = findJob(g, 'hedge_mage'); like(m, 15); if (check(rng, stat(g, 'cha') + stat(g, 'wil'), 35)) { gainStat(g, 'wil', 0.8); return '심문관이 내 눈을 오래 들여다보았다. "아이의 눈은 거짓을 못 하지." 그들은 떠났다. 그날 밤 마법사가 문 앞에 작은 꾸러미를 두고 갔다.'; } setFlag(g, 'inquisition_marked'); return '심문관이 내 이름을 받아 적었다. 마법사는 무사했지만, 내 이름은 어딘가의 장부에 남았다.'; } },
      { label: '본 것을 말한다', run: (g) => { const m = findJob(g, 'hedge_mage'); m.affection -= 30; setFlag(g, 'informed_inquisition'); note(g, m, '이단심문관에게 끌려가 심문을 받았다.'); return '마법사는 사흘 동안 끌려갔다가 돌아왔다. 손가락 둘이 없었다. 그는 다시는 내게 말을 걸지 않았다.'; } },
      { label: '마법사에게 몰래 알린다', run: (g) => { const m = findJob(g, 'hedge_mage'); like(m, 25); m.away = true; note(g, m, '이단심문관을 피해 한밤중에 마을을 떠났다.'); setFlag(g, 'warned_mage'); return `${m.name}은(는) 그날 밤 오두막을 비웠다. 떠나기 전 내 손에 무언가를 쥐여 주었다. 술식이 새겨진 작은 뼈 조각. "언젠가 쓸 데가 있을 거다."`; } },
    ],
  },
  {
    id: 'hero_rite_scouts', once: true,
    cond: (g) => age(g) >= 6 && age(g) <= 14 && (R(g).heroRite ?? 0) >= 20 && (g.player.manaPotential > 0.35 || stat(g, 'str') + stat(g, 'wil') > 70),
    chance: () => 0.06, weight: 80,
    title: '성광국의 사절',
    text: () => '성광 신성국 사절단이 예배당에 머문다. 재능 있는 아이를 성도 솔라리스로 데려가 "성광의 전사"로 기른다고 한다. 가족에게는 금화 다섯 닢이 주어진다. 사절의 눈이 아이들 하나하나를 저울질하듯 훑는다. 그 눈이 나에게서 멈췄다.',
    choices: [
      { label: '눈을 피하고 둔하게 군다', run: (g, rng) => { if (check(rng, stat(g, 'int') + stat(g, 'cha'), 30)) { gainStat(g, 'int', 0.8); setFlag(g, 'escaped_hero_rite'); return '일부러 말을 더듬고, 넘어지고, 멍한 척했다. 사절은 흥미를 잃었다. 옆집 아이가 대신 뽑혀 갔다. 그 아이에게서 편지는 한 번도 오지 않았다.'; } setFlag(g, 'hero_rite_watched'); stress(g, 20); return '사절은 웃었다. "영리하구나. 더 탐이 나는군." 부모가 끝까지 거절하자 그들은 물러갔다. 하지만 장부에 내 이름이 적혔다.'; } },
      { label: '부모가 거절하게 한다', run: (g) => { like(father(g), 4); like(mother(g), 4); setFlag(g, 'hero_rite_watched'); nudge(g, 'heroRite', 0.5); return '아버지가 금화를 밀어냈다. 사절은 미소를 잃지 않았다. "성광께서 다시 부르실 겁니다." 그 말이 위협처럼 들렸다.'; } },
      { label: '"가고 싶어요."', run: (g) => { setFlag(g, 'hero_rite_volunteer'); stress(g, 10); like(mother(g), -10); return '사절이 내 이마에 손을 얹었다. "열다섯이 되면 데리러 오마. 그때까지 몸을 단련해라." 어머니는 그날 밤 내내 울었다. 그 의식에 무엇이 필요한지, 나는 아직 모른다.'; } },
    ],
  },
  {
    id: 'black_glove_errand', cooldown: 36,
    cond: (g) => age(g) >= 12 && (R(g).blackGlove ?? 0) >= 45,
    chance: () => 0.03, weight: 45,
    title: '검은 장갑의 심부름',
    text: () => '여관 뒷골목에서 검은 장갑을 낀 사내가 손짓한다. "꼬마, 이 꾸러미를 하르펜 남문 밖 대장간에 갖다주면 은화 다섯이다. 열어 보지만 않으면 돼."',
    choices: [
      { label: '받는다', run: (g, rng) => { if (rng.chance(0.8)) { g.player.money += 5; setFlag(g, 'black_glove', (flag(g, 'black_glove') ?? 0) + 1); nudge(g, 'blackGlove', 0.3); return '꾸러미는 묵직했고 쇳소리가 났다. 대장간 주인은 아무것도 묻지 않았다. 은화 다섯. 쉬웠다. 너무 쉬웠다.'; } injure(g, '경비대에 끌려가 맞은 상처', 2); stress(g, 25); setFlag(g, 'criminal_record'); return '남문에서 경비대가 꾸러미를 뒤졌다. 안에서 밀수 마석이 쏟아졌다. 사흘을 유치장에서 보냈다. 사내는 물론 찾을 수 없었다.'; } },
      { label: '거절한다', run: (g) => { gainStat(g, 'wil', 0.3); return '"똑똑하군. 아니면 겁쟁이거나." 사내는 웃으며 다른 아이를 불렀다.'; } },
      { label: '경비대에 신고한다', run: (g) => { const gd = findJob(g, 'guard'); like(gd, 5); setFlag(g, 'black_glove_grudge'); return `${nm(gd, '경비병')}은(는) 한숨을 쉬었다. "그놈들은 건드리면 안 된다, 꼬마. 하르펜 경비대장도 그놈들 돈을 받아." 신고는 아무 일도 일으키지 않았다. 다만 그 골목의 사내가 나를 기억하게 됐다.`; } },
    ],
  },
  {
    id: 'balhart_spy', once: true,
    cond: (g) => age(g) >= 12 && (R(g).balhart?.tension ?? 0) >= 60,
    chance: () => 0.03, weight: 50,
    title: '말투가 다른 행상',
    text: () => '행상이라는 남자가 물건은 팔 생각도 없이 하르펜 성벽과 다리, 영주 기사의 수를 묻고 다닌다. "r" 발음을 굴린다. 동쪽 사람, 발하르트 말투다.',
    choices: [
      { label: '경비대에 알린다', run: (g, rng) => { if (rng.chance(0.6)) { g.player.money += 5; nudge(g, 'tension', -1); setFlag(g, 'caught_spy'); return '경비대가 그의 짐에서 지도와 암호문을 찾아냈다. 영주가 포상금 은화 다섯을 보내왔다.'; } return '경비대가 왔을 때 남자는 이미 사라진 뒤였다. 남은 건 마을 주변을 그린 숯 그림 한 장이었다.'; } },
      { label: '거짓 정보를 흘린다', show: (g) => stat(g, 'int') >= 20, run: (g) => { gainStat(g, 'int', 1.0); setFlag(g, 'fooled_spy'); return '하르펜 수비대가 삼천이라고 했다. 남자는 진지하게 받아 적었다. 사실은 삼백이다.'; } },
      { label: '상관하지 않는다', run: () => '남자는 이틀 뒤 동쪽 길로 떠났다.' },
    ],
  },
  {
    id: 'north_volunteers', once: true,
    cond: (g) => age(g) >= 15 && !!R(g).north?.war,
    chance: () => 0.2, weight: 70,
    title: '북부의 원군 모집',
    text: () => '북부 변경백의 사자가 광장에서 외친다. "마왕군이 해협을 건넜다! 중앙의 왕들은 오지 않는다. 검을 들 수 있는 자는 그라우벨로 오라. 밥과 칼과 은화를 준다." 젊은이 몇이 웅성거린다.',
    choices: [
      { label: '지원병 명단에 이름을 쓴다', run: (g) => { setFlag(g, 'north_volunteer'); gainStat(g, 'wil', 1.2); like(mother(g), -10); return '사자가 내 손을 꽉 잡았다. "봄이 오기 전에 출발한다." 집에 돌아가 말하자, 아무도 저녁을 먹지 않았다.'; } },
      { label: '돈을 보탠다', show: (g) => money(g) >= 5, run: (g) => { spend(g, 5); nudge(g, 'garbes', -0.5); return '은화 다섯을 모금함에 넣었다. 사자가 깊이 고개를 숙였다. "북부는 이 은혜를 기억하오."'; } },
      { label: '듣고만 있는다', run: () => '마을에서 둘이 떠났다. 대장간 집 둘째와 떠돌이 일꾼이었다.' },
    ],
  },
  {
    id: 'dragon_hoard_rumor', once: true,
    cond: (g) => age(g) >= 12,
    chance: () => 0.012, weight: 35,
    title: '죽은 용왕의 보물',
    text: () => '여관이 들썩인다. 삼 년 전 죽은 용왕의 보물 더미가 천룡 산맥 어딘가에 그대로 있다는 것이다. 모험가들이 길드를 박차고 동쪽으로 떠난다. 아르젠 왕국이 어떻게 됐는지 다들 잊은 모양이다.',
    choices: [
      { label: '아르젠 이야기를 꺼낸다', run: (g) => { gainStat(g, 'int', 0.5); return '"백이십 년 전, 용의 보물을 훔친 나라가 하룻밤에 재가 됐지." 여관이 잠깐 조용해졌다. 그리고 다시 들썩였다.'; } },
      { label: '언젠가 가 보리라 마음먹는다', run: (g) => { setFlag(g, 'dragon_dream'); gainStat(g, 'wil', 0.5); return '천룡 산맥. 지도로만 본 이름이 가슴속에 박혔다.'; } },
    ],
  },
  {
    id: 'noah_scholar', cooldown: 120,
    cond: (g) => age(g) >= 9 && R(g).log?.some((l) => l.text.includes('감시탑')),
    chance: () => 0.06, weight: 45,
    title: '세레니아에서 온 학자',
    text: (g) => `세레니아의 회색 로브를 입은 학자가 여관에 묵는다. 북쪽으로 가는 길이라고 한다. "감시탑의 불이 ${R(g).noahLight ? '다시 켜졌소' : '또 꺼졌소'}. 노아 님께 무슨 일이 생긴 건지, 협회가 사람을 보내는 거요."`,
    choices: [
      { label: '노아에 대해 묻는다', run: (g) => { gainStat(g, 'int', 0.6); setFlag(g, 'heard_noah_truth'); return '"노아 님은 늙지도 죽지도 않으시오. 봉인 마지막 순간에 자기 시간을 멈추셨지. 오백 년이오. 혼자서." 학자가 술잔을 내려다보았다. "그건 축복이 아니오. 형벌이지."'; } },
      { label: '마법을 보여 달라고 한다', show: (g) => g.player.manaAwakened, run: (g) => { gainSkill(g, 'magic', 2.0, 'int'); return '학자가 손가락으로 허공에 원 셋을 겹쳐 그렸다. 잔 속 포도주가 공중으로 떠올라 꽃 모양으로 얼었다. "3서클이오. 세레니아에선 흔하지만, 여기선 아니겠지." 그는 내 손을 잡아 흐름을 짚어 주었다.'; } },
    ],
  },
  {
    id: 'plague_quarantine', cooldown: 24,
    cond: (g) => age(g) >= 8 && g.world.plague,
    chance: () => 0.35, weight: 65,
    title: '역병의 문',
    text: () => '마을 어귀에 밧줄이 쳐졌다. 하르펜에서 온 사람은 들이지 않는다. 그런데 밧줄 너머에서 한 여인이 아이를 안고 애원한다. "열이 아니에요. 제발요."',
    choices: [
      { label: '밧줄을 들어 올려 준다', run: (g, rng) => { setFlag(g, 'kindness', (flag(g, 'kindness') ?? 0) + 1); if (rng.chance(0.3)) { injure(g, '돌림병', 2); g.player.fatigue += 30; return '여인의 말은 거짓이었다. 아이는 사흘 뒤 죽었고, 나도 열에 시달렸다. 마을에서 둘이 더 앓았다.'; } gainStat(g, 'wil', 0.5); return '여인의 말은 사실이었다. 아이는 그냥 굶주린 것이었다. 예배당 구석에서 둘은 살아남았다.'; } },
      { label: '규칙을 지킨다', run: (g) => { stress(g, 12); return '여인은 한참 울다가 남쪽 길로 사라졌다. 옳은 일이었다고, 사람들은 말했다.'; } },
    ],
  },
);
