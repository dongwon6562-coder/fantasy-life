import '../src/content.js';
// 사람 사이 글 읽기 (48단계 도우미2): 한 삶을 글로만 빠르게 살며 사건(제목·글·고른 것·결과)과
// '오늘의 장면' 글을 달마다 적는다. 브라우저 없이 한 삶 60년이 1~2분.
// node tools/peopleplay.js <출력 파일> [집안 id] [씨앗] [해 수]   (PP_SEX=m|f, PP_RACE=elf 등은 newGame에 그대로)
import fs from 'fs';
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events/core.js';
import { renderToday } from '../src/ui/today.js';
import { L } from '../src/adventure/core.js';
import { me } from '../src/events/core.js';

const out = process.argv[2] || '/tmp/pp.md';
const fam = process.argv[3] || 'farmer';
const seed = +(process.argv[4] || 7);
const years = +(process.argv[5] || 60);
const g = newGame({ name: '하린', sex: process.env.PP_SEX || 'f', familyId: fam, mode: 'free', seed, ...(process.env.PP_RACE ? { race: process.env.PP_RACE } : {}) });
const strip = (h) => h.replace(/<(details|summary)[^>]*>/g, '').replace(/<\/(p|li|h2|h3|div|summary)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/\n\s*\n+/g, '\n').trim();
const log = [];
const ACTS = {};
const GHOST = [];
const FAR = [];
for (let m = 0; m < years * 12 && !g.over; m++) {
  const rng = rngOf(g);
  const acts = availableActions(g).filter((x) => process.env.PP_MOVE || (x.id !== 'travel' && !/move|emigr/.test(x.id)));
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = rng.pick(acts);
    if (!a || g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? acts[0];
    const c = { id: a.id };
    if (a.needsTarget) { const ts = g.people.filter((p) => p.known && !p.isPlayer && p.alive && !p.away); c.target = ts.length ? rng.pick(ts).id : undefined; }
    choices.push(c); ACTS[a.id] = (ACTS[a.id] ?? 0) + 1;
  }
  endMonth(g, choices);
  const head = `\n## ${g.date.year}년 ${g.date.month}월 · ${playerAge(g)}살 (${choices.map((c) => c.id).join(', ')})`;
  let today = '';
  try { today = strip(renderToday(g, { results: (g.lastResults ?? []).map((r) => `<li>${r.name}: ${r.scene ?? r.text}</li>`).join('') })); } catch (e) { today = '(오늘 글 오류 ' + e.message + ')'; }
  log.push(head, today);
  { // 이달 글에 죽은 사람이 산 사람처럼 나오는지 (성까지 같은 산 사람이 없을 때만)
    const aliveF = new Set(g.people.filter((p) => p.alive).map((p) => p.name + p.lastName));
    for (const d of g.people) {
      if (d.alive || !d.known || d.isPlayer || aliveF.has(d.name + d.lastName)) continue;
      const died = d.history?.at(-1); if (died && (g.date.year * 12 + g.date.month) - (died.y * 12 + died.m) < 3) continue;
      for (const ln of today.split('\n')) if (ln.includes(d.name) && (ln.includes(d.lastName) || ln.includes(d.lastName + '네')) && !/무덤|장례|떠난|죽|잃|기일|생전|넋|망자|유품|돌아가|묘|추모|제사|영전|명복|살아 있었다면|그리워/.test(ln)) GHOST.push(`${g.date.year}.${g.date.month} 이달 글 ${d.name} ${d.lastName}(${d.deathCause}) — ${ln.trim().slice(0, 120)}`);
    }
  }
  let guard = 0;
  while (g.pendingEvent && guard++ < 10) {
    const pe = g.pendingEvent;
    // 죽은 사람이 나오는지: 사건이 붙든 사람(ctx·장면 data의 id 꼴 값)이 이미 죽었고 글에 그 이름이 있으면 적는다
    const data = pe.id === 'life_scene' ? L(g).scene?.data ?? {} : pe.ctx ?? {};
    for (const [k2, v] of Object.entries(data)) {
      if (typeof v !== 'number' || v < 1) continue;
      const d = g.people.find((x) => x.id === v);
      const myPl = L(g).place ?? 'ern';
      if (d && d.alive && !d.isPlayer && d.place && d.place !== myPl && pe.text.includes(d.name) && !/편지|소식|전해|인편|사람을 보내|찾아왔|찾아온|왔다|돌아왔|들렀|기별|소문/.test(pe.text)) FAR.push(`${g.date.year}.${g.date.month} ${pe.title} [${pe.id === 'life_scene' ? 'S:' + L(g).scene?.kind : pe.id}] ${k2}=${d.name}@${d.place} 나는@${myPl} — ${pe.text.slice(0, 110).replace(/\n/g, ' ')}`);
      if (d && !d.alive && d !== me(g) && pe.text.includes(d.name)) GHOST.push(`${g.date.year}.${g.date.month} ${pe.title} [${pe.id === 'life_scene' ? 'S:' + L(g).scene?.kind : pe.id}] ${k2}=${d.name}(${d.deathCause ?? '?'}) — ${pe.text.slice(0, 110).replace(/\n/g, ' ')}`);
    }
    const k = rngOf(g).int(0, pe.choices.length - 1);
    log.push(`\n### 사건: ${pe.title} [${pe.id === 'life_scene' ? 'S:' + L(g).scene?.kind : pe.id}]\n${pe.text}\n${pe.choices.map((c, i) => `${i === k ? '>>' : '  '} ${typeof c === 'string' ? c : c.label ?? c.text}`).join('\n')}`);
    const r = resolveEvent(g, rngOf(g), k);
    log.push(`-- ${r}`);
  }
}
fs.writeFileSync(out, log.join('\n'));
if (GHOST.length) console.log('죽은 사람이 나오는 사건', GHOST.length, '\n' + [...new Set(GHOST)].slice(0, 30).join('\n'));
if (FAR.length) console.log('멀리 있는 사람이 눈앞에', FAR.length, '\n' + [...new Set(FAR)].slice(0, 30).join('\n'));
console.log(out, '끝', playerAge(g), '살', g.over ? '(끝남)' : '');
