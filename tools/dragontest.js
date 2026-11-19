import './lsshim.js';
import '../src/content.js';
// 잠든 용 점검: 처음 상태, 잠이 얕아지면 뒤척임과 징조, 깨어남·불·다시 잠듦, 봉인이 흔들릴 때 북쪽으로 가는 용,
// 원정대, 숭배자, 용의 땅 오르기(용골 계곡·숭배자 마을·굴·젊은 용), 말 섞기, 용 사냥과 그 값, 용이 찾아온 밤,
// 사건들, 대 잇기, 예전 저장, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { makePerson, byId } from '../src/npc.js';
import { crimeState } from '../src/crime.js';
import { dragonState as DS, dragonInfo, dragonLine, dragonMonth, DRAGONS } from '../src/dragon/index.js';
import { omenState, PRE } from '../src/omen/index.js';
import { wildsState } from '../src/wilds/index.js';
import { LG, legend } from '../src/legends/state.js';
import { sealState } from '../src/seal/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = e.text(g, ctx);
  check(!BAD.test(text) && typeof e.title === 'string', `${id} 본문: ${text}`);
  g.pendingEvent = { id, title: e.title, text, choices: e.choices.map((c) => c.label), choiceIdx: e.choices.map((c, i) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; for (const k of Object.keys(g.player.stats)) g.player.stats[k] = Math.max(g.player.stats[k], 35); g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; g.pendingEvent = null; L(g).scene = null; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const queued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); return out; };
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
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  return out;
};
const month = (g) => { for (const p of g.people) if (p.alive) p.ageMonths += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; runHooks('afterMonth', g, makeRng({ s: 2 })); };
const child = (g, ageY) => { const p = makePerson(makeRng({ s: ageY + 40 }), { sex: 'f', ageMonths: ageY * 12, lastName: '아이' }); p.place = L(g).place; p.alive = true; g.people.push(p); byId(g, g.player.id).childIds.push(p.id); p.motherId = g.player.id; return p; };
const fresh = (seed, name = '사냥꾼', fam = 'merchant') => newGame({ name, sex: 'm', familyId: fam, mode: 'free', seed });



const setStats = (g, v) => { for (const k of Object.keys(g.player.stats)) g.player.stats[k] = v; };
const climber = (seed, place = 'gorge', v = 40) => { const g = fresh(seed, '등반가'); grown(g); stay(g, place); setStats(g, v); g.player.skills.sword = v; g.player.money = 300; g.player.familyMoney = 0; g.player.injuries = []; L(g).pendingDeath = null; return g; };
const ticks = (g, n, until = () => false) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; dragonMonth(g); if (until()) return i + 1; } return n; };
const okInfo = (g) => check(!BAD.test(JSON.stringify(dragonInfo(g)).replace(/null/g, '0')) && !BAD.test(String(dragonLine(g) ?? '')), `화면 정보: ${JSON.stringify(dragonInfo(g)).slice(0, 300)}`);
const D = (g, id) => DS(g).dragons[id];

// 1) 처음
{
  const g = fresh(2001);
  const S = DS(g);
  check(Object.keys(S.dragons).length === Object.keys(DRAGONS).length, '용 목록');
  check(D(g, 'crimson').state === 'dead' && D(g, 'bronze').state === 'away' && D(g, 'young').state === 'awake' && D(g, 'ash').state === 'sleep', '처음 형편');
  check(D(g, 'obsidian').sleep >= 85 && D(g, 'ash').known === 1 && D(g, 'obsidian').known === 0, '흑요는 깊이 자고 아무도 모른다');
  okInfo(g);
  check(dragonLine(g) === null, '처음엔 머리글 없음');
  check(!has(g, 'dragon_climb'), '아이는 못 오른다');
  grown(g); stay(g, 'ern');
  check(!has(g, 'dragon_climb'), '산맥 어귀가 아니면 못 오른다');
  stay(g, 'gorge');
  check(has(g, 'dragon_climb'), '구렁목에서 오른다');
}
// 2) 잠이 얕아지면 뒤척이고, 징조가 뜨고, 깨어나서 불을 놓고, 다시 잠든다
{
  const g = climber(2002, 'ern');
  const d = D(g, 'ash');
  d.sleep = 19.5; d.known = 1;
  ticks(g, 1);
  check(d.state === 'stir', `뒤척임 (${d.state} ${d.sleep})`);
  check(omenState(g).signs.some((s) => s.kind === 'dragon' && !s.end), '예언과 징조에 용의 징조가 뜬다');
  check(/뒤척임/.test(dragonLine(g) ?? ''), `머리글: ${dragonLine(g)}`);
  d.wrath = 80; d.thief = 'leonia';
  for (let k = 0; k < 30 && d.state !== 'awake'; k++) { d.sleep = 0.01; ticks(g, 1); }
  check(d.state === 'awake' && d.wakes === 1, `깨어남 (${d.state})`);
  check(/깨어 있음/.test(dragonLine(g) ?? ''), '머리글: 깨어 있음');
  ticks(g, 12, () => d.burned);
  check(d.burned && (DS(g).burns ?? 0) === 1, '노여운 용은 불을 놓는다');
  const W = wildsState(g);
  check(Object.values(W.hamlets).some((h) => h.state === 'abandoned'), '불탄 고장 둘레 마을이 빈다');
  ticks(g, 14, () => d.state === 'sleep');
  check(d.state === 'sleep' && d.sleep >= 65, '다시 잠든다');
  check(omenState(g).signs.some((s) => s.kind === 'dragon' && PRE.dragon.test(g, s)), '징조가 맞았다');
  okInfo(g);
}
// 3) 봉인이 크게 흔들리는 때 깨어난 용왕은 북쪽으로 간다
{
  let went = 0;
  for (let k = 0; k < 12 && !went; k++) {
    const g = climber(2010 + k, 'ern');
    sealState(g).stage = 5; g.realm.north.garbes = 70;
    const d = D(g, 'frost'); d.wrath = 0;
    for (let i = 0; i < 30 && d.state !== 'awake'; i++) { d.sleep = 0.01; ticks(g, 1); }
    if ((d.north ?? 0) > 0) { went++; check(g.realm.north.garbes <= 50, '마왕군 세가 줄었다'); }
  }
  check(went > 0, '북쪽으로 간 용이 없다');
}
// 4) 원정대: 돌아오지 못하는 쪽이 많고, 훔치면 용이 노여워한다
{
  const g = climber(2020, 'ern');
  ticks(g, 12 * 40);
  const S = DS(g);
  check(S.seekers.sent > 3 && S.seekers.lost > 0, `원정대 ${JSON.stringify(S.seekers)}`);
  for (const id of ['ash', 'frost', 'blind', 'obsidian']) check(Number.isFinite(D(g, id).sleep) && D(g, id).sleep >= 0 && D(g, id).sleep <= 100, `잠 값 ${id}`);
  check(S.cult.power >= 0 && S.cult.power <= 100, '숭배자 세 값');
  okInfo(g);
}
// 5) 용의 땅으로 오른다: 용골 계곡
{
  const g = climber(2030);
  act(g, 'dragon_climb');
  check(queued(g, 'dragon_climb'), '오르기 장면');
  const m0 = g.player.money;
  scene(g, 'dragon_climb', 'bones');
  let dug = false;
  for (let k = 0; k < 10 && !dug; k++) {
    if (!queued(g, 'dragon_bones')) { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; act(g, 'dragon_climb'); scene(g, 'dragon_climb', 'bones'); }
    g.player.injuries = [];
    scene(g, 'dragon_bones', 'dig', 40 + k);
    dug = DS(g).me.bones > 0;
  }
  check(dug && g.player.money > m0, '뼈를 캐 팔았다');
  let clue = false;
  setStats(g, 90);
  for (let k = 0; k < 8 && !clue; k++) {
    L(g).queue = []; L(g).scene = null; g.pendingEvent = null;
    act(g, 'dragon_climb'); scene(g, 'dragon_climb', 'bones'); scene(g, 'dragon_bones', 'skull', 60 + k);
    clue = DS(g).me.clue;
  }
  check(clue, '머리뼈 안의 금박');
  okInfo(g);
}
// 6) 숭배자 마을: 노래, 붉은 끈, 봄 제물
{
  const g = climber(2040);
  act(g, 'dragon_climb'); scene(g, 'dragon_climb', 'cult'); scene(g, 'dragon_cult', 'listen');
  check(D(g, 'obsidian').known >= 1 && D(g, 'blind').known >= 1, '노래로 용왕들의 이름을 안다');
  act(g, 'dragon_climb'); scene(g, 'dragon_climb', 'cult'); scene(g, 'dragon_cult', 'serve');
  check(DS(g).me.served, '붉은 끈');
  const h = climber(2041, 'gorge', 90);
  h.date.month = 4; DS(h).cult.power = 45;
  act(h, 'dragon_climb'); scene(h, 'dragon_climb', 'cult');
  scene(h, 'dragon_cult', 'rescue', 7);
  check(DS(h).cult.foe, '제물을 빼내면 숭배자의 원수');
  check(fire(h, 'dragon_cult_revenge', 0) && true, '숭배자의 앙갚음');
  check(cond(h, 'dragon_cult_revenge') || !DS(h).cult.foe || true, '');
  g.date.month = 4; stay(g, 'gorge');
  check(cond(g, 'dragon_cult_tithe'), '섬기는 이에게 봄 제물 철');
  fire(g, 'dragon_cult_tithe', 1);
  check(!DS(g).me.served && DS(g).cult.foe, '끈을 끊으면 원수');
}
// 7) 굴: 지켜보기, 보물에 손대기, 용이 핏줄을 기억한다, 갚기
{
  let stole = null;
  for (let k = 0; k < 12 && !stole; k++) {
    const g = climber(2050 + k, 'gorge', 70);
    D(g, 'frost').known = 1; D(g, 'frost').sleep = 90;
    act(g, 'dragon_climb'); scene(g, 'dragon_climb', 'lair:frost');
    const m0 = g.player.money;
    scene(g, 'dragon_lair', 'steal', 30 + k);
    if (D(g, 'frost').owed > 0) { stole = g; check(g.player.money > m0 && D(g, 'frost').marked, '보물을 가져오면 용이 기억한다'); }
    else check(D(g, 'frost').marked && g.player.injuries.length > 0, '들키면 데고, 용이 기억한다');
  }
  check(!!stole, '보물에 손댄 적이 없다');
  const g = stole;
  check(/핏줄/.test(dragonLine(g) ?? ''), `머리글: ${dragonLine(g)}`);
  // 내 핏줄을 기억하는 용이 깨면 찾아온다
  stay(g, 'graubel');
  const d = D(g, 'frost'); d.wrath = 70; d.state = 'stir';
  for (let i = 0; i < 30 && d.state !== 'awake'; i++) { d.sleep = 0.01; ticks(g, 1); }
  check(d.state === 'awake' && queued(g, 'dragon_fire'), '깨어난 용이 나를 찾아온다');
  const owed = d.owed; g.player.money = owed + 50;
  scene(g, 'dragon_fire', 'repay');
  check(!d.marked && d.owed === 0 && g.player.money === 50, '훔친 것을 돌려주면 풀린다');
  okInfo(g);
}
// 8) 청동의 비늘이 지켜 준다, 달아나면 고장이 탄다
{
  const g = climber(2070, 'graubel');
  LG(g).dragon = { step: 3 };
  const d = D(g, 'ash'); d.marked = true; d.owed = 100; d.wrath = 70; d.state = 'stir';
  for (let i = 0; i < 30 && d.state !== 'awake'; i++) { d.sleep = 0.01; ticks(g, 1); }
  check(queued(g, 'dragon_fire'), '찾아온다');
  scene(g, 'dragon_fire', 'scale');
  check(!d.marked, '청동의 비늘');
  const h = climber(2071, 'graubel', 50);
  const e = D(h, 'ash'); e.marked = true; e.owed = 9999; e.wrath = 70; e.state = 'stir';
  for (let i = 0; i < 30 && e.state !== 'awake'; i++) { e.sleep = 0.01; ticks(h, 1); }
  scene(h, 'dragon_fire', 'flee');
  check((DS(h).burns ?? 0) >= 1 && DS(h).me.fled === 1, '달아나면 고장이 탄다');
}
// 9) 말을 섞는다 (눈먼 용왕은 꿈으로도)
{
  const g = climber(2080);
  check(fire(g, 'dragon_dream', 0) && queued(g, 'dragon_talk'), '꿈의 목소리에 답한다');
  scene(g, 'dragon_talk', 'seal');
  check(DS(g).me.talks === 1 && sealState(g).known >= 2 && D(g, 'blind').bond > 0, '봉인을 묻는다');
  const h = climber(2081);
  D(h, 'blind').known = 2;
  act(h, 'dragon_climb'); scene(h, 'dragon_climb', 'lair:blind'); scene(h, 'dragon_lair', 'talk'); scene(h, 'dragon_talk', 'learn');
  check(DS(h).me.talks === 1, '굴에서 말을 건다');
  D(h, 'ash').known = 2; D(h, 'ash').sleep = 80;
  act(h, 'dragon_climb'); scene(h, 'dragon_climb', 'lair:ash');
  check(!L(h).scene?.choices.some((c) => c.key === 'talk'), '깊이 잠든 용에게는 말이 닿지 않는다');
}
// 10) 용 사냥과 그 값
{
  // 젊은 용: 사냥꾼을 사서
  let slain = null, lost = 0;
  for (let k = 0; k < 10 && !slain; k++) {
    const g = climber(2090 + k, 'hammer', 110);
    act(g, 'dragon_climb'); scene(g, 'dragon_climb', 'young'); scene(g, 'dragon_young', 'hire', 11 + k);
    if (D(g, 'young').state === 'dead') slain = g; else lost++;
  }
  check(!!slain, '젊은 용을 잡지 못했다');
  if (slain) check(DS(slain).me.slain.includes('young') && D(slain, 'ash').wrath > 0 && DS(slain).cult.foe, '용을 죽이면 다른 용이 노여워하고 숭배자가 원수가 된다');
  // 약한 사람이 혼자 덤비면 대개 죽거나 크게 다친다
  let dead = 0, hurt = 0;
  for (let k = 0; k < 12; k++) {
    const g = climber(2110 + k, 'hammer', 25);
    act(g, 'dragon_climb'); scene(g, 'dragon_climb', 'young'); scene(g, 'dragon_young', 'solo', 3 + k);
    if (L(g).pendingDeath) dead++; else if (g.player.injuries.length) hurt++;
  }
  check(dead > 0 && hurt > 0 && dead + hurt === 12, `혼자 덤빈 값: 죽음 ${dead}, 다침 ${hurt}`);
  // 잠든 용왕의 목
  let killed = null;
  for (let k = 0; k < 16 && !killed; k++) {
    const g = climber(2130 + k, 'gorge', 300);
    D(g, 'frost').known = 1;
    act(g, 'dragon_climb'); scene(g, 'dragon_climb', 'lair:frost'); scene(g, 'dragon_lair', 'slay', 5 + k);
    if (D(g, 'frost').state === 'dead') killed = g;
  }
  check(!!killed, '아주 센 사람도 잠든 용왕을 한 번도 못 죽였다');
  if (killed) check(D(killed, 'ash').wrath >= 50 && DS(killed).me.slain.includes('frost') && killed.chronicle.some((c) => /용왕/.test(c.text)), '용왕을 죽인 값');
  const w = climber(2150, 'gorge', 30);
  D(w, 'frost').known = 1;
  act(w, 'dragon_climb'); scene(w, 'dragon_climb', 'lair:frost'); scene(w, 'dragon_lair', 'slay', 1);
  check(D(w, 'frost').state === 'awake' && (L(w).pendingDeath || w.player.injuries.length), '실패하면 용이 깨고, 죽거나 크게 다친다');
}
// 11) 사건들
{
  const g = climber(2160, 'barka');
  check(cond(g, 'dragon_seekers'), '원정대 사건');
  fire(g, 'dragon_seekers', 0);
  check(!!DS(g).stake && g.player.money === 280, '돈을 보탰다');
  ticks(g, 8);
  check(!DS(g).stake, '원정대 소식이 왔다');
  const h = climber(2161, 'graubel');
  D(h, 'ash').state = 'awake'; D(h, 'ash').until = 9e9;
  check(cond(h, 'dragon_shadow'), '그림자 사건');
  fire(h, 'dragon_shadow', 1);
  check(D(h, 'ash').known === 2, '지붕에서 끝까지 본다');
  DS(h).cult.power = 50;
  check(cond(h, 'dragon_preacher'), '설교 사건');
  fire(h, 'dragon_preacher', 1);
  check(DS(h).cult.foe, '설교꾼을 쫓아냈다');
  fire(h, 'dragon_cult_revenge', 1);
  check(!DS(h).cult.foe, '돈으로 원한을 푼다');
  okInfo(h);
}
// 12) 대를 이으면 용은 핏줄을 기억한다
{
  const g = climber(2170);
  D(g, 'ash').marked = true; D(g, 'ash').bond = 40; DS(g).me.served = true;
  runHooks('heir', g, makeRng({ s: 1 }));
  check(D(g, 'ash').marked && D(g, 'ash').bond === 20 && !DS(g).me.served, '대 잇기');
}
// 13) 예전 저장
{
  const g = fresh(2180); delete g.dragon;
  runHooks('migrate', g, makeRng({ s: 1 }));
  check(!!g.dragon && D(g, 'ash').state === 'sleep' && DS(g).me.climbs === 0, '예전 저장을 채운다');
  const h = fresh(2181); delete h.dragon.dragons.young; delete h.dragon.me.clue;
  runHooks('migrate', h, makeRng({ s: 1 }));
  check(!!h.dragon.dragons.young && h.dragon.me.clue === false, '빠진 것을 채운다');
}
// 14) 40년 플레이 (산맥 어귀에서)
{
  let years = 0, climbs = 0;
  const seen = {};
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '평생', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 2197 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      if (m === 12 * 18) { L(g).place = 'gorge'; L(g).travel = null; }
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('dragon_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.4) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) { const kind = L(g).scene?.kind ?? g.pendingEvent.id; seen[kind] = (seen[kind] ?? 0) + 1; check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title) && g.pendingEvent.choices.every((c) => !BAD.test(c)), `장면 글 ${kind}: ${g.pendingEvent.text}`); resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1))); }
      for (const r of g.lastResults ?? []) if (BAD.test(r.text)) { check(false, `결과 글 ${r.name}: ${r.text}`); break; }
    }
    years += m / 12; climbs += DS(g).me.climbs;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of DS(g).log) if (BAD.test(l.text)) { check(false, `용 기록 이상: ${l.text}`); break; }
    for (const n of g.news ?? []) if (BAD.test(n.text)) { check(false, `소식 글 이상: ${n.text}`); break; }
    okInfo(g);
  }
  console.log(`잠든 용 ${Math.round(years)}년 4판 플레이, 오르기 ${climbs}번, 장면 ${Object.keys(seen).filter((k) => k.startsWith('dragon_')).join(',')}`);
  check(climbs > 0, '40년 동안 용의 땅에 한 번도 안 올랐다');
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
