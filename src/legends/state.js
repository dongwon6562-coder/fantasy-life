// 세계의 큰 인물들: 십강과 그 둘레의 이름들. 설정 문서의 인물이 history 안에서 나이 들고, 옮겨 다니고, 죽고, 자리가 바뀐다.
// 상태는 g.legends 하나.
//   list: 큰 인물들 [{ id, name, title, kind, race, age, alive, power, at, haunts, bond, role, met, seen, ... }]
//   ranks: 지난 발표의 십강 순서 (id, 플레이어는 'player')
//   playerRank: 플레이어의 십강 순위 (없으면 null), pbonus: 도전에서 얻고 잃은 이름값
// role: 플레이어와의 얽힘. master(스승) · foe(적) · patron(은인·뒷배) · null
import { HOOKS } from '../hooks.js';
import { circleOf } from '../game.js';
import { L } from '../adventure/core.js';

// 거처: 게임 안 장소 id, 또는 'far'(마대륙·얼음 해협처럼 플레이어가 갈 수 없는 곳)
export const ROSTER = [
  { id: 'noah', name: '노아 엘베르트', title: '대마도사', kind: 'mage', race: 'human', age: null, power: 100, haunts: ['far'], timeless: true,
    desc: '용사 일행의 마법사. 7서클. 봉인의 마지막 순간 자기 몸의 시간을 멈추고, 500년째 북쪽 끝 감시탑에서 봉인을 지킨다.' },
  { id: 'bronze', name: '청동의 용왕', title: '용왕', kind: 'dragon', race: 'dragon', age: null, power: 97, haunts: ['barka'], timeless: true, hidden: true,
    desc: '천룡 산맥의 용왕. 죽은 용왕의 사인을 캐러 사람의 모습으로 자유도시에 내려와 있다는 소문이 있다.' },
  { id: 'garbes', name: '가르베스', title: '붉은 마왕', kind: 'demon', race: 'demon', age: null, power: 95, haunts: ['far'], timeless: true,
    desc: '붉은 마왕령의 주인. 중앙 대륙을 노린다. 마신이 돌아오는 것을 누구보다 두려워한다.' },
  { id: 'leon', name: '레온 발하르트', title: '검왕', kind: 'sword', race: 'human', age: 51, power: 92, haunts: ['eisen', 'eisen', 'eisen', 'leocast'],
    desc: '발하르트 황제의 숙부. 죽기 전에 검신의 경지에 닿고 싶어 하고, 자기를 넘어설 제자를 찾고 있다.' },
  { id: 'eleanor', name: '엘리노어', title: '황혼의 여마왕', kind: 'demon', race: 'demon', age: null, power: 90, haunts: ['far'], timeless: true,
    desc: '세 마왕 가운데 인간과 교역하는 유일한 마왕. 오래전 사랑했던 인간이 있었다고 한다.' },
  { id: 'magnus', name: '마그누스', title: '마도사 협회장', kind: 'mage', race: 'human', age: 88, power: 84, haunts: ['serenia', 'serenia', 'serenia', 'leocast'],
    desc: '6서클 대마법사. 세레니아의 중립을 지킨다. 금기 파벌의 뒷배가 바로 그라는 말은 아무도 입 밖에 내지 않는다.' },
  { id: 'cecilia', name: '세실리아', title: '성흔대장', kind: 'holy', race: 'human', age: 29, power: 80, haunts: ['solaris', 'solaris', 'leocast', 'harfen', 'verden'],
    desc: '성광 신성국 성흔기사단의 대장. 교황의 명령이라면 끝까지 간다. 그녀 자신이 용사 의식의 실패작이라는 것은 교단의 비밀이다.' },
  { id: 'kairen', name: '카이렌 하스', title: 'S급 모험가', kind: 'adventurer', race: 'human', age: 36, power: 78, haunts: ['barka', 'harfen', 'leocast', 'graubel'],
    desc: '자유도시 출신 S급 모험가. 끝없는 탑 79층의 기록을 가졌다. 동료를 셋 잃은 뒤로 혼자 다닌다.' },
  { id: 'garum', name: '가룸', title: '수인 대족장', kind: 'beast', race: 'beast', age: 38, power: 77, haunts: ['fur', 'fur', 'silverleaf'],
    desc: '호랑이 수인. 수인 부족 연합의 대족장. 어릴 때 성광국의 노예였다. 잡혀간 동족을 되찾는 것이 그의 전쟁이다.' },
  { id: 'bram', name: '브람', title: '모루왕', kind: 'dwarf', race: 'dwarf', age: 214, power: 72, haunts: ['hammer'],
    desc: '드워프 왕국의 대장장이 왕. 볼가르의 도끼를 들 수 있는 사람을 위해 쓸 칼을 반백 년째 벼리고 있다.' },
];
export const RANK_N = 10;
export const MAX_LIST = 16;

export function freshLegends() {
  return {
    list: ROSTER.map((r) => ({ id: r.id, name: r.name, title: r.title, kind: r.kind, race: r.race, age: r.age, power: r.power, at: r.haunts[0], haunts: r.haunts, timeless: !!r.timeless, hidden: !!r.hidden, alive: true, bond: 0, role: null, met: false, seen: false })),
    ranks: ROSTER.map((r) => r.id),
    playerRank: null, pbonus: 0, news: [], dragon: null, lastAnnounce: 0,
  };
}
export const LG = (g) => (g.legends ??= freshLegends());
export const legend = (g, id) => LG(g).list.find((x) => x.id === id) ?? null;
export const alive = (g, id) => { const x = legend(g, id); return !!x && x.alive; };
export const here = (g) => L(g).place ?? 'ern';
export const atHere = (g, id) => { const x = legend(g, id); return !!x && x.alive && x.at === here(g) && !L(g).travel; };
export const roleOf = (g, id) => legend(g, id)?.role ?? null;
export const legendName = (x) => `${x.title} ${x.name}`;
export const yearsOld = (x) => (x.age == null ? null : Math.floor(x.age));

// 플레이어가 대륙에서 얼마나 강한가 (십강과 같은 잣대). 서클은 높을수록 크게, 하지만 6서클도 노아에 못 미친다.
const CIRCLE_SCORE = [0, 8, 16, 26, 38, 52, 68, 85, 95, 100];
export function playerScore(g) {
  const p = g.player;
  const s = p.stats;
  // 유파 등급: 없음·입문·숙련·상급·검성·검왕
  const sword = (p.skills.sword ?? 0) * 0.5 + ([0, 0, 2, 5, 12, 20][(g.sword?.rank ?? -1) + 1] ?? 0);
  const magic = CIRCLE_SCORE[circleOf(g)] ?? 0;
  const body = ((s.str + s.agi + s.wil + s.sen) / 4) * 0.15;
  const fame = Math.min(10, (L(g).renown ?? 0) / 15);
  const best = Math.max(sword, magic) + Math.min(sword, magic) * 0.25;
  return Math.round((best + body + fame + (LG(g).pbonus ?? 0)) * 10) / 10;
}

HOOKS.newGame.push((g) => { g.legends = freshLegends(); });
HOOKS.migrate.push((g) => {
  if (!g.legends) { g.legends = freshLegends(); return; }
  const lg = g.legends;
  lg.list ??= []; lg.ranks ??= []; lg.news ??= []; lg.pbonus ??= 0;
  // 나중에 더한 인물이 예전 저장에 없으면 채운다
  for (const r of ROSTER) if (!lg.list.some((x) => x.id === r.id)) lg.list.push({ ...freshLegends().list.find((x) => x.id === r.id) });
});
// 대를 이으면: 원수는 원수로 남고(부모의 원한은 물려받는다), 스승의 인연은 끊기며, 은인은 집안의 은인으로 남되 정은 옅어진다
HOOKS.heir?.push((g) => {
  const lg = LG(g);
  for (const x of lg.list) {
    if (x.role === 'master') x.role = null;
    if (x.role === 'patron') x.bond = Math.round(x.bond / 2);
    if (x.role === 'foe') x.bond = Math.min(x.bond, -20);
    x.met = x.role != null;
  }
  lg.playerRank = null; lg.pbonus = 0;
  lg.ranks = lg.ranks.filter((id) => id !== 'player');
});
