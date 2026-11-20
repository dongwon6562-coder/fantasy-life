// 세 살 무렵 할 일 (19단계 헤드): 세 살 한 해는 고를 것이 '뛰어놀기'와 '쉬기' 둘뿐이었다.
// 부모 따라다니기, 이야기 조르기, 흙장난을 더해 걸음마 뗀 아이의 하루를 고를 수 있게 한다. 3~5살.
import { ACTIONS } from '../actions.js';
import { playerAge, gainStat, gainSkill } from '../game.js';
import { JOBS, SKILLS } from '../data.js';
import { stress, tire, father, mother } from '../events/core.js';
import { up, gains, join, J } from '../narrative/text.js';

const small = (g) => playerAge(g) >= 3 && playerAge(g) < 6;
// 기술 이름은 SKILLS에서 (다른 갈래가 더한 기술도 있다: 뱃일·고기잡이 등)
const skillName = (id) => SKILLS.find((s) => s.id === id)?.name ?? null;
// 일하는 부모 쪽을 따라간다. 둘 다 기술 없는 일이면 그냥 곁에 붙어 있는다.
function guide(g) {
  const ps = [father(g), mother(g)].filter((p) => p?.alive && !p.away && p.job !== 'child');
  return ps.find((p) => JOBS[p.job]?.skill) ?? ps[0] ?? null;
}

ACTIONS.push({
  id: 'tag_along',
  name: '부모 따라다니기',
  desc: '엄마나 아빠의 치맛자락, 바짓가랑이를 붙잡고 일터까지 따라간다. 어른들이 하는 일을 어깨너머로 본다.',
  available: (g) => small(g) && !!guide(g),
  run(g, rng) {
    tire(g, 5); stress(g, -6);
    const p = guide(g);
    const sk = JOBS[p.job]?.skill;
    const t = sk && skillName(sk) && g.player.skills[sk] != null ? gainSkill(g, sk, 0.35, 'sen') : 0;
    const s = gainStat(g, 'sen', 0.4);
    const who = p.sex === 'f' ? '엄마' : '아빠';
    const job = JOBS[p.job]?.name ?? '일';
    const line = rng.pick([
      `${who}를 따라 일터에 갔다. ${who}가 ${job} 일을 하는 동안 옆에 쪼그려 앉아 손놀림을 지켜보았다. 똑같이 흉내 내다 혼이 났다.`,
      `${who} 등에 업혀 나갔다가 내려 달라고 졸랐다. 하루 종일 ${who} 발치를 맴돌았다. 어른들이 "제 ${who} 판박이네" 하고 웃었다.`,
      `${who}가 일하다 말고 내 손에 연장을 쥐여 주었다. 너무 무거워 두 손으로 들었다. ${who}가 손등을 감싸 함께 움직여 주었다.`,
      `${who}를 따라갔다가 처음 보는 어른들 틈에서 낯을 가렸다. 그래도 해 질 무렵엔 그 사람들 이름을 하나씩 따라 불렀다.`,
    ]);
    return join(line, gains(sk && skillName(sk) ? up(skillName(sk), t) : null, up('감각', s)));
  },
});

ACTIONS.push({
  id: 'beg_story',
  name: '이야기 조르기',
  desc: '잠들기 전, 일하는 틈에, 아무 때나 "그다음엔?" 하고 매달린다. 말과 머리가 자란다.',
  available: (g) => small(g),
  run(g, rng) {
    tire(g, 2); stress(g, -8);
    const i = gainStat(g, 'int', 0.45), c = gainStat(g, 'cha', 0.2);
    const l = playerAge(g) >= 4 ? gainSkill(g, 'letters', 0.15, 'int') : 0;
    const teller = rng.pick([mother(g), father(g)].filter((p) => p?.alive && !p.away));
    const who = teller ? (teller.sex === 'f' ? '엄마' : '아빠') : '옆집 할머니';
    const line = rng.pick([
      `${who}가 용사와 마신 이야기를 해 주었다. 마신이 봉인되는 대목에서 이불을 머리끝까지 뒤집어썼다. 그래도 끝까지 들었다.`,
      `${J(who, '이/가')} 같은 이야기를 열 번째 해 주다가 졸았다. 내가 다음 대목을 먼저 말해 버렸다.`,
      `"왜 하늘은 파래?" "왜 비가 와?" "왜 할아버지는 안 와?" ${who}가 한참 말이 없다가 머리를 쓰다듬었다.`,
      `${who}가 숲속 엘프 이야기를 지어내 주었다. 다음 날 그 이야기를 동네 아이들에게 그대로 옮겼다. 조금 더 무섭게.`,
    ]);
    return join(line, gains(up('지능', i), up('매력', c), up('글과 학문', l)));
  },
});

ACTIONS.push({
  id: 'mud_play',
  name: '흙장난',
  desc: '마당 구석에서 흙을 이기고, 돌을 쌓고, 막대기로 성을 짓는다. 손이 야무지고 고집이 생긴다.',
  available: (g) => small(g),
  run(g, rng) {
    tire(g, 4); stress(g, -10);
    const a = gainStat(g, 'agi', 0.35), w = gainStat(g, 'wil', 0.35);
    const line = rng.pick([
      '흙으로 성을 쌓았다. 세 번 무너졌다. 네 번째엔 막대기로 기둥을 박았다. 해 질 때까지 서 있었다.',
      '빗물 고인 웅덩이에 나뭇잎 배를 띄웠다. 개미 한 마리를 태웠다. 개미는 무사히 건넜다.',
      '돌멩이를 크기대로 줄 세웠다. 누가 하나라도 건드리면 처음부터 다시 했다.',
      '진흙으로 강아지를 빚었다. 다리가 자꾸 떨어졌다. 다리 없는 강아지를 볕에 말려 머리맡에 두었다.',
      '옷을 흙투성이로 만들어 혼이 났다. 다음 날도 같은 자리에 쪼그려 앉았다.',
    ]);
    return join(line, gains(up('민첩', a), up('의지', w)));
  },
});

// 갓난아기 때 작은 일들: 0~2살은 한 해에 사건이 한두 개뿐이고 늘 같은 것(첫걸음, 첫 말)만 떴다. 한 번씩만.
import { EVENTS } from '../events/core.js';
import { playerAgeMonths } from '../game.js';
const baby = (lo, hi) => (g) => playerAgeMonths(g) >= lo && playerAgeMonths(g) <= hi;
EVENTS.push(
  {
    id: 'baby_tooth', once: true, weight: 30, chance: () => 0.35,
    cond: baby(6, 14),
    title: '첫 이',
    text: () => '잇몸이 근질거려 밤새 울었다. 아침에 보니 아랫니 하나가 하얗게 솟아 있었다.',
    choices: [
      { label: '아무거나 물어뜯는다', run: (g) => { gainStat(g, 'wil', 0.3); return '엄마 손가락, 숟가락, 아빠 신발 끈. 손에 닿는 건 다 물었다. 집안이 침 범벅이 되었다.'; } },
      { label: '안겨서 칭얼댄다', run: (g) => { const m = mother(g); if (m) m.affection += 4; return '사흘 밤을 엄마 품에서 보냈다. 엄마 눈 밑이 거뭇해졌다.'; } },
    ],
  },
  {
    id: 'baby_stranger', once: true, weight: 30, chance: () => 0.3,
    cond: baby(8, 20),
    title: '낯가림',
    text: () => '이웃 아낙이 나를 안아 보겠다고 손을 뻗었다. 그 얼굴이 갑자기 무서워졌다.',
    choices: [
      { label: '자지러지게 운다', run: (g) => { gainStat(g, 'sen', 0.3); return '아낙은 머쓱하게 웃으며 손을 거두었다. "엄마밖에 모르는구나."'; } },
      { label: '빤히 쳐다본다', run: (g) => { gainStat(g, 'wil', 0.3); return '울지도 웃지도 않고 아낙을 끝까지 쳐다보았다. 아낙이 먼저 눈을 피했다. "고놈 참 당돌하네."'; } },
      { label: '방긋 웃는다', run: (g) => { gainStat(g, 'cha', 0.4); return '아낙이 나를 번쩍 들어 올렸다. 그날 저녁 동네에 "그 집 애기가 사람을 잘 따른다"는 말이 돌았다.'; } },
    ],
  },
  {
    id: 'baby_fall', once: true, weight: 30, chance: () => 0.3,
    cond: baby(22, 40),
    title: '혹',
    text: () => '탁자 밑을 기어 다니다 일어서려는데 머리를 쿵 박았다. 이마에 밤톨만 한 혹이 솟았다.',
    choices: [
      { label: '울음을 꾹 참는다', run: (g) => { gainStat(g, 'wil', 0.4); return '입술을 삐죽거리다 끝내 울지 않았다. 아빠가 "장군감이다" 하고 웃었다.'; } },
      { label: '탁자를 때린다', run: (g) => { gainStat(g, 'str', 0.3); return '"떼끼, 탁자 나빠!" 엄마가 탁자를 때려 주자 그제야 울음을 그쳤다.'; } },
      { label: '다시 기어 들어간다', run: (g) => { gainStat(g, 'agi', 0.3); return '혹을 단 채로 탁자 밑으로 다시 기어 들어갔다. 이번엔 고개를 숙이고 나왔다.'; } },
    ],
  },
);
