// 전투 연출: 결투·교전·전쟁 장면을 사건 창 위쪽 그림 칸에 움직이는 그림으로 보여 준다.
// 규칙에는 손대지 않는다. 화면(src/ui)도 고치지 않고 옆에서 지켜보다가, 싸움 장면이 뜨면 그림 칸에 캔버스를 얹는다.
//  - 고르기 전: 마주 선 모습 (멈춘 그림)
//  - 고른 뒤: 그 선택과 결과에 맞는 움직임 (2~3초), 끝난 모습으로 멈춘다
// '움직임 줄이기' 설정이면 움직이지 않고 끝난 모습만 보여 준다.
//
// 다른 곳에서 직접 쓰려면:
//   import { battleDemo } from './art/battle.js';
//   const stop = battleDemo(host, { kind: 'duel', move: 'heavy', df: 1 });   // host 안에 캔버스를 넣고 연출을 튼다
// spec:
//   결투 { kind: 'duel', magic, move, dm(내가 맞음), df(상대가 맞음), end: 'win'|'lose'|'yield', lethal, hurtMe, hurtFoe(0~1), foe: { unit } }
//   교전 { kind: 'fight', unit, count, leader, comps, mage, tactic: 'charge'|'ambush'|'magic', result: 'victory'|'defeat'|'flee', wounded }
//   전쟁 { kind: 'war', ours, theirs, plan: 'charge'|'flank'|'hold'|'night'|'walls', outcome: 'win'|'lose'|'draw' }
//   move/tactic/plan을 빼면 마주 선 모습만 그린다.
import { HOOKS } from '../hooks.js';
import { circleOf } from '../game.js';
import { companionsFor } from '../adventure/fight.js';
import { SW, SH, GY, POSE, EASE, lerp, clamp, lookOf, HERO, MAGE, ALLY, drawActor, drawFx, orb, zigzag } from './battleKit.js';

const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';
const safe = (fn, fb = null) => { try { return fn(); } catch { return fb; } };
const mkRnd = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const hashStr = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };

/* ---------- 무대 ---------- */
class Stage {
  constructor(seed = 1) {
    this.canvas = document.createElement('canvas'); this.canvas.className = 'fl-battle-cv'; this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d');
    this.actors = []; this.fx = []; this.cues = []; this.tweens = []; this.t = 0; this.end = 0; this.shake = 0;
    this.night = 0; this.war = null; this.raf = 0; this.rnd = mkRnd(seed); this.last = 0; this.wall = false;
  }
  add(look, x, face, pose = 'guard', o = {}) {
    const a = { look, x, y: GY + (o.dy ?? 0), face, st: { ...POSE.stand, ...(POSE[pose] ?? {}), fall: 0, alpha: 1, lunge: 0, rear: 0, gait: 0, bite: 0 }, seed: this.rnd() * 9, lit: -face, t: 0, scale: o.scale ?? 1, blade: null, home: x };
    this.actors.push(a); return a;
  }
  at(t, fn) { this.cues.push([t, fn]); this.end = Math.max(this.end, t + 0.05); }
  /** 자세나 자리를 dur초에 걸쳐 바꾼다. target: 자세 이름이나 값 묶음 ({ x, fall, alpha, lean ... }) */
  go(a, target, dur = 0.2, ease = 'out') {
    const tg = typeof target === 'string' ? POSE[target] : target;
    for (const k in tg) {
      const own = k === 'x' || k === 'y';
      this.tweens = this.tweens.filter((w) => !(w.a === a && w.k === k));
      this.tweens.push({ a, k, own, from: (own ? a : a.st)[k] ?? 0, to: tg[k], t0: this.t, dur: Math.max(0.001, dur), ease: EASE[ease] });
    }
    this.end = Math.max(this.end, this.t + dur);
  }
  emit(e) { e.t0 = this.t; e.life ??= 0.3; if (this.fx.length >= 160) this.fx.shift(); this.fx.push(e); this.end = Math.max(this.end, this.t + e.life); }
  sparks(x, y, n = 8, color) { for (let i = 0; i < n; i++) { const an = this.rnd() * 6.283, v = 70 + this.rnd() * 170; this.emit({ type: 'spark', x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 50, life: 0.22 + this.rnd() * 0.22, color }); } }
  blood(x, y, dir, n = 6) { for (let i = 0; i < n; i++) this.emit({ type: 'blood', x, y, vx: dir * (30 + this.rnd() * 90), vy: -40 - this.rnd() * 90, r: 0.9 + this.rnd() * 1.3, life: 0.5 + this.rnd() * 0.3 }); }
  dust(x, n = 3, color) { for (let i = 0; i < n; i++) this.emit({ type: 'dust', x: x + (this.rnd() - 0.5) * 22, y: GY - 2, vx: (this.rnd() - 0.5) * 26, r: 8 + this.rnd() * 9, life: 0.6 + this.rnd() * 0.4, color }); }
  jolt(v) { this.shake = Math.max(this.shake, v); }

  step(dt) {
    this.t += dt;
    while (this.cues.length && this.cues[0][0] <= this.t) { const [, fn] = this.cues.shift(); safe(fn); }
    for (const w of this.tweens) { const k = clamp((this.t - w.t0) / w.dur); (w.own ? w.a : w.a.st)[w.k] = lerp(w.from, w.to, w.ease(k)); w.done = k >= 1; }
    this.tweens = this.tweens.filter((w) => !w.done);
    this.fx = this.fx.filter((e) => this.t - e.t0 < e.life);
    this.shake *= Math.exp(-dt * 9);
    if (this.war) stepWar(this, dt);
    for (const a of this.actors) a.t = this.t;
  }
  draw() {
    const c = this.ctx, cv = this.canvas, k = cv.width / SW;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    const sh = this.shake > 0.3 ? this.shake : 0;
    c.setTransform(k, 0, 0, k, (this.rnd() - 0.5) * sh * k, (this.rnd() - 0.5) * sh * k);
    // 바탕: 뒤의 풍경을 눌러 주는 어둠, 실루엣이 서는 뿌연 빛의 띠, 땅
    let g = c.createLinearGradient(0, 0, 0, SH);
    g.addColorStop(0, 'rgba(16,13,14,.5)'); g.addColorStop(0.42, 'rgba(60,50,44,.3)'); g.addColorStop(0.74, 'rgba(206,186,156,.46)'); g.addColorStop(0.81, 'rgba(120,104,84,.9)'); g.addColorStop(0.86, '#4c4034'); g.addColorStop(1, '#231d18');
    c.fillStyle = g; c.fillRect(-8, -8, SW + 16, SH + 16);
    if (this.night) { c.fillStyle = `rgba(8,12,30,${0.62 * this.night})`; c.fillRect(-8, -8, SW + 16, SH + 16); }
    if (this.wall) drawWall(c);
    if (this.war) drawWar(c, this);
    for (const a of [...this.actors].sort((p, q) => p.y - q.y)) drawActor(c, a);
    for (const e of this.fx) drawFx(c, e, clamp((this.t - e.t0) / e.life));
    // 양 끝을 어둡게
    g = c.createLinearGradient(0, 0, SW, 0);
    g.addColorStop(0, 'rgba(14,11,10,.7)'); g.addColorStop(0.16, 'rgba(14,11,10,0)'); g.addColorStop(0.84, 'rgba(14,11,10,0)'); g.addColorStop(1, 'rgba(14,11,10,.7)');
    c.fillStyle = g; c.fillRect(-8, -8, SW + 16, SH + 16);
  }
  fit() {
    const cv = this.canvas, w = cv.clientWidth || cv.parentNode?.clientWidth || 360;
    const dpr = Math.min(2, window.devicePixelRatio || 1), pw = Math.round(w * dpr);
    if (cv.width !== pw) { cv.width = pw; cv.height = Math.round(pw * SH / SW); }
    this.draw();
  }
  /** 연출을 튼다. still이면 움직이지 않고 끝난 모습만 */
  play(still = false) {
    this.cues.sort((a, b) => a[0] - b[0]);
    if (still) { let guard = 0; while ((this.cues.length || this.tweens.length) && guard++ < 400) this.step(0.05); this.fx = []; this.shake = 0; this.step(0.05); this.draw(); return; }
    this.last = 0;
    const tick = (now) => {
      if (!this.canvas.isConnected && this.t > 0.2) { this.raf = 0; return; } // 화면에서 떨어졌으면 멈춘다
      const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016; this.last = now;
      this.step(dt); this.draw();
      // 끝난 뒤에도 잠깐(망토·숨결) 그리다가 멈춘다. 배터리를 아낀다.
      if (this.t < this.end + 0.4 || this.cues.length) this.raf = requestAnimationFrame(tick); else this.raf = 0;
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.cues = []; }
}

/* ---------- 치고 받는 한 동작 ---------- */
// who가 target을 t초에 친다. kind: heavy(크게 벤다) quick(찌른다) aura(검기). hit: 'hit' 맞음 | 'block' 막힘 | 'miss'
function strike(S, who, target, t, kind = 'heavy', hit = 'hit', o = {}) {
  const f = who.face, human = who.look.form === 'human', reach = (human ? 30 : 34) * who.scale;
  let meet = 0; // 치는 순간의 상대 자리로 잡는다 (그 사이에 움직였을 수 있다)
  const aim = () => { meet = target.x - f * (target.look.form === 'human' ? 26 : 34) * (target.look.s ?? 1) * target.scale; };
  if (human) {
    const quick = kind === 'quick';
    S.at(t, () => { if (who.out) return; aim(); S.go(who, quick ? 'guard' : 'windup', quick ? 0.08 : 0.2, 'out'); S.go(who, { x: lerp(who.x, meet - f * reach, 0.35) }, 0.2); if (kind === 'aura') who.blade = '#9ec8ff'; });
    S.at(t + (quick ? 0.1 : 0.22), () => { if (who.out) return; S.go(who, quick ? 'thrust' : 'slash', 0.1, 'out'); S.go(who, { x: meet - f * reach * 0.55 }, 0.1); S.dust(who.x, 2); });
  } else {
    S.at(t, () => { if (who.out) return; aim(); S.go(who, { crouch: 1, rear: 0.2 }, 0.16); });
    S.at(t + 0.18, () => { if (who.out) return; S.go(who, { lunge: 1, bite: 1, crouch: 0, rear: 0.5, x: meet - f * 30 * who.look.s * who.scale }, 0.12, 'out'); S.dust(who.x, 2); });
  }
  const tc = t + (human && kind === 'quick' ? 0.17 : 0.3);
  S.at(tc, () => {
    if (who.out) return;
    const [cx, cy] = target.chest ?? [target.x, target.y - 40];
    if (human) S.emit(kind === 'quick'
      ? { type: 'thrust', x: cx - f * 4, y: cy, dx: f * 34, life: 0.2 }
      : { type: 'slash', x: cx - f * 12, y: cy - 2, r: kind === 'aura' ? 44 : 30, ang: f > 0 ? 0.35 : Math.PI - 0.35, flip: 1, life: kind === 'aura' ? 0.34 : 0.24, color: kind === 'aura' ? '#dcecff' : undefined, glow: kind === 'aura' ? '#7fb2ff' : null });
    if (hit === 'hit') wound(S, target, f, o.heavy ?? kind !== 'quick', o.blood ?? true);
    else if (hit === 'block') { S.sparks(cx - f * 14, cy - 6, 10); S.emit({ type: 'flash', x: cx - f * 14, y: cy - 6, r: 22, life: 0.16 }); S.jolt(3); if (target.look.form === 'human' && !target.out) S.go(target, 'block', 0.07); }
  });
  if (!o.stay) S.at(tc + 0.34, () => { who.blade = null; if (who.out) return; S.go(who, human ? (o.after ?? 'guard') : { lunge: 0, bite: 0, rear: 0, crouch: 0 }, 0.26, 'io'); S.go(who, { x: who.home }, 0.3, 'io'); });
  return tc;
}
function wound(S, target, dir, heavy, blood) {
  const [cx, cy] = target.chest ?? [target.x, target.y - 40];
  S.emit({ type: 'flash', x: cx, y: cy, r: heavy ? 34 : 22, life: 0.18, color: '#ffe8c8' });
  if (blood) S.blood(cx, cy, dir, heavy ? 9 : 5); else S.sparks(cx, cy, 5);
  S.jolt(heavy ? 7 : 4);
  if (target.out) return;
  if (target.look.form === 'human') S.go(target, 'stagger', 0.12, 'out'); else S.go(target, { rear: 0.7, lunge: -0.6 }, 0.12, 'out');
  S.go(target, { x: target.x + dir * (heavy ? 16 : 9) }, 0.2, 'out');
}
const ELEMENT = {
  fire: { color: '#ff8a3a', r: 9, arc: 16 }, ice: { color: '#9fd8ff', r: 6, arc: 4, shard: true }, dark: { color: '#b04068', r: 8, arc: 10 },
  bolt: { lightning: true },
};
// who가 target에게 주문을 쏜다. hit: 'hit' | 'ward'(결계에 막힘)
function cast(S, who, target, t, el = 'fire', hit = 'hit', o = {}) {
  const E = ELEMENT[el], f = who.face;
  S.at(t, () => { if (who.look.form === 'human') S.go(who, 'cast', 0.22, 'out'); S.emit({ type: 'ring', x: who.x, y: GY, r: 26, flat: 0.25, life: 0.5, color: E.color ?? '#b8ccff' }); });
  const fly = E.lightning ? 0.02 : el === 'ice' ? 0.3 : 0.46;
  S.at(t + 0.3, () => {
    const [sx, sy] = who.tip ?? [who.x + f * 20, who.y - 60], [tx, ty] = target.chest ?? [target.x, target.y - 40];
    const ex = hit === 'ward' ? tx - f * 30 : tx;
    if (E.lightning) { S.emit({ type: 'lightning', pts: zigzag(sx, sy - 6, ex, ty, S.rnd), tx: ex, ty, life: 0.34 }); S.jolt(8); }
    else S.emit({ type: 'bolt', x: sx, y: sy, tx: ex, ty, r: E.r * (o.big ? 1.5 : 1), color: E.color, arc: E.arc, shard: E.shard, life: fly / 0.82 });
    if (hit === 'ward') S.at(S.t + fly * 0.6, () => S.emit({ type: 'ward', x: tx - f * 34, y: ty, r: 30, f, life: 0.7, color: '#a8d0ff' }));
  });
  const tc = t + 0.3 + fly;
  S.at(tc, () => {
    const [tx, ty] = target.chest ?? [target.x, target.y - 40];
    if (hit === 'hit') {
      wound(S, target, f, true, false);
      for (let i = 0; i < 7; i++) S.emit({ type: 'ember', x: tx, y: ty, vx: (S.rnd() - 0.5) * 70, vy: -20 - S.rnd() * 60, r: 5 + S.rnd() * 4, color: E.color ?? '#b8ccff', life: 0.5 + S.rnd() * 0.3 });
    } else S.sparks(tx - f * 30, ty, 8, '#cfe4ff');
  });
  if (!o.stay) S.at(tc + 0.3, () => S.go(who, who.look.form === 'human' ? 'guard' : { lunge: 0 }, 0.3, 'io'));
  return tc;
}
function down(S, a, t, how = 'kneel') {
  S.at(t, () => {
    a.out = true;
    if (how === 'fall' || a.look.form !== 'human') { S.go(a, { fall: 1 }, 0.42, 'in'); if (a.look.form === 'human') S.go(a, 'stagger', 0.2); else S.go(a, { lunge: 0, bite: 0, rear: 0 }, 0.2); S.at(S.t + 0.4, () => { S.dust(a.x - a.face * 14, 4); S.jolt(3); }); }
    else S.go(a, 'kneel', 0.4, 'io');
  });
}
function leave(S, a, t, dir, speed = 1) {
  S.at(t, () => { a.out = true; a.face = dir; a.lit = -dir; if (a.look.form === 'human') S.go(a, 'run', 0.15); else S.go(a, { gait: 1, lunge: 0.4 }, 0.15); S.go(a, { x: a.x + dir * 300, alpha: 0 }, 1.1 / speed, 'in'); S.dust(a.x, 2); });
}

/* ---------- 결투 ---------- */
function buildDuel(S, sp) {
  const magic = !!sp.magic;
  const foeLook = sp.foe?.unit ? lookOf(sp.foe.unit) : magic ? { ...MAGE, body: '#221a22', accent: '#5a2a3a', glow: '#ff9a8a' } : { form: 'human', s: 1.02, bulk: 1.02, body: '#26201e', weapon: 'sword', cloak: (sp.seed ?? 0) % 2 === 0, accent: ['#5a2422', '#3a3a44', '#3e4a2e', '#4a3420'][(sp.seed ?? 0) % 4], helm: (sp.seed ?? 0) % 3 === 0 };
  const me = S.add(magic ? MAGE : HERO, 232, 1, 'guard', { scale: 1.35 }), foe = S.add(foeLook, 408, -1, 'guard', { scale: 1.35 });
  const tired = (a, r) => { if (r < 0.5) { a.st.lean += 9; a.st.crouch += 0.1; } };
  tired(me, sp.hurtMe ?? 1); tired(foe, sp.hurtFoe ?? 1);
  if (!sp.move) return;
  const { move, dm, df } = sp, blood = !!sp.lethal;
  const el = (m) => (m === 'quick' ? 'ice' : m === 'guard' ? 'dark' : 'fire');
  let tEnd = 1.25;
  if (move === 'yield') { S.at(0.1, () => { S.go(me, 'lower', 0.5, 'io'); S.go(me, { x: me.x - 14 }, 0.5, 'io'); }); S.at(0.6, () => S.go(foe, 'lower', 0.5, 'io')); return; }
  if (magic) {
    // 마법사끼리: 주문이 오가고 결계가 막는다
    if (move === 'wait') S.at(0.1, () => { S.go(me, 'cast', 0.4); for (let i = 0; i < 6; i++) S.emit({ type: 'ember', x: me.x + (S.rnd() - 0.5) * 60, y: GY - 20 - S.rnd() * 50, vx: 0, vy: -24, r: 5, color: '#9cc4ff', life: 0.9 }); });
    else if (move === 'guard') { S.at(0.1, () => { S.go(me, 'block', 0.2); S.emit({ type: 'ward', x: me.x + 30, y: GY - 44, r: 34, f: -1, life: 1.0 }); }); if (df) cast(S, me, foe, 0.6, 'dark', 'hit'); }
    else cast(S, me, foe, move === 'feint' ? 0.4 : 0.1, el(move), df ? 'hit' : 'ward', { big: move === 'heavy' });
    if (move === 'feint') S.at(0.1, () => { S.go(me, 'feint', 0.15); S.emit({ type: 'flash', x: me.x + 30, y: GY - 60, r: 16, life: 0.2, color: '#9cc4ff' }); });
    if (dm) cast(S, foe, me, df ? 0.25 : 0.12, 'fire', move === 'guard' && !df ? 'hit' : 'hit');
    else if (!df) S.at(0.3, () => S.go(foe, 'block', 0.2));
    tEnd = 1.5;
  } else {
    const both = dm && df, clashOnly = !dm && !df;
    // 내 수
    if (move === 'wait') S.at(0.1, () => { S.go(me, { x: me.x - 22 }, 0.35, 'io'); S.go(me, 'block', 0.3); });
    else if (move === 'guard') { S.at(0.08, () => S.go(me, 'block', 0.16)); if (df) strike(S, me, foe, 0.62, 'heavy', 'hit', { blood }); }
    else if (move === 'magic') cast(S, me, foe, 0.08, sp.spell ?? 'fire', df ? 'hit' : 'ward');
    else {
      if (move === 'feint') S.at(0.05, () => { S.go(me, 'feint', 0.14); S.go(me, { x: me.x + 12 }, 0.14); });
      strike(S, me, foe, move === 'feint' ? 0.3 : 0.1, move === 'quick' ? 'quick' : move === 'aura' ? 'aura' : 'heavy', df ? 'hit' : dm && !both ? 'miss' : 'block', { blood });
    }
    // 상대의 수
    if (dm) strike(S, foe, me, both ? 0.1 : move === 'guard' || move === 'wait' ? 0.14 : 0.5, sp.foeMove === 'quick' ? 'quick' : 'heavy', 'hit', { blood, heavy: move !== 'wait' });
    else if (clashOnly && move !== 'wait' && move !== 'guard') { /* 막혔다: strike가 불꽃을 낸다 */ }
    else if (clashOnly) S.at(0.3, () => { S.go(foe, 'feint', 0.2); S.go(foe, { x: foe.x - 10 }, 0.3, 'io'); S.at(S.t + 0.4, () => { S.go(foe, 'guard', 0.3); S.go(foe, { x: foe.home }, 0.3); }); });
    if (both) S.at(0.4, () => { S.sparks((me.x + foe.x) / 2, GY - 50, 12); S.emit({ type: 'ring', x: (me.x + foe.x) / 2, y: GY - 48, r: 30, life: 0.3 }); });
    tEnd = move === 'guard' && df ? 1.6 : 1.3;
  }
  // 한 합이 끝난 뒤
  S.at(tEnd, () => {
    for (const a of [me, foe]) { a.blade = null; S.go(a, { x: a.home }, 0.35, 'io'); }
    if (sp.end === 'win') { down(S, foe, S.t, sp.lethal ? 'fall' : 'kneel'); S.go(me, 'lower', 0.6, 'io'); }
    else if (sp.end === 'lose') { down(S, me, S.t, sp.lethal ? 'fall' : 'kneel'); S.go(foe, 'lower', 0.6, 'io'); }
    else { S.go(me, 'guard', 0.3, 'io'); S.go(foe, 'guard', 0.3, 'io'); }
  });
}

/* ---------- 교전: 우리 편(나와 동료) 대 적 무리 ---------- */
function buildFight(S, sp) {
  const n = clamp(sp.count ?? 3, sp.leader ? 0 : 1, 5), comps = clamp(sp.comps ?? 0, 0, 3);
  const Z = 1.14;
  const us = [S.add(sp.mage && sp.tactic === 'magic' ? { ...HERO, weapon: 'staff', glow: '#ffb070' } : HERO, 214, 1, 'guard', { scale: Z })];
  for (let i = 0; i < comps; i++) us.push(S.add({ ...ALLY, weapon: ['sword', 'spear', 'axe'][i], helm: i !== 1, accent: ['#4a5a6a', '#5a4a34', '#3e4e3a'][i] }, 160 - i * 48, 1, 'guard', { dy: i % 2 ? -7 : 6, scale: Z }));
  const them = [];
  const unit = lookOf(sp.unit), slots = [[404, 4], [452, -7], [498, 6], [544, -5], [588, 5]];
  if (sp.leader) them.push(Object.assign(S.add(lookOf(sp.leader), n ? 470 : 420, -1, 'guard', { dy: -2, scale: Z }), { boss: true }));
  for (let i = 0; i < n; i++) { const [x, dy] = slots[i]; const sx = sp.leader && Math.abs(x - 470) < 30 ? x + 60 : x; them.push(S.add(unit, sx, -1, 'guard', { dy, scale: Z * (0.94 + S.rnd() * 0.12) })); }
  them.sort((a, b) => a.x - b.x);
  if (!sp.tactic) return;
  const { tactic, result } = sp, win = result === 'victory';
  let t = 0;
  // 첫 수
  if (tactic === 'magic') {
    const tg = them[Math.min(1, them.length - 1)];
    t = cast(S, us[0], tg, 0.1, 'fire', 'hit', { big: true }) + 0.05;
    S.at(t, () => { S.emit({ type: 'ring', x: tg.x, y: GY - 6, r: 70, flat: 0.3, life: 0.5, color: '#ffb070' }); S.emit({ type: 'flash', x: tg.x, y: GY - 30, r: 80, life: 0.3, color: '#ff9a50' }); for (const a of them) if (a !== tg && Math.abs(a.x - tg.x) < 70 && !a.boss) S.go(a, a.look.form === 'human' ? 'stagger' : { rear: 0.6 }, 0.12); });
    if (!tg.boss && them.length > 1) { down(S, tg, t + 0.1, 'fall'); tg.dead = true; }
    t += 0.25;
  } else if (tactic === 'ambush') {
    for (const a of us) { a.x -= 150; a.st.alpha = 0; }
    S.at(0.05, () => us.forEach((a, i) => { S.go(a, 'run', 0.1); S.go(a, { x: a.home + 96, alpha: 1 }, 0.32 + i * 0.05, 'out'); }));
    const tg = them[0];
    t = strike(S, us[0], tg, 0.34, 'quick', 'hit', { stay: true });
    if (!tg.boss && them.length > 1) { down(S, tg, t + 0.05, 'fall'); tg.dead = true; }
    S.at(t, () => us.forEach((a) => (a.home += 96)));
    t += 0.2;
  } else {
    S.at(0.05, () => { for (const a of us) { S.go(a, 'run', 0.14); S.go(a, { x: a.home + 78 }, 0.5, 'in'); a.home += 78; S.dust(a.x, 1); } for (const a of them) { if (a.look.form === 'human') S.go(a, 'run', 0.14); else S.go(a, { gait: 1 }, 0.1); S.go(a, { x: a.home - 34 }, 0.5, 'in'); a.home -= 34; } });
    S.at(0.56, () => { S.sparks(330, GY - 46, 14); S.jolt(6); S.dust(330, 5); for (const a of [...us, ...them]) S.go(a, a.look.form === 'human' ? 'guard' : { gait: 0 }, 0.14); });
    t = 0.62;
  }
  // 뒤엉킨 싸움: 번갈아 치고 막는다
  const alive = () => them.filter((a) => !a.dead);
  const rounds = 4;
  for (let r = 0; r < rounds; r++) {
    us.forEach((a, i) => {
      const foes = alive(); if (!foes.length) return;
      const f = foes[(i + r) % foes.length], tt = t + r * 0.36 + i * 0.09;
      const ours = (r + i) % 2 === 0 ? win || r < 2 : !win && r > 1;
      const last = r === rounds - 1;
      if ((r + i) % 2 === 0) strike(S, a, f, tt, i % 2 ? 'quick' : 'heavy', ours && last && win && !f.boss ? 'hit' : 'block', { stay: false });
      else strike(S, f, a, tt, 'heavy', !win && last && i > 0 ? 'hit' : 'block');
    });
  }
  t += rounds * 0.36 + 0.3;
  if (sp.wounded) S.at(t - 0.75, () => { wound(S, us[0], -1, true, true); S.at(S.t + 0.4, () => { if (!us[0].out) S.go(us[0], 'guard', 0.3); }); });
  // 끝
  if (result === 'victory') {
    alive().forEach((a, i) => { if (a.boss || i % 3 !== 2) down(S, a, t + i * 0.1, 'fall'); else leave(S, a, t + i * 0.1, 1); });
    S.at(t + 0.5, () => us.forEach((a, i) => { S.go(a, i ? 'stand' : 'lower', 0.5, 'io'); S.go(a, { x: a.home }, 0.4, 'io'); }));
  } else if (result === 'flee') {
    us.forEach((a, i) => leave(S, a, t + i * 0.06, -1, 1.2));
    S.at(t + 0.3, () => alive().forEach((a) => { S.go(a, a.look.form === 'human' ? 'cheer' : { rear: 0.4, lunge: 0 }, 0.4); S.go(a, { x: a.home }, 0.4); }));
  } else {
    down(S, us[0], t, 'kneel');
    us.slice(1).forEach((a, i) => (i % 2 ? leave(S, a, t + 0.1, -1) : down(S, a, t + 0.15, 'fall')));
    S.at(t + 0.4, () => alive().forEach((a) => { S.go(a, a.look.form === 'human' ? 'guard' : { rear: 0, lunge: 0 }, 0.4); S.go(a, { x: a.home }, 0.4); }));
  }
}

/* ---------- 전쟁: 작은 병사들의 두 줄 ---------- */
function buildWar(S, sp) {
  const ours = Math.max(1, sp.ours ?? 100), theirs = Math.max(1, sp.theirs ?? 100), share = ours / (ours + theirs);
  const n1 = Math.round(clamp(8 + share * 36, 9, 33)), n2 = Math.round(clamp(8 + (1 - share) * 36, 9, 33));
  const W = S.war = { units: [], banners: [], line: 320, sparks: 0, torch: sp.plan === 'night' };
  const mk = (n, side) => {
    for (let i = 0; i < n; i++) {
      const row = i % 3, col = Math.floor(i / 3);
      const x = side > 0 ? 236 - col * 18 - row * 6 : 404 + col * 18 + row * 6;
      W.units.push({ x: x + (S.rnd() - 0.5) * 5, y: GY - 16 + row * 13, side, tx: null, sp: 60, st: 'stand', ph: S.rnd() * 6, home: x, row, col, spear: i % 4 !== 3 });
    }
    for (const c of [0.25, 0.75]) W.banners.push({ side, x: side > 0 ? 236 - n / 3 * 18 * c : 404 + n / 3 * 18 * c, home: 0, up: 1 });
  };
  mk(n1, 1); mk(n2, -1);
  const U = (side) => W.units.filter((u) => u.side === side && u.st !== 'dead');
  const walls = sp.plan === 'walls'; S.wall = walls;
  if (walls) { // 우리 편은 성벽 위에 선다
    W.units = W.units.filter((u) => u.side < 0 || u.row < 2);
    for (const u of U(1)) { u.x = u.home = 14 + u.col * 15 + u.row * 7; u.y = GY - 58; u.onWall = true; u.st = 'brace'; }
    W.banners = W.banners.filter((b) => b.side < 0);
  }
  if (sp.plan === 'night') S.night = 1;
  if (!sp.plan) return;
  const { plan, outcome } = sp;
  const march = (side, tx, speed, st = 'march') => { for (const u of U(side)) if (!u.onWall) { u.tx = tx - side * (u.col * 11 + u.row * 4) * 0.8; u.sp = speed * (0.85 + S.rnd() * 0.3); u.st = st; } };
  const volley = (t, from, to) => S.at(t, () => S.emit({ type: 'arrows', x: from, y: GY - 40, tx: to, ty: GY - 8, h: 80, set: Array.from({ length: 16 }, () => [(S.rnd() - 0.5) * 90, S.rnd() * 0.2]), life: 0.9 }));
  const fallSome = (t, side, frac) => S.at(t, () => { const us = U(side); for (const u of us) if (S.rnd() < frac) { u.st = 'dead'; u.tx = null; } });
  let line = 320, tClash = 1.0;
  if (plan === 'charge') { S.at(0.05, () => { march(1, 318, 190, 'run'); march(-1, 324, 120); }); line = 320; }
  else if (plan === 'flank') {
    S.at(0.05, () => { march(1, 312, 120); march(-1, 328, 120); for (const u of U(1).filter((u) => u.col >= 4)) { u.rider = true; u.tx = 560; u.y -= 16 + u.row * 3; u.sp = 330; u.st = 'run'; } });
    S.at(1.2, () => { for (const u of U(1).filter((u) => u.rider)) { u.y += 14; u.tx = 470; } S.dust(520, 5); });
    fallSome(1.5, -1, outcome === 'lose' ? 0.08 : 0.22);
  } else if (plan === 'hold') {
    line = 262; S.at(0.05, () => { for (const u of U(1)) u.st = 'brace'; march(-1, 270, 150); });
    volley(0.2, 180, 420); volley(0.7, 180, 350); fallSome(0.95, -1, 0.14); fallSome(1.3, -1, 0.1); tClash = 1.3;
  } else if (plan === 'night') {
    line = 396; S.at(0.05, () => march(1, 392, 240, 'run')); tClash = 0.85; fallSome(0.95, -1, outcome === 'lose' ? 0.05 : 0.2);
  } else if (plan === 'walls') {
    line = 176; S.at(0.05, () => march(-1, 186, 150));
    volley(0.2, 120, 420); volley(0.65, 120, 330); volley(1.1, 120, 260); volley(1.6, 120, 220);
    fallSome(0.9, -1, 0.12); fallSome(1.4, -1, 0.12); fallSome(1.9, -1, 0.1); tClash = 1.25;
  }
  S.at(tClash, () => { W.line = line; W.sparks = 1; S.jolt(6); S.dust(line, 6); for (const u of W.units) if (u.st !== 'dead' && !u.onWall && Math.abs(u.x - line) < 90) u.st = 'fight'; });
  // 싸우는 동안 양쪽에서 쓰러진다
  const lossO = outcome === 'win' ? 0.07 : outcome === 'lose' ? 0.16 : 0.11, lossT = outcome === 'win' ? 0.16 : outcome === 'lose' ? 0.07 : 0.11;
  for (const dt of [0.35, 0.75, 1.15]) { fallSome(tClash + dt, 1, lossO); fallSome(tClash + dt, -1, lossT); S.at(tClash + dt, () => { S.dust(line + (S.rnd() - 0.5) * 60, 3); S.jolt(2.5); }); }
  const tEnd = tClash + 1.5;
  S.at(tEnd, () => {
    W.sparks = 0;
    const rout = (side) => { for (const u of U(side)) { u.st = 'flee'; u.tx = side > 0 ? -60 : SW + 60; u.sp = 150 + S.rnd() * 80; u.onWall = false; } for (const b of W.banners) if (b.side === side) b.fall = true; };
    const back = (side) => { for (const u of U(side)) { if (u.onWall) continue; u.st = 'march'; u.tx = (side > 0 ? line - 44 : line + 44) - side * (u.col * 11 + u.row * 4); u.sp = 70; } };
    if (outcome === 'win') { rout(-1); for (const u of U(1)) if (!u.onWall) { u.st = 'cheer'; u.tx = null; } }
    else if (outcome === 'lose') { rout(1); for (const u of U(-1)) { u.st = 'cheer'; u.tx = null; } }
    else { back(1); back(-1); }
  });
  S.end = Math.max(S.end, tEnd + 1.6);
}
function stepWar(S, dt) {
  const W = S.war;
  for (const u of W.units) {
    if (u.tx != null) { const d = u.tx - u.x, mv = Math.sign(d) * Math.min(Math.abs(d), u.sp * dt); u.x += mv; if (Math.abs(d) < 1) { u.tx = null; if (u.st === 'march' || u.st === 'run') u.st = 'stand'; } }
    if (u.st === 'flee') u.a = Math.max(0, (u.a ?? 1) - dt * 0.5);
    if (u.st === 'dead') u.d = Math.min(1, (u.d ?? 0) + dt * 4);
  }
  for (const b of W.banners) {
    const mine = W.units.filter((u) => u.side === b.side && u.st !== 'dead' && !u.rider && !u.onWall);
    if (mine.length) { const cx = mine.reduce((s, u) => s + u.x, 0) / mine.length; b.x += (cx + (b.home ||= b.x - cx) - b.x) * Math.min(1, dt * 4); }
    if (b.fall) b.up = Math.max(0, b.up - dt * 1.6);
  }
  if (W.sparks && S.rnd() < dt * 16) { const x = W.line + (S.rnd() - 0.5) * 70, y = GY - 22 + S.rnd() * 26; S.sparks(x, y, 3); }
}
function drawWar(c, S) {
  const W = S.war; c.lineCap = 'round';
  const col = { 1: ['#1c2028', '#9a7a3c'], '-1': ['#2a201e', '#7a2c26'] };
  for (const b of W.banners) {
    const [body, acc] = col[b.side], top = GY - 16 - 46 * b.up, lean = (1 - b.up) * 30 * b.side;
    c.strokeStyle = body; c.lineWidth = 1.6; c.beginPath(); c.moveTo(b.x, GY - 10); c.lineTo(b.x - lean, top); c.stroke();
    if (b.up > 0.2) { const w = Math.sin(S.t * 5 + b.x) * 2; c.fillStyle = acc; c.beginPath(); c.moveTo(b.x - lean, top); c.lineTo(b.x - lean - b.side * 16, top + 4 + w); c.lineTo(b.x - lean - b.side * 13, top + 9 + w); c.lineTo(b.x - lean, top + 12); c.closePath(); c.fill(); }
  }
  for (const u of [...W.units].sort((p, q) => p.y - q.y)) {
    const [body, acc] = col[u.side], a = u.a ?? 1; if (a <= 0.02) continue;
    c.globalAlpha = a;
    const moving = u.tx != null, Z = 1.3, face = u.st === 'flee' ? -u.side : u.side, bob = moving ? Math.abs(Math.sin(S.t * 11 + u.ph)) * 1.6 : 0;
    const jit = u.st === 'fight' ? Math.sin(S.t * 13 + u.ph) * 2.2 : 0;
    const x = u.x + jit, y = u.y - bob;
    c.save(); c.translate(x, u.y); c.scale(Z, Z); c.translate(-x, -u.y);
    if (u.st === 'dead') { const d = u.d ?? 1; c.strokeStyle = body; c.lineWidth = 3.4; c.beginPath(); c.moveTo(x, u.y - 2 - (1 - d) * 8); c.lineTo(x - face * 8 * d, u.y - 1); c.stroke(); c.restore(); c.globalAlpha = 1; continue; }
    if (u.rider) { c.fillStyle = body; c.beginPath(); c.ellipse(x, y - 7, 8, 3.6, 0, 0, 6.3); c.fill(); c.strokeStyle = body; c.lineWidth = 1.6; const g = Math.sin(S.t * 16 + u.ph) * 3; c.beginPath(); c.moveTo(x - 5, y - 5); c.lineTo(x - 6 - g, y); c.moveTo(x + 5, y - 5); c.lineTo(x + 6 + g, y); c.moveTo(x + face * 7, y - 9); c.lineTo(x + face * 11, y - 13); c.stroke(); }
    const by = u.rider ? y - 9 : y;
    c.strokeStyle = body; c.lineWidth = 3.4; c.beginPath(); c.moveTo(x, by); c.lineTo(x + face * (moving ? 1.5 : 0.5), by - 9); c.stroke();
    if (!u.rider) { c.lineWidth = 1.8; const s = moving ? Math.sin(S.t * 11 + u.ph) * 2.6 : 1.4; c.beginPath(); c.moveTo(x, by - 1); c.lineTo(x - s, by + 2); c.moveTo(x, by - 1); c.lineTo(x + s, by + 2); c.stroke(); }
    c.fillStyle = body; c.beginPath(); c.arc(x + face * 1, by - 12, 2.3, 0, 6.3); c.fill();
    c.fillStyle = acc; c.beginPath(); c.arc(x + face * 2.4, by - 6, 1.9, 0, 6.3); c.fill();
    // 창이나 칼
    const up = u.st === 'cheer' ? -1.5 + Math.sin(S.t * 6 + u.ph) * 0.2 : u.st === 'fight' ? -0.3 + Math.sin(S.t * 9 + u.ph) * 0.7 : u.st === 'brace' ? -0.25 : moving ? -0.9 : -1.35;
    const len = u.spear ? 15 : 8;
    c.strokeStyle = u.spear ? '#1a1612' : '#aab0b6'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x + face * 2, by - 7); c.lineTo(x + face * (2 + Math.cos(up) * len), by - 7 + Math.sin(up) * len); c.stroke();
    c.restore();
    c.globalAlpha = 1;
  }
  if (W.torch) for (let i = 0; i < 4; i++) orb(c, 440 + i * 46, GY - 30 + (i % 2) * 14, 16 + Math.sin(S.t * 9 + i) * 2, '#ff9a40', 0.75);
}
function drawWall(c) {
  c.fillStyle = '#2a2622'; c.fillRect(-8, GY - 58, 190, 70);
  for (let x = 0; x < 180; x += 16) c.fillRect(x, GY - 66, 9, 9);
  c.fillRect(150, GY - 84, 34, 96); for (let x = 150; x < 184; x += 12) c.fillRect(x, GY - 92, 7, 9);
  c.fillStyle = 'rgba(214,200,176,.12)'; c.fillRect(-8, GY - 58, 190, 1.4); c.fillRect(182.6, GY - 84, 1.4, 96);
  c.fillStyle = '#141210'; c.fillRect(162, GY - 60, 5, 12);
}

/* ---------- 무대 만들기 ---------- */
const BUILD = { duel: buildDuel, fight: buildFight, war: buildWar };
function makeStage(spec) {
  const S = new Stage(hashStr(JSON.stringify(spec)) || 7);
  BUILD[spec.kind]?.(S, spec);
  return S;
}
const reduced = () => safe(() => !document.documentElement.classList.contains('motion') && matchMedia('(prefers-reduced-motion: reduce)').matches, false) || safe(() => JSON.parse(localStorage.getItem('fantasy-life:prefs') ?? '{}').motion === 'reduce', false);

/** host 안에 캔버스를 넣고 spec대로 연출을 튼다. 돌려주는 값: 멈추는 함수 */
export function battleDemo(host, spec, { still = false } = {}) {
  if (!hasDom || !host || !BUILD[spec?.kind]) return () => {};
  css();
  const S = makeStage(spec);
  host.classList.add('fl-battle'); host.querySelector('.fl-battle-cv')?.remove(); host.appendChild(S.canvas);
  S.fit(); S.play(still || reduced());
  return () => S.stop();
}

/* ---------- 게임 장면 읽기 ---------- */
let game = null;
const keep = (g) => { game = g; };
HOOKS.newGame.push(keep); HOOKS.migrate.push(keep); HOOKS.afterMonth.push(keep); (HOOKS.heir ??= []).push(keep);

const MOVE_IDS = ['heavy', 'quick', 'guard', 'feint', 'wait', 'magic', 'aura', 'yield'];
const lifeOf = (g) => g?.life ?? null;
const sceneOf = (g) => (g?.pendingEvent?.id === 'life_scene' ? lifeOf(g)?.scene : null);
function duelBase(g, d) {
  return { kind: 'duel', magic: !!d.magicDuel, lethal: !!d.lethal, seed: hashStr(String(d.foe?.name ?? '')), hurtMe: d.hp / d.hp0, hurtFoe: d.fhp / d.fhp0 };
}
function fightBase(g, s) {
  const e = s.enc ?? {};
  const comps = safe(() => companionsFor(g).length, 0);
  return { kind: 'fight', unit: e.unit, count: e.count ?? (e.leader ? 0 : 3), leader: e.leader ?? null, comps: Math.min(3, comps), mage: safe(() => circleOf(g), 0) >= 1 };
}
function warBase(g, s) {
  const m = /아군:.*?(\d+)명/.exec(String(g.pendingEvent?.text ?? ''));
  return { kind: 'war', ours: m ? +m[1] : 100, theirs: s.enemy?.troops ?? 100 };
}
/** 지금 뜬 장면의 마주 선 모습 (없으면 null) */
function standoff(g) {
  const pe = g?.pendingEvent;
  if (!pe) return null;
  if (pe.id === 'duel_round' && g.duel) return { key: `duel:${g.duel.foe?.name}:${g.duel.round}`, spec: duelBase(g, g.duel) };
  const s = sceneOf(g);
  if (s?.kind === 'fight' && s.enc) return { key: `fight:${pe.title}:${s.enc.unit}:${s.enc.count}`, spec: fightBase(g, s) };
  if (s?.kind === 'battle' && s.enemy) return { key: `war:${pe.title}:${s.enemy.troops}`, spec: warBase(g, s) };
  return null;
}
// 고르는 순간에 적어 둔다: 무엇을 골랐고, 그때 형편이 어땠나
let pend = null;
function onChoice(ev) {
  const el = ev.target?.closest?.('[data-choice]');
  if (!el) return;
  pend = null;
  const g = game, base = standoff(g);
  if (!base) return;
  const i = +el.dataset.choice, label = el.textContent ?? '';
  if (base.spec.kind === 'duel') {
    const d = g.duel;
    pend = { ...base, move: MOVE_IDS[g.pendingEvent.choiceIdx?.[i]] ?? 'heavy', pre: { hp: d.hp, fhp: d.fhp, round: d.round }, spell: /번개/.test(label) ? 'bolt' : /얼음/.test(label) ? 'ice' : 'fire' };
  } else if (base.spec.kind === 'fight') {
    const tactic = /정면/.test(label) ? 'charge' : /기습/.test(label) ? 'ambush' : /마법/.test(label) ? 'magic' : null;
    if (tactic) pend = { ...base, tactic };
  } else {
    const plan = /진격/.test(label) ? 'charge' : /측면/.test(label) ? 'flank' : /진을 치고/.test(label) ? 'hold' : /밤을 틈타/.test(label) ? 'night' : /성벽/.test(label) ? 'walls' : null;
    if (plan) pend = { ...base, plan };
  }
}
const fightResult = (t) => (/달아났|물러났|물러섰|몸을 빼|도망/.test(t) && !/적.{0,12}(달아났|흩어졌|도망)/.test(t) ? 'flee' : /쓰러뜨렸|이겼|무찔렀|흩어졌|해치웠|베어 넘겼|끝장냈|물리쳤/.test(t) ? 'victory' : /쓰러졌|졌다|패했|정신을 잃|끌려갔|빼앗겼/.test(t) ? 'defeat' : 'victory');
const warResult = (t) => (/적의 깃발이 쓰러|무너졌다\. 남은 자들|적이 먼저 진을 거두/.test(t) ? 'win' : /아군이 무너|전멸이었다|더 버틸 힘이 없/.test(t) ? 'lose' : 'draw');

/** 지금 화면에 무엇을 보여 줄까: { key, spec } 또는 null */
function decide(ev) {
  const g = game; if (!g) return null;
  const outcome = ev.querySelector('.outcome');
  const text = outcome?.textContent ?? '';
  if (outcome) {
    if (!pend) return null;
    const sp = { ...pend.spec };
    if (sp.kind === 'duel') {
      const d = g.duel;
      if (d && pend.pre) { // 결투가 이어진다: 방금 한 합의 결과
        Object.assign(sp, { move: pend.move, spell: pend.spell, end: null, dm: pend.pre.hp - d.hp > 0.01 ? 1 : 0, df: pend.pre.fhp - d.fhp > 0.01 ? 1 : 0 });
        return { key: `duelr:${pend.key}`, spec: sp };
      }
      const end = pend.move === 'yield' ? 'yield' : /무릎을 꿇었다/.test(text) ? 'win' : /더는 검을 들 수 없었다/.test(text) ? 'lose' : null;
      Object.assign(sp, { move: pend.move, spell: pend.spell, end, df: end === 'win' ? 1 : 0, dm: end === 'lose' ? 1 : 0 });
    } else if (sp.kind === 'fight') Object.assign(sp, { tactic: pend.tactic, result: safe(() => fightResult(text), 'victory'), wounded: /부상:/.test(text) });
    else Object.assign(sp, { plan: pend.plan, outcome: warResult(text) });
    return { key: 'out:' + pend.key, spec: sp };
  }
  const base = standoff(g);
  if (!base) return null;
  return base;
}

/* ---------- 화면에 얹기 ---------- */
let cur = null; // { key, stage }
let styled = false;
function css() {
  if (styled || !hasDom) return; styled = true;
  const st = document.createElement('style');
  st.textContent = `.fl-battle{position:relative;height:auto!important;aspect-ratio:${SW}/${SH};overflow:hidden}
.fl-battle::after{display:none!important}
.fl-battle-cv{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1}`;
  document.head.appendChild(st);
}
function drop() { if (cur) { cur.stage.stop(); cur.stage.canvas.remove(); cur = null; } }
function refresh() {
  const ev = document.querySelector('.overlay .event');
  if (!ev) { drop(); pend = null; return; }
  const plan = safe(() => decide(ev));
  if (!plan) { drop(); return; }
  css();
  let art = ev.querySelector('.ev-art');
  if (!art) { art = document.createElement('div'); art.className = 'ev-art'; art.setAttribute('aria-hidden', 'true'); ev.prepend(art); }
  art.classList.add('fl-battle');
  const fresh = cur?.key !== plan.key;
  if (fresh) { drop(); cur = { key: plan.key, stage: makeStage(plan.spec) }; }
  if (cur.stage.canvas.parentNode !== art) art.appendChild(cur.stage.canvas);
  cur.stage.fit();
  if (fresh) cur.stage.play(reduced());
}
function init() {
  document.addEventListener('click', onChoice, true);
  const watch = () => {
    const app = document.getElementById('app');
    if (!app) return;
    let queued = false;
    new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(() => { queued = false; safe(refresh); }); } }).observe(app, { childList: true });
    window.addEventListener('resize', () => safe(() => cur?.stage.fit()));
    safe(refresh);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
}
if (hasDom) init();
