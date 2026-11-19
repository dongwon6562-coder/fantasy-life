// 광산의 달 흐름: 광맥이 줄고, 버팀목이 낡고, 갱도가 무너지고, 광부들의 불만이 쌓여 파업이 되고,
// 너무 깊이 판 갱도에서는 무엇인가가 깨어난다. 광석 시세는 장사 시세(trade)와 시대(마석)를 따른다.
// 내 광산이 있으면 달마다 몫이 들어온다. 굴림이 많아 따로 난수를 쓴다.
import { WORLD_TICKS } from '../world.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { L, note, chron, queueScene, sceneQueued } from '../adventure/core.js';
import { GOODS, priceAt, isMarket } from '../trade/core.js';
import { WS as wildsState } from '../wilds/state.js';
import { MS, ORES, ORE_IDS, DEEP, DEEP_IDS, clamp, mi, placeName, mlog, oreValue, outputOf } from './state.js';

export const mineRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 97) ^ Math.imul(mi(g) * 67 + salt + 29, 2246822519)) | 0 });
const here = (g) => (g.life ? L(g).place : 'ern');
const near = (g, pl) => { const h = here(g); return pl === h || !!PLACES[h]?.links?.[pl]; };
const atWar = (g) => { const r = g.realm ?? {}; return !!(r.balhart?.war || r.north?.war || r.succession === 'civilwar'); };
const minerHere = (g, id) => g.life && L(g).job?.id === 'miner' && L(g).job.site === id && here(g) === MS(g).sites[id]?.near && !L(g).travel;

// 광석 시세가 끌려가는 곳: 장사 물건과 이어진 것은 쇠망치 골 장터 시세, 아니면 전쟁과 시대
function priceTarget(g, ore) {
  const G = ORES[ore].good;
  if (G && GOODS[G] && isMarket('hammer') && g.trade) return clamp(priceAt(g, 'hammer', G) / GOODS[G].base + 0.1, 0.5, 2.2);
  if (ore === 'silver') return 1 + (atWar(g) ? 0.15 : 0);
  if (ore === 'copper') return 1 + (g.realm?.era ?? 0) * 0.08;
  return 1;
}

export function collapse(g, id, rng, say) {
  const S = MS(g), s = S.sites[id];
  const dead = s.owner === 'me' ? Math.min(s.miners, rng.int(0, Math.max(1, Math.ceil(s.miners / 4)))) : rng.int(1, 7);
  s.collapses += 1; s.dead += dead; s.closed = Math.max(s.closed, rng.int(1, 3));
  s.unrest = clamp(s.unrest + 12 + dead * 3, 0, 100);
  s.safety = clamp(s.safety - 10, 0, 100);
  if (s.owner === 'me') s.miners = Math.max(0, s.miners - dead);
  const txt = dead > 0
    ? `${s.name}의 갱도가 무너졌다. 광부 ${dead}명이 돌아오지 못했다. 마을 여자들이 갱도 입구에 등불을 들고 섰다.`
    : `${s.name}의 갱도 하나가 무너졌다. 다행히 교대 시간이라 갇힌 사람은 없었다.`;
  say(txt, dead >= 5 || s.owner === 'me', s.near);
  mlog(g, `${s.name}: 갱도 붕괴, 광부 ${dead}명 죽음.`);
  if (s.owner === 'me') { note(g, `내 광산 ${s.name}의 갱도가 무너졌다. ${dead ? `광부 ${dead}명이 죽었다.` : '죽은 사람은 없었다.'}`); if (dead) chron(g, `${g.player.name}의 광산 ${s.name}, 갱도가 무너져 광부 ${dead}명이 죽다.`, 35); }
  if (minerHere(g, id) && !g.over && !sceneQueued(g, 'mine_collapse')) queueScene(g, 'mine_collapse', { site: id, dead }, { first: true });
  return dead;
}

export function awaken(g, id, rng, say) {
  const S = MS(g), s = S.sites[id], era = g.realm?.era ?? 0;
  const ks = DEEP_IDS.filter((k) => (DEEP[k].era ?? 0) <= era);
  const kind = rng.pick(ks);
  s.awoke = { kind, since: mi(g) }; s.closed = 0; s.stir = 0;
  const dead = kind === 'hall' ? 0 : rng.int(1, 6);
  s.dead += dead;
  if (s.owner === 'me') s.miners = Math.max(0, s.miners - dead);
  say(DEEP[kind].text(s.name), true, s.near);
  chron(g, `${s.name}에서 너무 깊이 판 갱도가 무엇인가를 깨우다 (${DEEP[kind].name}).`, s.owner === 'me' ? 60 : 40);
  mlog(g, `${s.name}: 깊은 곳에서 ${DEEP[kind].name}.`);
  // 마물의 땅: 갱도에서 기어 나온 것들이 둘레를 어지럽힌다
  const W = g.wilds ? wildsState(g) : null;
  if (W?.land[s.near] && (kind === 'crawlers' || kind === 'worms')) W.land[s.near].level = clamp(W.land[s.near].level + 12, 0, 100);
  if (s.owner === 'me') note(g, `내 광산 ${s.name}에서 깊은 곳의 것이 깨어났다. 광부들이 갱도에 들어가지 않는다.`);
}

export function mineMonth(g) {
  if (!g.mine || g.over) return [];
  const S = MS(g), rng = mineRng(g, 1), now = mi(g), r = g.realm ?? {};
  const news = [];
  const say = (text, big = false, pl = null) => news.push({ text, big, pl });

  for (const o of ORE_IDS) S.price[o] = clamp((S.price[o] ?? 1) + (priceTarget(g, o) - (S.price[o] ?? 1)) * 0.1 + rng.normal(0, 0.03), 0.5, 2.2);

  let income = 0;
  for (const [id, s] of Object.entries(S.sites)) {
    const mine = s.owner === 'me', dwarf = s.owner === 'dwarf';
    if (s.closed > 0) s.closed -= 1;
    // 깨어난 것: 남의 광산은 주인들이 끝내 막는다(드워프가 가장 빠르다). 내 광산은 내가 손써야 한다.
    if (s.awoke) {
      if (!mine && rng.chance(dwarf ? 0.12 : 0.05)) {
        say(`${s.name}의 깊은 갱도를 ${dwarf ? '드워프 석공들이' : '드워프 석공들을 불러'} 돌로 메웠다. ${DEEP[s.awoke.kind].name} 이야기는 그 뒤로 술자리에서만 나온다.`, false, s.near);
        mlog(g, `${s.name}: 깊은 갱도를 메웠다.`);
        s.awoke = null; s.depth = Math.max(1, s.depth - 1); s.closed = rng.int(2, 4);
      }
      continue;
    }
    const working = s.closed <= 0 && !s.strike;
    const crew = mine ? s.miners : 30;
    // 광맥: 캘수록 준다. 남의 광산은 다 캐면 더 깊이 판다.
    if (working && crew > 0) {
      s.vein = clamp(s.vein - (mine ? 0.05 + crew * 0.012 : 0.12), 0, 100);
      if (!mine && s.vein < 25 && rng.chance(0.03)) {
        s.depth = Math.min(9, s.depth + 1); s.vein = clamp(s.vein + 35, 0, 100);
        say(`${s.name}에서 한 층 더 내려가 새 광맥을 찾았다고 한다. 광부를 더 뽑는다.`, false, s.near);
        mlog(g, `${s.name}: 한 층 더 깊이 내려갔다 (${s.depth}층).`);
      }
    }
    // 버팀목은 낡는다. 남의 광산 주인들은 사고가 나면 그제야 손본다.
    s.safety = clamp(s.safety - 0.18, 0, 100);
    if (!mine && s.safety < (dwarf ? 65 : 40) && rng.chance(dwarf ? 0.25 : 0.08)) s.safety = clamp(s.safety + 18, 0, 100);
    // 붕괴
    if (working && crew > 0 && rng.chance(0.0008 + s.depth * 0.0004 + (100 - s.safety) / 100 * 0.005)) collapse(g, id, rng, say);
    // 불만
    const wageGap = mine ? (2.5 - (s.wage ?? 3)) * 2 : (1 - s.wageMul) * 6;
    s.unrest = clamp(s.unrest + (dwarf ? 0.4 : 1) * (rng.normal(0.1, 1.2) + ((r.bread ?? 1) - 1) * 2 + wageGap + (s.safety < 35 ? 0.6 : 0)) + (15 - s.unrest) * 0.03, 0, 100);
    // 파업
    if (!s.strike && s.unrest >= 70 && !dwarf && (mine ? s.miners >= 3 : true) && rng.chance(0.25)) {
      s.strike = { since: now, months: 0 };
      say(`${s.name}의 광부들이 곡괭이를 내려놓았다. ${s.ownerName ?? '주인'}에게 품삯과 버팀목을 요구한다.`, mine, s.near);
      mlog(g, `${s.name}: 파업.`);
      if (mine) note(g, `내 광산 ${s.name}의 광부들이 곡괭이를 내려놓았다.`);
    } else if (s.strike) {
      s.strike.months += 1;
      if (!mine) {
        const x = rng.float(0, 1);
        if (x < 0.2 || s.strike.months >= 6) {
          s.wageMul = clamp(s.wageMul + 0.15, 0.6, 2); s.unrest = 25; s.strike = null;
          say(`${s.name}의 파업이 끝났다. ${J(s.ownerName ?? '주인', '이/가')} 품삯을 올려 주었다. 광부들이 노래하며 갱도로 들어갔다.`, false, s.near);
          mlog(g, `${s.name}: 파업 끝, 품삯이 올랐다.`);
        } else if (x < 0.32) {
          const dead = s.owner === 'empire' || s.owner === 'lord' ? rng.int(0, 4) : 0;
          s.dead += dead; s.unrest = 45; s.strike = null; s.wageMul = clamp(s.wageMul - 0.05, 0.6, 2);
          say(`${s.ownerName ?? '주인'} 쪽에서 병사들을 보내 ${s.name}의 파업을 깨뜨렸다.${dead ? ` 광부 ${dead}명이 죽었다. 갱도 입구에 핏자국이 남았다.` : ' 앞장선 사람들은 끌려갔다.'}`, dead >= 2, s.near);
          mlog(g, `${s.name}: 파업이 깨졌다${dead ? `, 광부 ${dead}명 죽음` : ''}.`);
        }
      } else if (s.strike.months >= 8) {
        s.wage = (s.wage ?? 3) + 1; s.unrest = 30; s.strike = null;
        note(g, `내 광산 ${s.name}의 파업이 여덟 달 만에 끝났다. 감독이 내 이름으로 품삯을 한 닢 올려 주었다.`);
      }
    }
    // 깊은 곳의 기척: 다섯 층부터. 드워프는 어디서 멈출지 안다.
    if (working && s.depth >= 5) {
      s.stir = clamp(s.stir + (s.depth - 4) * (dwarf ? 0.03 : 0.07) + rng.normal(0, 0.25), 0, 100);
      if (s.stir >= 100) awaken(g, id, rng, say);
    } else s.stir = clamp(s.stir - 0.1, 0, 100);
    // 내 광산의 몫
    if (mine) {
      const units = outputOf(s, s.miners);
      const revenue = Math.round(units * oreValue(g, s.ore));
      const wages = Math.round(s.miners * (s.wage ?? 3) * (s.strike ? 0.3 : 1));
      const tax = s.legal ? Math.round(revenue * 0.15) : 0;
      income += revenue - wages - tax;
      if (!s.legal && revenue > 0 && rng.chance(0.02)) s.found = true; // 몰래 판 광산이 들통날 날
    }
  }
  if (income !== 0 && g.player) {
    const pay = Math.max(-g.player.money, income);
    g.player.money += pay;
    S.me.lastIncome = income; S.me.income += income;
    // 품삯을 다 못 주면 광부들이 성낸다
    if (pay > income) for (const id of Object.keys(S.sites)) if (S.sites[id].owner === 'me') S.sites[id].unrest = clamp(S.sites[id].unrest + 10, 0, 100);
  } else S.me.lastIncome = 0;
  return news;
}

WORLD_TICKS.push((g, worldRng, say) => {
  for (const n of mineMonth(g) ?? []) if (n.big || n.pl == null || near(g, n.pl)) say(n.text, n.big);
});
