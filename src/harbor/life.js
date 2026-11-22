// 포구의 삶: 고깃배 타기, 생선 손질과 팔기, 배 마련, 폭풍, 포구의 일들.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, gainSkill, playerAge } from '../game.js';
import { makePerson, kill } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check } from '../adventure/core.js';
import { queueFight } from '../adventure/fight.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import {
  H, boat, boatHere, atHarbor, isHarbor, here, free, stat, sail, clamp, mi, sky, placeName, logHarbor, groundOf,
  HARBORS, FISH, FISH_IDS, fishNow, BOATS, BOAT_NAMES, NET_COST, freshCount, curedCount, curedValue, freshValue,
} from './core.js';

const age = (g) => playerAge(g);
const crewOf = (g) => (boat(g)?.crew ?? []).map((id) => g.people.find((p) => p.id === id)).filter((p) => p && p.alive);
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const WEATHER_MUL = { clear: 1.1, cloudy: 1, rain: 0.8, fog: 0.7, wind: 0.6, storm: 0.3, snow: 0.7, blizzard: 0.2 };
const fishList = (ids) => ids.map((f, i) => (i < ids.length - 1 ? `${J(FISH[f].name, '과/와')} ` : FISH[f].name)).join('');

/* ---------- 고깃배를 탄다 ---------- */
export const canFish = (g) => free(g) && atHarbor(g) && age(g) >= 10;
ACTIONS.push({
  id: 'harbor_fish', name: '고깃배를 탄다', icon: 'coin',
  desc: '포구에서 고기잡이 배를 탄다. 내 배가 없으면 남의 배에 몫꾼으로 탄다. 철마다 드는 고기가 다르고, 날씨가 궂으면 바다가 사람을 데려간다.',
  available: canFish,
  run(g, rng) {
    const s = H(g), pl = here(g), sk = sky(g), own = boatHere(g);
    const b = own ? boat(g) : null, B = b ? BOATS[b.kind] : null;
    const ids = fishNow(g.date.month).filter((f) => !FISH[f].shore);
    const feud = groundOf(g, pl).feud >= 50 ? 0.7 : 1;
    const nets = b ? clamp(b.nets / B.nets, 0.3, 1) : 1;
    const base = (B ? B.haul : 1) * (1 + sail(g) / 60) * nets * (ids.length ? 1 : 0.5) * (WEATHER_MUL[sk.weather] ?? 1) * feud * (0.6 + rng.next() * 0.8);
    const baskets = Math.max(0, Math.round(3 * base));
    const kid = age(g) < 15;
    const k = gainSkill(g, 'sailing', kid ? 0.7 : 1.0, 'agi');
    tired(g, kid ? 10 : 15);
    s.hauls += 1;
    const what = ids.length ? fishList(ids) : '잡고기';
    const fishLine = ids.length ? FISH[ids[0]].line : '철 아닌 바다라 그물에 든 것이 잡고기뿐이다.';
    let out;
    if (own) {
      // 잡은 것은 날생선으로 쌓인다 (손질하거나 이 달 안에 팔아야 한다)
      const share = ids.length ? ids : ['herring'];
      for (let i = 0; i < baskets; i++) { const f = share[i % share.length]; s.fresh[f] = (s.fresh[f] ?? 0) + 1; }
      const wage = crewOf(g).length * 2;
      const paid = pay(g, wage);
      out = `${b.name}호를 몰고 ${HARBORS[pl].ground}에 나갔다. ${fishLine} ${what} ${baskets}광주리를 올렸다.${paid ? ` 선원 몫으로 은화 ${paid}닢을 나눠 주었다.` : ''}`;
    } else {
      const coins = Math.max(kid ? 0 : 1, Math.round(baskets * (ids.length ? FISH[ids[0]].price : 1.5) * (kid ? 0.15 : 0.25)));
      g.player.money += coins;
      s.earned += coins;
      out = kid
        ? `어부들 배에 올라 그물 끌기를 거들었다. ${fishLine} 손바닥이 밧줄에 쓸려 벌겋다. 선주가 ${coins ? `은화 ${coins}닢과 ` : ''}생선 두 마리를 쥐여 주었다.`
        : `남의 배에 몫꾼으로 탔다. ${fishLine} ${what} ${baskets}광주리. 내 몫은 은화 ${coins}닢이었다.`;
    }
    // 첫 출어: 포구의 고사
    if (!s.firstAt) { s.firstAt = mi(g); if (!sceneQueued(g, 'harbor_event')) queueScene(g, 'harbor_event', { ev: 'first' }); }
    // 날씨가 궂으면 폭풍
    const risk = { storm: 0.35, blizzard: 0.4, wind: 0.1, rain: 0.06 }[sk.weather] ?? 0.01;
    if (rng.chance(risk + (b?.kind === 'skiff' ? 0.05 : 0)) && !sceneQueued(g, 'harbor_storm')) queueScene(g, 'harbor_storm', { own: !!own, baskets });
    else if (mi(g) - s.eventAt >= 4 && rng.chance(0.3)) queueHarborEvent(g, rng);
    return `${out}${k > 0.04 ? ` (뱃일 +${k.toFixed(1)})` : ''}`;
  },
});

/* ---------- 생선을 손질하고 판다 (포구) ---------- */
ACTIONS.push({
  id: 'harbor_cure', name: '생선을 손질해 판다', icon: 'coin',
  desc: '잡은 생선을 날로 팔거나, 말리고 소금에 절여 오래 두고 판다.',
  available: (g) => free(g) && atHarbor(g) && (freshCount(g) > 0 || curedCount(g) > 0),
  run(g) {
    if (!sceneQueued(g, 'harbor_cure')) queueScene(g, 'harbor_cure', {}, { first: true });
    return '부두 덕장에 생선 광주리를 부려 놓았다.';
  },
});
defineScene('harbor_cure', {
  need: (g) => atHarbor(g) && (freshCount(g) > 0 || curedCount(g) > 0),
  title: () => '덕장과 소금 광',
  text: (g) => {
    const s = H(g), sk = sky(g), pl = here(g);
    const fr = FISH_IDS.filter((f) => s.fresh[f]).map((f) => `${FISH[f].name} ${s.fresh[f]}광주리`).join(', ');
    const cu = curedCount(g) ? ` 광에는 말리고 절인 생선이 ${curedCount(g)}광주리 있다.` : '';
    const wet = ['rain', 'storm', 'fog', 'snow', 'blizzard'].includes(sk.weather) ? ' 날이 궂어 덕장에 걸면 썩기 쉽다.' : ' 바람이 좋아 덕장에 걸기 알맞다.';
    return `${fr ? `오늘 올린 것은 ${fr}. 날생선은 이 달을 넘기지 못한다.` : '날생선은 없다.'}${cu}${fr ? wet : ''} 소금은 이 포구에서 한 광주리에 은화 ${HARBORS[pl].salt}닢이다.`;
  },
  choices: (g) => {
    const out = [];
    if (freshCount(g)) {
      out.push({ label: `날로 부두에 낸다 (은화 ${freshValue(g)}닢쯤)`, key: 'sell' });
      if (FISH_IDS.some((f) => H(g).fresh[f] && FISH[f].dry)) out.push({ label: '덕장에 걸어 말린다', key: 'dry' });
      if (FISH_IDS.some((f) => H(g).fresh[f] && FISH[f].salt)) out.push({ label: '소금에 절인다', key: 'salt' });
    }
    if (curedCount(g)) out.push({ label: '말리고 절인 것을 판다', key: 'cured' });
    out.push({ label: '그냥 둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s0, key) {
    const s = H(g), pl = here(g), sk = sky(g);
    if (key === 'no') return '광주리를 그늘에 두었다.';
    if (key === 'sell') {
      const v = freshValue(g); s.fresh = {}; g.player.money += v; s.earned += v;
      return `부두에 좌판을 폈다. 아낙들과 주막 주인들이 흥정하더니 다 가져갔다. 은화 ${v}닢.`;
    }
    if (key === 'cured') {
      const v = Math.round(s.cured.reduce((a, c) => a + curedValue(c), 0) * 0.8); s.cured = []; g.player.money += v; s.earned += v;
      return `말리고 절인 생선을 포구 상인에게 넘겼다. 은화 ${v}닢. 내륙 장터로 지고 가면 더 받는다고 상인이 웃으며 말했다.`;
    }
    if (key === 'dry') {
      const wet = ['rain', 'storm', 'fog', 'snow', 'blizzard'].includes(sk.weather);
      let n = 0, rot = 0;
      for (const f of FISH_IDS.filter((x) => s.fresh[x] && FISH[x].dry)) {
        const c = s.fresh[f]; delete s.fresh[f];
        const lost = wet ? Math.ceil(c * (0.3 + rng.next() * 0.3)) : 0;
        rot += lost; n += c - lost;
        if (c - lost > 0) s.cured.push({ f, how: 'dried', n: c - lost, y: g.date.year });
      }
      return wet ? `덕장에 줄줄이 걸었다. 축축한 바람에 ${rot}광주리가 물러 버렸다. 남은 ${n}광주리가 꾸덕하게 말라 간다.` : `덕장에 줄줄이 걸었다. 바닷바람에 ${n}광주리가 꾸덕하게 말라 간다. 포구 고양이들이 밤마다 덕장 아래를 맴돈다.`;
    }
    let n = 0;
    for (const f of FISH_IDS.filter((x) => s.fresh[x] && FISH[x].salt)) { n += s.fresh[f]; s.cured.push({ f, how: 'salted', n: s.fresh[f], y: g.date.year }); delete s.fresh[f]; }
    const cost = pay(g, Math.ceil(n * HARBORS[pl].salt / 2));
    return `통에 생선 한 켜, 소금 한 켜를 번갈아 쌓았다. ${n}광주리를 절였다. 소금값으로 은화 ${cost}닢이 들었다. 손등의 작은 상처마다 소금이 스며 쓰렸다.`;
  },
});

/* ---------- 내륙 장터에서 말린 생선을 판다 ---------- */
const INLAND = ['harfen', 'leocast', 'verden', 'gruental', 'ern', 'solaris', 'eisen', 'graubel', 'serenia'];
ACTIONS.push({
  id: 'harbor_sell', name: '말린 생선을 판다', icon: 'coin',
  desc: '말리고 절인 생선을 내륙 장터에 낸다. 바다에서 먼 고장일수록 값을 쳐준다.',
  available: (g) => free(g) && curedCount(g) > 0 && INLAND.includes(here(g)),
  run(g) {
    const s = H(g);
    const mul = ['leocast', 'solaris', 'eisen', 'serenia', 'graubel'].includes(here(g)) ? 1.5 : 1.25;
    const v = Math.round(s.cured.reduce((a, c) => a + curedValue(c), 0) * mul);
    const n = curedCount(g);
    s.cured = []; g.player.money += v; s.earned += v;
    return `${placeName(here(g))} 장터에 말린 생선 ${n}광주리를 풀었다. 바다 냄새를 처음 맡아 보는 아이들이 코를 쥐었다. 은화 ${v}닢을 받았다.`;
  },
});

/* ---------- 배를 마련하고 손본다 ---------- */
ACTIONS.push({
  id: 'harbor_boat', name: '배와 그물을 챙긴다', icon: 'home',
  desc: '내 배를 사거나 손보고, 그물을 새로 짜고, 선원을 들인다.',
  available: (g) => free(g) && atHarbor(g) && age(g) >= 16 && (!!boat(g) || (H(g).hauls >= 3 && g.player.money >= BOATS.skiff.cost)),
  run(g) {
    if (!sceneQueued(g, 'harbor_boat')) queueScene(g, 'harbor_boat', {}, { first: true });
    return '선창 목수의 작업장에 들렀다.';
  },
});
defineScene('harbor_boat', {
  need: (g) => atHarbor(g),
  title: () => '선창',
  text: (g) => {
    const b = boatHere(g) ? boat(g) : null;
    if (!b && boat(g)) return `내 배 ${boat(g).name}호는 ${placeName(boat(g).place)} 선창에 묶여 있다. 여기 선창 목수가 그쪽 포구 사람을 안다며 몰고 와 줄 수 있다고 한다.`;
    if (!b) return `선창에 팔려고 내놓은 배들이 묶여 있다. 쪽배는 은화 ${BOATS.skiff.cost}닢, 고깃배는 ${BOATS.boat.cost}닢, 큰 어선은 ${BOATS.smack.cost}닢. 늙은 선창 목수가 배 밑바닥을 두드려 보며 말한다. "배는 사는 날보다 손보는 날이 더 많소."`;
    const B = BOATS[b.kind];
    const hull = b.hull >= 80 ? '배는 튼튼하다' : b.hull >= 50 ? '이음매 몇 군데가 샌다' : '바닥 판자가 물러 위태롭다';
    return `${b.name}호. ${B.name}. ${hull}. 그물은 ${b.nets}벌(이 배에 맞는 것은 ${B.nets}벌), 선원은 ${crewOf(g).length}명(${B.crew}명이면 충분하다).`;
  },
  choices: (g) => {
    const out = [], b = boatHere(g) ? boat(g) : null, m = g.player.money;
    if (!b && boat(g)) {
      out.push({ label: `${placeName(boat(g).place)}에 둔 ${boat(g).name}호를 불러온다 (은화 5닢)`, key: 'bring' });
    } else if (!b) {
      for (const k of ['skiff', 'boat', 'smack']) if (m >= BOATS[k].cost) out.push({ label: `${J(BOATS[k].name, '을/를')} 산다 (은화 ${BOATS[k].cost}닢)`, key: `buy:${k}` });
    } else {
      if (b.hull < 90 && m >= 10) out.push({ label: '배를 손본다 (은화 10닢)', key: 'fix' });
      if (b.nets < BOATS[b.kind].nets && m >= NET_COST) out.push({ label: `그물을 새로 짠다 (은화 ${NET_COST}닢)`, key: 'net' });
      if (crewOf(g).length < BOATS[b.kind].crew) out.push({ label: '선원을 들인다', key: 'hire' });
      if (b.kind !== 'smack') { const up = b.kind === 'skiff' ? 'boat' : 'smack'; const c = BOATS[up].cost - Math.round(BOATS[b.kind].cost * 0.6); if (m >= c) out.push({ label: `${J(BOATS[up].name, '으로/로')} 바꾼다 (은화 ${c}닢 더)`, key: `up:${up}` }); }
      out.push({ label: '배를 판다', key: 'sellboat' });
    }
    out.push({ label: '그냥 나온다', key: 'no' });
    return out;
  },
  resolve(g, rng, s0, key) {
    const s = H(g), pl = here(g);
    if (key === 'no') return '선창 목수가 대패질을 멈추지 않고 고개만 끄덕였다.';
    if (key.startsWith('buy:') || key.startsWith('up:')) {
      const kind = key.split(':')[1], B = BOATS[kind];
      const old = s.boat;
      const cost = old ? B.cost - Math.round(BOATS[old.kind].cost * 0.6) : B.cost;
      if (g.player.money < cost) return '셈해 보니 돈이 모자랐다.';
      g.player.money -= cost;
      const name = old?.name ?? BOAT_NAMES[(mi(g) + (me(g).id ?? 0)) % BOAT_NAMES.length];
      s.boat = { kind, name, place: pl, hull: 100, nets: Math.max(old?.nets ?? 1, 1), crew: old?.crew ?? [], since: g.date.year };
      note(g, `${J(B.name, '을/를')} 마련했다. 이름은 ${name}호.`);
      logHarbor(g, `${B.name} ${name}호를 마련했다.`);
      if (!old) chron(g, `${g.player.name}, ${placeName(pl)}에서 제 배를 마련하다.`, 30);
      return old ? `${name}호라는 이름은 그대로 새 배로 옮겼다. 뱃사람들은 이름을 버리면 바다가 배를 못 알아본다고 믿는다.` : `${name}호. 이물에 이름을 새겼다. 첫 물에 띄우는 날 포구 사람들이 나와 술을 뿌렸다. 이제 남의 배에 몫꾼으로 타지 않아도 된다.`;
    }
    const b = s.boat;
    if (!b) return '배가 없다.';
    if (key === 'bring') { const from = placeName(b.place); pay(g, 5); b.place = pl; return `${from} 선창에 삯을 보내 ${b.name}호를 이리 몰고 오게 했다. 사흘 뒤 낯익은 돛이 포구 어귀에 나타났다.`; }
    if (key === 'fix') { pay(g, 10); b.hull = Math.min(100, b.hull + 35); return '뒤집어 놓고 바닥에 송진을 먹였다. 이음매에 뱃밥을 새로 박았다. 배가 한결 무거워진 것 같았다.'; }
    if (key === 'net') { pay(g, NET_COST); b.nets += 1; return '과부들에게 삯을 주고 그물을 새로 짰다. 마른 손가락이 놀랄 만큼 빨랐다.'; }
    if (key === 'hire') {
      const p = makePerson(rng, { sex: 'm', ageMonths: rng.int(17, 45) * 12, job: 'fisher' });
      p.place = pl; p.known = true; p.affection = rng.int(8, 22);
      g.people.push(p);
      b.crew.push(p.id);
      return `${J(p.name, '이/가')} 선원으로 들어왔다. ${(p.ageMonths / 12) < 25 ? '아직 수염도 제대로 안 난 얼굴이지만 그물 다루는 손은 익었다.' : '손바닥이 내 것보다 두꺼웠다. 말이 없었다.'}`;
    }
    if (key === 'sellboat') {
      const v = Math.round(BOATS[b.kind].cost * 0.5 * (b.hull / 100));
      g.player.money += v; s.boat = null;
      for (const p of crewOf(g)) p.affection = clamp((p.affection ?? 0) - 6, -100, 100);
      logHarbor(g, `${b.name}호를 팔았다.`);
      return `${b.name}호를 은화 ${v}닢에 넘겼다. 새 주인이 이름을 바꾸지 않기를 바랐다.`;
    }
    return '';
  },
});

/* ---------- 폭풍 ---------- */
defineScene('harbor_storm', {
  need: (g) => atHarbor(g) && !g.over,
  title: () => '폭풍',
  text: (g, s) => {
    const who = s.own && boat(g) ? `${boat(g).name}호` : '배';
    return `바다 저편 하늘이 검게 내려앉았다. 바람이 방향을 바꾸더니 파도가 뱃전을 넘기 시작했다. ${J(who, '이/가')} 물 위에서 장난감처럼 기운다. 그물에는 아직 고기가 가득하다. 곶까지는 멀고, 포구는 더 멀다.`;
  },
  choices: () => [{ label: '그물을 끊고 돌아선다', key: 'cut' }, { label: '그물을 끌어 올리며 버틴다', key: 'hold' }, { label: '곶 뒤로 숨어든다', key: 'cape' }],
  resolve(g, rng, s, key) {
    const h = H(g), b = s.own ? boat(g) : null;
    if (key === 'cut') {
      if (b) { b.nets = Math.max(0, b.nets - 1); h.fresh = {}; }
      stress(g, 4);
      return '도끼로 그물 줄을 끊었다. 가득 찬 그물이 검은 물속으로 가라앉았다. 빈 배가 가벼워 파도를 탔다. 포구 불빛이 보였을 때 다리가 풀렸다.';
    }
    const skill = sail(g) + (b ? BOATS[b.kind].sturdy : 5) + (key === 'cape' ? 10 : 0);
    if (check(rng, skill, key === 'hold' ? 55 : 45)) {
      tired(g, 10);
      return key === 'hold' ? '끝까지 그물을 끌어 올렸다. 손바닥이 찢어졌다. 포구에 닿았을 때 다들 나를 미친놈 보듯 보았다. 그 그물 하나로 한 달을 먹는다.' : '곶 뒤 바위 그늘에 배를 붙였다. 밤새 파도 소리를 들으며 밧줄을 붙들고 있었다. 새벽에 바다가 거짓말처럼 잔잔해졌다.';
    }
    return wreck(g, rng, b);
  },
});
// 폭풍이 남기는 것: 선원을 잃거나, 배가 부서지거나, 다치거나, 드물게 먼 포구로 떠밀려 간다
function wreck(g, rng, b) {
  const h = H(g), pl = here(g);
  tired(g, 25); stress(g, 12);
  const crew = b ? crewOf(g) : [];
  const roll = rng.next();
  if (roll < 0.07) {
    const others = Object.keys(HARBORS).filter((x) => x !== pl);
    const to = rng.pick(others);
    L(g).place = to;
    if (b) { b.hull = Math.max(5, b.hull - 50); b.place = to; }
    g.player.injuries.push({ name: '표류하다 상한 몸', months: 2 });
    note(g, `폭풍에 떠밀려 ${placeName(to)}까지 표류했다.`);
    chron(g, `${g.player.name}, 폭풍에 떠밀려 ${placeName(to)} 바닷가에서 발견되다.`, 50);
    logHarbor(g, `폭풍에 ${placeName(to)}까지 떠밀려 갔다.`);
    return `돛대가 부러지고 노가 날아갔다. 며칠을 떠 있었는지 모른다. 눈을 떴을 때는 낯선 바닷가 모래 위였다. ${placeName(to)}의 어부들이 나를 들여다보고 있었다. 고향 포구에서는 내 이름으로 제를 올렸을지도 모른다.`;
  }
  if (crew.length && roll < 0.4) {
    const p = rng.pick(crew);
    kill(g, p, '바다에서 실종');
    b.crew = b.crew.filter((id) => id !== p.id);
    h.lost.push({ name: p.name, y: g.date.year, place: pl, how: '폭풍' });
    h.widows.push({ name: `${p.name}의 아내`, place: pl, y: g.date.year, helped: false, of: p.name });
    note(g, `선원 ${J(p.name, '이/가')} 폭풍 속에 바다로 떨어졌다.`);
    logHarbor(g, `선원 ${J(p.name, '을/를')} 바다에서 잃었다.`);
    return `큰 파도가 뱃전을 덮쳤다. 물이 빠졌을 때 ${J(p.name, '이/가')} 보이지 않았다. 밤새 이름을 불렀다. 포구에 돌아와 그의 집 문을 두드리는 일이 바다보다 무서웠다.`;
  }
  if (b && roll < 0.7) {
    b.hull -= 45 + rng.int(0, 20);
    h.fresh = {};
    if (b.hull <= 0) {
      h.boat = null;
      note(g, `${b.name}호가 폭풍에 부서져 가라앉았다.`);
      logHarbor(g, `${b.name}호를 잃었다.`);
      return `바닥 판자가 갈라지는 소리가 났다. ${b.name}호가 기울며 가라앉았다. 부서진 노를 붙잡고 떠 있다가 지나던 배에 건져졌다. 이제 배가 없다.`;
    }
    return `돛대가 꺾이고 뱃전이 터졌다. 잡은 고기는 다 쏟아졌다. ${b.name}호는 간신히 포구에 닿았다. 한참 손봐야 한다.`;
  }
  g.player.injuries.push({ name: rng.chance(0.5) ? '밧줄에 감겨 꺾인 손목' : '뱃전에 부딪혀 부러진 갈비', months: 3 });
  if (b) h.fresh = {};
  if (!b && rng.chance(0.5)) { const nm = rng.pick(['토마스', '말로', '바스코', '한넬', '오스카']); h.lost.push({ name: nm, y: g.date.year, place: pl, how: '폭풍' }); h.widows.push({ name: `${nm}의 아내`, place: pl, y: g.date.year, helped: false, of: nm }); return `파도에 내동댕이쳐져 뱃전에 부딪혔다. 숨을 쉴 때마다 가슴이 찔렸다. 같은 배의 ${J(nm, '은/는')} 돌아오지 못했다.`; }
  return '파도에 내동댕이쳐져 뱃전에 부딪혔다. 숨을 쉴 때마다 가슴이 찔렸다. 그래도 배는 돌아왔다.';
}

/* ---------- 포구의 일들 ---------- */
const EVS = ['ground', 'smuggler', 'pirate', 'salvage', 'widow', 'festival', 'omen'];
export function eligible(g) {
  const out = [], h = H(g), own = boatHere(g), pl = here(g);
  if (own) out.push('ground', 'smuggler', 'pirate');
  out.push('salvage', 'omen');
  if (h.widows.some((w) => w.place === pl && !w.helped)) out.push('widow');
  if ([9, 10].includes(g.date.month) && h.hauls >= 4) out.push('festival');
  return out;
}
function queueHarborEvent(g, rng) {
  const ev = rng.pick(eligible(g));
  if (!ev || sceneQueued(g, 'harbor_event')) return;
  H(g).eventAt = mi(g);
  queueScene(g, 'harbor_event', { ev });
}
const still = (g, ev) => atHarbor(g) && (ev === 'first' || eligible(g).includes(ev));
defineScene('harbor_event', {
  need: (g, s) => [...EVS, 'first'].includes(s.ev) && still(g, s.ev),
  title: (g, s) => ({ first: '첫 출어', ground: '어장 다툼', smuggler: '밤의 짐', pirate: '검은 돛', salvage: '그물에 걸린 것', widow: '부두의 과부', festival: '만선 잔치', omen: '흰 새' }[s.ev]),
  text: (g, s) => {
    const pl = here(g), Hp = HARBORS[pl], rival = HARBORS[Hp.rival]?.name ?? '다른 포구';
    switch (s.ev) {
      case 'first': return `처음 바다에 나가는 사람은 뱃머리에서 고사를 지낸다. 늙은 선주가 술병을 내밀며 말한다. "${Hp.god}께 먼저 인사를 해야지." 포구 아이들이 구경하러 모여들었다.`;
      case 'ground': return `${rival} 배들이 ${Hp.ground}에 그물을 쳤다. 우리 포구 사람들이 대대로 고기를 낚던 자리다. 저쪽은 바다에 주인이 어디 있느냐고 한다. 포구 원로들이 내 배를 쳐다본다.`;
      case 'smuggler': return '밤늦게 낯선 사내가 선창으로 찾아왔다. 내일 새벽 나갈 때 상자 몇 개를 생선 광주리 밑에 실어 앞바다의 배에 넘겨 달라고 한다. 세관 장부에 오르지 않는 물건이다. 은화 서른 닢을 먼저 내민다.';
      case 'pirate': return `그물을 걷는데 검은 돛을 단 배가 다가왔다. 해적들이 뱃전에 갈고리를 걸었다. "고기 값은 받아야지. 이 바다에서 고기 잡는 값." 칼을 뽑은 자가 다섯이다.`;
      case 'salvage': return '그물을 걷는데 유난히 무거웠다. 끌어 올려 보니 부서진 배의 궤짝 하나와, 그 궤짝을 끌어안은 채 굳은 사람이 걸려 있었다. 궤짝 자물쇠는 녹슬었지만 단단하다.';
      case 'widow': { const w = H(g).widows.find((x) => x.place === pl && !x.helped); return `부두 끝에서 ${J(w.name, '이/가')} 그물을 깁고 있다. ${w.of ? `${J(w.of, '이/가')} 바다에서 돌아오지 못한 뒤로 ` : ''}과부들끼리 그물을 기워 끼니를 잇는다. 아이 둘이 치마 뒤에 숨어 나를 본다.`; }
      case 'festival': return '올가을 바다는 후했다. 포구에서 만선 잔치를 연다. 배를 가진 사람들이 술과 고기를 내는 것이 오랜 풍습이다. 누가 얼마를 내는지 다들 눈여겨본다.';
      case 'omen': return '새벽에 흰 새 한 마리가 뱃머리에 내려앉았다. 늙은 선원들의 얼굴이 굳었다. 흰 새가 앉은 날은 바다에 나가지 않는다고 한다. 하늘은 맑고 고기 떼는 들어왔다.';
      default: return '';
    }
  },
  choices: (g, s) => {
    switch (s.ev) {
      case 'first': return [{ label: '뱃머리에 술을 붓는다', key: 'sea' }, { label: '성광교 사제의 축복을 청한다', key: 'priest' }, { label: '그런 건 안 믿는다며 그냥 나간다', key: 'none' }];
      case 'ground': return [{ label: '저쪽 그물을 끊어 버린다', key: 'cut' }, { label: '양쪽 원로들끼리 담판을 짓게 한다', key: 'talk' }, { label: '철마다 나눠 쓰자고 한다', key: 'share' }, { label: '다른 어장으로 옮긴다', key: 'move' }];
      case 'smuggler': return [{ label: '싣는다', key: 'carry' }, { label: '돌려보낸다', key: 'no' }, { label: '세관에 알린다', key: 'report' }];
      case 'pirate': return [{ label: '고기 절반을 내준다', key: 'tribute' }, { label: '갈고리 줄을 끊고 달아난다', key: 'flee' }, { label: '노를 들고 맞선다', key: 'fight' }];
      case 'salvage': return [{ label: '궤짝을 열어 챙긴다', key: 'keep' }, { label: '포구 관리에게 넘긴다', key: 'hand' }, { label: '죽은 이를 먼저 묻어 준다', key: 'bury' }];
      case 'widow': return [{ label: '은화를 쥐여 준다', key: 'coin' }, { label: '큰아이를 내 배에 태우겠다고 한다', key: 'boy' }, { label: '그물 깁는 일을 맡긴다', key: 'work' }, { label: '지나친다', key: 'no' }];
      case 'festival': return [{ label: '술과 고기를 넉넉히 낸다', key: 'host' }, { label: '남들만큼 낸다', key: 'some' }, { label: '내지 않는다', key: 'none' }];
      case 'omen': return [{ label: '오늘은 나가지 않는다', key: 'stay' }, { label: '새를 쫓고 나간다', key: 'go' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const h = H(g), pl = here(g), gr = groundOf(g, pl), b = boat(g);
    switch (s.ev) {
      case 'first':
        if (key === 'sea') { stress(g, -3); return '뱃머리에 술을 부었다. 남은 한 모금은 내가 마셨다. 선주가 이제 바다가 내 얼굴을 안다고 했다.'; }
        if (key === 'priest') return '사제가 성수를 뿌렸다. 늙은 선원 몇은 뒤에서 몰래 바다에 술을 부었다. 둘 다 해 두는 것이 포구의 셈법이다.';
        stress(g, 2); return '그냥 나갔다. 늙은 선원들이 혀를 찼다. 그날 바다는 잔잔했다. 그래도 다들 한동안 나와 같은 배에 타기를 꺼렸다.';
      case 'ground':
        if (key === 'cut') { gr.feud = clamp(gr.feud + 30, 0, 100); deed(g, 'brave', 1, '어장을 침범한 배의 그물을 끊었다', pl); deed(g, 'kind', -1, '남의 그물을 끊었다', pl); if (rng.chance(0.3)) reportCrime(g, 'assault', pl, { mult: 0.3 }); return '밤에 저쪽 그물을 끊었다. 다음 달 우리 포구 배 하나가 돌아오는 길에 돌팔매를 맞았다. 바다 위의 싸움은 끝이 없다.'; }
        if (key === 'talk') { if (check(rng, stat(g, 'cha') * 0.6 + (L(g).renown ?? 0) / 4, 38)) { gr.feud = clamp(gr.feud - 25, 0, 100); return '양쪽 원로들이 등대 아래에서 만났다. 물때마다 번갈아 쓰기로 했다. 다들 투덜거렸지만 칼은 뽑지 않았다.'; } gr.feud = clamp(gr.feud + 10, 0, 100); return '담판은 고함으로 끝났다. 누가 먼저 주먹을 휘둘렀는지는 아무도 말하지 않는다.'; }
        if (key === 'share') { gr.feud = clamp(gr.feud - 15, 0, 100); deed(g, 'generous', 1, '어장을 맞수 포구와 나눠 쓰자고 했다', pl); return '봄철은 우리가, 가을은 저쪽이 쓰기로 했다. 우리 포구 노인들은 내가 바다를 내줬다고 수군거렸다.'; }
        gr.feud = clamp(gr.feud - 5, 0, 100); return '먼바다 쪽 다른 어장으로 옮겼다. 고기는 적고 길은 멀다. 그래도 싸움은 없었다.';
      case 'smuggler':
        if (key === 'carry') { g.player.money += 30; h.smuggled += 1; if (rng.chance(0.25)) { reportCrime(g, 'smuggling', pl, { mult: 0.6 }); return '상자를 넘겼다. 사흘 뒤 세관원이 내 배를 뒤졌다. 남은 것은 생선뿐이었지만 이름이 장부에 올랐다. (은화 30닢)'; } return '새벽 안개 속에서 상자를 넘겼다. 앞바다의 배는 불도 켜지 않았다. 은화 서른 닢. 그 상자에 무엇이 들었는지는 묻지 않았다.'; }
        if (key === 'report') { deed(g, 'honest', 2, '밀수꾼을 세관에 알렸다', pl); return '세관원들이 앞바다의 배를 덮쳤다. 그 뒤로 선창 사람 몇이 나를 보면 침을 뱉었다.'; }
        return '사내는 어깨를 으쓱하고 다른 배로 갔다.';
      case 'pirate':
        if (g.sea?.pirate) return '해적 하나가 내 얼굴을 알아보았다. "같은 물에서 노는 사람이군." 갈고리가 풀렸다. 그들은 웃으며 지나갔다.';
        if (key === 'tribute') { const lost = Math.floor(freshCount(g) / 2); let n = lost; for (const f of FISH_IDS) { const t = Math.min(n, h.fresh[f] ?? 0); h.fresh[f] = (h.fresh[f] ?? 0) - t; n -= t; } h.tribute += 1; stress(g, 5); return `고기 ${lost}광주리를 넘겼다. 해적들은 고맙다는 말 대신 다음 철에도 오겠다고 했다.`; }
        if (key === 'flee') { if (check(rng, sail(g) + (b ? BOATS[b.kind].sturdy : 0), 45)) return '갈고리 줄을 도끼로 끊고 바람을 탔다. 해적선은 무거워 따라오지 못했다. 포구에 닿아서야 손이 떨렸다.'; if (b) b.hull -= 20; h.fresh = {}; return '줄을 끊기 전에 해적들이 넘어왔다. 고기를 다 빼앗겼다. 돛까지 찢어 놓고 갔다.'; }
        queueFight(g, rng, { title: '검은 돛', intro: '해적들이 뱃전을 넘어온다.', enc: { unit: 'pirate', count: rng.int(3, 5), leader: null }, reward: { money: 15, renown: 3 }, avoidLabel: '고기를 다 내준다', avoidText: '고기를 다 내주었다. 해적들은 웃으며 돌아갔다.', onWin: '마지막 해적이 바다로 뛰어내렸다. 포구에 돌아가니 이야기가 나보다 먼저 와 있었다.' });
        return '노를 움켜쥐었다.';
      case 'salvage':
        if (key === 'keep') { const v = rng.int(20, 60); g.player.money += v; deed(g, 'honest', -1, '물에 빠져 죽은 이의 궤짝을 챙겼다', pl); return rng.chance(0.3) ? `궤짝 안에 은화 ${v}닢과 낯선 문장이 새겨진 반지가 있었다. 반지는 바다에 던졌다. 그날부터 꿈에 젖은 사람이 나왔다.` : `궤짝 안에 은화 ${v}닢이 있었다. 죽은 이는 다시 바다에 놓아주었다. 늙은 선원 하나가 그러면 안 된다고 중얼거렸다.`; }
        if (key === 'hand') { deed(g, 'honest', 2, '건져 올린 궤짝을 포구 관리에게 넘겼다', pl); const v = rng.int(5, 15); g.player.money += v; return `포구 관리가 궤짝을 받아 장부에 적었다. 석 달 뒤 주인을 찾았다며 사례로 은화 ${v}닢을 보내왔다.`; }
        deed(g, 'kind', 2, '바다에서 건진 이름 모를 시신을 묻어 주었다', pl); stress(g, -2); return '포구 언덕에 이름 모를 사람을 묻었다. 과부들이 와서 같이 울어 주었다. 궤짝은 무덤 옆에 두었다. 누가 가져갔는지는 모른다.';
      case 'widow': {
        const w = h.widows.find((x) => x.place === pl && !x.helped);
        if (!w) return '그 사이 형편이 달라졌다.';
        if (key === 'no') return '못 본 척 지나쳤다. 등 뒤에서 그물 바늘 소리가 멈추지 않았다.';
        w.helped = true;
        if (key === 'coin') { const n = pay(g, 15); deed(g, 'generous', 2, '포구의 과부를 도왔다', pl); return `은화 ${n}닢을 쥐여 주었다. ${J(w.name, '은/는')} 받지 않으려다 아이들을 보고 받았다.`; }
        if (key === 'boy') { deed(g, 'kind', 2, '바다에서 잃은 어부의 아이를 배에 태웠다', pl); if (b) { const p = makePerson(rng, { sex: 'm', ageMonths: rng.int(13, 16) * 12, job: 'fisher' }); p.place = pl; p.known = true; p.affection = 30; g.people.push(p); b.crew.push(p.id); return `큰아이 ${J(p.name, '이/가')} 내 배에 올랐다. 제 아비의 낡은 장화를 신고 왔다. 발에 맞지 않았다.`; } return '배가 생기면 태우겠다고 약속했다. 아이가 그 말을 오래 기억할 것이다.'; }
        deed(g, 'kind', 1, '포구 과부에게 그물 깁는 일을 맡겼다', pl); pay(g, 6); if (b) b.nets = Math.min(BOATS[b.kind].nets, b.nets + 1); return '내 그물을 맡겼다. 은화 여섯 닢. 돌아온 그물은 새것보다 촘촘했다.';
      }
      case 'festival':
        if (key === 'host') { const n = pay(g, 25); deed(g, 'generous', 3, '만선 잔치에 술과 고기를 넉넉히 냈다', pl); L(g).renown = (L(g).renown ?? 0) + 1; return `은화 ${n}닢어치 술과 고기를 냈다. 밤새 뱃노래가 그치지 않았다. 과부들의 아이들까지 배를 두드리며 잠들었다.`; }
        if (key === 'some') { pay(g, 10); return '남들만큼 냈다. 뱃노래를 따라 불렀다. 누군가 바다에서 돌아오지 못한 이들의 이름을 하나씩 불렀다. 다들 잔을 바다 쪽으로 기울였다.'; }
        deed(g, 'generous', -2, '만선 잔치에 한 푼도 내지 않았다', pl); return '내지 않았다. 잔치 자리에서 내 이름은 나오지 않았다. 다음 날 아침 선창 사람들의 인사가 짧았다.';
      case 'omen':
        if (key === 'stay') return '나가지 않았다. 그날 다른 포구 배 하나가 돌아오지 않았다는 소식이 저녁에 들려왔다. 맑은 날이었다.';
        if (rng.chance(0.25)) { stress(g, 6); return '새를 쫓고 나갔다. 해 질 녘 갑자기 너울이 일었다. 배는 돌아왔지만 늙은 선원들은 그 뒤로 내 배에 타지 않겠다고 했다.'; }
        return '새를 쫓고 나갔다. 고기를 가득 싣고 돌아왔다. 늙은 선원들은 운이 좋았을 뿐이라고 했다.';
      default: return '';
    }
  },
});

/* ---------- 달이 넘어갈 때 ---------- */
export function harborMonth(g, rng) {
  const h = H(g);
  // 날생선은 상한다
  const n = Object.values(h.fresh).reduce((a, x) => a + x, 0);
  if (n > 0) { h.spoiled += n; h.fresh = {}; if (n >= 3) logHarbor(g, `팔지 못한 생선 ${n}광주리가 상했다.`); }
  // 배는 물에 있으면 조금씩 낡는다
  if (h.boat) h.boat.hull = Math.max(1, h.boat.hull - (rng.chance(0.5) ? 1 : 0));
  // 선원이 떠나거나 죽으면 명단에서 뺀다
  if (h.boat) h.boat.crew = h.boat.crew.filter((id) => { const p = g.people.find((x) => x.id === id); return p && p.alive; });
}
HOOKS.heir.push((g) => {
  // 배는 집안에 남는다(대를 이어 탄다). 날생선은 상한다.
  const h = H(g); h.fresh = {}; h.firstAt = 0;
});
