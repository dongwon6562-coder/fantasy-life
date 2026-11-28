// 51단계 도우미2: 초상 예전·지금을 폰 폭(390, 배율 2)으로 나란히 찍는다.
//   node tools/art51.cjs <out-dir> [old|now|both]
//   예전 코드는 dist/_old51/src/art (손대기 전 src 복사). 없으면 지금 것만.
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const { chromium } = require('playwright');
const out = process.argv[2] || 'dist/art51';
fs.mkdirSync(out, { recursive: true });
const hasOld = fs.existsSync('dist/_old51/src/art/portrait.js');
fs.writeFileSync('dist/_art51_entry.js', `
import { portrait } from '../src/art/portrait.js';
${hasOld ? "import { portrait as oldPortrait } from './_old51/src/art/portrait.js';" : 'const oldPortrait = null;'}
globalThis.FL_DATA_URLS = true;
window.A = { portrait, oldPortrait };`);
execSync('npx --yes esbuild@0.24.0 dist/_art51_entry.js --bundle --format=iife --outfile=dist/_art51_bundle.js --log-level=warning', { stdio: 'inherit' });

const NM = ['한스', '마리아', '오토', '리제', '페터', '안나', '클라우스', '엘제', '프리츠', '그레타', '루트비히', '힐데', '카를', '베르타', '요한', '도라'];
const LN = ['뮐러', '슈미트', '바그너', '호프만', '베커', '마이어', '렘케', '폭스'];
const P = (i, o = {}) => ({ id: i, name: NM[i % NM.length], lastName: LN[i % LN.length], sex: i % 2 ? 'f' : 'm', ageMonths: 12 * 32, job: 'farmer', alive: true, affection: 0, traits: [], ...o });
const JOBS8 = ['farmer', 'smith', 'merchant', 'laborer', 'weaver', 'innkeeper', 'fisher', 'carpenter'];
const CROWD = Array.from({ length: 16 }, (_, k) => [P(100 + k * 7, { sex: 'm', job: JOBS8[k % 8], ageMonths: (20 + ((k * 13) % 45)) * 12 }), `${JOBS8[k % 8]} ${20 + ((k * 13) % 45)}`]);
const CROWD_F = Array.from({ length: 12 }, (_, k) => [P(301 + k * 6, { sex: 'f', job: JOBS8[(k + 3) % 8], ageMonths: (18 + ((k * 11) % 40)) * 12 }), `${18 + ((k * 11) % 40)}살`]);
const STATUS = [['beggar', 0], ['laborer', 1], ['farmer', 1], ['merchant', 2], ['scholar', 2], ['priest', 2], ['knight', 3], ['count', 3], ['tower_mage', 3], ['sailor', 1], ['hunter', 1], ['bishop', 3]]
  .map(([job], k) => [P(500 + k, { job, ageMonths: (26 + (k * 5) % 30) * 12 }), job]);
const LIFE = [6, 16, 25, 38, 52, 68, 80].map((a) => [P(3, { sex: 'm', job: a < 15 ? 'child' : 'smith', ageMonths: a * 12 }), `${a}살`]);
const LIFE_F = [6, 16, 25, 38, 52, 68, 80].map((a) => [P(12, { sex: 'f', job: a < 15 ? 'child' : 'merchant', ageMonths: a * 12 }), `${a}살`]);
const MOOD = ['', 'warm', 'cold', 'tired', 'stressed', 'sick', 'grief', 'fierce', 'proud'].map((m, k) => [P(700 + k * 3, { ageMonths: 34 * 12 }), m || '보통', m]);
const RACE = [['human', null], ['elf', null], ['half_elf', null], ['dwarf', null], ['beast', 'wolf'], ['beast', 'cat'], ['demon', null], ['half_demon', null]]
  .flatMap(([race, beast], k) => [0, 1].map((s) => [P(20 + k * 2 + s, { race, beast, ageMonths: (race === 'elf' ? 120 : race === 'dwarf' ? 70 : 30) * 12 }), `${race}${beast ? '/' + beast : ''}`]));

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.setContent('<html><body style="margin:0;background:#1b1611;color:#d8c9a8;font:11px sans-serif"><div id="g"></div></body></html>');
  await page.addScriptTag({ content: fs.readFileSync('dist/_art51_bundle.js', 'utf8') });
  const shoot = async (name) => { const h = await page.evaluate(() => document.body.scrollHeight); await page.setViewportSize({ width: 390, height: h }); await page.screenshot({ path: `${out}/${name}.png` }); await page.setViewportSize({ width: 390, height: 800 }); };
  for (const [name, list, size] of [['crowd-m', CROWD, 88], ['crowd-f', CROWD_F, 88], ['status', STATUS, 88], ['life-m', LIFE, 88], ['life-f', LIFE_F, 88], ['mood', MOOD, 88], ['race', RACE, 88], ['small', CROWD, 44]]) {
    const t = await page.evaluate(({ list, size }) => {
      const g = document.getElementById('g'); g.innerHTML = '';
      const times = { old: 0, now: 0 };
      for (const [tag, fn] of [['예전', window.A.oldPortrait], ['지금', window.A.portrait]]) {
        if (!fn) continue;
        const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:6px';
        row.innerHTML = `<div style="width:100%;font-weight:bold">${tag}</div>`;
        for (const [p, cap, mood] of list) {
          const t0 = performance.now(); const svg = fn(null, p, { ...(size >= 60 ? { size: size * 1.6, bust: true } : { size }), ...(mood != null ? { mood } : {}) }); times[tag === '예전' ? 'old' : 'now'] += performance.now() - t0;
          const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
          row.innerHTML += `<figure style="margin:0;width:${size}px;text-align:center"><img style="width:${size}px;height:${Math.round(size * (size >= 60 ? 1.28 : 1))}px;display:block" src="${url}"><figcaption>${cap}</figcaption></figure>`;
        }
        g.appendChild(row);
      }
      return times;
    }, { list, size });
    await new Promise((r) => setTimeout(r, 150));
    await shoot(name);
    console.log(name, 'ms', Math.round(t.old), '→', Math.round(t.now));
  }
  if (errs.length) console.log('errors', errs.slice(0, 5));
  await b.close();
})();
