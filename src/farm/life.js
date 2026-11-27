// 밭 사고팔기·빌리기·소작 주기, 씨 뿌리기와 돌려짓기, 밭일, 농가 살림(품꾼·소·씨앗·물길), 곳간과 장터,
// 매달 셈(품삯·땅심·거두기·소작 몫·곳간 축남), 대 잇기.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, isAdult } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { KINDS as NATURE } from '../nature/state.js';
import { J } from '../narrative/text.js';
import {
  FM, farm, atFarm, myFields, ownedFields, capacity, barnTotal, cropPrice, newField, newFarm, logFarm, emptyCheck, disasterHere,
  mi, clamp, here, placeName, free, farmSkill, ownRng, farmland, regionCrop, CROPS, CROP_IDS, SEEDS, MAX_FIELDS, HAND_WAGE,
  fieldPrice, leaseFee, landlordName, tenantName,
} from './core.js';
import { opener } from '../narrative/openers.js';

const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const learn = (g, b) => { const k = gainSkill(g, 'farming', b, 'str'); return k > 0.04 ? ` (농사 +${k.toFixed(1)})` : ''; };
const busy = (g) => !!g.army?.service || !!g.troupe?.t || !!g.poor?.bond;
const fallow = (f) => myFields(f).filter((x) => !x.crop);
const growing = (f) => myFields(f).filter((x) => !!x.crop);
const sowable = (m) => CROP_IDS.filter((id) => CROPS[id].sow.includes(m));
const fieldWord = (x) => (x.tenant ? `소작 준 밭(${x.tenant})` : x.leased ? `빌린 밭(${x.leased})` : x.crop ? `${CROPS[x.crop].name} 밭` : '빈 밭');
export const ripeAt = (x) => x.sown + CROPS[x.crop].grow;

/* ---------- 밭 사고팔기·빌리기·소작 주기 ---------- */
// 땅이 없으면 빌릴 돈이라도 있어야 장부를 펼 수 있다
const canLand = (g) => isAdult(g) && free(g) && !busy(g) && farmland(here(g)) && (farm(g) ? atFarm(g) : g.player.money >= leaseFee(here(g)));
ACTIONS.push({
  id: 'farm_land',
  name: '밭을 사고 빌린다',
  icon: 'coin',
  desc: '내 이름으로 된 밭을 사거나, 지주의 밭을 빌려 짓거나(거둔 것의 삼분의 일을 바친다), 내 밭을 소작 주거나 판다. 처음 밭을 가지면 이 고장에 내 농가가 생긴다.',
  available: canLand,
  run(g, rng) {
    if (!sceneQueued(g, 'farm_land')) queueScene(g, 'farm_land', {}, { first: true });
    return opener(g, 'farm_land', rng);
  },
});
defineScene('farm_land', {
  need: (g) => canLand(g),
  title: (g) => `${placeName(here(g))}의 땅`,
  text: (g) => {
    const f = farm(g), p = fieldPrice(here(g));
    const mine = f ? `${f.name}: ${f.fields.map(fieldWord).join(', ')}.` : '아직 내 이름으로 된 땅이 없다.';
    return `이 고장 밭 한 뙈기 값은 은화 ${p}닢이다. 빌려 지으려면 미리 은화 ${leaseFee(here(g))}닢을 내고 가을마다 삼분의 일을 바친다. ${mine}`;
  },
  choices: (g) => {
    const f = farm(g), p = fieldPrice(here(g)), out = [];
    const room = !f || f.fields.length < MAX_FIELDS;
    if (room && g.player.money >= p) out.push({ label: `밭 한 뙈기를 산다 (은화 ${p}닢)`, key: 'buy' });
    if (room && g.player.money >= leaseFee(here(g))) out.push({ label: `지주의 밭을 빌린다 (은화 ${leaseFee(here(g))}닢, 소출의 삼분의 일)`, key: 'lease' });
    if (f && ownedFields(f).some((x) => !x.tenant && !x.crop)) out.push({ label: '빈 밭 하나를 소작 준다 (거둔 것의 삼분의 일을 받는다)', key: 'tenant' });
    if (f && f.fields.some((x) => x.tenant)) out.push({ label: '소작 준 밭 하나를 거둬들인다', key: 'take' });
    if (f && f.fields.some((x) => x.leased && !x.crop)) out.push({ label: '빌린 밭 하나를 지주에게 돌려준다', key: 'return' });
    if (f && ownedFields(f).some((x) => !x.tenant && !x.crop)) out.push({ label: `빈 밭 하나를 판다 (은화 ${Math.round(p * 0.8)}닢)`, key: 'sell' });
    out.push({ label: '장부를 덮는다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const st = FM(g), p = fieldPrice(here(g));
    if (key === 'no') return '장부를 돌려주었다. 땅은 도망가지 않는다.';
    let f = farm(g);
    if (key === 'buy' || key === 'lease') {
      if (f && f.fields.length >= MAX_FIELDS) return '더 둘 밭이 없다. 이 고장 좋은 땅은 이미 다 임자가 있다.';
      const cost = key === 'buy' ? p : leaseFee(here(g));
      if (g.player.money < cost) return '돈이 모자랐다.';
      pay(g, cost);
      const first = !f;
      if (!f) { f = st.farm = newFarm(g, rng); note(g, `${placeName(here(g))}에 ${J(f.name, '이/가')} 생겼다.`); }
      const lord = key === 'lease' ? landlordName(rng) : null;
      f.fields.push(newField(g, { soil: key === 'lease' ? 55 : rng.int(55, 80), leased: lord }));
      logFarm(g, key === 'buy' ? `밭 한 뙈기를 샀다. 밭이 ${f.fields.length}뙈기가 되었다.` : `${lord}의 밭을 빌렸다.`);
      if (key === 'buy') deed(g, 'brave', 1, '내 땅을 샀다');
      return key === 'buy'
        ? `서기가 장부에 내 이름을 적고 모래를 뿌려 말렸다. ${first ? `오늘부터 이 땅은 ${J(f.name, '이/가')} 된다.` : `밭이 ${f.fields.length}뙈기가 되었다.`} 해 질 녘에 혼자 가서 흙을 한 줌 쥐어 보았다.`
        : `${J(lord, '이/가')} 손가락으로 밭 귀퉁이를 가리켰다. "저 돌담까지요. 가을에 삼분의 일, 잊지 마시오."${first ? ` 남의 땅이지만 ${f.name}의 시작이다.` : ''}`;
    }
    if (!f) return '내 땅이 없다.';
    if (key === 'tenant') {
      const x = ownedFields(f).find((y) => !y.tenant && !y.crop);
      if (!x) return '소작 줄 빈 밭이 없다.';
      x.tenant = tenantName(rng, f.fields.map((y) => y.tenant).filter(Boolean));
      logFarm(g, `밭 하나를 ${x.tenant}에게 소작 주었다.`);
      return `${J(x.tenant, '이/가')} 모자를 쥐고 고개를 숙였다. "가을마다 삼분의 일, 꼭 바치겠습니다." 그 손이 갈라져 있었다.`;
    }
    if (key === 'take') {
      const x = f.fields.find((y) => y.tenant);
      if (!x) return '소작 준 밭이 없다.';
      const n = x.tenant; x.tenant = null; x.crop = null;
      deed(g, 'kind', -1, '소작인에게서 밭을 거둬들였다');
      return `${n}에게 밭을 내놓으라고 했다. 그는 아무 말 없이 연장을 챙겨 떠났다. 그 집 아이들이 길가에서 이쪽을 오래 보았다.`;
    }
    if (key === 'return') {
      const x = f.fields.find((y) => y.leased && !y.crop);
      if (!x) return '돌려줄 밭이 없다.';
      f.fields = f.fields.filter((y) => y !== x);
      const gone = emptyCheck(g, '빌린 밭을 다 돌려주었다');
      return `${x.leased}의 밭을 돌려주었다.${gone ? ' 이제 이 고장에 내 밭은 없다.' : ''}`;
    }
    if (key === 'sell') {
      const x = ownedFields(f).find((y) => !y.tenant && !y.crop);
      if (!x) return '팔 빈 밭이 없다.';
      f.fields = f.fields.filter((y) => y !== x);
      g.player.money += Math.round(p * 0.8);
      const gone = emptyCheck(g, '밭을 다 팔았다');
      return `밭 한 뙈기를 은화 ${Math.round(p * 0.8)}닢에 넘겼다.${gone ? ` ${J(f.name, '은/는')} 이제 남의 땅이다.` : ''}`;
    }
    return '아무 일도 없었다.';
  },
});

/* ---------- 씨 뿌리기와 돌려짓기 ---------- */
const canSow = (g) => atFarm(g) && free(g) && fallow(farm(g)).length > 0 && sowable(g.date.month).length > 0;
ACTIONS.push({
  id: 'farm_sow',
  name: '내 밭에 씨를 뿌린다',
  icon: 'farm',
  desc: '빈 밭에 무엇을 심을지 정한다. 같은 작물을 거푸 심으면 땅이 지치고, 콩을 심거나 쉬게 두면 땅심이 돌아온다. 손이 모자라면 다 뿌리지 못한다.',
  available: canSow,
  run(g) {
    if (!sceneQueued(g, 'farm_sow')) queueScene(g, 'farm_sow', {}, { first: true });
    return '씨앗 자루를 지고 밭머리에 섰다.';
  },
});
// 돌려짓기: 지친 땅에는 콩, 아니면 지난번과 다른 것 중 값이 좋은 것
const rotatePick = (x, m) => {
  const ok = sowable(m);
  if (x.soil < 45 && ok.includes('beans')) return 'beans';
  return ok.filter((id) => id !== x.last).sort((a, b) => CROPS[b].price * CROPS[b].yield - CROPS[a].price * CROPS[a].yield)[0] ?? ok[0];
};
defineScene('farm_sow', {
  need: (g) => canSow(g),
  title: (g) => `${farm(g).name}의 파종`,
  text: (g) => {
    const f = farm(g), fl = fallow(f);
    const soil = fl.map((x) => `${Math.round(x.soil)}${x.last ? `(지난번 ${CROPS[x.last].name})` : ''}`).join(', ');
    return `빈 밭 ${fl.length}뙈기, 땅심은 ${soil}. 지금 손으로는 ${Math.min(fl.length, capacity(f))}뙈기까지 뿌릴 수 있다. 씨앗은 ${SEEDS[f.seed].name}${SEEDS[f.seed].cost ? `(밭마다 은화 ${SEEDS[f.seed].cost}닢)` : ''}.`;
  },
  choices: (g) => {
    const m = g.date.month;
    return [
      ...sowable(m).map((id) => ({ label: `빈 밭마다 ${J(CROPS[id].name, '을/를')} 뿌린다 (자루당 지금 은화 ${cropPrice(g, id)}닢)`, key: `crop:${id}` })),
      { label: '밭마다 돌려짓는다: 지친 밭엔 콩, 나머지는 지난번과 다르게', key: 'rotate' },
      { label: '올해는 쉬게 둔다', key: 'rest' },
    ].slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const f = farm(g), m = g.date.month;
    if (key === 'rest') return '빈 밭에 소똥을 펴 두고 돌아왔다. 땅도 쉬어야 한다.';
    const fl = fallow(f).slice(0, capacity(f));
    const pick = key === 'rotate' ? (x) => rotatePick(x, m) : (() => { const id = key.split(':')[1]; return () => id; })();
    let n = 0;
    const names = new Set();
    for (const x of fl) {
      const id = pick(x);
      if (!CROPS[id] || !CROPS[id].sow.includes(m)) continue;
      if (SEEDS[f.seed].cost && pay(g, SEEDS[f.seed].cost) < SEEDS[f.seed].cost) break;
      x.crop = id; x.sown = mi(g); x.care = 0; x.seed = f.seed; n++; names.add(CROPS[id].name);
    }
    tired(g, 14);
    if (!n) return '씨앗을 살 돈도, 뿌릴 손도 모자랐다. 밭은 그대로 비어 있다.';
    const left = fallow(f).length;
    const k = learn(g, 1.0 + n * 0.2);
    const list = [...names].reduce((a, b) => `${J(a, '과/와')} ${b}`);
    logFarm(g, `${J(list, '을/를')} ${n}뙈기에 뿌렸다.`);
    return `${J(list, '을/를')} ${n}뙈기에 뿌렸다. ${rng.pick(['고랑마다 발로 흙을 덮었다. 까마귀들이 울타리에 앉아 기다린다.', '소가 끄는 쟁기 뒤를 따라 씨를 흩었다. 해가 질 때 손바닥에 흙이 박혀 있었다.', '늙은 이웃이 지나가다 고랑을 보고 고개를 끄덕였다.'])}${left ? ` 손이 모자라 ${left}뙈기는 비워 두었다.` : ''}${k}`;
  },
});

/* ---------- 밭일 ---------- */
const canWork = (g) => atFarm(g) && free(g) && myFields(farm(g)).length > 0;
ACTIONS.push({
  id: 'farm_work',
  name: '내 밭을 돌본다',
  icon: 'farm',
  desc: '김을 매고 거름을 내고 돌을 골라낸다. 자라는 밭은 소출이 늘고, 빈 밭은 땅심이 돌아온다.',
  available: canWork,
  run(g, rng) {
    const st = FM(g), f = farm(g), gr = growing(f), cap = capacity(f);
    st.worked += 1;
    tired(g, 14);
    let line;
    if (gr.length) {
      for (const x of gr.slice(0, cap)) x.care = clamp(x.care + 1, 0, 6);
      line = rng.pick(['하루 종일 허리를 굽혀 김을 맸다. 잡초는 밀보다 빨리 자란다.', '밤새 내린 비에 고랑이 무너졌다. 다시 돋우었다.', '이삭이 패기 시작했다. 새 쫓는 아이를 하나 세웠다.', '거름을 지고 밭을 세 번 오갔다. 냄새가 옷에 배었다.']);
    } else {
      for (const x of fallow(f)) x.soil = clamp(x.soil + 2, 5, 100);
      line = rng.pick(['빈 밭에 거름을 펴고 돌을 골라냈다. 봄을 위한 일이다.', '얼어붙은 밭가에서 울타리를 고쳤다.', '겨울 밭에 재를 뿌렸다. 늙은이들 말로는 땅이 그걸 기억한다.']);
    }
    return `${line}${learn(g, 1.2)}`;
  },
});

/* ---------- 농가 살림 ---------- */
const canManage = (g) => atFarm(g) && free(g);
ACTIONS.push({
  id: 'farm_manage',
  name: '농가 살림을 챙긴다',
  icon: 'home',
  desc: '품꾼을 들이거나 내보내고, 소를 사고, 씨앗을 고르고, 물길을 판다.',
  available: canManage,
  run(g, rng) {
    if (!sceneQueued(g, 'farm_manage')) queueScene(g, 'farm_manage', {}, { first: true });
    return opener(g, 'farm_manage', rng);
  },
});
const OX = 50, DITCH = 25;
defineScene('farm_manage', {
  need: (g) => canManage(g),
  title: (g) => `${farm(g).name}의 살림`,
  text: (g) => {
    const f = farm(g);
    return `밭 ${f.fields.length}뙈기, 품꾼 ${f.hands}명(달마다 한 사람에 은화 ${HAND_WAGE}닢), 소 ${f.oxen}마리. 내 손까지 합쳐 ${capacity(f)}뙈기를 돌볼 수 있다. 씨앗은 ${SEEDS[f.seed].name}. 물길은 ${Math.round(f.water)}.`;
  },
  choices: (g) => {
    const f = farm(g), out = [];
    if (f.hands < 8 && g.player.money >= HAND_WAGE * 2) out.push({ label: `품꾼을 하나 들인다 (달마다 은화 ${HAND_WAGE}닢)`, key: 'hire' });
    if (f.hands > 0) out.push({ label: '품꾼 하나를 내보낸다', key: 'fire' });
    if (f.oxen < 2 && g.player.money >= OX) out.push({ label: `쟁기 끌 소를 산다 (은화 ${OX}닢)`, key: 'ox' });
    for (const id of ['fine', 'hardy', 'local']) if (f.seed !== id) out.push({ label: `씨앗을 ${J(SEEDS[id].name, '으로/로')} 바꾼다`, key: `seed:${id}` });
    if (f.water < 90 && g.player.money >= DITCH) out.push({ label: `밭머리에 물길을 판다 (은화 ${DITCH}닢)`, key: 'ditch' });
    out.push({ label: '장부를 덮는다', key: 'no' });
    return out.slice(-8);
  },
  resolve(g, rng, s, key) {
    const f = farm(g);
    if (key === 'hire') { if (f.hands >= 8) return '더 들일 자리가 없다.'; f.hands += 1; return `${J(rng.pick(['떠돌이 품팔이', '이웃집 둘째 아들', '빚을 갚으려는 농부', '전쟁에서 돌아온 사내']), '을/를')} 품꾼으로 들였다. 손이 크고 말이 적다.`; }
    if (key === 'fire') { if (!f.hands) return '내보낼 품꾼이 없다.'; f.hands -= 1; return '품꾼 하나에게 마지막 품삯을 쥐여 주었다. 그는 모자를 고쳐 쓰고 다음 마을로 떠났다.'; }
    if (key === 'ox') { if (f.oxen >= 2 || pay(g, OX) < OX) return '소를 살 수 없었다.'; f.oxen += 1; return '눈이 순한 황소를 한 마리 끌고 왔다. 쟁기를 매자 땅이 전과 다르게 갈렸다.'; }
    if (key.startsWith('seed:')) { const id = key.slice(5); if (!SEEDS[id]) return '씨앗을 구하지 못했다.'; f.seed = id; return `다음 파종부터 ${J(SEEDS[id].name, '을/를')} 쓰기로 했다.${SEEDS[id].cost ? ` 밭마다 은화 ${SEEDS[id].cost}닢이 더 든다.` : ''}`; }
    if (key === 'ditch') { if (pay(g, DITCH) < DITCH) return '삽을 들 돈도 모자랐다.'; f.water = clamp(f.water + 20, 0, 100); tired(g, 10); return `품꾼들과 사흘 동안 개울에서 밭머리까지 도랑을 팠다. 물이 처음 흘러들 때 다들 말없이 서서 보았다.${learn(g, 0.6)}`; }
    return '장부를 덮었다.';
  },
});

/* ---------- 곳간과 장터 ---------- */
const canMarket = (g) => atFarm(g) && free(g) && barnTotal(farm(g)) > 0;
ACTIONS.push({
  id: 'farm_market',
  name: '곳간 곡식을 장에 낸다',
  icon: 'coin',
  desc: '쟁여 둔 곡식을 판다. 거둔 직후엔 다들 내놓아 싸고, 봄이 되면 귀해진다. 흉년이면 더 비싸다. 곳간에 오래 두면 쥐와 곰팡이가 먹는다.',
  available: canMarket,
  run(g) {
    if (!sceneQueued(g, 'farm_market')) queueScene(g, 'farm_market', {}, { first: true });
    return '곡식 자루를 수레에 싣고 장으로 갔다.';
  },
});
const sellCrop = (g, id, n) => { const f = farm(g), k = Math.min(n, f.barn[id] ?? 0); if (k <= 0) return 0; const m = Math.round(k * cropPrice(g, id)); f.barn[id] -= k; if (f.barn[id] <= 0) delete f.barn[id]; g.player.money += m; FM(g).sold += k; return m; };
defineScene('farm_market', {
  need: (g) => canMarket(g),
  title: (g) => `${placeName(here(g))} 곡물 장`,
  text: (g) => {
    const f = farm(g);
    return `곳간: ${CROP_IDS.filter((id) => f.barn[id]).map((id) => `${CROPS[id].name} ${f.barn[id]}자루(자루당 은화 ${cropPrice(g, id)}닢)`).join(', ')}. ${g.date.month >= 8 && g.date.month <= 10 ? '거둔 뒤라 장에 곡식이 넘친다.' : g.date.month >= 3 && g.date.month <= 6 ? '봄 보릿고개라 곡식이 귀하다.' : ''}`;
  },
  choices: (g) => {
    const f = farm(g);
    return [
      ...CROP_IDS.filter((id) => f.barn[id]).map((id) => ({ label: `${CROPS[id].name} ${f.barn[id]}자루를 판다 (은화 ${Math.round(f.barn[id] * cropPrice(g, id))}닢)`, key: `sell:${id}` })),
      { label: '모두 판다', key: 'all' },
      { label: '두고 본다', key: 'no' },
    ].slice(-8);
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '값만 물어보고 수레를 돌렸다. 봄까지 기다려 볼 생각이다.';
    const f = farm(g);
    let m = 0;
    if (key === 'all') for (const id of CROP_IDS) m += sellCrop(g, id, 9999);
    else { const id = key.slice(5); if (CROPS[id]) m = sellCrop(g, id, 9999); }
    if (!m) return '팔 곡식이 없었다.';
    return `곡물상이 자루마다 손을 넣어 낟알을 씹어 보았다. 은화 ${m}닢을 받았다.${barnTotal(f) ? ` 곳간에는 ${barnTotal(f)}자루가 남았다.` : ' 곳간이 비었다.'}`;
  },
});

/* ---------- 거두기 ---------- */
defineScene('farm_harvest', {
  need: (g, s) => atFarm(g) && free(g) && Number.isFinite(s.sacks) && s.sacks > 0,
  title: (g) => `${farm(g).name}, 거두는 날`,
  text: (g, s) => {
    const f = farm(g);
    return `${s.what} 모두 ${s.sacks}자루를 거두었다.${s.landlord ? ` 지주 몫으로 ${s.landlord}자루를 바쳤다.` : ''}${s.share ? ` 소작 몫으로 ${s.share}자루가 들어왔다.` : ''} ${s.why} 곳간에는 이제 ${barnTotal(f)}자루가 있다.`;
  },
  choices: () => [
    { label: '거둔 만큼 바로 판다', key: 'sell' },
    { label: '반만 팔고 반은 쟁여 둔다', key: 'half' },
    { label: '모두 곳간에 넣는다', key: 'keep' },
  ],
  resolve(g, rng, s, key) {
    const f = farm(g);
    if (key === 'keep') return `자루를 곳간에 쌓았다. 문을 닫고 빗장을 질렀다.${learn(g, 0.4)}`;
    let m = 0;
    for (const [id, n] of Object.entries(s.got ?? {})) if (CROPS[id]) m += sellCrop(g, id, key === 'half' ? Math.ceil(n / 2) : n);
    return m ? `곡물상의 저울에 자루를 올렸다. 은화 ${m}닢.${barnTotal(f) ? ` 곳간에 ${barnTotal(f)}자루가 남았다.` : ''}` : '곳간에 넣었다.';
  },
});

// 한 뙈기의 소출
export function fieldYield(g, f, x, worker = true) {
  const c = CROPS[x.crop], sd = SEEDS[x.seed] ?? SEEDS.local;
  const rc = regionCrop(g, f.place);
  let y = c.yield * (0.4 + x.soil / 115) * rc * sd.mul;
  if (rc < 1) y *= 1 + sd.hardy * (1 - rc);
  const care = worker ? x.care : Math.min(x.care, f.hands);
  y *= 0.7 + Math.min(care, 4) * 0.12 + farmSkill(g) / 400;
  if (disasterHere(g, f.place).some((d) => d.kind === 'drought')) y *= 0.55 + f.water / 220;
  return Math.max(0, Math.round(y));
}

/* ---------- 매달 셈 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const st = FM(g), f = st.farm, now = mi(g), rng = ownRng(g, 1);
  if (!f) return;
  const present = atFarm(g);
  // 품삯: 못 주면 하나씩 떠난다
  if (f.hands) {
    const due = f.hands * HAND_WAGE, paid = pay(g, due);
    if (paid < due) { f.hands -= 1; logFarm(g, '품삯이 밀려 품꾼 하나가 떠났다.'); }
  }
  // 빈 밭은 쉬며 땅심을 찾는다
  for (const x of myFields(f)) if (!x.crop) x.soil = clamp(x.soil + 0.6, 5, 100);
  // 내가 없으면 품꾼이 파종 철에 보리라도 뿌린다
  if (!present && f.hands > 0 && [3, 4].includes(g.date.month)) for (const x of fallow(f).slice(0, f.hands * 2)) { x.crop = 'barley'; x.sown = now; x.care = 0; x.seed = 'local'; }
  // 품꾼이 있으면 자라는 밭을 돌본다
  if (f.hands > 0) for (const x of growing(f).slice(0, f.hands * 2)) if (rng.chance(0.5)) x.care = clamp(x.care + 0.5, 0, 6);
  // 거두기
  const got = {}, whatBits = [];
  let sacks = 0, landlord = 0;
  for (const x of growing(f)) {
    if (now < ripeAt(x)) continue;
    let y = fieldYield(g, f, x, present);
    if (x.leased) { const l = Math.round(y / 3); landlord += l; y -= l; }
    got[x.crop] = (got[x.crop] ?? 0) + y; sacks += y;
    x.soil = clamp(x.soil + CROPS[x.crop].soil - (x.last === x.crop ? 6 : 0), 5, 100);
    x.last = x.crop; x.crop = null; x.care = 0;
  }
  // 소작 몫: 가을에 한 번
  let share = 0;
  if (g.date.month === 9) for (const x of f.fields) if (x.tenant) {
    const y = Math.round(CROPS.barley.yield * (0.4 + x.soil / 115) * regionCrop(g, f.place) * 0.8);
    const k = Math.round(y / 3); share += k; got.barley = (got.barley ?? 0) + k;
    x.soil = clamp(x.soil - 4, 5, 100);
  }
  for (const [id, n] of Object.entries(got)) { if (n > 0) { f.barn[id] = (f.barn[id] ?? 0) + n; whatBits.push(`${CROPS[id].name} ${n}자루`); } }
  st.reaped += sacks;
  if (sacks + share > 0) {
    const rc = regionCrop(g, f.place);
    const why = rc >= 1.12 ? '풍년이다. 이웃들 얼굴이 밝다.' : rc < 0.72 ? '흉년이다. 다들 이보다 못하다.' : disasterHere(g, f.place).length ? `${J(NATURE[disasterHere(g, f.place)[0].kind]?.name ?? '궂은 날씨', '이/가')} 들판을 할퀴고 갔다.` : '평년만 하다.';
    logFarm(g, `${J(whatBits.join(', '), '을/를')} 들였다.`);
    if (sacks > 0 && present && free(g) && !sceneQueued(g, 'farm_harvest')) queueScene(g, 'farm_harvest', { sacks: sacks + share, got, what: `${whatBits.join(', ')}.`, why, landlord, share });
    else note(g, `${f.name}에서 ${J(whatBits.join(', '), '을/를')} 거둬 곳간에 넣었다.`);
  }
  // 곳간 축남: 쥐와 곰팡이
  for (const id of Object.keys(f.barn)) { const loss = Math.floor(f.barn[id] * 0.02 + (rng.chance(0.3) ? 1 : 0)); f.barn[id] = Math.max(0, f.barn[id] - loss); if (!f.barn[id]) delete f.barn[id]; }
  // 사건
  if (!free(g) || now - st.eventAt < 4 || sceneQueued(g, 'farm_event') || !rng.chance(0.3)) return;
  const evs = eligible(g);
  if (!evs.length) return;
  st.eventAt = now;
  queueScene(g, 'farm_event', { ev: rng.pick(evs) });
});
export function eligible(g) {
  const f = farm(g), out = [];
  if (!atFarm(g)) return out;
  out.push('water', 'boundary');
  if (growing(f).length) out.push('blight');
  if (f.hands >= 2) out.push('hands');
  if (f.fields.some((x) => x.tenant)) out.push('tenant');
  if (f.fields.length >= 3) out.push('buyer');
  if (barnTotal(f) >= 10) out.push('thief', 'levy');
  return out;
}

/* ---------- 대 잇기: 땅은 남는다 ---------- */
HOOKS.heir.push((g) => {
  const f = farm(g);
  if (!f) return;
  f.gens += 1;
  for (const x of f.fields) x.care = 0;
  logFarm(g, `${J(f.name, '이/가')} ${g.player.name}에게 넘어왔다. ${f.gens}대째 땅이다.`);
  if (f.gens >= 3) chron(g, `${placeName(f.place)}의 ${J(f.name, '이/가')} ${f.gens}대째 한 집안의 손에서 갈리고 있다.`, 20);
});
