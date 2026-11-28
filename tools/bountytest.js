import '../src/content.js';
// 50단계 현상금 사냥꾼 (도우미4). 씨앗 운에 기대지 않게 방과 장면은 직접 만들고, 선택지를 하나씩 다 눌러 본다.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, queueScene } from '../src/adventure/core.js';
import { reportCrime } from '../src/crime.js';
import { bountyInfo, bountyLine, bountyState, makeHuntPost } from '../src/bounty/index.js';
import { ACTIONS } from '../src/actions.js';

let bad = 0;
const fail = (...a) => { bad++; console.log('FAIL', ...a); };
const t0 = Date.now();
const BAD = /undefined|NaN|null|\[object|을\(를\)|이\(가\)|은\(는\)|\$\{/;
const me = (g) => g.people.find((p) => p.isPlayer);
const act = (id) => ACTIONS.find((a) => a.id === id);
function hunter(seed, place = 'harfen') {
  const g = newGame({ name: '점검', sex: seed % 2 ? 'm' : 'f', familyId: 'farmer', mode: 'free', seed });
  me(g).ageMonths = 24 * 12;
  Object.assign(g.player.stats, { str: 36, agi: 34, int: 30, cha: 30, wil: 30, sen: 34 });
  g.player.skills.sword = 30;
  g.life.place = place; g.life.home = 'inn'; g.player.money = 200;
  return g;
}
const month = (g, ids = ['rest']) => { g.pendingEvent = null; endMonth(g, Array.from({ length: slotsFor(g) }, (_, i) => ({ id: ids[i % ids.length] }))); };
const seen = {};
function show(g, kind, data, idx) {
  g.pendingEvent = null; L(g).queue = []; L(g).scene = null;
  queueScene(g, kind, data, { first: true });
  month(g);
  // 다른 사건이 먼저 떠 있으면 넘기고 이 장면이 뜰 때까지 기다린다
  for (let k = 0; k < 8 && g.pendingEvent && L(g).scene?.kind !== kind; k++) resolveEvent(g, rngOf(g), 0);
  const pe = g.pendingEvent;
  if (!pe || L(g).scene?.kind !== kind) return null;
  seen[kind] = (seen[kind] ?? 0) + 1;
  for (const x of [pe.title, pe.text, ...pe.choices.map((c) => c.label ?? c)]) if (BAD.test(String(x))) fail('bad scene text', kind, x);
  if (pe.choices.length > 8) fail('too many choices', kind, pe.choices.length);
  if (idx >= pe.choices.length) return { n: pe.choices.length };
  const o = resolveEvent(g, rngOf(g), idx);
  if (BAD.test(String(o ?? ''))) fail('bad outcome', kind, o);
  return { n: pe.choices.length, o };
}
const join = (g) => { const a = act('bh_join'); if (!a.available(g)) return false; a.run(g, rngOf(g)); return bountyState(g).me.member; };
function takePost(g, p) { const s = bountyState(g); p.by = 'me'; p.takenAt = 0; s.me.hunt = p.id; s.me.clue = 0; s.me.known = false; }

// 1) 조합: 지부 있는 고장에서만, 쫓기는 몸이면 못 들어간다
{
  const g = hunter(5000, 'ern');
  if (act('bh_join').available(g)) fail('join without hall');
  g.life.place = 'harfen';
  if (!join(g)) fail('join');
  const g2 = hunter(5001); reportCrime(g2, 'assault', 'harfen');
  if (act('bh_join').available(g2)) fail('wanted person can join');
  const g3 = hunter(5002); me(g3).ageMonths = 15 * 12;
  if (act('bh_join').available(g3)) fail('child can join');
}

// 2) 게시판: 방이 붙고 떼면 내 사냥감이 된다, 화면 묶음
{
  const g = hunter(5010); join(g);
  for (let i = 0; i < 3; i++) makeHuntPost(g, rngOf(g), 'harfen');
  for (const p of bountyState(g).posts) p.need = 0;
  if (!act('bh_board').available(g)) fail('board not available');
  const r = show(g, 'bh_board', {}, 0);
  if (!r) fail('board scene did not show');
  const info = bountyInfo(g);
  for (const k of ['place', 'board', 'chase', 'me']) if (!(k in info)) fail('info key', k);
  if (!info.chase) fail('hunt not taken');
  else for (const k of ['name', 'crime', 'reward', 'trail', 'near', 'left']) if (!(k in info.chase)) fail('chase key', k);
  for (const k of ['rank', 'merit', 'next', 'nextRank', 'caught', 'killed', 'wrong', 'earned', 'rivals', 'grudges', 'log']) if (!(k in info.me)) fail('me key', k);
  JSON.stringify(info, (k, v) => { if (typeof v === 'string' && BAD.test(v)) fail('info text', k, v); return v; });
}

// 3) 흔적 쫓기: 다른 고장에 숨었으면 행방을 알아내고, 그 고장에 가면 마주한다
{
  const g = hunter(5020); join(g);
  const p = makeHuntPost(g, rngOf(g), 'harfen'); p.loc = 'verden'; p.need = 0; takePost(g, p);
  let k = 0;
  while (!bountyState(g).me.known && k++ < 12) { p.loc = 'verden'; act('bh_track').run(g, rngOf(g)); }
  if (!bountyState(g).me.known) fail('never learned where');
  if (act('bh_track').available(g)) fail('track still available away from quarry');
  if (!p.trail.length) fail('no trail');
  g.life.place = 'verden';
  if (!act('bh_track').available(g)) fail('track not available at quarry town');
  act('bh_track').run(g, rngOf(g));
  if (!L(g).queue.some((x) => x.kind === 'bh_corner')) fail('corner not queued');
  const l = bountyLine(g); if (l != null && (typeof l !== 'string' || BAD.test(l))) fail('bountyLine', l);
}

// 4) 마주하기: 선택지마다 다 눌러 본다 (맞는 사람/엉뚱한 사람, 생사 불문/산 채로만)
let seed = 5030;
for (const wrong of [false, true]) for (const kind of ['killer', 'witch', 'debtor']) for (let c = 0; c < 6; c++) {
  const g = hunter(seed++); join(g);
  const p = makeHuntPost(g, rngOf(g), 'harfen'); Object.assign(p, { kind, loc: 'harfen', need: 0, wrong, dead: kind === 'killer', pow: 10, until: 999999 }); takePost(g, p);
  bountyState(g).me.known = true;
  const r = show(g, 'bh_corner', { post: p.id }, c);
  if (!r) { fail('corner did not show', kind); continue; }
  for (let k = 0; k < 4 && g.pendingEvent; k++) { const o = resolveEvent(g, rngOf(g), 0); if (BAD.test(String(o ?? ''))) fail('bad follow outcome', o); }
}
{
  // 잡으면 상금과 이름값, 식구가 남는다
  const g = hunter(5070); join(g);
  const p = makeHuntPost(g, rngOf(g), 'harfen'); Object.assign(p, { kind: 'debtor', loc: 'harfen', need: 0, wrong: false, pow: -50, until: 999999, reward: 30 }); takePost(g, p);
  const m0 = g.player.money; bountyState(g).me.known = true;
  show(g, 'bh_corner', { post: p.id }, 0);
  const s = bountyState(g);
  if (p.end !== 'caught' || s.me.caught !== 1 || s.me.earned < 30) fail('capture pay', p.end, s.me.caught, s.me.earned, m0);
  if (!s.kin.length) fail('no kin after capture');
  // 엉뚱한 사람: 상금이 없고 진짜는 다른 데로
  const q = makeHuntPost(g, rngOf(g), 'harfen'); Object.assign(q, { kind: 'debtor', loc: 'harfen', need: 0, wrong: true, pow: -50, until: 999999 }); takePost(g, q);
  const e1 = s.me.earned; s.me.known = true;
  show(g, 'bh_corner', { post: q.id }, 0);
  if (q.end || s.me.wrong !== 1 || s.me.earned !== e1) fail('wrong man', q.end, s.me.wrong, s.me.earned - e1);
}

// 5) 경쟁 사냥꾼과 식구 장면
for (let c = 0; c < 4; c++) {
  const g = hunter(5080 + c); join(g); month(g);
  const s = bountyState(g), p = makeHuntPost(g, rngOf(g), 'harfen'); Object.assign(p, { loc: 'verden', need: 0, until: 999999 }); takePost(g, p);
  if (!show(g, 'bh_rival', { post: p.id, rival: s.rivals[0].id }, c)) fail('rival did not show');
}
for (const how of ['caught', 'killed', 'wrong']) for (let c = 0; c < 4; c++) {
  const g = hunter(5090 + c); join(g);
  const s = bountyState(g); s.kin.push({ name: '헬가', rel: '아내', of: '외눈 한스', how, at: 1, done: false });
  const r = show(g, 'bh_kin', { kin: '헬가', of: '외눈 한스', when: 1 }, c);
  if (!r && c === 0) fail('kin did not show', how);
}
for (const k of ['bh_board', 'bh_corner', 'bh_rival', 'bh_kin']) if (!seen[k]) fail('never saw', k);

// 6) 이름값이 차면 등급이 오르고, 내 목에 현상금이 걸리면 쫓겨난다
{
  const g = hunter(5100); join(g);
  bountyState(g).me.pts = 7; month(g);
  if (bountyState(g).me.rank !== 1) fail('rank up', bountyState(g).me.rank);
  reportCrime(g, 'assault', 'harfen'); month(g);
  if (bountyState(g).me.member) fail('not expelled when wanted');
}

// 7) 플레이어 없이도 방이 붙고, 경쟁자가 떼고, 기한이 지나면 거두어진다
{
  const g = newGame({ name: '점검', sex: 'f', familyId: 'merchant', mode: 'free', seed: 5110 });
  for (let m = 0; m < 120; m++) month(g);
  const s = bountyState(g), ends = {};
  for (const p of s.posts) ends[p.end ?? 'open'] = (ends[p.end ?? 'open'] ?? 0) + 1;
  if (s.made < 20) fail('few posts', s.made);
  if (!ends.rival) fail('rivals never caught anyone', JSON.stringify(ends));
  if (!ends.open) fail('no open posts');
  if (s.rivals.filter((r) => !r.gone).length < 3) fail('rivals');
  if (s.posts.length > 80) fail('posts pile up', s.posts.length);
  // 옥살이 갈래에서 갓 탈옥한 진짜 사람은 방에 오른다
  const q = g.people.find((p) => p.alive && !p.isPlayer && p.ageMonths > 20 * 12);
  g.prison ??= {}; (g.prison.npc ??= []).push({ id: q.id, place: 'leocast', how: 'escaped', end: g.date.year * 12 + g.date.month });
  for (let i = 0; i < 12 && !s.posts.some((p) => p.pid === q.id); i++) makeHuntPost(g, rngOf(g), 'leocast');
  if (!s.posts.some((p) => p.pid === q.id && p.kind === 'escapee')) fail('real escapee never posted');
  const l = bountyLine(g); if (l != null && typeof l !== 'string') fail('line type');
}

// 8) 대를 이으면 패와 맡은 방은 남지 않는다
{
  const g = hunter(5120); join(g);
  const p = makeHuntPost(g, rngOf(g), 'harfen'); takePost(g, p);
  const { HOOKS } = await import('../src/hooks.js');
  for (const f of HOOKS.heir) { try { f(g, rngOf(g), me(g)); } catch { /* 다른 갈래의 대 잇기는 여기서 안 본다 */ } }
  if (bountyState(g).me.member || bountyState(g).me.hunt != null || p.by != null) fail('heir reset');
}

// 9) 새 행동은 뜻 있는 형편에서만 보인다
{
  const g = hunter(5130, 'ern');
  const ids = availableActions(g).map((a) => a.id).filter((x) => /^bh_/.test(x));
  if (ids.length) fail('bh actions where they mean nothing', ids);
}

// 11) 한 사람은 한 장만: 잡혀 넘어간 이름은 다시 붙지 않고, 게시판에 같은 이름이 둘 붙지 않는다
{
  const g = hunter(5013); join(g);
  const s = bountyState(g), r = rngOf(g);
  const first = makeHuntPost(g, r, 'harfen'); Object.assign(first, { kind: 'debtor', loc: 'harfen', need: 0, wrong: false, pow: -50, until: 999999 }); takePost(g, first);
  s.me.known = true; show(g, 'bh_corner', { post: first.id }, 0);
  if (first.end !== 'caught') fail('setup capture', first.end);
  for (let i = 0; i < 300; i++) {
    const p = makeHuntPost(g, r, 'harfen');
    if (p.name === first.name) { fail('caught man posted again', p.name); break; }
    if (i % 3 === 0) { p.end = 'rival'; s.taken.push(p.name); }
    if (s.posts.length > 60) s.posts = s.posts.filter((x) => !x.end || x === first);
  }
  const open = s.posts.filter((p) => !p.end).map((p) => p.name);
  if (new Set(open).size !== open.length) fail('same name twice on board', open.length - new Set(open).size);
  for (let m = 0; m < 240; m++) month(g);
  const names = s.posts.filter((p) => !p.end).map((p) => p.name);
  if (new Set(names).size !== names.length) fail('same name twice after years');
}

// 10) 50단계 장면(현상금·마녀·마을 회의)은 제 판을 고른다
{
  const { BH_ART, WI_ART, CN_ART } = await import('../src/art/vignettePlates27.js');
  const { vignetteFor } = await import('../src/art/vignette.js');
  if (Object.keys(WI_ART).length < 7 || Object.keys(CN_ART).length < 8) fail('art tables short');
  const g = hunter(5140); month(g);
  for (const [k, want] of Object.entries({ ...BH_ART, ...WI_ART, ...CN_ART })) {
    L(g).scene = { kind: k }; g.pendingEvent = { id: 'life_scene', title: '장면', text: '', choices: [] };
    const v = vignetteFor(g, { title: '장면', text: '' });
    if (!v || `${v.plate}:${v.variant}` !== want) fail('plate50', k, v && `${v.plate}:${v.variant}`, want);
  }
}

console.log('장면', JSON.stringify(seen));
console.log(bad ? `bountytest: ${bad} problems` : `bountytest OK (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(bad ? 1 : 0);
