// 화면용 한 묶음 (도우미스레드1이 새 일 화면에 쓴다). 새 갈래의 일을 하지 않으면 voc가 null이고, 남긴 것과 길은 그래도 보인다.
import { L } from '../adventure/core.js';
import { WORK, jobRank } from '../jobs.js';
import { PLACES } from '../places.js';
import { V, VOCATIONS, myVoc, fameOf, FAME_WORD, skillV, GRADE_NAMES, gradeOf, mi, SKILL_NAMES } from './core.js';
import { PROJECTS, progressWord } from './paths.js';
import { peltPrice } from './hunt.js';

export const PATH_NAMES = {
  royal_physician: '왕실 시의', plague_doctor: '새부리 의원', shadow_physician: '밤손님의 의원',
  court_bard: '궁정 시인', school: '학당의 주인', philosopher: '대연금술사',
  master_builder: '건축장', beast_slayer: '잿빛 큰곰을 잡은 사냥꾼', stag_spared: '흰 수사슴을 보낸 사냥꾼', stag_slain: '흰 수사슴을 쏜 사냥꾼',
};

export function vocationStatus(g) {
  const v = V(g);
  const voc = myVoc(g);
  const job = L(g).job;
  const def = voc ? VOCATIONS[voc] : null;
  const sk = def ? skillV(g, def.skill) : 0;
  const pj = v.project;
  return {
    voc, name: def?.name ?? null, job: job && voc ? WORK[job.id]?.name ?? null : null,
    rank: voc ? (WORK[job.id]?.ranks ?? GRADE_NAMES)[jobRank(g)] : null,
    grade: voc ? GRADE_NAMES[gradeOf(sk)] : null,
    skill: Math.round(sk), skillName: def ? SKILL_NAMES[def.skill] : null,
    fame: voc ? Math.round(fameOf(g, voc)) : 0, fameWord: voc ? FAME_WORD(fameOf(g, voc)) : null,
    fames: Object.fromEntries(Object.keys(VOCATIONS).map((k) => [k, Math.round(fameOf(g, k))])),
    project: pj ? { id: pj.id, kind: PROJECTS[pj.id]?.kind ?? '', name: pj.name, prog: Math.min(1, pj.prog / pj.need), progWord: progressWord(pj.prog / pj.need), months: mi(g) - pj.started } : null,
    paths: Object.entries(v.paths).map(([id, year]) => ({ id, name: PATH_NAMES[id] ?? id, year })),
    works: v.works.map((w) => ({ ...w })),
    school: v.school ? { ...v.school, placeName: PLACES[v.school.place]?.name ?? '' } : null,
    students: v.students, patients: v.patients,
    potions: v.potions, traps: v.traps, trapPlace: v.traps ? PLACES[v.trapAt]?.name ?? null : null, lastCatch: v.lastCatch ?? 0,
    pelts: v.pelts, peltPrice: v.pelts ? peltPrice(g) : 0, trophies: [...v.trophies],
    banned: Object.keys(v.banned).map((p) => PLACES[p]?.name ?? p),
    dark: v.poisoner > 0,
  };
}
