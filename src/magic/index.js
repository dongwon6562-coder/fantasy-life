// 갈래 3단계-3: 마법의 깊이 (주문, 마법 일, 서클 승급 시험, 마법 사건)
// 42단계: 계열 여덟과 주문 예순 남짓, 계열 고르기, 영창 줄이기와 무영창, 마력 폭주와 대가, 내 주문 짓기, 서클 오를 때 장면, 이명 (deep.js)
// 화면용: magicInfo(g) 내 주문서 한 장
import { circleOf } from '../game.js';
import { SPELLS, SCHOOLS, SCHOOL_IDS, schoolName, USE_NAME, magicState, knows, learnable, isLegacy } from './spells.js';
import { affinityOf, chantWord, strainWord, titled } from './deep.js';
import './spells.js';
import './exam.js';
import './events.js';
import './deep.js';

export { SPELLS, SCHOOLS, SCHOOL_IDS, schoolName, USE_NAME, spellById, spellOf, knownSpells, madeSpells, learnable, magicState, knows } from './spells.js';
export { affinityOf, chantWord, strainWord, titled } from './deep.js';

/** 내 주문서: 계열별 주문(아는 것·익힐 수 있는 것), 서클, 영창, 무리, 지은 주문, 이명 */
export function magicInfo(g) {
  const m = magicState(g), c = circleOf(g), can = new Set(learnable(g).map((s) => s.id));
  const card = (s) => ({ id: s.id, name: s.name, circle: s.circle, use: s.use, useName: USE_NAME[s.use], desc: s.desc, known: knows(g, s.id), learnable: can.has(s.id) });
  return {
    circle: c, certified: m.certified, peak: m.peak ?? c,
    school: m.school ? { id: m.school, name: schoolName(m.school), fit: !!m.fit } : null,
    affinity: affinityOf(g).map((a) => ({ id: a.id, name: schoolName(a.id), why: a.why })),
    schools: ['common', ...SCHOOL_IDS].map((k) => ({ id: k, name: schoolName(k), mine: k === m.school, spells: SPELLS.filter((s) => s.school === k && (k === m.school || k === 'common' || isLegacy(s.id) || knows(g, s.id))).map(card) })).filter((x) => x.spells.length),
    total: SPELLS.length, knownCount: m.known.length,
    chant: { v: Math.round(m.chant), word: chantWord(m.chant) },
    strain: { v: Math.round(m.strain), word: strainWord(m.strain) }, scars: m.scars, overloads: m.overloads,
    made: m.made.map((x) => ({ id: x.id, name: x.name, school: schoolName(x.school), circle: x.circle, useName: USE_NAME[x.use], by: x.by, year: x.at, mine: !!x.mine, learned: !!x.learned, taught: x.taught ?? 0 })),
    making: m.making ? { useName: USE_NAME[m.making.use], circle: m.making.circle, pct: Math.min(99, Math.round(m.making.prog * 100)) } : null,
    title: m.title, titled: titled(g),
  };
}
void SCHOOLS;
