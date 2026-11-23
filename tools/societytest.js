import './lsshim.js';
import '../src/content.js';
// 36단계 도우미2 점검: 도시의 사교계. 드나들 길(피·돈·재주+소개), 사교 철 초대장, 장면마다 고를 것, 혼담 → 정혼, 후원,
// 플레이어 없이도 도는 사교계(연회 집·사람들·추문·혼담), 대 잇기, 옛 저장, 글이 깨지지 않는지 본다.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { societyLines, societyLine, societyInfo, societyState, societyAccess, openKinds, CITIES } from '../src/society/index.js';
import { courtState } from '../src/court/index.js';
import { loveState } from '../src/love/index.js';
import { artsState } from '../src/arts/index.js';
import { byId } from '../src/npc.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  /.test(t);
const verbose = process.argv.includes('-v');
const scenes = {}; const kinds = {}; const samples = {};
const keep = (k, t) => { (samples[k] ??= []).length < 2 && !samples[k].includes(t) && samples[k].push(t); };

function resolveAll(g, pickIdx) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const kind = L(g).scene?.kind ?? pe.id;
    const mine = kind.startsWith('so_');
    if (mine) { scenes[kind] = (scenes[kind] ?? 0) + 1; ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.text} | ${pe.choices}`); }
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    if (mine && pickIdx != null) idx = Math.min(pickIdx, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); keep(kind, `${pe.text.slice(0, 90)}… [${pe.choices[idx]}] → ${String(out).slice(0, 90)}`); }
    ok(g.player.money >= 0 && Number.isFinite(g.player.money), `money after ${kind}`);
  }
}
function checkMonth(g) {
  const ls = societyLines(g);
  ok(Array.isArray(ls) && ls.length <= 2, 'shape');
  for (const x of ls) { kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line ${x.kind}: ${x.text}`); keep(`line:${x.kind}`, x.text); }
  const l = societyLine(g); ok(l === null || typeof l === 'string', 'line');
}
function checkInfo(g) {
  const i = societyInfo(g);
  const js = JSON.stringify(i);
  ok(i && Array.isArray(i.hosts) && /undefined|NaN/.test(js) === false, `info ${js.slice(0, 200)}`);
  for (const h of i.hosts) ok(!bad(h.name) && !bad(h.kind) && !bad(h.prestige) && !bad(h.tie), `host ${JSON.stringify(h)}`);
  for (const f of i.figures) ok(!bad(f.name) && !bad(f.word), `fig ${JSON.stringify(f)}`);
  for (const x of i.talk) ok(!bad(x.text) && !bad(x.place), `talk ${x.text}`);
  ok(!bad(i.tonWord) && (i.access === null || !bad(i.access)), 'info words');
}
const adult = (g, age = 24) => { me(g).ageMonths = age * 12 + 1; };
const toSeason = (g) => { while (g.date.month !== 11) endMonth(g, [{ id: 'rest' }]); };

// 1. 드나들 길
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'capital_artisan', mode: 'free', seed: 3600 });
  ok(openKinds(g).length === 0 && societyAccess(g) === '어른이 되어야 한다', '아이는 못 들어감');
  adult(g); g.player.money = 0; g.player.familyMoney = 0; g.player.stats.cha = 10; g.player.skills.letters = 0;
  ok(openKinds(g).length === 0 && !bad(societyAccess(g)), `길 없으면 닫힘 ${openKinds(g)}`);
  g.player.money = 500; ok(openKinds(g).includes('new') && openKinds(g).includes('salon') && !openKinds(g).includes('old'), `돈 ${openKinds(g)}`);
  g.player.money = 0; g.player.title = '남작'; ok(openKinds(g).includes('old'), '작위');
  courtState(g).disgrace = 9999 * 12; ok(!openKinds(g).includes('old'), '실각하면 옛 가문 문이 닫힘'); courtState(g).disgrace = 0; g.player.title = null;
  g.player.stats.cha = 50; g.player.skills.letters = 50;
  ok(openKinds(g).length === 0 && societyAccess(g) === '소개해 줄 사람이 있어야 한다', '재주만으로는 소개가 필요');
  societyState(g).me.sponsor = { host: 1, name: 'x', at: 0, asked: false };
  ok(openKinds(g).includes('salon') && !openKinds(g).includes('old'), '재주+소개 = 살롱');
  societyState(g).me.ton = 70; ok(openKinds(g).includes('old') && openKinds(g).includes('new'), '체면이 쌓이면 문턱 높은 집도');
}

// 2. 플레이어 없이도: 도시마다 연회 집과 사람들, 추문과 혼담이 돈다 (플레이어는 시골 아이)
let npcMatches = 0; let npcScandals = 0;
{
  const g = newGame({ name: '요나스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3610 });
  for (let m = 0; m < 40 * 12 && !g.over; m++) { endMonth(g, [{ id: 'rest' }]); resolveAll(g); checkMonth(g); }
  const s = societyState(g);
  for (const pl of CITIES) ok(s.hosts.some((h) => h.place === pl && !h.closed), `연회 집 없음 ${pl}`);
  ok(CITIES.every((pl) => s.figures.filter((f) => f.place === pl).length >= 3), '사교계 사람들');
  npcMatches = s.matches.length; npcScandals = s.figures.filter((f) => f.scandal).length + s.talk.length;
  ok(npcMatches >= 1, `NPC 혼담 ${npcMatches}`);
  ok(s.talk.length >= 3, `사교계 소문 ${s.talk.length}`);
  ok(s.figures.every((f) => f.rep >= 0 && f.rep <= 100) && s.hosts.every((h) => h.prestige >= 0 && h.prestige <= 100), '범위');
  ok(s.hosts.some((h) => h.kind === 'old') && s.hosts.some((h) => h.kind === 'new') && s.hosts.some((h) => h.kind === 'salon'), '세 가지 집');
  ok(Object.keys(scenes).length === 0, `시골 아이에게 장면 ${JSON.stringify(scenes)}`);
  checkInfo(g);
}

// 3. 사교 철 초대장: 백작가 서자로 베르덴에서 산다
{
  const g = newGame({ name: '레온', sex: 'm', familyId: 'count_bastard', mode: 'free', seed: 3620 });
  adult(g, 20); g.player.money = 300;
  for (let m = 0; m < 8 * 12 && !g.over; m++) { g.player.money = Math.max(g.player.money, 300); endMonth(g, [{ id: 'rest' }]); resolveAll(g); checkMonth(g); if (m % 24 === 0) checkInfo(g); }
  ok((scenes.so_invite ?? 0) >= 3 && (scenes.so_party ?? 0) >= 2, `초대장 ${JSON.stringify(scenes)}`);
  ok(societyState(g).me.ton > 0 || (scenes.so_invite ?? 0) > 0, '체면');
  ok((kinds.season ?? 0) >= 1, '사교 철 글');
  checkInfo(g);
}

// 4. 재주로 들어가기: 소개해 주는 사람이 저절로 온다
{
  const before = scenes.so_sponsor ?? 0;
  const g = newGame({ name: '클라라', sex: 'f', familyId: 'slum_orphan', mode: 'free', seed: 3630 });
  adult(g, 22); g.player.stats.cha = 55; g.player.skills.letters = 60;
  for (let m = 0; m < 12 * 12 && !g.over && (scenes.so_sponsor ?? 0) === before; m++) { endMonth(g, [{ id: 'rest' }]); resolveAll(g, 0); }
  ok((scenes.so_sponsor ?? 0) > before, '소개해 주는 사람이 안 옴');
  ok(societyState(g).me.sponsor && openKinds(g).includes('salon'), '소개 받으면 살롱');
}

// 5. 장면마다 고를 것을 다 골라 본다
{
  const g = newGame({ name: '레온', sex: 'm', familyId: 'capital_artisan', mode: 'free', seed: 3640 });
  adult(g, 25); g.player.money = 900; g.player.title = '남작';
  toSeason(g);
  const s = societyState(g);
  const pl = L(g).place;
  const h = s.hosts.find((x) => x.place === pl && !x.closed && x.kind === 'old') ?? s.hosts.find((x) => x.place === pl);
  const sal = s.hosts.find((x) => x.place === pl && x.kind === 'salon') ?? h;
  const fs = s.figures.filter((f) => f.place === pl);
  ok(h && fs.length >= 2, '연회 집과 사람');
  let gotPatron = false;
  const base = { hid: h.id, host: h.name, fig: fs[0].name, fid: fs[0].id, low: false, dress: true, other: fs[1].name };
  const DATA = {
    so_invite: [{ hid: h.id, host: h.name, hk: h.kind, dressed: true, season: true }, { hid: h.id, host: h.name, hk: h.kind, dressed: false, season: false }],
    so_party: ['talk', 'dance', 'gossip', 'snub', 'gamble'].map((ev) => ({ ...base, ev })).concat([{ ...base, ev: 'snub', dress: false, low: true }, { ...base, ev: 'talk', low: true }, { ...base, ev: 'patron', hostName: h.name }]),
    so_sponsor: [{ hid: sal.id, host: sal.name, why: '작품' }],
    so_favor: [0, 1, 2].map((v) => ({ host: sal.name, v })),
    so_scandal: ['affair', 'noto', 'disgrace', 'loss'].map((why) => ({ pl, why })),
    so_host: [{ cost: 120 }],
  };
  for (const [kind, list] of Object.entries(DATA)) for (const d of list) for (let i = 0; i < 3; i++) {
    if (d.ev === 'patron') artsState(g).patron = null;
    s.me.sponsor = { host: sal.id, name: sal.name, at: 0, asked: false };
    ok(showScene(g, { kind, at: pl, t: 0, ...d }, { force: true }) && g.pendingEvent, `장면이 안 뜸 ${kind} ${d.ev ?? ''}`);
    resolveAll(g, i);
    if (d.ev === 'patron' && i === 0) gotPatron = artsState(g).patron?.name === h.name;
    g.player.money = Math.max(g.player.money, 900);
  }
  ok(gotPatron, '후원 받기');
  for (const k of Object.keys(DATA)) ok(scenes[k] > 0, `장면 ${k}`);
  // 혼담 → 정혼
  for (let i = 0; i < 3; i++) {
    loveState(g).engaged = null; me(g).spouseId = null;
    const n = g.people.length;
    const d = { ...base, ev: 'match', msex: 'f', mname: '엘자', mlast: '폰 리히트', mkind: '오래된', mbat: false, mage: 24 };
    ok(showScene(g, { kind: 'so_party', at: pl, t: 0, ...d }, { force: true }), '혼담 장면');
    resolveAll(g, i);
    const eng = loveState(g).engaged;
    if (i === 0) { ok(eng && eng.arranged && byId(g, eng.id)?.name === '엘자' && g.people.length === n + 1, `정혼 ${JSON.stringify(eng)}`); }
    else ok(!eng && g.people.length === n, `혼담 사양 ${i}`);
  }
  ok(Number.isFinite(courtState(g).standing ?? 0) && s.me.ton >= 0 && s.me.ton <= 100, '체면 범위');
  checkInfo(g);
}

// 6. 그냥 사는 삶: 도시의 여러 집안 (무작위 행동)
for (let k = 0; k < 4; k++) {
  const fam = ['capital_artisan', 'count_bastard', 'tower_blood', 'port_folk'][k];
  const g = newGame({ name: k % 2 ? '요나스' : '클라라', sex: k % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed: 3650 + k });
  const rng = rngOf(g);
  for (let m = 0; m < 35 * 12 && !g.over; m++) {
    const acts = availableActions(g).filter((a) => !/travel|move/.test(a.id));
    const ch = [];
    for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
    endMonth(g, ch); resolveAll(g); checkMonth(g);
    if (m % 60 === 0) checkInfo(g);
  }
  checkInfo(g);
}

// 7. 대 잇기와 옛 저장
{
  const g = newGame({ name: '레온', sex: 'm', familyId: 'count_bastard', mode: 'free', seed: 3670 });
  const s = societyState(g);
  s.me.ton = 60; s.me.ties = { 3: 50 }; s.me.sponsor = { host: 3, name: 'x', at: 0, asked: false };
  runHooks('heir', g, rngOf(g), { ...g.player, name: '오토' });
  ok(s === societyState(g) && societyState(g).me.ton === 18 && societyState(g).me.ties[3] === 20 && !societyState(g).me.sponsor && societyState(g).gen === 1, `대 잇기 ${JSON.stringify(societyState(g).me)}`);
  delete g.society; runHooks('migrate', g);
  ok(g.society && Array.isArray(g.society.hosts) && g.society.me.ton === 0, '옛 저장');
  endMonth(g, [{ id: 'rest' }]); checkInfo(g);
}

console.log(`장면 ${JSON.stringify(scenes)}`);
console.log(`줄 ${JSON.stringify(kinds)}  NPC 혼담 ${npcMatches} 추문·소문 ${npcScandals}`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('societytest OK');
