// 마도구 장인의 삶: 공방 일 거들기(af_learn), 마석 다듬기(af_cut)·팔기(af_sell), 마도구 새기기(af_make → af_pick → af_done, 터지면 af_blast),
// 의뢰 받기(af_order → af_offer), 내 공방 열기(af_shop), 제자 들이기(af_pupil → af_pupils), 도둑맞은 마도구 찾기(af_seek → af_chase).
// 서클이 낮아도 마석 다듬기와 1서클 새기기로 먹고살 수 있다. 높은 서클 주문을 새길수록 마석이 많이 들고 잘 터진다.
import { ACTIONS } from '../actions.js';
import { circleOf } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress } from '../adventure/core.js';
import { runFight } from '../adventure/fight.js';
import { atWar } from '../world.js';
import { deed } from '../repute/index.js';
import { NAMES } from '../realms/data.js';
import { spellById } from '../magic/spells.js';
import { J } from '../narrative/text.js';
import {
  AS, BASES, SLOT_NAME, FAMOUS_NAMES, mi, clamp, here, placeName, free, adult, workshopAt, stoneCost, stoneSell, priceMul, tideOf,
  fitSpells, canEngrave, rankOf, logA, artUp,
} from './core.js';

const shopHere = (g) => AS(g).shop?.place === here(g);
const atBench = (g) => !!workshopAt(here(g)) || shopHere(g);
const magic = (g) => g.player.skills.magic ?? 0;
const pupilsHere = (g) => (shopHere(g) ? AS(g).shop.pupils.length : 0);
const gradeOf = (q) => (q >= 85 ? 5 : q >= 68 ? 4 : q >= 48 ? 3 : q >= 28 ? 2 : 1);
export const GRADE_WORDS = ['', '거친 솜씨', '쓸 만한 물건', '좋은 물건', '뛰어난 물건', '대를 넘길 물건'];
const itemName = (spName, baseName) => `${J(spName, '을/를')} 새긴 ${baseName}`;
const stonesFor = (circle) => circle;
export const itemValue = (g, base, circle, q) => Math.max(4, Math.round(((BASES[base]?.cost ?? 12) + circle * circle * 12) * (0.6 + q / 100) * priceMul(g)));
const gearValue = (circle, q) => Math.round(4 + circle * 1.6 + q / 25);
export const blastChance = (g, circle) => Math.max(0.01, 0.02 + (circle - 1) * 0.025 + (tideOf(g) > 40 ? 0.03 : 0) - AS(g).art / 2500);
const strip = (s) => { const o = { ...s }; delete o.kind; delete o.at; delete o.t; return o; };

/* ---------- 공방 일 거들기: 서클이 없어도 할 수 있는 일 ---------- */
const LEARN_LINES = [
  '하루 종일 마석 가루를 쓸고 숫돌을 갈았다. 장인은 내 손이 아니라 내 눈을 보며 일을 시켰다.',
  '은실을 마석 홈에 눌러 넣는 일을 거들었다. 한 가닥이 삐져나오자 장인이 말없이 다시 뽑았다.',
  '깨진 마석을 골라내는 일을 맡았다. 금이 간 것은 빛을 비추면 속에서 실금이 반짝였다.',
  '귀족 집에 보낼 부적 서른 개를 닦고 상자에 담았다. 상자 하나 값이 내 한 달 품삯보다 비쌌다.',
  '장인이 술식을 새기는 동안 옆에서 마석이 데지 않게 물을 끼얹었다. 손바닥이 불그스름해졌다.',
  '도면을 베꼈다. 장인이 한 줄을 가리키며 "여기를 틀리면 손가락이 날아간다"고 했다.',
];
ACTIONS.push({
  id: 'af_learn', name: '마석 공방 일 거들기', icon: 'hammer',
  desc: '마석 공방에서 품을 판다. 마력이 없어도 마석을 닦고 고르는 일은 있다. 솜씨가 오르면 품삯도 오른다.',
  available: (g) => adult(g) && free(g) && !!workshopAt(here(g)) && !shopHere(g) && AS(g).art < 60 && (!!g.player.manaAwakened || AS(g).art > 0 || AS(g).famArt > 0 || (g.player.stats.sen ?? 0) >= 55),
  run(g, rng) {
    const A = AS(g);
    tired(g, 10);
    const first = A.learnAt < 0;
    A.learnAt = mi(g);
    artUp(g, 1.6 + (g.player.stats.sen ?? 40) / 80);
    const pay = Math.round((2 + A.art / 10) * workshopAt(here(g)));
    g.player.money += pay;
    const t = first
      ? `${placeName(here(g))} 마석 공방 문을 두드렸다. 앞치마에 은가루가 묻은 장인이 내 손을 뒤집어 보고는 빗자루를 건넸다. "처음엔 다들 쓸고 닦는다."`
      : rng.pick(LEARN_LINES);
    return `${t} 품삯 은화 ${pay}닢.`;
  },
});

/* ---------- 마석 다듬기·팔기 ---------- */
ACTIONS.push({
  id: 'af_cut', name: '마석 다듬기', icon: 'crystal',
  desc: '캐낸 그대로의 마석을 사서 결을 따라 깎고 갈아 술식을 새길 수 있게 만든다. 마나가 짙은 해에는 마석이 싸다.',
  available: (g) => adult(g) && free(g) && atBench(g) && AS(g).art >= 5,
  run(g, rng) {
    const A = AS(g), cost = stoneCost(g);
    if (g.player.money < cost * 2) return `날 마석 두 덩이 값 은화 ${cost * 2}닢이 없었다.`;
    g.player.money -= cost * 2;
    tired(g, 10);
    artUp(g, 1.2);
    A.cut += 1;
    let got = 0;
    for (let i = 0; i < 2 + pupilsHere(g); i++) if (rng.chance(0.5 + A.art / 160)) got++;
    A.stones += got;
    if (!got) return `날 마석 두 덩이를 샀다(은화 ${cost * 2}닢). 첫 덩이는 결을 잘못 읽어 반으로 쪼개졌고, 둘째는 속에 빈 굴이 있었다. 오늘은 가루만 남았다.`;
    return `날 마석을 사서(은화 ${cost * 2}닢) 결을 따라 깎았다. ${got}개가 맑게 다듬어졌다.${pupilsHere(g) ? ' 제자들도 옆에서 하나씩 갈았다.' : ''} 가진 마석 ${A.stones}개.`;
  },
});
ACTIONS.push({
  id: 'af_sell', name: '다듬은 마석 팔기', icon: 'coin',
  desc: '다듬은 마석을 공방 거리에 판다. 값은 마나의 흐름과 고장에 따라 다르다.',
  available: (g) => adult(g) && free(g) && atBench(g) && AS(g).stones >= 2,
  run(g) {
    const A = AS(g), n = A.stones - (A.job ? 0 : 0), p = stoneSell(g);
    A.stones = 0;
    g.player.money += n * p;
    return `다듬은 마석 ${n}개를 마석상에 넘겼다. 하나에 은화 ${p}닢, 모두 ${n * p}닢. ${p >= 9 ? '마석이 귀한 철이라 값을 잘 쳐 주었다.' : '마석이 흔한 철이라 값이 박했다.'}`;
  },
});

/* ---------- 마도구 새기기 ---------- */
function picks(g) {
  const out = [];
  const gear = L(g).gear ?? {};
  if ((gear.weapon ?? 0) > 0 && gear.weaponName) {
    const sp = fitSpells(g, 'blade')[0];
    if (sp) out.push({ base: 'own', sp, label: `지금 쓰는 무기에 '${sp.name}' (${sp.circle}서클)` });
  }
  for (const [id, b] of Object.entries(BASES)) {
    const sp = fitSpells(g, id)[0];
    if (sp) out.push({ base: id, sp, label: `${b.name}에 '${sp.name}' (${sp.circle}서클)` });
  }
  return out.sort((a, b) => b.sp.circle - a.sp.circle).slice(0, 7);
}
const startCost = (g, base, sp) => {
  const A = AS(g), need = stonesFor(sp.circle), lack = Math.max(0, need - A.stones);
  return { need, lack, money: (base === 'own' ? 0 : BASES[base].cost) + Math.ceil(lack * stoneCost(g) * 1.5) };
};
ACTIONS.push({
  id: 'af_make', name: '마도구 새기기', icon: 'rune',
  desc: '다듬은 마석을 박고 아는 주문을 술식으로 새겨 마도구를 만든다. 서클 높은 주문일수록 마석이 많이 들고 잘 터진다.',
  available: (g) => adult(g) && free(g) && atBench(g) && canEngrave(g) && !sceneQueued(g, 'af_pick') && !sceneQueued(g, 'af_done') && !sceneQueued(g, 'af_blast') && (!!AS(g).job || picks(g).length > 0),
  run(g, rng) {
    const A = AS(g);
    if (!A.job) {
      queueScene(g, 'af_pick');
      return '작업대에 마석과 은실, 술식 도면을 늘어놓고 무엇을 새길지 생각했다.';
    }
    const j = A.job;
    tired(g, 12);
    artUp(g, 1 + j.circle * 0.3);
    if (rng.chance(blastChance(g, j.circle))) {
      queueScene(g, 'af_blast', { name: j.name, circle: j.circle }, { first: true });
      return `${j.name}의 술식 마지막 고리를 잇는 순간, 마석 안의 빛이 고르게 돌지 않고 한쪽으로 몰렸다. 작업대가 떨리기 시작했다.`;
    }
    if (rng.chance(0.08 * (1 - A.art / 100))) { j.prog = Math.max(0, j.prog - 0.15); return `${j.name}의 술식 한 줄이 어긋났다. 은실을 뽑고 홈을 다시 갈아야 했다.`; }
    j.prog += (0.45 + A.art / 120 + magic(g) / 300 + pupilsHere(g) * 0.08) * rng.float(0.7, 1.2) / (BASES[j.base]?.work ?? 1) / (1 + j.circle * 0.25) / (j.count ?? 1);
    if (j.prog < 1) return `${j.name}에 술식을 새겼다. ${j.prog < 0.5 ? '아직 마석이 술식을 다 먹지 못했다.' : '마석 안에서 빛이 고르게 돌기 시작했다.'}${j.client ? ` (${j.client} 의뢰, 기한까지 ${Math.max(0, j.due - mi(g))}달)` : ''}`;
    return finish(g, rng);
  },
});
function finish(g, rng) {
  const A = AS(g), j = A.job;
  A.job = null; A.made += j.count ?? 1;
  const q = clamp(Math.round(A.art * 0.55 + magic(g) * 0.3 + rng.float(-12, 15)), 5, 100);
  if (g.tower?.member) g.tower.member.merit += 2 + j.circle;
  if (j.client) {
    const pay = Math.round(j.pay * (q >= 60 ? 1.2 : q < 25 ? 0.7 : 1));
    g.player.money += pay;
    A.orders += 1;
    deed(g, 'honest', 3, `${J(g.player.name, '이/가')} 맡은 마도구를 기한 안에 넘겼다`);
    logA(g, `${j.client} 의뢰 ${J(j.name, '을/를')} 넘겼다.`);
    return `${j.client}에게 ${j.count ? `${j.name} ${j.count}점을` : J(j.name, '을/를')} 넘겼다. ${q >= 60 ? '의뢰인이 술식을 비춰 보더니 웃돈을 얹었다.' : q < 25 ? '의뢰인이 마석의 탁한 빛을 보고 값을 깎았다.' : '의뢰인이 고개를 끄덕였다.'} 은화 ${pay}닢. (${GRADE_WORDS[gradeOf(q)]})`;
  }
  queueScene(g, 'af_done', { name: j.name, base: j.base, circle: j.circle, spell: j.spell, q }, { first: true });
  return `${J(j.name, '이/가')} 완성되었다. 마석이 손바닥 위에서 낮게 울렸다. (${GRADE_WORDS[gradeOf(q)]})`;
}
defineScene('af_pick', {
  title: () => '무엇을 새길까',
  text: (g) => `가진 다듬은 마석 ${AS(g).stones}개. 마석이 모자라면 공방에서 웃돈을 주고 산다(하나에 은화 ${Math.ceil(stoneCost(g) * 1.5)}닢). 높은 서클 주문은 마석을 서클 수만큼 먹고, 새기다 터질 수 있다.`,
  choices: (g) => (AS(g).job ? [] : [
    ...picks(g).map((p) => { const c = startCost(g, p.base, p.sp); return { label: `${p.label}, 은화 ${c.money}닢`, key: `${p.base}:${p.sp.id}` }; }),
    { label: '그만둔다', key: 'none' },
  ]),
  resolve(g, rng, s, key) {
    const A = AS(g);
    const p = picks(g).find((x) => `${x.base}:${x.sp.id}` === key);
    if (!p || A.job) return '도면을 말아 넣었다.';
    const c = startCost(g, p.base, p.sp);
    if (g.player.money < c.money) return `바탕과 마석 값 은화 ${c.money}닢이 모자랐다. 도면을 말아 넣었다.`;
    g.player.money -= c.money;
    A.stones = Math.max(0, A.stones - c.need);
    const baseName = p.base === 'own' ? L(g).gear.weaponName : BASES[p.base].name;
    A.job = { base: p.base, spell: p.sp.id, spellName: p.sp.name, circle: p.sp.circle, name: itemName(p.sp.name, baseName), prog: 0 };
    return `${baseName}에 마석 ${c.need}개를 박고 '${p.sp.name}'의 첫 고리를 그었다.${p.sp.circle >= 4 ? ' 마석이 손끝을 밀어내는 것 같았다. 이만한 술식은 대륙에서도 드물게 새긴다.' : ''}`;
  },
});
defineScene('af_done', {
  title: (g, s) => s.name,
  text: (g, s) => `${s.name}. ${s.circle}서클 술식, ${GRADE_WORDS[gradeOf(s.q)]}. 팔면 은화 ${itemValue(g, s.base, s.circle, s.q)}닢쯤 받는다.${(g.sword?.blade ?? 0) >= 1 && (s.base === 'own' || BASES[s.base]?.slot === 'weapon') ? ' 마검사의 손에 맞게 술식 끝을 칼등 쪽으로 돌려 두었다.' : ''}`,
  choices: (g, s) => [
    { label: s.base === 'own' ? '내 무기로 쓴다' : `곁에 둔다 (${SLOT_NAME[BASES[s.base]?.slot] ?? '무기'})`, key: 'keep' },
    { label: `판다 (은화 ${itemValue(g, s.base, s.circle, s.q)}닢)`, key: 'sell' },
    ...(s.circle >= 3 && s.q >= 68 ? [{ label: '이름을 붙여 집안에 남긴다', key: 'name' }] : []),
    ...(g.tower?.member ? [{ label: '탑에 바친다 (공적)', key: 'tower' }] : []),
  ],
  resolve(g, rng, s, key) {
    const A = AS(g);
    if (key === 'sell') {
      const v = itemValue(g, s.base, s.circle, s.q);
      g.player.money += v;
      return `${J(s.name, '을/를')} 마도구상에 넘겼다. 은화 ${v}닢.`;
    }
    if (key === 'tower' && g.tower?.member) {
      g.tower.member.merit += 10 + s.circle * 4;
      return `${J(s.name, '을/를')} 탑 공방에 바쳤다. 탑주 보좌가 장부에 내 이름을 적었다.`;
    }
    let famous = null;
    if (key === 'name') {
      const used = new Set(A.famous.map((f) => f.name));
      const nm = rng.pick(FAMOUS_NAMES.filter((n) => !used.has(n))) ?? `${g.player.name}의 마도구`;
      famous = { id: `fa${A.seq++}`, name: nm, base: s.base === 'own' ? 'blade' : s.base, circle: s.circle, spell: s.spell ? spellById(s.spell)?.name ?? '' : '', maker: g.player.name, mine: true, holder: g.player.name, where: here(g), y: g.date.year, lost: false, stolen: null };
      A.famous.push(famous);
      if (A.famous.length > 14) { const i = A.famous.findIndex((f) => !f.mine); if (i >= 0) A.famous.splice(i, 1); }
      chron(g, `${J(g.player.name, '이/가')} ${s.circle}서클 마도구 ${J(nm, '을/를')} 새겼다.`, 60);
      L(g).renown = (L(g).renown ?? 0) + s.circle * 2;
      logA(g, `${J(nm, '을/를')} 새겼다.`);
    }
    const slot = s.base === 'own' ? 'weapon' : BASES[s.base]?.slot ?? 'tool';
    const shown = famous ? famous.name : s.name;
    const named = famous ? `이름은 ${famous.name}. 족보 끝에 만든 사람과 함께 적었다. ` : '';
    const item = { name: famous ? famous.name : s.name, base: s.base, slot, spellUse: s.spell ? spellById(s.spell)?.use ?? null : null, circle: s.circle, q: s.q, y: g.date.year, by: g.player.name, fid: famous?.id ?? null };
    A.kept.push(item);
    if (A.kept.length > 6) A.kept.splice(A.kept.findIndex((k) => !k.fid), 1);
    const gear = L(g).gear;
    const v = gearValue(s.circle, s.q) + ((g.sword?.blade ?? 0) >= 1 && slot === 'weapon' ? 1 : 0);
    if (slot === 'weapon' && (s.base === 'own' || v > (gear.weapon ?? 0))) { gear.weapon = Math.max(gear.weapon ?? 0, v); gear.weaponName = item.name; return `${named}${J(shown, '을/를')} 허리에 찼다. 칼집에서 뽑을 때마다 술식이 희미하게 빛난다.`; }
    if (slot === 'armor' && v > (gear.armor ?? 0)) { gear.armor = v; gear.armorName = item.name; return `${named}${J(shown, '을/를')} 몸에 걸쳤다. 화살이 스칠 때마다 술식이 먼저 떤다.`; }
    if (slot === 'trinket') { A.worn = A.kept.indexOf(item); return `${named}${J(shown, '을/를')} 몸에 지녔다. 살갗에 닿는 마석이 미지근하다.`; }
    return `${named}${J(shown, '을/를')} 집 선반에 올려 두었다.`;
  },
});
defineScene('af_blast', {
  title: () => '마석이 터지려 한다',
  text: (g, s) => `${s.name}의 마석이 귀를 찢는 소리를 내며 붉게 달아오른다. 술식이 제멋대로 돌고, 작업대 다리가 탄다.${pupilsHere(g) ? ' 제자가 바로 옆에 서 있다.' : ''}`,
  choices: (g) => [
    { label: '마력으로 붙잡는다', key: 'hold' },
    { label: '창밖으로 던진다', key: 'throw' },
    { label: '엎드려 피한다', key: 'duck' },
    ...(pupilsHere(g) ? [{ label: '제자를 감싼다', key: 'cover' }] : []),
  ],
  resolve(g, rng, s, key) {
    const A = AS(g);
    A.blasts += 1;
    const v = magic(g) * 0.5 + (g.player.stats.wil ?? 40) * 0.4 + A.art * 0.3 - s.circle * 12;
    if (key === 'hold' && rng.chance(clamp(v / 100, 0.1, 0.85))) {
      if (A.job) A.job.prog = Math.max(0, A.job.prog - 0.3);
      stress(g, 6); artUp(g, 2);
      return '두 손으로 마석을 감싸고 술식을 거꾸로 풀었다. 빛이 천천히 가라앉았다. 손바닥이 데었지만 마석은 살았다. 몇 줄은 다시 새겨야 한다.';
    }
    A.job = null;
    stress(g, 10);
    if (key === 'throw' && rng.chance(0.7)) return '달아오른 마석을 창밖 물통으로 던졌다. 물이 한꺼번에 끓어 넘치며 쾅 소리가 났다. 지나가던 개가 짖어 댔다. 일은 처음부터다.';
    if (key === 'cover') {
      const p = A.shop.pupils[0];
      p.loyal = (p.loyal ?? 50) + 25;
      g.player.injuries.push({ name: '마석 파편에 그은 등', months: 3 });
      return `${J(p.name, '을/를')} 끌어안고 돌아섰다. 등 뒤에서 마석이 터졌다. 파편이 등에 박혔다. ${J(p.name, '이/가')} 울먹이며 상처를 씻어 주었다.`;
    }
    if (A.shop && shopHere(g)) A.shop.hurt = mi(g) + 3;
    const hurt = s.circle >= 3 || rng.chance(0.4);
    if (hurt) g.player.injuries.push({ name: s.circle >= 4 ? '마석 폭발에 탄 손' : '마석 파편에 베인 팔', months: s.circle >= 4 ? 6 : 2 });
    if (s.circle >= 4) chron(g, `${placeName(here(g))}의 공방에서 마석이 터졌다. 지붕이 날아갔다는 말이 돈다.`, 40);
    return `${key === 'hold' ? '붙잡으려던 술식이 손가락 사이로 빠져나갔다.' : key === 'throw' ? '던지기도 전에 터졌다.' : '바닥에 엎드리는 순간 터졌다.'} 작업대가 쪼개지고 선반의 도면이 불탔다.${hurt ? ' 나도 다쳤다.' : ''}${A.shop && shopHere(g) ? ' 공방을 고치는 동안 석 달은 손님을 받기 어렵다.' : ''}`;
  },
});

/* ---------- 의뢰 ---------- */
const CLIENTS = {
  noble: { who: '귀족 집안 집사', bases: ['ring', 'amulet'], pay: [40, 85], due: 5, want: '아가씨 혼수에 넣을 장신구' },
  adv: { who: '모험가', bases: ['blade', 'spear', 'shield'], pay: [35, 70], due: 3, want: '미궁에 들고 갈 무기' },
  army: { who: '왕국군 병참관', bases: ['shield', 'mail'], pay: [110, 170], due: 6, want: '전선에 보낼 결계 방패 세 점', count: 3 },
  merchant: { who: '상단 서기', bases: ['lamp', 'tool'], pay: [18, 35], due: 3, want: '창고에 걸 마력 등잔이나 연장' },
  tower: { who: '별의 탑 공방', bases: ['ring', 'amulet', 'blade'], pay: [45, 90], due: 4, want: '탑이 일손이 모자라 넘긴 일감' },
};
function makeOffers(g, rng) {
  const ids = ['noble', 'adv', 'merchant'];
  if (atWar(g) || rng.chance(0.25)) ids.push('army');
  if (here(g) === 'serenia' || g.tower?.member) ids.push('tower');
  const mul = workshopAt(here(g)) || 1;
  return ids.map((id) => {
    const c = CLIENTS[id];
    const base = rng.pick(c.bases);
    const sp = fitSpells(g, base)[0] ?? null;
    return { id, base, sp: sp?.id ?? null, pay: Math.round(rng.int(c.pay[0], c.pay[1]) * mul * (sp ? 1 + (sp.circle - 1) * 0.35 : 1)) };
  });
}
ACTIONS.push({
  id: 'af_order', name: '마도구 의뢰 받기', icon: 'letter',
  desc: '귀족·모험가·군대·상단의 마도구 주문을 받는다. 재료는 의뢰인이 대고, 기한 안에 넘기면 값을 받는다.',
  available: (g) => adult(g) && free(g) && atBench(g) && canEngrave(g) && AS(g).art >= 25 && !AS(g).job && mi(g) - AS(g).orderAt >= 2 && !sceneQueued(g, 'af_offer') && !(AS(g).shop?.hurt > mi(g) && shopHere(g)),
  run(g, rng) {
    AS(g).orderAt = mi(g);
    queueScene(g, 'af_offer', { offers: makeOffers(g, rng) });
    return shopHere(g) ? '공방 문에 걸린 종이 몇 번 울렸다. 주문서가 탁자에 쌓였다.' : '마석 공방 거리의 게시판에 붙은 주문서를 훑었다.';
  },
});
defineScene('af_offer', {
  title: () => '주문서',
  text: (g, s) => s.offers.map((o) => {
    const c = CLIENTS[o.id];
    return `${c.who}: ${c.want}. 은화 ${o.pay}닢, ${c.due}달 안.${o.sp ? '' : ' (새길 만한 주문을 모른다)'}`;
  }).join(' '),
  choices: (g, s) => (AS(g).job ? [] : [
    ...s.offers.filter((o) => o.sp).map((o) => ({ label: `${CLIENTS[o.id].who}의 일 ('${spellById(o.sp)?.name ?? ''}', 은화 ${o.pay}닢)`, key: o.id })),
    { label: '오늘은 받지 않는다', key: 'none' },
  ]),
  resolve(g, rng, s, key) {
    const A = AS(g);
    const o = s.offers.find((x) => x.id === key && x.sp);
    const sp = o ? spellById(o.sp) : null;
    if (!o || !sp || A.job) return '주문서를 도로 꽂아 두었다.';
    const c = CLIENTS[o.id];
    A.job = { base: o.base, spell: sp.id, spellName: sp.name, circle: sp.circle, name: itemName(sp.name, BASES[o.base].name), prog: 0, client: c.who, pay: o.pay, due: mi(g) + c.due, ...(c.count ? { count: c.count } : {}) };
    return `${J(c.who, '과/와')} 값을 맞추고 계약서에 이름을 적었다. 바탕과 마석은 의뢰인이 보내 준다. ${c.due}달 안에 넘겨야 한다.`;
  },
});

/* ---------- 내 공방 ---------- */
const SHOP_COST = 150;
ACTIONS.push({
  id: 'af_shop', name: '내 마도구 공방 열기', icon: 'smith',
  desc: `마석 공방 거리에 내 이름을 건 공방을 연다. 작업대·숫돌·화로에 은화 ${SHOP_COST}닢. 제자를 들이고 의뢰를 직접 받을 수 있다.`,
  available: (g) => adult(g) && free(g) && !!workshopAt(here(g)) && !AS(g).shop && AS(g).art >= 35 && canEngrave(g) && g.player.money >= SHOP_COST,
  run(g) {
    const A = AS(g);
    if (g.player.money < SHOP_COST) return `은화 ${SHOP_COST}닢이 모자랐다.`;
    g.player.money -= SHOP_COST;
    A.shop = { place: here(g), name: `${g.player.name}의 공방`, since: g.date.year, pupils: [], hurt: 0, founder: g.player.name };
    chron(g, `${placeName(here(g))} 공방 거리에 '${A.shop.name}' 간판이 걸렸다.`, 40);
    logA(g, `${placeName(here(g))}에 공방을 열었다.`);
    return `${placeName(here(g))} 공방 거리 끝의 빈 가게를 얻었다. 작업대를 들이고 숫돌을 놓고, 문 위에 '${A.shop.name}' 간판을 걸었다. 첫날 손님은 없었다. 둘째 날 옆 공방 장인이 빵을 들고 왔다.`;
  },
});
const PUPIL_KINDS = [
  { word: '대장간 집 막내', talent: 8, honest: 70, line: '손이 크고 굳은살이 박였다. 숫돌을 보더니 눈이 반짝였다.' },
  { word: '몰락한 마도사 집안 아이', talent: 18, honest: 55, line: '술식 도면을 이미 몇 장 외우고 있었다. 말끝마다 옛 집안 이야기를 했다.' },
  { word: '고아원에서 온 아이', talent: 10, honest: 60, line: '말이 없고, 시킨 일은 끝까지 했다.' },
  { word: '상단 서기의 아들', talent: 12, honest: 40, line: '셈이 빨랐다. 마석 값을 묻는 눈이 너무 밝았다.' },
  { word: '탑 시험에 떨어진 젊은이', talent: 22, honest: 50, line: '마력이 깨어 있었다. 탑을 원망하는 말을 두 번 했다.' },
  { word: '광부의 딸', talent: 12, honest: 75, line: '마석 결을 손끝으로 더듬어 읽었다. 갱에서 배웠다고 했다.' },
];
ACTIONS.push({
  id: 'af_pupil', name: '공방에 제자 들이기', icon: 'anvil',
  desc: '내 공방에 제자를 들인다. 둘까지. 제자는 마석을 다듬고 일을 거들며, 언젠가 제 공방을 차려 나간다.',
  available: (g) => adult(g) && free(g) && shopHere(g) && AS(g).art >= 45 && AS(g).shop.pupils.length < 2 && mi(g) - AS(g).pupilAt >= 6 && !sceneQueued(g, 'af_pupils'),
  run(g, rng) {
    AS(g).pupilAt = mi(g);
    const n = NAMES.free;
    const kinds = rng.shuffle ? rng.shuffle([...PUPIL_KINDS]).slice(0, 3) : PUPIL_KINDS.slice(0, 3);
    const cands = kinds.map((k) => { const sex = rng.chance(0.45) ? 'f' : 'm'; return { name: rng.pick(sex === 'f' ? n.f : n.m), sex, word: k.word, line: k.line, art: k.talent + rng.int(0, 8), honest: clamp(k.honest + rng.int(-15, 15), 5, 95) }; });
    queueScene(g, 'af_pupils', { cands });
    return '공방 문 앞에 제자로 받아 달라는 사람들이 찾아왔다.';
  },
});
defineScene('af_pupils', {
  title: () => '제자로 받아 주십시오',
  text: (g, s) => s.cands.map((c) => `${c.name}, ${c.word}. ${c.line}`).join(' '),
  choices: (g, s) => (!AS(g).shop || AS(g).shop.pupils.length >= 2 ? [] : [
    ...s.cands.map((c, i) => ({ label: `${J(c.name, '을/를')} 받는다`, key: `p${i}` })),
    { label: '아무도 받지 않는다', key: 'none' },
  ]),
  resolve(g, rng, s, key) {
    const A = AS(g);
    const c = s.cands[Number(key.slice(1))];
    if (!c || !A.shop) return '모두 돌려보냈다.';
    A.shop.pupils.push({ name: c.name, sex: c.sex, word: c.word, art: c.art, honest: c.honest, loyal: 50, since: mi(g) });
    logA(g, `${J(c.name, '을/를')} 제자로 받았다.`);
    return `${J(c.name, '을/를')} 제자로 받았다. 첫날 빗자루와 앞치마를 건넸다. 오래전 내가 받았던 것처럼.`;
  },
});
// 제자가 다 자랐거나, 손버릇이 나쁘거나 (world.js가 큐에 넣는다)
defineScene('af_pupil_go', {
  title: (g, s) => (s.why === 'ready' ? `${s.name}의 앞날` : `사라진 마석`),
  need: (g, s) => !!AS(g).shop?.pupils.some((p) => p.name === s.name),
  text: (g, s) => (s.why === 'ready'
    ? `${J(s.name, '이/가')} 이제 혼자서도 3서클 술식까지 새긴다. 어느 날 저녁 머뭇거리며 말을 꺼냈다. 제 공방을 차리고 싶다고.`
    : `다듬은 마석 몇 개와 도면 한 장이 사라졌다. 공방 열쇠를 가진 사람은 나와 ${s.name}뿐이다.`),
  choices: (g, s) => (s.why === 'ready'
    ? [{ label: '축복하며 보낸다', key: 'bless' }, { label: '공방 열쇠를 함께 쥐자고 한다', key: 'stay' }, { label: '아직 멀었다며 붙잡는다', key: 'hold' }]
    : [{ label: '조용히 불러 묻는다', key: 'ask' }, { label: '내쫓는다', key: 'out' }, { label: '못 본 척한다', key: 'let' }]),
  resolve(g, rng, s, key) {
    const A = AS(g), sh = A.shop;
    const i = sh.pupils.findIndex((p) => p.name === s.name);
    const p = sh.pupils[i];
    if (s.why === 'ready') {
      if (key === 'bless') { sh.pupils.splice(i, 1); sh.grads = (sh.grads ?? 0) + 1; deed(g, 'generous', 3, `${J(g.player.name, '이/가')} 제자를 축복하며 내보냈다`); logA(g, `${J(p.name, '이/가')} 제 공방을 차려 나갔다.`); return `${p.name}에게 내 숫돌 하나를 주었다. ${J(p.name, '이/가')} 문간에서 한참 절을 하고 떠났다. 이웃 고장에 '${p.name}의 공방'이 섰다는 소식이 몇 달 뒤 왔다.`; }
      if (key === 'stay') { p.partner = true; p.loyal += 20; return `${J(p.name, '이/가')} 눈시울을 붉히며 남겠다고 했다. 간판 아래에 작은 글씨로 ${p.name}의 이름을 더 새겼다.`; }
      p.loyal -= 30;
      if (p.loyal < 20) { sh.pupils.splice(i, 1); return `${J(p.name, '이/가')} 대꾸하지 않았다. 다음 날 아침 앞치마만 걸려 있었다.`; }
      return `${J(p.name, '이/가')} 입술을 깨물고 고개를 숙였다. 그날 밤 숫돌 가는 소리가 늦게까지 났다.`;
    }
    if (key === 'out') { sh.pupils.splice(i, 1); return `${J(p.name, '을/를')} 내보냈다. 짐을 싸는 손이 떨렸다. 끝까지 아니라고 했다.`; }
    if (key === 'ask') {
      if (p.honest < 40) { sh.pupils.splice(i, 1); return `${J(p.name, '이/가')} 처음엔 아니라고 하다가 울음을 터뜨렸다. 노름빚이 있었다고 했다. 도면은 이미 팔려 나갔다. 공방에서 내보냈다.`; }
      p.loyal += 10; A.stones = Math.max(0, A.stones - 1);
      return `${J(p.name, '이/가')} 놀란 얼굴로 아니라고 했다. 며칠 뒤 마석은 화로 뒤에서 나왔다. 쥐가 끌고 간 것이었다.`;
    }
    p.honest -= 5;
    return '아무 말도 하지 않았다. 열쇠 자물쇠만 바꿨다.';
  },
});

/* ---------- 도둑맞은 마도구 ---------- */
export const stolenHere = (g) => AS(g).famous.find((f) => f.mine && f.stolen && f.where === here(g)) ?? null;
ACTIONS.push({
  id: 'af_seek', name: '도둑맞은 마도구 찾기', icon: 'eye',
  desc: '집안의 이름난 마도구가 이 고장에 흘러들었다는 소문을 좇는다.',
  available: (g) => adult(g) && free(g) && !!stolenHere(g) && mi(g) - AS(g).chaseAt >= 1 && !sceneQueued(g, 'af_chase'),
  run(g) {
    const f = stolenHere(g);
    AS(g).chaseAt = mi(g);
    queueScene(g, 'af_chase', { fid: f.id });
    return `뒷골목 장물아비들에게 '${f.name}'의 생김새를 물었다. 셋째 집에서 눈빛이 흔들렸다.`;
  },
});
defineScene('af_chase', {
  title: (g, s) => `'${AS(g).famous.find((f) => f.id === s.fid)?.name ?? ''}'의 행방`,
  need: (g, s) => !!AS(g).famous.find((f) => f.id === s.fid && f.stolen),
  text: (g, s) => { const f = AS(g).famous.find((x) => x.id === s.fid); return `장물아비가 ${f.stolen.by}에게서 ${J(f.name, '을/를')} 넘겨받았다고 실토했다. 아직 팔리지 않았다. 되사려면 은화 ${buyBack(g, f)}닢을 부른다.`; },
  choices: (g, s) => {
    const f = AS(g).famous.find((x) => x.id === s.fid);
    return [
      ...(g.player.money >= buyBack(g, f) ? [{ label: `되산다 (은화 ${buyBack(g, f)}닢)`, key: 'buy' }] : []),
      { label: '힘으로 빼앗는다', key: 'fight' },
      { label: '경비대에 알린다', key: 'guard' },
      { label: '그만둔다', key: 'leave' },
    ];
  },
  resolve(g, rng, s, key) {
    const f = AS(g).famous.find((x) => x.id === s.fid);
    const back = (how) => { f.stolen = null; f.holder = g.player.name; f.where = AS(g).shop?.place ?? here(g); logA(g, `${J(f.name, '을/를')} 되찾았다.`); chron(g, `도둑맞았던 마도구 ${J(f.name, '이/가')} ${g.player.name}의 집안으로 돌아왔다.`, 30); return how; };
    if (key === 'buy') {
      const p = buyBack(g, f);
      if (g.player.money < p) return '은화가 모자랐다. 장물아비가 어깨를 으쓱했다.';
      g.player.money -= p;
      return back(`은화 ${p}닢을 세어 주고 ${J(f.name, '을/를')} 돌려받았다. 집안의 것을 제 돈으로 되사는 기분은 쓰렸다.`);
    }
    if (key === 'fight') {
      const r = runFight(g, rng, { enc: { unit: 'thug', count: 3, leader: 'bandit_chief', leaderName: '장물아비의 칼잡이' }, reward: {} }, circleOf(g) >= 2 ? 'magic' : 'charge', { flee: 30, short: true });
      if (r.outcome === 'win' || r.outcome === 'overwhelm') return back(`${r.text} 엎어진 상자 사이에서 ${J(f.name, '을/를')} 집어 들었다.`);
      return `${r.text} ${J(f.name, '은/는')} 다른 고장으로 흘러갔다는 말만 남았다.`;
    }
    if (key === 'guard') {
      if (rng.chance(0.4 + (L(g).renown ?? 0) / 200)) return back(`경비대가 장물아비 집을 뒤졌다. 마루 밑에서 ${J(f.name, '이/가')} 나왔다.`);
      return '경비대 조장이 하품을 하며 적어 두겠다고 했다. 다음 날 장물아비 집은 비어 있었다.';
    }
    return '돌아섰다. 언젠가 다시 나타날 것이다. 이름난 물건은 숨어 있지 못한다.';
  },
});
export const buyBack = (g, f) => Math.round((40 + f.circle * f.circle * 15) * priceMul(g));

export { strip, gradeOf, pupilsHere, shopHere, finish, rankOf };
