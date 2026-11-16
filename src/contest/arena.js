// 투기장: 내가 모래판에 서거나(결투 방식, src/duel/), 기르는 짐승을 내보내거나(src/beasts/), 남의 싸움에 건다.
// 이름이 날수록 센 상대가 붙고 상금이 커진다. 져 주면 돈을 주겠다는 제의(승부 조작)도 온다.
import { ACTIONS } from '../actions.js';
import { playerAge } from '../game.js';
import { defineScene, queueScene, sceneQueued, note, chron, stress } from '../adventure/core.js';
import { queueDuel, registerDuelEnd } from '../duel/registry.js';
import { alive } from '../beasts/index.js';
import { beastPow, bury, logBeast, fullName as beastName } from '../beasts/core.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { C, mi, clamp, here, placeName, free, logContest, renown, bannedAt } from './core.js';

export const ARENAS = { leocast: 1.0, eisen: 1.2, barka: 0.9, portel: 0.9, saltmare: 1.0 };
export const ARENA_TIERS = ['모래판 신참', '이름이 붙은 싸움꾼', '관중이 기다리는 검투사', '투기장의 왕'];
export const PRIZE = [25, 60, 150, 400];
const FOES = [
  ['굶주린 탈영병', '빚에 팔려 온 농부', '술 취한 용병'],
  ['붉은 수염 하겐', '쌍도끼 브루노', '북부의 곰 사냥꾼'],
  ['피 묻은 손 오스카', '제국 검투사 루치아', '사슬 춤꾼 미로'],
  ['투기장의 왕 그라크', '불패의 엘제', '사막에서 온 검은 칼'],
];
const BEAST_FOES = [['투견 세 마리', '굶긴 멧돼지'], ['우리 속 회색곰', '사냥개 떼'], ['쇠사슬 묶인 서리늑대', '눈먼 동굴 트롤'], ['날개 꺾인 와이번', '늪의 거대 도마뱀']];
export const tierOf = (g) => { const f = C(g).arena.fame; return f >= 60 ? 3 : f >= 25 ? 2 : f >= 8 ? 1 : 0; };
const beastTier = (g) => { const w = C(g).arena.beastWins; return w >= 8 ? 3 : w >= 4 ? 2 : w >= 1 ? 1 : 0; };
const fighters = (g) => alive(g).filter((a) => beastPow(g, a) > 0 && a.kind !== 'familiar').sort((x, y) => beastPow(g, y) - beastPow(g, x));
const canArena = (g) => playerAge(g) >= 16 && free(g) && !!ARENAS[here(g)] && !bannedAt(g, 'arena');
const prize = (g, tier) => Math.round(PRIZE[tier] * (ARENAS[here(g)] ?? 1));

ACTIONS.push({
  id: 'contest_arena',
  name: '투기장에 나간다',
  icon: 'hunt',
  desc: '모래판에 직접 서거나, 기르는 짐승을 내보내거나, 남의 싸움에 건다. 이길수록 이름이 나고 상금이 커진다. 지면 다친다.',
  available: (g) => canArena(g) && !sceneQueued(g, 'contest_arena'),
  run(g) { queueScene(g, 'contest_arena'); return '투기장 아래 대기실로 내려갔다. 피와 모래 냄새가 났다.'; },
});

defineScene('contest_arena', {
  need: (g) => canArena(g),
  title: (g) => `${placeName(here(g))}의 투기장`,
  text: (g, s) => {
    const a = C(g).arena, t = tierOf(g);
    s.foe ??= FOES[t][(mi(g) + a.wins) % FOES[t].length];
    s.offer ??= a.fame >= 8 && (mi(g) % 5 === 0) ? Math.round(prize(g, t) * 1.5) : 0;
    const best = fighters(g)[0];
    return `관중석이 가득 찼다. 오늘 내 상대로 잡힌 것은 ${s.foe}. 이기면 은화 ${prize(g, t)}닢. 투기장에서 나는 "${ARENA_TIERS[t]}"${a.wins ? `(${a.wins}승 ${a.losses}패)` : ''}.${best ? ` 짐승 싸움판에는 ${J(beastName(best), '을/를')} 내보낼 수 있다.` : ''}${s.offer ? ` 대기실에서 낯선 사내가 속삭였다. "오늘 쓰러져 주면 은화 ${s.offer}닢. 다들 상대에게 걸었소."` : ''}`;
  },
  choices: (g, s) => {
    const out = [];
    if (!g.duelQueued) out.push({ label: '모래판에 선다', key: 'fight' });
    if (s.offer && !g.duelQueued) out.push({ label: `져 주기로 한다 (은화 ${s.offer}닢)`, key: 'throw' });
    const best = fighters(g)[0];
    if (best) out.push({ label: `${J(beastName(best), '을/를')} 짐승 싸움판에 내보낸다`, key: 'beast' });
    if (g.player.money >= 20) out.push({ label: '이름난 쪽에 은화 20닢을 건다', key: 'bet:fav' }, { label: '약한 쪽에 은화 20닢을 건다', key: 'bet:dog' });
    out.push({ label: '구경만 한다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const c = C(g), a = c.arena, t = tierOf(g);
    if (key === 'fight') {
      if (g.duelQueued) return '오늘은 이미 잡힌 싸움이 있다.';
      const sk = [36, 52, 68, 84][t] + rng.int(-4, 4);
      queueDuel(g, { kind: 'contest_arena', title: '투기장', intro: `철문이 열렸다. 모래 위로 ${J(s.foe ?? '상대', '이/가')} 걸어 나왔다. 관중이 발을 굴렀다.`, foe: { name: s.foe ?? '투기장 싸움꾼', skill: sk, style: rng.pick(['steady', 'aggressive', 'tricky']) }, ctx: { tier: t, place: here(g), prize: prize(g, t) } });
      return '모래판으로 이어진 계단을 올랐다.';
    }
    if (key === 'throw') {
      g.player.money += s.offer;
      a.losses += 1; a.fame = Math.max(0, a.fame - 2);
      c.fixed.push({ kind: 'arena', place: here(g), year: g.date.year, exposed: false, at: mi(g) });
      logContest(g, `${placeName(here(g))} 투기장에서 져 주고 은화 ${s.offer}닢을 받았다.`);
      stress(g, 6);
      return `세 합째에 일부러 칼을 놓쳤다. 상대의 칼등이 어깨를 쳤다. 쓰러져 누운 채 관중의 야유를 들었다. 그날 밤 은화 ${s.offer}닢이 든 주머니가 숙소 문 앞에 놓여 있었다.`;
    }
    if (key === 'beast') {
      const b = fighters(g)[0];
      if (!b) return '내보낼 짐승이 없었다.';
      const bt = beastTier(g), foe = BEAST_FOES[bt][mi(g) % BEAST_FOES[bt].length];
      const mine = beastPow(g, b), theirs = [5, 10, 17, 25][bt] + rng.int(-2, 3);
      const win = rng.chance(clamp(mine / (mine + theirs), 0.08, 0.92));
      if (win) {
        const p = Math.round(prize(g, bt) * 0.7);
        g.player.money += p; a.beastWins += 1; a.fame += 1 + bt;
        b.bond = Math.min(100, (b.bond ?? 30) + 3);
        logContest(g, `${J(beastName(b), '이/가')} 투기장에서 ${J(foe, '을/를')} 이겼다.`);
        logBeast(g, `투기장에서 ${J(foe, '을/를')} 이겼다.`);
        if (bt === 3) chron(g, `${g.player.name}의 ${J(beastName(b), '이/가')} 투기장의 짐승 싸움판을 휘어잡다.`, 60);
        return `${J(beastName(b), '이/가')} ${J(foe, '을/를')} 물어뜯어 쓰러뜨렸다. 관중이 일어섰다. 은화 ${p}닢. 피투성이가 된 녀석이 내 손을 핥았다.`;
      }
      stress(g, 6);
      if (rng.chance(0.35 + bt * 0.05)) {
        bury(g, b, '투기장에서 죽었다', 30);
        logContest(g, `${J(beastName(b), '이/가')} 투기장에서 죽었다.`);
        return `${J(beastName(b), '은/는')} ${foe}에게 끝내 일어서지 못했다. 모래 위에 피가 번졌다. 관중은 벌써 다음 싸움을 기다렸다.`;
      }
      b.bond = Math.max(0, (b.bond ?? 30) - 8);
      return `${J(beastName(b), '이/가')} 꼬리를 말고 물러났다. 목숨은 건졌지만 다리를 절었다. 나를 보는 눈빛이 예전 같지 않다.`;
    }
    if (key.startsWith('bet:')) {
      if (g.player.money < 20) return '걸 돈이 모자랐다.';
      const fav = key === 'bet:fav';
      const win = rng.chance(fav ? 0.62 : 0.3);
      c.games += 1;
      if (win) { const got = fav ? 12 : 40; g.player.money += got; c.won += got; logContest(g, `투기장 내기로 은화 ${got}닢을 땄다.`); return fav ? `이름난 쪽이 예상대로 이겼다. 은화 ${got}닢을 받았다. 배당은 짰다.` : `아무도 기대하지 않던 쪽이 마지막 일격을 꽂았다. 관중석이 뒤집혔다. 은화 ${got}닢!`; }
      g.player.money -= 20; c.lost += 20; logContest(g, '투기장 내기로 은화 20닢을 잃었다.');
      return fav ? '이름난 쪽이 어이없이 쓰러졌다. 누군가 웃으며 돈을 세었다. 은화 20닢이 날아갔다.' : '약한 쪽은 약했다. 은화 20닢이 날아갔다.';
    }
    return '함성과 피 냄새 속에서 몇 판을 구경했다.';
  },
});

registerDuelEnd('contest_arena', (g, rng, won, d) => {
  const c = C(g), a = c.arena, t = d.ctx?.tier ?? 0, p = d.ctx?.prize ?? PRIZE[t];
  if (won) {
    g.player.money += p; a.wins += 1; a.fame += 2 + t * 2;
    renown(g, [1, 3, 6, 12][t]);
    deed(g, 'brave', 4 + t * 2, '투기장 모래판에서 이겼다.', d.ctx?.place);
    logContest(g, `투기장에서 이겼다 (은화 ${p}닢).`);
    if (t === 3) { c.titles.push({ id: 'arena', place: d.ctx?.place, year: g.date.year, text: `${placeName(d.ctx?.place)} 투기장의 왕` }); chron(g, `${g.player.name}, ${placeName(d.ctx?.place)} 투기장의 왕을 꺾다.`, 90); note(g, '투기장의 왕을 꺾었다.'); }
    return `관중이 내 이름을 외쳤다. 은화 ${p}닢.${t >= 2 ? ' 귀족 관람석에서 누가 장미를 던졌다.' : ''}`;
  }
  a.losses += 1; a.fame = Math.max(0, a.fame - 1);
  if (rng.chance(0.5)) g.player.injuries.push({ name: '투기장에서 얻은 상처', months: 2 });
  stress(g, 8);
  logContest(g, '투기장에서 졌다.');
  const comfort = Math.round(p / 10);
  g.player.money += comfort;
  return `모래 위에 쓰러진 채 야유를 들었다. 위로금으로 은화 ${comfort}닢이 던져졌다.`;
});
registerDuelEnd('contest_arena:decline', (g) => { C(g).arena.fame = Math.max(0, C(g).arena.fame - 2); return '철문 앞에서 돌아섰다. 관중의 야유가 계단까지 따라왔다.'; });
