// 48단계 화면 점검: 폰 폭(390)으로 새 판을 열어 눈에 보이는 실수가 다시 생기지 않게 막는다. 1분 안.
// 1) 아기(0~2살)에겐 피로·마음 막대가 없다  2) 연대기 '마을과 나'는 밝은 양피지라 글이 보인다
// 3) 이번 달 축제 카드는 설명을 다시 쓰지 않는다  4) 어느 화면도 폭을 넘지 않고, 할 일 묶음이 카드 밖으로 나가지 않는다
// 5) 세 살이 되면 막대가 돌아온다  6) 카드 제목이 혼자일 때 왼쪽에 붙는다
// node tools/uilooktest.cjs   (먼저 npm run build)
const { chromium } = require('playwright');
const path = require('path');
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
(async () => {
  const T0 = Date.now();
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem('fantasy-life:prefs', JSON.stringify({ monthCard: false, guideSeen: { all: 1 }, reveal: false })));
  await p.goto('file://' + path.resolve(__dirname, '../dist/play.html'));
  await p.click('[data-family="merchant"]');
  await p.fill('#pname', '하린');
  await p.click('#begin');
  await p.waitForTimeout(600);
  const closeEvents = async () => {
    for (let k = 0; k < 40; k++) {
      const ch = await p.$('[data-choice]');
      if (ch) { await ch.click(); await p.waitForTimeout(40); }
      const c = await p.$('#ev-close');
      if (c) { await c.click(); await p.waitForTimeout(40); continue; }
      if (!ch) break;
    }
  };
  await closeEvents();
  const view = async (v) => { await p.evaluate((v) => document.querySelector(`[data-view="${v}"]`)?.click(), v); await p.waitForTimeout(300); };
  const wide = () => p.evaluate(() => {
    const W = document.documentElement.clientWidth, out = [];
    for (const el of document.querySelectorAll('.main *, .sheet *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || el.closest('.act-jump, .view-jump, .seg, .ftree-scroll, .target-row, .slotbar, svg, .map-host, [data-noswipe]')) continue;
      if (r.right > W + 1) out.push(`${el.tagName}.${el.className}:${Math.round(r.right)}`);
    }
    return out.slice(0, 5);
  });

  // 1) 아기
  await view('month');
  check(!(await p.$('.hero-me .hm-meters')), '아기에게 피로·마음 막대가 보인다');
  await view('me');
  check(!(await p.$$eval('.sheet .block', (bs) => bs.some((b) => /몸과 마음/.test(b.querySelector('h3')?.textContent ?? '') && b.querySelector('.wd-bar, .bar')))), "아기 '나' 화면에 피로 막대가 있다");

  // 2) 연대기 양피지
  await view('chron');
  const bg = await p.evaluate(() => { const c = document.querySelector('.chron-card'); return c ? getComputedStyle(c).backgroundImage : ''; });
  check(/239, 226, 193|efe2c1/i.test(bg), `연대기 카드가 양피지가 아니다: ${bg.slice(0, 80)}`);

  // 3)·4) 이번 달
  await view('month');
  check(!(await p.$('.rt-now .rt-feast .note')), '이번 달 축제 카드에 설명이 다시 나온다');
  for (const v of ['month', 'me', 'people', 'chron', 'save']) { await view(v); const w = await wide(); check(!w.length, `${v} 화면이 폭을 넘는다: ${w.join(', ')}`); }

  // 5) 세 살까지 넘기기
  await view('month');
  for (let k = 0; k < 12; k++) {
    const sk = await p.$('#skip');
    if (!sk) break;
    await sk.click(); await p.waitForTimeout(200); await closeEvents();
  }
  await view('month');
  const age = await p.evaluate(() => +(document.querySelector('.hero-me .hm-txt')?.textContent.match(/(\d+)살/)?.[1] ?? -1));
  check(age >= 3, `세 살까지 못 넘겼다 (${age})`);
  if (age >= 3) check(!!(await p.$('.hero-me .hm-meters')), '세 살인데 피로·마음 막대가 없다');
  const over = await p.evaluate(() => [...document.querySelectorAll('details.act-group')].filter((d) => d.getBoundingClientRect().right > d.parentElement.getBoundingClientRect().right + 1).map((d) => d.id));
  check(!over.length, `할 일 묶음이 카드 밖으로 나간다: ${over.join(', ')}`);

  // 6) 제목 혼자인 카드
  const right = await p.evaluate(() => [...document.querySelectorAll('.card > h2')].filter((h) => !h.querySelector('small') && h.firstChild && h.getBoundingClientRect().width > 200).filter((h) => { const r = document.createRange(); r.selectNodeContents(h); const rr = [...r.getClientRects()].pop(); return rr && rr.left - h.getBoundingClientRect().left > h.getBoundingClientRect().width / 2; }).map((h) => h.textContent.trim().slice(0, 12)));
  check(!right.length, `제목이 오른쪽으로 밀린 카드: ${right.join(', ')}`);

  check(!errs.length, `페이지 오류: ${errs.slice(0, 3).join(' | ')}`);
  await b.close();
  console.log(fail ? `화면 점검 실패 ${fail}` : `화면 점검 모두 통과 ${((Date.now() - T0) / 1000).toFixed(1)}초`);
  process.exit(fail ? 1 : 0);
})();
