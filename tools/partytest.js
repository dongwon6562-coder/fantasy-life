import '../src/content.js';
// 동료와 모험(src/party/)을 브라우저 없이 돌려 보는 점검.
// 여러 사람을 스무 살에 큰 고장에 세우고, 동료를 모으고, 미궁·의뢰·긴 의뢰를 15년 동안 돌린다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId, byId } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { P, members, partyStatus, MAX_COMPANIONS } from '../src/party/core.js';
import { STORIES } from '../src/party/stories.js';

const verbose = process.argv.includes('-v');
let problems = 0;
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const seen = { joins: { friend: 0, merc: 0, guild: 0 }, scenes: new Set(), steps: new Set(), done: {}, failed: {}, fallen: 0, injured: 0, left: 0, compFights: 0, maxParty: 0, betray: 0 };
const samples = [];
const PLACES_RUN = ['harfen', 'verden', 'leocast', 'gruental', 'harfen', 'verden', 'leocast', 'ern'];
const PARTY_SCENES = ['gather_party', 'party_manage', 'comp_leave', 'story_pick', 'story_step'];

function pick(acts, rng, g) {
  const has = (id) => acts.find((x) => x.id === id);
  if (g.player.fatigue > 65) return has('rest') ?? acts[0];
  if (has('gather_party') && members(g).length < MAX_COMPANIONS && rng.chance(0.5)) return has('gather_party');
  if (has('party_quest') && rng.chance(0.6)) return has('party_quest');
  if (has('party_manage') && rng.chance(0.08)) return has('party_manage');
  if (has('delve') && rng.chance(0.25)) return has('delve');
  if (has('quest') && rng.chance(0.25)) return has('quest');
  return has('work') ?? has('rest') ?? acts[0];
}

function month(g) {
  const rng = rngOf(g);
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) choices.push({ id: pick(acts, rng, g).id });
  const before = members(g).map((p) => p.id);
  const res = endMonth(g, choices);
  for (const r of res) if (bad(r.text)) { problems++; console.log('bad result', r); }
  for (const n of g.news) if (bad(n.text)) { problems++; console.log('bad news', n); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 3) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    const kind = s?.kind;
    if (kind) seen.scenes.add(kind);
    if (kind === 'story_step') seen.steps.add(`${P(g).story.id}:${P(g).story.step}`);
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) { problems++; console.log('bad scene', kind, pe.title, pe.text, pe.choices); }
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (kind === 'gather_party') idx = rngOf(g).int(0, Math.max(0, pe.choices.length - 2));
    if (kind === 'story_pick') idx = rngOf(g).int(0, Math.max(0, pe.choices.length - 2));
    const story = P(g).story?.id;
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) { problems++; console.log('bad scene text', kind, pe.title, out); }
    if (/배신했다|배신/.test(out)) seen.betray++;
    if (kind === 'story_step' && story && !P(g).story) { const r = P(g).stories[story]; (r === 'done' ? seen.done : seen.failed)[story] = ((r === 'done' ? seen.done : seen.failed)[story] ?? 0) + 1; }
    if (PARTY_SCENES.includes(kind) && samples.length < 80) samples.push(`[${pe.title}] ${out}`);
  }
  // 저장 상태에 함수가 남으면 안 된다
  if (P(g).story && Object.values(P(g).story).some((v) => typeof v === 'function')) { problems++; console.log('function in story state'); }
  if (P(g).story && !Number.isFinite(P(g).story.due)) { problems++; console.log('bad story due', P(g).story); }
  const after = members(g).map((p) => p.id);
  for (const id of before) if (!after.includes(id)) { const p = byId(g, id); if (p && p.alive) seen.left++; }
  for (const p of members(g)) if (p.comp.out > 0) seen.injured++;
  seen.maxParty = Math.max(seen.maxParty, after.length);
  if (after.length > MAX_COMPANIONS) { problems++; console.log('party too big', after.length); }
  if (new Set(P(g).members).size !== P(g).members.length) { problems++; console.log('duplicate member'); }
  for (const id of P(g).members) { const p = byId(g, id); if (p && p.alive && !p.comp) { problems++; console.log('member without comp', p.name); } }
  const st = partyStatus(g);
  for (const m of st.members) {
    if (!Number.isFinite(m.pow) || !Number.isFinite(m.loyalty) || m.loyalty < 0 || m.loyalty > 100 || !m.roleName || bad(m.loyaltyWord)) { problems++; console.log('bad partyStatus member', m); }
    seen.compFights = Math.max(seen.compFights, m.fights);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) { problems++; console.log('bad money', g.player.money); }
}

for (let run = 0; run < PLACES_RUN.length; run++) {
  const g = newGame({ name: '모험가', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant'][run % 2], mode: 'free', seed: 31000 + run * 17 });
  while (playerAge(g) < 18 && !g.over) month(g);
  if (g.over) continue;
  const life = L(g);
  life.place = PLACES_RUN[run]; life.travel = null; life.home = 'inn';
  g.player.money += 200;
  g.player.skills.sword = Math.max(g.player.skills.sword, 25 + run * 3);
  if (run % 2 === 0) life.fac.guild = { member: true, rank: run % 4 === 0 ? 1 : 0, merit: 0 };
  const knownIds = new Set(g.people.filter((p) => p.known).map((p) => p.id));
  for (let m = 0; m < 12 * 15 && !g.over; m++) {
    const ids = new Set(P(g).members);
    month(g);
    for (const id of P(g).members) if (!ids.has(id)) { const p = byId(g, id); if (p.comp?.guild) seen.joins.guild++; else if (p.comp?.hired) seen.joins.merc++; else seen.joins.friend++; void knownIds; }
    // 반쯤은 이야기 줄기가 있는 다른 고장으로 옮겨 다닌다
    if (m % 40 === 39 && !L(g).travel) L(g).place = PLACES_RUN[(run + 1 + Math.floor(m / 40)) % PLACES_RUN.length];
    if (m % 37 === 0) {
      const copy = JSON.parse(JSON.stringify(g)); setNextId(copy.nextId); runHooks('migrate', copy);
      if (!copy.party || !Array.isArray(copy.party.members) || copy.party.members.length !== P(g).members.length) { problems++; console.log('migrate lost party'); }
    }
  }
  seen.fallen += P(g).fallen.length;
  const st = partyStatus(g);
  if (verbose || run < 3) console.log(`#${run} ${PLACES_RUN[run]} age=${playerAge(g)} over=${g.over} 파티 ${st.size}/${st.max}: ${st.members.map((m) => `${m.name}(${m.roleName},충성${m.loyalty},${m.fights}전${m.wins}승)`).join(' ')} · 쓰러진 동료 ${P(g).fallen.length} · 의뢰 ${JSON.stringify(P(g).stories)}`);
}

// 옛 저장(파티 없음)도 열린다
{
  const g = newGame({ name: '옛', sex: 'm', familyId: 'farmer', mode: 'free', seed: 5 });
  delete g.party;
  const copy = JSON.parse(JSON.stringify(g)); setNextId(copy.nextId); runHooks('migrate', copy);
  if (!copy.party?.members || !copy.party.stories) { problems++; console.log('migrate old save failed'); }
}

const allSteps = Object.entries(STORIES).flatMap(([id, S]) => Object.keys(S.steps).map((k) => `${id}:${k}`));
console.log(`장면: ${[...seen.scenes].filter((k) => PARTY_SCENES.includes(k)).join(',')}`);
console.log(`동료 합류: ${JSON.stringify(seen.joins)} · 최대 파티 ${seen.maxParty} · 가장 많이 싸운 동료 ${seen.compFights}전 · 쓰러진 동료 ${seen.fallen} · 다친 달 ${seen.injured} · 살아서 떠남 ${seen.left} · 배신 ${seen.betray}`);
console.log(`긴 의뢰 성공 ${JSON.stringify(seen.done)} 실패 ${JSON.stringify(seen.failed)} · 걸음 ${seen.steps.size}/${allSteps.length}`);
if (verbose) for (const s of samples) console.log('·', s);
for (const k of ['gather_party', 'story_pick', 'story_step']) if (!seen.scenes.has(k)) { problems++; console.log('장면이 한 번도 나오지 않음:', k); }
for (const k of ['friend', 'merc', 'guild']) if (!seen.joins[k]) { problems++; console.log('이렇게 들어온 동료가 없음:', k); }
for (const id of Object.keys(STORIES)) if (!seen.done[id] && !seen.failed[id]) { problems++; console.log('끝까지 가 본 적 없는 긴 의뢰:', id); }
if (!seen.compFights) { problems++; console.log('동료가 싸운 적이 없음'); }
if (!seen.injured) { problems++; console.log('동료가 다친 적이 없음'); }
const missing = allSteps.filter((s) => !seen.steps.has(s));
if (missing.length) console.log('(참고) 나오지 않은 걸음:', missing.join(','));
console.log(problems ? `FAIL ${problems}` : 'OK');
if (problems) process.exit(1);
