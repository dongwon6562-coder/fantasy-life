// 연구와 발명: 플레이어가 직접 연구해 history의 발명을 앞당기거나, 아무도 만들지 않은 새 물건을 만든다.
// 상태는 g.research 하나.
//   project: 지금 하는 연구 { kind: 'invent'|'design', id, prog(0~1), place, months, fails }
//   made: 내가 만든 새 물건 id들, invented: 내 이름으로 앞당긴 발명 id들, sold: 상단에 판 발명 id들
//   royalty: 매달 들어오는 사용료(은화), stolen: 도둑맞은 연구, rivalSeen: 도용 사건이 뜬 연구
import { HOOKS } from '../hooks.js';
import { INVENTIONS } from '../history/powers.js';
import { HAND } from '../techtree/nodes.js';
import { circleOf } from '../game.js';
import { L } from '../adventure/core.js';

export const RS = (g) => (g.research ??= fresh());
export function fresh() { return { project: null, made: [], invented: [], sold: [], royalty: 0, stolen: [], rivalSeen: [], fame: 0 }; }
export const here = (g) => L(g).place ?? 'ern';
const invs = (g) => g.history?.inventions ?? [];
export const invented = (g, id) => invs(g).includes(id);

// 연구할 수 있는 곳: 공방(손), 학자(글), 마탑(마력). 곳마다 잘 되는 연구가 다르다.
export const LABS = {
  harfen: { name: '하르펜 대장간 거리의 공방', kind: 'workshop' },
  leocast: { name: '왕립 서고 옆 학자들의 방', kind: 'scholar' },
  serenia: { name: '세레니아 마탑의 실험실', kind: 'tower' },
  eisen: { name: '아이젠베르크 제국 공방', kind: 'workshop' },
  hammer: { name: '쇠망치 골 드워프 대장간', kind: 'workshop' },
  verden: { name: '베르덴 성당 필사실', kind: 'scholar' },
};
export const labHere = (g) => LABS[here(g)] ?? null;
// 마탑은 아무나 들이지 않는다
export function labOpen(g) {
  const lab = labHere(g);
  if (!lab) return false;
  if (lab.kind === 'tower') return (g.magic?.certified ?? 0) >= 1 || (g.player.skills.magic ?? 0) >= 30 || !!g.tower?.member;
  return true;
}
// 발명마다 어떤 손이 필요한가: 공방(smith), 글(letters), 마력(magic)
const NEED = {
  firestone: 'magic', streetlamp: 'smith', warmstone: 'smith', manamill: 'smith', press: 'letters', signal: 'magic',
  erngrind: 'smith', plow: 'smith', forge: 'smith', healstone: 'magic', ironcart: 'letters', railroad: 'smith',
};
const LAB_FIT = { workshop: 'smith', scholar: 'letters', tower: 'magic' };

// 아무도 만들지 않은 새 물건: 발명이 나온 뒤에야 떠올릴 수 있다. 만들면 매달 쓸모가 있다.
export const DESIGNS = {
  pocketlamp: { name: '접는 등석 등', needs: ['streetlamp'], hand: 'smith', cost: 8, work: 3, desc: '품에 넣고 다니는 작은 등석 등. 밤길과 미궁 입구에서 쓴다.', effect: '밤이 덜 무섭다 (스트레스가 조금 준다)' },
  kiln: { name: '온석 가마', needs: ['warmstone'], hand: 'smith', cost: 12, work: 4, desc: '장작 없이 그릇과 벽돌을 굽는 가마. 만든 것을 내다 판다.', effect: '구운 것을 팔아 매달 은화 2닢' },
  loom: { name: '마석 물레', needs: ['manamill'], hand: 'smith', cost: 15, work: 5, desc: '마석 방아의 굴대를 줄여 물레에 붙였다. 실 잣는 손이 셋 몫을 한다.', effect: '집안 살림에 매달 은화 3닢' },
  coldbox: { name: '냉석 저장고', needs: ['warmstone', 'manamill'], hand: 'magic', cost: 14, work: 5, desc: '온석 술식을 거꾸로 새겼다. 여름에도 고기가 상하지 않는다.', effect: '집안 살림에 매달 은화 2닢, 피로가 조금 준다' },
  typekit: { name: '휴대 활자틀', needs: ['press'], hand: 'letters', cost: 10, work: 4, desc: '쪽지와 방을 바로 찍어 내는 작은 활자틀.', effect: '매달 글과 학문이 조금 는다' },
  signalring: { name: '전신 반지', needs: ['signal'], hand: 'magic', cost: 20, work: 6, desc: '전신탑의 빛을 손가락 위에서 읽는 반지. 먼 소식이 먼저 닿는다.', effect: '장사 수완이 조금씩 는다' },
  prosthesis: { name: '마석 의수', needs: ['healstone', 'forge'], hand: 'magic', cost: 30, work: 7, desc: '정화석과 마석 화로 쇠로 만든 손. 다친 몸을 대신한다.', effect: '다친 곳이 빨리 아문다' },
  wheel: { name: '쇠바퀴 손수레', needs: ['ironcart'], hand: 'smith', cost: 25, work: 6, desc: '마석로를 줄여 단 손수레. 짐과 사람을 싣고 길을 줄인다.', effect: '해마다 쇠수레 표 셋 몫' },
};

// 지금 연구할 수 있는 발명: 아직 나오지 않았고, 시대보다 너무 앞서지 않은 것 (다음 둘까지)
export function inventable(g) {
  const tech = g.realm?.tech ?? 0;
  // 34단계: 기술 나무의 열린 끝(선행 기술이 다 나온 것)만, 세상보다 너무 앞서지 않은 것 가운데 앞선 셋
  return INVENTIONS.filter((v) => !invented(g, v.id) && v.id !== g.research?.claim && (v.needs ?? []).every((n) => invented(g, n)) && tech >= v.at - 0.8).sort((a, b) => b.at - a.at).slice(0, 3).map((v) => v.id);
}
export const designable = (g) => Object.entries(DESIGNS).filter(([id, d]) => !RS(g).made.includes(id) && d.needs.every((n) => invented(g, n))).map(([id]) => id);
export const inventionOf = (id) => INVENTIONS.find((v) => v.id === id) ?? null;
// 발명 하나에 드는 품: 뒤의 것일수록 크다 (달 단위로 1이 대략 한 달의 몫)
export const workOf = (p) => (p.kind === 'design' ? DESIGNS[p.id]?.work ?? 5 : 6 + (INVENTIONS.find((v) => v.id === p.id)?.at ?? 0) * 2.2); // 34단계: 나무가 커져서 순번 대신 눈금으로
export const handOf = (p) => (p.kind === 'design' ? DESIGNS[p.id]?.hand : NEED[p.id] ?? HAND[INVENTIONS.find((v) => v.id === p.id)?.field]) ?? 'smith';
export const nameOf = (p) => (p.kind === 'design' ? DESIGNS[p.id]?.name : INV_NAME[p.id] ?? INVENTIONS.find((v) => v.id === p.id)?.name) ?? '연구';
export const INV_NAME = {
  firestone: '화석(火石)', streetlamp: '등석 가로등', warmstone: '온석 화로', manamill: '마석 방아', press: '마도 인쇄기', signal: '마도 전신탑',
  erngrind: '작은 마석 방아', plow: '마석 쟁기', forge: '마석 화로', healstone: '정화석 붕대', ironcart: '마석로 쇠수레', railroad: '쇠수레 길',
};
// 34단계: 기술 나무의 나머지 마디 이름 (예전 열두 가지 이름은 그대로)
for (const v of INVENTIONS) INV_NAME[v.id] ??= v.name;

// 이 연구에 맞는 솜씨 (0~100 남짓)
export function aptitude(g, hand) {
  const p = g.player, s = p.stats, k = p.skills;
  const base = s.int * 0.5 + (k.letters ?? 0) * 0.2;
  if (hand === 'smith') return base + (k.smithing ?? 0) * 0.6 + s.sen * 0.1;
  if (hand === 'magic') return base + (k.magic ?? 0) * 0.5 + circleOf(g) * 4;
  return base + (k.letters ?? 0) * 0.5;
}
// 한 달의 진척 (0~1 사이 비율): 솜씨, 맞는 연구실, 시대가 무르익었는지
export function stepOf(g, p, rng) {
  const lab = labHere(g);
  const fit = lab && LAB_FIT[lab.kind] === handOf(p) ? 1.35 : 1;
  const ripe = p.kind === 'invent' ? Math.min(1.3, Math.max(0.5, 1 + ((g.realm?.tech ?? 0) - (inventionOf(p.id)?.at ?? 0)) * 0.8)) : 1;
  const apt = aptitude(g, handOf(p));
  return Math.max(0.02, (0.35 + apt / 60) * fit * ripe * rng.float(0.6, 1.3) / workOf(p));
}
export const canResearch = (g) => g.player.stats.int >= 25 || (g.player.skills.letters ?? 0) >= 15 || (g.player.skills.smithing ?? 0) >= 15 || (g.player.skills.magic ?? 0) >= 15;

HOOKS.newGame.push((g) => { g.research = fresh(); });
HOOKS.migrate.push((g) => { if (!g.research) g.research = fresh(); const r = g.research; for (const k of ['made', 'invented', 'sold', 'stolen', 'rivalSeen']) r[k] ??= []; r.royalty ??= 0; r.fame ??= 0; });
// 대를 이어도: 만든 물건과 사용료는 집안에 남는다. 하던 연구는 노트로만 남아 처음부터
HOOKS.heir?.push((g) => { const r = RS(g); if (r.project) r.project = { ...r.project, prog: r.project.prog * 0.4, months: 0 }; });
