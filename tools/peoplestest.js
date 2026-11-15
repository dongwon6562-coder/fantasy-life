import './lsshim.js';
import '../src/content.js';
// 다른 종족의 땅 점검: 처음 standing, 풍습 익히기, 의식(제대로·실수·구경), 그 땅의 이름, 대우가 너그러워짐,
// 우정·앙금·편견·노예 사냥꾼·혼인·섞인 혈통 자식·하프엘프 사건, 종족끼리의 사이, 화면용, 예전 저장, 대 잇기, 40년.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId, makePerson } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { WORLD_TICKS } from '../src/world.js';
import { treatmentIn } from '../src/realms/index.js';
import { setRace } from '../src/races/index.js';
import { peoplesState as PS, peoplesInfo, peoplesLine, standingOf, shiftStanding } from '../src/peoples/index.js';

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const shown = e.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.show || c.show(g, ctx));
  const text = e.text(g, ctx);
  check(!BAD.test(text), `${id} 본문: ${text}`);
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(({ c }) => c.label), choiceIdx: shown.map(({ i }) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && !BAD.test(out), `${id} 결과: ${out}`);
  crimeState(g).jailed = null;
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const pickScene = (g, word, place) => {
  for (let m = 0; m < 4; m++) {
    for (let k = 0; k < 8 && g.pendingEvent; k++) {
      const pe = g.pendingEvent;
      const i = pe.id === 'life_scene' ? pe.choices.findIndex((c) => c.includes(word)) : -1;
      const out = resolveEvent(g, rngOf(g), i >= 0 ? i : 0);
      if (i >= 0) { check(!BAD.test(out ?? ''), `장면 결과: ${out}`); stay(g, place); return out ?? ''; }
    }
    stay(g, place);
    endMonth(g, [{ id: 'rest' }]);
  }
  return null;
};
const newbie = (g, place, { sex = 'f', race = 'human', age = 25, aff = 50 } = {}) => {
  const rng = makeRng({ s: g.people.length + 3 });
  const p = makePerson(rng, { sex, ageMonths: age * 12, lastName: '시험' });
  setRace(p, race, rng, { rename: true, last: true });
  p.known = true; p.affection = aff; p.place = place; p.alive = true;
  g.people.push(p);
  return p;
};

// 1) 처음: 종족마다 땅들이 나를 보는 눈이 다르다
{
  const h = newGame({ name: '사람', sex: 'm', familyId: 'farmer', mode: 'free', seed: 301 });
  const e = newGame({ name: '숲', sex: 'f', familyId: 'elf_exile', mode: 'free', seed: 302 });
  const b = newGame({ name: '초원', sex: 'm', familyId: 'beast_hunter', mode: 'free', seed: 303 });
  check(standingOf(h, 'elf') < standingOf(e, 'elf') && standingOf(b, 'beast') === 70 && standingOf(h, 'dwarf') >= 30, `처음 standing이 이상하다 ${standingOf(h, 'elf')} ${standingOf(e, 'elf')} ${standingOf(b, 'beast')}`);
  check(peoplesLine(h) === '' && !has(h, 'peoples_custom'), '아기가 그 땅에 있지도 않은데 풍습을 익힌다');
  check(peoplesInfo(h).lands.length === 3 && peoplesInfo(h).ties.length === 6, '화면 정보 모양이 이상하다');
}
// 2) 엘프 숲에서 살기: 풍습, 의식, 이름, 대우
{
  const g = newGame({ name: '손님', sex: 'f', familyId: 'merchant', mode: 'free', seed: 304 });
  grown(g); stay(g, 'silverleaf'); g.player.stats.int = 70; g.player.stats.cha = 70; g.player.stats.sen = 70;
  check(has(g, 'peoples_custom') && peoplesLine(g).includes('엘프의 숲'), '은잎 마을에서 풍습 익히기가 안 보인다');
  const P = PS(g);
  const st0 = standingOf(g, 'elf');
  check(treatmentIn(g, 'elf') === 'wary', `인간이 엘프 숲에서 처음부터 대우가 ${treatmentIn(g, 'elf')}`);
  for (let i = 0; i < 24 && P.custom.elf < 3; i++) { stay(g, 'silverleaf'); endMonth(g, [{ id: 'peoples_custom' }, { id: 'peoples_custom' }]); for (let k = 0; k < 8 && g.pendingEvent; k++) resolveEvent(g, rngOf(g), 0); }
  check(P.custom.elf === 3, `두 해 동안 엘프 풍습을 다 못 익혔다 (${P.custom.elf})`);
  check(standingOf(g, 'elf') > st0 + 15 && P.lived.elf >= 6, `풍습을 익혀도 엘프들이 그대로다 (${st0}→${standingOf(g, 'elf')})`);
  check(!has(g, 'peoples_custom'), '다 익혔는데 또 익힌다');
  // 의식: 4월 이슬 받기
  g.date.month = 4; stay(g, 'silverleaf');
  check(has(g, 'peoples_rite'), '4월 은잎 마을에 이슬 받기가 없다');
  endMonth(g, [{ id: 'peoples_rite' }]);
  check(pickScene(g, '의식에 낀다', 'silverleaf') != null, '이슬 받기 장면을 고를 수 없다');
  g.date.month = 4; stay(g, 'silverleaf');
  check(!has(g, 'peoples_rite'), '같은 해에 같은 의식을 또 치른다');
  // 대우가 너그러워진다
  shiftStanding(g, 'elf', 100);
  check(treatmentIn(g, 'elf') === 'normal', `엘프들이 믿는데 대우가 ${treatmentIn(g, 'elf')}`);
  // 이름
  P.lived.elf = 30; stay(g, 'silverleaf');
  check(cond(g, 'peoples_name'), '한 식구로 여기는데 이름을 주지 않는다');
  fire(g, 'peoples_name', 0);
  check(P.named.elf && !cond(g, 'peoples_name'), '이름을 받은 뒤가 이상하다');
  check(peoplesLine(g).includes(P.named.elf), `한 줄에 이름이 없다: ${peoplesLine(g)}`);
  const info = peoplesInfo(g);
  check(info.lands[0].customNames.length === 3 && info.lands[0].named && info.here?.id === 'elf' && !BAD.test(JSON.stringify(info.log)), '화면 정보가 모자라다');
}
// 3) 의식에서 실수: 풍습을 모르는 외지인
{
  let blunders = 0;
  for (let s = 0; s < 8; s++) {
    const g = newGame({ name: '실수', sex: 'm', familyId: 'farmer', mode: 'free', seed: 320 + s });
    grown(g); g.player.stats.sen = 10; g.player.stats.cha = 10;
    g.date.month = 11; stay(g, 'fur');
    const st = standingOf(g, 'beast');
    endMonth(g, [{ id: 'peoples_rite' }]);
    pickScene(g, '의식에 낀다', 'fur');
    if (standingOf(g, 'beast') < st) blunders++;
  }
  check(blunders >= 4, `풍습을 모르는데 이름 새기는 밤을 거의 다 잘 치렀다 (${blunders}/8 실수)`);
  // 드워프: 조상의 불
  const g = newGame({ name: '산', sex: 'f', familyId: 'dwarf_smith', mode: 'free', seed: 330 });
  grown(g); g.date.month = 12; stay(g, 'hammer');
  check(has(g, 'peoples_rite'), '12월 쇠망치 골에 조상의 불이 없다');
  endMonth(g, [{ id: 'peoples_rite' }]);
  check(pickScene(g, '의식에 낀다', 'hammer') != null, '조상의 불 장면을 고를 수 없다');
  check(standingOf(g, 'dwarf') > 70, '드워프가 조상의 불을 지켰는데 그대로다');
}
// 4) 사건들
{
  const g = newGame({ name: '사건', sex: 'm', familyId: 'merchant', mode: 'free', seed: 340 });
  grown(g); stay(g, 'leocast'); g.player.money = 200;
  const elf = newbie(g, 'leocast', { race: 'elf' });
  check(cond(g, 'peoples_friend'), '엘프 벗 사건이 안 뜬다');
  fire(g, 'peoples_friend', 0);
  check(PS(g).friends === 1 && elf._raceFriend, '벗이 되었는데 남지 않는다');
  newbie(g, 'leocast', { race: 'dwarf', sex: 'm' });
  fire(g, 'peoples_friend', 1);
  const t0 = PS(g).ties['dwarf|elf'];
  check(cond(g, 'peoples_grudge'), '엘프와 드워프의 다툼이 안 뜬다');
  for (const c of [0, 1, 2, 3]) fire(g, 'peoples_grudge', c, 10 + c);
  check(PS(g).ties['dwarf|elf'] !== t0, '다툼에 끼어도 종족 사이가 그대로다');
  check(cond(g, 'peoples_defend'), '수인 아이 사건이 안 뜬다');
  for (const c of [0, 1, 2, 3]) fire(g, 'peoples_defend', c, 20 + c);
  stay(g, 'fur');
  check(cond(g, 'peoples_slavers') && !cond(g, 'peoples_defend'), '털가죽 시장 사건 조건이 이상하다');
  g.player.skills.sword = 100; g.player.stats.str = 90;
  for (const c of [0, 1, 2]) { stay(g, 'fur'); g.player.injuries = []; fire(g, 'peoples_slavers', c, 30 + c); }
  stay(g, 'silverleaf'); fire(g, 'peoples_slavers', 0, 33);
  // 혼인과 섞인 혈통 자식
  const meP = me(g);
  const wife = newbie(g, 'leocast', { race: 'elf', age: 120, aff: 70 });
  meP.spouseId = wife.id; wife.spouseId = meP.id; stay(g, 'leocast');
  check(cond(g, 'peoples_mixed_marriage'), '엘프와 혼인했는데 사건이 안 뜬다');
  for (const c of [0, 1, 2]) { delete g.flags[`mixed_wed_${wife.id}`]; fire(g, 'peoples_mixed_marriage', c, 40 + c); }
  check(!cond(g, 'peoples_mixed_marriage'), '혼인 사건이 또 뜬다');
  for (const c of [0, 1, 2, 3]) {
    const kid = newbie(g, 'leocast', { race: 'half_elf', age: 12, sex: c % 2 ? 'm' : 'f', aff: 60 });
    kid.fatherId = meP.id; kid.motherId = wife.id; meP.childIds.push(kid.id); wife.childIds.push(kid.id);
    g.player.money = 100;
    check(cond(g, 'peoples_mixed_child'), '하프엘프 자식 사건이 안 뜬다');
    fire(g, 'peoples_mixed_child', c, 50 + c);
    check(PS(g).heritage[kid.id], `자식의 마음이 남지 않는다 (${c})`);
  }
  check(!cond(g, 'peoples_mixed_child') && peoplesInfo(g).heritage.length === 4, '자식 사건이 끝나지 않거나 화면에 없다');
}
// 5) 하프엘프의 삶
{
  const g = newGame({ name: '반쪽', sex: 'f', familyId: 'half_elf', mode: 'free', seed: 350 });
  grown(g); stay(g, 'serenia');
  check(cond(g, 'peoples_halfelf'), '하프엘프 모임이 안 뜬다');
  fire(g, 'peoples_halfelf', 0); fire(g, 'peoples_halfelf', 1);
  grown(g, 40); stay(g, 'serenia');
  check(cond(g, 'peoples_halfelf_years'), '예순 넘은 하프엘프에게 같은 얼굴 사건이 없다');
  fire(g, 'peoples_halfelf_years', 0);
  check(!cond(g, 'peoples_halfelf_years'), '같은 얼굴 사건이 또 뜬다');
}
// 6) 종족끼리의 사이: 저절로 오르내리고, 마탑과 교단의 날이 서면 인간과 사이가 나빠진다
{
  const g = newGame({ name: '사이', sex: 'f', familyId: 'farmer', mode: 'free', seed: 360 });
  const news = [], rng = makeRng({ s: 7 });
  g.tower ??= {}; 
  for (let i = 0; i < 300; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; for (const t of WORLD_TICKS) { g.tower.friction = 80; t(g, rng, (x) => news.push(x), () => {}); } }
  check(PS(g).ties['beast|human'] < -32, `교단이 날을 세워도 수인과 인간 사이가 그대로다 (${PS(g).ties['beast|human']})`);
  check(news.every((x) => !BAD.test(x)), '세상 소식 글이 이상하다');
}
// 7) 예전 저장과 대 잇기
{
  const g = newGame({ name: '저장', sex: 'm', familyId: 'farmer', mode: 'free', seed: 370 });
  const c = JSON.parse(JSON.stringify(g)); delete c.peoples; setNextId(c.nextId);
  runHooks('migrate', c);
  check(c.peoples?.custom?.dwarf === 0 && c.peoples.ties['dwarf|elf'] === -25, '예전 저장에 종족 땅 상태가 채워지지 않는다');
  const P = PS(g); P.standing.elf = 90; P.custom.elf = 3; P.named.elf = '시험';
  runHooks('heir', g);
  check(P.custom.elf === 0 && !P.named.elf && P.standing.elf > 40 && P.standing.elf < 90, '대를 이었는데 풍습·이름이 남거나 집안의 평이 사라졌다');
}
// 8) 40년: 아무 행동이나 해도 깨지지 않는다
{
  let years = 0, customs = 0;
  const fams = ['elf_exile', 'dwarf_smith', 'beast_hunter', 'half_elf'];
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '세월', sex: run % 2 ? 'm' : 'f', familyId: fams[run], mode: 'free', seed: 990 + run });
    if (run >= 2) { grown(g, 16); stay(g, ['fur', 'silverleaf'][run - 2]); }
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('peoples_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.5) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1)));
    }
    years += m / 12;
    const P = PS(g);
    customs += Object.values(P.custom).reduce((a, b) => a + b, 0);
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of P.log) if (BAD.test(l.text)) { check(false, `종족 기록 이상: ${l.text}`); break; }
    check(Object.values(P.ties).every(Number.isFinite) && Object.values(P.standing).every((v) => v == null || (v >= 0 && v <= 100)), '종족 숫자가 깨졌다');
    check(!BAD.test(JSON.stringify(peoplesInfo(g)).replace(/null/g, '0')) && !BAD.test(peoplesLine(g)), '화면 정보에 이상한 값');
  }
  console.log(`종족 땅 ${Math.round(years)}년 4판: 익힌 풍습 ${customs}`);
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
