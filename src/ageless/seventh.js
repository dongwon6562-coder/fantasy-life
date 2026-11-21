// 27단계 불로, 대가 없는 길: 일곱째 서클. (도우미스레드3)
// 일곱째 원을 그린 마법사는 몸의 세월이 멈춘다. 노아가 오백 년을 사는 진짜 이유다. 대가는 없다. 다만 거의 아무도 닿지 못한다.
// 조건(게임은 알려 주지 않는다. 옛 기록과 사람에게서 조각으로): 마나가 짙은 해에 태어남 + 6서클 + 노아의 시험.
// 시험은 한 삶에 한 번. 세 고비(멈춘 물, 일곱째 원, 흐름을 놓기) 가운데 하나라도 넘지 못하면 그 삶에서는 끝이다.
//   pathState(g,'seventh') = { clues[], tried, failed, stage(0~3), passed }
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { me, circleOf, gainSkill } from '../game.js';
import { ageYears } from '../npc.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, stress } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { registerAgelessPath, makeAgeless, pathState, isAgeless } from './core.js';

export const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
// 다른 마법 쪽 불로 갈래가 같이 쓴다
export const freeAge = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.bondage?.slave && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
export const birthYear = (g) => g.date.year - ageYears(me(g));
export const birthTide = (g) => g.mana?.years?.[birthYear(g)] ?? null;
const st = (g, k) => g.player.stats[k] ?? 0;
const SV = (g) => { const s = pathState(g, 'seventh'); s.clues ??= []; s.stage ??= 0; return s; };

registerAgelessPath('seventh', {
  name: '일곱째 서클', kind: 'free', owner: '도우미스레드3',
  blurb: '일곱째 원을 그렸다. 몸이 흐르기를 멈췄다. 노아 말고는 아무도 닿지 못한 자리다.',
});

// 노아의 시험이 찾아올 만한 형편: 6서클, 짙은 해에 태어남, 아직 시험받지 않음
export const seventhReady = (g) => !!g.player.manaAwakened && circleOf(g) >= 6 && (birthTide(g) ?? -99) >= 25 && !isAgeless(me(g)) && !SV(g).tried;

/* ---------- 조각: 옛 기록과 사람에게서 ---------- */
const CLUES = {
  year: '노아가 태어난 해는 "푸른 해"였다고 한다. 우물물이 밤에 빛나고, 마력을 타고난 아이가 한 마을에 셋씩 났다는 해. 그해에 난 아이만 일곱째 원의 문턱에 선다는 말이 있다.',
  six: '일곱째 원은 여섯째 원 위에 그린다. 여섯 원을 다 돌리지 못하는 사람은 일곱째 원이 있다는 것조차 느끼지 못한다.',
  test: '노아는 여섯째 원에 닿은 사람을 한 번은 찾아간다고 한다. 꿈인지 생시인지 모를 밤에. 그 밤을 넘긴 사람은 기록에 없다.',
};
const CLUE_IDS = Object.keys(CLUES);
EVENTS.push({
  id: 'seventh_clue', cooldown: 48, weight: 2,
  chance: () => 0.2,
  cond: (g) => freeAge(g) && !!g.player.manaAwakened && circleOf(g) >= 4 && ['serenia', 'harfen', 'leocast'].includes(L(g).place) && SV(g).clues.length < CLUE_IDS.length && !isAgeless(me(g)),
  prepare: (g) => ({ id: CLUE_IDS.find((c) => !SV(g).clues.includes(c)) }),
  title: '서고 맨 안쪽',
  text: () => '먼지 쌓인 서가 끝에서 늙은 사서가 등불을 들고 섰다. "일곱째 원을 찾는 얼굴이군. 다들 그 얼굴로 왔다가 그 얼굴로 늙어 죽었소." 그는 낡은 필사본 한 권을 서가에서 빼냈다.',
  choices: [
    { label: '고개를 젓고 나간다', run: () => '등 뒤에서 사서가 혀를 찼다. 서고 문이 닫혔다.' },
    { label: '필사본을 펼친다', run: (g, rng, c) => { const s = SV(g); if (!s.clues.includes(c.id)) s.clues.push(c.id); gainSkill(g, 'magic', 1, 'int'); return `글씨는 반쯤 지워져 있었다. 읽을 수 있는 것은 이것뿐이었다. ${CLUES[c.id]}`; } },
  ],
});

/* ---------- 노아의 시험: 한 삶에 한 번 ---------- */
EVENTS.push({
  id: 'seventh_call', cooldown: 12, weight: 30,
  chance: (g) => (g.flags?.noah_word ? 0.2 : 0.1),
  cond: (g) => freeAge(g) && seventhReady(g) && !sceneQueued(g, 'seventh_trial'),
  title: '서리 낀 밤',
  text: () => '한여름 밤, 창틀에 서리가 끼었다. 등불이 흔들리지 않고 멎었다. 방 안에 누가 있다. 얼굴은 그늘에 있고, 목소리만 들린다. "여섯째 원까지 왔군. 하나 더 그릴 생각이 있나. 그리지 못하면 여섯 원 가운데 몇 개를 잃을 수도 있네."',
  choices: [
    { label: '"아직은 아닙니다."', run: () => '그림자가 고개를 끄덕였다. 서리가 녹았다. 다시 올지는 모른다.' },
    { label: '"그리겠습니다."', run: (g) => { const s = SV(g); s.tried = true; s.stage = 1; queueScene(g, 'seventh_trial', { stage: 1 }, { first: true }); return '그림자가 손을 들었다. 방이 넓어졌다. 벽이 멀어지고, 바닥에 원 여섯이 저절로 빛났다.'; } },
  ],
});

const TRIAL = {
  1: { title: '멈춘 물', text: '"마력을 흐르게 두지 말고 멈춰 보게. 강물을 손바닥 위에서 세우듯이." 원 여섯을 도는 마력이 거칠게 요동친다. 멈추면 숨이 막히고, 놓치면 원이 깨진다.' },
  2: { title: '일곱째 원', text: '"이제 그 위에 하나를." 여섯째 원 바깥에 아무것도 없는 자리가 있다. 거기에 원을 그리려면 지금 가진 마력 전부를 한 점에 모아야 한다. 노아는 돕지 않는다.' },
  3: { title: '흐름을 놓기', text: '일곱째 원이 돈다. 몸 안에서 무언가 멎기 시작했다. 심장은 뛰는데, 세월이 뛰지 않는다. "놓으면 자네는 멈추네. 자네가 아는 사람들은 계속 흐르고. 나는 그 차이를 오백 년 보았네."' },
};
defineScene('seventh_trial', {
  title: (g, s) => `노아의 시험: ${TRIAL[s.stage]?.title ?? ''}`,
  text: (g, s) => TRIAL[s.stage]?.text ?? '',
  choices: (g, s) => {
    const v = SV(g);
    if (g.over || isAgeless(me(g)) || v.failed || v.stage !== s.stage || circleOf(g) < 6) return [];
    if (s.stage === 1) return [{ label: '마력을 붙든다', key: 'hold' }, { label: '원을 풀고 물러선다', key: 'quit' }];
    if (s.stage === 2) return [{ label: '한 점에 모은다', key: 'draw' }, { label: '원을 풀고 물러선다', key: 'quit' }];
    return [{ label: '흐름을 놓는다', key: 'let' }, { label: '"놓지 못하겠습니다."', key: 'keep' }];
  },
  resolve(g, rng, s, key) {
    const v = SV(g), p = g.player;
    if (v.stage !== s.stage || isAgeless(me(g))) return '방은 다시 좁아져 있었다. 등불이 흔들렸다.';
    if (key === 'quit' || key === 'keep') {
      v.failed = true; v.stage = 0; stress(g, 10);
      return key === 'keep' ? '"그것도 답이네." 노아의 목소리가 멀어졌다. 일곱째 원이 흩어지고, 세월이 다시 흘렀다. 그 밤 이후로 그는 오지 않았다.' : '원을 풀었다. 노아는 아무 말도 하지 않았다. 아침에 깨어 보니 머리맡이 젖어 있었다. 그 밤은 다시 오지 않는다.';
    }
    if (s.stage === 1) {
      const val = (p.skills.magic ?? 0) + st(g, 'wil') * 0.8 + rng.int(-15, 15);
      if (val >= 150) { v.stage = 2; queueScene(g, 'seventh_trial', { stage: 2 }, { first: true }); return '요동치던 마력이 손바닥 위의 물처럼 멎었다. 숨이 끊어질 것 같다. 노아가 처음으로 고개를 끄덕였다.'; }
      return fail(g, '마력이 손가락 사이로 빠져나갔다. 여섯째 원에 금이 갔다.');
    }
    if (s.stage === 2) {
      const val = (p.mana ?? 0) / 8 + (p.skills.magic ?? 0) + st(g, 'int') / 2 + rng.int(-15, 15);
      if (val >= 178) { v.stage = 3; queueScene(g, 'seventh_trial', { stage: 3 }, { first: true }); return '한 점에 모은 마력이 터지지 않고 둥글게 펴졌다. 일곱째 원이 그려졌다. 원이 돌 때마다 귀에서 아주 먼 물소리가 난다.'; }
      return fail(g, '한 점에 모은 마력이 안에서 터졌다. 원 여섯이 한꺼번에 흔들렸다.');
    }
    // 흐름을 놓는다: 일곱째 서클
    v.passed = true; v.stage = 0;
    p.mana = Math.max(p.mana ?? 0, 540); p.skills.magic = Math.max(p.skills.magic ?? 0, 93);
    makeAgeless(g, 'seventh', { note: `${J(p.name, '이/가')} 일곱째 원을 그렸다. 몸이 ${ageYears(me(g))}살에서 멈췄다.` });
    note(g, '일곱째 서클에 닿았다. 몸의 세월이 멎었다.');
    chron(g, `${J(p.name, '이/가')} 노아 이후 처음으로 일곱째 원을 그렸다는 말이 마탑에 돈다.`, 100);
    L(g).renown = (L(g).renown ?? 0) + 25;
    return '흐름을 놓았다. 심장은 여전히 뛴다. 그런데 손등의 주름이 어제와 같다. 내일도 같을 것이다. 노아가 말했다. "축하는 하지 않겠네. 열 해 뒤에 다시 물어보게, 잘한 일이었는지."';
  },
});
function fail(g, text) {
  const v = SV(g), p = g.player;
  v.failed = true; v.stage = 0;
  p.mana = Math.max(0, (p.mana ?? 0) * 0.75);
  injure(g, '마력이 거꾸로 돈 상처', 3);
  stress(g, 15);
  note(g, '노아의 시험을 넘지 못했다.');
  return `${text} 정신을 차렸을 때 방은 다시 좁았고, 마력이 한 줌 빠져나가 있었다. 노아는 없었다. 그 밤은 한 삶에 한 번뿐이다.`;
}

// 화면용: 이 길에서 내가 아는 것
export function seventhInfo(g) {
  const v = SV(g);
  return { clues: v.clues.map((c) => CLUES[c]), tried: !!v.tried, failed: !!v.failed, passed: !!v.passed };
}
