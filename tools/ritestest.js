import './lsshim.js';
import '../src/content.js';
// 47단계 도우미2 점검: 축제와 인생 의례. 고장마다 달력이 다르고(마대륙 포함), 축제 달에 그 성격에 맞는 일이 뜨고,
// 후원·열기·새 놀이가 고장 풍습으로 남고, 이름 짓기·성년식·다른 풍습 혼례·식구 장례가 풍습 따라 다르게 뜨는지,
// 이웃 의례 줄, 글이 깨지지 않는지, 대 잇기·옛 저장·저장 왕복을 본다.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, playerAge } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { byId, makePerson } from '../src/npc.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { feastLine } from '../src/rumor/index.js';
import { ritesState, ritesInfo, ritesNow, ritesLines, ritesLine, feastsAt, calendarAt, cultureOfPlace } from '../src/rites/index.js';
import { CUSTOMS, LOCAL, FEAST_KIND, GAMES, CULTURE_NAME } from '../src/rites/data.js';
import { PLACES } from '../src/places.js';
import { makeRng } from '../src/rng.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  |\.\./.test(t);
const verbose = process.argv.includes('-v');
const scenes = {}; const kinds = {}; const samples = {};
const keep = (k, t) => { (samples[k] ??= []).length < 2 && !samples[k].includes(t) && samples[k].push(t); };

function resolveAll(g, pick) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    const kind = s?.kind ?? pe.id;
    const mine = kind.startsWith('rt_');
    if (mine) { scenes[kind] = (scenes[kind] ?? 0) + 1; ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`); }
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    if (mine && pick != null) idx = Math.min(pick, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); keep(kind, `${pe.title} | ${pe.text.slice(0, 90)}… [${pe.choices[idx]}] → ${String(out).slice(0, 90)}`); }
    ok(g.player.money >= 0 && Number.isFinite(g.player.money), `money after ${kind}`);
  }
}
function checkMonth(g) {
  const ls = ritesLines(g);
  ok(Array.isArray(ls) && ls.length <= 2, 'shape');
  for (const x of ls) { kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line ${x.kind}: ${x.text}`); keep(`line:${x.kind}`, x.text); }
  const l = ritesLine(g); ok(l === null || typeof l === 'string', 'line');
}
function checkInfo(g) {
  const i = ritesInfo(g), n = ritesNow(g);
  const js = JSON.stringify(i) + JSON.stringify(n);
  ok(!/undefined|NaN/.test(js), `info ${js.slice(0, 200)}`);
  ok(!bad(i.line) && !bad(i.place) && Array.isArray(i.calendar) && Array.isArray(i.mine) && Array.isArray(i.rites) && Array.isArray(i.log), `info ${i.line}`);
  for (const c of i.calendar) ok(c.m >= 1 && c.m <= 12 && !bad(c.name) && !bad(c.where) && FEAST_KIND[c.name] || LOCAL_NAMES.has(c.name) || c.mine, `cal ${JSON.stringify(c)}`);
  for (const r of i.rites) ok(['name', 'coming', 'wed', 'funeral', 'feast'].includes(r.kind) && !bad(r.text), `rite ${JSON.stringify(r)}`);
  ok(!bad(i.customs.name) && !bad(i.customs.wed) && !bad(i.customs.funeral) && !bad(i.customs.coming.title), 'customs');
  ok(n.now.every((f) => !bad(f.name) && !bad(f.text) && f.in === 0) && (!n.next || (n.next.in >= 1 && n.next.in <= 12 && !bad(n.next.name))), `now ${JSON.stringify(n).slice(0, 200)}`);
}
const newId = (h) => Math.max(...h.people.map((p) => p.id)) + 1;
const LOCAL_NAMES = new Set(Object.values(LOCAL).flat().map((x) => x.name));
const quiet = (g, ch = [{ id: 'rest' }], pick) => { endMonth(g, ch); resolveAll(g, pick); checkMonth(g); };
const fresh = (snap) => { const g = JSON.parse(snap); g.pendingEvent = null; L(g).queue = []; L(g).scene = null; return g; };

// 0. 글 틀과 달력
for (const [c, x] of Object.entries(CUSTOMS)) {
  ok(x.name.ways.length === 3 && x.coming.age >= 14 && x.coming.age <= 16 && ['ok', 'bad', 'easy', 'skip', 'tryL', 'easyL', 'skipL', 'title', 'text'].every((k) => !bad(x.coming[k])) && !bad(x.wed) && !bad(x.funeral) && CULTURE_NAME[c], `풍습 ${c}`);
}
for (const gs of Object.values(GAMES)) for (const x of gs) ok(['str', 'agi', 'int', 'wil', 'cha', 'sen'].includes(x.stat) && !bad(x.win) && !bad(x.lose), `겨룸 ${x.id}`);
for (const [pl, xs] of Object.entries(LOCAL)) ok(PLACES[pl] && xs.every((x) => FEAST_KIND[x.name] == null && x.m >= 1 && x.m <= 12), `고장 축제 ${pl}`);
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4700 });
  const cals = {};
  for (const pl of Object.keys(PLACES)) {
    const cal = calendarAt(g, pl);
    cals[pl] = cal.map((c) => `${c.m}${c.name}`).join(',');
    ok(cal.length >= 2, `달력이 빈 고장 ${pl}`);
    for (const c of cal) ok(FEAST_KIND[c.name] || LOCAL_NAMES.has(c.name), `종류 없는 축제 ${pl} ${c.name}`);
  }
  ok(cals.ern !== cals.harfen && cals.ern !== cals.solaris && cals.iela !== cals.hammer && cals.fur !== cals.bonehill, '고장마다 다른 달력');
  ok(calendarAt(g, 'bonehill').some((c) => c.name === '꺼진 별의 밤') && !calendarAt(g, 'bonehill').some((c) => c.name === '봉인제'), '마대륙 기념일');
  ok(cultureOfPlace('iela') === 'elf' && cultureOfPlace('ern') === 'leonia' && cultureOfPlace('chain') === 'demon', '고장 풍습');
  // 세상의 소리와 같은 이름
  g.date.month = 1; L(g).place = 'bonehill';
  ok(/꺼진 별의 밤/.test(feastLine(g) ?? ''), `세상의 소리 마대륙 ${feastLine(g)}`);
}

// 1. 삶 셋: 쉬기만 둘, 무작위 하나. 축제 일과 의례가 뜨는가
let tally = { scenes: 0, feasts: 0, naming: 0, coming: 0, wed: 0, funeral: 0, town: 0, hosted: 0, sponsored: 0 };
for (const [seed, years, random, fam] of [[4701, 45, false, 'farmer'], [4702, 40, false, 'merchant'], [4703, 35, true, 'dwarf_heir']]) {
  const g = newGame({ name: seed % 2 ? '요나스' : '클라라', sex: seed % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed });
  const rng = rngOf(g);
  for (let m = 0; m < years * 12 && !g.over; m++) {
    let ch = [{ id: 'rest' }];
    if (random) { const acts = availableActions(g).filter((a) => !/travel|move/.test(a.id)); ch = []; for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id }); }
    if (!random && playerAge(g) >= 22 && !me(g).spouseId && m % 24 === 0) { /* 짝은 love 쪽이 정한다 */ }
    quiet(g, ch);
    if (m % 60 === 0) checkInfo(g);
  }
  const s = ritesState(g);
  for (const k of Object.keys(tally)) tally[k] += s.tally[k];
  checkInfo(g);
}
ok(tally.feasts >= 3, `축제 일 ${JSON.stringify(tally)}`);
ok(tally.coming >= 2, `성년식 ${tally.coming}`);
ok(tally.town >= 10, `이웃 의례 ${tally.town}`);
ok((kinds.feast ?? 0) >= 20 && (kinds.town ?? 0) >= 5, `줄 ${JSON.stringify(kinds)}`);

// 2. 장면마다 모든 고르기
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4710 });
  for (let k = 0; k < 25 * 12; k++) quiet(g, [{ id: 'rest' }]);
  g.player.money = 300;
  const at = L(g).place;
  const snap = JSON.stringify(g);
  const show = (kind, data, n) => {
    for (let i = 0; i < n; i++) {
      const h = fresh(snap);
      const d = typeof data === 'function' ? data(h) : data;
      ok(showScene(h, { kind, at, t: 0, ...d }, { force: true }), `show ${kind}`);
      resolveAll(h, i);
    }
  };
  const base = { feast: '수확제', ftext: '가을걷이가 끝나면 첫 빵을 제단에 올린다.', place: at, local: false };
  for (const x of Object.values(GAMES).flat()) show('rt_game', { ...base, gid: x.id, game: x.name }, 3);
  show('rt_dance', (h) => { const p = h.people.find((q) => q.alive && !q.isPlayer && q.sex === 'f'); return { ...base, v: 1, name: p.name, pid: p.id }; }, 3);
  show('rt_brawl', { ...base, why: '술값을 누가 내느냐로 시작된 말다툼이었다.' }, 3);
  show('rt_pick', { ...base, mine: true }, 4);
  show('rt_pick', { ...base, mine: false }, 3);
  show('rt_fire', { ...base, what: '짚단 더미' }, 3);
  show('rt_vigil', { ...base, feast: '망자의 밤', dead: '마르타' }, 3);
  show('rt_vigil', { ...base, feast: '망자의 밤', dead: null }, 3);
  show('rt_hunt', { ...base, feast: '사냥달' }, 2);
  show('rt_sponsor', { feast: '수확제', place: at, big: 40, small: 10 }, 3);
  show('rt_host', { feast: '수확제', place: at, fm: 9, big: 60, small: 15, newOk: true }, 3);
  for (const cult of Object.keys(CUSTOMS)) show('rt_coming', { cult }, 3);
  for (const cult of ['leonia', 'elf', 'dwarf', 'demon', 'holy']) show('rt_mourn', { who: '마르타', rel: '어머니', cult, cost: 30 }, 3);
  show('rt_wedmix', (h) => { const p = h.people.find((q) => q.alive && !q.isPlayer && q.sex === 'f'); return { pid: p.id, who: p.name, a: 'leonia', b: 'elf', v: 0 }; }, 3);
  // 이름 짓기: 모든 갈래, 이름이 실제로 바뀌는가
  for (const cult of Object.keys(CUSTOMS)) {
    for (let i = 0; i < 3; i++) {
      const h = fresh(snap);
      const kid = makePerson(makeRng({ s: 99 + i }), { sex: i % 2 ? 'm' : 'f', ageMonths: 0, lastName: me(h).lastName, fatherId: me(h).id });
      kid.id = newId(h); h.people.push(kid); me(h).childIds.push(kid.id);
      const before = kid.name;
      ok(showScene(h, { kind: 'rt_naming', at, t: 0, kidId: kid.id, kid: kid.name, cult, ways: CUSTOMS[cult].name.ways }, { force: true }), 'naming');
      resolveAll(h, i);
      const way = CUSTOMS[cult].name.ways[i];
      if (['saint', 'star', 'beast'].includes(way)) ok(kid.name !== before || ['레오', '아르데', '곰'].includes(before), `이름 바뀜 ${cult} ${way} ${before}→${kid.name}`);
      if (way === 'keep' || way === 'milk') ok(kid.name === before, `이름 그대로 ${way}`);
    }
  }
  // 새 놀이는 그 고장 달력에 남고 해마다 줄에 뜬다
  const h = fresh(snap);
  showScene(h, { kind: 'rt_host', at, t: 0, feast: '수확제', place: at, fm: 9, big: 60, small: 15, newOk: true }, { force: true });
  resolveAll(h, 1);
  const made = ritesState(h).made;
  ok(made.length === 1 && calendarAt(h, at).some((c) => c.mine && c.name === made[0].name), `새 놀이 ${JSON.stringify(made)}`);
  ok(ritesInfo(h).customs.made.length === 1 && ritesInfo(h).mine.length >= 1, '새 놀이 화면');
  let seen = false;
  for (let k = 0; k < 14 && !seen; k++) { endMonth(h, [{ id: 'rest' }]); resolveAll(h); seen = ritesLines(h).some((x) => x.text.includes(made[0].name)) || ritesNow(h).now.some((f) => f.mine); }
  ok(seen, '새 놀이가 해마다 열림');
}

// 3. 식구: 아이가 나면 이름 짓기, 식구가 죽으면 장례, 다른 종족과 혼인하면 풍습 다툼
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4720 });
  for (let k = 0; k < 26 * 12; k++) quiet(g);
  g.player.money = 200;
  const snap = JSON.stringify(g);
  const runTill = (h, kind, n = 3) => { let hit = false; for (let k = 0; k < n && !hit; k++) { endMonth(h, [{ id: 'rest' }]); for (let j = 0; j < 8 && h.pendingEvent; j++) { const kd = L(h).scene?.kind ?? h.pendingEvent.id; if (kd === kind) hit = true; resolveEvent(h, rngOf(h), 0); } } return hit; };
  // 아이
  let h = fresh(snap);
  const kid = makePerson(makeRng({ s: 5 }), { sex: 'f', ageMonths: 0, lastName: me(h).lastName, fatherId: me(h).id });
  kid.id = newId(h); h.people.push(kid); me(h).childIds.push(kid.id);
  ok(runTill(h, 'rt_naming'), '아이 이름 짓기');
  ok(ritesInfo(h).rites.some((r) => r.kind === 'name'), '이름 짓기 기록');
  // 장례
  h = fresh(snap);
  const fa = byId(h, me(h).fatherId) ?? byId(h, me(h).motherId);
  if (fa?.alive) { fa.alive = false; fa.deathCause = '병'; ok(runTill(h, 'rt_mourn'), '부모 장례'); ok(ritesInfo(h).rites.some((r) => r.kind === 'funeral'), '장례 기록'); }
  // 다른 종족 짝
  h = fresh(snap);
  const elf = makePerson(makeRng({ s: 8 }), { sex: 'f', ageMonths: 25 * 12, job: 'merchant' });
  elf.race = 'elf'; elf.id = newId(h); h.people.push(elf);
  me(h).spouseId = elf.id; elf.spouseId = me(h).id;
  ok(runTill(h, 'rt_wedmix'), '풍습 다툼 혼례');
  // 같은 종족 짝은 장면 없이 풍습 줄
  h = fresh(snap);
  const hu = makePerson(makeRng({ s: 9 }), { sex: 'f', ageMonths: 25 * 12, job: 'farmer' });
  hu.id = newId(h); h.people.push(hu); me(h).spouseId = hu.id; hu.spouseId = me(h).id;
  endMonth(h, [{ id: 'rest' }]); resolveAll(h);
  ok(ritesInfo(h).rites.some((r) => r.kind === 'wed'), '혼례 풍습 기록');
}

// 4. 다른 종족으로 나면 그 종족 성년식, 마대륙에 가면 마대륙 축제 일
{
  const g = newGame({ name: '아일린', sex: 'f', familyId: 'elf_elder', mode: 'free', seed: 4730 });
  for (let k = 0; k < 17 * 12; k++) quiet(g, [{ id: 'rest' }], 1);
  const cr = ritesInfo(g).rites.find((r) => r.kind === 'coming');
  ok(cr && /엘프/.test(cr.text) && ritesState(g).tally.coming === 1, `엘프 성년식 ${JSON.stringify(cr)}`);
  checkInfo(g);
  const g2 = newGame({ name: '토르', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4731 });
  for (let k = 0; k < 20 * 12; k++) quiet(g2);
  L(g2).place = 'chain';
  let hit = 0;
  for (let k = 0; k < 36; k++) { quiet(g2); if (ritesLines(g2).some((x) => /사슬|꺼진 별|피의 겨룸|재의 밤/.test(x.text))) hit++; }
  ok(hit >= 2, `마대륙 축제 줄 ${hit}`);
  ok(ritesInfo(g2).customs.culture === 'leonia', '사람은 난 고장 풍습');
}

// 5. 대 잇기·옛 저장·저장 왕복
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4740 });
  for (let k = 0; k < 30 * 12; k++) quiet(g);
  runHooks('heir', g, rngOf(g), { ...me(g) });
  for (let k = 0; k < 24; k++) quiet(g);
  checkInfo(g);
  delete g.rites; runHooks('migrate', g); quiet(g); checkInfo(g);
  const g2 = JSON.parse(JSON.stringify(g)); ok(JSON.stringify(ritesInfo(g2)) === JSON.stringify(ritesInfo(g)), '저장 왕복');
}

console.log(`장면: ${JSON.stringify(scenes)}  줄 ${JSON.stringify(kinds)}  ${JSON.stringify(tally)}`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('ritestest OK');
