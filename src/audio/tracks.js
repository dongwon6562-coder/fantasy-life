// 곡 목록. 악보 적는 법은 music.js 맨 위에 있다.
// 분위기: 진지한 어른 판타지. 밝은 장조 대신 옛 선법(도리아·믹솔리디아·에올리아·프리지아)을 쓰고,
// 화음은 3음을 뺀 빈 5도를 자주 써서 중세풍으로 건조하게 둔다.
import { mel, arp, pad, strum, perc, drone, gen, sec } from './music.js';

const after = (n) => (loop) => loop >= n;
const odd = (loop) => loop % 2 === 1;
const even = (loop) => loop % 2 === 0;

export const TRACKS = [
  /* ---------- 처음 화면 ---------- */
  {
    id: 'title', gain: 0.9, name: '봉인 이후', where: '처음 화면 · 대를 이을 때', bpm: 66, beats: 3, root: 62, scale: 'dorian',
    sections: [
      sec(4, '1 | 1 | 7 | 7', [
        arp('harp', '0 2 3 2 4 2', { oct: -1, vel: 0.55 }),
        drone('drone', '1 5', { oct: -2, vel: 0.4 }),
      ], { once: true }),
      sec(8, '1 | 1 | 7 | 7 | 1 | 4 | 7 | 1o', [
        arp('harp', '0 2 3 2 4 2', { oct: -1, vel: 0.55 }),
        mel('viol', "5 - - | 4 3 1 | 2 - - | 7, - 1 | 3 - 4 | 5 - 6 | 5 4 2 | 1 - -", { vel: 0.6 }),
        pad('strings', { oct: -1, open: true, vel: 0.38, on: after(1) }),
        mel('bell', '1 - - | . | . | . | . | . | . | .', { oct: -1, vel: 0.45, on: after(1) }),
        drone('drone', '1', { oct: -2, vel: 0.45 }),
      ]),
      sec(8, '3 | 7 | 1 | 1 | 3 | 4 | 5 | 1o', [
        arp('harp', '0 2 3 2 4 2', { oct: -1, vel: 0.55 }),
        pad('strings', { oct: -1, vel: 0.4 }),
        mel('viol', "3 5 7 | 2' - 7 | 1' - - | 6 5 3 | 3 4 5 | 6 - 7 | 2' 1' 7 | 1' - -", { vel: 0.6, on: even }),
        mel('flute', "3 5 7 | 2' - 7 | 1' - - | 6 5 3 | 3 4 5 | 6 - 7 | 2' 1' 7 | 1' - -", { vel: 0.5, on: odd }),
        drone('drone', '1', { oct: -2, vel: 0.45 }),
      ]),
    ],
  },

  /* ---------- 에른 마을의 사계절 ---------- */
  {
    id: 'village_spring', name: '에른의 봄', where: '에른 마을 · 봄', bpm: 84, beats: 3, root: 62, scale: 'mixolydian',
    sections: [
      sec(8, '1 | 1 | 7 | 1 | 1 | 4 | 7 | 1', [
        arp('lute', '0 2 3 4 3 2', { oct: -1, vel: 0.6 }),
        mel('flute', "5 - 6 5 - 3 | 2 - 3 1 - - | 2 - 7, 2 - 4 | 3 - - - - . | 5 - 6 5 - 3 | 4 - 6 1' - 6 | 7 - 5 4 - 2 | 1 - - - - .", { vel: 0.5 }),
        perc('frame', 'x . . o . .', { vel: 0.32, on: after(1) }),
        pad('strings', { oct: -1, open: true, vel: 0.24, on: after(1) }),
      ]),
      sec(8, '5 | 4 | 1 | 1 | 5 | 4 | 7 | 1', [
        arp('lute', '0 2 3 4 3 2', { oct: -1, vel: 0.55 }),
        mel('harp', "2' - 1' 7 - 5 | 6 - 5 4 - - | 3 - 4 5 - 3 | 2 - - 1 - - | 2' - 1' 7 - 5 | 6 - 1' 2' - 1' | 7 - 5 4 - 2 | 1 - - - - .", { vel: 0.6 }),
        pad('strings', { oct: -1, open: true, vel: 0.26 }),
        perc('frame', 'x . . o . .', { vel: 0.3 }),
      ]),
    ],
  },
  {
    id: 'village_summer', name: '긴 낮', where: '에른 마을 · 여름', bpm: 60, beats: 4, root: 65, scale: 'lydian',
    sections: [
      sec(8, '1 | 2 | 1 | 5 | 1 | 2 | 3 | 1', [
        arp('harp', '0 2 3 4 3 2 3 2', { oct: -1, vel: 0.5 }),
        pad('strings', { oct: -1, open: true, vel: 0.28 }),
        mel('flute', "5 - - 3 | 4 - 2 - | 3 - 5 - | 7 - 5 - | 1' - - 6 | 6 - 4 2 | 3 - 5 7 | 5 - - -", { vel: 0.45 }),
        perc('shaker', 'o o x o o o x o', { vel: 0.22 }), // 풀벌레
        drone('drone', '1', { oct: -2, vel: 0.3 }),
      ]),
      sec(4, '6 | 5 | 6 | 5', [
        arp('harp', '0 2 3 4 3 2 3 2', { oct: -1, vel: 0.45 }),
        pad('strings', { oct: -1, open: true, vel: 0.28 }),
        mel('viol', '1 - - - | 7, - - - | 1 - - - | 2 - - -', { vel: 0.42 }),
        perc('shaker', 'o o x o o o x o', { vel: 0.22 }),
      ]),
    ],
  },
  {
    id: 'village_autumn', name: '거둔 뒤', where: '에른 마을 · 가을', bpm: 80, beats: 3, root: 64, scale: 'dorian',
    sections: [
      sec(8, '1 | 7 | 1 | 4 | 1 | 7 | 5 | 1o', [
        arp('lute', '0 2 3 2 4 2', { oct: -1, vel: 0.58 }),
        mel('viol', "5 - 4 | 2 - 7, | 1 2 3 | 4 - - | 5 - 7 | 7 6 4 | 5 - 2 | 1 - -", { vel: 0.55 }),
        perc('frame', 'x . .', { vel: 0.26, on: after(1) }),
      ]),
      sec(8, '3 | 7 | 1 | 1 | 3 | 4 | 5 | 1o', [
        arp('lute', '0 2 3 2 4 2', { oct: -1, vel: 0.55 }),
        pad('strings', { oct: -1, open: true, vel: 0.3 }),
        mel('viol', "3 5 7 | 2' - 7 | 1' - 5 | 3 2 1 | 3 - 5 | 6 - 1' | 2' 1' 7 | 1' - -", { vel: 0.55, on: even }),
        mel('flute', "3 5 7 | 2' - 7 | 1' - 5 | 3 2 1 | 3 - 5 | 6 - 1' | 2' 1' 7 | 1' - -", { vel: 0.48, on: odd }),
        perc('frame', 'x . .', { vel: 0.26 }),
      ]),
    ],
  },
  {
    id: 'village_winter', name: '눈 덮인 밭', where: '에른 마을 · 겨울', bpm: 52, beats: 4, root: 64, scale: 'aeolian',
    sections: [
      sec(8, '1o | 1o | 6 | 6 | 4 | 4 | 5 | 1o', [
        drone('wind', '1', { vel: 0.5, o: { f: 620 } }),
        pad('strings', { oct: -1, open: true, vel: 0.3 }),
        mel('harp', ". 5 3 - | 1 - . . | . 3 1 - | 6, - . . | . 1' 6 - | 4 - . . | . 2' 7 5 | 1 - - -", { vel: 0.62 }),
        mel('viol', '1 - - - | - - - - | 1 - - - | 3 - - - | 1 - - - | 4 - - - | 2 - - - | 1 - - -', { oct: -1, vel: 0.34, on: after(1) }),
        mel('bell', '1 - - - | . | . | . | . | . | . | .', { oct: -1, vel: 0.35, on: odd }),
      ]),
    ],
  },

  /* ---------- 도시와 길 ---------- */
  {
    id: 'town', gain: 0.92, name: '하르펜 성벽 아래', where: '하르펜 (교역 도시)', bpm: 104, beats: 4, root: 62, scale: 'dorian',
    sections: [
      sec(8, '1 | 7 | 1 | 7 1 | 1 | 7 | 3 7 | 1', [
        strum('D . d u . u d u', { oct: -1, vel: 0.5 }),
        arp('lute', '0 . . . 0 . 2 .', { oct: -2, vel: 0.6 }),
        perc('frame', 'X . . x . . x .', { vel: 0.45 }),
        perc('tick', '. . x . . . x .', { vel: 0.3, on: after(1) }),
        mel('viol', "5 - 5 6 5 4 3 - | 2 - 2 3 2 1 7, - | 1 2 3 5 4 3 2 1 | 7, - 2 - 1 - - . | 5 - 5 6 5 4 3 - | 2 - 2 3 4 - 7 - | 7 - 5 3 4 - 2 - | 1 - - - - - . .", { vel: 0.55, legato: 0.85 }),
      ]),
      sec(8, '3 | 7 | 1 | 1 | 3 | 7 | 5 | 1o', [
        strum('D . d u . u d u', { oct: -1, vel: 0.5 }),
        arp('lute', '0 . . . 0 . 2 .', { oct: -2, vel: 0.6 }),
        perc('frame', 'X . . x . . x .', { vel: 0.45 }),
        perc('tick', '. . x . . . x .', { vel: 0.3 }),
        mel('flute', "5 - 7 - 1' 7 5 - | 4 - 5 4 2 - - - | 3 - 5 - 1' - 5 - | 6 5 3 2 1 - - . | 5 - 7 - 1' 7 5 - | 2' - 1' 7 4 - - - | 5 - 7 - 2' - 7 - | 1' - - - - - . .", { vel: 0.5, legato: 0.85 }),
      ]),
    ],
  },
  {
    id: 'castle', name: '베르덴 성채', where: '베르덴 (백작령 성읍)', bpm: 76, beats: 4, root: 62, scale: 'aeolian',
    sections: [
      sec(8, '1 | 6 | 7 | 1 | 1 | 4 | 5M | 1', [
        pad('strings', { oct: -1, vel: 0.34 }),
        arp('lute', '0 . 2 . 3 . 2 .', { oct: -1, vel: 0.42 }),
        perc('war', 'x . . . . . o .', { vel: 0.36 }),
        mel('horn', "1 - 5 - | 6 - - 3 | 4 - 2 7, | 1 - - . | 3 - 5 - | 1' - 6 4 | 5 - 2 - | 1 - - .", { oct: -1, vel: 0.62 }),
      ]),
      sec(8, '3 | 7 | 1 | 5M | 3 | 7 | 5M | 1', [
        pad('strings', { oct: -1, vel: 0.34 }),
        arp('harp', '0 2 3 2 4 2 3 2', { oct: -1, vel: 0.42 }),
        perc('war', 'x . . . . . o .', { vel: 0.3 }),
        mel('viol', "5 - 7 5 | 4 - 2 - | 3 2 1 - | 2 - - . | 5 - 7 1' | 2' - 7 4 | 5 - 2 - | 1 - - .", { vel: 0.55 }),
      ]),
    ],
  },
  {
    id: 'capital', name: '백색 성', where: '왕도 레오카스트', bpm: 66, beats: 4, root: 67, scale: 'mixolydian',
    sections: [
      sec(8, '1 | 7 | 4 | 1 | 1 | 5 | 7 4 | 1o', [
        pad('strings', { oct: -1, vel: 0.3 }),
        pad('choir', { oct: -1, open: true, vel: 0.26, on: after(1) }),
        arp('harp', '0 2 3 2 4 2 3 2', { oct: -1, vel: 0.4 }),
        perc('war', 'x . . . o . . .', { vel: 0.26 }),
        mel('bell', '1 - - - | . | . | . | 1 - - - | . | . | .', { oct: -1, vel: 0.36 }),
        mel('horn', "1 - 3 5 | 4 - - 2 | 6 - 4 - | 5 - - . | 1' - 7 5 | 7 - 5 2 | 4 - 6 - | 5 - - -", { oct: -1, vel: 0.58 }),
        mel('strings', "1 - 3 5 | 4 - - 2 | 6 - 4 - | 5 - - . | 1' - 7 5 | 7 - 5 2 | 4 - 6 - | 5 - - -", { vel: 0.3, o: { attack: 0.18, release: 0.4 }, on: after(1) }),
      ]),
      sec(8, '6 | 4 | 2 | 5 | 6 | 4 | 7 | 1', [
        pad('strings', { oct: -1, vel: 0.3 }),
        pad('choir', { oct: -1, open: true, vel: 0.24, on: after(1) }),
        arp('harp', '0 2 3 2 4 2 3 2', { oct: -1, vel: 0.4 }),
        mel('viol', "3 - 1 6, | 1 - 4 - | 6 - 4 2 | 5 - - . | 3 - 6 3 | 4 - 6 1' | 7 - 4 2 | 1 - - -", { vel: 0.52 }),
      ]),
    ],
  },
  {
    id: 'road', name: '먼 길', where: '길 위 (여행·이사)', bpm: 92, beats: 4, root: 57, scale: 'dorian',
    sections: [
      sec(8, '1 | 1 | 7 | 4 | 1 | 3 | 7 | 1', [
        arp('lute', '0 2 3 2 0 2 3 2', { vel: 0.5 }),
        perc('frame', 'x . . . o . . .', { vel: 0.34 }), // 발걸음
        drone('wind', '1', { vel: 0.32, o: { f: 480 } }),
        pad('strings', { open: true, vel: 0.22, on: after(1) }),
        mel('viol', "1 - - 2 | 3 - 5 - | 4 - 2 - | 6 - 4 - | 5 - - 3 | 5 - 7 - | 4 - 7 2' | 1' - - .", { vel: 0.55 }),
      ]),
      sec(8, '4 | 1 | 4 | 5 | 4 | 1 | 7 | 1', [
        arp('lute', '0 2 3 2 0 2 3 2', { vel: 0.45 }),
        perc('frame', 'x . . . o . . .', { vel: 0.34 }),
        drone('wind', '1', { vel: 0.32, o: { f: 480 } }),
        pad('strings', { open: true, vel: 0.24 }),
        mel('harp', "6 - 4 6 1' - 6 - | 5 - 3 5 1' - - - | 6 - 4 6 1' - 2' - | 2' - 7 - 5 - - - | 6 - 4 6 1' - 6 - | 5 - 3 5 3 - 1 - | 7, - 2 - 4 - 2 - | 1 - - - - - . .", { oct: 1, vel: 0.52 }),
      ]),
    ],
  },

  /* ---------- 미궁과 싸움 ---------- */
  {
    id: 'dungeon', gain: 0.85, name: '회색 굴', where: '미궁', bpm: 50, beats: 4, root: 50, scale: 'phrygian',
    sections: [
      sec(8, '1o | - | 2o | 1o | 1o | - | 7o | 1o', [
        drone('drone', '1', { oct: -1, vel: 0.55 }),
        drone('wind', '1', { vel: 0.42, o: { f: 210, q: 1.6 } }),
        pad('choirOo', { open: true, vel: 0.26 }),
        mel('harp', '. . 5 - | 6 - 5 - | . . . . | 2 - 1 - | . | . | . . 7, - | 1 - - -', { vel: 0.42, on: odd }),
        gen(({ bar, rnd, deg }) => {
          const ev = [];
          if (rnd() < 0.55) ev.push({ beat: rnd() * 3.5, inst: 'glass', midi: deg(['1', '2', '5', '4'][Math.floor(rnd() * 4)]) + 36, dur: 1, vel: 0.12 + rnd() * 0.16 }); // 물방울
          if (rnd() < 0.2) ev.push({ beat: rnd() * 3, perc: 'war', vel: 0.16 + rnd() * 0.14 }); // 멀리서 무너지는 소리
          if (bar === 0) ev.push({ beat: 0, inst: 'bell', midi: deg('1') - 12, dur: 4, vel: 0.26, o: { decay: 6 } });
          return ev;
        }),
      ]),
    ],
  },
  {
    id: 'battle', gain: 0.9, name: '칼을 뽑다', where: '전투', bpm: 138, beats: 4, root: 50, scale: 'aeolian',
    sections: [
      sec(8, '1 | 1 | 6 | 7 | 1 | 1 | 6 | 5M', [
        arp('strings', '0 0 2 0 0 0 2 0', { vel: 0.5, legato: 0.5, o: { attack: 0.012, release: 0.07 } }),
        arp('strings', '0 . 0 . 0 . 0 .', { oct: -1, vel: 0.5, legato: 0.5, o: { attack: 0.012, release: 0.09 } }),
        perc('war', 'X . . x . . x .', { vel: 0.7 }),
        perc('tom', '. . x . . x . (x x)', { vel: 0.42 }),
        perc('tick', '. x . x . x . x', { vel: 0.2, on: after(1) }),
        mel('horn', "1 - - - - - 5 - | 4 - 3 - 1 - - - | 3 - - - - - 1 - | 2 - 4 - 2 - - - | 1 - - - - - 5 - | 1' - 7 - 5 - - - | 6 - - - 1' - 6 - | 5 - - - - - - .", { oct: 1, vel: 0.62 }),
      ]),
      sec(8, '4 | 1 | 4 | 5M | 6 | 7 | 5M | 5M', [
        arp('strings', '0 0 2 0 0 0 2 0', { vel: 0.5, legato: 0.5, o: { attack: 0.012, release: 0.07 } }),
        arp('strings', '0 . 0 . 0 . 0 .', { oct: -1, vel: 0.5, legato: 0.5, o: { attack: 0.012, release: 0.09 } }),
        perc('war', 'X . . x . . x .', { vel: 0.7 }),
        perc('tom', '. . x . . x . (x x)', { vel: 0.42 }),
        perc('tick', '. x . x . x . x', { vel: 0.2 }),
        pad('choir', { open: true, vel: 0.3 }),
        mel('horn', '4 - - - | 1 - - - | 4 - - - | 5 - - - | 6 - - - | 7 - - - | 5 - - - | 5 - - -', { vel: 0.5 }),
        mel('viol', "4 6 1' 6 4 6 1' 6 | 3 5 1' 5 3 5 1' 5 | 4 6 1' 6 2' 1' 6 4 | 5 - - - 2 - 5 - | 6 1' 3' 1' 6 1' 3' 1' | 7 2' 4' 2' 7 2' 4' 2' | 5' - - - 2' - - - | 5 - 5 5 5 - 5 5", { oct: 1, vel: 0.52, legato: 0.8 }),
      ]),
    ],
  },
  {
    id: 'boss', gain: 0.9, name: '물러설 곳 없다', where: '숙적 · 강한 적', bpm: 96, beats: 4, root: 52, scale: 'phrygian',
    sections: [
      sec(8, '1o | 1o | 2 | 1o | 1o | 7 | 2 | 1o', [
        arp('strings', '0 . 0 0 . 0 0 .', { oct: -1, vel: 0.55, legato: 0.5, o: { attack: 0.012, release: 0.09 } }),
        pad('strings', { open: true, vel: 0.26, o: { trem: true } }),
        perc('war', 'X . . x . . . . | X . . x . x x .', { vel: 0.8 }),
        mel('bell', '1 - - - | . | . | . | 1 - - - | . | . | .', { vel: 0.4 }),
        mel('choirOo', "1 - 2 1 | 7, - 1 - | 4 - 3 2 | 1 - - . | 1 - 2 1 | 2 - 4 - | 6 - 4 2 | 1 - - .", { vel: 0.5, o: { attack: 0.12, release: 0.4 } }),
        mel('horn', "1 - 2 1 | 7, - 1 - | 4 - 3 2 | 1 - - . | 1 - 2 1 | 2 - 4 - | 6 - 4 2 | 1 - - .", { vel: 0.52 }),
        mel('viol', "1 - 2 1 | 7, - 1 - | 4 - 3 2 | 1 - - . | 1 - 2 1 | 2 - 4 - | 6 - 4 2 | 1 - - .", { oct: 1, vel: 0.42, on: after(1) }),
      ]),
      sec(4, '1o', [
        arp('strings', '0 . 0 0 . 0 0 .', { oct: -1, vel: 0.55, legato: 0.5, o: { attack: 0.012, release: 0.09 } }),
        perc('war', 'X . . x . . . . | X . . x . x x .', { vel: 0.8 }),
        perc('tom', '. . . . x . x x', { vel: 0.4 }),
        mel('strings', '1 - - - | 2 - - - | 3 - - - | 2 - - -', { oct: 1, vel: 0.34, o: { trem: true } }),
      ]),
    ],
  },

  /* ---------- 사건 ---------- */
  {
    id: 'tense', name: '불길한 소식', where: '위험한 사건', bpm: 60, beats: 4, root: 57, scale: 'aeolian',
    sections: [
      sec(4, '1o | 1o | 6 | 5o', [
        pad('strings', { oct: -1, open: true, vel: 0.34, o: { trem: true } }),
        perc('heart', 'X x . . . . . .', { vel: 0.5 }),
        mel('harp', '1 . . 3 | 2 - . . | 6, . . 1 | 7, - . .', { vel: 0.5 }),
        drone('drone', '1', { oct: -2, vel: 0.4 }),
      ]),
      sec(4, '1o | 1o | 6 | 5o', [
        pad('strings', { oct: -1, open: true, vel: 0.34, o: { trem: true } }),
        perc('heart', 'X x . . . . . .', { vel: 0.5 }),
        mel('harp', '1 . . 3 | 2 - . . | 6, . . 1 | 7, - . .', { vel: 0.5 }),
        mel('viol', '5 - - - | - - - - | 6 - - - | 5 - - -', { oct: 1, vel: 0.36 }),
        drone('drone', '1', { oct: -2, vel: 0.4 }),
      ]),
    ],
  },
  {
    id: 'solemn', gain: 0.85, name: '떠난 이를 위하여', where: '죽음 · 장례 · 삶의 끝', bpm: 46, beats: 4, root: 62, scale: 'aeolian',
    sections: [
      sec(8, '1 | 6 | 4 | 5M | 1 | 6 | 7 | 1o', [
        pad('choirOo', { oct: -1, vel: 0.36 }),
        mel('bell', '1 - - - | . | 1 - - - | . | 1 - - - | . | 1 - - - | .', { oct: -1, vel: 0.42 }),
        mel('viol', "5 - - 4 | 3 - - 1 | 4 - 6 - | 5 - - - | 1' - - 7 | 6 - - 3 | 4 - 2 - | 1 - - -", { vel: 0.5 }),
        drone('drone', '1', { oct: -2, vel: 0.32 }),
      ]),
    ],
  },
  {
    id: 'festive', gain: 0.95, name: '수확제', where: '축제 · 혼례 · 잔치', bpm: 132, beats: 3, root: 57, scale: 'dorian',
    sections: [
      sec(8, '1 | 1 | 7 | 7 | 1 | 4 | 7 | 1', [
        strum('D . u d . u', { vel: 0.5 }),
        arp('lute', '0 . . 2 . .', { oct: -1, vel: 0.6 }),
        perc('frame', 'X . o x . o', { vel: 0.5 }),
        perc('jingle', '. . x . . x', { vel: 0.3, on: after(1) }),
        mel('flute', "1 - 3 5 - 3 | 5 6 5 3 - 1 | 7, - 2 4 - 2 | 4 5 4 2 - 7, | 1 - 3 5 - 3 | 6 - 1' 6 - 4 | 7 - 4 2 4 2 | 1 - - 1 . .", { oct: 1, vel: 0.5, legato: 0.85 }),
      ]),
      sec(8, '3 | 7 | 1 | 5 | 3 | 7 | 5 | 1', [
        strum('D . u d . u', { vel: 0.5 }),
        arp('lute', '0 . . 2 . .', { oct: -1, vel: 0.6 }),
        perc('frame', 'X . o x . o', { vel: 0.5 }),
        perc('jingle', '. . x . . x', { vel: 0.3 }),
        mel('viol', "5 - 7 1' - 7 | 2' - 7 4 - 2 | 3 - 5 1' - 5 | 7 - 5 2 - - | 5 - 7 1' - 7 | 2' - 7 2' - 4' | 2' 1' 7 5 - 7 | 1' - - 1' . .", { oct: 1, vel: 0.5, legato: 0.85 }),
      ]),
    ],
  },
  {
    id: 'mystic', name: '마력의 숨', where: '마법 · 신비한 사건', bpm: 54, beats: 4, root: 60, scale: 'lydian',
    sections: [
      sec(8, '1 | 2 | 1 | 2 | 6 | 2 | 1 | 1', [
        arp('glass', '0 2 4 3 2 4 3 2', { oct: 1, vel: 0.36 }),
        pad('strings', { open: true, vel: 0.24 }),
        pad('choir', { open: true, vel: 0.16, on: after(1) }),
        mel('harp', ". . 5 - | 4 - 6 - | 3 - - - | . . 2 4 | 6 - 1' - | 6 - 4 - | 5 - - - | . . . .", { vel: 0.5 }),
        drone('drone', '1', { oct: -2, vel: 0.28 }),
      ]),
    ],
  },
  {
    id: 'hardship', gain: 0.88, name: '흉년', where: '기근 · 역병이 든 때', bpm: 56, beats: 3, root: 52, scale: 'aeolian',
    sections: [
      sec(8, '1o | 1o | 7 | 7 | 1o | 4 | 5 | 1o', [
        drone('drone', '1 5', { oct: -1, vel: 0.36 }),
        drone('wind', '1', { vel: 0.28, o: { f: 400 } }),
        arp('lute', '0 . 2 . 3 .', { vel: 0.4 }),
        mel('viol', "1 - 2 | 3 - - | 2 - 1 | 7, - - | 1 - 3 | 4 - 6 | 5 2 - | 1 - -", { oct: 1, vel: 0.5 }),
      ]),
    ],
  },
];

export const track = (id) => TRACKS.find((t) => t.id === id);
