// 마도구의 달 (플레이어 없이도): 이름난 마도구가 새로 태어나고, 도둑맞고, 흘러다니다 되찾아지고, 전쟁과 미궁에서 사라진다.
// 내 공방의 제자들은 자라고, 다 자라면 나가겠다고 하고, 손버릇 나쁜 제자는 마석을 훔친다. 기한을 넘긴 의뢰는 깨진다.
// 지닌 장신구는 달마다 조금씩 몸을 돕는다.
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { chron, note, L, queueScene, sceneQueued, stress, tired } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { atWar } from '../world.js';
import { AS, FAMOUS_NAMES, BASES, WORKSHOP, mi, clamp, ownRng, placeName, logA, priceMul } from './core.js';

const THIEVES = ['검은 손 패거리', '떠돌이 도둑 렌', '항구의 장물아비 조합', '얼굴 없는 밤손님', '몰락한 기사 하드릭', '쥐구멍 형제단'];
const MAKERS = ['드워프 장인 토린', '별의 탑 장인 이세라', '에이젠 공방장 마르쿠스', '떠돌이 장인 벨', '바르카의 노장인 오스윈', '그론다르 대장간의 하르보'];
const HOLDERS = ['왕실 보물고', '이름난 공략대', '용병단장', '상단 금고', '변경 백작가', '대성당 보물실', '늙은 기사'];
const towns = () => Object.keys(WORKSHOP).filter((p) => PLACES[p]);

export function famousMonth(g, rng) {
  const A = AS(g);
  // 이름난 장인이 몇 해에 한 번 새 걸작을 낸다 (높은 서클일수록 드물다)
  if (rng.chance(1 / 110)) {
    const used = new Set(A.famous.map((f) => f.name));
    const name = rng.pick(FAMOUS_NAMES.filter((n) => !used.has(n)));
    if (name) {
      const circle = rng.chance(0.15) ? 5 : rng.chance(0.4) ? 4 : 3;
      const where = rng.pick(towns());
      A.famous.push({ id: `fa${A.seq++}`, name, base: rng.pick(Object.keys(BASES)), circle, spell: '', maker: rng.pick(MAKERS), mine: false, holder: rng.pick(HOLDERS), where, y: g.date.year, lost: false, stolen: null });
      if (circle >= 4) chron(g, `${placeName(where)}에서 ${circle}서클 마도구 ${J(name, '이/가')} 만들어졌다는 소문이 돈다.`, 25);
      while (A.famous.length > 14) { const i = A.famous.findIndex((f) => !f.mine); if (i < 0) break; A.famous.splice(i, 1); }
    }
  }
  for (const f of A.famous) {
    if (f.lost) {
      // 잃어버린 것은 아주 드물게 미궁이나 폐허에서 다시 나온다
      if (rng.chance(1 / 900)) { f.lost = false; f.holder = '이름 모를 공략대'; f.where = rng.pick(towns()); chron(g, `오래 잃어버렸던 마도구 ${J(f.name, '이/가')} ${placeName(f.where)} 장터에 나타났다.`, 25); }
      continue;
    }
    if (f.stolen) {
      // 도둑맞은 것은 흘러다니다, 내 것이 아니면 언젠가 주인에게 돌아가거나 사라진다
      if (rng.chance(0.08)) f.where = rng.pick(towns());
      if (!f.mine && rng.chance(1 / 60)) { f.stolen = null; logA(g, `${J(f.name, '이/가')} 제자리로 돌아갔다.`); }
      else if (rng.chance(1 / 300)) { f.stolen = null; f.lost = true; f.holder = null; }
      continue;
    }
    const mineHeld = f.mine && f.holder;
    const steal = mineHeld ? 1 / 220 : 1 / 420;
    if (rng.chance(steal)) {
      const by = rng.pick(THIEVES);
      f.stolen = { by, y: g.date.year };
      f.where = rng.pick(towns().filter((p) => p !== f.where)) ?? f.where;
      if (f.mine) {
        note(g, `집안의 마도구 ${J(f.name, '을/를')} 도둑맞았다. ${by}의 짓이라는 말이 돈다.`);
        logA(g, `${J(f.name, '을/를')} 도둑맞았다. ${placeName(f.where)} 쪽으로 흘러갔다는 소문.`);
        const i = A.kept.findIndex((k) => k.fid === f.id);
        if (i >= 0) {
          const gone = A.kept[i];
          const gear = L(g).gear;
          if (gear?.weaponName === gone.name) { gear.weapon = 4; gear.weaponName = '허름한 칼'; }
          if (gear?.armorName === gone.name) { gear.armor = 0; gear.armorName = null; }
          A.kept.splice(i, 1);
          if (A.worn === i) A.worn = -1; else if (A.worn > i) A.worn -= 1;
        }
      } else if (f.circle >= 5) chron(g, `${f.holder}의 마도구 ${J(f.name, '이/가')} 도둑맞았다. ${by}의 짓이라고들 한다.`, 20);
      continue;
    }
    // 전쟁 통에 사라지기도 한다
    if (!f.mine && atWar(g) && rng.chance(1 / 500)) { f.lost = true; f.holder = null; chron(g, `전란 속에 마도구 ${J(f.name, '이/가')} 행방을 감췄다.`, 20); }
  }
}

export function shopMonth(g, rng) {
  const A = AS(g), sh = A.shop;
  if (!sh) return;
  const there = L(g).place === sh.place && !L(g).travel;
  for (const p of sh.pupils) {
    p.art = clamp(p.art + (there ? 1.4 : 0.6) * (1 - p.art / 110) * rng.float(0.6, 1.3), 0, 100);
    p.loyal = clamp((p.loyal ?? 50) + (there ? 0.4 : -0.6), 0, 100);
  }
  // 제자들이 받은 주문으로 버는 몫 (내가 없어도 공방은 돈다)
  const earn = Math.round(sh.pupils.reduce((t, p) => t + p.art * 0.08, 0) * priceMul(g) * (sh.hurt > mi(g) ? 0.3 : 1));
  if (earn > 0) { g.player.money += earn; sh.earned = (sh.earned ?? 0) + earn; }
  if (!g.player || sceneQueued(g, 'af_pupil_go')) return;
  const ready = sh.pupils.find((p) => p.art >= 55 && !p.partner && !p.asked);
  if (ready && there) { ready.asked = true; queueScene(g, 'af_pupil_go', { name: ready.name, why: 'ready' }); return; }
  const sly = sh.pupils.find((p) => p.honest < 45);
  if (sly && there && rng.chance(0.03)) queueScene(g, 'af_pupil_go', { name: sly.name, why: 'theft' });
  // 붙잡아 둔 제자가 서운함이 쌓이면 말없이 떠난다
  const sore = sh.pupils.findIndex((p) => p.loyal < 12);
  if (sore >= 0) { const p = sh.pupils.splice(sore, 1)[0]; logA(g, `${J(p.name, '이/가')} 말없이 공방을 떠났다.`); }
}

export function jobMonth(g) {
  const A = AS(g), j = A.job;
  if (!j?.client || mi(g) <= j.due) return;
  A.job = null; A.fails += 1;
  deed(g, 'honest', -4, `${J(g.player.name, '이/가')} 맡은 마도구를 기한 안에 넘기지 못했다`);
  logA(g, `${j.client}의 의뢰를 기한 안에 마치지 못했다.`);
  note(g, `${j.client}의 마도구 의뢰 기한이 지났다. 계약금을 돌려주고 일을 접었다.`);
}

// 지닌 장신구: 치유는 상처를, 결계는 마음을, 생활·일은 몸을 조금 돕는다
export function wornMonth(g, rng) {
  const A = AS(g), w = A.kept[A.worn];
  if (!w || w.slot !== 'trinket') return;
  const spell = w.spellUse ?? null;
  const p = g.player;
  if ((spell === 'heal' || (!spell && w.base === 'ring')) && p.injuries.length && rng.chance(0.08 + w.circle * 0.03)) {
    const i = p.injuries.findIndex((x) => !x.mortal && x.months > 1);
    if (i >= 0) p.injuries[i].months -= 1;
  } else if (spell === 'ward' || w.base === 'amulet') stress(g, -1);
  else tired(g, -1);
}

HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const rng = ownRng(g, 45);
  famousMonth(g, rng);
  shopMonth(g, rng);
  jobMonth(g);
  wornMonth(g, rng);
});
// 대를 이으면: 솜씨는 사람의 것이라 처음부터지만 손버릇(famArt)이 조금 남는다. 공방·제자·마도구·이름난 물건은 집안에 남는다.
HOOKS.heir.push((g) => {
  const A = AS(g);
  if (A.made || A.cut || A.shop) A.past.push({ y: g.date.year, art: Math.round(A.art), made: A.made, blasts: A.blasts, orders: A.orders, shop: A.shop?.name ?? null });
  if (A.past.length > 6) A.past.splice(0, A.past.length - 6);
  A.famArt = Math.max(A.famArt * 0.5, A.art * 0.5);
  A.art = Math.round(A.famArt * 0.25);
  A.job = null; A.made = 0; A.cut = 0; A.blasts = 0; A.orders = 0; A.fails = 0;
  A.learnAt = -99; A.orderAt = -99; A.pupilAt = -99; A.chaseAt = -99;
  for (const f of A.famous) if (f.mine && f.holder && !f.stolen) f.holder = g.player.name;
  if (A.shop) A.shop.heir = true;
});
