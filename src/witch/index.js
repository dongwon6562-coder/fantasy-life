// 50단계 숲의 마녀와 민간 주술. 화면 연결점: witchInfo(g)(내 주술·마을의 눈길·고장의 마녀들·마녀사냥 한 장), witchLine(g)(오늘의 장면 한 줄).
// 세상 흐름 world.js, 내 삶 life.js, 상태와 자료 state.js. 장면·행동 앞머리 wi_.
import { J } from '../narrative/text.js';
import { addFact } from '../rumor/index.js';
import { KINDS as RUMOR } from '../rumor/facts.js';
import { PLACES } from '../places.js';
import { faithState, suspicionWord } from '../faith/index.js';
import { member as towerMember } from '../tower/state.js';
import {
  WS, CHARMS, LEVEL_WORD, KIND_WORD, REALM_EYE, liveWise, wiseById, placeName, realmAt, here, loreWord, lookWord, heatWord, rankOf, isWitch,
} from './state.js';
import { FEED } from './world.js';
import { hutLine } from './life.js';

/* ---------- 소문으로 ---------- */
const at = (d) => (PLACES[d.pl] ? d.pl : 'ern');
const HOW_WORD = { saved: '이웃들이 감싸 살았다', fled: '숲으로 달아났다', banished: '마을에서 쫓겨났다', fined: '벌금을 물었다', ordeal_live: '신명 재판에서 살아 나왔다', ordeal_dead: '신명 재판에서 죽었다', burned: '화형을 당했다', trial: '재판에 넘겨졌다' };
Object.assign(RUMOR, {
  wi_hunt: {
    at, big: false,
    truth: (d) => `${placeName(at(d))}에서 마녀사냥이 일어 ${J(d.name ?? '마을 끝 노파', '이/가')} ${HOW_WORD[d.how] ?? '끌려갔다'}고 한다.`,
    wrong: [(d) => `${placeName(at(d))}의 마녀는 잡히던 밤 까마귀가 되어 날아갔다는 말이 돈다.`, (d) => `${placeName(at(d))} 마녀사냥은 마녀의 밭을 탐낸 촌장이 꾸민 일이라는 말이 돈다.`],
  },
  wi_wise: {
    at, big: false,
    truth: (d) => `${placeName(at(d))} 변두리에 ${J(d.name ?? '약초 할멈', '이/가')} 들어와 산다고 한다. 해산을 잘 돕는다고 한다.`,
    wrong: [(d) => `${placeName(at(d))}에 새로 온 할멈은 백 살이 넘었다는 말이 돈다.`, () => '그 할멈의 사랑 묘약을 마시면 누구든 사흘 안에 고백한다는 말이 돈다.'],
  },
});
FEED.fact = (g, k, d) => addFact(g, k, d);

/* ---------- 화면용 ---------- */
const HOW_SHORT = { saved: '이웃들이 감쌌다', fled: '숲으로 달아났다', banished: '쫓겨났다', fined: '벌금을 물었다', ordeal_live: '신명 재판에서 살았다', ordeal_dead: '신명 재판에서 죽었다', burned: '화형', trial: '재판에 넘겨졌다' };
function wiseRow(g, w) {
  return {
    id: w.id, name: w.name, line: w.line, lineage: `${w.line} ${w.gen}대`, gen: w.gen, place: w.place, placeName: placeName(w.place),
    kind: KIND_WORD[w.kind], trust: Math.round(w.trust), word: w.gone ? `${w.gone.y}년에 ${w.gone.how === 'old' ? '숨을 거두었다' : HOW_SHORT[w.gone.how] ?? '사라졌다'}` : lookWord(w.trust), gone: !!w.gone,
    teacher: WS(g).me.teacher === w.id,
  };
}
/** 화면 한 장: 내 주술과 마을의 눈길, 고장의 마녀들, 마녀사냥 */
export function witchInfo(g) {
  if (!g?.witch) return null;
  const W = WS(g), M = W.me, f = faithState(g), pl = here(g), sex = g.player?.sex === 'm' ? 'm' : 'f';
  const teacher = M.teacher ? wiseById(g, M.teacher) : null;
  const known = Object.entries(M.known).map(([id, level]) => ({ id, name: CHARMS[id].name, icon: CHARMS[id].icon, level, word: LEVEL_WORD[level], dark: !!CHARMS[id].dark }));
  const look = Object.entries(M.look).map(([p, v]) => ({ place: p, name: placeName(p), value: Math.round(v), word: lookWord(v) }));
  const heat = Object.entries(W.heat).filter(([, v]) => v >= 15).sort((a, b) => b[1] - a[1]).map(([p, v]) => ({ place: p, placeName: placeName(p), value: Math.round(v), word: heatWord(v) }));
  const hunts = W.hunts.slice(-8).reverse().map((h) => ({ y: h.y, m: h.m, place: h.place, placeName: placeName(h.place), name: h.who, me: h.me, outcome: HOW_SHORT[h.how] ?? '' }));
  const me = {
    lore: Math.round(M.lore), loreWord: loreWord(M.lore), rank: rankOf(M, sex), teacher: teacher ? `${teacher.line}의 ${teacher.name}${teacher.gone ? ' (떠남)' : ''}` : null,
    known, fame: Math.round(M.fame), look, fraud: M.fraud, clients: M.clients, hexes: M.hexes, mark: M.mark,
    lineage: M.lineage ? `주술을 잇는 집안 ${M.lineage.gen}대째` : M.gran ? '할머니가 주술을 하던 집안' : null,
    log: M.log.slice(-10),
  };
  const town = M.look[pl] != null ? { name: placeName(pl), regard: Math.round(M.look[pl]), word: lookWord(M.look[pl]) } : null;
  const myHunt = W.hunts.filter((h) => h.me).slice(-1)[0];
  return {
    line: witchLine(g),
    me, wise: [...liveWise(g), ...W.wise.filter((w) => w.gone).slice(-4)].map((w) => wiseRow(g, w)),
    hunts, heat, news: W.log.slice(-8).reverse(), tally: { ...W.tally },
    realm: REALM_EYE[realmAt(pl)]?.word ?? '이 땅에서는 마녀를 따로 가리지 않는다',
    // 헤드가 적어 준 화면 틀(겉에 같이 둠)
    known: isWitch(g) || known.length > 0, rank: me.rank, teacher: me.teacher, power: me.lore,
    charms: known.map((k) => ({ name: k.name, text: CHARMS[k.id].stuff, uses: k.word, fake: false })),
    town, heatHere: Math.round(W.heat[pl] ?? 0),
    hunt: myHunt ? { text: `${myHunt.y}년 ${placeName(myHunt.place)}의 횃불: ${HOW_SHORT[myHunt.how] ?? ''}` } : null,
    tower: towerMember(g) ? '탑의 동료들이 시골 주술을 비웃는다' : M.lore >= 25 ? '마탑 사람들은 이걸 마법이라 부르지 않는다' : '',
    faith: suspicionWord(f.suspicion) || (M.lore >= 10 ? '사제들은 아직 눈치채지 못했다' : ''),
    kin: me.lineage ?? '',
    log: me.log,
  };
}
/** 오늘의 장면 한 줄 (같은 말은 몇 해에 한 번) */
export function witchLine(g) {
  if (!g?.witch || !g.date || !g.life || g.life.travel) return null;
  return hutLine(g);
}
export { rankOf, CHARMS };
