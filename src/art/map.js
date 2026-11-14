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

export const MAP_PLACES_EXTRA = [];
export const MAP_ACTIONS = [];

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

  const CW = 2000, CH = 1250, SC = WW / CW;
  const cv = document.createElement("canvas"); cv.width = CW; cv.height = CH;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(CW, CH);
  const D = img.data;
  const elev = new Float32Array(CW * CH);
  const fieldA = new Float32Array(CW * CH);
  const mxA = new Float32Array(CW * CH), myA = new Float32Array(CW * CH);
  const nat = new Int8Array(CW * CH);

  for (let py = 0; py < CH; py++) {
    for (let px = 0; px < CW; px++) {
      const wx = px * SC, wy = py * SC, i = py * CW + px;
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
  const edge = (wx, wy) => { const d = Math.min(wx, wy, WW - wx, WH - wy); return d < 60 ? 1 - d / 60 : 0; };
  function parchPixel(i, o, f, wx, wy, px, py) {
    const stain = fbm(wx / 160, wy / 160, 4, 301);
    const grain = vnoise(wx / 2.2, wy / 2.2, 311);
    if (f <= 0) {
      col[0] = 172; col[1] = 180; col[2] = 168;
      const df = -f;
      mix(col, [196, 194, 170], Math.max(0, 1 - df / 0.05) * 0.6);
      for (const k of [0.016, 0.034, 0.056, 0.084, 0.12]) { const a = 1 - Math.abs(df - k) / 0.0034; if (a > 0) mix(col, [70, 66, 52], a * (0.75 - k * 3.6)); }
      const wv = vnoise(wx / 5, wy / 16, 321); if (wv > 0.78 && df > 0.16) mix(col, [150, 140, 112], (wv - 0.78) * 1.4);
    } else {
      col[0] = 236; col[1] = 224; col[2] = 192;
      const mx = mxA[i], my = myA[i];
      const fo = sample(M.forest, mx, my); if (fo > 0.02) mix(col, [214, 214, 172], fo * 0.6);
      const bl = sample(M.blight, mx, my); if (bl > 0.02) mix(col, [226, 196, 176], bl * 0.7);
      const ash = sample(M.ash, mx, my); if (ash > 0.02) mix(col, [210, 204, 196], ash * 0.7);
      const cold = sample(M.cold, mx, my); if (cold > 0.02) mix(col, [232, 230, 220], cold * 0.6);
      const sw = sample(M.swamp, mx, my); if (sw > 0.02) mix(col, [204, 210, 182], sw * 0.6);
      const e = elev[i];
      const xl = px > 0 ? elev[i - 1] : e, xr = px < CW - 1 ? elev[i + 1] : e, yu = py > 0 ? elev[i - CW] : e, yd = py < CH - 1 ? elev[i + CW] : e;
      let sh = 1 + (-(xr - xl) - (yd - yu)) * 60 * 0.1; sh = Math.max(0.94, Math.min(1.04, sh));
      col[0] *= sh; col[1] *= sh; col[2] *= sh;
      const n = nat[i];
      if (n >= 0) {
        mix(col, nations[n].c, 0.07);
        const nr = px < CW - 3 ? nat[i + 3] : n, nd = py < CH - 3 ? nat[i + 3 * CW] : n;
        if (((nr >= 0 && nr !== n) || (nd >= 0 && nd !== n)) && (((px + py) >> 2) % 3 === 0)) mix(col, [86, 56, 40], 0.8);
      }
      if (f < 0.016) mix(col, [44, 32, 22], Math.min(1, (1 - f / 0.016) * 1.4));
      else if (f < 0.03) mix(col, [120, 96, 66], (1 - (f - 0.012) / 0.018) * 0.25);
    }
    const k = 0.9 + stain * 0.16 + (grain - 0.5) * 0.05;
    col[0] *= k; col[1] *= k; col[2] *= k;
    const ed = edge(wx, wy); if (ed > 0) mix(col, [96, 64, 36], ed * ed * 0.8);
    D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
  }
  for (let py = 0; py < CH; py++) {
    for (let px = 0; px < CW; px++) {
      const i = py * CW + px, o = i * 4, f = fieldA[i];
      const wx = px * SC, wy = py * SC;
      parchPixel(i, o, f, wx, wy, px, py);
    }
  }
  ctx.putImageData(img, 0, 0);
  drawGlyphs(ctx, CW, CH, SC, fieldA, elev, mxA, myA, M, excl);
  // paper grain
  ctx.globalAlpha = 0.06;
  for (let k = 0; k < 9000; k++) { ctx.fillStyle = rnd() > 0.5 ? "#000" : "#fff"; ctx.fillRect(rnd() * CW, rnd() * CH, 1.5, 1.5); }
  ctx.globalAlpha = 1;
  return cv.toDataURL("image/jpeg", 0.88);
}

function drawGlyphs(ctx, CW, CH, SC, fieldA, elev, mxA, myA, M, excl) {
  const ink = "#3a2a1c";
  const at = (wx, wy) => { const px = Math.round(wx / SC), py = Math.round(wy / SC); if (px < 0 || py < 0 || px >= CW || py >= CH) return -1; return py * CW + px; };
  const items = [];
  for (let wy = 30; wy < WH - 20; wy += 9) {
    for (let wx = 20; wx < WW - 20; wx += 9) {
      const jx = wx + (hash(wx, wy, 401) - 0.5) * 8, jy = wy + (hash(wx, wy, 402) - 0.5) * 8;
      const i = at(jx, jy); if (i < 0) continue;
      const f = fieldA[i]; if (f < 0.035) continue;
      const mx = mxA[i], my = myA[i], e = elev[i], r = hash(wx, wy, 403);
      const mt = sample(M.mountain, mx, my), hl = sample(M.hill, mx, my), fo = sample(M.forest, mx, my), dw = sample(M.deadwood, mx, my), sw = sample(M.swamp, mx, my), ash = sample(M.ash, mx, my), sc = sample(M.scorch, mx, my);
      if (mt > 0.3) { if ((wx % 18 === 2) && (wy % 18 === 12)) items.push(["m", jx, jy, Math.min(14, 3.5 + mt * 4.5 + Math.max(0, e - 0.3) * 14), r]); }
      else if (hl > 0.3 && e > 0.3 && r < 0.35) items.push(["h", jx, jy, 5]);
      else if (dw > 0.35 && r < 0.6) items.push(["d", jx, jy, 4]);
      else if (fo > 0.4 && r < fo * 0.9) items.push(["t", jx, jy, 3.4 + r * 1.4]);
      else if (sw > 0.4 && r < 0.4) items.push(["s", jx, jy, 4]);
      else if (sc > 0.4 && r < 0.3) items.push(["x", jx, jy, 3]);
      else if (ash > 0.5 && r < 0.12) items.push(["a", jx, jy, 1]);
    }
  }
  const kept = items.filter(it => {
    const pad = it[0] === "m" ? it[3] : 4;
    for (const b of excl) if (it[1] + pad > b[0] && it[1] - pad < b[2] && it[2] + 2 > b[1] && it[2] - pad * 1.3 < b[3]) return false;
    return true;
  });
  items.length = 0; kept.forEach(it => items.push(it));
  items.sort((a, b) => a[2] - b[2]);
  const k = 1 / SC;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  for (const [t, wx, wy, sz, rr] of items) {
    const x = wx * k, y = wy * k, s = sz * k;
    ctx.strokeStyle = ink; ctx.fillStyle = "#efe4c6";
    if (t === "m") {
      const peak = (px0, s0, lean) => {
        const tx = px0 + s0 * lean, ty = y - s0 * (1.05 + (rr || 0) * 0.35);
        ctx.fillStyle = "#efe4c6"; ctx.lineWidth = s0 > 9 * k ? 1.5 : 1.15;
        ctx.beginPath(); ctx.moveTo(px0 - s0, y); ctx.lineTo(px0 - s0 * 0.55, y - s0 * 0.45); ctx.lineTo(tx, ty); ctx.lineTo(px0 + s0 * 0.5, y - s0 * 0.55); ctx.lineTo(px0 + s0, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 0.8; ctx.beginPath();
        const n = s0 > 9 * k ? 5 : 3;
        for (let q = 1; q <= n; q++) { const fx = tx + q * s0 * 0.85 / n, fy = ty + q * (y - ty) * 0.55 / n; ctx.moveTo(fx, fy); ctx.lineTo(fx - s0 * 0.18, y - 1); }
        ctx.stroke();
        if (s0 > 11 * k) { ctx.fillStyle = "#fbf7ec"; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - s0 * 0.28, ty + s0 * 0.32); ctx.lineTo(tx - s0 * 0.08, ty + s0 * 0.24); ctx.lineTo(tx + s0 * 0.12, ty + s0 * 0.36); ctx.lineTo(tx + s0 * 0.26, ty + s0 * 0.28); ctx.closePath(); ctx.fill(); }
      };
      if ((rr || 0) < 0.45 && s > 6 * k) peak(x + s * 0.85, s * 0.62, 0.1);
      peak(x, s, -0.1 + (rr || 0) * 0.2);
    } else if (t === "h") {
      ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, y + s * 0.4, s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (t === "t") {
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + s * 0.9); ctx.stroke();
      ctx.fillStyle = "#c9cfa0"; ctx.beginPath(); ctx.arc(x, y - s * 0.3, s * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (t === "d") {
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x, y - s); ctx.moveTo(x, y - s * 0.2); ctx.lineTo(x - s * 0.6, y - s * 0.8); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.6, y - s * 0.6); ctx.stroke();
    } else if (t === "s") {
      ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.9); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.7, y - s * 0.6); ctx.moveTo(x + s * 0.5, y); ctx.lineTo(x + s * 0.7, y - s * 0.6); ctx.stroke();
    } else if (t === "x") {
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke();
    } else {
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }
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

function build(svg, info, here, opt, signal) {
  const places = allPlaces();
  const byId = {}; places.forEach((p) => byId[p.id] = p);
  el("image", { href: terrainUrl, x: 0, y: 0, width: WW, height: WH, preserveAspectRatio: "none" }, svg);

  // 호수
  const lakeG = el("g", {}, svg);
  [[[676,452],[700,440],[726,448],[732,474],[712,494],[684,490],[670,470]], [[106,320],[130,314],[140,332],[120,344],[102,336]]].forEach((l) => {
    const r = roughen(l.concat([l[0]]), 3, 0.3);
    el("path", { d: smoothPath(r) + "Z", fill: "#a9b7a6", stroke: "#3a2a1c", "stroke-width": 1.2 }, lakeG);
  });
  // 강
  const riverG = el("g", {}, svg);
  rivers.forEach((r) => {
    let pts = roughen(r.pts, 4, 0.32);
    let a = 0; while (a < pts.length - 2 && fieldFn(pts[a][0], pts[a][1]) < 0.04) a++;
    let b = a; while (b < pts.length - 1 && fieldFn(pts[b][0], pts[b][1]) > -0.01) b++;
    pts = pts.slice(a, b + 1);
    if (pts.length < 3) return;
    el("path", { d: smoothPath(pts), fill: "none", stroke: "#2c4e58", "stroke-width": 3.4, "stroke-linecap": "round", opacity: 0.55 }, riverG);
    el("path", { d: smoothPath(pts), fill: "none", stroke: "#5f95a3", "stroke-width": 1.9, "stroke-linecap": "round" }, riverG);
    if (r.n) el("text", { class: "t3", x: r.lx, y: r.ly, "font-family": "Gowun Batang, serif", "font-style": "italic", "font-size": 9.5, fill: "#2c4e58", stroke: "#f1e5c6", "stroke-width": 2, "paint-order": "stroke" }, riverG).textContent = r.n;
  });
  // 길과 뱃길
  const roadG = el("g", {}, svg);
  const roadLine = (ids, old) => {
    for (let i = 0; i < ids.length - 1; i++) {
      const a = byId[ids[i]], b = byId[ids[i + 1]];
      if (!a || !b) continue;
      const pts = roughen([[a.x, a.y], [(a.x + b.x) / 2 + (rnd() - 0.5) * 14, (a.y + b.y) / 2 + (rnd() - 0.5) * 14], [b.x, b.y]], 3, 0.25);
      el("path", { d: smoothPath(pts), fill: "none", stroke: old ? "#5a4636" : "#6b4f33", "stroke-width": old ? 1.3 : 1.9, "stroke-dasharray": old ? "2 5" : "6 3", "stroke-linecap": "round", opacity: old ? 0.75 : 0.9 }, roadG);
    }
  };
  roads.forEach((r) => roadLine(r, false));
  oldRoads.forEach((r) => roadLine(r, true));
  ghostRoutes.forEach((s) => el("path", { d: smoothPath(s), fill: "none", stroke: "#4f6670", "stroke-width": 1.2, "stroke-dasharray": "1 7", "stroke-linecap": "round", opacity: 0.45 }, roadG));
  seaRoutes.forEach((s) => el("path", { d: smoothPath(s), fill: "none", stroke: "#4f6670", "stroke-width": 1.5, "stroke-dasharray": "1 5", "stroke-linecap": "round", opacity: 0.8 }, roadG));

  // 바다·산 이름, 나침반, 축척
  const decoG = el("g", {}, svg);
  edgeLabels.forEach(([t, x, y, s]) => el("text", { x, y, "text-anchor": "middle", "font-family": "Gowun Batang, serif", "font-style": "italic", "font-size": s, "letter-spacing": 3, fill: "#4e5c58", opacity: 0.9 }, decoG).textContent = t);
  seaLabels.forEach(([t, x, y, s]) => el("text", { x, y, "text-anchor": "middle", "font-family": "Gowun Batang, serif", "font-style": "italic", "font-size": s, "letter-spacing": 5, fill: "#4e5c58" }, decoG).textContent = t);
  mtLabels.forEach(([t, x, y]) => el("text", { x, y, "text-anchor": "middle", "font-family": "Gowun Batang, serif", "font-style": "italic", "font-weight": 700, "font-size": 11, "letter-spacing": 3, fill: "#3a2e22", stroke: "#f1e5c6", "stroke-width": 2.2, "paint-order": "stroke", opacity: 0.85 }, decoG).textContent = t);
  const serp = el("g", { transform: "translate(120 975)", opacity: 0.8 }, decoG);
  el("path", { d: "M-30 6 q8 -16 16 0 q8 16 16 0 q8 -16 16 0 q6 10 14 2", fill: "none", stroke: "#4e5c58", "stroke-width": 2.4, "stroke-linecap": "round" }, serp);
  const cp = el("g", { transform: "translate(64 100)" }, decoG);
  el("circle", { cx: 0, cy: 0, r: 36, fill: "none", stroke: "#5a4330", "stroke-width": 1 }, cp);
  el("circle", { cx: 0, cy: 0, r: 30, fill: "none", stroke: "#5a4330", "stroke-width": 0.6, "stroke-dasharray": "2 3" }, cp);
  for (let a = 0; a < 8; a++) {
    const big = a % 2 === 0, r = big ? 48 : 30, ang = a * Math.PI / 4, w = big ? 7 : 5;
    const tx = Math.sin(ang) * r, ty = -Math.cos(ang) * r, lx = Math.cos(ang) * w, ly = Math.sin(ang) * w;
    el("path", { d: `M0 0 L${lx} ${ly} L${tx} ${ty} Z`, fill: "#5a4330" }, cp);
    el("path", { d: `M0 0 L${-lx} ${-ly} L${tx} ${ty} Z`, fill: "#a88c64" }, cp);
  }
  el("text", { x: 0, y: -54, "text-anchor": "middle", fill: "#3a2214", "font-size": 14, "font-weight": 700 }, cp).textContent = "북";
  const sb = el("g", { transform: "translate(1390 950)" }, decoG);
  for (let k = 0; k < 5; k++) el("rect", { x: k * 36, y: 0, width: 36, height: 6, fill: k % 2 ? "#efe2c2" : "#3a2214", stroke: "#3a2214", "stroke-width": 0.8 }, sb);
  el("text", { x: 0, y: -6, "font-size": 10.5, fill: "#3a2214" }, sb).textContent = "0";
  el("text", { x: 180, y: -6, "text-anchor": "end", "font-size": 10.5, fill: "#3a2214" }, sb).textContent = "말 타고 5일";
  // 북부 전선
  const frontG = el("g", {}, svg);
  el("path", { d: "M1082 300 Q1120 340 1192 382", fill: "none", stroke: "#a3281b", "stroke-width": 4, "stroke-dasharray": "10 6", "stroke-linecap": "round" }, frontG);
  el("text", { x: 1166, y: 330, "text-anchor": "middle", fill: "#a3281b", stroke: "#f1e5c6", "stroke-width": 3, "paint-order": "stroke", "font-size": 13, "font-weight": 700 }, frontG).textContent = "북부 전선";

  // 설명 칸
  let current = null;
  const show = (d, g, place) => {
    if (current) current.classList.remove("on");
    current = g || null; if (current) current.classList.add("on");
    const isHere = place && place.id === here;
    const acts = place && opt.game ? MAP_ACTIONS.flatMap((fn) => fn(opt.game, place) || []) : [];
    info.innerHTML = `<p class="kind">${d.kind ?? ""}${isHere ? ' · <b class="here">지금 있는 곳</b>' : ""}</p>
      <h3>${d.name}</h3><p class="note">${d.realm ?? ""}</p><p class="desc">${d.desc ?? ""}</p>
      ${d.todo ? `<p class="todo"><span>할 수 있는 일</span>${d.todo}</p>` : ""}
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
    const attrs = { x: r.x, y: r.y, "text-anchor": "middle", "font-family": "Gowun Batang, serif", "font-weight": 700, "font-size": r.s * 1.12, "letter-spacing": r.big ? 7 : 2.5,
      fill: r.big ? "#3a2214" : "#2b241c", stroke: "#f1e5c6", "stroke-width": r.big ? 4 : 3, "paint-order": "stroke" };
    if (r.vertical) { attrs["writing-mode"] = "vertical-rl"; attrs["letter-spacing"] = 10; }
    el("text", attrs, g).textContent = r.name;
    bind(g, () => show(r, g));
  };
  regions.forEach(regionLabel);
  regionLabel(Object.assign({ x: 760, y: 262, s: 22, big: true }, central));

  // 장소
  const placeG = el("g", {}, svg);
  let hereP = null;
  places.forEach((p) => {
    const g = el("g", { class: "place" + (p.tier === 3 && p.id !== here ? " t3" : ""), tabindex: 0, role: "button", "aria-label": p.n }, placeG);
    el("circle", { class: "hit", cx: p.x, cy: p.y, r: 14, fill: "transparent" }, g);
    const st = { stroke: "#2b241c", "stroke-width": 1.8, class: "mk" };
    const small = p.tier === 3;
    if (p.t === "capital") { el("rect", Object.assign({ x: p.x - 6, y: p.y - 6, width: 12, height: 12, fill: "#ece2c8" }, st), g); el("rect", { x: p.x - 2.2, y: p.y - 2.2, width: 4.4, height: 4.4, fill: "#2b241c" }, g); }
    else if (p.t === "city") el("circle", Object.assign({ cx: p.x, cy: p.y, r: 5.2, fill: "#ece2c8" }, st), g);
    else if (p.t === "town") el("circle", Object.assign({ cx: p.x, cy: p.y, r: 3, fill: "#2b241c" }, st, { "stroke-width": 1, stroke: "#ece2c8" }), g);
    else if (p.t === "fort") el("path", Object.assign({ d: `M${p.x - 6} ${p.y + 5} V${p.y - 2} L${p.x - 4} ${p.y - 5} L${p.x - 2} ${p.y - 2} L${p.x} ${p.y - 5} L${p.x + 2} ${p.y - 2} L${p.x + 4} ${p.y - 5} L${p.x + 6} ${p.y - 2} V${p.y + 5} Z`, fill: "#ece2c8" }, st, { "stroke-width": 1.4 }), g);
    else if (p.t === "dungeon") { el("circle", Object.assign({ cx: p.x, cy: p.y, r: 5.6, fill: "#3a1f2a" }, st, { stroke: "#e3b257", "stroke-width": 1.5 }), g); el("circle", { cx: p.x, cy: p.y, r: 2, fill: "#e3b257" }, g); }
    else if (p.t === "ruin") el("path", Object.assign({ d: `M${p.x - 7} ${p.y + 5} L${p.x - 4} ${p.y - 4} L${p.x} ${p.y} L${p.x + 3} ${p.y - 7} L${p.x + 7} ${p.y + 5} Z`, fill: "#d6c8a6" }, st, { stroke: "#5a4636", "stroke-width": 1.5 }), g);
    else el("path", Object.assign({ d: `M${p.x} ${p.y - 7} L${p.x + 6.5} ${p.y + 5} L${p.x - 6.5} ${p.y + 5} Z`, fill: "#ece2c8" }, st), g);
    const lx = p.x + (p.lx || 0), ly = p.y + (p.ly != null ? p.ly : (small ? 15 : 19));
    el("text", { x: lx, y: ly, "text-anchor": "middle", "font-weight": p.t === "capital" || p.id === here ? 700 : 500, "font-size": small ? 9.5 : p.t === "capital" ? 14.5 : 12.5,
      fill: "#241d16", stroke: "#efe6cd", "stroke-width": small ? 2.4 : 3, "paint-order": "stroke" }, g).textContent = p.n;
    const data = { kind: KIND[p.t] ?? "장소", name: p.n, realm: p.realm, desc: p.d, todo: p.todo };
    p._g = g; p._data = data;
    if (p.id === here) hereP = p;
    bind(g, () => show(data, g, p));
  });
  // 지금 있는 곳 표시: 붉은 고리와 깃발
  if (hereP) {
    const hg = el("g", { class: "here-mark", "pointer-events": "none" }, svg);
    el("circle", { cx: hereP.x, cy: hereP.y, r: 11, fill: "none", stroke: "#9a2a17", "stroke-width": 2.2 }, hg);
    el("circle", { cx: hereP.x, cy: hereP.y, r: 16, fill: "none", stroke: "#9a2a17", "stroke-width": 1, "stroke-dasharray": "3 3" }, hg);
    el("path", { d: `M${hereP.x} ${hereP.y - 11} V${hereP.y - 34} L${hereP.x + 14} ${hereP.y - 29} L${hereP.x} ${hereP.y - 24}`, fill: "#9a2a17", stroke: "#3a1a10", "stroke-width": 1.2 }, hg);
    show(hereP._data, hereP._g, hereP);
  } else show(central, null);

  // 확대·이동
  const vb = { x: 0, y: 0, w: WW, h: WH };
  let moved = false;
  const apply = () => {
    vb.w = Math.max(240, Math.min(WW, vb.w)); vb.h = vb.w * WH / WW;
    vb.x = Math.max(0, Math.min(WW - vb.w, vb.x)); vb.y = Math.max(0, Math.min(WH - vb.h, vb.y));
    svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    svg.classList.toggle("zoomed", WW / vb.w >= 1.7);
  };
  const toWorld = (cx, cy) => { const r = svg.getBoundingClientRect(); return [vb.x + (cx - r.left) / r.width * vb.w, vb.y + (cy - r.top) / r.height * vb.h]; };
  const zoomAt = (f, wx, wy) => { const nw = Math.max(240, Math.min(WW, vb.w / f)); const k = nw / vb.w; vb.x = wx - (wx - vb.x) * k; vb.y = wy - (wy - vb.y) * k; vb.w = nw; apply(); };
  const focusOn = (p, w = 520) => { vb.w = w; vb.x = p.x - vb.w / 2; vb.y = p.y - vb.w * WH / WW / 2; apply(); };
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
  if (hereP) focusOn(hereP, 640); else apply();
}
