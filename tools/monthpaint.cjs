// 화면에서 한 달 넘기기가 어디에 시간을 쓰는지 (CPU 프로파일, 함수별 자기 시간). NOMIN=1 npm run build 뒤에: node tools/monthpaint.cjs [달 수]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.addInitScript(() => localStorage.setItem('fantasy-life:prefs', JSON.stringify({ monthCard: false, guideSeen: { all: 1 }, reveal: false })));
  await p.goto('file://' + process.cwd() + '/dist/www/index.html');
  await p.waitForSelector('[data-family="merchant"]');
  await p.click('[data-family="merchant"]'); await p.fill('#pname', '레나'); await p.click('#begin');
  const adv = async (n) => { for (let i = 0; i < n; i++) { const c = await p.$('[data-choice]'); if (c) { await c.click(); const e = await p.$('#ev-close'); if (e) await e.click(); i--; continue; } const e = await p.$('#ev-close'); if (e) { await e.click(); i--; continue; } await p.click('#go'); } };
  await adv(50);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  const t0 = Date.now(); await adv(+process.argv[2] || 20); const dt = Date.now() - t0;
  const { profile } = await cdp.send('Profiler.stop');
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map(); const dts = profile.timeDeltas; let tot = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} :${n.callFrame.lineNumber}`; const d = dts[i] / 1000; self.set(k, (self.get(k) ?? 0) + d); tot += d; });
  console.log('달', process.argv[2] || 20, '걸린 ms', dt, '샘플 ms', Math.round(tot));
  for (const [k, v] of [...self].sort((a, c) => c[1] - a[1]).slice(0, 30)) console.log(v.toFixed(0).padStart(6), k);
  // 무거운 바탕 함수(drawImage·getImageData·toDataURL)를 부른 JS 함수
  const parent = new Map(); for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n);
  const by = new Map();
  profile.samples.forEach((id, i) => { const n = byId.get(id); if (!['drawImage', 'getImageData', 'toDataURL', 'fillRect', 'fill'].includes(n.callFrame.functionName)) return; let q = parent.get(id); const chain = []; while (q && chain.length < 4) { if (q.callFrame.functionName) chain.push(`${q.callFrame.functionName}:${q.callFrame.lineNumber}`); q = parent.get(q.id); } const k = n.callFrame.functionName + ' <- ' + chain.join(' <- '); by.set(k, (by.get(k) ?? 0) + dts[i] / 1000); });
  console.log('--- 부른 곳');
  for (const [k, v] of [...by].sort((a, c) => c[1] - a[1]).slice(0, 15)) console.log(v.toFixed(0).padStart(6), k);
  await b.close();
})();
