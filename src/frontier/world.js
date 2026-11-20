// 개척의 달 흐름: 플레이어가 없어도 변경 너머에 개척단이 들어가고, 첫 겨울을 넘기거나 넘기지 못하고,
// 마물과 먼저 살던 이들과 부딪히며, 살아남은 천막은 개척촌이 되고 마을이 되고 고을이 된다. 버려지면 다시 빈 땅이다.
// 흉년과 전쟁은 땅을 찾아 떠나는 사람을 늘리고, 시대가 바뀌면 왕실과 상단이 더 자주 개척단을 보낸다. 굴림이 많아 따로 난수를 쓴다.
import { WORLD_TICKS, atWar } from '../world.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { L, note, chron, queueScene, sceneQueued } from '../adventure/core.js';
import {
  FS, SITES, SITE_IDS, NATIVES, FOUNDERS, NAMES, STAGES, CAP, clamp, mi, flog, siteName, syncNames, ira,
} from './state.js';

export const frontierRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 173) ^ Math.imul(mi(g) * 79 + salt + 61, 2246822519)) | 0 });
const here = (g) => (g.life ? L(g).place : 'ern');
const near = (g, pl) => { const h = here(g); return pl === h || !!PLACES[h]?.links?.[pl]; };
const era = (g) => g.realm?.era ?? 0;
const wildsAt = (g, pl) => g.wilds?.land?.[pl]?.level ?? 30;
const playerAt = (g, id) => !!g.life && L(g).place === id && !L(g).travel;

// 한 해 거둠: 늦여름부터 가을까지가 거의 전부다
const HARVEST = { 1: 0, 2: 0, 3: 0.3, 4: 0.4, 5: 0.5, 6: 0.6, 7: 0.8, 8: 2.6, 9: 3.2, 10: 2.4, 11: 0.4, 12: 0 };
const WINTER = [12, 1, 2];
const EFF = [0, 0.62, 0.85, 1.0, 1.05];

function pickFounder(rng, id, g) {
  const c = SITES[id].claim;
  if (c === 'valhart') return rng.pick(['empire', 'empire', 'tenant']);
  if (g.world?.famine && rng.chance(0.5)) return rng.pick(['refugee', 'tenant']);
  if (atWar(g) && rng.chance(0.4)) return 'refugee';
  if (!c) return rng.pick(['refugee', 'tenant', 'guild']);
  return rng.pick(['crown', 'crown', 'guild', 'tenant']);
}
// 개척단이 땅에 들어간다 (NPC든 나든)
export function found(g, id, by, { pop, food, safety = 15, byName = null, rng = null } = {}) {
  const F = FS(g), s = F.sites[id], r = rng ?? frontierRng(g, 7);
  Object.assign(s, {
    stage: 1, pop: pop ?? r.int(25, 50), food: food ?? r.int(5, 8), safety, morale: 55, name: null,
    by, byName: byName ?? FOUNDERS[by]?.name ?? '개척단', since: mi(g), winters: 0, mine: by === 'me', chief: by === 'me', raids: 0,
  });
  // 먼저 살던 이들은 처음엔 멀리서 지켜본다. 앞서 버려진 천막이 있었으면 기억이 나쁘다.
  if (SITES[id].native && s.natives !== null) s.natives = clamp((s.natives ?? 0) - s.lost * 10, -100, 100);
  flog(g, `${J(s.byName, '이/가')} ${SITES[id].land}에 천막을 쳤다.`);
  syncNames(g);
  return s;
}
// 버려진다
export function abandon(g, id, why, say) {
  const F = FS(g), s = F.sites[id];
  const name = siteName(id, s);
  say?.(`${name}의 개척민들이 ${why} 땅을 버리고 떠났다. 무너진 울타리와 반쯤 갈아엎은 밭만 남았다.`, s.mine || s.stage >= 3, SITES[id].near);
  flog(g, `${J(name, '이/가')} 버려졌다 (${why}).`);
  if (s.mine || s.chief) note(g, `내가 일군 ${J(name, '이/가')} 버려졌다. ${why}.`);
  if (s.stage >= 2) chron(g, `변경의 ${J(name, '이/가')} 버려지다.`, s.mine ? 40 : 20);
  Object.assign(s, { stage: 0, pop: 0, food: 0, safety: 0, morale: 50, name: null, by: null, byName: null, winters: 0, lost: s.lost + 1, mine: false, chief: false });
  if (g.life && L(g).place === id) L(g).travel = { to: SITES[id].near, left: SITES[id].months, from: id };
  syncNames(g);
}
export function nameSite(g, id, name) {
  const s = FS(g).sites[id];
  s.name = name;
  syncNames(g);
  flog(g, `${SITES[id].land}의 개척촌에 ${ira(name, '라는')} 이름이 붙었다.`);
}
function npcName(rng, id, g) {
  const used = new Set(SITE_IDS.map((k) => FS(g).sites[k].name).filter(Boolean));
  const left = (NAMES[id] ?? ['새마을']).filter((n) => !used.has(n));
  return rng.pick(left.length ? left : ['새마을']);
}

export function frontierMonth(g) {
  if (!g.frontier || g.over) return [];
  const F = FS(g), rng = frontierRng(g, 1), m = g.date.month, now = mi(g);
  const news = [];
  const say = (text, big = false, pl = null) => news.push({ text, big, pl });

  for (const id of SITE_IDS) {
    const d = SITES[id], s = F.sites[id];
    // 빈 땅: 개척단이 들어온다 (흉년·전쟁에 떠나는 사람이 늘고, 시대가 바뀌면 왕실과 상단이 더 자주 보낸다)
    if (s.stage === 0) {
      let p = 0.0011 * (1 + era(g) * 0.4) * (g.world?.famine ? 1.8 : 1) * (atWar(g) ? 1.3 : 1) * (d.monster >= 50 ? 0.6 : 1) * Math.pow(0.75, s.lost);
      if (F.party?.site === id || F.charter?.site === id) p *= 0.3; // 내가 허가장을 쥐고 있으면 다른 개척단은 잘 오지 않는다
      if (rng.chance(p)) {
        const by = pickFounder(rng, id, g);
        found(g, id, by, { rng });
        say(`${J(FOUNDERS[by].name, '이/가')} 변경 너머 ${J(d.land, '으로/로')} 떠났다. 수레 열몇 대에 씨앗 자루와 연장, 아이들을 실었다.`, false, d.near);
      }
      continue;
    }
    const eff = EFF[s.stage] ?? 1;
    const aid = (s.by === 'crown' || s.by === 'empire') && now - s.since < 24 ? 0.35 : 0;
    // 먹을 것: 거둠 + 사냥과 채집 + 처음 두 해의 나라 지원 − 한 달 먹을 몫
    const trade = s.natives > 30 ? 0.15 : 0;
    s.food += HARVEST[m] * d.soil * eff * (s.seedEaten && m >= 8 && m <= 10 ? 0.5 : 1) + 0.25 + aid + trade - 1;
    if (m === 11) s.seedEaten = false;
    s.food = Math.min(s.food, 14);
    if (s.food < 0) {
      const lossRate = WINTER.includes(m) ? 0.12 : 0.07;
      const dead = Math.max(1, Math.round(s.pop * lossRate));
      s.pop -= dead; s.food = 0; s.morale = clamp(s.morale - 8, 0, 100);
      if (WINTER.includes(m) && s.winters === 0 && rng.chance(0.5)) say(`${siteName(id, s)}의 첫 겨울이 혹독하다. 곡간이 바닥나 ${dead}명이 굶주림과 추위로 죽었다고 한다.`, false, d.near);
    }
    if (m === 3) { s.winters += 1; if (s.mine || s.chief) FS(g).me.winters += 1; }
    // 마물
    const raidP = ((d.monster + wildsAt(g, d.near) / 3) / 100) * 0.05 * (1 - s.safety / 150);
    if (rng.chance(raidP)) {
      const dead = Math.max(0, Math.round(rng.int(2, 8) * (1 - s.safety / 120)));
      s.pop = Math.max(0, s.pop - dead); s.raids += 1;
      s.safety = clamp(s.safety - 4, 0, 100); s.morale = clamp(s.morale - 6, 0, 100); s.food = Math.max(0, s.food - 0.5);
      say(`${siteName(id, s)}에 마물이 내려왔다. ${dead ? `${dead}명이 죽었다.` : '목책 덕에 죽은 사람은 없었다.'}`, false, d.near);
      if (playerAt(g, id) && !sceneQueued(g, 'frontier_raid')) queueScene(g, 'frontier_raid', { site: id, dead }, { first: true });
    }
    // 먼저 살던 이들
    const N = d.native ? NATIVES[d.native] : null;
    if (N && s.natives !== null) {
      if (!s.mine && rng.chance(0.012 * s.stage)) s.natives = clamp(s.natives - 5, -100, 100); // 밭이 넓어질수록 그들의 땅이 줄어든다
      if (s.natives <= -40 && rng.chance(0.035)) {
        const dead = rng.int(1, 4); s.pop = Math.max(0, s.pop - dead); s.clash += 1; s.morale = clamp(s.morale - 5, 0, 100);
        say(`${J(N.name, '이/가')} ${siteName(id, s)}의 밭을 불태웠다. ${dead}명이 다쳐 죽었다. 개척민들은 그들을 도적이라 부르고, 그들은 개척민을 도둑이라 부른다.`, false, d.near);
      }
      if (!s.mine && s.pop >= 160 && s.natives <= -30 && rng.chance(0.01)) {
        s.natives = null;
        say(`${siteName(id, s)}의 사람들이 무기를 들고 ${J(N.name, '을/를')} 몰아냈다. 그들의 장대 집과 사냥터는 이제 밭이 된다. 그 일을 노래로 부르는 사람은 없다.`.replace('장대 집과 사냥터', d.native === 'fen' ? '장대 집과 물길' : '천막과 사냥터'), false, d.near);
        flog(g, `${siteName(id, s)}: ${J(N.name, '이/가')} 쫓겨났다.`);
      } else if (s.natives > -40 && s.natives < 60 && rng.chance(0.01)) s.natives = clamp(s.natives + 4, -100, 100); // 해가 가면 낯이 익는다
    }
    // 사람이 늘고 준다
    if (s.food > 2 && s.morale > 40 && s.pop < CAP[s.stage]) {
      s.pop += Math.max(0, Math.round(s.pop * 0.0022 + (rng.chance(0.1 + s.stage * 0.05) ? rng.int(1, 2 + s.stage) : 0)));
    }
    if (s.food < 1 && s.morale < 35 && rng.chance(0.15)) { const gone = rng.int(1, Math.max(2, Math.round(s.pop / 10))); s.pop -= gone; }
    s.pop = Math.max(0, Math.min(s.pop, CAP[s.stage] + 40));
    // 울타리와 마음
    if (!s.mine && s.safety < s.stage * 25) s.safety = clamp(s.safety + 0.35, 0, 100);
    const want = 50 + (s.food >= 4 ? 10 : s.food < 1.5 ? -15 : 0) + (s.safety - 40) / 5 + (s.chief && playerAt(g, id) ? 6 : 0);
    s.morale = clamp(s.morale + (want - s.morale) * 0.08 + rng.normal(0, 1.5), 0, 100);
    // 버려진다
    if (s.pop < 10 || (s.morale < 12 && rng.chance(0.2))) { abandon(g, id, s.pop < 10 ? '남은 사람이 너무 적어' : '더는 버틸 수 없어', say); continue; }
    // 자란다
    const years = (now - s.since) / 12;
    if (s.stage === 1 && s.winters >= 2 && s.pop >= 45) {
      s.stage = 2;
      if (!s.name && !s.mine) s.name = npcName(rng, id, g);
      syncNames(g);
      const nm = siteName(id, s);
      say(`변경 너머 ${SITES[id].land}의 천막들이 두 겨울을 넘기고 개척촌이 되었다. ${s.name ? `개척민들은 그곳을 ${ira(nm, '라 부른다')}.` : '아직 이름이 없다.'} 이제 그리로 가는 길이 지도에 그려진다.`, true, d.near);
      chron(g, `변경 너머 ${SITES[id].land}에 개척촌이 서다${s.name ? ` (${s.name})` : ''}.`, s.mine ? 50 : 30);
      flog(g, `${nm}: 개척촌이 되었다.`);
      if (s.mine && !s.name && playerAt(g, id) && !sceneQueued(g, 'frontier_name')) queueScene(g, 'frontier_name', { site: id }, { first: true });
    } else if (s.stage === 2 && s.pop >= 150 && years >= 12) {
      s.stage = 3; syncNames(g);
      const nm = siteName(id, s);
      say(`개척촌 ${J(nm, '이/가')} 어엿한 마을이 되었다. 장날이 서고, 순회 사제가 다녀가고, 처음으로 그곳에서 태어나 그곳에서 늙은 사람이 생겼다.`, true, d.near);
      chron(g, `${J(nm, '이/가')} 마을이 되다.`, 35);
      flog(g, `${nm}: 마을이 되었다.`);
    } else if (s.stage === 3 && s.pop >= 450 && years >= 40 && era(g) >= 1) {
      s.stage = 4; syncNames(g);
      const nm = siteName(id, s);
      say(`변경의 ${J(nm, '이/가')} 고을이 되었다. 돌로 지은 집이 늘고 성벽 이야기가 나온다. 한때 그곳이 빈 땅이었다는 것을 아는 사람은 이제 노인들뿐이다.`, true, d.near);
      chron(g, `${J(nm, '이/가')} 고을이 되다.`, 45);
      flog(g, `${nm}: 고을이 되었다.`);
    }
    // 이름 없는 내 개척촌: 개척민들이 기다리다 못해 스스로 이름을 붙인다
    if (s.stage >= 2 && !s.name && s.mine && years >= 6 && rng.chance(0.05)) { nameSite(g, id, npcName(rng, id, g)); if (s.chief) note(g, `개척민들이 기다리다 못해 마을을 ${ira(siteName(id, s), '라고')} 부르기 시작했다.`); }
  }
  syncNames(g);
  return news;
}

WORLD_TICKS.push((g, worldRng, say) => {
  for (const n of frontierMonth(g) ?? []) if (n.big || n.pl == null || near(g, n.pl)) say(n.text, n.big);
});
