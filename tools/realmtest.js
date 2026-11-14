import '../src/content.js';
// 다른 왕국 점검: 국경을 넘고, 이 나라 저 나라에서 살고, 귀화하고, 쫓겨나는 삶을 여러 번 돌려 본다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { PLACES, travelMonths } from '../src/places.js';
import { crimeState, sentenceAt, lawAt, watchName, reportCrime, reachingBounty } from '../src/crime.js';
import { REALMS, REALM_IDS, realmOf, realmState, realmsForMap, borderNote, currentRealm, realmInfo, realmStatus, crossBorder, MAP_PLACES_EXTRA } from '../src/realms/index.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 20) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const tally = { borders: 0, entered: {}, naturalized: 0, exiled: 0, deported: 0, asylum: 0, events: {} };
const samples = [];

// 1) 길과 법: 모든 나라의 수도에 레오니아에서 갈 수 있고, 법이 나라마다 다르다
for (const id of REALM_IDS) {
  const cap = REALMS[id].capital;
  ok(PLACES[cap], `capital ${cap}`);
  ok(travelMonths('ern', cap) < 10, `route to ${cap}: ${travelMonths('ern', cap)}`);
  ok(realmOf(cap) === id, `realmOf ${cap}`);
}
{
  const g = newGame({ name: '법', sex: 'm', familyId: 'farmer', mode: 'free', seed: 1 });
  const c = crimeState(g);
  const sentences = {};
  for (const id of REALM_IDS) {
    const cap = REALMS[id].capital;
    c.record = [{ c: 'burglary', place: cap, at: 0, paid: false }];
    sentences[id] = sentenceAt(g, cap);
    ok(watchName(g, cap) && !bad(watchName(g, cap)), `watch ${cap}`);
  }
  ok(sentences.holy > sentences.free, `holy harsher than free ${JSON.stringify(sentences)}`);
  ok(sentences.valhart > sentences.free, 'valhart harsher than free');
  // 망명: 레오니아의 현상금은 제국까지 오지 않고, 성광국과 자유도시에는 온다
  c.record = []; c.bounty = { leocast: 40 };
  L(g).place = 'eisen';
  ok(reachingBounty(g) === 0, 'leonia bounty does not reach valhart');
  L(g).place = 'solaris';
  ok(reachingBounty(g) === 40, 'leonia bounty reaches holy');
  L(g).place = 'barka';
  ok(reachingBounty(g) === 40, 'any bounty reaches free cities');
  realmState(g).asylum = 'free';
  ok(reachingBounty(g) === 0, 'asylum blocks bounty');
  ok(lawAt(g, 'graubel').hangAt === 1, 'march hangs murderers');
  const info = realmsForMap(g);
  ok(info.length === REALM_IDS.length && info.every((r) => r.places.length >= 1), 'realmsForMap');
  for (const r of info) for (const [k, v] of Object.entries(r)) ok(!bad(String(v)) || k === 'naturalizeBlock', `realmInfo ${r.id}.${k}=${v}`);
  L(g).place = 'leocast'; realmState(g).cur = 'leonia';
  ok(borderNote(g, 'eisen') && !borderNote(g, 'harfen'), 'borderNote');
}

// 2) 떠돌이 삶: 열여섯부터 나라 사이를 옮겨 다니며 산다
const WANDER = ['eisen', 'serenia', 'barka', 'solaris', 'graubel', 'leocast'];
for (let run = 0; run < 24; run++) {
  const g = newGame({ name: '나그네', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'fallen_knight', 'merchant'][run % 3], mode: 'once', seed: 7300 + run });
  const settle = WANDER[run % WANDER.length];
  for (let m = 0; m < 12 * 30 && !g.over; m++) {
    const rng = rngOf(g);
    const age = playerAge(g);
    const life = L(g);
    const acts = availableActions(g);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      let pick = null;
      // 열여섯이 되면 정한 나라로 떠나고, 가끔 다른 나라도 다녀온다
      if (age >= 16 && !life.travel && i === 0 && (life.place !== settle || rng.chance(0.02)) && acts.some((a) => a.id === 'travel')) pick = 'travel';
      else if (acts.some((a) => a.id === 'realm_office') && rng.chance(0.15)) pick = 'realm_office';
      else if (life.job && acts.some((a) => a.id === 'work') && rng.chance(0.5)) pick = 'work';
      else if (!life.job && acts.some((a) => a.id === 'seek_job') && rng.chance(0.2)) pick = 'seek_job';
      else if (run % 4 === 3 && acts.some((a) => a.id === 'crime_burglary') && rng.chance(0.25)) pick = 'crime_burglary';
      const a = pick ? acts.find((x) => x.id === pick) : rng.pick(acts.filter((x) => !x.needsTarget));
      if (!a) { console.log('NOACT', pick, life.place, JSON.stringify(life.travel), JSON.stringify(g.crime?.jailed ?? null), playerAge(g), acts.map((x)=>x.id+(x.needsTarget?'*':'')).join(',')); process.exit(2); }
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) {
      ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
      if (run < 3 && samples.length < 12 && PLACES[life.place]?.realm && rng.chance(0.08)) samples.push(`${age}살 ${PLACES[life.place].name} ${r.name}: ${r.text}`);
    }
    for (let k = 0; k < 4 && g.pendingEvent; k++) {
      const pe = g.pendingEvent;
      ok(!bad(pe.text) && !bad(pe.title), `bad event ${pe.id}: ${pe.title} ${pe.text}`);
      const kind = L(g).scene?.kind;
      if (kind) tally.events[kind] = (tally.events[kind] ?? 0) + 1;
      let idx = 0;
      if (kind === 'travel') {
        const sc = L(g).scene.choices;
        idx = sc.findIndex((c) => c.key === settle);
        if (idx < 0) idx = sc.findIndex((c) => c.key === 'abroad');
        if (idx < 0) idx = 0;
      } else if (kind === 'border') {
        tally.borders++;
        idx = rng.int(0, pe.choices.length - 2); // '돌아선다'는 드물게
      } else if (kind === 'realm_office') {
        idx = 0;
      } else if (kind === 'arrest') {
        idx = pe.choices.findIndex((c) => /추방|쫓겨나는/.test(c));
        if (idx < 0) idx = 0;
      } else idx = rng.int(0, pe.choices.length - 1);
      const before = realmState(g).citizen;
      const nat = realmState(g).naturalized.length;
      const out = resolveEvent(g, rngOf(g), idx);
      if (kind === 'arrest' && /추방을 청한다/.test(pe.choices[idx] ?? '')) tally.exiled++;
      if (kind === 'arrest' && /쫓겨나는/.test(pe.choices[idx] ?? '')) tally.deported++;
      ok(!bad(out?.text ?? out), `bad outcome ${kind}: ${JSON.stringify(out).slice(0, 300)}`);
      if (realmState(g).naturalized.length > nat) { tally.naturalized++; if (samples.length < 16) samples.push(`귀화 ${before}→${realmState(g).citizen}: ${typeof out === 'string' ? out : out?.text}`); }
    }
    const R = realmState(g);
    if (!L(g).travel && PLACES[L(g).place]) tally.entered[R.cur] = (tally.entered[R.cur] ?? 0) + 1;
    if (R.asylum) tally.asylum++;
    ok(REALMS[R.citizen], `citizen ${R.citizen}`);
  }
}

// 3) 예전 저장: realms가 없어도 채워진다
{
  const g = newGame({ name: '옛저장', sex: 'f', familyId: 'farmer', mode: 'free', seed: 3 });
  delete g.realms;
  const R = realmState(g);
  ok(R.citizen === 'leonia' && R.cur === currentRealm(g), 'migrate defaults');
  ok(realmInfo(g, 'holy').standing === '모름', 'standing');
  ok(realmStatus(g).line === '레오니아' && !realmStatus(g).foreigner, 'realmStatus');
  ok(MAP_PLACES_EXTRA.length === 8, 'MAP_PLACES_EXTRA');
  ok(crossBorder(g, 'valhart') === false, 'child cannot cross');
  g.player.ageMonths = 20 * 12; g.people.find((p) => p.isPlayer).ageMonths = 240;
  ok(crossBorder(g, 'valhart') === true && L(g).scene.choices[0].key === 'eisen', 'crossBorder opens travel to capital');
}

console.log('나라에 머문 달:', JSON.stringify(tally.entered));
console.log('국경', tally.borders, '귀화', tally.naturalized, '추방 청함', tally.exiled, '국외 추방', tally.deported, '망명 달수', tally.asylum);
console.log('장면:', JSON.stringify(tally.events));
for (const s of samples) console.log(' -', s.slice(0, 220));
ok(tally.borders > 20, 'borders crossed');
ok(Object.keys(tally.entered).length >= 5, 'lived in many realms');
ok(tally.naturalized >= 1, 'someone naturalized');
ok(tally.exiled + tally.deported >= 1, 'someone exiled');
console.log(fail ? `realmtest: ${fail} 실패` : 'realmtest: 통과');
process.exit(fail ? 1 : 0);
