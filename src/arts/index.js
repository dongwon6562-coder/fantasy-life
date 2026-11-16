// 14단계: 글과 예술. 역사서·마법서·여행기·시집·노래·그림·조각을 짓고, 후원자를 얻고, 금서가 되고,
// 작품이 세상에 남아 대를 넘어 읽히며 평가가 바뀐다. 세상의 작가들도 스스로 작품을 남긴다.
// 화면용: artsInfo(g), artsLine(g), worksOf(g, { mine, banned }), bannedBooks(g)
import { AS, KINDS, THEMES, LIBRARIES, esteemWord, qualityWord, fameWord, myWorks } from './state.js';
import './life.js';
import './world.js';
import './events.js';
import { L } from '../adventure/core.js';

export { KINDS, THEMES, LIBRARIES };
export { publish, banOdds, patronOffers } from './life.js';
export const artsState = AS;

const view = (g, w) => ({
  id: w.id, kind: w.kind, kindName: KINDS[w.kind]?.name ?? '작품', theme: w.theme, themeName: THEMES[w.theme]?.name ?? '',
  title: w.title, author: w.author, mine: !!w.mine, ancestor: !!w.mine && w.gen < (L(g).gen ?? 1), year: w.year,
  quality: Math.round(w.q), qualityWord: qualityWord(w.q), esteem: Math.round(w.esteem), esteemWord: esteemWord(w.esteem),
  copies: w.copies, banned: w.banned ? (w.banned.by === 'church' ? '교단의 금서' : '왕실의 금령') : null, lost: !!w.lost, patron: w.patron ?? null,
});

// 작품 목록 (기본: 세상에 남은 것 전부, 평판 높은 순)
export function worksOf(g, { mine = null, banned = null, lost = false } = {}) {
  return AS(g).works
    .filter((w) => (lost || !w.lost) && (mine == null || !!w.mine === mine) && (banned == null || !!w.banned === banned))
    .sort((a, b) => b.esteem - a.esteem)
    .map((w) => view(g, w));
}
export const bannedBooks = (g) => worksOf(g, { banned: true });

export function artsInfo(g) {
  const A = AS(g), d = A.draft, P = A.patron;
  return {
    fame: Math.round(A.fame), fameWord: fameWord(A.fame),
    draft: d ? { kind: d.kind, kindName: KINDS[d.kind]?.name ?? '', theme: d.theme, themeName: THEMES[d.theme]?.name ?? '', title: d.title, prog: Math.min(1, d.prog / d.need), months: Math.max(0, g.date.year * 12 + g.date.month - d.start) } : null,
    patron: P ? { name: P.name, kind: P.kind, stipend: P.stipend, want: THEMES[P.want]?.name ?? '', mood: Math.round(P.mood), moodWord: P.mood >= 70 ? '흡족해한다' : P.mood >= 40 ? '기다리고 있다' : P.mood >= 15 ? '마음이 식어 간다' : '곧 등을 돌릴 것 같다' } : null,
    mine: worksOf(g, { mine: true }),
    lost: AS(g).works.filter((w) => w.mine && w.lost).map((w) => view(g, w)),
    world: worksOf(g, { mine: false }).slice(0, 20),
    banned: bannedBooks(g),
    library: LIBRARIES[L(g).place] ?? null,
    made: A.made,
    log: A.log.slice(-10).reverse(),
  };
}

// 한 줄 요약: 짓는 중인 작품이나 후원자가 있을 때
export function artsLine(g) {
  const A = AS(g);
  const parts = [];
  if (A.draft) parts.push(`${KINDS[A.draft.kind]?.name} 《${A.draft.title}》 ${Math.round(Math.min(1, A.draft.prog / A.draft.need) * 100)}%`);
  if (A.patron) parts.push(`후원 ${A.patron.name}`);
  if (!parts.length && myWorks(g).length) parts.push(`남긴 작품 ${myWorks(g).filter((w) => !w.lost).length}점`);
  return parts.join(' · ');
}
