// 24단계: 세상을 바꾸는 큰 공사. 성벽·큰길·돌다리·운하·대성당·고개길·땅굴길·수로·등대.
// 부역과 품삯, 석공 길드, 사고와 무너짐, 돈이 바닥나 멈춘 공사, 버려진 자리. 다 지으면 길·교역·고장 모습이 바뀐다(플레이어 없이도).
// 내가 돈을 대거나 공사를 일으키고, 일꾼이나 감독으로 낄 수 있다.
// 화면용: worksInfo(g), worksLine(g)
import { WS, WORKS, WORK_IDS, PATRONS, STAGE_NAMES, pct, progressWord, fundsWord, placeName, syncWorks, doneWorks } from './state.js';
import './world.js';
import './life.js';
import { L } from '../adventure/core.js';
import { MAP_INFO } from '../art/map.js';

export { WORKS, WORK_IDS, syncWorks, doneWorks } from './state.js';
export { worksMonth, startWork, completeWork, patronMood } from './world.js';
export const worksState = WS;

const view = (g, id) => {
  const w = WS(g).w[id], d = WORKS[id], p = pct(w, id), started = w.stage !== 'idle' || w.progress > 0;
  return {
    id, name: d.name, kind: d.kind, place: d.place, placeName: placeName(d.place), desc: d.desc,
    stage: w.stage, stageName: STAGE_NAMES[w.stage], pct: p, word: w.stage === 'done' ? '다 지었다' : started ? progressWord(p) : '',
    patron: w.patron ? PATRONS[w.patron].name : PATRONS[d.patron].name, labor: w.stage === 'idle' ? '' : w.labor === 'corvee' ? '부역' : '품삯',
    funds: ['building', 'stalled'].includes(w.stage) ? fundsWord(w, id) : '',
    years: w.stage === 'idle' ? 0 : Math.max(0, Math.round(((w.stage === 'done' ? w.doneAt : g.date.year * 12 + g.date.month) - w.since) / 12)),
    deaths: w.deaths, falls: w.falls, ruins: w.ruins, strike: w.strike > 0,
    carved: w.carved ?? '', myGold: w.myGold, myMonths: w.myMonths, overseer: !!w.overseer, mine: w.patron === 'me',
    here: L(g).place === d.place,
  };
};
// 화면용 한 장
//   { works[아홉 모두], here[이 고장 공사], done[다 지은 것], me{ gold, months, overseer(이름|''), drafted, dodged, carved, opened }, log[{y,m,text}] }
export function worksInfo(g) {
  const S = WS(g);
  return {
    works: WORK_IDS.map((id) => view(g, id)),
    here: WORK_IDS.filter((id) => WORKS[id].place === L(g).place).map((id) => view(g, id)),
    done: doneWorks(g).map((id) => view(g, id)),
    me: { ...S.me, overseer: S.me.overseer ? WORKS[S.me.overseer].name : '' },
    log: S.log.slice(-10).reverse(),
  };
}
// 머리글 한 줄: 감독일 때, 또는 이 고장에서 공사 중일 때만
export function worksLine(g) {
  const S = WS(g);
  if (S.me.overseer) { const w = S.w[S.me.overseer]; return `감독: ${WORKS[S.me.overseer].name} ${pct(w, S.me.overseer)}%${w.strike > 0 ? ', 석공들이 손을 놓음' : ''}`; }
  const id = WORK_IDS.find((x) => WORKS[x].place === L(g).place && ['building', 'stalled'].includes(S.w[x].stage));
  if (!id) return null;
  const w = S.w[id];
  return `${WORKS[id].name}: ${w.stage === 'stalled' ? '멈춤' : '짓는 중'} ${pct(w, id)}%`;
}

// 대륙 지도: 고장 설명 칸에 그 고장의 큰 공사 형편이 붙는다
MAP_INFO.push((g, place) => {
  if (!g?.works || !place?.id) return '';
  const ids = WORK_IDS.filter((id) => WORKS[id].place === place.id && (g.works.w[id].stage !== 'idle' || g.works.w[id].progress > 0));
  if (!ids.length) return '';
  return ids.map((id) => {
    const w = g.works.w[id], d = WORKS[id];
    if (w.stage === 'done') return `<p class="note"><b>${d.name}</b> · 완공${w.carved ? ` · 머릿돌에 ${w.carved}` : ''}</p>`;
    if (w.stage === 'idle') return `<p class="note"><b>${d.name}</b> · 짓다 버린 자리 (${pct(w, id)}%)</p>`;
    return `<p class="note"><b>${d.name}</b> · ${STAGE_NAMES[w.stage]} ${pct(w, id)}% · ${w.labor === 'corvee' ? '부역' : '품삯'}${w.patron === 'me' ? ' · 내가 돈을 댐' : ''}</p>`;
  }).join('');
});
