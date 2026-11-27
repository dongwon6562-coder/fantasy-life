import '../src/content.js';
// 용병단 꾸리기(src/company/)를 브라우저 없이 돌려 보는 점검.
// 1) 세우기(조건, 깃발, 옛 깃발 다시 올리기). 2) 계약(고용주 목록, 전쟁 편, 싸움터로 떠남·닿음, 떠나면 깨짐), 싸움과 약탈 규율.
// 3) 매달 셈: 삯·몫 나누기·사기·탈영, 계약 끝(덤·떼먹기). 4) 단 안팎의 일 선택지마다. 5) 대 잇기(부관이 맡음·넘겨받기), 옛 저장, 저절로.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { companyStatus, companyLine, companyState as S, myCo, makeOffers, fight, FOUND_COST } from '../src/company/index.js';
import { PS } from '../src/politics/state.js';
import { addFamily } from '../src/company/core.js';

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
    if (/^company_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^company_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = companyStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
}
const idxOf = (labels, re) => labels.findIndex((l) => re.test(l));
function adult(seed, family = 'merchant') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '하넬', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
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
import { me } from '../src/game.js';

const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g);
const clearQ = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const nowMi = (g) => g.date.year * 12 + g.date.month;
function fresh(seed, pl = 'barka') {
  const g = adult(seed); placeAt(g, pl); heal(g);
  g.player.skills.sword = 40; g.player.stats.str = 50; g.player.stats.cha = 45; g.player.money = 1000;
  S(g).c = null; S(g).banner = null; S(g).families = []; S(g).hunted = {}; S(g).offers = null;
  if (g.troupe) g.troupe.t = null; if (g.poor) g.poor.bond = null; L(g).job = null;
  PS(g).wars = [];
  return g;
}
function captain(seed, pl = 'barka', sign = 'wolf') {
  const g = fresh(seed, pl);
  const r = direct(g, 'company_found', {}, `new:${sign}`);
  if (r.skipped || r.missing || !myCo(g)) fail('found', pl, JSON.stringify(r));
  return g;
}
// 바르카(자유도시)에서 자유도시 편 전쟁 계약을 맺은 단
function atWar(seed) {
  const g = captain(seed);
  PS(g).wars = [{ a: 'free', b: 'sea', since: nowMi(g), score: 0, weary: 0, taken: [] }];
  S(g).offers = null;
  const list = makeOffers(g);
  const i = list.findIndex((o) => o.kind === 'war' && o.side === 'free');
  if (i < 0) { fail('no war offer', JSON.stringify(list)); return g; }
  direct(g, 'company_board', {}, `o:${i}`);
  const k = myCo(g).contract;
  if (!k || !k.started || k.where !== 'barka') fail('war contract', JSON.stringify(k));
  return g;
}

/* 1) 세우기 */
{
  const v = fresh(201000, 'ern'); if (can(v, 'company_found')) fail('found in village');
  const n = fresh(201010); n.player.skills.sword = 5; PS(n).me.merc = 0; L(n).renown = 0; if (can(n, 'company_found')) fail('found without skill');
  PS(n).me.merc = 3; if (!can(n, 'company_found')) fail('merc veteran cannot found');
  const p = fresh(201020); p.player.money = 100; if (can(p, 'company_found')) fail('found poor');
  const j = fresh(201030); L(j).job = { id: 'farmer', place: 'barka', months: 3, lastRank: 0 };
  direct(j, 'company_found', {}, 'new:crow');
  const c = myCo(j);
  if (!c || L(j).job || j.player.money !== 1000 - FOUND_COST || c.vets.length !== 2 || c.men < 12) fail('found state', JSON.stringify(c), j.player.money);
  if (S(j).banner?.sign !== 'crow' || S(j).banner.founder !== j.player.name) fail('banner', JSON.stringify(S(j).banner));
  if (can(j, 'company_found')) fail('found twice');
  // 접고 다시: 옛 깃발
  S(j).banner.honors.push({ y: 500, text: '시험' }, { y: 501, text: '시험2' });
  direct(j, 'company_manage', {}, 'disband');
  if (myCo(j) || S(j).past.length !== 1) fail('disband');
  j.player.money = 1000;
  const r = direct(j, 'company_found', {}, 'old:crow');
  if (r.missing || myCo(j)?.sign !== 'crow' || S(j).banner.raised !== 2 || myCo(j).fame <= 5) fail('old banner', JSON.stringify(r), JSON.stringify(S(j).banner), myCo(j)?.fame);
  const t = fresh(201040); t.troupe = { ...(t.troupe ?? {}), t: { name: 'x' } }; if (can(t, 'company_found')) fail('found while in troupe');
}

/* 2) 계약과 싸움 */
{
  const g = captain(202000);
  // 48단계 도우미3: 씨앗에 따라 시작부터 발하르트 전쟁이 나 있는 판이 있어(사건 길이 바뀌면 달라짐) 평화를 직접 맞춘다
  PS(g).wars = []; if (g.realm?.balhart) g.realm.balhart.war = false;
  const peace = makeOffers(g);
  if (peace.some((o) => o.kind === 'war') || !peace.some((o) => o.kind === 'guard')) fail('peace offers', JSON.stringify(peace));
  const w = atWar(202010);
  if (can(w, 'company_contract')) fail('board while contracted');
  if (!can(w, 'company_lead')) fail('cannot lead');
  // 제국 편에 서면 그쪽 땅으로 떠난다
  const sea = captain(202020);
  PS(sea).wars = [{ a: 'free', b: 'valhart', since: 0, score: -20, weary: 0, taken: [] }];
  const so = makeOffers(sea).findIndex((o) => o.kind === 'war' && o.side === 'valhart');
  if (so < 0) fail('no valhart offer', JSON.stringify(makeOffers(sea)));
  else {
    direct(sea, 'company_board', {}, `o:${so}`);
    const k = myCo(sea).contract;
    if (!L(sea).travel || k.started || L(sea).travel.to !== k.where || myCo(sea).place !== k.where) fail('travel to front', JSON.stringify(L(sea).travel), JSON.stringify(k));
  }
  // 싸움: 이기면 사기가 오르고, 지면 사람을 잃는다
  for (const plan of ['charge', 'hold', 'flank', 'spare']) {
    const f = atWar(202100 + plan.length); const c = myCo(f); c.drill = 60;
    const before = c.men;
    const r = direct(f, 'company_fight', {}, plan);
    if (r.missing || r.skipped) fail('fight plan', plan, JSON.stringify(r));
    if (c.battles !== 1 || c.foughtAt !== nowMi(f) || c.men > before) fail('fight state', plan, JSON.stringify(c));
    if (can(f, 'company_lead')) fail('lead twice in month');
  }
  const lo = atWar(202200); myCo(lo).drill = 20; if (direct(lo, 'company_fight', {}, 'flank').missing !== true) fail('flank without drill');
  // 약탈 규율: 마음대로면 단장 손에 은화, 금지면 아무것도
  let freeGain = 0, forbidGain = 0;
  for (const [rule, set] of [['free', (n) => { freeGain += n; }], ['forbid', (n) => { forbidGain += n; }]]) {
    const f = atWar(202300); const c = myCo(f); c.loot = rule;
    for (let i = 0; i < 20; i++) { c.men = 80; c.drill = 100; c.morale = 100; c.contract.danger = 1; c.contract.rival = null; const m0 = f.player.money; const ch0 = c.chest; const r = fight(f, R(f), 'hold', true); if (r.won) { set(f.player.money - m0 + (c.chest - ch0)); break; } }
  }
  if (!(freeGain > 0) || forbidGain !== 0) fail('loot rules', freeGain, forbidGain);
  // 싸움터를 두고 떠나면 계약이 깨진다
  const b = atWar(202400); placeAt(b, 'portel'); S(b).c.place = 'barka'; tick(b);
  if (myCo(b).contract || !(S(b).hunted.free >= nowMi(b))) fail('breach', JSON.stringify(myCo(b).contract), JSON.stringify(S(b).hunted));
  if (makeOffers(b).some((o) => o.side === 'free')) fail('hunted side still offers');
  if (myCo(b).place !== 'portel') fail('company follows');
}

/* 3) 매달 셈 */
{
  // 계약 없으면 삯이 밀리고 사기가 떨어진다
  const g = captain(203000); const c = myCo(g); c.chest = 0; c.morale = 50; clearQ(g); tick(g);
  if (!(c.owed > 0) || !(c.morale < 50)) fail('idle wages', c.owed, c.morale);
  // 몫: 단장이 크게 떼면 내 손에 더 들어온다
  const gains = {};
  for (const split of ['equal', 'captain']) {
    const h = captain(203010); const k = myCo(h);
    k.split = split; k.chest = 200; k.morale = 60;
    k.contract = { kind: 'guard', by: '상단', side: null, foe: null, where: 'barka', months: 4, left: 3, pay: 40, bonus: 30, danger: 1, temper: 'fair', started: true, won: 0, lost: 0, unpaid: 0 };
    k.foughtAt = nowMi(h); const m0 = h.player.money; clearQ(h); tick(h); gains[split] = h.player.money - m0;
  }
  if (!(gains.captain > gains.equal && gains.equal > 0)) fail('split', JSON.stringify(gains));
  // 계약 끝: 덤
  const e = captain(203020); const ec = myCo(e);
  ec.contract = { kind: 'guard', by: '상단', side: null, foe: null, where: 'barka', months: 4, left: 1, pay: 40, bonus: 30, danger: 1, temper: 'fair', started: true, won: 2, lost: 0, unpaid: 0 };
  ec.foughtAt = nowMi(e); ec.chest = 0; clearQ(e); tick(e);
  if (ec.contract || S(e).contracts !== 1 || !S(e).log.some((l) => /덤 30닢/.test(l.text))) fail('contract end', JSON.stringify(ec.contract), JSON.stringify(S(e).log[0]));
  // 사기가 바닥이면 탈영
  const d = captain(203030); const dc = myCo(d); dc.men = 40; dc.morale = 5; dc.chest = 500; clearQ(d); tick(d);
  if (!(dc.men < 40)) fail('desertion', dc.men);
  // 사람이 다 흩어지면 단이 끝난다
  const z = captain(203040); myCo(z).men = 0; myCo(z).vets = []; tick(z);
  if (myCo(z) || !S(z).banner) fail('empty company ends, banner stays');
  // 연금은 삯에 붙는다
  const p = captain(203050); const pc = myCo(p); const w0 = pc.men + pc.vets.length * 3;
  pc.pensions = 2; if (companyStatus(p).company.wages !== w0 + 2) fail('pension wages', companyStatus(p).company.wages, w0);
}

/* 4) 단 안팎의 일 */
{
  const evs = {
    maimed: ['keep', 'lump', 'pension', 'cast'], sack: ['sack', 'tribute', 'hang'], turn: ['switch', 'report', 'double', 'no'], ransom: ['ransom', 'hand', 'free'],
    rival: ['duel', 'fake', 'poach', 'fight'], mutiny: ['pay', 'equal', 'crush', 'yield'], widow: ['pay', 'pension', 'take', 'turn'], desert: ['hunt', 'let'],
  };
  let n = 0;
  for (const [ev, keys] of Object.entries(evs)) for (const key of keys) {
    const g = atWar(204000 + n++); const c = myCo(g);
    const v = c.vets[0]; v.loyal = 20;
    S(g).families = []; 
    const data = { ev, a: v.id, offer: 60, r: 'iron' };
    if (ev === 'widow') { addFamily(g, R(g), '창병 요스트'); data.f = S(g).families[0].id; }
    const r = direct(g, 'company_event', data, key);
    if (r.skipped || r.missing) { fail('event', ev, key, JSON.stringify(r)); continue; }
    if (ev === 'turn' && key === 'switch' && (c.contract?.side !== 'sea' || !(S(g).hunted.free > nowMi(g)) || S(g).turned !== 1)) fail('turncoat', JSON.stringify(c.contract));
    if (ev === 'widow' && S(g).families[0].helped == null) fail('widow helped');
    if (ev === 'widow' && key === 'pension' && !(c.pensions >= 1)) fail('widow pension');
    if (ev === 'maimed' && key !== 'keep' && c.vets.some((x) => x.id === v.id)) fail('maimed stays', key);
    if (ev === 'mutiny' && key === 'equal' && c.split !== 'equal') fail('mutiny equal');
    if (ev === 'mutiny' && key === 'yield' && myCo(g)) fail('mutiny yield');
  }
  // 삯 떼먹기: 계약 끝과 계약 중
  for (const key of ['force', 'shame', 'wait', 'forgive']) { const g = atWar(204500 + key.length); myCo(g).contract = null; const r = direct(g, 'company_event', { ev: 'unpaid', by: '사령관', owed: 50, side: 'free' }, key); if (r.skipped || r.missing) fail('unpaid', key, JSON.stringify(r)); }
  for (const key of ['force', 'shame', 'quit', 'forgive']) { const g = atWar(204600 + key.length); const k = myCo(g).contract; k.unpaid = 30; const r = direct(g, 'company_event', { ev: 'unpaid', by: k.by, owed: 30, side: 'free', mid: true }, key); if (r.skipped || r.missing) fail('unpaid mid', key, JSON.stringify(r)); if (key === 'quit' && myCo(g).contract) fail('unpaid quit'); if (key !== 'quit' && myCo(g).contract?.unpaid !== 0) fail('unpaid cleared', key); }
  // 띄울 때의 형편: 전쟁 계약이 없으면 전쟁 일은 뜨지 않는다
  const p = captain(204700);
  for (const ev of ['sack', 'turn', 'ransom', 'rival']) if (!direct(p, 'company_event', { ev, offer: 50, r: 'iron' }, 'no').skipped) fail('war event without war', ev);
  if (!direct(p, 'company_event', { ev: 'widow', f: 999 }, 'pay').skipped) fail('widow without family');
  // 매달 일이 저절로 뜬다
  const q = atWar(204800); const qc = myCo(q); qc.vets[0].loyal = 10; qc.morale = 30;
  let got = new Set();
  for (let i = 0; i < 60; i++) { clearQ(q); S(q).eventAt = -99; qc.foughtAt = nowMi(q); qc.contract.left = 5; qc.morale = 30; qc.men = 30; qc.vets[0] && (qc.vets[0].loyal = 10); tick(q); for (const x of L(q).queue) if (x.kind === 'company_event') got.add(x.ev); if (!myCo(q)) break; }
  if (got.size < 3) fail('monthly events', [...got]);
}

/* 5) 대 잇기, 옛 저장, 저절로 */
{
  const heirFns = HOOKS.heir.filter((f) => /regent/.test(String(f)) && /banner/.test(String(f)));
  if (heirFns.length !== 1) fail('heir hook', heirFns.length);
  const a = atWar(205000); myCo(a).vets.forEach((v) => { v.loyal = 90; }); for (const f of heirFns) f(a);
  if (!myCo(a) || myCo(a).regent || myCo(a).contract || S(a).banner.gens !== 2) fail('heir adult', JSON.stringify(myCo(a)?.regent), S(a).banner.gens);
  const b = captain(205010); myCo(b).vets.forEach((v) => { v.loyal = 20; }); for (const f of heirFns) f(b);
  if (!myCo(b)?.regent) fail('heir disloyal regent');
  if (can(b, 'company_manage') || can(b, 'company_contract')) fail('regent blocks commanding');
  if (!can(b, 'company_take')) fail('cannot take');
  for (const key of ['buy', 'duel', 'give']) {
    const x = captain(205020 + key.length); myCo(x).vets.forEach((v) => { v.loyal = 20; }); for (const f of heirFns) f(x);
    const r = direct(x, 'company_take', {}, key);
    if (r.skipped || r.missing) fail('take', key, JSON.stringify(r));
    if (key === 'buy' && myCo(x)?.regent) fail('buy regent');
    if (key === 'give' && myCo(x)) fail('give');
  }
  const y = captain(205030); myCo(y).vets.forEach((v) => { v.loyal = 80; }); myCo(y).regent = myCo(y).vets[0].name;
  if (direct(y, 'company_take', {}, 'take').missing || myCo(y).regent) fail('take loyal');
  // 어린 상속자: 부관이 맡아 지킨다
  const k = captain(205040); const ms = me(k).ageMonths; me(k).ageMonths = 10 * 12; for (const f of heirFns) f(k);
  if (myCo(k)?.regent !== myCo(k)?.vets.find((v) => v.role === 'lt')?.name) fail('child regent', myCo(k)?.regent);
  if (can(k, 'company_take')) fail('child takes');
  tick(k); if (!myCo(k) || myCo(k).contract) fail('regent month');
  if (bad(companyLine(k)) || josa(companyLine(k))) fail('regent line', companyLine(k));
  me(k).ageMonths = ms;
  // 옛 저장
  const x = adult(205100);
  delete x.company; runHooks('migrate', x);
  if (!x.company || !Array.isArray(x.company.rivals) || x.company.rivals.length !== 5) fail('migrate');
  x.company = { c: { name: 3, sign: 'wolf', place: 'barka', vets: [{ role: 'gone' }, { name: 'a', role: 'lt' }], men: 'x', split: 'gone', contract: { kind: 'war', side: 'nowhere', foe: 'sea', where: 'barka', left: 2, pay: 3, by: 'x' } }, families: [{ dead: 3 }], hunted: [], banner: { sign: 'gone' } };
  runHooks('migrate', x);
  const c = x.company.c;
  if (!c || c.vets.length !== 1 || typeof c.name !== 'string' || !Number.isFinite(c.men) || c.split !== 'rank' || c.contract || x.company.families.length || x.company.banner || Array.isArray(x.company.hunted)) fail('migrate partial', JSON.stringify(x.company));
  if (JSON.stringify(companyStatus(x)).match(/NaN|undefined/)) fail('status');
  // 저절로 살아 보기
  let battles = 0, contracts = 0, alive = 0;
  for (let run = 0; run < 4; run++) {
    const a2 = captain(205200 + run, ['barka', 'portel', 'harfen', 'leocast'][run]);
    if (run % 2) PS(a2).wars = [{ a: 'free', b: 'sea', since: nowMi(a2), score: 0, weary: 0, taken: [] }];
    for (let mth = 0; mth < 96 && !a2.over; mth++) {
      const acts = availableActions(a2);
      const want = rngOf(a2).chance(0.75) ? ['company_lead', 'company_contract', 'company_manage'] : [rngOf(a2).pick(acts.filter((x) => !x.id.startsWith('travel') && x.id !== 'house_move')).id];
      month(a2, want, (k2, labels) => (k2 === 'company_board' ? labels.findIndex((l) => /닢/.test(l)) : k2 === 'company_manage' ? labels.findIndex((l) => /모은다|그대로/.test(l)) : -1));
      const line = companyLine(a2); if (bad(line) || josa(line)) fail('line', line);
    }
    battles += S(a2).battles; contracts += S(a2).contracts; alive += myCo(a2) ? 1 : 0;
  }
  console.log(`저절로 8년 4판: 싸움 ${battles}번, 마친 계약 ${contracts}, 끝까지 단이 남은 판 ${alive}`);
  if (!battles || !contracts) fail('autoplay never fought');
}

console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('company_')))));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
