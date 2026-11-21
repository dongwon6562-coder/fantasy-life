// 성유물과 얽히는 일: 소문을 듣고, 도굴꾼이나 땅속에서 유물을 찾아내고, 손을 뻗어 유물이 나를 고르는지 거부하는지 본다.
// 고른 유물은 힘을 주고 대가를 지운다. 교단·마탑·왕실·드워프가 돌려 달라고 찾아오고, 검을 노리는 자가 칼을 들고 온다.
// 바치거나, 팔거나, 끝까지 쥐고 대를 넘긴다(물려받은 자식도 다시 시험받는다). 장터에는 가짜가 돈다.
// 새 행동은 뜻 있는 형편에서만 보인다: 소문을 들은 유물이 바로 이 고장에 있을 때, 유물을 쥐고 받아 줄 곳에 있을 때.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainStat, circleOf } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress, spend, canSpend } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { playerPower, POWER_BONUS } from '../adventure/combat.js';
import { deed, opinionAt } from '../repute/index.js';
import { RS, RELICS, RELIC_IDS, HOLDERS, clamp, mi, rlog, placeName, relicName, whereWord, mine, chosenMine, hear } from './state.js';
import { moveRelic } from './world.js';
import { PLACES } from '../places.js';

const here = (g) => L(g).place;
export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.bondage?.slave && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const st = (g, k) => g.player.stats[k] ?? 0;
const renown = (g, n) => { L(g).renown = Math.max(0, (L(g).renown ?? 0) + n); };
const rx = (g, id) => RS(g).r[id];
const SEATS = ['leocast', 'solaris', 'serenia', 'hammer', 'barka'];
const seatHolder = (pl) => Object.keys(HOLDERS).find((h) => HOLDERS[h].seat === pl) ?? null;

// 주인을 고르는 잣대
export function relicScore(g, id) {
  const t = RELICS[id].test, p = g.player;
  let v = 0;
  for (const [k, w] of Object.entries(t)) {
    if (p.stats[k] != null) v += p.stats[k] * w;
    else if (k === 'sword') v += (p.skills.sword ?? 0) * w;
    else if (k === 'kind') v += (opinionAt(g, here(g)).kind ?? 0) * w;
    else if (k === 'devotion') v += (g.faith?.god === 'solar' ? g.faith.devotion ?? 0 : 0) * w;
    else if (k === 'circle') v += circleOf(g) * w;
    else if (k === 'dwarf') v += p.race === 'dwarf' ? w : 0;
  }
  return Math.round(v);
}
// 지금 이 고장에 있다고 내가 아는 유물 (소문이 맞을 때만)
const trailHere = (g) => RELIC_IDS.find((id) => {
  const k = RS(g).me.known[id], x = rx(g, id);
  return k && ['lost', 'robbers'].includes(x.holder) && x.place === here(g) && k.place === here(g) && ['lost', 'robbers'].includes(k.holder);
}) ?? null;

/* ---------- 소문의 유물을 쫓는다 ---------- */
ACTIONS.push({
  id: 'relic_trail', name: '성유물의 소문을 쫓는다', icon: 'scroll',
  desc: '들은 소문 속 용사 시대의 유물이 바로 이 고장 어딘가에 있다. 땅을 뒤지거나, 도굴꾼을 찾아간다.',
  available: (g) => free(g) && !!trailHere(g) && !sceneQueued(g, 'relic_trail'),
  run(g) { queueScene(g, 'relic_trail', { id: trailHere(g) }, { first: true }); return '소문을 하나하나 짚어 가며 옛 지도와 주막 이야기를 맞춰 보았다.'; },
});
const robberPrice = (id) => ({ rl_sword: 900, rl_shield: 700, rl_book: 600, rl_ring: 800, rl_axe: 750 }[id] ?? 700);
defineScene('relic_trail', {
  title: (g, s) => relicName(s.id),
  text: (g, s) => {
    const x = rx(g, s.id), d = RELICS[s.id];
    if (x.holder === 'lost') return `${d.desc} 소문이 맞다면 ${placeName(x.place)} 어딘가에 묻혀 있다. 옛 전장의 돌무더기, 무너진 갱도, 이름 없는 무덤. 찾는 데 몇 해가 걸릴지 모른다.`;
    return `${d.desc} ${placeName(x.place)}의 도굴꾼 무리가 그것을 쥐고 있다. 그들은 값을 부를 사람을 기다린다. 교단이나 검은 새벽이 먼저 오기 전에.`;
  },
  choices: (g, s) => {
    const x = rx(g, s.id);
    if (!free(g) || here(g) !== x.place || !['lost', 'robbers'].includes(x.holder)) return [];
    if (x.holder === 'lost') return [{ label: '땅을 뒤진다', key: 'dig' }, { label: '사람을 사서 함께 뒤진다 (은화 80닢)', key: 'crew', show: canSpend(g, 80) }, { label: '그만둔다', key: 'leave' }].filter((c) => c.show !== false);
    return [
      ...(canSpend(g, robberPrice(s.id)) ? [{ label: `값을 치르고 산다 (은화 ${robberPrice(s.id)}닢)`, key: 'buy' }] : []),
      { label: '밤에 훔쳐 낸다', key: 'steal' },
      { label: '교단에 알린다', key: 'report' },
      { label: '그만둔다', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    const x = rx(g, s.id), S = RS(g);
    if (key === 'leave') return '소문은 소문으로 남겨 두었다.';
    if (here(g) !== x.place || !['lost', 'robbers'].includes(x.holder)) return '그사이 유물은 다른 손으로 넘어갔다는 말이 돌았다.';
    if (key === 'dig' || key === 'crew') {
      if (key === 'crew' && !spend(g, 80)) return '돈이 모자랐다.';
      tired(g, 18);
      if (check(rng, st(g, 'sen') + st(g, 'int') / 2 + (key === 'crew' ? 20 : 0), 85)) { take(g, s.id, 'found'); return `돌무더기 밑, 썩은 천에 싸인 것이 나왔다. 천을 걷자 ${J(RELICS[s.id].kind, '이/가')} 드러났다. 오백 년 묵은 흙이 손에서 떨어지지 않는다.`; }
      return rng.pick(['하루 종일 파서 나온 것은 녹슨 화살촉 한 줌이었다.', '갱도 끝까지 들어갔다가 무너지는 소리에 뛰어나왔다.', '이름 없는 무덤 셋을 열었다. 셋 다 비어 있었다. 누가 먼저 다녀갔다.']);
    }
    if (key === 'buy') {
      if (!spend(g, robberPrice(s.id))) return '돈이 모자랐다.';
      take(g, s.id, 'bought');
      return '도굴꾼 우두머리가 자루를 내밀었다. "이게 진짜인지는 나도 모르오. 다만 이걸 판 뒤로 꿈자리가 좋아졌다는 것만 말해 두지."';
    }
    if (key === 'steal') {
      if (check(rng, st(g, 'agi') + st(g, 'sen') / 2, 85)) { take(g, s.id, 'stolen'); deed(g, 'honest', -2, null, here(g)); return '자루를 메고 담을 넘었다. 뒤에서 개가 짖었지만 아무도 쫓아오지 않았다.'; }
      injure(g, '도굴꾼 칼에 베인 팔', 2);
      return '창고 문을 여는 순간 칼이 날아왔다. 빈손으로 달아났다.';
    }
    moveRelic(g, s.id, 'church', { news: `교단이 도굴꾼들을 덮쳐 ${J(relicName(s.id), '을/를')} 거두었다.`, big: true, heard: true });
    renown(g, 4); deed(g, 'honest', 3, `${J(g.player.name, '이/가')} 도굴꾼이 쥔 성유물을 교단에 알렸다더라`, here(g));
    return '이단심문소의 회색 망토들이 새벽에 도굴꾼 소굴을 덮쳤다. 교단은 내 이름을 기도문 끝에 넣어 주었다.';
  },
});
function take(g, id, how) {
  const S = RS(g);
  moveRelic(g, id, 'me', { place: null, text: `${relicName(id)}: 내 손에 들어왔다 (${{ found: '찾아냄', bought: '사들임', stolen: '훔쳐 냄', given: '받음' }[how] ?? how}).` });
  rx(g, id).bond = null;
  S.me.found += 1;
  hear(g, id);
  note(g, `${J(relicName(id), '을/를')} 손에 넣었다.`);
  chron(g, `${g.player.name}, ${J(relicName(id), '을/를')} 손에 넣다.`, 90);
  if (!sceneQueued(g, 'relic_choose')) queueScene(g, 'relic_choose', { id });
}

/* ---------- 유물이 주인을 고른다 ---------- */
defineScene('relic_choose', {
  title: (g, s) => relicName(s.id),
  text: (g, s) => `${RELICS[s.id].desc} ${RELICS[s.id].choose}`,
  choices: (g, s) => (rx(g, s.id)?.holder === 'me' && rx(g, s.id).bond == null && !g.over ? [{ label: '천에 싼 채 둔다', key: 'wrap' }, { label: '손을 뻗는다', key: 'reach' }] : []),
  resolve(g, rng, s, key) {
    const x = rx(g, s.id), d = RELICS[s.id], S = RS(g);
    if (x.holder !== 'me') return '유물은 이미 내 손을 떠났다.';
    if (key === 'wrap') return '손을 뻗지 않았다. 천에 싸서 궤짝 맨 밑에 넣었다. 그래도 밤이면 궤짝 쪽이 신경 쓰인다.';
    const v = relicScore(g, s.id) + rng.int(-12, 12);
    if (v >= d.need) {
      x.bond = 'chosen'; S.me.chosen += 1; renown(g, 8);
      note(g, `${J(relicName(s.id), '이/가')} 나를 주인으로 골랐다.`);
      chron(g, `${J(relicName(s.id), '이/가')} ${J(g.player.name, '을/를')} 골랐다.`, 95);
      rlog(g, `${relicName(s.id)}: 나를 골랐다.`);
      return d.yes;
    }
    x.bond = 'refused'; S.me.refused += 1;
    injure(g, { rl_sword: '성검에 덴 손바닥', rl_shield: '빠진 어깨', rl_book: '책장에 베인 손가락', rl_ring: '반지에 언 손가락', rl_axe: '끊어질 듯한 허리' }[s.id] ?? '유물에 덴 손', 2);
    stress(g, 8);
    rlog(g, `${relicName(s.id)}: 나를 거부했다.`);
    return d.no;
  },
});

// 고른 유물이 주는 힘
POWER_BONUS.push((g) => (g.relic ? chosenMine(g).reduce((a, id) => a + RELICS[id].power, 0) : 0));

/* ---------- 유물을 내놓는다 (바치거나 판다) ---------- */
ACTIONS.push({
  id: 'relic_offer', name: '성유물을 내놓는다', icon: 'crown',
  desc: '쥐고 있는 성유물을 이 고장의 교단·마탑·왕실·드워프 장로회·수집가에게 바치거나 판다.',
  available: (g) => free(g) && mine(g).length > 0 && SEATS.includes(here(g)) && !sceneQueued(g, 'relic_offer'),
  run(g) { queueScene(g, 'relic_offer', { place: here(g) }, { first: true }); return '유물을 천에 싸서 품에 넣고 문을 두드렸다.'; },
});
const offerPrice = (id, h) => Math.round(robberPrice(id) * ({ collector: 1.6, crown: 1.0, tower: 1.1, church: 0.6, dwarf: 0.8 }[h] ?? 1));
defineScene('relic_offer', {
  title: () => '성유물을 내놓는다',
  text: (g, s) => { const h = seatHolder(s.place); return `${HOLDERS[h].name}의 사람이 천을 걷고 오래 들여다보았다. ${h === 'collector' ? '상인의 눈이 번들거렸다. 값을 매기는 눈이다.' : h === 'church' ? '사제의 손이 떨렸다. 그는 먼저 무릎을 꿇었다.' : '그가 말없이 장부를 펼쳤다.'}`; },
  choices: (g, s) => {
    const h = seatHolder(s.place);
    if (!free(g) || here(g) !== s.place || !h) return [];
    const out = [];
    for (const id of mine(g)) {
      out.push({ label: `${J(relicName(id), '을/를')} 바친다`, key: `give:${id}` });
      if (h !== 'church') out.push({ label: `${J(relicName(id), '을/를')} 판다 (은화 ${offerPrice(id, h)}닢)`, key: `sell:${id}` });
    }
    out.push({ label: '도로 품에 넣는다', key: 'keep' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const h = seatHolder(s.place), S = RS(g);
    if (key === 'keep') return '천을 다시 덮었다. 아직은 내놓을 수 없다.';
    const [kind, id] = key.split(':');
    if (rx(g, id)?.holder !== 'me') return '그 유물은 이미 내 손에 없다.';
    const wasChosen = rx(g, id).bond === 'chosen';
    if (kind === 'give') {
      moveRelic(g, id, h, { news: `${J(g.player.name, '이/가')} ${J(relicName(id), '을/를')} ${HOLDERS[h].name}에 바쳤다.`, big: true, heard: true });
      S.me.given += 1; renown(g, 12);
      deed(g, 'generous', 6, `${J(g.player.name, '이/가')} 용사의 유물을 ${HOLDERS[h].name}에 바쳤다더라`, here(g));
      if (id === 'rl_book' && h === 'church' && g.realm && Number.isFinite(g.realm.seal) && !g.seal?.ending) g.realm.seal = clamp(g.realm.seal + 2, 0, 100);
      if (h === 'church' && g.faith) g.faith.devotion = clamp((g.faith.devotion ?? 0) + 6, 0, 100);
      return `${J(HOLDERS[h].name, '은/는')} 유물을 ${HOLDERS[h].where}에 모셨다. ${wasChosen ? '손이 비자 몸 한쪽이 떨어져 나간 것 같았다.' : '어깨가 가벼워졌다.'} 내 이름이 기록에 남았다.`;
    }
    const price = offerPrice(id, h);
    moveRelic(g, id, h, { news: `${J(HOLDERS[h].name, '이/가')} ${J(relicName(id), '을/를')} 사들였다는 소문이 돈다.`, heard: true });
    g.player.money += price; S.me.sold += 1;
    deed(g, 'generous', -3, h === 'collector' ? `${J(g.player.name, '이/가')} 용사의 유물을 장사꾼에게 팔아넘겼다더라` : null, here(g));
    return `은화 ${price}닢이 든 궤짝을 받았다. ${wasChosen ? '유물을 넘기는 순간 손바닥이 차갑게 식었다. 다시는 데워지지 않을 것 같다.' : '궤짝은 무거웠다. 마음은 그만큼 가볍지 않았다.'}`;
  },
});

/* ---------- 유물의 대가 (달마다) ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (!g.relic || g.over) return;
  for (const id of chosenMine(g)) {
    if (id === 'rl_ring') { if (g.player.manaAwakened) g.player.mana += (g.player.manaPotential ?? 0) * 0.1; g.player.fatigue = clamp(g.player.fatigue + 3, 0, 100); }
    if (id === 'rl_book' && g.faith) { if (g.faith.god !== 'solar') { g.faith.suspicion = clamp((g.faith.suspicion ?? 0) + 1, 0, 100); stress(g, 2); } }
    if (id === 'rl_shield') stress(g, 1);
    if (id === 'rl_axe' || id === 'rl_sword') g.player.fatigue = clamp(g.player.fatigue + 1, 0, 100);
  }
});
// 대를 이으면: 유물은 집안에 남지만, 새 주인을 다시 시험한다
HOOKS.heir.push((g) => {
  if (!g.relic) return;
  const ids = mine(g);
  for (const id of ids) rx(g, id).bond = null;
  if (ids.length) queueScene(g, 'relic_choose', { id: ids[0] });
});

/* ---------- 사건: 소문 ---------- */
const rumorable = (g) => RELIC_IDS.find((id) => {
  const x = rx(g, id), k = RS(g).me.known[id];
  if (!['lost', 'robbers'].includes(x.holder) || !x.place) return false;
  if (k && k.holder === x.holder && k.place === x.place) return false;
  return x.place === here(g) || !!PLACES_LINKS(here(g))[x.place];
}) ?? null;
const PLACES_LINKS = (pl) => PLACES[pl]?.links ?? {};
EVENTS.push({
  id: 'relic_rumor', cooldown: 30, weight: 4,
  chance: () => 0.35,
  cond: (g) => free(g) && !!rumorable(g),
  prepare: (g) => ({ id: rumorable(g) }),
  title: '주막의 이야기',
  text: (g, c) => { const x = rx(g, c.id), d = RELICS[c.id]; return `주막 구석에서 늙은 광부가 술잔을 돌리며 떠들었다. ${x.holder === 'lost' ? `${placeName(x.place)} 옛 전장 돌무더기 밑에 용사 시대의 ${J(d.kind, '이/가')} 묻혀 있다고. 할아버지의 할아버지가 봤다고.` : `${placeName(x.place)}의 도굴꾼 놈들이 얼마 전 오래된 ${J(d.kind, '을/를')} 하나 파냈는데, 그걸 판 놈이 그날 밤 웃으며 죽었다고.`}`; },
  choices: [
    { label: '흘려듣는다', run: () => '술꾼 이야기다. 잔을 비우고 일어섰다.' },
    { label: '술을 한 잔 사고 더 묻는다 (은화 2닢)', show: (g) => canSpend(g, 2), run: (g, rng, c) => { if (!spend(g, 2)) return '주머니가 비어 있었다.'; hear(g, c.id); const x = rx(g, c.id); return `광부는 한 잔을 더 받고 자리를 알려 주었다. ${placeName(x.place)}. ${x.holder === 'lost' ? '"파 볼 생각이면 겨울은 피하쇼."' : '"그놈들 값을 부르는 놈한테만 보여 준다더군."'} 소문을 쫓을 수 있다.`; } },
  ],
});

/* ---------- 사건: 가짜 ---------- */
const FAKE_TOWNS = ['harfen', 'verden', 'leocast', 'barka', 'portel', 'klein', 'eisen', 'solaris'];
EVENTS.push({
  id: 'relic_fake', cooldown: 60, weight: 3,
  chance: () => 0.3,
  cond: (g) => free(g) && FAKE_TOWNS.includes(here(g)) && RS(g).fakes > 0 && canSpend(g, 30),
  prepare: (g, rng) => ({ id: rng.pick(RELIC_IDS), price: rng.int(30, 60) }),
  title: '장터의 성유물',
  text: (g, c) => `장터 끝 천막에서 장사꾼이 목소리를 낮췄다. "${relicName(c.id)}의 조각이오. 진짜요. 교단이 알면 압수해 가니 싸게 넘기는 거요. 은화 ${c.price}닢." 비단에 싼 쇳조각이 등불에 번쩍인다.`,
  choices: [
    { label: '지나친다', run: () => '웃고 지나쳤다. 장사꾼은 다음 사람에게 똑같은 말을 했다.' },
    { label: '산다', show: (g, c) => canSpend(g, c?.price ?? 60), run: (g, rng, c) => { if (!spend(g, c.price)) return '돈이 모자랐다.'; const S = RS(g); S.me.fakes += 1; S.fakes = Math.max(0, S.fakes - 1); return '비단을 풀어 보니 쇳조각에 새긴 글자가 엉터리였다. 용사 시대의 고대 문자가 아니라 지난해 바르카 대장간의 표식이었다.'; } },
    { label: '쇳조각을 들여다본다', run: (g, rng) => { if (check(rng, st(g, 'int') + st(g, 'sen'), 80)) { deed(g, 'honest', 2, null, here(g)); return '쇳조각의 녹이 너무 고르다. 소금물에 사흘 담근 녹이다. 그렇게 말하자 장사꾼이 천막을 걷었다.'; } return '아무리 봐도 모르겠다. 진짜 같기도, 아니기도 하다. 사지 않았다.'; } },
  ],
});

/* ---------- 사건: 돌려 달라는 자들 ---------- */
const claimed = (g) => mine(g)[0] ?? null;
EVENTS.push({
  id: 'relic_claim', cooldown: 30, weight: 6,
  chance: () => 0.4,
  cond: (g) => isAdult(g) && !g.over && !L(g).travel && !isJailed(g) && !!claimed(g),
  prepare: (g) => ({ id: claimed(g) }),
  title: '돌려 달라는 사람들',
  text: (g, c) => { const h = RELICS[c.id].home; return `${HOLDERS[h].name}에서 사람이 왔다. 병사 여섯이 문 앞에 섰다. "${J(relicName(c.id), '은/는')} ${HOLDERS[h].where}에 있어야 할 물건이오. 돌려주시오. 값은 치르겠소. 거절하면, 다음엔 값 대신 다른 것을 들고 오겠소."`; },
  choices: [
    { label: '버틴다', run: (g, rng, c) => {
      if (claimed(g) !== c.id) return '그 유물은 이미 내 손에 없다.';
      if (check(rng, playerPower(g) + (L(g).renown ?? 0) / 2, 90)) { renown(g, 3); return '문 앞에 서서 고개를 저었다. 그들은 칼자루를 쥐었다 놓고 돌아갔다. 오래 가지는 않을 것이다.'; }
      moveRelic(g, c.id, RELICS[c.id].home, { news: `${J(HOLDERS[RELICS[c.id].home].name, '이/가')} ${J(relicName(c.id), '을/를')} 되찾아 갔다.`, big: true, heard: true });
      injure(g, '유물을 지키다 맞은 머리', 2);
      return '그날 밤 그들이 다시 왔다. 문이 부서지고, 궤짝이 열렸다. 깨어났을 때 유물은 없었다.';
    } },
    { label: '값을 받고 돌려준다', run: (g, rng, c) => {
      if (claimed(g) !== c.id) return '그 유물은 이미 내 손에 없다.';
      const h = RELICS[c.id].home, price = Math.round(offerPrice(c.id, h) * 0.7);
      moveRelic(g, c.id, h, { news: `${J(relicName(c.id), '이/가')} ${HOLDERS[h].where}로 돌아갔다.`, heard: true });
      g.player.money += price; RS(g).me.sold += 1;
      return `은화 ${price}닢을 받고 유물을 넘겼다. 그들은 고맙다는 말 대신 영수증을 남겼다.`;
    } },
  ],
});

/* ---------- 사건: 성검을 노리는 자 ---------- */
EVENTS.push({
  id: 'relic_challenge', cooldown: 24, weight: 6,
  chance: () => 0.4,
  cond: (g) => free(g) && chosenMine(g).some((id) => id === 'rl_sword' || id === 'rl_axe'),
  prepare: (g) => ({ id: chosenMine(g).find((id) => id === 'rl_sword' || id === 'rl_axe'), foe: 70 + g.date.year % 30 }),
  title: '칼을 든 손님',
  text: (g, c) => `길 한가운데 사내가 섰다. 칼끝이 내 허리의 ${J(RELICS[c.id].kind, '을/를')} 가리킨다. "그건 네가 가질 물건이 아니다. 걸고 겨루자."`,
  choices: [
    { label: '못 들은 척 지나간다', run: (g) => { deed(g, 'brave', -2, null, here(g)); return '등 뒤에서 비웃음이 들렸다. 유물이 손바닥 아래에서 차갑게 식었다.'; } },
    { label: '겨룬다', run: (g, rng, c) => {
      if (!chosenMine(g).includes(c.id)) return '그 유물은 이미 내 손에 없다.';
      tired(g, 15);
      if (check(rng, playerPower(g), c.foe)) { renown(g, 5); deed(g, 'brave', 4, null, here(g)); gainStat(g, 'str', 0.6); return '세 합 만에 사내의 칼이 부러졌다. 그는 무릎을 꿇고 물러났다. 구경꾼들이 내 이름을 수군거렸다.'; }
      injure(g, '겨루다 깊이 베인 어깨', 3);
      if (rng.chance(0.4)) { moveRelic(g, c.id, 'robbers', { place: here(g), news: `${J(relicName(c.id), '이/가')} 길 위의 결투 끝에 주인을 잃었다.`, heard: true }); return '쓰러진 사이 사내가 유물을 들고 사라졌다.'; }
      return '쓰러졌다. 사내는 유물에 손을 뻗었다가 손바닥을 데고 물러났다. 유물이 나를 지켰다.';
    } },
  ],
});
export { take };
