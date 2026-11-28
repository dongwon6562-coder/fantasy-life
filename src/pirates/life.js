// 해적과 나: 뱃길에서 해적에게 잡히기, 해적단에 들어 선원에서 선장까지(sea/pirates.js의 계급을 함께 쓴다),
// 사략선 허가장, 해적 사냥 함대, 소굴의 법과 몫 나누기, 보물 지도와 파기, 칼을 내려놓은 뒤의 날들.
// 장면 앞머리 pi_. 아이에게는 옛 해적 이야기만 들린다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { playerAge, gainSkill } from '../game.js';
import { PLACES } from '../places.js';
import { reportCrime, addNotoriety, isJailed } from '../crime.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, check } from '../adventure/core.js';
import { runFight } from '../adventure/fight.js';
import { S as SEA, atSea, sailing } from '../sea/core.js';
import { realmName } from '../realms/index.js';
import { warsOf, foeIn } from '../politics/state.js';
import { seldom } from '../rumor/seldom.js';
import {
  PI, live, bandById, bandsIn, power, capName, mlog, plog, clamp, mi, ownRng, here, placeName, SEAS, seaOf, NAVY_NAME, CODES, ME_RANKS, myBandId,
} from './state.js';
import { FEED, fall } from './world.js';

const age = (g) => playerAge(g);
const fight = (g, rng, enc, tactic = 'charge') => runFight(g, rng, { enc, reward: {} }, tactic, { short: true });
const won = (r) => r.outcome === 'win' || r.outcome === 'overwhelm';
const freeHere = (g) => !traveling(g) && !isJailed(g) && !g.over && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave;
const myPirate = (g) => SEA(g).pirate;
const myBand = (g) => bandById(g, myBandId(g));
const money = (g) => g.player.money;
const famMoney = (g) => (L(g).home === 'family' ? g.player.familyMoney ?? 0 : 0);

/* ---------- 1) 뱃길에서 잡히다 ---------- */
// 바다가 험할수록 잦다. 해적은 잡히지 않는다. 열네 살 아래는 어른들 뒤에 숨는다(장면 없음).
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.pirates || !atSea(g) || myPirate(g) || age(g) < 14) return;
  const P = PI(g), M = P.me, t = L(g).travel;
  if (mi(g) - M.takenAt < 36 || sceneQueued(g, 'pi_taken')) return;
  const sea = seaOf(t.to) ?? seaOf(t.from) ?? 'south';
  const band = bandsIn(g, sea).sort((a, b) => power(b) - power(a))[0];
  if (!band) return;
  const rng = ownRng(g, 77);
  if (!rng.chance(clamp(0.015 + P.danger[sea] / 1500, 0.01, 0.07))) return;
  M.takenAt = mi(g);
  queueScene(g, 'pi_taken', { band: band.id, at: null });
});
defineScene('pi_taken', {
  need: (g, s) => atSea(g) && !!bandById(g, s.band) && !bandById(g, s.band).fell,
  title: () => '갈고리가 걸리다',
  text: (g, s) => {
    const b = bandById(g, s.band);
    return `새벽 안개 속에서 ${J(b.flag, '을/를')} 단 배가 옆구리에 붙었다. 갈고리가 뱃전에 박히고, 칼을 문 사내들이 넘어왔다. ${J(b.name, '이다/다')}. 선원들이 무릎을 꿇었다. 선장 ${J(capName(b), '이/가')} 사람들을 한 줄로 세우고 하나씩 얼굴을 본다. "몸값이 될 놈, 일손이 될 놈, 쓸모없는 놈."`;
  },
  choices: (g, s) => {
    const b = bandById(g, s.band), ransom = ransomOf(g);
    return [
      ...(money(g) + famMoney(g) >= ransom ? [{ label: `몸값을 치르겠다고 한다 (은화 ${ransom}닢)`, key: 'pay' }] : [{ label: '집에 몸값 편지를 쓰게 해 달라고 한다', key: 'letter' }]),
      ...(age(g) >= 16 ? [{ label: `${b.name}의 일손이 되겠다고 한다`, key: 'join' }] : []),
      { label: '밤을 틈타 바다로 뛰어든다', key: 'swim' },
      { label: '고개를 숙이고 시키는 대로 한다', key: 'wait' },
    ];
  },
  resolve(g, rng, s, key) {
    const b = bandById(g, s.band), M = PI(g).me;
    M.taken += 1;
    const sea = SEA(g);
    if (key === 'pay') {
      const r = ransomOf(g); let left = r;
      const a = Math.min(money(g), left); g.player.money -= a; left -= a;
      if (left > 0) g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) - left);
      mlog(g, `${b.name}에게 잡혔다가 몸값을 치르고 풀려났다.`);
      return `선장이 동전을 깨물어 보고 고개를 끄덕였다. "장사는 장사지." 다음 항구에서 작은 배에 태워 보내 주었다. 잃은 것은 은화 ${r}닢과 잠 못 잔 사흘이다.`;
    }
    if (key === 'letter') {
      if (L(g).travel) L(g).travel.left += 2;
      stress(g, 12);
      const pay = Math.min(g.player.familyMoney ?? 0, ransomOf(g));
      g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) - pay);
      mlog(g, `${b.name}에게 잡혀 두 달을 소굴에서 지냈다.`);
      return `떨리는 손으로 편지를 썼다. ${b.lair}의 축축한 움막에서 두 달을 기다렸다.${pay ? ` 집에서 은화 ${pay}닢을 보내왔다. 식구들이 무엇을 팔았을지 생각하니 목이 메었다.` : ' 몸값은 오지 않았다. 해적들은 결국 나를 그물 수선에 부려 먹다가, 쓸모가 다하자 다음 항구에 내려 주었다.'}`;
    }
    if (key === 'join') {
      sea.pirate = { rank: 0, raids: 0, share: 0, since: g.date.year, band: b.id };
      addNotoriety(g, 2);
      if (L(g).travel) L(g).travel.to = b.lairAt && PLACES[b.lairAt] ? b.lairAt : L(g).travel.to;
      note(g, `${b.name}의 일손이 되었다.`);
      chron(g, `${g.player.name}, 해적 ${b.name}에 들다.`, 30);
      mlog(g, `잡혀간 배에서 ${b.name}의 졸개가 되었다.`);
      return `선장이 나를 한참 보더니 칼끝으로 내 손바닥을 그었다. "피를 바다에 떨궈라. 오늘부터 넌 ${b.name} 사람이다." 규약은 ${CODES[b.code].name}: ${CODES[b.code].text} 이제 "해적단 배를 탄다"로 바다에 나간다.`;
    }
    if (key === 'swim') {
      const ok = check(rng, sailing(g) + g.player.stats.str / 2 + g.player.stats.wil / 3, 45);
      gainSkill(g, 'sailing', 1, 'wil');
      if (ok) { stress(g, 8); mlog(g, `${b.name}의 배에서 바다로 뛰어내려 달아났다.`); return '달이 구름에 가려진 틈에 뱃전을 넘었다. 차가운 물이 숨을 앗아 갔다. 밤새 널빤지에 매달려 떠다니다 아침에 어선에 건져졌다.'; }
      g.player.injuries.push({ name: '바닷물에 언 몸', months: 2 });
      g.player.money = Math.floor(money(g) / 2);
      stress(g, 14);
      return '물에 뛰어들자마자 갈고리에 옷자락이 걸렸다. 끌려 올라와 실컷 맞았다. 주머니의 절반을 털리고, 다음 항구에 버려졌다.';
    }
    const took = Math.min(money(g), Math.round(5 + money(g) * 0.4));
    g.player.money -= took;
    if (sea.cargo && rng.chance(0.6)) sea.cargo = null;
    stress(g, 8);
    mlog(g, `${b.name}에게 털렸다.`);
    return `시키는 대로 짐칸을 열고 주머니를 내놓았다.${took ? ` 은화 ${took}닢이 해적의 손으로 넘어갔다.` : ''} 해적들은 쓸 만한 것을 다 실어 가고 우리 배를 놓아주었다. 선장이 떠나며 모자를 들어 보였다.`;
  },
});
function ransomOf(g) { return clamp(Math.round(20 + money(g) * 0.3 + (g.player.familyMoney ?? 0) * 0.05 + (L(g).renown ?? 0)), 20, 300); }

/* ---------- 2) 내 해적단의 배를 탄다 (까마귀단은 sea/pirates.js의 약탈하러 나간다) ---------- */
ACTIONS.push({
  id: 'pi_raid',
  name: '해적단 배를 탄다',
  icon: 'ship',
  desc: '내 해적단의 배를 타고 한 달 동안 상선을 쫓는다. 몫이 크지만 죄가 쌓이고 해군이 쫓는다.',
  available: (g) => !!myPirate(g) && myBandId(g) !== 'crow' && !!myBand(g) && !myBand(g).fell && freeHere(g) && seaOf(here(g)) === myBand(g).sea && !sceneQueued(g, 'pi_raid'),
  run(g) { queueScene(g, 'pi_raid'); return `${J(myBand(g).flag, '을/를')} 올렸다.`; },
});
defineScene('pi_raid', {
  need: (g) => !!myPirate(g) && !!myBand(g) && !myBand(g).fell,
  title: (g) => `${myBand(g).name}의 배`,
  text: (g) => {
    const b = myBand(g), lt = b.letter;
    return `${J(b.lair, '을/를')} 빠져나온 배가 바람을 받는다. 선장 ${J(capName(b), '이/가')} 해도를 펼쳤다.${lt ? ` 지금 우리는 ${realmName(lt.realm)}의 허가장을 품은 사략선이다. ${realmName(lt.foe)}의 배라면 털어도 죄가 아니다.` : ''} 어디를 노릴까.`;
  },
  choices: (g) => {
    const b = myBand(g);
    return [
      { label: '호위가 약한 상선을 노린다', key: 'merchant' },
      ...(b.letter ? [{ label: `${realmName(b.letter.foe)}의 배만 노린다 (허가장대로)`, key: 'foe' }] : []),
      { label: '해안 마을을 턴다 (잔인함)', key: 'coast' },
      { label: '이번에는 배를 지킨다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const b = myBand(g), pr = myPirate(g), sea = SEA(g);
    if (key === 'none' || !pr) return '이번에는 소굴에 남아 돛을 기웠다. 동료들이 곁눈질했다.';
    const enc = key === 'coast' ? { unit: 'coast_militia', count: rng.int(2, 4), leader: null } : { unit: 'ship_guard', count: rng.int(2, 5), leader: null };
    const r = fight(g, rng, enc, 'ambush');
    if (!won(r)) { sea.hunted += 3; PI(g).me.standing = clamp(PI(g).me.standing - 4, 0, 100); return `${r.text} 빈손으로 돌아왔다.`; }
    const loot = Math.round(rng.int(20, 55) * (1 + pr.rank * 0.35) * (key === 'foe' ? 1.1 : 1));
    const cut = pr.rank >= 2 ? loot : Math.round(loot * (b.code === 'captain' ? 0.5 : 0.8));
    g.player.money += cut; pr.raids += 1; pr.share += cut;
    b.wealth += loot; b.prizes += 1;
    gainSkill(g, 'sailing', 1, 'agi');
    const legal = key === 'foe' && b.letter;
    if (!legal) { reportCrime(g, 'piracy', SEAS[b.sea].board, { mult: key === 'coast' ? 1.5 : 1 }); sea.hunted += key === 'coast' ? 9 : 6; }
    if (key === 'coast') { addNotoriety(g, 4); stress(g, 6); }
    const promo = promote(g, b);
    return `${r.text} ${key === 'coast' ? '불타는 지붕 아래서 사람들이 우는 소리를 들으며 자루를 채웠다.' : '짐칸에서 향신료 통과 은 접시가 나왔다.'} 내 몫은 은화 ${cut}닢.${legal ? ' 허가장 덕에 이 일은 죄로 남지 않는다.' : ''}${promo}`;
  },
});
function promote(g, b) {
  const pr = myPirate(g);
  const next = pr.rank === 0 && pr.raids >= 3 ? 1 : pr.rank === 1 && pr.raids >= 8 ? 2 : pr.rank;
  if (next <= pr.rank) return '';
  pr.rank = next;
  chron(g, `${g.player.name}, ${b.name}의 ${ME_RANKS[next]}에 오르다.`, 45);
  mlog(g, `${b.name}의 ${J(ME_RANKS[next], '이/가')} 되었다.`);
  if (next === 2 && !SEA(g).ship) SEA(g).ship = { name: `${b.name.replace(/단$|형제회$/, '')}의 송곳니`, kind: 'raider', hull: 75, speed: 2, unpaid: 0 };
  return next === 1 ? ' 선장이 내 어깨를 쳤다. "오늘부터 갑판장이다."' : ' 선원들이 나를 선장이라 불렀다. 빼앗은 쾌속선 한 척이 내 배가 되었다.';
}

/* ---------- 3) 소굴의 법과 몫 나누기 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !myPirate(g) || !g.pirates || !freeHere(g)) return;
  const pr = myPirate(g), M = PI(g).me, b = myBand(g), rng = ownRng(g, 81);
  // 소굴 일은 해적단의 바다에 있을 때만 (뭍 깊은 곳에서 '소굴의 재판'이 열리지 않게)
  if (!b || b.fell || seaOf(here(g)) !== b.sea) return;
  // 약탈이 늘었으면 몫을 나누는 밤
  if (pr.raids > M.seenRaids) {
    M.seenRaids = pr.raids;
    if (mi(g) - M.shareAt >= 6 && rng.chance(0.45) && !sceneQueued(g, 'pi_share')) { M.shareAt = mi(g); queueScene(g, 'pi_share', { band: b.id }); return; }
  }
  if (mi(g) - M.trialAt >= 18 && rng.chance(0.06) && !sceneQueued(g, 'pi_trial')) { M.trialAt = mi(g); queueScene(g, 'pi_trial', { band: b.id, ev: rng.pick(['thief', 'coward', 'brawl']) }); return; }
  // 갑판장 이상이고 선장 인심을 잃은 해적단이면 반란을 꾀하자는 말이 나온다
  if (pr.rank >= 1 && pr.rank < 3 && b.wealth < 80 && M.standing >= 55 && rng.chance(0.05) && !sceneQueued(g, 'pi_vote')) queueScene(g, 'pi_vote', { band: b.id });
});
defineScene('pi_share', {
  need: (g, s) => !!myPirate(g) && myBandId(g) === s.band,
  title: () => '몫을 나누는 밤',
  text: (g, s) => {
    const b = bandById(g, s.band);
    return `노획물을 갑판에 쏟아 놓았다. 은 접시, 향신료 통, 남의 반지. 선장 ${J(capName(b), '이/가')} 규약 판자 앞에 섰다. 규약은 ${CODES[b.code].name}. 그런데 저울질하는 손이 자꾸 선장 쪽으로 기운다. 다리를 다친 늙은 키잡이는 아무 말 없이 구석에 앉아 있다.`;
  },
  choices: () => [
    { label: '규약대로 나누라고 따진다', key: 'protest' },
    { label: '어수선한 틈에 반지 하나를 챙긴다', key: 'skim' },
    { label: '다친 키잡이에게 내 몫을 조금 덜어 준다', key: 'give' },
    { label: '말없이 내 몫을 받는다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const M = PI(g).me, b = bandById(g, s.band);
    if (key === 'protest') {
      if (rng.chance(0.4 + M.standing / 200)) { M.standing = clamp(M.standing + 8, 0, 100); g.player.money += 8; return '선원들이 내 말에 웅성거렸다. 선장은 이를 갈며 저울을 바로잡았다. 내 몫이 은화 여덟 닢 늘었고, 선원들이 나를 다르게 보기 시작했다.'; }
      M.standing = clamp(M.standing - 5, 0, 100); g.player.injuries.push({ name: '선장 주먹에 터진 입술', months: 1 }); return '선장의 주먹이 먼저 날아왔다. "규약은 내가 읽는다." 아무도 나서지 않았다.';
    }
    if (key === 'skim') {
      if (b.code === 'blood' && rng.chance(0.35)) { M.standing = clamp(M.standing - 15, 0, 100); stress(g, 10); g.player.injuries.push({ name: '채찍 자국', months: 2 }); return '반지를 옷섶에 넣는 순간 누가 내 손목을 잡았다. 피의 규약에 따라 돛대에 묶여 채찍 열 대를 맞았다. 무인도에 버려지지 않은 것만도 다행이다.'; }
      const v = rng.int(10, 25); g.player.money += v; return `아무도 보지 못했다. 반지는 뭍에서 은화 ${v}닢이 되었다. 손가락에 남은 자국은 누구의 것이었을까.`;
    }
    if (key === 'give') { const v = Math.min(money(g), 10); g.player.money -= v; M.standing = clamp(M.standing + 6, 0, 100); stress(g, -3); return '키잡이가 나를 올려다보더니 고개를 끄덕였다. 다음 날부터 그는 내게 바람 읽는 법을 가르쳐 주었다.'; }
    return '받은 것을 주머니에 넣었다. 바다에서는 따지는 놈보다 입 다문 놈이 오래 산다.';
  },
});
const TRIAL = {
  thief: { text: '동료의 궤짝에서 은화를 훔친 졸개가 잡혀 왔다. 열여섯쯤 된 아이다. 선원들이 둘러섰다. 규약대로라면 무인도에 버린다.', harsh: '무인도에 버리자고 한다', soft: '채찍으로 끝내자고 한다' },
  coward: { text: '지난 싸움에서 칼을 버리고 숨은 자가 있다. 그 탓에 둘이 죽었다. 선원들은 그를 바다에 던지자고 소리친다.', harsh: '바다에 던지자는 쪽에 선다', soft: '다음 싸움에서 맨 앞에 세우자고 한다' },
  brawl: { text: '술에 취한 두 사람이 칼부림을 했다. 하나는 팔을 잃을 것 같다. 둘 다 내 동료다.', harsh: '먼저 칼을 뽑은 쪽을 규약대로 벌하자고 한다', soft: '둘 다 몫을 깎고 화해시키자고 한다' },
};
defineScene('pi_trial', {
  need: (g, s) => !!myPirate(g) && myBandId(g) === s.band,
  title: () => '소굴의 재판',
  text: (g, s) => `${TRIAL[s.ev].text} 선장이 나를 본다. "네 생각은?"`,
  choices: (g, s) => [
    { label: TRIAL[s.ev].harsh, key: 'harsh' },
    { label: TRIAL[s.ev].soft, key: 'soft' },
    { label: '선장에게 맡긴다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const M = PI(g).me, b = bandById(g, s.band);
    if (key === 'harsh') { M.standing = clamp(M.standing + (b.code === 'blood' ? 6 : 2), 0, 100); stress(g, 6); addNotoriety(g, 1); return '규약은 규약이다. 그날 밤 아무도 그 이름을 입에 올리지 않았다. 바다는 모든 것을 삼킨다.'; }
    if (key === 'soft') { M.standing = clamp(M.standing + (b.code === 'blood' ? -6 : 4), 0, 100); return b.code === 'blood' ? '몇은 고개를 끄덕였지만 늙은 해적들은 혀를 찼다. "물러진 놈." 피의 규약을 가진 무리에서 자비는 흠이다.' : '선원들이 웅성거리다 고개를 끄덕였다. 다음 날 그 사람이 내게 말없이 럼주 한 병을 두고 갔다.'; }
    return '선장이 정했다. 나는 아무 말도 하지 않았다. 그게 바다의 지혜인지 비겁인지는 모르겠다.';
  },
});
defineScene('pi_vote', {
  need: (g, s) => !!myPirate(g) && myBandId(g) === s.band && myPirate(g).rank >= 1,
  title: () => '검은 쪽지',
  text: (g, s) => `몫이 마른 지 여러 달. 선원 몇이 밤에 나를 찾아왔다. 손에 검은 쪽지가 들려 있다. 규약에 따라 이것을 선장에게 건네면, 선원들이 새 선장을 뽑는다. "당신이라면 따르겠소."`,
  choices: () => [
    { label: '검은 쪽지를 선장에게 건넨다', key: 'mutiny' },
    { label: '선장에게 이 일을 알린다', key: 'tell' },
    { label: '쪽지를 바다에 버리라고 한다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const M = PI(g).me, b = bandById(g, s.band), pr = myPirate(g);
    if (key === 'mutiny') {
      if (rng.chance(0.3 + M.standing / 150)) {
        const was = capName(b);
        b.cap = { name: g.player.name, nick: rng.pick(['새 바람', '젊은 칼', '검은 쪽지']), age: age(g), since: g.date.year, me: true };
        pr.rank = Math.max(pr.rank, 2);
        if (!SEA(g).ship) SEA(g).ship = { name: `${b.name.replace(/단$|형제회$/, '')}의 깃배`, kind: 'raider', hull: 80, speed: 2, unpaid: 0 };
        chron(g, `${g.player.name}, ${J(was, '을/를')} 몰아내고 ${b.name}의 선장이 되다.`, 70);
        plog(g, `${b.name}에서 선상 반란. ${J(g.player.name, '이/가')} 새 선장이 되었다.`);
        mlog(g, `검은 쪽지로 ${J(was, '을/를')} 몰아내고 선장이 되었다.`);
        return `선장 ${J(was, '은/는')} 쪽지를 오래 들여다보더니 칼을 풀어 놓았다. 선원들이 내 이름을 외쳤다. ${J(was, '은/는')} 작은 배에 물 한 통과 함께 태워 보냈다. 이제 ${b.name}의 깃발은 내 것이다.`;
      }
      M.standing = clamp(M.standing - 20, 0, 100); g.player.injuries.push({ name: '돛대에 묶여 맞은 등', months: 3 }); pr.rank = Math.max(0, pr.rank - 1); stress(g, 15);
      return '선원들의 표는 갈렸다. 선장이 이겼다. 나는 돛대에 묶여 밤을 새웠고, 계급 하나를 잃었다. 다음은 없다는 눈빛이었다.';
    }
    if (key === 'tell') { M.standing = clamp(M.standing - 10, 0, 100); g.player.money += 20; return '선장은 은화 스무 닢을 내 손에 쥐여 주었다. 그 뒤로 몇몇 선원이 나와 눈을 마주치지 않는다.'; }
    return '쪽지는 파도에 젖어 가라앉았다. 몇 달만 더 버텨 보자고 했다.';
  },
});

/* ---------- 4) 사략선 허가장 ---------- */
const OFFICE = { klein: 'leonia', portel: 'free' };
const officeFoe = (g, pl) => { const realm = OFFICE[pl]; const w = realm && warsOf(g, realm)[0]; return w ? { realm, foe: foeIn(w, realm) } : null; };
ACTIONS.push({
  id: 'pi_letter_seek',
  name: '사략선 허가장을 청한다',
  icon: 'seal',
  desc: '전쟁 중인 나라의 해군 사무소에서 적국 배를 털어도 좋다는 허가장을 받는다. 배가 있거나 뱃일이 능해야 한다.',
  available: (g) => age(g) >= 18 && freeHere(g) && !!officeFoe(g, here(g)) && !PI(g).me.letter && !myPirate(g) && mi(g) - (PI(g).me.letterAt ?? -99) >= 6 && (!!SEA(g).ship || sailing(g) >= 30) && !sceneQueued(g, 'pi_letter'),
  run(g) { queueScene(g, 'pi_letter'); return '해군 사무소 문 앞에 섰다.'; },
});
defineScene('pi_letter', {
  need: (g) => !!officeFoe(g, here(g)) && !PI(g).me.letter,
  title: () => '해군 사무소',
  text: (g) => { const o = officeFoe(g, here(g)); return `${realmName(o.realm)}의 해군 서기관이 안경 너머로 나를 본다. "${realmName(o.foe)}의 배를 털겠다고? 노획의 다섯 중 하나는 나라 몫이오. 허가장에 적힌 나라의 배만 건드리시오. 다른 배를 털면 그날로 해적이고, 교수대요." 수수료는 은화 15닢.`; },
  choices: (g) => [
    ...(money(g) >= 15 ? [{ label: '허가장에 서명한다 (은화 15닢)', key: 'sign' }] : []),
    { label: '생각해 보겠다고 한다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    if (key !== 'sign' || money(g) < 15) { PI(g).me.letterAt = mi(g); return '서기관은 어깨를 으쓱하고 다음 사람을 불렀다.'; }
    const o = officeFoe(g, here(g));
    g.player.money -= 15;
    PI(g).me.letter = { realm: o.realm, foe: o.foe, until: mi(g) + 24, taken: 0, y: g.date.year };
    note(g, `${realmName(o.realm)}의 사략선 허가장을 받았다.`);
    mlog(g, `${realmName(o.realm)}의 사략선 허가장을 받았다. 상대는 ${realmName(o.foe)}.`);
    return `밀랍 도장이 찍힌 양피지를 받았다. 이제 나는 해적이 아니라 '사략선장'이다. 종이 한 장 차이다. 항구에서 "사략선으로 나간다"를 고르면 된다.`;
  },
});
ACTIONS.push({
  id: 'pi_privateer',
  name: '사략선으로 나간다',
  icon: 'sword',
  desc: '허가장을 품고 적국의 배를 쫓는다. 노획의 다섯 중 하나는 나라 몫이다.',
  available: (g) => !!PI(g).me.letter && freeHere(g) && !!seaOf(here(g)) && !sceneQueued(g, 'pi_privateer') && !sceneQueued(g, 'pi_letter_end'),
  run(g) { queueScene(g, 'pi_privateer'); return '허가장을 품고 돛을 올렸다.'; },
});
defineScene('pi_privateer', {
  need: (g) => !!PI(g).me.letter,
  title: () => '사략선',
  text: (g) => { const lt = PI(g).me.letter; return `수평선에 돛이 둘 보인다. 하나는 ${realmName(lt.foe)}의 깃발, 하나는 깃발이 없는 살찐 상선이다. 허가장은 앞의 것만 허락한다.`; },
  choices: (g) => { const lt = PI(g).me.letter; return [
    { label: `${realmName(lt.foe)}의 배를 쫓는다`, key: 'foe' },
    { label: '깃발 없는 상선을 턴다 (허가장 밖, 해적질)', key: 'neutral' },
    { label: '오늘은 바다만 살핀다', key: 'none' },
  ]; },
  resolve(g, rng, s, key) {
    const M = PI(g).me, lt = M.letter;
    if (key === 'none') return '하루 종일 수평선을 보다 돌아왔다. 바다는 넓고 배는 드물다.';
    const r = fight(g, rng, { unit: key === 'foe' ? 'marine' : 'ship_guard', count: rng.int(2, 4), leader: key === 'foe' && rng.chance(0.4) ? 'navy_captain' : null }, SEA(g).ship?.kind === 'raider' ? 'ambush' : 'charge');
    gainSkill(g, 'sailing', 1, 'agi');
    if (!won(r)) { if (SEA(g).ship) SEA(g).ship.hull = Math.max(10, SEA(g).ship.hull - rng.int(8, 20)); return `${r.text} 놓쳤다.`; }
    const loot = rng.int(30, 70);
    if (key === 'foe') {
      const mine = Math.round(loot * 0.8); g.player.money += mine; lt.taken += 1; L(g).renown = (L(g).renown ?? 0) + 2;
      if (lt.taken === 5) chron(g, `${g.player.name}, ${realmName(lt.realm)}의 사략선장으로 적국 배 다섯 척을 잡다.`, 55);
      return `${r.text} 적국 배의 짐을 항구로 끌고 왔다. 해군 서기관이 다섯 중 하나를 떼고 은화 ${mine}닢을 내주었다. 이건 나라가 고마워하는 일이다.`;
    }
    g.player.money += loot; reportCrime(g, 'piracy', here(g)); SEA(g).hunted += 8; addNotoriety(g, 3);
    if (rng.chance(0.5)) { M.letter = null; mlog(g, '허가장 밖의 배를 털다 허가장을 빼앗겼다.'); return `${r.text} 은화 ${loot}닢을 챙겼다. 하지만 상선 선원 하나가 내 얼굴을 알아보았다. 해군 사무소가 허가장을 거두어 갔다. 이제 나는 그냥 해적이다.`; }
    return `${r.text} 은화 ${loot}닢을 챙겼다. 아무도 보지 못했다. 아직은.`;
  },
});
// 허가장이 끝난다: 기한이 지나거나 전쟁이 끝나면
HOOKS.afterMonth.push((g) => {
  const M = g.pirates?.me, lt = M?.letter;
  if (!lt || g.over) return;
  const w = warsOf(g, lt.realm).find((x) => foeIn(x, lt.realm) === lt.foe);
  if ((w && mi(g) < lt.until) || sceneQueued(g, 'pi_letter_end')) return;
  if (traveling(g)) return;
  queueScene(g, 'pi_letter_end', { peace: !w });
});
defineScene('pi_letter_end', {
  need: (g) => !!PI(g).me.letter,
  title: () => '허가장이 끝나다',
  text: (g, s) => { const lt = PI(g).me.letter; return `${s.peace ? `${J(realmName(lt.realm), '과/와')} ${J(realmName(lt.foe), '이/가')} 화친을 맺었다.` : '허가장의 기한이 다 되었다.'} 해군 사무소가 사략선장들을 불러 허가장을 거둔다. 같이 나갔던 사략선 몇은 벌써 깃발을 바꿔 달았다는 말이 돈다.`; },
  choices: () => [
    { label: '허가장을 돌려주고 뭍에 오른다', key: 'return' },
    { label: '허가장을 찢고 검은 깃발을 올린다 (해적이 된다)', key: 'black' },
    { label: '허가장을 돌려주고 다음 전쟁을 기다린다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const M = PI(g).me, lt = M.letter; M.letter = null;
    if (key === 'black') {
      const b = bandsIn(g, seaOf(here(g)) ?? 'south')[0];
      const sea = SEA(g);
      sea.pirate = { rank: lt.taken >= 3 ? 1 : 0, raids: lt.taken, share: 0, since: g.date.year, band: b?.id ?? 'crow' };
      reportCrime(g, 'piracy', here(g)); addNotoriety(g, 4);
      chron(g, `사략선장 ${J(g.player.name, '이/가')} 허가장을 찢고 해적이 되다.`, 50);
      mlog(g, `허가장을 찢고 ${b ? b.name : '까마귀단'}에 들었다.`);
      return `서기관이 보는 앞에서 양피지를 반으로 찢었다. 그날 밤 ${b ? b.name : '까마귀단'}의 배가 나를 데리러 왔다. 어제의 사략선장은 오늘의 해적이다.`;
    }
    if (key === 'return') { L(g).renown = (L(g).renown ?? 0) + 1; return `허가장을 돌려주었다. 잡은 배 ${lt.taken}척. 서기관이 "수고했소" 한마디를 했다. 바다 냄새가 아직 옷에 배어 있다.`; }
    return '허가장을 돌려주었다. 전쟁은 또 날 것이다. 바다는 기다려 준다.';
  },
});

/* ---------- 5) 해적 사냥 함대에 타다 ---------- */
const fleetHere = (g) => { const s = seaOf(here(g)); return s && here(g) === SEAS[s].board ? PI(g).fleets.find((f) => f.sea === s && f.left > 0 && !bandById(g, f.target)?.fell) : null; };
ACTIONS.push({
  id: 'pi_hunt_join',
  name: '해적 사냥 함대에 탄다',
  icon: 'sword',
  desc: '해군이 해적단 하나를 쫓는 함대를 띄웠다. 칼을 쓸 줄 알면 수병으로 태워 준다. 해적 선장의 목에는 큰 상금이 걸렸다.',
  available: (g) => age(g) >= 16 && freeHere(g) && !myPirate(g) && !!fleetHere(g) && mi(g) - (PI(g).me.huntAt ?? -99) >= 6 && !sceneQueued(g, 'pi_hunt'),
  run(g) { queueScene(g, 'pi_hunt', { fleet: fleetHere(g).id }); return '함대의 모집 탁자 앞에 섰다.'; },
});
defineScene('pi_hunt', {
  need: (g, s) => { const f = PI(g).fleets.find((x) => x.id === s.fleet); return !!f && f.left > 0 && !!bandById(g, f.target) && !bandById(g, f.target).fell; },
  title: () => '해적 사냥',
  text: (g, s) => { const f = PI(g).fleets.find((x) => x.id === s.fleet), b = bandById(g, f.target); return `${NAVY_NAME[f.realm]}의 배 세 척이 ${b.lair} 쪽으로 간다. 함장이 지도 위 섬을 두드렸다. "${capName(b)}. 저놈 목에 은화 120닢이다." 새벽에 ${J(b.flag, '이/가')} 수평선에 보였다.`; },
  choices: () => [
    { label: '선봉에 서서 적선에 뛰어든다', key: 'charge' },
    { label: '밤에 몰래 소굴 섬에 오른다', key: 'ambush' },
    { label: '뒤에서 화살과 쇠뇌를 거든다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const P = PI(g), f = P.fleets.find((x) => x.id === s.fleet), b = bandById(g, f.target);
    P.me.hunts += 1; P.me.huntAt = mi(g);
    if (key === 'none') { g.player.money += 6; return `뒤에서 쇠뇌를 당겼다. 해적선 하나가 불탔고, 함대는 돌아왔다. 수병 품삯 은화 6닢. ${J(capName(b), '은/는')} 아직 바다 어딘가에 있다.`; }
    const r = fight(g, rng, { unit: 'pirate', count: rng.int(3, 5), leader: 'pirate_captain' }, key);
    if (!won(r)) { g.player.money += 4; return `${r.text} 해적들은 안개 속으로 빠져나갔다.`; }
    b.ships = Math.max(0, b.ships - 1); b.men = Math.max(0, b.men - rng.int(10, 20)); f.wins += 1;
    L(g).renown = (L(g).renown ?? 0) + 3; gainSkill(g, 'sailing', 0.8, 'agi');
    if (b.ships <= 0 || b.men < 20 || rng.chance(0.3)) {
      g.player.money += 120; L(g).renown += 5;
      chron(g, `${g.player.name}, ${b.name}의 선장 ${J(capName(b), '을/를')} 사로잡다.`, 75);
      mlog(g, `${b.name}의 선장 ${J(capName(b), '을/를')} 사로잡았다.`);
      fall(g, rng, b, 'hanged', null, f.realm);
      return `${r.text} 갑판 위에서 ${J(capName(b), '과/와')} 칼을 맞댔다. 마지막에 그가 칼을 떨어뜨렸다. 사흘 뒤 부두에 교수대가 섰다. 상금 은화 120닢이 내 손에 들어왔다. 그날 밤 꿈에 그의 웃는 얼굴이 나왔다.`;
    }
    g.player.money += 25;
    return `${r.text} 해적선 한 척을 빼앗았다. 몫으로 은화 25닢. ${J(capName(b), '은/는')} 놓쳤지만 ${b.name}의 배는 이제 ${b.ships}척뿐이다.`;
  },
});

/* ---------- 6) 보물 지도와 파기 ---------- */
const openHoards = (g) => PI(g).hoards.filter((h) => !h.dug);
const mapOf = (g, h) => PI(g).me.maps.find((m) => m.hoard === h.id);
ACTIONS.push({
  id: 'pi_mapbuy',
  name: '해도 노점을 뒤진다',
  icon: 'compass',
  desc: '항구 뒷골목 노점에 낡은 해도와 보물 지도 조각이 나온다. 진짜도 있고, 거짓도 많다.',
  available: (g) => age(g) >= 16 && freeHere(g) && ['portel', 'saltmare'].includes(here(g)) && money(g) >= 20 && mi(g) - PI(g).me.mapAt >= 12 && !sceneQueued(g, 'pi_mapseller'),
  run(g) { PI(g).me.mapAt = mi(g); queueScene(g, 'pi_mapseller'); return '해도 노점의 천막을 들쳤다.'; },
});
defineScene('pi_mapseller', {
  title: () => '해도 노점',
  text: (g) => { const h = openHoards(g)[0]; return h ? `이 빠진 노인이 귀퉁이가 탄 양피지 조각을 내민다. "${h.band}의 ${J(h.cap, '이/가')} 묻은 거요. ${h.isle} 어디쯤. 은화 20닢." 조각에는 해안선 일부와 해골 표시가 있다.` : '이 빠진 노인이 귀퉁이가 탄 양피지 조각을 내민다. "백 년 전 해적왕의 보물이오. 은화 20닢." 조각에는 해골 표시가 그려져 있다. 잉크가 이상하게 선명하다.'; },
  choices: (g) => [
    ...(money(g) >= 20 ? [{ label: '지도 조각을 산다 (은화 20닢)', key: 'buy' }] : []),
    { label: '노인의 눈을 보고 그냥 간다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    if (key !== 'buy' || money(g) < 20) return '노인이 혀를 차며 양피지를 말았다.';
    g.player.money -= 20;
    const h = openHoards(g)[0];
    const fake = !h || rng.chance(0.45);
    addMap(g, fake ? null : h, fake);
    return fake ? '양피지를 품에 넣었다. 집에 와서 펴 보니, 해안선이 어느 바다와도 맞지 않는 것 같다. 아니면 내가 모르는 섬일까.' : `양피지를 품에 넣었다. 해안선이 ${h.isle} 쪽 모양과 닮았다. 조각이 하나 더 있으면 확실해질 것이다.`;
  },
});
function addMap(g, h, fake = false) {
  const M = PI(g).me;
  const id = h ? h.id : -(M.maps.length + 1);
  const m = M.maps.find((x) => x.hoard === id);
  if (m) m.pieces = Math.min(3, m.pieces + 1); else M.maps.push({ hoard: id, pieces: fake ? 2 : 1, fake, isle: h?.isle ?? '이름 모를 섬', near: h?.near ?? 'saltrock' });
  if (M.maps.length > 4) M.maps.shift();
}
ACTIONS.push({
  id: 'pi_dig',
  name: '지도를 따라 보물을 파러 간다',
  icon: 'dungeon',
  desc: '모은 지도 조각을 맞춰 섬에 내려 판다. 조각이 많을수록 자리가 정확하다.',
  available: (g) => age(g) >= 16 && freeHere(g) && PI(g).me.maps.some((m) => m.pieces >= 2 && m.near === here(g)) && !sceneQueued(g, 'pi_dig'),
  run(g) { const m = PI(g).me.maps.find((x) => x.pieces >= 2 && x.near === here(g)); queueScene(g, 'pi_dig', { hoard: m.hoard }); return '삽과 등불을 빌려 작은 배에 실었다.'; },
});
defineScene('pi_dig', {
  need: (g, s) => PI(g).me.maps.some((m) => m.hoard === s.hoard),
  title: () => '해골 표시',
  text: (g, s) => { const m = PI(g).me.maps.find((x) => x.hoard === s.hoard); return `${m.isle}. 지도 조각 ${m.pieces}개를 맞추니 바위 셋이 삼각형을 이루는 자리가 나왔다. 썰물이 빠지는 동안만 팔 수 있다.`; },
  choices: () => [
    { label: '썰물 동안 정신없이 판다', key: 'dig' },
    { label: '밤까지 기다렸다 몰래 판다', key: 'night' },
    { label: '오늘은 자리만 봐 둔다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'none') return '바위 셋을 눈에 새기고 돌아왔다. 다음 썰물을 기다린다.';
    const M = PI(g).me, m = M.maps.find((x) => x.hoard === s.hoard);
    M.maps = M.maps.filter((x) => x !== m);
    g.player.fatigue = (g.player.fatigue ?? 0) + 15;
    if (m.fake) return '구덩이가 허리까지 찼다. 나온 것은 조개껍데기와 녹슨 숟가락 하나. 노점 노인의 이 빠진 웃음이 떠올랐다.';
    const h = PI(g).hoards.find((x) => x.id === s.hoard);
    if (!h || h.dug) return `구덩이 바닥에 썩은 궤짝 조각만 있었다. 누가 먼저 다녀갔다.${h?.dug ? ` ${J(h.dug.by, '이었/였')}다는 말을 나중에 들었다.` : ''}`;
    if (m.pieces < 3 && rng.chance(0.35)) { M.maps.push({ ...m, pieces: m.pieces }); return '파고 또 팠지만 바위만 나왔다. 조각 하나가 모자란 탓일까. 지도는 다시 품에 넣었다.'; }
    h.dug = { y: g.date.year, by: g.player.name };
    const v = h.value; g.player.money += v;
    chron(g, `${g.player.name}, ${h.band}의 ${J(h.cap, '이/가')} 묻은 보물을 찾다.`, 70);
    mlog(g, `${h.isle}에서 ${h.band}의 보물을 찾았다. 은화 ${v}닢어치.`);
    FEED.fact?.(g, 'pi_hoard', { band: h.band, pl: h.near });
    if (h.cursed) { stress(g, 18); g.player.injuries.push({ name: '궤짝을 연 뒤 낫지 않는 열', months: 3 }); return `삽 끝에 쇠가 닿았다. 궤짝 안에 금화와 은잔, 은화로 치면 ${v}닢. 그런데 뚜껑 안쪽에 피로 쓴 글씨가 있었다. "가져가는 자, 나와 같이 가라." 그날부터 밤마다 열이 오른다.`; }
    return `삽 끝에 쇠가 닿았다. 썩은 궤짝 안에서 금화와 은잔이 쏟아졌다. 은화로 치면 ${v}닢어치. ${J(h.cap, '은/는')} 끝내 이걸 쓰지 못했다.`;
  },
});

/* ---------- 7) 칼을 내려놓은 해적들 ---------- */
// 항구 주점에 늙은 해적이 산다. 아이에게는 옛이야기만, 어른에게는 지도 조각이나 부탁이 따라온다.
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.pirates || !freeHere(g) || age(g) < 8) return;
  const P = PI(g), M = P.me, rng = ownRng(g, 83);
  const old = P.retired.find((r) => r.place === here(g));
  if (!old || mi(g) - M.oldAt < 30 || !rng.chance(0.12) || sceneQueued(g, 'pi_oldsalt')) return;
  if (!seldom(g, `pi:old:${old.name}`, 30)) return;
  M.oldAt = mi(g);
  queueScene(g, 'pi_oldsalt', { name: old.name, nick: old.nick, band: old.band, cap: !!old.cap });
});
const OLD_LOOK = ['한쪽 귀가 없다.', '손가락이 셋뿐이다.', '목에 밧줄 자국 같은 흉터가 있다.', '팔뚝 문신이 바래서 무슨 그림인지 모르겠다.', '한쪽 다리가 나무다.', '눈 하나가 하얗게 흐리다.'];
defineScene('pi_oldsalt', {
  title: () => '주점 구석의 늙은 해적',
  text: (g, s) => {
    const who = `'${s.nick}' ${s.name}`, role = s.cap ? '선장이었' : '키잡이였';
    const r = PI(g).retired.find((x) => x.name === s.name);
    const look = OLD_LOOK[[...s.name].reduce((a, c) => a + c.charCodeAt(0), 0) % OLD_LOOK.length];
    if (r?.met) return age(g) < 14 ? `${J(who, '이/가')} 오늘도 그 술통에 앉아 있다. 나를 알아보고 손짓한다. "또 왔구나, 꼬마 선원."` : `${J(who, '이/가')} 오늘도 같은 구석에 있다. 나를 보더니 빈 잔을 들어 보인다. "또 너로구나. 앉아라."`;
    if (age(g) < 14) return `부둣가 주점 앞 술통에 늙은이가 앉아 있다. ${look} 아이들이 몰려들자 그가 웃으며 말한다. "나는 옛날에 ${s.band}의 ${role}지." ${who}의 이야기는 언제나 폭풍과 금화와 바다 괴물로 끝난다.`;
    return `주점 구석에 ${J(who, '이/가')} 앉아 있다. 예전 ${s.band}의 ${role}다고 한다. ${look} 잔을 돌리며 나를 본다. "젊은이, 바다 냄새가 나는군."`;
  },
  choices: (g, s) => (age(g) < 14 ? [
    { label: '바다 괴물 이야기를 졸라 듣는다', key: 'tale' },
    { label: '어른들이 부르기 전에 집에 간다', key: 'none' },
  ] : [
    { label: '술 한 잔 사고 옛이야기를 듣는다', key: 'tale' },
    ...(openHoards(g).length ? [{ label: '숨긴 보물 이야기를 슬쩍 꺼낸다', key: 'map' }] : []),
    { label: '목례만 하고 나온다', key: 'none' },
  ]),
  resolve(g, rng, s, key) {
    const r = PI(g).retired.find((x) => x.name === s.name); if (r) r.met += 1;
    if (key === 'none') return '늙은이는 다시 바다 쪽으로 눈을 돌렸다.';
    if (key === 'tale') {
      gainSkill(g, 'sailing', 0.4, 'int'); stress(g, -3);
      return rng.pick([
        `"폭풍 속에서 돛대가 부러졌지. 선장이 웃으면서 자기 몸을 키에 묶더군." 그는 그 선장이 누군지는 말하지 않았다.`,
        `"바다 늙은이한테 술을 안 부은 배는 꼭 사달이 나. 내가 봤어. 세 번이나." 그는 잔의 첫 모금을 바닥에 흘렸다.`,
        `"제일 무서운 건 해군도 폭풍도 아니야. 몫이 마른 배야. 그런 배에선 사람이 사람을 봐." 그 뒤로 한참 말이 없었다.`,
        `"${J(s.band, '이/가')} 잘나갈 때는 섬 하나가 통째로 우리 거였지. 지금은 이 술통이 내 섬이야." 그가 웃었다. 눈은 웃지 않았다.`,
      ]);
    }
    const h = openHoards(g).find((x) => x.band === s.band) ?? openHoards(g)[0];
    if (!h) return '늙은이가 고개를 저었다. "그런 건 다 파 갔어."';
    if (rng.chance(0.55) || r?.met >= 2) { addMap(g, h); mlog(g, `늙은 해적 ${s.name}에게서 지도 조각을 얻었다.`); return `늙은이가 품에서 기름 먹인 천을 꺼냈다. "${h.cap}는 내 선장이었어. 그 양반 보물이 썩는 꼴은 못 보지." 천 안에 지도 조각이 하나 있었다. "${placeName(h.near)} 쪽에서 배를 빌려."`; }
    return '늙은이가 눈을 가늘게 떴다. "그런 걸 묻는 놈들이 제일 먼저 죽더군." 그는 잔을 비우고 나가 버렸다.';
  },
});

ACTIONS.push({
  id: 'pi_retire',
  name: '칼을 내려놓고 뭍에 오른다',
  icon: 'home',
  desc: '해적단을 조용히 떠난다. 배신이 아니라 은퇴다. 몫을 챙겨 뭍에서 산다. 지난 일이 쉽게 놓아주지는 않는다.',
  available: (g) => !!myPirate(g) && freeHere(g) && (age(g) >= 35 || myPirate(g).raids >= 12) && PI(g).me.standing >= 40,
  run(g, rng) {
    const pr = myPirate(g), b = myBand(g), M = PI(g).me;
    M.retired = { y: g.date.year, band: b?.name ?? '까마귀단', rank: pr.rank, raids: pr.raids };
    SEA(g).pirate = null;
    SEA(g).hunted = Math.max(0, SEA(g).hunted - 10);
    if (b && b.cap?.me) { b.cap = { name: rng.pick(['바스코', '마렌', '킬리안', '네라']), nick: rng.pick(['갈고리손', '웃는 칼', '흑돛']), age: rng.int(30, 45), since: g.date.year }; }
    chron(g, `${g.player.name}, ${M.retired.band}에서 칼을 내려놓다.`, 45);
    mlog(g, `${J(M.retired.band, '을/를')} 떠나 뭍에 올랐다.`);
    return `마지막 몫을 받고 동료들과 럼주를 나눴다. 늙은 키잡이가 내 어깨를 쳤다. "살아서 내리는 놈은 열에 하나야." 뭍의 땅이 발밑에서 흔들리는 것 같았다.`;
  },
});
HOOKS.afterMonth.push((g) => {
  const M = g.pirates?.me;
  if (!M?.retired || g.over || !freeHere(g) || myPirate(g)) return;
  const rng = ownRng(g, 87);
  if (mi(g) - M.pastAt < 24 || !rng.chance(0.07) || sceneQueued(g, 'pi_past')) return;
  M.pastAt = mi(g);
  const evs = ['visit', 'dream', 'kid'];
  if (PI(g).pardonAt && g.date.year - PI(g).pardonAt <= 2) evs.push('pardon');
  if (live(g).some((b) => b.name === M.retired.band)) evs.push('back');
  queueScene(g, 'pi_past', { ev: rng.pick(evs) });
});
const PAST = {
  visit: { text: (r) => `밤중에 문을 두드리는 소리. 예전 ${r.band}의 동료다. 얼굴이 반쪽이 되었다. "해군이 쫓아. 며칠만 숨겨 줘. 옛정을 봐서."`, a: '광에 숨겨 준다', b: '은화 몇 닢을 쥐여 보낸다' },
  dream: { text: () => '또 그 꿈이다. 불타는 상선, 물에 뛰어드는 사람들, 갑판에 고인 피. 깨어 보니 이불이 젖어 있다.', a: '새벽 바다에 나가 술을 붓는다', b: '예배당에 가서 고해한다' },
  kid: { text: (r) => `동네 아이들이 내 팔뚝의 문신을 보고 수군댄다. "저 사람, 옛날에 ${r.band}에 있었대." 한 아이가 용기를 내어 묻는다. "해적은 진짜 금화를 땅에 묻어요?"`, a: '폭풍과 금화 이야기를 들려준다', b: '바다는 사람을 잡아먹는 곳이라고만 말한다' },
  pardon: { text: () => '광장에 사면령이 붙었다. 옛 해적이라도 이름을 적고 칼을 바치면 지난 죄를 묻지 않는다고 한다. 이름을 적으면, 모두가 내가 누군지 알게 된다.', a: '이름을 적고 칼을 바친다', b: '모른 척 지나간다' },
  back: { text: (r) => `저녁에 낯선 사내가 찾아왔다. ${r.band}의 선장이 보냈다고 한다. "늙은 칼이 그립다. 한 번만 같이 나가자. 몫은 두 배."`, a: '한 번만 더 나간다', b: '정중히 거절한다' },
};
defineScene('pi_past', {
  need: (g) => !!PI(g).me.retired,
  title: () => '지난 바다',
  text: (g, s) => PAST[s.ev].text(PI(g).me.retired),
  choices: (g, s) => [{ label: PAST[s.ev].a, key: 'a' }, { label: PAST[s.ev].b, key: 'b' }],
  resolve(g, rng, s, key) {
    const r = PI(g).me.retired;
    if (s.ev === 'visit') { if (key === 'a') { if (rng.chance(0.3)) { reportCrime(g, 'harboring', here(g)); return '사흘 뒤 경비대가 문을 부수고 들어왔다. 그는 끌려갔고, 나는 벌금을 물었다. 옛정은 비쌌다.'; } return '나흘을 숨겨 주었다. 닷새째 새벽 그는 말없이 사라졌다. 문간에 은 단추 하나가 놓여 있었다.'; } g.player.money = Math.max(0, money(g) - 8); return '은화 여덟 닢을 쥐여 보냈다. 그는 원망하는 눈으로 보다가 어둠 속으로 갔다.'; }
    if (s.ev === 'dream') { stress(g, -6); return key === 'a' ? '새벽 바다에 럼주를 부었다. 파도가 받아 갔다. 바다 늙은이가 받아 준 걸까, 죽은 사람들이 받아 준 걸까.' : '사제는 오래 듣고 짧게 말했다. "바다가 다 기억하니, 당신은 조금 잊어도 됩니다."'; }
    if (s.ev === 'kid') { if (key === 'a') { L(g).renown = (L(g).renown ?? 0) + 1; return '아이들 눈이 동그래졌다. 금화 이야기만 하고, 피 이야기는 하지 않았다.'; } return '아이가 시무룩해졌다. 그래도 그게 맞다. 바다는 아이에게 이야기로만 남는 게 좋다.'; }
    if (s.ev === 'pardon') { if (key === 'a') { SEA(g).hunted = 0; if (g.crime) { g.crime.heat = {}; } r.pardoned = true; chron(g, `${g.player.name}, 사면령에 이름을 적다.`, 30); return '이름을 적고 칼을 바쳤다. 서기가 칼을 받아 상자에 넣었다. 끝났다. 그런데도 칼이 있던 허리가 허전하다.'; } return '사면령 앞을 지나쳤다. 지난 바다는 지난 바다로 묻어 두기로 했다.'; }
    if (key === 'a') { const v = rng.int(30, 70); g.player.money += v; reportCrime(g, 'piracy', here(g)); SEA(g).hunted += 6; return `한 번만이라고 했다. 바다는 여전했고 칼도 여전했다. 몫은 은화 ${v}닢. 돌아오는 배에서 손이 떨렸다. 늙어서가 아니었다.`; }
    return '선장의 부하는 어깨를 으쓱하고 돌아갔다. 그날 밤 오랫동안 바다 쪽 창을 열어 두었다.';
  },
});

/* ---------- 내 해적단이 망하면 ---------- */
FEED.mine = (g, b, how) => {
  const sea = SEA(g);
  if (!sea.pirate) return;
  const caught = how === 'hanged';
  sea.pirate = null;
  if (caught) sea.hunted += 10;
  mlog(g, `${J(b.name, '이/가')} 무너졌다.`);
  note(g, `${J(b.name, '이/가')} 무너졌다. ${caught ? '선장이 잡혀 목이 매달렸다.' : '무리가 흩어졌다.'}`);
  if (!g.over && !sceneQueued(g, 'pi_fallen')) queueScene(g, 'pi_fallen', { band: b.name, how, at: null });
};
defineScene('pi_fallen', {
  title: () => '깃발이 내려가다',
  text: (g, s) => (s.how === 'hanged' ? `${s.band}의 선장이 잡혔다는 소식이 왔다. 부두에 교수대가 섰다고 한다. 소굴은 텅 비었고, 남은 사람들은 제각기 살길을 찾아 흩어졌다. 나도 이제 깃발 없는 사람이다.` : `${J(s.band, '이/가')} 흩어졌다. ${s.how === 'mutiny' ? '선상 반란 끝에' : s.how === 'pardon' ? '사면령에 무리 절반이 칼을 내려놓았고' : '해군과 폭풍에 배를 잃고'} 깃발이 내려갔다. 나도 이제 깃발 없는 사람이다.`),
  choices: () => [{ label: '바다를 등지고 걷는다', key: 'none' }],
  resolve() { return '소금기 밴 옷을 벗고 뭍의 옷을 샀다. 몸이 아직 파도를 탄다.'; },
});

/* ---------- 대 잇기 ---------- */
// sea/pirates.js의 대 잇기가 해적 자리를 지우기 전에 먼저 본다
HOOKS.heir.unshift((g) => {
  const M = g.pirates?.me;
  if (!M) return;
  const was = M.retired ?? (g.sea?.pirate ? { band: bandById(g, myBandId(g))?.name ?? '까마귀단' } : null);
  M.letter = null; M.retired = null; M.standing = 50; M.seenRaids = 0;
  M.ancestor = was ? { band: was.band } : M.ancestor ?? null;
  // 지도 조각은 유품으로 남는다
});
