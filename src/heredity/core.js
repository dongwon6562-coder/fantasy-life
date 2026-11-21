// 유전: 사람마다 숨은 핏줄(blood)이 있다. 재능 배율 여섯과 마력 그릇.
// - 플레이어의 핏줄은 g.player.talents·manaPotential 그대로다. 다른 사람은 p.blood = { t:{str..}, mana, leap? }.
// - 부모가 있으면 반쯤 닮고 반쯤 제 것이다. 가끔 크게 튄다. 부모를 모르면 지금처럼 무작위.
// - 주사위는 사람 id와 게임 씨앗에서 따로 굴려서, 본 게임의 흐름을 흔들지 않는다.
import { STATS, TRAITS } from '../data.js';
import { byId } from '../npc.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { LEAP_WORD, STAT_WORD } from './data.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const STAT_IDS = STATS.map((s) => s.id);
const r2 = (v) => Math.round(v * 100) / 100;
export const personRng = (g, id, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 71) ^ Math.imul((id | 0) * 131 + salt + 59, 2654435761)) | 0 });

export const HD = (g) => (g.heredity ??= { gift: null, chosen: false, seen: false, envy: false, eventAt: 0, leaps: 0 });

// 부모를 모르는 사람의 핏줄 (game.js 새 아이와 같은 고름새)
export function randomBlood(rng) {
  const t = {};
  for (const s of STAT_IDS) t[s] = r2(clamp(rng.normal(1, 0.25), 0.5, 1.8));
  return { t, mana: r2(Math.min(1, Math.pow(rng.next(), 3.5) * 1.15)) };
}

const fromPlayer = (g) => ({ t: { ...g.player.talents }, mana: g.player.manaPotential ?? 0 });

// 사람의 핏줄. 없으면 부모에게서 (부모도 없으면 무작위로) 만든다.
export function bloodOf(g, p, depth = 0) {
  if (!p) return null;
  if (p.isPlayer && g.player && p.id === g.player.id) return fromPlayer(g);
  if (validBlood(p.blood)) return p.blood;
  const rng = personRng(g, p.id);
  const fa = depth < 4 ? byId(g, p.fatherId) : null, mo = depth < 4 ? byId(g, p.motherId) : null;
  p.blood = fa || mo ? inherit(rng, fa ? bloodOf(g, fa, depth + 1) : randomBlood(rng), mo ? bloodOf(g, mo, depth + 1) : randomBlood(rng)) : randomBlood(rng);
  return p.blood;
}
export const validBlood = (b) => !!b && typeof b === 'object' && b.t && typeof b.t === 'object' && Number.isFinite(b.mana) && STAT_IDS.every((s) => Number.isFinite(b.t[s]));

// 두 부모의 핏줄에서 아이의 핏줄. 반쯤 닮고 반쯤 제 것, 스물에 하나쯤 크게 튄다.
export function inherit(rng, fa, mo) {
  const t = {};
  for (const s of STAT_IDS) t[s] = clamp(((fa.t[s] ?? 1) + (mo.t[s] ?? 1)) / 2 * 0.5 + rng.normal(1, 0.22) * 0.5, 0.5, 1.8);
  // 마력은 핏줄을 탄다: 두 부모의 중간쯤의 절반 + 제 몫. 한쪽이 크면 가끔 그쪽을 많이 받는다.
  const big = Math.max(fa.mana ?? 0, mo.mana ?? 0);
  let mana = ((fa.mana ?? 0) + (mo.mana ?? 0)) / 2 * 0.55 + Math.pow(rng.next(), 3.5) * 1.15 * 0.5;
  if (big >= 0.5 && rng.chance(0.3)) mana = Math.max(mana, big * rng.float(0.55, 0.85));
  let leap = null;
  if (rng.chance(0.05)) { leap = rng.pick(STAT_IDS); t[leap] = clamp(Math.max(t[leap], fa.t[leap] ?? 1, mo.t[leap] ?? 1) + rng.float(0.25, 0.45), 0.5, 1.8); }
  else if (big < 0.3 && rng.chance(0.025)) { leap = 'mana'; mana = Math.max(mana, rng.float(0.5, 0.8)); }
  const out = { t: {}, mana: r2(clamp(mana, 0, 1)) };
  for (const s of STAT_IDS) out.t[s] = r2(t[s]);
  if (leap) out.leap = leap;
  return out;
}

// 아이의 성격: 두 자리 중 자리마다 반쯤은 부모의 성격 가운데 하나를 닮는다.
export function inheritTraits(rng, fa, mo) {
  // 두 부모가 같이 가진 성격은 두 번 들어가 더 잘 물려진다
  const pool = [...(fa?.traits ?? []), ...(mo?.traits ?? [])].filter((t) => TRAITS.some((x) => x.id === t));
  const out = [];
  let guard = 0;
  while (out.length < 2 && guard++ < 30) {
    const t = pool.length && rng.chance(0.5) ? rng.pick(pool) : rng.pick(TRAITS).id;
    const opp = TRAITS.find((x) => x.id === t)?.opp;
    if (out.includes(t) || (opp && out.includes(opp))) continue;
    out.push(t);
  }
  return out;
}

// 혼인 상대를 고를 때 들리는 말: 그 사람(과 그 집안)의 핏줄이 어떤가. 정확한 숫자는 알려 주지 않는다.
export function bloodHint(g, p) {
  const b = bloodOf(g, p);
  if (!b) return null;
  const bits = [];
  if (b.mana >= 0.55) bits.push('그 집안에 마력이 짙게 흐른다는 말이 있다');
  else if (b.mana >= 0.3) bits.push('그 집안에 마력을 가진 이가 가끔 났다고 한다');
  const top = STAT_IDS.slice().sort((a, c) => b.t[c] - b.t[a])[0];
  if (b.t[top] >= 1.3) bits.push(`${J(STAT_WORD[top], '이/가')} 남다른 핏줄이다`);
  const low = STAT_IDS.slice().sort((a, c) => b.t[a] - b.t[c])[0];
  if (!bits.length && b.t[low] <= 0.7) bits.push(`${J(STAT_WORD[low], '이/가')} 모자란 집안이라는 뒷말이 있다`);
  return bits.length ? bits.join('. ') + '.' : '별다른 말은 없다. 평범한 집안이다.';
}

// 아이가 누구를 닮았나 (재능이 어느 부모 쪽에 더 가까운가)
export function resembleOf(g, p) {
  const b = bloodOf(g, p);
  const fa = byId(g, p?.fatherId), mo = byId(g, p?.motherId);
  if (!b || (!fa && !mo)) return null;
  if (b.leap) return LEAP_WORD[b.leap] ?? '부모 누구도 닮지 않은 재주가 있다';
  const dist = (o) => { if (!o) return 99; const x = bloodOf(g, o); return STAT_IDS.reduce((a, s) => a + Math.abs(x.t[s] - b.t[s]), 0) + Math.abs(x.mana - b.mana) * 3; };
  const df = dist(fa), dm = dist(mo);
  if (Math.abs(df - dm) < 0.25) return '아버지와 어머니를 고루 닮았다';
  return df < dm ? '아버지를 많이 닮았다' : '어머니를 많이 닮았다';
}

// 핏줄에서 kin의 '타고난 재주'를 고른다: 마력이 크면 마력의 기미, 아니면 가장 큰 재능.
export function giftFromBlood(b, rng) {
  if (!validBlood(b)) return null;
  if (b.mana >= 0.45) return 'magic';
  return STAT_IDS.slice().sort((a, c) => (b.t[c] + rng.float(0, 0.08)) - (b.t[a] + rng.float(0, 0.08)))[0];
}
