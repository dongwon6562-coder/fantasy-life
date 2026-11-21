// 30단계 연출과 소리 점검: 때·날씨의 빛깔, 곳의 울림, 결정적 순간의 큐, 장면 연출을 띄울 대목.
import { TRACKS } from '../src/audio/tracks.js';
import { SAMPLES } from '../src/audio/samples.js';
import { INST, PERC, SPACES, SFX_INST, SFX_PERC } from '../src/audio/engine.js';
import { scheduleBar, barLen, compileTrack } from '../src/audio/music.js';
import { colorOf, skyOf, placePool, spaceOf, shelterOf, momentOf, OPEN_CUE, arrivalOf, arriveCue, pickMusic, whereOf } from '../src/audio/pick.js';
import { CUES, cueNeeds, sfxNeeds, kitNeeds } from '../src/audio/cues.js';
import { pickAmbience, ambienceScene } from '../src/audio/ambience.js';
import { showStage, stageActive } from '../src/art/stage.js';

let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
const ok = (c, m) => { if (!c) fail(m); };
const ids = new Set(TRACKS.map((t) => t.id));
const g0 = (o = {}) => ({ date: { year: 500, month: 4 }, life: { place: 'ern' }, people: [], world: {}, ...o });

// 1. 빛깔: 모든 달에서 값이 제 범위에 있고, 밤은 낮보다 느리고 여리고 어둡다
const seen = { tod: new Set(), wx: new Set() }; let nightN = 0, dayN = 0, nightT = 0, dayT = 0;
for (let y = 500; y < 540; y++) for (let m = 1; m <= 12; m++) {
  const g = g0({ date: { year: y, month: m } }); const sky = skyOf(g), c = colorOf(g);
  seen.tod.add(sky.tod); seen.wx.add(sky.weather);
  ok(c.tempo >= 0.85 && c.tempo <= 1.05, `빠르기 ${c.tempo}`); ok(c.vel >= 0.6 && c.vel <= 1, `세기 ${c.vel}`);
  ok(c.lp >= 4200 && c.lp <= 18000, `밝기 ${c.lp}`); ok(c.wet >= 1 && c.wet <= 1.5, `울림 ${c.wet}`); ok([0, 1, 2].includes(c.thin), `덜기 ${c.thin}`);
  if (sky.tod === 'night') { nightN++; nightT += c.tempo; ok(c.thin >= 1, '밤에는 타악을 쉰다'); } else if (sky.tod === 'day') { dayN++; dayT += c.tempo; }
  for (const pl of ['ern', 'harfen', 'verden', 'leocast']) {
    const gp = g0({ date: { year: y, month: m }, life: { place: pl } }); const pool = placePool(gp);
    ok(pool.length > 0 && pool.every((id) => ids.has(id)), `곡 묶음 ${pl} ${y}/${m}: ${pool}`);
    const mm = pickMusic(gp); const amb = pickAmbience(shelterOf(gp, mm.where), '', m);
    ok(!!ambienceScene(amb), `환경음 ${amb}`); ok(!!SPACES[spaceOf(mm, amb)], `울림 ${pl}`);
  }
}
ok(seen.tod.size === 4 && seen.wx.size >= 7, '때와 날씨가 고루 나온다');
ok(nightT / nightN < dayT / dayN - 0.04, '밤이 낮보다 느리다');
ok(colorOf(null) === null && colorOf({}) === null, '날짜가 없으면 빛깔 없음');

// 2. 빛깔이 연주에 먹는다: 덜기 1이면 타악이 빠지고, 빠르기가 마디 길이를 바꾼다
for (const t of TRACKS.filter((x) => x.kind === 'mood')) {
  const count = (color) => { let n = 0, p = 0; const grp = { note: () => { n++; }, perc: () => { p++; } }; const secs = compileTrack(t); let k = 1; const rnd = () => { k = (k * 16807) % 2147483647; return k / 2147483647; };
    secs.forEach((s, si) => { for (let b = 0; b < s.n; b++) scheduleBar(t, grp, { sec: si, bar: b, loop: 0 }, 1 + b, rnd, { color }); }); return [n, p]; };
  const [n0, p0] = count(null), [n1, p1] = count({ tempo: 0.93, vel: 0.8, thin: 1 }), [n2] = count({ tempo: 0.93, vel: 0.8, thin: 2 });
  ok(n1 === n0 && p1 === 0, `${t.id}: 덜기 1은 타악만 쉰다 (${n0}/${p0} → ${n1}/${p1})`);
  ok(n2 <= n1 && n2 > n0 * 0.5, `${t.id}: 덜기 2가 곡을 너무 비운다 (${n0} → ${n2})`);
  const pos = { sec: 0, bar: 0, loop: 0 };
  ok(Math.abs(barLen(t, pos, 0.9) - barLen(t, pos) / 0.9) < 1e-9, `${t.id}: 빠르기`);
}

// 3. 울림
ok(spaceOf({ cue: true, pool: ['dungeon'], where: 'town' }) === 'cave', '미궁은 굴');
ok(spaceOf({ cue: true, pool: ['palace'], where: 'capital' }) === 'hall', '궁정은 큰 방');
ok(spaceOf({ cue: false, pool: ['town'], where: 'town' }, 'town|spring|clear|day') === 'street', '도시는 거리');
ok(spaceOf({ cue: false, pool: ['village_spring'], where: 'village_spring' }, 'field|spring|clear|day') === 'open', '들판은 트인 곳');
ok(spaceOf({ cue: false, pool: ['village_winter'], where: 'village_winter' }, 'hearth|winter|blizzard|night') === 'indoor', '난롯가는 집 안');
ok(spaceOf({ cue: false, pool: ['town'], where: 'town' }, 'town|spring|clear|day', 'chapel:inquisition') === 'hall', '성당 사건은 큰 방');
ok(spaceOf({ cue: false, pool: ['town'], where: 'town' }, 'town|spring|clear|day', 'bedside') === 'indoor', '병상은 집 안');
for (const sp of Object.values(SPACES)) for (const k of ['music', 'amb', 'sfx']) for (const [n, v] of Object.entries(sp[k])) ok(['room', 'hall', 'stone'].includes(n) && v >= 0 && v <= 2, `울림 값 ${k}.${n}`);
{ // 겨울밤과 궂은 밤에는 집 안으로
  let inN = 0, nightAll = 0;
  for (let y = 500; y < 560; y++) for (let m = 1; m <= 12; m++) { const g = g0({ date: { year: y, month: m } }); const w = whereOf(g); if (skyOf(g).tod === 'night') { nightAll++; if (shelterOf(g, w) === 'cradle') inN++; } else ok(shelterOf(g, w) === w, '낮에는 밖'); }
  ok(inN > 0 && inN < nightAll, `밤 ${nightAll}번 가운데 집 안 ${inN}번`);
  ok(shelterOf(g0(), 'town') === 'town', '도시는 그대로');
}

// 4. 큐: 쓰는 악기와 음이 녹음 범위 안에 있다
for (const [id, c] of Object.entries(CUES)) {
  ok(c.notes.length > 0 && c.name, `${id}: 빈 큐`);
  let end = 0;
  for (const [inst, t, midi, dur, vel] of c.notes) {
    const real = PERC[inst] ? PERC[inst][0] : inst; const rows = SAMPLES[real];
    if (!rows || !INST[real]) { fail(`${id}: 없는 악기 ${inst}`); continue; }
    const lo = Math.min(...rows.map((r) => r[0])), hi = Math.max(...rows.map((r) => r[0]));
    ok(midi >= lo - 7 && midi <= hi + 7, `${id}: ${inst} ${midi}가 녹음 범위(${lo}~${hi}) 밖`);
    ok(vel > 0 && vel <= 1 && t >= 0 && dur > 0, `${id}: 값`); end = Math.max(end, t + dur);
  }
  ok(end <= 7, `${id}: 너무 길다 ${end.toFixed(1)}초`);
  ok(Object.keys(cueNeeds([id])).length > 0, `${id}: 필요한 녹음`);
}
for (const [mood, id] of Object.entries(OPEN_CUE)) ok(id === null || !!CUES[id], `여는 소리 ${mood}`);
for (const k of ['intro', 'heir', 'return', 'arrive']) for (const pl of ['ern', 'harfen', 'leocast', 'solaris', 'dusk', 'iela', 'noah', 'graubel', 'grondar']) ok(!!CUES[arriveCue(pl, k)], `닿는 소리 ${pl} ${k}`);
ok(arriveCue('ern') === 'arrive_village' && arriveCue('leocast') === 'arrive_city' && arriveCue('solaris') === 'arrive_holy' && arriveCue('dusk') === 'arrive_dark', '닿는 소리 고르기');
const kit = kitNeeds(); const sn = sfxNeeds();
ok(Object.keys(sn).length >= 6, '효과음 가락의 녹음'); for (const [inst, ms] of Object.entries(kit)) ok(!!SAMPLES[inst] && ms.length > 0, `받아 둘 녹음 ${inst}`);
for (const [, [real]] of Object.entries(SFX_INST)) ok(!!SAMPLES[real] && !!INST[real], `효과음 악기 ${real}`);
for (const [, [real]] of Object.entries(SFX_PERC)) ok(!!SAMPLES[real], `효과음 북 ${real}`);
{ // 받아 두는 녹음이 너무 크지 않다 (풀어 둔 길이 180초 아래)
  let secs = 0; for (const [inst, ms] of Object.entries(kit)) { const rows = SAMPLES[inst]; const set = new Set(); for (const m of ms) { let b = rows[0]; for (const r of rows) if (Math.abs(r[0] - m) < Math.abs(b[0] - m)) b = r; set.add(b); } for (const r of set) secs += r[3]; }
  ok(secs < 180, `받아 두는 녹음 ${secs.toFixed(0)}초`);
}

// 5. 결정적 순간 읽기
for (const [text, want] of [['그는 그날 밤 숨을 거두었다.', 'grief'], ['모든 것이 함정이었다.', 'turn'], ['나는 병사들에게 붙잡혔다.', 'dread'], ['그 순간 무언가를 깨달았다.', 'wonder'], ['우리는 말없이 손을 잡았다.', 'tender'], ['시험에 합격했다.', 'triumph'], ['밭을 갈았다. 은화 3닢을 벌었다.', null], ['', null]]) ok(momentOf(text) === want, `순간 "${text}" → ${momentOf(text)} (기대 ${want})`);

// 6. 장면 연출을 띄울 대목
{
  const g = g0();
  ok(arrivalOf(g) === null, '예전 저장을 처음 불러오면 조용히 적어만 둔다');
  ok(g.stage.at === 'ern' && g.stage.seen.ern === 500 * 12 + 4, '다녀간 곳 적기');
  g.date.month = 5; ok(arrivalOf(g) === null, '머무는 중');
  g.life.travel = { to: 'harfen' }; ok(arrivalOf(g) === null, '길 위');
  g.life.travel = null; g.life.place = 'harfen'; g.date.month = 6;
  const a = arrivalOf(g); ok(a?.kind === 'arrive' && a.place === 'harfen', '처음 닿은 곳');
  ok(arrivalOf(g) === null, '한 번만');
  g.life.place = 'ern'; g.date.month = 9; ok(arrivalOf(g) === null, '얼마 전에 떠난 곳');
  g.life.place = 'harfen'; g.date.year = 507; const r = arrivalOf(g); ok(r?.kind === 'return' && r.years === 7, `오랜만의 귀향 ${JSON.stringify(r)}`);
  ok(arrivalOf(g, 'heir')?.kind === 'heir' && arrivalOf(g0(), 'intro')?.kind === 'intro', '새 삶과 대 잇기');
  ok(arrivalOf({ ...g0(), over: true }, 'intro') === null && arrivalOf(null) === null, '끝난 삶');
  ok(JSON.parse(JSON.stringify(g)).stage.seen.harfen === g.stage.seen.harfen, '저장에 실린다');
}
// 화면이 없는 곳(node)에서는 연출을 띄우지 않는다
ok(showStage({ title: '에른 마을' }) === null && stageActive() === false, '화면 없이는 연출 없음');

console.log(`큐 ${Object.keys(CUES).length}개, 받아 두는 악기 ${Object.keys(kit).length}가지, 울림 ${Object.keys(SPACES).length}가지`);
console.log(bad ? `FAIL ${bad}` : 'OK');
process.exit(bad ? 1 : 0);
