// 46단계 도우미2: 초상과 풍경 예전·지금을 폰 폭(390)으로 나란히 찍는다.
//   node tools/art46.cjs <out-dir> [portrait|scene|all]
//   예전 코드는 dist/_old46/src/art (손대기 전 src/art 복사). 없으면 지금 것만 찍는다.
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const { chromium } = require('playwright');
const out = process.argv[2] || 'dist/art46';
const what = process.argv[3] || 'all';
fs.mkdirSync(out, { recursive: true });
const hasOld = fs.existsSync('dist/_old46/src/art/portrait.js');
fs.writeFileSync('dist/_art46_entry.js', `
import { portrait } from '../src/art/portrait.js';
import { sceneImage } from '../src/art/scene.js';
${hasOld ? "import { portrait as oldPortrait } from './_old46/src/art/portrait.js';\nimport { sceneImage as oldScene } from './_old46/src/art/scene.js';" : 'const oldPortrait = null, oldScene = null;'}
globalThis.FL_DATA_URLS = true;
window.A = { portrait, sceneImage, oldPortrait, oldScene };`);
execSync('npx --yes esbuild@0.24.0 dist/_art46_entry.js --bundle --format=iife --outfile=dist/_art46_bundle.js --log-level=warning', { stdio: 'inherit' });

const P = (i, o = {}) => ({ id: i, name: '사람' + i, lastName: '성', sex: i % 2 ? 'm' : 'f', ageMonths: 12 * 30, job: 'farmer', alive: true, affection: 0, traits: [], ...o });
const LIFE = [8, 18, 30, 45, 60, 75].map((a) => [P(3, { job: a < 15 ? 'child' : 'smith', ageMonths: a * 12 }), `${a}살`]);
const LIFE_F = [8, 18, 30, 45, 60, 75].map((a) => [P(12, { job: a < 15 ? 'child' : 'merchant', ageMonths: a * 12 }), `${a}살`]);
const RACE = [['human', null], ['elf', null], ['half_elf', null], ['dwarf', null], ['beast', 'wolf'], ['beast', 'cat'], ['demon', null], ['half_demon', null]]
  .flatMap(([race, beast], k) => [0, 1].map((s) => [P(20 + k * 2 + s, { race, beast, ageMonths: (race === 'elf' ? 120 : race === 'dwarf' ? 70 : 30) * 12 }), `${race}${beast ? '/' + beast : ''}`]));
const JOBS = ['knight', 'priest', 'noble', 'mage', 'hunter', 'sailor'].map((job, k) => [P(40 + k, { job, ageMonths: (24 + k * 6) * 12 }), job]);
const SCENES = [
  ['ern', 505, 7], ['ern', 505, 10], ['ern', 505, 1], ['ern', 505, 8],
  ['leocast', 505, 10], ['leocast', 508, 12], ['harfen', 506, 5], ['barka', 516, 6],
  ['graubel', 505, 12], ['silverleaf', 524, 9], ['hammer', 505, 2], ['fur', 505, 8],
  ['solaris', 506, 9], ['serenia', 505, 3], ['portel', 505, 11], ['bonehill', 505, 6],
];

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.setContent('<html><body style="margin:0;background:#1b1611;color:#d8c9a8;font:11px sans-serif"><div id="g"></div></body></html>');
  await page.addScriptTag({ content: fs.readFileSync('dist/_art46_bundle.js', 'utf8') });
  const shoot = async (name) => { const h = await page.evaluate(() => document.body.scrollHeight); await page.setViewportSize({ width: 390, height: h }); await page.screenshot({ path: `${out}/${name}.png` }); await page.setViewportSize({ width: 390, height: 800 }); };
  if (what !== 'scene') {
    for (const [name, list, size] of [['portrait-life-m', LIFE, 120], ['portrait-life-f', LIFE_F, 120], ['portrait-race', RACE, 88], ['portrait-jobs', JOBS, 120]]) {
      const t = await page.evaluate(({ list, size }) => {
        const g = document.getElementById('g'); g.innerHTML = '';
        const times = { old: 0, now: 0 };
        for (const [tag, fn] of [['예전', window.A.oldPortrait], ['지금', window.A.portrait]]) {
          if (!fn) continue;
          const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:6px';
          row.innerHTML = `<div style="width:100%">${tag}</div>`;
          for (const [p, cap] of list) {
            const t0 = performance.now(); const svg = fn(null, p, { size: size * 1.6, bust: true }); times[tag === '예전' ? 'old' : 'now'] += performance.now() - t0;
            const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
            row.innerHTML += `<figure style="margin:0;width:${size}px;text-align:center"><img style="width:${size}px;height:${Math.round(size * 1.28)}px;display:block" src="${url}"><figcaption>${cap}</figcaption></figure>`;
          }
          g.appendChild(row);
        }
        return times;
      }, { list, size });
      await shoot(name);
      console.log(name, 'ms', Math.round(t.old), '→', Math.round(t.now));
    }
  }
  if (what !== 'portrait') {
    for (let part = 0; part < SCENES.length / 4; part++) {
      const t = await page.evaluate((picks) => {
        const g = document.getElementById('g'); g.innerHTML = '';
        const times = { old: 0, now: 0 };
        for (const [place, year, month] of picks) {
          for (const [tag, fn] of [['예전', window.A.oldScene], ['지금', window.A.sceneImage]]) {
            if (!fn) continue;
            const t0 = performance.now(); const url = fn({ place, year, month }); times[tag === '예전' ? 'old' : 'now'] += performance.now() - t0;
            g.innerHTML += `<figure style="margin:0 0 4px"><img style="width:390px;height:250px;object-fit:cover;display:block" src="${url}"><figcaption style="padding:2px 6px">${tag} · ${place} ${month}월</figcaption></figure>`;
          }
        }
        return times;
      }, SCENES.slice(part * 4, part * 4 + 4));
      await new Promise((r) => setTimeout(r, 200));
      await shoot(`scene-${part + 1}`);
      console.log(`scene-${part + 1}`, 'ms', Math.round(t.old), '→', Math.round(t.now));
    }
  }
  if (errs.length) console.log('errors', errs.slice(0, 5));
  await b.close();
})();
