// 에른 마을 풍경: 캔버스로 절차 생성.
// 달(계절), 하루 중 때(새벽·낮·해 질 녘·밤), 날씨, 흉년·역병에 따라 바뀐다.
// 마을 배치는 늘 같고(고정 씨앗), 그날의 때와 날씨만 달마다 정해진다.

const W = 1200, H = 480;
const HORIZON = 236;

function hash(n, s = 0) {
  let h = Math.imul(n | 0, 374761393) + Math.imul(s | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function noise1(x, s) {
  const i = Math.floor(x), t = x - i, u = t * t * (3 - 2 * t);
  return hash(i, s) * (1 - u) + hash(i + 1, s) * u;
}
function fbm1(x, s, oct = 4) {
  let a = 0.5, f = 1, sum = 0, n = 0;
  for (let i = 0; i < oct; i++) { sum += a * noise1(x * f, s + i * 13); n += a; a *= 0.5; f *= 2.1; }
  return sum / n;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
function toHex(c) {
  if (c[0] === '#') return c;
  const m = c.match(/\d+/g).map(Number);
  return '#' + ((1 << 24) | (m[0] << 16) | (m[1] << 8) | m[2]).toString(16).slice(1);
}
const mixh = (a, b, t) => toHex(mix(a, b, t));

/** 그 달의 때와 날씨 (같은 달이면 늘 같음) */
export function conditions(year, month) {
  const k = year * 12 + month;
  const r = hash(k, 77), w = hash(k, 91);
  const tod = r < 0.48 ? 'day' : r < 0.68 ? 'dusk' : r < 0.82 ? 'dawn' : 'night';
  const season = [0, '겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'][month];
  let weather = 'clear';
  if (season === '겨울') weather = w < 0.45 ? 'snow' : w < 0.7 ? 'cloudy' : 'clear';
  else if (season === '봄') weather = w < 0.25 ? 'rain' : w < 0.4 ? 'cloudy' : w < 0.5 ? 'fog' : 'clear';
  else if (season === '여름') weather = w < 0.15 ? 'rain' : w < 0.25 ? 'cloudy' : 'clear';
  else weather = w < 0.25 ? 'rain' : w < 0.42 ? 'fog' : w < 0.6 ? 'cloudy' : 'clear';
  if (weather === 'fog' && tod === 'night') weather = 'cloudy';
  return { tod, weather, season };
}

const TOD_NAME = { day: '한낮', dusk: '해 질 녘', dawn: '새벽', night: '밤' };
const WEATHER_NAME = { clear: '맑음', cloudy: '흐림', rain: '비', snow: '눈', fog: '안개' };
export function conditionText(year, month) {
  const c = conditions(year, month);
  return `${TOD_NAME[c.tod]} · ${WEATHER_NAME[c.weather]}`;
}

const SKY = {
  day: ['#7f9fb6', '#c9cfc4', '#e6dcc0'],
  dawn: ['#4d5a7c', '#b99a8e', '#ebc195'],
  dusk: ['#2f3050', '#9a5f60', '#e39a5c'],
  night: ['#0b1020', '#18223a', '#2e3a4f'],
};

// 계절별 색
function palette(month, famine) {
  const P = {};
  const m = month;
  if (m === 12 || m <= 2) {
    Object.assign(P, { grass: '#dfe2e2', grass2: '#c8ced2', field: ['#e4e6e6', '#d6dadc', '#dcdedd', '#cfd4d6'], leaf: null, conifer: '#2d3b33', hill: '#cfd5d8', far: '#a9b2ba', snow: true, river: '#a9bcc6' });
  } else if (m <= 5) {
    const t = (m - 3) / 2;
    Object.assign(P, { grass: mixh('#8a9a58', '#7f9c4c', t), grass2: '#6d8444', field: [mixh('#9aa766', '#8daa58', t), '#7a6448', mixh('#a7b872', '#9cb860', t), '#86935a'], leaf: mixh('#9cb062', '#86a64e', t), blossom: m >= 4 ? (m === 4 ? 0.5 : 0.25) : 0.1, conifer: '#33473a', hill: '#7d905a', far: '#8c9aa6', river: '#5f8796', snowPatch: m === 3 });
  } else if (m <= 8) {
    const t = (m - 6) / 2;
    Object.assign(P, { grass: mixh('#6f8a44', '#7f8a46', t), grass2: '#5b723a', field: [mixh('#8fa04e', '#cdae5c', t), mixh('#a9a457', '#d4b866', t), '#6e8a42', mixh('#9a9a50', '#bfa458', t)], leaf: '#4f6b35', conifer: '#2f4434', hill: '#6c8445', far: '#8496a3', river: '#55808f' });
  } else {
    const t = (m - 9) / 2;
    Object.assign(P, { grass: mixh('#8b8a4c', '#7d7448', t), grass2: '#6a6640', field: [mixh('#bfa362', '#9a8556', t), '#6b5038', mixh('#c2a255', '#8a7448', t), '#7d7a48'], leaf: m === 11 ? '#8a5a30' : null, autumn: m <= 10 ? 1 : 0.4, conifer: '#2f4234', hill: mixh('#8a8048', '#7a6e48', t), far: '#8d929a', river: '#5a7e8a', sheaves: m === 9 });
  }
  if (famine && !P.snow) {
    P.field = P.field.map((c) => mixh(c, '#8a7450', 0.6));
    P.grass = mixh(P.grass, '#8a7a50', 0.5);
    P.leaf = P.leaf && mixh(P.leaf, '#8a7a50', 0.45);
    P.hill = mixh(P.hill, '#8a7a50', 0.5);
  }
  return P;
}

// 언덕 곡선
function ridged1(x, s) { let a = 0.5, f = 1, sum = 0, n = 0; for (let i = 0; i < 5; i++) { const v = 1 - Math.abs(noise1(x * f, s + i * 7) * 2 - 1); sum += a * v * v; n += a; a *= 0.5; f *= 2.2; } return sum / n; }
const farRidge = (x) => HORIZON - 14 - ridged1(x / 120, 5) * 92 - Math.max(0, 1 - Math.abs(x - 330) / 360) * 34;
const farRidge2 = (x) => HORIZON - 40 - ridged1(x / 150 + 9, 15) * 96 - Math.max(0, 1 - Math.abs(x - 860) / 300) * 30;
const hill1 = (x) => HORIZON + 6 - fbm1(x / 220, 11, 3) * 36;
const hill2 = (x) => 286 - fbm1(x / 260, 21, 3) * 46 - Math.max(0, 1 - Math.abs(x - 790) / 260) * 26 - Math.max(0, 1 - Math.abs(x - 230) / 140) * 22;
const hill3 = (x) => 392 - fbm1(x / 200, 31, 3) * 30 + Math.max(0, 1 - Math.abs(x - 640) / 300) * 18;

function fillCurve(ctx, fn, color, bottom = H) {
  ctx.beginPath(); ctx.moveTo(0, bottom);
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, fn(x));
  ctx.lineTo(W, bottom); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}

const cache = new Map();

/** 풍경 그림 (data URL). 브라우저에서만 동작. */
export function sceneImage({ year, month, famine = false, plague = false, place = 'ern' }) {
  const key = `${year}-${month}-${famine}-${plague}-${place}`;
  if (cache.has(key)) return cache.get(key);
  if (typeof document === 'undefined') return '';
  const url = draw(year, month, famine, plague, place);
  if (cache.size > 24) cache.clear();
  cache.set(key, url);
  return url;
}

// 장소마다 마을 크기와 성벽·성채가 다르다 (places.js의 장소 id)
const TOWNS = {
  ern: { houses: 22, seed: 9133 },
  harfen: { houses: 40, seed: 4471, wall: true },
  verden: { houses: 30, seed: 7302, wall: true, keep: true },
  leocast: { houses: 62, seed: 1288, wall: true, keep: true, white: true },
};

function draw(year, month, famine, plague, place) {
  const town = TOWNS[place] ?? { houses: 28, seed: 3000 + [...String(place)].reduce((a, c) => a + c.charCodeAt(0), 0), wall: true };
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const land = document.createElement('canvas'); land.width = W; land.height = H;
  const L = land.getContext('2d');
  const { tod, weather } = conditions(year, month);
  const P = palette(month, famine);
  const overcast = weather === 'cloudy' || weather === 'rain' || weather === 'snow' || weather === 'fog';
  const wr = rng(year * 12 + month);
  const fixed = rng(5021); // 마을 배치는 고정

  /* 하늘 */
  let sky = SKY[tod].slice();
  if (overcast) sky = sky.map((c) => mixh(c, tod === 'night' ? '#20242c' : '#9a9a96', tod === 'night' ? 0.4 : 0.55));
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 40);
  g.addColorStop(0, sky[0]); g.addColorStop(0.6, sky[1]); g.addColorStop(1, sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (tod === 'night') {
    if (!overcast) for (let i = 0; i < 180; i++) {
      const x = wr() * W, y = wr() * HORIZON * 0.85, a = 0.3 + wr() * 0.7;
      ctx.fillStyle = `rgba(235,230,210,${a * (1 - y / HORIZON)})`; ctx.fillRect(x, y, wr() < 0.1 ? 2 : 1.2, wr() < 0.1 ? 2 : 1.2);
    }
    // 달 (달마다 위상과 자리가 다름)
    const mx = 160 + hash(year * 12 + month, 3) * 880, my = 50 + hash(year * 12 + month, 4) * 60;
    ctx.save(); ctx.globalAlpha = overcast ? 0.35 : 1;
    const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 70); mg.addColorStop(0, 'rgba(230,226,200,.35)'); mg.addColorStop(1, 'rgba(230,226,200,0)');
    ctx.fillStyle = mg; ctx.fillRect(mx - 70, my - 70, 140, 140);
    ctx.fillStyle = '#e8e2c8'; ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
    const ph = hash(year * 12 + month, 5);
    ctx.fillStyle = sky[0]; ctx.beginPath(); ctx.arc(mx + 8 + ph * 16, my - 4, 15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (!overcast) {
    const sx = tod === 'dawn' ? 980 : tod === 'dusk' ? 200 : 820, sy = tod === 'day' ? 70 : HORIZON - 40;
    const sg = ctx.createRadialGradient(sx, sy, 6, sx, sy, tod === 'day' ? 160 : 260);
    sg.addColorStop(0, tod === 'day' ? 'rgba(255,248,225,.9)' : 'rgba(255,214,150,.9)'); sg.addColorStop(0.15, tod === 'day' ? 'rgba(255,245,215,.35)' : 'rgba(250,180,110,.4)'); sg.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = tod === 'day' ? '#fff6dc' : '#ffd79a'; ctx.beginPath(); ctx.arc(sx, sy, tod === 'day' ? 16 : 22, 0, Math.PI * 2); ctx.fill();
  }
  // 구름
  const nClouds = overcast ? 16 : weather === 'clear' ? 5 : 9;
  const cloudCol = tod === 'night' ? 'rgba(60,66,84,' : tod === 'dusk' ? 'rgba(214,140,120,' : tod === 'dawn' ? 'rgba(232,196,180,' : overcast ? 'rgba(170,170,166,' : 'rgba(250,246,236,';
  for (let i = 0; i < nClouds; i++) {
    const cx = wr() * (W + 200) - 100, cy = 30 + wr() * (overcast ? 130 : 110), cw = 80 + wr() * 160;
    for (let k = 0; k < 9; k++) {
      const px = cx + (wr() - 0.5) * cw, py = cy + (wr() - 0.5) * 18, pr = 14 + wr() * 26;
      ctx.fillStyle = cloudCol + (overcast ? 0.5 : 0.42) + ')';
      ctx.beginPath(); ctx.ellipse(px, py, pr * 1.6, pr * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = cloudCol + '0.18)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 12, cw * 0.7, 8, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* 먼 산 (회색 산맥): 두 겹, 멀수록 하늘색에 묻힌다 */
  const snowLine = P.snow ? HORIZON + 10 : month === 3 || month === 11 ? HORIZON - 40 : month === 4 || month === 10 ? HORIZON - 62 : HORIZON - 92;
  for (const [layer, fn, haze] of [[0, farRidge2, 0.55], [1, farRidge, 0.32]]) {
    const col = mixh(P.far, sky[2], haze);
    fillCurve(L, fn, col);
    // 빛 받는 면 / 그늘 면: 능선 기울기에 따라 비스듬한 면을 칠한다
    for (let x = 0; x < W; x += 4) {
      const y = fn(x), y2 = fn(x + 4);
      const down = y2 > y; // 오른쪽으로 내려가는 면 = 그늘
      L.fillStyle = down ? 'rgba(30,30,44,.16)' : 'rgba(255,250,235,.06)';
      const d = 18 + noise1(x / 30, 50 + layer) * 40;
      L.beginPath(); L.moveTo(x, y); L.lineTo(x + 4, y2); L.lineTo(x + 4 + d * 0.5, y2 + d); L.lineTo(x + d * 0.5, y + d); L.closePath(); L.fill();
    }
    // 눈 덮인 봉우리
    L.fillStyle = mixh('#eef0f0', sky[2], haze * 0.5);
    L.beginPath();
    for (let x = 0; x <= W; x += 4) { const y = fn(x); x ? L.lineTo(x, y) : L.moveTo(x, y); }
    for (let x = W; x >= 0; x -= 4) {
      const y = fn(x), depth = Math.max(0, snowLine - y) * 0.55 * (0.6 + noise1(x / 12, 60 + layer) * 0.8);
      L.lineTo(x, y + depth);
    }
    L.closePath(); L.globalAlpha = 0.9; L.fill(); L.globalAlpha = 1;
    L.strokeStyle = `rgba(40,36,40,${0.2 + layer * 0.15})`; L.lineWidth = 1; L.beginPath();
    for (let x = 0; x <= W; x += 4) x ? L.lineTo(x, fn(x)) : L.moveTo(x, fn(x));
    L.stroke();
  }

  /* 먼 언덕과 숲 */
  const h1c = mixh(P.hill, sky[2], 0.35);
  fillCurve(L, hill1, h1c);
  for (let x = 0; x < W; x += 5) {
    if (fbm1(x / 90, 41) < 0.5) continue;
    const y = hill1(x) + 2 + hash(x, 2) * 6;
    L.fillStyle = mixh(P.conifer, sky[2], 0.45);
    L.beginPath(); L.moveTo(x, y - 9 - hash(x, 3) * 6); L.lineTo(x + 3.5, y); L.lineTo(x - 3.5, y); L.closePath(); L.fill();
  }

  /* 가운데 언덕: 밭 */
  fillCurve(L, hill2, P.hill);
  const fieldsTop = (x) => hill2(x) + 4;
  let fx = -20;
  const cols = [];
  while (fx < W) { const w = 70 + fixed() * 110; cols.push([fx, fx + w]); fx += w; }
  for (const [x0, x1] of cols) {
    if (x0 > 560 && x1 < 980) continue; // 마을 자리
    let d = 0;
    while (d < 120) {
      const dh = 14 + fixed() * 24;
      const t = Math.floor(fixed() * P.field.length);
      const col = P.field[t];
      L.beginPath();
      L.moveTo(x0, fieldsTop(x0) + d);
      for (let x = x0; x <= x1; x += 8) L.lineTo(x, fieldsTop(x) + d + (x - x0) * 0.02);
      for (let x = x1; x >= x0; x -= 8) L.lineTo(x, fieldsTop(x) + d + dh + (x - x0) * 0.02);
      L.closePath(); L.fillStyle = col; L.fill();
      // 이랑
      L.strokeStyle = P.snow ? 'rgba(120,130,140,.18)' : 'rgba(40,30,20,.12)'; L.lineWidth = 0.8; L.beginPath();
      for (let k = 3; k < dh; k += 3.2) { L.moveTo(x0, fieldsTop(x0) + d + k); L.lineTo(x1, fieldsTop(x1) + d + k + (x1 - x0) * 0.02); }
      L.stroke();
      if (fixed() < 0.45) { // 밭 사이 산울타리
        L.fillStyle = P.snow ? 'rgba(110,122,120,.8)' : mixh(P.leaf ?? P.conifer, '#202818', 0.4);
        for (let x = x0; x < x1; x += 3.5) { L.beginPath(); L.arc(x, fieldsTop(x) + d + (x - x0) * 0.02, 1.4 + hash(Math.round(x), 8) * 1.4, 0, Math.PI * 2); L.fill(); }
      }
      d += dh;
    }
    // 산울타리
    L.fillStyle = P.snow ? '#7d8a86' : mixh(P.leaf ?? P.conifer, '#202818', 0.35);
    for (let y = fieldsTop(x0); y < fieldsTop(x0) + 120; y += 3.5) { if (hash(Math.round(y), x0 | 0) < 0.25) continue; L.beginPath(); L.arc(x0 + (hash(Math.round(y), 7) - 0.5) * 3, y, 1.4 + hash(Math.round(y), 8) * 1.4, 0, Math.PI * 2); L.fill(); }
  }
  if (P.sheaves) {
    for (let i = 0; i < 70; i++) {
      const x = fixed() * W; if (x > 560 && x < 980) continue;
      const y = fieldsTop(x) + 10 + fixed() * 100;
      L.fillStyle = '#c9a65a'; L.strokeStyle = '#6a5228'; L.lineWidth = 0.7;
      L.beginPath(); L.moveTo(x, y - 7); L.lineTo(x + 3, y); L.lineTo(x - 3, y); L.closePath(); L.fill(); L.stroke();
    }
  }
  if (P.snowPatch) {
    for (let i = 0; i < 40; i++) { const x = fixed() * W, y = fieldsTop(x) + fixed() * 110; L.fillStyle = 'rgba(232,234,232,.8)'; L.beginPath(); L.ellipse(x, y, 10 + fixed() * 20, 3 + fixed() * 3, 0, 0, Math.PI * 2); L.fill(); }
  }

  /* 강 */
  const riverPts = [];
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const x = -30 + t * 700 + Math.sin(t * 5) * 60;
    const y = 300 + t * t * 200;
    riverPts.push([x, y, 2 + t * t * 36]);
  }
  L.beginPath();
  riverPts.forEach(([x, y, w], i) => (i ? L.lineTo(x, y - w / 2) : L.moveTo(x, y - w / 2)));
  for (let i = riverPts.length - 1; i >= 0; i--) { const [x, y, w] = riverPts[i]; L.lineTo(x, y + w / 2); }
  L.closePath();
  const rg = L.createLinearGradient(0, 300, 0, H);
  rg.addColorStop(0, mixh(P.river, sky[2], 0.4)); rg.addColorStop(1, P.river);
  L.fillStyle = rg; L.fill();
  L.strokeStyle = 'rgba(30,26,20,.45)'; L.lineWidth = 1.2; L.stroke();
  if (!P.snow) { // 물결 반짝임
    for (let i = 0; i < 40; i++) {
      const k = Math.floor(fixed() * riverPts.length), [x, y, w] = riverPts[k];
      L.strokeStyle = `rgba(240,236,220,${0.15 + fixed() * 0.25})`; L.lineWidth = 1;
      L.beginPath(); L.moveTo(x - w * 0.3, y + (fixed() - 0.5) * w * 0.5); L.lineTo(x + w * 0.2, y + (fixed() - 0.5) * w * 0.5); L.stroke();
    }
  }

  /* 풍차 (서쪽 언덕) */
  const millX = 232, millY = hill2(232) + 6;
  windmill(L, millX, millY, month, P);

  /* 마을 */
  const houses = [];
  const vr = rng(town.seed);
  for (let i = 0; i < town.houses; i++) {
    const x = 590 + vr() * 380, yb = hill2(x) + 10 + vr() * 70;
    houses.push({ x, y: yb, w: 22 + vr() * 18, h: 12 + vr() * 8, roof: vr(), seed: i, kind: 'house' });
  }
  houses.push({ x: 785, y: hill2(785) + 22, w: 30, h: 22, kind: 'chapel', seed: 99 });
  houses.push({ x: 700, y: hill2(700) + 58, w: 46, h: 20, kind: 'inn', seed: 98, roof: 0.2 });
  houses.sort((a, b) => a.y - b.y);
  if (town.keep) keep(L, 880, hill2(880) + 4, town.white, P);
  const lit = tod === 'night' || tod === 'dusk' || tod === 'dawn';
  const windows = [];
  // 마을 뒤 나무
  for (let i = 0; i < 26; i++) { const x = 580 + vr() * 420; tree(L, x, hill2(x) + 8 + vr() * 20, 7 + vr() * 5, P, vr, month); }
  for (const hs of houses) {
    const s = 0.75 + (hs.y - 240) / 260;
    if (hs.kind === 'chapel') chapel(L, hs.x, hs.y, s, P, windows, plague);
    else house(L, hs, s, P, windows, plague);
    if (vr() < 0.3) tree(L, hs.x + (vr() - 0.5) * 60, hs.y + 4, (7 + vr() * 5) * s, P, vr, month);
  }
  // 굴뚝 연기
  const smoky = plague ? 0.25 : P.snow ? 0.9 : tod === 'night' ? 0.4 : 0.55;
  for (const hs of houses) {
    if (hs.kind === 'chapel' || hash(hs.seed, year * 12 + month) > smoky) continue;
    const s = 0.75 + (hs.y - 240) / 260;
    const cx = hs.x + hs.w * s * 0.25, cy = hs.y - (hs.h + hs.w * 0.5) * s - 4 * s;
    for (let k = 0; k < 7; k++) {
      L.fillStyle = `rgba(${tod === 'night' ? '90,96,110' : '210,206,198'},${0.32 - k * 0.04})`;
      L.beginPath(); L.arc(cx + k * 4 + Math.sin(k) * 3, cy - k * 7, 2.6 + k * 1.3, 0, Math.PI * 2); L.fill();
    }
  }

  if (town.wall) townWall(L, 570, 1000, (x) => hill2(x) + 86, town.white, P);

  /* 앞 언덕: 풀밭, 길, 울타리, 큰 나무 */
  fillCurve(L, hill3, P.grass);
  const gg = L.createLinearGradient(0, 380, 0, H);
  gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(20,14,8,.35)');
  L.fillStyle = gg; L.fillRect(0, 360, W, H - 360);
  // 길
  L.fillStyle = P.snow ? '#c8c6be' : mixh('#a08a62', P.grass, 0.25);
  L.beginPath(); L.moveTo(840, H); L.bezierCurveTo(800, 430, 760, 400, 700, hill2(700) + 70); L.lineTo(716, hill2(716) + 70); L.bezierCurveTo(800, 400, 870, 440, 960, H); L.closePath(); L.fill();
  L.strokeStyle = 'rgba(40,30,20,.35)'; L.lineWidth = 1; L.stroke();
  // 풀잎
  for (let i = 0; i < 900; i++) {
    const x = fixed() * W, y = hill3(x) + 4 + fixed() * (H - hill3(x));
    L.strokeStyle = P.snow ? `rgba(150,160,166,${0.2 + fixed() * 0.3})` : mixh(P.grass2, '#1d2614', fixed() * 0.4);
    L.lineWidth = 1; L.beginPath(); L.moveTo(x, y); L.lineTo(x + (fixed() - 0.5) * 3, y - 3 - fixed() * 5); L.stroke();
  }
  if (month >= 4 && month <= 7 && !famine) {
    for (let i = 0; i < 120; i++) {
      const x = fixed() * W, y = hill3(x) + 8 + fixed() * (H - hill3(x) - 8);
      L.fillStyle = ['#e9dcb0', '#d9a0a8', '#c8b04c', '#b8b0d8'][Math.floor(fixed() * 4)];
      L.beginPath(); L.arc(x, y, 1.3, 0, Math.PI * 2); L.fill();
    }
  }
  // 울타리
  L.strokeStyle = '#3e2e20'; L.lineWidth = 2.2;
  for (let x = 380; x < 680; x += 26) { const y = hill3(x) + 26 + (x - 380) * 0.05; L.beginPath(); L.moveTo(x, y); L.lineTo(x, y - 18); L.stroke(); }
  L.lineWidth = 1.6; L.beginPath(); for (let x = 380; x < 680; x += 26) { const y = hill3(x) + 26 + (x - 380) * 0.05; x === 380 ? L.moveTo(x, y - 14) : L.lineTo(x, y - 14); } L.stroke();
  L.beginPath(); for (let x = 380; x < 680; x += 26) { const y = hill3(x) + 26 + (x - 380) * 0.05; x === 380 ? L.moveTo(x, y - 7) : L.lineTo(x, y - 7); } L.stroke();
  // 앞의 큰 나무들 (가장자리)
  tree(L, 70, H + 10, 60, P, fixed, month, true);
  tree(L, 1150, H + 30, 52, P, fixed, month, true);
  tree(L, 1040, hill3(1040) + 30, 22, P, fixed, month);
  conifer(L, 330, hill3(330) + 30, 34, P);
  conifer(L, 300, hill3(300) + 40, 26, P);

  /* 때에 따른 빛 */
  L.globalCompositeOperation = 'source-atop';
  if (tod === 'night') { L.fillStyle = 'rgba(14,20,44,.68)'; L.fillRect(0, 0, W, H); }
  else if (tod === 'dusk') { const lg = L.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, 'rgba(230,120,60,.28)'); lg.addColorStop(1, 'rgba(60,40,90,.32)'); L.fillStyle = lg; L.fillRect(0, 0, W, H); }
  else if (tod === 'dawn') { const lg = L.createLinearGradient(W, 0, 0, 0); lg.addColorStop(0, 'rgba(240,170,120,.24)'); lg.addColorStop(1, 'rgba(70,80,120,.3)'); L.fillStyle = lg; L.fillRect(0, 0, W, H); }
  else if (overcast) { L.fillStyle = 'rgba(120,124,128,.18)'; L.fillRect(0, 0, W, H); }
  if (plague) { L.fillStyle = 'rgba(80,96,70,.22)'; L.fillRect(0, 0, W, H); }
  L.globalCompositeOperation = 'source-over';
  ctx.drawImage(land, 0, 0);

  /* 불 켜진 창 */
  if (lit) {
    const on = tod === 'night' ? 0.8 : 0.55;
    for (const [x, y, w, h, k] of windows) {
      if (hash(k, year * 12 + month) > on) continue;
      const glow = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, 14);
      glow.addColorStop(0, 'rgba(255,190,100,.45)'); glow.addColorStop(1, 'rgba(255,190,100,0)');
      ctx.fillStyle = glow; ctx.fillRect(x - 14, y - 14, w + 28, h + 28);
      ctx.fillStyle = '#ffcf7a'; ctx.fillRect(x, y, w, h);
    }
  }

  /* 날씨 */
  if (weather === 'fog') {
    for (let i = 0; i < 6; i++) {
      const y = 250 + i * 34;
      const fg = ctx.createLinearGradient(0, y - 30, 0, y + 30);
      const c = tod === 'dawn' ? '235,210,190' : '220,222,218';
      fg.addColorStop(0, `rgba(${c},0)`); fg.addColorStop(0.5, `rgba(${c},.32)`); fg.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = fg; ctx.fillRect(0, y - 30, W, 60);
    }
  }
  if (weather === 'rain') {
    ctx.strokeStyle = tod === 'night' ? 'rgba(150,160,180,.25)' : 'rgba(210,214,220,.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 700; i++) { const x = wr() * (W + 100), y = wr() * H, l = 10 + wr() * 14; ctx.moveTo(x, y); ctx.lineTo(x - l * 0.25, y + l); }
    ctx.stroke();
  }
  if (weather === 'snow') {
    for (let i = 0; i < 500; i++) {
      const x = wr() * W, y = wr() * H, r = 0.6 + wr() * 2;
      ctx.fillStyle = `rgba(245,245,240,${0.4 + wr() * 0.5})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (P.autumn && weather !== 'rain') {
    for (let i = 0; i < 60; i++) {
      const x = wr() * W, y = wr() * H;
      ctx.fillStyle = ['#b8742e', '#9a4a2a', '#c49a3a'][Math.floor(wr() * 3)];
      ctx.save(); ctx.translate(x, y); ctx.rotate(wr() * 3); ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }

  /* 종이 결과 가장자리 */
  const vg = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, W * 0.65);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(18,12,6,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.05;
  const gr = rng(4242);
  for (let i = 0; i < 6000; i++) { ctx.fillStyle = gr() > 0.5 ? '#000' : '#fff'; ctx.fillRect(gr() * W, gr() * H, 1.4, 1.4); }
  ctx.globalAlpha = 1;
  return cv.toDataURL('image/jpeg', 0.86);
}

function house(L, hs, s, P, windows, plague) {
  const w = hs.w * s, h = hs.h * s, x = hs.x - w / 2, y = hs.y;
  const roofH = w * 0.48;
  const wall = hs.kind === 'inn' ? '#cdbb98' : ['#d8c8a6', '#cbb894', '#bfae8c', '#d2c2a2'][hs.seed % 4];
  // 그림자 쪽 벽
  L.fillStyle = mixh(wall, '#3a2a1a', 0.35);
  L.fillRect(x + w, y - h, w * 0.28, h);
  L.fillStyle = wall; L.fillRect(x, y - h, w, h);
  // 목조 틀
  L.strokeStyle = '#4a3624'; L.lineWidth = Math.max(0.8, 1.1 * s);
  L.strokeRect(x, y - h, w, h);
  L.beginPath(); L.moveTo(x, y - h / 2); L.lineTo(x + w, y - h / 2);
  for (let k = 1; k < 3; k++) { L.moveTo(x + (w * k) / 3, y - h); L.lineTo(x + (w * k) / 3, y); }
  L.moveTo(x, y - h); L.lineTo(x + w / 3, y - h / 2); L.stroke();
  // 지붕: 초가(금빛 갈색) 또는 슬레이트
  const thatch = (hs.roof ?? 0.5) < 0.65;
  const roof = P.snow ? '#e6e8e8' : thatch ? '#9a7a46' : '#55524e';
  L.fillStyle = roof;
  L.beginPath(); L.moveTo(x - 3 * s, y - h); L.lineTo(x + w / 2, y - h - roofH); L.lineTo(x + w + 3 * s, y - h); L.closePath(); L.fill();
  L.fillStyle = P.snow ? '#c4cacc' : mixh(roof, '#1a120a', 0.35);
  L.beginPath(); L.moveTo(x + w / 2, y - h - roofH); L.lineTo(x + w + w * 0.28, y - h - roofH + 2 * s); L.lineTo(x + w + w * 0.28 + 2 * s, y - h); L.lineTo(x + w + 3 * s, y - h); L.closePath(); L.fill();
  L.strokeStyle = '#2a1d12'; L.lineWidth = 1; L.beginPath(); L.moveTo(x - 3 * s, y - h); L.lineTo(x + w / 2, y - h - roofH); L.lineTo(x + w + 3 * s, y - h); L.stroke();
  if (thatch && !P.snow) { L.strokeStyle = 'rgba(60,40,20,.35)'; L.beginPath(); for (let k = 1; k < 4; k++) { const t = k / 4; L.moveTo(x - 3 * s + (w / 2 + 3 * s) * t, y - h - roofH * t); L.lineTo(x + w + 3 * s - (w / 2 + 3 * s) * t, y - h - roofH * t); } L.stroke(); }
  // 굴뚝
  L.fillStyle = '#5a4a3c'; L.fillRect(x + w * 0.68, y - h - roofH * 0.75, 3.5 * s, roofH * 0.45);
  // 문과 창
  L.fillStyle = '#3a2618'; L.fillRect(x + w * 0.62, y - h * 0.62, w * 0.16, h * 0.62);
  const wx = x + w * 0.14, wy = y - h * 0.7, ww = Math.max(2, w * 0.14), wh = Math.max(2, h * 0.24);
  L.fillStyle = '#2a2018'; L.fillRect(wx, wy, ww, wh);
  windows.push([wx, wy, ww, wh, hs.seed * 7 + 1]);
  if (hs.kind === 'inn') {
    const wx2 = x + w * 0.36; L.fillRect(wx2, wy, ww, wh); windows.push([wx2, wy, ww, wh, hs.seed * 7 + 2]);
    L.strokeStyle = '#2a1d12'; L.beginPath(); L.moveTo(x - 2, y - h * 0.9); L.lineTo(x - 9 * s, y - h * 0.9); L.stroke();
    L.fillStyle = '#7a5a2a'; L.fillRect(x - 11 * s, y - h * 0.9, 6 * s, 5 * s);
  }
  if (plague && hs.seed % 5 === 0) { L.strokeStyle = '#2a2a2a'; L.lineWidth = 1.4; L.beginPath(); L.moveTo(x + w * 0.66, y - h * 0.5); L.lineTo(x + w * 0.74, y - h * 0.2); L.moveTo(x + w * 0.74, y - h * 0.5); L.lineTo(x + w * 0.66, y - h * 0.2); L.stroke(); }
}

function chapel(L, x, y, s, P, windows) {
  const w = 28 * s, h = 22 * s;
  const wall = '#d6ccb4';
  L.fillStyle = mixh(wall, '#3a2a1a', 0.3); L.fillRect(x + w / 2, y - h, w * 0.8, h);
  L.fillStyle = wall; L.fillRect(x - w / 2, y - h, w, h);
  L.strokeStyle = '#3a2a1c'; L.lineWidth = 1; L.strokeRect(x - w / 2, y - h, w, h);
  // 탑
  const tw = 12 * s, th = 30 * s;
  L.fillStyle = wall; L.fillRect(x - tw / 2, y - h - th, tw, th + h); L.strokeRect(x - tw / 2, y - h - th, tw, th + h);
  L.fillStyle = P.snow ? '#e8eaea' : '#4a4a50';
  L.beginPath(); L.moveTo(x - tw / 2 - 2 * s, y - h - th); L.lineTo(x, y - h - th - 26 * s); L.lineTo(x + tw / 2 + 2 * s, y - h - th); L.closePath(); L.fill(); L.stroke();
  // 성광교 해 문양
  const sy = y - h - th - 30 * s;
  L.strokeStyle = '#c9a25a'; L.lineWidth = 1.2; L.beginPath(); L.arc(x, sy, 2.6 * s, 0, Math.PI * 2); L.stroke();
  for (let a = 0; a < 8; a++) { L.beginPath(); L.moveTo(x + Math.cos(a * Math.PI / 4) * 3.4 * s, sy + Math.sin(a * Math.PI / 4) * 3.4 * s); L.lineTo(x + Math.cos(a * Math.PI / 4) * 5.4 * s, sy + Math.sin(a * Math.PI / 4) * 5.4 * s); L.stroke(); }
  // 창 (아치)
  L.fillStyle = '#2a2018';
  const ww = 3.2 * s, wh = 7 * s;
  for (const dx of [-w * 0.32, w * 0.24]) { L.fillRect(x + dx, y - h * 0.75, ww, wh); windows.push([x + dx, y - h * 0.75, ww, wh, 500 + Math.round(dx)]); }
  L.fillRect(x - 2 * s, y - h - th * 0.7, 4 * s, 7 * s); windows.push([x - 2 * s, y - h - th * 0.7, 4 * s, 7 * s, 600]);
  // 지붕
  L.fillStyle = P.snow ? '#e3e6e6' : '#5a564e';
  L.beginPath(); L.moveTo(x + tw / 2, y - h); L.lineTo(x + w / 2 + w * 0.8, y - h); L.lineTo(x + w / 2 + w * 0.6, y - h - 10 * s); L.lineTo(x + tw / 2, y - h - 10 * s); L.closePath(); L.fill(); L.stroke();
}

function windmill(L, x, y, month, P) {
  const s = 1.1;
  L.fillStyle = '#cbbd9e'; L.strokeStyle = '#3a2a1c'; L.lineWidth = 1.2;
  L.beginPath(); L.moveTo(x - 11 * s, y); L.lineTo(x - 7 * s, y - 40 * s); L.lineTo(x + 7 * s, y - 40 * s); L.lineTo(x + 11 * s, y); L.closePath(); L.fill(); L.stroke();
  L.fillStyle = 'rgba(40,30,20,.25)'; L.beginPath(); L.moveTo(x + 2 * s, y); L.lineTo(x + 2 * s, y - 40 * s); L.lineTo(x + 7 * s, y - 40 * s); L.lineTo(x + 11 * s, y); L.closePath(); L.fill();
  L.fillStyle = P.snow ? '#e6e8e8' : '#6a5240';
  L.beginPath(); L.moveTo(x - 9 * s, y - 40 * s); L.lineTo(x, y - 52 * s); L.lineTo(x + 9 * s, y - 40 * s); L.closePath(); L.fill(); L.stroke();
  L.fillStyle = '#3a2618'; L.fillRect(x - 2.5 * s, y - 9 * s, 5 * s, 9 * s);
  const hx = x, hy = y - 40 * s, ang = month * 0.37;
  L.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    const a = ang + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), len = 34 * s;
    L.strokeStyle = '#3a2a1c'; L.beginPath(); L.moveTo(hx, hy); L.lineTo(hx + ca * len, hy + sa * len); L.stroke();
    L.fillStyle = 'rgba(220,210,186,.85)';
    L.beginPath(); L.moveTo(hx + ca * 8, hy + sa * 8); L.lineTo(hx + ca * len, hy + sa * len); L.lineTo(hx + ca * len - sa * 6, hy + sa * len + ca * 6); L.lineTo(hx + ca * 8 - sa * 6, hy + sa * 8 + ca * 6); L.closePath(); L.fill(); L.stroke();
  }
  L.fillStyle = '#3a2a1c'; L.beginPath(); L.arc(hx, hy, 2, 0, Math.PI * 2); L.fill();
}

function tree(L, x, y, r, P, R, month, big = false) {
  const trunkH = r * (big ? 1.6 : 0.9);
  L.strokeStyle = '#3a2a1c'; L.lineWidth = Math.max(1.2, r * 0.16);
  L.beginPath(); L.moveTo(x, y); L.lineTo(x + r * 0.05, y - trunkH); L.stroke();
  const cy = y - trunkH - r * 0.6;
  if (!P.leaf && !P.autumn) {
    // 겨울: 맨가지
    L.lineWidth = Math.max(0.6, r * 0.06); L.strokeStyle = '#3a2e26';
    for (let k = 0; k < (big ? 14 : 7); k++) {
      const a = -Math.PI / 2 + (R() - 0.5) * 2.2, len = r * (0.7 + R() * 0.7);
      const bx = x, by = y - trunkH * (0.6 + R() * 0.4);
      L.beginPath(); L.moveTo(bx, by); L.quadraticCurveTo(bx + Math.cos(a) * len * 0.5, by + Math.sin(a) * len * 0.6, bx + Math.cos(a) * len, by + Math.sin(a) * len); L.stroke();
    }
    if (P.snow) { L.fillStyle = 'rgba(240,242,242,.7)'; for (let k = 0; k < (big ? 10 : 4); k++) { L.beginPath(); L.ellipse(x + (R() - 0.5) * r * 1.4, cy + (R() - 0.3) * r, r * 0.25, r * 0.08, 0, 0, Math.PI * 2); L.fill(); } }
    return;
  }
  let cols;
  if (P.autumn) cols = ['#b8742e', '#9a4a2a', '#c49a3a', '#8a6a2a'];
  else cols = [P.leaf, mixh(P.leaf, '#1a2410', 0.3), mixh(P.leaf, '#e8e0b0', 0.15)];
  const blobs = big ? 26 : 9;
  for (let k = 0; k < blobs; k++) {
    const bx = x + (R() - 0.5) * r * 1.5, by = cy + (R() - 0.5) * r * 1.1, br = r * (0.35 + R() * 0.35);
    L.fillStyle = cols[Math.floor(R() * cols.length)];
    if (P.autumn && P.autumn < 1 && R() < 0.5) continue;
    L.beginPath(); L.arc(bx, by, br, 0, Math.PI * 2); L.fill();
  }
  // 그늘
  L.fillStyle = 'rgba(20,24,10,.22)'; L.beginPath(); L.arc(x + r * 0.3, cy + r * 0.25, r * 0.7, 0, Math.PI * 2); L.fill();
  if (P.blossom && R() < P.blossom * 2) {
    for (let k = 0; k < (big ? 60 : 16); k++) { L.fillStyle = R() < 0.5 ? '#ecd8d4' : '#e2b8bc'; L.beginPath(); L.arc(x + (R() - 0.5) * r * 1.6, cy + (R() - 0.5) * r * 1.2, 1.2 + R(), 0, Math.PI * 2); L.fill(); }
  }
}

function conifer(L, x, y, h, P) {
  L.fillStyle = '#3a2a1c'; L.fillRect(x - 1.5, y - h * 0.2, 3, h * 0.2);
  for (let k = 0; k < 4; k++) {
    const t = k / 4, w = h * (0.34 - t * 0.07), yy = y - h * 0.15 - t * h * 0.7;
    L.fillStyle = mixh(P.conifer, '#000', k * 0.04);
    L.beginPath(); L.moveTo(x - w, yy); L.lineTo(x, yy - h * 0.38); L.lineTo(x + w, yy); L.closePath(); L.fill();
    if (P.snow) { L.fillStyle = 'rgba(236,238,238,.85)'; L.beginPath(); L.moveTo(x - w * 0.8, yy - 1); L.lineTo(x, yy - h * 0.3); L.lineTo(x + w * 0.3, yy - h * 0.12); L.closePath(); L.fill(); }
  }
}

function townWall(L, x0, x1, yAt, white, P) {
  const stone = white ? '#d9d4c6' : '#a59a86';
  L.strokeStyle = '#2a1d12'; L.lineWidth = 1;
  for (let x = x0; x < x1; x += 6) {
    const y = yAt(x), h = 16;
    L.fillStyle = stone; L.fillRect(x, y - h, 6, h);
    if ((x / 6) % 2 < 1) L.fillRect(x, y - h - 4, 6, 4);
    L.fillStyle = 'rgba(40,30,20,.18)'; L.fillRect(x, y - h, 6, 3);
  }
  L.beginPath(); for (let x = x0; x <= x1; x += 6) { const y = yAt(x); x === x0 ? L.moveTo(x, y) : L.lineTo(x, y); } L.stroke();
  for (const tx of [x0, (x0 + x1) / 2, x1]) {
    const y = yAt(tx);
    L.fillStyle = stone; L.fillRect(tx - 9, y - 30, 18, 30); L.strokeRect(tx - 9, y - 30, 18, 30);
    L.fillStyle = P.snow ? '#e6e8e8' : '#5a4a3e'; L.beginPath(); L.moveTo(tx - 11, y - 30); L.lineTo(tx, y - 44); L.lineTo(tx + 11, y - 30); L.closePath(); L.fill(); L.stroke();
  }
}

function keep(L, x, y, white, P) {
  const stone = white ? '#e2ddd0' : '#b0a590';
  L.strokeStyle = '#2a1d12'; L.lineWidth = 1.1;
  L.fillStyle = stone; L.fillRect(x - 40, y - 46, 80, 46); L.strokeRect(x - 40, y - 46, 80, 46);
  for (const dx of [-46, 34]) { L.fillRect(x + dx, y - 70, 14, 70); L.strokeRect(x + dx, y - 70, 14, 70); L.fillStyle = P.snow ? '#e8eaea' : (white ? '#3e5a8a' : '#4a4a50'); L.beginPath(); L.moveTo(x + dx - 2, y - 70); L.lineTo(x + dx + 7, y - 90); L.lineTo(x + dx + 16, y - 70); L.closePath(); L.fill(); L.stroke(); L.fillStyle = stone; }
  L.fillRect(x - 12, y - 78, 24, 32); L.strokeRect(x - 12, y - 78, 24, 32);
  for (let k = -12; k < 12; k += 6) L.fillRect(x + k, y - 83, 4, 5);
  L.fillStyle = '#2a2018'; L.fillRect(x - 4, y - 70, 3, 6); L.fillRect(x + 2, y - 70, 3, 6);
  L.fillStyle = white ? '#3e5a8a' : '#8a2a1e'; L.beginPath(); L.moveTo(x, y - 83); L.lineTo(x, y - 100); L.lineTo(x + 12, y - 96); L.lineTo(x, y - 92); L.closePath(); L.fill();
}
