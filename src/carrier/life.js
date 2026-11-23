// 길 위의 일의 삶: 짐꾼·짐수레꾼·길잡이 일자리, 짐 맡기, 수레 꾸리기, 길 위의 위험, 짐 넘기기, 역참.
import { ACTIONS } from '../actions.js';
import { registerJob, WORK, doWork } from '../jobs.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check, gains, up } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { addAnimal, bury } from '../beasts/core.js';
import { PLACES } from '../places.js';
import { J } from '../narrative/text.js';
import {
  C, mi, clamp, here, placeName, free, adult, Q, routeKey, reached, carrierJob, horses, CARTS, CART_IDS, LOADS, STATION_PLACES, STATION_COST,
  HOUSES, houseOn, fadeAt, railed, knackRank, KNACK_RANK, linksOf, travelMonths, logC, gainKnack, stationHere,
} from './core.js';

export const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const pick = (rng, a) => a[Math.floor(rng.next() * a.length)];
const kUp = (v) => up('길눈', v);

/* ---------- 길 위의 일자리 ---------- */
registerJob('porter', {
  name: '짐꾼', places: ['hammer', 'graubel', 'gorge', 'portel', 'klein', 'saltmare'], skill: null, stat: 'str', stat2: 'wil', wage: [1, 2, 3, 4], npcJob: 'laborer',
  ranks: ['짐꾼', '고참 짐꾼', '짐꾼 우두머리', '짐꾼 패의 두목'],
  lines: ['소금 자루 둘을 지고 고갯길을 올랐다. 멜빵이 어깨를 파고들었다.', '부두에서 배 한 척 짐을 다 부렸다. 해가 졌다.', '드워프 광부들의 쇠 궤짝을 날랐다. 무게는 사람 하나였고 품삯은 반 사람이었다.', '비탈에서 미끄러졌다. 짐은 지켰다. 무릎이 깨졌다.'],
});
registerJob('hauler', {
  name: '짐수레꾼', places: ['harfen', 'verden', 'leocast', 'eisen', 'barka', 'klein', 'ern'], skill: null, stat: 'str', stat2: 'agi', wage: [2, 3, 4, 6], npcJob: 'laborer',
  ranks: ['수레 미는 사람', '짐수레꾼', '고참 짐수레꾼', '짐수레꾼 우두머리'],
  lines: ['장터에서 창고까지 밀 자루를 실어 날랐다. 열두 번 오갔다.', '술통을 싣다 하나를 놓쳤다. 굴러가는 통을 셋이 쫓았다.', '진창에 바퀴가 빠졌다. 말 대신 내가 끌었다.', '성문 통행세를 두고 문지기와 실랑이를 했다. 결국 냈다.'],
});
registerJob('guide', {
  name: '길잡이', places: ['graubel', 'fur', 'silverleaf', 'gorge', 'hammer'], skill: null, stat: 'sen', stat2: 'wil', wage: [2, 3, 5, 7], npcJob: 'hunter',
  ranks: ['길잡이 따라다니는 사람', '길잡이', '이름난 길잡이', '산을 읽는 사람'],
  req: (g) => (C(g).knack >= 15 || (g.player.stats.sen ?? 0) >= 35 ? null : '길눈 15 또는 감각 35'),
  lines: ['안개 낀 고개에서 돌무더기 이정표를 하나씩 짚으며 상인 일행을 넘겼다.', '늪가의 단단한 땅만 골라 디뎠다. 뒤따르는 사람들은 내 발자국만 밟았다.', '숲 속에서 길 잃은 사냥꾼 둘을 찾아 데려왔다. 하나는 발가락을 잃을 것이다.', '마물 발자국을 보고 길을 돌렸다. 손님은 투덜댔다. 살아서 투덜댈 수 있었다.'],
});
// 기술이 닿으면 품삯이 준다: 짐수레꾼은 쇠수레 길, 짐꾼은 항구 기중기, 길잡이는 정밀 지도
const JOB_FADE = { hauler: (g) => fadeAt(g), porter: (g) => (reached(g, 'crane') ? 0.3 : 0), guide: (g) => (reached(g, 'survey') ? 0.2 : 0) };
for (const id of Object.keys(JOB_FADE)) {
  WORK[id].work = function carrierWork(g, rng) {
    const before = g.player.money;
    let text = doWork(g, rng, this, { tire: 15 });
    const v = gainKnack(g, id === 'guide' ? 0.8 : 0.3);
    const cut = JOB_FADE[id](g), got = g.player.money - before;
    if (cut > 0 && got > 1) {
      const back = Math.min(got - 1, Math.round(got * cut));
      if (back > 0) { g.player.money -= back; text += ` 일감이 줄어 ${back}닢을 덜 받았다. ${id === 'porter' ? '부두의 기중기가 사람 열의 짐을 든다.' : id === 'guide' ? '찍어 낸 지도를 든 상인들은 길잡이를 덜 찾는다.' : '쇠수레가 다니고부터 짐수레를 부르는 사람이 줄었다.'}`; }
    }
    return `${text}${gains([kUp(v)])}`;
  };
}

/* ---------- 짐 맡기 ---------- */
const GUIDE_PLACES = ['graubel', 'fur', 'silverleaf', 'gorge', 'hammer', 'gruental'];
export function kindsFor(g) {
  const s = C(g), out = ['back'];
  if (s.cart && CARTS[s.cart.kind].cap >= 2 && horses(g).length >= CARTS[s.cart.kind].horses) out.push('freight');
  if (s.cart?.kind === 'coach' && horses(g).length >= 2) out.push('people');
  if (horses(g).length >= 1) out.push('mail');
  if ((carrierJob(g) === 'guide' || s.knack >= 30) && GUIDE_PLACES.includes(here(g))) out.push('guide');
  return out;
}
const capOf = (g, kind) => (kind === 'freight' ? CARTS[C(g).cart.kind].cap / 2 : kind === 'people' ? 1.6 : 1);
export function payFor(g, kind, to) {
  const m = travelMonths(here(g), to);
  const key = routeKey(here(g), to), hk = houseOn(g, key), st = C(g);
  const house = hk ? (st.hired === hk ? 1.2 : 0.85) : 1;
  const cut = st.cut?.key === key && st.cut.until > mi(g) ? 0.8 : 1;
  const signal = kind === 'mail' && reached(g, 'signal') ? 0.6 : 1;
  const raw = LOADS[kind].base * m * capOf(g, kind) * (1 - fadeAt(g)) * (1 + C(g).knack / 200) * house * cut * signal;
  return Math.max(2, Math.round(raw));
}
export function offersFor(g, rng) {
  const pl = here(g), ks = kindsFor(g);
  const dests = linksOf(pl).filter((d) => travelMonths(pl, d) <= 3);
  const out = [];
  for (let i = 0; i < 8 && out.length < 3; i++) {
    const kind = pick(rng, ks), to = pick(rng, dests);
    if (!to || out.some((o) => o.kind === kind && o.to === to)) continue;
    if (['freight', 'people'].includes(kind) && railed(g, pl, to)) continue; // 철길 구간은 쇠수레가 가져간다
    out.push({ kind, to, what: pick(rng, LOADS[kind].what), pay: payFor(g, kind, to) });
  }
  return out;
}
const canHaul = (g) => free(g) && adult(g) && !C(g).haul && !sceneQueued(g, 'carrier_offer') && (!!carrierJob(g) || !!C(g).cart || horses(g).length > 0 || C(g).knack >= 10);
ACTIONS.push({
  id: 'carrier_haul', name: '남의 짐을 맡아 나른다', icon: 'road',
  desc: '이웃 고장까지 짐이나 손님, 급한 편지를 나르고 삯을 받는다. 수레와 말이 있으면 큰 짐을 맡는다. 길에서 짐을 잃으면 삯도 잃는다.',
  available: (g) => canHaul(g) && linksOf(here(g)).length > 0,
  run(g, rng) {
    const offers = offersFor(g, rng);
    if (!offers.length) return '역참 마당을 돌았지만 오늘은 맡길 짐이 없었다.';
    queueScene(g, 'carrier_offer', { offers }, { first: true });
    return '역참 마당과 장터 끝 짐 부리는 곳을 돌며 맡길 짐이 있는지 물었다.';
  },
});
defineScene('carrier_offer', {
  need: (g, s) => !C(g).haul && !!s.offers?.length && free(g),
  title: () => '맡길 짐',
  text: (g, s) => {
    const lines = s.offers.map((o) => `${placeName(o.to)}까지 ${o.what}, ${travelMonths(here(g), o.to)}달, 은화 ${o.pay}닢`);
    const h = s.offers.map((o) => houseOn(g, routeKey(here(g), o.to))).find(Boolean);
    return `맡기겠다는 짐이다. ${lines.join('. ')}.${h ? ` 그 길은 ${J(HOUSES[h].name, '이/가')} 값을 후려쳐 놓아 삯이 박하다.` : ''}${fadeAt(g) > 0 ? ' 예전보다 짐이 적다.' : ''}`;
  },
  choices: (g, s) => [...s.offers.map((o, i) => ({ label: `${J(o.what, '을/를')} 싣고 ${J(placeName(o.to), '으로/로')}`, key: `o${i}` })), { label: '이번엔 맡지 않는다', key: 'none' }],
  resolve(g, rng, s, key) {
    if (key === 'none') return '삯이 맞지 않았다. 다음 짐을 기다리기로 했다.';
    const o = s.offers[Number(key.slice(1))], m = travelMonths(here(g), o.to), from = here(g);
    C(g).haul = { kind: o.kind, what: o.what, to: o.to, from, pay: o.pay, load: 1, due: mi(g) + m + 1, started: mi(g), hits: 0 };
    L(g).travel = { to: o.to, left: m, from };
    const how = o.kind === 'people' ? '손님들을 태우고' : o.kind === 'freight' ? `${CARTS[C(g).cart.kind].name}에 짐을 싣고` : o.kind === 'mail' ? '편지를 품에 넣고 말에 올라' : o.kind === 'guide' ? '앞장서서' : '등짐을 지고';
    return `${how} ${J(placeName(o.to), '으로/로')} 떠났다. ${m}달 길이다. 늦으면 삯이 깎인다.`;
  },
});

/* ---------- 수레 꾸리기 ---------- */
const cartChoices = (g) => CART_IDS.filter((k) => CARTS[k].cost > (C(g).cart ? CARTS[C(g).cart.kind].cost : 0) && g.player.money >= CARTS[k].cost && horses(g).length >= CARTS[k].horses);
ACTIONS.push({
  id: 'carrier_cart', name: '수레를 꾸린다', icon: 'road',
  desc: '손수레, 말 한 마리가 끄는 짐수레, 말 둘이 끄는 승합 마차. 큰 수레일수록 큰 짐과 손님을 맡는다. 말은 장터에서 따로 산다.',
  available: (g) => free(g) && adult(g) && (!!carrierJob(g) || C(g).done >= 2) && cartChoices(g).length > 0 && !sceneQueued(g, 'carrier_cart'),
  run(g) { queueScene(g, 'carrier_cart', {}, { first: true }); return '수레 짜는 집 마당을 둘러보았다.'; },
});
defineScene('carrier_cart', {
  need: (g) => cartChoices(g).length > 0,
  title: () => '수레 고르기',
  text: (g) => `수레 짜는 늙은 목수가 바퀴살을 손바닥으로 쳐 보였다. ${C(g).cart ? `지금은 ${J(CARTS[C(g).cart.kind].name, '을/를')} 끈다.` : '아직 수레가 없다.'} 말은 ${horses(g).length}마리.`,
  choices: (g) => [...cartChoices(g).map((k) => ({ label: `${CARTS[k].name} (은화 ${CARTS[k].cost}닢)`, key: k })), { label: '그만둔다', key: 'none' }],
  resolve(g, rng, s, key) {
    if (key === 'none' || !CARTS[key]) return '바퀴를 한 번 더 굴려 보고 돌아섰다.';
    pay(g, CARTS[key].cost); C(g).cart = { kind: key, since: g.date.year };
    logC(g, `${J(CARTS[key].name, '을/를')} 꾸렸다.`);
    return `${J(CARTS[key].name, '을/를')} 샀다. ${CARTS[key].desc}`;
  },
});

/* ---------- 길 위의 위험 ---------- */
const RIVERS = ['verden', 'klein', 'leocast', 'gruental'];
export function roadKinds(g) {
  const h = C(g).haul, m = g.date.month, out = ['bandit'];
  if (m >= 11 || m <= 2 || ((m >= 6 && m <= 8) && !reached(g, 'paving', h.from))) out.push('weather');
  const bridged = g.works?.w?.w_bridge?.stage === 'done' || reached(g, 'bridge', h.to);
  if ((RIVERS.includes(h.to) || RIVERS.includes(h.from)) && !bridged) out.push('bridge');
  if (horses(g).length) out.push('lame');
  if (h.kind === 'people') out.push('sick');
  return out;
}
const lose = (h, f) => { h.load = Math.max(0, Math.round(h.load * (1 - f) * 100) / 100); };
const delay = (g) => { if (L(g).travel) L(g).travel.left += 1; };
const loadWord = (h) => (h.kind === 'people' ? '손님' : h.kind === 'guide' ? '일행' : h.kind === 'mail' ? '편지' : '짐');
// 잃는 것: 손님과 일행은 사람이 아니라 그들의 짐을 잃는다
const lootWord = (h) => (h.kind === 'people' ? '손님들 짐 보따리' : h.kind === 'guide' ? '일행의 짐' : h.kind === 'mail' ? '편지 꾸러미' : '짐');
defineScene('carrier_road', {
  keep: true,
  need: (g) => !!C(g).haul && !!L(g).travel,
  title: (g, s) => ({ bandit: '길을 막은 자들', weather: s.snow ? '눈길' : '진창길', bridge: '떠내려간 다리', lame: '다리를 저는 말', sick: '앓는 손님' }[s.kind]),
  text: (g, s) => {
    const h = C(g).haul, w = loadWord(h);
    switch (s.kind) {
      case 'bandit': return `${placeName(h.to)} 가는 길 여울목에서 활 든 자들이 걸어 나왔다.${s.thugs ? ' 칼이 너무 좋다. 누가 삯을 주고 보낸 자들이다.' : ''} "${h.kind === 'people' ? '손님들 주머니를' : `${J(h.what, '을/를')}`} 두고 가면 목숨은 붙여 주지."`;
      case 'weather': return s.snow ? `고갯마루에 눈이 무릎까지 쌓였다. 바퀴 자국도 발자국도 지워졌다. ${J(w, '이/가')} 뒤에서 내 얼굴만 본다.` : `사흘 내린 비에 길이 죽처럼 풀렸다. ${h.kind === 'freight' ? '바퀴가 축까지 빠졌다.' : '한 걸음마다 발목까지 빠진다.'}`;
      case 'bridge': return '강가에 닿으니 나무다리가 반쯤 떠내려가 있다. 물이 불어 누런 물살이 빠르다. 나룻배 사공은 삯을 세 배로 부른다.';
      case 'lame': { const a = horses(g)[0]; return `${a ? J(a.name, '이/가') : '말이'} 왼쪽 앞다리를 전다. 편자가 빠지고 발굽이 갈라졌다.`; }
      default: return '마차 안에서 늙은 순례자가 열에 들떠 헛소리를 한다. 다른 손님들이 자리를 비켜 앉았다. 다음 마을까지는 이틀이다.';
    }
  },
  choices: (g, s) => {
    switch (s.kind) {
      case 'bandit': return [{ label: '맞서 싸운다', key: 'fight' }, { label: `${lootWord(C(g).haul)} 일부를 내준다`, key: 'pay' }, { label: C(g).haul.kind === 'people' ? '마차를 버리고 달아난다' : '짐을 버리고 달아난다', key: 'flee' }, ...(C(g).knack >= 40 ? [{ label: '아는 샛길로 빠진다', key: 'trail' }] : [])];
      case 'weather': return [{ label: '그대로 밀고 나간다', key: 'push' }, { label: '날이 들 때까지 기다린다', key: 'wait' }, { label: '돌아가는 길로 간다', key: 'detour' }];
      case 'bridge': return [{ label: '얕은 여울을 골라 건넌다', key: 'ford' }, ...(g.player.money >= 4 ? [{ label: '나룻배 삯을 낸다 (은화 4닢)', key: 'ferry' }] : []), { label: '아래쪽 돌다리까지 돌아간다', key: 'around' }];
      case 'lame': return [{ label: '마을에서 쉬게 한다', key: 'rest' }, { label: '채찍질해 끝까지 간다', key: 'push' }, ...(g.player.money >= 30 ? [{ label: '마을에서 말을 새로 산다 (은화 30닢)', key: 'buy' }] : [])];
      default: return [{ label: '마을 약초꾼에게 들른다', key: 'heal' }, { label: '서둘러 간다', key: 'push' }, { label: '마을에 내려 두고 간다', key: 'leave' }];
    }
  },
  resolve(g, rng, s, key) {
    const h = C(g).haul, st = C(g), w = lootWord(h);
    switch (`${s.kind}:${key}`) {
      case 'bandit:fight': {
        if (check(rng, playerPower(g) + st.knack / 4, 34 + (s.roll ?? 10))) { L(g).renown += 1; gainKnack(g, 1); return '먼저 덤빈 자의 팔을 꺾자 나머지가 숲으로 흩어졌다. 짐은 하나도 잃지 않았다.'; }
        lose(h, 0.5); g.player.injuries.push({ name: rng.pick(['화살이 스친 어깨', '몽둥이에 맞은 갈비', '칼에 베인 팔']), months: rng.int(1, 3) }); stress(g, 8);
        return `셋까지는 버텼다. 넷째가 뒤에서 쳤다. 정신을 차리니 ${w} 절반이 없었다.`;
      }
      case 'bandit:pay': lose(h, 0.3); return `${w} 셋에 하나를 내주었다. 우두머리가 길을 비켜 주며 다음에도 이 길로 오라고 웃었다.`;
      case 'bandit:flee': lose(h, 0.7); stress(g, 6); return `${h.kind === 'people' ? '마차를' : '짐을'} 내버려 두고 숲으로 뛰었다. 돌아와 보니 남은 것이 얼마 없었다.`;
      case 'bandit:trail': delay(g); gainKnack(g, 1.5); return '길을 꺾어 나무꾼들만 아는 샛길로 들어섰다. 하루를 더 갔지만 아무도 따라오지 않았다.';
      case 'weather:push': if (check(rng, st.knack + (g.player.stats.wil ?? 0) / 3, 45)) { gainKnack(g, 1.2); tired(g, 15); return '이를 악물고 밀었다. 해 질 녘 다음 역참 불빛이 보였다.'; } lose(h, 0.2); tired(g, 25); return `밀고 나가다 ${h.kind === 'freight' ? '짐 한 귀퉁이가 굴러떨어져 개울에 빠졌다' : '일행 하나가 발을 접질렸다'}. 그래도 나아갔다.`;
      case 'weather:wait': delay(g); return '길가 헛간에서 사흘을 기다렸다. 하늘이 열리자 다시 떠났다. 한 달이 늦었다.';
      case 'weather:detour': delay(g); gainKnack(g, 1); return '골짜기를 따라 돌아가는 길로 갔다. 멀었지만 잃은 것은 없었다.';
      case 'bridge:ford': if (check(rng, st.knack + (g.player.stats.str ?? 0) / 4, 48)) { gainKnack(g, 1.5); return '물살이 무릎에서 허리까지 차올랐다. 한 발씩 더듬어 건넜다. 건너편에서 사공이 혀를 찼다.'; }
        lose(h, 0.4); if (horses(g).length && rng.chance(0.3)) { const a = horses(g)[0]; bury(g, a, '여울에서 물살에 휩쓸렸다'); } stress(g, 8);
        return `한가운데서 발이 미끄러졌다. ${w} 일부가 물살에 떠내려갔다.`;
      case 'bridge:ferry': pay(g, 4); return '사공에게 은화 넉 닢을 쥐여 주었다. 배 바닥으로 물이 스몄지만 건넜다.';
      case 'bridge:around': delay(g); return '강을 따라 내려가 돌다리로 건넜다. 한 달이 늦었다.';
      case 'lame:rest': delay(g); return '마을 대장간에서 편자를 새로 박고 보름을 쉬게 했다. 말이 다시 고개를 들었다.';
      case 'lame:push': { const a = horses(g)[0]; if (a && rng.chance(0.35)) { bury(g, a, '다리를 절며 끌다 길에서 쓰러졌다'); stress(g, 10); return `${J(a.name, '이/가')} 길 한가운데서 무릎을 꿇었다. 다시 일어나지 못했다. 짐을 나눠 지고 걸었다.`; } return '채찍을 들었다. 말은 절룩이며 끝까지 갔다. 다시는 그러지 않기로 했다.'; }
      case 'lame:buy': { pay(g, 30); const a = addAnimal(g, 'horse', { ageYears: 6, trained: 100, bond: 20 }); return a ? `마을 농부에게서 늙지 않은 말 ${Q(a.name, '을/를')} 샀다. 저는 말은 그 집에 맡겼다.` : '살 말이 없었다. 저는 말을 달래며 천천히 갔다.'; }
      case 'sick:heal': delay(g); pay(g, 3); deed(g, 'kind', 3, null); return '마을 약초꾼 집에 순례자를 눕혔다. 열이 내리는 것을 보고 떠났다. 다른 손님들은 늦는다고 투덜댔다.';
      case 'sick:push': if (rng.chance(0.3)) { lose(h, 0.2); stress(g, 10); deed(g, 'kind', -4, null); return '다음 마을에 닿기 전에 순례자가 숨을 거뒀다. 남은 손님들은 내내 말이 없었다.'; } return '말을 몰아 하루 만에 마을에 닿았다. 순례자는 살았다.';
      default: lose(h, 0.15); return '순례자를 마을 사제에게 맡겼다. 삯은 그만큼 덜 받는다.';
    }
  },
});

/* ---------- 짐 넘기기 ---------- */
export function deliver(g, h, { late = false, cut = 1 } = {}) {
  const s = C(g), n = Math.max(1, Math.round(h.pay * cut * (late ? 0.8 : 1)));
  g.player.money += n; s.earned += n; s.done += 1;
  const key = routeKey(h.from, h.to); s.routes[key] = (s.routes[key] ?? 0) + 1;
  const v = gainKnack(g, 1.2 + travelMonths(h.from, h.to) * 0.4);
  s.haul = null;
  logC(g, `${placeName(h.to)}에 ${J(h.what, '을/를')} 넘겼다.`);
  return `${placeName(h.to)}에서 ${J(h.what, '을/를')} ${['people', 'guide'].includes(h.kind) ? '무사히 내려 주고' : '넘기고'} 은화 ${n}닢을 받았다.${late ? ' 늦었다고 삯을 깎였다.' : ''}${gains([kUp(v)])}`;
}
defineScene('carrier_short', {
  need: (g) => !!C(g).haul && C(g).haul.to === here(g) && !L(g).travel,
  title: () => '모자란 짐',
  text: (g) => { const h = C(g).haul; return `${placeName(h.to)}에서 짐 받을 사람이 ${J(h.what, '을/를')} 세어 보더니 얼굴이 굳었다. ${Math.round((1 - h.load) * 100)}%쯤 비었다.`; },
  choices: (g) => [{ label: '길에서 잃었다고 그대로 말한다', key: 'tell' }, { label: '모자란 만큼 내 돈으로 물어 준다', key: 'make' }, { label: '도적이 더 많이 가져갔다고 부풀린다', key: 'lie' }],
  resolve(g, rng, s, key) {
    const h = C(g).haul, st = C(g);
    if (key === 'make') { const owe = Math.round(h.pay * (1 - h.load)); const p = pay(g, owe); deed(g, 'honest', 4, `${g.player.name}, 잃은 짐을 제 돈으로 물어 주다`); st.lost += 1; return `${deliver(g, h)} 모자란 몫 은화 ${p}닢은 내 주머니에서 나갔다. 그 사람은 다음에도 나를 찾겠다고 했다.`; }
    if (key === 'lie') {
      if (rng.chance(0.35)) { deed(g, 'honest', -6, `${g.player.name}, 짐을 빼돌리고 도적 탓을 하다`); reportCrime(g, 'fraud', here(g), { mult: 0.5 }); st.lost += 1; st.haul = null; return '같은 길로 온 장사꾼이 그날 도적은 없었다고 했다. 삯은 한 닢도 못 받았고, 고발이 들어갔다.'; }
      return `${deliver(g, h, { cut: Math.min(1, h.load + 0.25) })} 도적 이야기에 다들 혀를 찼다.`;
    }
    st.lost += 1;
    return deliver(g, h, { cut: Math.max(0.1, h.load) });
  },
});

/* ---------- 역참 ---------- */
export const stationOk = (g) => free(g) && adult(g) && !C(g).station && STATION_PLACES.includes(here(g)) && g.player.money >= STATION_COST && (C(g).knack >= 30 || C(g).done >= 5);
ACTIONS.push({
  id: 'carrier_station', name: '역참을 차린다', icon: 'home',
  desc: `은화 ${STATION_COST}닢. 길목에 마구간과 여물간, 잠자리 몇 칸. 지나는 마차가 말을 바꾸고 사람이 묵는다. 길이 붐비면 벌고, 길이 바뀌면 문을 닫는다.`,
  available: (g) => stationOk(g),
  run(g) {
    const s = C(g); pay(g, STATION_COST);
    s.station = { place: here(g), name: `${placeName(here(g))} 길목 역참`, since: g.date.year, rep: 15, horses: 2, hands: 1, inn: false };
    logC(g, `${placeName(here(g))}에 역참을 차렸다.`);
    chron(g, `${g.player.name}, ${placeName(here(g))} 길목에 역참을 열다.`, 12);
    return `${placeName(here(g))} 성문 밖 갈림길에 마구간 딸린 집을 얻었다. 역마 두 필을 들이고, 문 앞에 말굽 모양 간판을 걸었다.`;
  },
});
const INN_KINDS = ['courier', 'thief', 'buyout', 'wedding'];
defineScene('carrier_inn', {
  need: (g) => stationHere(g),
  title: (g, s) => ({ courier: '왕실 파발', thief: '말 도둑', buyout: '운송단의 제안', wedding: '역참 마당의 혼례 행렬' }[s.kind]),
  text: (g, s) => {
    const st = C(g).station;
    switch (s.kind) {
      case 'courier': return `한밤중에 왕실 파발이 들이닥쳤다. 땀에 젖은 말을 던지듯 맡기고, 가장 좋은 역마를 내놓으라고 한다. 삯은 "나중에 왕실에서" 준다고 했다.`;
      case 'thief': return `새벽에 마구간에서 소리가 났다. 일꾼이 역마 고삐를 쥔 젊은이를 붙잡아 왔다. 맨발에 볼이 패였다.`;
      case 'buyout': return `${J(HOUSES[s.house].name, '이/가')} 사람을 보냈다. "${J(st.name, '을/를')} 은화 ${s.price}닢에 넘기시오. 아니면 이 길목에 우리 역참을 하나 더 세울 거요."`;
      default: return '이웃 고을로 시집가는 신부 행렬이 역참에 묵어 가겠다고 한다. 방은 모자라고 마당은 좁다.';
    }
  },
  choices: (g, s) => ({
    courier: [{ label: '좋은 말을 내준다', key: 'give' }, { label: '삯을 먼저 받는다', key: 'pay' }, { label: '마구간이 비었다고 둘러댄다', key: 'lie' }],
    thief: [{ label: '경비대에 넘긴다', key: 'guard' }, { label: '따끔하게 혼내고 보낸다', key: 'scold' }, { label: '마구간 일꾼으로 쓴다', key: 'hire' }],
    buyout: [{ label: '넘긴다', key: 'sell' }, { label: '거절한다', key: 'refuse' }],
    wedding: [{ label: '내 방까지 내준다', key: 'host' }, { label: '삯을 두 배로 받는다', key: 'gouge' }],
  }[s.kind]),
  resolve(g, rng, s, key) {
    const st = C(g).station;
    switch (`${s.kind}:${key}`) {
      case 'courier:give': st.rep = clamp(st.rep + 6, 0, 100); if (rng.chance(0.5)) { g.player.money += 15; return '역마를 내주었다. 석 달 뒤 왕실 인장이 찍힌 어음이 왔다. 은화 열다섯 닢.'; } return '역마를 내주었다. 어음은 끝내 오지 않았다. 대신 역참 이름이 파발꾼들 사이에 돌았다.';
      case 'courier:pay': if (rng.chance(0.5)) { g.player.money += 8; return '파발꾼이 이를 갈며 은화 여덟 닢을 던졌다.'; } st.rep = clamp(st.rep - 5, 0, 100); return '파발꾼은 칼자루를 두드리며 왕명이라고 했다. 결국 말을 내주고 삯은 못 받았다.';
      case 'courier:lie': if (rng.chance(0.4)) { st.rep = clamp(st.rep - 10, 0, 100); deed(g, 'honest', -4, null); return '파발꾼이 마구간 문을 열었다. 말 두 필이 고개를 내밀었다. 그는 말 한 필을 끌고 가며 이 역참 이름을 적었다.'; } return '파발꾼은 욕을 하며 다음 역참으로 달려갔다.';
      case 'thief:guard': deed(g, 'honest', 2, null); st.rep = clamp(st.rep + 2, 0, 100); return '경비대가 젊은이를 끌고 갔다. 나중에 들으니 손목에 낙인이 찍혔다고 한다.';
      case 'thief:scold': deed(g, 'kind', 3, null); return '빵 한 덩이를 쥐여 내쫓았다. 젊은이는 뒤도 안 돌아보고 뛰었다.';
      case 'thief:hire': deed(g, 'kind', 4, null); st.hands += 1; return '마구간 구석에 짚자리를 깔아 주었다. 말을 훔치려던 손이 말을 빗질하는 손이 되었다.';
      case 'buyout:sell': { g.player.money += s.price; const name = st.name; C(g).past.push({ name, place: st.place, since: st.since, y: g.date.year, sold: s.price }); C(g).station = null; logC(g, `역참을 ${HOUSES[s.house].name}에 넘겼다.`); return `은화 ${s.price}닢을 받고 간판을 내렸다. 다음 날 그 자리에 ${HOUSES[s.house].name} 깃발이 올랐다.`; }
      case 'buyout:refuse': C(g).houses[s.house].power += 5; st.rep = clamp(st.rep - 3, 0, 100); return '사람을 돌려보냈다. 그해 가을, 길 건너에 새 역참이 올라가기 시작했다.';
      case 'wedding:host': deed(g, 'generous', 3, null); st.rep = clamp(st.rep + 5, 0, 100); stress(g, -6); return '마구간 다락에서 잤다. 밤새 마당에서 노랫소리가 났다. 신부 어머니가 떠나며 내 손을 오래 쥐었다.';
      default: g.player.money += 10; deed(g, 'generous', -3, null); return '은화 열 닢을 더 받았다. 행렬은 다음 날 아침 일찍, 인사도 없이 떠났다.';
    }
  },
});

/* ---------- 운송 상단과 겨루기 ---------- */
defineScene('carrier_rival', {
  need: (g, s) => !C(g).houses[s.house]?.gone,
  title: (g, s) => HOUSES[s.house].name,
  text: (g, s) => { const [a, b] = s.key.split('|'); return `${J(placeName(a), '과/와')} ${placeName(b)} 사이 길에서 ${J(HOUSES[s.house].name, '이/가')} 내 손님을 가로채기 시작했다. 깃발 단 짐수레 열두 대, "${HOUSES[s.house].motto}". 그쪽 사람이 찾아와 말했다. "이 길은 우리 길이오."`; },
  choices: () => [{ label: '삯을 내려 맞선다', key: 'cut' }, { label: '그쪽 마부로 들어간다', key: 'join' }, { label: '은화 20닢 주고 길을 나눠 쓰기로 한다', key: 'share' }, { label: '밤에 그쪽 수레 축을 톱질한다', key: 'sabotage' }],
  resolve(g, rng, s, key) {
    const h = C(g).houses[s.house], st = C(g);
    if (key === 'cut') { h.power = clamp(h.power - 8, 0, 100); st.cut = { key: s.key, until: mi(g) + 12 }; if (rng.chance(0.4)) { st.thugs = mi(g) + 12; return '삯을 내렸다. 손님이 돌아왔다. 그쪽 우두머리가 길에서 나를 보고 웃었다. 좋은 웃음이 아니었다.'; } return '삯을 내렸다. 한동안 밥값만 벌었다. 그래도 손님들은 내 수레를 기억했다.'; }
    if (key === 'join') { st.hired = s.house; logC(g, `${HOUSES[s.house].name} 마부가 되었다.`); return `${HOUSES[s.house].name} 깃발을 수레에 달았다. 삯은 꼬박꼬박 나온다. 내 수레인데 내 수레 같지 않다.`; }
    if (key === 'share') { pay(g, 20); h.routes = h.routes.filter((r) => r !== s.key); return '은화 스무 닢을 건넸다. 그쪽은 그 길에서 깃발을 거두었다. 다음 해에 또 오겠다고 했다.'; }
    if (rng.chance(0.35)) { deed(g, 'honest', -6, `${g.player.name}, 운송단 수레를 망가뜨리다`); reportCrime(g, 'assault', here(g), { mult: 0.4 }); st.thugs = mi(g) + 18; return '톱질하다 야경꾼 등불에 들켰다. 얼굴을 가리고 달아났지만, 그쪽은 누구인지 안다.'; }
    h.power = clamp(h.power - 18, 0, 100); stress(g, 6); return '이튿날 그쪽 짐수레 셋이 고갯길에서 주저앉았다. 짐이 늦었다는 소문이 돌았다. 아무도 내 쪽을 보지 않았다.';
  },
});

/* ---------- 쇠수레 길이 오면 ---------- */
defineScene('carrier_fade', {
  need: (g) => !!carrierJob(g) || !!C(g).station,
  title: () => '쇠수레가 지나간다',
  text: (g) => `${placeName(here(g))} 성 밖으로 쇠수레 길이 놓였다. 말 없는 수레가 하루에 세 번 짐을 실어 나른다. 역참 마당에 마차가 드물다. 늙은 마부들이 술집에 모여 앉아 쇠수레가 언젠가 터질 거라고 말한다.`,
  choices: (g) => [
    ...(WORK.carter?.places?.includes(here(g)) ? [{ label: '쇠수레 몰이꾼 일을 배운다', key: 'iron' }] : []),
    ...(C(g).station && !C(g).station.inn ? [{ label: '역참을 여관으로 바꾼다', key: 'inn' }] : []),
    { label: '말과 수레로 버틴다', key: 'hold' },
    ...(horses(g).length ? [{ label: '말을 팔고 길 일을 접는다', key: 'quit' }] : []),
  ],
  resolve(g, rng, s, key) {
    const st = C(g);
    if (key === 'iron') { L(g).job = { id: 'carter', place: here(g), months: 0, lastRank: 0 }; logC(g, '쇠수레 몰이꾼이 되었다.'); return '말 대신 마석로 앞에 앉았다. 고삐 대신 쇠 손잡이를 잡았다. 손이 기억하는 것이 하나도 쓸모가 없었다.'; }
    if (key === 'inn') { st.station.inn = true; st.station.name = `${placeName(st.station.place)} 길목 여관`; return '마구간 반을 헐어 방을 들였다. 역마 간판을 내리고 술잔 간판을 걸었다. 쇠수레 손님도 잠은 자야 한다.'; }
    if (key === 'quit') { let n = 0; for (const a of horses(g)) { a.alive = false; a.how = '팔려 갔다'; n += 20; } g.beasts.animals = g.beasts.animals.filter((a) => a.alive); g.player.money += n; st.cart = null; logC(g, '말과 수레를 팔았다.'); return `말을 장터에 내놓았다. 은화 ${n}닢. 마지막으로 갈기를 쓸어 주었다.`; }
    stress(g, 5); return '고삐를 다시 잡았다. 쇠수레 길이 닿지 않는 골짜기와 고개는 아직 말의 길이다.';
  },
});
