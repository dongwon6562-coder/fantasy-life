// 큰 상회로 키우기, 상단끼리 다툼.
// - 상회는 game.trade.house에 있고, 세계의 상단 목록(src/history/의 H(g).companies)에도 이름을 올린다(player: true, trade: true).
//   세상 형편(fortune)이 상회의 지점 벌이를 움직이고, 세상의 상단처럼 흥하거나 망한다.
// - 가게로 세운 내 상단(src/craft/company.js의 ownCompany)이 있으면 그 상단을 장사 길 상회로 키울 수 있다(이중으로 세우지 않는다).
// - 장사가 커지면 다른 상단이 맞수가 되어 값 후려치기, 수레 망가뜨리기, 호위 빼 가기, 길드 손쓰기, 사들이기 제의를 한다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill, me } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, gains, up, stress, check, isAdult } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { H } from '../history/state.js';
import { C as craftState } from '../craft/core.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { T, HOUSE_RANKS, CARAVAN_TOWNS, mi, clamp, here, free, logTrade, tradeSkill, loseCargo, cargoQty } from './core.js';

const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const FOUND_HOUSE = 400;
export const FOUND_PROFIT = 300;
export const companies = (g) => H(g)?.companies ?? [];
export const houseCompany = (g) => { const h = T(g).house; return h ? companies(g).find((c) => c.id === h.id) ?? null : null; };
export const branchCost = (g, pl = here(g)) => Math.round(200 * (PLACES[pl]?.wage ?? 1));
export const levelCost = (lv) => lv * 300;
export const levelProfit = (lv) => lv * 600;
export const houseIncome = (g) => {
  const h = T(g).house, co = houseCompany(g);
  if (!h || !co) return 0;
  return Math.round(h.branches.reduce((s, pl) => s + (PLACES[pl]?.wage ?? 1) * (3 + h.level * 2), 0) * (co.fortune / 50));
};
export const canLevel = (g) => {
  const h = T(g).house;
  return !!h && h.level < 5 && h.branches.length >= h.level && T(g).profit >= levelProfit(h.level) && g.player.money >= levelCost(h.level);
};
const linkable = (g) => {
  const own = craftState(g)?.ownCompany;
  return own && companies(g).some((c) => c.id === own.id) ? own : null;
};
const canHouse = (g) => isAdult(g) && free(g) && CARAVAN_TOWNS.includes(here(g)) && (!!T(g).house || T(g).profit >= FOUND_PROFIT || !!linkable(g));

/* ---------- 상회 ---------- */
ACTIONS.push({
  id: 'trade_house',
  name: '상회를 꾸린다',
  icon: 'coin',
  desc: '장사로 모은 돈과 이름으로 상회를 세우고, 고장마다 지점을 낸다. 상회가 크면 지점이 돈을 벌어 오고 통행세도 깎인다. 세상의 상단들처럼 흥하기도, 망하기도 한다.',
  available: (g) => canHouse(g) && !sceneQueued(g, 'trade_house'),
  run(g) { queueScene(g, 'trade_house'); return '상단 거리의 장부 냄새 속에서 셈을 했다.'; },
});
defineScene('trade_house', {
  need: (g) => canHouse(g),
  title: (g) => T(g).house?.name ?? '내 이름을 건 상회',
  text: (g) => {
    const t = T(g), h = t.house;
    if (!h) {
      const own = linkable(g);
      return `장사로 남긴 돈이 은화 ${Math.round(t.profit)}닢에 이르렀다. 창고와 서기, 지점을 갖춘 상회를 세우면 큰 상단들과 어깨를 겨룰 수 있다. 은화 ${FOUND_HOUSE}닢이 든다.${own ? ` 가게로 세운 ${J(own.name, '을/를')} 장사 길 상회로 키울 수도 있다.` : ''}`;
    }
    const co = houseCompany(g);
    const br = h.branches.length ? h.branches.map(placeName).join(', ') : '아직 없다';
    const next = h.level < 5 ? ` 다음 걸음(${HOUSE_RANKS[h.level + 1]})에는 지점 ${h.level}곳, 장사로 남긴 돈 은화 ${levelProfit(h.level)}닢, 밑천 은화 ${levelCost(h.level)}닢이 든다.` : '';
    return `${h.name}: ${HOUSE_RANKS[h.level]}. 지점: ${br}. 형편은 ${co ? (co.fortune >= 65 ? '금고가 넘친다' : co.fortune >= 40 ? '탄탄하다' : co.fortune >= 22 ? '어렵다' : '위태롭다') : '알 수 없다'}. 지점이 달마다 은화 ${houseIncome(g)}닢쯤을 벌어 온다. 장사로 남긴 돈은 은화 ${Math.round(T(g).profit)}닢.${next}`;
  },
  choices: (g) => {
    const t = T(g), h = t.house, out = [], m = g.player.money, pl = here(g);
    if (!h) {
      if (t.profit >= FOUND_PROFIT && m >= FOUND_HOUSE) out.push({ label: `상회를 세운다 (은화 ${FOUND_HOUSE}닢)`, key: 'found' });
      const own = linkable(g);
      if (own && m >= 150) out.push({ label: `${J(own.name, '을/를')} 장사 길 상회로 키운다 (은화 150닢)`, key: 'link' });
      out.push({ label: '아직 이르다', key: 'no' });
      return out;
    }
    if (!h.branches.includes(pl) && m >= branchCost(g)) out.push({ label: `${placeName(pl)}에 지점을 낸다 (은화 ${branchCost(g)}닢)`, key: 'branch' });
    if (canLevel(g)) out.push({ label: `${HOUSE_RANKS[h.level + 1]}${J(HOUSE_RANKS[h.level + 1], '으로/로').slice(HOUSE_RANKS[h.level + 1].length)} 키운다 (은화 ${levelCost(h.level)}닢)`, key: 'level' });
    out.push({ label: '장부를 살핀다', key: 'books' });
    if (h.branches.includes(pl) && h.branches.length > 1) out.push({ label: `${placeName(pl)} 지점을 닫는다`, key: 'close' });
    out.push({ label: '그만둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const t = T(g), pl = here(g);
    if (key === 'found' || key === 'link') {
      const hist = H(g);
      if (!hist) return '상단 거리의 서기들이 고개를 저었다.';
      let co;
      if (key === 'link') {
        const own = linkable(g);
        if (!own || g.player.money < 150) return '장부가 맞지 않아 다음으로 미뤘다.';
        g.player.money -= 150;
        co = companies(g).find((c) => c.id === own.id);
        co.trade = true;
      } else {
        if (g.player.money < FOUND_HOUSE) return '밑천이 모자랐다.';
        g.player.money -= FOUND_HOUSE;
        const name = `${me(g).lastName} 상회`;
        co = { id: `t${g.date.year}_${hist.founded ?? 0}`, name: companies(g).some((c) => c.name === name) ? `${me(g).lastName} 대상회` : name, kind: 'caravan', fortune: 36, peak: 36, founded: g.date.year, founder: { name: g.player.name, lastName: me(g).lastName, pid: g.player.id }, player: true, trade: true };
        hist.companies.push(co);
        hist.founded = (hist.founded ?? 0) + 1;
      }
      t.house = { id: co.id, name: co.name, level: 1, branches: [pl], since: g.date.year };
      L(g).renown = (L(g).renown ?? 0) + 5;
      chron(g, `${g.player.name}, ${placeName(pl)}에 ${J(co.name, '을/를')} 세우다.`, 90);
      note(g, `${J(co.name, '을/를')} 세웠다.`);
      logTrade(g, `${J(co.name, '을/를')} 세웠다.`);
      return `${placeName(pl)} 상단 거리에 ${co.name}의 간판이 걸렸다. 서기 둘과 창고 하나, 마구간 하나. 은저울 상단의 대리인이 축하 술을 보내왔다. 축하인지 경고인지는 알 수 없었다.`;
    }
    const h = t.house;
    if (!h) return '셈만 하다 일어섰다.';
    if (key === 'branch' && g.player.money >= branchCost(g) && !h.branches.includes(pl)) {
      g.player.money -= branchCost(g);
      h.branches.push(pl);
      const co = houseCompany(g); if (co) co.fortune = clamp(co.fortune + 3, 0, 100);
      logTrade(g, `${placeName(pl)}에 지점을 냈다.`);
      note(g, `${h.name}의 ${placeName(pl)} 지점을 열었다.`);
      return `${placeName(pl)}의 골목 끝 창고를 빌려 ${h.name}의 지점을 열었다. 이 고장 서기를 하나 두었다. 이제 이 성문에서는 통행세가 절반이다.`;
    }
    if (key === 'level' && canLevel(g)) {
      g.player.money -= levelCost(h.level);
      h.level += 1;
      const co = houseCompany(g); if (co) co.fortune = clamp(co.fortune + 6, 0, 100);
      L(g).renown = (L(g).renown ?? 0) + h.level * 3;
      chron(g, `${J(h.name, '이/가')} ${HOUSE_RANKS[h.level]}${h.level >= 4 ? '가 되어 왕국의 돈줄을 쥐다' : '가 되다'}.`, h.level >= 3 ? 90 : 60);
      note(g, `${J(h.name, '이/가')} ${HOUSE_RANKS[h.level]}가 되었다.`);
      logTrade(g, `${J(h.name, '이/가')} ${HOUSE_RANKS[h.level]}가 되었다.`);
      const line = ['', '', '창고가 셋으로 늘었다. 서기들이 밤늦게까지 주판을 놓는다.', '귀족들이 내 상회의 어음을 받기 시작했다. 내 도장이 은화만큼 통한다.', '왕궁 재무관이 몸소 찾아와 군량을 대 줄 수 있느냐고 물었다.', '왕국의 어느 장터에서든 내 상회의 깃발을 볼 수 있다. 이제 시세를 따르는 것이 아니라 시세를 만든다.'][h.level];
      return `${h.name}${J(h.name, '이/가').slice(h.name.length)} ${HOUSE_RANKS[h.level]}가 되었다. ${line}`;
    }
    if (key === 'close' && h.branches.includes(pl) && h.branches.length > 1) {
      h.branches.splice(h.branches.indexOf(pl), 1);
      g.player.money += Math.round(branchCost(g) / 3);
      logTrade(g, `${placeName(pl)} 지점을 닫았다.`);
      return `${placeName(pl)} 지점의 간판을 내렸다. 서기는 울면서 장부를 넘겼다.`;
    }
    if (key === 'books') {
      const sk = gainSkill(g, 'trade', 1.0, 'int');
      const co = houseCompany(g);
      const rival = t.rival ? ` 맞수 ${J(t.rival.name, '이/가')} 우리 장부를 엿본다는 소문도 있다.` : '';
      return `밤새 장부를 넘겼다. ${co && co.fortune < 30 ? '빚 장부가 두껍다. 이대로 가면 위험하다.' : '숫자는 거짓말을 하지 않는다. 남는 데와 새는 데가 보였다.'}${rival}${gains([up('장사', sk)])}`;
    }
    return '장부를 덮었다.';
  },
});

/* ---------- 상단끼리 다툼 ---------- */
const RIVAL_KINDS = ['undercut', 'sabotage', 'poach', 'guild', 'thugs', 'buyout'];
const rivalCo = (g) => { const r = T(g).rival; return r ? companies(g).find((c) => c.id === r.id) ?? null : null; };
export const RIVAL_EVENTS = RIVAL_KINDS;

defineScene('trade_rival', {
  need: (g, s) => !!T(g).rival && !!rivalCo(g) && (s.ev !== 'buyout' || !!T(g).house) && (s.ev !== 'poach' || T(g).caravan.guards > 0),
  title: (g) => `맞수 ${T(g).rival.name}`,
  text: (g, s) => {
    const r = T(g).rival, h = T(g).house;
    const mineName = h?.name ?? '내 장사';
    return {
      undercut: `${J(r.name, '이/가')} 내가 짐을 푸는 장터마다 먼저 와서 값을 후려친다. 손해를 보면서도 버티는 걸 보니, ${J(mineName, '을/를')} 말려 죽일 셈이다.`,
      sabotage: `아침에 창고에 가 보니 짐수레 바퀴가 모두 빠져 있고, 짐 몇 짐이 물에 젖어 있었다. 경비는 밤새 아무것도 못 봤다고 한다. 거리에는 ${r.name}의 사람이 어젯밤 술을 돌렸다는 말이 돈다.`,
      poach: `${J(r.name, '이/가')} 내 호위들에게 웃돈을 주겠다며 사람을 보냈다. 호위들이 나를 힐끔거린다.`,
      guild: `${J(r.name, '이/가')} 상인 길드에 손을 썼다. "자격 없는 떠돌이 장사꾼"이 ${placeName(here(g))} 장터에 좌판을 펴지 못하게 하자는 안건이 올라왔다.`,
      thugs: `${r.name}의 대리인이 주점에서 칼잡이들에게 은화를 돌렸다는 소문을 들었다. 다음 길에서 나를 기다릴 사람들이다.`,
      buyout: `${r.name}의 주인이 몸소 찾아왔다. "${J(mineName, '을/를')} 통째로 사겠소. 은화 ${s.offer}닢. 이 값은 다시 오지 않소."`,
    }[s.ev];
  },
  choices: (g, s) => {
    const m = g.player.money, lv = T(g).house?.level ?? 1;
    const opts = {
      undercut: [{ label: `값 싸움으로 맞받는다 (은화 ${40 * lv}닢을 건다)`, key: 'fight' }, { label: '다른 길과 다른 장터로 돈다', key: 'avoid' }, { label: '손을 잡자고 청한다', key: 'pact' }],
      sabotage: [{ label: '증거를 모아 영주의 법정에 고발한다', key: 'court' }, { label: '똑같이 갚아 준다', key: 'revenge' }, { label: '이를 악물고 참는다', key: 'endure' }],
      poach: [{ label: `웃돈을 얹어 붙잡는다 (은화 ${T(g).caravan.guards * 6}닢)`, key: 'pay' }, { label: '갈 사람은 가라고 한다', key: 'let' }],
      guild: [{ label: `길드 원로들에게 선물을 돌린다 (은화 ${60 * lv}닢)`, key: 'gift' }, { label: '길드 회의에 나가 따진다', key: 'argue' }, { label: '이 장터는 당분간 버린다', key: 'leave' }],
      thugs: [{ label: '호위를 더 붙이고 길을 바꾼다', key: 'guard' }, { label: '먼저 칼잡이들을 찾아가 웃돈을 준다', key: 'buy' }, { label: '소문일 뿐이다', key: 'ignore' }],
      buyout: [{ label: `판다 (은화 ${s.offer}닢)`, key: 'sell' }, { label: '거절한다', key: 'refuse' }],
    }[s.ev] ?? [{ label: '흘려듣는다', key: 'ignore' }];
    return opts.filter((o) => !(o.key === 'fight' && m < 40 * lv) && !(o.key === 'pay' && m < T(g).caravan.guards * 6) && !(o.key === 'gift' && m < 60 * lv));
  },
  resolve(g, rng, s, key) {
    const t = T(g), r = t.rival, co = rivalCo(g), lv = t.house?.level ?? 1;
    if (!r || !co) return '맞수의 소식은 바람처럼 지나갔다.';
    const mine = houseCompany(g);
    const hit = (n) => { co.fortune = clamp(co.fortune - n, co.pillar ? 18 : 0, 100); r.heat = Math.max(0, r.heat - 1); };
    const hurt = (n) => { if (mine) mine.fortune = clamp(mine.fortune - n, 0, 100); };
    const heat = (n) => { r.heat += n; };
    const sk = gainSkill(g, 'trade', 0.8, 'int');
    const tail = gains([up('장사', sk)]);
    switch (`${s.ev}:${key}`) {
      case 'undercut:fight': {
        if (g.player.money < 40 * lv) return '걸 돈이 모자랐다. 값 싸움은 금고가 깊은 쪽이 이긴다.';
        g.player.money -= 40 * lv;
        const ok = check(rng, tradeSkill(g) + lv * 6 + (mine?.fortune ?? 30) * 0.3, 40 + co.fortune * 0.4);
        if (ok) { hit(12); g.player.money += 30 * lv + rng.int(0, 40); logTrade(g, `${J(r.name, '과/와')}의 값 싸움에서 이겼다.`); return `석 달을 밑지며 버텼다. 먼저 손을 든 것은 ${r.name} 쪽이었다. 장터 상인들이 이제 내 값을 따른다.${tail}`; }
        hurt(6); heat(1); logTrade(g, `${J(r.name, '과/와')}의 값 싸움에서 밀렸다.`);
        return `${r.name}의 금고가 더 깊었다. 건 돈만 날렸다.${tail}`;
      }
      case 'undercut:avoid': stress(g, 4); return `${r.name}의 깃발이 없는 장터를 골라 다녔다. 길은 멀어졌지만 싸움은 피했다.${tail}`;
      case 'undercut:pact': {
        const ok = check(rng, tradeSkill(g) * 0.6 + g.player.stats.cha * 0.5, 50 + r.heat * 5);
        if (ok) { t.pact = { id: r.id, name: r.name, until: mi(g) + 60 }; t.rival = null; logTrade(g, `${J(r.name, '과/와')} 장터를 나누기로 했다.`); note(g, `${J(r.name, '과/와')} 손을 잡았다.`); return `장터를 나누고 서로의 길을 건드리지 않기로 했다. 차가운 악수였지만 약속은 약속이다.${tail}`; }
        heat(1); return `${r.name}의 주인은 웃기만 했다. "손을 잡는 건 이길 수 없는 쪽이 하는 말이오."${tail}`;
      }
      case 'sabotage:court': {
        const ok = check(rng, g.player.stats.int * 0.5 + (g.player.skills.letters ?? 0) * 0.5 + tradeSkill(g) * 0.2, 45);
        if (ok) { hit(15); deed(g, 'honest', 5, '상단의 수레 망가뜨리기를 법정에서 밝혀냈다.'); logTrade(g, `${r.name}의 짓을 법정에서 밝혔다.`); return `${r.name}의 사람이 술김에 떠든 말과 젖은 짐의 자국을 맞춰 법정에 냈다. 영주가 ${r.name}에 벌금을 매겼다.${tail}`; }
        heat(1); return `증거가 모자랐다. ${r.name}의 변호인이 웃으며 법정을 나섰다.${tail}`;
      }
      case 'sabotage:revenge': {
        hit(18); heat(2);
        deed(g, 'kind', -4, '맞수 상단의 창고에 불을 놓았다는 소문이 돈다.');
        if (rng.chance(0.35)) { reportCrime(g, 'assault', here(g), { mult: 0.5 }); logTrade(g, `${r.name}의 창고를 친 일이 들켰다.`); return `사람을 사서 ${r.name}의 창고를 쳤다. 그런데 산 사람 하나가 경비에게 붙잡혔다. 내 이름이 나왔다.`; }
        logTrade(g, `${r.name}의 창고를 쳤다.`);
        return `달 없는 밤, ${r.name}의 창고에서 불길이 올랐다. 누가 그랬는지는 다들 알지만 아무도 말하지 않는다.`;
      }
      case 'sabotage:endure': stress(g, 6); hurt(3); return '바퀴를 다시 끼우고 젖은 짐을 말렸다. 손해는 장부에 적었다. 갚을 날이 올 것이다.';
      case 'poach:pay': if (g.player.money < t.caravan.guards * 6) { t.caravan.guards = Math.floor(t.caravan.guards / 2); return '얹어 줄 웃돈이 모자랐다. 호위 절반이 떠났다.'; } g.player.money -= t.caravan.guards * 6; deed(g, 'generous', 3, '호위들에게 웃돈을 얹어 주었다.'); return '호위들에게 웃돈을 얹어 주었다. 우두머리가 내 어깨를 쳤다. "돈 주는 쪽에 칼이 서는 법이오."';
      case 'poach:let': { const n = Math.ceil(t.caravan.guards / 2); t.caravan.guards -= n; logTrade(g, `호위 ${n}명이 ${J(r.name, '으로/로')} 갔다.`); return `호위 ${n}명이 짐을 챙겨 ${r.name}의 마구간으로 갔다.`; }
      case 'guild:gift': if (g.player.money < 60 * lv) { t.banned[here(g)] = mi(g) + 6; return `돌릴 선물이 모자랐다. 반년 동안 ${placeName(here(g))} 장터에 좌판을 펼 수 없다.`; } g.player.money -= 60 * lv; return '원로들에게 포도주와 비단을 돌렸다. 안건은 다음 회의로, 그다음 회의로 미뤄지다 사라졌다.';
      case 'guild:argue': {
        const ok = check(rng, g.player.stats.cha * 0.6 + tradeSkill(g) * 0.5, 50);
        if (ok) { hit(6); deed(g, 'brave', 3, '길드 회의에서 큰 상단에 맞섰다.'); return `길드 회의에서 ${r.name}의 장부 장난을 짚었다. 원로들이 헛기침을 했다. 안건은 부결되었다.${tail}`; }
        t.banned[here(g)] = mi(g) + 6; stress(g, 6); return `말로는 이겼지만 표로는 졌다. 반년 동안 ${placeName(here(g))} 장터에 좌판을 펼 수 없다.${tail}`;
      }
      case 'guild:leave': t.banned[here(g)] = mi(g) + 6; return `반년 동안 ${placeName(here(g))} 장터는 ${r.name}에 내주기로 했다.`;
      case 'thugs:guard': r.thugs = false; return '호위 둘을 더 붙이고, 다음 길은 남들이 잘 안 쓰는 옛길로 잡았다.';
      case 'thugs:buy': { const amt = 30 + lv * 10; if (g.player.money >= amt) { g.player.money -= amt; r.thugs = false; return `칼잡이 우두머리를 먼저 찾아가 은화 ${amt}닢을 쥐여 주었다. "${r.name} 쪽에는 길을 잘못 들었다고 하겠소."`; } r.thugs = true; return '쥐여 줄 은화가 모자랐다. 우두머리는 어깨만 으쓱했다.'; }
      case 'thugs:ignore': r.thugs = true; return '소문일 뿐이라고 생각했다.';
      case 'buyout:sell': {
        const h = t.house;
        if (!h) return '팔 것이 남아 있지 않았다.';
        g.player.money += s.offer;
        const own = companies(g).find((c) => c.id === h.id);
        if (own) { const list = companies(g); list.splice(list.indexOf(own), 1); co.fortune = clamp(co.fortune + 10, 0, 100); }
        if (craftState(g)?.ownCompany?.id === h.id) craftState(g).ownCompany = null;
        chron(g, `${g.player.name}, ${J(h.name, '을/를')} ${r.name}에 넘기다.`, 80);
        note(g, `${J(h.name, '을/를')} 은화 ${s.offer}닢에 ${r.name}에 넘겼다.`);
        logTrade(g, `${J(h.name, '을/를')} ${r.name}에 팔았다.`);
        t.house = null; t.rival = null;
        return `계약서에 도장을 찍었다. 은화 자루가 탁자 위에 쌓였다. 내 간판이 내려지고 ${r.name}의 깃발이 올라갔다. 이상하게 손이 허전했다.`;
      }
      case 'buyout:refuse': heat(1); return `${r.name}의 주인은 모자를 고쳐 쓰며 일어섰다. "후회할 거요."`;
      default: return '흘려들었다.';
    }
  },
});

/* ---------- 매달: 상회의 벌이, 맞수 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !H(g)) return;
  const t = T(g), h = t.house;
  if (h) {
    const co = houseCompany(g);
    if (!co) {
      // 세상의 상단 목록에서 사라졌다: 망했다
      g.news.unshift({ text: `${J(h.name, '이/가')} 무너졌다. 빚쟁이들이 창고 문을 부수고 들어갔다.`, rel: 100 });
      chron(g, `${g.player.name}의 ${J(h.name, '이/가')} 문을 닫다.`, 85);
      note(g, `${J(h.name, '이/가')} 망했다.`);
      logTrade(g, `${J(h.name, '이/가')} 망했다.`);
      if (t.rival) { chron(g, `${J(t.rival.name, '이/가')} 장사 길 다툼에서 이기다.`, 50); t.rival = null; }
      t.house = null;
    } else {
      // 내가 꾸리는 만큼 상회의 형편이 받쳐진다 (세상 형편도 함께 움직인다)
      const target = 30 + h.level * 9 + h.branches.length * 3 + clamp(t.monthProfit / 25, -10, 12);
      co.fortune = clamp(co.fortune + (target - co.fortune) * 0.08, 0, 100);
      co.peak = Math.max(co.peak ?? 0, co.fortune);
      const inc = houseIncome(g);
      if (inc > 0 && !(craftState(g)?.ownCompany?.id === h.id)) g.player.money += inc;
      else if (inc > 0) g.player.money += Math.round(inc * 0.6); // 가게 상단이 이미 배당을 준다
    }
  }
  // 맞수 생기기
  const big = !!t.house || t.profit >= 500;
  if (!t.rival && big && !(t.pact && t.pact.until > mi(g)) && rng.chance(0.015 + (t.house?.level ?? 0) * 0.01)) {
    const pool = companies(g).filter((c) => !c.player && !c.trade && c.id !== t.pact?.id && ['caravan', 'cloth', 'grain', 'shipping', 'manastone'].includes(c.kind));
    if (pool.length) {
      const c = rng.pick(pool);
      t.rival = { id: c.id, name: c.name, heat: 1, since: mi(g), thugs: false };
      t.rivalCool = 3;
      note(g, `${J(c.name, '이/가')} 내 장사를 눈엣가시로 여기기 시작했다.`);
      logTrade(g, `${J(c.name, '이/가')} 맞수가 되었다.`);
    }
  }
  if (t.pact && t.pact.until <= mi(g)) t.pact = null;
  const r = t.rival;
  if (!r) return;
  const co = rivalCo(g);
  if (!co) {
    chron(g, `${g.player.name}, 장사 길 다툼 끝에 ${J(r.name, '을/를')} 무너뜨리다.`, 80);
    note(g, `맞수 ${J(r.name, '이/가')} 문을 닫았다.`);
    logTrade(g, `맞수 ${J(r.name, '이/가')} 무너졌다.`);
    L(g).renown = (L(g).renown ?? 0) + 6;
    t.rival = null;
    return;
  }
  // 오래 다투지 않으면 식는다
  if (mi(g) - r.since > 36 && r.heat <= 0 && rng.chance(0.1)) { note(g, `${J(r.name, '은/는')} 이제 나를 맞수로 보지 않는다.`); t.rival = null; return; }
  if (t.rivalCool > 0 || sceneQueued(g, 'trade_rival') || !free(g)) return;
  if (!rng.chance(0.12 + r.heat * 0.03)) return;
  const evs = RIVAL_KINDS.filter((e) => (e !== 'buyout' || (t.house && co.fortune > 50)) && (e !== 'poach' || t.caravan.guards > 0) && (e !== 'guild' || CARAVAN_TOWNS.includes(here(g))) && (e !== 'sabotage' || cargoQty(g) > 0 || t.caravan.wagons > 0));
  if (!evs.length) return;
  const ev = rng.pick(evs);
  if (ev === 'sabotage') { loseCargo(g, 0.15); if (t.caravan.wagons && rng.chance(0.3)) t.caravan.wagons -= 1; }
  const offer = ev === 'buyout' ? Math.round((t.house.level * 350 + t.house.branches.length * 150) * ((houseCompany(g)?.fortune ?? 40) / 45)) : 0;
  queueScene(g, 'trade_rival', { ev, offer });
  t.rivalCool = 5;
});

