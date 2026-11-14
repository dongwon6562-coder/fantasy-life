const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + process.cwd() + '/dist/play.html');
  await p.screenshot({ path: process.argv[2] + '-1.png', fullPage: true });
  await p.click('[data-family="fallen_knight"]');
  await p.fill('#pname', '레온');
  await p.click('#begin');
  // 아기 시절 넘기기, 사건 처리
  for (let i = 0; i < 40; i++) {
    const choice = await p.$('[data-choice]');
    if (choice) { await choice.click(); await p.click('#ev-close'); continue; }
    const skip = await p.$('#skip');
    if (skip) { await skip.click(); continue; }
    if (i > 30) break;
    await p.click('#go');
  }
  await p.screenshot({ path: process.argv[2] + '-2.png', fullPage: true });
  await p.setViewportSize({ width: 400, height: 860 });
  await p.screenshot({ path: process.argv[2] + '-3.png', fullPage: false });
  console.log('errors:', errs);
  await b.close();
})();
