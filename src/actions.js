// 한 달에 고르는 행동들. 나이, 집안, 마을 사람(스승)이 살아 있는지에 따라 할 수 있는 게 달라진다.
import {
  playerAge, gainStat, gainSkill, family, me, circleOf,
} from './game.js';
import { living, byId, fullName, ageYears, has } from './npc.js';
import { JOBS } from './data.js';

const findJob = (game, job) => living(game).find((p) => p.job === job && !p.isPlayer);
const father = (game) => byId(game, game.player.familyIds[0]);
const tired = (game, n) => { game.player.fatigue = Math.min(100, game.player.fatigue + n); };
const stress = (game, n) => { game.player.stress = Math.max(0, Math.min(100, game.player.stress + n)); };
const pay = (game, n) => {
  const p = game.player;
  if (p.money >= n) { p.money -= n; return true; }
  if (p.familyMoney >= n) { p.familyMoney -= n; return true; }
  return false;
};
const fmt = (parts) => parts.filter(Boolean).join(' ');
const up = (name, g) => (g > 0.04 ? `${name} +${g.toFixed(1)}` : null);

function meetSomeone(game, rng, filter) {
  const cands = living(game).filter((p) => !p.isPlayer && !p.known && filter(p));
  if (!cands.length) return null;
  const p = rng.pick(cands);
  p.known = true;
  p.affection = rng.int(5, 20);
  p.history.push({ y: game.date.year, m: game.date.month, text: `${game.player.name}와(과) 처음 알게 되었다.` });
  return p;
}

export const ACTIONS = [
  {
    id: 'play',
    name: '뛰어놀기',
    desc: '마을 아이들과 들판과 골목을 뛰어다닌다. 몸이 자라고 친구가 생긴다.',
    available: (g) => playerAge(g) >= 3 && playerAge(g) < 13,
    run(g, rng) {
      tired(g, 8); stress(g, -12);
      const a = gainStat(g, 'agi', 0.9), s = gainStat(g, 'str', 0.5), c = gainStat(g, 'cha', 0.3);
      let extra = '';
      const age = playerAge(g);
      const friend = rng.chance(0.45) && meetSomeone(g, rng, (p) => Math.abs(ageYears(p) - age) <= 3);
      if (friend) extra = `${friend.name}(${ageYears(friend)}살)와(과) 친해졌다.`;
      return fmt([rng.pick(['개울에서 물수제비를 떴다.', '방앗간 뒤에서 술래잡기를 했다.', '나무 막대로 기사 놀이를 했다.', '헛간 지붕에 올라갔다가 혼났다.']), extra, `(${[up('민첩', a), up('힘', s), up('매력', c)].filter(Boolean).join(', ')})`]);
    },
  },
  {
    id: 'help_home',
    name: '집안일 돕기',
    desc: '집안의 일을 거든다. 집안마다 하는 일이 다르다.',
    available: (g) => playerAge(g) >= 5,
    run(g, rng) {
      tired(g, 12); stress(g, 4);
      const fam = family(g).id;
      if (fam === 'farmer') {
        const k = gainSkill(g, 'farming', 1.6, 'str'), s = gainStat(g, 'str', 0.6), w = gainStat(g, 'wil', 0.4);
        g.player.familyMoney += 1;
        return `밭에서 돌을 고르고 김을 맸다. (${[up('농사', k), up('힘', s), up('의지', w)].filter(Boolean).join(', ')})`;
      }
      if (fam === 'merchant') {
        const k = gainSkill(g, 'trade', 1.6, 'cha'), i = gainStat(g, 'int', 0.5), c = gainStat(g, 'cha', 0.4);
        g.player.familyMoney += 2;
        return `가게에서 물건을 정리하고 손님을 맞았다. (${[up('장사', k), up('지능', i), up('매력', c)].filter(Boolean).join(', ')})`;
      }
      const w = gainStat(g, 'wil', 0.7), c = gainStat(g, 'cha', 0.3);
      g.player.familyMoney += 1;
      return `낡은 저택을 쓸고 닦고, 어머니의 베틀 일을 거들었다. 가문의 체면은 이런 데서 지켜진다고 어머니는 말했다. (${[up('의지', w), up('매력', c)].filter(Boolean).join(', ')})`;
    },
  },
  {
    id: 'study',
    name: '예배당에서 글 배우기',
    desc: '성광교 사제에게 글과 셈, 역사를 배운다. 한 달에 은화 1닢.',
    available: (g) => playerAge(g) >= 6 && !!findJob(g, 'priest'),
    run(g, rng) {
      if (!pay(g, 1)) { stress(g, 4); return '수업료가 없어 예배당 문 앞에서 돌아왔다.'; }
      tired(g, 8); stress(g, 5);
      const k = gainSkill(g, 'letters', 2.0, 'int'), i = gainStat(g, 'int', 0.8), w = gainStat(g, 'wil', 0.3);
      const priest = findJob(g, 'priest');
      priest.known = true; priest.affection += 1;
      const lesson = rng.pick([
        '용사 아르스와 그 일행이 마신을 봉인한 이야기를 배웠다.',
        '레오니아 왕국 역대 왕의 이름을 외웠다.',
        '성광교 경전의 첫 장을 더듬더듬 읽었다.',
        '은화와 동화를 셈하는 법을 배웠다.',
        '다섯 대륙과 바다의 이름을 배웠다.',
      ]);
      return `${lesson} (${[up('글과 학문', k), up('지능', i), up('의지', w)].filter(Boolean).join(', ')})`;
    },
  },
  {
    id: 'train_body',
    name: '몸 단련',
    desc: '달리고, 나무를 패고, 돌을 든다. 힘들지만 몸이 단단해진다.',
    available: (g) => playerAge(g) >= 7,
    run(g, rng) {
      tired(g, 18); stress(g, 3);
      const s = gainStat(g, 'str', 1.2), a = gainStat(g, 'agi', 0.4), w = gainStat(g, 'wil', 0.6);
      return `언덕길을 달리고 장작을 팼다. (${[up('힘', s), up('민첩', a), up('의지', w)].filter(Boolean).join(', ')})`;
    },
  },
  {
    id: 'sword_father',
    name: '아버지에게 검 배우기',
    desc: '퇴역 기사인 아버지가 가문의 검술을 가르친다. 강검류의 기본.',
    available: (g) => playerAge(g) >= 6 && father(g)?.alive && father(g)?.job === 'old_knight',
    run(g, rng) {
      tired(g, 16); stress(g, 6);
      const k = gainSkill(g, 'sword', 2.2, 'str'), s = gainStat(g, 'str', 0.5), a = gainStat(g, 'agi', 0.4), w = gainStat(g, 'wil', 0.4);
      const f = father(g); f.affection += 1;
      const line = rng.pick([
        '"검은 팔이 아니라 허리로 휘두른다." 아버지가 목검으로 등을 툭 쳤다.',
        '같은 내려베기를 삼백 번 했다. 손바닥에 물집이 잡혔다.',
        '아버지는 오늘따라 말이 없었다. 다만 내 자세를 오래 바라보았다.',
        '"우리 가문은 한때 영주의 깃발 아래 섰다." 아버지가 녹슨 장검을 닦으며 말했다.',
      ]);
      return `${line} (${[up('검술', k), up('힘', s), up('민첩', a), up('의지', w)].filter(Boolean).join(', ')})`;
    },
  },
  {
    id: 'sword_guard',
    name: '경비대에게 검 배우기',
    desc: '마을 경비대원에게 실전 검술을 배운다. 한 달에 은화 2닢.',
    available: (g) => playerAge(g) >= 9 && !!findJob(g, 'guard'),
    run(g, rng) {
      if (!pay(g, 2)) { stress(g, 4); return '돈이 모자라 경비대원이 고개를 저었다.'; }
      tired(g, 16); stress(g, 5);
      const k = gainSkill(g, 'sword', 1.7, 'agi'), a = gainStat(g, 'agi', 0.5), s = gainStat(g, 'str', 0.4);
      const gd = findJob(g, 'guard'); gd.known = true; gd.affection += 1;
      return `${gd.name}에게 막고, 피하고, 찌르는 법을 배웠다. 품위는 없지만 살아남는 검이다. (${[up('검술', k), up('민첩', a), up('힘', s)].filter(Boolean).join(', ')})`;
    },
  },
  {
    id: 'meditate',
    name: '마력 명상',
    desc: '조용히 앉아 몸속의 마력을 느끼고 돌린다. 마력이 조금 더 자란다.',
    available: (g) => g.player.manaAwakened,
    run(g, rng) {
      tired(g, 6); stress(g, -6);
      const p = g.player;
      const before = p.mana;
      p.mana += p.manaPotential * (playerAge(g) < 15 ? 1.6 : 0.3) + 0.2;
      const w = gainStat(g, 'wil', 0.4), sn = gainStat(g, 'sen', 0.3);
      return `숨을 고르고 몸속 흐름을 따라갔다. (마력 +${(p.mana - before).toFixed(1)}${up('의지', w) ? ', ' + up('의지', w) : ''}${up('감각', sn) ? ', ' + up('감각', sn) : ''})`;
    },
  },
  {
    id: 'magic_lesson',
    name: '마법사에게 배우기',
    desc: '마을 변두리의 떠돌이 마법사에게 마법의 기초를 배운다. 한 달에 은화 3닢.',
    available: (g) => playerAge(g) >= 8 && g.player.manaAwakened && !!findJob(g, 'hedge_mage'),
    run(g, rng) {
      if (!pay(g, 3)) { stress(g, 4); return '수업료가 모자랐다. 마법사는 문을 열어주지 않았다.'; }
      tired(g, 12); stress(g, 6);
      const before = circleOf(g);
      const k = gainSkill(g, 'magic', 2.0, 'int'), i = gainStat(g, 'int', 0.6), sn = gainStat(g, 'sen', 0.3);
      const m = findJob(g, 'hedge_mage'); m.known = true; m.affection += 1;
      const after = circleOf(g);
      const line = after > before
        ? `마력이 한 바퀴 원을 그리며 고정되는 감각이 왔다. ${after}서클에 올랐다.`
        : rng.pick(['촛불을 마력만으로 흔드는 연습을 했다.', '마법진의 기본 도형을 수백 번 그렸다.', '"마력은 재능이고, 마법은 수련이다." 마법사가 말했다.', '손끝에 작은 불꽃을 피웠다가 금방 꺼뜨렸다.']);
      return `${line} (${[up('마법', k), up('지능', i), up('감각', sn)].filter(Boolean).join(', ')})`;
    },
  },
  {
    id: 'herbs',
    name: '숲에서 약초 캐기',
    desc: '마을 뒤 숲에서 약초를 캐 판다. 숲 깊은 곳은 위험하다.',
    available: (g) => playerAge(g) >= 8,
    run(g, rng) {
      tired(g, 12);
      const k = gainSkill(g, 'herbs', 1.5, 'sen'), sn = gainStat(g, 'sen', 0.6);
      const earn = Math.round(1 + g.player.skills.herbs / 20 + rng.int(0, 2));
      g.player.money += earn;
      let extra = '';
      if (rng.chance(0.06)) {
        g.player.injuries.push({ name: '다리 긁힘', months: 2 });
        extra = '가시덤불에 다리를 크게 긁혔다.';
      }
      return fmt([`약초를 캐서 은화 ${earn}닢을 벌었다.`, extra, `(${[up('약초', k), up('감각', sn)].filter(Boolean).join(', ')})`]);
    },
  },
  {
    id: 'inn_kitchen',
    name: '여관 부엌 일',
    desc: '여관 부엌에서 감자를 깎고 냄비를 젓는다. 요리를 배우고 품삯을 받는다.',
    available: (g) => playerAge(g) >= 10 && !!findJob(g, 'innkeeper'),
    run(g, rng) {
      tired(g, 14); stress(g, 4);
      const k = gainSkill(g, 'cooking', 1.8, 'sen'), sn = gainStat(g, 'sen', 0.3);
      const earn = 2 + Math.floor(g.player.skills.cooking / 25);
      g.player.money += earn;
      const inn = findJob(g, 'innkeeper'); inn.known = true; inn.affection += 1;
      const heard = rng.chance(0.4) ? ' ' + rng.pick(['손님들이 북부 전선 이야기를 하고 있었다.', '모험가들이 하르펜 근처 미궁 이야기를 했다.', '행상인이 왕도의 물가가 올랐다고 투덜댔다.']) : '';
      return `${inn.name}의 부엌에서 일하고 은화 ${earn}닢을 받았다.${heard} (${[up('요리', k), up('감각', sn)].filter(Boolean).join(', ')})`;
    },
  },
  {
    id: 'day_labor',
    name: '남의 밭 품팔이',
    desc: '바쁜 집 밭일을 거들고 품삯을 받는다.',
    available: (g) => playerAge(g) >= 10,
    run(g, rng) {
      tired(g, 18); stress(g, 5);
      const k = gainSkill(g, 'farming', 1.0, 'str'), s = gainStat(g, 'str', 0.6);
      const earn = g.world.famine ? 1 : 2;
      g.player.money += earn;
      return `하루 종일 허리를 굽혀 일하고 은화 ${earn}닢을 받았다. (${[up('농사', k), up('힘', s)].filter(Boolean).join(', ')})`;
    },
  },
  {
    id: 'wander',
    name: '마을 돌아다니기',
    desc: '광장, 대장간, 방앗간을 기웃거리며 사람들을 만난다.',
    available: (g) => playerAge(g) >= 4,
    run(g, rng) {
      tired(g, 5); stress(g, -4);
      const c = gainStat(g, 'cha', 0.5), sn = gainStat(g, 'sen', 0.3);
      const p = meetSomeone(g, rng, () => true);
      const met = p ? `${p.job === 'child' ? '' : p.lastName + '네 '}${p.name}(${ageYears(p)}살, ${jobName(p)})와(과) 이야기를 나눴다.` : '아는 얼굴들과 인사만 나눴다.';
      return `${met} (${[up('매력', c), up('감각', sn)].filter(Boolean).join(', ')})`;
    },
  },
  {
    id: 'visit',
    name: '아는 사람 찾아가기',
    desc: '아는 사람을 골라 시간을 함께 보낸다. 사이가 가까워진다.',
    needsTarget: true,
    available: (g) => playerAge(g) >= 4 && g.people.some((p) => p.known && !p.isPlayer && p.alive && !p.away),
    run(g, rng, choice) {
      const p = byId(g, choice.target);
      if (!p || !p.alive || p.away) return '찾아갔지만 만나지 못했다.';
      tired(g, 4); stress(g, -8);
      const gain = rng.int(4, 9) + (has(p, 'kind') ? 2 : 0) - (has(p, 'cruel') ? 3 : 0);
      p.affection = Math.min(100, p.affection + gain);
      const c = gainStat(g, 'cha', 0.4);
      const mood = p.affection >= 60 ? '이제는 서로 말하지 않아도 편한 사이다.' : p.affection >= 30 ? '꽤 가까워졌다.' : '조금 가까워졌다.';
      return `${fullName(p)}와(과) 시간을 보냈다. ${mood} (호감 +${gain}${up('매력', c) ? ', ' + up('매력', c) : ''})`;
    },
  },
  {
    id: 'rest',
    name: '쉬기',
    desc: '아무것도 하지 않고 쉰다. 피로와 스트레스가 풀린다.',
    available: () => true,
    run(g) {
      g.player.fatigue = Math.max(0, g.player.fatigue - 25);
      stress(g, -15);
      return '푹 쉬었다. 몸이 가벼워졌다.';
    },
  },
];

export function jobName(p) {
  return JOBS[p.job]?.name ?? p.job;
}
export { me };
