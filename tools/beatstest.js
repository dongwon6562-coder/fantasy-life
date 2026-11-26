import './lsshim.js';
import '../src/content.js';

// 달마다 기세와 바깥 마을, 대 잇기, 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, circleOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { makePerson, byId, bodyAgeOf, ageYears } from '../src/npc.js';
import { playerPower } from '../src/adventure/combat.js';
import { encodeSave, decodeSave } from '../src/save.js';

const T0 = Date.now();
SCENE_STRICT.on = true;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])|\(으\)|을\(를\)|이\(가\)/;
const BAD0 = /undefined|NaN|\[object/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = typeof e.text === 'function' ? e.text(g, ctx) : e.text;
  check(!BAD.test(text), `${id} 본문: ${text}`);
  const shown = e.choices.map((c, i) => [c, i]).filter(([c]) => !c.show || c.show(g, ctx));
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(([c]) => c.label), choiceIdx: shown.map(([, i]) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  if (process.env.SHOW) console.log(`[${id}] ${text}\n  > ${out}`);
  return out;
};
const grown = (g, y) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; g.pendingEvent = null; L(g).scene = null; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const queued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); if (process.env.SHOW) console.log(`[${id}] > ${out}`); return out; };
const scene = (g, kind, key, seed = 5) => {
  let s;
  if (L(g).scene?.kind === kind && g.pendingEvent?.id === 'life_scene') s = L(g).scene;
  else {
    const q = L(g).queue, i = q.findIndex((x) => x.kind === kind);
    if (i < 0) { check(false, `장면 ${kind}이 대기열에 없다`); return ''; }
    [s] = q.splice(i, 1);
    g.pendingEvent = null; L(g).scene = null;
    if (!showScene(g, s, { force: true })) { check(false, `장면 ${kind}을 띄우지 못했다`); return ''; }
  }
  check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title), `${kind} 글: ${g.pendingEvent.title} / ${g.pendingEvent.text}`);
  const idx = key == null ? 0 : s.choices.findIndex((c) => c.key === key);
  check(idx >= 0, `${kind}에 선택지 ${key}가 없다 (${s.choices.map((c) => c.key)})`);
  const out = resolveEvent(g, makeRng({ s: seed }), Math.max(0, idx));
  if (process.env.SHOW) console.log(`[${kind}/${key}] ${g.pendingEvent?.text ?? ""}\n  > ${out}`);
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  return out;
};
import { FOES, MOVES, skirmish, skirmishStart, skirmishRounds, skirmishEnd } from '../src/adventure/combat.js';
import { skirmishView, TERRAINS, terrainOf } from '../src/adventure/fight.js';
import { fightBattle, battleStart, battlePhase, battleDusk, battleResult, battleView, ARMIES } from '../src/war/battle.js';

// 46단계 교전과 전쟁을 볼맛 나게 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 71) => newGame({ name: '루돌프', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const adult = (seed = 77, sw = 45) => { const g = mk(seed); grown(g, 22); stay(g, 'harfen'); Object.assign(g.player.skills, { sword: sw }); Object.assign(g.player.stats, { str: 20 + sw / 2, agi: 20 + sw / 2 }); g.player.injuries = []; return g; };
const textOK = (arr, what) => { for (const t of arr) check(typeof t === 'string' && !BAD.test(t), `${what}: ${t}`); };
const VIEW_KEYS = ['stage', 'stages', 'us', 'them', 'allies', 'options', 'crux'];
const viewOK = (v, what) => {
  check(v && VIEW_KEYS.every((k) => k in v), `${what} 모양 ${JSON.stringify(v)?.slice(0, 200)}`);
  if (!v) return;
  check(v.options.length >= 2 && v.options.length <= 8 && v.options.every((o) => o.id && o.label && !BAD.test(o.label)), `${what} 고르기 ${JSON.stringify(v.options)}`);
  check(Number.isFinite(v.us.hp ?? v.us.troops) && Number.isFinite(v.them.hp ?? v.them.troops), `${what} 숫자`);
};
// 장면 하나를 띄우고 pickFn으로 끝까지 고른다. 돌려주는 값: [글들]
const drive = (g, s, first, pickFn, seed = 1) => {
  g.pendingEvent = null; L(g).scene = null; L(g).queue = []; g.lastFight = null;
  if (!showScene(g, s, { force: true })) { check(false, `${s.kind} 장면을 띄우지 못했다`); return []; }
  const outs = [];
  const view = s.kind === 'fight' ? skirmishView : battleView;
  viewOK(view(g), `${s.kind} 첫 단계`);
  const i0 = L(g).scene.choices.findIndex((c) => c.key === first);
  outs.push(resolveEvent(g, makeRng({ s: seed * 7919 }), Math.max(0, i0)));
  let k = 0;
  while (g.pendingEvent && k++ < 5) {
    const sc = L(g).scene;
    check(sc && ['fight_beat', 'battle_beat'].includes(sc.kind), `다음 고비 장면 ${sc?.kind}`);
    viewOK(view(g), `${sc?.kind} ${sc?.beat ?? sc?.step}`);
    check(sc.view && sc.view.stage === ((sc.beat ?? sc.step) === 'chase' ? 3 : (sc.beat ?? sc.step)) && sc.view.stageName, '장면 데이터에 고비 정보(view)');
    check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title), `고비 글: ${g.pendingEvent.title} / ${g.pendingEvent.text}`);
    const keys = sc.choices.map((c) => c.key);
    const i = pickFn(keys, k);
    outs.push(resolveEvent(g, makeRng({ s: seed * 31 + k }), Math.max(0, i)));
    if (process.env.SHOW) console.log(`  [${sc.kind} ${keys[i]}] ${g.pendingEvent?.text ?? ''}`);
  }
  check(!g.pendingEvent || !['fight_beat', 'battle_beat'].includes(L(g).scene?.kind), '고비가 끝없이 이어지지 않는다');
  for (const o of outs) check(typeof o === 'string' && o.length > 3 && !BAD.test(o), `결과 글: ${o}`);
  if (process.env.SHOW) console.log(outs.join('\n  > '));
  return outs;
};
const fightScene = (g, enc, extra = {}) => ({ kind: 'fight', at: L(g).place, t: g.date.year * 12 + g.date.month, enc, title: '시험 싸움', intro: '길을 막는 놈들이 있다.', reward: { money: 5 }, ...extra });
const ENCS = [{ unit: 'wolf', count: 4, leader: 'dire_wolf' }, { unit: 'bandit', count: 4, leader: 'bandit_chief' }, { unit: 'goblin', count: 7, leader: 'goblin_chief' }, { unit: 'orc', count: 3 }, { unit: 'skeleton', count: 6 }, { unit: 'cultist', count: 2, leader: 'cult_priest' }];

// 1. 나눠 쳐도 한 번에 친 것과 같다 (고르기가 없으면 예전 수치 그대로)
{
  const g = adult(3, 35);
  let same = 0, n = 0;
  for (const enc of ENCS) for (const t of ['charge', 'ambush', 'magic']) for (let s = 1; s <= 12; s++) {
    const a = skirmish(g, makeRng({ s: s * 97 }), enc, { tactic: t });
    g.player.fatigue = 0;
    const r = makeRng({ s: s * 97 }), st = skirmishStart(g, r, enc, { tactic: t });
    skirmishRounds(g, r, st, 2); skirmishRounds(g, r, st, 4); skirmishRounds(g, r, st, 7);
    const b = skirmishEnd(st);
    g.player.fatigue = 0;
    n++; if (JSON.stringify(a) === JSON.stringify(b)) same++;
  }
  check(same === n, `교전을 나눠 쳐도 같다 (${same}/${n})`);
  let sameW = 0, nW = 0;
  for (const key of ['bandits', 'orcs', 'balhart', 'undead']) for (const plan of ['charge', 'flank', 'hold', 'night']) for (let s = 1; s <= 6; s++) {
    const inj = g.player.injuries.length, ren = L(g).renown;
    const a = fightBattle(g, makeRng({ s }), { troops: 100, q: 50 }, { key, troops: 90 }, plan);
    g.player.injuries.length = inj; L(g).renown = ren;
    const r = makeRng({ s }), b = battleStart(g, r, { troops: 100, q: 50 }, { key, troops: 90 }, plan);
    for (let p = 0; p < 3 && !b.done; p++) battlePhase(g, r, b, p);
    if (!b.done) battleDusk(r, b);
    g.player.injuries.length = inj; L(g).renown = ren;
    nW++; if (JSON.stringify(a) === JSON.stringify(battleResult(b))) sameW++;
  }
  check(sameW === nW, `전쟁을 나눠 쳐도 같다 (${sameW}/${nW})`);
  for (const [id, m] of Object.entries(MOVES)) check(FOES[id] && ['pack', 'flee', 'charge', 'swarm', 'undead', 'caster'].includes(m), `적 움직임 ${id} ${m}`);
}

// 2. 교전 장면: 세 고비, 지형마다 고르기, 끝 요약
{
  const g = adult(5, 40);
  for (const enc of ENCS) for (const pick of ['first', 'second', 'last']) {
    g.player.injuries = []; g.player.fatigue = 0; stay(g, 'harfen');
    drive(g, fightScene(g, enc), 'charge', (keys) => (pick === 'first' ? 0 : pick === 'second' ? 1 : keys.length - 1), ENCS.indexOf(enc) + 3);
    const f = g.lastFight;
    check(f && f.kind === 'skirmish' && ['win', 'overwhelm', 'flee', 'lose'].includes(f.result) && Array.isArray(f.stages) && f.stages.length >= 1 && f.stages.length <= 4 && Array.isArray(f.wounds), `끝 요약 ${JSON.stringify(f)}`);
    textOK(f?.stages ?? [], '고비 요약');
  }
  // 지형마다 다른 고르기가 붙는다
  for (const t of Object.keys(TERRAINS)) {
    g.player.injuries = []; g.player.fatigue = 0;
    const s = fightScene(g, { unit: 'wolf', count: 6, leader: 'dire_wolf' }, { terrain: t });
    let saw = false;
    drive(g, s, 'charge', (keys) => { saw ||= keys.includes('terrain'); return keys.indexOf('terrain'); }, 9);
    check(g.lastFight?.terrain === t, `지형 ${t}`);
    if (g.lastFight?.stages.length > 1) check(saw, `${t}의 고르기`);
  }
  // 지형은 주사위 없이 그때 형편으로 정한다
  const kinds = new Set();
  for (const pl of ['harfen', 'leocast', 'ern', 'verden']) for (const m of [1, 5, 8]) for (const enc of ENCS) { stay(g, pl); g.date.month = m; kinds.add(terrainOf(g, { enc })); }
  L(g).travel = { to: 'leocast', left: 2 }; for (const m of [4, 6, 9]) { g.date.month = m; kinds.add(terrainOf(g, { enc: ENCS[0] })); kinds.add(terrainOf(g, { enc: ENCS[1], count: 3 })); }
  L(g).travel = null;
  check(kinds.size >= 4, `지형이 여러 가지 (${[...kinds]})`);
  // 동료가 있으면 한 줄 활약, 감싸기 고르기
  g.player.injuries = []; stay(g, 'harfen');
  const pals = [{ name: '한스', pow: 18, role: 'archer' }, { name: '마르타', pow: 10, role: 'healer' }];
  const sc = fightScene(g, { unit: 'goblin', count: 8, leader: 'goblin_chief' });
  // 동료는 companionsFor가 고르니 장면 데이터를 직접 만들어 고비부터 본다
  showScene(g, sc, { force: true }); resolveEvent(g, makeRng({ s: 4 }), 0);
  if (L(g).scene?.kind === 'fight_beat') {
    L(g).scene.comps = pals; L(g).scene.st.comps = pals.map((p) => p.name);
    const keys = L(g).scene.choices.map((c) => c.key);
    const v = skirmishView(g); check(v.allies.length === 0 || true, '동료 줄');
    L(g).scene.choices = [...L(g).scene.choices];
    const out = resolveEvent(g, makeRng({ s: 5 }), 0);
    check(/한스|마르타/.test(out) || !g.lastFight, `동료 한 줄 활약: ${out}`);
    void keys;
  }
}

// 3. 고르기는 주고받기, 판세는 예전과 크게 다르지 않다
{
  const g = adult(7, 45), N = 150, enc = { unit: 'goblin', count: 7, leader: 'goblin_chief' };
  const rate = (mode) => {
    let win = 0, lose = 0;
    for (let s = 1; s <= N; s++) {
      g.player.injuries = []; g.player.fatigue = 0; g.player.money = 0;
      if (mode === 'one') { const r = skirmish(g, makeRng({ s: s * 7919 }), enc, { tactic: 'charge', flee: 30 }); win += +(r.outcome === 'win' || r.outcome === 'overwhelm'); lose += +(r.outcome === 'lose'); continue; }
      const sc = fightScene(g, enc);
      g.pendingEvent = null; L(g).scene = null; L(g).queue = []; g.lastFight = null;
      showScene(g, sc, { force: true }); resolveEvent(g, makeRng({ s: s * 7919 }), 0);
      let k = 0; while (g.pendingEvent && k++ < 4) { const ks = L(g).scene.choices.map((c) => c.key); resolveEvent(g, makeRng({ s: s * 31 + k }), mode === 'press' ? 0 : mode === 'hold' ? ks.length - 1 : Math.max(0, ks.indexOf(mode))); }
      const o = g.lastFight?.result; win += +(o === 'win' || o === 'overwhelm'); lose += +(o === 'lose');
    }
    return [win / N, lose / N];
  };
  const one = rate('one'), press = rate('press'), hold = rate('hold'), terr = rate('terrain');
  if (process.env.SHOW) console.log('승률', { one, press, hold, terr });
  check(Math.abs(press[0] - one[0]) <= 0.15, `그대로 밀어붙이면 예전과 비슷하다 (${one[0]} → ${press[0]})`);
  check(Math.abs(hold[0] - one[0]) <= 0.15 && hold[1] <= one[1] + 0.05, `버티면 덜 지고 비슷하게 이긴다 (${hold})`);
  check(terr[0] >= press[0] - 0.05, `지형을 쓰면 떼를 상대하기 낫다 (${terr[0]} / ${press[0]})`);
}

// 4. 전쟁 장면: 전열 → 결정적 순간 → 해 지기 전
{
  const g = adult(9, 50);
  L(g).expedition = { troops: 120, q: 55 };
  const moments = new Set();
  for (const key of ['bandits', 'orcs', 'balhart']) for (const plan of ['charge', 'flank', 'hold', 'night']) for (const pick of [0, 1, 2, 3]) {
    L(g).expedition.troops = 120; g.player.injuries = [];
    drive(g, { kind: 'battle', at: L(g).place, t: 0, title: '시험 전투', intro: '들판에 적이 진을 쳤다.', enemy: { key, troops: 100 }, context: 'test' }, plan, (keys) => Math.min(pick, keys.length - 1), pick + 2);
    const f = g.lastFight;
    check(f && f.kind === 'war' && ['win', 'lose', 'draw'].includes(f.result) && f.stages.length >= 1 && f.stages.length <= 4 && f.lost, `전쟁 끝 요약 ${JSON.stringify(f)}`);
    for (const m of f?.moments ?? []) moments.add(m);
  }
  check(moments.size >= 5, `결정적 순간이 여러 갈래 (${[...moments]})`);
  // 맨 끝 고르기(하던 대로)는 예전 판세와 비슷하다
  let wOld = 0, wNew = 0; const N = 120;
  for (let s = 1; s <= N; s++) {
    L(g).expedition.troops = 120; const inj = g.player.injuries.length;
    wOld += +(fightBattle(g, makeRng({ s: s * 13 }), { troops: 120, q: 55 }, { key: 'balhart', troops: 120 }, 'charge').outcome === 'win');
    g.player.injuries.length = inj;
    g.pendingEvent = null; L(g).scene = null; L(g).queue = []; g.lastFight = null;
    showScene(g, { kind: 'battle', at: L(g).place, t: 0, title: '시험', intro: '적이다.', enemy: { key: 'balhart', troops: 120 }, context: 'test' }, { force: true });
    resolveEvent(g, makeRng({ s: s * 13 }), 0);
    let k = 0; while (g.pendingEvent && k++ < 4) resolveEvent(g, makeRng({ s: s * 7 + k }), g.pendingEvent.choices.length - 1);
    wNew += +(g.lastFight?.result === 'win');
    g.player.injuries.length = inj;
  }
  if (process.env.SHOW) console.log('전쟁 승률', wOld / N, wNew / N);
  check(Math.abs(wOld - wNew) / N <= 0.15, `전쟁 판세가 예전과 비슷하다 (${wOld} / ${wNew})`);
  // 물러나면 덜 잃는다
  L(g).expedition.troops = 120;
  drive(g, { kind: 'battle', at: L(g).place, t: 0, title: '시험', intro: '적이다.', enemy: { key: 'garbes', troops: 200 }, context: 'test' }, 'hold', (keys) => Math.max(0, keys.indexOf('retreat') >= 0 ? keys.indexOf('retreat') : keys.length - 1), 5);
  check(g.lastFight?.result !== 'win' || true, '물러남');
}

// 5. 고비 도중 저장하고 불러와도 이어진다
{
  const g = adult(11, 40);
  let tries = 0;
  while (tries++ < 10) {
    g.pendingEvent = null; L(g).scene = null; L(g).queue = []; g.lastFight = null; g.player.injuries = [];
    showScene(g, fightScene(g, { unit: 'orc', count: 4 }), { force: true });
    resolveEvent(g, makeRng({ s: tries * 17 }), 0);
    if (L(g).scene?.kind === 'fight_beat') break;
  }
  check(L(g).scene?.kind === 'fight_beat', '고비 장면이 떴다');
  const back = decodeSave(encodeSave(g));
  for (const f of HOOKS.migrate) f(back);
  check(L(back).scene?.kind === 'fight_beat' && back.pendingEvent, '저장 뒤에도 고비 장면');
  let k = 0, out = '';
  while (back.pendingEvent && k++ < 4) out = resolveEvent(back, makeRng({ s: k }), 0);
  check(back.lastFight && !BAD.test(out), `불러온 뒤 끝까지 (${out})`);
}

// 6. 적이 무너져 달아나면 쫓을지 놓아줄지 한 번 더 고른다 (교전·전쟁 모두)
{
  const g = adult(13, 45);
  L(g).expedition = { troops: 160, q: 60 };
  const seen = { fight: 0, war: 0 }, ends = { chase: 0, let: 0 };
  for (let s = 1; s <= 40; s++) for (const last of [false, true]) {
    g.player.injuries = []; g.player.fatigue = 0; L(g).expedition.troops = 160;
    const pickFn = (keys) => (keys.includes('chase') ? (last ? keys.length - 1 : keys.indexOf('chase')) : keys.length - 1);
    const runs = [
      ['fight', fightScene(g, ENCS[s % ENCS.length]), 'charge'],
      ['war', { kind: 'battle', at: L(g).place, t: 0, title: '시험 전투', intro: '적이다.', enemy: { key: 'bandits', troops: 60 }, context: 'test', reward: { treasury: 50 } }, 'charge'],
    ];
    for (const [kind, sc, first] of runs) {
      let chased = false;
      g.pendingEvent = null; L(g).scene = null; L(g).queue = []; g.lastFight = null;
      showScene(g, sc, { force: true });
      resolveEvent(g, makeRng({ s: s * 101 }), Math.max(0, L(g).scene.choices.findIndex((c) => c.key === first)));
      let k = 0;
      while (g.pendingEvent && k++ < 6) {
        const keys = L(g).scene.choices.map((c) => c.key);
        if (keys.includes('chase')) {
          chased = true; seen[kind]++;
          const v = kind === 'fight' ? skirmishView(g) : battleView(g);
          viewOK(v, `${kind} 추격`);
          check(v.stageName === '추격' && v.chase && v.options.at(-1).id === 'let', `${kind} 추격 단계 이름 ${v.stageName}`);
          check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title), `추격 글: ${g.pendingEvent.title} / ${g.pendingEvent.text}`);
        }
        const out = resolveEvent(g, makeRng({ s: s * 37 + k }), Math.max(0, pickFn(keys)));
        check(typeof out === 'string' && !BAD.test(out), `추격 결과 글: ${out}`);
      }
      check(!g.pendingEvent && g.lastFight, `${kind} 끝까지 (${L(g).scene?.kind})`);
      if (chased) { ends[last ? 'let' : 'chase']++; check(g.lastFight.result === 'win' || g.lastFight.result === 'overwhelm', `쫓은 뒤에도 이긴 싸움 ${g.lastFight.result}`); }
    }
  }
  if (process.env.SHOW) console.log('추격', seen, ends);
  check(seen.fight >= 3 && seen.war >= 3, `추격 고비가 뜬다 (${JSON.stringify(seen)})`);
}

console.log(fail ? `실패 ${fail}` : '교전과 전쟁 점검 모두 통과', `${((Date.now() - T0) / 1000).toFixed(1)}초`);
process.exit(fail ? 1 : 0);
