// 시험 보기: 학원 입학 시험, 기사 서임 시험, 관리 시험, 길드 장인 시험 (학년 시험은 academy.js가 같은 틀을 쓴다)
// 정직하게 보거나, 커닝을 하거나, 시험관을 매수한다. 들키면 몇 해 동안 시험을 못 보고, 뇌물이 죄인 나라에서는 법정에 선다.
import { ACTIONS } from '../actions.js';
import { J } from '../narrative/text.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check, spend, canSpend } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { makePerson, byId } from '../npc.js';
import { remember, rel } from '../relations.js';
import { deed } from '../repute/index.js';
import { realmOf } from '../realms/index.js';
import { playerPower } from '../adventure/combat.js';
import { takeJob } from '../jobs.js';
import { FACTIONS } from '../factions.js';
import { courtState, disgraced } from '../court/index.js';
import { LAWS, openCase, askTrial } from '../law/index.js';
import { knownAs } from '../childhood/state.js';
import { SS, ACADEMIES, OFFICIAL, GUILD_TOWNS, MASTER_TRADES, KNIGHT_SEATS, KIND_NAME, BRIBE_COST, clamp, mi, slog, placeName } from './state.js';

export const here = (g) => L(g).place;
export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.over;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 53) ^ Math.imul(mi(g) * 37 + salt + 29, 2654435761)) | 0 });
const knightFac = (g) => L(g).fac?.knights ?? null;

/* ---------- 이 고장에서 볼 수 있는 시험 ---------- */
// why가 있으면 지금은 볼 수 없다 (까닭)
export function examsHere(g) {
  const pl = here(g), S = SS(g), out = [], age = playerAge(g), y = g.date.year, sk = g.player.skills;
  const gate = (kind, key = kind) => ((S.ban[kind] ?? 0) > mi(g) ? `${Math.max(1, Math.ceil((S.ban[kind] - mi(g)) / 12))}년 동안 시험장에 들어갈 수 없다` : S.last[key] === y ? '올해는 이미 보았다' : null);
  if (ACADEMIES[pl] && !S.acad && !S.titles.academy && age >= 15 && age <= 24) out.push({ kind: 'academy', label: `${ACADEMIES[pl].name} 입학 시험`, why: gate('academy') });
  const k = knightFac(g);
  if (KNIGHT_SEATS[pl] && k?.member && k.rank === 1 && k.order === pl && L(g).job?.id === 'knight' && !S.titles.knight) {
    out.push({ kind: 'knight', label: `${KNIGHT_SEATS[pl]} 서임 시험`, why: gate('knight') ?? (age < 18 ? '열여덟 살이 되어야 한다' : (sk.sword ?? 0) < 40 ? '검이 아직 서툴다 (검술 40)' : null) });
  }
  if (OFFICIAL[pl] && !S.titles.official && age >= 16 && (sk.letters ?? 0) >= 20) {
    out.push({ kind: 'official', label: OFFICIAL[pl].name, why: gate('official') ?? (pl === 'leocast' && y % 2 ? '왕국 관리 시험은 두 해에 한 번, 짝수 해에만 열린다' : null) });
  }
  if (pl in GUILD_TOWNS && age >= 20) {
    for (const [t, T] of Object.entries(MASTER_TRADES)) {
      if ((sk[t] ?? 0) < 45 || S.titles.master?.[t]) continue;
      out.push({ kind: 'master', trade: t, label: `${T.guild} 장인 시험`, why: gate('master', `master_${t}`) });
    }
  }
  return out;
}
export const examOpen = (g) => examsHere(g).some((e) => !e.why);

/* ---------- 응시료 ---------- */
export const examFee = (g, kind, place) => ({ academy: 2, finals: 0, knight: 0, official: 5, master: 20 + (GUILD_TOWNS[place] ?? 0) * 2 }[kind] ?? 0);
export const bribeCost = (g, kind, place) => Math.round(BRIBE_COST[kind] * (realmOf(place) === 'free' ? 0.8 : 1) * (kind === 'master' && GUILD_TOWNS[place] ? 1.3 : 1));
const bribeLaw = (place) => LAWS[realmOf(place)]?.bribe ?? 0;

/* ---------- 점수 ---------- */
const noise = (rng, n) => rng.int(-n, n);
function scoreOf(g, rng, s) {
  const p = g.player, sk = p.skills, S = SS(g);
  if (s.kind === 'academy') {
    let v = (sk.letters ?? 0) * 0.7 + p.stats.int * 0.4 + noise(rng, 10);
    if (knownAs(g) === 'bookish') v += 4;
    if (g.flags?.child_recommend === true) v += 8;
    return v;
  }
  if (s.kind === 'official') {
    const ac = S.titles.academy;
    return (sk.letters ?? 0) * 0.6 + p.stats.int * 0.4 + (ac ? (ac.honors ? 15 : 10) : 0) + noise(rng, 12);
  }
  if (s.kind === 'master') {
    const T = MASTER_TRADES[s.trade];
    return (sk[s.trade] ?? 0) * 0.8 + (p.stats[T.stat] ?? 30) * 0.2 + (g.craft?.fame?.[s.trade] ?? 0) / 10 + noise(rng, 10);
  }
  if (s.kind === 'finals') {
    const A = S.acad;
    return (A?.work ?? 0) * 4 + (sk.letters ?? 0) * 0.4 + p.stats.int * 0.3 + noise(rng, 10);
  }
  return 0;
}
export function passMark(kind, place, trade) {
  if (kind === 'academy') return ACADEMIES[place]?.pass ?? 34;
  if (kind === 'finals') return ACADEMIES[place]?.finals ?? 40;
  if (kind === 'official') return OFFICIAL[place]?.pass ?? 44;
  if (kind === 'master') return 52 + (GUILD_TOWNS[place] ?? 0);
  return 0;
}
// 기사 서임 시험은 세 마당: 마상 창 시합, 검술 대련, 밤샘 맹세
function knightRounds(g, rng, extra = 0) {
  const p = g.player;
  const joust = check(rng, p.stats.agi * 0.3 + p.stats.str * 0.3 + (p.skills.sword ?? 0) * 0.4, 42);
  const sword = check(rng, playerPower(g), 46);
  const vigil = check(rng, p.stats.wil, 34);
  return { joust, sword, vigil, n: joust + sword + vigil + extra };
}

/* ---------- 동문 ---------- */
const ALUM_JOB = { academy: 'apprentice', knight: 'guard', official: 'merchant', finals: 'apprentice' };
const MASTER_JOB = { smithing: 'smith', cooking: 'cook', herbs: 'herbalist', trade: 'merchant' };
export function addAlumni(g, rng, n, cls, place, job) {
  const S = SS(g), age = playerAge(g), made = [];
  const taken = new Set(g.people.filter((q) => q.alive && q.known).map((q) => `${q.name} ${q.lastName}`));
  for (let i = 0; i < n; i++) {
    let p = makePerson(rng, { ageMonths: Math.max(15, age + rng.int(-2, 3)) * 12 + rng.int(0, 11), job });
    for (let t = 0; t < 6 && taken.has(`${p.name} ${p.lastName}`); t++) p = makePerson(rng, { ageMonths: Math.max(15, age + rng.int(-2, 3)) * 12, job });
    taken.add(`${p.name} ${p.lastName}`);
    p.place = place; p.known = true; p.affection = rng.int(6, 20);
    g.people.push(p);
    rel(p);
    const fate = rng.chance(0.38) ? 'rise' : rng.chance(0.4) ? 'fall' : 'plain';
    const rival = i === 0 && n >= 2 && rng.chance(0.5);
    if (rival) p.affection = -6;
    remember(g, p, `${placeName(place)}에서 ${cls}을 함께 했다`, rival ? -1 : 1, { tag: 'school', recall: `${cls} 동기였던 일` });
    S.alumni.push({ id: p.id, cls, year: g.date.year, place, fate, fateAt: mi(g) + rng.int(24, 150), status: null, rival, helped: false, pleaded: false, with: g.player.name });
    made.push(p);
  }
  if (S.alumni.length > 14) S.alumni.splice(0, S.alumni.length - 14);
  return made;
}
export const aliveAlumni = (g) => SS(g).alumni.map((a) => ({ a, p: byId(g, a.id) })).filter((x) => x.p && x.p.alive);

/* ---------- 시험 치르기 ---------- */
export function record(g, s, result, how) {
  const S = SS(g);
  S.exams.push({ kind: s.kind, place: s.place, year: g.date.year, result, how, trade: s.trade ?? null });
  if (S.exams.length > 16) S.exams.shift();
  if (s.kind !== 'finals') S.last[s.kind === 'master' ? `master_${s.trade}` : s.kind] = g.date.year;
  if (result === 'fail' || result === 'caught') S.tries[s.kind] = (S.tries[s.kind] ?? 0) + 1;
}
const examName = (s) => (s.kind === 'master' ? `${MASTER_TRADES[s.trade].guild} 장인 시험` : s.kind === 'academy' ? `${ACADEMIES[s.place]?.name ?? '학원'} 입학 시험` : s.kind === 'official' ? OFFICIAL[s.place]?.name ?? '관리 시험' : s.kind === 'knight' ? `${KNIGHT_SEATS[s.place] ?? '기사단'} 서임 시험` : KIND_NAME[s.kind]);

// 들켰다: 몇 해 시험 금지, 평판, 뇌물이 죄인 나라에서는 재판
function caught(g, rng, s, how) {
  const S = SS(g);
  record(g, s, 'caught', how);
  S.ban[s.kind === 'finals' ? 'academy' : s.kind] = mi(g) + 36;
  stress(g, 12);
  deed(g, 'honest', how === 'bribe' ? -7 : -5, `${J(g.player.name, '이/가')} ${examName(s)}에서 ${how === 'bribe' ? '시험관에게 돈을 찔러 주다 들켰다' : '부정을 저지르다 들켰다'}더라`, s.place);
  slog(g, `${placeName(s.place)}: ${examName(s)}에서 ${how === 'bribe' ? '매수' : '부정'}가 들켰다.`);
  let tail = '';
  if (how === 'bribe' && bribeLaw(s.place) < 0) {
    askTrial(g, openCase(g, { role: 'accused', charge: 'fraud', other: { id: null, name: '시험관' }, guilty: true, evidence: 55, place: s.place }));
    tail = ' 여기서는 시험관에게 돈을 내미는 것 자체가 죄다. 법정에 서야 한다.';
  }
  if (s.kind === 'finals' && S.acad) { S.acad.state = 'expelled'; tail += ` ${ACADEMIES[S.acad.place]?.name ?? '학원'}에서 쫓겨났다.`; chron(g, `${g.player.name}, 시험 부정으로 학원에서 쫓겨나다.`, 30); }
  return tail;
}

// 붙었다: 시험마다 얻는 것
function passed(g, rng, s, top) {
  const S = SS(g), pl = s.place, nm = g.player.name;
  record(g, s, top ? 'top' : 'pass', s.how);
  if (s.how !== 'honest') S.hidden.push({ kind: s.kind, at: mi(g), place: pl, how: s.how, trade: s.trade ?? null });
  if (s.kind === 'academy') {
    const A = ACADEMIES[pl];
    const scholar = top || (g.flags?.child_recommend === true && pl !== 'eisen');
    if (!scholar && !spend(g, A.fee)) {
      slog(g, `${A.name}에 붙었지만 수업료가 없어 들어가지 못했다.`);
      return `이름이 붙은 방에 내 이름이 있었다. 그런데 첫해 수업료 은화 ${A.fee}닢이 없었다. 서기는 "내년에도 붙으면 되지요" 하고 다음 사람을 불렀다.`;
    }
    S.acad = { place: pl, year: g.date.year, grade: 1, work: 0, fails: 0, scholar, away: 0, paidYear: g.date.year, state: 'enrolled' };
    if (scholar && g.flags?.child_recommend === true) g.flags.child_recommend = 'used';
    const mates = addAlumni(g, rng, 3, A.name, pl, ALUM_JOB.academy);
    note(g, `${A.name}에 ${scholar ? '장학생으로 ' : ''}들어갔다.`);
    chron(g, `${nm}, ${A.name}에 ${scholar ? '장학생으로 ' : ''}들어가다.`, 40);
    slog(g, `${A.name} 입학${scholar ? ' (장학생)' : ''}.`);
    return `${A.name}의 문이 열렸다.${scholar ? ' 장학생이다. 수업료는 학원이 댄다. 대신 성적이 떨어지면 장학금도 끊긴다.' : ` 첫해 수업료 은화 ${A.fee}닢을 냈다.`} 기숙사 방을 같이 쓸 ${mates.map((p) => p.name).join(', ')}와 인사를 나누었다.${A.noble && !scholar ? '' : A.noble ? ' 비단옷 사이에서 내 옷만 무명이었다.' : ''}`;
  }
  if (s.kind === 'knight') {
    const k = knightFac(g);
    if (k) { k.rank = Math.max(k.rank, 2); k.merit = Math.max(k.merit ?? 0, FACTIONS.knights.merit[2]); }
    g.player.title = '경';
    L(g).renown = (L(g).renown ?? 0) + (top ? 7 : 5);
    S.titles.knight = { place: pl, year: g.date.year };
    const mates = addAlumni(g, rng, 2, '서임', pl, ALUM_JOB.knight);
    note(g, `${KNIGHT_SEATS[pl]}에서 서임받아 기사가 되었다.`);
    chron(g, `${nm}, 서임 시험을 거쳐 ${KNIGHT_SEATS[pl]}의 정기사가 되다.`, 60);
    slog(g, `${KNIGHT_SEATS[pl]} 서임.`);
    const both = mates.length >= 2 ? `${J(mates[0].name, '과/와')} ${mates[1].name}` : mates[0]?.name ?? '동기';
    return `세 마당을 지나 무릎을 꿇었다. 칼등이 어깨를 두 번 두드렸다. "일어나라, ${nm} 경." 같은 날 서임받은 ${J(both, '이/가')} 내 등을 쳤다. 오늘부터 이름 앞에 경이 붙는다.`;
  }
  if (s.kind === 'official') {
    S.titles.official = { place: pl, year: g.date.year, top: !!top };
    const mates = addAlumni(g, rng, 2, '급제', pl, ALUM_JOB.official);
    L(g).renown = (L(g).renown ?? 0) + (top ? 6 : 3);
    chron(g, `${nm}, ${OFFICIAL[pl].name}에 ${top ? '장원으로 ' : ''}급제하다.`, top ? 80 : 40);
    slog(g, `${OFFICIAL[pl].name} ${top ? '장원' : '급제'}.`);
    note(g, `${OFFICIAL[pl].name}에 ${top ? '장원으로 ' : ''}급제했다.`);
    const who = mates.map((p) => p.name).join(', ');
    if (pl === 'leocast') {
      const c = courtState(g);
      c.standing = clamp(c.standing + (top ? 20 : 12), 0, 100);
      if (!disgraced(g) && c.office < (top ? 1 : 0)) queueScene(g, 'school_appoint', { place: pl, level: top ? 1 : 0 }, { first: true });
      return `${top ? '방의 맨 위에 내 이름이 있었다. 장원이다.' : '방의 가운데쯤에 내 이름이 있었다.'} 같은 해 붙은 ${who}와 술잔을 부딪쳤다. 궁정 사람들이 내 이름을 한 번은 들어 보았을 것이다.`;
    }
    g.player.money += top ? 30 : 20;
    return `${top ? '제국 관리 명부의 첫 줄에 내 이름이 적혔다.' : '제국 관리 명부에 내 이름이 적혔다.'} 첫해 녹봉으로 은화 ${top ? 30 : 20}닢을 받았다. 같은 해 붙은 ${who}와는 앞으로 서류로 자주 만날 것이다.`;
  }
  if (s.kind === 'master') {
    const T = MASTER_TRADES[s.trade];
    (S.titles.master ??= {})[s.trade] = { place: pl, year: g.date.year };
    if (g.craft?.fame) g.craft.fame[s.trade] = clamp((g.craft.fame[s.trade] ?? 0) + (top ? 20 : 14), 0, 100);
    L(g).renown = (L(g).renown ?? 0) + 3;
    gainSkill(g, s.trade, 1, T.stat);
    addAlumni(g, rng, 2, `${T.guild} 시험`, pl, MASTER_JOB[s.trade]);
    note(g, `${T.guild}의 장인이 되었다.`);
    chron(g, `${nm}, ${placeName(pl)} ${T.guild}의 장인 시험에 붙다.`, 40);
    slog(g, `${T.guild} 장인 시험 합격${top ? ' (조합장들이 일어나 박수를 쳤다)' : ''}.`);
    return `${J(T.work, '을/를')} 조합장들 앞에 내놓았다. 늙은 조합장이 한참을 들여다보다 고개를 끄덕였다.${top ? ' 다른 조합장들이 자리에서 일어났다.' : ''} ${T.guild}의 장인 명부에 내 이름이 들어갔다. 이제 내 물건에 조합의 표를 찍을 수 있다.`;
  }
  return '';
}

const FAIL_LINES = {
  academy: ['방에 내 이름은 없었다.', '문제 셋 가운데 하나는 무슨 말인지도 몰랐다.'],
  knight: ['말에서 떨어지는 순간 하늘이 보였다.', '기사단장이 고개를 저었다. "한 해 더 종자 밥을 먹어라."'],
  official: ['방을 위에서 아래로 세 번 읽었다. 내 이름은 없었다.', '붓을 쥔 손이 시험장 문을 나서고도 한참 떨렸다.'],
  master: ['조합장 하나가 내 물건을 뒤집어 보고 말없이 내려놓았다.', '"솜씨는 있는데 아직 장인의 것은 아니오." 조합장이 말했다.'],
  finals: ['교수가 시험지를 돌려주며 아무 말도 하지 않았다.', '성적표 맨 아래에 내 이름이 있었다.'],
};
const RETRY = (n) => (n >= 4 ? ` 벌써 ${n}번째 낙방이다. 고향에서는 이제 묻지도 않는다.` : n === 3 ? ' 세 번째 낙방이다. 거울 속 얼굴이 낯설었다.' : n === 2 ? ' 두 번째다. 내년에 또 보면 된다고, 스스로에게 말했다.' : '');

export function takeExam(g, rng, s, how) {
  const S = SS(g), pl = s.place;
  s.how = how;
  tired(g, s.kind === 'knight' ? 12 : 6);
  if (s.kind === 'finals') S.acad && (S.acad.lastFinals = g.date.year);
  // 시험관 매수
  if (how === 'bribe') {
    const cost = bribeCost(g, s.kind, pl);
    if (!spend(g, cost)) return `시험관에게 내밀 은화 ${cost}닢이 없었다. 그냥 시험장에 들어가지도 못하고 돌아섰다.`;
    S.bribed = (S.bribed ?? 0) + 1;
    const ok = rng.chance(clamp(0.55 + bribeLaw(pl) + (s.kind === 'knight' ? -0.15 : 0), 0.08, 0.9));
    if (!ok) return `은화 ${cost}닢을 싼 보자기를 시험관의 소매에 밀어 넣었다. 시험관이 보자기를 높이 들어 모두에게 보였다.${caught(g, rng, s, how)}`;
    stress(g, 3);
    if (s.kind === 'finals') { S.hidden.push({ kind: 'finals', at: mi(g), place: pl, how, trade: null }); return `교수는 보자기를 서랍에 넣고 내 시험지를 펴 보지도 않았다. ${finalsResult(g, rng, passMark('finals', pl) + 6, passMark('finals', pl))}`; }
    const top = rng.chance(0.15);
    return `시험관은 보자기의 무게를 손끝으로 가늠하고, 내 이름을 한 번 소리 내어 읽었다. ${passed(g, rng, s, top)}`;
  }
  const fee = examFee(g, s.kind, pl);
  if (fee && !spend(g, fee)) return `응시료 은화 ${fee}닢이 없었다. 접수대 앞에서 발길을 돌렸다.`;
  let pre = '';
  if (how === 'cheat') {
    const catchP = clamp(0.28 - g.player.stats.sen / 400 - g.player.stats.agi / 500 + (realmOf(pl) === 'valhart' ? 0.12 : 0) + (realmOf(pl) === 'dwarf' ? 0.08 : 0), 0.08, 0.5);
    if (rng.chance(catchP)) {
      const how2 = s.kind === 'knight' ? '상대 말의 안장끈을 몰래 풀다가 종자 하나에게 들켰다.' : s.kind === 'master' ? '남이 만든 물건을 내 것으로 내놓았다가, 진짜 만든 사람이 시험장에 나타났다.' : '소매 속 쪽지가 바닥에 떨어졌다. 시험관이 그것을 주워 들었다.';
      return `${how2}${caught(g, rng, s, how)}`;
    }
    pre = s.kind === 'knight' ? '상대 말의 안장끈을 미리 느슨하게 해 두었다. ' : s.kind === 'master' ? '이름난 장인의 물건을 몰래 사서 내 것인 양 손을 보았다. ' : '소매 속 쪽지를 몇 번 훔쳐보았다. ';
  }
  if (s.kind === 'knight') {
    const r = knightRounds(g, rng, how === 'cheat' ? 1 : 0);
    const lines = `${r.joust ? '마상 창 시합에서 상대를 말에서 떨어뜨렸다.' : '마상 창 시합에서 창이 빗나갔다.'} ${r.sword ? '검술 대련에서 시험관 기사의 목검을 쳐냈다.' : '검술 대련에서 밀렸다.'} ${r.vigil ? '예배당에서 밤을 새우며 맹세를 외웠다. 새벽까지 무릎을 꿇은 채였다.' : '밤샘 맹세 도중 깜빡 졸았다. 사제가 헛기침을 했다.'}`;
    if (r.n >= 2) return `${pre}${lines} ${passed(g, rng, s, r.n >= 3 && how === 'honest')}`;
    record(g, s, 'fail', how);
    stress(g, 8);
    return `${pre}${lines} ${rng.pick(FAIL_LINES.knight)}${RETRY(S.tries.knight ?? 0)}`;
  }
  const score = scoreOf(g, rng, s) + (how === 'cheat' ? 15 : 0), mark = passMark(s.kind, pl, s.trade);
  if (s.kind === 'finals') return pre + finalsResult(g, rng, score, mark);
  if (score >= mark) return pre + passed(g, rng, s, score >= mark + 16);
  record(g, s, 'fail', how);
  stress(g, s.kind === 'official' ? 10 : 6);
  gainStat(g, 'wil', 0.3);
  if (s.kind === 'master') gainSkill(g, s.trade, 0.5, MASTER_TRADES[s.trade].stat);
  else gainSkill(g, 'letters', 0.5, 'int');
  return `${pre}${rng.pick(FAIL_LINES[s.kind] ?? FAIL_LINES.academy)}${score >= mark - 5 ? ' 몇 점 차이였다고 한다.' : ''}${RETRY(S.tries[s.kind] ?? 0)}`;
}

// 학년 시험 결과 (academy.js의 학원 생활과 이어진다)
let finalsHook = null;
export const setFinals = (fn) => { finalsHook = fn; };
function finalsResult(g, rng, score, mark) { return finalsHook ? finalsHook(g, rng, score, mark) : ''; }

/* ---------- 행동과 장면 ---------- */
ACTIONS.push({
  id: 'school_exam', name: '시험 보기', icon: 'scroll',
  desc: '이 고장에서 열리는 시험에 원서를 낸다. 학원 입학, 기사 서임, 관리 시험, 길드 장인 시험. 한 해에 한 번씩 볼 수 있다.',
  available: (g) => free(g) && !sceneQueued(g, 'school_exam') && !sceneQueued(g, 'school_take') && examOpen(g),
  run(g) {
    queueScene(g, 'school_exam', { place: here(g) }, { first: true });
    return `${placeName(here(g))}의 관청 앞 게시판에서 시험 공고를 읽었다.`;
  },
});

defineScene('school_exam', {
  title: () => '시험 공고',
  text: (g) => {
    const list = examsHere(g);
    const shut = list.filter((e) => e.why).map((e) => `${e.label}: ${e.why}`);
    return `게시판에 공고가 붙어 있다. ${list.filter((e) => !e.why).map((e) => e.label).join(', ')}.${shut.length ? ` (${shut.join(' / ')})` : ''} 어느 시험에 원서를 낼까.`;
  },
  choices: (g, s) => {
    if (here(g) !== s.place || !free(g)) return [];
    const open = examsHere(g).filter((e) => !e.why);
    if (!open.length) return [];
    return [...open.map((e) => ({ label: `${e.label}${examFee(g, e.kind, s.place) ? ` (응시료 은화 ${examFee(g, e.kind, s.place)}닢)` : ''}`, key: e.kind === 'master' ? `master:${e.trade}` : e.kind })), { label: '그만둔다', key: 'none' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '공고문을 끝까지 읽고 돌아섰다. 다음 해에도 공고는 붙을 것이다.';
    const [kind, trade] = key.split(':');
    const e = examsHere(g).find((x) => x.kind === kind && (x.trade ?? null) === (trade ?? null) && !x.why);
    if (!e || here(g) !== s.place) return '그 시험은 이제 원서를 받지 않는다고 했다.';
    queueScene(g, 'school_take', { exam: kind, trade: trade ?? null, place: s.place }, { first: true });
    return `${e.label}에 원서를 냈다. 접수원이 번호표를 건넸다.`;
  },
});

const PREP = {
  academy: (g, s) => `${ACADEMIES[s.place].name}의 입학 시험장. 긴 책상에 수십 명이 앉았다. ${ACADEMIES[s.place].sum}`,
  knight: (g, s) => `${KNIGHT_SEATS[s.place]}의 연병장. 마상 창 시합, 검술 대련, 예배당에서의 밤샘 맹세. 세 마당 가운데 둘을 넘어야 한다.`,
  official: (g, s) => `${OFFICIAL[s.place].name}의 시험장. ${OFFICIAL[s.place].sum} 옆자리 사람은 벌써 세 번째라고 했다.`,
  master: (g, s) => `${MASTER_TRADES[s.trade].guild}의 장인 시험. ${J(MASTER_TRADES[s.trade].work, '을/를')} 만들어 조합장들 앞에 내놓아야 한다.`,
};
// 장면 자료의 kind는 장면 이름이라 시험 종류는 exam에 둔다
const ex = (s) => ({ kind: s.exam, trade: s.trade ?? null, place: s.place });
const stillOpen = (g, e) => here(g) === e.place && examsHere(g).some((x) => x.kind === e.kind && (x.trade ?? null) === e.trade && !x.why);
defineScene('school_take', {
  title: (g, s) => examName(ex(s)),
  text: (g, s) => { const e = ex(s), n = SS(g).tries[e.kind] ?? 0; return `${PREP[e.kind](g, e)}${n ? ` 이 시험은 벌써 ${n}번 떨어졌다.` : ''}`; },
  choices: (g, s) => {
    const e = ex(s);
    if (!free(g) || !stillOpen(g, e)) return [];
    const fee = examFee(g, e.kind, e.place), cost = bribeCost(g, e.kind, e.place);
    const out = [];
    if (canSpend(g, fee)) out.push({ label: '정직하게 본다', key: 'honest' });
    if (canSpend(g, fee)) out.push({ label: e.kind === 'knight' ? '상대의 안장끈에 손을 쓴다' : e.kind === 'master' ? '남의 솜씨를 빌려 낸다' : '소매에 쪽지를 숨겨 간다', key: 'cheat' });
    if (canSpend(g, cost)) out.push({ label: `시험관을 매수한다 (은화 ${cost}닢)`, key: 'bribe' });
    out.push({ label: '시험장에 들어가지 않는다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '시험장 문 앞에서 돌아섰다. 원서는 접수대에 그대로 남았다.';
    const e = ex(s);
    if (!stillOpen(g, e)) return '그 시험은 이미 끝났다.';
    return takeExam(g, rng, e, key);
  },
});

// 관리 시험 급제 뒤 궁정 자리
defineScene('school_appoint', {
  title: () => '급제자의 자리',
  text: (g, s) => (s.level >= 1 ? '궁정에서 사람이 왔다. 장원 급제자에게는 서기관 자리를 준다는 것이 오랜 관례라고 했다. 문서를 읽는 사람이 비밀을 안다.' : '궁정에서 사람이 왔다. 급제자는 시종으로 궁정에 첫발을 딛는다. 녹봉은 적지만 왕궁 안을 걸을 수 있다.'),
  choices: (g, s) => {
    const c = courtState(g);
    if (here(g) !== 'leocast' || L(g).travel || isJailed(g) || disgraced(g) || c.office >= s.level) return [];
    return [{ label: '받아들인다', key: 'yes' }, { label: '사양한다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const c = courtState(g);
    if (key === 'no') return '정중히 사양했다. 급제자의 이름은 명부에 남는다. 언젠가 다시 찾을 것이다.';
    if (here(g) !== 'leocast' || disgraced(g) || c.office >= s.level) return '자리는 이미 다른 사람에게 갔다.';
    c.office = s.level;
    if (L(g).job?.id !== 'courtier') takeJob(g, 'courtier');
    note(g, `급제자로 궁정 ${s.level >= 1 ? '서기관' : '시종'}이 되었다.`);
    return s.level >= 1 ? '서기관의 깃펜과 인장을 받았다. 시험장에서 쓰던 붓보다 무거웠다.' : '시종의 푸른 제복을 받았다. 급제자라는 말이 등 뒤에서 몇 번 들렸다.';
  },
});

export { examName };
