// 15살 이후의 일: 일자리 구하기, 일하기, 승급. 소속(기사단·교단·상단)의 일도 같은 틀을 쓴다.
// 숙련 단계는 시스템 설계 문서를 따른다: 견습 → 숙련 → 장인 → 명장.
import { J } from './narrative/text.js';
import { ACTIONS } from './actions.js';
import { HOOKS } from './hooks.js';
import { JOBS, skillGrade } from './data.js';
import { me, playerAge, gainStat, gainSkill, circleOf, family } from './game.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, up, gains } from './adventure/core.js';
import { PLACES, placeOf, leaveJob } from './places.js';
import { queueFight } from './adventure/fight.js';

export const GRADES = ['견습', '숙련', '장인', '명장'];

// 일 목록. wage는 일하러 간 한 칸마다 받는 은화(단계별). npcJob은 인물 수첩에 보일 직업.
export const WORK = {};
export function registerJob(id, def) { WORK[id] = { id, ranks: GRADES, ...def }; }

registerJob('farmer', {
  name: '농부', places: ['ern'], skill: 'farming', stat: 'str', wage: [2, 3, 4, 6], npcJob: 'farmer',
  lines: ['새벽부터 밭고랑을 갈았다.', '이웃과 품앗이로 밀을 베었다.', '거름을 지고 언덕을 오르내렸다.', '쟁기 날을 갈고 소에게 여물을 주었다.'],
});
registerJob('laborer', {
  name: '일꾼', places: ['ern', 'harfen', 'verden', 'leocast'], skill: null, stat: 'str', wage: [2, 2, 3, 3], npcJob: 'laborer',
  lines: ['짐을 나르고 품삯을 받았다.', '성벽 보수 공사에서 돌을 날랐다.', '부두 창고에서 자루를 쌓았다.', '하루 종일 남의 지붕을 고쳤다.'],
});
registerJob('hunter', {
  name: '사냥꾼', places: ['ern', 'verden'], skill: null, stat: 'sen', stat2: 'agi', wage: [3, 4, 5, 7], npcJob: 'hunter', risk: 0.03,
  lines: ['사슴의 발자국을 하루 종일 쫓았다.', '덫에 걸린 여우 가죽을 벗겼다.', '숲 깊은 곳에서 멧돼지를 잡았다. 마을에 고기를 나눴다.', '새벽 안개 속에서 활시위를 당겼다.'],
});
registerJob('herbalist', {
  name: '약초사', places: ['ern'], skill: 'herbs', stat: 'sen', wage: [2, 4, 6, 9], npcJob: 'herbalist',
  req: (g) => (g.player.skills.herbs >= 15 ? null : '약초 15'),
  lines: ['열병에 듣는 쑥국화를 말렸다.', '마을 아이의 상처에 고약을 발라 주었다.', '숲 그늘에서 은방울버섯을 찾았다.'],
});
registerJob('cook', {
  name: '요리사', places: ['ern', 'harfen', 'leocast'], skill: 'cooking', stat: 'sen', wage: [2, 3, 6, 10], npcJob: 'cook',
  lines: ['솥 셋을 동시에 지켰다.', '단골 모험가들이 내 스튜를 찾았다.', '양파를 한 자루 썰었다. 눈물이 멈추지 않았다.', '새 향신료를 써 보았다. 주인이 고개를 끄덕였다.'],
});
registerJob('shop', {
  name: '상점 점원', places: ['harfen', 'verden', 'leocast'], skill: 'trade', stat: 'cha', wage: [2, 3, 6, 10], npcJob: 'shopkeeper',
  lines: ['깐깐한 손님과 반 시진 동안 값을 다퉜다.', '장부를 맞추느라 밤을 샜다.', '창고의 물건을 세고 먼지를 털었다.'],
});
registerJob('clerk', {
  name: '서기', places: ['harfen', 'verden', 'leocast'], skill: 'letters', stat: 'int', wage: [3, 5, 8, 12], npcJob: 'scholar',
  req: (g) => (g.player.skills.letters >= 30 ? null : '글과 학문 30'),
  lines: ['세금 장부를 옮겨 적었다.', '영주의 포고문을 깨끗하게 베꼈다.', '분쟁 증서의 오래된 글씨를 읽어 냈다.'],
});
registerJob('guard', {
  name: '경비병', places: ['ern', 'harfen', 'leocast'], skill: 'sword', stat: 'str', wage: [3, 3, 5, 7], npcJob: 'guard', fightRisk: 0.05,
  req: (g) => (g.player.stats.str >= 20 ? null : '힘 20'),
  lines: ['성문에서 짐마차를 검문했다.', '밤 순찰을 돌았다. 골목은 조용했다.', '주정뱅이 둘을 떼어 놓았다.'],
});
registerJob('smith', {
  name: '대장간 일', places: ['harfen', 'verden'], skill: null, stat: 'str', stat2: 'wil', wage: [2, 4, 6, 9], npcJob: 'smith',
  lines: ['풀무질을 하다 팔이 떨어지는 줄 알았다.', '말굽 서른 개를 쳤다.', '처음으로 혼자 칼날 하나를 벼렸다.'],
});
registerJob('artificer', {
  name: '마도구 공방 조수', places: ['harfen', 'leocast'], skill: 'magic', stat: 'int', wage: [4, 6, 10, 15], npcJob: 'hedge_mage',
  req: (g) => (circleOf(g) >= 1 ? null : '1서클'),
  lines: ['마석에 회로를 새기다 하나를 깨뜨렸다.', '빛을 내는 등잔 마도구를 열 개 조립했다.', '공방장이 새 회로 설계를 설명해 주었다. 절반쯤 알아들었다.'],
});

export const jobDef = (g) => (L(g).job ? WORK[L(g).job.id] : null);

// 지금 단계: 기술이 있는 일은 기술 수치로, 없는 일은 일한 달 수로
export function jobRank(g) {
  const life = L(g);
  const def = jobDef(g);
  if (!def) return 0;
  if (def.rankOf) return def.rankOf(g);
  if (def.skill) { const v = g.player.skills[def.skill]; return v < 30 ? 0 : v < 55 ? 1 : v < 80 ? 2 : 3; }
  const m = life.job.months;
  return m < 12 ? 0 : m < 36 ? 1 : m < 84 ? 2 : 3;
}
export function jobTitle(g) {
  const def = jobDef(g);
  if (!def) return null;
  const rk = def.ranks[jobRank(g)];
  return def.title ? def.title(g) : `${def.name} (${rk})`;
}

// 처음 일을 맡는다
export function takeJob(g, id, extra = {}) {
  const life = L(g);
  if (life.job) leaveJob(g);
  life.job = { id, place: life.place, months: 0, lastRank: 0, ...extra };
  const def = WORK[id];
  life.job.lastRank = jobRank(g);
  if (def.npcJob && JOBS[def.npcJob]) me(g).job = def.npcJob;
  if (def.lodging) life.home = def.lodging;
  note(g, `${PLACES[life.place].name}에서 ${def.name} 일을 시작했다.`);
}

/* ---------- 일자리 구하기 ---------- */
ACTIONS.push({
  id: 'seek_job',
  name: '일자리 구하기',
  desc: '이곳에서 할 수 있는 일을 알아본다. 지금 일을 그만둘 수도 있다.',
  available: (g) => isAdult(g) && !traveling(g) && !sceneQueued(g, 'seek_job'),
  run(g) { queueScene(g, 'seek_job'); return '일자리를 알아보러 다녔다.'; },
});

defineScene('seek_job', {
  title: (g) => `${placeOf(g).name}의 일자리`,
  text: (g) => {
    const t = jobTitle(g);
    return t ? `지금은 ${J(t, '으로/로')} 일하고 있다. 다른 길을 찾을 수도 있다.` : '게시판과 주점, 공방 문 앞을 돌며 일손을 구하는 곳을 알아보았다.';
  },
  choices: (g) => {
    const life = L(g);
    const here = life.place;
    const jobs = Object.values(WORK).filter((d) => !d.faction && d.places.includes(here) && d.id !== life.job?.id);
    jobs.sort((a, b) => (!!(a.req?.(g)) - !!(b.req?.(g))));
    const out = jobs.slice(0, 6).map((d) => {
      const why = d.req?.(g);
      const w = Math.round(d.wage[0] * PLACES[here].wage);
      return { label: `${d.name}${why ? ` (조건: ${why})` : ` (견습, 한 번에 은화 ${w}닢쯤)`}`, key: d.id };
    });
    if (life.job && WORK[life.job.id]) out.push({ label: `지금 일(${WORK[life.job.id].name})을 그만둔다`, key: 'quit' });
    out.push({ label: '그냥 돌아간다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '지금은 마음에 드는 자리가 없었다.';
    if (key === 'quit') { if (!L(g).job) return '그만둘 일이 이미 없었다.'; const n = WORK[L(g).job.id]?.name ?? '하던';  leaveJob(g, `${n} 일을 그만두었다.`); return `${n} 일을 그만두었다. 홀가분하면서도 조금 불안했다.`; }
    const d = WORK[key];
    if (!d) return '찾던 자리는 이미 다른 사람이 채웠다.';
    const why = d.req?.(g);
    if (why) { stress(g, 4); return `${d.name} 자리는 ${why} 이상은 되어야 한다며 거절당했다.`; }
    takeJob(g, key);
    return `${d.name} 일을 얻었다. 내일부터 나오라고 했다. 이제 "일하러 가기"로 일할 수 있다.`;
  },
});

/* ---------- 일하러 가기 ---------- */
ACTIONS.push({
  id: 'work',
  name: '일하러 가기',
  desc: '맡은 일을 한다. 품삯을 받고 솜씨가 는다.',
  available: (g) => !!L(g).job && !traveling(g) && L(g).job.place === L(g).place,
  run(g, rng) {
    const life = L(g);
    const def = jobDef(g);
    if (!def) return '';
    // 소속이 있어야 하는 일(기사단·교단·상단)인데 소속이 없으면 일자리를 잃는다 (대 잇기 뒤 등)
    if (def.faction && !life.fac?.[def.faction]?.member) { life.job = null; return `${def.name}의 명부에 내 이름은 없었다. 문지기가 고개를 저었다.`; }
    if (def.work) return def.work(g, rng);
    return doWork(g, rng, def);
  },
});

export function doWork(g, rng, def, opt = {}) {
  const life = L(g);
  const p = g.player;
  tired(g, opt.tire ?? 14); stress(g, 4);
  const k = def.skill ? gainSkill(g, def.skill, opt.skillGain ?? 1.2, def.stat) : 0;
  const st = gainStat(g, def.stat, 0.4);
  const st2 = def.stat2 ? gainStat(g, def.stat2, 0.3) : 0;
  life.job.months += 0.25;
  life.job.merit = (life.job.merit ?? 0) + 1;
  const rk = jobRank(g);
  const statV = p.stats[def.stat];
  let wage = Math.max(1, Math.round(def.wage[rk] * PLACES[life.place].wage * (0.85 + statV / 250) + rng.int(0, 1) - 0.4));
  if (opt.wageMul) wage = Math.max(0, Math.round(wage * opt.wageMul));
  p.money += wage;
  let extra = '';
  if (life.home === 'family' && wage >= 2) {
    const give = Math.floor(wage / 4);
    if (give) { p.money -= give; p.familyMoney += give; extra = ` 그중 ${give}닢은 집에 보탰다.`; }
  }
  if (def.risk && rng.chance(def.risk)) {
    p.injuries.push({ name: rng.pick(['멧돼지 엄니에 찢긴 허벅지', '비탈에서 구른 발목', '덫에 물린 손']), months: 2 });
    extra += ' 일을 하다 다쳤다.';
  }
  if (def.fightRisk && rng.chance(def.fightRisk)) queueGuardFight(g, rng);
  const line = opt.line ?? rng.pick(def.lines);
  const sk = def.skill ? up(skillName(def.skill), k) : null;
  return `${line} 은화 ${wage}닢을 받았다.${extra}${gains([sk, up(statName(def.stat), st), def.stat2 ? up(statName(def.stat2), st2) : null])}`;
}
const SK = { sword: '검술', magic: '마법', letters: '글과 학문', farming: '농사', cooking: '요리', trade: '장사', herbs: '약초' };
const ST = { str: '힘', agi: '민첩', int: '지능', wil: '의지', cha: '매력', sen: '감각' };
const skillName = (id) => SK[id] ?? id;
const statName = (id) => ST[id] ?? id;

function queueGuardFight(g, rng) {
  const big = rng.chance(0.3);
  queueFight(g, rng, {
    title: '순찰 중의 소란',
    intro: big ? '창고 거리에서 비명이 들렸다. 칼을 든 무리가 상인의 창고를 털고 있다.' : '골목 끝에서 건달들이 행인을 둘러싸고 있다.',
    enc: big ? { unit: 'bandit', count: rng.int(3, 5), leader: rng.chance(0.4) ? 'bandit_chief' : null } : { unit: 'thug', count: rng.int(2, 4), leader: null },
    reward: { money: big ? 6 : 2, renown: 1 },
    avoidLabel: '동료 경비병을 부르러 간다',
    avoidText: '지원을 부르러 간 사이 놈들은 사라졌다. 대장은 혀를 찼다.',
  });
}

// 단계가 오르면 알린다
HOOKS.afterActions.push((g, rng, results) => {
  const life = L(g);
  if (!life.job) return;
  const def = jobDef(g);
  if (!def) { life.job = null; return; }
  const rk = jobRank(g);
  if (rk > (life.job.lastRank ?? 0)) {
    life.job.lastRank = rk;
    const text = def.promote ? def.promote(g, rk) : `${def.name}로서 ${def.ranks[rk]} 소리를 듣게 되었다. 품삯이 올랐다.`;
    results.push({ name: '승급', text });
    note(g, text);
    if (rk >= 2) { chron(g, `${g.player.name}, ${def.name}로서 ${def.ranks[rk]}에 오르다.`); L(g).renown += rk; }
  }
});

export { skillGrade, family, playerAge };
