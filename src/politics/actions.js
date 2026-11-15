// 용병으로 남의 나라 전쟁에 나간다: 싸우는 나라의 땅이나 용병이 모이는 자유도시에서.
// 한 달 싸우면 품삯과 이름값, 다치기도 하고, 이긴 쪽 전선이 조금 민다. 거느린 병사가 있으면 큰 싸움에 불려 간다.
import { ACTIONS } from '../actions.js';
import { playerAge, gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, note, chron, tired, stress, check } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { ARMIES, BATTLE_OUTS, ourArmy, queueBattle } from '../war/battle.js';
import { isJailed } from '../crime.js';
import { realmOf } from '../realms/index.js';
import { NATURE } from './data.js';
import { PS, mi, short, full, ownWars, foeIn, edgeOf } from './state.js';

// 나라마다 군대 (전쟁 지휘 모드가 쓴다)
for (const [id, n] of Object.entries(NATURE)) {
  ARMIES[`realm_${id}`] ??= { name: `${id === 'elf' ? '엘프' : id === 'dwarf' ? '드워프' : id === 'beast' ? '수인' : ''}${id === 'elf' || id === 'dwarf' || id === 'beast' ? ' 전사단' : '군'}`, q: Math.round(35 + n.power * 0.4), champ: Math.round(40 + n.power * 0.4), champName: '적 기사', foe: 'bandit_chief', beast: id === 'beast' };
}
const ARMY_NAME = { leonia: '레오니아군', valhart: '제국군', holy: '성광국 성전기사단', serenia: '세레니아 마도병', free: '자유도시 용병단', march: '변경백령 수비대', elf: '엘프 전사단', dwarf: '드워프 도끼 부대', beast: '수인 전사단', sea: '해상 연맹 수병' };
for (const id of Object.keys(NATURE)) if (ARMIES[`realm_${id}`]) ARMIES[`realm_${id}`].name = ARMY_NAME[id];

const MERC_HUBS = ['barka', 'portel', 'saltmare'];
// 지금 이곳에서 끼어들 수 있는 전쟁과 편: 싸우는 나라 땅이면 그 나라 편, 용병 도시면 밀리는 쪽이 더 준다
export function mercOffer(g) {
  const here = L(g).place;
  const realm = realmOf(here);
  const wars = ownWars(g);
  const mine = wars.find((w) => w.a === realm || w.b === realm);
  if (mine) return { war: mine, side: realm };
  if (MERC_HUBS.includes(here) && wars.length) {
    const w = wars[0];
    return { war: w, side: w.score > 0 ? w.b : w.a };
  }
  return null;
}

ACTIONS.push({
  id: 'pol_merc', name: '용병으로 싸우기', icon: 'sword',
  desc: '남의 나라 전쟁에 칼을 판다. 싸우는 나라의 땅이나 용병이 모이는 자유도시에서. 품삯과 이름값을 얻지만 다치기 쉽다.',
  available: (g) => playerAge(g) >= 16 && isAdult(g) && !L(g).travel && !isJailed(g) && !!mercOffer(g),
  run(g, rng) {
    const P = PS(g);
    const o = mercOffer(g);
    if (!o) return '전쟁은 그새 끝나 있었다. 용병들이 빈 막사 앞에서 주사위를 굴리고 있었다.';
    const { war: w, side } = o;
    const foe = foeIn(w, side);
    // 한 달에 큰 싸움은 한 번: 나머지 칸은 진영에서 기다린다
    if (P.me.mercAt === mi(g)) { tired(g, 6); return `${ARMY_NAME[side]} 진영에서 다음 싸움을 기다렸다. 칼을 갈고, 죽은 동료의 짐을 나눴다.`; }
    P.me.mercAt = mi(g);
    P.me.merc += 1;
    if (P.me.mercFor !== side) { P.me.mercFor = side; note(g, `${ARMY_NAME[side]}에 용병으로 들어갔다.`); }
    tired(g, 22); stress(g, 8);
    gainSkill(g, 'sword', 0.6, 'str');
    // 거느린 병사가 있으면 큰 싸움에 불려 간다
    const side0 = ourArmy(g);
    if (side0.troops > 0 && rng.chance(0.3)) {
      queueBattle(g, { context: 'pol_merc', title: `${short(side)}와(과) ${short(foe)}의 전장`, intro: `${ARMY_NAME[side]} 지휘관이 우리 병사들에게 한쪽 날개를 맡겼다.`, enemy: { key: `realm_${foe}`, troops: rng.int(60, 160) }, side, foe, big: true, reward: { renown: 4 } });
      return `${ARMY_NAME[side]}의 진영에 닿았다. 지휘관이 우리 병사들을 보고 고개를 끄덕였다. 큰 싸움이 다가온다.`;
    }
    const pow = playerPower(g);
    const hard = 34 + (NATURE[foe]?.power ?? 45) * 0.3 + (edgeOf(w, side) < -8 ? 8 : 0);
    const won = check(rng, pow, hard);
    const pay = Math.round(rng.int(8, 16) + Math.max(0, -edgeOf(w, side)) * 0.4);
    g.player.money += won ? pay : Math.round(pay / 2);
    if (won) {
      w.push = (w.push ?? 0) + (side === w.a ? 1 : -1) * (0.8 + Math.min(4, pow / 40));
      L(g).renown = (L(g).renown ?? 0) + 1;
      if (pow > 90 && rng.chance(0.3)) chron(g, `${g.player.name}, ${ARMY_NAME[side]}의 용병으로 ${short(foe)} 진지를 무너뜨리다.`);
      return rng.pick([
        `${short(foe)}의 정찰대를 덮쳤다. 셋을 베고 하나를 사로잡았다. 품삯 은화 ${pay}닢에 술 한 동이가 얹혀 나왔다.`,
        `성벽 아래에서 사다리를 붙들고 버텼다. 위에서 끓는 기름이 쏟아졌지만 내 자리는 무너지지 않았다. 은화 ${pay}닢.`,
        `밤에 ${short(foe)} 쪽 보급 수레를 불태웠다. 아침에 지휘관이 내 이름을 물었다. 은화 ${pay}닢.`,
      ]);
    }
    const months = rng.int(1, 3) + (rng.chance(0.1) ? 3 : 0);
    g.player.injuries.push({ name: rng.pick(['화살 맞은 어깨', '창에 찔린 옆구리', '말발굽에 밟힌 다리']), months });
    return rng.pick([
      `${short(foe)}의 기병이 옆구리를 찔러 왔다. 대열이 무너졌고 나도 쓰러졌다. 품삯은 반만 나왔다 (은화 ${Math.round(pay / 2)}닢).`,
      `진흙 속에서 하루를 싸웠는데 아무것도 얻지 못했다. 돌아와 보니 몸에 구멍이 하나 늘어 있었다. 은화 ${Math.round(pay / 2)}닢.`,
    ]);
  },
});

// 큰 싸움의 결과가 전선을 민다
BATTLE_OUTS.pol_merc = {
  win: (g, rng, s) => {
    const w = ownWars(g).find((x) => [x.a, x.b].includes(s.side) && [x.a, x.b].includes(s.foe));
    if (w) w.push = (w.push ?? 0) + (s.side === w.a ? 5 : -5);
    L(g).renown = (L(g).renown ?? 0) + 3;
    chron(g, `${g.player.name}, ${ARMY_NAME[s.side]}의 한쪽 날개를 맡아 ${J(ARMY_NAME[s.foe] ?? full(s.foe), '을/를')} 물리치다.`);
    return `${full(s.side)}의 지휘관이 내 손을 잡고 흔들었다. 이 싸움은 연대기에 남을 것이다.`;
  },
  lose: (g, rng, s) => {
    const w = ownWars(g).find((x) => [x.a, x.b].includes(s.side) && [x.a, x.b].includes(s.foe));
    if (w) w.push = (w.push ?? 0) + (s.side === w.a ? -2 : 2);
    return '무너진 날개를 수습해 겨우 빠져나왔다. 남의 나라 전쟁에서 내 병사들이 죽었다.';
  },
  other: () => '싸움을 피해 진영을 빠져나왔다. 용병의 의리란 그런 것이다.',
};
