import '../src/content.js';
// 돈과 물가 균형 (33단계 헤드): 갈래마다 좋아하는 행동을 고르는 플레이어로 YEARS년(대 잇기 포함) 돌려
// 10년마다 내 돈·집안 돈·그 10년에 번 것과 쓴 것, 가장 돈이 많이 들어온 행동·장면을 찍는다.
// npm test에는 넣지 않는다. 직접 실행: node tools/moneywatch.js [햇수] [갈래 이름들(쉼표)]
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { heirsOf, becomeHeir } from '../src/heir.js';

const YEARS = +(process.argv[2] ?? 100);
const PERSONAS = {
  farmer: { fam: 'farmer', like: /farm|field|harvest|herd|work/ },
  merchant: { fam: 'merchant', like: /trade|shop|caravan|market|sell|deal|work/ },
  knight: { fam: 'fallen_knight', like: /sword|train|duel|order|knight|company|hunt|quest|adventure/ },
  mage: { fam: 'merchant', like: /magic|study|spell|tower|research|ruin/, gift: 'magic' },
  villain: { fam: 'farmer', like: /steal|crime|rob|heist|smuggl|con|dark|thief|pick/ },
};
const pick = (process.argv[3] ?? Object.keys(PERSONAS).join(',')).split(',');
for (const name of pick) {
  const P = PERSONAS[name];
  const g = newGame({ name: '재기', sex: 'm', familyId: P.fam, mode: 'free', seed: 7300 + name.length * 31, birth: P.gift ? { gift: P.gift } : null });
  let r = 99 + name.length; const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const wealth = () => g.player.money + g.player.familyMoney;
  const gainBy = {}; let w0 = wealth(), gens = 1, lastHeir = g.player.id;
  const line = [];
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) { line.push(`  ${Math.floor(m / 12)}년 대가 끊김`); break; } becomeHeir(g, rngOf(g), h); if (g.over) break; }
    if (g.player.id !== lastHeir) { gens++; lastHeir = g.player.id; }
    const acts = availableActions(g).filter((a) => !/suicide|farewell|assassin/.test(a.id));
    const liked = acts.filter((a) => P.like.test(a.id));
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) { const pool = liked.length && rnd() < 0.75 ? liked : acts; choices.push({ id: pool[Math.floor(rnd() * pool.length)].id }); }
    const before = wealth();
    endMonth(g, choices);
    const mid = wealth();
    if (process.env.BIG && Math.abs(mid - before) >= +process.env.BIG) { const ch = (g.chronicle ?? []).slice(-4).map((c) => c.text ?? JSON.stringify(c)).join(' / '); const nw = (g.news ?? []).slice(-6).map((n) => n.text ?? n).join(' / '); console.log(`   [${name} ${Math.floor(m / 12)}년 ${choices.map((c) => c.id).join('+')}] ${before}→${mid} | ${String(nw).slice(0, 400)} || ${String(ch).slice(0, 300)}`); }
    const k = choices.map((c) => c.id).join('+');
    gainBy['act:' + k] = (gainBy['act:' + k] ?? 0) + (mid - before);
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) { const id = g.pendingEvent.id === 'life_scene' ? 'sc:' + (g.life?.scene?.kind ?? '?') : (g.pendingEvent.id ?? g.pendingEvent.title); const b = wealth(); resolveEvent(g, rngOf(g), Math.floor(rnd() * g.pendingEvent.choices.length)); gainBy['ev:' + id] = (gainBy['ev:' + id] ?? 0) + (wealth() - b); }
    if (m % 120 === 119) {
      const top = Object.entries(gainBy).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, +(process.env.TOP ?? 4)).map(([k2, v]) => `${k2.slice(0, 40)} ${v > 0 ? '+' : ''}${v}`).join(' · ');
      line.push(`  ${(m + 1) / 12}년 ${gens}대 ${Math.floor(g.people.find((p) => p.id === g.player.id)?.ageMonths / 12)}살 내돈 ${g.player.money} 집안돈 ${g.player.familyMoney} (10년 ${wealth() - w0 >= 0 ? '+' : ''}${wealth() - w0}) | ${top}`);
      w0 = wealth(); for (const k3 in gainBy) delete gainBy[k3];
    }
  }
  console.log(`== ${name}`); console.log(line.join('\n'));
}
