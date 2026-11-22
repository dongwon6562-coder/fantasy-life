// 도시의 하루 (34단계): 마력 공장이 들어선 뒤의 도시 살림.
// 시골에서 몰려드는 사람들, 오르는 셋방 세, 공장 거리, 품삯과 파업, 아이 일꾼, 사라지는 옛 일.
// 공장 발명 전에는 아무것도 보이지 않는다(앞날을 미리 보여 주지 않으려고). 플레이어 없이도 도시는 붐비고 파업이 일어난다.
// 화면: cityLine(g) 오늘의 장면 한 줄, cityInfo(g) 화면용 묶음.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { WORK, doWork, takeJob } from '../jobs.js';
import { me, playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { invented } from '../era/state.js';
import { LATE, FADING, fadeOf, lateJobIds } from '../era/later.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place;
const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 131) ^ Math.imul(mi(g) * 173 + salt + 401, 2654435761)) | 0 });
const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };

// 공장이 서는 도시와 사람이 빠져나가는 시골
export const MILL_TOWNS = ['harfen', 'leocast', 'eisen'];
export const VILLAGES = ['ern', 'gruental', 'klein', 'fr_moor', 'fr_wood'];
export const factoryAge = (g) => invented(g, LATE.factory);

function fresh() {
  return { towns: {}, me: { struck: 0, scab: 0, led: 0, black: {}, kids: [], faded: {} }, left: 0, eventAt: 0, log: [] };
}
export const CS = (g) => (g.city ??= fresh());
export const town = (g, pl) => (CS(g).towns[pl] ??= { crowd: 20, wage: 1, unrest: 10, strike: null, last: 0 });
export const strikeHere = (g) => !!(MILL_TOWNS.includes(here(g)) && CS(g).towns[here(g)]?.strike);
const logCity = (g, text) => { const s = CS(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.splice(0, s.log.length - 30); };
const atMill = (g) => factoryAge(g) && MILL_TOWNS.includes(here(g)) && !L(g).travel;
const myKids = (g) => (me(g)?.childIds ?? []).map((id) => g.people.find((p) => p.id === id)).filter((p) => p && p.alive);
const kidAge = (p) => Math.floor((p.ageMonths ?? 0) / 12);
const crowdWord = (c) => (c >= 80 ? '골목마다 사람이 넘친다' : c >= 55 ? '셋방 구하기가 어렵다' : c >= 35 ? '날마다 새 얼굴이 들어온다' : '아직은 한산하다');

/* ---------- 아이 일꾼 ---------- */
const poorKid = (g) => (L(g).home === 'family' && (g.player.familyMoney ?? 0) < 60) || L(g).home === 'street' || g.player.money < 5;
ACTIONS.push({
  id: 'city_childwork', name: '공장 심부름을 나간다', icon: 'coin',
  desc: '공장에서 실 감개를 갈고 베틀 밑을 기어 다니며 끊긴 실을 잇는다. 아이 손이 작아서 쓴다고 한다.',
  available: (g) => free(g) && atMill(g) && playerAge(g) >= 9 && playerAge(g) <= 14 && poorKid(g),
  run(g, rng) {
    const t = town(g, here(g));
    const coins = Math.max(1, Math.round(2 * t.wage));
    tired(g, 16); stress(g, 3);
    let hurt = '';
    if (rng.chance(0.03)) { g.player.injuries.push({ name: rng.pick(['베틀 북에 찧은 손가락', '실 감개에 감긴 머리채', '기계 밑에서 긁힌 등']), months: 2 }); hurt = ' 기계 밑에서 다쳤다. 감독은 피를 닦으라고 걸레를 던졌다.'; }
    if (L(g).home === 'family') { g.player.familyMoney += coins; } else g.player.money += coins;
    const lines = ['호루라기 소리에 맞춰 베틀 밑으로 기어 들어갔다. 끊긴 실을 잇고 나오면 또 끊겨 있었다.', '실 감개 수백 개를 갈아 끼웠다. 밤에 눈을 감아도 감개가 돌았다.', '나보다 어린 아이가 졸다가 감독에게 귀를 잡혀 끌려 나갔다.', '점심때 공장 마당 구석에서 다른 아이들과 빵 한 덩이를 나눴다. 다들 기침을 했다.'];
    return `${rng.pick(lines)} 품삯 은화 ${coins}닢은 ${L(g).home === 'family' ? '어머니 손에 쥐여 드렸다' : '주머니 깊이 넣었다'}.${hurt}`;
  },
});

/* ---------- 공장 직공: 도시 품삯과 공장 거리의 일들 ---------- */
if (WORK.factory_hand) {
  WORK.factory_hand.work = function factoryWork(g, rng) {
    const pl = here(g), t = town(g, pl), s = CS(g);
    if ((s.me.black[pl] ?? 0) > mi(g)) { L(g).job = null; return '공장 문지기가 명부를 보더니 고개를 저었다. 파업 때 앞장선 이름은 이 거리 어느 공장에도 들지 못한다.'; }
    if (t.strike && !s.me.scabNow) return '공장 문은 닫혀 있고, 문 앞에는 팔짱 낀 직공들이 서 있다. 오늘은 일이 없다.';
    const text = doWork(g, rng, this, { wageMul: t.wage, tire: 16 });
    if (mi(g) - s.eventAt >= 3 && rng.chance(0.3)) {
      s.eventAt = mi(g);
      const k = rng.pick(['accident', 'kids', 'foreman']);
      if (!sceneQueued(g, 'city_mill')) queueScene(g, 'city_mill', { kind: k });
    }
    return text;
  };
}
defineScene('city_mill', {
  need: (g) => atMill(g) && L(g).job?.id === 'factory_hand',
  title: (g, s) => ({ accident: '기계가 사람을 문다', kids: '베틀 밑의 아이들', foreman: '감독' }[s.kind]),
  text: (g, s) => {
    switch (s.kind) {
      case 'accident': return '옆 줄 마력 베틀에 소매가 감겼다. 비명이 기계 소리에 묻힌다. 멈춤 손잡이는 감독 자리 옆, 열 걸음 밖이다. 손잡이를 당기면 한 줄 전체가 서고, 그날 품삯을 다 같이 잃는다.';
      case 'kids': return '베틀 밑을 기어 다니는 아이들 가운데 하나가 기침을 멈추지 못한다. 열 살이나 되었을까. 감독이 다가오며 허리띠를 푼다.';
      case 'foreman': return '감독이 이번 달부터 늦게 오는 사람은 품삯을 절반만 준다고 했다. 줄 맨 끝의 늙은 직공이 무릎을 짚고 일어서지 못한다. 감독이 그를 쳐다본다.';
      default: return '';
    }
  },
  choices: (g, s) => {
    switch (s.kind) {
      case 'accident': return [{ label: '달려가 멈춤 손잡이를 당긴다', key: 'stop' }, { label: '소매를 칼로 끊으러 뛰어든다', key: 'cut' }, { label: '감독을 부른다', key: 'call' }, { label: '못 본 척 내 베틀을 지킨다', key: 'no' }];
      case 'kids': return [{ label: '감독 앞을 막아선다', key: 'block' }, { label: '내 빵을 아이에게 쥐여 준다', key: 'bread' }, { label: '고개를 돌린다', key: 'no' }];
      case 'foreman': return [{ label: '늙은 직공을 부축해 줄에 세운다', key: 'help' }, { label: '직공들을 모아 감독에게 따진다', key: 'protest' }, { label: '내 자리만 지킨다', key: 'no' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const pl = here(g), t = town(g, pl);
    switch (s.kind) {
      case 'accident':
        if (key === 'no') { stress(g, 8); return '내 베틀만 보고 있었다. 기계가 멈췄을 때는 이미 늦었다. 그날 밤 그 사람의 비명이 귀에서 떠나지 않았다.'; }
        if (key === 'call') { stress(g, 4); return '감독을 불렀다. 감독이 느릿느릿 와서 손잡이를 당겼다. 그 사람은 팔 하나를 잃고 살았다.'; }
        if (key === 'stop') { deed(g, 'kind', 2, '공장에서 기계를 세워 사람을 살렸다', pl); g.player.money -= Math.min(g.player.money, 2); t.unrest = clamp(t.unrest + 3, 0, 100); return '손잡이를 당겼다. 한 줄 전체가 멈췄다. 소매가 감긴 사람은 손가락 둘만 잃었다. 감독은 그날 줄 전체의 품삯을 깎았다. 아무도 나를 탓하지 않았다.'; }
        deed(g, 'brave', 2, '기계에 감긴 직공을 칼로 끊어 꺼냈다', pl);
        if (check(rng, (g.player.stats.agi ?? 0), 40)) return '돌아가는 굴대 옆으로 몸을 던져 소매를 끊었다. 둘 다 바닥에 나뒹굴었다. 그 사람은 내 손을 잡고 한참을 떨었다.';
        g.player.injuries.push({ name: '베틀 굴대에 찧은 팔', months: 3 });
        return '소매를 끊었지만 내 팔이 굴대에 찧였다. 둘 다 살았다. 감독은 다친 날 품삯은 없다고 했다.';
      case 'kids':
        if (key === 'no') { stress(g, 5); return '고개를 돌렸다. 허리띠 소리가 났다. 아이는 그날도, 다음 날도 베틀 밑을 기었다.'; }
        if (key === 'bread') { deed(g, 'kind', 1, '공장 아이에게 빵을 나눠 주었다', pl); return '빵을 쥐여 주었다. 아이는 고맙다는 말 대신 빵을 품에 감췄다. 동생 몫이라고 했다.'; }
        deed(g, 'brave', 1, '공장 감독 앞을 막아섰다', pl); t.unrest = clamp(t.unrest + 4, 0, 100);
        if (rng.chance(0.35)) { CS(g).me.black[pl] = mi(g) + 12; return '감독 앞을 막아섰다. 감독은 허리띠를 다시 맸다. 그리고 내 이름을 장부에 적었다. 다음 달 공장 문지기가 나를 들이지 않았다.'; }
        return '감독 앞을 막아섰다. 감독은 한참 나를 노려보다 허리띠를 다시 맸다. 주변 직공들이 아무 말 없이 일손을 멈추고 있었다.';
      case 'foreman':
        if (key === 'no') return '내 자리만 지켰다. 늙은 직공은 그날 품삯 절반을 받았다. 다음 주에는 보이지 않았다.';
        if (key === 'help') { deed(g, 'kind', 1, '늙은 직공을 부축했다', pl); return '늙은 직공을 부축해 줄에 세웠다. 감독은 혀를 찼지만 그냥 지나갔다. 늙은이가 내 손등을 두 번 두드렸다.'; }
        t.unrest = clamp(t.unrest + 8, 0, 100); deed(g, 'brave', 1, '공장 감독에게 따졌다', pl);
        if (check(rng, (g.player.stats.cha ?? 0) * 0.6 + 10, 40)) return '직공 서른이 감독 앞에 섰다. 감독은 반 시진을 버티다 늦은 사람 품삯 깎는 일을 없던 걸로 했다. 그날 퇴근길에 누군가 내 어깨를 쳤다. "다음엔 더 큰 걸 따져 보자고."';
        CS(g).me.black[pl] = mi(g) + 6;
        return '따지러 나선 사람은 나를 빼고 셋뿐이었다. 감독은 넷의 이름을 적었다. 반년 동안 이 거리 공장에서 일을 얻지 못할 것이다.';
      default: return '';
    }
  },
});

/* ---------- 파업 ---------- */
defineScene('city_strike', {
  need: (g) => strikeHere(g),
  title: () => '파업',
  text: (g) => {
    const t = town(g, here(g));
    return `${placeName(here(g))} 공장 거리 직공들이 일손을 놓았다. 품삯을 올리고 아이들을 베틀 밑에서 빼라는 것이다. 공장 문 앞에 사람들이 팔짱을 끼고 섰다. 공장주는 사흘 안에 돌아오지 않으면 시골에서 새 일꾼을 들이겠다고 한다. 들어가면 품삯을 곱절로 주겠다는 쪽지도 돈다.${t.strike?.stage >= 1 ? ' 경비대가 거리 끝에 줄지어 섰다.' : ''}`;
  },
  choices: (g) => {
    const out = [{ label: '팔짱 낀 줄에 선다', key: 'join' }, { label: '앞장서서 사람들을 이끈다', key: 'lead' }];
    if (L(g).job?.id === 'factory_hand') out.push({ label: '곱절 품삯을 받고 공장에 들어간다', key: 'scab' });
    out.push({ label: '어느 쪽에도 끼지 않는다', key: 'away' });
    return out;
  },
  resolve(g, rng, s, key) {
    const c = CS(g), pl = here(g), t = town(g, pl);
    if (key === 'away') return '파업 날마다 다른 길로 돌아다녔다. 양쪽 다 나를 곱게 보지 않았다.';
    if (key === 'scab') {
      c.me.scab += 1; c.me.scabNow = true;
      const n = Math.round(10 * t.wage); g.player.money += n;
      deed(g, 'loyal', -2, '파업 중에 공장에 들어갔다', pl);
      if (rng.chance(0.4)) { g.player.injuries.push({ name: '파업 줄에서 날아온 돌에 맞은 머리', months: 2 }); return `공장 뒷문으로 들어갔다. 곱절 품삯 은화 ${n}닢. 나오는 길에 어디선가 돌이 날아왔다. 피가 눈썹을 타고 흘렀다.`; }
      return `공장 뒷문으로 들어갔다. 곱절 품삯 은화 ${n}닢. 텅 빈 공장 안에서 기계 소리가 유난히 컸다. 줄에 섰던 이웃이 다음 날부터 인사를 받지 않았다.`;
    }
    c.me.struck += 1;
    t.strike.backers = (t.strike.backers ?? 0) + (key === 'lead' ? 2 : 1);
    if (key === 'lead') {
      c.me.led += 1; t.strike.ledBy = g.player.name;
      deed(g, 'brave', 2, '공장 파업에 앞장섰다', pl);
      stress(g, 6);
      note(g, `${placeName(pl)} 공장 파업에 앞장섰다.`);
      return '나무 상자 위에 올라가 소리쳤다. 목소리가 떨렸지만 아무도 웃지 않았다. 아낙들이 솥을 걸어 줄에 선 사람들에게 죽을 나눴다. 공장주 쪽 사람들이 내 얼굴을 오래 보고 갔다.';
    }
    deed(g, 'loyal', 1, '파업 줄에 섰다', pl);
    return '줄에 섰다. 옆 사람과 팔을 걸었다. 하루 품삯이 날아갔지만, 혼자가 아니라는 것이 이상하게 든든했다.';
  },
});

/* ---------- 내 아이를 공장에 보낼까 ---------- */
defineScene('city_sendkid', {
  need: (g, s) => atMill(g) && myKids(g).some((p) => p.id === s.kid && kidAge(p) >= 8 && kidAge(p) <= 13),
  title: () => '아이의 품삯',
  text: (g, s) => {
    const k = g.people.find((p) => p.id === s.kid);
    return `공장 감독이 집에 찾아왔다. ${J(k.name, '을/를')} 실 감개 일에 보내면 다달이 은화 두 닢을 주겠다고 한다. 이웃집 아이들은 다 나간다. 살림은 빠듯하고, ${k.name}의 손은 작고 빠르다.`;
  },
  choices: () => [{ label: '공장에 보낸다', key: 'send' }, { label: '집에서 일을 돕게 한다', key: 'home' }, { label: '서당이나 학원에 보낸다', key: 'school' }],
  resolve(g, rng, s, key) {
    const c = CS(g), k = g.people.find((p) => p.id === s.kid), pl = here(g);
    if (!k) return '그 사이 형편이 달라졌다.';
    if (key === 'send') { if (!c.me.kids.includes(k.id)) c.me.kids.push(k.id); k.history?.push({ y: g.date.year, m: g.date.month, text: `${placeName(pl)} 공장에 실 감개 일을 나가기 시작했다.` }); return `${J(k.name, '이/가')} 새벽 호루라기에 맞춰 집을 나섰다. 돌아올 때는 눈이 퀭했다. 저녁상에 고기가 한 점 올랐다.`; }
    if (key === 'school') { deed(g, 'kind', 1, '아이를 공장 대신 글방에 보냈다', pl); pay(g, 3); return `${J(k.name, '을/를')} 글방에 보냈다. 이웃들은 배부른 소리라고 했다. ${J(k.name, '은/는')} 저녁마다 배운 글자를 벽에 썼다.`; }
    return `${J(k.name, '은/는')} 집에서 동생들을 보고 물을 긷는다. 살림은 여전히 빠듯하다.`;
  },
});

/* ---------- 셋방 세가 오른다 ---------- */
defineScene('city_landlord', {
  need: (g) => atMill(g) && L(g).home === 'rent',
  title: () => '집주인',
  text: (g) => `집주인이 문을 두드렸다. 시골에서 사람이 몰려와 이 방을 두 배 값에 달라는 사람이 줄을 섰다고 한다. 다음 달부터 세를 은화 ${Math.round(town(g, here(g)).crowd / 20)}닢 더 받겠다고 한다. ${crowdWord(town(g, here(g)).crowd)}.`,
  choices: (g) => {
    const out = [{ label: '오른 세를 낸다', key: 'pay' }, { label: '못 올린다고 버틴다', key: 'haggle' }];
    out.push({ label: '방을 빼고 여관으로 옮긴다', key: 'leave' });
    return out;
  },
  resolve(g, rng, s, key) {
    const c = CS(g), pl = here(g);
    if (key === 'pay') { c.me.rentUp = (c.me.rentUp ?? 0) + Math.round(town(g, pl).crowd / 20); return '오른 세를 내기로 했다. 집주인은 웃으며 계단을 내려갔다. 아래층에서 같은 소리가 또 들렸다.'; }
    if (key === 'leave') { L(g).home = 'inn'; c.me.rentUp = 0; return '짐을 쌌다. 내가 나간 날 저녁, 시골에서 온 다섯 식구가 그 방에 들었다.'; }
    if (check(rng, (g.player.stats.cha ?? 0) * 0.6 + 8, 40)) return '이 방 창틀이 썩은 얘기, 지붕이 새는 얘기를 늘어놓았다. 집주인은 투덜대며 세를 올리지 않고 돌아갔다.';
    c.me.rentUp = (c.me.rentUp ?? 0) + Math.round(town(g, pl).crowd / 15); stress(g, 4);
    return '버텼다. 집주인은 다음 날 장정 둘을 데리고 와서 문간에 섰다. 결국 처음 부른 것보다 더 올려 주었다.';
  },
});

/* ---------- 옛 일이 사라진다 ---------- */
const FADE_TEXT = {
  coachman: '마부 조합 술집이 한산하다. 손님들은 이제 쇠수레나 쇠수레 길을 탄다. 조합장이 말 두 마리를 팔았다며 술잔을 비웠다.',
  clerk: '서기실 책상이 반으로 줄었다. 베껴 쓰던 문서는 이제 찍어 내거나 수정구로 보낸다. 서기장이 늙은 서기들부터 내보내겠다고 한다.',
  sailor: '돛배 일감이 줄었다. 선주들은 바람을 기다리지 않는 증기선을 사들인다. 늙은 갑판장이 돛을 기우며 다음 배가 마지막일 거라고 한다.',
};
const NEW_FOR = { coachman: ['factory_hand', 'carter'], clerk: ['reporter', 'wireman', 'typesetter'], sailor: ['stoker'] };
defineScene('city_fade', {
  need: (g, s) => L(g).job?.id === s.job,
  title: () => '줄어드는 일감',
  text: (g, s) => FADE_TEXT[s.job] ?? '일감이 줄었다.',
  choices: (g, s) => {
    const out = [];
    const nw = (NEW_FOR[s.job] ?? []).find((id) => WORK[id]?.places.includes(here(g)) && !WORK[id].req?.(g));
    if (nw) out.push({ label: `새 일(${WORK[nw].name})을 배우러 간다`, key: `new:${nw}` });
    out.push({ label: '줄어든 품삯이라도 버틴다', key: 'hold' }, { label: '이 일을 그만둔다', key: 'quit' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key.startsWith('new:')) { const id = key.slice(4); if (!WORK[id]?.places.includes(here(g))) return '그 일자리는 그 사이 다 찼다.'; takeJob(g, id); return `${WORK[id].name} 일을 배우기로 했다. 첫날 나보다 열 살 어린 사람에게 일을 배웠다. 자존심이 상했지만, 품삯이 나오는 쪽이 이긴다.`; }
    if (key === 'quit') { const n = WORK[s.job]?.name ?? '하던'; L(g).job = null; return `${n} 일을 그만두었다. 손에 익은 일을 내려놓는 날, 오래 쓰던 연장을 한참 쓰다듬었다.`; }
    stress(g, 3);
    return '버티기로 했다. 품삯은 줄고 일은 그대로다. 그래도 누군가는 이 일을 해야 한다고 스스로에게 말했다.';
  },
});

/* ---------- 달이 넘어갈 때: 내 살림 ---------- */
function cityMonth(g, rng) {
  const c = CS(g), pl = here(g);
  if (!factoryAge(g) && !Object.keys(FADING).some((j) => fadeOf(g, j))) return;
  // 옛 일: 일감을 줄이는 발명이 하나 더 나올 때마다 한 번 묻는다
  const job = L(g).job?.id;
  if (job && FADING[job]) {
    const n = fadeOf(g, job);
    if (n > (c.me.faded[job] ?? 0)) { c.me.faded[job] = n; if (!sceneQueued(g, 'city_fade')) queueScene(g, 'city_fade', { job }); }
  }
  if (!factoryAge(g)) return;
  // 오른 셋방 세
  if (L(g).home === 'rent' && MILL_TOWNS.includes(pl)) {
    if (c.me.rentUp) pay(g, c.me.rentUp);
    if (town(g, pl).crowd >= 50 && rng.chance(0.06) && !sceneQueued(g, 'city_landlord')) queueScene(g, 'city_landlord', {});
  } else c.me.rentUp = 0;
  // 공장에 보낸 아이들: 다달이 은화, 몸은 조금씩 상한다. 열넷이 넘으면 제 품삯을 받는다.
  c.me.kids = c.me.kids.filter((id) => { const k = g.people.find((p) => p.id === id); if (!k || !k.alive || kidAge(k) > 14) return false; g.player.familyMoney += 2; k.health = Math.max(20, (k.health ?? 80) - 0.6); return true; });
  // 가난한 집 아이가 크면 감독이 찾아온다
  if (atMill(g) && (g.player.money + (g.player.familyMoney ?? 0)) < 80 && rng.chance(0.05) && !sceneQueued(g, 'city_sendkid')) {
    const k = myKids(g).find((p) => kidAge(p) >= 8 && kidAge(p) <= 13 && !c.me.kids.includes(p.id));
    if (k) queueScene(g, 'city_sendkid', { kid: k.id });
  }
  // 파업이 내가 사는 곳에서 일어나면
  const t = c.towns[pl];
  if (atMill(g) && t?.strike && t.strike.asked !== true && (L(g).job?.id === 'factory_hand' || L(g).home === 'rent')) { t.strike.asked = true; if (!sceneQueued(g, 'city_strike')) queueScene(g, 'city_strike', {}); }
  if (!t?.strike) c.me.scabNow = false;
}

/* ---------- 플레이어 없이도 붐비는 도시와 파업 ---------- */
export function cityWorld(g, rng) {
  if (!factoryAge(g)) return;
  const c = CS(g);
  for (const pl of MILL_TOWNS) {
    const t = town(g, pl);
    // 시골에서 사람이 몰려든다 (수도가 들어오면 더 붐벼도 견딘다)
    t.crowd = clamp(t.crowd + (rng.chance(0.5) ? 1 : 0) - (t.crowd > 85 ? 1 : 0), 0, 100);
    // 붐비고 품삯이 낮으면 불만이 쌓인다
    t.unrest = clamp(t.unrest + (t.crowd >= 55 ? 1 : 0) + (t.wage < 1.25 ? 0.6 : -0.5) - (invented(g, LATE.waterworks) ? 0.3 : 0), 0, 100);
    if (!t.strike && t.unrest >= 70 && mi(g) - (t.last ?? 0) >= 24 && rng.chance(0.12)) {
      t.strike = { since: mi(g), stage: 0, backers: 0 };
      logCity(g, `${placeName(pl)} 공장 거리에서 파업이 일어났다.`);
      chron(g, `${placeName(pl)} 공장 직공들이 일손을 놓다.`, 20);
    } else if (t.strike) {
      t.strike.stage += 1;
      if (t.strike.stage >= 3) {
        const win = rng.chance(0.4 + (t.strike.backers ?? 0) * 0.08);
        const led = t.strike.ledBy === g.player.name;
        if (win) {
          t.wage = Math.round(t.wage * 1.12 * 100) / 100; t.unrest = 25;
          logCity(g, `${placeName(pl)} 파업 끝에 품삯이 올랐다.`);
          chron(g, `${placeName(pl)} 파업이 끝나다. 공장주들이 품삯을 올리고 열 살 아래 아이를 베틀에서 빼기로 하다.`, 25);
          if (led) { L(g).renown = (L(g).renown ?? 0) + 3; note(g, `내가 앞장선 ${placeName(pl)} 파업이 이겼다.`); }
        } else {
          t.unrest = 35;
          logCity(g, `${placeName(pl)} 파업이 경비대에 흩어졌다.`);
          chron(g, `${placeName(pl)} 파업이 경비대에 흩어지다. 앞장선 사람들은 공장 명부에서 지워지다.`, 25);
          if (led) { c.me.black[pl] = mi(g) + 24; note(g, `내가 앞장선 ${placeName(pl)} 파업이 깨졌다. 이 거리 공장 명부에서 이름이 지워졌다.`); }
        }
        t.last = mi(g); t.strike = null;
      }
    }
  }
  // 시골은 빈다: 젊은이들이 도시로 떠나고, 옛 일 하던 사람들이 공장으로 간다
  if (g.date.month === 3) {
    c.left += 1;
    let moved = 0;
    for (const p of g.people) {
      if (moved >= 2) break;
      if (!p.alive || p.away || !VILLAGES.includes(p.place ?? 'ern') || !['weaver', 'miller', 'laborer'].includes(p.job) || p.isPlayer) continue;
      const a = Math.floor((p.ageMonths ?? 0) / 12);
      if (a < 16 || a > 40 || !rng.chance(0.12)) continue;
      const to = rng.pick(MILL_TOWNS);
      const was = p.job;
      p.place = to; p.job = 'laborer';
      p.history?.push({ y: g.date.year, m: g.date.month, text: was === 'laborer' ? `일거리를 찾아 ${placeName(to)} 공장 거리로 떠났다.` : `${was === 'weaver' ? '베틀' : '방앗간'}을 접고 ${placeName(to)} 공장 거리로 떠났다.` });
      moved++;
    }
  }
}

HOOKS.afterMonth.push((g) => {
  if (g.over) return;
  const rng = ownRng(g, 34);
  cityWorld(g, rng);
  cityMonth(g, rng);
});
HOOKS.heir.push((g) => { const c = CS(g); c.me.kids = []; c.me.scabNow = false; c.me.rentUp = 0; c.me.faded = {}; });
HOOKS.newGame.push((g) => { g.city = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.city) { g.city = d; return; }
  for (const k of Object.keys(d)) if (g.city[k] === undefined) g.city[k] = d[k];
  for (const k of Object.keys(d.me)) if (g.city.me[k] === undefined) g.city.me[k] = d.me[k];
});

/* ---------- 화면 ---------- */
export function cityInfo(g) {
  const c = CS(g);
  return {
    factory: factoryAge(g),
    towns: factoryAge(g) ? MILL_TOWNS.map((pl) => { const t = town(g, pl); return { name: placeName(pl), crowd: crowdWord(t.crowd), wage: Math.round(t.wage * 100), strike: !!t.strike }; }) : [],
    struck: c.me.struck, scab: c.me.scab, led: c.me.led,
    kidsAtMill: c.me.kids.map((id) => g.people.find((p) => p.id === id)?.name).filter(Boolean),
    blacklisted: Object.entries(c.me.black).filter(([, v]) => v > mi(g)).map(([pl]) => placeName(pl)),
    fading: Object.keys(FADING).filter((j) => fadeOf(g, j)).map((j) => WORK[j]?.name ?? j),
    newJobs: lateJobIds.filter((id) => WORK[id]?.places.length).map((id) => WORK[id].name),
    log: c.log.slice(-8),
  };
}
const SMOKE = [
  '새벽 호루라기가 울리자 공장 거리 골목마다 사람들이 쏟아져 나온다.',
  '굴뚝 연기가 낮게 깔려 빨래가 회색으로 마른다.',
  '셋방 창마다 시골에서 올라온 식구들이 다닥다닥 붙어 산다.',
  '해가 지면 공장 거리 선술집에 기침 소리와 노랫소리가 섞인다.',
];
const EMPTY = [
  '마을에 빈집이 늘었다. 젊은 사람들은 공장 거리로 떠났다.',
  '장날인데도 장터가 한산하다. 도시로 간 아들이 보낸 돈으로 사는 집이 많다.',
];
/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function cityLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const pl = here(g), t = mi(g), c = CS(g);
  const job = L(g).job?.id;
  if (job && FADING[job] && fadeOf(g, job) && t % 3 === 0) return { coachman: '마부 대기소에 말이 한 마리밖에 없다.', clerk: '서기실 빈 책상에 먼지가 앉았다.', sailor: '부두에 묶인 돛배들 사이로 증기선 굴뚝이 솟아 있다.' }[job];
  if (!factoryAge(g)) return null;
  if (MILL_TOWNS.includes(pl)) {
    const tw = town(g, pl);
    if (tw.strike) return '공장 문 앞에 팔짱 낀 직공들이 줄지어 서 있다. 기계 소리가 멎은 거리가 낯설게 조용하다.';
    if (c.me.kids.length && t % 3 === 1) return `새벽 호루라기에 ${g.people.find((p) => p.id === c.me.kids[0])?.name ?? '아이'}의 작은 발소리가 계단을 내려간다.`;
    if (t % 2 === 0) return SMOKE[t % SMOKE.length];
    return null;
  }
  if (VILLAGES.includes(pl) && c.left >= 2 && t % 4 === 1) return EMPTY[t % EMPTY.length];
  return null;
}
export { CS as cityState };
