import '../src/content.js';
// 술 빚기와 양조장(src/brew/)을 브라우저 없이 돌려 보는 점검. 1분 안에 끝나게: 어른 하나를 길러 복제해 쓴다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { brewStatus, brewLine, brewState as BS, newCellar, cellarMonth, brewEvents, caskValue } from '../src/brew/index.js';
import { ingHere, ageOf, isSour, canMake, yearTaste } from '../src/brew/core.js';
import { crimeState, crimeState as crimeStateOf } from '../src/crime.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)/.test(t);
const seen = { scenes: {} };
const samples = [];

function month(g, want = [], pick = null) {
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = want.map((id) => acts.find((x) => x.id === id)).find(Boolean);
    if (!a || g.player.fatigue > 75) a = acts.find((x) => x.id === 'rest') ?? acts[0];
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) { if (bad(r.text)) fail('bad result', r); if (josa(r.text)) fail('josa result', r); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 6) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('bad scene', s?.kind, pe.title, pe.text, pe.choices);
    if (s) seen.scenes[s.kind] = (seen.scenes[s.kind] ?? 0) + 1;
        if (pe.choices.length > 8) fail('too many choices', s?.kind, pe.choices.length);
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (/^brew_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^brew_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = brewStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
}
const idxOf = (labels, re) => labels.findIndex((l) => re.test(l));
const BASE = {};
function grow(seed, family) {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '하넬', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
}
// 어른 하나를 한 번만 길러 두고 복제한다 (난수 씨앗만 바꿔서)
function adult(seed, family = 'farmer') {
  BASE[family] ??= JSON.stringify(grow(7001, family));
  const g = JSON.parse(BASE[family]);
  if (g.rngState) g.rngState.s = seed | 0;
  return g;
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (l.job?.id === 'soldier') l.job = null; if (g.crime) g.crime.jailed = null; if (g.explore) g.explore.exp = null; }
const heal = (g) => { g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; };
function scene(g, kind, data, re, opt = {}) {
  let done = false, chose = null;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    opt.each?.(g); // 장면이 뜰 때까지 형편(전쟁·흉년)을 붙잡아 둔다
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, opt.want ?? ['rest'], (k, labels) => { if (k !== kind) return opt.other?.(k, labels) ?? -1; done = true; const i2 = idxOf(labels, re); chose = i2 >= 0 ? labels[i2] : null; return i2; });
  }
  if (!done && !g.over) fail('scene never shown', kind, JSON.stringify(data), L(g).place, playerAge(g), JSON.stringify(L(g).queue.map((q) => q.kind)));
  if (done && !chose && !g.over) fail('choice not found', kind, re, JSON.stringify(data));
  return chose;
}


const R = (g) => rngOf(g);
// 장면 정의를 직접 부른다 (글과 선택지를 검사하고, 고른 열쇠로 푼다)
function direct(g, kind, data, key) {
  const def = SCENES[kind];
  const s = { kind, at: L(g).place, t: 0, ...data };
  if (def.need && !def.need(g, s)) return { skipped: true };
  const t = def.text(g, s), ch = def.choices(g, s), ti = def.title(g, s);
  if (bad(t) || bad(ti) || josa(t) || ch.some((c) => bad(c.label) || josa(c.label))) fail('scene text', kind, ti, t, ch.map((c) => c.label));
  if (ch.length > 8) fail('too many choices', kind);
  const k = typeof key === 'function' ? key(ch) : key;
  if (!ch.some((c) => c.key === k)) return { missing: true, keys: ch.map((c) => c.key) };
  const out = def.resolve(g, R(g), s, k);
  if (bad(out) || josa(out)) fail('scene out', kind, k, out);
  if (g.player.money < 0) fail('negative money', kind, k);
  if (samples.length < 60) samples.push(`[${ti}] ${k} → ${out}`);
  return { out, s };
}

const tick = (g) => { runHooks('afterMonth', g, R(g)); g.date.month = g.date.month % 12 + 1; if (g.date.month === 1) g.date.year += 1; };
import { ACTIONS } from '../src/actions.js';
import { myInn, newInn, I as innState } from '../src/inn/core.js';
const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g);
const nowMi = (g) => g.date.year * 12 + g.date.month;
function fresh(seed, pl = 'ern', skill = 0) {
  const g = adult(seed); placeAt(g, pl); heal(g);
  g.player.money = 2000; for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  g.player.skills.cooking = 0;
  Object.assign(BS(g), { stock: {}, casks: [], cellar: null, named: [], made: {}, skill, eventAt: nowMi(g), brewed: 0, illicit: 0 });
  if (g.world) g.world.famine = false;
  if (g.troupe) g.troupe.t = null; if (g.poor) g.poor.bond = null; if (g.army) g.army.service = null;
  if (g.farm) g.farm.farm = null;
  if (g.inn) g.inn.inn = null;
  L(g).job = null;
  return g;
}
const cask = (g, d, ageM, q = 60) => { const s = BS(g); const c = { id: s.seq++, d, y: g.date.year, t: 1, q, at: nowMi(g) - ageM, place: L(g).place }; s.casks.push(c); return c; };
const brewer = (seed, pl = 'ern') => { const g = fresh(seed, pl, 45); BS(g).brewed = 3; return g; };

// 1. 행동은 뜻 있는 형편에서만
{
  const g = fresh(11);
  g.player.money = 2000;
  if (can(g, 'brew_make')) fail('brew_make shown with no skill/ingredients');
  if (can(g, 'brew_cellar')) fail('brew_cellar shown with nothing');
  g.player.skills.cooking = 20;
  if (!can(g, 'brew_make')) fail('brew_make hidden for cook at ern');
  g.player.money = 3;
  if (can(g, 'brew_make')) fail('brew_make shown without money');
  g.player.money = 100; g.player.skills.cooking = 0;
  BS(g).stock = { barley: 2 };
  if (!can(g, 'brew_make')) fail('brew_make hidden with ingredients');
}

// 2. 고장과 철마다 다른 재료
{
  const g = fresh(12);
  g.date.month = 10;
  const lake = ingHere(g, 'serenia', 10), ern = ingHere(g, 'ern', 9), ernSpring = ingHere(g, 'ern', 4);
  if (!lake.includes('apples') || lake.includes('grapes')) fail('lake ingredients', lake);
  if (!ern.includes('grapes') || !ern.includes('barley')) fail('ern autumn', ern);
  if (ernSpring.includes('grapes')) fail('grapes in spring', ernSpring);
  const t = yearTaste(g, R(g), 'ern');
  if (!(t >= 0.7 && t <= 1.3)) fail('taste range', t);
}

// 3. 빚기: 사고, 빚고, 솜씨가 붙는다
{
  const g = fresh(13);
  g.player.skills.cooking = 30; g.date.month = 4;
  let r = direct(g, 'brew_make', {}, 'buy:barley');
  if (r.missing || (BS(g).stock.barley ?? 0) < 4) fail('buy barley', JSON.stringify(r));
  r = direct(g, 'brew_make', {}, 'make:ale');
  if (r.missing || BS(g).casks.length !== 1) fail('make ale', JSON.stringify(r));
  if (!(BS(g).skill >= 9)) fail('skill after first brew', BS(g).skill);
  if (canMake(g, 'spirit')) fail('spirit without still');
  // 통이 꽉 차면 못 빚는다
  BS(g).casks = [cask(g, 'ale', 0), cask(g, 'ale', 0), cask(g, 'ale', 0)].slice(0, 3);
  BS(g).stock = { barley: 10 };
  if (can(g, 'brew_make')) fail('brew with full home cellar');
}

// 4. 묵히기: 익고, 좋아지고, 시어진다
{
  const g = fresh(14);
  const wine = cask(g, 'wine', 2), old = cask(g, 'wine', 48), ale = cask(g, 'ale', 13), fresh2 = cask(g, 'ale', 3);
  if (!(caskValue(g, old) > caskValue(g, wine) * 3)) fail('wine aging', caskValue(g, wine), caskValue(g, old));
  if (!isSour(g, ale) || isSour(g, fresh2)) fail('ale souring');
  if (!(caskValue(g, ale) < caskValue(g, fresh2))) fail('vinegar value');
  const r = direct(g, 'brew_cellar', {}, 'sour');
  if (r.missing || BS(g).casks.some((c) => isSour(g, c))) fail('sell vinegar', JSON.stringify(r));
}

// 5. 술도가: 열고, 팔고, 세금이 쌓이고, 낸다
{
  const g = brewer(15);
  if (!can(g, 'brew_cellar')) fail('cellar action hidden');
  let r = direct(g, 'brew_cellar', {}, 'open');
  if (r.missing || !BS(g).cellar) fail('open cellar', JSON.stringify(r));
  cask(g, 'mead', 20, 70); cask(g, 'ale', 3, 50); cask(g, 'cider', 5, 50);
  const m0 = g.player.money;
  r = direct(g, 'brew_cellar', {}, 'sell1');
  if (r.missing || !(g.player.money > m0) || BS(g).cellar.taxOwed <= 0) fail('sell best/tax', JSON.stringify(r), BS(g).cellar.taxOwed);
  r = direct(g, 'brew_cellar', {}, 'sellall');
  if (r.missing || BS(g).casks.length) fail('sell all', JSON.stringify(r));
  r = direct(g, 'brew_cellar', {}, 'tax');
  if (r.missing || BS(g).cellar.taxOwed !== 0) fail('pay tax', JSON.stringify(r));
  r = direct(g, 'brew_cellar', {}, 'still');
  if (r.missing || !BS(g).cellar.still) fail('still', JSON.stringify(r));
  BS(g).stock = { barley: 4 };
  r = direct(g, 'brew_make', {}, 'make:spirit');
  if (r.missing || !BS(g).casks.some((c) => c.d === 'spirit')) fail('spirit', JSON.stringify(r));
  // 내 주점에 대기
  innState(g).inn = newInn(g, 'ern', 'tavern', '시험 주점');
  cask(g, 'ale', 3, 60);
  const f0 = myInn(g).fame;
  r = direct(g, 'brew_cellar', {}, 'inn');
  if (r.missing || !(myInn(g).fame > f0)) fail('supply my inn', JSON.stringify(r));
  // 닫으면 남는 통은 헐값에
  for (let i = 0; i < 6; i++) cask(g, 'mead', 1, 40);
  r = direct(g, 'brew_cellar', {}, 'close');
  if (r.missing || BS(g).cellar || BS(g).casks.length > 3) fail('close', JSON.stringify(r), BS(g).casks.length);
}

// 6. 주점 납품: 달마다 한 통
{
  const g = brewer(16);
  BS(g).cellar = newCellar(g, R(g));
  BS(g).cellar.contract = { name: '시험 주점 주인', d: 'ale', left: 2, pay: 1.15, missed: 0 };
  cask(g, 'ale', 3); cask(g, 'ale', 4);
  const m0 = g.player.money;
  cellarMonth(g, R(g));
  if (BS(g).casks.length !== 1 || !(g.player.money > m0)) fail('contract month');
  cellarMonth(g, R(g));
  if (BS(g).cellar.contract) fail('contract not ended');
}

// 7. 흉년의 금주령
{
  const g = brewer(17);
  g.world.famine = true;
  BS(g).stock = { barley: 2 };
  const def = SCENES.brew_make, ch = def.choices(g, { kind: 'brew_make' });
  if (!ch.some((c) => /금주령/.test(c.label))) fail('ban label', ch.map((c) => c.label));
  cask(g, 'ale', 3);
  const cc = SCENES.brew_cellar.choices(g, { kind: 'brew_cellar' });
  if (cc.some((c) => c.key === 'sell1')) fail('grain sold during ban');
  direct(g, 'brew_make', {}, 'make:ale');
  if (!(BS(g).illicit >= 1)) fail('illicit not counted');
  if (!brewEvents(g).includes('ban')) fail('ban event not eligible');
}

// 8. 사건 여덟을 하나씩 띄운다
{
  const setups = {
    taxman: (g) => { BS(g).cellar.taxOwed = 60; },
    ban: (g) => { g.world.famine = true; cask(g, 'ale', 3); },
    smuggler: (g) => { cask(g, 'spirit', 3); },
    noble: (g) => { BS(g).cellar.fame = 50; cask(g, 'wine', 30, 70); },
    tavern: (g) => { cask(g, 'cider', 4); },
    sour: (g) => { cask(g, 'ale', 11); },
    rival: (g) => { BS(g).cellar.fame = 30; cask(g, 'ale', 3); },
    festival: (g) => { g.date.month = 9; cask(g, 'ale', 3); cask(g, 'cider', 4); },
  };
  for (const [ev, set] of Object.entries(setups)) {
    const keys = SCENES.brew_event.choices(fresh(1), { ev }).map((c) => c.key);
    for (const k of keys) {
      const g = brewer(20 + k.length + ev.length);
      BS(g).cellar = newCellar(g, R(g));
      set(g);
      if (!brewEvents(g).includes(ev)) { fail('not eligible', ev, brewEvents(g)); break; }
      const r = direct(g, 'brew_event', { ev }, k);
      if (r.skipped || r.missing) fail('event', ev, k, JSON.stringify(r));
      seen.scenes['brew_event:' + ev] = (seen.scenes['brew_event:' + ev] ?? 0) + 1;
    }
  }
  // 형편이 바뀌면 사건은 버려진다
  const g = brewer(40);
  const r = direct(g, 'brew_event', { ev: 'taxman' }, 'pay');
  if (!r.skipped) fail('taxman without cellar shown');
}

// 9. 이름난 술과 대 잇기
{
  const g = brewer(41);
  BS(g).skill = 60; BS(g).made = { mead: 7 }; g.player.stats.sen = 90;
  g.date.month = 7; placeAt(g, 'silverleaf');
  let named = null;
  for (let i = 0; i < 6 && !named; i++) { BS(g).stock = { honey: 2 }; BS(g).casks = []; direct(g, 'brew_make', {}, 'make:mead'); named = BS(g).named[0]; }
  if (!named || named.d !== 'mead') fail('named drink', JSON.stringify(BS(g).named));
  BS(g).cellar = newCellar(g, R(g));
  BS(g).casks = [];
  cask(g, 'wine', 10);
  runHooks('heir', g, R(g), g.player);
  if (named && BS(g).named[0].gen !== 2) fail('named gen');
  if (BS(g).cellar.gens !== 2 || BS(g).skill > 25 || BS(g).casks.length !== 1) fail('heir', JSON.stringify(BS(g).cellar), BS(g).skill);
}

// 10. 저장 불러오기
{
  const g = brewer(42);
  BS(g).cellar = newCellar(g, R(g));
  const x = JSON.parse(JSON.stringify(g));
  Object.assign(x.brew, { stock: { barley: 'x', gone: 3, honey: 4 }, casks: [{ d: 'gone', at: 1 }, { d: 'ale', at: 'x' }, { d: 'wine', at: 5, q: 'x' }, null], skill: 'x', named: [{ d: 'gone' }, { d: 'ale', by: 'a' }] });
  x.brew.cellar.contract = { name: 3 }; x.brew.cellar.fame = 400;
  runHooks('migrate', x);
  const b = x.brew;
  if (JSON.stringify(b.stock) !== '{"honey":4}' || b.casks.length !== 1 || b.casks[0].q !== 40 || b.skill !== 0 || b.named.length !== 1 || b.cellar.contract !== null || b.cellar.fame !== 100) fail('migrate', JSON.stringify(b).slice(0, 400));
  const y = JSON.parse(JSON.stringify(g)); y.brew.cellar = { place: 'nowhere' };
  runHooks('migrate', y);
  if (y.brew.cellar) fail('bad cellar kept');
  const z = JSON.parse(JSON.stringify(g)); delete z.brew; runHooks('migrate', z);
  if (!z.brew || !Array.isArray(z.brew.casks)) fail('old save');
}

// 11. 자동 플레이: 술 빚는 사람으로 여섯 해
{
  const g = fresh(43, 'ern', 30);
  g.player.skills.cooking = 30;
  for (let i = 0; i < 72 && !g.over; i++) {
    if (i === 30 && !BS(g).cellar) { placeAt(g, 'ern'); }
    month(g, ['brew_make', 'brew_cellar'], (kind, labels) => (kind === 'brew_make' ? idxOf(labels, /빚는다|산다/) : kind === 'brew_cellar' ? idxOf(labels, /연다|판다/) : -1));
    const st = brewLine(g);
    if (st != null && bad(st)) fail('line', st);
  }
  if (verbose) console.log('autoplay', JSON.stringify(brewStatus(g)).slice(0, 400));
  if (!(BS(g).brewed >= 3)) fail('autoplay brewed', BS(g).brewed);
}

console.log('장면:', JSON.stringify(seen.scenes));
if (verbose) for (const s of samples) console.log(s);
if (problems) { console.log(`brewtest: ${problems} problems`); process.exit(1); }
console.log('OK');
