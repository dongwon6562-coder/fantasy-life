// 새 일 갈래: 의원, 음유시인, 선생·학자, 연금술사, 목수·석공, 사냥꾼(깊이).
// - 일자리 자체는 jobs.js의 registerJob과 game.life.job을 그대로 쓴다. 솜씨 단계도 jobs.js의 GRADES(견습→명장).
// - 이 갈래만의 상태는 game.vocation 하나: 이름값, 맡은 큰일(책·대작·건축·영약), 이 일로만 가는 길(paths), 사냥 덫과 가죽.
// - 기술은 새로 다섯: 의술·음악·연금술·목공과 석공·사냥. 선생과 학자는 원래 있던 '글과 학문'을 쓴다.
import { HOOKS } from '../hooks.js';
import { SKILLS, JOBS } from '../data.js';
import { L, note, chron } from '../adventure/core.js';
import { J } from '../narrative/text.js';

export const NEW_SKILLS = [
  { id: 'healing', name: '의술' },
  { id: 'music', name: '음악' },
  { id: 'alchemy', name: '연금술' },
  { id: 'building', name: '목공과 석공' },
  { id: 'hunting', name: '사냥' },
];
for (const s of NEW_SKILLS) if (!SKILLS.some((x) => x.id === s.id)) SKILLS.push(s);
export const SKILL_NAMES = Object.fromEntries([...NEW_SKILLS, { id: 'letters', name: '글과 학문' }, { id: 'herbs', name: '약초' }].map((s) => [s.id, s.name]));

// 인물 수첩에 보일 NPC 직업 (덧붙이기만). NPC 쪽 skill은 비워 둔다: 대화 글(relations.js)이 아는 기술 이름이 정해져 있어서.
for (const [id, j] of Object.entries({
  physician: { name: '의원', skill: null, income: 7 },
  bard: { name: '음유시인', skill: null, income: 4 },
  tutor: { name: '선생', skill: 'letters', income: 4 },
  scholar: { name: '학자', skill: 'letters', income: 6 },
  alchemist: { name: '연금술사', skill: null, income: 7 },
  mason: { name: '석공', skill: null, income: 6 },
})) JOBS[id] ??= j;

// 갈래: 어떤 일(jobs.js의 id)이 어느 갈래에 드는지
export const VOCATIONS = {
  healer: { name: '의원', jobs: ['physician'], skill: 'healing', maker: '의원' },
  bard: { name: '음유시인', jobs: ['bard'], skill: 'music', maker: '음유시인' },
  teacher: { name: '선생·학자', jobs: ['tutor', 'scholar'], skill: 'letters', maker: '학자' },
  alchemy: { name: '연금술', jobs: ['alchemist'], skill: 'alchemy', maker: '연금술사' },
  builder: { name: '목수·석공', jobs: ['carpenter', 'mason'], skill: 'building', maker: '장인' },
  hunter: { name: '사냥', jobs: ['hunter'], skill: 'hunting', maker: '사냥꾼' },
};
export const vocOfJob = (jobId) => Object.keys(VOCATIONS).find((v) => VOCATIONS[v].jobs.includes(jobId)) ?? null;
export const myVoc = (g) => vocOfJob(L(g).job?.id);

export function defaultVocation() {
  return {
    v: 1,
    fame: {},          // 갈래별 이름값 0~100
    done: {},          // 갈래별 일한 횟수
    seen: [],          // 이미 겪은 한 번뿐인 사건 id
    paths: {},         // 이 일로만 가는 길: { [path id]: 해 }
    project: null,     // 맡은 큰일 { id, voc, name, prog, need, started }
    works: [],         // 남긴 것 { voc, kind, name, year }  (책, 노래, 건물, 영약…)
    students: 0,       // 가르친 제자 수 (선생)
    patients: 0,       // 살린 사람 수 (의원)
    traps: 0,          // 놓아 둔 덫 (사냥꾼)
    pelts: 0,          // 쟁여 둔 가죽
    trophies: [],      // 잡은 큰 짐승 이름
    potions: 0,        // 쟁여 둔 물약 (연금술사)
    poisoner: 0,       // 독을 판 횟수 (어두운 길)
    banned: {},        // 쫓겨난 고장 { place: 풀리는 달 }
    cool: 0,           // 사건이 너무 잦지 않게: 다음 사건이 가능한 달
  };
}
export function V(g) {
  if (!g.vocation) g.vocation = defaultVocation();
  return g.vocation;
}
const fillSkills = (g) => { if (g.player?.skills) for (const s of NEW_SKILLS) if (g.player.skills[s.id] == null) g.player.skills[s.id] = 0; };
HOOKS.newGame.push((g) => { g.vocation = defaultVocation(); fillSkills(g); });
HOOKS.migrate.push((g) => {
  const d = defaultVocation();
  const v = Object.assign(d, g.vocation ?? {});
  for (const k of ['seen', 'works', 'trophies']) if (!Array.isArray(v[k])) v[k] = [];
  for (const k of ['fame', 'done', 'paths', 'banned']) if (!v[k] || typeof v[k] !== 'object') v[k] = {};
  g.vocation = v;
  fillSkills(g);
  // 예전 저장의 사냥꾼: 일한 달 수로 단계가 정해졌으니, 그만큼 사냥 솜씨를 채워 준다
  const job = g.life?.job;
  if (job?.id === 'hunter' && g.player && !g.player.skills.hunting) g.player.skills.hunting = Math.min(85, 12 + (job.months ?? 0) * 0.55);
});
// 대 잇기: 사람에 묶인 것은 비우고, 남긴 것(책·노래·건물)과 지나간 길은 집안의 이야기로 남긴다
HOOKS.heir.push((g) => {
  const v = V(g);
  for (const k of Object.keys(v.fame)) v.fame[k] = Math.round(v.fame[k] * 0.3);
  v.project = null; v.traps = 0; v.potions = Math.min(v.potions, 3); v.poisoner = 0; v.banned = {}; v.done = {}; v.seen = [];
  v.students = 0; v.patients = 0;
  fillSkills(g);
});

// 작은따옴표로 감싼 이름 뒤에 조사: Q('새벽빛', '을/를') → '새벽빛'을
export const Q = (name, pair) => `'${name}'${J(name, pair).slice(name.length)}`;
export const mi = (g) => g.date.year * 12 + g.date.month;
export const gradeOf = (v) => (v < 30 ? 0 : v < 55 ? 1 : v < 80 ? 2 : 3);
export const GRADE_NAMES = ['견습', '숙련', '장인', '명장'];
export const skillV = (g, id) => g.player.skills[id] ?? 0;

/* ---------- 이름값 ---------- */
export const fameOf = (g, voc) => V(g).fame[voc] ?? 0;
export function addFame(g, voc, n) {
  const v = V(g);
  const cur = v.fame[voc] ?? 0;
  v.fame[voc] = Math.max(0, Math.min(100, cur + (n > 0 ? n * Math.max(0.1, 1 - cur / 110) : n)));
  return v.fame[voc];
}
export const FAME_WORD = (v) => (v >= 70 ? '왕국에 이름이 난' : v >= 45 ? '고장에 이름이 난' : v >= 20 ? '찾는 사람이 있는' : '아직 이름 없는');

/* ---------- 남긴 것 ---------- */
export function leaveWork(g, voc, kind, name, rel = 60) {
  V(g).works.push({ voc, kind, name, year: g.date.year });
  note(g, `${kind} ${Q(name, '을/를')} 남겼다.`);
  chron(g, `${g.player.name}, ${kind} ${Q(name, '을/를')} 남기다.`, rel);
}
export const hasPath = (g, id) => !!V(g).paths[id];
export function takePath(g, id, chronText, renown = 4) {
  V(g).paths[id] = g.date.year;
  L(g).renown += renown;
  if (chronText) chron(g, chronText, 80);
}
export const pickOf = (rng, a) => a[Math.floor(rng.next() * a.length)];
