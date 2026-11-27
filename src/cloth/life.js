// 옷감의 삶: 물레, 베틀, 염색 집, 옷감 팔기, 옷 지어 입기, 상복과 혼례 옷, 사치 금령.
import { ACTIONS } from '../actions.js';
import { me } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, tired, stress, check, gains, up } from '../adventure/core.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import {
  C, here, free, age, mi, clamp, placeName, noble, logCloth, addBolt, takeBolt, boltValue, boltName, boltCount, yarnCount, fashionDye,
  FIBERS, FIBER_IDS, DYES, DYE_IDS, DYE_TOWNS, TAILOR_TOWNS, SUMPTUARY, PLACE_MUL, FASHIONS,
} from './core.js';
import { opener } from '../narrative/openers.js';

export const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
// 바느질 솜씨: 손재주(민첩)가 좋을수록 빨리 는다. 높아질수록 더디다.
export function gainHand(g, base) {
  const s = C(g);
  const v = 0.9 * base * (0.7 + (g.player.stats.agi ?? 0) / 100) * (1 - s.hand / 115);
  s.hand = clamp(s.hand + v, 0, 100);
  return v;
}
const handUp = (v) => up('솜씨', v);
const settled = (g) => ['family', 'own', 'rent'].includes(L(g).home);

/* ---------- 물레를 돌린다 ---------- */
// 가난한 집, 부모님 집, 베틀이 있는 집, 재봉사에게만 보인다
export const canSpin = (g) => free(g) && age(g) >= 8 && !['street', 'barracks'].includes(L(g).home) && (L(g).home === 'family' || g.player.money < 40 || C(g).loom || C(g).hand >= 10);
ACTIONS.push({
  id: 'cloth_spin', name: '물레를 돌린다', icon: 'coin',
  desc: '삼이나 양털, 명주 고치로 실을 잣는다. 실은 베틀에 걸거나 직조공에게 판다.',
  available: (g) => canSpin(g) && !g.player.title,
  run(g, rng) {
    const s = C(g), pl = here(g);
    let f = 'linen';
    if (FIBERS.silk.spin.includes(pl) && g.player.money >= 6 && s.hand >= 20) f = 'silk';
    else if (FIBERS.wool.spin.includes(pl)) f = 'wool';
    const cost = f === 'silk' ? pay(g, 6) : 0;
    const n = 1 + (s.hand >= 40 ? 1 : 0) + (rng.chance(0.3) ? 1 : 0);
    const v = gainHand(g, age(g) < 14 ? 0.6 : 0.8);
    tired(g, 8);
    const F = FIBERS[f];
    if (!s.firstAt) s.firstAt = mi(g);
    if (s.loom) {
      s.yarn[f] += n;
      return `${F.line} ${F.yarn} ${n}타래를 감았다.${cost ? ` 고치 값으로 은화 ${cost}닢이 들었다.` : ''}${gains([handUp(v)])}`;
    }
    const coins = Math.max(1, Math.round(n * (f === 'silk' ? 4 : f === 'wool' ? 1.5 : 1)));
    g.player.money += coins; s.earned += coins;
    return `${F.line} ${F.yarn} ${n}타래를 이웃 직조공에게 넘기고 은화 ${coins}닢을 받았다.${cost ? ` 고치 값 ${cost}닢을 빼면 남는 것이 적다.` : ''}${gains([handUp(v)])}`;
  },
});

/* ---------- 베틀을 들인다 ---------- */
ACTIONS.push({
  id: 'cloth_loom', name: '베틀을 들인다', icon: 'home',
  desc: '은화 30닢. 실을 직접 천으로 짤 수 있다. 베틀 하나면 집안 여자들이 대대로 먹고산다는 말이 있다.',
  available: (g) => free(g) && !C(g).loom && age(g) >= 12 && C(g).hand >= 6 && g.player.money >= 30 && settled(g),
  run(g) {
    const s = C(g); pay(g, 30); s.loom = true;
    logCloth(g, '베틀을 들였다.');
    return '목수가 베틀을 지고 왔다. 날실을 거는 데만 하루가 걸렸다. 북을 처음 던져 보니 실이 엉켜 웃음이 났다.';
  },
});

/* ---------- 베를 짠다 ---------- */
ACTIONS.push({
  id: 'cloth_weave', name: '베를 짠다', icon: 'coin',
  desc: '베틀에 앉아 실 세 타래로 옷감 한 필을 짠다. 솜씨가 좋으면 더 고르고 빠르다.',
  available: (g) => free(g) && C(g).loom && FIBER_IDS.some((f) => C(g).yarn[f] >= 3) && settled(g),
  run(g, rng) {
    const s = C(g);
    const f = ['silk', 'wool', 'linen'].find((x) => s.yarn[x] >= 3);
    const n = Math.min(Math.floor(s.yarn[f] / 3), 1 + (s.hand >= 55 ? 1 : 0));
    s.yarn[f] -= n * 3;
    addBolt(g, f, null, n);
    s.made += n;
    tired(g, 12);
    const v = gainHand(g, 1.1);
    const lines = ['북이 날실 사이를 오갈 때마다 바디가 탁, 탁 울린다.', '해가 질 때까지 발판을 밟았다. 허리가 굳었다.', '한 뼘 짤 때마다 손으로 쓸어 본다. 고르게 짜였다.', '실이 끊겨 다시 잇고, 또 끊겨 다시 이었다.'];
    return `${rng.pick(lines)} ${FIBERS[f].name} ${n}필을 짜서 베틀에서 내렸다.${gains([handUp(v)])}`;
  },
});

/* ---------- 옷감을 물들인다 ---------- */
ACTIONS.push({
  id: 'cloth_dye', name: '옷감을 물들인다', icon: 'coin',
  desc: '염색 집에서 흰 옷감에 빛깔을 입힌다. 풀 염료는 싸고, 조개와 광물 염료는 비싸다.',
  available: (g) => free(g) && DYE_TOWNS.includes(here(g)) && C(g).bolts.some((b) => !b.dye),
  run(g, rng) {
    if (!sceneQueued(g, 'cloth_dye')) queueScene(g, 'cloth_dye', {}, { first: true });
    return opener(g, 'cloth_dye', rng);
  },
});
const dyesHere = (g) => DYE_IDS.filter((d) => !DYES[d].where || DYES[d].where.includes(here(g)));
defineScene('cloth_dye', {
  need: (g) => DYE_TOWNS.includes(here(g)) && C(g).bolts.some((b) => !b.dye),
  title: () => '염색 집',
  text: (g) => {
    const raw = C(g).bolts.filter((b) => !b.dye).map((b) => `${FIBERS[b.f].name} ${b.n}필`).join(', ');
    const fd = fashionDye(g);
    return `물들일 옷감은 ${raw}. 마당에 늘어선 통마다 빛깔이 다르다. 손이 쪽빛으로 물든 염색공이 말한다. "요즘 잘 나가는 건 ${DYES[fd]?.name ?? '쪽빛'}이오."${dyesHere(g).includes('murex') ? ' 구석의 작은 항아리에서 썩은 조개 냄새가 난다. 뿔고둥 즙이다.' : ''}`;
  },
  choices: (g) => {
    const n = C(g).bolts.filter((b) => !b.dye).reduce((a, b) => a + b.n, 0);
    const out = dyesHere(g).filter((d) => g.player.money >= DYES[d].cost * n).map((d) => ({ label: `${DYES[d].name} (${DYES[d].src}, 은화 ${DYES[d].cost * n}닢)`, key: d }));
    out.push({ label: '물들이지 않는다', key: 'no' });
    return out.slice(-8);
  },
  resolve(g, rng, s0, key) {
    const s = C(g);
    if (key === 'no') return '흰 옷감을 그대로 안고 나왔다.';
    const D = DYES[key];
    const raw = s.bolts.filter((b) => !b.dye);
    const n = raw.reduce((a, b) => a + b.n, 0);
    if (!n) return '물들일 옷감이 없었다.';
    const cost = pay(g, D.cost * n);
    for (const b of raw) { addBolt(g, b.f, key, b.n); takeBolt(g, b, b.n); }
    let tail = '';
    if (D.harm) {
      s.harm += 1;
      if (s.harm >= 3 && !g.player.injuries.some((x) => x.name === '진사 독에 떨리는 손')) { g.player.injuries.push({ name: '진사 독에 떨리는 손', months: 6 }); tail = ' 요즘 손끝이 떨린다. 늙은 염색공들은 다 그렇게 된다고 했다.'; }
    }
    if (D.royal) logCloth(g, `옷감 ${n}필을 자줏빛으로 물들였다.`);
    const how = { 풀: '통에 담갔다 건지기를 몇 번 하니 빛깔이 짙어졌다.', 광물: '쇳물과 가루를 푼 통에서 손이 따끔거렸다.', 조개: '뿔고둥 즙은 처음엔 누런 녹색이다. 볕에 널자 천천히 자줏빛으로 변했다.' }[D.kind];
    return `${J(D.src, '으로/로')} 옷감 ${n}필을 ${J(D.name, '으로/로')} 물들였다. ${how} 은화 ${cost}닢.${tail}`;
  },
});

/* ---------- 옷감을 판다 ---------- */
export const canSellCloth = (g) => free(g) && boltCount(g) > 0 && !!PLACE_MUL[here(g)];
ACTIONS.push({
  id: 'cloth_sell', name: '옷감을 판다', icon: 'coin',
  desc: '짠 옷감을 포목점에 넘긴다. 왕도와 제도에서 값을 더 쳐주고, 유행하는 빛깔은 더 비싸다.',
  available: canSellCloth,
  run(g) {
    const s = C(g), pl = here(g);
    const v = s.bolts.reduce((a, b) => a + boltValue(g, b, pl), 0);
    const n = boltCount(g);
    const hot = s.bolts.some((b) => b.dye && b.dye === fashionDye(g));
    s.bolts = []; g.player.money += v; s.earned += v; s.sold += n;
    return `${placeName(pl)} 포목점 주인이 옷감 ${n}필을 한 필씩 펴서 볕에 비춰 보았다. 은화 ${v}닢.${hot ? ' 유행하는 빛깔이라 흥정도 없이 받았다.' : ''}`;
  },
});

/* ---------- 옷을 지어 입는다 ---------- */
ACTIONS.push({
  id: 'cloth_wear', name: '옷을 지어 입는다', icon: 'home',
  desc: '가진 옷감으로 내 옷을 짓는다. 솜씨가 모자라면 재봉사에게 삯을 준다. 지어 입은 옷은 남들 눈에 보인다.',
  available: (g) => free(g) && age(g) >= 14 && C(g).bolts.some((b) => b.dye) && (C(g).hand >= 25 || (TAILOR_TOWNS.includes(here(g)) && g.player.money >= 10)) && C(g).wear?.kind !== 'mourn',
  run(g) {
    if (!sceneQueued(g, 'cloth_wear')) queueScene(g, 'cloth_wear', {}, { first: true });
    return '옷감을 펴 놓고 몸에 대 보았다.';
  },
});
defineScene('cloth_wear', {
  need: (g) => C(g).bolts.some((b) => b.dye),
  title: () => '새 옷',
  text: (g) => {
    const s = C(g), F = FASHIONS[s.fashion.id];
    const who = s.hand >= 25 ? '내 손으로 지을 수 있다.' : '내 솜씨로는 모자라 재봉사에게 은화 10닢을 주고 맡겨야 한다.';
    return `요즘 사람들이 입는 것은 ${F.name}. ${who} 어떤 옷감으로 지을까.`;
  },
  choices: (g) => {
    const out = C(g).bolts.filter((b) => b.dye).slice(0, 6).map((b) => ({ label: `${J(boltName(b), '으로/로')} 짓는다`, key: `b:${b.f}:${b.dye}` }));
    out.push({ label: '그만둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s0, key) {
    const s = C(g);
    if (key === 'no') return '옷감을 다시 궤에 넣었다.';
    const [, f, dye] = key.split(':');
    const b = s.bolts.find((x) => x.f === f && x.dye === dye);
    if (!b) return '그 옷감은 그 사이 다른 데 썼다.';
    let paid = 0;
    if (s.hand < 25) { paid = pay(g, 10); if (!paid) return '재봉사 삯이 모자랐다.'; } else gainHand(g, 0.6);
    takeBolt(g, b, 1);
    s.wear = { dye, f, kind: 'fine', until: 0, since: mi(g), col: DYES[dye].col };
    const D = DYES[dye];
    note(g, `${D.name} ${J(FIBERS[f].name, '으로/로')} 옷을 지어 입었다.`);
    let tail = '';
    if (D.royal && !noble(g)) tail = ' 자줏빛은 귀족만 입는 빛깔이다. 왕도 같은 곳에서는 입고 다니다 붙잡힐 수도 있다.';
    else if (dye === fashionDye(g)) tail = ' 마침 유행하는 빛깔이라 지나가는 사람들이 한 번씩 돌아본다.';
    return `${paid ? `재봉사에게 은화 ${paid}닢을 주고 ` : ''}${D.name} ${FIBERS[f].name} 옷을 지었다. 새 옷 냄새가 났다.${tail}`;
  },
});

/* ---------- 사치 금령: 자줏빛을 입은 평민 ---------- */
defineScene('cloth_law', {
  need: (g) => C(g).wear?.dye === 'murex' && C(g).wear.kind === 'fine' && SUMPTUARY.includes(here(g)) && !noble(g),
  title: () => '사치 금령',
  text: (g) => `${placeName(here(g))} 거리에서 경비대 조장이 앞을 막았다. "그 자줏빛, 어느 댁 어른이시오?" 금령에 따르면 귀족이 아닌 자가 자줏빛을 두르면 옷을 벗기고 벌금을 물린다. 사람들이 걸음을 멈추고 구경한다.`,
  choices: (g) => {
    const out = [{ label: '순순히 벌금을 낸다', key: 'fine' }, { label: '그 자리에서 겉옷을 벗어 넘긴다', key: 'strip' }];
    if (g.player.money >= 15) out.push({ label: '조장의 손에 은화를 쥐여 준다', key: 'bribe' });
    out.push({ label: '어느 귀족 댁 사람이라고 둘러댄다', key: 'lie' });
    return out;
  },
  resolve(g, rng, s0, key) {
    const s = C(g), pl = here(g);
    if (key === 'fine') { const n = pay(g, 30); if (!n) { s.wear = null; return '낼 돈이 없었다. 조장은 그 자리에서 자줏빛 옷을 벗겨 갔다. 장부에는 다음에 또 걸리면 매를 친다고 적혔다.'; } return `벌금 은화 ${n}닢을 냈다. 조장은 옷소매를 잡아 자줏빛 띠를 칼로 뜯어 갔다.`; }
    if (key === 'strip') { s.wear = null; stress(g, 6); return '겉옷을 벗어 넘겼다. 속옷 바람으로 집까지 걸었다. 뒤에서 아이들이 따라오며 웃었다.'; }
    if (key === 'bribe') { pay(g, 15); deed(g, 'honest', -1, '금령을 어기고 경비에게 뒷돈을 주었다', pl); return '은화가 손에서 손으로 건너갔다. 조장은 아무것도 못 본 얼굴로 돌아섰다.'; }
    if (check(rng, (g.player.stats.cha ?? 0) * 0.7, 38)) { deed(g, 'honest', -1, '귀족 댁 사람이라고 둘러댔다', pl); return '아무 귀족 이름이나 댔다. 조장이 잠깐 머뭇거리더니 길을 비켰다. 등줄기에 땀이 흘렀다.'; }
    reportCrime(g, 'fraud', pl, { mult: 0.5 }); s.wear = null;
    return '조장이 그 댁에 사람을 보내 보자고 했다. 거짓말은 반나절 만에 들통났다. 옷은 빼앗기고 이름이 장부에 올랐다.';
  },
});

/* ---------- 상복 ---------- */
const MOURN_FOR = { father: '아버지', mother: '어머니', spouse: '배우자', child: '자식' };
defineScene('cloth_mourn', {
  need: (g) => !g.over,
  title: () => '상복',
  text: (g, s) => {
    const D = C(g).bolts.find((b) => b.dye === 'gall');
    return `${J(s.name, '이/가')} 세상을 떠났다. 이 땅에서는 가까운 사람을 잃으면 한 해 동안 검은 옷을 입는다. 상가에 모인 이웃들이 내 옷차림을 본다.${D ? ' 궤에는 검게 물들인 옷감이 있다.' : ''}`;
  },
  choices: (g) => {
    const out = [];
    if (C(g).bolts.some((b) => b.dye === 'gall')) out.push({ label: '궤의 검은 옷감으로 상복을 짓는다', key: 'own' });
    if (g.player.money >= 8) out.push({ label: '검은 상복을 사서 입는다 (은화 8닢)', key: 'buy' });
    out.push({ label: '헌 옷 팔에 검은 띠만 두른다', key: 'band' });
    out.push({ label: '상복 없이 지낸다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const c = C(g), pl = here(g);
    const until = mi(g) + 12;
    if (key === 'none') { deed(g, 'loyal', -1, `${s.name}의 상중에 상복을 입지 않았다`, pl); return '평소 옷 그대로 상가에 섰다. 노인들의 눈길이 따가웠다. 슬픔은 옷으로 하는 게 아니라고 속으로 되뇌었다.'; }
    if (key === 'own') { const b = c.bolts.find((x) => x.dye === 'gall'); if (b) takeBolt(g, b, 1); }
    if (key === 'buy') pay(g, 8);
    c.wear = { dye: 'gall', col: DYES.gall.col, kind: key === 'band' ? 'band' : 'mourn', until, for: s.name, prev: c.wear?.kind === 'fine' ? c.wear : c.wear?.prev ?? null };
    stress(g, -2);
    if (key === 'band') return `팔에 검은 띠를 둘렀다. 형편이 넉넉하지 않은 집은 다들 그렇게 한다. ${J(s.name, '이/가')} 좋아하던 옷은 궤 맨 아래에 넣었다.`;
    return `검은 상복을 입었다. 한 해 동안 잔치에도 장터에도 이 옷을 입고 나간다. 상복 소매를 볼 때마다 ${J(s.name, '이/가')} 생각난다.`;
  },
});

/* ---------- 혼례 옷 ---------- */
defineScene('cloth_wed', {
  need: (g) => !g.over && !!me(g).spouseId,
  title: () => '혼례 옷',
  text: (g, s) => `${J(s.name, '과/와')} 혼인했다. 이 땅에서는 혼인하고 한 달 동안 혼례 옷을 입은 채 두 집안 어른들께 인사를 다닌다. 집안 궤에는 어머니가 입었던 혼례 옷이 접혀 있다.`,
  choices: (g) => {
    const out = [{ label: '어머니의 혼례 옷을 고쳐 입는다', key: 'old' }];
    const red = C(g).bolts.find((b) => b.dye === 'madder' || b.dye === 'murex' || b.dye === 'cinnabar');
    if (red) out.push({ label: `궤의 ${J(boltName(red), '으로/로')} 새로 짓는다`, key: 'bolt' });
    if (g.player.money >= 25) out.push({ label: '재봉사에게 새로 맞춘다 (은화 25닢)', key: 'buy' });
    out.push({ label: '평소 옷 그대로 다닌다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'none') return '평소 옷 그대로 인사를 다녔다. 사돈댁 어른이 혀를 차는 소리가 들린 것 같았다.';
    let dye = 'madder';
    if (key === 'bolt') { const b = c.bolts.find((x) => x.dye === 'madder' || x.dye === 'murex' || x.dye === 'cinnabar'); if (b) { dye = b.dye; takeBolt(g, b, 1); } }
    if (key === 'buy') pay(g, 25);
    c.wear = { dye, col: DYES[dye].col, kind: 'bridal', until: mi(g) + 2, for: s.name, prev: c.wear?.kind === 'fine' ? c.wear : null };
    stress(g, -3);
    if (key === 'old') return '어머니의 혼례 옷은 소매가 짧고 깃이 낡았지만 바느질은 단단했다. 단을 내리고 깃을 새로 달았다. 이웃 할머니가 어머니 시집오던 날 얘기를 해 주었다.';
    return `붉은 혼례 옷을 입고 두 집안을 돌았다. 가는 곳마다 어른들이 옷자락을 만져 보았다. ${J(s.name, '이/가')} 소매 끝을 잡고 따라왔다.`;
  },
});

/* ---------- 달이 넘어갈 때 (나의 옷) ---------- */
const close = (g) => {
  const p = me(g), out = [];
  if (p.fatherId) out.push([p.fatherId, 'father']);
  if (p.motherId) out.push([p.motherId, 'mother']);
  if (p.spouseId) out.push([p.spouseId, 'spouse']);
  for (const id of p.childIds ?? []) out.push([id, 'child']);
  return out;
};
export function clothMonth(g, rng) {
  const c = C(g);
  if (!g.people || !me(g)) return;
  // 상복과 혼례 옷은 때가 지나면 벗는다
  if (c.wear && c.wear.until && mi(g) >= c.wear.until) { c.wear = c.wear.prev ?? null; }
  if (c.wear?.kind === 'fine' && mi(g) - (c.wear.since ?? 0) > 120) { c.wear = null; logCloth(g, '아끼던 옷이 해져 걸레가 되었다.'); }
  // 가까운 식구가 세상을 떠났나
  const prev = new Set(c.close ?? []);
  const now = close(g);
  for (const [id, rel] of now) {
    const p = g.people.find((x) => x.id === id);
    if (p && !p.alive && prev.has(id) && !sceneQueued(g, 'cloth_mourn')) { queueScene(g, 'cloth_mourn', { name: p.name, rel: MOURN_FOR[rel] }); break; }
  }
  // 배우자를 잃으면 spouseId가 지워진다: 지난달 배우자가 지금 죽었는지 따로 본다
  if (c.spouse && c.spouse !== me(g).spouseId) {
    const sp = g.people.find((x) => x.id === c.spouse);
    if (sp && !sp.alive && !sceneQueued(g, 'cloth_mourn')) queueScene(g, 'cloth_mourn', { name: sp.name, rel: '배우자' });
  }
  // 새로 혼인했나
  const sid = me(g).spouseId;
  if (sid && sid !== c.spouse && c.spouse !== undefined) {
    const sp = g.people.find((x) => x.id === sid);
    if (sp && sp.alive && !sceneQueued(g, 'cloth_wed') && c.wear?.kind !== 'mourn') queueScene(g, 'cloth_wed', { name: sp.name });
  }
  c.spouse = sid ?? null;
  c.close = now.map(([id]) => id).filter((id) => g.people.find((x) => x.id === id)?.alive);
  // 자줏빛을 입고 금령이 있는 곳을 다니면 붙잡힌다
  if (c.wear?.dye === 'murex' && c.wear.kind === 'fine' && SUMPTUARY.includes(here(g)) && !noble(g) && rng.chance(0.35) && !sceneQueued(g, 'cloth_law')) queueScene(g, 'cloth_law', {});
  // 진사 독은 조금씩 빠진다
  if (c.harm > 0 && rng.chance(0.08)) c.harm -= 1;
}
