// 잠든 용. 대륙에 몇 마리 남지 않은 오래된 존재. 상태는 g.dragon 하나.
//   dragons{ id: { state('sleep' | 'stir' | 'awake' | 'away' | 'dead'), sleep(0~100, 잠의 깊이), hoard(0~100, 보물 더미),
//             wrath(0~100, 노여움), wakes(깨어난 횟수), until(깨어 있는 마지막 달), burned(이번에 깨어 불을 놓았나),
//             known(0 모름 · 1 이름만 · 2 굴과 형편까지), bond(나와 말을 섞은 정), marked(내 핏줄을 기억한다), thief(보물을 가져간 나라), diedAt, slayer } }
//   cult{ power(0~100, 용 숭배자들의 세), offerAt(마지막 제물 해), foe(나를 원수로 안다) }
//   seekers{ sent, lost, back, stole }   bones(용골 계곡에 남은 뼈, 0~100)   stake(내가 돈을 보탠 원정대 | null)
//   me{ climbs, talks, stole, stoleFrom[], slain[], served, rescued, bones, clue, fled, faced }   seq, log[]
import { HOOKS } from '../hooks.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 천룡 산맥 서쪽 봉우리의 용왕들(여섯 가운데 하나는 이미 죽었다)과, 아직 백 살이 안 된 젊은 용 하나.
//   deep: 잠이 얼마나 무거운가 (클수록 세상이 흔들려도 덜 깬다)   pow: 맞서 싸울 때의 힘   near: 가까운 사람 고장
export const DRAGONS = {
  bronze: {
    name: '청동의 용왕', short: '청동', lair: '용왕의 봉우리', pow: 190, deep: 1, legend: 'bronze', near: 'gorge',
    desc: '용왕들 가운데 사람의 일에 가장 밝다. 죽은 용왕의 사인을 캐러 사람의 모습으로 산을 내려갔다는 말이 있다. 봉우리의 굴은 비어 있다.',
  },
  ash: {
    name: '잿빛 용왕', short: '잿빛', lair: '잿빛 골짜기', pow: 175, deep: 1, sleep: [55, 80], hoard: 70, near: 'gorge',
    desc: '백이십 년 전, 보물을 훔친 아르젠 왕국을 하룻밤에 태우고 돌아와 잠들었다. 아르젠이 가져간 것은 끝내 다 돌려받지 못했다고 한다.',
  },
  frost: {
    name: '서리 용왕', short: '서리', lair: '얼음 고개 위 빙하', pow: 165, deep: 0.85, sleep: [60, 85], hoard: 55, near: 'hammer',
    desc: '얼음 고개 위 빙하 속에서 잔다. 드워프들은 빙하가 갈라지는 소리를 용왕의 숨소리라고 부른다. 고개를 넘는 사람은 목소리를 낮춘다.',
  },
  blind: {
    name: '눈먼 용왕', short: '눈먼', lair: '구름 위 옛 둥지', pow: 150, deep: 1.25, sleep: [40, 60], hoard: 40, near: 'gorge', dreams: true,
    desc: '용왕들 가운데 가장 늙었다. 용사가 태어나기도 전에 눈을 잃었다. 잠이 얕아서, 가까이 간 사람의 꿈에 말을 건다고 한다.',
  },
  obsidian: {
    name: '흑요 용왕', short: '흑요', lair: '서쪽 끝 검은 봉우리', pow: 210, deep: 0.35, sleep: [88, 98], hoard: 90, near: 'gorge',
    desc: '마신이 봉인되던 해에 잠들어 그 뒤로 한 번도 깨지 않았다. 다른 용왕들도 그 봉우리 쪽으로는 날지 않는다.',
  },
  crimson: {
    name: '붉은 용왕', short: '붉은', lair: '용골 계곡', pow: 0, dead: true, near: 'gorge',
    desc: '몇 해 전 천룡 산맥에서 죽었다. 상처도 독도 없었다고 한다. 뼈가 계곡에 그대로 남아 도굴꾼들이 끊이지 않는다.',
  },
  young: {
    name: '그을음', short: '그을음', title: '젊은 용', lair: '젊은 용의 둥지', pow: 95, young: true, hoard: 15, near: 'hammer',
    desc: '아직 백 살이 안 된 젊은 용. 드워프들이 그을음이라 부른다. 성질이 급하고, 반짝이는 것이라면 소 떼든 마차든 채 간다.',
  },
};
export const DRAGON_IDS = Object.keys(DRAGONS);
export const SLEEPERS = DRAGON_IDS.filter((id) => DRAGONS[id].sleep);
export const nameOf = (id) => DRAGONS[id]?.name ?? '용';
// 용의 땅 어귀: 여기서 천룡 산맥 서쪽으로 오른다
export const GATES = ['gorge', 'hammer'];

export const sleepWord = (v) => (v >= 75 ? '깊이 잠들어 있다' : v >= 50 ? '잠들어 있다' : v >= 25 ? '잠이 얕아졌다' : '뒤척인다');
export const STATE_WORD = { sleep: '잠들어 있다', stir: '뒤척인다', awake: '깨어 있다', away: '굴을 비웠다', dead: '죽었다' };

export const DS = (g) => (g.dragon ??= fresh(g));
const freshMe = () => ({ climbs: 0, talks: 0, stole: 0, stoleFrom: [], slain: [], served: false, rescued: 0, bones: 0, clue: false, fled: 0, faced: 0 });
export function fresh(g) {
  const seed = ((g?.rngState?.s ?? 7) >>> 0) % 997;
  const pickIn = ([a, b], k) => Math.round(a + ((seed * (k + 3) * 37) % 101) / 100 * (b - a));
  const dragons = {};
  DRAGON_IDS.forEach((id, k) => {
    const D = DRAGONS[id];
    dragons[id] = {
      state: D.dead ? 'dead' : D.legend ? 'away' : D.young ? 'awake' : 'sleep',
      sleep: D.sleep ? pickIn(D.sleep, k) : 0, hoard: D.hoard ?? 0, wrath: 0, wakes: 0, until: 0, burned: false,
      known: id === 'ash' || id === 'crimson' ? 1 : 0, bond: 0, marked: false, thief: null, diedAt: D.dead ? -36 : null, slayer: null,
    };
  });
  return { dragons, cult: { power: 20, offerAt: 0, foe: false }, seekers: { sent: 0, lost: 0, back: 0, stole: 0 }, bones: 70, stake: null, me: freshMe(), seq: 1, log: [] };
}
export function dlog(g, text) {
  const S = DS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
export const dragonOf = (g, id) => DS(g).dragons[id] ?? null;
export const isAlive = (g, id) => { const d = dragonOf(g, id); return !!d && d.state !== 'dead'; };
export const awakeOnes = (g) => SLEEPERS.filter((id) => dragonOf(g, id)?.state === 'awake');
export const stirring = (g) => SLEEPERS.filter((id) => dragonOf(g, id)?.state === 'stir');
export const totalWakes = (g) => SLEEPERS.reduce((a, id) => a + (dragonOf(g, id)?.wakes ?? 0), 0);
export const know = (g, id, n) => { const d = dragonOf(g, id); if (d) d.known = Math.max(d.known, n); };

HOOKS.newGame.push((g) => { g.dragon = fresh(g); });
HOOKS.migrate.push((g) => {
  const S = DS(g), f = fresh(g);
  for (const k of Object.keys(f)) S[k] ??= f[k];
  for (const id of DRAGON_IDS) S.dragons[id] ??= f.dragons[id];
  S.me = Object.assign(freshMe(), S.me ?? {});
  S.cult = Object.assign(f.cult, S.cult ?? {});
});
// 대를 이으면: 용은 핏줄을 기억한다(노여움과 표시는 남는다). 말을 섞은 정은 옅어지고, 숭배자 무리에서는 나온 셈이 된다.
HOOKS.heir?.push((g) => {
  const S = DS(g);
  for (const id of DRAGON_IDS) { const d = S.dragons[id]; d.bond = Math.round(d.bond / 2); }
  S.me.served = false;
  S.stake = null;
});
