// 귀족 가문: 가주가 늙어 죽고 아들이 잇는다. 가문끼리 다투고, 혼인으로 묶이고, 내전에서 줄을 잘못 서면 몰락한다.
// 그라이펜 백작가는 g.realm.lord와 같은 집이다. 가주 교체는 world.js가 하고, 여기서는 가문의 흥망만 맡는다.
import { H, clamp, TEMPER, TEMPER_ADJ, TEMPERS, NEW_HOUSE_NAMES, MAX, personName } from './state.js';
import { J } from '../narrative/text.js';

export const houseName = (h) => `${h.name} ${h.title}가`;
export const SEAT_NAME = { harfen: '하르펜', verden: '베르덴', leocast: '왕도' };
const TITLES = ['남작', '자작', '백작', '후작', '공작'];

export function liveHouses(g) { return (H(g)?.houses ?? []).filter((h) => !h.fallen); }

function sync(g) {
  // 그라이펜(하르펜 영주)은 world.js의 영주와 맞춘다
  const r = g.realm, h = H(g).houses.find((x) => x.seat === 'harfen' && !x.fallen);
  if (!r?.lord || !h) return;
  if (h.name !== r.lord.house) { h.name = r.lord.house; }
  h.head = r.lord.name; h.age = r.lord.age; h.gen = r.lord.generation;
  h.temper = TEMPER[r.lord.temper] ? r.lord.temper : h.temper;
}

// 가문을 무너뜨리고, 자리가 있으면 새 가문을 세운다
function fall(g, rng, h, why, say, record) {
  const hist = H(g);
  h.fallen = true; h.fellYear = g.date.year;
  hist.fallen += 1;
  say(`${houseName(h)}가 무너졌다. ${why}`, true);
  record(`${houseName(h)} 몰락`);
  if (h.seat) raise(g, rng, h.seat, h.title, say, record, h);
}

export function raise(g, rng, seat, title, say, record, prev = null, from = null) {
  const hist = H(g);
  const used = new Set(hist.houses.map((x) => x.name));
  const name = from?.lastName && !used.has(from.lastName) ? from.lastName : NEW_HOUSE_NAMES.find((n) => !used.has(n)) ?? `${rng.pick(NEW_HOUSE_NAMES)}${hist.houses.length}`;
  const head = from?.name ?? personName(rng, 'm').name;
  const h = { id: `h${g.date.year}_${hist.houses.length}`, name, title, seat, side: null, power: rng.int(30, 45), head, age: from?.age ?? rng.int(28, 48), temper: rng.pick(TEMPERS), gen: 1, wealth: rng.int(30, 60), since: g.date.year };
  hist.houses.push(h);
  hist.founded += 1;
  if (seat === 'harfen' && g.realm) {
    g.realm.lord = { name: head, house: name, title, age: h.age, temper: TEMPER[h.temper] && h.temper !== 'bold' ? h.temper : 'fair', generation: 1 };
  }
  const where = SEAT_NAME[seat] ?? '';
  say(prev
    ? `${where}${where ? '의 ' : ''}${prev.name} 가문 자리에 ${name} 가문이 들어섰다. 새 ${title} ${J(head, '은/는')} ${from ? from.how : '왕실에 충성을 맹세하고 작위를 받았다'}.`
    : `${name} 가문이 ${title} 작위를 받았다. ${from ? from.how : ''}`.trim(), true);
  record(`${name} 가문, ${title} 작위를 받음`);
  // 오래된 몰락 가문은 잊힌다
  const dead = hist.houses.filter((x) => x.fallen);
  if (hist.houses.length > MAX.houses && dead.length) hist.houses.splice(hist.houses.indexOf(dead[0]), 1);
  return h;
}

export function noblesTick(g, rng, say, record, yearEnd) {
  const hist = H(g), r = g.realm;
  sync(g);
  const live = liveHouses(g);

  // 내전: 가문마다 줄을 선다
  if (r.succession === 'civilwar') {
    for (const h of live) if (!h.side && rng.chance(0.08)) {
      h.side = rng.chance(r.rudolf.support / 100) ? 'rudolf' : 'erik';
      if (rng.chance(0.5)) say(`${houseName(h)}가 ${h.side === 'rudolf' ? '루돌프' : '에릭'} 왕자 편에 섰다고 한다.`);
    }
  }
  // 왕이 바뀌었다: 진 쪽에 섰던 가문이 대가를 치른다
  if (r.ruler !== hist.lastRuler && (r.ruler === 'rudolf' || r.ruler === 'erik')) {
    const losers = live.filter((h) => h.side && h.side !== r.ruler);
    for (const h of live) if (h.side === r.ruler) { h.power = clamp(h.power + 15, 0, 100); h.wealth = clamp(h.wealth + 10, 0, 100); }
    for (const h of losers) {
      h.power = clamp(h.power - 25, 0, 100);
      if (rng.chance(r.succession === 'settled' && hist.lastRuler === 'regency' ? 0.45 : 0.25)) {
        fall(g, rng, h, `새 왕은 ${h.side === 'rudolf' ? '루돌프' : '에릭'} 왕자 편에 섰던 가주 ${J(h.head, '을/를')} 반역죄로 다스렸다. 영지는 몰수되었다.`, say, record);
      } else say(`${houseName(h)}는 새 왕에게 무릎을 꿇었다. 영지 일부와 많은 금화를 바치고 살아남았다.`);
    }
    for (const h of liveHouses(g)) h.side = null;
  }
  hist.lastRuler = r.ruler;

  // 매달 조금씩
  for (const h of liveHouses(g)) {
    const t = h.temper;
    h.wealth = clamp(h.wealth + rng.normal(t === 'greedy' ? 0.15 : t === 'weak' ? -0.12 : 0.02, 0.6) - (r.balhart.war || r.succession === 'civilwar' ? 0.12 : 0), 0, 100);
    h.power = clamp(h.power + rng.normal((h.wealth - 50) * 0.004 + (t === 'bold' ? 0.08 : t === 'weak' ? -0.08 : 0), 0.5), 0, 100);
  }
  if (!yearEnd) return;

  // ---------- 해마다 ----------
  for (const h of liveHouses(g)) {
    if (h.seat === 'harfen') continue; // 그라이펜의 가주 교체는 world.js가 한다
    if (h.seat === 'verden' && g.life?.placeNpcs?.verden) continue; // 베르덴 백작이 실제 사람으로 있으면 그 사람이 가주다
    h.age += 1;
    if (rng.chance(h.age > 60 ? 0.1 + (h.age - 60) * 0.01 : 0.015)) {
      const old = h.head;
      let heir = personName(rng, 'm').name;
      if (heir === old) heir = `${old} 2세`; // 아버지 이름을 물려받은 아들
      h.head = heir; h.age = rng.int(18, 36); h.gen += 1;
      const prevT = h.temper; h.temper = rng.pick(TEMPERS);
      say(`${houseName(h)}의 가주 ${J(old, '이/가')} 세상을 떠났다. ${J(h.head, '이/가')} 뒤를 이었다. ${prevT === h.temper ? '아버지를 빼닮았다는 평이다.' : `새 가주는 ${TEMPER_ADJ[h.temper]} 사람이라고 한다.`}`, h.power > 55 || h.seat === 'verden');
      if (h.power > 55 || h.seat === 'verden') record(`${houseName(h)} 가주 교체: ${h.head}`);
    }
  }
  const lv = liveHouses(g);
  // 다툼: 힘이 비슷한 두 가문이 땅이나 혼사를 두고 맞선다
  if (lv.length >= 2 && rng.chance(0.18)) {
    const [a, b] = [rng.pick(lv), rng.pick(lv)];
    if (a !== b) {
      const win = rng.chance(0.5 + (a.power - b.power) / 120) ? a : b;
      const lose = win === a ? b : a;
      const how = rng.pick([
        ['국경 개울의 물길을 두고', '사병끼리 칼부림이 났다'],
        ['혼담이 깨진 일로', '왕실 재판까지 갔다'],
        ['빚 문서를 두고', '양쪽 기사들이 결투를 벌였다'],
        ['사냥터 경계를 두고', '마을 둘이 불에 탔다'],
      ]);
      win.power = clamp(win.power + 6, 0, 100); lose.power = clamp(lose.power - 9, 0, 100); lose.wealth = clamp(lose.wealth - 8, 0, 100);
      say(`${houseName(a)}와 ${houseName(b)}가 ${how[0]} 다퉜다. ${how[1]}. 이긴 쪽은 ${win.name} 가문이다.`, lose.power < 25);
      if (lose.power < 25) record(`${win.name} 가문과 ${lose.name} 가문의 다툼, ${win.name}의 승리`);
    }
  } else if (lv.length >= 2 && rng.chance(0.12)) {
    const [a, b] = [rng.pick(lv), rng.pick(lv)];
    if (a !== b) {
      a.power = clamp(a.power + 4, 0, 100); b.power = clamp(b.power + 4, 0, 100);
      say(`${houseName(a)}와 ${houseName(b)}가 혼인으로 손을 잡았다. 결혼식 잔치가 사흘 밤낮 이어졌다고 한다.`);
    }
  }
  // 빚과 힘을 잃은 가문은 무너지고, 힘을 얻은 가문은 작위가 오른다
  for (const h of liveHouses(g)) {
    if (h.power < 8 && h.wealth < 20 && rng.chance(0.35)) {
      fall(g, rng, h, `빚을 갚지 못한 가주 ${J(h.head, '은/는')} 영지를 팔았다. ${rng.pick(['조상의 성은 상인의 손에 넘어갔다.', '가솔들은 뿔뿔이 흩어졌다.'])}`, say, record);
    } else if (h.power > 85 && h.title !== '공작' && rng.chance(0.15)) {
      const i = TITLES.indexOf(h.title);
      if (i >= 0 && i < TITLES.length - 1) {
        h.title = TITLES[i + 1]; h.power = clamp(h.power - 10, 0, 100);
        say(`${h.name} 가문이 ${J(h.title, '으로/로')} 올라섰다. 왕실에 바친 공이 인정받았다고 한다.`, true);
        record(`${h.name} 가문, ${h.title} 작위로 오름`);
        if (h.seat === 'harfen' && g.realm) g.realm.lord.title = h.title;
      }
    }
  }
}
