// 고장 대회: 활쏘기(5월), 마상 시합(6월), 씨름(8~9월), 사냥 대회(10월).
// 그 달 그 고장에 있으면 나갈 수 있다. 세 판(예선·준결승·결승)을 이기면 우승. 판마다 수를 고르고, 상대의 버릇은 눈썰미로 읽는다.
// 심판을 매수하거나, 결승에서 져 주고 돈을 받을 수도 있다. 승부 조작은 몇 해 뒤에라도 들통날 수 있다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainStat, gainSkill, playerAge } from '../game.js';
import { defineScene, queueScene, sceneQueued, note, chron, stress } from '../adventure/core.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { mountOf, huntBonus } from '../beasts/index.js';
import { myGang } from '../underworld/gangs.js';
import { J } from '../narrative/text.js';
import { C, mi, clamp, here, placeName, free, stat, skill, logContest, renown, bannedAt, ban } from './core.js';

// tac: 세 가지 수. i번째 수는 (i+1)번째 수를 누른다.
export const FAIRS = {
  archery: {
    name: '활쏘기 대회', months: [5], places: ['ern', 'harfen', 'gruental', 'silverleaf', 'fur', 'verden'], fee: 5, prize: 40, age: 13,
    tac: [['bide', '바람이 잘 때까지 기다렸다 쏜다'], ['quick', '남보다 먼저 연달아 쏜다'], ['center', '과녁 한가운데만 노린다']],
    habit: ['바람을 기다리는', '서두르는', '한가운데만 노리는'],
    foes: ['은잎 마을에서 온 사냥꾼', '늙은 궁수 바르톨', '왼손잡이 양치기', '영주의 사냥 시종'],
    score: (g) => stat(g, 'agi') * 0.4 + stat(g, 'sen') * 0.5 + skill(g, 'hunting') * 0.4,
    grow: (g) => gainStat(g, 'sen', 0.4),
    win: '마지막 화살이 과녁 한가운데 꽂혔다. 구경꾼들이 모자를 던졌다.',
    lose: '화살이 바람에 밀려 과녁 끝에 꽂혔다.',
  },
  joust: {
    name: '마상 시합', months: [6], places: ['leocast', 'verden', 'eisen', 'graubel', 'solaris'], fee: 20, prize: 120, age: 16,
    tac: [['high', '창끝을 투구 높이로 겨눈다'], ['low', '창끝을 방패 아래로 낮춘다'], ['shield', '방패를 세우고 버틴다']],
    habit: ['투구를 노리는', '낮게 찌르는', '방패 뒤에 숨는'],
    foes: ['은사자 문장의 기사', '변경백의 셋째 아들', '떠돌이 기사 오도', '검은 투구의 이름 없는 기사'],
    score: (g) => skill(g, 'sword') * 0.45 + stat(g, 'str') * 0.3 + stat(g, 'agi') * 0.2 + (mountOf(g)?.kind === 'warhorse' ? 10 : 0),
    grow: (g) => gainSkill(g, 'sword', 0.6, 'str'),
    win: '창이 상대의 방패 한가운데를 때렸다. 상대가 말 엉덩이 너머로 굴러떨어졌다.',
    lose: '상대의 창끝이 가슴을 때렸다. 하늘이 뒤집히고, 땅이 등을 쳤다.',
    hurt: '마상 시합에서 금 간 갈비뼈',
  },
  wrestling: {
    name: '씨름 대회', months: [8, 9], places: ['ern', 'harfen', 'gruental', 'verden', 'hammer', 'fur', 'klein', 'graubel'], fee: 5, prize: 40, age: 14,
    tac: [['grip', '샅바를 깊이 잡고 버틴다'], ['sweep', '다리를 걸어 넘긴다'], ['push', '힘으로 밀어붙인다']],
    habit: ['버티는', '다리를 거는', '밀어붙이는'],
    foes: ['방앗간 집 장사', '쇠망치 골의 드워프', '항구의 짐꾼 두목', '대장장이 아들 쿠르트'],
    score: (g) => stat(g, 'str') * 0.6 + stat(g, 'agi') * 0.25 + stat(g, 'wil') * 0.25,
    grow: (g) => gainStat(g, 'str', 0.4),
    win: '상대의 무게가 허리 위로 실리는 순간 몸을 틀었다. 상대가 모래 위에 등을 댔다.',
    lose: '발이 모래에서 미끄러졌다. 정신을 차려 보니 하늘이 보였다.',
    hurt: '씨름판에서 삔 어깨',
  },
  hunt: {
    name: '사냥 대회', months: [10], places: ['verden', 'leocast', 'gruental', 'eisen', 'fur'], fee: 10, prize: 60, age: 14,
    tac: [['track', '발자국을 끝까지 쫓는다'], ['bait', '미끼를 놓고 기다린다'], ['drive', '몰이꾼처럼 소리 내어 몬다']],
    habit: ['발자국을 쫓는', '기다리는', '몰아 대는'],
    foes: ['영주의 사냥개지기', '털가죽 시장의 수인 사냥꾼', '숲지기 하인리히', '귀족 집 도련님과 몰이꾼들'],
    score: (g) => skill(g, 'hunting') * 0.6 + stat(g, 'sen') * 0.35 + huntBonus(g) * 4,
    grow: (g) => gainSkill(g, 'hunting', 0.8, 'sen'),
    win: '해가 질 무렵 큰 수사슴을 끌고 돌아왔다. 심판이 뿔 가지를 세다가 고개를 끄덕였다.',
    lose: '하루 종일 숲을 헤맸지만 남이 잡은 짐승보다 작았다.',
  },
};
export const FAIR_IDS = Object.keys(FAIRS);
const ROUND = ['예선', '준결승', '결승'];
const bigTown = (pl) => pl === 'leocast' || pl === 'eisen';

export const fairHere = (g, pl = here(g)) => FAIR_IDS.find((id) => FAIRS[id].months.includes(g.date.month) && FAIRS[id].places.includes(pl)) ?? null;
const enteredKey = (g, id, pl = here(g)) => `${id}:${pl}:${g.date.year}`;
export const canJoust = (g) => !!mountOf(g) && skill(g, 'sword') >= 25;
const canEnter = (g, id) => !!id && playerAge(g) >= FAIRS[id].age && (id !== 'joust' || canJoust(g)) && g.player.money >= FAIRS[id].fee;
const fairOpen = (g) => {
  const id = fairHere(g);
  return !!id && free(g) && playerAge(g) >= 12 && !bannedAt(g, 'fair') && !C(g).entered[enteredKey(g, id)];
};
const prizeOf = (g, id, pl = here(g)) => Math.round(FAIRS[id].prize * (bigTown(pl) ? 1.5 : 1));
const foeSkill = (round, pl) => [35, 45, 55][round] + (bigTown(pl) ? 10 : 0);

ACTIONS.push({
  id: 'contest_fair',
  name: '고장 대회에 나간다',
  icon: 'wander',
  desc: '이 달 이 고장에서 열리는 대회(활쏘기·마상 시합·씨름·사냥)에 나가거나, 구경하며 내기를 건다. 세 판을 이기면 우승이다.',
  available: (g) => fairOpen(g) && !sceneQueued(g, 'contest_fair') && !sceneQueued(g, 'contest_round'),
  run(g) { const f = FAIRS[fairHere(g)]; queueScene(g, 'contest_fair', { fair: fairHere(g) }); return `${placeName(here(g))} 광장에 ${f.name} 깃발이 올랐다.`; },
});

defineScene('contest_fair', {
  need: (g, s) => fairOpen(g) && fairHere(g) === s.fair,
  title: (g, s) => `${placeName(here(g))}의 ${FAIRS[s.fair].name}`,
  text: (g, s) => {
    const f = FAIRS[s.fair], won = C(g).titles.filter((t) => t.id === s.fair).length;
    const why = playerAge(g) < f.age ? ` 나는 아직 나이가 어려 나갈 수 없다.` : s.fair === 'joust' && !canJoust(g) ? ' 마상 시합에는 길든 말과 검 솜씨(검술 25)가 있어야 나갈 수 있다.' : g.player.money < f.fee ? ` 참가비 은화 ${f.fee}닢이 없다.` : '';
    return `광장에 천막이 서고 사람들이 몰려들었다. ${f.name}의 참가비는 은화 ${f.fee}닢, 우승하면 은화 ${prizeOf(g, s.fair)}닢이다.${won ? ` 나는 ${f.name}에서 ${won}번 우승했다.` : ''}${why}`;
  },
  choices: (g, s) => {
    const f = FAIRS[s.fair], out = [];
    if (canEnter(g, s.fair)) {
      out.push({ label: `참가한다 (은화 ${f.fee}닢)`, key: 'enter' });
      if (g.player.money >= f.fee + 15) out.push({ label: `심판에게 은화 15닢을 찔러 주고 참가한다`, key: 'bribe' });
    }
    if (g.player.money >= 15) out.push({ label: '우승 후보에게 은화 15닢을 건다', key: 'bet:fav' }, { label: '이름 없는 참가자에게 은화 15닢을 건다', key: 'bet:dog' });
    out.push({ label: '구경만 한다', key: 'watch' });
    return out;
  },
  resolve(g, rng, s, key) {
    const c = C(g), f = FAIRS[s.fair], pl = here(g);
    if (key === 'enter' || key === 'bribe') {
      const cost = f.fee + (key === 'bribe' ? 15 : 0);
      if (!canEnter(g, s.fair) || g.player.money < cost) return '참가비가 모자라 이름을 올리지 못했다.';
      g.player.money -= cost;
      c.entered[enteredKey(g, s.fair)] = true;
      if (key === 'bribe' && rng.chance(0.15)) {
        reportCrime(g, 'fraud', pl, { mult: 0.3 });
        deed(g, 'honest', -8, `${f.name}에서 심판을 매수하려다 들켰다.`, pl);
        ban(g, 'fair', 24);
        stress(g, 6);
        logContest(g, `${placeName(pl)} ${f.name}에서 심판 매수가 들켜 쫓겨났다.`);
        return '심판이 은화를 받는 척하더니 큰 소리로 사람들을 불렀다. 이름이 명단에서 지워졌다. 두 해 동안 이 고장 대회에는 나올 수 없다.';
      }
      queueScene(g, 'contest_round', { fair: s.fair, round: 0, bribed: key === 'bribe', foe: rng.pick(f.foes), foeT: rng.int(0, 2) }, { first: true });
      return key === 'bribe' ? '심판이 은화를 소매에 넣고 눈을 찡긋했다. 이름이 명단 맨 끝에 올랐다.' : '명단에 이름을 올렸다. 첫 판 상대가 정해졌다.';
    }
    if (key.startsWith('bet:')) {
      if (g.player.money < 15) return '걸 돈이 모자랐다.';
      const fav = key === 'bet:fav';
      c.entered[enteredKey(g, s.fair)] = true;
      c.games += 1;
      if (rng.chance(fav ? 0.6 : 0.28)) { const got = fav ? 9 : 35; g.player.money += got; c.won += got; logContest(g, `${f.name} 내기로 은화 ${got}닢을 땄다.`); return fav ? `우승 후보가 예상대로 이겼다. 은화 ${got}닢을 받았다.` : `아무도 모르던 참가자가 끝까지 살아남았다. 내기꾼들이 머리를 감쌌다. 은화 ${got}닢!`; }
      g.player.money -= 15; c.lost += 15; logContest(g, `${f.name} 내기로 은화 15닢을 잃었다.`);
      return '내가 건 쪽은 두 번째 판에서 떨어졌다. 은화 15닢이 날아갔다.';
    }
    c.entered[enteredKey(g, s.fair)] = true;
    stress(g, -3);
    return `${J(f.name, '을/를')} 끝까지 구경했다. 우승한 사람이 어깨에 들려 광장을 돌았다.`;
  },
});

defineScene('contest_round', {
  need: (g, s) => free(g) && !!FAIRS[s.fair],
  title: (g, s) => `${FAIRS[s.fair].name}: ${ROUND[s.round]}`,
  text: (g, s) => {
    const f = FAIRS[s.fair];
    s.offer ??= s.round === 2 && (myGang(g) || C(g).titles.length > 0 || mi(g) % 3 === 0) ? Math.round(prizeOf(g, s.fair) * 1.2) : 0;
    const read = stat(g, 'sen') >= 35 + s.round * 10;
    const hint = read ? `몸 푸는 모습을 보니 ${f.habit[s.foeT]} 버릇이 있다.` : '상대가 어떻게 나올지 짐작이 가지 않는다.';
    return `${ROUND[s.round]} 상대는 ${s.foe}. ${hint}${s.offer ? ` 천막 뒤에서 누가 소매를 잡았다. "결승에서 져 주면 은화 ${s.offer}닢. 큰돈이 반대쪽에 걸렸소."` : ''}`;
  },
  choices: (g, s) => {
    const out = FAIRS[s.fair].tac.map(([k, label]) => ({ label, key: `t:${k}` }));
    if (s.offer) out.push({ label: `져 주기로 한다 (은화 ${s.offer}닢)`, key: 'throw' });
    out.push({ label: '기권한다', key: 'quit' });
    return out;
  },
  resolve(g, rng, s, key) {
    const c = C(g), f = FAIRS[s.fair], pl = here(g);
    if (key === 'quit') { stress(g, 3); logContest(g, `${f.name} ${ROUND[s.round]}에서 기권했다.`); return '손을 들고 물러났다. 구경꾼들이 혀를 찼다.'; }
    if (key === 'throw') {
      g.player.money += s.offer;
      c.fixed.push({ kind: 'fair', fair: s.fair, place: pl, year: g.date.year, exposed: false, at: mi(g), gang: !!myGang(g) });
      const run = Math.round(prizeOf(g, s.fair) * 0.3);
      g.player.money += run;
      logContest(g, `${placeName(pl)} ${f.name} 결승에서 져 주고 은화 ${s.offer}닢을 받았다.`);
      stress(g, 5);
      return `결승에서 한 박자 늦게 움직였다. 아무도 눈치채지 못할 만큼만. 준우승 상금 은화 ${run}닢과, 밤에 몰래 건네받은 은화 ${s.offer}닢. 우승자가 나를 끌어안았다. 그 얼굴을 똑바로 볼 수 없었다.`;
    }
    const ti = f.tac.findIndex(([k]) => `t:${k}` === key);
    const mine = Math.max(0, ti);
    const edge = (mine + 1) % 3 === s.foeT ? 12 : (s.foeT + 1) % 3 === mine ? -12 : 0;
    const me = f.score(g) + edge + (s.bribed ? 10 : 0);
    const won = rng.chance(clamp(0.5 + (me - foeSkill(s.round, pl)) / 40, 0.06, 0.94));
    f.grow(g);
    const how = edge > 0 ? ' 상대의 수를 읽었다.' : edge < 0 ? ' 상대가 내 수를 기다리고 있었다.' : '';
    if (won && s.round < 2) {
      queueScene(g, 'contest_round', { fair: s.fair, round: s.round + 1, bribed: s.bribed, foe: rng.pick(f.foes.filter((x) => x !== s.foe)), foeT: rng.int(0, 2) }, { first: true });
      return `${f.win}${how} ${J(ROUND[s.round + 1], '으로/로')} 올라갔다.`;
    }
    if (won) {
      const p = prizeOf(g, s.fair);
      g.player.money += p;
      renown(g, s.fair === 'joust' ? 6 : bigTown(pl) ? 4 : 2);
      deed(g, 'brave', s.fair === 'joust' ? 6 : 3, `${f.name}에서 우승했다.`, pl);
      c.titles.push({ id: s.fair, place: pl, year: g.date.year, text: `${placeName(pl)} ${f.name} 우승` });
      logContest(g, `${placeName(pl)} ${f.name}에서 우승했다 (은화 ${p}닢).`);
      note(g, `${placeName(pl)} ${f.name}에서 우승했다.`);
      if (s.fair === 'joust' || bigTown(pl)) chron(g, `${g.player.name}, ${placeName(pl)} ${f.name}에서 우승하다.`, 70);
      stress(g, -6);
      return `${f.win}${how} 우승이다! 상금 은화 ${p}닢과 꽃으로 엮은 관을 받았다.${s.fair === 'joust' ? ' 귀부인 관람석에서 손수건이 날아왔다.' : ' 그날 밤 주막의 술값은 아무도 받지 않았다.'}`;
    }
    const run = s.round === 2 ? Math.round(prizeOf(g, s.fair) * 0.3) : 0;
    g.player.money += run;
    let hurt = '';
    if (f.hurt && rng.chance(0.3)) { g.player.injuries.push({ name: f.hurt, months: 2 }); hurt = ' 몸 어딘가가 욱신거렸다. 한동안 고생할 것 같다.'; }
    stress(g, 3);
    logContest(g, `${placeName(pl)} ${f.name} ${ROUND[s.round]}에서 졌다.${run ? ` (준우승, 은화 ${run}닢)` : ''}`);
    return `${f.lose}${how}${run ? ` 준우승이다. 은화 ${run}닢을 받았다.` : ` ${ROUND[s.round]}에서 떨어졌다.`}${hurt}`;
  },
});

/* ---------- 매달: 대회 소식, 승부 조작이 들통남 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const c = C(g);
  for (const k of Object.keys(c.entered)) if (Number(k.split(':')[2]) < g.date.year) delete c.entered[k];
  const id = fairHere(g);
  if (id && fairOpen(g) && Array.isArray(g.news) && g.news.length < 6) g.news.push({ text: `이 달 ${placeName(here(g))}에서 ${J(FAIRS[id].name, '이/가')} 열린다.`, rel: 60 });
  const open = c.fixed.filter((x) => !x.exposed && mi(g) - (x.at ?? 0) < 60);
  if (!open.length) return;
  for (const x of open) {
    if (!rng.chance(x.gang ? 0.01 : 0.02)) continue;
    x.exposed = true;
    const pl = x.place, what = x.kind === 'arena' ? '투기장 싸움' : FAIRS[x.fair]?.name ?? '대회';
    deed(g, 'honest', -10, `${what}에서 져 주고 돈을 받은 일이 드러났다.`, pl);
    ban(g, 'fair', 60, pl); ban(g, 'arena', 60, pl);
    renown(g, -3);
    stress(g, 8);
    note(g, `${placeName(pl)} ${what}에서 져 준 일이 들통났다.`);
    logContest(g, `${x.year}년 ${placeName(pl)} ${what}의 승부 조작이 들통났다.`);
    if (Array.isArray(g.news)) g.news.unshift({ text: `${x.year}년 ${placeName(pl)} ${what}에서 ${J(g.player.name, '이/가')} 돈을 받고 져 주었다는 소문이 돈다.`, rel: 80 });
    break;
  }
});
