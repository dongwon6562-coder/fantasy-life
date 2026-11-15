import './lsshim.js';
import '../src/content.js';
// 어린 날 장면 점검: 모든 집안·나이에서 글이 깨지지 않고, 모든 선택지가 돌아간다.
import { newGame } from '../src/game.js';
import { EVENTS } from '../src/events/core.js';
import { me } from '../src/game.js';
import { makeRng } from '../src/rng.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 20) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const early = EVENTS.filter((e) => e.id.startsWith('early_'));
ok(early.length >= 15, `early events ${early.length}`);
let fired = 0;
for (const fam of ['farmer', 'merchant', 'fallen_knight', 'elf_exile']) {
  for (let s = 0; s < 6; s++) {
    for (const e of early) {
      for (let ci = 0; ci < e.choices.length; ci++) {
        const g = newGame({ name: '아이', sex: s % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed: 7000 + s });
        me(g).ageMonths = (3 + s) * 12 + 2;
        g.date.month = e.id === 'early_festival' ? 9 : [1, 4, 7, 10][s % 4];
        const rng = makeRng({ s: 11 + s + ci });
        if (e.cond && !e.cond(g)) continue;
        const c = e.prepare ? e.prepare(g, rng) : {};
        const title = typeof e.title === 'function' ? e.title(g, c) : e.title;
        const text = typeof e.text === 'function' ? e.text(g, c) : e.text;
        ok(!bad(title) && !bad(text), `${e.id} ${fam}: ${title} | ${text}`);
        const out = e.choices[ci].run(g, rng, c);
        ok(!bad(out), `${e.id}#${ci} ${fam}: ${out}`);
        ok(Number.isFinite(g.player.money) && Number.isFinite(g.player.stress), `${e.id} numbers`);
        fired++;
      }
    }
  }
}
ok(fired > 200, `fired ${fired}`);
console.log(`어린 날 장면 ${early.length}개, 돌려 본 선택 ${fired}번`);
console.log(fail ? `earlytest: ${fail} 실패` : 'earlytest: 통과');
process.exit(fail ? 1 : 0);
