// 큰 공사의 달 흐름: 플레이어가 없어도 왕실·영주·교단·드워프 장로회·제국·자유도시가 공사를 일으키고,
// 돈줄이 이어지면 쌓아 올리고, 전쟁과 흉년에 돈이 마르면 멈추고, 오래 멈추면 반쯤 지은 채 버려진다.
// 일꾼이 떨어져 죽고, 비계가 무너지고, 석공 길드가 손을 놓는다. 다 지으면 세상이 바뀐다(syncWorks). 굴림이 많아 따로 난수를 쓴다.
import { WORLD_TICKS, atWar } from '../world.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { L, chron, queueScene, sceneQueued } from '../adventure/core.js';
import { WS, WORKS, WORK_IDS, PATRONS, clamp, mi, wlog, rate, pct, syncWorks, placeName } from './state.js';

export const worksRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 211) ^ Math.imul(mi(g) * 83 + salt + 29, 2246822519)) | 0 });
const here = (g) => (g.life ? L(g).place : 'ern');
const near = (g, pl) => { const h = here(g); return pl === h || !!PLACES[h]?.links?.[pl]; };
const era = (g) => g.realm?.era ?? 0;
const playerAt = (g, pl) => !!g.life && L(g).place === pl && !L(g).travel;

// 돈줄의 형편: 전쟁·내전·흉년·북방 전쟁에 따라 돈을 대는 쪽 사정이 다르다
export function patronMood(g, patron) {
  const r = g.realm ?? {}, famine = !!g.world?.famine;
  let m = 1;
  if (patron === 'crown' || patron === 'lord') {
    if (r.succession === 'civilwar') m *= 0.1;
    if (r.balhart?.war) m *= 0.35;
    if (famine) m *= 0.5;
    m *= clamp(1.25 - (r.bread ?? 1) * 0.25, 0.5, 1.1);
  } else if (patron === 'church') {
    if (famine) m *= 0.7;
    if (r.succession === 'civilwar') m *= 0.6;
  } else if (patron === 'march') {
    if (r.north?.war) m *= 0.2;
    if (r.north?.fallen) m *= 0.05;
    if (famine) m *= 0.6;
  } else if (patron === 'empire') {
    if (r.balhart?.war) m *= 0.35;
  } else if (patron === 'guild' || patron === 'city') {
    if (atWar(g)) m *= 0.6;
    if (famine) m *= 0.7;
    m *= 1 + era(g) * 0.1;
  } else if (patron === 'me') return 0;
  return m;
}
const laborOf = (g, patron) => (['crown', 'lord', 'march', 'empire'].includes(patron) && era(g) < 2 ? 'corvee' : 'wage');

export function startWork(g, id, patron, funds, rng) {
  const w = WS(g).w[id], d = WORKS[id];
  w.stage = 'building'; w.patron = patron; w.labor = patron === 'me' ? 'wage' : laborOf(g, patron);
  w.since = mi(g); w.funds = Math.round(funds); w.strike = 0; w.stalledAt = 0; w.offered = false;
  wlog(g, `${d.name}: ${patron === 'me' ? '내가' : J(PATRONS[patron].name, '이/가')} 공사를 일으켰다.${w.progress > 0 ? ' 버려졌던 자리에서 다시.' : ''}`);
  return w;
}
export function completeWork(g, id, say) {
  const w = WS(g).w[id], d = WORKS[id];
  w.stage = 'done'; w.doneAt = mi(g); w.progress = d.need; w.strike = 0;
  const S = WS(g);
  if (S.me.overseer === id) { S.me.overseer = null; w.overseer = false; }
  syncWorks(g);
  const yrs = Math.max(1, Math.round((mi(g) - w.since) / 12));
  const text = `${d.doneText} 첫 삽을 뜬 지 ${yrs}년, 일하다 죽은 사람이 ${w.deaths}명이다.`;
  say?.(text, true, d.place);
  chron(g, text, 90);
  wlog(g, `${d.name} 완공 (${yrs}년, 죽은 일꾼 ${w.deaths}명).`);
  if (playerAt(g, d.place) && !sceneQueued(g, 'works_open')) queueScene(g, 'works_open', { id });
}

// 한 달. 소식 [{ text, big, pl }]를 돌려준다.
export function worksMonth(g) {
  if (!g.works || g.over) return [];
  const S = WS(g), now = mi(g), news = [];
  const say = (text, big = false, pl = null) => news.push({ text, big, pl });
  WORK_IDS.forEach((id, i) => {
    const w = S.w[id], d = WORKS[id], rng = worksRng(g, i * 7 + 1), pn = placeName(d.place);
    if (w.stage === 'idle') {
      if (era(g) < d.era) return;
      const p = 0.0017 * (1 + era(g) * 0.3) * patronMood(g, d.patron) * Math.pow(0.7, w.ruins);
      if (!rng.chance(p)) return;
      startWork(g, id, d.patron, d.cost * rng.float(0.22, 0.4), rng);
      say(`${J(PATRONS[d.patron].name, '이/가')} ${d.name} 공사를 시작한다. ${d.desc} ${w.labor === 'corvee' ? '근방 장정들에게 부역령이 내렸다.' : '품삯을 주고 일꾼을 모은다.'}`, d.cost >= 8000, d.place);
      return;
    }
    if (w.stage === 'building') {
      const mood = patronMood(g, w.patron);
      if (w.patron !== 'me' && rng.chance(0.06 * mood)) w.funds += rate(id, w) * rng.int(6, 14);
      if (w.strike > 0) { w.strike -= 1; if (!w.strike) say(`${pn} ${d.kind} 공사장의 석공들이 다시 연장을 들었다.`, false, d.place); return; }
      const need = rate(id, w);
      if (w.funds < need) {
        w.stage = 'stalled'; w.stalledAt = now; w.stalls += 1;
        say(`${d.name} 공사가 멈췄다. ${w.patron === 'me' ? '내가 댄 돈이 바닥났다.' : `${J(PATRONS[w.patron].who, '이/가')} 더는 품삯을 줄 수 없다고 했다.`} ${pct(w, id)}% 올라간 채 비계만 서 있다.`, false, d.place);
        wlog(g, `${d.name}: 돈이 떨어져 멈췄다 (${pct(w, id)}%).`);
        return;
      }
      w.funds -= need;
      w.progress += w.labor === 'corvee' ? 0.95 : 1;
      if (w.skim > 0) w.skim = Math.max(0, w.skim - 0.5);
      // 사고: 떨어지고 깔린다. 비계가 통째로 무너지기도 한다(빼돌린 돈이 있으면 더 잘).
      if (rng.chance(0.022)) w.deaths += rng.int(1, 3);
      if (rng.chance(0.0022 + Math.min(0.01, w.skim / 4000))) {
        const lost = Math.round(d.need * rng.float(0.04, 0.12)), dead = rng.int(3, 11);
        w.progress = Math.max(0, w.progress - lost); w.deaths += dead; w.falls += 1;
        say(`${pn}에서 ${d.kind} 공사장 비계가 무너졌다. 일꾼 ${dead}명이 깔려 죽었다. ${w.skim > 0 ? '석재가 처음부터 약했다는 말이 돈다.' : '석 달 쌓은 것이 하룻밤에 흙더미가 되었다.'}`, false, d.place);
        wlog(g, `${d.name}: 무너짐, ${dead}명 죽음.`);
        if (playerAt(g, d.place) && (S.me.overseer === id || w.myMonths > 0) && !sceneQueued(g, 'works_fall')) queueScene(g, 'works_fall', { id, dead });
      }
      // 석공 길드가 손을 놓는다: 품삯 공사에서만
      if (w.labor === 'wage' && rng.chance(0.005)) {
        w.strike = rng.int(2, 5);
        say(`${pn} ${d.kind} 공사장의 석공 길드가 품삯을 올려 달라며 손을 놓았다.`, false, d.place);
      }
      if (w.progress >= d.need) completeWork(g, id, say);
      return;
    }
    if (w.stage === 'stalled') {
      if (w.patron !== 'me' && rng.chance(0.022 * patronMood(g, w.patron))) w.funds += rate(id, w) * rng.int(6, 14);
      w.progress = Math.max(0, w.progress - 0.04); // 비바람에 조금씩 허물어진다
      if (w.funds >= rate(id, w) * (w.patron === 'me' ? 1 : 12)) {
        w.stage = 'building';
        say(`멈췄던 ${d.name} 공사가 다시 시작됐다. 녹슨 도르래에 기름을 친다.`, false, d.place);
        wlog(g, `${d.name}: 다시 시작.`);
        return;
      }
      if (now - w.stalledAt > 300) {
        const left = pct(w, id);
        w.stage = 'idle'; w.ruins += 1; w.progress = Math.round(w.progress * 0.6); w.funds = 0; w.patron = null; w.strike = 0;
        if (S.me.overseer === id) { S.me.overseer = null; w.overseer = false; }
        say(`스물다섯 해 멈춰 있던 ${d.name} 자리가 버려졌다. ${left}% 올라간 돌무더기에 잡초가 자란다. 사람들은 그 돌을 뜯어다 제 집 담을 쌓는다.`, false, d.place);
        wlog(g, `${d.name}: 버려졌다 (${left}%).`);
      }
    }
  });
  // 완공된 것들이 세상에 하는 일: 성벽과 초소는 마물을 밀어내고, 대성당은 신자를 붙든다
  for (const id of WORK_IDS) {
    if (S.w[id].stage !== 'done') continue;
    const fx = WORKS[id].fx;
    const land = fx.guard ? g.wilds?.land?.[fx.guard] : null;
    if (land && Number.isFinite(land.hunted ?? 0)) land.hunted = (land.hunted ?? 0) + 0.4;
    if (fx.faith && g.faith && g.faith.god === fx.faith.god && playerAt(g, fx.faith.place)) g.faith.devotion = clamp((g.faith.devotion ?? 0) + 0.3, 0, 100);
  }
  return news;
}

WORLD_TICKS.push((g, worldRng, say) => {
  for (const n of worksMonth(g) ?? []) if (n.big || n.pl == null || near(g, n.pl)) say(n.text, n.big);
});
