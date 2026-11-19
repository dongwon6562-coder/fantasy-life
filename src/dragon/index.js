// 20단계: 잠든 용. 대륙에 몇 마리 남지 않은 오래된 존재로서의 용.
// 용왕들의 잠과 깨어남의 징조, 용 숭배자, 보물과 그것을 노리는 원정대, 용과 말을 섞는 일, 용 사냥과 그 값.
// 화면용: dragonInfo(g), dragonLine(g)
import { J } from '../narrative/text.js';
import { DS, DRAGONS, DRAGON_IDS, STATE_WORD, sleepWord, nameOf, awakeOnes, stirring } from './state.js';
import './world.js';
import './life.js';
import { hasScale } from './life.js';

export { DRAGONS, DRAGON_IDS };
export { dragonMonth, burnPlace } from './world.js';
export const dragonState = DS;

const hoardWord = (v) => (v >= 70 ? '산더미' : v >= 40 ? '크다' : v >= 15 ? '쌓이는 중' : '보잘것없다');
const cultWord = (v) => (v >= 60 ? '세가 크다. 산 아래 고장까지 붉은 끈이 보인다' : v >= 35 ? '찾아오는 사람이 늘었다' : v >= 15 ? '산속 마을 하나뿐이다' : '거의 흩어졌다');

// 화면용 한 장. 플레이어가 아는 용만 보여 준다 (known 0은 빼고, 1은 이름과 소문만, 2는 형편까지).
//   { dragons[{ id, name, title, lair, desc, state, word, known, wrath(known 2+ 낱말), hoard(known 2+ 낱말), marked, bond, slayer }],
//     awake[이름], stirring[이름](아는 것만), cult{ word, served, foe }, seekers{ sent, lost, back, stole }, bones(낱말),
//     me{ climbs, talks, stole, slain[이름], rescued, bones, clue, faced, fled, scale(청동의 비늘이 있나) }, stake(돈 보탠 원정대 | null), log[{y,m,text}] }
export function dragonInfo(g) {
  const S = DS(g);
  const dragons = DRAGON_IDS.filter((id) => S.dragons[id].known >= 1).map((id) => {
    const d = S.dragons[id], D = DRAGONS[id], k = d.known;
    const state = d.state === 'sleep' && k >= 2 ? sleepWord(d.sleep) : STATE_WORD[d.state] ?? '';
    return {
      id, name: D.name, title: D.title ?? (D.legend || D.sleep || D.dead ? '용왕' : '용'), lair: D.lair, desc: D.desc,
      state: d.state, word: state, known: k,
      wrath: k >= 2 && d.state !== 'dead' ? (d.wrath >= 60 ? '노여움이 크다' : d.wrath >= 25 ? '노여워한다' : '') : '',
      hoard: k >= 2 && d.state !== 'dead' && D.hoard ? hoardWord(d.hoard) : '',
      marked: !!d.marked, bond: Math.round(d.bond), slayer: d.slayer ?? null,
    };
  });
  return {
    dragons,
    awake: awakeOnes(g).map(nameOf),
    stirring: stirring(g).filter((id) => S.dragons[id].known >= 1).map(nameOf),
    cult: { word: cultWord(S.cult.power), served: !!S.me.served, foe: !!S.cult.foe },
    seekers: { ...S.seekers },
    bones: S.bones >= 50 ? '뼈가 아직 많다' : S.bones >= 20 ? '많이 뜯겨 나갔다' : '거의 남지 않았다',
    me: { climbs: S.me.climbs, talks: S.me.talks, stole: S.me.stole, slain: S.me.slain.map(nameOf), rescued: S.me.rescued, bones: S.me.bones, clue: !!S.me.clue, faced: S.me.faced, fled: S.me.fled, scale: hasScale(g) },
    stake: S.stake ? { target: nameOf(S.stake.target), amount: S.stake.amount } : null,
    log: S.log.slice(-10).reverse(),
  };
}
// 머리글 한 줄: 용이 깨어 있거나, 아는 용이 뒤척이거나, 내 핏줄을 기억하는 용이 있을 때만
export function dragonLine(g) {
  const S = DS(g), aw = awakeOnes(g), st = stirring(g).filter((id) => S.dragons[id].known >= 1);
  if (aw.length) return `용: ${nameOf(aw[0])} 깨어 있음`;
  if (st.length) return `용: ${nameOf(st[0])} 뒤척임`;
  const mk = DRAGON_IDS.find((id) => S.dragons[id].marked && S.dragons[id].state !== 'dead');
  if (mk) return `용: ${J(nameOf(mk), '이/가')} 내 핏줄을 기억함`;
  return null;
}
