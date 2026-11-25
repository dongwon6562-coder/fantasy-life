// 나라 사이 흐름 속의 삶: 봉쇄된 국경에서 짐 뒤지기, 밀수, 사절로서 다툼 달래기, 밀정으로서 밀약 들추기·사건 꾸미기,
// 십인장 이상으로 발하르트 국경을 지키며 참거나 도발하기, 다른 나라에서 겪는 징집. 앞머리 ac_.
// 어느 쪽을 고를지는 플레이어 몫. 내 손이 닿는 건 판을 조금 밀고 당기는 것뿐이다.
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat } from '../game.js';
import { EVENTS, age, here, onRoad, money, stress, injure } from '../events/core.js';
import { L, defineScene, queueScene, sceneQueued, note } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { nudge } from '../world.js';
import { realmOf } from '../realms/index.js';
import { LANDS } from '../politics/data.js';
import { relOf, shiftRel, warsOf, PS } from '../politics/state.js';
import { T, GOODS, cargoList, isMarket } from '../trade/core.js';
import { AS, clamp, mi, short, full, EXPORTS, embargoOf, alog, pair } from './state.js';

const busy = (g) => g.over || g.bondage?.slave || g.crime?.jailed || g.army?.campaign || g.army?.captive || !!L(g).heirPending;
const grown = (g) => age(g) >= 16 && !busy(g);
const settled = (g) => grown(g) && !onRoad(g);
const realmHere = (g) => realmOf(here(g));
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const sk = (g, k) => g.player.skills?.[k] ?? 0;
const st = (g, k) => g.player.stats?.[k] ?? 30;
const mine = (g, text) => { alog(g, text); note(g, text); };

// 이 나라가 봉쇄를 건 상대들
const bansHere = (g, realm = realmHere(g)) => AS(g).embargo.filter((e) => e.by === realm);
// 내 짐 가운데 이 나라 관문에서 걸릴 것 (이 나라도 나는 물건이면 핑계가 된다)
function contraband(g, realm = realmHere(g)) {
  const out = [];
  for (const e of bansHere(g, realm)) for (const [k, c] of cargoList(g)) {
    if ((EXPORTS[e.on] ?? []).includes(k) && !(EXPORTS[realm] ?? []).includes(k) && !out.some((x) => x.k === k)) out.push({ k, qty: c.qty, on: e.on });
  }
  return out;
}

/* ---------- 봉쇄된 국경: 짐 뒤지기 ---------- */
HOOKS.afterMonth.push((g) => {
  if (!g.accord || !g.life || g.over) return;
  const S = AS(g);
  if (onRoad(g)) return;
  const realm = realmHere(g), was = S.searched?.realm ?? null;
  if (was === realm) return;
  S.searched = { realm, at: mi(g) };
  if (!was || busy(g) || age(g) < 14 || sceneQueued(g, 'ac_search')) return;
  const bad = contraband(g, realm);
  if (!bad.length) return;
  queueScene(g, 'ac_search', { realm, on: bad[0].on, goods: bad.map((x) => x.k) });
});
const fineOf = (g, goods) => Math.max(4, Math.round(goods.reduce((s, k) => s + (T(g).cargo[k]?.qty ?? 0) * (GOODS[k]?.base ?? 10), 0) * 0.15));
const dropGoods = (g, goods) => { let n = 0; for (const k of goods) { n += T(g).cargo[k]?.qty ?? 0; delete T(g).cargo[k]; } return n; };
defineScene('ac_search', {
  need: (g, s) => !onRoad(g) && realmHere(g) === s.realm && !!embargoOf(g, s.realm, s.on) && s.goods.some((k) => T(g).cargo[k]?.qty > 0),
  title: () => '관문의 짐 검사',
  text: (g, s) => `${short(s.realm)} 관문 병사들이 짐을 풀라고 했다. ${J(full(s.realm), '은/는')} ${short(s.on)}에 봉쇄를 걸었다. 내 짐의 ${J(s.goods.map((k) => GOODS[k].name).join('·'), '이/가')} ${short(s.on)} 물건처럼 보인다고 한다. 뇌물 받는 얼굴인지는 아직 모르겠다.`,
  choices: (g, s) => {
    const out = [];
    if (money(g) >= fineOf(g, s.goods)) out.push({ label: `은화 ${fineOf(g, s.goods)}닢을 슬쩍 쥐여 준다`, key: 'bribe' });
    out.push({ label: '우리 나라 물건이라고 우긴다', key: 'talk' });
    out.push({ label: '짐을 내주고 지나간다', key: 'give' });
    out.push({ label: '밤에 샛길로 돌아간다', key: 'sneak' });
    return out;
  },
  resolve(g, rng, s, key) {
    const S = AS(g), fine = fineOf(g, s.goods);
    if (key === 'bribe') {
      g.player.money -= fine;
      if (rng.chance(0.8)) return `병사는 동전을 세지도 않고 주머니에 넣었다. "이건 ${short(s.realm)} 소금이군." 짐마차가 관문을 지났다.`;
      const n = dropGoods(g, s.goods); L(g).notoriety = (L(g).notoriety ?? 0) + 2;
      return `하필 그날 관문엔 감찰관이 나와 있었다. 은화도 짐 ${n}짐도 다 빼앗겼다. 내 이름이 관문 장부에 적혔다.`;
    }
    if (key === 'talk') {
      const odds = clamp(0.25 + sk(g, 'trade') / 160 + st(g, 'cha') / 300, 0.15, 0.8);
      gainSkill(g, 'trade', 0.3);
      if (rng.chance(odds)) return '말에는 자신이 있었다. 산지 이름을 줄줄 대고, 포대에 찍힌 낙인이 왜 그렇게 생겼는지까지 풀었다. 병사는 귀찮다는 듯 손을 저었다.';
      const n = dropGoods(g, s.goods), f = Math.min(money(g), Math.round(fine / 2));
      g.player.money -= f; stress(g, 4);
      return `거짓말이 길어질수록 병사 얼굴이 굳었다. 짐 ${n}짐을 빼앗기고 벌금으로 은화 ${f}닢을 냈다.`;
    }
    if (key === 'give') { const n = dropGoods(g, s.goods); stress(g, 2); return `짐 ${n}짐을 관문 창고에 두고 왔다. 저 짐은 봉쇄가 풀리는 날까지 거기 있거나, 병사들 술값이 될 것이다.`; }
    const odds = clamp(0.4 + st(g, 'agi') / 250 + st(g, 'sen') / 300, 0.3, 0.85);
    g.player.fatigue = Math.min(100, (g.player.fatigue ?? 0) + 18);
    if (rng.chance(odds)) { S.me.smuggled += 1; return '해가 지기를 기다렸다가 강 여울을 건넜다. 발이 얼었지만 짐은 하나도 젖지 않았다. 이렇게 넘는 사람이 나 하나가 아니라는 것도 알았다.'; }
    const n = dropGoods(g, s.goods); if (rng.chance(0.5)) injure(g, '여울에서 미끄러져 다리를 다쳤다', 2);
    return `순찰대 횃불에 들켰다. 짐 ${n}짐을 버리고 몸만 빠져나왔다.`;
  },
});

/* ---------- 밀수: 봉쇄가 걸린 나라 장터에서 ---------- */
const smuggleOn = (g) => { const b = bansHere(g); return b.length ? b[0].on : null; };
ACTIONS.push({
  id: 'ac_smuggle',
  name: '봉쇄 물건 몰래 들이기',
  icon: 'coin',
  desc: '봉쇄로 막힌 나라 물건을 샛길로 들여와 비싸게 넘긴다. 들키면 벌금과 오명.',
  available: (g) => settled(g) && !!g.accord && isMarket(here(g)) && !!smuggleOn(g) && AS(g).smugAt !== mi(g) && (sk(g, 'trade') >= 10 || (g.crime?.crimes ?? 0) > 0 || cargoList(g).length > 0),
  run(g, rng) {
    const S = AS(g), on = smuggleOn(g);
    if (!on) return '봉쇄가 풀려서 몰래 들일 까닭이 없어졌다.';
    S.smugAt = mi(g);
    const good = rng.pick(EXPORTS[on]), caught = clamp(0.2 - sk(g, 'trade') / 500 - st(g, 'sen') / 600, 0.06, 0.25);
    if (rng.chance(caught)) {
      const f = Math.min(money(g), rng.int(10, 25));
      g.player.money -= f; L(g).notoriety = (L(g).notoriety ?? 0) + 3; stress(g, 6);
      return `${short(on)} ${J(GOODS[good].name, '을/를')} 실은 수레가 성문에서 걸렸다. 벌금 은화 ${f}닢을 냈다. 장터 사람들이 나를 보는 눈이 달라졌다.`;
    }
    const pay = Math.round(GOODS[good].base * rng.int(6, 12) / 10 * (1 + sk(g, 'trade') / 120));
    g.player.money += pay; gainSkill(g, 'trade', 0.4);
    S.me.smuggled += 1; PS(g).me.smuggled = (PS(g).me.smuggled ?? 0) + 1;
    if (S.me.smuggled === 10) { renown(g, 1); mine(g, `${short(realmHere(g))} 봉쇄 아래에서 밀수로 이름이 났다. 뒷골목에선 나를 찾는 사람이 생겼다.`); }
    return `${short(on)}에서 온 ${J(GOODS[good].name, '을/를')} 생선 상자 밑에 숨겨 들였다. 봉쇄로 값이 뛴 터라 은화 ${pay}닢이 남았다.`;
  },
});

/* ---------- 사절: 다툼 달래기, 봉쇄 풀기 ---------- */
const leads = (g) => { const p = g.envoy?.post; return p && (p.role === 'envoy' || p.role === 'head') ? p : null; };
function mediateTarget(g) {
  const p = leads(g); if (!p) return null;
  const S = AS(g), r = p.realm;
  const d = S.disputes.filter((x) => (x.a === r || x.b === r) && x.heat >= 30).sort((a, b) => b.heat - a.heat)[0];
  if (d) return { kind: 'dispute', d };
  const e = S.embargo.find((x) => x.by === r || x.on === r);
  return e ? { kind: 'embargo', e } : null;
}
ACTIONS.push({
  id: 'ac_mediate',
  name: '이웃 나라와 담판',
  icon: 'seal',
  desc: '사절로서 이웃 나라 궁정에 가서 국경 다툼을 달래거나 봉쇄를 풀자고 설득한다.',
  available: (g) => settled(g) && !!g.accord && !!mediateTarget(g) && mi(g) - (AS(g).medAt ?? -99) >= 6,
  run(g, rng) {
    const S = AS(g), t = mediateTarget(g), p = leads(g);
    if (!t) return '담판할 일이 없었다.';
    S.medAt = mi(g);
    const other = t.kind === 'dispute' ? (t.d.a === p.realm ? t.d.b : t.d.a) : (t.e.by === p.realm ? t.e.on : t.e.by);
    const tongue = g.envoy?.tongues ? Math.max(0, ...Object.values(g.envoy.tongues)) : 0;
    const odds = clamp(0.3 + sk(g, 'letters') / 250 + st(g, 'cha') / 250 + tongue / 400 + (p.role === 'head' ? 0.1 : 0) + relOf(g, p.realm, other) / 300, 0.1, 0.85);
    gainSkill(g, 'letters', 0.3); gainStat(g, 'cha', 0.2);
    if (!rng.chance(odds)) {
      stress(g, 5);
      if (t.kind === 'dispute') t.d.heat = clamp(t.d.heat + 6, 0, 100);
      return `${short(other)} 궁정은 나를 사흘이나 기다리게 했다. 마주 앉아서도 서로 지난 일만 꺼냈다. 빈손으로 돌아왔다. 돌아오는 길에 들으니 국경 분위기가 더 험해졌다고 한다.`;
    }
    S.me.mediated += 1; shiftRel(g, p.realm, other, 6); renown(g, 2);
    p.wins = (p.wins ?? 0) + 1;
    if (t.kind === 'dispute') {
      const land = LANDS[t.d.land]?.name ?? '국경';
      t.d.heat = clamp(t.d.heat - rng.int(25, 40), 0, 100);
      mine(g, `${land} 다툼을 두고 ${short(other)} 사절과 담판을 지었다. 양쪽 병사들이 한 걸음씩 물러섰다.`);
      return `${J(land, '을/를')} 두고 밤새 지도를 폈다 접었다 했다. 결국 시냇물 한 줄기를 경계로 삼자는 데까지 왔다. 양쪽 병사들이 한 걸음씩 물러섰다.`;
    }
    S.embargo = S.embargo.filter((x) => x !== t.e);
    mine(g, `${J(full(t.e.by), '이/가')} ${full(t.e.on)}에 걸었던 봉쇄를 담판 끝에 풀었다.`);
    return `관세를 조금 올리는 대신 봉쇄를 풀자고 했다. 상인 조합이 내 편을 들어 주었다. ${J(full(t.e.by), '이/가')} 봉쇄를 거두었다. 국경 관문에 다시 짐마차가 줄을 섰다.`;
  },
});

/* ---------- 밀정: 밀약 들추기, 사건 꾸미기 ---------- */
const spyOrg = (g) => g.spy?.org ?? null;
const secretFor = (g) => { const o = spyOrg(g); return o ? AS(g).secrets.find((s) => s.against === o.realm || s.a === o.realm || s.b === o.realm) ?? AS(g).secrets[0] ?? null : null; };
const disputeFor = (g) => { const o = spyOrg(g); return o ? AS(g).disputes.find((d) => d.a !== o.realm && d.b !== o.realm && (relOf(g, o.realm, d.a) < -15 || relOf(g, o.realm, d.b) < -15)) ?? null : null; };
ACTIONS.push({
  id: 'ac_spy',
  name: '나라 사이 공작',
  icon: 'eye',
  desc: '밀정으로서 이웃 나라들 사이 밀약을 들추거나 국경에 사건을 꾸민다.',
  available: (g) => settled(g) && !!g.accord && !!spyOrg(g) && (spyOrg(g).rank ?? 0) >= 1 && !sceneQueued(g, 'ac_spywork') && mi(g) - (AS(g).spyAt ?? -99) >= 4 && (!!secretFor(g) || !!disputeFor(g)),
  run(g) { AS(g).spyAt = mi(g); queueScene(g, 'ac_spywork', {}); return '접선 장소에서 쪽지를 받았다. 이웃 나라들 사이에 쓸 만한 틈이 있다고 한다.'; },
});
defineScene('ac_spywork', {
  need: (g) => !!spyOrg(g),
  title: () => '이웃 나라 사이의 틈',
  text: (g) => {
    const s = secretFor(g), d = disputeFor(g), o = spyOrg(g);
    const a = s ? `${J(short(s.a), '과/와')} ${short(s.b)} 사이에 오가는 밤 사절이 있다. ${short(s.against)} 몰래.` : '';
    const b = d ? `${J(LANDS[d.land]?.name ?? '국경', '을/를')} 두고 ${J(short(d.a), '과/와')} ${short(d.b)}의 날이 서 있다. 불씨 하나면 번질 것이다.` : '';
    return `${o.name}의 연락책이 탁자 위에 두 가지를 올려놓았다. ${a} ${b}`.trim();
  },
  choices: (g) => {
    const out = [];
    if (secretFor(g)) out.push({ label: '밀약 문서를 훔쳐 세상에 흘린다', key: 'expose' });
    if (disputeFor(g)) out.push({ label: '국경에서 사건을 꾸민다', key: 'forge' });
    out.push({ label: '알고만 있고 덮어 둔다', key: 'leave' });
    return out;
  },
  resolve(g, rng, s, key) {
    const S = AS(g), o = spyOrg(g), v = g.spy;
    if (key === 'leave') return '쪽지를 화로에 넣었다. 모든 틈을 다 벌릴 필요는 없다. 아는 것만으로 쓸모가 있을 때도 있다.';
    const odds = clamp(0.4 + st(g, 'sen') / 250 + st(g, 'agi') / 300 + (o.trained ?? 0) / 300, 0.2, 0.85);
    const ok = rng.chance(odds);
    if (v) v.heat = clamp((v.heat ?? 0) + (ok ? 6 : 15), 0, 100);
    if (key === 'expose') {
      const sec = secretFor(g); if (!sec) return '밀약은 이미 깨진 뒤였다.';
      if (!ok) { stress(g, 6); return '문서함 자물쇠를 따다가 발소리를 들었다. 창문으로 빠져나왔다. 그쪽 궁정이 경비를 늘렸다는 소식이 들렸다.'; }
      sec.push = 1; S.me.exposed += 1; if (o) o.trust = clamp((o.trust ?? 0) + 6, -30, 100);
      mine(g, `${J(short(sec.a), '과/와')} ${short(sec.b)}의 밀약 문서를 훔쳐 흘렸다.`);
      return `밀약 문서 사본 셋을 떴다. 하나는 ${short(sec.against)} 궁정으로, 하나는 장터 필사쟁이에게. 한 달 안에 온 대륙이 알게 될 것이다.`;
    }
    const d = disputeFor(g); if (!d) return '그 국경은 이미 잠잠해졌다.';
    if (!ok) { stress(g, 6); if (rng.chance(0.4)) injure(g, '국경 수비대 화살이 어깨를 스쳤다', 2); return `${LANDS[d.land]?.name ?? '국경'} 쪽 초소에 불을 지르려다 들켰다. 간신히 빠져나왔다.`; }
    d.push = (d.push ?? 0) + rng.int(14, 22); S.me.forged += 1; if (o) o.trust = clamp((o.trust ?? 0) + 4, -30, 100);
    mine(g, `${LANDS[d.land]?.name ?? '국경'} 다툼에 불씨를 던졌다. ${short(d.a)} 화살을 ${short(d.b)} 초소에 남겼다.`);
    return `${short(d.a)} 순찰대 화살 몇 대를 ${short(d.b)} 초소 마구간 벽에 박아 두었다. 아침이 되자 두 나라 병사들이 서로 손가락질을 했다. 누구도 나를 보지 못했다.`;
  },
});

/* ---------- 군인: 발하르트 국경 순찰 ---------- */
EVENTS.push({
  id: 'ac_patrol', cooldown: 10,
  cond: (g) => !!g.accord && !busy(g) && !onRoad(g) && !!g.army?.service && (g.army.service.rank ?? 0) >= 2 && !!g.realm?.balhart && !g.realm.balhart.war && g.realm.balhart.tension >= 35,
  chance: (g) => 0.05 + (g.realm.balhart.tension - 35) / 600,
  weight: 14,
  title: '국경 초소의 밤',
  text: () => '부하들을 데리고 발하르트 쪽 국경 초소를 지키는 밤이다. 강 건너 발하르트 병사들이 일부러 횃불을 흔들고, 우리 쪽을 향해 욕을 한다. 부하 하나가 활시위를 당긴 채 내 얼굴을 본다.',
  choices: [
    { label: '활을 내리게 한다', run: (g) => { nudge(g, 'tension', -3); AS(g).me.patrols += 1; gainStat(g, 'wil', 0.3); return '"쏘지 마라." 부하가 이를 갈며 활을 내렸다. 새벽이 오자 강 건너 횃불도 꺼졌다. 이런 밤이 쌓여 전쟁이 늦춰진다.'; } },
    { label: '한 대 쏘아 겁을 준다', run: (g, rng) => { nudge(g, 'tension', 6); AS(g).me.patrols += 1; renown(g, 1); g.army.service.merit = (g.army.service.merit ?? 0) + 4; return rng.chance(0.3) ? '화살이 횃불을 든 병사의 다리를 꿰었다. 강 건너가 소란해졌다. 이 일은 두 궁정까지 올라갈 것이다.' : '화살이 강 건너 말뚝에 꽂혔다. 횃불이 우르르 물러났다. 부하들이 웃었다. 위에서는 좋아하지 않을 것이다.'; } },
    { label: '강 건너 초소장에게 술을 보낸다', run: (g) => { nudge(g, 'tension', -1); AS(g).me.patrols += 1; return '술 한 동이를 작은 배에 실어 보냈다. 이튿날 빈 동이가 돌아왔다. 안에 발하르트 담배 한 줌이 들어 있었다. 위에서 알면 경을 칠 일이다.'; } },
  ],
});

/* ---------- 다른 나라의 징집 ---------- */
const levyCause = (g) => {
  const r = realmHere(g);
  if (r === 'leonia' || !r) return null;
  const w = warsOf(g, r)[0];
  if (w) return { r, foe: w.a === r ? w.b : w.a, war: true };
  const d = AS(g).disputes.find((x) => (x.a === r || x.b === r) && x.heat >= 85);
  return d ? { r, foe: d.a === r ? d.b : d.a, war: false } : null;
};
EVENTS.push({
  id: 'ac_levy', cooldown: 30,
  cond: (g) => !!g.accord && settled(g) && age(g) <= 45 && !g.army?.service && !g.player.title && !!levyCause(g),
  chance: (g) => (levyCause(g)?.war ? 0.06 : 0.03),
  weight: 16,
  prepare: (g) => levyCause(g),
  title: '이 나라의 징집',
  text: (g, c) => `${short(c.r)} 관리가 장터에 방을 붙였다. ${c.war ? `${short(c.foe)}과 싸우는 전쟁에` : `${short(c.foe)} 쪽 국경을 지키는 데`} 이 고장에 사는 장정을 모은다고 한다. 내 이름도 명부에 올라 있다. 이 나라 사람이 아니어도 여기 산다면 마찬가지라고 한다.`.replace(`${short(c.foe)}과`, J(short(c.foe), '과/와')),
  choices: [
    { label: '석 달 성벽을 지킨다', run: (g, rng, c) => {
      g.player.fatigue = Math.min(100, (g.player.fatigue ?? 0) + 30); stress(g, 6); AS(g).me.levied += 1;
      const pay = rng.int(6, 12); g.player.money += pay; renown(g, 1); shiftRel(g, c.r, 'leonia', 0.5);
      if (c.war && rng.chance(0.3)) injure(g, '성벽 위에서 날아온 돌에 맞았다', 2);
      note(g, `${short(c.r)}에 살 때 징집되어 석 달 성벽을 지켰다.`);
      return `석 달 동안 남의 나라 성벽 위에서 창을 들었다. 품삯 은화 ${pay}닢을 받았다. 같이 선 사람들이 이제 나를 이 고장 사람으로 대한다.`;
    } },
    { label: '돈을 내고 빠진다', show: (g) => money(g) >= 20, run: (g, rng) => { const n = rng.int(15, 20); g.player.money -= n; return `은화 ${n}닢을 내고 명부에서 이름을 지웠다. 돈 없는 이웃들이 줄지어 성문을 나서는 것을 보았다.`; } },
    { label: '숨어 지낸다', run: (g, rng) => {
      if (rng.chance(0.6 + st(g, 'sen') / 400)) { stress(g, 4); return '한 달 동안 다락방에서 지냈다. 관리들은 다른 이름을 찾아갔다.'; }
      const n = Math.min(money(g), rng.int(10, 20)); g.player.money -= n; L(g).notoriety = (L(g).notoriety ?? 0) + 2;
      return `숨은 곳이 들켰다. 벌금 은화 ${n}닢을 물고, 동네에 징집을 피한 사람이라는 말이 돌았다.`;
    } },
  ],
});

// 대를 이으면: 내 손으로 한 일 기록은 새로 (나라 사이 판은 그대로 남는다)
HOOKS.heir.push((g) => { if (!g.accord) return; const m = g.accord.me; for (const k of Object.keys(m)) m[k] = 0; g.accord.smugAt = null; g.accord.medAt = -99; g.accord.spyAt = -99; });

export { contraband, mediateTarget, secretFor, disputeFor, levyCause, pair };
