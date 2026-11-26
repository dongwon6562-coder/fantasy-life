// 전투 연출의 몸짓: 치기·받기·피하기·맞기·쓰러지기. 무대(Stage)에 때 맞춰 자세와 효과를 건다. (46단계)
// 수마다 몸짓이 다르다:
//   heavy 강공: 머리 위로 치켜들었다 내려친다        quick 속공: 짧게 당겼다 찌른다 (잔상)
//   feint 허초: 위를 칠 듯 몸을 틀었다 낮게 벤다      aura 검기: 기를 모아 초승달 빛을 날린다
// 받는 쪽도 다르다: 맞음(hit) 휘청·밀림, 막음(block) 칼을 세워 받거나 흘림·불티, 빗나감(miss) 물러나 피함.
// 피는 그리지 않는다. 맞은 자리는 빛과 불티, 튀는 천 조각으로만.
import { GY, lerp, mix } from './battleKit.js';

const isHuman = (a) => a.look.form === 'human';
const chestOf = (a) => a.chest ?? [a.x, a.y - 44 * (a.look.s ?? 1) * (a.scale ?? 1)];

/** 맞았다: 빛·불티·조각, 흔들림과 느린 순간, 휘청이며 밀린다 */
export function wound(S, target, dir, heavy = true, o = {}) {
  const [cx, cy] = chestOf(target), sc = target.scale ?? 1;
  S.emit({ type: 'flash', x: cx, y: cy, r: (heavy ? 46 : 28) * sc * (o.soft ? 0.55 : 1), life: 0.2, color: o.color ?? '#ffe8c8' });
  S.emit({ type: 'star', x: cx, y: cy, r: (heavy ? 40 : 26) * sc, n: heavy ? 11 : 7, rot: S.rnd() * 6, life: 0.22, color: o.color });
  S.sparks(cx, cy, heavy ? 9 : 5, o.color);
  if (!o.noChips) S.chips(cx, cy, dir, heavy ? 7 : 4, target.look.armor ? '#9aa0a8' : mix(target.look.body, '#d8c8a0', 0.2));
  S.jolt(heavy ? 9 : 5); S.hitstop(o.final ? 0.26 : heavy ? 0.1 : 0.05, o.final ? 0.05 : 0.08); S.punch(cx, cy, o.final ? 1.16 : heavy ? 1.07 : 1.035, o.final ? 0.7 : 0.36);
  if (o.final) S.whiteout(0.5);
  if (target.out) return;
  if (isHuman(target)) S.go(target, 'stagger', 0.12, 'out'); else S.go(target, { rear: 0.7, lunge: -0.6, bite: 0 }, 0.12, 'out');
  S.go(target, { x: target.x + dir * (heavy ? 20 : 10) * sc }, 0.24, 'out'); S.dust(target.x, heavy ? 3 : 1);
}

/**
 * who가 target을 t초에 친다. kind: heavy | quick | feint | aura (짐승은 달려들어 문다)
 * hit: 'hit' | 'block' | 'miss'.  o: { final(마지막 일격), stay(제자리로 안 돌아옴), after(끝 자세), color }
 * 돌려주는 값: 닿는 때
 */
export function strike(S, who, target, t, kind = 'heavy', hit = 'hit', o = {}) {
  const f = who.face, human = isHuman(who), sc = who.scale ?? 1, reach = (human ? 30 : 34) * sc;
  let meet = 0; // 치는 순간의 상대 자리로 잡는다 (그 사이에 움직였을 수 있다)
  // meet: 상대 몸 앞. 여기서 무기 길이만큼 떨어져 선다 (몸이 겹치지 않게)
  const aim = () => { meet = target.x - f * (isHuman(target) ? 14 : 30) * (target.look.s ?? 1) * (target.scale ?? 1); };
  let tc;
  if (!human) {
    S.at(t, () => { if (who.out) return; aim(); S.go(who, { crouch: 1, rear: 0.1, lunge: -0.4 }, 0.2, 'out'); });
    S.at(t + 0.22, () => { if (who.out) return; who.swing = false; S.go(who, { lunge: 1, bite: 1, crouch: 0, rear: 0.55, x: meet - f * 44 * who.look.s * sc }, 0.11, 'out'); S.dust(who.x, 2); S.speed(who, f); });
    tc = t + 0.33;
  } else if (kind === 'quick') {
    S.at(t, () => { if (who.out) return; aim(); S.go(who, { ...S.pose('guard'), lean: 2, armA: 60, elbow: 70, step: 0.2 }, 0.09, 'out'); });
    S.at(t + 0.1, () => { if (who.out) return; who.swing = true; S.ghost(who); S.go(who, 'thrust', 0.07, 'out'); S.go(who, { x: meet - f * reach * 1.9 }, 0.08, 'out'); S.dust(who.x, 1); S.speed(who, f); });
    tc = t + 0.17;
  } else if (kind === 'feint') {
    S.at(t, () => { if (who.out) return; aim(); who.swing = true; S.go(who, 'twist', 0.14, 'out'); S.go(who, { x: who.x + f * 12 * sc }, 0.14); S.emit({ type: 'flash', x: who.x + f * 16 * sc, y: who.y - 66 * sc, r: 16 * sc, life: 0.18 }); });
    // 상대는 위를 막으려 든다 (속았으면 그대로 맞는다)
    S.at(t + 0.1, () => { if (!target.out && isHuman(target)) S.go(target, hit === 'hit' ? { ...S.pose('parry'), armA: 120, lean: -8 } : 'guard', 0.1, 'out'); });
    S.at(t + 0.2, () => { if (who.out) return; S.ghost(who); S.go(who, 'low', 0.1, 'out'); S.go(who, { x: meet - f * reach * 1.5 }, 0.1, 'out'); S.dust(who.x, 2); });
    tc = t + 0.29;
  } else if (kind === 'aura') {
    const col = o.color ?? '#8fc0ff';
    S.at(t, () => { if (who.out) return; aim(); who.blade = col; S.go(who, 'charge', 0.22, 'out'); S.emit({ type: 'rune', x: who.x, y: GY, r: 34 * sc, life: 0.6, color: col });
      for (let i = 0; i < 12; i++) { const an = S.rnd() * 6.28, d = (40 + S.rnd() * 40) * sc; S.at(S.t + i * 0.022, () => S.emit({ type: 'gather', x: who.x + Math.cos(an) * d, y: who.y - 50 * sc + Math.sin(an) * d * 0.7, tx: who.x + f * 4 * sc, ty: who.y - 62 * sc, r: 6 * sc, color: col, life: 0.26 })); } });
    S.at(t + 0.36, () => { if (who.out) return; who.swing = true; S.go(who, 'slash', 0.09, 'out'); S.go(who, { x: who.x + f * 14 * sc }, 0.1, 'out'); S.dust(who.x, 3); S.jolt(3);
      const [, cy] = chestOf(target); S.emit({ type: 'wave', x: who.x + f * 30 * sc, y: cy, tx: target.x - f * 6 * sc, r: 30 * sc, color: col, life: 0.25 }); });
    tc = t + 0.36 + 0.09 + 0.19;
  } else { // heavy
    S.at(t, () => { if (who.out) return; aim(); who.swing = true; S.go(who, 'overhead', 0.24, 'back'); S.go(who, { x: lerp(who.x, meet - f * reach * 1.6, 0.5) }, 0.24, 'out'); });
    S.at(t + 0.27, () => { if (who.out) return; S.go(who, 'chop', 0.085, 'out'); S.go(who, { x: meet - f * reach * 1.5 }, 0.09, 'out'); S.dust(who.x, 2); S.speed(who, f); });
    tc = t + 0.345;
  }
  // 받는 쪽이 미리 움직인다
  if (hit === 'block' && kind !== 'feint') S.at(tc - 0.12, () => { if (!target.out && isHuman(target)) S.go(target, kind === 'quick' ? 'deflect' : 'parry', 0.1, 'out'); });
  if (hit === 'miss') S.at(tc - 0.14, () => { if (target.out) return; if (isHuman(target)) S.go(target, 'dodge', 0.12, 'out'); else S.go(target, { crouch: 0.6, lunge: -0.8 }, 0.12, 'out'); S.go(target, { x: target.x + f * 24 * (target.scale ?? 1) }, 0.16, 'out'); S.dust(target.x, 2); });
  S.at(tc, () => {
    if (who.out) return;
    const [cx, cy] = chestOf(target), tsc = target.scale ?? 1;
    if (!human) S.emit({ type: 'claw', x: cx, y: cy, r: 20 * tsc, f, life: 0.26 });
    else if (kind === 'quick') S.emit({ type: 'thrust', x: cx - f * 4, y: cy, dx: f * 46 * sc, life: 0.2 });
    else if (kind !== 'aura') S.emit({ type: 'slash', x: cx - f * 12 * sc, y: cy - (kind === 'feint' ? -8 : 4) * sc, r: 34 * sc, ang: (f > 0 ? 0 : Math.PI) + (kind === 'feint' ? -f * 0.5 : f * 0.9), flip: kind === 'feint' ? -f : f, life: 0.2, color: who.blade ?? undefined, glow: who.blade });
    if (hit === 'hit') { wound(S, target, f, o.heavy ?? kind !== 'quick', { final: o.final, color: kind === 'aura' ? (o.color ?? '#8fc0ff') : who.blade ?? undefined }); if (kind === 'aura') { S.emit({ type: 'ring', x: cx, y: cy, r: 54 * tsc, life: 0.4, color: o.color ?? '#8fc0ff' }); for (let i = 0; i < 8; i++) S.emit({ type: 'ember', x: cx, y: cy, vx: (S.rnd() - 0.3) * f * 120, vy: -30 - S.rnd() * 70, r: 6 * tsc, color: o.color ?? '#8fc0ff', life: 0.5 + S.rnd() * 0.3 }); } }
    else if (hit === 'block') {
      const bx = cx - f * 16 * tsc, by = cy - 10 * tsc; // 칼이 맞부딪는 자리
      S.sparks(bx, by, kind === 'heavy' || kind === 'aura' ? 18 : 10); S.emit({ type: 'flash', x: bx, y: by, r: 30 * tsc, life: 0.16 }); S.emit({ type: 'star', x: bx, y: by, r: 24 * tsc, n: 7, rot: S.rnd() * 6, life: 0.16 });
      S.jolt(kind === 'quick' ? 3 : 6); S.hitstop(kind === 'quick' ? 0.03 : 0.07, 0.1); S.punch(bx, by, 1.04, 0.3);
      if (!target.out && kind !== 'quick') { S.go(target, { x: target.x + f * 9 * tsc }, 0.2, 'out'); S.dust(target.x, 2); }
      if (kind === 'aura') S.emit({ type: 'ward', x: cx - f * 6 * tsc, y: cy, r: 34 * tsc, f: -f, life: 0.5, color: o.color ?? '#8fc0ff', hit: 1 });
    } else { // 빗나갔다: 칼이 허공을 가르고 땅을 친다
      S.dust(who.x + f * 30 * sc, 3); if (kind === 'heavy') { S.jolt(3); S.sparks(who.x + f * 34 * sc, GY - 3, 4); }
    }
  });
  if (!o.stay) S.at(tc + (kind === 'heavy' ? 0.4 : 0.32), () => { who.blade = null; who.swing = false; if (who.out) return; S.go(who, human ? (o.after ?? 'guard') : { lunge: 0, bite: 0, rear: 0, crouch: 0 }, 0.28, 'io'); S.go(who, { x: who.home }, 0.32, 'io'); if (!target.out && hit !== 'hit' && !o.noReset) { S.go(target, isHuman(target) ? 'guard' : { lunge: 0, crouch: 0 }, 0.3, 'io'); S.go(target, { x: target.home }, 0.34, 'io'); } });
  return tc;
}

/** 쓰러진다: how 'kneel'(무릎 꿇음) | 'fall'(넘어짐). 짐승·망령은 눕거나 흩어진다 */
export function down(S, a, t, how = 'kneel') {
  S.at(t, () => {
    a.out = true; a.swing = false; a.blade = null;
    if (how === 'fall' || !isHuman(a)) { S.go(a, { fall: 1 }, 0.46, 'in'); if (isHuman(a)) S.go(a, 'stagger', 0.2); else S.go(a, { lunge: 0, bite: 0, rear: 0, gait: 0 }, 0.2); S.at(S.t + 0.44, () => { S.dust(a.x - a.face * 16 * (a.scale ?? 1), 5); S.jolt(3); }); if (!isHuman(a)) S.at(S.t + 1.1, () => S.go(a, { alpha: 0 }, 0.7, 'io')); }
    else { S.go(a, 'kneel', 0.42, 'io'); S.at(S.t + 0.36, () => S.dust(a.x + a.face * 8, 2)); }
  });
}
/** 달아난다 */
export function leave(S, a, t, dir, speed = 1) {
  S.at(t, () => { a.out = true; a.swing = false; a.face = dir; a.lit = -dir; if (isHuman(a)) S.go(a, 'run', 0.15); else S.go(a, { gait: 1, lunge: 0.4, rear: 0, bite: 0 }, 0.15); S.go(a, { x: a.x + dir * 340, alpha: 0 }, 1.1 / speed, 'in'); S.dust(a.x, 2); });
}
/** 칼을 놓친다: 손에서 튕겨 나가 돌다가 땅에 꽂힌다 */
export function disarm(S, a, t, dir) {
  S.at(t, () => {
    const sc = a.scale ?? 1, [hx, hy] = a.wbase ?? [a.x, a.y - 60 * sc];
    a.look = { ...a.look, weapon: 'none' }; a.swing = false; a.blade = null;
    S.emit({ type: 'blade', x: hx, y: hy, vx: dir * 70, vy: -260, spin: dir * 17, len: 30 * sc, life: 40, keep: true });
    S.sparks(hx, hy, 12); S.emit({ type: 'flash', x: hx, y: hy, r: 26 * sc, life: 0.16 }); S.emit({ type: 'star', x: hx, y: hy, r: 26 * sc, n: 7, life: 0.18 }); S.jolt(5); S.hitstop(0.12, 0.08);
    if (isHuman(a)) { S.go(a, 'stagger', 0.14, 'out'); S.at(S.t + 0.5, () => S.go(a, { ...S.pose('lower'), armA: 40, armB: 40, lean: -6 }, 0.5, 'io')); }
  });
}
