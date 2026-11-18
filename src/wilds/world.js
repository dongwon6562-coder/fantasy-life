// 마물의 땅이 달마다 움직인다: 고장마다 기세가 늘고 줄고, 둥지가 생겨 자라고, 떼가 이웃 고장으로 옮기고,
// 작은 마을이 버려졌다가 다시 사람이 든다. 사냥꾼 길드는 그 흐름을 따라 현상금을 걸고, 부산물 시세가 움직인다.
// 시대가 바뀌면 처음 보는 마물이 나타난다. 굴림이 많아 따로 난수를 쓴다 (세상 난수와 다른 갈래 점검을 흔들지 않게).
import { WORLD_TICKS } from '../world.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { L } from '../adventure/core.js';
import { WS, KINDS, KIND_IDS, LANDS, HAMLETS, clamp, mi, placeName, kindsAt, eraNow, wlog } from './state.js';

export const wildRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 71) ^ Math.imul(mi(g) * 59 + salt + 17, 2246822519)) | 0 });
const near = (g, pl) => { const here = g.life ? L(g).place : 'ern'; return pl === here || !!PLACES[here]?.links?.[pl]; };

export function wildsMonth(g) {
  if (!g.wilds || g.over) return;
  const S = WS(g), rng = wildRng(g, 1), now = mi(g), r = g.realm ?? {}, era = eraNow(g);
  const news = [];
  const say = (text, big = false, pl = null) => news.push({ text, big, pl });

  // 시대가 바뀌면 처음 보는 마물이 나타난다
  for (const k of KIND_IDS) {
    if (S.seen.includes(k) || KINDS[k].era > era) continue;
    S.seen.push(k);
    say(KINDS[k].first ?? `${J(KINDS[k].name, '이/가')} 나타났다는 소문이 돈다.`, true);
    wlog(g, `처음 보는 마물: ${KINDS[k].name}.`);
  }

  // 고장마다 기세: 왕국의 마물 기세, 땅의 모양, 둥지, 시대, 지난달 사냥이 끌어당긴다
  for (const [pl, Lw] of Object.entries(LANDS)) {
    const s = S.land[pl];
    const target = clamp((r.monsters ?? 30) * 0.7 + Lw.base + 4 + (s.nest ? 6 + s.nest.size * 2 : 0) + era * 2 - (s.hunted ?? 0) * 4, 0, 100);
    s.level = clamp(s.level + (target - s.level) * 0.08 + rng.normal(0, 1.6), 0, 100);
    s.hunted = Math.max(0, (s.hunted ?? 0) * 0.6 - 0.1);
    s.high = s.level >= 70 ? (s.high ?? 0) + 1 : 0;
    // 둥지: 기세가 높으면 생기고, 달마다 자란다. 다른 모험가들이 치기도 한다.
    if (s.nest) {
      s.nest.size = Math.min(10, s.nest.size + (rng.chance(0.5) ? 1 : 0));
      if (rng.chance(0.03 + Math.max(0, 40 - s.level) * 0.002)) {
        say(`${placeName(pl)} 근처의 ${KINDS[s.nest.kind].name} 둥지를 모험가 토벌대가 쳤다고 한다.`, false, pl);
        wlog(g, `${placeName(pl)}: ${KINDS[s.nest.kind].name} 둥지를 다른 토벌대가 쳤다.`);
        S.bounties = S.bounties.filter((b) => !(b.place === pl && b.nest));
        s.nest = null; s.level = clamp(s.level - 15, 0, 100);
      }
    } else if (s.level >= 58 && rng.chance(0.015)) {
      const ks = kindsAt(g, pl);
      if (ks.length) {
        const kind = ks[ks.length - 1 - rng.int(0, Math.min(1, ks.length - 1))];
        s.nest = { kind, size: 1, at: now };
        say(`${placeName(pl)} 근처에 ${KINDS[kind].name} 둥지가 생겼다는 소문이다.`, near(g, pl), pl);
        wlog(g, `${placeName(pl)}: ${KINDS[kind].name} 둥지가 생겼다.`);
      }
    }
    // 떼의 이동: 너무 들끓으면 이웃 고장으로 넘어간다
    if (s.level >= 70 && rng.chance(0.03)) {
      const ks = kindsAt(g, pl), links = Object.keys(PLACES[pl]?.links ?? {}).filter((x) => LANDS[x]);
      if (ks.length && links.length) {
        const kind = rng.pick(ks), to = rng.pick(links);
        s.level = clamp(s.level - 12, 0, 100);
        S.land[to].level = clamp(S.land[to].level + 18, 0, 100);
        S.herds.push({ kind, from: pl, to, at: now });
        if (S.herds.length > 12) S.herds.shift();
        say(`${J(KINDS[kind].herd, '이/가')} ${placeName(pl)}에서 ${placeName(to)} 쪽으로 옮겨 갔다고 한다.`, near(g, to), to);
        wlog(g, `${KINDS[kind].herd}: ${placeName(pl)} → ${placeName(to)}.`);
      }
    }
  }

  // 작은 마을: 들끓으면 사람이 떠나고, 잠잠하면 돌아온다
  for (const [id, H] of Object.entries(HAMLETS)) {
    const h = S.hamlets[id], lv = S.land[H.near]?.level ?? 0;
    if (h.state === 'lived') {
      if (lv >= 70 && (S.land[H.near].high ?? 0) >= 2) h.pop = Math.max(0, h.pop - rng.int(2, 7));
      else if (lv < 55) h.pop = Math.min(100, h.pop + 1);
      if (h.pop <= 0) {
        h.state = 'abandoned'; h.since = now; h.stake = false;
        say(`${placeName(H.near)} 근처의 ${J(HAMLETS[id].name, '이/가')} 비었다. 마지막 남은 사람들이 수레에 짐을 싣고 떠났다고 한다.`, true, H.near);
        wlog(g, `${J(HAMLETS[id].name, '이/가')} 버려졌다.`);
      }
    } else if (h.state === 'abandoned') {
      if (lv < 35 && now - h.since >= 12 && rng.chance(0.04)) {
        h.state = 'returning'; h.pop = 10; h.since = now;
        say(`버려졌던 ${HAMLETS[id].name}에 다시 연기가 오른다. 몇 집이 돌아와 무너진 지붕을 얹고 있다고 한다.`, near(g, H.near), H.near);
        wlog(g, `${HAMLETS[id].name}에 사람들이 돌아오기 시작했다.`);
      }
    } else if (h.state === 'returning') {
      if (lv >= 72) { h.pop = Math.max(0, h.pop - rng.int(3, 8)); if (h.pop <= 0) { h.state = 'abandoned'; h.since = now; h.stake = false; wlog(g, `${HAMLETS[id].name}에 돌아왔던 사람들이 다시 떠났다.`); } }
      else h.pop = Math.min(100, h.pop + rng.int(2, 5));
      if (h.pop >= 50) { h.state = 'lived'; h.since = now; say(`${J(HAMLETS[id].name, '이/가')} 다시 마을 꼴을 갖췄다. 장날도 선다고 한다.`, near(g, H.near), H.near); wlog(g, `${J(HAMLETS[id].name, '이/가')} 다시 마을이 되었다.`); }
    }
  }

  // 사냥꾼 길드 현상금: 기세가 높은 고장에 걸리고, 여섯 달이면 내려간다
  S.bounties = S.bounties.filter((b) => b.until > now && (!b.nest || S.land[b.place]?.nest));
  for (const [pl, s] of Object.entries(S.land)) {
    if (!((PLACES[pl]?.house ?? 0) > 0)) continue;
    if (s.nest && !S.bounties.some((b) => b.place === pl && b.nest)) {
      S.bounties.push({ id: S.seq++, place: pl, kind: s.nest.kind, reward: Math.round(KINDS[s.nest.kind].pow * 1.2 + s.nest.size * 5), until: now + 12, nest: true });
    }
    if (s.level >= 40 && !S.bounties.some((b) => b.place === pl && !b.nest) && rng.chance(0.15)) {
      const ks = kindsAt(g, pl);
      if (ks.length) {
        const kind = rng.pick(ks);
        S.bounties.push({ id: S.seq++, place: pl, kind, reward: Math.round(KINDS[kind].pow * 0.4 + s.level * 0.15), until: now + 6, nest: false });
      }
    }
  }
  if (S.bounties.length > 24) S.bounties.splice(0, S.bounties.length - 24);

  // 부산물 시세: 그 마물이 사는 땅이 들끓으면 흔해서 싸고, 잠잠하면 귀해서 비싸다
  for (const k of KIND_IDS) {
    const lv = Object.entries(LANDS).filter(([, Lw]) => KINDS[k].lands.some((x) => Lw.lands.includes(x))).map(([pl]) => S.land[pl].level);
    S.supply[k] = lv.length ? lv.reduce((a, b) => a + b, 0) / lv.length : 40;
    S.drift[k] = clamp((S.drift[k] ?? 0) * 0.9 + rng.normal(0, 0.04), -0.35, 0.35);
  }
  return news;
}

// 세상의 달 흐름에 붙인다 (소식은 세상 소식으로 나간다)
WORLD_TICKS.push((g, worldRng, say) => {
  const news = wildsMonth(g) ?? [];
  for (const n of news) if (n.big || n.pl == null || near(g, n.pl)) say(n.text, n.big);
});
