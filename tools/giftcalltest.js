import './lsshim.js';
import '../src/content.js';
// 28단계 헤드: 장사·신앙 재능이 열여섯 무렵 하르펜으로 불리는 장면 (heredity_call), 검 승급 대련 상대의 세기.
import { newGame, me } from '../src/game.js';
import { L, showScene, SCENE_STRICT } from '../src/adventure/core.js';
import { HD } from '../src/heredity/core.js';
import { run as runHooks } from '../src/hooks.js';
import { makeRng } from '../src/rng.js';

SCENE_STRICT.on = true;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
for (const [gift, fid, job] of [['trade', 'merchants', 'trader'], ['faith', 'church', 'cleric']]) {
  for (const key of ['go', 'no']) {
    const g = newGame({ name: '부름', sex: 'f', familyId: 'farmer', mode: 'free', seed: 2801, birth: { gift } });
    for (const p of g.people) p.ageMonths += 16 * 12; g.date.year += 16; (g.flags ??= {}).adult = true;
    const H = HD(g); H.seen = true; H.went = true;
    let fired = false;
    for (let i = 0; i < 60 && !fired; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; L(g).queue = []; L(g).scene = null; runHooks('afterMonth', g, makeRng({ s: i })); fired = L(g).queue.some((s) => s.kind === 'heredity_call'); }
    check(fired, `${gift} 부름이 옴`);
    if (!fired) continue;
    const s = L(g).queue.find((x) => x.kind === 'heredity_call');
    L(g).queue = L(g).queue.filter((x) => x !== s); g.pendingEvent = null;
    check(showScene(g, s, { force: true }) && /하르펜/.test(g.pendingEvent?.text ?? ''), `${gift} 장면 글 ${g.pendingEvent?.text}`);
    const { resolveEvent } = await import('../src/events.js');
    const out = resolveEvent(g, makeRng({ s: 3 }), key === 'go' ? 0 : 1);
    check(typeof out === 'string' && out.length > 5 && !/undefined|NaN/.test(out), `${gift} ${key} 결과 ${out}`);
    if (key === 'go') check(L(g).place === 'harfen' && L(g).fac?.[fid]?.member && L(g).job?.id === job, `${gift} 하르펜·소속·일 ${L(g).place} ${JSON.stringify(L(g).fac)} ${L(g).job?.id}`);
    else check(L(g).place !== 'harfen' || !L(g).fac?.[fid]?.member, `${gift} 남음`);
    check(HD(g).called, `${gift} 다시 안 옴`);
  }
}
// 어릴 때 돌려보낸 집에는 오지 않는다
const g = newGame({ name: '안부름', sex: 'm', familyId: 'farmer', mode: 'free', seed: 2802, birth: { gift: 'trade' } });
for (const p of g.people) p.ageMonths += 16 * 12; g.date.year += 16; (g.flags ??= {}).adult = true;
HD(g).seen = true;
for (let i = 0; i < 60; i++) { g.date.month = (g.date.month % 12) + 1; L(g).queue = []; runHooks('afterMonth', g, makeRng({ s: i })); check(!L(g).queue.some((s) => s.kind === 'heredity_call'), '돌려보낸 집엔 안 옴'); if (fail) break; }
console.log(fail ? `giftcalltest 실패 ${fail}` : 'giftcalltest 통과');
process.exit(fail ? 1 : 0);
