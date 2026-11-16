// 주사위와 카드: 도박판, 속임수, 고리대금 빚으로 거는 판, 노름 버릇.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainStat, playerAge } from '../game.js';
import { defineScene, queueScene, sceneQueued, note, stress, check, gains, up } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { E as estate, LENDERS } from '../estate/core.js';
import { canBorrow } from '../estate/money.js';
import { C, mi, clamp, here, placeName, free, stat, logContest, bannedAt, ban, itchWord } from './core.js';

export const GAMBLE_LOAN = 50;
const canGamble = (g) => playerAge(g) >= 15 && free(g) && (PLACES[here(g)]?.inn ?? 0) > 0 && !bannedAt(g, 'gamble');
const sharkHere = (g) => (LENDERS.shark.places ?? []).includes(here(g)) && canBorrow(g, 'shark') >= GAMBLE_LOAN;
export const stakes = (g) => ({ small: Math.min(10, g.player.money), big: Math.min(50, g.player.money) });
// 카드(왕과 거지)는 머리와 눈썰미가 받쳐 준다
export const cardOdds = (g) => clamp(0.34 + (stat(g, 'int') + stat(g, 'sen')) / 450, 0.3, 0.6);

ACTIONS.push({
  id: 'contest_gamble',
  name: '도박판에 앉는다',
  icon: 'coin',
  desc: '주막 뒷방에서 주사위를 굴리거나 카드를 돌린다. 한 판에 크게 딸 수도, 크게 잃을 수도 있다. 자꾸 하면 버릇이 된다.',
  available: (g) => canGamble(g) && !sceneQueued(g, 'contest_gamble'),
  run(g) { queueScene(g, 'contest_gamble'); return '주막 뒷방의 휘장을 걷었다. 탁자마다 촛불과 은화가 쌓여 있었다.'; },
});

defineScene('contest_gamble', {
  need: (g) => canGamble(g),
  title: (g) => `${placeName(here(g))}의 도박판`,
  text: (g) => {
    const c = C(g);
    const scene = ['뼈 주사위가 나무 그릇 안에서 달그락거린다. 취한 용병이 은화 한 줌을 걸고 소리를 지른다.', '카드 패를 쥔 상인이 눈썹 하나 움직이지 않는다. 그 옆에서 누가 반지를 걸었다.', '연기 자욱한 방, 패를 돌리는 딜러의 손가락이 너무 빠르다.'][(g.date.month + g.date.year) % 3];
    const debt = estate(g).loans.filter((l) => l.lender === 'shark').reduce((a, l) => a + l.principal, 0);
    return `${scene} 가진 돈은 은화 ${g.player.money}닢.${debt ? ` 고리대금업자에게 진 빚이 은화 ${debt}닢이다.` : ''} ${c.games ? `지금까지 ${c.won >= c.lost ? `은화 ${c.won - c.lost}닢을 땄다` : `은화 ${c.lost - c.won}닢을 잃었다`}.` : ''} 나는 ${itchWord(c.itch)}.`;
  },
  choices: (g) => {
    const s = stakes(g), out = [];
    if (s.small >= 3) out.push({ label: `주사위에 은화 ${s.small}닢을 건다`, key: 'dice:small' });
    if (s.big >= 30) out.push({ label: `주사위에 은화 ${s.big}닢을 건다`, key: 'dice:big' });
    if (g.player.money >= 20) out.push({ label: '카드판에 앉는다 (은화 20닢)', key: 'cards' });
    if (g.player.money >= 10) out.push({ label: '주사위를 바꿔치기한다', key: 'cheat' });
    if (sharkHere(g)) out.push({ label: `고리대금업자에게 은화 ${GAMBLE_LOAN}닢을 빌려 건다`, key: 'loan' });
    out.push({ label: '일어선다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'no') { if (c.itch >= 40) stress(g, 3); return c.itch >= 40 ? '일어서는 데 한참 걸렸다. 등 뒤의 주사위 소리가 길까지 따라왔다.' : '구경만 하고 나왔다.'; }
    const settle = (stake, win, mult, how) => {
      c.games += 1;
      c.itch = clamp(c.itch + 3 + (win ? 1 : 2) + (stake >= 50 ? 2 : 0), 0, 100);
      if (win) { const got = Math.round(stake * (mult - 1)); g.player.money += got; c.won += got; c.best = Math.max(c.best, got); logContest(g, `${placeName(here(g))} 도박판에서 은화 ${got}닢을 땄다 (${how}).`); return got; }
      g.player.money -= stake; c.lost += stake; c.worst = Math.max(c.worst, stake); logContest(g, `${placeName(here(g))} 도박판에서 은화 ${stake}닢을 잃었다 (${how}).`);
      if (stake >= 50) stress(g, 6);
      return -stake;
    };
    if (key.startsWith('dice') || key === 'loan') {
      if (key === 'loan') {
        if (!sharkHere(g)) return '고리대금업자는 오늘 자리에 없었다.';
        const e = estate(g);
        e.loans.push({ id: e.seq++, lender: 'shark', principal: GAMBLE_LOAN, due: mi(g) + 6, missed: 0, from: here(g) });
        g.player.money += GAMBLE_LOAN;
        note(g, `도박판에서 고리대금업자에게 은화 ${GAMBLE_LOAN}닢을 빌렸다.`);
      }
      const stake = key === 'dice:big' ? stakes(g).big : key === 'loan' ? Math.min(GAMBLE_LOAN, g.player.money) : stakes(g).small;
      if (stake < 1) return '걸 돈이 남아 있지 않았다.';
      const win = rng.chance(0.47 + (stat(g, 'sen') >= 60 ? 0.03 : 0));
      const r = settle(stake, win, 2, '주사위');
      const loanLine = key === 'loan' ? ' 빌린 돈은 여섯 달 안에 갚아야 한다. 이자는 달마다 붙는다.' : '';
      return (r > 0 ? rng.pick(['여섯이 둘. 탁자를 둘러싼 사람들이 탄성을 질렀다.', '주사위가 오래 구르다 멈췄다. 내 쪽이었다.']) + ` 은화 ${r}닢을 땄다.` : rng.pick(['하나가 둘. 딜러가 은화를 쓸어 갔다.', '마지막 주사위가 모서리에 걸렸다가 넘어갔다. 내 쪽이 아니었다.']) + ` 은화 ${-r}닢을 잃었다.`) + loanLine;
    }
    if (key === 'cards') {
      if (g.player.money < 20) return '걸 돈이 모자랐다.';
      const win = rng.chance(cardOdds(g));
      const r = settle(20, win, 2.2, '카드');
      const st = gainStat(g, 'sen', 0.3);
      return (r > 0 ? `상대가 패를 내던졌다. 거지 셋을 쥐고 왕인 척한 것이 먹혔다. 은화 ${r}닢.` : '왕 둘을 쥐고 끝까지 갔다. 상대는 왕 셋이었다. 은화 20닢이 날아갔다.') + gains([up('감각', st)]);
    }
    if (key === 'cheat') {
      if (g.player.money < 10) return '걸 돈이 모자랐다.';
      const ok = check(rng, stat(g, 'agi') * 0.6 + stat(g, 'sen') * 0.5, 55);
      if (ok) {
        const stake = Math.min(30, g.player.money);
        const got = settle(stake, true, 2, '속임수');
        return `소매 속 납 주사위를 굴렸다. 여섯, 여섯. 아무도 눈치채지 못했다. 은화 ${got}닢.`;
      }
      settle(Math.min(10, g.player.money), false, 2, '속임수가 들킴');
      g.player.injuries.push({ name: '도박판에서 맞은 멍', months: 1 });
      reportCrime(g, 'fraud', here(g), { mult: 0.4 });
      deed(g, 'honest', -8, '도박판에서 주사위를 바꿔치기하다 들켰다.');
      ban(g, 'gamble', 12);
      stress(g, 8);
      return '납 주사위가 탁자 위에서 이상하게 굴렀다. 딜러가 내 손목을 잡았다. 주막 뒷마당에서 실컷 맞고 쫓겨났다. 한 해 동안 이 고장 도박판에는 얼굴을 내밀 수 없다.';
    }
    return '자리를 떴다.';
  },
});

/* ---------- 노름 버릇 ---------- */
defineScene('contest_urge', {
  need: (g) => free(g) && C(g).itch >= 40,
  title: () => '근질거리는 손',
  text: (g) => `밤이 되자 손가락이 저절로 탁자를 두드렸다. ${g.player.money >= 10 ? '주머니 속 은화가 무겁다.' : '주머니는 가볍지만, 집에는 팔 만한 것이 있다.'} 주막 뒷방의 불빛이 창 너머로 보인다.`,
  choices: (g) => [{ label: '이를 악물고 참는다', key: 'resist' }, ...(g.player.money >= 5 ? [{ label: '딱 한 판만 한다', key: 'one' }] : []), { label: '누구에게 털어놓는다', key: 'talk' }],
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'resist') {
      const ok = check(rng, stat(g, 'wil'), 30 + c.itch * 0.4);
      const w = gainStat(g, 'wil', 0.6);
      if (ok) { c.itch = clamp(c.itch - 8, 0, 100); return `밤새 뒤척였지만 나가지 않았다. 아침이 오니 조금 가벼웠다.${gains([up('의지', w)])}`; }
      key = 'one';
    }
    if (key === 'talk') { c.itch = clamp(c.itch - 5, 0, 100); stress(g, -3); return '오랜 벗에게 털어놓았다. 그는 아무 말 없이 술잔만 채워 주었다. 그날 밤은 나가지 않았다.'; }
    // 한 판만: 한 판으로 끝나는 법은 없다
    const stake = Math.min(g.player.money, 10 + Math.round(c.itch / 3));
    if (stake < 1) { stress(g, 4); return '나가 보았지만 걸 돈이 없었다. 구경만 하다 새벽에 돌아왔다.'; }
    c.games += 1; c.itch = clamp(c.itch + 4, 0, 100);
    if (rng.chance(0.42)) { g.player.money += stake; c.won += stake; logContest(g, `참지 못하고 나가 은화 ${stake}닢을 땄다.`); return `한 판만 하려 했는데 새벽까지 앉아 있었다. 운 좋게 은화 ${stake}닢을 따서 돌아왔다. 다음에도 그럴까.`; }
    g.player.money -= stake; c.lost += stake; stress(g, 6);
    logContest(g, `참지 못하고 나가 은화 ${stake}닢을 잃었다.`);
    return `한 판만 하려 했는데 새벽까지 앉아 있었다. 은화 ${stake}닢이 사라졌다. 해가 뜰 때 나 자신이 미웠다.`;
  },
});
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const c = C(g);
  if (c.itch < 40 || !free(g) || sceneQueued(g, 'contest_urge') || mi(g) - c.urgeAt < 3) return;
  if (!rng.chance(0.08 + c.itch / 400)) return;
  c.urgeAt = mi(g);
  queueScene(g, 'contest_urge');
});

