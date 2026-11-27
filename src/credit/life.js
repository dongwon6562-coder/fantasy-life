// 빚과 돈놀이 속의 삶: 전당포, 은행가 집안에 돈 맡기기와 빌리기, 흔들리는 금고, 내가 돈놀이하는 길(빌려주기·받아 내기·탕감),
// 내 은행 세우기, 전쟁 때 왕실이 내 금고에 손 벌리기. 새 행동은 뜻 있는 형편에서만 보인다.
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { EVENTS, here, money } from '../events/core.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, stress } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { me as meP } from '../game.js';
import { byId } from '../npc.js';
import { deed } from '../repute/index.js';
import { atWar } from '../world.js';
import { E, LENDERS } from '../estate/core.js';
import { collateral } from '../estate/money.js';
import { CS, SEATS, PAWN_TOWNS, bankAt, bankById, myBank, newBank, endBank, clog, crRng, clamp, mi, placeName, stage, houseWord, fortuneWord, deposited, lentOut } from './state.js';

const M = (g) => CS(g).me;
const busy = (g) => g.over || g.bondage?.slave || g.crime?.jailed || g.army?.campaign || g.army?.captive || !!L(g).heirPending;
const settled = (g) => isAdult(g) && !traveling(g) && !busy(g);
const famine = (g) => !!g.world?.famine;
export const LEND_TERM = 12;
export const lendCap = (g) => (myBank(g) ? 3000 : 1000);
const rateOf = (g) => (M(g).book.harsh ? 0.04 : 0.02);

/* ---------- 전당포 ---------- */
export function pawnables(g) {
  const gear = L(g).gear ?? {}, me = M(g), out = [];
  const held = (k) => me.pawns.some((p) => p.kind === k);
  if (gear.weapon > 0 && !held('weapon')) out.push({ kind: 'weapon', what: gear.weaponName ?? '쓰던 칼', val: 15 + gear.weapon * 20, lv: gear.weapon });
  if (gear.armor > 0 && !held('armor')) out.push({ kind: 'armor', what: gear.armorName ?? '갑옷', val: 12 + gear.armor * 16, lv: gear.armor });
  const sid = meP(g)?.spouseId, sp = sid != null ? byId(g, sid) : null;
  if (sp?.alive && !held('ring')) out.push({ kind: 'ring', what: '혼인 반지', val: 25 });
  if (!held('coat')) out.push({ kind: 'coat', what: '겨울 외투', val: 6 });
  return out;
}
export const redeemPrice = (g, p) => Math.round(p.val * (1 + 0.04 * Math.max(1, mi(g) - p.at)));
const pawnHere = (g) => PAWN_TOWNS.includes(here(g));
ACTIONS.push({
  id: 'credit_pawn',
  name: '전당포',
  icon: 'ring',
  desc: '물건을 맡기고 급한 돈을 받는다. 여섯 달 안에 이자를 얹어 찾아가지 않으면 물건은 전당포 것이 된다.',
  available: (g) => settled(g) && pawnHere(g) && (M(g).pawns.length > 0 || (money(g) < 25 && pawnables(g).length > 0)) && !sceneQueued(g, 'credit_pawn'),
  run(g) { queueScene(g, 'credit_pawn'); return '전당포 창살 창구 앞에 섰다.'; },
});
defineScene('credit_pawn', {
  need: (g) => pawnHere(g) && !traveling(g),
  title: () => '전당포',
  text: (g) => {
    const me = M(g);
    const held = me.pawns.map((p) => `${p.what}(${p.due - mi(g) > 0 ? `${p.due - mi(g)}달 남음` : '오늘이 마지막'}, 찾으려면 은화 ${redeemPrice(g, p)}닢)`).join(', ');
    return `창살 너머에서 외눈 안경을 낀 늙은이가 저울과 장부를 앞에 두고 앉아 있다. 벽에는 찾아가지 않은 물건들이 꼬리표를 달고 걸려 있다. 칼, 악기, 신부 화관, 아이 신발.${held ? ` 내가 맡긴 것: ${held}.` : ''}`;
  },
  choices: (g) => {
    const out = [];
    for (const p of M(g).pawns) if (money(g) >= redeemPrice(g, p)) out.push({ label: `${p.what}을 찾는다 (은화 ${redeemPrice(g, p)}닢)`, key: `get:${p.id}` });
    for (const p of pawnables(g)) out.push({ label: `${J(p.what, "을/를")} 맡긴다 (은화 ${p.val}닢)`, key: `put:${p.kind}` });
    out.push({ label: '그냥 돌아간다', key: 'none' });
    return out.slice(0, 7);
  },
  resolve(g, rng, s, key) {
    const me = M(g);
    if (key === 'none') return '창구 앞에서 한참 서 있다가 돌아섰다.';
    const [how, k] = key.split(':');
    if (how === 'get') {
      const p = me.pawns.find((x) => x.id === Number(k));
      if (!p || money(g) < redeemPrice(g, p)) return '늙은이가 고개를 저었다. 돈이 모자랐다.';
      g.player.money -= redeemPrice(g, p);
      me.pawns = me.pawns.filter((x) => x !== p);
      const gear = L(g).gear;
      if (p.kind === 'weapon' && gear) { gear.weapon = Math.max(gear.weapon, p.lv); gear.weaponName ??= p.what; }
      if (p.kind === 'armor' && gear) { gear.armor = Math.max(gear.armor, p.lv); gear.armorName ??= p.what; }
      return `늙은이가 꼬리표를 떼어 ${J(p.what, '을/를')} 창살 밑으로 밀어 주었다. 손에 쥐니 생각보다 무거웠다.`;
    }
    const p = pawnables(g).find((x) => x.kind === k);
    if (!p) return '맡길 물건이 없었다.';
    const gear = L(g).gear;
    if (k === 'weapon') gear.weapon = 0;
    if (k === 'armor') gear.armor = 0;
    me.pawns.push({ id: me.pawnSeq++, kind: k, what: p.what, val: p.val, lv: p.lv ?? 0, at: mi(g), due: mi(g) + 6, place: here(g) });
    g.player.money += p.val;
    if (k === 'ring') stress(g, 6);
    return {
      weapon: `늙은이가 칼날을 엄지로 쓸어 보고 이를 드러냈다. "날이 살았군." 은화 ${p.val}닢과 꼬리표 하나를 받았다. 허리가 허전하다.`,
      armor: `늙은이가 갑옷의 이음매를 하나하나 젖혀 보았다. 은화 ${p.val}닢. 꼬리표에 내 이름이 적혔다.`,
      ring: `반지를 빼는 데 한참 걸렸다. 손가락에 하얀 자국이 남았다. 은화 ${p.val}닢. 집에 가서 뭐라고 해야 할지 모르겠다.`,
      coat: `외투를 벗어 창살 밑으로 밀었다. 은화 ${p.val}닢. 바람이 곧장 살갗에 닿았다.`,
    }[k];
  },
});

/* ---------- 은행가 집안 ---------- */
const bankHere = (g) => bankAt(g, here(g));
const owedTo = (g, b) => E(g).loans.filter((l) => l.lender === 'bank' && l.bank === b.id).reduce((a, l) => a + l.principal, 0);
export const bankCap = (g, b) => (b.mine ? 0 : Math.max(0, Math.min(LENDERS.bank.max - owedTo(g, b), Math.round(collateral(g) * 0.5) - owedTo(g, b), Math.round(b.fortune * 15))));
ACTIONS.push({
  id: 'credit_bank',
  name: '은행가 집안',
  icon: 'seal',
  desc: '은행가 집안 금고에 돈을 맡기거나 찾고, 재산을 보이고 돈을 빌린다. 집안이 무너지면 맡긴 돈도 함께 사라진다.',
  available: (g) => { if (!settled(g)) return false; const b = bankHere(g); return !!b && !b.mine && (money(g) >= 100 || M(g).deposits.some((d) => d.bank === b.id) || owedTo(g, b) > 0 || (money(g) < 60 && bankCap(g, b) >= 100)) && !sceneQueued(g, 'credit_bank'); },
  run(g) { queueScene(g, 'credit_bank'); return '은행가 집안의 높은 문을 밀었다.'; },
});
defineScene('credit_bank', {
  need: (g) => !!bankHere(g) && !traveling(g),
  title: (g) => houseWord(g, bankHere(g)),
  text: (g) => {
    const b = bankHere(g), d = M(g).deposits.find((x) => x.bank === b.id), owe = owedTo(g, b), st = stage(g);
    const room = st >= 3 ? '대리석 바닥에 마석 등이 줄지어 있다. 창구마다 어음 묶음과 마석 저울.' : st >= 1 ? '긴 탁자에 서기들이 줄지어 앉아 깃펜으로 장부를 메운다. 어음 한 장이 은화 자루를 대신한다.' : '다리 위 환전 탁자 뒤로 작은 금고방이 붙어 있다. 저울 접시 위에서 먼 나라 금화가 반짝인다.';
    return `${room} 사람들은 이 집안이 ${fortuneWord(b.fortune)}고 한다.${b.crown > 0 ? ' 왕실에 빌려준 돈이 많다는 소문이다.' : ''}${d ? ` 맡겨 둔 돈: 은화 ${Math.round(d.amt)}닢.` : ''}${owe ? ` 이 집안에 진 빚: 은화 ${owe}닢.` : ''}`;
  },
  choices: (g) => {
    const b = bankHere(g), me = M(g), out = [];
    const d = me.deposits.find((x) => x.bank === b.id);
    if (d) out.push({ label: `맡긴 돈을 다 찾는다 (은화 ${Math.floor(d.amt * 0.99)}닢)`, key: 'take' });
    for (const amt of [100, 300, Math.floor(money(g) / 2)].filter((v, i, a) => v >= 100 && v <= money(g) && a.indexOf(v) === i)) out.push({ label: `은화 ${amt}닢을 맡긴다`, key: `put:${amt}` });
    for (const l of E(g).loans.filter((x) => x.lender === 'bank' && x.bank === b.id)) if (money(g) >= l.principal) out.push({ label: `빚을 갚는다 (은화 ${l.principal}닢)`, key: `repay:${l.id}` });
    const cap = bankCap(g, b);
    for (const amt of [100, 300, 800]) if (amt <= cap && out.length < 6) out.push({ label: `재산을 보이고 은화 ${amt}닢을 빌린다 (달 이자 1푼 2리)`, key: `borrow:${amt}` });
    out.push({ label: '그냥 돌아간다', key: 'none' });
    return out.slice(0, 7);
  },
  resolve(g, rng, s, key) {
    const b = bankHere(g), me = M(g), e = E(g);
    if (!b || key === 'none') return '서기가 고개를 숙여 인사했다. 거래는 없었다.';
    const [how, n] = key.split(':');
    if (how === 'take') {
      const d = me.deposits.find((x) => x.bank === b.id);
      if (!d) return '그 돈은 이미 없었다.';
      const got = Math.floor(d.amt * 0.99);
      g.player.money += got; me.deposits = me.deposits.filter((x) => x !== d);
      return `서기가 은화를 열 닢씩 쌓아 세어 주었다. 은화 ${got}닢. 수수료 몇 닢은 장부 귀퉁이로 사라졌다.`;
    }
    if (how === 'put') {
      const amt = Number(n);
      if (money(g) < amt) return '돈이 모자랐다.';
      g.player.money -= amt;
      const d = me.deposits.find((x) => x.bank === b.id);
      if (d) d.amt += amt; else me.deposits.push({ bank: b.id, amt });
      return `은화 ${amt}닢을 맡기고 ${b.house} 집안 문장이 찍힌 어음 한 장을 받았다. 종이 한 장이 은화 자루보다 무겁게 느껴졌다.`;
    }
    if (how === 'repay') {
      const l = e.loans.find((x) => x.id === Number(n));
      if (!l || money(g) < l.principal) return '돈이 모자랐다.';
      g.player.money -= l.principal; e.loans = e.loans.filter((x) => x !== l);
      if (!e.loans.some((x) => x.missed)) e.hounded = 0;
      return `빚 은화 ${l.principal}닢을 다 갚았다. 서기가 차용증에 '끝'이라고 쓰고 붉은 도장을 찍었다.`;
    }
    const amt = Number(n);
    if (amt > bankCap(g, b)) return '서기가 장부를 덮었다. 그만큼은 안 된다고 했다.';
    g.player.money += amt;
    e.loans.push({ id: e.seq++, lender: 'bank', bank: b.id, principal: amt, due: mi(g) + 12, missed: 0, from: here(g) });
    note(g, `${houseWord(g, b)}에서 은화 ${amt}닢을 빌렸다.`);
    return `서기가 내 집과 재산 목록을 받아 적고 차용증 두 장을 썼다. 한 장은 금고로, 한 장은 내 품으로. 은화 ${amt}닢, 열두 달.`;
  },
});

/* ---------- 내가 돈놀이하는 길 ---------- */
const ASKERS = [
  ['방앗간 집 아들', '물레방아 굴대가 부러졌다고 한다', 40], ['젊은 어부', '그물을 새로 떠야 한다고 한다', 30], ['과부 양털 장수', '겨울 양털을 미리 사 둬야 한다고 한다', 80],
  ['대장장이', '숯값이 석 달 밀렸다고 한다', 60], ['포도밭 주인', '흉년 뒤 씨앗값이 없다고 한다', 100], ['몰락한 기사', '말을 다시 사야 한다고 한다', 150],
  ['선술집 주인', '지붕이 새서 손님이 끊겼다고 한다', 70], ['수레꾼', '바퀴 두 개가 한꺼번에 나갔다고 한다', 35], ['신혼부부', '살림 밑천이 없다고 한다', 50],
  ['떠돌이 악사', '다른 빚을 갚으려고 빚을 진다고 한다', 20], ['젊은 공증인', '사무실 세를 내야 한다고 한다', 90], ['소금 상인', '배 한 척 몫 소금을 사 둔다고 한다', 200],
];
export function askers(g) {
  const r = crRng(g, 77), out = [], used = new Set();
  const n = famine(g) ? 3 : 2;
  for (let i = 0; i < 8 && out.length < n; i++) {
    const a = r.pick(ASKERS);
    if (used.has(a[0])) continue;
    used.add(a[0]);
    const amt = Math.round(a[2] * (famine(g) ? 1.3 : 1) * (1 + stage(g) * 0.15) / 5) * 5;
    out.push({ who: `${placeName(here(g))}의 ${a[0]}`, why: a[1], amt });
  }
  return out;
}
const lendHere = (g) => !['ern', 'gruental'].includes(here(g)) || lentOut(g) > 0 || M(g).book.bad.length > 0;
export const canFound = (g) => !myBank(g) && stage(g) >= 1 && M(g).book.lent >= 600 && money(g) >= 500 && SEATS.includes(here(g)) && !bankAt(g, here(g));
ACTIONS.push({
  id: 'credit_lend',
  name: '돈놀이',
  icon: 'scale',
  desc: '남는 돈을 이자를 받고 빌려준다. 모질게 받으면 많이 남지만 사람들이 등을 돌린다. 떼이는 돈도 있다.',
  available: (g) => settled(g) && (money(g) >= 150 || lentOut(g) > 0 || M(g).book.bad.length > 0) && lendHere(g) && !sceneQueued(g, 'credit_lend'),
  run(g) { queueScene(g, 'credit_lend'); return '돈 빌리러 올 사람들을 기다렸다.'; },
});
defineScene('credit_lend', {
  need: (g) => !traveling(g),
  title: () => '돈놀이',
  text: (g) => {
    const bk = M(g).book, out = lentOut(g), bad = bk.bad.reduce((a, l) => a + l.amt, 0), mb = myBank(g);
    const asks = askers(g).map((a) => `${J(a.who, '이/가')} 은화 ${a.amt}닢을 빌리러 왔다. ${a.why}.`).join(' ');
    return `${mb ? `${houseWord(g, mb)} 금고방 안쪽 내 책상.` : '부엌 탁자에 장부 한 권과 은화 자루.'} 빌려준 돈 은화 ${out}닢(${bk.out.length}곳), 이자는 달 ${bk.harsh ? '네 푼, 모질게' : '두 푼, 너그럽게'} 받는다. 지금까지 이자로 은화 ${Math.round(bk.earned)}닢을 벌었다.${bad ? ` 떼일 판인 돈: 은화 ${bad}닢(${bk.bad.length}곳).` : ''} ${asks}`;
  },
  choices: (g) => {
    const bk = M(g).book, out = [];
    for (const a of askers(g)) if (money(g) >= a.amt && lentOut(g) + a.amt <= lendCap(g) && out.length < 3) out.push({ label: `${a.who}에게 은화 ${a.amt}닢을 빌려준다`, key: `lend:${a.who}:${a.amt}` });
    if (bk.bad.length) {
      out.push({ label: '떼인 돈을 사람을 보내 받아 낸다', key: 'squeeze' });
      out.push({ label: '떼인 돈은 탕감해 준다', key: 'forgive' });
    }
    out.push({ label: bk.harsh ? '이자를 두 푼으로 내린다' : '이자를 네 푼으로 올린다', key: 'rate' });
    if (canFound(g)) out.push({ label: `${placeName(here(g))}에 내 은행 간판을 건다 (은화 500닢)`, key: 'found' });
    out.push({ label: '오늘은 문을 닫는다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const me = M(g), bk = me.book;
    if (key === 'none') return '장부를 덮고 은화 자루를 궤짝에 넣었다.';
    if (key === 'rate') {
      bk.harsh = !bk.harsh;
      if (bk.harsh) deed(g, 'kind', -2, '빌려준 돈의 이자를 올렸다');
      return bk.harsh ? '장부 첫 장에 새 이자를 적었다. 달 네 푼. 다음 날부터 빌리러 오는 사람들의 눈이 달라졌다.' : '이자를 두 푼으로 내렸다. 장터에서 누가 내 이름을 말하며 고개를 끄덕이는 걸 보았다.';
    }
    if (key === 'squeeze') {
      const sum = bk.bad.reduce((a, l) => a + l.amt, 0), got = Math.round(sum * 0.6);
      g.player.money += got; bk.squeezed += got; bk.lost += sum - got;
      const who = bk.bad[0].who;
      bk.bad = [];
      deed(g, 'kind', -5, '떼인 돈을 받으러 사람을 보내 살림을 들어냈다');
      L(g).notoriety = (L(g).notoriety ?? 0) + 2;
      return `덩치 둘을 보냈다. ${who}네 집에서 솥과 이불, 쟁기까지 실어 왔다. 팔아서 은화 ${got}닢. 그 집 아이가 수레 뒤를 따라오며 울었다고 한다.`;
    }
    if (key === 'forgive') {
      const sum = bk.bad.reduce((a, l) => a + l.amt, 0);
      bk.forgiven += sum; bk.lost += sum; bk.bad = [];
      deed(g, 'kind', 5, '떼인 돈을 탕감해 주었다'); deed(g, 'generous', 3, '떼인 돈을 탕감해 주었다');
      return `장부의 그 줄들에 줄을 그었다. 은화 ${sum}닢. 며칠 뒤 문간에 달걀 한 바구니와 말린 생선이 놓여 있었다. 누가 두고 갔는지는 쓰여 있지 않았다.`;
    }
    if (key === 'found') {
      if (!canFound(g)) return '아직 때가 아니었다.';
      g.player.money -= 500;
      const b = newBank(g, here(g), rng, { from: 'me', mine: true, fortune: 35, house: meP(g)?.lastName ?? g.player.name, founder: g.player.name });
      me.bank = b.id; me.founded += 1;
      chron(g, `${g.player.name}, ${placeName(here(g))}에 ${houseWord(g, b)} 은행 간판을 걸다.`, 45);
      clog(g, `내가 ${placeName(here(g))}에 ${houseWord(g, b)} 간판을 걸었다.`);
      return `문 위에 ${b.house} 집안 이름을 새긴 간판을 걸었다. 금고를 짜고, 서기 둘을 들이고, 어음 종이를 찍었다. 첫날 예금자는 셋이었다. 늙은 과부 하나와 겁 많은 상인 둘.`;
    }
    const [, who, n] = key.split(':'), amt = Number(n);
    if (money(g) < amt) return '궤짝에 그만한 돈이 없었다.';
    g.player.money -= amt;
    bk.out.push({ id: bk.seq++, who, amt, at: mi(g), due: mi(g) + LEND_TERM });
    bk.lent += amt;
    return `${J(who, '이/가')} 차용증에 이름을 쓰는 동안 손이 떨렸다. 은화 ${amt}닢을 세어 주었다. 열두 달 뒤에 받기로 했다. 이자는 달마다.`;
  },
});

/* ---------- 달마다: 맡긴 돈의 이자, 전당물 기한, 빌려준 돈, 내 은행 ---------- */
HOOKS.afterMonth.push((g) => {
  if (!g.credit || g.over || !g.life) return;
  const me = M(g), bk = me.book, rng = crRng(g, 13), now = mi(g);
  // 은행에 맡긴 돈: 해 두세 푼쯤 붙는다
  for (const d of me.deposits) { const b = bankById(g, d.bank); if (b) d.amt = Math.round(d.amt * (1 + 0.002 + (b.fortune - 50) / 50000) * 100) / 100; }
  // 전당물: 기한이 지나면 전당포 것이 된다
  for (const p of me.pawns.filter((x) => now > x.due)) {
    me.pawns = me.pawns.filter((x) => x !== p);
    note(g, `전당포에 맡긴 ${J(p.what, '이/가')} 기한이 지나 남의 물건이 되었다.`);
    if (p.kind === 'ring') stress(g, 8);
  }
  // 빌려준 돈: 이자를 받고, 기한이 되면 돌려받고, 가끔 떼인다
  const rate = rateOf(g);
  const risk = (bk.harsh ? 0.015 : 0.008) + (famine(g) ? 0.02 : 0) + (atWar(g) ? 0.005 : 0);
  for (const l of [...bk.out]) {
    if (rng.chance(risk)) { bk.out = bk.out.filter((x) => x !== l); bk.bad.push({ who: l.who, amt: l.amt, at: now }); if (bk.bad.length > 6) { bk.lost += bk.bad[0].amt; bk.bad.shift(); } continue; }
    const i = Math.max(1, Math.round(l.amt * rate));
    g.player.money += i; bk.earned += i;
    if (now >= l.due) { g.player.money += l.amt; bk.out = bk.out.filter((x) => x !== l); }
  }
  // 내 은행: 금고 형편에 따라 조금씩 남는다. 너무 흔들리면 예금자들이 몰려와 무너진다
  const mb = myBank(g);
  if (mb) {
    const near = here(g) === mb.seat && !L(g).travel;
    mb.fortune = clamp(mb.fortune + (near ? 0.15 : -0.05) + (bk.harsh ? -0.05 : 0.03), 0, 100);
    g.player.money += Math.round(1 + mb.fortune / 20);
    if (mb.fortune < 10 && rng.chance(0.15)) {
      const lost = Math.round(lentOut(g) * 0.5) + me.crownLent;
      bk.out = bk.out.slice(0, Math.ceil(bk.out.length / 2)); me.crownLent = 0;
      bk.lost += lost;
      note(g, `내 은행 ${J(houseWord(g, mb), '이/가')} 무너졌다. 예금자들이 문 앞에서 내 이름을 저주했다.`);
      chron(g, `${g.player.name}의 은행 ${J(houseWord(g, mb), '이/가')} 무너지다.`, 40);
      deed(g, 'honest', -4, '은행이 무너져 예금자들의 돈을 날렸다');
      stress(g, 25);
      endBank(g, mb, 'run');
    }
  }
});

// 대를 이으면 장부와 맡긴 돈, 전당표도 물려받는다
HOOKS.heir.push((g) => {
  if (!g.credit) return;
  const me = M(g);
  if (me.deposits.length || me.book.out.length || myBank(g)) note(g, `${myBank(g) ? `${houseWord(g, myBank(g))} 간판과 ` : ''}돈놀이 장부, 맡긴 돈도 물려받았다.`);
});

/* ---------- 사건 ---------- */
const shaky = (g) => M(g).deposits.map((d) => ({ d, b: bankById(g, d.bank) })).find(({ d, b }) => b && b.fortune < 30 && d.amt >= 30) ?? null;
EVENTS.push(
  {
    id: 'cr_bank_wobble', cooldown: 8,
    cond: (g) => isAdult(g) && !busy(g) && !!shaky(g),
    chance: () => 0.4, weight: 55,
    prepare: (g) => { const { b } = shaky(g); return { id: b.id }; },
    title: '금고 앞의 줄',
    text: (g, c) => { const b = bankById(g, c.id); return `${placeName(b.seat)}에서 온 사람이 말했다. ${houseWord(g, b)} 금고 앞에 새벽부터 사람들이 줄을 선다고. 서기들은 웃으며 '아무 일도 없다'고 하는데, 웃음이 너무 길다고.`; },
    choices: [
      { label: '당장 가서 다 찾는다 (한 할을 떼인다)', run: (g, rng, c) => { const me = M(g), d = me.deposits.find((x) => x.bank === c.id); if (!d) return '맡긴 돈은 이미 없었다.'; const got = Math.floor(d.amt * 0.9); g.player.money += got; me.deposits = me.deposits.filter((x) => x !== d); const b = bankById(g, c.id); if (b) b.fortune = clamp(b.fortune - 2, 0, 100); return `줄 끝에 서서 반나절을 기다렸다. 서기가 '급히 찾으시는 분 수수료'라며 한 할을 떼고 은화 ${got}닢을 내주었다. 뒤에 선 사람들의 눈길이 등에 꽂혔다.`; } },
      { label: '헛소문이라 믿고 둔다', run: (g) => { stress(g, 4); return '헛소문일 거라고 생각하기로 했다. 그날 밤 꿈에 닫힌 금고 문이 나왔다.'; } },
    ],
  },
  {
    id: 'cr_crown_ask', cooldown: 24,
    cond: (g) => isAdult(g) && !busy(g) && !!myBank(g) && atWar(g) && money(g) >= 300,
    chance: () => 0.2, weight: 60,
    title: '왕실 재무관',
    text: (g) => `왕실 재무관이 호위 넷을 달고 ${houseWord(g, myBank(g))} 문을 두드렸다. "전선의 병사들이 굶습니다. 왕실이 은화 삼백 닢을 빌리고자 하오. 이자는 해 두 할. 전쟁이 끝나면 갚겠소." 그 말을 믿는 은행가가 몇이나 되는지는 그도 알 것이다.`,
    choices: [
      { label: '은화 300닢을 빌려준다', run: (g) => { const me = M(g), b = myBank(g); g.player.money -= 300; me.crownLent += 300; b.crown += 30; CS(g).crown.owed += 30; L(g).renown = (L(g).renown ?? 0) + 3; return '왕실 문장이 찍힌 차용증을 받았다. 재무관이 고개를 숙였다. 궁정에서 내 이름이 한 번쯤 불릴 것이다. 그리고 이 종이가 언젠가 휴지가 될 수도 있다.'; } },
      { label: '금고가 비었다고 돌려보낸다', run: (g) => { const b = myBank(g); if (b) b.fortune = clamp(b.fortune - 4, 0, 100); return '금고가 비었다고 했다. 재무관이 내 금고 문을 한참 바라보다 돌아갔다. 왕실은 이런 일을 잊지 않는다.'; } },
    ],
  },
  {
    id: 'cr_debtor_plea', cooldown: 10,
    cond: (g) => isAdult(g) && !busy(g) && !traveling(g) && M(g).book.out.length > 0,
    chance: (g) => (famine(g) ? 0.3 : 0.08), weight: 40,
    prepare: (g) => { const l = M(g).book.out[0]; return { id: l.id, who: l.who, amt: l.amt }; },
    title: '문간의 빚진 사람',
    text: (g, c) => `${J(c.who, '이/가')} 모자를 쥐고 문간에 서 있다. "이번 달 이자를 못 냈습니다. ${famine(g) ? '밀값이 세 곱이 됐어요. ' : ''}여섯 달만 기다려 주시면 꼭..." 빌려 간 돈은 은화 ${c.amt}닢이다.`,
    choices: [
      { label: '여섯 달 이자 없이 기다려 준다', run: (g, rng, c) => { const l = M(g).book.out.find((x) => x.id === c.id); if (l) l.due += 6; g.player.money = Math.max(0, g.player.money - Math.round(c.amt * rateOf(g) * 2)); deed(g, 'kind', 3, '빚진 사람을 기다려 주었다'); return `기다리겠다고 했다. ${J(c.who, '은/는')} 몇 번이나 고개를 숙이고 돌아갔다. 장부에 여섯 달을 더 적었다.`; } },
      { label: '집에 있는 것이라도 내놓으라고 한다', run: (g, rng, c) => { const bk = M(g).book, l = bk.out.find((x) => x.id === c.id); if (!l) return '그 빚은 이미 장부에 없었다.'; const got = Math.round(l.amt * 0.7); bk.out = bk.out.filter((x) => x !== l); g.player.money += got; bk.squeezed += got; bk.lost += l.amt - got; deed(g, 'kind', -4, '빚진 사람의 살림을 걷어 갔다'); return `그날 저녁 그 집 염소 두 마리와 구리 솥이 내 마당에 들어왔다. 팔아서 은화 ${got}닢. 장부의 줄은 지웠지만 골목에서 그 집 사람들과 눈이 마주치면 모두 먼저 고개를 돌린다.`; } },
    ],
  },
);
