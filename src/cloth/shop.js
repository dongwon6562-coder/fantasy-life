// 재봉사의 삶: 견습으로 들어가 바느질을 배우고, 내 가게를 내고, 귀족 옷과 상복·혼례복 주문을 받고, 길드와 엮인다.
import { ACTIONS } from '../actions.js';
import { registerJob, doWork, WORK } from '../jobs.js';
import { makePerson } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check, gains } from '../adventure/core.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { liveHouses, houseName } from '../history/nobles.js';
import { PLACES } from '../places.js';
import {
  C, here, free, age, mi, clamp, placeName, logCloth, handRank, shopHere, isTailor, fashionDye, boltName, takeBolt,
  FASHIONS, FASHION_IDS, fashionsFor, DYES, TAILOR_TOWNS, GUILD_TOWNS, HAND_RANK, GUILD_MASTERS,
} from './core.js';
import { gainHand, pay } from './life.js';
import { eraOf } from '../world.js';

const SHOP_NAMES = ['은바늘', '붉은 실패', '세 개의 단추', '골무와 가위', '흰 비둘기', '금실', '푸른 소매', '늙은 마름질'];
const nobleHouse = (g, rng) => { const hs = liveHouses(g); return hs.length ? houseName(rng.pick(hs)) : '이름난 귀족가'; };
const Q = (name, pair) => `'${name}'${J(name, pair).slice(name.length)}`;
const sty = (g) => C(g).shop?.style === C(g).fashion.id;

/* ---------- 재봉사 일자리 ---------- */
registerJob('tailor', {
  name: '재봉사', places: TAILOR_TOWNS, skill: null, stat: 'agi', stat2: 'sen', wage: [2, 3, 6, 10], npcJob: 'tailor',
  rankOf: handRank,
  title: (g) => `재봉사 (${HAND_RANK[handRank(g)]})`,
  lines: ['하루 종일 단춧구멍만 꿰맸다.', '스승이 내 바느질 땀을 하나하나 뜯어 다시 하라고 했다.', '손님 어깨에 줄자를 대고 치수를 불렀다.', '가위질을 하다 마름질 선을 비껴 났다. 스승이 아무 말 없이 천값을 장부에 적었다.', '촛불 아래서 귀족 댁 외투의 안감을 댔다.'],
  promote: (g, rk) => ['', '이제 혼자 저고리 한 벌을 지어도 스승이 뜯지 않는다. 품삯이 올랐다.', '재봉사들 사이에서 마름질이 깔끔하다는 말이 돈다. 장인 소리를 듣게 되었다. 내 가게를 낼 만하다.', '내 바느질 땀을 보고 어느 손인지 알아보는 사람들이 생겼다. 명장이라 불린다.'][rk],
  work(g, rng) {
    const first = !C(g).master;
    const m = masterOf(g, rng);
    const out = first ? doWork(g, rng, WORK.tailor, { tire: 12, line: `재봉사 ${m.name}의 가게에 견습으로 들어갔다. 첫날은 바늘에 실 꿰는 것만 했다.` }) : doWork(g, rng, WORK.tailor, { tire: 12 });
    const v = gainHand(g, 1.2);
    const s = C(g);
    if (!s.firstAt) s.firstAt = mi(g);
    // 스승의 가게로 들어오는 주문: 견습은 거들고, 숙련 이상이면 맡는다
    if (mi(g) - s.eventAt >= 4 && rng.chance(0.25) && !sceneQueued(g, 'cloth_order')) queueOrder(g, rng, false);
    if (v <= 0.04) return out;
    return out.endsWith(')') ? `${out.slice(0, -1)}, 솜씨 +${v.toFixed(1)})` : `${out} (솜씨 +${v.toFixed(1)})`;
  },
});
// 스승: 처음 일하러 간 날 정해지는 가게 주인 (인물 수첩에 남는다)
export function masterOf(g, rng) {
  const s = C(g);
  if (s.master && g.people.some((p) => p.id === s.master && p.alive)) return g.people.find((p) => p.id === s.master);
  const p = makePerson(rng, { sex: rng.chance(0.5) ? 'f' : 'm', ageMonths: rng.int(45, 62) * 12, job: 'tailor' });
  p.place = L(g).job?.place ?? here(g); p.known = true; p.affection = rng.int(5, 20); p.role = 'tailor';
  g.people.push(p);
  s.master = p.id;
  return p;
}

/* ---------- 내 가게를 낸다 ---------- */
ACTIONS.push({
  id: 'cloth_shop', name: '재봉 가게를 낸다', icon: 'home',
  desc: '장인 솜씨가 되면 내 가게를 낸다. 왕도·하르펜·제도·성도에서는 길드에 들어야 문을 열 수 있다.',
  available: (g) => free(g) && !C(g).shop && TAILOR_TOWNS.includes(here(g)) && handRank(g) >= 2 && age(g) >= 18 && g.player.money >= 120,
  run(g) {
    if (!sceneQueued(g, 'cloth_open')) queueScene(g, 'cloth_open', {}, { first: true });
    return '비어 있는 가게 자리를 보러 다녔다.';
  },
});
defineScene('cloth_open', {
  need: (g) => !C(g).shop && TAILOR_TOWNS.includes(here(g)),
  title: () => '빈 가게',
  text: (g) => {
    const s = C(g), pl = here(g);
    const guild = GUILD_TOWNS.includes(pl) ? ` 이 고장에서는 재봉 길드에 들어야 간판을 달 수 있다. 길드장 ${J(s.guild.master, '은/는')} 들어오는 값으로 은화 ${s.guild.dues * 3}닢을 받는다.` : ' 이 고장엔 재봉 길드가 없다. 누구든 가위만 있으면 가게를 낸다.';
    return `${placeName(pl)} 장터 골목에 빈 가게가 있다. 앞 주인이 남기고 간 재단대와 낡은 마네킹이 그대로다. 세는 한 달에 은화 몇 닢, 가게를 차리는 데 은화 80닢이 든다.${guild}`;
  },
  choices: (g) => {
    const s = C(g), pl = here(g), m = g.player.money;
    const out = [];
    if (GUILD_TOWNS.includes(pl)) {
      if (m >= 80 + s.guild.dues * 3) out.push({ label: `길드에 들고 가게를 연다 (은화 ${80 + s.guild.dues * 3}닢)`, key: 'guild' });
      out.push({ label: '길드 없이 뒷골목에 연다 (은화 50닢)', key: 'back' });
    } else out.push({ label: '가게를 연다 (은화 80닢)', key: 'open' });
    out.push({ label: '아직은 이르다', key: 'no' });
    return out;
  },
  resolve(g, rng, s0, key) {
    const s = C(g), pl = here(g);
    if (key === 'no') return '재단대를 한 번 쓸어 보고 나왔다.';
    const cost = key === 'guild' ? 80 + s.guild.dues * 3 : key === 'back' ? 50 : 80;
    if (g.player.money < cost) return '셈해 보니 돈이 모자랐다.';
    pay(g, cost);
    const name = SHOP_NAMES[(mi(g) + (g.player.id ?? 0)) % SHOP_NAMES.length];
    s.shop = { place: pl, name, since: g.date.year, rep: key === 'back' ? 10 : 20, owed: [], guild: key !== 'back', back: key === 'back', style: s.fashion.id, apprentice: null };
    if (key === 'guild') s.guild.member = true;
    note(g, `${placeName(pl)}에 재봉 가게 ${Q(name, '을/를')} 냈다.`);
    logCloth(g, `${placeName(pl)}에 '${name}' 가게를 냈다.`);
    chron(g, `${g.player.name}, ${placeName(pl)}에 재봉 가게를 열다.`, 25);
    if (key === 'back') return `뒷골목에 간판도 없이 문을 열었다. 길드 사람들이 지나가며 가게 안을 오래 들여다보았다. 반갑지 않은 눈빛이었다.`;
    return `문 위에 '${name}' 간판을 걸었다. 첫 손님은 단추 하나를 달러 온 노인이었다. 삯을 받지 않았다. 첫 손님에게는 받지 않는 것이 이 바닥의 풍습이다.`;
  },
});

/* ---------- 가게를 본다 ---------- */
ACTIONS.push({
  id: 'cloth_tend', name: '가게를 본다', icon: 'coin',
  desc: '내 재봉 가게에서 손님을 받는다. 솜씨와 이름값, 유행을 따르는지가 벌이를 바꾼다.',
  available: (g) => free(g) && shopHere(g),
  run(g, rng) {
    const s = C(g), sh = s.shop;
    const wage = PLACES[sh.place]?.wage ?? 1;
    const base = (3 + s.hand / 9 + sh.rep / 8) * wage * (sty(g) ? 1.25 : 0.9) * (sh.back ? 0.8 : 1) * (1 - eraOf(g) * 0.05) * (0.7 + rng.next() * 0.6);
    const coins = Math.max(1, Math.round(base * (sh.apprentice ? 1.2 : 1)));
    g.player.money += coins; s.earned += coins; s.made += 1;
    sh.rep = clamp(sh.rep + (s.hand >= 55 ? 1 : 0.5), 0, 100);
    tired(g, 12);
    const v = gainHand(g, 0.8);
    const lines = [
      '치수를 재고 마름질하고 가봉을 했다.', '상인 아낙이 딸 시집갈 옷감을 들고 와 한참을 망설였다.', '해진 외투 팔꿈치에 가죽을 덧댔다.',
      '견습에게 단을 감치는 법을 다시 보여 주었다.', '단골 서기가 소매가 닳았다며 왔다. 같은 옷을 세 번째 고친다.',
    ];
    const fashion = sty(g) ? '' : ` 손님 몇은 진열대를 훑어보고 요즘 옷이 아니라며 나갔다.`;
    if (mi(g) - s.eventAt >= 3 && rng.chance(0.35)) queueShopEvent(g, rng);
    return `'${sh.name}'에서 ${rng.pick(lines)} 은화 ${coins}닢을 벌었다.${fashion}${gains([v > 0.04 ? `솜씨 +${v.toFixed(1)}` : null])}`;
  },
});

/* ---------- 가게 살림을 정한다 ---------- */
ACTIONS.push({
  id: 'cloth_manage', name: '가게 살림을 정한다', icon: 'home',
  desc: '진열을 유행에 맞추거나, 견습을 들이거나, 외상을 받으러 가거나, 가게를 접는다.',
  available: (g) => free(g) && shopHere(g) && (!sty(g) || !C(g).shop.apprentice || C(g).shop.owed.length > 0 || age(g) >= 50),
  run(g) {
    if (!sceneQueued(g, 'cloth_manage')) queueScene(g, 'cloth_manage', {}, { first: true });
    return '가게 문을 일찍 닫고 장부를 폈다.';
  },
});
defineScene('cloth_manage', {
  need: (g) => shopHere(g),
  title: (g) => `'${C(g).shop.name}'의 장부`,
  text: (g) => {
    const s = C(g), sh = s.shop, F = FASHIONS[s.fashion.id];
    const owed = sh.owed.reduce((a, o) => a + o.n, 0);
    return `요즘 사람들이 찾는 것은 ${F.name}. 진열대에는 ${sh.style === s.fashion.id ? '바로 그 옷이 걸려 있다' : `지난 유행인 ${J(FASHIONS[sh.style]?.name ?? '옛 옷', '이/가')} 걸려 있다`}.${sh.apprentice ? ` 견습 ${J(sh.apprentice.name, '이/가')} 재단대 밑을 쓸고 있다.` : ''}${owed ? ` 외상 장부에 은화 ${owed}닢이 적혀 있다.` : ''}`;
  },
  choices: (g) => {
    const s = C(g), sh = s.shop, out = [];
    if (sh.style !== s.fashion.id && g.player.money >= 20) out.push({ label: '진열을 새 유행으로 바꾼다 (은화 20닢)', key: 'style' });
    if (!sh.apprentice) out.push({ label: '견습을 들인다', key: 'appr' });
    if (sh.owed.length) out.push({ label: '외상을 받으러 간다', key: 'owed' });
    if (sh.apprentice && age(g) >= 50) out.push({ label: `가게를 견습 ${sh.apprentice.name}에게 물려준다`, key: 'hand' });
    out.push({ label: '가게를 접는다', key: 'close' });
    out.push({ label: '장부를 덮는다', key: 'no' });
    return out;
  },
  resolve(g, rng, s0, key) {
    const s = C(g), sh = s.shop, pl = here(g);
    if (!sh) return '가게가 없다.';
    if (key === 'no') return '장부를 덮고 촛불을 껐다.';
    if (key === 'style') { pay(g, 20); sh.style = s.fashion.id; return `밤새 진열대의 옷을 뜯어 ${J(FASHIONS[s.fashion.id].name, '으로/로')} 고쳐 걸었다. 아침에 지나가던 아가씨 둘이 발을 멈췄다.`; }
    if (key === 'appr') {
      const p = makePerson(rng, { sex: rng.chance(0.5) ? 'f' : 'm', ageMonths: rng.int(12, 15) * 12, job: 'apprentice' });
      p.place = pl; p.known = true; p.affection = rng.int(10, 25);
      g.people.push(p);
      sh.apprentice = { id: p.id, name: p.name, since: g.date.year };
      return `${J(p.name, '이/가')} 견습으로 들어왔다. 부모가 보리 한 자루를 지고 와서 잘 부탁한다며 머리를 숙였다. 아이 손가락이 가늘고 길었다.`;
    }
    if (key === 'owed') {
      const o = sh.owed.shift();
      if (!o) return '받을 외상이 없었다.';
      if (check(rng, (g.player.stats.cha ?? 0) * 0.5 + sh.rep / 3, 40)) { g.player.money += o.n; s.earned += o.n; return `${o.who}의 집사가 한참을 기다리게 하더니 은화 ${o.n}닢을 내주었다. 세어 보니 맞았다.`; }
      sh.rep = clamp(sh.rep - 2, 0, 100);
      return `${o.who} 대문에서 집사가 말했다. "주인께서 그런 옷을 맞춘 적이 없다 하십니다." 은화 ${o.n}닢은 장부에서 지웠다. 귀족에게 외상을 주는 재봉사가 바보다.`;
    }
    if (key === 'hand') {
      const p = g.people.find((x) => x.id === sh.apprentice.id);
      s.past.push({ name: sh.name, place: sh.place, since: sh.since, to: sh.apprentice.name, y: g.date.year });
      logCloth(g, `${Q(sh.name, '을/를')} 견습 ${sh.apprentice.name}에게 물려주었다.`);
      if (p) { p.job = 'tailor'; p.affection = clamp((p.affection ?? 0) + 25, -100, 100); }
      s.shop = null;
      return `재단대와 가위를 ${sh.apprentice.name}에게 넘겼다. 간판은 그대로 두라고 했다. 그 아이가 처음 왔을 때 손가락이 떨리던 게 엊그제 같다.`;
    }
    // 가게를 접는다
    const v = 25 + Math.round(sh.rep / 2);
    g.player.money += v;
    s.past.push({ name: sh.name, place: sh.place, since: sh.since, to: null, y: g.date.year });
    logCloth(g, `'${sh.name}' 가게를 접었다.`);
    s.shop = null;
    return `재단대와 천을 팔아 은화 ${v}닢을 받았다. 간판을 내리던 날 단골 몇이 와서 아쉬워했다.`;
  },
});

/* ---------- 주문 ---------- */
export function eligibleOrders(g, own) {
  const out = ['noble', 'mourn', 'wed'];
  if (own) out.push('fake', 'hem');
  return out;
}
export function queueOrder(g, rng, own) {
  const kind = rng.pick(eligibleOrders(g, own));
  C(g).eventAt = mi(g);
  queueScene(g, 'cloth_order', { kind, own, who: nobleHouse(g, rng) });
}
const orderOk = (g, s) => (s.own ? shopHere(g) : isTailor(g) && L(g).job?.place === here(g));
defineScene('cloth_order', {
  need: (g, s) => orderOk(g, s),
  title: (g, s) => ({ noble: '귀족 댁 연회 옷', mourn: '급한 상복', wed: '가난한 신부', fake: '포목상의 부탁', hem: '안감 속의 편지' }[s.kind] ?? '주문'),
  text: (g, s) => {
    const where = s.own ? '가게에' : '스승의 가게에';
    const F = FASHIONS[C(g).fashion.id];
    switch (s.kind) {
      case 'noble': return `${where} ${s.who}의 부인이 시녀 둘을 데리고 들어왔다. 다음 달 연회에 입을 옷이다. 요즘 왕도에선 ${J(F.name, '이/가')} 유행이라는 걸 부인도 안다. "남들과 똑같은 옷은 싫어요." 값은 묻지도 않는다. 귀족은 값을 묻지 않는다. 대신 제때 치르지도 않는다.`;
      case 'mourn': return `${where} 상가 사람이 뛰어 들어왔다. 내일 장례에 쓸 상복 열두 벌이 급하다고 한다. 바깥양반이 갑자기 갔다며 눈이 붉다. 지금 시작하면 밤을 꼬박 새워야 한다.`;
      case 'wed': return `${where} 앳된 신부가 어머니와 함께 왔다. 낡은 혼례 옷을 고쳐 달라고 한다. 둘이 가진 돈을 모두 꺼내 놓았다. 은화 세 닢과 동전 몇 개다.`;
      case 'fake': return '포목상 하나가 찾아왔다. 싸구려 무명에 광을 먹여 비단처럼 보이게 마름질해 달라고 한다. 시골 영주 댁에 비단 옷이라며 넘길 거라고 웃는다. 은화 스물다섯 닢을 내민다.';
      case 'hem': return '저녁 무렵 두건을 깊이 쓴 손님이 외투를 맡겼다. 안감 속에 접은 종이 한 장을 꿰매 넣어 달라고 한다. 묻지 말라는 얼굴이다. 삯은 은화 열다섯 닢, 보통 삯의 다섯 배다.';
      default: return '';
    }
  },
  choices: (g, s) => {
    switch (s.kind) {
      case 'noble': {
        const out = [{ label: '유행대로 정성껏 짓는다', key: 'fashion' }, { label: '아무도 본 적 없는 모양을 지어 본다', key: 'new' }];
        if (C(g).bolts.some((b) => b.dye === 'murex')) out.push({ label: '궤의 자줏빛 옷감을 쓰자고 권한다', key: 'purple' });
        out.push({ label: '외상은 안 된다며 선금을 청한다', key: 'cash' });
        return out;
      }
      case 'mourn': return [{ label: '밤을 새워 짓는다', key: 'night' }, { label: '급한 일이니 삯을 곱절로 부른다', key: 'double' }, { label: '삯만 받고 천값은 받지 않는다', key: 'kind' }, { label: '못 한다고 돌려보낸다', key: 'no' }];
      case 'wed': return [{ label: '가진 돈만 받고 고쳐 준다', key: 'cheap' }, { label: '삯을 받지 않는다', key: 'free' }, { label: '그 돈으로는 안 된다고 한다', key: 'no' }];
      case 'fake': return [{ label: '해 준다', key: 'do' }, { label: '거절한다', key: 'no' }, { label: '길드에 알린다', key: 'report' }];
      case 'hem': return [{ label: '말없이 꿰매 준다', key: 'do' }, { label: '거절한다', key: 'no' }, { label: '몰래 종이를 펴 본다', key: 'peek' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const c = C(g), pl = here(g), sh = c.shop, own = s.own && !!sh;
    const rep = (n) => { if (own) sh.rep = clamp(sh.rep + n, 0, 100); };
    const cut = own ? 1 : 0.3; // 스승 가게면 내 몫은 일부
    switch (s.kind) {
      case 'noble': {
        if (key === 'cash') { if (rng.chance(0.5)) { const n = Math.round(30 * cut); g.player.money += n; c.earned += n; return `부인이 눈썹을 치켜올리더니 시녀에게 눈짓했다. 선금이 나왔다. 대신 다음부터는 오지 않을 것이다. ${own ? '' : '스승이 내 몫으로 '}은화 ${n}닢.`; } rep(-3); return '부인은 아무 말 없이 돌아서 나갔다. 다음 날 그 집안과 가까운 댁 하인들이 주문을 거두러 왔다.'; }
        if (key === 'new') {
          gainHand(g, 1.5); tired(g, 15);
          if (check(rng, c.hand * 0.8, 62)) {
            const n = Math.round(60 * cut); g.player.money += n; c.earned += n; rep(8);
            if (c.hand >= 70 && own) { setFashion(g, rng, true); return `소매를 비스듬히 트고 안쪽에 다른 빛깔을 댔다. 연회 다음 주, 왕도 재봉 가게마다 같은 소매를 지어 달라는 손님이 몰려왔다. 다들 '${sh.name}'에서 나온 모양이라고 했다. 은화 ${n}닢.`; }
            return `아무도 본 적 없는 깃을 달았다. 부인이 거울 앞에서 한참을 돌아보더니 웃었다. ${own ? '' : '스승이 내 어깨를 두드리며 '}은화 ${n}닢.`;
          }
          rep(-5); stress(g, 5);
          return '새 모양은 거울 앞에서 우스꽝스러웠다. 부인의 시녀가 웃음을 참느라 어깨를 떨었다. 옷은 다시 뜯어 유행대로 고쳐야 했다.';
        }
        if (key === 'purple') { const b = c.bolts.find((x) => x.dye === 'murex'); if (b) takeBolt(g, b, 1); const n = Math.round(110 * cut); if (rng.chance(0.4)) { if (own) sh.owed.push({ who: s.who, n, y: g.date.year }); rep(6); return `자줏빛 옷감을 펴자 부인의 눈이 커졌다. 옷값은 외상으로 달아 두라고 했다. 은화 ${n}닢이 장부에 올랐다.`; } g.player.money += n; c.earned += n; rep(6); return `자줏빛 옷감을 펴자 부인의 눈이 커졌다. 그 자리에서 은화 ${n}닢이 나왔다.`; }
        const n = Math.round(35 * cut); tired(g, 10); gainHand(g, 1);
        if (own && rng.chance(0.4)) { sh.owed.push({ who: s.who, n, y: g.date.year }); rep(3); return `열흘 동안 매달려 유행대로 지었다. 부인은 흡족해했다. 값은 "집사가 치를 것"이라고 했다. 장부에 은화 ${n}닢을 적었다.`; }
        g.player.money += n; c.earned += n; rep(3);
        return `열흘 동안 매달려 유행대로 지었다. 부인이 만족해하며 은화 ${n}닢을 치렀다.`;
      }
      case 'mourn':
        if (key === 'no') { rep(-2); return '못 한다고 했다. 상가 사람은 다른 가게로 뛰어갔다. 그 집 장례에 상복이 다 갖춰졌는지는 모른다.'; }
        if (key === 'double') { const n = Math.round(30 * cut); g.player.money += n; c.earned += n; tired(g, 25); deed(g, 'generous', -1, '상가의 급한 사정에 삯을 곱절로 받았다', pl); rep(-1); return `삯을 곱절로 불렀다. 상가 사람은 군말 없이 받아들였다. 밤새 바늘을 놀려 새벽에 넘겼다. 은화 ${n}닢. 그 집 사람들은 다시 오지 않을 것이다.`; }
        if (key === 'kind') { const n = Math.round(8 * cut); g.player.money += n; c.earned += n; tired(g, 25); deed(g, 'kind', 2, '상가의 상복을 천값 없이 지어 주었다', pl); rep(4); return `천값은 받지 않았다. 밤새 지은 상복 열두 벌을 새벽에 넘겼다. 장례 날 그 집 늙은 어머니가 가게 문 앞에 와서 한참 서 있다 갔다. 은화 ${n}닢.`; }
        { const n = Math.round(15 * cut); g.player.money += n; c.earned += n; tired(g, 25); gainHand(g, 1.2); rep(2); return `촛불 셋을 갈아 가며 밤을 새웠다. 닭이 울 때 마지막 단을 감쳤다. 은화 ${n}닢. 손가락 끝이 바늘에 찔려 성한 데가 없었다.`; }
      case 'wed':
        if (key === 'no') return '그 돈으로는 안 된다고 했다. 신부는 고개를 숙이고 어머니 손을 잡고 나갔다.';
        tired(g, 10); gainHand(g, 0.8);
        if (key === 'free') { deed(g, 'generous', 2, '가난한 신부의 혼례 옷을 삯 없이 고쳐 주었다', pl); rep(4); return '삯은 받지 않았다. 남은 붉은 천 자투리로 소매 끝에 꽃을 수놓아 주었다. 혼례 날 신부가 가게 앞을 지나며 소매를 흔들었다.'; }
        g.player.money += 3; c.earned += 3; deed(g, 'kind', 1, '가난한 신부의 혼례 옷을 헐값에 고쳐 주었다', pl); rep(2);
        return '은화 세 닢만 받고 고쳐 주었다. 동전은 돌려주었다. 어머니가 몇 번이고 고개를 숙였다.';
      case 'fake':
        if (key === 'do') { g.player.money += 25; c.earned += 25; deed(g, 'honest', -2, '싸구려 무명을 비단처럼 꾸며 주었다', pl); if (rng.chance(0.25)) { reportCrime(g, 'fraud', pl, { mult: 0.5 }); rep(-8); return '석 달 뒤 시골 영주의 사람들이 포목상을 붙잡았다. 포목상은 내 가게 이름을 댔다. (은화 25닢)'; } return '광을 먹인 무명은 촛불 아래서 비단처럼 빛났다. 은화 스물다섯 닢. 그 옷이 첫 빨래에 어떻게 될지는 생각하지 않기로 했다.'; }
        if (key === 'report') { deed(g, 'honest', 2, '가짜 비단을 꾸미려던 포목상을 길드에 알렸다', pl); if (c.guild.member) c.guild.favor = (c.guild.favor ?? 0) + 10; rep(3); return '길드 검사관들이 포목상의 창고를 덮쳤다. 광 먹인 무명이 수레로 셋이나 나왔다. 포목상 쪽 사람들은 나를 원수로 여길 것이다.'; }
        return '포목상은 어깨를 으쓱하고 나갔다. 길 건너 가게로 들어가는 것이 보였다.';
      case 'hem':
        if (key === 'no') return '거절했다. 두건 쓴 손님은 외투를 받아 들고 아무 말 없이 나갔다.';
        if (key === 'peek') { deed(g, 'loyal', -1, '손님이 맡긴 편지를 몰래 펴 보았다', pl); g.player.money += 15; c.earned += 15; return rng.chance(0.5) ? '종이를 펴 보았다. 숫자와 고장 이름이 줄지어 적혀 있었다. 무슨 뜻인지는 몰랐다. 다시 접어 꿰매 넣었다. 은화 열다섯 닢.' : '종이에는 한 줄뿐이었다. "보름날, 북문." 다시 접어 꿰매 넣었다. 보름날 밤 북문 쪽에서 횃불이 오래 움직였다. 은화 열다섯 닢.'; }
        g.player.money += 15; c.earned += 15; return '안감을 뜯고 종이를 넣고 다시 꿰맸다. 바늘땀을 보고는 누구도 모를 것이다. 은화 열다섯 닢. 다음 달에도 그 손님이 왔다.';
      default: return '';
    }
  },
});

/* ---------- 길드 ---------- */
function queueShopEvent(g, rng) {
  const c = C(g), sh = c.shop, pl = sh.place;
  const opts = ['order', 'order'];
  if (GUILD_TOWNS.includes(pl)) opts.push(sh.back ? 'harass' : 'inspect', sh.back ? 'harass' : 'dues');
  if (sh.guild && c.guild.member && !c.guild.me && sh.rep >= 55 && c.hand >= 75) opts.push('election');
  const k = rng.pick(opts);
  c.eventAt = mi(g);
  if (k === 'order') { if (!sceneQueued(g, 'cloth_order')) queueOrder(g, rng, true); return; }
  if (!sceneQueued(g, 'cloth_guild')) queueScene(g, 'cloth_guild', { kind: k });
}
defineScene('cloth_guild', {
  need: (g, s) => shopHere(g) && GUILD_TOWNS.includes(here(g)) && (s.kind === 'harass' ? C(g).shop.back : !C(g).shop.back),
  title: (g, s) => ({ inspect: '길드 검사관', dues: '길드 회비', harass: '길드의 눈', election: '길드장 자리' }[s.kind]),
  text: (g, s) => {
    const c = C(g);
    switch (s.kind) {
      case 'inspect': return '길드 검사관 둘이 자를 들고 들어왔다. 진열한 옷의 바늘땀 수와 옷감 폭을 잰다. 길드 규격에 모자라면 벌금이고, 세 번이면 간판을 뗀다. 검사관 하나가 내 눈을 보며 헛기침을 한다.';
      case 'dues': return `길드장 ${J(c.guild.master, '이/가')} 회비를 은화 ${c.guild.dues}닢에서 ${c.guild.dues + 10}닢으로 올리겠다고 한다. 길드 회관 지붕을 새로 이어야 한다는데, 길드장 집 지붕도 같이 새로 이었다는 소문이 돈다. 작은 가게 주인들이 내 가게에 모였다.`;
      case 'harass': return '아침에 와 보니 가게 앞 진열대가 엎어져 있었다. 진흙 묻은 천 위에 길드 문장이 찍힌 쪽지가 있다. "가위를 들려면 길드에 들어라." 길 건너 길드 가게 주인이 팔짱을 끼고 보고 있다.';
      case 'election': return `길드장 ${J(c.guild.master, '이/가')} 늙어 물러난다. 길드 원로들이 내 가게를 찾아와 다음 길드장으로 나서 보라고 한다. 맞수는 길드장의 사위다.`;
      default: return '';
    }
  },
  choices: (g, s) => {
    const m = g.player.money, c = C(g);
    switch (s.kind) {
      case 'inspect': { const out = [{ label: '있는 그대로 보인다', key: 'show' }]; if (m >= 10) out.push({ label: '검사관 손에 은화를 쥐여 준다', key: 'bribe' }); return out; }
      case 'dues': return [{ label: '군말 없이 낸다', key: 'pay' }, { label: '작은 가게들과 함께 버틴다', key: 'resist' }, { label: '길드장 집 지붕 얘기를 회관에서 꺼낸다', key: 'expose' }];
      case 'harass': { const out = []; if (m >= c.guild.dues * 3) out.push({ label: `길드에 든다 (은화 ${c.guild.dues * 3}닢)`, key: 'join' }); out.push({ label: '진열대를 다시 세우고 버틴다', key: 'stay' }, { label: '가게를 접는다', key: 'quit' }); return out; }
      case 'election': return [{ label: '길드장으로 나선다', key: 'run' }, { label: '사위를 민다', key: 'back' }, { label: '빠진다', key: 'no' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const c = C(g), sh = c.shop, pl = here(g);
    if (!sh) return '가게가 없다.';
    switch (s.kind) {
      case 'inspect':
        if (key === 'bribe') { pay(g, 10); deed(g, 'honest', -1, '길드 검사관에게 뒷돈을 주었다', pl); return '검사관이 자를 거두고 장부에 "흠 없음"이라 적었다. 문을 나서며 다음 철에도 들르겠다고 했다.'; }
        if (check(rng, c.hand, 45)) { sh.rep = clamp(sh.rep + 3, 0, 100); return '검사관이 바늘땀을 세다가 고개를 들었다. "이 땀은 누구한테 배웠소?" 장부에 "흠 없음"이라 적었다.'; }
        { const n = pay(g, 12); sh.rep = clamp(sh.rep - 3, 0, 100); return `옷감 폭이 반 치 모자란다며 벌금 은화 ${n}닢을 물렸다. 진열대의 옷 두 벌에 길드 도장이 찍힌 붉은 쪽지가 붙었다.`; }
      case 'dues':
        if (key === 'pay') { c.guild.dues += 10; pay(g, 10); return '올린 회비를 냈다. 모였던 작은 가게 주인들이 하나둘 돌아갔다. 내 가게를 보며 혀를 찬 사람도 있었다.'; }
        if (key === 'resist') { if (check(rng, sh.rep * 0.6 + (g.player.stats.cha ?? 0) * 0.4, 40)) { deed(g, 'brave', 1, '길드의 회비 인상에 맞섰다', pl); return '작은 가게 열한 곳이 한꺼번에 회비를 내지 않았다. 길드장은 한 달을 버티다 인상을 거두었다.'; } c.guild.dues += 10; pay(g, 15); sh.rep = clamp(sh.rep - 4, 0, 100); return '버티던 가게들이 하나씩 떨어져 나갔다. 마지막까지 버틴 나만 벌금까지 얹어 냈다.'; }
        if (check(rng, (g.player.stats.cha ?? 0) * 0.5 + sh.rep * 0.4, 48)) { deed(g, 'honest', 1, '길드장의 회비 빼돌리기를 회관에서 따졌다', pl); c.guild.dues = Math.max(10, c.guild.dues - 5); return '회관에서 길드장 집 지붕 얘기를 꺼냈다. 원로들이 장부를 가져오라고 했다. 회비는 오히려 내렸다. 길드장은 그 뒤로 내 인사를 받지 않는다.'; }
        sh.rep = clamp(sh.rep - 6, 0, 100); stress(g, 5); return '증거도 없이 길드장을 몰아세운 꼴이 되었다. 원로들이 나를 회관 밖으로 내보냈다. 한동안 길드 가게들이 내게 일감을 넘기지 않았다.';
      case 'harass':
        if (key === 'join') { pay(g, c.guild.dues * 3); sh.back = false; sh.guild = true; c.guild.member = true; return '길드 회관에 가서 이름을 올렸다. 다음 날 가게 앞에 길드 문장이 찍힌 간판이 걸렸다. 길 건너 가게 주인이 처음으로 고개를 까딱했다.'; }
        if (key === 'quit') { const v = 20 + Math.round(sh.rep / 3); g.player.money += v; c.past.push({ name: sh.name, place: sh.place, since: sh.since, to: null, y: g.date.year }); c.shop = null; logCloth(g, `길드에 밀려 '${sh.name}' 가게를 접었다.`); return `가게를 접었다. 재단대를 판 돈은 은화 ${v}닢이었다. 짐을 싸는 동안 길 건너 가게 주인은 나와 보지도 않았다.`; }
        deed(g, 'brave', 1, '길드의 텃세에 굴하지 않았다', pl); sh.rep = clamp(sh.rep + 2, 0, 100); stress(g, 4);
        return '진열대를 다시 세우고 진흙 묻은 천을 빨아 널었다. 그날 오후 동네 아낙 몇이 일부러 내 가게에서 단추를 샀다.';
      case 'election':
        if (key === 'no') return '빠지겠다고 했다. 원로들은 아쉬운 얼굴로 돌아갔다.';
        if (key === 'back') { c.guild.master = GUILD_MASTERS[(c.guild.masterN = (c.guild.masterN ?? 0) + 1) % GUILD_MASTERS.length]; c.guild.favor = (c.guild.favor ?? 0) + 15; return `사위 쪽에 섰다. 새 길드장 ${J(c.guild.master, '은/는')} 그 빚을 잊지 않겠다고 했다. 정말 잊지 않을지는 두고 볼 일이다.`; }
        if (check(rng, sh.rep * 0.5 + c.hand * 0.3 + (c.guild.favor ?? 0) * 0.3, 52)) { c.guild.me = true; c.guild.master = g.player.name; chron(g, `${g.player.name}, ${placeName(pl)} 재봉 길드장에 오르다.`, 40); L(g).renown = (L(g).renown ?? 0) + 3; logCloth(g, '재봉 길드장이 되었다.'); return '원로들이 하나씩 손을 들었다. 길드장의 은 골무가 내 손가락에 끼워졌다. 이제 이 고장의 바늘땀은 내가 잰다.'; }
        c.guild.master = GUILD_MASTERS[(c.guild.masterN = (c.guild.masterN ?? 0) + 1) % GUILD_MASTERS.length];
        stress(g, 5); return `사위가 이겼다. 장인의 표를 다 물려받았다. 새 길드장 ${J(c.guild.master, '이/가')} 회관 계단에서 내게 웃어 보였다.`;
      default: return '';
    }
  },
});

/* ---------- 유행 ---------- */
// 유행은 몇 해마다 바뀐다. 내 가게에서 지은 새 모양이 유행이 되기도 한다.
export function setFashion(g, rng, byMe = false) {
  const c = C(g), era = eraOf(g);
  const opts = fashionsFor(era).filter((id) => id !== c.fashion.id);
  const id = rng.pick(opts.length ? opts : FASHION_IDS);
  c.fashion = { id, since: mi(g), by: byMe ? g.player.name : null };
  if (byMe) {
    if (c.shop) c.shop.style = id;
    L(g).renown = (L(g).renown ?? 0) + 2;
    chron(g, `${g.player.name}의 가게에서 지은 옷이 왕도의 유행이 되다.`, 35);
    logCloth(g, `내가 지은 ${J(FASHIONS[id].name, '이/가')} 유행이 되었다.`);
  } else logCloth(g, `왕도에서 ${J(FASHIONS[id].name, '이/가')} 유행하기 시작했다.`);
  return id;
}
export { DYES, boltName, fashionDye };
