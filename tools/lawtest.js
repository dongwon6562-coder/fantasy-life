import './lsshim.js';
import '../src/content.js';
// 법과 재판 점검: 처음 상태, 체포에서 재판 청하기, 스스로 변론·변론인·뇌물·죄 인정, 나라마다 다른 법정(결투 재판·신명 재판·진실의 주문),
// 고발당하기와 궐석 판결, 억울한 일과 고발하기, 거짓 고발, 증인과 거짓 증언, 재판관 자리, 사면 청원과 대관 사면, 낙인과 대 잇기, 예전 저장, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { makePerson, byId } from '../src/npc.js';
import { faithState } from '../src/faith/index.js';
import { lawState as LS, lawInfo, lawLine, openCase, askTrial, verdict, lean, trialOptions, addGrievance } from '../src/law/index.js';
import { crimeState, reportCrime, jail, isJailed } from '../src/crime.js';
import { ENDS } from '../src/duel/registry.js';
import { queueScene } from '../src/adventure/core.js';
import { villageState } from '../src/village/index.js';
import { courtState } from '../src/court/index.js';
import { feudState } from '../src/feud/index.js';
import { reputeState } from '../src/repute/index.js';

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
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; for (const k of Object.keys(g.player.stats)) g.player.stats[k] = Math.max(g.player.stats[k], 35); g.date.year += y; (g.flags ??= {}).adult = true; };
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
  return out;
};
const month = (g) => { for (const p of g.people) if (p.alive) p.ageMonths += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; runHooks('afterMonth', g, makeRng({ s: 2 })); };
const child = (g, ageY) => { const p = makePerson(makeRng({ s: ageY + 40 }), { sex: 'f', ageMonths: ageY * 12, lastName: '아이' }); p.place = L(g).place; p.alive = true; g.people.push(p); byId(g, g.player.id).childIds.push(p.id); p.motherId = g.player.id; return p; };
const fresh = (seed, name = '법정', fam = 'merchant') => newGame({ name, sex: 'm', familyId: fam, mode: 'free', seed });


const T = (g, opts) => openCase(g, { role: 'accused', charge: 'theft', guilty: false, evidence: 40, ...opts });
const decideN = (n, mk, key) => { let won = 0; for (let i = 0; i < n; i++) { const g = mk(i); const c = g._c; askTrial(g, c); scene(g, 'law_trial', key, 100 + i); if (c.state === 'won') won++; } return won; };
const at = (place, seed, opts = {}) => { const g = fresh(seed); grown(g); stay(g, place); g.player.money = 500; g.player.stats.int = 40; g.player.stats.cha = 40; g._c = T(g, opts); L(g).queue = L(g).queue.filter((x) => x.kind !== 'law_trial'); return g; };

// 1) 처음
{
  const g = fresh(1701);
  const S = LS(g);
  check(S.cases.length === 0 && S.stain === 0 && S.skill === 0, '처음 상태가 이상하다');
  check(lawLine(g) === '' && !BAD.test(JSON.stringify(lawInfo(g)).replace(/null/g, '0')), `처음 화면 정보가 이상하다 (${lawLine(g)})`);
  check(!has(g, 'law_sue') && !has(g, 'law_study') && !has(g, 'law_advocate'), '아기가 법정에 선다');
  check(/영주의 법정/.test(lawInfo(g).here.court), '레오니아의 법정 이름이 이상하다');
}
// 2) 체포에서 재판을 청한다
{
  const g = fresh(1702); grown(g); stay(g, 'harfen'); g.player.money = 0;
  reportCrime(g, 'burglary'); reportCrime(g, 'pickpocket');
  queueScene(g, 'arrest', {}, { first: true });
  const out = scene(g, 'arrest', 'law_trial');
  check(/재판/.test(out) && queued(g, 'law_trial') && LS(g).cases[0]?.crime && !isJailed(g), `체포에서 재판을 청할 수 없다 (${out})`);
  check(/재판 중/.test(lawLine(g)), `한 줄 요약: ${lawLine(g)}`);
  const c = LS(g).cases[0];
  const keys = trialOptions(g, c).map((o) => o.key);
  check(keys.includes('speak') && keys.includes('plead') && keys.includes('ordeal') && !keys.includes('combat') && !keys.includes('advocate'), `레오니아 평민의 재판 선택지가 이상하다 (${keys})`);
  const m0 = crimeState(g).record.filter((r) => !r.paid).length;
  scene(g, 'law_trial', 'plead');
  check(c.state === 'lost' && isJailed(g) && crimeState(g).jailed.months >= 1 && LS(g).stain > 0 && m0 === 2, `죄를 인정했는데 옥에 가지 않았다 (${c.state}, ${JSON.stringify(crimeState(g).jailed)})`);
  // 풀려나면 죄가 지워진다
  const h = fresh(1712); grown(h); stay(h, 'harfen'); reportCrime(h, 'burglary');
  const c2 = openCase(h, { role: 'accused', charge: 'crime', crime: true, crimeName: '빈집털이', guilty: true, evidence: 40 });
  verdict(h, makeRng({ s: 1 }), c2, true, 'court');
  check(c2.state === 'won' && !crimeState(h).record.some((r) => !r.paid) && (crimeState(h).heat.harfen ?? 0) === 0, '무죄 판결인데 죄와 수배가 남았다');
  // 살인을 거듭하면 교수대
  const k = fresh(1722); grown(k); stay(k, 'harfen'); reportCrime(k, 'murder'); reportCrime(k, 'murder');
  const c3 = openCase(k, { role: 'accused', charge: 'crime', crime: true, crimeName: '살인', guilty: true, evidence: 80 });
  verdict(k, makeRng({ s: 1 }), c3, false, 'court');
  check(L(k).pendingDeath === '교수형', '살인 둘에 교수형이 아니다');
}
// 3) 스스로 변론: 죄가 없으면 더 잘 이기고, 증거가 단단하면 진다. 변론인은 힘이 된다.
{
  const inno = decideN(40, (i) => at('harfen', 1800 + i, { guilty: false, evidence: 45 }), 'speak');
  const guil = decideN(40, (i) => at('harfen', 1800 + i, { guilty: true, evidence: 70 }), 'speak');
  const adv = decideN(40, (i) => at('harfen', 1800 + i, { guilty: true, evidence: 70 }), 'advocate');
  console.log(`스스로 변론: 죄 없음 ${inno}/40, 죄 있고 증거 단단 ${guil}/40, 변론인 ${adv}/40`);
  check(inno > guil + 8 && inno >= 18 && guil <= 20, '죄의 유무와 증거가 판결을 가르지 않는다');
  check(adv > guil, '변론인을 사도 나아지지 않는다');
  // 외지인에게 더 엄하다
  const g = at('eisen', 1730); const ln1 = lean(g, g._c);
  const { realmState } = await import('../src/realms/index.js');
  realmState(g).citizen = 'valhart'; const ln2 = lean(g, g._c);
  check(ln1 > ln2, `외지인과 신민의 재판관 기울기가 같다 (${ln1}, ${ln2})`);
}
// 4) 나라마다 다른 법정
{
  // 뇌물: 의회 법정은 잘 통하고, 제국 법원은 통하지 않으며 그 자체가 죄다
  const free = decideN(40, (i) => at('barka', 1900 + i, { guilty: true, evidence: 60 }), 'bribe');
  const vh = decideN(40, (i) => at('eisen', 1900 + i, { guilty: true, evidence: 60 }), 'bribe');
  console.log(`뇌물: 자유도시 ${free}/40, 제국 ${vh}/40`);
  check(free > vh + 10, '자유도시와 제국의 뇌물이 다르지 않다');
  const e = at('eisen', 1950, { guilty: true, evidence: 60 }); askTrial(e, e._c);
  const f0 = crimeState(e).record.length;
  for (let i = 0; i < 20 && e._c.state === 'open'; i++) { e._c.state = 'open'; scene(e, 'law_trial', 'bribe', 200 + i); if (e._c.state === 'won') { e._c.state = 'open'; askTrial(e, e._c); } }
  check(crimeState(e).record.some((r) => r.c === 'fraud'), '제국 법관에게 뇌물을 내밀었는데 죄가 되지 않는다');
  check(!trialOptions(e, e._c).some((o) => o.key === 'ordeal' || o.key === 'combat'), '제국 법원에 결투·신명 재판이 있다');
  // 진실의 주문: 죄가 없으면 풀리고, 있으면 묶인다
  const ti = decideN(20, (i) => at('serenia', 2000 + i, { guilty: false, evidence: 70 }), 'truth');
  const tg = decideN(20, (i) => at('serenia', 2000 + i, { guilty: true, evidence: 20 }), 'truth');
  check(ti >= 16 && tg <= 4, `진실의 주문이 진실을 가리지 않는다 (${ti}, ${tg})`);
  // 신명 재판: 손을 덴다
  const o = at('solaris', 2050); askTrial(o, o._c); scene(o, 'law_trial', 'ordeal');
  check(o.player.injuries.some((x) => /덴 손/.test(x.name)) && o._c.state !== 'open', '신명 재판에서 손을 데지 않는다');
  // 결투 재판: 변경은 누구나, 레오니아는 귀족만
  const m = at('graubel', 2060); check(trialOptions(m, m._c).some((x) => x.key === 'combat'), '변경에서 결투 재판을 청할 수 없다');
  const n = at('harfen', 2061, {}, 'fallen_knight');
  const nb = fresh(2062, '기사', 'fallen_knight'); grown(nb); stay(nb, 'harfen'); const cb = T(nb, {});
  check(trialOptions(nb, cb).some((x) => x.key === 'combat') && !trialOptions(n, n._c).some((x) => x.key === 'combat'), '레오니아 결투 재판이 귀족에게만 열리지 않는다');
  askTrial(m, m._c); scene(m, 'law_trial', 'combat');
  check(m.duelQueued?.kind === 'law_combat' && m._c.state === 'open', '결투 재판이 잡히지 않는다');
  const out = ENDS.law_combat(m, makeRng({ s: 1 }), true, m.duelQueued);
  check(m._c.state === 'won' && !BAD.test(out) && LS(m).rec.combat === 1, `결투에 이겼는데 재판을 지지 않았다 (${out})`);
  const m2 = at('graubel', 2063); askTrial(m2, m2._c); scene(m2, 'law_trial', 'combat');
  const out2 = ENDS['law_combat:decline'](m2, m2.duelQueued);
  check(m2._c.state === 'lost' && !BAD.test(out2), '결투장에서 물러났는데 지지 않았다');
  // 숲의 장로 회의: 변론인도 뇌물도 없다
  const el = at('silverleaf', 2064);
  check(!trialOptions(el, el._c).some((x) => x.key === 'advocate'), '숲의 장로 회의에 변론인이 있다');
}
// 5) 고발당하다: 법정, 합의, 모른 척(궐석)
{
  const g = fresh(1705); grown(g); stay(g, 'verden'); g.player.money = 200;
  check(cond(g, 'law_accused'), '고발당할 일이 없다');
  fire(g, 'law_accused', 0);
  check(queued(g, 'law_trial'), '법정에 나간다고 했는데 재판이 없다');
  const c = LS(g).cases.at(-1);
  const m0 = g.player.money;
  scene(g, 'law_trial', 'plead');
  check(c.state === 'lost' && g.player.money < m0 && !isJailed(g), `죄를 인정했는데 벌금을 안 냈다 (${m0} → ${g.player.money})`);
  // 돈이 없으면 옥에서 갚는다
  const p = fresh(1715); grown(p); stay(p, 'verden'); p.player.money = 0; p.player.familyMoney = 0;
  const cp = openCase(p, { role: 'accused', charge: 'theft', guilty: true, evidence: 60 });
  verdict(p, makeRng({ s: 1 }), cp, false, 'court');
  check(isJailed(p) && p.player.money === 0, '벌금을 못 내는데 옥에 가지 않는다');
  // 모른 척하면 궐석 판결
  const a = fresh(1725); grown(a); stay(a, 'verden'); a.player.money = 5;
  fire(a, 'law_accused', 2);
  const ca = LS(a).cases.at(-1);
  month(a);
  check(ca.state === 'lost' && /궐석/.test(ca.verdict) && !isJailed(a), `궐석 판결이 없다 (${ca.state} ${ca.verdict})`);
  check((crimeState(a).bounty.verden ?? 0) > 0 || a.player.money === 0, '궐석 벌금을 못 냈는데 아무 일 없다');
  fire(a, 'law_accused', 1, 12);
  // 성광국에서 의심받으면 이단으로 고발당한다
  const h = fresh(1735); grown(h); stay(h, 'solaris'); faithState(h).suspicion = 70;
  const ctx = ev('law_accused').prepare(h, makeRng({ s: 1 }));
  check(ctx.charge === 'heresy' && ctx.guilty, '성광국에서 의심받는데 이단 고발이 아니다');
}
// 6) 억울한 일과 고발하기, 합의, 거짓 고발
{
  const g = fresh(1706); grown(g); stay(g, 'harfen'); g.player.money = 100;
  check(cond(g, 'law_wrong'), '억울한 일이 생기지 않는다');
  fire(g, 'law_wrong', 0);
  check(LS(g).grievances.length === 1 && has(g, 'law_sue') && /고발할 일/.test(lawLine(g)), '억울한 일을 고발할 수 없다');
  act(g, 'law_sue');
  const c = LS(g).cases.at(-1);
  check(c.role === 'plaintiff' && c.guilty && queued(g, 'law_trial') && LS(g).grievances.length === 0, '고발장이 재판이 되지 않는다');
  const m0 = g.player.money;
  scene(g, 'law_trial', 'settle');
  check(c.state === 'settled' && g.player.money > m0, '합의했는데 합의금이 없다');
  // 이기면 배상금
  let wins = 0;
  for (let i = 0; i < 20; i++) { const h = fresh(2100 + i); grown(h); stay(h, 'harfen'); h.player.money = 50; addGrievance(h, 'debt', { id: null, name: '오토' }, 70); act(h, 'law_sue'); const m1 = h.player.money; scene(h, 'law_trial', 'speak', 300 + i); if (LS(h).cases.at(-1).state === 'won') { wins++; check(h.player.money > m1, '이겼는데 배상금이 없다'); } }
  check(wins >= 8, `증거가 단단한 고발을 거의 못 이긴다 (${wins}/20)`);
  // 원수를 억지로 고발하면 지기 쉽고, 지면 손가락질
  let lost = 0, honest = 0;
  for (let i = 0; i < 20; i++) {
    const h = fresh(2200 + i); grown(h); stay(h, 'harfen');
    const foe = h.people.find((p) => !p.isPlayer && p.alive && !h.player.familyIds.includes(p.id) && p.id !== h.player.id && (p.place ?? 'ern') === 'ern') ?? h.people.find((p) => !p.isPlayer && p.alive);
    foe.place = 'harfen'; feudState(h).grudges[foe.id] = { heat: 50, why: ['옛일'], since: 0, gen: 0 };
    check(has(h, 'law_sue'), '원수를 고발할 수 없다'); act(h, 'law_sue');
    const c2 = LS(h).cases.at(-1); check(!c2.guilty && c2.other.id === foe.id, '원수 고발이 거짓 고발이 아니다');
    const r0 = JSON.stringify(reputeState(h));
    scene(h, 'law_trial', 'speak', 400 + i);
    if (c2.state === 'lost') { lost++; if (JSON.stringify(reputeState(h)) !== r0) honest++; }
  }
  check(lost >= 12 && honest >= 1, `거짓 고발이 너무 잘 이긴다 (${lost}/20, ${honest})`);
  const w = fresh(2300); grown(w); stay(w, 'harfen'); addGrievance(w, 'land', { id: null, name: '한스' }, 50); act(w, 'law_sue'); scene(w, 'law_trial', 'withdraw');
  check(LS(w).cases.at(-1).state === 'dropped', '고발을 거둬도 재판이 남는다');
  fire(w, 'law_wrong', 1, 5); fire(w, 'law_wrong', 1, 6); fire(w, 'law_wrong', 2);
}
// 7) 증인과 거짓 증언
{
  const g = fresh(1707); grown(g); stay(g, 'leocast'); g.player.money = 50;
  check(cond(g, 'law_witness'), '증인으로 불릴 일이 없다');
  fire(g, 'law_witness', 0);
  const m0 = g.player.money;
  fire(g, 'law_witness', 1);
  check(g.player.money > m0 && LS(g).perjury.length === 1 && LS(g).rec.lies === 1, '거짓 증언이 남지 않는다');
  fire(g, 'law_witness', 2);
  // 거짓은 언젠가 드러난다
  for (let i = 0; i < 400 && LS(g).perjury.length; i++) month(g);
  check(!LS(g).perjury.length && crimeState(g).record.some((r) => r.c === 'fraud'), '거짓 증언이 서른 해가 넘도록 드러나지 않는다');
}
// 8) 재판관 자리
{
  const g = fresh(1708); grown(g); stay(g, 'ern');
  check(!cond(g, 'law_judge'), '아무 자리도 없는데 판결을 내린다');
  villageState(g).office = { place: 'ern', since: 0, title: '촌장' };
  check(cond(g, 'law_judge'), '촌장인데 판결할 일이 없다');
  for (let c = 0; c < 3; c++) for (let s = 0; s < 3; s++) fire(g, 'law_judge', c, 50 + s * 7 + c);
  check(LS(g).rec.judged === 9, '판결 기록이 남지 않는다');
}
// 9) 사면: 청원과 대관 사면
{
  const g = fresh(1709); grown(g); stay(g, 'harfen'); g.player.money = 200;
  jail(g, 10);
  check(cond(g, 'law_pardon'), '옥에 오래 갇혔는데 사면 청원이 없다');
  fire(g, 'law_pardon', 0, 3);
  courtState(g).standing = 20;
  fire(g, 'law_pardon', 1);
  check(!isJailed(g) && LS(g).rec.pardons >= 1, '힘 있는 사람의 이름을 빌렸는데 풀려나지 않는다');
  jail(g, 3); fire(g, 'law_pardon', 2);
  const a = fresh(1719); grown(a); stay(a, 'harfen');
  jail(a, 20); LS(a).ruler = 'oswald'; a.realm.ruler = 'erik'; a.realm.succession = 'settled';
  month(a);
  check(!isJailed(a) && a.news.some((n) => /사면령/.test(n.text)), '새 왕이 섰는데 대관 사면이 없다');
  const b = fresh(1729); grown(b); stay(b, 'eisen'); jail(b, 20); LS(b).ruler = 'oswald'; b.realm.ruler = 'erik'; b.realm.succession = 'settled'; month(b);
  check(isJailed(b), '레오니아 사면령이 제국 감옥까지 연다');
}
// 10) 낙인과 대 잇기
{
  const g = fresh(1710); grown(g, 30); stay(g, 'harfen'); g.player.money = 500;
  for (let i = 0; i < 3; i++) verdict(g, makeRng({ s: i }), openCase(g, { role: 'accused', charge: 'theft', guilty: true, evidence: 60 }), false, 'court');
  const st = LS(g).stain;
  check(st >= 25 && /낙인/.test(lawLine(g)), `무거운 판결이 거듭됐는데 낙인이 없다 (${st})`);
  check(cond(g, 'law_stain'), '낙인이 따라오지 않는다');
  fire(g, 'law_stain', 0); fire(g, 'law_stain', 1);
  LS(g).skill = 50;
  runHooks('heir', g, makeRng({ s: 1 }), {});
  check(LS(g).stain > 0 && LS(g).stain < st && LS(g).skill < 50 && LS(g).rec.lost === 0, '대를 이었는데 낙인이 그대로거나 사라졌다');
  for (let i = 0; i < 12 * 30; i++) month(g);
  check(LS(g).stain < 5, `서른 해가 지나도 낙인이 옅어지지 않는다 (${LS(g).stain})`);
}
// 11) 법 배우기와 변론 맡기
{
  const g = fresh(1711); grown(g); stay(g, 'leocast'); g.player.skills.letters = 20;
  check(has(g, 'law_study') && !has(g, 'law_advocate'), '법을 모르는데 변론을 맡는다');
  for (let i = 0; i < 15; i++) act(g, 'law_study', i);
  check(LS(g).skill >= 30 && has(g, 'law_advocate'), `법을 배워도 변론을 맡을 수 없다 (${LS(g).skill})`);
  const m0 = g.player.money; for (let i = 0; i < 5; i++) act(g, 'law_advocate', i);
  check(g.player.money > m0 && LS(g).rec.pleas === 5, '변론을 맡아도 돈이 안 된다');
  stay(g, 'ern'); check(!has(g, 'law_advocate'), '시골 마을에서 변론 일감이 있다');
}
// 12) 예전 저장
{
  const g = fresh(1713);
  delete g.law;
  runHooks('migrate', g);
  check(!!g.law && Array.isArray(g.law.cases) && g.law.rec.won === 0, '예전 저장을 못 채운다');
}
// 13) 40년 플레이
{
  let years = 0, trials = 0;
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '평생', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 1795 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('law_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.5) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1)));
    }
    years += m / 12; trials += LS(g).cases.length;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of LS(g).log) if (BAD.test(l.text)) { check(false, `법 기록 이상: ${l.text}`); break; }
    check(!BAD.test(JSON.stringify(lawInfo(g)).replace(/null/g, '0')) && !BAD.test(lawLine(g)), '화면 정보에 이상한 값');
  }
  console.log(`법과 재판 ${Math.round(years)}년 4판 플레이, 재판 ${trials}건`);
  check(trials > 0, '40년 동안 재판이 한 번도 없었다');
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
