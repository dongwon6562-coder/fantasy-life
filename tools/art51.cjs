// 51단계 도우미4: 풍경·실내·삽화를 손대기 전과 지금, 폰 폭(390) 배율 2로 나란히 찍는다.
//   node tools/art51.cjs <out-dir> [scene|interior|vignette|all]
//   손대기 전 코드는 dist/_old51/src (손대기 전 src 복사). 없으면 지금 것만 찍는다.
//   VL='[["wedding",null],["fire","riot"]]' 로 삽화 판을 고를 수 있다.
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const { chromium } = require('playwright');
const out = process.argv[2] || 'dist/art51';
const what = process.argv[3] || 'all';
fs.mkdirSync(out, { recursive: true });
const hasOld = fs.existsSync('dist/_old51/src/art/scene.js');
fs.writeFileSync('dist/_art51_entry.js', `
import '../src/content.js';
import { sceneImage } from '../src/art/scene.js';
import { interiorImage } from '../src/art/sceneInterior.js';
import { vignetteImage } from '../src/art/vignette.js';
${hasOld ? `import { sceneImage as oScene } from './_old51/src/art/scene.js';
import { interiorImage as oInterior } from './_old51/src/art/sceneInterior.js';
import { vignetteImage as oVignette } from './_old51/src/art/vignette.js';` : 'const oScene = null, oInterior = null, oVignette = null;'}
globalThis.FL_DATA_URLS = true;
window.A = { now: { scene: sceneImage, interior: interiorImage, vignette: vignetteImage }, old: ${hasOld ? '{ scene: oScene, interior: oInterior, vignette: oVignette }' : 'null'} };`);
execSync('npx --yes esbuild@0.24.0 dist/_art51_entry.js --bundle --format=iife --outfile=dist/_art51_bundle.js --log-level=error', { stdio: 'inherit' });

const SCENES = [
  ['ern', 505, 7], ['ern', 505, 10], ['ern', 505, 1], ['ern', 505, 4],
  ['harfen', 506, 5], ['leocast', 508, 12], ['barka', 516, 6], ['verden', 505, 9],
  ['graubel', 505, 12], ['silverleaf', 524, 9], ['hammer', 505, 2], ['portel', 505, 11],
  ['solaris', 506, 9], ['serenia', 505, 3], ['eisen', 507, 8], ['bonehill', 505, 6],
];
const INTERIORS = [['hearth', 'ern', 1], ['hearth', 'harfen', 7], ['tavern', 'harfen', 10], ['tavern', 'barka', 4], ['hall', 'leocast', 6], ['temple', 'leocast', 12], ['workshop', 'eisen', 3], ['workshop', 'ern', 8]];
const VIG = process.env.VL ? JSON.parse(process.env.VL) : [
  ['wedding', null], ['funeral', null], ['birth', null], ['muster', null], ['square', null], ['plague', null],
  ['famine', null], ['fire', null], ['prison', null], ['voyage', null], ['court', null], ['festival', null],
  ['chapel', null], ['road', null], ['bedside', null], ['ritual', null],
];

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.setContent('<html><body style="margin:0;background:#1b1611;color:#d8c9a8;font:11px sans-serif"><div id="g"></div></body></html>');
  await page.addScriptTag({ content: fs.readFileSync('dist/_art51_bundle.js', 'utf8') });
  const shoot = async (name) => { await new Promise((r) => setTimeout(r, 250)); const h = await page.evaluate(() => document.body.scrollHeight); await page.setViewportSize({ width: 390, height: h }); await page.screenshot({ path: `${out}/${name}.png` }); await page.setViewportSize({ width: 390, height: 800 }); };
  const run = async (kind, list, per, h) => {
    for (let part = 0; part < Math.ceil(list.length / per); part++) {
      const t = await page.evaluate(({ kind, picks, h }) => {
        const g = document.getElementById('g'); g.innerHTML = '';
        const times = { old: 0, now: 0 };
        for (const a of picks) {
          for (const tag of ['old', 'now']) {
            const fn = window.A[tag]?.[kind]; if (!fn) continue;
            const arg = kind === 'scene' ? { place: a[0], year: a[1], month: a[2] } : kind === 'interior' ? { kind: a[0], place: a[1], month: a[2], year: 505 } : { plate: a[0], variant: a[1] ?? undefined, place: a[2] ?? 'ern', month: a[3] ?? 6, year: 505 };
            const t0 = performance.now(); const url = fn(arg); times[tag] += performance.now() - t0;
            g.innerHTML += `<figure style="margin:0 0 4px"><img style="width:390px;height:${h}px;object-fit:cover;display:block" src="${url}"><figcaption style="padding:2px 6px">${tag === 'old' ? '예전' : '지금'} · ${a.filter((x) => x != null).join(' ')}</figcaption></figure>`;
          }
        }
        return times;
      }, { kind, picks: list.slice(part * per, part * per + per), h });
      await shoot(`${kind}-${part + 1}`);
      console.log(`${kind}-${part + 1}`, 'ms', Math.round(t.old), '→', Math.round(t.now));
    }
  };
  if (what === 'all' || what === 'scene') await run('scene', SCENES, 4, 250);
  if (what === 'all' || what === 'interior') await run('interior', INTERIORS, 4, 250);
  if (what === 'all' || what === 'vignette') await run('vignette', VIG, 4, 220);
  if (errs.length) console.log('errors', errs.slice(0, 5));
  await b.close();
})();
