// 용의 땅에서 하는 일: 구렁목이나 쇠망치 골에서 천룡 산맥 서쪽으로 오른다.
// 용골 계곡의 뼈, 용 숭배자 마을, 잠든 용왕의 굴(지켜보기·보물에 손대기·말 걸기·잠든 목 노리기), 젊은 용의 둥지.
// 깨어난 용이 찾아오는 밤(dragon_fire), 용과 말을 섞는 일(dragon_talk), 원정대·숭배자·꿈의 목소리 사건.
// 용은 드물고 무겁다: 용을 건드린 값은 크고, 용은 핏줄을 기억한다.
import { ACTIONS } from '../actions.js';
import { EVENTS, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainStat, gainSkill } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress, spend, canSpend } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { playerPower } from '../adventure/combat.js';
import { deed } from '../repute/index.js';
import { kill, byId } from '../npc.js';
import { realmOf } from '../realms/index.js';
import { LG, legend } from '../legends/state.js';
import { SS as sealState, STAGES, learn as sealLearn } from '../seal/state.js';
import { DS, DRAGONS, SLEEPERS, GATES, clamp, mi, nameOf, dlog, dragonOf, isAlive, awakeOnes, know, sleepWord } from './state.js';
import { burnPlace } from './world.js';

const here = (g) => L(g).place;
export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const atGate = (g) => GATES.includes(here(g));
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const st = (g, k) => g.player.stats[k] ?? 0;
// 용에게는 사람의 잣대가 잘 안 맞는다: 확률을 넓게 편다 (센 사람도 잘 진다)
const odds = (v, d, lo = 0.01, hi = 0.9) => clamp(0.5 + (v - d) / 80, lo, hi);
// 청동의 용왕이 준 비늘: "이걸 가진 자를 용족은 해치지 않소"
export const hasScale = (g) => LG(g).dragon?.step === 3 && !!legend(g, 'bronze')?.alive;
const bronzeBond = (g, n) => { const x = legend(g, 'bronze'); if (x) x.bond = clamp(x.bond + n, -100, 100); };
const owedOf = (g, id) => dragonOf(g, id)?.owed ?? 0;
const angerAll = (g, n, but = null) => { const S = DS(g); for (const id of [...SLEEPERS, 'young']) if (id !== but && S.dragons[id].state !== 'dead') S.dragons[id].wrath = clamp(S.dragons[id].wrath + n, 0, 100); };
const wakeNow = (g, id, rng) => {
  const d = dragonOf(g, id);
  d.state = 'awake'; d.sleep = 0; d.until = mi(g) + rng.int(4, 8); d.wakes += 1; d.burned = true;
  chron(g, `${J(nameOf(id), '이/가')} 잠에서 깨다. 굴에 들어간 사람 때문이라고 한다.`, 80);
  dlog(g, `${J(nameOf(id), '이/가')} 굴에 든 나 때문에 깨어났다.`);
};
const familyHere = (g) => {
  const meP = byId(g, g.player.id);
  if (!meP) return [];
  const ids = [meP.spouseId, ...(meP.childIds ?? [])].filter((x) => x != null);
  return ids.map((id) => byId(g, id)).filter((p) => p?.alive && p.place === here(g) && p.id !== g.player.id);
};

/* ---------- 용의 땅으로 오른다 ---------- */
ACTIONS.push({
  id: 'dragon_climb', name: '용의 땅으로 오른다', icon: 'wander',
  desc: '천룡 산맥 서쪽, 용왕들이 잠든 땅으로 오른다. 용골 계곡, 용 숭배자 마을, 아는 용의 굴로 갈 수 있다. 사람의 법이 닿지 않는 곳이다.',
  available: (g) => free(g) && atGate(g) && !sceneQueued(g, 'dragon_climb'),
  run(g) {
    const S = DS(g);
    S.me.climbs += 1;
    tired(g, 20);
    know(g, 'crimson', 2);
    queueScene(g, 'dragon_climb', { place: here(g) }, { first: true });
    return S.me.climbs === 1
      ? '드워프 안내인은 얼음 고개 어귀까지만 간다고 했다. "그 위로는 우리도 안 가오. 갔던 사람은 돌아와서도 말이 없어지더군."'
      : '다시 얼음 고개를 올랐다. 바람이 바뀌는 곳에서부터 공기에 쇳내와 재 냄새가 섞인다.';
  },
});
defineScene('dragon_climb', {
  title: () => '천룡 산맥 서쪽',
  text: (g) => {
    const S = DS(g), aw = awakeOnes(g);
    return `얼음 고개를 넘자 봉우리들이 하늘을 가린다. 어느 봉우리에도 새가 앉지 않는다.${aw.length ? ` 먼 하늘에 ${J(nameOf(aw[0]), '이/가')} 원을 그리며 난다. 바위 그늘에 몸을 붙였다.` : ''} 갈 수 있는 곳은 몇 군데뿐이다.${S.me.served ? ' 숭배자의 붉은 끈을 손목에 맨 것을 본 산사람들이 길을 비켜 준다.' : ''}`;
  },
  choices: (g, s) => {
    if (!free(g) || here(g) !== s.place) return [];
    const S = DS(g), out = [];
    out.push({ label: '용골 계곡으로 간다', key: 'bones' });
    out.push({ label: '용 숭배자 마을로 간다', key: 'cult' });
    for (const id of SLEEPERS) if (S.dragons[id].known >= 1 && S.dragons[id].state !== 'dead') out.push({ label: `${DRAGONS[id].lair}로 간다 (${nameOf(id)})`, key: `lair:${id}` });
    if (S.dragons.young.state !== 'dead') out.push({ label: '젊은 용의 둥지를 살핀다', key: 'young' });
    out.push({ label: '돌아선다', key: 'back' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'back' || !free(g) || here(g) !== s.place) return '얼음 고개에서 돌아섰다. 아래 마을의 연기가 반가웠다.';
    if (key === 'bones') { queueScene(g, 'dragon_bones', { place: s.place }, { first: true }); return '용골 계곡으로 내려가는 비탈은 얼음과 뼛가루로 미끄럽다.'; }
    if (key === 'cult') { queueScene(g, 'dragon_cult', { place: s.place }, { first: true }); return '붉은 끈을 맨 장대가 길을 따라 서 있다. 그 끝에 마을이 있다.'; }
    if (key === 'young') { queueScene(g, 'dragon_young', { place: s.place }, { first: true }); know(g, 'young', 2); return '드워프들이 그을음의 둥지라 부르는 벼랑을 향해 올랐다. 바위마다 긁힌 자국이 있다.'; }
    const id = key.slice(5);
    if (!DRAGONS[id] || !isAlive(g, id)) return '길을 잃었다. 해 지기 전에 내려왔다.';
    queueScene(g, 'dragon_lair', { place: s.place, dragon: id }, { first: true });
    know(g, id, 2);
    return `${J(DRAGONS[id].lair, '으로/로')} 가는 길은 길이라기보다 짐승이 지나간 흔적이었다.`;
  },
});

/* ---------- 용골 계곡 ---------- */
defineScene('dragon_bones', {
  title: () => '용골 계곡',
  text: (g) => {
    const S = DS(g);
    return `붉은 용왕의 뼈가 계곡 하나를 채웠다. 갈비뼈 하나가 성문만 하다. ${S.bones >= 50 ? '아직 뼈가 많다. 도굴꾼들이 판 구덩이가 여기저기 있다.' : S.bones >= 20 ? '쓸 만한 뼈는 많이 뜯겨 나갔다. 도굴꾼들의 천막이 저만치 보인다.' : '거의 다 뜯겨 나갔다. 남은 것은 너무 커서 가져가지 못한 것들뿐이다.'} 바람이 뼈 사이를 지나며 낮게 운다.`;
  },
  choices: (g, s) => {
    if (!free(g) || here(g) !== s.place) return [];
    const S = DS(g);
    return [
      ...(S.bones > 5 ? [{ label: '갈비뼈 사이를 판다', key: 'dig' }] : []),
      ...(!S.me.clue ? [{ label: '머리뼈를 살핀다', key: 'skull' }] : []),
      { label: '돌아간다', key: 'back' },
    ];
  },
  resolve(g, rng, s, key) {
    const S = DS(g);
    if (key === 'back' || !free(g)) return '뼈 무덤에 오래 있고 싶지 않았다. 내려왔다.';
    if (key === 'dig') {
      tired(g, 15);
      S.bones = Math.max(5, S.bones - 2);
      S.dragons.frost.sleep = clamp(S.dragons.frost.sleep - 1, 0, 100);
      if (rng.chance(0.18)) {
        if (rng.chance(odds(playerPower(g), 45, 0.1, 0.9))) {
          const got = rng.int(15, 35);
          g.player.money += got;
          return `구덩이를 파는데 다른 도굴꾼 셋이 칼을 뽑고 다가왔다. 하나를 베자 나머지가 물러났다. 그들이 버리고 간 뼈 조각까지 챙겨 내려왔다. 구렁목 드워프 중개인이 은화 ${got}닢을 쳐 주었다.`;
        }
        injure(g, '도굴꾼의 칼에 베인 상처', 3);
        stress(g, 6);
        return '구덩이를 파는데 다른 도굴꾼들이 덮쳤다. 판 것을 다 빼앗기고 피를 흘리며 내려왔다. 이 계곡에서는 용보다 사람이 먼저 죽인다.';
      }
      if (!rng.chance(odds(st(g, 'str') + st(g, 'agi'), 70, 0.25, 0.9))) {
        injure(g, '용골 계곡에서 떨어져 다친 다리', 2);
        return '얼음 낀 갈비뼈를 타다가 미끄러졌다. 다리를 절며 빈손으로 내려왔다.';
      }
      const got = rng.int(30, 60) + Math.round(S.bones / 4);
      g.player.money += got;
      S.me.bones += 1;
      gainStat(g, 'str', 0.3);
      if (S.me.bones === 1) chron(g, `${g.player.name}, 용골 계곡에서 붉은 용왕의 뼈를 캐 오다.`, 20);
      return `얼어붙은 흙을 반나절 파서 손바닥 두 개만 한 뼈 조각을 떼어 냈다. 들어 보니 쇠보다 가볍다. 구렁목 드워프 중개인이 아무 말 없이 은화 ${got}닢을 세어 주었다.`;
    }
    // 머리뼈
    tired(g, 8);
    if (!rng.chance(odds(st(g, 'int') + st(g, 'sen'), 75, 0.2, 0.85))) return '머리뼈 안은 동굴 같았다. 한참을 더듬었지만 아무것도 찾지 못했다. 다만 이상하게 깨끗했다. 썩은 냄새도, 짐승이 뜯은 자국도 없었다.';
    S.me.clue = true;
    gainStat(g, 'int', 0.5);
    const lg = LG(g);
    if (lg.dragon && lg.dragon.step === 2) lg.dragon.found = true;
    dlog(g, '붉은 용왕의 머리뼈 안에서 금빛 가루를 보았다.');
    return '머리뼈 안쪽, 숨구멍 깊은 곳에 금빛 가루가 녹아 붙어 있었다. 손톱으로 긁어 보니 얇은 금박이다. 이런 금박은 대성당 성물함에나 쓴다. 상처도 독도 없이 죽은 용왕. 누가 무엇을 그 숨구멍에 넣었는지 생각하니 손이 차가워졌다.';
  },
});

/* ---------- 용 숭배자 마을 ---------- */
const offering = (g) => [3, 4, 5].includes(g.date.month) && DS(g).cult.power >= 30;
defineScene('dragon_cult', {
  title: () => '용 숭배자 마을',
  text: (g) => {
    const S = DS(g);
    return `돌집 마흔 채가 벼랑에 붙어 있다. 사람들은 말수가 적고, 손목마다 붉은 끈을 감았다. 마을 한가운데 제단에는 비늘 모양으로 깎은 돌이 놓였다. ${S.cult.power >= 55 ? '마을이 붐빈다. 산 아래에서 올라온 새 얼굴이 많다. 용이 뒤척이는 해에는 늘 그렇다고 한다.' : S.cult.power >= 30 ? '찾아오는 사람이 끊이지 않는다.' : '마을은 조용하다. 빈집이 몇 채 보인다.'}${offering(g) ? ' 제단 옆 우리에 손발이 묶인 아이 하나가 앉아 있다. 봄 제물이라고 한다.' : ''}${S.cult.foe ? ' 사람들이 나를 알아보고 등을 돌린다.' : ''}`;
  },
  choices: (g, s) => {
    if (!free(g) || here(g) !== s.place) return [];
    const S = DS(g);
    return [
      { label: '그들의 노래를 듣는다', key: 'listen' },
      ...(!S.me.served && !S.cult.foe ? [{ label: '붉은 끈을 받는다 (섬기는 이가 된다)', key: 'serve' }] : []),
      ...(offering(g) ? [{ label: '밤에 우리를 열고 아이를 빼낸다', key: 'rescue' }] : []),
      { label: '떠난다', key: 'back' },
    ];
  },
  resolve(g, rng, s, key) {
    const S = DS(g);
    if (key === 'back' || !free(g)) return '마을을 떠났다. 등 뒤에서 노래가 이어졌다.';
    if (key === 'listen') {
      if (S.cult.foe) { stress(g, 4); return '아무도 노래하지 않았다. 내가 떠날 때까지 마을 전체가 입을 닫고 있었다.'; }
      for (const id of SLEEPERS) know(g, id, 1);
      gainStat(g, 'int', 0.3);
      return '노래는 길었다. 여섯 용왕의 이름, 그중 하나가 죽은 해, 서쪽 끝 검은 봉우리에 잠든 가장 큰 것. "그분이 깨는 날 세상이 새로 쓰인다." 노래하는 사람들의 얼굴에 두려움과 기다림이 반반이었다.';
    }
    if (key === 'serve') {
      S.me.served = true;
      for (const id of SLEEPERS) know(g, id, 1);
      dlog(g, '용 숭배자 마을에서 붉은 끈을 받았다.');
      note(g, '용 숭배자 마을에서 붉은 끈을 받았다.');
      return '손목에 붉은 끈이 감겼다. 마을 노파가 내 이마에 재를 바르며 말했다. "용은 사람을 구하지 않는다. 다만 자기 것을 건드리지 않은 자는 기억해 두지." 성광교 사제가 이 끈을 보면 무엇이라 할지는 생각하지 않기로 했다.';
    }
    // 아이를 빼낸다
    tired(g, 15);
    S.cult.foe = true; S.me.served = false;
    if (rng.chance(odds(playerPower(g) + st(g, 'agi') / 2, 60, 0.15, 0.85))) {
      S.me.rescued += 1;
      renown(g, 4);
      deed(g, 'kind', 8, `${J(g.player.name, '이/가')} 용 숭배자들에게서 제물로 묶인 아이를 빼냈다더라`, s.place);
      deed(g, 'brave', 5, `${J(g.player.name, '이/가')} 용 숭배자 마을에 혼자 들어갔다더라`, s.place);
      chron(g, `${g.player.name}, 용 숭배자 마을에서 제물로 묶인 아이를 구하다.`, 35);
      dlog(g, '용 숭배자 마을의 봄 제물을 빼냈다.');
      return '자정이 지나 우리의 빗장을 끊었다. 아이는 울지도 않았다. 업고 얼음 고개를 넘는 동안 뒤에서 횃불들이 따라왔지만 고개 너머까지는 오지 않았다. 구렁목 드워프 과부가 아이를 받아 주었다. 숭배자들은 이 일을 잊지 않을 것이다.';
    }
    injure(g, '숭배자들의 낫에 베인 상처', 4);
    stress(g, 12);
    return '빗장을 끊는 소리에 개들이 짖었다. 숭배자들이 낫과 횃불을 들고 쏟아져 나왔다. 아이를 두고 벼랑으로 뛰었다. 등에 길게 베인 상처가 남았다. 그 아이가 어떻게 되었는지는 듣지 못했다.';
  },
});

/* ---------- 잠든 용왕의 굴 ---------- */
const lairText = (g, id) => {
  const d = dragonOf(g, id);
  if (d.state === 'awake') return '굴은 비어 있다. 바닥의 돌이 아직 따뜻하다. 보물 더미가 어둠 속에서 희미하게 빛난다. 주인이 언제 돌아올지는 모른다.';
  if (d.state === 'stir') return '굴 어귀에서 뜨거운 바람이 불어 나온다. 숨소리가 고르지 않다. 가끔 비늘이 바위를 긁는 소리가 난다. 깨어나기 직전의 잠이다.';
  return `굴 깊은 곳에서 숨소리가 들린다. 한 번 들이쉬는 데 백을 세었다. ${d.sleep >= 75 ? '잠은 깊다.' : '잠이 생각보다 얕다.'} 숨을 내쉴 때마다 보물 더미 위로 금빛 먼지가 인다.`;
};
const canTalk = (g, id) => { const d = dragonOf(g, id); return DRAGONS[id].dreams || d.state === 'stir'; };
defineScene('dragon_lair', {
  title: (g, s) => `${DRAGONS[s.dragon]?.lair ?? '용의 굴'}`,
  text: (g, s) => `${nameOf(s.dragon)}. ${DRAGONS[s.dragon]?.desc ?? ''} ${lairText(g, s.dragon)}`,
  choices: (g, s) => {
    const d = dragonOf(g, s.dragon);
    if (!d || d.state === 'dead' || !free(g) || here(g) !== s.place) return [];
    return [
      { label: '멀리서 지켜보고 물러난다', key: 'watch' },
      { label: '보물 더미에서 한 줌 집어 온다', key: 'steal' },
      ...(d.state !== 'awake' && canTalk(g, s.dragon) ? [{ label: '잠든 용에게 말을 건다', key: 'talk' }] : []),
      ...(d.state !== 'awake' ? [{ label: '잠든 목을 노린다 (돌아오지 못할 수 있다)', key: 'slay' }] : []),
    ];
  },
  resolve(g, rng, s, key) {
    const S = DS(g), id = s.dragon, d = dragonOf(g, id), D = DRAGONS[id], name = nameOf(id);
    if (!d || d.state === 'dead' || !free(g)) return '굴은 무너져 있었다. 돌아섰다.';
    if (key === 'watch') {
      know(g, id, 2);
      stress(g, 3);
      return `해가 질 때까지 바위 뒤에서 굴을 지켜보았다. ${d.state === 'awake' ? '주인은 돌아오지 않았다.' : `${J(name, '은/는')} ${sleepWord(d.sleep)}.`} 내려오는 내내 등 뒤가 서늘했다.`;
    }
    if (key === 'talk') {
      queueScene(g, 'dragon_talk', { dragon: id, dream: false }, { first: true });
      return '굴 어귀에 무릎을 꿇고 이름을 불렀다. 숨소리가 멎었다.';
    }
    if (key === 'steal') {
      tired(g, 20);
      const p = d.state === 'awake' ? 0.75 : clamp(0.2 + d.sleep / 200 + (st(g, 'agi') - 30) / 200, 0.1, 0.8);
      if (rng.chance(p)) {
        const got = Math.round(50 + d.hoard * 2 + rng.int(0, 80));
        g.player.money += got;
        d.hoard = clamp(d.hoard - 3, 0, 100);
        d.wrath = clamp(d.wrath + (d.state === 'awake' ? 60 : 45), 0, 100);
        if (d.state !== 'awake') d.sleep = clamp(d.sleep - 30, 0, 100);
        d.marked = true; d.owed = (d.owed ?? 0) + got; d.thief = realmOf(here(g));
        S.me.stole += 1;
        if (!S.me.stoleFrom.includes(id)) S.me.stoleFrom.push(id);
        dlog(g, `${name}의 보물 더미에서 금붙이를 집어 왔다.`);
        note(g, `${name}의 굴에서 금붙이를 집어 왔다.`);
        return `숨소리 사이사이로 발을 옮겼다. 금화 한 줌, 손가락만 한 붉은 보석 둘. 그것만 쥐고 빠져나왔다. 내려와서 세어 보니 은화 ${got}닢어치였다. ${d.state === 'awake' ? '돌아온 주인은 무엇이 비었는지 알 것이다.' : '굴을 나설 때 등 뒤의 숨소리가 한 번 멎었다가 이어졌다.'} 용은 자기 보물의 낱알까지 센다고들 한다.`;
      }
      d.wrath = clamp(d.wrath + 30, 0, 100); d.marked = true; d.thief = realmOf(here(g));
      injure(g, '용의 숨결에 덴 상처', 6);
      stress(g, 18);
      if (d.state === 'awake') return '보물 더미에 손을 뻗는 순간 하늘이 어두워졌다. 주인이 돌아왔다. 굴 밖으로 몸을 날렸고, 등 뒤로 불이 지나갔다. 살아 내려온 것이 이상하다. 용은 내 냄새를 기억할 것이다.';
      d.sleep = clamp(d.sleep - 45, 0, 100);
      if (d.sleep <= 0) {
        wakeNow(g, id, rng);
        queueScene(g, 'dragon_fire', { dragon: id, place: here(g), why: 'lair' }, { first: true });
        return '금화 더미가 무너지는 소리가 굴 안에 울렸다. 숨소리가 멎었다. 그리고 어둠 속에서 눈 하나가 열렸다.';
      }
      return '금화 더미가 무너지는 소리가 굴 안을 울렸다. 뜨거운 숨이 굴을 채웠다. 눈썹과 머리카락이 탔다. 빈손으로 기어 나왔다. 용은 깨지 않았다. 아직은.';
    }
    // 잠든 목을 노린다
    tired(g, 30);
    const v = playerPower(g) + 30 + (d.state === 'stir' ? -15 : 0);
    S.me.faced += 1;
    if (rng.chance(odds(v, D.pow, 0.01, 0.6))) {
      d.state = 'dead'; d.diedAt = mi(g); d.slayer = g.player.name;
      const got = Math.round(200 + d.hoard * 8);
      g.player.money += got;
      S.me.slain.push(id);
      renown(g, 40);
      angerAll(g, 50, id);
      S.cult.foe = true; S.me.served = false;
      bronzeBond(g, -50);
      if (legend(g, 'bronze')?.alive) { const b = legend(g, 'bronze'); if (b.role === 'patron') b.role = 'foe'; }
      gainSkill(g, 'sword', 3, 'str');
      deed(g, 'brave', 20, `${J(g.player.name, '이/가')} 천룡 산맥에서 용왕을 죽였다더라`, here(g));
      chron(g, `${g.player.name}, ${J(name, '을/를')} 죽이다. 오백 년 만에 사람의 손에 죽은 용왕이다.`, 95);
      dlog(g, `${J(name, '을/를')} 죽였다.`);
      return `잠든 목의 비늘 틈을 반나절 찾았다. 찾은 다음에는 한 번뿐이었다. ${J(name, '은/는')} 눈을 뜨지 못한 채 죽었다. 굴이 무너질 듯 울렸고, 그 울음은 산맥 끝까지 갔다. 보물 더미에서 지고 내려올 수 있는 만큼만 졌다. 은화 ${got}닢어치. 다른 용왕들이 그 울음을 들었다. 숭배자들도 들었다. 오늘부터 나는 용을 죽인 사람이다. 그 이름이 무엇을 데려올지는 아직 모른다.`;
    }
    d.wrath = 100; d.marked = true; d.thief = realmOf(here(g));
    wakeNow(g, id, rng);
    if (rng.chance(0.6)) {
      L(g).pendingDeath = `${name}의 불길`;
      chron(g, `${g.player.name}, 잠든 ${J(name, '을/를')} 노리다가 돌아오지 못하다.`, 70);
      return `칼이 비늘에 닿는 순간 알았다. 잠든 것이 아니었다. 굴 전체가 눈을 떴다. 그 뒤의 일은 아무도 모른다. 구렁목 사람들은 그날 밤 서쪽 하늘이 낮처럼 밝았다고 했다.`;
    }
    injure(g, `${name}에게 입은 화상`, 12);
    stress(g, 30);
    return `칼은 비늘에 튕겨 나갔다. ${J(name, '이/가')} 눈을 떴다. 불길이 굴을 채우기 전에 벼랑으로 몸을 던졌다. 눈더미 위에 떨어져 사흘을 기어 내려왔다. 살갗의 절반이 탔다. 용은 깨어 있고, 내 냄새를 안다.`;
  },
});

/* ---------- 용과 말을 섞는다 ---------- */
const VOICE = {
  ash: '목소리는 불 꺼진 재처럼 낮고 거칠었다. "또 사람이로군. 아르젠의 아이들도 처음에는 말을 걸러 왔지."',
  frost: '목소리는 빙하가 갈라지는 소리를 닮았다. "짧게 말하라, 하루살이. 네 한 마디가 끝나기 전에 너는 늙는다."',
  blind: '눈먼 용왕의 목소리는 꿈속의 바람처럼 사방에서 들렸다. "가까이 오너라. 나는 보지 못한다. 대신 네 숨에서 네가 지나온 고장의 냄새를 맡는다."',
  obsidian: '목소리라기보다 땅의 울림이었다. 말 한 마디가 뼈를 흔들었다. "오백 년. 아직 그것이 묶여 있는가."',
};
defineScene('dragon_talk', {
  title: (g, s) => `${J(nameOf(s.dragon), '과/와')} 말을 섞다`,
  text: (g, s) => `${s.dream ? '꿈이었다. 그런데 꿈이 아니었다. ' : ''}${VOICE[s.dragon] ?? '목소리가 들렸다.'}`,
  choices: (g, s) => {
    const d = dragonOf(g, s.dragon);
    if (!d || d.state === 'dead' || g.over) return [];
    if (!s.dream && (!free(g) || !atGate(g))) return [];
    const owed = owedOf(g, s.dragon);
    return [
      { label: '마신의 봉인을 묻는다', key: 'seal' },
      { label: '죽은 붉은 용왕을 묻는다', key: 'dead' },
      ...(d.marked && owed > 0 && canSpend(g, owed) ? [{ label: `가져간 것을 갚겠다고 한다 (은화 ${owed}닢)`, key: 'repay' }] : []),
      { label: '가르침을 청한다', key: 'learn' },
      { label: '물러난다', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    const S = DS(g), id = s.dragon, d = dragonOf(g, id), name = nameOf(id);
    if (!d || d.state === 'dead') return '목소리는 더 들리지 않았다.';
    stress(g, 6);
    if (key === 'leave') return '고개를 숙이고 물러났다. 등 뒤에서 낮은 웃음 같은 소리가 들렸다.';
    // 말을 섞기 전에: 용이 나를 알아보는가 (훔친 자, 숭배자, 청동의 비늘)
    if (d.marked && key !== 'repay' && !hasScale(g)) {
      d.wrath = clamp(d.wrath + 10, 0, 100);
      if (!s.dream) d.sleep = clamp(d.sleep - 10, 0, 100);
      return `"도둑의 냄새로군." 그 말 한마디에 숨이 막혔다. ${J(name, '은/는')} 더 말하지 않았다. 내 핏줄을 기억하겠다는 뜻이었다.`;
    }
    S.me.talks += 1; d.bond = clamp(d.bond + 5, -100, 100); know(g, id, 2);
    if (!s.dream) d.sleep = clamp(d.sleep - 3, 0, 100);
    if (S.me.talks === 1) chron(g, `${g.player.name}, ${J(name, '과/와')} 말을 섞다.`, 45);
    dlog(g, `${J(name, '과/와')} 말을 섞었다.`);
    if (key === 'repay') {
      const owed = owedOf(g, id);
      if (!spend(g, owed)) return '갚을 은화가 모자랐다. 용은 기다려 주지 않았다.';
      d.owed = 0; d.marked = false; d.wrath = Math.max(0, d.wrath - 50); d.thief = null;
      return `금화를 굴 어귀에 쏟았다. 은화 ${owed}닢어치. "낱알까지 맞는군." 한참 뒤에 목소리가 말했다. "아르젠은 갚지 않았다. 너는 갚았다. 기억해 두지." 내 핏줄에 걸린 것이 풀렸다.`;
    }
    if (key === 'seal') {
      const stage = g.seal ? sealState(g).stage : 0;
      if (g.seal) sealLearn(g, 2);
      gainStat(g, 'int', 0.5);
      const what = stage >= 4 ? '"묶은 줄이 실처럼 가늘어졌다. 우리 가운데 몇은 이미 북쪽 바다 너머를 보고 있다. 그것이 풀리면, 이 산맥도 사람의 왕국도 같이 탄다."'
        : stage >= 2 ? `"금이 갔다. 사람들은 아직 모른다. ${STAGES[stage]?.name ?? '금'}이라 부르는 모양이더군. 마탑의 늙은이들은 안다. 알면서 서로를 탓하지."`
        : '"오백 년 전 그 아이들이 묶은 매듭은 아직 단단하다. 다만 매듭이란 언젠가 풀리라고 묶는 것이다."';
      return `${what} ${id === 'obsidian' ? '흑요 용왕의 숨이 한 번 길게 이어졌다. 그것이 웃음인지 한숨인지 알 수 없었다.' : '그 말을 마지막으로 굴은 다시 조용해졌다.'}`;
    }
    if (key === 'dead') {
      gainStat(g, 'int', 0.3);
      if (S.me.clue) return `"금박이라." ${J(name, '이/가')} 오래 침묵했다. "사람의 성물이 용왕의 숨구멍에 들어갔다면, 사람의 손이 넣은 것이다. 청동이 그 손을 찾고 있다. 너도 찾는다면, 산맥은 너를 기억할 것이다." 바위가 미세하게 울렸다.`;
      return `"붉은 것은 상처 없이 죽었다. 용은 늙어서 죽지 않는다." 목소리가 낮아졌다. "청동이 사람의 모습으로 산을 내려간 까닭이 그것이다. 아는 것이 있거든 그에게 가라."`;
    }
    // 가르침
    gainStat(g, 'wil', 1);
    gainStat(g, 'int', 0.5);
    if ((g.player.skills.magic ?? 0) > 0) gainSkill(g, 'magic', 1.5, 'int');
    return rng.pick([
      '"마나는 너희가 만든 것이 아니다. 너희보다 먼저 있었고, 너희가 사라진 뒤에도 있다. 쥐려 하지 말고 흘러가는 쪽을 보아라." 깨어 보니 손끝이 오래 저렸다.',
      '"사람은 무엇이든 빨리 배운다. 그리고 빨리 잊는다. 너희의 책은 잊지 않으려는 몸부림이지." 그 뒤로 한참 동안 옛 마법의 이름들이 머릿속을 흘러갔다. 반은 기억했다.',
      '"오래 산다는 것은 같은 실수를 여러 번 본다는 뜻이다." 용은 아르젠과 그 전의 왕국들 이야기를 했다. 같은 이야기였다. 이름만 달랐다.',
    ]);
  },
});

/* ---------- 젊은 용의 둥지 ---------- */
defineScene('dragon_young', {
  title: () => '젊은 용의 둥지',
  text: (g) => {
    const y = DS(g).dragons.young;
    return `벼랑 위 둥지에 짐수레 바퀴, 녹슨 투구, 교회 종이 쌓여 있다. 반짝이는 것이면 다 가져온 것이다. ${y.wrath >= 40 ? '그을음은 둥지 위를 낮게 돌며 바위를 할퀸다. 성이 나 있다.' : '그을음은 보물 더미 위에 웅크려 반쯤 감은 눈으로 아래를 내려다본다.'} 몸집은 말 여섯 마리를 합친 만하다. 다 자란 용에 비하면 새끼다. 사람에 비하면 재앙이다.`;
  },
  choices: (g, s) => {
    const y = DS(g).dragons.young;
    if (y.state === 'dead' || !free(g) || here(g) !== s.place) return [];
    return [
      { label: '숨어서 지켜보고 내려간다', key: 'watch' },
      ...(canSpend(g, 20) ? [{ label: '은그릇을 던져 주고 지나간다 (은화 20닢)', key: 'tribute' }] : []),
      ...(canSpend(g, 80) ? [{ label: '용 사냥꾼들을 사서 친다 (은화 80닢)', key: 'hire' }] : []),
      { label: '혼자 친다 (돌아오지 못할 수 있다)', key: 'solo' },
    ];
  },
  resolve(g, rng, s, key) {
    const S = DS(g), y = S.dragons.young;
    if (y.state === 'dead' || !free(g)) return '둥지는 비어 있었다.';
    if (key === 'watch') { stress(g, 2); gainStat(g, 'sen', 0.3); return '해 질 녘까지 그을음이 사냥하는 것을 보았다. 날개를 접고 떨어지는 속도가 화살보다 빨랐다. 저것과 싸우는 일은 생각하지 않기로 했다.'; }
    if (key === 'tribute') {
      if (!spend(g, 20)) return '은화가 모자랐다. 조용히 물러났다.';
      y.bond = clamp(y.bond + 5, -100, 100); y.wrath = Math.max(0, y.wrath - 10);
      return '은그릇을 벼랑 위로 던졌다. 그을음이 고개를 돌려 그것을 물어 갔다. 그리고 한참 나를 보았다. 그날 둥지 아래를 지나는 동안 하늘은 조용했다.';
    }
    const hire = key === 'hire';
    if (hire && !spend(g, 80)) return '사냥꾼을 살 은화가 모자랐다.';
    tired(g, 30);
    S.me.faced += 1;
    const v = playerPower(g) + (hire ? 30 : 0);
    if (rng.chance(odds(v, DRAGONS.young.pow, 0.01, 0.75))) {
      y.state = 'dead'; y.diedAt = mi(g); y.slayer = g.player.name;
      const got = Math.round(80 + y.hoard * 6);
      g.player.money += got;
      S.me.slain.push('young');
      renown(g, 20);
      angerAll(g, 20, 'young');
      S.cult.foe = true; S.me.served = false;
      bronzeBond(g, -15);
      gainSkill(g, 'sword', 2, 'str');
      deed(g, 'brave', 14, `${J(g.player.name, '이/가')} 젊은 용 그을음을 잡았다더라`, here(g));
      chron(g, `${g.player.name}, 젊은 용 그을음을 잡다.`, 80);
      dlog(g, '젊은 용 그을음을 잡았다.');
      return `${hire ? '사냥꾼 일곱 가운데 넷이 돌아왔다. ' : ''}그을음은 마지막까지 보물 더미를 감싸고 죽었다. 아직 어린 것이었다. 둥지에서 은화 ${got}닢어치를 지고 내려왔다. 쇠망치 골의 드워프들이 술통을 열었다. 서쪽 봉우리들은 조용했다. 그 조용함이 더 무서웠다.`;
    }
    y.wrath = clamp(y.wrath + 40, 0, 100);
    if (rng.chance(hire ? 0.15 : 0.35)) {
      L(g).pendingDeath = '젊은 용의 불길';
      chron(g, `${g.player.name}, 젊은 용 그을음에게 덤볐다가 돌아오지 못하다.`, 60);
      return `${hire ? '사냥꾼들의 그물이 불에 탔다. ' : ''}그을음이 날개를 접고 떨어졌다. 그 뒤로는 불뿐이었다.`;
    }
    injure(g, '젊은 용에게 입은 화상', hire ? 6 : 9);
    stress(g, 22);
    return hire ? '그물이 불붙어 끊어졌다. 사냥꾼 셋이 벼랑 아래로 떨어졌다. 살아남은 사람들과 함께 눈더미를 굴러 내려왔다. 그 사람들의 가족에게 무엇이라 말해야 할지 모르겠다.' : '창이 비늘에 미끄러졌다. 꼬리가 나를 벼랑 너머로 쳐냈다. 떨어진 곳이 눈더미가 아니었다면 거기서 끝났다. 온몸이 그을린 채 사흘 만에 쇠망치 골에 닿았다.';
  },
});

/* ---------- 용이 찾아온 밤 ---------- */
defineScene('dragon_fire', {
  title: (g, s) => `${nameOf(s.dragon)}의 불`,
  text: (g, s) => {
    const name = nameOf(s.dragon);
    if (s.why === 'lair') return `굴 안의 어둠이 몸을 일으켰다. ${J(name, '이/가')} 깨어났다. 눈 하나가 횃불만 하다. 그 눈이 나를 보고 있다.`;
    if (s.why === 'mark') return `밤하늘의 별이 한쪽부터 지워졌다. 날개였다. ${J(name, '이/가')} 마을 위에 내려앉았다. 지붕들이 그 무게에 주저앉는다. 용은 사람들 사이에서 냄새 하나를 찾고 있다. 내 냄새다. 내 핏줄이 그 보물에 손을 댔다.`;
    return `${J(name, '이/가')} 마을 위를 돈다. 지붕마다 불이 붙는다. 사람들이 우물 쪽으로 몰려가다 서로를 밟는다.`;
  },
  choices: (g, s) => {
    if (g.over || g.player.alive === false) return [];
    const d = dragonOf(g, s.dragon), owed = owedOf(g, s.dragon);
    if (!d || d.state === 'dead') return [];
    return [
      { label: '달아난다', key: 'flee' },
      ...(hasScale(g) ? [{ label: '청동의 비늘을 들어 보인다', key: 'scale' }] : []),
      ...(d.marked && owed > 0 && canSpend(g, owed) ? [{ label: `훔친 것을 돌려준다 (은화 ${owed}닢)`, key: 'repay' }] : []),
      ...(DS(g).me.served ? [{ label: '숭배자의 노래를 부른다', key: 'song' }] : []),
      ...(s.why === 'burn' ? [{ label: '불붙은 집에서 사람들을 끌어낸다', key: 'save' }] : []),
      { label: '맞선다 (돌아오지 못할 수 있다)', key: 'face' },
    ];
  },
  resolve(g, rng, s, key) {
    const S = DS(g), id = s.dragon, d = dragonOf(g, id), name = nameOf(id);
    if (!d || d.state === 'dead') return '하늘은 조용했다.';
    stress(g, 15);
    const spare = (text) => { d.wrath = Math.max(0, d.wrath - 40); d.marked = false; d.thief = null; dlog(g, `${J(name, '이/가')} 나를 살려 두고 날아갔다.`); return text; };
    if (key === 'scale') {
      bronzeBond(g, 5);
      return spare(`청동빛 비늘을 머리 위로 들었다. ${J(name, '이/가')} 고개를 숙여 그것의 냄새를 맡았다. 오래. 그리고 날개를 폈다. "청동의 빚이로군." 바람이 마을을 쓸고 지나갔다. 불은 더 번지지 않았다. 다음 날 아침 비늘은 손바닥 안에서 미지근했다.`);
    }
    if (key === 'repay') {
      const owed = owedOf(g, id);
      if (!spend(g, owed)) return '돌려줄 은화가 모자랐다. 불길이 다가왔다.';
      d.owed = 0;
      return spare(`가진 금붙이를 모두 광장에 쏟았다. 은화 ${owed}닢어치. ${J(name, '이/가')} 앞발로 그것을 쓸어 담았다. 낱알까지 세는 눈이었다. 그리고 날아갔다. 마을 사람들은 그 뒤로 나와 눈을 마주치지 않는다.`);
    }
    if (key === 'song') {
      if (rng.chance(0.55)) return spare(`숭배자 마을에서 배운 노래를 불렀다. 목소리가 떨렸다. ${J(name, '이/가')} 목을 길게 빼고 들었다. 노래가 끝나자 날개 바람만 남기고 떠났다.`);
      injure(g, '용의 불에 덴 상처', 5);
      return `노래를 불렀다. ${J(name, '은/는')} 듣지 않았다. 불길이 지나간 뒤 숭배자들의 노래가 아무것도 아니라는 것을 알았다. 숨이 붙어 있는 것만으로 다행이었다.`;
    }
    if (key === 'save') {
      tired(g, 20);
      injure(g, '불붙은 들보에 덴 상처', 4);
      renown(g, 5);
      deed(g, 'kind', 10, `${J(g.player.name, '이/가')} 용의 불 속에서 사람들을 끌어냈다더라`, here(g));
      deed(g, 'brave', 8, `${J(g.player.name, '이/가')} 용이 머리 위에 있는데도 물러서지 않았다더라`, here(g));
      chron(g, `${g.player.name}, 용의 불 속에서 이웃들을 끌어내다.`, 40);
      return '불붙은 집 세 채에서 다섯 사람을 끌어냈다. 넷째 집에 들어갔을 때 지붕이 무너졌다. 누군가 내 발목을 잡아 끌어냈다. 아침이 되자 용은 가고 없었다. 고장 사람들이 내 이름을 불렀다.';
    }
    if (key === 'face') {
      S.me.faced += 1;
      if (rng.chance(odds(playerPower(g), DRAGONS[id].pow, 0.01, 0.4))) {
        d.wrath = Math.max(0, d.wrath - 30); d.until = mi(g);
        renown(g, 25);
        deed(g, 'brave', 18, `${J(g.player.name, '이/가')} 마을에 내려온 ${J(name, '과/와')} 맞서 물리쳤다더라`, here(g));
        chron(g, `${g.player.name}, ${J(name, '과/와')} 맞서 물러가게 하다.`, 85);
        dlog(g, `${J(name, '과/와')} 맞섰고, 용이 물러갔다.`);
        return `불길 속으로 걸어 나갔다. 무엇을 했는지는 다 기억나지 않는다. 비늘 하나가 깨졌고, 피가 흘렀다. 사람의 피가 아니었다. ${J(name, '이/가')} 처음으로 물러섰다. 날아가는 그림자를 마을 사람 모두가 보았다. 용은 물러난 것이지 진 것이 아니다. 그것을 아는 사람은 나 하나였다.`;
      }
      if (rng.chance(0.6)) {
        L(g).pendingDeath = `${name}의 불길`;
        chron(g, `${g.player.name}, ${J(name, '과/와')} 맞서다 불길 속에 쓰러지다.`, 70);
        return '칼을 뽑았다. 불길이 왔다. 그것이 마지막이었다.';
      }
      injure(g, `${name}의 불에 덴 상처`, 12);
      return `칼을 뽑고 섰다. 불길이 왔다. 정신이 들었을 때는 우물 바닥이었다. 누군가 나를 밀어 넣은 것이다. 살갗의 절반이 탔다. ${J(name, '은/는')} 떠났다. 노여움을 다 푼 것인지는 모른다.`;
    }
    // 달아난다
    S.me.fled += 1;
    let tail = '';
    if (s.why === 'mark') {
      burnPlace(g, id, here(g), () => {}, null, '');
      d.wrath = Math.max(0, d.wrath - 25);
      const fam = familyHere(g);
      if (fam.length && rng.chance(0.2)) {
        const p = rng.pick(fam);
        kill(g, p, '용의 불');
        tail = ` 불이 꺼진 뒤 ${J(p.name, '을/를')} 찾아 헤맸다. 잿더미 속에서 찾았다.`;
        chron(g, `${g.player.name}의 집안 사람 ${p.name}, 용의 불에 죽다.`, 50);
      }
    }
    if (rng.chance(odds(st(g, 'agi') + st(g, 'sen'), 60, 0.3, 0.92))) return `뒤도 돌아보지 않고 달렸다. 등 뒤에서 마을이 탔다.${tail} 용이 남긴 것은 재와 침묵이었다.`;
    injure(g, '용의 불에 덴 상처', 6);
    return `달렸지만 불이 더 빨랐다. 등이 타는 냄새를 맡으며 개울로 뛰어들었다.${tail} 살아남았다. 그것만은 확실하다.`;
  },
});

/* ---------- 사건 ---------- */
const TAVERN = ['barka', 'harfen', 'leocast', 'eisen', 'hammer', 'gorge', 'portel', 'graubel'];
const RICH_TARGETS = (g) => SLEEPERS.filter((id) => ['sleep', 'stir'].includes(DS(g).dragons[id].state) && DS(g).dragons[id].hoard > 10);
EVENTS.push({
  id: 'dragon_seekers', cooldown: 60, weight: 5,
  chance: () => 0.3,
  cond: (g) => free(g) && TAVERN.includes(here(g)) && !DS(g).stake && RICH_TARGETS(g).length > 0 && g.date.year >= 0,
  prepare: (g, rng) => { const t = rng.pick(RICH_TARGETS(g)); know(g, t, 1); return { target: t }; },
  title: '용의 보물 원정대',
  text: (g, c) => `주막 구석에서 사내 몇이 지도를 펼쳐 놓고 목소리를 낮춘다. ${nameOf(c.target)}의 굴로 가는 길을 안다는 드워프 안내인이 있다고 한다. "한몫 끼면 열 배로 돌려주겠소. 용은 잔다니까. 백 년째." 돈을 보탤 사람을 찾는 중이다.`,
  choices: [
    {
      label: '은화 20닢을 보탠다', show: (g) => canSpend(g, 20),
      run: (g, rng, c) => {
        if (!spend(g, 20)) return '주머니를 뒤졌지만 은화가 모자랐다.';
        DS(g).stake = { target: c.target, amount: 20, due: mi(g) + rng.int(3, 6), realm: realmOf(here(g)) };
        return '은화 스무 닢을 지도 위에 올려놓았다. 사내들이 내 이름을 적었다. 몇 달 뒤면 소식이 올 것이다. 오지 않을 수도 있다.';
      },
    },
    { label: '아르젠 이야기를 해 준다', run: (g) => { gainStat(g, 'int', 0.3); deed(g, 'honest', 2, `${J(g.player.name, '이/가')} 용의 보물을 노리는 원정대를 말렸다더라`, here(g)); return '"백이십 년 전, 용의 보물을 훔친 나라가 하룻밤에 재가 됐소." 사내들은 웃었다. 하나만 웃지 않았다. 그 사람은 다음 날 아침 원정대에서 빠졌다.'; } },
    { label: '모른 척한다', run: () => '술잔을 비우고 일어섰다. 몇 달 뒤 그 사내들의 얼굴을 다시 볼 일은 없을 것 같다.' },
  ],
});
EVENTS.push({
  id: 'dragon_dream', cooldown: 72, weight: 4,
  chance: (g) => (DS(g).dragons.blind.state === 'stir' ? 0.4 : 0.12),
  cond: (g) => isAdult(g) && !g.over && isAlive(g, 'blind') && (DS(g).dragons.blind.known >= 2 || DS(g).me.talks > 0 || ['gorge', 'hammer'].includes(here(g))) && !sceneQueued(g, 'dragon_talk'),
  title: '꿈속의 목소리',
  text: () => '잠결에 누가 이름을 불렀다. 눈을 뜨니 방이 아니었다. 끝없이 넓은 어둠 속에 무엇인가 거대한 것이 숨 쉬고 있다. 그것에게는 눈이 없었다.',
  choices: [
    { label: '목소리에 답한다', run: (g) => { know(g, 'blind', 2); queueScene(g, 'dragon_talk', { dragon: 'blind', dream: true }, { first: true }); return '"여기 있습니다." 내 목소리가 어둠 속으로 퍼졌다.'; } },
    { label: '깨어나려 애쓴다', run: (g) => { gainStat(g, 'wil', 0.5); stress(g, 4); return '손톱으로 손바닥을 찔렀다. 눈을 뜨니 새벽이었다. 베개가 땀에 젖어 있었다. 그 숨소리가 아직 귓가에 남았다.'; } },
  ],
});
EVENTS.push({
  id: 'dragon_shadow', cooldown: 18, weight: 7,
  chance: () => 0.6,
  cond: (g) => free(g) && awakeOnes(g).length > 0 && ['gorge', 'hammer', 'graubel', 'verden', 'eisen', 'leocast', 'fur'].includes(here(g)),
  prepare: (g, rng) => ({ dragon: rng.pick(awakeOnes(g)) }),
  title: '하늘을 지나는 그림자',
  text: (g, c) => `한낮에 해가 가려졌다. 구름이 아니었다. ${J(nameOf(c.dragon), '이/가')} 고장 위를 높이 지나간다. 장터가 얼어붙었다. 개들조차 짖지 않는다.`,
  choices: [
    { label: '문을 걸어 잠그고 기다린다', run: (g) => { stress(g, 5); return '빗장을 지르고 식구들과 마루 밑에 웅크렸다. 날개 소리가 멀어지는 데 한나절이 걸렸다.'; } },
    { label: '지붕에 올라 끝까지 본다', run: (g, rng, c) => { gainStat(g, 'sen', 0.5); gainStat(g, 'wil', 0.3); stress(g, 8); know(g, c.dragon, 2); return '지붕에 올라 그것이 산맥 쪽으로 사라질 때까지 보았다. 비늘 한 장이 방패만 했다. 다리가 떨렸지만 눈을 돌릴 수 없었다. 저런 것이 이 세상에 산다.'; } },
  ],
});
EVENTS.push({
  id: 'dragon_preacher', cooldown: 48, weight: 5,
  chance: () => 0.35,
  cond: (g) => free(g) && DS(g).cult.power >= 40 && ['gorge', 'hammer', 'graubel', 'verden', 'eisen', 'harfen'].includes(here(g)),
  title: '용을 섬기라는 설교',
  text: () => '광장 우물가에서 손목에 붉은 끈을 감은 사내가 외친다. "봉인이 흔들리는 때가 오면 사람의 신은 아무도 구하지 못한다. 그날 하늘을 지키는 것은 용이다. 용에게 무릎 꿇은 자만 그 불을 피하리라." 사람들이 생각보다 오래 듣고 있다.',
  choices: [
    { label: '끝까지 듣는다', run: (g) => { for (const id of SLEEPERS) know(g, id, 1); gainStat(g, 'int', 0.2); return '사내는 여섯 용왕의 이름을 하나씩 불렀다. 그중 하나는 죽었다. 하나는 사람 사이에 섞여 있다고 했다. 사람들은 웃지 않았다.'; } },
    { label: '사내를 쫓아낸다', run: (g) => { DS(g).cult.foe = true; DS(g).me.served = false; deed(g, 'brave', 3, `${J(g.player.name, '이/가')} 용 숭배자 설교꾼을 쫓아냈다더라`, here(g)); return '멱살을 잡아 광장 밖으로 끌어냈다. 사내는 저항하지 않았다. 다만 내 얼굴을 오래 보았다. "기억해 두겠소." 숭배자들은 기억하는 사람들이다.'; } },
    { label: '지나친다', run: () => '듣지 않고 지나쳤다. 하지만 그날 저녁 주막에서 그 설교 이야기를 세 번 들었다.' },
  ],
});
EVENTS.push({
  id: 'dragon_cult_revenge', cooldown: 60, weight: 5,
  chance: () => 0.25,
  cond: (g) => free(g) && DS(g).cult.foe && DS(g).cult.power >= 25,
  title: '붉은 끈의 사람들',
  text: () => '밤길에 그림자 셋이 따라붙었다. 모두 손목에 붉은 끈을 감았다. "용께서 기억하지 못하시면 우리가 기억한다."',
  choices: [
    {
      label: '칼을 뽑는다',
      run: (g, rng) => {
        if (rng.chance(odds(playerPower(g), 40, 0.15, 0.9))) { deed(g, 'brave', 3, `${J(g.player.name, '이/가')} 밤길에 덮친 자객들을 물리쳤다더라`, here(g)); return '셋 가운데 둘을 쓰러뜨렸다. 하나는 어둠 속으로 사라졌다. 쓰러진 자들의 손목에서 붉은 끈을 풀어 강에 던졌다.'; }
        injure(g, '숭배자의 칼에 찔린 상처', 4);
        stress(g, 10);
        return '칼날이 옆구리를 스쳤다. 피를 흘리며 경비대 초소까지 달렸다. 그들은 쫓아오지 않았다. 다음에도 오지 않으리라는 보장은 없다.';
      },
    },
    {
      label: '돈으로 원한을 푼다 (은화 40닢)', show: (g) => canSpend(g, 40),
      run: (g) => {
        if (!spend(g, 40)) return '은화가 모자랐다. 그림자들이 다가왔다.';
        DS(g).cult.foe = false;
        return '주머니를 통째로 던졌다. 하나가 그것을 주워 무게를 가늠했다. "제단에 바치겠소. 용께서 받으시면 그만이오." 그들은 떠났다. 용이 받았는지는 모른다.';
      },
    },
  ],
});
EVENTS.push({
  id: 'dragon_cult_tithe', cooldown: 10, weight: 6,
  chance: () => 0.8,
  cond: (g) => free(g) && DS(g).me.served && g.date.month === 4,
  title: '봄 제물',
  text: () => '붉은 끈을 맨 사람이 찾아왔다. "봄 제물의 철이오. 섬기는 이는 저마다 몫을 낸다. 은화든, 피든."',
  choices: [
    {
      label: '은화 25닢을 낸다', show: (g) => canSpend(g, 25),
      run: (g) => { if (!spend(g, 25)) return '은화가 모자랐다.'; DS(g).cult.power = clamp(DS(g).cult.power + 1, 0, 100); return '은화를 건넸다. 사내는 세어 보지도 않고 품에 넣었다. 올봄 제단에 무엇이 오르는지는 묻지 않았다.'; },
    },
    {
      label: '붉은 끈을 끊는다',
      run: (g) => { DS(g).me.served = false; DS(g).cult.foe = true; deed(g, 'brave', 2, `${J(g.player.name, '이/가')} 용 숭배자들과 연을 끊었다더라`, here(g)); return '손목의 끈을 끊어 그의 발치에 던졌다. 사내는 그것을 주워 들고 한참 보았다. "용께서는 잊으셔도 우리는 잊지 않소."'; },
    },
  ],
});

