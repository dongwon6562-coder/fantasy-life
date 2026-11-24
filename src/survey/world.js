// 지도의 달: 공방들이 지도를 찍어 내고, 엉성한 지도를 믿은 상단이 길을 잃는다(플레이어 없이도).
// 내가 흠을 숨기고 판 지도도 언젠가 누군가를 길 잃게 한다. 내가 그은 경계는 몇 해 뒤 법정에서 다시 불린다.
// 군용 지도 밑그림을 쥐고 있으면 밤 손님이 온다. 공방에는 도제가 들어오고, 다 배우면 제 공방을 낸다.
import { HOOKS } from '../hooks.js';
import { queueScene, sceneQueued, chron, note, L } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { S, mi, clamp, placeName, free, adult, ownRng, logS, mapTitle } from './core.js';

const APPS = ['소년 요나', '필경사 딸 리제', '고아 마르틴', '선원 아들 페터', '수녀원에서 나온 클라라', '늙은 병사 오토'];

/* ---------- 공방들과 틀린 지도 ---------- */
export function shopsYear(g, rng) {
  const s = S(g);
  for (const sh of Object.values(s.shops)) {
    sh.rep = clamp(sh.rep + rng.int(-2, 3) - sh.bad * 4, 5, 95);
    if (rng.chance(sh.bad * 0.5)) {
      sh.rep = clamp(sh.rep - 8, 5, 95);
      chron(g, `${sh.name}에서 산 지도를 믿은 상단이 엉뚱한 골짜기로 들어가 한 달을 헤맸다.`, 5);
    }
  }
}

/* ---------- 내가 흠을 숨기고 판 지도 ---------- */
export function liesMonth(g, rng) {
  const s = S(g);
  for (const m of s.maps) {
    if (!m.lie || m.lied || !rng.chance(0.06)) continue;
    m.lied = true; s.lost += 1;
    deed(g, 'honest', -2, null);
    const t = `내가 판 ${J(mapTitle(m), '을/를')} 믿은 ${m.to === 'captain' ? '배가 모래톱에 얹혔다' : '상단이 길을 잃고 한 달을 헤맸다'}는 말이 돌아왔다.`;
    logS(g, t); note(g, t);
  }
}

/* ---------- 경계 다툼의 증인, 밤 손님 ---------- */
function witnessMonth(g, rng) {
  const s = S(g);
  if (!s.borders.length || !free(g) || !adult(g) || L(g).travel) return;
  if (mi(g) - s.witnessAt < 24 || g.date.year - s.borders.at(-1).y < 1 || sceneQueued(g, 'sv_witness') || !rng.chance(0.06)) return;
  s.witnessAt = mi(g);
  queueScene(g, 'sv_witness');
}
function theftMonth(g, rng) {
  const s = S(g);
  const m = s.maps.find((x) => x.kind === 'war' && !x.sold);
  if (!m || !free(g) || L(g).travel) return;
  if (mi(g) - s.theftAt < 6 || sceneQueued(g, 'sv_theft') || !rng.chance(0.15)) return;
  s.theftAt = mi(g);
  queueScene(g, 'sv_theft');
}

/* ---------- 공방의 도제 ---------- */
export function atelierMonth(g, rng) {
  const s = S(g), at = s.atelier;
  if (!at) return;
  for (const a of [...at.app]) {
    if (mi(g) - a.since < 48) continue;
    at.app = at.app.filter((x) => x !== a);
    const key = `app${s.seq++}`;
    s.shops[key] = { name: `${placeName(at.place)} ${a.name.split(' ').at(-1)} 지도 공방`, place: at.place, rep: 40, bad: 0.1 };
    chron(g, `${J(a.name, '이/가')} ${g.player.name}의 공방에서 배움을 마치고 제 지도 공방을 냈다.`, 6);
    logS(g, `${J(a.name, '이/가')} 다 배우고 떠나 제 공방을 냈다.`);
  }
  if (at.app.length < 2 && mi(g) - at.since >= 6 && mi(g) % 12 === at.since % 12 && rng.chance(0.6)) {
    const name = APPS.find((n) => !at.app.some((a) => a.name === n)) ?? APPS[0];
    at.app.push({ name, since: mi(g) });
    logS(g, `${J(name, '이/가')} 도제로 들어왔다.`);
  }
}

HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const rng = ownRng(g, 41);
  if (g.date.month === 3) shopsYear(g, rng);
  liesMonth(g, rng);
  witnessMonth(g, rng);
  theftMonth(g, rng);
  atelierMonth(g, rng);
});

// 대를 이으면: 공방과 이름 남은 지도는 집안에 남는다. 솜씨와 그어 둔 경계는 앞 사람의 것.
HOOKS.heir.push((g) => {
  const s = S(g);
  if (s.skill >= 15) s.past.push({ y: g.date.year, skill: Math.round(s.skill), drawn: s.drawn, jobs: s.jobs });
  s.skill = 0; s.borders = []; s.master = null; s.evAt = -99; s.witnessAt = -99;
  for (const w of s.masterworks) if (w.mine) { w.mine = false; w.family = true; }
  if (s.atelier) logS(g, `${placeName(s.atelier.place)}의 지도 공방을 물려받았다.`);
});
