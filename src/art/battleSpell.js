// 전투 연출의 주문: 계열 여덟(불·물·바람·흙·빛·그림자·생명·정신)과 얼음·번개. 계열마다 날아가는 꼴과 맞는 꼴이 다르다. (46단계)
//   cast(S, who, target, t, school, hit, o) → 닿는 때.  hit: 'hit' | 'ward'(결계에 막힘)
//   schoolOf(글) → 계열 (고른 수의 이름이나 주문 이름에서 읽는다)
import { GY, lerp, zigzag } from './battleKit.js';
import { wound } from './battleMoves.js';

export const SCHOOL = {
  fire: { color: '#ff8a3a', core: '#ffd9a0' }, water: { color: '#5aa8e8', core: '#d8f0ff' }, ice: { color: '#9fd8ff', core: '#f0faff' },
  wind: { color: '#bfe8d8', core: '#ffffff' }, bolt: { color: '#9ab4ff', core: '#eef4ff' }, earth: { color: '#b89468', core: '#e8d4a8' },
  light: { color: '#ffe9a0', core: '#ffffff' }, shadow: { color: '#8a4aa8', core: '#d8a0f0' }, life: { color: '#7ac86a', core: '#d8ffc0' }, mind: { color: '#d88ad8', core: '#ffe0ff' },
  dark: { color: '#b04068', core: '#f0a0c0' },
};
const WORDS = [[/번개|벼락|뇌/, 'bolt'], [/얼음|서리|빙/, 'ice'], [/불|화염|불꽃|태우/, 'fire'], [/물|파도|물줄기|해일/, 'water'], [/바람|돌풍|회오리|폭풍/, 'wind'], [/흙|돌|바위|땅|대지/, 'earth'], [/빛|광휘|섬광|성광/, 'light'], [/그림자|어둠|암흑/, 'shadow'], [/생명|덩굴|가시|치유/, 'life'], [/정신|환영|홀리|혼란|잠/, 'mind']];
export const schoolOf = (text, fb = 'fire') => { const s = String(text ?? ''); if (SCHOOL[s]) return s; for (const [re, id] of WORDS) if (re.test(s)) return id; return fb; };

const isHuman = (a) => a.look.form === 'human';
const chestOf = (a) => a.chest ?? [a.x, a.y - 44 * (a.scale ?? 1)];
const handOf = (a) => a.tip ?? [a.x + a.face * 24 * (a.scale ?? 1), a.y - 70 * (a.scale ?? 1)];

/** 결계가 선다 (막는 쪽 앞에) */
export function ward(S, a, t, color = '#a8d0ff', life = 0.9, hit = 0) {
  S.at(t, () => { const [cx, cy] = chestOf(a), sc = a.scale ?? 1; S.emit({ type: 'ward', x: a.x + a.face * 10 * sc, y: cy, r: 36 * sc, f: a.face, life, color, hit }); S.emit({ type: 'rune', x: a.x, y: GY, r: 26 * sc, life, color }); void cx; });
}

export function cast(S, who, target, t, school = 'fire', hit = 'hit', o = {}) {
  const el = SCHOOL[school] ? school : 'fire', E = SCHOOL[el], f = who.face, sc = who.scale ?? 1, big = o.big ? 1.4 : 1, tsc = target.scale ?? 1;
  const pose = { earth: 'low', light: 'invoke', shadow: 'invoke', mind: 'push', wind: 'push', water: 'push', life: 'invoke' }[el] ?? 'cast';
  // 시전: 발밑 마법진, 지팡이 끝에 모이는 빛
  S.at(t, () => {
    if (who.out) return;
    if (isHuman(who)) { S.go(who, el === 'earth' ? 'overhead' : pose, 0.24, 'out'); S.go(who, { power: 1 }, 0.3); }
    S.emit({ type: 'rune', x: who.x, y: GY, r: 32 * sc * big, life: 0.7, color: E.color });
    const [hx, hy] = handOf(who);
    for (let i = 0; i < 9; i++) { const an = S.rnd() * 6.28, d = (30 + S.rnd() * 30) * sc; S.at(S.t + i * 0.02, () => S.emit({ type: 'gather', x: hx + Math.cos(an) * d, y: hy + Math.sin(an) * d * 0.7, tx: hx, ty: hy, r: 5 * sc, color: E.color, life: 0.24 })); }
  });
  const t1 = t + 0.32; let fly = 0.4;
  const aim = () => { const [tx, ty] = chestOf(target); return [hit === 'ward' ? tx - f * 34 * tsc : tx, ty]; };
  if (el === 'fire' || el === 'dark') {
    fly = 0.42;
    S.at(t1, () => { const [sx, sy] = handOf(who), [ex, ey] = aim(); S.emit({ type: 'bolt', x: sx, y: sy, tx: ex, ty: ey, r: 10 * sc * big, color: E.color, arc: 18, life: fly / 0.82 }); S.emit({ type: 'flash', x: sx, y: sy, r: 22 * sc, life: 0.2, color: E.color });
      for (let i = 1; i < 7; i++) S.at(S.t + i * fly / 8, () => { const q = i / 8; S.emit({ type: 'ember', x: lerp(sx, ex, q * q), y: lerp(sy, ey, q * q) - Math.sin(q * 3.14) * 18, vx: -f * 20, vy: 16, r: 5 * sc, color: E.color, life: 0.4 }); }); });
  } else if (el === 'water') {
    fly = 0.34;
    S.at(t1, () => { const [sx, sy] = handOf(who), [ex, ey] = aim(); for (let i = 0; i < 5; i++) S.at(S.t + i * 0.035, () => S.emit({ type: 'bolt', x: sx, y: sy + i * 2, tx: ex, ty: ey + (i - 2) * 3, r: (7 - i * 0.6) * sc * big, color: E.color, arc: -8 + i * 2, life: fly / 0.82 }));
      for (let i = 0; i < 8; i++) S.at(S.t + i * 0.04, () => S.emit({ type: 'chip', x: lerp(sx, ex, i / 9), y: lerp(sy, ey, i / 9) + 4, vx: f * 30, vy: -30 - S.rnd() * 30, r: 1.6 * sc, color: E.core, life: 0.4, g: 300, spin: 0 })); });
  } else if (el === 'ice') {
    fly = 0.26;
    S.at(t1, () => { const [sx, sy] = handOf(who), [ex, ey] = aim(); for (let i = 0; i < 3; i++) S.at(S.t + i * 0.05, () => S.emit({ type: 'bolt', x: sx, y: sy - 6 + i * 6, tx: ex, ty: ey - 8 + i * 8, r: 6 * sc, color: E.color, arc: 3, shard: true, life: fly / 0.82 })); });
  } else if (el === 'wind') {
    fly = 0.22;
    S.at(t1, () => { const [sx, sy] = handOf(who), [ex, ey] = aim(); for (let i = 0; i < 3; i++) S.at(S.t + i * 0.05, () => S.emit({ type: 'wave', x: sx + f * 10, y: ey - 10 + i * 10, tx: ex, r: (16 + i * 3) * sc * big, color: E.color, life: fly / 0.8 }));
      for (let i = 0; i < 9; i++) S.emit({ type: 'streak', x: sx - f * 30 + S.rnd() * 40, y: sy - 30 + S.rnd() * 70, vx: f * (500 + S.rnd() * 300), len: 40 + S.rnd() * 50, curl: (S.rnd() - 0.5) * 16, color: E.color, w: 1.1, a: 0.5, life: 0.3 + S.rnd() * 0.2 }); S.dust(who.x + f * 30, 3, '#c8d8d0'); });
  } else if (el === 'bolt') {
    fly = 0.03;
    S.at(t1, () => { const [sx, sy] = handOf(who), [ex, ey] = aim(); S.emit({ type: 'lightning', pts: zigzag(sx, sy - 6, ex, ey, S.rnd), tx: ex, ty: ey, life: 0.36 }); S.emit({ type: 'lightning', pts: zigzag(ex, ey - 190, ex, ey, S.rnd, 7), tx: ex, ty: ey, life: 0.3 }); S.whiteout(0.3); S.jolt(9); });
  } else if (el === 'earth') {
    fly = 0.36; // 땅을 내리치면 금이 달려가 발밑에서 솟는다
    S.at(t1 - 0.06, () => { if (isHuman(who)) S.go(who, 'chop', 0.08, 'out'); });
    S.at(t1, () => { S.jolt(5); S.dust(who.x + f * 26 * sc, 4, E.color); const x0 = who.x + f * 30 * sc, x1 = (hit === 'ward' ? target.x - f * 40 * tsc : target.x);
      for (let i = 0; i < 7; i++) S.at(S.t + i * fly / 7, () => { const x = lerp(x0, x1, i / 6); S.emit({ type: 'spike', x, y: GY + 1, h: (8 + i * 2.4) * big, w: 5 + i * 0.6, tilt: (S.rnd() - 0.5) * 0.5, life: 0.5, color: '#5a5044' }); S.dust(x, 1, E.color); S.jolt(1.5); }); });
  } else if (el === 'light') {
    fly = 0.16;
    S.at(t1, () => { const [ex, ey] = aim(); S.emit({ type: 'beam', x: ex - f * 60, y: -20, tx: ex, ty: ey + 6, w: 7 * big, color: E.color, life: 0.5 }); S.whiteout(0.25); for (let i = 0; i < 10; i++) S.emit({ type: 'ember', x: ex + (S.rnd() - 0.5) * 50, y: ey - S.rnd() * 60, vx: 0, vy: -30, r: 4, color: E.color, life: 0.6 + S.rnd() * 0.4 }); });
  } else if (el === 'shadow' || el === 'life') {
    fly = 0.3;
    S.at(t1, () => { const [ex, ey] = aim(), gx = hit === 'ward' ? ex - f * 6 : target.x; S.emit({ type: 'rune', x: gx, y: GY, r: 30 * tsc, life: 0.8, color: E.color });
      for (let i = 0; i < 5; i++) S.at(S.t + i * 0.04, () => S.emit({ type: 'tendril', x: gx + (i - 2) * 13 * tsc, y: GY + 2, tx: ex + (i - 2) * 4, ty: ey - 14 * tsc + (i % 2) * 14, w: (el === 'life' ? 3 : 4) * tsc, curl: 9 * tsc, ph: i * 2.1, color: el === 'life' ? '#3a5a2c' : '#1c1226', leaf: el === 'life' ? '#6aa04a' : null, glow: E.color, life: 0.9 }));
      if (el === 'shadow') for (let i = 0; i < 6; i++) S.emit({ type: 'smoke', x: gx + (S.rnd() - 0.5) * 50, y: GY - 6, r: 12, rise: 40 + S.rnd() * 30, color: '#1a1024', a: 0.4, life: 0.9 }); });
  } else if (el === 'mind') {
    fly = 0.34;
    S.at(t1, () => { const [hx, hy] = who.head ?? handOf(who), [tx, ty] = target.head ?? aim(); for (let i = 0; i < 4; i++) S.at(S.t + i * 0.07, () => S.emit({ type: 'ripple', x: lerp(hx, tx, 0.2 + i * 0.25), y: lerp(hy, ty, 0.2 + i * 0.25), r: (16 + i * 6) * sc, flat: 1.5, rot: 1.57, color: E.color, life: 0.5 })); });
  }
  const tc = t1 + fly;
  if (hit === 'ward') ward(S, target, tc - 0.16, '#a8d0ff', 0.7, 1);
  S.at(tc, () => {
    const [tx, ty] = chestOf(target);
    if (hit !== 'hit') { const wx = tx - f * 30 * tsc; S.sparks(wx, ty, 12, E.core); S.emit({ type: 'flash', x: wx, y: ty, r: 30 * tsc, life: 0.2, color: E.color }); S.emit({ type: 'ring', x: wx, y: ty, r: 40 * tsc, life: 0.35, color: '#cfe4ff' }); S.jolt(3); return; }
    if (el === 'mind') { // 몸은 멀쩡한데 마음이 흔들린다
      const [hx, hy] = target.head ?? [tx, ty - 30]; S.emit({ type: 'ripple', x: hx, y: hy - 4, r: 30 * tsc, flat: 0.5, color: E.color, life: 0.9 }); S.emit({ type: 'flash', x: hx, y: hy, r: 26 * tsc, life: 0.3, color: E.color }); S.hitstop(0.12, 0.2); S.punch(hx, hy, 1.06, 0.5);
      if (!target.out) { if (isHuman(target)) S.go(target, 'sway', 0.3, 'io'); else S.go(target, { crouch: 0.8, lunge: -0.4 }, 0.3); }
      return;
    }
    wound(S, target, f, true, { color: E.core, final: o.final, soft: true, noChips: el !== 'earth' && el !== 'ice' });
    if (el === 'fire' || el === 'dark' || el === 'bolt' || el === 'light') S.emit({ type: 'ring', x: tx, y: ty, r: 44 * tsc * big, life: 0.4, color: E.color });
    if (el === 'fire' || el === 'dark') { S.emit({ type: 'flash', x: tx, y: ty, r: 70 * tsc * big, life: 0.34, color: E.color }); for (let i = 0; i < 12; i++) S.emit({ type: 'ember', x: tx, y: ty, vx: (S.rnd() - 0.5) * 110, vy: -20 - S.rnd() * 90, r: (4 + S.rnd() * 5) * tsc, color: E.color, life: 0.5 + S.rnd() * 0.4 }); for (let i = 0; i < 4; i++) S.emit({ type: 'smoke', x: tx + (S.rnd() - 0.5) * 30, y: ty, r: 12 * tsc, rise: 50, a: 0.34, life: 0.9 }); }
    else if (el === 'water') { for (let i = 0; i < 16; i++) S.emit({ type: 'chip', x: tx, y: ty, vx: (S.rnd() - 0.4) * f * 190, vy: -60 - S.rnd() * 130, r: 2 * tsc, color: i % 2 ? E.core : E.color, life: 0.6, g: 360, spin: 0 }); S.emit({ type: 'ring', x: target.x, y: GY, r: 50 * tsc, flat: 0.22, life: 0.5, color: E.core }); }
    else if (el === 'ice') { for (let i = 0; i < 9; i++) S.emit({ type: 'chip', x: tx, y: ty, vx: (S.rnd() - 0.4) * f * 170, vy: -40 - S.rnd() * 110, r: 3 * tsc, color: i % 2 ? E.core : E.color, life: 0.6 }); for (let i = 0; i < 3; i++) S.emit({ type: 'spike', x: target.x + (i - 1) * 12 * tsc, y: GY + 1, h: 14 + i * 3, w: 4, tilt: (i - 1) * 0.3, color: '#b8dcf4', lit: 'rgba(255,255,255,.5)', life: 0.8 }); }
    else if (el === 'wind') { S.dust(target.x, 5, '#c8d8d0'); if (!target.out) S.go(target, { x: target.x + f * 22 * tsc }, 0.26, 'out'); for (let i = 0; i < 5; i++) S.emit({ type: 'streak', x: tx - f * 20, y: ty - 20 + i * 10, vx: f * 380, len: 30, color: E.core, a: 0.6, life: 0.24 }); }
    else if (el === 'bolt') { S.emit({ type: 'flash', x: tx, y: ty, r: 60 * tsc, life: 0.3, color: E.color }); S.sparks(tx, ty, 14, E.core); }
    else if (el === 'earth') { for (let i = 0; i < 4; i++) S.emit({ type: 'spike', x: target.x + (i - 1.5) * 13 * tsc, y: GY + 1, h: (26 + (i % 2) * 14) * tsc * big, w: 7 * tsc, tilt: (i - 1.5) * 0.22, life: 0.9, color: '#5a5044' }); for (let i = 0; i < 8; i++) S.emit({ type: 'chip', x: target.x, y: GY - 10, vx: (S.rnd() - 0.5) * 200, vy: -90 - S.rnd() * 120, r: 3.4 * tsc, color: i % 2 ? '#6a5e50' : '#8a7a64', life: 0.7 }); S.dust(target.x, 6, E.color); S.jolt(6); }
    else if (el === 'light') { S.emit({ type: 'flash', x: tx, y: ty, r: 80 * tsc, life: 0.4, color: E.color }); S.emit({ type: 'star', x: tx, y: ty, r: 60 * tsc, n: 14, life: 0.34, color: E.core }); }
    else if (el === 'shadow') { for (let i = 0; i < 8; i++) S.emit({ type: 'ember', x: tx + (S.rnd() - 0.5) * 30, y: ty + (S.rnd() - 0.5) * 30, vx: (S.rnd() - 0.5) * 40, vy: -30 - S.rnd() * 40, r: 6 * tsc, color: E.color, life: 0.7 }); }
    else if (el === 'life') { for (let i = 0; i < 8; i++) S.emit({ type: 'chip', x: tx, y: ty, vx: (S.rnd() - 0.5) * 150, vy: -50 - S.rnd() * 90, r: 2.6 * tsc, color: i % 2 ? '#6aa04a' : '#3a5a2c', life: 0.7, g: 200 }); }
  });
  if (!o.stay) S.at(tc + 0.34, () => { if (who.out) return; S.go(who, isHuman(who) ? 'guard' : { lunge: 0 }, 0.3, 'io'); S.go(who, { power: 0 }, 0.3); });
  return tc;
}
