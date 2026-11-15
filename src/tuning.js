// 헤드가 관리하는 균형 조정 모음. 여러 갈래가 만든 것을 이어 붙이며 생긴 빈틈을 메운다.
import { ACTIONS } from './actions.js';
import { HOOKS } from './hooks.js';
import { playerAge, gainSkill, gainStat, circleOf } from './game.js';
import { up, gains, join } from './narrative/text.js';

// 마법사 스승이 없거나 죽어도 마법을 아예 못 배우는 일이 없게: 느린 독학
ACTIONS.push({
  id: 'magic_selfstudy',
  name: '마법 독학',
  icon: 'book',
  desc: '낡은 입문서와 기억에 기대어 혼자 마법을 익힌다. 스승에게 배우는 것보다 훨씬 느리다. 글을 읽을 줄 알아야 한다.',
  available: (g) => g.player.manaAwakened && playerAge(g) >= 9 && g.player.skills.letters >= 15,
  run(g, rng) {
    g.player.fatigue = Math.min(100, g.player.fatigue + 10);
    const before = circleOf(g);
    const k = gainSkill(g, 'magic', 0.9, 'int');
    const i = gainStat(g, 'int', 0.3);
    const after = circleOf(g);
    const scene = after > before
      ? `몇 달째 같은 도형을 그리던 밤, 마력이 처음으로 원을 그리며 멈췄다. 누구에게도 배우지 않고 ${after}서클에 닿았다.`
      : rng.pick([
        '책장이 너덜너덜한 입문서를 처음부터 다시 읽었다. 절반은 알아들을 수 없었다.',
        '촛불 앞에서 마력을 손끝으로 모으려 애썼다. 세 번에 한 번쯤 불꽃이 흔들렸다.',
        '틀린 마법진을 그려 손바닥이 따끔했다. 무엇이 틀렸는지 알아내는 데 밤을 새웠다.',
      ]);
    return join(scene, gains(up('마법', k), up('지능', i)));
  },
});

// 저장이 끝없이 커지지 않게 오래된 기록을 줄인다
const trim = (g) => {
  if (g.chronicle?.length > 900) g.chronicle.splice(0, g.chronicle.length - 900);
  for (const p of g.people) {
    if (p.history?.length > 40) p.history.splice(0, p.history.length - 40);
    if (p.memories?.length > 30) p.memories.splice(0, p.memories.length - 30);
  }
};
HOOKS.endOfMonth.push((g) => { if (g.date.month === 1) trim(g); });
HOOKS.migrate.push(trim);

// 오래전에 죽은 남의 기록 줄이기 (저장 크기): 백 년 넘게 이어진 판은 죽은 사람 수백 명의 일기가 저장의 절반이었다.
// 스무 해 넘게 지난, 내 핏줄도 짝도 아닌 죽은 사람은 이름과 마지막 몇 줄만 남긴다. 사람 자체는 지우지 않는다 (다른 갈래가 id로 찾는다).
HOOKS.endOfMonth.push((g) => {
  if (g.date.month !== 1 || !Array.isArray(g.people)) return;
  const now = g.date.year;
  const keep = new Set([...(g.player?.familyIds ?? []), ...(g.people.find((p) => p.isPlayer)?.childIds ?? [])]);
  for (const a of g.life?.ancestors ?? []) keep.add(a.id);
  for (const p of g.people) {
    if (p.alive || p.isPlayer || keep.has(p.id) || p.compact) continue;
    const last = p.history?.[p.history.length - 1];
    if (!last || now - last.y < 20) continue;
    if (p.history.length > 3) p.history = [p.history[0], ...p.history.slice(-2)];
    if (p.memories) p.memories = [];
    p.compact = 1;
  }
});
