// 넉넉해졌을 때: 밑바닥 사람을 돕거나(동냥, 무료 급식, 구빈원 세우기) 부린다(품삯 깎기, 빚으로 묶어 부리기).
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { defineScene, queueScene, sceneQueued, note, chron, stress } from '../adventure/core.js';
import { faithState } from '../faith/index.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { P, ownRng, mi, clamp, here, placeName, free, isSlum, hasPoorhouse, logPoor } from './core.js';

export const ALMS = { alms: 10, soup: 60, build: 300 };
export const BIND_COST = 30;
const BOND_NAMES = ['절름발이 오토', '말 없는 칼라', '빨간 머리 얀', '늙은 하겐', '쌍둥이 형제 펠릭스와 파울', '과부 힐데', '열네 살 루카', '떠돌이 미르코'];
const devote = (g, n) => { const f = faithState(g); if (f.god !== 'none') f.devotion = clamp(f.devotion + n, 0, 100); };

/* ---------- 베풀기 ---------- */
ACTIONS.push({
  id: 'poor_alms',
  name: '가난한 이들에게 베푼다',
  icon: 'home',
  desc: '동냥을 주거나, 신전 무료 급식에 돈을 대거나, 구빈원이 없는 고장이면 구빈원을 세운다. 이름이 나고 마음이 가벼워진다.',
  available: (g) => free(g) && g.player.money >= 150 && !P(g).bond,
  run(g) {
    if (!sceneQueued(g, 'poor_alms')) queueScene(g, 'poor_alms', {}, { first: true });
    return `${placeName(here(g))}의 가난한 이들을 둘러보았다.`;
  },
});
defineScene('poor_alms', {
  need: (g) => free(g),
  title: () => '베푸는 손',
  text: (g) => {
    const p = P(g), pl = here(g);
    return `신전 뒷마당에 무료 급식 줄이 길다. ${hasPoorhouse(g, pl) ? `${p.built[pl] ? '내가 세운' : '낡은'} 구빈원은 늘 자리가 모자란다.` : '이 고장에는 구빈원이 없다. 겨울이면 다리 밑에서 얼어 죽는 사람이 나온다.'}${p.charity[pl] ? ` 이 고장 급식에 돈을 댄 것이 ${p.charity[pl]}번이다.` : ''}`;
  },
  choices: (g) => {
    const m = g.player.money, pl = here(g);
    return [
      ...(m >= ALMS.alms ? [{ label: `거리의 사람들에게 동전을 나눠 준다 (은화 ${ALMS.alms}닢)`, key: 'alms' }] : []),
      ...(m >= ALMS.soup ? [{ label: `한 철 무료 급식 값을 댄다 (은화 ${ALMS.soup}닢)`, key: 'soup' }] : []),
      ...(m >= ALMS.build && !hasPoorhouse(g, pl) ? [{ label: `구빈원을 세운다 (은화 ${ALMS.build}닢)`, key: 'build' }] : []),
      { label: '그냥 돌아선다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const p = P(g), pl = here(g);
    if (key === 'none') return '돈주머니를 만지작거리다 돌아섰다.';
    const cost = ALMS[key];
    if (g.player.money < cost) return '돈이 모자랐다.';
    if (key === 'build' && hasPoorhouse(g, pl)) return '이 고장에는 이미 구빈원이 있다.';
    g.player.money -= cost; p.given += cost;
    if (key === 'alms') { deed(g, 'generous', 2, `${placeName(pl)} 거리에서 동냥을 나눠 주었다.`); devote(g, 1); stress(g, -2); return rng.pick(['동전을 받으려는 손이 사방에서 뻗어 왔다. 다 나눠 주기도 전에 주머니가 비었다.', '아이 하나가 동전을 받고 고개를 숙였다. 그 뒤의 늙은이는 고맙다는 말 대신 더 달라고 했다.']); }
    if (key === 'soup') {
      p.charity[pl] = (p.charity[pl] ?? 0) + 1;
      deed(g, 'generous', 5, `${placeName(pl)} 신전 무료 급식에 돈을 댔다.`); deed(g, 'kind', 2, '굶는 이들을 먹였다.');
      devote(g, 3); stress(g, -4);
      logPoor(g, `${placeName(pl)} 무료 급식에 한 철 돈을 댔다.`);
      return '사제가 급식 줄 앞에서 내 이름을 불러 축복을 빌었다. 그 철 내내 죽 솥에 고기 조각이 떠 있었다고 한다.';
    }
    p.built[pl] = g.date.year;
    deed(g, 'generous', 12, `${placeName(pl)}에 구빈원을 세웠다.`); deed(g, 'kind', 5, '집 없는 이들에게 지붕을 주었다.');
    devote(g, 6); stress(g, -8);
    logPoor(g, `${placeName(pl)}에 구빈원을 세웠다.`);
    note(g, `${placeName(pl)}에 구빈원을 세웠다.`);
    chron(g, `${g.player.name}, ${placeName(pl)}에 구빈원을 세우다.`, 55);
    return `낡은 창고를 사서 마루를 깔고 솥을 걸었다. 문 위에 내 이름을 새긴 나무판이 걸렸다. 첫날 밤 마흔 명이 지붕 아래서 잤다. ${placeName(pl)} 사람들은 이제 그 집을 내 이름으로 부른다.`;
  },
});

/* ---------- 부리기 ---------- */
ACTIONS.push({
  id: 'poor_hire',
  name: '빈민가 일손을 부린다',
  icon: 'coin',
  desc: '빈민가의 일손을 사서 일을 시킨다. 제값을 줄 수도, 품삯을 깎을 수도, 빚을 지워 묶어 둘 수도 있다. 묶어 둔 사람은 달마다 벌어 오지만 사람들 눈이 곱지 않다.',
  available: (g) => free(g) && g.player.money >= 100 && isSlum(here(g)) && !P(g).bond,
  run(g) {
    if (!sceneQueued(g, 'poor_hire')) queueScene(g, 'poor_hire', {}, { first: true });
    return '새벽 인력 시장에 나갔다.';
  },
});
const mineHere = (g) => P(g).bondsmen.filter((b) => b.place === here(g));
defineScene('poor_hire', {
  need: (g) => free(g) && isSlum(here(g)),
  title: () => '인력 시장의 새벽',
  text: (g) => {
    const n = mineHere(g).length;
    return `수십 명이 벽에 기대 서 있다. 내가 다가가자 다들 허리를 폈다. 누구든 고르면 따라온다.${n ? ` 빚으로 묶어 둔 사람이 이 고장에 ${n}명 있다.` : ''}`;
  },
  choices: (g) => {
    const m = g.player.money;
    return [
      ...(m >= 20 ? [{ label: '열 명을 제값에 쓴다 (은화 20닢, 일값 30닢)', key: 'fair' }] : []),
      ...(m >= 10 ? [{ label: '품삯을 반으로 깎아 쓴다 (은화 10닢, 일값 30닢)', key: 'squeeze' }] : []),
      ...(m >= BIND_COST ? [{ label: `빚을 지워 한 사람을 묶어 둔다 (은화 ${BIND_COST}닢)`, key: 'bind' }] : []),
      ...(mineHere(g).length ? [{ label: '묶어 둔 사람들의 빚을 지워 준다', key: 'free' }] : []),
      { label: '그냥 돌아간다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const p = P(g), pl = here(g);
    if (key === 'none') return '발길을 돌렸다. 등 뒤의 눈길이 따가웠다.';
    if (key === 'fair') { if (g.player.money < 20) return '돈이 모자랐다.'; g.player.money += 10; p.hired += 1; deed(g, 'kind', 1, '날품팔이에게 제값을 주었다.'); return '열 명이 하루 종일 일했다. 해 질 녘 품삯을 받은 사내가 다음에도 불러 달라고 했다. 남은 이문은 은화 10닢.'; }
    if (key === 'squeeze') {
      if (g.player.money < 10) return '돈이 모자랐다.';
      g.player.money += 20; p.hired += 1; p.squeezed += 1;
      deed(g, 'kind', -3, '날품팔이 품삯을 깎았다.');
      if (p.squeezed >= 3 && rng.chance(0.3)) { stress(g, 5); return '품삯을 받아 든 사내들이 동전을 바닥에 던졌다. 누군가 "피 빨아 먹는 놈"이라고 했다. 이문은 은화 20닢.'; }
      return '반값에도 다들 따라왔다. 고를 처지가 아닌 사람들이다. 이문은 은화 20닢.';
    }
    if (key === 'bind') {
      if (g.player.money < BIND_COST) return '돈이 모자랐다.';
      g.player.money -= BIND_COST;
      const used = new Set(p.bondsmen.map((b) => b.name));
      const name = rng.pick(BOND_NAMES.filter((n) => !used.has(n))) ?? rng.pick(BOND_NAMES);
      p.bondsmen.push({ name, place: pl, since: mi(g), owed: BIND_COST * 2 });
      deed(g, 'kind', -6, `${placeName(pl)} 빈민가 사람을 빚으로 묶어 부린다.`);
      logPoor(g, `${J(name, '을/를')} 빚으로 묶었다.`);
      return `${J(name, '이/가')} 빌린 은화 ${BIND_COST}닢에 손도장을 찍었다. 이자가 붙어 은화 ${BIND_COST * 2}닢을 일로 갚을 때까지 내 사람이다. 달마다 벌이를 가져올 것이다.`;
    }
    // 풀어 주기
    const mine = mineHere(g);
    p.bondsmen = p.bondsmen.filter((b) => b.place !== pl);
    deed(g, 'kind', 4 * mine.length, '빚으로 묶어 둔 사람들을 풀어 주었다.'); deed(g, 'generous', 2 * mine.length, '빚 문서를 불살랐다.');
    stress(g, -4);
    logPoor(g, `${mine.map((b) => b.name).join(', ')}의 빚을 지워 주었다.`);
    return `빚 문서를 화로에 넣었다. ${mine.map((b) => b.name).join(', ')}. 다들 한참 서 있다가 말없이 고개를 숙였다.`;
  },
});

/* ---------- 묶어 둔 사람들 ---------- */
defineScene('poor_bondsman', {
  need: (g, s) => free(g) && P(g).bondsmen.some((b) => b.name === s.name) && ['flee', 'sick', 'beg'].includes(s.ev),
  title: (g, s) => ({ flee: '빈 침상', sick: '앓아누운 일꾼', beg: '무릎 꿇은 사람' }[s.ev]),
  text: (g, s) => {
    const b = P(g).bondsmen.find((x) => x.name === s.name);
    if (s.ev === 'flee') return `${J(b.name, '이/가')} 밤사이 사라졌다. 남은 빚 은화 ${b.owed}닢어치 일을 두고. 어느 길로 갔는지 아는 사람이 있다.`;
    if (s.ev === 'sick') return `${J(b.name, '이/가')} 열에 들떠 일어나지 못한다. 남은 빚은 은화 ${b.owed}닢어치.`;
    return `${J(b.name, '이/가')} 내 앞에 무릎을 꿇었다. "아이가 아픕니다. 이번 달 벌이만이라도 집에 가져가게 해 주십시오."`;
  },
  choices: (g, s) => {
    if (s.ev === 'flee') return [{ label: '사람을 풀어 잡아 온다', key: 'hunt' }, { label: '보내 준다', key: 'let' }];
    if (s.ev === 'sick') return [{ label: '약값을 댄다 (은화 8닢)', key: 'heal' }, { label: '내쫓고 다른 사람을 들인다', key: 'cast' }];
    return [{ label: '가져가게 한다', key: 'yes' }, { label: '빚을 지워 보내 준다', key: 'free' }, { label: '거절한다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const p = P(g), b = p.bondsmen.find((x) => x.name === s.name);
    if (!b) return '그 사람은 이미 없었다.';
    const drop = () => { p.bondsmen.splice(p.bondsmen.indexOf(b), 1); };
    if (s.ev === 'flee') {
      if (key === 'hunt') { b.owed += 10; deed(g, 'kind', -4, '달아난 일꾼을 잡아 왔다.'); return `사흘 만에 ${J(b.name, '을/를')} 끌고 왔다. 잡아 온 품값은 빚에 얹었다. 눈빛이 달라져 있었다.`; }
      drop(); deed(g, 'kind', 2, '달아난 일꾼을 쫓지 않았다.'); return '장부에서 이름을 지웠다. 길이 멀기를 빌었다.';
    }
    if (s.ev === 'sick') {
      if (key === 'heal') { if (g.player.money < 8) return '돈이 모자랐다.'; g.player.money -= 8; b.owed += 8; deed(g, 'kind', 2, '앓는 일꾼에게 약값을 댔다.'); return '약초꾼이 다녀갔다. 열흘 뒤 일어났다. 약값은 빚에 얹었다.'; }
      drop(); deed(g, 'kind', -5, '앓는 일꾼을 길에 내쫓았다.'); return `${J(b.name, '을/를')} 문밖에 내놓았다. 다리 밑으로 기어가는 것을 보았다.`;
    }
    if (key === 'yes') { b.owed += 4; deed(g, 'kind', 1, '일꾼이 벌이를 집에 가져가게 했다.'); return '그달 벌이는 그 집 약값이 되었다. 빚은 그만큼 늘었다.'; }
    if (key === 'free') { drop(); deed(g, 'kind', 5, '일꾼의 빚을 지워 주었다.'); deed(g, 'generous', 3, '빚 문서를 찢었다.'); return '빚 문서를 찢어 건넸다. 그는 종이 조각을 쥔 채 한참 울었다.'; }
    stress(g, 2); deed(g, 'kind', -2, '아픈 아이가 있는 일꾼을 외면했다.');
    return '"빚이 먼저다." 그는 일어나 다시 일하러 갔다.';
  },
});

HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const p = P(g), rng = ownRng(g, 2);
  if (!p.bondsmen.length) return;
  // 달마다 벌이를 가져오고 빚이 준다. 다 갚으면 떠난다.
  let got = 0;
  for (const b of [...p.bondsmen]) {
    got += 4; b.owed -= 3;
    if (b.owed <= 0) { p.bondsmen.splice(p.bondsmen.indexOf(b), 1); logPoor(g, `${J(b.name, '이/가')} 빚을 다 갚고 떠났다.`); }
  }
  g.player.money += got;
  const b = p.bondsmen[0];
  if (b && free(g) && here(g) === b.place && rng.chance(0.05 * p.bondsmen.length) && !sceneQueued(g, 'poor_bondsman')) {
    queueScene(g, 'poor_bondsman', { name: rng.pick(p.bondsmen).name, ev: rng.pick(['flee', 'sick', 'beg']) });
  }
});
// 대를 이어도 빚 문서는 남는다 (따로 할 일 없음). 묶어 둔 사람이 떠난 기록은 log에 남는다.
export const bondsmenOf = (g) => P(g).bondsmen.map((b) => ({ name: b.name, place: b.place, placeName: placeName(b.place), owed: Math.max(0, b.owed), months: mi(g) - b.since }));
