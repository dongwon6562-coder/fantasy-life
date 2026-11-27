// 집안마다 다른 사건: 자작농, 몰락한 기사 가문, 상인 집안.
import { J } from '../narrative/text.js';
import { gainStat, gainSkill } from '../game.js';
import { realm, lordName } from '../world.js';
import { startDuel } from '../duel/duel.js';
import {
  EVENTS, flag, setFlag, fam, father, mother, alive, age, findJob, peers, stat, skill, money, spend,
  spendFamily, stress, tire, like, note, injure, check, nm, byId,
} from './core.js';

const dad = (g) => (alive(father(g)) ? father(g) : null);

EVENTS.push(
  // ---------- 자작농 ----------
  {
    id: 'farm_first_plow', once: true,
    cond: (g) => fam(g) === 'farmer' && age(g) >= 9 && g.date.month >= 3 && g.date.month <= 4,
    weight: 70, chance: () => 0.5,
    title: '첫 쟁기질',
    text: (g) => `${J(nm(dad(g), '어른'), '이/가')} 쟁기 손잡이를 넘겨주었다. "소가 끄는 대로 가지 마라. 네가 소를 끄는 거다."`,
    choices: [
      { label: '이를 악물고 끝까지 간다', run: (g) => { gainSkill(g, 'farming', 3.0, 'str'); gainStat(g, 'str', 0.8); tire(g, 15); like(dad(g), 6); return '고랑은 뱀처럼 휘었지만 끝까지 갔다. 저녁에 아버지가 말없이 어깨를 두드렸다.'; } },
      { label: '소를 달래 가며 천천히 간다', run: (g) => { gainSkill(g, 'farming', 2.5, 'sen'); gainStat(g, 'sen', 0.6); return '소의 숨소리에 맞춰 걸었다. 고랑이 곧았다. 아버지가 눈썹을 올렸다. "누구한테 배웠냐."'; } },
    ],
  },
  {
    id: 'farm_blight', cooldown: 24,
    cond: (g) => fam(g) === 'farmer' && age(g) >= 7 && (g.date.month === 6 || g.date.month === 7),
    chance: () => 0.12, weight: 55,
    title: '검은 이삭',
    text: () => '밀 이삭 끝이 검게 썩어 들어간다. 밭 한구석에서 시작된 것이 바람을 타고 번지고 있다.',
    choices: [
      { label: '썩은 곳을 베어 태운다', run: (g) => { tire(g, 15); gainSkill(g, 'farming', 1.5, 'int'); spendFamily(g, 3); return '밭의 오분의 일을 불태웠다. 아버지는 이를 악물었지만, 나머지는 살았다.'; } },
      { label: '약초사에게 묻는다', show: (g) => !!findJob(g, 'herbalist'), run: (g) => { const h = findJob(g, 'herbalist'); like(h, 4); gainSkill(g, 'herbs', 1.5, 'int'); spendFamily(g, 2); return `${J(h.name, '이/가')} 쓴 쑥과 재를 섞어 뿌리라고 했다. 효과가 있었는지는 모르지만, 번지는 건 멈췄다.`; } },
      { label: '성수를 뿌리며 기도한다', run: (g) => { spendFamily(g, 8); return '사제가 성수를 뿌렸다. 병은 계속 번졌고, 가을 수확은 절반이었다.'; } },
    ],
  },
  {
    id: 'farm_boundary', once: true,
    cond: (g) => fam(g) === 'farmer' && age(g) >= 10 && !!dad(g),
    chance: () => 0.03, weight: 45,
    prepare: (g, rng) => { const n = peers(g, 40).filter((p) => p.job === 'farmer' && p.id !== father(g)?.id); return { id: n.length ? rng.pick(n).id : null }; },
    title: '경계석',
    text: (g, c) => `밤사이 밭 경계석이 한 걸음 우리 쪽으로 옮겨져 있다. 옆 밭의 ${J(nm(byId(g, c.id), '이웃'), '은/는')} 처음부터 거기 있었다고 우긴다. ${dad(g).name}의 얼굴이 시뻘게졌다.`,
    choices: [
      { label: '아버지 편에서 따진다', run: (g, rng, c) => { const n = byId(g, c.id); if (n) n.affection -= 10; like(dad(g), 5); gainStat(g, 'wil', 0.5); return '말다툼이 고함이 되고, 고함이 주먹다짐 직전까지 갔다. 경계석은 제자리로 돌아왔지만, 두 집은 그 뒤로 인사도 하지 않는다.'; } },
      { label: '촌장에게 판정을 맡기자고 한다', run: (g, rng, c) => { const e = findJob(g, 'elder'); like(e, 5); gainStat(g, 'int', 0.6); return `${J(nm(e, '촌장'), '이/가')} 오래된 토지 대장을 꺼냈다. 경계석은 반걸음씩 양보한 자리에 다시 박혔다. 양쪽 다 불만이었지만, 싸움은 끝났다.`; } },
      { label: '밤에 몰래 원래대로 옮긴다', run: (g, rng, c) => { gainStat(g, 'str', 0.5); if (check(rng, stat(g, 'agi') + stat(g, 'sen'), 25)) return '달 없는 밤에 경계석을 옮겼다. 아침에 이웃은 아무 말도 하지 못했다. 서로 알면서 모르는 척했다.'; const n = byId(g, c.id); if (n) n.affection -= 15; stress(g, 10); return '돌을 굴리다 이웃에게 들켰다. 마을 전체가 알게 되었다.'; } },
    ],
  },
  {
    id: 'farm_bailiff', cooldown: 24,
    cond: (g) => fam(g) === 'farmer' && age(g) >= 8 && g.date.month === 10 && (realm(g)?.tax ?? 1) >= 1.1,
    chance: () => 0.5, weight: 60,
    title: '영주의 집사',
    text: (g) => `${lordName(g)}의 집사가 말을 타고 왔다. 올해 소작료와 세금을 ${realm(g).tax >= 1.3 ? '크게 ' : ''}올린다고 한다. 수레에 밀 자루를 싣는 병사들의 손이 거칠다.`,
    choices: [
      { label: '순순히 낸다', run: (g) => { spendFamily(g, Math.round(6 * realm(g).tax)); return '광이 반쯤 비었다. 올겨울은 귀리죽이 늘 것이다.'; } },
      { label: '자루 몇 개를 숨긴다', run: (g, rng) => { if (check(rng, stat(g, 'sen') + stat(g, 'agi'), 30)) { spendFamily(g, 2); gainStat(g, 'agi', 0.5); setFlag(g, 'tax_evader', (flag(g, 'tax_evader') ?? 0) + 1); return '건초 더미 아래 밀 자루 셋을 숨겼다. 집사는 눈치채지 못했다.'; } spendFamily(g, Math.round(10 * realm(g).tax)); injure(g, '채찍 자국', 1); stress(g, 20); return '병사가 건초 더미를 찔러 보았다. 숨긴 자루가 쏟아졌다. 벌금이 붙었고, 채찍이 등에 떨어졌다.'; } },
      { label: '집사에게 사정한다', run: (g, rng) => { const t = realm(g).lord.temper; if (t === 'fair' || (t === 'weak' && check(rng, stat(g, 'cha'), 20))) { spendFamily(g, 3); gainStat(g, 'cha', 0.5); return '집사가 한숨을 쉬었다. "흉작이면 그렇다고 장부에 적어 두지." 조금 덜 가져갔다.'; } spendFamily(g, Math.round(7 * realm(g).tax)); return '"영주님 명이다." 집사는 듣지도 않았다.'; } },
    ],
  },

  // ---------- 몰락한 기사 가문 ----------
  {
    id: 'knight_first_form', once: true,
    cond: (g) => fam(g) === 'fallen_knight' && age(g) >= 8 && !!dad(g) && flag(g, 'ev_knight_sword'),
    weight: 75, chance: () => 0.25,
    title: '유수류의 첫 자세',
    text: (g) => `새벽 마당. ${J(dad(g).name, '이/가')} 목검을 쥐여 주었다. "우리 가문은 대대로 유수류다. 먼저 베지 않는다. 흘리고, 받는다. 오늘은 서는 법만 배운다."`,
    choices: [
      { label: '해가 뜰 때까지 버틴다', run: (g) => { gainSkill(g, 'sword', 3.0, 'wil'); gainStat(g, 'wil', 1.0); tire(g, 15); setFlag(g, 'school', 'yusu'); return '다리가 떨리고 팔이 끊어질 것 같았다. 해가 뜨자 아버지가 목검을 거두었다. "내일도 한다."'; } },
      { label: '"베는 법을 배우고 싶어요."', run: (g) => { gainSkill(g, 'sword', 2.0, 'str'); like(dad(g), -3); setFlag(g, 'school', 'yusu'); return '"베는 건 누구나 한다. 살아남는 게 어렵지." 아버지는 그 말만 하고 다시 자세를 잡게 했다.'; } },
    ],
  },
  {
    id: 'knight_old_comrade', once: true,
    cond: (g) => fam(g) === 'fallen_knight' && age(g) >= 7 && !!dad(g),
    chance: () => 0.03, weight: 55,
    title: '옛 전우',
    text: (g) => `낡은 저택 앞에 군마 한 필이 섰다. 레오니아 기사단 휘장을 단 중년 기사가 내렸다. ${dad(g).name}의 옛 전우라고 한다. 둘은 밤늦게까지 술을 마셨다. "에릭 왕자님이 기사를 모으고 계시네. 자네 같은 사람이 필요해."`,
    choices: [
      { label: '몰래 엿듣는다', run: (g) => { gainStat(g, 'sen', 0.6); setFlag(g, 'knows_erik_faction'); return `아버지는 오래 망설이다 고개를 저었다. "나는 이미 끝난 사람이네." 기사가 떠나며 나를 보았다. "${g.player.sex === 'm' ? '아들' : '딸'}이 쓸 만해 보이는군. 열둘이 되면 시동으로 보내게."`; } },
      { label: '기사에게 검을 보여 준다', show: (g) => skill(g, 'sword') >= 5, run: (g) => { gainSkill(g, 'sword', 1.5, 'agi'); setFlag(g, 'knight_page_offer'); gainStat(g, 'cha', 0.5); return '목검을 휘두르자 기사가 웃었다. "자세가 아비를 닮았군." 그는 왕도 기사단의 이름이 적힌 추천장을 남기고 갔다.'; } },
    ],
  },
  {
    id: 'knight_debt', once: true,
    cond: (g) => fam(g) === 'fallen_knight' && age(g) >= 9 && !!dad(g),
    chance: () => 0.03, weight: 60,
    title: '빚쟁이',
    text: () => '검은 장갑을 낀 사내 둘이 저택 문을 두드렸다. 할아버지 대에 진 빚이라며, 이자만 은화 서른 닢이 밀렸다고 한다. "명문가의 체면도 있으실 텐데요."',
    choices: [
      { label: '가문의 검을 팔자고 한다', run: (g) => { g.player.familyMoney += 10; like(dad(g), -12); setFlag(g, 'sword_sold'); return '아버지는 아무 말 없이 벽의 장검을 내렸다. 그날 밤 처음으로 아버지가 우는 소리를 들었다.'; } },
      { label: '아버지 곁에 서서 노려본다', run: (g) => { spendFamily(g, 15); gainStat(g, 'wil', 0.8); like(dad(g), 6); setFlag(g, 'black_glove_grudge'); return '아버지가 은화를 세어 내밀었다. 사내 하나가 내 머리를 쓰다듬었다. "좋은 눈이네, 꼬마." 그 손길이 뱀처럼 차가웠다.'; } },
    ],
  },
  {
    id: 'knight_insult', cooldown: 48,
    cond: (g) => fam(g) === 'fallen_knight' && age(g) >= 11,
    chance: () => 0.02, weight: 50,
    title: '귀족의 아이',
    text: () => '하르펜에서 온 남작가 자제가 말 위에서 내려다보며 웃는다. "폰 어쩌고? 땅 한 뼘 없는 거지 귀족이 아직도 이름 앞에 폰을 붙이나?" 시종들이 따라 웃었다.',
    choices: [
      { label: '결투를 신청한다', run: (g, rng) => { startDuel(g, rng, { kind: 'insult', title: '목검 결투', foe: { name: '남작가 자제', skill: 22 + age(g), style: 'bold' } }); return '귀족끼리의 결투는 법이 허락한다. 목검이 건네졌다. 남작가 자제가 비웃으며 자세를 잡았다.'; } },
      { label: '"이름은 팔지 않았다."', run: (g) => { gainStat(g, 'wil', 0.8); gainStat(g, 'cha', 0.4); return '조용히 말하고 등을 돌렸다. 웃음소리가 등 뒤에서 잦아들었다.'; } },
      { label: '참는다', run: (g) => { stress(g, 15); return '주먹을 쥔 채 땅만 보았다. 손톱이 손바닥을 파고들었다.'; } },
    ],
  },

  // ---------- 상인 집안 ----------
  {
    id: 'merch_haggling', once: true,
    cond: (g) => fam(g) === 'merchant' && age(g) >= 7,
    chance: () => 0.15, weight: 55,
    title: '흥정',
    text: (g) => `가게를 보던 중 손님이 들어왔다. ${J(nm(alive(mother(g)) ? mother(g) : dad(g), '어른'), '은/는')} 창고에 있다. 손님이 소금 한 자루를 들고 반값을 부른다.`,
    choices: [
      { label: '정가를 고집한다', run: (g) => { gainSkill(g, 'trade', 1.5, 'wil'); return '손님은 투덜대며 나갔다가 다시 들어왔다. 결국 정가에 샀다. 어머니가 웃었다. "물건이 좋으면 손님은 돌아온다."'; } },
      { label: '덤을 얹어 준다', run: (g) => { gainSkill(g, 'trade', 2.0, 'cha'); gainStat(g, 'cha', 0.4); return '값은 조금 깎아 주고 마른 무화과 한 줌을 얹었다. 손님은 다음 장날 친구 둘을 데려왔다.'; } },
      { label: '반값에 판다', run: (g) => { spendFamily(g, 2); return '손님이 너무 좋아해서 이상했다. 그날 저녁 아버지에게 소금 시세를 처음부터 다시 배웠다.'; } },
    ],
  },
  {
    id: 'merch_counterfeit', cooldown: 60,
    cond: (g) => fam(g) === 'merchant' && age(g) >= 9,
    chance: () => 0.02, weight: 45,
    title: '가벼운 은화',
    text: () => '오늘 받은 은화 가운데 하나가 이상하게 가볍다. 깨물어 보니 속이 납이다. 위조 은화다. 은화 한 닢이면 평민 하루 품삯이다.',
    choices: [
      { label: '경비대에 신고한다', run: (g) => { const gd = findJob(g, 'guard'); like(gd, 6); gainStat(g, 'wil', 0.4); return `${J(nm(gd, '경비병'), '이/가')} 은화를 받아 갔다. 한 달 뒤, 하르펜에서 위조 조직이 잡혔다는 소식이 들렸다. 그 은화가 실마리였다고 한다.`; } },
      { label: '다른 손님에게 거슬러 준다', run: (g) => { setFlag(g, 'passed_fake', true); gainSkill(g, 'trade', 0.8, 'cha'); return '아무렇지 않은 얼굴로 거스름돈에 섞었다. 손님은 몰랐다. 장사는 원래 이런 거라고, 스스로에게 말했다.'; } },
      { label: '그냥 손해로 친다', run: (g) => { spendFamily(g, 1); return '은화를 녹여 버렸다. 아버지는 "수업료다"라고 했다.'; } },
    ],
  },
  {
    id: 'merch_bandits', cooldown: 36,
    cond: (g) => fam(g) === 'merchant' && age(g) >= 10 && !!dad(g) && flag(g, 'seen_harfen'),
    chance: (g) => 0.02 + Math.max(0, (realm(g)?.monsters ?? 30) - 40) * 0.001 + ((realm(g)?.balhart.war || realm(g)?.succession === 'civilwar') ? 0.03 : 0),
    weight: 65,
    title: '숲길의 매복',
    text: (g) => `하르펜에서 돌아오는 길, 쓰러진 나무가 길을 막았다. 덤불에서 복면을 쓴 사내 넷이 나타났다. "짐은 두고 가쇼. 목숨은 가져가고." ${dad(g).name}의 손이 떨린다.`,
    choices: [
      { label: '짐을 내준다', run: (g) => { spendFamily(g, 25); stress(g, 15); return '짐마차를 통째로 빼앗겼다. 걸어서 돌아오는 내내 아버지는 한마디도 하지 않았다. 그래도 살았다.'; } },
      { label: '말을 채찍질해 돌파한다', run: (g, rng) => { if (check(rng, stat(g, 'agi') + stat(g, 'wil'), 35)) { gainStat(g, 'agi', 0.8); gainStat(g, 'wil', 0.8); return '말이 비명을 지르며 나무를 뛰어넘었다. 화살 하나가 마차 판자에 박혔다. 숨이 멎을 것 같았지만, 짐은 지켰다.'; } injure(g, '화살이 스친 어깨', 3); spendFamily(g, 15); stress(g, 25); return '마차가 뒤집혔다. 어깨에 화살이 스쳤다. 산적들은 짐 절반을 들고 사라졌다.'; } },
      { label: '"우린 그라이펜 백작의 상단이오."', run: (g, rng) => { if (check(rng, stat(g, 'cha') + skill(g, 'trade') / 2, 35)) { gainStat(g, 'cha', 1.0); return '산적들이 멈칫했다. 영주의 이름은 아직 힘이 있었다. 통행세 조로 은화 몇 닢만 주고 지나갔다. 거짓말이었다.'; } spendFamily(g, 25); injure(g, '곤봉에 맞은 머리', 2); return '"백작? 그 양반은 자기 성 밖 일엔 관심 없어." 곤봉이 날아왔다.'; } },
    ],
  },
  {
    id: 'merch_dark_goods', once: true,
    cond: (g) => fam(g) === 'merchant' && age(g) >= 12,
    chance: () => 0.02, weight: 55,
    title: '수상한 짐',
    text: () => '자유도시에서 왔다는 상인이 창고를 빌려 달라고 한다. 사흘만, 금화 한 닢. 덮개 아래 짐에서 아주 작게, 흐느끼는 소리가 들린 것 같다.',
    choices: [
      { label: '덮개를 들춘다', run: (g) => { setFlag(g, 'saw_slavers'); stress(g, 20); gainStat(g, 'wil', 0.8); return '쇠창살 우리 안에 귀가 뾰족한 아이가 웅크리고 있었다. 엘프다. 상인이 웃으며 덮개를 덮었다. "못 본 걸로 하는 게 서로에게 좋지." 아버지는 그를 내쫓았다. 그날 밤 마차는 사라졌다.'; } },
      { label: '돈을 받고 모른 척한다', run: (g) => { g.player.familyMoney += 100; setFlag(g, 'helped_slavers'); stress(g, 10); return '금화는 무거웠다. 사흘 내내 창고 쪽을 보지 않았다. 나흘째 아침, 창고는 비어 있었고 바닥에 작은 손톱자국이 남아 있었다.'; } },
      { label: '밤에 몰래 우리를 연다', run: (g, rng) => { setFlag(g, 'freed_elf'); if (check(rng, stat(g, 'agi') + stat(g, 'sen'), 35)) { gainStat(g, 'wil', 1.2); return '자물쇠를 따자 작은 그림자가 숲으로 사라졌다. 돌아보지도 않았다. 다음 날 상인은 미친 듯이 날뛰었지만 범인을 찾지 못했다. 언젠가, 숲이 이 일을 기억할지도 모른다.'; } injure(g, '얻어맞은 갈비뼈', 3); stress(g, 25); setFlag(g, 'slaver_enemy'); return '자물쇠를 따는 순간 상인의 호위가 덮쳤다. 엘프 아이는 도망쳤지만, 나는 흠씬 두들겨 맞았다. 상인은 떠나며 내 얼굴을 기억해 두겠다고 했다.'; } },
    ],
  },
);
