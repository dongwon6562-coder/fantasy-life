// 길 위의 짐: 도적 떼와 성문 통행세.
import { gainSkill, gainStat } from '../game.js';
import { L, defineScene, note, gains, up, stress, tired, check } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { PLACES } from '../places.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { T, here, cargoQty, cargoValue, cargoWords, loseCargo, tollOf, tollRate, logTrade, tradeSkill } from './core.js';

const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
const stats = (g) => g.player.stats;

/* ---------- 도적 ---------- */
// 내 쪽 힘: 내 싸움 힘(짐승 포함) + 호위
export const caravanPower = (g) => Math.round(playerPower(g) + T(g).caravan.guards * 7 + (T(g).house?.level ?? 0) * 2);
const banditPower = (g, s) => 18 + (s.roll ?? 15) + ((g.realm?.monsters ?? 0) > 55 ? 8 : 0) + (s.thugs ? 15 : 0);

defineScene('trade_bandits', {
  need: (g) => cargoQty(g) > 0,
  title: (g, s) => (s.thugs ? '삯을 받은 칼잡이들' : '길을 막은 도적 떼'),
  text: (g, s) => {
    const c = T(g).caravan;
    const who = s.thugs
      ? '도적 떼치고는 칼이 너무 좋고 말이 너무 적다. 누군가 삯을 주고 보낸 자들이다.'
      : ['쓰러진 나무가 길을 막았다. 숲에서 활을 든 자들이 걸어 나왔다.', '여울목에서 말 탄 자들이 앞뒤를 막았다. 우두머리가 짐수레를 손가락으로 셌다.', '역참이 불타 있었다. 그 연기 너머에서 도적들이 기다리고 있었다.'][(g.date.month + (s.roll ?? 0)) % 3];
    const mine = c.guards ? `내 호위 ${c.guards}명이 칼자루에 손을 얹었다.` : '내 곁에는 칼을 쥘 사람이 없다.';
    return `${who} "짐을 두고 가면 목숨은 붙여 주지." 짐은 ${cargoWords(g)}. ${mine}`;
  },
  choices: (g) => {
    const out = [{ label: T(g).caravan.guards ? '호위들과 맞서 싸운다' : '혼자서라도 맞선다', key: 'fight' }];
    out.push({ label: '짐 일부를 내주고 지나간다', key: 'pay' });
    out.push({ label: '짐을 버리고 달아난다', key: 'flee' });
    if (tradeSkill(g) >= 35 || stats(g).cha >= 45) out.push({ label: '우두머리와 흥정한다', key: 'talk' });
    return out;
  },
  resolve(g, rng, s, key) {
    const t = T(g), c = t.caravan;
    const thug = s.thugs ? ' 칼잡이들이 떠나며 흘린 말로는, 그들을 보낸 것은 다른 상단이다.' : '';
    if (s.thugs && t.rival) t.rival.thugs = false;
    if (key === 'pay') {
      const n = loseCargo(g, 0.25);
      stress(g, 5);
      logTrade(g, `도적에게 짐 ${n}짐을 내주었다.`);
      return `짐 ${n}짐을 길가에 내려놓았다. 도적들은 약속대로 길을 열었다. 이번에는.${thug}`;
    }
    if (key === 'talk') {
      const ok = check(rng, tradeSkill(g) * 0.6 + stats(g).cha * 0.5, 45);
      const sk = gainSkill(g, 'trade', 0.8, 'cha');
      if (ok) {
        const pay = Math.max(5, Math.round(cargoValue(g) * 0.08));
        if (g.player.money >= pay) {
          g.player.money -= pay;
          logTrade(g, `도적 우두머리에게 은화 ${pay}닢을 쥐여 주고 지나갔다.`);
          return `우두머리에게 은화 ${pay}닢을 세어 주었다. 그는 "다음에도 이 길로 오시오. 값은 같소." 하고 웃었다. 짐은 고스란히 남았다.${thug}${gains([up('장사', sk)])}`;
        }
      }
      const n = loseCargo(g, 0.35);
      stress(g, 8);
      logTrade(g, `흥정이 깨져 짐 ${n}짐을 빼앗겼다.`);
      return `말이 길어지자 우두머리가 칼등으로 내 뺨을 쳤다. 짐 ${n}짐이 도적들 말 등으로 옮겨졌다.${thug}${gains([up('장사', sk)])}`;
    }
    if (key === 'flee') {
      const ok = check(rng, stats(g).agi + stats(g).sen * 0.5, 55);
      const n = loseCargo(g, ok ? 0.5 : 0.8);
      let lostWagon = false;
      if (c.wagons && rng.chance(0.4)) { c.wagons -= 1; lostWagon = true; }
      tired(g, 15); stress(g, 10);
      logTrade(g, `도적을 피해 달아나며 짐 ${n}짐${lostWagon ? '과 마차 한 대를' : '을'} 잃었다.`);
      return `${ok ? '수레를 버리고 숲길로 뛰었다. 등 뒤로 화살이 박혔다. 살아서 빠져나왔다.' : '달아나다 붙잡혀 실컷 얻어맞았다.'} 짐 ${n}짐${lostWagon ? '과 마차 한 대를' : '을'} 잃었다.${thug}`;
    }
    // 싸운다
    const mine = caravanPower(g), theirs = banditPower(g, s);
    const win = rng.chance(Math.max(0.1, Math.min(0.92, mine / (mine + theirs))));
    const sw = gainSkill(g, 'sword', 0.6, 'str'), st = gainStat(g, 'str', 0.4);
    tired(g, 15);
    let fallen = 0;
    if (c.guards && rng.chance(win ? 0.3 : 0.6)) { fallen = win ? 1 : Math.min(c.guards, 2); c.guards -= fallen; }
    const lostG = fallen ? ` 호위 ${fallen}명이 돌아오지 못했다.` : '';
    if (win) {
      L(g).stats.fights = (L(g).stats.fights ?? 0) + 1;
      deed(g, 'brave', 6, '짐을 노린 도적 떼를 칼로 물리쳤다.', s.at ?? here(g));
      logTrade(g, `도적 떼를 물리쳤다.${fallen ? ` 호위 ${fallen}명을 잃었다.` : ''}`);
      if (rng.chance(0.3)) g.player.money += 5 + Math.round(theirs / 3);
      return `칼과 칼이 부딪혔다. 도적들이 먼저 물러섰다. 짐은 지켰다.${lostG}${thug}${gains([up('검술', sw), up('힘', st)])}`;
    }
    const n = loseCargo(g, 0.6);
    if (rng.chance(0.4)) g.player.injuries.push({ name: '도적의 칼자국', months: 2 });
    stress(g, 12);
    logTrade(g, `도적에게 져서 짐 ${n}짐을 빼앗겼다.${fallen ? ` 호위 ${fallen}명을 잃었다.` : ''}`);
    note(g, `길에서 도적 떼를 만나 짐을 빼앗겼다.`);
    return `칼을 뽑았지만 그들이 더 많았다. 정신을 차렸을 때 짐 ${n}짐이 사라지고 없었다.${lostG}${thug}${gains([up('검술', sw), up('힘', st)])}`;
  },
});

/* ---------- 통행세 ---------- */
defineScene('trade_toll', {
  need: (g) => cargoQty(g) > 0,
  title: (g) => `${placeName(here(g))}의 성문`,
  text: (g, s) => {
    const pl = here(g), fee = tollOf(g, pl, s.from), rate = Math.round(tollRate(g, pl, s.from) * 100);
    const border = s.from && (PLACES[s.from]?.realm ?? 'leonia') !== (PLACES[pl]?.realm ?? 'leonia');
    const disc = T(g).house?.branches?.includes(pl) ? ' 내 상회 지점이 있는 곳이라 절반만 매겼다.' : '';
    return `세관 관리가 짐을 하나하나 풀어 보았다. ${border ? '나라 경계를 넘어온 짐이라 세가 더 붙는다. ' : ''}짐값의 ${rate}몫, 은화 ${fee}닢이다.${disc} 가진 돈은 은화 ${g.player.money}닢.`;
  },
  choices: (g, s) => {
    const fee = tollOf(g, here(g), s.from), out = [];
    if (g.player.money >= fee) out.push({ label: `통행세를 낸다 (은화 ${fee}닢)`, key: 'pay' });
    else out.push({ label: '돈 대신 짐으로 낸다', key: 'goods' });
    out.push({ label: '값을 깎아 달라고 따진다', key: 'haggle' });
    if (g.player.money >= Math.ceil(fee * 0.4)) out.push({ label: `관리 소매에 은화를 넣어 준다 (은화 ${Math.ceil(fee * 0.4)}닢)`, key: 'bribe' });
    out.push({ label: '밤에 개구멍으로 짐을 들인다', key: 'smuggle' });
    return out;
  },
  resolve(g, rng, s, key) {
    const pl = here(g), fee = tollOf(g, pl, s.from), t = T(g);
    const payGoods = (frac) => { const n = loseCargo(g, frac); logTrade(g, `${placeName(pl)} 성문에서 짐 ${n}짐을 세로 냈다.`); return n; };
    if (key === 'pay' && g.player.money < fee) key = 'goods';
    if (key === 'pay') {
      g.player.money -= fee; t.profit -= fee;
      logTrade(g, `${placeName(pl)} 성문에서 통행세 은화 ${fee}닢을 냈다.`);
      return `은화 ${fee}닢을 세어 주자 관리가 짐마다 붉은 도장을 찍었다.`;
    }
    if (key === 'goods') { const n = payGoods(tollRate(g, pl, s.from) * 1.2); return `가진 돈이 모자라 짐 ${n}짐을 세관 창고에 내려놓았다. 관리는 제일 좋은 것부터 골랐다.`; }
    if (key === 'haggle') {
      const ok = check(rng, tradeSkill(g) * 0.7 + g.player.stats.cha * 0.4, 50);
      const sk = gainSkill(g, 'trade', 0.7, 'cha');
      const amt = Math.round(fee * (ok ? 0.6 : 1.1));
      if (g.player.money >= amt) { g.player.money -= amt; t.profit -= amt; }
      else payGoods(tollRate(g, pl, s.from) * 1.2);
      logTrade(g, `${placeName(pl)} 성문에서 세를 따졌다 (${ok ? '깎았다' : '더 냈다'}).`);
      if (!ok) stress(g, 5);
      return ok ? `장부의 셈이 틀렸다고 짚어 주자 관리가 얼굴을 붉히며 은화 ${amt}닢만 받았다.${gains([up('장사', sk)])}` : `관리가 "성문 앞에서 떠든 값"이라며 은화 ${amt}닢을 받아 갔다.${gains([up('장사', sk)])}`;
    }
    if (key === 'bribe') {
      const amt = Math.min(g.player.money, Math.ceil(fee * 0.4));
      g.player.money -= amt; t.profit -= amt;
      if (rng.chance(0.15)) {
        reportCrime(g, 'fraud', pl, { mult: 0.4 });
        deed(g, 'honest', -6, '성문 관리에게 뇌물을 주다 들켰다.', pl);
        logTrade(g, `${placeName(pl)} 성문에서 뇌물을 주다 들켰다.`);
        return '은화를 받은 관리 뒤에서 감찰관이 지켜보고 있었다. 이름이 장부에 적혔다.';
      }
      logTrade(g, `${placeName(pl)} 성문 관리에게 은화 ${amt}닢을 쥐여 주었다.`);
      return `관리는 은화를 받고 짐을 세지도 않고 도장을 찍었다. 이 성문은 원래 이렇게 돌아간다.`;
    }
    // 몰래 들이기
    const caught = !check(rng, g.player.stats.sen * 0.6 + g.player.stats.agi * 0.5 + tradeSkill(g) * 0.3, 55);
    tired(g, 8);
    if (caught) {
      const n = payGoods(0.4);
      reportCrime(g, 'smuggling', pl, { mult: 0.6 });
      stress(g, 10);
      return `성벽 밑 개구멍에 경비의 등불이 먼저 와 있었다. 짐 ${n}짐을 빼앗기고 이름이 밀수꾼 명부에 올랐다.`;
    }
    logTrade(g, `${placeName(pl)}에 짐을 몰래 들였다.`);
    return '달이 없는 밤, 하수 굴을 따라 짐을 하나씩 들였다. 통행세는 한 닢도 내지 않았다.';
  },
});

