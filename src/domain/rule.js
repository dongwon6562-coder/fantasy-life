// 영주로 다스리기: 영지를 받는 길(기사 서임 뒤 하사, 작위 매입), 다스리기·짓기 장면,
// 영지에서 일어나는 일들(재판, 흉년, 도적, 마물, 이웃 영주…), 봉기, 작위 오르기.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { playerAge, gainStat, gainSkill } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check, spend, canSpend, isAdult, traveling, gains, up } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { eraOf, atWar } from '../world.js';
import {
  D, TITLES, NATION_TITLES, TAX_NAMES, LIEGE_NAME, BUILDINGS, domainTitle, domainKind, atDomain, garrisonCap, grantFief, domainTick, rankUpReady,
} from './state.js';
import { queueBattle, BATTLE_OUTS } from '../war/battle.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const word = (v) => (v >= 75 ? '아주 좋다' : v >= 58 ? '좋다' : v >= 42 ? '그럭저럭' : v >= 25 ? '나쁘다' : '위태롭다');
const money = (n) => `은화 ${Math.round(n)}닢`;

export const FIEF_PLACE = 'gruental';
export const TITLE_PRICE = 1000;

/* ---------- 영지를 받는 길 ---------- */
// 1) 정기사 이상이 공을 세우고 이름이 알려지면, 주군이 골짜기 하나를 내린다
function fiefChance(g) {
  if (D(g) || !isAdult(g) || traveling(g)) return 0;
  const life = L(g);
  const k = life.fac.knights;
  if (!k?.member || k.rank < 2 || life.renown < 20 || playerAge(g) < 22) return 0;
  if (life.fiefDeclined && g.date.year - life.fiefDeclined < 5) return 0;
  return 0.02 + (k.rank >= 3 ? 0.02 : 0) + (atWar(g) ? 0.02 : 0) + Math.min(0.03, (life.renown - 20) / 1500);
}

defineScene('fief_grant', {
  title: () => '영지 하사',
  text: (g, s) => {
    const who = s.liege === 'crown' ? '레오니아 국왕의 이름으로 왕실 시종장이' : '베르덴 백작이 성채의 대전에서';
    return `${who} 나를 불렀다. 그간의 공을 치하하며, 하르펜과 베르덴 사이의 골짜기 마을 그륀탈을 기사령으로 내리겠다고 한다. 영민 이백 명 남짓, 낡은 영주관, 녹슨 창을 든 병사 열두 명. 받으면 해마다 공물을 바치고, 부르면 병사를 이끌고 가야 한다.`;
  },
  choices: () => [
    { label: '받고 곧장 그륀탈로 간다', key: 'go' },
    { label: '받되 당분간 집사에게 맡긴다', key: 'stay' },
    { label: '정중히 사양한다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    const life = L(g);
    if (key === 'no') { life.fiefDeclined = g.date.year; return '아직 땅에 묶일 때가 아니라고 말씀드렸다. 대전에 잠시 서늘한 침묵이 흘렀다.'; }
    grantFief(g, { name: PLACES[FIEF_PLACE].name, place: FIEF_PLACE, liege: s.liege }, s.liege === 'crown' ? '왕의 칼을 받았다.' : '백작 앞에 무릎을 꿇고 충성을 맹세했다.');
    if (key === 'go') {
      life.travel = { to: FIEF_PLACE, left: 1, from: life.place };
      return `충성 서약을 마치고 그륀탈로 떠났다. 골짜기 어귀에서 영민들이 모자를 벗고 새 영주를 기다릴 것이다.`;
    }
    return '충성 서약을 마쳤다. 그륀탈은 집사가 맡아 세금을 걷는다. 영주가 없는 영지는 조금씩 샌다는 것을 기억해 두자.';
  },
});

// 2) 왕도에서 작위를 산다. 몰락한 집안의 빈 기사령이 은밀히 팔린다.
ACTIONS.push({
  id: 'buy_title',
  name: '작위 사기',
  icon: 'crown',
  desc: '왕도의 문장원에는 대가 끊긴 기사령이 매물로 나온다. 돈과 이름이 함께 있어야 한다.',
  place: 'leocast',
  available: (g) => isAdult(g) && !traveling(g) && L(g).place === 'leocast' && !D(g) && L(g).renown >= 30 && !sceneQueued(g, 'buy_title'),
  run(g) { queueScene(g, 'buy_title'); return '문장원 서기관에게 은밀히 말을 넣었다.'; },
});

defineScene('buy_title', {
  title: () => '문장원의 매물',
  text: (g) => `서기관이 먼지 쌓인 문서를 펼쳤다. "그륀탈. 대가 끊긴 기사령입니다. 왕실에 ${money(TITLE_PRICE)}을 바치시면 국왕 폐하의 봉신으로 올려 드리지요." 내 돈은 ${money(g.player.money)}이다. 돈으로 산 작위라고 뒤에서 수군거리는 귀족도 있을 것이다.`,
  choices: (g) => [
    ...(canSpend(g, TITLE_PRICE) ? [{ label: `${money(TITLE_PRICE)}을 바치고 작위를 산다`, key: 'buy' }] : []),
    { label: '돌아선다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    if (key !== 'buy' || !spend(g, TITLE_PRICE)) return '문서를 다시 덮게 했다. 땅은 언제든 다시 나온다.';
    const d = grantFief(g, { name: PLACES[FIEF_PLACE].name, place: FIEF_PLACE, liege: 'crown' }, '왕실에 돈을 바치고 봉신이 되었다.');
    d.favor = 42;
    return '봉인된 양피지를 받았다. 이제 나는 그륀탈의 기사령 영주다. 왕도의 오래된 가문들은 아직 나를 장사꾼 보듯 한다.';
  },
});

/* ---------- 다스리기 ---------- */
ACTIONS.push({
  id: 'domain_rule',
  name: '영지 다스리기',
  icon: 'crown',
  desc: '세금을 정하고, 영지를 돌아보고, 병사를 모으고 훈련시킨다.',
  available: (g) => isAdult(g) && atDomain(g) && !sceneQueued(g, 'domain_rule'),
  run(g) { queueScene(g, 'domain_rule'); return '집사가 장부를 들고 왔다.'; },
});

export function domainReport(g) {
  const d = D(g);
  return `${d.name} (${domainKind(d)}). 영민 ${d.pop}명, 민심 ${word(d.morale)}, 치안 ${word(d.order)}. 세금: ${TAX_NAMES[d.tax]}. 병사 ${d.garrison}명(훈련 ${word(d.quality)}). 금고 ${money(d.treasury)}, 지난달 남은 돈 ${money(d.lastIncome)}.${d.liege ? ` ${LIEGE_NAME[d.liege]}의 신임은 ${word(d.favor)}.` : ''}${d.unrest > 10 ? ' 마을에 불온한 소문이 돈다.' : ''}`;
}

defineScene('domain_rule', {
  need: (g) => !!D(g),
  title: (g) => `${D(g).name} 다스리기`,
  text: (g) => domainReport(g),
  choices: (g) => {
    const d = D(g);
    const out = [];
    if (d.tax > 0) out.push({ label: `세금을 내린다 (${TAX_NAMES[d.tax - 1]})`, key: 'tax_down' });
    if (d.tax < 3) out.push({ label: `세금을 올린다 (${TAX_NAMES[d.tax + 1]})`, key: 'tax_up' });
    out.push({ label: '영지를 돌며 영민의 말을 듣는다', key: 'tour' });
    if (d.garrison < garrisonCap(d) && d.treasury >= 30) out.push({ label: '병사를 모은다 (금고 은화 30닢)', key: 'recruit' });
    if (d.garrison > 0 && d.treasury >= 15 && d.quality < 90) out.push({ label: '병사를 훈련시킨다 (금고 은화 15닢)', key: 'train' });
    if (d.treasury >= 20) out.push({ label: `금고에서 ${money(Math.floor(d.treasury / 2))}을 꺼낸다`, key: 'take' });
    if (g.player.money >= 50) out.push({ label: '내 돈 은화 50닢을 금고에 넣는다', key: 'give' });
    out.push({ label: '장부를 덮는다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const d = D(g);
    if (!d) return '';
    tired(g, 5);
    if (key === 'tax_down') { d.tax -= 1; d.morale = clamp(d.morale + 3, 0, 100); return `${TAX_NAMES[d.tax]}으로 내린다고 포고했다. 장터에서 누군가 내 이름을 부르며 잔을 들었다.`; }
    if (key === 'tax_up') { d.tax += 1; d.morale = clamp(d.morale - 4, 0, 100); return `${TAX_NAMES[d.tax]}으로 올렸다. 세리가 돌기 시작하자 집집마다 문이 닫혔다.`; }
    if (key === 'tour') {
      tired(g, 10);
      const c = gainStat(g, 'cha', 0.6), w = gainSkill(g, 'letters', 0.4, 'int');
      const ok = check(rng, g.player.stats.cha + g.player.stats.int / 2, 50);
      d.morale = clamp(d.morale + (ok ? 5 : 2), 0, 100);
      d.order = clamp(d.order + 3, 0, 100);
      const line = rng.pick([
        '방앗간 주인은 물레바퀴 축이 썩었다고 했고, 과부 셋은 남편 없이 밭을 갈 손이 없다고 했다.',
        '밤에 술집에 들러 사람들의 이야기를 들었다. 영주가 술값을 냈다는 소문은 사흘 만에 골짜기 끝까지 퍼졌다.',
        '경계석을 따라 걸었다. 이웃 영지 쪽 돌 하나가 한 뼘 옮겨져 있었다.',
        '세리의 장부와 농부들의 말을 맞춰 보았다. 몇 군데 숫자가 맞지 않았다.',
      ]);
      return `${line}${ok ? ' 영민들이 영주를 조금 더 믿게 되었다.' : ''}${gains([up('매력', c), up('학문', w)])}`;
    }
    if (key === 'recruit') {
      const n = Math.min(garrisonCap(d) - d.garrison, rng.int(8, 12));
      d.treasury -= 30; d.garrison += n;
      d.quality = Math.round((d.quality * (d.garrison - n) + 20 * n) / Math.max(1, d.garrison));
      return `골짜기의 젊은이 ${n}명에게 창과 가죽 갑옷을 내주었다. 아직 창을 쥐는 법도 서툴다.`;
    }
    if (key === 'train') {
      d.treasury -= 15; d.quality = clamp(d.quality + rng.int(4, 7) + Math.round(g.player.skills.sword / 25), 0, 95);
      gainSkill(g, 'sword', 0.4, 'str');
      return '병사들을 들판에 세우고 대열 짓기를 반복시켰다. 해가 질 무렵에는 창끝이 제법 가지런했다.';
    }
    if (key === 'take') {
      const n = Math.floor(d.treasury / 2);
      d.treasury -= n; g.player.money += n;
      if (d.treasury < 20) d.morale = clamp(d.morale - 2, 0, 100);
      return `금고에서 ${money(n)}을 꺼냈다. 집사가 말없이 장부에 적었다.`;
    }
    if (key === 'give') { if (g.player.money < 50) return '주머니를 뒤져 보니 돈이 모자랐다.'; g.player.money -= 50; d.treasury += 50; return '내 주머니에서 은화 50닢을 금고에 넣었다.'; }
    return '오늘은 장부를 덮었다.';
  },
});

/* ---------- 짓기 ---------- */
ACTIONS.push({
  id: 'domain_build',
  name: '영지에 짓기',
  icon: 'labor',
  desc: '영주관을 고치고, 물방아와 예배당, 성벽과 장터를 짓는다.',
  available: (g) => isAdult(g) && atDomain(g) && !sceneQueued(g, 'domain_build') && buildable(g).length > 0,
  run(g) { queueScene(g, 'domain_build'); return '목수와 석공 우두머리를 불렀다.'; },
});

export const buildCost = (g, id) => Math.round(BUILDINGS[id].cost * (D(g).cheap?.[id] ?? 1));
export function buildable(g) {
  const d = D(g);
  if (!d) return [];
  return Object.keys(BUILDINGS).filter((id) => !d.buildings[id] && (BUILDINGS[id].era ?? 0) <= eraOf(g));
}
export function build(g, id) {
  const d = D(g);
  const cost = buildCost(g, id);
  const fromT = Math.min(Math.max(0, d.treasury), cost);
  if (fromT + g.player.money < cost) return false;
  d.treasury -= fromT; g.player.money -= cost - fromT;
  d.buildings[id] = g.date.year;
  if (id === 'chapel') d.morale = clamp(d.morale + 4, 0, 100);
  if (id === 'wall') d.order = clamp(d.order + 6, 0, 100);
  note(g, `${d.name}에 ${J(BUILDINGS[id].name, '을/를')} 지었다.`);
  return true;
}

defineScene('domain_build', {
  need: (g) => !!D(g),
  title: (g) => `${D(g).name}에 무엇을 지을까`,
  text: (g) => `금고 ${money(D(g).treasury)}, 내 돈 ${money(g.player.money)}. 금고가 모자라면 내 돈으로 메운다. ${buildable(g).map((id) => `${BUILDINGS[id].name}(${money(buildCost(g, id))}): ${BUILDINGS[id].desc}`).join(' ')}`,
  choices: (g) => [
    ...buildable(g).filter((id) => Math.max(0, D(g).treasury) + g.player.money >= buildCost(g, id)).map((id) => ({ label: `${BUILDINGS[id].name} (${money(buildCost(g, id))})`, key: id })),
    { label: '아직은 짓지 않는다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    if (!BUILDINGS[key] || !D(g)) return '설계도를 접어 두었다.';
    if (!build(g, key)) return `${J(BUILDINGS[key].name, '을/를')} 지을 돈이 모자란다. 석공 우두머리가 모자를 쓰고 돌아갔다.`;
    tired(g, 8);
    return rng.pick([
      `영민들이 부역을 나와 돌을 날랐다. 계절이 바뀔 무렵 ${J(BUILDINGS[key].name, '이/가')} 섰다.`,
      `${J(BUILDINGS[key].name, '이/가')} 완공되었다. 첫날 영민들이 구경을 나와 오래 서성였다.`,
    ]);
  },
});

/* ---------- 영지에서 일어나는 일 ---------- */
// { id, cond(g, d), title, text(g, d, s), choices(g, d, s), resolve(g, rng, d, key, s), prep?(g, rng, d) }
export const DOMAIN_EVENTS = [];
const ev = (e) => DOMAIN_EVENTS.push(e);

ev({
  id: 'water', title: '물싸움 재판',
  text: () => '가뭄이 들자 윗마을이 개울을 막았다. 아랫마을 사내들이 낫을 들고 몰려왔다가 영주의 판결을 받겠다며 대전 앞에 섰다.',
  choices: () => [{ label: '윗마을 편을 든다. 물은 먼저 닿는 쪽 것이다', key: 'up' }, { label: '아랫마을 편을 든다. 막은 둑을 헐게 한다', key: 'down' }, { label: '날을 나눠 물을 대게 하고, 어기면 벌한다', key: 'split' }],
  resolve(g, rng, d, key) {
    if (key === 'split') {
      if (check(rng, g.player.stats.int + g.player.stats.cha / 2, 55)) { d.order += 5; d.morale += 4; return '양쪽 촌장에게 날짜를 새긴 막대를 나눠 주었다. 투덜거렸지만 낫은 내려놓았다. 판결이 공정했다는 말이 돌았다.'; }
      d.order -= 3; return '날을 나눴지만 밤마다 누군가 둑을 몰래 텄다. 결국 주먹다짐이 났다.';
    }
    d.morale += 1; d.order -= 2;
    return key === 'up' ? '윗마을 촌장이 고개를 숙였다. 아랫마을 사람들은 말없이 돌아갔고, 그해 아랫마을 밀밭은 누렇게 탔다.' : '둑을 헐게 했다. 윗마을 사람들은 영주가 아랫마을 출신 집사의 말만 듣는다고 수군거렸다.';
  },
});

ev({
  id: 'famine_plea', title: '흉년의 탄원', cond: (g) => !!g.world?.famine || (g.realm?.bread ?? 1) > 1.25,
  text: (g, d) => `밀값이 치솟았다. 촌장들이 영주관 앞에 무릎을 꿇었다. 영주의 곳간을 열어 달라고, 아니면 올해 세금을 깎아 달라고. 금고에는 ${money(d.treasury)}이 있다.`,
  choices: (g, d) => [...(d.treasury >= 40 ? [{ label: '곳간을 연다 (금고 은화 40닢)', key: 'open' }] : []), { label: '올해 세금을 한 단계 내린다', key: 'tax' }, { label: '거절한다. 다들 힘든 해다', key: 'no' }],
  resolve(g, rng, d, key) {
    if (key === 'open') { d.treasury -= 40; d.morale += 12; d.unrest = Math.max(0, d.unrest - 5); return '곳간 문을 열었다. 줄을 선 아이들의 손에 빵이 쥐어졌다. 그 겨울 그륀탈에서는 굶어 죽은 사람이 없었다.'; }
    if (key === 'tax') { d.tax = Math.max(0, d.tax - 1); d.morale += 7; return '세금을 내렸다. 금고는 가벼워지겠지만, 영민들은 봄까지 버틸 것이다.'; }
    d.morale -= 10; d.unrest += 5; return '탄원을 물리쳤다. 그날 밤 영주관 담에 누군가 숯으로 욕을 써 놓았다.';
  },
});

ev({
  id: 'bandits', title: '길목의 도적 떼',
  prep: (g, rng) => ({ troops: rng.int(12, 30) }),
  text: (g, d, s) => `하르펜으로 가는 길목에 도적 떼 ${s.troops}명 남짓이 자리를 잡았다. 장꾼들이 털리고, 외딴 농가 하나가 불탔다. 우두머리는 은화를 내면 영지는 건드리지 않겠다는 전갈을 보냈다.`,
  battle: true,
  choices: (g, d) => [{ label: '병사를 이끌고 소탕한다', key: 'fight' }, ...(d.treasury >= 30 ? [{ label: '은화 30닢을 주고 달랜다', key: 'pay' }] : []), { label: '내버려 둔다', key: 'ignore' }],
  resolve(g, rng, d, key, s) {
    if (key === 'fight') { queueBattle(g, { title: '도적 소탕', intro: '숲 가장자리 폐가에 도적들의 연기가 피어올랐다.', enemy: { key: 'bandits', troops: s.troops }, context: 'defense', reward: { treasury: rng.int(15, 40), renown: 2 } }, { first: true }); return '병사들에게 창을 들게 했다. 다음 달 동이 트면 숲으로 간다.'; }
    if (key === 'pay') { d.treasury -= 30; d.order -= 4; return '은화 자루를 보냈다. 도적들은 떠났지만, 그륀탈이 돈을 내는 땅이라는 소문도 함께 퍼졌다.'; }
    d.order -= 10; d.morale -= 4; return '병사가 모자라 손을 쓰지 않았다. 장꾼들이 그륀탈을 피해 돌아가기 시작했다.';
  },
});

ev({
  id: 'monsters', title: '마물의 흔적', cond: (g) => (g.realm?.monsters ?? 30) > 25,
  prep: (g, rng) => ({ troops: rng.int(8, 20) + Math.round((g.realm?.monsters ?? 30) / 6) }),
  text: (g, d, s) => `양 우리가 통째로 찢겨 나갔다. 사냥꾼이 숲에서 사람 머리만 한 발자국을 보았다고 한다. 회색 산맥에서 내려온 마물 ${s.troops}마리 남짓이 골짜기를 돌고 있다.`,
  choices: (g, d) => [{ label: '병사를 이끌고 사냥에 나선다', key: 'fight' }, ...(d.treasury >= 50 ? [{ label: '모험가 길드에 의뢰한다 (금고 은화 50닢)', key: 'guild' }] : []), { label: '마을에 울타리를 치고 버틴다', key: 'hold' }],
  resolve(g, rng, d, key, s) {
    if (key === 'fight') { queueBattle(g, { title: '마물 사냥', intro: '안개 낀 숲에서 짐승의 울음이 메아리쳤다.', enemy: { key: 'monsters', troops: s.troops }, context: 'defense', reward: { treasury: rng.int(10, 30), renown: 3 } }, { first: true }); return '횃불과 창을 모았다. 다음 달 숲으로 들어간다.'; }
    if (key === 'guild') { d.treasury -= 50; d.order += 2; return '하르펜 길드에서 C급 파티가 왔다. 열흘 뒤 그들은 마물의 이빨을 자루에 담아 돌아갔다.'; }
    d.pop -= rng.int(2, 6); d.morale -= 5; return '울타리를 높였지만, 밭에 나갔던 몇 사람이 돌아오지 않았다.';
  },
});

ev({
  id: 'preacher', title: '떠돌이 설교자',
  text: () => '맨발의 설교자가 장터에서 외친다. 성광교 사제들은 썩었고, 영주의 세금은 신의 뜻이 아니라고. 사람들이 점점 모여든다. 하르펜 성당에서는 그를 이단으로 넘기라는 편지가 왔다.',
  choices: () => [{ label: '붙잡아 성당에 넘긴다', key: 'seize' }, { label: '영지 밖으로 쫓아낸다', key: 'expel' }, { label: '말하게 둔다', key: 'let' }],
  resolve(g, rng, d, key) {
    if (key === 'seize') { d.order += 4; d.morale -= 5; L(g).fac.church && (L(g).fac.church.merit = (L(g).fac.church.merit ?? 0) + 8); return '병사들이 설교자를 묶어 하르펜으로 보냈다. 그가 끌려가며 부르던 노래를 아이들이 몰래 따라 불렀다.'; }
    if (key === 'expel') { d.order += 1; d.morale -= 1; return '설교자를 골짜기 밖까지 데려다주었다. 그는 뒤돌아 영주를 위해 기도하겠다고 말했다. 비꼬는 건지는 알 수 없었다.'; }
    d.morale += 3; d.order -= 4; d.unrest += 3; return '그냥 두었다. 설교를 들은 농부들이 세리에게 대들기 시작했다.';
  },
});

ev({
  id: 'charter', title: '장터 특허', cond: (g, d) => !d.buildings.market,
  text: () => '은저울 상단의 대리인이 찾아왔다. 그륀탈에 정기 장을 열 특허를 내주면, 특허료를 먼저 바치고 장터 짓는 값도 일부 대겠다고 한다. 대신 장세의 일부는 상단이 가져간다.',
  choices: () => [{ label: '특허를 내준다', key: 'yes' }, { label: '거절한다. 장터는 영주가 연다', key: 'no' }],
  resolve(g, rng, d, key) {
    if (key === 'yes') { d.treasury += 60; d.cheap = { ...(d.cheap ?? {}), market: 0.5 }; return '특허장에 인장을 찍었다. 상단이 은화 60닢을 바쳤고, 장터를 지을 때 절반을 대기로 했다.'; }
    return '대리인은 웃으며 물러났다. 은저울 상단은 거절을 오래 기억하는 곳이다.';
  },
});

ev({
  id: 'boundary', title: '옮겨진 경계석', cond: (g, d) => !d.nation,
  prep: (g, rng) => ({ troops: rng.int(20, 45) }),
  text: (g, d, s) => `이웃 영주가 밤사이 경계석을 개울 이쪽으로 옮겼다. 그쪽 사병 ${s.troops}명이 새 경계에 말뚝을 박고 있다. 그 땅에는 그륀탈 농가 다섯 채가 있다.`,
  choices: (g, d) => [{ label: '병사를 이끌고 말뚝을 뽑는다', key: 'fight' }, ...(d.liege ? [{ label: `${LIEGE_NAME[d.liege]}에게 호소한다`, key: 'appeal' }] : []), { label: '양보한다', key: 'yield' }],
  resolve(g, rng, d, key, s) {
    if (key === 'fight') { queueBattle(g, { title: '경계 다툼', intro: '개울가 들판에서 두 영지의 깃발이 마주 섰다.', enemy: { key: 'neighbor', troops: s.troops }, context: 'border', reward: { renown: 3 } }, { first: true }); return '경고를 보냈다. 다음 달, 개울가에서 결판을 낸다.'; }
    if (key === 'appeal') {
      if (rng.chance(d.favor / 110)) { d.favor -= 3; d.order += 3; return `${LIEGE_NAME[d.liege]}의 판관이 와서 경계석을 제자리로 돌려놓았다. 주군에게 빚을 하나 졌다.`; }
      d.pop -= 8; d.favor -= 2; return '판관은 이웃 영주와 오래 술을 마시더니, 옛 지도가 애매하다며 그쪽 손을 들어 주었다.';
    }
    d.pop -= 10; d.morale -= 6; return '땅을 내주었다. 농가 다섯 채의 사람들은 이웃 영주의 세금을 내게 되었다.';
  },
});

ev({
  id: 'runaways', title: '도망 농노들', cond: (g, d) => !!d.liege || d.nation,
  text: () => '눈 덮인 고개를 넘어 굶주린 가족 열댓이 왔다. 이웃 영지의 농노들이다. 주인이 가혹하다고, 받아 주면 무엇이든 하겠다고 한다. 뒤따라온 이웃 영주의 사자는 돌려보내라고 요구한다.',
  choices: () => [{ label: '받아 준다', key: 'take' }, { label: '돌려보낸다', key: 'send' }],
  resolve(g, rng, d, key) {
    if (key === 'take') { d.pop += rng.int(12, 20); d.morale += 2; d.favor -= 4; return '빈 농가를 내주었다. 이웃 영주는 이 일을 잊지 않겠다는 편지를 보냈다.'; }
    d.morale -= 3; d.favor += 2; return '사자에게 그들을 넘겼다. 아이를 업은 여자가 뒤돌아보던 얼굴이 오래 남았다.';
  },
});

ev({
  id: 'workshop', title: '마도구 기술자', cond: (g, d) => eraOf(g) >= 1 && !d.buildings.workshop,
  text: () => '왕도 마탑에서 쫓겨났다는 기술자가 찾아왔다. 마석으로 도는 방아와 풀무를 놓을 줄 안다고 한다. 공방을 지어 주면 반값에 해 주겠다고.',
  choices: (g, d) => [...(d.treasury + g.player.money >= 160 ? [{ label: '맡긴다 (은화 160닢)', key: 'yes' }] : []), { label: '못 믿겠다', key: 'no' }],
  resolve(g, rng, d, key) {
    if (key === 'yes') {
      d.cheap = { ...(d.cheap ?? {}), workshop: 0.5 };
      if (build(g, 'workshop')) return '공방 굴뚝에서 푸른 연기가 올랐다. 영민들은 처음엔 무서워했지만, 곧 마석 방아 앞에 줄을 섰다.';
      return '돈이 모자라 일을 시작하지 못했다.';
    }
    return '기술자는 남쪽 영지로 떠났다. 몇 해 뒤 그 영지가 부자가 되었다는 소문이 들렸다.';
  },
});

ev({
  id: 'steward', title: '집사의 장부', cond: (g, d) => d.treasury > 60,
  prep: (g, rng, d) => ({ lost: Math.round(d.treasury * rng.float(0.1, 0.2)) }),
  text: (g, d, s) => `장부를 맞춰 보다 숫자가 어긋난 것을 찾았다. 지난 몇 해 동안 집사가 ${money(s.lost)} 남짓을 빼돌렸다. 그는 아버지 대부터 이 영주관을 지켜 온 늙은이다.`,
  choices: () => [{ label: '목을 매단다', key: 'hang' }, { label: '내쫓고 재산을 거둔다', key: 'fire' }, { label: '용서하고 갚게 한다', key: 'forgive' }],
  resolve(g, rng, d, key, s) {
    if (key === 'hang') { d.order += 6; d.morale -= 4; d.treasury += Math.round(s.lost / 2); L(g).notoriety += 2; return '광장에 교수대를 세웠다. 아무도 영주의 장부를 다시 속이려 하지 않을 것이다. 아무도 영주를 다시 편히 보지도 않을 것이다.'; }
    if (key === 'fire') { d.treasury += Math.round(s.lost * 0.6); d.order += 2; return '집사를 내쫓고 그의 집과 밭을 거뒀다. 새 집사는 장부를 두 번씩 맞춘다.'; }
    d.treasury += Math.round(s.lost * 0.3); d.morale += 2; d.order -= 2; return '늙은 집사가 울며 무릎을 꿇었다. 갚겠다고 했지만, 다 갚기 전에 죽을 것이다.';
  },
});

ev({
  id: 'plague', title: '역병', cond: (g) => !!g.world?.plague,
  text: (g, d) => `골짜기 아랫마을에서 열병이 돌기 시작했다. ${d.buildings.chapel ? '예배당 사제가 환자를 돌보겠다고 나섰다.' : '돌볼 사제도 없다.'} 마을을 막으면 병은 덜 퍼지겠지만, 그 안의 사람들은 굶는다.`,
  choices: () => [{ label: '아랫마을을 막는다', key: 'seal' }, { label: '약초꾼과 사제를 보내고 금고를 연다 (은화 30닢)', key: 'care' }, { label: '하늘에 맡긴다', key: 'none' }],
  resolve(g, rng, d, key) {
    if (key === 'seal') { d.pop -= rng.int(4, 10); d.morale -= 6; d.order += 2; return '병사들이 아랫마을 길을 막았다. 병은 골짜기 위로 번지지 않았다. 막힌 쪽에서는 밤마다 곡소리가 들렸다.'; }
    if (key === 'care') { d.treasury -= 30; d.pop -= rng.int(2, 6); d.morale += 6; return '약초꾼들이 집집마다 쑥을 태웠다. 죽은 이도 있었지만, 영주가 버리지 않았다는 것은 모두가 기억했다.'; }
    d.pop -= rng.int(8, 18); d.morale -= 3; return '병은 제 길을 갔다. 무덤이 늘었다.';
  },
});

ev({
  id: 'feast', title: '영민의 혼례',
  text: () => '대장장이 아들과 방앗간 딸이 혼례를 올린다. 영주님이 오시면 골짜기 전체의 자랑이 될 거라며 촌장이 조심스레 청한다.',
  choices: (g) => [{ label: '참석해 축배를 든다', key: 'go' }, ...(g.player.money >= 10 ? [{ label: '은화 10닢을 선물로 보낸다', key: 'gift' }] : []), { label: '바쁘다고 사양한다', key: 'no' }],
  resolve(g, rng, d, key) {
    if (key === 'go') { d.morale += 4; stress(g, -8); return '밤늦도록 춤과 노래가 이어졌다. 신랑 아버지가 영주에게 술을 따르며 눈시울을 붉혔다.'; }
    if (key === 'gift') { if (g.player.money < 10) return '주머니를 뒤져 보니 돈이 모자랐다.'; g.player.money -= 10; d.morale += 2; return '은화를 보냈다. 신부가 영주관 문 앞에 들꽃 한 다발을 두고 갔다.'; }
    d.morale -= 1; return '사양했다. 촌장은 이해한다고 했지만, 얼굴은 그렇지 않았다.';
  },
});

const evById = (id) => DOMAIN_EVENTS.find((e) => e.id === id);

defineScene('domain_event', {
  need: (g) => !!D(g),
  title: (g, s) => evById(s.ev)?.title ?? '영지의 일',
  text: (g, s) => evById(s.ev)?.text(g, D(g), s) ?? '영지에 작은 일이 있었다.',
  choices: (g, s) => (D(g) && evById(s.ev) ? evById(s.ev).choices(g, D(g), s) : []),
  resolve(g, rng, s, key) {
    const d = D(g);
    if (!d || !evById(s.ev)) return '영지의 일은 저절로 가라앉았다.';
    const out = evById(s.ev).resolve(g, rng, d, key, s);
    tidy(d);
    return out;
  },
});

export function tidy(d) {
  d.morale = clamp(d.morale, 0, 100); d.order = clamp(d.order, 0, 100); d.favor = clamp(d.favor, 0, 100);
  d.unrest = clamp(d.unrest, 0, 30); d.pop = Math.max(30, Math.round(d.pop)); d.treasury = Math.round(d.treasury * 10) / 10;
}

export function queueDomainEvent(g, rng, id) {
  const d = D(g);
  const pool = DOMAIN_EVENTS.filter((e) => (!id || e.id === id) && (e.cond?.(g, d) ?? true) && e.id !== d.lastEv);
  const e = id ? pool[0] : rng.pick(pool);
  if (!e) return false;
  d.lastEv = e.id;
  queueScene(g, 'domain_event', { ev: e.id, ...(e.prep?.(g, rng, d) ?? {}) });
  return true;
}

/* ---------- 전투 결과: 방어, 경계, 봉기 ---------- */
BATTLE_OUTS.defense = {
  win: (g, rng, s) => { const d = D(g); if (!d) return ''; d.order = clamp(d.order + 8, 0, 100); d.morale = clamp(d.morale + 4, 0, 100); return '영민들이 돌아오는 병사들에게 빵과 맥주를 내왔다.'; },
  lose: (g, rng, s) => { const d = D(g); if (!d) return ''; const loot = Math.round(Math.max(0, d.treasury) * 0.3); d.treasury -= loot; d.pop = Math.max(30, d.pop - rng.int(5, 15)); d.order = clamp(d.order - 10, 0, 100); return `적이 마을을 휩쓸었다. 금고에서 ${money(loot)}이 털리고 농가 몇 채가 불탔다.`; },
  draw: (g) => { const d = D(g); if (d) d.order = clamp(d.order - 2, 0, 100); return '적은 물러났지만 다시 올 것이다.'; },
  other: () => '싸울 병사가 없었다. 문을 걸어 잠그고 지나가기를 기다렸다.',
};
BATTLE_OUTS.border = {
  win: (g, rng) => { const d = D(g); if (!d) return ''; d.pop += rng.int(10, 25); d.order = clamp(d.order + 5, 0, 100); return '경계석을 제자리로 옮기고, 덤으로 개울 건너 풀밭까지 차지했다. 이웃 영주는 주군에게 하소연하러 갔다.'; },
  lose: (g, rng) => { const d = D(g); if (!d) return ''; d.pop = Math.max(30, d.pop - rng.int(15, 30)); d.favor = clamp(d.favor - 5, 0, 100); return '개울 이쪽 땅을 잃었다. 주군은 사사로운 싸움을 벌였다며 혀를 찼다.'; },
  draw: () => '양쪽 모두 물러났다. 경계석은 개울 한가운데 덩그러니 남았다.',
  other: (g) => { const d = D(g); if (d) d.pop = Math.max(30, d.pop - 10); return '싸울 병사가 없어 땅을 내주었다.'; },
};
BATTLE_OUTS.revolt = {
  win: (g, rng) => { const d = D(g); if (!d) return ''; d.unrest = 0; d.order = clamp(d.order + 10, 0, 100); d.morale = clamp(d.morale - 6, 0, 100); d.pop = Math.max(30, d.pop - rng.int(5, 15)); L(g).notoriety += 3; return '봉기는 꺾였다. 우두머리들의 목이 영주관 문 앞에 걸렸다. 영민들은 다시 고개를 숙였지만, 눈빛까지 숙이지는 않았다.'; },
  lose: (g) => { const d = D(g); if (!d) return ''; d.tax = 0; d.unrest = 5; d.treasury = Math.round(d.treasury / 2); d.favor = clamp(d.favor - 10, 0, 100); return '영주관이 포위되었다. 결국 세금을 가장 가볍게 하겠다는 문서에 인장을 찍고서야 농민들이 물러났다. 소식을 들은 주군이 크게 노했다.'; },
  draw: (g) => { const d = D(g); if (d) d.unrest = 12; return '농민들은 숲으로 물러나 버티고 있다.'; },
  other: (g, rng, s, key) => {
    const d = D(g);
    if (!d) return '';
    if (key === 'concede') { d.tax = 0; d.unrest = 0; d.morale = clamp(d.morale + 10, 0, 100); d.favor = clamp(d.favor - 5, 0, 100); return '우두머리들을 대전으로 불러 요구를 들었다. 세금을 내리고 세리 하나를 내쫓았다. 농민들은 낫을 내려놓고 밭으로 돌아갔다.'; }
    return BATTLE_OUTS.revolt.lose(g, rng, s);
  },
};

/* ---------- 작위 오르기 ---------- */
defineScene('domain_rank', {
  need: (g) => !!D(g),
  title: () => '작위',
  text: (g, s) => {
    const d = D(g);
    if (d.nation) return `${J(d.name, '은/는')} 이제 개척지라 부르기엔 커졌다. 영민 ${d.pop}명, 주변 부족과 떠돌이 기사들이 내 깃발 아래 모인다. 스스로 ${NATION_TITLES[s.to]}의 이름을 내걸 때가 되었다.`;
    return `${LIEGE_NAME[d.liege]}의 사자가 왔다. ${J(d.name, '이/가')} 번성했고 그대의 이름이 높으니, ${TITLES[s.to]}의 작위를 내리겠다고 한다. 서임식에는 은화 ${s.fee}닢의 예물이 든다.`;
  },
  choices: (g, s) => {
    const d = D(g);
    const can = d.nation || d.treasury + g.player.money >= s.fee;
    return [...(can ? [{ label: d.nation ? `${J(NATION_TITLES[s.to], '을/를')} 칭한다` : '작위를 받는다', key: 'yes' }] : []), { label: '아직 때가 아니다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const d = D(g);
    if (!d) return '';
    if (key !== 'yes') { d.rankWait = g.date.year; return '사양했다. 다음 기회는 몇 해 뒤에나 올 것이다.'; }
    if (!d.nation) { const fromT = Math.min(Math.max(0, d.treasury), s.fee); d.treasury -= fromT; g.player.money = Math.max(0, g.player.money - (s.fee - fromT)); }
    d.rank = s.to;
    L(g).renown += 5 + s.to * 3;
    chron(g, `${g.player.name}, ${J(domainTitle(g), '이/가')} 되다. 영지는 ${d.name} ${domainKind(d)}.`);
    note(g, `${J(domainTitle(g), '이/가')} 되었다.`);
    return d.nation
      ? `광장에 깃발을 올리고 ${J(NATION_TITLES[s.to], '을/를')} 칭했다. 이웃의 왕들이 사신을 보낼지, 군대를 보낼지는 이제부터다.`
      : `무릎을 꿇자 주군의 칼끝이 어깨에 닿았다. 이제 나는 ${d.name}의 ${TITLES[s.to]}이다. 문장에 새 관이 하나 얹혔다.`;
  },
});

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const life = L(g);
  // 영지 하사
  if (!D(g)) {
    if (rng.chance(fiefChance(g)) && !sceneQueued(g, 'fief_grant')) queueScene(g, 'fief_grant', { liege: life.fac.knights.order === 'leocast' ? 'crown' : 'verden' });
    return;
  }
  const d = D(g);
  if (d.regent && playerAge(g) >= 15) { d.regent = false; g.news.unshift({ text: `${d.name}의 섭정이 끝났다. 이제 영주가 직접 다스린다.`, rel: 100 }); }
  for (const t of domainTick(g, rng)) g.news.unshift({ text: t, rel: 90 });
  const present = atDomain(g);
  // 봉기
  if (d.unrest >= 20 && !sceneQueued(g, 'battle')) {
    if (present && isAdult(g)) {
      queueBattle(g, { title: '농민 봉기', intro: `${d.name}의 농민들이 낫과 쇠스랑을 들고 일어났다. 무거운 세금과 굶주림이 끝내 터졌다.`, enemy: { key: 'rebels', troops: Math.round(d.pop * 0.12) }, context: 'revolt', extra: [{ label: '우두머리를 불러 요구를 들어준다', key: 'concede' }], reward: { renown: 0 } }, { first: true });
      d.unrest = 15;
    } else {
      const lost = Math.min(d.garrison, Math.round(d.garrison * 0.3));
      d.garrison -= lost; d.order = clamp(d.order - 15, 0, 100); d.treasury = Math.round(d.treasury * 0.6); d.unrest = 8; d.tax = Math.max(0, d.tax - 1);
      g.news.unshift({ text: `${d.name}에서 봉기가 일어났다. 집사가 병사 ${lost}명을 잃고 세금을 내려 겨우 달랬다는 전갈이 왔다.`, rel: 100 });
    }
    return;
  }
  // 작위
  const n = rankUpReady(g);
  if (n && !sceneQueued(g, 'domain_rank') && !(d.rankWait && g.date.year - d.rankWait < 3) && isAdult(g) && !traveling(g)) {
    queueScene(g, 'domain_rank', { to: n, fee: [0, 150, 300, 600][n] });
    return;
  }
  // 영지의 일
  if (present && isAdult(g) && !sceneQueued(g, 'domain_event') && rng.chance(0.16)) queueDomainEvent(g, rng);
  else if (!present && rng.chance(0.05) && d.treasury > 40) {
    const lost = Math.round(d.treasury * rng.float(0.05, 0.15));
    d.treasury -= lost;
    g.news.unshift({ text: `${d.name}에서 온 장부의 숫자가 이상하다. 영주가 없는 사이 은화 ${lost}닢이 어디론가 샜다.`, rel: 80 });
  }
});

// 영지 정보를 한 줄로 (화면·다른 모듈용)
export function domainLine(g) {
  const d = D(g);
  if (!d) return null;
  return `${d.name} ${domainTitle(g)} · 영민 ${d.pop} · 민심 ${word(d.morale)} · 치안 ${word(d.order)} · 병사 ${d.garrison} · 금고 ${Math.round(d.treasury)}`;
}
