// 풍경 견본 한 장(여러 풍경을 격자로)을 PNG로 찍는다. 38단계 예전·지금 비교용.
//   node tools/scene-sheet.cjs out.png [cols] [w]   (고를 풍경은 SHEET 환경 변수 JSON 또는 아래 기본)
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const { chromium } = require('playwright');
const out = process.argv[2] || 'scene-sheet.png', cols = +(process.argv[3] || 3), cw = +(process.argv[4] || 420);
const picks = process.env.SHEET ? JSON.parse(process.env.SHEET) : [
  ['ern', 505, 7], ['ern', 505, 10, null, 'dusk'], ['harfen', 505, 4], ['leocast', 505, 10], ['barka', 505, 6], ['graubel', 505, 12],
  ['silverleaf', 505, 10], ['hammer', 505, 1], ['fur', 505, 6], ['solaris', 506, 9], ['serenia', 505, 7], ['ern', 501, 5],
];
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/_sheet_entry.js', `import { sceneImage, conditionText } from '../src/art/scene.js';
import * as IN from '../src/art/sceneInterior.js';
globalThis.FL_DATA_URLS = true;
window.S = { sceneImage, conditionText, IN };`);
if (!fs.existsSync('src/art/sceneInterior.js')) fs.writeFileSync('dist/_sheet_entry.js', fs.readFileSync('dist/_sheet_entry.js', 'utf8').replace("import * as IN from '../src/art/sceneInterior.js';", 'const IN = {};'));
execSync('npx --yes esbuild@0.24.0 dist/_sheet_entry.js --bundle --format=iife --outfile=dist/_sheet_bundle.js', { stdio: 'inherit' });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: cols * (cw + 8) + 8, height: 600 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.setContent(`<html><body style="margin:0;background:#17130f;color:#cbb;font:12px sans-serif"><div id="g" style="display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:8px;padding:8px"></div></body></html>`);
  await p.addScriptTag({ content: fs.readFileSync('dist/_sheet_bundle.js', 'utf8') });
  const t = await p.evaluate(async (picks) => {
    globalThis.FL_SCENE_DEBUG = true;
    const times = [];
    for (const [place, year, month, calamity, tod, interior] of picks) {
      const t0 = performance.now();
      let url, cap;
      if (interior) { url = window.S.IN.interiorImage({ kind: interior, year, month, place }); cap = interior + ' · ' + place; }
      else { url = window.S.sceneImage({ place, year, month, calamity: calamity || null, tod: tod || undefined }); cap = place + ' ' + month + '월 · ' + window.S.conditionText(year, month) + (calamity ? ' · ' + calamity : ''); }
      times.push(Math.round(performance.now() - t0));
      const f = document.createElement('figure'); f.style.margin = 0;
      f.innerHTML = '<img style="width:100%;display:block" src="' + url + '"><figcaption>' + cap + ' (' + times.at(-1) + 'ms)</figcaption>';
      document.getElementById('g').appendChild(f);
    }
    await new Promise((r) => setTimeout(r, 300));
    return times;
  }, picks);
  const h = await p.evaluate(() => document.body.scrollHeight);
  await p.setViewportSize({ width: cols * (cw + 8) + 8, height: h });
  await p.screenshot({ path: out });
  console.log('ms', t.join(' '), 'errors', errs);
  await b.close();
})();
