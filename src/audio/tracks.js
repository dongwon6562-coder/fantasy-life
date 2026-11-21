// 곡 목록. 악보 적는 법은 music.js 맨 위에 있다. 악기는 모두 실제 녹음 샘플이다 (engine.js의 INST).
// 분위기: 진지한 어른 판타지. 밝은 장조 대신 옛 선법(도리아·믹솔리디아·에올리아·프리지아·리디아)을 쓴다.
// 곡의 짜임: 도입 → 주제(악기 하나) → 주제(받치는 성부가 붙음) → 가운데 대목(다른 악기, 다른 화음) → 주제(가득 차게 또는 비워서) → 맺음.
// 가락의 센박 음은 그 마디 화음의 음으로 둔다 (tools/musiccheck.js가 어긋난 곳을 찾아 준다).
// kind: 'mood' = 배경 곡(한 번 연주하고 맺는다, 사이에 쉼), 'cue' = 상황 곡(끝날 때까지 되풀이).
import { mel, under, arp, bass, pad, chop, strum, perc, drone, gen, sec } from './music.js';

const after = (n) => (loop) => loop >= n;
const odd = (loop) => loop % 2 === 1;
const even = (loop) => loop % 2 === 0;
// 자주 쓰는 받침: 현악 합주를 가운데 음역에 모아 부드럽게 잇는다
const strs = (o = {}) => pad('strings', { reg: 57, low: true, vel: 0.3, ...o });
// 가끔 한 번씩 울리는 소리 (종, 나무 소리 등). every: 몇 마디에 한 번꼴, 박은 그때그때 다르게
const now_and_then = (make, every, uses) => gen(({ rnd, deg, bar }) => (rnd() < 1 / every ? make({ rnd, deg, bar }) : []), { uses });

/* ---------- 처음 화면: 봉인 이후 ---------- */
const title = (() => {
  const cA = '1 | 7 | 4 | 1 | 3 | 7 | 5 | 1o', cB = '3 | 7 | 1 | 4 | 3 | 7 | 4 | 5';
  const A = "1 - 5 | 4 3 2 | 1 - 6, | 1 - - | 3 4 5 | 4 - 2 | 2 1 7, | 1 - -";
  const B = "7 - 5 | 2' - 7 | 1' - 5 | 6 - 4 | 5 7 2' | 4' - 2' | 1' - 6 | 7 - 5";
  const harp = arp('harp', '0 2 3 4 3 2', { oct: -1, vel: 0.42 });
  const harpLow = bass('harp', 'r - -', { oct: -2, vel: 0.46 });
  return {
    id: 'title', kind: 'mood', gain: 0.98, plays: 1, name: '봉인 이후', where: '처음 화면 · 대를 이을 때', bpm: 63, beats: 3, root: 62, scale: 'dorian',
    sections: [
      sec(4, '1 | 7 | 4 | 1o', [harp, harpLow], { once: true }),
      sec(8, cA, [harp, harpLow, mel('cello', A, { oct: -1, vel: 0.62 })]),
      sec(8, cA, [harp, harpLow, mel('cello', A, { oct: -1, vel: 0.6 }), strs({ vel: 0.26 }), mel('flute', "5 - - | 4 - - | 6 - - | 5 - - | 7 - - | 7 - - | 7 - - | 5 - -", { oct: 0, vel: 0.3 })]),
      sec(8, cB, [harp, harpLow, strs({ vel: 0.32, cresc: [0.8, 1.2] }), mel('flute', B, { vel: 0.5 }), mel('cello', "3 - - | 2 - - | 1 - - | 4 - - | 3 - - | 2 - - | 4 - - | 5 - -", { oct: -1, vel: 0.42 })]),
      sec(8, cA, [harp, harpLow, strs({ vel: 0.38 }), mel('flute', A, { oct: 1, vel: 0.4 }), mel('cello', A, { oct: -1, vel: 0.6 }),
        pad('choir', { reg: 60, vel: 0.26 }), mel('bell', '1 - - | . | . | . | 1 - - | . | . | .', { vel: 0.3, flat: true })]),
      sec(4, '1 | 7 | 4 | 1o', [harp, harpLow, strs({ vel: 0.24, cresc: [1, 0.6] }), mel('cello', "5 - - | 4 - - | 4 - 6 | 5 - -", { oct: -1, vel: 0.44 })], { rit: 0.09 }),
    ],
  };
})();

/* ---------- 요람: 아기 시절 ---------- */
const cradle = (() => {
  const cA = '1 | 5 | 6 | 1 | 2 | 6 | 5 | 1', cB = '6 | 3 | 6 | 5 | 6 | 2 | 5 | 5';
  const A = "3 - 5 | 5 - 2 | 1 - 3 | 3 - - | 4 - 2 | 3 - 1 | 2 - 7, | 1 - -";
  const B = "1' - 6 | 7 - 5 | 6 - 1' | 7 - 5 | 3 - 6 | 6 - 4 | 5 - 2 | 2 - -";
  const harp = arp('harp', '0 . 2 3 . 2', { oct: -1, vel: 0.4 });
  return {
    id: 'cradle', kind: 'mood', gain: 1.04, plays: 1, name: '요람', where: '아기 시절 (세 살까지)', bpm: 60, beats: 3, root: 65, scale: 'lydian', coda: ['harp', null],
    sections: [
      sec(2, '1 | 5', [harp], { once: true }),
      sec(8, cA, [harp, mel('clarinet', A, { oct: -1, vel: 0.5 })]),
      sec(8, cB, [harp, mel('clarinet', B, { oct: -1, vel: 0.5 }), strs({ reg: 60, low: false, vel: 0.2 })]),
      sec(8, cA, [harp, mel('flute', A, { vel: 0.4 }), mel('clarinet', "1 - - | 2 - - | 1 - - | 1 - - | 2 - - | 1 - - | 7, - - | 1 - -", { oct: -1, vel: 0.36 }), strs({ reg: 60, low: false, vel: 0.2 })], { rit: 0.08 }),
    ],
  };
})();

/* ---------- 에른 마을의 사계절 ---------- */
const spring = (() => {
  const cA = '1 | 7 | 4 | 1 | 1 | 7 | 4 5 | 1', cB = '4 | 1 | 4 | 5 | 4 | 1 | 7 | 5';
  const A = "5 - 3 5 - 1' | 7 - 5 4 - 2 | 1' - 6 4 - 6 | 5 - - 3 - - | 5 - 3 5 - 1' | 2' - 7 4 - 2 | 6 - 4 2 - 7, | 1 - - - - .";
  const B = "6 - 1' 6 - 4 | 5 - 3 1 - 3 | 4 - 6 1' - 6 | 7 - 5 2 - - | 6 - 1' 6 - 4 | 5 - 1' 3' - 1' | 2' - 7 4 - 2 | 2 - - 5 - -";
  const lute = arp('lute', '0 2 3 4 3 2', { oct: -1, vel: 0.5 });
  const pz = bass('pizz', 'r - - 5 - -', { oct: -2, vel: 0.5 });
  const drum = perc('tom', 'x . . o . o', { vel: 0.3 });
  return {
    id: 'village_spring', kind: 'mood', gain: 1.0, plays: 1, name: '에른의 봄', where: '에른 마을 · 봄', bpm: 60, beats: 2, root: 67, scale: 'mixolydian', coda: ['lute', 'strings'],
    sections: [
      sec(4, '1 | 7 | 4 | 1', [lute], { once: true }),
      sec(8, cA, [lute, pz, mel('recorder', A, { vel: 0.5 })]),
      sec(8, cA, [lute, pz, drum, mel('recorder', A, { vel: 0.5 }), mel('cello', "3 - - - - - | 2 - - - - - | 4 - - - - - | 3 - - 1 - - | 3 - - - - - | 4 - - - - - | 4 - - 2 - - | 1 - - - - -", { oct: -1, vel: 0.4 })]),
      sec(8, cB, [lute, pz, drum, mel('oboe', B, { vel: 0.46 }), strs({ reg: 59, vel: 0.22, low: false })]),
      sec(8, cA, [lute, pz, drum, mel('recorder', A, { vel: 0.5 }), mel('flute', A, { oct: 1, vel: 0.26 }), under('cello', A, { oct: -1, vel: 0.36, every: 2 }), strs({ reg: 59, vel: 0.22, low: false })]),
    ],
  };
})();

const summer = (() => {
  const cA = '1 | 2 | 1 | 5 | 6 | 2 | 5 | 1', cB = '6 | 3 | 6 | 5';
  const A = "3 - 5 - | 4 - 2 - | 3 5 1' 7 | 7 - 5 - | 6 - 1' 3' | 2' - 6 4 | 5 - 7 2' | 1' - - -";
  const harp = arp('harp', '0 2 3 4 3 2 3 2', { oct: -1, vel: 0.38 });
  const st = strs({ reg: 60, vel: 0.24 });
  return {
    id: 'village_summer', kind: 'mood', gain: 1.04, plays: 1, name: '긴 낮', where: '에른 마을 · 여름', bpm: 58, beats: 4, root: 60, scale: 'lydian',
    sections: [
      sec(2, '1 | 2', [harp], { once: true }),
      sec(8, cA, [harp, st, mel('flute', A, { vel: 0.46 })]),
      sec(4, cB, [harp, st, mel('oboe', "1' - - 6 | 7 - 5 - | 3 - 6 1' | 7 - - -", { vel: 0.42 }), bass('pizz', 'r - - - 5 - - -', { oct: -2, vel: 0.44 })]),
      sec(8, cA, [harp, st, mel('oboe', A, { vel: 0.4 }), mel('flute', "5 - - - | 6 - - - | 5 - - - | 2' - - - | 1' - - - | 6 - - - | 7 - - - | 5 - - -", { vel: 0.34 }), bass('pizz', 'r - - - 5 - - -', { oct: -2, vel: 0.44 })], { rit: 0.08 }),
    ],
  };
})();

const autumn = (() => {
  const cA = '1 | 4 | 7 | 3 | 1 | 4 | 5 | 1', cB = '3 | 7 | 4 | 1 | 3 | 7 | 4 | 5';
  const A = "5 - 3 | 4 - 6 | 4 2 7, | 3 - - | 5 - 1' | 6 - 4 | 2 - 7, | 1 - -";
  const B = "7 - 5 | 2' - 7 | 6 - 4 | 5 - 3 | 7 5 3 | 4 - 2 | 1 - 6, | 7, - -";
  const lute = arp('lute', '0 2 3 2 4 2', { oct: -1, vel: 0.48 });
  const low = bass('lute', 'r - -', { oct: -2, vel: 0.5 });
  return {
    id: 'village_autumn', kind: 'mood', gain: 0.94, plays: 1, name: '거둔 뒤', where: '에른 마을 · 가을', bpm: 76, beats: 3, root: 64, scale: 'dorian', coda: ['lute', 'strings'],
    sections: [
      sec(4, '1 | 4 | 7 | 1', [lute], { once: true }),
      sec(8, cA, [lute, low, mel('oboe', A, { vel: 0.5 })]),
      sec(8, cA, [lute, low, mel('oboe', A, { vel: 0.5 }), mel('cello', "1 - - | 1 - - | 2 - - | 3 - 5 | 3 - - | 4 - - | 5 - - | 3 - -", { oct: -1, vel: 0.44 })]),
      sec(8, cB, [lute, low, mel('cello', B, { oct: -1, vel: 0.56 }), strs({ reg: 59, low: false, vel: 0.22 })]),
      sec(8, cA, [lute, low, mel('oboe', A, { vel: 0.46 }), mel('clarinet', "3 - - | 6 - - | 7 - - | 7 - - | 3 - - | 4 - - | 7 - - | 5 - -", { oct: -1, vel: 0.36 }), strs({ reg: 59, low: false, vel: 0.24 }), perc('tom', 'o . .', { vel: 0.3 })], { rit: 0.08 }),
    ],
  };
})();

const winter = (() => {
  const cA = '1 | 6 | 3 | 7 | 1 | 6 | 7 | 1o';
  const A = "5 - - 3 | 3 - 1 - | 5 - - 7 | 7 - 2 - | 1' - - 5 | 6 - 3 - | 4 - 2 - | 1 - - -";
  const harp = arp('harp', '0 . 2 . 3 . 2 .', { oct: -1, vel: 0.36 });
  return {
    id: 'village_winter', kind: 'mood', gain: 0.98, plays: 1, name: '눈 덮인 밭', where: '에른 마을 · 겨울', bpm: 50, beats: 4, root: 64, scale: 'aeolian',
    sections: [
      sec(2, '1 | 6', [harp], { once: true }),
      sec(8, cA, [harp, mel('clarinet', A, { oct: -1, vel: 0.5 })]),
      sec(8, cA, [harp, mel('clarinet', A, { oct: -1, vel: 0.5 }), strs({ reg: 59, vel: 0.2 }), mel('harp', ". . . . | . . 5' - | . . . . | . . 4' - | . . . . | . . 3' - | . . . . | . . 5' -", { vel: 0.3, flat: true })]),
      sec(4, '6 | 7 | 6 | 5', [harp, strs({ reg: 59, vel: 0.24 }), mel('cello', "1 - 3 - | 2 - 7, - | 1 - 6, - | 7, - - -", { oct: 0, vel: 0.46 })]),
      sec(8, cA, [harp, strs({ reg: 59, vel: 0.22 }), mel('cello', A, { oct: -1, vel: 0.5 }), mel('clarinet', "3 - - - | 1 - - - | 3 - - - | 2 - - - | 3 - - - | 1 - - - | 2 - - - | 1 - - -", { oct: 0, vel: 0.3 })], { rit: 0.09 }),
    ],
  };
})();

const fields = (() => {
  const cA = '1 | 1 | 7 | 4 | 1 | 3 | 7 | 1', cB = '4 | 1 | 4 | 5 | 4 | 3 | 7 | 1';
  const A = "1 - 2 3 5 - 3 - | 5 - 3 1 - - 5, - | 7, - 2 4 2 - 7, - | 6, - 1 4 - - . . | 1 - 2 3 5 - 1' - | 7 - 5 3 - - 5 - | 4 - 2 7, - 2 - | 1 - - - - - . .";
  const B = "6 - - 4 6 - 1' - | 5 - 3 1 - - 3 - | 4 - 6 1' - 6 4 - | 5 - - 2 - - . . | 6 - - 4 6 - 1' - | 7 - 5 3 - 5 7 - | 2' - 7 4 - 2 7, - | 1 - - - - - . .";
  const st = strum('D . d u . u d u', { oct: -1, vel: 0.34 });
  const pz = bass('pizz', 'r - - - 5 - - -', { oct: -1, vel: 0.5 });
  const wd = perc('wood', '. . x . . . x .', { vel: 0.4 });
  return {
    id: 'ern_fields', kind: 'mood', gain: 1.17, plays: 2, name: '밭두렁 길', where: '에른 마을 · 봄부터 가을', bpm: 88, beats: 4, root: 57, scale: 'dorian', coda: ['lute', null],
    sections: [
      sec(2, '1 | 1', [st, pz], { once: true }),
      sec(8, cA, [st, pz, mel('recorder', A, { oct: 1, vel: 0.5, on: even }), mel('oboe', A, { oct: 1, vel: 0.44, on: odd })]),
      sec(8, cB, [st, pz, wd, mel('clarinet', B, { vel: 0.62 })]),
      sec(8, cA, [st, pz, wd, perc('tom', 'x . . . o . . .', { vel: 0.3 }), mel('recorder', A, { oct: 1, vel: 0.5 }), under('clarinet', A, { oct: 1, vel: 0.34 })]),
    ],
  };
})();

const dusk = (() => {
  const cA = '1 | 1 | 6 | 7 | 1 | 4 | 5 | 1o';
  const A = "1 - 3 | 5 - - | 6 - 3 | 2 - - | 1 - 3 | 4 - 6 | 5 - 2 | 1 - -";
  const low = bass('lute', 'r - 5', { oct: -1, vel: 0.44, legato: 1.6 });
  const toll = mel('bell', '1 - - | . | . | . | . | . | . | .', { oct: 1, vel: 0.24, flat: true });
  return {
    id: 'ern_dusk', kind: 'mood', gain: 1.26, plays: 1, name: '저녁 종', where: '에른 마을 · 사계절', bpm: 56, beats: 3, root: 57, scale: 'aeolian', coda: ['lute', 'strings'],
    sections: [
      sec(2, '1 | 1', [low, mel('bell', '1 - - | .', { oct: 1, vel: 0.24, flat: true })], { once: true }),
      sec(8, cA, [low, mel('lute', A, { oct: 1, vel: 0.8, legato: 1.5 })]),
      sec(8, cA, [low, toll, mel('lute', A, { oct: 1, vel: 0.8, legato: 1.5 }), mel('cello', "1 - - | 3 - - | 1 - - | 7, - - | 1 - - | 1 - - | 7, - - | 1 - -", { oct: 0, vel: 0.26 })]),
      sec(8, '6 | 3 | 6 | 7 | 6 | 3 | 4 | 5', [low, strs({ reg: 57, vel: 0.2, low: false }), mel('cello', "1 - 3 | 5 - 3 | 6 - 3 | 4 - 2 | 1 - 6, | 7, - 3 | 1 - 6, | 7, - -", { oct: 0, vel: 0.5 })]),
      sec(8, cA, [low, toll, strs({ reg: 57, vel: 0.15, low: false }), mel('lute', A, { oct: 1, vel: 0.78, legato: 1.5 })], { rit: 0.09 }),
    ],
  };
})();

/* ---------- 도시와 길 ---------- */
const town = (() => {
  const cA = '1 | 4 | 1 | 7 | 1 | 4 | 7 | 1', cB = '3 | 7 | 3 | 4 | 3 | 7 | 4 | 5';
  const A = "5 - 5 6 5 - 3 - | 4 - 6 1' 6 - 4 - | 5 - 3 1 3 - 5 - | 4 - 2 7, 2 - - - | 5 - 5 6 5 - 1' - | 1' - 6 4 6 - 1' - | 7 - 5 4 2 - 4 - | 1 - - - . . . .";
  const B = "7 - 5 3 5 - 7 - | 2' - 7 4 - - 2 - | 3 - 5 7 5 - 7 - | 1' - 6 4 - - . . | 7 - 5 3 5 - 7 - | 2' - 4' 2' 7 - 4 - | 6 - 4 1 4 - 6 - | 5 - - - 2 - - -";
  const st = strum('D . d u d . d u', { oct: -1, vel: 0.34 });
  const pz = bass('pizz', 'r - . r 5 - . 5', { oct: -2, vel: 0.52 });
  const drum = perc('tom', 'x . . o x . o .', { vel: 0.34 });
  const wd = perc('wood', '. . x . . . x x', { vel: 0.36 });
  return {
    id: 'town', kind: 'mood', gain: 1.02, plays: 1, name: '하르펜 성벽 아래', where: '하르펜 (교역 도시)', bpm: 100, beats: 4, root: 62, scale: 'dorian', coda: ['lute', null],
    sections: [
      sec(2, '1 | 1', [st, pz, drum], { once: true }),
      sec(8, cA, [st, pz, drum, mel('recorder', A, { vel: 0.5 })]),
      sec(8, cA, [st, pz, drum, wd, mel('recorder', A, { vel: 0.5 }), mel('clarinet', A, { oct: -1, vel: 0.36 })]),
      sec(8, cB, [st, pz, drum, mel('clarinet', B, { oct: -1, vel: 0.62 }), chop('pizz', '. . x . . . x .', { reg: 62, vel: 0.36 })]),
      sec(8, cA, [st, pz, drum, wd, mel('recorder', A, { vel: 0.5 }), under('clarinet', A, { vel: 0.36 }), chop('pizz', '. . x . . . x .', { reg: 62, vel: 0.34 })]),
    ],
  };
})();

const market = (() => {
  const cA = '1 | 7 | 1 | 4 | 1 | 7 | 5 | 1', cB = '3 | 4 | 3 | 7 | 3 | 4 | 5 | 5';
  const A = "1 - 3 5 - 3 | 2 - 4 7, - 2 | 3 - 5 1' - 5 | 6 - 4 1 - - | 1 - 3 5 - 1' | 2' - 7 4 - 2 | 5 - 7 2 - 7, | 1 - - - - .";
  const B = "5 - 7 5 - 3 | 6 - 4 1 - 4 | 7 - 5 3 - 5 | 4 - 2 7, - - | 5 - 7 3' - 7 | 1' - 6 4 - 6 | 7 - 5 2 - 5 | 7, - - 2 - -";
  const lute = arp('lute', '0 2 3 0 2 3', { oct: 0, vel: 0.46 });
  const pz = bass('pizz', 'r - - 5 - -', { oct: -1, vel: 0.52 });
  const drum = perc('tom', 'x . o x . .', { vel: 0.34 });
  return {
    id: 'market', kind: 'mood', gain: 1.11, plays: 2, name: '은저울 상단', where: '하르펜 · 장터', bpm: 66, beats: 2, root: 55, scale: 'dorian', coda: ['lute', null],
    sections: [
      sec(2, '1 | 1', [lute, pz], { once: true }),
      sec(8, cA, [lute, pz, drum, mel('clarinet', A, { oct: 1, vel: 0.5, on: even }), mel('oboe', A, { oct: 1, vel: 0.44, on: odd })]),
      sec(8, cB, [lute, pz, drum, perc('wood', '. . . x . .', { vel: 0.36 }), mel('oboe', B, { oct: 1, vel: 0.44 })]),
      sec(8, cA, [lute, pz, drum, perc('wood', '. . . x . x', { vel: 0.36 }), mel('clarinet', A, { oct: 1, vel: 0.5 }), mel('recorder', A, { oct: 2, vel: 0.3 }), mel('bassoon', "1 - - - - - | 7, - - - - - | 1 - - - - - | 4, - - - - - | 1 - - - - - | 7, - - - - - | 5, - - - - - | 1 - - - - -", { oct: 0, vel: 0.36 })]),
    ],
  };
})();

const castle = (() => {
  const cA = '1 | 6 | 7 | 3 | 1 | 6 | 7 | 1o', cB = '6 | 3 | 4 | 1 | 6 | 3 | 7 | 5M';
  const A = "1 - - 5 | 3 - 1 - | 2 - - 4 | 5 - - - | 1' - - 5 | 6 - 3 - | 4 - 2 - | 1 - - -";
  const B = "1' - 6 - | 7 - 5 - | 6 - 4 1 | 3 - - - | 1' - 3' - | 3' - 7 - | 2' - 4 - | 5 - - -";
  const harp = arp('harp', '0 . 2 . 3 . 2 .', { oct: -1, vel: 0.36 });
  const tp = perc('timp', 'x . . . . . . o', { vel: 0.3 });
  return {
    id: 'castle', kind: 'mood', gain: 0.85, plays: 1, name: '베르덴 성채', where: '베르덴 (백작령 성읍)', bpm: 72, beats: 4, root: 62, scale: 'aeolian',
    sections: [
      sec(2, '1o | 1o', [harp, strs({ vel: 0.22 })], { once: true }),
      sec(8, cA, [harp, strs({ vel: 0.24 }), mel('horn', A, { oct: -1, vel: 0.56 })]),
      sec(8, cA, [harp, strs({ vel: 0.28 }), tp, mel('horn', A, { oct: -1, vel: 0.56 }), mel('cello', "3 - - - | 1 - - - | 7, - - - | 7, - - 2 | 3 - - - | 1 - - - | 2 - 7, - | 1 - - -", { oct: -1, vel: 0.4 })]),
      sec(8, cB, [harp, strs({ vel: 0.26 }), mel('oboe', B, { vel: 0.44 }), bass('bass', 'r - - -', { oct: -2, vel: 0.44 })]),
      sec(8, cA, [harp, strs({ vel: 0.34 }), tp, mel('horn', A, { oct: -1, vel: 0.6 }), mel('trumpet', A, { oct: 0, vel: 0.3 }), bass('bass', 'r - - -', { oct: -2, vel: 0.46 })], { rit: 0.08 }),
    ],
  };
})();

const capital = (() => {
  const cA = '1 | 4 | 7 | 1 | 6 | 4 | 7 | 1', cB = '6 | 4 | 1 | 5 | 6 | 4 | 7 | 7';
  const A = "1 - - 3 | 4 - 6 - | 7 - - 2' | 1' - 5 - | 6 - - 1' | 6 - 4 - | 4 - 2 7, | 1 - - -";
  const B = "3 - 1 - | 1 - 6, - | 5 - 3 1 | 2 - - - | 3 - 6 - | 6 - 4 - | 4 - 2 - | 7, - 2 -";
  const harp = pad('harp', { reg: 53, vel: 0.36, roll: 0.05, low: true });
  const tp = perc('timp', 'x . . . o . . .', { vel: 0.3 });
  return {
    id: 'capital', kind: 'mood', gain: 0.9, plays: 1, name: '백색 성', where: '왕도 레오카스트', bpm: 66, beats: 4, root: 65, scale: 'mixolydian',
    sections: [
      sec(2, '1 | 4', [harp, strs({ reg: 60, vel: 0.24 })], { once: true }),
      sec(8, cA, [harp, strs({ reg: 60, vel: 0.26 }), mel('horn', A, { oct: -1, vel: 0.56 })]),
      sec(8, cB, [harp, strs({ reg: 60, vel: 0.26 }), mel('oboe', B, { oct: 1, vel: 0.42 }), mel('cello', "6, - - - | 4, - - - | 5, - - - | 5, - 7, - | 6, - - - | 4, - - - | 7, - - - | 7, - - -", { oct: 0, vel: 0.28 })]),
      sec(8, cA, [harp, strs({ reg: 60, vel: 0.36, top: true }), tp, mel('trumpet', A, { oct: 0, vel: 0.44 }), mel('horn', A, { oct: -1, vel: 0.52 }), pad('choir', { reg: 62, vel: 0.24 }), bass('bass', 'r - - -', { oct: -2, vel: 0.46 })]),
      sec(4, '1 | 4 | 7 | 1', [harp, strs({ reg: 60, vel: 0.26, cresc: [1, 0.6] }), mel('horn', "5 - - - | 6 - - - | 4 - - 2 | 3 - - -", { oct: -1, vel: 0.44 })], { rit: 0.1 }),
    ],
  };
})();

const road = (() => {
  const cA = '1 | 3 | 7 | 4 | 1 | 3 | 7 | 1', cB = '4 | 1 | 4 | 5 | 4 | 3 | 7 | 5';
  const A = "5 - - 3 5 - 7 - | 7 - 5 - 3 - - - | 4 - - 2 4 - 7 - | 6 - 4 - 1 - - - | 5 - - 3 5 - 1' - | 7 - - 5 3 - 5 - | 2' - 7 - 4 - 2 - | 1 - - - - - . .";
  const B = "6 - - 4 1 - 4 - | 5 - 3 - 1 - - - | 6 - - 1' 6 - 4 - | 5 - - - 2 - - - | 6 - - 4 6 - 1' - | 7 - 5 - 3 - 5 - | 4 - 2 - 7, - 2 - | 5, - - - - - . .";
  const lute = arp('lute', '0 2 3 2 4 2 3 2', { oct: -1, vel: 0.46 });
  const walk = bass('pizz', 'r - 5 - 8 - 5 -', { oct: -1, vel: 0.46 });
  return {
    id: 'road', kind: 'mood', gain: 1.03, plays: 2, name: '먼 길', where: '길 위 (여행·이사)', bpm: 92, beats: 4, root: 57, scale: 'dorian', coda: ['lute', 'strings'],
    sections: [
      sec(2, '1 | 1', [lute, walk], { once: true }),
      sec(8, cA, [lute, walk, mel('flute', A, { oct: 1, vel: 0.46, on: even }), mel('recorder', A, { oct: 1, vel: 0.5, on: odd })]),
      sec(8, cB, [lute, walk, mel('cello', B, { oct: 0, vel: 0.52 }), strs({ reg: 57, low: false, vel: 0.2 })]),
      sec(8, cA, [lute, walk, perc('tom', 'x . . . . . o .', { vel: 0.3 }), mel('flute', A, { oct: 1, vel: 0.46 }), under('cello', A, { oct: 0, vel: 0.36 }), strs({ reg: 57, low: false, vel: 0.22 })]),
    ],
  };
})();

const hardship = (() => {
  const cA = '1 | 4 | 1 | 5 | 6 | 4 | 5 | 1o';
  const A = "1 - 3 | 4 - - | 3 - 1 | 2 - - | 3 - 6 | 6 - 4 | 2 - 5 | 1 - -";
  const low = drone('strings', '1', { oct: -1, vel: 0.34 });
  return {
    id: 'hardship', kind: 'mood', gain: 0.93, plays: 1, name: '흉년', where: '기근 · 역병이 든 때', bpm: 52, beats: 3, root: 52, scale: 'aeolian', coda: [null, 'strings'],
    sections: [
      sec(2, '1o | 1o', [low, pad('strings', { reg: 52, vel: 0.2, open: true })], { once: true }),
      sec(8, cA, [low, mel('cello', A, { oct: 0, vel: 0.58 })]),
      sec(8, cA, [strs({ reg: 52, vel: 0.24 }), mel('cello', A, { oct: 0, vel: 0.58 }), mel('bassoon', "5 - - | 6 - - | 5 - - | 5 - - | 1' - - | 1' - - | 7 - - | 5 - -", { oct: -1, vel: 0.36 })]),
      sec(8, '6 | 3 | 4 | 1 | 6 | 3 | 4 | 5', [strs({ reg: 52, vel: 0.26 }), mel('clarinet', "1' - 6 | 7 - 5 | 6 - 4 | 5 - 3 | 3 - 6 | 5 - 7 | 6 - 4 | 2 - -", { oct: 0, vel: 0.44 })]),
      sec(8, cA, [low, strs({ reg: 52, vel: 0.22 }), mel('cello', A, { oct: 0, vel: 0.54 })], { rit: 0.1 }),
    ],
  };
})();

/* ---------- 상황 곡: 싸움과 위험 ---------- */
const dungeon = (() => {
  const cA = '1o | 1o | 2 | 1o | 1o | 7 | 2 | 1o';
  const low = drone('strings', '1', { oct: -1, vel: 0.4 });
  const mist = pad('trem', { reg: 50, open: true, vel: 0.2 });
  const drip = now_and_then(({ rnd }) => [{ perc: rnd() < 0.5 ? 'wood' : 'wood2', beat: Math.floor(rnd() * 8) / 2, vel: 0.2 + rnd() * 0.2 }], 2.5, ['wood']);
  return {
    id: 'dungeon', kind: 'cue', gain: 1.0, name: '회색 굴', where: '미궁', bpm: 48, beats: 4, root: 50, scale: 'phrygian',
    sections: [
      sec(2, '1o | 1o', [low, mist], { once: true }),
      sec(8, cA, [low, mist, drip, mel('bassoon', "1 - - 2 | 1 - - - | 4 - 2 - | 1 - - - | 5 - - 6 | 4 - 2 - | 6 - 4 2 | 1 - - -", { oct: 0, vel: 0.46 }),
        mel('harp', ". . . . | . . 5 - | . . . . | . . 1' - | . . . . | . . 4 - | . . . . | . . 5 -", { oct: 1, vel: 0.3, flat: true })]),
      sec(4, '6 | 7 | 6 | 2', [low, pad('trem', { reg: 50, vel: 0.24 }), drip, mel('clarinet', "1 - 3 - | 2 - 7, - | 1 - 6, - | 2 - - -", { oct: 1, vel: 0.4 })]),
      sec(8, cA, [low, mist, drip, mel('bassoon', "1 - - 2 | 1 - - - | 4 - 2 - | 1 - - - | 5 - - 6 | 4 - 2 - | 6 - 4 2 | 1 - - -", { oct: 0, vel: 0.46 }),
        mel('cello', "5 - - - | 5 - - 4 | 6 - - - | 5 - - - | 1' - - - | 7 - - - | 6 - - - | 5 - - -", { oct: 0, vel: 0.34 }), perc('taiko', 'o . . . . . . . | . . . . . . . .', { vel: 0.4 })]),
    ],
  };
})();

const underworld = (() => {
  const cA = '1 | 1 | 4 | 5M | 1 | 6 | 4 5M | 1';
  const A = "1 - . 3 - 2 1 - | 5, - . 1 - - . . | 4 - . 6 - 5 4 - | 2 - . #7, - - . . | 1 - . 3 - 5 1' - | 6 - . 3 - 1 . . | 4 - 6 - 2 - #7, - | 1 - - - . . . .";
  const pz = bass('pizz', 'r . . r . 5 . .', { oct: -1, vel: 0.6 });
  const wd = perc('wood', '. . x . . . x .', { vel: 0.4 });
  const stab = chop('pizz', '. . . . x . . .', { reg: 60, vel: 0.36 });
  return {
    id: 'underworld', kind: 'cue', gain: 1.15, name: '검은 장갑', where: '뒷골목 · 범죄 조직', bpm: 80, beats: 4, root: 48, scale: 'aeolian',
    sections: [
      sec(2, '1 | 1', [pz, wd], { once: true }),
      sec(8, cA, [pz, wd, stab, mel('clarinet', A, { oct: 1, vel: 0.5 })]),
      sec(4, '6 | 6 | 7 | 5M', [pz, wd, mel('bassoon', "1 - 3 - 6 - 3 - | 1 - - - . . . . | 2 - 4 - 7 - 4 - | 2 - - - #7, - - -", { oct: 0, vel: 0.5 }), pad('strings', { reg: 55, vel: 0.2 })]),
      sec(8, cA, [pz, wd, stab, mel('clarinet', A, { oct: 1, vel: 0.5 }), mel('bassoon', "1 - - - - - - - | 1 - - - - - - - | 4, - - - - - - - | 5, - - - - - - - | 1 - - - - - - - | 6, - - - - - - - | 4, - - - 5, - - - | 1 - - - - - - -", { oct: 0, vel: 0.28 }), perc('tom', '. . . . . . . o', { vel: 0.3 })]),
    ],
  };
})();

const battle = (() => {
  const cA = '1 | 1 | 6 | 7 | 1 | 1 | 6 | 5M', cB = '4 | 4 | 1 | 1 | 4 | 4 | 5M | 5M';
  const A = "1 - - - 5 - - - | 3 - 2 - 1 - - - | 6 - - - 1' - - - | 7 - - 5 2 - - - | 1 - - - 5 - - - | 3 - 4 - 5 - - - | 6 - - 5 3 - 1 - | 2 - - - #7, - - -";
  const B = "4 - - - 6 - - - | 1' - - - 6 - - - | 5 - - - 3 - - - | 1 - - - - - . . | 4 - - - 6 - - - | 1' - - - 4' - - - | 2' - - - #7 - - - | 5 - - - - - . .";
  const drive = chop('spic', 'X . x x X . x x', { reg: 50, low: true, vel: 0.44 });
  const big = perc('taiko', 'X . . x . . X .', { vel: 0.62 });
  const tm = perc('tom', '. . x . . x . x', { vel: 0.46 });
  const lowb = bass('bass', 'r - - - r - - -', { oct: -1, vel: 0.56 });
  return {
    id: 'battle', kind: 'cue', gain: 0.75, name: '칼을 뽑다', where: '전투', bpm: 132, beats: 4, root: 50, scale: 'aeolian',
    sections: [
      sec(2, '1 | 1', [drive, big], { once: true }),
      sec(8, cA, [drive, big, tm, lowb, mel('horn', A, { oct: 0, vel: 0.74 }), mel('trombone', A, { oct: -1, vel: 0.6 })]),
      sec(8, cB, [drive, big, tm, lowb, mel('strings', B, { oct: 1, vel: 0.95 }), mel('strings', B, { oct: 0, vel: 0.8 }), mel('horn', B, { oct: 0, vel: 0.6 }), perc('timp', 'X . . . . . . . | . . . . . . . .', { vel: 0.6 })]),
      sec(8, cA, [drive, big, tm, lowb, mel('horn', A, { oct: 0, vel: 0.74 }), mel('trumpet', A, { oct: 1, vel: 0.6 }), mel('trombone', A, { oct: -1, vel: 0.6 }), pad('strings', { reg: 62, vel: 0.26 })]),
    ],
  };
})();

const boss = (() => {
  const cA = '1o | 2 | 1o | 7 | 1o | 2 | 7 | 1o', cB = '6 | 7 | 6 | 2 | 6 | 7 | 2 | 2';
  const A = "1 - - - | 2 - 4 - | 5 - - 4 | 4 - 2 - | 1 - - - | 4 - 2 - | 2 - 7, - | 1 - - -";
  const B = "3 - 1 - | 2 - 7, - | 1 - 3 6 | 4 - - - | 3 - 6 - | 7 - 4 - | 6 - 4 - | 2 - - -";
  const big = perc('taiko', 'X . . x . . X . | X . . x . x X .', { vel: 0.64 });
  const grind = chop('spic', 'x x . x x . x .', { reg: 52, low: true, vel: 0.46 });
  const lowb = bass('bass', 'r - - - - - r -', { oct: -1, vel: 0.56 });
  const voices = pad('choir', { reg: 57, open: true, vel: 0.34 });
  return {
    id: 'boss', kind: 'cue', gain: 0.85, name: '물러설 곳 없다', where: '숙적 · 강한 적', bpm: 92, beats: 4, root: 52, scale: 'phrygian',
    sections: [
      sec(2, '1o | 1o', [big, lowb, pad('trem', { reg: 52, open: true, vel: 0.3 })], { once: true }),
      sec(8, cA, [big, grind, lowb, voices, mel('trombone', A, { oct: 0, vel: 0.62 }), mel('horn', A, { oct: 0, vel: 0.5 })]),
      sec(8, cB, [big, grind, lowb, mel('strings', B, { oct: 1, vel: 0.95 }), mel('strings', B, { oct: 0, vel: 0.8 }), mel('horn', B, { oct: 0, vel: 0.6 }), perc('timp', 'X . . . . . . . | . . . . . . x x', { vel: 0.56 })]),
      sec(8, cA, [big, grind, lowb, voices, mel('trombone', A, { oct: 0, vel: 0.62 }), mel('trumpet', A, { oct: 1, vel: 0.44 }), pad('trem', { reg: 64, open: true, vel: 0.28 })]),
    ],
  };
})();

const duel = (() => {
  const cA = '1o | 1o | 2 | 1o | 1o | 7 | 2 | 1o';
  const A = "1 - - - | . . 5 - | 6 - 4 - | 5 - - - | 1' - - - | 7 - 4 - | 6 - 4 2 | 1 - - -";
  const pulse = perc('timp', 'x . . o . . . .', { vel: 0.44 });
  const low = drone('strings', '1', { oct: -1, vel: 0.36 });
  const pluck = chop('pizz', '. . x . . . . x', { reg: 57, open: true, vel: 0.4 });
  return {
    id: 'duel', kind: 'cue', gain: 0.82, name: '일대일', where: '결투', bpm: 72, beats: 4, root: 57, scale: 'phrygian',
    sections: [
      sec(2, '1o | 1o', [pulse, low], { once: true }),
      sec(8, cA, [pulse, low, pluck, mel('cello', A, { oct: -1, vel: 0.6 })]),
      sec(8, cA, [pulse, low, pluck, pad('trem', { reg: 57, open: true, vel: 0.26, cresc: [0.7, 1.3] }), mel('cello', A, { oct: -1, vel: 0.6 }), mel('horn', "5 - - - | 5 - - - | 4 - - - | 5 - - - | 5 - - - | 4 - - - | 4 - - - | 5 - - -", { oct: -1, vel: 0.36 }), perc('wood', '. . . . . . x .', { vel: 0.36 })]),
      sec(4, '6 | 7 | 6 | 2', [pulse, low, pad('trem', { reg: 57, vel: 0.3 }), mel('oboe', "3 - 1 - | 2 - 7, - | 1 - 3 - | 2 - - -", { oct: 1, vel: 0.4 }), perc('taiko', 'x . . . . . . .', { vel: 0.4 })]),
    ],
  };
})();

const war = (() => {
  const cA = '1 | 7 | 6 | 5M | 1 | 7 | 6 5M | 1o';
  const A = "1 - - 1 1 - 3 - | 2 - - 7, 2 - 4 - | 3 - - 1 6, - 1 - | 2 - - - #7, - - - | 5 - - 5 5 - 3 - | 4 - - 2 7, - 2 - | 3 - 1 - 2 - #7, - | 1 - - - - - . .";
  const march = perc('taiko', 'X . . . x . . .', { vel: 0.6 });
  const snare = perc('tom2', 'x . x x x . x x', { vel: 0.4 });
  const lowb = bass('bass', 'r - - - 5 - - -', { oct: -1, vel: 0.54 });
  const ranks = chop('spic', 'x . . x x . . x', { reg: 53, vel: 0.4 });
  return {
    id: 'war', kind: 'cue', gain: 1.05, name: '전열', where: '전쟁 · 군대를 이끌 때', bpm: 100, beats: 4, root: 50, scale: 'aeolian',
    sections: [
      sec(2, '1o | 1o', [march, snare], { once: true }),
      sec(8, cA, [march, snare, lowb, ranks, mel('trumpet', A, { oct: 1, vel: 0.5 })]),
      sec(4, '3 | 7 | 4 | 5M', [march, snare, lowb, pad('strings', { reg: 57, vel: 0.32 }), mel('horn', "5 - - - 7 - - - | 2' - - - 7 - - - | 6 - - - 4 - 1 - | 2 - - - - - . .", { oct: 0, vel: 0.56 })]),
      sec(8, cA, [march, snare, lowb, ranks, mel('trumpet', A, { oct: 1, vel: 0.5 }), mel('horn', A, { oct: 0, vel: 0.46 }), pad('trombone', { reg: 48, open: true, vel: 0.36 }), perc('timp', 'X . . . . . . . | . . . . . . . .', { vel: 0.56 })]),
    ],
  };
})();

const tense = (() => {
  const cA = '1o | 6 | 1o | 5M | 1o | 6 | 4 | 5M';
  const A = "5 - - 3 | 6 - - - | 5 - - 1 | 2 - - - | 5 - - 3 | 6 - 1' - | 6 - 4 - | #7 - - -";
  const shiver = pad('trem', { reg: 57, vel: 0.26 });
  const step = bass('pizz', 'r . . . r . . .', { oct: -1, vel: 0.5 });
  return {
    id: 'tense', kind: 'cue', gain: 0.98, name: '불길한 소식', where: '위험한 사건', bpm: 60, beats: 4, root: 57, scale: 'aeolian',
    sections: [
      sec(2, '1o | 1o', [shiver, step], { once: true }),
      sec(8, cA, [shiver, step, mel('clarinet', A, { oct: 0, vel: 0.46 })]),
      sec(8, cA, [shiver, step, mel('clarinet', A, { oct: 0, vel: 0.46 }), mel('bassoon', "1 - - - | 1 - - 3 | 1 - - - | 5, - - - | 1 - - - | 6, - - - | 4, - - - | 5, - - -", { oct: 0, vel: 0.3 }), perc('timp', 'o . . . . . . . | . . . . . . . .', { vel: 0.5 }), drone('strings', '1', { oct: -1, vel: 0.3 })]),
    ],
  };
})();

/* ---------- 상황 곡: 삶의 마디 ---------- */
const solemn = (() => {
  const cA = '1 | 5 | 6 | 3 | 4 | 1 | 5M | 1o';
  const A = "1 - - 3 | 2 - 7, - | 1 - - 6, | 7, - 5, - | 6, - 1 4 | 3 - 1 - | 2 - - #7, | 1 - - -";
  const st = strs({ reg: 57, vel: 0.3 });
  const toll = mel('bell', '1 - - - | . | . | .', { oct: 0, vel: 0.4, flat: true });
  return {
    id: 'solemn', kind: 'cue', gain: 0.87, name: '떠난 이를 위하여', where: '죽음 · 장례 · 삶의 끝', bpm: 46, beats: 4, root: 62, scale: 'aeolian',
    sections: [
      sec(2, '1o | 1o', [mel('bell', '1 - - - | .', { oct: 0, vel: 0.4, flat: true }), pad('strings', { reg: 57, open: true, vel: 0.22 })], { once: true }),
      sec(8, cA, [st, mel('cello', A, { oct: -1, vel: 0.62 })]),
      sec(4, '6 | 7 | 3 | 5M', [st, toll, mel('oboe', "1' - 6 - | 7 - 4 - | 5 - 3 - | 2 - - -", { oct: 0, vel: 0.42 })]),
      sec(8, cA, [strs({ reg: 57, vel: 0.34 }), toll, pad('choir', { reg: 60, vel: 0.28 }), mel('cello', A, { oct: -1, vel: 0.62 }), mel('strings', A, { oct: 1, vel: 0.3 })]),
    ],
  };
})();

const festive = (() => {
  const cA = '1 | 1 | 7 | 7 | 1 | 1 | 7 | 1', cB = '4 | 1 | 4 | 5 | 4 | 1 | 7 | 1';
  const A = "1 2 3 5 3 1 | 5 - 3 1 - - | 7, 1 2 4 2 7, | 4 - 2 7, - - | 1 2 3 5 3 1 | 5 - 1' 5 - 3 | 4 2 7, 2 4 2 | 1 - - 1 - -";
  const B = "6 - 4 6 - 1' | 5 - 3 5 - 1 | 6 - 4 6 - 1' | 7 - 5 2 - - | 6 - 4 6 - 1' | 5 3 1 3 5 1' | 7 5 4 2 4 7 | 1' - - 1 - -";
  const st = strum('D . u D . u', { oct: -1, vel: 0.36 });
  const drum = perc('tom', 'X . o x . o', { vel: 0.44 });
  const wd = perc('wood', '. . x . x .', { vel: 0.4 });
  const pz = bass('pizz', 'r - - 5 - -', { oct: -1, vel: 0.56 });
  return {
    id: 'festive', kind: 'cue', gain: 1.06, name: '수확제', where: '축제 · 혼례 · 잔치', bpm: 108, beats: 2, root: 57, scale: 'dorian',
    sections: [
      sec(2, '1 | 1', [st, drum], { once: true }),
      sec(8, cA, [st, drum, pz, mel('recorder', A, { oct: 1, vel: 0.54, legato: 0.85 })]),
      sec(8, cA, [st, drum, wd, pz, mel('recorder', A, { oct: 1, vel: 0.54, legato: 0.85 }), mel('oboe', A, { oct: 0, vel: 0.36, legato: 0.85 })]),
      sec(8, cB, [st, drum, wd, pz, mel('clarinet', B, { oct: 0, vel: 0.64, legato: 0.85 }), chop('pizz', 'x . . x . .', { reg: 64, vel: 0.36 })]),
      sec(8, cA, [st, drum, wd, pz, perc('taiko3', 'x . . . . .', { vel: 0.4 }), mel('recorder', A, { oct: 1, vel: 0.54, legato: 0.85 }), mel('clarinet', A, { oct: 0, vel: 0.4, legato: 0.85 }), chop('pizz', 'x . . x . .', { reg: 64, vel: 0.36 })]),
    ],
  };
})();

const mystic = (() => {
  const cA = '1 | 2 | 6 | 2 | 1 | 2 | 7 | 1';
  const A = "5 - - 3 | 4 - 6 - | 3 - - 1 | 2 - - - | 5 - - 1' | 6 - 4 - | 7 - 4 2 | 3 - - -";
  const harp = arp('harp', '0 2 4 5 6 5 4 2', { oct: -1, vel: 0.36 });
  const air = pad('choir', { reg: 62, vel: 0.2 });
  return {
    id: 'mystic', kind: 'cue', gain: 1.19, name: '마력의 숨', where: '마법 · 신비한 사건', bpm: 54, beats: 4, root: 60, scale: 'lydian',
    sections: [
      sec(2, '1 | 2', [harp], { once: true }),
      sec(8, cA, [harp, air, mel('glock', A, { oct: 1, vel: 0.62 })]),
      sec(8, cA, [harp, air, pad('trem', { reg: 67, vel: 0.18 }), mel('flute', A, { oct: 1, vel: 0.38 }), mel('glock', ". . 1' - | . . . . | . . 6 - | . . . . | . . 3' - | . . . . | . . 2' - | . . . .", { oct: 1, vel: 0.36, flat: true }), bass('harp', 'r - - -', { oct: -2, vel: 0.44 })]),
    ],
  };
})();

const court = (() => {
  const cA = '1 | 7 | 3 | 4 | 1 | 7 | 5 | 1', cB = '3 | 7 | 4 | 1 | 3 | 7 | 4 | 5';
  const A = "5 - 1' | 7 - 4 | 5 - 7 | 6 - 4 | 3 - 5 | 4 2 7, | 2 - 5 | 1 - -";
  const B = "3 - 5 | 2 - 4 | 1 - 4 | 3 - 1 | 5 - 7 | 4 - 2 | 6 - 4 | 5 - -";
  const harp = arp('harp', '0 2 3 4 3 2', { oct: 0, vel: 0.4 });
  const pz = bass('pizz', 'r - -', { oct: -1, vel: 0.5 });
  return {
    id: 'court', kind: 'cue', gain: 1.07, name: '영주의 방', where: '영지 · 작위 · 다스리기', bpm: 72, beats: 3, root: 55, scale: 'dorian',
    sections: [
      sec(2, '1 | 7', [harp, pz], { once: true }),
      sec(8, cA, [harp, pz, mel('oboe', A, { oct: 1, vel: 0.46 })]),
      sec(8, cB, [harp, pz, mel('clarinet', B, { oct: 1, vel: 0.46 }), strs({ reg: 58, low: false, vel: 0.22 })]),
      sec(8, cA, [harp, pz, mel('oboe', A, { oct: 1, vel: 0.46 }), mel('cello', "3 - - | 2 - - | 3 - - | 4 - - | 1 - - | 2 - - | 2 - - | 1 - -", { oct: 0, vel: 0.4 }), strs({ reg: 58, low: false, vel: 0.24 })]),
    ],
  };
})();

const palace = (() => {
  const cA = '1 | 1 | 4 | 5M | 6 | 4 | 5M | 1';
  const A = "1 - - 3 5 - 3 - | #7, - - 1 - - . . | 4 - - 6 1' - 6 - | 2 - - #7, - - . . | 1' - - 6 3 - 6 - | 6 - - 4 1 - 4 - | 2 - #7, - 2 - 5 - | 1 - - - . . . .";
  const web = arp('pizz', '0 . 2 . 3 . 2 .', { oct: 0, vel: 0.4 });
  const pz = bass('pizz', 'r - - - . . 5 -', { oct: -1, vel: 0.5 });
  return {
    id: 'palace', kind: 'cue', gain: 1.23, name: '가면 아래', where: '궁정 · 관직 · 음모', bpm: 76, beats: 4, root: 57, scale: 'aeolian',
    sections: [
      sec(2, '1 | 1', [web, pz], { once: true }),
      sec(8, cA, [web, pz, mel('clarinet', A, { oct: 0, vel: 0.5 })]),
      sec(4, '6 | 3 | 4 | 5M', [web, pz, mel('oboe', "3 - 1 - 6 - - - | 5 - 3 - 7 - - - | 6 - 4 - 1 - - - | 2 - - - #7, - - -", { oct: 1, vel: 0.4 }), mel('bassoon', "6, - - - - - - - | 3 - - - - - - - | 4 - - - - - - - | 5 - - - - - - -", { oct: -1, vel: 0.3 })]),
      sec(8, cA, [web, pz, mel('clarinet', A, { oct: 0, vel: 0.5 }), pad('harp', { reg: 64, vel: 0.3, roll: 0.045 }), pad('strings', { reg: 57, vel: 0.2 })]),
    ],
  };
})();

const abyss = (() => {
  const cA = '1o | 1o 2 | 2 | 1o | 1o | 7 | 2 | 1o';
  const A = "1 - - - | 1 - 2 - | 2 - 4 2 | 1 - - - | 5 - - 4 | 4 - 2 - | 4 - 2 - | 1 - - -";
  const low = drone('organ', '1', { oct: -1, vel: 0.3 });
  const voices = pad('choir', { reg: 52, open: true, vel: 0.3 });
  const far = perc('taiko', 'x . . . . . . . | . . . . . o . .', { vel: 0.44 });
  return {
    id: 'abyss', kind: 'cue', gain: 0.92, name: '깊은 구렁', where: '깊은 구렁 · 구렁의 옥좌', bpm: 44, beats: 4, root: 45, scale: 'phrygian',
    sections: [
      sec(2, '1o | 1o', [low, far], { once: true }),
      sec(8, cA, [low, voices, far, mel('trombone', A, { oct: 0, vel: 0.5 })]),
      sec(8, cA, [low, voices, far, pad('trem', { reg: 57, open: true, vel: 0.22 }), mel('trombone', A, { oct: 0, vel: 0.5 }), mel('horn', A, { oct: 1, vel: 0.32 }), mel('bell', '. | . | . | 1 - - - | . | . | . | 1 - - -', { oct: 1, vel: 0.3, flat: true })]),
    ],
  };
})();

/* ---------- 먼 고장들 ---------- */
const isles = (() => {
  const cA = '1 | 7 | 4 | 1 | 1 | 5 | 4 | 1', cB = '6 | 4 | 6 | 5 | 6 | 4 | 7 | 5';
  const A = "5 - - 3 - 5 | 4 - - 2 - 7, | 1 - 4 6 - 4 | 5 - - 3 - - | 1' - - 5 - 3 | 2 - 5 7 - 5 | 6 - 4 1 - 2 | 1 - - - - -";
  const B = "3 - - 1 - 3 | 4 - - 6 - 4 | 3 - - 6 - 1' | 7 - - 5 - - | 1' - - 6 - 3 | 4 - - 1 - 4 | 4 - - 2 - 7, | 2 - - - - -";
  const lute = arp('lute', '0 2 3 4 3 2', { oct: -1, vel: 0.46 });
  const swell = strs({ reg: 57, vel: 0.22 });
  return {
    id: 'isles', kind: 'mood', gain: 0.93, plays: 2, name: '소금 바람', where: '남해 군도 (섬과 항구)', bpm: 52, beats: 2, root: 57, scale: 'mixolydian', coda: ['lute', 'strings'],
    sections: [
      sec(2, '1 | 7', [lute], { once: true }),
      sec(8, cA, [lute, mel('oboe', A, { oct: 1, vel: 0.46, on: even }), mel('flute', A, { oct: 1, vel: 0.44, on: odd })]),
      sec(8, cB, [lute, swell, mel('cello', B, { oct: 0, vel: 0.52 })]),
      sec(8, cA, [lute, swell, bass('pizz', 'r - - - - -', { oct: -1, vel: 0.44 }), mel('oboe', A, { oct: 1, vel: 0.46 }), mel('clarinet', "3 - - - - - | 2 - - - - - | 1 - - - - - | 1 - - 1 - - | 3 - - - - - | 2 - - - - - | 1 - - - - - | 5, - - - - -", { oct: 1, vel: 0.32 })], { rit: 0.08 }),
    ],
  };
})();

const elfwood = (() => {
  const cA = '1 | 2 | 1 | 6 | 1 | 2 | 5 | 1', cB = '6 | 3 | 6 | 2 | 6 | 3 | 2 | 5';
  const A = "5 - - - 3 - 5 - | 6 - - - 4 - 2 - | 3 - - 5 1' - 7 - | 6 - - - 3 - - - | 5 - - - 3 - 1' - | 2' - - 6 4 - 6 - | 7 - - 5 2 - 5 - | 3 - - - - - . .";
  const B = "1 - 3 - 6 - - - | 7 - 5 - 3 - - - | 6 - 1' - 3' - 1' - | 2' - - - 6 - - - | 1' - - - 6 - 3 - | 5 - - - 7 - 5 - | 4 - 6 - 2' - 6 - | 7 - - - 5 - - -";
  const harp = arp('harp', '0 2 3 4 5 4 3 2', { oct: -1, vel: 0.38 });
  const dew = now_and_then(({ rnd, deg }) => [{ inst: 'glock', midi: deg(['1', '3', '5', '6'][Math.floor(rnd() * 4)]) + 12, beat: Math.floor(rnd() * 8) / 2, dur: 1, vel: 0.2 + rnd() * 0.14 }], 2, ['glock']);
  return {
    id: 'elfwood', kind: 'mood', gain: 1.03, plays: 1, name: '세계수 아래', where: '대삼림 · 엘프의 땅', bpm: 54, beats: 4, root: 64, scale: 'lydian',
    sections: [
      sec(2, '1 | 2', [harp, dew], { once: true }),
      sec(8, cA, [harp, dew, mel('flute', A, { oct: 0, vel: 0.46 })]),
      sec(8, cB, [harp, dew, pad('choir', { reg: 62, vel: 0.22 }), mel('clarinet', B, { oct: 0, vel: 0.44 })]),
      sec(8, cA, [harp, dew, pad('choir', { reg: 62, vel: 0.22 }), strs({ reg: 59, vel: 0.2 }), mel('flute', A, { oct: 0, vel: 0.46 }), mel('cello', "3 - - - - - - - | 2 - - - - - - - | 1 - - - - - - - | 1 - - - - - - - | 3 - - - - - - - | 4 - - - - - - - | 2 - - - - - - - | 1 - - - - - - -", { oct: 0, vel: 0.36 })], { rit: 0.08 }),
    ],
  };
})();

const dwarfhall = (() => {
  const cA = '1 | 4 | 1 | 7 | 1 | 4 | 7 | 1o', cB = '3 | 7 | 4 | 5 | 3 | 7 | 4 | 1o';
  const A = "1 - - 3 | 4 - - 1 | 5 - 3 1 | 2 - - - | 5 - - 3 | 4 - 6 - | 4 - 2 7, | 1 - - -";
  const B = "5 - 7 - | 4 - 2 - | 6 - 4 - | 5 - - - | 7 - 5 - | 2' - 7 - | 1' - 6 - | 5 - - -";
  const hammer = perc('wood', '. . x . . . x . | . . x . . x x .', { vel: 0.4 });
  const stamp = perc('taiko2', 'x . . . . . . .', { vel: 0.44 });
  const lowb = bass('bass', 'r - - - 5 - - -', { oct: -1, vel: 0.5 });
  return {
    id: 'dwarfhall', kind: 'mood', gain: 0.88, plays: 1, name: '깊은 화로', where: '천룡 산맥 · 드워프의 땅', bpm: 72, beats: 4, root: 48, scale: 'dorian', coda: [null, 'horn'],
    sections: [
      sec(2, '1o | 1o', [hammer, stamp, lowb], { once: true }),
      sec(8, cA, [hammer, stamp, lowb, mel('horn', A, { oct: 0, vel: 0.58 })]),
      sec(8, cA, [hammer, stamp, lowb, mel('horn', A, { oct: 0, vel: 0.58 }), mel('trombone', "5, - - - | 6, - - - | 5, - - - | 7, - - - | 3 - - - | 1 - - - | 7, - - - | 5, - - -", { oct: 0, vel: 0.44 }), pad('choir', { reg: 52, open: true, vel: 0.24 })]),
      sec(8, cB, [stamp, lowb, pad('strings', { reg: 52, vel: 0.26 }), mel('trombone', B, { oct: 0, vel: 0.54 }), mel('bassoon', B, { oct: 0, vel: 0.36 })]),
      sec(8, cA, [hammer, stamp, lowb, pad('choir', { reg: 52, open: true, vel: 0.28 }), pad('strings', { reg: 52, vel: 0.24 }), mel('horn', A, { oct: 0, vel: 0.6 }), mel('trumpet', A, { oct: 1, vel: 0.3 })], { rit: 0.07 }),
    ],
  };
})();

const magetower = (() => {
  const cA = '1 | 4 | 1 | 7 | 3 | 4 | 5 | 1o', cB = '3 | 7 | 4 | 1 | 3 | 7 | 4 | 5';
  const A = "5 - 3 | 6 - 4 | 5 - 1' | 7 - 4 | 7 - 5 | 6 - 1' | 7 5 2 | 1 - -";
  const B = "3' - 7 | 2' - 7 | 1' 6 4 | 5 - - | 3' - 5' | 4' - 2' | 1' - 6 | 7 - -";
  const harp = arp('harp', '0 2 3 4 3 2', { oct: -1, vel: 0.38 });
  const stars = mel('glock', "5' - - | . . . | . . 3' | . . . | 5' - - | . . . | . . 2' | . . .", { vel: 0.3, flat: true });
  return {
    id: 'magetower', kind: 'mood', gain: 1.09, plays: 1, name: '별을 재는 탑', where: '마탑과 옛 탑', bpm: 60, beats: 3, root: 59, scale: 'dorian',
    sections: [
      sec(2, '1 | 4', [harp], { once: true }),
      sec(8, cA, [harp, stars, mel('clarinet', A, { oct: 0, vel: 0.48 })]),
      sec(8, cB, [harp, pad('trem', { reg: 62, vel: 0.18 }), mel('flute', B, { oct: 0, vel: 0.42 })]),
      sec(8, cA, [harp, stars, pad('trem', { reg: 62, vel: 0.18 }), mel('clarinet', A, { oct: 0, vel: 0.48 }), mel('cello', "1 - - | 1 - - | 3 - - | 2 - - | 3 - - | 4 - - | 2 - - | 1 - -", { oct: 0, vel: 0.36 }), bass('harp', 'r - -', { oct: -2, vel: 0.44 })], { rit: 0.08 }),
    ],
  };
})();

const garrison = (() => {
  const cA = '1 | 1 | 7 | 1 | 1 | 4 | 7 | 1', cB = '4 | 1 | 7 | 5 | 4 | 1 | 7 | 1';
  const A = "1 - - 1 5 - - - | 3 - 1 - 5, - - - | 2 - - 2 4 - 2 - | 1 - - - - - . . | 1 - - 1 5 - - - | 6 - 4 - 1 - 4 - | 4 - 2 - 7, - 2 - | 1 - - - - - . .";
  const B = "6 - - - 4 - - - | 5 - - - 3 - - - | 4 - - - 2 - 7, - | 2 - - - 5, - - - | 6 - - - 1' - - - | 5 - - - 3 - 1 - | 2 - 4 - 2 - 7, - | 1 - - - - - . .";
  const drum = perc('tom2', 'x . x x x . x .', { vel: 0.4 });
  const foot = perc('taiko2', 'x . . . o . . .', { vel: 0.4 });
  const lowb = bass('pizz', 'r - - - 5 - - -', { oct: -1, vel: 0.52 });
  return {
    id: 'garrison', kind: 'mood', gain: 1.15, plays: 2, name: '병영의 아침', where: '요새와 병영', bpm: 92, beats: 4, root: 55, scale: 'dorian', coda: [null, 'horn'],
    sections: [
      sec(2, '1 | 1', [drum, foot], { once: true }),
      sec(8, cA, [drum, foot, lowb, mel('trumpet', A, { oct: 1, vel: 0.46, on: even }), mel('clarinet', A, { oct: 1, vel: 0.5, on: odd })]),
      sec(8, cB, [drum, foot, lowb, mel('horn', B, { oct: 0, vel: 0.56 }), chop('spic', '. . x . . . x .', { reg: 58, vel: 0.36 })]),
      sec(8, cA, [drum, foot, lowb, mel('trumpet', A, { oct: 1, vel: 0.46 }), mel('horn', A, { oct: 0, vel: 0.42 }), chop('spic', 'x . x . x . x .', { reg: 58, vel: 0.36 }), pad('strings', { reg: 58, vel: 0.2 })]),
    ],
  };
})();

const labyrinth = (() => {
  const cA = '1 | 6 | 3 | 7 | 1 | 6 | 7 | 1', cB = '4 | 1 | 4 | 5M | 4 | 1 | 7 | 5M';
  const A = "1 - - 3 5 - 3 - | 6 - - 3 1 - - - | 5 - - 7 5 - 3 - | 4 - 2 - 7, - - - | 1 - - 3 5 - 1' - | 6 - - 1' 6 - 3 - | 4 - 2 - 4 - 7 - | 1' - - - - - . .";
  const B = "6 - 4 - 1 - 4 - | 5 - 3 - 1 - - - | 6 - 4 - 6 - 1' - | #7 - - - 5 - - - | 6 - 1' - 6 - 4 - | 3 - 5 - 1' - 5 - | 2' - 7 - 4 - 2 - | 2 - - - #7, - - -";
  const web = arp('pizz', '0 2 3 2 4 2 3 2', { oct: 0, vel: 0.42 });
  const lowb = bass('pizz', 'r - - - . . 5 -', { oct: -1, vel: 0.52 });
  const drum = perc('tom', 'x . . o . . x .', { vel: 0.34 });
  return {
    id: 'labyrinth', kind: 'mood', gain: 1.13, plays: 2, name: '탑 아래 도시', where: '미궁 도시 바르카 · 끝없는 탑', bpm: 96, beats: 4, root: 52, scale: 'aeolian', coda: ['harp', 'strings'],
    sections: [
      sec(2, '1 | 1', [web, lowb], { once: true }),
      sec(8, cA, [web, lowb, drum, mel('oboe', A, { oct: 1, vel: 0.46, on: even }), mel('flute', A, { oct: 1, vel: 0.44, on: odd })]),
      sec(8, cB, [web, lowb, drum, strum('. . d . . . d u', { oct: 0, vel: 0.36 }), mel('clarinet', B, { oct: 1, vel: 0.48 })]),
      sec(8, cA, [web, lowb, drum, perc('wood', '. . x . . . . x', { vel: 0.36 }), strum('. . d . . . d u', { oct: 0, vel: 0.36 }), mel('oboe', A, { oct: 1, vel: 0.46 }), mel('bassoon', A, { oct: 0, vel: 0.34 }), pad('strings', { reg: 59, vel: 0.2 })]),
    ],
  };
})();

const empire = (() => {
  const cA = '1 | 6 | 4 | 5M | 1 | 6 | 7 | 1o';
  const A = "5 - - 5 | 6 - - 3 | 4 - - 1 | 2 - - - | 5 - - 5 | 6 - 1' - | 7 - 4 2 | 1 - - -";
  const tp = perc('timp', 'x . . . . . o . | x . . . . . . .', { vel: 0.5 });
  const iron = chop('spic', 'x . . . x . . .', { reg: 50, low: true, vel: 0.4 });
  const lowb = bass('bass', 'r - - -', { oct: -1, vel: 0.5 });
  return {
    id: 'empire', kind: 'mood', gain: 1.02, plays: 1, name: '쇠의 수도', where: '발하르트 제국', bpm: 68, beats: 4, root: 50, scale: 'aeolian', coda: [null, 'trombone'],
    sections: [
      sec(2, '1o | 1o', [tp, iron, lowb], { once: true }),
      sec(8, cA, [tp, iron, lowb, mel('trombone', A, { oct: 0, vel: 0.58 })]),
      sec(4, '3 | 7 | 6 | 5M', [iron, lowb, pad('strings', { reg: 57, vel: 0.3 }), mel('trumpet', "5 - 7 - | 4 - 2 - | 3 - 1 6, | #7, - - -", { oct: 1, vel: 0.42 })]),
      sec(8, cA, [tp, iron, lowb, pad('strings', { reg: 57, vel: 0.3 }), mel('trombone', A, { oct: 0, vel: 0.58 }), mel('horn', A, { oct: 0, vel: 0.48 }), pad('choir', { reg: 55, open: true, vel: 0.26 })], { rit: 0.07 }),
    ],
  };
})();

const holy = (() => {
  const cA = '1 | 4 | 1 | 5 | 6 | 4 | 7 | 1';
  const A = "1 - - 3 | 4 - - 6 | 5 - 3 - | 2 - - - | 3 - - 1 | 4 - 6 - | 4 - 2 - | 3 - - -";
  const org = pad('organ', { reg: 55, low: true, vel: 0.26 });
  const toll = mel('bell', '1 - - - | . | . | . | 5 - - - | . | . | .', { oct: 0, vel: 0.3, flat: true });
  return {
    id: 'holy', kind: 'mood', gain: 1.14, plays: 1, name: '성광 아래', where: '성국 솔라리스', bpm: 54, beats: 4, root: 60, scale: 'mixolydian', coda: [null, 'organ'],
    sections: [
      sec(2, '1 | 4', [org], { once: true }),
      sec(8, cA, [org, mel('choir', A, { oct: 0, vel: 0.72 })]),
      sec(8, cA, [org, toll, mel('choir', A, { oct: 0, vel: 0.72 }), pad('choir', { reg: 55, vel: 0.2 }), mel('flute', "5 - - - | 6 - - 1' | 1' - 5 - | 7 - - - | 1' - - 6 | 6 - 1' - | 2' - 7 - | 1' - - -", { oct: 0, vel: 0.36 })]),
      sec(4, '6 | 4 | 7 | 5', [org, strs({ reg: 60, vel: 0.26 }), mel('oboe', "3 - 1 - | 1 - 6, - | 2 - 7, - | 2 - - -", { oct: 1, vel: 0.4 })]),
      sec(8, cA, [org, toll, strs({ reg: 60, vel: 0.26 }), mel('choir', A, { oct: 0, vel: 0.74 }), pad('choir', { reg: 55, vel: 0.2 })], { rit: 0.1 }),
    ],
  };
})();

const north = (() => {
  const cA = '1o | 7 | 6 | 1o | 3 | 7 | 6 | 1o';
  const A = "5 - - - | 4 - - 2 | 3 - - 1 | 5 - - - | 7 - - 5 | 4 - 2 - | 1 - 3 - | 1 - - -";
  const frost = pad('trem', { reg: 59, open: true, vel: 0.2 });
  const harp = mel('harp', "1 . 5 . | . . . . | 1 . 3 . | . . . . | 3 . 7 . | . . . . | 6, . 3 . | . . . .", { oct: 0, vel: 0.4, flat: true });
  return {
    id: 'north', kind: 'mood', gain: 1.0, plays: 1, name: '눈의 변경', where: '북쪽 변경 · 잊힌 땅 · 높은 산', bpm: 48, beats: 4, root: 52, scale: 'aeolian',
    sections: [
      sec(2, '1o | 1o', [frost, drone('strings', '1', { oct: -1, vel: 0.3 })], { once: true }),
      sec(8, cA, [frost, harp, mel('clarinet', A, { oct: 1, vel: 0.44 })]),
      sec(8, cA, [frost, harp, strs({ reg: 52, vel: 0.22 }), mel('horn', A, { oct: 0, vel: 0.46 }), mel('clarinet', ". . . . | . . 7 - | . . . . | . . 3 5 | . . . . | . . 7 - | . . . . | . . 5 -", { oct: 1, vel: 0.32, flat: true })]),
      sec(8, cA, [frost, harp, strs({ reg: 52, vel: 0.22 }), mel('clarinet', A, { oct: 1, vel: 0.44 }), mel('cello', "1 - - - | 7, - - - | 6, - - - | 5, - - - | 3 - - - | 2 - - - | 1 - - - | 1 - - -", { oct: 0, vel: 0.28 })], { rit: 0.1 }),
    ],
  };
})();

const demonland = (() => {
  const cA = '1o | 2 | 1o | 7 | 1o | 2 | 7 | 1o';
  const A = "1 - - - | 2 - - 4 | 5 - - - | 4 - 2 - | 1' - - - | 6 - 4 - | 7 - 4 2 | 1 - - -";
  const low = drone('strings', '1', { oct: -1, vel: 0.4 });
  const ash = pad('trem', { reg: 47, open: true, vel: 0.24 });
  const far = perc('taiko', 'x . . . . . . . | . . . . . . . .', { vel: 0.4 });
  return {
    id: 'demonland', kind: 'mood', gain: 1.0, plays: 1, name: '잿빛 땅', where: '마대륙', bpm: 46, beats: 4, root: 47, scale: 'phrygian', coda: [null, 'strings'],
    sections: [
      sec(2, '1o | 1o', [low, ash], { once: true }),
      sec(8, cA, [low, ash, far, mel('bassoon', A, { oct: 0, vel: 0.52 })]),
      sec(4, '6 | 7 | 6 | 2', [low, pad('choir', { reg: 54, vel: 0.26 }), mel('clarinet', "3 - 1 - | 2 - 7, - | 1 - 3 - | 2 - - -", { oct: 1, vel: 0.4 })]),
      sec(8, cA, [low, ash, far, pad('choir', { reg: 54, open: true, vel: 0.24 }), mel('bassoon', A, { oct: 0, vel: 0.52 }), mel('horn', A, { oct: 0, vel: 0.34 })], { rit: 0.08 }),
    ],
  };
})();

const lakecity = (() => {
  const cA = '1 | 2 | 6 | 5 | 1 | 2 | 5 | 1', cB = '6 | 3 | 6 | 2 | 6 | 3 | 2 | 5';
  const A = "3 - 5 | 6 - 4 | 3 - 1 | 2 - - | 5 - 1' | 6 - 2' | 7 5 2 | 3 - -";
  const B = "1' - 6 | 7 - 5 | 6 - 3 | 4 - - | 1' - 3' | 3' - 7 | 6 - 4 | 5 - -";
  const harp = arp('harp', '0 2 3 4 3 2', { oct: -1, vel: 0.4 });
  const glint = mel('glock', ". . . | 6 - - | . . . | 5 - - | . . . | 4 - - | . . . | 5 - -", { oct: 1, vel: 0.28, flat: true });
  return {
    id: 'lakecity', kind: 'mood', gain: 1.06, plays: 2, name: '호수 위의 탑들', where: '세레니아 마법 왕국', bpm: 70, beats: 3, root: 65, scale: 'lydian',
    sections: [
      sec(2, '1 | 2', [harp], { once: true }),
      sec(8, cA, [harp, glint, mel('flute', A, { oct: 0, vel: 0.46, on: even }), mel('oboe', A, { oct: 0, vel: 0.42, on: odd })]),
      sec(8, cB, [harp, strs({ reg: 60, vel: 0.22 }), mel('clarinet', B, { oct: 0, vel: 0.46 })]),
      sec(8, cA, [harp, glint, strs({ reg: 60, vel: 0.24 }), mel('flute', A, { oct: 0, vel: 0.46 }), mel('oboe', "1 - - | 2 - - | 1 - - | 7, - - | 3 - - | 4 - - | 2 - - | 1 - -", { oct: 0, vel: 0.34 }), bass('pizz', 'r - -', { oct: -2, vel: 0.44 })], { rit: 0.08 }),
    ],
  };
})();

export const TRACKS = [title, cradle, spring, summer, autumn, winter, fields, dusk, town, market, castle, capital, road, hardship,
  dungeon, underworld, battle, boss, duel, war, tense, solemn, festive, mystic, court, palace, abyss,
  isles, elfwood, dwarfhall, magetower, garrison, labyrinth, empire, holy, north, demonland, lakecity];
void after; void under;
