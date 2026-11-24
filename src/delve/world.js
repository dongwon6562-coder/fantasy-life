// 미궁의 달 (플레이어 없이도): 공략대들이 내려가고, 기록을 깨고, 돌아오지 못한다. 미궁 앞 거리는 오가는 사람과 마석에 따라
// 커지고 줄고, 거리의 마석 값은 팔린 만큼 떨어졌다 돌아온다. 주인이 쓰러진 미궁에는 몇 해 뒤 새 주인이 들어앉는다.
import { HOOKS } from '../hooks.js';
import { chron } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { FOES } from '../adventure/combat.js';
import { D, DELVES, DELVE_IDS, mi, clamp, ownRng, layerOf, logD } from './core.js';

const PARTY_NAMES = ['은빛 송곳니', '붉은 등불', '세 번째 계단', '늙은 까마귀단', '돌아온 자들', '푸른 밧줄', '마석 사냥꾼', '깊은 숨', '열두 번째 횃불', '젖은 장화'];
const LEADERS = ['브란트', '세라', '오스카', '네일', '하르트', '이본', '그레타', '로칸', '미렐', '타벤', '에다', '쿠르트'];
// 공략대가 노리는 곳: 사람이 많이 오가는 미궁
const BUSY = ['tower', 'tower', 'tower', 'undercity', 'grey_hollow', 'old_mine', 'rift', 'iron_keep', 'sunken_library', 'catacomb', 'deep_forge', 'sea_cave', 'root_maze', 'beast_den', 'red_pit', 'glow_cave', 'lower_halls', 'lower_halls'];

function newParty(rng, s) {
  const used = new Set(s.parties.filter((p) => p.alive).map((p) => p.name));
  const name = rng.pick(PARTY_NAMES.filter((n) => !used.has(n))) ?? rng.pick(PARTY_NAMES);
  const at = rng.pick(BUSY);
  return { id: `p${Math.floor(rng.next() * 1e9).toString(36)}`, name, leader: rng.pick(LEADERS), pow: 40 + rng.int(0, 60), at, best: DELVES[at].endless ? rng.int(10, 50) : rng.int(1, Math.max(1, Math.floor(DELVES[at].floors / 2))), alive: true, fame: rng.int(5, 40) };
}
export function seedParties(g, rng) {
  const s = D(g);
  while (s.parties.filter((p) => p.alive).length < 6) s.parties.push(newParty(rng, s));
}

export function partiesMonth(g, rng) {
  const s = D(g);
  for (const p of s.parties.filter((x) => x.alive)) {
    if (!rng.chance(0.35)) continue;
    const d = DELVES[p.at];
    if (!d.endless && p.best >= d.floors) {
      // 바닥까지 갔으면 주인에게 덤비거나, 다른 미궁으로 옮긴다
      const m = s.masters[p.at];
      if (m.alive && d.master) {
        const mp = (FOES[d.master.leader]?.pow ?? 60) * 1.3 + (FOES[d.master.unit]?.pow ?? 10) * d.master.count * 0.75;
        if (rng.chance(clamp(0.08 + (p.pow * 1.6 - mp) / 300, 0.02, 0.3))) {
          Object.assign(m, { alive: false, since: mi(g), by: p.name });
          p.fame = Math.min(100, p.fame + 25);
          chron(g, `공략대 ${J(p.name, '이/가')} ${d.name}의 주인을 쓰러뜨렸다. 대장 ${J(p.leader, '이/가')} 거리에서 술을 돌렸다.`, 8);
          logD(g, `${J(p.name, '이/가')} ${d.name}의 주인을 쓰러뜨렸다.`);
        } else if (rng.chance(0.1)) { p.alive = false; if (p.fame >= 30) chron(g, `${d.name}의 주인에게 덤빈 공략대 ${J(p.name, '이/가')} 돌아오지 못했다.`, 6); else logD(g, `${J(p.name, '이/가')} ${d.name}의 주인에게 덤볐다가 돌아오지 못했다.`); }
      } else { p.at = rng.pick(BUSY); p.best = 0; }
      continue;
    }
    const l = layerOf(p.at, Math.min(d.floors, p.best + d.step));
    let ok = clamp(0.75 - (l.danger * 11 - p.pow) / 100, 0.15, 0.92);
    if (d.endless && p.best >= s.rec[p.at].best - d.step) ok *= 0.1; // 끝없는 탑의 기록 근처는 몇 해에 한 층 오를까 말까
    if (rng.chance(ok)) {
      p.best = Math.min(d.floors, p.best + d.step);
      p.pow = Math.min(110, p.pow + 0.5);
      s.towns[p.at].sold += (l.harvest[0] + l.harvest[1]) / 2;
      const rec = s.rec[p.at];
      if (p.best > rec.best) {
        Object.assign(rec, { best: p.best, holder: p.name, me: false, y: g.date.year });
        p.fame = Math.min(100, p.fame + 5);
        if (d.endless) chron(g, `공략대 ${J(p.name, '이/가')} 끝없는 탑 ${p.best}층에 올랐다. 탑 아래 거리 칠판의 기록이 바뀌었다.`, 6);
      }
    } else if (rng.chance(0.015 + l.danger * 0.005)) {
      p.alive = false;
      if (p.fame >= 50) chron(g, `${d.name} ${p.best}층 근처에서 공략대 ${J(p.name, '이/가')} 돌아오지 못했다. 거리의 술집에 빈 의자가 늘었다.`, 5);
      logD(g, `${J(p.name, '이/가')} ${d.name}에서 돌아오지 못했다.`);
    }
  }
  // 오래된 이름은 정리
  const dead = s.parties.filter((p) => !p.alive);
  if (dead.length > 8) s.parties = s.parties.filter((p) => p.alive || dead.slice(-8).includes(p));
  if (rng.chance(0.15)) seedParties(g, rng);
}

export function townsMonth(g, rng) {
  const s = D(g);
  for (const id of DELVE_IDS) {
    const d = DELVES[id], t = s.towns[id];
    if (!d.town) { t.sold = 0; continue; }
    const busy = s.parties.filter((p) => p.alive && p.at === id).length;
    const master = s.masters[id].alive || d.endless;
    // 오가는 공략대가 많으면 거리가 커지고, 주인이 쓰러진 미궁은 마석이 덜 나와 사람이 빠진다
    t.pop = clamp(t.pop + busy * 0.1 + (master ? 0.06 : -0.3) - t.pop * 0.006 + rng.float(-0.2, 0.2), 3, 100);
    t.price = clamp(t.price + (1 - t.price) * 0.12 - t.sold / 600, 0.55, 1.45);
    t.sold = 0;
    if (!t.big && t.pop >= 50) { t.big = true; chron(g, `${d.name} 앞 ${J(d.town, '이/가')} 천막촌을 넘어 돌집이 늘어선 거리가 되었다.`, 6); }
    if (t.big && t.pop < 15) { t.big = false; chron(g, `${d.name} 앞 ${J(d.town, '이/가')} 한산해졌다. 문 닫은 여관이 늘었다.`, 5); }
  }
}

export function mastersMonth(g, rng) {
  const s = D(g);
  for (const id of DELVE_IDS) {
    const d = DELVES[id], m = s.masters[id];
    if (!d.master || m.alive) continue;
    if (mi(g) - m.since > 96 && rng.chance(1 / 48)) {
      m.alive = true; m.since = mi(g);
      chron(g, `${d.name} 깊은 곳에 새 주인이 들어앉았다는 소문이 돈다. 공략대들이 다시 짐을 꾸린다.`, 6);
      logD(g, `${d.name}에 새 주인이 들어앉았다.`);
    }
  }
}

HOOKS.newGame.push((g) => { D(g); seedParties(g, ownRng(g, 44)); });
HOOKS.migrate.push((g) => { D(g); seedParties(g, ownRng(g, 44)); });
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const rng = ownRng(g, 44);
  partiesMonth(g, rng);
  townsMonth(g, rng);
  mastersMonth(g, rng);
  // 오래 비운 거리의 공략대는 다른 일을 찾아 떠난다
  const s = D(g);
  if (s.crew.length && mi(g) - s.runAt > 8) { s.crew = []; logD(g, '오래 미궁에 들지 않아 공략대가 흩어졌다.'); }
});
// 대를 이으면: 세상의 기록과 거리는 남고, 내 표식과 공략대는 앞 사람의 것
HOOKS.heir.push((g) => {
  const s = D(g);
  const runs = Object.values(s.mine).reduce((t, m) => t + m.runs, 0);
  if (runs) s.past.push({ y: g.date.year, runs, clears: Object.values(s.mine).reduce((t, m) => t + m.clears, 0), deepest: Math.max(0, ...Object.values(s.mine).map((m) => m.deepest)) });
  for (const r of Object.values(s.rec)) if (r.me) r.me = false;
  s.mine = {}; s.crew = []; s.runAt = -99; s.crewAt = -99;
});
