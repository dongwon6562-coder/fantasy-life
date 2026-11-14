// 왕국의 전쟁에 불려 나가기. 레오니아가 전쟁 중이면 봉신(영주)과 정기사 이상의 기사는 소집된다.
// 나가서 싸우면 전쟁 지휘 모드(battle.js)로 한 전장을 맡는다. 방패세를 내고 빠지거나, 거부할 수도 있다.
// 결과는 세계 정세(world.js의 g.realm)를 조금 움직인다.
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, isAdult, traveling } from '../adventure/core.js';
import { atWar, nudge, monthIndex } from '../world.js';
import { D, LIEGE_NAME } from '../domain/state.js';
import { ourArmy, queueBattle, BATTLE_OUTS } from './battle.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 지금 벌어진 전쟁들
export function activeWars(g) {
  const r = g.realm;
  if (!r) return [];
  const out = [];
  if (r.balhart.war) out.push('balhart');
  if (r.north.war) out.push('garbes');
  if (r.succession === 'civilwar') out.push('civil');
  return out;
}

// 소집 대상인가: 왕국의 봉신 영주, 또는 기사단의 정기사 이상
export function summonable(g) {
  if (!isAdult(g) || traveling(g) || L(g).expedition) return null;
  const d = D(g);
  if (d && d.liege && !d.regent) return 'vassal';
  const k = L(g).fac.knights;
  if (k?.member && k.rank >= 2 && L(g).job?.id === 'knight') return 'knight';
  return null;
}

const WAR_TEXT = {
  balhart: { title: '발하르트 전선', intro: '동쪽 국경. 제국군의 검은 독수리 깃발이 강 건너 언덕을 덮었다.' },
  garbes: { title: '북부 변경', intro: '북부 변경백령의 무너진 요새 앞. 붉은 깃발 아래 마족과 오크가 뒤섞여 있다.' },
  civil: { title: '왕위 내전', intro: '어제까지 같은 왕의 깃발 아래 있던 기사들이 들판 건너편에 진을 쳤다.' },
};

function queueSummons(g, rng, war) {
  const kind = summonable(g);
  const d = D(g);
  const side = ourArmy(g);
  const who = kind === 'vassal' ? LIEGE_NAME[d.liege] : `${L(g).fac.knights.order === 'leocast' ? '왕국' : '베르덴 백작'} 기사단`;
  const extra = [];
  if (kind === 'vassal') {
    const fee = Math.max(20, Math.round(d.garrison * 2));
    if (d.treasury >= fee) extra.push({ label: `방패세를 내고 빠진다 (금고 은화 ${fee}닢)`, key: 'scutage' });
    extra.push({ label: '소집을 거부한다', key: 'refuse' });
  } else extra.push({ label: '병을 핑계로 빠진다', key: 'refuse' });
  const W = WAR_TEXT[war];
  queueBattle(g, {
    title: W.title,
    intro: `${who}의 소집령이 왔다. ${W.intro}`,
    enemy: { key: war, troops: Math.max(20, Math.round(side.troops * rng.float(0.8, 1.7))) },
    context: 'summons', war, role: kind, fee: extra[0]?.key === 'scutage' ? Math.max(20, Math.round(d.garrison * 2)) : 0,
    reward: { renown: 4, treasury: kind === 'vassal' ? rng.int(20, 60) : 0, favor: 6 },
    big: true, extra,
  }, { first: true });
  L(g).lastSummons = monthIndex(g);
}

/* ---------- 내전: 어느 왕자 편에 설까 ---------- */
defineScene('civil_side', {
  title: () => '두 왕자',
  text: () => '왕국이 둘로 갈렸다. 루돌프 왕자는 왕도와 귀족들을, 에릭 왕자는 기사단을 쥐었다. 양쪽 모두 사자를 보내 충성을 요구한다. 어느 쪽도 들지 않으면, 이긴 쪽이 기억할 것이다.',
  choices: () => [
    { label: '루돌프 왕자 편에 선다', key: 'rudolf' },
    { label: '에릭 왕자 편에 선다', key: 'erik' },
    { label: '어느 편도 들지 않는다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const d = D(g);
    if (!d) return '';
    d.side = key;
    if (key === 'none') { d.favor = clamp(d.favor - 8, 0, 100); return '양쪽 사자를 모두 빈손으로 돌려보냈다. 그륀탈의 문은 닫혔다. 이 전쟁이 끝나면 누군가 그 문을 두드릴 것이다.'; }
    note(g, `왕위 내전에서 ${key === 'rudolf' ? '루돌프' : '에릭'} 왕자 편에 섰다.`);
    return `${key === 'rudolf' ? '루돌프' : '에릭'} 왕자의 사자 앞에서 충성을 맹세했다. 이제 그 깃발이 지면, 나도 함께 진다.`;
  },
});

/* ---------- 결과 ---------- */
function moveWar(g, s, amt) {
  const r = g.realm;
  if (!r) return;
  if (s.war === 'balhart') r.balhart.front += amt * 1.5;
  else if (s.war === 'garbes') nudge(g, 'garbes', -amt * 3);
  else if (s.war === 'civil') {
    const side = D(g)?.side ?? 'erik'; // 기사는 기사단을 쥔 에릭 쪽이다
    nudge(g, 'rudolf', (side === 'rudolf' ? 1 : -1) * amt * 3);
  }
}
const merit = (g, n) => { const k = L(g).fac.knights; if (k?.member) k.merit = Math.max(0, k.merit + n); };

BATTLE_OUTS.summons = {
  win: (g, rng, s) => {
    moveWar(g, s, 1);
    merit(g, 25);
    // 영지가 없는 기사가 큰 공을 세우면 땅을 받을 수 있다
    if (!D(g) && L(g).renown >= 25 && rng.chance(0.35) && !sceneQueued(g, 'fief_grant')) {
      queueScene(g, 'fief_grant', { liege: L(g).fac.knights?.order === 'leocast' ? 'crown' : 'verden' });
      return '이 싸움의 공은 크다. 주군이 나를 따로 부를 것이라는 말이 돌았다.';
    }
    return '이 전장의 승리가 전선 전체에 작은 힘을 보탰다.';
  },
  lose: (g, rng, s) => { moveWar(g, s, -1); const d = D(g); if (d) d.favor = clamp(d.favor - 3, 0, 100); return '우리 쪽이 무너진 자리로 적이 밀고 들어왔다.'; },
  draw: () => '양쪽 모두 피만 흘렸다. 전선은 그대로다.',
  other: (g, rng, s, key) => {
    const d = D(g);
    if (key === 'scutage' && d && d.treasury >= s.fee) { d.treasury -= s.fee; d.favor = clamp(d.favor - 2, 0, 100); return `방패세 은화 ${s.fee}닢을 보냈다. 주군은 돈을 받았지만, 싸우지 않은 봉신의 이름도 함께 적어 두었다.`; }
    if (d) { d.favor = clamp(d.favor - 15, 0, 100); L(g).renown = Math.max(0, L(g).renown - 3); return `소집을 거부했다. ${J(LIEGE_NAME[d.liege] ?? '주군', '이/가')} 크게 노했다는 말이 들려왔다.`; }
    merit(g, -40);
    return '열병이 났다며 숙소에 누웠다. 동료 기사들의 눈길이 차가워졌다.';
  },
};

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !atWar(g)) return;
  const kind = summonable(g);
  if (!kind) return;
  const life = L(g);
  if (life.lastSummons != null && monthIndex(g) - life.lastSummons < 5) return;
  if (sceneQueued(g, 'battle') || sceneQueued(g, 'civil_side')) return;
  const wars = activeWars(g);
  const d = D(g);
  // 영주라면 내전에서 먼저 편을 정한다
  if (wars.includes('civil') && kind === 'vassal' && !d.side) { queueScene(g, 'civil_side', {}, { first: true }); return; }
  const pool = wars.filter((w) => !(w === 'civil' && kind === 'vassal' && d.side === 'none'));
  if (!pool.length || !rng.chance(0.2)) return;
  queueSummons(g, rng, rng.pick(pool));
});
// 내전이 끝나면 편 가르기도 끝난다
HOOKS.afterMonth.push((g) => {
  const d = D(g);
  if (d?.side && g.realm?.succession !== 'civilwar') {
    const won = (g.realm.ruler === 'rudolf' && d.side === 'rudolf') || (g.realm.ruler === 'erik' && d.side === 'erik');
    if (d.side !== 'none') { d.favor = clamp(d.favor + (won ? 20 : -25), 0, 100); g.news.unshift({ text: won ? '내가 편든 왕자가 왕좌에 올랐다. 새 왕은 충성을 기억한다.' : '내가 편든 왕자가 졌다. 새 왕의 궁정에서 내 이름은 반역자 명단 가까이에 있다.', rel: 100 }); }
    if (won) chron(g, `${g.player.name}, 내전에서 이긴 편에 서다.`);
    d.side = null;
  }
});

export { queueSummons };
