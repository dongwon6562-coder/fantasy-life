// 목동 일, 가축 장터, 떼 돌보기(꼴·풀·털·병·일꾼·명마), 명마 내놓기, 소 훔치기, 유목민 무리에 들기와 함께 떠돌기, 매달 셈.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge } from '../game.js';
import { leaveJob } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check, isAdult } from '../adventure/core.js';
import { reportCrime, crimeState } from '../crime.js';
import { deed } from '../repute/index.js';
import { activeAt } from '../nature/state.js';
import { J } from '../narrative/text.js';
import {
  HD, flock, withFlock, head, priceOf, flockValue, fodderNeed, herdSkill, hasDog, logHerd, newFlock, emptyCheck, bandWord,
  mi, clamp, here, placeName, free, stat, ownRng, pastureOf, travelMonths, STOCK, STOCK_IDS, SICK, SICK_IDS, BANDS, bandCamp, bandsHere, seasonOf, steedName, neighborName,
} from './core.js';

const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const grow = (g, base) => { const s = HD(g); const d = base * (1 - s.skill / 120) * (0.8 + stat(g, 'wil') / 200); s.skill = clamp(s.skill + d, 0, 100); return d; };
const canHerd = (g) => playerAge(g) >= 10 && free(g) && !g.army?.service && !g.troupe?.t;
const canOwn = (g) => isAdult(g) && free(g) && !g.army?.service && !g.troupe?.t && !g.poor?.bond;
const inBand = (g) => !!HD(g).band && HD(g).band.camp === here(g) && !L(g).travel;
const grassMonth = (m) => m >= 3 && m <= 11;

/* ---------- 목동 일 ---------- */
ACTIONS.push({
  id: 'herd_work',
  name: '남의 떼를 몬다',
  icon: 'farm',
  desc: '목장 주인이나 유목민 무리의 양과 소를 몰고 풀밭에 나간다. 품삯은 적지만 짐승 다루는 법이 몸에 붙는다.',
  available: (g) => canHerd(g) && (pastureOf(here(g)) > 0 || inBand(g)),
  run(g, rng) {
    const s = HD(g);
    s.worked += 1;
    const d = grow(g, 1.2);
    tired(g, 10);
    const band = inBand(g) ? BANDS[s.band.id] : null;
    const wage = Math.round(1 + s.skill / 25 + (band ? s.band.standing / 40 : 0));
    g.player.money += wage;
    if (band) s.band.standing = clamp(s.band.standing + 2, 0, 100);
    const line = band
      ? rng.pick([`${band.name}의 말 떼를 몰고 언덕 너머 물가까지 다녀왔다.`, '천막 아이들과 함께 새끼 양을 하나씩 세었다. 하나가 모자라 해 질 녘까지 찾았다.', '밤새 모닥불 곁에서 떼를 지켰다. 늑대 눈빛이 두 번 어둠 속에서 반짝였다.'])
      : rng.pick(['새벽에 양 떼를 몰고 나가 해 질 녘에 돌아왔다. 숫자가 맞았다.', '주인집 소가 늪에 빠져 반나절을 끌어냈다.', '비탈에서 풀을 뜯기며 피리를 불었다. 양들이 소리 쪽으로 모였다.', '새끼를 낳는 어미 양 곁에서 밤을 새웠다. 둘 다 살았다.']);
    return `${line} 품삯 은화 ${wage}닢.${d > 0.04 ? ` (목축 솜씨 +${d.toFixed(1)})` : ''}`;
  },
});

/* ---------- 가축 장터 ---------- */
const canMarket = (g) => canOwn(g) && pastureOf(here(g)) > 0 && (!flock(g) || withFlock(g));
ACTIONS.push({
  id: 'herd_market',
  name: '가축 장터에 간다',
  icon: 'coin',
  desc: '양·소·말을 사고판다. 값은 철과 흉년에 따라 오르내린다. 처음 사면 이 고장에 내 떼가 생긴다. 겨울 꼴도 여기서 산다.',
  available: canMarket,
  run(g) {
    if (!sceneQueued(g, 'herd_market')) queueScene(g, 'herd_market', {}, { first: true });
    return '가축 장터의 울타리 사이를 걸었다. 똥 냄새와 흥정 소리가 섞여 있다.';
  },
});
const LOT = { sheep: 5, cattle: 1, horses: 1 };
defineScene('herd_market', {
  need: (g) => canMarket(g),
  title: (g) => `${placeName(here(g))} 가축 장터`,
  text: (g) => {
    const f = flock(g);
    return `오늘 값: 양 은화 ${priceOf(g, 'sheep')}닢, 소 ${priceOf(g, 'cattle')}닢, 말 ${priceOf(g, 'horses')}닢. ${f ? `내 떼는 양 ${f.sheep}, 소 ${f.cattle}, 말 ${f.horses}. 쌓아 둔 꼴은 ${Math.round(f.fodder)}만큼, 겨울 한 달에 ${Math.round(fodderNeed(f) * 10) / 10}만큼 든다.` : '아직 내 떼가 없다.'}`;
  },
  choices: (g) => {
    const f = flock(g), m = g.player.money, out = [];
    for (const id of STOCK_IDS) { const cost = priceOf(g, id) * LOT[id]; if (m >= cost) out.push({ label: `${STOCK[id].name} ${J(`${LOT[id]}${STOCK[id].unit}`, '을/를')} 산다 (은화 ${cost}닢)`, key: `buy:${id}` }); }
    if (f) for (const id of STOCK_IDS) if (f[id] >= LOT[id]) out.push({ label: `${STOCK[id].name} ${J(`${LOT[id]}${STOCK[id].unit}`, '을/를')} 판다 (은화 ${priceOf(g, id) * LOT[id]}닢)`, key: `sell:${id}` });
    if (f && fodderNeed(f) > 0) { const c = Math.max(2, Math.round(fodderNeed(f) * 3 * 2)); if (m >= c) out.push({ label: `겨울 석 달 치 꼴을 산다 (은화 ${c}닢)`, key: 'fodder' }); }
    if (f && head(f)) out.push({ label: `떼를 통째로 판다 (은화 ${Math.round(flockValue(g) * 0.85)}닢)`, key: 'all' });
    return [...out.slice(0, 7), { label: '구경만 한다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const st = HD(g);
    if (key === 'no') return '흥정 소리만 듣다 돌아왔다.';
    if (flock(g) && !withFlock(g)) return '내 떼는 다른 고장에 있다.';
    const [op, id] = key.split(':');
    if (op === 'buy' && STOCK[id]) {
      const cost = priceOf(g, id) * LOT[id];
      if (g.player.money < cost) return '돈이 모자랐다.';
      g.player.money -= cost;
      const first = !st.flock;
      if (first) st.flock = newFlock(g);
      st.flock[id] += LOT[id];
      if (first) logHerd(g, `${placeName(here(g))}에 내 떼를 꾸렸다.`);
      return `${J(`${STOCK[id].name} ${LOT[id]}${STOCK[id].unit}`, '을/를')} 몰고 돌아왔다. ${STOCK[id].line}${first ? ' 울타리를 고치고 낙인을 새로 팠다. 이제 내 떼다.' : ''}`;
    }
    if (op === 'sell' && STOCK[id]) {
      const f = st.flock;
      if (!f || f[id] < LOT[id]) return '팔 짐승이 없다.';
      const got = priceOf(g, id) * LOT[id];
      f[id] -= LOT[id]; g.player.money += got; st.sold += LOT[id];
      emptyCheck(g);
      return `${J(`${STOCK[id].name} ${LOT[id]}${STOCK[id].unit}`, '을/를')} 은화 ${got}닢에 넘겼다. 사 간 사람이 고삐를 당기자 한 번 돌아보았다.`;
    }
    if (key === 'fodder') {
      const f = st.flock; if (!f) return '먹일 떼가 없다.';
      const c = Math.max(2, Math.round(fodderNeed(f) * 3 * 2));
      if (pay(g, c) < c) return '돈이 모자랐다.';
      f.fodder += fodderNeed(f) * 3;
      return `건초 수레가 마당에 꼴을 부려 놓았다. 은화 ${c}닢. 이제 겨울 석 달은 버틴다.`;
    }
    if (key === 'all') {
      const f = st.flock; if (!f) return '팔 떼가 없다.';
      const got = Math.round(flockValue(g) * 0.85);
      g.player.money += got; st.sold += head(f);
      st.past.unshift({ year: g.date.year, how: `떼를 은화 ${got}닢에 팔았다` }); if (st.past.length > 6) st.past.length = 6;
      st.flock = null;
      logHerd(g, `떼를 통째로 은화 ${got}닢에 팔았다.`);
      return `가축상 셋이 나눠 사 갔다. 은화 ${got}닢. 빈 울타리에 바람만 지나간다.`;
    }
    return '흥정이 엎어졌다.';
  },
});

/* ---------- 떼 돌보기 ---------- */
ACTIONS.push({
  id: 'herd_tend',
  name: '내 떼를 돌본다',
  icon: 'farm',
  desc: '꼴을 베어 쌓고, 먼 풀밭으로 몰고, 털을 깎고 젖을 짜고, 병든 짐승을 돌보고, 일꾼을 두고, 좋은 말의 혈통을 잇는다.',
  available: (g) => canOwn(g) && withFlock(g),
  run(g) {
    if (!sceneQueued(g, 'herd_tend')) queueScene(g, 'herd_tend', {}, { first: true });
    return '울타리 문을 열었다.';
  },
});
defineScene('herd_tend', {
  need: (g) => canOwn(g) && withFlock(g),
  title: () => '내 떼',
  text: (g) => {
    const f = flock(g), st = HD(g);
    return `양 ${f.sheep}, 소 ${f.cattle}, 말 ${f.horses}. 짐승들은 ${f.health >= 70 ? '살이 올라 윤기가 난다' : f.health >= 45 ? '그럭저럭이다' : '갈비뼈가 드러난다'}.${f.sick ? ` ${J(SICK[f.sick.kind].name, '이/가')} 돈다.` : ''} 꼴 ${Math.round(f.fodder)}, 일꾼 ${f.hands}명.${st.steeds.length ? ` 기르는 말: ${st.steeds.map((h) => h.name).join(', ')}.` : ''}`;
  },
  choices: (g) => {
    const f = flock(g), st = HD(g), m = g.date.month, out = [];
    if (m >= 6 && m <= 10) out.push({ label: '풀을 베어 겨울 꼴을 쌓는다', key: 'hay' });
    if (grassMonth(m)) out.push({ label: '먼 풀밭으로 몰고 나간다', key: 'graze' });
    if ((m >= 4 && m <= 8) && (f.sheep >= 3 || f.cattle >= 1)) out.push({ label: '털을 깎고 젖을 짜서 장에 낸다', key: 'wool' });
    if (f.sick) out.push({ label: `${SICK[f.sick.kind].name}에 걸린 짐승들을 돌본다`, key: 'treat' });
    if (f.hands < 4 && g.player.money >= 5) out.push({ label: '일꾼을 하나 둔다 (달마다 은화 3닢)', key: 'hire' });
    if (f.hands > 0) out.push({ label: '일꾼 하나를 내보낸다', key: 'fire' });
    if (f.horses >= 2 && herdSkill(g) >= 25 && st.steeds.length < 3) out.push({ label: '가장 좋은 말 둘로 혈통을 잇는다', key: 'breed' });
    if (st.steeds.some((h) => h.trained < 100)) out.push({ label: '어린 말을 길들인다', key: 'train' });
    return [...out.slice(0, 7), { label: '둘러보기만 한다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const st = HD(g), f = st.flock;
    if (!f || !withFlock(g)) return '떼는 이미 없다.';
    if (key === 'no') return '울타리를 한 바퀴 돌며 숫자를 셌다.';
    tired(g, 12);
    const d = grow(g, 0.8);
    const up = d > 0.04 ? ` (목축 솜씨 +${d.toFixed(1)})` : '';
    if (key === 'hay') { const add = fodderNeed(f) * (1 + herdSkill(g) / 60) * pastureOf(here(g)) + 1; f.fodder += add; return `낫으로 풀을 베어 볕에 말리고 볏가리를 쌓았다. 겨울 꼴이 늘었다.${up}`; }
    if (key === 'graze') {
      f.health = clamp(f.health + 8 * pastureOf(here(g)), 0, 100);
      if (rng.chance(hasDog(g) ? 0.08 : 0.18) && f.sheep > 0) { const n = Math.min(f.sheep, rng.int(1, 3)); f.sheep -= n; st.lost += n; emptyCheck(g); return `먼 풀밭에서 짐승들이 살이 올랐다. 다만 해 질 녘 늑대에게 양 ${n}마리를 잃었다.${up}`; }
      return `골짜기 너머 풀밭까지 몰고 나갔다. 짐승들이 고개를 박고 풀을 뜯었다.${hasDog(g) ? ' 개가 떼 둘레를 돌며 흩어지는 놈을 몰아왔다.' : ''}${up}`;
    }
    if (key === 'wool') { const got = Math.round(f.sheep * 0.6 * (st.prices.sheep ?? 1) + f.cattle * 1.5 * (st.prices.cattle ?? 1)); g.player.money += got; return `양털 뭉치와 치즈 덩이를 수레에 싣고 장에 냈다. 은화 ${got}닢.${up}`; }
    if (key === 'treat') {
      if (!f.sick) return '병은 이미 지나갔다.';
      const k = SICK[f.sick.kind];
      if (check(rng, herdSkill(g) + stat(g, 'sen') * 0.3 + (g.player.skills?.herbs ?? 0) * 0.3, 45)) { f.sick = null; f.health = clamp(f.health + 5, 0, 100); logHerd(g, `${J(k.name, '을/를')} 잡았다.`); return `병든 짐승을 따로 떼어 우리를 쳤다. 쑥을 태워 연기를 쐬고 발굽을 씻었다. 열흘 만에 ${J(k.name, '이/가')} 잦아들었다.${up}`; }
      f.sick.left = Math.max(1, f.sick.left - 1);
      return `밤낮으로 돌봤지만 ${J(k.name, '은/는')} 쉽게 물러가지 않는다.${up}`;
    }
    if (key === 'hire') { if (f.hands >= 4) return '일꾼은 넉넉하다.'; f.hands += 1; return '이웃 마을 셋째 아들이 지팡이 하나 들고 왔다. 달마다 은화 세 닢이면 된단다.'; }
    if (key === 'fire') { f.hands = Math.max(0, f.hands - 1); return '일꾼 하나에게 마지막 삯을 쥐여 보냈다.'; }
    if (key === 'breed') {
      if (f.horses < 2 || st.steeds.length >= 3) return '혈통을 이을 말이 없다.';
      const best = st.steeds.reduce((a, h) => Math.max(a, h.q), 0);
      const q = clamp(Math.round(30 + herdSkill(g) * 0.5 + rng.int(-10, 15) + best * 0.15), 10, 100);
      const h = { id: st.seq++, name: steedName(rng, new Set(st.steeds.map((x) => x.name))), q, born: mi(g), trained: 0, fame: 0 };
      st.steeds.push(h);
      logHerd(g, `망아지 ${J(h.name, '이/가')} 태어났다.`);
      return `이듬해 봄, 암말이 망아지를 낳았다. 다리가 길고 눈이 밝다. ${J(h.name, '이/가')} 그 이름이다. ${q >= 70 ? '늙은 마부가 보더니 한참 말이 없었다. "이건 왕도 마구간에 가도 되겠소."' : q >= 45 ? '좋은 말이 될 것 같다.' : '평범한 망아지다. 그래도 내 손으로 받았다.'}${up}`;
    }
    if (key === 'train') {
      const h = st.steeds.find((x) => x.trained < 100);
      if (!h) return '길들일 말이 없다.';
      const young = mi(g) - h.born < 12;
      h.trained = clamp(h.trained + (young ? 6 : 14) + herdSkill(g) / 10, 0, 100);
      if (h.trained >= 100) logHerd(g, `${J(h.name, '이/가')} 다 길들었다.`);
      return young ? `${J(h.name, '이/가')} 아직 어리다. 고삐에 익숙해지게 끌고 걷기만 했다.${up}` : `${h.name}의 등에 처음 안장을 얹었다. ${h.trained >= 100 ? '이제 내 무릎만 대도 알아듣는다.' : '세 번 떨어지고 네 번째에 버텼다.'}${up}`;
    }
    return '하루가 갔다.';
  },
});

/* ---------- 명마 내놓기 ---------- */
const readySteed = (g) => HD(g).steeds.find((h) => h.trained >= 100 && mi(g) - h.born >= 36) ?? null;
ACTIONS.push({
  id: 'herd_steed',
  name: '기른 말을 내놓는다',
  icon: 'crown',
  desc: '다 자라 길든 말을 귀족에게 팔거나, 영주에게 바치거나, 장터 경주에 내보낸다.',
  available: (g) => canOwn(g) && withFlock(g) && !!readySteed(g),
  run(g) {
    if (!sceneQueued(g, 'herd_steed')) queueScene(g, 'herd_steed', {}, { first: true });
    return `${readySteed(g).name}의 갈기를 빗었다.`;
  },
});
defineScene('herd_steed', {
  need: (g) => canOwn(g) && withFlock(g) && !!readySteed(g),
  title: (g) => readySteed(g).name,
  text: (g) => { const h = readySteed(g); return `${J(h.name, '이/가')} 다 자랐다. ${h.q >= 70 ? '목이 길고 걸음이 물 흐르듯 한다. 지나가던 기사가 말을 세우고 쳐다볼 정도다.' : h.q >= 45 ? '튼튼하고 영리한 말이다.' : '튼튼하기는 하다.'}`; },
  choices: () => [{ label: '말을 찾는 귀족에게 판다', key: 'sell' }, { label: '고장 영주에게 바친다', key: 'gift' }, { label: '장터 경주에 내보낸다', key: 'race' }, { label: '내가 계속 기른다', key: 'keep' }],
  resolve(g, rng, s, key) {
    const st = HD(g), h = readySteed(g);
    if (!h) return '그 말은 이미 없다.';
    if (key === 'keep') { h.trained = 100; h.born = Math.min(h.born, mi(g) - 36); h.kept = true; return `${J(h.name, '은/는')} 내 마구간에 남는다. 아침마다 내 발소리를 듣고 운다.`; }
    if (key === 'race') {
      const ok = check(rng, h.q + herdSkill(g) * 0.3 + stat(g, 'agi') * 0.2, 60);
      if (ok) { h.fame += 1; g.player.money += 20 + h.q; L(g).renown = (L(g).renown ?? 0) + 1; logHerd(g, `${J(h.name, '이/가')} 장터 경주에서 이겼다.`); return `깃발이 내려가자 ${J(h.name, '이/가')} 튀어 나갔다. 두 바퀴째에 앞에는 아무도 없었다. 상금 은화 ${20 + h.q}닢, 그리고 말 장수들의 명함 한 줌.`; }
      return `${J(h.name, '이/가')} 셋째로 들어왔다. 진흙을 뒤집어쓴 채 숨을 몰아쉬었다. 다음엔 더 잘할 것이다.`;
    }
    st.steeds.splice(st.steeds.indexOf(h), 1);
    if (key === 'gift') { L(g).renown = (L(g).renown ?? 0) + 2; deed(g, 'generous', 4, `${placeName(here(g))} 영주에게 손수 기른 명마를 바쳤다더라.`); if (h.q >= 70) chron(g, `${g.player.name}, ${placeName(here(g))} 영주에게 명마 ${J(h.name, '을/를')} 바치다.`, 40); return `영주가 ${h.name}의 고삐를 잡고 한 바퀴 돌더니 크게 웃었다. "이 말의 아비를 기른 사람이 누구냐." 이 고장에서 내 이름이 한 칸 올라갔다.`; }
    const got = Math.round(h.q * 8 + h.fame * 40);
    g.player.money += got; st.sold += 1;
    logHerd(g, `${J(h.name, '을/를')} 은화 ${got}닢에 팔았다.`);
    return `왕도에서 온 마구간지기가 이빨과 발굽을 하나하나 보고 은화 ${got}닢을 세었다. ${J(h.name, '이/가')} 수레 뒤에 매여 떠나며 한 번 울었다.`;
  },
});

/* ---------- 소 훔치기 ---------- */
ACTIONS.push({
  id: 'herd_rustle',
  name: '남의 소를 훔친다',
  icon: 'mask',
  desc: '밤에 이웃 목장이나 유목민 무리의 떼에서 몇 마리를 몰아 온다. 낙인을 지져 바꾸면 내 것이 된다. 들키면 소도둑이다.',
  // 소도둑질은 뒷골목에 한 발 들인 사람에게만 보인다 (26단계 헤드: 목초지에 가면 누구에게나 떠 있었다)
  available: (g) => canOwn(g) && pastureOf(here(g)) > 0 && (!flock(g) || withFlock(g)) && ((g.crime?.crimes ?? 0) > 0 || (g.crime?.record?.length ?? 0) > 0 || !!g.crime?.gang || inBand(g)),
  run(g, rng) {
    const st = HD(g);
    tired(g, 14);
    const c = crimeState(g);
    const skill = (c.craft ?? 0) * 0.4 + herdSkill(g) * 0.4 + stat(g, 'agi') * 0.3;
    const band = bandsHere(g)[0] ?? null;
    if (check(rng, skill, band ? 55 : 45)) {
      if (!st.flock) st.flock = newFlock(g);
      const n = rng.int(1, 3);
      st.flock.cattle += n;
      if (band && st.band?.id === band) { st.band.standing = clamp(st.band.standing - 30, 0, 100); return `밤에 ${BANDS[band].name}의 떼에서 소 ${n}마리를 몰아 왔다. 같은 천막 밑에서 먹고 자는 사람들의 소다. 아직 아무도 모른다.`; }
      if (!st.neighbor) st.neighbor = { name: neighborName(rng), grudge: 0 };
      st.neighbor.grudge = clamp(st.neighbor.grudge + 10, 0, 100);
      return `달 없는 밤, ${band ? `${BANDS[band].name}의` : '이웃 목장의'} 소 ${n}마리를 몰아 왔다. 엉덩이의 낙인을 지져 내 것으로 바꿨다. 아침에 이웃이 울타리를 세며 고개를 갸웃했다.`;
    }
    reportCrime(g, 'burglary');
    if (band) { if (st.band?.id === band) st.band = null; deed(g, 'honest', -4, `${BANDS[band].name}의 소를 훔치다 붙잡혔다더라.`); g.player.injuries.push({ name: '유목민 채찍에 찢긴 등', months: 2 }); return `${BANDS[band].name}의 개들이 먼저 알았다. 말 탄 사람들이 횃불을 들고 쫓아와 채찍으로 나를 땅에 눕혔다.${st.band ? '' : ' 그 무리 근처에는 다시 가지 않는 게 좋겠다.'}`; }
    deed(g, 'honest', -3, '소를 훔치다 들켰다더라.');
    if (!st.neighbor) st.neighbor = { name: neighborName(rng), grudge: 0 };
    st.neighbor.grudge = clamp(st.neighbor.grudge + 30, 0, 100);
    return `울타리를 넘다 개가 짖었다. ${J(st.neighbor.name, '이/가')} 쇠스랑을 들고 나왔다. 빈손으로 달아났지만 얼굴을 보였다.`;
  },
});

/* ---------- 유목민 무리 ---------- */
const canJoinBand = (g) => canOwn(g) && !HD(g).band && bandsHere(g).length > 0;
ACTIONS.push({
  id: 'herd_band_join',
  name: '유목민 무리를 찾아간다',
  icon: 'travel',
  desc: '철 따라 이 고장에 천막을 친 유목민 무리를 찾아간다. 들면 그들과 함께 철마다 풀밭을 옮겨 다닌다. 내 떼도 따라간다.',
  available: canJoinBand,
  run(g) {
    if (!sceneQueued(g, 'herd_band')) queueScene(g, 'herd_band', { id: bandsHere(g)[0] }, { first: true });
    return '고장 밖 천막들 쪽으로 걸어갔다. 개들이 먼저 나왔다.';
  },
});
defineScene('herd_band', {
  need: (g, s) => canJoinBand(g) && bandsHere(g).includes(s.id),
  title: (g, s) => BANDS[s.id].name,
  text: (g, s) => { const b = BANDS[s.id]; return `${b.text} ${J(b.chief, '이/가')} 천막 앞에 앉아 나를 위아래로 훑었다. "말을 탈 줄 아나? 양을 셀 줄 아나? 겨울에 얼어 죽어도 원망 안 할 텐가?"`; },
  choices: (g) => [
    ...(herdSkill(g) >= 15 || (flock(g)?.horses ?? 0) >= 1 ? [{ label: '무리에 들겠다고 한다', key: 'join' }] : []),
    { label: '목동으로 쓸모를 보여 주겠다고 한다', key: 'prove' },
    { label: '마유주 한 잔만 얻어 마시고 돌아선다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    const st = HD(g), b = BANDS[s.id];
    if (key === 'no') return '시큼한 마유주를 한 잔 얻어 마셨다. 족장이 웃으며 등을 두드렸다.';
    if (st.band) return '이미 든 무리가 있다.';
    if (key === 'prove') { grow(g, 1); tired(g, 10); if (herdSkill(g) < 15) return '하루 종일 말 떼를 따라 뛰었다. 족장이 "다음 철에 다시 와 보게" 하고 천막으로 들어갔다.'; }
    st.band = { id: s.id, standing: herdSkill(g) >= 35 ? 25 : 10, since: mi(g), camp: here(g) };
    if (L(g).job) leaveJob(g, '유목민 무리를 따라가려고 하던 일을 그만두었다.');
    if (st.flock && !withFlock(g)) { st.past.unshift({ year: g.date.year, how: '무리를 따라가며 떼를 두고 왔다' }); st.flock = null; }
    if (st.flock) st.flock.place = here(g);
    logHerd(g, `${b.name}에 들었다.`);
    note(g, `유목민 ${b.name}에 들었다.`);
    return `${J(b.chief, '이/가')} 칼끝으로 손바닥을 긋고 피 한 방울을 마유주 사발에 떨어뜨렸다. 사발이 내 손에 왔다. 오늘부터 ${b.name}의 천막 하나가 내 것이다.`;
  },
});
ACTIONS.push({
  id: 'herd_band_life',
  name: '무리의 천막에서 지낸다',
  icon: 'travel',
  desc: '무리 사람들과 일을 나누고, 족장의 모닥불에 앉고, 원하면 무리를 떠난다.',
  available: (g) => canOwn(g) && inBand(g),
  run(g) {
    if (!sceneQueued(g, 'herd_band_life')) queueScene(g, 'herd_band_life', {}, { first: true });
    return '천막 문 가죽을 걷고 나왔다.';
  },
});
defineScene('herd_band_life', {
  need: (g) => canOwn(g) && inBand(g),
  title: (g) => BANDS[HD(g).band.id].name,
  text: (g) => { const b = HD(g).band; const B = BANDS[b.id]; const next = bandCamp(b.id, (g.date.month % 12) + 1); return `무리 사람들은 나를 ${J(bandWord(b.standing), '으로/로')} 대한다. ${next !== here(g) ? `다음 달이면 ${J(placeName(next), '으로/로')} 천막을 옮긴다.` : `이번 철은 ${placeName(here(g))}에 머문다.`} ${B.chief}의 모닥불에서 연기가 오른다.`; },
  choices: (g) => {
    const b = HD(g).band;
    return [
      { label: '젊은이들과 말 떼를 길들인다', key: 'break' },
      ...(b.standing >= 40 ? [{ label: '족장의 모닥불 회의에 앉는다', key: 'council' }] : []),
      { label: '무리를 떠난다', key: 'leave' },
      { label: '천막에서 쉰다', key: 'rest' },
    ];
  },
  resolve(g, rng, s, key) {
    const st = HD(g), b = st.band;
    if (!b) return '무리는 이미 떠났다.';
    const B = BANDS[b.id];
    if (key === 'rest') { tired(g, -10); stress(g, -4); return '천막 안에서 양털 담요를 덮고 누웠다. 바람이 가죽을 두드리는 소리가 자장가 같았다.'; }
    if (key === 'break') { tired(g, 14); grow(g, 1); b.standing = clamp(b.standing + 4, 0, 100); if (rng.chance(0.2)) { g.player.injuries.push({ name: '말에서 떨어져 삔 어깨', months: 1 }); return '야생마 등에서 세 번 떨어졌다. 마지막엔 어깨가 빠졌다. 그래도 젊은이들이 내 이름을 부르며 웃었다.'; } return '야생마의 갈기를 잡고 해 질 녘까지 버텼다. 젊은이들이 휘파람을 불었다.'; }
    if (key === 'council') { if (b.standing < 40) return '아직 그 자리에 앉을 처지가 아니다.'; b.standing = clamp(b.standing + 3, 0, 100); if (b.standing >= 70 && !b.elder) { b.elder = true; logHerd(g, `${B.name}의 어른 자리에 앉았다.`); return `${J(B.chief, '이/가')} 회의 끝에 말했다. "다음 철 풀밭은 이 사람 말을 듣고 정하자." 무리의 어른 자리가 하나 늘었다.`; } return '모닥불 둘레에서 다음 철 풀밭과 물길과 이웃 무리 이야기를 들었다. 내 말에도 몇이 고개를 끄덕였다.'; }
    st.band = null;
    logHerd(g, `${J(B.name, '을/를')} 떠났다.`);
    return `천막을 걷어 무리에 돌려주었다. ${J(B.chief, '이/가')} 말 한 필의 고삐를 내 손에 쥐여 주었다. "길에서 얼어 죽지 말게."`;
  },
});

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const st = HD(g), now = mi(g), rng = ownRng(g, 1), m = g.date.month;
  // 시세: 석 달에 한 번 오르내린다. 흉년이면 고기가 비싸고, 겨울 앞이면 다들 판다.
  if (now - st.priceAt >= 3) {
    st.priceAt = now;
    for (const id of STOCK_IDS) {
      let p = st.prices[id] + rng.int(-10, 10) / 100;
      if (g.world?.famine) p += 0.08;
      if (m >= 9 && m <= 11) p -= 0.05;
      st.prices[id] = clamp(p * 0.9 + 0.1, 0.5, 2);
    }
  }
  for (const h of st.steeds) if (h.trained >= 100 && !h.kept && mi(g) - h.born > 20 * 12) { st.steeds.splice(st.steeds.indexOf(h), 1); logHerd(g, `${J(h.name, '이/가')} 늙어 죽었다.`); break; }
  // 무리: 철이 바뀌면 천막을 옮긴다
  const b = st.band;
  if (b) {
    const camp = bandCamp(b.id, (m % 12) + 1) ?? b.camp;
    if (!L(g).travel && here(g) !== b.camp) { const B = BANDS[b.id]; st.band = null; logHerd(g, `${J(B.name, '과/와')} 길이 갈렸다.`); note(g, `${J(B.name, '과/와')} 길이 갈렸다. 무리는 떠났다.`); }
    else if (camp !== b.camp && here(g) === b.camp && free(g)) {
      const from = here(g);
      L(g).travel = { to: camp, left: Math.max(1, travelMonths(from, camp)), from };
      b.camp = camp;
      if (st.flock) st.flock.place = camp;
      note(g, `${J(BANDS[b.id].name, '이/가')} 천막을 걷었다. ${J(placeName(camp), '으로/로')} 떠난다.`);
    }
    if (st.band) st.band.standing = clamp(st.band.standing + 0.5, 0, 100);
  }
  // 떼
  const f = st.flock;
  if (f) {
    const away = here(g) !== f.place && !(st.band && f.place === st.band.camp);
    // 일꾼 삯
    if (f.hands) { const w = f.hands * 3; if (g.player.money >= w) g.player.money -= w; else { f.hands = Math.max(0, f.hands - 1); note(g, '삯이 밀려 목장 일꾼 하나가 떠났다.'); } }
    const pas = st.band ? 1 : pastureOf(f.place);
    // 봄에 새끼
    if (m >= 3 && m <= 5) for (const id of STOCK_IDS) if (f[id] >= 2) { const n = Math.floor(f[id] * STOCK[id].birth / 3 * (f.health / 80) * (1 + herdSkill(g) / 200) * pas + rng.next()); f[id] += n; st.born += n; }
    // 겨울 꼴
    if (m === 12 || m <= 2) {
      const need = fodderNeed(f) * (activeAt(g, f.place).some((d) => d.kind === 'winter') ? 2 : 1) * (st.band ? 0.5 : 1);
      if (f.fodder >= need) f.fodder -= need;
      else {
        const short = 1 - f.fodder / Math.max(0.1, need); f.fodder = 0;
        let lost = 0;
        for (const id of STOCK_IDS) { const n = Math.min(f[id], Math.round(f[id] * 0.2 * short + (f[id] && rng.chance(0.3 * short) ? 1 : 0))); f[id] -= n; lost += n; }
        f.health = clamp(f.health - 15 * short, 0, 100); st.lost += lost;
        if (lost) { note(g, `꼴이 떨어졌다. 겨울에 짐승 ${lost}마리가 굶어 죽었다.`); logHerd(g, `겨울에 짐승 ${lost}마리를 잃었다.`); }
      }
    }
    // 여름 가뭄
    if (activeAt(g, f.place).some((d) => d.kind === 'drought')) f.health = clamp(f.health - 6, 0, 100);
    // 비워 둔 떼: 일꾼이 없으면 축난다
    if (away && !f.hands) { f.health = clamp(f.health - 6, 0, 100); for (const id of STOCK_IDS) if (f[id] && rng.chance(0.25)) { f[id] -= 1; st.lost += 1; } }
    // 너무 많으면 풀이 모자란다
    const cap = 40 * pas + f.hands * 25;
    if (head(f) > cap && grassMonth(m)) f.health = clamp(f.health - 3, 0, 100);
    else f.health = clamp(f.health + (70 - f.health) * 0.1, 0, 100);
    // 병
    if (f.sick) {
      const k = SICK[f.sick.kind];
      let lost = 0;
      for (const id of k.hits) { const n = Math.min(f[id], Math.round(f[id] * k.kill)); f[id] -= n; lost += n; }
      st.lost += lost; f.sick.left -= 1;
      if (lost) note(g, `${J(k.name, '으로/로')} 짐승 ${lost}마리가 죽었다.`);
      if (f.sick.left <= 0) { f.sick = null; logHerd(g, `${J(k.name, '이/가')} 지나갔다.`); }
    } else if (head(f) >= 4 && rng.chance(0.012 + head(f) / 4000 + (f.health < 40 ? 0.02 : 0))) {
      const kinds = SICK_IDS.filter((id) => SICK[id].hits.some((x) => f[x] > 0));
      if (kinds.length) { f.sick = { kind: rng.pick(kinds), left: rng.int(2, 4) }; if (free(g) && withFlock(g) && !sceneQueued(g, 'herd_event')) queueScene(g, 'herd_event', { ev: 'sick' }); else note(g, `떼에 ${J(SICK[f.sick.kind].name, '이/가')} 돌기 시작했다.`); }
    }
    if (emptyCheck(g)) note(g, '떼가 다 없어졌다. 빈 울타리만 남았다.');
  }
  // 떼와 무리 안팎의 일
  if (!free(g) || now - st.eventAt < 3 || sceneQueued(g, 'herd_event') || !rng.chance(0.3)) return;
  const pool = [];
  const f2 = st.flock;
  if (f2 && withFlock(g)) {
    if (f2.sheep >= 3 && grassMonth(m)) pool.push('wolves');
    if (f2.cattle + f2.horses >= 2) pool.push('rustlers');
    if (!st.band) pool.push('neighbor');
    if (head(f2) >= 12) pool.push('dealer');
  }
  if (st.band && here(g) === st.band.camp && !L(g).travel) {
    pool.push('raid', 'race');
    if ((m === 12 || m <= 2)) pool.push('dzud');
  }
  if (!pool.length) return;
  st.eventAt = now;
  const ev = rng.pick(pool);
  if (ev === 'neighbor' && !st.neighbor) st.neighbor = { name: neighborName(rng), grudge: 10 };
  queueScene(g, 'herd_event', { ev });
});

// 대를 이으면: 떼와 말은 집안에 남는다. 무리 사람들은 자식도 천막에 받아 준다.
HOOKS.heir.push((g) => {
  const st = HD(g);
  if (st.flock) { st.flock.gens += 1; st.flock.place = here(g); if (!pastureOf(st.flock.place) && !st.band) st.flock.hands = Math.max(1, st.flock.hands); logHerd(g, `떼가 ${g.player.name}에게 넘어왔다.`); }
  st.skill = Math.round(st.skill * 0.3);
  if (st.band) { st.band.standing = Math.round(st.band.standing * 0.6); st.band.elder = false; st.band.camp = here(g); }
});
export { inBand, readySteed };
