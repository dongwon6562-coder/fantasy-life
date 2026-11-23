// 수도원의 달: 청원자에서 수련자로, 수련 한 해 뒤 서원, 공덕이 쌓이면 부원장. 오래 담 밖에 있으면 서원이 흐려진다.
// 해마다 수도원 넷의 원장이 늙고 바뀌며(플레이어 없이도), 영주와 땅을 다툰다. 은둔처에는 사람들이 찾아온다.
// 가난하거나 믿음 깊은 집 아이는 일곱에서 아홉 살 사이에 수도원에 바쳐질 수 있다.
import { HOOKS } from '../hooks.js';
import { queueScene, sceneQueued, L, chron } from '../adventure/core.js';
import { faithState } from '../faith/index.js';
import { playerAge } from '../game.js';
import { J } from '../narrative/text.js';
import { C, mi, clamp, here, free, ownRng, HOUSES, HOUSE_IDS, houseAt, houseFits, logC, vowed, inHouse, hermitHere, abbotName } from './core.js';
import { leaveVows, endHermit } from './life.js';

/* ---------- 서원의 단계 ---------- */
export function stageMonth(g) {
  const v = C(g).vow;
  if (!v) return;
  const hs = C(g).houses[v.house];
  if (hs.abbot === '빈자리' && !sceneQueued(g, 'cloister_election')) { hs.abbot = hs.rival ?? abbotName(ownRng(g, 5), !!HOUSES[v.house].nuns); hs.age = 55; }
  if (inHouse(g)) v.away = 0; else if (!C(g).hermit) v.away = (v.away ?? 0) + 1;
  if (v.away > 6 && v.stage !== 'oblate') { leaveVows(g, 'away'); logC(g, '담 밖에서 너무 오래 지내 서원이 흐려졌다.'); return; }
  if (!inHouse(g) || !free(g)) return;
  const t = mi(g) - v.since;
  if (v.stage === 'postulant' && t >= 6) { v.stage = 'novice'; v.since = mi(g); logC(g, '수련자의 흰 띠를 받았다.'); return; }
  if (v.stage === 'novice' && t >= 12 && !sceneQueued(g, 'cloister_vows')) { queueScene(g, 'cloister_vows'); return; }
  if (v.stage === 'oblate' && playerAge(g) >= 15 && !sceneQueued(g, 'cloister_vows')) { queueScene(g, 'cloister_vows'); return; }
  if (v.stage === 'monk' && (v.merit ?? 0) >= 35 && C(g).houses[v.house].abbot !== g.player.name) {
    v.stage = 'prior'; logC(g, '원장이 나를 부원장으로 세웠다.');
  }
}

/* ---------- 수도원 넷의 해 ---------- */
const playerAbbot = (g, id) => C(g).vow?.house === id && C(g).vow.stage === 'abbot';
export function housesYear(g, rng) {
  const s = C(g);
  for (const id of HOUSE_IDS) {
    const hs = s.houses[id], h = HOUSES[id];
    if (hs.closed) continue;
    hs.monks = clamp(hs.monks + (rng.chance(0.5) ? 1 : -1) + (hs.rep > 60 ? 1 : 0), 6, 120);
    hs.wealth = clamp(hs.wealth + hs.land / 40 - hs.monks / 40, 0, 100);
    if (playerAbbot(g, id)) continue;
    hs.age += 1;
    if (!rng.chance(clamp((hs.age - 55) / 50, 0.02, 0.6))) continue;
    const old = hs.abbot, mine = s.vow?.house === id && ['monk', 'prior'].includes(s.vow.stage);
    hs.rival = abbotName(rng, !!h.nuns);
    if (hs.rival === old) hs.rival = abbotName(ownRng(g, 391), !!h.nuns);
    if (mine && inHouse(g) && !sceneQueued(g, 'cloister_election')) { hs.abbot = '빈자리'; queueScene(g, 'cloister_election'); continue; }
    hs.abbot = hs.rival; hs.age = 48 + Math.floor(rng.next() * 12);
    chron(g, `${h.name}의 원장 ${J(old, '이/가')} 세상을 떠나고 ${J(hs.abbot, '이/가')} 뒤를 이었다.`, 6);
    if (s.vow?.house === id) logC(g, `원장 ${J(old, '이/가')} 세상을 떠났다. 새 원장은 ${hs.abbot}.`);
  }
}

/* ---------- 영주와의 땅 다툼 ---------- */
export function disputeYear(g, rng) {
  const s = C(g);
  for (const id of HOUSE_IDS) {
    const hs = s.houses[id], h = HOUSES[id];
    if (hs.closed) continue;
    if (!hs.dispute) {
      if (hs.land > 10 && rng.chance(0.12 + (hs.land > 50 ? 0.06 : 0))) hs.dispute = { lord: h.lord, since: mi(g), stake: 5 + Math.floor(rng.next() * 11), until: mi(g) + 12 + Math.floor(rng.next() * 12) };
      continue;
    }
  }
}
export function disputeMonth(g, rng) {
  const s = C(g);
  for (const id of HOUSE_IDS) {
    const hs = s.houses[id], h = HOUSES[id], d = hs.dispute;
    if (!d) continue;
    const mine = s.vow?.house === id && ['prior', 'abbot'].includes(s.vow.stage);
    if (mine) { if (inHouse(g) && free(g) && !sceneQueued(g, 'cloister_dispute')) queueScene(g, 'cloister_dispute'); continue; }
    if (mi(g) < (d.until ?? d.since + 18)) continue;
    hs.dispute = null;
    const win = rng.chance(0.45 + (h.sect === 'orthodox' ? 0.15 : 0) + (hs.rep - 50) / 200);
    hs.land = clamp(hs.land + (win ? 1 : -d.stake), 0, 100);
    chron(g, win ? `${J(h.name, '이/가')} ${J(d.lord, '과/와')}의 땅 다툼에서 옛 기증 문서로 숲을 지켰다.` : `${J(d.lord, '이/가')} ${h.name}의 숲과 방앗간을 영지로 거두어 갔다.`, 5);
    if (s.vow?.house === id) logC(g, win ? `${J(d.lord, '과/와')}의 땅 다툼에서 수도원이 이겼다.` : `${J(d.lord, '이/가')} 수도원 숲 일부를 가져갔다.`);
  }
}

/* ---------- 은둔처를 찾아오는 사람들 ---------- */
export function visitMonth(g, rng) {
  const hm = C(g).hermit;
  if (!hm) return;
  if (!hermitHere(g)) { endHermit(g, 'left'); return; }
  if (!free(g) || sceneQueued(g, 'cloister_visitor') || mi(g) - hm.since < 2 || mi(g) - (hm.lastVisit ?? 0) < 3) return;
  if (!rng.chance(0.4 + hm.fame / 200)) return;
  hm.lastVisit = mi(g);
  const pool = ['thief', 'fugitive', 'sick'];
  if (hm.fame >= 4) pool.push('pilgrim', 'pilgrim');
  if (hm.fame >= 12) pool.push('lord', 'sick');
  if (mi(g) - hm.since >= 18 && g.player.familyIds.some((id) => g.people.find((p) => p.id === id && p.alive && !p.isPlayer))) pool.push('kin');
  queueScene(g, 'cloister_visitor', { who: pool[Math.floor(rng.next() * pool.length)] });
}

/* ---------- 어린 헌납 ---------- */
export const oblateOk = (g) => {
  const a = playerAge(g), s = C(g);
  if (a < 7 || a > 9 || s.oblateAsked || vowed(g) || L(g).travel) return false;
  if (!houseFits(g, houseAt(here(g)))) return false;
  const poor = g.player.money + g.player.familyMoney < 30, many = g.player.familyIds.length >= 5, devout = (faithState(g).devotion ?? 0) >= 60;
  return (poor && many) || devout;
};
function oblateMonth(g, rng) {
  if (!oblateOk(g) || sceneQueued(g, 'cloister_oblate') || !rng.chance(0.2)) return;
  C(g).oblateAsked = true;
  queueScene(g, 'cloister_oblate');
}

HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const rng = ownRng(g, 39);
  stageMonth(g);
  if (g.date.month === 1) { housesYear(g, rng); disputeYear(g, rng); }
  disputeMonth(g, rng);
  visitMonth(g, rng);
  oblateMonth(g, rng);
});

// 서원한 몸은 혼담을 받지 않는다. 은둔자도 마찬가지.
const NO_LOVE = new Set(['love_date', 'court_match']);
HOOKS.actionFilter.push((g, act) => !(NO_LOVE.has(act.id) && (vowed(g) || C(g).hermit)));

// 대를 이으면: 앞 사람의 서원과 움막은 그 사람과 함께 끝난다. 수도원들의 해는 그대로.
HOOKS.heir.push((g) => {
  const s = C(g);
  if (s.vow) {
    const v = s.vow;
    s.past.push({ kind: 'vow', house: v.house, stage: v.stage, y: g.date.year });
    if (v.stage === 'abbot') { s.houses[v.house].abbot = abbotName(ownRng(g, 77), !!HOUSES[v.house].nuns); s.houses[v.house].age = 50; }
    logC(g, `앞 사람은 ${HOUSES[v.house].name}에서 서원한 몸으로 살다 갔다.`);
  }
  if (s.hermit) s.past.push({ kind: 'hermit', place: s.hermit.place, y: g.date.year, months: mi(g) - s.hermit.since, fame: Math.round(s.hermit.fame) });
  s.vow = null; s.hermit = null; s.oblateAsked = false;
});
