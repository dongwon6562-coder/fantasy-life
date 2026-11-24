// 피난과 이주 속의 삶: 내 고장에서 행렬이 떠날 때 따라가기, 길 위의 행렬, 닫힌 성문과 난민촌 살이(품팔이·문지기 뇌물·난민촌 일 맡기·돌아가기),
// 난민촌 돕기(나눔·싼 일꾼·성문을 열자/막자), 이주민 거리의 텃세, 고향 생각. 장면과 사건 앞머리는 mg_.
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { gainSkill } from '../game.js';
import { EVENTS, age, here, onRoad, money, spend, stress } from '../events/core.js';
import { L, defineScene, queueScene, sceneQueued, note, chron } from '../adventure/core.js';
import { travelMonths } from '../places.js';
import { J } from '../narrative/text.js';
import { deed } from '../repute/index.js';
import { MS, WHY, campAt, quartersAt, placeName, quarterName, mlog, mgRng, clamp, mi } from './state.js';
import { gateOpen, pickRefuge } from './world.js';

const M = (g) => MS(g).me;
const busy = (g) => g.over || g.bondage?.slave || g.crime?.jailed || g.army?.campaign || g.army?.captive || !!L(g).heirPending;
const grown = (g) => age(g) >= 16 && !busy(g);
const settled = (g) => grown(g) && !onRoad(g);
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const flowFromHere = (g) => { const S = MS(g), pl = here(g); return mi(g) - (S.lastFlow[pl] ?? -99) <= 1 ? S.flows.filter((f) => f.from === pl).slice(-1)[0] ?? null : null; };
const inCamp = (g) => { const r = M(g).refugee; return !!r?.camp && !onRoad(g) && !!campAt(g, here(g)); };
const goTo = (g, to) => { const t = Math.max(1, travelMonths(here(g), to)); L(g).travel = { to, left: t, from: here(g) }; return t; };

// 매달: 피난길 끝에 닿으면 성 안에 자리를 잡거나 성 밖 난민촌에 든다
HOOKS.afterMonth.push((g) => {
  if (!g.migrate || g.over || !g.life) return;
  const me = M(g), r = me.refugee;
  if (!r || onRoad(g)) return;
  const pl = here(g);
  if (r.camp) { if (!campAt(g, pl)) { me.refugee = null; me.settledFrom = r.from; me.settledAt = mi(g); note(g, `난민촌이 흩어지며 ${placeName(pl)} 성 안에 자리를 얻었다.`); } return; }
  if (pl !== r.to) { me.refugee = null; return; }
  if (campAt(g, pl) || !gateOpen(g, pl)) {
    r.camp = true;
    if (L(g).home !== 'own') L(g).home = 'street';
    (MS(g).camps[pl] ??= { from: r.from, why: r.why, size: 30, since: mi(g) });
    note(g, `${placeName(pl)} 성문은 닫혀 있었다. 성 밖 난민촌에 천막을 쳤다.`);
  } else {
    me.refugee = null; me.settledFrom = r.from; me.settledAt = mi(g);
    note(g, `피난길 끝에 ${placeName(pl)}의 ${placeName(r.from)} 사람들 틈에 자리를 얻었다.`);
  }
});
// 대를 이으면: 이주민의 자식은 그 고장 사람으로 자란다
HOOKS.heir.push((g) => {
  if (!g.migrate) return;
  const me = M(g);
  if (me.settledFrom && !me.refugee) { note(g, `부모는 ${placeName(me.settledFrom)}에서 왔지만, 나는 여기서 났다.`); me.settledFrom = null; }
});

/* ---------- 난민촌 살이 ---------- */
ACTIONS.push({
  id: 'mg_camp',
  name: '난민촌 살이',
  icon: 'tent',
  desc: '성문 밖 난민촌에서 하루하루를 버틴다. 품을 팔고, 성 안에 들어갈 길을 찾고, 고향이 잠잠해지면 돌아간다.',
  available: (g) => grown(g) && inCamp(g) && !sceneQueued(g, 'mg_camp'),
  run(g) { queueScene(g, 'mg_camp'); return '천막 밖으로 나섰다.'; },
});
defineScene('mg_camp', {
  need: (g) => inCamp(g),
  title: () => '성문 밖',
  text: (g) => {
    const c = campAt(g, here(g)), r = M(g).refugee, homeCalm = (MS(g).push[r.from] ?? 0) < 12;
    return `개울가를 따라 천막 ${Math.max(5, Math.round(c.size / 6))}채가 늘어서 있다. 아침마다 성문 앞에 품을 팔려는 줄이 선다. 문지기들은 손바닥을 비비며 줄을 훑어본다. ${homeCalm ? `${placeName(r.from)} 쪽이 잠잠해졌다는 말이 돈다.` : `${placeName(r.from)}에서 오는 소식은 아직 어둡다.`}`;
  },
  choices: (g) => {
    const r = M(g).refugee, out = [{ label: '성문 앞에서 품을 판다', key: 'work' }];
    if (money(g) >= 15) out.push({ label: '문지기에게 은화 15닢을 쥐여 준다', key: 'bribe' });
    out.push({ label: '난민촌 일을 맡아 나선다', key: 'organize' });
    if ((MS(g).push[r.from] ?? 0) < 12) out.push({ label: `${J(placeName(r.from), '으로/로')} 돌아간다`, key: 'home' });
    out.push({ label: '다른 고장으로 떠난다', key: 'away' });
    return out;
  },
  resolve(g, rng, s, key) {
    const me = M(g), r = me.refugee, pl = here(g);
    if (!r) return '이제 난민촌 사람이 아니다.';
    if (key === 'work') {
      const pay = rng.int(2, 5); g.player.money += pay; g.player.fatigue = (g.player.fatigue ?? 0) + 12; me.worked += 1;
      return rng.pick([`성 안 채석장에서 하루 종일 돌을 날랐다. 성 사람 품삯의 반인 은화 ${pay}닢.`, `거름 수레를 밀었다. 감독이 '피난민 몫'이라며 은화 ${pay}닢을 던져 주었다.`, `부두에서 짐을 졌다. 은화 ${pay}닢. 옆 사람이 '너희 때문에 품삯이 떨어졌다'고 투덜거렸다.`]);
    }
    if (key === 'bribe') {
      spend(g, 15); me.bribed += 1; me.refugee = null; me.settledFrom = r.from; me.settledAt = mi(g);
      deed(g, 'honest', -1, '문지기에게 뇌물을 쥐여 주고 성 안에 들었다');
      return `문지기가 은화를 이로 깨물어 보더니 쪽문을 열어 주었다. "못 본 걸로 하지." ${placeName(pl)} 성 안 ${placeName(r.from)} 사람들 거리에 방 한 칸을 얻었다.`;
    }
    if (key === 'organize') {
      me.organized += 1; renown(g, 2); deed(g, 'kind', 2, '난민촌에서 우물 당번과 땔감 나누기를 맡았다'); gainSkill(g, 'trade', 0.3);
      const c = campAt(g, pl); if (c && rng.chance(0.3)) MS(g).open[pl] = mi(g) + 6;
      return `우물 당번을 짜고, 땔감을 나누고, 앓는 사람 천막을 따로 쳤다. 저녁에 사람들이 내 천막 앞에 모여 다음 일을 물었다.${MS(g).open[pl] >= mi(g) ? ' 성 안에서 사람이 나와 내 이야기를 듣고 갔다. 성문을 조금 열어 준다고 한다.' : ''}`;
    }
    if (key === 'home') {
      const t = goTo(g, r.from); me.refugee = null; me.wentHome += 1;
      mlog(g, `난민촌을 떠나 ${J(placeName(r.from), '으로/로')} 돌아갔다.`);
      return `천막을 걷어 수레에 실었다. ${placeName(r.from)}까지 ${t}달 길. 무엇이 남아 있을지는 가 봐야 안다.`;
    }
    const to = pickRefuge(g, pl, rng);
    if (!to) return '갈 만한 곳이 없었다. 천막으로 돌아왔다.';
    const t = goTo(g, to); r.to = to; r.camp = false;
    return `${placeName(to)}에선 받아 준다는 말을 듣고 다시 짐을 꾸렸다. ${t}달 길이다.`;
  },
});

/* ---------- 난민촌 돕기 (성 안 사람으로서) ---------- */
ACTIONS.push({
  id: 'mg_help',
  name: '성 밖 난민촌',
  icon: 'tent',
  desc: '성문 밖 난민촌을 찾아간다. 먹을 것을 나누거나, 싼 일꾼을 들이거나, 성문을 열자고, 혹은 막자고 말한다.',
  available: (g) => settled(g) && !M(g).refugee && !!campAt(g, here(g)) && !sceneQueued(g, 'mg_help'),
  run(g) { queueScene(g, 'mg_help'); return '성문 밖으로 나갔다.'; },
});
defineScene('mg_help', {
  need: (g) => !!campAt(g, here(g)) && !onRoad(g),
  title: () => '성 밖 난민촌',
  text: (g) => { const c = campAt(g, here(g)); return `${placeName(c.from)}에서 ${J(WHY[c.why]?.name ?? '난리', '을/를')} 피해 온 사람 ${c.size}명 남짓. 젖은 천막, 연기, 기침 소리. 아이 하나가 내 소매를 잡고 손바닥을 내민다. 성 안에서는 이들을 들이자는 사람과 막자는 사람이 갈려 있다.`; },
  choices: (g) => {
    const out = [];
    if (money(g) >= 20) out.push({ label: '빵과 담요를 사서 나눈다 (은화 20닢)', key: 'give' });
    out.push({ label: '싼 품삯으로 일꾼을 데려다 쓴다', key: 'hire' });
    if ((L(g).renown ?? 0) >= 15) { out.push({ label: '영주관에 가서 성문을 열자고 말한다', key: 'open' }); out.push({ label: '영주관에 가서 성문을 굳게 닫자고 말한다', key: 'close' }); }
    out.push({ label: '그냥 돌아간다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const me = M(g), S = MS(g), pl = here(g), c = campAt(g, pl);
    if (key === 'none') return '아이의 손을 뿌리치고 성 안으로 돌아왔다. 그 손이 한동안 생각났다.';
    if (key === 'give') { spend(g, 20); me.gave += 1; deed(g, 'kind', 3, '성 밖 난민촌에 빵과 담요를 나눠 주었다'); deed(g, 'generous', 2, '성 밖 난민촌에 빵과 담요를 나눠 주었다'); return '수레 하나 가득 빵과 담요를 싣고 나갔다. 줄은 금세 엉켰고 누가 넘어졌다. 다 나누고 나니 빈 수레를 끄는 손이 떨렸다. 모자랐다. 그래도 오늘 밤 몇 집은 덜 춥다.'; }
    if (key === 'hire') { const n = rng.int(4, 9); g.player.money += n; me.hired += 1; deed(g, 'kind', -2, '피난민을 반값에 부려 먹었다'); return `품삯을 반만 쳐 준다고 하자 사내 열이 앞다투어 손을 들었다. 하루 일을 시키고 은화 ${n}닢쯤 남았다. 돌아오는 길에 그들 중 하나가 침을 뱉었다.`; }
    if (key === 'open') {
      me.spoke += 1; S.open[pl] = mi(g) + 12; deed(g, 'kind', 3, '난민들에게 성문을 열자고 영주관에 말했다');
      for (const q of quartersAt(g, pl)) q.tension = clamp(q.tension + 6, 0, 100);
      return `영주관 서기 앞에서 한참 말했다. 겨울, 아이들, 성 밖 병. ${c ? `열두 달 동안 성문 옆 빈터에 판잣집을 짓게 해 준다고 한다.` : ''} 장터에선 '저 사람이 거지들을 불러들였다'는 말이 돌았다.`;
    }
    me.spoke += 1; S.open[pl] = -(mi(g) + 12); deed(g, 'kind', -3, '난민들에게 성문을 닫자고 영주관에 말했다');
    return '성 안 곡식은 성 안 사람 몫이라고 말했다. 서기가 고개를 끄덕였다. 그날 저녁 성문에 빗장이 하나 더 걸렸다. 성벽 위에서 보니 천막 사이로 모닥불이 흔들렸다.';
  },
});

/* ---------- 사건 ---------- */
const hotQuarter = (g) => quartersAt(g, here(g)).filter((q) => q.tension >= 30).sort((a, b) => b.tension - a.tension)[0] ?? null;
EVENTS.push(
  {
    id: 'mg_flee', cooldown: 12,
    cond: (g) => settled(g) && !M(g).refugee && !!flowFromHere(g) && (MS(g).push[here(g)] ?? 0) >= 25,
    chance: () => 1, weight: 85,
    prepare: (g) => { const f = flowFromHere(g); return { to: f.to, why: f.why, size: f.size, left: f.left }; },
    title: '떠나는 행렬',
    text: (g, c) => `새벽부터 수레 굴러가는 소리가 그치지 않는다. ${placeName(here(g))} 사람 ${c.size}명이 ${WHY[c.why].flee} ${placeName(c.to)} 쪽으로 떠난다. 이웃집 노인은 문을 잠그고 열쇠를 목에 걸었다. 돌아올 생각인 것이다. 우리 집 앞에서 누가 묻는다. "같이 가겠나?"`,
    choices: [
      { label: '짐을 꾸려 행렬을 따라간다', run: (g, rng, c) => { const me = M(g), from = here(g); const lost = Math.round(money(g) * 0.1); spend(g, lost); const t = goTo(g, c.to); me.refugee = { from, why: c.why, since: mi(g), to: c.to, camp: false }; chron(g, `${g.player.name}, ${J(WHY[c.why].name, '을/를')} 피해 ${J(placeName(from), '을/를')} 떠나다.`, 40); return `들고 갈 수 있는 것만 챙겼다. 나머지는 문 안에 두고 문을 잠갔다.${lost ? ` 길잡이 삯과 수레 몫으로 은화 ${lost}닢이 나갔다.` : ''} ${placeName(c.to)}까지 ${t}달 길이다.`; } },
      { label: '남는다', run: (g) => { stress(g, 6); deed(g, 'brave', 1, '모두 떠날 때 고장에 남았다'); return '행렬이 고개 너머로 사라질 때까지 지켜보았다. 장터가 반쯤 비었다. 남은 사람들끼리 서로의 얼굴을 오래 보았다.'; } },
    ],
  },
  {
    id: 'mg_column', road: true, cooldown: 6,
    cond: (g) => grown(g) && onRoad(g) && !!M(g).refugee && !M(g).refugee.camp,
    chance: () => 0.5, weight: 50,
    title: '피난 행렬',
    text: (g) => `행렬은 하루에 반나절밖에 못 간다. 앞에선 수레바퀴가 빠지고, 뒤에선 노인들이 처진다. ${g.date.month === 12 || g.date.month <= 2 ? '눈발이 굵어진다. ' : ''}밤이 되면 길가에 불을 피우고 모여 앉는다. 누군가 빵이 떨어졌다고 하고, 누군가 숲에서 사람 그림자를 보았다고 한다.`,
    choices: [
      { label: '내 빵을 나눈다', run: (g) => { spend(g, 3); deed(g, 'kind', 2, '피난길에 빵을 나눴다'); return '자루에 남은 빵을 꺼내 쪼갰다. 아이들 손에 먼저 쥐여 주었다. 내 몫은 손가락 두 마디만큼 남았다.'; } },
      { label: '밤새 행렬을 지킨다', run: (g, rng) => { gainSkill(g, 'sword', 0.4); g.player.fatigue = (g.player.fatigue ?? 0) + 10; return rng.chance(0.5) ? '횃불을 들고 행렬 끝을 지켰다. 새벽녘 숲에서 그림자 몇이 다가오다 불빛을 보고 물러났다.' : '밤새 아무 일도 없었다. 동이 틀 때 옆에서 자던 노인이 "고맙네" 하고 내 어깨를 두드렸다.'; } },
      { label: '앓는 아이를 업고 걷는다', run: (g) => { stress(g, 3); deed(g, 'kind', 2, '피난길에 앓는 아이를 업고 걸었다'); return '열이 끓는 아이를 업었다. 아이 어머니가 옆에서 쉬지 않고 고맙다고 했다. 등이 젖었다. 땀인지 다른 것인지 모르겠다.'; } },
    ],
  },
  {
    id: 'mg_quarrel', cooldown: 18,
    cond: (g) => settled(g) && !M(g).refugee && !!hotQuarter(g),
    chance: (g) => 0.06 + hotQuarter(g).tension / 500, weight: 40,
    prepare: (g) => { const q = hotQuarter(g); return { from: q.from, mine: M(g).settledFrom === q.from }; },
    title: '텃세',
    text: (g, c) => c.mine
      ? `장터에서 토박이 사내 셋이 내 수레를 막았다. "${placeName(c.from)} 것들 때문에 빵값이 오르고 품삯이 떨어졌어." 둘레 사람들이 구경만 한다. 내가 이 고장에 온 지 ${Math.max(1, Math.floor((mi(g) - M(g).settledAt) / 12))}년째다.`
      : `${placeName(c.from)} 사람들 거리 아이 하나가 빵집에서 빵을 훔쳤다고 장터가 시끄럽다. 빵집 주인은 그 거리 사람들을 모두 내쫓아야 한다고 소리치고, 아이 어미는 땅바닥에 엎드려 빈다.`,
    choices: [
      { label: (g, c) => (c.mine ? '고개를 숙이고 지나간다' : '빵값을 대신 내고 아이를 데려다준다'), run: (g, rng, c) => { const q = quartersAt(g, here(g)).find((x) => x.from === c.from); if (q) q.tension = clamp(q.tension - 6, 0, 100); if (c.mine) { stress(g, 5); return '수레를 돌려 다른 길로 갔다. 등 뒤로 웃음소리가 따라왔다. 집에 와서 한참 앉아 있었다.'; } spend(g, 2); deed(g, 'kind', 2, '이주민 아이의 빵값을 대신 냈다'); return '빵값을 내고 아이 손을 잡고 그 거리까지 데려다주었다. 골목 입구에서 노인들이 일어나 내게 고개를 숙였다.'; } },
      { label: (g, c) => (c.mine ? '맞선다' : '빵집 주인 편을 든다'), run: (g, rng, c) => { const q = quartersAt(g, here(g)).find((x) => x.from === c.from); if (q) q.tension = clamp(q.tension + 6, 0, 100); if (c.mine) { deed(g, 'brave', 2, '텃세 부리는 사내들에게 맞섰다'); if (rng.chance(0.5)) return '수레 채를 쥐고 한 발 나섰다. 사내들이 서로 눈치를 보더니 침을 뱉고 물러났다. 그날 저녁 우리 거리 사람들이 술을 들고 찾아왔다.'; g.player.injuries.push({ name: '장터 주먹다짐에 터진 입술', months: 1 }); return '주먹이 오갔다. 셋을 당할 수는 없었다. 경비가 와서 나만 끌고 갔다가 저녁에 풀어 주었다.'; } deed(g, 'kind', -2, '이주민 거리를 내쫓자는 편을 들었다'); return '빵집 주인 옆에 섰다. 다른 사람들도 하나둘 섰다. 그 거리 사람들은 그날 밤 문을 일찍 닫았다.'; } },
    ],
  },
  {
    id: 'mg_homesick', cooldown: 36,
    cond: (g) => settled(g) && !!M(g).settledFrom && !M(g).refugee && here(g) !== M(g).settledFrom && mi(g) - M(g).settledAt >= 36 && (MS(g).push[M(g).settledFrom] ?? 0) < 10,
    chance: () => 0.08, weight: 30,
    title: '고향 소식',
    text: (g) => `${placeName(M(g).settledFrom)}에서 온 행상이 말했다. 거기도 이제 잠잠하다고. 불탄 자리에 새 지붕이 올라가고, 장터도 다시 선다고. 떠난 사람들이 하나둘 돌아온다고. 그 말을 듣고 밤에 잠이 오지 않았다.`,
    choices: [
      { label: '고향으로 돌아간다', run: (g) => { const me = M(g), from = me.settledFrom, t = goTo(g, from); me.settledFrom = null; me.wentHome += 1; mlog(g, `${J(placeName(from), '으로/로')} 돌아갔다.`); return `살림을 정리했다. 이 고장 사람들 몇이 길모퉁이까지 따라 나왔다. ${placeName(from)}까지 ${t}달 길이다.`; } },
      { label: '이제 여기가 내 고장이다', run: (g) => { stress(g, -3); M(g).settledAt = mi(g); return '행상에게 고향 사람들 안부만 전해 달라고 했다. 창밖으로 이 고장 지붕들이 보였다. 언제부턴가 저 지붕들이 낯설지 않다.'; } },
    ],
  },
);
void mgRng;
