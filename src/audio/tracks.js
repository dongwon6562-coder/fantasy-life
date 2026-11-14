// 곡 목록. 악보 적는 법은 music.js 맨 위에 있다.
// 분위기: 진지한 어른 판타지. 밝은 장조 대신 옛 선법(도리아·믹솔리디아·에올리아·프리지아)을 쓰고,
// 화음은 3음을 뺀 빈 5도를 자주 써서 중세풍으로 건조하게 둔다.
// 곡의 짜임: 도입 → 주제(홑가락) → 주제(둘째 성부와 베이스가 붙음) → 가운데 대목 → 주제(악기를 바꿔 가득 차게) → 맺음.
// kind: 'mood' = 배경 곡(한 번 연주하고 맺는다, 사이에 쉼), 'cue' = 상황 곡(끝날 때까지 되풀이).
import { mel, under, arp, bass, pad, strum, perc, drone, gen, sec } from './music.js';

const after = (n) => (loop) => loop >= n;
const odd = (loop) => loop % 2 === 1;
const even = (loop) => loop % 2 === 0;

/* ---------- 처음 화면 ---------- */
const title = (() => {
  const cA = '1 | 1 | 7 | 7 | 1 | 4 | 7 | 1o', cB = '3 | 7 | 1 | 1 | 3 | 4 | 5 | 1o';
  const A = "5 - - | 4 3 1 | 2 - - | 7, - 1 | 3 - 4 | 6 - 5 | 4 - 2 | 1 - -";
  const B = "3 5 7 | 2' - 7 | 1' - - | 6 5 3 | 3 4 5 | 6 - 7 | 2' 1' 7 | 1' - -";
  const harp = arp('harp', '0 2 3 2 4 2', { oct: -1, vel: 0.55 });
  const low = drone('drone', '1', { oct: -2, vel: 0.42 });
  return {
    id: 'title', kind: 'mood', plays: 1, gain: 0.7, name: '봉인 이후', where: '처음 화면 · 대를 이을 때', bpm: 66, beats: 3, root: 62, scale: 'dorian',
    sections: [
      sec(4, '1 | 1 | 7 | 7', [harp, drone('drone', '1 5', { oct: -2, vel: 0.4 })], { once: true }),
      sec(8, cA, [harp, low, mel('viol', A, { vel: 0.6 })]),
      sec(8, cA, [harp, low, mel('viol', A, { vel: 0.6 }), under('strings', A, { vel: 0.3 }), bass('harp', 'r - -', { oct: -2, vel: 0.5 }),
        mel('bell', '1 - - | . | . | . | . | . | . | .', { oct: -1, vel: 0.4, flat: true })]),
      sec(8, cB, [harp, low, pad('strings', { oct: -1, vel: 0.36 }), mel('flute', B, { vel: 0.5 }), bass('harp', 'r - 5', { oct: -2, vel: 0.5 })]),
      sec(8, cA, [harp, low, pad('strings', { oct: -1, open: true, vel: 0.34 }), mel('flute', A, { oct: 1, vel: 0.42 }), mel('viol', A, { vel: 0.5 }),
        under('choirOo', A, { oct: -1, vel: 0.2, every: 3 }), bass('harp', 'r - 5', { oct: -2, vel: 0.5 })]),
    ],
  };
})();

/* ---------- 요람: 아기 시절 ---------- */
const cradle = (() => {
  const cA = '1 | 4 | 1 | 7 | 1 | 4 | 7 | 1o', cB = '3 | 7 | 4 | 1 | 3 | 7 | 5 | 1o';
  const A = "5 - 4 | 6 - 5 | 3 - 1 | 2 - - | 5 - 4 | 6 - 1' | 7 6 4 | 1 - -";
  const B = "3 - 5 | 2 - 7, | 4 - 6 | 5 - 3 | 3 - 5 | 7 - 4 | 5 - 2 | 1 - -";
  const harp = arp('harp', '0 . 2 3 . 2', { oct: -1, vel: 0.5 });
  return {
    id: 'cradle', kind: 'mood', plays: 1, name: '요람', where: '아기 시절 (세 살까지)', bpm: 66, beats: 3, root: 62, scale: 'dorian',
    sections: [
      sec(2, '1 | 4', [harp], { once: true }),
      sec(8, cA, [harp, mel('viol', A, { oct: -1, vel: 0.5 })]),
      sec(8, cB, [harp, mel('viol', B, { oct: -1, vel: 0.5 }), pad('strings', { oct: -1, open: true, vel: 0.22 })]),
      sec(8, cA, [harp, mel('harp', A, { oct: 1, vel: 0.5 }), under('viol', A, { oct: 0, vel: 0.36, every: 3 }), pad('strings', { oct: -1, open: true, vel: 0.22 })]),
    ],
  };
})();

/* ---------- 에른 마을의 사계절 ---------- */
const spring = (() => {
  const cA = '1 | 1 | 7 | 1 | 1 | 4 | 7 | 1', cB = '5 | 4 | 1 | 1 | 5 | 4 | 7 | 1';
  const A = "5 - 6 5 - 3 | 2 - 3 1 - - | 2 - 7, 2 - 4 | 3 - - - - . | 5 - 6 5 - 3 | 4 - 6 1' - 6 | 7 - 5 4 - 2 | 1 - - - - .";
  const B = "2' - 1' 7 - 5 | 6 - 5 4 - - | 3 - 4 5 - 3 | 2 - - 1 - - | 2' - 1' 7 - 5 | 6 - 1' 2' - 1' | 7 - 5 4 - 2 | 1 - - - - .";
  const lute = arp('lute', '0 2 3 4 3 2', { oct: -1, vel: 0.58 });
  const drum = perc('frame', 'x . . o . .', { vel: 0.3 });
  return {
    id: 'village_spring', kind: 'mood', plays: 1, name: '에른의 봄', where: '에른 마을 · 봄', bpm: 84, beats: 3, root: 62, scale: 'mixolydian',
    sections: [
      sec(4, '1 | 1 | 7 | 1', [lute], { once: true }),
      sec(8, cA, [lute, mel('flute', A, { vel: 0.5 })]),
      sec(8, cA, [lute, drum, mel('flute', A, { vel: 0.5 }), under('viol', A, { vel: 0.3, every: 3 }), bass('lute', 'r - - 5 - -', { oct: -2, vel: 0.55 })]),
      sec(8, cB, [lute, drum, mel('harp', B, { vel: 0.6 }), pad('strings', { oct: -1, open: true, vel: 0.24 }), bass('lute', 'r - - 5 - -', { oct: -2, vel: 0.55 })]),
      sec(8, cA, [lute, drum, mel('viol', A, { vel: 0.5 }), mel('flute', A, { oct: 1, vel: 0.34 }), pad('strings', { oct: -1, open: true, vel: 0.24 }), bass('lute', 'r - - 5 - a', { oct: -2, vel: 0.55 })]),
    ],
  };
})();

const summer = (() => {
  const cA = '1 | 2 | 1 | 5 | 1 | 2 | 3 | 1', cB = '6 | 5 | 6 | 5';
  const A = "5 - - 3 | 4 - 2 - | 3 - 5 - | 7 - 5 - | 1' - - 6 | 6 - 4 2 | 3 - 5 7 | 5 - - -";
  const harp = arp('harp', '0 2 3 4 3 2 3 2', { oct: -1, vel: 0.48 });
  const strs = pad('strings', { oct: -1, open: true, vel: 0.26 });
  return {
    id: 'village_summer', kind: 'mood', plays: 1, gain: 0.9, name: '긴 낮', where: '에른 마을 · 여름', bpm: 60, beats: 4, root: 65, scale: 'lydian',
    sections: [
      sec(2, '1 | 2', [harp], { once: true }),
      sec(8, cA, [harp, strs, mel('flute', A, { vel: 0.45 }), drone('drone', '1', { oct: -2, vel: 0.28 })]),
      sec(4, cB, [harp, strs, mel('viol', '1 - - - | 7, - - - | 1 - - - | 2 - - -', { vel: 0.42 })]),
      sec(8, cA, [harp, strs, mel('viol', A, { oct: -1, vel: 0.46 }), under('flute', A, { oct: 1, vel: 0.26 }), bass('harp', 'r - - - 5 - - -', { oct: -2, vel: 0.5 }), drone('drone', '1', { oct: -2, vel: 0.28 })]),
    ],
  };
})();

const autumn = (() => {
  const cA = '1 | 7 | 1 | 4 | 1 | 7 | 5 | 1o', cB = '3 | 7 | 1 | 1 | 3 | 4 | 5 | 1o';
  const A = "5 - 4 | 2 - 7, | 1 2 3 | 4 - - | 5 - 7 | 7 6 4 | 5 - 2 | 1 - -";
  const B = "3 5 7 | 2' - 7 | 1' - 5 | 3 2 1 | 3 - 5 | 6 - 1' | 2' 1' 7 | 1' - -";
  const lute = arp('lute', '0 2 3 2 4 2', { oct: -1, vel: 0.56 });
  const drum = perc('frame', 'x . .', { vel: 0.24 });
  return {
    id: 'village_autumn', kind: 'mood', plays: 1, name: '거둔 뒤', where: '에른 마을 · 가을', bpm: 80, beats: 3, root: 64, scale: 'dorian',
    sections: [
      sec(4, '1 | 7 | 1 | 1o', [lute], { once: true }),
      sec(8, cA, [lute, mel('viol', A, { vel: 0.55 })]),
      sec(8, cA, [lute, drum, mel('viol', A, { vel: 0.55 }), under('strings', A, { vel: 0.28, every: 3 }), bass('lute', 'r - 5', { oct: -2, vel: 0.52 })]),
      sec(8, cB, [lute, drum, pad('strings', { oct: -1, open: true, vel: 0.28 }), mel('flute', B, { vel: 0.48 }), bass('lute', 'r - 5', { oct: -2, vel: 0.52 })]),
      sec(8, cA, [lute, drum, pad('strings', { oct: -1, open: true, vel: 0.26 }), mel('viol', A, { vel: 0.55 }), under('flute', A, { oct: 1, vel: 0.26, every: 3 }), bass('lute', 'r - a', { oct: -2, vel: 0.52 })]),
    ],
  };
})();

const winter = (() => {
  const c = '1o | 1o | 6 | 6 | 4 | 4 | 5 | 1o';
  const A = ". 5 3 - | 1 - . . | . 3 1 - | 6, - . . | . 1' 6 - | 4 - . . | . 2' 7 5 | 1 - - -";
  const low = '1 - - - | - - - - | 1 - - - | 3 - - - | 1 - - - | 4 - - - | 2 - - - | 1 - - -';
  const strs = pad('strings', { oct: -1, open: true, vel: 0.28 });
  return {
    id: 'village_winter', kind: 'mood', plays: 1, name: '눈 덮인 밭', where: '에른 마을 · 겨울', bpm: 52, beats: 4, root: 64, scale: 'aeolian',
    sections: [
      sec(8, c, [strs, mel('harp', A, { vel: 0.6 })]),
      sec(8, c, [strs, mel('harp', A, { vel: 0.6 }), mel('viol', low, { oct: -1, vel: 0.34 }), mel('bell', '1 - - - | . | . | . | . | . | . | .', { oct: -1, vel: 0.32, flat: true })]),
      sec(8, c, [strs, mel('viol', A, { vel: 0.4 }), arp('harp', '0 . 2 . 3 . 2 .', { oct: -1, vel: 0.4 }), under('choirOo', low, { oct: -1, vel: 0.18, every: 4 })]),
    ],
  };
})();

/* ---------- 에른 마을: 계절을 가리지 않는 곡 ---------- */
const fields = (() => {
  const cA = '1 | 4 | 1 | 7 | 1 | 4 | 7 | 1', cB = '5 | 4 | 5 | 1 | 6 | 4 | 7 | 1';
  const A = "3 - 5 - | 6 5 4 - | 3 2 1 - | 2 - 7, - | 3 - 5 - | 6 - 1' 6 | 7 6 4 2 | 1 - - -";
  const B = "2 - 5 - | 4 - 1 - | 2 4 5 7 | 5 - 3 - | 3 - 6 - | 4 - 6 1' | 7 - 4 2 | 1 - - -";
  const lute = arp('lute', '0 2 3 2 4 2 3 2', { vel: 0.54 });
  const walk = bass('lute', 'r - - - 5 - a -', { oct: -1, vel: 0.52 });
  return {
    id: 'ern_fields', kind: 'mood', plays: 1, name: '밭두렁 길', where: '에른 마을 · 봄부터 가을', bpm: 88, beats: 4, root: 55, scale: 'mixolydian',
    sections: [
      sec(2, '1 | 4', [lute], { once: true }),
      sec(8, cA, [lute, mel('flute', A, { oct: 1, vel: 0.48 })]),
      sec(8, cA, [lute, walk, perc('frame', 'x . . . o . . .', { vel: 0.28 }), mel('flute', A, { oct: 1, vel: 0.48 }), under('viol', A, { oct: 1, vel: 0.3 })]),
      sec(8, cB, [lute, walk, perc('frame', 'x . . . o . . .', { vel: 0.28 }), mel('viol', B, { oct: 1, vel: 0.52 }), pad('strings', { open: true, vel: 0.22 })]),
      sec(8, cA, [lute, walk, perc('frame', 'x . . . o . . .', { vel: 0.28 }), mel('harp', A, { oct: 1, vel: 0.56 }), under('flute', A, { oct: 2, vel: 0.24 }), pad('strings', { open: true, vel: 0.22 })]),
    ],
  };
})();

const dusk = (() => {
  const cA = '1 | 6 | 3 | 7 | 1 | 6 | 7 | 1o', cB = '4 | 1 | 4 | 5 | 6 | 3 | 7 | 1o';
  const A = "1 - 3 | 1 - 6, | 3 - 5 | 2 - 7, | 1 - 3 | 3 - 6 | 4 - 2 | 1 - -";
  const B = "4 - 6 | 5 - 3 | 4 6 1' | 7 - 5 | 6 - 1' | 7 - 5 | 4 - 2 | 1 - -";
  const harp = arp('harp', '0 2 3 . 2 .', { oct: -1, vel: 0.5 });
  const toll = mel('bell', '1 - - | . | . | . | 5, - - | . | . | .', { oct: -1, vel: 0.3, flat: true });
  return {
    id: 'ern_dusk', kind: 'mood', plays: 1, name: '저녁 종', where: '에른 마을 · 사계절', bpm: 60, beats: 3, root: 57, scale: 'aeolian',
    sections: [
      sec(8, cA, [harp, toll, mel('viol', A, { oct: 1, vel: 0.5 })]),
      sec(8, cB, [harp, pad('strings', { open: true, vel: 0.26 }), mel('viol', B, { oct: 1, vel: 0.5 }), bass('harp', 'r - -', { oct: -1, vel: 0.5 })]),
      sec(8, cA, [harp, toll, pad('strings', { open: true, vel: 0.26 }), mel('flute', A, { oct: 1, vel: 0.44 }), under('viol', A, { oct: 1, vel: 0.34, every: 3 }), bass('harp', 'r - 5', { oct: -1, vel: 0.5 })]),
    ],
  };
})();

/* ---------- 도시와 길 ---------- */
const town = (() => {
  const cA = '1 | 7 | 1 | 7 1 | 1 | 7 | 3 7 | 1', cB = '3 | 7 | 1 | 1 | 3 | 7 | 5 | 1o';
  const A = "5 - 5 6 5 4 3 - | 2 - 2 3 2 1 7, - | 1 2 3 5 4 3 2 1 | 7, - 2 - 1 - - . | 5 - 5 6 5 4 3 - | 2 - 2 3 4 - 7 - | 7 - 5 3 4 - 2 - | 1 - - - - - . .";
  const B = "5 - 7 - 1' 7 5 - | 4 - 5 4 2 - - - | 3 - 5 - 1' - 5 - | 6 5 3 2 1 - - . | 5 - 7 - 1' 7 5 - | 2' - 1' 7 4 - - - | 5 - 7 - 2' - 7 - | 1' - - - - - . .";
  const st = strum('D . d u . u d u', { oct: -1, vel: 0.48 });
  const bs = bass('lute', 'r . . . 5 . a .', { oct: -2, vel: 0.6 });
  const dr = perc('frame', 'X . . x . . x .', { vel: 0.42 });
  const tk = perc('tick', '. . x . . . x .', { vel: 0.3 });
  return {
    id: 'town', kind: 'mood', plays: 1, gain: 0.92, name: '하르펜 성벽 아래', where: '하르펜 (교역 도시)', bpm: 104, beats: 4, root: 62, scale: 'dorian',
    sections: [
      sec(2, '1 | 7', [st, dr], { once: true }),
      sec(8, cA, [st, bs, dr, mel('viol', A, { vel: 0.55, legato: 0.85 })]),
      sec(8, cB, [st, bs, dr, tk, mel('flute', B, { vel: 0.5, legato: 0.85 })]),
      sec(8, cA, [st, bs, dr, tk, mel('pipe', A, { vel: 0.5, legato: 0.85 }), mel('viol', A, { oct: -1, vel: 0.4, legato: 0.85 }), perc('jingle', '. . . . x . . .', { vel: 0.22 })]),
      sec(8, cB, [st, bs, dr, tk, mel('flute', B, { vel: 0.5, legato: 0.85 }), under('viol', B, { vel: 0.34 }), perc('jingle', '. . . . x . . .', { vel: 0.22 })]),
    ],
  };
})();

const market = (() => {
  const cA = '1 | 1 | 7 | 4 | 1 | 3 | 7 | 1', cB = '4 | 1 | 4 | 5 | 3 | 7 | 5 | 1';
  const A = "1 - 3 - 5 - 3 - | 4 3 1 - 3 - - - | 2 - 4 - 7 - 4 - | 6 - 4 - 1 - - - | 1 - 3 - 5 - 1' - | 7 - 5 - 3 - - - | 4 - 2 - 7, - 2 - | 1 - - - - - . .";
  const B = "6 - 4 - 1' - 6 - | 5 - 3 - 1 - - - | 6 - 1' - 6 - 4 - | 5 - 2 - 7, - - - | 3 - 5 - 7 - 5 - | 4 - 2 - 7, - - - | 2 - 5 - 7 - 5 - | 1 - - - - - . .";
  const lute = arp('lute', '0 2 3 2 4 2 3 2', { vel: 0.5 });
  const bs = bass('lute', 'r . . 5 . . a .', { oct: -1, vel: 0.58 });
  const dr = perc('frame', 'X . . x . . o .', { vel: 0.4 });
  return {
    id: 'market', kind: 'mood', plays: 1, name: '은저울 상단', where: '하르펜 · 장터', bpm: 96, beats: 4, root: 55, scale: 'dorian',
    sections: [
      sec(2, '1 | 1', [lute, dr], { once: true }),
      sec(8, cA, [lute, bs, dr, mel('pipe', A, { oct: 1, vel: 0.46, legato: 0.88 })]),
      sec(8, cB, [lute, bs, dr, perc('tick', '. . x . . . x .', { vel: 0.26 }), mel('viol', B, { oct: 1, vel: 0.52, legato: 0.88 })]),
      sec(8, cA, [lute, bs, dr, perc('tick', '. . x . . . x .', { vel: 0.26 }), mel('flute', A, { oct: 1, vel: 0.48, legato: 0.88 }), under('viol', A, { oct: 1, vel: 0.32 })]),
    ],
  };
})();

const castle = (() => {
  const cA = '1 | 6 | 7 | 1 | 1 | 4 | 5M | 1', cB = '3 | 7 | 1 | 5M | 3 | 7 | 5M | 1';
  const A = "1 - 5 - | 6 - - 3 | 4 - 2 7, | 1 - - . | 3 - 5 - | 1' - 6 4 | 5 - 2 - | 1 - - .";
  const B = "5 - 7 5 | 4 - 2 - | 3 2 1 - | 2 - - . | 5 - 7 1' | 2' - 7 4 | 5 - 2 - | 1 - - .";
  const strs = pad('strings', { oct: -1, vel: 0.32 });
  const drum = perc('war', 'x . . . . . o .', { vel: 0.32 });
  return {
    id: 'castle', kind: 'mood', plays: 1, gain: 0.78, name: '베르덴 성채', where: '베르덴 (백작령 성읍)', bpm: 76, beats: 4, root: 62, scale: 'aeolian',
    sections: [
      sec(2, '1 | 1', [drum, drone('drone', '1 5', { oct: -2, vel: 0.4 })], { once: true }),
      sec(8, cA, [strs, drum, arp('lute', '0 . 2 . 3 . 2 .', { oct: -1, vel: 0.4 }), mel('horn', A, { oct: -1, vel: 0.6 })]),
      sec(8, cB, [strs, arp('harp', '0 2 3 2 4 2 3 2', { oct: -1, vel: 0.4 }), mel('viol', B, { vel: 0.55 }), bass('harp', 'r - - - 5 - - -', { oct: -2, vel: 0.5 })]),
      sec(8, cA, [strs, drum, perc('snare', '. . . . . . (x x) x', { vel: 0.2 }), arp('lute', '0 . 2 . 3 . 2 .', { oct: -1, vel: 0.4 }), mel('horn', A, { oct: -1, vel: 0.6 }),
        mel('viol', A, { vel: 0.4 }), under('choirOo', A, { oct: -1, vel: 0.2, every: 4 }), bass('harp', 'r - - - 5 - a -', { oct: -2, vel: 0.5 })]),
    ],
  };
})();

const capital = (() => {
  const cA = '1 | 7 | 4 | 1 | 1 | 5 | 7 4 | 1o', cB = '6 | 4 | 2 | 5 | 6 | 4 | 7 | 1';
  const A = "1 - 3 5 | 4 - - 2 | 6 - 4 - | 5 - - . | 1' - 7 5 | 7 - 5 2 | 4 - 6 - | 5 - - -";
  const B = "3 - 1 6, | 1 - 4 - | 6 - 4 2 | 5 - - . | 3 - 6 3 | 4 - 6 1' | 7 - 4 2 | 1 - - -";
  const strs = pad('strings', { oct: -1, vel: 0.3 });
  const harp = arp('harp', '0 2 3 2 4 2 3 2', { oct: -1, vel: 0.4 });
  const toll = mel('bell', '1 - - - | . | . | . | 1 - - - | . | . | .', { oct: -1, vel: 0.34, flat: true });
  return {
    id: 'capital', kind: 'mood', plays: 1, gain: 0.8, name: '백색 성', where: '왕도 레오카스트', bpm: 66, beats: 4, root: 67, scale: 'mixolydian',
    sections: [
      sec(2, '1 | 1o', [mel('bell', '1 - - - | .', { oct: -1, vel: 0.34, flat: true }), pad('organ', { oct: -1, open: true, vel: 0.3 })], { once: true }),
      sec(8, cA, [strs, harp, toll, mel('horn', A, { oct: -1, vel: 0.56 })]),
      sec(8, cB, [strs, harp, mel('viol', B, { vel: 0.52 }), bass('harp', 'r - - - 5 - - -', { oct: -2, vel: 0.5 })]),
      sec(8, cA, [strs, harp, toll, perc('war', 'x . . . o . . .', { vel: 0.24 }), pad('choir', { oct: -1, open: true, vel: 0.24 }), pad('organ', { oct: -1, open: true, vel: 0.2 }),
        mel('horn', A, { oct: -1, vel: 0.56 }), mel('strings', A, { vel: 0.3, o: { attack: 0.18, release: 0.4 } }), bass('harp', 'r - - - 5 - a -', { oct: -2, vel: 0.5 })]),
    ],
  };
})();

const road = (() => {
  const cA = '1 | 1 | 7 | 4 | 1 | 3 | 7 | 1', cB = '4 | 1 | 4 | 5 | 4 | 1 | 7 | 1';
  const A = "1 - - 2 | 3 - 5 - | 4 - 2 - | 6 - 4 - | 5 - - 3 | 5 - 7 - | 4 - 7 2' | 1' - - .";
  const B = "6 - 4 6 1' - 6 - | 5 - 3 5 1' - - - | 6 - 4 6 1' - 2' - | 2' - 7 - 5 - - - | 6 - 4 6 1' - 6 - | 5 - 3 5 3 - 1 - | 7, - 2 - 4 - 2 - | 1 - - - - - . .";
  const lute = arp('lute', '0 2 3 2 0 2 3 2', { vel: 0.48 });
  const steps = perc('frame', 'x . . . o . . .', { vel: 0.32 }); // 발걸음
  return {
    id: 'road', kind: 'mood', plays: 1, name: '먼 길', where: '길 위 (여행·이사)', bpm: 92, beats: 4, root: 57, scale: 'dorian',
    sections: [
      sec(2, '1 | 1', [lute, steps], { once: true }),
      sec(8, cA, [lute, steps, mel('viol', A, { vel: 0.55 })]),
      sec(8, cB, [lute, steps, pad('strings', { open: true, vel: 0.22 }), mel('harp', B, { oct: 1, vel: 0.52 }), bass('lute', 'r - - - 5 - - -', { oct: -1, vel: 0.5 })]),
      sec(8, cA, [lute, steps, pad('strings', { open: true, vel: 0.22 }), mel('viol', A, { vel: 0.55 }), under('flute', A, { oct: 1, vel: 0.28 }), bass('lute', 'r - - - 5 - a -', { oct: -1, vel: 0.5 })]),
    ],
  };
})();

const hardship = (() => {
  const c = '1o | 1o | 7 | 7 | 1o | 4 | 5 | 1o';
  const A = "1 - 2 | 3 - - | 2 - 1 | 7, - - | 1 - 3 | 4 - 6 | 5 2 - | 1 - -";
  return {
    id: 'hardship', kind: 'mood', plays: 1, gain: 0.75, name: '흉년', where: '기근 · 역병이 든 때', bpm: 56, beats: 3, root: 52, scale: 'aeolian',
    sections: [
      sec(8, c, [drone('drone', '1 5', { oct: -1, vel: 0.34 }), arp('lute', '0 . 2 . 3 .', { vel: 0.4 }), mel('viol', A, { oct: 1, vel: 0.5 })]),
      sec(8, c, [drone('drone', '1 5', { oct: -1, vel: 0.34 }), arp('lute', '0 . 2 . 3 .', { vel: 0.4 }), mel('viol', A, { oct: 1, vel: 0.5 }), under('choirOo', A, { oct: 0, vel: 0.2, every: 3 })]),
    ],
  };
})();

/* ---------- 미궁, 뒷골목 ---------- */
const dungeon = {
  id: 'dungeon', kind: 'cue', gain: 0.62, name: '회색 굴', where: '미궁', bpm: 50, beats: 4, root: 50, scale: 'phrygian',
  sections: [
    sec(8, '1o | - | 2o | 1o | 1o | - | 7o | 1o', [
      drone('drone', '1', { oct: -1, vel: 0.52 }),
      pad('choirOo', { open: true, vel: 0.24 }),
      mel('harp', '. . 5 - | 6 - 5 - | . . . . | 2 - 1 - | . | . | . . 7, - | 1 - - -', { vel: 0.42, on: odd }),
      mel('viol', '. | . | . . . 2 | 1 - - - | . | . . 5 - | 4 - 3 - | 1 - - -', { oct: 1, vel: 0.28, on: after(2) }),
      gen(({ bar, rnd, deg }) => {
        const ev = [];
        if (rnd() < 0.2) ev.push({ beat: rnd() * 3, perc: 'war', vel: 0.14 + rnd() * 0.12 }); // 멀리서 무너지는 소리
        if (bar === 0) ev.push({ beat: 0, inst: 'bell', midi: deg('1') - 12, dur: 4, vel: 0.24, o: { decay: 6 } });
        return ev;
      }),
    ]),
  ],
};

const underworld = (() => {
  const c = '1 | 1 | 6 | 5M | 1 | 4 | 5M | 1o';
  const A = "1 . . 3 2 - 1 . | 5, - . . . . 7, 1 | 6, . . 1 3 - 1 . | 2 - . . . . . . | 1 . . 3 5 - 3 . | 4 - . 6 4 - 1 . | 2 - . 5 2 - 5, . | 1 - - - . . . .";
  const bs = bass('lute', 'r . . 5 . a . .', { oct: -1, vel: 0.62, o: { damp: true }, legato: 0.6 });
  const tk = perc('tick', '. . x . . . . x', { vel: 0.3 });
  return {
    id: 'underworld', kind: 'cue', gain: 1.3, name: '검은 장갑', where: '뒷골목 · 범죄 조직', bpm: 84, beats: 4, root: 48, scale: 'aeolian',
    sections: [
      sec(4, '1 | 1 | 6 | 5M', [bs, tk], { once: true }),
      sec(8, c, [bs, tk, perc('shaker', 'o . o . o . o o', { vel: 0.3 }), mel('viol', A, { oct: 1, vel: 0.46, legato: 0.8 })]),
      sec(8, c, [bs, tk, perc('shaker', 'o . o . o . o o', { vel: 0.3 }), perc('frame', 'x . . . . . . .', { vel: 0.3 }), pad('strings', { open: true, vel: 0.2, o: { trem: true } }),
        mel('viol', A, { oct: 1, vel: 0.46, legato: 0.8 }), mel('glass', '. . . . . . 5 . | . | . . . . . . 3 . | .', { oct: 3, vel: 0.2, flat: true })]),
    ],
  };
})();

/* ---------- 싸움 ---------- */
const battle = (() => {
  const cA = '1 | 1 | 6 | 7 | 1 | 1 | 6 | 5M', cB = '4 | 1 | 4 | 5M | 6 | 7 | 5M | 5M';
  const st = { legato: 0.5, o: { attack: 0.012, release: 0.07 } };
  const ost = [arp('strings', '0 0 2 0 0 0 2 0', { vel: 0.5, ...st }), arp('strings', '0 . 0 . 0 . 0 .', { oct: -1, vel: 0.5, ...st })];
  const drums = [perc('war', 'X . . x . . x .', { vel: 0.7 }), perc('tom', '. . x . . x . (x x)', { vel: 0.42 })];
  const hornA = "1 - - - - - 5 - | 4 - 3 - 1 - - - | 3 - - - - - 1 - | 2 - 4 - 2 - - - | 1 - - - - - 5 - | 1' - 7 - 5 - - - | 6 - - - 1' - 6 - | 5 - - - - - - .";
  const run = "4 6 1' 6 4 6 1' 6 | 3 5 1' 5 3 5 1' 5 | 4 6 1' 6 2' 1' 6 4 | 5 - - - 2 - 5 - | 6 1' 3' 1' 6 1' 3' 1' | 7 2' 4' 2' 7 2' 4' 2' | 5' - - - 2' - - - | 5 - 5 5 5 - 5 5";
  return {
    id: 'battle', kind: 'cue', gain: 0.85, name: '칼을 뽑다', where: '전투', bpm: 138, beats: 4, root: 50, scale: 'aeolian',
    sections: [
      sec(2, '1 | 1', [...ost, perc('war', 'X . . . . . x x', { vel: 0.7 })], { once: true }),
      sec(8, cA, [...ost, ...drums, perc('tick', '. x . x . x . x', { vel: 0.2, on: after(1) }), mel('horn', hornA, { oct: 1, vel: 0.62 }), under('horn', hornA, { oct: 1, vel: 0.36, every: 4, on: after(1) })]),
      sec(8, cB, [...ost, ...drums, perc('tick', '. x . x . x . x', { vel: 0.2 }), perc('anvil', '. . . . X . . .', { vel: 0.25, on: after(1) }), pad('choir', { open: true, vel: 0.3 }),
        mel('horn', '4 - - - | 1 - - - | 4 - - - | 5 - - - | 6 - - - | 7 - - - | 5 - - - | 5 - - -', { vel: 0.5 }), mel('viol', run, { oct: 1, vel: 0.5, legato: 0.8 })]),
    ],
  };
})();

const boss = (() => {
  const c = '1o | 1o | 2 | 1o | 1o | 7 | 2 | 1o';
  const A = "1 - 2 1 | 7, - 1 - | 4 - 3 2 | 1 - - . | 1 - 2 1 | 2 - 4 - | 6 - 4 2 | 1 - - .";
  const ost = arp('strings', '0 . 0 0 . 0 0 .', { oct: -1, vel: 0.55, legato: 0.5, o: { attack: 0.012, release: 0.09 } });
  const drums = perc('war', 'X . . x . . . . | X . . x . x x .', { vel: 0.8 });
  return {
    id: 'boss', kind: 'cue', gain: 0.85, name: '물러설 곳 없다', where: '숙적 · 강한 적', bpm: 96, beats: 4, root: 52, scale: 'phrygian',
    sections: [
      sec(8, c, [ost, drums, pad('strings', { open: true, vel: 0.24, o: { trem: true } }), mel('bell', '1 - - - | . | . | . | 1 - - - | . | . | .', { vel: 0.4, flat: true }),
        mel('choirOo', A, { vel: 0.5, o: { attack: 0.12, release: 0.4 } }), mel('horn', A, { vel: 0.52 }), mel('viol', A, { oct: 1, vel: 0.42, on: after(1) })]),
      sec(4, '1o', [ost, drums, perc('tom', '. . . . x . x x', { vel: 0.4 }), mel('strings', '1 - - - | 2 - - - | 3 - - - | 2 - - -', { oct: 1, vel: 0.34, o: { trem: true } })]),
    ],
  };
})();

const duel = (() => {
  const c = '1o | 1o | 2 | 1o | 1o | 7 | 2 | 1o';
  const A = "1 - - - . . 2 1 | 5 - - - . . . . | 4 - 3 2 - - . . | 1 - - - . . . . | 1 - - - . . 2 1 | 7, - 1 - 3 - - - | 6 - 4 - 2 - - - | 1 - - - . . . .";
  const pulse = perc('war', 'X . . . . . x .', { vel: 0.5 });
  const air = mel('strings', "5 - - - | - - - - | 6 - - - | 5 - - -", { oct: 1, vel: 0.22, o: { trem: true }, flat: true });
  return {
    id: 'duel', kind: 'cue', gain: 0.92, name: '일대일', where: '결투', bpm: 72, beats: 4, root: 50, scale: 'phrygian',
    sections: [
      sec(4, '1o', [pulse, air, drone('drone', '1', { oct: -1, vel: 0.4 })], { once: true }),
      sec(8, c, [pulse, air, perc('tick', '. . . . x . . .', { vel: 0.3 }), drone('drone', '1', { oct: -1, vel: 0.4 }), mel('viol', A, { oct: 1, vel: 0.5 })]),
      sec(8, c, [pulse, air, perc('tick', '. . x . x . . x', { vel: 0.3 }), perc('tom', '. . . . . . x x', { vel: 0.36 }), drone('drone', '1', { oct: -1, vel: 0.4 }),
        mel('viol', A, { oct: 1, vel: 0.5 }), mel('horn', A, { vel: 0.36 }), arp('strings', '0 . 0 . 0 . 0 0', { oct: -1, vel: 0.4, legato: 0.5, o: { attack: 0.012, release: 0.09 } })]),
    ],
  };
})();

const war = (() => {
  const cA = '1 | 6 | 7 | 1 | 1 | 6 | 7 | 5M', cB = '4 | 1 | 6 | 5M | 4 | 1 | 7 | 1';
  const A = "1 - 1 2 | 3 - 1 - | 2 - 4 - | 3 - - 1 | 5 - 5 4 | 3 - 6 - | 4 - 2 - | 5 - - -";
  const B = "4 - 6 - | 5 - 3 1 | 6 - 1' - | 5 - - - | 4 - 6 1' | 5 - 3 - | 4 - 2 - | 1 - - -";
  const march = [perc('snare', 'x . x x x . x (x x)', { vel: 0.4 }), perc('war', 'X . . . X . . .', { vel: 0.7 })];
  const low = arp('strings', '0 . 0 . 2 . 0 .', { oct: -1, vel: 0.46, legato: 0.6, o: { attack: 0.02, release: 0.1 } });
  return {
    id: 'war', kind: 'cue', gain: 0.8, name: '전열', where: '전쟁 · 군대를 이끌 때', bpm: 104, beats: 4, root: 50, scale: 'aeolian',
    sections: [
      sec(2, '1o', march, { once: true }),
      sec(8, cA, [...march, low, mel('horn', A, { oct: 1, vel: 0.6 })]),
      sec(8, cB, [...march, low, pad('choir', { open: true, vel: 0.3 }), mel('horn', B, { oct: 1, vel: 0.6 }), under('horn', B, { oct: 1, vel: 0.36, every: 4 })]),
      sec(8, cA, [...march, low, pad('choir', { open: true, vel: 0.3 }), pad('strings', { vel: 0.26 }), mel('horn', A, { oct: 1, vel: 0.6 }), mel('pipe', A, { oct: 2, vel: 0.36 }), under('horn', A, { oct: 1, vel: 0.36, every: 4 })]),
    ],
  };
})();

/* ---------- 사건 ---------- */
const tense = (() => {
  const c = '1o | 1o | 6 | 5o';
  const base = [pad('strings', { oct: -1, open: true, vel: 0.32, o: { trem: true } }), perc('heart', 'X x . . . . . .', { vel: 0.5 }),
    mel('harp', '1 . . 3 | 2 - . . | 6, . . 1 | 7, - . .', { vel: 0.5, flat: true }), drone('drone', '1', { oct: -2, vel: 0.4 })];
  return {
    id: 'tense', kind: 'cue', gain: 0.92, name: '불길한 소식', where: '위험한 사건', bpm: 60, beats: 4, root: 57, scale: 'aeolian',
    sections: [sec(4, c, base), sec(4, c, [...base, mel('viol', '5 - - - | - - - - | 6 - - - | 5 - - -', { oct: 1, vel: 0.34, flat: true })])],
  };
})();

const solemn = (() => {
  const c = '1 | 6 | 4 | 5M | 1 | 6 | 7 | 1o';
  const A = "5 - - 4 | 3 - - 1 | 4 - 6 - | 5 - - - | 1' - - 7 | 6 - - 3 | 4 - 2 - | 1 - - -";
  const toll = mel('bell', '1 - - - | . | 1 - - - | . | 1 - - - | . | 1 - - - | .', { oct: -1, vel: 0.4, flat: true });
  return {
    id: 'solemn', kind: 'cue', gain: 0.72, name: '떠난 이를 위하여', where: '죽음 · 장례 · 삶의 끝', bpm: 46, beats: 4, root: 62, scale: 'aeolian',
    sections: [
      sec(8, c, [toll, pad('choirOo', { oct: -1, vel: 0.34 }), mel('viol', A, { vel: 0.5 }), drone('drone', '1', { oct: -2, vel: 0.3 })]),
      sec(8, c, [toll, pad('organ', { oct: -1, vel: 0.3 }), pad('choirOo', { oct: -1, open: true, vel: 0.26 }), mel('viol', A, { vel: 0.5 }), under('strings', A, { vel: 0.26 }), drone('drone', '1', { oct: -2, vel: 0.3 })]),
    ],
  };
})();

const festive = (() => {
  const cA = '1 | 1 | 7 | 7 | 1 | 4 | 7 | 1', cB = '3 | 7 | 1 | 5 | 3 | 7 | 5 | 1';
  const A = "1 - 3 5 - 3 | 5 6 5 3 - 1 | 7, - 2 4 - 2 | 4 5 4 2 - 7, | 1 - 3 5 - 3 | 6 - 1' 6 - 4 | 7 - 4 2 4 2 | 1 - - 1 . .";
  const B = "5 - 7 1' - 7 | 2' - 7 4 - 2 | 3 - 5 1' - 5 | 7 - 5 2 - - | 5 - 7 1' - 7 | 2' - 7 2' - 4' | 2' 1' 7 5 - 7 | 1' - - 1' . .";
  const comp = [strum('D . u d . u', { vel: 0.5 }), bass('lute', 'r . . 5 . .', { oct: -1, vel: 0.6 }), perc('frame', 'X . o x . o', { vel: 0.5 })];
  const jing = perc('jingle', '. . x . . x', { vel: 0.3 });
  return {
    id: 'festive', kind: 'cue', gain: 0.95, name: '수확제', where: '축제 · 혼례 · 잔치', bpm: 132, beats: 3, root: 57, scale: 'dorian',
    sections: [
      sec(2, '1 | 1', comp, { once: true }),
      sec(8, cA, [...comp, mel('flute', A, { oct: 1, vel: 0.5, legato: 0.85 })]),
      sec(8, cB, [...comp, jing, mel('viol', B, { oct: 1, vel: 0.5, legato: 0.85 })]),
      sec(8, cA, [...comp, jing, mel('pipe', A, { oct: 1, vel: 0.46, legato: 0.85 }), mel('flute', A, { oct: 2, vel: 0.3, legato: 0.85 }), perc('tom', '. . . . . . | . . . x . x', { vel: 0.36 })]),
    ],
  };
})();

const mystic = {
  id: 'mystic', kind: 'cue', name: '마력의 숨', where: '마법 · 신비한 사건', bpm: 54, beats: 4, root: 60, scale: 'lydian',
  sections: [
    sec(8, '1 | 2 | 1 | 2 | 6 | 2 | 1 | 1', [
      arp('glass', '0 2 4 3 2 4 3 2', { oct: 1, vel: 0.36 }),
      pad('strings', { open: true, vel: 0.24 }),
      pad('choir', { open: true, vel: 0.16, on: after(1) }),
      mel('harp', ". . 5 - | 4 - 6 - | 3 - - - | . . 2 4 | 6 - 1' - | 6 - 4 - | 5 - - - | . . . .", { vel: 0.5 }),
      mel('viol', "5 - - - | 6 - - - | 5 - - - | 4 - - - | 3 - - - | 4 - - - | 3 - - - | - - - -", { oct: 1, vel: 0.26, on: after(1), flat: true }),
      drone('drone', '1', { oct: -2, vel: 0.28 }),
    ]),
  ],
};

const court = (() => {
  const cA = '1 | 4 | 7 | 3 | 1 | 4 | 5 | 1o', cB = '3 | 7 | 4 | 1 | 3 | 7 | 5 | 1o';
  const A = "5 - 3 | 6 - 4 | 4 - 2 | 3 - 5 | 5 - 1' | 6 - 4 | 5 4 2 | 1 - -";
  const B = "7 - 5 | 4 - 2 | 6 - 4 | 5 - 3 | 3 - 7 | 2' - 7 | 5 - 2 | 1 - -";
  const harp = arp('harp', '0 2 3 4 3 2', { vel: 0.46 });
  return {
    id: 'court', kind: 'cue', name: '영주의 방', where: '영지 · 작위 · 다스리기', bpm: 72, beats: 3, root: 55, scale: 'dorian',
    sections: [
      sec(8, cA, [harp, pad('organ', { open: true, vel: 0.22 }), mel('viol', A, { oct: 1, vel: 0.5 })]),
      sec(8, cB, [harp, pad('organ', { vel: 0.22 }), mel('flute', B, { oct: 1, vel: 0.46 }), bass('harp', 'r - 5', { oct: -1, vel: 0.5 })]),
      sec(8, cA, [harp, pad('organ', { open: true, vel: 0.22 }), mel('viol', A, { oct: 1, vel: 0.5 }), under('flute', A, { oct: 2, vel: 0.26, every: 3 }), bass('harp', 'r - a', { oct: -1, vel: 0.5 })]),
    ],
  };
})();

export const TRACKS = [
  title, cradle, spring, summer, autumn, winter, fields, dusk,
  town, market, castle, capital, road, hardship,
  dungeon, underworld, battle, boss, duel, war,
  tense, solemn, festive, mystic, court,
];
void even;

export const track = (id) => TRACKS.find((t) => t.id === id);
