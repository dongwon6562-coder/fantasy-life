// 12단계: 다른 종족의 땅에서 살기. 엘프 숲·드워프 산·수인 초원의 풍습과 의식, 그 땅이 나를 받아들이는 정도,
// 종족끼리의 편견과 우정, 섞인 혈통 자식, 하프엘프의 삶. 화면용: peoplesInfo(g), peoplesLine(g).
import { PS, LANDS, LAND_IDS, RITES, standingWord, tieWord, RACE_WORD } from './state.js';
import { standingOf, landHere, riteNow } from './life.js';
import './events.js';
import { L } from '../adventure/core.js';
import { byId } from '../npc.js';
export { LANDS, RITES, standingOf };
export { shiftStanding } from './life.js';
export { shiftTie } from './events.js';
export const peoplesState = PS;

const HERITAGE_WORD = { both: '두 핏줄을 모두 제 것으로 안다', land: '피의 고향에 다녀왔다', own: '우리 집 쪽으로 자랐다', free: '스스로 답을 찾는 중이다' };

export function peoplesInfo(g) {
  const P = PS(g);
  const k = landHere(g);
  return {
    here: k ? { id: k, name: LANDS[k].name, rite: riteNow(g) ? RITES[riteNow(g)].name : null } : null,
    lands: LAND_IDS.map((id) => {
      const st = P.standing[id] == null && !P.lived[id] ? null : standingOf(g, id);
      return {
        id, name: LANDS[id].name, people: LANDS[id].people,
        standing: st == null ? null : Math.round(st), standingWord: standingWord(st),
        custom: P.custom[id], customNames: LANDS[id].custom.slice(0, P.custom[id]), nextCustom: LANDS[id].custom[P.custom[id]] ?? null,
        lived: P.lived[id], named: P.named[id],
        rites: Object.entries(RITES).filter(([, r]) => r.land === id).map(([rid, r]) => ({ id: rid, name: r.name, month: r.month, done: P.rites[rid] ?? null })),
      };
    }),
    ties: Object.entries(P.ties).map(([key, v]) => { const [a, b] = key.split('|'); return { a: RACE_WORD[a], b: RACE_WORD[b], value: Math.round(v), word: tieWord(v) }; }),
    friends: P.friends,
    heritage: Object.entries(P.heritage).map(([id, h]) => ({ name: byId(g, Number(id))?.name ?? byId(g, id)?.name ?? '', word: HERITAGE_WORD[h] ?? '' })).filter((x) => x.name),
    log: P.log.slice(-10).reverse(),
  };
}

// 한 줄 요약: 그 땅에 있을 때만
export function peoplesLine(g) {
  const k = landHere(g);
  if (!k || L(g).travel) return '';
  const P = PS(g);
  const parts = [`${LANDS[k].name}: ${standingWord(standingOf(g, k))}`];
  if (P.named[k]) parts.push(`이 땅의 이름 '${P.named[k]}'`);
  const r = riteNow(g);
  if (r) parts.push(`이달은 ${RITES[r].name}`);
  return parts.join(' · ');
}
