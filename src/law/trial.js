// 재판: 고발하는 쪽과 당하는 쪽, 재판관, 변론인, 증인. 나라마다 결투 재판·신명 재판·진실의 주문이 다르게 열린다.
// 체포 장면에 "재판을 청한다"를 붙여, 붙잡힌 뒤 바로 감옥으로 가는 대신 법정에 설 수 있게 한다.
import { J } from '../narrative/text.js';
import { L, defineScene, queueScene, note, chron, stress, check, SCENES } from '../adventure/core.js';
import { crimeState, CRIMES, sentenceAt, lawAt, jail, reportCrime, isJailed } from '../crime.js';
import { queueDuel, registerDuelEnd } from '../duel/registry.js';
import { faithState } from '../faith/index.js';
import { deed } from '../repute/index.js';
import { isForeigner } from '../realms/index.js';
import { courtState } from '../court/index.js';
import { remember } from '../relations.js';
import { addGrudge } from '../feud/index.js';
import { byId } from '../npc.js';
import { makeRng } from '../rng.js';
import { LS, LAWS, lawOf, CHARGES, FORM_NAME, ADVOCATES, clamp, mi, llog, caseById, bigTown, placeName } from './state.js';

const here = (g) => L(g).place;
export const noble = (g) => !!g.domain || courtState(g).office >= 0 || g.player.familyId === 'fallen_knight';
const otherP = (c) => c.other?.name ?? '상대';
const chargeName = (c) => (c.crime ? c.crimeName ?? '죄' : CHARGES[c.charge]?.name ?? '다툼');
export const evidenceWord = (v) => (v >= 70 ? '증거가 단단하다' : v >= 45 ? '증거가 꽤 있다' : v >= 25 ? '증거가 성기다' : '증거라 할 것이 거의 없다');

/* ---------- 재판 열기 ---------- */
export function openCase(g, { role, charge, other = null, guilty, evidence, place = here(g), crime = false, crimeName = null, witness = null }) {
  const S = LS(g);
  const c = {
    id: S.seq++, role, charge, other, guilty: !!guilty, evidence: Math.round(clamp(evidence, 5, 95)), place, realm: Object.keys(LAWS).find((k) => LAWS[k] === lawOf(place)) ?? 'leonia',
    crime, crimeName, witness, at: mi(g), state: 'open', verdict: null, form: null,
  };
  S.cases.push(c);
  if (S.cases.length > 30) S.cases.splice(0, S.cases.length - 30);
  llog(g, `${placeName(place)}: ${role === 'accused' ? `${chargeName(c)}로 고발당했다` : `${J(otherP(c), '을/를')} ${chargeName(c)}로 고발했다`}.`);
  return c;
}
export function askTrial(g, c) { queueScene(g, 'law_trial', { cid: c.id }, { first: true }); return c; }

// 재판관이 나에게 등을 돌리는 정도 (+면 나에게 불리하다)
export function lean(g, c) {
  const Lw = lawOf(c.place), S = LS(g);
  let v = Lw.bias + (isForeigner(g) ? Lw.foreign : 0) + S.stain / 4 + (L(g).notoriety ?? 0) / 6 - (L(g).renown ?? 0) / 8;
  if (c.realm === 'leonia') {
    const t = g.realm?.lord?.temper;
    v += t === 'harsh' ? 8 : t === 'weak' ? -3 : 0;
    if (noble(g)) v -= 8;
  }
  if (c.realm === 'holy') v += (faithState(g).suspicion ?? 0) / 5 - (faithState(g).devotion ?? 0) / 10;
  return clamp(Math.round(v), -20, 35);
}
export const myPower = (g) => g.player.stats.int * 0.35 + g.player.stats.cha * 0.35 + LS(g).skill * 0.6;
const advCost = (g, c) => Math.round(15 * lawOf(c.place).advocate * (bigTown(c.place) ? 1.5 : 1));
const bribeCost = (g, c) => Math.round((20 + c.evidence * 0.4) * (bigTown(c.place) ? 1.4 : 1));
const canCombat = (g, c) => lawOf(c.place).forms.includes('combat') && (!lawOf(c.place).nobleCombat || noble(g)) && !g.duelQueued;

export function trialOptions(g, c) {
  const Lw = lawOf(c.place), out = [];
  const acc = c.role === 'accused';
  out.push({ label: acc ? '스스로 변론한다' : '내 입으로 고발을 편다', key: 'speak' });
  if (Lw.advocate > 0 && g.player.money >= advCost(g, c)) out.push({ label: `변론인을 산다 (은화 ${advCost(g, c)}닢)`, key: 'advocate' });
  if (g.player.money >= bribeCost(g, c)) out.push({ label: `${Lw.judge}에게 은화 ${bribeCost(g, c)}닢을 건넨다`, key: 'bribe' });
  if (canCombat(g, c)) out.push({ label: '결투 재판을 청한다', key: 'combat' });
  if (Lw.forms.includes('ordeal')) out.push({ label: '신명 재판에 몸을 맡긴다', key: 'ordeal' });
  if (Lw.forms.includes('truth')) out.push({ label: '진실의 주문을 받는다', key: 'truth' });
  if (acc) out.push({ label: '죄를 인정하고 자비를 구한다', key: 'plead' });
  else out.push({ label: `${otherP(c)}와 합의한다`, key: 'settle' }, { label: '고발을 거둔다', key: 'withdraw' });
  return out;
}

/* ---------- 판결 ---------- */
function clearCrimeAt(g, place) {
  const cr = crimeState(g);
  for (const r of cr.record) if (r.place === place) r.paid = true;
  cr.heat[place] = 0; cr.bounty[place] = 0;
}
const shouldHang = (g, place) => crimeState(g).record.filter((r) => !r.paid && r.place === place && r.c === 'murder').length >= lawAt(g, place).hangAt;

// win: 나에게 이긴 판결인가 (고발당했으면 풀려남, 고발했으면 상대가 벌을 받음)
export function verdict(g, rng, c, win, how) {
  const S = LS(g), CH = CHARGES[c.charge] ?? CHARGES.crime, p = c.other?.id ? byId(g, c.other.id) : null;
  c.state = win ? 'won' : 'lost'; c.form = how; c.verdictAt = mi(g);
  S.rec[win ? 'won' : 'lost'] += 1;
  const formName = FORM_NAME[how] ?? '재판';
  let tail = '';
  if (c.role === 'accused') {
    if (win) {
      if (c.crime) clearCrimeAt(g, c.place);
      if (p) remember(g, p, '법정에서 나를 고발했다가 졌다', -10);
      if (!c.guilty) deed(g, 'honest', 2, `${J(g.player.name, '이/가')} 억울한 고발을 법정에서 벗었다고 한다.`, c.place);
      if (how === 'combat' || how === 'ordeal') L(g).renown = (L(g).renown ?? 0) + 2;
      c.verdict = '풀려났다';
      tail = c.guilty ? ' 죄가 있다는 것은 나만 안다.' : '';
      note(g, `${placeName(c.place)}의 ${formName}에서 ${chargeName(c)} 혐의를 벗었다.`);
      return `판결이 났다. 죄 없음.${tail}`;
    }
    const plead = how === 'plead';
    if (CH.heavy || c.crime) S.stain = clamp(S.stain + (c.crime ? 15 : 10) * (plead ? 0.7 : 1), 0, 100);
    if (c.crime) {
      if (shouldHang(g, c.place)) { L(g).pendingDeath = '교수형'; c.verdict = '교수형'; chron(g, `${g.player.name}, ${placeName(c.place)}의 법정에서 교수형을 선고받다.`, 90); return '판결이 났다. 교수형. 법정 안이 조용해졌다. 누군가 문 쪽에서 성호를 그었다.'; }
      const months = Math.max(1, Math.round(sentenceAt(g, c.place) * (plead ? 0.6 : how === 'bribe' ? 1.3 : 1)));
      jail(g, months);
      c.verdict = `옥살이 ${months}달`;
      return `판결이 났다. 옥살이 ${months}달.${plead ? ' 죄를 인정한 덕에 형이 덜어졌다.' : ''}`;
    }
    const fine = Math.round((CH.fine + CH.pay) * (plead ? 0.6 : 1) * (bigTown(c.place) ? 1.3 : 1));
    const paid = Math.min(g.player.money, fine);
    g.player.money -= paid;
    if (p) remember(g, p, '법정에서 나를 이겼다', 6);
    if (CH.heavy) deed(g, 'honest', -3, `${J(g.player.name, '이/가')} ${chargeName(c)}로 판결을 받았다고 한다.`, c.place);
    note(g, `${placeName(c.place)}의 ${formName}에서 ${chargeName(c)}로 판결을 받았다.`);
    if (paid < fine && how === 'absent') {
      const cr = crimeState(g), left = fine - paid;
      cr.bounty[c.place] = (cr.bounty[c.place] ?? 0) + left;
      cr.heat[c.place] = clamp((cr.heat[c.place] ?? 0) + 20, 0, 100);
      c.verdict = `벌금 ${fine}닢, 못 낸 ${left}닢에 현상금`;
      return `벌금과 배상금 은화 ${fine}닢. 못 낸 ${left}닢 때문에 그 고장 경비대가 내 이름을 벽에 붙였다.`;
    }
    if (paid < fine) {
      const months = Math.max(1, Math.ceil((fine - paid) / 10));
      jail(g, months);
      c.verdict = `벌금과 옥살이 ${months}달`;
      return `판결이 났다. 벌금과 배상금 은화 ${fine}닢. 가진 ${paid}닢을 다 내고도 모자라 ${months}달을 옥에서 갚아야 한다.`;
    }
    c.verdict = `벌금 ${fine}닢`;
    return `판결이 났다. 벌금과 배상금 은화 ${fine}닢.${plead ? ' 죄를 인정한 덕에 덜어졌다.' : ''}`;
  }
  // 내가 고발한 쪽
  if (win) {
    const pay = Math.round(CH.pay * (bigTown(c.place) ? 1.4 : 1));
    g.player.money += pay;
    if (p) { remember(g, p, '법정에서 나에게 졌다', -18); if (CH.heavy && p.alive) addGrudge(g, p, c.guilty ? 20 : 35, c.guilty ? '법정에서 나를 무너뜨렸다' : '거짓 고발로 나를 무너뜨렸다'); }
    if (c.guilty) deed(g, 'honest', 2, `${J(g.player.name, '이/가')} ${J(otherP(c), '을/를')} 법정에 세워 잘못을 밝혔다.`, c.place);
    else S.perjury.push({ at: mi(g), place: c.place, name: otherP(c) });
    c.verdict = `${otherP(c)}에게 배상금 ${pay}닢`;
    note(g, `${placeName(c.place)}의 ${formName}에서 ${J(otherP(c), '을/를')} 이겼다.`);
    return `판결이 났다. ${J(otherP(c), '은/는')} 배상금 은화 ${pay}닢을 물게 되었다.${c.guilty ? '' : ' 그 사람의 눈을 마주치지 않았다.'}`;
  }
  if (p) remember(g, p, '나를 법정에 세웠다', -12);
  if (!c.guilty) {
    deed(g, 'honest', -4, `${J(g.player.name, '이/가')} ${J(otherP(c), '을/를')} 억지로 고발했다가 졌다고 한다.`, c.place);
    if (rng.chance(0.3)) { reportCrime(g, 'fraud', c.place); tail = ' 재판관이 거짓 고발을 따로 장부에 적었다.'; }
  }
  c.verdict = '고발이 물리쳐졌다';
  stress(g, 4);
  return `판결이 났다. 고발은 물리쳐졌다.${tail}`;
}

// 결투 재판: 상대(또는 그 대리 투사)와 싸워 이기는 쪽이 옳다
registerDuelEnd('law_combat', (g, rng, won, d) => {
  const c = caseById(g, d.ctx?.cid);
  if (!c || c.state !== 'open') return won ? '이겼다. 그러나 그 사이 재판은 다른 길로 끝나 있었다.' : '졌다.';
  LS(g).rec.combat += 1;
  return `${won ? '상대가 무릎을 꿇었다. 재판관이 손을 들었다. 신께서 옳은 쪽을 보이셨다고 한다.' : '흙바닥에 등이 닿았다. 재판관이 손을 들었다. 칼이 판결했다.'} ${verdict(g, rng, c, won, 'combat')}`;
});
registerDuelEnd('law_combat:decline', (g, d) => {
  const c = caseById(g, d.ctx?.cid);
  if (!c || c.state !== 'open') return '결투장에서 돌아섰다.';
  return `결투장에서 돌아섰다. 물러난 쪽이 진 쪽이다. ${verdict(g, makeRng({ s: (c.id * 7919 + mi(g)) | 0 }), c, false, 'combat')}`;
});

export function decide(g, rng, c, key) {
  const Lw = lawOf(c.place), S = LS(g), acc = c.role === 'accused';
  const ln = lean(g, c);
  const contest = (power, extra = 0) => {
    const mine = power + (acc ? (c.guilty ? 0 : 25) : c.evidence * 0.5 + (c.guilty ? 12 : -12));
    const theirs = (acc ? c.evidence : 40) + ln + extra;
    return check(rng, mine, theirs);
  };
  if (key === 'speak') {
    const won = contest(myPower(g), Lw.forms.includes('truth') ? 10 : 0);
    S.skill = clamp(S.skill + 2, 0, 100);
    return `${acc ? '법정 한가운데 서서 내 말을 했다.' : '법정 한가운데 서서 내가 당한 일을 하나씩 늘어놓았다.'}${Lw.forms.includes('truth') ? ' 주문을 받지 않은 것을 집행관이 장부에 적었다.' : ''} ${won ? `${Lw.judge}가 고개를 끄덕였다.` : `${Lw.judge}의 눈이 차가웠다.`} ${verdict(g, rng, c, won, 'court')}`;
  }
  if (key === 'advocate') {
    const cost = Math.round(15 * Lw.advocate * (bigTown(c.place) ? 1.5 : 1));
    if (g.player.money < cost) return `변론인을 살 돈이 모자랐다. ${decide(g, rng, c, 'speak')}`;
    g.player.money -= cost;
    const name = ADVOCATES[(c.id + c.at) % ADVOCATES.length];
    const won = contest(Math.max(myPower(g), 60) + 10);
    return `${J(name, '이/가')} 내 곁에 섰다. 법전의 조문 셋과 옛 판례 둘을 들었다. ${won ? '상대편 증인이 말을 더듬었다.' : '상대편도 그만큼 준비해 왔다.'} ${verdict(g, rng, c, won, 'court')}`;
  }
  if (key === 'bribe') {
    const cost = Math.round((20 + c.evidence * 0.4) * (bigTown(c.place) ? 1.4 : 1));
    if (g.player.money < cost) return `건넬 은화가 모자랐다. ${decide(g, rng, c, 'speak')}`;
    g.player.money -= cost; S.rec.bribed += 1;
    const t = c.realm === 'leonia' ? g.realm?.lord?.temper : null;
    const odds = clamp(0.45 + Lw.bribe + (t === 'greedy' ? 0.2 : t === 'harsh' ? -0.2 : 0), 0.05, 0.92);
    if (rng.chance(odds)) return `은화 ${cost}닢이 든 주머니가 재판관의 소매 속으로 사라졌다. 재판은 짧았다. ${verdict(g, rng, c, true, 'bribe')}`;
    if (Lw.bribe < 0) { reportCrime(g, 'fraud', c.place); deed(g, 'honest', -5, `${J(g.player.name, '이/가')} ${Lw.judge}에게 뇌물을 내밀었다고 한다.`, c.place); }
    return `${Lw.judge}가 주머니를 탁자 위에 쏟았다. 은화가 법정 바닥에 굴렀다. "${Lw.bribe < 0 ? '이것도 판결에 적겠소.' : '모자라오.'}" ${verdict(g, rng, c, false, 'bribe')}`;
  }
  if (key === 'combat') {
    if (!canCombat(g, c)) return `결투 재판은 받아들여지지 않았다. ${decide(g, rng, c, 'speak')}`;
    const champion = c.other?.name ? `${c.other.name}의 대리 투사` : `${Lw.court}의 투사`;
    queueDuel(g, { kind: 'law_combat', title: FORM_NAME.combat, intro: `${Lw.court} 마당에 줄을 쳤다. 맞은편에 ${J(champion, '이/가')} 섰다. 재판관이 말했다. "신께서 옳은 쪽의 칼을 드실 것이다."`, foe: { name: champion, skill: Math.round(28 + c.evidence * 0.3 + (bigTown(c.place) ? 8 : 0)), style: rng.pick(['steady', 'aggressive']) }, ctx: { cid: c.id } });
    return `결투 재판을 청했다. 재판관은 잠시 말이 없더니 날을 잡았다. ${J(champion, '이/가')} 칼을 들 것이다.`;
  }
  if (key === 'ordeal') {
    S.rec.ordeal += 1;
    const f = faithState(g);
    const won = check(rng, g.player.stats.wil * 0.5 + (f.devotion ?? 0) * 0.4 + (acc ? (c.guilty ? 0 : 15) : c.guilty ? 15 : 0), 50);
    if (acc || rng.chance(0.5)) g.player.injuries.push({ name: '달군 쇠에 덴 손', months: 2 });
    f.devotion = clamp((f.devotion ?? 0) + 3, 0, 100);
    return `사제가 쇠막대를 숯불에서 꺼냈다. 그것을 쥐고 아홉 걸음을 걸었다. 사흘 동안 손을 천으로 감아 두었다. 사흘째, 사제가 천을 풀었다. ${won ? '물집 아래 살이 깨끗하게 아물고 있었다.' : '손바닥이 곪아 있었다.'} ${verdict(g, rng, c, won, 'ordeal')}`;
  }
  if (key === 'truth') {
    const won = rng.chance(acc ? (c.guilty ? 0.05 : 0.95) : c.guilty ? 0.95 : 0.05);
    return `집행관이 내 이마에 손가락을 댔다. 머릿속이 차가워졌다. 묻는 말에 생각보다 먼저 입이 열렸다. ${won ? '거짓을 말할 수 없으니, 거짓이 없었다.' : '숨기고 싶은 것까지 다 말해 버렸다.'} ${verdict(g, rng, c, won, 'truth')}`;
  }
  if (key === 'plead') {
    S.rec.pleaded += 1;
    return `"제가 했습니다." 법정이 술렁였다. ${verdict(g, rng, c, false, 'plead')}`;
  }
  if (key === 'settle') {
    const pay = Math.round((CHARGES[c.charge]?.pay ?? 10) * 0.5);
    g.player.money += pay; c.state = 'settled'; c.verdict = `합의금 ${pay}닢`;
    const p = c.other?.id ? byId(g, c.other.id) : null;
    if (p) remember(g, p, '법정에 가기 전에 합의해 주었다', 4);
    return `${J(otherP(c), '이/가')} 재판관 앞에서 고개를 숙이고 합의금 은화 ${pay}닢을 내놓았다. 다 받아 내지는 못했지만, 끝까지 가는 것보다 낫다.`;
  }
  // withdraw
  c.state = 'dropped'; c.verdict = '고발을 거뒀다';
  return '고발을 거뒀다. 재판관이 장부의 한 줄을 그었다. 상대는 고맙다는 말 대신 침을 뱉고 갔다.';
}

defineScene('law_trial', {
  need: (g, s) => { const c = caseById(g, s.cid); return !!c && c.state === 'open' && here(g) === c.place && !isJailed(g) && !L(g).travel; },
  title: (g, s) => { const c = caseById(g, s.cid); return `${lawOf(c.place).court}: ${chargeName(c)}`; },
  text: (g, s) => {
    const c = caseById(g, s.cid), Lw = lawOf(c.place);
    const who = c.role === 'accused'
      ? `${c.crime ? `${placeName(c.place)} 경비대가` : J(otherP(c), '이/가')} 나를 ${J(chargeName(c), '으로/로')} 고발했다.`
      : `내가 ${J(otherP(c), '을/를')} ${J(chargeName(c), '으로/로')} 고발했다.`;
    const wit = c.witness ? ` 증인으로 ${J(c.witness, '이/가')} 나왔다.` : '';
    const ln = lean(g, c);
    const mood = ln >= 15 ? ` ${Lw.judge}는 처음부터 나를 곱게 보지 않는다.` : ln <= -5 ? ` ${Lw.judge}는 나에게 예를 갖춘다.` : '';
    return `${Lw.court}. ${who} ${c.role === 'accused' ? '고발하는 쪽은' : '내 쪽은'} ${evidenceWord(c.evidence)}.${wit}${mood} ${Lw.sum}`;
  },
  choices: (g, s) => trialOptions(g, caseById(g, s.cid)),
  resolve(g, rng, s, key) {
    const c = caseById(g, s.cid);
    if (!c || c.state !== 'open') return '재판은 이미 끝나 있었다.';
    if (!trialOptions(g, c).some((o) => o.key === key)) return `그 사이 형편이 달라졌다. ${decide(g, rng, c, 'speak')}`;
    return decide(g, rng, c, key);
  },
});

/* ---------- 체포 장면에 재판을 붙인다 ---------- */
const AR = SCENES.arrest;
if (AR && !AR.lawWrapped) {
  const choices0 = AR.choices, resolve0 = AR.resolve;
  AR.lawWrapped = true;
  AR.choices = (g, s) => {
    const out = choices0(g, s);
    if (crimeState(g).record.some((r) => !r.paid && r.place === here(g))) out.splice(1, 0, { label: '재판을 청한다', key: 'law_trial' });
    return out;
  };
  AR.resolve = (g, rng, s, key) => {
    if (key !== 'law_trial') return resolve0(g, rng, s, key);
    const pl = here(g), cr = crimeState(g);
    const recs = cr.record.filter((r) => !r.paid && r.place === pl);
    if (!recs.length) return resolve0(g, rng, s, 'go');
    const worst = recs.reduce((a, r) => (CRIMES[r.c].sev > CRIMES[a.c].sev ? r : a), recs[0]);
    const c = openCase(g, { role: 'accused', charge: 'crime', crime: true, crimeName: CRIMES[worst.c].name, guilty: true, evidence: 30 + (cr.heat[pl] ?? 0) * 0.4 + recs.length * 5 });
    askTrial(g, c);
    return `"재판을 받겠소." 경비대장이 얼굴을 찌푸렸지만 법은 법이다. ${lawOf(pl).court}에 이름이 올랐다. 재판 날까지 고장을 떠나지 말라는 말을 들었다.`;
  };
}
