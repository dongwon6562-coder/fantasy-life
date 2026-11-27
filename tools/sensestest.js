// 몸으로 느끼는 삶(src/senses/) 점검. 브라우저 없이 1분 안에.
//   node tools/sensestest.js [-v]
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { feelOf, weaveMonth, monthFeel, sensesLine, sceneLine, sensesInfo, sensesState, kindOf } from '../src/senses/index.js';
import { LINES, FIRSTS, ACT_KIND } from '../src/senses/data.js';
import { ACTIONS } from '../src/actions.js';

const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)/.test(t);
const t0 = Date.now();

// 0. 글 묶음: 가리키는 행동이 실제로 있고, 결 이름이 맞다
const ids = new Set(ACTIONS.map((a) => a.id));
for (const id of Object.keys(ACT_KIND)) if (!ids.has(id)) fail('ACT_KIND unknown action', id);
for (const fi of FIRSTS) for (const id of fi.acts) if (!ids.has(id)) fail('FIRSTS unknown action', fi.id, id);
const KINDS = new Set(['field', 'site', 'wild', 'still', 'depths', 'out', 'train', 'hunt', 'trade', 'kitchen', 'forge', 'study', 'magic', 'pray', 'rest', 'family', 'play', 'poor', 'road', 'sea', 'mine', 'home']);
for (const v of Object.values(ACT_KIND)) if (!KINDS.has(v)) fail('bad kind', v);
for (const e of LINES) if (e.k !== '*') for (const k of e.k) if (!KINDS.has(k)) fail('bad line kind', k);
// 48단계: 공사장·들 일에 밭 이야기가 끼지 않는다
for (const e of LINES) if (Array.isArray(e.k) && (e.k.includes('site') || e.k.includes('wild')) && typeof e.t === 'string' && /밭|고랑|괭이|이랑/.test(e.t)) fail('farm line on site/wild', e.t);

// 1. 모든 줄을 가능한 형편에 대 보며 글이 깨지지 않는지 (함수 줄은 여러 이름으로)
const sample = { age: 30, season: '겨울', weather: 'snow', tod: 'dawn', month: 1, place: 'ern', hurt: 'leg', hurtName: '멧돼지 엄니에 찢긴 허벅지', spouse: '마리엔', kids: 2 };
for (const e of LINES) {
  for (const nm of ['멧돼지 엄니에 찢긴 허벅지', '피를 뽑은 팔', '잿빛 열병']) {
    const t = typeof e.t === 'function' ? e.t({ ...sample, hurtName: nm }) : e.t;
    if (bad(t) || josa(t) || /너는|네가|너의/.test(t)) fail('line text', t);
  }
}

// 2. 실제로 몇 해 돌려 보기: 글이 붙고, 깨지지 않고, 같은 줄이 연달아 나오지 않는다
function month(g, want = []) {
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = want.map((id) => acts.find((x) => x.id === id)).find(Boolean);
    if (!a || g.player.fatigue > 75) a = acts.find((x) => x.id === 'rest') ?? acts[0];
    if (!a) break;
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) { if (bad(r.text)) fail('bad result', r); if (josa(r.text)) fail('josa result', r); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 6) {
    const pe = g.pendingEvent;
    resolveEvent(g, rngOf(g), rngOf(g).int(0, pe.choices.length - 1));
  }
  return res;
}
const g = newGame({ seed: 3001, familyId: 'farmer', name: '하넬', sex: 'm', mode: 'free' });
let woven = 0, firstsSeen = new Set(), lines = 0;
const counts = {};
const summaryLines = [];
for (let m = 0; m < 12 * 22 && !g.over; m++) {
  const age = playerAge(g);
  const want = age < 7 ? ['play', 'help_home'] : age < 14 ? ['help_home', 'study', 'sword_father', 'day_labor', 'play'] : ['day_labor', 'work', 'help_home', 'trade_market', 'voc_traps', 'wilds_hunt', 'nature_harvest', 'rest'];
  const res = month(g, want);
  for (const r of res) if (r.first) firstsSeen.add(r.first);
  const sl = sensesLine(g);
  if (sl) { lines++; summaryLines.push(sl); if (bad(sl) || josa(sl)) fail('summary', sl); }
}
const S = sensesState(g);
for (const r of S.recent) counts[r] = (counts[r] ?? 0) + 1;
if (!firstsSeen.size) fail('no first-time scenes', [...firstsSeen]);
if (!firstsSeen.has('wage')) fail('no first wage', [...firstsSeen]);
if (lines < 100) fail('summary lines too few', lines);
// 첫 일은 한 번씩만
const hist = me(g).history.map((h) => h.text);
for (const fi of FIRSTS) { const n = hist.filter((t) => t === fi.hist).length; if (n > 1) fail('first twice', fi.id, n); }
if (verbose) { console.log('firsts', [...firstsSeen]); console.log(summaryLines.slice(-6).join('\n')); }

// 3. 맥락 고리를 직접: 다친 다리 + 겨울 새벽 밭일 → 다리 줄이나 새벽 줄이 붙는다
{
  const h = newGame({ seed: 77, familyId: 'farmer', name: '로안', sex: 'f', mode: 'free' });
  me(h).ageMonths = 30 * 12;
  h.player.injuries = [{ name: '멧돼지 엄니에 찢긴 허벅지', months: 3 }];
  let hits = 0, any = 0;
  for (let k = 0; k < 40; k++) {
    h.date.year = 505 + k; h.date.month = 1;
    const r = [{ name: '남의 밭 품팔이', text: '남의 밭에서 돌을 골랐다. (농사 +0.4)' }];
    const out = weaveMonth(h, r, makeRng({ s: 1000 + k }));
    if (out.length) any++;
    if (/허벅지|다리|겨울 새벽|얼어붙은|눈/.test(r[0].text)) hits++;
    if (!/\(농사 \+0\.4\)$/.test(r[0].text)) fail('gains moved', r[0].text);
    if (bad(r[0].text) || josa(r[0].text)) fail('woven text', r[0].text);
  }
  if (any < 15) fail('context rarely woven', any);
  if (hits < 10) fail('context not fitting', hits);
  const f = feelOf(h);
  if (f.hurt !== 'leg') fail('hurt kind', f.hurt);
  const sc = sceneLine(h);
  if (!sc || bad(sc) || !/시큰/.test(sc)) fail('sceneLine hurt', sc);
  const mf = monthFeel(h);
  if (!/허벅지/.test(mf)) fail('monthFeel hurt', mf);
  // 아기·아이에게 맞지 않는 줄은 붙지 않는다
  me(h).ageMonths = 5 * 12; h.player.injuries = [];
  for (let k = 0; k < 30; k++) {
    h.date.year = 600 + k; h.date.month = 7;
    const r = [{ name: '뛰어놀기', text: '개울가에서 놀았다.' }];
    weaveMonth(h, r, makeRng({ s: 50 + k }));
    if (/괭이|술|품삯|돈 걱정|방값|배우자/.test(r[0].text)) fail('child got adult line', r[0].text);
  }
}

// 4. 대를 이은 어른, 예전 저장: '처음'이 갑자기 붙지 않는다
{
  const h = newGame({ seed: 91, familyId: 'merchant', name: '테오', sex: 'm', mode: 'free' });
  me(h).ageMonths = 35 * 12;
  delete h.senses;
  runHooks('migrate', h);
  const r = [{ name: '남의 밭 품팔이', text: '품을 팔았다.' }];
  weaveMonth(h, r, makeRng({ s: 5 }));
  if (r[0].first) fail('first on migrated adult', r[0].text);
  if (!sensesInfo(h).firsts.length) fail('migrated firsts not marked');
}

// 5. sceneLine은 늘 한 줄을 돌려준다(게임이 끝나면 null)
{
  const h = newGame({ seed: 5, familyId: 'farmer', name: '이나', sex: 'f', mode: 'free' });
  for (let k = 0; k < 48; k++) { h.date.year = 505 + Math.floor(k / 12); h.date.month = 1 + (k % 12); const s = sceneLine(h); if (!s || bad(s) || josa(s)) fail('sceneLine', h.date, s); }
  h.over = true; if (sceneLine(h) !== null) fail('sceneLine after over');
}

const sec = (Date.now() - t0) / 1000;
if (sec > 60) fail('too slow', sec);
if (problems) { console.log(`sensestest: ${problems} problems`); process.exit(1); }
console.log(`sensestest OK (${sec.toFixed(1)}s, 처음 ${firstsSeen.size}가지, 달 요약 ${lines}줄)`);
