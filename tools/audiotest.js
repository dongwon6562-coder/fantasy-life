// 음악·효과음 점검 (브라우저 없이): 악보가 다 읽히는지, 음이 말이 되는 범위인지,
// 상황마다 곡이 제대로 골라지는지, 게임을 오래 돌려도 고르기가 깨지지 않는지 본다.
import '../src/content.js';
import { TRACKS } from '../src/audio/tracks.js';
import { compileTrack, scheduleBar, nextPos } from '../src/audio/music.js';
import { SFX } from '../src/audio/sfx.js';
import { pickTrack, pickMusic, placePool, eventMood, fightSfx, seasonOf, ambienceWhere } from '../src/audio/pick.js';
import { AMBIENCES, pickAmbience, ambienceScene, AMB_BEDS, AMB_SHOTS } from '../src/audio/ambience.js';
import { conditionText } from '../src/art/scene.js';
import { chordLine, melodyNotes } from '../src/audio/music.js';
import { audio } from '../src/audio/index.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { iconName } from '../src/art/icons.js';
import { ACTIONS } from '../src/actions.js';

let bad = 0;
const fail = (msg) => { bad++; console.log('FAIL', msg); };
const ids = new Set(TRACKS.map((t) => t.id));

// 1. 곡: 악보 읽기, 음역, 마디마다 소리가 있는지
let notes = 0;
for (const tr of TRACKS) {
  try {
    const secs = compileTrack(tr);
    const fake = {
      note(inst, t, midi, dur, vel) { notes++; if (![t, midi, dur, vel].every(Number.isFinite) || midi < 21 || midi > 100 || dur <= 0 || vel <= 0 || vel > 1.3) fail(`${tr.id}: 이상한 음 ${inst} ${midi} ${dur} ${vel}`); },
      perc(type, t, vel) { notes++; if (!Number.isFinite(t) || !(vel > 0)) fail(`${tr.id}: 이상한 타악 ${type}`); },
    };
    let pos = { sec: 0, bar: 0, loop: 0 }; let silent = 0, bars = 0;
    while (pos.loop < 3) { const n0 = notes; scheduleBar(tr, fake, pos, bars * 2); if (notes === n0) silent++; bars++; pos = nextPos(tr, pos); }
    if (silent > bars * 0.25) fail(`${tr.id}: 빈 마디가 너무 많음 (${silent}/${bars})`);
    if (!secs.some((s) => !s.once)) fail(`${tr.id}: 되풀이할 구간이 없음`);
  } catch (e) { fail(`${tr.id}: ${e.message}`); }
}

// 2. 상황별 곡 고르기
const g0 = (o = {}) => ({ date: { year: 500, month: 4 }, life: { place: 'ern' }, world: {}, ...o });
const expect = (got, want, what) => { if (got !== want) fail(`${what}: ${got} (기대 ${want})`); };
expect(pickTrack(null), 'title', '게임 없음');
expect(pickTrack(g0(), { title: true }), 'title', '처음 화면');
expect(pickTrack(g0()), 'village_spring', '에른 봄');
expect(pickTrack(g0({ date: { year: 500, month: 12 } })), 'village_winter', '에른 겨울');
expect(pickTrack(g0({ life: { place: 'harfen' } })), 'town', '하르펜');
expect(pickTrack(g0({ life: { place: 'verden' } })), 'castle', '베르덴');
expect(pickTrack(g0({ life: { place: 'leocast' } })), 'capital', '왕도');
for (const [pl, want] of [['saltmare', 'isles'], ['iela', 'elfwood'], ['grondar', 'dwarfhall'], ['noah', 'magetower'], ['ort', 'garrison'], ['barka', 'labyrinth'], ['eisen', 'empire'], ['solaris', 'holy'], ['graubel', 'north'], ['estella', 'north'], ['dusk', 'demonland'], ['serenia', 'lakecity'], ['gruental', 'village_spring'], ['bern', 'village_spring']]) expect(pickTrack(g0({ life: { place: pl } })), want, `고장 곡 ${pl}`);
expect(pickTrack(g0({ life: { place: 'ern', travel: { to: 'harfen' } } })), 'road', '길 위');
expect(pickTrack(g0({ world: { famine: true } })), 'hardship', '기근');
expect(placePool(g0({ world: { famine: true } })).join(), 'hardship,village_spring', '기근 곡 묶음');
expect(placePool(g0()).join(), 'village_spring,ern_fields,ern_dusk', '에른 봄 곡 묶음');
expect(placePool(g0({ life: { place: 'harfen' } })).join(), 'town,market', '하르펜 곡 묶음');
expect(pickTrack(g0({ player: { id: 1 }, people: [{ id: 1, ageMonths: 10 }] })), 'cradle', '갓난아기');
expect(pickMusic(g0()).cue, false, '배경 곡');
expect(pickTrack(g0({ pendingEvent: { id: 'duel_round', title: '결투 · 1합', text: '' } })), 'duel', '결투');
expect(pickTrack(g0({ over: true })), 'solemn', '삶의 끝');
const scene = (kind, extra = {}) => g0({ pendingEvent: { id: 'life_scene', title: '', text: '' }, life: { place: 'harfen', scene: { kind, ...extra } } });
expect(pickTrack(scene('fight', { enc: {} })), 'battle', '싸움');
expect(pickTrack(scene('fight', { enc: { nemesisId: 3 } })), 'boss', '숙적');
expect(pickTrack(scene('dungeon')), 'dungeon', '미궁');
expect(pickTrack(scene('housing')), 'town', '집 구하기 장면');
expect(pickTrack(scene('battle')), 'war', '전쟁');
expect(pickTrack(scene('gang_offer')), 'underworld', '뒷골목');
expect(pickTrack(scene('domain_rule')), 'court', '영지');
expect(pickMusic(scene('fight', { enc: {} })).cue, true, '상황 곡');
expect(pickAmbience(ambienceWhere(pickMusic(scene('fight', { enc: {} }))), '한낮 · 맑음'), 'none', '싸움 중 환경음');
expect(pickAmbience(ambienceWhere(pickMusic(scene('dungeon'))), ''), 'dungeon', '미궁 환경음');
expect(pickAmbience('village_spring', '한낮 · 비'), 'field|spring|rain|day', '비 환경음');
expect(pickAmbience('village_summer', '밤 · 맑음'), 'field|summer|clear|night', '밤 환경음');
expect(pickAmbience('town', '한낮 · 흐림', 10), 'town|autumn|cloudy|day', '도시 환경음');
expect(pickAmbience('castle', '새벽 · 눈보라', 1), 'castle|winter|blizzard|dawn', '눈보라 환경음');
expect(pickAmbience('road', '해 질 녘 · 뇌우', 7), 'road|summer|storm|dusk', '뇌우 환경음');
expect(pickAmbience('cradle', '밤 · 눈', 12), 'hearth|winter|snow|night', '집 안 환경음');
expect(pickAmbience(ambienceWhere(pickMusic(scene('deep_descend'))), ''), 'deep', '깊은 구렁 환경음');
expect(pickMusic(scene('court_plot')).pool[0], 'palace', '궁정 음모 곡');
expect(pickMusic(scene('deep_throne')).pool[0], 'abyss', '깊은 구렁 곡');
// 짜 맞출 수 있는 모든 환경음: 깔개와 소리 이름이 다 있는 것인지, 계절·날씨마다 정말 다른지
{
  const seen = new Set();
  for (const pl of ['field', 'town', 'capital', 'castle', 'road', 'bleak', 'hearth']) for (const se of ['spring', 'summer', 'autumn', 'winter']) for (const wx of ['clear', 'cloudy', 'wind', 'fog', 'rain', 'storm', 'snow', 'blizzard']) for (const td of ['day', 'dawn', 'dusk', 'night']) {
    const sc = ambienceScene(`${pl}|${se}|${wx}|${td}`);
    if (!sc) { fail(`환경음을 못 짬: ${pl} ${se} ${wx} ${td}`); continue; }
    for (const b of sc.beds) if (!AMB_BEDS.includes(b[0]) || !(b[1] > 0 && b[1] <= 1)) fail(`환경음 깔개 이상: ${sc.name} ${b}`);
    for (const [n, every] of sc.shots) if (!AMB_SHOTS.includes(n) || !(every >= 0.4)) fail(`환경음 소리 이상: ${sc.name} ${n} ${every}`);
    if (!(sc.gain > 0.2 && sc.gain <= 1)) fail(`환경음 크기 이상: ${sc.name} ${sc.gain}`);
    if (pl === 'field') seen.add(JSON.stringify([sc.beds, sc.shots]));
  }
  if (seen.size < 80) fail(`들판 환경음이 계절·날씨로 충분히 갈리지 않는다: ${seen.size}`);
  if (ambienceScene('field|spring|mud|day') || ambienceScene('nowhere')) fail('없는 환경음 id를 받아들였다');
}
expect(pickTrack(g0({ pendingEvent: { id: 'x', title: '수확제', text: '' } })), 'festive', '수확제');
expect(pickTrack(g0({ pendingEvent: { id: 'x', title: '국상', text: '' } })), 'solemn', '국상');
expect(pickTrack(g0({ pendingEvent: { id: 'x', title: '숲가의 늑대', text: '' } })), 'tense', '늑대');
expect(pickTrack(g0({ pendingEvent: { id: 'x', title: '손끝의 열기', text: '' } })), 'mystic', '마력');
expect(pickTrack(g0(), { overlay: true, last: 'battle' }), 'battle', '싸움 결과 창');
expect(fightSfx('고블린 셋에게 패해 크게 다쳤다.'), 'defeat', '패배 소리');
expect(fightSfx('싸움을 피했다. 살아남는 것도 실력이라고 스스로를 달랬다.'), 'flee', '회피 소리');
expect(fightSfx('놈들을 쓰러뜨렸다.'), 'victory', '승리 소리');
for (let m = 1; m <= 12; m++) if (!ids.has(`village_${seasonOf(m)}`)) fail(`계절 곡 없음: ${m}월`);

// 3. 실제 게임을 돌리며: 고른 곡이 늘 있는 곡인지, 행동마다 효과음이 있는지
const used = new Map(); const usedAmb = new Map(); const ambIds = { has: (id) => !!ambienceScene(id) }; void AMBIENCES;
for (let run = 0; run < 12; run++) {
  const g = newGame({ name: '소리', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'fallen_knight', 'merchant'][run % 3], mode: 'once', seed: 4200 + run });
  for (let m = 0; m < 12 * 40 && !g.over; m++) {
    const rng = rngOf(g); const acts = availableActions(g); const choices = [];
    for (let i = 0; i < slotsFor(g); i++) { const a = rng.pick(acts); const c = { id: a.id }; if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive)?.id; choices.push(c); }
    endMonth(g, choices);
    const pm = pickMusic(g, { overlay: !!g.pendingEvent });
    for (const x of pm.pool) if (!ids.has(x)) fail(`없는 곡을 골랐다: ${x}`);
    const am = pickAmbience(ambienceWhere(pm), conditionText(g.date.year, g.date.month), g.date.month);
    if (am !== 'none' && !ambIds.has(am)) fail(`없는 환경음: ${am}`);
    usedAmb.set(am, (usedAmb.get(am) ?? 0) + 1);
    let id = pm.pool[0];
    used.set(id, (used.get(id) ?? 0) + 1);
    let guard = 0;
    while (g.pendingEvent && guard++ < 20) {
      eventMood(g);
      resolveEvent(g, rngOf(g), rng.int(0, g.pendingEvent.choices.length - 1));
      id = pickTrack(g, { overlay: true, last: id });
      if (!ids.has(id)) fail(`없는 곡을 골랐다: ${id}`);
      used.set(id, (used.get(id) ?? 0) + 1);
    }
  }
}
const missing = ACTIONS.map((a) => iconName(a)).filter((n) => !SFX[n]);
if (missing.length) fail(`효과음 없는 행동 종류: ${[...new Set(missing)].join(', ')}`);
if (audio.tracks.length !== TRACKS.length || !audio.sounds.length) fail('audio 목록이 비었다');

console.log(`곡 ${TRACKS.length}개, 효과음 ${Object.keys(SFX).length}개, 점검한 음 ${notes}개`);
console.log('게임에서 흐른 곡:', [...used].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(`게임에서 흐른 환경음 ${usedAmb.size}가지, 많은 순:`, [...usedAmb].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(bad ? `FAIL ${bad}` : 'OK');
if (bad) process.exit(1);
