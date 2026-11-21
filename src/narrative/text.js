// 장면 글 도구: 조사 붙이기, 상황(나이·계절·집안·상태) 읽기, 조건에 맞는 문장 고르기.
import { playerAge, family, monthInfo } from '../game.js';

// ---------- 조사 ----------
// 받침이 있으면 앞의 것, 없으면 뒤의 것. '으로/로'는 ㄹ 받침이면 '로'.
const lastCode = (word) => {
  const s = String(word).trim();
  return s.charCodeAt(s.length - 1);
};
export function hasBatchim(word) {
  const c = lastCode(word);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}
const PAIRS = {
  '이/가': ['이', '가'], '을/를': ['을', '를'], '은/는': ['은', '는'],
  '과/와': ['과', '와'], '이랑/랑': ['이랑', '랑'], '아/야': ['아', '야'], '이었/였': ['이었', '였'],
};
export function josa(word, pair) {
  if (pair === '으로/로') {
    const c = lastCode(word);
    const b = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0;
    return word + (b === 0 || b === 8 ? '로' : '으로');
  }
  const [a, b] = PAIRS[pair];
  return word + (hasBatchim(word) ? a : b);
}
// 줄임: J(name, '이/가')
export const J = josa;

// ---------- 상황 ----------
export function band(age) {
  if (age < 7) return 'small';   // 3~6
  if (age < 12) return 'child';  // 7~11
  if (age < 16) return 'teen';   // 12~15
  if (age < 25) return 'young';  // 16~24
  if (age < 45) return 'adult';  // 25~44
  return 'old';
}
export function ctxOf(game) {
  const age = playerAge(game);
  const p = game.player;
  return {
    age,
    band: band(age),
    season: monthInfo(game).season,
    month: game.date.month,
    fam: family(game).id,
    tired: p.fatigue > 60,
    stressed: p.stress > 60,
    famine: !!game.world.famine,
    plague: !!game.world.plague,
    sex: p.sex,
  };
}

// ---------- 문장 고르기 ----------
// pool: 문자열 또는 { t, band?, bands?, season?, fam?, when?(ctx, game) }
// t는 문자열이거나 (ctx, game, extra) => 문자열.
// 조건이 많이 맞는 문장일수록 더 자주 고른다.
function matches(e, ctx, game, extra) {
  if (typeof e === 'string') return 1;
  let score = 1;
  if (e.band) { if (e.band !== ctx.band) return 0; score += 1; }
  if (e.bands) { if (!e.bands.includes(ctx.band)) return 0; score += 1; }
  if (e.season) { if (e.season !== ctx.season) return 0; score += 1; }
  if (e.fam) { if (e.fam !== ctx.fam) return 0; score += 1; }
  if (e.when) { if (!e.when(ctx, game, extra)) return 0; score += 1.5; }
  return score;
}
// 최근에 쓴 문장은 한동안 잘 고르지 않는다 (반복 줄이기). 저장에는 넣지 않는다.
const RECENT = new WeakMap();
const RECENT_MAX = 90;
export function pickLine(game, rng, pool, extra) {
  const ctx = ctxOf(game);
  const ok = pool.map((e) => ({ e, w: matches(e, ctx, game, extra) })).filter((x) => x.w > 0);
  if (!ok.length) return '';
  let recent = RECENT.get(game);
  if (!recent) RECENT.set(game, (recent = []));
  const { e } = rng.weighted(ok, (x) => x.w * x.w * (recent.includes(x.e) ? 0.04 : 1));
  recent.push(e);
  if (recent.length > RECENT_MAX) recent.shift();
  const t = typeof e === 'string' ? e : e.t;
  return typeof t === 'function' ? t(ctx, game, extra) : t;
}

// 몸 상태에 따라 가끔 덧붙는 한 줄
const TIRED = [
  '몸이 무거워 손이 자꾸 굼떴다.',
  '눈꺼풀이 내려앉는 것을 몇 번이나 참았다.',
  '쉬지 않고 달려온 몸이 슬슬 비명을 지른다.',
];
const STRESSED = [
  '머릿속이 시끄러워 좀처럼 집중이 되지 않았다.',
  '사소한 일에도 짜증이 치밀었다.',
  '가슴 한쪽이 계속 답답했다.',
];
// 맥락 고리(src/senses)가 몸 상태 줄 앞에 글을 끼울 수 있게 내보낸다
export const MOOD_LINES = [...TIRED, ...STRESSED];
export function moodLine(game, rng) {
  const ctx = ctxOf(game);
  if (ctx.tired && rng.chance(0.35)) return rng.pick(TIRED);
  if (ctx.stressed && rng.chance(0.3)) return rng.pick(STRESSED);
  return '';
}

// 오른 수치를 작게 덧붙이는 괄호: (힘 +0.4, 민첩 +0.2)
export const up = (name, g) => (g > 0.04 ? `${name} +${g.toFixed(1)}` : null);
export const gains = (...parts) => {
  const s = parts.filter(Boolean).join(', ');
  return s ? `(${s})` : '';
};
export const join = (...parts) => parts.filter(Boolean).join(' ');

// 결과 글을 장면과 수치로 나눈다: 끝의 괄호 하나가 수치.
export function splitResult(text) {
  const m = /^(.*?)\s*\(([^()]*\+[^()]*)\)\s*$/s.exec(text ?? '');
  if (!m) return { scene: text, gains: '' };
  return { scene: m[1], gains: m[2] };
}
