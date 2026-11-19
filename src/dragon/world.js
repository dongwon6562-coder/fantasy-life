// 잠든 용의 달 흐름: 용왕들의 잠이 세상의 흔들림(봉인, 시대, 도굴꾼과 원정대)에 따라 얕아지고 깊어진다.
// 잠이 얕아지면 징조가 먼저 오고, 드물게 깨어난다. 깨어난 용은 노여움이 크면 불을 놓고, 봉인이 흔들리는 때라면 북쪽으로 날아가기도 한다.
// 용 숭배자들의 세, 보물을 노리는 원정대, 젊은 용의 노략질도 여기서 굴린다. 굴림이 많아 따로 난수를 쓴다.
import { WORLD_TICKS } from '../world.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { L, note, chron, queueScene, sceneQueued } from '../adventure/core.js';
import { realmOf } from '../realms/index.js';
import { SS as sealState } from '../seal/state.js';
import { SIGNS } from '../omen/state.js';
import { addSign, PRE } from '../omen/world.js';
import { legend } from '../legends/state.js';
import { WS as wildsState, HAMLETS, LANDS as WILD_LANDS } from '../wilds/state.js';
import { PS, pnews, short as realmShort } from '../politics/state.js';
import { E as estate } from '../estate/core.js';
import { sellHome } from '../estate/manage.js';
import { DS, DRAGONS, SLEEPERS, clamp, mi, nameOf, dlog, dragonOf, totalWakes, know } from './state.js';

export const dragonRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 83) ^ Math.imul(mi(g) * 61 + salt + 23, 2654435761)) | 0 });
const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
const here = (g) => (g.life ? L(g).place : 'ern');
const near = (g, pl) => { const h = here(g); return pl === h || !!PLACES[h]?.links?.[pl]; };
const inMountains = (g) => ['gorge', 'hammer', 'graubel'].includes(here(g));

// 예언과 징조에 '용이 깨어난다'를 더한다: 용이 뒤척이기 시작하면 징조가 뜨고, 정말 깨어나면 사람들이 그 징조를 떠올린다.
SIGNS.dragon ??= {
  name: '잠든 용이 깨어난다', portent: '천룡 산맥에 잠든 것이 눈을 뜬다',
  texts: [
    ['봉우리의 연기', '천룡 산맥 서쪽 봉우리에서 가는 연기가 오른다고 한다. 불을 피울 사람이 살지 않는 곳이다.'],
    ['따뜻해진 눈 녹은 물', '구렁목 아래 개울물이 한겨울에도 미지근하다. 드워프 노인들이 산 쪽을 보며 수염을 쓸어내린다.'],
    ['남쪽으로 쫓겨 오는 와이번', '와이번들이 무리 지어 산맥 남쪽으로 내려온다. 무엇인가에 쫓기는 꼴이라고 사냥꾼들이 말한다.'],
  ],
};
PRE.dragon ??= { cond: () => false, snap: (g) => ({ wakes: totalWakes(g) }), test: (g, s) => totalWakes(g) > (s.snap?.wakes ?? 0), due: [3, 20] };

const STIR_SIGNS = [
  (n) => `천룡 산맥 서쪽에서 땅이 울렸다. 구렁목의 드워프들이 갱도에서 나와 하늘을 본다. ${J(n, '이/가')} 뒤척인다는 말이 돈다.`,
  () => '산맥 남쪽 목장에서 소 떼가 밤새 울부짖었다. 아침에 보니 울타리가 모두 북쪽에서 남쪽으로 쓰러져 있었다.',
  () => '와이번 떼가 산맥을 등지고 남쪽으로 내려왔다. 사냥꾼들은 와이번이 무엇에 쫓기는지 말하지 않는다.',
  () => '얼음 고개의 빙하에 큰 금이 갔다. 고개를 넘던 상인들이 짐을 버리고 돌아왔다.',
];

// 불: 용이 한 고장을 태운다. 그 땅의 작은 마을은 비고, 마물도 타 죽고, 내 집이 있으면 탄다.
export function burnPlace(g, id, pl, say, record, why = '') {
  const name = nameOf(id), S = DS(g), d = dragonOf(g, id);
  d.burned = true;
  const pName = placeName(pl);
  say(`${J(name, '이/가')} ${pName} 하늘에 나타났다. 하룻밤 사이에 ${pName}의 지붕 절반이 불탔다.${why ? ` ${why}` : ''} 살아남은 사람들은 그 날개 소리를 평생 잊지 못할 것이다.`, true);
  record?.(`${name}, ${J(pName, '을/를')} 불태우다`);
  chron(g, `${J(name, '이/가')} ${J(pName, '을/를')} 불태우다.`, 85);
  dlog(g, `${J(name, '이/가')} ${J(pName, '을/를')} 불태웠다.`);
  know(g, id, 2);
  // 마물의 땅: 들끓던 것들도 탔다. 둘레의 작은 마을은 빈다.
  const W = g.wilds ? wildsState(g) : null;
  if (W?.land[pl]) W.land[pl].level = clamp(W.land[pl].level - 20, 0, 100);
  if (W) for (const [hid, H] of Object.entries(HAMLETS)) if (H.near === pl && W.hamlets[hid]?.state !== 'abandoned') { W.hamlets[hid].state = 'abandoned'; W.hamlets[hid].pop = 0; W.hamlets[hid].since = mi(g); W.hamlets[hid].stake = false; }
  // 나라가 흔들린다
  const nation = realmOf(pl);
  if (g.politics && PS(g).stab[nation] != null) { PS(g).stab[nation] = clamp(PS(g).stab[nation] - 6, 0, 100); pnews(g, `${J(name, '이/가')} ${realmShort(nation)}의 ${J(pName, '을/를')} 불태웠다.`); }
  // 내 집
  if (g.life && L(g).houses?.includes(pl)) {
    const h = estate(g).homes?.[pl];
    if (h) {
      h.cond = Math.max(0, h.cond - (here(g) === pl ? 45 : 75));
      if (h.cond <= 0) { sellHome(g, pl); note(g, `${pName}의 집이 용의 불에 타 무너졌다.`); chron(g, `${g.player.name}의 ${pName} 집, 용의 불에 타다.`, 40); }
      else note(g, `${pName}의 집이 용의 불에 반쯤 탔다.`);
    }
  }
  S.burns = (S.burns ?? 0) + 1;
}

// 노여움이 향할 곳: 보물을 훔친 사람이 나라면 내가 있는 곳, 원정대를 보낸 나라가 있으면 그 나라의 고장, 아니면 산맥 둘레
function wrathTarget(g, rng, d) {
  if (d.thief) {
    const ps = Object.keys(WILD_LANDS).filter((p) => realmOf(p) === d.thief && PLACES[p]);
    if (ps.length) return rng.pick(ps);
  }
  return rng.pick(['gorge', 'hammer', 'graubel', 'graubel', 'verden', 'eisen'].filter((p) => PLACES[p]));
}

function wake(g, id, rng, say, record) {
  const d = dragonOf(g, id), name = nameOf(id), now = mi(g);
  d.state = 'awake'; d.until = now + rng.int(4, 10); d.wakes += 1; d.burned = false; d.sleep = 0;
  d.hungry = rng.chance(0.15); // 오래 잔 용은 배가 고프다: 노여움이 없어도 고장 하나를 덮치기도 한다
  know(g, id, 1);
  say(`${J(name, '이/가')} 깨어났다. 천룡 산맥 위로 거대한 그림자가 지나가는 것을 여러 고장 사람들이 보았다. 문을 걸어 잠그고 아이들을 지하 창고로 내려보내는 집이 늘었다.`, true);
  record?.(`${name}의 깨어남`);
  chron(g, `${J(name, '이/가')} 잠에서 깨다.`, 80);
  dlog(g, `${J(name, '이/가')} 깨어났다.`);
  // 마물이 쫓겨 내려온다
  const W = g.wilds ? wildsState(g) : null;
  for (const p of ['gorge', 'hammer', 'graubel']) if (W?.land[p]) W.land[p].level = clamp(W.land[p].level + 10, 0, 100);
  // 봉인이 크게 흔들리는 때, 노여움이 없는 용왕은 북쪽으로 날아간다 (용은 마신을 누구보다 싫어한다)
  const st = g.seal ? sealState(g).stage : 0;
  if (st >= 4 && d.wrath < 40 && g.realm?.north && rng.chance(0.45)) {
    g.realm.north.garbes = clamp(g.realm.north.garbes - 20, 0, 100);
    d.north = (d.north ?? 0) + 1;
    say(`${J(name, '이/가')} 사람의 고장을 돌아보지 않고 북쪽 바다를 건넜다. 며칠 뒤 마왕령의 해안 진지 셋이 불탔다는 소식이 왔다. 용이 누구 편인지 아는 사람은 없다. 다만 마신의 편이 아닌 것만은 분명해 보인다.`, true);
    record?.(`${name}, 마왕령 해안을 불태우다`);
    dlog(g, `${J(name, '이/가')} 북쪽 바다를 건너 마왕령 해안을 태웠다.`);
  }
  // 내 핏줄을 기억하는 용이 깨면, 나를 찾아온다
  if (d.marked && d.wrath >= 30 && g.life && !g.over && g.player?.alive !== false && !sceneQueued(g, 'dragon_fire')) {
    queueScene(g, 'dragon_fire', { dragon: id, place: here(g), why: 'mark' }, { first: true });
    d.burned = true;
    return;
  }
}

export function dragonMonth(g) {
  if (!g.dragon || g.over) return [];
  const S = DS(g), rng = dragonRng(g, 1), now = mi(g), era = g.realm?.era ?? 0;
  const st = g.seal ? sealState(g).stage : 0;
  const news = [];
  const say = (text, big = false) => news.push({ text, big });
  const record = (text) => news.push({ record: text });

  // 청동의 용왕은 십강 전설(legends)이 맡는다: 거기서 죽으면 여기서도 죽는다
  const bz = S.dragons.bronze, lb = g.legends ? legend(g, 'bronze') : null;
  if (bz.state !== 'dead' && lb && !lb.alive) { bz.state = 'dead'; bz.diedAt = now; dlog(g, '청동의 용왕이 죽었다.'); }
  if (lb && (lb.met || lb.seen || lb.role)) know(g, 'bronze', g.legends?.dragon?.step === 3 ? 2 : 1);

  for (const id of SLEEPERS) {
    const d = S.dragons[id], D = DRAGONS[id];
    if (d.state === 'dead') continue;
    // 훔쳐 간 것이 있는 동안 노여움은 잘 식지 않는다
    d.wrath = Math.max(0, d.wrath - (d.thief ? 0.15 : 0.4));
    if (d.state === 'awake') {
      if (!d.burned && (d.wrath >= 40 || (d.thief && d.wrath >= 20) || d.hungry) && rng.chance(0.4)) {
        const pl = wrathTarget(g, rng, d);
        burnPlace(g, id, pl, say, record, d.thief ? `${realmShort(d.thief)} 쪽 사람들이 그 보물에 손을 댄 값이라고들 했다.` : '');
        if (g.life && here(g) === pl && !g.over && !sceneQueued(g, 'dragon_fire')) queueScene(g, 'dragon_fire', { dragon: id, place: pl, why: 'burn' }, { first: true });
      }
      if (now >= d.until) {
        d.state = 'sleep'; d.sleep = rng.int(65, 90); d.wrath = Math.round(d.wrath * 0.4); d.thief = null; d.hungry = false;
        say(`${J(nameOf(id), '이/가')} ${J(D.lair, '으로/로')} 돌아가 다시 잠들었다는 말이 돈다. 산맥 둘레 마을들이 그제야 문을 연다.`, inMountains(g));
        dlog(g, `${J(nameOf(id), '이/가')} 다시 잠들었다.`);
      }
      continue;
    }
    // 잠: 저절로 조금씩 깊어지고, 세상의 흔들림이 얕게 만든다
    const shake = st * 0.05 + era * 0.03 + (S.cult.power >= 60 ? 0.04 : 0);
    // 한 번 뒤척이기 시작한 잠은 쉽게 다시 깊어지지 않는다
    d.sleep = clamp(d.sleep + (d.state === 'stir' ? -0.05 : 0.09) - D.deep * shake + rng.normal(0, 0.35) * D.deep, 0, 100);
    if (d.state === 'sleep' && d.sleep < 20) {
      d.state = 'stir';
      say(STIR_SIGNS[rng.int(0, STIR_SIGNS.length - 1)](nameOf(id)), inMountains(g));
      dlog(g, `${J(nameOf(id), '이/가')} 뒤척이기 시작했다.`);
      if (g.omen) addSign(g, 'dragon', rng, true, () => {});
    } else if (d.state === 'stir') {
      if (d.sleep >= 32) { d.state = 'sleep'; dlog(g, `${J(nameOf(id), '이/가')} 다시 깊이 잠들었다.`); }
      else if (rng.chance(0.15)) {
        say(STIR_SIGNS[rng.int(1, STIR_SIGNS.length - 1)](nameOf(id)), false);
        const W = g.wilds ? wildsState(g) : null;
        if (W?.land[D.near]) W.land[D.near].level = clamp(W.land[D.near].level + 4, 0, 100);
      }
    }
    if (d.sleep <= 0) wake(g, id, rng, say, record);
  }

  // 젊은 용: 깨어 있고, 반짝이는 것을 모은다
  const y = S.dragons.young;
  if (y.state !== 'dead') {
    y.hoard = clamp(y.hoard + 0.25, 0, 100);
    y.wrath = Math.max(0, y.wrath - 0.5);
    if (rng.chance(0.02 + y.wrath / 2000)) {
      const pl = rng.pick(['hammer', 'gorge', 'graubel']);
      say(rng.pick([
        `그을음이라 불리는 젊은 용이 ${placeName(pl)} 근처 목장의 소를 여섯 마리 채 갔다고 한다. 목동은 하늘에서 쇳소리 같은 울음을 들었다.`,
        `${placeName(pl)}로 가던 상단의 짐수레 하나가 통째로 하늘로 들려 갔다. 은그릇을 실은 수레였다. 그을음의 짓이라고들 한다.`,
        `젊은 용 그을음이 ${placeName(pl)} 대장간 지붕을 뜯고 갓 벼린 칼 몇 자루를 물고 갔다. 드워프들이 분을 삭이지 못한다.`,
      ]), near(g, pl));
      dlog(g, `그을음이 ${placeName(pl)} 근처를 노략질했다.`);
    }
    // 드워프 사냥꾼들이 이따금 덤빈다. 대개는 돌아오지 못한다.
    if (rng.chance(0.0025)) {
      if (rng.chance(0.25)) {
        y.state = 'dead'; y.diedAt = now; y.slayer = '드워프 사냥꾼들';
        say('쇠망치 골의 드워프 사냥꾼들이 젊은 용 그을음을 잡았다. 열둘이 올라가 다섯이 돌아왔다. 다섯은 아무것도 자랑하지 않았다.', true);
        record('젊은 용 그을음, 드워프 사냥꾼들에게 죽다');
        dlog(g, '젊은 용 그을음이 드워프 사냥꾼들에게 죽었다.');
        for (const id of SLEEPERS) if (S.dragons[id].state !== 'dead') S.dragons[id].wrath = clamp(S.dragons[id].wrath + 10, 0, 100);
      } else {
        y.wrath = clamp(y.wrath + 30, 0, 100);
        say('드워프 사냥꾼 열 명이 젊은 용의 둥지로 올라갔다가 돌아오지 않았다. 쇠망치 골에 조종이 울렸다.', near(g, 'hammer'));
        dlog(g, '드워프 사냥꾼들이 젊은 용에게 덤볐다가 돌아오지 못했다.');
      }
    }
  }

  // 보물을 노리는 원정대: 용골 계곡과 굴마다. 돌아오지 못하는 쪽이 훨씬 많다.
  if (rng.chance(0.022 + (S.seekers.stole ? 0 : 0.004) + era * 0.004)) {
    const from = rng.pick(['valhart', 'free', 'free', 'leonia', 'march', 'dwarf']);
    const pool = [...SLEEPERS.filter((id) => S.dragons[id].state === 'sleep' || S.dragons[id].state === 'stir'), 'bones', 'bones'];
    const tgt = rng.pick(pool);
    S.seekers.sent += 1;
    if (tgt === 'bones') {
      S.bones = Math.max(5, S.bones - rng.int(2, 5));
      if (rng.chance(0.4)) { S.seekers.lost += 1; say(`${realmShort(from)}에서 온 도굴꾼 무리가 용골 계곡에서 돌아오지 않았다. 얼음 고개 아래에서 밧줄 끊긴 짐바리만 찾았다.`, false); }
      else { S.seekers.back += 1; say(`용골 계곡에서 돌아온 도굴꾼들이 ${realmShort(from)} 장터에 용왕의 뼈 조각을 풀었다. 대장장이들이 값을 부르느라 목소리가 높다.`, false); }
    } else {
      const d = S.dragons[tgt], name = nameOf(tgt);
      const roll = rng.float(0, 1);
      if (roll < 0.62) {
        S.seekers.lost += 1; d.sleep = clamp(d.sleep - 4, 0, 100);
        say(`${realmShort(from)}에서 ${name}의 보물을 노리고 떠난 원정대가 돌아오지 않았다. 마지막으로 본 사람은 구렁목의 주막 주인이다.`, false);
      } else if (roll < 0.9) {
        S.seekers.back += 1; d.sleep = clamp(d.sleep - 7, 0, 100);
        say(`${name}의 굴까지 갔다가 빈손으로 돌아온 원정대가 있다. 무엇을 보았는지 물어도 술만 마신다고 한다.`, false);
      } else {
        S.seekers.stole += 1; d.sleep = clamp(d.sleep - 32, 0, 100); d.wrath = clamp(d.wrath + 40, 0, 100); d.hoard = clamp(d.hoard - 4, 0, 100); d.thief = from;
        say(`${realmShort(from)}의 원정대가 ${name}의 굴에서 금붙이를 한 수레 지고 내려왔다고 한다. 장터는 들뜨고, 늙은이들은 아르젠 이야기를 꺼낸다.`, true);
        dlog(g, `${realmShort(from)}의 원정대가 ${name}의 보물에 손을 댔다.`);
        know(g, tgt, 1);
      }
    }
  }

  // 내가 돈을 보탠 원정대가 돌아올 때
  if (S.stake && now >= S.stake.due) {
    const sk = S.stake; S.stake = null;
    const d = S.dragons[sk.target], name = nameOf(sk.target), roll = rng.float(0, 1);
    if (!d || d.state === 'dead' || d.state === 'awake' || roll < 0.6) {
      S.seekers.lost += 1;
      note(g, `내가 은화 ${sk.amount}닢을 보탠 원정대가 돌아오지 않았다. ${name}의 굴로 간다고 했던 사람들이다.`);
    } else if (roll < 0.88) {
      S.seekers.back += 1; d.sleep = clamp(d.sleep - 6, 0, 100);
      note(g, `내가 돈을 보탠 원정대가 빈손으로 돌아왔다. 보탠 은화 ${sk.amount}닢은 고개 너머에 묻힌 셈이다.`);
    } else {
      S.seekers.stole += 1; d.sleep = clamp(d.sleep - 25, 0, 100); d.wrath = clamp(d.wrath + 40, 0, 100); d.hoard = clamp(d.hoard - 4, 0, 100); d.thief = sk.realm;
      const got = sk.amount * 6;
      g.player.money += got;
      note(g, `내가 돈을 보탠 원정대가 ${name}의 굴에서 금붙이를 지고 돌아왔다. 내 몫은 은화 ${got}닢. 그 금을 만질 때마다 아르젠 이야기가 떠오른다.`);
      say(`${name}의 보물을 훔쳐 온 원정대 이야기가 장터마다 돈다.`, true);
      dlog(g, `내가 돈을 보탠 원정대가 ${name}의 보물에 손을 댔다.`);
    }
  }

  // 용 숭배자들: 용이 뒤척이고 깨어날수록, 봉인이 흔들릴수록 세가 커진다
  const live = SLEEPERS.filter((id) => ['stir', 'awake'].includes(S.dragons[id].state)).length;
  const target = 16 + live * 14 + st * 3;
  S.cult.power = clamp(S.cult.power + (target - S.cult.power) * 0.05 + rng.normal(0, 0.6), 0, 100);
  if (g.date.month === 4 && S.cult.power >= 30 && S.cult.offerAt !== g.date.year) {
    S.cult.offerAt = g.date.year;
    if (S.cult.power >= 45 || rng.chance(0.3)) say(S.cult.power >= 55 ? '천룡 산맥 기슭의 용 숭배자 마을에서 올해는 제물을 둘 바쳤다고 한다. 산 아래 마을들까지 아이를 숨긴다.' : '용 숭배자 마을에서 올해도 봄 제물을 바쳤다는 소문이 산을 내려왔다.', false);
  }
  // 뼈는 아주 천천히 돌아온다 (눈사태가 새 뼈를 드러낸다)
  if (rng.chance(0.02)) S.bones = clamp(S.bones + 3, 0, 100);
  return news;
}

// 세상의 달 흐름에 붙인다
WORLD_TICKS.push((g, worldRng, say, record) => {
  for (const n of dragonMonth(g) ?? []) {
    if (n.record) { record?.(n.record); continue; }
    say(n.text, n.big);
  }
});
