// 마법에 얽힌 사건.
import { gainStat, gainSkill, circleOf } from '../game.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, flag, setFlag, age, stat, skill, money, spend, stress, like, injure, nm, byId, living, peers, findJob, isFamily } from '../events/core.js';
import { kill } from '../npc.js';
import { remember } from '../relations.js';
import { startDuel } from '../duel/duel.js';
import { registerDuelEnd } from '../duel/registry.js';
import { magicState, knows, knownSpells } from './spells.js';
import { EXAM_MAX } from './exam.js';

const here = (g) => g.life?.place ?? 'ern';
const healer = (g) => knownSpells(g).find((s) => s.use === 'heal');

EVENTS.push(
  {
    id: 'magic_misfire', cooldown: 36,
    cond: (g) => circleOf(g) >= 1 && age(g) >= 8,
    chance: (g) => 0.02 + Math.max(0, 40 - stat(g, 'wil')) * 0.0008, weight: 50,
    title: '폭주',
    text: () => '밤에 혼자 술식을 연습하던 중, 마력이 원을 벗어나 손끝에서 튀어 나갔다. 커튼에 불이 붙었다. 연기가 방을 채운다.',
    choices: [
      { label: '마력을 거둬들인다', run: (g, rng) => { if (rng.chance(0.4 + stat(g, 'wil') / 150)) { gainSkill(g, 'magic', 1.5, 'wil'); gainStat(g, 'wil', 0.6); return '이를 악물고 흩어진 마력을 손바닥으로 되감았다. 불이 꺼졌다. 손이 덜덜 떨렸지만, 무언가를 하나 배웠다.'; } injure(g, '마력에 덴 손바닥', 2); return '되감으려던 마력이 손바닥을 태웠다. 불은 물동이로 껐다.'; } },
      { label: '물동이를 들고 뛴다', run: (g) => { g.player.familyMoney = Math.max(0, g.player.familyMoney - 3); stress(g, 8); return '불은 껐지만 커튼과 이불이 다 탔다. 다음 날 아침 식탁이 조용했다.'; } },
    ],
  },
  {
    id: 'magic_heal_plea', cooldown: 24,
    cond: (g) => age(g) >= 12 && !!healer(g),
    chance: () => 0.05, weight: 55,
    prepare: (g, rng) => { const c = living(g).filter((p) => !p.isPlayer && !isFamily(g, p) && p.ageMonths < 10 * 12 && (p.place ?? 'ern') === here(g)); return { id: c.length ? rng.pick(c).id : null }; },
    title: '문 두드리는 어머니',
    text: (g, c) => { const p = byId(g, c.id); return `한밤중에 누가 문을 두드렸다. ${p ? `${p.name}의 어머니` : '모르는 여인'}다. "마법을 쓸 줄 안다고 들었어요. 아이가 숨을 제대로 못 쉬어요. 약초사는 하르펜에 갔고..." 손에 동화 몇 닢을 꼭 쥐고 있다.`; },
    choices: [
      { label: '바로 따라간다', run: (g, rng, c) => { const p = byId(g, c.id); const best = knows(g, 'cure') || knows(g, 'greatheal'); g.player.fatigue = Math.min(100, g.player.fatigue + 15); gainSkill(g, 'magic', 1.2, 'wil'); if (best || rng.chance(0.65)) { if (p) { like(p, 15); remember(g, p, '숨이 막혀 죽어 갈 때 마법으로 살려 주었다', 1, { tag: 'healed' }); } setFlag(g, 'kindness', (flag(g, 'kindness') ?? 0) + 1); return '아이의 가슴에 손을 얹고 밤새 마력을 흘려 넣었다. 새벽녘, 아이가 크게 숨을 들이쉬고 울음을 터뜨렸다. 그 어머니는 동화를 끝내 받으라고 했다.'; } if (p && rng.chance(0.4)) { kill(g, p, '숨병'); stress(g, 30); return '할 수 있는 것을 다 했다. 내 서클로는 모자랐다. 새벽에 아이의 숨이 멎었다. 어머니는 나를 원망하지 않았다. 그게 더 아팠다.'; } return '할 수 있는 것을 다 했다. 아이는 겨우 버텼다. 하르펜에서 약초사가 돌아온 뒤에야 위기를 넘겼다.'; } },
      { label: '"제 서클로는 무리예요."', run: (g) => { stress(g, 12); return '문을 닫았다. 그 집 창문의 불빛은 밤새 꺼지지 않았다.'; } },
    ],
  },
  {
    id: 'magic_exam_notice', once: true,
    cond: (g) => circleOf(g) >= 1 && (g.magic?.certified ?? 0) === 0 && age(g) >= 12,
    chance: () => 0.08, weight: 45,
    title: '협회의 공고',
    text: () => '행상이 하르펜 마도사 협회 지부의 공고문 사본을 가져왔다. "서클 승급 시험. 매달 응시 가능. 2서클까지는 하르펜 지부에서, 그 위는 왕도에서. 5서클 이상은 마법도시 세레니아." 마을 마법사가 공고를 보며 코웃음을 쳤다. "종이 쪼가리 하나에 은화 열 닢이라니."',
    choices: [
      { label: '공고를 품에 넣는다', run: (g) => { setFlag(g, 'knows_exam'); gainStat(g, 'wil', 0.3); return '언젠가 하르펜에 가면. 공인받은 마법사는 품삯도 대접도 다르다고 했다.'; } },
      { label: '"서클은 종이가 정하는 게 아니야."', run: () => '마법사가 처음으로 나를 보고 웃었다.' },
    ],
  },
  {
    id: 'magic_manastone_broker', cooldown: 48,
    cond: (g) => knows(g, 'infuse') && (g.realm?.era ?? 0) >= 1 && age(g) >= 15,
    chance: () => 0.04, weight: 45,
    title: '마석 거간꾼',
    text: () => '자유도시에서 왔다는 거간꾼이 찾아왔다. "빈 마석에 마력을 채워 주면 하나에 은화 하나. 백 개쯤 있소. 출처는 묻지 마시고." 자루 속 마석들 가운데 몇 개에 피가 말라붙어 있다.',
    choices: [
      { label: '채워 준다', run: (g, rng) => { g.player.money += 40; g.player.fatigue = Math.min(100, g.player.fatigue + 30); gainSkill(g, 'magic', 1.5, 'wil'); setFlag(g, 'dirty_manastones'); return '사흘 밤낮으로 마력을 쏟았다. 은화 마흔 닢. 거간꾼은 웃으며 떠났다. 그 마석들이 어디서 왔는지는 생각하지 않기로 했다.'; } },
      { label: '피 묻은 것을 묻는다', run: (g) => { gainStat(g, 'sen', 0.5); setFlag(g, 'knows_stone_poachers'); return '"미궁에서 죽은 모험가 것도 있고, 뭐... 다른 것도 있지." 거간꾼은 자루를 들고 일어섰다. "다른 데 알아보지요."'; } },
      { label: '거절한다', run: () => '거간꾼은 어깨를 으쓱했다.' },
    ],
  },
  {
    id: 'magic_forbidden_copy', once: true,
    cond: (g) => circleOf(g) >= 3 && age(g) >= 16,
    chance: () => 0.02, weight: 55,
    title: '금지 서고의 사본',
    text: () => '회색 로브의 남자가 여관 구석에서 손짓한다. 탁자 위에 낡은 사본 한 권. "세레니아 금지 서고에서 나온 거요. 시공 마법의 첫 장. 노아 님 이후로 아무도 끝까지 읽지 못했다는." 값은 은화 백 닢. 이단심문소가 알면 화형이다.',
    choices: [
      { label: '산다', show: (g) => money(g) >= 100, run: (g) => { spend(g, 100); setFlag(g, 'time_magic_fragment'); gainSkill(g, 'magic', 3, 'int'); g.player.mana += 5; return '밤마다 사본을 읽었다. 대부분은 이해할 수 없었다. 그런데 어느 밤, 촛불의 흔들림이 아주 잠깐 멈췄다. 정말로 멈췄다.'; } },
      { label: '정체를 묻는다', run: (g) => { gainStat(g, 'int', 0.5); setFlag(g, 'met_forbidden_dealer'); return '"세레니아 일곱 번째 탑." 남자는 그 말만 남기고 사본을 품에 넣었다. "마음이 바뀌면 그 이름을 대시오."'; } },
      { label: '이단심문소에 알린다', run: (g) => { g.player.money += 10; setFlag(g, 'reported_heretic_mage'); return '심문관들이 여관을 덮쳤을 때 남자는 사라진 뒤였다. 포상금 은화 열 닢과, 심문관의 수상쩍어하는 눈길이 남았다.'; } },
    ],
  },
  {
    id: 'magic_rival_examinee', once: true,
    cond: (g) => (g.magic?.certified ?? 0) >= 1 && age(g) >= 14 && here(g) !== 'ern',
    chance: () => 0.06, weight: 50,
    title: '귀족 마법사',
    text: (g) => `협회 지부 복도에서 은실로 수놓은 로브의 청년이 길을 막았다. 귀족가 자제, 세레니아 예비 학원 출신이라고 한다. "시골에서 독학한 ${g.magic.certified}서클이라던데. 진짜 마법이 뭔지 보여 줄까?" 그의 손끝에서 불꽃이 춤춘다.`,
    choices: [
      { label: '마법 겨루기를 받는다', run: (g, rng) => { const c = Math.max(1, g.magic.certified); startDuel(g, rng, { kind: 'mage_rival', title: '마법 겨루기', mode: 'magic', foe: { name: '귀족 마법사', skill: 20 + c * 15, style: 'bold', circle: c }, ctx: {} }); return '복도 끝 수련실로 자리를 옮겼다. 구경꾼들이 문가에 몰렸다.'; } },
      { label: '"복도에서 마법은 금지일 텐데."', run: (g) => { gainStat(g, 'int', 0.4); return '청년의 얼굴이 굳었다. 지나가던 시험관이 헛기침을 했다. 그는 불꽃을 거두고 돌아섰다. "다음엔 수련실에서 보지."'; } },
    ],
  },
  {
    id: 'magic_serenia_letter', once: true,
    cond: (g) => (g.magic?.certified ?? 0) >= 4 && age(g) >= 18,
    chance: () => 0.1, weight: 70,
    title: '세레니아에서 온 편지',
    text: () => '일곱 개의 탑이 찍힌 봉인. 마도사 협회장 마그누스의 이름으로 된 편지다. "4서클 공인을 축하하오. 5서클 시험은 세레니아의 탑에서만 치르오. 목숨을 걸어야 하는 시험이지. 언젠가 탑에 오시오. 탑은 기다리오." 편지 끝에 작게 덧붙어 있다. "노아 님의 감시탑에 대해 묻고 싶은 것도 있소."',
    choices: [
      { label: '편지를 간직한다', run: (g) => { setFlag(g, 'serenia_invited'); gainStat(g, 'wil', 0.8); return '세레니아. 대륙의 마법이 모이는 곳. 이 나라 밖으로 가는 길을 처음으로 진지하게 생각했다.'; } },
      { label: '답장을 쓴다', run: (g) => { setFlag(g, 'serenia_invited'); setFlag(g, 'wrote_magnus'); gainSkill(g, 'letters', 1, 'int'); return '"언젠가 가겠습니다." 짧게 썼다. 답장이 다시 올지는 모르겠다.'; } },
    ],
  },
);

registerDuelEnd('mage_rival', (g, rng, won) => {
  if (g.life) g.life.renown = (g.life.renown ?? 0) + (won ? 3 : 0);
  if (won) { setFlag(g, 'beat_noble_mage'); return '청년의 결계가 산산이 부서졌다. 구경꾼들 사이에서 휘파람이 나왔다. 그는 아무 말 없이 로브를 여미고 나갔다. 귀족의 원한이 하나 늘었을지도 모른다.'; }
  stress(g, 10);
  return '청년이 손을 털며 웃었다. "독학의 한계지." 분했다. 하지만 그의 술식 몇 개는 똑똑히 보았다.';
});

// 시험 도중에 사건 창이 사라졌다면(불러오기 등) 시험은 무효
HOOKS.endOfMonth.push((g) => {
  const e = g.magic?.exam;
  if (e && e.stage > 0 && !['circle_exam_control', 'duel_round'].includes(g.pendingEvent?.id)) g.magic.exam = null;
});
