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
  // 글에 새는 것: 빈 값, 덜 다듬은 조사, 틀 글자 (헤드 22단계)
  const LEAK = /undefined|NaN|\[object |\bnull\b|이\(가\)|을\(를\)|은\(는\)|와\(과\)|\(으\)로|\$\{/;
  const leaks = new Map();
  const scan = async () => {
    const t = await p.evaluate(() => document.body.innerText).catch(() => '');
    for (const line of t.split('\n')) if (LEAK.test(line) && !leaks.has(line.slice(0, 160))) leaks.set(line.slice(0, 160), months);
  };
  for (let i = 0; i < 4000 && months < (+process.env.UI_MONTHS || 360); i++) {
    const all = await p.$$('[data-choice]');
    if (all.length || i % 7 === 0) await scan();
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
    if (!go) { console.log("no #go at i=" + i, (await p.textContent("#app").catch(() => "")).replace(/\s+/g, " ").slice(0, 300)); break; }
    await go.click();
    months++;
    // UI_TABS=1이면 예순 달마다 다른 탭도 열어 글이 새는지 본다 (느려서 기본은 끔)
    if (process.env.UI_TABS && months % 60 === 0) {
      const views = await p.$$eval('[data-view]', (bs) => bs.map((b) => b.dataset.view));
      for (const v of views) { await p.click(`[data-view="${v}"]`).catch(() => {}); await scan(); }
      await p.click('[data-view="month"]').catch(() => {});
    }
    if (months === 200) await p.screenshot({ path: out + '-mid.png' });
  }
  await p.screenshot({ path: out + '-end.png' });
  const top = await p.textContent('header').catch(() => '');
  console.log('months~', months, 'header:', (top || '').replace(/\s+/g, ' ').slice(0, 120));
  console.log('leaks:', leaks.size);
  for (const [l, m] of [...leaks].slice(0, 30)) console.log('  ', m, l);
  console.log('errors:', errs.slice(0, 5));
  await b.close();
})();
