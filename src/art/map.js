// 양피지 대륙 지도. 대륙 지도 Artifact의 그리기 코드를 게임 안으로 옮겼다.
// 지형은 처음 열 때 한 번 그려서 기억해 두고(몇 초 걸림), 장소·길·글자는 SVG로 얹는다.
// 다른 갈래가 끼어드는 곳:
//  - MAP_PLACES_EXTRA에 장소를 넣으면 지도에 나온다 ({ id, n, x, y, t, area, realm, d, todo }).
//  - MAP_ACTIONS에 (game, place) => [{ label, run }] 함수를 넣으면 설명 칸에 버튼이 생긴다 (예: 여행).
//  - 지금 있는 곳은 places.js의 L(g).place (지도 장소 id와 같음). 화면(ui/index.js)이 넘겨준다.
import { drawTrail, drawBeyond } from './mapTrail.js';
import { drawMarks, legendHtml, MAP_MARKS } from './mapMarks.js';
import { townMapSvg } from './mapTown.js';
import {
  continents, contGroup, innerSeas, TERRAIN, nations, central, regions, P, roads, oldRoads,
  seaRoutes, ghostRoutes, rivers, seaLabels, edgeLabels, mtLabels,
} from './mapdata.js';
import { INK, PAL, inkSetup, mountain, hill, tree, fir, deadTree, reeds, tuft, dune, crack, field, wave, ship, serpent, contour } from './mapInk.js';
import { canvasUrl } from './sceneKit.js';

export const MAP_PLACES_EXTRA = [];
// 38단계: 지도 위 표 (소문 난 곳·험한 곳). (game) => [{ place, kind: 'rumor'|'danger'|'note', text }]
export { MAP_MARKS };
export const MAP_ACTIONS = [];
// MAP_INFO에 (game, place) => html 함수를 넣으면 설명 칸 아래에 덧붙는다 (예: 나라의 법과 나와의 관계).
export const MAP_INFO = [];
// 45단계: 나라 사이 선. (game) => [{ a, b, tone: 'good'|'tense'|'war', word }] (a·b는 나라 id). 나라 이름 자리끼리 잇는다.
export const MAP_LINKS = [];
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
// 51단계: 큰 숲 밖 들판에 흩어진 작은 숲. 바탕 물감과 나무 기호가 같은 곳을 쓴다.
let copseM = null;
function copseAt(wx, wy) {
  const v = fbm(wx / 34, wy / 34, 3, 481);
  if (v < 0.63) return 0;
  const M = copseM; if (!M) return 0;
  const bad = Math.max(sample(M.mountain, wx, wy) * 2, sample(M.forest, wx, wy), sample(M.dry, wx, wy), sample(M.cold, wx, wy), sample(M.blight, wx, wy), sample(M.swamp, wx, wy), sample(M.scorch, wx, wy), sample(M.ash, wx, wy), sample(M.deadwood, wx, wy), sample(M.tropic ?? M.dry, wx, wy) * 0.5);
  if (bad > 0.3) return 0;
  return Math.min(1, (v - 0.63) * 7) * (1 - bad / 0.3);
}
function renderTerrain(prep, INKK = 2) {
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
  copseM = M;

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
        // 51단계: 바다는 조금 더 푸르고, 먼바다는 깊게, 바닷가는 옅은 여울빛
        col[0] = 166; col[1] = 186; col[2] = 182;
        mix(col, [124, 150, 160], Math.min(1, df / 0.5) * 0.62);
        mix(col, [204, 212, 192], Math.max(0, 1 - df / 0.08) * 0.72);
      } else {
        col[0] = 238; col[1] = 224; col[2] = 188;
        const mx = mxA[i], my = myA[i];
        // 51단계: 들판은 군데군데 풀빛이 돌고, 숲과 작은 숲(copse)은 더 짙은 초록
        const meadow = fbm(wx / 90, wy / 90, 3, 471); if (meadow > 0.5) mix(col, [218, 220, 170], Math.min(1, (meadow - 0.5) * 3) * 0.42);
        const cp = copseAt(wx, wy); if (cp > 0) mix(col, [196, 206, 152], cp * 0.55);
        const fo = sample(M.forest, mx, my); if (fo > 0.02) mix(col, [186, 200, 146], Math.min(1, fo) * 0.72);
        const bl = sample(M.blight, mx, my); if (bl > 0.02) mix(col, [224, 198, 178], bl * 0.66);
        const ash = sample(M.ash, mx, my); if (ash > 0.02) mix(col, [208, 202, 194], ash * 0.7);
        const cold = sample(M.cold, mx, my); if (cold > 0.02) mix(col, [234, 232, 222], cold * 0.62);
        const sw = sample(M.swamp, mx, my); if (sw > 0.02) mix(col, [196, 206, 176], sw * 0.65);
        const dry = sample(M.dry, mx, my); if (dry > 0.02) mix(col, [238, 216, 168], dry * 0.5);
        const sc = sample(M.scorch, mx, my); if (sc > 0.02) mix(col, [176, 160, 144], sc * 0.6);
        const mt = sample(M.mountain, mx, my); if (mt > 0.05) mix(col, [210, 192, 162], Math.min(1, mt) * 0.42);
        const e = elev[i];
        const xl = px > 0 ? elev[i - 1] : e, xr = px < CW - 1 ? elev[i + 1] : e, yu = py > 0 ? elev[i - CW] : e, yd = py < CH - 1 ? elev[i + CW] : e;
        let sh = 1 + (-(xr - xl) - (yd - yu)) * 4.6; sh = Math.max(0.88, Math.min(1.07, sh));
        col[0] *= sh; col[1] *= sh; col[2] *= sh;
        const n = nat[i];
        // 나라 빛깔: 옛 손채색 지도처럼 국경 띠는 진하게, 안쪽은 옅게. 물감은 종이빛과 섞어 물빛으로 읽히지 않게 한다.
        if (n >= 0) { const nc = nations[n].c, tc = [nc[0] * 0.6 + 96, nc[1] * 0.6 + 90, nc[2] * 0.6 + 72]; mix(col, tc, other(i, n, px, py, 3) ? 0.36 : other(i, n, px, py, 7) ? 0.24 : other(i, n, px, py, 12) ? 0.14 : 0.07); }
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
  wash.width = wash.height = 0;
  ctx.scale(INKK, INKK);
  inkSetup(ctx);

  // 나침반에서 뻗는 방위선 (옛 해도의 바람 장미선)
  ctx.save(); ctx.globalAlpha = 0.085; ctx.lineWidth = 0.4; ctx.beginPath();
  for (let a = 0; a < 16; a++) { const an = a * Math.PI / 8; ctx.moveTo(64, 100); ctx.lineTo(64 + Math.sin(an) * 2400, 100 - Math.cos(an) * 2400); }
  ctx.stroke(); ctx.restore();

  // 38단계: 동판에 판 바다 결. 가로로 가는 선을 긋되, 바닷가 가까이는 촘촘하고 진하게, 먼바다로 갈수록 성기고 흐리게.
  // 선은 판화칼이 끊기듯 군데군데 끊긴다. 띠마다 한 번에 긋는다(줄 수천 개를 한 path에).
  seaHatch(ctx, fieldA, CW, CH);
  // 바닷가 안쪽 땅에 점찍기 (모래톱·갯가)
  shoreStipple(ctx, fieldA, CW, CH);
  // 땅의 기복: 해 반대쪽(남동) 비탈에 짧은 빗금 (산 기호 사이 땅이 판화처럼 결을 가진다)
  reliefHatch(ctx, fieldA, elev, CW, CH);

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

  // 38단계: 테두리 안쪽 눈금 숫자와 모서리 장식, 접힌 자국
  frameMarks(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  folds(ctx, cv.width, cv.height);
  ctx.setTransform(INKK, 0, 0, INKK, 0, 0);

  // 종이 결과 얼룩
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.05;
  for (let k = 0; k < 26000; k++) { ctx.fillStyle = rnd() > 0.5 ? "#000" : "#fff"; ctx.fillRect(rnd() * cv.width, rnd() * cv.height, 1.6, 1.6); }
  ctx.globalAlpha = 0.07; ctx.strokeStyle = "#5a4028"; ctx.lineWidth = 0.7;
  for (let k = 0; k < 900; k++) { const x = rnd() * cv.width, y = rnd() * cv.height, a = rnd() * 6.28, l = 6 + rnd() * 18; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rnd() - 0.5) * 6, y + Math.sin(a) * l * 0.5 + (rnd() - 0.5) * 6, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
  for (let k = 0; k < 26; k++) { const x = rnd() * cv.width, y = rnd() * cv.height, r = 8 + rnd() * 26; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(110,72,34,0.9)"); g.addColorStop(1, "rgba(110,72,34,0)"); ctx.globalAlpha = 0.05 + rnd() * 0.07; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  ctx.globalAlpha = 1;
  return canvasUrl(cv, "image/jpeg", 0.86);
}

/* ---------- 38단계: 판화 겹 ---------- */
function seaHatch(ctx, fieldA, CW, CH) {
  const bands = [[0.07, 0.46, 1], [0.16, 0.3, 1], [0.3, 0.2, 2], [9, 0.13, 3]];
  const paths = bands.map(() => []);
  const STEP = 2.5;
  for (let y = 12, row = 0; y < CH - 12; y += STEP, row++) {
    const ry = Math.round(y), base = ry * CW;
    let cur = -1, x0 = 0;
    const close = (x) => { if (cur >= 0 && x - x0 > 1.6) paths[cur].push(x0, y, x); cur = -1; };
    for (let x = 12; x < CW - 12; x++) {
      const f = fieldA[base + x];
      let b = -1;
      if (f < -0.012) {
        const dep = -f;
        b = dep < bands[0][0] ? 0 : dep < bands[1][0] ? 1 : dep < bands[2][0] ? 2 : 3;
        if (row % bands[b][2]) b = -1;
        // 판화칼이 끊기는 자리
        else if (vnoise(x / 7.5, y / 2.2, 521 + b) < (b === 0 ? 0.16 : 0.26)) b = -1;
      }
      if (b !== cur) { close(x); if (b >= 0) { cur = b; x0 = x; } }
    }
    close(CW - 12);
  }
  ctx.save(); ctx.strokeStyle = "#2c3c3e"; ctx.lineCap = "butt";
  bands.forEach(([, al], k) => {
    const L = paths[k]; if (!L.length) return;
    ctx.globalAlpha = al; ctx.lineWidth = k === 0 ? 0.34 : 0.3; ctx.beginPath();
    for (let i = 0; i < L.length; i += 3) { ctx.moveTo(L[i], L[i + 1]); ctx.lineTo(L[i + 2], L[i + 1]); }
    ctx.stroke();
  });
  ctx.restore();
}
function shoreStipple(ctx, fieldA, CW, CH) {
  ctx.save(); ctx.fillStyle = "#4a3a28"; ctx.globalAlpha = 0.55;
  for (let y = 10; y < CH - 10; y += 1.4) for (let x = 10; x < CW - 10; x += 1.4) {
    const f = fieldA[Math.round(y) * CW + Math.round(x)];
    if (f <= 0.004 || f > 0.05) continue;
    const p = (1 - f / 0.05) * 0.42;
    if (hash(Math.round(x * 5), Math.round(y * 5), 541) < p * 1.3) ctx.fillRect(x + (hash(Math.round(x * 3), Math.round(y * 7), 543) - 0.5), y, 0.5, 0.5);
  }
  ctx.restore();
}
function reliefHatch(ctx, fieldA, elev, CW, CH) {
  ctx.save(); ctx.strokeStyle = "#3a2a1a"; ctx.lineCap = "round";
  const lines = [[], [], []];
  for (let y = 12; y < CH - 12; y += 2.2) for (let x = 12; x < CW - 12; x += 2.2) {
    const px = Math.round(x + (hash(Math.round(x * 3), Math.round(y * 3), 551) - 0.5) * 1.4), py = Math.round(y + (hash(Math.round(x * 3), Math.round(y * 3), 552) - 0.5) * 1.4);
    const i = py * CW + px;
    if (fieldA[i] < 0.03) continue;
    const gx = (elev[i + 2] - elev[i - 2]) / 4, gy = (elev[i + 2 * CW] - elev[i - 2 * CW]) / 4;
    const g = Math.hypot(gx, gy);
    if (g < 0.006) continue;
    // 빛은 북서에서: 아래로 내려가는 쪽이 남동이면 그늘
    const shade = (gx * -0.7 + gy * -0.7) / g;
    if (shade < 0.15) continue;
    const k = Math.min(2, Math.floor((g - 0.006) / 0.008 + shade));
    if (hash(px, py, 553) > 0.35 + k * 0.2) continue;
    const len = 1.1 + Math.min(1.8, g * 90);
    // 비탈을 따라 내려가는 방향으로 긋는다
    const ux = -gx / g, uy = -gy / g;
    lines[k].push(px, py, px + ux * len, py + uy * len);
  }
  [[0.22, 0.26], [0.34, 0.3], [0.48, 0.34]].forEach(([al, lw], k) => {
    const L = lines[k]; if (!L.length) return;
    ctx.globalAlpha = al; ctx.lineWidth = lw; ctx.beginPath();
    for (let i = 0; i < L.length; i += 4) { ctx.moveTo(L[i], L[i + 1]); ctx.lineTo(L[i + 2], L[i + 3]); }
    ctx.stroke();
  });
  ctx.restore();
}
// 테두리 눈금에 경도·위도 숫자, 네 모서리에 마름모 장식
function frameMarks(ctx) {
  ctx.save(); ctx.fillStyle = "#3a2618"; ctx.strokeStyle = "#3a2618";
  ctx.font = "italic 6.4px 'Gowun Batang', serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.globalAlpha = 0.85;
  for (let x = 100, k = 1; x < WW - 40; x += 100, k++) { ctx.fillText(String(k * 10), x, 14.5); ctx.fillText(String(k * 10), x, WH - 14.5); }
  for (let y = 100, k = 1; y < WH - 40; y += 100, k++) { ctx.fillText(String(k * 10), 15, y); ctx.fillText(String(k * 10), WW - 15, y); }
  ctx.globalAlpha = 1;
  const corner = (cx, cy) => {
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = "#efe3c4"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.rect(-9, -9, 18, 18); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.45; ctx.beginPath(); ctx.rect(-6.5, -6.5, 13, 13); ctx.stroke();
    ctx.fillStyle = "#3a2618"; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(5, 0); ctx.lineTo(0, 5); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#efe3c4"; ctx.beginPath(); ctx.arc(0, 0, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  corner(10.5, 10.5); corner(WW - 10.5, 10.5); corner(10.5, WH - 10.5); corner(WW - 10.5, WH - 10.5);
  ctx.restore();
}
// 오래 접어 두었던 지도: 세로 둘, 가로 하나 접힌 자국 (밝은 등성이와 어두운 골)
function folds(ctx, W, H) {
  ctx.save();
  const line = (x0, y0, x1, y1, vertical) => {
    const gw = vertical ? W * 0.012 : H * 0.012;
    const g = vertical ? ctx.createLinearGradient(x0 - gw, 0, x0 + gw, 0) : ctx.createLinearGradient(0, y0 - gw, 0, y0 + gw);
    g.addColorStop(0, "rgba(90,60,30,0)"); g.addColorStop(0.45, "rgba(90,60,30,0.10)"); g.addColorStop(0.5, "rgba(255,248,230,0.22)"); g.addColorStop(0.56, "rgba(90,60,30,0.08)"); g.addColorStop(1, "rgba(90,60,30,0)");
    ctx.fillStyle = g;
    if (vertical) ctx.fillRect(x0 - gw, 0, gw * 2, H); else ctx.fillRect(0, y0 - gw, W, gw * 2);
  };
  line(W / 3, 0, W / 3, H, true); line(W * 2 / 3, 0, W * 2 / 3, H, true); line(0, H / 2, W, H / 2, false);
  ctx.restore();
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
    // 51단계: 들판의 작은 숲
    if (fo < 0.34 && f > 0.06) { const cp = copseAt(x, y); if (cp > 0.15 && r < cp * 0.85 && !blocked(x, y, 2.6, 5)) items.push([fbm(x / 60, y / 60, 2, 433) > 0.62 ? "f" : "t", x, y, 1.6 + hash(Math.round(x * 3), Math.round(y * 3), 437) * 1.3, r, palAt(i)]); return; }
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
        <button class="ghost sm" data-z="here" aria-label="지금 있는 곳으로">여기</button>
        <button class="ghost sm" data-z="all">전체</button>
        <button class="ghost sm" data-z="town" aria-label="지금 있는 고장의 지도">고장</button>
        <button class="ghost sm" data-z="legend" aria-label="지도 기호 풀이">범례</button>
        <button class="ghost sm" data-z="full" aria-label="지도를 화면 가득 보기">크게</button>
      </span>
    </div>
    <div class="mapbox"><svg viewBox="0 0 ${WW} ${WH}" role="img" aria-label="용사력 500년 대륙 지도"></svg><div class="map-loading">양피지에 지도를 옮겨 그리는 중…</div><button class="map-close" data-z="unfull">닫기</button><div class="map-sheet" hidden></div><span class="map-zoom2"><button data-z="in2" aria-label="확대">+</button><button data-z="out2" aria-label="축소">−</button><button data-z="here2" aria-label="지금 있는 곳으로">◎</button></span></div>
    <aside class="map-info" aria-live="polite"></aside>`;
  injectStyle();
  const svg = container.querySelector("svg");
  const info = container.querySelector(".map-info");
  const go = () => {
    if (ac.signal.aborted) return;
    seed = 500;
    // 큰 그림을 못 그리는 기기(메모리 부족)에서는 절반 크기로 다시 그린다
    if (!terrainUrl) { try { terrainUrl = renderTerrain(prepare); } catch { terrainUrl = null; } if (!terrainUrl) { seed = 500; try { terrainUrl = renderTerrain(prepare, 1) || null; } catch { terrainUrl = null; } } }
    else prepare();
    container.querySelector(".map-loading")?.remove();
    build(svg, info, here, opt, ac.signal);
  };
  // 첫 그림은 몇 초 걸리니 '그리는 중' 글자가 먼저 보이게 한 박자 쉰다
  if (terrainUrl) go(); else setTimeout(go, 40);
  return () => ac.abort();
}

// 38단계: 지도 안의 새 칸(범례·고장 지도 겹창) 모양. style.css는 화면 갈래 것이라 여기서 한 번만 얹는다.
let styled = false;
function injectStyle() {
  if (styled || typeof document === "undefined") return; styled = true;
  const st = document.createElement("style"); st.dataset.map38 = "";
  st.textContent = `
.map-tools .zoom { flex-wrap: nowrap; overflow-x: auto; max-width: 100%; gap: 5px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.map-tools .zoom::-webkit-scrollbar { display: none; }
.map-tools .zoom button { white-space: nowrap; flex: none; }
@media (max-width: 420px) { .map-tools .zoom button.sm { padding: 6px 10px; min-width: 38px; } }
@media (max-width: 360px) { .map-tools .zoom { gap: 4px; } .map-tools .zoom button.sm { padding: 6px 7px; min-width: 32px; } }
.mapbox .plbl { cursor: pointer; }
.mapbox .rlbl.dim { opacity: .28; }
.mapbox .rlbl { transition: opacity .2s; }
.mapbox .plbl.on text { fill: #9a2a17; }
@media (max-width: 520px) { .mapbox { aspect-ratio: 0.92; } }
.mapbox.full { position: fixed; inset: 0; z-index: 9000; aspect-ratio: auto; border-radius: 0; border: 0; margin: 0; }
.mapbox .map-close { display: none; }
.mapbox.full .map-close { display: block; position: absolute; top: calc(10px + env(safe-area-inset-top, 0px)); right: 10px; z-index: 4; padding: 7px 14px; border-radius: 18px; border: 1px solid #5a3a20; background: rgba(240,230,203,.94); color: #2b1d12; font: 700 15px var(--f-body, serif); box-shadow: 0 2px 8px rgba(0,0,0,.35); }
.mapbox .map-zoom2 { display: none; }
.mapbox.full .map-zoom2 { display: flex; flex-direction: column; gap: 8px; position: absolute; right: 10px; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); z-index: 4; }
.mapbox.full .map-zoom2 button { width: 42px; height: 42px; border-radius: 21px; border: 1px solid #5a3a20; background: rgba(240,230,203,.94); color: #2b1d12; font: 700 20px serif; box-shadow: 0 2px 8px rgba(0,0,0,.35); }
body.map-full { overflow: hidden; }
.mapbox .map-sheet { display: none; }
.mapbox.full .map-sheet:not([hidden]) { display: block; position: absolute; left: 10px; right: 64px; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); z-index: 4; padding: 8px 12px; border-radius: 8px; border: 1px solid #5a3a20; background: rgba(240,230,203,.95); color: #2b1d12; font-size: 14px; line-height: 1.4; box-shadow: 0 2px 8px rgba(0,0,0,.35); }
.mapbox .map-sheet b { font-size: 16px; }
.mapbox .map-sheet i { font-style: normal; color: #9a2a17; font-size: 12px; margin-left: 4px; }
.mapbox .map-sheet span { display: block; font-size: 12.5px; color: #5a4630; }
.map-legend { display: grid; gap: 3px; }
.map-legend .lg-row { display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 1.3; }
.map-legend .lg-row svg { flex: none; }
.map-info .map-rumor, .map-info .map-danger { font-size: 13px; line-height: 1.55; margin: 2px 0 0; }
.mapbox .town-over { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; background: #2a2018; }
.mapbox .town-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: space-between; padding: 6px 8px; background: #efe3c4; color: #2b1d12; border-bottom: 1px solid #8a6a40; font-size: 14px; }
.mapbox .town-scroll { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x pan-y; }
.mapbox .town-scroll svg { display: block; width: 100%; height: auto; min-height: 100%; }
.mapbox .town-scroll.big svg { width: 220%; }
@media (max-width: 520px) { .mapbox .town-scroll svg { width: 150%; } .mapbox .town-scroll.big svg { width: 300%; } }
`;
  document.head.appendChild(st);
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
  if (terrainUrl) el("image", { href: terrainUrl, x: 0, y: 0, width: WW, height: WH, preserveAspectRatio: "none" }, svg);
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

  // 45단계: 나라 사이 선 (동맹은 초록 실선, 날 선 사이는 갈색 점선, 전쟁은 붉은 굵은 선)
  if (opt.game && MAP_LINKS.length) {
    const at = {}; regions.forEach((r) => { const id = nationOf(r.name); if (id && !at[id]) at[id] = [Math.min(r.x, WW - 30), Math.min(r.y, WH - 17) - 6]; });
    nations.forEach((N) => { if (!at[N.id] && N.seeds?.length) at[N.id] = [N.seeds.reduce((a, q) => a + q[0], 0) / N.seeds.length, N.seeds.reduce((a, q) => a + q[1], 0) / N.seeds.length]; });
    const RANK = { war: 0, tense: 1, good: 2 };
    const links = MAP_LINKS.flatMap((fn) => { try { return fn(opt.game) || []; } catch (e) { console.error(e); return []; } }).sort((x, y) => (RANK[x.tone] ?? 1) - (RANK[y.tone] ?? 1));
    const linkG = el("g", { class: "ac-links" }, svg);
    const STY = { good: ["#3f6e3a", 2, ""], tense: ["#8a5a1e", 1.8, "5 4"], war: ["#9a2618", 3, "9 3"] };
    const seen = new Set();
    for (const l of links) {
      const A = at[l.a], B = at[l.b], key = [l.a, l.b].sort().join("|");
      if (!A || !B || seen.has(key)) continue; seen.add(key);
      const [col, w, dash] = STY[l.tone] ?? STY.tense;
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(60, len * 0.14), cx = mx - dy / len * bend, cy = my + dx / len * bend;
      const d = `M${A[0]} ${A[1]}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${B[0]} ${B[1]}`;
      el("path", { d, fill: "none", stroke: PAPER, "stroke-width": w + 2.4, "stroke-linecap": "round", opacity: 0.55 }, linkG);
      const ln = el("path", { d, fill: "none", stroke: col, "stroke-width": w, "stroke-dasharray": dash, "stroke-linecap": "round", opacity: l.tone === "good" ? 0.62 : 0.9 }, linkG);
      if (l.word) el("title", {}, ln).textContent = l.word;
    }
  }

  // 설명 칸
  let current = null;
  const show = (d, g, place) => {
    if (current) { current.classList.remove("on"); current._lbl?.classList.remove("on"); }
    current = g || null; if (current) { current.classList.add("on"); current._lbl?.classList.add("on"); }
    const isHere = place && place.id === here;
    const acts = place && opt.game ? MAP_ACTIONS.flatMap((fn) => { try { return fn(opt.game, place) || []; } catch (e) { console.error(e); return []; } }) : [];
    const extra = place && opt.game ? MAP_INFO.map((fn) => { try { return fn(opt.game, place) || ''; } catch (e) { console.error(e); return ''; } }).join('') : '';
    info.innerHTML = `<p class="kind">${d.kind ?? ""}${isHere ? ' · <b class="here">지금 있는 곳</b>' : ""}</p>
      <h3>${d.name}</h3><p class="note">${d.realm ?? ""}</p><p class="desc">${d.desc ?? ""}</p>
      ${d.todo ? `<p class="todo"><span>할 수 있는 일</span>${d.todo}</p>` : ""}
      ${place ? trail.info(place) : ''}
      ${place ? marks.info(place) : ''}
      ${extra}
      ${acts.length || (place && place.id && !place.region) ? `<div class="actions-row">${acts.map((a, i) => `<button class="ghost" data-map-act="${i}">${a.label}</button>`).join("")}${place && place.id && !place.region ? `<button class="ghost" data-town-of="${place.id}">고장 지도</button>` : ""}</div>` : ""}`;
    // 화면 가득 볼 때는 아래 설명 칸이 가려지니, 지도 안 아래쪽에 짧은 쪽지를 띄운다
    const sheet = svg.closest(".mapbox")?.querySelector(".map-sheet");
    if (sheet) { sheet.innerHTML = place || d.desc ? `<b>${d.name}</b>${isHere ? ' <i>지금 있는 곳</i>' : ''}<span>${d.kind ?? ''}${d.realm ? ' · ' + d.realm : ''}</span>` : ''; sheet.hidden = !sheet.innerHTML; }
    info.querySelector("[data-town-of]")?.addEventListener("click", () => openTown(place));
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

  // 내 발자취 (장소 기호 아래에 깔린다)
  const trailG = el("g", { class: "trail" }, svg);
  const trail = opt.game ? drawTrail(el, trailG, opt.game, byId, pin) : { count: 0, info: () => '' };
  if (trail.count > 1) { const n = svg.closest(".mapbox")?.parentElement?.querySelector(".map-tools .note"); if (n) n.textContent = `붉은 고리는 가 본 곳(${trail.count}곳), 붉은 점선은 내가 다닌 길이다. 끌어서 움직이고, 두 손가락이나 휠로 확대한다.`; }
  if (opt.game) { try { drawBeyond(el, trailG, opt.game, byId, pin); } catch { /* 탐험 기록이 없어도 지도는 그린다 */ } }
  // 장소
  const placeG = el("g", {}, svg);
  const labelG = document.createElementNS("http://www.w3.org/2000/svg", "g"); labelG.setAttribute("class", "labels");
  let hereP = null;
  const labels = [];
  places.forEach((p) => {
    const g = el("g", { class: "place" + (p.tier === 3 && p.id !== here ? " t3" : ""), tabindex: 0, role: "button", "aria-label": p.n }, placeG);
    pin(g, p.x, p.y, "--ls");
    el("circle", { class: "hit", cx: 0, cy: 0, r: 14, fill: "transparent" }, g);
    const small = p.tier === 3;
    marker(p, g);
    // 51단계: 이름은 맨 위 겹(labelG)에 따로 둔다. 소문 표·발자취·내 깃발이 글자를 덮지 않게.
    // 지금 있는 곳 이름은 깃발과 고리를 피해 조금 더 아래에 둔다.
    const isHere = p.id === here;
    const lx = p.lx || 0, ly = isHere ? Math.max(p.ly ?? 0, 27) : p.ly != null ? p.ly : (small ? 15 : 19);
    const lg = el("g", { class: "plbl" + (p.tier === 3 && !isHere ? " t3" : "") + (isHere ? " here" : "") }, labelG);
    pin(lg, p.x, p.y, "--ls");
    el("text", { x: lx, y: ly, "text-anchor": "middle", "font-family": SERIF, "font-weight": 700, "font-size": small ? 10.5 : p.t === "capital" ? 15 : 12.5,
      fill: isHere ? "#7a1e10" : "#1e140c", stroke: "#f6edd4", "stroke-width": small ? 3 : 3.8, "stroke-linejoin": "round", "paint-order": "stroke", "stroke-opacity": 0.92 }, lg).textContent = p.n;
    labels.push([lg.lastChild, isHere || p.t === "capital" ? 0 : p.t === "city" ? 1 : 2, g.querySelector(".hit")]);
    g._lbl = lg;
    bind(lg, () => show(p._data, g, p));
    const data = { kind: KIND[p.t] ?? "장소", name: p.n, realm: p.realm, desc: p.d, todo: p.todo };
    if (p.nation === undefined) p.nation = nationOf(p.realm);
    p._g = g; p._data = data;
    if (p.id === here) hereP = p;
    bind(g, () => show(data, g, p));
  });
  // 38단계: 소문 난 곳·험한 곳 표 (장소 기호 위)
  const markG = el("g", { class: "marks" }, svg);
  const marks = opt.game ? drawMarks(el, markG, opt.game, byId, pin) : { count: 0, info: () => "" };
  // 지금 있는 곳 표시: 붉은 고리와 깃발
  if (hereP) {
    const hg = el("g", { class: "here-mark", "pointer-events": "none" }, svg);
    pin(hg, hereP.x, hereP.y, "--ls");
    el("circle", { cx: 0, cy: 0, r: 10.5, fill: "none", stroke: "#9a2a17", "stroke-width": 1.8 }, hg);
    el("circle", { cx: 0, cy: 0, r: 15, fill: "none", stroke: "#9a2a17", "stroke-width": 0.8, "stroke-dasharray": "2.4 2.4" }, hg);
    // 길 위에 있으면 깃발은 길손 표가 대신한다 (떠나온 곳엔 고리만)
    if (!opt.game?.life?.travel) {
      el("path", { d: "M0 -10.5V-33", stroke: "#3a1a10", "stroke-width": 1.3, "stroke-linecap": "round" }, hg);
      el("path", { d: "M0.6 -33Q7 -34.5 14 -30.5Q7 -28.5 0.6 -24.5Z", fill: "#9a2a17", stroke: "#3a1a10", "stroke-width": 0.9, "stroke-linejoin": "round" }, hg);
    }
  }
  svg.appendChild(labelG);
  if (hereP) show(hereP._data, hereP._g, hereP);
  else show(central, null);

  // 확대·이동. 지도 칸의 모양(가로세로 비)에 맞춰 보이는 범위를 잡아, 좁은 화면에서도 칸이 꽉 찬다.
  const vb = { x: 0, y: 0, w: WW, h: WH };
  let moved = false, lastFar = 0, lastW = 0, dcRaf = 0, fontsIn = 0;
  // 글꼴이 늦게 들어오면 글자 폭이 바뀌니 한 번 더 잰다
  document.fonts?.ready?.then(() => { if (!signal?.aborted) { fontsIn = 1; apply(); } });
  // 44단계: 고장이 늘어 이름이 겹치면 덜 중요한 이름을 감춘다 (지금 있는 곳·수도 > 도시 > 작은 곳, 같으면 먼저 놓인 것).
  // 겹침은 확대 정도에만 달렸으니(옮겨도 같다) 확대가 바뀔 때만 다시 잰다.
  const order = labels.map((x, i) => [x[0], x[1], i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]);
  const declutter = () => {
    dcRaf = 0; if (signal?.aborted) return;
    const kept = [];
    const over = (b, k, px = 4) => b.left < k.right + px && b.right > k.left - px && b.top < k.bottom + 1 && b.bottom > k.top - 1;
    // 다른 고장의 기호(가운데 60%)와 큰 땅 이름도 비켜 간다
    const icons = [];
    for (const [t, , h] of labels) {
      const r = h?.getBoundingClientRect();
      if (!r || !r.width) continue;
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, w = r.width * 0.22;
      icons.push([t, { left: cx - w, right: cx + w, top: cy - w, bottom: cy + w }]);
    }
    const rgs = [...svg.querySelectorAll(".rlbl")];
    const regionsR = rgs.map((g) => g.getBoundingClientRect()).filter((r) => r.width);
    // 51단계: 지금 있는 곳·수도 이름과 겹치는 나라 이름은 옅게 물러난다
    const top = labels.filter(([t, imp]) => imp === 0 && t.style.display !== "none").map(([t]) => t.getBoundingClientRect()).filter((r) => r.width);
    for (const g of rgs) { const r = g.getBoundingClientRect(); g.classList.toggle("dim", !!r.width && top.some((k) => over(r, k, 2))); }
    for (const [t, imp] of order) {
      if (t.style.display === "none") continue;
      t.style.visibility = "";
      const b = t.getBoundingClientRect();
      if (!b.width) continue;
      const hit = imp > 0 && (kept.some((k) => over(b, k)) || (imp >= 2 && (icons.some(([o, k]) => o !== t && over(b, k, 0)) || regionsR.some((k) => over(b, k, 0)))));
      if (hit) t.style.visibility = "hidden"; else kept.push(b);
    }
  };
  const apply = () => {
    const r = svg.getBoundingClientRect();
    const asp = r.width > 0 && r.height > 0 ? r.height / r.width : WH / WW;
    // 51단계: 폰의 지도 칸이 세로로 길어져도 '전체'에선 대륙이 다 보이게, 칸이 땅보다 길면 위아래를 바다색 여백으로 둔다
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
    const key = `${vb.w.toFixed(1)}|${Math.round(r.width)}|${fontsIn}`;
    if (key !== lastW) { lastW = key; if (!dcRaf) dcRaf = requestAnimationFrame(declutter); }
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
  // 51단계: 폰에서 지도를 화면 가득 펼쳐 본다. 닫으면 제자리로.
  const mbox = svg.closest(".mapbox");
  const setFull = (on) => { mbox.classList.toggle("full", on); document.body.classList.toggle("map-full", on); requestAnimationFrame(() => apply()); };
  box.querySelector('[data-z="full"]')?.addEventListener("click", () => setFull(true), o);
  mbox.querySelector('[data-z="unfull"]')?.addEventListener("click", () => setFull(false), o);
  mbox.querySelector('[data-z="in2"]')?.addEventListener("click", () => zoomAt(1.5, vb.x + vb.w / 2, vb.y + vb.h / 2), o);
  mbox.querySelector('[data-z="out2"]')?.addEventListener("click", () => zoomAt(1 / 1.5, vb.x + vb.w / 2, vb.y + vb.h / 2), o);
  mbox.querySelector('[data-z="here2"]')?.addEventListener("click", () => { if (hereP) focusOn(hereP); }, o);
  signal.addEventListener("abort", () => document.body.classList.remove("map-full"));
  // 38단계: 범례와 고장 지도
  box.querySelector('[data-z="legend"]').addEventListener("click", () => { if (current) { current.classList.remove("on"); current._lbl?.classList.remove("on"); } current = null; info.innerHTML = legendHtml(); }, o);
  const townBtn = box.querySelector('[data-z="town"]');
  if (!hereP) townBtn.hidden = true;
  townBtn.addEventListener("click", () => { if (hereP) openTown(hereP); }, o);
  function openTown(p) {
    const mb = svg.closest(".mapbox");
    mb.querySelector(".town-over")?.remove();
    const nbIds = new Set();
    for (const r of roads.concat(oldRoads)) for (let i = 0; i < r.length; i++) if (r[i] === p.id) { if (r[i - 1]) nbIds.add(r[i - 1]); if (r[i + 1]) nbIds.add(r[i + 1]); }
    const neighbors = [...nbIds].map((id) => byId[id]).filter(Boolean);
    let html = "";
    try { html = townMapSvg(p, opt.game, { neighbors, kind: [KIND[p.t], p.realm].filter(Boolean).join(" · ") }); } catch (e) { console.error(e); return; }
    const ov = document.createElement("div");
    ov.className = "town-over";
    ov.innerHTML = `<div class="town-bar"><b>${p.n} 고장 지도</b><span><button class="ghost sm" data-town="zoom">크게</button> <button class="ghost sm" data-town="close" aria-label="닫기">대륙 지도로</button></span></div><div class="town-scroll">${html}</div>`;
    mb.appendChild(ov);
    const sc = ov.querySelector(".town-scroll"), zb = ov.querySelector('[data-town="zoom"]');
    zb.addEventListener("click", () => { const big = sc.classList.toggle("big"); zb.textContent = big ? "작게" : "크게"; if (big) { sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2; sc.scrollTop = (sc.scrollHeight - sc.clientHeight) / 2; } });
    ov.querySelector('[data-town="close"]').addEventListener("click", () => ov.remove());
  }
  // 처음엔 지금 있는 곳 둘레를 보여 준다
  if (hereP) focusOn(hereP, Math.max(380, Math.min(640, svg.getBoundingClientRect().width * 1.15 || 640))); else apply();
}
