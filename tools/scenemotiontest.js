// 풍경·삽화 마무리와 움직임(src/art/scenePaint.js, sceneMotion.js) 점검. 실제 브라우저(Playwright)에서 그려 본다. 1분 안.
//   node tools/scenemotiontest.js        그리기·움직임·멈춤을 잰다
//   node tools/scenemotiontest.js shot   dist/scene-motion-*.png로 찍어 둔다 (눈으로 보기)
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const shot = process.argv.includes('shot');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
mkdirSync('dist', { recursive: true });
writeFileSync('dist/_motion_entry.js', `import { sceneImage } from '../src/art/scene.js';
import { vignetteImage } from '../src/art/vignette.js';
import { motionMeta, hasMotion } from '../src/art/sceneMotion.js';
window.SC = sceneImage; window.VG = vignetteImage; window.MM = motionMeta; window.HM = hasMotion;`);
execSync('npx --yes esbuild@0.24.0 dist/_motion_entry.js --bundle --format=iife --outfile=dist/_motion_bundle.js --log-level=error', { stdio: 'inherit' });
const js = readFileSync('dist/_motion_bundle.js', 'utf8');

const { chromium } = require('playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 420, height: 520 }, deviceScaleFactor: 1 });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.setContent(`<html class="motion"><head><style>body{margin:0;background:#111}.scene{position:relative;overflow:hidden}.scene img{display:block;width:100%;height:200px;object-fit:cover;object-position:55% 60%}.ev-art{height:150px;position:relative;overflow:hidden;margin-top:10px}.ev-art i{position:absolute;inset:0;background-size:cover}</style></head><body><div class="scene" id="s"></div><div class="ev-art"><i id="v"></i></div></body></html>`);
await p.addScriptTag({ content: js });

// 1. 그리기: 그림이 나오고, 너무 오래 걸리지 않고, 움직일 거리가 적힌다
const r1 = await p.evaluate(() => {
  const t0 = performance.now();
  const urls = [['ern', 505, 7], ['serenia', 505, 7], ['ern', 500, 1], ['leocast', 505, 10], ['graubel', 505, 12], ['saltmare', 505, 6]].map(([place, year, month]) => SC({ place, year, month }));
  const ms = (performance.now() - t0) / urls.length;
  return { ms, ok: urls.every((u) => u && (u.startsWith('blob:') || u.length > 1000)), metas: urls.map((u) => MM(u)) };
});
if (!r1.ok) fail('scene not drawn');
if (r1.ms > 600) fail('scene too slow', r1.ms);
if (r1.metas.some((m) => !m || !(m.w > 0) || !Array.isArray(m.wins) || !Array.isArray(m.smoke) || !Array.isArray(m.water))) fail('meta', JSON.stringify(r1.metas).slice(0, 300));
if (!r1.metas.some((m) => m.water.length)) fail('no water recorded on lake');
if (!r1.metas.some((m) => m.wins.length)) fail('no lit windows recorded');
console.log(`풍경 한 장 ${r1.ms.toFixed(0)}ms`);

// 2. 움직임: 비 오는 풍경과 삽화 위에 캔버스가 얹히고, 장면이 바뀐다
const put = (s, v) => p.evaluate(({ s, v }) => { const u = SC(s); document.getElementById('s').innerHTML = '<img src="' + u + '">'; const w = VG(v); document.getElementById('v').style.backgroundImage = 'url(' + w + ')'; return [u, w]; }, { s, v });
await put({ place: 'ern', year: 505, month: 7 }, { plate: 'fire', year: 505, month: 7 });
await p.waitForTimeout(600);
const n = await p.evaluate(() => document.querySelectorAll('canvas.fl-motion').length);
if (n !== 2) fail('overlay count', n);
const a = await p.screenshot(); await p.waitForTimeout(350); const c = await p.screenshot();
if (a.equals(c)) fail('nothing moves');
if (shot) { writeFileSync('dist/scene-motion-a.png', a); writeFileSync('dist/scene-motion-b.png', c); }
// 그림이 바뀌면 캔버스도 하나만 남는다
await put({ place: 'serenia', year: 505, month: 7 }, { plate: 'road', year: 500, month: 1 });
await p.waitForTimeout(400);
const n2 = await p.evaluate(() => document.querySelectorAll('canvas.fl-motion').length);
if (n2 !== 2) fail('overlay after swap', n2);

// 3. '화면 움직임 줄이기'면 멈추고 비운다, 다시 켜면 돈다
await p.evaluate(() => document.documentElement.classList.remove('motion'));
await p.waitForTimeout(300);
const blank = await p.evaluate(() => [...document.querySelectorAll('canvas.fl-motion')].every((cv) => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 40) if (d[i]) return false; return true; }));
if (!blank) fail('not cleared when motion off');
const s1 = await p.screenshot(); await p.waitForTimeout(300); const s2 = await p.screenshot();
if (!s1.equals(s2)) fail('still moving when motion off');
await p.evaluate(() => document.documentElement.classList.add('motion'));
await p.waitForTimeout(400);
const m1 = await p.screenshot(); await p.waitForTimeout(300); const m2 = await p.screenshot();
if (m1.equals(m2)) fail('did not resume');

// 4. 화면에서 빠지면 캔버스도 정리된다
await p.evaluate(() => { document.getElementById('s').innerHTML = ''; document.querySelector('.ev-art').remove(); });
await p.waitForTimeout(300);
const left = await p.evaluate(() => document.querySelectorAll('canvas.fl-motion').length);
if (left) fail('overlay left behind', left);

// 5. 맑은 한낮 바깥 그림은 얹을 것이 없으면 얹지 않는다
const none = await p.evaluate(() => HM({ kind: 'vig', weather: 'clear', tod: 'day', embers: false }));
if (none) fail('clear vignette has motion');

if (errors.length) fail('page errors', errors.slice(0, 3));
await b.close();
if (problems) { console.log(`scenemotiontest: ${problems} problems`); process.exit(1); }
console.log('OK');
