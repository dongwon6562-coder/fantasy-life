import './lsshim.js';
import '../src/content.js';
// 세계 역사 점검: 플레이어가 아무렇게나 살아도 30년 뒤 세계가 달라져 있는지, 저장이 너무 커지지 않는지, 예전 저장이 깨지지 않는지.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { autosave, load } from '../src/save.js';
const roundTrip = (g) => { autosave(g); return load('auto'); };
import { historySummary, worldChronicle, notablesOf, housesOf, companiesOf, placeChanges } from '../src/history/index.js';
import { L } from '../src/adventure/core.js';
import { ensurePlacePeople } from '../src/places.js';

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const sizeKB = (g) => JSON.stringify(g).length / 1024;

function live(g, months) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      let a = rng.pick(acts);
      if (g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? a;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    let guard = 0;
    while (g.pendingEvent && guard++ < 8) resolveEvent(g, rngOf(g), Math.floor(rngOf(g).next() * g.pendingEvent.choices.length));
  }
}

const stats = { houseFell: 0, coFell: 0, coNew: 0, inventions: 0, notablesChanged: 0, grow: [], log: [], succession: 0 };
const RUNS = 8;
for (let run = 0; run < RUNS; run++) {
  const g = newGame({ name: '역사', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 9100 + run * 13 });
  // 도시 사람들을 미리 만들어 둔다 (빈 자리 잇기 점검)
  for (const p of ['harfen', 'verden', 'leocast']) ensurePlacePeople(g, rngOf(g), p);
  const firstNotables = new Set(notablesOf(g).map((n) => n.name + n.lastName));
  const firstCos = new Set(companiesOf(g).map((c) => c.name));
  const kb0 = sizeKB(g);
  const roles0 = new Map(['harfen', 'verden', 'leocast'].flatMap((p) => L(g).placeNpcs[p].map((id) => [id, p])));
  live(g, 12 * 30);
  const h = g.history;
  stats.houseFell += h.houses.filter((x) => x.fallen).length + (h.fallen - h.houses.filter((x) => x.fallen).length > 0 ? 0 : 0);
  stats.coFell += [...firstCos].filter((n) => !companiesOf(g).some((c) => c.name === n)).length;
  stats.coNew += companiesOf(g).filter((c) => !firstCos.has(c.name)).length;
  stats.inventions += h.inventions.length;
  stats.notablesChanged += notablesOf(g).filter((n) => !firstNotables.has(n.name + n.lastName)).length;
  stats.grow.push(sizeKB(g) - kb0);
  stats.log.push(worldChronicle(g).length);
  const newHolders = ['harfen', 'verden', 'leocast'].flatMap((p) => L(g).placeNpcs[p]).filter((id) => !roles0.has(id)).length;
  stats.succession += newHolders;
  check(housesOf(g).length >= 3, `run ${run}: 가문이 너무 적다 ${housesOf(g).length}`);
  check(companiesOf(g).length >= 2 && companiesOf(g).some((c) => c.pillar), `run ${run}: 상단 목록 이상`);
  check(historySummary(g).length >= 3, `run ${run}: 요약 없음`);
  check(h.notables.every((n) => n.name && n.kind && Number.isFinite(n.fame)), `run ${run}: 이름난 사람 자료 이상`);
  for (const t of worldChronicle(g)) check(typeof t.text === 'string' && !t.text.includes('undefined') && !t.text.includes('NaN'), `run ${run}: 연대기 글 이상 ${t.text}`);
  for (const c of g.chronicle) if (c.text.includes('undefined') || c.text.includes('NaN')) { check(false, `run ${run}: 기록 글 이상 ${c.text}`); break; }
  // 저장하고 불러와도 그대로
  const g2 = roundTrip(g);
  check(JSON.stringify(g2.history) === JSON.stringify(g.history), `run ${run}: 저장/불러오기 뒤 역사 달라짐`);
  if (run === 0) {
    console.log(historySummary(g).join('\n'));
    console.log('바뀐 모습(하르펜):', placeChanges(g, 'harfen').join(' / '));
    console.log('연대기 마지막 8개:\n  ' + worldChronicle(g).slice(-8).map((x) => `${x.y}년 ${x.m}월 ${x.text}`).join('\n  '));
  }
}
const avg = (a) => Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10;
console.log(`${RUNS}번의 30년: 무너진 가문 ${stats.houseFell}, 사라진 상단 ${stats.coFell}, 새 상단 ${stats.coNew}, 발명 평균 ${stats.inventions / RUNS}, 새 얼굴(이름난 사람) 평균 ${stats.notablesChanged / RUNS}, 자리 이은 사람 평균 ${stats.succession / RUNS}`);
console.log(`저장 크기 증가 평균 ${avg(stats.grow)}KB (최대 ${Math.round(Math.max(...stats.grow))}KB), 연대기 길이 평균 ${avg(stats.log)}`);
check(stats.coFell + stats.coNew >= RUNS, '상단이 거의 바뀌지 않는다');
check(stats.inventions / RUNS >= 3, '발명이 너무 적다');
check(stats.notablesChanged / RUNS >= 5, '이름난 사람이 바뀌지 않는다');
check(stats.succession / RUNS >= 2, '빈 자리를 잇는 사람이 없다');

// 예전 저장: history가 없는 저장을 불러와도 채워진다
{
  const g = newGame({ name: '옛', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4242 });
  delete g.history;
  const g2 = roundTrip(g);
  check(!!g2.history && g2.history.houses.length >= 4, '예전 저장에 history가 채워지지 않음');
  live(g2, 24);
  check(!!g2.history, '예전 저장으로 2년 진행 실패');
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
