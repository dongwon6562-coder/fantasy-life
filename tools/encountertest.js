import './lsshim.js';
import '../src/content.js';
// 30단계 도우미2 점검: 먼저 다가오는 사람들. 여러 삶을 짧게 돌려 이번 달 마주친 사람들 줄이 나오는지,
// 글이 깨지지 않는지(undefined·조사), 되풀이가 적은지, 오랜만·내 일·소문·이웃끼리·부탁·빚 갚기가 다 나오는지 본다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT } from '../src/adventure/core.js';
import { encounterState, encounterLines, encounterInfo, encounterLine } from '../src/encounter/index.js';
import { deed } from '../src/repute/index.js';

SCENE_STRICT.on = true;
globalThis.__ENC_STRICT = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|  /.test(t);
const kinds = {};
const scenes = {};
const texts = [];
const samples = {};
let months = 0; let withLine = 0;

function resolveAll(g) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const kind = L(g).scene?.kind ?? pe.id;
    scenes[kind] = (scenes[kind] ?? 0) + 1;
    if (kind === 'enc_ask') ok(!bad(pe.title) && !bad(pe.text) && pe.choices.every((c) => !bad(c)), `bad ask: ${pe.title} | ${pe.text} | ${pe.choices}`);
    const idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (kind === 'enc_ask') { ok(!bad(String(out)), `bad ask out: ${out}`); (samples.ask ??= []).push(`${pe.text.slice(0, 60)} → ${String(out).slice(0, 80)}`); }
  }
}
function play(seed, years, family) {
  const g = newGame({ name: seed % 3 ? '바우' : '엘린', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed });
  const rng = rngOf(g);
  for (let m = 0; m < years * 12 && !g.over; m++) {
    const acts = availableActions(g);
    const n = slotsFor(g);
    const choices = [];
    for (let i = 0; i < n && acts.length; i++) choices.push({ id: rng.pick(acts).id });
    // 가끔 좋은 일·나쁜 일이 소문나게
    if (playerAge(g) >= 16 && rng.chance(0.03)) deed(g, rng.pick(['kind', 'honest', 'brave', 'generous']), rng.chance(0.5) ? 8 : -9, rng.pick(['다친 나그네를 업고 의원까지 갔다더라', '장터에서 남의 물건에 손을 댔다더라', '늑대를 혼자 쫓아냈다더라']));
    endMonth(g, choices);
    resolveAll(g);
    if (g.over) break;
    months++;
    const lines = encounterLines(g);
    ok(Array.isArray(lines) && lines.length <= 2, 'lines shape');
    if (lines.length) withLine++;
    for (const x of lines) {
      ok(!bad(x.text), `bad line [${x.kind}]: ${x.text}`);
      kinds[x.kind] = (kinds[x.kind] ?? 0) + 1;
      if (x.kind === 'gossip' && x.name) ok(!(x.text.match(/"([^"]+)"/)?.[1] ?? '').includes(x.name), `자기 이야기를 남처럼: ${x.text}`);
      ok(!/미역|배냇|첫돌/.test(x.text), `세계와 안 맞는 말: ${x.text}`);
      texts.push(x.text.replace(/[가-힣]+ [가-힣]+ /, ''));
      (samples[x.kind] ??= []).length < 4 && samples[x.kind].push(`${playerAge(g)}살: ${x.text}`);
    }
    const one = encounterLine(g);
    ok(one === null || typeof one === 'string', 'line');
  }
  const info = encounterInfo(g);
  ok(Array.isArray(info.recent), 'info');
  const e = encounterState(g);
  ok(Object.keys(e.seen).length < 400, `seen grows ${Object.keys(e.seen).length}`);
  ok(Object.keys(e.ties).length <= 17, 'ties grow');
  return g;
}

const fams = ['farmer', 'merchant', 'fallen_knight'];
for (let s = 1; s <= 9; s++) play(500 + s, 34, fams[s % 3]);

// 옛 저장(encounter 없음)도 깨지지 않아야 한다
{
  const g = newGame({ name: '바우', sex: 'm', familyId: 'farmer', mode: 'free', seed: 77 });
  delete g.encounter;
  ok(encounterLines(g).length === 0, 'old save lines');
  endMonth(g, []);
  ok(Array.isArray(encounterState(g).month), 'old save month');
}

const share = withLine / Math.max(1, months);
const uniq = new Set(texts).size / Math.max(1, texts.length);
console.log('달마다 줄이 나온 비율', share.toFixed(2), '서로 다른 글 비율', uniq.toFixed(2), '줄', texts.length);
console.log('갈래', JSON.stringify(kinds));
console.log('장면', JSON.stringify(Object.fromEntries(Object.entries(scenes).filter(([k]) => k.startsWith('enc')))));
for (const [k, v] of Object.entries(samples)) for (const t of v.slice(0, 3)) console.log(`  [${k}] ${t}`);
ok(share > 0.5, `줄이 너무 드묾 ${share}`);
ok(uniq > 0.6, `되풀이가 많음 ${uniq}`);
for (const k of ['greet', 'mine', 'reunion', 'theirs', 'witness', 'between']) ok((kinds[k] ?? 0) > 0, `${k} 없음`);
ok((scenes.enc_ask ?? 0) > 0, '부탁 장면 없음');
const sec = (Date.now() - t0) / 1000;
console.log(`${sec.toFixed(1)}초`);
ok(sec < (process.env.FL_PARALLEL ? 120 : 60), '1분 넘음');
if (fail) { console.log(`encountertest: ${fail} FAIL`); process.exit(1); }
console.log('encountertest OK');
