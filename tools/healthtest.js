import './lsshim.js';
import '../src/content.js';
// 병과 의술 점검: 처음 상태, 도는 병(철·고장·흉년·홍수 뒤 이질·역병 번짐), 옮기, 누구에게 맡길까(값·돈 확인·치료의 힘),
// 깊어지고 낫기, 낫지 않는 것(능력치), 목숨, 식구가 앓을 때, 상처 덧남, 행동(몸조리·치료 구하기·병자 돌보기),
// 사건들, 집안 내력(대 잇기), 예전 저장, 100년 흐름, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { WORLD_TICKS } from '../src/world.js';
import { makePerson } from '../src/npc.js';
import { faithState } from '../src/faith/index.js';
import { healthState as HS, healthInfo, healthLine, outbreaksAt, startOutbreak, fallSick, addChronic, healPower, closeKin } from '../src/health/index.js';

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = e.text(g, ctx);
  check(!BAD.test(text) && typeof e.title === 'string', `${id} 본문: ${text}`);
  g.pendingEvent = { id, title: e.title, text, choices: e.choices.map((c) => c.label), choiceIdx: e.choices.map((c, i) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  crimeState(g).jailed = null;
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; g.pendingEvent = null; L(g).scene = null; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const queued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); return out; };
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
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  crimeState(g).jailed = null;
  return out;
};
const tick = WORLD_TICKS.find((t) => /g\.health/.test(String(t)));
const step = (g, say = () => {}) => { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; tick(g, makeRng({ s: 1 }), say, () => {}); };
const month = (g) => { g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; g.date.month = (g.date.month % 12) + 1; runHooks('afterMonth', g, makeRng({ s: 2 })); };
const kin = (g, place, ageY = 30) => { const p = makePerson(makeRng({ s: ageY }), { sex: 'f', ageMonths: ageY * 12, lastName: '식구' }); p.place = place; p.health = 70; g.people.push(p); g.player.familyIds.push(p.id); return p; };

check(!!tick, '병의 세계 흐름을 못 찾았다');
// 1) 처음
{
  const g = newGame({ name: '처음', sex: 'm', familyId: 'farmer', mode: 'free', seed: 701 });
  const H = HS(g);
  check(H.sick.length === 0 && H.outbreaks.length === 0 && H.chronic.length === 0, '처음 상태가 이상하다');
  check(healthLine(g) === '' && !BAD.test(JSON.stringify(healthInfo(g)).replace(/null/g, '0')), '처음 화면 정보가 이상하다');
  check(!has(g, 'health_rest') && !has(g, 'health_tend'), '아기가 병자를 돌본다');
}
// 2) 옮기, 맡기기, 낫기
{
  const g = newGame({ name: '앓이', sex: 'f', familyId: 'merchant', mode: 'free', seed: 702 });
  grown(g); stay(g, 'verden');
  const rng = makeRng({ s: 2 });
  const o = startOutbreak(g, 'fever', 'river', 0.9, rng);
  check(o && outbreaksAt(g, 'verden').length === 1 && outbreaksAt(g, 'ern').length === 0, '열병이 강 유역에만 돌지 않는다');
  check(/열병/.test(healthLine(g)), `한 줄 요약: ${healthLine(g)}`);
  // 많이 지내면 옮는다
  let caught = 0;
  for (let i = 0; i < 40 && !caught; i++) { month(g); caught = HS(g).sick.filter((s) => s.who === 'me').length; o.left = 5; }
  check(caught > 0, '열병 도는 고장에서 40달을 지내도 옮지 않는다');
  check(queued(g, 'health_treat'), '병에 걸렸는데 누구에게 맡길지 묻지 않는다');
  g.player.money = 100;
  const s = HS(g).sick.find((x) => x.who === 'me');
  const m0 = g.player.money;
  scene(g, 'health_treat', 'physician');
  check(s.treat?.by === 'physician' && s.treat.power > 0.5 && g.player.money < m0, `의원 치료가 이상하다 (${JSON.stringify(s.treat)}, ${m0} → ${g.player.money})`);
  // 시간이 지나면 낫는다
  for (let i = 0; i < 14 && HS(g).sick.some((x) => x.id === s.id); i++) month(g);
  check(!HS(g).sick.some((x) => x.id === s.id) && HS(g).cured >= 1, '의원에게 보였는데 14달이 지나도 안 낫는다');
  // 돈이 없으면 비싼 치료는 고를 수 없다
  const s2 = fallSick(g, 'lung', 'me', rng, 40);
  g.player.money = 0; g.player.familyMoney = 0; L(g).home = 'inn';
  L(g).queue = L(g).queue.filter((x) => x.kind !== 'health_treat'); L(g).queue.push({ kind: 'health_treat', sid: s2.id, at: 'verden', quack: true });
  const q = L(g).queue.pop(); showScene(g, q, { force: true });
  check(!q.choices.some((c) => ['physician', 'mage', 'herbalist', 'temple', 'quack'].includes(c.key)) && q.choices.some((c) => c.key === 'rest'), `돈이 없는데 값 있는 치료가 보인다 (${q.choices.map((c) => c.key)})`);
  g.pendingEvent = null; L(g).scene = null;
  // 고를 때 있던 돈이 없어지면 다시 확인한다
  g.player.money = 50; L(g).queue.push({ kind: 'health_treat', sid: s2.id, at: 'verden' });
  const q2 = L(g).queue.pop(); showScene(g, q2, { force: true });
  g.player.money = 0;
  const out = resolveEvent(g, makeRng({ s: 3 }), q2.choices.findIndex((c) => c.key === 'physician'));
  check(g.player.money === 0 && !s2.treat && /모자/.test(out), `돈이 모자라는데 치료가 됐다: ${out}`);
}
// 3) 치료의 힘: 의원·약초꾼·신전·마법·돌팔이
{
  const g = newGame({ name: '힘', sex: 'm', familyId: 'merchant', mode: 'free', seed: 703 });
  grown(g); stay(g, 'leocast');
  check(healPower(g, 'mage', 'plague') > healPower(g, 'physician', 'plague') && healPower(g, 'physician', 'fever') > healPower(g, 'temple', 'fever'), '치료의 힘 순서가 이상하다');
  check(healPower(g, 'quack', 'fever') < 0, '돌팔이 약이 병을 고친다');
  faithState(g).devotion = 95; const t1 = healPower(g, 'temple', 'lung'); faithState(g).devotion = 5; const t2 = healPower(g, 'temple', 'lung');
  check(t1 > t2, '믿음이 깊어도 신전 치유가 더 낫지 않다');
  g.player.skills.healing = 70;
  const s = fallSick(g, 'rot', 'me', makeRng({ s: 1 }), 40);
  scene(g, 'health_treat', 'self_heal');
  check(s.treat?.by === 'self_heal' && s.treat.power > 0.4, '의원 솜씨로 스스로 고치지 못한다');
}
// 4) 목숨과 남는 것
{
  let dead = 0, chronic = 0, n = 60;
  for (let i = 0; i < n; i++) {
    const g = newGame({ name: '역병', sex: 'm', familyId: 'farmer', mode: 'free', seed: 800 + i });
    grown(g); stay(g, 'harfen');
    fallSick(g, 'plague', 'me', makeRng({ s: i }), 60);
    L(g).queue = [];
    for (let m = 0; m < 14 && HS(g).sick.length && !L(g).pendingDeath; m++) month(g);
    if (L(g).pendingDeath) dead++;
    if (HS(g).chronic.length) chronic++;
    check(!HS(g).sick.some((s) => s.who === 'me') || L(g).pendingDeath, `역병이 14달 넘게 낫지도 죽지도 않는다 (${JSON.stringify(HS(g).sick)})`);
  }
  check(dead >= 1 && dead <= 18, `치료 없이 깊은 역병을 앓은 ${n}명 가운데 죽은 수가 이상하다 (${dead})`);
  check(chronic >= 5, `깊은 역병이 남긴 것이 너무 적다 (${chronic}/${n})`);
  // 아이는 죽지 않는다
  const c = newGame({ name: '아이', sex: 'f', familyId: 'farmer', mode: 'free', seed: 900 });
  for (const p of c.people) p.ageMonths += 8 * 12;
  const sc = fallSick(c, 'plague', 'me', makeRng({ s: 1 }), 99);
  for (let m = 0; m < 12; m++) { month(c); if (sc.sev < 99 && HS(c).sick.includes(sc)) sc.sev = 99; }
  check(!L(c).pendingDeath, '아이가 병으로 죽었다');
  // 낫지 않는 것은 능력치를 깎는다
  const d = newGame({ name: '다리', sex: 'm', familyId: 'farmer', mode: 'free', seed: 901 });
  d.player.stats.agi = 40; const agi = d.player.stats.agi;
  check(addChronic(d, 'lame', 'rot') && d.player.stats.agi < agi && !addChronic(d, 'lame'), '저는 다리가 이상하다');
}
// 5) 식구가 앓는다
{
  const g = newGame({ name: '식구', sex: 'f', familyId: 'merchant', mode: 'free', seed: 704 });
  grown(g); stay(g, 'graubel'); L(g).home = 'own';
  const k = kin(g, 'graubel', 70);
  check(closeKin(g).includes(k), '같은 고장의 식구를 모른다');
  const s = fallSick(g, 'lung', k.id, makeRng({ s: 1 }), 50);
  check(queued(g, 'health_treat'), '식구가 앓는데 맡길 데를 묻지 않는다');
  g.player.money = 100;
  scene(g, 'health_treat', 'physician');
  check(s.treat?.by === 'physician', '식구를 의원에게 못 보였다');
  let died = 0, n = 0;
  for (let i = 0; i < 40; i++) {
    const h = newGame({ name: '식구', sex: 'm', familyId: 'farmer', mode: 'free', seed: 1000 + i });
    grown(h); stay(h, 'graubel'); const p = kin(h, 'graubel', 75); p.health = 30;
    fallSick(h, 'plague', p.id, makeRng({ s: i }), 70); L(h).queue = [];
    for (let m = 0; m < 14 && HS(h).sick.length; m++) month(h);
    n++; if (!p.alive) died++;
    check(HS(h).sick.length === 0, '식구의 병이 끝나지 않는다');
  }
  check(died >= 2 && died <= 30, `약한 늙은 식구가 역병에 죽는 수가 이상하다 (${died}/${n})`);
}
// 6) 상처 덧남, 몸조리, 치료 구하기, 병자 돌보기
{
  const g = newGame({ name: '상처', sex: 'm', familyId: 'fallen_knight', mode: 'free', seed: 705 });
  grown(g); stay(g, 'harfen');
  let rot = false;
  for (let i = 0; i < 80 && !rot; i++) { g.player.injuries = [{ name: '장검에 베인 팔의 상처', months: 3 }]; month(g); rot = HS(g).sick.some((s) => s.kind === 'rot'); }
  check(rot, '베인 상처가 80달 동안 한 번도 덧나지 않는다');
  L(g).queue = []; g.pendingEvent = null; L(g).scene = null;
  check(has(g, 'health_rest') && has(g, 'health_seek'), '앓는데 몸조리·치료 구하기를 못 한다');
  const s = HS(g).sick.find((x) => x.kind === 'rot'), v = s.sev;
  act(g, 'health_rest');
  check(s.sev < v, '몸조리를 했는데 병이 그대로다');
  act(g, 'health_seek');
  check(queued(g, 'health_treat'), '치료 구하기가 장면을 띄우지 않는다');
  const h = newGame({ name: '돌봄', sex: 'f', familyId: 'merchant', mode: 'free', seed: 706 });
  grown(h); stay(h, 'barka');
  startOutbreak(h, 'flux', 'coast', 0.8, makeRng({ s: 1 }));
  check(has(h, 'health_tend'), '병이 도는데 병자를 돌볼 수 없다');
  const hv = h.player.skills.healing ?? 0;
  act(h, 'health_tend');
  check((h.player.skills.healing ?? 0) > hv, '병자를 돌봤는데 의술이 늘지 않았다');
}
// 7) 사건들
{
  const g = newGame({ name: '사건', sex: 'm', familyId: 'merchant', mode: 'free', seed: 707 });
  grown(g); stay(g, 'harfen');
  addChronic(g, 'lame', 'rot'); fallSick(g, 'fever', 'me', makeRng({ s: 1 }), 30); L(g).queue = [];
  for (const [id, n] of [['health_quack', 3], ['health_body', 3]]) {
    check(cond(g, id), `${id} 조건이 안 맞는다`);
    for (let i = 0; i < n; i++) { stay(g, 'harfen'); g.player.money = 50; fire(g, id, i, 10 + i); }
  }
  HS(g).sick = [];
  g.player.skills.healing = 60; startOutbreak(g, 'fever', 'south', 0.8, makeRng({ s: 1 }));
  check(cond(g, 'health_doctor'), 'health_doctor 조건이 안 맞는다');
  for (let i = 0; i < 3; i++) { stay(g, 'harfen'); HS(g).sick = []; fire(g, 'health_doctor', i, 20 + i); }
  startOutbreak(g, 'plague', 'south', 0.8, makeRng({ s: 1 }));
  check(cond(g, 'health_quarantine'), 'health_quarantine 조건이 안 맞는다');
  for (let i = 0; i < 3; i++) { stay(g, 'harfen'); fire(g, 'health_quarantine', i, 30 + i); }
}
// 8) 집안 내력과 대 잇기
{
  let got = 0;
  for (let i = 0; i < 30; i++) {
    const g = newGame({ name: '내력', sex: 'm', familyId: 'farmer', mode: 'free', seed: 1100 + i });
    addChronic(g, 'fits'); addChronic(g, 'lame');
    fallSick(g, 'lung', 'me', makeRng({ s: 1 }), 30);
    runHooks('heir', g, makeRng({ s: i }), g.player);
    const H = HS(g);
    check(!H.sick.some((s) => s.who === 'me') && !H.chronic.some((c) => c.id === 'lame') && H.lineage.fits === 1, '대를 이었는데 앓던 병·장애가 남았거나 내력이 기록되지 않았다');
    if (H.chronic.some((c) => c.id === 'fits')) got++;
  }
  check(got >= 2 && got <= 16, `집안 내력이 내려오는 수가 이상하다 (${got}/30)`);
}
// 9) 세상: 철 따라 돌고, 흉년이면 더, 홍수 뒤 이질, 역병은 번진다
{
  const g = newGame({ name: '세상', sex: 'm', familyId: 'farmer', mode: 'free', seed: 708 });
  const news = [];
  const count = { fever: 0, lung: 0, flux: 0, plague: 0, rot: 0 }, months = { fever: new Set(), lung: new Set() };
  let prev = new Set();
  for (let i = 0; i < 1200; i++) {
    step(g, (t) => news.push(t));
    for (const o of HS(g).outbreaks) { const k = `${o.kind}|${o.region}|${o.start.y}|${o.start.m}`; if (!prev.has(k)) { prev.add(k); count[o.kind]++; if (months[o.kind]) months[o.kind].add(o.start.m); } }
  }
  check(count.fever >= 10 && count.lung >= 10, `100년 동안 철병이 너무 적다 (${JSON.stringify(count)})`);
  check([...months.fever].every((m) => m >= 6 && m <= 9) && [...months.lung].every((m) => m >= 11 || m <= 3), '철에 맞지 않게 병이 돈다');
  check(count.fever + count.lung + count.flux <= 400, `병이 너무 잦다 (${JSON.stringify(count)})`);
  for (const t of news) if (BAD.test(t)) { check(false, `소식 글 이상: ${t}`); break; }
  // 홍수 뒤 이질
  const f = newGame({ name: '홍수', sex: 'm', familyId: 'farmer', mode: 'free', seed: 709 });
  let flux = 0;
  for (let y = 0; y < 30; y++) for (let m = 0; m < 12; m++) {
    f.nature.active = f.date.month >= 6 && f.date.month <= 9 ? [{ kind: 'flood', region: 'river', sev: 0.8, left: 2, start: { y: f.date.year, m: f.date.month } }] : [];
    const before = HS(f).outbreaks.filter((o) => o.kind === 'flux').length;
    step(f);
    if (HS(f).outbreaks.filter((o) => o.kind === 'flux' && o.region === 'river').length > 0 && before === 0) flux++;
  }
  check(flux >= 5, `해마다 홍수가 나는데 30년 동안 이질이 거의 안 돈다 (${flux})`);
  // 역병
  const p = newGame({ name: '역병', sex: 'm', familyId: 'farmer', mode: 'free', seed: 710 });
  p.world.plague = true; p.world.plagueMonths = 12;
  for (let i = 0; i < 12; i++) step(p);
  const regions = new Set(HS(p).outbreaks.filter((o) => o.kind === 'plague').map((o) => o.region));
  check(regions.size >= 2, `역병이 1년 동안 번지지 않는다 (${[...regions]})`);
  p.world.plague = false;
  for (let i = 0; i < 8; i++) step(p);
  check(!HS(p).outbreaks.some((o) => o.kind === 'plague'), '나라의 역병이 끝났는데 고장의 역병이 남았다');
}
// 10) 예전 저장
{
  const g = newGame({ name: '예전', sex: 'm', familyId: 'farmer', mode: 'free', seed: 711 });
  delete g.health;
  runHooks('migrate', g);
  check(!!g.health && Array.isArray(g.health.sick) && g.health.lineage, '예전 저장을 못 채운다');
}
// 11) 40년 플레이
{
  let years = 0, sick = 0;
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '평생', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 1195 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('health_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.5) ? rng.pick(pref) : rng.pick(acts)).id })));
      if (HS(g).sick.length) sick++;
      let k = 0;
      while (g.pendingEvent && k++ < 40) resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1)));
    }
    years += m / 12;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of HS(g).log) if (BAD.test(l.text)) { check(false, `병 기록 이상: ${l.text}`); break; }
    check(!BAD.test(JSON.stringify(healthInfo(g)).replace(/null/g, '0')) && !BAD.test(healthLine(g)), '화면 정보에 이상한 값');
  }
  console.log(`병과 의술 ${Math.round(years)}년 4판 플레이, 누군가 앓던 달 ${sick}`);
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
