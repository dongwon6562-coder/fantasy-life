// 목수와 석공의 달: 맡은 의뢰가 올라가고, 작업장이 돌아가고, 지은 것은 세월과 재앙에 낡아 무너진다.
// 플레이어 없이도 세상의 장인들이 이름난 건물을 짓고, 그 건물도 언젠가 무너진다.
import { HOOKS } from '../hooks.js';
import { WORK } from '../jobs.js';
import { gainSkill } from '../game.js';
import { L, note, chron, tired, queueScene, sceneQueued } from '../adventure/core.js';
import { calamityAt } from '../nature/index.js';
import { H } from '../house/core.js';
import { WS, WORKS } from '../works/state.js';
import { J } from '../narrative/text.js';
import { B, mi, clamp, here, placeName, townName, free, skill, trade, adult, ownRng, logB, shopHere, KINDS, NAMES, kindName, invented } from './core.js';
import { finishJob, fallOf, addBuilt, pay } from './life.js';

/* ---------- 맡은 의뢰 ---------- */
function jobMonth(g, rng) {
  const s = B(g), j = s.job;
  if (!j || !j.mat) return;
  if (here(g) === j.place && free(g)) {
    const app = s.shop && s.shop.place === j.place ? s.shop.app.length : 0;
    j.left -= 1 + app * 0.35; j.away = 0;
    tired(g, 8); gainSkill(g, 'building', 0.9, trade(g) === 'mason' ? 'str' : 'agi');
    if (j.left <= 0.001) note(g, finishJob(g, rng));
    return;
  }
  j.away += 1;
  if (j.away >= 3) {
    logB(g, `${j.client}의 ${kindName(g, j.kind)} 일을 놓쳤다.`);
    note(g, `석 달을 비우자 ${J(j.client, '은/는')} 다른 장인을 불렀다. 짓다 만 ${J(kindName(g, j.kind), '은/는')} 남의 손에 넘어갔다.`);
    s.job = null;
  }
}

/* ---------- 작업장 ---------- */
function shopMonth(g, rng) {
  const s = B(g), sh = s.shop;
  if (!sh) return;
  sh.app = sh.app.filter((a) => g.people.some((p) => p.id === a.id && p.alive));
  pay(g, 1);
  if (shopHere(g)) {
    sh.rep = clamp(sh.rep + 0.5, 0, 100);
    if (!s.job) { const n = 1 + sh.app.length + (sh.rep >= 40 ? 1 : 0); g.player.money += n; s.earned += n; }
    const due = sh.app.find((a) => mi(g) - a.since >= 48);
    if (due && !sceneQueued(g, 'builder_journey')) queueScene(g, 'builder_journey', { id: due.id });
  } else sh.rep = clamp(sh.rep - 0.5, 0, 100);
}
// 조합 회비: 해마다 정월. 세 해 밀리면 명부에서 지운다
function duesMonth(g) {
  const s = B(g);
  if (!s.mark || g.date.month !== 1 || s.guild.banned > mi(g)) return;
  if (g.player.money >= 8) { pay(g, 8); return; }
  s.guild.dues += 8;
  if (s.guild.dues >= 24) { s.guild.dues = 0; s.guild.banned = mi(g) + 24; logB(g, '회비가 밀려 조합 명부에서 이름이 지워졌다.'); note(g, '조합 회비가 세 해 밀렸다. 명부에서 내 이름이 지워졌다.'); }
}

/* ---------- 세월과 재앙 ---------- */
const yearly = (b) => (b.cut ? 0.06 : b.q < 35 ? 0.025 : b.q < 55 ? 0.008 : b.q < 75 ? 0.002 : 0.0005);
export function fallChance(g, b) {
  const age = Math.max(0, g.date.year - b.y);
  let p = (yearly(b) * (1 + age / 80)) / 12;
  const cal = calamityAt(g, b.place);
  if (cal?.home) p += (cal.home / 100) * (1 - b.q / 100) * 0.35;
  return { p, why: cal?.home ? cal.name : null };
}
function ageMonth(g, rng) {
  const s = B(g);
  for (const b of s.built) {
    if (b.gone || b.kind === 'works') continue;
    const { p, why } = fallChance(g, b);
    if (rng.chance(p)) fallOf(g, rng, b, why);
  }
  for (const b of s.world) {
    if (b.gone) continue;
    const { p, why } = fallChance(g, b);
    if (rng.chance(p)) { b.gone = { y: g.date.year, how: why ? `${why}에 무너짐` : '무너짐' }; chron(g, `${placeName(b.place)}의 ${J(b.name, '이/가')} 무너지다.`, 8); }
  }
}

/* ---------- 세상의 장인들 ---------- */
const WORLD_TOWNS = ['harfen', 'verden', 'leocast', 'portel', 'eisen', 'solaris', 'graubel', 'serenia', 'gruental', 'klein'];
const worldKinds = (g) => ['bridge', 'hall', 'chapel', 'tower', ...(invented(g, 'bridge') ? ['ironbridge'] : []), ...(invented(g, 'railroad') ? ['station'] : [])];
function npcBuilder(g, rng) {
  const ps = g.people.filter((p) => p.alive && ['carpenter', 'mason'].includes(p.job));
  return ps.length && rng.chance(0.6) ? ps[Math.floor(rng.next() * ps.length)].name : NAMES[Math.floor(rng.next() * NAMES.length)];
}
export function worldBuild(g, rng, { y = g.date.year } = {}) {
  const s = B(g);
  const pl = WORLD_TOWNS[Math.floor(rng.next() * WORLD_TOWNS.length)];
  const ks = worldKinds(g).filter((k) => Array.isArray(KINDS[k].at) && KINDS[k].at.includes(pl));
  if (!ks.length) return null;
  const kind = ks[Math.floor(rng.next() * ks.length)];
  if (s.world.some((b) => !b.gone && b.place === pl && b.kind === kind)) return null;
  const who = npcBuilder(g, rng), by = `${who} 장인`, kn = kindName(g, kind);
  const name = rng.chance(0.5) ? `${townName(pl)} ${kn}` : `${who}의 ${kn}`;
  const b = { id: s.seq++, kind, name, place: pl, y, q: rng.int(40, 95), by, gone: null };
  s.world.push(b);
  if (s.world.length > 16) { const i = s.world.findIndex((x) => x.gone); s.world.splice(i < 0 ? 0 : i, 1); }
  return b;
}
function worldMonth(g, rng) {
  if (g.date.month !== 4 || !rng.chance(0.3)) return;
  const b = worldBuild(g, rng);
  if (b) chron(g, `${placeName(b.place)}에 ${J(b.name, '이/가')} 서다. ${J(b.by, '이/가')} 지었다.`, 6);
}

/* ---------- 내 집은 내 손으로 · 큰 공사의 한 몫 ---------- */
function houseMonth(g) {
  const s = B(g), hb = H(g).build;
  if (hb && hb.place === here(g) && skill(g) >= 25 && adult(g) && free(g)) {
    if (!s.ownBuild) note(g, '집 짓는 목수 옆에서 같이 대패를 잡았다. 공사가 빨라졌다.');
    hb.left -= 0.5; s.ownBuild = { place: hb.place };
  } else if (!hb && s.ownBuild) {
    const pl = s.ownBuild.place, rec = H(g).homes[pl];
    if (rec && L(g).houses.includes(pl)) addBuilt(g, { kind: 'house', place: pl, q: Math.round(clamp(skill(g) * 0.7 + 25, 0, 100)), cut: false, big: false, name: rec.name ?? '내 집', client: g.player.name, own: true });
    s.ownBuild = null;
  }
  for (const id of [...s.worksPart]) {
    const w = WS(g).w[id];
    if (!w) { s.worksPart = s.worksPart.filter((x) => x !== id); continue; }
    if (w.stage === 'done') {
      addBuilt(g, { kind: 'works', place: WORKS[id].place, q: 85, cut: false, big: true, name: WORKS[id].name, client: WORKS[id].name, part: true, named: true });
      s.worksPart = s.worksPart.filter((x) => x !== id);
      note(g, `${J(WORKS[id].name, '이/가')} 다 섰다. 내가 놓은 돌도 그 안에 있다.`);
    }
  }
}

/* ---------- 기술이 나오면 손이 바뀐다 ---------- */
const TECH_LINES = {
  carpenter: [
    ['gear', '톱니 박힌 새 송곳으로 구멍을 뚫었다. 반나절 걸리던 장부 구멍이 한 시진에 끝났다.', 0],
    ['windmill', '풍차 날개 살을 갈아 끼웠다. 언덕 위 바람이 사다리를 흔들었다.', 0],
    ['glass', '창틀에 맑은 유리를 끼웠다. 한 장 깨뜨리면 한 달 품삯이 날아간다.', 0],
    ['factory', '공장에서 켜 온 판자는 두께가 고르다. 대패질할 일이 줄었다. 품삯도 줄었다.', -1],
  ],
  mason: [
    ['brick', '가마에서 갓 나온 벽돌을 줄 맞춰 쌓았다. 돌 다듬는 것보다 세 배는 빠르다.', 1],
    ['paving', '큰길에 돌을 깔았다. 무릎으로 기며 하루 종일 망치로 다졌다.', 0],
    ['crane', '기중기 팔이 돌덩이를 비계 꼭대기까지 들어 올렸다. 예전엔 장정 열이 매달리던 일이다.', 1],
    ['survey', '측량 기사가 박아 둔 말뚝을 따라 기초를 팠다. 한 치도 어긋나지 않았다.', 0],
    ['bridge', '쇠 들보를 잇는 망치 소리 사이로 교각 돌을 쌓았다. 돌만으로 다리를 놓던 때는 지나간다.', 0],
  ],
};
for (const id of ['carpenter', 'mason']) {
  const def = WORK[id];
  if (!def?.work) continue;
  const orig = def.work;
  def.work = function builderWork(g, rng) {
    let text = orig.call(this, g, rng);
    const ls = TECH_LINES[id].filter(([t]) => invented(g, t));
    if (ls.length && rng.chance(0.3)) {
      const [, line, coin] = ls[Math.floor(rng.next() * ls.length)];
      if (coin > 0) g.player.money += coin; else if (coin < 0) pay(g, -coin);
      text += ` ${line}`;
    }
    return text;
  };
}

HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const rng = ownRng(g, 35);
  jobMonth(g, rng);
  shopMonth(g, rng);
  duesMonth(g);
  houseMonth(g);
  ageMonth(g, rng);
  worldMonth(g, rng);
});
// 처음 판: 세상엔 이미 오래된 이름난 건물이 몇 있다
HOOKS.newGame.push((g) => {
  const rng = ownRng(g, 351);
  for (let i = 0; i < 4; i++) worldBuild(g, rng, { y: g.date.year - rng.int(30, 220) });
});
// 대를 이으면: 표식은 집안에 남고(물려받을 수 있다), 작업장과 지은 건물도 집안의 것
HOOKS.heir.push((g) => {
  const s = B(g);
  if (s.mark) s.famMark = s.mark;
  s.mark = null; s.job = null; s.ownBuild = null; s.done = 0; s.places = []; s.examAt = 0;
  s.guild = { tries: 0, banned: 0, dues: 0 };
  if (s.shop) { s.shop.rep = Math.round(s.shop.rep / 2); logB(g, `${J(s.shop.name, '을/를')} 물려받았다.`); }
});
