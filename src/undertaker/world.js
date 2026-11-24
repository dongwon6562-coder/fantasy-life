// 묘지의 달: 고장마다 죽는 사람이 묘지를 채우고(병이 돌면 넘쳐 공동 구덩이), 차면 새 묘지를 연다.
// 큰 장례 뒤엔 도굴꾼이 꼬이고, 털리면 흉한 소문이 돈다. 집안 무덤이 털리면 elder의 무덤에 흔적이 남는다.
// 장의사 집은 내가 없어도 일꾼이 장례를 받는다. 묘지에서 일하면 소문을 직접 마주한다.
import { HOOKS } from '../hooks.js';
import { queueScene, sceneQueued, chron, L } from '../adventure/core.js';
import { outbreaksAt } from '../health/index.js';
import { spotsAt } from '../haunt/state.js';
import { elderState } from '../elder/index.js';
import { J } from '../narrative/text.js';
import { U, mi, clamp, here, placeName, free, ownRng, YARDS, YARD_IDS, logU, deathWork, shopHere } from './core.js';

/* ---------- 묘지가 찬다 ---------- */
export function yardMonth(g, rng) {
  const s = U(g);
  for (const id of YARD_IDS) {
    const y = s.yards[id], Y = YARDS[id];
    const sick = outbreaksAt(g, id).reduce((a, o) => a + o.sev * (o.kind === 'plague' ? 3 : 1.2), 0);
    const dead = Math.max(0, Math.round(Y.big * (0.6 + rng.next() * 0.8) + sick * Y.big * 2));
    y.wait = clamp(Math.round(y.wait * 0.3 + dead), 0, 40);
    y.full = clamp(y.full + dead * 0.12 / Y.big, 0, 100);
    if (sick >= 1.5 && !y.pit) { y.pit = true; chron(g, `${placeName(id)}에 시신이 넘쳐 ${YARDS[id].name} 끝에 긴 공동 구덩이를 팠다.`, 20); }
    if (sick < 0.3 && y.pit) y.pit = false;
    if (y.full >= 100 && mi(g) - y.newAt >= 60) {
      y.full = 35; y.newAt = mi(g);
      chron(g, `${J(YARDS[id].name, '이/가')} 다 차서 ${placeName(id)} 사람들이 성벽 밖에 새 묘지를 열었다.`, 10);
      if (here(g) === id) logU(g, `${YARDS[id].name}에 더 묻을 자리가 없어 새 묘지를 열었다.`);
    }
    y.rich = Math.max(0, y.rich - 0.15);
    y.rumor = clamp(y.rumor - 1.5, spotsAt(g, id).length ? 25 : 0, 100);
  }
}

/* ---------- 도굴꾼 (플레이어 없이도) ---------- */
export function robMonth(g, rng) {
  const s = U(g);
  for (const id of YARD_IDS) {
    const y = s.yards[id];
    if (mi(g) - y.guardAt <= 1) continue; // 이번 달에 누가 밤을 지켰다
    if (!rng.chance(0.012 * YARDS[id].big + y.rich * 0.02)) continue;
    y.robbed += 1; y.rich = 0; y.rumor = clamp(y.rumor + 15, 0, 100);
    if (rng.chance(0.1)) chron(g, `${YARDS[id].name}에서 도굴꾼이 새 무덤을 파헤쳤다.`, 4);
    // 우리 집안 무덤이 그 묘지에 있으면
    const mine = elderState(g).graves.filter((x) => x.place === id && x.kind !== 'ash' && !x.desecrated);
    if (mine.length && rng.chance(0.35)) {
      const gr = mine[Math.floor(rng.next() * mine.length)];
      gr.desecrated = true; gr.tended = Math.max(0, (gr.tended ?? 70) - 25);
      logU(g, `도굴꾼이 ${YARDS[id].name}의 집안 무덤 하나를 파헤쳤다. ${gr.name}의 무덤이다.`);
    }
  }
}

/* ---------- 장의사 집 ---------- */
export function shopMonth(g, rng) {
  const sh = U(g).shop;
  if (!sh) return;
  const y = U(g).yards[sh.place];
  if (!y) return;
  const there = shopHere(g);
  const jobs = Math.min(y.wait, 1 + Math.floor(U(g).skill / 30) + (there ? 1 : 0));
  if (!jobs) return;
  const coffin = Math.min(sh.coffins, jobs);
  sh.coffins -= coffin;
  const n = Math.round(jobs * (2 + YARDS[sh.place].big) * (there ? 1 : 0.5) + coffin * 2 - (rng.chance(0.2) ? 1 : 0));
  if (n > 0) { g.player.money += n; U(g).earned += n; }
  y.wait = Math.max(0, y.wait - jobs);
}

/* ---------- 묘지에 도는 소문: 묘지에서 일하는 사람이 마주한다 ---------- */
function rumorMonth(g, rng) {
  const s = U(g), y = s.yards[here(g)];
  if (!y || L(g).travel || !free(g) || !(deathWork(g) || shopHere(g))) return;
  if (y.rumor < 30 || mi(g) - s.rumorAt < 8 || sceneQueued(g, 'ut_rumor') || !rng.chance(0.5)) return;
  s.rumorAt = mi(g);
  queueScene(g, 'ut_rumor');
}

HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const rng = ownRng(g, 40);
  yardMonth(g, rng);
  robMonth(g, rng);
  shopMonth(g, rng);
  rumorMonth(g, rng);
});

// 대를 이으면: 장의사 집과 집안 무덤 자리는 집안에 남는다. 솜씨는 새 사람이 처음부터.
HOOKS.heir.push((g) => {
  const s = U(g);
  if (s.skill >= 15) s.past.push({ y: g.date.year, skill: Math.round(s.skill), funerals: s.funerals, bodies: s.bodies });
  s.skill = 0; s.evAt = 0; s.rumorAt = -99; s.sellAt = -99; s.funAt = -99;
  if (s.shop) logU(g, `${placeName(s.shop.place)}의 장의사 집을 물려받았다.`);
});
