// 망자와 저주 속에서 사는 일: 흉한 자리를 찾아가 지켜보고, 사연을 캐고, 넋을 달래거나 무덤을 턴다.
// 시골 영매에게 죽은 어른의 말을 청하고, 넋 달래는 법을 배워 굿을 해 주거나 겁을 주고 부적을 판다.
// 저주받은 물건과 집안의 저주를 떼어 내고, 아주 드물게 봉인의 힘이 들어찬 망령과 마주한다.
import { ACTIONS } from '../actions.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J, hasBatchim } from '../narrative/text.js';
import { gainStat } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress, spend, canSpend } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { playerPower } from '../adventure/combat.js';
import { deed } from '../repute/index.js';
import { faithState } from '../faith/index.js';
import { TS as towerState } from '../tower/state.js';
import { feudState } from '../feud/index.js';
import { elderState } from '../elder/index.js';
import { byId, kill, ageYears } from '../npc.js';
import { isMarket } from '../trade/core.js';
import {
  HS, KINDS, GRIEFS, ITEMS, ITEM_IDS, CURSES, MEDIUMS, EXORCISTS, CHURCH_REALMS, clamp, mi, placeName, hlog, spotsAt, realmOfPlace, powerWord, curseWord,
} from './state.js';
import { hauntRng, laySpot } from './world.js';

const here = (g) => L(g).place;
export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const st = (g, k) => g.player.stats[k] ?? 0;
const spot = (g, id) => HS(g).spots[id] ?? null;
const live = (s) => !!s && (s.state === 'quiet' || s.state === 'restless');
const at = (g, s) => live(s) && free(g) && here(g) === s.place;
const ira = (n) => `${n}${hasBatchim(n) ? '이라는' : '라는'}`;
const medium = (g) => HS(g).me.medium ?? 0;
const necro = (g) => (g.tower ? towerState(g).forbidden?.necro ?? 0 : 0);
const holy = (g) => (g.faith && faithState(g).god === 'solar' ? faithState(g).holy ?? 0 : 0);
const churchy = (g) => CHURCH_REALMS.includes(realmOfPlace(here(g)));
// 교단의 땅에서 영매 일을 하면 수군거림이 는다
const whisper = (g, n) => { if (g.faith && churchy(g)) faithState(g).suspicion = clamp((faithState(g).suspicion ?? 0) + n, 0, 100); };
const taint = (g, n) => { if (g.tower) towerState(g).taint = clamp((towerState(g).taint ?? 0) + n, 0, 100); };
// 이 고장 영매는 진짜인가 (처음 찾아갈 때 정해지고, 밝혀지면 떠난다)
function mediumOf(g, pl) {
  if (!MEDIUMS[pl]) return null;
  const H = HS(g);
  H.mediums ??= {};
  if (!H.mediums[pl]) H.mediums[pl] = { fake: hauntRng(g, pl.length * 7 + 3).chance(0.4), gone: 0 };
  const m = H.mediums[pl];
  if (m.gone && mi(g) - m.gone > 60) { m.gone = 0; m.fake = hauntRng(g, 11).chance(0.4); } // 몇 해 뒤 다른 사람이 그 자리에 앉는다
  return m.gone ? null : m;
}
function gainItem(g, kind, from = null, power = 50) {
  const H = HS(g);
  const it = { id: H.seq++, kind, name: ITEMS[kind].name, from, power, since: mi(g) };
  H.items.push(it); H.me.items += 1;
  if (H.items.length > 4) H.items.shift();
  return it;
}
function setCurse(g, kind, by, why, power) {
  const H = HS(g);
  if (H.curse) { H.curse.power = clamp(H.curse.power + Math.round(power / 3), 0, 100); return H.curse; }
  H.curse = { kind, by, why, power, gen: L(g).gen ?? 1, since: mi(g), place: here(g), known: false };
  H.me.cursed += 1;
  hlog(g, `집안에 저주가 들었다: ${why}.`);
  return H.curse;
}
function liftCurse(g, how) {
  const H = HS(g);
  if (!H.curse) return;
  hlog(g, `${J(CURSES[H.curse.kind]?.name ?? '집안의 저주', '을/를')} 풀었다 (${how}).`);
  H.curse = null; H.me.lifted += 1;
  note(g, `집안의 저주를 풀었다. ${how}`);
}
const ITEM_FROM = { house: ['ring', 'mirror', 'locket'], grave: ['ring', 'locket', 'doll'], mine: ['coin'], field: ['sword'], hamlet: ['doll', 'mirror'], well: ['ring', 'locket'] };

/* ---------- 흉한 자리를 찾아간다 ---------- */
ACTIONS.push({
  id: 'haunt_visit', name: '흉한 자리를 찾아간다', icon: 'wander',
  desc: '이 고장에서 귀신이 나온다는 집, 버려진 묘지, 막아 둔 우물을 찾아간다. 대개는 헛소문이다. 대개는.',
  available: (g) => free(g) && spotsAt(g, here(g)).length > 0 && !sceneQueued(g, 'haunt_spot'),
  run(g, rng) {
    const ids = spotsAt(g, here(g));
    const H = HS(g);
    const id = ids.find((k) => H.spots[k].wraith) ?? ids.find((k) => H.spots[k].known < 2) ?? rng.pick(ids);
    const s = H.spots[id];
    H.me.visits += 1;
    tired(g, 6);
    queueScene(g, 'haunt_spot', { spot: id }, { first: true });
    if (s.wraith) return `${J(s.name, '으로/로')} 가는 길에 사람이 없다. 대낮인데도 개 짖는 소리 하나 들리지 않는다.`;
    return rng.pick([`해 질 녘에 ${s.name} 앞에 섰다. 동네 아이들이 멀찍이서 지켜본다.`, `${s.name}. 사람들이 손가락으로 가리키기만 하고 이름은 부르지 않는 곳이다.`, `${s.name}까지 길을 물었다. 가르쳐 준 노인이 내 소매를 한 번 잡았다가 놓았다.`]);
  },
});
const KIND_TEXT = {
  house: '문짝 하나가 바람에 삐걱인다. 창문은 안에서 판자로 막혀 있다.',
  grave: '묘비들이 기울어 있다. 몇은 이름이 닳아 읽을 수 없다.',
  well: '돌 뚜껑이 덮여 있고, 그 위에 누가 마른 꽃을 놓고 갔다.',
  field: '갈대 사이로 녹슨 쇳조각이 보인다. 까마귀들이 내려앉지 않는다.',
  mine: '무너진 갱도 입구를 널빤지로 막아 두었다. 틈새로 찬 바람이 나온다.',
  hamlet: '지붕이 내려앉은 집들 사이로 잡초가 허리까지 자랐다. 우물 두레박만 새것이다.',
};
defineScene('haunt_spot', {
  title: (g, s) => spot(g, s.spot)?.name ?? '흉한 자리',
  text: (g, d) => {
    const s = spot(g, d.spot);
    if (!live(s)) return '그 자리는 이제 조용하다. 흉한 이야기도 더는 돌지 않는다.';
    const G = GRIEFS[s.dead.grief];
    let t = `${KIND_TEXT[s.kind] ?? ''} ${ira(s.dead.name)} 사람이 ${s.dead.how}고 한다.`;
    if (s.wraith) t += ` 이제 그것은 되풀이하지 않는다. 문간까지 와서 산 사람의 이름을 부른다. 벌써 ${s.hurt}명이 죽었다. 숨을 쉴 때마다 하얀 김이 나온다. 여름인데도.`;
    else if (s.known >= 1 && s.real) t += ` 밤을 새워 본 적이 있다. 여기엔 정말 무엇인가 남아 있다. 잔향이 ${powerWord(s.power)}.`;
    else if (s.known >= 1) t += ' 밤을 새워 보았지만 아무것도 없었다. 그래도 사람들은 믿는다.';
    if (s.known >= 2 && !s.wraith) t += ` 죽은 이는 ${G.word}. 넋을 달래려면 ${G.ask}.`;
    return t.trim();
  },
  choices: (g, d) => {
    const s = spot(g, d.spot);
    if (!at(g, s)) return [];
    const G = GRIEFS[s.dead.grief];
    if (s.wraith) {
      return [
        { label: '망령에 맞선다', key: 'face' },
        ...(holy(g) >= 40 ? [{ label: '신성력으로 망령을 흩는다', key: 'pray' }] : []),
        { label: '물러난다', key: 'leave' },
      ];
    }
    return [
      ...(s.known < 1 ? [{ label: '밤을 새워 지켜본다', key: 'watch' }] : []),
      ...(s.known < 2 ? [{ label: '동네 노인들에게 사연을 캐묻는다', key: 'ask' }] : []),
      ...(necro(g) >= 1 && s.known < 2 ? [{ label: '죽은 자의 목소리를 듣는다 (금지된 술)', key: 'listen' }] : []),
      ...(s.known >= 2 && canSpend(g, G.cost) ? [{ label: `넋을 달랜다: ${G.ask}${G.cost ? ` (은화 ${G.cost}닢)` : ''}`, key: 'lay' }] : []),
      ...(EXORCISTS.includes(s.place) && canSpend(g, 20) ? [{ label: '교단 사제를 불러 정화를 청한다 (은화 20닢)', key: 'priest' }] : []),
      ...(holy(g) >= 25 ? [{ label: '내 신성력으로 정화한다', key: 'pray' }] : []),
      ...(s.kind !== 'well' && s.robbed < 2 ? [{ label: '값나가는 것을 뒤져 챙긴다', key: 'rob' }] : []),
      { label: '돌아선다', key: 'leave' },
    ];
  },
  resolve(g, rng, d, key) {
    const H = HS(g), s = spot(g, d.spot);
    if (!live(s)) return '그 자리는 이미 조용해져 있었다.';
    if (here(g) !== s.place) return '그곳에서 너무 멀어졌다.';
    const G = GRIEFS[s.dead.grief];
    if (key === 'leave') return s.wraith ? '뒤를 보지 않고 걸었다. 등 뒤에서 누가 내 이름을 한 번 불렀다. 대답하지 않았다.' : '돌아섰다. 몇 걸음 가다 한 번 돌아보았다. 아무것도 없었다.';
    if (key === 'watch') {
      tired(g, 20);
      if (!s.real) {
        if (check(rng, st(g, 'sen') + st(g, 'wil') / 2, 45)) {
          s.state = 'gone'; H.me.exposed += 1; renown(g, 3);
          H.dread[s.place] = clamp((H.dread[s.place] ?? 0) - 12, 0, 100);
          deed(g, 'brave', 3, `${J(g.player.name, '이/가')} ${s.name}의 귀신 소문을 밝혀냈다더라`, s.place);
          hlog(g, `${s.name}: 헛소문을 밝혔다 (${s.truth}).`);
          return `자정이 지나 소리가 났다. 숨어서 기다렸다. 알고 보니 ${s.truth}. 다음 날 장터에서 그 이야기를 했다. 웃는 사람도, 화를 내는 사람도 있었다.`;
        }
        s.known = 1;
        return '밤새 지켜보았다. 바람 소리, 쥐 소리, 내 숨소리. 그것뿐이었다. 그런데도 무엇이 소문을 만들었는지는 끝내 알 수 없었다.';
      }
      s.known = 1;
      if (check(rng, st(g, 'wil') + medium(g) / 2, 20 + s.power / 2)) {
        stress(g, 5);
        return `자정 무렵 공기가 차가워졌다. ${s.kind === 'mine' ? '막힌 갱도 안에서 돌을 두드리는 소리가 났다. 세 번, 쉬고, 세 번.' : s.kind === 'well' ? '우물 뚜껑 밑에서 물 긷는 소리가 났다. 두레박은 매달려 있었다.' : s.kind === 'field' ? '갈대밭 위로 발소리가 줄 맞춰 지나갔다. 아무도 없었다.' : '방 안쪽에서 누가 같은 말을 되풀이했다. 알아들을 수는 없었다.'} 같은 일이 세 번 되풀이되고 멎었다. 나를 본 것 같지는 않았다. 그것은 아무것도 보지 않는다. 그날을 되풀이할 뿐이다.`;
      }
      stress(g, 12);
      if (s.power >= 60 && rng.chance(0.4)) injure(g, '흉가에서 정신을 놓고 넘어져 다친 머리', 2);
      return '자정 무렵 숨이 막혔다. 남의 마지막 숨이 내 가슴에 들어온 것 같았다. 정신을 차려 보니 새벽이었고, 나는 문밖 흙바닥에 누워 있었다.';
    }
    if (key === 'ask') {
      tired(g, 6);
      if (check(rng, st(g, 'cha') + st(g, 'int') / 2, 30)) {
        s.known = 2;
        return `늙은 사람들은 처음엔 입을 다물었다. 술 한 병이 돌고 나서야 이야기가 나왔다. ${s.dead.name}. ${s.dead.how}. ${G.word}. "그러니 떠나지 못하는 거지." 노파 하나가 말했다. "그걸 해 줄 사람이 없으니."`;
      }
      return '다들 모른다고 했다. 모르는 얼굴이 아니었다.';
    }
    if (key === 'listen') {
      taint(g, 4); whisper(g, 3); tired(g, 12);
      if (!s.real) {
        s.state = 'gone'; H.me.exposed += 1;
        hlog(g, `${s.name}: 헛소문이었다 (${s.truth}).`);
        return `죽은 자의 술식을 그었다. 들려오는 목소리가 없었다. 처음부터 아무도 없었던 것이다. 며칠 동안 캐 보니 ${s.truth}.`;
      }
      s.known = 2; s.power = clamp(s.power + 5, 0, 100);
      return `술식이 닿자 목소리가 왔다. 말이라기보다 마지막 날의 마음 한 덩이였다. ${s.dead.name}. ${s.dead.how}. ${G.word}. 손끝이 오래 차가웠다.`;
    }
    if (key === 'lay') {
      if (G.cost && !spend(g, G.cost)) return '드는 돈이 모자랐다.';
      tired(g, 15);
      if (!s.real) {
        laySpot(g, d.spot, '내가 넋을 달랬다 (헛소문이었지만 사람들은 마음을 놓았다).');
        H.me.laid += 1; deed(g, 'kind', 3, `${J(g.player.name, '이/가')} ${s.name}의 넋을 달랬다더라`, s.place);
        return '정성을 다했다. 아무 일도 일어나지 않았다. 처음부터 아무것도 없었을지도 모른다. 그래도 그 뒤로 사람들은 그 앞을 지날 때 걸음을 늦추지 않았다.';
      }
      const need = s.dead.grief === 'wrong' ? 45 + s.power / 4 : 25 + s.power / 3;
      const pow = s.dead.grief === 'wrong' ? st(g, 'int') + st(g, 'cha') / 2 : st(g, 'wil') + medium(g) / 2 + 10;
      if (check(rng, pow, need)) {
        laySpot(g, d.spot, '내가 넋을 달랬다.');
        H.me.laid += 1; renown(g, 4);
        deed(g, s.dead.grief === 'wrong' ? 'honest' : 'kind', 6, `${J(g.player.name, '이/가')} ${s.name}에 남은 ${s.dead.name}의 넋을 달랬다더라`, s.place);
        if (s.dead.grief === 'wrong') chron(g, `${g.player.name}, ${placeName(s.place)}에서 ${s.dead.name}의 억울한 죽음을 밝히다.`, 25);
        return `${G.ask.replace(/준다$/, '주었다.').replace(/말한다$/, '말했다.').replace(/태운다$/, '태웠다.')} 그날 밤 ${J(s.name, '은/는')} 조용했다. 다음 날 밤도. 그 앞에 마른 꽃을 놓고 가던 노파가 내 손을 잡고 아무 말도 하지 않았다.`;
      }
      s.power = clamp(s.power - 15, 0, 100);
      return s.dead.grief === 'wrong' ? '이름 몇을 대며 사람들 앞에서 말했지만 증거가 모자랐다. 사람들은 고개를 저었다. 그래도 그날 밤은 소리가 조금 낮았다.' : '할 수 있는 만큼 했다. 잔향은 조금 엷어졌지만 아직 남아 있다. 무엇인가 모자랐다.';
    }
    if (key === 'priest') {
      if (!spend(g, 20)) return '사제에게 드릴 헌금이 모자랐다.';
      if (!s.real || s.power < 60) { laySpot(g, d.spot, '교단 사제가 정화 의식을 올렸다.'); return '사제가 성수를 뿌리고 솔라의 기도문을 읽었다. 향 냄새가 오래 남았다. 그 뒤로 흉한 이야기는 돌지 않았다.'; }
      s.power = clamp(s.power - 25, 0, 100);
      return '사제가 기도문을 읽는 동안 촛불이 한쪽으로만 누웠다. 사제는 땀을 닦으며 "한 번으로는 안 되겠습니다" 했다. 잔향이 조금 엷어졌다.';
    }
    if (key === 'pray') {
      tired(g, 20); faithState(g).devotion = clamp(faithState(g).devotion + 2, 0, 100);
      if (s.wraith) {
        if (check(rng, holy(g) + st(g, 'wil') / 2, 95)) return wraithDown(g, d.spot, '솔라의 이름으로 빛을 끌어내렸다. 망령이 빛 속에서 사람의 얼굴을 잠깐 되찾았다가 흩어졌다.');
        injure(g, '망령의 손이 닿은 자리의 얼어 터진 살', 5);
        if (rng.chance(0.2)) L(g).pendingDeath = '망령의 손';
        return '기도문의 셋째 줄에서 목소리가 얼어붙었다. 빛은 나오지 않았다. 차가운 손이 가슴을 짚었다. 누군가 나를 끌어내었다.';
      }
      if (!s.real || check(rng, holy(g) + st(g, 'wil') / 2, 30 + s.power / 2)) { laySpot(g, d.spot, '내 신성력으로 정화했다.'); H.me.laid += 1; deed(g, 'kind', 3, `${J(g.player.name, '이/가')} ${J(s.name, '을/를')} 정화했다더라`, s.place); return '무릎을 꿇고 손바닥을 땅에 댔다. 손끝에서 따뜻한 빛이 번졌다. 차가운 기운이 녹듯 물러났다.'; }
      s.power = clamp(s.power - 10, 0, 100);
      return '빛은 나왔지만 오래 버티지 못했다. 잔향이 조금 엷어졌을 뿐이다.';
    }
    if (key === 'rob') {
      s.robbed += 1; H.me.robbed += 1; tired(g, 10);
      const got = rng.int(3, 14) + (s.kind === 'house' ? 6 : 0);
      g.player.money += got;
      if (rng.chance(0.3)) deed(g, 'honest', -5, `${J(g.player.name, '이/가')} ${J(s.name, '을/를')} 뒤져 물건을 챙겼다더라`, s.place);
      if (!s.real) return `썩은 마루와 흙을 뒤졌다. 은화 ${got}닢어치 쓸 만한 것이 나왔다. 아무 일도 없었다.`;
      s.power = clamp(s.power + 15, 0, 100);
      let t = `은화 ${got}닢어치를 챙겼다. 나오는 길에 등 뒤 공기가 차가워졌다.`;
      if (rng.chance(0.45)) { const it = gainItem(g, rng.pick(ITEM_FROM[s.kind] ?? ITEM_IDS), d.spot, clamp(s.power, 30, 80)); t += ` 그리고 ${J(it.name, '을/를')} 손에 쥐고 있었다. 언제 집었는지 기억나지 않는다.`; }
      if (s.power >= 55 && rng.chance(s.kind === 'grave' ? 0.3 : 0.15)) { setCurse(g, 'grave', s.dead.name, `${J(s.name, '을/를')} 뒤진 손에 ${s.dead.name}의 원념이 따라붙었다`, 45); t += ' 그날부터 집안 아이들이 밤마다 깨어 운다.'; }
      return t;
    }
    if (key === 'face') {
      tired(g, 35); stress(g, 15); H.me.faced += 1;
      if (check(rng, playerPower(g) / 2 + st(g, 'wil') + holy(g) / 2 + medium(g) / 2, 90)) return wraithDown(g, d.spot, `${s.dead.name}의 이름을 크게 부르며 다가갔다. 그것이 멈췄다. 이름이 그것을 잠깐 사람으로 돌려놓았다. 그 틈에 그것이 붙들려 있던 자리를 찾아 흙과 소금을 덮었다. 차가운 바람이 한 번 지나가고 끝났다.`);
      injure(g, '망령에 닿아 얼어 터진 살', 5);
      if (rng.chance(0.25)) L(g).pendingDeath = '망령의 손';
      return '다가가자 그것이 내 이름을 불렀다. 대답할 뻔했다. 다리가 굳었다. 누군가 내 어깨를 잡아끌어 길 밖으로 내던졌다. 그 사람의 얼굴을 기억하지 못한다.';
    }
    return '돌아섰다.';
  },
});
function wraithDown(g, id, text) {
  const H = HS(g), s = spot(g, id);
  laySpot(g, id, '내가 망령을 흩었다.');
  H.me.wraiths += 1; renown(g, 15);
  deed(g, 'brave', 10, `${J(g.player.name, '이/가')} ${placeName(s.place)}의 망령을 흩었다더라`, s.place);
  chron(g, `${g.player.name}, ${placeName(s.place)}의 망령을 흩다.`, 50);
  note(g, `${placeName(s.place)}의 망령을 흩었다.`);
  return text;
}

/* ---------- 영매 ---------- */
ACTIONS.push({
  id: 'haunt_medium', name: '영매를 찾아간다', icon: 'pray',
  desc: '대지의 어머니와 조상을 모시는 시골 영매를 찾아간다. 죽은 어른의 말을 청하거나, 집안의 저주를 묻거나, 넋 달래는 법을 배운다. 진짜도 있고 사기꾼도 있다.',
  available: (g) => free(g) && !!mediumOf(g, here(g)) && !sceneQueued(g, 'haunt_medium'),
  run(g) { const m = MEDIUMS[here(g)]; queueScene(g, 'haunt_medium', { place: here(g) }, { first: true }); return `${J(m.name, '을/를')} 찾았다. ${m.open ? '문 앞에 사람들이 줄을 서 있다.' : '해가 진 뒤에 뒷문으로 오라고 했다.'}`; },
});
const lastGrave = (g) => [...(g.elder ? elderState(g).graves : [])].reverse().find((x) => x.byPlayer && x.kind !== 'ash') ?? null;
defineScene('haunt_medium', {
  title: (g, s) => MEDIUMS[s.place]?.name ?? '영매',
  text: (g, s) => {
    const M = MEDIUMS[s.place];
    if (!M) return '영매는 떠나고 없었다.';
    return `${M.open ? '연기 자욱한 방에 말린 풀과 짐승 뼈가 걸려 있다.' : '창을 가린 좁은 방. 교단의 눈을 피해 사는 사람이다.'} 영매는 손님의 손을 먼저 잡아 본다. ${medium(g) >= 30 ? '이제 나는 손 잡는 법만 보고도 이 사람이 무엇을 하는지 조금은 안다.' : ''}`.trim();
  },
  choices: (g, s) => {
    const m = mediumOf(g, s.place);
    if (!m || !free(g) || here(g) !== s.place) return [];
    return [
      ...(lastGrave(g) && canSpend(g, 5) ? [{ label: '돌아가신 집안 어른의 말을 청한다 (은화 5닢)', key: 'ancestor' }] : []),
      ...(canSpend(g, 8) ? [{ label: '집안에 저주가 있는지 봐 달라고 한다 (은화 8닢)', key: 'curse' }] : []),
      ...(canSpend(g, 10) ? [{ label: '넋 달래는 법을 배운다 (은화 10닢)', key: 'learn' }] : []),
      { label: '속임수가 있는지 캐 본다', key: 'expose' },
      { label: '그냥 나온다', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    const H = HS(g), m = mediumOf(g, s.place);
    if (!m) return '영매는 이미 떠나고 없었다.';
    if (key === 'leave') return '향 냄새가 옷에 배었다.';
    if (key === 'ancestor') {
      const gr = lastGrave(g);
      if (!gr || !spend(g, 5)) return '청할 말이 없었다.';
      stress(g, -6);
      if (m.fake) return `영매가 눈을 뒤집고 떨었다. "${gr.name}께서 너를 자랑스러워하신다. 다만 재물 운이 막혔으니 부적을 하나…" 위로는 되었다. 무엇을 들었는지는 모르겠다.`;
      const tended = gr.tended ?? 50;
      return `영매가 오래 말이 없었다. 그러다 내가 모르는 버릇으로 손가락을 두드렸다. ${gr.name}의 버릇이었다. "${tended < 30 ? '무덤에 풀이 많다. 그건 괜찮다. 다만 이름을 잊지 마라.' : gr.cause ? '아프지 않았다고 전해라. 다 지난 일이다.' : '할 말은 살아 있을 때 다 했다.'}" 영매는 그 뒤로 아무것도 기억하지 못했다. 잔향인지, 영매의 눈치인지 알 수 없다. 그래도 그 버릇은 진짜였다.`;
    }
    if (key === 'curse') {
      if (!spend(g, 8)) return '복채가 모자랐다.';
      const C = H.curse;
      if (m.fake) {
        if (!C) return `영매가 비명을 질렀다. "검은 것이 집 위에 앉아 있다!" 부적 값으로 은화 스무 닢을 불렀다. 사지 않았다. 나중에 들으니 오는 사람마다 그 말을 한다고 한다.`;
        return '"무엇인가 있긴 하다." 영매는 그 말만 되풀이했다. 무엇인지, 어떻게 푸는지는 말하지 못했다.';
      }
      if (!C) return '영매가 내 손을 놓았다. "없다. 그런 데 쓸 돈으로 아이들 신이나 사 줘라."';
      C.known = true;
      return `영매가 손을 잡자마자 놓았다. "${CURSES[C.kind]?.name ?? '저주'}. ${C.why}. ${curseWord(C.power)}. 대를 넘을 때마다 엷어지지만, 그냥 두면 손주 대까지는 간다. 성당의 큰 의식이든, 넋 풀이 굿이든, 시작된 자리에서 빌든, 하나는 해야 한다."`;
    }
    if (key === 'learn') {
      if (!spend(g, 10)) return '배울 값이 모자랐다.';
      tired(g, 15); whisper(g, MEDIUMS[s.place].open ? 1 : 4);
      gainStat(g, 'wil', 0.3);
      if (m.fake) { H.me.medium = clamp(H.me.medium + 2, 0, 100); H.me.tricks = (H.me.tricks ?? 0) + 1; return '방울 흔드는 법, 눈을 뒤집는 법, 손님의 옷차림으로 집안 사정을 읽는 법을 배웠다. 넋 달래는 법이라기보다는 장사하는 법이었다.'; }
      H.me.medium = clamp(H.me.medium + 6, 0, 100);
      return rng.pick(['죽은 이의 이름을 세 번 부르는 법을 배웠다. 첫 번은 산 사람을 위해, 둘째는 죽은 사람을 위해, 셋째는 놓아 보내려고.', '잔향이 짙은 곳에서는 숨을 고르게 쉬라고 했다. 그것은 숨이 가쁜 사람을 따라온다고.', '"죽은 이는 말을 하지 않는다. 남은 마음이 되풀이될 뿐이다. 그 마음이 무엇을 놓지 못하는지 알아내는 것이 우리 일이다."', '소금과 흙과 이름. 이 셋이면 대개는 된다고 했다. 대개는.']);
    }
    if (key === 'expose') {
      tired(g, 5);
      if (m.fake && check(rng, st(g, 'sen') + st(g, 'int') / 2 + medium(g) / 3, 50)) {
        m.gone = mi(g); H.me.exposed += 1; renown(g, 2);
        deed(g, 'honest', 4, `${J(g.player.name, '이/가')} ${s.place === 'ern' ? '마을' : placeName(s.place)}의 가짜 영매를 들춰냈다더라`, s.place);
        hlog(g, `${placeName(s.place)}의 가짜 영매를 들춰냈다.`);
        return '방울 소리가 날 때마다 휘장 뒤에서 아이 하나가 끈을 당기고 있었다. 영매가 다음 날 고장을 떴다. 속은 사람들 가운데 몇은 나를 원망했다. 믿고 싶었던 것이다.';
      }
      if (m.fake) return '눈여겨보았지만 꼬리를 잡지 못했다. 영매가 나를 보며 웃었다.';
      return '아무리 보아도 속임수가 없었다. 영매가 내 눈을 오래 보더니 말했다. "의심하는 건 좋다. 우리 일의 절반은 가짜니까."';
    }
    return '그냥 나왔다.';
  },
});

/* ---------- 굿을 해 주고 삯을 받는다 ---------- */
ACTIONS.push({
  id: 'haunt_rite', name: '넋 달래는 굿을 해 준다', icon: 'coin',
  desc: '영매에게 배운 것으로 흉흉한 집에 굿을 해 주고 삯을 받는다. 정성껏 할 수도, 겁을 주고 부적을 팔 수도 있다. 교단의 땅에서는 눈에 띈다.',
  available: (g) => free(g) && medium(g) >= 15 && ((HS(g).dread[here(g)] ?? 0) >= 12 || spotsAt(g, here(g)).length > 0) && !sceneQueued(g, 'haunt_rite'),
  run(g) { queueScene(g, 'haunt_rite', { place: here(g) }, { first: true }); return '흉한 일이 있었다는 집에서 사람이 왔다. 굿을 해 달라고 한다.'; },
});
defineScene('haunt_rite', {
  title: () => '넋 달래는 굿',
  text: (g) => `${churchy(g) ? '창을 가리고 소리를 낮춰야 하는 땅이다. ' : ''}집주인은 밤마다 누가 문을 긁는다고 했다. 아이들이 내 소매를 잡고 놓지 않는다. 진짜인지 아닌지는 아직 모른다. 집주인은 둘 중 무엇이든 믿을 준비가 되어 있다.`,
  choices: (g, s) => {
    if (!free(g) || here(g) !== s.place) return [];
    return [
      { label: '정성껏 넋을 달랜다', key: 'honest' },
      { label: '겁을 주고 비싼 부적을 판다', key: 'fake' },
      { label: '할 일이 없다고 말하고 돌려보낸다', key: 'refuse' },
    ];
  },
  resolve(g, rng, s, key) {
    const H = HS(g), pl = s.place;
    if (key === 'refuse') { deed(g, 'honest', 1, null, pl); return '"집에 아무것도 없습니다. 문을 긁는 건 바람과 들쥐입니다." 집주인은 반쯤 믿었다.'; }
    tired(g, 14); whisper(g, 3); H.me.rites += 1;
    if (key === 'honest') {
      const pay = rng.int(4, 9);
      g.player.money += pay; H.me.medium = clamp(H.me.medium + 1.2, 0, 100);
      const real = spotsAt(g, pl).map((id) => [id, H.spots[id]]).find(([, x]) => x.real && !x.wraith && x.power < 55);
      if (real && check(rng, st(g, 'wil') + medium(g), 60 + real[1].power / 2)) {
        laySpot(g, real[0], '내가 굿으로 넋을 달랬다.'); H.me.laid += 1;
        deed(g, 'kind', 4, `${J(g.player.name, '이/가')} ${real[1].name}의 넋을 굿으로 달랬다더라`, pl);
        return `밤새 이름을 부르고 소금과 흙을 놓았다. 새벽 무렵 ${real[1].name} 쪽에서 한숨 같은 바람이 한 번 불었다. 그 뒤로 조용하다. 삯으로 은화 ${pay}닢을 받았다.`;
      }
      H.dread[pl] = clamp((H.dread[pl] ?? 0) - 3, 0, 100);
      return `밤새 이름을 부르고 소금과 흙을 놓았다. 무엇이 있었는지는 끝내 모르겠다. 집주인은 다리를 뻗고 잤다고 했다. 은화 ${pay}닢을 받았다.`;
    }
    const pay = rng.int(12, 22);
    g.player.money += pay; H.me.fakes += 1;
    H.dread[pl] = clamp((H.dread[pl] ?? 0) + 2, 0, 100);
    if (rng.chance(0.08 + H.me.fakes * 0.03)) {
      g.player.money -= Math.min(g.player.money, pay * 2);
      deed(g, 'honest', -10, `${J(g.player.name, '이/가')} 겁을 주고 가짜 부적을 판다더라`, pl);
      H.me.fakes = Math.max(0, H.me.fakes - 2);
      return `부적 속에 넣은 것이 밀가루 반죽이라는 것이 들통났다. 동네 사람들 앞에서 받은 돈의 두 배를 물어 주었다. 사기꾼 무당이라는 말이 이웃 고장까지 갔다.`;
    }
    return `방울을 흔들고 눈을 뒤집었다. "검은 것이 들보에 앉아 있다." 집주인이 떨며 부적 값을 세었다. 은화 ${pay}닢. 돌아오는 길에 그 집 아이 얼굴이 떠올랐다.`;
  },
});

/* ---------- 저주받은 물건 ---------- */
ACTIONS.push({
  id: 'haunt_item', name: '저주받은 물건을 처리한다', icon: 'scroll',
  desc: '내가 지닌 저주받은 물건을 성당에 맡기거나, 본디 자리에 돌려주거나, 모르는 척 팔거나, 녹여 없앤다.',
  available: (g) => free(g) && HS(g).items.length > 0 && !sceneQueued(g, 'haunt_item'),
  run(g) { const it = HS(g).items[0]; queueScene(g, 'haunt_item', { item: it.id }, { first: true }); return `${J(it.name, '을/를')} 꺼내 탁자에 올려 두었다. 방이 조금 추워졌다.`; },
});
const itemOf = (g, id) => HS(g).items.find((x) => x.id === id) ?? null;
const dropItem = (g, id) => { const H = HS(g); H.items = H.items.filter((x) => x.id !== id); };
defineScene('haunt_item', {
  title: (g, s) => itemOf(g, s.item)?.name ?? '저주받은 물건',
  text: (g, s) => { const it = itemOf(g, s.item); if (!it) return '그 물건은 이제 없다.'; return `${ITEMS[it.kind].desc} 값으로 치면 은화 ${ITEMS[it.kind].value}닢은 받는다.`; },
  choices: (g, s) => {
    const it = itemOf(g, s.item);
    if (!it || !free(g)) return [];
    const src = it.from ? spot(g, it.from) : null;
    return [
      ...(EXORCISTS.includes(here(g)) && canSpend(g, 25) ? [{ label: '성당에 맡긴다 (헌금 은화 25닢)', key: 'church' }] : []),
      ...(live(src) && src.place === here(g) ? [{ label: `${src.name}에 돌려준다`, key: 'return' }] : []),
      ...(isMarket(here(g)) ? [{ label: `모르는 척 판다 (은화 ${Math.round(ITEMS[it.kind].value * 0.6)}닢쯤)`, key: 'sell' }] : []),
      { label: '불에 녹이거나 태워 없앤다', key: 'melt' },
      { label: '그냥 둔다', key: 'keep' },
    ];
  },
  resolve(g, rng, s, key) {
    const H = HS(g), it = itemOf(g, s.item);
    if (!it) return '그 물건은 이미 없었다.';
    if (key === 'keep') return '다시 천에 싸서 궤짝 밑에 넣었다.';
    if (key === 'church') { if (!spend(g, 25)) return '헌금이 모자랐다.'; dropItem(g, it.id); return `사제가 ${J(it.name, '을/를')} 납 상자에 넣고 봉인을 찍었다. 성당 지하에는 그런 상자가 백 개도 넘는다고 했다.`; }
    if (key === 'return') {
      const src = spot(g, it.from);
      dropItem(g, it.id);
      if (live(src)) { src.power = clamp(src.power - 25, 0, 100); if (src.power <= 25) laySpot(g, it.from, '가져간 물건을 돌려받고 잠잠해졌다.'); }
      deed(g, 'kind', 2, null, here(g));
      return `${J(it.name, '을/를')} 본디 자리에 내려놓았다. 손이 갑자기 가벼워졌다. ${live(src) ? '아직 무엇인가 남아 있지만, 전보다는 조용하다.' : '그 자리는 조용해졌다.'}`;
    }
    if (key === 'sell') {
      const got = Math.round(ITEMS[it.kind].value * 0.6);
      g.player.money += got; H.me.passed += 1; dropItem(g, it.id);
      deed(g, 'honest', -2, null, here(g));
      return `장물아비는 묻지 않았다. 은화 ${got}닢. 그것은 이제 누군가의 목에, 누군가의 손가락에 걸릴 것이다.`;
    }
    tired(g, 10);
    if (check(rng, st(g, 'wil') + medium(g) / 2 + holy(g) / 3, 20 + it.power / 2)) { dropItem(g, it.id); return `${J(it.name, '을/를')} 대장간 불에 던졌다. 불길이 한 번 파랗게 일었다. 대장장이가 성호를 그었다. 남은 것은 재와 쇠찌꺼기뿐이었다.`; }
    stress(g, 8);
    if (rng.chance(0.4)) injure(g, '불에 덴 손', 2);
    return `불에 던지려던 손이 멈췄다. 억지로 던졌다. 아침에 보니 ${J(it.name, '이/가')} 다시 궤짝 위에 있었다. 누가 꺼냈는지는 아무도 모른다.`;
  },
});

/* ---------- 집안의 저주를 푼다 ---------- */
const canLift = (g) => { const C = HS(g).curse; return !!C && (EXORCISTS.includes(here(g)) || !!mediumOf(g, here(g)) || C.place === here(g) || necro(g) >= 2); };
ACTIONS.push({
  id: 'haunt_lift', name: '집안의 저주를 풀러 간다', icon: 'pray',
  desc: '대를 이어 내려오는 저주를 떼어 낸다. 성당의 큰 정화 의식, 영매의 넋 풀이 굿, 저주가 시작된 자리에서 빌기, 또는 금지된 술.',
  available: (g) => free(g) && canLift(g) && !sceneQueued(g, 'haunt_lift'),
  run(g) { queueScene(g, 'haunt_lift', { place: here(g) }, { first: true }); return '집안 어른들이 입에 올리지 않던 일을 꺼내기로 했다.'; },
});
defineScene('haunt_lift', {
  title: () => '집안의 저주',
  text: (g) => { const C = HS(g).curse; if (!C) return '집안에 걸린 것은 이제 없다.'; return `${CURSES[C.kind]?.name ?? '저주'}. ${C.why}. ${C.gen < (L(g).gen ?? 1) ? `${(L(g).gen ?? 1) - C.gen}대 전에 시작되었다. ` : ''}${C.known ? `영매는 ${curseWord(C.power)}고 했다.` : '얼마나 무거운지는 모른다.'}`; },
  choices: (g, s) => {
    const C = HS(g).curse;
    if (!C || !free(g) || here(g) !== s.place) return [];
    const m = mediumOf(g, here(g));
    return [
      ...(EXORCISTS.includes(here(g)) && canSpend(g, 80) ? [{ label: '성당에서 큰 정화 의식을 올린다 (은화 80닢)', key: 'church' }] : []),
      ...(m && canSpend(g, 30) ? [{ label: '영매에게 넋 풀이 굿을 청한다 (은화 30닢)', key: 'medium' }] : []),
      ...(C.place === here(g) && canSpend(g, 40) ? [{ label: '저주가 시작된 자리에서 빌고 갚는다 (은화 40닢)', key: 'amends' }] : []),
      ...(necro(g) >= 2 ? [{ label: '죽은 자의 술로 원념을 묶는다', key: 'necro' }] : []),
      { label: '그만둔다', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    const H = HS(g), C = H.curse;
    if (!C) return '저주는 이미 풀려 있었다.';
    if (key === 'leave') return '아직은 아니다.';
    tired(g, 18);
    if (key === 'church') {
      if (!spend(g, 80)) return '헌금이 모자랐다.';
      const dev = g.faith ? faithState(g).devotion : 0;
      if (C.power < 55 || dev >= 60 || rng.chance(0.3)) { liftCurse(g, '성당에서 큰 정화 의식을 올렸다.'); return '사제 다섯이 사흘 동안 번갈아 기도했다. 집안 사람 모두가 성수에 이마를 적셨다. 마지막 날 막내가 처음으로 밤새 깨지 않고 잤다.'; }
      C.power = clamp(C.power - 25, 0, 100);
      return '의식은 사흘 동안 이어졌다. 사제장은 "엷어졌습니다"라고만 했다. 다 풀렸다고는 하지 않았다.';
    }
    if (key === 'medium') {
      if (!spend(g, 30)) return '굿 값이 모자랐다.';
      const m = mediumOf(g, here(g));
      if (!m || m.fake) { C.power = clamp(C.power - 3, 0, 100); return '방울과 북소리가 밤새 이어졌다. 영매는 다 풀렸다고 했다. 다음 달에도 아이들은 밤에 깨어 울었다.'; }
      C.power = clamp(C.power - 30, 0, 100);
      if (C.power < 15) { liftCurse(g, '영매의 넋 풀이 굿으로 풀었다.'); return `영매가 저주를 건 이의 이름을 불렀다. ${C.by}. 세 번째 부를 때 영매의 목소리가 다른 사람의 것으로 바뀌었다가 돌아왔다. "갔다." 영매는 그 말만 하고 쓰러져 잤다.`; }
      return '영매가 밤새 이름을 불렀다. 새벽에 땀에 젖어 고개를 저었다. "반은 떼었다. 나머지는 시간이 가져갈 거다."';
    }
    if (key === 'amends') {
      if (!spend(g, 40)) return '갚을 것이 모자랐다.';
      if (check(rng, st(g, 'cha') + st(g, 'wil') / 2, 25 + C.power / 2)) { liftCurse(g, '저주가 시작된 자리에서 빌고 갚았다.'); deed(g, 'honest', 4, null, here(g)); return `저주가 시작된 자리에 무릎을 꿇었다. ${C.by}의 남은 사람들에게 은화를 건네고, 할 말을 다 했다. 받는 사람의 손이 떨렸다. 그날 밤 꿈에 아무도 오지 않았다.`; }
      C.power = clamp(C.power - 15, 0, 100);
      return '무릎을 꿇었지만 받는 쪽이 돈을 바닥에 던졌다. 그래도 무엇인가 조금은 내려놓았다.';
    }
    if (key === 'necro') {
      taint(g, 10); whisper(g, 6);
      if (check(rng, st(g, 'int') + necro(g) * 10, 50)) { liftCurse(g, '죽은 자의 술로 원념을 묶어 땅에 묻었다.'); return '원념을 술식으로 묶어 납 상자에 넣고 땅에 묻었다. 풀린 것이 아니다. 묶인 것이다. 손끝이 한 달 내내 얼음 같았다.'; }
      H.curse = { ...C, kind: 'necro', why: '죽은 자의 술로 원념을 묶으려다 실패했다', power: clamp(C.power + 10, 0, 100) };
      return '술식이 원념을 잡는 순간 손아귀에서 미끄러졌다. 묶이지 않은 것이 이제 나를 똑똑히 안다.';
    }
    return '그만두었다.';
  },
});

/* ---------- 사건 ---------- */
EVENTS.push({
  id: 'haunt_fraud', cooldown: 18, weight: 7,
  chance: (g) => 0.25 + (HS(g).frauds[here(g)] ?? 0) * 0.15,
  cond: (g) => free(g) && ((HS(g).frauds[here(g)] ?? 0) > 0 || (HS(g).dread[here(g)] ?? 0) >= 25),
  title: '떠돌이 무당',
  text: () => '방울을 단 무당이 문 앞에 서더니 집 안을 들여다보고 얼굴을 찡그렸다. "이 집에 검은 것이 들었다. 막내가 밤에 우는 것도 그 탓이다. 부적 한 장이면 막는다. 은화 열두 닢."',
  choices: [
    { label: '부적을 산다 (은화 12닢)', show: (g) => canSpend(g, 12), run: (g) => { if (!spend(g, 12)) return '주머니가 비어 있었다.'; stress(g, -3); return '부적을 문설주에 붙였다. 마음은 조금 놓였다. 무당은 옆집 문을 두드리러 갔다.'; } },
    { label: '속임수를 따진다', run: (g, rng) => { const H = HS(g); if (check(rng, st(g, 'sen') + st(g, 'int') / 2 + (H.me.medium ?? 0) / 2, 50)) { H.frauds[here(g)] = Math.max(0, (H.frauds[here(g)] ?? 0) - 1); H.me.exposed += 1; deed(g, 'honest', 3, `${J(g.player.name, '이/가')} 떠돌이 무당의 속임수를 따져 쫓아냈다더라`, here(g)); return '부적에 쓴 글자가 아무 뜻도 없는 낙서라는 것을 동네 사람들 앞에서 짚었다. 무당은 욕을 퍼붓고 떠났다.'; } stress(g, 4); return '따졌지만 무당은 눈 하나 깜짝하지 않았다. "믿지 않는 집에는 더 큰 탈이 난다." 이웃들이 나를 걱정스레 보았다.'; } },
    { label: '문을 닫는다', run: () => '문을 닫았다. 문 너머에서 방울 소리가 한참 났다.' },
  ],
});
EVENTS.push({
  id: 'haunt_cursed_buy', cooldown: 48, weight: 5,
  chance: () => 0.3,
  cond: (g) => free(g) && isMarket(here(g)) && HS(g).items.length < 2,
  prepare: (g, rng) => ({ kind: rng.pick(ITEM_IDS) }),
  title: '싸게 나온 물건',
  text: (g, c) => `장터 구석의 늙은 행상이 천에 싼 것을 펼쳤다. ${ITEMS[c.kind].name}. 값을 들으니 터무니없이 싸다. 행상은 어서 넘기고 싶어 하는 얼굴이다. 손이 자꾸 그 물건에서 떨어진다.`,
  choices: [
    { label: '산다', show: (g, c) => canSpend(g, Math.round(ITEMS[c.kind].value * 0.25)), run: (g, rng, c) => { const cost = Math.round(ITEMS[c.kind].value * 0.25); if (!spend(g, cost)) return '돈이 모자랐다.'; gainItem(g, c.kind, null, rng.int(35, 65)); return `은화 ${cost}닢을 건넸다. 행상이 돈을 받자마자 짐을 쌌다. 물건을 품에 넣으니 가슴께가 서늘했다.`; } },
    { label: '어디서 난 물건인지 묻는다', run: (g, rng, c) => { if (check(rng, st(g, 'sen') + st(g, 'cha') / 2, 40)) return `행상이 한참 머뭇거리다 털어놓았다. 죽은 사람에게서 나온 것이라고. 세 번 팔았는데 세 번 돌아왔다고. ${ITEMS[c.kind].desc} 사지 않았다.`; return '행상은 "좋은 집안 물건"이라고만 했다. 어쩐지 꺼림칙해 사지 않았다.'; } },
    { label: '지나친다', run: () => '지나쳤다. 등 뒤에서 행상이 한숨을 쉬었다.' },
  ],
});
const dyingFoe = (g) => {
  if (!g.feud) return null;
  for (const [id, gr] of Object.entries(feudState(g).grudges)) {
    const p = byId(g, Number(id));
    if (p?.alive && !p.isPlayer && gr.heat >= 70 && ageYears(p) >= 55) return p;
  }
  return null;
};
EVENTS.push({
  id: 'haunt_dying_curse', cooldown: 60, weight: 5,
  chance: () => 0.2,
  cond: (g) => isAdult(g) && !g.over && !HS(g).curse && !!dyingFoe(g),
  prepare: (g) => ({ foe: dyingFoe(g)?.id }),
  title: '원수의 마지막 말',
  text: (g, c) => { const p = byId(g, c.foe); return `${p ? J(p.name, '이/가') : '원수가'} 숨을 거두기 직전이라는 소식이 왔다. 그 집 하인이 전한 말이 있다. 마지막 숨으로 내 이름과 내 핏줄을 불렀다고. 시골에서는 죽어 가는 사람의 원한이 핏줄에 붙는다고 믿는다. 마탑 사람들도 그 말을 완전히 부정하지는 않는다.`; },
  choices: [
    { label: '머리맡으로 찾아가 용서를 빈다', run: (g, rng, c) => { const p = byId(g, c.foe); const gr = p ? feudState(g).grudges[p.id] : null; const ok = check(rng, st(g, 'cha') + st(g, 'wil') / 2, 30 + (gr?.heat ?? 70) / 3); if (p?.alive) kill(g, p, '늙어 병듦'); if (ok) { deed(g, 'kind', 4, null, here(g)); return '머리맡에 무릎을 꿇었다. 그는 오래 나를 노려보다가 눈을 감았다. 손이 내 손등 위에 잠깐 얹혔다가 떨어졌다. 그 뒤로 아무 일도 없었다.'; } setCurse(g, 'dying', p?.name ?? '원수', `${p?.name ?? '원수'}의 마지막 숨이 핏줄을 저주했다`, 35); return '머리맡에 갔지만 그는 얼굴을 돌렸다. 마지막으로 내 이름을 한 번 더 불렀다. 그 목소리가 오래 귀에 남았다.'; } },
    { label: '사제를 불러 집을 축복받는다 (은화 15닢)', show: (g) => canSpend(g, 15), run: (g, rng, c) => { const p = byId(g, c.foe); if (!spend(g, 15)) return '헌금이 모자랐다.'; if (p?.alive) kill(g, p, '늙어 병듦'); setCurse(g, 'dying', p?.name ?? '원수', `${p?.name ?? '원수'}의 마지막 숨이 핏줄을 저주했다`, 22); return '사제가 문지방마다 성수를 뿌렸다. 마음은 놓였다. 그래도 아주 가끔, 문지방 너머에서 그 목소리가 들린다.'; } },
    { label: '죽는 사람의 헛소리일 뿐이다', run: (g, rng, c) => { const p = byId(g, c.foe); if (p?.alive) kill(g, p, '늙어 병듦'); setCurse(g, 'dying', p?.name ?? '원수', `${p?.name ?? '원수'}의 마지막 숨이 핏줄을 저주했다`, 55); return '코웃음을 쳤다. 그날 밤 그가 죽었다. 이듬해 봄, 집안 아이가 까닭 모를 열병을 앓았다. 우연이라고 생각했다. 그러기로 했다.'; } },
  ],
});
const restlessHere = (g) => spotsAt(g, here(g)).find((id) => HS(g).spots[id].real && HS(g).spots[id].state === 'restless') ?? null;
EVENTS.push({
  id: 'haunt_night', cooldown: 14, weight: 6,
  chance: () => 0.35,
  cond: (g) => free(g) && (!!restlessHere(g) || HS(g).items.length > 0),
  prepare: (g) => ({ spot: restlessHere(g) }),
  title: '한밤의 소리',
  text: (g, c) => { const s = c.spot ? spot(g, c.spot) : null; return s ? `자정 무렵 ${s.name} 쪽에서 소리가 났다. 개들이 일제히 짖다가 일제히 멎었다. 이웃집 창에 하나둘 불이 켜진다.` : `자정 무렵 궤짝 속 ${HS(g).items[0]?.name ?? '물건'} 쪽에서 무엇인가 긁는 소리가 났다. 방이 추웠다.`; },
  choices: [
    { label: '나가 본다', show: (g, c) => !!c.spot, run: (g, rng, c) => { const s = spot(g, c.spot); if (!at(g, s)) return '나가 보니 조용했다.'; queueScene(g, 'haunt_spot', { spot: c.spot }, { first: true }); return '등불을 들고 나섰다.'; } },
    { label: '기도하고 잔다', run: (g) => { if (g.faith) faithState(g).devotion = clamp(faithState(g).devotion + 1, 0, 100); stress(g, 2); return '이불 속에서 기도문을 외웠다. 소리는 새벽닭이 울 때 멎었다.'; } },
    { label: '이불을 뒤집어쓴다', run: (g) => { stress(g, 5); return '이불을 머리끝까지 뒤집어썼다. 잠은 오지 않았다.'; } },
  ],
});
const neglected = (g) => (g.elder ? elderState(g).graves : []).find((x) => x.byPlayer && x.place === here(g) && (x.tended ?? 70) < 25 && !x.desecrated && x.kind !== 'ash') ?? null;
EVENTS.push({
  id: 'haunt_ancestor', cooldown: 36, weight: 5,
  chance: () => 0.3,
  cond: (g) => free(g) && !!neglected(g),
  prepare: (g) => ({ grave: neglected(g)?.id }),
  title: '꿈에 온 어른',
  text: (g, c) => { const gr = (g.elder ? elderState(g).graves : []).find((x) => x.id === c.grave); return `꿈에 ${J(gr?.name ?? '돌아가신 어른', '이/가')} 왔다. 말없이 문간에 서서 신발에 묻은 흙을 털었다. 풀물이 든 흙이었다. 시골에서는 이런 꿈을 무덤이 거칠어졌다는 뜻으로 읽는다. 그냥 꿈일 수도 있다.`; },
  choices: [
    { label: '무덤에 가서 풀을 벤다', run: (g, rng, c) => { const gr = elderState(g).graves.find((x) => x.id === c.grave); if (gr) gr.tended = 75; tired(g, 8); deed(g, 'loyal', 2, null, here(g)); return '낫을 들고 무덤에 갔다. 비석에 낀 이끼를 긁고 술을 한 잔 부었다. 그날 밤은 꿈이 없었다.'; } },
    { label: '꿈일 뿐이다', run: (g) => { stress(g, 2); return '꿈일 뿐이다. 그래도 아침 내내 신발에 묻은 흙이 생각났다.'; } },
  ],
});
const wraithHere = (g) => { const H = HS(g); const s = H.wraith ? H.spots[H.wraith] : null; return s?.wraith && s.place === here(g) ? H.wraith : null; };
EVENTS.push({
  id: 'haunt_wraith_call', cooldown: 6, weight: 10,
  chance: () => 0.7,
  cond: (g) => free(g) && !!wraithHere(g),
  prepare: (g) => ({ spot: wraithHere(g) }),
  title: '망령이 도는 고장',
  text: (g, c) => { const s = spot(g, c.spot); return `${s?.name ?? '그곳'}의 망령 때문에 ${placeName(here(g))} 사람들이 밤마다 문에 소금을 뿌린다. 벌써 ${s?.hurt ?? 0}명이 죽었다. 교단 사제단은 아직 오지 않았다. 촌장이 장터에서 사람을 모은다. "누구든, 무엇이든 해 볼 사람."`; },
  choices: [
    { label: '나선다', run: (g, rng, c) => { const s = spot(g, c.spot); if (!at(g, s)) return '나서려 했지만 이미 끝난 뒤였다.'; queueScene(g, 'haunt_spot', { spot: c.spot }, { first: true }); return '내가 가겠다고 했다. 장터가 조용해졌다.'; } },
    { label: '사제단을 부를 돈을 보탠다 (은화 20닢)', show: (g) => canSpend(g, 20), run: (g, rng, c) => { if (!spend(g, 20)) return '주머니가 비어 있었다.'; const s = spot(g, c.spot); if (s) s.power = clamp(s.power - 15, 0, 100); deed(g, 'generous', 4, `${J(g.player.name, '이/가')} 망령을 막을 사제단 몫을 보탰다더라`, here(g)); return '은화 스무 닢을 촌장에게 건넸다. 사제단을 재촉하는 편지가 그날로 떠났다.'; } },
    { label: '짐을 싸서 이 고장을 떠날 궁리를 한다', run: (g) => { HS(g).me.fled += 1; stress(g, 4); return '짐을 싸기 시작했다. 다들 그렇게 하고 있었다.'; } },
  ],
});
EVENTS.push({
  id: 'haunt_curse_strike', cooldown: 24, weight: 5,
  chance: (g) => clamp((HS(g).curse?.power ?? 0) / 120, 0.1, 0.7),
  cond: (g) => isAdult(g) && !g.over && !!HS(g).curse,
  title: '또 한 번의 탈',
  text: (g) => `${['곳간에 까닭 없이 불이 났다', '아이가 이레 동안 열에 들떠 같은 말을 되풀이했다', '키우던 짐승들이 한밤에 한꺼번에 울타리를 부수고 달아났다', '우물물에서 쇠 맛이 났다'][g.date.month % 4]}. 집안 어른들은 말없이 서로를 보았다. ${CURSES[HS(g).curse.kind]?.name ?? '저주'}. 이 집안에서 그 이름은 입에 올리지 않는다.`,
  choices: [
    { label: '우연일 뿐이다', run: (g) => { stress(g, 4); return '우연이다. 우연이 이렇게 잦을 수도 있다.'; } },
    { label: '저주를 풀 방법을 알아보기로 한다', run: (g) => { HS(g).curse.known = true; stress(g, -2); return '성당이든 영매든, 찾아가 보기로 했다. 저주가 시작된 자리를 아는 사람도 찾아야 한다.'; } },
  ],
});
