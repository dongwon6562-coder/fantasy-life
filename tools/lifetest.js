import '../src/content.js';
// 성인 이후의 삶(직업·이사·소속·싸움·미궁·대 잇기)을 브라우저 없이 돌려 보는 점검.
// 성인이 되면 갈래 D의 행동을 자주 고르는 플레이어로 60년 넘게 산다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { playerPower } from '../src/adventure/combat.js';
import { memberships } from '../src/factions.js';
import { marry } from '../src/relations.js';
import { living, ageYears } from '../src/npc.js';

const D_ACTS = ['seek_job', 'work', 'work', 'work', 'faction_door', 'quest', 'quest', 'delve', 'travel', 'housing', 'gear', 'harfen_dojo', 'leocast_dojo', 'verden_yard', 'train_body', 'sword_guard', 'sword_father'];
const fams = ['farmer', 'fallen_knight', 'merchant'];
const verbose = process.argv.includes('-v');
let problems = 0;
const seen = { scenes: new Set(), acts: new Set(), places: new Set(), jobs: new Set(), heirs: 0, deaths: 0, overwhelm: 0, cleared: new Set(), nemeses: 0, guildTop: 0, knightTop: 0 };
const samples = [];

for (let run = 0; run < 24; run++) {
  const g = newGame({ name: '시험', sex: run % 2 ? 'm' : 'f', familyId: fams[run % 3], mode: 'once', seed: 7000 + run });
  for (let m = 0; m < 12 * 70 && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    const ids = new Set(acts.map((a) => a.id));
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      let a;
      const wanted = D_ACTS.filter((id) => ids.has(id));
      if (playerAge(g) >= 15 && wanted.length && rng.chance(0.8)) { const id = rng.pick(wanted); a = acts.find((x) => x.id === id); }
      else a = rng.pick(acts);
      if (g.player.fatigue > 75) a = acts.find((x) => x.id === 'rest') ?? a;
      const c = { id: a.id };
      if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive)?.id;
      choices.push(c);
      seen.acts.add(a.id);
    }
    // 대 잇기를 시험하려면 아이가 있어야 한다: 스물두 살이 넘으면 혼인시킨다
    if (playerAge(g) >= 22 && !me(g).spouseId && rng.chance(0.1)) {
      const sp = living(g).find((p) => !p.isPlayer && !p.spouseId && p.sex !== g.player.sex && Math.abs(ageYears(p) - playerAge(g)) <= 8 && ageYears(p) >= 17 && !g.player.familyIds.includes(p.id));
      if (sp) marry(g, sp);
    }
    const res = endMonth(g, choices);
    for (const r of res) if (/^undefined|NaN|\[object/.test(r.text)) { problems++; console.log('bad result', r); }
    // 사건/장면을 고른다 (장면은 가끔 둘째 선택지)
    let guard = 0;
    while (g.pendingEvent && guard++ < 3) {
      const pe = g.pendingEvent;
      if (pe.id === 'life_scene') { seen.scenes.add(L(g).scene?.kind); }
      const n = pe.choices.length;
      const idx = L(g).scene?.kind === 'heir' ? 0 : rngOf(g).int(0, Math.max(0, n - 1));
      const wasHeir = L(g).scene?.kind === 'heir';
      const out = resolveEvent(g, rngOf(g), idx);
      if (typeof out !== 'string' || /undefined|NaN|\[object/.test(out)) { problems++; console.log('bad scene text', pe.title, JSON.stringify(out)); }
      if (/압승|무기를 제대로 들기도 전에|싸움이라 부르기도|숨 몇 번 고르는/.test(out)) seen.overwhelm++;
      if (wasHeir) { seen.heirs++; if (samples.length < 40) samples.push(`[대 잇기] ${out}`); }
      else if (pe.id === 'life_scene' && samples.length < 40 && rngOf(g).chance(0.03)) samples.push(`[${pe.title}] ${out}`);
    }
    for (const [k, v] of Object.entries(g.player.stats)) if (!Number.isFinite(v)) { problems++; console.log('bad stat', k, v); }
    if (!Number.isFinite(g.player.money) || g.player.money < 0) { problems++; console.log('bad money', g.player.money); }
    const life = L(g);
    seen.places.add(life.place);
    if (life.job) seen.jobs.add(life.job.id);
    for (const [id, d] of Object.entries(life.dungeons)) if (d.cleared) seen.cleared.add(id);
    seen.guildTop = Math.max(seen.guildTop, life.fac.guild?.rank ?? 0);
    seen.knightTop = Math.max(seen.knightTop, life.fac.knights?.rank ?? 0);
    // 저장 → 불러오기 흉내 (예전 저장 호환)
    if (m % 97 === 0) {
      const copy = JSON.parse(JSON.stringify(g));
      setNextId(copy.nextId);
      runHooks('migrate', copy);
    }
  }
  const life = L(g);
  seen.deaths += life.ancestors.length;
  seen.nemeses += life.nemeses.length;
  if (verbose || run < 4) console.log(`#${run} ${fams[run % 3]} gen=${life.gen} over=${g.over} age=${playerAge(g)} place=${life.place} job=${life.job?.id ?? '-'} ${memberships(g).join('/')} pow=${playerPower(g).toFixed(0)} money=${g.player.money} kills=${life.stats.kills} fights=${life.stats.fights} renown=${life.renown} ancestors=${life.ancestors.map((a) => `${a.name}(${a.age},${a.cause})`).join(' ')}`);
}
console.log(`장면: ${[...seen.scenes].join(',')}`);
console.log(`장소: ${[...seen.places].join(',')} · 일: ${[...seen.jobs].join(',')}`);
console.log(`죽음 ${seen.deaths}, 대 잇기 ${seen.heirs}, 압승 ${seen.overwhelm}, 숙적 ${seen.nemeses}, 정복한 미궁: ${[...seen.cleared].join(',')}, 길드 최고 ${'FEDCBAS'[seen.guildTop]}, 기사단 최고 ${seen.knightTop}`);
if (verbose) for (const s of samples) console.log('·', s);
const need = ['seek_job', 'travel', 'faction_door', 'fight', 'dungeon', 'heir'];
for (const k of need) if (!seen.scenes.has(k)) { problems++; console.log('장면이 한 번도 나오지 않음:', k); }
if (seen.heirs === 0) { problems++; console.log('대 잇기가 한 번도 일어나지 않음'); }
console.log(problems ? `FAIL ${problems}` : 'OK');
if (problems) process.exit(1);
