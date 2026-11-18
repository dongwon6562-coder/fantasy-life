// 학원 생활: 수업 듣기, 해마다 내는 수업료와 장학금, 여름의 학년 시험, 세 해를 마치면 졸업. 학원 고장을 오래 떠나 있으면 학적이 지워진다.
// 기숙사의 밤, 평민 장학생을 업신여기는 귀족 자제.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainSkill, gainStat, playerAge } from '../game.js';
import { knownAs } from '../childhood/state.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, canSpend, spend } from '../adventure/core.js';
import { remember } from '../relations.js';
import { courtState } from '../court/index.js';
import { noble } from '../law/index.js';
import { SS, ACADEMIES, clamp, mi, slog, enrolled, placeName } from './state.js';
import { here, free, ownRng, takeExam, setFinals, record, aliveAlumni, addAlumni, bribeCost } from './exams.js';

const A = (g) => SS(g).acad;
const atAcad = (g) => enrolled(g) && here(g) === A(g).place && free(g);
const acadName = (g) => ACADEMIES[A(g)?.place]?.name ?? '학원';
const mates = (g) => aliveAlumni(g).filter(({ a }) => a.cls === acadName(g) && a.year === A(g)?.year);

/* ---------- 수업 ---------- */
const LESSONS = {
  leocast: ['수사학 교수가 왕국 연대기를 외우게 했다. 왕의 이름 서른두 개.', '예법 시간. 포크를 쥐는 법이 세 가지나 있다는 것을 알았다.', '법학 강의에서 오래된 판례를 두고 귀족 자제들과 말다툼을 했다.'],
  eisen: ['기하학 교수가 칠판에 그린 도형을 한 번도 지우지 않고 세 시간을 떠들었다.', '제국 법전 한 권을 통째로 베껴 오라는 숙제가 나왔다.', '천문 관측 탑에서 별의 자리를 적었다. 손이 얼었다.'],
  solaris: ['새벽 기도 뒤 경전 해석 수업. 같은 구절을 세 가지로 읽는 법을 배웠다.', '성가대에서 목이 쉬도록 노래했다.', '교부들의 편지를 라틴어 같은 옛말로 읽었다.'],
};
ACTIONS.push({
  id: 'school_study', name: '학원 수업', icon: 'book',
  desc: '학원에서 수업을 듣는다. 많이 들을수록 여름의 학년 시험이 쉬워진다.',
  available: (g) => atAcad(g),
  run(g, rng) {
    const a = A(g), Ac = ACADEMIES[a.place];
    a.work += 1;
    tired(g, 5);
    gainSkill(g, 'letters', 0.9, 'int');
    for (const st of Ac.gain.slice(1)) gainStat(g, st, 0.35);
    let tail = '';
    const ms = mates(g);
    if (ms.length && rng.chance(0.3)) { const { p } = rng.pick(ms); p.affection = clamp((p.affection ?? 0) + 2, -100, 100); tail = ` 수업이 끝나고 ${J(p.name, '과/와')} 필기를 맞춰 보았다.`; }
    return `${rng.pick(LESSONS[a.place] ?? LESSONS.leocast)}${tail} (${a.grade}학년)`;
  },
});

/* ---------- 학년 시험 결과 ---------- */
setFinals((g, rng, score, mark) => {
  const S = SS(g), a = A(g);
  if (!a) return '';
  const s = { kind: 'finals', place: a.place };
  a.work = 0;
  if (score >= mark) {
    record(g, s, score >= mark + 15 ? 'top' : 'pass', 'honest');
    gainSkill(g, 'letters', 1, 'int');
    let lost = '';
    if (a.scholar && score < mark + 5) { a.scholar = false; lost = ' 다만 성적이 아슬아슬해 장학금이 끊겼다. 내년부터는 수업료를 내야 한다.'; }
    if (a.grade >= 3) return graduate(g, rng, score >= mark + 12 && !a.fails) + lost;
    a.grade += 1;
    return `학년 시험을 넘겼다. ${a.grade}학년이 된다.${score >= mark + 15 ? ' 성적표 맨 위에 내 이름이 있었다.' : ''}${lost}`;
  }
  record(g, s, 'fail', 'honest');
  a.fails += 1;
  stress(g, 8);
  if (ACADEMIES[a.place].strict || a.fails >= 2) return expel(g, `학년 시험에 ${a.fails >= 2 ? '두 번째로 ' : ''}떨어졌다. ${ACADEMIES[a.place].strict ? '제국 아카데미는 두 번 기회를 주지 않는다.' : '학원은 더 기다려 주지 않았다.'}`);
  return `학년 시험에 떨어졌다. ${a.grade}학년을 한 해 더 다닌다. 한 번 더 떨어지면 끝이다.`;
});

function graduate(g, rng, honors) {
  const S = SS(g), a = A(g), Ac = ACADEMIES[a.place];
  a.state = 'graduated';
  S.titles.academy = { place: a.place, year: g.date.year, honors };
  L(g).renown = (L(g).renown ?? 0) + (honors ? 5 : 3);
  if (a.place === 'leocast') { const c = courtState(g); c.standing = clamp(c.standing + (honors ? 12 : 8), 0, 100); }
  for (const { p } of mates(g)) { p.affection = clamp((p.affection ?? 0) + 5, -100, 100); remember(g, p, `${Ac.name}을 함께 마쳤다`, 1, { tag: 'school', recall: `${Ac.name} 동기였던 일` }); }
  note(g, `${J(Ac.name, '을/를')} ${honors ? '수석으로 ' : ''}마쳤다.`);
  chron(g, `${g.player.name}, ${Ac.name}을 ${honors ? '수석으로 ' : ''}졸업하다.`.replace(`${Ac.name}을`, J(Ac.name, '을/를')), honors ? 60 : 30);
  slog(g, `${Ac.name} 졸업${honors ? ' (수석)' : ''}.`);
  return `세 해 만에 ${J(Ac.name, '을/를')} 마쳤다.${honors ? ' 수석이다. 졸업식에서 학장이 내 이름을 두 번 불렀다.' : ''} 동기들과 모자를 하늘로 던졌다. 이 사람들의 이름을 평생 듣게 될 것이다.`;
}
function expel(g, why) {
  const a = A(g);
  a.state = 'expelled';
  stress(g, 10);
  slog(g, `${acadName(g)}에서 학적이 지워졌다.`);
  note(g, `${acadName(g)}에서 나왔다.`);
  return `${why} 기숙사 짐을 쌌다. 문지기가 내 이름을 명부에서 지웠다.`;
}

/* ---------- 매달: 수업료, 학년 시험, 떠나 있음 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.school) return;
  const a = A(g);
  if (!a || a.state !== 'enrolled') return;
  const away = here(g) !== a.place || !!L(g).travel;
  a.away = away ? a.away + 1 : 0;
  if (a.away >= 5) {
    a.state = 'left';
    slog(g, `${acadName(g)}에 다섯 달 넘게 나가지 않아 학적이 지워졌다.`);
    g.news.unshift({ text: `${acadName(g)}에서 편지가 왔다. 다섯 달 넘게 수업에 나오지 않아 학적을 지웠다고 한다.`, rel: 90 });
    return;
  }
  const m = g.date.month;
  if (m === 1 && !a.scholar && (a.paidYear ?? a.year) < g.date.year && !sceneQueued(g, 'school_fee')) {
    if ((a.paidYear ?? a.year) < g.date.year - 1) {
      a.state = 'left';
      slog(g, `${acadName(g)}: 수업료를 두 해 못 내 학적이 지워졌다.`);
      g.news.unshift({ text: `${acadName(g)}의 서기가 수업료가 두 해 밀렸다며 학적을 지웠다고 알려 왔다.`, rel: 90 });
      return;
    }
    queueScene(g, 'school_fee', { year: g.date.year });
  }
  if (m === 6 && a.lastFinals !== g.date.year && a.year < g.date.year + 1 && mi(g) - (a.year * 12) >= 4 && !sceneQueued(g, 'school_finals')) queueScene(g, 'school_finals', { year: g.date.year }, { first: true });
  // 여름이 다 가도록 학년 시험을 못 봤으면 떨어진 것으로 친다
  if (m === 9 && a.lastFinals !== g.date.year && mi(g) - a.year * 12 >= 7) {
    a.lastFinals = g.date.year;
    a.fails += 1;
    record(g, { kind: 'finals', place: a.place }, 'fail', 'honest');
    if (ACADEMIES[a.place].strict || a.fails >= 2) { const t = expel(g, '학년 시험에 나가지 않았다.'); g.news.unshift({ text: `${acadName(g)}에서 편지가 왔다. ${t}`, rel: 90 }); }
    else g.news.unshift({ text: `${acadName(g)}의 학년 시험 날, 나는 시험장에 없었다. 한 해를 다시 다녀야 한다.`, rel: 80 });
  }
});

defineScene('school_fee', {
  title: () => '수업료',
  text: (g) => `${acadName(g)}의 서기가 장부를 펼쳤다. 올해 수업료는 은화 ${ACADEMIES[A(g).place].fee}닢이다.`,
  choices: (g) => {
    if (!atAcad(g) || A(g).scholar || (A(g).paidYear ?? 0) >= g.date.year) return [];
    const fee = ACADEMIES[A(g).place].fee;
    return [
      ...(canSpend(g, fee) ? [{ label: `낸다 (은화 ${fee}닢)`, key: 'pay' }] : []),
      { label: '장학금을 청한다', key: 'ask' },
      { label: '학원을 그만둔다', key: 'quit' },
    ];
  },
  resolve(g, rng, s, key) {
    const a = A(g);
    if (!a || a.state !== 'enrolled') return '이미 학원 사람이 아니다.';
    const fee = ACADEMIES[a.place].fee;
    if (key === 'pay') {
      if (!spend(g, fee)) return `은화 ${fee}닢이 모자랐다. 서기는 한 해만 기다려 주겠다고 했다.`;
      a.paidYear = g.date.year;
      return `은화 ${fee}닢을 세어 냈다. 서기가 영수증에 도장을 찍었다.`;
    }
    if (key === 'ask') {
      const p = g.player;
      if (check(ownRng(g, 11), (p.skills.letters ?? 0) * 0.6 + p.stats.cha * 0.3 + a.work * 2, 42)) {
        a.scholar = true; a.paidYear = g.date.year;
        slog(g, `${acadName(g)}의 장학생이 되었다.`);
        return '학장 앞에서 지난 학년 성적표를 내밀었다. 학장은 안경을 벗고 한참 보다가 서류에 서명했다. 장학생이다.';
      }
      stress(g, 5);
      return '학장은 내 성적표를 보고 고개를 저었다. "장학금은 맨 앞줄에 앉는 학생 몫이오." 서기는 한 해만 기다려 주겠다고 했다.';
    }
    a.state = 'left';
    slog(g, `${acadName(g)}을 스스로 그만두었다.`);
    return `${J(acadName(g), '을/를')} 그만두었다. 기숙사 열쇠를 돌려주는 손이 생각보다 가벼웠다.`;
  },
});

defineScene('school_finals', {
  title: () => '학년 시험',
  text: (g) => `${acadName(g)}의 여름 학년 시험. ${A(g).grade}학년. 올해 들은 수업은 ${A(g).work}번이다. ${A(g).work >= 6 ? '준비는 해 두었다.' : A(g).work >= 3 ? '자신은 반쯤 있다.' : '펼쳐 본 책이 몇 권 안 된다.'}`,
  choices: (g) => {
    if (!atAcad(g) || A(g).lastFinals === g.date.year) return [];
    const cost = bribeCost(g, 'finals', A(g).place);
    return [
      { label: '정직하게 본다', key: 'honest' },
      { label: '소매에 쪽지를 숨겨 간다', key: 'cheat' },
      ...(canSpend(g, cost) ? [{ label: `교수를 매수한다 (은화 ${cost}닢)`, key: 'bribe' }] : []),
    ];
  },
  resolve(g, rng, s, key) {
    if (!atAcad(g) || A(g).lastFinals === g.date.year) return '시험은 이미 끝났다.';
    if (key === 'bribe') {
      const cost = bribeCost(g, 'finals', A(g).place);
      if (!canSpend(g, cost)) return takeExam(g, rng, { kind: 'finals', place: A(g).place }, 'honest');
    }
    return takeExam(g, rng, { kind: 'finals', place: A(g).place }, key);
  },
});

/* ---------- 학원의 일들 ---------- */
EVENTS.push({
  id: 'school_dorm', cooldown: 10, weight: 5,
  chance: () => 0.5,
  cond: (g) => atAcad(g) && mates(g).length > 0,
  prepare: (g, rng) => ({ id: rng.pick(mates(g)).p.id }),
  title: '기숙사의 밤',
  text: (g, c) => { const p = g.people.find((x) => x.id === c.id); return `불을 끈 기숙사. ${J(p?.name ?? '같은 방 동기', '이/가')} 침대에서 몸을 일으켰다. "서고 열쇠를 구했어. 아니면 아랫마을 술집에 갈래?"`; },
  choices: [
    {
      label: '금서 칸에 몰래 들어간다',
      run: (g, rng, c) => {
        const p = g.people.find((x) => x.id === c.id);
        if (p) p.affection = clamp((p.affection ?? 0) + 4, -100, 100);
        if (rng.chance(0.2)) { stress(g, 6); if (A(g)) A(g).work = Math.max(0, A(g).work - 1); return '금서 칸 문을 여는 순간 사감의 등불이 비쳤다. 한 달 동안 새벽 청소를 했다.'; }
        gainSkill(g, 'letters', 1.2, 'int');
        return `${p ? J(p.name, '과/와') : ''} 촛불 하나를 사이에 두고 금서를 넘겼다. 수업에서 가르치지 않는 역사가 거기 있었다.`.trim();
      },
    },
    {
      label: '술집에 간다',
      run: (g, rng, c) => {
        const p = g.people.find((x) => x.id === c.id);
        if (p) { p.affection = clamp((p.affection ?? 0) + 7, -100, 100); remember(g, p, '학원 시절 몰래 술을 마시러 나갔다', 1, { tag: 'school_night' }); }
        stress(g, -8);
        if (g.player.money >= 2) g.player.money -= 2;
        return `담을 넘었다. 아랫마을 술집에서 ${p ? J(p.name, '이/가') : '동기가'} 교수 흉내를 내는 바람에 맥주를 뿜었다. 새벽에 다시 담을 넘었다.`;
      },
    },
    {
      label: '그냥 잔다',
      run: (g) => { gainStat(g, 'wil', 0.4); if (A(g)) A(g).work += 1; return '이불을 머리까지 덮었다. 다음 날 아침 수업에서 나만 눈이 맑았다.'; },
    },
  ],
});

EVENTS.push({
  id: 'school_noble', cooldown: 30, weight: 4,
  chance: () => 0.45,
  cond: (g) => atAcad(g) && A(g).place === 'leocast' && !noble(g),
  prepare: (g, rng) => ({ who: rng.pick(['공작가의 셋째 아들', '백작가의 맏딸', '후작가의 조카', '재상 집안의 막내']) }),
  title: '비단옷들',
  text: (g, c) => `식당에서 ${J(c.who, '이/가')} 내 무명옷 소매를 손끝으로 집어 들었다. "학원에 하인도 들이나? 아, 장학생이구나." 둘러앉은 비단옷들이 웃었다.`,
  choices: [
    {
      label: '말로 받아친다',
      run: (g, rng, c) => {
        if (check(rng, g.player.stats.cha * 0.6 + (g.player.skills.letters ?? 0) * 0.4, 38)) {
          L(g).renown = (L(g).renown ?? 0) + 1;
          gainStat(g, 'cha', 0.5);
          slog(g, `왕립 학원 식당에서 ${c.who}를 말로 눌렀다.`.replace(`${c.who}를`, J(c.who, '을/를')));
          return `"하인이 들어올 만큼 시험이 쉽다면, 그대는 왜 두 번 떨어졌소?" 식당이 조용해졌다. 그리고 누군가 웃음을 터뜨렸다. 이번에는 내 편이었다.`;
        }
        stress(g, 8);
        return '무슨 말을 하려 했는데 목이 막혔다. 웃음소리가 더 커졌다. 그날 저녁은 먹지 않았다.';
      },
    },
    {
      label: '참는다',
      run: (g) => { stress(g, 5); gainStat(g, 'wil', 0.5); if (A(g)) A(g).work += 1; return '숟가락을 내려놓지 않았다. 대신 그날 밤 책을 한 권 더 읽었다. 성적표가 대답할 것이다.'; },
    },
    {
      label: '웃어넘기고 말을 섞는다',
      run: (g, rng, c) => {
        if (check(rng, g.player.stats.cha, 36)) {
          const [p] = addAlumni(g, rng, 1, acadName(g), A(g).place, 'merchant');
          if (p) { p.affection = 22; const a = SS(g).alumni.find((x) => x.id === p.id); if (a) { a.rival = false; a.fate = 'rise'; a.year = A(g).year; } }
          return `"하인도 공부는 하지요. 그대 숙제를 대신 해 주는 하인보다는 잘합니다." ${J(c.who, '이/가')} 눈을 동그랗게 뜨더니 웃었다. 뜻밖에 그날부터 말을 트고 지냈다.`;
        }
        stress(g, 4);
        return '웃어 보였지만 상대는 이미 등을 돌렸다. 비단옷들 사이에 내 자리는 없었다.';
      },
    },
  ],
});

/* ---------- 먼 고장에서 듣는 시험 공고 ---------- */
// 시험은 큰 고장에서만 열린다. 시골에 사는 사람에게는 소문으로 온다. 가려면 길을 떠나야 한다.
const callOf = (g) => {
  const S = SS(g), age = playerAge(g), sk = g.player.skills, pl = here(g);
  if (L(g).job) return null; // 매인 일이 없는 사람에게 닿는 소문이다
  if (!S.acad && !S.titles.academy && age >= 15 && age <= 19 && ((sk.letters ?? 0) >= 18 || knownAs(g) === 'bookish' || g.flags?.child_recommend === true) && !ACADEMIES[pl]) return 'academy';
  if (!S.titles.official && age >= 18 && age <= 40 && (sk.letters ?? 0) >= 35 && pl !== 'leocast' && g.date.year % 2 === 1) return 'official';
  return null;
};
EVENTS.push({
  id: 'school_call', cooldown: 48, weight: 3,
  chance: () => 0.4,
  cond: (g) => free(g) && !enrolled(g) && !!callOf(g) && !sceneQueued(g, 'travel'),
  prepare: (g) => ({ kind: callOf(g) }),
  title: '시험 공고',
  text: (g, c) => (c.kind === 'academy'
    ? `왕도에서 온 짐마차꾼이 접힌 종이 한 장을 건넸다. 왕립 학원의 입학 시험 공고다. 평민도 장학생으로 뽑는다고 적혀 있다.${g.flags?.child_recommend === true ? ' 품 안의 추천서가 떠올랐다.' : ''}`
    : '왕도에서 소식이 왔다. 내년 봄에 두 해 만의 왕국 관리 시험이 열린다고 한다. 급제하면 궁정의 말석에 이름이 오른다.'),
  choices: [
    { label: '지금은 남는다', run: (g) => { stress(g, 2); return '공고문을 화로에 넣지는 않았다. 서랍 깊숙이 넣었다.'; } },
    { label: '왕도로 길을 떠난다', run: (g, rng, c) => { queueScene(g, 'travel', { to: 'leocast' }, { first: true }); return c.kind === 'academy' ? '공고문을 접어 품에 넣었다. 짐을 꾸릴 때가 되었다.' : '오래 덮어 두었던 책을 다시 꺼냈다. 왕도까지는 길이 멀다.'; } },
  ],
});
