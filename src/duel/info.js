// 검술 수첩 (43단계): 화면이 그대로 읽는 묶음 swordInfo(g)와 오늘의 장면 한 줄 swordLine(g).
import { L } from '../adventure/core.js';
import { byId } from '../npc.js';
import { J } from '../narrative/text.js';
import { SCHOOLS, RANKS, RANK_NEED, swordState, hallState, schoolOf, rankOf, schoolName, formById, BLADE_WORDS, AURA_WORDS, bladeSpell } from './schools.js';
import { mi, placeName, famousName } from './hall.js';
import { famousHere, nextForm } from './craft.js';

/** 화면용 묶음: school {id,name,desc}, rank, skill, ranks [{name,need}], forms [{name,desc,learned,secret,need}], aura {v,word},
 *  master {name,alive}, rivals [{name,won}], blade, hall, famous, other(다른 유파 초식) */
export function swordInfo(g) {
  const s = swordState(g), H = hallState(g), id = schoolOf(g), sc = SCHOOLS[id];
  const mp = byId(g, s.master);
  const own = H.own;
  return {
    school: sc ? { id, name: schoolName(g), desc: s.house && own ? `${sc.name}에서 갈라져 나온 우리 집안의 유파. ${sc.desc}` : sc.desc, from: sc.from, weapon: sc.weapon ?? '검' } : null,
    rank: rankOf(g), rankName: rankOf(g) >= 0 ? RANKS[rankOf(g)] : null,
    skill: Math.round(g.player.skills.sword ?? 0),
    ranks: RANKS.slice(0, 5).map((name, i) => ({ name, need: RANK_NEED[i] })),
    forms: sc ? [...sc.forms.map((f) => ({ name: f.name, desc: f.desc, learned: s.forms.includes(f.id), secret: false, need: f.need })),
      { name: sc.secret.name, desc: sc.secret.desc, learned: !!s.secret, secret: true, need: RANK_NEED[3] }] : [],
    other: s.forms.filter((f) => !sc || !sc.forms.some((x) => x.id === f)).map((f) => formById(f)).filter(Boolean).map((f) => ({ name: f.name, desc: f.desc })),
    aura: { v: s.aura, word: AURA_WORDS[s.aura] ?? AURA_WORDS[0] },
    master: s.master != null && mp ? { name: mp.name, alive: !!mp.alive } : s.masterName ? { name: s.masterName, alive: true } : null,
    rivals: s.fought.slice(-8).map((x) => ({ name: x.name, won: !!x.won })),
    blade: s.blade > 0 || s.bladeP > 0 ? { v: s.blade, word: BLADE_WORDS[s.blade] || '수련 중', spell: bladeSpell(g)?.name ?? null } : null,
    hall: own ? { name: own.name, place: placeName(own.place), pupils: own.pupils, fame: Math.round(own.fame), mine: !!own.mine, closed: !!own.closed, head: own.mine ? null : own.headName } : null,
    famous: H.famous.filter((f) => f.alive).map((f) => ({ name: famousName(f), school: SCHOOLS[f.school].name, place: placeName(f.place), blade: !!f.blade })),
    log: H.log.slice(-6),
  };
}

/** 오늘의 장면 한 줄. 할 말이 없으면 null */
export function swordLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const s = swordState(g), t = mi(g), own = hallState(g).own;
  if (own && !own.closed && own.place === L(g).place && t % 3 === 0) return own.mine ? `도장 마루에서 문하생 ${own.pupils}명의 기합 소리가 새어 나온다.` : `골목 끝 ${own.name} 도장에서 목검 부딪는 소리가 난다. 간판 글씨는 집안 어른이 쓴 것이다.`;
  const f = famousHere(g)[0];
  if (f && t % 4 === 1) return `여관에서 ${J(famousName(f), '이/가')} 이 고장에 머문다는 말이 돈다. ${SCHOOLS[f.school].weapon ?? '칼'} 한 자루로 이름난 사람이다.`;
  if (s.aura >= 2 && t % 5 === 2) return '새벽에 칼을 뽑자 칼날이 낮게 울었다. 이제는 놀라지 않는다.';
  if (s.blade >= 1 && t % 5 === 3) return '칼자루를 쥔 손바닥에 마력이 저릿하게 고인다.';
  const nf = rankOf(g) >= 0 ? nextForm(g) : null;
  if (nf && (g.player.skills.sword ?? 0) >= nf.need && t % 4 === 3) return `몸이 다음 초식 ${J(nf.name, '을/를')} 받을 때가 된 것 같다.`;
  return null;
}
