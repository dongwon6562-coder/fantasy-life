import '../src/content.js';
// 어른의 삶 해 보기 (48단계 도우미4): 여러 집안으로 태어나 16살부터 한 길을 붙들고 사는 사람처럼 고른다.
// 달마다 한 일의 글·사건·돈을 적고, 같은 글 되풀이·돈 흐름·뜻 없이 뜨는 행동을 센다.
//   node tools/adultplay.js [출력 폴더] [판 수] [끝 나이]   (AP_WISE=1 비싼 선택지 피하기, AP_RICH=N 28살에 돈)
// 출력: <폴더>/life-N.md (한 삶의 기록), 화면에 요약
import { mkdirSync, writeFileSync } from 'node:fs';
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { ACTIONS } from '../src/actions.js';
import { WORK, takeJob } from '../src/jobs.js';
import { vignetteFor } from '../src/art/vignette.js';
const plates = new Map(); // 사건 제목(+장면 종류) → 고른 그림 판
// 행동마다 주머니가 얼마나 움직였는지 (한 번 할 때 평균)
const actMoney = new Map();
for (const a of ACTIONS) { const run = a.run; a.run = function (g, ...r) { const m0 = g.player.money; const t = run.call(this, g, ...r); const v = actMoney.get(a.id) ?? [0, 0]; v[0] += g.player.money - m0; v[1] += 1; actMoney.set(a.id, v); return t; }; }

const out = process.argv[2] ?? '/tmp/adultplay';
const N = +(process.argv[3] ?? 6);
const END = +(process.argv[4] ?? 45);
mkdirSync(out, { recursive: true });
const fams = ['farmer', 'merchant', 'fallen_knight', 'capital_artisan', 'slum_orphan', 'port_folk', 'march_guard', 'sexton', 'dwarf_smith'];
// 한 길을 붙드는 사람: 이 앞머리의 행동이 보이면 넷 중 셋은 그걸 고른다
const PERSONAS = { worker: /^(seek_job|work)$/, farm: /^(farm_|nature_)/, cook: /^(cuisine_|inn_)/, apo: /^(apo_|herbs$)/, builder: /^builder_/, mine: /^mine_/, hunter: /^(hunter_|wilds_)/, cloth: /^cloth_/, adventurer: /^(gather_party|party_|quest$|delve$|dv_|gear$)/, merchant: /^(trade_|open_shop|shop_manage)/, harbor: /^harbor_/, brew: /^brew_/, watch: /^(work$|watch_)/, bounty: /^bh_/, home: /^(house_|estate_|household_|housing$)/ };
const PK = Object.keys(PERSONAS);
const BAD = (x) => x.crime || /^(heist|spy|revolt|herd_rustle|secret_night)/.test(x.id) || (x.id === 'travel' && !process.env.AP_TRAVEL);
const textCount = new Map(), actShown = new Map(), actPicked = new Map(), money = [];
const norm = (t) => String(t ?? '').replace(/\d+/g, '#').trim();
for (let run = 0; run < N; run++) {
  const fam = process.env.AP_FAM ?? fams[run % fams.length], per = process.env.AP_PER ?? PK[run % PK.length], PRE = PERSONAS[per];
  let g;
  try { g = newGame({ name: '하린', sex: run % 2 ? 'm' : 'f', familyId: fam, mode: 'once', seed: 4800 + run * 13 }); } catch { g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'once', seed: 4800 + run * 13 }); }
  const log = [`# 삶 ${run} (${fam}, ${per})`];
  const picked = [], flow = { month: 0, ev: 0, evBy: {}, earn: {} };
  for (let m = 0; m < 12 * 90 && !g.over && playerAge(g) < END; m++) {
    const rng = rngOf(g), age = playerAge(g);
    // AP_RICH=N: 28살에 은화 N닢을 쥐여 주고 30~60살의 큰 살림(영지·상단·공략대)을 본다
    if (process.env.AP_RICH && age === 28 && !g._apRich) { g._apRich = 1; g.player.money += +process.env.AP_RICH; }
    // 현상금 길(bounty)은 조합 지부에 있으면 이름부터 올린다 (50단계)
    if (per === 'bounty' && age === 18 && !g._apHall && !g.life?.travel) { g._apHall = 1; g.life.place = 'harfen'; g.life.home = 'inn'; } // 18살에 하르펜으로 옮겨 산다고 친다
    if (per === 'bounty' && age >= 18) { const j = ACTIONS.find((a) => a.id === 'bh_join'); if (j?.available(g)) j.run(g, rngOf(g)); }
    // 경비대 길(watch)은 17살부터 자리가 나면 경비대에 들어간다 (49단계)
    if (per === 'watch' && age >= 17 && !g.life?.job && WORK.guard && !WORK.guard.req(g)) takeJob(g, 'guard');
    const acts = availableActions(g).filter((x) => !BAD(x) && !(per === 'watch' && g.life?.job?.id === 'guard' && x.id === 'seek_job'));
    const adult = age >= 16 && slotsFor(g) > 0;
    if (adult) for (const a of acts) actShown.set(a.id, (actShown.get(a.id) ?? 0) + 1);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const mine = acts.filter((x) => PRE.test(x.id));
      let a = adult && mine.length && rng.chance(0.75) ? rng.pick(mine) : adult && rng.chance(0.4) ? acts.find((x) => /^(seek_job|work)$/.test(x.id)) : null;
      a ??= rng.pick(acts);
      if (!a || g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? acts[0];
      const c = { id: a.id };
      if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive && !p.away)?.id;
      choices.push(c);
      if (adult) { actPicked.set(a.id, (actPicked.get(a.id) ?? 0) + 1); if (PRE.test(a.id)) picked.push(a.id); }
    }
    const m0 = g.player.money;
    const res = endMonth(g, choices);
    if (adult) { flow.month += g.player.money - m0; for (const r of res) { const mm = /은화 (\d+)닢을 (받|벌|남|얻)/.exec(r.text); if (mm) flow.earn[r.name] = (flow.earn[r.name] ?? 0) + +mm[1]; } }
    if (adult) {
      log.push(`\n## ${g.date.year}.${g.date.month} ${age}살 돈 ${g.player.money}/${g.player.familyMoney} 일 ${g.player.job ?? me(g)}`);
      for (const r of res) { log.push(`- [${r.name}] ${r.text}`); const k = `${r.name}|${norm(r.text)}`; textCount.set(k, (textCount.get(k) ?? 0) + 1); }
      if (m % 12 === 0) money.push([run, fam, per, age, g.player.money, g.player.familyMoney]);
    }
    let k = 0;
    while (g.pendingEvent && k++ < 8) {
      const pe = g.pendingEvent, n = pe.choices?.length ?? 1;
      // AP_WISE=1: 사람처럼, 주머니보다 비싼 선택지는 고르지 않는다
      let pick = rngOf(g).int(0, Math.max(0, n - 1));
      if (process.env.AP_WISE && pe.choices?.length) {
        const ok = pe.choices.map((c, i) => [c, i]).filter(([c]) => { const m = /은화 (\d+)닢/.exec(c?.label ?? String(c)); return !m || +m[1] <= g.player.money * 0.5; });
        if (ok.length) pick = ok[rngOf(g).int(0, ok.length - 1)][1];
      }
      // 흔적을 따라 길을 떠날 때는 흔적이 가리키는 고장(맨 앞)을 고른다
      if (g.life?.scene?.kind === 'travel' && g.life.scene.to) pick = 0;
      if (adult) { let v = null; try { v = vignetteFor(g, { title: pe.title, text: pe.text }); } catch (e) { v = { plate: 'ERR ' + e.message }; } const sk = g.life?.scene?.kind ?? pe.id; const key = `${sk} | ${String(pe.title).replace(/\d+/g, '#').slice(0, 40)}`; const pk = v ? `${v.plate}${v.variant ? ':' + v.variant : ''}` : '-'; const m = plates.get(key) ?? new Map(); m.set(pk, (m.get(pk) ?? 0) + 1); plates.set(key, m); }
      const e0 = g.player.money;
      const o = resolveEvent(g, rngOf(g), pick);
      if (adult) { const d = g.player.money - e0; flow.ev += d; if (d) flow.evBy[pe.title] = (flow.evBy[pe.title] ?? 0) + d; }
      if (adult) log.push(`* 사건 ${pe.title}: ${String(pe.text ?? '').slice(0, 300)}\n  >> ${pe.choices?.[pick]?.label ?? pe.choices?.[pick] ?? '?'} → ${String(o ?? '').slice(0, 300)}`);
    }
  }
  log.push(`\n끝: ${playerAge(g)}살 over=${!!g.over} 돈 ${g.player.money}`); console.log('  돈 흐름: 달', flow.month, '사건', flow.ev, '사건별', Object.entries(flow.evBy).sort((a, b) => a[1] - b[1]).slice(0, 6).map((x) => x.join(' ')).join(', '), '| 번 곳', Object.entries(flow.earn).sort((a, b) => b[1] - a[1]).slice(0, 6).map((x) => x.join(' ')).join(', ')); console.log('삶', run, fam, per, '끝', playerAge(g), '돈', g.player.money, '골라 본 길 행동', [...new Set(picked)].join(' '));
  writeFileSync(`${out}/life-${run}.md`, log.join('\n'));
}
function me(g) { return g.people.find((p) => p.isPlayer)?.job; }
console.log('— 같은 글 되풀이 (한 일|글: 횟수)');
for (const [k, v] of [...textCount].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(String(v).padStart(4), k.slice(0, 150));
console.log('— 돈 (판 집안 나이 주머니)');
for (const r of money.filter((x) => x[3] % 5 === 0)) console.log(r.join(' '));
console.log('— 자주 보이는데 거의 안 고른 행동');
for (const [k, v] of [...actShown].sort((a, b) => b[1] - a[1]).slice(0, 50)) console.log(String(v).padStart(5), String(actPicked.get(k) ?? 0).padStart(4), k);
console.log('— 행동 한 번에 주머니 (평균, 고른 수)');
for (const [k, [sum, n]] of [...actMoney].filter((x) => x[1][1] >= 5).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1])) console.log(String((sum / n).toFixed(1)).padStart(7), String(n).padStart(5), k);
if (process.env.AP_PLATES) { const out2 = []; for (const [k, m] of [...plates].sort()) out2.push(`${k} => ${[...m].map(([a, b]) => `${a}×${b}`).join(' ')}`); writeFileSync(`${out}/plates.txt`, out2.join('\n')); console.log('그림 판 목록', out2.length, '줄 →', `${out}/plates.txt`); }
