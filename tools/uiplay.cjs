// 실제 화면을 눌러 가며 몇십 년을 살아 보는 점검 (오류 수집 + 스크린샷)
const { chromium } = require('playwright');
const out = process.argv[2] || 'shot';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  // 달 넘김 카드와 처음 안내는 끄고 빠르게 돈다 (src/ui/settings.js)
  await p.addInitScript(() => localStorage.setItem('fantasy-life:prefs', JSON.stringify({ monthCard: false, guideSeen: { all: 1 } })));
  await p.goto('file://' + process.cwd() + '/dist/play.html');
  await p.click('[data-family="merchant"]');
  await p.fill('#pname', '레나');
  await p.click('#begin');
  let months = 0;
  for (let i = 0; i < 500 && months < 360; i++) {
    const all = await p.$$('[data-choice]');
    if (all.length) {
      await all[i % all.length].click();
      const c = await p.$('#ev-close');
      if (c) await c.click();
      continue;
    }
    const close = await p.$('#ev-close');
    if (close) { await close.click(); continue; }
    const skip = await p.$('#skip');
    if (skip) { await skip.click(); months += 6; continue; }
    const go = await p.$('#go');
    if (!go) break;
    await go.click();
    months++;
    if (months === 200) await p.screenshot({ path: out + '-mid.png' });
  }
  await p.screenshot({ path: out + '-end.png' });
  const top = await p.textContent('header').catch(() => '');
  console.log('months~', months, 'header:', (top || '').replace(/\s+/g, ' ').slice(0, 120));
  console.log('errors:', errs.slice(0, 5));
  await b.close();
})();
