// 마도구 장인 (45단계): 탑 밖의 마석 공방. 마석 다듬기, 무기·갑옷·장신구·연장에 아는 주문 새기기, 실패와 폭발,
// 내 공방과 제자, 의뢰(귀족·모험가·군대·상단·탑), 이름난 마도구(대를 넘어 남고, 도둑맞고, 되찾음), 마나의 흐름에 따라 흔들리는 마석 값.
// 화면: artificeInfo(g) 내 공방 카드, artificeLine(g) 오늘의 장면 한 줄.
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { AS, BASES, SLOT_NAME, mi, here, placeName, workshopAt, stoneCost, stoneSell, tideOf, rankName, artWord, canEngrave } from './core.js';
import { GRADE_WORDS, gradeOf } from './life.js';
import './world.js';

export { AS as artificeState };

const shopWord = (sh, g) => (sh.hurt > mi(g) ? '터진 자리를 고치는 중' : sh.pupils.length >= 2 ? '숫돌 소리가 그치지 않는 공방' : sh.pupils.length ? '제자 하나와 꾸리는 공방' : '혼자 꾸리는 작은 공방');
const gradeQ = (q) => gradeOf(q ?? 30);

/** 화면용 묶음. 마도구와 아무 상관이 없으면 null */
export function artificeInfo(g) {
  if (!g?.player) return null;
  const A = AS(g);
  const touched = A.art > 0 || A.kept.length || A.shop || A.famous.some((f) => f.mine) || workshopAt(here(g));
  if (!touched) return null;
  const j = A.job;
  return {
    skill: Math.round(A.art),
    skillWord: artWord(A.art),
    rank: rankName(g),
    canEngrave: canEngrave(g),
    stones: A.stones,
    made: A.made,
    blasts: A.blasts,
    shop: A.shop ? { name: A.shop.name, place: placeName(A.shop.place), word: shopWord(A.shop, g), apprentices: A.shop.pupils.map((p) => ({ name: p.name, word: p.word, skill: Math.round(p.art), partner: !!p.partner })), earned: A.shop.earned ?? 0 } : null,
    price: { buy: stoneCost(g), sell: stoneSell(g), tide: Math.round(tideOf(g)), word: stoneCost(g) <= 4 ? '마석이 흔해 싸다' : stoneCost(g) >= 6 ? '마석이 귀해 비싸다' : '마석 값이 고르다' },
    job: j ? { name: j.name, circle: j.circle, prog: Math.round(Math.min(1, j.prog) * 100), client: j.client ?? null } : null,
    orders: j?.client ? [{ who: j.client, want: j.name, pay: j.pay, left: Math.max(0, j.due - mi(g)) }] : [],
    works: A.kept.map((k, i) => ({ name: k.name, kind: SLOT_NAME[k.slot] ?? '', spell: k.spellUse ?? '', circle: k.circle, grade: gradeQ(k.q), gradeWord: GRADE_WORDS[gradeQ(k.q)], owner: k.by, mine: true, lost: false, worn: i === A.worn })),
    famous: A.famous.map((f) => ({ name: f.name, kind: BASES[f.base]?.name ?? '', circle: f.circle, maker: f.maker, holder: f.stolen ? f.stolen.by : f.holder, where: f.lost ? null : placeName(f.where), mine: !!f.mine, lost: !!f.lost, stolen: !!f.stolen })),
    past: A.past.slice(-4),
    log: A.log.slice(-8),
  };
}

/** 오늘의 장면 한 줄. 할 말이 없으면 null */
export function artificeLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const A = AS(g), t = mi(g), pl = here(g);
  const stolen = A.famous.find((f) => f.mine && f.stolen && f.where === pl);
  if (stolen && t % 2 === 0) return `이 고장 장물아비들 사이에서 ${J(stolen.name, '을/를')} 봤다는 말이 들린다.`;
  if (A.shop?.place === pl && A.shop.pupils.length && t % 4 === 1) return `공방 안쪽에서 ${J(A.shop.pupils[0].name, '이/가')} 마석 가는 소리가 들린다.`;
  if (A.job && t % 4 === 2) return `작업대 위에서 반쯤 새긴 ${J(A.job.name, '이/가')} 희미하게 빛난다.`;
  if (workshopAt(pl) && t % 4 === 3) return stoneCost(g) <= 4 ? '마석 공방 거리에 날 마석 자루가 쌓였다. 마나가 짙은 해라 값이 싸다.' : stoneCost(g) >= 6 ? '마석 공방 거리 장인들이 마석 값이 너무 올랐다고 투덜댄다.' : null;
  return null;
}
