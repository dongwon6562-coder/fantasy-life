// 시대가 보이는 풍경 (34단계): 기술이 하나 나올 때마다 풍경에 작은 것이 하나씩 조용히 선다.
// 풍차, 유리창, 벽돌 가마, 포장길, 시계, 기중기, 온실, 물탑, 등석 가로등, 마석 방아의 굴뚝, 전신탑, 펌프, 용광로,
// 그리고 한참 뒤의 쇠수레 길과 쇠 다리, 더 뒤의 증기선, 아주 먼 뒤의 비행선.
// scene.js가 부른다. 본래 마을의 배치는 건드리지 않고(따로 쓰는 씨앗) 그 위와 둘레에 얹기만 한다.
// 큰 도시가 먼저 바뀌고 시골은 늦게 따라온다. 사람(과 드워프)의 땅만 바뀐다. 엘프 숲, 수인 초원, 마족 땅, 유적은 그대로다.
import { hash, rgba, dark, light, poly, puff } from './sceneKit.js';
import { windmill } from './sceneTown.js';

// 풍경의 층 하나마다, 그것을 여는 기술 id들 (하나라도 나왔으면 열린다). 기술 나무(src/techtree/)의 id가 바뀌면 이 표만 고친다.
export const TECH = {
  windmill: ['windmill'], // 풍차
  glass: ['glass'], // 맑은 유리창
  brick: ['brick'], // 벽돌 가마
  paving: ['paving'], // 포장길
  clock: ['clock'], // 시계탑
  crane: ['crane'], // 항구 기중기
  green: ['greenhouse'], // 온실
  water: ['waterworks'], // 물탑
  lamps: ['streetlamp'], // 등석 가로등
  mill: ['manamill'], // 마석 방아 (도시)
  signal: ['signal'], // 전신탑
  ruralmill: ['erngrind'], // 마석 방아 (시골)
  pump: ['pump'], // 마석 펌프
  forge: ['forge'], // 마석 화로 대장간
  furnace: ['furnace'], // 높은 용광로
  mine: ['deepmine'], // 깊은 마석 갱
  cart: ['ironcart'], // 쇠수레
  factory: ['factory'], // 마력 공장
  rail: ['railroad'], // 쇠수레 길
  northrail: ['northrail'], // 북쪽까지 닿은 쇠수레 길
  bridge: ['bridge'], // 쇠 다리
  hull: ['hull'], // 쇠 선체, 조선소
  steam: ['steamship'], // 증기선
  airship: ['airship'], // 비행선
  skyline: ['skyline'], // 정기 비행선과 계류탑
};
// 새 것이 그 고장에 닿기까지 늦는 정도. 그 뒤로 나온 기술 가짓수로 센다 (작은 기술이 몇 해에 하나이니 시골은 한 세대쯤 늦다)
const LAG = { capital: 0, city: 1, town: 3, village: 6, hamlet: 9, fort: 5 };
// 시골에서 먼저 쓰는 것, 도시에만 서는 것
const RURAL = { windmill: 1, ruralmill: 1, pump: 1, mine: 1 }, URBAN = { clock: 1, green: 1, water: 1, mill: 1, forge: 1, furnace: 1, cart: 1, factory: 1, crane: 1, hull: 1, skyline: 1 };

/**
 * 그 고장의 시대 모습.
 * read: { has(id) 나왔는가, since(id) 그 뒤로 나온 기술 수(모르면 99), n 나온 기술 수 }, D: 장소, human: 사람·드워프 문화인가
 * 돌려주는 것: null(바뀐 것 없음) 또는 층마다 '자리 잡은 정도'(0부터, 없으면 undefined)와 grow(늘어난 집의 몫)
 */
export function eraOf(read, D, human) {
  if (!read || !read.n || !human || D.size === 'ruin' || D.size === 'site' || D.camp) return null;
  const lag = LAG[D.size] ?? 6, urban = lag <= 3, E = { n: read.n, urban };
  let any = false;
  for (const key in TECH) {
    const id = TECH[key].find((x) => read.has(x)); if (!id) continue;
    if (URBAN[key] && !urban) continue;
    const lv = read.since(id) - (RURAL[key] ? Math.min(lag, 2) : lag);
    if (lv >= 0) { E[key] = lv; any = true; }
  }
  // 고장은 아주 천천히 커진다: 기술 쉰 가지가 쌓여야 집이 반쯤 는다
  E.grow = Math.max(0, Math.min(0.5, (read.n - lag * 2 - 4) / 90));
  return any || E.grow > 0 ? E : null;
}
/** 이 고장에 보이는 층의 서명 (그림을 다시 그릴지 가리는 데 쓴다) */
export const eraKey = (E) => (E ? Object.keys(TECH).map((k) => (E[k] === undefined ? '' : Math.min(E[k], 12).toString(36))).join('.') + '/' + Math.round(E.grow * 40) : '');

const sdOf = (S) => -S.dir;
const windOf = (e) => (hash(e.k, 21) - 0.5) * 9;

/** 벽돌 굴뚝과 연기. o.blue면 마석 화로(푸른 불빛과 옅은 김) */
export function stack(L, x, y, h, w, e, o = {}) {
  const { S, P } = e, sd = sdOf(S), brick = o.color ?? '#7a5444';
  poly(L, [[x - w / 2, y], [x + w / 2, y], [x + w * 0.34, y - h], [x - w * 0.34, y - h]], brick);
  poly(L, sd > 0 ? [[x + w * 0.1, y], [x + w / 2, y], [x + w * 0.34, y - h], [x + w * 0.08, y - h]] : [[x - w * 0.1, y], [x - w / 2, y], [x - w * 0.34, y - h], [x - w * 0.08, y - h]], dark(brick, 0.36));
  L.fillStyle = dark(brick, 0.5); L.fillRect(x - w * 0.42, y - h - 2, w * 0.84, 3); L.fillRect(x - w * 0.42, y - h * 0.62, w * 0.84, 1.4);
  if (P.snow) { L.fillStyle = '#e4e7e8'; L.fillRect(x - w * 0.42, y - h - 3, w * 0.84, 1.6); }
  const wind = windOf(e), c = S.tod === 'night' ? '#4c4e5a' : o.blue ? '#c2ccd2' : '#8c877f', sc = h / 50;
  for (let i = 0; i < 13; i++) puff(L, x + wind * i * 1.5 * sc + Math.sin(i * 1.1 + x) * 3, y - h - 4 - i * 6.5 * sc, (4 + i * 2.3) * sc, (3.4 + i * 1.9) * sc, c, (o.blue ? 0.42 : 0.56) - i * 0.038);
  if (e.smokeOn.length < 12) e.smokeOn.push([Math.round(x + wind * 8 * sc), Math.round(y - h - 44 * sc), 1.3 * sc]);
  if (o.blue) e.wins.push([x - w * 0.22, y - h - 4, w * 0.44, 3, 900 + Math.round(x), '#8fd0ff', true]);
}
/** 공장: 톱니 지붕의 긴 벽돌 건물, 줄지은 창 */
export function factory(L, x, y, s, e) {
  const { S, P, wins } = e, sd = sdOf(S), w = 84 * s, h = 22 * s, wall = '#84705f', x0 = x - w / 2;
  poly(L, [[x0, y], [x0 + w, y], [x0 + w, y - h], [x0, y - h]], wall);
  poly(L, sd > 0 ? [[x0 + w, y], [x0 + w + 8 * s, y - 3 * s], [x0 + w + 8 * s, y - h - 3 * s], [x0 + w, y - h]] : [[x0, y], [x0 - 8 * s, y - 3 * s], [x0 - 8 * s, y - h - 3 * s], [x0, y - h]], dark(wall, 0.4));
  for (let i = 0; i < 4; i++) { const a = x0 + (i * w) / 4, b = a + w / 4; poly(L, [[a, y - h], [b, y - h], [b, y - h - 10 * s]], P.snow ? '#e4e7e8' : '#4c4842'); poly(L, [[b - 2.4 * s, y - h - 8 * s], [b, y - h - 10 * s], [b, y - h]], rgba('#c8d8e0', 0.5)); }
  L.fillStyle = rgba('#1a120c', 0.22); L.fillRect(x0, y - h, w, 2 * s);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 9; c++) { const wx = x0 + 5 * s + c * 8.6 * s, wy = y - h + 5 * s + r * 8 * s; L.fillStyle = '#231a14'; L.fillRect(wx, wy, 4 * s, 5 * s); wins.push([wx, wy, 4 * s, 5 * s, 2100 + r * 9 + c + Math.round(x), '#ffd49a']); }
  L.fillStyle = '#2a1e16'; L.fillRect(x - 5 * s, y - 11 * s, 10 * s, 11 * s);
}
/** 등석 가로등: 낮에는 꺼져 있고 해 질 녘부터 켜진다 */
export function lamp(L, x, y, s, e, key) {
  L.fillStyle = '#2a2622'; L.fillRect(x - 0.6 * s, y - 15 * s, 1.2 * s, 15 * s); L.fillRect(x - 2 * s, y - 17.6 * s, 4 * s, 1.1 * s);
  L.fillStyle = '#69727c'; L.fillRect(x - 1.5 * s, y - 16.5 * s, 3 * s, 2.6 * s);
  e.wins.push([x - 1.4 * s, y - 16.4 * s, 2.8 * s, 2.4 * s, key, '#d6ecff', 'night']);
}
/** 마도 전신탑: 얽은 쇠기둥 꼭대기의 푸른 빛과 신호 팔 */
export function signalTower(L, x, y, s, e) {
  const h = 60 * s; L.strokeStyle = '#3a3230'; L.lineWidth = Math.max(1, 1.3 * s); L.lineCap = 'round';
  L.beginPath(); L.moveTo(x - 7 * s, y); L.lineTo(x - 2 * s, y - h); L.moveTo(x + 7 * s, y); L.lineTo(x + 2 * s, y - h);
  for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6, w0 = 7 - 5 * t0, w1 = 7 - 5 * t1; L.moveTo(x + (i % 2 ? -1 : 1) * w0 * s, y - h * t0); L.lineTo(x + (i % 2 ? 1 : -1) * w1 * s, y - h * t1); }
  L.stroke();
  L.fillStyle = '#3a3230'; L.fillRect(x - 5 * s, y - h - 1, 10 * s, 2 * s);
  L.lineWidth = Math.max(1, 1.6 * s); L.beginPath(); L.moveTo(x, y - h); L.lineTo(x - 9 * s, y - h - 7 * s); L.moveTo(x, y - h); L.lineTo(x + 10 * s, y - h - 3 * s); L.moveTo(x, y - h); L.lineTo(x, y - h - 8 * s); L.stroke();
  L.fillStyle = '#4a5a6a'; L.fillRect(x - 2 * s, y - h - 11 * s, 4 * s, 4 * s);
  e.wins.push([x - 1.6 * s, y - h - 10.6 * s, 3.2 * s, 3.2 * s, 1500, '#8fd0ff', true]);
}
/** 쇠수레 길: 자갈 둑, 침목, 두 줄 쇠 */
export function rails(L, e, yAt, x0, x1) {
  const { P } = e;
  L.fillStyle = rgba(P.snow ? '#b8b6b0' : '#6c645a', 0.92); L.beginPath(); L.moveTo(x0, yAt(x0) - 1.5);
  for (let x = x0; x <= x1; x += 8) L.lineTo(x, yAt(x) - 1.5); for (let x = x1; x >= x0; x -= 8) L.lineTo(x, yAt(x) + 4.5); L.closePath(); L.fill();
  L.fillStyle = 'rgba(58,44,32,.7)'; for (let x = x0; x < x1; x += 9) L.fillRect(x, yAt(x) - 1, 2, 4.4);
  L.strokeStyle = '#4a4642'; L.lineWidth = 1;
  for (const dy of [0, 2.8]) { L.beginPath(); for (let x = x0; x <= x1; x += 8) (x === x0 ? L.moveTo(x, yAt(x) + dy) : L.lineTo(x, yAt(x) + dy)); L.stroke(); }
}
/** 마석로 쇠수레와 딸린 수레들. dir: 가는 쪽 */
export function train(L, x, yAt, s, dir, e, cars = 3) {
  const y = (px) => yAt(px) - 0.5, f = dir;
  const box = (off, w, h, c, lift = 2.4) => { const a = x - f * off, b = a - f * w, xm = (a + b) / 2, yy = y(xm) - lift * s; L.fillStyle = c; L.fillRect(Math.min(a, b), yy - h, Math.abs(w), h); return [xm, yy]; };
  const wheels = (off, w, n) => { L.fillStyle = '#1c1c20'; for (let i = 0; i < n; i++) { const px = x - f * (off + (w * (i + 0.5)) / n); L.beginPath(); L.arc(px, y(px) - 1.6 * s, 2.3 * s, 0, 7); L.fill(); } };
  // 딸린 수레
  for (let i = 0; i < cars; i++) { const off = (28 + i * 17) * s; box(off, 15 * s, 7.5 * s, ['#6a4a34', '#4a4e44', '#5a3a30'][i % 3]); L.fillStyle = 'rgba(0,0,0,.2)'; L.fillRect(Math.min(x - f * off, x - f * (off + 15 * s)), y(x - f * off) - 6 * s, 15 * s, 2 * s); wheels(off, 15 * s, 2); }
  // 앞머리: 둥근 화통, 기관칸, 굴뚝
  box(0, 17 * s, 7 * s, '#2c2e36'); const [cx, cy] = box(17 * s, 8 * s, 11.5 * s, '#3a3c46');
  L.fillStyle = '#b89a48'; L.fillRect(Math.min(x, x - f * 17 * s), y(x) - 7 * s, 17 * s, 1 * s);
  const fx = x - f * 3.4 * s; L.fillStyle = '#1e2026'; L.fillRect(fx - 1.6 * s, y(fx) - 16.5 * s, 3.2 * s, 7.4 * s); L.fillRect(fx - 2.4 * s, y(fx) - 17.4 * s, 4.8 * s, 1.4 * s);
  wheels(0, 25 * s, 3);
  e.wins.push([cx - 2 * s, cy - 9.4 * s, 4 * s, 3.4 * s, 1700, '#9ad8ff', true]);
  for (let i = 0; i < 8; i++) puff(L, fx - f * i * 7 * s + windOf(e) * i * 0.4, y(fx) - 19 * s - i * 3.2 * s, (2.4 + i * 1.5) * s, (2 + i * 1.2) * s, e.S.tod === 'night' ? '#5a6070' : '#e2e4e2', 0.5 - i * 0.055);
}
/** 간이역: 낮은 지붕과 승강장 */
export function station(L, x, y, s, e) {
  const { P, wins } = e; L.fillStyle = '#8a7a66'; L.fillRect(x - 16 * s, y - 2 * s, 32 * s, 2.4 * s);
  L.fillStyle = '#a89478'; L.fillRect(x - 9 * s, y - 11 * s, 18 * s, 9 * s); poly(L, [[x - 14 * s, y - 11 * s], [x + 14 * s, y - 11 * s], [x + 10 * s, y - 16 * s], [x - 10 * s, y - 16 * s]], P.snow ? '#e4e7e8' : '#5a4636');
  L.fillStyle = '#231a14'; L.fillRect(x - 6 * s, y - 9 * s, 3 * s, 4 * s); L.fillRect(x + 3 * s, y - 9 * s, 3 * s, 4 * s); wins.push([x - 6 * s, y - 9 * s, 3 * s, 4 * s, 1801, '#ffd49a'], [x + 3 * s, y - 9 * s, 3 * s, 4 * s, 1802, '#ffd49a']);
  L.fillStyle = '#33221a'; L.fillRect(x - 1.4 * s, y - 8 * s, 2.8 * s, 6 * s);
}
/** 마석 증기선: 검은 선체, 굴뚝 둘, 옆바퀴, 돛 없는 돛대 */
export function steamship(L, x, y, s, e, flip) {
  const f = flip ? -1 : 1, { S, wins } = e;
  L.strokeStyle = 'rgba(236,240,238,.5)'; L.lineWidth = 1.2 * s; L.beginPath(); L.moveTo(x - 36 * s * f, y + 2.4 * s); L.lineTo(x - 78 * s * f, y + 3.4 * s); L.moveTo(x + 34 * s * f, y + 2.6 * s); L.lineTo(x + 44 * s * f, y + 3 * s); L.stroke();
  poly(L, [[x - 36 * s * f, y - 7 * s], [x + 42 * s * f, y - 9 * s], [x + 33 * s * f, y + 2 * s], [x - 32 * s * f, y + 2 * s]], '#2c2828');
  poly(L, [[x - 35.6 * s * f, y - 7 * s], [x + 41 * s * f, y - 9 * s], [x + 40 * s * f, y - 7.4 * s], [x - 35 * s * f, y - 5.4 * s]], '#8a3a30');
  // 갑판실과 선창
  const hx = Math.min(x - 20 * s * f, x + 8 * s * f); L.fillStyle = '#cfc6b4'; L.fillRect(hx, y - 14 * s, 28 * s, 6.4 * s); L.fillStyle = rgba('#1a120c', 0.22); L.fillRect(hx, y - 9 * s, 28 * s, 1.4 * s);
  for (let i = 0; i < 6; i++) { const wx = hx + 2.4 * s + i * 4.4 * s; L.fillStyle = '#231a14'; L.fillRect(wx, y - 12.6 * s, 2 * s, 2.4 * s); wins.push([wx, y - 12.6 * s, 2 * s, 2.4 * s, 1900 + i, '#ffd49a']); }
  // 돛대
  L.strokeStyle = '#2a2018'; L.lineWidth = 1.1 * s; L.beginPath(); L.moveTo(x + 26 * s * f, y - 8 * s); L.lineTo(x + 26 * s * f, y - 36 * s); L.moveTo(x - 28 * s * f, y - 7 * s); L.lineTo(x - 28 * s * f, y - 30 * s); L.moveTo(x + 26 * s * f, y - 34 * s); L.lineTo(x + 41 * s * f, y - 9 * s); L.stroke();
  // 굴뚝 둘과 연기
  const wind = windOf(e);
  for (const k of [-6, 4]) { const cx = x + k * s * f; L.fillStyle = '#1e1c1e'; L.fillRect(cx - 2.2 * s, y - 29 * s, 4.4 * s, 15 * s); L.fillStyle = '#b89a48'; L.fillRect(cx - 2.2 * s, y - 26 * s, 4.4 * s, 1.6 * s);
    for (let i = 0; i < 10; i++) puff(L, cx - f * i * 6 * s + wind * i * 0.5, y - 31 * s - i * 3.6 * s, (2.6 + i * 1.7) * s, (2.2 + i * 1.3) * s, S.tod === 'night' ? '#4c4e5a' : '#77736e', 0.5 - i * 0.045); }
  // 옆바퀴 덮개
  L.fillStyle = '#5a3a30'; L.beginPath(); L.arc(x - 1 * s * f, y - 1 * s, 9 * s, Math.PI, 0); L.fill(); L.strokeStyle = '#2a1c18'; L.lineWidth = 0.8 * s; for (let i = 1; i < 6; i++) { const a = Math.PI + (i / 6) * Math.PI; L.beginPath(); L.moveTo(x - 1 * s * f, y - 1 * s); L.lineTo(x - 1 * s * f + Math.cos(a) * 9 * s, y - 1 * s + Math.sin(a) * 9 * s); L.stroke(); }
  wins.push([x - 2.6 * s * f, y - 3.4 * s, 3 * s, 2 * s, 1950, '#9ad8ff', true]);
}
/** 마도 비행선: 뼈대가 비치는 긴 기낭, 아래 매단 선실, 꼬리 날개 */
export function airship(L, x, y, s, e, flip) {
  const f = flip ? -1 : 1, { S, wins } = e, skin = '#b9ad95', rx = 64 * s, ry = 15 * s;
  // 꼬리 날개 (기낭 뒤)
  poly(L, [[x - 50 * s * f, y - 4 * s], [x - 72 * s * f, y - 20 * s], [x - 66 * s * f, y - 2 * s]], '#7a3a30'); poly(L, [[x - 50 * s * f, y + 4 * s], [x - 72 * s * f, y + 19 * s], [x - 66 * s * f, y + 2 * s]], '#6a3028');
  // 기낭: 앞은 둥글고 뒤는 가늘다
  const body = () => { L.beginPath(); L.moveTo(x + rx * f, y); L.bezierCurveTo(x + rx * f, y - ry * 1.25, x - rx * 0.2 * f, y - ry * 1.3, x - rx * 1.08 * f, y); L.bezierCurveTo(x - rx * 0.2 * f, y + ry * 1.3, x + rx * f, y + ry * 1.25, x + rx * f, y); L.closePath(); };
  body(); L.fillStyle = skin; L.fill();
  L.save(); body(); L.clip();
  L.fillStyle = rgba(dark(skin, 0.5), 0.55); L.fillRect(x - rx * 1.2, y + ry * 0.1, rx * 2.4, ry * 1.4);
  L.fillStyle = rgba(light(skin, 0.5), 0.5); L.fillRect(x - rx * 1.2, y - ry * 1.3, rx * 2.4, ry * 0.5);
  L.strokeStyle = rgba('#4a4034', 0.4); L.lineWidth = 0.8 * s; for (let i = -4; i <= 4; i++) { L.beginPath(); L.ellipse(x + i * rx * 0.2 * f, y, rx * 0.05, ry * 1.3, 0, 0, 7); L.stroke(); }
  L.beginPath(); L.moveTo(x - rx * 1.1, y); L.lineTo(x + rx * 1.1, y); L.stroke();
  L.fillStyle = rgba('#7a3a30', 0.9); L.fillRect(Math.min(x + rx * 0.5 * f, x + rx * 0.62 * f), y - ry * 1.3, rx * 0.12, ry * 2.6);
  L.restore();
  L.fillStyle = rgba(S.dir > 0 ? '#fff4dc' : '#101420', 0.12); body(); L.fill();
  // 매단 줄과 선실
  L.strokeStyle = '#2a2018'; L.lineWidth = 0.7 * s; L.beginPath(); for (const k of [-16, -6, 6, 16]) { L.moveTo(x + k * 1.3 * s * f, y + ry * 0.9); L.lineTo(x + k * s * f, y + 19 * s); } L.stroke();
  const gx = Math.min(x - 17 * s * f, x + 17 * s * f); L.fillStyle = '#4a3626'; L.fillRect(gx, y + 19 * s, 34 * s, 6.4 * s); poly(L, [[x + 17 * s * f, y + 19 * s], [x + 23 * s * f, y + 21 * s], [x + 17 * s * f, y + 25.4 * s]], '#3e2c1e'); L.fillStyle = '#b89a48'; L.fillRect(gx, y + 19 * s, 34 * s, 0.9 * s);
  for (let i = 0; i < 6; i++) { const wx = gx + 3 * s + i * 5 * s; L.fillStyle = '#231a14'; L.fillRect(wx, y + 20.6 * s, 2.6 * s, 2.4 * s); wins.push([wx, y + 20.6 * s, 2.6 * s, 2.4 * s, 2300 + i, '#ffd49a']); }
  // 마석 기관: 뒤쪽의 푸른 빛
  L.fillStyle = '#3a3c46'; L.fillRect(Math.min(x - 24 * s * f, x - 18 * s * f), y + 21 * s, 6 * s, 3.4 * s);
  wins.push([x - 25 * s * f - 1.5 * s, y + 21.4 * s, 3 * s, 2.4 * s, 2350, '#9ad8ff', true]);
}

/* ---------- 작은 기술의 풍경 ---------- */
/** 벽돌 가마: 낮고 둥근 가마와 쌓아 둔 벽돌 */
export function kiln(L, x, y, s, e) {
  const { S, P } = e, c = '#8a5a44';
  L.fillStyle = c; L.beginPath(); L.moveTo(x - 9 * s, y); L.lineTo(x - 8 * s, y - 7 * s); L.quadraticCurveTo(x, y - 17 * s, x + 8 * s, y - 7 * s); L.lineTo(x + 9 * s, y); L.closePath(); L.fill();
  L.fillStyle = rgba('#201610', 0.3); L.beginPath(); if (sdOf(S) > 0) { L.moveTo(x + 2 * s, y); L.lineTo(x + 2 * s, y - 13 * s); L.quadraticCurveTo(x + 7 * s, y - 10 * s, x + 8 * s, y - 7 * s); L.lineTo(x + 9 * s, y); } else { L.moveTo(x - 2 * s, y); L.lineTo(x - 2 * s, y - 13 * s); L.quadraticCurveTo(x - 7 * s, y - 10 * s, x - 8 * s, y - 7 * s); L.lineTo(x - 9 * s, y); } L.closePath(); L.fill();
  L.fillStyle = '#1c120c'; L.beginPath(); L.moveTo(x - 2.4 * s, y); L.lineTo(x - 2.4 * s, y - 4 * s); L.arc(x, y - 4 * s, 2.4 * s, Math.PI, 0); L.lineTo(x + 2.4 * s, y); L.closePath(); L.fill();
  e.wins.push([x - 1.6 * s, y - 4.6 * s, 3.2 * s, 4 * s, 3200, '#ff9a4a', true]);
  if (P.snow) { L.fillStyle = 'rgba(228,231,232,.8)'; L.beginPath(); L.ellipse(x, y - 12.4 * s, 4 * s, 1.4 * s, 0, 0, 7); L.fill(); }
  for (let r = 0; r < 3; r++) { L.fillStyle = r % 2 ? '#7a4c3a' : '#96634c'; L.fillRect(x + 12 * s + r * 0.8 * s, y - (r + 1) * 2.2 * s, (9 - r * 1.6) * s, 2 * s); }
  const wind = windOf(e), col = S.tod === 'night' ? '#4c4e5a' : '#9a958c';
  for (let i = 0; i < 8; i++) puff(L, x + wind * i * 0.8 * s, y - 15 * s - i * 5 * s, (2.4 + i * 1.4) * s, (2 + i * 1.2) * s, col, 0.42 - i * 0.05);
}
/** 쇠 다리: 얽은 쇠살의 낮은 활 */
export function ironBridge(L, x, y, w, e) {
  const h = w * 0.2, c = e.P.snow ? '#5a5c62' : '#3c3a3c';
  L.fillStyle = '#6a6258'; L.fillRect(x - w * 0.6, y - 1, w * 0.1, h * 0.9); L.fillRect(x + w * 0.5, y - 1, w * 0.1, h * 0.9);
  L.strokeStyle = c; L.lineWidth = 1.6; L.beginPath(); L.moveTo(x - w * 0.56, y); L.lineTo(x + w * 0.56, y); L.stroke();
  L.lineWidth = 1.1; L.beginPath(); L.moveTo(x - w * 0.5, y); L.quadraticCurveTo(x, y - h * 2, x + w * 0.5, y);
  for (let i = 1; i < 8; i++) { const t = i / 8, px = x - w * 0.5 + w * t, py = y - h * 4 * t * (1 - t); L.moveTo(px, y); L.lineTo(px, py); if (i < 7) { const t2 = (i + 1) / 8; L.moveTo(px, i % 2 ? py : y); L.lineTo(x - w * 0.5 + w * t2, i % 2 ? y : y - h * 4 * t2 * (1 - t2)); } }
  L.stroke();
}
/** 높은 용광로: 굵은 탑과 꼭대기의 붉은 불 */
export function furnace(L, x, y, s, e) {
  const { S, P } = e, sd = sdOf(S), c = '#5c4a44';
  poly(L, [[x - 9 * s, y], [x + 9 * s, y], [x + 6 * s, y - 34 * s], [x - 6 * s, y - 34 * s]], c);
  poly(L, sd > 0 ? [[x + 2 * s, y], [x + 9 * s, y], [x + 6 * s, y - 34 * s], [x + 1.4 * s, y - 34 * s]] : [[x - 2 * s, y], [x - 9 * s, y], [x - 6 * s, y - 34 * s], [x - 1.4 * s, y - 34 * s]], rgba('#140e0c', 0.4));
  L.fillStyle = '#2e2624'; for (const k of [10, 20, 29]) L.fillRect(x - (9 - k * 0.088) * s, y - k * s, (18 - k * 0.176) * s, 1.1 * s); L.fillRect(x - 7 * s, y - 36 * s, 14 * s, 2.4 * s);
  L.fillStyle = '#4a3c36'; L.fillRect(x - 22 * s, y - 9 * s, 14 * s, 9 * s); poly(L, [[x - 23 * s, y - 9 * s], [x - 7 * s, y - 9 * s], [x - 9 * s, y - 13 * s], [x - 21 * s, y - 13 * s]], P.snow ? '#e4e7e8' : '#33292a');
  L.strokeStyle = '#2e2624'; L.lineWidth = 1.2 * s; L.beginPath(); L.moveTo(x - 20 * s, y - 13 * s); L.lineTo(x - 5 * s, y - 34 * s); L.stroke();
  e.wins.push([x - 4 * s, y - 38 * s, 8 * s, 2.6 * s, 3600, '#ff7a3a', true], [x - 17 * s, y - 6 * s, 4 * s, 4 * s, 3601, '#ff9a4a', true]);
  const wind = windOf(e), col = S.tod === 'night' ? '#5a4a4c' : '#8a7c76';
  for (let i = 0; i < 12; i++) puff(L, x + wind * i * 1.3 * s + Math.sin(i * 1.2) * 2, y - 38 * s - i * 6 * s, (4 + i * 2.2) * s, (3.4 + i * 1.8) * s, col, 0.5 - i * 0.038);
  if (e.smokeOn.length < 12) e.smokeOn.push([Math.round(x + wind * 7 * s), Math.round(y - 74 * s), 1.2 * s]);
}
/** 깊은 갱의 권양탑: 바퀴 달린 얽은 탑과 갱 어귀의 헛간 */
export function headframe(L, x, y, s, e) {
  L.strokeStyle = '#33291f'; L.lineWidth = 1.3 * s; L.lineCap = 'round'; L.beginPath();
  L.moveTo(x - 5 * s, y); L.lineTo(x - 3 * s, y - 28 * s); L.moveTo(x + 5 * s, y); L.lineTo(x + 3 * s, y - 28 * s); L.moveTo(x + 3 * s, y - 28 * s); L.lineTo(x + 20 * s, y);
  for (let i = 0; i < 4; i++) { const y0 = y - i * 7 * s, y1 = y - (i + 1) * 7 * s; L.moveTo(x - (5 - i * 0.5) * s, y0); L.lineTo(x + (4.5 - i * 0.5) * s, y1); }
  L.stroke();
  L.lineWidth = 1 * s; L.beginPath(); L.arc(x, y - 30 * s, 3.6 * s, 0, 7); L.moveTo(x - 3.6 * s, y - 30 * s); L.lineTo(x + 3.6 * s, y - 30 * s); L.moveTo(x, y - 33.6 * s); L.lineTo(x, y - 26.4 * s); L.stroke();
  L.fillStyle = '#5a4a3a'; L.fillRect(x + 12 * s, y - 8 * s, 14 * s, 8 * s); poly(L, [[x + 11 * s, y - 8 * s], [x + 27 * s, y - 8 * s], [x + 19 * s, y - 13 * s]], e.P.snow ? '#e4e7e8' : '#3a3028');
  e.wins.push([x - 1.6 * s, y - 5 * s, 3.2 * s, 3.4 * s, 3700, '#9ad8ff', true]);
}
/** 마석 펌프: 까딱이는 들보와 푸른 불빛 */
export function pump(L, x, y, s, e) {
  const a = Math.sin(e.month * 1.3) * 0.22;
  L.fillStyle = '#5a4a3a'; L.fillRect(x - 5 * s, y - 6 * s, 8 * s, 6 * s);
  L.strokeStyle = '#2e2620'; L.lineCap = 'round'; L.lineWidth = 1.4 * s; L.beginPath(); L.moveTo(x + 6 * s, y); L.lineTo(x + 6 * s, y - 12 * s); L.stroke();
  L.lineWidth = 1.2 * s; L.beginPath(); L.moveTo(x + 6 * s - Math.cos(a) * 9 * s, y - 12 * s + Math.sin(a) * 9 * s); L.lineTo(x + 6 * s + Math.cos(a) * 9 * s, y - 12 * s - Math.sin(a) * 9 * s); L.stroke();
  L.lineWidth = 0.7 * s; L.beginPath(); L.moveTo(x + 6 * s + Math.cos(a) * 9 * s, y - 12 * s - Math.sin(a) * 9 * s); L.lineTo(x + 15 * s, y); L.stroke();
  e.wins.push([x - 3 * s, y - 4.4 * s, 2.6 * s, 2.4 * s, 3800, '#9ad8ff', true]);
}
/** 조선소: 비탈 위에 얹힌 쇠 선체와 받침대 */
export function shipyard(L, x, y, s, e) {
  L.strokeStyle = '#4a3a2a'; L.lineWidth = 1 * s; L.beginPath(); for (let i = -3; i <= 3; i++) { L.moveTo(x + i * 9 * s, y); L.lineTo(x + i * 9 * s, y - 12 * s); } L.moveTo(x - 30 * s, y - 12 * s); L.lineTo(x + 30 * s, y - 12 * s); L.stroke();
  poly(L, [[x - 30 * s, y - 13 * s], [x + 34 * s, y - 15 * s], [x + 26 * s, y - 3 * s], [x - 24 * s, y - 3 * s]], '#3a3436');
  L.strokeStyle = 'rgba(160,110,80,.55)'; L.lineWidth = 0.7 * s; L.beginPath(); for (let i = -2; i <= 2; i++) { L.moveTo(x + i * 10 * s, y - 13.6 * s); L.lineTo(x + i * 9.4 * s, y - 3 * s); } L.moveTo(x - 27 * s, y - 8 * s); L.lineTo(x + 30 * s, y - 9 * s); L.stroke();
  e.wins.push([x + 12 * s, y - 16 * s, 2.4 * s, 2.4 * s, 3900, '#ffb060', 'night']);
}
/** 비행선 계류탑: 가는 쇠탑, 꼭대기의 붉은 등 */
export function mooring(L, x, y, s, e) {
  const h = 78 * s; L.strokeStyle = '#3a3432'; L.lineWidth = Math.max(1, 1.1 * s); L.beginPath(); L.moveTo(x - 5 * s, y); L.lineTo(x - 1 * s, y - h); L.moveTo(x + 5 * s, y); L.lineTo(x + 1 * s, y - h);
  for (let i = 0; i < 8; i++) { const t0 = i / 8, t1 = (i + 1) / 8; L.moveTo(x + (i % 2 ? -1 : 1) * (5 - 4 * t0) * s, y - h * t0); L.lineTo(x + (i % 2 ? 1 : -1) * (5 - 4 * t1) * s, y - h * t1); }
  L.stroke(); L.fillStyle = '#3a3432'; L.fillRect(x - 4 * s, y - h * 0.82, 8 * s, 1.4 * s); L.fillRect(x - 0.7 * s, y - h - 6 * s, 1.4 * s, 6 * s);
  e.wins.push([x - 1.4 * s, y - h - 8 * s, 2.8 * s, 2.6 * s, 3950, '#ff6a50', true]);
}
/** 탑의 시계 얼굴. 밤에는 희미하게 밝다 */
export function clockFace(L, x, y, r, e) {
  L.fillStyle = '#2a2420'; L.beginPath(); L.arc(x, y, r * 1.25, 0, 7); L.fill();
  L.fillStyle = '#e6dcc0'; L.beginPath(); L.arc(x, y, r, 0, 7); L.fill();
  const a = e.month * 0.52; L.strokeStyle = '#2a2420'; L.lineWidth = Math.max(0.7, r * 0.2); L.beginPath(); L.moveTo(x, y); L.lineTo(x + Math.sin(a) * r * 0.8, y - Math.cos(a) * r * 0.8); L.moveTo(x, y); L.lineTo(x + r * 0.5, y); L.stroke();
  e.wins.push([x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6, 3300, '#ffe6b0', 'night']);
}
/** 항구 기중기: 디딤바퀴 집과 긴 팔, 매달린 짐 */
export function crane(L, x, y, s, e) {
  const { P } = e;
  L.fillStyle = '#6a5440'; L.fillRect(x - 6 * s, y - 15 * s, 12 * s, 15 * s); poly(L, [[x - 7.4 * s, y - 15 * s], [x + 7.4 * s, y - 15 * s], [x, y - 22 * s]], P.snow ? '#e4e7e8' : '#4a3a2c');
  L.strokeStyle = '#2e2218'; L.lineWidth = 0.9 * s; L.beginPath(); L.arc(x, y - 7 * s, 4.6 * s, 0, 7); L.moveTo(x - 4.6 * s, y - 7 * s); L.lineTo(x + 4.6 * s, y - 7 * s); L.moveTo(x, y - 11.6 * s); L.lineTo(x, y - 2.4 * s); L.stroke();
  L.lineWidth = 1.5 * s; L.lineCap = 'round'; L.beginPath(); L.moveTo(x - 2 * s, y - 19 * s); L.lineTo(x - 25 * s, y - 34 * s); L.stroke();
  L.lineWidth = 0.7 * s; L.beginPath(); L.moveTo(x, y - 22 * s); L.lineTo(x - 25 * s, y - 34 * s); L.lineTo(x - 25 * s, y - 13 * s); L.stroke();
  L.fillStyle = '#7a5c3c'; L.fillRect(x - 28 * s, y - 13 * s, 6 * s, 5 * s); L.fillStyle = 'rgba(0,0,0,.25)'; L.fillRect(x - 28 * s, y - 10.6 * s, 6 * s, 0.8 * s);
}
/** 온실: 유리 지붕이 하늘빛을 받는 낮은 집 */
export function greenhouse(L, x, y, s, e) {
  const { S, P, wins } = e, w = 26 * s, h = 7 * s, g = S.tod === 'night' ? '#3a4a52' : mixSky(S), x0 = x - w / 2;
  L.fillStyle = '#8a7c68'; L.fillRect(x0, y - 2.4 * s, w, 2.4 * s);
  L.fillStyle = rgba(g, 0.86); L.fillRect(x0, y - h, w, h - 2.4 * s); poly(L, [[x0, y - h], [x0 + w, y - h], [x0 + w - 3 * s, y - h - 6 * s], [x0 + 3 * s, y - h - 6 * s]], rgba(light(g, 0.2), 0.9));
  L.fillStyle = rgba('#3e6a3a', 0.5); L.fillRect(x0 + 1 * s, y - 5.4 * s, w - 2 * s, 3 * s);
  L.strokeStyle = 'rgba(52,44,36,.8)'; L.lineWidth = 0.7 * s; L.beginPath(); for (let i = 0; i <= 6; i++) { const px = x0 + (i * w) / 6; L.moveTo(px, y - 2.4 * s); L.lineTo(px, y - h); L.lineTo(x0 + 3 * s + (i * (w - 6 * s)) / 6, y - h - 6 * s); } L.moveTo(x0, y - h); L.lineTo(x0 + w, y - h); L.moveTo(x0 + 3 * s, y - h - 6 * s); L.lineTo(x0 + w - 3 * s, y - h - 6 * s); L.stroke();
  if (P.snow) { L.fillStyle = 'rgba(228,231,232,.7)'; L.fillRect(x0 + 3 * s, y - h - 6.6 * s, w - 6 * s, 1.2 * s); }
  wins.push([x0 + 3 * s, y - h - 1 * s, w - 6 * s, h - 2 * s, 3400, '#ffe2a8']);
}
const mixSky = (S) => S.low ?? '#b8d0d8';
/** 물탑: 다리 위에 얹은 나무 물통 */
export function waterTower(L, x, y, s, e) {
  const { P, S } = e, sd = sdOf(S);
  L.strokeStyle = '#3a2c20'; L.lineWidth = 1.2 * s; L.beginPath(); for (const k of [-5, 5]) { L.moveTo(x + k * 1.3 * s, y); L.lineTo(x + k * s, y - 20 * s); } L.moveTo(x - 6.2 * s, y - 4 * s); L.lineTo(x + 5.4 * s, y - 14 * s); L.moveTo(x + 6.2 * s, y - 4 * s); L.lineTo(x - 5.4 * s, y - 14 * s); L.stroke();
  L.fillStyle = '#7a5c40'; L.fillRect(x - 7 * s, y - 32 * s, 14 * s, 12 * s); L.fillStyle = rgba('#201610', 0.3); L.fillRect(sd > 0 ? x + 2 * s : x - 7 * s, y - 32 * s, 5 * s, 12 * s);
  L.fillStyle = '#3a3030'; L.fillRect(x - 7 * s, y - 29 * s, 14 * s, 0.9 * s); L.fillRect(x - 7 * s, y - 24 * s, 14 * s, 0.9 * s);
  poly(L, [[x - 8.4 * s, y - 32 * s], [x + 8.4 * s, y - 32 * s], [x, y - 39 * s]], P.snow ? '#e4e7e8' : '#4a3c30');
}
/** 길 위의 말 없는 쇠수레 한 대 */
export function ironcart(L, x, y, s, e) {
  L.fillStyle = '#3a3c46'; L.fillRect(x - 7 * s, y - 8 * s, 14 * s, 5.4 * s); L.fillStyle = '#5a3a30'; L.fillRect(x - 4 * s, y - 12 * s, 8 * s, 4 * s);
  L.fillStyle = '#b89a48'; L.fillRect(x - 7 * s, y - 8 * s, 14 * s, 0.8 * s);
  L.fillStyle = '#1c1c20'; for (const k of [-4.4, 4.4]) { L.beginPath(); L.arc(x + k * s, y - 2.2 * s, 2.4 * s, 0, 7); L.fill(); }
  e.wins.push([x - 1.4 * s, y - 7 * s, 2.8 * s, 2.2 * s, 3500, '#9ad8ff', true]);
}

/* ---------- 마을에 얹기 (scene.js의 settle이 부른다) ---------- */
/** 집들 뒤에 서는 것. g: { top(x) 마을 땅, cx, span, depth, z } */
export function eraBack(L, e, E, g) {
  const { D, S, P, month } = e, { top, cx, span, depth, z } = g, on = (k) => E[k] !== undefined, at = (fx, fy = 0) => { const x = cx + span * fx; return [x, top(x) + 8 + depth * fy]; };
  if (on('signal')) { const [x, y] = at(-0.5); signalTower(L, x, y - 2, 0.6 * z, e); }
  if (on('windmill') && D.feature !== 'windmill') { const [x, y] = at(-0.7); windmill(L, x, y + 2, 0.6 * z, month, S, P); }
  if (on('skyline')) { const [x, y] = at(0.63); mooring(L, x, y, 0.8 * z, e); }
  if (on('water')) { const [x, y] = at(0.47, 0.1); waterTower(L, x, y, 0.8 * z, e); }
  if (on('furnace')) { const [x, y] = at(0.67, 0.42); furnace(L, x, y, 0.85 * z, e); }
  if (on('mill')) { const [x, y] = at(0.55, 0.5); stack(L, x, y, 26 * z, 5.4 * z, e, { blue: true }); }
  if (on('forge')) { const [x, y] = at(0.36, 0.2); stack(L, x, y, 22 * z, 4.6 * z, e, { blue: true }); }
  if (on('ruralmill')) { const [x, y] = at(0.5, 0.4); stack(L, x, y, 17 * z, 4 * z, e, { blue: true }); }
  if (on('factory')) { const [x, y] = at(0.7, 0.8); stack(L, x - 22 * z, y - 4, 40 * z, 6.4 * z, e); factory(L, x, y, 0.62 * z, e); }
}
/** 집들 앞, 성벽 밖에 서는 것. g에 gate(성문 x), wy(x) 성벽 발치가 더 온다 */
export function eraFront(L, e, E, g) {
  const { top, cx, span, depth, z, gate, wy } = g, on = (k) => E[k] !== undefined;
  if (on('clock') && e.churchAt) { const [x, y, s] = e.churchAt; clockFace(L, x, y - 27 * s, 3.3 * s, e); }
  if (on('brick')) { const x = cx - span * 0.64; kiln(L, x, top(x) + depth + 8, 0.85 * z, e); }
  if (on('green')) { const x = cx + span * 0.4; greenhouse(L, x, wy(x) + 15, 0.8 * z, e); }
  if (on('pump')) { const x = cx - span * 0.8; pump(L, x, top(x) + depth + 30, 0.9 * z, e); }
  if (on('lamps')) { // 처음에는 성문 곁 둘, 세월이 가며 길을 따라 는다
    const n = Math.min(2 + E.lamps, 8);
    for (let i = 0; i < n; i++) { const x = gate + (i % 2 ? 1 : -1) * (Math.floor(i / 2) + 0.45) * span * 0.11; lamp(L, x, wy(x) + 9, 0.95 * z, e, 2600 + i); }
  }
}
