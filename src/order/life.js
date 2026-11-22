// 기사단의 삶: 들어가기, 기사단 일과 임무, 서임, 형제 기사, 서약과 계율, 단장 자리, 은퇴, 떠나기, 무너진 기사단 다시 세우기.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, gainSkill, gainStat } from '../game.js';
import { makePerson, kill } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check } from '../adventure/core.js';
import { queueFight } from '../adventure/fight.js';
import { remember } from '../relations.js';
import { deed } from '../repute/index.js';
import { faithState } from '../faith/index.js';
import { J } from '../narrative/text.js';
import {
  OS, orderOf, isFallen, logOrder, facOf, royalMember, inOrder, level, rankName, orderName, myOrderName, brothers, merit, addMerit, atSeat,
  age, nm, endService, servedBefore, here, free, stat, sword, clamp, mi, ORDERS, NEW_ORDERS,
} from './core.js';
import { DUTY, RETIRE_HOW } from './data.js';

const S = OS;
const solarDevout = (g) => { const f = faithState(g); return f.god === 'solar' && f.devotion >= 30 && f.suspicion < 40; };
const married = (g) => { const sp = me(g).spouseId ? g.people.find((p) => p.id === me(g).spouseId) : null; return !!(sp && sp.alive); };
const ordersHere = (g) => NEW_ORDERS.filter((id) => ORDERS[id].seat === here(g) && !isFallen(g, id) && !S(g).expelled[id]);

/* ---------- 형제 기사 만들기 ---------- */
function makeBrothers(g, rng, id, n = 3) {
  const made = [];
  const myAge = age(g);
  for (let i = 0; i < n; i++) {
    const older = i === 0;
    const a = older ? clamp(myAge + rng.int(8, 16), 24, 48) : clamp(myAge + rng.int(-2, 3), 14, 60);
    const p = makePerson(rng, { sex: id === 'stigma' || rng.chance(0.8) ? 'm' : 'f', ageMonths: a * 12 + rng.int(0, 11), job: older ? 'knight' : 'guard' });
    p.place = id === 'royal' ? (facOf(g, 'royal')?.order ?? 'leocast') : ORDERS[id].seat;
    p.known = true; p.affection = older ? rng.int(10, 22) : rng.int(14, 30);
    p.orderOf = id;
    g.people.push(p);
    remember(g, p, `${orderName(id)}에서 ${older ? '나를 맡은 기사였다' : '함께 종자 밥을 먹었다'}`, 1, { tag: 'order', recall: older ? '종자 시절 나를 맡아 준 일' : '같은 막사에서 지낸 일' });
    made.push(p.id);
  }
  return made;
}
function startService(g, rng, id, rank = 0) {
  const st = S(g);
  if (id !== 'royal') L(g).fac[ORDERS[id].fac] = { member: true, rank, merit: rank ? ORDERS[id].merit[rank] : 0 };
  st.me = { id, joined: [g.date.year, g.date.month], dubbed: rank >= 1 ? g.date.year : null, brothers: [], mentor: null, broke: [], hidden: null, penance: 0, master: false };
  st.me.brothers = makeBrothers(g, rng, id, 3);
  st.me.mentor = st.me.brothers[0];
}

/* ---------- 들어가기 ---------- */
ACTIONS.push({
  id: 'order_join', name: '기사단 문을 두드린다', icon: 'sword',
  desc: '이 고장 기사단에 종자로 들어간다. 서약을 하고 형제들과 함께 산다.',
  available: (g) => free(g) && !inOrder(g) && !royalMember(g) && age(g) >= 14 && age(g) <= 34 && ordersHere(g).length > 0 && !S(g).retired,
  run(g) {
    if (!sceneQueued(g, 'order_join')) queueScene(g, 'order_join', { id: ordersHere(g)[0] }, { first: true });
    return `${J(ORDERS[ordersHere(g)[0]].hall, '을/를')} 찾아갔다.`;
  },
});
defineScene('order_join', {
  need: (g, s) => free(g) && !inOrder(g) && ordersHere(g).includes(s.id),
  title: (g, s) => `${orderName(s.id)}의 문`,
  text: (g, s) => {
    const O = ORDERS[s.id], o = orderOf(g, s.id);
    const kin = servedBefore(g, s.id).length ? ` 문지기가 이름을 듣더니 장부를 넘겼다. "${servedBefore(g, s.id).at(-1).name}의 집안이오?" 오래된 이름이 아직 이 성채에 남아 있었다.` : '';
    const face = s.id === 'stigma'
      ? (solarDevout(g) ? '' : ' 사제가 기도문을 외워 보라고 했다. 몇 줄에서 막혔다. 사제의 얼굴이 굳었다.')
      : ' 막사 앞 기사가 묻는 것은 이름 하나뿐이었다. 어디서 왔는지, 무엇을 했는지는 묻지 않았다.';
    const adult = age(g) >= 20 && sword(g) >= 42 ? ' 검을 보던 기사대장이 종자 말고 바로 시험 대련을 받아 보겠느냐고 물었다.' : '';
    return `${O.hall}. ${O.banner}이 성채 위에서 펄럭인다. ${O.desc} 단장 ${o.master.name}의 기사단이다.${face}${kin}${adult} 서약은 셋이다. ${O.vows.join(', ')}.`;
  },
  choices: (g, s) => {
    const out = [];
    const ok = s.id !== 'stigma' || solarDevout(g);
    if (ok) out.push({ label: '종자로 들어가 서약한다', key: 'squire' });
    if (ok && age(g) >= 20 && sword(g) >= 42) out.push({ label: '시험 대련을 받고 기사로 들어간다', key: 'test' });
    if (s.id === 'stigma' && !ok) out.push({ label: '한 해 더 기도하고 다시 오겠다고 한다', key: 'later' });
    out.push({ label: '돌아선다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const O = ORDERS[s.id];
    if (key === 'no') return '성채 문을 등지고 돌아섰다. 등 뒤에서 종이 울렸다.';
    if (key === 'later') { faithState(g).devotion += 3; return '사제는 고개를 끄덕였다. "믿음은 칼보다 늦게 자란다. 그래도 자란다."'; }
    if (key === 'test') {
      tired(g, 12);
      if (check(rng, sword(g) * 0.8 + stat(g, 'str') * 0.3, 52)) {
        startService(g, rng, s.id, 1);
        g.player.title = '경';
        note(g, `${O.name}에 기사로 들어갔다.`);
        chron(g, `${nm(g)}, 시험 대련을 거쳐 ${O.name}의 ${O.ranks[1]}가 되다.`, 55);
        logOrder(g, `${O.name}에 ${O.ranks[1]}로 들어갔다.`);
        return `기사대장의 목검을 세 번 받아 냈다. 네 번째에 내 목검이 그의 어깨에 닿았다. 그날 밤 예배당에서 서약을 했다. "${O.vows.join('. ')}." ${J(O.ranks[1], '으로/로')} 받아들여졌다. 형제가 셋 생겼다.`;
      }
      startService(g, rng, s.id, 0);
      note(g, `${O.name}에 종자로 들어갔다.`);
      logOrder(g, `${O.name}에 종자로 들어갔다.`);
      return '두 번째 합에서 목검을 놓쳤다. 기사대장은 웃지 않았다. "실력은 있다. 그러니 종자부터 하라." 종자의 흰 띠를 받았다.';
    }
    startService(g, rng, s.id, 0);
    note(g, `${O.name}에 종자로 들어갔다.`);
    logOrder(g, `${O.name}에 종자로 들어갔다.`);
    const mentor = brothers(g)[0];
    let poor = '';
    if (s.id === 'stigma' && g.player.money > 20) {
      const n = g.player.money - 5;
      g.player.money = 5; orderOf(g, 'stigma').wealth = clamp(orderOf(g, 'stigma').wealth + Math.min(6, n / 40), 0, 100);
      poor = ` 가진 은화 ${n}닢을 성채 곳간에 바쳤다. 주머니에 남은 것은 다섯 닢이었다.`;
    }
    return `예배당 바닥에 엎드려 서약을 외웠다. "${O.vows.join('. ')}."${poor} 나를 맡을 기사는 ${mentor ? J(mentor.name, '이었/였') : '늙은 기사였'}다. 막사의 딱딱한 침대 옆에 같은 날 들어온 종자 둘이 누웠다.`;
  },
});

/* ---------- 기사단 일 ---------- */
const canDuty = (g) => free(g) && inOrder(g) && S(g).me.id !== 'royal' && atSeat(g);
ACTIONS.push({
  id: 'order_duty', name: '기사단 일', icon: 'sword',
  desc: '성채의 일과 훈련, 순번과 순찰. 공을 쌓으면 기사가 되고 기사대장이 된다.',
  available: canDuty,
  run(g, rng) {
    const st = S(g).me, id = st.id, lv = level(g), O = ORDERS[id];
    const line = rng.pick(DUTY[id][lv]);
    addMerit(g, 1);
    const k = gainSkill(g, 'sword', 0.9 + lv * 0.1);
    const w = gainStat(g, 'wil', 0.2);
    if (id === 'stigma') faithState(g).devotion = clamp(faithState(g).devotion + 0.8, 0, 100);
    tired(g, 14);
    const wage = O.wage[lv] ?? 1;
    g.player.money += wage;
    // 임무: 순례길·묘지·마신교(성흔), 국경·성벽 너머·피난민(잿빛 성벽)
    // 임무는 석 달에 한 번 남짓
    if (mi(g) - (S(g).missionAt ?? 0) >= 3 && rng.chance(lv === 0 ? 0.2 : 0.35) && !sceneQueued(g, 'fight') && !sceneQueued(g, 'order_mission')) { S(g).missionAt = mi(g); queueMission(g, rng); }
    const parts = [line];
    if (wage) parts.push(`기사단에서 은화 ${wage}닢이 나왔다.`);
    const gain = [k > 0.04 ? `검술 +${k.toFixed(1)}` : null, w > 0.04 ? `의지 +${w.toFixed(1)}` : null].filter(Boolean).join(', ');
    return parts.join(' ') + (gain ? ` (${gain})` : '');
  },
});

function queueMission(g, rng) {
  const id = S(g).me.id, lv = level(g), O = ORDERS[id];
  const strong = lv >= 1;
  const kinds = id === 'stigma' ? ['pilgrim', 'grave', 'cult', 'pilgrim_road'] : ['border', 'beyond', 'refugee', 'border'];
  const kind = rng.pick(kinds);
  const reward = { money: strong ? 10 : 4, merit: [O.fac, strong ? 16 : 9], renown: 2 };
  const brother = brothers(g)[rng.int(0, Math.max(0, brothers(g).length - 1))];
  const withB = brother ? ` 형제 ${J(brother.name, '이/가')} 옆에서 말을 몬다.` : '';
  if (kind === 'pilgrim') {
    queueFight(g, rng, { title: '순례길 호위', intro: `솔라리스로 오는 순례자 무리가 고개에서 도적에게 털린다는 소식이 왔다.${withB}`, enc: { unit: 'bandit', count: rng.int(3, 5), leader: strong && rng.chance(0.5) ? 'bandit_chief' : null }, reward, avoidLabel: '순례자들만 먼저 피신시킨다', avoidText: '순례자들을 숲길로 돌려 피신시켰다. 도적들은 놓쳤다. 단장은 아무 말도 하지 않았다.', onWin: '순례자들이 흰 망토 자락에 입을 맞췄다. 부끄러워 말을 돌렸다.' });
  } else if (kind === 'grave') {
    queueFight(g, rng, { title: '묘지 정화', intro: `도시 밖 옛 전쟁터 묘지에서 흙이 움직인다는 신고가 들어왔다. 사제가 성수를 뿌리고 기사들이 칼을 뽑았다.${withB}`, enc: { unit: strong ? 'ghoul' : 'skeleton', count: rng.int(3, 5), leader: null }, reward, avoidLabel: '사제에게 결계를 맡기고 물러선다', avoidText: '사제의 결계 뒤로 물러섰다. 새벽이 되자 흙은 다시 잠잠해졌다. 다들 나를 보지 않았다.', onWin: '마지막 해골이 무너지자 사제가 이름 모를 망자들을 위해 기도했다.' });
  } else if (kind === 'cult') {
    queueFight(g, rng, { title: '마신교 은신처', intro: `이단심문소가 마신교도의 은신처를 찾아냈다. 성흔기사단이 문을 부순다.${withB}`, enc: { unit: 'cultist', count: rng.int(3, 4), leader: strong && rng.chance(0.3) ? 'cult_priest' : null }, reward: { ...reward, renown: 3 }, avoidLabel: '바깥 퇴로를 지킨다', avoidText: '바깥 퇴로를 지켰다. 안에서 비명이 오래 들렸다. 나온 것은 형제들뿐이었다.', onWin: '지하실 벽에 검은 새벽의 문양이 그려져 있었다. 심문관이 그것을 오래 들여다보았다.' });
  } else if (kind === 'border') {
    queueFight(g, rng, { title: '국경 순찰', intro: `셋째 성벽 바깥 초소에서 봉화가 올랐다.${withB}`, enc: { unit: strong ? 'orc' : 'deserter', count: rng.int(3, 5), leader: strong && rng.chance(0.35) ? 'orc_chief' : null }, reward, avoidLabel: '초소를 버리고 성벽 안으로 물러선다', avoidText: '초소를 버리고 성벽 안으로 물러섰다. 성벽을 등지지 않는다는 서약이 목에 걸렸다.', onWin: '초소의 봉화를 다시 올렸다. 형제들이 성벽 위에서 창을 두드렸다.' });
  } else if (kind === 'beyond') {
    queueFight(g, rng, { title: '성벽 너머 토벌', intro: `성벽 너머 숲에서 마물 떼가 둥지를 틀었다. 단장이 기사 여섯을 골랐다.${withB}`, enc: { unit: 'wolf', count: rng.int(4, 6), leader: strong ? (rng.chance(0.5) ? 'dire_wolf' : 'mana_bear') : null }, reward: { ...reward, renown: 3 }, avoidLabel: '척후만 하고 돌아온다', avoidText: '척후만 하고 돌아왔다. 둥지는 그대로다. 다음 달 국경 마을에서 소 세 마리가 사라졌다.', onWin: '둥지를 불태웠다. 돌아오는 길에 성벽이 보이자 누군가 노래를 시작했다.' });
  } else {
    queueScene(g, 'order_mission', { kind: kind === 'refugee' ? 'refugee' : 'pilgrim_road', id });
  }
}

defineScene('order_mission', {
  need: (g, s) => inOrder(g) && S(g).me.id === s.id && free(g),
  title: (g, s) => (s.kind === 'refugee' ? '성문 앞 피난민' : '순례길의 병자'),
  text: (g, s) => (s.kind === 'refugee'
    ? '성벽 너머 마을에서 쫓겨 온 사람들이 셋째 성문 앞에 모였다. 백 명이 넘는다. 성채 곳간은 겨울을 나기에도 빠듯하다. 단장은 문을 열지 말라고 했다. 그런데 오늘 성문 열쇠는 내 허리에 있다.'
    : '순례자 무리를 이끄는 길에 한 노인이 열병으로 쓰러졌다. 무리를 멈추면 해 지기 전에 다음 숙소에 닿지 못한다. 밤길에는 도적이 나온다. 노인의 손녀가 흰 망토 자락을 붙잡았다.'),
  choices: (g, s) => (s.kind === 'refugee'
    ? [{ label: '문을 연다', key: 'open' }, { label: '명대로 닫아 둔다', key: 'shut' }, { label: '아이와 노인만 들인다', key: 'some' }]
    : [{ label: '무리를 멈추고 노인을 돌본다', key: 'stay' }, { label: '노인을 말에 태우고 계속 간다', key: 'carry' }, { label: '노인과 손녀를 마을에 맡기고 간다', key: 'leave' }]),
  resolve(g, rng, s, key) {
    const pl = here(g);
    if (s.kind === 'refugee') {
      if (key === 'open') { addMerit(g, -10); deed(g, 'kind', 3, '단장의 명을 어기고 피난민에게 성문을 열었다', pl); stress(g, 4); S(g).me.broke.push('명령'); orderOf(g, 'march').wealth = clamp(orderOf(g, 'march').wealth - 3, 0, 100); return '성문을 열었다. 사람들이 쏟아져 들어왔다. 다음 날 단장 앞에 불려 갔다. "성벽은 사람을 지키려고 있는 것이다. 그래도 명은 명이다." 한 달 동안 성벽 밖 초소로 쫓겨났다.'; }
      if (key === 'shut') { addMerit(g, 4); deed(g, 'kind', -2, '피난민 앞에서 성문을 닫아 두었다', pl); stress(g, 8); return '문을 닫아 두었다. 밤새 문 두드리는 소리가 났다. 새벽에는 그 소리가 그쳤다. 그쪽을 보지 않았다.'; }
      addMerit(g, 1); deed(g, 'kind', 1, '피난민 아이와 노인을 성채에 들였다', pl); stress(g, 3);
      return '아이와 노인만 들였다. 남은 젊은 사람들이 성벽 아래에 자리를 폈다. 단장은 보고서를 읽고 한숨만 쉬었다.';
    }
    if (key === 'stay') { addMerit(g, -2); deed(g, 'kind', 2, '순례길에서 쓰러진 노인을 두고 가지 않았다', pl); tired(g, 8); return rng.chance(0.7) ? '길가에 천막을 치고 밤을 새웠다. 노인은 새벽에 열이 내렸다. 도적은 오지 않았다. 운이 좋았다.' : '길가에 천막을 쳤다. 노인은 새벽에 숨을 거뒀다. 손녀의 손을 잡고 무덤을 팠다.'; }
    if (key === 'carry') { tired(g, 12); addMerit(g, 3); deed(g, 'kind', 1, '쓰러진 순례자를 말에 태워 데려갔다', pl); return '노인을 내 말에 태우고 고삐를 잡고 걸었다. 숙소에 닿았을 때 다리가 내 것이 아니었다. 노인은 살았다.'; }
    deed(g, 'kind', -1, '앓는 순례자를 마을에 맡기고 길을 재촉했다', pl);
    addMerit(g, 2);
    return '노인과 손녀를 마을 사제에게 맡겼다. 손녀는 끝까지 망토를 놓지 않으려 했다. 순례자들은 해 지기 전에 숙소에 닿았다.';
  },
});

/* ---------- 서임 (종자 → 기사), 기사대장 ---------- */
export function readyToDub(g) {
  const st = S(g).me;
  if (!st || st.id === 'royal' || level(g) !== 0) return false;
  const O = ORDERS[st.id], f = facOf(g, st.id);
  return age(g) >= O.age[1] && sword(g) >= O.sword[1] && (f?.merit ?? 0) >= O.merit[1] && (st.id !== 'stigma' || faithState(g).devotion >= 40);
}
export function readyToCaptain(g) {
  const st = S(g).me;
  if (!st || st.id === 'royal' || level(g) !== 1) return false;
  const O = ORDERS[st.id], f = facOf(g, st.id);
  return age(g) >= O.age[2] && sword(g) >= O.sword[2] && (f?.merit ?? 0) >= O.merit[2];
}
defineScene('order_dub', {
  need: (g) => readyToDub(g) && free(g),
  title: (g) => `${orderName(S(g).me.id)}의 서임`,
  text: (g) => {
    const id = S(g).me.id, mentor = brothers(g).find((p) => p.id === S(g).me.mentor);
    return `종자의 흰 띠를 푸는 날이다. 전날 밤은 예배당 돌바닥에서 홀로 새운다. 갑옷은 제단 앞에 눕혀 두었다. ${mentor ? `${J(mentor.name, '이/가')} 문간에서 말없이 고개를 끄덕였다. ` : ''}${id === 'stigma' ? '새벽에 단장이 흰 망토를 들고 온다. 가슴의 붉은 성흔을 달기 전에 하나를 더 맹세할 수 있다고 한다.' : '새벽에 단장이 잿빛 망토를 들고 온다. 셋째 성벽에 이름을 새길 자리를 고르라고 한다.'}`;
  },
  choices: (g) => (S(g).me.id === 'stigma'
    ? [{ label: '약한 자를 먼저 지키겠다고 맹세한다', key: 'weak' }, { label: '교단의 적을 끝까지 쫓겠다고 맹세한다', key: 'zeal' }, { label: '서약 셋으로 족하다고 말한다', key: 'plain' }]
    : [{ label: '성문 바로 옆 돌에 새긴다', key: 'gate' }, { label: '먼저 간 형제의 이름 아래 새긴다', key: 'under' }, { label: '새기지 않고 싸워서 자리를 얻겠다고 한다', key: 'later' }]),
  resolve(g, rng, s, key) {
    const st = S(g).me, id = st.id, O = ORDERS[id];
    facOf(g, id).rank = 1; st.dubbed = g.date.year;
    g.player.title = '경';
    L(g).renown = (L(g).renown ?? 0) + 4;
    note(g, `${O.name}의 ${J(O.ranks[1], '이/가')} 되었다.`);
    chron(g, `${nm(g)}, ${O.name}에서 서임받아 ${J(O.ranks[1], '이/가')} 되다.`, 50);
    logOrder(g, `서임받아 ${J(O.ranks[1], '이/가')} 되었다.`);
    for (const b of brothers(g)) b.affection = clamp((b.affection ?? 0) + 5, -100, 100);
    const vow = { weak: ' 약한 자를 먼저 지키겠다고 맹세했다. 단장이 잠시 나를 보았다.', zeal: ' 교단의 적을 끝까지 쫓겠다고 맹세했다. 단장 뒤에 선 심문관이 고개를 끄덕였다.', plain: ' 서약 셋으로 족하다고 했다. 단장이 웃었다. "셋을 다 지키는 기사도 드물다."', gate: ' 성문 바로 옆 돌에 이름을 새겼다. 드나드는 형제들이 날마다 그 이름을 지나간다.', under: ' 먼저 간 형제의 이름 아래 내 이름을 새겼다.', later: ' 이름은 새기지 않았다. 늙은 기사들이 그런 놈이 꼭 하나씩 있다며 웃었다.' }[key] ?? '';
    if (key === 'zeal') { faithState(g).devotion = clamp(faithState(g).devotion + 4, 0, 100); }
    if (key === 'weak') deed(g, 'kind', 2, '기사 서임 때 약한 자를 먼저 지키겠다고 맹세했다', here(g));
    if (key === 'under' || key === 'gate') deed(g, 'loyal', 2, '셋째 성벽에 이름을 새겼다', here(g));
    return `단장의 칼등이 어깨를 두 번 두드렸다. "일어나라, ${g.player.name} 경."${vow} 이제 ${O.name}의 ${O.ranks[1]}다.`;
  },
});

/* ---------- 형제 기사 ---------- */
defineScene('order_brother', {
  need: (g, s) => inOrder(g) && brothers(g).some((p) => p.id === s.bid),
  title: (g, s) => ({ wound: '다친 형제', debt: '형제의 빚', doubt: '형제의 비밀', letter: '형제의 편지', duel: '형제의 결투' }[s.ev]),
  text: (g, s) => {
    const b = g.people.find((p) => p.id === s.bid);
    switch (s.ev) {
      case 'wound': return `${J(b.name, '이/가')} 순찰에서 다리를 크게 다쳐 돌아왔다. 의원은 한 철은 말을 못 탄다고 했다. 그의 순번이 비었다. 기사대장이 누가 대신 서겠느냐고 묻는다.`;
      case 'debt': return `${J(b.name, '이/가')} 밤늦게 막사로 찾아왔다. 성 밖 노름판에 은화 서른 닢을 빚졌다고 한다. 단장 귀에 들어가면 망토를 벗어야 한다. 빌려 달라는 말은 끝내 하지 못했다.`;
      case 'doubt': return S(g).me.id === 'stigma'
        ? `${J(b.name, '이/가')} 밤마다 성채를 빠져나간다. 오늘 뒤를 밟았다. 성 밖 과부의 집이었다. 정결의 서약을 어긴 것이다. 내가 본 것을 그도 알았다.`
        : `${J(b.name, '이/가')} 지난 토벌 때 성벽 너머에서 물러선 것을 나만 보았다. 형제를 버리지 않는다는 서약이 있다. 그가 물러선 자리에서 다른 형제가 다쳤다.`;
      case 'letter': return `${J(b.name, '이/가')} 고향에서 온 편지를 들고 한참을 앉아 있었다. 어머니가 위독하다고 한다. 지금은 순번을 비울 수 없는 철이다. 단장에게 말을 꺼내지도 못하고 있다.`;
      case 'duel': return `술자리에서 다른 기사단 기사가 ${J(b.name, '을/를')} 모욕했다. ${J(b.name, '은/는')} 결투를 청하려 한다. 상대는 이름난 검사다. 계율은 형제끼리, 기사단끼리의 사사로운 결투를 금한다.`;
      default: return '';
    }
  },
  choices: (g, s) => {
    switch (s.ev) {
      case 'wound': return [{ label: '내가 그 순번을 선다', key: 'take' }, { label: '내 순번만 지킨다', key: 'no' }];
      case 'debt': return g.player.money >= 30 ? [{ label: '은화 서른 닢을 건넨다', key: 'pay' }, { label: '단장에게 털어놓으라고 한다', key: 'confess' }, { label: '모른 척한다', key: 'no' }] : [{ label: '단장에게 털어놓으라고 한다', key: 'confess' }, { label: '내 몫의 일을 나눠 맡아 갚는 것을 돕는다', key: 'help' }, { label: '모른 척한다', key: 'no' }];
      case 'doubt': return [{ label: '입을 다문다', key: 'silent' }, { label: '단둘이 불러 그만두라고 한다', key: 'warn' }, { label: '단장에게 알린다', key: 'report' }];
      case 'letter': return [{ label: '내가 단장에게 대신 청한다', key: 'ask' }, { label: '그의 순번까지 맡을 테니 다녀오라고 한다', key: 'cover' }, { label: '서약이 먼저라고 말한다', key: 'vow' }];
      case 'duel': return [{ label: '내가 대신 결투를 받는다', key: 'me' }, { label: '말려서 데리고 나온다', key: 'stop' }, { label: '하게 둔다', key: 'let' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const b = g.people.find((p) => p.id === s.bid);
    const aff = (n) => { b.affection = clamp((b.affection ?? 0) + n, -100, 100); };
    switch (s.ev) {
      case 'wound':
        if (key === 'take') { tired(g, 14); aff(12); addMerit(g, 3); remember(g, b, '다쳤을 때 순번을 대신 서 주었다', 1); return `한 철 동안 두 사람 몫의 순번을 섰다. 잠이 모자라 서서 졸았다. 다리가 나은 ${J(b.name, '이/가')} 처음 성벽에 오른 날, 아무 말 없이 내 화로에 장작을 넣었다.`; }
        aff(-4); return '다른 형제가 순번을 맡았다. 아무도 나에게 뭐라 하지 않았다.';
      case 'debt':
        if (key === 'pay' && g.player.money >= 30) { g.player.money -= 30; aff(16); remember(g, b, '노름빚을 대신 갚아 주었다', 1); return `은화 서른 닢을 건넸다. ${J(b.name, '은/는')} 고개를 들지 못했다. 그 뒤로 노름판에 가지 않았다. 적어도 그렇게 들었다.`; }
        if (key === 'help' || key === 'pay') { tired(g, 8); aff(10); return `한 달 동안 내 몫의 일을 나눠 맡아 그의 빚 갚을 틈을 만들어 주었다. ${J(b.name, '은/는')} 고맙다는 말 대신 내 장화를 닦아 두었다.`; }
        if (key === 'confess') { aff(-6); return rng.chance(0.6) ? `${J(b.name, '은/는')} 단장 앞에 무릎을 꿇었다. 한 철 동안 마구간 일을 했다. 망토는 지켰다.` : `${J(b.name, '은/는')} 끝내 털어놓지 못했다. 빚쟁이가 성채 문 앞까지 찾아왔다. 그는 망토를 벗었다.`; }
        aff(-8); return '모른 척했다. 며칠 뒤 그의 은 박차가 사라져 있었다.';
      case 'doubt':
        if (key === 'silent') { aff(8); S(g).me.broke.push('침묵'); return '입을 다물었다. 그 일은 우리 둘만의 일이 되었다. 고해 때 그 이야기는 하지 않았다.'; }
        if (key === 'warn') { aff(rng.chance(0.6) ? 6 : -10); return rng.chance(0.6) ? `${J(b.name, '은/는')} 오래 말이 없다가 그만두겠다고 했다. 그 뒤로 밤에 성채를 나가지 않았다.` : `${J(b.name, '은/는')} 내 손을 뿌리쳤다. "네가 뭔데." 그 뒤로 같은 식탁에 앉지 않는다.`; }
        aff(-30); addMerit(g, 6); deed(g, 'honest', 2, '서약을 어긴 형제를 단장에게 알렸다', here(g)); deed(g, 'loyal', -2, '형제를 단장에게 고발했다', here(g));
        b.away = true; S(g).me.brothers = S(g).me.brothers.filter((id) => id !== b.id);
        return `단장은 그날로 ${J(b.name, '을/를')} 불러 망토를 벗겼다. 그는 성채를 떠나며 한 번도 돌아보지 않았다. 다른 형제들이 나를 보는 눈이 조금 달라졌다.`;
      case 'letter':
        if (key === 'ask') { const ok = check(rng, stat(g, 'cha') * 0.5 + level(g) * 10, 32); aff(ok ? 14 : 6); return ok ? `단장이 허락했다. ${J(b.name, '은/는')} 그날 밤 말을 달려 떠났다. 어머니의 임종을 지켰다고 한다.` : '단장은 고개를 저었다. "지금은 아니다." 그래도 청해 준 것을 그는 잊지 않을 것이다.'; }
        if (key === 'cover') { tired(g, 16); aff(18); remember(g, b, '어머니 임종 때 순번을 대신 맡아 주었다', 1); return `몰래 다녀오게 하고 그의 순번까지 섰다. 열흘 동안 거의 자지 못했다. 돌아온 ${J(b.name, '이/가')} 말없이 내 어깨를 한 번 쥐었다.`; }
        aff(-12); return `서약이 먼저라고 했다. ${J(b.name, '은/는')} 남았다. 어머니는 그해 겨울을 넘기지 못했다.`;
      case 'duel':
        if (key === 'me') {
          aff(15);
          if (check(rng, sword(g), 48)) { L(g).renown = (L(g).renown ?? 0) + 3; addMerit(g, -4); return '내가 대신 결투를 받았다. 상대의 칼이 먼저 떨어졌다. 단장은 사사로운 결투를 꾸짖으면서도 끝까지 나무라지는 않았다.'; }
          g.player.injuries.push({ name: '결투에서 베인 팔', months: 3 }); addMerit(g, -6); return '내가 대신 결투를 받았다. 졌다. 팔이 베였다. 그래도 형제의 이름은 지켰다고들 했다.';
        }
        if (key === 'stop') { aff(rng.chance(0.5) ? 4 : -6); return `${J(b.name, '을/를')} 끌고 나왔다. 밤새 투덜거렸다. 아침에는 고맙다고 했다.`; }
        if (rng.chance(0.5)) { b.injured = true; aff(-2); return `${J(b.name, '은/는')} 결투를 했고 졌다. 얼굴에 긴 흉이 남았다.`; }
        aff(2); return `${J(b.name, '은/는')} 결투를 했고 이겼다. 단장은 그를 한 철 동안 마구간으로 보냈다.`;
      default: return '';
    }
  },
});

/* ---------- 서약과 계율 ---------- */
defineScene('order_vow', {
  need: (g, s) => inOrder(g) && S(g).me.id === s.id,
  title: () => '서약',
  text: (g, s) => {
    if (s.kind === 'marriage') return '혼인을 했다. 성흔기사는 혼인하지 않는다는 서약을 했다. 아직 성채에서는 아무도 모른다. 고해 날이 다가온다.';
    if (s.kind === 'wealth') return `주머니에 은화가 ${g.player.money}닢이다. 성흔기사는 제 재물을 갖지 않는다. 곳간 담당 기사가 요즘 내 씀씀이를 묻는다.`;
    return `${myOrderName(g)}의 기사가 저지른 일이 소문으로 돌았다. 단장이 불렀다. 기사단의 이름을 더럽힌 자를 그냥 둘 수는 없다고 한다.`;
  },
  choices: (g, s) => {
    if (s.kind === 'marriage') return [{ label: '단장 앞에 털어놓고 망토를 벗는다', key: 'leave' }, { label: '숨긴다', key: 'hide' }];
    if (s.kind === 'wealth') return [{ label: '곳간에 바친다', key: 'give' }, { label: '가난한 이들에게 나눠 준다', key: 'alms' }, { label: '숨겨 둔다', key: 'hide' }];
    return [{ label: '벌을 달게 받는다', key: 'penance' }, { label: '소문일 뿐이라고 맞선다', key: 'deny' }, { label: '스스로 망토를 벗는다', key: 'leave' }];
  },
  resolve(g, rng, s, key) {
    const st = S(g).me, O = ORDERS[st.id];
    if (key === 'leave') {
      const name = myOrderName(g);
      if (st.id === 'royal') { L(g).fac.knights.member = false; if (L(g).job?.id === 'knight') L(g).job = null; }
      endService(g, '서약을 지키지 못해 스스로 떠남');
      note(g, `${name}에서 스스로 망토를 벗었다.`);
      return `단장 앞에 무릎을 꿇고 다 털어놓았다. 단장은 오래 말이 없었다. "거짓말을 하지 않은 것은 기사답다." 망토를 접어 제단에 올려 두고 성채를 나왔다.`;
    }
    if (s.kind === 'marriage') { st.hidden = 'marriage'; st.broke.push('정결'); stress(g, 6); return '숨겼다. 고해 때 그 이야기는 하지 않았다. 혼인 반지는 목에 걸어 옷 안에 넣었다. 그 무게가 매일 느껴졌다.'; }
    if (s.kind === 'wealth') {
      const n = Math.max(0, g.player.money - 20);
      if (key === 'give') { g.player.money -= n; orderOf(g, 'stigma').wealth = clamp(orderOf(g, 'stigma').wealth + n / 60, 0, 100); addMerit(g, 6); return `은화 ${n}닢을 곳간에 바쳤다. 곳간 기사가 장부에 적었다. 서약은 가벼워졌고 주머니도 가벼워졌다.`; }
      if (key === 'alms') { g.player.money -= n; deed(g, 'generous', 4, '가진 은화를 가난한 이들에게 나눠 주었다', here(g)); addMerit(g, 2); return `은화 ${n}닢을 구호소 앞에서 나눠 주었다. 곳간 기사는 눈살을 찌푸렸지만 단장은 그 이야기를 듣고 웃었다.`; }
      st.hidden = 'wealth'; st.broke.push('청빈'); return '숨겨 두었다. 성 밖 환전상에게 맡겼다. 고해 때 그 이야기는 하지 않았다.';
    }
    if (key === 'penance') { addMerit(g, -15); tired(g, 10); st.penance += 1; return '한 철 동안 맨발로 성채 마구간을 치웠다. 밤마다 예배당 돌바닥에서 잤다. 형제들은 그 일을 다시 입에 올리지 않았다.'; }
    if (check(rng, stat(g, 'cha') * 0.5 + level(g) * 8, 40)) { return '증인이 나서지 않았다. 단장은 의심을 거두지 않았지만 더 묻지 않았다.'; }
    const name = myOrderName(g);
    if (st.id === 'royal') { L(g).fac.knights.member = false; if (L(g).job?.id === 'knight') L(g).job = null; }
    S(g).expelled[st.id] = g.date.year;
    endService(g, '쫓겨남');
    note(g, `${name}에서 쫓겨났다.`);
    chron(g, `${nm(g)}, 기사의 이름을 더럽혀 ${name}에서 쫓겨나다.`, 50);
    deed(g, 'honest', -3, '기사단의 판결 앞에서 거짓으로 맞섰다', here(g));
    return `증인이 셋 나섰다. 단장이 직접 망토를 벗겼다. 박차가 잘려 성문 밖에 던져졌다. ${O.name}의 문은 다시 열리지 않을 것이다.`;
  },
});

/* ---------- 단장 자리 ---------- */
defineScene('order_election', {
  need: (g, s) => inOrder(g) && S(g).me.id === s.id && level(g) >= 2 && !S(g).me.master,
  keep: true,
  title: (g, s) => `${orderName(s.id)}의 새 단장`,
  text: (g, s) => {
    const rival = s.rival;
    const how = s.id === 'royal' ? '왕이 새 단장을 고른다. 기사대장들의 이름이 왕의 책상에 올라갔다.' : '기사단 회의가 예배당에서 새 단장을 뽑는다. 기사대장 이상이 한 표씩이다.';
    return `단장 ${J(s.old, '이/가')} ${s.why}. ${how} 내 이름도 거기 있다. 맞수는 기사대장 ${rival}. 오래 함께한 기사들이 내 얼굴을 살핀다.`;
  },
  choices: () => [{ label: '단장 자리에 나선다', key: 'run' }, { label: '맞수를 민다', key: 'back' }, { label: '물러나 지켜본다', key: 'no' }],
  resolve(g, rng, s, key) {
    const o = orderOf(g, s.id), st = S(g).me;
    if (key === 'run') {
      const bro = brothers(g).reduce((a, b) => a + Math.max(0, b.affection ?? 0), 0) / 10;
      const score = (facOf(g, s.id)?.merit ?? 0) / 20 + (L(g).renown ?? 0) / 3 + bro + (st.broke.length ? -8 : 0) + stat(g, 'cha') / 4;
      if (check(rng, score, 40)) {
        st.master = true;
        o.master = { name: g.player.name, born: g.date.year - age(g), pid: me(g).id };
        o.masterN = (o.masterN ?? 0) + 1;
        L(g).renown = (L(g).renown ?? 0) + 8;
        note(g, `${orderName(s.id)}의 단장이 되었다.`);
        chron(g, `${nm(g)}, ${orderName(s.id)}의 단장이 되다.`, 80);
        logOrder(g, '단장이 되었다.');
        return s.id === 'royal'
          ? '왕이 내 이름을 불렀다. 기사단장의 사슬이 목에 걸렸다. 생각보다 무거웠다.'
          : '표를 세는 동안 예배당이 조용했다. 내 이름이 한 표 더 많았다. 늙은 기사들이 하나씩 다가와 손에 입을 맞췄다. 맞수였던 기사가 마지막으로 왔다.';
      }
      o.master = { name: s.rival, born: g.date.year - 50 };
      stress(g, 6);
      return `${J(s.rival, '이/가')} 단장이 되었다. 몇 표 차이였다. 새 단장은 나를 부르더니 기사대장 자리를 그대로 맡겼다. 그것이 더 쓰라렸다.`;
    }
    o.master = { name: s.rival, born: g.date.year - 50 };
    if (key === 'back') { deed(g, 'loyal', 2, '기사단 단장 자리를 맞수에게 양보하고 그를 밀었다', here(g)); addMerit(g, 10); return `${J(s.rival, '을/를')} 밀었다. 그가 단장이 되었다. 그는 그 일을 잊지 않았다.`; }
    return `${J(s.rival, '이/가')} 단장이 되었다. 새 단장 아래에서도 순번은 똑같이 돌아갔다.`;
  },
});

ACTIONS.push({
  id: 'order_lead', name: '기사단을 이끈다', icon: 'sword',
  desc: '단장으로서 이번 철 기사단이 갈 길을 정한다.',
  available: (g) => free(g) && inOrder(g) && S(g).me.master && atSeat(g) && !sceneQueued(g, 'order_lead'),
  run(g) { queueScene(g, 'order_lead', { id: S(g).me.id }, { first: true }); return '단장실 탁자에 지도를 펼쳤다.'; },
});
defineScene('order_lead', {
  need: (g, s) => inOrder(g) && S(g).me.master && S(g).me.id === s.id,
  title: () => '단장의 탁자',
  text: (g, s) => {
    const o = orderOf(g, s.id);
    const power = o.strength >= 70 ? '기사단은 강하다' : o.strength >= 40 ? '기사단은 버틸 만하다' : '기사단은 지쳐 있다';
    const purse = o.wealth >= 70 ? '곳간은 넘친다. 그만큼 시기하는 눈도 많다' : o.wealth >= 35 ? '곳간은 넉넉하지 않다' : '곳간은 비어 간다';
    return `${power}. ${purse}. ${o.heresy ? '이단심문소가 성채 주위를 맴돈다. ' : ''}기사대장들이 이번 철에 할 일을 묻는다.`;
  },
  choices: (g, s) => (s.id === 'stigma'
    ? [{ label: '순례길 초소를 늘린다', key: 'road' }, { label: '교단과 교황청에 가까이 선다', key: 'church' }, { label: '곳간을 불린다', key: 'wealth' }, { label: '가진 것을 구호소에 푼다', key: 'alms' }]
    : s.id === 'march'
      ? [{ label: '성벽을 보수한다', key: 'wall' }, { label: '성벽 너머로 나간다', key: 'sortie' }, { label: '왕국들에 지원을 청한다', key: 'ask' }]
      : [{ label: '왕의 곁을 지킨다', key: 'king' }, { label: '변경에 기사를 보낸다', key: 'border' }, { label: '젊은 종자를 늘린다', key: 'train' }]),
  resolve(g, rng, s, key) {
    const o = orderOf(g, s.id);
    const ch = (st, w) => { o.strength = clamp(o.strength + st, 0, 100); o.wealth = clamp(o.wealth + w, 0, 100); };
    tired(g, 8);
    switch (key) {
      case 'road': ch(6, -6); deed(g, 'kind', 1, '순례길 초소를 늘렸다', here(g)); return '순례길 고개마다 초소가 섰다. 그해 털린 순례자 무리는 하나뿐이었다.';
      case 'church': ch(0, -3); if (o.heresy) o.heresy.soft = (o.heresy.soft ?? 0) + 1; o.suspect = Math.max(0, (o.suspect ?? 0) - 10); return '교황청에 기사단의 장부를 열어 보였다. 심문관 하나가 고맙다고 했다. 다른 하나는 더 많은 것을 보고 싶어 했다.';
      case 'wealth': ch(-2, 10); o.suspect = (o.suspect ?? 0) + 8; return '영지의 소작료를 올리고 순례자 숙소에 값을 매겼다. 곳간이 찼다. 왕도의 귀족들이 성흔기사단의 금을 입에 올리기 시작했다.';
      case 'alms': ch(1, -10); o.suspect = Math.max(0, (o.suspect ?? 0) - 6); deed(g, 'generous', 4, '기사단 곳간을 구호소에 풀었다', here(g)); return '곳간을 열어 구호소에 밀을 보냈다. 곳간 기사가 장부를 덮으며 한숨을 쉬었다. 거리에서는 흰 망토를 보면 사람들이 고개를 숙였다.';
      case 'wall': ch(5, -6); return '석공을 불러 둘째 성벽의 갈라진 곳을 메웠다. 겨울이 오기 전에 끝냈다.';
      case 'sortie':
        ch(rng.chance(0.65) ? 8 : -10, -2);
        queueFight(g, rng, { title: '단장의 출격', intro: '단장이 직접 성벽 너머로 기사들을 이끈다.', enc: { unit: 'orc', count: rng.int(4, 6), leader: 'orc_chief' }, reward: { money: 20, merit: [ORDERS.march.fac, 20], renown: 5 }, avoidLabel: '물러난다', avoidText: '단장이 먼저 물러났다. 성벽 위의 형제들이 말없이 문을 열었다.', onWin: '오크 전사장의 도끼를 셋째 성문 위에 걸었다.' });
        return '출격 나팔이 울렸다.';
      case 'ask': ch(0, 8); return check(rng, stat(g, 'cha') * 0.6 + (L(g).renown ?? 0) / 4, 40) ? '세 왕국에 사절을 보냈다. 둘이 밀과 화살을 보냈다. 셋째는 답이 없었다.' : '사절은 빈손으로 돌아왔다. 변경은 늘 잊힌다.';
      case 'king': ch(2, 4); L(g).renown = (L(g).renown ?? 0) + 1; return '왕의 행차마다 기사단이 앞섰다. 궁정의 귀족들이 기사단장에게 먼저 인사를 했다.';
      case 'border': ch(4, -4); return '기사 열을 북쪽 변경으로 보냈다. 왕도의 연회는 조금 조용해졌다.';
      case 'train': ch(3, -3); return '종자를 스무 명 더 받았다. 막사가 비좁아졌다. 훈련장의 목검 소리가 커졌다.';
      default: return '';
    }
  },
});

/* ---------- 은퇴와 떠나기 ---------- */
ACTIONS.push({
  id: 'order_retire', name: '기사단에서 물러난다', icon: 'home',
  desc: '늙거나 크게 다친 기사는 망토를 걸어 둔다. 남아서 가르칠 수도, 고향으로 갈 수도 있다.',
  available: (g) => free(g) && inOrder(g) && level(g) >= 1 && (age(g) >= 50 || (g.player.scars ?? []).length >= 3) && !sceneQueued(g, 'order_retire'),
  run(g) { queueScene(g, 'order_retire', { id: S(g).me.id }, { first: true }); return '망토를 벗어 무릎 위에 올려놓았다.'; },
});
defineScene('order_retire', {
  need: (g, s) => inOrder(g) && S(g).me.id === s.id,
  title: () => '망토를 걸어 두는 날',
  text: (g, s) => {
    const yrs = g.date.year - (S(g).me.joined?.[0] ?? g.date.year);
    const gone = OS(g).me.brothers.length - brothers(g).length;
    return `${myOrderName(g)}에서 ${yrs}년. 같은 날 들어온 형제들 가운데 ${gone > 0 ? `${gone}명은 먼저 갔다` : '아직 다들 살아 있다'}. 아침마다 무릎이 먼저 날씨를 안다. 이제 망토를 걸어 둘 때다.`;
  },
  choices: (g, s) => [{ label: RETIRE_HOW.teach, key: 'teach' }, { label: RETIRE_HOW.home, key: 'home' }, ...(s.id === 'stigma' ? [{ label: RETIRE_HOW.cloister, key: 'cloister' }] : []), { label: '아직은 아니다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') return '망토를 다시 둘렀다. 한 철만 더.';
    const name = myOrderName(g), id = S(g).me.id, wasMaster = S(g).me.master;
    if (wasMaster) {
      const o = orderOf(g, id), next = brothers(g).filter((b) => (b.ageMonths ?? 0) > 30 * 12).sort((a, b) => (b.affection ?? 0) - (a.affection ?? 0))[0];
      o.master = { name: next ? `${next.name} ${next.lastName}` : ORDERS[id].master[(o.masterN ?? 0) % ORDERS[id].master.length], born: g.date.year - 45 };
      o.masterN = (o.masterN ?? 0) + 1;
    }
    if (id === 'royal') { L(g).fac.knights.member = false; if (L(g).job?.id === 'knight') L(g).job = null; }
    endService(g, `물러남 (${RETIRE_HOW[key]})`);
    S(g).retired = { id, y: g.date.year, how: key, name };
    note(g, `${name}에서 물러났다.`);
    chron(g, `${nm(g)}, ${name}에서 물러나다.`, 40);
    if (key === 'teach') { g.player.money += 20; return '성채 구석방 하나를 얻었다. 아침마다 종자들의 목검을 고쳐 잡아 준다. 연금으로 은화 스무 닢이 나왔다. 내가 종자였을 때 나를 가르친 기사도 이 방에 있었다.'; }
    if (key === 'cloister') { faithState(g).devotion = clamp(faithState(g).devotion + 10, 0, 100); return '산속 수도원에 들어갔다. 칼은 제단 아래 묻었다. 새벽 종소리에 아직도 손이 칼자루를 찾는다.'; }
    g.player.money += 60;
    return '은화 예순 닢과 늙은 말 한 필을 받았다. 성채 문을 나서며 뒤를 돌아보지 않으려 했다. 결국 돌아보았다.';
  },
});

ACTIONS.push({
  id: 'order_leave', name: '기사단을 떠난다', icon: 'home',
  desc: '서약을 거두고 기사단을 나온다. 형제들은 쉽게 잊지 않는다.',
  available: (g) => free(g) && inOrder(g) && S(g).me.id !== 'royal' && !S(g).me.master && (married(g) || S(g).me.hidden || age(g) >= 30 || stressHigh(g)),
  run(g) {
    const name = myOrderName(g);
    for (const b of brothers(g)) b.affection = clamp((b.affection ?? 0) - 12, -100, 100);
    deed(g, 'loyal', -3, `${name}의 서약을 거두고 떠났다`, here(g));
    endService(g, '서약을 거두고 떠남');
    note(g, `${J(name, '을/를')} 떠났다.`);
    return `단장 앞에서 서약을 거뒀다. 단장은 망토를 받아 들고 아무것도 묻지 않았다. 막사 앞에서 형제 하나가 등을 돌렸다.`;
  },
});
const stressHigh = (g) => (g.player.stress ?? 0) >= 70;

/* ---------- 무너진 기사단 다시 세우기 ---------- */
const canRefound = (g, id) => isFallen(g, id) && g.date.year - orderOf(g, id).fallen.y >= 20 && (servedBefore(g, id).length > 0 || (L(g).renown ?? 0) >= 60) && age(g) >= 30 && g.player.money >= 200 && !inOrder(g) && !royalMember(g);
ACTIONS.push({
  id: 'order_refound', name: '무너진 기사단을 다시 세운다', icon: 'sword',
  desc: '흩어진 기사단의 이름과 깃발을 다시 올린다. 돈과 이름이 있어야 한다.',
  available: (g) => free(g) && NEW_ORDERS.some((id) => ORDERS[id].seat === here(g) && canRefound(g, id)),
  run(g, rng) {
    const id = NEW_ORDERS.find((x) => ORDERS[x].seat === here(g) && canRefound(g, x));
    const o = orderOf(g, id), O = ORDERS[id];
    g.player.money -= 200;
    o.fallen = null; o.heresy = null; o.strength = 30; o.wealth = 15; o.suspect = 0; o.founded = g.date.year;
    startService(g, rng, id, 1);
    facOf(g, id).rank = 2;
    S(g).me.master = true;
    o.master = { name: g.player.name, born: g.date.year - age(g), pid: me(g).id };
    g.player.title = '경';
    L(g).renown = (L(g).renown ?? 0) + 10;
    note(g, `${J(O.name, '을/를')} 다시 세우고 단장이 되었다.`);
    chron(g, `${nm(g)}, 흩어졌던 ${J(O.name, '을/를')} 다시 세우다.`, 90);
    const kin = servedBefore(g, id).length ? ` 선대가 걸었던 ${J(O.banner, '을/를')} 다락에서 꺼냈다.` : '';
    return `은화 이백 닢으로 무너진 성채 한쪽을 사들였다.${kin} 깃발이 다시 올라가자 흩어졌던 늙은 기사 셋이 어디선가 찾아왔다. 그들의 망토는 낡았지만 접은 자국은 반듯했다.`;
  },
});

/* ---------- 달마다: 서임·계율·형제·왕국 기사단 잇기 ---------- */
export function orderMonth(g, rng) {
  const st = S(g);
  // 왕국 기사단: 이미 있는 소속을 따라 들어오고 나간다
  if (royalMember(g) && !st.me) startService(g, rng, 'royal');
  if (st.me?.id === 'royal' && !L(g).fac?.knights?.member) endService(g, '기사단 일을 그만둠');
  const m = st.me;
  if (!m || !free(g)) return;
  // 계급 오르기 (새 기사단)
  if (readyToDub(g) && !sceneQueued(g, 'order_dub')) queueScene(g, 'order_dub', {});
  if (readyToCaptain(g)) {
    facOf(g, m.id).rank = 2;
    L(g).renown = (L(g).renown ?? 0) + 3;
    note(g, `${orderName(m.id)}의 기사대장이 되었다.`);
    logOrder(g, '기사대장이 되었다.');
  }
  // 서약
  if (mi(g) - (st.vowAt ?? 0) >= 6) {
    if (m.id === 'stigma' && married(g) && m.hidden !== 'marriage' && !sceneQueued(g, 'order_vow')) { queueScene(g, 'order_vow', { id: m.id, kind: 'marriage' }); st.vowAt = mi(g); }
    else if (m.id === 'stigma' && g.player.money >= 250 && m.hidden !== 'wealth' && !sceneQueued(g, 'order_vow')) { queueScene(g, 'order_vow', { id: m.id, kind: 'wealth' }); st.vowAt = mi(g); }
    else if ((L(g).notoriety ?? 0) >= (m.notoAt ?? 0) + 15 && !sceneQueued(g, 'order_vow')) { queueScene(g, 'order_vow', { id: m.id, kind: 'shame' }); st.vowAt = mi(g); }
    m.notoAt = Math.max(m.notoAt ?? 0, L(g).notoriety ?? 0);
  }
  // 숨긴 것이 드러난다
  if (m.hidden && rng.chance(0.03)) {
    const name = myOrderName(g);
    st.expelled[m.id] = g.date.year;
    endService(g, '숨긴 일이 드러나 쫓겨남');
    note(g, `숨긴 일이 드러나 ${name}에서 쫓겨났다.`);
    queueScene(g, 'order_news', { text: `숨겨 온 일이 고해 장부보다 먼저 성채에 닿았다. 단장이 망토를 벗겼다. 형제들은 아무도 변호하지 않았다. ${name}의 문은 이제 닫혔다.` });
    return;
  }
  // 형제 사이의 일 (여덟 달에 한 번쯤)
  if (atSeat(g) && mi(g) - (st.brotherAt ?? 0) >= 8 && brothers(g).length && rng.chance(0.25) && !sceneQueued(g, 'order_brother')) {
    const evs = ['wound', 'debt', 'doubt', 'letter', 'duel'];
    const b = rng.pick(brothers(g));
    queueScene(g, 'order_brother', { ev: rng.pick(evs), bid: b.id });
    st.brotherAt = mi(g);
  }
  // 형제의 죽음 (싸움터에서): 드물게
  if (m.id !== 'royal' && brothers(g).length && rng.chance(0.006)) {
    const b = rng.pick(brothers(g));
    kill(g, b, m.id === 'march' ? '성벽 너머 토벌' : '순례길 도적');
    note(g, `형제 기사 ${J(b.name, '이/가')} 죽었다.`);
    queueScene(g, 'order_news', { text: `${J(b.name, '이/가')} ${m.id === 'march' ? '성벽 너머에서' : '순례길 고개에서'} 돌아오지 못했다. 형제들이 그의 망토를 제단에 올리고 밤을 새웠다. ${m.id === 'march' ? '셋째 성벽에 이름이 하나 더 새겨졌다.' : '단장이 그의 이름을 기도문에 넣었다.'}` });
  }
}
defineScene('order_news', {
  need: () => true,
  title: () => '기사단 소식',
  text: (g, s) => s.text,
  choices: () => [{ label: '고개를 숙인다', key: 'ok' }],
  resolve: () => '',
});

HOOKS.heir.push((g, rng, old) => {
  const st = OS(g);
  if (st.me) {
    // 선대의 기사 생활을 기록에 남긴다 (이름은 선대의 것)
    st.past.push({ id: st.me.id, rank: st.me.master ? '단장' : '기사', from: st.me.joined?.[0] ?? g.date.year, to: g.date.year, how: '기사로 세상을 떠남', name: old?.name ?? '선대' });
    st.me = null;
  }
  st.retired = null;
});
