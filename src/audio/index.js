// 음악과 효과음을 게임에 잇는 곳. 화면 코드(src/ui)는 고치지 않고 옆에서 지켜본다.
// - 지금 게임 상태는 hooks로 받아 둔다 (새 게임, 불러오기, 한 달이 지난 뒤, 대를 이은 뒤)
// - 화면이 다시 그려질 때마다(#app 변화) 어울리는 곡을 고른다
// - 버튼을 누르면 종류에 맞는 효과음을 낸다
// 소리는 사용자가 화면을 처음 누른 뒤에만 켜진다 (브라우저·아이폰 규칙).
//
// 다른 모듈에서 쓰는 법:
//   import { audio } from './audio/index.js';
//   audio.sfx('coin');             // 효과음 (이름은 sfx.js의 SFX 참고)
//   audio.settings / audio.set({ on, music, sfx })   // 설정 읽기·바꾸기 (0~1)
//   audio.mountSettings(host)      // 설정 화면에 음량 칸을 그려 넣기 (넣으면 떠 있는 단추는 숨는다)
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { circleOf } from '../game.js';
import { iconName } from '../art/icons.js';
import { Engine } from './engine.js';
import { MusicPlayer } from './music.js';
import { TRACKS } from './tracks.js';
import { SFX, playSfx } from './sfx.js';
import { Ambience, pickAmbience } from './ambience.js';
import { pickMusic, eventMood, ambienceWhere, fightSfx } from './pick.js';
import { conditionText } from '../art/scene.js';
import { prefs, setPref, onPrefs } from '../ui/settings.js';

const KEY = 'fantasy-life:audio';
const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';
const safe = (fn, fb = null) => { try { return fn(); } catch { return fb; } };

const settings = { on: true, music: 0.7, sfx: 0.8, ...(hasDom ? safe(() => JSON.parse(localStorage.getItem(KEY))) ?? {} : {}) };
// 음량은 설정 화면(src/ui/settings.js)의 음악·효과음 칸과 같은 값을 쓴다. 켜기·끄기만 여기 따로 둔다.
safe(() => { settings.music = prefs().music; settings.sfx = prefs().sfx; });
onPrefs((p, k) => { if ((k === 'music' || k === 'sfx') && p[k] !== settings[k]) set({ [k]: p[k] }); });
let game = null;      // 지금 하고 있는 게임
let engine = null, player = null, fx = null, amb = null;
let lastEventTrack = null, hadOverlay = false, wasOver = false, lastCircle = 0, lastYear = null;
let pendingFight = false, lastWhere = null;
// 같은 마을에서 계절만 바뀐 것이면 흐르던 곡을 끊지 않는다
const home = (w) => (/^village_|^cradle$/.test(w ?? '') ? 'ern' : w);
const sameGround = (a, b) => a != null && home(a) === home(b);
const listeners = new Set();

/* ---------- 게임 상태 받아 두기 ---------- */
const keep = (g) => { game = g; };
HOOKS.newGame.push(keep);
HOOKS.migrate.push(keep);
HOOKS.afterMonth.push(keep);
(HOOKS.heir ??= []).push(keep);

/* ---------- 소리 켜기 ---------- */
function unlock() {
  if (!hasDom) return;
  if (!engine) {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return;
    const ctx = safe(() => new AC({ latencyHint: 'interactive' }));
    if (!ctx) return;
    engine = new Engine(ctx);
    player = new MusicPlayer(engine, TRACKS);
    fx = engine.group('sfx');
    amb = new Ambience(engine);
    applyVolume();
  }
  if (engine.ctx.state !== 'running' && settings.on && !document.hidden) safe(() => engine.ctx.resume());
  sync();
}
function applyVolume() {
  if (!engine) return;
  engine.setVolume('music', settings.on ? settings.music ** 1.6 : 0);
  engine.setVolume('sfx', settings.on ? settings.sfx ** 1.6 : 0);
  // 환경음은 효과음 크기를 따라간다 (조금 작게)
  engine.setVolume('amb', settings.on ? settings.sfx ** 1.6 * 0.7 : 0);
}

function sfx(id, when = 0) {
  if (!engine || !settings.on || settings.sfx <= 0 || engine.ctx.state !== 'running') return;
  playSfx(fx, SFX[id] ? id : 'tap', when);
}

/* ---------- 곡 고르기 ---------- */
const circle = (g) => (g?.player ? safe(() => circleOf(g), 0) : 0);

function sync() {
  if (!hasDom) return;
  const title = !document.querySelector('header.scene');
  const overlay = !!document.querySelector('.overlay');
  const g = title ? null : game;
  // 사건 창이 새로 뜰 때
  if (overlay && !hadOverlay && g?.pendingEvent) {
    const kind = g.pendingEvent.id === 'life_scene' ? g.life?.scene?.kind : null;
    const t = String(g.pendingEvent.title ?? '');
    if (kind === 'battle') { sfx('warhorn'); sfx('march', 1.6); }
    else if (g.pendingEvent.id === 'duel_round' || g.pendingEvent.id === 'duel_start') sfx('sword');
    else if (/편지|서신|소식|전갈/.test(t)) sfx('letter');
    else sfx('event');
  }
  if (!overlay) lastEventTrack = null;
  const m = pickMusic(g, { title, overlay, last: lastEventTrack });
  if (overlay && eventMood(g)) lastEventTrack = m.pool[0];
  hadOverlay = overlay;
  if (g) {
    if (g.over && !wasOver) sfx('death');
    wasOver = !!g.over;
    const y = g.date?.year;
    if (lastYear != null && y === lastYear + 1 && !overlay) sfx('newyear', 0.5);
    lastYear = y;
  } else { wasOver = false; lastYear = null; }
  if (player && settings.on) {
    if (settings.music > 0) player.program(m.pool, { cue: m.cue, soft: sameGround(lastWhere, m.where) });
    lastWhere = m.where;
    const weather = g?.date ? safe(() => conditionText(g.date.year, g.date.month), '') : '';
    if (settings.sfx > 0) amb.set(pickAmbience(ambienceWhere(m), weather)); else amb.stop();
  }
  for (const f of listeners) f();
}

/* ---------- 누르는 소리 ---------- */
const CLICK = [
  ['#go, #skip, #skip3', 'month'],
  ['#ev-close, [data-person-close]', 'close'],
  ['[data-view], [data-person], [data-pfilter]', 'tab'],
  ['[data-target]', 'target'],
  ['[data-save]', 'save'],
  ['#begin', 'begin'],
  ['#cont-auto, [data-slot], #to-title', 'confirm'],
];
// 그림(아이콘)만으로는 뜻이 안 드러나는 행동의 소리
const ACT_SFX = [
  [/pickpocket/, 'steal'], [/burgl|jail_escape/, 'lock'], [/^jail_/, 'jail'], [/^gear$/, 'smith'], [/faction_door|housing/, 'door'],
  [/^quest$/, 'stamp'], [/^gang_/, 'door'], [/market/, 'coin'], [/^delve$/, 'dungeon'],
];
// 결투의 한 수: 어떤 수를 골랐는지에 맞는 소리 (duel.js의 MOVE_IDS 순서)
const MOVE_IDS = ['heavy', 'quick', 'guard', 'feint', 'wait', 'magic', 'aura', 'yield'];
const MOVE_SFX = { heavy: 'slash', quick: 'stab', guard: 'parry', feint: 'feint', wait: 'target', aura: 'aura', yield: 'close' };
const SPELL_SFX = { heavy: 'fire', quick: 'bolt', guard: 'ward', feint: 'gale', wait: 'meditate', yield: 'close' };
function spellSfx(text) {
  return /번개|뇌/.test(text) ? 'bolt' : /얼음|서리|빙/.test(text) ? 'frost' : /바람|돌풍/.test(text) ? 'gale' : /땅|바위|흙/.test(text) ? 'quake' : /치유|회복/.test(text) ? 'heal' : /결계|방벽/.test(text) ? 'ward' : 'fire';
}
function duelSfx(pe, i, text) {
  const move = MOVE_IDS[pe.choiceIdx?.[i]];
  if (move === 'magic') { sfx(spellSfx(text)); return; }
  const id = (game?.duel?.magicDuel ? SPELL_SFX : MOVE_SFX)[move] ?? 'clash';
  sfx(id);
  if (move === 'heavy' || move === 'quick') sfx(game?.duel?.magicDuel ? 'hit' : 'clash', 0.28);
}
function onClick(ev) {
  const el = ev.target?.closest?.('button, summary, [role="button"], a');
  if (!el || el.disabled || el.closest('.fl-audio')) return;
  if (el.matches('[data-choice]')) {
    const pe = game?.pendingEvent;
    const kind = pe?.id === 'life_scene' ? game.life?.scene?.kind : null;
    const duel = pe?.id === 'duel_round';
    pendingFight = kind === 'fight' || kind === 'battle' || duel;
    const before = circle(game);
    if (duel) duelSfx(pe, +el.dataset.choice, el.textContent);
    else sfx(kind === 'fight' ? 'clash' : kind === 'battle' ? 'march' : 'choose');
    // 화면이 결과를 그린 뒤에 결과에 맞는 소리를 낸다
    setTimeout(() => {
      const text = document.querySelector('.overlay .outcome')?.textContent ?? '';
      if (duel && game?.pendingEvent?.id === 'duel_round') { /* 결투가 이어진다 */ }
      else if (pendingFight) {
        const r = fightSfx(text);
        if (kind === 'battle' && r === 'victory') sfx('cheer', 0.5);
        if (r !== 'flee' && /부상|치명상|다쳤|상처/.test(text) && r !== 'defeat') sfx('wound', 0.9);
        sfx(r, r === 'flee' ? 0.1 : 1.1);
      } else if (circle(game) > before || /서클에 올랐|승급했|서임/.test(text)) sfx('rise', 0.3);
      else if (/혼례를 올렸|부부가 되었/.test(text)) sfx('wedding', 0.3);
      else if (/태어났다/.test(text)) sfx('birth', 0.3);
      else if (/은화 \d+닢을 (받|벌|얻)/.test(text)) sfx('coin', 0.3);
      pendingFight = false;
    }, 0);
    return;
  }
  if (el.matches('[data-act]')) {
    const act = ACTIONS.find((a) => a.id === el.dataset.act);
    const name = act ? iconName(act) : null;
    const over = ACT_SFX.find(([re]) => re.test(el.dataset.act))?.[1];
    sfx(over ?? (SFX[name] ? name : 'select'));
    return;
  }
  for (const [sel, id] of CLICK) if (el.matches(sel)) { sfx(id); return; }
  sfx('tap');
}

/* ---------- 설정 ---------- */
function set(patch) {
  Object.assign(settings, patch);
  settings.music = Math.max(0, Math.min(1, +settings.music || 0));
  settings.sfx = Math.max(0, Math.min(1, +settings.sfx || 0));
  safe(() => localStorage.setItem(KEY, JSON.stringify(settings)));
  for (const k of ['music', 'sfx']) if (safe(() => prefs()[k]) !== settings[k]) safe(() => setPref(k, settings[k]));
  applyVolume();
  if (engine) {
    if (!settings.on) { player.halt(0.6); amb.stop(0.6); setTimeout(() => { if (!settings.on) safe(() => engine.ctx.suspend()); }, 800); }
    else { safe(() => engine.ctx.resume()); if (settings.music <= 0) player.halt(0.6); }
  }
  sync();
}

const CSS = `
.fl-audio-btn{position:fixed;z-index:60;top:calc(env(safe-area-inset-top,0px) + 8px);right:calc(env(safe-area-inset-right,0px) + 8px);
  width:38px;height:38px;border-radius:50%;border:1px solid var(--line,#3d3328);background:rgba(23,19,15,.72);color:var(--brass,#c9a25a);
  display:grid;place-items:center;padding:0;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.fl-audio-btn[aria-pressed="false"]{color:var(--muted,#a89982)}
.fl-audio-btn svg{pointer-events:none}
.fl-audio-panel{position:fixed;z-index:61;top:calc(env(safe-area-inset-top,0px) + 52px);right:calc(env(safe-area-inset-right,0px) + 8px);
  width:min(280px,calc(100vw - 16px));background:var(--panel,#221c16);border:1px solid var(--line,#3d3328);border-radius:10px;
  box-shadow:0 12px 32px rgba(0,0,0,.5)}
.fl-audio-box{display:grid;gap:12px;padding:14px;color:var(--ink,#e8dcc6);font-size:14px}
.fl-audio-box .row{display:grid;grid-template-columns:4.5em 1fr 2.6em;align-items:center;gap:10px}
.fl-audio-box .row output{text-align:right;color:var(--muted,#a89982);font-variant-numeric:tabular-nums}
.fl-audio-box input[type=range]{width:100%;accent-color:var(--brass,#c9a25a);min-width:0}
.fl-audio-box .onoff{display:flex;align-items:center;justify-content:space-between;gap:10px}
.fl-audio-box .onoff button{border:1px solid var(--line,#3d3328);background:var(--panel-2,#2b241c);border-radius:6px;padding:6px 12px;min-height:36px}
.fl-audio-box .onoff button[aria-pressed="true"]{border-color:var(--brass-dim,#8a6d38);color:var(--brass,#c9a25a)}
.fl-audio-box .now{margin:0;color:var(--muted,#a89982);font-size:12.5px}
.fl-audio-box .now b{color:var(--ink,#e8dcc6);font-weight:500}`;

const ICON_ON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const ICON_OFF = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

/** host 안에 음량 칸을 그린다. 화면이 다시 그려져 host가 사라지면 저절로 정리된다. */
function mountSettings(host, { floating = false } = {}) {
  if (!hasDom || !host) return;
  host.classList.add('fl-audio');
  host.innerHTML = `<div class="fl-audio-box">
    <div class="onoff"><span>소리</span><button type="button" data-a="on"></button></div>
    <label class="row"><span>음악</span><input type="range" min="0" max="100" step="5" data-a="music" aria-label="음악 크기"><output></output></label>
    <label class="row"><span>효과음</span><input type="range" min="0" max="100" step="5" data-a="sfx" aria-label="효과음 크기"><output></output></label>
    <p class="now"></p></div>`;
  const q = (s) => host.querySelector(s);
  const draw = () => {
    if (!host.isConnected) { listeners.delete(draw); return; }
    const b = q('[data-a="on"]'); b.textContent = settings.on ? '켜짐' : '꺼짐'; b.setAttribute('aria-pressed', String(settings.on));
    for (const k of ['music', 'sfx']) {
      const i = q(`[data-a="${k}"]`); const v = Math.round(settings[k] * 100);
      if (document.activeElement !== i) i.value = v;
      i.disabled = !settings.on; i.parentElement.querySelector('output').textContent = v;
    }
    const tr = TRACKS.find((t) => t.id === player?.playing);
    q('.now').innerHTML = settings.on && tr ? `지금 흐르는 곡: <b>${tr.name}</b>` : settings.on ? (engine ? '곡 사이. 지금은 주변 소리만 흐른다.' : '화면을 누르면 음악이 시작된다.') : '소리가 꺼져 있다.';
  };
  q('[data-a="on"]').onclick = () => { set({ on: !settings.on }); unlock(); if (settings.on) sfx('confirm'); };
  for (const k of ['music', 'sfx']) {
    q(`[data-a="${k}"]`).oninput = (e) => set({ [k]: e.target.value / 100 });
    q(`[data-a="${k}"]`).onchange = () => { if (k === 'sfx') sfx('confirm'); };
  }
  listeners.add(draw);
  draw();
  if (!floating) { const b = document.querySelector('.fl-audio-btn'); if (b) b.hidden = true; document.querySelector('.fl-audio-panel')?.remove(); }
}

function mountButton() {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'fl-audio-btn fl-audio'; btn.setAttribute('aria-label', '소리 설정');
  let shown = null;
  const drawBtn = () => { if (shown === settings.on) return; shown = settings.on; btn.innerHTML = shown ? ICON_ON : ICON_OFF; btn.setAttribute('aria-pressed', String(shown)); };
  listeners.add(drawBtn); drawBtn();
  let panel = null;
  const close = () => { panel?.remove(); panel = null; btn.setAttribute('aria-expanded', 'false'); };
  btn.onclick = () => {
    if (panel) { close(); return; }
    panel = document.createElement('div'); panel.className = 'fl-audio-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '소리 설정');
    document.body.appendChild(panel); mountSettings(panel, { floating: true }); btn.setAttribute('aria-expanded', 'true');
  };
  document.addEventListener('pointerdown', (e) => { if (panel && !e.target.closest('.fl-audio')) close(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.body.appendChild(btn);
}

/* ---------- 시작 ---------- */
function init() {
  for (const t of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(t, unlock, { capture: true, passive: true });
  document.addEventListener('click', onClick, true);
  document.addEventListener('visibilitychange', () => {
    if (!engine) return;
    if (document.hidden) safe(() => engine.ctx.suspend());
    else if (settings.on) safe(() => engine.ctx.resume());
  });
  const watch = () => {
    const app = document.getElementById('app');
    if (!app) return;
    let queued = false;
    new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(() => { queued = false; sync(); }); } }).observe(app, { childList: true });
    mountButton();
    sync();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
}
if (hasDom) init();

export const audio = {
  get settings() { return { ...settings }; },
  get playing() { return player?.playing ?? null; },
  set, sfx, unlock, mountSettings,
  get ambience() { return amb?.playing ?? null; },
  tracks: TRACKS.map((t) => ({ id: t.id, name: t.name, where: t.where, kind: t.kind })),
  sounds: Object.entries(SFX).map(([id, s]) => ({ id, name: s.name, kind: s.kind })),
};
export { pickTrack, pickMusic, eventMood } from './pick.js';
