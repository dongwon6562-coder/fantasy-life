// 서클 승급 시험: 마도사 협회가 서클을 공인한다.
// - 하르펜 협회 지부: 2서클까지. 왕도 레오카스트(궁정 마법사가 시험관): 4서클까지.
// - 5서클 이상은 마법도시 세레니아의 탑에서만 공인한다 (아직 갈 수 없는 곳).
// - 실제 서클(circleOf)보다 높게는 응시할 수 없다. 공인은 한 단계씩.
// - 시험은 세 관문: 이론(문답) → 마력 제어 → 실전(시험관과의 마법 겨루기, 결투 모드).
// - 공인받으면 마법 일의 품삯과 이름값이 오르고, 3서클 이상은 마법사 등록법을 채운다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { playerAge, circleOf, gainSkill, gainStat } from '../game.js';
import { EVENTS, josa } from '../events/core.js';
import { placePerson } from '../places.js';
import { spend, canSpend } from '../adventure/core.js';
import { startDuel } from '../duel/duel.js';
import { registerDuelEnd } from '../duel/registry.js';
import { magicState } from './spells.js';

const here = (g) => g.life?.place ?? 'ern';
export const EXAM_MAX = { harfen: 2, leocast: 4 };
export const examFee = (n) => 10 * n * n;
const examiner = (g) => (here(g) === 'leocast' ? (placePerson(g, 'leocast', 'court_mage')?.name ?? '궁정 마법사') : '협회 지부 시험관 에델');

ACTIONS.push({
  id: 'circle_exam', name: '서클 승급 시험', icon: 'scroll', place: ['harfen', 'leocast'],
  desc: '마도사 협회의 승급 시험을 본다. 하르펜 지부는 2서클, 왕도는 4서클까지. 5서클 이상은 세레니아의 탑에서만 공인한다. 응시료가 든다.',
  available: (g) => {
    if (!g.player.manaAwakened || playerAge(g) < 12 || g.life?.travel) return false;
    const m = magicState(g);
    const n = m.certified + 1;
    return !m.exam && n <= circleOf(g) && n <= (EXAM_MAX[here(g)] ?? 0) && canSpend(g, examFee(n));
  },
  run(g) {
    const m = magicState(g);
    // 같은 달에 여러 칸을 골라도 응시료는 한 번만 낸다
    if (m.exam) return `${m.exam.target}서클 시험에는 이미 이름을 올려 두었다. 시험관이 부를 때까지 술식을 되짚었다.`;
    const n = m.certified + 1;
    spend(g, examFee(n));
    m.exam = { target: n, stage: 0, score: 0, place: here(g) };
    return `응시료 은화 ${examFee(n)}닢을 내고 ${n}서클 승급 시험에 이름을 올렸다.`;
  },
});

// 이론 문제: 설정 문서의 마법 체계에서
const QUESTIONS = [
  { q: '서클을 정하는 두 가지는 무엇인가?', a: ['마력의 양과 술식을 다루는 기술', '타고난 핏줄과 신앙', '나이와 수련한 햇수'] },
  { q: '대륙의 모든 나라에서 사형으로 다스리는 금기 마법이 아닌 것은?', a: ['결계술', '사령술', '마족 소환'] },
  { q: '무영창이란 무엇인가?', a: ['주문을 외지 않고 쓰는 기술. 서클과 별개다', '4서클 이상이면 저절로 되는 것', '마족만 쓰는 본능의 마법'] },
  { q: '3서클 이상 마법사가 협회에 등록하지 않으면?', a: ['떠돌이로 불리고, 죄를 지으면 협회가 직접 사냥한다', '아무 일도 없다', '서클을 빼앗긴다'] },
  { q: '같은 서클이라면 마족의 마법이 더 위험한 까닭은?', a: ['배우지 않고 본능으로 쓰기 때문이다', '마석을 먹기 때문이다', '서클이 둘씩 겹쳐 있기 때문이다'] },
  { q: '시공 마법은 지금 어떤 것인가?', a: ['전설 속에만 있다. 대마도사 노아가 마지막으로 썼다고 전한다', '세레니아 1학년이 배운다', '성광교 사제의 기도다'] },
  { q: '마력이 가장 빨리 자라는 때는?', a: ['열다섯 살 전. 그 뒤로는 느리게 자란다', '마흔 살 이후', '평생 똑같다'] },
];

EVENTS.push({
  id: 'circle_exam_run', once: true, noFlag: true, quiet: true, weight: 97,
  cond: (g) => g.magic?.exam?.stage === 0,
  prepare: (g, rng) => {
    const q = rng.pick(QUESTIONS);
    const order = [0, 1, 2].sort(() => rng.next() - 0.5);
    return { qi: QUESTIONS.indexOf(q), order };
  },
  title: '승급 시험: 이론',
  text: (g, c) => {
    const n = g.magic.exam.target;
    const q = QUESTIONS[c.qi];
    const hint = g.player.skills.letters >= 30 || g.player.stats.int >= 45 ? ' 책에서 읽은 기억이 어렴풋이 떠오른다.' : '';
    return `${g.magic.exam.place === 'leocast' ? '왕궁 서쪽 탑의 둥근 방' : '하르펜 협회 지부의 좁은 시험실'}. ${J(examiner(g), '이/가')} 깃펜을 들고 앉아 있다. "${n}서클 승급 시험을 시작한다. 첫째 관문, 이론."\n\n"${q.q}"${hint}`;
  },
  choices: [0, 1, 2].map((i) => ({
    label: (g, c) => QUESTIONS[c.qi].a[c.order[i]],
    run: (g, rng, c) => {
      const e = g.magic.exam;
      const right = c.order[i] === 0;
      if (right) e.score += 1;
      e.stage = 1;
      g.pendingEvent = controlStage(g);
      return right ? '시험관이 고개를 끄덕이고 무언가를 적었다.' : '시험관의 깃펜이 잠깐 멈췄다. 표정은 변하지 않았다.';
    },
  })),
});

function controlStage(g) {
  const n = g.magic.exam.target;
  return {
    id: 'circle_exam_control', title: '승급 시험: 마력 제어',
    text: `"둘째 관문." 시험관이 탁자 위에 유리 구슬 ${n + 2}개를 늘어놓았다. "구슬마다 정해진 양의 마력을 채워라. 모자라면 꺼지고, 넘치면 깨진다. 깨진 유리는 눈을 노린다."`,
    choices: ['하나씩 천천히, 정확하게', '한 번에 모두 채운다', '가장 적은 마력으로 아슬아슬하게'],
    choiceIdx: [0, 1, 2],
  };
}
EVENTS.push({
  id: 'circle_exam_control', once: true, noFlag: true, quiet: true, weight: 0, cond: () => false,
  title: '', text: () => '',
  choices: [
    { label: '', run: (g, rng) => controlResult(g, rng, g.player.stats.wil + g.player.skills.magic * 0.6, 0) },
    { label: '', run: (g, rng) => controlResult(g, rng, g.player.mana * 0.25 + g.player.skills.magic * 0.5, 0.25) },
    { label: '', run: (g, rng) => controlResult(g, rng, g.player.stats.int + g.player.stats.sen * 0.5 + g.player.skills.magic * 0.4, 0.1) },
  ],
});
function controlResult(g, rng, value, risk) {
  const e = g.magic.exam;
  const diff = 20 + e.target * 14;
  const ok = rng.chance(Math.max(0.1, Math.min(0.92, 0.5 + (value - diff) / 45)));
  let text;
  if (ok) { e.score += 1; text = '구슬들이 하나씩 고르게 빛났다. 깨진 것도, 꺼진 것도 없었다.'; }
  else if (rng.chance(0.4 + risk)) { g.player.injuries.push({ name: '깨진 유리 구슬에 베인 손', months: 1 }); text = '구슬 하나가 날카로운 소리를 내며 깨졌다. 유리 조각이 손등을 그었다.'; }
  else text = '구슬 둘이 끝내 희미하게 꺼졌다. 시험관이 장부에 짧게 줄을 그었다.';
  e.stage = 2;
  const n = e.target;
  startDuel(g, rng, {
    kind: 'circle_exam', title: '승급 시험: 실전', mode: 'magic',
    intro: `${text}\n\n"마지막 관문, 실전." 시험관이 일어나 방 한가운데로 걸어 나왔다. "나를 상대로 ${n}서클 마법사답게 싸워 봐라. 결정타가 들어가면 끝이다."`,
    foe: { name: examiner(g), skill: [0, 22, 38, 54, 68][n], style: ['steady', 'tricky', 'swift', 'steady', 'tricky'][n], circle: n },
    ctx: { target: n },
  });
  return text;
}

registerDuelEnd('circle_exam', (g, rng, won, d) => {
  const m = magicState(g);
  const e = m.exam;
  m.exam = null;
  if (!e) return '';
  const total = e.score + (won ? 2 : 0);
  if (total >= 3) {
    m.certified = e.target;
    if (e.target >= 3) g.flags.mage_registered = true;
    if (g.life) g.life.renown = (g.life.renown ?? 0) + [0, 1, 3, 8, 20][e.target];
    gainStat(g, 'wil', 0.5);
    g.chronicle.push({ y: g.date.year, m: g.date.month, text: `${g.player.name}, 마도사 협회에서 ${e.target}서클을 공인받다.`, rel: 100 });
    return `시험관이 은빛 인장을 내밀었다. "${e.target}서클을 공인한다." ${['', '이제 마을에서 마법사라고 불려도 부끄럽지 않다.', '협회 장부에 이름이 올랐다. 지부에 일거리가 들어오면 이름이 불릴 것이다.', '3서클. 평민이라도 귀족 대접을 받는 자리다. 마법사 등록도 이것으로 끝났다.', '4서클. 왕국 전체에서도 손에 꼽는다. 궁정에서 사람이 찾아올지도 모른다.'][e.target]}`;
  }
  gainSkill(g, 'magic', 1.0, 'int');
  return `"불합격." 시험관은 덤덤하게 말했다. "${won ? '싸움은 됐는데, 기초가 흔들린다.' : '아직 그 서클을 다룰 몸이 아니다.'} 다음에 다시 와라." 응시료는 돌려받지 못했다.`;
});
