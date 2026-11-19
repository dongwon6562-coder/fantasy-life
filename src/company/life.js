// 용병단 세우기, 계약 맺기, 싸움터에서 이끌기, 단 살림(사람·훈련·몫·약탈 규율), 매달 셈, 깃발 잇기.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill, playerAge } from '../game.js';
import { leaveJob } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check, isAdult } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { leadership } from '../war/battle.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { allWars, edgeOf, foeIn, PS } from '../politics/state.js';
import { realmPlaces } from '../realms/index.js';
import {
  S, myCo, commanding, withCo, mi, clamp, here, placeName, realmShort, free, stat, ownRng, isPlace, town, MERC_HUBS, realmOf, travelMonths,
  SIGNS, SIGN_IDS, SPLITS, LOOTS, ROLES, ROLE_IDS, newVet, newCompany, raiseBanner, honor, endCompany, logCo, wagesOf, coPow, addFamily, soldierName,
  rivalById, famWord, FOUND_COST, captainName,
} from './core.js';

export const canCommand = (g) => isAdult(g) && playerAge(g) >= 16 && free(g) && !g.army?.service && !g.poor?.bond && !g.troupe?.t;
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const vetOf = (g, id) => myCo(g)?.vets.find((v) => v.id === id) ?? null;
const ltOf = (c) => c.vets.find((v) => v.role === 'lt') ?? c.vets.slice().sort((a, b) => b.skill - a.skill)[0] ?? null;
const lerp = (v, n) => clamp(v + n, 0, 100);

/* ---------- 세우기 ---------- */
const canFound = (g) => canCommand(g) && !myCo(g) && town(here(g)) && g.player.money >= FOUND_COST
  && ((g.player.skills.sword ?? 0) >= 25 || (PS(g).me?.merc ?? 0) >= 3 || (L(g).renown ?? 0) >= 12);
ACTIONS.push({
  id: 'company_found',
  name: '용병단을 세운다',
  icon: 'sword',
  desc: `깃발을 올리고 칼 쓸 사람을 모아 내 용병단을 세운다 (은화 ${FOUND_COST}닢, 검술 25나 용병으로 세 번 싸운 경험이나 이름값이 있어야). 계약을 맺어 남의 싸움을 대신 싸운다.`,
  available: canFound,
  run(g) {
    if (!sceneQueued(g, 'company_found')) queueScene(g, 'company_found', {}, { first: true });
    return '술집 벽에 사람을 구한다는 방을 붙였다.';
  },
});
defineScene('company_found', {
  need: (g) => canFound(g),
  title: () => '깃발',
  text: (g) => {
    const b = S(g).banner;
    return `무기 상인에게서 창 열댓 자루와 낡은 사슬갑옷을 샀다. 술집 뒷방에 모인 사내와 여자들이 나를 본다. 무엇을 깃발에 그릴까.${b ? ` 집 궤짝에는 ${b.founder}의 깃발 ${J(b.name, '이/가')}${b.honors.length ? ` 이름난 싸움 ${b.honors.length}번을 새긴 채` : ''} 접혀 있다.` : ''}`;
  },
  choices: (g) => {
    const b = S(g).banner;
    const pool = SIGN_IDS.filter((id) => id !== b?.sign).slice(0, 4);
    return [
      ...(b ? [{ label: `${b.name}의 깃발을 다시 올린다`, key: `old:${b.sign}` }] : []),
      ...pool.map((id) => ({ label: `${J(SIGNS[id].sign, '을/를')} 그린다`, key: `new:${id}` })),
      { label: '그만둔다', key: 'no' },
    ];
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '방을 떼어 냈다. 아직은 아니다.';
    if (myCo(g)) return '이미 깃발이 있다.';
    if (g.player.money < FOUND_COST) return '돈이 모자랐다.';
    const [how, sign] = key.split(':');
    if (!SIGNS[sign]) return '그 깃발은 없었다.';
    const old = how === 'old' && S(g).banner?.sign === sign;
    g.player.money -= FOUND_COST;
    const vetMerc = (PS(g).me?.merc ?? 0) >= 3;
    const c = newCompany(g, rng, { sign, old, men: 12 + (vetMerc ? 4 : 0) + Math.min(6, Math.floor((L(g).renown ?? 0) / 8)) });
    S(g).c = c;
    const b = raiseBanner(g, sign);
    b.holder = g.player.name;
    if (L(g).job) leaveJob(g, '용병단을 이끌려고 하던 일을 그만두었다.');
    logCo(g, old ? `${b.founder}의 깃발 ${J(b.name, '을/를')} 다시 올렸다.` : `${J(c.name, '을/를')} 세웠다.`);
    chron(g, `${g.player.name}, ${J(c.name, '을/를')} 세우다.`, 40);
    note(g, `${J(c.name, '을/를')} 세웠다. 창병 ${c.men}명.`);
    const lt = c.vets[0];
    return old
      ? `접혀 있던 ${b.name}의 깃발을 폈다. 늙은 용병 하나가 깃발을 알아보고 모자를 벗었다. "그 깃발 밑에서 싸운 적이 있소." 창병 ${c.men}명이 모였다. 부관은 ${lt.name}.`
      : `${J(SIGNS[sign].sign, '을/를')} 그린 천을 장대에 묶었다. "${SIGNS[sign].motto}." 창병 ${c.men}명이 이름을 적었다. 부관은 ${lt.name}.`;
  },
});

/* ---------- 계약 ---------- */
const TEMPERS = ['fair', 'fair', 'stingy', 'sly'];
const KIND_NAME = { war: '전쟁', guard: '상단 호위', lord: '영주의 싸움', beast: '마물 토벌' };
function nearestOf(pl, realm) {
  if (realmOf(pl) === realm && isPlace(pl)) return pl;
  return realmPlaces(realm).filter((p) => isPlace(p) && travelMonths(pl, p) <= 3).sort((a, b) => travelMonths(pl, a) - travelMonths(pl, b) || a.localeCompare(b))[0] ?? null;
}
export function makeOffers(g) {
  const s = S(g), c = myCo(g), pl = here(g);
  if (s.offers && s.offers.at === mi(g) && s.offers.place === pl) return s.offers.list;
  const rng = ownRng(g, 5);
  const base = c ? wagesOf(c) : 20;
  const fame = c?.fame ?? 0;
  const out = [];
  const mk = (o) => ({ ...o, pay: Math.round(base * (1.3 + o.danger * 0.25) + fame * 0.15 + (o.extra ?? 0)), bonus: Math.round(base * (1 + o.danger)), temper: rng.pick(TEMPERS) });
  for (const w of allWars(g)) for (const side of [w.a, w.b]) {
    if (!realmPlaces(side).length || (s.hunted[side] ?? -1) >= mi(g)) continue;
    const where = nearestOf(pl, side);
    if (!where || !(MERC_HUBS.includes(pl) || realmOf(pl) === side || travelMonths(pl, where) <= 2)) continue;
    const edge = edgeOf(w, side);
    out.push(mk({ id: `war:${side}:${foeIn(w, side)}`, kind: 'war', side, foe: foeIn(w, side), by: `${realmShort(side)} 원정군 사령관`, where, months: rng.int(4, 7), danger: edge < -10 ? 3 : 2, extra: Math.max(0, -edge) * 0.3, world: !!w.world }));
  }
  if (town(pl)) out.push(mk({ id: `guard:${pl}`, kind: 'guard', side: null, foe: null, by: rng.pick(['은저울 상단 행수', '소금 상단 늙은 주인', '포목 상단 과부 주인']), where: pl, months: rng.int(3, 5), danger: 1 }));
  out.push(mk({ id: `lord:${pl}`, kind: 'lord', side: null, foe: null, by: `${placeName(pl)} 근처 ${rng.pick(['젊은 기사', '늙은 남작', '욕심 많은 영주 동생'])}`, where: pl, months: rng.int(2, 4), danger: rng.pick([1, 2]) }));
  if (rng.chance(0.6)) out.push(mk({ id: `beast:${pl}`, kind: 'beast', side: null, foe: null, by: `${placeName(pl)} 장로들`, where: pl, months: rng.int(2, 3), danger: rng.pick([1, 2, 2]) }));
  // 전쟁 쪽 맞수: 이름난 용병단이 반대편에 붙는다
  for (const o of out) if (o.kind === 'war' && rng.chance(0.35)) o.rival = rng.pick(s.rivals)?.id ?? null;
  const list = out.slice(0, 4);
  s.offers = { at: mi(g), place: pl, list };
  return list;
}
export const offerText = (o) => `${KIND_NAME[o.kind]}${o.kind === 'war' ? `(${realmShort(o.side)} 편, ${J(realmShort(o.foe), '과/와')} 싸움)` : ''}: ${o.by}, ${o.months}달, 달마다 은화 ${o.pay}닢${o.where ? `, ${placeName(o.where)}` : ''}`;

ACTIONS.push({
  id: 'company_contract',
  name: '계약을 찾는다',
  icon: 'coin',
  desc: '고용주를 만나 다음 싸움의 값을 흥정한다. 전쟁은 크게 벌지만 많이 죽고, 상단 호위는 덜 벌지만 덜 죽는다.',
  available: (g) => withCo(g) && free(g) && !myCo(g).contract,
  run(g) {
    if (!sceneQueued(g, 'company_board')) queueScene(g, 'company_board', {}, { first: true });
    return '고용주들이 묵는 여관을 돌았다.';
  },
});
defineScene('company_board', {
  need: (g) => withCo(g) && free(g) && !myCo(g).contract,
  title: () => '고용주들',
  text: (g) => {
    const c = myCo(g), list = makeOffers(g);
    return `${c.name}의 이름은 ${famWord(c.fame)} 정도다. 창병 ${c.men}명, 달마다 나가는 삯이 은화 ${wagesOf(c)}닢.${list.length ? ' 탁자 위에 계약서가 놓였다.' : ' 오늘은 사람을 사겠다는 고용주가 없다.'}`;
  },
  choices: (g) => [
    ...makeOffers(g).map((o, i) => ({ label: offerText(o), key: `o:${i}` })),
    { label: '조금 더 기다린다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    const c = myCo(g);
    if (!c || c.contract) return '이미 맺은 계약이 있다.';
    if (key === 'no') { c.morale = lerp(c.morale, -2); return '계약서를 접었다. 막사에서 창병들이 주사위를 굴리며 투덜댔다.'; }
    const o = makeOffers(g)[+key.slice(2)];
    if (!o) return '그 고용주는 이미 다른 단을 샀다.';
    const k = { ...o, left: o.months, started: false, won: 0, lost: 0, unpaid: 0, at: mi(g) };
    c.contract = k;
    S(g).offers = null;
    if (k.where !== here(g)) {
      L(g).travel = { to: k.where, left: travelMonths(here(g), k.where), from: here(g) };
      c.place = k.where;
    } else k.started = true;
    logCo(g, `${J(k.by, '과/와')} ${KIND_NAME[k.kind]} 계약을 맺었다.`);
    const riv = k.rival ? rivalById(g, k.rival) : null;
    return `${J(k.by, '이/가')} 계약서에 인장을 찍었다. ${k.months}달, 달마다 은화 ${k.pay}닢, 이기면 덤으로 ${k.bonus}닢.${k.where !== here(g) ? ` 단을 이끌고 ${J(placeName(k.where), '으로/로')} 떠났다.` : ''}${riv ? ` 반대편에 ${J(riv.name, '이/가')} 붙었다는 소문이 돈다.` : ''}`;
  },
});

/* ---------- 싸움 ---------- */
export const PLANS = {
  charge: { label: '내가 앞장서 돌격한다', pow: 8, win: 0.07, lose: 0.2, vet: 1.6 },
  hold: { label: '대열을 지키며 버틴다', pow: 0, win: 0.04, lose: 0.12, vet: 1 },
  flank: { label: '한 무리를 돌려 옆을 친다', pow: 6, win: 0.03, lose: 0.16, vet: 1, drill: 50 },
  spare: { label: '뒤로 빼서 사람을 아낀다', pow: -10, win: 0.02, lose: 0.06, vet: 0.5 },
};
export const contractHere = (g) => { const c = myCo(g), k = c?.contract; return !!k && k.started && here(g) === k.where && !L(g).travel; };
// 한 번 싸운다. led: 내가 직접 이끄나. 돌려주는 글은 장면과 매달 셈이 함께 쓴다.
export function fight(g, rng, plan, led) {
  const s = S(g), c = myCo(g), k = c.contract, P = PLANS[plan] ?? PLANS.hold;
  const riv = k.rival ? rivalById(g, k.rival) : null;
  const hard = 30 + k.danger * 14 + (riv ? riv.fame * 0.12 : 0);
  const lt = ltOf(c);
  const head = led ? leadership(g) * 0.3 + playerPower(g) * 0.1 : (lt?.skill ?? 25) * 0.25;
  const won = check(rng, coPow(c) + head + P.pow, hard);
  const rate = won ? P.win : P.lose;
  const lost = c.men > 0 ? Math.min(c.men, Math.max(won ? 0 : 1, Math.round(c.men * rate))) : 0;
  c.men -= lost; c.dead += lost; s.dead += lost;
  c.battles += 1; s.battles += 1; c.foughtAt = mi(g);
  const bits = [];
  if (won) { c.won += 1; s.won += 1; k.won += 1; c.morale = lerp(c.morale, 4); c.fame = lerp(c.fame, 1.2 * k.danger); }
  else { c.lost += 1; k.lost += 1; c.morale = lerp(c.morale, -8); c.fame = lerp(c.fame, -1); }
  if (lost > 0 && rng.chance(0.5)) addFamily(g, rng, `창병 ${soldierName(rng)}`);
  // 이름 있는 단원
  if (c.vets.length && rng.chance((won ? 0.04 : 0.14) * P.vet)) {
    const v = rng.pick(c.vets);
    c.vets.splice(c.vets.indexOf(v), 1);
    addFamily(g, rng, `${ROLES[v.role]} ${v.name}`, { vet: true });
    logCo(g, `${ROLES[v.role]} ${J(v.name, '이/가')} 싸움터에서 죽었다.`);
    bits.push(`${ROLES[v.role]} ${J(v.name, '이/가')} 돌아오지 못했다.`);
    c.morale = lerp(c.morale, -5);
  } else if (c.vets.length && rng.chance(0.06 * P.vet) && !sceneQueued(g, 'company_event')) {
    const v = rng.pick(c.vets);
    queueScene(g, 'company_event', { ev: 'maimed', a: v.id });
  }
  // 싸움 쪽 전선: 큰 전쟁이면 아주 조금 민다
  if (k.kind === 'war' && won && !k.world) { const w = PS(g).wars.find((x) => [x.a, x.b].includes(k.side) && [x.a, x.b].includes(k.foe)); if (w) w.push = (w.push ?? 0) + (k.side === w.a ? 1 : -1) * (0.5 + c.men / 60); }
  if (riv) { if (won) { riv.fame = clamp(riv.fame - 1.5, 5, 95); riv.grudge = clamp(riv.grudge + 4, 0, 100); } else riv.fame = clamp(riv.fame + 1, 5, 95); }
  // 약탈
  let loot = '';
  if (won && (k.kind === 'war' || k.kind === 'lord')) {
    const L0 = LOOTS[c.loot];
    const amt = Math.round(k.danger * rng.int(6, 14) * L0.mult * Math.max(0.5, c.men / 20));
    c.drill = lerp(c.drill, L0.drill); c.morale = lerp(c.morale, L0.morale);
    if (c.loot === 'tenth' && amt > 0) { c.chest += amt; loot = ` 거둔 것의 십일조로 은화 ${amt}닢이 단의 궤에 들었다.`; }
    if (c.loot === 'free' && amt > 0) { const mine = Math.round(amt * 0.4); g.player.money += mine; loot = ` 창병들이 마을을 뒤졌다. 내 손에도 은화 ${mine}닢이 쥐어졌다.`; if (rng.chance(0.3)) deed(g, 'kind', -2, '용병들이 지나간 마을이 쑥대밭이 되었다더라.'); }
    if (c.loot === 'forbid') loot = ' 약탈은 금했다. 창병들이 불탄 마을을 그냥 지나치며 침을 뱉었다.';
    if (k.kind === 'war' && amt > 0 && c.loot !== 'forbid' && rng.chance(0.18) && !sceneQueued(g, 'company_event')) queueScene(g, 'company_event', { ev: 'sack' });
  }
  if (led) {
    tired(g, P === PLANS.charge ? 20 : 14); stress(g, won ? 2 : 7);
    gainSkill(g, 'sword', P === PLANS.charge ? 0.7 : 0.4, 'str');
    if ((!won && rng.chance(0.35)) || (P === PLANS.charge && rng.chance(0.18))) { g.player.injuries.push({ name: rng.pick(['어깨에 박힌 화살촉', '창에 긁힌 허벅지', '방패째 맞은 갈비뼈']), months: rng.int(1, 3) }); bits.push('나도 피를 흘렸다.'); }
  }
  const foe = k.kind === 'war' ? `${realmShort(k.foe)} 군` : k.kind === 'guard' ? '길목의 도적 떼' : k.kind === 'lord' ? '맞은편 영주의 병사들' : '마물 떼';
  const story = won
    ? `${J(foe, '을/를')} 물리쳤다.${lost ? ` 창병 ${lost}명을 묻었다.` : ' 죽은 사람은 없었다.'}`
    : `${foe}에게 밀렸다. 창병 ${lost}명을 잃었다.`;
  return { won, lost, text: `${story}${bits.length ? ` ${bits.join(' ')}` : ''}${loot}` };
}

ACTIONS.push({
  id: 'company_lead',
  name: '용병단을 이끌고 싸운다',
  icon: 'sword',
  desc: '계약한 싸움터에서 이번 달 싸움을 직접 이끈다. 내가 나서지 않으면 부관이 이끈다.',
  available: (g) => withCo(g) && free(g) && contractHere(g) && myCo(g).foughtAt !== mi(g),
  run(g) {
    if (!sceneQueued(g, 'company_fight')) queueScene(g, 'company_fight', {}, { first: true });
    return `${myCo(g).name}의 깃발을 앞세웠다.`;
  },
});
defineScene('company_fight', {
  need: (g) => withCo(g) && free(g) && contractHere(g) && myCo(g).foughtAt !== mi(g),
  title: (g) => `${myCo(g).name}, ${placeName(here(g))}`,
  text: (g) => {
    const c = myCo(g), k = c.contract, riv = k.rival ? rivalById(g, k.rival) : null;
    const foe = k.kind === 'war' ? `${realmShort(k.foe)} 군의 진` : k.kind === 'guard' ? '상단 수레를 노리는 도적 떼' : k.kind === 'lord' ? '맞은편 영주가 부른 병사들' : '마을 밖 숲에서 내려온 마물 떼';
    return `새벽 안개 너머로 ${J(foe, '이/가')} 보인다.${riv ? ` 그 사이로 ${riv.name}의 깃발도 섞여 있다.` : ''} 창병 ${c.men}명이 내 쪽을 본다. 대열은 ${c.drill >= 60 ? '반듯하다' : c.drill >= 35 ? '그럭저럭 맞는다' : '삐뚤빼뚤하다'}.`;
  },
  choices: (g) => Object.entries(PLANS).filter(([, p]) => !p.drill || myCo(g).drill >= p.drill).map(([id, p]) => ({ label: p.label, key: id })),
  resolve(g, rng, s, key) {
    if (!myCo(g) || !contractHere(g)) return '싸움터는 이미 비어 있었다.';
    if (myCo(g).foughtAt === mi(g)) return '이번 달 싸움은 이미 끝났다.';
    const r = fight(g, rng, PLANS[key] ? key : 'hold', true);
    const open = { charge: '맨 앞에서 창을 꼬나 쥐고 달렸다.', hold: '방패를 맞대고 한 걸음도 물러서지 않았다.', flank: '부관에게 한 무리를 맡겨 숲을 돌게 했다.', spare: '앞줄을 뒤로 물리고 활로만 맞섰다.' }[key] ?? '';
    return `${open} ${r.text}`;
  },
});

/* ---------- 단 살림 ---------- */
ACTIONS.push({
  id: 'company_manage',
  name: '용병단 살림을 본다',
  icon: 'sword',
  desc: '창병을 더 모으고, 훈련시키고, 궤를 채우고, 몫 나누기와 약탈 규율을 정한다. 계약을 깨거나 단을 해산할 수도 있다.',
  available: (g) => withCo(g) && free(g),
  run(g) {
    if (!sceneQueued(g, 'company_manage')) queueScene(g, 'company_manage', {}, { first: true });
    return `${myCo(g).name}의 막사에 들어갔다.`;
  },
});
defineScene('company_manage', {
  need: (g) => withCo(g) && free(g),
  title: (g) => myCo(g).name,
  text: (g) => {
    const c = myCo(g), k = c.contract;
    return `창병 ${c.men}명. ${c.vets.map((v) => `${ROLES[v.role]} ${v.name}`).join(', ') || '이름 있는 단원은 없다'}. 사기는 ${c.morale >= 60 ? '높다' : c.morale >= 35 ? '그럭저럭' : '바닥이다'}, 단의 궤에 은화 ${Math.round(c.chest)}닢, 달마다 삯 ${wagesOf(c)}닢. 몫은 ${SPLITS[c.split].name}, 약탈은 ${LOOTS[c.loot].name}.${k ? ` ${k.by}의 계약이 ${k.left}달 남았다.` : ' 맺은 계약이 없다.'}`;
  },
  choices: (g) => {
    const c = myCo(g), m = g.player.money;
    return [
      ...(m >= 15 && c.men < 120 ? [{ label: '창병 다섯을 더 모은다 (은화 15닢)', key: 'hire' }] : []),
      ...(c.vets.length < 5 && m >= 25 ? [{ label: '이름난 싸움꾼을 하나 들인다 (은화 25닢)', key: 'vet' }] : []),
      ...(!c.contract ? [{ label: '한 달 내내 훈련시킨다', key: 'drill' }] : []),
      ...(m >= 20 ? [{ label: '내 돈으로 단의 궤를 채운다 (은화 20닢)', key: 'fund' }] : []),
      { label: '몫 나누기와 약탈 규율을 정한다', key: 'rules' },
      ...(c.contract ? [{ label: '계약을 깨고 떠난다', key: 'break' }] : []),
      { label: '단을 해산한다', key: 'disband' },
      { label: '그대로 둔다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const c = myCo(g);
    if (!c) return '단은 이미 없었다.';
    if (key === 'none') return '부관과 막사 앞에 앉아 칼을 갈았다.';
    if (key === 'hire') { if (pay(g, 15) < 15) return '돈이 모자랐다.'; c.men += 5; c.drill = lerp(c.drill, -3); return '창 자루를 들고 다섯이 왔다. 둘은 농사꾼, 하나는 탈영병, 둘은 뭘 했는지 말하지 않았다.'; }
    if (key === 'vet') {
      if (c.vets.length >= 5) return '자리가 없다.';
      if (pay(g, 25) < 25) return '돈이 모자랐다.';
      const have = new Set(c.vets.map((v) => v.role));
      const role = ROLE_IDS.find((r) => !have.has(r)) ?? 'pike';
      const v = newVet(g, rng, role, new Set(c.vets.map((x) => x.name)));
      c.vets.push(v); logCo(g, `${ROLES[role]} ${J(v.name, '을/를')} 들였다.`);
      return `${J(v.name, '이/가')} ${J(ROLES[role], '으로/로')} 들어왔다. 첫날 저녁 창병들 앞에서 제 흉터를 하나씩 세어 보였다.`;
    }
    if (key === 'drill') {
      if (c.contract) return '계약 중에는 그럴 틈이 없다.';
      c.drill = lerp(c.drill, 9 + stat(g, 'wil') * 0.05); c.morale = lerp(c.morale, -3); tired(g, 12);
      gainSkill(g, 'sword', 0.3, 'str');
      return '한 달 내내 들판에서 대열을 맞추고 창끝을 내렸다 올렸다. 투덜거림이 줄고 발소리가 맞기 시작했다.';
    }
    if (key === 'fund') { const p = pay(g, 20); c.chest += p; c.morale = lerp(c.morale, 2); return `내 주머니에서 은화 ${p}닢을 단의 궤에 넣었다. 부관이 장부에 적었다.`; }
    if (key === 'rules') { queueScene(g, 'company_rules', {}, { first: true }); return '부관과 장부를 펼쳤다.'; }
    if (key === 'break') {
      const k = c.contract;
      if (!k) return '깰 계약이 없다.';
      c.contract = null; c.fame = lerp(c.fame, -5);
      deed(g, 'loyal', -5, '용병단이 계약을 깨고 싸움터를 떴다더라.');
      if (k.side) S(g).hunted[k.side] = mi(g) + 24;
      logCo(g, `${k.by}의 계약을 깼다.`);
      return `${k.by}에게 계약서를 돌려보냈다. 남은 삯은 받지 못했다. 다른 고용주들이 이 일을 기억할 것이다.`;
    }
    // 해산
    const kept = Math.round(c.chest);
    g.player.money += kept;
    endCompany(g, '깃발을 접었다');
    chron(g, `${g.player.name}, ${J(c.name, '을/를')} 해산하다.`, 30);
    stress(g, 5);
    return `마지막 삯을 치르고 남은 궤의 은화 ${kept}닢을 챙겼다. 깃발은 접어서 궤짝에 넣었다. 언젠가 누군가 다시 펼 것이다.`;
  },
});
defineScene('company_rules', {
  need: (g) => withCo(g),
  title: () => '단의 규율',
  text: (g) => {
    const c = myCo(g);
    return `지금 몫은 ${SPLITS[c.split].name}(${SPLITS[c.split].text}), 약탈은 ${LOOTS[c.loot].name}(${LOOTS[c.loot].text}). 창병들이 막사 밖에서 귀를 세우고 있다.`;
  },
  choices: (g) => {
    const c = myCo(g);
    return [
      ...Object.entries(SPLITS).filter(([id]) => id !== c.split).map(([id, x]) => ({ label: `몫: ${x.name}`, key: `s:${id}` })),
      ...Object.entries(LOOTS).filter(([id]) => id !== c.loot).map(([id, x]) => ({ label: `약탈: ${x.name}`, key: `l:${id}` })),
      { label: '그대로 둔다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const c = myCo(g);
    if (!c || key === 'none') return '규율은 그대로다.';
    const [t, id] = key.split(':');
    if (t === 's' && SPLITS[id]) {
      const before = SPLITS[c.split].mine;
      c.split = id;
      const d = SPLITS[id].mine - before;
      c.morale = lerp(c.morale, d > 0 ? -8 : 8);
      for (const v of c.vets) v.loyal = lerp(v.loyal, d > 0 ? -6 : 5);
      logCo(g, `몫을 '${SPLITS[id].name}'로 바꿨다.`);
      return d > 0 ? '장부에 단장 몫을 늘려 적었다. 부관이 아무 말 없이 펜을 내려놓았다.' : '내 몫을 덜어 창병들 몫에 얹었다. 그날 밤 막사에서 내 이름으로 건배하는 소리가 들렸다.';
    }
    if (t === 'l' && LOOTS[id]) {
      c.loot = id;
      if (id === 'forbid') { c.morale = lerp(c.morale, -6); c.drill = lerp(c.drill, 4); deed(g, 'kind', 2, '용병단에 약탈을 금했다더라.'); return '약탈하는 자는 목을 매단다고 깃대 아래서 외쳤다. 창병들이 서로 눈치를 보았다.'; }
      if (id === 'free') { c.morale = lerp(c.morale, 6); c.drill = lerp(c.drill, -5); return '이긴 날 거둔 것은 거둔 사람 것이라고 했다. 함성이 터졌다. 부관은 함성 속에서 얼굴을 찡그렸다.'; }
      return '거둔 것의 열에 하나는 단의 궤로 들인다고 정했다. 다들 그 정도는 옳다고 했다.';
    }
    return '규율은 그대로다.';
  },
});

/* ---------- 매달 ---------- */
// 계약이 끝나면: 고용주의 성정에 따라 덤을 치르거나, 미루거나, 떼먹는다
function finish(g, rng, c, k) {
  const s = S(g);
  c.contract = null; s.contracts += 1;
  const good = k.won >= k.lost;
  if (k.temper === 'sly' && rng.chance(0.5) && !sceneQueued(g, 'company_event')) {
    queueScene(g, 'company_event', { ev: 'unpaid', by: k.by, owed: good ? k.bonus + k.pay : k.pay, side: k.side ?? null });
    return;
  }
  if (good) { c.chest += k.bonus; c.fame = lerp(c.fame, 2 + k.danger); if (k.kind === 'war' && k.won >= 3) honor(g, `${realmShort(k.side)} 편에서 ${realmShort(k.foe)} 군을 ${k.won}번 꺾었다`); }
  logCo(g, `${k.by}의 계약을 마쳤다. 이긴 싸움 ${k.won}, 진 싸움 ${k.lost}.${good ? ` 덤 ${k.bonus}닢.` : ''}`);
  note(g, `${J(k.by, '과/와')} 맺은 계약을 마쳤다.${good ? ` 덤으로 은화 ${k.bonus}닢.` : ''}`);
}
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const s = S(g), c = s.c, now = mi(g), rng = ownRng(g, 1);
  // 맞수 용병단은 내가 없어도 이름을 얻고 잃는다 (여섯 달에 한 번)
  if (now - s.rivalAt >= 6) {
    s.rivalAt = now;
    for (const r of s.rivals) {
      r.fame = clamp(r.fame + rng.int(-4, 4) + (allWars(g).length ? 1 : -1), 5, 95);
      r.grudge = clamp(r.grudge - 1, 0, 100);
      if (rng.chance(0.04)) { const old = r.captain; r.captain = captainName(rng); r.fame = clamp(r.fame - 8, 5, 95); if (c) logCo(g, `${r.name}의 단장 ${J(old, '이/가')} 죽고 ${J(r.captain, '이/가')} 깃발을 이었다.`); }
    }
  }
  if (!c) return;
  if (c.regent) { regentMonth(g, rng, c); return; }
  if (L(g).travel) return;
  const k = c.contract;
  // 단은 단장을 따라온다. 계약한 싸움터를 두고 떠나면 계약을 깬 것이다.
  if (k && k.started && here(g) !== k.where) {
    c.contract = null; c.fame = lerp(c.fame, -5); if (k.side) s.hunted[k.side] = now + 24;
    deed(g, 'loyal', -4, '용병단이 계약한 싸움터를 버리고 떠났다더라.');
    logCo(g, `싸움터를 두고 떠나 ${k.by}의 계약이 깨졌다.`); note(g, `${k.by}의 계약을 저버렸다.`);
  }
  c.place = here(g);
  if (k && !k.started && here(g) === k.where) { k.started = true; logCo(g, `${placeName(k.where)} 싸움터에 닿았다.`); }
  const k2 = c.contract;
  if (k2 && k2.started) {
    // 내가 이끌지 않은 달은 부관이 싸운다
    const chance = { war: 0.8, guard: 0.45, lord: 0.6, beast: 0.6 }[k2.kind] ?? 0.5;
    if (c.foughtAt !== now && c.men > 0 && rng.chance(chance)) { const r = fight(g, rng, 'hold', false); note(g, `${J(ltOf(c)?.name ?? '부관', '이/가')} 이끈 싸움. ${r.text}`); }
    if (k2.temper === 'stingy' && rng.chance(0.25)) { k2.unpaid += k2.pay; c.morale = lerp(c.morale, -3); }
    else c.chest += k2.pay;
    k2.left -= 1;
    if (k2.left <= 0) finish(g, rng, c, k2);
  } else if (!k2) c.morale = lerp(c.morale, -2);
  // 삯과 몫
  const wage = wagesOf(c);
  if (c.chest >= wage) { c.chest -= wage; c.owed = 0; }
  else { c.owed += wage - c.chest; c.chest = 0; c.morale = lerp(c.morale, -10); }
  const reserve = wage * 2;
  if (c.chest > reserve) {
    const profit = Math.floor(c.chest - reserve);
    const mine = Math.round(profit * SPLITS[c.split].mine);
    g.player.money += mine; c.chest -= profit;
    c.morale = lerp(c.morale, 2 + SPLITS[c.split].morale);
  } else c.morale = lerp(c.morale, SPLITS[c.split].morale * 0.5);
  for (const v of c.vets) v.loyal = lerp(v.loyal, (c.morale - 45) / 25 + (c.split === 'captain' ? -1 : c.split === 'equal' ? 0.5 : 0));
  // 사기가 바닥이면 창병이 빠져나간다
  if (c.morale < 25 && c.men > 0) { const gone = Math.max(1, Math.round(c.men * (c.morale < 12 ? 0.18 : 0.08))); c.men -= gone; note(g, `창병 ${gone}명이 밤사이 막사를 빠져나갔다.`); }
  if (c.men <= 0 && !c.vets.length) { endCompany(g, '사람이 다 흩어졌다'); note(g, `${c.name}에 남은 사람이 없다. 깃발만 남았다.`); return; }
  if (!free(g)) return;
  // 단 안팎의 일
  if (now - s.eventAt < 3 || sceneQueued(g, 'company_event') || !rng.chance(0.4)) return;
  const pool = [];
  const lowVet = c.vets.find((v) => v.loyal < 30);
  if (lowVet && c.morale < 45) pool.push('mutiny', 'mutiny');
  if (k2?.started && k2.kind === 'war') pool.push('turn', 'ransom');
  if (k2?.started && k2.kind === 'war' && k2.rival) pool.push('rival', 'rival');
  if (s.families.some((f) => f.helped == null)) pool.push('widow', 'widow');
  if (c.men >= 8 && c.morale < 55) pool.push('desert');
  if (k2?.started && k2.unpaid > 0) pool.push('unpaid');
  if (!pool.length) return;
  s.eventAt = now;
  const ev = rng.pick(pool);
  const data = { ev };
  if (ev === 'mutiny') data.a = lowVet.id;
  if (ev === 'widow') data.f = rng.pick(s.families.filter((f) => f.helped == null)).id;
  if (ev === 'turn') data.offer = Math.round(k2.pay * rng.pick([1.6, 1.8, 2]));
  if (ev === 'unpaid') Object.assign(data, { by: k2.by, owed: k2.unpaid, side: k2.side ?? null, mid: true });
  if (ev === 'rival') data.r = k2.rival;
  queueScene(g, 'company_event', data);
});

// 단장이 어리면 부관이 깃발을 맡는다: 계약 없이 지키기만 하고, 삯은 궤에서 나간다
function regentMonth(g, rng, c) {
  c.contract = null;
  const wage = wagesOf(c);
  if (c.chest >= wage) c.chest -= wage;
  else { c.chest = 0; c.morale = lerp(c.morale, -4); c.men = Math.max(0, c.men - 1); }
  // 부관이 가끔 작은 일을 받아 궤를 채운다
  if (rng.chance(0.5)) c.chest += Math.round(wage * 1.2);
  const lt = c.vets.find((v) => v.name === c.regent);
  if (lt) lt.loyal = lerp(lt.loyal, -0.5);
}
ACTIONS.push({
  id: 'company_take',
  name: '깃발을 넘겨받는다',
  icon: 'sword',
  desc: '부모가 남긴 용병단을 맡고 있던 부관에게서 단장 자리를 넘겨받는다.',
  available: (g) => !!myCo(g)?.regent && canCommand(g) && playerAge(g) >= 16,
  run(g) {
    if (!sceneQueued(g, 'company_take')) queueScene(g, 'company_take', {}, { first: true });
    return `${myCo(g).name}의 막사를 찾아갔다.`;
  },
});
defineScene('company_take', {
  need: (g) => !!myCo(g)?.regent && canCommand(g),
  title: () => '깃발을 넘겨받다',
  text: (g) => {
    const c = myCo(g), lt = c.vets.find((v) => v.name === c.regent);
    return `${J(c.regent, '이/가')} 몇 해 동안 ${J(c.name, '을/를')} 지켜 왔다. 창병 ${c.men}명.${lt && lt.loyal < 40 ? ` ${J(lt.name, '은/는')} 내 얼굴을 보고도 의자에서 일어나지 않았다. "깃발은 피로 지키는 거지, 피로 물려받는 게 아니오."` : ` ${J(c.regent, '이/가')} 깃대를 두 손으로 내밀었다.`}`;
  },
  choices: (g) => {
    const c = myCo(g), lt = c.vets.find((v) => v.name === c.regent);
    if (!lt || lt.loyal >= 40) return [{ label: '깃대를 받는다', key: 'take' }, { label: `${J(c.regent, '이/가')} 계속 이끌게 두고 단을 넘긴다`, key: 'give' }];
    return [
      ...(g.player.money >= 60 ? [{ label: '은화 60닢을 주고 물러나게 한다', key: 'buy' }] : []),
      { label: '창병들 앞에서 겨루자고 한다', key: 'duel' },
      { label: '단을 넘겨주고 깃발만 챙긴다', key: 'give' },
    ];
  },
  resolve(g, rng, s, key) {
    const c = myCo(g);
    if (!c?.regent) return '단은 이미 내 것이다.';
    const lt = c.vets.find((v) => v.name === c.regent);
    const take = () => { c.regent = null; c.place = here(g); if (L(g).job) leaveJob(g, '용병단을 이끌려고 하던 일을 그만두었다.'); S(g).banner && (S(g).banner.holder = g.player.name); logCo(g, `${J(g.player.name, '이/가')} 깃발을 넘겨받았다.`); };
    if (key === 'take' && (!lt || lt.loyal >= 40)) { take(); if (lt) lt.loyal = lerp(lt.loyal, 5); return '깃대가 생각보다 무거웠다. 창병들이 창 자루로 땅을 세 번 굴렀다.'; }
    if (key === 'buy') { if (pay(g, 60) < 60) return '돈이 모자랐다.'; if (lt) c.vets.splice(c.vets.indexOf(lt), 1); take(); return `${J(c.regent ?? '부관', '은/는')} 은화 자루를 받아 들고 말없이 나갔다. 창병 몇이 그를 따라 나갔다.`; }
    if (key === 'duel') {
      if (check(rng, (g.player.skills.sword ?? 0) * 0.8 + stat(g, 'str') * 0.4, (lt?.skill ?? 40) + 10)) { if (lt) { c.vets.splice(c.vets.indexOf(lt), 1); } take(); deed(g, 'brave', 4, '부모의 용병단을 칼로 되찾았다더라.'); c.morale = lerp(c.morale, 6); return '목검이 아니라 진검이었다. 그의 칼이 땅에 떨어졌다. 그는 깃발에 고개를 숙이고 단을 떠났다.'; }
      g.player.injuries.push({ name: '겨루다 베인 팔', months: 2 }); stress(g, 10);
      endCompany(g, `${J(c.regent, '이/가')} 단을 가져갔다`);
      return '창병들 앞에서 졌다. 단은 그의 것이 되었다. 깃발만은 돌려받았다. 접힌 천이 부끄러웠다.';
    }
    endCompany(g, `단을 ${c.regent}에게 넘겼다`);
    return '단은 그에게 넘겼다. 깃발은 접어서 내 궤짝에 넣었다. 언젠가 내 손으로 다시 펼 것이다.';
  },
});

// 대를 이으면: 깃발은 자식에게. 어리면 부관이 맡는다.
HOOKS.heir.push((g) => {
  const s = S(g), c = s.c;
  if (s.banner) s.banner.gens += 1;
  if (!c) return;
  c.contract = null; c.foughtAt = -1;
  for (const v of c.vets) v.loyal = lerp(v.loyal, -10);
  const lt = ltOf(c);
  if (playerAge(g) < 16 || !lt) {
    if (!lt) { endCompany(g, '단장이 죽고 이끌 사람이 없어 흩어졌다'); return; }
    c.regent = lt.name;
    logCo(g, `단장이 죽었다. ${J(lt.name, '이/가')} 깃발을 맡았다.`);
    return;
  }
  c.regent = lt.loyal >= 40 ? null : lt.name;
  if (!c.regent && s.banner) s.banner.holder = g.player.name;
  logCo(g, c.regent ? `단장이 죽었다. ${J(lt.name, '이/가')} 깃발을 붙들고 내놓지 않는다.` : `${J(g.player.name, '이/가')} 깃발을 이었다.`);
});
