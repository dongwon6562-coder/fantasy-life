// 폰 흉내(CPU 4배 느리게), 아이폰 앱과 같은 dist/www로 켜는 시간·한 달 넘기기·사건 고르기를 잰다 (헤드 16단계). 사용법: node tools/perfplay.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => localStorage.setItem('fantasy-life:prefs', JSON.stringify({ monthCard: false, guideSeen: { all: 1 } })));
  let t0 = Date.now();
  await p.goto('file://' + process.cwd() + '/dist/www/index.html');
  await p.waitForSelector('[data-family="merchant"]');
  console.log('첫 화면까지', Date.now() - t0, 'ms (CPU 4배 느리게)');
  await p.click('[data-family="merchant"]'); await p.fill('#pname', '레나');
  t0 = Date.now(); await p.click('#begin'); await p.waitForSelector('#go, [data-choice]'); console.log('시작 누르고 첫 달', Date.now() - t0, 'ms');
  const step = async () => p.evaluate(() => {
    const t = performance.now();
    const c = document.querySelector('[data-choice]'); if (c) { c.click(); document.querySelector('#ev-close')?.click(); return ['ev', performance.now() - t]; }
    const cl = document.querySelector('#ev-close'); if (cl) { cl.click(); return ['close', performance.now() - t]; }
    const sk = document.querySelector('#skip'); if (sk) { sk.click(); return ['skip', performance.now() - t]; }
    const go = document.querySelector('#go'); if (go) { go.click(); return ['go', performance.now() - t]; }
    return ['none', 0];
  });
  let months = 0; const goT = []; const evT = []; let marks = [60, 120];
  for (let i = 0; i < 6000 && months < 130; i++) {
    const [k, t] = await step();
    if (k === 'go') { months++; goT.push(t); await p.waitForTimeout(400); } else if (k === 'skip') { months += 6; } else if (k === 'ev') evT.push(t); else if (k === 'none') break;
    if (months >= marks[0]) {
      marks.shift();
      const s = goT.slice(-20).sort((a, b) => a - b); const e = evT.slice(-20).sort((a, b) => a - b);
      const dom = await p.evaluate(() => document.querySelectorAll('*').length);
      const save = await p.evaluate(() => Object.keys(localStorage).reduce((n, k) => n + (localStorage.getItem(k)?.length ?? 0), 0));
      console.log(`${months}달: 한 달 넘기기 중간 ${s[s.length >> 1]?.toFixed(0)}ms 최대 ${s.at(-1)?.toFixed(0)}ms, 사건 고르기 중간 ${e[e.length >> 1]?.toFixed(0)}ms, 화면 요소 ${dom}, 저장 ${(save * 2 / 1024).toFixed(0)}KB`);
    }
  }
  // 다시 켜서 저장 불러오기
  t0 = Date.now(); await p.reload(); await p.waitForSelector('#go, [data-choice], [data-family], #ev-close'); console.log('다시 켜기(저장 있음)', Date.now() - t0, 'ms');
  await b.close();
})();
