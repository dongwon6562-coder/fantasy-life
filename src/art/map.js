// 양피지 대륙 지도. 대륙 지도 Artifact의 그리기 코드를 게임 안으로 옮겼다.
// 지형은 처음 열 때 한 번 그려서 기억해 두고(몇 초 걸림), 장소·길·글자는 SVG로 얹는다.
// 다른 갈래가 끼어드는 곳:
//  - MAP_PLACES_EXTRA에 장소를 넣으면 지도에 나온다 ({ id, n, x, y, t, area, realm, d, todo }).
//  - MAP_ACTIONS에 (game, place) => [{ label, run }] 함수를 넣으면 설명 칸에 버튼이 생긴다 (예: 여행).
//  - 지금 있는 곳은 places.js의 L(g).place (지도 장소 id와 같음). 화면(ui/index.js)이 넘겨준다.
import {
  continents, contGroup, innerSeas, TERRAIN, nations, central, regions, P, roads, oldRoads,
  seaRoutes, ghostRoutes, rivers, seaLabels, edgeLabels, mtLabels,
} from './mapdata.js';
import { INK, PAL, inkSetup, mountain, hill, tree, fir, deadTree, reeds, tuft, dune, crack, field, wave, ship, serpent, contour } from './mapInk.js';

export const MAP_PLACES_EXTRA = [];
export const MAP_ACTIONS = [];
// MAP_INFO에 (game, place) => html 함수를 넣으면 설명 칸 아래에 덧붙는다 (예: 나라의 법과 나와의 관계).
export const MAP_INFO = [];
// 지도의 나라 이름(또는 '레오니아 왕국 남부' 같은 소속 글)에서 나라 id를 찾는다
export const nationOf = (text) => (text ? nations.find((N) => text === N.name || text.startsWith(N.name))?.id ?? null : null);

const NS = "http://www.w3.org/2000/svg";
const WW = 1600, WH = 1000;

/* ---------- deterministic randomness ---------- */
let seed = 500;
let fieldFn = () => 0;
function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function hash(ix, iy, s) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function vnoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, oct, s) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { sum += amp * vnoise(x * f, y * f, s + i * 17); norm += amp; amp *= 0.5; f *= 2.03; }
  return sum / norm;
}
function ridged(x, y, oct, s) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { let n = 1 - Math.abs(vnoise(x * f, y * f, s + i * 31) * 2 - 1); n *= n; sum += amp * n; norm += amp; amp *= 0.5; f *= 2.1; }
  return sum / norm;
}

/* ---------- coarse rasters ---------- */
const GS = 4, GW = WW / GS, GH = WH / GS;
function inside(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function blur(a, r, passes) {
  const t = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < GH; y++) {
      let acc = 0; const row = y * GW;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(GW - 1, Math.max(0, x))];
      for (let x = 0; x < GW; x++) {
        t[row + x] = acc / (2 * r + 1);
        acc += a[row + Math.min(GW - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < GW; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += t[Math.min(GH - 1, Math.max(0, y)) * GW + x];
      for (let y = 0; y < GH; y++) {
        a[y * GW + x] = acc / (2 * r + 1);
        acc += t[Math.min(GH - 1, y + r + 1) * GW + x] - t[Math.max(0, y - r) * GW + x];
      }
    }
  }
  return a;
}
function raster(list, r, passes) {
  const a = new Float32Array(GW * GH);
  for (const [w, poly] of list) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let gy = Math.max(0, Math.floor(y0 / GS)); gy <= Math.min(GH - 1, Math.ceil(y1 / GS)); gy++)
      for (let gx = Math.max(0, Math.floor(x0 / GS)); gx <= Math.min(GW - 1, Math.ceil(x1 / GS)); gx++)
        if (inside(gx * GS + 2, gy * GS + 2, poly)) a[gy * GW + gx] = Math.max(a[gy * GW + gx], w);
  }
  return blur(a, r, passes);
}
function sample(a, x, y) {
  let gx = x / GS - 0.5, gy = y / GS - 0.5;
  if (gx < 0) gx = 0; if (gy < 0) gy = 0; if (gx > GW - 1.001) gx = GW - 1.001; if (gy > GH - 1.001) gy = GH - 1.001;
  const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, i = iy * GW + ix;
  return a[i] * (1 - fx) * (1 - fy) + a[i + 1] * fx * (1 - fy) + a[i + GW] * (1 - fx) * fy + a[i + GW + 1] * fx * fy;
}

/* ---------- terrain render ---------- */
// 두 겹으로 그린다. 물감(땅 빛깔·그늘·얼룩)은 세계 한 칸에 한 점으로 칠해 두 배로 늘리고,
// 그 위에 펜 선(바닷가, 물결선, 산, 나무, 국경)을 두 배 크기로 또렷하게 긋는다.
const INKK = 2;
function renderTerrain(prep) {
  const contMasks = continents.map(c => { const big = /^(dragon|forest|central|demon)$/.test(c.id); return raster([[1, c.pts]], big ? 5 : 2, 3); });
  const land = new Float32Array(GW * GH);
  const contId = new Uint8Array(GW * GH);
  for (let i = 0; i < land.length; i++) {
    let best = 0, bi = 0;
    for (let k = 0; k < contMasks.length; k++) if (contMasks[k][i] > best) { best = contMasks[k][i]; bi = k; }
    land[i] = best; contId[i] = contGroup[continents[bi].id];
  }
  const seaCut = raster(innerSeas, 3, 3);
  for (let i = 0; i < land.length; i++) land[i] = Math.max(0, land[i] - seaCut[i] * 1.2);
  fieldFn = (wx, wy) => { const qx = wx + (fbm(wx / 150, wy / 150, 4, 201) - 0.5) * 130, qy = wy + (fbm(wx / 150, wy / 150, 4, 202) - 0.5) * 130; return sample(land, qx, qy) - 0.5 + (fbm(wx / 70, wy / 70, 6, 11) - 0.5) * 0.95 + (fbm(wx / 20, wy / 20, 3, 13) - 0.5) * 0.32; };
  const excl = prep ? prep() : [];
  const M = {};
  for (const k in TERRAIN) M[k] = raster(TERRAIN[k], k === "blight" || k === "cold" || k === "tropic" ? 9 : 6, 3);

  const CW = WW, CH = WH;
  const wash = document.createElement("canvas"); wash.width = CW; wash.height = CH;
  const wctx = wash.getContext("2d");
  const img = wctx.createImageData(CW, CH);
  const D = img.data;
  const elev = new Float32Array(CW * CH);
  const fieldA = new Float32Array(CW * CH);
  const mxA = new Float32Array(CW * CH), myA = new Float32Array(CW * CH);
  const nat = new Int8Array(CW * CH);

  for (let py = 0; py < CH; py++) {
    for (let px = 0; px < CW; px++) {
      const wx = px, wy = py, i = py * CW + px;
      const qx = wx + (fbm(wx / 150, wy / 150, 4, 201) - 0.5) * 130, qy = wy + (fbm(wx / 150, wy / 150, 4, 202) - 0.5) * 130;
      const n1 = fbm(wx / 70, wy / 70, 6, 11);
      const f = sample(land, qx, qy) - 0.5 + (n1 - 0.5) * 0.95 + (fbm(wx / 20, wy / 20, 3, 13) - 0.5) * 0.32;
      fieldA[i] = f;
      const mx = wx + (qx - wx) * 0.45, my = wy + (qy - wy) * 0.45; mxA[i] = mx; myA[i] = my;
      if (f <= 0) { nat[i] = -1; continue; }
      const mt = sample(M.mountain, mx, my), hl = sample(M.hill, mx, my);
      let e = 0.1 + 0.2 * (1 - Math.exp(-f * 4)) + (fbm(wx / 50, wy / 50, 4, 23) - 0.5) * 0.16;
      if (mt > 0.02) e += mt * ridged(wx / 75, wy / 75, 5, 41) * 0.95;
      if (hl > 0.02) e += hl * ridged(wx / 38, wy / 38, 3, 57) * 0.32;
      elev[i] = e;
      // nation
      const cid = contId[Math.max(0, Math.min(GH - 1, (qy / GS) | 0)) * GW + Math.max(0, Math.min(GW - 1, (qx / GS) | 0))];
      const jx = wx + (fbm(wx / 60, wy / 60, 3, 71) - 0.5) * 60, jy = wy + (fbm(wx / 60, wy / 60, 3, 83) - 0.5) * 60;
      let bd = 1e12, bn = -1;
      for (let n = 0; n < nations.length; n++) {
        const N = nations[n]; if (N.cont !== cid) continue;
        for (const s of N.seeds) { const dx = jx - s[0], dy = jy - s[1], d = (dx * dx + dy * dy) * s[2] * s[2]; if (d < bd) { bd = d; bn = n; } }
      }
      nat[i] = bn;
    }
  }

  const mix = (c, t, k) => { c[0] += (t[0] - c[0]) * k; c[1] += (t[1] - c[1]) * k; c[2] += (t[2] - c[2]) * k; };
  const col = [0, 0, 0];
  const edge = (wx, wy) => { const d = Math.min(wx, wy, WW - wx, WH - wy); return d < 70 ? 1 - d / 70 : 0; };
  // 이웃 나라가 가까우면(국경 띠) 나라 빛깔을 진하게 올린다
  const other = (i, n, px, py, d) => {
    const a = px >= d ? nat[i - d] : n, b = px < CW - d ? nat[i + d] : n, c = py >= d ? nat[i - d * CW] : n, e = py < CH - d ? nat[i + d * CW] : n;
    return (a >= 0 && a !== n) || (b >= 0 && b !== n) || (c >= 0 && c !== n) || (e >= 0 && e !== n);
  };
  for (let py = 0; py < CH; py++) {
    for (let px = 0; px < CW; px++) {
      const i = py * CW + px, o = i * 4, f = fieldA[i];
      const wx = px, wy = py;
      const stain = fbm(wx / 160, wy / 160, 4, 301);
      const grain = vnoise(wx / 2.2, wy / 2.2, 311);
      if (f <= 0) {
        const df = -f;
        col[0] = 174; col[1] = 182; col[2] = 168;
        mix(col, [150, 164, 158], Math.min(1, df / 0.55) * 0.5);
        mix(col, [206, 204, 178], Math.max(0, 1 - df / 0.07) * 0.7);
      } else {
        col[0] = 236; col[1] = 224; col[2] = 192;
        const mx = mxA[i], my = myA[i];
        const fo = sample(M.forest, mx, my); if (fo > 0.02) mix(col, [206, 210, 164], fo * 0.62);
        const bl = sample(M.blight, mx, my); if (bl > 0.02) mix(col, [224, 198, 178], bl * 0.66);
        const ash = sample(M.ash, mx, my); if (ash > 0.02) mix(col, [208, 202, 194], ash * 0.7);
        const cold = sample(M.cold, mx, my); if (cold > 0.02) mix(col, [234, 232, 222], cold * 0.62);
        const sw = sample(M.swamp, mx, my); if (sw > 0.02) mix(col, [196, 206, 176], sw * 0.65);
        const dry = sample(M.dry, mx, my); if (dry > 0.02) mix(col, [238, 216, 168], dry * 0.5);
        const sc = sample(M.scorch, mx, my); if (sc > 0.02) mix(col, [176, 160, 144], sc * 0.6);
        const mt = sample(M.mountain, mx, my); if (mt > 0.05) mix(col, [218, 204, 176], Math.min(1, mt) * 0.28);
        const e = elev[i];
        const xl = px > 0 ? elev[i - 1] : e, xr = px < CW - 1 ? elev[i + 1] : e, yu = py > 0 ? elev[i - CW] : e, yd = py < CH - 1 ? elev[i + CW] : e;
        let sh = 1 + (-(xr - xl) - (yd - yu)) * 3.6; sh = Math.max(0.93, Math.min(1.045, sh));
        col[0] *= sh; col[1] *= sh; col[2] *= sh;
        const n = nat[i];
        if (n >= 0) mix(col, nations[n].c, other(i, n, px, py, 3) ? 0.2 : other(i, n, px, py, 7) ? 0.14 : other(i, n, px, py, 12) ? 0.09 : 0.05);
        if (f < 0.05) mix(col, [150, 122, 84], (1 - f / 0.05) * 0.3);
      }
      const k = 0.9 + stain * 0.16 + (grain - 0.5) * 0.05;
      col[0] *= k; col[1] *= k; col[2] *= k;
      const ed = edge(wx, wy); if (ed > 0) mix(col, [96, 64, 36], ed * ed * 0.75);
      D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
    }
  }
  wctx.putImageData(img, 0, 0);

  const cv = document.createElement("canvas"); cv.width = CW * INKK; cv.height = CH * INKK;
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(wash, 0, 0, cv.width, cv.height);
  ctx.scale(INKK, INKK);
  inkSetup(ctx);

  // 나침반에서 뻗는 방위선 (옛 해도의 바람 장미선)
  ctx.save(); ctx.globalAlpha = 0.085; ctx.lineWidth = 0.4; ctx.beginPath();
  for (let a = 0; a < 16; a++) { const an = a * Math.PI / 8; ctx.moveTo(64, 100); ctx.lineTo(64 + Math.sin(an) * 2400, 100 - Math.cos(an) * 2400); }
  ctx.stroke(); ctx.restore();

  // 물결선과 바닷가 윤곽
  ctx.save();
  [[-0.02, 0.5, 0.42], [-0.046, 0.36, 0.34], [-0.078, 0.24, 0.3], [-0.118, 0.14, 0.28]].forEach(([lv, al, lw]) => { ctx.globalAlpha = al; ctx.lineWidth = lw; ctx.strokeStyle = "#3c4a4a"; contour(ctx, fieldA, CW, CH, lv); });
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.55; ctx.lineWidth = 0.7; contour(ctx, fieldA, CW, CH, 0.006, 0.45, 0.5);
  ctx.globalAlpha = 0.95; ctx.lineWidth = 0.8; contour(ctx, fieldA, CW, CH, 0.006);
  ctx.restore();

  // 국경: 끊어 긋는 선 (칸 모서리를 깎아 계단이 지지 않게)
  ctx.save(); ctx.strokeStyle = "#5a3424"; ctx.globalAlpha = 0.85; ctx.lineWidth = 0.7; ctx.lineCap = "butt"; ctx.beginPath();
  for (let py = 2; py < CH - 2; py++) for (let px = 2; px < CW - 2; px++) {
    const i = py * CW + px, a = nat[i], b = nat[i + 1], c = nat[i + CW + 1], d = nat[i + CW];
    if (a === b && b === c && c === d) continue;
    if (a < 0 || b < 0 || c < 0 || d < 0) continue;
    if ((px + py * 2) % 7 > 4) continue;
    const m = [];
    if (a !== b) m.push(px + 0.5, py); if (b !== c) m.push(px + 1, py + 0.5); if (d !== c) m.push(px + 0.5, py + 1); if (a !== d) m.push(px, py + 0.5);
    if (m.length === 4) { ctx.moveTo(m[0], m[1]); ctx.lineTo(m[2], m[3]); }
    else for (let q = 0; q < m.length; q += 2) { ctx.moveTo(m[q], m[q + 1]); ctx.lineTo(px + 0.5, py + 0.5); }
  }
  ctx.stroke(); ctx.restore();

  drawGlyphs(ctx, CW, CH, fieldA, elev, mxA, myA, M, excl);

  // 테두리: 두 줄 괘선과 눈금
  ctx.save(); ctx.strokeStyle = "#3a2618"; ctx.fillStyle = "#3a2618";
  ctx.lineWidth = 1.3; ctx.strokeRect(4, 4, WW - 8, WH - 8);
  ctx.lineWidth = 0.45; ctx.strokeRect(8.5, 8.5, WW - 17, WH - 17);
  ctx.globalAlpha = 0.85;
  for (let x = 8.5, q = 0; x < WW - 9; x += 25, q++) if (q % 2 === 0) { const w = Math.min(25, WW - 8.5 - x); ctx.fillRect(x, 4.6, w, 3.6); ctx.fillRect(x, WH - 8.2, w, 3.6); }
  for (let y = 8.5, q = 0; y < WH - 9; y += 25, q++) if (q % 2 === 0) { const h = Math.min(25, WH - 8.5 - y); ctx.fillRect(4.6, y, 3.6, h); ctx.fillRect(WW - 8.2, y, 3.6, h); }
  ctx.restore();

  // 종이 결과 얼룩
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.05;
  for (let k = 0; k < 26000; k++) { ctx.fillStyle = rnd() > 0.5 ? "#000" : "#fff"; ctx.fillRect(rnd() * cv.width, rnd() * cv.height, 1.6, 1.6); }
  ctx.globalAlpha = 0.07; ctx.strokeStyle = "#5a4028"; ctx.lineWidth = 0.7;
  for (let k = 0; k < 900; k++) { const x = rnd() * cv.width, y = rnd() * cv.height, a = rnd() * 6.28, l = 6 + rnd() * 18; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rnd() - 0.5) * 6, y + Math.sin(a) * l * 0.5 + (rnd() - 0.5) * 6, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
  for (let k = 0; k < 26; k++) { const x = rnd() * cv.width, y = rnd() * cv.height, r = 8 + rnd() * 26; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(110,72,34,0.9)"); g.addColorStop(1, "rgba(110,72,34,0)"); ctx.globalAlpha = 0.05 + rnd() * 0.07; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  ctx.globalAlpha = 1;
  return cv.toDataURL("image/jpeg", 0.86);
}

function drawGlyphs(ctx, CW, CH, fieldA, elev, mxA, myA, M, excl) {
  const at = (wx, wy) => { const px = Math.round(wx), py = Math.round(wy); if (px < 0 || py < 0 || px >= CW || py >= CH) return -1; return py * CW + px; };
  const blocked = (x, y, pad, up) => { for (const b of excl) if (x + pad > b[0] && x - pad < b[2] && y + 2 > b[1] && y - up < b[3]) return true; return false; };
  const T = (name, i) => sample(M[name], mxA[i], myA[i]);
  const palAt = (i) => (T("blight", i) > 0.4 ? PAL.blight : T("cold", i) > 0.45 ? PAL.cold : mxA[i] < 400 && myA[i] > 250 ? PAL.elf : PAL.land);
  const items = [];
  const grid = (sx, sy, jit, s, fn) => {
    for (let gy = 22, row = 0; gy < WH - 14; gy += sy, row++) for (let gx = 16 + (row & 1) * sx * 0.5; gx < WW - 16; gx += sx) {
      const kx = Math.round(gx * 7), ky = Math.round(gy * 7);
      const x = gx + (hash(kx, ky, s) - 0.5) * jit, y = gy + (hash(kx, ky, s + 1) - 0.5) * jit;
      const i = at(x, y); if (i < 0) continue;
      fn(x, y, i, hash(kx, ky, s + 2), fieldA[i]);
    }
  };
  // 산과 산기슭
  grid(11, 8.5, 8, 401, (x, y, i, r, f) => {
    if (f < 0.04) return;
    const mt = T("mountain", i);
    if (mt > 0.23) {
      const e = elev[i];
      if (r > 0.42 + mt * 0.3 + Math.max(0, e - 0.3) * 0.8) return;
      const s = Math.min(15, (3.4 + mt * 3.4 + Math.max(0, e - 0.3) * 16) * (0.8 + r * 0.5));
      if (blocked(x, y, s, s * 1.5)) return;
      const cold = T("cold", i);
      items.push(["m", x, y, s, r, palAt(i), s > 8.5 && (cold > 0.25 || s > 11.5)]);
    } else if (mt > 0.1 && r < 0.3 && !blocked(x, y, 4, 5)) items.push(["h", x, y, 3 + r * 5, r, palAt(i)]);
  });
  // 언덕
  grid(10, 8, 8, 411, (x, y, i, r, f) => {
    if (f < 0.045 || T("mountain", i) > 0.1) return;
    const hl = T("hill", i);
    if (hl > 0.28 && r < 0.2 + hl * 0.45 && !blocked(x, y, 5, 5)) items.push(["h", x, y, 3.4 + r * 4, r, palAt(i)]);
  });
  // 숲, 죽은 숲
  grid(4.7, 3.9, 4.2, 421, (x, y, i, r, f) => {
    if (f < 0.04 || T("mountain", i) > 0.3) return;
    const dw = T("deadwood", i);
    if (dw > 0.35) { if (r < 0.2 && !blocked(x, y, 3, 6)) items.push(["d", x, y, 2.2 + r * 4, r]); return; }
    const fo = T("forest", i);
    // 숲 가장자리가 성기게 풀리고, 숲 안에는 빈터가 생긴다
    const gap = fbm(x / 26, y / 26, 3, 431);
    if (fo < 0.34 || r > (fo - 0.28) * 4 || gap < 0.34) return;
    if (blocked(x, y, 2.6, 5)) return;
    const cold = T("cold", i), piney = fbm(x / 60, y / 60, 2, 433);
    items.push([cold > 0.3 || piney > 0.6 ? "f" : "t", x, y, 1.7 + hash(Math.round(x * 3), Math.round(y * 3), 437) * 1.5, r, palAt(i)]);
  });
  // 들판의 외딴 나무와 풀, 늪, 메마른 땅, 재, 추운 땅
  grid(13, 11, 12, 441, (x, y, i, r, f) => {
    if (f < 0.05 || T("mountain", i) > 0.1) return;
    if (blocked(x, y, 3, 5)) return;
    const sw = T("swamp", i), sc = T("scorch", i), ash = T("ash", i), dry = T("dry", i), cold = T("cold", i), bl = T("blight", i), fo = T("forest", i), dw = T("deadwood", i);
    if (fo > 0.36 || dw > 0.35) return;
    if (sw > 0.35) { if (r < 0.75) items.push(["s", x, y, 2.6 + r, r]); }
    else if (sc > 0.4) { if (r < 0.6) items.push([r < 0.25 ? "d" : "x", x, y, 2 + r * 2, r]); }
    else if (ash > 0.5) { if (r < 0.5) items.push(["a", x, y, 2.4, r]); }
    else if (bl > 0.4) { if (r < 0.2) items.push(["x", x, y, 2.2, r]); else if (r < 0.34) items.push(["d", x, y, 1.6 + r * 2, r]); else if (r < 0.5) items.push(["a", x, y, 2, r]); }
    else if (dry > 0.35) { if (r < 0.55) items.push(["u", x, y, 2.6 + r * 2, r]); }
    else if (cold > 0.45) { if (r < 0.16) items.push(["f", x, y, 2 + r * 2, r, PAL.cold]); else if (r < 0.5) items.push(["a", x, y, 2, r]); }
    else if (r < 0.05) items.push([fbm(x / 60, y / 60, 2, 433) > 0.6 ? "f" : "t", x, y, 1.9 + r * 8, r, palAt(i)]);
    else if (r < 0.2 && fo > 0.14) items.push(["t", x, y, 2, r, palAt(i)]);
    else if (r < 0.46) items.push(["g", x, y, 1.5 + r, r]);
  });
  // 사람 사는 곳 둘레의 밭
  const farms = [];
  for (const p of allPlaces()) {
    if (p.sea || !/^(capital|city|town)$/.test(p.t)) continue;
    const n = p.t === "town" ? 6 : 10;
    for (let q = 0; q < n * 3 && farms.filter((fm) => fm[6] === p.id).length < n; q++) {
      const r1 = hash(p.x + q * 13, p.y, 451), r2 = hash(p.x, p.y + q * 17, 452), r3 = hash(p.x + q, p.y + q, 453);
      const an = r1 * 6.2832, dist = 9 + r2 * (p.t === "town" ? 13 : 20);
      const x = p.x + Math.cos(an) * dist, y = p.y + Math.sin(an) * dist * 0.8 + 2;
      const i = at(x, y); if (i < 0 || fieldA[i] < 0.07) continue;
      if (T("mountain", i) > 0.14 || T("forest", i) > 0.34 || T("swamp", i) > 0.3 || T("blight", i) > 0.3 || T("cold", i) > 0.5 || T("deadwood", i) > 0.3 || T("scorch", i) > 0.3) continue;
      const w = 4 + r3 * 4, h = 2.6 + r1 * 2.4;
      if (blocked(x, y, w * 0.7, h)) continue;
      if (farms.some((fm) => Math.abs(fm[0] - x) < (fm[2] + w) * 0.55 && Math.abs(fm[1] - y) < (fm[3] + h) * 0.6)) continue;
      farms.push([x, y, w, h, (r2 - 0.5) * 0.7, r3, p.id]);
    }
  }
  for (const [x, y, w, h, an, r] of farms) field(ctx, x, y, w, h, an, r);
  // 밭 위에 겹친 풀·외딴 나무는 뺀다
  const onFarm = (x, y) => farms.some((fm) => Math.abs(fm[0] - x) < fm[2] * 0.7 && Math.abs(fm[1] - y) < fm[3] * 0.9 + 2);

  items.sort((a, b) => a[2] - b[2]);
  for (const [t, x, y, s, r, pal, snow] of items) {
    ctx.strokeStyle = INK;
    if (t === "m") mountain(ctx, x, y, s, r, { pal, snow });
    else if (t === "h") hill(ctx, x, y, s, r, { pal });
    else if (t === "t") { if (!onFarm(x, y)) tree(ctx, x, y, s, r, { pal }); }
    else if (t === "f") { if (!onFarm(x, y)) fir(ctx, x, y, s, r, { pal }); }
    else if (t === "d") deadTree(ctx, x, y, s, r);
    else if (t === "s") reeds(ctx, x, y, s, r);
    else if (t === "x") crack(ctx, x, y, s, r);
    else if (t === "u") dune(ctx, x, y, s, r);
    else if (t === "g") { if (!onFarm(x, y)) { ctx.globalAlpha = 0.7; tuft(ctx, x, y, s); ctx.globalAlpha = 1; } }
    else { ctx.fillStyle = INK; ctx.globalAlpha = 0.7; for (let q = 0; q < 4; q++) ctx.fillRect(x + (hash(q, Math.round(x), 461) - 0.5) * 7, y + (hash(q, Math.round(y), 462) - 0.5) * 5, 0.45, 0.45); ctx.globalAlpha = 1; }
  }

  // 먼바다의 잔물결, 배, 바다뱀
  ctx.save(); ctx.strokeStyle = "#3c4a4a"; ctx.lineWidth = 0.36; ctx.globalAlpha = 0.5;
  grid(34, 22, 26, 471, (x, y, i, r, f) => { if (f < -0.2 && r < 0.42 && !blocked(x, y, 6, 4) && Math.min(x, y, WW - x, WH - y) > 26) wave(ctx, x, y, 1.6 + r * 2); });
  ctx.restore();
  ctx.strokeStyle = INK;
  [[838, 874, 2.3, false], [1146, 704, 2.1, true], [1128, 232, 1.9, false], [392, 478, 1.7, true], [1002, 968, 2, false]].forEach(([x, y, s, fl]) => { const i = at(x, y); if (i >= 0 && fieldA[i] < -0.05 && !blocked(x, y, 8, 10)) ship(ctx, x, y, s, fl); });
  [[96, 968, 2.6], [1554, 262, 2.2]].forEach(([x, y, s]) => { const i = at(x, y); if (i >= 0 && fieldA[i] < -0.08) serpent(ctx, x, y, s); });
}

/* ---------- svg helpers ---------- */
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
}
function roughen(pts, iters, amt) {
  let p = pts.slice();
  for (let i = 0; i < iters; i++) {
    const out = [];
    for (let j = 0; j < p.length - 1; j++) {
      const a = p[j], b = p[j + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const off = (rnd() - 0.5) * len * amt;
      out.push(a, [(a[0] + b[0]) / 2 - dy / len * off, (a[1] + b[1]) / 2 + dx / len * off]);
    }
    out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}
function smoothPath(p) {
  let d = "M" + p[0][0].toFixed(1) + " " + p[0][1].toFixed(1);
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
    d += " Q" + p[i][0].toFixed(1) + " " + p[i][1].toFixed(1) + " " + mx.toFixed(1) + " " + my.toFixed(1);
  }
  const l = p[p.length - 1];
  return d + " L" + l[0].toFixed(1) + " " + l[1].toFixed(1);
}

/* ---------- 게임 화면에 지도 붙이기 ---------- */
const KIND = { capital: "수도", city: "도시", town: "마을", fort: "요새", site: "장소", dungeon: "미궁", ruin: "폐허" };
let terrainUrl = null;
let snapped = false;

function allPlaces() {
  const seen = new Set();
  const out = [];
  for (const p of [...P, ...MAP_PLACES_EXTRA]) { if (seen.has(p.id)) continue; seen.add(p.id); out.push(p); }
  return out;
}

// 땅 위에 있어야 할 장소·이름을 바닷가에서 안쪽으로 살짝 옮기고, 산 기호를 피할 글자 칸을 돌려준다.
function prepare() {
  const places = allPlaces();
  if (!snapped) {
    const snap = (o, need) => {
      if (fieldFn(o.x, o.y) >= need) return;
      for (let r = 4; r <= 90; r += 4) {
        let best = null, bf = need;
        for (let a = 0; a < 24; a++) {
          const x = o.x + Math.cos(a / 24 * Math.PI * 2) * r, y = o.y + Math.sin(a / 24 * Math.PI * 2) * r;
          const f = fieldFn(x, y);
          if (f >= bf) { bf = f; best = [x, y]; }
        }
        if (best) { o.x = Math.round(best[0]); o.y = Math.round(best[1]); return; }
      }
    };
    places.forEach((p) => { if (!p.sea) snap(p, 0.06); });
    regions.forEach((r) => { if (!r.big) snap(r, 0.08); });
    snapped = true;
  }
  const boxes = [];
  places.forEach((p) => {
    boxes.push([p.x - 12, p.y - 12, p.x + 12, p.y + 10]);
    const small = p.tier === 3, fs = small ? 9.5 : p.t === "capital" ? 14.5 : 12.5;
    const lx = p.x + (p.lx || 0), ly = p.y + (p.ly != null ? p.ly : (small ? 15 : 19));
    const w = p.n.length * fs * 0.98 + 6;
    boxes.push([lx - w / 2, ly - fs - 1, lx + w / 2, ly + 4]);
  });
  regions.concat([Object.assign({ x: 760, y: 262, s: 22, big: true }, central)]).forEach((r) => {
    const fs = r.s * 1.12, ls = r.big ? 7 : 2.5;
    if (r.vertical) { const h = r.name.length * (fs + 10); boxes.push([r.x - fs * 0.7, r.y - 6, r.x + fs * 0.7, r.y + h]); return; }
    const w = r.name.length * (fs + ls) + 8;
    boxes.push([r.x - w / 2, r.y - fs - 2, r.x + w / 2, r.y + 6]);
  });
  mtLabels.forEach(([t, x, y]) => { const w = t.length * 15; boxes.push([x - w / 2, y - 12, x + w / 2, y + 4]); });
  return boxes;
}

export const mapReady = () => !!terrainUrl;

/**
 * 지도를 container 안에 그린다. 돌려받은 함수를 부르면 이벤트를 정리한다.
 * opt: { here: 장소 id, game, onChange: 지도 밖 화면을 다시 그려야 할 때 }
 */
export function mountMap(container, opt = {}) {
  const here = opt.here ?? "ern";
  const ac = new AbortController();
  container.innerHTML = `
    <div class="map-tools">
      <span class="note">끌어서 움직이고, 두 손가락이나 휠로 확대한다. 확대하면 작은 마을과 미궁이 더 보인다.</span>
      <span class="zoom">
        <button class="ghost sm" data-z="in" aria-label="확대">+</button>
        <button class="ghost sm" data-z="out" aria-label="축소">−</button>
        <button class="ghost sm" data-z="here">지금 있는 곳</button>
        <button class="ghost sm" data-z="all">전체</button>
      </span>
    </div>
    <div class="mapbox"><svg viewBox="0 0 ${WW} ${WH}" role="img" aria-label="용사력 500년 대륙 지도"></svg><div class="map-loading">양피지에 지도를 옮겨 그리는 중…</div></div>
    <aside class="map-info" aria-live="polite"></aside>`;
  const svg = container.querySelector("svg");
  const info = container.querySelector(".map-info");
  const go = () => {
    if (ac.signal.aborted) return;
    seed = 500;
    if (!terrainUrl) terrainUrl = renderTerrain(prepare);
    else prepare();
    container.querySelector(".map-loading")?.remove();
    build(svg, info, here, opt, ac.signal);
  };
  // 첫 그림은 몇 초 걸리니 '그리는 중' 글자가 먼저 보이게 한 박자 쉰다
  if (terrainUrl) go(); else setTimeout(go, 40);
  return () => ac.abort();
}

const SERIF = "Gowun Batang, serif";
const PAPER = "#f0e6cb";
// 가늘게 시작해 굵어지는 띠 (강)
function ribbon(p, w0, w1) {
  const L = [], R = [], n = p.length;
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * Math.pow(i / (n - 1), 0.8)) / 2;
    L.push([p[i][0] - dy / len * w, p[i][1] + dx / len * w]); R.push([p[i][0] + dy / len * w, p[i][1] - dx / len * w]);
  }
  return "M" + L.concat(R.reverse()).map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L") + "Z";
}
// 장소 기호: 원점 둘레에 그린다 (묶음째로 크기가 바뀐다)
function marker(p, g) {
  const ink = "#2b2018";
  const mk = (tag, a) => el(tag, Object.assign({ class: "mk", stroke: ink, "stroke-width": 1.3, fill: PAPER, "stroke-linejoin": "round" }, a), g);
  if (p.t === "capital") {
    mk("circle", { cx: 0, cy: 0, r: 7.2, "stroke-width": 1.5 });
    el("circle", { cx: 0, cy: 0, r: 5.5, fill: "none", stroke: ink, "stroke-width": 0.45 }, g);
    el("path", { d: "M-3.7 3.2V-1h1.3v1.1h1.2V-3.5h0.8v-1h0.8v1h0.8V0.1h1.2V-1h1.3V3.2Z", fill: ink }, g);
  } else if (p.t === "city") {
    mk("circle", { cx: 0, cy: 0, r: 5.2, "stroke-width": 1.4 });
    el("path", { d: "M-2.6 2.4V-0.6h1.2v0.9h0.8V-2.4h1.2v2.7h0.8v-0.9h1.2V2.4Z", fill: ink }, g);
  } else if (p.t === "town") {
    mk("circle", { cx: 0, cy: 0, r: 3.3, "stroke-width": 1.2 });
    el("circle", { cx: 0, cy: 0, r: 1.3, fill: ink }, g);
  } else if (p.t === "fort") {
    mk("path", { d: "M-5 5V-2.6h2v1.6h2V-4.8h2v3.8h2v-1.6h2V5Z", "stroke-width": 1.2 });
    el("path", { d: "M-1 5V2.4a1 1 0 0 1 2 0V5Z", fill: ink }, g);
  } else if (p.t === "dungeon") {
    mk("path", { d: "M-5 5.2V-0.8a5 5 0 0 1 10 0V5.2Z", fill: "#2c1822", stroke: "#d9a84e", "stroke-width": 1.3 });
    el("path", { d: "M-2.2 5.2V0.2a2.2 2.2 0 0 1 4.4 0V5.2Z", fill: "#d9a84e" }, g);
  } else if (p.t === "ruin") {
    mk("path", { d: "M-6 5.2h12v-1.6h-1.4V-3.6l-1.3 1.2-1.3-1.4V3.6h-2V-0.4l-1.2-1.1-1.4 1V3.6H-6Z", fill: "#dccfb0", stroke: "#4a3828", "stroke-width": 1.1 });
  } else {
    mk("path", { d: "M0 -6.6L5.2 0L0 6.6L-5.2 0Z", "stroke-width": 1.3 });
    el("circle", { cx: 0, cy: 0, r: 1.4, fill: ink }, g);
  }
}

function build(svg, info, here, opt, signal) {
  const places = allPlaces();
  const byId = {}; places.forEach((p) => byId[p.id] = p);
  el("image", { href: terrainUrl, x: 0, y: 0, width: WW, height: WH, preserveAspectRatio: "none" }, svg);
  const pin = (g, x, y, v) => { g.style.transform = `translate(${x}px, ${y}px) scale(var(${v}, 1))`; };

  // 호수
  const lakeG = el("g", {}, svg);
  [[[676,452],[700,440],[726,448],[732,474],[712,494],[684,490],[670,470]], [[106,320],[130,314],[140,332],[120,344],[102,336]]].forEach((l) => {
    const r = roughen(l.concat([l[0]]), 3, 0.3);
    const cx = l.reduce((s, q) => s + q[0], 0) / l.length, cy = l.reduce((s, q) => s + q[1], 0) / l.length;
    el("path", { d: smoothPath(r) + "Z", fill: "#aebbab", stroke: "#33261a", "stroke-width": 0.9 }, lakeG);
    [0.82, 0.62].forEach((k, q) => el("path", { d: smoothPath(r.map((p) => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k])) + "Z", fill: "none", stroke: "#3c4a4a", "stroke-width": 0.4, opacity: 0.5 - q * 0.2 }, lakeG));
  });
  // 강: 샘에서 가늘게 시작해 하구로 갈수록 굵어진다
  const riverG = el("g", {}, svg);
  rivers.forEach((r) => {
    let pts = roughen(r.pts, 4, 0.32);
    let a = 0; while (a < pts.length - 2 && fieldFn(pts[a][0], pts[a][1]) < 0.04) a++;
    let b = a; while (b < pts.length - 1 && fieldFn(pts[b][0], pts[b][1]) > -0.01) b++;
    pts = pts.slice(a, b + 1);
    if (pts.length < 3) return;
    for (let q = 0; q < 2; q++) { const o = [pts[0]]; for (let j = 0; j < pts.length - 1; j++) { const u = pts[j], v = pts[j + 1]; o.push([u[0] * 0.75 + v[0] * 0.25, u[1] * 0.75 + v[1] * 0.25], [u[0] * 0.25 + v[0] * 0.75, u[1] * 0.25 + v[1] * 0.75]); } o.push(pts[pts.length - 1]); pts = o; }
    const big = !!r.n;
    el("path", { d: ribbon(pts, 0.7, big ? 3.3 : 2.3), fill: "#7fa0a2", stroke: "#2d4348", "stroke-width": 0.55, "stroke-linejoin": "round" }, riverG);
    if (r.n) el("text", { class: "t3", x: r.lx, y: r.ly, "font-family": SERIF, "font-style": "italic", "font-size": 9, fill: "#2d4a52", stroke: PAPER, "stroke-width": 2, "paint-order": "stroke" }, riverG).textContent = r.n;
  });
  // 길과 뱃길
  const roadG = el("g", {}, svg);
  const roadLine = (ids, old) => {
    for (let i = 0; i < ids.length - 1; i++) {
      const a = byId[ids[i]], b = byId[ids[i + 1]];
      if (!a || !b) continue;
      const pts = roughen([[a.x, a.y], [(a.x + b.x) / 2 + (rnd() - 0.5) * 14, (a.y + b.y) / 2 + (rnd() - 0.5) * 14], [b.x, b.y]], 3, 0.25);
      const d = smoothPath(pts);
      if (!old) el("path", { d, fill: "none", stroke: PAPER, "stroke-width": 2.4, "stroke-linecap": "round", opacity: 0.5 }, roadG);
      el("path", { d, fill: "none", stroke: old ? "#5a4636" : "#553a24", "stroke-width": old ? 0.95 : 1.15, "stroke-dasharray": old ? "1 3.4" : "4.2 2.2", "stroke-linecap": "round", opacity: old ? 0.75 : 0.88 }, roadG);
    }
  };
  roads.forEach((r) => roadLine(r, false));
  oldRoads.forEach((r) => roadLine(r, true));
  ghostRoutes.forEach((s) => el("path", { d: smoothPath(s), fill: "none", stroke: "#3f565e", "stroke-width": 1, "stroke-dasharray": "0.6 6", "stroke-linecap": "round", opacity: 0.5 }, roadG));
  seaRoutes.forEach((s) => el("path", { d: smoothPath(s), fill: "none", stroke: "#3f565e", "stroke-width": 1.2, "stroke-dasharray": "0.6 4", "stroke-linecap": "round", opacity: 0.8 }, roadG));

  // 바다·산 이름, 나침반, 축척
  const decoG = el("g", {}, svg);
  edgeLabels.forEach(([t, x, y, s]) => el("text", { x, y: Math.max(26, Math.min(WH - 15, y)), "text-anchor": "middle", "font-family": SERIF, "font-style": "italic", "font-size": s, "letter-spacing": 3, fill: "#44524f", opacity: 0.9 }, decoG).textContent = t);
  seaLabels.forEach(([t, x, y, s]) => el("text", { x, y, "text-anchor": "middle", "font-family": SERIF, "font-style": "italic", "font-size": s, "letter-spacing": 5, fill: "#44524f" }, decoG).textContent = t);
  mtLabels.forEach(([t, x, y]) => el("text", { x, y, "text-anchor": "middle", "font-family": SERIF, "font-style": "italic", "font-weight": 700, "font-size": 11, "letter-spacing": 3, fill: "#3a2e22", stroke: PAPER, "stroke-width": 2.2, "paint-order": "stroke", opacity: 0.88 }, decoG).textContent = t);
  // 나침반: 열여섯 방위의 바람 장미
  const cp = el("g", { transform: "translate(64 100)" }, decoG);
  el("circle", { cx: 0, cy: 0, r: 37, fill: "#eadfc2", "fill-opacity": 0.35, stroke: "#4a3524", "stroke-width": 1 }, cp);
  el("circle", { cx: 0, cy: 0, r: 33.5, fill: "none", stroke: "#4a3524", "stroke-width": 0.45 }, cp);
  for (let a = 0; a < 32; a++) { const an = a * Math.PI / 16, r0 = a % 2 ? 34.6 : 33.5; el("path", { d: `M${Math.sin(an) * r0} ${-Math.cos(an) * r0}L${Math.sin(an) * 37} ${-Math.cos(an) * 37}`, stroke: "#4a3524", "stroke-width": 0.5 }, cp); }
  const ray = (ang, r, w, dark, light) => {
    const tx = Math.sin(ang) * r, ty = -Math.cos(ang) * r, lx = Math.cos(ang) * w, ly = Math.sin(ang) * w;
    el("path", { d: `M0 0L${lx} ${ly}L${tx} ${ty}Z`, fill: dark, stroke: "#3a2618", "stroke-width": 0.35, "stroke-linejoin": "round" }, cp);
    el("path", { d: `M0 0L${-lx} ${-ly}L${tx} ${ty}Z`, fill: light, stroke: "#3a2618", "stroke-width": 0.35, "stroke-linejoin": "round" }, cp);
  };
  for (let a = 0; a < 8; a++) ray((a + 0.5) * Math.PI / 4, 21, 3, "#8a7250", "#e6d9b8");
  for (let a = 0; a < 4; a++) ray((a + 0.5) * Math.PI / 2, 31, 4.6, "#6a5238", "#e6d9b8");
  for (let a = 0; a < 4; a++) ray(a * Math.PI / 2, a === 0 ? 50 : 44, 6.4, a === 0 ? "#8c2a1a" : "#4a3524", "#eadfc2");
  el("circle", { cx: 0, cy: 0, r: 2.6, fill: "#eadfc2", stroke: "#3a2618", "stroke-width": 0.7 }, cp);
  el("text", { x: 0, y: -55, "text-anchor": "middle", fill: "#3a2214", "font-family": SERIF, "font-size": 13, "font-weight": 700 }, cp).textContent = "북";
  // 제목과 축척
  const sb = el("g", { transform: "translate(1392 950)" }, decoG);
  el("text", { x: 90, y: -19, "text-anchor": "middle", "font-family": SERIF, "font-weight": 700, "font-size": 11.5, "letter-spacing": 2.5, fill: "#3a2214" }, sb).textContent = "대륙 전도 · 용사력 500년";
  el("path", { d: "M8 -14H76M104 -14H172M84 -14l6 -2.6l6 2.6l-6 2.6Z", fill: "#3a2214", stroke: "#3a2214", "stroke-width": 0.5 }, sb);
  for (let k = 0; k < 5; k++) el("rect", { x: k * 36, y: 0, width: 36, height: 4.6, fill: k % 2 ? "#efe2c2" : "#3a2214", stroke: "#3a2214", "stroke-width": 0.7 }, sb);
  el("text", { x: 0, y: -3.5, "font-family": SERIF, "font-size": 9, fill: "#3a2214" }, sb).textContent = "0";
  el("text", { x: 180, y: -3.5, "text-anchor": "end", "font-family": SERIF, "font-size": 9, fill: "#3a2214" }, sb).textContent = "말 타고 닷새";
  // 북부 전선
  const frontG = el("g", {}, svg);
  el("path", { d: "M1082 300 Q1120 340 1192 382", fill: "none", stroke: "#9a2618", "stroke-width": 2.6, "stroke-dasharray": "7 4", "stroke-linecap": "round" }, frontG);
  for (let k = 0; k < 4; k++) { const t = 0.16 + k * 0.23, x = (1 - t) * (1 - t) * 1082 + 2 * (1 - t) * t * 1120 + t * t * 1192, y = (1 - t) * (1 - t) * 300 + 2 * (1 - t) * t * 340 + t * t * 382; el("path", { d: `M${x - 3.4} ${y - 3.4}L${x + 3.4} ${y + 3.4}M${x + 3.4} ${y - 3.4}L${x - 3.4} ${y + 3.4}`, stroke: "#6e1a10", "stroke-width": 1.1, "stroke-linecap": "round" }, frontG); }
  el("text", { x: 1166, y: 328, "text-anchor": "middle", fill: "#9a2618", stroke: PAPER, "stroke-width": 3, "paint-order": "stroke", "font-family": SERIF, "font-size": 12.5, "font-weight": 700 }, frontG).textContent = "북부 전선";

  // 설명 칸
  let current = null;
  const show = (d, g, place) => {
    if (current) current.classList.remove("on");
    current = g || null; if (current) current.classList.add("on");
    const isHere = place && place.id === here;
    const acts = place && opt.game ? MAP_ACTIONS.flatMap((fn) => { try { return fn(opt.game, place) || []; } catch (e) { console.error(e); return []; } }) : [];
    const extra = place && opt.game ? MAP_INFO.map((fn) => { try { return fn(opt.game, place) || ''; } catch (e) { console.error(e); return ''; } }).join('') : '';
    info.innerHTML = `<p class="kind">${d.kind ?? ""}${isHere ? ' · <b class="here">지금 있는 곳</b>' : ""}</p>
      <h3>${d.name}</h3><p class="note">${d.realm ?? ""}</p><p class="desc">${d.desc ?? ""}</p>
      ${d.todo ? `<p class="todo"><span>할 수 있는 일</span>${d.todo}</p>` : ""}
      ${extra}
      ${acts.length ? `<div class="actions-row">${acts.map((a, i) => `<button class="ghost" data-map-act="${i}">${a.label}</button>`).join("")}</div>` : ""}`;
    info.querySelectorAll("[data-map-act]").forEach((b) => b.addEventListener("click", () => { acts[+b.dataset.mapAct].run(); opt.onChange?.(); }));
  };
  const bind = (g, fn) => {
    g.addEventListener("click", () => { if (moved) return; fn(); });
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  // 나라·대륙 이름
  const nameG = el("g", {}, svg);
  const regionLabel = (r) => {
    const g = el("g", { class: "rlbl", tabindex: 0, role: "button", "aria-label": r.name }, nameG);
    pin(g, Math.min(r.x, WW - 30), Math.min(r.y, WH - 17), r.big ? "--rb" : "--rs");
    const attrs = { x: 0, y: 0, "text-anchor": "middle", "font-family": SERIF, "font-weight": 700, "font-size": r.s * 1.12, "letter-spacing": r.big ? 7 : 3,
      fill: r.big ? "#3a2214" : "#4a2a1c", stroke: PAPER, "stroke-width": r.big ? 4 : 3, "stroke-linejoin": "round", "paint-order": "stroke" };
    if (r.vertical) { attrs["writing-mode"] = "vertical-rl"; attrs["letter-spacing"] = 10; }
    el("text", attrs, g).textContent = r.name;
    // 나라 이름을 누르면 그 나라 전체를 고른 것으로 친다 (id 없음, nation만)
    const nation = nationOf(r.name);
    bind(g, () => show(r, g, nation ? { id: null, n: r.name, region: true, nation } : null));
  };
  regions.forEach(regionLabel);
  regionLabel(Object.assign({ x: 760, y: 262, s: 22, big: true }, central));

  // 장소
  const placeG = el("g", {}, svg);
  let hereP = null;
  const labels = [];
  places.forEach((p) => {
    const g = el("g", { class: "place" + (p.tier === 3 && p.id !== here ? " t3" : ""), tabindex: 0, role: "button", "aria-label": p.n }, placeG);
    pin(g, p.x, p.y, "--ls");
    el("circle", { class: "hit", cx: 0, cy: 0, r: 14, fill: "transparent" }, g);
    const small = p.tier === 3;
    marker(p, g);
    const lx = p.lx || 0, ly = p.ly != null ? p.ly : (small ? 15 : 19);
    el("text", { x: lx, y: ly, "text-anchor": "middle", "font-family": SERIF, "font-weight": 700, "font-size": small ? 10 : p.t === "capital" ? 14 : 12,
      fill: "#241a12", stroke: PAPER, "stroke-width": small ? 2.4 : 3, "stroke-linejoin": "round", "paint-order": "stroke" }, g).textContent = p.n;
    labels.push([g.lastChild, p.id === here || p.t === "capital" ? 0 : p.t === "city" ? 1 : 2]);
    const data = { kind: KIND[p.t] ?? "장소", name: p.n, realm: p.realm, desc: p.d, todo: p.todo };
    if (p.nation === undefined) p.nation = nationOf(p.realm);
    p._g = g; p._data = data;
    if (p.id === here) hereP = p;
    bind(g, () => show(data, g, p));
  });
  // 지금 있는 곳 표시: 붉은 고리와 깃발
  if (hereP) {
    const hg = el("g", { class: "here-mark", "pointer-events": "none" }, svg);
    pin(hg, hereP.x, hereP.y, "--ls");
    el("circle", { cx: 0, cy: 0, r: 10.5, fill: "none", stroke: "#9a2a17", "stroke-width": 1.8 }, hg);
    el("circle", { cx: 0, cy: 0, r: 15, fill: "none", stroke: "#9a2a17", "stroke-width": 0.8, "stroke-dasharray": "2.4 2.4" }, hg);
    el("path", { d: "M0 -10.5V-33", stroke: "#3a1a10", "stroke-width": 1.3, "stroke-linecap": "round" }, hg);
    el("path", { d: "M0.6 -33Q7 -34.5 14 -30.5Q7 -28.5 0.6 -24.5Z", fill: "#9a2a17", stroke: "#3a1a10", "stroke-width": 0.9, "stroke-linejoin": "round" }, hg);
    show(hereP._data, hereP._g, hereP);
  } else show(central, null);

  // 확대·이동. 지도 칸의 모양(가로세로 비)에 맞춰 보이는 범위를 잡아, 좁은 화면에서도 칸이 꽉 찬다.
  const vb = { x: 0, y: 0, w: WW, h: WH };
  let moved = false, lastFar = 0;
  const apply = () => {
    const r = svg.getBoundingClientRect();
    const asp = r.width > 0 && r.height > 0 ? r.height / r.width : WH / WW;
    const maxW = Math.min(WW, WH / asp);
    vb.w = Math.max(Math.min(240, maxW), Math.min(maxW, vb.w)); vb.h = vb.w * asp;
    vb.x = Math.max(0, Math.min(WW - vb.w, vb.x)); vb.y = Math.max(0, Math.min(WH - vb.h, vb.y));
    svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    svg.classList.toggle("zoomed", WW / vb.w >= 1.7);
    // 글자와 기호는 화면에서 늘 비슷한 크기로 읽히게, 확대·축소에 맞춰 크기를 바꾼다
    const ppu = r.width > 0 ? r.width / vb.w : 1, z = Math.max(0, Math.min(1, (WW / vb.w - 1) / 1.4));
    // 멀리서 볼 때는 큰 곳 이름만 남겨 글자가 겹치지 않게 한다 (1: 수도와 도시, 2: 수도만)
    const far = ppu < 0.37 ? 2 : ppu < 0.55 ? 1 : 0;
    if (far !== lastFar) { lastFar = far; labels.forEach(([t, imp]) => { t.style.display = imp >= 3 - far ? "none" : ""; }); }
    svg.style.setProperty("--ls", Math.max(0.5, Math.min(far ? 1.4 : 1.15 + 0.6 * z, 0.95 / ppu)).toFixed(3));
    svg.style.setProperty("--rs", Math.max(0.6, Math.min(1.1 + 0.3 * z, 1 / ppu)).toFixed(3));
    svg.style.setProperty("--rb", Math.max(0.6, Math.min(1.12, 1 / ppu)).toFixed(3));
  };
  const toWorld = (cx, cy) => { const r = svg.getBoundingClientRect(); return [vb.x + (cx - r.left) / r.width * vb.w, vb.y + (cy - r.top) / r.height * vb.h]; };
  const zoomAt = (f, wx, wy) => { const nw = Math.max(240, Math.min(WW, vb.w / f)); const k = nw / vb.w; vb.x = wx - (wx - vb.x) * k; vb.y = wy - (wy - vb.y) * k; vb.w = nw; apply(); };
  const focusOn = (p, w = 520) => { vb.w = w; apply(); vb.x = p.x - vb.w / 2; vb.y = p.y - vb.h / 2; apply(); };
  if (typeof ResizeObserver !== "undefined") { const ro = new ResizeObserver(() => apply()); ro.observe(svg); signal.addEventListener("abort", () => ro.disconnect()); }
  const o = { signal };
  svg.addEventListener("wheel", (e) => { e.preventDefault(); const [wx, wy] = toWorld(e.clientX, e.clientY); zoomAt(Math.exp(-e.deltaY * 0.0015), wx, wy); }, { passive: false, signal });
  const ptrs = new Map(); let last = null, startPt = null, pinch = null;
  svg.addEventListener("pointerdown", (e) => {
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) { last = [e.clientX, e.clientY]; startPt = last; moved = false; }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; }
  }, o);
  window.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const r = svg.getBoundingClientRect();
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const [wx, wy] = toWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      zoomAt(d / pinch.d, wx, wy); pinch.d = d; moved = true; return;
    }
    if (ptrs.size === 1 && last) {
      if (Math.hypot(e.clientX - startPt[0], e.clientY - startPt[1]) > 5) { moved = true; svg.classList.add("drag"); }
      if (moved) { vb.x -= (e.clientX - last[0]) / r.width * vb.w; vb.y -= (e.clientY - last[1]) / r.height * vb.h; apply(); }
      last = [e.clientX, e.clientY];
    }
  }, o);
  const up = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) { last = null; svg.classList.remove("drag"); setTimeout(() => { moved = false; }, 0); }
  };
  window.addEventListener("pointerup", up, o); window.addEventListener("pointercancel", up, o);
  const box = svg.closest(".mapbox").parentElement;
  box.querySelector('[data-z="in"]').addEventListener("click", () => zoomAt(1.5, vb.x + vb.w / 2, vb.y + vb.h / 2), o);
  box.querySelector('[data-z="out"]').addEventListener("click", () => zoomAt(1 / 1.5, vb.x + vb.w / 2, vb.y + vb.h / 2), o);
  box.querySelector('[data-z="all"]').addEventListener("click", () => { vb.x = 0; vb.y = 0; vb.w = WW; apply(); }, o);
  box.querySelector('[data-z="here"]').addEventListener("click", () => { if (hereP) { focusOn(hereP); show(hereP._data, hereP._g, hereP); } }, o);
  // 처음엔 지금 있는 곳 둘레를 보여 준다
  if (hereP) focusOn(hereP, Math.max(380, Math.min(640, svg.getBoundingClientRect().width * 1.15 || 640))); else apply();
}
