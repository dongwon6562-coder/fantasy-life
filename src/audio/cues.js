// 소리 큐 (30단계): 결정적 순간에 한 번 울리는 짧은 악구. 음악과 같은 녹음 악기(samples.js)로 낸다.
// - 사건 창이 뜰 때의 여는 소리 (toll 조종, omen 불길한 떨림, herald 뿔나팔, wonder, tender)
// - 결과가 드러날 때 (grief 잃음, turn 뒤집힘, dread 무너짐, wonder 깨달음, tender 다정함, triumph 해냄)
// - 장면이 열릴 때 (arrive_* 처음 닿은 곳, newlife 삶의 시작, homecoming 오랜만의 귀향)
// 흐르는 곡과 조가 달라도 부딪히지 않게, 3도를 피하고 빈 5도·옥타브·한 줄 가락으로만 쓴다. 큐가 울리는 동안 음악은 물러난다.
import { SFX_INST, SFX_PERC, PERC } from './engine.js';
import { SFX } from './sfx.js';

// 음표: [악기, 시각(초), 음, 길이(초), 세기, 옵션]. 타악은 PERC 이름.
const N = (...a) => a;
const roll = (inst, t, midis, gap, dur, vel, grow = 0) => midis.map((m, i) => N(inst, t + i * gap * (1 + i * 0.04), m, dur, vel + grow * i));

export const CUES = {
  toll: { name: '조종', duck: [0.45, 3.2], level: 1.5, notes: [
    N('bell', 0, 57, 4, 0.5), N('bell', 2.1, 57, 4, 0.36),
    N('strings', 0.1, 38, 3.6, 0.3, { attack: 0.5, release: 2 }), N('strings', 0.1, 45, 3.6, 0.26, { attack: 0.5, release: 2 }),
  ] },
  omen: { name: '불길한 떨림', duck: [0.5, 2.2], level: 1.3, notes: [
    N('trem', 0, 38, 2.2, 0.34, { attack: 0.9, release: 0.9 }), N('trem', 0.05, 39, 2.2, 0.3, { attack: 1.1, release: 0.9 }),
    N('bass', 0, 26, 2.4, 0.4, { attack: 0.3, release: 1 }), N('taiko', 1.7, 36, 0.1, 0.42),
  ] },
  herald: { name: '뿔나팔', duck: [0.5, 2], level: 0.85, notes: [
    N('horn', 0, 50, 0.3, 0.5), N('horn', 0.34, 57, 0.3, 0.52), N('horn', 0.68, 57, 1.5, 0.58), N('horn', 0.68, 50, 1.5, 0.4),
    N('timp', 0.68, 38, 0.1, 0.5),
  ] },
  wonder: { name: '깨달음', duck: [0.5, 2.6], level: 1.1, notes: [
    ...roll('harp', 0, [50, 57, 62, 64, 69, 74, 76, 81], 0.085, 2.5, 0.36, 0.012),
    N('glock', 0.72, 86, 2, 0.3), N('glock', 1.0, 93, 2, 0.24),
    N('choir', 0.3, 62, 2.4, 0.26, { attack: 0.5, release: 1.4 }), N('choir', 0.3, 69, 2.4, 0.22, { attack: 0.5, release: 1.4 }),
  ] },
  tender: { name: '다정함', duck: [0.55, 2.4], level: 1.3, notes: [
    ...roll('harp', 0, [50, 57, 62, 69], 0.16, 2.5, 0.38),
    N('clarinet', 0.7, 69, 0.7, 0.36), N('clarinet', 1.4, 74, 1.5, 0.4, { slur: true }),
    N('strings', 0.6, 50, 2.2, 0.22, { attack: 0.5, release: 1.4 }),
  ] },
  grief: { name: '잃음', duck: [0.4, 3.6], level: 1.15, notes: [
    N('cello', 0, 62, 0.9, 0.44), N('cello', 0.9, 60, 0.9, 0.4, { slur: true }), N('cello', 1.8, 57, 2.2, 0.42, { slur: true }),
    N('strings', 0.1, 38, 3.8, 0.26, { attack: 0.6, release: 2 }), N('strings', 0.1, 45, 3.8, 0.22, { attack: 0.6, release: 2 }),
    N('bell', 1.8, 57, 4, 0.3),
  ] },
  turn: { name: '뒤집힘', duck: [0.4, 2], level: 0.7, notes: [
    N('spic', 0, 50, 0.3, 0.8), N('spic', 0, 51, 0.3, 0.76), N('spic', 0, 44, 0.3, 0.78), N('timp', 0, 38, 0.1, 0.76),
    N('trem', 0.12, 38, 1.8, 0.3, { attack: 0.05, release: 1.2 }), N('bass', 0.02, 26, 1.6, 0.5, { release: 0.9 }),
  ] },
  dread: { name: '무너짐', duck: [0.4, 3], level: 0.9, notes: [
    N('taiko', 0, 36, 0.1, 0.6), N('trombone', 0.03, 38, 1.2, 0.5), N('trombone', 1.2, 37, 1.8, 0.46, { slur: true }),
    N('bass', 0.03, 26, 3, 0.48, { release: 1.2 }), N('trem', 0.4, 45, 2.4, 0.26, { attack: 0.8, release: 1.2 }),
    N('taiko', 2.1, 36, 0.1, 0.4),
  ] },
  triumph: { name: '해냄', duck: [0.45, 2.6], level: 0.8, notes: [
    N('timp', 0, 38, 0.1, 0.6), N('horn', 0, 50, 0.24, 0.5), N('horn', 0.26, 57, 0.24, 0.54), N('horn', 0.52, 62, 1.7, 0.6), N('horn', 0.52, 57, 1.7, 0.42),
    N('trumpet', 0.52, 69, 1.4, 0.34), N('timp', 0.52, 45, 0.1, 0.66),
    N('strings', 0.52, 50, 2, 0.34, { attack: 0.08, release: 1.2 }), N('strings', 0.52, 57, 2, 0.3, { attack: 0.08, release: 1.2 }), N('strings', 0.52, 62, 2, 0.3, { attack: 0.08, release: 1.2 }),
  ] },
  hush: { name: '숨죽임', duck: [0.3, 1.1], level: 1.2, notes: [N('timp', 0, 38, 0.1, 0.24), N('timp', 0.42, 38, 0.1, 0.3)] },

  /* ----- 장면이 열릴 때 ----- */
  arrive_village: { name: '마을에 닿다', duck: [0.5, 2.4], level: 1.15, notes: [
    ...roll('harp', 0, [50, 57, 62, 69], 0.2, 3, 0.4), N('recorder', 0.9, 74, 0.6, 0.34), N('recorder', 1.5, 69, 1.6, 0.36, { slur: true }),
    N('strings', 0.2, 50, 3, 0.24, { attack: 0.7, release: 1.6 }), N('strings', 0.2, 57, 3, 0.2, { attack: 0.7, release: 1.6 }),
  ] },
  arrive_city: { name: '도시에 닿다', duck: [0.5, 2.6], level: 0.9, notes: [
    N('bell', 0, 62, 4, 0.34), N('bell', 1.3, 57, 4, 0.3),
    N('horn', 0.3, 50, 0.5, 0.4), N('horn', 0.8, 57, 1.9, 0.46),
    N('strings', 0.3, 38, 3, 0.28, { attack: 0.5, release: 1.6 }), N('strings', 0.3, 50, 3, 0.26, { attack: 0.5, release: 1.6 }), N('strings', 0.3, 57, 3, 0.24, { attack: 0.5, release: 1.6 }),
  ] },
  arrive_wild: { name: '낯선 땅에 닿다', duck: [0.5, 2.8], level: 1.15, notes: [
    N('strings', 0, 38, 3.4, 0.3, { attack: 1, release: 1.8 }), N('strings', 0, 45, 3.4, 0.28, { attack: 1, release: 1.8 }),
    N('flute', 0.9, 69, 0.8, 0.34), N('flute', 1.7, 74, 0.5, 0.32, { slur: true }), N('flute', 2.2, 72, 1.6, 0.34, { slur: true }),
    N('tom', 0.9, 45, 0.1, 0.3),
  ] },
  arrive_dark: { name: '어두운 곳에 닿다', duck: [0.45, 3], level: 1.2, notes: [
    N('bass', 0, 26, 3.4, 0.46, { attack: 0.4, release: 1.4 }), N('trem', 0.2, 38, 3, 0.28, { attack: 1.2, release: 1.2 }), N('trem', 0.2, 45, 3, 0.24, { attack: 1.2, release: 1.2 }),
    N('taiko', 0, 36, 0.1, 0.44), N('choir', 1.2, 50, 2.2, 0.2, { attack: 0.8, release: 1.4 }),
  ] },
  arrive_holy: { name: '성지에 닿다', duck: [0.5, 3], level: 1.9, notes: [
    N('organ', 0, 38, 3.2, 0.3, { attack: 0.3, release: 1.4 }), N('organ', 0, 50, 3.2, 0.26, { attack: 0.3, release: 1.4 }),
    N('choir', 0.5, 57, 2.8, 0.3, { attack: 0.6, release: 1.4 }), N('choir', 0.5, 62, 2.8, 0.28, { attack: 0.6, release: 1.4 }),
    N('bell', 0.5, 62, 4, 0.3),
  ] },
  newlife: { name: '삶의 시작', duck: [0.45, 3.4], level: 1.25, notes: [
    ...roll('harp', 0, [38, 50, 57, 62, 69, 74], 0.14, 3.5, 0.38, 0.01),
    N('choir', 0.5, 62, 3, 0.26, { attack: 0.8, release: 1.6 }), N('choir', 0.5, 69, 3, 0.22, { attack: 0.8, release: 1.6 }),
    N('cello', 1.0, 57, 1.1, 0.36), N('cello', 2.1, 62, 2, 0.4, { slur: true }),
    N('bell', 2.1, 62, 4, 0.24),
  ] },
  homecoming: { name: '오랜만의 귀향', duck: [0.5, 3], level: 1.15, notes: [
    N('lute', 0, 50, 2, 0.42), N('lute', 0.24, 57, 2, 0.4), N('lute', 0.48, 62, 2.4, 0.42),
    N('cello', 0.8, 62, 0.8, 0.36), N('cello', 1.6, 64, 0.5, 0.34, { slur: true }), N('cello', 2.1, 57, 2, 0.38, { slur: true }),
    N('strings', 0.5, 50, 3, 0.2, { attack: 0.7, release: 1.6 }),
  ] },
};
const realInst = (name) => (PERC[name] ? PERC[name][0] : name);

/** 큐 하나(또는 전부)가 쓰는 녹음: { 악기: [음들] } */
export function cueNeeds(ids = Object.keys(CUES)) {
  const needs = {};
  for (const id of ids) for (const [inst, , midi] of CUES[id]?.notes ?? []) (needs[realInst(inst)] ??= new Set()).add(midi);
  for (const k of Object.keys(needs)) needs[k] = [...needs[k]];
  return needs;
}
/** 효과음(sfx.js)의 가락과 북이 쓰는 녹음. 효과음을 빈 도구로 몇 번씩 돌려 보고 받아 적는다. */
export function sfxNeeds() {
  const needs = {};
  const add = (inst, midi) => { (needs[inst] ??= new Set()).add(Math.round(midi)); };
  const k = {
    p: 1, g: 1, rl: 1, rec: () => null, pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    note: (inst, t, midi) => { const m = SFX_INST[inst]; if (m) add(m[0], midi + (m[2] ?? 0)); },
    perc: (type) => { const m = SFX_PERC[type]; if (m) add(m[0], m[1]); },
  };
  for (const s of Object.values(SFX)) for (let i = 0; i < 12; i++) { try { s.play(k, 0); } catch { /* 녹음만 쓰는 소리 */ } }
  for (const key of Object.keys(needs)) needs[key] = [...needs[key]].sort((a, b) => a - b);
  return needs;
}
/** 늘 받아 두는 녹음: 효과음의 가락 (큐의 녹음은 처음 울릴 때 받는다) */
export const kitNeeds = () => sfxNeeds();
/** 곧 울릴 만한 큐의 녹음을 미리 받아 둔다 (붙들어 두지는 않는다) */
export function warmCues(engine, ids) { try { engine?.pin?.(cueNeeds(ids), false)?.catch?.(() => {}); } catch { /* 없어도 그만 */ } }

/**
 * 큐를 낸다. group: 효과음 묶음(engine.group('sfx')). when: 몇 초 뒤.
 * 녹음이 아직 없으면 받아 온 뒤에 내되, 0.9초 넘게 걸리면 때를 놓친 것이니 그만둔다. 낸(낼) 것이면 true.
 */
export function playCue(group, id, when = 0, { duck = true } = {}) {
  const cue = CUES[id]; const e = group?.e;
  if (!cue || !e || group.dead) return false;
  const asked = e.ctx.currentTime;
  const fire = () => {
    const late = e.ctx.currentTime - asked;
    if (late > 0.9 + when || group.dead) return;
    const t0 = Math.max(e.ctx.currentTime + 0.02, asked + when);
    for (const [inst, t, midi, dur, vel, o] of cue.notes) {
      const real = realInst(inst);
      group.sample(real, t0 + t, PERC[inst] ? PERC[inst][1] : midi, dur, vel, { ...(o ?? {}), gain: cue.level ?? 1 });
    }
    if (duck && cue.duck) e.duck(cue.duck[0], cue.duck[1], Math.max(0, t0 - e.ctx.currentTime));
  };
  const needs = cueNeeds([id]);
  // 큐의 녹음은 붙들어 두지 않는다 (다음 곡을 받을 때 오래된 것부터 내려놓는다)
  if (e.has(needs)) fire(); else Promise.resolve(e.pin(needs, false)).then((ok) => { if (ok) fire(); }).catch(() => {});
  return true;
}
