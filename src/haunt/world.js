// 망자와 저주의 달 흐름.
//   고장마다 흉흉함(dread)이 있다. 갱도에서 사람이 죽고, 마을이 버려지고, 전쟁과 돌림병이 돌면 오르고, 해가 가면 가라앉는다.
//   흉흉한 고장에는 흉한 자리가 생긴다. 셋 가운데 둘은 헛소문이고, 하나쯤은 진짜 잔향이다. 잔향은 해마다 엷어지고,
//   교단 사제나 시골 영매가 풀기도 한다. 봉인이 흔들리는 시절에는 아주 드물게 짙은 잔향 하나가 망령이 된다.
//   내가 지닌 저주받은 물건과 집안의 저주도 여기서 달마다 탈을 낸다. 굴림이 많아 따로 난수를 쓴다.
import { WORLD_TICKS, atWar } from '../world.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { J, hasBatchim } from '../narrative/text.js';
import { L, note, chron, stress } from '../adventure/core.js';
import { HAMLETS } from '../wilds/state.js';
import { SS as sealState, stageOf, sealPower } from '../seal/state.js';
import { realmPersonName } from '../realms/index.js';
import {
  HS, KINDS, DEATHS, TRUTHS, ITEMS, CURSES, EXORCISTS, MEDIUMS, clamp, mi, placeName, hlog, liveSpots, realmOfPlace,
} from './state.js';

export const hauntRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 131) ^ Math.imul(mi(g) * 71 + salt + 43, 2654435761)) | 0 });
const here = (g) => (g.life ? L(g).place : 'ern');
const near = (g, pl) => { const h = here(g); return pl === h || !!PLACES[h]?.links?.[pl]; };
export const sealStage = (g) => Math.max(g.seal ? sealState(g).stage ?? 0 : 0, stageOf(sealPower(g)));
// 사람이 사는 뭍의 고장
const LAND = Object.keys(PLACES).filter((p) => !PLACES[p].hidden && PLACES[p].realm !== 'sea');

const NAMES = {
  house: ['외딴 기와집', '방앗간 집', '상인의 빈 저택', '강가 오두막', '대장간 뒷집', '과부네 빈집'],
  grave: ['북쪽 언덕 옛 묘지', '담 밖 무연고 묘', '돌림병 구덩이 묘지', '이름 없는 비석 골'],
  well: ['장터 뒤 막아 둔 우물', '성당 옆 마른 우물', '버드나무 아래 옛 우물'],
  field: ['갈대밭 옛 싸움터', '까마귀 언덕', '무너진 목책 자리'],
};
const FALLBACK = { m: ['한스', '루카', '오토', '베른', '파울', '야콥'], f: ['마르타', '안나', '엘제', '리나', '헤다', '그레타'], last: ['', ''] };
function deadName(rng, pl) {
  const sex = rng.chance(0.5) ? 'm' : 'f';
  let n = null;
  try { n = realmPersonName(rng, realmOfPlace(pl), sex); } catch { n = null; }
  return n?.name ?? rng.pick(FALLBACK[sex]);
}

// 흉한 자리를 하나 만든다. opts: { kind, name, real, power, from }
export function makeSpot(g, rng, pl, opts = {}) {
  const H = HS(g), kind = opts.kind ?? rng.pick(['house', 'grave', 'well']);
  const d = rng.pick(DEATHS[kind]);
  const st = sealStage(g);
  const real = opts.real ?? rng.chance(0.3 + st * 0.05 + (['mine', 'field', 'hamlet'].includes(kind) ? 0.1 : 0));
  const id = `h${H.seq++}`;
  H.spots[id] = {
    name: opts.name ?? `${placeName(pl)} ${rng.pick(NAMES[kind] ?? NAMES.house)}`, place: pl, kind,
    dead: { name: deadName(rng, pl), how: d.how, grief: d.grief },
    power: real ? opts.power ?? rng.int(25, 65) : 0, real, state: 'quiet', wraith: false, known: 0,
    truth: real ? null : rng.pick(TRUTHS), since: mi(g), hurt: 0, robbed: 0, from: opts.from ?? null,
  };
  // 너무 많아지면 오래되고 풀린 자리부터 잊는다
  const ids = Object.keys(H.spots);
  if (ids.length > 14) {
    const old = ids.find((k) => H.spots[k].state === 'laid' || H.spots[k].state === 'gone') ?? ids.find((k) => !H.spots[k].wraith && H.spots[k].known === 0);
    if (old) delete H.spots[old];
  }
  H.dread[pl] = clamp((H.dread[pl] ?? 0) + 8, 0, 100);
  return id;
}

// 자리가 풀린다 (누가 풀었든)
export function laySpot(g, id, how) {
  const H = HS(g), s = H.spots[id];
  if (!s) return;
  s.state = 'laid'; s.power = 0;
  if (s.wraith) { s.wraith = false; if (H.wraith === id) H.wraith = null; }
  H.dread[s.place] = clamp((H.dread[s.place] ?? 0) - 15, 0, 100);
  hlog(g, `${s.name}: ${how}`);
}

// 망령이 된다: 봉인의 틈에서 샌 힘이 짙은 잔향을 채운다
export function becomeWraith(g, id, say) {
  const H = HS(g), s = H.spots[id];
  s.wraith = true; s.power = 100; s.state = 'restless';
  H.wraith = id; H.wraithAt = mi(g);
  H.dread[s.place] = clamp((H.dread[s.place] ?? 0) + 35, 0, 100);
  say(`${s.name}에서 사람이 죽어 나갔다. 밤마다 되풀이되던 것이 이제 되풀이에서 멈추지 않는다. ${s.dead.name}의 모습을 한 것이 문간까지 와서 산 사람의 이름을 부른다고 한다. 교단은 사제단을 보낸다고 했다.`, true, s.place);
  chron(g, `${placeName(s.place)}의 ${s.name}, ${s.dead.name}의 잔향이 망령이 되다. 북쪽 봉인이 흔들리던 해였다.`, 55);
  hlog(g, `${s.name}: 망령이 되었다.`);
}

function misfortune(g, rng, why) {
  if (!g.life || !g.player || g.over) return;
  const r = rng.next();
  if (r < 0.35) { const n = Math.min(g.player.money, rng.int(3, 12)); g.player.money -= n; note(g, `${why} 이번 달엔 은화 ${n}닢이 어디론가 새어 나갔다.`); }
  else if (r < 0.7) { stress(g, rng.int(4, 9)); note(g, `${why} 잠을 설치는 밤이 이어졌다.`); }
  else { g.player.fatigue = Math.min(100, (g.player.fatigue ?? 0) + 15); note(g, `${why} 몸이 까닭 없이 무겁다.`); }
}

export function hauntMonth(g) {
  if (!g.haunt || g.over) return [];
  const H = HS(g), rng = hauntRng(g, 1), now = mi(g), st = sealStage(g);
  const news = [];
  const say = (text, big = false, pl = null) => news.push({ text, big, pl });
  const bump = (pl, n) => { if (pl) H.dread[pl] = clamp((H.dread[pl] ?? 0) + n, 0, 100); };
  const live = liveSpots(g).length;

  // 1) 죽음이 흉흉함을 쌓는다: 갱도, 버려진 마을, 전쟁, 돌림병
  for (const [id, s] of Object.entries(g.mine?.sites ?? {})) {
    const was = H.seen.mine[id] ?? s.dead;
    const d = (s.dead ?? 0) - was;
    H.seen.mine[id] = s.dead ?? 0;
    if (d > 0) {
      bump(s.near, d * 3);
      if (d >= 3 && live < 12 && rng.chance(0.3)) { const k = makeSpot(g, rng, s.near, { kind: 'mine', name: `${s.name}의 무너진 아랫갱` }); say(`${s.name}의 무너진 아랫갱에서 밤이면 돌 두드리는 소리가 난다고 한다. 광부들은 그 갱도 앞을 지날 때 모자를 벗는다.`, false, s.near); hlog(g, `${H.spots[k].name}: 소문이 돌기 시작했다.`); }
    }
  }
  for (const [id, h] of Object.entries(g.wilds?.hamlets ?? {})) {
    if (h.state !== 'abandoned' || now - (h.since ?? now) < 12 || H.seen.hamlet[id] === h.since || !HAMLETS[id]) continue;
    if (rng.chance(0.05)) {
      H.seen.hamlet[id] = h.since;
      const pl = HAMLETS[id].near;
      if (live < 12) { makeSpot(g, rng, pl, { kind: 'hamlet', name: `${HAMLETS[id].name} 터` }); say(`버려진 ${HAMLETS[id].name}에 밤이면 불빛이 하나 켜진다는 말이 돈다. 지나던 사냥꾼은 우물가에서 누가 물을 긷는 소리를 들었다고 했다.`, false, pl); }
    }
  }
  // 파헤쳐진 집안 무덤: 조상의 넋은 그 자리를 떠나지 않는다 (진짜 잔향)
  for (const gr of g.elder?.graves ?? []) {
    if (!gr.desecrated || !gr.byPlayer || H.seen.grave?.[gr.id]) continue;
    (H.seen.grave ??= {})[gr.id] = now;
    const k = makeSpot(g, rng, gr.place, { kind: 'grave', name: `${placeName(gr.place)}의 파헤쳐진 ${gr.name}의 무덤`, real: true, power: 55 });
    H.spots[k].dead = { name: gr.name, how: '묻힌 뒤에 무덤이 파헤쳐졌다', grief: 'rite' };
    say(`파헤쳐진 ${gr.name}의 무덤가에서 밤마다 흙 긁는 소리가 난다고 한다.`, false, gr.place);
  }
  if (atWar(g)) {
    for (const pl of ['graubel', 'eisen']) bump(pl, 1);
    if (live < 12 && rng.chance(0.006)) { const pl = rng.pick(['graubel', 'eisen', 'verden']); makeSpot(g, rng, pl, { kind: 'field' }); say(`${placeName(pl)} 둘레 옛 싸움터에서 밤마다 대열 맞춰 걷는 발소리가 들린다고 한다.`, false, pl); }
  }
  if (g.world?.plague) {
    for (const pl of ['harfen', 'leocast', 'verden']) bump(pl, 1);
    if (live < 12 && rng.chance(0.012)) { const pl = rng.pick(['harfen', 'leocast', 'verden']); makeSpot(g, rng, pl, { kind: rng.pick(['grave', 'well']) }); say(`${placeName(pl)}에서 열병 때 묻은 구덩이 둘레로 흉한 말이 돈다.`, false, pl); }
  }
  // 어디서나 조금씩: 오래된 집과 묘지에는 늘 이야기가 붙는다
  if (live < 10 && rng.chance(0.014)) {
    const pl = rng.pick(LAND);
    const k = makeSpot(g, rng, pl);
    say(`${placeName(pl)}의 ${H.spots[k].name.replace(`${placeName(pl)} `, '')}에 대한 흉한 이야기가 돈다. ${H.spots[k].dead.name}${hasBatchim(H.spots[k].dead.name) ? '이라는' : '라는'} 사람이 ${H.spots[k].dead.how}고 한다.`, false, pl);
  }

  // 2) 흉한 자리들
  for (const [id, s] of Object.entries(H.spots)) {
    if (s.state !== 'quiet' && s.state !== 'restless') continue;
    if (s.wraith) {
      // 망령: 엷어지지 않는다. 봉인이 다시 단단해지면 힘이 빠진다.
      if (st < 3) s.power = clamp(s.power - 4, 0, 100);
      bump(s.place, 4);
      if (rng.chance(0.2)) { s.hurt += 1; say(`${placeName(s.place)}에서 또 사람이 죽었다. ${s.name} 쪽 길에서 얼어붙은 얼굴로 발견되었다.`, false, s.place); }
      const p = (EXORCISTS.includes(s.place) ? 0.06 : 0.035) + (st < 3 ? 0.1 : 0) + (s.power < 50 ? 0.1 : 0);
      if (rng.chance(p)) {
        laySpot(g, id, '교단 사제단이 망령을 흩었다.');
        say(`교단 사제단이 ${s.name}에서 이레 밤낮 기도한 끝에 망령을 흩었다. 사제 둘이 돌아오지 못했다. ${placeName(s.place)} 사람들은 그제야 밤에 문을 열었다.`, true, s.place);
        chron(g, `교단 사제단, ${placeName(s.place)}의 망령을 흩다.`, 40);
      }
      continue;
    }
    if (s.real) {
      s.power = clamp(s.power - 0.28 + st * 0.06 + (H.dread[s.place] ?? 0) / 600, 0, 100);
      s.state = s.power >= 40 ? 'restless' : 'quiet';
      if (s.power <= 2) { s.state = 'gone'; hlog(g, `${s.name}: 잔향이 흩어졌다.`); continue; }
      if (s.state === 'restless') {
        bump(s.place, 0.8);
        if (rng.chance(0.025)) { s.hurt += 1; say(`${s.name} 근처에서 사람이 정신을 놓고 쓰러졌다. 깨어나서는 ${s.dead.name}의 목소리로 몇 마디를 하다가 그쳤다고 한다.`, false, s.place); }
      }
      // 봉인이 흔들리는 시절, 짙은 잔향 하나가 망령이 된다 (아주 드물게)
      if (!H.wraith && st >= 3 && s.power >= 50 && now - (H.wraithAt ?? 0) > 120 && rng.chance(0.012 * (st - 2))) { becomeWraith(g, id, say); continue; }
    } else {
      if (rng.chance(0.012) || now - s.since > 120) {
        s.state = 'gone';
        say(`${s.name}의 흉한 소문은 알고 보니 ${s.truth}. 사람들은 한동안 서로 멋쩍어했다.`, false, s.place);
        hlog(g, `${s.name}: 헛소문이었다 (${s.truth}).`);
        continue;
      }
    }
    // 사제와 영매가 푼다 (진짜든 가짜든, 사람들 마음은 가라앉는다)
    if (EXORCISTS.includes(s.place) && rng.chance(s.real ? 0.008 : 0.016) && s.power < 60) { laySpot(g, id, '교단 사제가 정화 의식을 올렸다.'); continue; }
    if (MEDIUMS[s.place] && rng.chance(s.real ? 0.007 : 0.01)) { laySpot(g, id, `${J(MEDIUMS[s.place].name, '이/가')} 넋을 달랬다.`); continue; }
  }

  // 3) 흉흉함은 가라앉고, 흉흉한 곳에는 사기꾼 무당이 꼬인다
  for (const pl of Object.keys(H.dread)) {
    H.dread[pl] = clamp(H.dread[pl] - 0.7, 0, 100);
    const f = H.frauds[pl] ?? 0;
    if (H.dread[pl] >= 25 && f < 3 && rng.chance(0.03)) H.frauds[pl] = f + 1;
    else if (f > 0 && rng.chance(0.02)) H.frauds[pl] = f - 1;
    if (H.dread[pl] <= 0 && !(H.frauds[pl] > 0)) { delete H.dread[pl]; delete H.frauds[pl]; }
  }

  // 4) 내가 지닌 저주받은 물건
  if (g.life && g.player && H.items.length) {
    for (const it of H.items) {
      it.power = clamp(it.power - 0.15, 0, 100);
      if (rng.chance(0.06 + it.power / 600)) misfortune(g, rng, `${ITEMS[it.kind]?.name ?? '그 물건'} 탓일까.`);
      if (!H.curse && now - it.since > 36 && it.power >= 45 && rng.chance(0.015)) {
        H.curse = { kind: 'item', by: ITEMS[it.kind]?.name ?? '물건', why: `${J(ITEMS[it.kind]?.name ?? '저주받은 물건', '을/를')} 너무 오래 지녔다`, power: 50, gen: L(g).gen ?? 1, since: now, place: here(g) };
        H.me.cursed += 1;
        note(g, `${J(ITEMS[it.kind]?.name ?? '그 물건', '을/를')} 지닌 지 몇 해가 되었다. 집안 아이들이 같은 꿈을 꾸기 시작했다. 원념이 물건에서 핏줄로 옮아왔다.`);
        hlog(g, `${J(ITEMS[it.kind]?.name ?? '물건', '이/가')} 집안의 저주가 되었다.`);
      }
    }
  }
  // 5) 집안의 저주: 가끔 탈을 낸다. 해가 가면 아주 조금씩 엷어진다.
  if (H.curse && g.life) {
    H.curse.power = clamp(H.curse.power - 0.05, 0, 100);
    if (rng.chance(0.03 + H.curse.power / 1500)) misfortune(g, rng, `${CURSES[H.curse.kind]?.name ?? '집안의 저주'} 탓이라고 어른들은 말했다.`);
  }
  return news;
}

WORLD_TICKS.push((g, worldRng, say) => {
  for (const n of hauntMonth(g) ?? []) if (n.big || n.pl == null || near(g, n.pl)) say(n.text, n.big);
});
