// 미궁 깊게 (44단계): 미궁 열셋, 층대·위험·수확, 공략대, 한 걸음씩 내려가는 공략(dv_go → dv_plan → dv_run), 미궁의 주인과 깊은 층의 비밀,
// 다른 공략대, 미궁 앞 거리와 마석 값, 공략 기록. 플레이어 없이도 공략대가 내려가고 기록이 바뀌고 거리가 커지고 준다.
// 화면: delveInfo(g) 미궁 기록, delveLine(g) 오늘의 장면 한 줄.
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { D, DELVES, DELVE_IDS, mi, here, placeName, delveAt, mineOf, stonePrice, CREW_ROLES } from './core.js';
import './life.js';
import './world.js';

export { D as delveState, DELVES, DELVE_IDS, delveAt };

const townWord = (p) => (p >= 60 ? '북적이는 거리' : p >= 30 ? '여관 몇 채가 선 거리' : p >= 12 ? '천막촌' : '거의 빈 터');

/** 화면용 묶음 */
export function delveInfo(g) {
  const s = D(g), id = delveAt(here(g));
  const mk = (did) => {
    const d = DELVES[did], m = s.mine[did], t = s.towns[did];
    return {
      id: did, name: d.name, place: placeName(d.place), floors: d.endless ? null : d.floors, endless: !!d.endless, guild: !!d.guild,
      layers: d.layers.map((l) => ({ name: l.name, to: l.to, danger: l.danger })),
      master: d.master ? { alive: !!s.masters[did].alive, name: d.master.text, by: s.masters[did].by ?? null } : null,
      town: d.town ? { name: d.town, size: Math.round(t.pop), word: townWord(t.pop), price: Math.round(stonePrice(g, did) * 100) / 100 } : null,
      record: { best: s.rec[did].best, holder: s.rec[did].holder, me: !!s.rec[did].me },
      mine: m ? { deepest: m.deepest, mark: m.mark, runs: m.runs, clears: m.clears, lore: m.lore.map((k) => d.lore[k]), secret: m.secret ? d.secret : null } : null,
    };
  };
  return {
    here: id ? mk(id) : null,
    known: DELVE_IDS.filter((did) => s.mine[did]?.runs).map(mk),
    records: DELVE_IDS.filter((did) => s.rec[did].best > 0).map((did) => ({ name: DELVES[did].name, best: s.rec[did].best, holder: s.rec[did].holder, me: !!s.rec[did].me })),
    crew: s.crew.map((c) => ({ name: c.name, role: CREW_ROLES[c.role].name, pow: c.pow, wage: c.wage })),
    parties: s.parties.filter((p) => p.alive).map((p) => ({ name: p.name, leader: p.leader, at: DELVES[p.at].name, best: p.best, fame: p.fame })),
    past: s.past.slice(-4),
    log: s.log.slice(-8),
  };
}

/** 오늘의 장면 한 줄. 할 말이 없으면 null */
export function delveLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const id = delveAt(here(g));
  if (!id) return null;
  const s = D(g), d = DELVES[id], t = mi(g), m = s.mine[id];
  const p = s.parties.find((x) => x.alive && x.at === id);
  if (d.town && t % 4 === 0 && s.towns[id].pop >= 30) return `${d.town}에 마석 값을 외치는 소리가 가득하다. 오늘 시세는 ${stonePrice(g, id) >= 1 ? '좋다' : '좋지 않다'}.`;
  if (p && t % 4 === 1) return `술집에서 공략대 ${J(p.name, '이/가')} 지난번 ${p.best}층 이야기를 떠벌린다.`;
  if (d.endless && t % 4 === 2) return `탑 아래 칠판에 적힌 최고 기록은 ${s.rec[id].best}층, ${s.rec[id].holder ?? '아무도'}. 분필 글씨가 비에 번졌다.`;
  if (m?.mark && t % 4 === 3) return `${d.name} ${m.mark}층 벽에 새긴 내 표식이 아직 남아 있을지 궁금하다.`;
  if (d.master && !s.masters[id].alive && t % 5 === 4) return `${d.name}의 주인이 쓰러진 뒤로 입구가 조용하다. 마석 자루를 진 사람도 줄었다.`;
  return null;
}
