import './lsshim.js';
import '../src/content.js';
// 43단계 도우미2 점검: 마족으로 태어나기. 마족 집안 넷이 집안 목록에 있고 시작 장소(마대륙 고장)·국적·인맥이 맞는지,
// 마대륙 고장이 마족에게만(또는 길을 연 사람에게) 열리고 길이 이어지는지, 어린 시절·이름 얻기·바람·짐·서열·마왕 다툼 장면이 나오는지,
// 장면마다 고를 것을 다 골라도 글이 깨지지 않는지, 마대륙 소식이 플레이어 없이도 나는지, 사람 땅에서 뿔을 드러낸 마족이 쫓기는지,
// 숨은 집안은 kindred 뿔 위험으로 이어지는지, 대 잇기와 옛 저장을 본다.
import { FAMILIES, JOBS } from '../src/data.js';
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { byId } from '../src/npc.js';
import { PLACES, travelMonths } from '../src/places.js';
import { realmState, realmOf } from '../src/realms/index.js';
import { playableRaces, raceOf } from '../src/races/index.js';
import { DK_FAMILIES, DK_PLACES, COURT_NEWS } from '../src/demonkind/data.js';
import { demonkindLines, demonkindLine, demonkindInfo, demonkindState, DK_PLACE_IDS } from '../src/demonkind/index.js';
import { kindredState } from '../src/kindred/index.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  /.test(t);
const verbose = process.argv.includes('-v');
const scenes = {}; const childSeen = {}; const samples = {}; const kinds = {}; let lines = 0;

// 0. 집안 목록·고장
ok(DK_FAMILIES.length === 4, `마족 집안 ${DK_FAMILIES.length}`);
ok(playableRaces().some((r) => r.id === 'demon' && r.family), '마족을 고를 수 있음');
for (const o of DK_FAMILIES) {
  const f = FAMILIES.find((x) => x.id === o.id);
  ok(f && f.race === 'demon' && f.home === o.place && JOBS[f.fatherJob] && JOBS[f.motherJob], `집안 표 ${o.id}`);
  ok(o.scenes.length === 3 && o.lines.length >= 3 && o.ties.length === 2 && o.want && o.burden && o.burdenScene?.choices.length >= 2, `집안 내용 ${o.id}`);
}
for (const id of Object.keys(DK_PLACES)) {
  const p = PLACES[id];
  ok(p && p.hidden && p.realm === 'demon' && Object.keys(p.links).length, `고장 ${id}`);
  ok(travelMonths('graubel', id) < 99, `해협 길 ${id}`);
}
// 44단계: 새 고장(크로센·로텐부르크)으로 사람 땅 길이 짧아졌다(그라우벨→포르텔 5달). 마대륙을 거치는 길(9달)이 지름길이 아니면 된다
ok(travelMonths('graubel', 'portel') >= 5 && travelMonths('barka', 'graubel') >= 4, '사람 땅 지름길이 생기지 않음');

function resolveAll(g, pick) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    const kind = s?.kind ?? pe.id;
    scenes[kind] = (scenes[kind] ?? 0) + 1;
    const mine = kind.startsWith('dk_');
    if (mine) ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`);
    if (kind === 'dk_child') childSeen[s.sid] = (childSeen[s.sid] ?? 0) + 1;
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    const want = pick?.(kind, pe.choices, s);
    if (want != null && want >= 0) idx = want;
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); const key = kind === 'dk_child' ? s.sid : kind; (samples[key] ??= []).length < 1 && samples[key].push(`${pe.text.slice(0, 80)} [${pe.choices[idx]}] → ${String(out).slice(0, 100)}`); }
    ok(g.player.money >= 0 && g.player.familyMoney >= 0, `money < 0 after ${kind}`);
  }
}
function month(g, rng, { stay = true } = {}) {
  const acts = availableActions(g).filter((a) => !stay || !/travel|move|migrate|exile_flee/.test(a.id));
  const ch = [];
  for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
  endMonth(g, ch);
  resolveAll(g);
  const ls = demonkindLines(g);
  ok(Array.isArray(ls) && ls.length <= 1, 'shape');
  for (const x of ls) { lines++; kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line: ${x.text}`); (samples[`line:${x.kind}`] ??= []).length < 3 && samples[`line:${x.kind}`].push(x.text); }
  const l1 = demonkindLine(g); ok(l1 === null || typeof l1 === 'string', 'line');
}
const REALM = { bonehill: 'demon', post: 'demon', stone: 'demon', barka: 'free' };
function life(o, seed, years) {
  const g = newGame({ name: seed % 2 ? '카엘' : '이벨', sex: seed % 2 ? 'm' : 'f', familyId: o.id, mode: 'free', seed });
  const s = demonkindState(g);
  ok(s.id === o.id && L(g).place === o.place && s.lord === o.lord, `시작 장소 ${o.id}: ${L(g).place}`);
  ok(realmState(g).citizen === REALM[o.place], `국적 ${o.id}: ${realmState(g).citizen}`);
  ok(raceOf(me(g)) === 'demon' && g.player.race === 'demon', `종족 ${o.id}: ${raceOf(me(g))}`);
  const fa = byId(g, me(g).fatherId), mo = byId(g, me(g).motherId);
  ok(raceOf(fa) === 'demon' && raceOf(mo) === 'demon', `부모 종족 ${o.id}`);
  for (const t of o.ties) { const p = byId(g, s.ties[t.role]); ok(p && p.known && p.place === o.place && raceOf(p) === (t.race ?? 'human'), `인맥 ${o.id}.${t.role} ${raceOf(p)}`); }
  ok(g.player.familyMoney === o.money, `집안 돈 ${o.id}`);
  const k = kindredState(g);
  ok(o.hidden ? !k.revealed && k.horn < 100 : k.revealed, `뿔 ${o.id}`);
  for (const id of DK_PLACE_IDS) ok(PLACES[id].open(g), `마족에겐 열림 ${id}`);
  if (!o.hidden) ok(g.people.filter((p) => p.dkPop && p.place === o.place).length >= 8, `마을 사람 ${o.id}`);
  const rng = rngOf(g);
  for (let m = 0; m < years * 12 && !g.over; m++) {
    month(g, rng);
    if (m % 36 === 0) { const info = demonkindInfo(g); ok(info && info.family && info.lords.length === 3 && !bad(info.family.name) && info.family.ties.every((t) => !bad(t.word) && !bad(t.race)) && (!info.self || !bad(info.self.rankName)), `info ${o.id} ${JSON.stringify(info)}`); }
  }
  return g;
}

// 1. 집안마다 스물다섯 해 (씨앗 둘)
let wants = 0, burdens = 0, named = 0;
for (const [i, o] of DK_FAMILIES.entries()) for (const seed of [4700 + i * 7, 4750 + i * 11]) {
  const g = life(o, seed, 25);
  const s = demonkindState(g);
  if (!g.over && playerAge(g) >= 24 && s.owner === g.player.id && !(g.prison?.past?.length) && !g.bondage?.enslaved) { ok(!!s.want, `바라는 것 장면 없음 ${o.id}`); ok(!!s.burden && s.burden !== 'due', `짐 장면 없음 ${o.id} ${s.burden}`); ok(s.named, `이름 없음 ${o.id}`); }
  if (s.want) wants++; if (s.burden) burdens++; if (s.named) named++;
  if (verbose) console.log('life', o.id, seed, playerAge(g), g.over, s.named, s.want, s.burden, L(g).place, me(g).alive);
}
ok(wants >= 5 && burdens >= 5 && named >= 4, `바람 ${wants}, 짐 ${burdens}, 이름 ${named}`);
ok(Object.keys(childSeen).length >= 10, `어린 시절 장면이 덜 나옴 ${Object.keys(childSeen).length}/12`);
ok((kinds.home ?? 0) >= 4, `집안 줄 ${kinds.home}`);
ok((kinds.court ?? 0) >= 4, `마대륙 소식 줄 ${kinds.court}`);
ok((kinds.custom ?? 0) >= 2, `풍습 줄 ${kinds.custom}`);

// 2. 장면마다 고를 것을 다 고른다
for (const o of DK_FAMILIES) {
  const base = newGame({ name: '카엘', sex: 'm', familyId: o.id, mode: 'free', seed: 4800 });
  const snap = JSON.stringify(base);
  const fresh = () => { const g = JSON.parse(snap); g.pendingEvent = null; L(g).queue = []; L(g).scene = null; return g; };
  for (const sc of o.scenes) {
    for (let k = 0; k < sc.choices.length; k++) {
      const g = fresh(); me(g).ageMonths = sc.age[0] * 12; g.player.money = 30;
      ok(showScene(g, { kind: 'dk_child', at: L(g).place, t: 0, sid: sc.id }, { force: true }), `show ${sc.id}`);
      resolveAll(g, (kind) => (kind === 'dk_child' ? k : null));
      ok(demonkindState(g).log.some((x) => x.text.startsWith(sc.title)), `기록 ${sc.id}`);
    }
  }
  for (const c of o.burdenScene.choices) {
    for (const stat of [10, 99]) {
      const g = fresh(); me(g).ageMonths = 20 * 12;
      for (const k of Object.keys(g.player.stats)) g.player.stats[k] = stat;
      for (const k of Object.keys(g.player.skills)) g.player.skills[k] = stat === 99 ? 90 : 0;
      ok(showScene(g, { kind: 'dk_burden', at: L(g).place, t: 0 }, { force: true }), `show burden ${o.id}`);
      resolveAll(g, (kind, labels) => (kind === 'dk_burden' ? labels.indexOf(c.label) : null));
      const b = demonkindState(g).burden;
      ok(b && b.startsWith(c.key), `짐 결과 ${o.id}.${c.key} ${b}`);
      if (c.test && stat === 99) ok(b === c.key, `잘하면 붙음 ${o.id}.${c.key} ${b}`);
      if (c.test && stat === 10) ok(b === `${c.key}_bad`, `못하면 떨어짐 ${o.id}.${c.key} ${b}`);
      if (c.fx?.opened) ok(demonkindState(g).opened, '길을 엶');
    }
  }
  for (const met of [true, false]) for (let k = 0; k < 2; k++) {
    const g = fresh(); me(g).ageMonths = 18 * 12;
    ok(showScene(g, { kind: 'dk_want', at: L(g).place, t: 0, met }, { force: true }), 'show want');
    resolveAll(g, (kind) => (kind === 'dk_want' ? k : null));
    ok(demonkindState(g).want === (met ? 'met' : 'missed'), 'want state');
  }
  // 이름 얻기
  for (let k = 0; k < (o.lord ? 3 : 2); k++) {
    const g = fresh(); me(g).ageMonths = 15 * 12;
    ok(showScene(g, { kind: 'dk_name', at: L(g).place, t: 0 }, { force: true }), 'show name');
    resolveAll(g, (kind) => (kind === 'dk_name' ? k : null));
    ok(demonkindState(g).named && demonkindState(g).rank === 3, `이름 ${o.id}.${k}`);
  }
}
// 서열 다툼·마왕 다툼·경계 넘기·쫓김·낯선 자: 고를 것 다
{
  const base = newGame({ name: '카엘', sex: 'm', familyId: 'dk_garbes', mode: 'free', seed: 4810 });
  const snap = JSON.stringify(base);
  const fresh = (age = 30) => { const g = JSON.parse(snap); g.pendingEvent = null; L(g).queue = []; L(g).scene = null; me(g).ageMonths = age * 12; g.player.money = 40; Object.assign(demonkindState(g), { named: true, rank: 3, favor: 40 }); return g; };
  for (const to of [2, 1]) for (let k = 0; k < 3; k++) for (const stat of [10, 99]) {
    const g = fresh(80);
    if (to === 1) demonkindState(g).rank = 2;
    for (const x of Object.keys(g.player.stats)) g.player.stats[x] = stat;
    for (const x of Object.keys(g.player.skills)) g.player.skills[x] = stat === 99 ? 95 : 0;
    ok(showScene(g, { kind: 'dk_rank', at: L(g).place, t: 0, to }, { force: true }), 'show rank');
    resolveAll(g, (kind) => (kind === 'dk_rank' ? k : null));
    const r = demonkindState(g).rank;
    if (k < 2 && stat === 99) ok(r === to, `서열 오름 ${to}.${k} ${r}`);
    if (k === 2 || stat === 10) ok(r === (to === 1 ? 2 : 3), `서열 그대로 ${to}.${k} ${r}`);
  }
  for (let k = 0; k < 4; k++) {
    const g = fresh();
    ok(showScene(g, { kind: 'dk_war', at: L(g).place, t: 0, news: COURT_NEWS[4].text(), foe: 'dusk' }, { force: true }), 'show war');
    resolveAll(g, (kind) => (kind === 'dk_war' ? k : null));
    if (k === 2) ok(demonkindState(g).lord === 'dusk', '마왕을 바꿈');
  }
  for (let k = 0; k < 3; k++) {
    const g = fresh(); L(g).place = 'graubel';
    ok(showScene(g, { kind: 'dk_cross', at: 'graubel', t: 0 }, { force: true }), 'show cross');
    resolveAll(g, (kind) => (kind === 'dk_cross' ? k : null));
    ok(demonkindState(g).crossed && (k === 0 ? !kindredState(g).revealed : kindredState(g).revealed), `경계 ${k}`);
  }
  for (const how of ['guard', 'mob', 'priest']) for (let k = 0; k < 4; k++) {
    const g = fresh(); L(g).place = 'leocast';
    ok(showScene(g, { kind: 'dk_banned', at: 'leocast', t: 0, how }, { force: true }), 'show banned');
    resolveAll(g, (kind) => (kind === 'dk_banned' ? k : null));
    if (k === 0) ok(L(g).place !== 'leocast', '쫓겨 떠남');
    if (k === 2) ok(g.player.money === 20, '은화 스물');
    if (k === 3) ok(!kindredState(g).revealed, '뿔을 감춤');
  }
  const hb = newGame({ name: '이벨', sex: 'f', familyId: 'dk_hidden', mode: 'free', seed: 4811 });
  for (let k = 0; k < 2; k++) {
    const g = JSON.parse(JSON.stringify(hb)); g.pendingEvent = null; L(g).queue = []; L(g).scene = null; me(g).ageMonths = 25 * 12; L(g).place = 'post';
    ok(showScene(g, { kind: 'dk_home', at: 'post', t: 0 }, { force: true }), 'show home');
    resolveAll(g, (kind) => (kind === 'dk_home' ? k : null));
    ok(demonkindState(g).home && (k === 0) === kindredState(g).revealed, `뿔 드러냄 ${k}`);
  }
  const hm = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4812 });
  for (const how of ['salt', 'road']) for (let k = 0; k < 3; k++) {
    const g = JSON.parse(JSON.stringify(hm)); g.pendingEvent = null; L(g).queue = []; L(g).scene = null; me(g).ageMonths = 25 * 12; g.player.money = 20; L(g).place = 'chain';
    ok(showScene(g, { kind: 'dk_stranger', at: 'chain', t: 0, how }, { force: true }), 'show stranger');
    resolveAll(g, (kind) => (kind === 'dk_stranger' ? k : null));
  }
}

// 3. 사람 땅에서: 숨은 집안은 뿔 위험, 드러낸 마족은 쫓긴다, 처음 넘는 날이 온다 (조용히 쉬며 산다)
function quiet(g) {
  endMonth(g, [{ id: 'rest' }]);
  resolveAll(g, (kind, labels) => (kind === 'kd_horns' ? labels.findIndex((l) => l.startsWith('태연하게')) : kind === 'dk_banned' ? labels.findIndex((l) => l.startsWith('맞서')) : null));
  for (const x of demonkindLines(g)) ok(!bad(x.text), `bad line: ${x.text}`);
}
{
  let near = 0, cross = 0;
  for (let k = 0; k < 3; k++) {
    const g = newGame({ name: '이벨', sex: 'f', familyId: 'dk_hidden', mode: 'free', seed: 4900 + k });
    me(g).ageMonths = 18 * 12; kindredState(g).horn = 85; L(g).place = 'leocast';
    for (let m = 0; m < 8 * 12 && !g.over; m++) { quiet(g); if (!L(g).travel) L(g).place = 'leocast'; }
    near += kindredState(g).horns;
    if (verbose) console.log('hidden', k, kindredState(g).horns, kindredState(g).revealed, g.over, playerAge(g), L(g).place);
  }
  ok(near >= 2, `숨은 마족이 들킬 뻔한 날 ${near}`);
  const before = scenes.dk_banned ?? 0;
  for (let k = 0; k < 3; k++) {
    const g = newGame({ name: '카엘', sex: 'm', familyId: 'dk_garbes', mode: 'free', seed: 4910 + k });
    me(g).ageMonths = 20 * 12; Object.assign(demonkindState(g), { named: true, rank: 3 });
    quiet(g);
    g.pendingEvent = null; L(g).queue = []; L(g).scene = null;
    L(g).place = 'portel'; g.realms.cur = 'free'; // 48단계 도우미3: 국경 검문 장면에서 '돌아선다'를 골라 마대륙으로 되돌아가는 판이 있어, 검문은 지난 것으로 둔다
    for (let m = 0; m < 3 && !g.over; m++) quiet(g);
    if (demonkindState(g).crossed) cross++;
    kindredState(g).revealed = true;
    for (let m = 0; m < 5 * 12 && !g.over; m++) { quiet(g); if (!L(g).travel) L(g).place = 'leocast'; kindredState(g).revealed = true; }
  }
  ok(cross >= 2, `처음 넘는 날 ${cross}`);
  ok((scenes.dk_banned ?? 0) - before >= 2, `쫓기는 날 ${(scenes.dk_banned ?? 0) - before}`);
}

// 4. 사람에겐 닫힘, 길을 열면 열림. 마대륙 소식은 플레이어 없이도
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4920 });
  for (const id of DK_PLACE_IDS) ok(!PLACES[id].open(g), `사람에겐 닫힘 ${id}`);
  ok(demonkindInfo(g) === null, '사람 집안 info null');
  demonkindState(g).opened = true;
  for (const id of DK_PLACE_IDS) ok(PLACES[id].open(g), `길을 열면 열림 ${id}`);
  for (let m = 0; m < 60; m++) { endMonth(g, [{ id: 'rest' }]); resolveAll(g); ok(demonkindLines(g).length === 0, '사람 집안 줄'); }
  ok(demonkindState(g).news.length >= 4 && demonkindState(g).news.every((n) => !bad(n.text)), `마대륙 소식 ${demonkindState(g).news.length}`);
  const info = demonkindInfo(g);
  ok(info && info.news.length && info.lords.every((l) => l.power >= 10 && l.power <= 90 && !bad(l.word)), `info lords ${JSON.stringify(info?.lords)}`);
}

// 5. 대 잇기·옛 저장
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4930 });
  delete g.demonkind; runHooks('migrate', g);
  ok(g.demonkind && g.demonkind.id === null && g.demonkind.power.red, '옛 저장');
  const g2 = newGame({ name: '카엘', sex: 'm', familyId: 'dk_elinor', mode: 'free', seed: 4931 });
  Object.assign(demonkindState(g2), { named: true, rank: 2, favor: 60 });
  runHooks('heir', g2, rngOf(g2), g2.player);
  const s2 = demonkindState(g2);
  ok(s2.past && demonkindInfo(g2).family.past && s2.rank === 4 && !s2.named && s2.lord === 'dusk', '대를 이으면 past, 서열은 새로');
  const g3 = JSON.parse(JSON.stringify(g2)); ok(JSON.stringify(demonkindInfo(g3)) === JSON.stringify(demonkindInfo(g2)), '저장 왕복');
}

console.log(`장면: ${JSON.stringify(Object.fromEntries(Object.entries(scenes).filter(([k]) => k.startsWith('dk_'))))}  줄 ${JSON.stringify(kinds)} ${lines}, 바람 ${wants}, 짐 ${burdens}, 이름 ${named}, 어린 장면 ${Object.keys(childSeen).length}/12`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('demonkindtest OK');
