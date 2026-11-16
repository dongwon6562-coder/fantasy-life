// 글과 예술. 상태는 g.arts 하나.
//   draft: 지금 붙들고 있는 작품 { kind, theme, title, prog, need, q(공들인 합), n(공들인 횟수), start, place }
//   works[]: 세상에 남은 작품 (내 집안 것과 남의 것이 함께 있다)
//     { id, kind, theme, title, author, mine, gen, year, place, q(됨됨이 0~100), esteem(지금 평판 0~100),
//       copies(사본·남은 정도), banned: null | { by: 'church'|'crown', y }, lost, ruler(지을 때 임금), patron, read }
//   patron: 후원자 { kind: house|company|church|crown, id, name, stipend, want(바라는 결), mood 0~100, since, lastWork }
//   fame: 작가로서의 이름 0~100   seen[]: 한 번뿐인 사건   read[]: 읽은 책 id   sceneAt, seq, log[]
import { HOOKS } from '../hooks.js';
import { SKILLS } from '../data.js';
import { L } from '../adventure/core.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 새 기술 하나: 그림과 조각 (글은 '글과 학문', 노래는 '음악'을 쓴다)
export const ART_SKILL = { id: 'fineart', name: '그림과 조각' };
if (!SKILLS.some((s) => s.id === ART_SKILL.id)) SKILLS.push(ART_SKILL);

// 작품의 갈래: 쓰는 기술, 돕는 능력치, 품(공들일 횟수), 고를 수 있는 결, 이름 붙이는 법
export const KINDS = {
  history: { name: '역사서', unit: '권', skill: 'letters', stat: 'int', need: 9, themes: ['praise', 'truth', 'faith'], book: true, words: ['연대기', '왕들의 이야기', '전쟁사', '건국기'] },
  grimoire: { name: '마법서', unit: '권', skill: 'magic', stat: 'int', need: 8, themes: ['truth', 'heresy'], book: true, words: ['술식 강해', '서클 입문', '마력 순환론', '원소 문답'] },
  travel: { name: '여행기', unit: '권', skill: 'letters', stat: 'sen', need: 6, themes: ['truth', 'love', 'satire'], book: true, words: ['길 위의 기록', '여러 고장 이야기', '먼 땅 견문록', '나그네의 수첩'] },
  poems: { name: '시집', unit: '권', skill: 'letters', stat: 'cha', need: 5, themes: ['love', 'praise', 'satire', 'faith'], book: true, words: ['노래들', '밤의 시편', '사계', '남은 말들'] },
  song: { name: '노래', unit: '곡', skill: 'music', stat: 'cha', need: 3, themes: ['love', 'praise', 'satire'], words: ['발라드', '뱃노래', '애가', '행진곡'] },
  painting: { name: '그림', unit: '점', skill: 'fineart', stat: 'sen', need: 5, themes: ['praise', 'faith', 'love', 'heresy'], words: ['초상', '풍경', '제단화', '정물'] },
  sculpture: { name: '조각', unit: '점', skill: 'fineart', stat: 'str', need: 8, themes: ['praise', 'faith', 'love'], words: ['석상', '흉상', '부조', '기념비'] },
};
export const KIND_IDS = Object.keys(KINDS);

// 작품의 결: 누구를 기쁘게 하고 누구를 노하게 하나, 세월이 지나면 평판이 어디로 가나
//   risk: 금서·압수 위험 (church 교단, crown 왕실)   drift: 해마다 평판이 기우는 쪽
export const THEMES = {
  praise: { name: '찬양', desc: '임금과 귀족, 후원자의 공덕을 기린다. 당장은 환영받지만 그 임금이 가면 낯 뜨거운 글이 된다.', risk: {}, drift: -1 },
  truth: { name: '있는 그대로', desc: '본 것을 본 대로 적는다. 불편해하는 사람이 있다. 세월은 이런 글의 편이다.', risk: { crown: 0.18 }, drift: 1 },
  faith: { name: '신앙', desc: '신과 성인을 노래하고 그린다. 성당이 반기고, 성광국에서는 더 반긴다.', risk: {}, drift: 0 },
  love: { name: '사랑과 삶', desc: '사람의 사랑과 이별, 들판의 하루. 아무도 노하지 않고, 오래 사랑받는다.', risk: {}, drift: 0.5 },
  satire: { name: '풍자', desc: '높은 사람들을 비웃는다. 장터는 웃고 성은 노한다.', risk: { crown: 0.35 }, drift: 0.5 },
  heresy: { name: '금기', desc: '교단이 덮어 둔 것을 연다. 옛 신들, 금지된 술식, 벗은 몸. 금서가 되기 쉽고, 몇 대 뒤에야 제값을 받는다.', risk: { church: 0.5 }, drift: 1.5 },
};

// 책과 그림이 모이는 곳 (옛 책 읽기, 작품 내걸기)
export const LIBRARIES = { leocast: '왕립 서고', serenia: '회색 탑 서고', solaris: '대성당 서고', harfen: '하르펜 상인 조합 서고', eisen: '제국 대학 서고', silverleaf: '엘프의 나무 서고' };

export const AS = (g) => (g.arts ??= fresh());
export function fresh() {
  return { draft: null, works: [], patron: null, fame: 0, seen: [], read: [], sceneAt: 0, seq: 1, log: [], made: 0 };
}
export function alog(g, text) {
  const A = AS(g);
  A.log.push({ y: g.date.year, m: g.date.month, text });
  if (A.log.length > 30) A.log.splice(0, A.log.length - 30);
}
export const myWorks = (g) => AS(g).works.filter((w) => w.mine);
export const workById = (g, id) => AS(g).works.find((w) => w.id === id) ?? null;
export const fullTitle = (w) => `${w.title}`;
export const kindName = (k) => KINDS[k]?.name ?? '작품';
export const esteemWord = (v) => (v >= 85 ? '고전으로 읽힌다' : v >= 65 ? '이름난 작품이다' : v >= 45 ? '찾는 사람이 꾸준하다' : v >= 25 ? '아는 사람만 안다' : v >= 10 ? '잊혀 가는 중이다' : '거의 잊혔다');
export const qualityWord = (v) => (v >= 85 ? '걸작' : v >= 65 ? '뛰어난 작품' : v >= 45 ? '쓸 만한 작품' : v >= 25 ? '서툰 작품' : '습작');
export const fameWord = (v) => (v >= 70 ? '왕국이 아는 작가' : v >= 45 ? '이름난 작가' : v >= 20 ? '알아보는 사람이 있는 작가' : v >= 5 ? '갓 이름을 내민 작가' : '아직 이름 없는 작가');
export const addArtFame = (g, n) => { const A = AS(g); A.fame = clamp(A.fame + (n > 0 ? n * Math.max(0.15, 1 - A.fame / 110) : n), 0, 100); return A.fame; };
// 작품을 만들 수 있나 (갈래별)
export function canMake(g, k) {
  const p = g.player, sk = p.skills ?? {};
  if (k === 'grimoire') return !!p.manaAwakened && (sk.magic ?? 0) >= 30;
  if (k === 'song') return (sk.music ?? 0) >= 10;
  if (k === 'painting') return (sk.fineart ?? 0) >= 5 || p.stats.sen >= 30;
  if (k === 'sculpture') return (sk.fineart ?? 0) >= 20 || (sk.building ?? 0) >= 25;
  if (k === 'travel') return Object.keys(L(g).placeNpcs ?? {}).length >= 3;
  return (sk.letters ?? 0) >= 15 || p.stats.int >= 40;
}

const fillSkill = (g) => { if (g.player?.skills && g.player.skills.fineart == null) g.player.skills.fineart = 0; };
HOOKS.newGame.push((g) => { g.arts = fresh(); fillSkill(g); });
HOOKS.migrate.push((g) => {
  const A = AS(g), f = fresh();
  for (const k of Object.keys(f)) A[k] ??= f[k];
  fillSkill(g);
});
// 대를 이어도 작품은 세상에 남는다. 붙들던 원고와 후원자, 작가의 이름은 사람을 따라 간다.
HOOKS.heir?.push((g) => {
  const A = AS(g);
  if (A.draft) alog(g, `${A.draft.title}, 끝내지 못한 원고로 남다.`);
  A.draft = null; A.patron = null; A.fame = Math.round(A.fame * 0.3); A.seen = []; A.read = [];
  A.legacyAt = mi(g) + 6;
});
