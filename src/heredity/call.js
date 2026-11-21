// 28단계 헤드: 어릴 때 재능을 알아본 사람이 열여섯 무렵 다시 부른다.
// 장사·신앙 재능은 그 길의 문(은저울 상단, 성광교)이 하르펜·왕도에만 있어, 고향에 머무는 사람은 재능을 타고나도 길이 열리지 않았다(tools/giftwatch.js).
// 어릴 때 '몇 해 드나들며 배우게 한다'를 고른 집에만 온다. 가면 하르펜으로 옮겨 그 소속의 말단이 된다. 안 가도 된다.
import { HOOKS } from '../hooks.js';
import { playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { takeJob } from '../jobs.js';
import { fac, FACTIONS } from '../factions.js';
import { realmState, realmOf } from '../realms/index.js';
import { HD, personRng } from './core.js';
import { giftOf } from './life.js';

const mi = (g) => g.date.year * 12 + (g.date.month - 1);
const CALL = {
  trade: {
    who: '은저울 상단의 행수', fid: 'merchants', job: 'trader', rank: 1,
    text: (g) => `어릴 적 장날마다 셈을 거들던 나를 눈여겨보던 상단 행수에게서 편지가 왔다. "그때 그 아이가 이제 장정이 되었겠군. 하르펜 본점에 자리가 하나 비었다. 짐꾼 말고 점원 자리다." 봉투에는 하르펜까지 갈 마찻삯이 들어 있었다.`,
    go: '은저울 상단의 점원이 되었다. 첫날 행수는 장부 한 권을 건네며 말했다. "숫자는 거짓말을 안 한다. 사람이 하지."',
  },
  faith: {
    who: '성광교의 순회 사제', fid: 'church', job: 'cleric', rank: 0,
    text: (g) => `어릴 적 예배당 맨 앞자리의 나를 오래 지켜보던 순회 사제가 다시 마을에 왔다. 이제는 머리가 하얗다. "하르펜 성당에 수련자 자리를 마련해 두었다. 네가 원한다면." 그는 대답을 재촉하지 않았다.`,
    go: '하르펜 성당의 수련자가 되었다. 새벽 종보다 먼저 일어나는 법을 배우는 데 한 철이 걸렸다.',
  },
};
const canCall = (g) => {
  const k = giftOf(g), H = HD(g);
  return !!k && !!CALL[k] && H.went && !H.called && playerAge(g) >= 16 && playerAge(g) <= 19 && !g.over && !L(g).travel && !fac(g, CALL[k].fid)?.member;
};

HOOKS.afterMonth.push((g) => {
  if (!canCall(g) || sceneQueued(g, 'heredity_call')) return;
  const rng = personRng(g, mi(g), 23);
  if (rng.chance(0.12)) queueScene(g, 'heredity_call', { gift: giftOf(g) });
});

defineScene('heredity_call', {
  need: (g, s) => canCall(g) && giftOf(g) === s.gift,
  title: (g, s) => CALL[s.gift].who,
  text: (g, s) => CALL[s.gift].text(g),
  choices: () => [
    { label: '하르펜으로 간다', key: 'go' },
    { label: '고맙지만 고향에 남는다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    const H = HD(g), c = CALL[s.gift];
    H.called = true;
    if (key === 'no') { note(g, `${J(c.who, '이/가')} 불렀지만 고향에 남았다.`); return '정중하게 답장을 썼다. 쓰고 나서 한참 동안 봉투를 붙이지 못했다.'; }
    const life = L(g);
    life.place = 'harfen'; life.travel = null;
    const R = realmState(g); R.cur = realmOf('harfen'); R.last = 'harfen';
    if (!['street', 'barracks'].includes(life.home)) life.home = 'inn';
    life.fac ??= {};
    const prev = life.fac[c.fid];
    life.fac[c.fid] = { member: true, rank: Math.max(prev?.rank ?? 0, c.rank), merit: Math.max(prev?.merit ?? 0, FACTIONS[c.fid].merit[c.rank] ?? 0) };
    takeJob(g, c.job);
    stress(g, 4);
    note(g, `${J(c.who, '을/를')} 따라 하르펜으로 떠났다.`);
    chron(g, `${J(g.player.name, '이/가')} 고향을 떠나 하르펜으로 갔다.`, 40);
    return c.go;
  },
});
