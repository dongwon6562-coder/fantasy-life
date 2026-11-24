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
import { starsInfo, starsLine, starsState, starsMonth, skyEvent, starsAfterMonth } from '../src/stars/index.js';
import { OBS_IDS, SKY, mi, fresh } from '../src/stars/state.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { MAP_INFO } from '../src/art/map.js';
import { iconName } from '../src/art/icons.js';
import { PLACES } from '../src/places.js';

// 41단계 하늘의 별과 점성술사 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 71) => newGame({ name: '루돌프', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const S = starsState;
const textOK = (arr, what) => { for (const t of arr) check(!BAD.test(t), `${what}: ${t}`); };
const tick = (g, n = 1, news = []) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; starsMonth(g, (t) => news.push(t)); } return news; };
const adult = (pl = 'leocast') => { const g = mk(77); grown(g, 22); stay(g, pl); g.player.money = 60; return g; };

// 1. 새 판과 천문대
{
  const g = mk();
  check(g.stars && OBS_IDS.length === 4, `천문대 넷 (${OBS_IDS})`);
  for (const k of OBS_IDS) check(!g.stars.obs[k].glass, `처음엔 망원경이 없다 (${k})`);
}
// 2. 플레이어 없이 150년: 하늘 사건, 일식 예고, 달력 다툼, 망원경은 spyglass 뒤에만
{
  let kinds = new Set(), eclipses = 0, told = 0, disputes = 0, reforms = 0, kept = 0, glassEarly = 0, glass = 0, found = 0, heads = 0;
  for (let s = 0; s < 3; s++) {
    const g = mk(100 + s), news = [], inv = g.history.inventions;
    const heads0 = OBS_IDS.map((k) => g.stars.obs[k].head);
    for (let m = 0; m < 12 * 150; m++) {
      if (m === 12 * 80 && !inv.includes('spyglass')) { inv.push('lens', 'spyglass'); }
      const before = g.stars.sky.length + g.stars.past.length, hadDispute = !!g.stars.cal.dispute, last = g.stars.cal.last, reformsWas = g.stars.cal.reforms;
      tick(g, 1, news);
      for (const e of g.stars.sky) { kinds.add(e.kind); }
      if (g.stars.cal.dispute && !hadDispute) disputes++;
      if (hadDispute && !g.stars.cal.dispute) { if (g.stars.cal.reforms > reformsWas) reforms++; else kept++; }
      if (!inv.includes('spyglass') && OBS_IDS.some((k) => g.stars.obs[k].glass)) glassEarly++;
      void before; void last;
    }
    eclipses += news.filter((t) => t.includes('해가 검게')).length;
    told += g.stars.log.filter((x) => x.text.includes('예고했다')).length;
    glass += OBS_IDS.filter((k) => g.stars.obs[k].glass).length;
    found += OBS_IDS.reduce((a, k) => a + g.stars.obs[k].found.length, 0);
    heads += OBS_IDS.filter((k, i) => g.stars.obs[k].head !== heads0[i]).length;
    textOK(news, '세상 소식'); textOK(g.stars.log.map((x) => x.text), '기록');
    for (const k of OBS_IDS) check(g.stars.obs[k].fame >= 5 && g.stars.obs[k].fame <= 100, `천문대 이름 범위 ${g.stars.obs[k].fame}`);
    check(g.stars.sky.length <= 20 && g.stars.past.length <= 20, '하늘 기록 상한');
    if (s === 0) console.log(`  판 1: 소식 ${news.length}, 달력 어긋남 ${g.stars.cal.drift}, 고침 ${g.stars.cal.reforms}`);
  }
  console.log(`  150년×3: 하늘 사건 ${[...kinds].join('/')}, 일식 ${eclipses}, 예고 ${told}, 다툼 ${disputes}(고침 ${reforms}·지킴 ${kept}), 망원경 ${glass}, 찾아낸 것 ${found}, 학자 바뀜 ${heads}`);
  check(kinds.size >= 5, `하늘 사건 여러 가지 (${[...kinds]})`);
  check(eclipses >= 6, `일식이 몇 해마다 온다 (${eclipses})`);
  check(told >= 2, `천문대가 일식을 예고한다 (${told})`);
  check(disputes >= 2 && reforms + kept >= 2, `달력 다툼이 나고 끝난다 (${disputes}, ${reforms}, ${kept})`);
  check(glassEarly === 0, `망원경은 spyglass 뒤에만 (${glassEarly})`);
  check(glass >= 4, `망원경이 올라간다 (${glass})`);
  check(heads >= 2, `학자가 바뀐다 (${heads})`);
}
// 3. 하늘 사건은 세상이 함께 본다: 교단·궁정·백성·학자 읽기, 예언 쪽 꼬리별도 같이
{
  const g = mk(5), news = [];
  const e = skyEvent(g, 'comet', (t) => news.push(t));
  check(e && news.length === 1 && /백성|장터|부적/.test(news[0]) && /천문대/.test(news[0]), `꼬리별 소식 ${news[0]}`);
  check((g.omen?.comets ?? []).includes(g.date.year), '예언 쪽 꼬리별도 올랐다');
  check(skyEvent(g, 'comet', () => {}) === null, '같은 사건이 겹치지 않는다');
  const g2 = mk(6); (g2.omen.comets ??= []).push(g2.date.year); tick(g2, 1);
  check(g2.stars.sky.some((s) => s.kind === 'comet'), '예언 쪽에서 띄운 꼬리별을 받아 적는다');
  const before = g.history.inventions.slice();
  for (let i = 0; i < 200; i++) tick(g, 1);
  check(g.history.inventions.length === before.length, '하늘은 발명을 앞당기지 않는다');
}
// 4. 행동: 별 보기, 천문대, 별점, 별 지도
{
  const g = adult('leocast');
  check(has(g, 'st_watch'), '별 보기가 보인다');
  check(!has(g, 'st_learn'), '별을 모르면 천문대에 안 간다');
  for (let i = 0; i < 6; i++) act(g, 'st_watch', 10 + i);
  check(S(g).me.lore >= 5 && S(g).me.known >= 1, `별을 익힌다 (${S(g).me.lore}, ${S(g).me.known})`);
  check(has(g, 'st_learn'), '천문대가 보인다');
  g.player.skills.letters = 20;
  act(g, 'st_learn'); scene(g, 'st_learn', 'join');
  check(S(g).me.role === 'student' && S(g).me.obs === 'leocast', '견습생');
  S(g).me.lore = 50;
  act(g, 'st_learn'); scene(g, 'st_learn', 'study');
  let k = 0; while (S(g).me.role === 'student' && k++ < 10) { act(g, 'st_learn'); scene(g, 'st_learn', 'rise', 30 + k); }
  check(S(g).me.role === 'astronomer', '학자');
  const m0 = g.player.money; starsAfterMonth(g); check(g.player.money === m0 + 3, '학자 녹봉');
  S(g).me.lore = 80; k = 0;
  while (S(g).me.role === 'astronomer' && k++ < 12) { act(g, 'st_learn'); scene(g, 'st_learn', 'court', 50 + k); }
  check(S(g).me.role === 'court', '궁정 점성술사');
  g.stars.obs.leocast.glass = true; act(g, 'st_learn'); scene(g, 'st_learn', 'glass');
  check(has(g, 'st_horoscope'), '별점이 보인다');
  for (const key of ['honest', 'cheat', 'truth']) { act(g, 'st_horoscope'); scene(g, 'st_horoscope', key, 7); }
  let caught = 0; for (let i = 0; i < 40; i++) { act(g, 'st_horoscope'); scene(g, 'st_horoscope', 'cheat', 100 + i); } caught = S(g).me.caught;
  check(caught >= 1 && g.player.money >= 0, `사기는 들통난다 (${caught})`);
  check(!has(g, 'st_chart'), '포구가 아니면 별 지도를 안 판다');
  stay(g, 'portel'); check(has(g, 'st_chart'), '포구에선 별 지도'); act(g, 'st_chart');
  check(S(g).me.charts === 1, '별 지도 팔았다');
  const sol = adult('solaris'); S(sol).me.lore = 5; check(has(sol, 'st_learn'), '성당 관측소');
  const ern = adult('ern'); S(ern).me.lore = 50; check(!has(ern, 'st_learn') && !has(ern, 'st_horoscope'), '작은 마을엔 천문대도 별점 장도 없다');
  for (const id of ['st_watch', 'st_learn', 'st_horoscope', 'st_chart']) check(iconName(ACTIONS.find((a) => a.id === id)) !== 'misc' && iconName(ACTIONS.find((a) => a.id === id)), `${id} 아이콘`);
}
// 5. 사건: 하늘이 뜬 밤, 일식 예고, 바다에서 별로 길 잡기, 달력 다툼
{
  for (const [kind, ch] of [['comet', 0], ['eclipse', 1], ['nova', 2], ['aurora', 0], ['shower', 0], ['conj', 2]]) {
    const g = adult('verden'); S(g).me.lore = kind === 'shower' ? 5 : 40;
    skyEvent(g, kind, () => {});
    check(cond(g, 'st_skynight'), `하늘 사건 밤 (${kind})`);
    fire(g, 'st_skynight', ch);
    check(!cond(g, 'st_skynight'), `한 사건은 한 번 (${kind})`);
  }
  const g = adult('leocast'); Object.assign(S(g).me, { role: 'astronomer', obs: 'leocast', lore: 100 });
  S(g).next.eclipse = mi(g) + 10;
  check(cond(g, 'st_predict'), '일식 셈 사건');
  fire(g, 'st_predict', 0, 1);
  const p = S(g).me.predicted; check(p && p.guess >= mi(g), `예고를 걸었다 ${JSON.stringify(p)}`);
  // 일식이 그달에 오면 맞힌다
  let right = 0, wrong = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const h = adult('leocast'); Object.assign(S(h).me, { role: 'astronomer', obs: 'leocast', lore: 60 }); S(h).next.eclipse = mi(h) + 8;
    fire(h, 'st_predict', 0, seed);
    for (let i = 0; i < 14 && S(h).me.predicted; i++) { tick(h, 1); starsAfterMonth(h); }
    right += S(h).me.right; wrong += S(h).me.wrong;
    check(!S(h).me.predicted, '예고는 결판난다');
  }
  console.log(`  일식 예고 12번: 맞힘 ${right}, 빗나감 ${wrong}`);
  check(right >= 2 && wrong >= 1, `맞을 때도 틀릴 때도 (${right}, ${wrong})`);
  // 바다
  const sea = adult('portel'); S(sea).me.lore = 60; L(sea).travel = { to: 'klein', left: 3, from: 'portel', sea: true };
  check(cond(sea, 'st_navigate'), '바다에서 별로 길 잡기');
  let shorter = 0; for (let seed = 1; seed <= 6; seed++) { L(sea).travel.left = 3; fire(sea, 'st_navigate', 0, seed); if (L(sea).travel.left === 2) shorter++; }
  check(shorter >= 2, `별로 뱃길이 줄어든다 (${shorter})`);
  L(sea).travel.sea = false; check(!cond(sea, 'st_navigate'), '뭍길엔 없다');
  // 달력
  const c = adult('solaris'); S(c).me.lore = 30; S(c).cal.dispute = { at: mi(c), reform: 40, church: 50, me: null };
  check(cond(c, 'st_calendar'), '달력 다툼 사건');
  fire(c, 'st_calendar', 0); check(S(c).cal.dispute.me === 'reform' && S(c).cal.dispute.reform > 40, '고치자는 편');
  check(!cond(c, 'st_calendar'), '한 번 편을 들면 끝');
}
// 6. 화면, 지도, 저장 왕복, 옛 저장, 대 잇기
{
  const g = adult('leocast');
  skyEvent(g, 'nova', () => {});
  const line = starsLine(g); check(line && !BAD.test(line), `한 줄 ${line}`);
  const info = starsInfo(g); check(info.sky.length === 1 && info.observatories.length === 4 && info.me.loreWord, '정보 한 장');
  textOK([...info.log.map((x) => x.text), info.me.loreWord, ...info.observatories.map((o) => o.head)], '정보');
  const html = MAP_INFO.map((f) => f(g, { id: 'leocast' })).join('');
  check(html.includes('왕실 천문대'), '지도에 천문대');
  check(!MAP_INFO.map((f) => f(g, { id: 'ern' })).join('').includes('천문대'), '천문대 없는 고장');
  const back = decodeSave(encodeSave(g)); check(back.stars.sky.length === 1 && back.stars.obs.leocast.head === g.stars.obs.leocast.head, '저장 왕복');
  const old = structuredClone(g); delete old.stars; runHooks('migrate', old); check(old.stars.cal.drift === fresh().cal.drift && old.stars.me.lore === 0, '옛 저장');
  S(g).me.lore = 80; S(g).me.role = 'court';
  runHooks('heir', g); check(S(g).me.role === 'none' && S(g).me.lore >= 15 && S(g).me.lore < 30, `대를 이으면 별 지도만 남는다 (${S(g).me.lore})`);
}
// 7. 한 판 흐름 (60년)
{
  const h = mk(41); let lines = 0, nights = 0;
  for (let m = 0; m < 12 * 60; m++) {
    if (h.over) { const hh = heirsOf(h)[0]; if (!hh) break; becomeHeir(h, rngOf(h), hh); if (h.over) break; }
    const acts = availableActions(h);
    const pick = acts.find((x) => x.id === 'st_watch') ?? acts.find((x) => x.id === 'rest') ?? acts[0];
    endMonth(h, Array.from({ length: slotsFor(h) }, () => ({ id: pick.id })));
    let k = 0; while (h.pendingEvent && k++ < 6) { if (h.pendingEvent.id === 'st_skynight') nights++; resolveEvent(h, rngOf(h), h.pendingEvent.choices.length - 1); }
    if (m % 3 === 0) { const line = starsLine(h); if (line) { lines++; check(!BAD.test(line), `starsLine ${line}`); } }
  }
  textOK(S(h).log.map((x) => x.text), '60년 기록');
  console.log(`  60년 판: 별 앎 ${Math.round(S(h).me.lore)}, 별자리 ${S(h).me.known}, 하늘 밤 ${nights}, 한 줄 ${lines}, 하늘 사건 ${S(h).sky.length + S(h).past.length}`);
  check(S(h).me.known >= 3, `별을 보면 별자리를 안다 (${S(h).me.known})`);
}
void SKY; void PLACES;
console.log(`starstest ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
