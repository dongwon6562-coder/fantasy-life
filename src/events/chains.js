// 사건 줄기: 몇 달에 걸쳐 이어지는 이야기. 첫 사건의 선택이 다음 사건을 부르고, 결말이 갈린다.
// 이어지는 단계는 weight 90 이상이라 때가 되면 반드시 찾아온다.
import { gainStat, gainSkill, circleOf } from '../game.js';
import { realm, nudge } from '../world.js';
import { kill } from '../npc.js';
import {
  EVENTS, flag, setFlag, fam, father, mother, alive, age, findJob, peers, bestFriend, stat, skill, money, spend,
  spendFamily, stress, tire, like, note, injure, check, nm, byId, living, ageYears, isFamily, siblings,
  chain, startChain, nextStep, endChain, chainAt, chainDone, monthIndex,
} from './core.js';

const war = (g) => !!realm(g)?.balhart.war;
const free = (g) => Object.keys(g.chains ?? {}).length < 3; // 줄기가 너무 많이 겹치지 않게
const C = (g, id) => chain(g, id)?.data ?? {};

EVENTS.push(
  // ======================================================================
  // 1. 부모의 병 (3단계)
  // ======================================================================
  {
    id: 'chain_illness_start', once: true,
    cond: (g) => age(g) >= 5 && free(g) && [father(g), mother(g)].some((p) => alive(p) && ageYears(p) >= 28),
    chance: () => 0.008, weight: 70,
    prepare: (g, rng) => ({ id: rng.pick([father(g), mother(g)].filter((p) => alive(p) && ageYears(p) >= 28)).id }),
    title: '멎지 않는 기침',
    text: (g, c) => `${byId(g, c.id).name}의 기침이 한 달째 멎지 않는다. 오늘 아침 손수건에 붉은 것이 묻어 있었다. 본인은 별것 아니라며 밭에 나갔다.`,
    choices: [
      { label: '약초사를 데려온다', run: (g, rng, c) => { spendFamily(g, 5); startChain(g, 'illness', 1, 2, { id: c.id, care: 1 }); like(byId(g, c.id), 5); return '약초사가 가슴에 귀를 대 보고는 얼굴을 찌푸렸다. "폐에 물이 찼소. 따뜻하게 하고 쉬어야 하오. 일은 안 되오."'; } },
      { label: '억지로라도 쉬게 한다', run: (g, rng, c) => { tire(g, 10); startChain(g, 'illness', 1, 2, { id: c.id, care: 1 }); like(byId(g, c.id), 8); return '밭일을 대신 나갔다. 투덜대던 목소리가 사흘째부터 조용해졌다. 그게 더 무서웠다.'; } },
      { label: '본인 말대로 지켜본다', run: (g, rng, c) => { startChain(g, 'illness', 1, 2, { id: c.id, care: 0 }); return '별것 아니라고 했다. 믿고 싶었다.'; } },
    ],
  },
  {
    id: 'chain_illness_turn', weight: 94, cooldown: 0,
    cond: (g) => chainAt(g, 'illness', 1),
    title: '깊어지는 병',
    text: (g) => `${nm(byId(g, C(g, 'illness').id))}이(가) 자리에서 일어나지 못한다. 밤마다 기침 소리가 벽을 타고 들린다. 하르펜 의원에게 보이려면 은화 스무 닢이 든다고 한다.`,
    choices: [
      { label: '하르펜 의원에게 데려간다', show: (g) => g.player.familyMoney + money(g) >= 20, run: (g) => { const need = 20; const fromMe = Math.min(money(g), need); spend(g, fromMe); spendFamily(g, need - fromMe); nextStep(g, 'illness', 2, 2, { care: C(g, 'illness').care + 2 }); tire(g, 10); return '수레에 눕혀 하르펜까지 이틀을 걸었다. 의원은 마석 가루를 섞은 비싼 약을 지어 주었다. "봄까지 버티면 삽니다."'; } },
      { label: '밤새 곁을 지킨다', run: (g) => { tire(g, 25); stress(g, 15); nextStep(g, 'illness', 2, 2, { care: C(g, 'illness').care + 1 }); like(byId(g, C(g, 'illness').id), 15); return '뜨거운 수건을 갈고, 묽은 수프를 떠먹였다. 새벽이면 잠깐 눈을 붙였다. 앓는 사람이 내 손을 쥐고 놓지 않았다.'; } },
      { label: '사제에게 성광의 치유를 부탁한다', run: (g, rng) => { const p = findJob(g, 'priest'); like(p, 4); spendFamily(g, 3); const blessed = rng.chance(0.35); nextStep(g, 'illness', 2, 2, { care: C(g, 'illness').care + (blessed ? 2 : 0) }); return blessed ? '사제의 손에서 희미한 빛이 흘러나왔다. 신성력이었다. 기침이 그날 밤만은 잦아들었다.' : '사제는 성수를 뿌리고 기도문을 외웠다. 기침은 그대로였다.'; } },
    ],
  },
  {
    id: 'chain_illness_end', weight: 94, cooldown: 0,
    cond: (g) => chainAt(g, 'illness', 2),
    prepare: (g, rng) => { const d = C(g, 'illness'); const p = byId(g, d.id); const odds = 0.2 + d.care * 0.18 + ((p?.health ?? 70) - 70) * 0.005 - (g.world.famine ? 0.1 : 0); return { survive: rng.chance(Math.min(0.92, odds)) }; },
    title: '봄',
    text: (g, c) => { const p = byId(g, C(g, 'illness').id); return c.survive ? `얼음이 녹던 아침, ${nm(p)}이(가) 혼자 일어나 창문을 열었다. 얼굴은 반쪽이 되었지만 눈빛이 돌아왔다. "배고프구나."` : `${nm(p)}의 숨이 점점 얕아진다. 가족이 침대 곁에 모였다. 사제가 마지막 기도를 준비하고 있다. 마른 손이 나를 찾는다.`; },
    choices: [
      { label: '손을 잡는다', run: (g, rng, c) => { const p = byId(g, C(g, 'illness').id); endChain(g, 'illness', c.survive ? 'recovered' : 'died'); if (c.survive) { like(p, 15); p.health = Math.max(40, (p.health ?? 60) - 15); note(g, p, '폐병을 앓았으나 이겨 냈다.'); stress(g, -20); return '그날 저녁 식탁엔 오랜만에 고기 수프가 올랐다. 다들 말없이 먹었다. 말하면 울 것 같아서.'; } kill(g, p, '폐병'); stress(g, 40); gainStat(g, 'wil', 1.5); return `"...잘 커라." 그것이 마지막 말이었다. 창밖에서 봄비가 내리기 시작했다. ${p.name}은(는) 예배당 뒤 언덕에 묻혔다.`; } },
    ],
  },

  // ======================================================================
  // 2. 징집된 아버지 (3단계)
  // ======================================================================
  {
    id: 'chain_conscript', once: true,
    cond: (g) => age(g) >= 4 && free(g) && war(g) && alive(father(g)) && ageYears(father(g)) <= 48,
    chance: () => 0.25, weight: 85,
    title: '징집 영장',
    text: (g) => `${realm(g) ? '영주' : '왕국'}의 기사가 문 앞에서 두루마리를 펼쳤다. "${father(g).name}, 국왕 폐하의 이름으로 징집한다. 사흘 뒤 하르펜 광장으로 출두하라." 어머니가 문틀을 붙잡았다.`,
    choices: [
      { label: '아버지를 보낸다', run: (g) => { const f = father(g); f.away = true; note(g, f, '발하르트 전쟁에 징집되어 전선으로 떠났다.'); startChain(g, 'fatherwar', 1, 4, {}); like(f, 10); return `떠나는 날 아침, ${f.name}은(는) 내 머리에 손을 얹었다. "집을 부탁한다." 행렬이 언덕 너머로 사라질 때까지 아무도 집에 들어가지 않았다.`; } },
      { label: '대납금을 내고 빼낸다', show: (g) => g.player.familyMoney >= 35, run: (g) => { spendFamily(g, 35); endChain(g, 'fatherwar', 'bought'); stress(g, 5); return '집안 돈 대부분을 털어 대납금을 냈다. 대신 가난한 집 청년 하나가 그 자리로 갔다. 그 청년의 어머니가 우리 집 앞을 지날 때마다 고개를 돌렸다.'; } },
      { label: '숲으로 숨으라고 한다', run: (g, rng) => { const f = father(g); if (check(rng, stat(g, 'int') + stat(g, 'sen'), 40)) { endChain(g, 'fatherwar', 'hid'); setFlag(g, 'draft_dodger'); return `${f.name}은(는) 석 달 동안 사냥꾼 오두막에 숨어 지냈다. 밤마다 음식을 날랐다. 들키지 않았다. 아버지는 그 일을 평생 부끄러워했다.`; } f.away = true; spendFamily(g, 10); note(g, f, '징집을 피해 숨었다가 붙잡혀 최전선으로 끌려갔다.'); startChain(g, 'fatherwar', 1, 3, { punished: true }); stress(g, 20); return '이틀 만에 기사들이 오두막을 찾아냈다. 아버지는 묶인 채 끌려갔다. 벌금까지 물었다. 탈영 시도자는 최전선으로 보낸다고 했다.'; } },
    ],
  },
  {
    id: 'chain_war_letter', weight: 93, cooldown: 0,
    cond: (g) => chainAt(g, 'fatherwar', 1),
    title: '전선에서 온 편지',
    text: (g) => `행상 편에 구겨진 편지가 왔다. ${father(g)?.name ?? '아버지'}의 서툰 글씨다. "잘 있다. 밥은 먹는다. 옆자리 사람이 어제 죽었다. 너희는 걱정하지 마라." 마지막 줄은 번져서 읽을 수 없다.`,
    choices: [
      { label: '답장을 쓴다', show: (g) => skill(g, 'letters') >= 10, run: (g) => { gainSkill(g, 'letters', 1.5, 'int'); like(father(g), 10); nextStep(g, 'fatherwar', 2, 5, { wrote: true }); return '집 이야기를 썼다. 밀이 잘 자란다고, 동생이 말을 시작했다고. 걱정할 것은 하나도 쓰지 않았다.'; } },
      { label: '편지를 품에 넣고 다닌다', run: (g) => { gainStat(g, 'wil', 0.8); nextStep(g, 'fatherwar', 2, 5, {}); return '종이가 해질 때까지 몇 번이고 다시 읽었다.'; } },
      { label: '아버지 몫까지 일한다', run: (g) => { tire(g, 15); g.player.familyMoney += 4; gainStat(g, 'str', 0.8); nextStep(g, 'fatherwar', 2, 5, {}); return '아버지가 하던 일을 했다. 손에 물집이 잡혔다가, 굳은살이 되었다.'; } },
    ],
  },
  {
    id: 'chain_war_return', weight: 93, cooldown: 0,
    cond: (g) => { const c = chain(g, 'fatherwar'); return !!c && c.step === 2 && (monthIndex(g) >= c.at || !war(g)); },
    prepare: (g, rng) => { const d = C(g, 'fatherwar'); const r = rng.next() + (d.punished ? 0.2 : 0) - (realm(g)?.balhart.front ?? 0) * 0.02; return { fate: r < 0.45 ? 'whole' : r < 0.8 ? 'wounded' : 'dead' }; },
    title: '돌아온 사람, 돌아오지 않은 사람',
    text: (g, c) => { const f = father(g); return c.fate === 'dead' ? `전령이 모자를 벗고 문 앞에 섰다. 손에 든 것은 ${f?.name ?? '아버지'}의 이름이 새겨진 나무패 하나. "명예롭게 싸웠습니다." 그것이 전부였다.` : c.fate === 'wounded' ? `언덕 너머에서 지팡이를 짚은 사람이 걸어온다. ${f?.name ?? '아버지'}다. 한쪽 다리를 끌고, 눈빛이 달라졌다. 밤마다 소리를 지르며 깬다고 한다.` : `언덕 너머에서 익숙한 걸음걸이가 보였다. ${f?.name ?? '아버지'}다. 수염이 덥수룩하고 많이 말랐지만, 두 발로 걸어서 돌아왔다.`; },
    choices: [
      { label: '달려간다', run: (g, rng, c) => { const f = father(g); endChain(g, 'fatherwar', c.fate); if (c.fate === 'dead') { if (f) kill(g, f, '발하르트 전쟁에서 전사'); stress(g, 40); gainStat(g, 'wil', 1.5); return '나무패를 품에 안고 언덕에 섰다. 아무것도 묻을 것이 없는 무덤을 만들었다. 그날 이후 집에서 전쟁 이야기를 하는 사람은 없었다.'; } if (f) { f.away = false; like(f, 15); note(g, f, c.fate === 'wounded' ? '다리를 다친 채 전쟁에서 돌아왔다.' : '전쟁에서 무사히 돌아왔다.'); if (c.fate === 'wounded') { f.health = Math.max(30, (f.health ?? 70) - 25); stress(g, 15); return '아버지를 부축했다. 예전처럼 밭일은 못 할 것이다. 그래도 살아 있다. 밤에 아버지가 소리를 지르며 깨면, 말없이 등을 쓸었다.'; } } stress(g, -25); return '아버지가 나를 들어 올렸다. 아니, 들어 올리려다 웃었다. "많이 컸구나." 그날 밤 집에는 늦게까지 불이 켜져 있었다.'; } },
    ],
  },

  // ======================================================================
  // 3. 검은 로브의 스승 (3단계)
  // ======================================================================
  {
    id: 'chain_darkmage_start', once: true,
    cond: (g) => g.player.manaAwakened && age(g) >= 8 && age(g) <= 15 && free(g),
    chance: () => 0.015, weight: 65,
    title: '검은 로브의 여자',
    text: () => '마을 밖 버려진 양치기 오두막에 누군가 머문다. 해 질 녘 지나가는데, 검은 로브의 여자가 문간에서 나를 불렀다. "네 안의 흐름이 길 건너서도 보이는구나. 시골 마법사한테 배우기엔 아깝다. 내가 가르쳐 줄까?"',
    choices: [
      { label: '배우겠다고 한다', run: (g) => { startChain(g, 'darkmage', 1, 3, {}); gainSkill(g, 'magic', 2.5, 'int'); setFlag(g, 'darkmage_student'); return '그녀는 이름을 말하지 않았다. 첫날, 그녀는 내 손바닥 위에 마력을 실처럼 뽑아 보였다. 시골 마법사가 일 년 걸려 가르칠 것을 하룻밤에 보여 주었다.'; } },
      { label: '거절하고 돌아선다', run: (g) => { endChain(g, 'darkmage', 'refused'); return '"현명한 건지 겁쟁이인 건지." 등 뒤에서 웃음소리가 들렸다. 다음 날 오두막은 비어 있었다.'; } },
      { label: '어른들에게 알린다', run: (g) => { endChain(g, 'darkmage', 'reported'); const gd = findJob(g, 'guard'); like(gd, 4); return '경비병이 오두막에 갔을 때는 아무도 없었다. 바닥에 분필로 그린 원과, 타 버린 새의 뼈만 남아 있었다.'; } },
    ],
  },
  {
    id: 'chain_darkmage_lessons', weight: 93, cooldown: 0,
    cond: (g) => chainAt(g, 'darkmage', 1),
    title: '작은 부탁',
    text: () => '석 달째 밤마다 오두막에 다녔다. 마력이 몰라보게 늘었다. 오늘 밤 그녀가 처음으로 부탁을 했다. "망자의 밤이 오기 전에, 마을 묘지에서 가장 오래된 무덤의 흙 한 줌과 뼛조각 하나를 가져다주렴. 연구에 필요해."',
    choices: [
      { label: '가져다준다', run: (g) => { gainSkill(g, 'magic', 3.0, 'int'); g.player.mana += 4; stress(g, 15); nextStep(g, 'darkmage', 2, 2, { complicit: true }); return '달 없는 밤, 이름이 지워진 무덤을 팠다. 손이 떨렸다. 그녀는 뼛조각을 받아 들고 처음으로 활짝 웃었다. 그 웃음이 무서웠다.'; } },
      { label: '"무엇에 쓰는 건데요?"', run: (g) => { gainStat(g, 'int', 0.8); nextStep(g, 'darkmage', 2, 1, { asked: true }); return '그녀는 한참 나를 보았다. "죽은 것도 흐름을 가지고 있단다. 사람들은 그걸 두려워할 뿐이지." 대답이 아니었다.'; } },
      { label: '그만 다니기로 한다', run: (g) => { endChain(g, 'darkmage', 'left'); gainSkill(g, 'magic', 1.0, 'wil'); return '그날 이후 오두막에 가지 않았다. 일주일 뒤 그녀는 떠났다. 문간에 쪽지 하나가 꽂혀 있었다. "언젠가 다시 찾게 될 거야."'; } },
    ],
  },
  {
    id: 'chain_darkmage_reveal', weight: 93, cooldown: 0,
    cond: (g) => chainAt(g, 'darkmage', 2),
    title: '움직이는 뼈',
    text: () => '오두막 문을 열자 촛불 사이로 그것이 보였다. 바닥의 원 안에서, 내가 가져온 뼛조각을 중심으로 까마귀의 사체가 일어나 날개를 퍼덕이고 있다. 사령술. 모든 나라에서 사형인 금기다. 그녀가 돌아보았다. "봤구나. 그럼 선택하렴. 나와 함께 세레니아로 가자. 탑 아래에는 우리 같은 사람들이 있어."',
    choices: [
      { label: '이단심문소에 고발한다', run: (g, rng) => { endChain(g, 'darkmage', 'betrayed'); g.player.money += 15; setFlag(g, 'necromancer_enemy'); stress(g, 20); return '이단심문관들이 오두막을 포위했을 때, 그녀는 이미 없었다. 대신 벽에 피로 쓴 글씨가 남아 있었다. 내 이름이었다. 포상금 은화 열다섯 닢은 무겁고 차가웠다.'; } },
      { label: '"더 가르쳐 주세요."', run: (g) => { endChain(g, 'darkmage', 'apprentice'); gainSkill(g, 'magic', 5.0, 'int'); g.player.mana += 10; setFlag(g, 'necromancy_taint'); stress(g, 10); return '그녀는 떠나기 전 한 달 동안 금지된 것들을 가르쳤다. 흐름의 반대편, 죽음 쪽으로 흐르는 마력. 몸 어딘가가 영영 차가워졌다. 떠나며 그녀가 말했다. "세레니아 일곱 번째 탑. 그 이름을 대렴."'; } },
      { label: '아무 말 없이 도망친다', run: (g) => { endChain(g, 'darkmage', 'fled'); stress(g, 25); gainStat(g, 'wil', 1.0); return '정신없이 달렸다. 뒤에서 그녀가 웃는 소리가 났다. 쫓아오지는 않았다. 다음 날 오두막은 불타 있었고, 묘지의 무덤 하나가 비어 있었다.'; } },
    ],
  },

  // ======================================================================
  // 4. 사라진 아이들 (3단계)
  // ======================================================================
  {
    id: 'chain_missing_start', once: true,
    cond: (g) => age(g) >= 9 && free(g) && peers(g, 5).some((p) => ageYears(p) < 14),
    chance: () => 0.01, weight: 70,
    prepare: (g, rng) => ({ id: rng.pick(peers(g, 5).filter((p) => ageYears(p) < 14)).id }),
    title: '돌아오지 않은 아이',
    text: (g, c) => `${byId(g, c.id).name}이(가) 사흘째 돌아오지 않는다. 마지막으로 본 건 마을 어귀 갈림길이었다. 이웃 마을에서도 아이 둘이 사라졌다는 소식이 왔다. 사람들이 횃불을 든다.`,
    choices: [
      { label: '수색대에 끼어든다', run: (g, rng, c) => { startChain(g, 'missing', 1, 1, { id: c.id, joined: true }); tire(g, 15); return '숲과 강둑을 밤새 뒤졌다. 아무것도 없었다. 그런데 돌아오는 길, 갈림길 진흙에 깊은 바퀴 자국이 보였다. 짐을 무겁게 실은 마차였다.'; } },
      { label: '그 아이의 친구들에게 묻고 다닌다', run: (g, rng, c) => { startChain(g, 'missing', 1, 1, { id: c.id, joined: true, asked: true }); gainStat(g, 'sen', 0.6); return '아이들 하나가 털어놓았다. 사라지기 전날, 단 사탕을 나눠 주던 친절한 행상 아저씨가 있었다고. 동쪽 말투였다고.'; } },
      { label: '집에 있는다', run: (g, rng, c) => { startChain(g, 'missing', 1, 2, { id: c.id, joined: false }); return '부모가 문을 걸어 잠갔다. 밤새 마을을 도는 횃불 빛이 창을 스쳤다.'; } },
    ],
  },
  {
    id: 'chain_missing_clue', weight: 93, cooldown: 0,
    cond: (g) => chainAt(g, 'missing', 1),
    title: '동쪽 길의 마차',
    text: (g) => C(g, 'missing').joined
      ? '바퀴 자국을 따라가니 동쪽 숲속 빈터가 나왔다. 덮개 씌운 마차 두 대와 모닥불, 무장한 사내 넷. 마차 안에서 아이 울음이 새어 나온다. 노예상이다. 자유도시 암시장으로 가는.'
      : '수색대가 동쪽 숲에서 노예상의 야영지를 찾았다는 소식이 왔다. 어른들이 무기를 모은다. 하지만 사내들은 무장했고 마을 남자들은 농사꾼이다.',
    choices: [
      { label: '마을로 달려가 어른들을 데려온다', run: (g) => { nextStep(g, 'missing', 2, 0, { plan: 'adults' }); return '숨이 끊어질 듯 달렸다. 경비병과 사냥꾼, 대장장이가 무기를 들었다.'; } },
      { label: '밤을 틈타 마차에 숨어든다', show: (g) => C(g, 'missing').joined, run: (g) => { nextStep(g, 'missing', 2, 0, { plan: 'sneak' }); return '모닥불이 사그라들 때까지 덤불에서 기다렸다. 보초 하나가 졸기 시작했다.'; } },
      { label: '하르펜 경비대에 사람을 보내자고 한다', run: (g) => { nextStep(g, 'missing', 2, 1, { plan: 'city' }); gainStat(g, 'int', 0.4); return '촌장이 말 잘 타는 젊은이를 하르펜으로 보냈다. 경비대가 오려면 시간이 걸린다.'; } },
    ],
  },
  {
    id: 'chain_missing_end', weight: 93, cooldown: 0,
    cond: (g) => chainAt(g, 'missing', 2),
    prepare: (g, rng) => { const d = C(g, 'missing'); let ok; if (d.plan === 'sneak') ok = check(rng, stat(g, 'agi') + stat(g, 'sen'), 40); else if (d.plan === 'adults') ok = rng.chance(0.6); else ok = rng.chance(0.35); return { ok }; },
    title: '새벽의 숲',
    text: (g, c) => { const d = C(g, 'missing'); const p = byId(g, d.id); if (d.plan === 'sneak') return c.ok ? `칼로 마차 덮개 끈을 끊었다. 안에 아이 여섯이 묶여 있었다. ${nm(p)}도 있었다. 손짓으로 조용히 하라고 했다.` : '마차에 손을 대는 순간 개가 짖었다. 보초가 벌떡 일어났다.'; if (d.plan === 'adults') return c.ok ? '마을 남자들이 함성을 지르며 빈터로 쏟아져 들어갔다. 노예상들은 마차를 버리고 달아났다.' : '마을 남자들이 빈터에 닿았을 때 노예상들은 이미 짐을 꾸려 떠난 뒤였다. 꺼진 모닥불만 남았다.'; return c.ok ? '사흘 뒤, 하르펜 경비대가 동쪽 가도에서 노예상을 붙잡았다는 소식이 왔다.' : '하르펜 경비대는 이틀 늦게 왔다. 바퀴 자국은 동쪽 가도에서 끊겨 있었다.'; },
    choices: [
      { label: '...', run: (g, rng, c) => { const d = C(g, 'missing'); const p = byId(g, d.id); endChain(g, 'missing', c.ok ? 'rescued' : 'lost'); if (c.ok) { if (p) { like(p, 30); note(g, p, '노예상에게 붙잡혔다가 구출되었다.'); } if (d.plan === 'sneak') { gainStat(g, 'agi', 1.2); gainStat(g, 'wil', 1.2); setFlag(g, 'rescued_children'); return '아이들을 하나씩 덤불로 빼냈다. 새벽녘, 마을 어귀에서 부모들이 무너지듯 아이들을 끌어안았다. 그날 이후 마을 사람들은 내 이름을 다르게 불렀다.'; } return `${nm(p, '아이')}이(가) 부모 품으로 돌아왔다. 아이는 한동안 밤마다 울며 깼다. 그래도 돌아왔다.`; } if (p) { p.away = true; note(g, p, '노예상에게 끌려가 행방을 알 수 없게 되었다.'); } if (d.plan === 'sneak') { injure(g, '노예상의 칼에 베인 등', 4); stress(g, 30); return '보초의 칼이 등을 그었다. 숲으로 굴러 겨우 도망쳤다. 마차는 동쪽으로 사라졌다. 아이들도 함께.'; } stress(g, 20); return `${nm(p, '아이')}은(는) 돌아오지 않았다. 그 집 어머니는 매일 동쪽 길 끝에 나가 섰다. 자유도시 어딘가의 암시장. 그 이름을 마음에 새겼다.`; } },
    ],
  },

  // ======================================================================
  // 5. 문양이 새겨진 돌 (3단계)
  // ======================================================================
  {
    id: 'chain_stone_find', once: true,
    cond: (g) => age(g) >= 7 && age(g) <= 16 && free(g),
    chance: () => 0.012, weight: 50,
    title: '강바닥의 돌',
    text: () => '얕은 여울에서 손바닥만 한 검은 돌을 주웠다. 표면에 각진 문양이 빼곡하다. 물에서 꺼냈는데도 이상하게 따뜻하다.',
    choices: [
      { label: '몰래 간직한다', run: (g) => { startChain(g, 'stone', 1, 2, {}); gainStat(g, 'sen', 0.4); return '침대 밑 상자에 넣었다. 밤에 가끔 꺼내 보면, 문양이 미세하게 움직이는 것 같았다.'; } },
      { label: '강물에 다시 던진다', run: (g) => { endChain(g, 'stone', 'thrown'); return '어딘가 꺼림칙했다. 돌은 물보라 하나 남기고 가라앉았다.'; } },
    ],
  },
  {
    id: 'chain_stone_glow', weight: 92, cooldown: 0,
    cond: (g) => chainAt(g, 'stone', 1),
    title: '밤의 빛',
    text: () => '한밤중, 침대 밑에서 푸른빛이 새어 나온다. 상자를 열자 돌의 문양이 하나하나 빛나고 있다. 그리고 머릿속에서 목소리 같은 것이 울렸다. 알아들을 수 없는 말. 오래된 말.',
    choices: [
      { label: '돌을 손에 쥔다', run: (g) => { nextStep(g, 'stone', 2, 3, { held: true }); if (g.player.manaAwakened) { gainSkill(g, 'magic', 2.0, 'wil'); g.player.mana += 3; } else gainStat(g, 'wil', 0.8); stress(g, 10); return '손바닥이 타는 듯했다. 눈앞에 무너지는 탑과 불타는 하늘이 스쳤다. 정신을 차리자 새벽이었고, 돌은 다시 식어 있었다.'; } },
      { label: '천으로 싸서 묻어 버린다', run: (g) => { nextStep(g, 'stone', 2, 3, { buried: true }); return '헛간 뒤에 깊이 묻었다. 그 뒤로 빛은 보이지 않았다. 하지만 그 자리에는 풀이 자라지 않았다.'; } },
      { label: '떠돌이 마법사에게 보인다', show: (g) => !!findJob(g, 'hedge_mage'), run: (g) => { const m = findJob(g, 'hedge_mage'); like(m, 5); gainStat(g, 'int', 0.6); nextStep(g, 'stone', 2, 2, { shown: true }); return `${nm(m, '떠돌이 마법사')}의 얼굴에서 핏기가 가셨다. "아르카나 문자다. 고대 왕국의... 이런 건 시골 강바닥에 있으면 안 되는 물건이야. 누구에게도 보여 주지 마라."`; } },
    ],
  },
  {
    id: 'chain_stone_buyer', weight: 92, cooldown: 0,
    cond: (g) => chainAt(g, 'stone', 2),
    title: '돌을 찾는 사람',
    text: () => '세레니아의 회색 로브를 입은 사내가 마을을 돌며 묻는다. "최근 이상한 빛을 본 사람? 문양이 새겨진 돌?" 그는 금화 주머니를 짤랑인다. 그리고 그 눈이, 왠지 곧장 나를 향한다.',
    choices: [
      { label: '판다', run: (g) => { endChain(g, 'stone', 'sold'); g.player.money += 60; gainSkill(g, 'trade', 1.0, 'cha'); return '사내는 돌을 받아 들고 숨을 멈췄다. 금화 하나를 더 얹었다. "협회는 오늘 일을 기억할 거요." 은화로 쳐서 예순 닢. 평생 만져 본 적 없는 돈이다.'; } },
      { label: '모른다고 한다', run: (g, rng) => { endChain(g, 'stone', 'kept'); setFlag(g, 'arcana_stone'); if (check(rng, stat(g, 'cha') + stat(g, 'wil'), 35)) { gainStat(g, 'wil', 0.8); return '사내는 한참 나를 들여다보다 웃었다. "그렇다면 할 수 없지." 그는 떠났다. 돌은 아직 내게 있다. 언젠가 이것이 무엇인지 알게 될 것이다.'; } setFlag(g, 'serenia_watching'); stress(g, 15); return '"거짓말이 서툴군." 사내는 웃으며 떠났다. 그 뒤로 가끔, 회색 로브가 마을 근처에서 보였다.'; } },
      { label: '"이게 뭔지 알려 주면 생각해 보죠."', show: (g) => stat(g, 'int') >= 20, run: (g) => { endChain(g, 'stone', 'traded_knowledge'); setFlag(g, 'arcana_stone'); gainStat(g, 'int', 1.2); if (g.player.manaAwakened) gainSkill(g, 'magic', 2.0, 'int'); return '사내가 웃었다. "협상할 줄 아는군." 아르카나 왕국의 열쇠돌이라고 했다. 잊힌 땅의 유적 어딘가를 여는. 그는 문양 몇 개를 읽어 주고, 언젠가 세레니아에 오면 찾으라며 이름을 남겼다. 돌은 내게 남았다.'; } },
    ],
  },

  // ======================================================================
  // 6. 검은 장갑의 빚 (adult_loan_shark에서 시작, 2단계)
  // ======================================================================
  {
    id: 'chain_loan_due', weight: 93, cooldown: 0,
    cond: (g) => chainAt(g, 'loan', 1),
    title: '여섯 달',
    text: () => `여관에서 그 남자가 기다리고 있었다. 이번엔 혼자가 아니다. 덩치 둘이 뒤에 섰다. "마흔 닢. 오늘이오."`,
    choices: [
      { label: '갚는다', show: (g) => money(g) >= C(g, 'loan').owe, run: (g) => { spend(g, C(g, 'loan').owe); endChain(g, 'loan', 'paid'); return '동전을 세어 내밀었다. 남자는 장부의 이름에 줄을 그었다. "또 필요하면 찾으시오." 다시는 찾지 않으리라.'; } },
      { label: '기한을 늘려 달라고 한다', run: (g) => { nextStep(g, 'loan', 2, 3, { owe: C(g, 'loan').owe + 20 }); stress(g, 15); return `"석 달. 대신 예순이오." 남자가 웃었다. 덩치 하나가 손가락 관절을 꺾었다.`; } },
      { label: '배 째라고 한다', run: (g, rng) => { if (check(rng, skill(g, 'sword') + stat(g, 'str') / 2, 50)) { endChain(g, 'loan', 'fought'); setFlag(g, 'black_glove_grudge'); gainSkill(g, 'sword', 2.0, 'str'); return '덩치 하나를 여관 탁자 위로 메다꽂았다. 남자는 손을 들었다. "오늘은 물러나지. 하지만 장갑은 잊지 않소." 빚은 사라지지 않았다. 원한으로 바뀌었을 뿐.'; } nextStep(g, 'loan', 2, 2, { owe: C(g, 'loan').owe + 20 }); injure(g, '부러진 손가락', 3); return '덩치들이 뒷골목으로 끌고 갔다. 손가락 두 개가 반대로 꺾였다. "다음엔 다리요."'; } },
    ],
  },
  {
    id: 'chain_loan_threat', weight: 93, cooldown: 0,
    cond: (g) => chainAt(g, 'loan', 2),
    title: '불타는 헛간',
    text: (g) => `밤중에 연기 냄새가 났다. 집 헛간에 불이 붙었다. 문에 검은 장갑 한 짝이 못 박혀 있다. 빚은 이제 은화 ${C(g, 'loan').owe}닢이다.`,
    choices: [
      { label: '집안 돈까지 털어 갚는다', run: (g) => { const owe = C(g, 'loan').owe; const fromMe = Math.min(money(g), owe); spend(g, fromMe); spendFamily(g, owe - fromMe); endChain(g, 'loan', 'paid_family'); for (const p of [father(g), mother(g)]) like(p, -10); stress(g, 20); return '부모가 말없이 금고를 열었다. 헛간은 다시 지으면 된다. 하지만 부모의 눈빛은 다시 짓기 어려울 것이다.'; } },
      { label: '경비대장에게 호소한다', run: (g, rng) => { if (rng.chance(0.3)) { endChain(g, 'loan', 'law'); nudge(g, 'blackGlove', -1); return '새로 온 젊은 경비대장이 의외로 움직였다. 고리대금업자가 하르펜 감옥에 갇혔다. 장부는 불태워졌다. 운이 좋았다.'; } spendFamily(g, 15); endChain(g, 'loan', 'lost'); injure(g, '불을 끄다 데인 팔', 2); stress(g, 25); return '경비대장은 한숨만 쉬었다. 그날 밤 집 창문이 깨졌다. 결국 가진 것을 다 내주고서야 끝났다.'; } },
      { label: '마을을 떠나 몸을 숨긴다', run: (g) => { endChain(g, 'loan', 'fled'); setFlag(g, 'black_glove_wanted'); stress(g, 15); return '짐 하나만 들고 밤길을 나섰다. 빚은 남았고, 장갑의 장부에 이름도 남았다. 언젠가 그 장부를 불태울 날이 올까.'; } },
    ],
  },

  // ======================================================================
  // 7. 떠나는 친구 (2단계)
  // ======================================================================
  {
    id: 'chain_friend_leaving', once: true,
    cond: (g) => age(g) >= 9 && age(g) <= 15 && free(g) && !!bestFriend(g) && bestFriend(g).affection >= 25,
    chance: () => 0.02, weight: 60,
    prepare: (g) => ({ id: bestFriend(g).id }),
    title: '이사',
    text: (g, c) => `${byId(g, c.id).name}이(가) 눈이 퉁퉁 부은 채 찾아왔다. "우리 집... 빚 때문에 왕도로 간대. 외삼촌네 일을 거들어야 한대." 다음 달이면 떠난다.`,
    choices: [
      { label: '모아 둔 돈을 내민다', show: (g) => money(g) >= 8, run: (g, rng, c) => { spend(g, 8); const p = byId(g, c.id); like(p, 25); if (rng.chance(0.5)) { endChain(g, 'friend', 'stayed'); note(g, p, `${g.player.name}의 도움으로 집안이 마을에 남을 수 있었다.`); return `턱없이 모자란 돈이었다. 그런데 그 집 아버지가 그 동전을 보고 울었다. 마을 사람들이 조금씩 보탰고, 빚을 넘겼다. ${p.name}은(는) 떠나지 않았다.`; } p.away = true; note(g, p, '빚 때문에 가족과 왕도로 떠났다.'); startChain(g, 'friend', 1, 8, { id: c.id }); return `돈은 모자랐다. ${p.name}은(는) 떠나는 날 동전을 돌려주려 했지만, 받지 않았다. "왕도에서 써."`; } },
      { label: '작별 선물을 만든다', run: (g, rng, c) => { const p = byId(g, c.id); like(p, 15); p.away = true; note(g, p, '빚 때문에 가족과 왕도로 떠났다.'); startChain(g, 'friend', 1, 8, { id: c.id }); gainStat(g, 'agi', 0.3); return `나무를 깎아 작은 새를 만들었다. ${p.name}은(는) 그걸 목에 걸고 마차에 올랐다. 마차가 언덕을 넘을 때까지 손을 흔들었다.`; } },
      { label: '"가지 마."', run: (g, rng, c) => { const p = byId(g, c.id); like(p, 5); p.away = true; note(g, p, '빚 때문에 가족과 왕도로 떠났다.'); startChain(g, 'friend', 1, 8, { id: c.id }); stress(g, 15); return '소용없는 말이란 걸 둘 다 알았다. 떠나는 날, 일부러 배웅하러 가지 않았다. 그게 오래 후회로 남았다.'; } },
    ],
  },
  {
    id: 'chain_friend_letter', weight: 92, cooldown: 0,
    cond: (g) => chainAt(g, 'friend', 1),
    title: '왕도에서 온 편지',
    text: (g) => { const p = byId(g, C(g, 'friend').id); return `${nm(p)}에게서 편지가 왔다. 글씨를 배웠나 보다. "왕도는 커. 그리고 더러워. 외삼촌 가게는 망했고, 지금은 성 밖에서 '장갑' 아저씨들 심부름을 해. 돈은 잘 줘. 걱정 마." 걱정하지 않을 수가 없는 편지다.`; },
    choices: [
      { label: '"돌아와. 여기서 같이 살자."', show: (g) => skill(g, 'letters') >= 10, run: (g) => { const p = byId(g, C(g, 'friend').id); endChain(g, 'friend', 'wrote_back'); like(p, 10); gainSkill(g, 'letters', 1.0, 'int'); if (p && p.alive) setFlag(g, 'friend_in_capital', p.id); return '답장을 썼다. 답은 오지 않았다. 하지만 언젠가 왕도에 가게 된다면, 찾아야 할 사람이 생겼다.'; } },
      { label: '편지를 간직한다', run: (g) => { const p = byId(g, C(g, 'friend').id); endChain(g, 'friend', 'kept'); if (p && p.alive) setFlag(g, 'friend_in_capital', p.id); stress(g, 8); return '편지를 접어 상자에 넣었다. 검은 장갑. 그 이름이 자꾸 눈에 걸렸다.'; } },
    ],
  },

  // ======================================================================
  // 8. 헛간의 검사 (3단계)
  // ======================================================================
  {
    id: 'chain_swordsman_start', once: true,
    cond: (g) => age(g) >= 10 && age(g) <= 16 && free(g),
    chance: () => 0.012, weight: 60,
    title: '헛간의 나그네',
    text: () => '비 오는 밤, 헛간에 낯선 남자가 묵어 가도 되냐고 물었다. 서른 남짓, 말수가 적고 왼손 손등에 지워진 문신 자국이 있다. 다음 날 새벽, 그가 마당에서 나뭇가지 하나로 빗방울을 베는 것을 보았다. 빗방울이 정확히 둘로 갈라졌다.',
    choices: [
      { label: '가르쳐 달라고 조른다', run: (g) => { startChain(g, 'swordsman', 1, 2, {}); gainSkill(g, 'sword', 2.0, 'agi'); return '남자는 처음엔 무시했다. 사흘을 따라다니자 나뭇가지 하나를 던져 주었다. "장작값은 해야지. 한 달만이다."'; } },
      { label: '부모에게 알린다', run: (g) => { endChain(g, 'swordsman', 'reported'); return '아버지가 헛간에 갔을 때 남자는 이미 떠난 뒤였다. 짚단 위에 은화 한 닢이 놓여 있었다.'; } },
    ],
  },
  {
    id: 'chain_swordsman_training', weight: 92, cooldown: 0,
    cond: (g) => chainAt(g, 'swordsman', 1),
    title: '빗속의 수련',
    text: () => '한 달이 두 달이 되었다. 그의 검은 어느 유파와도 달랐다. 유수류처럼 흘리다가, 강검류처럼 내리치고, 환영류처럼 사라진다. 어느 날 술에 취한 그가 중얼거렸다. "검성이라는 것도 별거 아니다. 지킬 것을 못 지키면."',
    choices: [
      { label: '그의 과거를 묻는다', run: (g) => { gainSkill(g, 'sword', 3.0, 'agi'); gainStat(g, 'int', 0.4); nextStep(g, 'swordsman', 2, 1, { asked: true }); return '"레오니아 기사단에 있었다. 지키라던 사람이 있었지." 그는 손등의 문신 자국을 문질렀다. "지키지 못했다." 그 이상은 말하지 않았다.'; } },
      { label: '묵묵히 검만 배운다', run: (g) => { gainSkill(g, 'sword', 4.0, 'agi'); gainStat(g, 'agi', 1.0); tire(g, 20); nextStep(g, 'swordsman', 2, 1, {}); return '손바닥이 터지고 아물기를 반복했다. 어느 새벽, 처음으로 빗방울 하나를 갈랐다. 그가 처음으로 웃었다.'; } },
    ],
  },
  {
    id: 'chain_swordsman_hunters', weight: 92, cooldown: 0,
    cond: (g) => chainAt(g, 'swordsman', 2),
    title: '쫓는 자들',
    text: () => '갑옷 입은 기사 다섯이 마을에 들이닥쳤다. 왕도 근위대의 문장이다. "왕실 반역자, 전 근위기사 카스파르를 찾는다. 숨기는 자도 같은 죄다." 그들이 내미는 수배서의 얼굴은, 헛간의 그 남자였다.',
    choices: [
      { label: '숲길로 도망치게 돕는다', run: (g, rng) => { endChain(g, 'swordsman', 'helped'); setFlag(g, 'kaspar_debt'); if (check(rng, stat(g, 'sen') + stat(g, 'agi'), 35)) { gainSkill(g, 'sword', 2.0, 'agi'); return '사냥꾼 길로 그를 안내했다. 헤어지며 그가 자기 검을 내밀었다. "언젠가 진실을 알게 되면, 이 검을 들고 왕도에 와라. 국왕 폐하는 병이 아니다." 그는 숲으로 사라졌다.'; } injure(g, '근위기사에게 맞은 등', 2); stress(g, 20); setFlag(g, 'crown_suspect'); return '근위기사들에게 들켰다. 그는 도망쳤지만 나는 붙잡혀 심문을 받았다. 어린아이라 풀려났지만, 내 이름이 근위대 장부에 올랐다.'; } },
      { label: '수배서 앞에서 침묵한다', run: (g) => { endChain(g, 'swordsman', 'silent'); gainStat(g, 'wil', 0.6); return '아무 말도 하지 않았다. 그날 밤 헛간은 비어 있었다. 짚단 위에, 나뭇가지 하나가 둘로 갈라진 채 놓여 있었다.'; } },
      { label: '기사들에게 알린다', run: (g) => { endChain(g, 'swordsman', 'betrayed'); g.player.money += 20; stress(g, 20); setFlag(g, 'betrayed_kaspar'); return '근위기사들이 헛간을 포위했다. 그는 저항하지 않았다. 끌려가며 나를 보았다. 원망이 아니었다. 어쩐지 안쓰러워하는 눈이었다. 포상금 은화 스물은, 끝내 쓰지 못했다.'; } },
    ],
  },

  // ======================================================================
  // 9. 용사 의식의 약속 (hero_rite_scouts에서 "가고 싶어요"를 고른 경우)
  // ======================================================================
  {
    id: 'chain_rite_collect', once: true,
    cond: (g) => age(g) >= 15 && flag(g, 'hero_rite_volunteer'),
    weight: 91,
    title: '약속의 날',
    text: () => '성광국 사절이 약속대로 돌아왔다. 흰 마차, 금빛 태양 문장. 그런데 마차 안에는 이미 다른 아이들이 타고 있다. 하나같이 초점 없는 눈이다. 사절이 웃으며 손을 내민다. "성광께서 너를 기다리신다."',
    choices: [
      { label: '마차에 오른다', run: (g, rng) => { setFlag(g, 'rite_truth'); stress(g, 30); if (check(rng, stat(g, 'wil') + stat(g, 'sen'), 40)) { gainStat(g, 'wil', 2.0); setFlag(g, 'hunted_by_church'); return '이틀째 밤, 사절들이 나누는 말을 들었다. "의식에는 열두 아이의 생명력이 든다. 살아남는 건 하나." 그날 밤 마차 문을 부수고 뛰어내렸다. 숲을 사흘 동안 걸어 집에 돌아왔다. 성광국은 이 일을 잊지 않을 것이다.'; } injure(g, '성흔대의 낙인', 6); setFlag(g, 'rite_survivor'); gainStat(g, 'wil', 2.5); gainStat(g, 'str', 1.5); return '의식은 기억나지 않는다. 깨어났을 때 나는 솔라리스 성벽 밖 쓰레기 더미 위에 있었다. 가슴에 태양 모양 낙인이 찍혀 있었다. "실패작"이라는 말이 귓가에 남아 있었다. 몸 안에서 무언가 낯선 힘이 꿈틀거린다.'; } },
      { label: '"마음이 바뀌었습니다."', run: (g, rng) => { setFlag(g, 'hunted_by_church'); if (check(rng, stat(g, 'cha') + stat(g, 'wil'), 40)) return '사절의 미소가 얼어붙었다. "성광의 부름을 거역하는구나." 그는 마차에 올랐다. 그 뒤로 성광교 사제들이 나를 보는 눈이 달라졌다.'; injure(g, '성흔대원에게 맞은 상처', 2); stress(g, 20); return '호위하던 성흔대원이 칼집으로 나를 내리쳤다. 마을 사람들이 몰려나오자 그제야 그들은 떠났다. "약속을 어긴 자는 성광께서 기억하신다."'; } },
    ],
  },
);
