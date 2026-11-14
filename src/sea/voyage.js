// 배 타기: 항구에서 뱃길로 다른 항구·섬·다른 나라에 간다.
// - 손님으로 타면 뱃삯을 낸다. 뱃일을 거들며 타면 공짜지만 고되다(뱃일이 는다).
// - 바다 위에서는 달마다 일이 생긴다: 폭풍, 해적, 바다 마물, 유령선, 표류자, 바람이 멎음, 순풍.
// - 내 배가 있으면 내 배로 간다(선원 삯은 crew.js). 해적이면 해적은 덤비지 않는다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat } from '../game.js';
import { PLACES, leaveJob, travelMonths } from '../places.js';
import { HOOKS } from '../hooks.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, check, gains, up } from '../adventure/core.js';
import { runFight } from '../adventure/fight.js';
import { MAP_ACTIONS } from '../art/map.js';
import { autosave } from '../save.js';
import { ready } from '../party/core.js';
import { S, isPort, seaRoutesFrom, seaFare, atSea, sailing } from './core.js';

const fight = (g, rng, enc, tactic = 'charge') => runFight(g, rng, { enc, reward: {} }, tactic, { short: true });
const won = (r) => r.outcome === 'win' || r.outcome === 'overwhelm';
const withRole = (g, role) => ready(g).find((p) => p.comp.role === role) ?? null;

// 배를 띄운다 (crew.js의 무역 항해도 이것을 쓴다)
export function setSail(g, to, months, { own = false, work = false, cargo = null } = {}) {
  const life = L(g);
  if (life.job && !own) leaveJob(g, `${J(PLACES[to].name, '으로/로')} 가는 배에 오르며 일을 그만두었다.`);
  life.travel = { to, left: months, from: life.place, sea: true, own, work };
  if (cargo) S(g).cargo = cargo;
  S(g).voyages += 1;
  note(g, `${PLACES[life.place].name}에서 ${J(PLACES[to].name, '으로/로')} 가는 배에 올랐다.`);
}

/* ---------- 섬에서 땅길로 떠나게 된 경우 ---------- */
// 다른 갈래(국경에서 돌아서기, 추방 등)가 섬이나 항구에서 땅길로 떠나보내면 길이 없어 99달이 걸린다.
// 그런 길은 뱃길로 바꾼다: 가려던 곳에 뱃길이 있으면 그리로, 없으면 가장 가까운 다른 항구로.
export function fixStrandedTravel(g) {
  const t = L(g).travel;
  if (!t || t.sea || !isPort(t.from) || travelMonths(t.from, t.to) < 99) return false;
  const routes = seaRoutesFrom(g, t.from);
  const direct = routes.find((r) => r.to === t.to);
  const landish = routes.filter((r) => travelMonths(r.to, t.to) < 99).sort((a, b) => a.months + travelMonths(a.to, t.to) - b.months - travelMonths(b.to, t.to));
  const r = direct ?? landish[0] ?? routes[0];
  if (!r) return false;
  L(g).travel = { ...t, to: r.to, left: r.months, sea: true, work: true };
  return true;
}
HOOKS.afterActions.push((g) => { fixStrandedTravel(g); });
HOOKS.actionFilter.unshift((g) => { fixStrandedTravel(g); return true; });

/* ---------- 배 타기 ---------- */
ACTIONS.push({
  id: 'sail',
  name: '배 타기',
  icon: 'ship',
  desc: '항구에서 배를 타고 다른 항구나 섬, 바다 건너 나라로 간다. 바다는 길보다 빠르지만 사납다.',
  available: (g) => isAdult(g) && !traveling(g) && isPort(L(g).place) && !sceneQueued(g, 'sail'),
  run(g) { queueScene(g, 'sail'); return '부두에 나가 떠나는 배를 알아보았다.'; },
});

defineScene('sail', {
  need: (g) => isPort(L(g).place) && !traveling(g),
  title: (g) => `${PLACES[L(g).place].name}의 부두`,
  text: (g, s) => {
    const sh = S(g).ship;
    const routes = seaRoutesFrom(g, L(g).place);
    return `돛대가 늘어선 부두에 짠 바람이 분다. ${routes.length ? `오늘 떠나는 배: ${routes.map((r) => `${PLACES[r.to].name}(${r.months}달)`).join(', ')}.` : '오늘은 떠나는 배가 없다.'} ${sh ? `내 배 ${J(sh.name, '이/가')} 부두에 매여 있다.` : '손님으로 타면 뱃삯을 내고, 뱃일을 거들면 공짜로 태워 준다.'}`;
  },
  choices: (g, s) => {
    const here = L(g).place;
    const routes = seaRoutesFrom(g, here);
    if (s?.to) { const i = routes.findIndex((r) => r.to === s.to); if (i > 0) routes.unshift(...routes.splice(i, 1)); }
    const sh = S(g).ship;
    const out = [];
    for (const r of routes.slice(0, 4)) {
      if (sh) out.push({ label: `내 배로 ${J(PLACES[r.to].name, '으로/로')} (${r.months}달)`, key: `own:${r.to}` });
      else {
        if (g.player.money >= seaFare(r.months)) out.push({ label: `${J(PLACES[r.to].name, '으로/로')} 손님으로 (${r.months}달, 은화 ${seaFare(r.months)}닢)`, key: `pay:${r.to}` });
        out.push({ label: `${J(PLACES[r.to].name, '으로/로')} 뱃일을 거들며 (${r.months}달, 공짜)`, key: `work:${r.to}` });
      }
    }
    out.push({ label: '배를 타지 않는다', key: 'stay' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    if (key === 'stay' || traveling(g)) return '부두를 한 바퀴 돌고 돌아왔다. 바다는 내일도 있다.';
    const [how, to] = key.split(':');
    const r = seaRoutesFrom(g, L(g).place).find((x) => x.to === to);
    if (!r) return '그 배는 이미 떠났다.';
    if (how === 'own') {
      if (!S(g).ship) return '내 배가 부두에 없었다.';
      setSail(g, to, r.months, { own: true });
      return `${J(S(g).ship.name, '이/가')} 닻을 올렸다. 키를 잡고 ${PLACES[to].name} 쪽으로 뱃머리를 돌렸다. ${r.months}달 뱃길이다.`;
    }
    if (how === 'pay') {
      const fare = seaFare(r.months);
      if (g.player.money < fare) return '뱃삯이 모자랐다. 선장은 어깨를 으쓱했다.';
      g.player.money -= fare;
      setSail(g, to, r.months);
      return `뱃삯 은화 ${fare}닢을 치르고 ${J(PLACES[to].name, '으로/로')} 가는 배의 선실 한 칸을 얻었다. 뱃멀미가 벌써 올라온다.`;
    }
    setSail(g, to, r.months, { work: true });
    const hand = sailing(g) >= 50 ? '갑판장이 내 손바닥의 굳은살을 보더니 고개를 끄덕였다. "뱃사람이군. 망대를 맡아 주게."' : sailing(g) >= 20 ? '갑판장이 내 손을 보고 말했다. "밧줄은 좀 잡아 봤군. 타라."' : '갑판장이 내 손바닥을 뒤집어 보더니 웃었다. "밧줄 잡아 본 손은 아니군. 그래도 타라."';
    return `${hand} ${J(PLACES[to].name, '으로/로')} 가는 배의 갑판원이 되었다.`;
  },
});

/* ---------- 바다 위에서 ---------- */
ACTIONS.push({
  id: 'at_sea',
  name: '난간에서 바다를 본다',
  icon: 'wander',
  desc: '물결과 하늘을 읽는다. 뱃사람들의 이야기를 듣는다.',
  available: (g) => atSea(g),
  run(g, rng) {
    tired(g, 5); stress(g, -4);
    const sn = gainStat(g, 'sen', 0.5);
    const k = gainSkill(g, 'sailing', 0.6, 'sen');
    return `${rng.pick([
      '수평선 끝까지 아무것도 없었다. 처음으로 세상이 넓다는 것을 몸으로 알았다.',
      '돌고래 떼가 뱃머리를 따라왔다. 늙은 선원이 좋은 징조라고 했다.',
      '밤하늘의 별을 따라 길을 찾는 법을 항해사에게 배웠다.',
      '선원들이 부르는 뱃노래를 따라 불렀다. 가사의 반은 욕이었다.',
      '바다 밑으로 커다란 그림자가 천천히 지나갔다. 아무도 그 이야기를 하지 않았다.',
      '갈매기가 돛대 꼭대기에 앉았다. 육지가 가깝다는 뜻이라고 했지만, 사흘을 더 갔다.',
    ])}${gains([up('감각', sn), up('뱃일', k)])}`;
  },
});
ACTIONS.push({
  id: 'sea_deck',
  name: '갑판 일을 거든다',
  icon: 'labor',
  desc: '밧줄을 당기고 돛을 고치고 물을 퍼낸다. 고되지만 뱃일이 는다.',
  available: (g) => atSea(g),
  run(g, rng) {
    tired(g, 14);
    const k = gainSkill(g, 'sailing', 1.4, 'agi');
    const st = gainStat(g, 'str', 0.4);
    const pay = !L(g).travel || L(g).travel.work || L(g).travel.own ? 0 : rng.int(0, 2);
    g.player.money += pay;
    return `${rng.pick(['젖은 밧줄에 손바닥이 쓸렸다. 그래도 돛이 바람을 물었다.', '바닥에 고인 물을 밤새 퍼냈다.', '찢어진 돛을 꿰매는 법을 배웠다.', '망대에 올라 수평선을 지켰다. 아래가 까마득했다.'])}${pay ? ` 갑판장이 은화 ${pay}닢을 쥐여 주었다.` : ''}${gains([up('뱃일', k), up('힘', st)])}`;
  },
});

/* ---------- 바다 위의 일 ---------- */
const EVENTS = {
  storm: {
    w: (g) => 3,
    title: '폭풍',
    text: () => '하늘이 검게 내려앉더니 산 같은 파도가 뱃전을 때렸다. 돛대가 비명을 지르고, 누군가 바다에 떨어졌다는 외침이 들린다.',
    choices: (g) => [
      { label: '돛을 줄이고 키를 붙든다', key: 'helm' },
      ...(L(g).travel?.own ? [] : [{ label: '선원들을 도와 물을 퍼낸다', key: 'bail' }]),
      { label: '선실에 웅크려 버틴다', key: 'hide' },
    ],
    resolve(g, rng, s, key) {
      const skill = sailing(g) + (key === 'helm' ? 0 : 15);
      const ok = key === 'hide' ? rng.chance(0.55) : check(rng, skill + g.player.stats.wil / 2, key === 'helm' ? 45 : 35);
      gainSkill(g, 'sailing', 1, 'wil');
      if (ok) { stress(g, 4); return key === 'helm' ? '밤새 키를 붙들었다. 새벽에 바다가 거짓말처럼 잔잔해졌다. 선원들이 나를 다른 눈으로 보았다.' : '살아남았다. 젖은 몸을 떨며 해가 뜨는 것을 보았다.'; }
      const sh = S(g).ship;
      if (sh) sh.hull = Math.max(10, sh.hull - rng.int(10, 25));
      if (S(g).cargo && rng.chance(0.4)) { S(g).cargo.qty = Math.floor(S(g).cargo.qty / 2); }
      if (rng.chance(0.4)) g.player.injuries.push({ name: '돛대에 부딪힌 갈비뼈', months: 2 });
      L(g).travel && (L(g).travel.left += 1);
      stress(g, 10);
      return `폭풍은 배를 장난감처럼 흔들었다.${sh ? ` ${J(sh.name, '이/가')} 크게 상했다.` : ''}${S(g).cargo ? ' 짐칸의 짐 일부가 바다로 쓸려 갔다.' : ''} 항로를 잃어 한 달을 더 헤맸다.`;
    },
  },
  pirates: {
    w: (g) => (S(g).pirate ? 0 : 2.2),
    title: '검은 돛',
    text: (g) => `수평선에 검은 돛이 올랐다. 해적선이 바람을 등지고 다가온다. 뱃전에 갈고리를 든 사내들이 늘어섰다.${S(g).hunted > 20 ? ' 놈들의 깃발을 보니, 나를 노리고 온 것 같다.' : ''}`,
    choices: (g) => [
      { label: '갈고리가 걸리기 전에 맞서 싸운다', key: 'fight' },
      ...(sailing(g) >= 25 || L(g).travel?.own ? [{ label: '바람을 타고 달아난다', key: 'run' }] : []),
      { label: '통행료를 내고 보내 달라고 한다', key: 'pay' },
    ],
    resolve(g, rng, s, key) {
      if (key === 'run') {
        if (check(rng, sailing(g) + (S(g).ship?.speed ?? 0), 50)) { gainSkill(g, 'sailing', 1.2, 'sen'); return '돛을 모두 펴고 바람 속으로 달렸다. 해 질 녘, 검은 돛이 수평선 아래로 가라앉았다.'; }
        key = 'fight';
      }
      if (key === 'pay') {
        const toll = Math.min(g.player.money, Math.round(10 + g.player.money * 0.3));
        g.player.money -= toll;
        const took = !!S(g).cargo && rng.chance(0.5);
        if (took) S(g).cargo = null;
        stress(g, 6);
        if (!toll && !took) { g.player.injuries.push({ name: '해적에게 맞은 멍', months: 1 }); return '내놓을 것이 없었다. 해적들은 나를 실컷 두들겨 패고 침을 뱉고 돌아갔다.'; }
        return `${toll ? `은화 ${toll}닢이 든 주머니를 던져 주었다.` : '주머니는 비어 있었다.'}${took ? ' 놈들은 짐칸의 짐까지 털어 갔다.' : ''} 해적 선장이 모자를 벗어 보이고 돌아갔다.`;
      }
      const r = fight(g, rng, { unit: 'pirate', count: rng.int(3, 5), leader: rng.chance(0.5) ? 'pirate_captain' : null });
      if (won(r)) { const loot = rng.int(5, 25); g.player.money += loot; L(g).renown += 2; return `${r.text} 해적선의 금고에서 은화 ${loot}닢이 나왔다.`; }
      if (S(g).cargo) S(g).cargo = null;
      return `${r.text}${S(g).ship ? ' 짐칸을 몽땅 털렸다.' : ''}`;
    },
  },
  serpent: {
    w: (g) => 1.2,
    title: '바다 밑의 그림자',
    text: () => '물빛이 갑자기 어두워졌다. 배 밑을 무언가 길고 거대한 것이 감고 지나간다. 뱃전 너머로 집채만 한 머리가 솟았다. 심해 뱀이다.',
    choices: (g) => [
      { label: '작살을 들고 맞선다', key: 'fight' },
      ...(withRole(g, 'mage') || g.player.skills.magic >= 30 ? [{ label: '마법으로 쫓아낸다', key: 'magic' }] : []),
      { label: '물고기 짐을 던져 주의를 돌린다', key: 'bait' },
    ],
    resolve(g, rng, s, key) {
      if (key === 'bait') {
        if (rng.chance(0.6)) return '절인 물고기 통을 바다에 쏟았다. 뱀은 그쪽으로 머리를 돌렸고, 우리는 숨을 죽이고 빠져나갔다.';
        key = 'fight';
      }
      const r = fight(g, rng, { unit: 'giant_crab', count: 1, leader: 'sea_serpent' }, key === 'magic' ? 'magic' : 'charge');
      if (won(r)) { S(g).monsters += 1; L(g).renown += 4; chron(g, `${g.player.name}, 바다에서 심해 뱀을 물리치다.`, 60); return `${r.text} 뱀은 검은 피를 뿜으며 깊은 곳으로 가라앉았다. 선원들이 그날 밤 내 이름으로 건배했다.`; }
      const sh = S(g).ship;
      if (sh) sh.hull = Math.max(10, sh.hull - 20);
      return `${r.text} 뱀이 꼬리로 뱃전을 부수고 사라졌다.`;
    },
  },
  ghost: {
    w: (g) => 0.6,
    title: '안개 속의 배',
    text: () => '짙은 안개 속에서 돛이 찢긴 배 한 척이 소리 없이 다가왔다. 갑판에 아무도 없는데 종이 울린다. 선원들이 성호를 그었다.',
    choices: () => [{ label: '건너가 본다', key: 'board' }, { label: '키를 돌려 멀어진다', key: 'away' }],
    resolve(g, rng, s, key) {
      if (key === 'away') return '아무도 말하지 않았다. 안개가 걷히자 그 배는 없었다.';
      const r = fight(g, rng, { unit: 'drowned', count: rng.int(3, 4), leader: rng.chance(0.4) ? 'drowned_captain' : null });
      if (won(r)) { const loot = rng.int(30, 80); g.player.money += loot; S(g).wrecks += 1; return `${r.text} 선장실의 썩은 궤짝에서 백 년 전 금화를 찾았다. 은화로 치면 ${loot}닢. 돌아오는 내내 등 뒤가 서늘했다.`; }
      return `${r.text} 겨우 우리 배로 기어 돌아왔다. 그 배는 안개 속으로 사라졌다.`;
    },
  },
  castaway: {
    w: (g) => 1,
    title: '표류자',
    text: () => '부서진 널빤지에 매달린 사람을 건졌다. 입술이 갈라지고 눈이 퀭하다. 정신이 들자 그는 떨리는 손으로 낡은 해도 한 장을 내밀었다.',
    choices: () => [{ label: '물과 빵을 나눠 준다', key: 'help' }, { label: '해도를 받고 다음 항구에 내려 준다', key: 'map' }],
    resolve(g, rng, s, key) {
      if (key === 'help') { L(g).renown += 1; stress(g, -3); return '사흘을 돌보자 그는 일어나 앉았다. 난파한 상선의 항해사였다고 했다. 다음 항구에서 내 손을 오래 잡고 내렸다.'; }
      const m = rng.int(10, 40); g.player.money += m; gainSkill(g, 'sailing', 1, 'int');
      return `해도에는 산호초 사이의 숨은 뱃길이 그려져 있었다. 항구의 해도상이 은화 ${m}닢에 사 갔다.`;
    },
  },
  calm: {
    w: (g) => 1.4,
    title: '바람이 멎다',
    text: () => '바람이 죽었다. 돛이 축 늘어지고, 바다는 기름처럼 매끄럽다. 물통의 물이 하루하루 줄어든다.',
    choices: () => [{ label: '노를 저어서라도 간다', key: 'row' }, { label: '기다린다', key: 'wait' }],
    resolve(g, rng, s, key) {
      if (key === 'row') { tired(g, 20); gainStat(g, 'str', 0.6); return '선원들과 번갈아 노를 저었다. 손바닥이 터졌지만 배는 조금씩 나아갔다.'; }
      if (L(g).travel) L(g).travel.left += 1;
      stress(g, 8);
      return '열흘을 기다렸다. 아무도 말이 없었다. 바람이 다시 불었을 때는 한 달이 지나 있었다.';
    },
  },
  wind: {
    w: (g) => 1.2,
    title: '순풍',
    text: () => '등 뒤에서 바람이 꾸준히 분다. 돛이 팽팽하게 부풀고, 뱃머리가 물살을 가른다. 선원들이 콧노래를 부른다.',
    choices: () => [{ label: '돛을 모두 편다', key: 'sail' }],
    resolve(g) {
      const t = L(g).travel;
      if (t && t.left > 1) { t.left -= 1; return '순풍을 타고 달렸다. 뱃길이 한 달 줄었다.'; }
      return '순풍을 타고 달렸다. 내일이면 항구의 불빛이 보일 것이다.';
    },
  },
};
export const SEA_EVENTS = EVENTS;

defineScene('sea_event', {
  need: (g) => atSea(g),
  title: (g, s) => EVENTS[pickEv(g, s)].title,
  text: (g, s) => EVENTS[pickEv(g, s)].text(g, s),
  choices: (g, s) => EVENTS[pickEv(g, s)].choices(g, s),
  resolve(g, rng, s, key) { return EVENTS[pickEv(g, s)].resolve(g, rng, s, key); },
});
// 장면 데이터에 고른 일을 적어 둔다 (처음 그릴 때 정해진다)
function pickEv(g, s) {
  if (s.ev && EVENTS[s.ev]) return s.ev;
  const list = Object.entries(EVENTS).map(([id, e]) => [id, e.w(g)]).filter(([, w]) => w > 0);
  const total = list.reduce((a, [, w]) => a + w, 0);
  // 장면 데이터에 rng가 없으므로 황금비 수열로 고른다: 바다에 나갈수록 모든 일이 무게대로 고루 나온다
  const n = (S(g).evN = (S(g).evN ?? Math.floor(g.date.year * 7 + g.date.month)) + 1);
  let x = ((n * 0.6180339887498949) % 1) * total;
  for (const [id, w] of list) { if ((x -= w) <= 0) { s.ev = id; return id; } }
  s.ev = list[0][0];
  return s.ev;
}

/* ---------- 지도에서 배 타기 ---------- */
MAP_ACTIONS.push((g, place) => {
  if (!place.id || !PLACES[place.id] || g.over || !isAdult(g) || traveling(g) || g.pendingEvent) return [];
  const here = L(g).place;
  if (!isPort(here) || place.id === here) return [];
  const r = seaRoutesFrom(g, here).find((x) => x.to === place.id);
  if (!r) return [];
  return [{
    label: `배 타기 (뱃길 ${r.months}달, 뱃삯 은화 ${seaFare(r.months)}닢)`,
    run: () => { queueScene(g, 'sail', { to: place.id }, { first: true }); autosave(g); },
  }];
});
