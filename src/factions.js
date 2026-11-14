// 소속: 기사단, 모험가 길드(F~S), 은저울 상단, 성광교. 들어가기와 승급.
// 기사단·교단·상단은 "일"이기도 하다(jobs.js의 틀). 길드는 다른 일과 함께 가질 수 있는 등록증이다.
import { J } from './narrative/text.js';
import { ACTIONS } from './actions.js';
import { HOOKS } from './hooks.js';
import { me, playerAge, gainStat, gainSkill, family } from './game.js';
import { fullName } from './npc.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, up, gains, spend, check } from './adventure/core.js';
import { PLACES, placeOf, meetPlacePerson, placePerson } from './places.js';
import { registerJob, takeJob, doWork, WORK } from './jobs.js';
import { queueFight } from './adventure/fight.js';
import { playerPower } from './adventure/combat.js';

export const FACTIONS = {
  knights: {
    name: '기사단',
    seats: { verden: '베르덴 백작 기사단', leocast: '레오니아 왕국 기사단' },
    ranks: ['종자', '견습 기사', '정기사', '기사대장'],
    merit: [0, 60, 200, 520],
    sword: [0, 35, 50, 68],
    age: [0, 16, 19, 28],
  },
  church: {
    name: '성광교',
    seats: { harfen: '하르펜 성당', leocast: '왕도 대성당' },
    ranks: ['수련자', '수사', '사제', '주교'],
    merit: [0, 40, 140, 420],
    letters: [0, 25, 45, 65],
    age: [0, 16, 20, 35],
  },
  merchants: {
    name: '은저울 상단',
    seats: { harfen: '은저울 상단 본점', leocast: '은저울 상단 왕도 지점' },
    ranks: ['짐꾼', '점원', '행상', '지점장'],
    merit: [0, 30, 110, 320],
    trade: [0, 20, 40, 62],
    age: [0, 15, 18, 25],
  },
  guild: {
    name: '모험가 길드',
    seats: { harfen: '모험가 길드 하르펜 지부', leocast: '모험가 길드 왕도 지부' },
    ranks: ['F', 'E', 'D', 'C', 'B', 'A', 'S'],
    merit: [0, 15, 50, 120, 250, 450, 800],
    power: [0, 16, 28, 42, 58, 76, 95],
  },
};
export const fac = (g, id) => L(g).fac[id] ?? null;
export const guildRank = (g) => (fac(g, 'guild')?.member ? FACTIONS.guild.ranks[fac(g, 'guild').rank] : null);
export const factionSeat = (g, id) => FACTIONS[id].seats[L(g).place] ?? null;

// 화면에 보여 줄 소속 요약
export function memberships(g) {
  const out = [];
  for (const [id, F] of Object.entries(FACTIONS)) {
    const f = fac(g, id);
    if (!f?.member) continue;
    out.push(`${id === 'knights' ? F.seats[f.order] ?? F.name : F.name} ${F.ranks[f.rank]}${id === 'guild' ? '급' : ''}`);
  }
  return out;
}

/* ---------- 소속을 일로 등록 ---------- */
function facRank(id) { return (g) => fac(g, id)?.rank ?? 0; }

registerJob('knight', {
  name: '기사단', faction: 'knights', places: ['verden', 'leocast'], skill: 'sword', stat: 'str', stat2: 'wil',
  ranks: FACTIONS.knights.ranks, wage: [1, 3, 6, 10], npcJob: 'knight', lodging: 'barracks',
  rankOf: facRank('knights'),
  title: (g) => `${FACTIONS.knights.seats[fac(g, 'knights')?.order] ?? '기사단'} ${FACTIONS.knights.ranks[fac(g, 'knights')?.rank ?? 0]}`,
  work(g, rng) {
    const f = fac(g, 'knights');
    f.merit += f.order === 'leocast' ? 2 : 1;
    const lines = [
      ['선배 기사의 갑옷을 닦고 말을 돌봤다. 종자의 하루는 남의 하루다.', '훈련장 모래를 고르고, 목검을 백 번 휘둘렀다.', '기사단장의 말고삐를 잡고 영지 순찰을 따라갔다.'],
      ['견습 기사들과 대열을 맞춰 창을 내질렀다.', '영지 마을을 돌며 세금 징수를 호위했다.', '마상 훈련에서 두 번 떨어지고 세 번째에 버텼다.'],
      ['종자 둘을 거느리고 국경 쪽 마을을 순찰했다.', '백작의 연회에서 문을 지켰다. 귀족들의 웃음소리가 길었다.', '도적 소탕을 위한 작전 회의에 불려 갔다.'],
      ['기사들을 이끌고 훈련을 지휘했다.', '왕도에서 온 전령과 북부 전선의 소식을 나눴다.', '젊은 종자의 검을 고쳐 잡아 주었다. 오래전의 내가 떠올랐다.'],
    ][f.rank];
    const r = doWork(g, rng, WORK.knight, { tire: 16, skillGain: 1.3, line: rng.pick(lines), wageMul: f.order === 'leocast' ? 1.3 : 1 });
    if (rng.chance(0.04)) queueKnightMission(g, rng);
    return r;
  },
  promote(g, rk) {
    const f = fac(g, 'knights');
    const seat = FACTIONS.knights.seats[f.order];
    if (rk === 2) {
      L(g).renown += 5;
      g.player.title = '경';
      return `${seat}의 서임식. ${f.order === 'leocast' ? '왕의 대리인' : '베르덴 백작'}이 칼등으로 어깨를 두 번 두드렸다. "일어나라, ${g.player.name} 경." 이제 이름 앞에 경이 붙는다.`;
    }
    return `${seat}에서 ${J(FACTIONS.knights.ranks[rk], '으로/로')} 올랐다.`;
  },
});

registerJob('cleric', {
  name: '성광교', faction: 'church', places: ['harfen', 'leocast'], skill: 'letters', stat: 'wil', stat2: 'cha',
  ranks: FACTIONS.church.ranks, wage: [1, 2, 4, 8], npcJob: 'priest', lodging: 'barracks',
  rankOf: facRank('church'),
  title: (g) => `${FACTIONS.church.seats[L(g).job?.place] ?? '성광교'} ${FACTIONS.church.ranks[fac(g, 'church')?.rank ?? 0]}`,
  work(g, rng) {
    const f = fac(g, 'church');
    f.merit += 1;
    // 교단의 치유: 일할 때마다 가벼운 상처가 조금씩 낫는다
    const inj = g.player.injuries.find((i) => !i.mortal);
    if (inj) inj.months = Math.max(0, inj.months - 1);
    const lines = [
      ['새벽 기도에 나가고, 성당 바닥을 닦았다.', '경전을 베끼다 손가락에 쥐가 났다.', '구호소에서 빈민들에게 죽을 나눠 주었다.'],
      ['병자들의 상처를 씻고 성광의 축복을 빌었다.', '고해를 듣는 사제 곁에서 기록을 맡았다. 들은 것은 무덤까지 가져가야 한다.', '이단 심문 기록을 정리했다. 마음이 무거워졌다.'],
      ['미사를 집전했다. 신도들의 얼굴이 낯익어졌다.', '귀족 가문의 장례를 맡았다. 상속을 두고 유족들이 눈빛을 주고받았다.', '성광 신성국에서 온 사절이 교리를 시험하듯 물었다.'],
      ['교구의 사제들을 불러 모았다. 왕위 다툼에 교단이 어디에 설지가 안건이었다.', '대성당의 재산 장부를 검토했다. 성광의 이름으로 모인 돈은 생각보다 많다.'],
    ][f.rank];
    return doWork(g, rng, WORK.cleric, { line: rng.pick(lines) });
  },
  promote(g, rk) {
    L(g).renown += rk;
    return rk === 2 ? '서품식에서 사제복을 받았다. 이제 성광의 이름으로 축복하고 장례를 치를 수 있다.' : `성광교의 ${J(FACTIONS.church.ranks[rk], '이/가')} 되었다.`;
  },
});

registerJob('trader', {
  name: '은저울 상단', faction: 'merchants', places: ['harfen', 'leocast'], skill: 'trade', stat: 'cha', stat2: 'int',
  ranks: FACTIONS.merchants.ranks, wage: [2, 3, 6, 11], npcJob: 'merchant',
  rankOf: facRank('merchants'),
  title: (g) => `은저울 상단 ${FACTIONS.merchants.ranks[fac(g, 'merchants')?.rank ?? 0]}`,
  work(g, rng) {
    const f = fac(g, 'merchants');
    f.merit += 1;
    // 행상 이상은 장사 운이 따른다: 벌기도 하고 잃기도 한다
    const swing = f.rank >= 2 ? rng.float(0.3, 1.9) * (0.7 + g.player.skills.trade / 120) : 1;
    const lines = [
      ['소금 자루를 짊어지고 창고와 부두를 오갔다.', '짐마차 바퀴를 고치고 노새를 먹였다.'],
      ['가게 앞에서 손님을 끌고 장부를 적었다.', '경쟁 상단의 물건 값을 몰래 알아 왔다.'],
      ['짐마차 두 대를 끌고 근처 고을을 돌았다.', '마석 한 상자를 싸게 사서 공방에 넘겼다.', '흉작 소문을 듣고 밀을 미리 사들였다.'],
      ['지점의 행상들을 불러 이번 철의 물량을 나눴다.', '귀족가의 외상값을 받으러 직접 갔다. 정중하지만 물러서지 않았다.'],
    ][f.rank];
    const r = doWork(g, rng, WORK.trader, { line: rng.pick(lines) + (swing > 1.4 ? ' 장사가 잘 풀렸다.' : swing < 0.6 ? ' 손해를 보았다.' : ''), wageMul: swing });
    if (f.rank >= 1 && rng.chance(0.05)) queueCaravanFight(g, rng);
    return r;
  },
  promote(g, rk) {
    return rk === 3 ? `은저울 상단의 지점장이 되었다. 장부의 마지막 칸에 내 이름으로 서명한다.` : `은저울 상단의 ${J(FACTIONS.merchants.ranks[rk], '이/가')} 되었다.`;
  },
});

function queueKnightMission(g, rng) {
  const f = fac(g, 'knights');
  const strong = f.rank >= 2;
  const opts = strong
    ? [{ unit: 'orc', count: rng.int(3, 5), leader: rng.chance(0.4) ? 'orc_chief' : null, why: '북쪽 산길에서 오크 정찰대가 내려왔다는 보고가 들어왔다.' },
      { unit: 'deserter', count: rng.int(4, 6), leader: 'bandit_chief', why: '탈영병 무리가 영지 마을을 약탈하고 있다.' }]
    : [{ unit: 'bandit', count: rng.int(3, 5), leader: rng.chance(0.5) ? 'bandit_chief' : null, why: '영지 경계의 숲에 도적 떼가 자리를 잡았다.' },
      { unit: 'wolf', count: rng.int(4, 6), leader: rng.chance(0.3) ? 'dire_wolf' : null, why: '양치기 마을에서 늑대 떼를 처리해 달라는 청원이 왔다.' }];
  const o = rng.pick(opts);
  queueFight(g, rng, {
    title: '기사단 출동',
    intro: `${o.why} 기사단장이 나를 불렀다.`,
    enc: { unit: o.unit, count: o.count, leader: o.leader },
    reward: { money: strong ? 12 : 5, merit: ['knights', strong ? 14 : 8], renown: 2 },
    avoidLabel: '병을 핑계로 빠진다',
    avoidText: '병을 핑계로 출동에서 빠졌다. 돌아온 동료들은 나와 눈을 마주치지 않았다.',
    onWin: '기사단장이 보고서에 내 이름을 적었다.',
  });
}

function queueCaravanFight(g, rng) {
  queueFight(g, rng, {
    title: '짐마차 습격',
    intro: '숲길에서 나무가 길을 막고 있었다. 수레를 멈추자 양쪽 덤불에서 사람들이 일어섰다.',
    enc: { unit: 'bandit', count: rng.int(3, 6), leader: rng.chance(0.5) ? 'bandit_chief' : null },
    reward: { money: 8, merit: ['merchants', 10], renown: 1 },
    avoidLabel: '짐을 버리고 도망친다',
    avoidText: '짐을 버리고 몸만 빠져나왔다. 상단주가 손해를 장부에 적으며 나를 쳐다보았다.',
  });
}

/* ---------- 소속 찾아가기 ---------- */
ACTIONS.push({
  id: 'faction_door',
  name: '소속 찾아가기',
  desc: '기사단, 교단, 상단, 모험가 길드의 문을 두드린다. 이곳에 있는 곳만 갈 수 있다.',
  available: (g) => isAdult(g) && !traveling(g) && !sceneQueued(g, 'faction_door')
    && Object.values(FACTIONS).some((F) => F.seats[L(g).place]),
  run(g) { queueScene(g, 'faction_door'); return '이곳의 기사단과 길드, 교단을 찾아갔다.'; },
});

defineScene('faction_door', {
  title: (g) => `${placeOf(g).name}의 문들`,
  text: (g) => {
    const m = memberships(g);
    return `${m.length ? `지금 소속: ${m.join(', ')}. ` : ''}어느 문을 두드릴까.`;
  },
  choices: (g) => {
    const here = L(g).place;
    const out = [];
    const k = fac(g, 'knights');
    if (FACTIONS.knights.seats[here] && !(k?.member && L(g).job?.id === 'knight')) out.push({ label: `${FACTIONS.knights.seats[here]} 입단 시험을 본다`, key: 'knights' });
    const c = fac(g, 'church');
    if (FACTIONS.church.seats[here] && L(g).job?.id !== 'cleric') out.push({ label: `${FACTIONS.church.seats[here]}에 수련자로 들어간다`, key: 'church' });
    const m = fac(g, 'merchants');
    if (FACTIONS.merchants.seats[here] && L(g).job?.id !== 'trader') out.push({ label: `${FACTIONS.merchants.seats[here]}에 일자리를 청한다`, key: 'merchants' });
    const gd = fac(g, 'guild');
    if (FACTIONS.guild.seats[here]) {
      if (!gd?.member) out.push({ label: '모험가 길드에 등록한다 (은화 2닢)', key: 'guild' });
      else out.push({ label: `길드에서 등급 심사를 받는다 (지금 ${guildRank(g)}급)`, key: 'guild_rank' });
    }
    out.push({ label: '그냥 돌아간다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '문 앞까지 갔다가 발길을 돌렸다.';
    // 그 사이 다른 고장으로 왔다면 그 문은 여기 없다. guild_rank 등 소속 이름이 아닌 열쇠는 그대로 둔다
    const fk = key.replace(/_rank$/, '');
    if (FACTIONS[fk] && !FACTIONS[fk].seats[L(g).place]) return '찾아간 곳에는 그 문이 없었다. 다른 고장의 일이었다.';
    return JOIN[key]?.(g, rng) ?? '문은 닫혀 있었다.';
  },
});

const JOIN = {
  knights(g, rng) {
    const here = L(g).place;
    const seat = FACTIONS.knights.seats[here];
    const age = playerAge(g);
    const prev = fac(g, 'knights');
    const knightHouse = family(g).id === 'fallen_knight';
    const capt = meetPlacePerson(g, here, 'knight_captain', 5);
    if (prev?.deserted) return `${seat}의 문지기가 내 얼굴을 알아보았다. "기사단을 버린 자는 다시 들이지 않는다."`;
    if (age > 24 && !(prev?.rank >= 1)) return `"종자로 들어오기엔 나이가 많군." ${J(capt ? fullName(capt) : '기사단장', '은/는')} 고개를 저었다.`;
    const needSword = here === 'leocast' ? (prev?.rank >= 2 ? 40 : 48) : (knightHouse ? 18 : 25);
    const needStr = here === 'leocast' ? 38 : 28;
    const p = g.player;
    const pow = playerPower(g);
    const ok = p.skills.sword >= needSword && p.stats.str >= needStr && check(rng, pow, here === 'leocast' ? 42 : 24);
    if (!ok) {
      stress(g, 8);
      return `시험 대련에서 선배 기사의 목검이 내 검을 쳐냈다. "${p.skills.sword < needSword ? '검이 아직 서툴다' : p.stats.str < needStr ? '몸이 아직 약하다' : '오늘은 운이 없었군'}. 다시 와라."`;
    }
    const rank = prev?.rank ? Math.max(0, prev.rank - (prev.order === here ? 0 : 1)) : 0;
    L(g).fac.knights = { member: true, order: here, rank, merit: FACTIONS.knights.merit[rank] };
    takeJob(g, 'knight');
    chron(g, `${g.player.name}, ${seat}에 들어가다.`);
    const fam = knightHouse ? ` 가문의 문장을 본 ${J(capt ? capt.name : '기사단장', '이/가')} 잠시 말을 잃었다.` : '';
    return `시험 대련에서 버텨 냈다.${fam} ${seat}의 ${J(FACTIONS.knights.ranks[rank], '으로/로')} 받아들여졌다. 숙소의 딱딱한 침대가 오늘은 편했다.`;
  },
  church(g, rng) {
    const here = L(g).place;
    const p = g.player;
    const devout = g.flags?.faith === 'devout';
    if (!devout && p.skills.letters < 15 && p.stats.wil < 30) return '"경전을 읽을 줄도 모르면서 무엇을 섬기겠다는 건가." 사제가 차갑게 말했다. (글과 학문 15 또는 의지 30, 혹은 독실한 믿음)';
    const prev = fac(g, 'church');
    const rank = prev?.rank ?? 0;
    L(g).fac.church = { member: true, rank, merit: Math.max(prev?.merit ?? 0, FACTIONS.church.merit[rank]) };
    meetPlacePerson(g, here, here === 'leocast' ? 'bishop' : 'priest', devout ? 25 : 10);
    takeJob(g, 'cleric');
    chron(g, `${g.player.name}, 성광교에 몸을 의탁하다.`);
    return `머리카락 한 줌을 잘라 제단에 바쳤다. ${FACTIONS.church.seats[here]}의 ${J(FACTIONS.church.ranks[rank], '이/가')} 되었다. 새벽 종소리에 일어나는 삶이 시작된다.`;
  },
  merchants(g, rng) {
    const here = L(g).place;
    const p = g.player;
    const merchantHouse = family(g).id === 'merchant';
    if (!merchantHouse && p.skills.trade < 10 && p.stats.cha < 25) return '"셈도 못 하고 말도 못 하면 짐이나 지게." 상단주는 그마저도 자리가 없다고 했다. (장사 10 또는 매력 25)';
    const prev = fac(g, 'merchants');
    const rank = prev?.rank ?? (p.skills.trade >= 25 || merchantHouse ? 1 : 0);
    L(g).fac.merchants = { member: true, rank, merit: Math.max(prev?.merit ?? 0, FACTIONS.merchants.merit[rank]) };
    const tm = meetPlacePerson(g, 'harfen', 'trade_master', merchantHouse ? 25 : 10);
    takeJob(g, 'trader');
    return `${J(tm ? fullName(tm) : '상단주', '이/가')} 내 손을 보고, 눈을 보고, 고개를 끄덕였다. 은저울 상단의 ${J(FACTIONS.merchants.ranks[rank], '으로/로')} 일하게 되었다.${merchantHouse ? ' 아버지의 이름이 문을 열어 주었다.' : ''}`;
  },
  guild(g, rng) {
    const here = L(g).place;
    if (!spend(g, 2)) return '등록비 은화 2닢이 없었다. 접수원이 측은한 눈으로 보았다.';
    const prev = fac(g, 'guild');
    L(g).fac.guild = { member: true, rank: prev?.rank ?? 0, merit: prev?.merit ?? 0 };
    const clerk = meetPlacePerson(g, here, 'guild_clerk', 12);
    meetPlacePerson(g, here, 'guildmaster', 0);
    const rival = here === 'harfen' ? meetPlacePerson(g, 'harfen', 'rival', 5) : null;
    chron(g, `${g.player.name}, 모험가 길드에 이름을 올리다.`);
    return `${clerk ? `접수원 ${J(clerk.name, '이/가')}` : '접수원이'} 구리로 된 F급 길드 패를 내밀었다. "죽지 마세요. 시체 수습비는 따로 받거든요."${rival ? ` 옆에서 등록하던 또래 ${J(rival.name, '이/가')} 나를 위아래로 훑어보았다.` : ''} 이제 의뢰를 받고 미궁에 들어갈 수 있다.`;
  },
  guild_rank(g, rng) {
    const f = fac(g, 'guild');
    const F = FACTIONS.guild;
    const next = f.rank + 1;
    if (next >= F.ranks.length) return '더 오를 등급이 없다.';
    const pow = playerPower(g);
    if (f.merit < F.merit[next]) return `"${F.ranks[next]}급이 되려면 실적이 더 필요합니다." 접수원이 장부를 덮었다. (공적 ${f.merit}/${F.merit[next]})`;
    if (pow < F.power[next]) return `심사관과의 대련에서 밀렸다. "실적은 충분한데, 실력이 따라오지 못하는군." ${F.ranks[next]}급은 다음으로 미뤄졌다.`;
    f.rank = next;
    L(g).renown += next;
    note(g, `모험가 길드 ${F.ranks[next]}급이 되었다.`);
    if (next >= 3) chron(g, `${g.player.name}, 모험가 길드 ${F.ranks[next]}급에 오르다.`);
    return `길드 패가 ${['구리', '철', '청동', '은', '금', '백금', '흑요석'][next]}으로 바뀌었다. ${F.ranks[next]}급 모험가. ${next >= 4 ? '길드 홀이 잠시 조용해졌다. 다들 내 이름을 알고 있었다.' : '받을 수 있는 의뢰가 늘었다.'}`;
  },
};

/* ---------- 매달: 소속의 승급 ---------- */
HOOKS.afterActions.push((g, rng, results) => {
  const life = L(g);
  const p = g.player;
  const k = life.fac.knights;
  if (k?.member && life.job?.id === 'knight' && k.rank < 3) {
    const n = k.rank + 1;
    if (k.merit >= FACTIONS.knights.merit[n] && p.skills.sword >= FACTIONS.knights.sword[n] && playerAge(g) >= FACTIONS.knights.age[n]) k.rank = n;
  }
  const c = life.fac.church;
  if (c?.member && life.job?.id === 'cleric' && c.rank < 3) {
    const n = c.rank + 1;
    if (c.merit >= FACTIONS.church.merit[n] && p.skills.letters >= FACTIONS.church.letters[n] && playerAge(g) >= FACTIONS.church.age[n] && (n < 3 || life.job.place === 'leocast')) c.rank = n;
  }
  const m = life.fac.merchants;
  if (m?.member && life.job?.id === 'trader' && m.rank < 3) {
    const n = m.rank + 1;
    if (m.merit >= FACTIONS.merchants.merit[n] && p.skills.trade >= FACTIONS.merchants.trade[n] && playerAge(g) >= FACTIONS.merchants.age[n]) m.rank = n;
  }
  // 일을 그만두면 소속도 끝난다 (길드는 남는다). 계급 기록은 남아 다시 들어갈 때 참고된다.
  for (const [id, job] of [['knights', 'knight'], ['church', 'cleric'], ['merchants', 'trader']]) {
    const f = life.fac[id];
    if (f?.member && life.job?.id !== job) {
      f.member = false;
    }
  }
});

export { placePerson, PLACES, gainStat, gainSkill, me, up, gains, tired };

// 저장 맞추기: 소속 일(기사단·성광교·상단)을 하는데 소속 기록이 없으면 말단으로 되살린다 (예전 저장 등)
HOOKS.migrate.push((g) => {
  const life = g.life;
  const id = life?.job?.id;
  const fid = id && WORK[id]?.faction;
  if (!fid) return;
  life.fac ??= {};
  if (!life.fac[fid]?.member) life.fac[fid] = { member: true, rank: 0, merit: 0, ...(fid === 'knights' ? { order: life.job.place === 'leocast' ? 'leocast' : 'verden' } : {}) };
});
