// 내 손: 연구 후원(행동), 떠돌이 기술자 들이기, 비법 훔치기, 내 비법 지키기, 왕실 특허장, 다른 나라에 팔기, 교단과 함께 막기(사건).
// 8단계 research는 "내가 직접 연구한다". 여기는 "남의 연구에 돈을 대고, 이미 나온 기술이 어디로 가는지에 손을 댄다".
// 앞당기는 힘은 작다: 후원은 기술 하나에 품의 12%까지(몇 해 남짓), 퍼짐은 고장 하나씩.
import { ACTIONS } from '../actions.js';
import { gainStat, gainSkill } from '../game.js';
import { EVENTS, age, here, onRoad, money, spend, stress, check, setFlag } from '../events/core.js';
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { PLACES } from '../places.js';
import { addNotoriety } from '../crime.js';
import { TECH, HAND } from '../techtree/nodes.js';
import { AFTER_TECH, openTechs, costOf, TT } from '../techtree/grow.js';
import { REACT } from '../later_era/state.js';
import { RS, labHere } from '../research/state.js';
import { SP, BACK_CAP, reachedAt, addReach, livable, placeName, mi, slog } from './state.js';

const inv = (g) => g.history?.inventions ?? [];
const adult = (g) => age(g) >= 18 && !g.over && !g.bondage?.slave;
const free = (g) => adult(g) && !onRoad(g) && !L(g).travel;
const st = (g, k) => g.player.stats[k] ?? 0;
const sk = (g, k) => g.player.skills[k] ?? 0;
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const LAB_HAND = { workshop: 'smith', scholar: 'letters', tower: 'magic' };
const neighbors = (pl) => Object.keys(PLACES[pl]?.links ?? {});
// 이웃에는 있는데 이 고장엔 아직 없는 기술 (가장 앞선 것부터)
function missingHere(g, pl) {
  return inv(g).map((id) => TECH[id]).filter((t) => t && g.spread?.reach?.[t.id] && !reachedAt(g, t.id, pl) && neighbors(pl).some((nb) => reachedAt(g, t.id, nb))).sort((a, b) => b.at - a.at);
}
// 이 고장엔 있는데 이웃 어딘가엔 아직 없는 기술 (훔쳐 갈 거리)
function stealable(g, pl) {
  return inv(g).map((id) => TECH[id]).filter((t) => t && g.spread?.reach?.[t.id] && reachedAt(g, t.id, pl) && neighbors(pl).some((nb) => livable(g, nb) && !reachedAt(g, t.id, nb)) && (t.field === 'craft' || t.field === 'magic' || t.field === 'war' || t.field === 'heal')).sort((a, b) => b.at - a.at);
}
// 내 이름의 발명
const mine = (g) => (g.research?.invented ?? []).filter((id) => TECH[id] && inv(g).includes(id));
const patronFit = (g) => {
  const lab = labHere(g); if (!lab) return [];
  const S = SP(g), hand = LAB_HAND[lab.kind];
  return openTechs(g).filter((t) => HAND[t.field] === hand && (S.backed[t.id] ?? 0) < costOf(t) * BACK_CAP);
};
const patronCost = (t) => Math.round(30 + t.at * 6);

// ---------- 연구 후원 ----------
ACTIONS.push({
  id: 'spread_patron', name: '연구 후원', icon: 'coin',
  desc: '공방·학자의 방·마탑에 돈을 대어 아직 세상에 없는 무언가를 조금 앞당긴다. 내 손으로 하는 연구와 달리 돈만 낸다. 한 해에 한 번.',
  available: (g) => free(g) && money(g) >= 60 && mi(g) - SP(g).me.patronAt >= 12 && patronFit(g).length > 0,
  run(g, rng) {
    const S = SP(g), T = TT(g), list = patronFit(g);
    const t = list.sort((a, b) => (T.prog[b.id]?.[0] ?? 0) / costOf(b) - (T.prog[a.id]?.[0] ?? 0) / costOf(a))[0];
    if (!t || money(g) < patronCost(t)) return '후원할 곳을 찾지 못했다. 공방 사람들은 내 돈주머니를 한 번 보고는 고개를 저었다.';
    const add = Math.round(costOf(t) * 0.04 * 100) / 100;
    spend(g, patronCost(t));
    const pr = (T.prog[t.id] ??= [0, 1]);
    pr[0] = Math.round((pr[0] + add) * 100) / 100;
    S.backed[t.id] = Math.round(((S.backed[t.id] ?? 0) + add) * 100) / 100;
    S.me.backed += 1; S.me.patronAt = mi(g);
    gainStat(g, 'int', 0.2);
    slog(g, `${labHere(g).name}에 은화 ${patronCost(t)}닢을 댔다.`);
    const p = pr[0] / costOf(t);
    return `${labHere(g).name}에 은화 ${patronCost(t)}닢을 댔다. 사람들은 그 돈으로 재료를 사고, 밤에도 불을 켰다. 그들이 매달리는 것이 무엇인지 어렴풋이 들었다. ${p >= 0.6 ? '거의 다 왔다고 한다. 내 돈이 마지막 한 걸음이 될지도 모른다.' : p >= 0.3 ? '반쯤 왔다고 한다. 아직 몇 해는 걸린다.' : '이제 막 손을 댔다고 한다. 내 생에 볼 수 있을지는 모르겠다.'}`;
  },
});
// 후원한 기술이 나오면 내 이름도 조금
AFTER_TECH.push((g, t, who, say) => {
  const S = g.spread;
  if (!S?.backed?.[t.id] || g.over) return;
  renown(g, 4 + Math.round(S.backed[t.id] / costOf(t) * 60));
  say(`${J(t.name, '을/를')} 만든 사람들이 후원자 명단 첫 줄에 ${J(g.player.name ?? '내 이름', '을/를')} 적었다.`);
  slog(g, `내가 후원한 ${J(t.name, '이/가')} 세상에 나왔다.`);
});

EVENTS.push(
  // ---------- 떠돌이 기술자를 들이기 ----------
  {
    id: 'spread_wanderer', cooldown: 60,
    cond: (g) => free(g) && money(g) >= 15 && missingHere(g, here(g)).length > 0,
    chance: () => 0.05, weight: 35,
    prepare: (g, rng) => { const t = missingHere(g, here(g))[0]; const from = neighbors(here(g)).find((nb) => reachedAt(g, t.id, nb)); return { id: t.id, from }; },
    title: '떠돌이 기술자',
    text: (g, c) => `${placeName(c.from)}에서 왔다는 떠돌이 기술자가 주막 구석에서 연장 자루를 풀었다. "${TECH[c.id].name}, 저 너머 고장에선 벌써 다 씁니다. 여기는 아직이더군요. 한 철 묵을 곳과 밥값만 대 주면 이 고장 사람 몇에게 가르쳐 드리지요."`,
    choices: [
      { label: '묵을 곳과 밥값을 대 준다', run: (g, rng, c) => { spend(g, 15); addReach(g, c.id, here(g)); SP(g).me.taught += 1; gainSkill(g, 'smithing', 1, 'sen'); renown(g, 3); slog(g, `떠돌이 기술자를 들여 ${J(TECH[c.id].name, '을/를')} ${placeName(here(g))}에 들였다.`); return `한 철 동안 기술자는 우리 헛간에서 지냈다. 동네 젊은이 셋이 그 곁에서 손을 익혔다. 기술자가 떠나던 날, ${J(TECH[c.id].name, '은/는')} 이제 이 고장에도 있었다.`; } },
      { label: '나 혼자 배워 둔다', run: (g, rng, c) => { spend(g, 8); gainSkill(g, 'smithing', 2, 'sen'); gainStat(g, 'int', 0.3); if (rng.chance(0.4)) { addReach(g, c.id, here(g)); return '은화 여덟 닢을 주고 사흘 밤을 배웠다. 어설프게 흉내 낸 것을 이웃이 보고 따라 했다. 그렇게 고장에 들어왔다.'; } return '은화 여덟 닢을 주고 사흘 밤을 배웠다. 손에는 남았지만, 고장 사람들은 아직 낯설어했다.'; } },
      { label: '지나 보낸다', run: () => '기술자는 이튿날 새벽 다음 고장으로 떠났다. 새것은 언젠가 올 것이다. 조금 늦게.' },
    ],
  },
  // ---------- 비법 훔치기 ----------
  {
    id: 'spread_steal', cooldown: 96,
    cond: (g) => free(g) && st(g, 'sen') >= 20 && stealable(g, here(g)).length > 0,
    chance: () => 0.035, weight: 30,
    prepare: (g) => { const t = stealable(g, here(g))[0]; const to = neighbors(here(g)).find((nb) => livable(g, nb) && !reachedAt(g, t.id, nb)); return { id: t.id, to }; },
    title: '공방의 비법',
    text: (g, c) => `${placeName(c.to)}에서 왔다는 상인이 술값을 내며 바짝 다가앉았다. "이 고장 공방이 ${TECH[c.id].name} 만드는 법을 꽁꽁 숨겨 두었소. 도면 한 장, 아니 눈으로 본 것만 적어 줘도 은화 서른 닢. 우리 고장엔 아직 그게 없거든."`,
    choices: [
      { label: '밤에 공방을 들여다본다', run: (g, rng, c) => { const S = SP(g); if (check(rng, st(g, 'sen') + st(g, 'agi') / 2, 60)) { g.player.money += 30; S.me.stole += 1; addReach(g, c.id, c.to); slog(g, `${placeName(here(g))} 공방의 ${TECH[c.id].name} 비법을 훔쳐 넘겼다.`); return `창 틈으로 사흘 밤을 지켜보며 적었다. 상인은 종이를 받아 들고 은화 서른 닢을 세었다. 몇 해 뒤 ${placeName(c.to)}에도 ${J(TECH[c.id].name, '이/가')} 생겼다는 말을 들었다.`; } S.me.caught += 1; addNotoriety(g, 8); spend(g, Math.min(money(g), 20)); stress(g, 6); return '공방 개가 짖었다. 도제 둘에게 붙잡혀 경비대에 넘겨졌고, 벌금 은화 스무 닢을 물었다. 공방 주인은 다음 날부터 창에 판자를 댔다.'; } },
      { label: '거절한다', run: () => '"남의 밥줄이오." 술잔을 밀어 놓았다. 상인은 어깨를 으쓱하고 다른 탁자로 갔다.' },
      { label: '공방 주인에게 귀띔한다', run: (g) => { g.player.money += 6; gainStat(g, 'cha', 0.3); return '공방 주인은 고맙다며 은화 여섯 닢을 쥐여 주었다. 그날 밤부터 공방 문에 쇠빗장이 하나 더 걸렸다.'; } },
    ],
  },
  // ---------- 내 비법 지키기 ----------
  {
    id: 'spread_keep', cooldown: 120,
    cond: (g) => free(g) && mine(g).some((id) => !SP(g).guard[id] && !(g.spread.kept ??= {})[id] && (g.spread.reach[id]?.length ?? 99) < 8),
    chance: () => 0.06, weight: 40,
    prepare: (g) => ({ id: mine(g).find((id) => !SP(g).guard[id] && !g.spread.kept[id] && (g.spread.reach[id]?.length ?? 99) < 8) }),
    title: '도제의 주머니',
    text: (g, c) => `내 밑에서 일을 배우던 도제의 주머니에서 낯선 은화가 나왔다. 다른 고장 공방이 내 ${TECH[c.id].name} 도면을 베껴 오라고 준 돈이라고, 도제는 울면서 털어놓았다. 이걸 꽁꽁 숨기면 몫은 내 것이고, 내버려 두면 온 나라가 더 빨리 쓰게 된다.`,
    choices: [
      { label: '비법을 지킨다', run: (g, rng, c) => { const S = SP(g); S.guard[c.id] = true; S.kept[c.id] = 1; S.me.kept += 1; RS(g).royalty += 1; gainStat(g, 'wil', 0.3); slog(g, `${J(TECH[c.id].name, '을/를')} 내 비법으로 지키기로 했다.`); return '도면을 금고에 넣고 도제를 내보냈다. 몫은 조금 늘었다. 다른 고장 사람들은 몇 해를 더 기다려야 할 것이다.'; } },
      { label: '퍼지게 둔다', run: (g, rng, c) => { const S = SP(g); S.kept[c.id] = 1; S.me.spilled += 1; let n = 0; const from = (S.reach[c.id] ?? []).map(([i]) => Object.keys(PLACES)[i]); for (const nb of from.flatMap(neighbors)) { if (n >= 2) break; if (livable(g, nb) && addReach(g, c.id, nb)) n++; } renown(g, 8); gainStat(g, 'cha', 0.4); slog(g, `${J(TECH[c.id].name, '을/를')} 숨기지 않고 퍼지게 두었다.`); return '도제에게 그 돈을 가지라고 했다. 대신 도면을 한 장 더 베껴 주었다. 이듬해 두 고장에서 내 이름을 붙인 물건이 나왔다. 몫은 그대로였고, 이름은 늘었다.'; } },
    ],
  },
  // ---------- 왕실 특허장 ----------
  {
    id: 'spread_patent', cooldown: 120,
    cond: (g) => free(g) && here(g) === 'leocast' && money(g) >= 30 && mine(g).some((id) => !(SP(g).patent[id] > mi(g)) && !(g.spread.patentSeen ??= {})[id]),
    chance: () => 0.08, weight: 40,
    prepare: (g) => ({ id: mine(g).find((id) => !(SP(g).patent[id] > mi(g)) && !g.spread.patentSeen[id]) }),
    title: '왕실 특허장',
    text: (g, c) => `왕실 상서원 서기관이 찾아왔다. "${TECH[c.id].name}에 왕의 특허장을 내려 줄 수 있소. 이십 년 동안 그것을 만드는 공방은 당신에게 몫을 내야 하오. 수수료는 은화 서른 닢." 특허장이 붙으면 아무나 만들지 못하니, 퍼지는 것도 더딜 것이다.`,
    choices: [
      { label: '특허장을 받는다', run: (g, rng, c) => { const S = SP(g); spend(g, 30); S.patent[c.id] = mi(g) + 240; S.patentSeen[c.id] = 1; S.me.patents += 1; RS(g).royalty += 2; if (g.later?.stance) g.later.stance.crown = Math.min(100, g.later.stance.crown + 2); slog(g, `${J(TECH[c.id].name, '이/가')} 왕실 특허장을 받았다.`); return '붉은 밀랍에 왕의 인장이 찍힌 양피지를 받았다. 다음 달부터 공방들의 몫이 들어오기 시작했다. 몇몇 공방 주인은 나를 보고 침을 뱉었다.'; } },
      { label: '사양한다', run: (g, rng, c) => { SP(g).patentSeen[c.id] = 1; gainStat(g, 'cha', 0.2); return '"누구나 만들게 두겠소." 서기관은 이해 못 하겠다는 얼굴로 돌아갔다.'; } },
    ],
  },
  // ---------- 다른 나라에 팔기 ----------
  {
    id: 'spread_sell_abroad', cooldown: 120,
    cond: (g) => free(g) && ['portel', 'barka', 'eisen', 'graubel', 'klein'].includes(here(g)) && (mine(g).length > 0 || (sk(g, 'smithing') >= 40 && inv(g).some((id) => TECH[id] && ['craft', 'war'].includes(TECH[id].field) && TECH[id].at >= 2))),
    chance: () => 0.04, weight: 30,
    prepare: (g) => { const own = mine(g); const id = own.length ? own[own.length - 1] : inv(g).filter((x) => TECH[x] && ['craft', 'war'].includes(TECH[x].field)).sort((a, b) => TECH[b].at - TECH[a].at)[0]; return { id, price: Math.round(60 + TECH[id].at * 15), who: here(g) === 'eisen' || here(g) === 'graubel' ? '발하르트 제국' : '자유도시' }; },
    title: '먼 나라의 값',
    text: (g, c) => `${c.who}에서 왔다는 사내가 은화 자루를 탁자에 내려놓았다. "${TECH[c.id].name}, 당신 손에 있는 그 솜씨를 적어 주시오. 은화 ${c.price}닢. 우리 쪽에선 아무도 모를 거요. 당신 쪽 왕도요."`,
    choices: [
      { label: '판다', run: (g, rng, c) => { const S = SP(g); g.player.money += c.price; S.me.sold += 1; if (g.later?.stance) g.later.stance.crown = Math.max(-100, g.later.stance.crown - 2); if (rng.chance(0.25)) { addNotoriety(g, 6); setFlag(g, 'spread_sold_abroad'); slog(g, `${J(TECH[c.id].name, '을/를')} ${c.who}에 팔았다는 소문이 났다.`); return `은화 ${c.price}닢을 받았다. 석 달 뒤, 내가 그것을 팔았다는 소문이 부두에 돌았다. 경비대장이 나를 한참 쳐다보았다.`; } slog(g, `${J(TECH[c.id].name, '을/를')} ${c.who}에 몰래 팔았다.`); return `은화 ${c.price}닢. 사내는 종이를 품에 넣고 그날 밤 배에 올랐다. 몇 해 뒤 ${c.who}에서 그것을 쓴다는 말이 들려도 놀라지 않기로 했다.`; } },
      { label: '거절한다', run: () => '"내 나라 일이오." 사내는 웃으며 자루를 거두었다. 다른 사람을 찾을 것이다.' },
      { label: '경비대에 알린다', run: (g) => { g.player.money += 10; renown(g, 3); return '경비대가 사내를 붙잡았다. 품에서 다른 공방의 도면이 세 장 나왔다. 경비대장이 은화 열 닢을 쥐여 주었다.'; } },
    ],
  },
  // ---------- 교단과 함께 막기 ----------
  {
    id: 'spread_faith_block', cooldown: 96,
    cond: (g) => free(g) && (g.later?.stance?.faith ?? 0) <= -10 && missingHere(g, here(g)).some((t) => (REACT[t.id]?.faith?.[0] ?? 0) < 0) && !(SP(g).block[here(g)]?.[1] > mi(g)),
    chance: () => 0.06, weight: 35,
    prepare: (g) => ({ id: missingHere(g, here(g)).find((t) => (REACT[t.id]?.faith?.[0] ?? 0) < 0).id }),
    title: '성당 앞 모임',
    text: (g, c) => `미사가 끝나자 사제가 사람들을 붙잡아 세웠다. "이웃 고장에 ${J(TECH[c.id].name, '이/가')} 들어왔다 하오. 신께서 허락하지 않은 손이오. 우리 고장에는 들이지 맙시다. 그것을 들이려는 자에게 집도 일도 내주지 맙시다." 사람들이 서로 눈치를 본다.`,
    choices: [
      { label: '함께 막는다', run: (g, rng, c) => { const S = SP(g); S.block[here(g)] = [c.id, mi(g) + 60]; S.me.blocked += 1; gainStat(g, 'wil', 0.3); slog(g, `${placeName(here(g))}에서 성당과 함께 ${J(TECH[c.id].name, '을/를')} 막았다.`); return `손을 들었다. 사람들이 하나둘 따라 들었다. 그 뒤 몇 해, ${J(TECH[c.id].name, '을/를')} 들고 온 사람은 방 한 칸 얻지 못하고 떠났다. 막은 것인지 늦춘 것인지는 모르겠다.`; } },
      { label: '들이자고 맞선다', run: (g, rng, c) => { stress(g, 5); if (rng.chance(0.4)) { addReach(g, c.id, here(g)); return '"이웃이 쓰는 걸 우리만 못 쓸 까닭이 뭐요." 몇이 고개를 끄덕였다. 사제는 얼굴이 붉어졌다. 그해 가을, 고장에도 그것이 들어왔다. 사제는 나와 눈을 맞추지 않는다.'; } return '말을 꺼냈지만 사람들은 사제 쪽을 보았다. 그날 뒤로 성당 앞에서 나에게 인사하는 사람이 줄었다.'; } },
      { label: '모른 척 나온다', run: () => '모자를 눌러쓰고 성당을 나왔다. 등 뒤에서 사제의 목소리가 계속되었다.' },
    ],
  },
);
