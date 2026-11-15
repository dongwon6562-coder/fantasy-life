// 복무: 입대, 훈련(일하러 가기), 진급, 병영의 나날, 징집, 복무 기한과 퇴역, 탈영과 추적.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { registerJob, takeJob, doWork, WORK } from '../jobs.js';
import { leaveJob, PLACES } from '../places.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, stress, tired, check, spend, canSpend } from '../adventure/core.js';
import { queueFight } from '../adventure/fight.js';
import { leadership } from '../war/battle.js';
import { isJailed, jail, reportCrime } from '../crime.js';
import { realmOf } from '../realms/index.js';
import { atWar } from '../world.js';
import { J } from '../narrative/text.js';
import { A, RANKS, MERIT, PAY, UNITS, BARRACKS, TERM, mi, enlisted, onCampaign, captive, rankOf, rankName, isNoble, addMerit, logArmy, pickOf } from './core.js';

/* ---------- 일자리: 왕국군 ---------- */
// places는 비워 둔다: 일자리 게시판이 아니라 "입대하기"로만 들어온다. 일은 맡은 병영(job.place)에서 한다.
registerJob('soldier', {
  name: '왕국군', places: [], skill: 'sword', stat: 'str', stat2: 'wil', wage: PAY, npcJob: 'guard', lodging: 'barracks',
  ranks: RANKS,
  rankOf: (g) => rankOf(g),
  title: (g) => `${A(g).service?.unit ?? '왕국군'} ${rankName(g)}`,
  promote: (g, rk) => `${J(RANKS[rk], '으로/로')} 올랐다. 품삯도 올랐다.`,
  work(g, rng) {
    const s = A(g).service;
    if (!s) { leaveJob(g); return '병영 명부에서 내 이름이 지워져 있었다.'; }
    const rk = s.rank;
    const lines = [
      ['새벽 나팔에 일어나 연병장을 스무 바퀴 돌았다. 토하는 신병이 셋이었다.', '창 대열을 맞췄다. 왼발이 늦다고 십인장의 막대기가 정강이를 때렸다.', '하루 종일 참호를 팠다. 이걸 왜 파는지는 아무도 말해 주지 않았다.', '짚 인형을 찌르고 또 찔렀다. 해가 질 무렵엔 창이 손바닥에 붙은 것 같았다.'],
      ['신병 둘에게 창 쥐는 법을 가르쳤다. 나도 일 년 전엔 저랬다.', '보초를 섰다. 성벽 너머 어둠이 길었다.', '행군 훈련에서 짐을 지고 삼십 리를 걸었다. 발바닥이 터졌다.', '고참들끼리 몰래 술을 돌렸다. 십인장도 못 본 척했다.'],
      ['열 명을 데리고 대열 훈련을 했다. 한 명이 늦으면 열 명이 다시 뛴다.', '부하의 군화가 다 닳았다. 보급관과 반나절을 싸워 새것을 받아 냈다.', '신병 하나가 밤마다 운다. 불러서 고향 이야기를 시켰다.', '백인장의 작전 회의에 처음 불려 갔다. 지도 위의 나무 말 하나가 우리 열 명이었다.'],
      ['백 명의 이름과 얼굴을 외웠다. 죽으면 편지를 써야 하니까.', '보급 장부를 맞췄다. 밀가루 스무 자루가 사라졌다.', '연병장에서 백인대 전체 대열을 지휘했다. 북소리에 맞춰 백 개의 창이 한꺼번에 내려왔다.', '귀족 출신 백인장들과 술자리를 했다. 그들은 내 말투를 흉내 냈다.'],
      ['천인장 막사에서 왕도의 전령을 맞았다. 국경의 소식이 좋지 않다.', '열 개 백인대를 사열했다. 깃발마다 다른 이야기가 있다.', '군법 회의를 열었다. 탈영병 둘의 목숨이 내 말 한마디에 달렸다.', '전사자 명단에 서명했다. 이름 하나하나를 소리 내어 읽었다.'],
    ][rk];
    const out = doWork(g, rng, WORK.soldier, { tire: 16, skillGain: 1.3, line: pickOf(rng, lines), wageMul: atWar(g) ? 1.2 : 1 });
    addMerit(g, 2 + (atWar(g) ? 1 : 0));
    if (rk >= 2) gainSkill(g, 'letters', 0.15, 'int');
    if (rk >= 2) gainStat(g, 'cha', 0.15);
    maybeBarracksEvent(g, rng);
    return out;
  },
});

/* ---------- 입대 ---------- */
const canEnlist = (g) => isAdult(g) && playerAge(g) >= 16 && playerAge(g) <= 42 && !enlisted(g) && !captive(g) && !traveling(g) && !isJailed(g) && BARRACKS.includes(L(g).place) && !L(g).fac?.knights?.member;
ACTIONS.push({
  id: 'army_enlist', name: '왕국군에 입대하기', icon: 'sword',
  desc: '레오니아 왕국군 모병소를 찾아간다. 세 해 동안 창을 들고, 품삯과 숙소를 받는다. 기사단과 달리 출신을 묻지 않는다.',
  available: (g) => canEnlist(g) && !sceneQueued(g, 'army_enlist'),
  run(g) { queueScene(g, 'army_enlist'); return '모병소 앞에 줄을 섰다.'; },
});
defineScene('army_enlist', {
  need: (g) => canEnlist(g),
  title: () => '모병소',
  text: (g) => {
    const d = A(g).deserted;
    if (d && !d.caught) return '모병관이 명부를 넘기다 손을 멈췄다. 내 이름 옆에 붉은 줄이 그어져 있다. 탈영병이다. 그는 천천히 고개를 들었다.';
    return `${PLACES[L(g).place].name} 성문 옆 모병소. 늙은 모병관이 내 팔뚝과 이를 살폈다. "세 해다. 창, 군화, 밥, 숙소, 그리고 품삯. 전쟁이 나면 어디든 간다. 도망치면 목을 맨다." 그는 서명할 자리에 손가락을 올려놓았다.${atWar(g) ? ' 벽에는 국경으로 떠날 백인대의 명단이 붙어 있다.' : ''}`;
  },
  choices: (g) => {
    const d = A(g).deserted;
    if (d && !d.caught) return [{ label: '모른 척 서명한다', key: 'sign' }, { label: '돌아서서 걷는다', key: 'none' }];
    return [{ label: '서명한다', key: 'sign' }, { label: '아직은 아니다', key: 'none' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '모병소를 나왔다. 줄 선 젊은이들이 나를 힐끔 보았다.';
    const d = A(g).deserted;
    if (d && !d.caught) {
      if (rng.chance(0.6)) { d.caught = true; jail(g, rng.int(3, 6)); return '모병관이 경비병을 불렀다. 탈영병이 제 발로 걸어 들어온 셈이었다.'; }
      return '모병관은 한참 나를 보다가 붉은 줄 위에 잉크를 쏟았다. "실수로군." 그는 새 장에 내 이름을 적었다. ' + enlist(g, rng);
    }
    return enlist(g, rng);
  },
});
export function enlist(g, rng, term = TERM) {
  const a = A(g);
  const unit = pickOf(rng, UNITS);
  takeJob(g, 'soldier');
  a.service = { unit, rank: 0, merit: 0, months: 0, place: L(g).place, term, since: mi(g), awol: 0 };
  L(g).job.lastRank = 0;
  g.player.money += 5;
  logArmy(g, `레오니아 왕국군 ${unit}에 병졸로 들어갔다.`);
  return `${unit}에 배속되었다. 입대금으로 은화 5닢을 받았다. 숙소의 짚 침상은 전 주인의 땀 냄새가 났다.`;
}

/* ---------- 진급 ---------- */
function promoteNeed(g, to) {
  const s = A(g).service;
  if (to === 1) return s.months >= 6 ? null : '복무 여섯 달';
  if (to === 2) return g.player.skills.sword >= 25 && s.months >= 12 ? null : '검술 25, 복무 한 해';
  if (to === 3) return leadership(g) >= 30 && (g.player.skills.letters ?? 0) >= 15 ? null : '지휘력과 글';
  if (to === 4) return leadership(g) >= 42 && L(g).renown >= 20 && A(g).battles >= 3 ? null : '지휘력, 이름, 세 번의 싸움';
  return 'x';
}
function checkPromotion(g) {
  const s = A(g).service;
  if (!s || s.rank >= 4 || sceneQueued(g, 'army_promote') || onCampaign(g)) return;
  const to = s.rank + 1;
  if (s.merit < MERIT[to] || promoteNeed(g, to)) return;
  queueScene(g, 'army_promote', { to });
}
defineScene('army_promote', {
  need: (g, s) => enlisted(g) && A(g).service.rank === s.to - 1,
  title: (g, s) => `${RANKS[s.to]} 자리`,
  text: (g, s) => {
    if (s.to === 1) return '십인장이 내 어깨를 툭 쳤다. "이제 신병 소리는 그만 들어도 되겠군." 고참병의 붉은 끈을 내밀었다.';
    if (s.to === 2) return '백인장이 막사로 불렀다. 십인장 하나가 열병으로 죽었다. "열 명을 맡아라. 그놈들이 살고 죽는 게 네 손에 달렸다." 부사관이 되는 것이다.';
    if (s.to === 3) return isNoble(g) || A(g).medals.length
      ? '천인장이 백인장의 투구를 내밀었다. "백 명이다. 평민 출신 백인장은 귀족 장교들이 반기지 않을 거다. 그래도 네가 적임이다."'
      : '백인장 자리가 비었다. 그 자리는 대개 귀족 자제가 산다. 임관금 은화 80닢이면 내 것이 될 수 있다. 아니면 전장에서 공을 세워 그 값을 대신해야 한다.';
    return '왕도에서 사람이 왔다. 천인장. 열 개 백인대, 천 명의 목숨. 왕국군에서 평민이 오를 수 있는 가장 높은 자리다.';
  },
  choices: (g, s) => {
    if (s.to === 3 && !isNoble(g) && !A(g).medals.length) return [
      ...(canSpend(g, 80) ? [{ label: '임관금 은화 80닢을 낸다', key: 'buy' }] : []),
      { label: '전장에서 공을 세워 오르겠다', key: 'wait' },
    ];
    return [{ label: '받는다', key: 'yes' }, { label: '지금 자리가 낫다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const a = A(g);
    if (key === 'wait' || key === 'no') { a.service.merit = Math.max(0, MERIT[s.to] - 40); return key === 'wait' ? '자리는 다른 사람이 샀다. 그 사람은 창 쥐는 법도 몰랐다.' : '지금 자리에 남았다. 동료들은 의아해했지만 반기기도 했다.'; }
    if (key === 'buy' && !spend(g, 80)) return '돈이 모자랐다. 자리는 다른 사람이 샀다.';
    a.service.rank = s.to;
    L(g).renown += s.to;
    if (s.to >= 3) logArmy(g, `왕국군 ${RANKS[s.to]}에 올랐다.`, 60);
    else note(g, `왕국군 ${RANKS[s.to]}이 되었다.`);
    return ['', '고참병의 붉은 끈을 팔에 맸다.', '십인장의 막대기를 받았다. 이제 내가 정강이를 때리는 쪽이다. 때리지 않기로 했다.', '백인장의 투구를 썼다. 백 명이 나를 보고 있었다.', '천인장의 깃발이 내 막사 앞에 섰다.'][s.to];
  },
});

/* ---------- 병영의 나날 ---------- */
const BARRACKS_EVENTS = [
  {
    id: 'bully', min: 0, max: 1, title: '고참의 장난',
    text: '고참 셋이 신병의 군화에 오줌을 쌌다. 신병은 열여섯 살이다. 다들 웃는다. 십인장은 등을 돌렸다.',
    choices: [{ label: '고참들 앞을 막아선다', key: 'stand' }, { label: '못 본 척한다', key: 'look' }, { label: '같이 웃는다', key: 'laugh' }],
    resolve(g, rng, key) {
      if (key === 'laugh') { stress(g, 2); return '같이 웃었다. 그날 밤 신병이 막사 구석에서 혼자 군화를 빨았다.'; }
      if (key === 'look') return '못 본 척했다. 다음 해 나도 고참이 된다.';
      if (check(rng, g.player.stats.str + g.player.skills.sword / 2, 40)) { addMerit(g, 6); return '고참 하나의 멱살을 잡았다. 셋은 투덜대며 물러났다. 신병은 그 뒤로 내 그림자처럼 따라다녔다.'; }
      g.player.injuries.push({ name: '고참들에게 맞은 갈비뼈', months: 1 }); stress(g, 8); return '셋을 당해 낼 수는 없었다. 갈비뼈에 금이 갔다. 그래도 신병의 군화는 그날 이후 무사했다.';
    },
  },
  {
    id: 'dice', min: 0, max: 4, title: '막사의 주사위',
    text: '보초가 끝난 밤, 막사 뒤에서 주사위판이 벌어졌다. 판돈이 꽤 쌓였다.',
    choices: [{ label: '은화 열 닢을 건다', key: 'bet' }, { label: '구경만 한다', key: 'watch' }],
    resolve(g, rng, key) {
      if (key === 'watch') return '밤새 구경했다. 보급병 하나가 석 달 치 품삯을 날렸다.';
      if (g.player.money < 10) return '주머니가 비어 구경만 했다.';
      if (rng.chance(0.45)) { g.player.money += 14; return '세 판을 내리 이겼다. 은화 14닢을 땄다. 진 놈들의 눈빛이 오래 따라왔다.'; }
      g.player.money -= 10; return '은화 열 닢을 잃었다. 주사위가 수상했지만 증거가 없었다.';
    },
  },
  {
    id: 'bandit_patrol', min: 0, max: 4, title: '도적 소탕',
    text: '근처 고갯길에서 상단 마차가 털렸다. 백인장이 우리 열 명을 골라 산으로 보냈다.',
    choices: [{ label: '앞장서서 산을 오른다', key: 'go' }, { label: '대열 뒤를 따른다', key: 'back' }],
    resolve(g, rng, key) {
      if (key === 'back') { addMerit(g, 3); return '앞선 동료들이 도적 소굴을 덮쳤다. 나는 마차 짐을 되찾아 날랐다.'; }
      addMerit(g, 10);
      queueFight(g, rng, { title: '고갯길의 도적', intro: '바위 뒤에서 도적들이 쏟아져 나왔다.', enc: { unit: 'bandit', count: rng.int(3, 5), leader: rng.chance(0.3) ? 'bandit_chief' : null }, reward: { money: 6, renown: 1 }, avoidLabel: '동료들 뒤로 물러난다' }, { first: true });
      return '도적들의 모닥불 연기를 찾아냈다.';
    },
  },
  {
    id: 'rations', min: 2, max: 4, title: '사라진 밀가루',
    text: '보급 장부와 창고가 맞지 않는다. 밀가루 스무 자루. 보급관이 웃으며 다가왔다. "다섯 자루 값은 자네 몫이네. 장부는 내가 맞추지."',
    choices: [{ label: '백인장에게 고한다', key: 'report' }, { label: '몫을 받는다', key: 'take' }, { label: '못 들은 걸로 한다', key: 'ignore' }],
    resolve(g, rng, key) {
      if (key === 'take') { g.player.money += 25; stress(g, 4); if (rng.chance(0.2)) { reportCrime(g, 'fraud', L(g).place, { mult: 0.6 }); addMerit(g, -40); return '은화 25닢을 받았다. 석 달 뒤 감찰관이 장부를 뒤졌다. 보급관은 내 이름도 댔다.'; } return '은화 25닢을 받았다. 그해 겨울, 부하들의 빵이 작아졌다.'; }
      if (key === 'ignore') return '장부를 덮었다. 다음 달엔 서른 자루가 사라졌다.';
      if (rng.chance(0.65)) { addMerit(g, 20); return '보급관은 군법 회의에 넘겨졌다. 부하들의 빵이 다시 커졌다.'; }
      stress(g, 10); addMerit(g, -10); return '보급관 뒤에는 천인장의 조카가 있었다. 고한 내가 한직으로 밀렸다.';
    },
  },
  {
    id: 'noble_officer', min: 1, max: 3, title: '귀족 장교',
    text: '새로 온 귀족 백인장이 연병장 한가운데서 늙은 고참병의 뺨을 때렸다. 인사가 늦었다는 이유다. 고참병은 스무 해를 복무했다.',
    choices: [{ label: '나서서 막는다', key: 'stop' }, { label: '참는다', key: 'bear' }],
    resolve(g, rng, key) {
      if (key === 'bear') { stress(g, 6); return '참았다. 그날 밤 고참병은 아무 말 없이 술만 마셨다.'; }
      if (isNoble(g) || rng.chance(0.35)) { addMerit(g, 8); L(g).renown += 1; return '백인장의 손목을 잡았다. 그는 내 눈을 보고 손을 내렸다. 병사들 사이에 내 이름이 돌았다.'; }
      addMerit(g, -25); stress(g, 10); return '하극상이라며 사흘을 영창에 갇혔다. 나올 때 병사들이 말없이 빵을 나눠 주었다.';
    },
  },
  {
    id: 'letter_home', min: 0, max: 4, title: '집에서 온 편지',
    text: '집에서 편지가 왔다. 글을 모르는 어머니가 마을 서기에게 불러 주어 쓴 편지다. 밀값이 올랐고, 지붕이 샌다고 했다. 마지막 줄은 "밥은 잘 먹느냐"였다.',
    choices: [{ label: '품삯을 모아 보낸다', key: 'send' }, { label: '답장만 쓴다', key: 'write' }],
    resolve(g, rng, key) {
      if (key === 'send') { const n = Math.min(20, g.player.money); g.player.money -= n; g.player.familyMoney = (g.player.familyMoney ?? 0) + n; stress(g, -8); return `은화 ${n}닢을 보냈다. 다음 편지에는 지붕을 고쳤다는 말이 있었다.`; }
      stress(g, -4); return '밤새 답장을 썼다. 전쟁 이야기는 빼고, 밥 이야기만 썼다.';
    },
  },
];
function maybeBarracksEvent(g, rng) {
  const a = A(g);
  if (mi(g) < a.cool || sceneQueued(g, 'army_event') || onCampaign(g) || !rng.chance(0.09)) return;
  const rk = rankOf(g);
  const pool = BARRACKS_EVENTS.filter((e) => rk >= e.min && rk <= e.max);
  if (!pool.length) return;
  a.cool = mi(g) + 3;
  queueScene(g, 'army_event', { ev: pickOf(rng, pool).id });
}
defineScene('army_event', {
  need: (g, s) => enlisted(g) && !!BARRACKS_EVENTS.find((e) => e.id === s.ev),
  title: (g, s) => BARRACKS_EVENTS.find((e) => e.id === s.ev).title,
  text: (g, s) => BARRACKS_EVENTS.find((e) => e.id === s.ev).text,
  choices: (g, s) => BARRACKS_EVENTS.find((e) => e.id === s.ev).choices,
  resolve: (g, rng, s, key) => BARRACKS_EVENTS.find((e) => e.id === s.ev).resolve(g, rng, key),
});

/* ---------- 징집 ---------- */
const LEONIA_PLACES = ['ern', 'harfen', 'verden', 'leocast', 'gruental'];
defineScene('army_press', {
  need: (g) => !enlisted(g) && !captive(g) && !isJailed(g) && !traveling(g) && LEONIA_PLACES.includes(L(g).place),
  title: () => '징집관',
  text: () => '광장에 북이 울렸다. 왕국군 징집관이 병사 넷을 데리고 와서 젊은이들의 이름을 부른다. 전쟁이다. 두 해 동안 창을 들 사람을 마을마다 정해진 수만큼 데려간다. 내 이름도 불렸다.',
  choices: (g) => [
    { label: '끌려간다', key: 'go' },
    ...(g.player.money >= 20 ? [{ label: '징집관 손에 은화 스무 닢을 쥐여 준다', key: 'bribe' }] : []),
    { label: '헛간 다락에 숨는다', key: 'hide' },
  ],
  resolve(g, rng, s, key) {
    A(g).pressCool = mi(g) + 24;
    if (key === 'bribe') { g.player.money -= 20; return '징집관은 은화를 세어 보고 명부에서 내 이름을 지웠다. 대신 옆집 막내가 끌려갔다.'; }
    if (key === 'hide' && check(rng, g.player.stats.agi + g.player.stats.sen, 60)) return '사흘을 다락에서 숨죽였다. 징집관은 다음 마을로 떠났다. 내 몫은 누군가가 대신 갔을 것이다.';
    const place = L(g).place;
    if (!BARRACKS.includes(place)) { L(g).place = 'harfen'; }
    const t = enlist(g, rng, 24);
    A(g).service.place = L(g).place;
    L(g).job.place = L(g).place;
    return `${key === 'hide' ? '다락 문이 열렸다. 끌려 나왔다. ' : ''}징집병 행렬에 섞여 ${PLACES[L(g).place].name} 병영으로 걸었다. ${t}`;
  },
});

/* ---------- 달마다: 복무 기한, 무단 이탈, 탈영 추적, 연금 ---------- */
export function desert(g, how) {
  const a = A(g);
  if (!a.service) return;
  const unit = a.service.unit;
  a.service = null;
  a.campaign = null;
  a.deserted = { year: g.date.year, at: mi(g), caught: false, unit };
  if (L(g).job?.id === 'soldier') leaveJob(g);
  stress(g, 12);
  logArmy(g, how === 'battle' ? `${unit}에서 싸움 한가운데 달아났다.` : `${unit}을 버리고 달아났다. 이제 탈영병이다.`, 30);
}
function discharge(g, text, veteran = true) {
  const a = A(g);
  const s = a.service;
  if (!s) return;
  if (veteran) {
    const years = Math.round((s.months / 12) * 10) / 10;
    const prev = a.veteran;
    const totalYears = (prev?.years ?? 0) + years;
    a.veteran = { rank: Math.max(s.rank, prev?.rank ?? 0), years: totalYears, unit: s.unit, year: g.date.year, pension: pensionOf(Math.max(s.rank, prev?.rank ?? 0), totalYears) };
  }
  a.service = null;
  if (L(g).job?.id === 'soldier') leaveJob(g);
  if (text) logArmy(g, text, veteran && s.rank >= 3 ? 50 : 0);
}
export const pensionOf = (rank, years) => (years < 3 ? 0 : Math.min(20, rank * 2 + Math.floor(years / 3)));

defineScene('army_term', {
  need: (g) => enlisted(g) && !onCampaign(g) && A(g).service.term <= 0,
  title: () => '복무를 마치다',
  text: (g) => `세 해가 지났다. 아니, 그보다 길었던 것 같다. ${A(g).service.unit}의 서기가 제대 증서를 내밀었다. 다시 서명하면 입대금을 두 배로 준다고 했다.`,
  choices: (g) => [{ label: '다시 서명한다', key: 'again' }, { label: '증서를 받고 떠난다', key: 'leave' }],
  resolve(g, rng, s, key) {
    const a = A(g);
    if (key === 'again') { a.service.term = TERM; g.player.money += 10; addMerit(g, 10); return '다시 서명했다. 입대금 은화 10닢. 막사의 짚 침상이 이제는 집 같았다.'; }
    const r = a.service.rank;
    discharge(g, `${J(RANKS[r], '으로/로')} 왕국군에서 물러났다.`);
    const p = a.veteran?.pension ?? 0;
    return `제대 증서를 받았다. 막사를 나서는데 신병들이 경례를 했다.${p ? ` 달마다 은화 ${p}닢의 군인 연금이 나온다.` : ''}`;
  },
});
ACTIONS.push({
  id: 'army_resign', name: '군직에서 물러나기', icon: 'home',
  desc: '백인장 이상은 기한 전에도 직을 내려놓을 수 있다. 연금이 나온다.',
  available: (g) => enlisted(g) && rankOf(g) >= 3 && !onCampaign(g) && !traveling(g),
  run(g) {
    const r = rankOf(g);
    discharge(g, `${J(RANKS[r], '으로/로')} 왕국군에서 물러났다.`);
    const p = A(g).veteran?.pension ?? 0;
    return `${RANKS[r]}의 깃발을 후임에게 넘겼다.${p ? ` 달마다 은화 ${p}닢의 연금이 나온다.` : ''}`;
  },
});

HOOKS.afterActions.push((g) => {
  const a = A(g);
  if (!a.service) return;
  // 일자리가 사라졌다: 감옥이면 쫓겨난 것, 아니면 버린 것
  if (L(g).job?.id !== 'soldier') {
    if (isJailed(g)) { const u = a.service.unit; a.service = null; a.campaign = null; logArmy(g, `옥에 갇히며 ${u}에서 쫓겨났다.`); return; }
    desert(g, 'quit');
    return;
  }
  checkPromotion(g);
});

HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const a = A(g);
  const life = L(g);
  const s = a.service;
  if (s) {
    s.months += 1;
    if (!a.campaign && !a.captive) s.term -= 1;
    // 맡은 병영을 석 달 넘게 비우면 탈영이다
    if (!a.campaign && !a.captive && (life.place !== s.place || life.travel)) s.awol += 1; else s.awol = 0;
    if (s.awol >= 3) { desert(g, 'awol'); return; }
    if (s.term <= 0 && !a.campaign && !a.captive && !sceneQueued(g, 'army_term')) queueScene(g, 'army_term', {}, { first: true });
  }
  if (a.veteran?.pension && !a.service) g.player.money += a.veteran.pension;
  // 탈영병 사냥: 레오니아 땅에 있으면 가끔 붙잡힐 뻔한다. 열 해가 지나면 잊힌다.
  const d = a.deserted;
  if (d && !d.caught) {
    if (g.date.year - d.year >= 10) { d.caught = true; note(g, '탈영병 수배가 풀렸다. 이제 아무도 그 일을 묻지 않는다.'); }
    else if (realmOf(life.place) === 'leonia' && !life.travel && !g.explore?.exp && !isJailed(g) && !sceneQueued(g, 'army_hunted') && rng.chance(atWar(g) ? 0.09 : 0.06)) queueScene(g, 'army_hunted');
  }
  // 징집: 전쟁 중, 레오니아 고을의 일 없는 젊은이
  if (!s && atWar(g) && isAdult(g) && playerAge(g) >= 16 && playerAge(g) <= 32 && !a.deserted && !life.travel && !g.explore?.exp && !isJailed(g) && mi(g) >= a.pressCool
    && LEONIA_PLACES.includes(life.place) && (!life.job || ['laborer', 'farmer'].includes(life.job.id)) && !life.fac?.knights?.member && !g.domain
    && !sceneQueued(g, 'army_press') && rng.chance(0.05)) queueScene(g, 'army_press');
});

defineScene('army_hunted', {
  need: (g) => !!A(g).deserted && !A(g).deserted.caught && !isJailed(g),
  title: () => '탈영병 수배',
  text: (g) => `주점 문간에 왕국군 헌병 둘이 섰다. 벽에 붙은 수배서에는 ${A(g).deserted.unit}의 탈영병 이름이 있다. 내 이름이다. 그중 하나가 나를 오래 보았다.`,
  choices: (g) => [
    ...(g.player.money >= 30 ? [{ label: '은화 서른 닢을 탁자에 올린다', key: 'bribe' }] : []),
    { label: '뒷문으로 달아난다', key: 'run' },
    { label: '순순히 손을 내민다', key: 'surrender' },
    { label: '칼을 뽑는다', key: 'fight' },
  ],
  resolve(g, rng, s, key) {
    const d = A(g).deserted;
    if (key === 'bribe') { g.player.money -= 30; return '헌병은 은화를 쓸어 담고 수배서를 떼어 갔다. 다음 고을에는 또 붙어 있을 것이다.'; }
    if (key === 'run') {
      if (check(rng, g.player.stats.agi + g.player.stats.sen / 2, 35)) { stress(g, 8); return '뒷문을 박차고 골목을 세 번 꺾었다. 숨이 턱에 닿았다. 따돌렸다.'; }
      d.caught = true; jail(g, rng.int(4, 8)); return '골목 끝에서 붙잡혔다. 탈영병은 매질을 당하고 옥에 갇힌다. 전쟁 중이었다면 목을 맸을 것이다.';
    }
    if (key === 'surrender') { d.caught = true; jail(g, rng.int(2, 5)); return '손을 내밀었다. 헌병이 뜻밖이라는 얼굴을 했다. 순순히 따른 탈영병은 형기가 짧다.'; }
    reportCrime(g, 'resist', L(g).place, { mult: 0.6 });
    queueFight(g, rng, { title: '헌병과의 싸움', intro: '헌병들이 칼을 뽑았다.', enc: { unit: 'army_mp', count: 2, leader: null }, reward: {}, avoidLabel: '칼을 버린다', avoidText: '칼을 버렸다. 붙잡혔다.' }, { first: true });
    return '탁자를 엎었다.';
  },
});

export { discharge, LEONIA_PLACES };
