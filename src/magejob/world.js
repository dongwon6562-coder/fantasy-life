// 마법 일의 달: 마을 결계는 마물이 많을수록 빨리 닳고, 떠돌이 마법사들이 돌아다니며 고친다(플레이어 없이도).
// 내 이름값은 고장마다 천천히 잊힌다. 가정교사 수업료는 그 고장에 있는 달에 받고, 오래 비우면 아이를 다른 데 맡긴다.
import { HOOKS } from '../hooks.js';
import { chron, L } from '../adventure/core.js';
import { levelAt } from '../wilds/state.js';
import { J } from '../narrative/text.js';
import { M, mi, clamp, here, placeName, ownRng, BOARD, logM } from './core.js';

const PLACES_ = Object.keys(BOARD);

export function wardsMonth(g, rng) {
  const s = M(g);
  for (const pl of PLACES_) s.wards[pl] = clamp((s.wards[pl] ?? 60) - 0.6 - levelAt(g, pl) / 60, 0, 100);
  // 떠돌이 마법사들: 해마다 고장을 옮기고, 결계가 약한 곳을 고친다
  for (const r of s.rivals) {
    if (rng.chance(1 / 12)) r.place = PLACES_[Math.floor(rng.next() * PLACES_.length)];
    if ((s.wards[r.place] ?? 60) < 40 && rng.chance(0.25 + r.circle * 0.1)) {
      s.wards[r.place] = clamp(s.wards[r.place] + 30 + r.circle * 5, 0, 100);
      r.fame = clamp(r.fame + 2, 0, 100);
      if (rng.chance(0.15)) chron(g, `${J(r.name, '이/가')} ${placeName(r.place)}의 낡은 결계를 고쳤다.`, 3);
    }
  }
  // 아무도 고치지 않은 결계가 다 닳으면 마물이 넘어온다
  for (const pl of PLACES_) {
    if (s.wards[pl] <= 0 && levelAt(g, pl) >= 40 && rng.chance(0.08)) {
      s.wards[pl] = 20;
      chron(g, `${placeName(pl)} 경계석의 결계가 다 닳아 마물이 밤에 마을 안까지 들어왔다.`, 8);
    }
  }
}
export function fameMonth(g) {
  const s = M(g);
  for (const pl of Object.keys(s.fame)) { s.fame[pl] = Math.max(0, s.fame[pl] - 0.25); if (s.fame[pl] === 0) delete s.fame[pl]; }
}
export function pupilMonth(g) {
  const s = M(g), p = s.pupil;
  if (!p) return;
  if (here(g) === p.place && !L(g).travel) { p.away = 0; if (p.fee) { g.player.money += p.fee; s.earned += p.fee; } return; }
  p.away = (p.away ?? 0) + 1;
  if (p.away > 3) { s.pupil = null; logM(g, `오래 비운 사이 ${J(p.name, '은/는')} 다른 선생에게 맡겨졌다.`); }
}

HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const rng = ownRng(g, 42);
  wardsMonth(g, rng);
  fameMonth(g);
  pupilMonth(g);
});

// 대를 이으면: 이름값과 제자는 앞 사람의 것
HOOKS.heir.push((g) => {
  const s = M(g);
  if (s.jobs >= 5) s.past.push({ y: g.date.year, jobs: s.jobs, fails: s.fails });
  s.fame = {}; s.pupil = null; s.boardAt = -99; s.pupilAt = -99; s.mercAt = -99;
});
