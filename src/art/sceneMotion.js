// 풍경·삽화의 작은 움직임 (29단계): 비, 눈, 창 불빛 일렁임, 굴뚝 연기, 물결 반짝임, 불티.
// 그림(JPEG)은 그대로 두고 그 위에 투명한 캔버스 한 장을 얹어 움직이는 것만 그린다.
//
//   noteMotion(url, meta)  그림을 만든 쪽(scene.js, vignette.js)이 그림 주소와 함께 움직일 거리를 적어 둔다.
//     meta: { kind: 'scene'|'vig', w, h, weather, tod, wins?: [[x,y,r,color]], smoke?: [[x,y,sc]], water?: [[x0,x1,yTop,yBot]], embers?: bool, glow?: color }
//   화면에 그 그림이 붙으면 스스로 찾아가 얹는다 (.scene img, .ev-art i). 화면 코드는 고치지 않아도 된다.
//
// 배터리: 화면에 보이는 동안만, 초당 12장 정도만 그린다. 앱이 뒤로 가거나 '화면 움직임 줄이기'면 멈춘다.
// 캔버스는 기기 픽셀의 1.5배를 넘지 않는다.
const hasDom = typeof document !== 'undefined' && typeof window !== 'undefined';
const META = new Map();
export function noteMotion(url, meta) {
  if (!url || !meta) return;
  META.set(url, meta);
  while (META.size > 40) META.delete(META.keys().next().value);
}
export const motionMeta = (url) => META.get(url) ?? null;
// 움직일 거리가 있는가
export const hasMotion = (m) => !!m && (['rain', 'storm', 'snow', 'blizzard'].includes(m.weather) || (m.wins?.length ?? 0) > 0 || (m.smoke?.length ?? 0) > 0 || (m.water?.length ?? 0) > 0 || !!m.embers);

const FPS = 12;
const allowed = () => document.documentElement.classList.contains('motion') && !document.hidden;

/* ---------- 입자 ---------- */
function hashf(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
let sprites = null;
function sprite(color) {
  sprites ??= new Map();
  if (sprites.has(color)) return sprites.get(color);
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  if (sprites.size > 24) sprites.clear();
  sprites.set(color, c);
  return c;
}
const rgbaOf = (hex, a) => { const h = (hex || '#ffc878').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

function makeState(m) {
  const W = m.w, H = m.h, unit = W / 1200;
  const st = { drops: [], flakes: [], embers: [], puffs: [], glints: [] };
  const heavy = m.weather === 'storm' || m.weather === 'blizzard';
  if (m.weather === 'rain' || m.weather === 'storm') for (let i = 0; i < (heavy ? 150 : 80); i++) st.drops.push({ x: Math.random() * W * 1.2, y: Math.random() * H, l: (14 + Math.random() * 16) * unit, v: (520 + Math.random() * 260) * unit, a: 0.18 + Math.random() * 0.22 });
  if (m.weather === 'snow' || m.weather === 'blizzard') for (let i = 0; i < (heavy ? 150 : 70); i++) st.flakes.push({ x: Math.random() * W, y: Math.random() * H, r: (0.8 + Math.random() * 2.2) * unit, v: (heavy ? 60 : 26) * (0.6 + Math.random() * 0.8) * unit, ph: Math.random() * 6.28, a: 0.5 + Math.random() * 0.4 });
  if (m.embers) for (let i = 0; i < 26; i++) st.embers.push({ x: Math.random() * W, y: H * (0.5 + Math.random() * 0.5), v: (18 + Math.random() * 30) * unit, ph: Math.random() * 6.28, life: Math.random() });
  for (const [x, y, sc] of m.smoke ?? []) for (let i = 0; i < 4; i++) st.puffs.push({ x0: x, y0: y, sc, t: i / 4 });
  for (const [x0, x1, y0, y1] of m.water ?? []) for (let i = 0; i < Math.min(18, Math.round((x1 - x0) / 50)); i++) st.glints.push({ x0, x1, y0, y1, x: x0 + Math.random() * (x1 - x0), y: y0 + Math.pow(Math.random(), 1.4) * (y1 - y0), ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.2 });
  return st;
}

function frame(ctx, m, st, t, dt) {
  const W = m.w, H = m.h, night = m.tod === 'night', unit = W / 1200;
  // 창 불빛: 저마다 다른 빠르기로 아주 조금 일렁인다
  if (m.wins?.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < m.wins.length; i++) {
      const [x, y, r, col] = m.wins[i];
      const f = Math.sin(t * (2.1 + hashf(i) * 2.4) + i) * 0.5 + Math.sin(t * (5.3 + hashf(i + 9) * 3) + i * 2) * 0.3;
      const a = (night ? 0.16 : 0.1) * (0.55 + f * 0.45);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a; ctx.drawImage(sprite(col || '#ffc878'), x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  // 굴뚝 연기: 피어올라 흩어진다
  if (st.puffs.length) {
    const col = night ? '#7a8090' : '#d8d4cc';
    for (const p of st.puffs) {
      p.t += dt / 6;
      if (p.t > 1) p.t -= 1;
      const k = p.t, rr = (4 + k * 16) * p.sc;
      ctx.globalAlpha = 0.22 * (1 - k) * Math.min(1, k * 6);
      ctx.drawImage(sprite(col), p.x0 + k * 22 * p.sc + Math.sin(t + p.x0) * 2 - rr, p.y0 - k * 58 * p.sc - rr, rr * 2, rr * 2);
    }
    ctx.globalAlpha = 1;
  }
  // 물결 반짝임
  if (st.glints.length) {
    ctx.lineCap = 'round';
    const col = night ? '#c8d4f0' : '#fff4dc';
    for (const g of st.glints) {
      const a = Math.max(0, Math.sin(t * g.sp + g.ph)) * (night ? 0.3 : 0.4);
      if (a < 0.03) { if (Math.sin(t * g.sp + g.ph) < -0.98) { g.x = g.x0 + Math.random() * (g.x1 - g.x0); } continue; }
      const depth = (g.y - g.y0) / Math.max(1, g.y1 - g.y0), w = (6 + depth * 26) * unit;
      ctx.strokeStyle = rgbaOf(col, a); ctx.lineWidth = (0.8 + depth * 1.2) * unit;
      ctx.beginPath(); ctx.moveTo(g.x - w / 2 + Math.sin(t * 0.7 + g.ph) * 3, g.y); ctx.lineTo(g.x + w / 2 + Math.sin(t * 0.7 + g.ph) * 3, g.y); ctx.stroke();
    }
  }
  // 불티
  if (st.embers.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (const e of st.embers) {
      e.y -= e.v * dt; e.life += dt * 0.25; e.x += Math.sin(t * 1.3 + e.ph) * 12 * unit * dt;
      if (e.y < H * 0.15 || e.life > 1) { e.y = H * (0.75 + Math.random() * 0.25); e.x = Math.random() * W; e.life = 0; }
      const r = 3 * unit;
      ctx.globalAlpha = 0.7 * (1 - e.life); ctx.drawImage(sprite('#ffb060'), e.x - r * 2, e.y - r * 2, r * 4, r * 4);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  // 비
  if (st.drops.length) {
    ctx.strokeStyle = night ? 'rgba(160,172,200,1)' : 'rgba(214,220,230,1)';
    ctx.lineWidth = 1.1 * unit;
    for (const d of st.drops) {
      d.y += d.v * dt; d.x -= d.v * dt * 0.28;
      if (d.y > H) { d.y = -d.l; d.x = Math.random() * W * 1.2; }
      ctx.globalAlpha = d.a; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.28, d.y + d.l); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // 눈
  if (st.flakes.length) {
    ctx.fillStyle = night ? '#d8deea' : '#ffffff';
    const wind = m.weather === 'blizzard' ? 80 * unit : 8 * unit;
    for (const f of st.flakes) {
      f.y += f.v * dt; f.x += (wind + Math.sin(t * 0.9 + f.ph) * 10 * unit) * dt;
      if (f.y > H) { f.y = -4; f.x = Math.random() * W; }
      if (f.x > W + 6) f.x = -6;
      ctx.globalAlpha = f.a; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- 화면에 붙이기 ---------- */
const runners = new WeakMap();
function cover(cw, ch, iw, ih, pos) {
  // object-fit: cover 와 object-position 을 따라 그림 좌표를 화면 좌표로
  const s = Math.max(cw / iw, ch / ih), dw = iw * s, dh = ih * s;
  return { s, ox: (cw - dw) * pos[0], oy: (ch - dh) * pos[1] };
}
const posOf = (el) => { const v = getComputedStyle(el).objectPosition || '50% 50%'; const p = v.split(/\s+/).map((x) => (x.endsWith('%') ? parseFloat(x) / 100 : 0.5)); return [p[0] ?? 0.5, p[1] ?? 0.5]; };

function attach(host, target, url, m, { follow = true } = {}) {
  const old = runners.get(host);
  if (old && old.url === url) return;
  if (old) old.stop();
  if (!hasMotion(m)) return;
  const cv = document.createElement('canvas');
  cv.className = 'fl-motion'; cv.setAttribute('aria-hidden', 'true');
  // 그림 바로 뒤에 넣는다: 그 위에 얹힌 글자(달·날씨)와 사건 창의 아래쪽 그늘은 움직임보다 위에 남는다
  cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none';
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  if (target.parentElement === host) target.after(cv); else host.appendChild(cv);
  const ctx = cv.getContext('2d');
  // 사건 창의 그림은 천천히 당겨지므로 그 자리에 붙는 것(창 불빛·연기·물결)은 빼고 하늘에서 내리는 것만
  const mm = follow ? m : { ...m, wins: [], smoke: [], water: [] };
  const st = makeState(mm);
  let raf = 0, last = 0, visible = true, stopped = false;
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) kick(); }) : null;
  io?.observe(cv);
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.max(1, Math.round(host.clientWidth * dpr)), h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return dpr;
  }
  function loop(now) {
    raf = 0;
    if (stopped) return;
    if (!host.isConnected || !cv.isConnected) { stop(); return; }
    if (!visible || !allowed()) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); last = 0; return; }
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / FPS) return;
    const dt = Math.min(0.2, last ? (now - last) / 1000 : 0.08); last = now;
    const dpr = size();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    let tr;
    if (follow && target.tagName === 'IMG') tr = cover(host.clientWidth, host.clientHeight, m.w, m.h, posOf(target));
    else tr = cover(host.clientWidth, host.clientHeight, m.w, m.h, [0.5, 0.5]);
    ctx.setTransform(tr.s * dpr, 0, 0, tr.s * dpr, tr.ox * dpr, tr.oy * dpr);
    frame(ctx, mm, st, now / 1000, dt);
  }
  function kick() { if (!raf && !stopped) raf = requestAnimationFrame(loop); }
  function stop() { stopped = true; if (raf) cancelAnimationFrame(raf); io?.disconnect(); cv.remove(); if (runners.get(host)?.cv === cv) runners.delete(host); }
  const r = { url, cv, stop, kick };
  runners.set(host, r);
  kick();
}

const bgUrl = (el) => { const m = /url\(["']?([^"')]+)["']?\)/.exec(el.style.backgroundImage || ''); return m ? m[1] : ''; };
function scan() {
  for (const img of document.querySelectorAll('.scene img:not(.prev)')) {
    const m = META.get(img.currentSrc || img.src);
    if (m) attach(img.parentElement, img, img.currentSrc || img.src, m, { follow: true });
  }
  for (const i of document.querySelectorAll('.ev-art i')) {
    const u = bgUrl(i), m = META.get(u);
    if (m) attach(i.parentElement, i, u, m, { follow: false });
  }
  for (const r of document.querySelectorAll('canvas.fl-motion')) runners.get(r.parentElement)?.kick();
}

if (hasDom && typeof MutationObserver !== 'undefined') {
  let queued = false;
  const go = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; try { scan(); } catch { /* 움직임이 없어도 그만 */ } }, 60); };
  const start = () => { new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); go(); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  document.addEventListener('visibilitychange', go);
  new MutationObserver(go).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
