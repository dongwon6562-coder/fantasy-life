import './lsshim.js';
import '../src/content.js';

// 달마다 기세와 바깥 마을, 대 잇기, 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, circleOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { makePerson, byId, bodyAgeOf, ageYears } from '../src/npc.js';
import { playerPower } from '../src/adventure/combat.js';
import { encodeSave, decodeSave } from '../src/save.js';

const T0 = Date.now();
SCENE_STRICT.on = true;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])|\(으\)|을\(를\)|이\(가\)/;
const BAD0 = /undefined|NaN|\[object/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = typeof e.text === 'function' ? e.text(g, ctx) : e.text;
  check(!BAD.test(text), `${id} 본문: ${text}`);
  const shown = e.choices.map((c, i) => [c, i]).filter(([c]) => !c.show || c.show(g, ctx));
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(([c]) => c.label), choiceIdx: shown.map(([, i]) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  if (process.env.SHOW) console.log(`[${id}] ${text}\n  > ${out}`);
  return out;
};
const grown = (g, y) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; g.pendingEvent = null; L(g).scene = null; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const queued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); if (process.env.SHOW) console.log(`[${id}] > ${out}`); return out; };
const scene = (g, kind, key, seed = 5) => {
  let s;
  if (L(g).scene?.kind === kind && g.pendingEvent?.id === 'life_scene') s = L(g).scene;
  else {
    const q = L(g).queue, i = q.findIndex((x) => x.kind === kind);
    if (i < 0) { check(false, `장면 ${kind}이 대기열에 없다`); return ''; }
    [s] = q.splice(i, 1);
    g.pendingEvent = null; L(g).scene = null;
    if (!showScene(g, s, { force: true })) { check(false, `장면 ${kind}을 띄우지 못했다`); return ''; }
  }
  check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title), `${kind} 글: ${g.pendingEvent.title} / ${g.pendingEvent.text}`);
  const idx = key == null ? 0 : s.choices.findIndex((c) => c.key === key);
  check(idx >= 0, `${kind}에 선택지 ${key}가 없다 (${s.choices.map((c) => c.key)})`);
  const out = resolveEvent(g, makeRng({ s: seed }), Math.max(0, idx));
  if (process.env.SHOW) console.log(`[${kind}/${key}] ${g.pendingEvent?.text ?? ""}\n  > ${out}`);
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  return out;
};
import { SPELLS, SCHOOL_IDS, magicInfo, magicState, learnable, knownSpells, affinityOf, chantWord, spellOf } from '../src/magic/index.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { iconName } from '../src/art/icons.js';
import { setRace } from '../src/races/index.js';

// 42단계 마법 깊게 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 71) => newGame({ name: '루돌프', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const textOK = (arr, what) => { for (const t of arr) check(typeof t === 'string' && !BAD.test(t), `${what}: ${t}`); };
const mageAt = (c = 3, seed = 77) => {
  const g = mk(seed); grown(g, 22); stay(g, 'leocast'); g.player.money = 80;
  const p = g.player; p.manaAwakened = true;
  const MANA = [0, 15, 40, 80, 140, 230, 360], SK = [0, 15, 30, 45, 60, 72, 84];
  p.mana = MANA[c] + 1; p.skills.magic = SK[c] + 1; magicState(g).peak = circleOf(g);
  return g;
};
const study = (g, n = 30) => { const before = knownSpells(g).length; for (let i = 0; i < n && learnable(g).length; i++) act(g, 'spell_study', 20 + i); return knownSpells(g).length - before; };

// 1. 주문표: 예순 남짓, 계열·서클·쓰임이 다 있고 7서클 주문은 없다
{
  check(SPELLS.length >= 55 && SPELLS.length <= 70, `주문 수 ${SPELLS.length}`);
  check(new Set(SPELLS.map((s) => s.id)).size === SPELLS.length, '주문 이름 겹침');
  for (const s of SPELLS) {
    check(['common', ...SCHOOL_IDS].includes(s.school), `계열 ${s.id}`);
    check(['life', 'heal', 'job', 'ward', 'combat'].includes(s.use), `쓰임 ${s.id}`);
    check(s.circle >= 1 && s.circle <= 6, `서클 ${s.id} ${s.circle}`);
    textOK([s.name, s.desc], '주문 글');
  }
  for (const k of SCHOOL_IDS) { const l = SPELLS.filter((s) => s.school === k); check(l.length >= 5 && l.some((s) => s.circle === 1), `계열마다 다섯 넘게, 1서클부터 (${k} ${l.length})`); }
  for (const id of ['sp_school', 'sp_chant', 'sp_create']) check(iconName(ACTIONS.find((a) => a.id === id)) === { sp_school: 'rune', sp_chant: 'magic', sp_create: 'quill' }[id], `${id} 아이콘`);
}
// 2. 계열 고르기: 몸에 맞는 계열, 고르기 전엔 옛 주문만, 고르면 제 계열 새 주문
{
  const g = mageAt(3);
  check(learnable(g).every((s) => ['ember', 'purify', 'light', 'firebolt', 'mend', 'sense', 'icebolt', 'windblade', 'earthwall', 'suture', 'infuse', 'firering', 'ward', 'calm', 'cure'].includes(s.id) || s.school === 'common'), '계열 전엔 옛 주문과 기초술만');
  check(has(g, 'sp_school'), '계열 정하기가 보인다');
  const kid = mk(5); kid.player.manaAwakened = true; check(!has(kid, 'sp_school'), '아이와 마력 없는 사람은 못 정한다');
  const elf = mageAt(2, 90); setRace(elf.player.isPlayer ? elf.people.find((p) => p.isPlayer) : elf.people[0], 'elf', makeRng({ s: 1 }));
  const aff = affinityOf(elf).map((a) => a.id); check(aff.includes('life') || aff.includes('wind'), `엘프는 생명·바람 (${aff})`);
  act(g, 'sp_school'); scene(g, 'sp_school', 'fire');
  check(g.magic.school === 'fire' && !has(g, 'sp_school'), '불을 골랐다');
  check(learnable(g).some((s) => s.id === 'kiln') && !learnable(g).some((s) => s.id === 'rain' || s.id === 'darkbolt'), '불 새 주문은 되고 남의 계열 새 주문은 안 된다');
  const n = study(g, 60);
  check(n >= 4 && g.magic.known.includes('kiln') && g.magic.known.includes('searing'), `주문을 익힌다 (${n}, ${g.magic.known})`);
  // 맞서는 계열은 더디다
  const speed = (school, id) => { const h = mageAt(3, 33); h.magic.school = school; h.magic.study = { id, prog: 0 }; act(h, 'spell_study', 5); return h.magic.study?.prog ?? 1; };
  check(speed('fire', 'firering') > speed('water', 'firering'), '맞서는 계열은 배우기 더디다');
  const info = magicInfo(g);
  check(info.school.name === '불' && info.schools.some((x) => x.id === 'fire' && x.spells.length >= 6) && info.chant.word, '주문서 한 장');
  textOK([info.chant.word, info.strain.word, ...info.schools.flatMap((x) => x.spells.map((s) => s.name))], '주문서 글');
}
// 3. 영창 줄이기와 무영창: 솜씨가 모자라면 고개를 못 넘는다
{
  const g = mageAt(2); g.player.stats.wil = 40;
  for (let i = 0; i < 80; i++) { act(g, 'sp_chant', i); g.magic.strain = 0; g.player.fatigue = 0; }
  check(g.magic.chant >= 30 && g.magic.chant < 60, `서클 낮고 솜씨 모자라면 짧은 영창까지 (${g.magic.chant})`);
  const h = mageAt(4); h.player.stats.wil = 70; h.player.skills.magic = 75;
  const p0 = playerPower(h);
  for (let i = 0; i < 400 && h.magic.chant < 90; i++) { act(h, 'sp_chant', i); h.magic.strain = 0; h.player.fatigue = 0; }
  check(h.magic.chant >= 90 && chantWord(h.magic.chant) === '무영창', `무영창 (${h.magic.chant})`);
  check(playerPower(h) > p0 + 10, '무영창이면 싸움에서 빠르다');
  check(!has(h, 'sp_chant'), '다 이룬 수련은 안 보인다');
}
// 4. 마력 폭주와 대가
{
  const g = mageAt(3); g.magic.known.push('purify', 'mend');
  check(!cond(g, 'sp_overload'), '무리하지 않으면 폭주 없다');
  for (let i = 0; i < 12; i++) act(g, 'spell_work', i);
  check(g.magic.strain >= 70, `일을 몰아 하면 무리가 쌓인다 (${g.magic.strain})`);
  check(cond(g, 'sp_overload'), '폭주 사건');
  let scars = 0, manaDrop = 0;
  for (let seed = 1; seed <= 10; seed++) { const h = mageAt(3, 40 + seed); h.player.stats.wil = 10; h.magic.strain = 90; const m0 = h.player.mana; fire(h, 'sp_overload', 0, seed); scars += h.magic.scars; if (h.player.mana < m0) manaDrop++; }
  check(scars >= 2 && manaDrop >= 2, `거둬들이다 놓치면 흉터와 마력이 줄어든다 (${scars}, ${manaDrop})`);
  const a = mageAt(3); a.magic.strain = 90; fire(a, 'sp_overload', 1); check(a.magic.strain === 0 && a.player.fatigue === 100, '하늘로 흘려보내면 탈진');
  const b = mageAt(3); b.magic.strain = 90; fire(b, 'sp_overload', 2); check(b.player.money >= 0 && b.magic.strain === 10, '터뜨리면 물어 준다');
  const c = mageAt(3); c.magic.strain = 50; runHooks('afterMonth', c, rngOf(c)); check(c.magic.strain < 40, `달마다 무리가 가신다 (${c.magic.strain})`);
}
// 5. 서클이 오를 때 장면
{
  const g = mageAt(2);
  g.player.mana = 81; g.player.skills.magic = 46;
  runHooks('afterMonth', g, rngOf(g));
  check(queued(g, 'sp_circle'), '서클이 오르면 장면');
  for (const key of ['quiet', 'tell', 'test']) { const h = mageAt(2, 50); h.player.mana = 81; h.player.skills.magic = 46; runHooks('afterMonth', h, rngOf(h)); scene(h, 'sp_circle', key); }
  check(g.magic.peak === 3, '오른 서클을 기억한다');
  runHooks('afterMonth', g, rngOf(g)); L(g).queue = L(g).queue.filter((x) => x.kind !== 'sp_circle'); runHooks('afterMonth', g, rngOf(g)); check(!queued(g, 'sp_circle'), '같은 서클로 두 번 안 뜬다');
}
// 6. 내 주문 짓기, 이름, 일, 가르치기, 대를 넘음
{
  const g = mageAt(3); g.player.stats.int = 70;
  check(!has(g, 'sp_create'), '계열 없이는 못 짓는다');
  g.magic.school = 'water';
  check(has(g, 'sp_create'), '주문 짓기가 보인다');
  act(g, 'sp_create'); scene(g, 'sp_create', 'life');
  check(g.magic.making?.use === 'life', '지을 주문을 정했다');
  let k = 0; while (!queued(g, 'sp_name') && k++ < 60) { act(g, 'sp_create', 100 + k); g.magic.strain = 0; }
  check(queued(g, 'sp_name'), `다 지었다 (${k}달)`);
  scene(g, 'sp_name', 'n1');
  const made = g.magic.made[0];
  check(made && made.learned && made.mine && made.school === 'water' && made.use === 'life' && made.name.includes('루돌프'), `이름 붙인 주문 ${JSON.stringify(made)}`);
  check(spellOf(g, made.id) === made && knownSpells(g).includes(made), '지은 주문도 아는 주문');
  const works = []; for (let i = 0; i < 40; i++) { works.push(act(g, 'spell_work', 200 + i)); g.magic.strain = 0; }
  check(works.some((t) => t.includes(made.name)), '지은 주문으로 일한다');
  check(cond(g, 'sp_teach'), '배우러 오는 사람');
  for (let i = 0; i < 3; i++) fire(g, 'sp_teach', i, 300 + i);
  check(made.taught === 2, `가르쳤다 (${made.taught})`);
  fire(g, 'sp_teach', 0, 400); check(made.taught === 3, '셋째');
  // 대를 이으면 집안 마도서로
  runHooks('heir', g);
  check(g.magic.made.length === 1 && !g.magic.made[0].learned && !g.magic.school && g.magic.known.length === 0, '대를 이으면 마도서만 남는다');
  g.player.manaAwakened = true; g.player.mana = 81; g.player.skills.magic = 46;
  check(learnable(g).some((s) => s.id === made.id), '집안 주문을 익힐 수 있다');
  let n = 0; while (!g.magic.made[0].learned && n++ < 80) { g.magic.study = { id: made.id, prog: g.magic.study?.prog ?? 0 }; act(g, 'spell_study', 500 + n); }
  check(g.magic.made[0].learned && !g.magic.made[0].mine, `선대 주문을 익혔다 (${n})`);
}
// 7. 이명
{
  const g = mageAt(3); g.magic.school = 'shadow'; L(g).renown = 30;
  check(cond(g, 'sp_epithet'), '이명 사건');
  fire(g, 'sp_epithet', 0);
  check(g.magic.title && magicInfo(g).titled.endsWith('루돌프'), `이명 ${g.magic.title}`);
  check(!cond(g, 'sp_epithet'), '이명은 한 번');
  const h = mageAt(3, 61); h.magic.chant = 95; fire(h, 'sp_epithet', 0); check(h.magic.title === '말 없는', '무영창이면 말 없는');
  const r = mageAt(3, 62); L(r).renown = 30; fire(r, 'sp_epithet', 2); check(!r.magic.title, '마다할 수 있다');
}
// 8. 옛 저장과 저장 왕복
{
  const g = mageAt(3); g.magic = { known: ['ember', 'mend'], certified: 1, exam: null, study: null, works: 3 };
  runHooks('migrate', g);
  check(g.magic.school === null && g.magic.chant === 0 && Array.isArray(g.magic.made) && g.magic.peak === 3 && g.magic.known.length === 2, '옛 저장');
  const back = decodeSave(encodeSave(g)); check(back.magic.peak === 3 && back.magic.certified === 1, '저장 왕복');
  const old = structuredClone(g); delete old.magic; runHooks('migrate', old); check(!old.magic || old.magic.known.length === 0, '마법 없던 저장');
}
// 9. 무작위 60년: 고서클은 드물고, 글이 새지 않는다
{
  let high = 0, schools = 0, made = 0, titles = 0, circles = 0;
  for (let s = 0; s < 3; s++) {
    const h = mk(141 + s); grown(h, 14); stay(h, 'leocast'); h.player.manaAwakened = true; h.player.manaPotential = 1.2; h.player.mana = 20; h.player.skills.magic = 16;
    for (let m = 0; m < 12 * 60; m++) {
      if (h.over) { const hh = heirsOf(h)[0]; if (!hh) break; becomeHeir(h, rngOf(h), hh); if (h.over) break; }
      const acts = availableActions(h);
      const want = ['sp_school', 'sp_create', 'spell_study', 'sp_chant', 'meditate', 'magic_selfstudy', 'spell_work'];
      const pick = (i) => (acts.find((x) => x.id === want[(m + i) % want.length]) ?? acts.find((x) => x.id === 'rest') ?? acts[0]).id;
      endMonth(h, Array.from({ length: slotsFor(h) }, (_, i) => ({ id: pick(i) })));
      let k = 0; while (h.pendingEvent && k++ < 6) { if (L(h).scene?.kind === 'sp_circle') circles++; resolveEvent(h, rngOf(h), 0); }
      if (circleOf(h) >= 5) high++;
    }
    const m = h.magic ?? {};
    if (m.school) schools++; made += (m.made ?? []).length; if (m.title) titles++;
    textOK([JSON.stringify(magicInfo(h)).replace(/null/g, '')], '60년 주문서');
    if (s === 0) console.log(`  판 1: 서클 ${circleOf(h)}, 계열 ${m.school}, 아는 주문 ${m.known?.length}, 영창 ${Math.round(m.chant ?? 0)}, 지은 주문 ${(m.made ?? []).map((x) => x.name)}, 이명 ${m.title}, 폭주 ${m.overloads}`);
  }
  console.log(`  60년×3: 계열 ${schools}, 지은 주문 ${made}, 이명 ${titles}, 서클 장면 ${circles}, 5서클 넘은 달 ${high}`);
  check(circles >= 3, `서클 장면 (${circles})`);
  check(high < 12 * 60 * 3 * 0.3, '5서클은 여전히 드물다');
}
console.log(`spelltest ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
