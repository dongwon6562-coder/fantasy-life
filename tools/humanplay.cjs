// 사람처럼 해 보기: 폰 폭으로 할 일을 골라 가며 살고, 사건 글·이번 달 글을 기록하고 나이마다 탭 스크린샷.
// node tools/humanplay.cjs <출력 폴더> [집안 id] [씨앗]   (HP_MONTHS=개월, 기본 600)
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2] || '/tmp/hp';
const fam = process.argv[3] || 'merchant';
let seed = +(process.argv[4] || 7);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.addInitScript(() => localStorage.setItem('fantasy-life:prefs', JSON.stringify({ monthCard: false, guideSeen: { all: 1 } })));
  await p.goto('file://' + process.cwd() + '/dist/play.html');
  await p.screenshot({ path: `${out}/00-title.png` });
  if (process.env.HP_RACE) { await p.click(`[data-race="${process.env.HP_RACE}"]`); await p.waitForTimeout(200); }
  const famBtn = await p.$(`[data-family="${fam}"]`);
  if (!famBtn) { console.log('no family', fam); process.exit(1); }
  await famBtn.click();
  await p.screenshot({ path: `${out}/01-setup.png`, fullPage: true });
  await p.fill('#pname', '하린');
  await p.click('#begin');
  const log = [];
  let months = 0;
  const shotAges = new Set([0, 3, 7, 12, 16, 20, 30, 45, 60]);
  const age = async () => p.evaluate(() => { try { const t = document.body.innerText.match(/(\d+)\s*살/); return t ? +t[1] : -1; } catch { return -1; } });
  const shoot = async (tag) => {
    for (const v of ['month', 'me', 'people', 'map', 'chron']) {
      await p.click(`[data-view="${v}"]`).catch(() => {});
      await p.waitForTimeout(250);
      await p.screenshot({ path: `${out}/${tag}-${v}.png`, fullPage: v !== 'map' });
    }
    await p.click('[data-view="month"]').catch(() => {});
  };
  let lastAge = -1;
  for (let i = 0; i < 6000 && months < (+process.env.HP_MONTHS || 600); i++) {
    const choices = await p.$$('[data-choice]');
    if (choices.length) {
      const txt = await p.evaluate(() => { const m = document.querySelector('.event, .ev-box, dialog, [role=dialog]') || document.querySelector('#app'); return m.innerText; }).catch(() => '');
      const k = Math.floor(rnd() * choices.length);
      const label = await choices[k].innerText().catch(() => '?');
      log.push(`\n### 사건 (${months}달)\n${txt.slice(0, 1500)}\n>> 고름: ${label.replace(/\s+/g, ' ')}`);
      await choices[k].click().catch(() => {});
      await p.waitForTimeout(30);
      const after = await p.evaluate(() => { const m = document.querySelector('.event, .ev-box, dialog, [role=dialog]'); return m ? m.innerText : ''; }).catch(() => '');
      if (after) log.push(`-- 결과: ${after.slice(0, 800)}`);
      const c = await p.$('#ev-close'); if (c) await c.click().catch(() => {});
      continue;
    }
    const close = await p.$('#ev-close');
    if (close) { await close.click(); continue; }
    const a = await age();
    if (a !== lastAge && shotAges.has(a)) { await shoot(`a${String(a).padStart(2, '0')}`); }
    lastAge = a;
    // 할 일 고르기: 칸마다 무작위 행동
    const slots = await p.$$('[data-slot-i]');
    for (let s = 0; s < slots.length; s++) {
      await p.evaluate((s) => document.querySelector(`[data-slot-i="${s}"]`)?.click(), s);
      const acts = await p.$$eval('[data-act]', (bs) => bs.map((b) => b.dataset.act));
      if (acts.length) {
        const id = acts[Math.floor(rnd() * acts.length)];
        await p.evaluate((id) => document.querySelector(`[data-act="${id}"]`)?.click(), id);
        const tg = await p.$$('[data-target]');
        if (tg.length) await p.evaluate((k) => document.querySelectorAll('[data-target]')[k]?.click(), Math.floor(rnd() * tg.length));
      }
    }
    const plan = await p.evaluate(() => [...document.querySelectorAll('.slotchip')].map((b) => b.innerText.replace(/\s+/g, ' ')).join(' | ')).catch(() => '');
    const go = await p.$('#go');
    if (!go) { log.push('!! #go 없음: ' + (await p.textContent('#app').catch(() => '')).replace(/\s+/g, ' ').slice(0, 600)); break; }
    await go.click();
    months++;
    const now = await p.evaluate(() => (document.querySelector('main')?.innerText || '').slice(0, 1800)).catch(() => '');
    log.push(`\n## ${months}달 (${a}살) 할 일: ${plan}\n${now}`);
  }
  await shoot('end');
  fs.writeFileSync(`${out}/log.md`, log.join('\n'));
  console.log(fam, 'months', months, 'errors', errs.length, errs.slice(0, 5));
  await b.close();
})();
