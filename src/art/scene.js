// 풍경 그림: 캔버스에 붓질하듯 겹겹이 그린다.
// 장소(땅 모양·사는 이들·마을 크기), 달(계절), 하루 중 때(새벽·낮·해 질 녘·밤), 날씨, 흉년·역병에 따라 바뀐다.
// 한 장소의 배치는 늘 같고(장소마다 고정 씨앗), 그날의 때와 날씨만 달마다 정해진다.
import { W, H, HZ, hash, fbm1, ridged1, rng, mixh, rgba, dark, light, clamp, sbump, lerp, fillCurve, clipBelow, poly, puff, mist, vgrad, grain, trace, canvasUrl, dropUrl } from './sceneKit.js';
import { describe } from './scenePlaces.js';
import { paintFinish } from './scenePaint.js';
import { noteMotion } from './sceneMotion.js';
import { rimLight, sunRays, wetGround, fogBanks, nearFrame } from './sceneDrama.js';
import { skyOf, paintSky, gradeLand, paintWeather } from './sceneSky.js';
import { weatherFor, tweak as seasonTweak, land as seasonLand, air as seasonAir } from './sceneSeason.js';
import { takeWater, paletteOf, mountains, hillBand, treeline, forestMass, fields, water, tree, conifer, palm, rock, reedClump, foreground, dunes } from './sceneLand.js';
import { HOOKS } from '../hooks.js';
import { invented } from '../era/state.js';
import { TECH, eraOf, eraKey, eraBack, eraFront, ironBridge, ironcart, rails, train, station, crane, shipyard, steamship, airship, headframe } from './sceneEra.js';
import { STYLE, house, tower, wallRun, windmill, church, cathedral, keep, castle, citadel, mageTowers, endlessTower, wizardTower, elfGreatTree, ropeBridge, dwarfFacade, yurt, herd, ruinArch, bastion, manor, fortress, ruins, ruinPalace, lighthouse, ship, docks, elfSpire, tent, totem, blackSpire, stiltHut, dwarfGate, worldTree } from './sceneTown.js';
import { gradeScene } from './sceneGrade.js';
import { nearStage } from './sceneNear.js';

/** 그 달의 때와 날씨 (같은 달이면 늘 같음) */
export function conditions(year, month) {
  const k = year * 12 + month;
  const r = hash(k, 77), w = hash(k, 91);
  const tod = r < 0.48 ? 'day' : r < 0.68 ? 'dusk' : r < 0.82 ? 'dawn' : 'night';
  const season = [0, '겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'][month];
  let weather = 'clear';
  if (season === '겨울') weather = w < 0.11 ? 'blizzard' : w < 0.45 ? 'snow' : w < 0.62 ? 'cloudy' : w < 0.72 ? 'wind' : 'clear';
  else if (season === '봄') weather = w < 0.21 ? 'rain' : w < 0.26 ? 'storm' : w < 0.39 ? 'cloudy' : w < 0.49 ? 'fog' : w < 0.61 ? 'wind' : 'clear';
  else if (month === 7) weather = w < 0.34 ? 'rain' : w < 0.46 ? 'storm' : w < 0.56 ? 'cloudy' : w < 0.62 ? 'wind' : 'clear'; // 장마철
  else if (season === '여름') weather = w < 0.11 ? 'rain' : w < 0.21 ? 'storm' : w < 0.29 ? 'cloudy' : w < 0.35 ? 'wind' : 'clear';
  else weather = w < 0.21 ? 'rain' : w < 0.27 ? 'storm' : w < 0.42 ? 'fog' : w < 0.56 ? 'cloudy' : w < 0.72 ? 'wind' : 'clear';
  if (weather === 'fog' && tod === 'night') weather = 'cloudy';
  return { tod, weather, season };
}

const TOD_NAME = { day: '한낮', dusk: '해 질 녘', dawn: '새벽', night: '밤' };
const WEATHER_NAME = { clear: '맑음', cloudy: '흐림', rain: '비', snow: '눈', fog: '안개', storm: '뇌우', blizzard: '눈보라', wind: '바람' };
export function conditionText(year, month) {
  const c = conditions(year, month);
  return `${TOD_NAME[c.tod]} · ${WEATHER_NAME[c.weather]}`;
}

// 지금 하는 판 (기술이 나온 만큼 풍경이 바뀐다). 부르는 쪽이 techs를 주지 않으면 이 판의 것을 읽는다.
let game = null;
const keepGame = (g) => { game = g; };
HOOKS.newGame.push(keepGame); HOOKS.migrate.push(keepGame); HOOKS.afterMonth.push(keepGame); (HOOKS.heir ??= []).push(keepGame);
const ALL_TECH = Object.values(TECH).flat();
function techReader(techs, year, month) {
  if (Array.isArray(techs)) return { n: techs.length, has: (id) => techs.includes(id), since: (id) => techs.length - 1 - techs.indexOf(id) };
  const g = game;
  if (!g?.date || Math.abs(g.date.year * 12 + g.date.month - year * 12 - month) > 1) return null; // 제목 그림 같은, 이 판의 지금이 아닌 풍경
  const list = Array.isArray(g.history?.inventions) ? g.history.inventions : [], has = (id) => invented(g, id);
  return { n: list.length || ALL_TECH.filter(has).length, has, since: (id) => (list.includes(id) ? list.length - 1 - list.indexOf(id) : 99) };
}

/** 이 판의 기술 목록(풍경 시대 층용). sceneArgs에 같이 넣으면 판이 없는 제목 화면에서 미리 그린 그림과 열쇠가 같아진다 (41단계 헤드: 이어 하기) */
export function techsOf(g) {
  const list = Array.isArray(g?.history?.inventions) ? g.history.inventions : [];
  return list.length ? list.slice() : ALL_TECH.filter((id) => { try { return invented(g, id); } catch { return false; } });
}

const cache = new Map();
/** 풍경 그림 (data URL). 브라우저에서만 동작. techs: 나온 기술 id들(순서대로). 없으면 지금 하는 판에서 읽는다. */
export function sceneImage({ year, month, famine = false, plague = false, place = 'ern', calamity = null, techs = null }) {
  let era = null;
  try { const D = describe(place); era = eraOf(techReader(techs, year, month), D, !!STYLE[D.culture] && !STYLE[D.culture].ruin); } catch { /* 시대 층 없이 그린다 */ }
  const key = `${year}-${month}-${!!famine}-${!!plague}-${place}-${calamity ?? ''}-${eraKey(era)}`;
  if (cache.has(key)) return cache.get(key);
  if (typeof document === 'undefined') return '';
  let url = '';
  try { url = draw(year, month, !!famine, !!plague, place, calamity, era); } catch (err) { if (globalThis.FL_SCENE_DEBUG) console.error(err); /* 그림이 없어도 게임은 이어진다 */ }
  if (!url) return '';
  // 오래된 그림부터 버린다. 지금 화면에 나온 그림(가장 새것)은 남는다.
  while (cache.size >= 16) { const [k, old] = cache.entries().next().value; cache.delete(k); dropUrl(old); }
  cache.set(key, url);
  return url;
}

// 다음 달 풍경을 미리 그려 둔다 (헤드 16단계). 풍경 한 장을 그리고 JPEG로 굳히는 데 폰에서 0.1초 가까이 걸려,
// '한 달 보내기'를 누를 때마다 그만큼 멈췄다. 화면을 다 그린 뒤 쉬는 틈에 다음 달 것을 그려 두면 누를 때는 꺼내 쓰기만 한다.
let warmTimer = null, warmArgs = null, warmWait = false;
export function prewarmScene(args) {
  if (typeof document === 'undefined' || typeof setTimeout === 'undefined') return;
  warmArgs = args;
  if (warmTimer) { clearTimeout(warmTimer); warmTimer = null; }
  if (warmWait) return;
  // 화면이 한 번 그려진 뒤에 미리 그린다: 바로 뒤 타이머가 첫 그리기를 막지 않게 (41단계 헤드)
  warmWait = true;
  const go = () => { warmWait = false; warmTimer = setTimeout(() => { warmTimer = null; try { sceneImage(warmArgs); } catch { /* 미리 못 그려도 그만 */ } }, 400); };
  try { requestAnimationFrame(go); } catch { go(); }
}

function draw(year, month, famine, plague, place, calamity, era) {
  const D = describe(place), k = year * 12 + month;
  const c0 = conditions(year, month);
  // 재앙이 없을 때, 7월의 비는 장마다
  const cal = calamity ?? (month === 7 && (c0.weather === 'rain' || c0.weather === 'storm') && D.biome !== 'cold' && D.biome !== 'ash' && D.biome !== 'blight' ? 'monsoon' : null);
  const { tod, weather: w0 } = cal ? weatherFor(cal, c0.tod, c0.weather) : c0;
  // 남쪽 섬에는 눈이 오지 않고, 병든 땅의 눈은 재처럼 내린다
  const weather = D.biome === 'island' && (w0 === 'snow' || w0 === 'blizzard') ? (w0 === 'snow' ? 'rain' : 'storm') : w0;
  const P = paletteOf(cal === 'frost' && (month >= 11 || month <= 3) ? 1 : month, D.biome, famine);
  if (cal) seasonTweak(P, cal);
  const S = skyOf(tod, weather, D.biome, k);
  takeWater();
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const land = document.createElement('canvas'); land.width = W; land.height = H;
  const L = land.getContext('2d');
  const wr = rng(k * 31 + 7), R = rng(D.seed);
  paintSky(ctx, S, wr, k);
  const e = { D, P, S, R, wr, month, k, plague, wins: [], smoke: [], lit: [], smokeOn: [], st: STYLE[D.culture] || STYLE.leonia, q: D.seed % 89, era };
  const layout = D.layout ?? (D.biome === 'island' ? 'island' : D.biome === 'lake' ? 'lake' : D.biome === 'mountain' ? 'mountain' : D.biome === 'forest' ? 'forest' : D.coast || D.biome === 'coast' ? 'coast' : 'open');
  LAYOUTS[layout](L, e);
  // 아주 먼 뒤의 하늘: 비행선. 정기편이 생기기 전에는 드물게만 지나간다
  if (era?.airship !== undefined && (era.skyline !== undefined || hash(k, 9) < 0.4)) airship(L, 170 + hash(k, 3) * 420, 54 + hash(k, 4) * 60, era.skyline !== undefined ? 0.42 : 0.3, e, hash(k, 6) < 0.5);
  if (cal) seasonLand(L, cal, e);
  gradeLand(L, S, plague);
  sunRays(ctx, S, wr, k); // 빛줄기는 하늘에만: 땅·성·나무 뒤로 간다
  ctx.drawImage(land, 0, 0);
  rimLight(ctx, land, S);
  lights(ctx, e);
  wetGround(ctx, S, e.lit, k);
  fogBanks(ctx, S, wr);
  nearFrame(ctx, S, P, D.biome, rng(D.seed + 3));
  paintWeather(ctx, S, wr, { leaves: !!P.autumn && !P.blight, embers: D.culture === 'demon', month, snowy: !!P.snow, barren: !!P.blight });
  if (cal) seasonAir(ctx, cal, e);
  gradeScene(ctx, S, { month, lit: e.lit, blight: !!P.blight, dry: !!P.dry }); // 46단계: 대비·계절 색·하늘 빛·밤 불빛
  paintFinish(ctx, W, H, S, { hz: HZ / H });
  nearStage(ctx, S, P, D, layout, rng(D.seed * 13 + 7), wr); // 51단계: 폰에 보이는 가운데에 가까운 나무와 둔덕 (먼 곳 안개 뒤에 그린다)
  grain(ctx);
  land.width = land.height = 0;
  const url = canvasUrl(cv, 'image/jpeg', 0.88);
  noteMotion(url, { kind: 'scene', w: W, h: H, weather, tod, wins: e.lit, smoke: e.smokeOn, water: takeWater(), embers: D.culture === 'demon' });
  return url;
}

/* ---------- 함께 쓰는 조각 ---------- */
// 땅에 맞는 나무를 심는다
function plant(L, e, x, y, r, o = {}) {
  const { D, P, S, R } = e, b = D.biome;
  if (P.blight) return tree(L, x, y, r, P, S, R, { dead: true, big: o.big });
  if (b === 'island') return palm(L, x, y, r * 2.4, P, S, R);
  if (b === 'cold' || b === 'mountain' || R() < (b === 'forest' ? 0.4 : 0.18)) return conifer(L, x, y, r * 2.7, P, S, R);
  if (b === 'swamp' && R() < 0.45) return tree(L, x, y, r, P, S, R, { dead: true, big: o.big });
  return tree(L, x, y, r, P, S, R, o);
}
function farRanges(L, e, hgt = 1, o = {}) {
  const { P, S, q } = e, env = o.env ?? (() => 1), sharp = P.blight ? 1.5 : 1;
  const b = (x) => HZ - 34 - Math.pow(ridged1(x / 150 + q, 15), sharp) * 100 * hgt * env(x) - sbump(x, 860 - q * 3, 300) * 26 * hgt;
  const a = (x) => HZ - 10 - Math.pow(ridged1(x / 118 + q * 2, 5), sharp) * 90 * hgt * env(x) - sbump(x, 330 + q * 4, 360) * 30 * hgt;
  mountains(L, b, { color: P.far, S, haze: 0.6, snowLine: P.snowLine, seed: 15, reach: Math.max(0.7, hgt) });
  mountains(L, a, { color: P.far, S, haze: 0.36, snowLine: P.snowLine, seed: 5, reach: Math.max(0.7, hgt) });
}
function farHills(L, e, o = {}) {
  const { P, S, R, q } = e;
  const h1 = (x) => HZ + 6 - fbm1(x / 220 + q, 11, 3) * 34;
  hillBand(L, h1, mixh(P.hill, S.haze, 0.45), S, { seed: 11, depth: 40, tex: 12 });
  treeline(L, h1, P, S, { haze: 0.5, thr: o.thr ?? 0.5, pine: o.pine ?? 0.5 });
  if (!P.blight) forestMass(L, (x) => h1(x) + 7, 16, P, S, R, { size: 5.5, haze: 0.48, pine: o.pine ?? 0.4, gap: (x) => fbm1(x / 120 + q, 43) < (o.wood ?? 0.52) });
  mist(L, HZ + 28, 24, S.haze, 0.4);
  return h1;
}
function road(L, e, x0, x1, yTop, o = {}) {
  const { P } = e, paved = e.era?.paving !== undefined && !P.snow, c = P.snow ? '#cfcdc6' : P.blight ? dark(P.grass, 0.25) : paved ? mixh('#9c968a', P.grass, 0.12) : mixh('#a8926a', P.grass, 0.25);
  const bx = o.bx ?? x1 + 110;
  L.beginPath(); L.moveTo(bx - 70, H); L.bezierCurveTo(bx - 90, 440, x1 + 40, 410, x1 - 3, yTop); L.lineTo(x1 + 5, yTop); L.bezierCurveTo(x1 + 90, 404, bx + 20, 436, bx + 70, H); L.closePath();
  L.fillStyle = vgrad(L, yTop, H, [[0, mixh(c, e.S.haze, 0.15)], [1, dark(c, 0.14)]]); L.fill();
  if (paved) { // 포장길: 깐 돌의 줄눈
    L.save(); L.clip(); L.strokeStyle = 'rgba(52,46,40,.2)'; L.lineWidth = 0.8;
    for (let y = yTop + 3, gap = 2.4; y < H; y += gap, gap *= 1.13) { L.beginPath(); L.moveTo(0, y); L.lineTo(W, y); L.stroke(); for (let x = (Math.round(y) % 2) * gap; x < W; x += gap * 2.2) { L.beginPath(); L.moveTo(x, y); L.lineTo(x, y + gap); L.stroke(); } }
    L.restore();
  }
  L.strokeStyle = 'rgba(40,30,20,.22)'; L.lineWidth = 1; L.beginPath(); L.moveTo(bx - 30, H); L.bezierCurveTo(bx - 50, 440, x1 + 50, 410, x1, yTop + 2); L.moveTo(bx + 30, H); L.bezierCurveTo(bx + 10, 440, x1 + 74, 410, x1 + 3, yTop + 2); L.stroke();
}
function fence(L, fn, x0, x1) {
  L.strokeStyle = '#3e2e20'; L.lineWidth = 2.2;
  const y = (x) => fn(x) + 24 + (x - x0) * 0.05;
  for (let x = x0; x < x1; x += 26) { L.beginPath(); L.moveTo(x, y(x)); L.lineTo(x + 1, y(x) - 18); L.stroke(); }
  L.lineWidth = 1.5;
  for (const dy of [14, 7]) { L.beginPath(); for (let x = x0; x < x1; x += 26) x === x0 ? L.moveTo(x, y(x) - dy) : L.lineTo(x, y(x) - dy + ((x / 26) % 2) * 0.8); L.stroke(); }
}
function smokeUp(L, e) {
  const { S, P, k, plague, wr } = e, wind = (hash(k, 21) - 0.5) * 9;
  const p = plague ? 0.2 : P.snow ? 0.9 : S.tod === 'night' ? 0.4 : 0.55, c = S.tod === 'night' ? '#6a7080' : '#d6d2ca';
  for (const [x, y, seed, sc] of e.smoke) {
    if (hash(seed, k) > p) continue;
    if (e.smokeOn.length < 12) e.smokeOn.push([Math.round(x + wind * 9 * 0.9 * sc), Math.round(y - 9 * 6.5 * sc), sc]);
    for (let i = 0; i < 9; i++) puff(L, x + wind * i * 0.9 * sc + Math.sin(i * 1.3 + seed) * 2.4, y - i * 6.5 * sc, (3 + i * 1.7) * sc, (3 + i * 1.5) * sc, c, 0.5 - i * 0.045);
  }
}
/** 불 켜진 창과 횃불. 밤일수록 많이 켜진다 */
function lights(ctx, e) {
  const { S, k, plague } = e, tod = S.tod;
  const wet = S.weather === 'rain' || S.storm, on = Math.max(tod === 'night' ? 0.78 : tod === 'dusk' ? 0.55 : tod === 'dawn' ? 0.3 : S.heavy ? 0.12 : 0, wet ? 0.55 : 0); // 비 오는 날은 낮에도 창불을 켠다
  const dense = e.wins.length > 90;
  ctx.globalCompositeOperation = 'lighter';
  const dayOff = tod === 'day' && !S.heavy, glass = e.era?.glass !== undefined;
  const lit = (key, always) => (always === 'night' ? !dayOff : always || hash(key, k) <= (on + (glass && on ? 0.08 : 0)) * (plague ? 0.6 : 1));
  for (const [x, y, w, h, key, glow, always] of e.wins) {
    if (!lit(key, always)) continue;
    const a = always ? (tod === 'day' ? 0.35 : 0.9) : tod === 'night' ? 0.85 : 0.6, soft = always === 'night', r = Math.max(soft ? 5 : 7, (w + h) * 1.7) * (soft ? 1.3 : always ? 2.2 : 1);
    if (e.lit.length < 48 && (tod !== 'day' || always)) e.lit.push([Math.round(x + w / 2), Math.round(y + h / 2), Math.round(r * 0.8), glow || '#ffc878']);
    puff(ctx, x + w / 2, y + h / 2, r, r, glow || '#ffc878', (soft ? 0.2 : always ? 0.34 : dense ? 0.14 : 0.24) * a);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const [x, y, w, h, key, glow, always] of e.wins) {
    if (!lit(key, always)) { // 맑은 유리창: 낮에는 몇몇 창이 하늘빛을 받아 반짝인다
      if (glass && !always && tod !== 'night' && hash(key, 5) < 0.2 + Math.min(e.era.glass, 8) * 0.04) { ctx.fillStyle = rgba(light(S.low, 0.35), 0.5); ctx.fillRect(x, y, w, h * 0.55); }
      continue;
    }
    ctx.fillStyle = rgba(light(glow || '#ffc878', 0.25), always && tod === 'day' ? 0.6 : 0.95); ctx.fillRect(x, y, w, h);
  }
}

/* ---------- 마을 놓기 ---------- */
const SPAN = { hamlet: 300, village: 350, town: 420, city: 450, capital: 540, fort: 230, site: 150, ruin: 320 };
// 작은 마을일수록 가까이서 본 듯 크게 그린다
const ZOOM = { hamlet: 1.5, village: 1.35, town: 1.15, city: 1.05, fort: 1.2, site: 1.3, ruin: 1.1 };
// 마법사의 탑마다 다른 모습
const WIZ = { noah: { dead: true, stone: '#aeb2bc', cap: '#39405e' }, spire: { stone: '#c8ccd4', cap: '#5a6a8a', glow: '#bfe8ff', broken: true }, lich: { stone: '#4a4650', cap: '#2a2630', glow: '#9ae87a', broken: true } };
function dwelling(L, e, x, y, s, i) {
  const { D, P, S, R, st, wins, smoke } = e, c = D.culture;
  if (D.camp && i % 4 !== 0) { // 병영: 줄지은 군막, 군데군데 깃대
    tent(L, x, y, s * 0.9, S, P, wins, R, c === 'demon' ? ['#5a4444', '#4a3a40', '#644a44'] : ['#c8bea4', '#b8ae96', '#d0c8b0', '#a89e88']);
    if (i % 5 === 0) { L.strokeStyle = '#2a1d12'; L.lineWidth = 1.2; L.beginPath(); L.moveTo(x + 14 * s, y); L.lineTo(x + 14 * s, y - 34 * s); L.stroke(); L.fillStyle = c === 'demon' ? '#6a1a22' : D.culture === 'empire' ? '#2c2c34' : '#8a2a1e'; L.beginPath(); L.moveTo(x + 14 * s, y - 34 * s); L.lineTo(x + 14 * s - S.dir * 12 * s, y - 31 * s); L.lineTo(x + 14 * s, y - 26 * s); L.fill(); }
    return;
  }
  if (c === 'elf') return R() < 0.7 ? elfSpire(L, x, y, s, S, P, wins, R) : plant(L, e, x, y, 9 * s);
  if (c === 'beast') return R() < 0.62 ? yurt(L, x, y, s, S, P, wins, R) : R() < 0.8 ? tent(L, x, y, s, S, P, wins, R) : totem(L, x, y, s * 0.9, S);
  if (c === 'demon') return blackSpire(L, x, y, s, S, P, wins, R, false);
  if (c === 'sea') return stiltHut(L, x, y, s, st, S, P, wins, R, smoke);
  if (st.ruin || D.size === 'ruin') return ruins(L, x, y, s, S, P, wins, R, { n: 1, span: 10, glow: st.glow });
  const two = (D.size === 'capital' || D.size === 'city') && R() < 0.5;
  const w = (15 + R() * 11) * s, type = st.flat ? 'flat' : R() < 0.56 ? 'eave' : 'gable';
  const h = (9 + R() * 5) * s * st.tall * (two ? 1.5 : 1);
  house(L, { x, y, w, h, d: w * 0.36, rh: (type === 'gable' ? w * 0.5 : w * (0.4 + R() * 0.16)) * (st.steep || 1), type, wall: st.walls[i % st.walls.length], roof: st.roofs[Math.floor(R() * st.roofs.length)], timber: st.timber && R() < 0.75 ? st.timber : null, seed: i, h2: two, chimney: R() < 0.8 }, st, S, P, wins, smoke);
}
/** ground 곡선 위, cx 둘레에 마을을 놓는다. 돌려주는 값: 성문/길이 닿는 자리 */
function settle(L, e, ground, cx, o = {}) {
  const { D, P, S, R, st, wins, smoke } = e;
  const z = o.z ?? D.zoom ?? (D.culture === 'beast' ? 1.5 : ZOOM[D.size] ?? 1);
  const span = o.span ?? D.span ?? SPAN[D.size] ?? 300, depth = o.depth ?? (D.size === 'capital' ? 84 : D.size === 'hamlet' ? 66 : 76);
  const top = (x) => ground(x) + (o.off ?? 10);
  const human = !!STYLE[D.culture];
  // 마을 뒤 나무
  if (!o.noTrees) for (let i = 0; i < span / 15; i++) { const x = cx + (R() - 0.5) * span * 1.15; plant(L, e, x, top(x) + R() * 16, (6 + R() * 5) * z); }
  // 뒤에 서는 큰 건물
  const f = D.feature, lx = cx + (o.lx ?? span * 0.2), ly = top(lx) + 8;
  let block = null; // 집을 놓지 않을 자리 [x0, x1, yMax]
  if (f === 'castle') { castle(L, lx, ly + 4, 0.8, st, S, P, wins); block = [lx - 100, lx + 100, ly + 12]; }
  else if (f === 'keep') { keep(L, lx, ly, 0.82, st, S, P, wins, { white: D.white }); block = [lx - 56, lx + 56, ly + 10]; }
  else if (f === 'citadel') { citadel(L, lx, ly + 4, 0.8, st, S, P, wins); block = [lx - 94, lx + 94, ly + 12]; }
  else if (f === 'cathedral') { cathedral(L, lx, ly + 14, 0.9, st, S, P, wins, smoke); block = [lx - 62, lx + 62, ly + 22]; }
  else if (f === 'bastion') { bastion(L, lx, ly + 2, 0.8, st, S, P, wins); block = [lx - 150, lx + 150, ly + 30]; }
  else if (f === 'ruinpalace') { ruinPalace(L, lx, ly + 8, 0.9, S, P, wins, R); block = [lx - 60, lx + 60, ly + 14]; }
  else if (f === 'wizardtower') { const k = WIZ[D.id] ?? {}; wizardTower(L, cx, ly + 30, 1.25, S, P, wins, k); block = [cx - 80, cx + 80, ly + 60]; }
  else if (f === 'fortress') { fortress(L, cx, ly + 20, 1, st, S, P, wins); block = [cx - 80, cx + 80, ly + 26]; }
  else if (f === 'demonkeep') { blackSpire(L, lx, ly + 10, 1, S, P, wins, R, true); blackSpire(L, lx - 40, ly + 12, 0.8, S, P, wins, R, true); blackSpire(L, lx + 34, ly + 12, 0.7, S, P, wins, R, true); block = [lx - 60, lx + 60, ly + 14]; }
  const E = e.era, eg = { top, cx, span, depth, z };
  if (E) eraBack(L, e, E, eg);
  if (D.culture === 'beast') { herd(L, cx - span * 0.95, top(cx - span * 0.95) + 30, 14, 190, S, R); herd(L, cx + span * 0.9, top(cx + span * 0.9) + 44, 8, 120, S, R); }
  if ((f === 'ruins' || f === 'ruinpalace') && D.culture !== 'demon') { ruinArch(L, lx + (f === 'ruinpalace' ? -150 : 0), ly + 26, f === 'ruinpalace' ? 1.3 : 1.7, S, P, wins, R, { glow: D.culture === 'lost' ? '#b8e8c8' : null }); if (!block) block = [lx - 130, lx + 130, ly + 34]; }
  // 집
  const hs = [];
  for (let i = 0, tries = 0; i < D.houses && tries < D.houses * 4; tries++) {
    const t = R(), x = cx + (R() - 0.5) * span * (0.78 + 0.22 * t), y = top(x) + 8 + t * depth;
    if (block && x > block[0] && x < block[1] && y < block[2]) continue;
    if (o.keepOut && o.keepOut(x, y)) continue;
    hs.push({ x, y, s: (0.6 + t * 0.62) * z, i }); i++;
  }
  hs.sort((a, b) => a.y - b.y);
  const midH = hs[hs.length >> 1];
  // 세월이 쌓이면 고장 가장자리에 집이 는다. 따로 쓰는 씨앗으로 놓아, 본래 집들의 자리와 생김은 그대로다
  let e2 = e;
  if (E?.grow > 0) {
    const R2 = rng(D.seed * 13 + 5), n = Math.round(D.houses * E.grow); e2 = { ...e, R: R2 };
    for (let i = 0, tries = 0; i < n && tries < n * 5; tries++) {
      const t = R2(), side = R2() < 0.5 ? -1 : 1, x = cx + side * span * (0.4 + R2() * 0.3), y = top(x) + 8 + (0.25 + 0.75 * t) * depth;
      if (block && x > block[0] && x < block[1] && y < block[2]) continue;
      if (o.keepOut && o.keepOut(x, y)) continue;
      hs.push({ x, y, s: (0.6 + (0.25 + 0.75 * t) * 0.62) * z, i: 200 + i, extra: true }); i++;
    }
    hs.sort((a, b) => a.y - b.y);
  }
  hs.forEach((hh) => {
    if (hh.extra) return dwelling(L, e2, hh.x, hh.y, hh.s, hh.i);
    if (hh === midH) { // 마을 한가운데에 서는 건물
      const mx = cx - span * 0.08, my = top(mx) + 12 + depth * 0.45, s = 0.95 * z;
      if (human) e.churchAt = [mx, my, f === 'church' || f === 'windmill' || D.size === 'hamlet' || D.size === 'village' ? s * (D.size === 'hamlet' ? 0.9 : 1.15) : f === 'manor' ? 0.8 * z : 1.2 * z];
      if (f === 'church' || f === 'windmill' || (human && (D.size === 'hamlet' || D.size === 'village'))) church(L, mx, my, s * (D.size === 'hamlet' ? 0.9 : 1.15), st, S, P, wins, smoke);
      else if (f === 'manor') church(L, mx, my, 0.8 * z, st, S, P, wins, smoke);
      else if (human && f !== 'cathedral' && D.size !== 'ruin' && D.size !== 'fort') church(L, mx, my, 1.2 * z, st, S, P, wins, smoke);
      else if (D.culture === 'beast') { totem(L, mx, my, 1.5, S); wins.push([mx + 20, my - 8, 8, 8, 77, '#ff8a3a', true]); }
    }
    dwelling(L, e, hh.x, hh.y, hh.s, hh.i);
    if (!o.noTrees && R() < 0.22) plant(L, e, hh.x + (R() - 0.5) * 50, hh.y + 3, (6 + R() * 4) * hh.s);
  });
  smokeUp(L, e);
  const gate = cx + (o.gate ?? -span * 0.12), wy = (x) => top(x) + depth + 12 + Math.abs(x - cx) * -0.03;
  if (D.wall && D.culture !== 'elf' && f !== 'bastion' && f !== 'fortress') {
    const stone = D.white ? '#dcd7ca' : D.culture === 'demon' ? '#2e262a' : D.culture === 'beast' ? '#5a4634' : st.stone ?? '#a59a86', x0 = cx - span * 0.56, x1 = cx + span * 0.56;
    wallRun(L, x0, x1, wy, { stone, h: D.size === 'capital' ? 19 : 15, cap: D.white ? '#3e5a8a' : st.cap ?? '#4a3a30', glow: st.glow, towers: [x0, x0 + (gate - x0) * 0.5, gate + (x1 - gate) * 0.5, x1], gate }, S, P, wins);
  }
  if (E) eraFront(L, e, E, { ...eg, gate, wy, walled: !!D.wall });
  return [gate, wy(gate) + 4];
}
function frame(L, e, fg, o = {}) {
  // 그림 양 끝을 잡아 주는 가까운 나무와 바위
  const { D, P, S, R } = e;
  if (D.biome === 'mountain' || P.blight || D.biome === 'cold') { rock(L, 150, fg(150) + 46, 70, 50, P, S, R); rock(L, 1090, fg(1090) + 60, 60, 40, P, S, R); }
  plant(L, e, 66, H + 14, o.r ?? 60, { big: true });
  plant(L, e, 1152, H + 30, (o.r ?? 60) * 0.86, { big: true });
  if (!o.sparse) { plant(L, e, 1042, fg(1042) + 30, 21); plant(L, e, 318, fg(318) + 32, 13); plant(L, e, 292, fg(292) + 42, 10); }
}

/* ---------- 구도 ---------- */
const LAYOUTS = {
  // 트인 땅: 밭이 깔린 들, 메마른 땅, 늪, 병든 땅
  open(L, e) {
    const { D, P, S, R, q, month } = e, b = D.biome;
    const farm = STYLE[D.culture] && !P.blight && b !== 'swamp' && D.size !== 'ruin' && D.size !== 'site';
    farRanges(L, e, D.id === 'ern' || D.id === 'gruental' ? 1 : P.blight ? 1.15 : b === 'cold' ? 1.1 : 0.55 + (q % 5) * 0.09);
    if (P.dry) dunes(L, HZ + 14, P, S, q, { amp: 18, n: 3, gap: 10, haze: 0.4 }); else farHills(L, e, { wood: P.blight ? 2 : b === 'dry' ? 0.66 : 0.52 });
    const cx = 660 + (q % 7) * 8; // 46단계: 760→660, 폰에서 보이는 가운데 60% 안으로
    const ground = (x) => 284 - fbm1(x / 260 + q, 21, 3) * 44 - sbump(x, cx, 290) * 22 - (D.feature === 'windmill' || D.feature === 'manor' ? sbump(x, 232, 150) * 24 : 0) - (D.mount ? sbump(x, cx + 90, 120) * 20 : 0);
    hillBand(L, ground, P.hill, S, { seed: 21, depth: 130 });
    const span = SPAN[D.size] ?? 300, inTown = (x, y) => Math.abs(x - cx) < span * 0.6 && y < ground(x) + 112;
    if (farm && !P.dry) fields(L, ground, P, S, R, { skip: inTown, vines: D.vines });
    else if (farm) { fields(L, ground, P, S, R, { skip: (x, y) => inTown(x, y) || Math.abs(x - cx) > span * 1.1, depth: 70 }); for (let i = 0; i < 26; i++) { const x = R() * W, y = ground(x) + 14 + R() * 100; if (inTown(x, y)) continue; if (R() < 0.4) rock(L, x, y, 6 + R() * 10, 4 + R() * 6, P, S, R); else if (R() < 0.3 && Math.abs(x - cx) < span) palm(L, x, y, 26 + R() * 14, P, S, R); else plant(L, e, x, y, 4 + R() * 4); } }
    else { // 밭이 없는 땅: 덤불과 바위, 드문 나무
      for (let i = 0; i < 46; i++) { const x = R() * W, y = ground(x) + 10 + R() * 110; if (inTown(x, y)) continue; if (R() < 0.3) rock(L, x, y, 6 + R() * 12, 4 + R() * 8, P, S, R); else if (b === 'swamp') reedClump(L, x, y, 10 + R() * 8, P, R); else plant(L, e, x, y, 5 + R() * 7); }
    }
    if (b === 'swamp') for (let i = 0; i < 9; i++) { const x = R() * W, y = 300 + R() * 80, rx = 50 + R() * 110; water(L, (xx) => y - 7 * Math.sqrt(Math.max(0, 1 - ((xx - x) / rx) ** 2)), (xx) => y + 7 * Math.sqrt(Math.max(0, 1 - ((xx - x) / rx) ** 2)), P, S, R, { x0: x - rx, x1: x + rx, y0: y - 8, y1: y + 8 }); }
    if (D.river) river(L, e);
    if (D.river && e.era?.bridge !== undefined) ironBridge(L, 380, 361, 46, e);
    if (D.feature === 'windmill') windmill(L, 232, ground(232) + 8, 1.5, month, S, P);
    if (D.feature === 'manor') manor(L, 236, ground(236) + 10, 1.3, e.st, S, P, e.wins, e.smoke);
    if (D.feature === 'endless') endlessTower(L, cx - 250, ground(cx - 250) + 20, 1, S, P);
    if (D.feature === 'dungeon') { const x = cx - 40, y = ground(x) + 60; rock(L, x, y, 60, 44, P, S, R); L.fillStyle = '#120e0c'; L.beginPath(); L.moveTo(x - 14, y); L.lineTo(x - 14, y - 16); L.arc(x, y - 16, 14, Math.PI, 0); L.lineTo(x + 14, y); L.closePath(); L.fill(); e.wins.push([x - 8, y - 14, 16, 12, 5, P.blight ? '#ff5a40' : '#9ad0ff', true]); }
    const [gx, gy] = settle(L, e, ground, cx);
    const fg = (x) => 396 - fbm1(x / 200 + q, 31, 3) * 30 + sbump(x, 640, 300) * 16;
    foreground(L, fg, P, S, R, { month });
    road(L, e, 0, gx, Math.max(gy, fg(gx) - 6));
    if (farm && q % 3) { const f0 = 300 + (q % 5) * 70; fence(L, fg, f0, f0 + 150 + (q % 4) * 50); }
    eraRoad(L, e, fg, gx, Math.max(gy, fg(gx) - 6), 0);
    frame(L, e, fg);
  },
  // 바닷가: 왼쪽은 바다, 오른쪽 뭍에 항구
  coast(L, e) {
    const { D, P, S, R, q, month } = e;
    const landK = (x) => clamp((x - 250) / 430); const sm = (x) => { const t = landK(x); return t * t * (3 - 2 * t); };
    farRanges(L, e, 0.75, { env: (x) => 0.12 + sm(x) * 0.9 });
    // 먼 곶
    fillCurve(L, (x) => HZ - 3 - sbump(x, 120, 170) * 10 - fbm1(x / 40, 7) * 3, mixh(P.far, S.haze, 0.6), HZ + 2, 0, 330);
    water(L, () => HZ, () => 410, P, S, R, { y0: HZ, y1: 410 });
    for (const [x, y, s, fl] of [[250 - (q % 5) * 20, HZ + 22, 0.5, false], [118, HZ + 60, 0.85, true]]) ship(L, x, y, s, S, fl);
    // 큰 항구 (38단계): 닻 내린 배가 줄지어 있고, 작은 거룻배가 오간다
    if (D.size === 'city' || D.size === 'capital') {
      for (const [x, y, s, fl] of [[330, HZ + 30, 0.62, true], [205, HZ + 40, 0.7, false], [290, HZ + 74, 1.05, false], [60, HZ + 104, 1.3, true]]) ship(L, x, y, s, S, fl);
      for (let i = 0; i < 6; i++) { const x = 120 + R() * 300, y = HZ + 50 + R() * 90, s = 0.5 + (y - HZ) / 200; poly(L, [[x - 9 * s, y - 2 * s], [x + 9 * s, y - 2 * s], [x + 6 * s, y + 1.5 * s], [x - 6 * s, y + 1.5 * s]], '#3a2a1c'); }
    }
    const cx = 730; // 46단계: 800→730
    const ground = (x) => lerp(418, 284, sm(x)) - fbm1(x / 260 + q, 21, 3) * 30 * sm(x) - sbump(x, cx, 280) * 16;
    const h1 = (x) => lerp(HZ + 40, HZ + 6, sm(x + 80)) - fbm1(x / 220 + q, 11, 3) * 30 * sm(x + 80);
    hillBand(L, (x) => h1(x) + Math.pow(1 - sm(x + 60), 1.6) * 240, mixh(P.hill, S.haze, 0.45), S, { seed: 11, depth: 40, tex: 10 });
    treeline(L, h1, P, S, { haze: 0.5, x0: 560 });
    hillBand(L, ground, P.hill, S, { seed: 21, depth: 130 });
    // 모래톱과 물거품
    L.strokeStyle = rgba(P.snow ? '#eef0f0' : '#d8cca4', 0.75); L.lineWidth = 4; L.beginPath(); trace(L, (x) => ground(x) + 2, 250, 470, 6); L.stroke();
    L.strokeStyle = 'rgba(240,240,232,.5)'; L.lineWidth = 1.4; L.beginPath(); trace(L, (x) => ground(x) + 7 + Math.sin(x / 9) * 1.5, 240, 420, 4); L.stroke();
    const span = SPAN[D.size] ?? 300, inTown = (x, y) => Math.abs(x - cx) < span * 0.62 && y < ground(x) + 112;
    if (STYLE[D.culture] && !P.blight && D.biome !== 'cold') fields(L, (x) => (x < 560 ? H : ground(x)), P, S, R, { skip: (x, y) => inTown(x, y) || x < 600, depth: 110 });
    if (D.feature === 'endless') endlessTower(L, cx + 250, ground(cx + 250) + 16, 1, S, P);
    lighthouse(L, 452, ground(452) + 6, 0.9, S, P, e.wins);
    const [gx, gy] = settle(L, e, ground, cx, { gate: -span * 0.2 });
    docks(L, 372, 520, ground(440) + 26, 1, S, P);
    if (e.era?.hull !== undefined) shipyard(L, 566, ground(566) + 26, 0.8, e);
    if (e.era?.crane !== undefined) crane(L, 508, ground(440) + 24, 0.95, e);
    ship(L, 372, ground(440) + 40, 1.25, S, false);
    if (e.era?.steam !== undefined) steamship(L, 196, HZ + 42, 0.5, e, false);
    const fg = (x) => 404 - fbm1(x / 200 + q, 31, 3) * 26 + sbump(x, 240, 260) * 34;
    foreground(L, (x) => (x < 250 ? fg(x) + (250 - x) * 0.5 : fg(x)), P, S, R, { month });
    road(L, e, 0, gx, Math.max(gy, fg(gx) - 6));
    eraRoad(L, e, fg, gx, Math.max(gy, fg(gx) - 6), 470);
    frame(L, e, fg, { sparse: true });
  },
  // 섬: 사방이 바다
  island(L, e) {
    const { D, P, S, R, q, month } = e;
    fillCurve(L, (x) => HZ - 4 - sbump(x, 980, 190) * 20 - sbump(x, 240, 150) * 12 - fbm1(x / 50, 7) * 3, mixh(P.far, S.haze, 0.55), HZ + 2);
    water(L, () => HZ, () => H, P, S, R);
    for (const [x, y, s, fl] of [[160, HZ + 26, 0.55, false], [1040, HZ + 46, 0.8, true], [300, HZ + 92, 1.2, false]]) ship(L, x, y, s, S, fl);
    const cx = 700, ground = (x) => 420 - sbump(x, cx, 470) * 128 - fbm1(x / 200 + q, 21, 3) * 18;
    hillBand(L, ground, P.hill, S, { seed: 21, depth: 100 });
    L.strokeStyle = rgba('#e0d4a8', 0.85); L.lineWidth = 5; L.beginPath(); trace(L, (x) => ground(x) + 2, 240, 1160, 6); L.stroke();
    forestMass(L, (x) => ground(x) + 8, 26, P, S, R, { x0: 480, x1: 940, size: 8, haze: 0.1, pine: 0 });
    for (let i = 0; i < 14; i++) { const x = 330 + R() * 760; palm(L, x, ground(x) + 14 + R() * 30, 30 + R() * 22, P, S, R); }
    if (D.size === 'fort') fortress(L, cx + 60, ground(cx + 60) + 30, 0.9, e.st, S, P, e.wins);
    settle(L, e, ground, cx, { off: 30, depth: 56, noTrees: true });
    lighthouse(L, 1010, ground(1010) + 14, 0.8, S, P, e.wins);
    docks(L, 420, 640, 432, 1.1, S, P);
    if (e.era?.crane !== undefined) crane(L, 630, 430, 1, e);
    if (e.era?.steam !== undefined) steamship(L, 860, HZ + 64, 0.6, e, true);
    const fg = (x) => 452 - sbump(x, 80, 240) * 50 - sbump(x, 1160, 200) * 40;
    foreground(L, fg, P, S, R, { month, flowers: false, color: mixh(P.grass, '#cfc294', 0.55) });
    palm(L, 70, H + 6, 150, P, S, R); palm(L, 1140, H + 10, 120, P, S, R);
  },
  // 호숫가의 마법 도시
  lake(L, e) {
    const { D, P, S, R, q, month } = e;
    farRanges(L, e, 0.7);
    const h1 = farHills(L, e);
    const shoreFar = (x) => 268 - fbm1(x / 200 + q, 21, 3) * 10;
    hillBand(L, shoreFar, mixh(P.hill, S.haze, 0.2), S, { seed: 21, depth: 40, tex: 10 });
    const cx = 640;
    mageTowers(L, cx, 286, 1, e.st, S, P, e.wins);
    for (let i = 0; i < 26; i++) { const x = 180 + R() * 900; plant(L, e, x, shoreFar(x) + 14 + R() * 8, 5 + R() * 4); }
    for (let i = 0; i < 20; i++) { const x = 250 + R() * 780, s = 0.55 + R() * 0.15; dwelling(L, e, x, 288 + R() * 6, s, i); }
    // 호수와 탑 그림자
    const top = (x) => 292 + (1 - sbump(x, cx, 520)) * 40, bot = (x) => 372 - (1 - sbump(x, cx, 560)) * 30;
    water(L, top, bot, P, S, R, { x0: 120, x1: 1160, y0: 290, y1: 374 });
    if (!P.frozen) for (const [dx, w, h] of [[-176, 13, 30], [-112, 16, 44], [-56, 14, 36], [0, 22, 62], [60, 15, 40], [118, 17, 50], [176, 13, 32]]) { L.fillStyle = rgba('#3a4460', 0.16); L.fillRect(cx + dx - w / 2, 294, w, h); }
    const ground = (x) => 366 - fbm1(x / 260 + q, 23, 3) * 12 + (1 - sbump(x, cx, 620)) * -30;
    hillBand(L, ground, P.hill, S, { seed: 23, depth: 80 });
    settle(L, e, (x) => ground(x) - 6, 830, { span: 330, depth: 46, lx: 0 }); // 46단계: 890→830
    const fg = (x) => 418 - fbm1(x / 200 + q, 31, 3) * 22 + sbump(x, 520, 300) * 14;
    foreground(L, fg, P, S, R, { month });
    for (let i = 0; i < 8; i++) reedClump(L, 380 + R() * 360, fg(500) + 6 + R() * 10, 16 + R() * 10, P, R);
    frame(L, e, fg, { sparse: true });
  },
  // 산속: 가까이 솟은 봉우리, 바위 비탈
  mountain(L, e) {
    const { D, P, S, R, q, month } = e;
    const b = (x) => 150 - ridged1(x / 190 + q, 15) * 150 - sbump(x, 900, 320) * 40;
    const a = (x) => 214 - ridged1(x / 140 + q * 2, 5) * 150 - sbump(x, 300, 300) * 50;
    mountains(L, b, { color: P.far, S, haze: 0.56, snowLine: P.snowLine + 40, seed: 15, reach: 2.2, base: HZ + 40 });
    mountains(L, a, { color: P.far, S, haze: 0.3, snowLine: P.snowLine + 40, seed: 5, reach: 2, base: HZ + 60 });
    const cx = 680; // 46단계: 760→680
    const mid = (x) => 262 - ridged1(x / 110 + q, 25, 4) * 70 - sbump(x, cx + 40, 260) * 46;
    mountains(L, mid, { color: mixh(P.far, P.rock, 0.5), S, haze: 0.1, snowLine: P.snow ? HZ + 80 : P.snowLine + 26, seed: 25, reach: 1.4, base: 330 });
    const ground = (x) => 312 - fbm1(x / 220 + q, 21, 3) * 30 - sbump(x, cx, 300) * 12;
    hillBand(L, ground, mixh(P.hill, P.rock, 0.45), S, { seed: 21, depth: 110 });
    forestMass(L, (x) => ground(x) + 4, 22, P, S, R, { size: 7, haze: 0.2, pine: 0.9, gap: (x) => Math.abs(x - cx) < 210 || fbm1(x / 100 + q, 43) < 0.42 });
    for (let i = 0; i < 26; i++) { const x = R() * W, y = ground(x) + 30 + R() * 80; if (Math.abs(x - cx) < 200) continue; R() < 0.5 ? rock(L, x, y, 8 + R() * 16, 6 + R() * 12, P, S, R) : conifer(L, x, y, 24 + R() * 20, P, S, R); }
    if (D.culture === 'dwarf' && (D.size === 'capital' || D.size === 'city' || D.size === 'village')) dwarfFacade(L, cx + 40, ground(cx + 40) + 14, D.size === 'capital' ? 1.05 : 0.72, S, P, e.wins, R);
    if (D.culture === 'dwarf') dwarfGate(L, cx + 40, ground(cx + 40) + 14, D.size === 'capital' ? 1.05 : 0.72, S, P, e.wins);
    if (e.era?.mine !== undefined) headframe(L, cx - 290, ground(cx - 290) + 34, 1.1, e);
    const [gx, gy] = settle(L, e, ground, cx, { span: Math.min(SPAN[D.size] ?? 300, 380), keepOut: D.culture === 'dwarf' ? (x, y) => Math.abs(x - cx - 40) < 56 && y < ground(x) + 30 : null });
    const fg = (x) => 404 - fbm1(x / 200 + q, 31, 3) * 30 + sbump(x, 640, 300) * 12;
    foreground(L, fg, P, S, R, { month, color: mixh(P.grass, P.rock, 0.3) });
    road(L, e, 0, gx, Math.max(gy, fg(gx) - 6));
    frame(L, e, fg);
  },
  // 깊은 숲: 겹겹의 숲 능선, 빈터의 마을
  forest(L, e) {
    const { D, P, S, R, q, month } = e, elf = D.culture === 'elf';
    farRanges(L, e, 0.5);
    for (let k = 0; k < 3; k++) {
      const fn = (x) => HZ - 14 + k * 20 - fbm1(x / (200 - k * 30) + q + k * 7, 11 + k, 3) * (40 - k * 4);
      hillBand(L, fn, mixh(P.hill, S.haze, 0.5 - k * 0.14), S, { seed: 11 + k, depth: 40, tex: 8 });
      forestMass(L, (x) => fn(x) + 2, 22, P, S, R, { size: 6 + k * 2, haze: 0.5 - k * 0.14, pine: elf ? 0.15 : 0.5 });
      mist(L, HZ + 14 + k * 20, 16, S.haze, 0.3);
    }
    const cx = 680; // 46단계: 740→680
    if (D.id === 'iela') worldTree(L, cx + 120, 300, 1, S, P, R);
    const ground = (x) => 296 - fbm1(x / 240 + q, 21, 3) * 30 - sbump(x, cx, 300) * 10;
    hillBand(L, ground, P.hill, S, { seed: 21, depth: 120 });
    const span = SPAN[D.size] ?? 300;
    forestMass(L, (x) => ground(x) + 4, 90, P, S, R, { size: 13, haze: 0.08, pine: elf ? 0.1 : 0.45, gap: (x, y) => Math.abs(x - cx) < span * (elf ? 0.3 : 0.62) && y > ground(x) - 4 });
    if (D.feature === 'dungeon') { const x = cx - 40, y = ground(x) + 70; rock(L, x, y, 56, 40, P, S, R); L.fillStyle = '#120e0c'; L.beginPath(); L.moveTo(x - 13, y); L.lineTo(x - 13, y - 14); L.arc(x, y - 14, 13, Math.PI, 0); L.lineTo(x + 13, y); L.closePath(); L.fill(); e.wins.push([x - 7, y - 12, 14, 10, 5, '#9ad0ff', true]); }
    if (elf && D.size !== 'site') { // 큰 나무 집들과 줄다리
      const n = D.size === 'capital' ? 5 : D.size === 'village' ? 3 : 2, at = [];
      for (let i = 0; i < n; i++) { const x = cx + (i - (n - 1) / 2) * (span * 0.9 / n) * 1.5 + (R() - 0.5) * 30; at.push(elfGreatTree(L, x, ground(x) + 22 + R() * 14, D.size === 'capital' ? 1 : 0.85, S, P, e.wins, R)); }
      for (let i = 0; i < at.length - 1; i++) ropeBridge(L, at[i], at[i + 1], e.wins);
    }
    const [gx, gy] = settle(L, e, ground, cx, { noTrees: false });
    const fg = (x) => 400 - fbm1(x / 200 + q, 31, 3) * 30 + sbump(x, 640, 300) * 14;
    foreground(L, fg, P, S, R, { month, color: dark(P.grass, 0.12) });
    if (!elf) road(L, e, 0, gx, Math.max(gy, fg(gx) - 6));
    // 가까운 큰 나무 줄기가 그림을 감싼다
    for (const [x, w] of [[40, 54], [150, 26], [1150, 48], [1060, 22]]) { poly(L, [[x - w / 2, H], [x - w * 0.36, -10], [x + w * 0.36, -10], [x + w / 2, H]], '#2a2218'); poly(L, S.dir > 0 ? [[x + w * 0.2, H], [x + w * 0.16, -10], [x + w * 0.36, -10], [x + w / 2, H]] : [[x - w * 0.2, H], [x - w * 0.16, -10], [x - w * 0.36, -10], [x - w / 2, H]], rgba(light('#4a3c2c', 0.3), 0.3)); }
    if (P.leaf || P.autumn) for (const [dk, n, rr] of [[0.6, 70, 22], [0.42, 80, 15], [0.22, 70, 9], [0, 40, 5]]) for (let i = 0; i < n; i++) { const x = (i % 2 ? -20 : 950) + R() * 270, y = R() * R() * 150 - 10, c = P.autumn ? ['#b8742e', '#9a4a2a', '#c49a3a'][i % 3] : P.leaf; L.fillStyle = dark(c, dk); L.beginPath(); L.arc(x + (0.6 - dk) * S.dir * 10, y, rr * (0.6 + R() * 0.8), 0, 6.3); L.fill(); }
  },
};

// 길 위의 쇠수레, 그리고 쇠수레 길 (가까운 풀밭을 가로지른다). 추운 북쪽은 길이 거기까지 닿은 뒤에만.
function eraRoad(L, e, fg, gx, gy, x0) {
  const E = e.era; if (!E) return;
  if (E.cart !== undefined) ironcart(L, gx + 16, gy + 20, 1.1, e);
  if (E.rail === undefined || (e.D.biome === 'cold' && E.northrail === undefined)) return;
  const base = Math.max(fg(200), fg(500), fg(800), fg(1100)) + 8, yAt = (x) => base + Math.sin(x / 330 + 1) * 3;
  rails(L, e, yAt, x0, W);
  station(L, gx + 210, yAt(gx + 210) - 3, 1.5, e);
  if (hash(e.k, 14) < 0.55) train(L, x0 + 150 + hash(e.k, 15) * 260, yAt, 1.5, hash(e.k, 16) < 0.5 ? 1 : -1, e, 3);
}
function river(L, e) {
  const { P, S, R } = e, pts = [];
  for (let t = 0; t <= 1.0001; t += 0.02) pts.push([-30 + t * 700 + Math.sin(t * 5) * 60, 300 + t * t * 200, 2 + t * t * 38]);
  const edge = (sgn) => (x) => { let best = pts[0]; for (const p of pts) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; return best[1] + sgn * best[2] / 2; };
  L.save(); L.beginPath();
  pts.forEach(([x, y, w], i) => (i ? L.lineTo(x, y - w / 2) : L.moveTo(x, y - w / 2)));
  for (let i = pts.length - 1; i >= 0; i--) L.lineTo(pts[i][0], pts[i][1] + pts[i][2] / 2);
  L.closePath(); L.strokeStyle = rgba(dark(P.grass2, 0.4), 0.6); L.lineWidth = 2.4; L.stroke(); L.clip();
  L.fillStyle = vgrad(L, 300, H, [[0, mixh(P.water, S.low, 0.55)], [1, P.frozen ? '#c8d4da' : dark(P.water, 0.1)]]); L.fillRect(0, 290, 720, 200);
  if (!P.frozen) for (let i = 0; i < 60; i++) { const [x, y, w] = pts[Math.floor(R() * pts.length)]; L.strokeStyle = rgba(light(S.low, 0.3), 0.14 + R() * 0.26); L.lineWidth = 1; const yy = y + (R() - 0.5) * w * 0.7; L.beginPath(); L.moveTo(x - w * 0.4, yy); L.lineTo(x + w * 0.3, yy); L.stroke(); }
  L.restore();
  return edge;
}
