// 군대의 삶: 레오니아 왕국군. 병졸로 들어가 훈련하고, 부사관·지휘관으로 오르고, 원정을 나가고, 포로가 되거나 탈영하고, 상처를 안고 퇴역한다.
// - 기사단(factions.js의 knights)과는 다른 길이다. 기사단은 귀족의 칼이고, 왕국군은 평민의 창이다.
// - 일자리는 jobs.js의 틀(registerJob 'soldier')을 쓰고, 계급은 game.army의 rank가 정한다.
// - 상태는 game.army 하나: 복무(service), 원정(campaign), 포로(captive), 탈영 기록, 퇴역(veteran), 상처(scars), 훈장(medals).
import { HOOKS } from '../hooks.js';
import { L, note, chron, stress } from '../adventure/core.js';
import { J } from '../narrative/text.js';

export const RANKS = ['병졸', '고참병', '십인장', '백인장', '천인장'];
export const RANK_KIND = ['병사', '병사', '부사관', '지휘관', '지휘관'];
export const MERIT = [0, 40, 120, 300, 650];      // 계급마다 쌓아야 할 공
export const PAY = [3, 4, 6, 10, 16];             // 일하러 한 번 갈 때 받는 품삯 (고장 품삯 배수 전)
export const UNITS = ['붉은 창 백인대', '하르펜 수비 백인대', '회색 늑대 백인대', '왕도 방패 백인대', '강변 궁수 백인대', '셋째 보병 백인대'];
export const BARRACKS = ['leocast', 'harfen', 'verden'];
export const TERM = 36;                           // 한 번 입대하면 세 해

export function defaultArmy() {
  return {
    v: 1,
    service: null,     // { unit, rank, merit, months, place, term, since, awol }
    campaign: null,    // { war, enemy, name, month, months, stage, morale, kills }
    captive: null,     // { by, months, ransom, officer }
    deserted: null,    // { year, realm, caught }  탈영한 기록 (붙잡히면 caught)
    veteran: null,     // { rank, years, pension, unit, year }
    scars: [],         // 몸과 마음에 남은 상처 { id, name, year }
    medals: [],        // { name, year, why }
    battles: 0, won: 0, campaigns: 0,
    comrades: [],      // 함께 싸운 이름들 { name, alive, how }
    cool: 0,
    pressCool: 0,
    log: [],           // 굵직한 일 { y, text }
  };
}
export function A(g) {
  if (!g.army) g.army = defaultArmy();
  return g.army;
}
HOOKS.newGame.push((g) => { g.army = defaultArmy(); });
HOOKS.migrate.push((g) => {
  const a = Object.assign(defaultArmy(), g.army ?? {});
  for (const k of ['scars', 'medals', 'comrades', 'log']) if (!Array.isArray(a[k])) a[k] = [];
  g.army = a;
});
// 대 잇기: 복무·원정·포로·탈영은 그 사람의 것. 훈장과 퇴역 기록은 집안 이야기로 log에 남긴다.
HOOKS.heir.push((g) => {
  const a = A(g);
  if (a.veteran || a.medals.length) a.log.push({ y: g.date.year, text: `선대가 ${a.veteran ? RANKS[a.veteran.rank] : '병사'}로 싸웠다. 훈장 ${a.medals.length}개.` });
  Object.assign(a, { service: null, campaign: null, captive: null, deserted: null, veteran: null, scars: [], medals: [], battles: 0, won: 0, campaigns: 0, comrades: [], cool: 0, pressCool: 0 });
});

export const mi = (g) => g.date.year * 12 + g.date.month;
export const enlisted = (g) => !!A(g).service;
export const onCampaign = (g) => !!A(g).campaign;
export const captive = (g) => !!A(g).captive;
export const rankOf = (g) => A(g).service?.rank ?? 0;
export const rankName = (g) => RANKS[rankOf(g)];
export const isNoble = (g) => g.player.familyId === 'fallen_knight' || !!g.player.title;
export const pickOf = (rng, a) => a[Math.floor(rng.next() * a.length)];

export function addMerit(g, n) {
  const s = A(g).service;
  if (s) s.merit = Math.max(0, s.merit + n);
}
export function logArmy(g, text, chronRel = 0) {
  A(g).log.push({ y: g.date.year, text });
  note(g, text);
  if (chronRel) chron(g, `${g.player.name}, ${text.replace(/\.$/, '')}.`, chronRel);
}

/* ---------- 전쟁의 상처 ---------- */
// 몸: 능력치를 조금 깎는다. 마음: 달마다 마음고생이 붙는다(몇 해에 걸쳐 옅어진다).
export const SCARS = {
  limp: { name: '절뚝이는 다리', stat: ['agi', 4] },
  fingers: { name: '잘린 손가락 두 개', stat: ['agi', 2], stat2: ['str', 1] },
  eye: { name: '흐려진 한쪽 눈', stat: ['sen', 4] },
  lung: { name: '화살이 지나간 폐', stat: ['str', 3] },
  burn: { name: '등에 남은 화상', stat: ['cha', 2] },
  nightmare: { name: '밤마다 돌아오는 전장', mind: true },
  ringing: { name: '귀에서 그치지 않는 북소리', mind: true },
};
export const hasScar = (g, id) => A(g).scars.some((s) => s.id === id);
export function addScar(g, rng, mind = false) {
  const pool = Object.keys(SCARS).filter((id) => !!SCARS[id].mind === mind && !hasScar(g, id));
  if (!pool.length) return null;
  const id = pickOf(rng, pool);
  const S = SCARS[id];
  A(g).scars.push({ id, name: S.name, year: g.date.year });
  for (const [st, n] of [S.stat, S.stat2].filter(Boolean)) g.player.stats[st] = Math.max(1, g.player.stats[st] - n);
  if (mind) stress(g, 10);
  note(g, `전쟁이 ${J(S.name, '을/를')} 남겼다.`);
  return S.name;
}
// 마음의 상처는 달마다 무겁다. 세월이 지나면 옅어진다.
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const a = A(g);
  for (const s of a.scars) {
    if (!SCARS[s.id]?.mind) continue;
    const yrs = g.date.year - s.year;
    if (yrs < 12 && rng.chance(0.5 - yrs * 0.035)) stress(g, 2);
  }
});
