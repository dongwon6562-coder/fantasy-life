import '../src/content.js';
// 영지·전쟁·건국(갈래 D 3단계)을 브라우저 없이 돌려 보는 점검.
// 스무 살까지 평범하게 살린 뒤 정기사로 만들어 영지를 받게 하고, 수십 년 다스리게 한다.
// 일부는 왕국 전쟁을 일으키고, 일부는 잊힌 땅으로 원정을 보낸다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L, showScene } from '../src/adventure/core.js';
import { D, domainTitle } from '../src/domain/state.js';
import { domainLine } from '../src/domain/rule.js';

const verbose = process.argv.includes('-v');
let problems = 0;
const seen = { scenes: new Set(), events: new Set(), outcomes: {}, ranks: 0, nations: 0, fiefs: 0, builds: new Set(), maxPop: 0 };
const samples = [];
const D_KINDS = ['fief_grant', 'buy_title', 'domain_rule', 'domain_build', 'domain_event', 'battle', 'domain_rank', 'civil_side', 'pioneer', 'nation_name'];
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const PREF = ['domain_rule', 'domain_rule', 'domain_build', 'domain_build', 'work', 'rest', 'buy_title'];

function month(g, wanted = PREF) {
  const rng = rngOf(g);
  const acts = availableActions(g);
  const ids = new Set(acts.map((a) => a.id));
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    const w = wanted.filter((id) => ids.has(id));
    const want = w.length && rng.chance(0.7) ? rng.pick(w) : null;
    const plain = acts.filter((x) => !x.needsTarget && !['pioneer', 'buy_title'].includes(x.id));
    let a = want ? acts.find((x) => x.id === want) : rng.pick(plain.length ? plain : acts);
    if (g.player.fatigue > 75) a = acts.find((x) => x.id === 'rest') ?? a;
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) if (bad(r.text)) { problems++; console.log('bad result', r); }
  for (const n of g.news) if (bad(n.text)) { problems++; console.log('bad news', n); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 3) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (pe.id === 'life_scene') {
      seen.scenes.add(s?.kind);
      if (s?.kind === 'domain_event') seen.events.add(s.ev);
    }
    if (bad(pe.text) || bad(pe.title) || pe.choices.some(bad)) { problems++; console.log('bad scene', pe.title, pe.text, pe.choices); }
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (s && ['fief_grant', 'pioneer', 'buy_title', 'domain_rank', 'heir'].includes(s.kind)) idx = 0;
    if (s?.kind === 'battle') idx = rngOf(g).int(0, Math.min(3, pe.choices.length - 1)); // 대개는 싸운다
    const pop = D(g)?.pop;
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) { problems++; console.log('bad scene text', pe.title, JSON.stringify(out)); }
    if (s?.kind === 'battle') { const o = /이겼다|무너졌다\. 남은|깃발이 쓰러졌다/.test(out) ? 'win' : /퇴각|물러났다\./.test(out) ? 'lose' : 'other'; seen.outcomes[s.context] = (seen.outcomes[s.context] ?? 0) + 1; }
    if (s?.kind === 'domain_rank') seen.ranks++;
    if (s && D_KINDS.includes(s.kind) && samples.length < 40 && (s.kind !== 'domain_rule' || rngOf(g).chance(0.1))) samples.push(`[${pe.title}] ${out}`);
    void pop;
  }
  const d = D(g);
  if (d) {
    for (const k of ['pop', 'morale', 'order', 'treasury', 'garrison', 'quality', 'favor', 'unrest']) if (!Number.isFinite(d[k])) { problems++; console.log('bad domain', k, d[k]); }
    if (d.garrison < 0 || d.pop < 30) { problems++; console.log('domain out of range', d.garrison, d.pop); }
    for (const b of Object.keys(d.buildings)) seen.builds.add(b);
    seen.maxPop = Math.max(seen.maxPop, d.pop);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) { problems++; console.log('bad money', g.player.money); }
}

function grow(g) { while (playerAge(g) < 21 && !g.over) month(g, ['work', 'rest']); }

function makeKnight(g, order = 'verden') {
  const life = L(g);
  life.fac.knights = { member: true, order, rank: 2, merit: 320 };
  life.job = { id: 'knight', place: order, months: 40, merit: 0 };
  life.place = order; life.home = 'barracks'; life.travel = null;
  life.renown = Math.max(life.renown, 28);
  g.player.skills.sword = Math.max(g.player.skills.sword, 55);
}

// 1) 기사 → 영지 → 다스리기 (일부는 전쟁)
for (let run = 0; run < 12 && true; run++) {
  const g = newGame({ name: '영주', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'fallen_knight', 'merchant'][run % 3], mode: 'free', seed: 9100 + run });
  grow(g);
  if (g.over) continue;
  makeKnight(g, run % 4 === 3 ? 'leocast' : 'verden');
  for (let m = 0; m < 12 * 40 && !g.over; m++) {
    if (m === 6 && !D(g)) { L(g).queue.unshift({ kind: 'fief_grant', liege: 'verden', at: L(g).place }); }
    if (run % 3 === 1 && m >= 60 && m < 96) { g.realm.balhart.war = true; if (m === 60) g.realm.balhart.front = 0; }
    if (run % 3 === 2 && m >= 90 && m < 120) { g.realm.succession = 'civilwar'; if (m === 90) g.realm.civilWarMonths = 0; }
    if (D(g) && m % 24 === 0) L(g).renown += 6; // 이름은 다른 데서도 쌓인다
    month(g);
    if (D(g) && !seen.fiefRun?.has(run)) { (seen.fiefRun ??= new Set()).add(run); seen.fiefs++; }
    if (m % 53 === 0) { const copy = JSON.parse(JSON.stringify(g)); setNextId(copy.nextId); runHooks('migrate', copy); if (D(g) && !copy.domain) { problems++; console.log('domain lost on migrate'); } }
  }
  console.log(`#${run} age=${playerAge(g)} over=${g.over} gen=${L(g).gen} ${domainLine(g) ?? '영지 없음'} 작위=${domainTitle(g) ?? '-'} renown=${L(g).renown}`);
}

// 2) 잊힌 땅 원정 → 나라
for (let run = 0; run < (Number(process.env.EXP) || 24); run++) {
  const g = newGame({ name: '개척자', sex: run % 2 ? 'm' : 'f', familyId: 'fallen_knight', mode: 'free', seed: 9300 + run });
  grow(g);
  if (g.over) continue;
  makeKnight(g);
  L(g).fac.knights.rank = 1; // 원정 전에 영지를 받지 않도록
  L(g).renown = 60;
  g.player.money += 800;
  for (let m = 0; m < 12 * 30 && !g.over; m++) {
    month(g, D(g)?.nation ? PREF : ['pioneer', 'rest', 'on_road']);
    if (D(g)?.nation && !seen.natRun?.has(run)) { (seen.natRun ??= new Set()).add(run); seen.nations++; }
  }
  console.log(`원정 #${run} age=${playerAge(g)} ${domainLine(g) ?? '나라 없음'} 작위=${domainTitle(g) ?? '-'}`);
}

console.log(`장면: ${[...seen.scenes].join(',')}`);
console.log(`영지 사건: ${[...seen.events].join(',')}`);
console.log(`전투(맥락별): ${JSON.stringify(seen.outcomes)} · 작위 장면 ${seen.ranks} · 영지 ${seen.fiefs} · 나라 ${seen.nations} · 지은 것 ${[...seen.builds].join(',')} · 최대 영민 ${seen.maxPop}`);
if (verbose) for (const s of samples) console.log('·', s);
for (const k of ['fief_grant', 'domain_rule', 'domain_build', 'domain_event', 'battle', 'domain_rank', 'pioneer', 'nation_name']) if (!seen.scenes.has(k)) { problems++; console.log('장면이 한 번도 나오지 않음:', k); }
for (const c of ['defense', 'summons', 'estella']) if (!seen.outcomes[c]) { problems++; console.log('전투가 한 번도 없음:', c); }
if (seen.events.size < 6) { problems++; console.log('영지 사건 종류가 너무 적음'); }
if (!seen.nations) { problems++; console.log('나라가 한 번도 세워지지 않음'); }
console.log(problems ? `FAIL ${problems}` : 'OK');
if (problems) process.exit(1);
void showScene;
