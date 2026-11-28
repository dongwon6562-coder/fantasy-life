import '../src/content.js';
// 49단계 경비대와 치안 점검 (도우미4). 씨앗 운에 기대지 않게 장면은 직접 띄우고 선택지를 하나씩 다 눌러 본다.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, queueScene } from '../src/adventure/core.js';
import { WORK, takeJob } from '../src/jobs.js';
import { reportCrime } from '../src/crime.js';
import { watchInfo, watchLine, watchState, newCase, WATCH_TOWNS } from '../src/watch/index.js';
import { plate49 } from '../src/art/vignettePlates26.js';
import { vignetteFor } from '../src/art/vignette.js';

let bad = 0;
const fail = (...a) => { bad++; console.log('FAIL', ...a); };
const t0 = Date.now();
const BAD = /undefined|NaN|null|\[object|을\(를\)|이\(가\)|은\(는\)|\$\{/;
const me = (g) => g.people.find((p) => p.isPlayer);
function guard(seed, place = 'harfen') {
  const g = newGame({ name: '점검', sex: seed % 2 ? 'm' : 'f', familyId: 'farmer', mode: 'free', seed });
  me(g).ageMonths = 22 * 12;
  Object.assign(g.player.stats, { str: 34, agi: 30, int: 30, cha: 30, wil: 30, sen: 30 });
  g.life.place = place; g.life.home = 'inn'; g.player.money = 200;
  takeJob(g, 'guard');
  return g;
}
const month = (g, ids = ['rest']) => { g.pendingEvent = null; endMonth(g, Array.from({ length: slotsFor(g) }, (_, i) => ({ id: ids[i % ids.length] }))); };
const seen = {};
function drain(g, pick = null) {
  const out = [];
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent, kind = L(g).scene?.kind ?? pe.id;
    seen[kind] = (seen[kind] ?? 0) + 1;
    for (const x of [pe.title, pe.text, ...pe.choices.map((c) => c.label ?? c)]) if (BAD.test(String(x))) fail('bad scene text', kind, x);
    if (pe.choices.length > 8) fail('too many choices', kind, pe.choices.length);
    const idx = pick == null ? 0 : Math.min(pick, pe.choices.length - 1);
    const o = resolveEvent(g, rngOf(g), idx);
    if (BAD.test(String(o ?? ''))) fail('bad outcome', kind, o);
    out.push([kind, o]);
  }
  return out;
}

// 1) 경비병 자리가 여러 고장에 생기고, 계급 이름을 쓴다
const G = WORK.guard;
for (const pl of ['barka', 'portel', 'solaris', 'eisen']) if (!G.places.includes(pl)) fail('guard place', pl);
if (G.ranks[3] !== '경비대장') fail('ranks', G.ranks);
{
  const g = newGame({ name: '점검', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4900 });
  me(g).ageMonths = 22 * 12; g.player.stats.str = 30; g.life.place = 'harfen'; g.life.notoriety = 30;
  if (!G.req(g)) fail('notorious person can join the watch');
}

// 2) 들어가면 상관과 동료가 생기고, 화면 묶음이 찬다
{
  const g = guard(4901);
  month(g);
  const s = watchState(g), info = watchInfo(g);
  if (!s.place || !s.boss || s.mates.length < 2) fail('enlist', s.place, s.boss, s.mates.length);
  for (const k of ['rank', 'unit', 'place', 'since', 'merit', 'next', 'boss', 'mates', 'town', 'cases', 'caught', 'bribes', 'grudges', 'log']) if (!(k in info)) fail('info key', k);
  if (info.rank !== '경비병') fail('info rank', info.rank);
  if (!info.town || typeof info.town.order !== 'number') fail('info town');
}

// 3) 장면마다 선택지를 하나씩 다 눌러 본다
const SC = ['watch_thief', 'watch_brawl', 'watch_smuggle', 'watch_stray', 'watch_noble', 'watch_preacher', 'watch_mate', 'watch_boss', 'watch_grudge', 'watch_riot', 'watch_inquiry', 'watch_promote', 'watch_policy'];
const DATA = { watch_mate: [{ what: 'debt' }, { what: 'bribe' }, { what: 'hurt' }], watch_boss: [{ house: '빈 방앗간' }], watch_grudge: [{}], watch_thief: [{ who: '꼬마 핀', pilgrim: false }, { who: '꼬마 핀', pilgrim: true }], watch_brawl: [{ magic: false }, { magic: true }], watch_smuggle: [{ goods: '독한 술통' }] };
let seed = 4910;
for (const kind of SC) {
  for (const d of DATA[kind] ?? [{}]) {
    for (let c = 0; c < 8; c++) {
      const g = guard(seed++);
      month(g);
      const s = watchState(g);
      let data = { ...d };
      if (kind === 'watch_mate') data.name = s.mates[0].name, data.trait = s.mates[0].trait;
      if (kind === 'watch_boss') s.boss.temper = ['crooked', 'strict', 'lazy', 'fair'][c % 4];
      if (kind === 'watch_grudge') { const now = g.date.year * 12 + g.date.month; s.caught.push({ name: '외눈 클라우스', crime: '소매치기', place: 'harfen', at: now - 6, out: now - 1, grudge: 2, done: false }); data = { name: '외눈 클라우스', crime: '소매치기', when: now - 6 }; }
      if (kind === 'watch_policy') s.rank = 3;
      if (kind === 'watch_inquiry') s.skimmed = 5;
      g.pendingEvent = null; L(g).queue = [];
      queueScene(g, kind, data, { first: true });
      month(g);
      const pe = g.pendingEvent;
      if (!pe) { if (c === 0) fail('scene did not show', kind); break; }
      if (c >= pe.choices.length) break;
      drain(g, c);
    }
  }
}
for (const k of SC) if (!seen[k]) fail('never saw', k);

// 4) 사건: 캐면 죄 없는 사람이 풀리고, 지목할 수 있다. 맞히면 풀린 사건이 는다
{
  const g = guard(4950); month(g);
  const s = watchState(g), c = newCase(g, rngOf(g), 'harfen'); c.culprit = 1;
  let acc = false;
  for (let m = 0; m < 10 && !acc; m++) { g.pendingEvent = null; L(g).queue = L(g).queue.filter((x) => x.kind === 'watch_accuse'); month(g, ['watch_case', 'rest']); acc = L(g).scene?.kind === 'watch_accuse' || L(g).queue.some((x) => x.kind === 'watch_accuse') || g.pendingEvent?.title === '범인 지목'; if (acc) break; }
  if (!acc) fail('accuse never came', c.clue, c.cleared);
  if (!c.cleared.length && c.suspects.length - c.cleared.length > 1 && c.clue < 5) fail('no suspect cleared', c.clue);
  if (g.pendingEvent?.title === '범인 지목') {
    const i = g.pendingEvent.choices.findIndex((x) => /이름을 댄다/.test(x.label ?? x) && String(x.label ?? x).startsWith(c.suspects[1].name));
    if (i < 0) fail('culprit not among choices', g.pendingEvent.choices.map((x) => x.label ?? x));
    else { resolveEvent(g, rngOf(g), i); if (s.solved !== 1) fail('solved count', s.solved); }
  }
  // 기한이 지나면 식는다
  const c2 = newCase(g, rngOf(g), 'harfen'); c2.until = 0; month(g);
  if (c2.result !== 'cold') fail('case did not go cold', c2.result);
}

// 5) 공이 차면 계급 자리가 온다
{
  const g = guard(4960); month(g);
  const s = watchState(g); s.merit = 40; s.promoAt = 0;
  let got = false;
  for (let m = 0; m < 4 && !got; m++) { month(g); got = !!g.pendingEvent && /조장 자리/.test(g.pendingEvent.title); }
  if (!got) fail('promotion scene never came');
}

// 6) 경비대원이 죄를 지으면 쫓겨난다
{
  const g = guard(4970); month(g);
  reportCrime(g, 'assault', 'harfen'); month(g);
  if (L(g).job) fail('not fired after crime');
  if (watchState(g).place) fail('watch state kept after firing');
  if (!G.req(g)) fail('fired person can rejoin at once');
}

// 7) 플레이어 없이도 고장마다 치안이 오르내리되 0~100 안에 머문다
{
  const g = newGame({ name: '점검', sex: 'f', familyId: 'merchant', mode: 'free', seed: 4980 });
  for (let m = 0; m < 120; m++) month(g);
  const o = watchState(g).order;
  for (const pl of Object.keys(WATCH_TOWNS)) if (!(o[pl] >= 0 && o[pl] <= 100)) fail('order range', pl, o[pl]);
  const vals = Object.values(o);
  if (Math.max(...vals) - Math.min(...vals) < 10) fail('towns all the same order');
  const l = watchLine(g); if (l != null && typeof l !== 'string') fail('watchLine type');
}

// 8) 그림: 경비대 장면은 경비대 판을, 해적·교단 낱말은 그 판을 고른다
if (plate49('watch_case_new') !== 'watch:case') fail('plate49 case');
if (plate49('watch_smuggle') !== 'watch:gate') fail('plate49 gate');
if (plate49('pi_x', '해적 함대가 쫓는다') !== 'pirates:hunt') fail('plate49 pirates hunt');
if (plate49('sx_x', '이단 심문') !== 'sect:trial') fail('plate49 sect trial');
{
  const g = guard(4990); month(g);
  L(g).scene = { kind: 'watch_accuse' }; g.pendingEvent = { id: 'life_scene', title: '범인 지목', text: '', choices: [] };
  const v = vignetteFor(g, { title: '범인 지목', text: '' });
  if (!v || v.plate !== 'watch' || v.variant !== 'case') fail('vignetteFor watch', v && `${v.plate}:${v.variant}`);
}

// 8-2) 해적 장면은 PI_ART 판을 고른다
{
  const { PI_ART } = await import('../src/art/vignettePlates26.js');
  const g = guard(4991); month(g);
  for (const [k, want] of Object.entries(PI_ART)) {
    L(g).scene = { kind: k }; g.pendingEvent = { id: 'life_scene', title: '배', text: '', choices: [] };
    const v = vignetteFor(g, { title: '배', text: '' });
    if (!v || `${v.plate}:${v.variant}` !== want) fail('pi plate', k, v && `${v.plate}:${v.variant}`, want);
  }
}

// 9) 대를 이으면 계급과 사건은 남지 않고, 고장 치안은 남는다
{
  const g = guard(4995); month(g);
  const s = watchState(g); s.rank = 2; s.order.harfen = 33;
  const { HOOKS } = await import('../src/hooks.js');
  for (const f of HOOKS.heir) { try { f(g, rngOf(g), me(g)); } catch { /* 다른 갈래의 대 잇기는 여기서 안 본다 */ } }
  if (watchState(g).rank !== 0 || watchState(g).order.harfen !== 33) fail('heir reset', watchState(g).rank, watchState(g).order.harfen);
}

console.log('장면', JSON.stringify(seen));
console.log(bad ? `watchtest: ${bad} problems` : `watchtest OK (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(bad ? 1 : 0);
