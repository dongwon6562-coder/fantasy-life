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
//   결투 { kind: 'duel', magic, move, dm(내가 맞음), df(상대가 맞음), end: 'win'|'lose'|'yield', lethal, hurtMe, hurtFoe(0~1), foe: { unit },
//          spell(계열: fire water ice wind bolt earth light shadow life mind), foeMove, blade(마검 빛깔), ground }
//   교전 { kind: 'fight', unit, count, leader, comps, mage, tactic: 'charge'|'ambush'|'magic', result: 'victory'|'defeat'|'flee', wounded }
//   전쟁 { kind: 'war', ours, theirs, plan: 'charge'|'flank'|'hold'|'night'|'walls', outcome: 'win'|'lose'|'draw' }
//   move/tactic/plan을 빼면 마주 선 모습만 그린다. back(풍경 그림 주소)을 주면 그 고장 풍경을 뒤에 깐다.
// 46단계: 몸 그림(battleFigure), 몸짓(battleMoves), 주문(battleSpell), 배경(battleBack)으로 나눠 새로 그렸다.
import { HOOKS } from '../hooks.js';
import { circleOf } from '../game.js';
import { companionsFor, skirmishView } from '../adventure/fight.js';
import { battleView } from '../war/battle.js';
import { MOVE_IDS } from '../duel/duel.js';
import { sceneImage } from './scene.js';
import { SW, SH, GY, POSE, EASE, lerp, clamp, lookOf, HERO, MAGE, ALLY, drawFx, orb } from './battleKit.js';
import { drawActor, trail } from './battleFigure.js';
import { makeBack } from './battleBack.js';
import { strike, wound, down, leave, disarm } from './battleMoves.js';
import { cast, ward, schoolOf, SCHOOL } from './battleSpell.js';

const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';
const safe = (fn, fb = null) => { try { return fn(); } catch { return fb; } };
const mkRnd = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const hashStr = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
const CX = SW / 2, CY = SH / 2;

/* ---------- 무대 ---------- */
class Stage {
  constructor(seed = 1, back = null) {
    this.canvas = document.createElement('canvas'); this.canvas.className = 'fl-battle-cv'; this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d');
    this.actors = []; this.fx = []; this.cues = []; this.tweens = []; this.ghosts = []; this.t = 0; this.end = 0; this.shake = 0;
    this.night = 0; this.war = null; this.raf = 0; this.rnd = mkRnd(seed); this.last = 0; this.wall = false;
    this.cam = { x: CX, y: CY, z: 1 }; this.slowT = 0; this.slowRate = 1; this.white = 0;
    this.back = back ?? makeBack({ seed });
    this.back.onready = () => { if (!this.raf && this.canvas.isConnected) this.draw(); };
  }
  add(look, x, face, pose = 'guard', o = {}) {
    const a = { look, x, y: GY + (o.dy ?? 0), face, st: { ...POSE.stand, ...(POSE[pose] ?? {}), fall: 0, alpha: 1, lunge: 0, rear: 0, gait: 0, bite: 0, power: 0, nod: 0 }, seed: this.rnd() * 9, lit: -face, t: 0, scale: o.scale ?? 1, blade: null, home: x, px: x, vx: 0 };
    this.actors.push(a); return a;
  }
  pose(name) { return { ...POSE[name] }; }
  at(t, fn) { // 때 순서대로 끼워 넣는다 (연출 도중에 걸어도 차례가 맞게)
    let i = this.cues.length; while (i > 0 && this.cues[i - 1][0] > t) i--;
    this.cues.splice(i, 0, [t, fn]); this.end = Math.max(this.end, t + 0.05);
  }
  /** 자세나 자리를 dur초에 걸쳐 바꾼다. target: 자세 이름이나 값 묶음 ({ x, fall, alpha, lean ... }) */
  go(a, target, dur = 0.2, ease = 'out') {
    const tg = typeof target === 'string' ? POSE[target] : target;
    for (const k in tg) {
      const own = k === 'x' || k === 'y';
      this.tweens = this.tweens.filter((w) => !(w.a === a && w.k === k));
      this.tweens.push({ a, k, own, from: (own ? a : a.st)[k] ?? 0, to: tg[k], t0: this.t, dur: Math.max(0.001, dur), ease: EASE[ease] ?? EASE.out });
    }
    this.end = Math.max(this.end, this.t + dur);
  }
  /** 아무 값 묶음(카메라 따위)을 dur초에 걸쳐 바꾼다 */
  tw(obj, props, dur = 0.2, ease = 'out') {
    for (const k in props) { this.tweens = this.tweens.filter((w) => !(w.a === obj && w.k === k)); this.tweens.push({ a: obj, k, own: true, from: obj[k] ?? 0, to: props[k], t0: this.t, dur: Math.max(0.001, dur), ease: EASE[ease] ?? EASE.out }); }
    this.end = Math.max(this.end, this.t + dur);
  }
  emit(e) { e.t0 = this.t; e.life ??= 0.3; if (this.fx.length >= 220) this.fx.shift(); this.fx.push(e); if (!e.keep) this.end = Math.max(this.end, this.t + e.life); }
  sparks(x, y, n = 8, color) { for (let i = 0; i < n; i++) { const an = this.rnd() * 6.283, v = 80 + this.rnd() * 220; this.emit({ type: 'spark', x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 60, life: 0.22 + this.rnd() * 0.3, color }); } }
  chips(x, y, dir, n = 6, color) { for (let i = 0; i < n; i++) this.emit({ type: 'chip', x, y, vx: dir * (30 + this.rnd() * 120) + (this.rnd() - 0.5) * 40, vy: -50 - this.rnd() * 110, r: 1.4 + this.rnd() * 1.8, color, life: 0.5 + this.rnd() * 0.3 }); }
  dust(x, n = 3, color) { for (let i = 0; i < n; i++) this.emit({ type: 'dust', x: x + (this.rnd() - 0.5) * 26, y: GY - 2, vx: (this.rnd() - 0.5) * 34, r: 9 + this.rnd() * 11, life: 0.6 + this.rnd() * 0.4, color: color ?? this.back.tone.ground }); }
  jolt(v) { this.shake = Math.max(this.shake, v); }
  /** 맞는 순간 시간이 잠깐 느려진다 */
  hitstop(d = 0.08, rate = 0.08) { if (d > this.slowT) { this.slowT = d; this.slowRate = rate; } }
  /** 맞은 자리로 화면이 훅 다가갔다 돌아온다 */
  punch(x, y, z = 1.06, dur = 0.36) { this.tw(this.cam, { x: lerp(CX, x, 0.55), y: lerp(CY, y, 0.45), z }, 0.05, 'out'); this.at(this.t + 0.07, () => this.tw(this.cam, { x: CX, y: CY, z: 1 }, dur, 'io')); }
  whiteout(a = 0.4) { this.white = Math.max(this.white, a); }
  /** 잔상: 지금 모습을 잠깐 남긴다 */
  ghost(a) { this.ghosts.push({ a: { ...a, st: { ...a.st }, trail: null, swing: false, blade: null }, t0: this.t, life: 0.26 }); }
  /** 뛰어드는 몸 뒤로 스치는 선 */
  speed(a, f) { const sc = a.scale ?? 1; this.at(this.t + 0.04, () => { for (let i = 0; i < 4; i++) this.emit({ type: 'streak', x: a.x - f * (16 + this.rnd() * 24) * sc, y: a.y - (14 + this.rnd() * 60) * sc, vx: f * 40, len: (20 + this.rnd() * 22) * sc * f, a: 0.34, w: 1, life: 0.16 + this.rnd() * 0.08 }); }); }

  step(dt) {
    const real = dt;
    if (this.slowT > 0) { this.slowT -= real; dt *= this.slowRate; }
    this.t += dt;
    while (this.cues.length && this.cues[0][0] <= this.t) { const [, fn] = this.cues.shift(); safe(fn); }
    for (const w of this.tweens) { const k = clamp((this.t - w.t0) / w.dur); (w.own ? w.a : w.a.st)[w.k] = lerp(w.from, w.to, w.ease(k)); w.done = k >= 1; }
    this.tweens = this.tweens.filter((w) => !w.done);
    this.fx = this.fx.filter((e) => this.t - e.t0 < e.life);
    this.ghosts = this.ghosts.filter((g) => this.t - g.t0 < g.life);
    this.shake *= Math.exp(-real * 9); this.white *= Math.exp(-real * 7);
    if (this.war) stepWar(this, dt);
    for (const a of this.actors) { a.t = this.t; if (dt > 0) a.vx = lerp(a.vx, (a.x - a.px) / dt, 0.35); a.px = a.x; }
  }
  draw() {
    const c = this.ctx, cv = this.canvas, k = cv.width / SW, T = this.back.tone;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    const sh = this.shake > 0.3 ? this.shake : 0, sx = (this.rnd() - 0.5) * sh * k, sy = (this.rnd() - 0.5) * sh * k;
    const view = (z, px) => { // 카메라: (x, y)를 가운데 두고 z배. 가장자리 밖이 보이지 않게 잡아 둔다
      const x = clamp(lerp(CX, this.cam.x, px), CX / z, SW - CX / z), y = clamp(lerp(CY, this.cam.y, px), CY / z, SH - CY / z);
      c.setTransform(k * z, 0, 0, k * z, k * (CX - x * z) + sx * px, k * (CY - y * z) + sy * px);
    };
    const z = Math.max(1, this.cam.z);
    view(1 + (z - 1) * 0.6 + (sh ? 0.02 : 0), 0.6);
    this.back.draw(c, cv.width, cv.height);
    view(z + (sh ? 0.02 : 0), 1);
    if (this.night) { c.fillStyle = `rgba(8,12,30,${0.5 * this.night})`; c.fillRect(-20, -20, SW + 40, SH + 40); }
    if (this.dusk) { const dg = c.createLinearGradient(0, 0, 0, SH); dg.addColorStop(0, 'rgba(255,128,56,0.34)'); dg.addColorStop(0.55, 'rgba(210,96,60,0.16)'); dg.addColorStop(1, 'rgba(36,20,52,0.34)'); c.fillStyle = dg; c.fillRect(-20, -20, SW + 40, SH + 40); }
    if (this.wall) drawWall(c);
    if (this.war) drawWar(c, this);
    for (const g of this.ghosts) { const q = 1 - (this.t - g.t0) / g.life; g.a.st.alpha = 0.34 * q; g.a.light = T.light; drawActor(c, g.a); }
    const order = [...this.actors].sort((p, q) => p.y - q.y);
    for (const a of order) { a.light = T.light; drawActor(c, a); }
    for (const a of order) trail(c, a, this.t);
    if (this.torch) { const fl = 1 + Math.sin(this.t * 11) * 0.08; orb(c, this.torch.x, this.torch.y, 120 * fl, '#ff9a40', 0.34); orb(c, this.torch.x, this.torch.y, 16 * fl, '#ffd9a0', 0.9); }
    for (const e of this.fx) drawFx(c, e, clamp((this.t - e.t0) / e.life));
    c.setTransform(k, 0, 0, k, 0, 0);
    this.back.front(c);
    if (this.white > 0.02) { c.fillStyle = `rgba(255,248,236,${Math.min(0.8, this.white)})`; c.fillRect(0, 0, SW, SH); }
  }
  fit() {
    const cv = this.canvas, w = cv.clientWidth || cv.parentNode?.clientWidth || 360;
    const dpr = Math.min(2, window.devicePixelRatio || 1), pw = Math.round(w * dpr);
    if (cv.width !== pw) { cv.width = pw; cv.height = Math.round(pw * SH / SW); }
    this.draw();
  }
  /** t초까지 돌려 그 순간을 그린다 (견본·점검용) */
  seek(t) { let guard = 0; while (this.t < t && guard++ < 4000) this.step(1 / 120); this.draw(); }
  /** 연출을 튼다. still이면 움직이지 않고 끝난 모습만 */
  play(still = false) {
    if (still) { let guard = 0; while ((this.cues.length || this.tweens.length) && guard++ < 900) this.step(0.05); this.fx = []; this.ghosts = []; this.shake = 0; this.white = 0; this.slowT = 0; this.cam = { x: CX, y: CY, z: 1 }; for (const a of this.actors) { a.swing = false; a.blade = null; } this.step(0.05); this.draw(); return; }
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

/* ---------- 결투 ---------- */
const FOE_SCHOOLS = ['fire', 'shadow', 'ice', 'wind', 'earth', 'bolt'];
function buildDuel(S, sp) {
  const magic = !!sp.magic, seed = sp.seed ?? 0, Z = 1.9;
  const foeLook = sp.foe?.unit ? lookOf(sp.foe.unit) : magic
    ? { ...MAGE, body: ['#3a2434', '#2c3a34', '#3a3226'][seed % 3], accent: ['#7a2a4a', '#3a6a5a', '#8a6a2a'][seed % 3], glow: SCHOOL[FOE_SCHOOLS[seed % FOE_SCHOOLS.length]].color }
    : { form: 'human', s: 1.02, bulk: 1.02, body: ['#5a3a34', '#44464e', '#4a5238', '#54463a'][seed % 4], weapon: seed % 7 === 3 ? 'axe' : 'sword', cloak: seed % 2 === 0, accent: ['#8a3a30', '#5a5a6a', '#5e6a3e', '#7a5a34'][seed % 4], helm: seed % 3 === 0, armor: seed % 3 !== 1, hair: ['#2a2018', '#6a4a2a', '#1c1614', '#8a8478'][(seed >> 2) % 4], shield: seed % 5 === 4 };
  const big = (foeLook.form !== 'human' ? Math.max(0, (foeLook.s ?? 1) - 1.2) : 0) * 30;
  const me = S.add(magic ? MAGE : { ...HERO, ...(sp.hero ?? {}) }, magic ? 176 : 226, 1, 'guard', { scale: magic ? 1.75 : Z }), foe = S.add(foeLook, (magic ? 464 : 414) + big, -1, 'guard', { scale: foeLook.form !== 'human' ? Z * 0.8 : magic ? 1.75 : Z });
  const tired = (a, r) => { if (r < 0.5) { a.st.lean += 9; a.st.crouch += 0.1; } };
  tired(me, sp.hurtMe ?? 1); tired(foe, sp.hurtFoe ?? 1);
  if (!sp.move) return;
  const { move, dm, df } = sp, winBlow = sp.end === 'win' && !!df, loseBlow = sp.end === 'lose' && !!dm;
  const fSchool = FOE_SCHOOLS[seed % FOE_SCHOOLS.length], mSchool = schoolOf(sp.spell, move === 'quick' ? 'ice' : move === 'feint' ? 'wind' : move === 'guard' ? 'light' : 'fire');
  const fKind = ['heavy', 'quick', 'feint'].includes(sp.foeMove) ? sp.foeMove : sp.foeMove ? 'heavy' : seed % 3 === 1 ? 'quick' : 'heavy';
  let tEnd = 1.3;
  if (move === 'yield') { S.at(0.1, () => { S.go(me, 'lower', 0.5, 'io'); S.go(me, { x: me.x - 16 }, 0.5, 'io'); }); S.at(0.6, () => S.go(foe, 'lower', 0.5, 'io')); return; }
  if (magic) {
    // 마법사끼리: 주문이 오가고 결계가 막는다
    let t = 0.1;
    if (move === 'wait') { S.at(0.1, () => { S.go(me, 'invoke', 0.4); S.go(me, { power: 1 }, 0.5); S.emit({ type: 'rune', x: me.x, y: GY, r: 40, life: 1.1, color: SCHOOL[mSchool].color }); for (let i = 0; i < 10; i++) S.at(S.t + i * 0.05, () => S.emit({ type: 'ember', x: me.x + (S.rnd() - 0.5) * 80, y: GY - 10 - S.rnd() * 30, vx: 0, vy: -50, r: 5, color: SCHOOL[mSchool].color, life: 0.9 })); }); t = 0.3; }
    else if (move === 'guard') { S.at(0.08, () => S.go(me, 'push', 0.2)); ward(S, me, 0.1, '#a8d0ff', 1.3); t = 0.2; }
    else { if (move === 'feint') S.at(0.05, () => { S.go(me, 'twist', 0.15); S.ghost(me); S.emit({ type: 'flash', x: me.x + 40, y: GY - 110, r: 22, life: 0.2, color: SCHOOL[mSchool].color }); }); t = cast(S, me, foe, move === 'feint' ? 0.3 : 0.1, mSchool, df ? 'hit' : 'ward', { big: move === 'heavy', final: winBlow }) + 0.15; }
    if (dm) t = cast(S, foe, me, move === 'guard' || move === 'wait' ? 0.2 : Math.max(0.3, t - 0.3), fSchool, 'hit', { final: loseBlow }) + 0.2;
    else if (move === 'guard' || move === 'wait') t = cast(S, foe, me, 0.2, fSchool, move === 'guard' ? 'ward' : 'hit', {}) + 0.2;
    if (move === 'guard' && df) t = cast(S, me, foe, t, 'light', 'hit', { final: winBlow }) + 0.15;
    tEnd = t + 0.3;
  } else {
    const mKind = move === 'quick' ? 'quick' : move === 'feint' ? 'feint' : move === 'aura' ? 'aura' : 'heavy'; // finish(끝낸다)는 크게 내려친다
    const blade = sp.blade ?? (move === 'spellblade' ? SCHOOL[mSchool].color : null); // 마검: 칼에 주문 빛이 실린다
    if (move === 'dodge' || move === 'block') { // 결정적 순간(상대 쪽): 몸을 던져 피하거나 칼로 받아 낸다
      S.at(0.04, () => S.go(me, move === 'block' ? 'parry' : { ...S.pose('guard'), crouch: 0.4 }, 0.14, 'out'));
      const tc = strike(S, foe, me, 0.12, move === 'dodge' ? 'heavy' : 'feint', dm ? 'hit' : move === 'dodge' ? 'miss' : 'block', { final: loseBlow || !!dm });
      tEnd = tc + 0.8;
    } else if (move === 'disarm') { // 결정적 순간(내 쪽): 칼을 쳐서 떨군다
      const ok = sp.endKind === 'disarm' || (df && sp.end === 'win');
      const tc = strike(S, me, foe, 0.1, 'feint', ok ? 'block' : dm ? 'miss' : 'block', { noReset: true });
      if (ok) disarm(S, foe, tc, 1);
      tEnd = tc + 0.8;
      if (dm) tEnd = strike(S, foe, me, tc + 0.2, fKind, 'hit', { final: loseBlow }) + 0.6;
    } else if (move === 'wait') { // 거리를 벌리고 숨을 고른다. 상대가 찔러 본다
      S.at(0.08, () => { S.go(me, { x: me.x - 30 }, 0.4, 'io'); S.go(me, 'parry', 0.3); S.dust(me.x, 1); });
      const tc = strike(S, foe, me, 0.3, 'quick', dm ? 'hit' : 'miss', { final: loseBlow });
      tEnd = tc + 0.75;
    } else if (move === 'guard') { // 받아 내고, 틈이 보이면 되받아친다
      S.at(0.05, () => S.go(me, 'parry', 0.16, 'out'));
      const tc = strike(S, foe, me, 0.14, fKind, dm ? 'hit' : 'block', { final: loseBlow, noReset: true });
      tEnd = tc + 0.7;
      if (df) tEnd = strike(S, me, foe, tc + 0.16, 'quick', 'hit', { final: winBlow }) + 0.6;
    } else if (move === 'magic') { // 마검사: 칼을 든 채 주문
      const tc = cast(S, me, foe, 0.08, mSchool, df ? 'hit' : 'ward', { final: winBlow });
      tEnd = tc + 0.6;
      if (dm) tEnd = strike(S, foe, me, tc + 0.1, fKind, 'hit', { final: loseBlow }) + 0.6;
    } else {
      if (blade) S.at(0.02, () => { me.blade = blade; S.emit({ type: 'rune', x: me.x, y: GY, r: 36, life: 0.6, color: blade }); });
      const tc = strike(S, me, foe, 0.1, mKind, df ? 'hit' : dm ? 'miss' : 'block', { final: winBlow || (move === 'finish' && !!df), noReset: !!dm, color: blade ?? undefined });
      if (blade && df) S.at(tc, () => { const [cx, cy] = foe.chest ?? [foe.x, GY - 80]; S.emit({ type: 'ring', x: cx, y: cy, r: 60, life: 0.4, color: blade }); for (let i = 0; i < 10; i++) S.emit({ type: 'ember', x: cx, y: cy, vx: (S.rnd() - 0.3) * 130, vy: -30 - S.rnd() * 80, r: 5 + S.rnd() * 5, color: blade, life: 0.5 + S.rnd() * 0.4 }); });
      tEnd = tc + 0.7;
      if (dm) tEnd = strike(S, foe, me, tc + (df ? 0.42 : 0.14), fKind, 'hit', { final: loseBlow }) + 0.6;
    }
  }
  // 한 합이 끝난 뒤. 끝은 여러 가지다: 무릎·칼 떨굼·물러섬·쓰러짐·판가름
  const ek = sp.endKind ?? (sp.end === 'win' ? (sp.lethal ? 'fall' : 'kneel') : sp.end === 'lose' ? (sp.lethal ? 'lose_fall' : 'lose') : null);
  S.at(tEnd, () => {
    const human = foe.look.form === 'human', rest = human ? 'lower' : { lunge: 0, rear: 0, bite: 0, crouch: 0 };
    for (const a of [me, foe]) { a.blade = null; a.swing = false; S.go(a, { x: a.home, power: 0 }, 0.4, 'io'); }
    if (sp.end === 'win') {
      if (ek === 'fall' || !human) down(S, foe, S.t, 'fall');
      else if (ek === 'disarm') { if (foe.look.weapon !== 'none') disarm(S, foe, S.t, 1); S.go(foe, { x: foe.home + 22 }, 0.6, 'io'); }
      else if (ek === 'retreat') { S.go(foe, 'dodge', 0.3, 'io'); S.go(foe, { x: foe.home + 70 }, 0.9, 'io'); S.at(S.t + 0.9, () => S.go(foe, 'lower', 0.5, 'io')); }
      else if (ek === 'judged') { S.go(foe, 'lower', 0.6, 'io'); S.go(foe, { x: foe.home + 14, nod: 16 }, 0.7, 'io'); }
      else down(S, foe, S.t, 'kneel');
      S.go(me, 'lower', 0.7, 'io'); S.tw(S.cam, { z: 1.07, x: CX - 20 }, 1.4, 'io');
    } else if (sp.end === 'lose') {
      if (ek === 'lose_fall') down(S, me, S.t, 'fall');
      else if (ek === 'lose_disarm') { if (me.look.weapon !== 'none') disarm(S, me, S.t, -1); S.go(me, { x: me.home - 22 }, 0.6, 'io'); }
      else if (ek === 'lose_judged') { S.go(me, 'lower', 0.6, 'io'); S.go(me, { x: me.home - 14, nod: 16 }, 0.7, 'io'); }
      else down(S, me, S.t, 'kneel');
      S.go(foe, rest, 0.7, 'io'); S.tw(S.cam, { z: 1.07, x: CX + 20 }, 1.4, 'io');
    } else { S.go(me, 'guard', 0.34, 'io'); S.go(foe, human ? 'guard' : rest, 0.34, 'io'); }
  });
}

/* ---------- 교전: 우리 편(나와 동료) 대 적 무리 ---------- */
// 46단계: 세 고비. stage 1은 마주 선 모습에서 첫 수(tactic), 2·3은 이미 뒤엉킨 자리에서 고른 수(act)를 보여 준다.
//   spec 더하기: stage(1~3), terrain(forest bridge alley snow cave field), how(pack flee charge swarm undead caster),
//                act(press terrain leader flank spell guard retreat hold), left(이 고비 뒤 남은 적 수), leaderLeft, result(끝났을 때만)
const TERRAIN_GROUND = { forest: 'grass', bridge: 'wood', alley: 'stone', snow: 'snow', cave: 'dirt', field: 'grass' };
function buildFight(S, sp) {
  const stage = sp.stage ?? 1, n = clamp(sp.count ?? 3, sp.leader ? 0 : 1, 5), comps = clamp(sp.comps ?? 0, 0, 3), how = sp.how ?? null;
  const Z = 1.42, close = stage > 1 ? 1 : 0; // 둘째 고비부터는 이미 붙어 있다
  const school = schoolOf(sp.spell);
  const us = [S.add(sp.mage && (sp.tactic === 'magic' || sp.act === 'spell') ? { ...HERO, weapon: 'staff', glow: SCHOOL[school].color } : HERO, 210 + close * 44, 1, 'guard', { scale: Z })];
  for (let i = 0; i < comps; i++) us.push(S.add({ ...ALLY, weapon: ['sword', 'spear', 'axe'][i], helm: i !== 1, shield: i === 0, body: ['#4a4e58', '#5a4a3a', '#44523e'][i], accent: ['#5a6a7a', '#7a5a34', '#5e6e4a'][i], hair: '#4a3420' }, 150 - i * 54 + close * 44, 1, 'guard', { dy: i % 2 ? -9 : 8, scale: Z }));
  const them = [];
  const unit = lookOf(sp.unit), slots = [[412, 5], [466, -9], [520, 8], [572, -7], [612, 6]];
  if (sp.leader) them.push(Object.assign(S.add(lookOf(sp.leader), (n ? 480 : 430) - close * 30, -1, 'guard', { dy: -2, scale: Z }), { boss: true }));
  for (let i = 0; i < n; i++) {
    const [x, dy] = slots[i]; let sx = (sp.leader && Math.abs(x - 480) < 30 ? x + 60 : x) - close * 34, face = -1;
    // 떼 지어 둘러싸는 무리: 셋째부터는 등 뒤로 돌아가 있다
    if (how === 'pack' && close && n >= 3 && i >= 2 && i % 2 === 0) { sx = 44 + (i - 2) * 22; face = 1; }
    if (how === 'swarm') sx -= i * 8;
    const a = S.add(unit, sx, face, 'guard', { dy, scale: Z * (0.94 + S.rnd() * 0.12) });
    if (how === 'charge' && a.look.form === 'human') { a.st.lean += 10; a.st.crouch += 0.12; } else if (how === 'charge') a.st.crouch = 0.5;
    if (how === 'undead' && a.look.form === 'human') { a.st.armA = 80; a.st.elbow = 10; a.st.lean = 14; }
    them.push(a);
  }
  them.sort((a, b) => a.x - b.x);
  if (sp.terrain === 'cave') S.torch = { x: us[0].x - 30, y: GY - 120 };
  const front = () => them.filter((a) => !a.dead && a.face < 0);
  const alive = () => them.filter((a) => !a.dead);
  const fell = (a, t) => { if (!a || a.dead) return; a.dead = true; if (how === 'flee' && !a.boss && a.look.form === 'human') leave(S, a, t, 1); else down(S, a, t, 'fall'); };
  const win = sp.result === 'victory';
  let t = 0;
  if (stage === 1) {
    if (!sp.tactic) return;
    const { tactic } = sp;
    // 첫 수
    if (tactic === 'magic') {
      const tg = them[Math.min(1, them.length - 1)];
      t = cast(S, us[0], tg, 0.1, school, 'hit', { big: true }) + 0.05;
      S.at(t, () => { S.emit({ type: 'ring', x: tg.x, y: GY - 6, r: 80, flat: 0.3, life: 0.5, color: SCHOOL[school].color }); for (const a of them) if (a !== tg && Math.abs(a.x - tg.x) < 80 && !a.boss) S.go(a, a.look.form === 'human' ? 'stagger' : { rear: 0.6 }, 0.12); });
      if (!tg.boss && them.length > 1) fell(tg, t + 0.1);
      t += 0.25;
    } else if (tactic === 'ambush') {
      for (const a of us) { a.x -= 170; a.st.alpha = 0; }
      S.at(0.05, () => us.forEach((a, i) => { S.go(a, 'run', 0.1); S.go(a, { x: a.home + 90, alpha: 1 }, 0.32 + i * 0.05, 'out'); }));
      const tg = them[0];
      S.at(0.3, () => us.forEach((a) => (a.home += 90)));
      t = strike(S, us[0], tg, 0.36, 'quick', 'hit', { stay: true });
      if (!tg.boss && them.length > 1) fell(tg, t + 0.05);
      t += 0.2;
    } else {
      S.at(0.05, () => { for (const a of us) { S.go(a, 'run', 0.14); S.go(a, { x: a.home + 60 }, 0.5, 'in'); a.home += 60; S.dust(a.x, 1); } for (const a of them) { if (a.look.form === 'human') S.go(a, 'run', 0.14); else S.go(a, { gait: 1 }, 0.1); S.go(a, { x: a.home - 30 }, 0.5, 'in'); a.home -= 30; } });
      S.at(0.56, () => { S.sparks(330, GY - 60, 16); S.jolt(7); S.hitstop(0.06, 0.1); S.dust(330, 6); for (const a of [...us, ...them]) S.go(a, a.look.form === 'human' ? 'guard' : { gait: 0 }, 0.14); });
      t = 0.62;
    }
  } else {
    if (!sp.act) return;
    const act = sp.act, me = us[0], F = front();
    // 이 고비에 고른 수
    if (act === 'spell') {
      const tg = F[Math.min(1, F.length - 1)] ?? alive()[0];
      if (tg) { t = cast(S, me, tg, 0.1, school, 'hit', { big: true }) + 0.1; S.at(t - 0.1, () => { for (const a of alive()) if (a !== tg && Math.abs(a.x - tg.x) < 80) S.go(a, a.look.form === 'human' ? 'stagger' : { rear: 0.6 }, 0.12); }); }
    } else if (act === 'leader') { // 우두머리에게 곧장
      const boss = them.find((a) => a.boss && !a.dead) ?? F[0];
      S.at(0.05, () => { S.go(me, 'run', 0.12); S.ghost(me); });
      if (boss) t = strike(S, me, boss, 0.14, 'heavy', sp.leaderLeft === false ? 'hit' : 'block', { final: sp.leaderLeft === false, stay: true }) + 0.2;
    } else if (act === 'flank') { // 옆으로 돌아 뒤에서
      const tg = F[F.length - 1] ?? alive()[0];
      S.at(0.05, () => { S.go(me, 'run', 0.12); S.go(me, { alpha: 0.25, y: GY - 16 }, 0.2); S.go(me, { x: (tg?.x ?? 520) + 70 }, 0.5, 'io'); });
      S.at(0.56, () => { me.face = -1; me.lit = 1; S.go(me, { alpha: 1, y: GY }, 0.12); S.dust(me.x, 3); });
      if (tg) { S.at(0.6, () => { tg.face = 1; tg.lit = -1; }); t = strike(S, me, tg, 0.62, 'quick', 'hit', { stay: true }) + 0.25; }
    } else if (act === 'guard' && us[1]) { // 동료 앞을 막아선다
      const pal = us[1], foe = F[0];
      S.at(0.05, () => { S.go(pal, { x: pal.x - 26 }, 0.3, 'io'); S.go(me, 'parry', 0.2, 'out'); });
      if (foe) t = strike(S, foe, me, 0.2, 'heavy', 'block') + 0.3;
    } else if (act === 'retreat') {
      t = 0.2;
    } else if (act === 'hold') { // 앞줄을 지키며 버틴다
      S.at(0.05, () => us.forEach((a) => S.go(a, 'parry', 0.2, 'out')));
      F.slice(0, 3).forEach((f, i) => { t = Math.max(t, strike(S, f, us[i % us.length], 0.15 + i * 0.22, 'heavy', 'block') + 0.2); });
    } else if (act === 'terrain') { // 지형을 쓴다: 한 걸음 물러 끌어들이고, 먼저 들어온 놈을 친다
      const foe = F[0], tr = sp.terrain;
      S.at(0.05, () => { us.forEach((a) => { S.go(a, { x: a.x - 34 }, 0.4, 'io'); a.home -= 34; }); if (tr === 'snow') { us.forEach((a) => S.go(a, { alpha: 0.2 }, 0.3)); for (let i = 0; i < 12; i++) S.emit({ type: 'smoke', x: me.x + (S.rnd() - 0.5) * 160, y: GY - S.rnd() * 90, r: 22, rise: 10, vx: 60, color: '#e8eef4', a: 0.5, life: 1 }); } if (tr === 'cave') { S.emit({ type: 'flash', x: me.x + 40, y: GY - 90, r: 90, life: 0.6, color: '#ff9a40' }); for (const a of F) S.go(a, a.look.form === 'human' ? 'dodge' : { rear: 0.6, lunge: -0.6 }, 0.3); } });
      if (foe) { S.at(0.4, () => { S.go(foe, foe.look.form === 'human' ? 'run' : { gait: 1 }, 0.1); S.go(foe, { x: foe.x - 40 }, 0.26, 'in'); us.forEach((a) => S.go(a, { alpha: 1 }, 0.14)); }); t = strike(S, me, foe, 0.6, 'heavy', 'hit', { stay: false }) + 0.25; }
    } else t = 0.05;
  }
  // 뒤엉킨 싸움: 번갈아 치고 막는다
  const rounds = sp.result ? (stage === 1 ? 4 : 2) : 2;
  if (sp.act !== 'retreat') for (let r = 0; r < rounds; r++) {
    us.forEach((a, i) => {
      const foes = alive(); if (!foes.length) return;
      const f = foes[(i + r) % foes.length], tt = t + r * 0.36 + i * 0.09, last = r === rounds - 1;
      if (f.face > 0 && i === 0) return; // 등 뒤의 놈은 뒷사람이 맡는다
      if ((r + i) % 2 === 0) strike(S, a, f, tt, i % 2 ? 'quick' : 'heavy', win && last && !f.boss ? 'hit' : 'block');
      else strike(S, f, a, tt, how === 'charge' ? 'heavy' : 'quick', sp.result === 'defeat' && last && i > 0 ? 'hit' : 'block');
    });
    if (how === 'caster' && r === 0) { const c = alive().find((a) => a.look.weapon === 'staff'); if (c) cast(S, c, us[0], t + 0.1, 'dark', sp.wounded ? 'hit' : 'ward'); }
  }
  t += (sp.act === 'retreat' ? 0 : rounds * 0.36) + 0.3;
  if (sp.wounded) S.at(t - 0.6, () => { wound(S, us[0], -1, true); S.at(S.t + 0.4, () => { if (!us[0].out) S.go(us[0], 'guard', 0.3); }); });
  // 이 고비에 쓰러진 적
  if (!sp.result && sp.left != null) { const drop = alive().filter((a) => !a.boss).slice(0, Math.max(0, alive().filter((a) => !a.boss).length - sp.left)); drop.forEach((a, i) => fell(a, t - 0.3 + i * 0.1)); if (sp.leaderLeft === false) fell(them.find((a) => a.boss), t - 0.2); }
  // 끝
  if (sp.result === 'victory') {
    alive().forEach((a, i) => { if (a.boss || (how !== 'flee' && i % 3 !== 2)) { a.dead = true; down(S, a, t + i * 0.1, 'fall'); } else { a.dead = true; leave(S, a, t + i * 0.1, 1); } });
    S.at(t + 0.5, () => us.forEach((a, i) => { S.go(a, i ? 'stand' : 'lower', 0.5, 'io'); S.go(a, { x: a.home }, 0.4, 'io'); }));
  } else if (sp.result === 'flee' || sp.act === 'retreat') {
    us.forEach((a, i) => leave(S, a, t + i * 0.06, -1, 1.2));
    S.at(t + 0.3, () => alive().forEach((a) => { S.go(a, a.look.form === 'human' ? 'cheer' : { rear: 0.4, lunge: 0 }, 0.4); S.go(a, { x: a.home }, 0.4); }));
  } else if (sp.result === 'defeat') {
    down(S, us[0], t, 'kneel');
    us.slice(1).forEach((a, i) => (i % 2 ? leave(S, a, t + 0.1, -1) : down(S, a, t + 0.15, 'kneel')));
    S.at(t + 0.4, () => alive().forEach((a) => { S.go(a, a.look.form === 'human' ? 'guard' : { rear: 0, lunge: 0 }, 0.4); S.go(a, { x: a.home }, 0.4); }));
  } else S.at(t, () => { for (const a of [...us, ...alive()]) if (!a.out) { S.go(a, a.look.form === 'human' ? 'guard' : { lunge: 0, rear: 0, bite: 0, crouch: 0, gait: 0 }, 0.3, 'io'); S.go(a, { x: a.home }, 0.34, 'io'); } });
}

/* ---------- 전쟁: 작은 병사들의 두 줄 ---------- */
// 46단계: 세 단계. stage 1 전열(작전 plan), 2 결정적 순간(moment: champ 적장 | line 흔들리는 줄), 3 해 지기 전.
//   spec 더하기: stage, moment, act(knights arrows avoid duel | send pull counter lead | push reserve retreat steady), good(이 고비가 우리 쪽으로 기울었나), outcome(끝났을 때만)
function buildWar(S, sp) {
  const ours = Math.max(1, sp.ours ?? 100), theirs = Math.max(1, sp.theirs ?? 100), share = ours / (ours + theirs), stage = sp.stage ?? 1;
  const n1 = Math.round(clamp(8 + share * 36, 9, 33)), n2 = Math.round(clamp(8 + (1 - share) * 36, 9, 33));
  const W = S.war = { units: [], banners: [], line: 320, sparks: 0, torch: sp.plan === 'night' && stage === 1 };
  const mk = (n, side, x0 = null) => {
    for (let i = 0; i < n; i++) {
      const row = i % 4, col = Math.floor(i / 4);
      const x = x0 != null ? x0 - side * (col * 18 + row * 6) : side > 0 ? 250 - col * 25 - row * 8 : 390 + col * 25 + row * 8;
      W.units.push({ x: x + (S.rnd() - 0.5) * 5, y: GY - 22 + row * 16, side, tx: null, sp: 60, st: 'stand', ph: S.rnd() * 6, home: x, row, col, spear: i % 4 !== 3 });
    }
    if (x0 == null) for (const c of [0.25, 0.75]) W.banners.push({ side, x: side > 0 ? 250 - n / 4 * 25 * c : 390 + n / 4 * 25 * c, home: 0, up: 1 });
  };
  mk(n1, 1); mk(n2, -1);
  const U = (side) => W.units.filter((u) => u.side === side && u.st !== 'dead');
  const walls = sp.plan === 'walls'; S.wall = walls;
  if (walls) { // 우리 편은 성벽 위에 선다
    W.units = W.units.filter((u) => u.side < 0 || u.row < 2);
    for (const u of U(1)) { u.x = u.home = 16 + u.col * 24 + u.row * 11; u.y = GY - 81; u.onWall = true; u.st = 'brace'; }
    W.banners = W.banners.filter((b) => b.side < 0);
  }
  if (sp.plan === 'night' && stage === 1) S.night = 1;
  if (stage === 3) { S.night = 0.2; S.dusk = true; } // 해가 기운다
  const march = (side, tx, speed, st = 'march') => { for (const u of U(side)) if (!u.onWall && !u.rider) { u.tx = tx - side * (u.col * 15 + u.row * 5) * 0.8; u.sp = speed * (0.85 + S.rnd() * 0.3); u.st = st; } };
  const volley = (t, from, to, n = 16) => S.at(t, () => S.emit({ type: 'arrows', x: from, y: S.wall ? GY - 96 : GY - 50, tx: to, ty: GY - 12, h: 90, set: Array.from({ length: n }, () => [(S.rnd() - 0.5) * 90, S.rnd() * 0.2]), life: 0.9 }));
  const fallSome = (t, side, frac) => S.at(t, () => { const us = U(side); for (const u of us) if (S.rnd() < frac) { u.st = 'dead'; u.tx = null; } });
  const riders = (t, to, y = 0) => S.at(t, () => { for (const u of U(1).filter((u) => u.col >= Math.max(2, Math.floor(n1 / 4) - 2) && !u.onWall)) { u.rider = true; u.tx = to + (S.rnd() - 0.5) * 30; u.y -= y; u.sp = 320; u.st = 'run'; } });
  let line = walls ? 252 : 320, tClash = 1.0, tEnd;
  const lineUp = () => { // 이미 맞붙은 전열
    for (const u of W.units) if (!u.onWall) { u.x = u.home = (u.side > 0 ? line - 14 : line + 14) - u.side * (u.col * 15 + u.row * 5) * 0.8; if (Math.abs(u.x - line) < 70) u.st = 'fight'; }
    for (const b of W.banners) { b.x = b.side > 0 ? line - 70 - (b.x < 200 ? 50 : 0) : line + 70 + (b.x > 440 ? 50 : 0); b.home = 0; }
    W.line = line;
  };
  if (stage === 1) {
    if (!sp.plan) return;
    const { plan } = sp, oc = sp.outcome ?? 'draw';
    if (plan === 'charge') { S.at(0.05, () => { march(1, 318, 190, 'run'); march(-1, 324, 120); }); }
    else if (plan === 'flank') {
      S.at(0.05, () => { march(1, 312, 120); march(-1, 328, 120); }); riders(0.06, 580, 34);
      S.at(1.2, () => { for (const u of U(1).filter((u) => u.rider)) { u.y += 22; u.tx = 480; } S.dust(540, 5); });
      fallSome(1.5, -1, oc === 'lose' ? 0.08 : 0.22);
    } else if (plan === 'hold') {
      line = 262; S.at(0.05, () => { for (const u of U(1)) u.st = 'brace'; march(-1, 270, 150); });
      volley(0.2, 180, 420); volley(0.7, 180, 350); fallSome(0.95, -1, 0.14); fallSome(1.3, -1, 0.1); tClash = 1.3;
    } else if (plan === 'night') {
      line = 396; S.at(0.05, () => march(1, 392, 240, 'run')); tClash = 0.85; fallSome(0.95, -1, oc === 'lose' ? 0.05 : 0.2);
    } else if (plan === 'walls') {
      S.at(0.05, () => march(-1, 264, 150));
      volley(0.2, 170, 470); volley(0.65, 170, 400); volley(1.1, 170, 340); volley(1.6, 170, 300);
      fallSome(0.9, -1, 0.12); fallSome(1.4, -1, 0.12); fallSome(1.9, -1, 0.1); tClash = 1.25;
    }
    S.at(tClash, () => { W.line = line; W.sparks = 1; S.jolt(6); S.hitstop(0.05, 0.15); S.dust(line, 6); for (const u of W.units) if (u.st !== 'dead' && !u.onWall && Math.abs(u.x - line) < 90) u.st = 'fight'; });
    tEnd = tClash + 1.5;
  } else {
    lineUp();
    // 결정적 순간의 그림: 적장이 앞으로 나와 있거나, 우리 왼쪽 줄이 뒤로 밀려 있다
    let champ = null, hero = null;
    if (stage === 2 && sp.moment === 'champ') champ = S.add(sp.beast ? lookOf('orc_chief') : { form: 'human', s: 1.1, bulk: 1.2, body: '#5a2a26', weapon: 'axe', helm: true, armor: true, accent: '#d8d0c0', cloak: true }, line + 46, -1, 'guard', { scale: 1.25, dy: 10 });
    if (stage === 2 && sp.moment === 'line') { for (const u of U(1)) if (u.row >= 2) { u.x -= 30; u.home -= 30; u.st = 'brace'; } const b = W.banners.find((q) => q.side > 0); if (b) b.up = 0.72; }
    if (!sp.act) return;
    const act = sp.act, good = sp.good !== false;
    tClash = 0.1; W.sparks = 0;
    S.at(0.1, () => { W.sparks = 1; });
    const reserve = (t, lead) => S.at(t, () => { const k0 = W.units.length; mk(8, 1, 60); for (const u of W.units.slice(k0)) { u.x -= 140; u.y += 6; u.tx = line - 60 - u.col * 15; u.sp = 210; u.st = 'run'; } if (lead) { hero = S.add(HERO, 20, 1, 'run', { scale: 1.2, dy: 12 }); S.go(hero, { x: line - 40 }, 0.8, 'out'); S.at(S.t + 0.8, () => S.go(hero, 'slash', 0.1)); } S.dust(60, 4); });
    if (act === 'duel' && champ) { hero = S.add(HERO, line - 90, 1, 'guard', { scale: 1.25, dy: 10 }); const tc = strike(S, hero, champ, 0.2, 'heavy', good ? 'hit' : 'block', { final: good }); if (good) down(S, champ, tc + 0.3, 'kneel'); else strike(S, champ, hero, tc + 0.3, 'heavy', 'hit'); }
    else if (act === 'knights' && champ) { riders(0.1, champ.x - 26, 0); S.at(0.7, () => { S.sparks(champ.x - 10, GY - 30, 12); S.jolt(5); S.dust(champ.x, 4); }); if (good) down(S, champ, 0.75, 'kneel'); }
    else if (act === 'arrows' && champ) { volley(0.1, line - 120, champ.x, 12); volley(0.35, line - 120, champ.x, 12); if (good) down(S, champ, 0.95, 'kneel'); else S.at(0.9, () => S.go(champ, 'parry', 0.2)); }
    else if (act === 'send' || act === 'lead' || act === 'reserve') reserve(0.1, act === 'lead');
    else if (act === 'pull') S.at(0.1, () => { for (const u of U(1)) { u.tx = u.x - 34; u.sp = 80; u.st = 'brace'; } W.sparks = 0; });
    else if (act === 'counter') { riders(0.1, 590, 40); S.at(1.0, () => { for (const u of U(1).filter((u) => u.rider)) { u.y += 26; u.tx = 470; } S.dust(540, 5); }); fallSome(1.3, -1, good ? 0.2 : 0.05); if (!good) fallSome(1.3, 1, 0.14); }
    else if (act === 'push') S.at(0.1, () => { for (const u of U(1)) { u.tx = u.x + 26; u.sp = 160; if (u.st !== 'fight') u.st = 'run'; } for (const u of U(-1)) { u.tx = u.x + 22; u.sp = 120; } S.jolt(5); S.dust(line, 8); });
    else if (act === 'retreat') S.at(0.1, () => { W.sparks = 0; for (const u of U(1)) { u.tx = u.x - 150 - u.col * 4; u.sp = 90; u.st = 'march'; } });
    tEnd = 1.7;
    void hero;
  }
  // 싸우는 동안 양쪽에서 쓰러진다
  const oc = sp.outcome ?? null, tilt = oc === 'win' || (!oc && sp.good !== false && stage > 1) ? 1 : oc === 'lose' || (!oc && sp.good === false) ? -1 : 0;
  const lossO = tilt > 0 ? 0.06 : tilt < 0 ? 0.14 : 0.1, lossT = tilt > 0 ? 0.14 : tilt < 0 ? 0.06 : 0.1;
  for (const dt of [0.35, 0.75, 1.15]) { fallSome(tClash + dt, 1, lossO); fallSome(tClash + dt, -1, lossT); S.at(tClash + dt, () => { S.dust(W.line + (S.rnd() - 0.5) * 60, 3); S.jolt(2.5); }); }
  S.at(tEnd, () => {
    W.sparks = 0;
    const rout = (side) => { for (const u of U(side)) { u.st = 'flee'; u.tx = side > 0 ? -60 : SW + 60; u.sp = 150 + S.rnd() * 80; u.onWall = false; } for (const b of W.banners) if (b.side === side) b.fall = true; };
    const back = (side) => { for (const u of U(side)) { if (u.onWall) continue; u.st = 'march'; u.tx = (side > 0 ? W.line - 50 : W.line + 50) - side * (u.col * 15 + u.row * 5); u.sp = 70; } };
    if (oc === 'win') { rout(-1); for (const u of U(1)) if (!u.onWall) { u.st = 'cheer'; u.tx = null; } }
    else if (oc === 'lose') { if (sp.act !== 'retreat') rout(1); for (const u of U(-1)) { u.st = 'cheer'; u.tx = null; } }
    else if (oc === 'draw') { back(1); back(-1); }
    else for (const u of W.units) if (u.st === 'run' || u.st === 'march') u.st = 'fight'; // 아직 끝나지 않았다: 맞붙은 채로
  });
  S.end = Math.max(S.end, tEnd + (oc ? 1.6 : 0.4));
}
function stepWar(S, dt) {
  const W = S.war;
  for (const u of W.units) {
    if (u.tx != null) { const d = u.tx - u.x, mv = Math.sign(d) * Math.min(Math.abs(d), u.sp * dt); u.x += mv; if (Math.abs(d) < 1) { u.tx = null; if (u.st === 'march' || u.st === 'run') u.st = 'stand'; } }
    if (u.st === 'flee') u.a = Math.max(0, (u.a ?? 1) - dt * 0.5);
    if (u.st === 'dead') { u.d = Math.min(1, (u.d ?? 0) + dt * 4); if (u.d >= 1) u.a = Math.max(0, (u.a ?? 1) - dt * 0.9); } // 쓰러진 병사는 곧 흐려진다 (주검을 남기지 않는다)
  }
  for (const b of W.banners) {
    const mine = W.units.filter((u) => u.side === b.side && u.st !== 'dead' && !u.rider && !u.onWall);
    if (mine.length) { const cx = mine.reduce((s, u) => s + u.x, 0) / mine.length; b.x += (cx + (b.home ||= b.x - cx) - b.x) * Math.min(1, dt * 4); }
    if (b.fall) b.up = Math.max(0, b.up - dt * 1.6);
  }
  if (W.sparks && S.rnd() < dt * 18) { const x = W.line + (S.rnd() - 0.5) * 80, y = GY - 40 + S.rnd() * 50; S.sparks(x, y, 3); if (S.rnd() < 0.3) S.emit({ type: 'flash', x, y, r: 12, life: 0.12 }); }
}
// 전쟁의 병사: 작지만 면으로 그린다 (몸·겉옷·투구·방패·창). 우리 편은 푸른 겉옷과 금빛, 적은 붉은 겉옷.
const ARMY = { 1: { cloth: '#3c4a6a', dark: '#1c2230', trim: '#c8a04a' }, '-1': { cloth: '#7a2e2a', dark: '#2c1a18', trim: '#d8d0c0' } };
function drawWar(c, S) {
  const W = S.war, light = S.back.tone.light; c.lineCap = 'round'; c.lineJoin = 'round';
  const flag = (b) => {
    const A = ARMY[b.side], top = b.y0 - 74 * b.up, lean = (1 - b.up) * 44 * b.side, x = b.x;
    c.strokeStyle = '#2a2018'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, b.y0); c.lineTo(x - lean, top); c.stroke();
    if (b.up > 0.2) { const w = Math.sin(S.t * 5 + x) * 3, d = -b.side; c.fillStyle = A.cloth; c.beginPath(); c.moveTo(x - lean, top); c.quadraticCurveTo(x - lean + d * 14, top + 3 + w, x - lean + d * 30, top + 5 - w); c.lineTo(x - lean + d * 24, top + 12); c.lineTo(x - lean + d * 30, top + 20 + w); c.quadraticCurveTo(x - lean + d * 14, top + 18 - w, x - lean, top + 18); c.closePath(); c.fill(); c.fillStyle = A.trim; c.beginPath(); c.arc(x - lean + d * 12, top + 10 + w * 0.3, 3.4, 0, 6.3); c.fill(); }
  };
  for (const b of W.banners) { b.y0 = GY - 8; flag(b); }
  for (const u of [...W.units].sort((p, q) => p.y - q.y)) {
    const A = ARMY[u.side], a = u.a ?? 1; if (a <= 0.02) continue;
    c.globalAlpha = a;
    const moving = u.tx != null, Z = 1.85 * (0.86 + (u.y - (GY - 30)) / 380), face = u.st === 'flee' ? -u.side : u.side, bob = moving ? Math.abs(Math.sin(S.t * 11 + u.ph)) * 1.4 : 0;
    const jit = u.st === 'fight' ? Math.sin(S.t * 13 + u.ph) * 1.8 : 0;
    c.save(); c.translate(u.x + jit, u.y); c.scale(Z * face, Z);
    // (여기부터 오른쪽을 보는 병사, 발이 원점)
    c.fillStyle = 'rgba(6,5,8,.34)'; c.beginPath(); c.ellipse(0, 0.6, 5.4, 1.3, 0, 0, 6.3); c.fill();
    if (u.st === 'dead') { const d = u.d ?? 1; c.rotate(-d * 1.45); c.translate(0, d * 1.5); c.globalAlpha = a * (1 - d * 0.25); }
    c.translate(0, -bob);
    if (u.rider) { // 말
      const g = Math.sin(S.t * 16 + u.ph) * 3.4;
      c.strokeStyle = '#1a1614'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-5, -5); c.lineTo(-6 - g, 0); c.moveTo(5, -5); c.lineTo(6 + g, 0); c.moveTo(-3, -5); c.lineTo(-2 + g, 0); c.moveTo(4, -5); c.lineTo(3 - g, 0); c.stroke();
      c.fillStyle = '#3a2c22'; c.beginPath(); c.ellipse(0, -7, 8.6, 3.6, 0, 0, 6.3); c.fill(); c.beginPath(); c.moveTo(6, -9); c.lineTo(11, -15); c.lineTo(14, -13); c.lineTo(9, -6); c.closePath(); c.fill();
      c.strokeStyle = '#1a1614'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -8); c.quadraticCurveTo(-13, -8, -13, -3); c.stroke();
      c.translate(0, -9);
    }
    const s = moving ? Math.sin(S.t * 11 + u.ph) * 2.6 : 1.2;
    if (!u.rider) { c.strokeStyle = A.dark; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -6); c.lineTo(-s, 0); c.moveTo(0, -6); c.lineTo(s + 0.6, 0); c.stroke(); }
    // 몸: 겉옷
    const ln = moving ? 1.6 : u.st === 'fight' ? 1.2 : 0.4;
    c.fillStyle = A.cloth; c.beginPath(); c.moveTo(-2.6, -5); c.lineTo(2.6, -5); c.lineTo(3 + ln, -13); c.lineTo(-2.2 + ln, -13); c.closePath(); c.fill();
    c.fillStyle = 'rgba(8,7,12,.3)'; c.beginPath(); c.moveTo(-2.6, -5); c.lineTo(-0.4, -5); c.lineTo(0 + ln, -13); c.lineTo(-2.2 + ln, -13); c.closePath(); c.fill();
    c.fillStyle = A.trim; c.fillRect(-2.4 + ln * 0.3, -8.4, 5, 1);
    // 머리와 투구
    c.fillStyle = '#b8936e'; c.beginPath(); c.arc(0.6 + ln, -15.2, 2.2, 0, 6.3); c.fill();
    c.fillStyle = '#7a8088'; c.beginPath(); c.arc(0.4 + ln, -15.6, 2.5, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); c.fill();
    c.strokeStyle = `rgba(232,220,196,.5)`; c.lineWidth = 0.6; c.beginPath(); c.arc(0.4 + ln, -15.6, 2.3, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
    // 방패(칼잡이)와 무기
    const up = u.st === 'cheer' ? -1.5 + Math.sin(S.t * 6 + u.ph) * 0.2 : u.st === 'fight' ? -0.3 + Math.sin(S.t * 9 + u.ph) * 0.8 : u.st === 'brace' ? -0.2 : moving ? -0.9 : -1.4;
    const hx = 2.4 + ln, hy = -10, len = u.spear ? 17 : 9;
    if (u.spear) { c.strokeStyle = '#3a2a1c'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(hx - Math.cos(up) * 5, hy - Math.sin(up) * 5); c.lineTo(hx + Math.cos(up) * len, hy + Math.sin(up) * len); c.stroke(); c.strokeStyle = '#d0d4d8'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(hx + Math.cos(up) * (len - 2.6), hy + Math.sin(up) * (len - 2.6)); c.lineTo(hx + Math.cos(up) * len, hy + Math.sin(up) * len); c.stroke(); }
    else { c.strokeStyle = '#d0d4d8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(up) * len, hy + Math.sin(up) * len); c.stroke(); c.fillStyle = A.dark; c.beginPath(); c.ellipse(3.4 + ln * 0.5, -9, 2.2, 3.4, 0, 0, 6.3); c.fill(); c.strokeStyle = A.trim; c.lineWidth = 0.6; c.beginPath(); c.ellipse(3.4 + ln * 0.5, -9, 2.2, 3.4, 0, 0, 6.3); c.stroke(); }
    c.strokeStyle = A.cloth; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0.6 + ln, -12); c.lineTo(hx, hy); c.stroke();
    void light;
    c.restore();
    c.globalAlpha = 1;
  }
  if (W.torch) for (let i = 0; i < 5; i++) { const x = 430 + i * 44, y = GY - 44 + (i % 2) * 20; orb(c, x, y, 20 + Math.sin(S.t * 9 + i) * 3, '#ff9a40', 0.8); c.fillStyle = '#ffe0a0'; c.beginPath(); c.arc(x, y, 1.6, 0, 6.3); c.fill(); }
}
function drawWall(c) {
  c.save(); c.translate(0, GY); c.scale(1.4, 1.4); c.translate(0, -GY);
  const g = c.createLinearGradient(0, GY - 90, 0, GY + 12); g.addColorStop(0, '#5a544c'); g.addColorStop(1, '#2e2a26');
  c.fillStyle = g; c.fillRect(-8, GY - 58, 190, 70);
  for (let x = 0; x < 180; x += 16) c.fillRect(x, GY - 66, 9, 9);
  c.fillRect(150, GY - 84, 34, 96); for (let x = 150; x < 184; x += 12) c.fillRect(x, GY - 92, 7, 9);
  c.strokeStyle = 'rgba(12,10,14,.3)'; c.lineWidth = 0.6; for (let y = GY - 50; y < GY + 8; y += 8) { c.beginPath(); c.moveTo(-8, y); c.lineTo(184, y); c.stroke(); for (let x = ((y / 8) % 2) * 8; x < 184; x += 16) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 8); c.stroke(); } }
  c.fillStyle = 'rgba(232,220,196,.2)'; c.fillRect(-8, GY - 58, 158, 1.2); c.fillRect(182.8, GY - 84, 1.2, 96);
  c.fillStyle = '#141210'; c.fillRect(162, GY - 62, 5, 12);
  c.restore();
}

/* ---------- 무대 만들기 ---------- */
const BUILD = { duel: buildDuel, fight: buildFight, war: buildWar };
const VENUE_GROUND = { dojo: 'wood', square: 'stone', court: 'stone', field: 'dirt', arena: 'sand', road: 'grass' };
function makeStage(spec, url = spec.back) {
  const seed = hashStr(JSON.stringify({ ...spec, back: 0 })) || 7;
  const S = new Stage(seed, makeBack({ url, seed: (spec.seed ?? 3) + 11, ground: spec.ground ?? VENUE_GROUND[spec.venue] ?? TERRAIN_GROUND[spec.terrain] ?? 'grass', venue: spec.venue ?? null, terrain: spec.terrain ?? null, night: (spec.plan === 'night' && (spec.stage ?? 1) === 1) || spec.terrain === 'cave' ? 1 : 0 }));
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
/** 견본·점검용: spec의 연출을 t초까지 돌린 한 순간을 host에 그린다 (t가 없으면 끝난 모습) */
export async function battleAt(host, spec, t = null) {
  if (!hasDom || !host || !BUILD[spec?.kind]) return null;
  css();
  const S = makeStage(spec);
  host.classList.add('fl-battle'); host.appendChild(S.canvas);
  if (spec.back) await new Promise((r) => { if (S.back.ready) r(); else { S.back.onready = r; setTimeout(r, 1500); } });
  S.fit(); if (t == null) S.play(true); else S.seek(t);
  return S;
}

/* ---------- 게임 장면 읽기 ---------- */
let game = null;
const keep = (g) => { game = g; };
HOOKS.newGame.push(keep); HOOKS.migrate.push(keep); HOOKS.afterMonth.push(keep); (HOOKS.heir ??= []).push(keep);

const lifeOf = (g) => g?.life ?? null;
const sceneOf = (g) => (g?.pendingEvent?.id === 'life_scene' ? lifeOf(g)?.scene : null);
function duelBase(g, d) {
  return { kind: 'duel', magic: !!d.magicDuel, lethal: !!d.lethal, seed: hashStr(String(d.foe?.name ?? '')), hurtMe: d.hp / d.hp0, hurtFoe: d.fhp / d.fhp0, venue: d.venue ?? null };
}
function fightBase(g, s) {
  const e = s.enc ?? s.st?.enc ?? {}, v = safe(() => skirmishView(g));
  const comps = safe(() => companionsFor(g).length, 0);
  const base = { kind: 'fight', unit: e.unit, count: e.count ?? (e.leader ? 0 : 3), leader: e.leader ?? null, comps: Math.min(3, comps), mage: safe(() => circleOf(g), 0) >= 1 };
  if (v) Object.assign(base, { stage: v.stage, terrain: v.terrain, how: v.them?.how ?? null, count: v.them?.count ?? base.count, leader: v.them?.leaderAlive === false ? null : v.them?.leader ?? base.leader, unit: v.them?.unit ?? base.unit });
  return base;
}
function warBase(g, s) {
  const v = safe(() => battleView(g));
  if (v) return { kind: 'war', ours: v.us?.troops ?? 100, theirs: v.them?.troops ?? 100, stage: v.stage, moment: v.moment ?? null, plan: v.plan ?? null, beast: !!v.them?.beast };
  const m = /아군:.*?(\d+)명/.exec(String(g.pendingEvent?.text ?? ''));
  return { kind: 'war', ours: m ? +m[1] : 100, theirs: s.enemy?.troops ?? 100 };
}
/** 지금 뜬 장면의 마주 선 모습 (없으면 null) */
function standoff(g) {
  const pe = g?.pendingEvent;
  if (!pe) return null;
  if (pe.id === 'duel_round' && g.duel) return { key: `duel:${g.duel.foe?.name}:${g.duel.round}`, spec: duelBase(g, g.duel) };
  const s = sceneOf(g);
  if ((s?.kind === 'fight' && s.enc) || (s?.kind === 'fight_beat' && s.st)) { const spec = fightBase(g, s); return { key: `fight:${pe.title}:${spec.unit}:${spec.count}:${spec.stage ?? 1}`, spec, view: safe(() => skirmishView(g)) }; }
  if ((s?.kind === 'battle' && s.enemy) || (s?.kind === 'battle_beat' && s.b)) { const spec = warBase(g, s); return { key: `war:${pe.title}:${spec.theirs}:${spec.stage ?? 1}`, spec, view: safe(() => battleView(g)) }; }
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
    const mv = MOVE_IDS[g.pendingEvent.choiceIdx?.[i]] ?? 'heavy';
    pend = { ...base, move: mv === 'magic' && /마검/.test(label) ? 'spellblade' : mv, pre: { hp: d.hp, fhp: d.fhp, round: d.round }, spell: schoolOf(label) };
  } else if (base.spec.kind === 'fight') {
    const id = base.view?.options?.[i]?.id ?? null, stage = base.spec.stage ?? 1;
    if (stage > 1) { if (id) pend = { ...base, act: id, last: g.lastFight ?? null }; return; }
    const tactic = id === 'charge' || /정면/.test(label) ? 'charge' : id === 'ambush' || /기습/.test(label) ? 'ambush' : id === 'magic' || /마법/.test(label) ? 'magic' : null;
    if (tactic) pend = { ...base, tactic, last: g.lastFight ?? null };
  } else {
    const id = base.view?.options?.[i]?.id ?? null, stage = base.spec.stage ?? 1;
    if (stage > 1) { if (id) pend = { ...base, act: id, last: g.lastFight ?? null }; return; }
    const plan = ['charge', 'flank', 'hold', 'night', 'walls'].includes(id) ? id : /진격/.test(label) ? 'charge' : /측면/.test(label) ? 'flank' : /진을 치고/.test(label) ? 'hold' : /밤을 틈타/.test(label) ? 'night' : /성벽/.test(label) ? 'walls' : null;
    if (plan) pend = { ...base, plan, last: g.lastFight ?? null };
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
        Object.assign(sp, { move: pend.move, spell: pend.spell, end: null, dm: pend.pre.hp - d.hp > 0.01 ? 1 : 0, df: pend.pre.fhp - d.fhp > 0.01 ? 1 : 0, foeMove: d.last?.theirs ?? null });
        return { key: `duelr:${pend.key}`, spec: sp };
      }
      const ld = g.lastDuel ?? null; // 46단계: 끝이 어떻게 났는지는 결투 쪽이 적어 둔다
      const end = pend.move === 'yield' ? 'yield' : ld?.end ?? (/무릎을 꿇었다/.test(text) ? 'win' : /더는 검을 들 수 없었다/.test(text) ? 'lose' : null);
      Object.assign(sp, { move: pend.move, spell: pend.spell, end, endKind: ld?.endKind ?? null, df: end === 'win' ? 1 : 0, dm: end === 'lose' ? 1 : 0 });
    } else if (sp.kind === 'fight') {
      // 고비가 이어지면(다음 장면이 벌써 떠 있다) 이 고비의 주고받기만, 끝났으면 결과까지
      const next = safe(() => skirmishView(g)), lf = g.lastFight !== pend.last && g.lastFight?.kind === 'skirmish' ? g.lastFight : null;
      const going = !!next && (next.stage ?? 1) > (sp.stage ?? 1) && !lf;
      const result = going ? null : lf ? ({ win: 'victory', overwhelm: 'victory', flee: 'flee', lose: 'defeat' })[lf.result] ?? 'victory' : safe(() => fightResult(text), 'victory');
      Object.assign(sp, { tactic: pend.tactic, act: pend.act, result, wounded: /부상:/.test(text) || (going && next.us && pend.view?.us && next.us.hp < pend.view.us.hp * 0.8), left: going ? next.them?.count ?? null : null, leaderLeft: going ? next.them?.leaderAlive !== false : result === 'victory' ? false : null });
    } else {
      const next = safe(() => battleView(g)), lf = g.lastFight !== pend.last && g.lastFight?.kind === 'war' ? g.lastFight : null;
      const going = !!next && (next.stage ?? 1) > (sp.stage ?? 1) && !lf;
      const dU = going ? (sp.ours ?? 0) - (next.us?.troops ?? 0) : 0, dT = going ? (sp.theirs ?? 0) - (next.them?.troops ?? 0) : 0;
      Object.assign(sp, { plan: pend.plan ?? sp.plan, act: pend.act, outcome: going ? null : lf?.result ?? warResult(text), good: going ? dT >= dU : (lf?.result ?? warResult(text)) !== 'lose' });
    }
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
  if (fresh) { drop(); cur = { key: plan.key, stage: makeStage(plan.spec, safe(() => sceneImage(game.sceneArgs), '')) }; }
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
