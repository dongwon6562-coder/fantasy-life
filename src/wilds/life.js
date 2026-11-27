// 마물의 땅에서 사는 일: 마물 사냥(현상금 받기), 둥지 치기, 부산물 팔기, 버려진 마을 되찾기.
// 떼가 몰려오는 달, 버려진 마을에서 온 사람들, 다시 들어가는 사람들에게 돈 보태기, 부산물을 찾는 연금술사.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainSkill } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress, spend, canSpend } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { playerPower } from '../adventure/combat.js';
import { isMarket } from '../trade/core.js';
import { deed } from '../repute/index.js';
import { WS, KINDS, HAMLETS, clamp, mi, placeName, levelAt, kindsAt, partPrice, hamletsNear, wlog } from './state.js';
import { wildRng } from './world.js';

const here = (g) => L(g).place;
export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const nestHere = (g) => WS(g).land[here(g)]?.nest ?? null;
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const guildMerit = (g, n) => { const f = L(g).fac?.guild; if (f?.member) f.merit = (f.merit ?? 0) + n; };
const addParts = (g, kind, n) => { const P = WS(g).parts; P[kind] = (P[kind] ?? 0) + n; };
export const partsCount = (g) => Object.values(WS(g).parts).reduce((a, b) => a + (b > 0 ? b : 0), 0);
export const partsValue = (g, pl) => Object.entries(WS(g).parts).reduce((a, [k, n]) => a + (n > 0 ? n * partPrice(g, k, pl) : 0), 0);
const hitHard = (g, kind, lv) => KINDS[kind].pow + lv / 5;

/* ---------- 마물 사냥 ---------- */
const HUNT_WIN = {
  goblin: '덤불 속 고블린 소굴을 덮쳤다. 녹슨 칼을 휘두르며 달려드는 놈들을 하나씩 베었다.',
  harpy: '절벽 위에서 날아드는 하피를 바위 그늘에 숨어 기다렸다가 내리쳤다.',
  ghoul: '폐허의 무덤 사이에서 구울이 기어 나왔다. 썩은 냄새를 참고 목을 쳤다.',
  direwolf: '마랑 한 마리가 무리에서 떨어지기를 반나절 기다렸다. 덤벼드는 아가리에 창을 박았다.',
  orc: '오크 척후 둘과 마주쳤다. 하나는 쓰러뜨리고, 하나는 엄니를 남기고 달아났다.',
  troll: '개울가의 트롤이 돌을 던졌다. 불붙인 횃불로 몰아붙여 끝내 쓰러뜨렸다. 트롤은 불에 약하다.',
  wyvern: '와이번이 양 떼를 덮치는 순간을 노렸다. 날개 막을 찢자 땅으로 떨어졌다.',
  basilisk: '거울 조각을 방패에 대고, 눈을 감은 채 소리만 듣고 다가갔다. 바실리스크의 목이 떨어졌다.',
  iron_eater: '갱도에 기름을 붓고 불을 놓았다. 껍질이 터지는 소리가 한참 났다.',
  mana_hound: '푸르게 빛나는 이빨이 어둠 속에서 다가왔다. 빛을 따라 화살을 쏘았다.',
  chimera: '사자 머리가 울부짖고 뱀 꼬리가 휘감아 왔다. 몇 번을 죽을 뻔했는지 모른다. 그래도 내가 서 있었다.',
};
ACTIONS.push({
  id: 'wilds_hunt', name: '마물 사냥', icon: 'sword',
  desc: '고장 둘레의 마물을 사냥한다. 부산물을 얻고, 걸린 현상금이 있으면 받는다. 사냥할수록 그 고장의 마물이 줄어든다.',
  available: (g) => free(g) && levelAt(g, here(g)) >= 20 && kindsAt(g, here(g)).length > 0,
  run(g, rng) {
    const S = WS(g), pl = here(g), lv = levelAt(g, pl), ks = kindsAt(g, pl);
    // 약한 것이 흔하다. 센 것은 드물게 나온다.
    const kind = ks[Math.min(ks.length - 1, Math.floor(Math.abs(rng.normal(0, ks.length / 3))))];
    const K = KINDS[kind];
    S.rec.hunts += 1;
    tired(g, 12);
    // 한눈에 상대가 안 되는 놈이면 대개는 물러난다
    if (playerPower(g) < hitHard(g, kind, lv) - 20 && rng.chance(0.5)) {
      stress(g, 3);
      // 48단계: 물러선 날도 그냥 돌아오지 않는다. 버릇을 하나씩 익힌다
      const sk = gainSkill(g, 'sword', 0.15, 'sen');
      return `${rng.pick([`${K.name}의 흔적을 찾았다. 발자국 크기를 재 보고는 조용히 돌아섰다. 아직 내가 상대할 놈이 아니다.`, `멀리서 ${J(K.name, '이/가')} 먹이를 뜯는 걸 지켜보았다. 어디로 드나드는지만 적어 두고 물러섰다.`, `${K.name}의 울음이 가까워지자 바람 아래쪽으로 몸을 낮췄다. 오늘은 보기만 한다.`])}${sk > 0.04 ? ` (검술 +${sk.toFixed(1)})` : ''}`;
    }
    if (!check(rng, playerPower(g), hitHard(g, kind, lv))) {
      injure(g, `${K.name}에게 입은 상처`, K.pow >= 50 ? 4 : 2);
      stress(g, 8);
      S.rec.lost += 1;
      const lt = (S.rec.lostTo ??= {}); lt[kind] = (lt[kind] ?? 0) + 1;
      gainSkill(g, 'sword', 0.2, 'agi'); // 지고 온 날에도 몸이 무언가 배운다
      const hurt = K.pow >= 50 ? rng.pick(['갑옷 사이로 피가 배어 나왔다. 겨우 마을까지 기어 왔다.', '방패가 두 동강 났다. 부러진 손잡이를 쥔 채 덤불 속을 기었다.']) : rng.pick(['팔을 물리고 달아났다. 상처가 욱신거린다.', '발목을 접질려 절뚝이며 돌아왔다. 등 뒤에서 울음소리가 오래 따라왔다.', '칼을 휘둘렀지만 허공만 갈랐다. 어깨를 긁히고 물러섰다.']);
      const hint = lt[kind] === 3 ? ` 같은 놈에게 세 번째 졌다. 혼자서는 무리다. 동료를 모으거나 칼을 더 갈고 와야겠다.` : '';
      return `${J(K.name, '을/를')} 쫓다가 오히려 쫓겼다. ${hurt}${hint}`;
    }
    const n = rng.int(1, K.pow >= 50 ? 2 : 3);
    addParts(g, kind, n);
    S.rec.kills += 1;
    S.land[pl].level = clamp(S.land[pl].level - 3, 0, 100);
    S.land[pl].hunted = (S.land[pl].hunted ?? 0) + 1;
    if (g.realm) g.realm.monsters = clamp(g.realm.monsters - 0.15, 0, 100); // 사냥이 세상을 조금 바꾼다
    gainSkill(g, 'sword', 0.6, 'agi');
    guildMerit(g, Math.round(K.pow / 10));
    if (K.pow >= 50) renown(g, 1);
    let tail = '';
    const b = S.bounties.find((x) => x.place === pl && !x.nest && x.kind === kind);
    if (b) {
      S.bounties = S.bounties.filter((x) => x !== b);
      g.player.money += b.reward;
      S.rec.bounties += 1;
      renown(g, 1);
      tail = ` 사냥꾼 길드에 가서 현상금 은화 ${b.reward}닢을 받았다.`;
      wlog(g, `${placeName(pl)}: ${K.name} 현상금 은화 ${b.reward}닢.`);
    }
    return `${HUNT_WIN[kind] ?? `${J(K.name, '을/를')} 잡았다.`} ${K.part} ${n}개를 챙겼다.${tail}`;
  },
});

/* ---------- 둥지 치기 ---------- */
ACTIONS.push({
  id: 'wilds_nest', name: '둥지 치기', icon: 'sword',
  desc: '고장 근처에 생긴 마물 둥지를 친다. 크게 자란 둥지는 혼자서는 어렵다. 성공하면 고장이 한동안 조용해진다.',
  available: (g) => free(g) && !!nestHere(g) && !sceneQueued(g, 'wilds_nest'),
  run(g) {
    queueScene(g, 'wilds_nest', { place: here(g) }, { first: true });
    const n = nestHere(g);
    return `${KINDS[n.kind].name} 둥지가 있다는 골짜기 어귀까지 가 보았다. 발자국이 많다.`;
  },
});
const nestDiff = (n) => KINDS[n.kind].pow + n.size * 3;
defineScene('wilds_nest', {
  title: (g, s) => `${KINDS[WS(g).land[s.place]?.nest?.kind]?.name ?? '마물'} 둥지`,
  text: (g, s) => {
    const n = WS(g).land[s.place].nest;
    return `${placeName(s.place)} 근처, ${KINDS[n.kind].name} 둥지. ${n.size >= 7 ? '둥지가 산등성이 하나를 다 덮었다. 혼자 들어가면 살아 나오기 어렵다.' : n.size >= 4 ? '둥지가 꽤 자랐다. 밤마다 울음소리가 마을까지 들린다.' : '아직 작은 둥지다. 지금 치면 쉽다.'}`;
  },
  choices: (g, s) => {
    const n = WS(g).land[s.place]?.nest;
    if (!n || here(g) !== s.place || !free(g)) return [];
    return [
      { label: '정면으로 친다', key: 'charge' },
      ...(canSpend(g, 10) ? [{ label: '기름을 붓고 불을 놓는다 (은화 10닢)', key: 'fire' }] : []),
      ...(canSpend(g, 30) ? [{ label: '사냥꾼들을 사서 함께 친다 (은화 30닢)', key: 'hire' }] : []),
      { label: '물러난다', key: 'back' },
    ];
  },
  resolve(g, rng, s, key) {
    const S = WS(g), land = S.land[s.place], n = land?.nest;
    if (key === 'back') return '해가 지기 전에 돌아섰다. 둥지는 내일도 거기 있을 것이다.';
    if (!n || here(g) !== s.place) return '둥지는 이미 비어 있었다. 누군가 먼저 친 모양이다.';
    let bonus = 0, cost = 0;
    if (key === 'fire') { cost = 10; bonus = 10; }
    if (key === 'hire') { cost = 30; bonus = 22; }
    if (cost && !spend(g, cost)) return `은화 ${cost}닢이 모자랐다. 오늘은 물러났다.`;
    const K = KINDS[n.kind];
    tired(g, 25);
    if (!check(rng, playerPower(g) + bonus, nestDiff(n))) {
      injure(g, `${K.name} 둥지에서 입은 상처`, 4);
      stress(g, 14);
      S.rec.lost += 1;
      n.size = Math.max(1, n.size - 1);
      return `${key === 'hire' ? '함께 간 사냥꾼 하나가 돌아오지 못했다. ' : ''}둥지 깊이 들어갔다가 사방에서 ${J(K.name, '이/가')} 쏟아졌다. 피투성이로 빠져나왔다. 둥지는 조금 줄었을 뿐이다.`;
    }
    land.nest = null;
    land.level = clamp(land.level - 25, 0, 100);
    if (g.realm) g.realm.monsters = clamp(g.realm.monsters - 1, 0, 100);
    S.rec.nests += 1;
    addParts(g, n.kind, 2 + Math.floor(n.size / 3));
    renown(g, 3 + Math.floor(n.size / 3));
    guildMerit(g, 10 + n.size * 2);
    gainSkill(g, 'sword', 1.2, 'agi');
    let tail = '';
    const b = S.bounties.find((x) => x.place === s.place && x.nest);
    if (b) { S.bounties = S.bounties.filter((x) => x !== b); g.player.money += b.reward; S.rec.bounties += 1; tail = ` 사냥꾼 길드가 둥지 현상금 은화 ${b.reward}닢을 내주었다.`; }
    deed(g, 'brave', 5, `${J(g.player.name, '이/가')} ${placeName(s.place)} 근처의 ${K.name} 둥지를 쳤다더라`, s.place);
    chron(g, `${g.player.name}, ${placeName(s.place)} 근처의 ${K.name} 둥지를 치다.`, n.size >= 6 ? 60 : 30);
    wlog(g, `${placeName(s.place)}: ${K.name} 둥지를 쳤다.`);
    note(g, `${placeName(s.place)} 근처의 ${K.name} 둥지를 쳤다.`);
    return `${key === 'fire' ? '바람을 등지고 기름 단지를 굴려 넣었다. 불길이 둥지를 삼켰다. 뛰쳐나오는 놈들을 하나씩 베었다.' : key === 'hire' ? '사냥꾼들과 세 방향에서 몰아붙였다. 해가 질 무렵 둥지는 조용해졌다.' : '혼자 둥지 한가운데로 들어갔다. 얼마나 휘둘렀는지 모른다. 정신을 차려 보니 서 있는 것은 나뿐이었다.'} ${J(K.part, '을/를')} 챙겼다.${tail}`;
  },
});

/* ---------- 부산물 팔기 ---------- */
ACTIONS.push({
  id: 'wilds_sell', name: '부산물 팔기', icon: 'coin',
  desc: '모아 둔 마물 부산물을 판다. 고장마다 값이 다르고, 마물이 들끓는 해에는 흔해서 싸다. 세레니아의 연금술사들이 가장 비싸게 산다.',
  available: (g) => free(g) && isMarket(here(g)) && partsCount(g) > 0,
  run(g) {
    const S = WS(g), pl = here(g);
    const sold = Object.entries(S.parts).filter(([, n]) => n > 0).map(([k, n]) => ({ k, n, v: n * partPrice(g, k, pl) }));
    const total = sold.reduce((a, x) => a + x.v, 0);
    g.player.money += total;
    S.rec.sold += total;
    S.parts = {};
    tired(g, 3);
    gainSkill(g, 'trade', 0.3, 'cha');
    return `${placeName(pl)} 장터에서 ${sold.map((x) => `${KINDS[x.k].part} ${x.n}개`).join(', ')}를 팔았다. 은화 ${total}닢.${pl === 'serenia' ? ' 연금술사가 돋보기로 하나하나 들여다보고 값을 매겼다.' : ''}`;
  },
});

/* ---------- 버려진 마을 되찾기 ---------- */
const abandonedNear = (g) => hamletsNear(here(g)).filter((id) => WS(g).hamlets[id].state === 'abandoned');
ACTIONS.push({
  id: 'wilds_reclaim', name: '버려진 마을 되찾기', icon: 'home',
  desc: '마물에게 내준 근처의 작은 마을에 들어가 남은 마물을 몰아내고, 떠난 사람들이 돌아올 길을 연다.',
  available: (g) => free(g) && abandonedNear(g).length > 0 && levelAt(g, here(g)) < 65,
  run(g, rng) {
    const S = WS(g), id = abandonedNear(g)[0], H = HAMLETS[id], h = S.hamlets[id], lv = levelAt(g, here(g));
    tired(g, 18);
    if (!check(rng, playerPower(g), 28 + lv / 3)) {
      injure(g, `${H.name}에서 입은 상처`, 2);
      stress(g, 8);
      return `${H.name}의 무너진 담장 너머에서 무언가가 우리를 지켜보고 있었다. 우물가에서 덤벼든 것을 겨우 떨쳐내고 물러났다.`;
    }
    h.state = 'returning'; h.pop = 15; h.since = mi(g);
    S.land[here(g)].level = clamp(lv - 6, 0, 100);
    S.rec.reclaimed += 1;
    renown(g, 2);
    deed(g, 'kind', 4, `${J(g.player.name, '이/가')} 버려진 ${J(H.name, '을/를')} 되찾아 사람들이 돌아갈 길을 열었다더라`, here(g));
    chron(g, `${g.player.name}, 버려진 ${J(H.name, '을/를')} 되찾다.`, 40);
    wlog(g, `${J(H.name, '을/를')} 되찾았다.`);
    return `${H.name}의 집집마다 문을 열고 들어가 남은 것들을 몰아냈다. 우물을 덮었던 판자를 걷어 냈다. 며칠 뒤 수레 세 대가 마을 어귀에 들어섰다. 떠났던 사람들이다.`;
  },
});

/* ---------- 사건 ---------- */
// 떼가 몰려온다: 이번 달이나 지난달에 이 고장으로 떼가 옮겨 왔다
const herdHere = (g) => WS(g).herds.find((h) => h.to === here(g) && mi(g) - h.at <= 1 && !h.met);
EVENTS.push({
  id: 'wilds_herd', cooldown: 12, weight: 8,
  chance: () => 0.8,
  cond: (g) => free(g) && !!herdHere(g),
  prepare: (g) => { const h = herdHere(g); h.met = true; return { kind: h.kind, from: h.from }; },
  title: '몰려오는 떼',
  text: (g, c) => `${placeName(c.from)} 쪽에서 ${J(KINDS[c.kind].herd, '이/가')} 넘어왔다. 밤마다 가축이 사라지고, 마을 어귀에 발자국이 찍힌다. 사람들이 문에 빗장을 지른다.`,
  choices: [
    {
      label: '마을 사람들과 막아선다',
      run: (g, rng, c) => {
        const K = KINDS[c.kind], S = WS(g);
        if (check(rng, playerPower(g) + 8, K.pow + 6)) {
          S.land[here(g)].level = clamp(S.land[here(g)].level - 10, 0, 100);
          addParts(g, c.kind, 2);
          renown(g, 2);
          deed(g, 'brave', 4, `${J(g.player.name, '이/가')} 마을 어귀에서 ${J(K.herd, '을/를')} 막아섰다더라`);
          return `횃불과 쇠스랑을 든 사람들 맨 앞에 섰다. 새벽까지 버텼다. 날이 밝자 떼는 숲으로 물러갔다. 몇 마리는 돌아가지 못했다.`;
        }
        injure(g, `${K.name}에게 물린 상처`, 3);
        stress(g, 10);
        return '맨 앞에 섰다가 맨 먼저 쓰러졌다. 이웃들이 끌고 들어왔다. 떼는 외양간 두 곳을 털고 물러갔다.';
      },
    },
    { label: '문을 걸어 잠그고 버틴다', run: (g, rng) => { stress(g, 8); const lose = Math.min(g.player.money, rng.int(2, 6)); g.player.money -= lose; return `사흘 밤을 문 뒤에서 버텼다. 긁는 소리가 끊이지 않았다.${lose ? ` 밖에 둔 것들을 잃었다. (은화 ${lose}닢어치)` : ''}`; } },
  ],
});

// 버려진 마을에서 온 사람들
const fledNear = (g) => hamletsNear(here(g)).find((id) => WS(g).hamlets[id].state === 'abandoned' && mi(g) - WS(g).hamlets[id].since <= 3);
EVENTS.push({
  id: 'wilds_refugees', cooldown: 24, weight: 5,
  chance: () => 0.6,
  cond: (g) => free(g) && !!fledNear(g),
  prepare: (g) => ({ id: fledNear(g) }),
  title: '빈 마을에서 온 사람들',
  text: (g, c) => `${HAMLETS[c.id].name}에서 떠나온 사람들이 마을 어귀에 수레를 세웠다. 아이들이 맨발이다. 노인 하나가 모자를 벗고 하룻밤 묵을 곳을 묻는다.`,
  choices: [
    { label: '곡식과 은화를 나눈다', run: (g) => { const n = Math.min(g.player.money, 6); g.player.money -= n; deed(g, 'generous', 4, `${J(g.player.name, '이/가')} 빈 마을에서 온 사람들에게 곡식을 나눠 주었다더라`); stress(g, -3); return `${n ? `은화 ${n}닢과 ` : ''}곡식 자루를 내주었다. 노인이 내 손을 오래 잡았다. "마물이 물러가면 돌아갈 겁니다. 꼭."`; } },
    { label: '헛간에 재워 준다', run: (g) => { deed(g, 'kind', 2, `${J(g.player.name, '이/가')} 빈 마을 사람들을 헛간에 재워 주었다더라`); tired(g, 4); return '헛간에 짚을 깔아 주었다. 밤새 아이 하나가 울었다. 아침에 그들은 짚을 가지런히 모아 두고 떠났다.'; } },
    { label: '못 본 척한다', run: (g) => { stress(g, 3); return '문을 닫았다. 우리 마을도 넉넉하지 않다. 수레바퀴 소리가 멀어질 때까지 창가에 서 있었다.'; } },
  ],
});

// 다시 들어가는 사람들이 돈을 모은다: 보태면 마을이 다시 서고 해마다 몫이 돌아온다
const returningNear = (g) => hamletsNear(here(g)).find((id) => WS(g).hamlets[id].state === 'returning' && !WS(g).hamlets[id].stake && !WS(g).hamlets[id].asked);
EVENTS.push({
  id: 'wilds_settle', cooldown: 36, weight: 4,
  chance: () => 0.5,
  cond: (g) => free(g) && !!returningNear(g),
  prepare: (g) => { const id = returningNear(g); WS(g).hamlets[id].asked = true; return { id }; },
  title: '다시 세우는 마을',
  text: (g, c) => `${HAMLETS[c.id].name}에 돌아간 사람들이 지붕 얹을 돈을 모은다고 한다. 우두머리가 찾아왔다. "은화 스무 닢만 보태 주시면, 마을이 서는 대로 해마다 갚겠습니다."`,
  choices: [
    { label: '은화 20닢을 보탠다', run: (g, rng, c) => { if (!spend(g, 20)) return '주머니가 비어 있었다. 우두머리는 괜찮다며 웃었다.'; const h = WS(g).hamlets[c.id]; h.stake = true; h.pop = Math.min(100, h.pop + 8); wlog(g, `${HAMLETS[c.id].name}에 은화 20닢을 보탰다.`); return `은화를 건넸다. 우두머리가 장부 첫 줄에 내 이름을 적었다. ${HAMLETS[c.id].name}에 지붕 세 채가 더 올라갈 것이다.`; } },
    { label: '연장만 빌려준다', run: (g, rng, c) => { const h = WS(g).hamlets[c.id]; h.pop = Math.min(100, h.pop + 3); return '돈 대신 도끼와 톱을 빌려주었다. 가을에 돌아온 연장은 날이 더 잘 서 있었다.'; } },
    { label: '거절한다', run: () => '"마물이 또 오면 그 돈은 어디로 갑니까." 우두머리는 대꾸하지 않고 모자를 썼다.' },
  ],
});

// 부산물을 찾는 연금술사
const heldKinds = (g) => Object.entries(WS(g).parts).filter(([, n]) => n > 0).map(([k]) => k);
EVENTS.push({
  id: 'wilds_buyer', cooldown: 48, weight: 3,
  chance: () => 0.4,
  cond: (g) => free(g) && heldKinds(g).length > 0,
  prepare: (g, rng) => { const k = rng.pick(heldKinds(g)); return { kind: k, price: Math.round(partPrice(g, k, 'serenia') * 1.4) }; },
  title: '연금술사의 부탁',
  text: (g, c) => `떠돌이 연금술사가 내 짐을 기웃거렸다. "${KINDS[c.kind].part}, 그거 내게 파시오. 하나에 은화 ${c.price}닢. 세레니아까지 가지 않아도 되잖소."`,
  choices: [
    { label: '다 판다', run: (g, rng, c) => { const P = WS(g).parts, n = P[c.kind] ?? 0; if (!n) return '짐을 풀어 보니 이미 없었다.'; P[c.kind] = 0; g.player.money += n * c.price; WS(g).rec.sold += n * c.price; return `${KINDS[c.kind].part} ${n}개를 넘겼다. 은화 ${n * c.price}닢. 연금술사는 휘파람을 불며 떠났다. 너무 싸게 판 것 같은 기분이 들었다.`; } },
    { label: '팔지 않는다', run: () => '"값은 더 오를 거요." 연금술사는 어깨를 으쓱했다. 그 말이 오래 귀에 남았다.' },
  ],
});

/* ---------- 해마다: 다시 선 마을이 돌려주는 몫 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.wilds || g.date.month !== 1) return;
  const S = WS(g);
  let sum = 0;
  for (const [id, h] of Object.entries(S.hamlets)) if (h.stake && h.state === 'lived') sum += 5;
  if (sum) { g.player.money += sum; g.news.unshift({ text: `다시 선 마을에서 올해 몫으로 은화 ${sum}닢을 보내왔다.`, rel: 60 }); }
});

